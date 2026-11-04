import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

import { TEST_DATABASE_URL } from "./test/database-url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ["./test/global-setup.ts"],
    setupFiles: ["./test/reset-database.ts"],
    // All test files share one database that is emptied before each test.
    fileParallelism: false,
  },
});
