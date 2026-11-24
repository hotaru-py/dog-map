"use client";

import Link from "next/link";
import { useEffect } from "react";
import { site } from "@/config/site";
import { cx } from "../ui";
import { BookIcon, CubeIcon, ExternalIcon, Logo, MapIcon, SlidersIcon } from "../icons";
import { useApp } from "./AppProvider";
import { requestCompass } from "../navigate/useHeading";

/** Side menu: Navigate to dogs switch, shortcuts and the credit line. */
export default function MenuDrawer() {
  const { close, navigate, setNavigate, startLocation } = useApp();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const toggleNavigate = async () => {
    if (navigate.on) {
      setNavigate(false);
      return;
    }
    // iOS only shows the compass permission prompt from a tap, so ask here.
    await requestCompass();
    startLocation();
    setNavigate(true);
  };

  const Item = ({ href, Icon, children }: { href: string; Icon: (p: { className?: string }) => React.ReactNode; children: React.ReactNode }) => (
    <Link href={href} onClick={close} className="flex items-center gap-3.5 rounded-xl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-mist">
      <Icon />
      {children}
    </Link>
  );

  return (
    <div className="anim-fade fixed inset-0 z-[70] bg-ink/45" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <aside
        role="dialog"
        aria-label="Menu"
        className="flex h-full w-[86%] max-w-[330px] flex-col gap-1 overflow-y-auto bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-[calc(18px+env(safe-area-inset-top,0px))] shadow-card"
      >
        <div className="mb-3 flex items-center gap-3 px-2">
          <Logo className="h-10 w-11" />
          <span className="font-display text-lg font-extrabold leading-[1.05]">
            SNUC Dog
            <br />
            Tracker
          </span>
        </div>

        <div className="mb-2 grid gap-2 rounded-card bg-pine p-4 text-mist">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[15px] font-bold">
              <CubeIcon />
              Navigate to dogs
            </span>
            <button
              role="switch"
              aria-checked={navigate.on}
              onClick={toggleNavigate}
              className={cx("relative h-7 w-12 shrink-0 rounded-full transition", navigate.on ? "bg-blaze" : "bg-white/25")}
            >
              <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-white transition-all", navigate.on ? "left-6" : "left-1")} />
              <span className="sr-only">Navigate to dogs</span>
            </button>
          </div>
          <p className="text-[13px] leading-snug text-mist/80">
            Switches the map to a 3D view that turns with you and points toward each dog&apos;s last-seen spot.
          </p>
        </div>

        <Item href="/" Icon={MapIcon}>Map</Item>
        <Item href="/pack" Icon={BookIcon}>Pack Book &amp; badges</Item>
        <Item href="/me" Icon={SlidersIcon}>Settings &amp; about</Item>

        <div className="mt-auto border-t border-line px-3 pt-4 text-[13px]">
          <span className="text-muted">Developed by </span>
          <a href={site.credit.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-ink hover:underline">
            {site.credit.name}
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    </div>
  );
}
