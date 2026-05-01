import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
