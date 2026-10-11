import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { mechanisms } from "../src/mechanisms";
import { briefThresholds } from "../src/story/brief";
import { FADE_SCREENS } from "../src/story/reveal";
import {
  KeyframeSampler,
  type KeyframeFile,
} from "../src/timeline/keyframeSampler";
import { readSpans, settle, targetScrollY } from "./helpers";

// The brief in the cold open: each line ticks (data-met) once the bike parts it names have
// settled, as a pure function of scroll progress. `?mech=bike` pins the bike whatever ACTIVE_MECHANISM is.
// `?n=` lowers the mote budget so frames are cheap under SwiftShader.

test.setTimeout(60_000);

const BIKE = "&mech=bike&n=3000";

/** Line order in src/story/01-vibe-build.md: seat and bars, wheels and chain, steering, frame. */
const SEAT_AND_BARS = 0;
const WHEELS = 1;

async function open(page: Page, query: string): Promise<string[]> {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: { frames(): number } }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await settle(page);
  return errors;
}

/** Which brief lines are ticked, in list order. */
const met = (page: Page): Promise<boolean[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll("ul.brief > li")].map((li) =>
      li.hasAttribute("data-met"),
    ),
  );

async function scrollToProgress(page: Page, p: number): Promise<void> {
  await page.evaluate(
    (y) => window.scrollTo(0, y),
    await targetScrollY(page, p),
  );
  await settle(page);
}

test("the brief has six lines, none met at the start and all met by the end of the cold open", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  expect(await met(page)).toEqual([false, false, false, false, false, false]);
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true, true, true]);
  expect(errors).toEqual([]);
});

test("the seat-and-handlebars line is met before the wheels line", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  const [vibeBuild] = await readSpans(page);
  let seen: { seatOnly: boolean; wheelsFirst: boolean } = {
    seatOnly: false,
    wheelsFirst: false,
  };
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    await scrollToProgress(
      page,
      vibeBuild.start + ((vibeBuild.end - vibeBuild.start) * i) / steps,
    );
    const lines = await met(page);
    if (lines[SEAT_AND_BARS] && !lines[WHEELS])
      seen = { ...seen, seatOnly: true };
    if (lines[WHEELS] && !lines[SEAT_AND_BARS])
      seen = { ...seen, wheelsFirst: true };
  }
  expect(seen).toEqual({ seatOnly: true, wheelsFirst: false });
  expect(errors).toEqual([]);
});

test("jumping with ?p= and scrolling to the same progress tick the same lines", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  const [vibeBuild] = await readSpans(page);
  const len = vibeBuild.end - vibeBuild.start;
  // One progress with nothing met, one mid-build, one with everything met.
  const targets = [
    vibeBuild.start + 0.02 * len,
    vibeBuild.start + 0.6 * len,
    vibeBuild.start + 0.9 * len,
  ];
  const scrolled: boolean[][] = [];
  for (const p of targets) {
    await scrollToProgress(page, p);
    scrolled.push(await met(page));
  }
  const counts = scrolled.map((m) => m.filter(Boolean).length);
  expect(counts[0]).toBe(0);
  expect(counts[1]).toBeGreaterThan(0);
  expect(counts[1]).toBeLessThan(6);
  expect(counts[2]).toBe(6);
  const jumpErrors: string[] = [];
  for (const [i, p] of targets.entries()) {
    jumpErrors.push(...(await open(page, `${BIKE}&p=${p}`)));
    expect(await met(page), `jump to ${p}`).toEqual(scrolled[i]);
  }
  expect([...errors, ...jumpErrors]).toEqual([]);
});

test("scrolling back unticks the lines", async ({ page }) => {
  const errors = await open(page, BIKE);
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true, true, true]);
  await scrollToProgress(page, 0);
  expect(await met(page)).toEqual([false, false, false, false, false, false]);
  expect(errors).toEqual([]);
});

test("after a WebGL context loss the brief still ticks on scroll", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  await page.evaluate(() => {
    const gl = (
      document.getElementById("stage") as HTMLCanvasElement
    ).getContext("webgl2");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  });
  await expect(page.locator("body")).toHaveClass(/(^|\s)no-webgl(\s|$)/);
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true, true, true]);
  await scrollToProgress(page, 0);
  expect(await met(page)).toEqual([false, false, false, false, false, false]);
  expect(errors).toEqual([]);
});

test("another mechanism on stage ticks every line only at full assembly, with no page errors", async ({
  page,
}) => {
  const errors = await open(page, "&mech=steam&n=3000");
  const [vibeBuild] = await readSpans(page);
  // The seat-and-handlebars line would be met by now on the bike; with unknown parts it waits.
  await scrollToProgress(
    page,
    vibeBuild.start + 0.6 * (vibeBuild.end - vibeBuild.start),
  );
  expect(await met(page)).toEqual([false, false, false, false, false, false]);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true, true, true]);
  expect(errors).toEqual([]);
});

/** The story's full ink, --ink in src/style.css. */
const INK = "rgb(232, 230, 238)";

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
            parts: (li.dataset.parts ?? "").split(/\s+/).filter(Boolean),
          }),
        ),
      );
      expect(lines).toHaveLength(6);
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
            color: getComputedStyle(li).color,
          };
        }, k);
      for (const [k, line] of lines.entries()) {
        const name = `line ${k + 1}`;
        await scrollToProgress(page, global(line.at - 0.01));
        expect(await look(k), `${name} just before its turn`).toMatchObject({
          opacity: 0,
          met: false,
        });
        // Up and unmet, the line is in full ink: never greyed out while it waits for its parts.
        await scrollToProgress(page, global(line.at + fade + 0.001));
        expect(await look(k), `${name} once up`).toEqual({
          opacity: 1,
          met: false,
          color: INK,
        });
        await scrollToProgress(page, global(metFrom[k] - 0.002));
        expect((await look(k)).met, `${name} just before its parts land`).toBe(
          false,
        );
        await scrollToProgress(page, global(metFrom[k] + 0.002));
        expect(await look(k), `${name} once its parts have landed`).toMatchObject({
          opacity: 1,
          met: true,
        });
      }
      expect(errors).toEqual([]);
    });
  });
}
