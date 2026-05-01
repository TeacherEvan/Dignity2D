import path from "node:path";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

export default defineConfig({
  server: { port: 5173 },
  define: {
    global: "globalThis",
  },
  resolve: {
    alias: {
      phaser: path.resolve(
        __dirname,
        "node_modules/phaser/src/phaser-no-physics.js",
      ),
      phaser3spectorjs: path.resolve(__dirname, "src/vendor/phaser3spectorjs.cjs"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser";
          }
          if (id.includes("node_modules")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
