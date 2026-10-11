// The galaxy's body set as instances (docs/specs/2026-10-07-galaxy-orbits.md §1.2-§1.3, §3, §4,
// §12.2, §14.4, §15; the re-skin's §4.3): every body's shell motes (`net-shells`: a lattice's, or a
// star's dots), the person's warm motes of every body that carries the defect (`net-persons`), one
// glow sprite per star (`net-glow`), each star's spike dots (`net-spikes`), the dotted orbits and
// tracks (`net-tracks`), one icosphere per planet and moon and a ghost per cracked planet or moon
// (`net-bodies`); the core rows draw nothing (re-skin Task 5: the black hole in their place), and the stream dots and the reviewer's feed (`net-streams`, `net-feed`),
// packed straight into the typed arrays the instanced attributes hold; the per-body shell texture the
// shaders read (its shapes, spin axis, morph amplitude, mote size and seed, and its scatter's sweep);
// and the constants every galaxy shader shares (glslGalaxyConstants, spliced in by shaderSource.ts).
import { STAR_SPIKE_DOTS, STREAM_DOTS, streamDots, SYS_MAX, TRACK_DOTS, type Body, type Galaxy } from '../../galaxy/generate';
import { RING } from '../../galaxy/review';
import { hash01, pcg } from '../../math/hash';
import { SALT } from '../../math/salts';
import { EQ_A, FREEZE_TICK_MOON, FREEZE_TICK_PLANET, NODE_NEVER, NodeRole } from './birth';
import { BODY_KIND } from './bodyData';
import { STAR_LOOK } from './classLook';
import { PLANET_POINT_PX, PX, TRACK_DOT_PX } from './lod';
import { latticeLL, shapeAt, shapeUniforms, shellEvent, shellSeed, spinAxis } from './shell';

/** At most this many glow sprites (the stars; the core's bodies had them until the re-skin's Task 5), the length of `uGlowCap`. */
export const GLOW_MAX = SYS_MAX + 8;

/**
 * How the galaxy's motes and bodies look (galaxy §1.3, §3.1, §4): a shell mote's diameter as a share
 * of its lattice's row pitch, and its brightness; the radius on screen (CSS px) over which a star's or
 * a core body's shell comes in, from nothing at the first (where its hundreds of motes would pile into
 * one white pixel, and its glow sprite stands for it) to full at the second; how much light a shell's
motes may pile up where they overlap (a shell of N motes of px CSS px on a disc of radius r px draws
each at most `density π r² / (N/2 · px²)`, so a dense lattice seen small is a disc in its own blue,
not a white blot); a planet's point's brightness; a dotted orbit's dot
 * (world diameter) and brightness; a glow sprite's brightness; and the icosphere's rim
 * `rim (1 − |n·v|)^rimPow` over its faint fill, a moon's as its planet's (a moon is a small sphere of
 * its planet's material, galaxy §1.3). Lit (galaxy §14.4), a glow sprite's
 * core fills to a crisp ember disc of `litCore` of its radius (galaxyMote.frag.glsl's LIT_CORE), and a
 * planet's point grows to an ember disc of `litPoint` of the planet's own disc on screen, between
 * `litPointMin` (over PX.litPlanet's floor, so that the smallest lit planet is a point a reader and
 * test 12 can count) and `litPointMax` CSS px, `litPointGain` as bright, so its 1 px edge is ember too,
 * over its shell dimmed to `litDust` (galaxy §14.4: "a 3 px ember point ... and its ember dust"); the
 * two hand back to the lit shell as the planet grows from 2 to 4 times `litPointMax` across. A lit
 * star reads as an ember disc with its glow, a lit planet as an ember point.
 */
export const BODY_LOOK = {
  dotShare: 0.5,
  shellBrightness: 0.7,
  shellFadeFrom: 1,
  shellFadeTo: 3,
  density: 4,
  pointBrightness: 0.9,
  trackDot: 0.02,
  trackBrightness: 0.8,
  glowBrightness: 0.9,
  rim: 0.55,
  rimPow: 2.6,
  fill: 0.035,
  litCore: 0.75,
  litPoint: 0.8,
  litPointMin: 5,
  litPointMax: 7,
  litPointGain: 1.75,
  litDust: 0.35,
} as const;

/**
 * A body's shell motes' world diameter (shell.vert.glsl's motePx reads it from T3): BODY_LOOK.dotShare
 * of its row pitch, or a star's dot's (STAR_LOOK.dotDiameter: a star has no lattice).
 */
export function shellMoteDiameter(b: Pick<Body, 'kind' | 'R' | 'lattice'>): number {
  if (b.kind === 'star' || b.lattice === null) return STAR_LOOK.dotDiameter;
  return (BODY_LOOK.dotShare * Math.PI * b.R) / Math.max(1, b.lattice[0]);
}

/** Each body's system: its index in `g.systems` (its star's), or −1 for the core and a barycentre. */
export function systemIndexOf(g: Galaxy): Int32Array {
  const sysOfStar = new Map(g.systems.map((row, i) => [row, i]));
  const out = new Int32Array(g.bodies.length);
  g.bodies.forEach((b, i) => (out[i] = b.star < 0 ? -1 : (sysOfStar.get(b.star) ?? -1)));
  return out;
}

/**
 * Each system's unit (re-skin Task 1e): the index in `g.units` of its star's, a binary's two stars
 * sharing their barycentre's. In `g.systems` order: what detailPx counts as one for its at-most-two rule.
 */
export function unitIndexOf(g: Galaxy): number[] {
  const unitOf = new Map(g.units.map((row, i) => [row, i]));
  return g.systems.map((row) => unitOf.get(g.bodies[row].host >= 0 ? g.bodies[row].host : row)!);
}

/** Instances of one of the quad sets: the count and each attribute's packed values (bodyMote.ts BodyMoteAttrs). */
export interface QuadSet {
  count: number;
  /** Per instance: (lat, lon) on its body's lattice. */
  ll: Float32Array;
  /** Per instance: (row, role, system, index): its body's row, NodeRole, system (−1 the core), and its lattice index (or glow slot). */
  mote: Float32Array;
  /** Per instance: (birth, seed, host, 0): its own hash in the shell's landing order, its spread's seed, and its stream (or a person mote's host). */
  flight: Float32Array;
}

/** A mote's spread seed: its body's seed and its index folded through `pcg`, kept to 24 bits so it survives a float attribute. */
export function moteSeed(bodySeed: number, index: number, person: boolean): number {
  return pcg((pcg(bodySeed >>> 0) ^ (index * 2 + (person ? 1 : 0))) >>> 0) & 0xffffff;
}

/**
 * Every body's shell motes, body by body in row order, each lattice in its own order (latticeLL):
 * a moon's are NodeRole.Moon, every other body's NodeRole.Builder. A planet's mote 0 is its point. A
 * star's are its dots, placed in the shader from their index and seed (star.ts starDot): their
 * (lat, lon) is unused, 0. A builder flies its body's main stream in, a moon's mote its planet's;
 * each lands at its own hash in the order its shell wraps (bodyMote.ts).
 */
export function buildShellAttrs(g: Galaxy): QuadSet {
  const count = g.bodies.reduce((n, b) => n + b.motes, 0);
  const ll = new Float32Array(count * 2);
  const mote = new Float32Array(count * 4);
  const flight = new Float32Array(count * 4);
  const sys = systemIndexOf(g);
  let at = 0;
  for (const b of g.bodies) {
    const lattice = b.lattice;
    const role = b.kind === 'moon' ? NodeRole.Moon : NodeRole.Builder;
    const stream = (b.kind === 'moon' ? g.bodies[b.host].stream : b.stream) ?? -1;
    const bodySeed = shellSeed(b.id);
    for (let i = 0; i < b.motes; i++, at++) {
      if (lattice) {
        const p = latticeLL(i, lattice[0], lattice[1]);
        ll[at * 2] = p.lat;
        ll[at * 2 + 1] = p.lon;
      }
      mote.set([b.index, role, sys[b.index], i], at * 4);
      const seed = moteSeed(bodySeed, i, false);
      flight.set([hash01(seed, SALT.bodyBirth), seed, stream, 0], at * 4);
    }
  }
  return { count, ll, mote, flight };
}

/**
 * The person's warm motes (galaxy §14.4; freeze-frame's split: C1's planet 70, the moon the freeze
 * holds 20, its other moons 6 each): `personMotes` of every body that carries the defect, body by body
 * in row order, each resting at a hashed point of its body's sphere, which is its host (bodyMote.ts).
 */
export function buildPersonAttrs(g: Galaxy): QuadSet {
  const count = g.bodies.reduce((n, b) => n + b.personMotes, 0);
  const ll = new Float32Array(count * 2);
  const mote = new Float32Array(count * 4);
  const flight = new Float32Array(count * 4);
  const sys = systemIndexOf(g);
  let at = 0;
  for (const b of g.bodies) {
    const bodySeed = shellSeed(b.id);
    for (let k = 0; k < b.personMotes; k++, at++) {
      const seed = moteSeed(bodySeed, k, true);
      ll[at * 2] = Math.asin(2 * hash01(seed, SALT.personLat) - 1);
      ll[at * 2 + 1] = 2 * Math.PI * hash01(seed, SALT.personLon);
      mote.set([b.index, NodeRole.Person, sys[b.index], k], at * 4);
      flight.set([0, seed, b.index, 0], at * 4);
    }
  }
  return { count, ll, mote, flight };
}

/** One glow sprite per star (none for a core row, re-skin Task 5), in row order; its glow slot (its index into `uGlowCap`) as its index. */
export function buildGlowAttrs(g: Galaxy): QuadSet & { rows: number[] } {
  const rows = g.bodies.filter((b) => b.kind === 'star').map((b) => b.index);
  if (rows.length > GLOW_MAX) throw new Error(`${rows.length} glow sprites exceed GLOW_MAX ${GLOW_MAX}`);
  const sys = systemIndexOf(g);
  const mote = new Float32Array(rows.length * 4);
  rows.forEach((row, k) => mote.set([row, NodeRole.Glow, sys[row], k], k * 4));
  return { count: rows.length, ll: new Float32Array(rows.length * 2), mote, flight: new Float32Array(rows.length * 4), rows };
}

/**
 * The icospheres: one per planet and moon, none for a star (a star is its dots and its glow, re-skin
 * §4.3), a core row (it draws nothing, re-skin Task 5) or a barycentre, then a ghost per planet or moon
 * that carries the defect (the burst's double, galaxy §12.3). Per instance: (row, system, 1 for a ghost).
 */
export function buildBodyAttrs(g: Galaxy): { count: number; ghosts: number; body: Float32Array } {
  const sys = systemIndexOf(g);
  const drawn = g.bodies.filter((b) => b.kind === 'planet' || b.kind === 'moon');
  const ghosts = g.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon'));
  const body = new Float32Array([...drawn.flatMap((b) => [b.index, sys[b.index], 0]), ...ghosts.flatMap((b) => [b.index, sys[b.index], 1])]);
  return { count: drawn.length + ghosts.length, ghosts: ghosts.length, body };
}

/**
 * The stars' spikes (re-skin §4.3; spike.vert.glsl): STAR_SPIKE_DOTS dots per star, star by star in
 * glow-slot order (buildGlowAttrs), each its spike row and dot as one number k (row k / spikeDots,
 * dot k mod spikeDots). Per dot: (star row, its system, its glow slot, k).
 */
export function buildSpikeAttrs(g: Galaxy): { count: number; spike: Float32Array } {
  const glow = buildGlowAttrs(g);
  const sys = systemIndexOf(g);
  const out: number[] = [];
  glow.rows.forEach((row, slot) => {
    if (g.bodies[row].kind !== 'star') return;
    for (let k = 0; k < STAR_SPIKE_DOTS; k++) out.push(row, sys[row], slot, k);
  });
  return { count: out.length / 4, spike: new Float32Array(out) };
}

/**
 * The freeze frame's two bursts (freeze-frame §2.1, §3.1; tick.vert.glsl): every mote of every dash,
 * the moon's 14 × 6 then the planet's 22 × 7 (238). Per mote: (source: 0 the moon, 1 the planet, dash,
 * mote, NodeRole.Tick).
 */
export function buildTickAttrs(): { count: number; tick: Float32Array } {
  const out: number[] = [];
  [FREEZE_TICK_MOON, FREEZE_TICK_PLANET].forEach((k, source) => {
    for (let dash = 0; dash < k.n; dash++) for (let mote = 0; mote < k.motes; mote++) out.push(source, dash, mote, NodeRole.Tick);
  });
  return { count: out.length / 4, tick: new Float32Array(out) };
}

/**
 * The stream dots (galaxy §15.2): `streamDots` per stream (its most dots over any ambient), each its
 * dot index, and the reviewer's feed's STREAM_DOTS[1] in a set of their own. Per dot: (row in the
 * streams texture, dot index).
 */
export function buildStreamAttrs(g: Galaxy): { streams: { count: number; dot: Float32Array }; feed: { count: number; dot: Float32Array } } {
  const dots: number[] = [];
  g.streams.forEach((st, row) => {
    for (let i = 0; i < streamDots(g.bodies, st); i++) dots.push(row, i);
  });
  const feedRow = g.streams.length;
  const feed = Array.from({ length: STREAM_DOTS[1] }, (_, i) => [feedRow, i]).flat();
  return { streams: { count: dots.length / 2, dot: new Float32Array(dots) }, feed: { count: STREAM_DOTS[1], dot: new Float32Array(feed) } };
}

/** The mean anomaly (in turns, [0, 1)) at true anomaly `nu` on an ellipse of eccentricity `e`. */
export function meanAnomalyTurns(nu: number, e: number): number {
  const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2));
  const M = E - e * Math.sin(E);
  const turns = M / (2 * Math.PI);
  return turns - Math.floor(turns);
}

/**
 * The dotted orbits and tracks (galaxy §1.2, §12.2): TRACK_DOTS.planet dots round every planet's orbit
 * and TRACK_DOTS.moonTrack round every moon track in use (a track's moons share its ellipse: the
 * dots ride its first moon's elements), each dot at its own true anomaly, evenly round the ellipse.
 * Per dot: (row of the body whose orbit it marks, its mean anomaly in turns, its system, 1 on a moon's track).
 */
export function buildTrackAttrs(g: Galaxy): { count: number; track: Float32Array } {
  const owners: { row: number; e: number; n: number; moon: boolean }[] = [];
  for (const p of g.bodies) {
    if (p.kind !== 'planet') continue;
    owners.push({ row: p.index, e: p.orbit!.e, n: TRACK_DOTS.planet, moon: false });
    const seen = new Set<number>();
    for (const m of g.bodies) {
      if (m.kind !== 'moon' || m.host !== p.index || seen.has(m.track!)) continue;
      seen.add(m.track!);
      owners.push({ row: m.index, e: m.orbit!.e, n: TRACK_DOTS.moonTrack, moon: true });
    }
  }
  const count = owners.reduce((n, o) => n + o.n, 0);
  const track = new Float32Array(count * 4);
  const sys = systemIndexOf(g);
  let at = 0;
  for (const o of owners) {
    for (let i = 0; i < o.n; i++, at++) track.set([o.row, meanAnomalyTurns((2 * Math.PI * i) / o.n, o.e), sys[o.row], o.moon ? 1 : 0], at * 4);
  }
  return { count, track };
}

/** Texels per body row of the shell texture. */
export const SHELL_TEXELS = 7;

/**
 * The shell texture, one row per body (RGBA32F, SHELL_TEXELS texels): T0 and T1 its shape at ambient
 * `t` (shapeUniforms: (p, q, φ1, φ2), (p2, q2, φ3, φ4)), T2 its spin axis and its morph amplitude
 * (EQ_A on a cracked body, 0 on a healthy one), T3 its motes' world diameter (BODY_LOOK.dotShare of
 * its lattice's row pitch π R / rows), their number and its own seed (shellSeed: its motes' hashes
 * are moteHashes of it), T4 and T5 the next shape (a mote that has landed in a scatter draws it), T6
 * the scatter's sweep and its aftershock (0 or 1). Shapes and axes are the body's own (shellSeed(id));
 * a cracked body's shape is the one its scatters have brought it to by `t` (shellEvent), a healthy
 * body's its first, which A = 0 never shows. The scatter's clock is derp()'s, which the shaders run.
 */
export function packShellData(g: Galaxy, t: number): Float32Array {
  const out = new Float32Array(g.bodies.length * SHELL_TEXELS * 4);
  for (const b of g.bodies) {
    const seed = shellSeed(b.id);
    const ev = b.cracked && b.derpSeed !== NODE_NEVER ? shellEvent(b.derpSeed, b.derpPhase, t, seed) : null;
    const [sa, sb] = shapeUniforms(ev ? ev.shape : shapeAt(seed, 0));
    const [na, nb] = shapeUniforms(ev ? ev.next : shapeAt(seed, 0));
    const axis = spinAxis(seed);
    const sweep = ev ? ev.sweep : [0, 1, 0];
    out.set(
      // prettier-ignore
      [ // one line per texel, T0..T6
        ...sa,
        ...sb,
        ...axis, b.cracked ? EQ_A : 0,
        shellMoteDiameter(b), b.motes, seed, 0,
        ...na,
        ...nb,
        ...sweep, ev?.aftershock ? 1 : 0,
      ],
      b.index * SHELL_TEXELS * 4,
    );
  }
  return out;
}

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** The constants the galaxy's vertex shaders share, generated from this file, lod.ts, bodyData.ts and generate.ts. */
export function glslGalaxyConstants(): string {
  const look = Object.entries(BODY_LOOK).map(([k, v]) => `const float LOOK_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()} = ${lit(v)};`);
  return [
    '// The galaxy draw constants, generated from src/scene/node/bodyAttrs.ts.',
    `const int GALAXY_SYS_MAX = ${SYS_MAX}; // src/galaxy/generate.ts SYS_MAX`,
    `const int GALAXY_GLOW_MAX = ${GLOW_MAX};`,
    ...Object.entries(BODY_KIND).map(([k, v]) => `const int KIND_${k.toUpperCase()} = ${v}; // bodyData.ts BODY_KIND`),
    ...Object.entries(NodeRole)
      .filter(([, v]) => typeof v === 'number')
      .map(([name, v]) => `const int ROLE_${name.replace(/[a-z](?=[A-Z])/g, (c) => `${c}_`).toUpperCase()} = ${v}; // birth.ts NodeRole`),
    `const float PX_POINT = ${lit(PLANET_POINT_PX)}; // lod.ts: floors in CSS px (PX_MOTE and PX_MOON are lod.glsl's)`,
    `const float PX_LIT_PLANET = ${lit(PX.litPlanet[0])};`,
    `const vec2 PX_TRACK = vec2(${TRACK_DOT_PX.map(lit).join(', ')});`,
    `const float RING_MIN_PX = ${lit(RING.minPx)}; // src/galaxy/review.ts RING.minPx: the ring's least outer radius, CSS px`,
    ...look,
  ].join('\n');
}
