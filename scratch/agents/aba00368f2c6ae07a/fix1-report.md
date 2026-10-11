
## Fix round 1

All seven findings of `task-6-review.md` are fixed in one commit (COMMIT_SHA).

### Important 1: the orbit-track turn, tested where the galaxy has turned

- **TS twin.** `trackDot(row, turns, t, data)` in `bodyMote.ts` mirrors `track.vert.glsl`. It returns `bodyWorld(host) + turnVec(orbitLocal(elements with phase = turns − orbitTurns(t, period)), t)`.
- **Unit test** (`bodyMote.test.ts`, "a dotted orbit's dot"). At t ∈ {0, AMBIENT_POSE, 101}, every orbiting body's own dot (at its mean anomaly) lands on `bodyWorld` within 1e-9. Control: at 101 s, C4's unturned host + `orbitLocal` sits more than 1 unit from the body, so the turn matters there.
- **Pixel e2e test**, at both sizes: "the dotted orbits turn with the galaxy: every track pixel is on a twin dot, at the pose and at 101 s".
  - Setup: the system shot with the lamp off and `net-tracks` isolated.
  - It projects every `buildTrackAttrs` dot through `trackDot` and the composed twin camera.
  - It requires more than 100 lit pixels, and zero lit pixels more than 2.5 px from a twin dot.
- **Mutation.** I reverted `track.vert.glsl:35` to `bodyWorld(host, uAmbient) + orbitLocal(bodyTexel(1, row), t2, uAmbient)` and the e2e test failed at both sizes: `track pixels off the twin dots at 9.49…`, expected 0, received 175 at 390x844 and 346 at 1440x900. I undid it with the exact inverse edit; `git diff -- src/scene/node/shaders/` is empty.

### Minor 1: `LIT_CORE` in mote.frag

Fenced rather than spliced. `mote.frag.glsl` is shared with the bike's mote system, which has no access to `BODY_LOOK` and no node splice. A `bodySystem.test.ts` case requires that mote.frag contains `const float LIT_CORE = ${BODY_LOOK.litCore};` and contains `LIT_CORE = ` exactly once.

### Minor 2: parity on dark motes

`BODY_CASES` gains four cases. Each has the same 64 hashed motes, focus 0.5, `sysPxSpread()`, growth 0.55, highlight 0.95 and fix 0.6. Each runs at the pose and at 101 s, and `e2e/parity.spec.ts` lists all four. The lamps:
- `Lamp.Planet` on C1
- `Lamp.Star` on C1 (level 2)
- `Lamp.Core` (level 4)
- `Lamp.Lineage` on P1

These cover `lampLit`'s false branch at every level that has one. Each lit set is a small part of the galaxy, so nearly all 64 motes fall dark. I did not count how many each case lights.

### Minor 3: the stream instance count

`streamDots` (generate.ts) now returns `clamp(ceil(chord / STREAM_PITCH), 6, 40)`, so the last partly present dot has an instance. The test's independent count uses `ceil` too. The essay galaxy's drawn total moves from 75,903 to **75,925**, still within 76,000.

**Deviation, listed here as asked:** the dot count the shader draws by is the unrounded `n = clamp(chord / 1.2, 6, 40)`, with dot i drawn at `clamp(n − i, 0, 1)`. The brief says `round(chord / 1.2)`. The instance count is `ceil(n)`.

### Minor 4: named salts

- `SALT` gains `bodyBirth: 23` (a builder's place in its shell's landing order), `personLat: 24` and `personLon: 25` (a person mote's rest point). `bodyAttrs.ts` uses them in place of the literals 0, 0 and 1.
- `salts.test.ts` pins the three values and now scans `bodyAttrs.ts` for literal-salt call sites.
- This moves every builder's landing jitter and every person mote's rest point to new hashes, as intended. No pinned value or still changed.

### Minor 5: `moteHashes`

`bodyMote()` calls `moteHashes(seed, a.index)` instead of re-deriving it. The shell-equation test bounds the warp by `SCATTER_AMP[0] + SCATTER_AMP[1]` instead of a literal 0.4.

### Minor 6: a second compared stream in the gradient test

"streams are quiet when shown" now measures the gradient on two frames:
- the system probe under P_a's star lamp, where at least 1 stream is compared;
- the neighbourhood (`shot=hood`, streams on, lamp off; the core's streams out to the stars), where at least 2 streams are compared.

Making the neighbourhood pass took one more fix: deciding which dots stand alone. The first full run failed at 390x844 on R_a → star-1 (parent end 62, child end 23 < 3 × 23). The child-end reading of 23 was a neighbouring stream's dot 3.1 px away, which the 1 px search window reached. Measured on that dot's own pixel, the reading was 12. The check now works on pixels:
- each twin dot is read as the 3 × 3 around its own pixel (`floor(x), floor(y)`);
- a dot is compared only when no other drawn dot's 3 × 3 overlaps its own, partly present dots of other streams included.

**Mutation:** in `stream.vert.glsl`, `streamGain(sd.u, …)` → `streamGain(0.0, …)` (no fade). The test fails at both sizes: `system: stream P_a to N0: parent end 64, child end 64`. Restored with the exact inverse edit.

### Commands and results

- `npx tsc --noEmit -p .`: clean.
- `npx vitest run`: 82 files, 1763 tests passed.
- `E2E_PORT=4199 npx playwright test e2e/galaxy.spec.ts e2e/parity.spec.ts`: 34 passed and 1 failed, the hood gradient described under Minor 6. After the fix, "streams are quiet" passes at both sizes.
- `E2E_PORT=4199 npm run e2e`: FULL_E2E.
- Mutation runs: the two above, each failing as expected and each restored.

### Files (fix round 1)

`src/math/salts{,.test}.ts`, `src/scene/node/bodyAttrs.ts`, `src/galaxy/generate{,.test}.ts`, `src/scene/node/bodyMote{,.test}.ts`, `src/scene/node/bodySystem.test.ts`, `src/parity/parity.ts`, `e2e/galaxy.spec.ts`, `e2e/parity.spec.ts`. The helper scripts `shots/fix1{,b,c}.py` were used and deleted.
