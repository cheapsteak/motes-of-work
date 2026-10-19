import { describe, expect, it } from 'vitest';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { HOLE_DOTS } from '../../galaxy/hole';
import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import { AMBIENT_WRAP } from '../ambientClock';
import { holeLibraryGlsl, withHoleLibrary } from '../node/shaderSource';
import holeGlsl from './hole.glsl?raw';
import {
  diskDot,
  diskPlace,
  holeDoppler,
  holeDotPx,
  holeLens,
  holeLives,
  holeOmega,
  holeTemp,
  infallDot,
  infallPlace,
  jetDot,
  jetPlace,
  jetRho,
  knotDot,
  knotInterval,
  knotPlace,
  ringDot,
  strandDot,
  strandJoin,
  strandPlace,
  strandWindow,
  streakLife,
  type HoleDot,
  type HoleView,
} from './hole';
import { buildHoleAttrs, DISK_STRIDE, PART_STRIDE } from './holeAttrs';
import {
  diskLife,
  HOLE_CONSTANTS,
  HOLE_DISK,
  HOLE_EMBER,
  HOLE_HOUR,
  HOLE_JET,
  HOLE_LENS,
  HOLE_LOOK,
  HOLE_MOCK_DOTS,
  HOLE_STRAND,
  holeComp,
  holeSeed,
  holeSmallGain,
  STRANDS,
} from './holeLook';

const HV: Vec3 = [0, 0, -75];
const A = buildHoleAttrs(1);
const M = HOLE_DISK.motion;
const L = HOLE_LOOK.jetLength;
const TAU = 2 * Math.PI;

/** The inspector's camera: elevation `el` degrees at `dist`, looking at the hole, the hole's frame turned `yaw` about +y. */
function view(t: number, el = 16, dist = 75, yaw = 0.7): HoleView {
  const e = (el * Math.PI) / 180;
  const camW: Vec3 = [0, dist * Math.sin(e), dist * Math.cos(e)];
  const zc = camW.map((x) => x / dist) as Vec3;
  const xc: Vec3 = [1, 0, 0];
  const yc: Vec3 = [zc[1] * xc[2] - zc[2] * xc[1], zc[2] * xc[0] - zc[0] * xc[2], zc[0] * xc[1] - zc[1] * xc[0]];
  const [c, s] = [Math.cos(yaw), Math.sin(yaw)];
  // hole frame -> world: about +y by yaw; world -> view: rows xc, yc, zc.
  const ry = (p: Vec3): Vec3 => [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
  const cols = [ry([1, 0, 0]), ry([0, 1, 0]), ry([0, 0, 1])];
  const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const viewRot = cols.flatMap((col) => [dot(xc, col), dot(yc, col), dot(zc, col)]);
  const cam: Vec3 = [c * camW[0] - s * camW[2], camW[1], s * camW[0] + c * camW[2]];
  return { t, cam, viewRot, hv: [0, 0, -dist], gain: 1 };
}

const finite = (d: HoleDot): boolean => [...d.view, ...d.rgb, d.alpha, d.sizeCss, d.ok].every(Number.isFinite);
const angleDiff = (a: number, b: number): number => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const diskCount = A.disk.length / DISK_STRIDE;

describe('the lens', () => {
  it('a point in front, off the shadow, barely moves', () => {
    const r = holeLens([6, 0, -73], HV, 0); // rel (6, 0, +2), d -2
    expect(Math.abs(r.pos[0] - 6)).toBeLessThan(0.05);
    expect(r.ok).toBe(1);
  });

  it('a point just behind the shadow is captured', () => expect(holeLens([0.2, 0, -76], HV, 0).ok).toBe(0)); // d 1, b' 1.29 < 2.6

  it('a point in front of the shadow piles onto its rim', () => {
    const r = holeLens([0.5, 0, -72], HV, 0); // d -3
    expect(Math.hypot(r.pos[0], r.pos[1])).toBeCloseTo(2.63, 3);
    expect(r.ok).toBeCloseTo(0.22, 3);
  });

  it('the underside image exists only from depth 0.4, hugging the rim', () => {
    expect(holeLens([3, 1, -75.3], HV, 1).ok).toBe(0); // d 0.3
    for (const [x, y, d] of [
      [3, 1, 0.5],
      [6, -2, 4],
      [0.4, 0.2, 9],
      [11, 3, 2],
    ]) {
      const r = holeLens([x, y, -75 - d], HV, 1);
      expect(r.ok, `${x} ${y} ${d}`).toBeGreaterThan(0);
      const rad = Math.hypot(r.pos[0], r.pos[1]);
      expect(rad).toBeGreaterThan(HOLE_LENS.bCrit);
      expect(rad).toBeLessThan(HOLE_LENS.bCrit + 0.6);
      // Mirrored: on the far side of the centre from the point.
      expect(r.pos[0] * x + r.pos[1] * y).toBeLessThan(0);
    }
  });

  it('a point on the axis is finite', () => {
    for (const image of [0, 1] as const)
      for (const z of [-60, -75, -90]) {
        const r = holeLens([0, 0, z], HV, image);
        expect([...r.pos, r.ok].every(Number.isFinite), `${image} ${z}`).toBe(true);
      }
  });

  it("draws nothing past the inspector's view edge, and everything short of it", () => {
    // The inspector's softplus overflowed float32 past 10 x = ln(FLT_MAX): its view stops at b' = 11.47.
    expect(HOLE_LENS.bCrit + Math.log(3.4028234663852886e38) / HOLE_LENS.softness).toBeCloseTo(HOLE_LENS.edge, 2);
    expect(holeLens([11.3, 0, -73], HV, 0).ok).toBeGreaterThan(0.9);
    expect(holeLens([11.6, 0, -73], HV, 0).ok).toBe(0);
  });
});

describe('the colours', () => {
  it('the approaching side is brighter and bluer', () => {
    const p: Vec3 = [6, 0, 0];
    const beta = Math.sqrt(HOLE_DISK.beta / 6);
    const towards = holeDoppler(p, [0, 0, 1], beta, [0, 0, 75]);
    const away = holeDoppler(p, [0, 0, -1], beta, [0, 0, 75]);
    expect(towards.g).toBeGreaterThan(1);
    expect(towards.gain).toBeGreaterThan(away.gain);
    const blue = holeTemp(towards.g, 0);
    expect(blue[2]).toBeGreaterThan(blue[0]);
    const warm = holeTemp(away.g, 0);
    expect(warm[0]).toBeGreaterThan(warm[2]);
  });
});

describe('the disk', () => {
  it('the disk turns at 3.1 r^-1.5, half-sheared within a streak', () => {
    expect(holeOmega(1)).toBe(3.1);
    let streaks = 0;
    let haze = 0;
    for (let i = 0; i < diskCount; i += 7) {
      const t = 200 + (i % 50);
      const dt = 0.25;
      const a = diskPlace(A.disk, i, t);
      const b = diskPlace(A.disk, i, t + dt);
      if (a.n !== b.n) continue; // a life boundary between
      if (a.k >= 0) {
        const s = streakLife(a.k, A.disk[i * DISK_STRIDE + 5], a.index);
        const wC = holeOmega(s.rc);
        expect(angleDiff(b.centre, a.centre)).toBeCloseTo(wC * dt, 9);
        expect(angleDiff(b.phi, a.phi)).toBeCloseTo(wC * dt + M.shear * (holeOmega(a.r) - wC) * dt, 9);
        streaks++;
      } else {
        expect(angleDiff(b.phi, a.phi)).toBeCloseTo(holeOmega(a.r) * dt, 9);
        haze++;
      }
    }
    expect(streaks).toBeGreaterThan(1000);
    expect(haze).toBeGreaterThan(500);
    // Nothing lit inside 2.7 or past 12.5.
    const v = view(101);
    for (let i = 0; i < diskCount; i++) {
      const p = diskPlace(A.disk, i, 101);
      if (p.r <= HOLE_DISK.rise[0] || p.r >= HOLE_DISK.fade[1]) expect(diskDot(A.disk, i, v, 0).alpha).toBe(0);
    }
    // Measured: 0.14 s alone, 0.20 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 25.0 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('each streak lives 3600/N and fades in and out', () => {
    for (const rb of [2.75, 3.4, 5, 7.7, 12]) {
      const { lives, life, offset } = diskLife(3, rb);
      expect(Number.isInteger(lives) && lives >= 1).toBe(true);
      expect(Math.abs(lives * life - 3600)).toBeLessThan(1e-9);
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThan(life);
      // N_k = max(1, round(3600 / L_t)), L_t = lifeMul lenMean / (|dω/dr| Δr) / max(shear, 0.15).
      const lenMean = 0.9 * (1 + rb / 12);
      const lt = (M.lifeMul * lenMean) / (1.5 * 3.1 * rb ** -2.5 * (0.4 + 0.325 * lenMean)) / Math.max(M.shear, 0.15);
      expect(lives).toBe(Math.max(1, Math.round(3600 / lt)));
    }
    // The envelope: 0 at birth and death, 1 on [0.18, 0.72] of the life.
    const i = [...Array(diskCount).keys()].find((j) => A.disk[j * DISK_STRIDE + 8] >= 0)!;
    const k = A.disk[i * DISK_STRIDE + 8];
    const rb = A.disk[i * DISK_STRIDE + 5];
    const { life, offset } = diskLife(k, rb);
    const at = (x: number) => diskPlace(A.disk, i, 5 * life - offset + x * life).env;
    expect(at(0)).toBeCloseTo(0, 9);
    expect(at(0.999999)).toBeLessThan(1e-9);
    for (const x of [0.18, 0.3, 0.5, 0.72]) expect(at(x)).toBeCloseTo(1, 9);
    expect(at(0.09)).toBeGreaterThan(0.2);
    expect(at(0.09)).toBeLessThan(0.8);
    expect(at(0.86)).toBeGreaterThan(0.2);
    expect(at(0.86)).toBeLessThan(0.8);
    // Per life the radius, angle, length, brightness, pitch and hot flag change, and repeat at n + N_k
    // (the clock's index wraps: the life an hour on has the same index).
    const lives = A.disk[i * DISK_STRIDE + 7];
    const seen = new Set<string>();
    for (let n = 0; n < Math.min(lives, 40); n++) {
      const s = streakLife(k, rb, n);
      const at = 5 * life - offset + (n + 0.5) * life;
      expect(diskPlace(A.disk, i, at).index).toBe(diskPlace(A.disk, i, at + 3600).index);
      seen.add(JSON.stringify([s.rc, s.angle, s.len, s.bright, s.pitch]));
    }
    expect(seen.size).toBe(Math.min(lives, 40));
    let hot = 0;
    for (let n = 0; n < 2000; n++) hot += streakLife(n, 6, n).hot;
    expect(hot).toBeGreaterThan(0);
  });

  it('the streaks stay coherent all hour', () => {
    // Mean resultant length of each live streak's dots about its centre, averaged by base radius class.
    const measure = (t: number): number[] => {
      const byStreak = new Map<number, { rb: number; re: number; im: number; n: number }>();
      for (let i = 0; i < diskCount; i++) {
        const p = diskPlace(A.disk, i, t);
        if (p.k < 0 || p.env <= 0.05) continue;
        const s = byStreak.get(p.k) ?? {
          rb: A.disk[i * DISK_STRIDE + 5],
          re: 0,
          im: 0,
          n: 0,
        };
        s.re += Math.cos(p.phi - p.centre);
        s.im += Math.sin(p.phi - p.centre);
        s.n++;
        byStreak.set(p.k, s);
      }
      const classes: number[][] = [[], [], []];
      for (const s of byStreak.values()) if (s.n >= 2) classes[s.rb < 4 ? 0 : s.rb < 7 ? 1 : 2].push(Math.hypot(s.re, s.im) / s.n);
      return classes.map((c) => c.reduce((x, y) => x + y, 0) / c.length);
    };
    const t0 = measure(0);
    const rows: string[] = [];
    for (const t of [0, 120, 600, 3599]) {
      const m = measure(t);
      rows.push(`${t}: ${m.map((x) => x.toFixed(3)).join(' / ')}`);
      m.forEach((x, c) => {
        expect(x, `t ${t} class ${c}`).toBeGreaterThanOrEqual(0.7);
        expect(x, `t ${t} class ${c}`).toBeGreaterThanOrEqual(0.9 * t0[c]);
      });
    }
    console.info(`coherence (r < 4 / 4-7 / 7-12): ${rows.join('; ')}`);
    // Measured: 0.10 s alone, 0.18 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 27.8 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('the disk is continuous across the hour', () => {
    const v0 = view(0);
    const step = (a: HoleDot, b: HoleDot) => Math.hypot(a.view[0] - b.view[0], a.view[1] - b.view[1], a.view[2] - b.view[2]);
    // The grid's last step is [3599.9, 3600]: the wrap adds no step of its own.
    const grid = Array.from({ length: 24 }, (_, j) => 3599.9 - 150 * j);
    let worst = 0;
    for (let i = 0; i < diskCount; i++)
      for (const image of [0, 1] as const) {
        const at0 = diskDot(A.disk, i, v0, image);
        const at3600 = diskDot(A.disk, i, { ...v0, t: 3600 }, image);
        expect(step(at0, at3600), `${i} ${image}`).toBeLessThan(1e-9);
        expect(Math.abs(at0.alpha - at3600.alpha)).toBeLessThan(1e-9);
        const wrap = step(diskDot(A.disk, i, { ...v0, t: 3599.9 }, image), at0);
        let largest = 0;
        for (const t of grid)
          largest = Math.max(largest, step(diskDot(A.disk, i, { ...v0, t }, image), diskDot(A.disk, i, { ...v0, t: t + 0.1 }, image)));
        expect(wrap, `${i} ${image}`).toBeLessThanOrEqual(largest + 1e-6);
        worst = Math.max(worst, step(at0, at3600));
      }
    console.info(`the hour: max |diskDot(3600) - diskDot(0)| over every dot and both images = ${worst.toExponential(2)}`);
    // Measured: 3.96 s alone, 9.11 s at load 8.6 (8 busy loops, 1 worker), 4.94 s on CI
    // (run 38264919221). 30 s is 3.3 times the loaded time and 6 times CI's.
  }, 30_000);

  it("keeps the reference's mix", () => {
    const rows: string[] = [];
    for (const t of [0, AMBIENT_POSE, 600, 3599]) {
      let streak = 0;
      let haze = 0;
      const bins = [0, 0, 0, 0];
      for (let i = 0; i < diskCount; i++) {
        const p = diskPlace(A.disk, i, t);
        if (p.k >= 0) streak += p.bright;
        else haze += p.bright;
        const edges = [2.75, 4, 7, 10, 12.5];
        for (let b = 0; b < 4; b++) if (p.r >= edges[b] && (p.r < edges[b + 1] || (b === 3 && p.r === 12.5))) bins[b]++;
      }
      const share = streak / (streak + haze);
      rows.push(`${t.toFixed(1)}: ${share.toFixed(3)} [${bins.map((b) => (b / diskCount).toFixed(3)).join(', ')}]`);
      expect(Math.abs(share - 0.74), `t ${t}`).toBeLessThanOrEqual(0.03);
      [0.277, 0.319, 0.245, 0.158].forEach((ref, b) => expect(Math.abs(bins[b] / diskCount - ref), `t ${t} bin ${b}`).toBeLessThanOrEqual(0.02));
    }
    console.info(`the mix (streak share [r bins]): ${rows.join('; ')}`);
    // Measured: 0.06 s alone, 0.23 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 21.7 times the loaded time and over 16 times CI's.
  }, 5_000);

  it('hot spots are 2 % of lives, bright, short and larger', () => {
    let hot = 0;
    let n = 0;
    for (let k = 0; k < 200; k++)
      for (let life = 0; life < 100; life++) {
        const s = streakLife(k, 6, life);
        hot += s.hot;
        n++;
        // Against the life's own draws: ×2.6 brightness and ×0.3 length when hot.
        const seed = holeSeed(k, life);
        const bright = 0.35 + 0.65 * hash01(seed, SALT.diskLifeBright);
        const len = (0.25 + 1.3 * hash01(seed, SALT.diskLifeLen)) * (1 + s.rc / 12);
        expect(s.bright).toBeCloseTo(bright * (s.hot ? 2.6 : 1), 12);
        expect(s.len).toBeCloseTo(len * (s.hot ? 0.3 : 1), 12);
      }
    expect(Math.abs(hot / n - 0.02)).toBeLessThanOrEqual(0.005);
    // A dot in a hot life is +0.6 px, a dot in a cold one +0.
    let hotDots = 0;
    for (let i = 0; i < diskCount; i += 3) {
      const p = diskPlace(A.disk, i, AMBIENT_POSE);
      expect(p.sizeAdd).toBe(p.hot ? 0.6 : 0);
      hotDots += p.hot;
    }
    expect(hotDots).toBeGreaterThan(0);
  });

  it('the underside arc lags by 1.9 s', () => {
    expect(M.arcDelay).toBe(1.9);
    for (let i = 0; i < HOLE_DOTS.arch; i += 13)
      for (const t of [0.4, 101, 2000]) {
        const lagged = diskPlace(A.disk, i, t, M.arcDelay);
        const earlier = diskPlace(A.disk, i, t - M.arcDelay < 0 ? t - M.arcDelay + 3600 : t - M.arcDelay);
        expect(lagged.r).toBeCloseTo(earlier.r, 9);
        expect(Math.abs(angleDiff(lagged.phi, earlier.phi))).toBeLessThan(1e-9);
        expect(lagged.bright).toBeCloseTo(earlier.bright, 9);
      }
    // And diskDot draws image 1 from that lagged place, through the lens's image 1.
    const v = view(101);
    let shown = 0;
    for (let i = 0; i < HOLE_DOTS.arch; i++) {
      const d = diskDot(A.disk, i, v, 1);
      const p = diskPlace(A.disk, i, 101, M.arcDelay);
      const local: Vec3 = [p.r * Math.cos(p.phi), p.h, p.r * Math.sin(p.phi)];
      const pv = [0, 1, 2].map((r) => v.hv[r] + v.viewRot[r] * local[0] + v.viewRot[3 + r] * local[1] + v.viewRot[6 + r] * local[2]) as Vec3;
      const lensed = holeLens(pv, v.hv, 1);
      for (let c = 0; c < 3; c++) expect(d.view[c]).toBeCloseTo(lensed.pos[c], 9);
      if (d.alpha > 0) shown++;
    }
    expect(shown).toBeGreaterThan(0);
  });
});

describe('the jets and the knots', () => {
  it('the jets widen as 0.35 s^0.65 and fade at both ends', () => {
    expect(jetRho(1)).toBeCloseTo(0.35, 12);
    expect(jetRho(8)).toBeCloseTo(0.35 * 8 ** 0.65, 12);
    const v = view(AMBIENT_POSE);
    let lit = 0;
    for (let i = 0; i < A.jets.length / PART_STRIDE; i++) {
      const { p, s } = jetPlace(A.jets, i, AMBIENT_POSE);
      const rad = A.jets[i * PART_STRIDE + 2];
      const side = A.jets[i * PART_STRIDE + 3];
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(L);
      expect(Math.hypot(p[0], p[2])).toBeCloseTo(jetRho(s) * rad, 9);
      expect(p[1]).toBeCloseTo(side * (HOLE_JET.base + s), 9);
      const d = jetDot(A.jets, i, v);
      if (s < 0.01 || s > L - 0.01) expect(d.alpha, `s ${s}`).toBeLessThan(1e-3);
      if (d.alpha > 0) lit++;
    }
    expect(lit).toBeGreaterThan(1000);
    // The sheath: 55 % of the dots at 0.75-1.05 of the cone.
    let sheath = 0;
    for (let i = 0; i < A.jets.length / PART_STRIDE; i++) if (A.jets[i * PART_STRIDE + 2] >= 0.75) sheath++;
    expect(sheath / (A.jets.length / PART_STRIDE)).toBeGreaterThan(0.5);
  });

  it('knots launch every 1/0.7 s and are ember only inside the fronts', () => {
    expect(knotInterval(0.7)).toBeCloseTo(1 / 0.7, 9);
    // The slots' floor: (L / v) / (K - 0.5) × 1.05, under 1/rate here (spec §7: 0.445 s).
    expect(knotInterval(100)).toBeCloseTo((L / 6 / (HOLE_DOTS.knotSlots - 0.5)) * 1.05, 9);
    const knotCount = A.knots.length / PART_STRIDE;
    const knots = (fronts: { ember: number; clean: number }) => {
      const out: { s: number; ember: number }[] = [];
      for (let g = 0; g < 2000 / (2 * HOLE_DOTS.knotSlots); g++) {
        const t = 3.17 + 21.3 * g;
        // One dot a knot: the first of each slot's.
        for (let i = 0; i < knotCount; i += HOLE_DOTS.knotDots) {
          const k = knotPlace(A.knots, i, t);
          if (!k.ok) continue;
          out.push({
            s: k.s,
            ember: knotDot(A.knots, i, view(t), fronts).ember,
          });
        }
      }
      return out;
    };
    const all = knots({ ember: 1, clean: 0 });
    expect(all.length).toBeGreaterThan(300);
    const share = all.filter((k) => k.ember).length / all.length;
    expect(Math.abs(share - 0.5)).toBeLessThanOrEqual(0.05);
    expect(knots({ ember: 0, clean: 0 }).filter((k) => k.ember)).toEqual([]);
    expect(knots({ ember: 1, clean: 1 }).filter((k) => k.ember)).toEqual([]);
    const half = knots({ ember: 0.5, clean: 0 });
    expect(half.some((k) => k.ember)).toBe(true);
    for (const k of half) if (k.ember) expect(k.s).toBeLessThanOrEqual(0.5 * L);
    // A slot launches every K intervals: its launches over an hour.
    const launches = new Set<number>();
    for (let t = 0; t < 600; t += 0.05) {
      const k = knotPlace(A.knots, 0, t);
      if (k.ok) launches.add(k.n);
    }
    const cycle = HOLE_DOTS.knotSlots * knotInterval(0.7);
    expect(launches.size).toBeGreaterThanOrEqual(Math.floor(600 / cycle) - 1);
    expect(launches.size).toBeLessThanOrEqual(Math.ceil(600 / cycle) + 1);
    // Measured: 0.03 s alone, 0.07 s at load 8.6 (8 busy loops, 1 worker), under 0.3 s (vitest's report line) on CI
    // (run 38264919221). 5 s is 71.4 times the loaded time and over 16 times CI's.
  }, 5_000);
});

describe('the strands', () => {
  it('two strands, each about three turns, in separate bands', () => {
    expect(strandWindow(0, 0)).toEqual({ head: 155, tail: 0 });
    expect(strandWindow(0, 1)).toEqual({ head: 155, tail: 0 });
    expect(strandWindow(1, 0)).toEqual({ head: 0, tail: 0 });
    expect(strandWindow(1, 1)).toEqual({ head: 103, tail: 0 });
    expect(STRANDS.map((s) => s.lstr / s.rMean)).toEqual([expect.closeTo(18.67, 2), expect.closeTo(18.73, 2)]);
    expect(STRANDS[0].rJoin - 0.11 * (STRANDS[0].lstr / STRANDS[0].rMean)).toBeCloseTo(7.35, 2);
    expect(STRANDS[1].rJoin - 0.11 * (STRANDS[1].lstr / STRANDS[1].rMean)).toBeCloseTo(4.44, 2);
    let r0Min = Infinity;
    let r1Max = 0;
    for (const t of [0, AMBIENT_POSE, 101, 953, 3599.9])
      for (const [set, which] of [
        [A.strand0, 0],
        [A.strand1, 1],
      ] as const)
        for (let i = 0; i < set.length / PART_STRIDE; i++) {
          const p = strandPlace(set, i, t);
          expect(p.which).toBe(which);
          const r = Math.hypot(p.p[0], p.p[2]);
          if (which === 0) r0Min = Math.min(r0Min, r);
          else r1Max = Math.max(r1Max, r);
        }
    expect(r0Min).toBeGreaterThan(6.9);
    expect(r1Max).toBeLessThan(6.95);
    // The jitter is clamped at ±2.4 σ.
    for (const set of [A.strand0, A.strand1])
      for (let i = 0; i < set.length / PART_STRIDE; i++)
        for (const c of [2, 3]) expect(Math.abs(set[i * PART_STRIDE + c])).toBeLessThanOrEqual(Math.fround(HOLE_STRAND.jitterClamp));
  });

  it('the C7 → R1 stream ends at the turning join', () => {
    const w = 3.1 * 5.5 ** -1.5;
    for (const t of [0, 13.7, AMBIENT_POSE, 3599.9]) {
      const j = strandJoin(1, t);
      expect(Math.hypot(j[0], j[2])).toBeCloseTo(6.5, 9);
      expect(j[1]).toBe(0);
      const dt = 0.01;
      const k = strandJoin(1, t + dt);
      expect(angleDiff(Math.atan2(k[2], k[0]), Math.atan2(j[2], j[0])) / dt).toBeCloseTo(w, 5);
      // R1's dot nearest q = 0 is within its jitter of the join (and its q's turn).
      let best = 0;
      for (let i = 1; i < A.strand1.length / PART_STRIDE; i++) if (A.strand1[i * PART_STRIDE] < A.strand1[best * PART_STRIDE]) best = i;
      const p = strandPlace(A.strand1, best, t);
      const q = A.strand1[best * PART_STRIDE];
      const along = q * Math.hypot(1, 0.11 / 5.5) * (6.5 / 5.5);
      expect(Math.hypot(p.p[0] - j[0], p.p[1] - j[1], p.p[2] - j[2])).toBeLessThanOrEqual(Math.hypot(2.4 * 0.14, 2.4 * 0.07) + along + 1e-9);
    }
    // R0's join turns at its own rate, 3.1 · 8.3^-1.5.
    const j0 = strandJoin(0, 10);
    const j1 = strandJoin(0, 10.01);
    expect(angleDiff(Math.atan2(j1[2], j1[0]), Math.atan2(j0[2], j0[0])) / 0.01).toBeCloseTo(3.1 * 8.3 ** -1.5, 5);
  });

  it('a clean strand is the disk blue, an ember strand HOLE_EMBER', () => {
    const v = view(AMBIENT_POSE);
    let checked = 0;
    for (let i = 0; i < A.strand0.length / PART_STRIDE; i++) {
      const clean = strandDot(A.strand0, i, v, { head: 155, heat: 0 });
      const ember = strandDot(A.strand0, i, v, { head: 155, heat: 1 });
      [0.45, 0.66, 1.0].forEach((c, j) => expect(clean.rgb[j]).toBeCloseTo(c, 12));
      HOLE_EMBER.rgb.forEach((c, j) => expect(ember.rgb[j]).toBeCloseTo(c, 12));
      expect(clean.sizeCss).toBe(1.7);
      expect(ember.sizeCss).toBe(HOLE_EMBER.size);
      if (clean.alpha > 0.001 && ember.alpha < 0.999) {
        expect(ember.alpha / clean.alpha).toBeCloseTo(HOLE_EMBER.gain / 0.55, 6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(HOLE_EMBER).toEqual({
      rgb: [1.0, 0.26, 0.18],
      gain: 1.4,
      size: 2.0,
    });
  });
});

describe('the infall', () => {
  it('the infall starts at 15–21 and ends in the disk at 4.5–10', () => {
    const count = A.infall.length / PART_STRIDE;
    let starts = 0;
    let ends = 0;
    // Each fall's head (trail 0) found on a grid, then read at its very start and end (u 0 and 1).
    for (let t = 0; t < 300; t += 0.5)
      for (let i = 0; i < count; i += HOLE_DOTS.infallTrail) {
        const f = infallPlace(A.infall, i, t);
        if (!f.ok || f.u <= 0.001 || f.u >= 0.999) continue;
        const start = infallPlace(A.infall, i, t - (f.u - 1e-7) * 2.8);
        expect(start.u).toBeCloseTo(1e-7, 6);
        const r = Math.hypot(...start.p);
        expect(r).toBeGreaterThanOrEqual(15 - 1e-3);
        expect(r).toBeLessThanOrEqual(21 + 1e-3);
        starts++;
        const end = infallPlace(A.infall, i, t + (1 - 1e-7 - f.u) * 2.8);
        expect(end.u).toBeCloseTo(1 - 1e-7, 6);
        expect(Math.hypot(end.p[0], end.p[2])).toBeGreaterThanOrEqual(4.5 - 1e-3);
        expect(Math.hypot(end.p[0], end.p[2])).toBeLessThanOrEqual(10 + 1e-3);
        expect(Math.abs(end.p[1])).toBeLessThan(1e-3);
        ends++;
      }
    expect(starts).toBeGreaterThan(10);
    expect(ends).toBeGreaterThan(10);
    // Each trail dot is on its head's path, 0.035 of the fall behind it.
    let trails = 0;
    for (let t = 0; t < 120; t += 0.37)
      for (let i = 0; i < count; i++) {
        const trail = A.infall[i * PART_STRIDE + 1];
        const f = infallPlace(A.infall, i, t);
        if (trail === 0 || !f.ok || f.u > 0.9) continue;
        const head = infallPlace(A.infall, i - trail, t - trail * 0.035 * 2.8);
        expect(head.u).toBeCloseTo(f.u, 6);
        for (let c = 0; c < 3; c++) expect(head.p[c]).toBeCloseTo(f.p[c], 6);
        trails++;
      }
    expect(trails).toBeGreaterThan(20);
    expect(infallDot(A.infall, 0, view(40)).sizeCss).toBe(1.6);
    // Measured: 0.24 s alone, 0.67 s at load 8.6 (8 busy loops, 1 worker), 0.39 s on CI
    // (run 38264919221). 10 s is 14.9 times the loaded time and 26 times CI's.
  }, 10_000);
});

describe('the hourly wrap (Review Focus 3)', () => {
  it('every dot is finite and in range at 3599.99 and 0, and a knot launches within one interval after the wrap', () => {
    for (const t of [3599.99, 0])
      for (const v of [view(t), view(t, 82, 210)]) {
        const all: HoleDot[] = [];
        for (let i = 0; i < diskCount; i++) all.push(diskDot(A.disk, i, v, 0));
        for (let i = 0; i < HOLE_DOTS.arch; i++) all.push(diskDot(A.disk, i, v, 1));
        for (let i = 0; i < A.ring.length / PART_STRIDE; i++) all.push(ringDot(A.ring, i, v));
        for (let i = 0; i < A.jets.length / PART_STRIDE; i++) all.push(jetDot(A.jets, i, v));
        for (let i = 0; i < A.knots.length / PART_STRIDE; i++) all.push(knotDot(A.knots, i, v, { ember: 1, clean: 0 }));
        for (let i = 0; i < A.infall.length / PART_STRIDE; i++) all.push(infallDot(A.infall, i, v));
        for (const set of [A.strand0, A.strand1])
          for (let i = 0; i < set.length / PART_STRIDE; i++) all.push(strandDot(set, i, v, { head: 155, heat: 0.5 }));
        for (const d of all) {
          expect(finite(d)).toBe(true);
          expect(d.alpha).toBeGreaterThanOrEqual(0);
          expect(d.alpha).toBeLessThanOrEqual(1);
          for (const c of d.rgb) expect(c).toBeGreaterThanOrEqual(0);
          for (const c of d.rgb) expect(c).toBeLessThanOrEqual(1);
          expect(d.sizeCss).toBeGreaterThan(0);
          expect(d.sizeCss).toBeLessThan(5);
        }
      }
    // After the wrap the knots keep launching: a knot is at the jet's base within one interval.
    const interval = knotInterval(HOLE_LOOK.knotRate);
    let launched = false;
    for (let t = 0; t <= interval; t += 0.01)
      for (let i = 0; i < A.knots.length / PART_STRIDE; i += HOLE_DOTS.knotDots) {
        const k = knotPlace(A.knots, i, t);
        if (k.ok && k.s < 0.5) launched = true;
      }
    expect(launched).toBe(true);
    // Measured: 7.90 s alone, 19.64 s at load 8.6 (8 busy loops, 1 worker), 10.39 s on CI
    // (run 38264919221). 60 s is 3.1 times the loaded time and 6 times CI's.
  }, 60_000);
});

describe('the dots', () => {
  it('compensates each part for its fewer dots', () => expect(holeComp('disk').gain * holeComp('disk').size ** 2).toBeCloseTo(26000 / 18000, 9));

  it('holeComp maps each part to its own count', () => {
    expect(holeComp('jets').gain).toBe(Math.sqrt(7000 / 4800));
    expect(holeComp('knot').gain).toBe(Math.sqrt(56 / 64)); // under 1: more dots than the inspector's
    const ours = {
      disk: 18000,
      arch: 2400,
      ring: 320,
      jets: 4800,
      knot: 64,
      infall: 72,
      strand0: 750,
      strand1: 500,
    };
    for (const [part, n] of Object.entries(ours) as [keyof typeof HOLE_MOCK_DOTS, number][]) {
      const m = HOLE_MOCK_DOTS[part] / n;
      expect(holeComp(part).gain, part).toBeCloseTo(Math.sqrt(m), 12);
      expect(holeComp(part).size, part).toBeCloseTo(m ** 0.25, 12);
    }
  });

  it('a dot is never under 1 device px', () => {
    expect(holeDotPx(1.25, 1e6, 2)).toBe(2);
    expect(holeDotPx(1.3, 75, 2)).toBeCloseTo(2.6, 12);
    expect(holeDotPx(1.3, 10, 1)).toBeCloseTo(1.3 * 2.2, 12);
  });

  it('dims the small hole by the area of its disk, and once more as a point: min(1, (d / 80)²) × min(1, (d / 50)²)', () => {
    expect(holeSmallGain(0)).toBe(0);
    expect(holeSmallGain(-5)).toBe(0);
    expect(holeSmallGain(80)).toBe(1);
    expect(holeSmallGain(100)).toBe(1);
    // From the point size up, the area rule alone: the wides where the hole is a subject keep it.
    expect(holeSmallGain(50)).toBeCloseTo((50 / 80) ** 2, 12);
    expect(holeSmallGain(64)).toBeCloseTo(0.64, 12);
    // Under it, once more by (d / 50)², and continuous there.
    expect(holeSmallGain(25)).toBeCloseTo((25 / 80) ** 2 * 0.25, 12);
    expect(holeSmallGain(49.999)).toBeCloseTo(holeSmallGain(50.001), 3);
    expect(holeSmallGain(23.5)).toBeCloseTo((23.5 / 80) ** 2 * (23.5 / 50) ** 2, 12);
  });

  it('seeds a hash from a slot and a launch index, in [0, 2^24)', () => {
    const seen = new Set<number>();
    for (let a = 0; a < 40; a++)
      for (let b = -1; b < 40; b++) {
        const s = holeSeed(a, b);
        expect(Number.isInteger(s) && s >= 0 && s < 2 ** 24).toBe(true);
        seen.add(s);
      }
    expect(seen.size).toBe(40 * 41);
  });

  it('runs the lives clock exactly round the hour, from integer seconds', () => {
    for (const lives of [1, 12, 37, 225])
      for (const phase of [0, 0.3, -0.06]) {
        const a = holeLives(0.37, lives, phase);
        const b = holeLives(3600.37, lives, phase);
        expect(b.n - a.n).toBe(lives);
        expect(b.u).toBeCloseTo(a.u, 12);
        const c = holeLives(1234.5, lives, phase);
        const x = (1234.5 * lives) / 3600 + phase;
        expect(c.n).toBe(Math.floor(x));
        expect(c.u).toBeCloseTo(x - Math.floor(x), 12);
        expect(c.index).toBe(((Math.floor(x) % lives) + lives) % lives);
        expect(b.index).toBe(a.index);
      }
    expect(HOLE_HOUR).toBe(AMBIENT_WRAP);
  });

  it("wraps the life index to 0 at the hour's last life for every N_k, as a GPU that divides by the reciprocal would too", () => {
    // A float mod(n, N) is n − N floor(n / N). GLSL ES 3.00 allows `/` 2.5 ULP, and a GPU that divides
    // by the reciprocal takes N / N as N × rcp(N), under 1 for some N: mod(N, N) is then N, and the
    // hour's last life would take life N's seed, not life 0's, and jump at the wrap.
    const f = Math.fround;
    const rcpMod = (n: number, d: number): number => n - d * Math.floor(f(n * f(1 / d)));
    const lives = new Set<number>();
    for (let i = 0; i < diskCount; i++) lives.add(A.disk[i * DISK_STRIDE + 7]);
    // The hazard is real for this seed: some of its N_k come out of a reciprocal float mod as N, not 0.
    const hazard = [...lives].filter((N) => rcpMod(N, N) !== 0);
    expect(hazard.length).toBeGreaterThan(0);
    for (const N of lives) {
      // n = N: the hour's last life, by the clock at t = 3600 and just before it, a phase ahead.
      for (const [t, phase] of [
        [3600, 0.25],
        [3599.99, 0.999],
      ]) {
        const c = holeLives(t, N, phase);
        expect(c.n, `N ${N} t ${t}`).toBe(N);
        expect(c.index, `N ${N} t ${t}`).toBe(0);
      }
      expect(holeLives(0, N, 0.25).index).toBe(0);
    }
    // And the GLSL takes no float mod at all: its index is int arithmetic in holeLives.
    expect(holeGlsl).not.toMatch(/(?<![A-Za-z_])mod\(/);
    expect(holeGlsl).toMatch(/return vec3\(float\(q\) \+ f, y - f, float\(\(q \+ int\(f\) \+ n\) % n\)\);/);
  });
});

describe('hole.glsl', () => {
  it('declares every constant holeLook.ts splices, value for value', () => {
    const lib = holeLibraryGlsl();
    for (const [name, value] of HOLE_CONSTANTS) {
      const body = typeof value === 'number' ? '([-0-9.e]+)' : `vec${value.length}\\(([-0-9.e, ]+)\\)`;
      const m = new RegExp(`const (?:float|vec[23]) ${name} = ${body};`).exec(lib);
      expect(m, name).not.toBeNull();
      const got = m![1].split(',').map(Number);
      expect(got, name).toEqual(typeof value === 'number' ? [value] : [...value]);
    }
    expect(lib).not.toMatch(/#include/);
  });

  it('names every HOLE_ constant it uses from the spliced set, and holds no bare look value', () => {
    for (const m of holeGlsl.matchAll(/\bHOLE_[A-Z0-9_]+\b/g)) expect(HOLE_CONSTANTS.has(m[0]), m[0]).toBe(true);
    expect(holeGlsl).not.toMatch(/const (float|vec[234]) HOLE_/);
    // Literals: only the formulas' own (0, ½, 1, 2, the lens equation's 8 and Kepler's 1.5).
    const code = holeGlsl.replace(/\/\/.*$/gm, '');
    const literals = new Set([...code.matchAll(/(?<![A-Za-z_0-9.])\d+\.\d*(?:e-?\d+)?/g)].map((m) => Number(m[0])));
    for (const x of literals) expect([0, 0.5, 1, 1.5, 2, 8], String(x)).toContain(x);
  });

  it('takes sin and cos from moteSinCos, and its clocks from orbitTurns', () => {
    expect(holeGlsl).not.toMatch(/(?<![A-Za-z_])(sin|cos|atan)\(/);
    expect(holeGlsl).toMatch(/orbitTurns\(/);
    expect(withHoleLibrary('// #include mote.glsl + orbit.glsl + hole.glsl (spliced in by src/scene/node/shaderSource.ts)')).toMatch(
      /vec2 moteSinCos\(float x\)[\s\S]*float orbitTurns\(float t, float period\)[\s\S]*HoleDot diskDot\(/,
    );
  });

  it('mirrors every exported dot function of hole.ts', () => {
    for (const fn of [
      'holeLens',
      'holeDoppler',
      'holeTemp',
      'diskDot',
      'ringDot',
      'jetDot',
      'knotDot',
      'infallDot',
      'strandDot',
      'strandJoin',
      'holeDotPx',
      'holeLives',
      'holeCycle',
    ])
      expect(holeGlsl, fn).toMatch(new RegExp(`\\b${fn}\\(`));
  });
});
