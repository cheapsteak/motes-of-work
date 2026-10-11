import type { PNG } from 'pngjs';

// Pixel measures of Act II's frames, shared by e2e/network.spec.ts and its tooling.

/**
 * Connected regions (4-neighbour) of ember-dominant pixels at least `minArea` px in size: the halos'
 * cores and the lit stacks' brightest motes, not their skirts (test 12's thresholds).
 */
export function emberComponents(png: PNG, minArea = 30): number[] {
  const { width, height, data } = png;
  const ember = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    ember[i] = r > 200 && r > b + 90 && r > g + 70 ? 1 : 0;
  }
  const areas: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < ember.length; start++) {
    if (ember[start] !== 1) continue;
    ember[start] = 2;
    stack.push(start);
    let area = 0;
    while (stack.length > 0) {
      const i = stack.pop() as number;
      area++;
      const x = i % width;
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j >= 0 && j < ember.length && ember[j] === 1) {
          ember[j] = 2;
          stack.push(j);
        }
      }
    }
    if (area >= minArea) areas.push(area);
  }
  return areas;
}

/** rg-chromaticity of a colour: (r, g) / (r + g + b), its hue and saturation without its light (the background's for black). */
export function rgChroma(r: number, g: number, b: number): [number, number] {
  const s = r + g + b;
  return s > 0 ? [r / s, g / s] : [1 / 3, 1 / 3];
}

/**
 * The black hole's ember (re-skin §4.2, §9: HOLE_EMBER, the strands' and the in-fall's), at the pixel at
 * `i` of RGBA data: lit (its brightest channel at least 60) and red in rg-chromaticity (r ≥ 0.60, g ≤
 * 0.26). The network's ember rule (emberComponents: r > 200, r > b + 90, r > g + 70) counts the disk's
 * warm, receding side (255, 163, 92) as ember; this does not: that is (0.50, 0.32).
 */
export function isHoleEmber(d: ArrayLike<number>, i = 0): boolean {
  const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
  if (Math.max(r, g, b) < 60) return false;
  const [rc, gc] = rgChroma(r, g, b);
  return rc >= 0.6 && gc <= 0.26;
}

/** A point on the canvas, px of the PNG. */
export type Point = [number, number];

export interface Circle {
  cx: number;
  cy: number;
  r: number;
}

/** The convex hull of `points`, counter-clockwise in canvas coordinates (Andrew's monotone chain). */
export function convexHull(points: readonly Point[]): Point[] {
  const ps = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (ps.length < 3) return ps;
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: Point[]): Point[] => {
    const out: Point[] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(ps), ...half([...ps].reverse())];
}

/** The smallest circle holding every point (a hull's few dozen corners: every pair and triple tried). */
export function enclosingCircle(points: readonly Point[]): Circle {
  const holds = (c: Circle) => points.every((p) => Math.hypot(p[0] - c.cx, p[1] - c.cy) <= c.r + 1e-6);
  let best: Circle = { cx: 0, cy: 0, r: Infinity };
  const consider = (c: Circle | null) => {
    if (c && c.r < best.r && holds(c)) best = c;
  };
  const n = points.length;
  if (n === 1) return { cx: points[0][0], cy: points[0][1], r: 0 };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a, b] = [points[i], points[j]];
      consider({ cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, r: Math.hypot(a[0] - b[0], a[1] - b[1]) / 2 });
      for (let k = j + 1; k < n; k++) consider(circumcircle(a, b, points[k]));
    }
  }
  return best;
}

function circumcircle(a: Point, b: Point, c: Point): Circle | null {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  if (Math.abs(d) < 1e-9) return null;
  const sq = (p: Point) => p[0] * p[0] + p[1] * p[1];
  const cx = (sq(a) * (b[1] - c[1]) + sq(b) * (c[1] - a[1]) + sq(c) * (a[1] - b[1])) / d;
  const cy = (sq(a) * (c[0] - b[0]) + sq(b) * (a[0] - c[0]) + sq(c) * (b[0] - a[0])) / d;
  return { cx, cy, r: Math.hypot(a[0] - cx, a[1] - cy) };
}

/** Distance from `p` to a convex polygon `hull` (counter-clockwise), 0 inside it. */
function outsideBy(hull: readonly Point[], p: Point): number {
  let inside = true;
  let best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const ex = b[0] - a[0];
    const ey = b[1] - a[1];
    if (ex * (p[1] - a[1]) - ey * (p[0] - a[0]) < 0) inside = false;
    const t = Math.min(1, Math.max(0, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey));
  }
  return inside ? 0 : best;
}

/** Stage background, #0B0D12, and how far a channel must move off it for a pixel to count as lit. */
const BACKGROUND = [0x0b, 0x0d, 0x12];
const LIT = 24;

/**
 * Lit pixels of a stack's box hull, and of the rest of its circumscribed circle. A pixel centre in
 * the hull counts to the hull; one in the circle and more than `margin` px outside the hull counts
 * to the ring (the margin leaves the hull's antialiased rim out of both).
 */
export function hullAndRing(png: PNG, hull: readonly Point[], circle: Circle, margin = 1.5): { hullPx: number; hullLit: number; ringPx: number; ringLit: number } {
  let hullPx = 0;
  let hullLit = 0;
  let ringPx = 0;
  let ringLit = 0;
  const { width, height, data } = png;
  for (let y = Math.max(0, Math.floor(circle.cy - circle.r)); y <= Math.min(height - 1, Math.ceil(circle.cy + circle.r)); y++) {
    for (let x = Math.max(0, Math.floor(circle.cx - circle.r)); x <= Math.min(width - 1, Math.ceil(circle.cx + circle.r)); x++) {
      const p: Point = [x + 0.5, y + 0.5];
      if (Math.hypot(p[0] - circle.cx, p[1] - circle.cy) > circle.r) continue;
      const i = (y * width + x) * 4;
      const lit = [0, 1, 2].some((c) => Math.abs(data[i + c] - BACKGROUND[c]) > LIT);
      const out = outsideBy(hull, p);
      if (out === 0) {
        hullPx++;
        if (lit) hullLit++;
      } else if (out > margin) {
        ringPx++;
        if (lit) ringLit++;
      }
    }
  }
  return { hullPx, hullLit, ringPx, ringLit };
}
