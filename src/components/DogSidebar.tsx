"use client";

import { useEffect, useMemo, useState } from "react";
import type { DogView } from "@/hooks/useCampusData";
import { dogOfTheWeek } from "@/hooks/useCampusData";
import type { GeoState } from "@/hooks/useGeolocation";
import type { Progress } from "@/lib/progress";
import { distanceMeters, formatDistance, timeAgo } from "@/lib/geo";
import { features, site } from "@/config/site";
import { data } from "@/lib/data";
import { Icon } from "./ui";
import { CheckIcon, HeartIcon, Logo, StarIcon } from "./icons";

type SortKey = "name" | "near" | "popular" | "recent";

interface DogSidebarProps {
  dogs: DogView[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  progress: Progress;
  geo: GeoState;
  onLocate: () => void;
  onAddDog: () => void;
  onOpenCollection: () => void;
  onReport: () => void;
}

const isPhone = () => window.matchMedia("(max-width: 639px)").matches;

export default function DogSidebar({
  dogs,
  selectedId,
  onSelect,
  progress,
  geo,
  onLocate,
  onAddDog,
  onOpenCollection,
  onReport,
}: DogSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");

  // Start collapsed on phones so the map is visible
  useEffect(() => {
    if (isPhone()) setIsOpen(false);
  }, []);

  const handleSelect = (id: number) => {
    onSelect(id);
    if (isPhone()) setIsOpen(false);
  };

  const here = geo.position;

  const sortOptions = useMemo(() => {
    const opts: { key: SortKey; label: string }[] = [{ key: "name", label: "A–Z" }];
    if (features.nearby) opts.push({ key: "near", label: "Near me" });
    if (features.likes) opts.push({ key: "popular", label: "Popular" });
    if (features.sightings) opts.push({ key: "recent", label: "Recent" });
    return opts;
  }, []);

  const pickSort = (key: SortKey) => {
    setSort(key);
    if (key === "near" && geo.status !== "active") onLocate();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = dogs
      .filter(
        (dog) =>
          !q ||
          dog.name.toLowerCase().includes(q) ||
          dog.breed.toLowerCase().includes(q) ||
          dog.hangouts?.some((h) => h.toLowerCase().includes(q))
      )
      .map((dog) => ({
        dog,
        distance: here ? distanceMeters(here, dog.position) : null,
      }));

    const byName = (a: (typeof list)[0], b: (typeof list)[0]) => a.dog.name.localeCompare(b.dog.name);
    switch (sort) {
      case "near":
        if (here) {
          return list
            .filter((x) => x.distance! <= site.nearbyRadiusMeters * 4)
            .sort((a, b) => a.distance! - b.distance!);
        }
        return list.sort(byName);
      case "popular":
        return list.sort((a, b) => b.dog.likes - a.dog.likes || byName(a, b));
      case "recent":
        return list.sort(
          (a, b) => (b.dog.lastSeen?.at ?? "").localeCompare(a.dog.lastSeen?.at ?? "") || byName(a, b)
        );
      default:
        return list.sort(byName);
    }
  }, [dogs, query, sort, here]);

  const nearbyCount = here
    ? dogs.filter((d) => distanceMeters(here, d.position) <= site.nearbyRadiusMeters).length
    : 0;

  const featured = useMemo(() => dogOfTheWeek(dogs), [dogs]);
  const metCount = dogs.filter((d) => progress.met[d.id]).length;

  return (
    <aside data-map-overlay="sidebar" className="glass absolute left-3 right-[4.25rem] top-3 z-[1000] flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-3xl sm:left-4 sm:right-auto sm:top-4 sm:w-[340px]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        className="flex items-center gap-3 p-3 text-left"
      >
        <Logo />
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-bold leading-tight text-stone-900 dark:text-white">{site.name}</h1>
          <p className="truncate text-xs text-stone-500 dark:text-stone-400">
            {here && features.nearby
              ? `${nearbyCount} dog${nearbyCount === 1 ? "" : "s"} within ${site.nearbyRadiusMeters} m of you`
              : `${dogs.length} ${site.tagline}`}
          </p>
        </div>
        <svg
          viewBox="0 0 24 24"
          className={`h-5 w-5 shrink-0 text-stone-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen && (
        <div className="animate-fade-in flex min-h-0 flex-col">
          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto max-sm:max-h-[55dvh]">
            {/* Dog of the week */}
            {featured && !query && (
              <button
                type="button"
                onClick={() => handleSelect(featured.id)}
                className="group relative mx-3 mb-3 block h-28 w-[calc(100%-1.5rem)] overflow-hidden rounded-2xl text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featured.photos[0]}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
                  <StarIcon className="h-3 w-3" />
                  Dog of the week
                </span>
                <div className="absolute bottom-2.5 left-3 right-3">
                  <p className="text-lg font-bold leading-tight text-white">{featured.name}</p>
                  <p className="truncate text-xs text-white/80">{featured.description}</p>
                </div>
              </button>
            )}

            {/* Search + sort */}
            <div className="sticky top-0 z-10 space-y-2 bg-gradient-to-b from-white/90 to-white/70 px-3 pb-2 pt-1 backdrop-blur dark:from-stone-900/90 dark:to-stone-900/70">
              <label className="relative block">
                <span className="sr-only">Search dogs</span>
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, breed or spot"
                  className="w-full rounded-xl border border-stone-900/10 bg-white/70 py-2 pl-9 pr-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
              </label>
              {sortOptions.length > 1 && (
                <div className="flex gap-1 rounded-xl bg-stone-900/5 p-1 dark:bg-white/5" role="tablist">
                  {sortOptions.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      role="tab"
                      aria-selected={sort === o.key}
                      onClick={() => pickSort(o.key)}
                      className={`flex-1 rounded-lg py-1 text-xs font-semibold transition ${
                        sort === o.key
                          ? "bg-white text-stone-900 shadow-sm dark:bg-stone-700 dark:text-white"
                          : "text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <ul className="px-2 pb-2">
              {sort === "near" && geo.status === "locating" && (
                <li className="px-3 py-2 text-xs text-stone-500">Finding your location…</li>
              )}
              {sort === "near" && (geo.status === "denied" || geo.status === "unavailable") && (
                <li className="px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  {geo.status === "denied"
                    ? "Location permission is off. Enable it in your browser to sort by distance."
                    : "Location isn't available on this device."}
                </li>
              )}
              {filtered.map(({ dog, distance }) => {
                const isSelected = dog.id === selectedId;
                const met = Boolean(progress.met[dog.id]);
                return (
                  <li key={dog.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(dog.id)}
                      className={`group flex w-full items-center gap-3 rounded-2xl p-2 text-left transition ${
                        isSelected
                          ? "bg-orange-500/15 ring-1 ring-orange-500/40"
                          : "hover:bg-stone-900/5 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={dog.photos[0]}
                          alt=""
                          loading="lazy"
                          className={`h-11 w-11 rounded-full object-cover ring-2 transition ${
                            isSelected ? "ring-orange-500" : "ring-white group-hover:ring-orange-300 dark:ring-stone-700"
                          }`}
                        />
                        {features.collection && met && (
                          <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-emerald-500 text-white dark:border-stone-900">
                            <CheckIcon className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{dog.name}</p>
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {features.sightings && dog.lastSeen ? `Seen ${timeAgo(dog.lastSeen.at)}` : dog.breed}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs">
                        {distance != null && (
                          <p className="font-semibold text-stone-700 dark:text-stone-200">{formatDistance(distance)}</p>
                        )}
                        {features.likes && dog.likes > 0 && (
                          <p className="inline-flex items-center gap-1 text-rose-500">
                            <HeartIcon filled className="h-3 w-3" />
                            {dog.likes}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}

              {filtered.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-stone-500">
                  {query ? `No dogs match “${query}”` : "No dogs nearby right now"}
                </li>
              )}
            </ul>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-1.5 border-t border-stone-900/5 p-2 dark:border-white/5">
            {features.submissions && (
              <ActionButton onClick={onAddDog} icon="M12 5v14M5 12h14" label="Add dog" />
            )}
            {features.collection && (
              <ActionButton
                onClick={onOpenCollection}
                icon="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"
                label={`${metCount}/${dogs.length} met`}
              />
            )}
            {features.reports && (
              <ActionButton
                onClick={onReport}
                icon="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                label="Report"
                danger
              />
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 border-t border-stone-900/5 px-4 py-2.5 text-xs text-stone-500 dark:border-white/5 dark:text-stone-400">
            {site.donateUrl && (
              <a href={site.donateUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:underline">
                Donate
              </a>
            )}
            {site.volunteerUrl && (
              <a href={site.volunteerUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-orange-600 hover:underline">
                Volunteer
              </a>
            )}
            {data.mode === "local" && (
              <span
                className="inline-flex items-center gap-1.5"
                title="No backend connected: likes, photos and reports are saved on this device only"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Local mode
              </span>
            )}
            <a
              href={site.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View source on GitHub"
              className="ml-auto transition hover:text-stone-900 dark:hover:text-white"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </aside>
  );
}

function ActionButton({
  onClick,
  icon,
  label,
  danger,
}: {
  onClick: () => void;
  icon: string;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-semibold transition hover:bg-stone-900/5 dark:hover:bg-white/5 ${
        danger ? "text-red-600 dark:text-red-400" : "text-stone-700 dark:text-stone-200"
      }`}
    >
      <Icon d={icon} className="h-4 w-4" />
      {label}
    </button>
  );
}
