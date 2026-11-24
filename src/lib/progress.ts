"use client";

import { useEffect, useState } from "react";

/**
 * Progress lives on the phone: no accounts, nothing ranked. The server only says
 * when something counts (fresh intel on a spot update).
 */
export interface Progress {
  v: 1;
  xp: number;
  /** dogId -> ISO date first met (checked in) */
  met: Record<string, string>;
  /** dogId -> YYYY-MM-DD of last check-in XP */
  checkins: Record<string, string>;
  streak: { count: number; last: string | null; freezeWeek: string | null };
  counts: { spots: number };
}

export const XP = {
  spot: 10,
  freshIntel: 10,
  checkin: 5,
  streakPerDay: 5,
  streakCap: 50,
};

const KEY = "snuc:progress";
const EMPTY: Progress = {
  v: 1,
  xp: 0,
  met: {},
  checkins: {},
  streak: { count: 0, last: null, freezeWeek: null },
  counts: { spots: 0 },
};

export const today = (d = new Date()) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
const dayOffset = (n: number) => today(new Date(Date.now() - n * 86400_000));
const isoWeek = (d = new Date()) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = t.getUTCFullYear();
  return `${y}-W${Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400_000 + 1) / 7)}`;
};

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as Progress) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<(p: Progress) => void>();

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked: progress just won't persist */
  }
  listeners.forEach((l) => l(p));
}

export function useProgress() {
  const [p, setP] = useState<Progress>(EMPTY);
  useEffect(() => {
    setP(loadProgress());
    listeners.add(setP);
    return () => {
      listeners.delete(setP);
    };
  }, []);
  return p;
}

/** Applies an XP-earning action, updating the daily streak. Returns XP gained (including streak bonus). */
export function earn(amount: number, mutate?: (p: Progress) => Progress): number {
  let p = loadProgress();
  if (mutate) p = mutate(p);
  let gained = amount;
  const t = today();
  const s = { ...p.streak };
  if (s.last !== t) {
    if (s.last === dayOffset(1)) s.count += 1;
    else if (s.last === dayOffset(2) && s.freezeWeek !== isoWeek()) {
      s.count += 1;
      s.freezeWeek = isoWeek();
    } else s.count = 1;
    s.last = t;
    gained += Math.min(XP.streakCap, XP.streakPerDay * s.count);
  }
  saveProgress({ ...p, xp: p.xp + gained, streak: s });
  return gained;
}

/** Level n needs 50·n² XP in total. */
export function levelInfo(xp: number) {
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 50)));
  const next = 50 * (level + 1) ** 2;
  const start = level === 1 ? 0 : 50 * level ** 2;
  const title = level < 3 ? "Pup" : level < 6 ? "Sniffer" : level < 10 ? "Tracker" : level < 15 ? "Ranger" : "Pack Leader";
  return { level, title, next, progress: Math.min(1, (xp - start) / (next - start)) };
}

export interface Badge {
  id: string;
  name: string;
  hint: string;
  earned: boolean;
}

export function badgesFor(p: Progress, activeDogs: number): Badge[] {
  const met = Object.keys(p.met).length;
  return [
    { id: "first", name: "First Friend", hint: "Check in with your first dog", earned: met >= 1 },
    { id: "pack", name: "Pack Member", hint: "Meet 5 dogs", earned: met >= 5 },
    { id: "top", name: "Top Dog", hint: "Meet every dog on campus", earned: activeDogs > 0 && met >= activeDogs },
    { id: "scout", name: "Scout", hint: "Update 10 last-seen spots", earned: p.counts.spots >= 10 },
  ];
}
