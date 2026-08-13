import { defineConfig, devices } from "@playwright/test"
import { API_BASE_URL, API_PORT, DB_PATH, WEB_BASE_URL, WEB_PORT } from "./env"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "html",
  globalTeardown: "./global-teardown.ts",

  use: {
    baseURL: WEB_BASE_URL,
    trace: "retain-on-failure",
    // Pinned so date/calendar rendering (locale-formatted day labels, DST
    // handling, theme's "system" preference) is identical on every
    // machine and in CI, not just wherever this happens to run.
    locale: "en-US",
    timezoneId: "America/New_York",
    colorScheme: "light",
  },

  projects: [
    {
      // Chromium only, deliberately: the drag-to-select/auto-scroll
      // interactions are real mouse-event sequences, and Chromium's
      // emulation of those is the most reliable. A WebKit/Firefox smoke
      // subset is a reasonable future addition, not done here.
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /.*\.mobile\.spec\.ts/,
    },
    {
      // A mobile-viewport, touch-capable Chromium profile for the
      // *.mobile.spec.ts smoke subset — Chromium again rather than WebKit,
      // for the same "most reliable emulation" reason as above (a WebKit
      // run is a reasonable future addition, not part of this pass — see
      // the "chromium" project's comment). Scoped via testMatch so it
      // never picks up the desktop-only suite above.
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      testMatch: /.*\.mobile\.spec\.ts/,
    },
  ],

  webServer: [
    {
      command: "cargo run --quiet",
      cwd: "../api",
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL: `sqlite:${DB_PATH}?mode=rwc`,
        ALLOW_ORIGIN: WEB_BASE_URL,
        EVENT_CLEANUP_INTERVAL_SECS: "3600",
      },
    },
    {
      // Vite dev server rather than a production build+preview: no build
      // step to re-run on every change, and VITE_API_BASE_URL only needs
      // to be set once, at server start, either way.
      command: `pnpm dev --port ${WEB_PORT} --strictPort --host 127.0.0.1`,
      cwd: "../web",
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_API_BASE_URL: API_BASE_URL,
      },
    },
  ],
})
