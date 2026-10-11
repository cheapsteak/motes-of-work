// Reference implementation of the galaxy's orbits (docs/specs/2026-10-07-galaxy-orbits.md §12.1,
// §14.2, §2.1's turn): a planet goes round its star and a moon round its planet on a Kepler ellipse
// that precesses, in a plane tilted out of the galaxy's; a binary's two stars go round their
// barycentre on Kepler ellipses that do not precess (re-skin Task 1e); the core, a single star and a
// barycentre sit at their spots; and the whole galaxy turns rigidly about its core. The GLSL in orbit.glsl mirrors this step for
// step; the parity page (`?lib=orbit`) compares them. Only operations GLSL has are used. Both mirrors
// read GALAXY_TURN_PERIOD from birth.ts (spliced into the GLSL) and the same packed bodies texture
// (bodyData.ts). Every term is a function of the ambient clock `t` and the texture: nothing is
// integrated.
//
// Conventions. The galaxy's plane is x–z with y up, and a bearing is atan2(z, x), as the background
// (src/galaxy/background.ts). An orbit's angle in its plane runs with the bearing: its periapsis is at
// bearing ω, and a body moves from ω toward ω + π/2. The plane is then tilted by `tilt` about the
// horizontal axis at bearing `tiltAz`: a point a distance w across that axis rises by w sin(tilt).
// The galaxy turns the other way, against the bearing (a point at bearing b is at b − turn), so its
// arms, which wind outward with the bearing, trail.
//
// Every angle (M, ω and the galaxy's turn) is reduced to one turn before it is scaled to radians
// (orbitTurns): with a moon's 6 s period, 2π t / P at an hour is a thousand radians, and float32
// would lose a thousandth of a radian of it; the turn is small by comparison, but it swings points a
// hundred units from N0, so a day in its unreduced float32 angle is off by several thousandths of a
// unit. The remainder `t − k P` (k = floor(t / P)) is the same angle to within whole turns, so M, ω
// and the turn are §12.1's and §2.1's formulas exactly. It is taken Cody-Waite style, as moteSinCos
// reduces by π/2, so float32 keeps it to the precision of `t` itself: P splits into a head of its top
// ORBIT_HEAD_BITS significant bits (birth.ts) and the tail left over; k times the head is exact in
// float32 (for k below 2^15, a day of a moon's 6 s period), and only k times the small tail rounds.
// A plain `mod(t, P)` rounds `k P` by up to half a unit in the last place of `t`, which a day in is
// 4 ms: a planet's whole 1e-3 of parity. The TS works in float64, where the split changes nothing,
// but takes the same steps.
import type { Vec3 } from '../../math/vec';
import type { OrbitElements } from '../../galaxy/body';
import { GALAXY_TURN_PERIOD, ORBIT_HEAD_BITS } from './birth';
import { bodyTexel, type BodyData } from './bodyData';

export { GALAXY_TURN_PERIOD };

const TAU = 6.283185307179586;

/** GLSL's fract(x). */
const fract = (x: number): number => x - Math.floor(x);

/**
 * A positive `p` cut toward zero to its top ORBIT_HEAD_BITS significant bits: what the GLSL's
 * ORBIT_HEAD_MASK gives of the float32's bits.
 */
function orbitHead(p: number): number {
  const unit = 2 ** (Math.floor(Math.log2(p)) - (ORBIT_HEAD_BITS - 1));
  return Math.floor(p / unit) * unit;
}

/** How far into its period `period` the clock `t` is, in turns: (t − k period) / period, k = floor(t / period). */
export function orbitTurns(t: number, period: number): number {
  const k = Math.floor(t / period);
  const head = orbitHead(period);
  return (t - k * head - k * (period - head)) / period;
}

/** The eccentric anomaly E with E − e sin E = M: three Newton steps from E0 = M + e sin M. */
export function keplerE(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 3; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

/** The elements orbitLocal reads (`OrbitElements` without the designed apoapsis `r`). */
export type OrbitParams = Pick<OrbitElements, 'a' | 'e' | 'tilt' | 'tiltAz' | 'omega0' | 'precession' | 'period' | 'phase'>;

/**
 * A body's place relative to what it goes round, at ambient `t` (§12.1):
 *  - mean anomaly `M = phase·2π + 2π t / period` (phase in turns), eccentric anomaly `E` by keplerE,
 *    so the radius is `a (1 − e cos E)` at true anomaly ν: faster near periapsis;
 *  - the periapsis at bearing `ω(t) = ω0 + 2π t / precession`, or held at ω0 for `precession` 0 (a
 *    binary's stars round their barycentre, whose ellipses do not turn);
 *  - the plane tilted by `tilt` about the horizontal axis at bearing `tiltAz`.
 */
export function orbitLocal(o: OrbitParams, t: number): Vec3 {
  const M = TAU * fract(o.phase + orbitTurns(t, o.period));
  const E = keplerE(M, o.e);
  // In the orbit's own frame, periapsis along the first axis: (a (cos E − e), a √(1 − e²) sin E),
  // which is the radius a (1 − e cos E) at the true anomaly ν.
  const px = o.a * (Math.cos(E) - o.e);
  const py = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
  // The periapsis at bearing ω, in the galaxy's plane; precession 0 is none (a binary's stars).
  const w = o.precession === 0 ? o.omega0 : o.omega0 + TAU * orbitTurns(t, o.precession);
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const x = px * cw - py * sw;
  const z = px * sw + py * cw;
  // The tilt: u along the axis k = (cos az, 0, sin az), v across it along m = (−sin az, 0, cos az);
  // the plane turns about k, so v leans by `tilt` toward +y.
  const ca = Math.cos(o.tiltAz);
  const sa = Math.sin(o.tiltAz);
  const u = x * ca + z * sa;
  const v = -x * sa + z * ca;
  const h = v * Math.cos(o.tilt);
  return [u * ca - h * sa, v * Math.sin(o.tilt), u * sa + h * ca];
}

/** The galaxy's rigid turn at ambient `t`, in radians: 2π t / GALAXY_TURN_PERIOD, reduced to one turn, in [0, 2π). */
export function galaxyTurn(t: number): number {
  return TAU * orbitTurns(t, GALAXY_TURN_PERIOD);
}

/** Row `row`'s orbital elements as the texture holds them (T1, T2): what both mirrors read. */
export function elementsAt(data: BodyData, row: number): OrbitParams {
  const [a, e, tilt, tiltAz] = bodyTexel(data.bodies, 1, row);
  const [omega0, precession, period, phase] = bodyTexel(data.bodies, 2, row);
  return { a, e, tilt, tiltAz, omega0, precession, period, phase };
}

/**
 * A body's place in the galaxy's own frame (before the turn) at ambient `t`: up its host chain (a
 * moon round its planet, a planet round its star, a binary's star round its barycentre), adding each
 * orbit, to a body that sits at its spot (a single star, a barycentre or a core body). At most three
 * hops: a moon of a binary star's planet is three from its barycentre.
 */
export function bodyGalactic(data: BodyData, row: number, t: number): Vec3 {
  const p: Vec3 = [0, 0, 0];
  let r = row;
  for (let i = 0; i < 3; i++) {
    const host = bodyTexel(data.bodies, 3, r)[0];
    if (host < 0) break;
    const local = orbitLocal(elementsAt(data, r), t);
    p[0] += local[0];
    p[1] += local[1];
    p[2] += local[2];
    r = Math.round(host);
  }
  const spot = bodyTexel(data.bodies, 0, r);
  return [p[0] + spot[0], p[1] + spot[1], p[2] + spot[2]];
}

/**
 * A body's place in the world at ambient `t`: the galaxy turned rigidly by galaxyTurn(t) about its
 * core, anchored at N0 (`turn(galactic) − turn(galactic(N0))`, ruling 6), so N0 is the origin at
 * every `t` and the bike's planet never drifts from the camera before the reflow. The turn is about
 * +y, against the bearing.
 */
export function bodyWorld(data: BodyData, row: number, t: number): Vec3 {
  // −0 is its own ambient to the arithmetic, but not to a Map: it is never cached.
  if (Object.is(t, -0)) return bodyWorldAt(data, row, t);
  let byT = worldCache.get(data.bodies);
  if (!byT) worldCache.set(data.bodies, (byT = new Map()));
  let at = byT.get(t);
  if (!at || at.n0Row !== data.n0Row) {
    if (!at && byT.size >= WORLD_CACHE_AMBIENTS) byT.delete(byT.keys().next().value as number);
    byT.set(t, (at = { n0Row: data.n0Row, rows: [] }));
  }
  const p = (at.rows[row] ??= bodyWorldAt(data, row, t));
  return [p[0], p[1], p[2]];
}

/**
 * bodyWorld's places, by the body texture they were read from and the ambient: a place is a function of
 * the texture, N0's row and the ambient alone, and the TS twins ask for the same rows at the same few
 * ambients (AMBIENT_GRID) over and over (each of a body's motes reads its own place and its parent's,
 * at every sample of a sweep). Each answer is a copy, so no caller can change what is kept. The most
 * recent WORLD_CACHE_AMBIENTS ambients per texture.
 */
const WORLD_CACHE_AMBIENTS = 16;
const worldCache = new WeakMap<Float32Array, Map<number, { n0Row: number; rows: Vec3[] }>>();

function bodyWorldAt(data: BodyData, row: number, t: number): Vec3 {
  const b = bodyGalactic(data, row, t);
  const n0 = bodyGalactic(data, data.n0Row, t);
  const d: Vec3 = [b[0] - n0[0], b[1] - n0[1], b[2] - n0[2]];
  const a = galaxyTurn(t);
  const c = Math.cos(a);
  const s = Math.sin(a);
  // `+ 0` only turns a −0 into 0, so N0's place compares equal to the origin.
  return [d[0] * c + d[2] * s + 0, d[1] + 0, -d[0] * s + d[2] * c + 0];
}

/**
 * A point of the galaxy's own frame (a background star, the galactic centre, the neighbourhood's
 * middle) in the world at ambient `t`: the frame bodyWorld puts a body in, turned with the galaxy and
 * anchored at N0. TS only: the shaders take it as the background's model matrix (galaxySystem.ts).
 */
export function galacticToWorld(data: BodyData, p: readonly number[], t: number): Vec3 {
  const n0 = bodyGalactic(data, data.n0Row, t);
  const d: Vec3 = [p[0] - n0[0], p[1] - n0[1], p[2] - n0[2]];
  const a = galaxyTurn(t);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [d[0] * c + d[2] * s + 0, d[1] + 0, -d[0] * s + d[2] * c + 0];
}
