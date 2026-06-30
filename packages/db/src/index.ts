import { PrismaClient } from "@prisma/client";

let client: PrismaClient | undefined;

/**
 * Shared Prisma client (process-wide singleton). Backed by PostgreSQL via
 * DATABASE_URL; concurrent access across the bot and MCP server is handled
 * natively by Postgres, so no SQLite-style PRAGMA tuning is needed.
 */
export function getDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
  }
  return client;
}

export type { PrismaClient } from "@prisma/client";
export { Prisma } from "@prisma/client";
