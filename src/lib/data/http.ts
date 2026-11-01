import type {
  CommunityPhoto,
  Dog,
  DogSubmission,
  Report,
  Sighting,
} from "@/types/dog";
import type { DataSource } from "./types";

/**
 * Talks to any backend implementing docs/API.md.
 * The reference implementation lives in src/app/api/[...path]/route.ts.
 */
export function createHttpSource(baseUrl: string): DataSource {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(
    path: string,
    init: RequestInit & { token?: string } = {}
  ): Promise<T> {
    const { token, headers, ...rest } = init;
    const res = await fetch(base + path, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? `Request failed (${res.status})`);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  const send = <T>(method: string, path: string, body?: unknown, token?: string) =>
    request<T>(path, {
      method,
      token,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    mode: "remote",

    getDogs: () => request<Dog[]>("/dogs"),
    getSightings: (since) =>
      request<Sighting[]>(`/sightings?since=${encodeURIComponent(since)}`),
    addSighting: (input) => send<Sighting>("POST", "/sightings", input),
    getLikes: () => request<Record<number, number>>("/likes"),
    like: async (dogId, delta) =>
      (await send<{ count: number }>("POST", `/dogs/${dogId}/like`, { delta })).count,
    getPhotos: (dogId) => request<CommunityPhoto[]>(`/photos?dogId=${dogId}`),
    addPhoto: (input) => send<CommunityPhoto>("POST", "/photos", input),
    addReport: (input) => send<Report>("POST", "/reports", input),
    submitDog: (input) => send<DogSubmission>("POST", "/submissions", input),

    admin: {
      verify: async (token) => {
        try {
          await request("/admin/verify", { token });
          return true;
        } catch {
          return false;
        }
      },
      listSubmissions: (token) => request<DogSubmission[]>("/submissions", { token }),
      reviewSubmission: (token, id, status) =>
        send("PATCH", `/submissions/${id}`, { status }, token),
      saveDog: (token, dog) =>
        send<Dog>(dog.id ? "PUT" : "POST", dog.id ? `/dogs/${dog.id}` : "/dogs", dog, token),
      deleteDog: (token, id) => send("DELETE", `/dogs/${id}`, undefined, token),
      listReports: (token) => request<Report[]>("/reports", { token }),
      setReportStatus: (token, id, status) =>
        send("PATCH", `/reports/${id}`, { status }, token),
      listAllPhotos: (token) => request<CommunityPhoto[]>("/photos", { token }),
      deletePhoto: (token, id) => send("DELETE", `/photos/${id}`, undefined, token),
    },
  };
}
