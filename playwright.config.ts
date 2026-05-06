import { defineConfig } from "@playwright/test";

const FRONTEND_E2E_URL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: [
    // End-to-end coverage exercises both the launcher shell and the local room/upload server.
    {
      command: "VITE_SERVER_URL=http://127.0.0.1:8787 npm run dev -- --port 4173",
      url: FRONTEND_E2E_URL,
      reuseExistingServer: true,
    },
    {
      command: "npm run server:start",
      url: "http://127.0.0.1:8787/health",
      reuseExistingServer: true,
    },
  ],
  use: {
    baseURL: FRONTEND_E2E_URL,
    viewport: { width: 390, height: 844 },
  },
});
