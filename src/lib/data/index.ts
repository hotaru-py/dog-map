import { createHttpSource } from "./http";
import { localSource } from "./local";
import type { DataSource } from "./types";

/**
 * NEXT_PUBLIC_API_URL unset  -> local mode (no backend, browser storage)
 * NEXT_PUBLIC_API_URL=/api   -> the reference backend bundled in this app
 * NEXT_PUBLIC_API_URL=https://... -> your own backend implementing docs/API.md
 */
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

export const data: DataSource = apiUrl ? createHttpSource(apiUrl) : localSource;

export type { DataSource } from "./types";
