import os from "os";
import path from "path";
import { migrate } from "./migrations";
import { seed } from "./seed";

/**
 * One SQL interface over two drivers:
 *  - DATABASE_URL set   -> node-postgres (any Postgres 13+, e.g. Supabase or Neon)
 *  - DATABASE_URL unset -> PGlite, an embedded Postgres stored in DATA_DIR/db (dev, demos, tiny installs)
 * Both speak the same SQL, so there is a single set of queries and migrations.
 */
export interface Sql {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Sql {
  driver: "postgres" | "pglite";
  tx<T>(fn: (sql: Sql) => Promise<T>): Promise<T>;
}

/**
 * Where the embedded database lives. On Vercel only /tmp is writable, so a demo
 * without DATABASE_URL keeps its data there; it resets whenever the function cold-starts.
 */
export const dataDir = () =>
  path.resolve(process.env.DATA_DIR || (process.env.VERCEL ? path.join(os.tmpdir(), "snuc-dog-tracker") : ".data"));

async function connectPostgres(url: string): Promise<Db> {
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX || 5),
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  return {
    driver: "postgres",
    async query(text, params) {
      return (await pool.query(text, params as unknown[])).rows;
    },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const result = await fn({ query: async (t, p) => (await client.query(t, p as unknown[])).rows });
        await client.query("commit");
        return result;
      } catch (err) {
        await client.query("rollback");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function connectPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { mkdir } = await import("fs/promises");
  await mkdir(dataDir(), { recursive: true });
  const pg = await PGlite.create(path.join(dataDir(), "db"));
  // PGlite runs one query at a time; serialise transactions so they don't interleave.
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => undefined);
    return run;
  };
  return {
    driver: "pglite",
    query: (text, params) => serial(async () => (await pg.query(text, params as unknown[])).rows as never),
    tx: (fn) =>
      serial(() =>
        pg.transaction(async (t) => fn({ query: async (q, p) => (await t.query(q, p as unknown[])).rows as never }))
      ),
  };
}

const g = globalThis as unknown as { __snucDb?: Promise<Db> };

/** Lazily connects, migrates and seeds once per process. */
export function db(): Promise<Db> {
  if (!g.__snucDb) {
    g.__snucDb = (async () => {
      const url = process.env.DATABASE_URL;
      const conn = url ? await connectPostgres(url) : await connectPglite();
      await migrate(conn);
      await seed(conn);
      return conn;
    })();
    g.__snucDb.catch(() => {
      g.__snucDb = undefined;
    });
  }
  return g.__snucDb;
}
