/**
 * API v2. One route handler with a small router so the whole API is readable in
 * one place. Contract: README.md ("API").
 */
import type { NextRequest } from "next/server";
import { errorResponse, HttpError } from "@/server/http";
import * as pub from "@/server/api/public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Handler = (req: NextRequest, ...params: string[]) => Promise<Response>;
type Route = [method: string, pattern: string, handler: Handler];

const routes: Route[] = [
  ["GET", "health", pub.getHealth],
  ["GET", "dogs", pub.getDogs],
  ["GET", "dogs/:id", pub.getDogById],
  ["POST", "spot", pub.postSpot],
  ["POST", "checkin", pub.postCheckin],
];

function match(pattern: string, parts: string[]) {
  const segs = pattern.split("/");
  if (segs.length !== parts.length) return null;
  const params: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].startsWith(":")) params.push(decodeURIComponent(parts[i]));
    else if (segs[i] !== parts[i]) return null;
  }
  return params;
}

async function dispatch(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await ctx.params;
    let methodMatched = false;
    for (const [method, pattern, handler] of routes) {
      const params = match(pattern, path);
      if (!params) continue;
      if (method !== req.method) {
        methodMatched = true;
        continue;
      }
      return await handler(req, ...params);
    }
    throw new HttpError(methodMatched ? 405 : 404, methodMatched ? "Method not allowed" : "Not found");
  } catch (err) {
    return errorResponse(err);
  }
}

export const GET = dispatch;
export const POST = dispatch;
