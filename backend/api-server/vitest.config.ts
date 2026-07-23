import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      DB_HOST: "localhost",
      DB_PORT: "5432",
      DB_NAME: "TLT_DB_test",
      REDIS_HOST: "localhost",
      REDIS_PORT: "6379",
    },
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // all files share one physical DB — run them serially
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});