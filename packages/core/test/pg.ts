import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { PrismaPGlite } from "pglite-prisma-adapter";
import { PrismaClient } from "@prisma/client";

const here = path.dirname(fileURLToPath(import.meta.url));
// Single source of schema truth: the same committed migrations that
// `prisma migrate deploy` applies in production. Tests never drift from prod DDL.
const MIGRATIONS_DIR = path.resolve(here, "../../db/prisma/migrations");

function allMigrationsSql(): string {
  return readdirSync(MIGRATIONS_DIR)
    .filter((d) => /^\d/.test(d)) // migration folders only (not migration_lock.toml)
    .sort()
    .map((d) => readFileSync(path.join(MIGRATIONS_DIR, d, "migration.sql"), "utf8"))
    .join("\n");
}

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
  await pglite.exec(allMigrationsSql());
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
