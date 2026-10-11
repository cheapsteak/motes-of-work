// The ink drawing's per-segment instance data (docs/specs/2026-10-05-blueprint-and-build.md §2.5):
// one instance per segment of every stroke, moving strokes twice (copy 0 in the wrong build, struck
// out in the redraw; copy 1 in the correct build, drawn in it). Pure, no three.js: inkSystem.ts
// uploads it, tests read it.
import { applyToPoint, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { InkStroke, StrokeClass } from '../../mechanisms/types';

/** Bits of a segment's flags (ink.vert.glsl decodes the same values). */
export const INK_FLAG = {
  moves: 1,
  farSide: 2,
  paper: 4,
  copy: 8,
  capStart: 16,
  capEnd: 32,
  across: 64,
  ring: 128,
  tick: 256,
} as const;

/** A stroke class as the shaders number it. */
export const INK_CLASS: Record<StrokeClass, number> = { outline: 0, construction: 1, hatch: 2, note: 3, person: 4 };

/** Per-instance arrays: one entry per segment, in draw order (later draws over earlier). */
export interface InkInstances {
  count: number;
  /** Segment ends, part space, correct build (vec3 each). */
  a: Float32Array;
  b: Float32Array;
  /** The same on the wrong twin's build. */
  aTwin: Float32Array;
  bTwin: Float32Array;
  /**
   * vec4: the pen's arc at the segment's two ends (0..1 over the drawing; for a person's mark, over
   * the mark), then the redraw's arc (0..1 over the moving strokes, or -1 off it).
   */
  arcs: Float32Array;
  /** vec2: metres along the stroke at each end: the wobble's and the pressure's phase. */
  along: Float32Array;
  /** vec4: part index, stroke index, flags, the part's x-rank (1 lifts first). */
  meta: Float32Array;
  /** vec4: width (CSS px), class, alpha, 0. */
  style: Float32Array;
}

/** A stroke's length (world units). */
function length(pts: Vec3[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]);
  return l;
}

/** Is this stroke on the pen's first pass (the drawing as it is first made, the twin where they differ)? */
export const onFirstPass = (s: InkStroke): boolean => s.cls !== 'person' && s.only !== 'correct';
/** Is it drawn again in the redraw (its correct copy)? */
export const inRedraw = (s: InkStroke): boolean => s.moves && s.only !== 'twin';

/**
 * Each part's x-rank, for the lift's wave: 1 for the part whose strokes stand furthest back (lowest x,
 * posed at rest on the correct build), 0 for the furthest forward, so the drawing lifts rear first.
 * Parts with no strokes take 0.
 */
export function partXRanks(strokes: readonly InkStroke[], rest: readonly PartTransform[]): number[] {
  const sum = new Map<number, [number, number]>();
  for (const s of strokes) {
    if (s.paper) continue;
    const [x, n] = sum.get(s.part) ?? [0, 0];
    const xs = s.points.reduce((acc, p) => acc + applyToPoint(rest[s.part], p)[0], 0);
    sum.set(s.part, [x + xs, n + s.points.length]);
  }
  const centres = new Map([...sum].map(([part, [x, n]]) => [part, x / n]));
  const all = [...centres.values()];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  return rest.map((_, part) => {
    const c = centres.get(part);
    return c === undefined || hi === lo ? 0 : (hi - c) / (hi - lo);
  });
}

/** The instances of `strokes` (in the pen's order), each part's x-rank from `xRanks`. */
export function inkInstances(strokes: readonly InkStroke[], xRanks: readonly number[]): InkInstances {
  // The pen's arc runs over the first pass in order; the redraw's over the moving strokes by rank.
  const firstPass = strokes.filter(onFirstPass);
  const total = firstPass.reduce((n, s) => n + length(s.moves ? s.pointsTwin : s.points), 0);
  const penStart = new Map<InkStroke, number>();
  let run = 0;
  for (const s of firstPass) {
    penStart.set(s, run / total);
    run += length(s.moves ? s.pointsTwin : s.points);
  }
  const redraw = strokes
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => inRedraw(s))
    .sort((p, q) => (p.s.redrawRank ?? 99) - (q.s.redrawRank ?? 99) || p.i - q.i)
    .map(({ s }) => s);
  const redrawTotal = redraw.reduce((n, s) => n + length(s.points), 0);
  const redrawStart = new Map<InkStroke, number>();
  run = 0;
  for (const s of redraw) {
    redrawStart.set(s, run / redrawTotal);
    run += length(s.points);
  }

  // Draw order: the first pass, then the redrawn copies over it, then the person's marks on top.
  const copies: { s: InkStroke; index: number; copy: 0 | 1 }[] = [];
  strokes.forEach((s, index) => {
    if (onFirstPass(s)) copies.push({ s, index, copy: 0 });
  });
  for (const s of redraw) copies.push({ s, index: strokes.indexOf(s), copy: 1 });
  strokes.forEach((s, index) => {
    if (s.cls === 'person') copies.push({ s, index, copy: 0 });
  });

  const count = copies.reduce((n, c) => n + c.s.points.length - 1, 0);
  const out: InkInstances = {
    count,
    a: new Float32Array(count * 3),
    b: new Float32Array(count * 3),
    aTwin: new Float32Array(count * 3),
    bTwin: new Float32Array(count * 3),
    arcs: new Float32Array(count * 4),
    along: new Float32Array(count * 2),
    meta: new Float32Array(count * 4),
    style: new Float32Array(count * 4),
  };
  let k = 0;
  for (const { s, index, copy } of copies) {
    const drawn = copy === 1 || !s.moves ? s.points : s.pointsTwin;
    const strokeLength = length(drawn);
    const flags =
      (s.moves ? INK_FLAG.moves : 0) |
      (s.farSide ? INK_FLAG.farSide : 0) |
      (s.paper ? INK_FLAG.paper : 0) |
      (copy === 1 ? INK_FLAG.copy : 0) |
      (s.across ? INK_FLAG.across : 0) |
      (s.mark === 'ring' ? INK_FLAG.ring : 0) |
      (s.mark === 'tick' ? INK_FLAG.tick : 0);
    // Arc fractions: the pen's (or the mark's own) for copy 0, the redraw's for copy 1.
    const span =
      s.cls === 'person'
        ? { start: 0, scale: 1 / strokeLength, redraw: false }
        : copy === 0
          ? { start: penStart.get(s) ?? 0, scale: 1 / total, redraw: false }
          : { start: redrawStart.get(s) ?? 0, scale: 1 / redrawTotal, redraw: true };
    let s0 = 0;
    for (let i = 1; i < drawn.length; i++, k++) {
      const p = drawn[i - 1];
      const q = drawn[i];
      const l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]);
      out.a.set(s.points[i - 1], k * 3);
      out.b.set(s.points[i], k * 3);
      out.aTwin.set(s.pointsTwin[i - 1], k * 3);
      out.bTwin.set(s.pointsTwin[i], k * 3);
      const from = span.start + s0 * span.scale;
      const to = span.start + (s0 + l) * span.scale;
      out.arcs.set(span.redraw ? [-1, -1, from, to] : [from, to, -1, -1], k * 4);
      out.along.set([s0, s0 + l], k * 2);
      const caps = (i === 1 ? INK_FLAG.capStart : 0) | (i === drawn.length - 1 ? INK_FLAG.capEnd : 0);
      out.meta.set([s.part, index, flags | caps, xRanks[s.part] ?? 0], k * 4);
      out.style.set([s.width, INK_CLASS[s.cls], s.alpha, 0], k * 4);
      s0 += l;
    }
  }
  return out;
}
