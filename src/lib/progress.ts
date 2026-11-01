"use client";

import { useCallback, useEffect, useState } from "react";
import { readJson, writeJson } from "@/lib/storage";

/**
 * Per-device state for the visitor: dogs they've met, likes, and counters for
 * badges. Always stored locally; no account needed.
 */
export interface Progress {
  met: Record<number, string>; // dogId -> ISO date first met
  liked: number[];
  photos: number;
  reports: number;
  sightings: number;
}

const KEY = "progress";
const EMPTY: Progress = { met: {}, liked: [], photos: 0, reports: 0, sightings: 0 };
const listeners = new Set<(p: Progress) => void>();

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY);

  useEffect(() => {
    setProgress({ ...EMPTY, ...readJson<Progress>(KEY, EMPTY) });
    listeners.add(setProgress);
    return () => {
      listeners.delete(setProgress);
    };
  }, []);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn({ ...EMPTY, ...readJson<Progress>(KEY, EMPTY) });
    writeJson(KEY, next);
    listeners.forEach((l) => l(next));
  }, []);

  return { progress, update };
}

export interface Badge {
  id: string;
  name: string;
  hint: string;
  earned: boolean;
}

export function computeBadges(
  p: Progress,
  totalDogs: number,
  opts: { sightings: boolean; photos: boolean; reports: boolean }
): Badge[] {
  const met = Object.keys(p.met).length;
  const badges: (Badge | false)[] = [
    { id: "first", name: "First Friend", hint: "Meet your first dog", earned: met >= 1 },
    { id: "pack", name: "Pack Member", hint: "Meet 5 dogs", earned: met >= 5 },
    {
      id: "all",
      name: "Top Dog",
      hint: "Meet every dog on campus",
      earned: totalDogs > 0 && met >= totalDogs,
    },
    { id: "fan", name: "Big Fan", hint: "Like 3 dogs", earned: p.liked.length >= 3 },
    opts.photos && {
      id: "photo",
      name: "Shutterbug",
      hint: "Share a photo",
      earned: p.photos >= 1,
    },
    opts.reports && {
      id: "care",
      name: "Guardian",
      hint: "Report a dog that needs help",
      earned: p.reports >= 1,
    },
    opts.sightings && {
      id: "scout",
      name: "Scout",
      hint: "Log 10 sightings",
      earned: p.sightings >= 10,
    },
  ];
  return badges.filter((b): b is Badge => Boolean(b));
}
