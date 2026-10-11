# Act II re-skin: the author's decisions

Every look the author picked for the Act II re-skin, in one place: what was decided, what it looks like,
and where the prototype lives. The spec (`docs/specs/2026-10-09-act-2-reskin.md`) and the plan
(`2026-10-09-act-2-reskin.md`) carry the same decisions as requirements; this page is the short version for
a reader who wasn't there. Stills are in `2026-10-09-act-2-reskin-looks/`. The prototypes are committed
under `scratch/session/` and run from a static server at the repo root (they import three.js from
`node_modules`). Their own stills are not in git (`scratch/.gitignore`); they regenerate from the mocks.
The published pages are private links for the author.

Add a row whenever the author decides something; never rewrite a past decision, supersede it.

The work moved to this public repo on 2026-10-11. Commit ids from before that live in the archive repo
`cheapsteak/motes-of-work-private`, which keeps the full earlier history.

## The galaxy

| Decision | What it means | Prototype | Still |
|---|---|---|---|
| The galaxy uses the tuner's literal **Recommended** preset (2026-10-09; "I meant the preset named recommended") | Not "Readable + colour". Superseded for the background by the next row. | `scratch/session/galaxytuner/` | |
| The background is **Wisps (reviewed)** (2026-10-10) | The arms are not a filled outline: they emerge from flow-aligned wisps. Halo overlap is fine; the warmest stars' richer amber is fine. | `scratch/session/galaxytuner/` (`gen.js`, preset `WISPS_REVIEWED`); published: Galaxy tuner | `galaxy-wisps-reviewed-phone.png` |
| The neighbourhood **dissolves late** (2026-10-10) | From afar the 30 neighbourhood stars are ordinary stars of the arm (the nearest background star is pulled onto each spot); their real form fades in over 11→16 px of glow. | same, "Dissolve (late)" | `galaxy-hood-dissolve-late-phone.png`, `galaxy-hood-dissolve-late-mid-phone.png` |
| Budget: err high (2026-10-09) | `GALAXY_SHARE` 0.935 (93,500); dial down after the real-phone check. | | |
| Neighbourhood spacing **1.5×** (2026-10-10) | Two systems' stars at least 1.5 × their combined outer radii apart, so no pair reads as touching. Task 1d. | `scratch/session/binaries/mock.html` option b | `binaries-four-options-sheet.png` (b) |
| **S-type binary stars** (2026-10-10; "S type looks pretty good") | Today's closest filler pairs become binaries: the two stars orbit their barycentre, each keeps only the planets inside its stability limit. Scripted stars, and N0's star, are never paired. Task 1e. | `scratch/session/binaries/` (notes and mock, option c) | `binaries-s-type-close-phone.png` |
| ly-4's code is born in view (2026-10-11) | The ride ends with a short push-in on star-4, lit alone, and holds while its new planet lands; the planet is a small point (at least 4 px). Accepted as is. | | |
| **One binary pair** in the essay's galaxy (2026-10-11) | The capped placement gives the essay's galaxy one pair (star-7 + star-14, near the middle); keep it and re-fit the two shots it touches (up-2, fx-3). | `scratch/session/binaries/` | |
| ly-5 opens **aimed at the first plan** (2026-10-11; "B looks good") | After ly-4's hold, the camera swings to P_a over 3.50–3.53 (lamp steps mid-swing), so a phone never shows empty sky; desktop unchanged. | `scratch/session/ly5cmp/` (strips, video, patches) | |

## Stars, plans and the black hole

| Decision | What it means | Prototype | Still |
|---|---|---|---|
| Star spikes: **fewer and fainter** (2026-10-10) | The six core balls are expected until the black hole lands. | | |
| The black hole uses the **inspector's defaults** (2026-10-09) | The disk is drawn in dots, not the shader field (dots look better and cost less on a phone). | `scratch/session/bhmock/`; published: Black hole inspector | `black-hole-inspector-defaults-phone.png` |
| Disk motion: **Recommended**, streak lifetimes (2026-10-10) | Dots live along short arcs and are reborn (L = 3600/N), sheared, with a few hot spots. | `scratch/session/diskmotion/`; published: disk motion prototype | `disk-motion-recommended.png` |
| The hole close is a **true 16° view** for now (2026-10-11; may switch to about 26° later) | The essay keeps elevation 16 (as the disk-motion still); the inspector-defaults still is about 26° (camera lifted), a thicker disk. Switching is one value plus a re-fit of distance and lamp steps. | | `disk-motion-recommended.png` (16°), `black-hole-inspector-defaults-phone.png` (about 26°) |
| Plans are **schematics** of their star system, not spiked stars (2026-10-10) | Sci-fi, a plan or design, not monitoring: no sweep, no counters. **R** (bands, outlines, stalks, graduations, one dimension) for one system up close; **H** (mission plan: dashed forward arcs, nodes, chevrons) for the neighbourhood. | `scratch/session/schematic/` (`mock.html`, `port.html`); published: Schematic mocks | `schematic-close-defect-phone.png`, `schematic-neighbourhood-twelve-phone.png` |
| The zoom hand-over is **one geometry morphing**, staggered (round 4, 2026-10-10; "Schematics look good") | H's rings become R's bands, dashes close, nodes grow into outlines, numerals arrive last; detail dissolves in by hash rank, no hard switch. Task 7b. | same, concept `RH` | `schematic-zoom-handover-strip.png` |
| **ls-1 stays unmarked** (2026-10-10) | The outer ring's window starts at 30 s_px, so ls-1's systems draw no plan. | | |

## The defect

| Decision | What it means | Prototype | Still |
|---|---|---|---|
| The defect must look unhealthy, glitchy, not calm (2026-10-10) | Far away needs no special case: distance and the low-detail model hide it. | `scratch/session/defect/inspector.html`; published: Defect inspector | |
| Variant **18, burst + leak + dropout** (2026-10-10; "Version 18 of the defect looks great") | Today's scatter burst; two wounds open just after each burst and leak dots for up to two seconds (frac 0.75, reach 1.8×, dim 15 %); dropout scanlines. The first burst must not keep the reader waiting (within 4 s of the derp). Task 8b. | same, variant `v18-c5-burst-leak-drop` | `defect-v18-burst-leak-dropout-strip.png` |

## Look check

How the essay is held to this page (plan, Global Constraints, "The look check"):
- Each task that changes the screen shoots the essay beside every still below that it touches.
- The task review judges each pair.
- Before every republish, an independent judge walks the whole table.
- Task 9 makes one sheet of all of it.

The prototypes' framings are not the essay's, so compare at the nearest essay framing and judge the look
(shape, density, colour family, motion), not the pixel. A decided look the essay visibly lacks blocks; a
difference the author accepts becomes a new row above.

| Still | Essay framing to compare | Task(s) | Last check |
|---|---|---|---|
| `galaxy-wisps-reviewed-phone.png` | fr-1, the galaxy wide | 1b, 1c | 2026-10-10 task review and v21 judge: matches (lighter blue, paler warm stars, core balls: allowed) |
| `galaxy-hood-dissolve-late-phone.png` | the galaxy wide and fr-1: the 30 read as ordinary arm stars, no lattice | 1c | 2026-10-10 task review and v21 judge: matches |
| `galaxy-hood-dissolve-late-mid-phone.png` | the zoom-out at about zo-0.84 on a phone (the hand-over runs 0.80 to 0.88): the real forms fading | 1c | v21 judge: matches (real 1.00 to zo 0.80, 0.46 at 0.84, 0 from 0.87) |
| `binaries-four-options-sheet.png` (b) | the hood shot, ly-3 | 1d | |
| `binaries-s-type-close-phone.png` | the closest framing of a paired system (ly-3 or ly-4) | 1e, 7b | |
| `black-hole-inspector-defaults-phone.png` | up-1 and tr-2 | 4, 5, 6 | |
| `disk-motion-recommended.png` | ly-2, the hole at rest (motion: watch it live) | 4, 5 | |
| `schematic-close-defect-phone.png` | df-1, df-2 | 7b | |
| `schematic-neighbourhood-twelve-phone.png` | df-5 | 7b | |
| `schematic-zoom-handover-strip.png` | df-3, the step back (scrub it) | 7b | |
| `defect-v18-burst-leak-dropout-strip.png` | df-1, df-2 (motion: watch it live) | 8b | |
| `ly5-opening-compare-phone.png` (row B) | ly-5's opening, phone, layers 3.50 to 3.58: the first plan in frame by 3.52, no empty sky | 1e | 1e task review: matches the B row |
| (no still) fewer, fainter star spikes | ly-3, fr-1 | 1b and later | v21 judge: matches (2 faint spiked stars of 25 at ly-3, none at fr-1) |

## Published versions

| Version | Commit | What it shows | Look check |
|---|---|---|---|
| 21 (2026-10-10) | 62ed247 (branch `reskin-v21` in the archive repo `motes-of-work-private`) | the wisps galaxy, the late dissolve, the hold at ly-3, up-2, fx-3 and ls-1 | independent judge: PUBLISH; every built row matches |
| 22 (2026-10-11) | a6c9dd7 (public `main`) | the wider neighbourhood, one S-type binary pair near its middle, ly-4's push-in on a planet being born, ly-5 opening on the first plan | independent judge: PUBLISH; every built row matches (pair orbits its barycentre, 15 degrees a minute riding the turn) |

## Process

| Decision | What it means |
|---|---|
| Performance work waits until after the essay review (2026-10-10) | See `2026-10-10-performance-deferred.md`; the early-out's fix round is on branch `perf-deferred` in the archive repo `motes-of-work-private`. |
| An **unreviewed preview** beside the reviewed essay (2026-10-11) | Rebuilt after each implementer report and fix round, for earlier feedback; the reviewed essay keeps its gate. See `2026-10-11-act-2-reskin-lanes.md`. |
| The remaining tasks run in **two lanes**, e2e on GitHub (2026-10-11) | Lane A: 6, then 7b. Lane B: 8b first, then 7, then 8. Then 9. One PR per task; see `2026-10-11-act-2-reskin-lanes.md`. |
