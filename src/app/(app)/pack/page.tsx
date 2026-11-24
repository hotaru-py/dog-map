"use client";

import Link from "next/link";
import { useApp } from "@/components/app/AppProvider";
import { cx, DogAvatar } from "@/components/ui";
import { BookIcon, CheckIcon, DogGlyph, EyeIcon, FlameIcon, TrophyIcon, UsersIcon } from "@/components/icons";
import { badgesFor, levelInfo, useProgress, XP } from "@/lib/progress";

const BADGE_ICON: Record<string, (p: { className?: string }) => React.ReactNode> = {
  first: CheckIcon,
  pack: UsersIcon,
  top: TrophyIcon,
  scout: EyeIcon,
};

export default function PackPage() {
  const { dogs, select } = useApp();
  const p = useProgress();
  const lvl = levelInfo(p.xp);
  const active = dogs.filter((d) => d.status === "active" || d.status === "missing");
  const metCount = active.filter((d) => p.met[d.id]).length;
  const badges = badgesFor(p, active.length);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 px-4 pb-10 pt-[calc(20px+env(safe-area-inset-top,0px))] md:px-8 md:pt-10">
      <section className="grid gap-3 rounded-[22px] bg-pine p-5 text-mist shadow-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-mist/70">Level {lvl.level}</p>
            <h1 className="font-display text-3xl font-extrabold">{lvl.title}</h1>
          </div>
          {p.streak.count > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1.5 text-sm font-bold">
              <FlameIcon className="h-4 w-4 text-blaze" />
              {p.streak.count}-day streak
            </span>
          )}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/18">
          <div className="h-full rounded-full bg-blaze transition-all duration-700" style={{ width: `${Math.round(lvl.progress * 100)}%` }} />
        </div>
        <p className="text-sm text-mist/85">
          {p.xp.toLocaleString()} / {lvl.next.toLocaleString()} XP to Level {lvl.level + 1}
        </p>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
            <BookIcon /> Pack Book
          </h2>
          <span className="text-sm font-semibold text-muted">
            {metCount} of {active.length} met
          </span>
        </div>
        <p className="text-sm text-muted">Check in with a dog in person (within 25 m) to add them. Dogs you haven&apos;t met stay as silhouettes.</p>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
          {active.map((d) => {
            const met = !!p.met[d.id];
            return (
              <Link key={d.id} href={`/?dog=${d.slug}`} onClick={() => select(d.id)} className="grid justify-items-center gap-1.5 text-center">
                {met ? (
                  <DogAvatar dog={d} className="h-16 w-16 ring-[3px] ring-ok ring-offset-2 ring-offset-mist" />
                ) : (
                  <span className="grid h-16 w-16 place-items-center rounded-full bg-soft text-stale">
                    <DogGlyph className="h-10 w-10" face={false} />
                  </span>
                )}
                <span className={cx("w-full truncate text-xs font-semibold", !met && "text-muted")}>{met ? d.name : "Not met yet"}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-display text-xl font-extrabold">Badges</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {badges.map((b) => {
            const Icon = BADGE_ICON[b.id] ?? CheckIcon;
            return (
              <div key={b.id} className={cx("flex items-center gap-3 rounded-2xl p-3", b.earned ? "bg-white shadow-soft" : "bg-soft/60")}>
                <span className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", b.earned ? "bg-pine text-sun" : "bg-white text-stale")}>
                  <Icon />
                </span>
                <span className="min-w-0">
                  <span className={cx("block text-sm font-bold", !b.earned && "text-muted")}>{b.name}</span>
                  <span className="block text-xs text-muted">{b.hint}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl bg-white p-4 text-sm shadow-soft">
        <h2 className="font-display text-lg font-extrabold">How XP works</h2>
        <ul className="grid gap-1 text-muted">
          <li>Update a dog&apos;s last-seen spot: +{XP.spot} (and +{XP.freshIntel} if nobody had seen them for 6 hours)</li>
          <li>Check in with a dog within 25 m: +{XP.checkin}, once a day per dog</li>
          <li>Daily streak bonus: +{XP.streakPerDay} per day in a row, up to {XP.streakCap}</li>
        </ul>
        <p className="text-xs text-muted">Progress is saved on this phone only. Nothing is ranked or shared.</p>
      </section>
    </div>
  );
}
