"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  CircleMarker,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { useState, useMemo, useEffect, useRef, memo } from "react";
import L from "leaflet";
import type { Dog, Landmark } from "@/types/dog";
import type { DogView } from "@/hooks/useCampusData";
import type { GeoState } from "@/hooks/useGeolocation";
import { features, site, TILES } from "@/config/site";
import { hangoutZone } from "@/lib/geo";
import landmarksData from "@/data/landmarks.json";

const landmarks = landmarksData as Landmark[];

export type MapStyle = "satellite" | "street";

interface DogMapProps {
  dogs: DogView[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  mapStyle: MapStyle;
  onToggleStyle: () => void;
  geo: GeoState;
  onLocate: () => void;
  /** Dogs this visitor has marked as met (shows a check on the pin) */
  metIds: Set<number>;
}

/**
 * The campus box from the config, with generous room around it. A tight box
 * is shorter than a desktop screen at the default zoom, which made Leaflet
 * fight every animation and bounce the view back.
 */
const PAN_BOUNDS = L.latLngBounds(site.map.bounds).pad(1);

const CHECK_SVG =
  '<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
}

function createDogIcon(dog: Dog, selected: boolean, met: boolean) {
  const size = selected ? 60 : 48;
  const height = size + 8;
  const name = escapeHtml(dog.name);
  return L.divIcon({
    className: "dog-marker",
    html: `
      <div class="dog-pin${selected ? " is-selected" : ""}">
        <div class="dog-pin-head">
          <span class="dog-pin-pulse"></span>
          <img src="${escapeHtml(dog.photos[0] ?? "")}" alt="${name}" loading="lazy" />
          ${met ? `<span class="dog-pin-met" title="You've met">${CHECK_SVG}</span>` : ""}
        </div>
        <div class="dog-pin-tail"></div>
        <div class="dog-pin-label">${name}</div>
      </div>
    `,
    iconSize: [size, height],
    iconAnchor: [size / 2, height],
  });
}

function createClusterIcon(cluster: L.MarkerCluster) {
  return L.divIcon({
    className: "dog-marker",
    html: `<div class="dog-cluster">${cluster.getChildCount()}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

const userIcon = L.divIcon({
  className: "dog-marker",
  html: '<div class="user-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const landmarkMarkers = landmarks.map((l) => ({
  ...l,
  position: [l.lat, l.lng] as [number, number],
  icon: L.divIcon({
    className: "dog-marker",
    html: `<div class="landmark-label">${escapeHtml(l.name)}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  }),
}));

/**
 * Offset (px) from the map's centre to the centre of the part of the map
 * that isn't covered by the sidebar or the dog card.
 */
function overlayOffset(map: L.Map) {
  const box = map.getContainer().getBoundingClientRect();
  const phone = box.width < 768;
  let left = 0;
  let top = 0;
  let right = box.width;
  let bottom = box.height;
  document.querySelectorAll<HTMLElement>("[data-map-overlay]").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const kind = el.dataset.mapOverlay;
    if (phone) {
      if (kind === "sidebar") top = Math.max(top, r.bottom - box.top);
      if (kind === "card") bottom = Math.min(bottom, r.top - box.top);
    } else {
      if (kind === "sidebar") left = Math.max(left, r.right - box.left);
      if (kind === "card") right = Math.min(right, r.left - box.left);
    }
  });
  if (right - left < 120 || bottom - top < 120) return L.point(0, 0);
  return L.point(box.width / 2 - (left + right) / 2, box.height / 2 - (top + bottom) / 2);
}

/** Keep a target centre inside PAN_BOUNDS so Leaflet never has to bounce it back. */
function clampCenter(map: L.Map, center: L.LatLng, zoom: number) {
  const half = map.getSize().divideBy(2);
  const nw = map.project(PAN_BOUNDS.getNorthWest(), zoom);
  const se = map.project(PAN_BOUNDS.getSouthEast(), zoom);
  const p = map.project(center, zoom);
  const clamp = (v: number, min: number, max: number) =>
    min > max ? (min + max) / 2 : Math.min(Math.max(v, min), max);
  return map.unproject(
    L.point(clamp(p.x, nw.x + half.x, se.x - half.x), clamp(p.y, nw.y + half.y, se.y - half.y)),
    zoom
  );
}

/** Pan (same zoom) or fly (zoom change) so `latlng` lands in the visible area. */
function focusOn(map: L.Map, latlng: L.LatLngExpression, minZoom: number, liftPx = 0) {
  const zoom = Math.max(map.getZoom(), minZoom);
  const offset = overlayOffset(map).subtract(L.point(0, liftPx));
  const target = clampCenter(
    map,
    map.unproject(map.project(latlng, zoom).add(offset), zoom),
    zoom
  );
  map.stop();
  if (zoom === map.getZoom()) {
    map.panTo(target, { animate: true, duration: 0.45, easeLinearity: 0.3 });
  } else {
    map.flyTo(target, zoom, { duration: 0.7, easeLinearity: 0.3 });
  }
}

function MapClickHandler({ onClick }: { onClick: () => void }) {
  useMapEvents({ click: onClick });
  return null;
}

/**
 * One dog pin. Memoised with a stable position tuple: react-leaflet calls
 * setLatLng whenever `position` is a new array, and inside a cluster group that
 * removes and re-adds the marker, which made every pin "respawn".
 */
const DogMarker = memo(function DogMarker({
  id,
  name,
  lat,
  lng,
  icon,
  selected,
  onSelect,
}: {
  id: number;
  name: string;
  lat: number;
  lng: number;
  icon: L.DivIcon;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const position = useMemo(() => [lat, lng] as [number, number], [lat, lng]);
  const handlers = useMemo(() => ({ click: () => onSelect(id) }), [id, onSelect]);
  return (
    <Marker
      position={position}
      icon={icon}
      zIndexOffset={selected ? 1000 : 0}
      title={name}
      keyboard={true}
      eventHandlers={handlers}
    />
  );
});

function DogMap({
  dogs,
  selectedId,
  onSelect,
  mapStyle,
  onToggleStyle,
  geo,
  onLocate,
  metIds,
}: DogMapProps) {
  const [map, setMap] = useState<L.Map | null>(null);
  const hasCenteredOnUser = useRef(false);

  // Pins drop in once on first load only. (MapContainer ignores className
  // changes after mount, so toggle the class on the container directly.)
  useEffect(() => {
    if (!map) return;
    const el = map.getContainer();
    el.classList.add("is-intro");
    const t = setTimeout(() => el.classList.remove("is-intro"), 1500);
    return () => clearTimeout(t);
  }, [map]);

  // Cache icons per (dog, selected, met) so unchanged markers keep their icon
  const iconCache = useRef(new Map<string, L.DivIcon>());
  const iconFor = (dog: DogView, selected: boolean) => {
    const met = metIds.has(dog.id);
    const key = `${dog.id}:${dog.name}:${dog.photos[0]}:${selected}:${met}`;
    let icon = iconCache.current.get(key);
    if (!icon) {
      icon = createDogIcon(dog, selected, met);
      iconCache.current.set(key, icon);
    }
    return icon;
  };

  const selectedDog = dogs.find((d) => d.id === selectedId) ?? null;

  // Bring the selected dog into the visible part of the map
  const selectedLat = selectedDog?.position.lat;
  const selectedLng = selectedDog?.position.lng;
  useEffect(() => {
    if (!map || selectedLat == null || selectedLng == null) return;
    // Lift by ~half the pin height so the photo, not the tip, is centred
    focusOn(map, [selectedLat, selectedLng], 18, 28);
  }, [map, selectedId, selectedLat, selectedLng]);

  // Centre on the user the first time we get a fix, if they're on campus
  useEffect(() => {
    if (!map || !geo.position || hasCenteredOnUser.current) return;
    hasCenteredOnUser.current = true;
    const here = L.latLng(geo.position.lat, geo.position.lng);
    if (L.latLngBounds(site.map.bounds).contains(here)) focusOn(map, here, 18);
  }, [map, geo.position]);
  useEffect(() => {
    if (geo.status === "idle") hasCenteredOnUser.current = false;
  }, [geo.status]);

  const zone = useMemo(
    () =>
      features.sightings && features.hangouts && selectedDog
        ? hangoutZone(selectedDog.sightings)
        : null,
    [selectedDog]
  );

  const markers = dogs.map((dog) => {
    const isSelected = dog.id === selectedId;
    return (
      <DogMarker
        key={dog.id}
        id={dog.id}
        name={dog.name}
        lat={dog.position.lat}
        lng={dog.position.lng}
        icon={iconFor(dog, isSelected)}
        selected={isSelected}
        onSelect={onSelect}
      />
    );
  });

  const tiles = TILES[site.map.tileProvider][mapStyle];
  const locateLabel =
    geo.status === "active"
      ? "Stop showing my location"
      : geo.status === "locating"
        ? "Finding you…"
        : "Show my location";

  return (
    <>
      <MapContainer
        ref={setMap}
        center={site.map.center}
        zoom={site.map.zoom}
        minZoom={site.map.minZoom}
        maxZoom={site.map.maxZoom}
        className="h-full w-full"
        zoomControl={false}
        maxBounds={PAN_BOUNDS}
        maxBoundsViscosity={1.0}
        attributionControl={true}
        scrollWheelZoom={true}
        doubleClickZoom={false}
        touchZoom={true}
      >
        {tiles.map((t, i) => (
          <TileLayer
            key={`${mapStyle}-${i}`}
            attribution={t.attribution}
            url={t.url}
            subdomains={t.subdomains ?? ["a", "b", "c"]}
            maxNativeZoom={t.maxNativeZoom}
            crossOrigin={t.crossOrigin}
            maxZoom={site.map.maxZoom}
            keepBuffer={4}
          />
        ))}

        <MapClickHandler onClick={() => onSelect(null)} />

        {features.landmarks &&
          landmarkMarkers.map((l) => (
            <Marker key={l.name} position={l.position} icon={l.icon} interactive={false} />
          ))}

        {/* Hangout zone + recent sighting trail for the selected dog */}
        {zone && (
          <Circle
            center={[zone.center.lat, zone.center.lng]}
            radius={zone.radius}
            pathOptions={{
              color: "#f97316",
              weight: 2,
              dashArray: "6 6",
              fillColor: "#f97316",
              fillOpacity: 0.12,
            }}
          />
        )}
        {features.sightings &&
          selectedDog?.sightings.slice(1, 30).map((s) => {
            const ageH = (Date.now() - new Date(s.at).getTime()) / 3600_000;
            const opacity = Math.max(0.15, 1 - ageH / site.sightingWindowHours);
            return (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={5}
                interactive={false}
                pathOptions={{
                  color: "#fff",
                  weight: 1.5,
                  fillColor: "#f97316",
                  fillOpacity: opacity,
                  opacity,
                }}
              />
            );
          })}

        {features.clustering ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={45}
            disableClusteringAtZoom={18}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={false}
            iconCreateFunction={createClusterIcon}
          >
            {markers}
          </MarkerClusterGroup>
        ) : (
          markers
        )}

        {geo.position && (
          <>
            <Circle
              center={[geo.position.lat, geo.position.lng]}
              radius={geo.position.accuracy}
              interactive={false}
              pathOptions={{
                color: "#3b82f6",
                weight: 1,
                fillColor: "#3b82f6",
                fillOpacity: 0.1,
              }}
            />
            <Marker
              position={[geo.position.lat, geo.position.lng]}
              icon={userIcon}
              interactive={false}
              zIndexOffset={2000}
            />
          </>
        )}
      </MapContainer>

      {/* Map controls */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2 sm:right-4 sm:top-4">
        <div className="glass flex flex-col overflow-hidden rounded-2xl">
          <ControlButton label="Zoom in" onClick={() => map?.zoomIn()}>
            <path d="M12 5v14M5 12h14" />
          </ControlButton>
          <div className="h-px bg-stone-900/10 dark:bg-white/10" />
          <ControlButton label="Zoom out" onClick={() => map?.zoomOut()}>
            <path d="M5 12h14" />
          </ControlButton>
        </div>
        <div className="glass flex flex-col overflow-hidden rounded-2xl">
          {features.nearby && (
            <>
              <ControlButton
                label={locateLabel}
                onClick={onLocate}
                active={geo.status === "active"}
                busy={geo.status === "locating"}
              >
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="7" />
                <circle
                  cx="12"
                  cy="12"
                  r="2.5"
                  fill={geo.status === "active" ? "currentColor" : "none"}
                />
              </ControlButton>
              <div className="h-px bg-stone-900/10 dark:bg-white/10" />
            </>
          )}
          <ControlButton
            label="Recenter on campus"
            onClick={() => {
              map?.stop();
              map?.flyTo(site.map.center, site.map.zoom, { duration: 0.7 });
            }}
          >
            <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
          </ControlButton>
          <div className="h-px bg-stone-900/10 dark:bg-white/10" />
          <ControlButton
            label={
              mapStyle === "satellite"
                ? "Switch to street map"
                : "Switch to satellite"
            }
            onClick={onToggleStyle}
          >
            <path d="M12 3 2 8l10 5 10-5-10-5Z" />
            <path d="m2 13 10 5 10-5" />
          </ControlButton>
        </div>
      </div>
    </>
  );
}

function ControlButton({
  label,
  onClick,
  active,
  busy,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid h-11 w-11 place-items-center transition hover:bg-white/70 active:scale-95 dark:hover:bg-white/10 ${
        active
          ? "text-blue-500"
          : "text-stone-700 hover:text-orange-600 dark:text-stone-200"
      } ${busy ? "animate-pulse" : ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {children}
      </svg>
    </button>
  );
}

export default memo(DogMap);
