import { describe, expect, it } from 'vitest';
import { HOLE_DOTS } from '../../galaxy/hole';
import { buildHoleAttrs, DISK_STRIDE, PART_STRIDE } from './holeAttrs';
import { diskLife, HOLE_DISK, STRANDS } from './holeLook';

const A = buildHoleAttrs(1);
const diskCount = A.disk.length / DISK_STRIDE;

describe('buildHoleAttrs', () => {
  it('is deterministic and seed-sensitive', () => {
    const again = buildHoleAttrs(1);
    const other = buildHoleAttrs(2);
    for (const part of Object.keys(A) as (keyof typeof A)[]) {
      expect(again[part], part).toEqual(A[part]);
      if (part !== 'infall') expect(other[part], part).not.toEqual(A[part]);
    }
  });

  it("draws HOLE_DOTS's counts, 12 floats a disk dot and 8 a dot of every other part", () => {
    expect([DISK_STRIDE, PART_STRIDE]).toEqual([12, 8]);
    expect(diskCount).toBe(HOLE_DOTS.disk);
    expect(A.ring.length / PART_STRIDE).toBe(HOLE_DOTS.ring);
    expect(A.jets.length / PART_STRIDE).toBe(2 * HOLE_DOTS.jetsPerSide);
    expect(A.knots.length / PART_STRIDE).toBe(2 * HOLE_DOTS.knotSlots * HOLE_DOTS.knotDots);
    expect(A.infall.length / PART_STRIDE).toBe(HOLE_DOTS.infallSlots * HOLE_DOTS.infallTrail);
    expect(A.strand0.length / PART_STRIDE).toBe(HOLE_DOTS.strand0);
    expect(A.strand1.length / PART_STRIDE).toBe(HOLE_DOTS.strand1);
  });

  it("gives the disk a diffuse share of 0.34, and its first 2,400 dots (the arch's) are a uniform sample", () => {
    let haze = 0;
    let rAll = 0;
    let rArch = 0;
    for (let i = 0; i < diskCount; i++) {
      if (A.disk[i * DISK_STRIDE + 8] < 0) haze++;
      rAll += A.disk[i * DISK_STRIDE];
      if (i < HOLE_DOTS.arch) rArch += A.disk[i * DISK_STRIDE];
    }
    expect(Math.abs(haze / diskCount - HOLE_DISK.diffuse)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(rArch / HOLE_DOTS.arch / (rAll / diskCount) - 1)).toBeLessThanOrEqual(0.03);
  });

  it("holds each disk dot's place: a streak dot its streak, base radius and lives, a haze dot its own", () => {
    for (let i = 0; i < diskCount; i++) {
      const o = i * DISK_STRIDE;
      const [r, , , bright, size, rb, id, lives, k, u, g, bf] = A.disk.subarray(o, o + DISK_STRIDE);
      expect(id).toBe(i);
      expect(size).toBeGreaterThanOrEqual(1.3);
      expect(size).toBeLessThanOrEqual(2.2);
      expect(r).toBeGreaterThanOrEqual(2.75);
      if (k < 0) {
        expect([u, g, bf]).toEqual([0, 0, 1]);
        expect(rb).toBe(r);
        expect(lives).toBe(HOLE_DISK.motion.hazeLives);
        expect(r).toBeLessThanOrEqual(12.5 + 1e-5);
        expect(bright).toBeGreaterThanOrEqual(0.15 - 1e-7);
        expect(bright).toBeLessThanOrEqual(0.47 + 1e-7);
      } else {
        expect(Number.isInteger(k) && k < HOLE_DISK.streaks).toBe(true);
        expect(Math.abs(u)).toBeLessThanOrEqual(0.5);
        expect(bf).toBeGreaterThanOrEqual(0.5 - 1e-7);
        expect(bf).toBeLessThanOrEqual(1.2 + 1e-7);
        expect(lives).toBe(diskLife(k, rb).lives);
      }
    }
  });

  it('lays the strands evenly over their lengths, each its own, R0 keyed past R1', () => {
    for (const [set, which] of [
      [A.strand0, 0],
      [A.strand1, 1],
    ] as const) {
      const n = set.length / PART_STRIDE;
      for (let i = 0; i < n; i++) {
        const q = set[i * PART_STRIDE];
        expect(q).toBeGreaterThanOrEqual((i / n) * STRANDS[which].lstr);
        expect(q).toBeLessThanOrEqual(((i + 1) / n) * STRANDS[which].lstr);
        expect(set[i * PART_STRIDE + 4]).toBe(which);
      }
    }
    expect(A.strand0.subarray(0, 4)).not.toEqual(A.strand1.subarray(0, 4));
  });

  it('places the knots by side and slot, 24 core and 40 halo dots a knot', () => {
    const per = HOLE_DOTS.knotDots;
    for (let i = 0; i < A.knots.length / PART_STRIDE; i++) {
      const o = i * PART_STRIDE;
      expect(A.knots[o]).toBe(Math.floor((i % (HOLE_DOTS.knotSlots * per)) / per));
      expect(A.knots[o + 1]).toBe(i < HOLE_DOTS.knotSlots * per ? 1 : -1);
      expect(A.knots[o + 7]).toBe(i % per < HOLE_DOTS.knotCore ? 1 : 0);
      if (i % per < HOLE_DOTS.knotCore) expect(A.knots[o + 2]).toBe(1);
    }
  });
});
