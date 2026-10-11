// The TypeScript twin of the black hole the page draws, on screen (test-only, as galaxyOnScreen.ts: the
// unit clearance sweeps and the e2e machine twin read it). Every drawn dot of the hole through the
// twins (hole.ts) and the frame's view (holeFrame.ts, which holeSystem.ts draws from too): every dot of
// the ring, the jets, the knots, the in-fall and both strands, and a uniform tenth of the disk and of
// the arch. The parts that rise highest (the jets, the knots, the arch's top) are counted whole or at
// a stride fine enough that the top is within a pixel of every dot's (holeOnScreen.test.ts).
import { Vector3, type PerspectiveCamera } from 'three';
import type { SceneState } from '../../timeline/sceneState';
import { galaxyOf } from '../node/galaxyOnScreen';
import { diskDot, holeDotPx, infallDot, jetDot, knotDot, ringDot, strandDot, strandWindow, type HoleDot } from './hole';
import { buildHoleAttrs, PART_STRIDE, type HoleAttrs } from './holeAttrs';
import { holeAlpha, holeFrame, type HoleMockPart } from './holeFrame';
import { HOLE_DOTS } from '../../galaxy/hole';
import { holeComp } from './holeLook';

/** The disk's and the arch's stride: a uniform tenth of their dots. */
export const HOLE_DISK_STRIDE = 10;

let attrsCache: HoleAttrs | null = null;
/** The essay's hole's dots (its galaxy's seed), built once. */
function holeAttrsOf(): HoleAttrs {
  attrsCache ??= buildHoleAttrs(galaxyOf().g.seed);
  return attrsCache;
}

const q = new Vector3();

/**
 * Every hole dot drawn at state `s` and ambient `ambient` through `camera` on a `width` × `height` CSS px
 * screen: its centre (CSS px from the top left) and its size (CSS px). A dot is drawn while its alpha
 * (its part's compensation after the clamp: holeAlpha) is above 0 and it is in front of the camera; one
 * whose centre is off a side covers nothing and is left out. None while the hole is unlit, not up, not
 * shown or off the screen by more than its reach. Until the re-skin's Task 6 keys them: R0's strand
 * whole and clean, R1's window closed, the knots' fronts at (0, 0).
 */
export function holeDots(
  s: SceneState,
  ambient: number,
  camera: PerspectiveCamera,
  width: number,
  height: number,
): { x: number; y: number; px: number }[] {
  const { g, data } = galaxyOf();
  const f = holeFrame(s, g, data, camera, { width, height }, ambient);
  if (!(f.gain > 0) || !f.front || f.skip) return [];
  const A = holeAttrsOf();
  const v = f.view;
  const out: { x: number; y: number; px: number }[] = [];
  const take = (d: HoleDot, key: HoleMockPart) => {
    const depth = -d.view[2];
    if (!(holeAlpha(d.alpha, key) > 0) || !(depth > 0)) return;
    q.set(d.view[0], d.view[1], d.view[2]).applyMatrix4(camera.projectionMatrix);
    const x = ((q.x + 1) / 2) * width;
    if (x < 0 || x > width) return;
    out.push({ x, y: ((1 - q.y) / 2) * height, px: holeDotPx(d.sizeCss * holeComp(key).size, depth, 1) });
  };
  for (let i = 0; i < HOLE_DOTS.disk; i += HOLE_DISK_STRIDE) take(diskDot(A.disk, i, v, 0), 'disk');
  for (let i = 0; i < HOLE_DOTS.arch; i += HOLE_DISK_STRIDE) take(diskDot(A.disk, i, v, 1), 'arch');
  const each = (a: Float32Array, dot: (i: number) => HoleDot, key: HoleMockPart) => {
    for (let i = 0; i < a.length / PART_STRIDE; i++) take(dot(i), key);
  };
  each(A.ring, (i) => ringDot(A.ring, i, v), 'ring');
  each(A.jets, (i) => jetDot(A.jets, i, v), 'jets');
  each(A.knots, (i) => knotDot(A.knots, i, v, { ember: 0, clean: 0 }), 'knot');
  each(A.infall, (i) => infallDot(A.infall, i, v), 'infall');
  each(A.strand0, (i) => strandDot(A.strand0, i, v, { head: strandWindow(0, 0).head, heat: 0 }), 'strand0');
  each(A.strand1, (i) => strandDot(A.strand1, i, v, { head: strandWindow(1, 0).head, heat: 0 }), 'strand1');
  return out;
}

/** The top of the hole as drawn (CSS px from the top): the least y − px / 2 over holeDots, every part's, the knots' among them; null if no dot is drawn. */
export function holeTop(s: SceneState, ambient: number, camera: PerspectiveCamera, width: number, height: number): number | null {
  let top = Infinity;
  for (const d of holeDots(s, ambient, camera, width, height)) top = Math.min(top, d.y - d.px / 2);
  return Number.isFinite(top) ? top : null;
}
