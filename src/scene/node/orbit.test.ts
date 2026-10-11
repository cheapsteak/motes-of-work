import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import type { Vec3 } from '../../math/vec';
import { generateGalaxy, galaxyBudget, type Body } from '../../galaxy/generate';
import { GALAXY_TURN_PERIOD as SPLICED_TURN_PERIOD, hexToRgb, NODE_NEVER, NODE_PALETTE, ORBIT_CONSTANTS, ORBIT_HEAD_BITS, ORBIT_HEAD_MASK } from './birth';
import { BODY_TEXELS, bodyTexel, LIGHT_MODE, packBodyData } from './bodyData';
import { starTint } from './star';
import { bodyGalactic, bodyWorld, elementsAt, GALAXY_TURN_PERIOD, galaxyTurn, keplerE, orbitLocal, orbitTurns } from './orbit';
import { orbitLibraryGlsl, withOrbitLibrary } from './shaderSource';
import orbitGlsl from './orbit.glsl?raw';

const TAU = 2 * Math.PI;
const grid = (from: number, to: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + ((to - from) * i) / n);

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const row = (id: string): number => g.ids[id];
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const orbiting = g.bodies.filter((b) => b.orbit !== null);
/** A body's orbital elements as the texture holds them (float32), so the checks read what the shaders read. */
const elements = (b: Body) => elementsAt(data, b.index);
/** Every star's system: its planets and their moons; a binary's is both stars' (the first star the one listed as `star`). */
const systems = g.systems
  .map((row) => g.bodies.filter((s) => s.kind === 'star' && (s.index === row || s.host === row)))
  .map(([star, ...others]) => ({
    star,
    members: g.bodies.filter((b) => b.kind !== 'bary' && b.index !== star.index && [star, ...others].some((s) => b.star === s.index)),
  }));

describe('packBodyData', () => {
  it('packs one row of eight texels per body and one of two per stream, the feed last', () => {
    expect(BODY_TEXELS).toBe(8);
    expect(data.bodyCount).toBe(g.bodies.length);
    expect(data.bodies).toHaveLength(g.bodies.length * BODY_TEXELS * 4);
    expect(data.streamCount).toBe(g.streams.length + 1);
    expect(data.feedRow).toBe(g.streams.length);
    expect(data.n0Row).toBe(row('N0'));
  });

  it('holds every field of a body where the layout says', () => {
    const kinds = { core: 0, star: 1, planet: 2, moon: 3, bary: 4 } as const;
    for (const b of g.bodies) {
      const f = Math.fround;
      const [x, y, z, kind] = bodyTexel(data.bodies, 0, b.index);
      expect([x, y, z]).toEqual((b.spot ?? [0, 0, 0]).map(f));
      expect(kind).toBe(kinds[b.kind]);
      expect(bodyTexel(data.bodies, 3, b.index)).toEqual([b.host, f(b.R), f(b.born), f(b.dur)]);
      expect(bodyTexel(data.bodies, 4, b.index)).toEqual([
        f(b.fixAt ?? NODE_NEVER),
        f(b.hiAt ?? NODE_NEVER),
        b.hop ?? -1,
        b.cracked ? 1 : 0,
      ]);
      expect(bodyTexel(data.bodies, 5, b.index)).toEqual([b.derpSeed, f(b.derpPhase), b.star, b.rule]);
      if (b.orbit !== null) {
        const o = b.orbit;
        expect(Object.values(elements(b))).toEqual([o.a, o.e, o.tilt, o.tiltAz, o.omega0, o.precession, o.period, o.phase].map(f));
      }
    }
    // T6 the base colour and light mode, T7 a star's look (re-skin §4.3): a star its tint, self-lit, and
    // its brightness, spikes, period and phase; every other body the agents' blue, lit, and no look.
    for (const b of g.bodies) {
      const f = Math.fround;
      const look = b.look;
      if (look) {
        expect(bodyTexel(data.bodies, 6, b.index), b.id).toEqual([...starTint(look.temperature).map(f), LIGHT_MODE.selfLit]);
        expect(bodyTexel(data.bodies, 7, b.index), b.id).toEqual([f(look.brightness), look.spikes, f(look.period), f(look.phase)]);
      } else {
        expect(bodyTexel(data.bodies, 6, b.index), b.id).toEqual([...hexToRgb(NODE_PALETTE.NODE_AGENT).map(f), LIGHT_MODE.terminator]);
        expect(bodyTexel(data.bodies, 7, b.index), b.id).toEqual([0, 0, 0, 0]);
      }
      expect(look !== null).toBe(b.kind === 'star');
    }
    // The defect's seed is an integer below 2^24, exact in a float32.
    const r0 = g.bodies[row('R0')];
    expect(bodyTexel(data.bodies, 5, r0.index)[0]).toBe(r0.derpSeed);
  });

  it('holds every stream, and the feed from R0', () => {
    const kinds = { out: 0, side: 1, in: 2 } as const;
    const f = Math.fround;
    g.streams.forEach((s, i) => {
      expect(bodyTexel(data.streams, 0, i)).toEqual([s.from, s.to, kinds[s.kind], f(s.born)]);
      expect(bodyTexel(data.streams, 1, i)).toEqual([
        f(s.hiAt ?? NODE_NEVER),
        s.hop ?? -1,
        f(s.bowBearing),
        f(g.bodies[s.to].fixAt ?? NODE_NEVER),
      ]);
    });
    const r0 = g.bodies[g.feedFrom];
    expect(bodyTexel(data.streams, 0, data.feedRow)).toEqual([r0.index, -1, 3, 0]);
    expect(bodyTexel(data.streams, 1, data.feedRow)).toEqual([NODE_NEVER, (r0.hop ?? -1) + 1, 0, f(r0.fixAt ?? NODE_NEVER)]);
  });
});

describe('orbit', () => {
  it('Kepler converges for e ≤ 0.4 (a binary star up to BIN.e[1], a planet of one up to BIN.eMax)', () => {
    for (const e of [0, 0.1, 0.22, 0.3, 0.4])
      for (const M of grid(0, TAU, 360)) expect(Math.abs(keplerE(M, e) - e * Math.sin(keplerE(M, e)) - M)).toBeLessThan(1e-6);
  });

  it('a body stays between periapsis and apoapsis', () => {
    for (const b of orbiting) {
      const o = elements(b);
      for (const t of grid(0, 1200, 1000)) {
        const r = len(orbitLocal(o, t));
        expect(r, b.id).toBeGreaterThanOrEqual(o.a * (1 - o.e) - 1e-9);
        expect(r, b.id).toBeLessThanOrEqual(o.a * (1 + o.e) + 1e-9);
      }
    }
  });

  it("e = 0 is revision 3's circle", () => {
    for (const b of orbiting.slice(0, 40)) {
      const o = { ...elements(b), e: 0 };
      for (const t of grid(0, 1200, 97)) {
        const p = orbitLocal(o, t);
        expect(len(p)).toBeCloseTo(o.a, 9);
        // Undo the tilt about the axis at tiltAz, then read the angle in the plane: phase + 2πt/P + ω.
        // The axis k = (cos az, 0, sin az); m = (−sin az, 0, cos az) lies in the plane across it.
        const [ca, sa] = [Math.cos(o.tiltAz), Math.sin(o.tiltAz)];
        const u = p[0] * ca + p[2] * sa;
        const w = (-p[0] * sa + p[2] * ca) * Math.cos(o.tilt) + p[1] * Math.sin(o.tilt);
        const angle = Math.atan2(w, u) + o.tiltAz;
        const want = o.omega0 + (o.precession === 0 ? 0 : (TAU * t) / o.precession) + o.phase * TAU + (TAU * t) / o.period;
        const d = Math.atan2(Math.sin(angle - want), Math.cos(angle - want));
        expect(Math.abs(d), `${b.id} at ${t}`).toBeLessThan(1e-9);
        // The plane is tilted by `tilt` about the axis: the lift is the in-plane offset from it times sin tilt.
        expect(p[1]).toBeCloseTo(o.a * Math.sin(angle - o.tiltAz) * Math.sin(o.tilt), 9);
      }
    }
  });

  it('goes round once a period, fastest at periapsis, with its periapsis turning once a precession', () => {
    for (const id of ['C1', 'C1-m1', 'N0']) {
      const o = { ...elements(g.bodies.find((b) => b.id === id)!), tilt: 0 };
      const still = { ...o, precession: 1e30 };
      // One period on, the body is where it was (with the periapsis held still).
      const back = orbitLocal(still, 11 + o.period);
      orbitLocal(still, 11).forEach((v, k) => expect(back[k]).toBeCloseTo(v, 9));
      // Periapsis at M = 0, apoapsis half a period later: Kepler's speeds there are in the ratio (1 + e)/(1 − e).
      const tp = o.period * (1 - o.phase);
      const speed = (t: number) => len(sub(orbitLocal(still, t + 1e-4), orbitLocal(still, t - 1e-4))) / 2e-4;
      expect(speed(tp) / speed(tp + o.period / 2)).toBeCloseTo((1 + o.e) / (1 - o.e), 5);
      // At periapsis the body lies at bearing ω(t) = ω0 + 2π t / precession, at a (1 − e).
      for (const k of [0, 1, 3]) {
        const t = tp + k * o.period;
        const p = orbitLocal(o, t);
        expect(len(p)).toBeCloseTo(o.a * (1 - o.e), 9);
        const d = Math.atan2(p[2], p[0]) - (o.omega0 + (TAU * t) / o.precession);
        expect(Math.abs(Math.atan2(Math.sin(d), Math.cos(d))), `${id} periapsis ${k}`).toBeLessThan(1e-9);
      }
    }
  });

  it('turns the galaxy once in GALAXY_TURN_PERIOD, spliced from birth.ts', () => {
    expect(GALAXY_TURN_PERIOD).toBe(1200);
    expect(SPLICED_TURN_PERIOD).toBe(GALAXY_TURN_PERIOD);
    expect(galaxyTurn(300)).toBeCloseTo(Math.PI / 2, 12);
    // Reduced to one turn: a day in, the galaxy has turned 72 times and is back where it set out.
    expect(galaxyTurn(1200)).toBe(0);
    expect(galaxyTurn(86_400 + 300)).toBeCloseTo(Math.PI / 2, 9);
    for (const t of [0, 599.9, 1199.9, 86_400 + 1199.9]) {
      expect(galaxyTurn(t)).toBeGreaterThanOrEqual(0);
      expect(galaxyTurn(t)).toBeLessThan(TAU);
    }
  });

  it('walks the host chain: a star at its spot, a planet round its star, a moon round its planet', () => {
    const t = 101;
    const c1 = g.bodies[row('C1')];
    const p1 = g.bodies[row('P1')];
    expect(bodyGalactic(data, p1.index, t)).toEqual(p1.spot!.map(Math.fround));
    const want = orbitLocal(elements(c1), t).map((v, k) => v + Math.fround(p1.spot![k]));
    bodyGalactic(data, c1.index, t).forEach((v, k) => expect(v).toBeCloseTo(want[k], 9));
    const moon = g.bodies.find((b) => b.kind === 'moon' && b.host === c1.index)!;
    const m = bodyGalactic(data, moon.index, t);
    const local = orbitLocal(elements(moon), t);
    m.forEach((v, k) => expect(v).toBeCloseTo(want[k] + local[k], 9));
  });

  it('N0 is the world origin at every ambient', () => {
    for (const t of [0, 37.3, 101, 953, 86_400]) expect(bodyWorld(data, data.n0Row, t)).toEqual([0, 0, 0]);
  });

  it('the galaxy turns rigidly', () => {
    // Every body at a spot: the core, the single stars and the binaries' barycentres.
    const fixed = g.bodies.filter((b) => b.spot !== null);
    expect(fixed.some((b) => b.kind === 'bary')).toBe(true);
    const pairs = fixed.flatMap((a, i) => fixed.slice(i + 1).map((b) => [a.index, b.index] as const));
    const dist = (i: number, j: number, t: number) => len(sub(bodyWorld(data, i, t), bodyWorld(data, j, t)));
    for (const [i, j] of pairs) {
      const d0 = dist(i, j, 0);
      for (const t of [37.3, 101, 600, 953, 3599.9]) expect(Math.abs(dist(i, j, t) - d0)).toBeLessThan(1e-9);
    }
    // ... about the core, by galaxyTurn: R0 (at the galaxy's centre) seen from N0 turns with it.
    const r0 = (t: number) => bodyWorld(data, row('R0'), t);
    const n0 = (t: number) => bodyGalactic(data, data.n0Row, t);
    for (const t of [0, 101, 953]) {
      const w = r0(t);
      const back = n0(t).map((v) => -v) as Vec3;
      const [c, s] = [Math.cos(galaxyTurn(t)), Math.sin(galaxyTurn(t))];
      const want: Vec3 = [back[0] * c + back[2] * s, back[1], -back[0] * s + back[2] * c];
      w.forEach((v, k) => expect(v).toBeCloseTo(want[k], 9));
    }
  });

  it('no two bodies meet at any ambient', () => {
    // 720 samples of 0..1200 s: no two bodies of a system (its star, planets and moons) meet as
    // spheres of their radii, which holds every planet clear of every other.
    const at = grid(0, 1200, 720);
    let closest = Infinity;
    for (const { star, members } of systems) {
      const all = [star, ...members];
      for (const t of at) {
        const pos = all.map((b) => bodyGalactic(data, b.index, t));
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            const gap = len(sub(pos[i], pos[j])) - all[i].R - all[j].R;
            closest = Math.min(closest, gap);
            if (gap <= 0) expect.fail(`${all[i].id} meets ${all[j].id} at ${t} s (gap ${gap})`);
          }
        }
      }
    }
    expect(closest).toBeGreaterThan(0);
    // A moon never crosses an adjacent track: a_i(1 + e_i) < a_{i+1}(1 − e_{i+1}).
    for (const p of g.bodies.filter((b) => b.kind === 'planet')) {
      const tracks = [
        ...new Map(g.bodies.filter((b) => b.host === p.index).map((m) => [`${m.orbit!.a}:${m.orbit!.e}`, m.orbit!])).values(),
      ].sort((x, y) => x.a - y.a);
      for (let i = 0; i + 1 < tracks.length; i++)
        expect(tracks[i].a * (1 + tracks[i].e), p.id).toBeLessThan(tracks[i + 1].a * (1 - tracks[i + 1].e));
    }
  });

  it('every body stays inside its lift bound', () => {
    // A planet's lift is at most 9.6 sin 0.25 off its star's. A moon's is at most its planet's
    // outermost track's apoapsis times sin 0.2: the designed 2.5 Rp only where the generator kept the
    // tracks at their designed radii, since it moves a track out until its moons clear the planet and
    // the track inside (up to about 4 Rp on MOTE_SEED).
    const outerTrack = (p: Body) => Math.max(...g.bodies.filter((m) => m.host === p.index).map((m) => m.orbit!.a * (1 + m.orbit!.e)));
    const at = grid(0, 1200, 720);
    for (const b of orbiting) {
      const host = g.bodies[b.host];
      // A binary's star goes round in the galaxy's plane.
      const bound = b.kind === 'star' ? 0 : b.kind === 'planet' ? 9.6 * Math.sin(0.25) : Math.max(2.5 * host.R, outerTrack(host)) * Math.sin(0.2);
      for (const t of at) {
        const lift = Math.abs(bodyGalactic(data, b.index, t)[1] - bodyGalactic(data, host.index, t)[1]);
        expect(lift, `${b.id} at ${t}`).toBeLessThanOrEqual(bound);
      }
    }
  });
});

describe('precession 0 (re-skin Task 1e)', () => {
  /** orbitLocal as it was before precession 0 meant none, statement for statement. */
  const before = (o: ReturnType<typeof elements>, t: number): Vec3 => {
    const M = TAU * ((x: number) => x - Math.floor(x))(o.phase + orbitTurns(t, o.period));
    const E = keplerE(M, o.e);
    const px = o.a * (Math.cos(E) - o.e);
    const py = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
    const w = o.omega0 + TAU * orbitTurns(t, o.precession);
    const [cw, sw] = [Math.cos(w), Math.sin(w)];
    const [x, z] = [px * cw - py * sw, px * sw + py * cw];
    const [ca, sa] = [Math.cos(o.tiltAz), Math.sin(o.tiltAz)];
    const [u, v] = [x * ca + z * sa, -x * sa + z * ca];
    const h = v * Math.cos(o.tilt);
    return [u * ca - h * sa, v * Math.sin(o.tilt), u * sa + h * ca];
  };

  it('holds ω at ω0 at every t: a binary star round its barycentre', () => {
    const stars = orbiting.filter((b) => b.kind === 'star');
    expect(stars.length).toBeGreaterThanOrEqual(2);
    for (const b of stars) {
      const o = elements(b);
      expect(o.precession).toBe(0);
      for (const t of grid(0, 3600, 211)) {
        const p = orbitLocal(o, t);
        // The ellipse never turns: its periapsis stays at ω0, so the body's true anomaly from ω0 is its Kepler ν.
        const turns = o.phase + orbitTurns(t, o.period);
        const E = keplerE(TAU * (turns - Math.floor(turns)), o.e);
        const nu = 2 * Math.atan2(Math.sqrt(1 + o.e) * Math.sin(E / 2), Math.sqrt(1 - o.e) * Math.cos(E / 2));
        const d = Math.atan2(p[2], p[0]) - (o.omega0 + nu);
        expect(Math.abs(Math.atan2(Math.sin(d), Math.cos(d))), `${b.id} at ${t}`).toBeLessThan(1e-9);
        expect(Math.abs(p[1])).toBe(0);
      }
    }
  });

  it('leaves every other orbit byte-identical', () => {
    for (const b of orbiting.filter((x) => x.kind !== 'star'))
      for (const t of [0, 37.3, 101, 953, 3599.9]) expect(orbitLocal(elements(b), t), `${b.id} at ${t}`).toEqual(before(elements(b), t));
  });
});

describe('orbit.glsl', () => {
  it('declares the orbit constants birth.ts exports', () => {
    const lib = orbitLibraryGlsl();
    for (const [name, value] of ORBIT_CONSTANTS) {
      const m = new RegExp(`const float ${name} = ([-0-9.e]+);`).exec(lib);
      expect(m, name).not.toBeNull();
      expect(Number(m![1]), name).toBe(value);
    }
    expect(lib).not.toMatch(/#include/);
    expect(lib).toMatch(/vec3 bodyWorld\(int row, float t\)/);
  });

  it('names every constant it uses from the spliced set, never a bare copy', () => {
    for (const m of orbitGlsl.matchAll(/\bGALAXY_[A-Z_]+\b/g)) expect(ORBIT_CONSTANTS.has(m[0]), m[0]).toBe(true);
    expect(orbitGlsl).not.toMatch(/const float GALAXY_/);
    expect(orbitGlsl).toContain('ORBIT_HEAD_MASK');
    expect(orbitGlsl).not.toMatch(/const uint ORBIT_HEAD_MASK/);
    expect(orbitLibraryGlsl()).toContain(`const uint ORBIT_HEAD_MASK = 0x${ORBIT_HEAD_MASK.toString(16).toUpperCase()}u;`);
    // The mask keeps the sign, the exponent and ORBIT_HEAD_BITS − 1 stored mantissa bits.
    expect(ORBIT_HEAD_MASK.toString(2)).toBe('1'.repeat(9 + ORBIT_HEAD_BITS - 1) + '0'.repeat(24 - ORBIT_HEAD_BITS));
    expect(orbitGlsl).not.toMatch(/1200/);
  });

  it('takes sin and cos from moteSinCos, never the builtins', () => {
    expect(orbitGlsl).not.toMatch(/(?<![A-Za-z_])(sin|cos)\(/);
    expect(withOrbitLibrary('// #include orbit.glsl (spliced in by src/scene/node/shaderSource.ts)')).toMatch(
      /vec2 moteSinCos\(float x\)[\s\S]*vec3 bodyWorld\(int row, float t\)/,
    );
  });
});
