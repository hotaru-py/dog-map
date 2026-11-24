"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { insideCampus, rules } from "@/config/site";
import { api, errorMessage } from "@/lib/api";
import { distanceMeters, formatDistance, timeAgo, type LatLng } from "@/lib/geo";
import { earn, XP } from "@/lib/progress";
import { useApp } from "../app/AppProvider";
import { Button, cx, DogAvatar, FreshDot, inputClass, Sheet, Spinner } from "../ui";
import { AlertIcon, CheckIcon, TargetIcon, XIcon } from "../icons";

const PinPicker = dynamic(() => import("../map/PinPicker"), { ssr: false, loading: () => <div className="h-64 rounded-2xl bg-soft" /> });

/** Update a dog's last-seen spot. Goes live straight away. */
export default function SpotFlow({ initialDogId }: { initialDogId?: number }) {
  const { dogs, fix, geoStatus, startLocation, close, toast, refreshDogs, select, dogById } = useApp();
  const [dogId, setDogId] = useState<number | null>(initialDogId ?? null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinTouched, setPinTouched] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startLocation();
  }, [startLocation]);

  // Follow the GPS fix until the student moves the pin themselves
  useEffect(() => {
    if (fix && !pinTouched) setPin({ lat: fix.lat, lng: fix.lng });
  }, [fix, pinTouched]);

  const dog = dogById(dogId);
  const choices = useMemo(() => {
    const list = dogs.filter((d) => d.status === "active" || d.status === "missing");
    return list
      .map((d) => ({ d, dist: fix ? distanceMeters(fix, d.position) : null }))
      .sort((a, b) => (a.dist ?? 1e9) - (b.dist ?? 1e9) || a.d.name.localeCompare(b.d.name));
  }, [dogs, fix]);

  const checks = fix && pin
    ? [
        { ok: fix.accuracy <= rules.spotMaxAccuracyM, text: `GPS accuracy ±${Math.round(fix.accuracy)} m`, fail: `Needs ±${rules.spotMaxAccuracyM} m or better. Step outside or wait a moment.` },
        { ok: insideCampus(pin.lat, pin.lng), text: "Inside campus", fail: "The pin must be on campus" },
        { ok: distanceMeters(pin, fix) <= rules.spotMaxPinOffsetM, text: `Pin within ${rules.spotMaxPinOffsetM} m of you`, fail: `Move the pin within ${rules.spotMaxPinOffsetM} m of where you are` },
      ]
    : [];
  const ready = !!dog && !!fix && !!pin && checks.every((c) => c.ok);

  const submit = useCallback(async () => {
    if (!dog || !fix || !pin) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ freshIntel: boolean }>("spot", {
        method: "POST",
        json: { dogId: dog.id, point: pin, fix: { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy }, note: note.trim() || undefined },
      });
      const gained = earn(XP.spot + (res.freshIntel ? XP.freshIntel : 0), (p) => ({ ...p, counts: { ...p.counts, spots: p.counts.spots + 1 } }));
      toast(`${dog.name}'s last-seen spot is updated · +${gained} XP${res.freshIntel ? " (fresh intel!)" : ""}`, "xp");
      await refreshDogs();
      select(dog.id);
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [dog, fix, pin, note, toast, refreshDogs, select, close]);

  // Step 1: choose the dog
  if (!dog) {
    return (
      <Sheet title="Which dog did you see?" onClose={close}>
        <div className="grid gap-1">
          {choices.map(({ d, dist }) => (
            <button key={d.id} onClick={() => setDogId(d.id)} className="flex items-center gap-3 rounded-2xl p-2.5 text-left hover:bg-mist">
              <DogAvatar dog={d} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{d.name}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <FreshDot iso={d.lastSeenAt} />
                  {d.lastSeenAt ? `Last seen ${timeAgo(d.lastSeenAt)}` : "No recent sightings"}
                </span>
              </span>
              {dist != null && <span className="text-[13px] font-semibold text-muted">{formatDistance(dist)}</span>}
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  // Step 2: confirm the spot
  return (
    <Sheet
      title={`Where is ${dog.name} now?`}
      onClose={close}
      footer={
        <Button className="w-full" size="lg" disabled={!ready || busy} onClick={submit}>
          {busy ? <Spinner className="h-4 w-4" /> : null}
          Update last seen · +{XP.spot} XP
        </Button>
      }
    >
      <div className="grid gap-4">
        {!initialDogId && (
          <button onClick={() => setDogId(null)} className="flex items-center gap-2.5 self-start rounded-full bg-mist py-1 pl-1 pr-3 text-sm font-semibold">
            <DogAvatar dog={dog} className="h-7 w-7" />
            {dog.name} · change
          </button>
        )}

        {!fix ? (
          <div className="grid h-64 place-items-center rounded-2xl bg-soft text-center text-sm text-muted">
            {geoStatus === "denied" ? (
              <span className="grid justify-items-center gap-2 px-6">
                <AlertIcon />
                Location is turned off for this site. Allow location in your browser settings, then try again.
              </span>
            ) : geoStatus === "unavailable" ? (
              <span className="px-6">We couldn&apos;t get your location. Make sure GPS is on and try again.</span>
            ) : (
              <span className="grid justify-items-center gap-2">
                <Spinner />
                Getting your location…
              </span>
            )}
          </div>
        ) : (
          pin && (
            <div className="relative">
              <PinPicker
                value={pin}
                onChange={(p) => {
                  setPin(p);
                  setPinTouched(true);
                }}
                fix={fix}
                allowRadiusM={rules.spotMaxPinOffsetM}
              />
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-soft">
                Drag the pin to where {dog.name} is
              </span>
              {pinTouched && (
                <button
                  onClick={() => {
                    setPinTouched(false);
                    setPin({ lat: fix.lat, lng: fix.lng });
                  }}
                  className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold shadow-soft"
                >
                  <TargetIcon className="h-3.5 w-3.5" />
                  Back to me
                </button>
              )}
            </div>
          )
        )}

        {checks.length > 0 && (
          <ul className="grid gap-1.5 rounded-2xl border border-line px-4 py-3 text-sm">
            {checks.map((c) => (
              <li key={c.text} className="flex items-start gap-2.5">
                <span className={cx("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", c.ok ? "bg-ok/15 text-ok" : "bg-bad/12 text-bad")}>
                  {c.ok ? <CheckIcon className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
                </span>
                <span className={c.ok ? "" : "text-bad"}>{c.ok ? c.text : c.fail}</span>
              </li>
            ))}
          </ul>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold">Note (optional)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Sleeping under the library stairs" className={inputClass} />
        </label>

        {error && <p className="rounded-xl bg-bad/10 px-3.5 py-2.5 text-sm text-bad">{error}</p>}
      </div>
    </Sheet>
  );
}
