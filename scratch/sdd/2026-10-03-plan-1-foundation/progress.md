# SDD ledger — plan: docs/plans/2026-10-03-plan-1-foundation.md

Spec: docs/specs/2026-10-02-motes-of-work-design.md (reachable).
Branch: plan-1-foundation. Plan commit base: see git log.

## Pre-flight scan

| Pair / task | Produces → consumes | Finding |
|---|---|---|
| T1 self | creates .gitignore | SDD workspace `.superpowers/` not listed → Ruling below |
| T2 → T3 | SectionSpan (progress.ts) → KeyframeSampler ctor | consistent |
| T2 → T9 | 01-vibe-build.md placeholder → real copy | consistent (T9 overwrites) |
| T3 → T5,T6 | Faults/ZERO_FAULTS/FAULT_KEYS/SceneState | consistent |
| T4 → T5,T6,T7 | PartTransform/compose/hash01/pcg | consistent; GLSL uint ops match Math.imul>>>0 |
| T5 → T6 | Role, pose(), samplePoints, explodedOffset | consistent; drift excluded from pose by design (T6 owns it) |
| T6 → T7 | algorithm + packPartTexture (2 texels/part) | consistent |
| T6 → T8 | visible[3] booleans → aMeta1.w bits | consistent (T8 defines bit packing) |
| T8 → T9 | main.ts ?state=/?test=1 → sampler wiring | consistent (T9 keeps override) |
| T8 ghost | needs zero-fault pose texture | partTransforms(mech, state with assembly 1, ZERO_FAULTS, variant 0) — consistent |
| T9 → T10 | window.__motes.settle/progress, ?p= | consistent |
| T8 → T11 | createMoteSystem(mech,budget,seed) → fill spike needs all-Human motes | gap → Ruling below |
| T9 keyframes self | section continuity (drive 0→2→0→0.5, camera end/start) | implementer must start each section's keys at previous section's end values |
| T10 self | pixel equality needs identical integer scrollY | consistent with "progress derives from scrollY" |
| Each task self | tests vs code vs files | no contradictions found |

Ruling: Task 1 adds `.superpowers/` to .gitignore — SDD workspace must be git-ignored — cost if wrong: none (scratch dir).
Ruling: Task 11 may add an optional 4th param `opts?: { forceType?: MoteType }` to createMoteSystem for the fill spike — spec spike 1 needs worst-case all-human halos and no SceneState field expresses it — cost if wrong: one optional param to remove later.

## Progress
Task 1: complete (commits c035418..66b3382, review clean)
Task 1: minor (deferred): reuseExistingServer:true can test a stale preview locally (plan-mandated)
Task 1: minor (deferred): CI lacks permissions: contents: read, playwright-report upload on failure, duplicate setup steps
Task 1: minor (deferred): no Node engines/.nvmrc pin
Task 1: minor (deferred): src/env.d.ts redundant with vite/client ?raw types
Task 1: minor (deferred): fresh majors TS 7 / Vite 8 / Vitest 5 — watch for toolchain surprises
Task 2: minor (deferred): frontmatter parser lenient (unknown/duplicate keys, draft non-boolean silently false, length accepts 1e3/0x10, id format unvalidated)
Task 2: minor (deferred): Prettier hook warnings; no formatter configured in repo
Task 2: minor (deferred): denylist test silent when local file absent (CI)
Task 2: minor (deferred): loadStory ordering not directly tested
Task 2: minor (deferred): BOM regex char not covered by a test
Ruling: folded the Minor "sectionSpans total 0 yields NaN" into fix round 1 — one-line guard, matches the NaN-free constraint — cost if wrong: trivial.
Task 2: fix round 1/5 (3 addressed, 0 open — denylist on decoded text, word count entity decode, zero-length spans; commits 8ca1fb9..b9d11e7)
Task 2: complete (commits 66b3382..b9d11e7, review clean)
Task 3: complete (commits b9d11e7..a3370be, review clean)
Task 3: minor (deferred): clamp01 duplicated in keyframeSampler.ts and scroll/progress.ts
Task 3: minor (deferred): resolveAt "id@1" may not bit-equal next "id@0" — Task 9 note: never use both <a>@1 and <next>@0 in one track (equal at anyway)
Task 3: minor (deferred): easing coverage only linear/step/inOutCubic
Task 3: minor (deferred): SCENE_STATE_PATHS / FAULT_KEYS not frozen at runtime
Task 3: minor (deferred): keyframeSampler.test.ts half case samples single-key track (clarity)
Task 4: complete (commits a3370be..8adb19a, review clean)
Task 4: minor (deferred): no hash01 golden values — Task 7 parity must cover hash01 (carry into Task 7 dispatch)
Task 4: minor (deferred): GOLDEN declared after describe blocks; nlerp + zero-quat branches untested; lerpTransform(a,b,1) may return -b quaternion (same rotation)
Task 5: ⚠️ explodedOffset semantics resolved by controller: offset composed onto pose in world space by Task 6 partTransforms (plan text) — consistent.
Task 5: complete (commits 8adb19a..a753e73, review clean)
Task 5: minor (deferred): fault tests only assert divergence; no numeric pins for phi/misalign/stall/bind formulas
Task 5: minor (deferred): per-part counts use cumulative rounding not "last part absorbs" (total exact)
Task 5: minor (deferred): part rng seed coincides with point seed derivation; ACTIVE_MECHANISM typed as string; L-bracket slightly below frame edge
Task 6: complete (commits a753e73..679163d, review clean)
Task 6: minor (deferred): mid-flight Bezier/easing/h12/degenerate-cross path and exact drift offset untested in TS (Task 7 parity covers assembly 0.5 + drift cases GLSL vs TS)
Task 6: minor (deferred): packPartTexture redundant zero write; partTransforms does not clamp assembly
Ruling: the controller ruling uint(x + 0.5) was WRONG for odd seeds in [2^23, 2^24); implementer used uint(round(x)) — accepted; Task 8 must use the same — cost if wrong: none (round is exact for integers below 2^24).
Ruling: accept moteSinCos (high-precision sin/cos) replacing builtins in mote.glsl — SwiftShader builtin error ~1e-4 times radius 12 broke 1e-3 parity — cost if wrong: extra ALU per mote; spike 2 (vertex cost) measures it.
Note: mote.glsl declares its own uniforms, so include it only in vertex shaders (carry into Task 8).
Task 7: complete (commits 679163d..d0bdd20, review clean)
Task 7: minor (deferred, carried into Task 8): mote.glsl relies on highp int/uint/float; must be included only with precision highp float/int prelude (mobile mediump would break pcg)
Task 7: minor (deferred): pcg goldens collapsed into one case; degenerate-cross fallback unexercised; hash01 can round to 1.0 in GLSL (~3e-8); e2e does not assert no console.error; ?test=1 no-op on parity page
Ruling: plan defect (Task 6/8 vs spec 5.1 counts) — spec says human motes tens-hundreds, dialogue hundreds, but every specced core point was typed Human/Dialogue (~24k/~20k at 100k), whiting out the core under additive blending. Decision: keep provenance typing (core reads warm/violet as material) but only a hash-selected HERO fraction renders in the large form: heroes = hash01(seed,15) below 0.01 for Human (haloed, ~hundreds) and below 0.03 for Dialogue (twin orbit + thread, ~hundreds of pairs); non-hero points render as small sharp points in their type color (agent size/cap). Thread alpha restored to the brief value 0.25 for hero pairs. Rendering-only change; mote() and parity untouched — cost if wrong: retune two fractions and sizes.
Ruling: accept Task 8 visuals after hero fix — controller viewed shots: specced core reads warm/violet speckle vs all-blue vibed; remaining near-white on dense tooth outlines, crank and bracket is a density/brightness tuning issue deferred to a visual polish pass (author taste call) — cost if wrong: outlines stay bright until tuned.
Task 8: ⚠️ hero counts/thread path unverified in committed tests — resolved by carrying an in-flight shot into Task 10 shots (vibe-build local 0.1 is mid-flight).
Ruling: pixel caps stay in drawing-buffer pixels for now (halo 48 device px = 24 CSS px at DPR 2) — fill-rate spike 1 measures in device pixels; revisit in visual polish — cost if wrong: halos half-size on retina until tuned.
Task 8: complete (commits d0bdd20..5cd3c3c, review clean)
Task 8: minor (deferred): vibed no-amber assertion misses sparse regressions (add warm-hue count); WebGL GL_INVALID warnings not captured; invalid ?state= fallback and dispose() untested; thread mesh runs mote() for all 100k instances; type clamp inconsistent between mote.vert and thread.vert; halo 0.5 factor and diagonal shimmer are disclosed deviations
Ruling: Task 9 pre-review fixes — (a) trailing 100vh spacer so scroll range equals sum of section heights and panels align with spans (correctness); (b) spec camera reframed so the drive gear sits right of the text panel — cost if wrong: one spacer element / camera numbers to retune.
Ruling: Task 9 ghost too bright at close range deferred to visual polish — cost if wrong: ghost reads strong in spec section until tuned.
Task 9: ⚠️ commit trailer/branch verified by controller via git log. Word count relies on content lint (passes).
Task 9: fix round 1/5 pre-review (2 addressed — spacer/panel alignment, spec framing; commits 9910970..c189f38)
Task 9: complete (commits 5cd3c3c..c189f38, review clean)
Task 9: minor (deferred): vibe-build drive gear half under the left panel (same class as spec framing)
Task 9: minor (deferred): 01-vibe-build alt text mentions a warm mote never rendered
Task 9: minor (deferred): applyCamera does not updateMatrixWorld (latent purity risk if update() reads camera)
Task 9: minor (deferred): settle() correct by one-frame margin; should also check no pending rAF/driver update
Task 9: minor (deferred): resize rounding random walk; iOS URL-bar resize cancels momentum (mobile pass)
Task 9: minor (deferred): e2e hard-codes story lengths/count; driver has no unit test for dispose
Ruling: accept 8 wheel steps (4 per detour hop) instead of the plan 40 — each SwiftShader frame costs ~2.4 s at 100k so 40 steps timed out; mutation check proves the test still catches accumulation — cost if wrong: fewer intermediate frames exercised; a ?n= reduced budget could restore 40 steps later.
Task 10: minor (deferred): mutation check not reproducible from repo (report only)
Task 10: fix round 1/5 (3 addressed, 0 open — non-blank pngjs guard + pairwise differ, backward landing detour, readSpans guards + attachments; commits 1fd79ca..3c6f58f)
Task 10: complete (commits c189f38..3c6f58f, review clean)
Task 10: minor (deferred): mutation re-run covered only p=0.41
Ruling: accept ?isolate=1 on vertex spike (1px scissor so GPU time approximates vertex cost) — directly serves spike 2 decision (4 ms threshold) — cost if wrong: one extra query param.
Task 11: fix round 1/5 (3 addressed, 0 open — copy fallback selection, CPU vs frame interval, counts/base_path/wording; commits bd4a432..9e4e2d3)
Task 11: complete (commits 3c6f58f..9e4e2d3, review clean)
Task 11: minor (deferred): floattex no negative test; pages workflow does not gate on tests; disjoint flag read order; renderer_ naming; HUD found by id; createQuery null on lost context; counts test written after code; pages workflow and iOS clipboard untested on real targets
Final review: With fixes. Must-fix: pages gating, applyCamera updateMatrixWorld, README. Also folded in: reduced-motion shimmer (spec 6.1), hash01 exact [0,1), explodedOffset rotation semantics.
Ruling: final-review Important 1 (mechanism coupling: camera keys in gear world coords, gear-specific tests/spikes, ACTIVE_MECHANISM typing) and Important 3 (single attribute layout, parity through instanceAttrs, MoteOut key fence) become the first tasks of Plan 2 — they do not affect Plan 1 behavior and must precede normals/new mechanisms — cost if wrong: Plan 2 starts with refactors.
Ruling: correction to Task 5 ruling — explodedOffset rotation now applies about the part posed position (fix wave item 6).
Final fix wave: dispatched (base 9e4e2d3)
Note (author, 2026-10-03): audience is now public (Reddit) plus friends at work; spec 1 to be updated in Plan 2. Author requests a Fable-model visual review once 3D is in — added as Plan 2 Task 9.
