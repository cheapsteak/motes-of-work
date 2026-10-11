### Task 1: Project scaffold and CI

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html`, `src/main.ts`, `src/style.css`, `.gitignore`, `.github/workflows/ci.yml`, `src/smoke.test.ts`, `e2e/smoke.spec.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `preview`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).

- [ ] **Step 1:** Create `package.json` with dependencies `three@^0.186.1`, `marked`; devDependencies `typescript`, `vite`, `vitest`, `@types/three`, `@playwright/test@1.56.1` (exact). Run `npm install`. Expected: lockfile written, no errors.
- [ ] **Step 2:** `tsconfig.json` (strict, `moduleResolution: "bundler"`, `types: ["vite/client"]`). `vite.config.ts` with `base: process.env.BASE_PATH ?? '/'` and `?raw` imports allowed for `.glsl`/`.md`. `.gitignore`: `node_modules`, `dist`, `test-results`, `playwright-report`, `shots`, `content-denylist.local.txt`.
- [ ] **Step 3:** `index.html` + `src/main.ts`: full-viewport fixed `<canvas id="stage">` behind a `<main id="story">` containing one placeholder section. Background `#0B0D12`. three.js renders a cleared frame.
- [ ] **Step 4:** Write `src/smoke.test.ts` (`expect(1 + 1).toBe(2)` importing nothing but `three` to prove resolution) and `e2e/smoke.spec.ts`: load `/`, assert `#stage` exists and no `pageerror` events.
- [ ] **Step 5:** `playwright.config.ts`: project `chromium` with the Global Constraints launch args; `webServer: { command: 'npm run build && npm run preview -- --port 4173 --strictPort', port: 4173, reuseExistingServer: true }`; `use.baseURL = 'http://localhost:4173'`.
- [ ] **Step 6:** Run `npm run typecheck && npm test && npm run e2e`. Expected: all pass.
- [ ] **Step 7:** `.github/workflows/ci.yml`: on push/PR — `npm ci`, `npm run typecheck`, `npm test`; job `e2e`: `npx playwright install --with-deps chromium` then `npm run e2e`.
- [ ] **Step 8:** Commit `chore: scaffold vite + three + vitest + playwright`.

---

