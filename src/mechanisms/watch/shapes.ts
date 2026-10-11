// Part geometry for the watch movement and, point for point, for its music-box twin.
// Each sampler returns points in part space; index.ts poses the parts.

import { BufferGeometry } from 'three';
import { hash01 } from '../../math/hash';
import type { Vec2, Vec3 } from '../../math/vec';
import { extrudeProfile } from '../../shapes/extrude';
import { cycloidalGear } from '../../shapes/involute';
import { axle, ball, circle, plate } from '../../shapes/primitives';
import { merge } from '../partGeometry';
import {
  angleKey,
  clubToothOutline,
  crossingWindows,
  forkOutline,
  helixCurve,
  hullOfCircles,
  lazy,
  morph,
  pairedTubes,
  spiral,
  type PartSampler,
} from './geometry';
import {
  BALANCE,
  BALANCE_CENTRE,
  BARREL,
  BARREL_BRIDGE_FOOT,
  BARREL_CENTRE,
  BARREL_DEPTH,
  BEDPLATE,
  BRIDGE_DEPTH,
  CENTRE,
  CENTRE_CENTRE,
  COCK_FOOT,
  COMB,
  CYLINDER,
  ESCAPE,
  ESCAPE_CENTRE,
  ESCAPE_PINION,
  FLY,
  FORK_PIN,
  FOURTH,
  FOURTH_CENTRE,
  GREAT_WHEEL,
  HAIRSPRING,
  IMPULSE_PIN_RADIUS,
  PALLET_CENTRE,
  PALLET_DISTANCE,
  PINION_LENGTH,
  PLATE,
  STONE_ANGLE,
  THIRD,
  THIRD_CENTRE,
  TWIN_PINION_OFFSET,
  TWIN_TRAIN,
  WHEEL_DEPTH,
  WORM,
  Z,
  moduleOf,
  type TrainWheel,
} from './layout';

const TWIN_MODULE = 0.02;
/** Radius of every arbor (and of the bores they pass through). Thin: seen end-on, an arbor piles its motes into a dot. */
const ARBOR = 0.018;
const BRIDGE_UNDERSIDE = Z.bridge - BRIDGE_DEPTH / 2;

const shifted = (g: BufferGeometry, x: number, y: number, z: number): BufferGeometry => g.translate(x, y, z);

/** A cylinder of `radius` along z from z0 to z1. */
const rod = (radius: number, z0: number, z1: number, segments = 16): BufferGeometry =>
  axle(radius, z1 - z0, segments).translate(0, 0, (z0 + z1) / 2);

/** A box from `min` to `max`. */
const box = (min: Vec3, max: Vec3): BufferGeometry =>
  plate(max[0] - min[0], max[1] - min[1], max[2] - min[2], 0).translate(
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  );

// ---------------------------------------------------------------------------------------------
// The watch.

/** The pillar plate: a disc under everything, its front face on z = 0. */
const plateGeom = () =>
  shifted(extrudeProfile(circle(0, 0, PLATE.radius, 120), [], PLATE.depth), 0, 0, -PLATE.depth / 2);

/** Mainspring barrel: a toothed drum on its arbor, the arbor from the plate to the barrel bridge. */
function barrelGeom(): BufferGeometry {
  const drum = extrudeProfile(
    cycloidalGear({ teeth: BARREL.teeth, module: moduleOf(BARREL) }),
    [circle(0, 0, 0.06)],
    BARREL_DEPTH,
  );
  return merge(drum, rod(0.06, -Z.barrel, BRIDGE_UNDERSIDE - Z.barrel));
}

/**
 * A train wheel with `crossings` at its own layer `zWheel` (world), its pinion at `zPinion`
 * (world, meshing the wheel that drives it), on an arbor from the plate to the train bridge.
 */
function trainWheelGeom(
  w: TrainWheel,
  driverModule: number,
  zWheel: number,
  zPinion: number,
  crossings: number,
): BufferGeometry {
  const m = moduleOf(w);
  const root = w.pitchRadius - 1.6 * m;
  const wheel = extrudeProfile(
    cycloidalGear({ teeth: w.teeth, module: m }),
    [circle(0, 0, ARBOR, 16), ...crossingWindows(crossings, 0.075, root - 0.06, 0.022)],
    WHEEL_DEPTH,
  );
  const pinion = extrudeProfile(
    cycloidalGear({ teeth: w.pinionTeeth, module: driverModule }),
    [circle(0, 0, ARBOR, 16)],
    PINION_LENGTH,
  ).translate(0, 0, zPinion - zWheel);
  return merge(wheel, pinion, rod(ARBOR, -zWheel, BRIDGE_UNDERSIDE - zWheel));
}

const centreGeom = () => trainWheelGeom(CENTRE, moduleOf(BARREL), Z.layerA, Z.barrel, 5);
const thirdGeom = () => trainWheelGeom(THIRD, moduleOf(CENTRE), Z.layerB, Z.layerA, 4);
const fourthGeom = () => trainWheelGeom(FOURTH, moduleOf(THIRD), Z.layerA, Z.layerB, 4);

/** Escape wheel (15 club teeth, five crossings) with its pinion under it in layer A. */
function escapeGeom(): BufferGeometry {
  const wheel = extrudeProfile(
    clubToothOutline(ESCAPE.teeth, ESCAPE.lockRadius, ESCAPE.rootRadius),
    [circle(0, 0, ARBOR, 16), ...crossingWindows(ESCAPE.crossings, ESCAPE.hub, ESCAPE.rimInner, 0.018)],
    WHEEL_DEPTH,
  );
  const pinion = extrudeProfile(
    cycloidalGear({ teeth: ESCAPE_PINION, module: moduleOf(FOURTH) }),
    [circle(0, 0, ARBOR, 16)],
    PINION_LENGTH,
  ).translate(0, 0, Z.layerA - Z.layerB);
  return merge(wheel, pinion, rod(ARBOR, -Z.layerB, BRIDGE_UNDERSIDE - Z.layerB));
}

/**
 * Centres of the two pallet stones in the pallet arbor's frame (the line of centres along +x):
 * just outside the escape wheel's locking circle at ∓30 degrees as seen from the escape arbor,
 * nudged half a degree clockwise so a resting tooth's corner meets the stone's face.
 */
export function stoneCentres(): [Vec2, Vec2] {
  const r = ESCAPE.lockRadius + 0.03;
  const at = (a: number): Vec2 => [-PALLET_DISTANCE + r * Math.cos(a), r * Math.sin(a)];
  const nudge = (0.5 * Math.PI) / 180;
  return [at(-STONE_ANGLE - nudge), at(STONE_ANGLE - nudge)];
}

/**
 * Pallet fork section: twice a real fork's lever width and depth, and arms widened on their outer
 * side only (the inner side stays clear of the escape wheel's teeth), so the escapement's critical
 * part reads on screen.
 */
export const FORK = { armHalfWidth: 0.034, armOuterHalfWidth: 0.102, leverHalfWidth: 0.076 } as const;
const FORK_DEPTH = 0.08;

/** Pallet fork: the anchor with its two ruby stones, on its arbor; the lever along +x. */
function palletGeom(): BufferGeometry {
  const stones = stoneCentres();
  const fork = extrudeProfile(forkOutline({ stones, pin: FORK_PIN, ...FORK }), [circle(0, 0, ARBOR, 16)], FORK_DEPTH);
  // Each stone is a slab, long along its radius from the escape arbor.
  const stoneGeoms = stones.map(([x, y]) => {
    const radial = Math.atan2(y, x + PALLET_DISTANCE);
    return plate(0.09, 0.032, 0.07, 0).rotateZ(radial).translate(x, y, 0);
  });
  return merge(fork, ...stoneGeoms, rod(ARBOR, -Z.layerB, BRIDGE_UNDERSIDE - Z.layerB));
}

/**
 * Balance: a rim on three arms with timing screws round it, on its staff (plate to cock), with the
 * roller and its impulse pin down at the fork's level. The pin points along -x, at the fork.
 */
function balanceGeom(): BufferGeometry {
  const { rimOuter, rimInner, arms, screws, depth } = BALANCE;
  const wheel = extrudeProfile(
    circle(0, 0, rimOuter, 96),
    [circle(0, 0, ARBOR, 16), ...crossingWindows(arms, 0.09, rimInner, 0.03, Math.PI / 2)],
    depth,
  );
  const screwBalls = Array.from({ length: screws }, (_, i) => {
    const a = ((i + 0.5) / screws) * Math.PI * 2;
    return ball(0.028).translate((rimOuter + 0.02) * Math.cos(a), (rimOuter + 0.02) * Math.sin(a), 0);
  });
  const rollerZ = Z.layerB + 0.07 - Z.balance;
  const roller = extrudeProfile(
    circle(0, 0, IMPULSE_PIN_RADIUS + 0.035, 32),
    [circle(0, 0, ARBOR, 16)],
    0.04,
  ).translate(0, 0, rollerZ);
  const pin = rod(0.022, Z.layerB - 0.04 - Z.balance, rollerZ - 0.02, 12).translate(-IMPULSE_PIN_RADIUS, 0, 0);
  // The staff from the roller up to the cock (below the roller it would only pile up motes end-on).
  const staff = rod(ARBOR, rollerZ - 0.02, Z.cock - BRIDGE_DEPTH / 2 - Z.balance);
  return merge(wheel, ...screwBalls, roller, pin, staff);
}

/** Bridges: barrel bridge, train bridge and pallet bridge at one height, the balance cock above. */
function bridgesGeom(): BufferGeometry {
  const pivot = ([x, y]: Vec2) => circle(x, y, 0.035, 16);
  const at = ([x, y]: Vec2, r: number): [number, number, number] => [x, y, r];
  const bridge = (circles: [number, number, number][], holes: Vec2[], z: number) =>
    extrudeProfile(hullOfCircles(circles), holes.map(pivot), BRIDGE_DEPTH).translate(0, 0, z);
  return merge(
    bridge([at(BARREL_CENTRE, 0.32), at(BARREL_BRIDGE_FOOT, 0.22)], [BARREL_CENTRE], Z.bridge),
    bridge(
      [at(CENTRE_CENTRE, 0.15), at(THIRD_CENTRE, 0.13), at(FOURTH_CENTRE, 0.13)],
      [CENTRE_CENTRE, THIRD_CENTRE, FOURTH_CENTRE],
      Z.bridge,
    ),
    bridge([at(ESCAPE_CENTRE, 0.12), at(PALLET_CENTRE, 0.1)], [ESCAPE_CENTRE, PALLET_CENTRE], Z.bridge),
    bridge([at(BALANCE_CENTRE, 0.17), at(COCK_FOOT, 0.24)], [BALANCE_CENTRE], Z.cock),
  );
}

/** Pivot jewels sitting on the bridges over each arbor of the train and escapement. */
export const JEWELS: Vec3[] = [
  ...[CENTRE_CENTRE, THIRD_CENTRE, FOURTH_CENTRE, ESCAPE_CENTRE, PALLET_CENTRE].map(
    ([x, y]): Vec3 => [x, y, Z.bridge + BRIDGE_DEPTH / 2 + 0.015],
  ),
  [BALANCE_CENTRE[0], BALANCE_CENTRE[1], Z.cock + BRIDGE_DEPTH / 2 + 0.015],
];
const jewelsGeom = () => merge(...JEWELS.map(([x, y, z]) => rod(0.06, z - 0.015, z + 0.015, 24).translate(x, y, 0)));

// ---------------------------------------------------------------------------------------------
// The music-box twin. Part space has the arbor along z, as for the watch; index.ts lays the
// cylinder and the governor train on their sides.

const bedplateGeom = () =>
  shifted(plate(BEDPLATE.width, BEDPLATE.height, PLATE.depth, BEDPLATE.corner), 0, 0, -PLATE.depth / 2);

/** Pinned cylinder along z with its great wheel at the +z end and stub arbors at both ends. */
function cylinderGeom(): BufferGeometry {
  const { radius, length, pins } = CYLINDER;
  const half = length / 2;
  const pinBalls = Array.from({ length: pins }, (_, i) => {
    const z = -half + 0.06 + (length - 0.12) * hash01(i, 11);
    const a = Math.PI * 2 * hash01(i, 12);
    return ball(0.022).translate((radius + 0.01) * Math.cos(a), (radius + 0.01) * Math.sin(a), z);
  });
  const great = extrudeProfile(
    cycloidalGear({ teeth: GREAT_WHEEL.teeth, module: moduleOf(GREAT_WHEEL) }),
    [circle(0, 0, 0.04, 16)],
    WHEEL_DEPTH,
  ).translate(0, 0, GREAT_WHEEL.at);
  return merge(
    axle(radius, length, 48),
    ...pinBalls,
    great,
    rod(0.04, half, GREAT_WHEEL.at + 0.12),
    rod(0.04, -half - 0.12, -half),
  );
}

/** A governor-train wheel of the twin, its pinion back along the arbor. */
function twinWheelGeom(teeth: number, pinionTeeth: number): BufferGeometry {
  const root = (TWIN_MODULE * teeth) / 2 - 1.6 * TWIN_MODULE;
  const wheel = extrudeProfile(
    cycloidalGear({ teeth, module: TWIN_MODULE }),
    [circle(0, 0, ARBOR, 16), ...crossingWindows(4, 0.07, root - 0.045, 0.02)],
    WHEEL_DEPTH,
  );
  const pinion = extrudeProfile(
    cycloidalGear({ teeth: pinionTeeth, module: TWIN_MODULE }),
    [circle(0, 0, ARBOR, 16)],
    PINION_LENGTH,
  ).translate(0, 0, TWIN_PINION_OFFSET);
  return merge(wheel, pinion, rod(ARBOR, TWIN_PINION_OFFSET - 0.1, 0.08));
}

const twinWheel = (i: number) => () => twinWheelGeom(TWIN_TRAIN[i].teeth, TWIN_TRAIN[i].pinionTeeth);

/**
 * Steel comb: one solid block on the bedplate, its graduated tines cut by narrow slots and reaching
 * under the cylinder. Extruded whole from the bedplate to the tines' front face, so it reads as a
 * slab of steel, not a row of lines.
 */
function combGeom(): BufferGeometry {
  const { tines, left, pitch, tineWidth, tipY, z, tineDepth } = COMB;
  const rootY = (i: number) => -0.6 - 0.4 * (1 - i / (tines - 1));
  const right = left + (tines - 1) * pitch;
  // Counter-clockwise: along the bottom, up the right end, then each tine from right to left.
  const outline: Vec2[] = [
    [left - 0.12, rootY(0) - 0.32],
    [right + 0.12, rootY(tines - 1) - 0.32],
    [right + 0.12, rootY(tines - 1)],
  ];
  for (let i = tines - 1; i >= 0; i--) {
    const x = left + i * pitch;
    outline.push(
      [x + tineWidth / 2, rootY(i)],
      [x + tineWidth / 2, tipY],
      [x - tineWidth / 2, tipY],
      [x - tineWidth / 2, rootY(i)],
    );
  }
  outline.push([left - 0.12, rootY(0)]);
  const depth = z + tineDepth / 2;
  return extrudeProfile(outline, [], depth).translate(0, 0, depth / 2);
}

/**
 * Governor cock: a foot, an upright post outside the fly's sweep, and an arm over the arbor, set
 * diagonally (towards +x, +y) so the post clears the governor train.
 */
function governorCockGeom(): BufferGeometry {
  const post = FLY.vaneSpan + 0.15;
  const top = FLY.arbor + 0.06;
  return merge(
    box([post - 0.12, -0.12, 0], [post + 0.12, 0.12, 0.06]),
    box([post - 0.04, -0.05, 0.06], [post + 0.04, 0.05, top]),
    box([-0.06, -0.05, top], [post + 0.04, 0.05, top + 0.06]),
  ).rotateZ(Math.PI / 4);
}

/** The fly (air brake): pitched vanes high on an upright arbor. */
function flyGeom(): BufferGeometry {
  const { arbor, vanes, vaneSpan, vaneHeight, vanePitch, vaneZ } = FLY;
  // Each vane starts in the xz plane along +x, is pitched about its own radius, then set round.
  const vane = (i: number) =>
    plate(vaneSpan, 0.025, vaneHeight, 0)
      .rotateX(vanePitch)
      .translate(0.05 + vaneSpan / 2, 0, 0)
      .rotateZ((i / vanes) * Math.PI * 2)
      .translate(0, 0, vaneZ);
  return merge(rod(ARBOR, 0, arbor), ...Array.from({ length: vanes }, (_, i) => vane(i)));
}

/** Screws holding the twin's bedplate down, near its corners and ends. */
export const SCREWS: Vec2[] = [
  [-2.0, 1.2],
  [2.0, 1.2],
  [-2.0, -1.2],
  [2.0, -1.2],
  [-2.0, 0],
  [2.0, 0.3],
];
const screwsGeom = () => merge(...SCREWS.map(([x, y]) => rod(0.08, 0, 0.05, 20).translate(x, y, 0)));

// ---------------------------------------------------------------------------------------------

const byX = (p: Vec3) => p[0];
const byZ = (p: Vec3) => p[2];

export const samplers = {
  plate: morph(lazy(plateGeom), lazy(bedplateGeom), angleKey),
  barrel: morph(lazy(barrelGeom), lazy(cylinderGeom), angleKey),
  centre: morph(lazy(centreGeom), lazy(twinWheel(0)), angleKey),
  third: morph(lazy(thirdGeom), lazy(twinWheel(1)), angleKey),
  fourth: morph(lazy(fourthGeom), lazy(twinWheel(2)), angleKey),
  bridges: morph(lazy(bridgesGeom), lazy(combGeom), byX),
  escape: morph(lazy(escapeGeom), lazy(twinWheel(3)), angleKey),
  pallet: morph(lazy(palletGeom), lazy(governorCockGeom), byX, byZ),
  balance: morph(lazy(balanceGeom), lazy(flyGeom), angleKey),
  hairspring: pairedTubes(
    spiral(HAIRSPRING.inner, HAIRSPRING.outer, HAIRSPRING.turns, HAIRSPRING.wire),
    helixCurve(WORM.radius, WORM.pitch, WORM.turns, WORM.wire),
  ),
  jewels: morph(lazy(jewelsGeom), lazy(screwsGeom), angleKey),
} satisfies Record<string, PartSampler>;
