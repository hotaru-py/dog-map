"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import type { CommunityPhoto } from "@/types/dog";
import type { DogView } from "@/hooks/useCampusData";
import { features, site } from "@/config/site";
import { data } from "@/lib/data";
import { fileToResizedDataUrl } from "@/lib/image";
import { distanceMeters, formatDistance, timeAgo, type LatLng } from "@/lib/geo";
import { Icon, TemperamentBadge } from "./ui";
import { CheckIcon, ClockIcon, HeartIcon, PawIcon, PinIcon, UserIcon, XIcon } from "./icons";

interface DogModalProps {
  dog: DogView;
  liked: boolean;
  met: boolean;
  userPosition: LatLng | null;
  onClose: () => void;
  onToggleLike: () => void;
  onToggleMet: () => void;
  onReport: () => void;
  onSighting: () => Promise<void>;
  onPhotoAdded: () => void;
  onToast: (message: string) => void;
}

export default function DogModal({
  dog,
  liked,
  met,
  userPosition,
  onClose,
  onToggleLike,
  onToggleMet,
  onReport,
  onSighting,
  onPhotoAdded,
  onToast,
}: DogModalProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [community, setCommunity] = useState<CommunityPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [logging, setLogging] = useState(false);
  const photoCount = dog.photos.length;

  useEffect(() => {
    setCurrentPhotoIndex(0);
    if (!features.photoWall) return;
    let cancelled = false;
    data
      .getPhotos(dog.id)
      .then((p) => !cancelled && setCommunity(p))
      .catch(() => !cancelled && setCommunity([]));
    return () => {
      cancelled = true;
    };
  }, [dog.id]);

  const nextPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photoCount);
  }, [photoCount]);

  const prevPhoto = useCallback(() => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photoCount) % photoCount);
  }, [photoCount]);

  // Keyboard: Esc closes, arrows flip photos (ignored while a dialog is on top)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") nextPhoto();
      else if (e.key === "ArrowLeft") prevPhoto();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, nextPhoto, prevPhoto]);

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dog.position.lat},${dog.position.lng}&travelmode=walking`;
  const distance = userPosition ? distanceMeters(userPosition, dog.position) : null;

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${dog.name} on the ${site.name}`, url });
      } catch {
        // user dismissed the share sheet
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    onToast("Link copied");
  }, [dog.name, onToast]);

  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await fileToResizedDataUrl(file);
      const photo = await data.addPhoto({ dogId: dog.id, url });
      setCommunity((c) => [photo, ...c]);
      onPhotoAdded();
      onToast("Photo added");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Couldn't add that photo");
    } finally {
      setUploading(false);
    }
  };

  const handleSighting = async () => {
    setLogging(true);
    try {
      await onSighting();
    } finally {
      setLogging(false);
    }
  };

  const { health } = dog;
  const hasHealth =
    health && (health.vaccinated !== undefined || health.sterilized !== undefined || health.lastVetVisit || health.notes);

  return (
    <section
      key={dog.id}
      role="region"
      data-map-overlay="card"
      aria-label={`${dog.name} details`}
      className="glass animate-sheet absolute inset-x-3 bottom-3 z-[1001] flex max-h-[60dvh] flex-col overflow-hidden rounded-3xl md:inset-x-auto md:bottom-4 md:right-4 md:w-[400px] md:max-h-[calc(100dvh-17rem)]"
    >
      {/* Photo carousel */}
      <div className="group relative aspect-[16/10] shrink-0 bg-stone-200 dark:bg-stone-800">
        <Image
          key={dog.photos[currentPhotoIndex]}
          src={dog.photos[currentPhotoIndex]}
          alt={`${dog.name} - photo ${currentPhotoIndex + 1}`}
          fill
          sizes="(min-width: 768px) 400px, 100vw"
          className="animate-fade-in object-cover"
          unoptimized
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
        >
          <XIcon className="h-5 w-5" />
        </button>

        {features.likes && (
          <button
            type="button"
            onClick={onToggleLike}
            aria-pressed={liked}
            aria-label={liked ? "Unlike" : "Like"}
            className={`absolute left-3 top-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold backdrop-blur-md transition active:scale-90 ${
              liked ? "bg-rose-500 text-white" : "bg-black/40 text-white hover:bg-black/60"
            }`}
          >
            <HeartIcon filled={liked} className="h-4 w-4" />
            {dog.likes}
          </button>
        )}

        {photoCount > 1 && (
          <>
            <CarouselButton side="left" onClick={prevPhoto} label="Previous photo">
              <path d="m15 18-6-6 6-6" />
            </CarouselButton>
            <CarouselButton side="right" onClick={nextPhoto} label="Next photo">
              <path d="m9 18 6-6-6-6" />
            </CarouselButton>

            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {dog.photos.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentPhotoIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentPhotoIndex ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                  }`}
                  aria-label={`Go to photo ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-3 left-4 right-24">
          <h2 className="truncate text-2xl font-bold text-white drop-shadow">
            {dog.name}
            {met && (
              <span className="ml-2 inline-grid h-5 w-5 place-items-center rounded-full bg-emerald-500 align-middle" title="You've met">
                <CheckIcon className="h-3 w-3" />
              </span>
            )}
          </h2>
          <p className="truncate text-xs font-medium text-white/80">
            {[dog.breed, genderLabel(dog.gender), dog.age].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {/* Dog info */}
      <div className="scrollbar-thin space-y-5 overflow-y-auto p-5">
        {/* Where */}
        {(features.sightings || distance != null) && (
          <div className="flex items-center gap-3 rounded-2xl bg-stone-900/5 p-3 dark:bg-white/5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-orange-500/15 text-orange-600">
              <PinIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-stone-800 dark:text-stone-100">
                {features.sightings
                  ? dog.lastSeen
                    ? `Seen ${timeAgo(dog.lastSeen.at)}`
                    : "No recent sightings"
                  : "Usually around here"}
              </p>
              <p className="text-xs text-stone-500">
                {distance != null ? `${formatDistance(distance)} from you` : "Turn on location to see distance"}
                {features.sightings && dog.sightings.length > 1 && ` · ${dog.sightings.length} sightings`}
              </p>
            </div>
            {features.sightings && (
              <button
                type="button"
                onClick={handleSighting}
                disabled={logging}
                className="shrink-0 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {logging ? "Logging…" : "I saw them"}
              </button>
            )}
          </div>
        )}

        {dog.temperament && dog.temperament.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dog.temperament.map((t) => (
              <TemperamentBadge key={t} value={t} />
            ))}
          </div>
        )}

        <p className="text-sm leading-relaxed text-stone-700 dark:text-stone-300">{dog.description}</p>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          {features.collection && (
            <button
              type="button"
              onClick={onToggleMet}
              className={`col-span-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                met
                  ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/40 dark:text-emerald-300"
                  : "bg-stone-900 text-white hover:bg-stone-800 dark:bg-white dark:text-stone-900"
              }`}
            >
              {met ? <CheckIcon className="h-4 w-4" /> : <PawIcon className="h-4 w-4" />}
              {met ? `You've met ${dog.name}` : `I've met ${dog.name}`}
            </button>
          )}
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-500/30 transition hover:bg-orange-600 active:scale-[0.98]"
          >
            <Icon d="M3 11 22 2l-9 19-2-8-8-2Z" className="h-4 w-4" />
            Directions
          </a>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl border border-stone-900/10 bg-white/60 px-4 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-white active:scale-[0.98] dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10"
          >
            <Icon d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" className="h-4 w-4" />
            Share
          </button>
        </div>

        {dog.hangouts && dog.hangouts.length > 0 && (
          <InfoSection title="Hangs out at">
            <div className="flex flex-wrap gap-1.5">
              {dog.hangouts.map((h) => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1 rounded-full bg-stone-900/5 px-2.5 py-1 text-xs font-medium text-stone-700 dark:bg-white/5 dark:text-stone-300"
                >
                  <PinIcon className="h-3 w-3 text-stone-400" />
                  {h}
                </span>
              ))}
            </div>
          </InfoSection>
        )}

        {hasHealth && (
          <InfoSection title="Health">
            <div className="flex flex-wrap gap-1.5">
              {health.vaccinated !== undefined && <HealthChip ok={health.vaccinated} label="Vaccinated" />}
              {health.sterilized !== undefined && <HealthChip ok={health.sterilized} label="Sterilised" />}
            </div>
            {(health.lastVetVisit || health.notes) && (
              <p className="mt-2 text-xs text-stone-500">
                {health.lastVetVisit && `Last vet visit: ${formatDate(health.lastVetVisit)}. `}
                {health.notes}
              </p>
            )}
          </InfoSection>
        )}

        {dog.feeding && dog.feeding.length > 0 && (
          <InfoSection title="Feeding schedule">
            <ul className="divide-y divide-stone-900/5 overflow-hidden rounded-xl bg-stone-900/5 text-sm dark:divide-white/5 dark:bg-white/5">
              {dog.feeding.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-100">
                    <ClockIcon className="h-3.5 w-3.5 text-stone-400" />
                    {f.time}
                  </span>
                  <span className="truncate text-xs text-stone-500">{[f.place, f.by && `by ${f.by}`].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </InfoSection>
        )}

        {dog.caretakers && dog.caretakers.length > 0 && (
          <InfoSection title="Caretakers">
            <ul className="space-y-1.5 text-sm">
              {dog.caretakers.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 font-medium text-stone-800 dark:text-stone-100">
                    <UserIcon className="h-3.5 w-3.5 text-stone-400" />
                    {c.name}
                  </span>
                  {c.contact && (
                    <a href={contactHref(c.contact)} className="truncate text-xs font-semibold text-orange-600 hover:underline">
                      {c.contact}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </InfoSection>
        )}

        {features.photoWall && (
          <InfoSection
            title={`Community photos${community.length ? ` (${community.length})` : ""}`}
            action={
              <label className={`cursor-pointer text-xs font-bold text-orange-600 hover:underline ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                {uploading ? "Uploading…" : "+ Add photo"}
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => handleUpload(e.target.files)} />
              </label>
            }
          >
            {community.length === 0 ? (
              <p className="text-xs text-stone-500">No photos yet. Be the first to share one!</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {community.slice(0, 9).map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? `${dog.name} community photo`} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            )}
          </InfoSection>
        )}

        {features.reports && (
          <button
            type="button"
            onClick={onReport}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
          >
            <Icon d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" className="h-4 w-4" />
            Report a concern about {dog.name}
          </button>
        )}
      </div>
    </section>
  );
}

function InfoSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-stone-500">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function HealthChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-stone-900/5 text-stone-500 dark:bg-white/5"
      }`}
    >
      {ok ? <CheckIcon className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function genderLabel(g: DogView["gender"]) {
  return g === "male" ? "Boy" : g === "female" ? "Girl" : null;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function contactHref(contact: string) {
  if (contact.includes("@")) return `mailto:${contact}`;
  if (/^[+\d][\d\s-]{5,}$/.test(contact)) return `tel:${contact.replace(/\s/g, "")}`;
  return contact.startsWith("http") ? contact : `https://${contact}`;
}

function CarouselButton({
  side,
  onClick,
  label,
  children,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white opacity-100 backdrop-blur-md transition hover:bg-black/60 md:opacity-0 md:group-hover:opacity-100 ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
