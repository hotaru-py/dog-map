export interface LatLng {
  lat: number;
  lng: number;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Initial compass bearing from a to b, 0–360° clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Signed smallest difference b - a in degrees, in (-180, 180]. */
export function angleDiff(a: number, b: number) {
  const d = (((b - a) % 360) + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Low-pass filter for angles (handles the 359° → 0° wrap). */
export function smoothAngle(prev: number | null, next: number, factor = 0.2) {
  if (prev == null) return next;
  return (prev + angleDiff(prev, next) * factor + 360) % 360;
}

export const CARDINALS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const cardinal = (deg: number) => CARDINALS[Math.round(deg / 45) % 8];

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(5, Math.round(m / 5) * 5)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function timeAgo(iso: string | null | undefined, nowMs = Date.now()) {
  if (!iso) return "never";
  const s = Math.max(0, (nowMs - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

/** Polygon approximating a circle, for accuracy rings on the map. */
export function circlePolygon(center: LatLng, radiusM: number, steps = 48): [number, number][] {
  const coords: [number, number][] = [];
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.cos(toRad(center.lat)));
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    coords.push([center.lng + dLng * Math.cos(t), center.lat + dLat * Math.sin(t)]);
  }
  return coords;
}
