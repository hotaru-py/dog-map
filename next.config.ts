import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Database drivers load native/wasm files at runtime; don't bundle them.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Pin the project root so stray lockfiles elsewhere don't change the standalone layout.
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
