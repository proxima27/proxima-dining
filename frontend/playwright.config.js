import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests",
  workers: 1,
  timeout: 30000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    viewport: { width: 1366, height: 900 },
    launchOptions: { args: ["--no-sandbox"] },
  },
});
