"use client";

import { useEffect, useRef } from "react";
import { maplibregl } from "@/lib/maplibre";
import { type GeoJSONSource, type Map as MLMap, type Marker } from "maplibre-gl";
import { site } from "@/config/site";
import { circlePolygon, type LatLng } from "@/lib/geo";
import { tintStyle } from "./MapView";

/** Small map with a draggable pin and an optional accuracy ring around the GPS fix. */
export default function PinPicker({
  value,
  onChange,
  fix,
  allowRadiusM,
  className = "h-64",
}: {
  value: LatLng;
  onChange: (p: LatLng) => void;
  fix?: (LatLng & { accuracy: number }) | null;
  /** Draws the allowed area around the fix */
  allowRadiusM?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<MLMap | null>(null);
  const pin = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: site.map.styleUrl,
      center: [value.lng, value.lat],
      zoom: 18,
      maxZoom: 20,
      attributionControl: false,
      dragRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    map.current = m;
    const pinEl = document.createElement("div");
    pinEl.innerHTML =
      '<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s15-14.4 15-26A15 15 0 0 0 2 17c0 11.6 15 26 15 26Z" fill="#f2541b" stroke="#fff" stroke-width="3"/><circle cx="17" cy="17" r="6" fill="#fff"/></svg>';
    pinEl.style.cursor = "grab";
    pin.current = new maplibregl.Marker({ element: pinEl, anchor: "bottom", draggable: true })
      .setLngLat([value.lng, value.lat])
      .addTo(m);
    pin.current.on("dragend", () => {
      const ll = pin.current!.getLngLat();
      onChangeRef.current({ lat: ll.lat, lng: ll.lng });
    });
    m.on("click", (e) => {
      pin.current!.setLngLat(e.lngLat);
      onChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    });
    m.on("load", () => {
      tintStyle(m);
      m.addSource("allow", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "allow", type: "fill", source: "allow", paint: { "fill-color": "#2f7bff", "fill-opacity": 0.1 } });
      m.addLayer({ id: "allow-line", type: "line", source: "allow", paint: { "line-color": "#2f7bff", "line-opacity": 0.5, "line-width": 1.5, "line-dasharray": [2, 2] } });
    });
    return () => {
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (e.g. "snap to my location")
  useEffect(() => {
    const cur = pin.current?.getLngLat();
    if (pin.current && cur && (Math.abs(cur.lat - value.lat) > 1e-7 || Math.abs(cur.lng - value.lng) > 1e-7)) {
      pin.current.setLngLat([value.lng, value.lat]);
      map.current?.easeTo({ center: [value.lng, value.lat], duration: 400 });
    }
  }, [value]);

  useEffect(() => {
    const m = map.current;
    if (!m || !fix || !allowRadiusM) return;
    const draw = () =>
      (m.getSource("allow") as GeoJSONSource | undefined)?.setData({
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [circlePolygon(fix, allowRadiusM)] },
      });
    if (m.isStyleLoaded() && m.getSource("allow")) draw();
    else m.once("load", draw);
  }, [fix, allowRadiusM]);

  return <div ref={el} className={`relative overflow-hidden rounded-2xl bg-soft ${className}`} />;
}
