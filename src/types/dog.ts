export type Temperament =
  | "friendly"
  | "playful"
  | "calm"
  | "shy"
  | "protective"
  | "approach-slowly"
  | "dont-feed";

export interface DogHealth {
  vaccinated?: boolean;
  sterilized?: boolean;
  /** ISO date, e.g. "2026-08-14" */
  lastVetVisit?: string;
  notes?: string;
}

export interface Caretaker {
  name: string;
  contact?: string;
}

export interface FeedingSlot {
  /** Free text, e.g. "8:00 AM" */
  time: string;
  place?: string;
  by?: string;
}

export interface Dog {
  id: number;
  name: string;
  breed: string;
  /** Home / usual location. Shown when there are no recent sightings. */
  location: {
    lat: number;
    lng: number;
  };
  photos: string[];
  description: string;
  gender?: "male" | "female" | "unknown";
  /** Free text, e.g. "~3 years" */
  age?: string;
  temperament?: Temperament[];
  health?: DogHealth;
  caretakers?: Caretaker[];
  feeding?: FeedingSlot[];
  /** Names of usual spots, e.g. ["Main canteen", "Library steps"] */
  hangouts?: string[];
}

export interface Sighting {
  id: string;
  dogId: number;
  lat: number;
  lng: number;
  /** ISO timestamp */
  at: string;
  note?: string;
}

export interface CommunityPhoto {
  id: string;
  dogId: number;
  /** URL or data URL */
  url: string;
  caption?: string;
  /** ISO timestamp */
  at: string;
}

export type ReportKind = "injured" | "sick" | "aggressive" | "missing" | "other";

export interface Report {
  id: string;
  dogId: number | null;
  kind: ReportKind;
  message: string;
  contact?: string;
  lat?: number;
  lng?: number;
  /** ISO timestamp */
  at: string;
  status: "open" | "resolved";
}

/** A new dog proposed by a student, waiting for moderation. */
export interface DogSubmission {
  id: string;
  dog: Omit<Dog, "id">;
  submittedBy?: string;
  /** ISO timestamp */
  at: string;
  status: "pending" | "approved" | "rejected";
}

/** A named campus spot drawn on the map (src/data/landmarks.json). */
export interface Landmark {
  name: string;
  lat: number;
  lng: number;
}
