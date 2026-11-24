"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { levelInfo, useProgress } from "@/lib/progress";
import { cx } from "../ui";
import { BookIcon, CubeIcon, EyeIcon, Logo, MapIcon, MenuIcon, UserIcon } from "../icons";
import { useApp } from "./AppProvider";
import { requestCompass } from "../navigate/useHeading";

const TABS = [
  { href: "/", label: "Map", Icon: MapIcon },
  { href: "/pack", label: "Pack", Icon: BookIcon },
  { href: "/me", label: "Me", Icon: UserIcon },
];

/** Bottom tab bar on phones; left rail on tablets and desktop. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { open, setNavigate, startLocation } = useApp();
  const progress = useProgress();
  const lvl = levelInfo(progress.xp);
  const isMap = path === "/";

  const startNavigate = async () => {
    await requestCompass();
    startLocation();
    setNavigate(true);
  };

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Desktop / tablet rail */}
      <nav className="z-30 hidden w-[76px] shrink-0 flex-col items-center gap-1.5 border-r border-line bg-white py-4 md:flex" aria-label="Main">
        <Link href="/" className="mb-3" aria-label={site.name}>
          <Logo className="h-10 w-11" />
        </Link>
        {TABS.map(({ href, label, Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={cx(
                "grid h-12 w-12 place-items-center rounded-2xl transition",
                active ? "bg-soft text-blaze" : "text-muted hover:bg-mist hover:text-ink"
              )}
            >
              <Icon />
              <span className="sr-only">{label}</span>
            </Link>
          );
        })}
        <button onClick={startNavigate} title="Navigate to dogs" className="grid h-12 w-12 place-items-center rounded-2xl text-muted hover:bg-mist hover:text-ink">
          <CubeIcon />
          <span className="sr-only">Navigate to dogs</span>
        </button>
        <button
          onClick={() => open({ kind: "spot" })}
          title="Update a dog's last-seen spot"
          className="mt-2 grid h-12 w-12 place-items-center rounded-full bg-blaze text-white shadow-soft hover:bg-blaze-2"
        >
          <EyeIcon />
          <span className="sr-only">Spot a dog</span>
        </button>
        <div className="flex-1" />
        <button onClick={() => open({ kind: "menu" })} title="Menu" className="grid h-12 w-12 place-items-center rounded-2xl text-muted hover:bg-mist hover:text-ink">
          <MenuIcon />
          <span className="sr-only">Menu</span>
        </button>
        <Link href="/pack" title={`Level ${lvl.level} · ${lvl.title}`} className="mt-1">
          <LevelRing xp={progress.xp} />
        </Link>
      </nav>

      <main className={cx("relative min-w-0 flex-1", isMap ? "overflow-hidden" : "overflow-y-auto pb-28 md:pb-0")}>{children}</main>

      {/* Phone tab bar */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white shadow-up md:hidden"
        aria-label="Main"
      >
        {TABS.slice(0, 2).map((t) => (
          <Tab key={t.href} {...t} active={path === t.href} />
        ))}
        <div className="grid place-items-center">
          <button
            onClick={() => open({ kind: "spot" })}
            aria-label="Spot a dog"
            className="-mt-6 grid h-[60px] w-[60px] place-items-center rounded-full bg-blaze text-white shadow-card ring-[5px] ring-white active:scale-95"
          >
            <EyeIcon className="h-6 w-6" />
          </button>
        </div>
        <button onClick={startNavigate} className="grid h-[64px] place-content-center justify-items-center gap-1 text-[11px] font-semibold text-muted">
          <CubeIcon className="h-5 w-5" />
          3D
        </button>
        {TABS.slice(2).map((t) => (
          <Tab key={t.href} {...t} active={path === t.href} />
        ))}
      </nav>
    </div>
  );
}

function Tab({ href, label, Icon, active }: { href: string; label: string; Icon: (p: { className?: string }) => React.ReactNode; active: boolean }) {
  return (
    <Link href={href} className={cx("grid h-[64px] place-content-center justify-items-center gap-1 text-[11px] font-semibold", active ? "text-blaze" : "text-muted")}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}

export function LevelRing({ xp, size = 40 }: { xp: number; size?: number }) {
  const { level, progress } = levelInfo(xp);
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-full font-bold text-ink"
      style={{ width: size, height: size, background: `conic-gradient(var(--color-blaze) ${progress * 360}deg, var(--color-soft) 0)` }}
    >
      <span className="absolute inset-[4px] rounded-full bg-white" />
      <span className="relative text-[13px]">{level}</span>
    </span>
  );
}
