// The galaxy's two static textures (docs/specs/2026-10-07-galaxy-orbits.md §12.1, §14), packed once
// from the generated galaxy: RGBA32F, BODY_TEXELS texels a row, one row per body (the bodies
// texture, row = Body.index) or per stream (the streams texture, the reviewer's feed in its last
// row). The shaders texelFetch them; orbit.ts reads the same Float32Arrays, so the two mirrors read
// the same float32 values.
//
// Bodies, row = Body.index:
//   T0 spot.xyz (0 for what orbits), kind (0 core, 1 star, 2 planet, 3 moon)
//   T1 a, e, tilt, tiltAz                 T2 omega0, precession, period, phase (turns)
//   T3 host row (−1 none), R, born, dur   T4 fixAt, hiAt, hop, cracked (0/1)
//   T5 derpSeed, derpPhase, star row, rule row
//   T6 base r, g, b, light mode (0 self-lit, 1 terminator): a star's tint (star.ts starTint of its
//      temperature) and 0; every other body the agents' blue (NODE_AGENT) and 1
//   T7 a star's look: brightness, spikes (4 or 6), its breath's period and phase; 0 for every other body
// Streams, row = index into Galaxy.streams, then the feed:
//   T0 from, to, kind (0 out, 1 side, 2 in, 3 feed), born
//   T1 hiAt, hop, bowBearing, the child's fixAt
// A `hiAt` or `fixAt` that never comes is NODE_NEVER; a `hop` off the defect's lineage is −1; the
// core's and the stars' orbit texels are 0. The feed runs from R0 to the reviewer (to −1), comes up
// at 0, never lights, carries R0's hop plus one and R0's fixAt, and has no bow. Both textures are
// BODY_TEXELS wide, as the network's two are one width, so one texel reader serves both: a stream
// row's T2–T7 are 0, free for what the streams need later.
import type { Galaxy } from '../../galaxy/generate';
import { hexToRgb, NODE_NEVER, NODE_PALETTE } from './birth';
import { starTint } from './star';

/** Texels per row, in both textures. */
export const BODY_TEXELS = 8;

/** A body's light mode as T6.w carries it: a star lights itself; every other body is lit (a terminator from Task 7). */
export const LIGHT_MODE = { selfLit: 0, terminator: 1 } as const;

const AGENT = hexToRgb(NODE_PALETTE.NODE_AGENT);
const ROW = BODY_TEXELS * 4;

/** A body's kind as the texture carries it (`T0.w`). */
export const BODY_KIND = { core: 0, star: 1, planet: 2, moon: 3 } as const;
/** A stream's kind as the texture carries it (`T0.z`). */
export const STREAM_KIND = { out: 0, side: 1, in: 2, feed: 3 } as const;

/** The packed textures: `bodies` is `BODY_TEXELS × bodyCount` texels, `streams` `BODY_TEXELS × streamCount`. */
export interface BodyData {
  bodies: Float32Array;
  streams: Float32Array;
  bodyCount: number;
  /** Every stream plus the feed. */
  streamCount: number;
  /** The feed's row in `streams`: the last. */
  feedRow: number;
  /** N0's row in `bodies`: the world's origin. */
  n0Row: number;
}

const never = (v: number | null): number => (v === null ? NODE_NEVER : v);
const hop = (v: number | null): number => (v === null ? -1 : v);

export function packBodyData(g: Galaxy): BodyData {
  const bodyCount = g.bodies.length;
  const streamCount = g.streams.length + 1;
  const bodies = new Float32Array(bodyCount * ROW);
  const streams = new Float32Array(streamCount * ROW);
  for (const b of g.bodies) {
    const o = b.orbit;
    const look = b.look;
    bodies.set(
      // prettier-ignore
      [ // one line per texel, T0..T7
        ...(b.spot ?? [0, 0, 0]), BODY_KIND[b.kind],
        o?.a ?? 0, o?.e ?? 0, o?.tilt ?? 0, o?.tiltAz ?? 0,
        o?.omega0 ?? 0, o?.precession ?? 0, o?.period ?? 0, o?.phase ?? 0,
        b.host, b.R, b.born, b.dur,
        never(b.fixAt), never(b.hiAt), hop(b.hop), b.cracked ? 1 : 0,
        b.derpSeed, b.derpPhase, b.star, b.rule,
        ...(look ? starTint(look.temperature) : AGENT), look ? LIGHT_MODE.selfLit : LIGHT_MODE.terminator,
        look?.brightness ?? 0, look?.spikes ?? 0, look?.period ?? 0, look?.phase ?? 0,
      ],
      b.index * ROW,
    );
  }
  const putStream = (row: number, values: number[]) => streams.set(values, row * ROW);
  g.streams.forEach((s, row) => {
    putStream(row, [s.from, s.to, STREAM_KIND[s.kind], s.born, never(s.hiAt), hop(s.hop), s.bowBearing, never(g.bodies[s.to].fixAt)]);
  });
  const r0 = g.bodies[g.feedFrom];
  const feedRow = streamCount - 1;
  putStream(feedRow, [r0.index, -1, STREAM_KIND.feed, 0, NODE_NEVER, r0.hop === null ? -1 : r0.hop + 1, 0, never(r0.fixAt)]);
  const n0Row = g.ids.N0;
  if (n0Row === undefined) throw new Error('packBodyData: the galaxy has no N0');
  return { bodies, streams, bodyCount, streamCount, feedRow, n0Row };
}

/** Texel `t` of row `row` of either texture (texelFetch(tex, ivec2(t, row), 0)). */
export function bodyTexel(data: Float32Array, t: number, row: number): [number, number, number, number] {
  const i = row * ROW + t * 4;
  return [data[i], data[i + 1], data[i + 2], data[i + 3]];
}
