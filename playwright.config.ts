import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 30_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4322/personal_web/",
    channel: process.platform === "win32" ? "msedge" : undefined,
    viewport: { width: 1440, height: 1000 },
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    reducedMotion: "reduce",
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "npm run preview -- --host 127.0.0.1 --port 4322",
      url: "http://127.0.0.1:4322/personal_web/",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      // Astro 7 otherwise daemonizes when it detects an agent environment.
      env: { ASTRO_TELEMETRY_DISABLED: "1", ASTRO_PREVIEW_BACKGROUND: "1" },
    },
    {
      command: "npm run edit",
      // Readiness includes compiling the actual preview, not only serving editor HTML.
      url: "http://127.0.0.1:4321/",
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { ASTRO_TELEMETRY_DISABLED: "1", ASTRO_DEV_BACKGROUND: "1" },
    },
  ],
});
