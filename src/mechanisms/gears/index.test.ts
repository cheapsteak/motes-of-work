import { describe, expect, it } from 'vitest';
import { GEAR_TRAIN, gears } from './index';
import { applyToPoint, compose, fromAxisAngle, type PartTransform } from '../../math/transform';
import type { Vec2 } from '../../math/vec';
import { insidePolygon } from '../../shapes/testing';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import { AXLE, GEAR_THICKNESS, gearOutline } from './shapes';

const points = gears.samplePoints(20000, 11);
const ofPart = (part: number) => points.filter((p) => p.part === part);
const zs = (part: number) => ofPart(part).map((p) => p.local[2]);
const radial = ([x, y]: number[]) => Math.hypot(x, y);

describe('gears geometry', () => {
  it('keeps the part weights', () => {
    const counts = gears.parts.map((_, i) => ofPart(i).length);
    expect(counts).toEqual([5200, 4000, 1000, 8000, 1800]);
  });

  it.each([
    [0, 1.2, 18],
    [1, 0.6, 9],
  ])('gear %i is a solid of real thickness with an axle through it', (part, pitch, teeth) => {
    const z = zs(part);
    const half = GEAR_THICKNESS / 2;
    // Area-proportional: about half the points on the two faces, most of the rest on the walls
    // between them (tooth flanks, bore, holes), and a few on the axle stubs out to +-0.3.
    // Measured at this budget and seed: faces 0.558 / 0.464, walls 0.425 / 0.491.
    const faces = z.filter((v) => Math.abs(Math.abs(v) - half) < 1e-6).length / z.length;
    const walls = z.filter((v) => Math.abs(v) < half - 1e-6).length / z.length;
    expect(faces).toBeGreaterThan(0.4);
    expect(walls).toBeGreaterThan(0.3);
    expect(Math.min(...z)).toBeCloseTo(-AXLE.length / 2, 3);
    expect(Math.max(...z)).toBeCloseTo(AXLE.length / 2, 3);
    const outside = ofPart(part).filter((p) => Math.abs(p.local[2]) > half + 1e-6);
    expect(outside.length).toBeGreaterThan(0);
    for (const p of outside) {
      // On the axle: a 24-sided prism, so between its inscribed and circumscribed radii (or its end cap).
      expect(radial(p.local)).toBeLessThanOrEqual(AXLE.radius + 1e-6);
      if (Math.abs(p.local[2]) < AXLE.length / 2 - 1e-6) {
        expect(radial(p.local)).toBeGreaterThanOrEqual(AXLE.radius * Math.cos(Math.PI / 24) - 1e-6);
      }
    }
    // Tips reach the addendum circle, pitch + module.
    const module = (2 * pitch) / teeth;
    const rMax = Math.max(...ofPart(part).map((p) => radial(p.local)));
    expect(rMax).toBeLessThanOrEqual(pitch + module + 1e-6);
    expect(rMax).toBeGreaterThan(pitch + 0.9 * module);
  });

  it('the frame plate is 0.15 deep with its front face on the part origin, behind the gears', () => {
    const z = zs(3);
    expect(Math.min(...z)).toBeCloseTo(-0.15, 5);
    expect(Math.max(...z)).toBeCloseTo(0, 5);
    // Posed at z = -0.2: its front face sits behind the gears' back faces at -0.125.
    const pose = gears.pose(0, ZERO_FAULTS, 0);
    expect(pose[3].position[2]).toBeLessThan(pose[0].position[2] - GEAR_THICKNESS / 2);
  });

  it('the crank has depth and sits in front of the gear face; its twin fan is the same points turned about z', () => {
    const crank = ofPart(2);
    const z = crank.map((p) => p.local[2]);
    expect(Math.min(...z)).toBeGreaterThan(GEAR_THICKNESS / 2);
    expect(Math.max(...z) - Math.min(...z)).toBeCloseTo(0.12, 5);
    const blades = new Set<number>();
    for (const p of crank) {
      expect(p.localTwin[2]).toBe(p.local[2]);
      expect(radial(p.localTwin)).toBeCloseTo(radial(p.local), 9);
      const turn = Math.atan2(p.localTwin[1], p.localTwin[0]) - Math.atan2(p.local[1], p.local[0]);
      if (radial(p.local) > 0.2) blades.add(Math.round((((turn / (2 * Math.PI)) * 3) % 3 + 3) % 3));
    }
    expect([...blades].sort()).toEqual([0, 1, 2]);
  });

  it('the twin fan turns each normal by its blade angle; every other part keeps its normal', () => {
    for (const [i, p] of ofPart(2).entries()) {
      const ang = ((i % 3) * 2 * Math.PI) / 3;
      const [x, y, z] = p.normal;
      const want = [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang), z];
      for (let k = 0; k < 3; k++) expect(p.normalTwin[k]).toBeCloseTo(want[k], 12);
      // The normal turns with the point: the same rotation maps local onto localTwin.
      const pt = [p.local[0] * Math.cos(ang) - p.local[1] * Math.sin(ang), p.local[0] * Math.sin(ang) + p.local[1] * Math.cos(ang)];
      expect(pt[0]).toBeCloseTo(p.localTwin[0], 12);
      expect(pt[1]).toBeCloseTo(p.localTwin[1], 12);
    }
    for (const part of [0, 1, 3, 4]) for (const p of ofPart(part)) expect(p.normalTwin).toEqual(p.normal);
  });

  it('normals point out of the solid: gear faces along +-z, the plate front face toward the camera', () => {
    const half = GEAR_THICKNESS / 2;
    for (const p of ofPart(0)) {
      if (Math.abs(Math.abs(p.local[2]) - half) < 1e-6 && radial(p.local) > AXLE.radius + 0.01) {
        expect(p.normal[2]).toBeCloseTo(Math.sign(p.local[2]), 6);
      }
    }
    const front = ofPart(3).filter((p) => Math.abs(p.local[2]) < 1e-6);
    expect(front.length).toBeGreaterThan(100);
    for (const p of front) expect(p.normal[2]).toBeCloseTo(1, 6);
  });

  it('the bracket is a solid 0.12 deep', () => {
    const z = zs(4);
    expect(Math.max(...z) - Math.min(...z)).toBeCloseTo(0.12, 5);
  });
});

describe('gears meshing', () => {
  // The two outlines at their posed centres and angles (the real -2x kinematics), sampled on a grid
  // over the contact zone: the area covered by both is the tooth interference.
  const { drive: DRIVE, driven: DRIVEN } = GEAR_TRAIN;
  const tip = (g: { pitchRadius: number; teeth: number }) => g.pitchRadius + (2 * g.pitchRadius) / g.teeth;
  const place = (outline: Vec2[], xf: PartTransform): Vec2[] =>
    outline.map(([x, y]) => {
      const p = applyToPoint(xf, [x, y, 0]);
      return [p[0], p[1]];
    });
  const centre = (xf: PartTransform): Vec2 => [xf.position[0], xf.position[1]];

  const H = 0.004; // grid step; one cell is 1.6e-5
  function overlap(a: Vec2[], ca: Vec2, ra: number, b: Vec2[], cb: Vec2, rb: number): number {
    let cells = 0;
    for (let x = -0.2; x < 0.6; x += H) {
      for (let y = -0.6; y < 0.6; y += H) {
        if (Math.hypot(x - ca[0], y - ca[1]) > ra || Math.hypot(x - cb[0], y - cb[1]) > rb) continue;
        if (insidePolygon(a, [x, y]) && insidePolygon(b, [x, y])) cells++;
      }
    }
    return cells * H * H;
  }

  // One drive tooth period, 2pi/18, turns the driven gear 2pi/9 the other way: one of its teeth.
  const drives = Array.from({ length: 12 }, (_, i) => i / 12 / DRIVE.teeth);
  const drive = gearOutline(DRIVE.pitchRadius, DRIVE.teeth);
  const driven = gearOutline(DRIVEN.pitchRadius, DRIVEN.teeth);
  const halfPitch: PartTransform = { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], Math.PI / DRIVEN.teeth) };

  function sweep(shift: boolean): number[] {
    return drives.map((d) => {
      const [xa, xb] = gears.pose(d, ZERO_FAULTS, 0);
      const b = shift ? compose(xb, halfPitch) : xb;
      return overlap(place(drive, xa), centre(xa), tip(DRIVE), place(driven, b), centre(xb), tip(DRIVEN));
    });
  }

  it('the 18- and 9-tooth gears mesh without overlap through a tooth period', () => {
    // Measured: 0.9 s on CI, 1.5 s alone, 7.3 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is 4 times the loaded time.
    // Measured at a 0.0005 grid over 24 steps: at most 2.6e-5, a sliver where the drive tip meets
    // the pinion's radial flank (the 9-tooth pinion has no undercut). A tooth is 5.3e-2 (pinion).
    expect(Math.max(...sweep(false))).toBeLessThan(1e-4);
  }, 30_000);

  it('control: the driven gear shifted by half a pitch collides at every step', () => {
    // Measured: 0.9 s on CI, 1.5 s alone, 9.3 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is over 3 times the loaded time.
    // Measured: at least 4.65e-2.
    expect(Math.min(...sweep(true))).toBeGreaterThan(1e-2);
  }, 30_000);
});
