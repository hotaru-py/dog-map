"use client";

import { useEffect, useRef, useState } from "react";
import { freshnessOf, TEMPERAMENTS, type Freshness, type Temperament } from "@/config/site";
import { timeAgo } from "@/lib/geo";
import type { Dog } from "@/types/dog";
import { DogGlyph, XIcon } from "./icons";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "pine" | "ghost" | "danger" | "soft";

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-12 px-6 text-base",
        variant === "primary" && "bg-blaze text-white shadow-soft hover:bg-blaze-2",
        variant === "pine" && "bg-pine text-mist shadow-soft hover:bg-pine-2",
        variant === "secondary" && "border border-line bg-white text-ink shadow-soft hover:bg-mist",
        variant === "soft" && "bg-soft text-ink hover:bg-lichen/60",
        variant === "ghost" && "text-ink hover:bg-soft",
        variant === "danger" && "bg-bad/10 text-bad hover:bg-bad/15",
        className
      )}
      {...props}
    />
  );
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({
  title,
  onClose,
  children,
  footer,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="anim-fade fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "anim-sheet flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-card outline-none sm:rounded-[24px]",
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        )}
      >
        <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="font-display text-xl font-extrabold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full bg-soft text-ink hover:bg-line">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer && <div className="safe-bottom border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function DogAvatar({ dog, className = "h-11 w-11", dim }: { dog: Pick<Dog, "cover" | "name">; className?: string; dim?: boolean }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [dog.cover]);
  return (
    <span className={cx("grid shrink-0 place-items-center overflow-hidden rounded-full bg-soft text-muted", dim && "opacity-75", className)}>
      {dog.cover && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dog.cover} alt="" className="h-full w-full object-cover" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <DogGlyph className="h-[70%] w-[70%]" />
      )}
    </span>
  );
}

/** Photo that falls back to a placeholder if the file is missing. */
export function DogPhoto({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (!src || broken) {
    return (
      <div className={cx("grid place-items-center bg-gradient-to-br from-lichen to-pine-2 text-white", className)}>
        <DogGlyph className="h-28 w-28 drop-shadow" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cx("object-cover", className)} onError={() => setBroken(true)} />;
}

const FRESH_DOT: Record<Freshness, string> = {
  fresh: "bg-ok",
  recent: "bg-warn",
  stale: "bg-stale",
  unknown: "bg-stale",
};

export function FreshDot({ iso, className }: { iso: string | null; className?: string }) {
  return <span className={cx("inline-block h-2 w-2 shrink-0 rounded-full", FRESH_DOT[freshnessOf(iso)], className)} />;
}

export function seenText(iso: string | null) {
  return iso ? `Seen ${timeAgo(iso)}` : "No recent sightings";
}

/** Re-renders every 30 s so "12 min ago" labels stay current. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

const TONE = {
  good: "bg-ok/12 text-ok",
  info: "bg-locate/10 text-locate",
  warn: "bg-warn/15 text-[#8a5c00]",
};

export function TemperamentTag({ value }: { value: Temperament }) {
  const t = TEMPERAMENTS[value];
  if (!t) return null;
  return (
    <span className={cx("inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold", TONE[t.tone])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {t.label}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink outline-none transition placeholder:text-stale focus:border-pine focus:ring-2 focus:ring-pine/15";

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-r-transparent", className)} />;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="grid justify-items-center gap-2 rounded-card border border-dashed border-line bg-white/60 px-6 py-10 text-center">
      <DogGlyph className="h-10 w-10 text-stale" face={false} />
      <p className="font-display text-lg font-extrabold">{title}</p>
      {children && <div className="max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
