
- **Purity (spec §6.1):** every frame, and every brief tick, is a pure function of scroll progress. Only the idle shimmer is time-based, and it is off under `?test=1` and `prefers-reduced-motion`. No `Math.random`, no clock, no module-level mutable state in `pose`.
- **Parity:** `mote.glsl` and `mote.ts` change only together, when an approved design asks (the landing flare did); `e2e/parity.spec.ts` compares them. Per-part settle windows are a TypeScript-only attribute input; `e2e/parity.spec.ts` must stay green over every registered mechanism.
- **Mechanism contract:** `src/mechanisms/types.ts`, with the rules in `docs/adding-a-mechanism.md` (pure `pose`, exact budgets, unit normals, faults except `drift` handled in `pose`, modest core `explodedOffset`s, machine faces +z, bounding radius about 2.5 units).
- **Copy:** sentence case for all UI text; story text in beats and pages per docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (at most 26 words a line, 3 lines a page; `src/story/content.test.ts`); story copy is draft (`draft: true`) — the final wording is the author's.
- **Publication-safe:** no employer or company names, internal paths, issue numbers or people's names in code, copy, comments or commit messages.
- **Licensing:** port only MIT/BSD/Apache/public-domain code, with notices in `CREDITS.md`; NC/SA/LGPL/unlicensed sources are study-only. Bicycle geometry here is from first principles and standard published dimensions; no code is ported.
- **No new runtime dependencies.**
- **Tooling:** never run `playwright install` (`PLAYWRIGHT_BROWSERS_PATH` is preset). Run e2e on your own port with `E2E_PORT=<port from dispatch>`. Leave no background processes. Never `git add .`.
- **Commits:** small and logical, ending with the trailer line given in your dispatch. Do not push.


- **Phone first:** check every visible change at 390x844 first, then 1440x900; the author expects most readers on phones.
