"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { maplibregl } from "@/lib/maplibre";
import { type Map as MLMap, type Marker } from "maplibre-gl";
import { freshnessOf, rules, site } from "@/config/site";
import { angleDiff, bearingDeg, cardinal, distanceMeters, formatDistance, timeAgo, type LatLng } from "@/lib/geo";
import type { Dog } from "@/types/dog";
import { useApp } from "../app/AppProvider";
import { useCheckin } from "../dog/useCheckin";
import { tintStyle } from "../map/MapView";
import { Button, cx, DogAvatar } from "../ui";
import { AlertIcon, CheckIcon, ChevronLeftIcon, ChevronIcon, MapIcon, NavIcon, XIcon } from "../icons";
import { createDogTokenLayer, type TokenDog } from "./dogTokenLayer";
import { requestCompass, useHeading } from "./useHeading";

const PITCH = 72;
const ZOOM = 19;
const SAFETY_KEY = "snuc:navigate-safety";

/** Stable colour per dog for its 3D token. */
const PALETTE = ["#c2773a", "#6f86a8", "#8b5a3c", "#d9a954", "#5e8c61", "#a0644a", "#7c7f9e", "#b5654a", "#4f7a8a", "#9a7b4f"];
const colorFor = (id: number) => PALETTE[id % PALETTE.length];
const RING: Record<string, string> = { fresh: "#2f9c5a", recent: "#e09a12", stale: "#9ca59e", unknown: "#9ca59e" };

function turnHint(rel: number) {
  const a = Math.abs(rel);
  const side = rel > 0 ? "right" : "left";
  if (a < 15) return "Straight ahead";
  if (a < 45) return `Bear slightly ${side}`;
  if (a < 135) return `Turn ${side}`;
  return "Turn around";
}

/** Full-screen "Navigate to dogs": a tilted 3D view that follows you and points to each dog's last-seen spot. */
export default function NavigateView() {
  const { dogs, fix, geoStatus, startLocation, navigate, setNavigate, select } = useApp();
  const heading = useHeading(fix);
  const { checkin, canCheckin, busy } = useCheckin();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const layerRef = useRef<ReturnType<typeof createDogTokenLayer> | null>(null);
  const puck = useRef<Marker | null>(null);
  const labelEls = useRef(new Map<number, HTMLDivElement>());
  const [manualBearing, setManualBearing] = useState(0);
  const [targetId, setTargetId] = useState<number | null>(navigate.targetId);
  const [showSafety, setShowSafety] = useState(false);
  const [layerReady, setLayerReady] = useState(false);
  const reduceMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  // Without a fix (e.g. desktop preview) stand at the campus centre
  const here: LatLng = fix ?? { lat: site.map.center[0], lng: site.map.center[1] };
  const bearing = heading ?? manualBearing;
  const hasCompass = heading != null;
  const tooFast = (fix?.speed ?? 0) > rules.maxNavigateSpeedMps;

  const visibleDogs = useMemo(
    () => dogs.filter((d) => !d.hideInNavigate && (d.status === "active" || d.status === "missing")),
    [dogs]
  );

  const withGeo = useMemo(
    () =>
      visibleDogs
        .map((d) => {
          const dist = distanceMeters(here, d.position);
          const rel = angleDiff(bearing, bearingDeg(here, d.position));
          return { dog: d, dist, rel, fresh: freshnessOf(d.lastSeenAt) };
        })
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 30),
    [visibleDogs, here.lat, here.lng, bearing] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const withGeoRef = useRef(withGeo);
  withGeoRef.current = withGeo;

  const target = withGeo.find((x) => x.dog.id === targetId) ?? withGeo.find((x) => x.fresh !== "stale" && x.fresh !== "unknown") ?? withGeo[0];

  useEffect(() => {
    try {
      if (!localStorage.getItem(SAFETY_KEY)) setShowSafety(true);
    } catch {}
    startLocation();
    requestCompass();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavigate(false);
      if (e.key === "ArrowLeft") setManualBearing((b) => (b - 10 + 360) % 360);
      if (e.key === "ArrowRight") setManualBearing((b) => (b + 10) % 360);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startLocation, setNavigate]);

  // Create the 3D map
  useEffect(() => {
    if (!container.current) return;
    const map = new maplibregl.Map({
      container: container.current,
      style: site.map.styleUrl,
      center: [here.lng, here.lat],
      zoom: ZOOM,
      pitch: PITCH,
      maxPitch: 80,
      minZoom: 17,
      maxZoom: 20,
      attributionControl: { compact: true },
      dragPan: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.on("load", () => {
      tintStyle(map);
      try {
        map.setSky({ "sky-color": "#b9d6e0", "horizon-color": "#eef2e8", "fog-color": "#eef2eb", "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.75 });
      } catch {}
      const tokens = createDogTokenLayer({ animate: !reduceMotion });
      layerRef.current = tokens;
      map.addLayer(tokens.layer);
      setLayerReady(true);
    });
    // Drag to turn when there's no compass
    map.on("rotate", (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) setManualBearing(map.getBearing());
    });
    // Tap a token to target it
    map.on("click", (e) => {
      let best: { id: number; d: number } | null = null;
      for (const { dog } of withGeoRef.current) {
        const p = map.project([dog.position.lng, dog.position.lat]);
        const dx = Math.abs(p.x - e.point.x);
        const dy = p.y - e.point.y;
        if (dx < 60 && dy > -30 && dy < 260) {
          const score = dx + Math.abs(dy - 80);
          if (!best || score < best.d) best = { id: dog.id, d: score };
        }
      }
      if (best) setTargetId(best.id);
    });
    // Keep labels glued to the tokens
    const placeLabels = () => {
      const b = map.getBearing();
      for (const { dog, dist } of withGeoRef.current) {
        const el = labelEls.current.get(dog.id);
        if (!el) continue;
        const base = map.project([dog.position.lng, dog.position.lat]);
        const side = destination(dog.position, b + 90, 1);
        const pxPerM = Math.hypot(map.project([side.lng, side.lat]).x - base.x, map.project([side.lng, side.lat]).y - base.y);
        const size = tokenSize(dist);
        const top = base.y - (size * 1.35) * pxPerM - 10;
        const w = map.getContainer().clientWidth;
        const visible = base.y > 0 && base.x > -40 && base.x < w + 40 && top > 60;
        el.style.transform = `translate(${base.x}px, ${top}px) translate(-50%, -100%)`;
        el.style.opacity = visible ? "1" : "0";
      }
    };
    map.on("render", placeLabels);
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed dogs to the 3D layer
  useEffect(() => {
    layerRef.current?.setDogs(
      withGeo.map(({ dog, dist, fresh }) => ({
        id: dog.id,
        lat: dog.position.lat,
        lng: dog.position.lng,
        color: colorFor(dog.id),
        opacity: fresh === "fresh" || fresh === "recent" ? 1 : 0.45,
        size: tokenSize(dist),
        ring: dog.status === "missing" ? "#c2413a" : RING[fresh],
        target: dog.id === target?.dog.id,
      })) satisfies TokenDog[]
    );
  }, [withGeo, target?.dog.id, layerReady]);

  // Follow position and heading
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const h = map.getContainer().clientHeight;
    map.easeTo({
      center: [here.lng, here.lat],
      bearing,
      pitch: PITCH,
      padding: { top: h * 0.42, bottom: 0, left: 0, right: 0 },
      duration: hasCompass ? 250 : 0,
      easing: (t) => t,
    });
    if (!puck.current) {
      const el = document.createElement("div");
      el.innerHTML =
        '<div style="width:46px;height:46px;border-radius:50%;background:#2f7bff;border:4px solid #fff;box-shadow:0 0 0 10px rgba(47,123,255,.22),0 8px 16px rgba(0,0,0,.35);display:grid;place-items:center"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M12 2.5 19.5 21 12 16.8 4.5 21Z"/></svg></div>';
      puck.current = new maplibregl.Marker({ element: el, pitchAlignment: "map", rotationAlignment: "map" }).setLngLat([here.lng, here.lat]).addTo(map);
    }
    puck.current.setLngLat([here.lng, here.lat]).setRotation(bearing);
  }, [here.lat, here.lng, bearing, hasCompass]);

  // Manual turning is only allowed when there's no compass
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (hasCompass) {
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();
    } else {
      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();
    }
  }, [hasCompass]);

  const exit = () => {
    setNavigate(false);
    if (target) select(target.dog.id);
  };

  const dismissSafety = () => {
    setShowSafety(false);
    try {
      localStorage.setItem(SAFETY_KEY, "1");
    } catch {}
  };

  const offscreen = withGeo.filter((x) => Math.abs(x.rel) > 42 && x.dist > 30 && x.dist < 600).slice(0, 4);
  const close = target && target.dist <= rules.closeEnoughM;

  return (
    <div className="fixed inset-0 z-[65] bg-[#b9d6e0]" role="application" aria-label="Navigate to dogs">
      <div ref={container} style={{ position: "absolute", inset: 0 }} />

      {/* Labels that follow the 3D tokens */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {withGeo.map(({ dog, dist, fresh }) => (
          <div
            key={dog.id}
            ref={(el) => {
              if (el) labelEls.current.set(dog.id, el);
              else labelEls.current.delete(dog.id);
            }}
            className="absolute left-0 top-0 whitespace-nowrap transition-opacity"
            style={{ opacity: 0 }}
          >
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-soft",
                dog.id === target?.dog.id ? "bg-blaze text-white" : "bg-ink/85 text-white"
              )}
            >
              {dog.name}
              <span className="font-medium opacity-80">
                {fresh === "stale" || fresh === "unknown" ? (dog.lastSeenAt ? timeAgo(dog.lastSeenAt) : "usual spot") : formatDistance(dist)}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Top HUD */}
      <div className="absolute inset-x-3 top-[calc(12px+env(safe-area-inset-top,0px))] grid grid-cols-[44px_1fr_44px] items-center gap-2.5">
        <button onClick={exit} aria-label="Back to the map" className="grid h-11 w-11 place-items-center rounded-full bg-ink/85 text-white shadow-soft">
          <MapIcon />
        </button>
        <div className="relative flex h-10 items-center justify-between overflow-hidden rounded-full bg-ink/85 px-4 text-xs font-semibold text-white shadow-soft">
          <span className="opacity-70">{cardinal((bearing + 315) % 360)}</span>
          <span className="text-sm font-bold text-sun">
            {cardinal(bearing)} {String(Math.round(bearing)).padStart(3, "0")}°
          </span>
          <span className="opacity-70">{cardinal((bearing + 45) % 360)}</span>
          <span className="absolute bottom-0 left-1/2 -translate-x-1/2 border-x-[6px] border-b-[6px] border-x-transparent border-b-sun" />
        </div>
        <button onClick={() => setNavigate(false)} aria-label="Close Navigate to dogs" className="grid h-11 w-11 place-items-center rounded-full bg-ink/85 text-white shadow-soft">
          <XIcon className="h-4 w-4" />
        </button>
        {!hasCompass && (
          <p className="col-span-3 justify-self-center rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-ink shadow-soft">
            No compass found. Drag the map or use the arrow keys to turn.
          </p>
        )}
        {!fix && (
          <p className="col-span-3 justify-self-center rounded-full bg-white/90 px-3 py-1 text-center text-xs font-semibold text-ink shadow-soft">
            {geoStatus === "denied"
              ? "Location is blocked, so this is a preview from the campus centre."
              : geoStatus === "locating"
                ? "Finding you…"
                : "Preview from the campus centre. Turn on location to navigate."}
          </p>
        )}
      </div>

      {/* Dogs behind or beside you */}
      <div className="pointer-events-none absolute inset-x-2 top-[38%] flex justify-between">
        <div className="grid gap-2">
          {offscreen.filter((x) => x.rel < 0).map((x) => (
            <EdgeChip key={x.dog.id} dog={x.dog} dist={x.dist} side="left" onClick={() => setTargetId(x.dog.id)} />
          ))}
        </div>
        <div className="grid gap-2">
          {offscreen.filter((x) => x.rel > 0).map((x) => (
            <EdgeChip key={x.dog.id} dog={x.dog} dist={x.dist} side="right" onClick={() => setTargetId(x.dog.id)} />
          ))}
        </div>
      </div>

      {/* Bottom HUD */}
      <div className="absolute inset-x-3 bottom-[calc(34px+env(safe-area-inset-bottom,0px))] mx-auto grid max-w-md gap-2.5">
        {target ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-card">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blaze text-white transition-transform"
              style={{ transform: `rotate(${target.rel}deg)` }}
            >
              <NavIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">
                {close ? `You're close to ${target.dog.name}` : `${target.dog.name} is ${formatDistance(target.dist)} away`}
              </p>
              <p className="truncate text-[13px] text-muted">
                {close
                  ? "Let them come to you."
                  : `${turnHint(target.rel)} · ${target.dog.lastSeenAt ? `seen ${timeAgo(target.dog.lastSeenAt)}` : "usual spot, not seen recently"}`}
              </p>
            </div>
            <DogAvatar dog={target.dog} className="h-11 w-11" />
          </div>
        ) : (
          <div className="rounded-[20px] bg-white p-4 text-sm shadow-card">No dogs to show yet.</div>
        )}
        {target && (
          canCheckin(target.dog) ? (
            <Button size="lg" variant="pine" disabled={busy || tooFast} onClick={() => checkin(target.dog)}>
              <CheckIcon className="h-4 w-4" />
              Check in with {target.dog.name}
            </Button>
          ) : (
            <span className="rounded-full bg-white/90 py-3 text-center text-sm font-semibold text-muted shadow-soft">
              Check in when you&apos;re within {rules.checkinRadiusM} m
            </span>
          )
        )}
      </div>

      {tooFast && (
        <div className="absolute inset-0 grid place-items-center bg-ink/60 p-6 text-center text-white">
          <div className="grid max-w-xs gap-2">
            <AlertIcon className="mx-auto h-8 w-8" />
            <p className="font-display text-xl font-extrabold">Paused while you&apos;re moving fast</p>
            <p className="text-sm text-white/80">Guidance resumes when you&apos;re walking.</p>
          </div>
        </div>
      )}

      {showSafety && (
        <div className="absolute inset-0 grid place-items-end bg-ink/40 p-4 sm:place-items-center">
          <div className="anim-sheet grid w-full max-w-sm gap-3 rounded-[24px] bg-white p-5 shadow-card">
            <h2 className="font-display text-xl font-extrabold">Before you start</h2>
            <ul className="grid gap-1.5 text-sm text-muted">
              <li>Keep an eye on where you&apos;re walking, not just the screen.</li>
              <li>Tokens show where each dog was last seen. Faded ones are old sightings.</li>
              <li>When you&apos;re close, let the dog come to you. Check-ins count from {rules.checkinRadiusM} m.</li>
            </ul>
            <Button size="lg" onClick={dismissSafety}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function EdgeChip({ dog, dist, side, onClick }: { dog: Dog; dist: number; side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "pointer-events-auto flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink/85 py-1 text-xs font-bold text-white shadow-soft",
        side === "left" ? "pl-1 pr-3" : "flex-row-reverse pl-3 pr-1"
      )}
    >
      {side === "left" ? <ChevronLeftIcon className="h-4 w-4" /> : <ChevronIcon className="h-4 w-4" />}
      <DogAvatar dog={dog} className="h-6 w-6" />
      {dog.name} {formatDistance(dist)}
    </button>
  );
}

/** Token height in metres: big enough to read up close, growing with distance so far dogs stay visible. */
function tokenSize(dist: number) {
  return Math.min(32, 10 + dist * 0.05);
}

function destination(p: LatLng, bearingDegrees: number, meters: number): LatLng {
  const b = (bearingDegrees * Math.PI) / 180;
  const dLat = (meters * Math.cos(b)) / 111_320;
  const dLng = (meters * Math.sin(b)) / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}
