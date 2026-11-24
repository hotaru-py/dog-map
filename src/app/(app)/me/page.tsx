"use client";

import { useApp } from "@/components/app/AppProvider";
import { LevelRing } from "@/components/app/AppShell";
import { Button } from "@/components/ui";
import { CubeIcon, ExternalIcon, Logo, ShieldIcon, TargetIcon } from "@/components/icons";
import { requestCompass } from "@/components/navigate/useHeading";
import { site } from "@/config/site";
import { levelInfo, useProgress } from "@/lib/progress";

export default function MePage() {
  const { geoStatus, startLocation, stopLocation, setNavigate } = useApp();
  const p = useProgress();
  const lvl = levelInfo(p.xp);

  const navigate = async () => {
    await requestCompass();
    startLocation();
    setNavigate(true);
  };

  return (
    <div className="mx-auto grid max-w-2xl gap-5 px-4 pb-10 pt-[calc(20px+env(safe-area-inset-top,0px))] md:px-8 md:pt-10">
      <div className="flex items-center gap-4">
        <LevelRing xp={p.xp} size={56} />
        <div>
          <h1 className="font-display text-3xl font-extrabold">
            Level {lvl.level} · {lvl.title}
          </h1>
          <p className="text-sm text-muted">
            {p.xp.toLocaleString()} XP · {Object.keys(p.met).length} dogs met · {p.counts.spots} updates
          </p>
        </div>
      </div>

      <Card title="Location">
        <p className="text-sm text-muted">
          Used to show how far dogs are, check in, and update last-seen spots. It stays on your phone until you submit an update.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">
            {geoStatus === "on" ? "On" : geoStatus === "locating" ? "Finding you…" : geoStatus === "denied" ? "Blocked in browser settings" : "Off"}
          </span>
          <span className="flex-1" />
          {geoStatus === "on" || geoStatus === "locating" ? (
            <Button size="sm" variant="secondary" onClick={stopLocation}>
              Turn off
            </Button>
          ) : (
            <Button size="sm" variant="pine" onClick={startLocation}>
              <TargetIcon className="h-4 w-4" /> Turn on
            </Button>
          )}
        </div>
      </Card>

      <Card title="Navigate to dogs">
        <p className="text-sm text-muted">A 3D view that turns with you and shows each dog floating over its last-seen spot.</p>
        <Button variant="soft" onClick={navigate} className="justify-self-start">
          <CubeIcon className="h-4 w-4" /> Start
        </Button>
      </Card>

      <section className="grid gap-3 rounded-[22px] bg-pine p-5 text-mist">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-12" />
          <h2 className="font-display text-xl font-extrabold">About {site.name}</h2>
        </div>
        <p className="text-sm text-mist/85">
          A map of the dogs living on campus, kept fresh by students. Anyone can update where a dog was last seen, and check in with dogs they meet to fill
          their Pack Book.
        </p>
        <p className="flex items-start gap-2 text-sm text-mist/85">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0" />
          No sign-in. Your progress is saved on this phone. Nobody can see where you are, and updates never show who made them.
        </p>
        <p className="border-t border-white/15 pt-3 text-sm">
          <span className="text-mist/70">Developed by </span>
          <a href={site.credit.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold hover:underline">
            {site.credit.name}
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
        </p>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 rounded-[22px] bg-white p-5 shadow-soft">
      <h2 className="font-display text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
