import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    // DB-backed route tests spin up an ephemeral schema; keep them serial within a
    // file and isolated per file. Pool=forks gives clean module state per file.
    pool: "forks",
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
