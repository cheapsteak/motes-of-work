// The black hole's per-dot attributes (docs/specs/2026-10-09-act-2-reskin.md §4.2, §7): the static
// layout every part's dots are drawn from, seeded per dot from the galaxy's streams (seeds.ts), so a
// change to one part does not reshuffle another. hole.ts and hole.glsl read them; nothing here moves.
// The layout is the inspector's statistically (its distributions, drawn from streamFor instead of its
// one LCG), not bit for bit.
//
// Every part's dot is two vec4 (aA, aB), the disk's three (aC too):
//  - disk: aA (r, φ0, h, bright), aB (size, rb, id, lives), aC (k, u, g, bf). k is the streak, −1 for a
//    haze dot; u, g and bf are the dot's static place in its streak; rb is the streak's base radius
//    (a haze dot's own r); id keys a haze dot's lives; lives is how many lives an hour the dot's clock
//    runs (diskLife's N_k for a streak, hazeLives for the haze). r, φ0 and bright are the inspector's
//    static place: a haze dot reads r and bright (its angle is re-hashed per life), a streak dot none of
//    them. The first HOLE_DOTS.arch dots, a uniform sample, are the underside arc's too.
//  - ring: (angle, jitter, bright, 0) (0, 0, 0, 0);
//  - jets: (s0, angle, rad, side) (bright, seed, 0, 0);
//  - knots: (slot, side, bright, seed) (offset xyz, core); the seed is drawn and unread;
//  - infall: (slot, trail, 0, 0) (0, 0, 0, 0): its falls are shader hashes;
//  - strands: (q, seed, jitter x, jitter y) (which, 0, 0, 0), q evenly over [0, lstr], the jitter
//    gaussian clamped at ±jitterClamp σ.
import { HOLE_DOTS } from '../../galaxy/hole';
import { streamFor } from '../../galaxy/seeds';
import { diskLife, HOLE_DISK, HOLE_JET, HOLE_KNOT, HOLE_RING, HOLE_STRAND, STRANDS } from './holeLook';

/** Floats a disk dot (aA, aB, aC), and a dot of every other part (aA, aB). */
export const DISK_STRIDE = 12;
export const PART_STRIDE = 8;

export interface HoleAttrs {
  disk: Float32Array;
  ring: Float32Array;
  jets: Float32Array;
  knots: Float32Array;
  infall: Float32Array;
  strand0: Float32Array;
  strand1: Float32Array;
}

const TAU = 2 * Math.PI;
const SEED_RANGE = 2 ** 24;

const mixRange = (r: readonly number[], u: number): number => r[0] + (r[1] - r[0]) * u;

/** A standard gaussian from two draws (Box–Muller, as the inspector's). */
function gauss(rnd: () => number): number {
  const u = Math.max(rnd(), 1e-9);
  const v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/** The disk: HOLE_DISK.streaks streaks (each its own stream, keyed 100,000 + k), then each dot haze or on a streak. */
function buildDisk(seed: number): Float32Array {
  const D = HOLE_DISK;
  const S = D.streak;
  const streaks = Array.from({ length: D.streaks }, (_, k) => {
    const rnd = streamFor(seed, 'holeDisk', 100_000 + k);
    // At float32, as the attribute carries it: its lives are N_k of that radius.
    const rb = Math.fround(D.inner + S.span * rnd() ** S.pow);
    return {
      rb,
      angle: TAU * rnd(),
      len: mixRange(S.len, rnd()) * (1 + rb / S.lenGrow),
      bright: mixRange(S.bright, rnd()),
      pitch: mixRange(S.pitch, rnd()),
      lives: diskLife(k, rb).lives,
    };
  });
  const out = new Float32Array(HOLE_DOTS.disk * DISK_STRIDE);
  for (let i = 0; i < HOLE_DOTS.disk; i++) {
    const rnd = streamFor(seed, 'holeDisk', i);
    let r: number;
    let row: number[];
    if (rnd() < D.diffuse) {
      r = D.inner + D.haze.span * rnd() ** D.haze.pow;
      const phi0 = TAU * rnd();
      const bright = mixRange(D.haze.bright, rnd());
      row = [r, phi0, 0, bright, 0, r, i, D.motion.hazeLives, -1, 0, 0, 1];
    } else {
      const k = Math.floor(rnd() * D.streaks);
      const s = streaks[k];
      const u = rnd() - 0.5;
      const g = gauss(rnd);
      const bf = mixRange(S.dot, rnd());
      const off = u * s.len;
      r = Math.max(D.inner, s.rb + g * S.jitter - off * s.pitch);
      row = [r, s.angle + off, 0, s.bright * bf, 0, s.rb, i, s.lives, k, u, g, bf];
    }
    row[2] = gauss(rnd) * D.height * (r / D.radialRef);
    row[4] = mixRange(D.size, rnd());
    out.set(row, i * DISK_STRIDE);
  }
  return out;
}

function buildRing(seed: number): Float32Array {
  const R = HOLE_RING;
  const out = new Float32Array(HOLE_DOTS.ring * PART_STRIDE);
  for (let i = 0; i < HOLE_DOTS.ring; i++) {
    const rnd = streamFor(seed, 'holeRing', i);
    const angle = ((i + R.spread * rnd()) / HOLE_DOTS.ring) * TAU;
    const jitter = gauss(rnd);
    out.set([angle, jitter, mixRange(R.bright, rnd()), 0], i * PART_STRIDE);
  }
  return out;
}

function buildJets(seed: number): Float32Array {
  const J = HOLE_JET;
  const n = 2 * HOLE_DOTS.jetsPerSide;
  const out = new Float32Array(n * PART_STRIDE);
  for (let i = 0; i < n; i++) {
    const rnd = streamFor(seed, 'holeJet', i);
    const s0 = rnd() ** J.s0Pow;
    const angle = TAU * rnd();
    const rad = rnd() < J.sheath ? mixRange(J.sheathRad, rnd()) : Math.sqrt(rnd());
    const bright = mixRange(J.bright, rnd());
    const dotSeed = Math.floor(rnd() * SEED_RANGE);
    out.set([s0, angle, rad, i % 2 === 0 ? 1 : -1, bright, dotSeed, 0, 0], i * PART_STRIDE);
  }
  return out;
}

/** The knots: side +1's slots, then side −1's, each slot's knotDots dots, its first knotCore the core. */
function buildKnots(seed: number): Float32Array {
  const K = HOLE_KNOT;
  const per = HOLE_DOTS.knotDots;
  const side = HOLE_DOTS.knotSlots * per;
  const out = new Float32Array(2 * side * PART_STRIDE);
  for (let i = 0; i < 2 * side; i++) {
    const rnd = streamFor(seed, 'holeKnot', i);
    const core = i % per < HOLE_DOTS.knotCore;
    const sigma = core ? K.coreSigma : [1, 1, 1];
    const off = sigma.map((s) => gauss(rnd) * s);
    const bright = core ? 1 : mixRange(K.haloBright, rnd());
    const dotSeed = Math.floor(rnd() * SEED_RANGE);
    out.set([Math.floor((i % side) / per), i < side ? 1 : -1, bright, dotSeed, ...off, core ? 1 : 0], i * PART_STRIDE);
  }
  return out;
}

function buildInfall(): Float32Array {
  const n = HOLE_DOTS.infallSlots * HOLE_DOTS.infallTrail;
  const out = new Float32Array(n * PART_STRIDE);
  for (let i = 0; i < n; i++) out.set([Math.floor(i / HOLE_DOTS.infallTrail), i % HOLE_DOTS.infallTrail], i * PART_STRIDE);
  return out;
}

/** Strand `which`'s dots: R0's keyed 10,000 + i, R1's i. */
function buildStrand(seed: number, which: 0 | 1): Float32Array {
  const n = which === 0 ? HOLE_DOTS.strand0 : HOLE_DOTS.strand1;
  const lstr = STRANDS[which].lstr;
  const cut = HOLE_STRAND.jitterClamp;
  const out = new Float32Array(n * PART_STRIDE);
  for (let i = 0; i < n; i++) {
    const rnd = streamFor(seed, 'holeStrand', (which === 0 ? 10_000 : 0) + i);
    const q = ((i + rnd()) / n) * lstr;
    const dotSeed = Math.floor(rnd() * SEED_RANGE);
    const jx = Math.min(Math.max(gauss(rnd), -cut), cut);
    const jy = Math.min(Math.max(gauss(rnd), -cut), cut);
    out.set([q, dotSeed, jx, jy, which], i * PART_STRIDE);
  }
  return out;
}

/** Every part's attributes for the galaxy's `seed`: HOLE_DOTS's counts, the arch reading the disk's first HOLE_DOTS.arch. */
export function buildHoleAttrs(seed: number): HoleAttrs {
  return {
    disk: buildDisk(seed),
    ring: buildRing(seed),
    jets: buildJets(seed),
    knots: buildKnots(seed),
    infall: buildInfall(),
    strand0: buildStrand(seed, 0),
    strand1: buildStrand(seed, 1),
  };
}
