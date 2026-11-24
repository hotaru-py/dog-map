"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Dog } from "@/types/dog";
import { api } from "@/lib/api";

const SpotFlow = dynamic(() => import("../spot/SpotFlow"));
const MenuDrawer = dynamic(() => import("./MenuDrawer"));
const NavigateView = dynamic(() => import("../navigate/NavigateView"), { ssr: false });

export interface Fix {
  lat: number;
  lng: number;
  accuracy: number;
  /** m/s, when the phone reports it */
  speed: number | null;
  /** GPS course over ground, degrees */
  course: number | null;
  at: number;
}

export type GeoStatus = "idle" | "locating" | "on" | "denied" | "unavailable";

type Dialog =
  | { kind: "spot"; dogId?: number }
  | { kind: "menu" }
  | null;

interface Toast {
  id: number;
  text: string;
  tone: "info" | "xp" | "error";
}

interface AppCtx {
  dogs: Dog[];
  dogsLoaded: boolean;
  refreshDogs: () => Promise<void>;
  dogById: (id: number | null | undefined) => Dog | null;
  fix: Fix | null;
  geoStatus: GeoStatus;
  startLocation: () => void;
  stopLocation: () => void;
  selectedId: number | null;
  select: (id: number | null) => void;
  navigate: { on: boolean; targetId: number | null };
  setNavigate: (on: boolean, targetId?: number | null) => void;
  open: (d: Exclude<Dialog, null>) => void;
  close: () => void;
  toast: (text: string, tone?: Toast["tone"]) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

const LOC_PREF = "snuc:location";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [dogsLoaded, setDogsLoaded] = useState(false);
  const [fix, setFix] = useState<Fix | null>(null);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [navigate, setNav] = useState<{ on: boolean; targetId: number | null }>({ on: false, targetId: null });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const watchId = useRef<number | null>(null);

  const toast = useCallback((text: string, tone: Toast["tone"] = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 5000 : 3200);
  }, []);

  const refreshDogs = useCallback(async () => {
    try {
      const { dogs } = await api<{ dogs: Dog[] }>("dogs");
      setDogs(dogs);
    } catch (err) {
      if (!dogsLoaded) toast(err instanceof Error ? err.message : "Couldn't load the dogs", "error");
    } finally {
      setDogsLoaded(true);
    }
  }, [dogsLoaded, toast]);

  // Initial load, then refresh every 30 s and when the tab comes back
  useEffect(() => {
    refreshDogs();
    const t = setInterval(refreshDogs, 30_000);
    const onVis = () => document.visibilityState === "visible" && refreshDogs();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopLocation = useCallback(() => {
    if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setFix(null);
    setGeoStatus("idle");
    try {
      localStorage.removeItem(LOC_PREF);
    } catch {}
  }, []);

  const startLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoStatus("unavailable");
      return;
    }
    if (watchId.current != null) return;
    setGeoStatus("locating");
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGeoStatus("on");
        setFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          course: pos.coords.heading != null && !Number.isNaN(pos.coords.heading) ? pos.coords.heading : null,
          at: pos.timestamp,
        });
        try {
          localStorage.setItem(LOC_PREF, "on");
        } catch {}
      },
      (err) => {
        if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
        setFix(null);
        setGeoStatus(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 30_000 }
    );
  }, []);

  // Resume location if the student turned it on before
  useEffect(() => {
    try {
      if (localStorage.getItem(LOC_PREF) === "on") startLocation();
    } catch {}
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [startLocation]);

  const dogById = useCallback((id: number | null | undefined) => dogs.find((d) => d.id === id) ?? null, [dogs]);

  const setNavigate = useCallback((on: boolean, targetId: number | null = null) => {
    setNav({ on, targetId });
    if (on) setDialog(null);
  }, []);

  const value = useMemo<AppCtx>(
    () => ({
      dogs,
      dogsLoaded,
      refreshDogs,
      dogById,
      fix,
      geoStatus,
      startLocation,
      stopLocation,
      selectedId,
      select: setSelectedId,
      navigate,
      setNavigate,
      open: setDialog,
      close: () => setDialog(null),
      toast,
    }),
    [dogs, dogsLoaded, refreshDogs, dogById, fix, geoStatus, startLocation, stopLocation, selectedId, navigate, setNavigate, toast]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {dialog?.kind === "spot" && <SpotFlow initialDogId={dialog.dogId} />}
      {dialog?.kind === "menu" && <MenuDrawer />}
      {navigate.on && <NavigateView />}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom,0px))] z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "anim-sheet max-w-md rounded-full px-4 py-2.5 text-sm font-semibold shadow-card " +
              (t.tone === "error" ? "bg-bad text-white" : t.tone === "xp" ? "bg-pine text-mist" : "bg-ink text-white")
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
