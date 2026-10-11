import { describe, expect, it } from 'vitest';
import { applyToPoint } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import { bike, partIndex, SCALE } from './index';
import * as inkModule from './ink';
import { INK_MAX_SEGMENT, INK_MOVE_EPS, INK_SEGMENT_BUDGET, inkDrawing, inkSegmentCount, NOTE_BLOCKS, noteRow } from './ink';

// The ink drawing (docs/specs/2026-10-05-blueprint-and-build.md §2.4, §5 tests 1 and 2): built from
// the same constants as the solids, both builds point for point, in the pen's order.

const strokes = bike.ink?.() ?? [];
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const partOf = (i: number) => bike.parts[i].id;

const sources: Record<string, string> = import.meta.glob('./ink.ts', { query: '?raw', import: 'default', eager: true });

describe('the stroke builder', () => {
  it('is deterministic', () => {
    expect(inkDrawing()).toEqual(inkDrawing());
    expect(strokes.length).toBeGreaterThan(100);
  });

  it('draws both builds point for point, every stroke at least one segment, none longer than 30 mm', () => {
    for (const s of strokes) {
      expect(s.points.length, s.id).toBe(s.pointsTwin.length);
      expect(s.points.length, s.id).toBeGreaterThanOrEqual(2);
      for (const pts of [s.points, s.pointsTwin]) {
        for (let i = 1; i < pts.length; i++) expect(dist(pts[i - 1], pts[i]), `${s.id} segment ${i}`).toBeLessThanOrEqual(INK_MAX_SEGMENT * SCALE + 1e-9);
      }
    }
  });

  it('stays under the segment budget, counting each moving stroke twice', () => {
    const n = inkSegmentCount(strokes);
    expect(n).toBeGreaterThan(1000);
    expect(n).toBeLessThanOrEqual(INK_SEGMENT_BUDGET);
  });

  it('names real parts, has unique ids, and keeps the page on the ground part (but the saddle, whose shading rides with it)', () => {
    expect(new Set(strokes.map((s) => s.id)).size).toBe(strokes.length);
    for (const s of strokes) {
      expect(s.part, s.id).toBeGreaterThanOrEqual(0);
      expect(s.part, s.id).toBeLessThan(bike.parts.length);
      if (s.paper) expect(partOf(s.part), s.id).toBe(s.id.startsWith('hatch.saddle.') ? 'saddle' : 'ground');
    }
  });

  it('closes a closed stroke on its first point', () => {
    const closed = strokes.filter((s) => s.closed);
    expect(closed.length).toBeGreaterThan(20);
    for (const s of closed) {
      expect(dist(s.points[0], s.points[s.points.length - 1]), s.id).toBeLessThan(1e-9);
      expect(dist(s.pointsTwin[0], s.pointsTwin[s.pointsTwin.length - 1]), s.id).toBeLessThan(1e-9);
    }
  });

  it('draws every part but the loose bolts, and the person marks the ring and the tick, once each', () => {
    const drawn = new Set(strokes.map((s) => partOf(s.part)));
    for (const p of bike.parts) if (p.id !== 'loose-bolts') expect(drawn.has(p.id), p.id).toBe(true);
    expect(drawn.has('loose-bolts')).toBe(false);
    const person = strokes.filter((s) => s.cls === 'person');
    expect(person.map((s) => s.mark).sort()).toEqual(['ring', 'tick']);
  });
});

describe('the strokes that move, and the pen', () => {
  it('moves exactly the saddle, the handlebars and, of the frame, the seat tube, top tube, head tube and cables', () => {
    const moving = strokes.filter((s) => s.moves);
    expect(new Set(moving.map((s) => partOf(s.part)))).toEqual(new Set(['saddle', 'handlebars', 'frame']));
    const frameMoving = moving.filter((s) => partOf(s.part) === 'frame').map((s) => s.id.replace(/\.[ab]$/, ''));
    expect(new Set(frameMoving)).toEqual(new Set(['frame.seatTube', 'frame.collar', 'frame.topTube', 'frame.headTube', 'frame.frontCable', 'frame.rearCable']));
    // Not vacuous: the wheels, chain, cranks, fork, basket, stays and down tube are drawn and stay.
    for (const id of ['rearWheel.tyre', 'frontWheel.spoke3', 'chain-07.link', 'cranks.chainring', 'fork.blade.near.a', 'basket.panel.near', 'frame.seatStay.near.a', 'frame.downTube.a']) {
      const s = strokes.find((k) => k.id === id);
      expect(s, id).toBeDefined();
      expect(s?.moves, id).toBe(false);
    }
  });

  it('says a stroke moves exactly when its two builds stand apart once posed at rest', () => {
    const correct = bike.pose(0, ZERO_FAULTS, 0);
    const twin = bike.pose(0, ZERO_FAULTS, 1);
    for (const s of strokes.filter((k) => !k.only)) {
      const apart = Math.max(...s.points.map((p, i) => dist(applyToPoint(correct[s.part], p), applyToPoint(twin[s.part], s.pointsTwin[i]))));
      expect(apart > INK_MOVE_EPS * SCALE, s.id).toBe(s.moves);
    }
  });

  it('lies on the solids it draws: every bike stroke within 15 mm of its own part, posed at rest, on both builds', () => {
    // A stroke that drifted from shapes.ts would leave its part's surface.
    const points = bike.samplePoints(60_000, 3);
    for (const variant of [0, 1]) {
      const xf = bike.pose(0, ZERO_FAULTS, variant);
      const cloud = new Map<number, Vec3[]>();
      for (const b of points) {
        const list = cloud.get(b.part) ?? [];
        list.push(applyToPoint(xf[b.part], variant ? b.localTwin : b.local));
        cloud.set(b.part, list);
      }
      for (const s of strokes) {
        if (s.paper || (variant === 0 && s.only === 'twin') || (variant === 1 && s.only === 'correct')) continue;
        const own = cloud.get(s.part) ?? [];
        const pts = variant ? s.pointsTwin : s.points;
        for (const p of pts.filter((_, i) => i % 3 === 0)) {
          const q = applyToPoint(xf[s.part], p);
          const near = Math.min(...own.map((o) => dist(o, q)));
          expect(near / SCALE, `${s.id} (variant ${variant})`).toBeLessThan(0.015);
        }
      }
    }
  });

  it('draws the parts in the pen order: construction, wheels, frame, fork, drive, saddle, bars, fittings', () => {
    const first = (id: string) => strokes.findIndex((s) => partOf(s.part) === id && !s.paper);
    const order = ['rear-wheel', 'front-wheel', 'frame', 'fork', 'cranks', 'chain-00', 'pedal-right', 'saddle', 'handlebars', 'brake-front', 'mudguard-front', 'mudguard-rear'];
    const ranks = order.map(first);
    expect(ranks.every((r) => r >= 0)).toBe(true);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
    const cls = strokes.map((s) => s.cls);
    // The under-drawing first, then the bike, then shading, notes and the person's marks.
    expect(cls.lastIndexOf('construction')).toBeLessThan(cls.indexOf('outline'));
    expect(cls.lastIndexOf('outline')).toBeLessThan(cls.indexOf('hatch'));
    expect(cls.lastIndexOf('hatch')).toBeLessThan(cls.indexOf('note'));
    expect(cls.lastIndexOf('note')).toBeLessThan(cls.indexOf('person'));
  });

  it('redraws the seat first, then the bars, then the frame and the cables', () => {
    const rank = (id: string) => strokes.find((s) => s.id === id)?.redrawRank ?? NaN;
    const order = ['saddle.profile', 'hatch.saddle.0', 'handlebars.bar.near', 'frame.topTube.a', 'frame.seatTube.a', 'frame.headTube.a', 'frame.rearCable'];
    const ranks = order.map(rank);
    expect(ranks.every(Number.isFinite)).toBe(true);
    expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
  });
});

describe('the margin notes', () => {
  it('are scribble, not writing: no glyph table or text rendering in the generator, and no two rows alike', () => {
    for (const name of Object.keys(inkModule)) expect(name).not.toMatch(/glyph|font|letter|alphabet|char/i);
    const source = Object.values(sources)[0] ?? '';
    expect(source.length).toBeGreaterThan(1000);
    expect(source).not.toMatch(/fromCharCode|charCodeAt|fillText|alphabet|glyphs\s*=/);
    const rows = NOTE_BLOCKS.flatMap((b, i) => Array.from({ length: b.rows }, (_, r) => JSON.stringify(noteRow(b.x0, b.x1, b.y, 1 + i * 10 + r).map((w) => w.map(([x, y]) => [x - b.x1, y - b.y])))));
    expect(rows.length).toBe(8);
    expect(new Set(rows).size).toBe(rows.length);
  });

  it('run right to left, inside their block, as the notes the drawing carries', () => {
    const notes = strokes.filter((s) => s.cls === 'note');
    expect(notes.length).toBeGreaterThan(20);
    for (const s of notes) {
      expect(s.points[0][0], s.id).toBeGreaterThan(s.points[s.points.length - 1][0]);
      expect(partOf(s.part)).toBe('ground');
    }
    expect(partIndex('ground')).toBe(strokes.find((s) => s.cls === 'note')?.part);
  });
});
