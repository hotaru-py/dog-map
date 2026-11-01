"use client";

import { useEffect } from "react";
import { TEMPERAMENTS } from "@/config/site";
import type { Temperament } from "@/types/dog";

export function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`animate-sheet flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-stone-900 sm:rounded-3xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-md"
        }`}
      >
        <div className="flex items-center justify-between border-b border-stone-900/5 px-5 py-4 dark:border-white/5">
          <h2 className="text-lg font-bold text-stone-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-stone-500 transition hover:bg-stone-900/5 dark:hover:bg-white/10"
          >
            <Icon d="M18 6 6 18M6 6l12 12" />
          </button>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

export function Icon({ d, className = "h-5 w-5" }: { d: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export const inputClass =
  "w-full rounded-xl border border-stone-900/10 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-stone-600 dark:text-stone-300">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const styles = {
    primary:
      "bg-orange-500 text-white shadow-md shadow-orange-500/30 hover:bg-orange-600",
    secondary:
      "border border-stone-900/10 bg-white/60 text-stone-800 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-stone-100 dark:hover:bg-white/10",
    ghost: "text-stone-600 hover:bg-stone-900/5 dark:text-stone-300 dark:hover:bg-white/10",
    danger: "bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400",
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}

const TONE: Record<string, string> = {
  good: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  info: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  warn: "bg-amber-500/20 text-amber-800 dark:text-amber-300",
};

export function TemperamentBadge({ value }: { value: Temperament }) {
  const t = TEMPERAMENTS[value];
  if (!t) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE[t.tone]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {t.label}
    </span>
  );
}

export function TemperamentPicker({
  value,
  onChange,
}: {
  value: Temperament[];
  onChange: (v: Temperament[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(TEMPERAMENTS) as Temperament[]).map((key) => {
        const on = value.includes(key);
        const t = TEMPERAMENTS[key];
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== key) : [...value, key])}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              on
                ? TONE[t.tone] + " ring-1 ring-current"
                : "bg-stone-900/5 text-stone-500 hover:bg-stone-900/10 dark:bg-white/5 dark:text-stone-400"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="animate-sheet pointer-events-none fixed inset-x-0 bottom-6 z-[3000] flex justify-center px-4">
      <div className="rounded-full bg-stone-900/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur">
        {message}
      </div>
    </div>
  );
}
