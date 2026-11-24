import type { Temperament } from "@/config/site";

export type DogStatus = "active" | "missing" | "rehomed" | "memorial";
export type Sex = "male" | "female" | "unknown";

export interface DogHealth {
  vaccinated?: boolean;
  sterilized?: boolean;
  /** ISO date, e.g. "2026-08-14" */
  lastVetVisit?: string;
  notes?: string;
}

export interface FeedingSlot {
  time: string;
  place?: string;
  by?: string;
}

export interface Caretaker {
  name: string;
  contact?: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

/** A dog as the app sees it. */
export interface Dog {
  id: number;
  slug: string;
  name: string;
  breed: string;
  sex: Sex;
  age: string | null;
  description: string;
  temperament: Temperament[];
  hangouts: string[];
  health: DogHealth;
  feeding: FeedingSlot[];
  caretakers: Caretaker[];
  status: DogStatus;
  hideInNavigate: boolean;
  /** First photo, used as the cover */
  cover: string | null;
  photos: string[];
  home: LatLng;
  /** Where to draw the dog: last sighting, else home */
  position: LatLng;
  lastSeenAt: string | null;
}

export interface Sighting {
  id: string;
  dogId: number;
  lat: number;
  lng: number;
  note: string | null;
  createdAt: string;
}

export interface DogDetail extends Dog {
  sightings: Sighting[];
}
