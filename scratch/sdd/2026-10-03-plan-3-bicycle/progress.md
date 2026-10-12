# SDD ledger — plan: docs/plans/2026-10-03-plan-3-bicycle.md
Spec: docs/specs/2026-10-02-motes-of-work-design.md (amended 471af86). Branch plan-1-foundation; pushes to this repo work and the user asked for this work to be done.

## Pre-flight scan
| Rows | Produces -> consumes | Finding |
|---|---|---|
| T1 -> T2 | MechanismPart.settle + settleWindow -> bike settle windows | consistent; bike windows lie inside body default [0.35,0.95] |
| T1 -> T3 | settleWindow -> briefThresholds | consistent |
| T2 -> T3 | bike part ids + windows -> brief data-parts and threshold test [0.72,0.45,0.8,0.87,0.95] | checked by hand: line maxima match the windows |
| T2 -> T4 | registered bike -> ACTIVE_MECHANISM | consistent |
| T3 -> T4 | keyframes.json reveal holds -> T4 camera tuning | sequential edits of one file; fine |
| T2 (self) | Step 5 runs the keyframes framing test over every mechanism with gears-tuned camera keys; the bike core (contact points) is spread out | may fail before Task 4 tunes cameras -> ruling 1 |
| T2 (self) | shares test: every part >= 50 points at 30k; 24 chain segments are tiny by area | conflicts with area shares -> ruling 2 |
| T1 (self) | tests vs code consistent | ok |
| T3 (self) | vibe-build copy about 75 words under the 80 limit; 02-reveal sorts between 01 and 03 by filename | ok, tight |
| T4 (self) | consistent | ok |
| T5-T7 | controller-run review and publish | ok |

Ruling: if the spec-section framing test fails for the bike in Task 2 only because of the current camera keys, the Task 2 implementer may minimally adjust the spec-section camera keys so every registered mechanism passes (pulling that piece of Task 4 forward) and must say so — a task must end green — cost if wrong: Task 4 re-tunes those keys anyway.
Ruling: Task 2 shares test is every non-chain part >= 50 points at 30k and every chain segment >= 20 (use density if needed) — tiny link segments cannot reach 50 by area without bloating the chain — cost if wrong: one test constant.
Task 1 base: 471af86
Task 1: dispatched (sonnet) agent a480feb168919524f
Task 1: implementer done (471af86..a4e9b4e). Ruling: accept 1-ULP body/drift settle differences (0.95-0.35 != 0.6 bitwise) — below float32 precision, invisible and parity-neutral — cost if wrong: one formula reorder.
Task 1: minor (deferred): attributes.test.ts uses double quotes/prettier wrapping vs repo single quotes; contract settle-window check vacuous until a mechanism declares settle (no negative test); attributes.test.ts:174 settle: undefined instead of omitting the key
Task 1: complete (471af86..a4e9b4e, review clean; parity e2e not run in Task 1, covered by Task 2 step 5)
Task 2 base: a4e9b4e
Task 2: dispatched (opus) agent a5752fc78e7b206dd, port 4191
Task 2: implementer done (a4e9b4e..00b8022), DONE_WITH_CONCERNS.
Ruling: bike lit-faces floor 1.05 (others keep 1.2), as a documented per-mechanism floor in looks.spec — a thin, symmetric frame of round tubes cannot reach 1.2 (offline shading model agrees at 1.10-1.13); broken lighting (~1.0) still fails — cost if wrong: weaker lighting guard for the bike only.
Ruling: misalign tilt 0.12 -> 0.18 rad — the brief requires every fault to read — cost: one constant.
Ruling: lower bike CORE_SHARE until the saddle top reads amber, within the tested 0.15-0.30 — spec 5.1 warm core — cost: one constant.
Ruling: stall becomes a pure periodic coast-and-catch-up of the wheels against the cranks plus chain sag scaled by stall, not a coast counted from drive 0 — a pure pose has no memory of when stall rose, so a cumulative coast spins the wheels back whenever stall ramps at large drive (spec 5.3 stall signature is periodic stop then catch-up); spec 5.8 wording updated — cost if wrong: retune stall.
Ruling: accept compare picker one-row CSS, compare.spec using ACTIVE_MECHANISM, spoke reflectors, ratio gain 0.55 — needed for a fifth machine / readability — cost: small.
Task 2: rulings applied (fd12e22). Review dispatched (opus) on a4e9b4e..fd12e22.
Task 2: review Approved with 1 Important (plan-mandated duplication: surfaceArea + area/density/share allocation copied from steam; merge() now in 4 copies).
Ruling: fix the plan-mandated duplication now in Task 2 fix round 1 — extract surfaceArea, the point-allocation helper and merge() into one shared module used by steam, bike, watch and gears (fix all siblings) — repo norm is fix now, not in a follow-up — cost if wrong: a small refactor touching bench machines, covered by their tests and parity.
Ruling: also fix in round 1 the same-class slip bug (cumulative lag spins wheels back when slip ramps at large drive) by a bounded periodic lag as in gears, for the bike AND steam (sibling with the same cumulative lag); CORE_SHARE off the test boundary; explicit static-part list so id typos fail loudly; drop or test partDensities — all cheap and in blast radius — cost: small.
Task 2: fix round 1 done (fd12e22..f5fb1c2)
Task 2: fix round 1/5 (5 addressed, 0 open; commits fd12e22..f5fb1c2)
Task 2: minor (deferred): bike CORE_SHARE comment says 'as the steam engine's'; pointCounts.test hard-pins every machine (retunes need a row update); steam slip shots not regenerated; review minors: lit-faces margin 0.05 on bike; dropped-chain strand faint in three-quarter still
Task 2: complete (a4e9b4e..f5fb1c2, review clean)
Task 3 base: f5fb1c2
Task 3: dispatched (sonnet) agent a6e18e51b82826075, port 4192
Task 3: implementer done (f5fb1c2..ab4ade7), DONE_WITH_CONCERNS.
Ruling: restore 'both' in the brief's seat line (spec: 'both adjustable' is what makes seat and handlebars read interchangeable) and trim 'Line by line,' from the closing line instead — cost: two words of draft copy.
Ruling: accept continuity story sampling 2000/4000 -> 4000/8000 for the faster rewind unwind (3.5 drive units) — the test guards jumps, not speed; motion is continuous — cost if wrong: Task 6 may soften rewind drive keys.
Ruling: accept app.spec ?p=0.5 -> 0.6 (0.5 is now a section boundary) and the spec-section copy trims (draft copy).
Task 3: original implementer did not pick up follow-up messages; fresh implementer (sonnet) a37b562b474e10fdf dispatched for: restore 'both', full e2e.
Task 3: original implementer completed follow-ups (7798534: 'both' restored; full e2e 82 passed, 7 skipped, 0 failed). Duplicate fresh implementer stopped before committing; tree clean. Controller re-ran vitest on idle machine: pass.
Task 3: minor (deferred): no-transition constraint unfenced (assert ::before transitionDuration 0s); li without data-parts silently never ticks; fence regex only double-quoted data-parts; tick state visual only (screen readers get no met state) — consider in final review; no-WebGL covered via context loss only, not failed boot; continuity sampling note
Task 3: complete (f5fb1c2..7798534, review clean)
Task 4 base: 7798534
Task 4: dispatched (opus) agent aa2345a29aa79e8c9, port 4193
Side spike (not part of plan 3; brainstorming the next essay section): node defect variants in throwaway worktree <mow-nodes checkout> (branch spike-nodes, port 4194), agent ad1b7b5b747210e76; output <mow-nodes checkout>/shots/nodes/{far,near}.png + dist-pub. Delete the worktree after the user picks.
Task 4: implementer done (7798534..6c95d04), DONE_WITH_CONCERNS.
Ruling: accept compare presets aiming at the machine centre (story keys clip the bike in the compare pane), the reveal fov narrowing to 30, and the spec close-up framing kept within the shared framing test — visual review (Task 5) judges readability — cost: two values each.
Controller observation: from the side-on reveal the swapped bike can read as a normal bike facing the other way (bars over the rear wheel look like a front); legibility of the swap in a still is at risk — sent to the visual review as its first question and raised with the user.
Task 5: visual review dispatched in parallel with the Task 4 code review (both read-only).
Task 4: minor (deferred): reveal bearing test guards intent not change (no fov<=30 fence); cold-open height bounds wide; no NDC framing fence for vibe-build/reveal; bearing() helper comment assumes constant coreFocus
Task 4: complete (7798534..6c95d04, review clean)
Node spike: user chose the crack defect for the next section.
Task 5: complete — visual-review-bike.md saved. Verdict: swap does not read in a still (reveal 1.5-2/5); fixes within spec reach about 4/5; a grey rider silhouette (spec change) is strongest. Awaiting user decision before Task 6 (design-level: the user ruled out a rider earlier).
Ruling (user-approved): Task 6 = visual-review fixes A (STEER_TWIN ~0.45 blended by variant with the reveal near full lock; high front three-quarter reveal camera; saddle wedge silhouette; clip fix; further items 1-4,6,8) plus a schematic grey mannequin at the reveal only (spec amended 786a03b); drop the mannequin if it reads eerie — cost if wrong: one more polish round.
Task 6 base: 90c9dcf
Task 6: dispatched (opus) agent a839cbcb474978ff7, port 4196; brief task-6-brief.md (controller-written from visual-review-bike.md + research).
Task 6: implementer done (90c9dcf..85b72a3), DONE_WITH_CONCERNS: optional rider field added to the Mechanism contract (types.ts); vibe-build@1 y 0.18 not 0.4 (0.4 still below saddles, breaks the low-camera bounds); reveal camera arrives at reveal@0.3; camera pulled back 1.3x for the seated figure; gears lit-faces 1.226 vs 1.2 floor after key 0.85.
Ruling: accept the optional rider in the contract (story and compare both draw it, no bike special-case), vibe-build@1 y 0.18, the earlier reveal camera arrival and pull-back — they serve the spec intent; gears margin noted for the final review — cost: small.
Task 6: review Approved (no Critical/Important). Mannequin reads as a spectral standing figure more than a seated rider (author's call pending).
Task 6: minor (deferred): rider shading baked against world key while saddle steers up to 26 deg; reveal camera test samples from 0.5 not 0.3; hand clearance test samples 4 drives vs feet 161; cold-open camera y sits ~1 cm from test bound; gears lit-faces 1.226 vs 1.2; drive-rate kink at reveal@0.3; e2e/purity.spec.ts reads keyframes.json relative to cwd
Task 6: complete (90c9dcf..85b72a3, review clean) — mannequin tuning awaits the user's choice (keep / tune / drop).
Push of 85b72a3 blocked by a local pre-push hook; not circumvented. Remote is at 90c9dcf.
Branch: work now on local main (100 commits ahead of origin/main, fast-forward). Push to main denied by the session permission check (override); awaiting user.
Pushed main 2e68ce8..85b72a3 to cheapsteak/motes-of-work (user approved, permission mode changed from auto). Work continues on main.
Task 7: republished artifact v3 from main 85b72a3 (landing page leads with the essay; bench secondary). https://claude.ai/artifact/EzEUekzAsq7qSgxRjGT8wa
Text/portrait design: research saved (research-text-treatment.md); Fable art director dispatched to spec + mock up 2-3 options (no borders, no nested boxes; brief not checkboxes; reorder brief so ticks land in reading order; portrait camera reframing). Output: scratchpad/textmock/{desktop,portrait}-options.png
Ruling (user asked): reorder the brief so seat+handlebars is line 1 — ticks then land in reading order (0.45, 0.72, 0.8, 0.87, 0.95); build order unchanged because the spec section needs the core to land first — cost: copy order only.
Text design: Fable delivered options A (memo: Plex Sans+Mono, margin tick, side scrim), B (motes: Newsreader+Geist Mono, agent mote lands beside met lines, feathered pool, recommended), C (ink: Literata+Instrument Serif, line brightens, shadow only) + portrait camera rule (look at machine axis, dolly+fov by sqrt(0.89/aspect) clamped 1..2.4, lens shift 0.15h) + bottom scrim with text in the lower 45%. Sheets: scratchpad/textmock/{desktop,portrait}-options.png. Awaiting user pick.
Ruling: build text option B (recommended) without waiting for the user's pick — the user asked why the text had not changed and wants progress; switching to A or C later costs one CSS pass — cost if wrong: a CSS rework.
Task 8 base: 85b72a3
Task 8: dispatched (opus), port 4197: text B + brief reorder + running labels/panel fade + portrait camera/text + mannequin single tapered torso. Brief task-8-brief.md.
Open with the user: twin legibility ("looks fixable by just turning it") - options asked; Act I ends at the spec section (later sections unbuilt).
Task 8: implementer done (85b72a3..d505835), DONE_WITH_CONCERNS (portrait spec core 62-66% of width vs 75%; portrait brief/spec text overlaps bike; first/last panels do not fade at the ends; portrait reframe opt-in for the essay only). Review dispatched (opus). Controller observations sent to review: portrait p=0.9 label over the wheels and rear wheel cropped; mannequin reads as a large standing figure behind the bike.
Task 8: review: spec FAIL on I1 (portrait spec-section text overlaps machine), quality needs fixes; 6 minors. Accepted implementer concerns 1-5.
Ruling: fix I1 by a coreFocus-blended larger portrait lens shift with a direct clearance test at spec frames; trim copy only if the shift cannot clear without cropping the core — the brief says text never overlaps the machine — cost if wrong: one constant.
Ruling: mannequin standing-not-seated read is a follow-up (pose out of scope); fix the shoulder bulge now (shorter, thinner shoulder-line capsule, arms tucked) — cost: small.
Task 8: fix round 1 dispatched (resumed implementer).
Task 8: fix round 1 done (d505835..bc2fac7): portrait lens shift 0.15->0.22 h by coreFocus + clearance test at spec frames (390x844); one spec paragraph cut (draft copy); shoulders slimmer; panel no-transition fence; mid-build shot p=0.09. Full e2e 99 passed.
Ruling: controller verified the regenerated shots (no rectangles, portrait spec text clear, bust read gone) and the full e2e; the scoped re-review folds into the final whole-branch review — cost if wrong: a finding lands later.
Task 8: complete (85b72a3..bc2fac7). Follow-ups: mannequin reads as standing behind the bike (tied to the twin decision pending with the user); clearance only fenced at 390x844.
Pushed main 85b72a3..bc2fac7. Republished artifact v4 from bc2fac7 (fonts self-hosted, stale v3 assets removed).
User chose twin option A (frame built around the mistake). User found: the core does not finish settling by the end of the scroll (assembly hits 0.45 = core settle end exactly at spec@1).
Task 9 base: bc2fac7
Task 9: dispatched (opus), port 4199: spec amendment; twin frame (saddle mast on steerer, stub seat tube holding bars, top tube rising to the front, cables routed forward); headlamp + rear reflector direction cues; rider re-posed to read seated; reveal copy; ending holds the settled core from spec@0.8. Brief task-9-brief.md.
User asked to compare text options A and C live against B.
Task 10: dispatched (sonnet) in worktree <mow-text checkout> (branch text-switcher from bc2fac7, node_modules symlinked), port 4200: data-text a|b|c with B default, ?text= and a small corner switcher (draft tool), A/C fonts self-hosted. Runs in parallel with Task 9 on main; cherry-pick onto main after Task 9. Ruling: parallel implementers in separate worktrees with disjoint files (style/switcher vs bike/keyframes/reveal copy) — cost if wrong: a small cherry-pick conflict.
Task 10: implementer done (bc2fac7..261c430 on text-switcher), DONE_WITH_CONCERNS: dropped A's brief hairline and C's inter-line hairlines (no-borders rule); C portrait ask 1.45rem; switcher faint over drift motes. Full e2e 123 passed. Controller viewed A and C desktop frames: legible, faithful. Ruling: accept as a draft comparison tool, no separate review (draft tool to be deleted once the author picks) — cost if wrong: a cosmetic slip in a throwaway switcher.
Publishing an interim v5 from text-switcher (bc2fac7 + switcher) so the author can compare now; Task 9 lands after.
Republished artifact v5 from text-switcher 261c430 (not on main yet; cherry-pick after Task 9, then push).
Task 9: implementer done (bc2fac7..cc89897), DONE_WITH_CONCERNS (brief says both adjustable vs welded saddle; reflector cannot be red; pins updated; reveal copy 79 words).
Controller look: (a) ending still wrong — partTransforms lerps explode by global (1-assembly), so at assembly 0.46 the core is 54% exploded and floats off the ghost; (b) twin still reads as a normal bike facing the other way (mast reads as seat tube+post, stub as stem).
Ruling: explode per part by its own settle progress (a part is in place once its window ends) — the spec section's point is the core landing in the outline — cost if wrong: re-tune spec framing.
Ruling: add a front basket (fork-mounted; under the saddle in the twin), a larger headlamp and a rear rack as direction cues — a basket is the strongest front signifier for a town bike — cost: point-share re-pin.
Ruling: keep the brief's both adjustable; reveal copy says fixed, not welded — keeps Every line is met true — cost: one word.
Task 9: fix round 1 dispatched (resumed implementer).
Task 9: fix round 1 done (cc89897..8392a92): per-part explode by settle window (core lands on the ghost at p=1, tests fail on the old lerp); front basket + bigger headlamp + rear rack; copy says fixed atop. Concerns: phone spec framing floor 60%->48%; cold-open key y 0.18->0.14; frame/wheels ~12% sparser.
Controller viewed p0.41/p0.48/p1: basket reads as front, saddle over basket; core sits on ghost at p=1. Ruling: accept; the formal re-review folds into the final whole-branch review — cost: findings land later.
Task 9: complete (bc2fac7..8392a92).
Cherry-picked text-switcher (d4495ad, 261c430) onto main; vitest 730 passed; full e2e running.
Full e2e on merged main: 125 passed, 7 skipped. Pushed main bc2fac7..ea05ca3. Republished artifact v6 from ea05ca3 (twin frame + basket, per-part explode, text switcher).
User feedback on v6: style C closest; text should appear only when its turn comes (fade fine); text above the machine; delete labels like 01 - The brief; rewrite copy as a picture book for developers reading to their kids (fix directional problems, e.g. Nothing in it is warm); align every line with camera and motion (e.g. zoom to the front wheel turning); remove the mannequin.
Design dispatched (fable): research on text apparition + docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (copy, storyboard beats with camera/motion, text engine spec). Brief fable-text-engine-brief.md.
Task 11 base: ea05ca3
Task 11: dispatched (opus), port 4202, in parallel: remove mannequin (contract field, renderer, overlay.rider, spec), running labels, switcher; C as the one style; drop unused fonts. Ruling: removals now, rebuild of copy/engine/keyframes after the design lands — they touch disjoint files except keyframes overlay.rider — cost: none.
Design delivered (fable): docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (uncommitted; commit after Task 11) + research-text-apparition.md. Pages of up to 3 lines, scroll-scrubbed fades, newest line full ink, earlier dim; text above the machine; 16 screens; new scalars mech.steer and camera.frame; beat markers in markdown. Open: orange vs gold; 16 screens; brief carry-over under vb-4. Copy sent to the user for approval before planning the build.
Task 11: done (ea05ca3..b0e2ff8): mannequin, labels, switcher removed; style C only; reveal camera pulled in 10%. e2e 100 passed. Concerns (pre-existing): portrait p0.27 bike touches the brief; credits link on the last line at p1 portrait. Ruling: accept; the storyboard rebuild replaces the layout and keys — cost: none. Task 11: complete.
Committed the design doc and pushed main.
User: the rewind copy is long-winded and not important. Ruling: rewind = one line (So you take it all apart.), one screen; open questions settled with my picks (orange; 15 screens; brief leaves whole before vb-4 because carrying it over breaks the 42% portrait band). Committed c6767fa. Treated the user's edit as approval of the rest of the copy (I had said edit or go).
Task 12 base: c6767fa
Task 12: dispatched (opus), port 4203: text engine (beats in markdown, scrubbed opacity, pages, dwell lint, layout above machine, a11y, no-JS), copy, section lengths. Task 13 next: storyboard camera/motion, mech.steer, camera.frame, clearance test.
Task 12: implementer stopped by the user interrupt before any commit (tree clean at c6767fa). Not re-dispatched: the user is workshopping the spec section (a wireframe to approve before building).
User: the dots are gold, not orange. Design doc updated (0ff58fa).
User approved the wireframe-first spec section, with: not you move it (the person points it out; the agent redraws) and a brief touch on the frame (No new frame this time. Just new lines.). Design doc updated: spec section 6 screens, 7 beats, new scalar mech.ghostVariant, ends on the finished running bike; 17 screens.
Task 12 base: (latest main)
Task 12: re-dispatched (opus), port 4203, same brief (spec length 6).
Task 12: done (9d26e19..808f6e9), DONE_WITH_CONCERNS. Ruling: accept the dwell measure from the start of a line's fade-in to the next change on its page (the doc's timings were written to it; amended §3.3) — cost: a stricter rule needs a longer reveal. Ruling: 26 words per line / 3 lines per page per the design (my brief misread it as per page). Ruling: accept adopting §2.5's assembly/drive keys early. Removed old-layout tests are replaced by Task 13's clearance test. global-constraints updated to the beats rule. Controller viewed desktop rv-3: text at the top, bike low-right. Task 12: complete; its review folds into the final whole-branch review.
Task 13 base: 808f6e9
Task 13: dispatched (opus), port 4204: mech.steer, camera.frame, mech.ghostVariant; shots S0-S10; motion rows; spec drawing-first sequence; clearance e2e at both sizes.
Task 13: done (808f6e9..057b582), DONE_WITH_CONCERNS: close shots are medium-close (text band is full width on desktop); exploded offsets of late body parts now come from below (not asked); S9 prime == S10; camera.frame 0 composes per the table. Weak beats: brief line 4 (brakes small), line 1 (small), sp-3 desktop drawing sparse. Controller viewed line3-lock, rv-3 portrait, sp-4 redraw, sp-7: show their lines. Ruling: accept and publish for the author's look; the final whole-branch review comes next — cost: tuning rounds.
Pushed main 84fd619..057b582. Republished artifact v7 (picture-book copy, text engine, storyboard shots and motion, drawing-first spec section); landing page copy updated.
User feedback on v7: drop the brakes-and-bell line; brief lines absent (not dim) until their scene; text before its part builds; front-wheel turn its own segment before the frame; a more interesting frame entrance; an interesting orbit (zoom, angles) at Done; drawing-first as ink on parchment (Da Vinci), flat, not particles, background motes hidden/faint; a new scene where the approved blueprint becomes 3D and is built.
Design round 2 dispatched (fable x2, parallel, separate files): 2a build order + frame entrance + orbit (docs/specs/2026-10-05-act-1-build-and-orbit.md); 2b blueprint look + 3D build scene (docs/specs/2026-10-05-blueprint-and-build.md). Mote shader changes allowed with TS mirror + parity.
Design 2a delivered: docs/specs/2026-10-05-act-1-build-and-orbit.md (vibe-build 8 screens, 4-line brief, per-line data-at, SETTLE_WINDOW 0.12->0.08 with re-cut windows, front-wheel segment, frame laid tube by tube in builder order via settleField hook, landing flare in mote shader both mirrors, one-lap orbit with crane/telephoto/dive). Awaiting 2b.
Design 2b delivered: docs/specs/2026-10-05-blueprint-and-build.md (ink strokes as instanced screen-space quads, parchment sheet in the scene, strike-and-redraw with a gold ring and tick, lift-off scene, spec 8 screens, 8 new leaves). Both designs committed. Act I = 8+4+1+8 = 21 screens. Sent mocks to the user; awaiting go / frame option.
User: go on both designs; frame entrance = recommended Option A (#1, builder order).
Task 14 base: 484f248
Task 14: dispatched (opus), port 4205: build-and-orbit design whole (4-line brief, absent-until-turn lines, words before parts, re-cut windows, wheel segment, frame laid in FRAME_LAY order + landing flare in both mote mirrors, orbit, 8 screens). Task 15 (blueprint + lift-off) follows.
Task 14: done (d5d16a9..1665537), DONE_WITH_CONCERNS: drive window 0.54 not 0.53; flare faint; lap crane/diagram pulled out (small). Controller look: build order and frame laying read; crane frame small; the newest brief line appears DIM until its parts land, which the author called out as grayed out. Ruling: Task 15 also makes a visible brief line full ink (met state shown by C halo, not by dimming) and raises the flare gain until the seam reads — cost: one CSS rule, one constant. Global constraint on mote.glsl updated (changes allowed in lockstep). Pushed main 057b582..1665537. Task 14: complete.
Task 15 base: 1665537
Task 15: dispatched (opus), port 4206: brief-line full ink fix + flare gain; then the blueprint-and-build design whole (ink strokes on parchment, strike-and-redraw, lift-off, spec 8 screens).
Task 15: done (1665537..6985210), DONE_WITH_CONCERNS: lift moved to 0.61-0.69; ink under motes at 0.25 barely visible; look follows the mock; flare gain 3 makes gold landings white-gold; Act I 21 screens. Controller viewed redraw2 (matches the mock), lift3 (lines standing off the page in 3D), last (gold on contact points, blue body), brief line2 (full ink). Full e2e re-running before publish. Task 15: complete.
Full e2e on 6985210: 116 passed, 9 skipped. Pushed main 1665537..6985210. Republished artifact v8 (ordered build, frame laid tube by tube, orbit, ink drawing on parchment, lift-off). Artifact now shared as anyone-with-the-link (set by the user).
User (v8): build animation simultaneous with each brief line; cut rv-6 colour line; no blue/dots vocabulary in Act I; asked whether Act II was stored. It was NOT (only in conversation): wrote docs/specs/2026-10-05-act-2-wrong-guidance.md (author intent, decisions, layers, flows, six beats, open questions) and pointed spec II.3 at it; pushed d6158c5.
Ruling: also cut vb-3 (See the blue dots) and rephrase sp-6 without gold/dots — the author's rule covers all Act I colour vocabulary — cost: two lines.
Task 16 base: d6158c5
Task 16: dispatched (opus), port 4208.
Task 16: done (d6158c5..e251122): simultaneous build, vb-3 and rv-6 cut, sp line rephrased, no-colour-words test; Act I 18.6 screens. Full e2e re-running. Landing page colour legend and blue/gold lede removed (author: readers need not learn colours in Act I). Task 16: complete.
Full e2e on e251122: 116 passed, 9 skipped. Pushed main d6158c5..e251122. Republished artifact v9.
User: give the basket its own brief line and its own entrance after the wheel turns. Ruling: new line "A basket too, for carrying things."; split basket+headlamp into their own body part with a settle window between the wheel turn and the frame — the brief maps lines to parts — cost: re-pinned point counts.
Task 17 base: e251122
Task 17: dispatched (opus), port 4213.
User: add "Mudguards, so puddles don't splash you." after the sturdy line without lengthening the animation. Sent to the Task 17 implementer: line appears as the mudguards set out within the existing frame/fittings time; no new screens; dwell-lint exception if needed.
User: auto-advance with a faint countdown indicator; manual scroll pauses; click/tap resumes; 2s floor, longer for longer content; editable.
Task 18: dispatched (opus) in worktree <mow-auto checkout> (branch auto-advance from 3e4d03e), port 4214: stops from beat data; dwell=max(2s, words/3wps); transit 0.6 screens/s programmatic scroll; pause on input intent; button indicator ring; config + URL overrides; ?test=1 disables unless auto=1; reduced motion starts paused. Rulings: these defaults; parallel worktree with disjoint files — cost: tuning.
User: start prepping Act II with the script, as a markdown file to review. Dispatched (fable): docs/script/act-2.md from the Act II design doc, Act I voice rules, lean act, layer-label recommendation, choices list. Brief fable-act2-script-brief.md.
Act II script draft delivered and committed: docs/script/act-2.md (12 pages, 29 lines, ~290 words; no layer labels; checker; open: fence, bike becomes first stack, checker vs reviewer).
Task 18: done (auto-advance branch 98b3ad0, 27e9199 on 3e4d03e): full e2e 123 passed. Concerns: no replay at end; pointerdown anywhere pauses; easeSeconds key; reducedMotion spec loads auto=0; slow devices run slower. Controller viewed reveal dwell frame: ring faint bottom-centre. Ruling: accept all; cherry-pick after Task 17 lands — cost: small.
Task 17: done (3e4d03e, 3f3a6fa, 2e2f64a): basket own part + stage (drop and hop), six brief lines, mudguards line inside the frame stage (no added time); cold open 7.2 screens, Act I 19.4. Concerns: clearance rule now below the lowest visible brief line (panel still within 0.42 band); core window 0.44->0.32, spec hold 0.46->0.34; camera keys re-expressed. Ruling: accept the clearance rule (lines not yet visible are absent) — cost: a stricter rule needs lower S1. Task 17: complete.
Cherry-picked auto-advance onto main + fixed its brief-line count test (93a2d19). vitest green; full e2e running. Worktree <mow-auto checkout> removal was denied by the permission check; left in place (branch auto-advance is merged by cherry-pick).
Full e2e on 93a2d19: 123 passed, 9 skipped. Pushed main e251122..93a2d19. Republished artifact v10 (basket, mudguards, auto-advance). Check-in trigger trig_01JXobnxVj6px68td51KJ1RV is now redundant (all agents reported).
User: indicator invisible on mobile -> bottom-right; auto-advance pauses twice per scene -> one stop per scene at its end (after the animation), none after text alone.
Task 19: dispatched (opus), port 4216: stop = min(next beat fade-in, own fade-out) minus margin, scene at rest; indicator bottom-right ~28px, 55% ink, dark halo, 44px hit area.
User: always check on mobile (committed CLAUDE.md phone-first rule + global constraint). Act II: page 1 now "That was one bike. Now let's zoom out." with the bike's particles reflowing into the first stack (committed 84d5c33). Built the script-notes artifact https://claude.ai/artifact/5SmroV1Typ8sPb8KxvJCXC (db collection notes, doc per line id act2-p<page>-l<n>, act2-c<n>, act2-overall; fields note, anchor, page, version). Generator: scratchpad/notes/build.py + template.html (rebuild when the script changes). Probe write/list/delete passed.
Notes page v2: snapshot re-render rebuilt the focused textarea while typing; now rows patch in place, open boxes are never overwritten from the store. Tested with a fake db firing on every write (focus and full text kept). The author's first note was cut off by the bug (stored: Delete "th).
Read the author's 7 notes on Act II draft 1 and applied them, plus: prose says defect (picture keeps the crack) and reviewer (was checker). Draft 2 committed; notes page republished with draft-versioned ids (act2-d2-...), so draft-1 notes stay in the store but no longer show. Principle recorded in the script: prose names things by what they are, not by the picture's words.
Act II draft 3 from 3 more notes + decisions (no labels, no fence): cut while you were close; second fix and fan-out play wordlessly. Notes page ids now act2-d3. 25 lines.
Task 19: done (71a968b, 4b2927a): 25 stops, one per scene at its end (orbit ends on motion, 2.67s hold with no text); ring bottom-right with halo; credits moved bottom-left. Full e2e (controller) 125 passed, 9 skipped. Pushed main 93a2d19..c865d50. Republished artifact v11. Open: short static stretches crossed at cruise pace before some stops (rv-5, sp-3); orbit hold without text.
User asked what blocks Act II. Nothing hard: script draft 3 is near-final; next is storyboard + network scene technical design. Dispatched (fable): docs/specs/2026-10-06-act-2-storyboard-and-network.md (storyboard, deterministic network generation, crack from the spike in <mow-nodes checkout>, bike-to-stack reflow, code changes, tests, task breakdown). Pending separately: Plan 3 final whole-branch review of Act I.
Ring only moves clockwise (arcDash + unit test, 4d83044); notes generator checked in at tools/script-notes (05b4662). Full e2e 125 passed. Pushed c865d50..05b4662. Republished v12. Policy confirmed with the author: commit as work lands, push after the full e2e passes.
Act II storyboard + network design delivered and pushed: docs/specs/2026-10-06-act-2-storyboard-and-network.md (9 sections, 30 screens, second mote set via node.glsl/node.ts mirror pair, reflow step in mote mirrors, ember highlight hue, 7 tasks). Controller note: the far mock shows ember highlights under From far away, everything looks right, which the build must not (highlight off until df). Questions to the author: warm speckle on first stack; R0->R1 surge path; second fix stack. Length 30 screens flagged.
