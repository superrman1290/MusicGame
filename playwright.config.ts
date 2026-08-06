import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const apiUrl = 'http://127.0.0.1:3101';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? [['html', { open: 'never' }], ['line']] : 'line',
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
  webServer: [
    {
      command: 'npm run build -w @music-game/chart-core && npm run serve:e2e -w @music-game/mock-api',
      url: `${apiUrl}/api/health`,
      env: { PORT: '3101', SONG_DATA_DIR: path.resolve('test-results/e2e-data/songs') },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w @music-game/game -- --host 127.0.0.1 --port 5273 --strictPort',
      url: 'http://127.0.0.1:5273',
      env: { API_TARGET: apiUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -w @music-game/editor -- --host 127.0.0.1 --port 5274 --strictPort',
      url: 'http://127.0.0.1:5274',
      env: { API_TARGET: apiUrl },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
