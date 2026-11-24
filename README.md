# SNUC Dog Tracker

A campus map of the SNU Chennai dogs, kept fresh by students. This is the demo build.

- **Map:** every dog at its last-seen spot, with a freshness ring (green under 1 h, amber under 24 h). Search and filter, and see how far each dog is from you.
- **Update last seen:** spotted a dog? Drop a pin within 60 m of your GPS position and the map updates for everyone.
- **Check in:** within 25 m of a dog, check in to add it to your Pack Book. XP, levels, streaks and badges are saved on your phone. There's no sign-in.
- **Navigate to dogs:** a tilted 3D view that turns with your phone and shows each dog as a floating 3D token over its last-seen spot.

Developed by [Prajesh Raam](https://byhotaru.com).

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. With no configuration the app uses an embedded Postgres database (PGlite) in `.data/`, seeded with the dogs in `src/data/dogs.json`.

Location and compass need HTTPS on phones (or `localhost`).

## Deploy to Vercel

1. Import the repo in Vercel. The defaults work: framework Next.js, `npm run build`.
2. Deploy.

With no environment variables, the demo stores its data in the embedded database under `/tmp` on Vercel. That works, but **data resets** whenever Vercel starts a fresh server instance, and separate instances don't share updates. That's fine for a demo.

To keep data between visits, add a free Postgres database (Supabase or Neon) and set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | The database connection string (for Supabase, use the pooler on port 6543) |
| `DATABASE_SSL` | `true` |

Tables are created and the dogs are seeded automatically on first request.

Optional: `NEXT_PUBLIC_MAP_STYLE_URL` to use a different MapLibre map style (default: OpenFreeMap Liberty, free and keyless).

## API

All routes are in `src/app/api/v2/[...path]/route.ts`. Requests from the app send `X-Device-Id`, a random ID kept on the phone and used only for rate limits.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/api/v2/health` | | `{ ok, database }` |
| GET | `/api/v2/dogs` | | all dogs with last-seen position |
| GET | `/api/v2/dogs/:id` | | one dog with recent sightings |
| POST | `/api/v2/spot` | `{ dogId, point: {lat,lng}, fix: {lat,lng,accuracy}, note? }` | GPS accuracy ≤ 50 m, pin within 60 m of you, inside campus, once per dog per 10 min, 30 per day |
| POST | `/api/v2/checkin` | `{ dogId, fix: {lat,lng,accuracy} }` | within 25 m, accuracy ≤ 30 m, once per dog per day, paused when 5+ people checked in within 10 min |

## Project layout

```
src/
  app/(app)/          map (/), pack, me
  app/api/v2/         API route handler
  components/         map, dog panel, spot flow, navigate (3D), app shell
  server/             database (pg or PGlite), migrations, seed, dog queries, API handlers
  lib/                API client, on-phone progress and XP, geo maths, schemas
  config/site.ts      campus bounds, rules, temperaments
```

`postinstall`, `predev` and `prebuild` copy MapLibre's web worker into `public/maplibre/`, because Next can't bundle it.
