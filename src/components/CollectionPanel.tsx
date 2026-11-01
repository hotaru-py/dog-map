"use client";

import type { Dog } from "@/types/dog";
import { computeBadges, type Progress } from "@/lib/progress";
import { features } from "@/config/site";
import { Dialog } from "./ui";
import { CameraIcon, EyeIcon, HeartIcon, PawIcon, ShieldIcon, TrophyIcon, UsersIcon } from "./icons";

const BADGE_ICONS: Record<string, (p: { className?: string }) => React.ReactNode> = {
  first: PawIcon,
  pack: UsersIcon,
  all: TrophyIcon,
  fan: HeartIcon,
  photo: CameraIcon,
  care: ShieldIcon,
  scout: EyeIcon,
};

export default function CollectionPanel({
  dogs,
  progress,
  onSelect,
  onClose,
}: {
  dogs: Dog[];
  progress: Progress;
  onSelect: (id: number) => void;
  onClose: () => void;
}) {
  const metCount = dogs.filter((d) => progress.met[d.id]).length;
  const pct = dogs.length ? Math.round((metCount / dogs.length) * 100) : 0;
  const badges = computeBadges(progress, dogs.length, {
    sightings: features.sightings,
    photos: features.photoWall,
    reports: features.reports,
  });

  return (
    <Dialog title="My collection" onClose={onClose} wide>
      <div className="mb-5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            {metCount} of {dogs.length} dogs met
          </p>
          <p className="text-xs text-stone-500">{pct}%</p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-stone-900/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Badges</h3>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {badges.map((b) => {
          const BadgeIcon = BADGE_ICONS[b.id] ?? PawIcon;
          return (
            <div
              key={b.id}
              className={`rounded-2xl p-3 text-center transition ${
                b.earned
                  ? "bg-gradient-to-br from-amber-100 to-orange-100 ring-1 ring-orange-300 dark:from-orange-500/20 dark:to-amber-500/10 dark:ring-orange-500/40"
                  : "bg-stone-900/5 opacity-60 grayscale dark:bg-white/5"
              }`}
            >
              <span
                className={`mx-auto grid h-9 w-9 place-items-center rounded-full ${
                  b.earned ? "bg-orange-500 text-white" : "bg-stone-900/10 text-stone-500 dark:bg-white/10"
                }`}
              >
                <BadgeIcon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-2 text-xs font-bold text-stone-800 dark:text-stone-100">{b.name}</p>
              <p className="text-[11px] leading-tight text-stone-500">{b.hint}</p>
            </div>
          );
        })}
      </div>

      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">Dogs</h3>
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
        {dogs.map((dog) => {
          const met = Boolean(progress.met[dog.id]);
          return (
            <button
              key={dog.id}
              type="button"
              onClick={() => {
                onSelect(dog.id);
                onClose();
              }}
              className="group text-center"
              title={met ? `Met ${dog.name}` : `Not met yet`}
            >
              <div
                className={`relative mx-auto aspect-square w-full overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-white transition group-hover:scale-105 dark:ring-offset-stone-900 ${
                  met ? "ring-emerald-500" : "ring-stone-300 dark:ring-stone-700"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dog.photos[0]}
                  alt=""
                  className={`h-full w-full object-cover ${met ? "" : "brightness-50 grayscale"}`}
                />
                {!met && (
                  <span className="absolute inset-0 grid place-items-center text-lg font-bold text-white/90">?</span>
                )}
              </div>
              <p
                className={`mt-1.5 truncate text-xs font-semibold ${
                  met ? "text-stone-800 dark:text-stone-100" : "text-stone-400"
                }`}
              >
                {met ? dog.name : "Not met yet"}
              </p>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
