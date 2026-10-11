// The reviewer's ring and its feed (design: docs/specs/2026-10-06-act-2-storyboard-and-network.md
// §3.7; galaxy-orbits §14.5): pure functions of `net.review`. Over 0..1 the ring visits the review
// planets in order, holding on each for most of its share and crossing to the next over the rest;
// past 1 it stays on the last while the feed (the stream from R0 to the ring) comes up over 1..1.2;
// over 1.5..2 both fade out. The ring changes nothing it passes over. On the galaxy it rides its
// visit (bodyWorld at the ambient), flat in the galaxy's plane, RING.radiusScale times the visit's
// outer radius (the planet with its moons).
import type { Vec3 } from '../math/vec';
import type { BodyData } from '../scene/node/bodyData';
import { bodyWorld } from '../scene/node/orbit';

export const RING = {
  /** The share of a visit's span the ring holds on it before crossing to the next. */
  hold: 0.7,
  /** The ring's radius over a visit: this times its outer radius (the planet with its moons). */
  radiusScale: 1.5,
  /** It fades in over review 0..`fadeIn`. */
  fadeIn: 0.03,
  /** It fades out (and the feed with it) over this span of review. */
  fadeOut: [1.5, 2],
  /** The feed comes up over this span of review. */
  feedIn: [1, 1.2],
  /**
   * The least outer radius it is drawn at, CSS px (flatRing.vert.glsl, ringDrawnRadius): from the
   * shots that frame the reviewer's light with the hub (170 to 210 off), a planet's ring is otherwise a
   * few px across, a grey dot no one reads as the light.
   */
  minPx: 9,
} as const;

/**
 * The ring's outer radius as drawn (world units), seen at `pxPerUnit` CSS px per world unit: its pose's
 * radius, never under RING.minPx on screen (the twin of flatRing.vert.glsl's floor).
 */
export function ringDrawnRadius(radius: number, pxPerUnit: number): number {
  return Math.max(radius, RING.minPx / pxPerUnit);
}

/** What the galaxy's ring needs of a visit: its row in the bodies texture and its outer radius (generate.ts pieceOuter). */
export interface RingVisit {
  row: number;
  radius: number;
}

export interface RingPose {
  /** The ring's centre. */
  position: Vec3;
  /** The ring's outer radius (`RING.radiusScale` times the visit's, blended across a crossing). */
  radius: number;
  /** Its alpha factor, 0..1. */
  presence: number;
  /** Where along the visits it is: j while it holds on visit j, j..j+1 while it crosses. Never decreases. */
  along: number;
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** The review span [from, to] over which the ring holds on visit `j` of `count` (the last holds to 1). */
export function visitHold(j: number, count: number): [number, number] {
  return [j / count, j < count - 1 ? (j + RING.hold) / count : 1];
}

/** The ring at `review` over `count` visits, each at `centre(j)` with outer radius `radius(j)`. */
function ringPose(review: number, count: number, centre: (j: number) => Vec3, radius: (j: number) => number): RingPose {
  const n = count;
  const presence = smoothstep(0, RING.fadeIn, review) * (1 - smoothstep(RING.fadeOut[0], RING.fadeOut[1], review));
  const x = Math.min(Math.max(review, 0), 1) * n;
  const j = Math.min(Math.floor(x), n - 1);
  if (j === n - 1) return { position: centre(n - 1), radius: RING.radiusScale * radius(n - 1), presence, along: n - 1 };
  const s = smoothstep(RING.hold, 1, x - j);
  const [a, b] = [centre(j), centre(j + 1)];
  const position: Vec3 = s === 0 ? a : ([0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * s) as Vec3);
  return { position, radius: RING.radiusScale * (radius(j) + (radius(j + 1) - radius(j)) * s), presence, along: j + s };
}

/** The galaxy's ring at `review` over `visits` (in visit order), riding them at ambient `ambient`. */
export function ringAt(review: number, visits: readonly RingVisit[], ambient: number, data: BodyData): RingPose {
  return ringPose(
    review,
    visits.length,
    (j) => bodyWorld(data, visits[j].row, ambient),
    (j) => visits[j].radius,
  );
}

/** The feed's alpha factor at `review`: up over 1..1.2, out over 1.5..2. */
export function feedAlpha(review: number): number {
  return smoothstep(RING.feedIn[0], RING.feedIn[1], review) * (1 - smoothstep(RING.fadeOut[0], RING.fadeOut[1], review));
}
