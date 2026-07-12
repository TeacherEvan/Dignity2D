import { defineConfig } from "@playwright/test";

const FRONTEND_E2E_URL = "http://127.0.0.1:4173";
// 8787 collides with an always-on personal service (LINE bridge) in this dev
// environment, so the e2e backend uses a dedicated port to avoid grabbing the
// wrong server when reuseExistingServer is true.
const E2E_BACKEND_PORT = 8799;
const E2E_BACKEND_URL = `http://127.0.0.1:${E2E_BACKEND_PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: [
    // End-to-end coverage exercises both the launcher shell and the local room/upload server.
    {
      command:
        "VITE_SERVER_URL=" + E2E_BACKEND_URL + " npm run dev -- --port 4173",
      url: FRONTEND_E2E_URL,
      reuseExistingServer: true,
    },
    {
      command: `PORT=${E2E_BACKEND_PORT} npm run server:start`,
      url: `${E2E_BACKEND_URL}/health`,
      reuseExistingServer: true,
    },
  ],
  use: {
    baseURL: FRONTEND_E2E_URL,
    viewport: { width: 390, height: 844 },
  },
});
