import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { galaxyBudget, generateGalaxy } from '../../galaxy/generate';
import { mechanisms } from '../../mechanisms';
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import { defaultSceneState, mergeState, SCENE_STATE_PATHS, setPath, type SceneState } from '../../timeline/sceneState';
import { packBodyData } from '../node/bodyData';
import { bodyWorld } from '../node/orbit';
import { GALAXY_INCLUDE_MARKER, withGalaxyLibrary } from '../node/shaderSource';
import { buildMoteAttrs } from './attributes';
import {
  groupCounts,
  mote,
  moteBodyRest,
  REFLOW_DELAY,
  REFLOW_LAST,
  REFLOW_MOON_DENSITY,
  reflowBodies,
  reflowKeep,
  type ReflowHome,
} from './mote';
import { PART_GROUP, partGroups } from '../../mechanisms/bike/partGroups';
import { partTransforms } from './partTransforms';
import { moteLibraryGlsl } from './shaderSource';
import moteGlsl from './mote.glsl?raw';

// The reflow (docs/specs/2026-10-07-galaxy-orbits.md §14.3; the Act II galaxy plan's test 1): Act
// II's bike motes leave the bike for the bike's planet, N0, and its seven moons, a part's motes for
// the body of its group, wherever the galaxy has those bodies at the frame's ambient. With
// `mech.reflow` 0 it must not touch a single bit of any Act I frame.

const bike = mechanisms.bike;
const attrs = buildMoteAttrs(bike, bike.samplePoints(3000, 3));

const ACT_I = ['vibe-build', 'reveal', 'rewind', 'spec'];
const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);

const galaxy = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(galaxy);
/** Where the reflow carries the bike's motes at ambient `t`. */
const homeAt = (t: number, mech = bike, motes = attrs): ReflowHome => {
  const bodies = reflowBodies(galaxy, data, t);
  const groups = partGroups(mech);
  return {
    bodies,
    groups,
    keep: reflowKeep(
      bodies,
      groupCounts(
        groups,
        motes.filter((a) => a.visible[0]),
      ),
    ),
  };
};
const home = homeAt(AMBIENT_POSE);

/** Every leaf rounded to 1e-9, so a state does not hang on the last bit of the section spans. */
function rounded(s: SceneState): SceneState {
  const r = (v: number) => Math.round(v * 1e9) / 1e9;
  for (const [path, kind] of Object.entries(SCENE_STATE_PATHS)) {
    const v = path.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)[k], s) as number | number[];
    setPath(s, path, kind === 'vec3' ? ((v as number[]).map(r) as [number, number, number]) : r(v as number));
  }
  return s;
}

/** Act I's golden states: every section at 21 locals, as the keyframes have them. */
const golden = ACT_I.flatMap((id) => {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return Array.from({ length: 21 }, (_, i) => rounded(sampler.sample(span.start + (i / 20) * (span.end - span.start))));
});

/** FNV-1a over the float64 bytes of every output of mote() for every mote at every state. */
function fingerprint(states: SceneState[], h?: ReflowHome): string {
  const values: number[] = [];
  for (const s of states) {
    const xf = partTransforms(bike, s);
    for (const a of attrs) {
      const o = mote(a, s, xf, h);
      values.push(...o.pos, ...o.normal, o.brightness, o.settled, o.type, o.visible ? 1 : 0);
    }
  }
  const bytes = new Uint8Array(new Float64Array(values).buffer);
  let hash = 0x811c9dc5;
  for (const b of bytes) hash = Math.imul(hash ^ b, 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

describe('the reflow at 0 (test 1: identity)', () => {
  it('leaves mote() byte-identical on the golden states of every Act I section', () => {
    // Measured: 1.6 s on CI, 1.7 s alone, 10.3 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 60 s is over 5 times the loaded time.
    // Computed from mote() as it was before the reflow existed, over the same states and motes.
    expect(golden).toHaveLength(84);
    expect(fingerprint(golden)).toBe('7bd9b743');
    // ...and a home given changes nothing while the reflow is 0.
    expect(fingerprint(golden, home)).toBe('7bd9b743');
  }, 60_000);

  it('is not vacuous: the least reflow changes the fingerprint', () => {
    // Measured: 1.5 s on CI, 1.8 s alone, 11.0 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 60 s is over 5 times the loaded time.
    const nudged = golden.map((s) => mergeState(s, { mech: { reflow: 1e-6 } }));
    expect(fingerprint(nudged, home)).not.toBe(fingerprint(golden));
  }, 60_000);

  it('needs its home only once it runs', () => {
    const s = mergeState(defaultSceneState(), { mech: { reflow: 0.5 } });
    expect(() => mote(attrs[0], s, partTransforms(bike, s))).toThrow(/home/);
  });
});

// ---- The bodies: where a mote lands at reflow 1 ----

const dist = (a: readonly number[], b: readonly number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const reflowed = (patch: unknown, h: ReflowHome = home, mech = bike, set = attrs) => {
  const s = mergeState(defaultSceneState(), patch);
  const xf = partTransforms(mech, s);
  return set.map((a) => mote(a, s, xf, h));
};

describe('the part groups (galaxy §14.3)', () => {
  it('are the spec’s table: the frame, the ground and the bolts the planet, then the wheels, the steering, the drive, the saddle, the basket and the fittings', () => {
    expect(PART_GROUP).toEqual({
      frame: 0,
      ground: 0,
      'loose-bolts': 0,
      'front-wheel': 1,
      'rear-wheel': 2,
      fork: 3,
      handlebars: 3,
      cranks: 4,
      'pedal-left': 4,
      'pedal-right': 4,
      saddle: 5,
      basket: 6,
      'mudguard-front': 7,
      'mudguard-rear': 7,
      'brake-front': 7,
      'brake-rear': 7,
    });
    expect(REFLOW_LAST).toBe(PART_GROUP.basket);
    // The chain's links ride with the drivetrain; every part of the bike has a group.
    const groups = partGroups(bike);
    bike.parts.forEach((p, i) => {
      if (p.id.startsWith('chain-')) expect(groups[i], p.id).toBe(4);
      else expect(groups[i], p.id).toBe(PART_GROUP[p.id]);
    });
    expect(partGroups(mechanisms.gears).every((g) => g === 0)).toBe(true);
  });

  it('reflowBodies holds N0 at the origin and each moon of N0 where the galaxy has it, with its radius', () => {
    for (const t of [0, AMBIENT_POSE, 311]) {
      const bodies = reflowBodies(galaxy, data, t);
      expect(bodies).toHaveLength(8);
      const n0 = galaxy.bodies[galaxy.ids.N0];
      expect(bodies[0]).toEqual([0, 0, 0, n0.R]);
      for (let k = 1; k < 8; k++) {
        const m = galaxy.bodies.find((b) => b.host === n0.index && b.partGroup === k)!;
        expect(bodies[k]).toEqual([...bodyWorld(data, m.index, t), m.R]);
      }
    }
    // The moons go round: their places differ between two ambients.
    expect(dist(reflowBodies(galaxy, data, 0)[1], reflowBodies(galaxy, data, 3)[1])).toBeGreaterThan(0.01);
  });
});

describe('the reflow at 1 (test 1: the target)', () => {
  it.each([
    ['riding, at the pose', { mech: { reflow: 1, drive: 1.9 } }, AMBIENT_POSE],
    ['at rest, at ambient 0', { mech: { reflow: 1, drive: 0 } }, 0],
    ['drifting, the wrong twin, at 311 s', { mech: { reflow: 1, drive: 0.7, variant: 1, faults: { drift: 1 } } }, 311],
  ])('puts every bike mote on its group’s sphere, with its radial normal (%s)', (_name, patch, t) => {
    const h = homeAt(t);
    reflowed(patch, h).forEach((o, i) => {
      const [cx, cy, cz, R] = h.bodies[h.groups[attrs[i].part]];
      const c: Vec3 = [cx, cy, cz];
      expect(Math.abs(dist(o.pos, c) - R), `${bike.parts[attrs[i].part].id}`).toBeLessThanOrEqual(1e-6);
      const radial = [0, 1, 2].map((k) => (o.pos[k] - c[k]) / R);
      expect(dist(o.normal, radial)).toBeLessThanOrEqual(1e-6);
      expect(o.settled).toBe(1);
    });
  });

  it('lands each mote on the same point whatever the machine is doing', () => {
    const a = reflowed({ mech: { reflow: 1, drive: 1.9 } });
    const b = reflowed({
      mech: {
        reflow: 1,
        drive: 0.2,
        variant: 0.6,
        faults: { drift: 0.8, misalign: 0.5 },
      },
    });
    a.forEach((o, i) => expect(o.pos).toEqual(b[i].pos));
  });

  it('spreads a body’s motes evenly over its sphere, by the seed alone (no lattice)', () => {
    const many = buildMoteAttrs(bike, bike.samplePoints(20000, 5));
    const dirs = many.map((a) => moteBodyRest(a.seed));
    for (const n of dirs) expect(Math.hypot(...n)).toBeCloseTo(1, 12);
    // Uniform on the sphere: each axis's mean near 0, and each axis's |component| uniform (mean 1/2).
    for (let k = 0; k < 3; k++) {
      expect(Math.abs(dirs.reduce((s, n) => s + n[k], 0) / dirs.length)).toBeLessThan(0.02);
      expect(dirs.reduce((s, n) => s + Math.abs(n[k]), 0) / dirs.length).toBeCloseTo(0.5, 1);
    }
    // No two seeds share a point.
    expect(new Set(dirs.map((n) => n.join())).size).toBe(new Set(many.map((a) => a.seed)).size);
  });

  it('carries each group onto its own body: the frame’s motes make the planet, each part’s its moon', () => {
    const out = reflowed({ mech: { reflow: 1, drive: 1.9 } });
    const groups = partGroups(bike);
    for (let k = 0; k < 8; k++) {
      const on = out.filter((_, i) => groups[attrs[i].part] === k);
      expect(on.length, `group ${k}`).toBeGreaterThan(0);
      const [x, y, z, R] = home.bodies[k];
      for (const o of on) expect(Math.abs(dist(o.pos, [x, y, z]) - R)).toBeLessThanOrEqual(1e-6);
    }
  });

  it.each(Object.keys(mechanisms))('lands every %s mote on its group’s body too: the target is the seed and the part alone', (id) => {
    const mech = mechanisms[id as keyof typeof mechanisms];
    const set = buildMoteAttrs(mech, mech.samplePoints(500, 2));
    const h = homeAt(AMBIENT_POSE, mech);
    reflowed({ mech: { reflow: 1, drive: 1.3 } }, h, mech, set).forEach((o, i) => {
      const [x, y, z, R] = h.bodies[h.groups[set[i].part]];
      expect(Math.abs(dist(o.pos, [x, y, z]) - R)).toBeLessThanOrEqual(1e-6);
    });
  });
});

describe('the basket lands last', () => {
  const basket = (i: number) => partGroups(bike)[attrs[i].part] === REFLOW_LAST;
  const off = (o: { pos: Vec3 }, i: number) => {
    const [x, y, z, R] = home.bodies[home.groups[attrs[i].part]];
    return Math.abs(dist(o.pos, [x, y, z]) - R);
  };

  it('every other part has landed when the basket’s motes are still on their way', () => {
    const at = reflowed({ mech: { reflow: 1 - REFLOW_DELAY, drive: 1.9 } });
    let flying = 0;
    at.forEach((o, i) => {
      if (basket(i)) {
        if (off(o, i) > 1e-4) flying++;
      } else {
        expect(off(o, i)).toBeLessThanOrEqual(1e-6);
      }
    });
    const baskets = attrs.filter((_, i) => basket(i)).length;
    expect(baskets).toBeGreaterThan(20);
    expect(flying).toBe(baskets);
  });

  it('the basket has not set out when every other part is already moving', () => {
    const still = reflowed({ mech: { reflow: 0, drive: 1.9 } }, home);
    const early = reflowed({ mech: { reflow: REFLOW_DELAY, drive: 1.9 } });
    early.forEach((o, i) => {
      if (basket(i)) expect(o.pos).toEqual(still[i].pos);
      else expect(dist(o.pos, still[i].pos)).toBeGreaterThan(0);
    });
  });
});

describe('the reflow between', () => {
  it('moves every mote continuously from the bike to its body', () => {
    const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((r) => reflowed({ mech: { reflow: r, drive: 1.6 } }));
    for (let k = 1; k < steps.length; k++) {
      steps[k].forEach((o, i) => {
        expect(dist(o.pos, steps[k - 1][i].pos)).toBeLessThan(2.5);
        expect(Math.hypot(...o.normal)).toBeCloseTo(1, 9);
      });
    }
  });

  it('puffs outward on the way: half way along, the cloud stands off the straight line from bike to body', () => {
    // er = 1 - (1 - r_g)^3 is 0.5 where r_g = 1 - cbrt(0.5), the bow (0.8 outward at its control point) widest.
    const rg = 1 - Math.cbrt(0.5);
    const r = rg * (1 - REFLOW_DELAY);
    const [from, mid, to] = [0, r, 1].map((x) => reflowed({ mech: { reflow: x, drive: 1.9 } }));
    let out = 0;
    let n = 0;
    mid.forEach((o, i) => {
      if (partGroups(bike)[attrs[i].part] === REFLOW_LAST) return;
      const straight = [0, 1, 2].map((k) => 0.5 * from[i].pos[k] + 0.5 * to[i].pos[k]);
      out += Math.hypot(...o.pos) - Math.hypot(...straight);
      n++;
    });
    // The outward term alone puts it 2 x 0.5 x 0.5 x 0.8 = 0.4 further out; the sideways term averages out.
    expect(out / n).toBeGreaterThan(0.3);
  });
});

describe('a moon lands no brighter or denser than the planet (fix round 1, ruling B)', () => {
  const groups = partGroups(bike);
  const counts = groupCounts(
    groups,
    attrs.filter((a) => a.visible[0]),
  );
  const landed = (s: SceneState) => attrs.filter((a) => a.visible[0]).map((a) => ({ a, o: mote(a, s, partTransforms(bike, s), home) }));
  const at = (reflow: number): SceneState => ({ ...defaultSceneState(), mech: { ...defaultSceneState().mech, assembly: 1, reflow } });

  it('keeps, of each moon’s landed motes, REFLOW_MOON_DENSITY of the planet’s density on its sphere', () => {
    const lit = new Array<number>(8).fill(0);
    for (const { a, o } of landed(at(1))) if (o.brightness > 0) lit[groups[a.part]]++;
    const density = (g: number) => lit[g] / home.bodies[g][3] ** 2;
    expect(lit[0]).toBe(counts[0]);
    for (let g = 1; g < 8; g++) {
      // Without the keep a moon stands about nine times as dense as the planet (the whiteout).
      expect(counts[g] / home.bodies[g][3] ** 2, `group ${g} unkept`).toBeGreaterThan(5 * density(0));
      // Kept by hash: within three binomial deviations of its share.
      const [n, k] = [counts[g], home.keep[g]];
      expect(Math.abs(lit[g] - n * k), `group ${g}`).toBeLessThanOrEqual(3 * Math.sqrt(n * k * (1 - k)) + 1);
    }
    expect(home.keep[0]).toBe(1);
    // The share itself is exactly the density ratio.
    for (let g = 1; g < 8; g++)
      expect((home.keep[g] * counts[g]) / home.bodies[g][3] ** 2).toBeCloseTo(
        (REFLOW_MOON_DENSITY * counts[0]) / home.bodies[0][3] ** 2,
        6,
      );
    expect(REFLOW_MOON_DENSITY).toBeLessThan(1);
  });

  it('dims each dropped mote as it lands, so nothing pops: brightness continuous in the reflow, and only the dropped go dark', () => {
    const steps = Array.from({ length: 41 }, (_, i) => i / 40);
    const runs = steps.map((r) => landed(at(r)));
    for (let k = 0; k < runs[0].length; k += 7) {
      for (let i = 1; i < steps.length; i++) {
        expect(Math.abs(runs[i][k].o.brightness - runs[i - 1][k].o.brightness), `mote ${k} at ${steps[i]}`).toBeLessThan(0.2);
      }
      const end = runs[steps.length - 1][k];
      const g = groups[end.a.part];
      expect(end.o.brightness === 0, `mote ${k}`).toBe(hash01(end.a.seed, SALT.bodyKeep) >= home.keep[g]);
    }
  }, 60_000);
});

describe('one source for both mirrors (test 1: the shader)', () => {
  it('declares uReflow, uBodies[8] and moteBodyRest in mote.glsl, with the two body salts', () => {
    expect(moteGlsl).toMatch(/uniform float [^;]*\buReflow\b/);
    expect(moteGlsl).toContain('uniform vec4 uBodies[8];');
    expect(moteGlsl).toMatch(/vec3 moteBodyRest\(uint seed\)/);
    for (const salt of ['SALT_BODY_Z', 'SALT_BODY_AZIMUTH', 'SALT_BODY_KEEP']) expect(moteGlsl).toContain(salt);
    expect(moteGlsl).toContain('uniform float uReflowKeep[8];');
    expect(moteGlsl).not.toMatch(/STACK|moteStack/);
    // The group is the part texture's fourth channel.
    expect(moteGlsl).toMatch(/int g = int\(round\(pg\.w\)\);/);
  });

  it('shares no uniform name with the galaxy’s libraries: uBodies beside uBodyTex and uStreamTex, each declared once', () => {
    const lib = withGalaxyLibrary(GALAXY_INCLUDE_MARKER);
    const names = [...lib.matchAll(/^\s*uniform\s+(?:(?:highp|mediump|lowp)\s+)?\w+\s+([^;]+);/gm)].flatMap((m) =>
      m[1].split(',').map((n) => n.trim().replace(/\[.*\]$/, '')),
    );
    expect(names).toContain('uBodies');
    expect(names).toContain('uBodyTex');
    expect(names).toContain('uStreamTex');
    expect(names.length).toBe(new Set(names).size);
    // The mote library goes in once: the galaxy's shaders take it with the orbit library, never twice.
    expect(lib.split(moteLibraryGlsl()).length).toBe(2);
  });
});
