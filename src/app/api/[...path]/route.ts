/**
 * Reference backend implementing docs/API.md. Enable it with
 *   NEXT_PUBLIC_API_URL=/api
 *   ADMIN_TOKEN=<a long random string>
 * Data is stored in a JSON file (see src/lib/server/store.ts).
 */
import { NextResponse, type NextRequest } from "next/server";
import { randomUUID, timingSafeEqual } from "crypto";
import { read, write } from "@/lib/server/store";
import type {
  CommunityPhoto,
  Dog,
  DogSubmission,
  Report,
  ReportKind,
  Sighting,
} from "@/types/dog";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
const fail = (status: number, error: string) => json({ error }, status);
const now = () => new Date().toISOString();

const MAX_PHOTO_CHARS = 3_000_000; // ~2 MB image as a data URL
const REPORT_KINDS: ReportKind[] = ["injured", "sick", "aggressive", "missing", "other"];

function isAdmin(req: NextRequest) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

function validPhotoUrl(url: unknown): url is string {
  return (
    typeof url === "string" &&
    url.length <= MAX_PHOTO_CHARS &&
    (url.startsWith("https://") || url.startsWith("data:image/"))
  );
}

function sanitizeDog(input: Partial<Dog>): Omit<Dog, "id"> | null {
  if (!isStr(input.name, 60) || !isStr(input.description) || !input.location) return null;
  if (!isNum(input.location.lat) || !isNum(input.location.lng)) return null;
  const photos = (input.photos ?? []).filter(validPhotoUrl).slice(0, 6);
  if (photos.length === 0) return null;
  return {
    name: input.name.trim(),
    breed: isStr(input.breed, 60) ? input.breed.trim() : "Indie",
    description: input.description.trim(),
    location: { lat: input.location.lat, lng: input.location.lng },
    photos,
    gender: input.gender,
    age: input.age,
    temperament: input.temperament,
    health: input.health,
    caretakers: input.caretakers,
    feeding: input.feeding,
    hangouts: input.hangouts,
  };
}

async function body<T>(req: NextRequest): Promise<Partial<T>> {
  try {
    return (await req.json()) as Partial<T>;
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const [resource, id] = (await params).path;
  const db = await read();
  const q = req.nextUrl.searchParams;

  switch (resource) {
    case "dogs":
      return json(db.dogs);
    case "likes":
      return json(db.likes);
    case "sightings": {
      const since = q.get("since") ?? new Date(Date.now() - 72 * 3600_000).toISOString();
      return json(db.sightings.filter((s) => s.at >= since));
    }
    case "photos": {
      const dogId = Number(q.get("dogId"));
      if (dogId) return json(db.photos.filter((p) => p.dogId === dogId));
      return isAdmin(req) ? json(db.photos) : fail(401, "Unauthorized");
    }
    case "reports":
      return isAdmin(req) ? json(db.reports) : fail(401, "Unauthorized");
    case "submissions":
      return isAdmin(req) ? json(db.submissions) : fail(401, "Unauthorized");
    case "admin":
      if (id === "verify") {
        if (!process.env.ADMIN_TOKEN) return fail(503, "ADMIN_TOKEN is not configured on the server");
        return isAdmin(req) ? json({ ok: true }) : fail(401, "Unauthorized");
      }
  }
  return fail(404, "Not found");
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const [resource, id, action] = (await params).path;

  switch (resource) {
    case "sightings": {
      const b = await body<Sighting>(req);
      if (!isNum(b.dogId) || !isNum(b.lat) || !isNum(b.lng)) return fail(400, "dogId, lat and lng are required");
      const sighting: Sighting = {
        id: randomUUID(),
        dogId: b.dogId,
        lat: b.lat,
        lng: b.lng,
        note: isStr(b.note, 280) ? b.note : undefined,
        at: now(),
      };
      await write((db) => {
        db.sightings.push(sighting);
        // Keep the file small: drop anything older than 30 days
        const cutoff = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
        db.sightings = db.sightings.filter((s) => s.at >= cutoff);
      });
      return json(sighting, 201);
    }

    case "dogs": {
      if (id && action === "like") {
        const dogId = Number(id);
        const { delta } = await body<{ delta: number }>(req);
        if (delta !== 1 && delta !== -1) return fail(400, "delta must be 1 or -1");
        const count = await write((db) => {
          db.likes[dogId] = Math.max(0, (db.likes[dogId] ?? 0) + delta);
          return db.likes[dogId];
        });
        return json({ count });
      }
      if (!id) {
        if (!isAdmin(req)) return fail(401, "Unauthorized");
        const dog = sanitizeDog(await body<Dog>(req));
        if (!dog) return fail(400, "Invalid dog");
        const created = await write((db) => {
          const next = { ...dog, id: Math.max(0, ...db.dogs.map((d) => d.id)) + 1 };
          db.dogs.push(next);
          return next;
        });
        return json(created, 201);
      }
      break;
    }

    case "photos": {
      const b = await body<CommunityPhoto>(req);
      if (!isNum(b.dogId) || !validPhotoUrl(b.url)) return fail(400, "dogId and an image are required");
      const photo: CommunityPhoto = {
        id: randomUUID(),
        dogId: b.dogId,
        url: b.url,
        caption: isStr(b.caption, 200) ? b.caption : undefined,
        at: now(),
      };
      await write((db) => {
        db.photos.unshift(photo);
      });
      return json(photo, 201);
    }

    case "reports": {
      const b = await body<Report>(req);
      if (!isStr(b.message) || !REPORT_KINDS.includes(b.kind as ReportKind)) return fail(400, "kind and message are required");
      const report: Report = {
        id: randomUUID(),
        dogId: isNum(b.dogId) ? b.dogId : null,
        kind: b.kind as ReportKind,
        message: b.message.trim(),
        contact: isStr(b.contact, 200) ? b.contact : undefined,
        lat: isNum(b.lat) ? b.lat : undefined,
        lng: isNum(b.lng) ? b.lng : undefined,
        at: now(),
        status: "open",
      };
      await write((db) => {
        db.reports.unshift(report);
      });
      return json(report, 201);
    }

    case "submissions": {
      const b = await body<DogSubmission>(req);
      const dog = b.dog && sanitizeDog(b.dog);
      if (!dog) return fail(400, "Name, description, location and at least one photo are required");
      const submission: DogSubmission = {
        id: randomUUID(),
        dog,
        submittedBy: isStr(b.submittedBy, 80) ? b.submittedBy : undefined,
        at: now(),
        status: "pending",
      };
      await write((db) => {
        db.submissions.unshift(submission);
      });
      return json(submission, 201);
    }
  }
  return fail(404, "Not found");
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const [resource, id] = (await params).path;
  if (resource !== "dogs" || !id) return fail(404, "Not found");
  if (!isAdmin(req)) return fail(401, "Unauthorized");
  const dog = sanitizeDog(await body<Dog>(req));
  if (!dog) return fail(400, "Invalid dog");
  const saved = await write((db) => {
    const next = { ...dog, id: Number(id) };
    const i = db.dogs.findIndex((d) => d.id === next.id);
    if (i === -1) db.dogs.push(next);
    else db.dogs[i] = next;
    return next;
  });
  return json(saved);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const [resource, id] = (await params).path;
  if (!isAdmin(req)) return fail(401, "Unauthorized");
  const { status } = await body<{ status: string }>(req);

  if (resource === "reports" && (status === "open" || status === "resolved")) {
    await write((db) => {
      const r = db.reports.find((x) => x.id === id);
      if (r) r.status = status;
    });
    return new NextResponse(null, { status: 204 });
  }

  if (resource === "submissions" && (status === "approved" || status === "rejected")) {
    const ok = await write((db) => {
      const s = db.submissions.find((x) => x.id === id);
      if (!s) return false;
      if (status === "approved" && s.status !== "approved") {
        db.dogs.push({ ...s.dog, id: Math.max(0, ...db.dogs.map((d) => d.id)) + 1 });
      }
      s.status = status;
      return true;
    });
    return ok ? new NextResponse(null, { status: 204 }) : fail(404, "Not found");
  }

  return fail(400, "Bad request");
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const [resource, id] = (await params).path;
  if (!isAdmin(req)) return fail(401, "Unauthorized");

  if (resource === "dogs") {
    await write((db) => {
      db.dogs = db.dogs.filter((d) => d.id !== Number(id));
    });
    return new NextResponse(null, { status: 204 });
  }
  if (resource === "photos") {
    await write((db) => {
      db.photos = db.photos.filter((p) => p.id !== id);
    });
    return new NextResponse(null, { status: 204 });
  }
  return fail(404, "Not found");
}
