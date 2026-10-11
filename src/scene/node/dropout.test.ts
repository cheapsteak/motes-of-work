import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { allBodyMoteAttrs } from '../../parity/bodyCases';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import { essayCamera } from '../../timeline/netShots';
import { lampFocusRow } from '../../timeline/netTrack';
import { DROPOUT, LEAK, NodeRole } from './birth';
import { packShellData } from './bodyAttrs';
import { packBodyData } from './bodyData';
import { bodyCentre, bodyDerp, bodyMote, focusScatterRow, type BodyClocks } from './bodyMote';
import { dropoutEvent, dropoutLines } from './dropout';
import { flashGuard } from './flashGuard';

const FPS = LEAK.fps;
const I = LEAK.intensity;
/** Every frame of [0, seconds) at 30 fps, as the ambient a frame shows. */
const frames = (seconds: number): number[] => Array.from({ length: seconds * FPS }, (_, f) => f / FPS);

describe('the dropout', () => {
  it('one to three lines, two to five frames, re-rolled every two', () => {
    // Over 600 s at 30 fps: the share of cells that fire is p = 0.25 + 0.35 I (0.3725); an event lasts
    // 2-5 whole frames inside its cell; its lines hold for two frames and are drawn again after;
    // 1-3 of them (1 + floor(h · 3 · (0.5 + I)), at most 5), each 2-8 px × r/95 tall.
    const r = 120;
    const cells = new Map<number, { first: number; last: number; dur: number }>();
    const lineSets = new Map<string, string>();
    for (const t of frames(600)) {
      const e = dropoutEvent(t);
      const { lines } = dropoutLines(t, 200, 500, r);
      if (e === null) {
        expect(lines).toEqual([]);
        continue;
      }
      const f = Math.floor(t * FPS + 1e-6);
      const c = cells.get(e.cell) ?? { first: f, last: f, dur: e.frames };
      c.last = f;
      cells.set(e.cell, c);
      expect(e.frame).toBe(f - e.start);
      expect(e.start / FPS).toBeGreaterThanOrEqual(e.cell * DROPOUT.cell - 1e-9);
      expect((e.start + e.frames) / FPS).toBeLessThanOrEqual((e.cell + 1) * DROPOUT.cell + 1e-9);
      expect(lines.length).toBeGreaterThanOrEqual(DROPOUT.lines[0]);
      expect(lines.length).toBeLessThanOrEqual(Math.min(DROPOUT.maxLines, DROPOUT.lines[0] + Math.floor(DROPOUT.lines[1] * (0.5 + I))));
      for (const [y0, y1] of lines) {
        expect(y1 - y0).toBeGreaterThanOrEqual((DROPOUT.heightPx[0] * r) / DROPOUT.refRadiusPx - 1e-9);
        expect(y1 - y0).toBeLessThanOrEqual(((DROPOUT.heightPx[0] + DROPOUT.heightPx[1]) * r) / DROPOUT.refRadiusPx + 1e-9);
      }
      // The pair of frames a set of lines holds for.
      const key = `${e.cell}/${Math.floor(e.frame / DROPOUT.reroll)}`;
      const drawn = JSON.stringify(lines);
      expect(lineSets.get(key) ?? drawn).toBe(drawn);
      lineSets.set(key, drawn);
    }
    const n = 600 / DROPOUT.cell;
    const p = DROPOUT.p[0] + DROPOUT.p[1] * I;
    // Measured: 420 of 1,200 cells fire (0.350).
    expect(Math.abs(cells.size / n - p)).toBeLessThanOrEqual(0.03);
    for (const c of cells.values()) {
      expect(c.last - c.first + 1).toBe(c.dur);
      expect(c.dur).toBeGreaterThanOrEqual(DROPOUT.frames[0]);
      expect(c.dur).toBeLessThanOrEqual(DROPOUT.frames[1]);
    }
    // Re-rolled: an event of three frames or more draws a second set, and it is not always the first.
    const pairs = [...lineSets.entries()];
    const rerolled = pairs.filter(([k, v]) => k.endsWith('/1') && lineSets.get(k.replace(/\/1$/, '/0')) !== v);
    expect(rerolled.length).toBeGreaterThan(10);
  });

  it('confined to the piece', () => {
    // Every line within cy ± (1.1 r + 8 r / 95) and the box 3 r about the centre, at any size and place.
    for (const [cx, cy, r] of [
      [195, 600, 95],
      [120, 520, 40],
      [720, 640, 210],
    ]) {
      let seen = 0;
      for (const t of frames(120)) {
        const { lines, box } = dropoutLines(t, cx, cy, r);
        expect(box).toEqual([cx - DROPOUT.box * r, cy - DROPOUT.box * r, cx + DROPOUT.box * r, cy + DROPOUT.box * r]);
        for (const [y0, y1] of lines) {
          seen++;
          expect(y0).toBeGreaterThanOrEqual(cy - DROPOUT.spread * r - 1e-9);
          expect(y1).toBeLessThanOrEqual(cy + DROPOUT.spread * r + ((DROPOUT.heightPx[0] + DROPOUT.heightPx[1]) * r) / DROPOUT.refRadiusPx + 1e-9);
          expect(y0).toBeGreaterThanOrEqual(box[1]);
          expect(y1).toBeLessThanOrEqual(box[3]);
        }
      }
      expect(seen).toBeGreaterThan(20);
    }
  });

  it('is pure in the ambient: a frame reads only its own 1/30 s', () => {
    for (const t of frames(30)) {
      const at = dropoutLines(t, 200, 500, 100);
      expect(dropoutLines(t + 0.4 / FPS, 200, 500, 100)).toEqual(at);
      expect(dropoutLines(t, 200, 500, 100)).toEqual(at);
    }
  });
});

describe('the flash guard, in the twin', () => {
  it('df-1 on a phone, 20 s at 30 fps: at most 3 flashes (swings over 10 % of the median, rise and fall) in any 1 s', () => {
    // The TS twin of the drawn piece: C1's shell motes (every second of its lattice) and its moons',
    // through bodyMote (the forced scatter, the leak), less those the dropout hides (their centres in a
    // line inside the box: the page hides those whose discs touch one too, a little more), summed in
    // brightness within C1's 3 r box, at df-1 (defect
    // 0.22, focus 1) on a phone from ambient 101. A frame-to-frame change above 10 % of the median is a
    // swing, and a rise and a fall a flash (flashGuard.ts, the inspector's guard): at most 3 in any 1 s.
    const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    const data = packBodyData(g);
    const spans = sectionSpans(loadStory());
    const span = spans.find((x) => x.id === 'defect')!;
    const state = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans).sample(span.start + 0.22 * (span.end - span.start));
    const C1 = g.ids.C1;
    const piece = (row: number) => row === C1 || (g.bodies[row].kind === 'moon' && g.bodies[row].host === C1);
    const motes = allBodyMoteAttrs(g).filter((a, i) => piece(a.row) && a.role !== NodeRole.Person && (a.row !== C1 || i % 2 === 0));
    const size = { width: 390, height: 844 };
    const sys = g.systems.indexOf(g.bodies[C1].star);
    const sums: number[] = [];
    let hiddenFrames = 0;
    for (let f = 0; f < 20 * LEAK.fps; f++) {
      const t = 101 + f / LEAK.fps;
      const c: BodyClocks = {
        growth: state.net.growth,
        fix: state.net.fix,
        highlight: state.net.highlight,
        show: state.net.show,
        ambient: t,
        focus: state.net.focus,
        lamp: Math.round(state.net.lamp),
        lampRow: lampFocusRow(state.net.lampAt, g),
        sysPx: new Float32Array(32).fill(1e4),
      };
      const row = focusScatterRow(c, data);
      expect(row).toBe(C1);
      const shells = { ...data, shells: packShellData(g, t, row, true) };
      const camera = essayCamera(state.camera, g, data, size, t);
      const eye = camera.getWorldPosition(new Vector3());
      const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
      const project = (p: readonly number[]) => {
        const q = new Vector3(p[0], p[1], p[2]);
        const d = q.distanceTo(eye);
        q.project(camera);
        return { x: ((q.x + 1) / 2) * size.width, y: ((1 - q.y) / 2) * size.height, d };
      };
      const centre = project(bodyCentre(C1, bodyDerp(C1, sys, c, data), t, data));
      const r = (g.bodies[C1].R * focal) / centre.d;
      const { lines, box } = dropoutLines(t, centre.x, centre.y, r);
      let sum = 0;
      let hidden = 0;
      for (const a of motes) {
        const o = bodyMote(a, c, shells);
        if (!o.visible) continue;
        const p = project(o.pos);
        if (p.x < box[0] || p.x > box[2] || p.y < box[1] || p.y > box[3]) continue;
        if (lines.some(([y0, y1]) => p.y >= y0 && p.y < y1)) {
          hidden++;
          continue;
        }
        sum += o.brightness;
      }
      if (hidden > 0) hiddenFrames++;
      sums.push(sum);
    }
    const guard = flashGuard(sums, LEAK.fps);
    // Measured: 1 flash in any second (40 swings over 10 % in 20 s, each scatter's rise and fall; the
    // brightness 0.91-1.48 of the median), with or without the leak and the dropout.
    // Not vacuous: the dropout hides dots in some frames, and the scatter swings.
    expect(hiddenFrames).toBeGreaterThan(20);
    expect(guard.swings).toBeGreaterThan(10);
    expect(guard.flashes).toBeLessThanOrEqual(3);
  }, 300_000); // Measured: 44 s alone (600 frames of about 3,800 motes through bodyMote).
});
