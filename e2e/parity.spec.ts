import { expect, test, type Page } from '@playwright/test';
import { AMBIENT_POSE } from '../src/galaxy/ambient';
import { MECHANISM_IDS } from '../src/mechanisms';

interface ParityCase {
  name: string;
  maxError: number;
  samples?: number;
  shifted?: number;
}

// Every case renders the production vertex path (the real instanced attributes, instanceAttrs(),
// mote()) and compares every MoteOut field with the TS reference, once per registered mechanism
// (case names are prefixed with the mechanism id).
const MOTE_CASES = [
  'assembly 0',
  'assembly 0.5',
  'assembly 1',
  'variant 0.5',
  'opposite normals at variant 0.5',
  'drift 1 at drive 0.37',
  'vibed 0.5 + misallocated 0.3',
  'vibed 1',
  'misallocated 1',
  'all faults 0.6 at drive 0.71',
  'copy row 1',
  'reflow 0.5 at drive 1.6',
  'reflow 0.5 mid-flight, drifting',
  'reflow 1 at drive 1.9',
];

async function runParity(page: Page, query: string): Promise<{ cases: ParityCase[]; error?: string; errors: Error[] }> {
  const errors: Error[] = [];
  page.on('pageerror', (e) => errors.push(e));
  await page.goto(`/src/parity/parity.html?test=1${query}`);
  await page.waitForFunction(() => (window as unknown as { __parity?: unknown }).__parity !== undefined);
  const parity = await page.evaluate(
    () => (window as unknown as { __parity: { cases: ParityCase[]; error?: string } }).__parity,
  );
  return { ...parity, errors };
}

test('GLSL mote() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '');

  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  const expected = MECHANISM_IDS.flatMap((id) => MOTE_CASES.map((c) => `${id}: ${c}`));
  expect([...byName.keys()].sort()).toEqual([...expected, 'hash01', 'pcg goldens'].sort());

  for (const c of parity.cases) {
    expect(c.maxError, c.name).toBeLessThan(1e-3);
  }
  // The hash is integer arithmetic: hash01 must agree to float32 rounding, pcg exactly.
  expect(byName.get('hash01')).toBeLessThan(1e-7);
  expect(byName.get('pcg goldens')).toBe(0);
});

// The galaxy's bodyWorld() (`?lib=orbit`): N0, C1 and its six moons, P1, R0, R1, a binary (re-skin
// Task 1e: a moon of a binary star's planet, three hops from its barycentre, that planet, that star
// and the barycentre) and 32 hashed bodies, at each sampled ambient time (the pose among them), up to
// a day in (the moons' 6 s periods run 14,400 turns by then, and the galaxy's turn 72, swinging points
// a hundred units from N0: an unreduced angle shows there).
const ORBIT_TIMES = [0, AMBIENT_POSE, 37.3, 101, 953, 3599.9, 86_400];

test('GLSL bodyWorld() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=orbit');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c.maxError]));
  expect([...byName.keys()].sort()).toEqual([...ORBIT_TIMES.map((t) => `orbit: bodyWorld at ${t} s`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
});

// The derps' derp() (`?lib=derp`): C1, its first moon, P1 and R0, all on R0's seed with their own
// phases, and a healthy planet (NODE_NEVER), every 0.0137 s over 0–20 s and at each kind's first two
// events at s 0.1, 0.3, 0.5, 0.65 and 0.85. A sample within a few float32 units of the ambient of a
// hard cut may match the TS only across the cut: the page counts those (`shifted`), and they must
// stay rare. The derps are held to DERP_TOLERANCE, tighter than the other libraries' 1e-3: a moon's
// wobble is a few thousandths of a unit, so 1e-3 would pass most errors in it. Measured: under 5e-6.
const DERP_CASES = ['C1 (planet)', 'C1-m1 (moon)', 'P1 (star)', 'R0 (core)', 'a healthy planet'];
const DERP_TOLERANCE = 1e-4;

test('GLSL derp() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=derp');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...DERP_CASES.map((c) => `derp: ${c}`), 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(DERP_TOLERANCE);
  for (const name of DERP_CASES) {
    const c = byName.get(`derp: ${name}`)!;
    // The grid, and for a cracked body 6 kinds × 2 events × 5 values of s × 3 values of v.
    expect(c.samples, name).toBe(name === 'a healthy planet' ? 1460 : 1460 + 6 * 2 * 5 * 3);
    expect(c.shifted, name).toBeLessThanOrEqual(c.samples! / 100);
  }
});

// The shells' shellWarpK() and spin (`?lib=shell`): every mote of a planet's 14 × 36 lattice (324)
// at 11 seconds of a scatter (none, the sweep, the hold, the return's cuts, the ring, the
// aftershock, calm), for three hash sets, one per cracked body's own seed (shellSeed of C1, C1-m1
// and P1; each its own event, time, gains and cap, a moon's among them), at two shapes in a row.
// Held to 1e-5 R: the equation's wave is 0.02 R, so a looser bound would pass a wrong lobe count or
// phase on it.
const SHELL_CASES = ['C1', 'C1-m1', 'P1'].flatMap((id) => [4, 5].map((n) => `shell: ${id}, shape ${n}`));
const SHELL_TOLERANCE = 1e-5;

test('GLSL shellWarpK() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=shell');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...SHELL_CASES, 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(SHELL_TOLERANCE);
  for (const name of SHELL_CASES) expect(byName.get(name)!.samples, name).toBe(324 * 11);
});

// The level of detail's lodGain() and glowPx() (`?lib=lod`): every element's gain every 0.25 px over
// 0-140 px (each band and both sides of it), with a moon's handover (moonSphereGain, moonPointPx) at
// each size as its diameter; glowPx over two radii, three focal lengths, four caps (the two real ones
// and two that bind) and 96 distances from 0.05 to 4000; and motePx over three mote diameters at 64
// scales from 0.5 to 1000 px per unit, under and over its floor. All are a few float32 operations:
// held to LOD_TOLERANCE, far under a gain step or a pixel. The early-out (re-skin §7): lodSkip over every
// body kind × role × lattice index 0 and 1 × each override × every 0.5 px over 0-200, agreeing exactly
// (a skip is 1 or 0); offScreenReachPx over centres on and off axis, in front and not wholly in front,
// held to REACH_TOLERANCE (CSS px: its reaches run to a few thousand px, where float32 keeps a few
// ten-thousandths); and offScreenSkip over a grid of centres across a phone's screen and 300 px past
// each edge at four reaches, exactly. The neighbourhood's dissolve (re-skin §4.1): hoodGlowPx, hoodReal,
// hoodFar (star.vert.glsl's fade of the far sets, against 1 - hoodReal) and hoodSkip over 64 distances
// from 20 to 2000 at three focal lengths, three holds and every body kind, to LOD_TOLERANCE (a share
// and a glow in px) and exactly (a skip).
const LOD_CASES = ['lod: lodGain', 'lod: glowPx', 'lod: motePx', 'lod: lodSkip', 'lod: offScreenReachPx', 'lod: offScreenSkip', 'lod: hoodReal'];
const LOD_TOLERANCE = 1e-5;
const REACH_TOLERANCE = 1e-2;

test('GLSL lodGain(), glowPx(), the moon handover, motePx(), the early-out and the dissolve match the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=lod');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...LOD_CASES, 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(c.name === 'lod: offScreenReachPx' ? REACH_TOLERANCE : LOD_TOLERANCE);
  expect(byName.get('lod: lodGain')!.samples).toBe(5 * 561);
  expect(byName.get('lod: glowPx')!.samples).toBe(2 * 3 * 4 * 96);
  expect(byName.get('lod: motePx')!.samples).toBe(3 * 64);
  expect(byName.get('lod: lodSkip')!.samples).toBe(4 * 5 * 2 * 4 * 401);
  expect(byName.get('lod: offScreenReachPx')!.samples).toBe(6 * 3 * 2 * 3 * 3);
  expect(byName.get('lod: offScreenSkip')!.samples).toBe(4 * 25 * 37);
  expect(byName.get('lod: hoodReal')!.samples).toBe(3 * 3 * 4 * 64);
});

// The freeze frame's dressing (`?lib=freeze`): freezeCopy() over every copy, three dressings, three
// values of v, both warm modes and the defect moon's or not; freezeLimb() over 24 screen angles at five
// tilts, two lights, the base and a copy; freezeTick() over every mote of both bursts (238) at four
// states of the fix (v, the shell out, the moon's direction: the gap) and both of the twos' length
// sets; freezeTickShow(), freezeTickWarm() (each dash warm or cold) and freezeBreath(). Held to 1e-4:
// lengths are CSS px (up to 50) and angles radians; a wrong term (a 3 px offset, a 26° gap, a dropped
// mote, a dash of the wrong warmth) is far over it.
const FREEZE_CASE = 'freeze: the copies, the limb and the bursts';
const FREEZE_TOLERANCE = 1e-4;

test('GLSL freezeCopy(), freezeLimb() and freezeTick() match the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=freeze');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([FREEZE_CASE, 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(FREEZE_TOLERANCE);
  expect(byName.get(FREEZE_CASE)!.samples).toBe(238 * 2 * 4);
});

// The galaxy's motes in motion, bodyMote() (`?lib=body`): C1 mid-build; C1 and its moons under the
// close shot's lamp, lit, and with the fix landing (the person motes in flight); P1 lit under the lamp
// at full focus; C7 at its fix in the sweep (R0 until the re-skin's Task 5: the core rows draw nothing);
// and 64 motes hashed from every shell and person mote of the galaxy, each system at its own level of
// detail, and the same 64 under the planet, star, core and lineage lamps (nearly all of them dark), and
// under the arms lamp (all of them lit: it darkens only the core rows, which draw nothing); and the stream dots (streamDot and streamGain:
// every stream and the feed, four dots each, at four pairs of net.streams and the lamp; and streamBandMask, the
// text band's mask, at a pixel row about its edge on a phone's and a desktop's height). Each at the
// pose and at 101 s, every field. A sample a few float32 units of the ambient from a derp's cut may
// match the TS only across it, and the page counts those (`shifted`); the pose itself stands half a
// tick of C1-m5's burst jitter off one (ambient.ts).
// A star's dots (re-skin §4.3): P_a's in flight and landed, and P1's mid-scatter, the scatter forced.
const BODY_CASES = [
  'C1 building',
  'C1 and its moons, defect close',
  'C1 and its moons, the fix landing',
  'P1, defect close',
  'P_a, its dots in flight',
  'P_a, its dots landed',
  'P1 scattering',
  'C7 at its fix',
  '64 hashed motes',
  '64 hashed motes, the planet lamp on C1',
  '64 hashed motes, the star lamp on C1',
  '64 hashed motes, the core lamp',
  '64 hashed motes, the lineage lamp on P1',
  '64 hashed motes, the arms lamp',
  'stream dots',
].flatMap((c) => [`body: ${c} at the pose`, `body: ${c} at 101 s`]);
// A star's look (`?lib=star`): starDot() over the 160 dot indices of four seeds, starSpike() over six
// rows of sixteen dots at five glow sizes and three distances (far, half close, close) for a four and a six, starBreath() at four ambients for two
// looks, starTint() over 0..1 by 0.1. Measured: under 1e-6 (the TS and GLSL take the same float32
// inputs; the GLSL's asin and log are within a few float32 units).
const STAR_CASES = ['star: starDot', 'star: starSpike', 'star: starBreath', 'star: starTint'];
const STAR_TOLERANCE = 1e-4;

test('GLSL starDot(), starSpike(), starBreath() and starTint() match the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=star');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...STAR_CASES, 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(STAR_TOLERANCE);
  expect(byName.get('star: starDot')!.samples).toBe(160 * 4);
  expect(byName.get('star: starSpike')!.samples).toBe(6 * 16 * 5 * 3 * 2);
  expect(byName.get('star: starBreath')!.samples).toBe(4 * 2);
  expect(byName.get('star: starTint')!.samples).toBe(11);
});

/**
 * The freeze frame's held cases (freeze-frame §4): C1's piece held at the pin, its scatter forced, the
 * fix not begun (defect 0.33) and landing, mid-retraction (0.39). At the pin only: the hold shows nothing else.
 * The pin stands half a tick of C1-m5's burst jitter off a cut (ambient.ts), so the TS twin and the
 * GLSL agree there at the very ambient: no sample needs the time shift.
 */
const HELD_CASES = ['defect 0.33, C1 held', '0.39, C1 held and fixing'].map((c) => `body: ${c} at the pose`);
// Measured: under 1e-5 for C1, its moons, P1 and R0, and 1.3e-4 for the hashed motes (far systems,
// a hundred units out, where float32 keeps 8e-6 of a unit). A wrong term (a morph at 0.02 R of a
// 0.3-unit planet, a moon's skip) is ten times this or more.
const BODY_TOLERANCE = 5e-4;
/**
 * The track lamp gain (Task 10 review I1): trackLampGain() of every track row under every lamp level at
 * focus 0, 0.5 and 1, GLSL against bodyMote.ts. The planet lamp's own-orbit rule is the mirror pair's.
 */
const TRACK_LAMP_CASE = 'body: track lamp gain';

test('GLSL bodyMote() matches the TS reference', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=body');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...BODY_CASES, ...HELD_CASES, TRACK_LAMP_CASE, 'hash01', 'pcg goldens'].sort());
  for (const name of HELD_CASES) {
    expect(byName.get(name)!.samples, name).toBeGreaterThan(100);
    expect(byName.get(name)!.shifted, name).toBe(0);
  }
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(BODY_TOLERANCE);
  for (const name of BODY_CASES) {
    const c = byName.get(name)!;
    expect(c.samples, name).toBeGreaterThan(name.startsWith('body: 64') ? 63 : 20);
    if (!name.startsWith('body: stream')) expect(c.shifted, name).toBeLessThanOrEqual(Math.max(2, c.samples! / 50));
  }
  expect(byName.get('body: 64 hashed motes at the pose')!.samples).toBe(64);
  // Every track row under seven lamps at three foci (the planet's own orbit and the moon tracks).
  expect(byName.get(TRACK_LAMP_CASE)!.samples).toBeGreaterThan(7 * 3 * 100);
});

// The black hole's twins (`?lib=hole`, re-skin Task 4): holeLens() over both images, in front of and
// behind the hole, inside and outside the shadow, on the axis and past the view's edge; diskDot() over
// a uniform sample of the disk's streak and haze dots through both images, and dots chosen across a
// life boundary and in a hot life; ringDot(), jetDot(), knotDot() under the fronts (0, 0), (1, 0),
// (1, 1) and (0.5, 0.2), infallDot(), strandDot() for both strands at R1's strand1 0, 0.3, 0.6 and 1 ×
// heat 1, 0.4 and 0, and strandJoin() for both. Each at the ambients 0, the pose, 101 and 3599.9, from
// two cameras (elevation 16 at 75, framed as the inspector; elevation 82 at 210), every HoleOut field.
// Positions are world units (after the float-safe phase reduction), colours, alpha and the ember flag
// shares, sizes CSS px: all to 1e-3. holeLens's ok to 1e-4.
const HOLE_CASES = ['holeLens', 'diskDot', 'ringDot', 'jetDot', 'knotDot', 'infallDot', 'strandDot', 'strandJoin'].map((c) => `hole: ${c}`);
const HOLE_TOLERANCE = 1e-3;
const HOLE_LENS_OK = 'hole: holeLens ok';
/** holeLens's points (holeCases.ts LENS_POINTS). */
const HOLE_LENS_POINTS = 12;

test('GLSL hole twins match the TS reference (?lib=hole)', async ({ page }) => {
  const { errors, ...parity } = await runParity(page, '&lib=hole');
  expect(errors).toEqual([]);
  expect(parity.error).toBeUndefined();
  const byName = new Map(parity.cases.map((c) => [c.name, c]));
  expect([...byName.keys()].sort()).toEqual([...HOLE_CASES, HOLE_LENS_OK, 'hash01', 'pcg goldens'].sort());
  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(c.name === HOLE_LENS_OK ? 1e-4 : HOLE_TOLERANCE);
  // Each part's inputs × the 4 ambients × the 2 cameras.
  expect(byName.get('hole: holeLens')!.samples).toBe(HOLE_LENS_POINTS * 2 * 4 * 2);
  expect(byName.get('hole: diskDot')!.samples).toBeGreaterThan(600 * 2 * 4 * 2);
  expect(byName.get('hole: ringDot')!.samples).toBe(320 * 4 * 2);
  expect(byName.get('hole: jetDot')!.samples).toBe(1200 * 4 * 2);
  expect(byName.get('hole: knotDot')!.samples).toBe(768 * 4 * 4 * 2);
  expect(byName.get('hole: infallDot')!.samples).toBe(72 * 4 * 2);
  expect(byName.get('hole: strandDot')!.samples).toBe(250 * 4 * 3 * 4 * 2);
  expect(byName.get('hole: strandJoin')!.samples).toBe(2 * 4 * 2);
});
