/**
 * Campus- and deployment-specific settings. Values marked NEXT_PUBLIC_* can be
 * overridden at build time (see .env.example); everything else is code.
 */

const env = (value: string | undefined, fallback: string) =>
  value !== undefined && value !== "" ? value : fallback;

export const site = {
  name: "SNUC Dog Tracker",
  shortName: "SNUC Dogs",
  credit: { name: "Prajesh Raam", url: "https://byhotaru.com" },

  map: {
    /** [lat, lng] */
    center: [12.75147980444429, 80.19654241564324] as [number, number],
    zoom: 16.6,
    minZoom: 15,
    maxZoom: 20,
    /** Campus geofence: [[south, west], [north, east]] */
    bounds: [
      [12.748110404185605, 80.18809184940014],
      [12.755822524287215, 80.20439967944083],
    ] as [[number, number], [number, number]],
    /** Any MapLibre style URL. */
    styleUrl: env(process.env.NEXT_PUBLIC_MAP_STYLE_URL, "https://tiles.openfreemap.org/styles/liberty"),
  },
};

/** Tuning shared by the server checks and the app's hints. */
export const rules = {
  spotMaxAccuracyM: 50,
  spotMaxPinOffsetM: 60,
  spotCooldownMin: 10,
  spotsPerDay: 30,
  checkinRadiusM: 25,
  checkinMaxAccuracyM: 30,
  closeEnoughM: 10,
  crowdLimit: 5,
  crowdWindowMin: 10,
  freshIntelAfterH: 6,
  maxNavigateSpeedMps: 3.4,
};

export type Freshness = "fresh" | "recent" | "stale" | "unknown";

export function freshnessOf(iso: string | null | undefined, now = Date.now()): Freshness {
  if (!iso) return "unknown";
  const min = (now - new Date(iso).getTime()) / 60000;
  if (min <= 60) return "fresh";
  if (min <= 24 * 60) return "recent";
  return "stale";
}

export const TEMPERAMENTS = {
  friendly: { label: "Friendly", tone: "good" },
  playful: { label: "Playful", tone: "good" },
  calm: { label: "Calm", tone: "good" },
  shy: { label: "Shy", tone: "info" },
  protective: { label: "Protective", tone: "warn" },
  "approach-slowly": { label: "Approach slowly", tone: "warn" },
  "dont-feed": { label: "Don't feed", tone: "warn" },
} as const;

export type Temperament = keyof typeof TEMPERAMENTS;

/** Dogs that should be given extra space. */
export const GIVE_SPACE: Temperament[] = ["shy", "protective", "approach-slowly"];

export function insideCampus(lat: number, lng: number) {
  const [[s, w], [n, e]] = site.map.bounds;
  return lat >= s && lat <= n && lng >= w && lng <= e;
}
