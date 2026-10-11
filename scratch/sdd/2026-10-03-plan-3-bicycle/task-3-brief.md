### Task 3: The brief card and the reveal section

**Files:**
- Modify: `src/story/01-vibe-build.md` (the brief replaces the current copy)
- Create: `src/story/02-reveal.md`
- Rename: `src/story/02-rewind.md` → `src/story/03-rewind.md`, `src/story/03-spec.md` → `src/story/04-spec.md` (`git mv`; ids unchanged)
- Modify: `src/story/04-spec.md` (one sentence tying intent back to the brief; stay at most 80 words)
- Create: `src/story/brief.ts`, `src/story/brief.test.ts`
- Modify: `src/main.ts` (wire the brief to the scroll driver), `src/style.css` (brief card)
- Modify: `src/timeline/keyframes.json` (hold the cold open's state through `reveal`), `src/timeline/keyframes.test.ts`
- Modify/Test: `src/story/content.test.ts`, `e2e/app.spec.ts` (or a new `e2e/brief.spec.ts`)

**Interfaces:**
- Consumes: `settleWindow` (Task 1); the bike's part ids (Task 2); `sceneStateAt(progress).mech.assembly` (`src/main.ts`).
- Produces in `src/story/brief.ts` (unit tests run in Node with no DOM, so keep the logic DOM-free and the DOM glue thin):
  - `parsePartList(attr: string): string[]` — splits a `data-parts` value (space-separated part ids; a trailing `*` matches a prefix, as in `chain-*`).
  - `matchesPart(pattern: string, id: string): boolean`
  - `interface BriefLine { el: HTMLElement; parts: string[] }`
  - `parseBrief(root: ParentNode): BriefLine[]` — DOM glue: reads `ul.brief > li[data-parts]` through `parsePartList`. Covered by e2e.
  - `briefThresholds(lines: readonly { parts: string[] }[], mechanism: Mechanism): number[]` — per line, the largest `settleWindow(part)[1]` over the matched parts; **1 when a line matches no part** (Review Focus 1).
  - `applyBrief(lines: BriefLine[], thresholds: number[], assembly: number): void` — sets the `data-met` attribute on a line exactly when `assembly >= threshold`, and removes it otherwise.

**Copy** (draft; sentence case; keep the existing frontmatter keys):

`01-vibe-build.md` body — an intro line, then the brief as raw HTML, then one line:

```html
<p>You hand an agent a brief. It looks complete.</p>
<div class="brief">
<p class="brief-ask">Build me a bike for getting around town.</p>
<ul class="brief">
<li data-parts="front-wheel rear-wheel cranks chain-* pedal-left pedal-right">Two wheels, with the pedals driving the back one through a chain.</li>
<li data-parts="saddle handlebars">A comfy seat and a set of handlebars, both adjustable so it fits people of different heights.</li>
<li data-parts="fork front-wheel">The front wheel turns so you can steer.</li>
<li data-parts="brake-front brake-rear handlebars">Hand brakes and a bell.</li>
<li data-parts="frame">Sturdy, but light enough to carry up a flight of stairs.</li>
</ul>
</div>
<p>The swarm floods in. Line by line, every requirement is met.</p>
```

(Put the `ul.brief` class on the list itself; the wrapper is for layout. If `marked` mangles the raw block, keep it as one contiguous HTML block with no blank lines inside.) Update the `alt` to describe a bike assembling from a swarm of cool motes.

`02-reveal.md` (`id: reveal`, `length: 2`, `draft: true`, alt describing the running bike with its seat on the steering column and handlebars in the seat tube):

> It runs. It passes every test you wrote: pedal, and it moves; turn the front wheel, and it steers.
>
> Now try to ride it. The seat is on the steering column. The handlebars stick out of the seat tube. Nothing in it is warm: no person touched the parts that meet a person.
>
> Every line is met. Nobody wrote down that you sit on the seat and steer with the handlebars, because nobody would think to.

`04-spec.md`: add one sentence such as "The brief listed parts. It never said how a body uses them." — trim elsewhere if needed to stay at most 80 words.

**Keyframes:** add `reveal@…` keys so that through `reveal`: `mech.assembly` 1, `mech.variant` 1, `provenance.vibed` 1, `mech.ghost` 0, `mech.drive` keeps rising (2 at `vibe-build@1` to 3.5 at `reveal@1`), and the camera holds its `vibe-build@1` framing (Task 4 tunes it). Shift `rewind`'s drive keys so the rewind starts from the reveal's last drive. Update `keyframes.test.ts`: the first sections are `['vibe-build', 'reveal', 'rewind', 'spec']`, and "keeps the vibe build fully vibed, the wrong twin, with no ghost" also holds across `reveal`.

**Card style:** a quiet bordered card inside the panel; each line has a check box glyph that fills when `data-met` is set. **No CSS transition on the tick** (a transition would make a jump and a scroll differ in screenshots). Sentence case.

- [ ] **Step 1: Unit tests first** (`brief.test.ts`, Node; no DOM library — do not add one):
  - `parsePartList` and `matchesPart` handle ids, extra whitespace and the `*` prefix.
  - For the bike, the thresholds in list order are `[0.72, 0.45, 0.8, 0.87, 0.95]` — computed through `settleWindow`, so the test also pins Task 2's windows.
  - For `steam`, every threshold is 1.
  - `applyBrief` sets and clears `data-met` at the boundary (pass minimal objects with `toggleAttribute`, or cover it in e2e).
- [ ] **Step 2: Content tests.** Extend `content.test.ts`:
  - **Sync fence:** every `data-parts` token in the story (extracted from the section markdown with a regex) matches at least one `bike` part id (set membership over all tokens, not an example).
  - Every section stays at most 80 words.
- [ ] **Step 3: Implement** `brief.ts`, the story files, the CSS, and the `main.ts` wiring: compute thresholds once for the active mechanism after `renderStory`; call `applyBrief` with `sceneStateAt(p).mech.assembly` from the scroll driver's callback and once at start, **independent of the renderer**.
- [ ] **Step 4: Keyframes** as above; run `npx vitest run`.
- [ ] **Step 5: e2e** (`E2E_PORT=<port>`):
  - At `vibe-build@0` no line is met; at the end of `vibe-build` all are.
  - The seat-and-handlebars line is met before the wheels line at an intermediate progress.
  - Jumping with `?p=` and scrolling to the same progress give the same met set (three progress values).
  - Scrolling back unticks.
  - After a WebGL context loss the brief still ticks on scroll.
  - With `?test=1&mech=steam` there are no page errors and lines tick only at full assembly.
  - Existing `e2e/app.spec.ts` section tests pass with four sections.
- [ ] **Step 6: Commit.**

---

