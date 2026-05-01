import path from "node:path";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";

function getPhaserChunkName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const phaserPath = "/node_modules/phaser/src/";
  const phaserIndex = normalizedId.indexOf(phaserPath);

  if (phaserIndex === -1) {
    return undefined;
  }

  const relativePath = normalizedId.slice(phaserIndex + phaserPath.length);
  const [topLevelDir, secondLevelDir] = relativePath.split("/");

  switch (topLevelDir) {
    case "actions":
    case "animations":
      return "phaser-animation";
    case "cache":
    case "loader":
    case "textures":
      return "phaser-assets";
    case "cameras":
    case "scene":
    case "scale":
      return "phaser-runtime";
    case "core":
    case "device":
    case "events":
    case "plugins":
    case "polyfills":
      return "phaser-core";
    case "data":
    case "display":
      return "phaser-display";
    case "geom":
    case "math":
    case "structs":
      return "phaser-math";
    case "renderer":
      return "phaser-renderer";
    case "gameobjects":
      return secondLevelDir === "particles"
        ? "phaser-gameobjects-particles"
        : "phaser-gameobjects";
    case "input":
      return "phaser-input";
    case "sound":
      return "phaser-sound";
    default:
      return "phaser-misc";
  }
}

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
      phaser3spectorjs: path.resolve(
        __dirname,
        "src/vendor/phaser3spectorjs.cjs",
      ),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          const phaserChunkName = getPhaserChunkName(id);
          if (phaserChunkName) {
            return phaserChunkName;
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
