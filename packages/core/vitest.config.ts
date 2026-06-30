import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Resolve workspace deps to their TypeScript source so tests run without a
  // prior `pnpm -r build` (faster, never stale). The DB is an in-process PGlite
  // (see test/pg.ts); no external Postgres or DATABASE_URL is required.
  resolve: {
    alias: {
      "@lootdrop/db": path.resolve(__dirname, "../db/src/index.ts"),
      "@lootdrop/bitrefill": path.resolve(__dirname, "../bitrefill/src/index.ts"),
    },
  },
  test: {
    fileParallelism: false,
  },
});
