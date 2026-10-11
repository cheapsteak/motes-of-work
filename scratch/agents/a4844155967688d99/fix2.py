import sys

root = sys.argv[1]


def edit(path, pairs):
    p = f'{root}/{path}'
    s = open(p).read()
    for old, new in pairs:
        if s.count(old) != 1:
            raise SystemExit(f'{path}: expected one match for {old[:70]!r}, found {s.count(old)}')
        s = s.replace(old, new)
    open(p, 'w').write(s)


edit('src/scene/node/birth.ts', [
    ("""const ORBIT_CONSTANT_LIST: readonly [string, number][] = [['GALAXY_TURN_PERIOD', GALAXY_TURN_PERIOD]];

/** The constants orbit.glsl reads, generated from this file. */
export function glslOrbitConstants(): string {
  return [
    '// The orbit constants, generated from src/scene/node/birth.ts.',
    ...ORBIT_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
  ].join('\\n');
}""",
     """/**
 * The significant bits a period's head keeps when orbitTurns (orbit.ts) reduces the ambient clock by
 * it, Cody-Waite style: k times the head is exact in float32 for k below 2^(24 − this). The GLSL
 * takes it as ORBIT_HEAD_MASK, the float32 bits it keeps.
 */
export const ORBIT_HEAD_BITS = 9;

const ORBIT_CONSTANT_LIST: readonly [string, number][] = [['GALAXY_TURN_PERIOD', GALAXY_TURN_PERIOD]];

/** ORBIT_HEAD_BITS as a float32 bit mask: the sign, the exponent and the top ORBIT_HEAD_BITS − 1 stored mantissa bits. */
export const ORBIT_HEAD_MASK = (0xffffffff << (24 - ORBIT_HEAD_BITS)) >>> 0;

/** The constants orbit.glsl reads, generated from this file. */
export function glslOrbitConstants(): string {
  return [
    '// The orbit constants, generated from src/scene/node/birth.ts.',
    ...ORBIT_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    `const uint ORBIT_HEAD_MASK = 0x${ORBIT_HEAD_MASK.toString(16).toUpperCase()}u; // ORBIT_HEAD_BITS = ${ORBIT_HEAD_BITS}`,
  ].join('\\n');
}"""),
])

edit('src/scene/node/orbit.ts', [
    ("""// unit. `mod(t, P) / P` keeps the remainder to float32's precision of `t` itself, and is the same
// angle to within whole turns, so M, ω and the turn are §12.1's and §2.1's formulas exactly.""",
     """// unit. The remainder `t − k P` (k = floor(t / P)) is the same angle to within whole turns, so M, ω
// and the turn are §12.1's and §2.1's formulas exactly. It is taken Cody-Waite style, as moteSinCos
// reduces by π/2, so float32 keeps it to the precision of `t` itself: P splits into a head of its top
// ORBIT_HEAD_BITS significant bits (birth.ts) and the tail left over; k times the head is exact in
// float32 (for k below 2^15, a day of a moon's 6 s period), and only k times the small tail rounds.
// A plain `mod(t, P)` rounds `k P` by up to half a unit in the last place of `t`, which a day in is
// 4 ms: a planet's whole 1e-3 of parity. The TS works in float64, where the split changes nothing,
// but takes the same steps."""),
    ("""/** GLSL's mod(x, y): x − y floor(x / y). */
const mod = (x: number, y: number): number => x - y * Math.floor(x / y);
""", ""),
    ("import { GALAXY_TURN_PERIOD } from './birth';", "import { GALAXY_TURN_PERIOD, ORBIT_HEAD_BITS } from './birth';"),
    ("""/** How far into its period `period` the clock `t` is, in turns: mod(t, period) / period. */
function orbitTurns(t: number, period: number): number {
  return mod(t, period) / period;
}""",
     """/**
 * A positive `p` cut toward zero to its top ORBIT_HEAD_BITS significant bits: what the GLSL's
 * ORBIT_HEAD_MASK gives of the float32's bits.
 */
function orbitHead(p: number): number {
  const unit = 2 ** (Math.floor(Math.log2(p)) - (ORBIT_HEAD_BITS - 1));
  return Math.floor(p / unit) * unit;
}

/** How far into its period `period` the clock `t` is, in turns: (t − k period) / period, k = floor(t / period). */
function orbitTurns(t: number, period: number): number {
  const k = Math.floor(t / period);
  const head = orbitHead(period);
  return (t - k * head - k * (period - head)) / period;
}"""),
])

edit('src/scene/node/orbit.glsl', [
    ("""// How far into its period the clock t is, in turns.
float orbitTurns(float t, float period) {
  return mod(t, period) / period;
}""",
     """// How far into its period the clock t is, in turns: (t - k period) / period, k = floor(t / period),
// with k period taken as k head + k tail, the head the period's top ORBIT_HEAD_BITS significant bits
// (orbit.ts says why).
float orbitTurns(float t, float period) {
  float k = floor(t / period);
  float head = uintBitsToFloat(floatBitsToUint(period) & ORBIT_HEAD_MASK);
  return ((t - k * head) - k * (period - head)) / period;
}"""),
])

edit('src/scene/node/orbit.test.ts', [
    ("""    for (const m of orbitGlsl.matchAll(/\\bGALAXY_[A-Z_]+\\b/g)) expect(ORBIT_CONSTANTS.has(m[0]), m[0]).toBe(true);
    expect(orbitGlsl).not.toMatch(/const float GALAXY_/);""",
     """    for (const m of orbitGlsl.matchAll(/\\bGALAXY_[A-Z_]+\\b/g)) expect(ORBIT_CONSTANTS.has(m[0]), m[0]).toBe(true);
    expect(orbitGlsl).not.toMatch(/const float GALAXY_/);
    expect(orbitGlsl).toContain('ORBIT_HEAD_MASK');
    expect(orbitGlsl).not.toMatch(/const uint ORBIT_HEAD_MASK/);
    expect(orbitLibraryGlsl()).toContain(`const uint ORBIT_HEAD_MASK = 0x${ORBIT_HEAD_MASK.toString(16).toUpperCase()}u;`);
    // The mask keeps the sign, the exponent and ORBIT_HEAD_BITS − 1 stored mantissa bits.
    expect(ORBIT_HEAD_MASK.toString(2)).toBe('1'.repeat(9 + ORBIT_HEAD_BITS - 1) + '0'.repeat(24 - ORBIT_HEAD_BITS));"""),
    ("import { GALAXY_TURN_PERIOD as SPLICED_TURN_PERIOD, NODE_NEVER, ORBIT_CONSTANTS } from './birth';",
     "import { GALAXY_TURN_PERIOD as SPLICED_TURN_PERIOD, NODE_NEVER, ORBIT_CONSTANTS, ORBIT_HEAD_BITS, ORBIT_HEAD_MASK } from './birth';"),
])
