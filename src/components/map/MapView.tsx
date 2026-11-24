"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import { type GeoJSONSource, type Map as MLMap, type Marker, type PaddingOptions } from "maplibre-gl";
import { freshnessOf, site } from "@/config/site";
import { circlePolygon } from "@/lib/geo";
import type { Dog } from "@/types/dog";
import type { Fix } from "../app/AppProvider";
import { DOG_SILHOUETTE_PATHS } from "../icons";

interface Props {
  dogs: Dog[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  fix: Fix | null;
  /** Space covered by panels, so the selected dog is framed in the visible part. */
  padding: () => PaddingOptions;
  onMap?: (map: MLMap) => void;
}

const GLYPH_SVG = `<svg viewBox="0 0 64 64">${DOG_SILHOUETTE_PATHS.map((d) => `<path d="${d}" fill="currentColor"/>`).join("")}</svg>`;

function campusMaxBounds(): [[number, number], [number, number]] {
  const [[s, w], [n, e]] = site.map.bounds;
  const latPad = (n - s) * 1.2;
  const lngPad = (e - w) * 0.8;
  return [
    [w - lngPad, s - latPad],
    [e + lngPad, n + latPad],
  ];
}

/** Nudges the shared OpenFreeMap style toward the Trailhead palette. Safe on any style. */
export function tintStyle(map: MLMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === "background") map.setPaintProperty(layer.id, "background-color", "#eef2eb");
      else if (layer.type === "fill" && /water/.test(id)) map.setPaintProperty(layer.id, "fill-color", "#bcd9e0");
      else if (layer.type === "fill" && /(park|grass|wood|forest|scrub|meadow|garden|pitch|golf|cemetery)/.test(id))
        map.setPaintProperty(layer.id, "fill-color", "#cfe0b4");
      else if (layer.type === "fill" && /building/.test(id)) map.setPaintProperty(layer.id, "fill-color", "#d6ddce");
      else if (layer.type === "fill-extrusion" && /building/.test(id)) map.setPaintProperty(layer.id, "fill-extrusion-color", "#d6ddce");
    } catch {
      /* layer without that property */
    }
  }
}

function pinClass(dog: Dog, selected: boolean) {
  return [
    "dog-pin",
    `f-${freshnessOf(dog.lastSeenAt)}`,
    selected && "is-selected",
    dog.status === "missing" && "is-missing",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Fills a marker element. MapLibre owns the element itself (its `maplibregl-marker` class
 * positions it), so all of our styling lives on an inner `.dog-pin` span. Overwriting the
 * element's className made pins fall back into page flow and drift when zooming.
 */
function renderPin(el: HTMLElement, dog: Dog, selected: boolean) {
  // Glyph underneath; the photo covers it and hides itself if it fails to load
  const avatar = dog.cover
    ? `${GLYPH_SVG}<img src="${dog.cover.replace(/"/g, "&quot;")}" alt="" loading="lazy" onerror="this.remove()" />`
    : GLYPH_SVG;
  const label = dog.status === "missing" ? `${dog.name} · missing` : dog.name;
  const key = `${avatar}|${label}`;
  if (el.dataset.key !== key) {
    el.dataset.key = key;
    el.innerHTML = `<span><span class="av">${avatar}</span><span class="lbl"></span></span>`;
    (el.querySelector(".lbl") as HTMLElement).textContent = label;
  }
  (el.firstElementChild as HTMLElement).className = pinClass(dog, selected);
  el.setAttribute("aria-label", `${dog.name}, ${dog.lastSeenAt ? "recently seen" : "home spot"}`);
}

export default function MapView({ dogs, selectedId, onSelect, fix, padding, onMap }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markers = useRef(new Map<number, Marker>());
  const dogsRef = useRef(dogs);
  const selectedRef = useRef(selectedId);
  const onSelectRef = useRef(onSelect);
  const meMarker = useRef<Marker | null>(null);
  dogsRef.current = dogs;
  selectedRef.current = selectedId;
  onSelectRef.current = onSelect;

  // Create the map once
  useEffect(() => {
    if (!container.current) return;
    const [lat, lng] = site.map.center;
    const map = new maplibregl.Map({
      container: container.current,
      style: site.map.styleUrl,
      center: [lng, lat],
      zoom: site.map.zoom,
      minZoom: site.map.minZoom,
      maxZoom: site.map.maxZoom,
      maxBounds: campusMaxBounds(),
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    mapRef.current = map;
    onMap?.(map);

    let pending = false;
    const syncMarkers = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!map.getSource("dogs") || !map.isSourceLoaded("dogs")) return;
        const visible = new Set<number>();
        for (const f of map.querySourceFeatures("dogs")) {
          if (!f.properties?.cluster && f.properties?.id != null) visible.add(Number(f.properties.id));
        }
        for (const dog of dogsRef.current) {
          let m = markers.current.get(dog.id);
          if (visible.has(dog.id)) {
            if (!m) {
              const el = document.createElement("button");
              el.type = "button";
              el.className = "dog-marker";
              el.addEventListener("click", (e) => {
                e.stopPropagation();
                onSelectRef.current(dog.id);
              });
              m = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat([dog.position.lng, dog.position.lat]).addTo(map);
              markers.current.set(dog.id, m);
            }
            renderPin(m.getElement(), dog, dog.id === selectedRef.current);
            m.setLngLat([dog.position.lng, dog.position.lat]);
          } else if (m) {
            m.remove();
            markers.current.delete(dog.id);
          }
        }
        container.current?.classList.toggle("show-labels", map.getZoom() >= 17.4);
      });
    };

    map.on("load", () => {
      tintStyle(map);
      map.addSource("dogs", { type: "geojson", data: toGeoJson(dogsRef.current), cluster: true, clusterMaxZoom: 16, clusterRadius: 46 });
      map.addLayer({
        id: "dog-clusters",
        type: "circle",
        source: "dogs",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#13392d", "circle-radius": 21, "circle-stroke-width": 3, "circle-stroke-color": "#ffc83d" },
      });
      map.addLayer({
        id: "dog-cluster-count",
        type: "symbol",
        source: "dogs",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 14 },
        paint: { "text-color": "#ffffff" },
      });
      map.addSource("me-acc", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "me-acc", type: "fill", source: "me-acc", paint: { "fill-color": "#2f7bff", "fill-opacity": 0.12 } });
      map.addLayer({ id: "me-acc-line", type: "line", source: "me-acc", paint: { "line-color": "#2f7bff", "line-opacity": 0.4, "line-width": 1 } });
      syncMarkers();
    });
    map.on("render", syncMarkers);

    map.on("click", "dog-clusters", async (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const src = map.getSource("dogs") as GeoJSONSource;
      const zoom = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
      map.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: zoom + 0.3 });
    });
    map.on("mouseenter", "dog-clusters", () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", "dog-clusters", () => (map.getCanvas().style.cursor = ""));
    map.on("click", (e) => {
      if (map.getLayer("dog-clusters") && map.queryRenderedFeatures(e.point, { layers: ["dog-clusters"] }).length) return;
      onSelectRef.current(null);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(container.current);
    const currentMarkers = markers.current;
    return () => {
      ro.disconnect();
      currentMarkers.clear();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dog data changed
  useEffect(() => {
    const map = mapRef.current;
    const src = map?.getSource("dogs") as GeoJSONSource | undefined;
    if (!map || !src) return;
    src.setData(toGeoJson(dogs));
    for (const dog of dogs) {
      const m = markers.current.get(dog.id);
      if (m) {
        renderPin(m.getElement(), dog, dog.id === selectedId);
        m.setLngLat([dog.position.lng, dog.position.lat]);
      }
    }
  }, [dogs, selectedId]);

  // Selection: restyle pins and frame the dog in the uncovered part of the map
  const selectedDog = dogs.find((d) => d.id === selectedId);
  const selLat = selectedDog?.position.lat;
  const selLng = selectedDog?.position.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || selLat == null || selLng == null) return;
    const run = () =>
      map.easeTo({
        center: [selLng, selLat],
        zoom: Math.max(map.getZoom(), 17.6),
        padding: padding(),
        duration: 650,
      });
    // Wait a frame so freshly opened panels have their final size
    const t = requestAnimationFrame(run);
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selLat, selLng]);

  // Clear padding when nothing is selected so the map recentres naturally
  useEffect(() => {
    if (selectedId == null && mapRef.current) mapRef.current.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 300 });
  }, [selectedId]);

  // You-are-here dot + accuracy ring
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!fix) {
      meMarker.current?.remove();
      meMarker.current = null;
      (map.getSource("me-acc") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: [] });
      return;
    }
    if (!meMarker.current) {
      const el = document.createElement("div");
      el.className = "user-dot";
      meMarker.current = new maplibregl.Marker({ element: el }).setLngLat([fix.lng, fix.lat]).addTo(map);
    } else meMarker.current.setLngLat([fix.lng, fix.lat]);
    (map.getSource("me-acc") as GeoJSONSource | undefined)?.setData({
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [circlePolygon(fix, Math.min(fix.accuracy, 200))] },
    });
  }, [fix]);

  // Inline position: maplibre-gl.css sets `position: relative` on the container, which beats Tailwind utilities
  return <div ref={container} style={{ position: "absolute", inset: 0 }} aria-label="Campus map" />;
}

function toGeoJson(dogs: Dog[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: dogs
      .filter((d) => d.status !== "rehomed" && d.status !== "memorial")
      .map((d) => ({
        type: "Feature",
        properties: { id: d.id },
        geometry: { type: "Point", coordinates: [d.position.lng, d.position.lat] },
      })),
  };
}
