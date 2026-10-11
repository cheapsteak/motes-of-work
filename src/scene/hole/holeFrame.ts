// What a frame of the black hole is drawn from (docs/specs/2026-10-09-act-2-reskin.md §4.2), computed
// once on the CPU from the story's leaves, the camera and the ambient: where the hole is (the galactic
// centre, turning with the galaxy), its frame in view space (hole.ts HoleView), the disk's size on
// screen, its gain on every part and which side of the screen its disk approaches on. holeSystem.ts
// draws from it, and holeOnScreen.ts (the twin the clearance tests read) projects the same dots from
// it, so the two cannot drift. Pure: no GLSL is loaded here, so the e2e loader can read it too.
import { Matrix3, Matrix4, Vector3, type PerspectiveCamera } from 'three';
import { bodyIndex, type Galaxy } from '../../galaxy/generate';
import type { Vec3 } from '../../math/vec';
import { lampFocusRow } from '../../timeline/netTrack';
import type { SceneState } from '../../timeline/sceneState';
import { FREEZE_DIM } from '../node/birth';
import type { BodyData } from '../node/bodyData';
import { bodyPresence, lampGain } from '../node/bodyMote';
import { offScreenReachPx, offScreenSkip } from '../node/lod';
import { galacticToWorld, galaxyTurn } from '../node/orbit';
import { jetRho, type HoleView } from './hole';
import { HOLE_DOTS } from '../../galaxy/hole';
import {
  HOLE_DISK,
  HOLE_DOT,
  HOLE_EMBER,
  HOLE_INFALL,
  HOLE_JET,
  HOLE_KNOT,
  HOLE_LENS,
  HOLE_LOOK,
  HOLE_MOCK_DOTS,
  HOLE_RING,
  HOLE_STRAND,
  holeComp,
  holeSmallGain,
} from './holeLook';

/** A part's key in HOLE_MOCK_DOTS (holeComp's). */
export type HoleMockPart = keyof typeof HOLE_MOCK_DOTS;

/** The hole's parts as drawn: each mesh's name, its uPart (hole.vert.glsl), its compensation's key (holeComp) and its count. */
export const HOLE_PARTS = [
  { name: 'hole-disk', key: 'disk', part: 0 },
  { name: 'hole-arch', key: 'arch', part: 1 },
  { name: 'hole-ring', key: 'ring', part: 2 },
  { name: 'hole-jets', key: 'jets', part: 3 },
  { name: 'hole-knots', key: 'knot', part: 4 },
  { name: 'hole-infall', key: 'infall', part: 5 },
  { name: 'hole-strand-r0', key: 'strand0', part: 6 },
  { name: 'hole-strand-r1', key: 'strand1', part: 6 },
] as const satisfies readonly { name: string; key: HoleMockPart; part: number }[];

export type HolePartName = (typeof HOLE_PARTS)[number]['name'];

/** A part's instances, HOLE_DOTS's: the arch is a second draw of the disk's first HOLE_DOTS.arch dots. */
export function holePartCount(key: HoleMockPart): number {
  const h = HOLE_DOTS;
  const counts: Record<HoleMockPart, number> = {
    disk: h.disk,
    arch: h.arch,
    ring: h.ring,
    jets: 2 * h.jetsPerSide,
    knot: 2 * h.knotSlots * h.knotDots,
    infall: h.infallSlots * h.infallTrail,
    strand0: h.strand0,
    strand1: h.strand1,
  };
  return counts[key];
}

/** The largest a gaussian draw can be in holeAttrs.ts (Box–Muller from a draw floored at 1e-9): its knots' and disk's offsets. */
const GAUSS_MAX = Math.sqrt(-2 * Math.log(1e-9));

/**
 * How far from its centre (world units, × scale) anything the hole draws can stand once lensed, on each
 * view axis: the lens keeps every image within its view edge in the view plane, and its depth within
 * the point's own distance from the centre, which is at most a knot's at the jet's tip (its halo's
 * largest draw), the in-fall's start or the disk's rim. The off-screen skip and holeTopBound read it.
 */
export const HOLE_REACH =
  HOLE_LOOK.scale *
  Math.max(
    HOLE_LENS.edge + HOLE_LENS.rimGap + 1,
    Math.hypot(
      HOLE_JET.base + HOLE_LOOK.jetLength + GAUSS_MAX * (HOLE_KNOT.lift[0] + HOLE_KNOT.lift[1] * HOLE_LOOK.jetLength),
      GAUSS_MAX * HOLE_KNOT.spread * jetRho(HOLE_LOOK.jetLength),
      GAUSS_MAX * HOLE_KNOT.spread * jetRho(HOLE_LOOK.jetLength),
    ),
    HOLE_INFALL.from[1],
    Math.hypot(
      HOLE_DISK.inner + HOLE_DISK.streak.span * (1 + HOLE_DISK.motion.lifeJitter) + GAUSS_MAX * HOLE_DISK.streak.jitter,
      GAUSS_MAX * HOLE_DISK.height * 5,
    ),
  );

/** The largest dot the hole draws, CSS px: the largest size any part takes (a hot disk dot lifted to the most), × its compensation, at the nearest clamp. */
export const HOLE_DOT_MAX_PX =
  HOLE_DOT.near[1] *
  Math.max(
    (HOLE_DISK.size[1] + HOLE_DISK.motion.hotSize + HOLE_DISK.lift[0] * HOLE_DISK.lift[1]) * Math.max(holeComp('disk').size, holeComp('arch').size),
    HOLE_RING.size * holeComp('ring').size,
    HOLE_JET.size * holeComp('jets').size,
    HOLE_KNOT.size * holeComp('knot').size,
    HOLE_INFALL.size * holeComp('infall').size,
    Math.max(HOLE_STRAND.size, HOLE_EMBER.size) * Math.max(holeComp('strand0').size, holeComp('strand1').size),
  );

/** A frame of the hole (holeFrame). */
export interface HoleFrame {
  /** The hole's centre in the world. */
  world: Vec3;
  /**
   * The view every part's dots are drawn through (hole.ts HoleView). Its gain is the hole's, before the
   * per-dot clamp, as the inspector's uGain and lamp are; a part's compensation for its fewer dots
   * (holeComp) is not in it, but after the clamp (holeAlpha), so a dot's size lift is the inspector's.
   */
  view: HoleView;
  /** The hole's centre on screen (CSS px from the top left), and whether it is in front of the camera. */
  x: number;
  y: number;
  front: boolean;
  /** The disk's projected outer diameter (CSS px): HOLE_DISK.fade's end, twice, at the hole's depth. */
  diskPx: number;
  /** R0's presence × net.show: the hole is there (its shadow with it), lit or not. */
  present: number;
  /** The hole's gain on every part, before each part's compensation (re-skin Task 5's formula). */
  gain: number;
  /** How far from its centre on screen (CSS px) any of its dots can reach, on each axis: HOLE_REACH projected (lod.ts offScreenReachPx) and half the largest dot. */
  reachPx: number;
  /** Off the screen by more than its reach (lod.ts offScreenSkip): every part skips it whole, jets included. */
  skip: boolean;
  /** The side of the screen (−1 left, 1 right) on which the disk's matter approaches the camera. */
  approach: -1 | 1;
}

const eye = new Vector3();
const at = new Vector3();
const toWorld = new Matrix4();
const rot = new Matrix3();

/**
 * The hole at state `s` through `camera` on a screen of `size` CSS px at ambient `ambient`. Its gain on
 * every part is lampGain(R0) × bodyPresence(R0) × net.show × holeSmallGain(diskPx) × (1 − (1 −
 * FREEZE_DIM) × freeze.dress × net.focus): it is lit where the core is (lamps Off, Hood, Core and
 * Lineage), up with R0's build, smaller and dimmer from afar, and dimmed with the rest of the frame by
 * the freeze's dressing.
 */
export function holeFrame(
  s: SceneState,
  g: Galaxy,
  data: BodyData,
  camera: PerspectiveCamera,
  size: { width: number; height: number },
  ambient: number,
): HoleFrame {
  const r0 = bodyIndex(g, 'R0');
  const world = galacticToWorld(data, [0, 0, 0], ambient);
  camera.updateMatrixWorld();
  camera.getWorldPosition(eye);
  // The hole's frame (galactic axes turned with the galaxy, galacticToWorld) to the world, then to view.
  const a = galaxyTurn(ambient);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  toWorld.set(c, 0, sn, 0, 0, 1, 0, 0, -sn, 0, c, 0, 0, 0, 0, 1);
  rot.setFromMatrix4(camera.matrixWorldInverse).multiply(rot.clone().setFromMatrix4(toWorld));
  const viewRot = Array.from(rot.elements);
  const hv = at
    .set(...world)
    .applyMatrix4(camera.matrixWorldInverse)
    .toArray() as Vec3;
  // The camera in the hole's frame (r_s): the frame's axes dotted with the offset.
  const off = [eye.x - world[0], eye.y - world[1], eye.z - world[2]];
  const cam: Vec3 = [(off[0] * c - off[2] * sn) / HOLE_LOOK.scale, off[1] / HOLE_LOOK.scale, (off[0] * sn + off[2] * c) / HOLE_LOOK.scale];
  const depth = -hv[2];
  const front = depth > camera.near;
  const p = camera.projectionMatrix.elements;
  const focalY = 0.5 * size.height * p[5];
  const focalX = 0.5 * size.width * p[0];
  at.set(...world).project(camera);
  const x = ((at.x + 1) / 2) * size.width;
  const y = ((1 - at.y) / 2) * size.height;
  const diskPx = front ? (2 * HOLE_DISK.fade[1] * HOLE_LOOK.scale * focalY) / depth : 0;
  const clocks = { lamp: Math.round(s.net.lamp), lampRow: lampFocusRow(s.net.lampAt, g), focus: s.net.focus };
  const present = bodyPresence(r0, s.net.growth, data) * s.net.show;
  const freeze = 1 - (1 - FREEZE_DIM) * s.freeze.dress * s.net.focus;
  const gain = front ? lampGain(r0, clocks, data) * present * holeSmallGain(diskPx) * freeze : 0;
  const reach = offScreenReachPx(hv, HOLE_REACH, focalX, focalY, 0) + HOLE_DOT_MAX_PX / 2;
  const skip = front && offScreenSkip([x, y], reach, size.width, size.height);
  // The disk's matter moves along (−sin φ, 0, cos φ): it approaches most at the φ where that points at the camera.
  const phi = Math.atan2(-cam[0], cam[2]);
  const sideX = viewRot[0] * Math.cos(phi) + viewRot[6] * Math.sin(phi);
  return {
    world,
    view: { t: ambient, cam, viewRot, hv, gain },
    x,
    y,
    front,
    diskPx,
    present,
    gain,
    reachPx: reach,
    skip,
    approach: sideX < 0 ? -1 : 1,
  };
}

/**
 * A drawn dot's alpha (hole.vert.glsl's): its clamped alpha (hole.ts holeFinish) times its part's
 * compensation gain (holeComp), clamped to 1 again. The compensation stays out of HoleView.gain: there it
 * would also lift a bright dot's size (HOLE_DISK.lift), on top of the compensation's own size, which the
 * inspector's denser dots never had.
 */
export function holeAlpha(alpha: number, key: HoleMockPart): number {
  return Math.min(1, alpha * holeComp(key).gain);
}
