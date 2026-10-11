import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { portraitRig } from '../scene/cameraRig';
import {
  ARM_PHASE,
  BG,
  BG_RECIPE,
  GALAXY_WIDE,
  HALO_MARGIN,
  HALO_PX,
  POP,
  TIER_SCREEN,
  armAngleAt,
  galaxyTier,
  galaxyWidePxPerUnit,
  hoodGlowPx,
  generateBackground,
  pullToHood,
  type Background,
  type BgRecipe,
  type Tier,
} from './background';
import { galaxyBudget, generateGalaxy } from './generate';

const TIERS: Tier[] = ['phone', 'desktop'];

const points = (a: Float32Array): [number, number, number, number][] => {
  const out: [number, number, number, number][] = [];
  for (let i = 0; i < a.length; i += 4) out.push([a[i], a[i + 1], a[i + 2], a[i + 3]]);
  return out;
};
const allStars = (bg: Background) => [...points(bg.stars), ...points(bg.bright)];
/** Every star with its population, in the order of `allStars`. */
const tagged = (bg: Background) =>
  allStars(bg).map((p, i) => ({ p, pop: i < bg.stars.length / 4 ? bg.pop.stars[i] : bg.pop.bright[i - bg.stars.length / 4] }));
/** FNV-1a 32 over the arrays' float32 bytes, in order, as 8 hex digits. */
const fnv = (...arrays: Float32Array[]): string => {
  let h = 0x811c9dc5;
  for (const a of arrays) {
    for (const byte of new Uint8Array(a.buffer, a.byteOffset, a.byteLength)) h = Math.imul(h ^ byte, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};
const wrap = (a: number): number => {
  const w = a - 2 * Math.PI * Math.floor((a + Math.PI) / (2 * Math.PI));
  return w <= -Math.PI ? w + 2 * Math.PI : w;
};

/**
 * The galaxy wide on a tier's probe screen (§14.5's fr-1: bearing 0, elevation 86, distance 640,
 * fov 40, aimed at the core), reframed for portrait as the app does: a point's position in CSS px.
 */
function wideProjector(tier: Tier): (p: readonly number[]) => [number, number] {
  const [w, h] = TIER_SCREEN[tier];
  const el = (GALAXY_WIDE.elevation * Math.PI) / 180;
  // A landscape screen stands at the wide's landscape distance (Task 1d), as galaxyWideView and the essay's camera do.
  const d = w < h ? GALAXY_WIDE.distance : GALAXY_WIDE.landscapeDistance;
  const rig = portraitRig({ pos: [0, d * Math.sin(el), d * Math.cos(el)], target: [0, 0, 0], fov: GALAXY_WIDE.fov }, w / h);
  const f = rig.target.map((t, k) => t - rig.pos[k]);
  const fl = Math.hypot(...f);
  const fw = f.map((x) => x / fl);
  const rl = Math.hypot(fw[2], fw[0]);
  const rt = [-fw[2] / rl, 0, fw[0] / rl]; // forward × up
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];
  const focal = h / (2 * Math.tan((rig.fov * Math.PI) / 360));
  return (p) => {
    const v = [p[0] - rig.pos[0], p[1] - rig.pos[1], p[2] - rig.pos[2]];
    const z = v[0] * fw[0] + v[1] * fw[1] + v[2] * fw[2];
    return [(focal * (v[0] * rt[0] + v[1] * rt[1] + v[2] * rt[2])) / z, (focal * (v[0] * up[0] + v[1] * up[1] + v[2] * up[2])) / z];
  };
}

/**
 * The neighbourhood's half of galaxy §4's halos-apart rule: the share of background stars whose halo
 * (half its sprite's cap) is apart, on screen at the galaxy wide, from every neighbourhood star's
 * (half its glow). A star is taken at `place(p)`: its own place, or its place in the disc (y 0).
 */
function hoodApart(stars: { p: readonly number[]; px: number }[], hood: readonly (readonly number[])[], tier: Tier, place: (p: readonly number[]) => readonly number[]): boolean[] {
  const project = wideProjector(tier);
  const others = hood.map((p) => [...project(p), hoodGlowPx(tier, p)]);
  return stars.map(({ p, px }) => {
    const s = project(place(p));
    return others.every((o) => Math.max(px, o[2]) / 2 < Math.hypot(s[0] - o[0], s[1] - o[1]) / 2);
  });
}

// ---- The tuner's measures (shape-notes §9–§11), against the arms' own spiral ----

const SIN_I = Math.sin(Math.atan(BG.pitch));
/** One yardstick for every preset (shape-notes §9): RECOMMENDED's arm σ, 3 at the centre to 9 at the radius. */
const yardstick = (r: number): number => 3 + (6 * r) / 220;
/** A point's signed distance from the nearer arm's crest across the arm (positive outward, downstream): the phase from it × r sin i. */
const crossArm = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  return (-wrap(BG.arms * (Math.atan2(z, x) - armAngleAt(r, ARM_PHASE, 0))) / BG.arms) * r * SIN_I;
};
/** Counts by 0.5-yardstick bins of the cross-arm distance, of the stars between radii `lo` and `hi`, out to ±`reach` yardsticks. */
function crossArmBins(bgs: Background[], lo: number, hi: number, reach: number): Map<number, number> {
  const bins = new Map<number, number>();
  for (const bg of bgs)
    for (const [x, , z] of allStars(bg)) {
      const r = Math.hypot(x, z);
      if (r < lo || r > hi) continue;
      const u = crossArm(x, z) / yardstick(r);
      if (Math.abs(u) >= reach) continue;
      const k = Math.floor(u / 0.5);
      bins.set(k, (bins.get(k) ?? 0) + 1);
    }
  return bins;
}

describe('background', () => {
  // The neighbourhood the essay hands the background: seed 1's systems' spots, a binary's barycentre
  // for its pair (the same on both tiers).
  const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const spots = g.units.map((i) => g.bodies[i].spot!);
  const cache = new Map<string, Background>();
  /** The background of `seed` on `tier` about the neighbourhood, generated once. */
  const bgOf = (seed: number, tier: Tier): Background => {
    const key = `${seed} ${tier}`;
    if (!cache.has(key)) cache.set(key, generateBackground(seed, tier, spots));
    return cache.get(key)!;
  };
  const SIX = [1, 2, 3, 4, 5, 6];

  it('picks the phone tier when the shorter side is under 600 CSS px', () => {
    expect(galaxyTier(390, 844)).toBe('phone');
    expect(galaxyTier(844, 390)).toBe('phone');
    expect(galaxyTier(1440, 900)).toBe('desktop');
    expect(galaxyTier(600, 600)).toBe('desktop');
    expect(galaxyTier(599, 2000)).toBe('phone');
  });

  it("is the tuner's Wisps (reviewed), bit for bit", () => {
    // FNV-1a 32 over stars, bright, dust and all three, measured on 2026-10-10 from the committed tuner
    // (scratch/session/galaxytuner/gen.js, WISPS_REVIEWED, bgArmMod 22, seed 1, its hood.txt). A
    // re-tune of BG_RECIPE re-pins these from gen.js at the same values. Re-pinned by Task 1d (the wider
    // neighbourhood moves the spots the halos keep off, and the desktop's wide stands at 953, which
    // shrinks the halos it keeps apart there; the dust reads neither): before it, phone
    // '0c5057f0', '2c8e498b', '411bb106', 'a4abea91' and desktop 'd70a1b1b', '9736792a', '820ba3bf', 'be7af0c6'.
    // Re-pinned by Task 1e (its one binary on seed 1: 29 units' spots, the pair's at its barycentre,
    // measured from gen.js with the new hood.txt): before it, phone 'cc711f0c', 'ef5f9050', '411bb106',
    // '4c3f3db2' and desktop '461869cf', '6d205268', '820ba3bf', '272bff14'.
    const [p, d] = [bgOf(1, 'phone'), bgOf(1, 'desktop')];
    expect([fnv(p.stars), fnv(p.bright), fnv(p.dust), fnv(p.stars, p.bright, p.dust)]).toEqual(['4e6eece8', 'ef5f9050', '411bb106', 'bf687566']);
    expect([fnv(d.stars), fnv(d.bright), fnv(d.dust), fnv(d.stars, d.bright, d.dust)]).toEqual(['6bd16e42', '6fb4d33f', '820ba3bf', 'dec3aca2']);
    expect([p.stars.length / 4, p.bright.length / 4, p.dust.length / 4]).toEqual([2040, 360, 4000]);
    expect([d.stars.length / 4, d.bright.length / 4, d.dust.length / 4]).toEqual([3400, 600, 8000]);
    // pitch 0.28, as the background had it before RECOMMENDED: arm 0 through the neighbourhood's middle.
    expect(p.armPhase).toBeCloseTo(1.033370295303131, 12);
    expect(p.armPhase).toBe(ARM_PHASE);
    expect([p.knots.length, d.knots.length]).toEqual([24, 24]);
  });

  it('draws the populations by index range', () => {
    // The bulge is coreShare 0.10 of the stars, young youngShare 0.40, knots clumpShare 0.12, old the rest.
    const want = { phone: [240, 912, 960, 288], desktop: [400, 1520, 1600, 480] };
    for (const tier of TIERS) {
      const stars = tagged(bgOf(1, tier));
      const count = (pop: number) => stars.filter((s) => s.pop === pop).length;
      expect([count(POP.bulge), count(POP.old), count(POP.young), count(POP.knot)], tier).toEqual(want[tier]);
      // A bulge star stays within half the radius; the bulge is warm or blue, the young and the knots never warm.
      for (const { p, pop } of stars) {
        if (pop === POP.bulge) expect(Math.hypot(p[0], p[1], p[2])).toBeLessThanOrEqual(0.5 * BG.radius);
        if (pop === POP.young || pop === POP.knot) expect(p[3], tier).toBeGreaterThan(0);
      }
    }
  });

  it('the arms emerge without an edge', () => {
    // Measured: 1.3 s on CI, 1.8 s alone, 8.7 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is over 3 times the loaded time.
    // shape-notes §9's cliff: stars at r 120–200, in 0.5σ bins of the cross-arm distance (σ the
    // yardstick, 3 + 6r/220), out to ±8σ (the farthest that every radius in the band reaches before
    // the next arm), among bins at 2 % of the peak or more: the largest step between neighbours is
    // under ×2. Pooled over seeds 1–6, measured ×1.56 on the phone and ×1.64 on the desktop (seeds
    // 1–24: ×1.61 and ×1.64; the tuner's ×1.58 on the phone). RECOMMENDED measured ×5.44.
    for (const tier of TIERS) {
      const bins = crossArmBins(
        SIX.map((s) => bgOf(s, tier)),
        120,
        200,
        8,
      );
      const peak = Math.max(...bins.values());
      const keys = [...bins.keys()].sort((a, b) => a - b);
      let worst = 1;
      for (let k = keys[0]; k < keys[keys.length - 1]; k++) {
        const [a, b] = [bins.get(k) ?? 0, bins.get(k + 1) ?? 0];
        if (a >= 0.02 * peak && b >= 0.02 * peak) worst = Math.max(worst, Math.max(a, b) / Math.min(a, b));
      }
      expect(keys.length, tier).toBeGreaterThanOrEqual(30);
      expect(worst, tier).toBeLessThan(2);
    }
  }, 30_000);

  it('keeps about half the old disc between the arms', () => {
    // shape-notes §11's inter-arm measure: of the old stars at r 80–160, the share farther than one old
    // half width (0.15 r) from the nearer crest. Pooled over seeds 1–6: measured 0.547 on the phone and
    // 0.529 on the desktop (seeds 1–24: 0.530 and 0.527; the tuner's 0.527; seed 1 alone 0.619 and
    // 0.550, so a single seed is not held). RECOMMENDED: 0.111.
    for (const tier of TIERS) {
      let between = 0;
      let all = 0;
      for (const seed of SIX)
        for (const { p, pop } of tagged(bgOf(seed, tier))) {
          const r = Math.hypot(p[0], p[2]);
          if (pop !== POP.old || r < 80 || r > 160) continue;
          all++;
          if (Math.abs(crossArm(p[0], p[2])) > 0.15 * r) between++;
        }
      expect(between / all, tier).toBeGreaterThanOrEqual(0.4);
      expect(between / all, tier).toBeLessThanOrEqual(0.6);
    }
  });

  it('varies along the arm', () => {
    // shape-notes §10's along-crest measure: stars within 0.06 r of each arm's crest at r 80–200, in
    // bins of 0.04 in ln r per arm, each over its centred 9-bin running mean; the CV of those ratios,
    // with the Poisson share (the mean of 1 / the running mean) taken out in quadrature. Pooled over
    // phone seeds 1–6: 0.311 (seeds 1–24, each seed's averaged: 0.277; the tuner's 0.29). The floor is
    // 0.6 of the pooled measure. RECOMMENDED: 0.00, an arm uniform along its length.
    const ratios: number[] = [];
    const poisson: number[] = [];
    for (const seed of SIX) {
      const stars = allStars(bgOf(seed, 'phone'));
      for (const arm of [0, 1]) {
        const lo = Math.log(80);
        const n = Math.ceil((Math.log(200) - lo) / 0.04);
        const counts = new Array<number>(n).fill(0);
        for (const [x, , z] of stars) {
          const r = Math.hypot(x, z);
          if (r < 80 || r >= 200) continue;
          const phase = wrap(Math.atan2(z, x) - armAngleAt(r, ARM_PHASE, arm));
          if (Math.abs(phase) > Math.PI / 2 || Math.abs(phase * r * SIN_I) >= 0.06 * r) continue;
          counts[Math.min(n - 1, Math.floor((Math.log(r) - lo) / 0.04))]++;
        }
        for (let k = 4; k < n - 4; k++) {
          const mean = counts.slice(k - 4, k + 5).reduce((a, b) => a + b, 0) / 9;
          if (mean <= 0) continue;
          ratios.push(counts[k] / mean);
          poisson.push(1 / mean);
        }
      }
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const cv = Math.sqrt(ratios.reduce((a, b) => a + (b - mean) ** 2, 0) / ratios.length) / mean;
    const shot = poisson.reduce((a, b) => a + b, 0) / poisson.length;
    expect(Math.sqrt(Math.max(0, cv * cv - shot))).toBeGreaterThanOrEqual(0.6 * 0.311);
  });

  it('the crest passes through the neighbourhood', () => {
    // The cross-arm peak of the stars at r 50–80 (0.5σ bins), against armAngleAt's crest, which the
    // 30 spots are laid along: within [−0.5σ, +1.5σ]. Measured, seed 1: the [+0.5σ, +1σ) bin on both
    // tiers (the tuner's +1.0σ, 4.8 units downstream: the beads and feathers sit downstream).
    for (const tier of TIERS) {
      const bins = crossArmBins([bgOf(1, tier)], 50, 80, 10);
      const [peak] = [...bins.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
      const centre = (peak + 0.5) * 0.5;
      expect(centre, tier).toBeGreaterThanOrEqual(-0.5);
      expect(centre, tier).toBeLessThanOrEqual(1.5);
    }
  });

  it('warms toward the centre', () => {
    // The old disc and the bulge are warm with a share running from warmCore 0.97 at the centre to
    // oldWarm 0.5 at the rim, by √(r / R); the young stars and the knots are blue. Measured, seed 1:
    // phone 0.749 inside r 40 and 0.181 outside r 150 (4.1×), desktop 0.761 and 0.188 (4.0×). (RECOMMENDED
    // was 0.594 / 0.124: oldWarm 0.5 leaves the outer old disc half amber, shape-notes §11 item 10.)
    for (const tier of TIERS) {
      const stars = allStars(bgOf(1, tier));
      const share = (keep: (r: number) => boolean) => {
        const in_ = stars.filter((p) => keep(Math.hypot(p[0], p[2])));
        return in_.filter((p) => p[3] < 0).length / in_.length;
      };
      const inside = share((r) => r < 40);
      const outside = share((r) => r > 150);
      expect(inside, tier).toBeGreaterThanOrEqual(0.55);
      expect(outside, tier).toBeLessThanOrEqual(0.25);
      expect(inside, tier).toBeGreaterThanOrEqual(3 * outside);
    }
  });

  it('keeps every point in range', () => {
    // Measured: 0.8 s on CI, 1.1 s alone, 6.9 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is over 4 times the loaded time.
    // Stars and dust inside the radius (measured, seed 1: stars to r 213.8 phone, 214.6 desktop; dust
    // 215.6 and 216.2: the disc fades out by discFadeEnd 1), none within coreExclusion 16 of the
    // centre; star brightness brightFloor 0.30 to 1 (oldDim 0 leaves the floor where it is); dust
    // dustFloor 0.12 to 0.12 + dustRange 0.2.
    for (const tier of TIERS) {
      const bg = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP)).background;
      for (const [x, y, z, b] of allStars(bg)) {
        expect([x, y, z].every(Number.isFinite)).toBe(true);
        expect(Math.hypot(x, z)).toBeLessThanOrEqual(BG.radius);
        expect(Math.hypot(x, y, z)).toBeGreaterThanOrEqual(BG.coreExclusion);
        expect(Math.abs(b)).toBeGreaterThanOrEqual(Math.fround(BG.brightFloor));
        expect(Math.abs(b)).toBeLessThanOrEqual(1);
      }
      for (const [x, y, z, b] of points(bg.dust)) {
        expect([x, y, z].every(Number.isFinite)).toBe(true);
        expect(Math.hypot(x, z)).toBeLessThanOrEqual(BG.radius);
        expect(Math.hypot(x, y, z)).toBeGreaterThanOrEqual(BG.coreExclusion);
        expect(b).toBeGreaterThanOrEqual(Math.fround(BG.dustFloor));
        expect(b).toBeLessThanOrEqual(Math.fround(BG.dustFloor + BG.dustRange));
      }
    }
  }, 30_000);

  it('draws the tier counts, deterministically', () => {
    // Measured: 0.9 s on CI, 1.3 s alone, 6.4 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is over 4 times the loaded time.
    for (const tier of TIERS) {
      const bg = generateBackground(1, tier, []);
      expect((bg.stars.length + bg.bright.length) / 4).toBe(BG.stars[tier]);
      expect(bg.dust.length / 4).toBe(BG.dust[tier]);
      expect(bg.bright.length / 4).toBe(Math.round(BG.brightShare * BG.stars[tier]));
      expect([bg.pop.stars.length, bg.pop.bright.length]).toEqual([bg.stars.length / 4, bg.bright.length / 4]);
      const again = generateBackground(1, tier, []);
      expect(again.stars).toEqual(bg.stars);
      expect(again.bright).toEqual(bg.bright);
      expect(again.dust).toEqual(bg.dust);
      expect(again.pop).toEqual(bg.pop);
      const other = generateBackground(2, tier, []);
      expect(other.stars).not.toEqual(bg.stars);
      expect(other.dust).not.toEqual(bg.dust);
    }
  }, 30_000);

  it('gives the brightest 15 % to the bright set', () => {
    for (const tier of TIERS) {
      const bg = generateBackground(5, tier, []);
      const dim = points(bg.stars).map((p) => Math.abs(p[3]));
      const bright = points(bg.bright).map((p) => Math.abs(p[3]));
      expect(Math.min(...bright)).toBeGreaterThanOrEqual(Math.max(...dim));
    }
  });

  it('measures the galaxy wide as the camera does', () => {
    // The scale the generator keeps the neighbourhood's halos clear by is the projection's at the core.
    for (const tier of TIERS) {
      const project = wideProjector(tier);
      const a = project([0, 0, 0]);
      const b = project([1, 0, 0]);
      expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(galaxyWidePxPerUnit(...TIER_SCREEN[tier]), 2);
    }
    expect(galaxyWidePxPerUnit(390, 844)).toBeCloseTo(0.94, 2);
    // 1.30 at the wide's landscape distance, 953 (Task 1d; 1.93 at 640 before it).
    expect(galaxyWidePxPerUnit(1440, 900)).toBeCloseTo(1.3, 2);
    // A neighbourhood star's glow there: at its 5 px floor on the phone, 5.8 px on the desktop (8.7 at 640, before Task 1d).
    expect(hoodGlowPx('phone', [0, 0, 0])).toBe(5);
    expect(hoodGlowPx('desktop', [0, 0, 0])).toBeCloseTo((5 * 0.9 * 1236.4) / GALAXY_WIDE.landscapeDistance, 1);
  });

  it("keeps the background's halos off the neighbourhood's, in the disc plane", () => {
    // The half of galaxy §4's halos-apart rule that stays: no background halo touches a neighbourhood
    // star's at the galaxy wide, each background star taken at its place in the disc (its x and z, y 0),
    // as the generator keeps them clear (nearHood). On screen at their own height the disc's stars
    // (|y| ≤ starY, 91 % of them) keep it too: the closest stands 1.07 (phone) and 1.06 (desktop) of
    // the gap it needs. The bulge stands up to |y| 45 (phone) and 48 (desktop) out of the disc, and a
    // bulge star far above or below a spot can project inside its halo: one does on the desktop, 0.27
    // of the gap from the spot (under RECOMMENDED 5 a tier did: the closest 3.9 px of 5 on the phone,
    // 5.0 of 8.6 on the desktop). So the stars off the disc are held in the plane only.
    for (const tier of TIERS) {
      const gt = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
      const hood = gt.units.map((i) => gt.bodies[i].spot!);
      const stars = [...points(gt.background.stars).map((p) => ({ p, px: HALO_PX.star })), ...points(gt.background.bright).map((p) => ({ p, px: HALO_PX.bright }))];
      expect(hoodApart(stars, hood, tier, (p) => [p[0], 0, p[2]]).every(Boolean), tier).toBe(true);
      const disc = stars.filter(({ p }) => Math.abs(p[1]) <= BG.starY);
      expect(disc.length, tier).toBeGreaterThan(0.85 * stars.length);
      expect(hoodApart(disc, hood, tier, (p) => p).every(Boolean), tier).toBe(true);
    }
  });

  it('turns its arms as armAngleAt says: wrapped into (−π, π], arm 1 half a turn from arm 0', () => {
    for (const r of [2, 20, 65, 140, 219]) {
      const a0 = armAngleAt(r, ARM_PHASE, 0);
      const a1 = armAngleAt(r, ARM_PHASE, 1);
      for (const a of [a0, a1]) {
        expect(a).toBeGreaterThan(-Math.PI);
        expect(a).toBeLessThanOrEqual(Math.PI);
      }
      expect(Math.abs(wrap(a1 - a0 - Math.PI))).toBeLessThan(1e-12);
      expect(Math.abs(wrap(a0 - (Math.log(r / 2) / BG.pitch + ARM_PHASE)))).toBeLessThan(1e-12);
    }
    // Arm 0 passes the neighbourhood's middle (radius 65, bearing 0.9).
    expect(armAngleAt(65, ARM_PHASE, 0)).toBeCloseTo(0.9, 12);
    // A turn of the phase is no turn at all.
    expect(Math.abs(wrap(armAngleAt(100, ARM_PHASE + 2 * Math.PI, 0) - armAngleAt(100, ARM_PHASE, 0)))).toBeLessThan(1e-12);
  });

  it('types the recipe as the port reads it: an unknown key or an unported mode fails the typecheck', () => {
    // The checks are the two @ts-expect-error lines (tsc fails if either line typechecks); at run time
    // they are plain objects.
    // @ts-expect-error an unknown key: the port does not read it
    const unknownKey = { ...BG_RECIPE, sigmaRim: 12 } satisfies BgRecipe;
    // @ts-expect-error an unported mode: a switch of mode is a port, not a re-tune
    const otherMode = { ...BG_RECIPE, shape: 'arms' } satisfies BgRecipe;
    expect([unknownKey.shape, otherMode.shape]).toEqual(['wisps', 'arms']);
  });
});

describe('pullToHood', () => {
  const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const spots = g.units.map((i) => g.bodies[i].spot!);
  const of = { phone: generateBackground(1, 'phone', spots), desktop: generateBackground(1, 'desktop', spots) };

  it('pulls the nearest star onto each spot', () => {
    // Measured, seed 1: phone mean 7.18, least 5.59, most 16.94 (3 of the 29 bright); desktop 5.60,
    // 4.74, 8.43 (1 bright). One per unit: a binary's far star on its barycentre. Re-pinned by Task
    // 1e (one pair, 29 spots): before it, phone 7.11, 5.59, 16.94 (3 of 30); desktop 5.58, 4.74,
    // 8.43 (1). Before Task 1d, phone 6.66, 5.65, 10.52 (2); desktop 5.49, 4.73, 8.53 (4).
    const want = { phone: [7.18, 5.59, 16.94, 3], desktop: [5.6, 4.74, 8.43, 1] };
    for (const tier of TIERS) {
      const bg = of[tier];
      const pull = pullToHood(bg, spots);
      expect(pullToHood(bg, spots), tier).toEqual(pull);
      expect(pull.pulled.map((p) => p.spot)).toEqual(spots.map((_, k) => k));
      // 30 distinct rows; each the nearest in x–z not yet taken, the dim set before the bright, a tie to the earlier row.
      expect(new Set(pull.pulled.map((p) => `${p.set} ${p.row}`)).size).toBe(spots.length);
      const taken = new Set<string>();
      for (const p of pull.pulled) {
        const [x, , z] = spots[p.spot];
        let best = { key: '', d: Infinity };
        for (const set of ['stars', 'bright'] as const)
          points(bg[set]).forEach((q, row) => {
            const d = Math.hypot(q[0] - x, q[2] - z);
            if (!taken.has(`${set} ${row}`) && d < best.d) best = { key: `${set} ${row}`, d };
          });
        expect(`${p.set} ${p.row}`, `${tier} spot ${p.spot}`).toBe(best.key);
        expect(p.distance).toBe(best.d);
        taken.add(best.key);
      }
      // Each far row stands at its spot in the disc (x, 0, z), with the pulled row's own signed brightness,
      // in the far set of its own class, in spot order.
      const far = { stars: points(pull.farStars), bright: points(pull.farBright) };
      const next = { stars: 0, bright: 0 };
      for (const p of pull.pulled) {
        const [x, , z] = spots[p.spot];
        expect(far[p.set][next[p.set]++]).toEqual([Math.fround(x), 0, Math.fround(z), bg[p.set][4 * p.row + 3]]);
      }
      expect([next.stars, next.bright]).toEqual([far.stars.length, far.bright.length]);
      // The rows move: the counts are the generator's, and every row not pulled is byte-equal and in order.
      expect((pull.stars.length + pull.farStars.length) / 4).toBe(bg.stars.length / 4);
      expect((pull.bright.length + pull.farBright.length) / 4).toBe(bg.bright.length / 4);
      for (const set of ['stars', 'bright'] as const) {
        const kept = points(bg[set]).filter((_, row) => !pull.pulled.some((p) => p.set === set && p.row === row));
        expect(points(pull[set]), `${tier} ${set}`).toEqual(kept);
      }
      // How far they moved; and each is the star just outside its spot's clearance (nearHood's gap).
      const ds = pull.pulled.map((p) => p.distance);
      const [mean, least, most, bright] = want[tier];
      expect(ds.reduce((a, b) => a + b, 0) / ds.length, tier).toBeCloseTo(mean, 2);
      expect(Math.min(...ds), tier).toBeCloseTo(least, 2);
      expect(Math.max(...ds), tier).toBeCloseTo(most, 2);
      expect(far.bright.length, tier).toBe(bright);
      const ppu = galaxyWidePxPerUnit(...TIER_SCREEN[tier]);
      for (const p of pull.pulled) expect(p.distance, `${tier} spot ${p.spot}`).toBeGreaterThanOrEqual((hoodGlowPx(tier, spots[p.spot]) / ppu) * HALO_MARGIN);
    }
  });

  it('never pulls one star twice: spots on the same place take the nearest and the next nearest', () => {
    // The 30 spots stand at least 24 apart and, measured, each takes its own nearest star (none
    // competes; Task 1d: before it they stood 14 apart and pulled under 11); three spots at one place must.
    const bg = of.phone;
    const spot = spots[0];
    const pull = pullToHood(bg, [spot, spot, spot]);
    const ranked = (['stars', 'bright'] as const)
      .flatMap((set) => points(bg[set]).map((q, row) => ({ key: `${set} ${row}`, d: Math.hypot(q[0] - spot[0], q[2] - spot[2]) })))
      .sort((a, b) => a.d - b.d);
    expect(pull.pulled.map((p) => `${p.set} ${p.row}`)).toEqual(ranked.slice(0, 3).map((r) => r.key));
    expect((pull.stars.length + pull.bright.length + pull.farStars.length + pull.farBright.length) / 4).toBe(BG.stars.phone);
  });
});
