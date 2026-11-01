"use client";

import { useState } from "react";
import type { Dog, Temperament } from "@/types/dog";
import { data } from "@/lib/data";
import { fileToResizedDataUrl } from "@/lib/image";
import { getCurrentPosition } from "@/hooks/useGeolocation";
import type { LatLng } from "@/lib/geo";
import { Button, Dialog, Field, inputClass, TemperamentPicker } from "./ui";
import { PinIcon } from "./icons";

const MAX_PHOTOS = 3;

export default function AddDogForm({
  defaultLocation,
  onClose,
  onDone,
}: {
  defaultLocation: LatLng;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [description, setDescription] = useState("");
  const [gender, setGender] = useState<NonNullable<Dog["gender"]>>("unknown");
  const [age, setAge] = useState("");
  const [temperament, setTemperament] = useState<Temperament[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [location, setLocation] = useState<LatLng>(defaultLocation);
  const [locationLabel, setLocationLabel] = useState("Current map area");
  const [submittedBy, setSubmittedBy] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    try {
      const picked = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
      const urls = await Promise.all(picked.map((f) => fileToResizedDataUrl(f)));
      setPhotos((p) => [...p, ...urls]);
    } catch {
      setError("Couldn't read that image");
    }
  };

  const useMyLocation = async () => {
    try {
      setLocation(await getCurrentPosition());
      setLocationLabel("Your current location");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't get your location");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError("Add at least one photo so people can recognise the dog");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await data.submitDog({
        dog: {
          name: name.trim(),
          breed: breed.trim() || "Indie",
          description: description.trim(),
          gender,
          age: age.trim() || undefined,
          temperament,
          photos,
          location,
        },
        submittedBy: submittedBy.trim() || undefined,
      });
      onDone(`Thanks! ${name.trim()} will appear once a moderator approves.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit right now");
      setBusy(false);
    }
  };

  return (
    <Dialog title="Add a dog" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name *">
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Biscuit" />
          </Field>
          <Field label="Breed">
            <input value={breed} onChange={(e) => setBreed(e.target.value)} className={inputClass} placeholder="Indie" />
          </Field>
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className={inputClass}>
              <option value="unknown">Not sure</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
          </Field>
          <Field label="Age (rough)">
            <input value={age} onChange={(e) => setAge(e.target.value)} className={inputClass} placeholder="~2 years" />
          </Field>
        </div>

        <Field label="About *">
          <textarea
            required
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
            placeholder="Where they hang out, what they're like…"
          />
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">Temperament</span>
          <TemperamentPicker value={temperament} onChange={setTemperament} />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-stone-600 dark:text-stone-300">
            Photos * ({photos.length}/{MAX_PHOTOS})
          </span>
          <div className="flex gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-xs text-white"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-stone-300 text-2xl text-stone-400 transition hover:border-orange-400 hover:text-orange-500 dark:border-stone-700">
                +
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-900/5 px-3 py-2.5 dark:bg-white/5">
          <div className="min-w-0 text-xs">
            <p className="inline-flex items-center gap-1.5 font-semibold text-stone-700 dark:text-stone-200">
              <PinIcon className="h-3.5 w-3.5 text-stone-400" />
              {locationLabel}
            </p>
            <p className="text-stone-500">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
          </div>
          <Button variant="secondary" className="shrink-0 !px-3 !py-1.5 text-xs" onClick={useMyLocation}>
            Use my location
          </Button>
        </div>

        <Field label="Your name (optional)">
          <input value={submittedBy} onChange={(e) => setSubmittedBy(e.target.value)} className={inputClass} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Submitting…" : "Submit for review"}
        </Button>
      </form>
    </Dialog>
  );
}
