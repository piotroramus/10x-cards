import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import { resolve } from "path";

// Load .env file from project root
dotenv.config({ path: resolve(process.cwd(), ".env") });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Always reuse existing server - in CI we start it manually for better debugging
    reuseExistingServer: true,
    timeout: 120000,
    // Pass environment variables to the dev server
    // This ensures the server has access to PUBLIC_* vars and test credentials
    // In CI, these come from GitHub secrets; locally, they come from .env file
    env: {
      // Pass through all PUBLIC_* and other required env vars to the webServer
      // dotenv.config() above loads .env into process.env, so these will be available
      ...(process.env.PUBLIC_SUPABASE_URL && { PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL }),
      ...(process.env.SUPABASE_URL && { SUPABASE_URL: process.env.SUPABASE_URL }),
      ...(process.env.PUBLIC_SUPABASE_KEY && { PUBLIC_SUPABASE_KEY: process.env.PUBLIC_SUPABASE_KEY }),
      ...(process.env.SUPABASE_KEY && { SUPABASE_KEY: process.env.SUPABASE_KEY }),
      // Pass through test credentials if available
      ...(process.env.E2E_USERNAME && { E2E_USERNAME: process.env.E2E_USERNAME }),
      ...(process.env.E2E_PASSWORD && { E2E_PASSWORD: process.env.E2E_PASSWORD }),
      ...(process.env.E2E_USERNAME_ID && { E2E_USERNAME_ID: process.env.E2E_USERNAME_ID }),
    },
  },
});
