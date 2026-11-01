# Dog Map backend API

Any server that implements these endpoints can power the map. Point the app at it with
`NEXT_PUBLIC_API_URL=https://your-server/api`. A working reference implementation lives in
[`src/app/api/[...path]/route.ts`](../src/app/api/[...path]/route.ts); the client is
[`src/lib/data/http.ts`](../src/lib/data/http.ts).

- All bodies are JSON. Errors return `{ "error": "message" }` with a 4xx/5xx status.
- Admin endpoints need `Authorization: Bearer <token>`.
- Types (`Dog`, `Sighting`, `CommunityPhoto`, `Report`, `DogSubmission`) are defined in
  [`src/types/dog.ts`](../src/types/dog.ts).
- If the app is served from a different origin than the API, enable CORS for it.

## Public

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/dogs` | | `Dog[]` |
| GET | `/likes` | | `{ [dogId]: count }` |
| POST | `/dogs/:id/like` | `{ delta: 1 \| -1 }` | `{ count }` |
| GET | `/sightings?since=<ISO>` | | `Sighting[]` newer than `since` |
| POST | `/sightings` | `{ dogId, lat, lng, note? }` | `Sighting` (201) |
| GET | `/photos?dogId=<id>` | | `CommunityPhoto[]` for that dog |
| POST | `/photos` | `{ dogId, url, caption? }` | `CommunityPhoto` (201) |
| POST | `/reports` | `{ dogId \| null, kind, message, contact?, lat?, lng? }` | `Report` (201) |
| POST | `/submissions` | `{ dog: Omit<Dog,"id">, submittedBy? }` | `DogSubmission` (201) |

`url` for photos may be an `https://` URL or a `data:image/...` URL (the app resizes images
to about 900px JPEG before sending). A production backend should move data URLs into object
storage and store the resulting URL instead.

## Admin

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/admin/verify` | | 200 if the token is valid, else 401 |
| GET | `/submissions` | | `DogSubmission[]` |
| PATCH | `/submissions/:id` | `{ status: "approved" \| "rejected" }` | 204; approving adds the dog |
| POST | `/dogs` | `Dog` without a meaningful `id` | `Dog` (201) with a new id |
| PUT | `/dogs/:id` | `Dog` | `Dog` |
| DELETE | `/dogs/:id` | | 204 |
| GET | `/reports` | | `Report[]` |
| PATCH | `/reports/:id` | `{ status: "open" \| "resolved" }` | 204 |
| GET | `/photos` | | all `CommunityPhoto[]` |
| DELETE | `/photos/:id` | | 204 |

## Suggested production setup

The reference backend stores everything in one JSON file, which is fine for a single small
server but does not work on serverless hosts like Vercel. For those, implement the same
endpoints on a database. Supabase (Postgres + Storage), Firebase, or a small Express/FastAPI
service all work. Add rate limiting on the public `POST` endpoints.
