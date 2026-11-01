import type {
  CommunityPhoto,
  Dog,
  DogSubmission,
  Report,
  Sighting,
} from "@/types/dog";

export type NewSighting = Omit<Sighting, "id" | "at">;
export type NewPhoto = Omit<CommunityPhoto, "id" | "at">;
export type NewReport = Omit<Report, "id" | "at" | "status">;
export type NewSubmission = Pick<DogSubmission, "dog" | "submittedBy">;

/**
 * Everything the app needs from "a backend". There are two implementations:
 *  - local: no server, seeded from src/data/dogs.json, writes saved in this browser
 *  - http:  any server that implements docs/API.md (a reference one ships in src/app/api)
 * Pick one with NEXT_PUBLIC_API_URL (see src/lib/data/index.ts).
 */
export interface DataSource {
  readonly mode: "local" | "remote";

  // Public
  getDogs(): Promise<Dog[]>;
  getSightings(sinceIso: string): Promise<Sighting[]>;
  addSighting(input: NewSighting): Promise<Sighting>;
  getLikes(): Promise<Record<number, number>>;
  like(dogId: number, delta: 1 | -1): Promise<number>;
  getPhotos(dogId: number): Promise<CommunityPhoto[]>;
  addPhoto(input: NewPhoto): Promise<CommunityPhoto>;
  addReport(input: NewReport): Promise<Report>;
  submitDog(input: NewSubmission): Promise<DogSubmission>;

  // Admin (token is ignored in local mode)
  admin: {
    verify(token: string): Promise<boolean>;
    listSubmissions(token: string): Promise<DogSubmission[]>;
    reviewSubmission(token: string, id: string, status: "approved" | "rejected"): Promise<void>;
    saveDog(token: string, dog: Dog): Promise<Dog>;
    deleteDog(token: string, id: number): Promise<void>;
    listReports(token: string): Promise<Report[]>;
    setReportStatus(token: string, id: string, status: Report["status"]): Promise<void>;
    listAllPhotos(token: string): Promise<CommunityPhoto[]>;
    deletePhoto(token: string, id: string): Promise<void>;
  };
}
