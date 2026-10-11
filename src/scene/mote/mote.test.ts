import { describe, expect, it } from 'vitest';
import { mechanisms } from '../../mechanisms';
import { applyToPoint, compose, fromAxisAngle, rotate, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { Mechanism } from '../../mechanisms/types';
import { defaultSceneState, type SceneState } from '../../timeline/sceneState';
import { buildMoteAttrs, MoteType, ROLE_INDEX, type MoteAttrs } from './attributes';
import { packPartTexture, partTransforms } from './partTransforms';
import moteGlsl from './mote.glsl?raw';
import { FLARE_GAIN, FLARE_WIDTH, mote, REFLOW_DELAY, REFLOW_LAST, SETTLE_WINDOW, SETTLED_BRIGHTNESS, spawnPoint } from './mote';
import { partGroups } from '../../mechanisms/bike/partGroups';

const mech = mechanisms.gears;
const points = mech.samplePoints(2000, 7);
const attrs = buildMoteAttrs(mech, points);

function state(patch: (s: SceneState) => void = () => {}): SceneState {
  const s = defaultSceneState();
  patch(s);
  return s;
}

const dist = (a: number[], b: number[]): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

describe('buildMoteAttrs', () => {
  it('produces one attr per point with role indices and in-range settle', () => {
    expect(attrs).toHaveLength(points.length);
    for (const a of attrs) {
      expect(a.settle).toBeGreaterThanOrEqual(0.05);
      expect(a.settle).toBeLessThan(0.97 + 1e-9);
      expect(a.role).toBe(ROLE_INDEX[mech.parts[a.part].role]);
    }
  });

  it('specced has both Human and Dialogue core motes and only Agent body motes', () => {
    const core = attrs.filter((a) => a.role === ROLE_INDEX.core);
    const body = attrs.filter((a) => a.role === ROLE_INDEX.body);
    expect(core.some((a) => a.type[0] === MoteType.Human)).toBe(true);
    expect(core.some((a) => a.type[0] === MoteType.Dialogue)).toBe(true);
    expect(body.every((a) => a.type[0] === MoteType.Agent)).toBe(true);
  });

  it('types about 80% of the specced core Human and the rest Dialogue, so the core reads amber', () => {
    // Task 9: at 55 / 45 the screen-mixed amber and violet read cream.
    const big = buildMoteAttrs(mech, mech.samplePoints(20000, 9)).filter((a) => a.role === ROLE_INDEX.core);
    const human = big.filter((a) => a.type[0] === MoteType.Human).length / big.length;
    const dialogue = big.filter((a) => a.type[0] === MoteType.Dialogue).length / big.length;
    expect(human).toBeCloseTo(0.8, 1);
    expect(human + dialogue).toBe(1);
  });

  it('settles every core mote inside [SETTLE_WINDOW, 0.32]: unsettled at assembly 0, settled by 0.32', () => {
    const core = attrs.filter((a) => a.role === ROLE_INDEX.core);
    expect(core.length).toBeGreaterThan(0);
    for (const a of core) {
      expect(a.settle).toBeGreaterThanOrEqual(SETTLE_WINDOW);
      expect(a.settle).toBeLessThanOrEqual(0.32);
    }
    const s0 = state((x) => {
      x.mech.assembly = 0;
    });
    const xf0 = partTransforms(mech, s0);
    for (const a of core) expect(mote(a, s0, xf0).settled).toBe(0);
  });

  it('vibed is all Agent', () => {
    expect(attrs.every((a) => a.type[1] === MoteType.Agent)).toBe(true);
  });
});

describe('settle constants', () => {
  it('settled motes keep half their flight glow, and settle over an assembly window of 0.08', () => {
    expect(SETTLED_BRIGHTNESS).toBe(0.5);
    expect(SETTLE_WINDOW).toBe(0.08);
  });

  it('a landing mote flares for 0.01 of assembly either side of its settle value, by three flight glows', () => {
    expect(FLARE_WIDTH).toBe(0.01);
    expect(FLARE_GAIN).toBe(3);
  });

  it('mote.glsl declares the same values as mote.ts', () => {
    const constant = (name: string) => Number(new RegExp(`const float ${name} = ([0-9.]+);`).exec(moteGlsl)?.[1]);
    expect(constant('MOTE_SETTLE_WINDOW')).toBe(SETTLE_WINDOW);
    expect(constant('MOTE_SETTLED_BRIGHTNESS')).toBe(SETTLED_BRIGHTNESS);
    expect(constant('MOTE_FLARE_WIDTH')).toBe(FLARE_WIDTH);
    expect(constant('MOTE_FLARE_GAIN')).toBe(FLARE_GAIN);
    expect(constant('MOTE_REFLOW_DELAY')).toBe(REFLOW_DELAY);
    expect(Number(/const int MOTE_REFLOW_LAST = (\d+);/.exec(moteGlsl)?.[1])).toBe(REFLOW_LAST);
  });
});

describe('the landing flare', () => {
  // A mote is brightest the instant it lands, and the flare is gone 0.01 of assembly either side:
  // landed, it is back to its settled glow; still in flight, to its flight glow.
  const at = (a: MoteAttrs, assembly: number): number => {
    const s = state((x) => {
      x.mech.assembly = assembly;
    });
    return mote(a, s, partTransforms(mech, s)).brightness;
  };
  const sample = attrs.filter((a) => a.settle > 0.2 && a.settle < 0.9).slice(0, 200);
  const flightGlow = (a: MoteAttrs, assembly: number): number => {
    const x = Math.min(1, Math.max(0, (assembly - (a.settle - SETTLE_WINDOW)) / SETTLE_WINDOW));
    const t = x * x * (3 - 2 * x);
    return 1 * (1 - t) + SETTLED_BRIGHTNESS * t;
  };

  it('is SETTLED_BRIGHTNESS + FLARE_GAIN at the instant a mote lands', () => {
    expect(sample.length).toBeGreaterThan(50);
    for (const a of sample) expect(at(a, a.settle)).toBeCloseTo(SETTLED_BRIGHTNESS + FLARE_GAIN, 12);
  });

  it('is gone FLARE_WIDTH after landing (settled glow) and FLARE_WIDTH before it (flight glow)', () => {
    for (const a of sample) {
      expect(at(a, a.settle + FLARE_WIDTH)).toBeCloseTo(SETTLED_BRIGHTNESS, 12);
      expect(at(a, a.settle - FLARE_WIDTH)).toBeCloseTo(flightGlow(a, a.settle - FLARE_WIDTH), 12);
      expect(at(a, a.settle - SETTLE_WINDOW)).toBe(1);
    }
  });

  it('rises toward landing and falls after it, the same either way of travel', () => {
    for (const a of sample.slice(0, 40)) {
      const d = FLARE_WIDTH / 4;
      expect(at(a, a.settle - d)).toBeGreaterThan(at(a, a.settle - 2 * d));
      expect(at(a, a.settle + d)).toBeGreaterThan(at(a, a.settle + 2 * d));
    }
  });
});

describe('mote()', () => {
  const xf1 = partTransforms(mech, state());

  it('at assembly 1, zero faults, variant 0, specced: rests at the posed local point', () => {
    const s = state();
    for (const a of attrs) {
      const out = mote(a, s, xf1);
      const want = applyToPoint(xf1[a.part], a.local);
      expect(dist(out.pos, want)).toBeLessThan(1e-9);
      expect(out.settled).toBe(1);
      expect(out.brightness).toBeCloseTo(SETTLED_BRIGHTNESS, 12);
    }
  });

  it('at assembly 0, every mote with settle >= the settle window sits at its spawn point', () => {
    const s = state((x) => {
      x.mech.assembly = 0;
    });
    const xf0 = partTransforms(mech, s);
    let checked = 0;
    for (const a of attrs) {
      if (a.settle < SETTLE_WINDOW) continue;
      const out = mote(a, s, xf0);
      expect(out.settled).toBe(0);
      expect(dist(out.pos, spawnPoint(a.seed))).toBeLessThan(1e-12);
      expect(out.brightness).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('variant 1 uses localTwin', () => {
    const s = state((x) => {
      x.mech.variant = 1;
    });
    const xf = partTransforms(mech, s);
    for (const a of attrs.slice(0, 200)) {
      const out = mote(a, s, xf);
      expect(dist(out.pos, applyToPoint(xf[a.part], a.localTwin))).toBeLessThan(1e-9);
    }
  });

  it('provenance.vibed = 1 makes every mote Agent; misallocated = 1 makes core Agent', () => {
    const sv = state((x) => {
      x.provenance.vibed = 1;
    });
    const sm = state((x) => {
      x.provenance.misallocated = 1;
    });
    for (const a of attrs) {
      expect(mote(a, sv, xf1).type).toBe(MoteType.Agent);
      if (a.role === ROLE_INDEX.core) expect(mote(a, sm, xf1).type).toBe(MoteType.Agent);
    }
  });

  it('specced output uses the specced type', () => {
    const s = state();
    for (const a of attrs) expect(mote(a, s, xf1).type).toBe(a.type[0]);
  });

  it('drift moves drift-role points about 4x as far as core points', () => {
    const s0 = state();
    const s1 = state((x) => {
      x.mech.faults.drift = 1;
    });
    const xf = partTransforms(mech, s1);
    const mean = (role: number): number => {
      const sel = attrs.filter((a) => a.role === role);
      let sum = 0;
      for (const a of sel) sum += dist(mote(a, s0, xf).pos, mote(a, s1, xf).pos);
      return sum / sel.length;
    };
    const driftMove = mean(ROLE_INDEX.drift);
    const coreMove = mean(ROLE_INDEX.core);
    expect(coreMove).toBeGreaterThan(0);
    expect(driftMove / coreMove).toBeGreaterThan(3.2);
    expect(driftMove / coreMove).toBeLessThan(4.8);
  });

  it('misallocated = 1 shows about half the core points', () => {
    const core = attrs.filter((a) => a.role === ROLE_INDEX.core);
    const s = state((x) => {
      x.provenance.misallocated = 1;
    });
    const shown = core.filter((a) => mote(a, s, xf1).visible).length / core.length;
    expect(shown).toBeGreaterThanOrEqual(0.45);
    expect(shown).toBeLessThanOrEqual(0.55);
  });

  it('misallocated = 1 shows the extras and specced hides them', () => {
    const sm = state((x) => {
      x.provenance.misallocated = 1;
    });
    const ss = state();
    const hiddenSpecced = attrs.filter((a) => !a.visible[0]);
    expect(hiddenSpecced.length).toBeGreaterThan(0);
    for (const a of hiddenSpecced) {
      expect(a.role).toBe(ROLE_INDEX.body);
      expect(mote(a, ss, xf1).visible).toBe(false);
      expect(mote(a, sm, xf1).visible).toBe(true);
    }
  });

  it('is deterministic and independent of call order', () => {
    const s = state((x) => {
      x.mech.assembly = 0.4;
      x.mech.drive = 0.3;
      x.mech.faults.drift = 0.6;
      x.provenance.vibed = 0.3;
      x.provenance.misallocated = 0.4;
    });
    const xf = partTransforms(mech, s);
    const first = attrs.map((a: MoteAttrs) => mote(a, s, xf));
    const reversed = [...attrs].reverse().map((a) => mote(a, s, xf)).reverse();
    expect(reversed).toEqual(first);
    expect(attrs.map((a) => mote(a, s, xf))).toEqual(first);
    expect(first.every((o) => o.pos.every(Number.isFinite))).toBe(true);
  });

  describe('normal', () => {
    const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
    const unit = (v: Vec3): Vec3 => [v[0] / len(v), v[1] / len(v), v[2] / len(v)];

    it('is the part-space normal turned by the part rotation, unit length', () => {
      const s = state((x) => {
        x.mech.drive = 0.31;
        x.mech.assembly = 0.6;
        x.mech.faults.misalign = 0.7;
      });
      const xf = partTransforms(mech, s);
      for (const a of attrs.slice(0, 300)) {
        const n = mote(a, s, xf).normal;
        expect(len(n)).toBeCloseTo(1, 12);
        expect(dist(n, unit(rotate(xf[a.part].quaternion, a.normal)))).toBeLessThan(1e-9);
      }
    });

    it('blends toward the twin normal with the variant', () => {
      const s = state((x) => {
        x.mech.variant = 0.4;
      });
      const xf = partTransforms(mech, s);
      for (const a of attrs.filter((b) => b.part === 2).slice(0, 100)) {
        const mixed: Vec3 = [0, 1, 2].map((k) => a.normal[k] * 0.6 + a.normalTwin[k] * 0.4) as Vec3;
        expect(dist(mote(a, s, xf).normal, unit(rotate(xf[a.part].quaternion, mixed)))).toBeLessThan(1e-9);
      }
    });

    it('falls back to the correct normal when the blend passes through zero (no NaN)', () => {
      const s = state((x) => {
        x.mech.variant = 0.5;
        x.mech.drive = 0.2;
      });
      const xf = partTransforms(mech, s);
      for (const a of attrs.slice(0, 100)) {
        const opposite: MoteAttrs = { ...a, normalTwin: [-a.normal[0], -a.normal[1], -a.normal[2]] };
        const n = mote(opposite, s, xf).normal;
        expect(n.every(Number.isFinite)).toBe(true);
        expect(dist(n, unit(rotate(xf[a.part].quaternion, a.normal)))).toBeLessThan(1e-9);
      }
    });
  });

  it('spawnPoint is within the shell and flattened in y', () => {
    for (const a of attrs.slice(0, 200)) {
      const p = spawnPoint(a.seed);
      const r = Math.hypot(p[0], p[1] / 0.6, p[2]);
      expect(r).toBeGreaterThanOrEqual(9 - 1e-9);
      expect(r).toBeLessThanOrEqual(12 + 1e-9);
    }
  });
});

describe('partTransforms / packPartTexture', () => {
  it('applies the exploded offset in world space after the pose', () => {
    const s = state((x) => {
      x.mech.assembly = 0;
    });
    const xf = partTransforms(mech, s);
    const pose = mech.pose(0, s.mech.faults, 0);
    mech.parts.forEach((p, i) => {
      for (let k = 0; k < 3; k++) {
        expect(xf[i].position[k]).toBeCloseTo(pose[i].position[k] + p.explodedOffset.position[k], 9);
      }
    });
  });

  it('moves and turns a part about its own posed position, never about the world origin', () => {
    const posed: PartTransform = { position: [2, 0, 0], quaternion: fromAxisAngle([0, 1, 0], 0.4) };
    const offset: PartTransform = { position: [1, 0, 0], quaternion: fromAxisAngle([0, 0, 1], Math.PI / 2) };
    const stub: Mechanism = {
      id: 'stub',
      parts: [{ id: 'p', role: 'core', explodedOffset: offset }],
      pose: () => [posed],
      samplePoints: () => [],
    };
    const at = (assembly: number): PartTransform => {
      const s = state((x) => {
        x.mech.assembly = assembly;
      });
      return partTransforms(stub, s)[0];
    };

    // Assembled: exactly the pose.
    expect(at(1).position).toEqual(posed.position);
    // Exploded: the part origin is the pose position plus the offset position. Rotating the pose
    // position about the world origin would put it at (1, 2, 0) instead.
    const exploded = at(0);
    expect(exploded.position[0]).toBeCloseTo(3, 12);
    expect(exploded.position[1]).toBeCloseTo(0, 12);
    expect(exploded.position[2]).toBeCloseTo(0, 12);
    // The rotation is the offset rotation applied on top of the pose rotation.
    const want = compose({ position: [0, 0, 0], quaternion: offset.quaternion }, { position: [0, 0, 0], quaternion: posed.quaternion });
    for (let k = 0; k < 4; k++) expect(exploded.quaternion[k]).toBeCloseTo(want.quaternion[k], 12);
    // Half way through the part's own window (a core part: from 0 to 0.32, eased): half the offset
    // translation and half the offset rotation, still about the posed position.
    const half = at(0.16);
    expect(half.position[0]).toBeCloseTo(2.5, 12);
    expect(half.position[1]).toBeCloseTo(0, 12);
    const halfWant = compose(
      { position: [0, 0, 0], quaternion: fromAxisAngle([0, 0, 1], Math.PI / 4) },
      { position: [0, 0, 0], quaternion: posed.quaternion },
    );
    for (let k = 0; k < 4; k++) expect(half.quaternion[k]).toBeCloseTo(halfWant.quaternion[k], 12);
  });

  it('packs 2 RGBA texels per part', () => {
    const xf = partTransforms(mech, state());
    const buf = packPartTexture(xf);
    expect(buf).toBeInstanceOf(Float32Array);
    expect(buf.length).toBe(mech.parts.length * 8);
    expect(buf[0]).toBeCloseTo(xf[0].quaternion[0], 6);
    expect(buf[3]).toBeCloseTo(xf[0].quaternion[3], 6);
    expect(buf[4]).toBeCloseTo(xf[0].position[0], 6);
    expect(buf[7]).toBe(0);
  });

  it('packs each part’s reflow group in its second texel’s fourth channel', () => {
    const bike = mechanisms.bike;
    const xf = partTransforms(bike, state());
    const groups = partGroups(bike);
    const buf = packPartTexture(xf, groups);
    groups.forEach((g, i) => expect(buf[i * 8 + 7], bike.parts[i].id).toBe(g));
    expect(new Set(groups)).toEqual(new Set([0, 1, 2, 3, 4, 5, 6, 7]));
    // Without groups, every part is the planet's.
    expect(Array.from({ length: bike.parts.length }, (_, i) => packPartTexture(xf)[i * 8 + 7])).toEqual(bike.parts.map(() => 0));
  });
});
