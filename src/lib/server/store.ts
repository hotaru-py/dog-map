import { promises as fs } from "fs";
import path from "path";
import seedDogs from "@/data/dogs.json";
import type {
  CommunityPhoto,
  Dog,
  DogSubmission,
  Report,
  Sighting,
} from "@/types/dog";

/**
 * Reference storage for the bundled backend: one JSON file on disk.
 * Fine for a single small server (a campus VM, Railway, Render with a disk).
 * NOT for serverless hosts like Vercel, where the filesystem is read-only;
 * there, implement docs/API.md on a real database instead.
 */
export interface Db {
  dogs: Dog[];
  sightings: Sighting[];
  likes: Record<number, number>;
  photos: CommunityPhoto[];
  reports: Report[];
  submissions: DogSubmission[];
}

const FILE = path.resolve(process.env.DOGMAP_DB_FILE ?? ".data/db.json");

let cache: Db | null = null;
let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<Db> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch {
    cache = {
      dogs: seedDogs as Dog[],
      sightings: [],
      likes: {},
      photos: [],
      reports: [],
      submissions: [],
    };
  }
  return cache;
}

export async function read(): Promise<Db> {
  return load();
}

/** Serialised read-modify-write so concurrent requests don't clobber each other. */
export function write<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE + ".tmp", JSON.stringify(db));
    await fs.rename(FILE + ".tmp", FILE);
    return result;
  });
  queue = run.catch(() => {});
  return run;
}
