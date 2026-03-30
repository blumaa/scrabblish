import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    viewport: { width: 390, height: 844 }, // iPhone 14
    hasTouch: true,
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
  ],
});
