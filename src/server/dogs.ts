import type { Dog, DogDetail } from "@/types/dog";
import type { Temperament } from "@/config/site";
import { db, type Sql } from "./db";
import { iso } from "./http";

interface DogRow {
  id: number;
  slug: string;
  name: string;
  breed: string;
  sex: Dog["sex"];
  age: string | null;
  description: string;
  temperament: string[];
  hangouts: string[];
  health: Dog["health"];
  feeding: Dog["feeding"];
  caretakers: Dog["caretakers"];
  photos: string[];
  home_lat: number;
  home_lng: number;
  last_seen_lat: number | null;
  last_seen_lng: number | null;
  last_seen_at: Date | null;
  status: Dog["status"];
  hide_in_navigate: boolean;
}

function toDog(r: DogRow): Dog {
  const hasSeen = r.last_seen_lat != null && r.last_seen_lng != null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    breed: r.breed,
    sex: r.sex,
    age: r.age,
    description: r.description,
    temperament: r.temperament as Temperament[],
    hangouts: r.hangouts,
    health: r.health ?? {},
    feeding: r.feeding ?? [],
    caretakers: r.caretakers ?? [],
    status: r.status,
    hideInNavigate: r.hide_in_navigate,
    cover: r.photos[0] ?? null,
    photos: r.photos,
    home: { lat: r.home_lat, lng: r.home_lng },
    position: hasSeen ? { lat: r.last_seen_lat!, lng: r.last_seen_lng! } : { lat: r.home_lat, lng: r.home_lng },
    lastSeenAt: iso(r.last_seen_at),
  };
}

export async function listDogs(): Promise<Dog[]> {
  const rows = await (await db()).query<DogRow>("select * from dogs order by name");
  return rows.map(toDog);
}

export async function getDog(id: number, sql?: Sql): Promise<Dog | null> {
  const rows = await (sql ?? (await db())).query<DogRow>("select * from dogs where id = $1", [id]);
  return rows[0] ? toDog(rows[0]) : null;
}

export async function getDogDetail(id: number): Promise<DogDetail | null> {
  const dog = await getDog(id);
  if (!dog) return null;
  const sightings = await (await db()).query<{ id: string; lat: number; lng: number; note: string | null; created_at: Date }>(
    "select id, lat, lng, note, created_at from sightings where dog_id = $1 order by created_at desc limit 25",
    [id]
  );
  return {
    ...dog,
    sightings: sightings.map((s) => ({ id: s.id, dogId: id, lat: s.lat, lng: s.lng, note: s.note, createdAt: iso(s.created_at)! })),
  };
}
