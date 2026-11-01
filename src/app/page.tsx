"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dogsData from "@/data/dogs.json";
import type { Dog } from "@/types/dog";
import { features, site } from "@/config/site";
import { useCampusData } from "@/hooks/useCampusData";
import { getCurrentPosition, useGeolocation } from "@/hooks/useGeolocation";
import DogSidebar from "@/components/DogSidebar";
import DogModal from "@/components/DogModal";
import { Toast } from "@/components/ui";
import { Logo } from "@/components/icons";
import type { MapStyle } from "@/components/DogMap";

const AddDogForm = dynamic(() => import("@/components/AddDogForm"));
const ReportForm = dynamic(() => import("@/components/ReportForm"));
const CollectionPanel = dynamic(() => import("@/components/CollectionPanel"));

const DogMap = dynamic(() => import("@/components/DogMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-stone-900">
      <div className="text-center">
        <div className="mx-auto mb-4 w-fit animate-bounce">
          <Logo className="h-14 w-14" />
        </div>
        <p className="text-sm font-medium text-stone-400">Loading the map…</p>
      </div>
    </div>
  ),
});

type Panel = { kind: "add" } | { kind: "collection" } | { kind: "report"; dog: Dog | null } | null;

export default function Home() {
  const { dogs, error, progress, updateProgress, toggleLike, toggleMet, addSighting, refresh } =
    useCampusData(dogsData as Dog[]);
  const geo = useGeolocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>("satellite");
  const [panel, setPanel] = useState<Panel>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  // Open a dog straight from a shared link, e.g. /?dog=3
  useEffect(() => {
    const id = Number(new URLSearchParams(window.location.search).get("dog"));
    if (id) setSelectedId(id);
  }, []);

  // Keep the URL in sync so the current dog can be shared
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedId == null) url.searchParams.delete("dog");
    else url.searchParams.set("dog", String(selectedId));
    window.history.replaceState(null, "", url);
  }, [selectedId]);

  useEffect(() => {
    if (geo.status === "denied") showToast("Location permission is turned off");
    else if (geo.status === "unavailable") showToast("Couldn't get your location");
  }, [geo.status, showToast]);

  useEffect(() => {
    if (error) showToast(error);
  }, [error, showToast]);

  const handleClose = useCallback(() => setSelectedId(null), []);
  const toggleStyle = useCallback(
    () => setMapStyle((s) => (s === "satellite" ? "street" : "satellite")),
    []
  );
  const handleLocate = useCallback(() => {
    if (geo.status === "active" || geo.status === "locating") geo.stop();
    else geo.start();
  }, [geo]);

  const selectedDog = dogs.find((d) => d.id === selectedId) ?? null;
  const metIds = useMemo(() => new Set(Object.keys(progress.met).map(Number)), [progress.met]);

  const handleSighting = useCallback(async () => {
    if (!selectedDog) return;
    try {
      const here = await getCurrentPosition();
      const [[s, w], [n, e]] = site.map.bounds;
      if (here.lat < s || here.lat > n || here.lng < w || here.lng > e) {
        showToast("You seem to be off campus, so the sighting wasn't logged");
        return;
      }
      await addSighting(selectedDog.id, here);
      showToast(`Thanks! ${selectedDog.name}'s location is updated`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Couldn't log the sighting");
    }
  }, [selectedDog, addSighting, showToast]);

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      <DogMap
        dogs={dogs}
        selectedId={selectedId}
        onSelect={setSelectedId}
        mapStyle={mapStyle}
        onToggleStyle={toggleStyle}
        geo={geo}
        onLocate={handleLocate}
        metIds={metIds}
      />

      <DogSidebar
        dogs={dogs}
        selectedId={selectedId}
        onSelect={setSelectedId}
        progress={progress}
        geo={geo}
        onLocate={geo.start}
        onAddDog={() => setPanel({ kind: "add" })}
        onOpenCollection={() => setPanel({ kind: "collection" })}
        onReport={() => setPanel({ kind: "report", dog: null })}
      />

      {selectedDog && (
        <DogModal
          dog={selectedDog}
          liked={progress.liked.includes(selectedDog.id)}
          met={metIds.has(selectedDog.id)}
          userPosition={geo.position}
          onClose={handleClose}
          onToggleLike={() => toggleLike(selectedDog.id)}
          onToggleMet={() => {
            const wasMet = metIds.has(selectedDog.id);
            toggleMet(selectedDog.id);
            if (!wasMet) showToast(`${selectedDog.name} added to your collection`);
          }}
          onReport={() => setPanel({ kind: "report", dog: selectedDog })}
          onSighting={handleSighting}
          onPhotoAdded={() => updateProgress((p) => ({ ...p, photos: p.photos + 1 }))}
          onToast={showToast}
        />
      )}

      {panel?.kind === "add" && features.submissions && (
        <AddDogForm
          defaultLocation={geo.position ?? { lat: site.map.center[0], lng: site.map.center[1] }}
          onClose={() => setPanel(null)}
          onDone={(msg) => {
            setPanel(null);
            showToast(msg);
            refresh();
          }}
        />
      )}

      {panel?.kind === "report" && features.reports && (
        <ReportForm
          dog={panel.dog}
          dogs={dogs}
          onClose={() => setPanel(null)}
          onDone={(msg) => {
            setPanel(null);
            updateProgress((p) => ({ ...p, reports: p.reports + 1 }));
            showToast(msg);
          }}
        />
      )}

      {panel?.kind === "collection" && features.collection && (
        <CollectionPanel
          dogs={dogs}
          progress={progress}
          onSelect={setSelectedId}
          onClose={() => setPanel(null)}
        />
      )}

      <Toast message={toast} />
    </main>
  );
}
