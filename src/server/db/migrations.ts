import type { Db } from "./index";

/**
 * Ordered schema migrations. Plain Postgres (no extensions), so the same SQL runs
 * on any Postgres server and on embedded PGlite. Never edit a migration that has
 * shipped; add a new one.
 */
const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
create table dogs (
  id serial primary key,
  slug text not null unique,
  name text not null,
  breed text not null default 'Indie',
  sex text not null default 'unknown',
  age text,
  description text not null default '',
  temperament text[] not null default '{}',
  hangouts text[] not null default '{}',
  health jsonb not null default '{}',
  feeding jsonb not null default '[]',
  caretakers jsonb not null default '[]',
  photos text[] not null default '{}',
  home_lat double precision not null,
  home_lng double precision not null,
  last_seen_lat double precision,
  last_seen_lng double precision,
  last_seen_at timestamptz,
  status text not null default 'active',
  hide_in_navigate boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sightings (
  id uuid primary key,
  dog_id integer not null references dogs(id) on delete cascade,
  device_id uuid not null,
  lat double precision not null,
  lng double precision not null,
  accuracy_m integer,
  note text,
  created_at timestamptz not null default now()
);
create index sightings_dog_time on sightings (dog_id, created_at desc);
create index sightings_device_time on sightings (device_id, created_at desc);

create table checkins (
  device_id uuid not null,
  dog_id integer not null references dogs(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index checkins_dog_time on checkins (dog_id, created_at desc);
`,
  },
];

export async function migrate(db: Db) {
  await db.query(
    "create table if not exists schema_migrations (version integer primary key, applied_at timestamptz not null default now())"
  );
  const done = new Set(
    (await db.query<{ version: number }>("select version from schema_migrations")).map((r) => r.version)
  );
  for (const m of MIGRATIONS) {
    if (done.has(m.version)) continue;
    await db.tx(async (sql) => {
      for (const stmt of m.sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
        await sql.query(stmt);
      }
      await sql.query("insert into schema_migrations (version) values ($1)", [m.version]);
    });
    console.log(`[db] applied migration ${m.version}`);
  }
}
