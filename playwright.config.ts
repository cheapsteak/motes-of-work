import { defineConfig } from '@playwright/test';

// E2E_PORT lets parallel worktrees run e2e without colliding on the preview port.
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  // Every test is its own unit of work: a worker takes the next test, not the next file, so one long
  // file (galaxy.spec.ts) no longer holds a worker to the end, and CI's shards split by test.
  fullyParallel: true,
  use: {
    baseURL: `http://localhost:${port}`,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    port,
    reuseExistingServer: true,
  },
});
