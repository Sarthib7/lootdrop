import { defineConfig } from "vitest/config";
import path from "node:path";

const testDbPath = path.join(__dirname, "test", "test.db");

export default defineConfig({
  test: {
    fileParallelism: false,
    globalSetup: ["./test/global-setup.ts"],
    env: {
      DATABASE_URL: `file:${testDbPath}`,
    },
  },
});
