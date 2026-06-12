import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export default function setup(): void {
  const testDir = path.dirname(new URL(import.meta.url).pathname);
  const dbPath = path.join(testDir, "test.db");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    fs.rmSync(dbPath + suffix, { force: true });
  }
  // Fresh file each run (deleted above), so plain `db push` builds the schema
  // from scratch — no --force-reset needed.
  execSync(
    "pnpm --filter @lootdrop/db exec prisma db push --skip-generate",
    {
      cwd: path.join(testDir, ".."),
      env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
      stdio: "inherit",
    },
  );
}
