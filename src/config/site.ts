/**
 * Everything campus-specific lives here. Most values can be overridden with
 * NEXT_PUBLIC_* environment variables (see .env.example).
 */

const env = (key: string | undefined, fallback: string) =>
  key !== undefined && key !== "" ? key : fallback;

const flag = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === "" ? fallback : value === "true";

export const site = {
  name: "SNUC Dog Tracker",
  shortName: "SNUC Dogs",
  tagline: "dogs on campus",
  repoUrl: "https://github.com/hotaru-py/dog-map",

  map: {
    center: [12.75147980444429, 80.19654241564324] as [number, number],
    zoom: 17,
    minZoom: 16,
    maxZoom: 20,
    bounds: [
      [12.748110404185605, 80.18809184940014],
      [12.755822524287215, 80.20439967944083],
    ] as [[number, number], [number, number]],
    /** "esri" (free, recommended), "osm" or "google" */
    tileProvider: env(process.env.NEXT_PUBLIC_TILE_PROVIDER, "esri") as TileProvider,
  },

  /** Where "Report a concern" emails go when there is no backend. Leave empty to hide. */
  welfareEmail: env(process.env.NEXT_PUBLIC_WELFARE_EMAIL, ""),
  /** Donation / volunteer link for the campus animal welfare group. Leave empty to hide. */
  donateUrl: env(process.env.NEXT_PUBLIC_DONATE_URL, ""),
  volunteerUrl: env(process.env.NEXT_PUBLIC_VOLUNTEER_URL, ""),

  /** Pin a specific dog as "Dog of the week". Otherwise it rotates weekly. */
  featuredDogId: Number(env(process.env.NEXT_PUBLIC_FEATURED_DOG_ID, "0")) || null,

  /** Sightings older than this are hidden from the map. */
  sightingWindowHours: 72,
  /** "Near me" radius in metres. */
  nearbyRadiusMeters: 250,
};

/**
 * Feature switches. Flip with NEXT_PUBLIC_FEATURE_<NAME>=true|false.
 * Sightings (and the hangout zones built from them) are off until there is
 * a backend to share them between people.
 */
export const features = {
  sightings: flag(process.env.NEXT_PUBLIC_FEATURE_SIGHTINGS, false),
  hangouts: flag(process.env.NEXT_PUBLIC_FEATURE_HANGOUTS, true),
  submissions: flag(process.env.NEXT_PUBLIC_FEATURE_SUBMISSIONS, true),
  reports: flag(process.env.NEXT_PUBLIC_FEATURE_REPORTS, true),
  likes: flag(process.env.NEXT_PUBLIC_FEATURE_LIKES, true),
  photoWall: flag(process.env.NEXT_PUBLIC_FEATURE_PHOTO_WALL, true),
  collection: flag(process.env.NEXT_PUBLIC_FEATURE_COLLECTION, true),
  nearby: flag(process.env.NEXT_PUBLIC_FEATURE_NEARBY, true),
  clustering: flag(process.env.NEXT_PUBLIC_FEATURE_CLUSTERING, true),
  landmarks: flag(process.env.NEXT_PUBLIC_FEATURE_LANDMARKS, true),
};

export type TileProvider = "esri" | "osm" | "google";

export interface TileLayerDef {
  url: string;
  attribution: string;
  subdomains?: string[];
  maxNativeZoom?: number;
  /** Request tiles with CORS so the service worker can cache them efficiently */
  crossOrigin?: boolean;
}

export const TILES: Record<
  TileProvider,
  { satellite: TileLayerDef[]; street: TileLayerDef[] }
> = {
  esri: {
    satellite: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
        maxNativeZoom: 19,
        crossOrigin: true,
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        attribution: "",
        maxNativeZoom: 19,
        crossOrigin: true,
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: "",
        maxNativeZoom: 19,
        crossOrigin: true,
      },
    ],
    street: [
      {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxNativeZoom: 19,
        crossOrigin: true,
      },
    ],
  },
  osm: {
    satellite: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Imagery &copy; Esri",
        maxNativeZoom: 19,
        crossOrigin: true,
      },
    ],
    street: [
      {
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxNativeZoom: 19,
        crossOrigin: true,
      },
    ],
  },
  google: {
    satellite: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        attribution: "&copy; Google",
        subdomains: ["0", "1", "2", "3"],
      },
    ],
    street: [
      {
        url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
        attribution: "&copy; Google",
        subdomains: ["0", "1", "2", "3"],
      },
    ],
  },
};

export const TEMPERAMENTS: Record<
  import("@/types/dog").Temperament,
  { label: string; tone: "good" | "info" | "warn" }
> = {
  friendly: { label: "Friendly", tone: "good" },
  playful: { label: "Playful", tone: "good" },
  calm: { label: "Calm", tone: "good" },
  shy: { label: "Shy", tone: "info" },
  protective: { label: "Protective", tone: "warn" },
  "approach-slowly": { label: "Approach slowly", tone: "warn" },
  "dont-feed": { label: "Don't feed", tone: "warn" },
};
