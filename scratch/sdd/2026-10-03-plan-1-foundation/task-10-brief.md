### Task 10: Rewind invariant e2e, section screenshots, CI e2e

**Files:**
- Create: `e2e/purity.spec.ts`, `e2e/shots.spec.ts`; Modify: `package.json` (script `shots`: `SHOTS=1 playwright test e2e/shots.spec.ts`), `.github/workflows/ci.yml` (upload `shots/` and `test-results/` as artifacts on failure)

**Interfaces:**
- Consumes: `window.__motes`, `?p=`, `?test=1`.

- [ ] **Step 1: Write** `purity.spec.ts`:
  - **Jump vs scroll:** page A `/?test=1&p=0.41` → `settle()` → canvas screenshot. Page B `/?test=1`, wheel-scroll in 40 steps to `scrollYForProgress(0.41)` exactly (final `window.scrollTo` to the integer target), `settle()`, screenshot. Assert `Buffer.equals`.
  - **Forward past and back:** page C scrolls to 0.8 then back to the same integer `scrollY` as A; screenshot equals A.
  - Repeat for p = 0.12 (mid vibe build) and 0.88 (spec).
- [ ] **Step 2:** Run. Expected: PASS (if it fails, a purity violation exists — find the accumulated state and remove it; never add tolerance).
- [ ] **Step 3:** `shots.spec.ts` (skipped unless `SHOTS=1`): for each section, screenshot at local 0.1, 0.5, 0.9 to `shots/<id>-<local>.png`.
- [ ] **Step 4:** Run `npm run shots`; review the images.
- [ ] **Step 5:** Commit `test: rewind invariant and section screenshots`.

---

