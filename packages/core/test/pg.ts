import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
// Single source of schema truth: the same committed init migration that
// `prisma migrate deploy` applies in production. Tests never drift from prod DDL.
const MIGRATION_SQL = path.resolve(
  here,
  "../../db/prisma/migrations/0_init/migration.sql",
);

export interface TestDb {
  db: PrismaClient;
  close: () => Promise<void>;
}

/**
 * In-process Postgres (PGlite, WASM) for tests — same engine and same generated
 * Prisma client as production, with zero Docker. Each call returns a fresh,
 * isolated in-memory database with the full schema applied.
 */
export async function makeTestDb(): Promise<TestDb> {
  const pglite = new PGlite();
  await pglite.exec(readFileSync(MIGRATION_SQL, "utf8"));
  // `as never`: pglite-prisma-adapter@0.6.1 bundles driver-adapter-utils@6.10
  // while @prisma/client is 6.19 — the factory shapes are structurally
  // identical at runtime (tests pass) but nominally diverge at the type level.
  const db = new PrismaClient({ adapter: new PrismaPGlite(pglite) as never });
  return {
    db,
    close: async () => {
      await db.$disconnect();
      await pglite.close();
    },
  };
}
