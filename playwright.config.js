import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 45000,
  retries: 1,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://bugmd-connor-koch.myshopify.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Pixel 7',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'iPhone 15',
      use: { ...devices['iPhone 15'], browserName: 'chromium' },
    },
  ],
});
