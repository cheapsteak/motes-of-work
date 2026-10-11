import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { Vector3 } from 'three';
import { latticeCount } from '../src/galaxy/body';
import type { SectionSpan } from '../src/scroll/progress';
import { LEAK, NODE_DERP_PERIOD, SCATTER_HOLD, SCATTER_SWEEP } from '../src/scene/node/birth';
import { bodyCentre, bodyDerp, type BodyClocks } from '../src/scene/node/bodyMote';
import { derpEvent } from '../src/scene/node/derp';
import { dropoutEvent } from '../src/scene/node/dropout';
import { FLASH_PLAN, FLASH_REFERENCE, FLASH_SWINGS, FLASH_TOLERANCE, readChunk } from '../src/scene/node/flashChunks';
import { SWING } from '../src/scene/node/flashGuard';
import { galaxyOf } from '../src/scene/node/galaxyOnScreen';
import { leakDotTiming, leakWounds } from '../src/scene/node/leak';
import { latticeLL, llUnit, shellSeed } from '../src/scene/node/shell';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import type { SceneState } from '../src/timeline/sceneState';
import { canvasShot, openStage, readSpans, settle } from './helpers';
import { essayCameraAt } from './machine';

// The defect's motion as drawn (re-skin Task 8b; the defect inspector's variant 18): the focused planet's
// scatter in every slot, the two wounds that trail each scatter and leak, and the dropout's dark lines.
// Every frame is df-1's close shot (defect 0.22: the push-in done, focus 1, before the freeze's cut) at
// an ambient the test hook holds (`__motes.holdAmbient`, as `?ambient=` without a reload), phone first.
// The piece's disc on screen is the page's own (`__motes.dropout()`: the disc the dropout was cut for);
// the moons' discs are the TS twin's (bodyCentre through the essay's camera), and are left out of the
// counts that are about the planet.

test.setTimeout(600_000);

const DF1 = 0.22;
const SIZES = [
  { width: 390, height: 844, label: 'phone' },
  { width: 1440, height: 900, label: 'desktop' },
] as const;
const BG = [0x0b, 0x0d, 0x12];
const FRAME = 1 / LEAK.fps;

const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;

interface Hook {
  holdAmbient(t: number | null): void;
  dropout(): { lines: [number, number][]; box: [number, number, number, number]; cx: number; cy: number; r: number } | null;
  muteDropout(mute: boolean): void;
  isolate(names: string[] | null): void;
}
type Disc = { x: number; y: number; r: number };

const progressAt = (spans: SectionSpan[], section: string, local: number): number => {
  const span = spans.find((s) => s.id === section);
  if (!span) throw new Error(`no ${section} section`);
  return span.start + local * (span.end - span.start);
};

/** A measurement, kept on the test and printed (the floors below were set at 0.6 of these). */
function note(type: string, description: string): void {
  test.info().annotations.push({ type, description });
  console.log(`${test.info().title}: ${type}: ${description}`);
}

/** df-1's close shot on this page, its keyed state (for the twin). */
async function openDf1(page: Page): Promise<SceneState> {
  await openStage(page, '&mech=bike&n=500');
  const spans = await readSpans(page);
  const p = progressAt(spans, 'defect', DF1);
  await openStage(page, `&mech=bike&p=${p}`);
  return new KeyframeSampler(keyframes, spans).sample(p);
}

/** The frame at ambient `t` (the hook's hold), its pixels and the planet's disc as the page drew it. */
async function frameAt(page: Page, t: number): Promise<{ png: PNG; planet: Disc; lines: [number, number][]; box: [number, number, number, number] }> {
  await page.evaluate((at) => (window as unknown as { __motes: Hook }).__motes.holdAmbient(at), t);
  await settle(page);
  const d = await page.evaluate(() => (window as unknown as { __motes: Hook }).__motes.dropout());
  if (d === null) throw new Error(`no focused defective piece at ambient ${t}`);
  return { png: PNG.sync.read(await canvasShot(page)), planet: { x: d.cx, y: d.cy, r: d.r }, lines: d.lines, box: d.box };
}

const hook = (page: Page, f: (h: Hook) => void) => page.evaluate(`(${f.toString()})(window.__motes)`);

const litAt = (png: PNG, x: number, y: number) => {
  const i = (y * png.width + x) * 4;
  return [0, 1, 2].some((c) => Math.abs(png.data[i + c] - BG[c]) > 24);
};
/** Lit pixels whose centres `keep` selects. */
function litWhere(png: PNG, keep: (x: number, y: number) => boolean): number {
  let n = 0;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) if (keep(x + 0.5, y + 0.5) && litAt(png, x, y)) n++;
  return n;
}
/** The summed luminance over the background of the pixels in a box (CSS px, clipped to the screen). */
function luminance(png: PNG, box: readonly number[]): number {
  let sum = 0;
  const [x0, y0, x1, y1] = [Math.max(0, Math.floor(box[0])), Math.max(0, Math.floor(box[1])), Math.min(png.width, Math.ceil(box[2])), Math.min(png.height, Math.ceil(box[3]))];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * png.width + x) * 4;
      sum += 0.2126 * (png.data[i] - BG[0]) + 0.7152 * (png.data[i + 1] - BG[1]) + 0.0722 * (png.data[i + 2] - BG[2]);
    }
  return sum;
}
const dist = (x: number, y: number, c: { x: number; y: number }) => Math.hypot(x - c.x, y - c.y);

/** C1's moons on screen at ambient `t` (the TS twin through the essay's camera): centre and radius, CSS px. */
function moonDiscs(state: SceneState, t: number, width: number, height: number): Disc[] {
  const { g, data } = galaxyOf();
  const { camera, ambient } = essayCameraAt(state, width, height, t);
  const c: BodyClocks = { growth: 1, fix: 0, highlight: 0, show: 1, ambient, focus: 1, lamp: 1, lampRow: g.ids.C1, sysPx: new Float32Array(32).fill(1e4) };
  const sys = g.systems.indexOf(g.bodies[g.ids.C1].star);
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * height * camera.projectionMatrix.elements[5];
  return g.bodies
    .filter((b) => b.kind === 'moon' && b.host === g.ids.C1)
    .map((b) => {
      const w = new Vector3(...bodyCentre(b.index, bodyDerp(b.index, sys, c, data), ambient, data));
      const r = (b.R * focal) / w.distanceTo(eye);
      const q = w.project(camera);
      return { x: ((q.x + 1) / 2) * width, y: ((1 - q.y) / 2) * height, r };
    });
}
/** Off every moon's disc (1.6 of its radius and 2 px: its scatter and its leak stay inside). */
const offMoons = (moons: Disc[]) => (x: number, y: number) => moons.every((m) => dist(x, y, m) > 1.6 * m.r + 2);

const C1 = () => {
  const { g } = galaxyOf();
  const b = g.bodies[g.ids.C1];
  return { b, seed: b.derpSeed, phase: Math.fround(b.derpPhase) };
};

for (const size of SIZES) {
  test.describe(`the defect at df-1, ${size.width}x${size.height}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const [k, chunk] of FLASH_PLAN.entries()) {
      test(`the flash guard, on the drawn frames, part ${k + 1} of ${FLASH_PLAN.length} (${size.label})`, async ({ page }) => {
        // 10 s of df-1 at 30 fps from ambient 101 (C1's forced slot 46 starts 0.23 s in): the summed
        // luminance of C1's 3 r box as drawn (after the dropout), frame to frame. A change above 10 % of
        // the median is a swing, a rise and a fall a flash (flashGuard.ts, the inspector's guard): at most 3
        // in any 1 s window. (The inspector's measure() summed before its draw and missed what the draw
        // changed: judge2.md; this sums the drawn pixels.) The piece's own meshes are drawn alone (its
        // shell motes, its bodies, its tracks: what the scatter, the leak and the dropout change); the
        // rest of the box is the still background behind it.
        //
        // The 300 frames of the 10 s are drawn as FLASH_PLAN's chunks, a test each, so CI's shards can
        // spread them (the whole run took 8 min a size there, 1.6 s a frame, and held one shard 4 min
        // past the rest). A chunk draws its frames at the whole run's ambients, t0 + f / 30 for its
        // frame numbers f, and neighbours share 30 frames, so every 1 s window of the whole run is
        // judged whole in some chunk (flashChunks.test.ts proves it). A swing is a share of the median
        // of the whole run, not of the chunk: every chunk is judged against FLASH_REFERENCE, the whole
        // run's median, at a line moved the strict way by FLASH_TOLERANCE, and asserts that its part of
        // the run has a median within that tolerance. The header of flashChunks.ts argues why chunks
        // that all pass hold the whole run's check, and flashChunks.test.ts tests it on marginal swings.
        //
        // Timeout: a chunk of 98 frames took 2.3 to 3.7 min on CI (1.4 to 2.1 s a frame, the slower ones
        // beside another heavy test on the shard's second worker; the whole run before took 8.0 and 8.2
        // min, 1.6 s a frame) and 4.1 min under a load of 12 here (2.4 s a frame: part 3, desktop). 20
        // min is 5.4 times the slowest CI time and 4.9 times the loaded one.
        test.setTimeout(1_200_000);
        await openDf1(page);
        await hook(page, (h) => h.isolate(['net-shells', 'net-bodies', 'net-tracks']));
        const t0 = 101;
        const started = Date.now();
        // Each frame drawn and summed in the page (__motes.defectLuminance: the drawing buffer, read back
        // in the task that drew it), so the frames take seconds, not a screenshot each; a second at a time.
        const sums: (number | null)[] = [];
        for (let first = chunk.from; first < chunk.from + chunk.count; first += LEAK.fps)
          sums.push(
            ...(await page.evaluate(
              ({ at, from, n, frame, bg }) => {
                const m = (window as unknown as { __motes: { defectLuminance(t: number, b: readonly number[]): number | null } }).__motes;
                return Array.from({ length: n }, (_, f) => m.defectLuminance(at + (from + f) * frame, bg));
              },
              { at: t0, from: first, n: Math.min(LEAK.fps, chunk.from + chunk.count - first), frame: FRAME, bg: BG },
            )),
          );
        expect(sums.length).toBe(chunk.count);
        expect(sums.every((x) => x !== null), 'C1 focused in every frame').toBe(true);
        const reference = FLASH_REFERENCE[size.label];
        const reading = readChunk(sums as number[], chunk, reference);
        note('flash guard', `${reading.flashes} flashes in the worst second, ${reading.swings} swings owned, the part's median ${reading.partMedian.toFixed(0)} = ${reading.medianRatio.toFixed(4)} of the reference ${reference}, brightest ${reading.rise.toFixed(3)} of it; ${((Date.now() - started) / sums.length).toFixed(0)} ms a frame`);
        // The render is the one the reference was measured on: a median that has moved moves the line.
        expect(Math.abs(reading.medianRatio - 1), 'the part of the run keeps the reference median').toBeLessThanOrEqual(FLASH_TOLERANCE);
        // Not vacuous. The whole run's check was more than 4 swings over 10 s (8 phone, 10 desktop, fresh
        // and on CI). A chunk counts the swings it owns (the changes up to the next chunk's first frame,
        // so none twice) against FLASH_SWINGS, whose sum over a size's chunks is over 4: the chunks
        // together hold the whole run's check, and each holds its own stretch of the run to what was
        // measured there. And the piece must rise above its calm by more than a swing's share somewhere in
        // the chunk (the scatter's slower rises, which the swing count misses): a chunk that draws nothing
        // passes the flash bound for nothing.
        expect(reading.swings, 'not vacuous: the scatter swings').toBeGreaterThanOrEqual(FLASH_SWINGS[size.label][k]);
        expect(reading.rise, 'not vacuous: the scatter lifts the piece').toBeGreaterThan(1 + SWING);
        expect(reading.flashes).toBeLessThanOrEqual(3);
      });
    }

    test(`a scatter lands within 4 s of the derp beat (${size.label})`, async ({ page }) => {
      // Arriving at df-1 with the ambient at 25 values spread over the hour: the next scatter's onset (C1's
      // schedule forced, every slot a scatter) is at most 4 s on, and 0.15 s into it (every mote out,
      // held) the shell is visibly out: C1's lit px between 1.15 r and 2 r, off the moons.
      const state = await openDf1(page);
      await hook(page, (h) => h.isolate(['net-shells']));
      const { seed, phase } = C1();
      const counts: number[] = [];
      let wait = 0;
      for (let j = 0; j < 25; j++) {
        const a = (j + 0.5) * (3600 / 25);
        let onset = derpEvent(seed, phase, a, true).t0;
        if (onset < a) onset = derpEvent(seed, phase, a + NODE_DERP_PERIOD, true).t0;
        wait = Math.max(wait, onset - a);
        expect(onset - a, `at ambient ${a}`).toBeLessThanOrEqual(4);
        // Every mote has left by 2 SCATTER_SWEEP and is held at least SCATTER_HOLD[0] more: 0.15 s in.
        const at = onset + 2 * SCATTER_SWEEP + 0.5 * SCATTER_HOLD[0];
        const { png, planet } = await frameAt(page, at);
        const off = offMoons(moonDiscs(state, at, size.width, size.height));
        counts.push(litWhere(png, (x, y) => dist(x, y, planet) > 1.15 * planet.r && dist(x, y, planet) < 2 * planet.r && off(x, y)));
      }
      note('scatter out', `lit px outside 1.15 r: ${Math.min(...counts)}-${Math.max(...counts)}; the longest wait ${wait.toFixed(3)} s`);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(SCATTER_FLOOR[size.label]);
    });

    test(`the leak shows and snaps home (${size.label})`, async ({ page }) => {
      // A forced slot of C1 whose leak is done before the next scatter sets out (the TS twin: the last of
      // its leaking dots home, then a calm frame): at its wounds' peak, dots stand between 1.05 r and 1.6 r;
      // one frame after the last snaps home, that ring is back to the calm count (the frame before the
      // next scatter's onset).
      const state = await openDf1(page);
      await hook(page, (h) => h.isolate(['net-shells']));
      const { b, seed, phase } = C1();
      const body = shellSeed(b.id);
      const [rows, cols] = b.lattice!;
      const units = Array.from({ length: latticeCount(rows, cols) }, (_, i) => llUnit(latticeLL(i, rows, cols)));
      let pick: { k: number; peak: number; home: number; calm: number } | null = null;
      for (let k = 40; k < 600 && pick === null; k++) {
        const wounds = leakWounds(seed, phase, body, k);
        let home = 0;
        for (const w of wounds) units.forEach((u, i) => {
          const at = leakDotTiming(u, i, w);
          if (at) home = Math.max(home, at.start + at.out + at.linger);
        });
        const next = derpEvent(seed, phase, (k + 1 - phase + 0.5) * NODE_DERP_PERIOD, true).t0;
        // Calm from the frame after the snap to the next scatter's onset, the calm frame (the one before
        // that onset) at least two frames after the snap's.
        const snap = Math.floor(home * LEAK.fps + 1);
        const calm = Math.ceil(next * LEAK.fps) - 1;
        if (calm >= snap + 2) pick = { k, peak: wounds[1].open + 0.6, home: snap / LEAK.fps, calm: calm / LEAK.fps };
      }
      expect(pick, 'a forced slot whose leak is done before the next scatter').not.toBeNull();
      const ring = async (t: number) => {
        const { png, planet } = await frameAt(page, t);
        const off = offMoons(moonDiscs(state, t, size.width, size.height));
        return litWhere(png, (x, y) => dist(x, y, planet) > 1.05 * planet.r && dist(x, y, planet) < 1.6 * planet.r && off(x, y));
      };
      const peak = await ring(pick!.peak);
      const home = await ring(pick!.home);
      const calm = await ring(pick!.calm);
      note('leak', `slot ${pick!.k}: ${peak} px out at its peak (${pick!.peak.toFixed(3)} s), ${home} one frame after its snap (${pick!.home.toFixed(3)} s), ${calm} calm (${pick!.calm.toFixed(3)} s)`);
      expect(peak).toBeGreaterThanOrEqual(LEAK_FLOOR[size.label]);
      expect(Math.abs(home - calm)).toBeLessThanOrEqual(Math.max(2, 0.02 * calm));
    });

    test(`dark lines cross the piece only (${size.label})`, async ({ page }) => {
      // A dropout frame near ambient 101, drawn and drawn again with its lines muted: inside the box, a
      // line's rows lose at least half their lit px; outside the box (2 px for a dot's edge), nothing
      // changes.
      await openDf1(page);
      let t = 101;
      while (dropoutEvent(t) === null) t += FRAME;
      const on = await frameAt(page, t);
      await hook(page, (h) => h.muteDropout(true));
      const off = await frameAt(page, t);
      await hook(page, (h) => h.muteDropout(false));
      expect(on.lines.length).toBeGreaterThan(0);
      expect(off.lines).toEqual([]);
      const [x0, y0, x1, y1] = on.box;
      const inBox = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
      const kept: string[] = [];
      for (const [a, b] of on.lines) {
        const band = (x: number, y: number) => inBox(x, y) && y >= a && y < b;
        const before = litWhere(off.png, band);
        const after = litWhere(on.png, band);
        kept.push(`${after}/${before}`);
        if (before >= 10) expect(after, `the line ${a.toFixed(1)}-${b.toFixed(1)}`).toBeLessThanOrEqual(0.5 * before);
      }
      let changed = 0;
      for (let y = 0; y < on.png.height; y++)
        for (let x = 0; x < on.png.width; x++) {
          if (x + 0.5 >= x0 - 2 && x + 0.5 <= x1 + 2 && y + 0.5 >= y0 - 2 && y + 0.5 <= y1 + 2) continue;
          const i = (y * on.png.width + x) * 4;
          if (on.png.data[i] !== off.png.data[i] || on.png.data[i + 1] !== off.png.data[i + 1] || on.png.data[i + 2] !== off.png.data[i + 2]) changed++;
        }
      note('dropout', `at ${t.toFixed(3)} s, ${on.lines.length} lines, lit px kept in each band (with/without): ${kept.join(', ')}; ${changed} px changed outside the box`);
      expect(changed).toBe(0);
    });
  });
}

/**
 * The floors, 0.6 of the least measured (the notes above print the measurements). Measured on
 * SwiftShader at 1x (phone / desktop): the scatter out, 747-1,273 / 864-1,471 lit px outside 1.15 r
 * over the 25 ambients; the leak at its peak, 279 / 311 px between 1.05 r and 1.6 r (slot 54), and 0
 * one frame after its snap, 0 calm.
 */
const SCATTER_FLOOR = { phone: Math.floor(0.6 * 747), desktop: Math.floor(0.6 * 864) };
const LEAK_FLOOR = { phone: Math.floor(0.6 * 279), desktop: Math.floor(0.6 * 311) };
