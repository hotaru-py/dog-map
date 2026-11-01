"use client";

import { useState } from "react";
import type { Dog } from "@/types/dog";
import { fileToResizedDataUrl } from "@/lib/image";
import { Button, Dialog, Field, inputClass, TemperamentPicker } from "./ui";

/** Admin form covering every field on a Dog. Multi-value fields use one line per entry. */
export default function DogEditor({
  dog,
  onClose,
  onSave,
}: {
  dog: Dog;
  onClose: () => void;
  onSave: (dog: Dog) => Promise<void>;
}) {
  const [d, setD] = useState<Dog>(dog);
  const [photosText, setPhotosText] = useState(dog.photos.filter((p) => !p.startsWith("data:")).join("\n"));
  const [uploaded, setUploaded] = useState(dog.photos.filter((p) => p.startsWith("data:")));
  const [hangouts, setHangouts] = useState((dog.hangouts ?? []).join("\n"));
  const [feeding, setFeeding] = useState(
    (dog.feeding ?? []).map((f) => [f.time, f.place ?? "", f.by ?? ""].join(" | ")).join("\n")
  );
  const [caretakers, setCaretakers] = useState(
    (dog.caretakers ?? []).map((c) => [c.name, c.contact ?? ""].join(" | ")).join("\n")
  );
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Dog>(key: K, value: Dog[K]) => setD((prev) => ({ ...prev, [key]: value }));
  const setHealth = (patch: Partial<NonNullable<Dog["health"]>>) =>
    setD((prev) => ({ ...prev, health: { ...prev.health, ...patch } }));

  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  const cells = (line: string) => line.split("|").map((c) => c.trim());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await onSave({
      ...d,
      name: d.name.trim(),
      photos: [...lines(photosText), ...uploaded],
      hangouts: lines(hangouts),
      feeding: lines(feeding).map((l) => {
        const [time, place, by] = cells(l);
        return { time, place: place || undefined, by: by || undefined };
      }),
      caretakers: lines(caretakers).map((l) => {
        const [name, contact] = cells(l);
        return { name, contact: contact || undefined };
      }),
    });
    setBusy(false);
  };

  return (
    <Dialog title={dog.id ? `Edit ${dog.name}` : "New dog"} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Name *">
            <input required value={d.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Breed">
            <input value={d.breed} onChange={(e) => set("breed", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Gender">
            <select value={d.gender ?? "unknown"} onChange={(e) => set("gender", e.target.value as Dog["gender"])} className={inputClass}>
              <option value="unknown">Unknown</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Age">
            <input value={d.age ?? ""} onChange={(e) => set("age", e.target.value || undefined)} className={inputClass} placeholder="~3 years" />
          </Field>
        </div>

        <Field label="Description *">
          <textarea required rows={2} value={d.description} onChange={(e) => set("description", e.target.value)} className={inputClass} />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">Temperament</span>
          <TemperamentPicker value={d.temperament ?? []} onChange={(v) => set("temperament", v)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude *">
            <input
              required
              type="number"
              step="any"
              value={d.location.lat}
              onChange={(e) => set("location", { ...d.location, lat: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
          <Field label="Longitude *">
            <input
              required
              type="number"
              step="any"
              value={d.location.lng}
              onChange={(e) => set("location", { ...d.location, lng: Number(e.target.value) })}
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Photo URLs" hint="One per line. The first photo is used for the map pin.">
          <textarea rows={2} value={photosText} onChange={(e) => setPhotosText(e.target.value)} className={inputClass} />
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {uploaded.map((src, i) => (
            <button
              key={i}
              type="button"
              title="Remove"
              onClick={() => setUploaded((u) => u.filter((_, j) => j !== i))}
              className="h-14 w-14 overflow-hidden rounded-lg ring-1 ring-stone-900/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          <label className="cursor-pointer rounded-lg border border-dashed border-stone-300 px-3 py-2 text-xs font-semibold text-stone-500 hover:border-orange-400">
            + Upload photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const url = await fileToResizedDataUrl(f);
                  setUploaded((u) => [...u, url]);
                }
              }}
            />
          </label>
        </div>

        <fieldset className="rounded-2xl bg-stone-900/5 p-3 dark:bg-white/5">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-stone-500">Health</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={d.health?.vaccinated ?? false} onChange={(e) => setHealth({ vaccinated: e.target.checked })} />
              Vaccinated
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={d.health?.sterilized ?? false} onChange={(e) => setHealth({ sterilized: e.target.checked })} />
              Sterilised
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Last vet visit">
              <input
                type="date"
                value={d.health?.lastVetVisit ?? ""}
                onChange={(e) => setHealth({ lastVetVisit: e.target.value || undefined })}
                className={inputClass}
              />
            </Field>
            <Field label="Notes">
              <input value={d.health?.notes ?? ""} onChange={(e) => setHealth({ notes: e.target.value || undefined })} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Hangouts" hint="One spot per line">
            <textarea rows={3} value={hangouts} onChange={(e) => setHangouts(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Feeding" hint="time | place | by">
            <textarea rows={3} value={feeding} onChange={(e) => setFeeding(e.target.value)} className={inputClass} placeholder="8:00 AM | Canteen | Volunteers" />
          </Field>
          <Field label="Caretakers" hint="name | contact">
            <textarea rows={3} value={caretakers} onChange={(e) => setCaretakers(e.target.value)} className={inputClass} placeholder="Priya | +91 98…" />
          </Field>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save dog"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
