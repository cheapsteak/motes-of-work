import { describe, expect, it } from 'vitest';
import { applyToPoint, fromAxisAngle, rotate, transformDistance, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import { defaultSceneState, FAULT_KEYS, ZERO_FAULTS, type Faults } from '../../timeline/sceneState';
import { mechanismAnchors } from '../anchors';
import { basketArrival, bike, blurb, CENTRE, CHAIN_SEGMENTS, GEARING, label, partDensities, partIndex, SCALE } from './index';
import {
  crankAngle,
  HEAD_TOP,
  MAST_MOUNT,
  SADDLE_TOP,
  SEAT_CLAMP,
  SEGMENT_PITCH,
  SLIP_JERK,
  steer,
  STEER_AXIS,
  STEER_MOUNT,
  STUB_TOP,
  wheelAngle,
} from './kinematics';
import { buildMoteAttrs, settleWindow } from '../../scene/mote/attributes';
import { FLARE_GAIN, mote, SETTLE_WINDOW, SETTLED_BRIGHTNESS } from '../../scene/mote/mote';
import { partAssembly, partTransforms } from '../../scene/mote/partTransforms';
import { cableHousing, FRAME_LAY, frontCableRun, GRIPS, layPosition, rearCableRun, REFLECTOR, topTubeEnds } from './shapes';

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const times = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const dist = (a: Vec3, b: Vec3) => Math.hypot(...sub(a, b));
/** A point in bike coordinates (metres) to world units. */
const world = (p: Vec3): Vec3 => times(sub(p, CENTRE), SCALE);
const Z: Vec3 = [0, 0, 1];
const CHAIN_IDS = Array.from({ length: CHAIN_SEGMENTS }, (_, k) => `chain-${String(k).padStart(2, '0')}`);
const P = (id: string) => partIndex(id);
const DRIVES = [0, 0.13, 0.3, 0.77, 1, 1.5, 2];

/** Saddle top and the two grip centres, in world units, for a pose. */
function contacts(xf: PartTransform[]) {
  const saddle = applyToPoint(xf[P('saddle')], times(sub(SADDLE_TOP, SEAT_CLAMP), SCALE));
  const grips = GRIPS.map((g) => applyToPoint(xf[P('handlebars')], times(g, SCALE)));
  return { saddle, grips };
}

describe('bicycle parts', () => {
  it('exports a sentence-case label and a one-sentence blurb that names the wrong twin', () => {
    expect(label).toBe('Bicycle');
    expect(blurb).toMatch(/^[A-Z][^.]*\.$/);
    expect(blurb).toMatch(/\bwrong twin\b/);
    expect(bike.id).toBe('bike');
    expect(GEARING).toEqual({ chainring: 44, sprocket: 16 });
    expect(CHAIN_SEGMENTS).toBe(24);
  });

  it('has the rider contact points as its core, and settles the body in stages after them', () => {
    const want: Record<string, [string, readonly [number, number] | undefined]> = {
      saddle: ['core', undefined],
      handlebars: ['core', undefined],
      'pedal-left': ['core', undefined],
      'pedal-right': ['core', undefined],
      'front-wheel': ['body', [0.42, 0.48]],
      'rear-wheel': ['body', [0.42, 0.48]],
      cranks: ['body', [0.42, 0.48]],
      ...Object.fromEntries(CHAIN_IDS.map((id) => [id, ['body', [0.42, 0.48]]])),
      fork: ['body', [0.57, 0.6]],
      basket: ['body', [0.69, 0.72]],
      frame: ['body', [0.81, 0.95]],
      'brake-front': ['body', [0.94, 0.97]],
      'brake-rear': ['body', [0.94, 0.97]],
      'mudguard-front': ['body', [0.95, 0.97]],
      'mudguard-rear': ['body', [0.95, 0.97]],
      ground: ['body', [0.94, 0.97]],
      'loose-bolts': ['drift', [0.57, 0.59]],
    };
    expect(new Set(bike.parts.map((p) => p.id))).toEqual(new Set(Object.keys(want)));
    expect(bike.parts).toHaveLength(Object.keys(want).length);
    for (const p of bike.parts) {
      expect([p.role, p.settle], p.id).toEqual(want[p.id]);
    }
  });

  it('builds in stages that never overlap, so no part sets out before the line before it has lit', () => {
    // docs/specs/2026-10-05-act-1-build-and-orbit.md §2.2: each stage's span runs from its first
    // mote setting out (from - SETTLE_WINDOW) to its last landing (to). Core, drive, fork, basket and
    // frame are end to end; the fittings set out while the frame is being laid and land last, once it
    // is done, the mudguards strictly after it (they have a line of their own). The loose bolts land
    // with the fork.
    const span = (ids: string[]) => {
      const ws = bike.parts.filter((p) => ids.some((id) => p.id === id || (id.endsWith('*') && p.id.startsWith(id.slice(0, -1))))).map(settleWindow);
      expect(ws.length).toBe(ids.length + (ids.includes('chain-*') ? CHAIN_SEGMENTS - 1 : 0));
      return [Math.min(...ws.map((w) => w[0])) - SETTLE_WINDOW, Math.max(...ws.map((w) => w[1]))];
    };
    const core = span(['saddle', 'handlebars', 'pedal-left', 'pedal-right']);
    const drive = span(['front-wheel', 'rear-wheel', 'cranks', 'chain-*']);
    const fork = span(['fork']);
    const basket = span(['basket']);
    const frame = span(['frame']);
    const fittings = span(['brake-front', 'brake-rear', 'mudguard-front', 'mudguard-rear', 'ground']);
    const mudguards = span(['mudguard-front', 'mudguard-rear']);
    const bolts = span(['loose-bolts']);
    const stages = [core, drive, fork, basket, frame];
    for (let k = 1; k < stages.length; k++) expect(stages[k][0], `stage ${k + 1} sets out after stage ${k} has landed`).toBeGreaterThan(stages[k - 1][1]);
    expect(core[0]).toBeCloseTo(0, 12);
    expect(fittings[0]).toBeGreaterThan(frame[0]);
    expect(fittings[1]).toBeGreaterThan(frame[1]);
    expect(mudguards[0] + SETTLE_WINDOW, 'the mudguards land after the frame is done').toBeGreaterThanOrEqual(frame[1]);
    expect(bolts[0]).toBeGreaterThanOrEqual(fork[0]);
    expect(bolts[1]).toBeLessThanOrEqual(fork[1]);
  });

  it('is sized to the stage: a bounding radius of about 2.4', () => {
    const { whole } = mechanismAnchors(bike);
    expect(whole.radius).toBeGreaterThan(2.3);
    expect(whole.radius).toBeLessThan(2.55);
    expect(Math.hypot(...whole.center)).toBeLessThan(0.3);
  });

  it('reshapes only the frame, the saddle and the handlebars on the twin; every other part keeps its shape', () => {
    const reshaped = new Set(['frame', 'saddle', 'handlebars']);
    const moved = new Set<string>();
    for (const p of bike.samplePoints(3000, 2)) {
      const id = bike.parts[p.part].id;
      expect(Math.hypot(...p.normalTwin), id).toBeCloseTo(1, 6);
      if (dist(p.local, p.localTwin) > 1e-6) moved.add(id);
      if (!reshaped.has(id)) {
        expect(p.localTwin, id).toEqual(p.local);
        expect(p.normalTwin, id).toEqual(p.normal);
      }
    }
    expect(moved).toEqual(reshaped);
  });
});

describe('reach: a bike a person can ride', () => {
  const xf = bike.pose(0, ZERO_FAULTS, 0);
  const { saddle, grips } = contacts(xf);

  it('puts the saddle 0.80-0.95 m from the pedal at the bottom of its stroke', () => {
    for (const id of ['pedal-left', 'pedal-right']) {
      let reach = 0;
      for (let i = 0; i < 360; i++) {
        const pedal = bike.pose(i / 360, ZERO_FAULTS, 0)[P(id)].position;
        reach = Math.max(reach, dist(saddle, pedal) / SCALE);
      }
      expect(reach, id).toBeGreaterThan(0.8);
      expect(reach, id).toBeLessThan(0.95);
    }
  });

  it('puts each grip 0.45-0.75 m from the saddle top, forward of it', () => {
    for (const g of grips) {
      expect(dist(saddle, g) / SCALE).toBeGreaterThan(0.45);
      expect(dist(saddle, g) / SCALE).toBeLessThan(0.75);
      expect(g[0]).toBeGreaterThan(saddle[0]);
    }
    // Grips about 1.05 m above the ground, either side of the bike.
    for (const g of grips) expect(g[1] / SCALE + CENTRE[1]).toBeCloseTo(1.05, 1);
    expect(grips[0][2]).toBeGreaterThan(0.2 * SCALE);
    expect(grips[1][2]).toBeLessThan(-0.2 * SCALE);
  });
});

describe('placement', () => {
  it('keeps only the frame, ground and loose bolts at the bike origin; every other part moves', () => {
    const origin = world([0, 0, 0]);
    const still = ['frame', 'ground', 'loose-bolts'];
    const poses = [
      ...DRIVES.map((d) => bike.pose(d, ZERO_FAULTS, 0)),
      bike.pose(0.3, ZERO_FAULTS, 1),
      bike.pose(0.3, { ...ZERO_FAULTS, jitter: 1 }, 0),
    ];
    bike.parts.forEach((p, i) => {
      const moved = poses.some((xf) => transformDistance(xf[i], poses[0][i]) > 1e-6);
      if (still.includes(p.id)) {
        for (const xf of poses)
          expect(transformDistance(xf[i], { position: origin, quaternion: [0, 0, 0, 1] })).toBe(0);
      } else {
        expect(moved, p.id).toBe(true);
      }
    });
  });
});

describe('the drive', () => {
  it('turns the wheels 2.75 times as far as the cranks', () => {
    for (const d of DRIVES) {
      const xf = bike.pose(d, ZERO_FAULTS, 0);
      const theta = crankAngle(d, ZERO_FAULTS);
      const spin = (t: PartTransform) => {
        const v = rotate(t.quaternion, [1, 0, 0]);
        return Math.atan2(v[1], v[0]);
      };
      const wrap = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
      expect(wrap(spin(xf[P('cranks')]) + theta)).toBeCloseTo(0, 9);
      expect(wrap(spin(xf[P('rear-wheel')]) + 2.75 * theta)).toBeCloseTo(0, 9);
      expect(wrap(spin(xf[P('rear-wheel')]) + wheelAngle(d, ZERO_FAULTS))).toBeCloseTo(0, 9);
    }
  });

  it('keeps the pedals level through a whole crank turn', () => {
    for (let i = 0; i <= 48; i++) {
      const xf = bike.pose(i / 48, ZERO_FAULTS, 0);
      for (const id of ['pedal-left', 'pedal-right']) expect(xf[P(id)].quaternion).toEqual([0, 0, 0, 1]);
    }
  });

  it('turns the fork, front wheel, front brake and front mudguard about the head-tube axis by steer(drive)', () => {
    for (const d of DRIVES) {
      const xf = bike.pose(d, ZERO_FAULTS, 0);
      const q = fromAxisAngle(STEER_AXIS, steer(d));
      for (const id of ['fork', 'basket', 'brake-front', 'mudguard-front']) {
        expect(transformDistance(xf[P(id)], { position: world(HEAD_TOP), quaternion: q }), id).toBeLessThan(1e-9);
      }
      // The front wheel's axle swings round the axis with them.
      const axle = xf[P('front-wheel')].position;
      const fork = xf[P('fork')];
      const local = rotate(
        [-fork.quaternion[0], -fork.quaternion[1], -fork.quaternion[2], fork.quaternion[3]],
        sub(axle, fork.position),
      );
      const rest = bike.pose(0, ZERO_FAULTS, 0);
      expect(dist(local, sub(rest[P('front-wheel')].position, rest[P('fork')].position))).toBeLessThan(1e-9);
    }
  });
});

describe('assembly', () => {
  it('brings the parts that land after the core in from below or level, never down from above, but the basket', () => {
    // The text sits at the top of the screen (storyboard §3.4): a part falling into place from above
    // would cross it while the brief's lines are lighting. The basket is the one exception: it drops
    // onto the fork from not far above, on the close front shot, under the text
    // (e2e/clearance.spec.ts is the arbiter).
    for (const part of bike.parts) {
      if (part.role !== 'body') continue;
      if (part.id === 'basket') {
        expect(part.explodedOffset.position[1]).toBeGreaterThan(0);
        expect(part.explodedOffset.position[1] / SCALE, 'drops from under 0.4 m').toBeLessThan(0.4);
        continue;
      }
      expect(part.explodedOffset.position[1], part.id).toBeLessThanOrEqual(0.2);
    }
  });

  it('drops the basket onto the fork: it hangs above while its motes gather, falls, hops once and settles', () => {
    const basket = bike.parts[P('basket')];
    const [from, to] = basket.settle ?? [0, 0];
    const lo = from - SETTLE_WINDOW;
    const a = (x: number) => partAssembly(basket, lo + (to - lo) * x);
    // Held up, fully exploded, until most of its motes have reached it.
    for (const x of [0, 0.3, 0.6, 0.8]) expect(a(x), `x ${x}`).toBe(0);
    // Every mote has landed on it before it falls: none lands later than its window lets it.
    expect(basketArrival(0.8)).toBe(0);
    // Falls faster and faster: the second half of the fall covers three times the first.
    expect(a(0.85)).toBeCloseTo(0.25, 9);
    expect(a(0.9)).toBeCloseTo(1, 12);
    // Hops: back up a little, then down for good.
    const hop = Math.min(...Array.from({ length: 101 }, (_, i) => a(0.9 + (0.1 * i) / 100)));
    expect(hop).toBeLessThan(0.95);
    expect(hop).toBeGreaterThan(0.8);
    expect(a(1)).toBe(1);
    // Straight down onto its seat on the fork, turned as the fork is.
    const s = defaultSceneState();
    s.mech.assembly = to;
    const xf = partTransforms(bike, s);
    expect(transformDistance(xf[P('basket')], xf[P('fork')])).toBeLessThan(1e-9);
  });
});

/** Spearman's rank correlation of two equal-length samples (no ties expected). */
function rankCorrelation(x: number[], y: number[]): number {
  const ranks = (v: number[]) => {
    const order = v.map((value, i) => ({ value, i })).sort((a, b) => a.value - b.value);
    const r = new Array<number>(v.length);
    order.forEach((o, k) => (r[o.i] = k));
    return r;
  };
  const rx = ranks(x);
  const ry = ranks(y);
  const n = x.length;
  const d2 = rx.reduce((s, r, i) => s + (r - ry[i]) ** 2, 0);
  return 1 - (6 * d2) / (n * (n * n - 1));
}

describe('the frame, laid tube by tube (docs/specs/2026-10-05-act-1-build-and-orbit.md §3.6)', () => {
  const frameIndex = P('frame');
  const points = bike.samplePoints(60_000, 3);
  const attrs = buildMoteAttrs(bike, points);
  /** Frame motes: settle, where they lie along the lay order, and both positions in bike metres. */
  const motes = attrs.flatMap((a, i) => {
    if (a.part !== frameIndex) return [];
    const local = times(points[i].local, 1 / SCALE);
    return [{ settle: a.settle, ...layPosition(local), local, twin: times(points[i].localTwin, 1 / SCALE) }];
  });
  const onTube = (k: number) => motes.filter((m) => m.tube === k);

  it('is laid in place over the lay order span: identity offset, window [0.81, 0.95], a settle field', () => {
    const part = bike.parts[frameIndex];
    expect(part.settle).toEqual([FRAME_LAY[0].slot[0], FRAME_LAY[FRAME_LAY.length - 1].slot[1]]);
    expect(part.settle).toEqual([0.81, 0.95]);
    expect(part.settleField).toBeDefined();
    expect(part.explodedOffset.position).toEqual([0, 0, 0]);
    expect(part.explodedOffset.quaternion).toEqual([0, 0, 0, 1]);
  });

  it('partitions the window into slots in list order, each tube with motes of its own', () => {
    for (let k = 1; k < FRAME_LAY.length; k++) expect(FRAME_LAY[k].slot[0], FRAME_LAY[k].name).toBe(FRAME_LAY[k - 1].slot[1]);
    expect(motes.length).toBeGreaterThan(3000);
    FRAME_LAY.forEach((lay, k) => expect(onTube(k).length, lay.name).toBeGreaterThan(20));
  });

  it('lands every frame mote inside the slot of the tube it lies on, within a tube radius of it', () => {
    for (const m of motes) {
      const [from, to] = FRAME_LAY[m.tube].slot;
      expect(m.settle).toBeGreaterThanOrEqual(from);
      expect(m.settle).toBeLessThanOrEqual(to);
      const near = Math.min(
        ...FRAME_LAY[m.tube].segments.map((s) => {
          const ab = sub(s.b, s.a);
          const u = Math.min(1, Math.max(0, ((m.local[0] - s.a[0]) * ab[0] + (m.local[1] - s.a[1]) * ab[1] + (m.local[2] - s.a[2]) * ab[2]) / Math.max(1e-12, ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2)));
          return dist(m.local, [s.a[0] + ab[0] * u, s.a[1] + ab[1] * u, s.a[2] + ab[2] * u]) - s.radius;
        }),
      );
      expect(near).toBeLessThan(1e-3);
    }
  });

  it('lays the tubes in order: the mean settle rises down the list', () => {
    const means = FRAME_LAY.map((_, k) => onTube(k).reduce((s, m) => s + m.settle, 0) / onTube(k).length);
    for (let k = 1; k < means.length; k++) expect(means[k], FRAME_LAY[k].name).toBeGreaterThan(means[k - 1]);
  });

  it('lays each tube from its root to its far end, behind a soft front: rank correlation of settle with t at least 0.9', () => {
    FRAME_LAY.forEach((lay, k) => {
      if (lay.segments.every((s) => s.along[0] === s.along[1])) return; // a knot has no along
      const m = onTube(k);
      const rho = rankCorrelation(
        m.map((x) => x.t),
        m.map((x) => x.settle),
      );
      expect(rho, lay.name).toBeGreaterThanOrEqual(0.9);
      expect(rho, `${lay.name}: the hash keeps the front soft`).toBeLessThan(1);
    });
  });

  it('lays one seam at a time: at assembly 0.86 the motes flaring over half are frame motes on at most two consecutive tubes', () => {
    // The landing flare lines up into a travelling seam because the frame's settle values are
    // ordered along its tubes; on every other part it is a scattered sparkle.
    const state = defaultSceneState();
    state.mech.assembly = 0.86;
    state.mech.variant = 1;
    const xf = partTransforms(bike, state);
    const hot = attrs.flatMap((a, i) => {
      const out = mote(a, state, xf);
      const flare = (out.brightness - (1 - out.settled + SETTLED_BRIGHTNESS * out.settled)) / FLARE_GAIN;
      return flare > 0.5 ? [{ part: a.part, local: times(points[i].local, 1 / SCALE) }] : [];
    });
    expect(hot.length).toBeGreaterThan(50);
    for (const h of hot) expect(bike.parts[h.part].id).toBe('frame');
    const tubes = [...new Set(hot.map((h) => layPosition(h.local).tube))].sort((a, b) => a - b);
    expect(tubes.length).toBeLessThanOrEqual(2);
    expect(tubes[tubes.length - 1] - tubes[0]).toBeLessThanOrEqual(1);
    const axis = (p: Vec3, a: Vec3, b: Vec3) => {
      const ab = sub(b, a);
      const u = Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / (ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1)));
      return dist(p, [a[0] + ab[0] * u, a[1] + ab[1] * u, a[2] + ab[2] * u]);
    };
    for (const h of hot) {
      const near = Math.min(...tubes.flatMap((k) => FRAME_LAY[k].segments.map((sg) => axis(h.local, sg.a, sg.b))));
      expect(near).toBeLessThan(0.03);
    }
  });

  it('carries the order to the twin: its head tube rises into the mast, and its top tube climbs from the stub to the mast join', () => {
    const head = onTube(FRAME_LAY.findIndex((l) => l.name === 'head tube')).sort((a, b) => a.settle - b.settle);
    const up = (p: Vec3) => sub(p, HEAD_TOP).reduce((s, v, i) => s + v * STEER_AXIS[i], 0);
    expect(
      rankCorrelation(
        head.map((m) => m.settle),
        head.map((m) => up(m.twin)),
      ),
    ).toBeGreaterThanOrEqual(0.9);
    // The last tenth to land on the twin's head tube is up in the mast sleeve, above the headset.
    for (const m of head.slice(-Math.ceil(head.length / 10))) expect(up(m.twin)).toBeGreaterThan(0.1);

    const top = onTube(FRAME_LAY.findIndex((l) => l.name === 'top tube')).sort((a, b) => a.settle - b.settle);
    const [stub, join] = topTubeEnds('twin');
    expect(
      rankCorrelation(
        top.map((m) => m.settle),
        top.map((m) => dist(m.twin, stub)),
      ),
    ).toBeGreaterThanOrEqual(0.9);
    const tenth = Math.ceil(top.length / 10);
    const mean = (ms: typeof top, p: Vec3) => ms.reduce((s, m) => s + dist(m.twin, p), 0) / ms.length;
    // The first to land are at the stub, the last at the mast join.
    expect(mean(top.slice(0, tenth), stub)).toBeLessThan(0.12);
    expect(mean(top.slice(-tenth), join)).toBeLessThan(0.12);
  });
});

describe('authored steering (mech.steer)', () => {
  const steeredFront = ['fork', 'basket', 'brake-front', 'mudguard-front'];

  it('yaws the front by the full amplitude at steer ±1 and drive 0, and in the twin the saddle with it', () => {
    for (const v of [0, 1]) {
      for (const sign of [1, -1]) {
        const xf = bike.pose(0, ZERO_FAULTS, v, sign);
        const q = fromAxisAngle(STEER_AXIS, sign * (v === 0 ? 0.14 : 0.45));
        for (const id of steeredFront) {
          expect(transformDistance(xf[P(id)], { position: world(HEAD_TOP), quaternion: q }), `${id} v${v}`).toBeLessThan(1e-9);
        }
        // The front wheel's axle swings round the axis with the fork.
        const rest = bike.pose(0, ZERO_FAULTS, v);
        const axle = sub(xf[P('front-wheel')].position, world(HEAD_TOP));
        const restAxle = sub(rest[P('front-wheel')].position, world(HEAD_TOP));
        expect(dist(axle, rotate(q, restAxle)), `axle v${v}`).toBeLessThan(1e-9);
        const seat: PartTransform = { position: xf[P('saddle')].position, quaternion: v === 1 ? q : [0, 0, 0, 1] };
        expect(transformDistance(xf[P('saddle')], seat), `saddle v${v}`).toBeLessThan(1e-9);
      }
    }
  });

  it('clamps the sum at full lock, so a swing past it holds the lock', () => {
    // drive 1 is the natural lock on one side: adding more holds it there.
    expect(bike.pose(1, ZERO_FAULTS, 1, 0.5)).toEqual(bike.pose(1, ZERO_FAULTS, 1));
    expect(bike.pose(0.5, ZERO_FAULTS, 1, 2)).toEqual(bike.pose(0.5, ZERO_FAULTS, 1, 1.5));
    expect(bike.pose(0.5, ZERO_FAULTS, 1, 2)).not.toEqual(bike.pose(0.5, ZERO_FAULTS, 1, 0.1));
  });

  it('changes nothing at steer 0, for every drive and variant', () => {
    for (const d of DRIVES) {
      for (const v of [0, 0.5, 1]) expect(bike.pose(d, ZERO_FAULTS, v, 0), `drive ${d} variant ${v}`).toEqual(bike.pose(d, ZERO_FAULTS, v));
    }
  });
});

describe("the wrong twin: saddle and handlebars on each other's posts", () => {
  it('swaps the two mounts: the saddle up the steering column, the bars into the seat-tube stub', () => {
    const correct = bike.pose(0.3, ZERO_FAULTS, 0);
    const twin = bike.pose(0.3, ZERO_FAULTS, 1);
    // The saddle goes onto the steering axis, a little above where the correct bars clamp in (the
    // twin's mast is tall); the bars go within 0.05 m of the correct seat clamp, into the stub.
    expect(dist(twin[P('saddle')].position, world(MAST_MOUNT))).toBeLessThan(1e-9);
    const above = sub(MAST_MOUNT, STEER_MOUNT);
    expect(Math.hypot(...above) - (above[0] * STEER_AXIS[0] + above[1] * STEER_AXIS[1])).toBeLessThan(1e-12);
    expect(Math.hypot(...above)).toBeLessThan(0.1);
    expect(dist(twin[P('handlebars')].position, correct[P('saddle')].position) / SCALE).toBeLessThan(0.05);
    expect(dist(twin[P('handlebars')].position, world(STUB_TOP))).toBeLessThan(1e-9);
    expect(dist(correct[P('saddle')].position, world(SEAT_CLAMP))).toBeLessThan(1e-9);
    expect(dist(correct[P('handlebars')].position, world(STEER_MOUNT))).toBeLessThan(1e-9);
    // Unrideable in a still: the saddle now stands in front of, and above, the grips.
    const { saddle, grips } = contacts(twin);
    for (const g of grips) {
      expect(saddle[0]).toBeGreaterThan(g[0]);
      expect(saddle[1]).toBeGreaterThan(g[1]);
    }
  });

  it('turns the saddle with the twin steering and leaves the handlebars fixed and square', () => {
    for (const d of DRIVES) {
      const twin = bike.pose(d, ZERO_FAULTS, 1);
      const turned = fromAxisAngle(STEER_AXIS, steer(d, 1));
      expect(
        transformDistance(twin[P('saddle')], { position: twin[P('saddle')].position, quaternion: turned }),
      ).toBeLessThan(1e-9);
      expect(transformDistance(twin[P('handlebars')], { ...twin[P('handlebars')], quaternion: [0, 0, 0, 1] })).toBe(0);
      // The saddle's nose still points forward of square, however far it turns.
      expect(rotate(twin[P('saddle')].quaternion, [1, 0, 0])[0]).toBeGreaterThan(0.89);
      const q = fromAxisAngle(STEER_AXIS, steer(d));
      const correct = bike.pose(d, ZERO_FAULTS, 0);
      expect(
        transformDistance(correct[P('handlebars')], { position: correct[P('handlebars')].position, quaternion: q }),
      ).toBeLessThan(1e-9);
      expect(transformDistance(correct[P('saddle')], { ...correct[P('saddle')], quaternion: [0, 0, 0, 1] })).toBe(0);
    }
  });

  it("cocks the saddle visibly at full lock: about 26 degrees, against the correct bike's 8", () => {
    const yaw = (xf: PartTransform[], id: string): number => {
      const nose = rotate(xf[P(id)].quaternion, [1, 0, 0]);
      return (Math.atan2(-nose[2], nose[0]) * 180) / Math.PI;
    };
    // drive 3 is full lock; the yaw seen from above is a little less than the turn about the tilted axis.
    expect(Math.abs(yaw(bike.pose(3, ZERO_FAULTS, 1), 'saddle'))).toBeGreaterThan(20);
    expect(Math.abs(yaw(bike.pose(3, ZERO_FAULTS, 0), 'handlebars'))).toBeLessThan(9);
  });

  it('steers the whole front further, and changes nothing else', () => {
    const steered = new Set(['fork', 'basket', 'front-wheel', 'brake-front', 'mudguard-front']);
    for (const d of DRIVES) {
      const correct = bike.pose(d, ZERO_FAULTS, 0);
      for (const v of [0.5, 1]) {
        const twin = bike.pose(d, ZERO_FAULTS, v);
        const q = fromAxisAngle(STEER_AXIS, steer(d, v));
        bike.parts.forEach((p, i) => {
          if (p.id === 'saddle' || p.id === 'handlebars') return;
          if (!steered.has(p.id)) {
            expect(twin[i], p.id).toEqual(correct[i]);
            return;
          }
          // The front turns about the head tube by the twin's angle; the wheel keeps its own spin.
          if (p.id !== 'front-wheel') {
            expect(transformDistance(twin[i], { position: world(HEAD_TOP), quaternion: q }), p.id).toBeLessThan(1e-9);
          }
        });
        const axle = twin[P('front-wheel')].position;
        const fork = twin[P('fork')];
        const local = rotate(
          [-fork.quaternion[0], -fork.quaternion[1], -fork.quaternion[2], fork.quaternion[3]],
          sub(axle, fork.position),
        );
        const rest = bike.pose(0, ZERO_FAULTS, 0);
        expect(dist(local, sub(rest[P('front-wheel')].position, rest[P('fork')].position))).toBeLessThan(1e-9);
      }
    }
  });
});

describe('the twin frame, built round the swap', () => {
  const pts = bike.samplePoints(30_000, 5).filter((p) => p.part === P('frame'));
  /** Distance from p to the segment a-b. */
  const toSegment = (p: Vec3, a: Vec3, b: Vec3) => {
    const ab = sub(b, a);
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / Math.hypot(...ab) ** 2));
    return dist(p, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
  };

  it('carries every point of the correct top tube to the twin top tube, at the same place along it', () => {
    // Frame points live in world-scaled bike coordinates (the frame sits at the bike origin).
    const [a0, b0] = topTubeEnds('correct').map((p) => times(p, SCALE));
    const [a1, b1] = topTubeEnds('twin').map((p) => times(p, SCALE));
    const along = (p: Vec3, a: Vec3, b: Vec3) => {
      const ab = sub(b, a);
      return ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / Math.hypot(...ab) ** 2;
    };
    // The top tube's own points: on its surface (radius 0.015 m), clear of the junction ends.
    const tubePts = pts.filter((p) => {
      const u = along(p.local, a0, b0);
      // A 16-sided tube: its faces sit between 0.981 and 1 of the radius from the axis.
      return u > 0.1 && u < 0.9 && Math.abs(toSegment(p.local, a0, b0) / SCALE - 0.0149) < 3e-4;
    });
    expect(tubePts.length).toBeGreaterThan(100);
    for (const p of tubePts) {
      // As far from the twin tube's axis as from the correct one's, and as far along it.
      expect(toSegment(p.localTwin, a1, b1) / SCALE).toBeCloseTo(toSegment(p.local, a0, b0) / SCALE, 6);
      expect(along(p.localTwin, a1, b1)).toBeCloseTo(along(p.local, a0, b0), 4);
    }
  });

  it('keeps every brake cable joined up as the bike steers, on either bike', () => {
    for (const variant of [0, 1]) {
      const build = variant === 0 ? 'correct' : 'twin';
      const mount = variant === 0 ? STEER_MOUNT : STUB_TOP;
      for (const d of [0, 0.5, 1, 1.5, 2, 3, 3.28]) {
        const xf = bike.pose(d, ZERO_FAULTS, variant);
        const housingEnd = (s: 1 | -1) =>
          applyToPoint(xf[P('handlebars')], times(sub(cableHousing(s, build, mount).at(-1) as Vec3, mount), SCALE));
        const onFrame = (p: Vec3) => applyToPoint(xf[P('frame')], times(p, SCALE));
        const front = frontCableRun(build);
        const rear = rearCableRun(build);
        // Where a housing on the bars meets its run on the frame, and where the front run meets its caliper.
        expect(dist(housingEnd(-1), onFrame(front[0])) / SCALE, `${build} front at ${d}`).toBeLessThan(0.01);
        expect(dist(housingEnd(1), onFrame(rear[0])) / SCALE, `${build} rear at ${d}`).toBeLessThan(0.01);
        const caliper = applyToPoint(xf[P('brake-front')], times(sub(front.at(-1) as Vec3, HEAD_TOP), SCALE));
        expect(dist(caliper, onFrame(front.at(-1) as Vec3)) / SCALE, `${build} caliper at ${d}`).toBeLessThan(0.01);
      }
    }
  });

  it('puts the twin handlebars low and behind its saddle', () => {
    const { saddle, grips } = contacts(bike.pose(3, ZERO_FAULTS, 1));
    for (const g of grips) {
      expect((saddle[1] - g[1]) / SCALE).toBeGreaterThan(0.15);
      expect((saddle[0] - g[0]) / SCALE).toBeGreaterThan(0.4);
    }
  });
});

describe('faults', () => {
  const points = bike.samplePoints(6000, 4);
  /** The farthest any sampled point moves from the ghost pose. */
  function divergence(drive: number, f: Faults): number {
    const ghost = bike.pose(drive, ZERO_FAULTS, 0);
    const faulted = bike.pose(drive, f, 0);
    let worst = 0;
    for (const b of points) {
      worst = Math.max(worst, dist(applyToPoint(ghost[b.part], b.local), applyToPoint(faulted[b.part], b.local)));
    }
    return worst;
  }

  it.each(FAULT_KEYS.filter((k) => k !== 'drift'))('%s at full strength visibly leaves the ghost', (k) => {
    for (const d of [0.3, 1.1]) expect(divergence(d, { ...ZERO_FAULTS, [k]: 1 }), `drive ${d}`).toBeGreaterThan(0.05);
  });

  it('misalign buckles the front wheel: its axis tilts off the steering plane as it turns', () => {
    const tilts = [0.1, 0.3, 0.55, 0.8].map((d) => {
      const q = bike.pose(d, { ...ZERO_FAULTS, misalign: 1 }, 0)[P('front-wheel')].quaternion;
      const qs = fromAxisAngle(STEER_AXIS, steer(d));
      const axle = rotate([-qs[0], -qs[1], -qs[2], qs[3]], rotate(q, Z));
      return Math.acos(Math.min(1, axle[2]));
    });
    for (const t of tilts) expect(t).toBeLessThan(0.19);
    expect(Math.max(...tilts)).toBeGreaterThan(0.15);
    // The wobble moves round with the wheel: the tilted axis points a different way each time.
    const dirs = [0.1, 0.3].map((d) =>
      rotate(bike.pose(d, { ...ZERO_FAULTS, misalign: 1 }, 0)[P('front-wheel')].quaternion, Z),
    );
    expect(dist(dirs[0], dirs[1])).toBeGreaterThan(0.05);
  });

  it('jitter rattles the mudguards, brakes and bell, and leaves the drive alone', () => {
    const still = bike.pose(0.3, ZERO_FAULTS, 0);
    const shaken = bike.pose(0.3, { ...ZERO_FAULTS, jitter: 1 }, 0);
    for (const id of ['mudguard-front', 'mudguard-rear', 'brake-front', 'brake-rear', 'handlebars']) {
      expect(transformDistance(shaken[P(id)], still[P(id)]), id).toBeGreaterThan(1e-3);
    }
    for (const id of ['frame', 'ground', 'cranks', 'rear-wheel', 'pedal-left', ...CHAIN_IDS]) {
      expect(shaken[P(id)], id).toEqual(still[P(id)]);
    }
  });

  it('keeps the chain a chain when it drops: adjacent links stay within 1.5 pitches, and it visibly sags', () => {
    for (const d of DRIVES) {
      const ghost = bike.pose(d, ZERO_FAULTS, 0);
      for (const stall of [0, 0.25, 0.5, 0.75, 1]) {
        const xf = bike.pose(d, { ...ZERO_FAULTS, stall }, 0);
        CHAIN_IDS.forEach((id, k) => {
          const next = CHAIN_IDS[(k + 1) % CHAIN_SEGMENTS];
          expect(dist(xf[P(id)].position, xf[P(next)].position), `${id} at stall ${stall}`).toBeLessThan(
            1.5 * SEGMENT_PITCH * SCALE,
          );
        });
      }
      const dropped = bike.pose(d, { ...ZERO_FAULTS, stall: 1 }, 0);
      // Measured against the ghost's chain shape: the lowest link hangs well below the lowest on the ghost.
      const lowest = (xf: PartTransform[]) => Math.min(...CHAIN_IDS.map((id) => xf[P(id)].position[1]));
      expect(lowest(ghost) - lowest(dropped)).toBeGreaterThan(0.2);
    }
  });

  // The story may raise a fault at any drive: the wheel must not spin back to some angle counted
  // from drive 0. Same halving rule as the continuity test, on the reflector, the wheel's one
  // asymmetric mark; and a bound on how far the wheel turns from its unfaulted angle.
  /** Back wheel turn (unwrapped, rad, positive backwards) from fault 0 as `fault` rises to 1 at `drive`. */
  function ramp(fault: 'stall' | 'slip', drive: number) {
    const rear = P('rear-wheel');
    const mark = times(
      [REFLECTOR.r * Math.cos(REFLECTOR.angle), REFLECTOR.r * Math.sin(REFLECTOR.angle), REFLECTOR.z],
      SCALE,
    );
    const at = (x: number) => bike.pose(drive, { ...ZERO_FAULTS, [fault]: x }, 0)[rear];
    const spin = (t: PartTransform) => {
      const v = rotate(t.quaternion, [1, 0, 0]);
      return Math.atan2(v[1], v[0]);
    };
    const largestStep = (n: number) => {
      let worst = 0;
      let prev = applyToPoint(at(0), mark);
      for (let i = 1; i <= n; i++) {
        const p = applyToPoint(at(i / n), mark);
        worst = Math.max(worst, dist(p, prev));
        prev = p;
      }
      return worst;
    };
    // Spin is about -z (forward is clockwise), so backwards is a positive turn.
    const turns: number[] = [];
    let turned = 0;
    let prev = spin(at(0));
    for (let i = 1; i <= 400; i++) {
      const cur = spin(at(i / 400));
      let d = cur - prev;
      d -= 2 * Math.PI * Math.round(d / (2 * Math.PI));
      turned += d;
      turns.push(turned);
      prev = cur;
    }
    return { coarse: largestStep(200), fine: largestStep(400), turns };
  }

  it('raising stall at a late drive turns the back wheel smoothly, never a spoke pitch backwards', () => {
    const { coarse, fine, turns } = ramp('stall', 7.3);
    expect(coarse).toBeGreaterThan(0);
    expect(fine / coarse).toBeLessThan(0.6);
    expect(fine).toBeLessThan(0.15);
    for (const t of turns) expect(t).toBeLessThan((2 * Math.PI) / 12);
  });

  it('raising slip at a late drive turns the back wheel smoothly, by no more than one jerk', () => {
    const { coarse, fine, turns } = ramp('slip', 7.3);
    expect(coarse).toBeGreaterThan(0);
    expect(fine / coarse).toBeLessThan(0.6);
    expect(fine).toBeLessThan(0.15);
    for (const t of turns) {
      expect(t).toBeGreaterThan(-1e-9); // slip only ever holds the wheel back
      expect(t).toBeLessThanOrEqual(SLIP_JERK + 1e-9);
    }
  });

  it('never moves the ground', () => {
    const still = bike.pose(0.3, ZERO_FAULTS, 0)[P('ground')];
    for (const k of FAULT_KEYS) expect(bike.pose(0.3, { ...ZERO_FAULTS, [k]: 1 }, 1)[P('ground')]).toEqual(still);
  });
});

describe('point shares', () => {
  const pts = bike.samplePoints(30_000, 3);
  const counts = bike.parts.map((_, i) => pts.filter((p) => p.part === i).length);

  it('packs every part about as densely as the rest of its role, bar the deliberate exceptions', () => {
    const d = Object.fromEntries(partDensities().map((x) => [x.id, x]));
    // The basket's broad panels are sampled thinner (shapes.ts BASKET_DENSITY).
    const deliberate: Record<string, number> = { 'brake-front': 1.3, 'brake-rear': 1.3, 'loose-bolts': 1.3, basket: 0.22 };
    for (const id of CHAIN_IDS) deliberate[id] = 1.6; // tiny links, a little denser so each reads
    for (const x of Object.values(d)) {
      if (x.role === 'core' || x.id === 'ground') continue;
      expect(x.density, x.id).toBeCloseTo(deliberate[x.id] ?? 1, 9);
    }
    // The core: evenly dense but for the saddle, whose broad lit top is sampled thinner, and the
    // small pedals, sampled denser so they read as warm core.
    const bars = d.handlebars.density;
    expect(d['pedal-right'].density).toBeCloseTo(d['pedal-left'].density, 9);
    expect(d['pedal-left'].density / bars).toBeCloseTo(1.4, 9);
    expect(d.saddle.density / bars).toBeCloseTo(0.5, 9);
    // Warm because it is warm, not because it is packed: no core part far denser than the body.
    expect(d['pedal-left'].density).toBeLessThan(2);
    // The ground is a dim, sparse strip.
    expect(d.ground.density).toBeLessThan(0.25);
  });

  it('gives the core 15-30% of the points', () => {
    const core = pts.filter((p) => bike.parts[p.part].role === 'core').length / pts.length;
    expect(core).toBeGreaterThanOrEqual(0.15);
    expect(core).toBeLessThanOrEqual(0.3);
  });

  it('gives every part at least 50 points at a 30k budget, and every chain segment at least 20', () => {
    bike.parts.forEach((p, i) => {
      expect(counts[i], p.id).toBeGreaterThanOrEqual(CHAIN_IDS.includes(p.id) ? 20 : 50);
    });
  });
});
