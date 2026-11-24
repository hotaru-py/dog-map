"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { freshnessOf, site } from "@/config/site";
import { distanceMeters, formatDistance, timeAgo } from "@/lib/geo";
import type { Dog } from "@/types/dog";
import { useApp } from "../app/AppProvider";
import { LevelRing } from "../app/AppShell";
import { DogPanel, DogRow } from "../dog/DogPanel";
import { cx, DogAvatar, FreshDot, Spinner, useNow } from "../ui";
import { HomeIcon, Logo, MenuIcon, MinusIcon, PlusIcon, SearchIcon, TargetIcon, XIcon } from "../icons";
import { useProgress } from "@/lib/progress";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-mist">
      <div className="grid justify-items-center gap-3 text-muted">
        <Logo className="h-12 w-14 animate-bounce" />
        <span className="text-sm font-medium">Loading the campus map…</span>
      </div>
    </div>
  ),
});

type Filter = "all" | "near" | "fresh" | "stale";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All dogs" },
  { id: "near", label: "Near me" },
  { id: "fresh", label: "Seen < 1 h" },
  { id: "stale", label: "Not seen today" },
];

export default function MapScreen() {
  const { dogs, dogsLoaded, selectedId, select, fix, geoStatus, startLocation, open, dogById } = useApp();
  const progress = useProgress();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const mapRef = useRef<MLMap | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wantsLocate = useRef(false);
  useNow();

  const selected = dogById(selectedId);

  // Deep link: /?dog=<slug>
  useEffect(() => {
    if (!dogsLoaded) return;
    const slug = new URLSearchParams(window.location.search).get("dog");
    const d = slug && dogs.find((x) => x.slug === slug);
    if (d) select(d.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dogsLoaded]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (selected) url.searchParams.set("dog", selected.slug);
    else url.searchParams.delete("dog");
    window.history.replaceState(null, "", url);
  }, [selected]);

  const onMapDogs = useMemo(() => dogs.filter((d) => d.status !== "rehomed" && d.status !== "memorial"), [dogs]);

  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withDist = onMapDogs.map((d) => ({ dog: d, dist: fix ? distanceMeters(fix, d.position) : null }));
    const filtered = withDist.filter(({ dog, dist }) => {
      if (q && !`${dog.name} ${dog.breed} ${dog.hangouts.join(" ")}`.toLowerCase().includes(q)) return false;
      if (filter === "fresh") return freshnessOf(dog.lastSeenAt) === "fresh";
      if (filter === "stale") return !dog.lastSeenAt || Date.now() - new Date(dog.lastSeenAt).getTime() > 86400_000;
      if (filter === "near") return dist == null || dist < 400;
      return true;
    });
    return filtered.sort((a, b) =>
      a.dist != null && b.dist != null
        ? a.dist - b.dist
        : (b.dog.lastSeenAt ?? "").localeCompare(a.dog.lastSeenAt ?? "") || a.dog.name.localeCompare(b.dog.name)
    );
  }, [onMapDogs, query, filter, fix]);

  /** Map padding = whatever panels cover, so the selected dog lands in open space. */
  const padding = useCallback(() => {
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    const map = mapRef.current?.getContainer().getBoundingClientRect();
    if (!map) return { top: 0, bottom: 0, left: 0, right: 0 };
    if (desktop) {
      const l = listRef.current?.getBoundingClientRect();
      const r = detailRef.current?.getBoundingClientRect();
      return { top: 40, bottom: 40, left: l ? l.right - map.left + 20 : 0, right: r ? map.right - r.left + 20 : 0 };
    }
    const t = topRef.current?.getBoundingClientRect();
    const s = sheetRef.current?.getBoundingClientRect();
    // Sheets animate in from slightly lower, so leave extra room
    return { top: t ? t.bottom - map.top + 24 : 0, bottom: s ? map.bottom - s.top + 56 : 0, left: 24, right: 24 };
  }, []);

  // "Locate me": fly to the fix once it arrives
  useEffect(() => {
    if (fix && wantsLocate.current && mapRef.current) {
      wantsLocate.current = false;
      mapRef.current.easeTo({ center: [fix.lng, fix.lat], zoom: Math.max(mapRef.current.getZoom(), 17.5), duration: 600 });
    }
  }, [fix]);

  const locate = () => {
    if (fix && mapRef.current) mapRef.current.easeTo({ center: [fix.lng, fix.lat], zoom: Math.max(mapRef.current.getZoom(), 17.5), duration: 600 });
    else {
      wantsLocate.current = true;
      startLocation();
    }
  };

  const recenter = () => {
    const [lat, lng] = site.map.center;
    mapRef.current?.easeTo({ center: [lng, lat], zoom: site.map.zoom, duration: 600 });
  };

  const pickFilter = (f: Filter) => {
    setFilter(f);
    if (f === "near" && !fix) startLocation();
  };

  const pick = (d: Dog) => {
    select(d.id);
    setQuery("");
  };

  return (
    <div className="relative h-full w-full">
      <MapView dogs={onMapDogs} selectedId={selectedId} onSelect={select} fix={fix} padding={padding} onMap={(m) => (mapRef.current = m)} />

      {/* ---------- Desktop: list panel ---------- */}
      <aside
        ref={listRef}
        className="absolute bottom-4 left-4 top-4 z-10 hidden w-[330px] flex-col overflow-hidden rounded-[22px] bg-mist/95 shadow-card backdrop-blur md:flex"
      >
        <div className="grid gap-3 p-4 pb-2">
          <h1 className="font-display text-2xl font-extrabold">Campus dogs</h1>
          <SearchBox value={query} onChange={setQuery} />
          <Chips value={filter} onChange={pickFilter} geoStatus={geoStatus} />
        </div>
        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!dogsLoaded ? (
            <p className="flex items-center gap-2 p-4 text-sm text-muted">
              <Spinner className="h-4 w-4" /> Loading dogs…
            </p>
          ) : listed.length === 0 ? (
            <p className="p-4 text-sm text-muted">No dogs match. Try another filter.</p>
          ) : (
            listed.map(({ dog, dist }) => <DogRow key={dog.id} dog={dog} distance={dist} active={dog.id === selectedId} onClick={() => pick(dog)} />)
          )}
        </div>
      </aside>

      {/* ---------- Desktop: profile panel ---------- */}
      {selected && (
        <aside ref={detailRef} className="anim-fade absolute bottom-4 right-4 top-4 z-10 hidden w-[390px] overflow-y-auto rounded-[22px] bg-white shadow-card md:block">
          <DogPanel dog={selected} onClose={() => select(null)} />
        </aside>
      )}

      {/* ---------- Phone: top bar ---------- */}
      <div ref={topRef} className="absolute inset-x-3 top-[calc(12px+env(safe-area-inset-top,0px))] z-20 grid gap-2 md:hidden">
        <div className="flex h-[52px] items-center gap-1 rounded-full bg-white pl-1.5 pr-1.5 shadow-card">
          <button onClick={() => open({ kind: "menu" })} aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full hover:bg-mist">
            <MenuIcon />
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dogs or spots"
            aria-label="Search dogs or spots"
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          />
          {query ? (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="grid h-10 w-10 place-items-center rounded-full text-muted">
              <XIcon className="h-4 w-4" />
            </button>
          ) : (
            <Link href="/pack" aria-label="Your level" className="shrink-0">
              <LevelRing xp={progress.xp} />
            </Link>
          )}
        </div>
        {query ? (
          <div className="max-h-[50dvh] overflow-y-auto rounded-[20px] bg-mist p-1.5 shadow-card">
            {listed.length === 0 ? (
              <p className="p-3 text-sm text-muted">No dogs match “{query}”.</p>
            ) : (
              listed.map(({ dog, dist }) => <DogRow key={dog.id} dog={dog} distance={dist} onClick={() => pick(dog)} />)
            )}
          </div>
        ) : (
          !selected && <Chips value={filter} onChange={pickFilter} geoStatus={geoStatus} floating />
        )}
      </div>

      {/* ---------- Map controls ---------- */}
      <div
        className={cx(
          "absolute z-10 grid gap-2",
          "right-3 top-[calc(132px+env(safe-area-inset-top,0px))] md:top-auto md:bottom-6",
          selected ? "md:right-[422px]" : "md:right-6"
        )}
      >
        <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card md:grid">
          <CtlButton label="Zoom in" onClick={() => mapRef.current?.zoomIn()}>
            <PlusIcon />
          </CtlButton>
          <span className="h-px bg-line" />
          <CtlButton label="Zoom out" onClick={() => mapRef.current?.zoomOut()}>
            <MinusIcon />
          </CtlButton>
        </div>
        <div className="grid overflow-hidden rounded-2xl bg-white shadow-card">
          <CtlButton label="Show my location" onClick={locate} active={geoStatus === "on"} busy={geoStatus === "locating"}>
            <TargetIcon />
          </CtlButton>
          <span className="h-px bg-line" />
          <CtlButton label="Back to campus" onClick={recenter}>
            <HomeIcon />
          </CtlButton>
        </div>
      </div>

      {/* ---------- Phone: bottom sheet ---------- */}
      <div ref={sheetRef} className="absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom,0px))] z-20 md:hidden">
        {selected ? (
          <div className="anim-sheet max-h-[66dvh] overflow-y-auto rounded-t-[26px] bg-white shadow-up">
            <DogPanel dog={selected} onClose={() => select(null)} />
          </div>
        ) : (
          <div className="rounded-t-[26px] bg-white pb-3 pt-2.5 shadow-up">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" />
            <div className="flex items-baseline justify-between px-4 pb-2">
              <h2 className="font-display text-lg font-extrabold">
                {!dogsLoaded ? "Finding dogs…" : fix ? `${listed.filter((x) => (x.dist ?? 1e9) < 400).length} dogs near you` : `${listed.length} campus dogs`}
              </h2>
              {geoStatus === "denied" ? (
                <span className="text-xs text-muted">Location is off</span>
              ) : !fix ? (
                <button onClick={startLocation} className="text-[13px] font-semibold text-pine">
                  Use my location
                </button>
              ) : null}
            </div>
            <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-4">
              {listed.slice(0, 12).map(({ dog, dist }) => (
                <button key={dog.id} onClick={() => pick(dog)} className="grid w-[188px] shrink-0 gap-2 rounded-2xl bg-mist p-3 text-left">
                  <span className="flex items-center gap-2.5">
                    <DogAvatar dog={dog} className="h-11 w-11" dim={!dog.lastSeenAt} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{dog.name}</span>
                      <span className="flex items-center gap-1.5 text-xs text-muted">
                        <FreshDot iso={dog.lastSeenAt} />
                        <span className="truncate">
                          {dog.lastSeenAt ? timeAgo(dog.lastSeenAt).replace(" ago", "") : "usual spot"}
                          {dist != null ? ` · ${formatDistance(dist)}` : ""}
                        </span>
                      </span>
                    </span>
                  </span>
                  {dog.hangouts[0] && <span className="truncate rounded-lg bg-white px-2 py-1 text-xs font-medium text-muted">{dog.hangouts[0]}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-3.5 shadow-soft">
      <SearchIcon className="h-4 w-4 text-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search dogs or spots"
        aria-label="Search dogs or spots"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
      />
    </label>
  );
}

function Chips({ value, onChange, geoStatus, floating }: { value: Filter; onChange: (f: Filter) => void; geoStatus: string; floating?: boolean }) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {FILTERS.map((f) => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          aria-pressed={value === f.id}
          className={cx(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition",
            value === f.id ? "bg-pine text-mist" : floating ? "bg-white text-ink shadow-soft" : "border border-line bg-white text-ink",
            f.id === "near" && geoStatus === "denied" && "opacity-50"
          )}
        >
          {f.id === "fresh" && <span className="h-2 w-2 rounded-full bg-ok" />}
          {f.label}
        </button>
      ))}
    </div>
  );
}

function CtlButton({ label, onClick, children, active, busy }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean; busy?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx("grid h-11 w-11 place-items-center transition hover:bg-mist", active ? "text-locate" : "text-ink", busy && "animate-pulse")}
    >
      {children}
    </button>
  );
}
