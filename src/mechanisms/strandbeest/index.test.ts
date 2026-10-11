import { describe, expect, it } from 'vitest';
import { applyToPoint, rotate, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import { Fails } from '../../testing/fails';
import { FAULT_KEYS, ZERO_FAULTS, type Faults } from '../../timeline/sceneState';
import { mechanismAnchors } from '../anchors';
import { groundFlatness, JANSEN, triangleShapes, TWIN, type LegJoints, type P2 } from './kinematics';
import { sampleElement, type Element } from './shapes';
import {
  AXLE_HEIGHT,
  CORE_SIDE,
  CORE_STATION,
  LINKS,
  PART_AREAS,
  SCALE,
  SIDES,
  solveMachine,
  STATION_PHASES,
  strandbeest,
  YAW,
} from './index';

const parts = strandbeest.parts;
const ids = parts.map((p) => p.id);
const indexOf = (id: string): number => {
  const i = ids.indexOf(id);
  if (i < 0) throw new Error(`no part ${id}`);
  return i;
};
const tag = (station: number, side: number): string => `${station}${side === 1 ? 'r' : 'l'}`;
const legOf = (legs: LegJoints[][], station: number, side: number): LegJoints => legs[station][side === 1 ? 0 : 1];
const faults = (f: Partial<Faults>): Faults => ({ ...ZERO_FAULTS, ...f });
const drives = (n: number): number[] => Array.from({ length: n }, (_, i) => i / n);

/** Undo the machine's display yaw: world → the machine's own frame (legs in xy planes, spine along z). */
const unyaw = (p: readonly number[]): Vec3 => {
  const [x, y, z, w] = YAW.quaternion;
  return rotate([-x, -y, -z, w], [p[0], p[1], p[2]]);
};

/** A joint (Jansen units about the crank axle) in machine-frame x, y for a solve's body lift. */
const world = (p: P2, lift: number): [number, number] => [p[0] * SCALE, (p[1] + AXLE_HEIGHT + lift) * SCALE];

describe('strandbeest parts', () => {
  it('has four crank throws driving eight legs, with roles core / body / drift as specified', () => {
    expect(STATION_PHASES).toHaveLength(4);
    const core = parts.filter((p) => p.role === 'core').map((p) => p.id);
    const coreTag = tag(CORE_STATION, CORE_SIDE);
    expect(core.sort()).toEqual([`crank-${CORE_STATION}`, ...LINKS.map((l) => `${l.id}-${coreTag}`)].sort());
    const drift = parts.filter((p) => p.role === 'drift').map((p) => p.id);
    expect(drift).toHaveLength(8);
    expect(drift.every((id) => id.startsWith('foot-'))).toBe(true);
    // Everything else is body: seven more legs, three cranks, the crankshaft and the frame.
    expect(parts.filter((p) => p.role === 'body')).toHaveLength(7 * LINKS.length + 3 + 2);
  });

  it('gives the core about 12% of the points, about as dense as the body, and no part a blinding density', () => {
    const pts = strandbeest.samplePoints(50000, 3);
    const share = (role: string) => pts.filter((p) => parts[p.part].role === role).length / pts.length;
    expect(share('core')).toBeCloseTo(0.12, 2);
    expect(share('drift')).toBeCloseTo(0.025, 2);
    // Points per unit area: the one specified leg is warm, not dense (Task 9 visual review: at 2.6x
    // it clipped to white); it stays within a factor of the seven built from it, and no small part
    // (a foot) outshines the denser of the two roles.
    const density = parts.map((_, i) => pts.filter((p) => p.part === i).length / PART_AREAS[i]);
    const mean = (role: string) => {
      const ds = density.filter((_, i) => parts[i].role === role);
      return ds.reduce((a, b) => a + b, 0) / ds.length;
    };
    expect(mean('core') / mean('body')).toBeGreaterThan(0.5);
    expect(mean('core') / mean('body')).toBeLessThan(1.5);
    expect(Math.max(...density)).toBeLessThan(1.2 * Math.max(mean('core'), mean('body')));
  });

  it('fits the ~2.5-unit envelope, roughly centred, and spans the walking width', () => {
    const { whole, core } = mechanismAnchors(strandbeest);
    expect(whole.radius).toBeLessThan(2.6);
    expect(whole.radius).toBeGreaterThan(2);
    expect(Math.hypot(...whole.center)).toBeLessThan(0.4);
    // The reference leg is the front one on the +x side: nearest a three-quarter camera.
    const c = unyaw(core.center);
    expect(c[0]).toBeGreaterThan(0.5);
    expect(c[2]).toBeGreaterThan(0.5);
    expect(core.center[2]).toBeGreaterThan(whole.center[2] + 0.5);
  });
});

describe('strandbeest pose', () => {
  /** Posed position of a part-local point, in the machine's own (unyawed) frame. */
  const posed = (xf: PartTransform[], part: number, p: Vec3): Vec3 => unyaw(applyToPoint(xf[part], p));
  const shapes = [triangleShapes(JANSEN), triangleShapes(TWIN)];

  it.each([0, 0.5, 1])('every bar and triangle of every leg lands on its solved joints (variant %f)', (variant) => {
    // The parts' samples morph linearly from correct to twin; the pose must solve the linkage with
    // the lengths the morphed parts actually have, so every bar end meets its joint mid-morph too.
    const lerp = (a: number, b: number) => a + (b - a) * variant;
    for (const d of [0.05, 0.37, 0.81]) {
      const xf = strandbeest.pose(d, ZERO_FAULTS, variant);
      const m = solveMachine(d, ZERO_FAULTS, variant);
      STATION_PHASES.forEach((_, s) => {
        for (const side of SIDES) {
          const leg = legOf(m.legs, s, side);
          for (const spec of LINKS) {
            const part = indexOf(`${spec.id}-${tag(s, side)}`);
            const near = (p: Vec3, joint: P2) => {
              const [x, y] = world(joint, m.lift);
              expect(p[0]).toBeCloseTo(x, 9);
              expect(p[1]).toBeCloseTo(y, 9);
            };
            near(posed(xf, part, [0, 0, 0]), leg[spec.from]);
            near(posed(xf, part, [lerp(JANSEN[spec.length], TWIN[spec.length]) * SCALE, 0, 0]), leg[spec.to]);
            if (spec.corner) {
              const flip = side === 1 ? -1 : 1;
              const [c0, c1] = shapes.map((sh) => sh[spec.corner as 'outer' | 'foot']);
              const corner: Vec3 = [lerp(c0[0], c1[0]) * SCALE, flip * lerp(c0[1], c1[1]) * SCALE, 0];
              near(posed(xf, part, corner), spec.corner === 'outer' ? leg.outer : leg.foot);
            }
          }
          const [fx, fy] = world(leg.foot, m.lift);
          const foot = unyaw(xf[indexOf(`foot-${tag(s, side)}`)].position);
          expect(foot[0]).toBeCloseTo(fx, 9);
          expect(foot[1]).toBeCloseTo(fy, 9);
        }
        // The crank arm's pin is the throw's pin, shared by both legs.
        const crank = posed(xf, indexOf(`crank-${s}`), [lerp(JANSEN.m, TWIN.m) * SCALE, 0, 0]);
        for (const side of SIDES) {
          const pin = world(legOf(m.legs, s, side).C, m.lift);
          expect(crank[0]).toBeCloseTo(pin[0], 9);
          expect(crank[1]).toBeCloseTo(pin[1], 9);
        }
      });
    }
  });

  it('keeps two to four feet on the ground at every moment of the correct gait', () => {
    for (const d of drives(360)) {
      const m = solveMachine(d, ZERO_FAULTS, 0);
      const ys = m.legs.flat().map((leg) => leg.foot[1] + m.lift);
      const ground = Math.min(...ys);
      const down = ys.filter((y) => y < ground + 1).length;
      expect(down).toBeGreaterThanOrEqual(2);
      expect(down).toBeLessThanOrEqual(4);
    }
  });

  it('rides level on Jansen lengths and bobs on the twin', () => {
    const bob = (variant: number) => {
      const lifts = drives(360).map((d) => solveMachine(d, ZERO_FAULTS, variant).lift);
      return Math.max(...lifts) - Math.min(...lifts);
    };
    // Measured: 0.08 Jansen units (0.0016 world) against 5.7 (0.11 world).
    expect(bob(0)).toBeLessThan(0.2);
    expect(bob(1)).toBeGreaterThan(4);
  });

  it("the reference foot's world path is flat along the ground for Jansen, not for the twin", () => {
    const path = (variant: number): P2[] =>
      drives(720).map((d) => {
        const m = solveMachine(d, ZERO_FAULTS, variant);
        const foot = legOf(m.legs, CORE_STATION, CORE_SIDE).foot;
        return [foot[0], foot[1] + m.lift];
      });
    const correct = groundFlatness(path(0));
    const twin = groundFlatness(path(1));
    expect(correct).toBeLessThan(0.01);
    expect(twin).toBeGreaterThan(10 * correct);
  });

  it('solves every joint without a clamp over the whole ratio dial, at every variant', () => {
    // Measured: under 0.3 s on CI, 0.3 s alone, 2.0 s locally at load 12-22 beside the full suite; the
    // default 5 s would be only 2.5 times that. 30 s is 15 times.
    // Each part's transform tested plainly and the failures held to none once (Fails): an expect per
    // part per pose was six tenths of this test (4.0 s on CI, past 5 s under load).
    const fails = new Fails();
    let clamped = 0;
    for (const variant of [0, 0.25, 0.5, 0.75, 1]) {
      for (const d of drives(720)) {
        const f = faults({ ratio: 1, slip: 1, misalign: 1, bind: 1, stall: 1, jitter: 1 });
        clamped += solveMachine(d, f, variant)
          .legs.flat()
          .reduce((n, leg) => n + leg.clamped, 0);
        strandbeest.pose(d, f, variant).forEach((t, i) => {
          if (!t.position.every(Number.isFinite)) fails.add(`variant ${variant}, drive ${d}, part ${i}: position ${t.position}`);
          if (!t.quaternion.every(Number.isFinite)) fails.add(`variant ${variant}, drive ${d}, part ${i}: quaternion ${t.quaternion}`);
        });
      }
    }
    expect(fails.count, String(fails)).toBe(0);
    expect(clamped).toBe(0);
  }, 30_000);

  it('never produces NaN beyond the dial, where the out-of-range lower rocker clamps', () => {
    // Ratio 4 pushes the throw from 15 to 18.6: the pin comes close enough to the frame pivot that
    // the lower rocker cannot close for part of the turn.
    let clamped = 0;
    for (const variant of [0, 0.5, 1]) {
      for (const d of drives(240)) {
        const f = faults({ ratio: 4 });
        clamped += solveMachine(d, f, variant)
          .legs.flat()
          .reduce((n, leg) => n + leg.clamped, 0);
        for (const t of strandbeest.pose(d, f, variant)) {
          expect(t.position.every(Number.isFinite)).toBe(true);
          expect(t.quaternion.every(Number.isFinite)).toBe(true);
        }
      }
    }
    expect(clamped).toBeGreaterThan(0);
  });

  it.each([0, 0.25, 0.5, 0.75, 1])('every foot walks a continuous path at ratio %s, at every variant', (ratio) => {
    // A jump keeps its size as sampling gets finer; a continuous path's largest step halves. Near a
    // rocker's dead point the solve is steep, so this is what catches a crank long enough to run a
    // rocker past it (the feet then teleported by tens of Jansen units in one step).
    const largestStep = (variant: number, n: number): number => {
      let worst = 0;
      let prev: P2[] | null = null;
      for (let i = 0; i <= n; i++) {
        const m = solveMachine(i / n, faults({ ratio }), variant);
        const feet = m.legs.flat().map((leg): P2 => [leg.foot[0], leg.foot[1] + m.lift]);
        if (prev) {
          const last = prev;
          feet.forEach((p, k) => (worst = Math.max(worst, Math.hypot(p[0] - last[k][0], p[1] - last[k][1]))));
        }
        prev = feet;
      }
      return worst;
    };
    for (const variant of [0, 0.5, 1]) {
      const coarse = largestStep(variant, 2000);
      const fine = largestStep(variant, 4000);
      expect(fine / coarse, `variant ${variant}`).toBeLessThan(0.6);
      // Jansen units: a foot travels a few hundred a turn, so one step of 2000 stays well under one.
      expect(coarse, `variant ${variant}`).toBeLessThan(1);
    }
  });

  it('ratio over-strides the reference foot against the ghost', () => {
    const stride = (ratio: number) => {
      const xs = drives(360).map((d) => legOf(solveMachine(d, faults({ ratio }), 0).legs, 0, CORE_SIDE).foot[0]);
      return Math.max(...xs) - Math.min(...xs);
    };
    // Measured: 1.059 at full fault (RATIO_GAIN is held low to keep the foot path continuous).
    expect(stride(1)).toBeGreaterThan(1.04 * stride(0));
    expect(stride(0.5)).toBeGreaterThan(stride(0));
  });

  it('slip shifts the rear throws against the front one; the reference throw keeps its phase', () => {
    for (const d of [0.13, 0.37, 0.71]) {
      const a = solveMachine(d, ZERO_FAULTS, 0).stations;
      const b = solveMachine(d, faults({ slip: 1 }), 0).stations;
      expect(b[0]).toBeCloseTo(a[0], 12);
      expect(Math.abs(b[3] - a[3])).toBeGreaterThan(0.1);
    }
  });

  it('misalign splays legs out of their planes (feet leave the throw plane), leaving the crankshaft be', () => {
    const d = 0.3;
    const base = strandbeest.pose(d, ZERO_FAULTS, 0);
    const bent = strandbeest.pose(d, faults({ misalign: 1 }), 0);
    for (let s = 0; s < STATION_PHASES.length; s++) {
      for (const side of SIDES) {
        const i = indexOf(`foot-${tag(s, side)}`);
        expect(Math.abs(unyaw(bent[i].position)[2] - unyaw(base[i].position)[2])).toBeGreaterThan(0.15);
      }
    }
    expect(bent[indexOf('crankshaft')]).toEqual(base[indexOf('crankshaft')]);
  });

  it('stall halts the gait for part of each half turn', () => {
    const thetas = drives(200).map((d) => solveMachine(d, faults({ stall: 1 }), 0).theta);
    const still = thetas.slice(1).filter((t, i) => Math.abs(t - thetas[i]) < 1e-9).length;
    expect(still).toBeGreaterThan(40);
  });

  it.each(FAULT_KEYS.filter((k) => k !== 'drift'))('fault %s at 1 keeps every transform finite', (k) => {
    for (const d of drives(50)) {
      for (const t of strandbeest.pose(d, faults({ [k]: 1 }), 1)) {
        expect([...t.position, ...t.quaternion].every(Number.isFinite)).toBe(true);
      }
    }
  });
});

describe('strandbeest shapes', () => {
  const tube: Element = {
    kind: 'tube',
    from: [0.1, 0.2, 0.05],
    to: [0.9, 0.5, 0.05],
    fromTwin: [0.1, 0.2, 0.05],
    toTwin: [0.3, 1.3, 0.05],
    radius: 0.03,
  };
  const rng = (() => {
    let a = 7;
    return () => (a = (Math.imul(a, 1103515245) + 12345) >>> 0) / 4294967296;
  })();

  it('a tube samples its round side for both variants, normals radial and turned with the tube', () => {
    /** Signed position along a segment and the radial offset from its axis. */
    const decompose = (p: Vec3, a: Vec3, b: Vec3) => {
      const ab: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const len = Math.hypot(...ab);
      const u: Vec3 = [ab[0] / len, ab[1] / len, ab[2] / len];
      const ap: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
      const t = ap[0] * u[0] + ap[1] * u[1] + ap[2] * u[2];
      const radial: Vec3 = [ap[0] - t * u[0], ap[1] - t * u[1], ap[2] - t * u[2]];
      return { t: t / len, radial, u };
    };
    for (const s of sampleElement(tube, 400, rng)) {
      for (const [p, n, a, b] of [
        [s.local, s.normal, tube.from, tube.to],
        [s.localTwin, s.normalTwin, tube.fromTwin, tube.toTwin],
      ] as [Vec3, Vec3, Vec3, Vec3][]) {
        const { t, radial, u } = decompose(p, a, b);
        expect(t).toBeGreaterThanOrEqual(-1e-9);
        expect(t).toBeLessThanOrEqual(1 + 1e-9);
        const r = Math.hypot(...radial);
        // A 12-sided prism: between its inscribed and circumscribed radii.
        expect(r).toBeLessThanOrEqual(0.03 + 1e-9);
        expect(r).toBeGreaterThan(0.03 * Math.cos(Math.PI / 12) - 1e-9);
        // The normal has no component along the tube and points outward from its axis.
        expect(Math.abs(n[0] * u[0] + n[1] * u[1] + n[2] * u[2])).toBeLessThan(1e-9);
        expect(n[0] * radial[0] + n[1] * radial[1] + n[2] * radial[2]).toBeGreaterThan(0.9 * r);
      }
    }
  });

  it('a pivot and a ball move with their twin position, unchanged in shape', () => {
    const pivot: Element = { kind: 'pivot', at: [1, 0, 0], atTwin: [2, 1, 0], radius: 0.05, depth: 0.04 };
    for (const s of sampleElement(pivot, 100, rng)) {
      expect(s.localTwin[0] - s.local[0]).toBeCloseTo(1, 12);
      expect(s.localTwin[1] - s.local[1]).toBeCloseTo(1, 12);
      expect(s.normalTwin).toEqual(s.normal);
    }
  });
});
