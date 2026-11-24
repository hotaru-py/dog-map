import { randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { insideCampus, rules } from "@/config/site";
import { checkinInput, spotInput } from "@/lib/schemas";
import { distanceMeters } from "@/lib/geo";
import { db } from "../db";
import { getDog, getDogDetail, listDogs } from "../dogs";
import { HttpError, json, networkKey, parseJson, rateLimit, requireDevice } from "../http";

export async function getDogs() {
  return json({ dogs: await listDogs(), serverTime: new Date().toISOString() });
}

export async function getDogById(_req: NextRequest, id: string) {
  const dog = await getDogDetail(Number(id));
  if (!dog) throw new HttpError(404, "That dog isn't on the map");
  return json({ dog });
}

/** Update a dog's last-seen spot. Goes live immediately after the checks below. */
export async function postSpot(req: NextRequest) {
  const device = requireDevice(req);
  rateLimit(`spot:${networkKey(req)}`, 60, 3600_000);
  const input = await parseJson(req, spotInput);
  const dog = await getDog(input.dogId);
  if (!dog || dog.status === "rehomed" || dog.status === "memorial") throw new HttpError(404, "That dog isn't on the map");

  if (input.fix.accuracy > rules.spotMaxAccuracyM)
    throw new HttpError(400, `Your GPS is only accurate to ${Math.round(input.fix.accuracy)} m. Step outside or wait a moment and try again.`, "accuracy");
  if (!insideCampus(input.point.lat, input.point.lng)) throw new HttpError(400, "That spot is outside campus.", "geofence");
  if (distanceMeters(input.point, input.fix) > rules.spotMaxPinOffsetM)
    throw new HttpError(400, `Keep the pin within ${rules.spotMaxPinOffsetM} m of where you are.`, "pin_offset");

  const conn = await db();
  const [{ recent, today }] = await conn.query<{ recent: number; today: number }>(
    `select
       count(*) filter (where dog_id = $2 and created_at > now() - make_interval(mins => $3))::int as recent,
       count(*) filter (where created_at > now() - interval '1 day')::int as today
     from sightings where device_id = $1`,
    [device, dog.id, rules.spotCooldownMin]
  );
  if (recent > 0) throw new HttpError(429, `You updated ${dog.name} a few minutes ago. Try again in ${rules.spotCooldownMin} minutes.`, "cooldown");
  if (today >= rules.spotsPerDay) throw new HttpError(429, "You've reached today's limit for updates. Thank you for helping!", "daily_limit");

  const freshIntel = !dog.lastSeenAt || Date.now() - new Date(dog.lastSeenAt).getTime() > rules.freshIntelAfterH * 3600_000;
  const id = randomUUID();
  await conn.tx(async (sql) => {
    await sql.query(
      "insert into sightings (id, dog_id, device_id, lat, lng, accuracy_m, note) values ($1,$2,$3,$4,$5,$6,$7)",
      [id, dog.id, device, input.point.lat, input.point.lng, Math.round(input.fix.accuracy), input.note || null]
    );
    await sql.query(
      "update dogs set last_seen_lat = $2, last_seen_lng = $3, last_seen_at = now(), updated_at = now() where id = $1",
      [dog.id, input.point.lat, input.point.lng]
    );
  });
  return json({ id, freshIntel }, 201);
}

/** "I'm with this dog": proximity-checked, once per dog per day, with a crowding guard. */
export async function postCheckin(req: NextRequest) {
  const device = requireDevice(req);
  const input = await parseJson(req, checkinInput);
  const dog = await getDog(input.dogId);
  if (!dog) throw new HttpError(404, "That dog isn't on the map");
  if (input.fix.accuracy > rules.checkinMaxAccuracyM)
    throw new HttpError(400, `Your GPS needs to be accurate to ${rules.checkinMaxAccuracyM} m to check in.`, "accuracy");
  if (distanceMeters(dog.position, input.fix) > rules.checkinRadiusM)
    throw new HttpError(400, `Get within ${rules.checkinRadiusM} m of ${dog.name}'s last-seen spot to check in.`, "too_far");

  const conn = await db();
  await conn.query("delete from checkins where created_at < now() - interval '2 days'");
  const [{ mine, crowd }] = await conn.query<{ mine: number; crowd: number }>(
    `select
       count(*) filter (where device_id = $2 and created_at > date_trunc('day', now()))::int as mine,
       count(distinct device_id) filter (where device_id <> $2 and created_at > now() - make_interval(mins => $3))::int as crowd
     from checkins where dog_id = $1`,
    [dog.id, device, rules.crowdWindowMin]
  );
  if (mine > 0) return json({ ok: true, already: true });
  if (crowd >= rules.crowdLimit)
    throw new HttpError(409, `${dog.name} has had a lot of visitors in the last few minutes. Give them some space and try later.`, "crowded");
  await conn.query("insert into checkins (device_id, dog_id) values ($1,$2)", [device, dog.id]);
  return json({ ok: true, already: false });
}

export async function getHealth() {
  const conn = await db();
  await conn.query("select 1");
  return json({ ok: true, database: conn.driver });
}
