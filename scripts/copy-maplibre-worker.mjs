// Copies MapLibre's web worker into public/ so it is served as a static file.
// Next's bundler can't resolve MapLibre 6's worker URL on its own. Runs on install, dev and build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("maplibre-gl/package.json"));
mkdirSync("public/maplibre", { recursive: true });
copyFileSync(path.join(dist, "dist", "maplibre-gl-worker.mjs"), "public/maplibre/maplibre-gl-worker.mjs");
console.log("[maplibre] worker copied to public/maplibre/");
