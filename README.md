# SNUC Dog Tracker

A map of the dogs living on the SNU Chennai campus: where they hang out, how to approach them, their health
and feeding details, and a way for students to help look after them.

The dogs in `src/data/dogs.json` are **sample data**. Replace them with your campus's dogs.

## Features

| Feature | Switch | Works without a backend? |
| --- | --- | --- |
| Dog pins with photos, clustering when zoomed out | `CLUSTERING` | Yes |
| Dog card: temperament, health, feeding, caretakers, hangouts | | Yes |
| Search and sort (A–Z, near me, popular, recently seen) | | Yes |
| "Near me": GPS location, distances, nearby count | `NEARBY` | Yes |
| Dog of the week (rotates weekly or pinned) | | Yes |
| Collection and badges ("I've met this dog") | `COLLECTION` | Yes (per device) |
| Likes | `LIKES` | Device only |
| Community photo wall | `PHOTO_WALL` | Device only |
| Report a concern | `REPORTS` | Device only, plus email if `WELFARE_EMAIL` is set |
| Add a dog (goes to moderation) | `SUBMISSIONS` | Moderated on the same device |
| Live sightings, "last seen", trail | `SIGHTINGS` (**off**) | Needs a backend to be useful |
| Hangout zones from sightings | `HANGOUTS` | Needs sightings |
| Campus landmarks layer | `LANDMARKS` | Yes (`src/data/landmarks.json`) |
| Admin page `/admin`: moderation, reports, dog editor, photo removal | | Yes (export `dogs.json`) |
| Installable PWA, works offline | | Yes |

Turn a feature on or off with `NEXT_PUBLIC_FEATURE_<NAME>=true|false` (see `.env.example`).

## Running

```bash
npm install
npm run dev
```

Open http://localhost:3000. The admin page is at http://localhost:3000/admin.

## With or without a backend

The app talks to data only through the `DataSource` interface in
[`src/lib/data/types.ts`](src/lib/data/types.ts). Which implementation is used depends on
`NEXT_PUBLIC_API_URL`:

1. **No backend (default).** Leave `NEXT_PUBLIC_API_URL` unset. Dogs come from
   `src/data/dogs.json`. Likes, photos, reports and submissions are saved in each visitor's
   browser. Moderators edit dogs at `/admin`, click **Export dogs.json**, and commit the file.
   This can be deployed as a static site anywhere.
2. **Bundled reference backend.** Set `NEXT_PUBLIC_API_URL=/api` and `ADMIN_TOKEN=<long random
   string>`. Data is kept in `.data/db.json`. This needs a Node server with a writable disk
   (`npm run build && npm start` on a VM, Railway, Render, and similar). It won't work on Vercel.
3. **Your own backend.** Implement [docs/API.md](docs/API.md) on any stack and set
   `NEXT_PUBLIC_API_URL` to it.

To turn on sightings once a backend is connected:

```env
NEXT_PUBLIC_API_URL=/api
ADMIN_TOKEN=change-me
NEXT_PUBLIC_FEATURE_SIGHTINGS=true
```

## Customising

- **Campus location, bounds, tiles, links:** [`src/config/site.ts`](src/config/site.ts)
- **Dogs:** [`src/data/dogs.json`](src/data/dogs.json) (schema in [`src/types/dog.ts`](src/types/dog.ts))
- **Landmarks:** [`src/data/landmarks.json`](src/data/landmarks.json), for example
  `[{ "name": "Library", "lat": 12.75, "lng": 80.19 }]`
- **Temperament labels:** `TEMPERAMENTS` in `src/config/site.ts`
