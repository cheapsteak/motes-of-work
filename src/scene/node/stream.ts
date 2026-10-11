// Where a stream's dot is, and how bright (docs/specs/2026-10-06-act-2-storyboard-and-network.md §3.6;
// galaxy-orbits §15): the TypeScript twin of the streams' vertex shader, for the tests. Every stream
// runs parent to child, and every dot flows that way: out from the core and the stars, along a copy,
// and in along the one up-stream, the way its child's builders fly.
//
// The galaxy's streams (shaders/stream.vert.glsl) are shown only where the story's line is about
// lineage (`net.streams`, galaxy §15.1), as 1 px dots, one per STREAM_PITCH of chord within
// STREAM_DOTS, each at most STREAM_CAP of a star glow's core and faded STREAM_FADE from the parent's
// end to the child's (streamGain), on a quadratic Bezier whose control point is the chord's midpoint
// moved STREAM_BOW of the chord toward its bowBearing (streamControl). They flow on the ambient
// clock, never on scroll. The reviewer's feed is the one exception to the cap and the fade (feedGain):
// it is shown by its own story leaf (`net.feed`) as re-3's subject, not as ambient lineage. Neither
// lights the text band: every stream and feed dot is masked to it on screen (streamBandMask).
import type { Vec3 } from '../../math/vec';
import { STREAM_DOTS, STREAM_PITCH } from '../../galaxy/generate';
import { BAND_MARGIN_PX, FEED_CAP, NODE_STREAM_SPEED, STREAM_BAND_SOFT_PX, STREAM_BOW, STREAM_CAP, STREAM_FADE, TEXT_BAND } from './birth';
import { bodyTexel, type BodyData } from './bodyData';
import { smoothstep } from './light';
import { bodyWorld } from './orbit';

export { FEED_CAP, STREAM_BAND_SOFT_PX, STREAM_BOW, STREAM_CAP, STREAM_DOTS, STREAM_FADE, STREAM_PITCH };

/**
 * The text band's mask on a stream or feed dot (Task 11 review I1, the ruling: the streams and the feed
 * must not light the band): 0 wherever the top of the pixel the dot lights, `yTop` CSS px from the top
 * of a screen `height` CSS px tall, is at or above the band's margin (TEXT_BAND of the height plus
 * BAND_MARGIN_PX), rising to 1 over the STREAM_BAND_SOFT_PX below it, a smoothstep. It multiplies the
 * dot's brightness in screen space, after the dot is placed on its pixel (stream.vert.glsl), so a
 * stream ends at the band's edge however the camera frames it.
 */
export function streamBandMask(yTop: number, height: number): number {
  const edge = TEXT_BAND * height + BAND_MARGIN_PX;
  return smoothstep(edge, edge + STREAM_BAND_SOFT_PX, yTop);
}

/**
 * How far along its stream (0 at the parent's end, 1 at the child's) dot `k` (its offset, in [0, 1))
 * is at ambient time `t`.
 */
export function streamDotU(k: number, t: number): number {
  const x = k + NODE_STREAM_SPEED * t;
  return x - Math.floor(x);
}

/**
 * A galaxy stream dot's brightness, as a share of a star glow's core: `streams · lamp · STREAM_CAP ·
 * mix(1, 0.15, u)` (galaxy §15.2), 0 wherever the story does not show the streams. A lit (ember) dot
 * is capped the same.
 */
export function streamGain(u: number, streams: number, lamp: number): number {
  return streams * lamp * STREAM_CAP * (STREAM_FADE[0] + (STREAM_FADE[1] - STREAM_FADE[0]) * u);
}

/**
 * A feed dot's brightness, as a share of a star glow's core: `feed · lamp · FEED_CAP`, the same along its
 * whole length (galaxy §15.2's exception: the feed is re-3's subject, not ambient lineage), 0 wherever
 * the story does not show it (`net.feed`). Its alpha (review.ts feedAlpha) multiplies it, as a stream's
 * presence multiplies a stream dot's.
 */
export function feedGain(feed: number, lamp: number): number {
  return feed * lamp * FEED_CAP;
}

/**
 * A stream's control point from `a` to `b`: the midpoint moved STREAM_BOW of the chord square to it,
 * toward `bearing` about the chord (0 along e1 = chord × up, π/2 along e2 = chord × e1; a vertical
 * chord takes x for up). A builder flies the same curve.
 */
export function streamControl(a: Vec3, b: Vec3, bearing: number): Vec3 {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  if (!(len > 1e-6)) return mid;
  const t: Vec3 = [d[0] / len, d[1] / len, d[2] / len];
  const ref: Vec3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const e1raw = cross(t, ref);
  const l1 = Math.hypot(e1raw[0], e1raw[1], e1raw[2]);
  const e1: Vec3 = [e1raw[0] / l1, e1raw[1] / l1, e1raw[2] / l1];
  const e2 = cross(t, e1);
  const k = STREAM_BOW * len;
  const c = Math.cos(bearing);
  const s = Math.sin(bearing);
  return [mid[0] + k * (c * e1[0] + s * e2[0]), mid[1] + k * (c * e1[1] + s * e2[1]), mid[2] + k * (c * e1[2] + s * e2[2])];
}

/**
 * How many dots a chord shows: one per STREAM_PITCH, within STREAM_DOTS, unrounded. Dot i of a stream
 * sits at offset i / n and is drawn at `clamp(n − i, 0, 1)`, so a chord that grows or shrinks with
 * the orbits keeps its dots evenly spaced and fades its last one in or out, never popping one.
 */
export function streamCount(chord: number): number {
  return Math.min(STREAM_DOTS[1], Math.max(STREAM_DOTS[0], chord / STREAM_PITCH));
}

/** A galaxy stream dot: where, how far along (u), and how much of it is drawn (its count's fade). */
export interface StreamDot {
  pos: Vec3;
  u: number;
  presence: number;
}

/** A stream's curve at an ambient: its ends, its control point and its dot count (unrounded). */
export interface StreamCurve {
  a: Vec3;
  b: Vec3;
  c: Vec3;
  n: number;
}

/**
 * Row `row` of the streams texture at ambient `t`: from its parent's place to its child's (bodyWorld;
 * the feed's far end is `end`, the ring), its Bezier's control point and its count. Every dot of the
 * row shares it (streamPixels reads it once a row).
 */
export function streamCurve(data: BodyData, row: number, t: number, end?: Vec3): StreamCurve {
  const [from, to] = bodyTexel(data.streams, 0, row);
  const bearing = bodyTexel(data.streams, 1, row)[2];
  const a = bodyWorld(data, Math.round(from), t);
  const b = to >= 0 ? bodyWorld(data, Math.round(to), t) : (end ?? a);
  return { a, b, c: streamControl(a, b, bearing), n: streamCount(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])) };
}

/** Dot `i` of a stream's curve at ambient `t`: on its Bezier at offset i / n, flowing. */
export function streamDotOn({ a, b, c, n }: StreamCurve, i: number, t: number): StreamDot {
  const u = streamDotU(i / n, t);
  const om = 1 - u;
  const pos = [0, 1, 2].map((k) => om * om * a[k] + 2 * om * u * c[k] + u * u * b[k]) as Vec3;
  return { pos, u, presence: Math.min(1, Math.max(0, n - i)) };
}

/**
 * Dot `i` of row `row` of the streams texture at ambient `t`: from its parent's place to its child's
 * (bodyWorld; the feed's far end is `end`, the ring), on the stream's Bezier, at offset i / n.
 */
export function streamDot(data: BodyData, row: number, i: number, t: number, end?: Vec3): StreamDot {
  return streamDotOn(streamCurve(data, row, t, end), i, t);
}

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** The constants the galaxy's stream shader reads, generated from birth.ts and src/galaxy/generate.ts. */
export function glslStreamConstants(): string {
  return [
    '// The stream constants and the text band, generated from src/scene/node/stream.ts (birth.ts, src/galaxy/generate.ts).',
    `const float STREAM_CAP = ${lit(STREAM_CAP)};`,
    `const float FEED_CAP = ${lit(FEED_CAP)};`,
    `const float TEXT_BAND = ${lit(TEXT_BAND)};`,
    `const float BAND_MARGIN_PX = ${lit(BAND_MARGIN_PX)};`,
    `const float STREAM_BAND_SOFT_PX = ${lit(STREAM_BAND_SOFT_PX)};`,
    `const float STREAM_FADE[2] = float[2](${STREAM_FADE.map(lit).join(', ')});`,
    `const float STREAM_BOW = ${lit(STREAM_BOW)};`,
    `const float STREAM_PITCH = ${lit(STREAM_PITCH)};`,
    `const float STREAM_DOTS[2] = float[2](${STREAM_DOTS.map(lit).join(', ')});`,
  ].join('\n');
}
