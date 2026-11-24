import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export function errorResponse(err: unknown) {
  if (err instanceof HttpError) return json({ error: err.message, code: err.code }, err.status);
  console.error(err);
  return json({ error: "Something went wrong on the server" }, 500);
}

export async function parseJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `${issue.path.join(".") || "body"}: ${issue.message}`);
  }
  return result.data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The anonymous device ID the app sends in X-Device-Id. Used only for rate limits. */
export function requireDevice(req: NextRequest) {
  const id = req.headers.get("x-device-id") ?? "";
  if (!UUID.test(id)) throw new HttpError(400, "Missing device ID. Reload the app and try again.");
  return id.toLowerCase();
}

/** Network address, hashed with a salt that changes daily. Used only for rate limits. */
export function networkKey(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "local").split(",")[0].trim();
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${day}:snuc:${ip}`).digest("base64url").slice(0, 22);
}

const buckets = new Map<string, number[]>();

/** Simple in-process sliding-window limiter. */
export function rateLimit(key: string, max: number, windowMs: number, message = "Too many requests. Try again in a few minutes.") {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) throw new HttpError(429, message, "rate_limited");
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) if (v.every((t) => now - t > windowMs)) buckets.delete(k);
  }
}

export const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString() : null);
