import re

p = '/home/user/motes-of-work/e2e/brief.spec.ts'
s = open(p).read()
s = s.replace('[false, false, false, false, false]', '[false, false, false, false]')
s = s.replace('[true, true, true, true, true]', '[true, true, true, true]')
s = s.replace('test("the brief has five lines, none met at the start and all met by the end of the cold open"',
              'test("the brief has four lines, none met at the start and all met by the end of the cold open"')
s = s.replace('  expect(counts[1]).toBeLessThan(5);\n  expect(counts[2]).toBe(5);',
              '  expect(counts[1]).toBeLessThan(4);\n  expect(counts[2]).toBe(4);')
s = s.replace('/** Line order in src/story/01-vibe-build.md: seat and bars, wheels and chain, steering, brakes, frame. */',
              '/** Line order in src/story/01-vibe-build.md: seat and bars, wheels and chain, steering, frame. */')
s = s.replace('''import { expect, test, type Page } from "@playwright/test";
import { readSpans, settle, targetScrollY } from "./helpers";''', '''import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { mechanisms } from "../src/mechanisms";
import { briefThresholds } from "../src/story/brief";
import { FADE_SCREENS } from "../src/story/reveal";
import {
  KeyframeSampler,
  type KeyframeFile,
} from "../src/timeline/keyframeSampler";
import { readSpans, settle, targetScrollY } from "./helpers";''')
s += '''
// Each line is absent, not dim, until its own scroll position, and comes up before it is met
// (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.5, test 12). Timings are read from the page
// (data-at, data-parts, --length) and the keyframes, never hard-coded.
// Read, not imported: Playwright's loader wants an import attribute on JSON that the app build does not.
const keyframes = JSON.parse(
  readFileSync(
    new URL("../src/timeline/keyframes.json", import.meta.url),
    "utf8",
  ),
) as KeyframeFile;

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(size, () => {
    test.use({ viewport });

    test(`each line is absent until its turn, up before it is met, and met from its parts landing (${size})`, async ({
      page,
    }) => {
      test.setTimeout(180_000);
      const errors = await open(page, BIKE);
      const spans = await readSpans(page);
      const [vibeBuild] = spans;
      const length = await page.evaluate(() =>
        Number(
          (
            document.querySelector(
              'section[data-section="vibe-build"]',
            ) as HTMLElement
          ).style.getPropertyValue("--length"),
        ),
      );
      const lines = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("ul.brief > li")].map(
          (li) => ({
            at: Number(li.dataset.at),
            parts: (li.dataset.parts ?? "").split(/\\s+/).filter(Boolean),
          }),
        ),
      );
      expect(lines).toHaveLength(4);
      const fade = FADE_SCREENS / length;
      const sampler = new KeyframeSampler(keyframes, spans);
      const global = (l: number) =>
        vibeBuild.start + l * (vibeBuild.end - vibeBuild.start);
      const thresholds = briefThresholds(lines, mechanisms.bike);
      /** The local at which assembly first reaches a line's threshold: it is met from there. */
      const metFrom = thresholds.map((t) => {
        for (let i = 0; i <= 100_000; i++) {
          if (sampler.sample(global(i / 100_000)).mech.assembly >= t)
            return i / 100_000;
        }
        throw new Error(`threshold ${t} never reached`);
      });
      const look = (k: number) =>
        page.evaluate((i) => {
          const li = document.querySelectorAll<HTMLElement>("ul.brief > li")[
            i
          ];
          return {
            opacity: Number(getComputedStyle(li).opacity),
            met: li.hasAttribute("data-met"),
          };
        }, k);
      for (const [k, line] of lines.entries()) {
        const name = `line ${k + 1}`;
        await scrollToProgress(page, global(line.at - 0.01));
        expect(await look(k), `${name} just before its turn`).toEqual({
          opacity: 0,
          met: false,
        });
        await scrollToProgress(page, global(line.at + fade + 0.001));
        expect(await look(k), `${name} once up`).toEqual({
          opacity: 1,
          met: false,
        });
        await scrollToProgress(page, global(metFrom[k] - 0.002));
        expect((await look(k)).met, `${name} just before its parts land`).toBe(
          false,
        );
        await scrollToProgress(page, global(metFrom[k] + 0.002));
        expect(await look(k), `${name} once its parts have landed`).toEqual({
          opacity: 1,
          met: true,
        });
      }
      expect(errors).toEqual([]);
    });
  });
}
'''
open(p, 'w').write(s)

p = '/home/user/motes-of-work/e2e/text.spec.ts'
s = open(p).read()
s = s.replace('    expect(looks.length).toBe(5);', '    expect(looks.length).toBe(4);')
s = s.replace('  expect(unmet.length).toBe(5);', '  expect(unmet.length).toBe(4);')
s = s.replace("    await expect(page.locator('ul.brief > li')).toHaveCount(5);", "    await expect(page.locator('ul.brief > li')).toHaveCount(4);")
open(p, 'w').write(s)
