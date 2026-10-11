import { describe, expect, it } from 'vitest';
import { applyToPoint, rotate, type PartTransform } from '../../math/transform';
import type { Vec2, Vec3 } from '../../math/vec';
import { cycloidalGear } from '../../shapes/involute';
import { insidePolygon, radialExtrema } from '../../shapes/testing';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import { clubToothOutline } from './geometry';
import { WEIGHTS, watch } from './index';
import { BEATS_PER_DRIVE, ESCAPE_TEETH, escapement } from './kinematics';
import {
  COMB,
  CYLINDER,
  ESCAPE,
  ESCAPE_CENTRE,
  ESCAPE_PINION,
  FORK_PIN,
  FOURTH,
  FOURTH_CENTRE,
  HAIRSPRING,
  IMPULSE_PIN_RADIUS,
  WORM,
  Z,
  moduleOf,
} from './layout';
import { stoneCentres } from './shapes';

const PART = Object.fromEntries(watch.parts.map((p, i) => [p.id, i]));
const points = watch.samplePoints(20000, 11);
const ofPart = (id: string) => points.filter((p) => p.part === PART[id]);
const PITCH = (2 * Math.PI) / ESCAPE_TEETH;
const BEAT = 1 / BEATS_PER_DRIVE; // drive per beat

/** `p` (world) in the part frame of `xf`. */
function toLocal(xf: PartTransform, p: Vec3): Vec3 {
  const [x, y, z, w] = xf.quaternion;
  return rotate([-x, -y, -z, w], [p[0] - xf.position[0], p[1] - xf.position[1], p[2] - xf.position[2]]);
}

const angleAbout = (c: Vec2, p: Vec3): number => Math.atan2(p[1] - c[1], p[0] - c[0]);
const wrap = (a: number): number => Math.atan2(Math.sin(a), Math.cos(a));

describe('watch parts', () => {
  it('keeps the part weights, with the escapement core a meaningful share', () => {
    expect(WEIGHTS.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    const core = watch.parts.reduce((s, p, i) => s + (p.role === 'core' ? WEIGHTS[i] : 0), 0);
    // The core is bright because it is warm, not because it is dense (Task 9 visual review).
    expect(core).toBeCloseTo(0.22, 12);
    // The plate carries the most points (it gives the body mass); the fork is no longer a speck.
    expect(WEIGHTS[0]).toBeCloseTo(0.36, 12);
    expect(WEIGHTS[7]).toBeCloseTo(0.045, 12);
    expect(watch.parts.map((p) => p.role)).toEqual([
      'body',
      'body',
      'body',
      'body',
      'body',
      'body',
      'core',
      'core',
      'core',
      'core',
      'drift',
    ]);
  });

  it('cuts 15 club teeth whose locking faces lean forward, into the clockwise turn', () => {
    const outline = clubToothOutline(ESCAPE_TEETH, ESCAPE.lockRadius, ESCAPE.rootRadius);
    expect(radialExtrema(outline)).toBe(2 * ESCAPE_TEETH);
    // Tooth 0: its locking corner (on the locking circle, at angle 0) leads the foot of its face.
    const corner = outline.find(([x, y]) => Math.abs(Math.hypot(x, y) - ESCAPE.lockRadius) < 1e-9)!;
    expect(Math.atan2(corner[1], corner[0])).toBeCloseTo(0, 12);
    expect(Math.atan2(outline[0][1], outline[0][0])).toBeGreaterThan(0);
  });

  it('morphs the flat hairspring into the upright worm, point for point along the wire', () => {
    const spring = ofPart('hairspring');
    expect(spring.length).toBeGreaterThan(100);
    const halfLength = (WORM.pitch * WORM.turns) / 2;
    for (const p of spring) {
      expect(Math.abs(p.local[2])).toBeLessThanOrEqual(HAIRSPRING.wire + 1e-9);
      const r = Math.hypot(p.local[0], p.local[1]);
      expect(r).toBeGreaterThanOrEqual(HAIRSPRING.inner - HAIRSPRING.wire - 1e-9);
      expect(r).toBeLessThanOrEqual(HAIRSPRING.outer + HAIRSPRING.wire + 1e-9);
      expect(Math.hypot(p.localTwin[0], p.localTwin[1])).toBeGreaterThanOrEqual(WORM.radius - WORM.wire - 1e-9);
      expect(Math.hypot(p.localTwin[0], p.localTwin[1])).toBeLessThanOrEqual(WORM.radius + WORM.wire + 1e-9);
      expect(Math.abs(p.localTwin[2])).toBeLessThanOrEqual(halfLength + WORM.wire + 1e-9);
    }
    // Paired along the wire: the inner coil becomes the bottom of the worm, the outer the top.
    const inner = spring.filter((p) => Math.hypot(p.local[0], p.local[1]) < HAIRSPRING.inner + 0.03);
    const outer = spring.filter((p) => Math.hypot(p.local[0], p.local[1]) > HAIRSPRING.outer - 0.03);
    for (const p of inner) expect(p.localTwin[2]).toBeLessThan(-0.6 * halfLength);
    for (const p of outer) expect(p.localTwin[2]).toBeGreaterThan(0.6 * halfLength);
  });

  it('builds the pallet fork heavy enough to see: a lever 0.15 wide and 0.08 deep', () => {
    // Task 9 visual review: at the old 0.076 x 0.04 the fork was invisible at three-quarter.
    const lever = ofPart('pallet-fork').filter((p) => p.local[0] > 0.15 && p.local[0] < FORK_PIN - 0.15);
    expect(lever.length).toBeGreaterThan(20);
    const ys = lever.map((p) => Math.abs(p.local[1]));
    expect(Math.max(...ys)).toBeGreaterThan(0.07);
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.076 + 1e-9);
    const zs = lever.filter((p) => Math.abs(p.local[1]) > 0.03).map((p) => p.local[2]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(0.08, 6);
  });

  it('cuts the twin comb from one solid block: deep tines separated by narrow slots', () => {
    const { tines, left, pitch, tineWidth, tipY } = COMB;
    expect(tineWidth / pitch).toBeGreaterThanOrEqual(0.75);
    // Above the highest tine root, every point lies on a tine, and the tines run the block's depth.
    const tine = ofPart('bridges').filter((p) => p.localTwin[1] > -0.55 && p.localTwin[1] < tipY - 1e-6);
    expect(tine.length).toBeGreaterThan(100);
    for (const p of tine) {
      const i = Math.round((p.localTwin[0] - left) / pitch);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(tines);
      expect(Math.abs(p.localTwin[0] - (left + i * pitch))).toBeLessThanOrEqual(tineWidth / 2 + 1e-6);
    }
    const zs = tine.map((p) => p.localTwin[2]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(0.15);
  });

  it('lays the barrel down as the music box cylinder, along x', () => {
    const extent = (variant: number) => {
      const xf = watch.pose(0.3, ZERO_FAULTS, variant)[PART.barrel];
      const xs = ofPart('barrel').map((p) => applyToPoint(xf, variant ? p.localTwin : p.local)[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(extent(0)).toBeLessThan(2);
    expect(extent(1)).toBeGreaterThan(CYLINDER.length);
  });
});

describe('watch escapement in the ghost pose', () => {
  const stones = stoneCentres();
  const STONE_HALF_LENGTH = 0.045;

  /** For the stone `i` at drive `d`: its depth into the locking circle and the nearest corner behind it. */
  function stone(d: number, i: number) {
    const pose = watch.pose(d, ZERO_FAULTS, 0);
    const c = applyToPoint(pose[PART['pallet-fork']], [stones[i][0], stones[i][1], 0]);
    const r = Math.hypot(c[0] - ESCAPE_CENTRE[0], c[1] - ESCAPE_CENTRE[1]);
    const a = angleAbout(ESCAPE_CENTRE, c);
    const behind = Array.from({ length: ESCAPE_TEETH }, (_, k) => {
      const corner = applyToPoint(pose[PART['escape-wheel']], [
        ESCAPE.lockRadius * Math.cos(k * PITCH),
        ESCAPE.lockRadius * Math.sin(k * PITCH),
        0,
      ]);
      return wrap(angleAbout(ESCAPE_CENTRE, corner) - a);
    }).filter((da) => da > 0);
    return { innerEnd: r - STONE_HALF_LENGTH, cornerBehind: Math.min(...behind) };
  }

  it.each([
    ['after an even beat: the exit stone (-30 degrees) locks', 0.5 * BEAT, 0, 1],
    ['after an odd beat: the entry stone (+30 degrees) locks', 1.5 * BEAT, 1, 0],
    ['four beats later, the same again', 4.5 * BEAT, 0, 1],
  ])('%s', (_name, d, locked, free) => {
    const lock = stone(d, locked);
    const clear = stone(d, free);
    // The locking stone reaches well inside the tips; the other stands clear of them.
    expect(lock.innerEnd).toBeLessThan(ESCAPE.lockRadius - 0.02);
    expect(clear.innerEnd).toBeGreaterThan(ESCAPE.lockRadius + 0.005);
    // A tooth's locking corner rests just behind the locking stone's centre (within its half width
    // plus a hair), on the side it arrives from.
    expect(lock.cornerBehind).toBeLessThan((4 * Math.PI) / 180);
  });

  it('carries the impulse pin in the fork notch through the whole lift, then lets it go', () => {
    let inside = 0;
    for (let i = 0; i <= 400; i++) {
      const d = (i / 400) * 2 * BEAT;
      const pose = watch.pose(d, ZERO_FAULTS, 0);
      const pin = applyToPoint(pose[PART.balance], [-IMPULSE_PIN_RADIUS, 0, Z.layerB - Z.balance]);
      const local = toLocal(pose[PART['pallet-fork']], pin);
      const { balance } = escapement(d, ZERO_FAULTS);
      if (Math.abs(balance) <= (30 * Math.PI) / 180) {
        inside++;
        expect(Math.abs(local[1]), `drive ${d}`).toBeLessThan(0.03); // the notch's half width
        expect(local[0]).toBeGreaterThan(FORK_PIN - 0.03);
        expect(local[0]).toBeLessThan(FORK_PIN + 0.06);
      }
      // Beyond a quarter swing the pin is out past the horn tips (or wide of the horns): free of the fork.
      if (Math.abs(balance) > Math.PI / 2) {
        expect(local[0] > FORK_PIN + 0.06 + 0.022 || Math.abs(local[1]) > 0.065 + 0.022).toBe(true);
      }
    }
    expect(inside).toBeGreaterThan(5);
  });

  it('gears the fourth wheel off the escape pinion: 7/40 of a tooth pitch per balance period', () => {
    // The wheel only turns about z, so its quaternion is [0, 0, sin(a/2), cos(a/2)].
    const fourth = (d: number) => {
      const q = watch.pose(d, ZERO_FAULTS, 0)[PART['fourth-wheel']].quaternion;
      return 2 * Math.atan2(q[2], q[3]);
    };
    const turn = wrap(fourth(0.4 + 2 * BEAT) - fourth(0.4));
    expect(turn).toBeCloseTo((PITCH * ESCAPE_PINION) / FOURTH.teeth, 9);
  });
});

describe('watch going train meshing', () => {
  // The escape pinion and the fourth wheel at their posed centres and angles, sampled on a grid over
  // the contact zone: the area covered by both is tooth interference.
  const H = 0.0015;
  const wheel = cycloidalGear({ teeth: FOURTH.teeth, module: moduleOf(FOURTH) });
  const pinion = cycloidalGear({ teeth: ESCAPE_PINION, module: moduleOf(FOURTH) });
  const place = (outline: Vec2[], xf: PartTransform, turn = 0): Vec2[] =>
    outline.map(([x, y]) => {
      const c = Math.cos(turn);
      const s = Math.sin(turn);
      const p = applyToPoint(xf, [x * c - y * s, x * s + y * c, 0]);
      return [p[0], p[1]];
    });

  function overlap(d: number, shiftPinion: boolean): number {
    const pose = watch.pose(d, ZERO_FAULTS, 0);
    const pin = place(pinion, pose[PART['escape-wheel']], shiftPinion ? Math.PI / ESCAPE_PINION : 0);
    const whl = place(wheel, pose[PART['fourth-wheel']]);
    const tip = (o: Vec2[]) => o.reduce((m, [x, y]) => Math.max(m, Math.hypot(x, y)), 0);
    const pr = tip(pinion);
    const wr = tip(wheel);
    let cells = 0;
    for (let x = ESCAPE_CENTRE[0] - pr; x < ESCAPE_CENTRE[0] + pr; x += H) {
      for (let y = ESCAPE_CENTRE[1] - pr; y < ESCAPE_CENTRE[1] + pr; y += H) {
        // Only the sliver inside both tip circles can overlap.
        if (Math.hypot(x - ESCAPE_CENTRE[0], y - ESCAPE_CENTRE[1]) > pr) continue;
        if (Math.hypot(x - FOURTH_CENTRE[0], y - FOURTH_CENTRE[1]) > wr) continue;
        if (insidePolygon(pin, [x, y]) && insidePolygon(whl, [x, y])) cells++;
      }
    }
    return cells * H * H;
  }
  // Across a tick (the pinion turns half a tooth pitch of the escape wheel, ~1/7 of its own pitch)
  // and between ticks.
  const drives = Array.from({ length: 10 }, (_, i) => 0.3 + (i / 10) * 2 * BEAT);

  it('the escape pinion and fourth wheel mesh without overlap', () => {
    const worst = Math.max(...drives.map((d) => overlap(d, false)));
    expect(worst).toBeLessThan(2e-5);
  });

  it('control: the pinion turned half its pitch collides', () => {
    expect(Math.min(...drives.map((d) => overlap(d, true)))).toBeGreaterThan(2e-4);
  });
});
