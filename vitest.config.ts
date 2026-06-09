import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // DB-backed route tests spin up an ephemeral schema; keep them serial within a
    // file and isolated per file. Pool=forks gives clean module state per file.
    pool: "forks",
    // Each file's beforeAll boots an in-process PGlite (WASM) instance and runs
    // all migrations. When many files start at once this exceeds the default
    // 10s hook timeout purely from startup contention (not slow code), so give
    // setup/teardown headroom that scales with the growing suite.
    hookTimeout: 60_000,
    globals: false,
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
