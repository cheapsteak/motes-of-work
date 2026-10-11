import { defineConfig } from '@playwright/test';

// E2E_PORT lets parallel worktrees run e2e without colliding on the preview port.
const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: 'e2e',
  // CI's shards split by test (fullyParallel; the workflow deals the tests round-robin, tools/shard-list.mjs,
  // because --shard cuts contiguous runs and keeps a file's heavy tests on one shard), so the 80 tests of
  // galaxy.spec.ts spread over the shards instead of holding one to the end. Locally a worker runs a file whole: with tests interleaved, a light
  // spec could follow the dissolve test (galaxy.spec.ts, "the neighbourhood dissolves") in the same
  // browser and wait out the GPU work that test leaves queued, about 1.6 min, and on this shared machine
  // looks.spec.ts's 2 min timeout went over (the test-speed report, part 3).
  fullyParallel: !!process.env.CI,
  // Measured on this 4-core container with SwiftShader (the test-speed report): 3 and 4 workers ran the
  // task tier faster but timed out the heaviest tests (clearance.spec.ts at its 4 min) on a shared machine.
  workers: 2,
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
