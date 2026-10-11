import { describe, expect, it } from 'vitest';
import { applyToPoint, rotate, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import { ZERO_FAULTS, type Faults } from '../../timeline/sceneState';
import { blurb, label, OFFSET, partDensities, partIndex, steam } from './index';
import {
  crankAngle,
  ENGINE,
  GOVERNOR,
  governorAngle,
  governorOmega,
  LEVER,
  pistonDistance,
  sleeveY,
  STEM_X,
} from './kinematics';

const P = {
  flywheel: partIndex('flywheel'),
  crank: partIndex('crank'),
  conrod: partIndex('conrod'),
  crosshead: partIndex('crosshead'),
  spindle: partIndex('gov-spindle'),
  armA: partIndex('gov-arm-a'),
  armB: partIndex('gov-arm-b'),
  linkA: partIndex('gov-link-a'),
  linkB: partIndex('gov-link-b'),
  sleeve: partIndex('gov-sleeve'),
  lever: partIndex('gov-lever'),
  stem: partIndex('valve-stem'),
};

const DRIVES = Array.from({ length: 25 }, (_, i) => i / 24 + 0.013);
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const at = (xf: PartTransform[], part: number, p: Vec3): Vec3 => applyToPoint(xf[part], p);
/** Angle the part's local +x has turned to about world z. */
const spinZ = (t: PartTransform) => {
  const v = rotate(t.quaternion, [1, 0, 0]);
  return Math.atan2(v[1], v[0]);
};
/** Unwrapped spin over a drive sweep, so turns can be counted. */
function turned(part: number, faults: Faults, variant: number, to = 1, n = 400): number {
  let total = 0;
  let prev = spinZ(steam.pose(0, faults, variant)[part]);
  for (let i = 1; i <= n; i++) {
    const cur = spinZ(steam.pose((to * i) / n, faults, variant)[part]);
    let d = cur - prev;
    d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
    total += d;
    prev = cur;
  }
  return Math.abs(total);
}

describe('steam engine parts', () => {
  it('exports a label and a one-sentence blurb', () => {
    expect(label.length).toBeGreaterThan(0);
    expect(blurb).toMatch(/^[A-Z][^.]*\.$/);
  });

  it('makes the governor assembly the core and keeps it a meaningful share of the points', () => {
    const roles = Object.fromEntries(steam.parts.map((p) => [p.id, p.role]));
    for (const id of ['gov-spindle', 'gov-arm-a', 'gov-arm-b', 'gov-sleeve', 'gov-lever'])
      expect(roles[id]).toBe('core');
    for (const id of ['flywheel', 'cylinder', 'conrod', 'crosshead', 'bed']) expect(roles[id]).toBe('body');
    const pts = steam.samplePoints(20000, 3);
    const share = pts.filter((p) => steam.parts[p.part].role === 'core').length / pts.length;
    expect(share).toBeGreaterThan(0.24);
    expect(share).toBeLessThan(0.35);
  });

  it('keeps every part from being packed far denser than its role (no blown-out specks)', () => {
    // Points per unit area, relative to the body's: equal within a role by construction.
    const d = partDensities();
    const body = d.filter((x) => x.role === 'body').map((x) => x.density);
    for (const x of d) {
      expect(x.density / Math.min(...body)).toBeLessThan(x.role === 'core' ? 4 : 1.6);
    }
  });

  it('the flywheel is the big spoked wheel: rim radius 1, faced toward +z', () => {
    const fly = steam.samplePoints(20000, 5).filter((p) => p.part === P.flywheel);
    const radii = fly.map((p) => Math.hypot(p.local[0], p.local[1]));
    expect(Math.max(...radii)).toBeLessThanOrEqual(1 + 1e-6);
    expect(Math.max(...radii)).toBeGreaterThan(0.99);
    // Spokes: points between hub and rim, spread round six directions.
    const spokes = fly.filter((p, i) => radii[i] > 0.3 && radii[i] < 0.8);
    expect(spokes.length).toBeGreaterThan(0.08 * fly.length);
    const faces = fly.filter((p) => Math.abs(p.normal[2]) > 0.99).length;
    expect(faces / fly.length).toBeGreaterThan(0.3);
  });

  it('the wrong twin is built from the same shapes (a pose-only twin)', () => {
    for (const p of steam.samplePoints(3000, 2)) {
      expect(p.localTwin).toEqual(p.local);
      expect(p.normalTwin).toEqual(p.normal);
    }
  });
});

describe('slider-crank pose', () => {
  it('slides the crosshead along the line of stroke at x = r cos(theta) + sqrt(l^2 - r^2 sin^2(theta)) from the crank', () => {
    for (const d of DRIVES) {
      const theta = crankAngle(d, ZERO_FAULTS, 0);
      const xf = steam.pose(d, ZERO_FAULTS, 0);
      const { crank: r, conrod: l } = ENGINE;
      const want = r * Math.cos(theta) + Math.sqrt(l * l - r * r * Math.sin(theta) ** 2);
      expect(ENGINE.shaftX + OFFSET[0] - xf[P.crosshead].position[0]).toBeCloseTo(want, 9);
      expect(xf[P.crosshead].position[1]).toBeCloseTo(ENGINE.shaftY + OFFSET[1], 12);
    }
  });

  it.each([
    ['correct', ZERO_FAULTS, 0],
    ['twin', ZERO_FAULTS, 1],
    ['bind + stall + ratio', { ...ZERO_FAULTS, bind: 0.7, stall: 0.5, ratio: 0.6 }, 0],
  ] as const)('closes the linkage (%s): the con-rod spans crosshead pin to crank pin', (_name, faults, variant) => {
    for (const d of DRIVES) {
      const xf = steam.pose(d, faults, variant);
      const crossPin = at(xf, P.crosshead, [0, 0, 0]);
      const crankPin = at(xf, P.crank, [ENGINE.crank, 0, ENGINE.lineZ]);
      expect(dist(at(xf, P.conrod, [0, 0, 0]), crossPin)).toBeLessThan(1e-9);
      expect(dist(at(xf, P.conrod, [ENGINE.conrod, 0, 0]), crankPin)).toBeLessThan(1e-9);
      // The piston rides the line of stroke inside the cylinder.
      const piston = at(xf, P.crosshead, [-ENGINE.pistonRod, 0, 0]);
      expect(ENGINE.shaftX + OFFSET[0] - piston[0] - ENGINE.pistonRod).toBeCloseTo(
        pistonDistance(crankAngle(d, faults, variant)),
        9,
      );
    }
  });

  it('turns the flywheel with the crank, once per unit of drive', () => {
    expect(turned(P.flywheel, ZERO_FAULTS, 0)).toBeCloseTo(2 * Math.PI, 6);
    expect(turned(P.crank, ZERO_FAULTS, 0)).toBeCloseTo(2 * Math.PI, 6);
  });
});

describe('governor pose', () => {
  const axis = (y: number): Vec3 => [GOVERNOR.x + OFFSET[0], y + OFFSET[1], GOVERNOR.z + OFFSET[2]];
  const radial = (p: Vec3) => Math.hypot(p[0] - GOVERNOR.x - OFFSET[0], p[2] - GOVERNOR.z - OFFSET[2]);

  it.each([
    ['correct', ZERO_FAULTS, 0],
    ['twin', ZERO_FAULTS, 1],
    ['slip', { ...ZERO_FAULTS, slip: 1 }, 0],
    ['ratio', { ...ZERO_FAULTS, ratio: 1 }, 0],
  ] as const)(
    'hangs the balls at the equilibrium angle and joins the links to the sleeve (%s)',
    (_n, faults, variant) => {
      const theta = governorAngle(governorOmega(faults, variant));
      const { arm: L, pivotOffset: e, pivotY, linkAt: a, link: b } = GOVERNOR;
      for (const d of DRIVES) {
        const xf = steam.pose(d, faults, variant);
        for (const [arm, link] of [
          [P.armA, P.linkA],
          [P.armB, P.linkB],
        ]) {
          const ball = at(xf, arm, [0, -L, 0]);
          expect(radial(ball)).toBeCloseTo(e + L * Math.sin(theta), 9);
          expect(ball[1] - OFFSET[1]).toBeCloseTo(pivotY - L * Math.cos(theta), 9);
          // Link top on the arm, link foot on the sleeve collar under the pivot.
          expect(dist(at(xf, link, [0, 0, 0]), at(xf, arm, [0, -a, 0]))).toBeLessThan(1e-9);
          const foot = at(xf, link, [0, -b, 0]);
          expect(radial(foot)).toBeCloseTo(e, 9);
          expect(foot[1] - OFFSET[1]).toBeCloseTo(sleeveY(theta), 9);
        }
        expect(dist(xf[P.sleeve].position, axis(sleeveY(theta)))).toBeLessThan(1e-9);
        // The two balls are opposite each other across the spindle.
        const a0 = at(xf, P.armA, [0, -L, 0]);
        const b0 = at(xf, P.armB, [0, -L, 0]);
        const mid: Vec3 = [(a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2, (a0[2] + b0[2]) / 2];
        expect(dist(mid, axis(pivotY - L * Math.cos(theta)))).toBeLessThan(1e-9);
      }
    },
  );

  it('the correct lever rides the sleeve and works the valve stem; the twin lever is thrown the other way', () => {
    for (const d of DRIVES) {
      const xf = steam.pose(d, ZERO_FAULTS, 0);
      const sleeveEnd = at(xf, P.lever, [LEVER.toSleeve, 0, 0]);
      expect(sleeveEnd[1]).toBeCloseTo(xf[P.sleeve].position[1], 9);
      const stemEnd = at(xf, P.lever, [-LEVER.toStem, 0, 0]);
      expect(xf[P.stem].position[1]).toBeCloseTo(stemEnd[1], 9);
      expect(xf[P.stem].position[0]).toBeCloseTo(STEM_X + OFFSET[0], 12);
    }
    const twin = steam.pose(0.4, ZERO_FAULTS, 1);
    const correct = steam.pose(0.4, ZERO_FAULTS, 0);
    // Disconnected: the lever's sleeve end has left the sleeve; the throttle is wide open.
    expect(Math.abs(at(twin, P.lever, [LEVER.toSleeve, 0, 0])[1] - twin[P.sleeve].position[1])).toBeGreaterThan(0.2);
    expect(twin[P.stem].position[1]).toBeGreaterThan(correct[P.stem].position[1] + 0.15);
  });

  it('spins the governor with the engine through the belt, and lags it when the belt slips', () => {
    const spin = (faults: Faults) => {
      // Spindle turns about y: track its local +x in the xz plane.
      let total = 0;
      let prev = 0;
      for (let i = 1; i <= 400; i++) {
        const v = rotate(steam.pose(i / 400, faults, 0)[P.spindle].quaternion, [1, 0, 0]);
        const cur = Math.atan2(-v[2], v[0]);
        let dd = cur - prev;
        dd -= 2 * Math.PI * Math.round(dd / (2 * Math.PI));
        total += dd;
        prev = cur;
      }
      return Math.abs(total);
    };
    const ok = spin(ZERO_FAULTS);
    expect(ok).toBeGreaterThan(2 * Math.PI);
    expect(spin({ ...ZERO_FAULTS, slip: 1 })).toBeLessThan(0.75 * ok);
  });
});

describe('wrong twin and faults', () => {
  it('twin: the flywheel runs away (more than twice the turns of the ghost) with the balls flung out', () => {
    expect(turned(P.flywheel, ZERO_FAULTS, 1)).toBeGreaterThan(2 * turned(P.flywheel, ZERO_FAULTS, 0));
    const xf = steam.pose(0.3, ZERO_FAULTS, 1);
    const ball = at(xf, P.armA, [0, -GOVERNOR.arm, 0]);
    expect(ball[1] - OFFSET[1]).toBeCloseTo(GOVERNOR.pivotY - GOVERNOR.arm * Math.cos(GOVERNOR.maxAngle), 9);
  });

  it('ratio overspeeds the flywheel against the ghost', () => {
    expect(turned(P.flywheel, { ...ZERO_FAULTS, ratio: 1 }, 0)).toBeGreaterThan(
      1.5 * turned(P.flywheel, ZERO_FAULTS, 0),
    );
  });

  it('misalign wobbles the flywheel off its shaft; the crank stays true', () => {
    const f = { ...ZERO_FAULTS, misalign: 1 };
    const tilts = DRIVES.map((d) => {
      const xf = steam.pose(d, f, 0);
      const axisFly = rotate(xf[P.flywheel].quaternion, [0, 0, 1]);
      const axisCrank = rotate(xf[P.crank].quaternion, [0, 0, 1]);
      expect(axisCrank[2]).toBeCloseTo(1, 12);
      return axisFly;
    });
    expect(Math.min(...tilts.map((v) => v[2]))).toBeLessThan(Math.cos(0.15));
    // The tilt precesses: the axis points different ways round the turn.
    const xs = tilts.map((v) => v[0]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.2);
  });

  it('jitter shakes every part a little, never far', () => {
    const f = { ...ZERO_FAULTS, jitter: 1 };
    for (const d of DRIVES) {
      const a = steam.pose(d, ZERO_FAULTS, 0);
      const b = steam.pose(d, f, 0);
      for (let i = 0; i < a.length; i++) expect(dist(a[i].position, b[i].position)).toBeLessThan(0.08);
    }
    const moved = DRIVES.some(
      (d) => dist(steam.pose(d, ZERO_FAULTS, 0)[P.flywheel].position, steam.pose(d, f, 0)[P.flywheel].position) > 0.005,
    );
    expect(moved).toBe(true);
  });
});
