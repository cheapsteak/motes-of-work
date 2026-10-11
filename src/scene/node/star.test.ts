import { describe, expect, it } from 'vitest';
import type { StarLook } from '../../galaxy/body';
import { hexToRgb } from './birth';
import { STAR_DOTS, STAR_LOOK } from './classLook';
import { starBreath, starDot, starSpike, starSpikeShare, starTint, starTopPx } from './star';

const SEEDS = Array.from({ length: 64 }, (_, s) => s);
/** A dot's own seed (its mote's seed, as bodyAttrs.ts gives every mote its own): star `s`'s dot `i`. */
const dotSeed = (s: number, i: number): number => s * 1000 + i;
const LOOKS: StarLook[] = [
  { brightness: 1, spikes: 6, temperature: 0, period: 5, phase: 0 },
  { brightness: 0.55, spikes: 4, temperature: 1, period: 4, phase: 0.3 },
  { brightness: 0.79, spikes: 4, temperature: 0.5, period: 9, phase: 0.9 },
  { brightness: 0.8, spikes: 6, temperature: 0.2, period: 7.5, phase: 0.6 },
];
const norm = (v: readonly number[]): number => Math.hypot(...v);

describe('a star’s dots (re-skin §4.3)', () => {
  it('core dots are a gaussian ball, halo dots lie between 0.6 R and 2.2 R', () => {
    let sq = 0;
    let n = 0;
    for (const seed of SEEDS) {
      for (let i = 0; i < STAR_DOTS.core; i++) {
        sq += norm(starDot(i, dotSeed(seed, i)).offset) ** 2;
        n++;
      }
      for (let i = STAR_DOTS.core; i < STAR_DOTS.core + STAR_DOTS.halo; i++) {
        const rho = norm(starDot(i, dotSeed(seed, i)).offset);
        expect(rho).toBeGreaterThanOrEqual(0.6 - 1e-12);
        expect(rho).toBeLessThanOrEqual(2.2 + 1e-12);
      }
    }
    const rms = Math.sqrt(sq / n);
    expect(rms).toBeGreaterThan(0.9 * 0.25 * Math.sqrt(3));
    expect(rms).toBeLessThan(1.1 * 0.25 * Math.sqrt(3));
  });

  it('every direction alike: the dots of many seeds average to the centre', () => {
    const sum = [0, 0, 0];
    let n = 0;
    for (const seed of SEEDS)
      for (let i = 0; i < STAR_DOTS.core + STAR_DOTS.halo; i++) {
        const o = starDot(i, dotSeed(seed, i)).offset;
        const r = norm(o);
        for (let k = 0; k < 3; k++) sum[k] += o[k] / r;
        n++;
      }
    for (let k = 0; k < 3; k++) expect(Math.abs(sum[k] / n)).toBeLessThan(0.03);
  });

  it('a dot’s gain falls as e^(−ρ/0.7)', () => {
    for (const seed of SEEDS.slice(0, 8))
      for (let i = 0; i < STAR_DOTS.core + STAR_DOTS.halo; i++) {
        const d = starDot(i, dotSeed(seed, i));
        expect(d.gain).toBeCloseTo(Math.exp(-norm(d.offset) / 0.7), 12);
      }
  });
});

/** A star's glow's unclamped size far off (a hood shot's, about 20-45 px) and close up (ly-1's centre star, 84). */
const FAR = 30;
const NEAR = 84;

describe('a star’s spikes', () => {
  it('spikes: an × of four or a star of six, longer when brighter', () => {
    const look = { brightness: 1, spikes: 6, temperature: 0, period: 5, phase: 0 } as const;
    const tip = starSpike(look, 1, 15, 18, FAR); // row 1 at 60°, the last dot at u = 15.5/16
    expect(Math.hypot(...tip.offPx)).toBeCloseTo(1.6 * 18 * (15.5 / 16), 6);
    expect(Math.atan2(tip.offPx[1], tip.offPx[0])).toBeCloseTo(Math.PI / 3, 9);
    expect(starSpike({ ...look, spikes: 4 }, 4, 0, 18, FAR).gain).toBe(0);
    expect(starSpike(look, 0, 0, 5, FAR).gain).toBe(0); // under 6 px of glow: a point
    // The four are an ×, at 45° off the axes.
    const x = starSpike({ ...look, spikes: 4 }, 0, 15, 18, FAR).offPx;
    expect(Math.atan2(x[1], x[0])).toBeCloseTo(Math.PI / 4, 9);
    // Dimmer is shorter, in proportion.
    const dim = starSpike({ ...look, brightness: 0.55 }, 1, 15, 18, NEAR);
    expect(Math.hypot(...dim.offPx)).toBeCloseTo(0.55 * Math.hypot(...tip.offPx), 9);
    // Each dot is half of (1 − u)^1.5 as bright (they hint, not shout), the spikes full from 12 px of glow.
    expect(starSpike(look, 2, 3, 12, FAR).gain).toBeCloseTo(0.5 * (1 - 3.5 / 16) ** 1.5, 12);
    expect(starSpike(look, 2, 3, 9, FAR).gain).toBeCloseTo(0.5 * 0.5 * (1 - 3.5 / 16) ** 1.5, 12);
  });

  it('only the brightest stars carry spikes, and any star the camera is close to', () => {
    const look = (brightness: number): StarLook => ({ brightness, spikes: brightness >= 0.8 ? 6 : 4, temperature: 0, period: 5, phase: 0 });
    // From STAR_LOOK.spikeFrom (0.85) a star shows all its spikes, wherever it is.
    expect(starSpikeShare(look(0.85), FAR)).toBe(1);
    expect(starSpike(look(0.9), 0, 3, 18, FAR).gain).toBeGreaterThan(0);
    // Below it, none far off ...
    expect(starSpikeShare(look(0.849), FAR)).toBe(0);
    expect(starSpikeShare(look(0.6), 59.9)).toBe(0);
    for (let row = 0; row < 6; row++) for (let dot = 0; dot < 16; dot++) expect(starSpike(look(0.6), row, dot, 18, FAR).gain).toBe(0);
    expect(starTopPx(look(0.6), 18, FAR)).toBe(9);
    // ... and all of them close up, by the glow's unclamped size over spikeNear (60 to 80 px).
    expect(starSpikeShare(look(0.6), 70)).toBeCloseTo(0.5, 12);
    expect(starSpikeShare(look(0.6), NEAR)).toBe(1);
    expect(starSpike(look(0.6), 0, 3, 18, NEAR).gain).toBeCloseTo(starSpike(look(0.6), 0, 3, 18, 1e9).gain, 12);
    expect(starTopPx(look(0.6), 18, NEAR)).toBeGreaterThan(9 - 1e-9);
    // On the essay's seed's brightness law (0.55-1, uniform), about one star in three shows its spikes far
    // off; spikeFrom is pinned so the essay's 30 give 7 (generate.test.ts holds that).
    expect(STAR_LOOK.spikeFrom).toBe(0.85);
  });

  it('no spike is vertical', () => {
    for (const look of LOOKS)
      for (let row = 0; row < STAR_DOTS.spikeRows; row++)
        for (let dot = 0; dot < STAR_DOTS.spikeDots; dot++)
          for (const glow of [4, 6, 9, 12, 18])
            for (const near of [FAR, NEAR]) {
              const s = starSpike(look, row, dot, glow, near);
              expect(Math.abs(s.offPx[1])).toBeLessThanOrEqual(Math.sin(Math.PI / 3) * Math.hypot(...s.offPx) + 1e-9);
            }
  });

  it('a star’s top is its glow’s half, or the highest drawn spike tip if that stands higher', () => {
    for (const look of LOOKS)
      for (const glow of [4, 6, 6.5, 9, 12, 18])
        for (const near of [FAR, 70, NEAR]) {
          let tip = 0;
          if (glow > STAR_LOOK.spikeLod[0] && starSpikeShare(look, near) > 0)
            for (let row = 0; row < look.spikes; row++) tip = Math.max(tip, Math.abs(starSpike(look, row, STAR_DOTS.spikeDots - 1, glow, near).offPx[1]));
          expect(starTopPx(look, glow, near)).toBeCloseTo(Math.max(glow / 2, tip), 12);
        }
    // A bright six's tips stand above its glow (0.866 × 1.6 × 18 × 15.5/16 against 9 px), a far star's do not.
    expect(starTopPx(LOOKS[0], 18, FAR)).toBeGreaterThan(9);
    expect(starTopPx(LOOKS[0], 5, FAR)).toBe(2.5);
  });
});

describe('a star’s breath and tint', () => {
  it('breathes between 0.88 and 1.12 with its period', () => {
    for (const look of LOOKS) {
      let [lo, hi] = [Infinity, -Infinity];
      for (let k = 0; k <= 400; k++) {
        const t = (k / 400) * look.period + 37;
        const b = starBreath(look, t);
        lo = Math.min(lo, b);
        hi = Math.max(hi, b);
        expect(starBreath(look, t + look.period)).toBeCloseTo(b, 9);
      }
      expect(lo).toBeCloseTo(0.88, 3);
      expect(hi).toBeCloseTo(1.12, 3);
    }
    expect(starBreath({ period: 4, phase: 0.25 }, 0)).toBeCloseTo(1.12, 12);
  });

  it('tints from #F4F7FF to #FFD9A0', () => {
    const [w, a] = [hexToRgb('#F4F7FF'), hexToRgb('#FFD9A0')];
    expect(starTint(0)).toEqual(w);
    starTint(1).forEach((v, k) => expect(v).toBeCloseTo(a[k], 12));
    for (const t of [0.1, 0.37, 0.5, 0.9]) starTint(t).forEach((v, k) => expect(v).toBeCloseTo(w[k] + t * (a[k] - w[k]), 12));
  });
});
