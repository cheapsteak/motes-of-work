// The TypeScript twin of the black hole the page draws, on screen (test-only, as galaxyOnScreen.ts: the
// unit clearance sweeps and the e2e machine twin read it). Every drawn dot of the hole through the
// twins (hole.ts) and the frame's view (holeFrame.ts, which holeSystem.ts draws from too): every dot of
// the ring, the jets, the knots, the in-fall and both strands, and a uniform tenth of the disk and of
// the arch. The parts that rise highest (the jets, the knots, the arch's top) are counted whole or at
// a stride fine enough that the top is within a pixel of every dot's (holeOnScreen.test.ts).
import { Vector3, type PerspectiveCamera } from 'three';
import type { SceneState } from '../../timeline/sceneState';
import { galaxyOf } from '../node/galaxyOnScreen';
import {
  diskDot,
  diskPlace,
  holeDotPx,
  infallDot,
  infallPlace,
  jetDot,
  jetPlace,
  knotDot,
  knotPlace,
  ringDot,
  strandDot,
  strandPlace,
  strandWindow,
  type DiskPlace,
  type HoleDot,
} from './hole';
import { buildHoleAttrs, PART_STRIDE, type HoleAttrs } from './holeAttrs';
import { holeAlpha, holeFrame, type HoleMockPart } from './holeFrame';
import { HOLE_DOTS } from '../../galaxy/hole';
import { HOLE_DISK, holeComp } from './holeLook';

/** The disk's and the arch's stride: a uniform tenth of their dots. */
export const HOLE_DISK_STRIDE = 10;

let attrsCache: HoleAttrs | null = null;
/** The essay's hole's dots (its galaxy's seed), built once. */
function holeAttrsOf(): HoleAttrs {
  attrsCache ??= buildHoleAttrs(galaxyOf().g.seed);
  return attrsCache;
}

/** Every counted dot's place in the hole's frame at one ambient (hole.ts's *Place): what the view does not change. */
interface HolePlaces {
  disk: DiskPlace[];
  arch: DiskPlace[];
  jets: ReturnType<typeof jetPlace>[];
  knots: ReturnType<typeof knotPlace>[];
  infall: ReturnType<typeof infallPlace>[];
  strand0: ReturnType<typeof strandPlace>[];
  strand1: ReturnType<typeof strandPlace>[];
}

/**
 * Small caches of pure functions, the oldest dropped past `size`: the sweeps take the same few ambients
 * (AMBIENT_GRID) at every place, and the same view at every place of a hold.
 */
function cached<T>(size: number): (key: number | string, make: () => T) => T {
  const map = new Map<number | string, T>();
  return (key, make) => {
    let v = map.get(key);
    if (v === undefined) {
      v = make();
      map.set(key, v);
      if (map.size > size) map.delete(map.keys().next().value!);
    }
    return v;
  };
}

const placesCache = cached<HolePlaces>(16);
/** The places of every dot holeDots counts at ambient `t`, computed once per ambient. */
function placesAt(t: number): HolePlaces {
  return placesCache(t, () => {
    const A = holeAttrsOf();
    const all = <T>(a: Float32Array, place: (i: number) => T): T[] => Array.from({ length: a.length / PART_STRIDE }, (_, i) => place(i));
    const disk: DiskPlace[] = [];
    const arch: DiskPlace[] = [];
    for (let i = 0; i < HOLE_DOTS.disk; i += HOLE_DISK_STRIDE) disk.push(diskPlace(A.disk, i, t, 0));
    for (let i = 0; i < HOLE_DOTS.arch; i += HOLE_DISK_STRIDE) arch.push(diskPlace(A.disk, i, t, HOLE_DISK.motion.arcDelay));
    return {
      disk,
      arch,
      jets: all(A.jets, (i) => jetPlace(A.jets, i, t)),
      knots: all(A.knots, (i) => knotPlace(A.knots, i, t)),
      infall: all(A.infall, (i) => infallPlace(A.infall, i, t)),
      strand0: all(A.strand0, (i) => strandPlace(A.strand0, i, t)),
      strand1: all(A.strand1, (i) => strandPlace(A.strand1, i, t)),
    };
  });
}

/** A hole dot on screen: its centre (CSS px from the top left) and its size (CSS px). */
export interface HoleScreenDot {
  x: number;
  y: number;
  px: number;
}

const dotsCache = cached<readonly HoleScreenDot[]>(32);
const q = new Vector3();

/**
 * Every hole dot drawn at state `s` and ambient `ambient` through `camera` on a `width` × `height` CSS px
 * screen: its centre (CSS px from the top left) and its size (CSS px). A dot is drawn while its alpha
 * (its part's compensation after the clamp: holeAlpha) is above 0 and it is in front of the camera; one
 * whose centre is off a side covers nothing and is left out. None while the hole is unlit, not up, not
 * shown or off the screen by more than its reach. Until the re-skin's Task 6 keys them: R0's strand
 * whole and clean, R1's window closed, the knots' fronts at (0, 0).
 *
 * The list is a pure function of the frame's view (holeFrame), the projection and the screen, so it is
 * kept for the last few of them (a hold's samples repeat them), with each ambient's dot places
 * (placesAt): the same list, shared, so a caller must not change it.
 */
export function holeDots(s: SceneState, ambient: number, camera: PerspectiveCamera, width: number, height: number): readonly HoleScreenDot[] {
  const { g, data } = galaxyOf();
  const f = holeFrame(s, g, data, camera, { width, height }, ambient);
  if (!(f.gain > 0) || !f.front || f.skip) return [];
  const v = f.view;
  const key = [v.t, v.gain, ...v.cam, ...v.viewRot, ...v.hv, ...camera.projectionMatrix.elements, width, height].map((x) => (Object.is(x, -0) ? '-0' : String(x))).join(',');
  return dotsCache(key, () => {
    const A = holeAttrsOf();
    const P = placesAt(v.t);
    const m = camera.projectionMatrix;
    const out: HoleScreenDot[] = [];
    const take = (d: HoleDot, key: HoleMockPart) => {
      const depth = -d.view[2];
      if (!(holeAlpha(d.alpha, key) > 0) || !(depth > 0)) return;
      q.set(d.view[0], d.view[1], d.view[2]).applyMatrix4(m);
      const x = ((q.x + 1) / 2) * width;
      if (x < 0 || x > width) return;
      out.push({ x, y: ((1 - q.y) / 2) * height, px: holeDotPx(d.sizeCss * holeComp(key).size, depth, 1) });
    };
    P.disk.forEach((d, k) => take(diskDot(A.disk, k * HOLE_DISK_STRIDE, v, 0, d), 'disk'));
    P.arch.forEach((d, k) => take(diskDot(A.disk, k * HOLE_DISK_STRIDE, v, 1, d), 'arch'));
    for (let i = 0; i < A.ring.length / PART_STRIDE; i++) take(ringDot(A.ring, i, v), 'ring');
    P.jets.forEach((p, i) => take(jetDot(A.jets, i, v, p), 'jets'));
    P.knots.forEach((p, i) => take(knotDot(A.knots, i, v, { ember: 0, clean: 0 }, p), 'knot'));
    P.infall.forEach((p, i) => take(infallDot(A.infall, i, v, p), 'infall'));
    P.strand0.forEach((p, i) => take(strandDot(A.strand0, i, v, { head: strandWindow(0, 0).head, heat: 0 }, p), 'strand0'));
    P.strand1.forEach((p, i) => take(strandDot(A.strand1, i, v, { head: strandWindow(1, 0).head, heat: 0 }, p), 'strand1'));
    return out;
  });
}

/** The top of the hole as drawn (CSS px from the top): the least y − px / 2 over holeDots, every part's, the knots' among them; null if no dot is drawn. */
export function holeTop(s: SceneState, ambient: number, camera: PerspectiveCamera, width: number, height: number): number | null {
  let top = Infinity;
  for (const d of holeDots(s, ambient, camera, width, height)) top = Math.min(top, d.y - d.px / 2);
  return Number.isFinite(top) ? top : null;
}

/**
 * A bound on holeTop that needs no dot (CSS px from the top): the hole's centre less its reach on
 * screen (holeFrame's reachPx), so no drawn dot's top is higher; null where none is drawn. A sweep that
 * already has a top at or above it need not take the hole's dots.
 */
export function holeTopBound(s: SceneState, ambient: number, camera: PerspectiveCamera, width: number, height: number): number | null {
  const { g, data } = galaxyOf();
  const f = holeFrame(s, g, data, camera, { width, height }, ambient);
  return f.gain > 0 && f.front && !f.skip ? f.y - f.reachPx : null;
}
