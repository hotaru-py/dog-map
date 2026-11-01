import seedDogs from "@/data/dogs.json";
import type {
  CommunityPhoto,
  Dog,
  DogSubmission,
  Report,
  Sighting,
} from "@/types/dog";
import { newId, readJson, writeJson } from "@/lib/storage";
import type { DataSource } from "./types";

/**
 * No-backend mode. Dogs come from src/data/dogs.json; anything written
 * (likes, photos, reports, submissions, admin edits) is kept in this browser's
 * localStorage. The admin page can export the edited dog list as dogs.json.
 */

const KEYS = {
  dogs: "local:dogs",
  sightings: "local:sightings",
  likes: "local:likes",
  photos: "local:photos",
  reports: "local:reports",
  submissions: "local:submissions",
};

const now = () => new Date().toISOString();

function getDogsSync(): Dog[] {
  return readJson<Dog[] | null>(KEYS.dogs, null) ?? (seedDogs as Dog[]);
}

function update<T>(key: string, fallback: T, fn: (value: T) => T): T {
  const next = fn(readJson<T>(key, fallback));
  writeJson(key, next);
  return next;
}

export const localSource: DataSource = {
  mode: "local",

  async getDogs() {
    return getDogsSync();
  },

  async getSightings(sinceIso) {
    return readJson<Sighting[]>(KEYS.sightings, []).filter((s) => s.at >= sinceIso);
  },

  async addSighting(input) {
    const sighting: Sighting = { ...input, id: newId(), at: now() };
    update<Sighting[]>(KEYS.sightings, [], (list) => [...list, sighting].slice(-500));
    return sighting;
  },

  async getLikes() {
    return readJson<Record<number, number>>(KEYS.likes, {});
  },

  async like(dogId, delta) {
    const likes = update<Record<number, number>>(KEYS.likes, {}, (l) => ({
      ...l,
      [dogId]: Math.max(0, (l[dogId] ?? 0) + delta),
    }));
    return likes[dogId];
  },

  async getPhotos(dogId) {
    return readJson<CommunityPhoto[]>(KEYS.photos, []).filter((p) => p.dogId === dogId);
  },

  async addPhoto(input) {
    const photo: CommunityPhoto = { ...input, id: newId(), at: now() };
    update<CommunityPhoto[]>(KEYS.photos, [], (list) => [photo, ...list]);
    return photo;
  },

  async addReport(input) {
    const report: Report = { ...input, id: newId(), at: now(), status: "open" };
    update<Report[]>(KEYS.reports, [], (list) => [report, ...list]);
    return report;
  },

  async submitDog(input) {
    const submission: DogSubmission = {
      ...input,
      id: newId(),
      at: now(),
      status: "pending",
    };
    update<DogSubmission[]>(KEYS.submissions, [], (list) => [submission, ...list]);
    return submission;
  },

  admin: {
    async verify() {
      return true;
    },

    async listSubmissions() {
      return readJson<DogSubmission[]>(KEYS.submissions, []);
    },

    async reviewSubmission(_token, id, status) {
      const submissions = update<DogSubmission[]>(KEYS.submissions, [], (list) =>
        list.map((s) => (s.id === id ? { ...s, status } : s))
      );
      const submission = submissions.find((s) => s.id === id);
      if (status === "approved" && submission) {
        const dogs = getDogsSync();
        const id = Math.max(0, ...dogs.map((d) => d.id)) + 1;
        writeJson(KEYS.dogs, [...dogs, { ...submission.dog, id }]);
      }
    },

    async saveDog(_token, input) {
      const dogs = getDogsSync();
      const dog = input.id ? input : { ...input, id: Math.max(0, ...dogs.map((d) => d.id)) + 1 };
      const exists = dogs.some((d) => d.id === dog.id);
      writeJson(KEYS.dogs, exists ? dogs.map((d) => (d.id === dog.id ? dog : d)) : [...dogs, dog]);
      return dog;
    },

    async deleteDog(_token, id) {
      writeJson(KEYS.dogs, getDogsSync().filter((d) => d.id !== id));
    },

    async listReports() {
      return readJson<Report[]>(KEYS.reports, []);
    },

    async setReportStatus(_token, id, status) {
      update<Report[]>(KEYS.reports, [], (list) =>
        list.map((r) => (r.id === id ? { ...r, status } : r))
      );
    },

    async listAllPhotos() {
      return readJson<CommunityPhoto[]>(KEYS.photos, []);
    },

    async deletePhoto(_token, id) {
      update<CommunityPhoto[]>(KEYS.photos, [], (list) => list.filter((p) => p.id !== id));
    },
  },
};

/** Throw away local edits and go back to src/data/dogs.json. */
export function resetLocalDogs() {
  if (typeof window !== "undefined") window.localStorage.removeItem("dogmap:" + KEYS.dogs);
}
