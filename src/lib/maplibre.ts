"use client";

import * as maplibregl from "maplibre-gl";

// Served from public/ (see scripts/copy-maplibre-worker.mjs)
maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

export { maplibregl };
