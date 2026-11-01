"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dog, Sighting } from "@/types/dog";
import { data } from "@/lib/data";
import { features, site } from "@/config/site";
import { useProgress } from "@/lib/progress";
import type { LatLng } from "@/lib/geo";

export interface DogView extends Dog {
  /** Where to draw the pin: latest recent sighting, else home location. */
  position: LatLng;
  lastSeen: Sighting | null;
  sightings: Sighting[];
  likes: number;
}

export function useCampusData(initialDogs: Dog[]) {
  const [dogs, setDogs] = useState<Dog[]>(initialDogs);
  const [likes, setLikes] = useState<Record<number, number>>({});
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { progress, update } = useProgress();

  const refresh = useCallback(async () => {
    try {
      const since = new Date(
        Date.now() - site.sightingWindowHours * 3600_000
      ).toISOString();
      const [d, l, s] = await Promise.all([
        data.getDogs(),
        features.likes ? data.getLikes() : Promise.resolve({}),
        features.sightings ? data.getSightings(since) : Promise.resolve([]),
      ]);
      setDogs(d);
      setLikes(l);
      setSightings(s);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the latest data");
    }
  }, []);

  useEffect(() => {
    refresh();
    if (data.mode !== "remote") return;
    // Keep sightings / likes fresh when there is a shared backend
    const t = setInterval(refresh, 60_000);
    return () => clearInterval(t);
  }, [refresh]);

  const views: DogView[] = useMemo(() => {
    const byDog = new Map<number, Sighting[]>();
    for (const s of sightings) {
      const list = byDog.get(s.dogId) ?? [];
      list.push(s);
      byDog.set(s.dogId, list);
    }
    return dogs.map((dog) => {
      const own = (byDog.get(dog.id) ?? []).sort((a, b) => b.at.localeCompare(a.at));
      const lastSeen = own[0] ?? null;
      return {
        ...dog,
        sightings: own,
        lastSeen,
        position: lastSeen ? { lat: lastSeen.lat, lng: lastSeen.lng } : dog.location,
        likes: likes[dog.id] ?? 0,
      };
    });
  }, [dogs, sightings, likes]);

  const toggleLike = useCallback(
    async (dogId: number) => {
      const liked = progress.liked.includes(dogId);
      const delta = liked ? -1 : 1;
      // Optimistic
      setLikes((l) => ({ ...l, [dogId]: Math.max(0, (l[dogId] ?? 0) + delta) }));
      update((p) => ({
        ...p,
        liked: liked ? p.liked.filter((id) => id !== dogId) : [...p.liked, dogId],
      }));
      try {
        const count = await data.like(dogId, delta);
        setLikes((l) => ({ ...l, [dogId]: count }));
      } catch {
        refresh();
      }
    },
    [progress.liked, update, refresh]
  );

  const addSighting = useCallback(
    async (dogId: number, at: LatLng, note?: string) => {
      const sighting = await data.addSighting({ dogId, lat: at.lat, lng: at.lng, note });
      setSightings((s) => [...s, sighting]);
      update((p) => ({ ...p, sightings: p.sightings + 1 }));
      return sighting;
    },
    [update]
  );

  const toggleMet = useCallback(
    (dogId: number) =>
      update((p) => {
        const met = { ...p.met };
        if (met[dogId]) delete met[dogId];
        else met[dogId] = new Date().toISOString();
        return { ...p, met };
      }),
    [update]
  );

  return {
    dogs: views,
    error,
    refresh,
    progress,
    updateProgress: update,
    toggleLike,
    toggleMet,
    addSighting,
  };
}

/** Pinned via config, otherwise rotates every week. */
export function dogOfTheWeek<T extends Dog>(dogs: T[]): T | null {
  if (dogs.length === 0) return null;
  const pinned = site.featuredDogId && dogs.find((d) => d.id === site.featuredDogId);
  if (pinned) return pinned;
  const week = Math.floor(Date.now() / (7 * 24 * 3600_000));
  const sorted = [...dogs].sort((a, b) => a.id - b.id);
  return sorted[week % sorted.length];
}
