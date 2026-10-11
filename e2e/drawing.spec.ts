import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { PerspectiveCamera, Vector3 } from 'three';
import { mechanisms } from '../src/mechanisms';
import { mechanismAnchors } from '../src/mechanisms/anchors';
import { CENTRE, SCALE } from '../src/mechanisms/bike';
import { RING } from '../src/mechanisms/bike/ink';
import type { Vec3 } from '../src/math/vec';
import { applyCamera } from '../src/scene/cameraRig';
import { INK_FLAG } from '../src/scene/ink/inkLayout';
import { inkPoses, segmentEnds } from '../src/scene/ink/inkPose';
import { KeyframeSampler, type KeyframeFile } from '../src/timeline/keyframeSampler';
import type { SceneState } from '../src/timeline/sceneState';
import { canvasShot, openStage, readSpans, settle, targetScrollY } from './helpers';
import { inkOf, sheetCorners } from './machine';

// The spec section's drawing on the built page (docs/specs/2026-10-05-blueprint-and-build.md §5,
// Playwright tests 8 to 11): ink on paper, never points; the paper's and inks' colours; the redraw
// strikes and redraws without the bike ever going and without touching anything else; the lift is
// continuous. Canvas only (helpers.CANVAS_ONLY_CSS). Regions come from the sheet and strokes
// projected through the page's own camera, never from hard-coded pixels.

test.setTimeout(600_000);

// Read, not imported: Playwright's loader wants an import attribute on JSON that the app build does not.
const keyframes = JSON.parse(readFileSync(new URL('../src/timeline/keyframes.json', import.meta.url), 'utf8')) as KeyframeFile;
const bike = mechanisms.bike;
const anchors = mechanismAnchors(bike);
const world = (p: readonly number[]): Vec3 => [(p[0] - CENTRE[0]) * SCALE, (p[1] - CENTRE[1]) * SCALE, (p[2] - CENTRE[2]) * SCALE];

interface Frame {
  width: number;
  height: number;
  data: Buffer;
}

interface Stage {
  page: Page;
  /** Global progress of a spec-local value. */
  at(local: number): number;
  sampler: KeyframeSampler;
}

async function stage(page: Page, query: string): Promise<Stage> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openStage(page, query);
  const spans = await readSpans(page);
  const spec = spans.find((s) => s.id === 'spec');
  if (!spec) throw new Error('no spec section');
  return { page, at: (l) => spec.start + l * (spec.end - spec.start), sampler: new KeyframeSampler(keyframes, spans) };
}

async function shoot(st: Stage, local: number): Promise<Frame> {
  await st.page.evaluate((y) => window.scrollTo(0, y), await targetScrollY(st.page, st.at(local)));
  await settle(st.page);
  const { width, height, data } = PNG.sync.read(await canvasShot(st.page));
  return { width, height, data };
}

/** World points to canvas px through the page's composed camera at `s`. */
function projector(s: SceneState, w: number, h: number): (p: Vec3) => [number, number] {
  const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
  applyCamera(camera, s, anchors, { compose: true });
  return (p) => {
    const q = new Vector3(...p).project(camera);
    return [((q.x + 1) / 2) * w, ((1 - q.y) / 2) * h];
  };
}

/** The sheet's rectangle on screen (square on), inset by `inset` px and clipped to the frame. */
function sheetRect(s: SceneState, f: Frame, inset = 3): [number, number, number, number] {
  const px = sheetCorners(bike, { ...s, sheet: { opacity: 1 } }).map(projector(s, f.width, f.height));
  const xs = px.map((p) => p[0]);
  const ys = px.map((p) => p[1]);
  return [
    Math.max(0, Math.ceil(Math.min(...xs) + inset)),
    Math.max(0, Math.ceil(Math.min(...ys) + inset)),
    Math.min(f.width, Math.floor(Math.max(...xs) - inset)),
    Math.min(f.height, Math.floor(Math.max(...ys) - inset)),
  ];
}

const rgb = (f: Frame, x: number, y: number): [number, number, number] => {
  const i = (y * f.width + x) * 4;
  return [f.data[i], f.data[i + 1], f.data[i + 2]];
};
const luminance = ([r, g, b]: number[]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

function* pixels(rect: [number, number, number, number]): Generator<[number, number]> {
  for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) yield [x, y];
}

/** Ink-dark pixels (luminance < 0.35) inside `rect`. */
function darkCount(f: Frame, rect: [number, number, number, number]): number {
  let n = 0;
  for (const [x, y] of pixels(rect)) if (luminance(rgb(f, x, y)) < 0.35) n++;
  return n;
}

/** Pixels whose colour differs between two frames by more than `tol` on some channel. */
function differing(a: Frame, b: Frame, tol = 16): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (Math.abs(a.data[i] - b.data[i]) > tol || Math.abs(a.data[i + 1] - b.data[i + 1]) > tol || Math.abs(a.data[i + 2] - b.data[i + 2]) > tol) n++;
  }
  return n;
}

/** CIE L*a*b* of an sRGB colour (D65). */
function lab([r, g, b]: number[]): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a: number[], b: number[]) => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** Hue (degrees), saturation and value of an sRGB colour. */
function hsv([r, g, b]: number[]): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, max === 0 ? 0 : d / max, max / 255];
}

/** A mask of the pixels within `radius` px of any segment a-b in `segs` (canvas px). */
function segmentMask(f: Frame, segs: [number, number][][], radius: number): Uint8Array {
  const mask = new Uint8Array(f.width * f.height);
  for (const [a, b] of segs) {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - radius));
    const x1 = Math.min(f.width - 1, Math.ceil(Math.max(a[0], b[0]) + radius));
    const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - radius));
    const y1 = Math.min(f.height - 1, Math.ceil(Math.max(a[1], b[1]) + radius));
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const l2 = dx * dx + dy * dy;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const t = l2 === 0 ? 0 : Math.min(1, Math.max(0, ((x + 0.5 - a[0]) * dx + (y + 0.5 - a[1]) * dy) / l2));
        if (Math.hypot(x + 0.5 - (a[0] + t * dx), y + 0.5 - (a[1] + t * dy)) <= radius) mask[y * f.width + x] = 1;
      }
    }
  }
  return mask;
}

/** The redrawn strokes (both copies) and the person's ring, projected at `s`, as canvas segments. */
function redrawSegments(s: SceneState, f: Frame): [number, number][][] {
  const inst = inkOf(bike);
  if (!inst) throw new Error('the bike has no drawing');
  const project = projector(s, f.width, f.height);
  const poses = inkPoses(bike, s);
  const out: [number, number][][] = [];
  for (let k = 0; k < inst.count; k++) {
    const flags = inst.meta[k * 4 + 2];
    if (!(flags & INK_FLAG.moves) && !(flags & INK_FLAG.ring)) continue;
    out.push(segmentEnds(inst, k, poses, s.ink.flat).map(project));
  }
  return out;
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  const size = `${viewport.width}x${viewport.height}`;
  test.describe(size, () => {
    test.use({ viewport });

    test(`the drawing is ink on paper, never points, and the pen draws it in (${size})`, async ({ page }) => {
      const st = await stage(page, '&mech=bike');
      for (const l of [0.16, 0.3, 0.5]) {
        const f = await shoot(st, l);
        const stats = await page.evaluate(() => (window as unknown as { __motes: { drawStats(): { points: number; visible: string[] } } }).__motes.drawStats());
        expect(stats.points, `spec@${l}: gl.POINTS draws`).toBe(0);
        expect(stats.visible, `spec@${l}`).toEqual(expect.arrayContaining(['ink', 'sheet']));
        expect(stats.visible, `spec@${l}: the dotted ghost is off`).not.toContain('mote-ghost');
        const rect = sheetRect(st.sampler.sample(st.at(l)), f);
        let blue = 0;
        for (const [x, y] of pixels(rect)) {
          const [r, g, b] = rgb(f, x, y);
          if (b > r + 40 && b > g + 20) blue++;
        }
        expect(blue, `spec@${l}: blue-dominant pixels on the page`).toBe(0);
      }
      // The pen: ink-dark pixels on the page rise through the draw-in.
      const counts: number[] = [];
      for (const l of [0.06, 0.08, 0.1, 0.13, 0.16]) {
        const f = await shoot(st, l);
        counts.push(darkCount(f, sheetRect(st.sampler.sample(st.at(l)), f)));
      }
      test.info().annotations.push({ type: 'ink-dark pixels through the draw-in', description: counts.join(', ') });
      for (let i = 1; i < counts.length; i++) expect(counts[i], `sample ${i}: ${counts.join(', ')}`).toBeGreaterThan(counts[i - 1]);
      expect(counts[counts.length - 1]).toBeGreaterThan(viewport.width > viewport.height ? 8000 : 2500);
    });

    test(`the paper is cream, the person's ink is ochre, and the lifted lines are warm and pale on the dark (${size})`, async ({ page }) => {
      const st = await stage(page, '&mech=bike&n=200');
      // The margin under the drawing's ground line: paper alone.
      let f = await shoot(st, 0.16);
      let s = st.sampler.sample(st.at(0.16));
      let project = projector(s, f.width, f.height);
      const rect = sheetRect(s, f);
      const ground = project(world([0.5, 0, 0]))[1];
      const left = Math.ceil(project(world([0.1, 0, 0]))[0]);
      const right = Math.floor(project(world([0.9, 0, 0]))[0]);
      const top = Math.ceil(ground + 5);
      expect(top, 'sampled below 45% of the height').toBeGreaterThan(0.45 * f.height);
      const margin: number[][] = [];
      for (let y = top; y < rect[3]; y++) for (let x = left; x < right; x++) margin.push(rgb(f, x, y));
      expect(margin.length).toBeGreaterThan(1000);
      const paper = [0, 1, 2].map((c) => median(margin.map((p) => p[c])));
      expect(deltaE(paper, [0xe7, 0xd9, 0xb9]), `paper ${paper}`).toBeLessThan(6);

      // The ring round the seat: its pixels are ochre.
      f = await shoot(st, 0.34);
      s = st.sampler.sample(st.at(0.34));
      project = projector(s, f.width, f.height);
      const [cx, cy] = project(world(RING.centre));
      const rpx = Math.hypot(...project(world([RING.centre[0] + RING.radius, RING.centre[1], 0])).map((v, k) => v - [cx, cy][k]));
      const hues: number[] = [];
      for (let y = Math.floor(cy - rpx - 4); y <= cy + rpx + 4; y++) {
        for (let x = Math.floor(cx - rpx - 4); x <= cx + rpx + 4; x++) {
          if (x < 0 || y < 0 || x >= f.width || y >= f.height || Math.abs(Math.hypot(x - cx, y - cy) - rpx) > 3) continue;
          const [h, sat, v] = hsv(rgb(f, x, y));
          if (sat > 0.45 && v > 0.35) hues.push(h);
        }
      }
      expect(hues.length, 'ring pixels').toBeGreaterThan(viewport.width > viewport.height ? 150 : 60);
      expect(median(hues)).toBeGreaterThan(25);
      expect(median(hues)).toBeLessThan(50);

      // sp-7, the page gone: the lines warm and pale, the stage round them the stage.
      f = await shoot(st, 0.8);
      const lines: number[][] = [];
      const dark: number[][] = [];
      for (let y = Math.floor(0.45 * f.height); y < f.height; y++) {
        for (let x = 0; x < f.width; x++) {
          const c = rgb(f, x, y);
          if (luminance(c) > 0.3) lines.push(c);
          else if (x < 0.12 * f.width || x > 0.88 * f.width) dark.push(c);
        }
      }
      expect(lines.length, 'line pixels').toBeGreaterThan(200);
      expect(median(lines.map(([r, , b]) => r - b)), 'warm: red at least blue').toBeGreaterThanOrEqual(0);
      const bg = [0, 1, 2].map((c) => median(dark.map((p) => p[c])));
      [0x0b, 0x0d, 0x12].forEach((want, c) => expect(Math.abs(bg[c] - want), `stage ${bg}`).toBeLessThanOrEqual(4));
    });

    test(`the redraw strikes the wrong lines faint and draws the new ones, the bike never gone, nothing else touched (${size})`, async ({ page }) => {
      const st = await stage(page, '&mech=bike&n=3000');
      // From just past 0.31, where the ring is drawn and the camera has come to rest: a scroll lands on
      // a whole pixel, so a window starting on the knot itself can land a hair before it, mid-ring.
      const locals = Array.from({ length: 24 }, (_, i) => 0.311 + (0.109 * i) / 23);
      const first = await shoot(st, locals[0]);
      const s0 = st.sampler.sample(st.at(locals[0]));
      const rect = sheetRect(s0, first);
      const dark0 = darkCount(first, rect);
      // Everything but the strokes that move and the ring stays exactly as it was.
      const mask = segmentMask(first, redrawSegments(s0, first), 8);
      let prev = first;
      for (const l of locals.slice(1)) {
        const f = await shoot(st, l);
        const changed = differing(prev, f) / (f.width * f.height);
        expect(changed, `spec@${l.toFixed(3)}: pixels changed since the last sample`).toBeLessThanOrEqual(0.025);
        expect(darkCount(f, rect), `spec@${l.toFixed(3)}: the bike is never gone`).toBeGreaterThanOrEqual(0.7 * dark0);
        let outside = 0;
        for (let i = 0; i < mask.length; i++) {
          if (mask[i]) continue;
          if (f.data[i * 4] !== first.data[i * 4] || f.data[i * 4 + 1] !== first.data[i * 4 + 1] || f.data[i * 4 + 2] !== first.data[i * 4 + 2]) outside++;
        }
        expect(outside, `spec@${l.toFixed(3)}: pixels changed away from the redrawn lines`).toBe(0);
        prev = f;
      }
      // Not vacuous: the redraw did change the page.
      expect(differing(first, prev), 'the redraw changed the page').toBeGreaterThan(500);
    });

    test(`the lift is continuous: no frame jumps as the lines rise off the page (${size})`, async ({ page }) => {
      const st = await stage(page, '&mech=bike&n=3000');
      // From 0.63, where the camera's turn to the build has come to rest, to just past the lift's end
      // (0.69), every 0.002 of the section (0.016 screens): the page fades over 0.09 of it. While the camera turns (0.53-0.63) the
      // whole page slides across the screen, which moves most of its pixels whatever the lines do;
      // that move is held continuous by the camera tests (src/timeline/keyframes.test.ts).
      let prev: Frame | null = null;
      let total = 0;
      const changes: number[] = [];
      for (let i = 0; i <= 35; i++) {
        const l = 0.63 + 0.002 * i;
        const f = await shoot(st, l);
        if (prev) {
          const changed = differing(prev, f) / (f.width * f.height);
          changes.push(changed);
          total += changed;
          expect(changed, `spec@${l.toFixed(3)}: pixels changed since the last sample`).toBeLessThanOrEqual(0.04);
        }
        prev = f;
      }
      test.info().annotations.push({ type: 'largest change between samples', description: Math.max(...changes).toFixed(4) });
      expect(total, 'not vacuous: the lift moved pixels').toBeGreaterThan(0.05);
    });
  });
}
