# Task 2 report: scroll math and story loader

Status: DONE. Commit 8ca1fb9 "feat: scroll progress math and story loader with content lint".

## Implemented
- `src/scroll/progress.ts`: `sectionSpans`, `progressFromScroll`, `scrollYForProgress`, `locate`, `SectionSpan`. Everything clamps; NaN maps to 0. The last span's `end` is pinned to exactly 1 so float accumulation leaves no gap. `locate` throws on an empty span list.
- `src/story/loader.ts`: `parseSection` (pure, hand-written `key: value` frontmatter parser, CRLF and BOM tolerant, `marked` for the body) and `loadStory` (`import.meta.glob('./*.md', {query:'?raw', import:'default', eager:true})`, sorted by filename). Errors always name the file. `words` counts words in the rendered text (tags and entities stripped), so markdown syntax and URLs do not count.
- `src/story/01-vibe-build.md`: placeholder (`draft: true`).
- `src/story/content.test.ts`: content lint. Per section: words <= 80, no `/#\d{3,}/` and no file-path pattern in rendered body or `alt`, no local denylist term; plus unique ids. The denylist (`content-denylist.local.txt`, gitignored since Task 1) is read with `import.meta.glob('/content-denylist.local.txt', ?raw, eager)`. It is absent-safe and needs no `fs`, so **no `@types/node` was added**. Blank lines and `#` comment lines are ignored. Failure messages report location only, never the matched term.

## TDD evidence
- RED: `npx vitest run src/scroll` -> `FAIL src/scroll/progress.test.ts ... Cannot find module './progress'` (expected: module not yet written). Same for `src/story` -> `Cannot find module './loader'`.
- GREEN: `npx vitest run src/scroll` -> 9 passed. `npx vitest run src/story` -> 2 files, 18 passed.
- Full: `npm run typecheck` clean; `npm test` -> 4 files, 29 tests passed. No e2e (nothing the browser runs).
- Lint sanity (temporary files, removed): a local denylist containing `PlaceHolder` made the denylist test fail on the placeholder section; a `02-bad.md` containing `#1234` and `src/foo.ts` failed the issue-number and file-path tests.

## Files changed
Only the six listed in the brief (progress.ts/test, loader.ts/test, content.test.ts, 01-vibe-build.md). No other files modified; `.gitignore` already had the denylist entry. No denylist file committed.

## Self-review / concerns
- Prettier PostToolUse hook warns about formatting on the new files; prettier is not a project dependency and no repo format script exists, so I left it.
- The path lint runs on rendered html, so a link href like `a/b.md` would also trip it. This is intended and commented.
- `length` accepts any positive finite number (e.g. 2.5); `draft` is true only for the literal `true`.

## Fix report (review findings)

Changes:
1. Denylist ran on HTML-escaped text. `StorySection` now also exposes `body` (raw markdown) and `text` (rendered body as plain text, entities decoded). `content.test.ts` lints `body` + `text` + `alt` through a `lintTexts` helper and never lints `html`. Regression tests (`denylist matching` block) parse real sections and prove terms with `&`, `'` and `"` match, plus case-insensitive, alt, inline-markup, no-false-positive and denylist-file parsing cases. Each asserts `html` holds the escaped form, showing the old check would have missed it.
2. `words` overcounted. `htmlToText` now turns block tags into spaces and drops inline tags (so `a<em>b</em>c` is one word), then decodes entities (numeric, hex, and common named: amp lt gt quot apos nbsp mdash ndash hellip l/rsquo l/rdquo). Words are counted on `text`. New tests: Don't = 1, "Don't stop, it's fine" = 4, Q&A = 1, "AT&T and quoted words" = 4, well-known idea = 2, "a &mdash; b" = 2.
3. `sectionSpans` with zero (or non-finite) total length now splits evenly instead of producing NaN; tested with four zero-length sections (0.25 steps) and an empty list.

Interface note: `StorySection` gained `body` and `text` fields (additive).

Tests: `npx vitest run src/story/loader.test.ts src/story/content.test.ts src/scroll` -> 3 files, 35 passed. `npm run typecheck` clean. `npm test` -> 4 files, 37 passed.
