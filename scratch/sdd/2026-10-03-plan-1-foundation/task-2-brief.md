### Task 2: Scroll math and story loader (with content lint)

**Files:**
- Create: `src/scroll/progress.ts`, `src/scroll/progress.test.ts`, `src/story/loader.ts`, `src/story/loader.test.ts`, `src/story/content.test.ts`, `src/story/01-vibe-build.md` (placeholder; real text in Task 9)

**Interfaces:**
- Produces:
  ```ts
  // scroll/progress.ts
  export interface SectionSpan { id: string; start: number; end: number } // progress units, contiguous, [0,1]
  export function sectionSpans(sections: { id: string; length: number }[]): SectionSpan[]
  export function progressFromScroll(scrollY: number, scrollHeight: number, viewportH: number): number
  export function scrollYForProgress(p: number, scrollHeight: number, viewportH: number): number // integer px
  export function locate(p: number, spans: SectionSpan[]): { index: number; id: string; local: number }
  // story/loader.ts
  export interface StorySection { id: string; length: number; alt: string; draft: boolean; html: string; words: number; file: string }
  export function parseSection(raw: string, file: string): StorySection
  export function loadStory(): StorySection[] // import.meta.glob('./*.md', { query: '?raw', eager: true }), sorted by filename
  ```
- Section file format: frontmatter between `---` lines with `id`, `length` (viewport heights, > 0), `alt` (canvas description), optional `draft: true`; body is markdown rendered with `marked`.

- [ ] **Step 1: Failing tests** in `progress.test.ts`:
  - `sectionSpans([{id:'a',length:1},{id:'b',length:3}])` → `[{id:'a',start:0,end:0.25},{id:'b',start:0.25,end:1}]`.
  - `progressFromScroll(-40, 3000, 1000)` → `0`; `(2500, 3000, 1000)` → `1`; `(1000, 3000, 1000)` → `0.5`; `(NaN, 3000, 1000)` → `0`; `scrollHeight <= viewportH` → `0`.
  - `scrollYForProgress(0.5, 3000, 1000)` → `1000`; result is always an integer; round-trip `progressFromScroll(scrollYForProgress(p))` within `1/(scrollHeight-viewportH)` of `p`.
  - `locate(0.25, spans)` → `{index:1, id:'b', local:0}`; `locate(1, spans)` → `{index:1, local:1}`; `locate(-1)` clamps to index 0, local 0.
- [ ] **Step 2:** Run `npx vitest run src/scroll` — expect FAIL (module missing).
- [ ] **Step 3:** Implement `progress.ts`. Clamp and `NaN → 0` everywhere.
- [ ] **Step 4:** Failing tests in `loader.test.ts`: parses frontmatter fields and types; `words` counts body words (markdown stripped); throws naming the file when `id` missing, `length` ≤ 0 or non-numeric, or frontmatter absent.
- [ ] **Step 5:** Implement `loader.ts` (hand-written frontmatter parser — `key: value` lines only; no YAML dependency).
- [ ] **Step 6:** `content.test.ts` (the content lint, spec §7) over `loadStory()`: each section `words ≤ 80`; ids unique; no body or `alt` matches the committed generic patterns `/#\d{3,}/` (issue numbers) and `/\b[\w-]+\/[\w-]+\.(ts|py|md|sh|json)\b/` (file paths); plus every non-empty line of `content-denylist.local.txt` if that gitignored file exists (case-insensitive substring). Never commit organisation names into the repo — they live only in the local file.
- [ ] **Step 7:** Run `npm test`. Expected: PASS. Commit `feat: scroll progress math and story loader with content lint`.

---

