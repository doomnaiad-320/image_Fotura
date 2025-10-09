import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    coverage: {
      reporter: ["text", "json"],
      reportsDirectory: "coverage/integration"
    },
    pool: "threads"
  }
});
