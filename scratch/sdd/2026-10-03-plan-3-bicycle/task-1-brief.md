### Task 1: Per-part settle windows

**Files:**
- Modify: `src/mechanisms/types.ts` (add an optional field to `MechanismPart`)
- Modify: `src/scene/mote/attributes.ts` (use the window)
- Test: `src/scene/mote/attributes.test.ts` (or the existing attribute test file), `src/mechanisms/contract.test.ts`
- Modify: `docs/adding-a-mechanism.md` (one bullet under "Building one", step 4)

**Interfaces:**
- Produces: `MechanismPart.settle?: readonly [number, number]` — the assembly window `[from, to]` in which this part's motes settle: each mote's settle value is `from + (to - from) * h1` (the same `h1` hash as today). Omitted means the role default.
- Produces: `export function settleWindow(part: MechanismPart): readonly [number, number]` in `src/scene/mote/attributes.ts`, returning the part's window or its role default. A mote of the part is fully settled once `assembly >= settleWindow(part)[1]`.
- Role defaults (today's distributions, unchanged): core `[SETTLE_WINDOW, 0.45]`, body `[0.35, 0.95]`, drift `[0.5, 0.95]`.

- [ ] **Step 1: Write the failing tests**
  - `settleWindow` returns the role default for a part without `settle`, and the part's own window when given.
  - With no part declaring `settle`, every mote's settle value for every registered mechanism is identical to before the change (compare against values computed with the old formulas for a fixed budget and seed).
  - A part with `settle: [0.6, 0.7]` puts all its motes' settle values in `[0.6, 0.7]`.
  - Contract test, over every registered mechanism: any declared `settle` window has `from < to` and lies inside its role's default window.
- [ ] **Step 2: Run them; the new ones fail** — `npx vitest run src/scene/mote src/mechanisms/contract.test.ts`
- [ ] **Step 3: Implement** — add the field with a doc comment; route the three role formulas in `attributes.ts` through `settleWindow`. Export the role defaults as one constant table so the contract test and `settleWindow` share it.
- [ ] **Step 4: Run** `npx tsc --noEmit -p .` and `npx vitest run` — all pass.
- [ ] **Step 5: Guide** — in `docs/adding-a-mechanism.md`, "Building one" step 4, add one sentence: a part may set `settle` to control when its motes land (it must stay inside its role's default window).
- [ ] **Step 6: Commit**

---

