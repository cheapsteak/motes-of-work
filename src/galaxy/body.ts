// The galaxy's bodies (design: docs/specs/2026-10-07-galaxy-orbits.md §12-§14, and the lattice of
// docs/specs/2026-10-07-morph-and-scatter.md §7): the four kinds, their sizes and counts, the lattice
// each shell is drawn on, and the orbital elements of everything that goes round something. Pure:
// every draw takes its random numbers from the caller, so a layout is a function of the seed.
import { STAR_LOOK } from '../scene/node/classLook';

/**
 * The core is the rules, a star is a plan, a planet with its moons is a piece of code (§14.1). A
 * barycentre (`bary`) is the point a bound pair of stars goes round (re-skin Task 1e): it has the
 * pair's spot and draws nothing.
 */
export type BodyKind = 'core' | 'star' | 'planet' | 'moon' | 'bary';

/**
 * A Kepler orbit round a parent (§12.1): an ellipse of semi-major axis `a` and eccentricity `e`, whose
 * apoapsis is the designed radius `r`, in a plane tilted by `tilt` about the horizontal axis at azimuth
 * `tiltAz`, its periapsis at `omega0` turning once every `precession` ambient seconds, and the body
 * going round once every `period` seconds from mean anomaly `phase` (in turns) at ambient 0.
 */
export interface OrbitElements {
  r: number;
  a: number;
  e: number;
  tilt: number;
  tiltAz: number;
  omega0: number;
  precession: number;
  period: number;
  phase: number;
}

/** A core body's radius (a rule), a star's (a plan), and the planet radius the story pins (N0, C1, C5). */
export const CORE_R = 1.4,
  STAR_R = 0.9,
  PLANET_R_PIN = 0.3;

/**
 * Lattice shells as [rows, cols]: the hero planet's (6,116 motes). A star has no lattice: its shell
 * motes are a cloud of dots (STAR_DOTS, src/scene/node/classLook.ts). Nor has a core row since the
 * re-skin's Task 5: it draws nothing, the black hole in its place (its 22 × 64, 900 motes, went).
 */
export const LATTICE = { hero: [60, 160] } as const;

/**
 * A star's own look (re-skin §4.3), drawn per star: its `brightness` (it scales the star's light and
 * lengthens its spikes), its spikes (6 from STAR_LOOK.sixFrom up, else 4), its `temperature` (its tint
 * from white to amber), and its breath's `period` (s) and `phase` (turns).
 */
export interface StarLook {
  brightness: number;
  spikes: 4 | 6;
  temperature: number;
  period: number;
  phase: number;
}

/** A star's look from its stream (`starLook`): brightness, temperature, period and phase, four draws in that order. */
export function starLook(rng: () => number): StarLook {
  const [b0, b1] = STAR_LOOK.brightness;
  const [p0, p1] = STAR_LOOK.breathPeriod;
  const brightness = b0 + (b1 - b0) * rng();
  const temperature = rng();
  const period = p0 + (p1 - p0) * rng();
  const phase = rng();
  return { brightness, spikes: brightness >= STAR_LOOK.sixFrom ? 6 : 4, temperature, period, phase };
}

/**
 * The points in each row of a [rows, cols] lat/long lattice: row i sits at latitude
 * `−π/2 + π (i + 0.5) / rows` and holds `max(6, round(cols cos lat))` points, so the spacing along a
 * row is about the same at every latitude.
 */
export function latticeRowCols(rows: number, cols: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < rows; i++) {
    const lat = -Math.PI / 2 + (Math.PI * (i + 0.5)) / rows;
    out.push(Math.max(6, Math.round(cols * Math.cos(lat))));
  }
  return out;
}

/** All the points of a [rows, cols] lattice. */
export function latticeCount(rows: number, cols: number): number {
  return latticeRowCols(rows, cols).reduce((s, n) => s + n, 0);
}

/** A planet's lattice: 14 × 36 at the pinned 0.30, scaled with the radius so the density holds (§13). */
export function planetLattice(R: number): [number, number] {
  return [Math.max(5, Math.round((14 * R) / 0.3)), Math.max(10, Math.round((36 * R) / 0.3))];
}

/** The fewest rows and columns a moon's lattice has, so that the smallest moon is still a sphere of motes. */
export const MOON_LATTICE_MIN = [3, 6] as const;

/**
 * A moon's lattice, `R` its radius and `Rp` and `planet` its planet's radius and lattice: its
 * planet's row and column pitch, so a moon is a small sphere of its planet's material, its motes its
 * planet's grain (bodyAttrs.ts sizes a mote by its row pitch); never under MOON_LATTICE_MIN, where a
 * moon's grain is finer than its planet's.
 */
export function moonLattice(R: number, Rp: number, planet: readonly [number, number]): [number, number] {
  return [Math.max(MOON_LATTICE_MIN[0], Math.round((planet[0] * R) / Rp)), Math.max(MOON_LATTICE_MIN[1], Math.round((planet[1] * R) / Rp))];
}

/** Planets round a star (§13): 2–9, most systems 2–5 and a few crowded. */
export function planetCount(u: number): number {
  return 2 + Math.floor(8 * u * u);
}

/** The innermost planet orbit (apoapsis), and the bound no planet orbit passes. */
export const PLANET_ORBIT_FIRST = 2.2;
export const PLANET_ORBIT_MAX = 9.6;

/**
 * The apoapses of a star's `n` planet orbits (§13): from 2.2 out to `5.5 + 4.1 (n − 2) / 7`, so a
 * sparse system is compact and a crowded one reaches 9.6 and never past it. Each gap is the even gap
 * jittered by ±15 %, and the gaps are then scaled together so the last orbit lands on its radius.
 */
export function planetOrbitRadii(n: number, rng: () => number): number[] {
  const last = 5.5 + (4.1 * (n - 2)) / 7;
  if (n <= 1) return [PLANET_ORBIT_FIRST];
  const gaps = Array.from({ length: n - 1 }, () => 1 + 0.15 * (2 * rng() - 1));
  const scale = (last - PLANET_ORBIT_FIRST) / gaps.reduce((s, x) => s + x, 0);
  const radii = [PLANET_ORBIT_FIRST];
  for (let k = 0; k < n - 2; k++) radii.push(radii[k] + gaps[k] * scale);
  radii.push(last);
  return radii;
}

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** A planet's radius from a unit normal `g` (§13): log-normal about 0.22, clamped to 0.14–0.50. */
export function planetRadius(g: number): number {
  return clamp(0.22 * Math.exp(0.5 * g), 0.14, 0.5);
}

/** Moons round a planet (§13): none with probability 0.45, else 1 plus a geometric count, at most 6. */
export function moonCount(u0: number, u1: number): number {
  return u0 < 0.45 ? 0 : Math.min(6, 1 + Math.floor(-Math.log(Math.max(1e-6, u1)) / 0.7));
}

/** A moon's radius from a unit normal `g` (§13): log-normal about 0.12 of its planet's, in [0.04, 0.35 Rp]. */
export function moonRadius(Rp: number, g: number): number {
  return clamp(0.12 * Rp * Math.exp(0.45 * g), 0.04, 0.35 * Rp);
}

/**
 * The track of moon `i` of `n` (§13): the tracks hold `ceil(n/3)`, `ceil((n − 1)/3)` and `floor(n/3)`
 * moons, inner to outer, filled in order (the bike's seven: 3 / 2 / 2).
 */
export function moonTrack(i: number, n: number): 0 | 1 | 2 {
  const c0 = Math.ceil(n / 3);
  const c1 = Math.ceil((n - 1) / 3);
  return i < c0 ? 0 : i < c0 + c1 ? 1 : 2;
}

/** The three moon tracks' apoapses in planet radii, and their periods in ambient seconds. */
export const MOON_TRACK = [1.3, 1.9, 2.5],
  MOON_PERIOD = [6, 9, 12];

/** A planet's period from its orbit (§1.2's 60 s at 2.4 to 180 s at 8.8, on the same line). */
export function planetPeriod(r: number): number {
  return 60 + 18.75 * (r - 2.4);
}

/** The bands of §12.1's seeded elements, by kind. */
const ORBIT_BANDS = {
  planet: { e: [0.05, 0.22], tilt: 0.25, precession: [400, 900] },
  moon: { e: [0.05, 0.12], tilt: 0.2, precession: [90, 200] },
} as const;

/**
 * The orbital elements of a body whose orbit has apoapsis `r` and the given period (§12.1): the
 * eccentricity, tilt and precession drawn in the kind's band, the tilt's azimuth, the periapsis and
 * the starting phase uniform. Six draws, in a fixed order.
 */
export function orbitFor(kind: 'planet' | 'moon', r: number, period: number, rng: () => number): OrbitElements {
  const band = ORBIT_BANDS[kind];
  const e = band.e[0] + (band.e[1] - band.e[0]) * rng();
  const tilt = band.tilt * (2 * rng() - 1);
  const tiltAz = 2 * Math.PI * rng();
  const omega0 = 2 * Math.PI * rng();
  const precession = band.precession[0] + (band.precession[1] - band.precession[0]) * rng();
  const phase = rng();
  return { r, a: r / (1 + e), e, tilt, tiltAz, omega0, precession, period, phase };
}

/**
 * The neighbourhood's binary stars (re-skin Task 1e: S-type, each star keeping its own planets inside
 * its stability limit, the two going round their barycentre):
 *  - `pairK`: a close pair is two filler stars, each the other's nearest in the neighbourhood as Task
 *    1d packs it (systems at least HOOD_SPACING 1.5 × their outer radii plus a margin apart), nearer
 *    than this × their combined outer radii. 2.2, not the mock's 1.35, which it measured in the packing
 *    before Task 1d (outer radii plus the margin apart): at 1.5 × spacing no two systems are nearer
 *    than 1.5 ×, and Task 1d's mutual-nearest filler pairs stand 1.55-2.18 × apart over seeds 1-40
 *    (18-33 units), so 2.2 admits the closest of them, and the pair's barycentre falls between two of
 *    Task 1d's spots;
 *  - `share`, `max`: each close pair, closest first (by that ratio), is kept with this seeded chance,
 *    at most this many;
 *  - `a`: the pair's separation (semi-major axis of the relative orbit) is the two stars' distance in
 *    Task 1d's packing, clamped to this;
 *  - `e`: its eccentricity, seeded in this range;
 *  - `floorShare`: a binary star's designed spacing (nominalRadii) is scaled so its last floor sits at this × its limit;
 *  - `grow`: if either star cannot keep one planet, the separation grows by this and the fit runs again;
 *  - `eMax`: a planet's eccentricity with the forced term added, capped;
 *  - `nudgeMax`: a pair too near another system is nudged at most this far off its barycentre, or
 *    stays two single stars;
 *  - `quicken`: a planet's precession is quickened by 1 + quicken (r / limit)³. Stylised, a design
 *    choice: it only says that a planet near the limit is perturbed faster than one deep inside it;
 *  - `kep`: the stars' Kepler constant, matched to planetPeriod at r = 5 (planetPeriod(5) / 5^1.5 ≈ 9.727),
 *    so a pair of separation a goes round in `kep · a^1.5` ambient seconds.
 */
export const BIN = {
  pairK: 2.2,
  share: 0.8,
  max: 4,
  a: [16, 26],
  e: [0.1, 0.4],
  floorShare: 0.92,
  grow: 1.03,
  eMax: 0.4,
  quicken: 2,
  nudgeMax: 12,
  kep: 108.75 / 5 ** 1.5,
} as const;

/**
 * The S-type stability limit (Holman & Wiegert 1999, AJ 117, 621, eq. 1): the largest stable
 * semi-major axis of a planet round one star of a binary, as a share of the binary's semi-major axis,
 * for the mass ratio `mu` = m_other / (m_host + m_other) and the binary's eccentricity `e`. The paper's
 * least-squares fit to test particles started on circular, coplanar orbits and integrated for 10^4
 * binary periods; good to 4 % typically and 11 % at worst over 0.1 ≤ μ ≤ 0.9 and 0 ≤ e ≤ 0.8.
 */
export function hwS(mu: number, e: number): number {
  return 0.464 - 0.38 * mu - 0.631 * e + 0.586 * mu * e + 0.15 * e * e - 0.198 * mu * e * e;
}

/**
 * The forced eccentricity of a planet of semi-major axis `a` round one star of a binary of semi-major
 * axis `aB` and eccentricity `eB` (Heppenheimer 1978, A&A 65, 421, eq. 4: a planet started circular
 * swings between 0 and twice this): 5/4 (a / aB) eB / (1 − eB²).
 */
export function forcedEccentricity(a: number, aB: number, eB: number): number {
  return (1.25 * (a / aB) * eB) / (1 - eB * eB);
}

/**
 * A star's mass from its brightness: 0.5 + 0.7 (brightness − 0.5) / 0.5. A stand-in (the essay has no
 * masses): the brighter star is the heavier. It sets only a binary's mass ratio.
 */
export function starMass(brightness: number): number {
  return 0.5 + (0.7 * (brightness - 0.5)) / 0.5;
}

/** A binary's period (ambient s) for its separation `aB`: BIN.kep · aB^1.5. */
export function binaryPeriod(aB: number): number {
  return BIN.kep * aB ** 1.5;
}

/** The glow sprites' caps in CSS px (galaxy §4): a star's (a plan's). A core body's (24) went with its bodies (re-skin Task 5). */
export const GLOW_CAP = { star: 18 } as const;
/** A glow sprite's diameter is GLOW_SCALE times its body's radius on screen, never under GLOW_MIN_PX (CSS px). */
export const GLOW_SCALE = 5,
  GLOW_MIN_PX = 5;

/**
 * A star's or core body's glow sprite, in CSS px: `clamp(5 R focal / d, 5, cap)` for a body of radius
 * `R` at distance `d` seen through a focal length of `focalPx` (CSS px, vertical fov). The halo
 * inside it reaches half of it. The renderer and the background's clearance both size it here, and
 * src/scene/node/lod.glsl mirrors it from the same two constants.
 */
export function glowPx(R: number, d: number, focalPx: number, cap: number): number {
  return Math.min(cap, Math.max(GLOW_MIN_PX, (GLOW_SCALE * R * focalPx) / d));
}
