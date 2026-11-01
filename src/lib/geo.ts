export interface LatLng {
  lat: number;
  lng: number;
}

/** Great-circle distance in metres. */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m / 10) * 10 || 5} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export function timeAgo(iso: string, nowMs = Date.now()) {
  const s = Math.max(0, (nowMs - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} min ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} h ago`;
  return `${Math.floor(h / 24)} d ago`;
}

/** Centroid + radius covering most of the points, for "usual hangout" zones. */
export function hangoutZone(points: LatLng[]) {
  if (points.length < 3) return null;
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  const center = { lat, lng };
  const dists = points.map((p) => distanceMeters(center, p)).sort((a, b) => a - b);
  // 80th percentile so one stray sighting doesn't blow the zone up
  const radius = dists[Math.floor(dists.length * 0.8)] ?? dists[dists.length - 1];
  return { center, radius: Math.min(Math.max(radius, 20), 200) };
}
