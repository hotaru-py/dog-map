"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { CommunityPhoto, Dog, DogSubmission, Report } from "@/types/dog";
import { data } from "@/lib/data";
import { resetLocalDogs } from "@/lib/data/local";
import { site } from "@/config/site";
import { timeAgo } from "@/lib/geo";
import { Button, Field, inputClass, TemperamentBadge } from "@/components/ui";
import DogEditor from "@/components/DogEditor";
import { ArrowLeftIcon, Logo } from "@/components/icons";

type Tab = "submissions" | "reports" | "dogs" | "photos";
const TOKEN_KEY = "dogmap:admin-token";

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (data.mode === "local") setToken("local");
    else setToken(sessionStorage.getItem(TOKEN_KEY));
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (!token) return <Login onToken={setToken} />;
  return (
    <Dashboard
      token={token}
      onLogout={() => {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }}
    />
  );
}

function Login({ onToken }: { onToken: (t: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await data.admin.verify(value);
    setBusy(false);
    if (!ok) {
      setError("That token wasn't accepted");
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, value);
    onToken(value);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-stone-100 p-4 dark:bg-stone-950">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-xl dark:bg-stone-900">
        <div className="text-center">
          <Logo className="mx-auto mb-3 h-12 w-12" />
          <h1 className="text-xl font-bold text-stone-900 dark:text-white">{site.name} admin</h1>
          <p className="text-sm text-stone-500">Enter the admin token set on the server.</p>
        </div>
        <Field label="Admin token">
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} className={inputClass} autoFocus />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={busy || !value} className="w-full">
          {busy ? "Checking…" : "Sign in"}
        </Button>
        <Link href="/" className="flex items-center justify-center gap-1 text-xs text-stone-500 hover:underline">
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to map
        </Link>
      </form>
    </div>
  );
}

function Dashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("submissions");
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [submissions, setSubmissions] = useState<DogSubmission[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [editing, setEditing] = useState<Dog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, s, r, p] = await Promise.all([
        data.getDogs(),
        data.admin.listSubmissions(token),
        data.admin.listReports(token),
        data.admin.listAllPhotos(token),
      ]);
      setDogs(d);
      setSubmissions(s);
      setReports(r);
      setPhotos(p);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load admin data");
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return false;
    }
  };

  const exportDogs = () => {
    const blob = new Blob([JSON.stringify(dogs, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dogs.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const openReports = reports.filter((r) => r.status === "open");
  const dogName = (id: number | null) => dogs.find((d) => d.id === id)?.name ?? "Unknown dog";

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "submissions", label: "Submissions", count: pending.length },
    { key: "reports", label: "Reports", count: openReports.length },
    { key: "dogs", label: "Dogs", count: dogs.length },
    { key: "photos", label: "Photos", count: photos.length },
  ];

  return (
    <div className="min-h-dvh bg-stone-100 dark:bg-stone-950">
      <header className="sticky top-0 z-10 border-b border-stone-900/5 bg-white/80 backdrop-blur dark:border-white/5 dark:bg-stone-900/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Logo className="h-9 w-9 rounded-xl" />
          <h1 className="font-bold text-stone-900 dark:text-white">{site.name} admin</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              data.mode === "local" ? "bg-amber-500/20 text-amber-800 dark:text-amber-300" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {data.mode === "local" ? "Local mode" : "Connected to backend"}
          </span>
          <div className="ml-auto flex gap-2">
            <Link href="/" className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-900/5 dark:text-stone-300">
              View map
            </Link>
            {data.mode === "remote" && (
              <Button variant="ghost" onClick={onLogout}>
                Sign out
              </Button>
            )}
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-semibold transition ${
                tab === t.key ? "border-orange-500 text-stone-900 dark:text-white" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t.label}
              {!!t.count && (
                <span className="rounded-full bg-stone-900/10 px-1.5 text-[11px] dark:bg-white/10">{t.count}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4">
        {data.mode === "local" && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-amber-500/10 p-4 text-sm text-amber-900 ring-1 ring-amber-500/30 dark:text-amber-200">
            <p className="min-w-0 flex-1">
              <b>No backend connected.</b> Changes here are saved in this browser only. To publish them,
              export <code>dogs.json</code> and replace <code>src/data/dogs.json</code>, or connect a
              backend with <code>NEXT_PUBLIC_API_URL</code>.
            </p>
            <Button variant="secondary" onClick={exportDogs}>
              Export dogs.json
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Discard local dog edits and go back to src/data/dogs.json?")) {
                  resetLocalDogs();
                  load();
                }
              }}
            >
              Reset
            </Button>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700">{error}</p>}

        {tab === "submissions" && (
          <List empty="No submissions yet.">
            {submissions.map((s) => (
              <Card key={s.id} muted={s.status !== "pending"}>
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.dog.photos[0]} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-stone-900 dark:text-white">{s.dog.name}</p>
                      <span className="text-xs text-stone-500">{s.dog.breed}</span>
                      <StatusPill status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{s.dog.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.dog.temperament?.map((t) => <TemperamentBadge key={t} value={t} />)}
                    </div>
                    <p className="mt-2 text-xs text-stone-400">
                      {s.submittedBy ? `by ${s.submittedBy} · ` : ""}
                      {timeAgo(s.at)} · {s.dog.photos.length} photo(s) ·{" "}
                      <a
                        className="underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://maps.google.com/?q=${s.dog.location.lat},${s.dog.location.lng}`}
                      >
                        location
                      </a>
                    </p>
                  </div>
                </div>
                {s.status === "pending" && (
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="danger" onClick={() => run(() => data.admin.reviewSubmission(token, s.id, "rejected"))}>
                      Reject
                    </Button>
                    <Button onClick={() => run(() => data.admin.reviewSubmission(token, s.id, "approved"))}>Approve</Button>
                  </div>
                )}
              </Card>
            ))}
          </List>
        )}

        {tab === "reports" && (
          <List empty="No reports. Everyone seems to be doing well.">
            {reports.map((r) => (
              <Card key={r.id} muted={r.status === "resolved"}>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold capitalize text-stone-900 dark:text-white">{r.kind}</p>
                  <span className="text-sm text-stone-500">· {dogName(r.dogId)}</span>
                  <StatusPill status={r.status} />
                  <span className="ml-auto text-xs text-stone-400">{timeAgo(r.at)}</span>
                </div>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{r.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                  {r.contact && <span>Contact: {r.contact}</span>}
                  {r.lat != null && r.lng != null && (
                    <a className="underline" target="_blank" rel="noopener noreferrer" href={`https://maps.google.com/?q=${r.lat},${r.lng}`}>
                      Open location
                    </a>
                  )}
                  <Button
                    variant="secondary"
                    className="ml-auto !py-1.5 text-xs"
                    onClick={() => run(() => data.admin.setReportStatus(token, r.id, r.status === "open" ? "resolved" : "open"))}
                  >
                    {r.status === "open" ? "Mark resolved" : "Reopen"}
                  </Button>
                </div>
              </Card>
            ))}
          </List>
        )}

        {tab === "dogs" && (
          <>
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  setEditing({
                    id: 0,
                    name: "",
                    breed: "Indie",
                    description: "",
                    photos: [],
                    location: { lat: site.map.center[0], lng: site.map.center[1] },
                  })
                }
              >
                + New dog
              </Button>
            </div>
            <List empty="No dogs yet.">
              {dogs.map((d) => (
                <Card key={d.id}>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={d.photos[0]} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-stone-900 dark:text-white">
                        {d.name} <span className="text-xs font-normal text-stone-400">#{d.id}</span>
                      </p>
                      <p className="truncate text-xs text-stone-500">{d.breed} · {d.description}</p>
                    </div>
                    <Button variant="secondary" onClick={() => setEditing(d)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => confirm(`Remove ${d.name} from the map?`) && run(() => data.admin.deleteDog(token, d.id))}
                    >
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </List>
          </>
        )}

        {tab === "photos" && (
          <List empty="No community photos yet." grid>
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-2xl bg-stone-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-2 text-xs text-white">
                  <span>
                    {dogName(p.dogId)} · {timeAgo(p.at)}
                  </span>
                  <button
                    type="button"
                    onClick={() => confirm("Remove this photo?") && run(() => data.admin.deletePhoto(token, p.id))}
                    className="rounded-lg bg-red-500 px-2 py-1 font-semibold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </List>
        )}
      </main>

      {editing && (
        <DogEditor
          dog={editing}
          onClose={() => setEditing(null)}
          onSave={async (dog) => {
            if (await run(() => data.admin.saveDog(token, dog))) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function List({ children, empty, grid }: { children: React.ReactNode[]; empty: string; grid?: boolean }) {
  if (children.length === 0) return <p className="py-16 text-center text-sm text-stone-500">{empty}</p>;
  return <div className={grid ? "grid grid-cols-2 gap-3 sm:grid-cols-4" : "space-y-3"}>{children}</div>;
}

function Card({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-900/5 dark:bg-stone-900 dark:ring-white/5 ${muted ? "opacity-60" : ""}`}>
      {children}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-700",
    open: "bg-red-500/15 text-red-700",
    approved: "bg-emerald-500/15 text-emerald-700",
    resolved: "bg-emerald-500/15 text-emerald-700",
    rejected: "bg-stone-500/15 text-stone-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ${style[status] ?? ""}`}>{status}</span>;
}
