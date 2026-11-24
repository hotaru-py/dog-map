import seedDogs from "@/data/dogs.json";
import type { Db } from "./index";

interface SeedDog {
  name: string;
  breed?: string;
  gender?: string;
  age?: string;
  description?: string;
  temperament?: string[];
  hangouts?: string[];
  health?: object;
  feeding?: object[];
  caretakers?: object[];
  photos?: string[];
  location: { lat: number; lng: number };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "dog";

/** Fills an empty database with the dogs from src/data/dogs.json. */
export async function seed(db: Db) {
  const [{ n }] = await db.query<{ n: number }>("select count(*)::int as n from dogs");
  if (n > 0) return;
  const used = new Set<string>();
  for (const d of seedDogs as SeedDog[]) {
    let slug = slugify(d.name);
    while (used.has(slug)) slug += "-2";
    used.add(slug);
    await db.query(
      `insert into dogs (slug, name, breed, sex, age, description, temperament, hangouts, health, feeding, caretakers, photos, home_lat, home_lng)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        slug,
        d.name,
        d.breed || "Indie",
        d.gender === "male" || d.gender === "female" ? d.gender : "unknown",
        d.age ?? null,
        d.description ?? "",
        d.temperament ?? [],
        d.hangouts ?? [],
        JSON.stringify(d.health ?? {}),
        JSON.stringify(d.feeding ?? []),
        JSON.stringify(d.caretakers ?? []),
        d.photos ?? [],
        d.location.lat,
        d.location.lng,
      ]
    );
  }
  console.log(`[db] seeded ${used.size} dogs`);
}
