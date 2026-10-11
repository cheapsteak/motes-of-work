import { describe, expect, it } from 'vitest';
import { bounds, distanceToMesh, openEdges, radialExtrema } from '../../shapes/testing';
import type { Vec3 } from '../../math/vec';
import {
  BB,
  CHAINRING_TEETH,
  FRONT_AXLE,
  HEAD_TOP,
  MAST_MOUNT,
  MAST_SLEEVE,
  REAR_AXLE,
  SADDLE_TOP,
  SEAT_CLAMP,
  SEAT_DIR,
  SPROCKET_TEETH,
  STEER_AXIS,
  STEER_MOUNT,
  STUB,
  STUB_TOP,
  WHEEL,
} from './kinematics';
import {
  brakeFront,
  brakeRear,
  cableHousing,
  chainLink,
  chainringOutline,
  cranks,
  fork,
  frame,
  BASKET,
  basket,
  frontCableRun,
  frontWheel,
  ground,
  HEADLAMP,
  handlebars,
  looseBolts,
  mudguardFront,
  mudguardRear,
  pedal,
  rearWheel,
  MUDGUARD,
  RACK,
  rearCableRun,
  REFLECTOR,
  saddle,
  sprocketOutline,
  TAIL_REFLECTOR,
  topTubeEnds,
  tube,
} from './shapes';

const SOLIDS = {
  frame,
  fork,
  basket,
  frontWheel,
  rearWheel,
  cranks,
  chainLink,
  brakeFront,
  brakeRear,
  mudguardFront,
  mudguardRear,
  saddle,
  handlebars,
  frameTwin: () => frame('twin'),
  saddleTwin: () => saddle('twin'),
  handlebarsTwin: () => handlebars('twin'),
  pedalLeft: () => pedal(-1),
  pedalRight: () => pedal(1),
  looseBolts,
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

describe('tube', () => {
  it('runs a closed round bar of the given radius from a to b', () => {
    const a: Vec3 = [0.1, 0.2, -0.05];
    const b: Vec3 = [0.5, -0.1, 0.25];
    const g = tube(a, b, 0.02);
    expect(openEdges(g)).toBe(0);
    const p = g.getAttribute('position');
    const d = sub(b, a);
    const len = Math.hypot(...d);
    for (let i = 0; i < p.count; i++) {
      const v = sub([p.getX(i), p.getY(i), p.getZ(i)], a);
      const along = (v[0] * d[0] + v[1] * d[1] + v[2] * d[2]) / len;
      const off = Math.sqrt(Math.max(0, v[0] ** 2 + v[1] ** 2 + v[2] ** 2 - along ** 2));
      expect(along).toBeGreaterThanOrEqual(-1e-6);
      expect(along).toBeLessThanOrEqual(len + 1e-6);
      expect(off).toBeLessThanOrEqual(0.02 + 1e-6);
    }
  });
});

describe('bicycle part shapes', () => {
  it.each(Object.entries(SOLIDS))('%s is built from closed solids', (_name, build) => {
    expect(openEdges(build())).toBe(0);
  });

  it.each([
    ['front', frontWheel],
    ['rear', rearWheel],
  ])('the %s wheel is a 0.68 m tyre about its axle, in the xy plane', (_side, build) => {
    const { min, max } = bounds(build());
    expect(max[0] - min[0]).toBeCloseTo(2 * WHEEL.tyre, 3);
    expect(max[1] - min[1]).toBeCloseTo(2 * WHEEL.tyre, 3);
    expect(max[2] - min[2]).toBeLessThan(0.16);
  });

  it.each([
    ['front', frontWheel],
    ['rear', rearWheel],
  ])('the %s wheel carries one reflector on its spokes, so its turn reads in a still', (_side, build) => {
    // Out on the spokes and on the drive side, only the reflector: a single patch, not twelve.
    const p = build().getAttribute('position');
    const angles: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const r = Math.hypot(p.getX(i), p.getY(i));
      if (r > 0.12 && r < 0.28 && p.getZ(i) > REFLECTOR.z - 0.001) angles.push(Math.atan2(p.getY(i), p.getX(i)));
    }
    expect(angles.length).toBeGreaterThan(0);
    for (const a of angles) expect(Math.abs(a - REFLECTOR.angle)).toBeLessThan(0.2);
  });

  it('keeps the frame within the wheelbase and below the head tube top', () => {
    const { min, max } = bounds(frame());
    expect(min[0]).toBeGreaterThan(REAR_AXLE[0] - 0.05);
    expect(max[0]).toBeLessThan(FRONT_AXLE[0]);
    expect(max[1]).toBeLessThan(HEAD_TOP[1] + 0.05);
    expect(min[1]).toBeGreaterThan(BB[1] - 0.05);
  });

  it('cuts 44 teeth on the chainring and 16 on the sprocket', () => {
    expect(radialExtrema(chainringOutline())).toBe(2 * CHAINRING_TEETH);
    expect(radialExtrema(sprocketOutline())).toBe(2 * SPROCKET_TEETH);
  });

  it('makes the pedals 0.10 x 0.07 platforms with the spindle toward the crank', () => {
    for (const side of [-1, 1] as const) {
      const { min, max } = bounds(pedal(side));
      expect(max[0] - min[0]).toBeCloseTo(0.1, 6);
      // Platform 0.07 wide, centred on the origin; the spindle runs inboard (toward -side z).
      expect(side > 0 ? max[2] : -min[2]).toBeCloseTo(0.035, 6);
      expect(side > 0 ? -min[2] : max[2]).toBeGreaterThan(0.06);
    }
  });

  it('shapes the saddle as a thin, nose-down saddle with a narrow nose, not a slab', () => {
    const g = saddle();
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const tilt = (4 * Math.PI) / 180;
    // The seat's top faces up and a little forward: its nose dips 4 degrees.
    const up: Vec3 = [Math.sin(tilt), Math.cos(tilt), 0];
    const along = (i: number) => p.getX(i) * up[0] + p.getY(i) * up[1];
    const faces = (i: number, s: number) =>
      Math.abs(n.getX(i) - s * up[0]) + Math.abs(n.getY(i) - s * up[1]) + Math.abs(n.getZ(i)) < 1e-6;
    let top = -Infinity;
    let bottom = Infinity;
    let nose = 0;
    let widest = 0;
    for (let i = 0; i < p.count; i++) {
      if (faces(i, 1)) top = Math.max(top, along(i));
      if (faces(i, -1)) bottom = Math.min(bottom, along(i));
      if (p.getX(i) > p.getX(nose)) nose = i;
      widest = Math.max(widest, Math.abs(p.getZ(i)));
    }
    expect(top - bottom).toBeCloseTo(0.028, 6);
    // The top still passes through the saddle-top point the fit is measured to.
    const t = sub(SADDLE_TOP, SEAT_CLAMP);
    expect(top).toBeCloseTo(t[0] * up[0] + t[1] * up[1], 6);
    expect(p.getY(nose)).toBeLessThan(t[1]);
    // Broad at the back, a narrow nose in front.
    const { max } = bounds(g);
    let noseWidth = 0;
    for (let i = 0; i < p.count; i++) {
      if (p.getX(i) > max[0] - 0.04) noseWidth = Math.max(noseWidth, Math.abs(p.getZ(i)));
    }
    expect(noseWidth / widest).toBeLessThan(0.25);
  });

  it('lays the ground as a thin, upward-facing strip under both wheels', () => {
    const g = ground();
    const { min, max } = bounds(g);
    expect(max[1] - min[1]).toBeLessThan(1e-9);
    expect(min[0]).toBeLessThan(REAR_AXLE[0] - WHEEL.tyre);
    expect(max[0]).toBeGreaterThan(FRONT_AXLE[0] + WHEEL.tyre);
    const n = g.getAttribute('normal');
    for (let i = 0; i < n.count; i++) expect(n.getY(i)).toBeCloseTo(1, 9);
  });
});

describe('the wrong twin, built round the swap', () => {
  const DEG = 180 / Math.PI;
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const points = (g: ReturnType<typeof frame>): Vec3[] => {
    const p = g.getAttribute('position');
    return Array.from({ length: p.count }, (_, i): Vec3 => [p.getX(i), p.getY(i), p.getZ(i)]);
  };
  /** How far up a line (from `from`, along unit `dir`) the solids within `r` of it reach. */
  const reach = (pts: Vec3[], from: Vec3, dir: Vec3, r: number) =>
    Math.max(
      ...pts
        .map((p) => sub(p, from))
        .filter((d) => Math.hypot(...d) ** 2 - dot(d, dir) ** 2 <= r * r)
        .map((d) => dot(d, dir)),
    );

  it.each([
    ['frame', frame],
    ['saddle', saddle],
    ['handlebars', handlebars],
  ] as const)('builds the twin %s from the same solids, so its points map one to one', (_id, build) => {
    const a = build('correct');
    const b = build('twin');
    expect(b.getAttribute('position').count).toBe(a.getAttribute('position').count);
    expect(b.index === null).toBe(a.index === null);
  });

  it('cuts the twin seat tube to a stub a little above the top-tube junction, where the correct one runs on', () => {
    const seat = (build: 'correct' | 'twin') => reach(points(frame(build)), BB, SEAT_DIR, 0.021);
    expect(seat('correct')).toBeCloseTo(0.55, 3);
    expect(seat('twin')).toBeCloseTo(STUB, 3);
    const [junction] = topTubeEnds('twin');
    const above = STUB - dot(sub(junction, BB), SEAT_DIR);
    expect(above).toBeGreaterThan(0);
    expect(above).toBeLessThan(0.05);
  });

  it('runs the twin head tube on up as a mast, and climbs its top tube to meet it high', () => {
    const head = (build: 'correct' | 'twin') => reach(points(frame(build)), HEAD_TOP, STEER_AXIS, 0.02);
    expect(head('correct')).toBeLessThan(0.005);
    expect(head('twin')).toBeCloseTo(MAST_SLEEVE, 3);
    const rise = (build: 'correct' | 'twin') => {
      const [rear, front] = topTubeEnds(build);
      return Math.atan2(front[1] - rear[1], front[0] - rear[0]) * DEG;
    };
    // The correct top tube is nearly level; the twin climbs to the front, the main whole-frame cue.
    expect(rise('correct')).toBeLessThan(10);
    expect(rise('twin')).toBeGreaterThan(22);
  });

  it('fixes the twin saddle on a cradle on top of the steering column, which rises out of the mast', () => {
    // In the saddle part space; on the twin the part sits at MAST_MOUNT, on the steering axis.
    const pts = points(saddle('twin'));
    const sleeveTop = MAST_SLEEVE - (MAST_MOUNT[1] - HEAD_TOP[1]) / STEER_AXIS[1];
    const column = reach(pts, [0, 0, 0], STEER_AXIS, 0.017);
    expect(column).toBeGreaterThan(sleeveTop + 0.03);
    // No seat-post clamp: just under the shell, where the correct clamp crosses the bike, the twin's
    // cradle runs fore and aft, no wider than the column.
    const top = sub(SADDLE_TOP, SEAT_CLAMP);
    const postTop: Vec3 = [top[0] - 0.038 * SEAT_DIR[0], top[1] - 0.038 * SEAT_DIR[1], 0];
    const width = (q: Vec3[]) =>
      Math.max(
        ...q
          .filter((p) => Math.abs(p[0] - postTop[0]) < 0.015 && p[1] > postTop[1] - 0.013 && p[1] < postTop[1] - 0.002)
          .map((p) => Math.abs(p[2])),
      );
    expect(width(points(saddle('correct')))).toBeGreaterThan(0.025);
    expect(width(pts)).toBeLessThan(0.017);
  });

  it('clamps the twin handlebars low on the stub through a short stem', () => {
    const correct = bounds(handlebars('correct'));
    const twin = bounds(handlebars('twin'));
    // The bars ride lower on their mount than on the correct quill stem.
    expect(correct.max[1] - twin.max[1]).toBeGreaterThan(0.05);
    // The stub is lower than the correct seat clamp, and the bars on it lower than the twin saddle.
    expect(STUB_TOP[1] + twin.max[1]).toBeLessThan(SEAT_CLAMP[1] + 0.12);
  });

  it.each(['correct', 'twin'] as const)('runs each %s brake cable from its lever housing to its caliper', (build) => {
    const mount = build === 'twin' ? STUB_TOP : STEER_MOUNT;
    const runs = { front: frontCableRun(build), rear: rearCableRun(build) };
    // Each housing ends where its run on the frame begins.
    expect(Math.hypot(...sub(cableHousing(-1, build, mount).at(-1) as Vec3, runs.front[0]))).toBeLessThan(1e-9);
    expect(Math.hypot(...sub(cableHousing(1, build, mount).at(-1) as Vec3, runs.rear[0]))).toBeLessThan(1e-9);
    // ...and each run ends at its caliper.
    const front = brakeFront();
    const rear = brakeRear();
    expect(distanceToMesh(front, sub(runs.front.at(-1) as Vec3, HEAD_TOP))).toBeLessThan(0.015);
    expect(distanceToMesh(rear, sub(runs.rear.at(-1) as Vec3, REAR_AXLE))).toBeLessThan(0.015);
  });

  it('routes the twin front cable along the climbing top tube, and loops the rear one short', () => {
    const [rear, front] = topTubeEnds('twin');
    const run = frontCableRun('twin');
    expect(run[0][0]).toBeLessThan(rear[0] + 0.15);
    expect(run[1][0]).toBeGreaterThan(front[0] - 0.05);
    expect(run[1][1]).toBeGreaterThan(front[1] - 0.05);
    const length = (pts: Vec3[]) => pts.slice(1).reduce((sum, p, i) => sum + Math.hypot(...sub(p, pts[i])), 0);
    expect(length(rearCableRun('twin'))).toBeLessThan(0.2);
    expect(length(rearCableRun('correct'))).toBeGreaterThan(0.6);
  });

  it('marks the front with a basket and its headlamp on the fork, and the back with a rack and a reflector', () => {
    // The basket (bike coordinates): over the front wheel, ahead of the head tube, clear of the tyre
    // and the mudguard, and under the bars. It rides the fork (head-tube-top space), so it steers.
    const pts = (() => {
      const p = basket().getAttribute('position');
      return Array.from({ length: p.count }, (_, i): Vec3 => [p.getX(i) + HEAD_TOP[0], p.getY(i) + HEAD_TOP[1], p.getZ(i)]);
    })();
    const inBasket = pts.filter((p) => p[0] > BASKET.x0 - 0.01 && p[1] > BASKET.y0 - 0.01 && p[1] < BASKET.y1 + 0.02);
    expect(inBasket.length).toBeGreaterThan(100);
    expect(BASKET.x0).toBeGreaterThan(HEAD_TOP[0] + 0.05);
    expect(BASKET.y0).toBeGreaterThan(FRONT_AXLE[1] + MUDGUARD.outer + 0.04);
    expect(Math.abs((BASKET.x0 + BASKET.x1) / 2 - FRONT_AXLE[0])).toBeLessThan(0.05);
    // Open at the top: nothing of it inside the rim, above the floor, but the walls.
    const inside = inBasket.filter(
      (p) => p[0] > BASKET.x0 + 0.02 && p[0] < BASKET.x1 - 0.02 && Math.abs(p[2]) < BASKET.halfWidth - 0.02 && p[1] > BASKET.y0 + 0.02,
    );
    expect(inside).toEqual([]);
    // Its headlamp looks forward off its front.
    expect(distanceToMesh(basket(), sub(HEADLAMP.centre, HEAD_TOP))).toBeLessThan(HEADLAMP.radius + 1e-3);
    // And none of it is the fork's any more: the fork is the steerer, crown and blades.
    const forkPos = fork().getAttribute('position');
    for (let i = 0; i < forkPos.count; i++) {
      const [x, y] = [forkPos.getX(i) + HEAD_TOP[0], forkPos.getY(i) + HEAD_TOP[1]];
      if (x > BASKET.x0 && x < BASKET.x1) expect(y).toBeLessThan(BASKET.y0);
    }
    expect(HEADLAMP.centre[0] - HEADLAMP.depth / 2).toBeGreaterThan(BASKET.x1);
    // The rack (about the rear axle): a deck over the back wheel, clear of the mudguard.
    const rear = mudguardRear().getAttribute('position');
    const deck = Array.from({ length: rear.count }, (_, i) => rear.getY(i)).filter((y) => Math.abs(y - RACK.height) < 0.01);
    expect(deck.length).toBeGreaterThan(20);
    expect(RACK.height).toBeGreaterThan(MUDGUARD.outer + 0.03);
    expect(RACK.x0).toBeLessThan(-0.2);
    // Rear mudguard about the rear axle: the reflector is its rearmost part, behind the tyre.
    const { min } = bounds(mudguardRear());
    expect(min[0]).toBeLessThan(-WHEEL.tyre - 0.02);
    expect(Math.cos(TAIL_REFLECTOR.angle)).toBeLessThan(-0.99);
  });
});
