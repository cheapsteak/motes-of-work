
## Fix round 1 (review Minors 1 to 6)

Commit: `0d6f921` galaxy: name the derps' salt layout, hold their parity to 1e-4, and sample every kind across its profile. It sits on top of `775f71a`; no history was rewritten.

Every mutation below was applied and then undone with an exact inverse string edit by a small script. The script checks that each target occurs exactly once, and confirms the file is byte-identical afterwards. All six reported "restored byte-identical: True". No git checkout was used.

### 1. The v-scaling test covers the scatter

- **The change.** The test now also loops over 3 scatter events × 40 values of s × (star, planet). At each sample, `scatterS` must not be −1 and must be the same at v 0.37 as at v 1.
- **Mutation.** `d.scatterS = sec * v` in derp.ts fails "v scales every term" (0.00185 against 0.005).

### 2. The derp parity is held to 1e-4

- **The change.** e2e/parity.spec.ts gives the derp test its own `DERP_TOLERANCE = 1e-4`; the other libraries keep 1e-3. The test also pins the sample counts exactly: 1,640 for a cracked body and 1,460 for the healthy one.
- **Measured now:**

  | case | maxError | shifted |
  |---|---|---|
  | C1 (planet) | 4.7e-6 | 4 / 1640 |
  | C1-m1 (moon) | 6.2e-6 | 2 / 1640 |
  | P1 (star) | 5.9e-6 | 0 |
  | R0 (core) | 9.0e-6 | 0 |
  | a healthy planet | 0 | 0 |

- **Mutation.** In the GLSL only, I made the tremble 5 % too large (`1.05 * BURST_TREMBLE`).
  - C1 failed at 5.7e-4. That error is under the old 1e-3 bound, so only the new bound catches it.
  - The moon's error was 7.5e-5, which still passes 1e-4 alone (R = 0.04). Its larger terms are covered.

### 3. The salt layout and the shape factors are named and spliced

- **New in birth.ts:**
  - `DERP_FINE_EVENT 256`, `DERP_FINE_LATTICE 3`, `DERP_FINE_JITTER_AT 128` and `DERP_FINE_JITTER 2`. These are spliced as `const uint` from a new `DERP_UINT_CONSTANTS` list, together with `DERP_FINE_SALT`.
  - `DERP_WOBBLE_Y 0.5` and `BURST_TREMBLE_PARTS 3`, spliced as floats.
- **Both mirrors now read the names.**
- **The GLSL tests:**
  - every uint constant must be declared with its value;
  - derp.glsl may hold no bare `256u`, `128u`, `* 2u`, `* 3u`, `amp * 0.5` or `s * 3.0`.
- **The salt-families test** now computes its bounds from the named values: the lattice top below `DERP_FINE_JITTER_AT`, and the jitter top below `DERP_FINE_EVENT`.
- **Mutation.** `DERP_FINE_JITTER_AT = 250` fails "keeps its salt families apart" (311 is not less than 256).

### 4. Eased-profile unit tests

- **The tremble's envelope.**
  - **The test.** Over the middle third, `wobble[1]` must equal `DERP_WOBBLE_Y · 0.05 R · sin(π(3s − 1)) · n_y(40 s)` to 1e-12. The test recomputes the y noise independently from its lattice hashes.
  - **Mutation.** A flat envelope (the sine dropped) fails, with the received value 16× the expected one.
- **The skip's lift ring.**
  - **The test.** `lift ≥ −0.25 · 0.2 r` at 2,000 samples of s over 5 skip events.
  - **Mutation.** The lift alone made 1.5× deeper on the ring fails that line (−0.2536 against −0.25).
- **The stall's lower bound.**
  - **The test.** `dNu ≥ −0.7 ωD` at 2,000 samples of s over 5 stall events.
  - **Mutation.** I changed the catch-up so that it overshoots past the hold, with `1.2 · ss(0.75, 1) − 0.2 · ss(0.7, 0.75)`. It still returns to 0 at s 1, so only the new line can catch it, and that line fails (−0.63004 against −0.63).
  - A first, cruder stall mutation was also caught, but by the older return-to-zero line. I replaced it with this targeted one.

### 5. Kind coverage by construction

- **The change.** Each cracked body's first two events of each kind are now sampled at s ∈ {0.1, 0.3, 0.5, 0.65, 0.85}, at each v ∈ {1, 0.37, 0}. That is 180 event samples a body, on top of the grid.
  - Only events with `t0 ≥ 0` are taken.
  - The search is capped at `DERP_EVENT_SLOTS = 2000` slots, and the page throws if a kind has fewer than two events in them.
- **Mutation.** I emptied the grid (`DERP_GRID_END = 0`) and, in the GLSL only, made the stall's catch-up end by s 0.9. Only the event samples remained, and they alone failed: C1 at 0.025 and the moon at 0.25.

### 6. ZERO_DERP is frozen through

- **The change.** The wobble array is frozen too. The type is `Readonly<Omit<Derp, 'wobble'>> & { readonly wobble: Readonly<Vec3> }`.
- **The new test, "ZERO_DERP is frozen through":**
  - both the object and the array are frozen;
  - a write to `wobble[0]` throws;
  - the value is still `[0, 0, 0]`.
- **Mutation.** Leaving the array unfrozen fails it.

### Results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 74 files, 1,636 passed. derp.test.ts now has 19 tests.
- `E2E_PORT=4199 npx playwright test -g derp e2e/parity.spec.ts`: 1 passed.
- Formatting:
  - derp.ts and derp.test.ts pass `prettier --print-width 140 --single-quote`;
  - parity.ts and parity.spec.ts have the same prettier drift as at HEAD;
  - birth.ts is clean.
