"use client";

import { useState } from "react";
import type { Dog, ReportKind } from "@/types/dog";
import { data } from "@/lib/data";
import { site } from "@/config/site";
import { getCurrentPosition } from "@/hooks/useGeolocation";
import type { LatLng } from "@/lib/geo";
import { Button, Dialog, Field, inputClass } from "./ui";
import { PinIcon } from "./icons";

const KINDS: { value: ReportKind; label: string }[] = [
  { value: "injured", label: "Injured" },
  { value: "sick", label: "Looks sick" },
  { value: "aggressive", label: "Aggressive" },
  { value: "missing", label: "Missing" },
  { value: "other", label: "Other" },
];

export default function ReportForm({
  dog,
  dogs,
  onClose,
  onDone,
}: {
  /** Pre-selected dog, if reporting from a dog's card */
  dog: Dog | null;
  dogs: Dog[];
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [dogId, setDogId] = useState<number | null>(dog?.id ?? null);
  const [kind, setKind] = useState<ReportKind>("injured");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [location, setLocation] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dogName = dogs.find((d) => d.id === dogId)?.name ?? "Unknown dog";

  const attachLocation = async () => {
    try {
      setLocation(await getCurrentPosition());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location");
    }
  };

  const mailtoHref = () => {
    const lines = [
      `Dog: ${dogName}`,
      `Issue: ${KINDS.find((k) => k.value === kind)?.label}`,
      "",
      message,
      "",
      location ? `Location: https://maps.google.com/?q=${location.lat},${location.lng}` : "",
      contact ? `Contact: ${contact}` : "",
    ];
    return `mailto:${site.welfareEmail}?subject=${encodeURIComponent(
      `[Dog Map] ${dogName}: ${kind}`
    )}&body=${encodeURIComponent(lines.filter(Boolean).join("\n"))}`;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await data.addReport({
        dogId,
        kind,
        message: message.trim(),
        contact: contact.trim() || undefined,
        lat: location?.lat,
        lng: location?.lng,
      });
      // Without a backend nobody else sees the report, so also hand it to email
      if (data.mode === "local" && site.welfareEmail) {
        window.location.href = mailtoHref();
      }
      onDone("Report sent. Thank you for looking out for them.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the report");
      setBusy(false);
    }
  };

  return (
    <Dialog title="Report a concern" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Which dog?">
          <select
            value={dogId ?? ""}
            onChange={(e) => setDogId(e.target.value ? Number(e.target.value) : null)}
            className={inputClass}
          >
            <option value="">Not on the map / not sure</option>
            {dogs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              aria-pressed={kind === k.value}
              onClick={() => setKind(k.value)}
              className={`rounded-xl px-2 py-2.5 text-xs font-semibold transition ${
                kind === k.value
                  ? "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/50 dark:text-orange-300"
                  : "bg-stone-900/5 text-stone-600 hover:bg-stone-900/10 dark:bg-white/5 dark:text-stone-300"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <Field label="What did you see? *">
          <textarea
            required
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={inputClass}
            placeholder="Limping near the hostel gate, around 5pm…"
          />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-900/5 px-3 py-2.5 text-xs dark:bg-white/5">
          <span className="inline-flex items-center gap-1.5 text-stone-600 dark:text-stone-300">
            <PinIcon className="h-3.5 w-3.5 text-stone-400" />
            {location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "No location attached"}
          </span>
          <Button variant="secondary" className="shrink-0 !px-3 !py-1.5 text-xs" onClick={attachLocation}>
            {location ? "Update" : "Attach my location"}
          </Button>
        </div>

        <Field label="Your contact (optional)" hint="So the welfare team can follow up">
          <input value={contact} onChange={(e) => setContact(e.target.value)} className={inputClass} placeholder="Phone or email" />
        </Field>

        {data.mode === "local" && !site.welfareEmail && (
          <p className="rounded-xl bg-amber-500/15 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            No welfare contact is configured yet, so this report is only saved on this device.
          </p>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Sending…" : data.mode === "local" && site.welfareEmail ? "Send by email" : "Send report"}
        </Button>
      </form>
    </Dialog>
  );
}
