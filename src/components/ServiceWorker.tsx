"use client";

import { useEffect } from "react";

/** Registers public/sw.js in production builds (skipped in dev to avoid stale caches). */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
