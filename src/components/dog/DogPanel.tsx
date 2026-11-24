"use client";

import { useEffect, useState } from "react";
import { GIVE_SPACE, rules } from "@/config/site";
import { api } from "@/lib/api";
import { formatDistance, timeAgo } from "@/lib/geo";
import { useProgress } from "@/lib/progress";
import type { Dog, DogDetail } from "@/types/dog";
import { useApp } from "../app/AppProvider";
import { Button, cx, DogAvatar, DogPhoto, FreshDot, seenText, TemperamentTag, useNow } from "../ui";
import { CheckIcon, ClockIcon, EyeIcon, NavIcon, PinIcon, UserIcon, XIcon } from "../icons";
import { useCheckin } from "./useCheckin";

type Tab = "about" | "sightings" | "gallery";

/** Everything about one dog. Used in the phone sheet and the desktop side panel. */
export function DogPanel({ dog, onClose }: { dog: Dog; onClose: () => void }) {
  const { open, setNavigate, startLocation } = useApp();
  const { checkin, canCheckin, distanceTo, busy } = useCheckin();
  const progress = useProgress();
  const [tab, setTab] = useState<Tab>("about");
  const [detail, setDetail] = useState<DogDetail | null>(null);
  useNow();

  useEffect(() => {
    let cancelled = false;
    api<{ dog: DogDetail }>(`dogs/${dog.id}`)
      .then((r) => !cancelled && setDetail(r.dog))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dog.id, dog.lastSeenAt]);

  useEffect(() => setTab("about"), [dog.id]);

  const dist = distanceTo(dog);
  const met = !!progress.met[dog.id];
  const giveSpace = dog.temperament.some((t) => GIVE_SPACE.includes(t));
  const photos = dog.photos.map((u) => ({ id: u, url: u, full: u }));

  return (
    <article className="flex min-h-0 flex-col">
      <div className="relative h-52 shrink-0 overflow-hidden bg-soft sm:h-56">
        <DogPhoto src={dog.cover} alt={dog.name} className="h-full w-full" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-ink/45 text-white backdrop-blur hover:bg-ink/60"
        >
          <XIcon className="h-4 w-4" />
        </button>
        {dog.status === "missing" && (
          <span className="absolute left-3 top-3 rounded-full bg-bad px-3 py-1 text-xs font-bold text-white">Missing: please report if seen</span>
        )}
      </div>

      <div className="grid gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[28px] font-extrabold leading-tight">{dog.name}</h2>
            <p className="text-sm text-muted">
              {[dog.breed, dog.sex === "male" ? "Boy" : dog.sex === "female" ? "Girl" : null, dog.age].filter(Boolean).join(" · ")}
            </p>
          </div>
          {met && (
            <span title="In your Pack Book" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-pine text-sun">
              <CheckIcon className="h-5 w-5" />
            </span>
          )}
        </div>

        {dog.temperament.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dog.temperament.map((t) => (
              <TemperamentTag key={t} value={t} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl bg-mist px-4 py-3">
          <FreshDot iso={dog.lastSeenAt} className="h-2.5 w-2.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{dog.lastSeenAt ? seenText(dog.lastSeenAt) : "Not seen recently · showing usual spot"}</p>
            <p className="text-xs text-muted">
              {dist != null ? `${formatDistance(dist)} from you` : "Turn on location to see how far"}
              {dog.hangouts[0] ? ` · usually near ${dog.hangouts[0]}` : ""}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="pine" onClick={() => setNavigate(true, dog.id)}>
            <NavIcon className="h-4 w-4" />
            Navigate
          </Button>
          <Button onClick={() => open({ kind: "spot", dogId: dog.id })}>
            <EyeIcon className="h-4 w-4" />I spotted {dog.sex === "female" ? "her" : dog.sex === "male" ? "him" : "them"}
          </Button>
          {canCheckin(dog) ? (
            <Button variant="secondary" className="col-span-2" disabled={busy} onClick={() => checkin(dog)}>
              <CheckIcon className="h-4 w-4" />
              Check in with {dog.name}
            </Button>
          ) : (
            <button
              onClick={startLocation}
              className="col-span-2 rounded-full bg-soft px-4 py-2.5 text-[13px] font-semibold text-muted"
            >
              Get within {rules.checkinRadiusM} m to check in{dist == null ? " · turn on location" : ""}
            </button>
          )}
        </div>
        {giveSpace && (
          <p className="rounded-xl bg-warn/12 px-3.5 py-2.5 text-[13px] text-[#7a5200]">
            {dog.name} likes space. Check-ins count from {rules.checkinRadiusM} m, so there&apos;s no need to get closer.
          </p>
        )}

        <div role="tablist" className="flex gap-1 rounded-full bg-soft p-1">
          {(["about", "sightings", "gallery"] as Tab[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                "flex-1 rounded-full py-2 text-[13px] font-semibold capitalize transition",
                tab === t ? "bg-white text-ink shadow-soft" : "text-muted"
              )}
            >
              {t === "gallery" ? `Photos ${photos.length || ""}` : t}
            </button>
          ))}
        </div>

        {tab === "about" && (
          <div className="grid gap-4 text-sm">
            {dog.description && <p className="leading-relaxed text-ink/85">{dog.description}</p>}
            {dog.hangouts.length > 0 && (
              <Section title="Hangs out at">
                <div className="flex flex-wrap gap-1.5">
                  {dog.hangouts.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 rounded-full bg-mist px-2.5 py-1 text-xs font-medium">
                      <PinIcon className="h-3.5 w-3.5 text-muted" />
                      {h}
                    </span>
                  ))}
                </div>
              </Section>
            )}
            {(dog.health.vaccinated !== undefined || dog.health.sterilized !== undefined || dog.health.lastVetVisit) && (
              <Section title="Health">
                <div className="flex flex-wrap gap-1.5">
                  {dog.health.vaccinated !== undefined && <HealthChip ok={dog.health.vaccinated} label="Vaccinated" />}
                  {dog.health.sterilized !== undefined && <HealthChip ok={dog.health.sterilized} label="Sterilised" />}
                </div>
                {(dog.health.lastVetVisit || dog.health.notes) && (
                  <p className="mt-2 text-xs text-muted">
                    {dog.health.lastVetVisit && `Last vet visit ${new Date(dog.health.lastVetVisit).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}. `}
                    {dog.health.notes}
                  </p>
                )}
              </Section>
            )}
            {dog.feeding.length > 0 && (
              <Section title="Feeding">
                <ul className="divide-y divide-line overflow-hidden rounded-xl bg-mist">
                  {dog.feeding.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <ClockIcon className="h-3.5 w-3.5 text-muted" />
                        {f.time}
                      </span>
                      <span className="truncate text-xs text-muted">{[f.place, f.by && `by ${f.by}`].filter(Boolean).join(" · ")}</span>
                    </li>
                  ))}
                </ul>
                {dog.temperament.includes("dont-feed") && <p className="mt-2 text-xs text-muted">Please leave feeding to the volunteers.</p>}
              </Section>
            )}
            {dog.caretakers.length > 0 && (
              <Section title="Caretakers">
                {dog.caretakers.map((c) => (
                  <p key={c.name} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <UserIcon className="h-3.5 w-3.5 text-muted" />
                      {c.name}
                    </span>
                    {c.contact && <span className="select-all text-xs text-muted">{c.contact}</span>}
                  </p>
                ))}
              </Section>
            )}
          </div>
        )}

        {tab === "sightings" && (
          <div className="grid gap-1">
            {!detail ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : detail.sightings.length === 0 ? (
              <p className="text-sm text-muted">No updates yet. Spotted {dog.name}? Update the map.</p>
            ) : (
              detail.sightings.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-0">
                  <FreshDot iso={s.createdAt} />
                  <span className="min-w-0 flex-1 truncate">{s.note || "Location updated"}</span>
                  <span className="shrink-0 text-xs text-muted">{timeAgo(s.createdAt)}</span>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "gallery" && (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.length === 0 && <p className="col-span-3 text-sm text-muted">No photos of {dog.name} yet.</p>}
            {photos.map((p) => (
              <a key={p.id} href={p.full} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
              </a>
            ))}
          </div>
        )}

      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h3>
      {children}
    </div>
  );
}

function HealthChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", ok ? "bg-ok/12 text-ok" : "bg-soft text-muted")}>
      {ok ? <CheckIcon className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
      {label}
    </span>
  );
}

/** Compact row used in lists. */
export function DogRow({ dog, distance, active, onClick }: { dog: Dog; distance: number | null; active?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition",
        active ? "bg-white shadow-soft ring-1 ring-line" : "hover:bg-white/70"
      )}
    >
      <DogAvatar dog={dog} dim={!dog.lastSeenAt} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{dog.name}</span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <FreshDot iso={dog.lastSeenAt} />
          <span className="truncate">{dog.lastSeenAt ? timeAgo(dog.lastSeenAt) : "Not seen recently"}{dog.hangouts[0] ? ` · ${dog.hangouts[0]}` : ""}</span>
        </span>
      </span>
      {distance != null && <span className="shrink-0 text-[13px] font-semibold text-muted">{formatDistance(distance)}</span>}
    </button>
  );
}
