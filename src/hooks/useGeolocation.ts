"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LatLng } from "@/lib/geo";

export interface GeoState {
  position: (LatLng & { accuracy: number }) | null;
  status: "idle" | "locating" | "active" | "denied" | "unavailable";
}

/** Watches the user's position once `start()` is called (needs a user gesture on iOS). */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ position: null, status: "idle" });
  const watchId = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setState({ position: null, status: "idle" });
  }, []);

  const start = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({ position: null, status: "unavailable" });
      return;
    }
    if (watchId.current != null) return;
    setState((s) => ({ ...s, status: "locating" }));
    watchId.current = navigator.geolocation.watchPosition(
      (pos) =>
        setState({
          status: "active",
          position: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        }),
      (err) => {
        watchId.current = null;
        setState({
          position: null,
          status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable",
        });
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
  }, []);

  useEffect(() => () => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
  }, []);

  return { ...state, start, stop };
}

/** One-shot position for logging a sighting / report. */
export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Location isn't available on this device"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Location permission was denied"
              : "Couldn't get your location"
          )
        ),
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  });
}
