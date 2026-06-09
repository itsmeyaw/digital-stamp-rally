import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    pool: "forks",
    // Each file's beforeAll boots an in-process PGlite (WASM) instance and runs
    // all migrations. When many files start at once this exceeds the default
    // 10s hook timeout purely from startup contention (not slow code), so give
    // setup/teardown headroom that scales with the growing suite.
    hookTimeout: 60_000,
    globals: false,
    exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          // Each file's beforeAll boots an in-process PGlite (WASM) instance and runs
          // all migrations. When many files start at once this exceeds the default
          // 10s hook timeout purely from startup contention (not slow code), so give
          // setup/teardown headroom that scales with the growing suite.
          hookTimeout: 60_000,
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["**/*.test.tsx"],
          exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**"],
          setupFiles: ["./test/setup-dom.ts"],
        },
      },
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
    },
  },
});
