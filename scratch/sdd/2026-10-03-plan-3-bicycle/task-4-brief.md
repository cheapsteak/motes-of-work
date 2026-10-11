### Task 4: The bike on stage

**Files:**
- Modify: `src/config.ts` (`ACTIVE_MECHANISM = 'bike'`)
- Modify: `src/timeline/keyframes.json` (camera tracks for all four sections)
- Modify: `src/compare/controls.ts` (the "Cold open" and "Spec (core)" camera presets match the new keys)
- Modify: `README.md` (status line), and any e2e or unit test that assumes the gears are active
- Test: `src/timeline/keyframes.test.ts`, `e2e/shots.spec.ts` output

**Interfaces:**
- Consumes: the bike (Task 2); the four sections (Task 3).
- Produces: camera keys in machine-relative coordinates (world = anchor centre + value × anchor radius; `camera.coreFocus` 0 frames the whole bike, 1 the contact points).

**Camera intent** (spec §5.8, §4):
- **`vibe-build`:** low (camera y slightly above the bottom bracket's height), three-quarter from the drive side (+z, +x), the whole bike and the ground strip in frame, a slow sweep while it assembles.
- **`reveal`:** swing to within about 25° of side-on from the drive side, slightly elevated, so the saddle on the steering column and the handlebars in the seat tube are unmistakable and not occluded by the frame.
- **`rewind`:** pull back as now.
- **`spec`:** `coreFocus` 1 framing all three contact points together, right of the text panel (the existing framing test enforces it).

Tune by rendering shots and looking. Every registered mechanism must still pass `keyframes.test.ts`'s framing test (Review Focus 4). If a bench machine fails only because of the bike's framing, report it rather than loosening the test.

- [ ] **Step 1:** Set `ACTIVE_MECHANISM`; run `npx vitest run` and the full e2e (`E2E_PORT=<port> npx playwright test`); fix tests that assumed gears (they should read the active mechanism, not name one).
- [ ] **Step 2:** Tune camera keys; regenerate shots with `SHOTS=1 E2E_PORT=<port> npx playwright test e2e/shots.spec.ts e2e/compare.spec.ts`; look at `shots/vibe-build-*`, `reveal-*`, `rewind-*`, `spec-*` and describe them honestly in the report.
- [ ] **Step 3:** Update the compare presets and the README status.
- [ ] **Step 4:** Full verification: `npx tsc --noEmit -p .`, `npx vitest run`, full e2e.
- [ ] **Step 5: Commit.**

---

