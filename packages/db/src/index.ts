import { PrismaClient } from "@prisma/client";

let client: PrismaClient | undefined;

/**
 * Shared Prisma client. Two processes (bot + MCP server) open the same SQLite
 * file, so WAL mode is required (PRD §20).
 */
export function getDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient();
    // Fire-and-forget: WAL + sane busy timeout for cross-process access.
    void client.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    void client.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
  }
  return client;
}

export type { PrismaClient } from "@prisma/client";
export { Prisma } from "@prisma/client";
