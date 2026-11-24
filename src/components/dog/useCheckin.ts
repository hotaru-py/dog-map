"use client";

import { useCallback, useState } from "react";
import { rules } from "@/config/site";
import { api, errorMessage } from "@/lib/api";
import { distanceMeters } from "@/lib/geo";
import { earn, loadProgress, today, XP } from "@/lib/progress";
import type { Dog } from "@/types/dog";
import { useApp } from "../app/AppProvider";

/** Check in with a dog: server verifies distance and crowding; XP and Pack Book live on the phone. */
export function useCheckin() {
  const { fix, toast, startLocation } = useApp();
  const [busy, setBusy] = useState(false);

  const distanceTo = useCallback((dog: Dog) => (fix ? distanceMeters(fix, dog.position) : null), [fix]);

  const canCheckin = useCallback(
    (dog: Dog) => {
      const d = distanceTo(dog);
      return d != null && d <= rules.checkinRadiusM && (fix?.accuracy ?? 999) <= rules.checkinMaxAccuracyM;
    },
    [distanceTo, fix]
  );

  const checkin = useCallback(
    async (dog: Dog) => {
      if (!fix) {
        startLocation();
        toast("Turn on location to check in");
        return;
      }
      setBusy(true);
      try {
        const res = await api<{ ok: boolean; already: boolean }>("checkin", {
          method: "POST",
          json: { dogId: dog.id, fix: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy } },
        });
        const p = loadProgress();
        const first = !p.met[dog.id];
        if (res.already && p.checkins[dog.id] === today()) {
          toast(`You've already checked in with ${dog.name} today`);
          return;
        }
        const gained = earn(XP.checkin, (cur) => ({
          ...cur,
          met: first ? { ...cur.met, [dog.id]: new Date().toISOString() } : cur.met,
          checkins: { ...cur.checkins, [dog.id]: today() },
        }));
        toast(first ? `${dog.name} added to your Pack Book · +${gained} XP` : `Checked in with ${dog.name} · +${gained} XP`, "xp");
      } catch (err) {
        toast(errorMessage(err), "error");
      } finally {
        setBusy(false);
      }
    },
    [fix, startLocation, toast]
  );

  return { checkin, canCheckin, distanceTo, busy };
}
