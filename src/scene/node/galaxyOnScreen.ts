// The TypeScript twin of the galaxy the page draws, on screen (test-only: the e2e pixel tests and the
// unit clearance sweeps both read it, so it lives in src, beside streamOnScreen.ts). The lit, built
// shell, moon and person motes that have mostly landed (bodyMote.ts, the twin of bodyMote.glsl, under
// the lamp), every system at full detail (more than is drawn: a bound), each body's lattice sampled to
// at most SHELL_SAMPLES motes across all its rows (a star's dots alike); the stars' glows, a
// star's with its spikes' tips (star.ts starTopPx); the dotted orbits and moon tracks (track.vert.glsl's
// twin); and the freeze frame's bursts (tick.vert.glsl's twin).
import { Vector3, type PerspectiveCamera } from 'three';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { FREEZE_PINS } from '../../galaxy/ambient';
import { GLOW_CAP, glowPx, type StarLook } from '../../galaxy/body';
import { galaxyBudget, generateGalaxy, systemOuter, type Galaxy } from '../../galaxy/generate';
import type { Vec3 } from '../../math/vec';
import { bodyAttrsOf } from '../../parity/bodyCases';
import { lampFocusRow } from '../../timeline/netTrack';
import type { SceneState } from '../../timeline/sceneState';
import { shown } from '../ambientClock';
import { FREEZE_BREATH_PX, FREEZE_TICK_MOON, FREEZE_TICK_PLANET } from './birth';
import { BODY_LOOK, buildPersonAttrs, buildShellAttrs, buildTrackAttrs, packShellData, shellMoteDiameter, unitIndexOf } from './bodyAttrs';
import { packBodyData, type BodyData } from './bodyData';
import { bodyCentre, bodyDerp, bodyLight, bodyMote, bodyPresence, lampGain, pieceOf, sysGain, trackDot, trackLampGain, type BodyClocks, type BodyMoteAttrs } from './bodyMote';
import { freezeCopy, freezeTick, freezeTickShow, freezeTickWarm } from './freeze';
import { detailPx, LOD_VISIBLE, LodElement, motePx, onScreen, systemPx, TRACK_DOT_PX } from './lod';
import { bodyWorld } from './orbit';
import { starTopPx } from './star';

/** At most this many of a body's lattice motes, spread over all its rows, stand for it; a person set at most half as many. */
const SHELL_SAMPLES = 48;

interface GalaxyTwin {
  g: Galaxy;
  data: BodyData;
  /** Each body's sampled motes, by row. */
  motes: BodyMoteAttrs[][];
}
let galaxyCache: GalaxyTwin | null = null;
/** The essay's galaxy (its seed, at the essay's budget: the twin draws what the essay draws), built once. */
export function galaxyOf(): GalaxyTwin {
  if (!galaxyCache) {
    const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    const motes: BodyMoteAttrs[][] = g.bodies.map(() => []);
    for (const [set, most] of [
      [buildShellAttrs(g), SHELL_SAMPLES],
      [buildPersonAttrs(g), SHELL_SAMPLES / 2],
    ] as const) {
      const byRow: BodyMoteAttrs[][] = g.bodies.map(() => []);
      for (let k = 0; k < set.count; k++) {
        const a = bodyAttrsOf(set, k);
        byRow[a.row].push(a);
      }
      byRow.forEach((all, row) => {
        const stride = Math.max(1, Math.ceil(all.length / most));
        for (let i = 0; i < all.length; i += stride) motes[row].push(all[i]);
      });
    }
    galaxyCache = { g, data: packBodyData(g), motes };
  }
  return galaxyCache;
}

/**
 * A drawn galaxy point and its sprite (review M6): a shell, moon or person mote is `diameter` world
 * units across (shellMoteDiameter, never under PX.mote's floor on screen); a star's or core body's
 * glow is glowPx of its radius and cap at its distance, and a star's (its `look`) stands as high as
 * its highest spike tip if that is higher (star.ts starTopPx).
 */
export interface GalaxyPoint {
  pos: Vec3;
  diameter?: number;
  glow?: { R: number; cap: number; look?: StarLook };
  /** A dotted orbit's or moon track's dot (track.vert.glsl): BODY_LOOK.trackDot world units, within TRACK_DOT_PX. */
  track?: true;
  /** The body a mote or dot is drawn for (its row): a shell, moon or person mote's, a track dot's. */
  row?: number;
}

/** A galaxy point's sprite on screen, CSS px across, at `focal` CSS px per unit at distance 1 and distance `d`. */
export function spritePx(p: GalaxyPoint, focal: number, d: number): number {
  if (p.glow) return glowPx(p.glow.R, d, focal, p.glow.cap);
  if (p.track) return Math.min(TRACK_DOT_PX[1], Math.max(TRACK_DOT_PX[0], (BODY_LOOK.trackDot * focal) / d));
  return motePx(p.diameter ?? 0, focal / d);
}

/**
 * How far above where it is drawn a point of row `row` also stands, by the freeze frame's copies (CSS
 * px, 0 or more; freeze-frame §2.1): the held piece (C1's, as main.ts holds it) is drawn twice more,
 * freezeCopy's offset either side along the rolled screen x (bodySystem.ts uOffPx), breathing by at
 * most half FREEZE_BREATH_PX on the twos, so at a roll of r one copy stands |offset sin r| higher.
 * 0 off the piece, or where the dressing does not show (it is times net.focus).
 */
export function copyRisePx(s: SceneState, row: number, g: Galaxy = galaxyOf().g, data: BodyData = galaxyOf().data): number {
  const dress = s.freeze.dress * s.net.focus;
  if (!(dress > 0) || pieceOf(data, row) !== g.ids.C1) return 0;
  const off = Math.abs(freezeCopy(2, dress, 1, 'A', row === g.ids[FREEZE_PINS.C1.moon]).offPx) + FREEZE_BREATH_PX / 2;
  return off * Math.abs(Math.sin((s.camera.roll * Math.PI) / 180));
}

/**
 * The top of what a galaxy point draws at state `s` through `camera` (its world `eye`, and `focal` CSS
 * px per unit at distance 1) on a `width` x `height` screen, CSS px from the top left: its centre less
 * its sprite's half (spritePx) and its freeze copies' rise (copyRisePx); and its x. Null behind the
 * camera or off a side, where it covers nothing. The unit clearance twin and machineOnScreen both
 * read it.
 */
export function galaxyPointTop(
  p: GalaxyPoint,
  s: SceneState,
  camera: PerspectiveCamera,
  eye: Vector3,
  focal: number,
  width: number,
  height: number,
): { x: number; y: number; top: number } | null {
  const w = new Vector3(...p.pos);
  const d = w.distanceTo(eye);
  const px = spritePx(p, focal, d);
  // A star stands as high as its glow's half or its highest spike tip (the unit twin's rule, netShots.ts cylinderTop).
  const half = p.glow?.look ? starTopPx(p.glow.look, px, glowPx(p.glow.R, d, focal, Infinity)) : 0.5 * px;
  const q = w.project(camera);
  if (Math.abs(q.x) > 1 || q.z > 1) return null;
  const y = ((1 - q.y) / 2) * height;
  const rise = p.row === undefined ? 0 : copyRisePx(s, p.row);
  return { x: ((q.x + 1) / 2) * width, y, top: y - half - rise };
}

/**
 * The freeze frame's hold at `s` (freeze-frame §1.2, main.ts's own rule): the ambient a frame shows
 * (the pin while held), and the row whose scatter the hold forces in a focused frame (C1, on every pin
 * path but `full`; −1 when nothing is held, or nothing is focused: bodySystem.ts).
 */
export function held(s: SceneState, ambient: number, g: Galaxy = galaxyOf().g): { ambient: number; forcedScatter: number } {
  const on = s.freeze.hold >= 0.5 && s.net.focus > 0;
  return { ambient: shown(ambient, s.freeze.hold), forcedScatter: on && FREEZE_PINS.C1.path !== 'full' ? g.ids.C1 : -1 };
}

/**
 * visibleGalaxy's inputs: every clock it hands bodyMote() but sysPx, which is fixed. The galaxy, its
 * sampled motes and the shells at an ambient are fixed by these, so equal inputs are the same points.
 */
function galaxyInputs(c: BodyClocks): number[] {
  return [c.growth, c.fix, c.highlight, c.show, c.ambient, c.focus, c.lamp, c.lampRow, c.forcedScatter ?? -1];
}

/**
 * visibleGalaxy's most recent answers, by their inputs (compared with Object.is, so 0 and −0 and every
 * NaN stay apart as the arithmetic may keep them apart). The clearance sweeps ask at thousands of
 * places a camera move apart, where the clocks hold still, each at the AMBIENT_GRID poses on two
 * screens: the bodies' motes are most of a margin's cost, and the camera moves none of them. The most
 * recent GALAXY_MEMO only (each answer is a few thousand points).
 */
const GALAXY_MEMO = 32;
const galaxyMemo: { inputs: number[]; points: GalaxyPoint[] }[] = [];
function galaxyRecall(inputs: number[]): GalaxyPoint[] | null {
  for (const m of galaxyMemo) if (m.inputs.every((x, i) => Object.is(x, inputs[i]))) return m.points;
  return null;
}
function galaxyRemember(inputs: number[], points: GalaxyPoint[]): void {
  if (galaxyMemo.length >= GALAXY_MEMO) galaxyMemo.shift();
  galaxyMemo.push({ inputs, points });
}

/**
 * The essay galaxy's shell texture at an ambient (packShellData), packed once per ambient: it depends
 * on the ambient alone, and the clearance sweeps ask for the same few (AMBIENT_GRID) at thousands of
 * states. The most recent 16 ambients only.
 */
const shellsCache = new Map<number, Float32Array>();
function shellsAt(ambient: number): Float32Array {
  let shells = shellsCache.get(ambient);
  if (!shells) {
    if (shellsCache.size >= 16) shellsCache.delete(shellsCache.keys().next().value as number);
    shellsCache.set(ambient, (shells = packShellData(galaxyOf().g, ambient)));
  }
  return shells;
}

/**
 * The galaxy the reader can make out at `s` and ambient `ambient` (the ambient shown: the pin while
 * the hold is up, `held`), while it shows: every built body
 * the lamp lights (lampGain), its sampled shell, moon and person motes that have mostly landed,
 * through bodyMote() at full detail, each with its mote's size; and every lit star's glow sprite.
 * The core rows draw nothing (re-skin Task 5): the hole drawn in their place is holeOnScreen.ts's.
 * Equal inputs answer the same array (galaxyRecall): read it, never change it.
 */
export function visibleGalaxy(s: SceneState, ambient: number): GalaxyPoint[] {
  if (s.net.show <= 0) return [];
  const { g, data, motes } = galaxyOf();
  const clocks: BodyClocks = {
    growth: s.net.growth,
    fix: s.net.fix,
    highlight: s.net.highlight,
    show: s.net.show,
    ambient,
    focus: s.net.focus,
    lamp: Math.round(s.net.lamp),
    lampRow: lampFocusRow(s.net.lampAt, g),
    sysPx: new Float32Array(32).fill(1e4),
    forcedScatter: held(s, ambient, g).forcedScatter,
  };
  const inputs = galaxyInputs(clocks);
  const seen = galaxyRecall(inputs);
  if (seen) return seen;
  const shells = { ...data, shells: shellsAt(ambient) };
  const out: GalaxyPoint[] = [];
  galaxyRemember(inputs, out);
  for (const b of g.bodies) {
    if (bodyPresence(b.index, s.net.growth, data) <= 0 || lampGain(b.index, clocks, data) <= 0) continue;
    const diameter = shellMoteDiameter(b);
    for (const a of motes[b.index]) {
      const o = bodyMote(a, clocks, shells);
      if (o.visible && o.settled >= 0.5) out.push({ pos: o.pos, diameter, row: b.index });
    }
    if (b.kind === 'star') out.push({ pos: bodyWorld(data, b.index, ambient), glow: { R: b.R, cap: GLOW_CAP.star, look: b.look! } });
  }
  return out;
}

/** A burst's source on screen: its centre (CSS px from the top left) and its screen radius (CSS px). */
export interface TickSourceOnScreen {
  x: number;
  y: number;
  r: number;
}

/** One drawn tick mote on screen (CSS px from the top left), its burst, dash and mote, and whether it is warm. */
export interface TickOnScreen {
  x: number;
  y: number;
  source: 'moon' | 'planet';
  dash: number;
  mote: number;
  warm: boolean;
}

/**
 * The freeze frame's two bursts at `s` and ambient `ambient` (the ambient shown) through `camera` on a
 * screen of `width` x `height`: tick.vert.glsl's twin, every mote whose gain is at least LOD_VISIBLE, and
 * the two sources (the moon the pin caught mid-burst and C1, each where the twin draws it, its derp on,
 * C1's scatter forced while held) with their screen radii. `twos` is the twos' tick (0 in test mode).
 * `clip` false keeps the moon's dashes that the planet's ring clips (what the clip does, for a test).
 */
export function freezeTicks(
  s: SceneState,
  ambient: number,
  camera: PerspectiveCamera,
  width: number,
  height: number,
  twos = 0,
  clip = true,
): { ticks: TickOnScreen[]; moon: TickSourceOnScreen; planet: TickSourceOnScreen; scatterOut: number; v: number } {
  const { g, data } = galaxyOf();
  const hold = held(s, ambient, g);
  const planetRow = g.ids.C1;
  const moonRow = g.ids[FREEZE_PINS.C1.moon];
  const clocks: BodyClocks = {
    growth: s.net.growth,
    fix: s.net.fix,
    highlight: s.net.highlight,
    show: s.net.show,
    ambient: hold.ambient,
    focus: s.net.focus,
    lamp: Math.round(s.net.lamp),
    lampRow: lampFocusRow(s.net.lampAt, g),
    sysPx: new Float32Array(32).fill(1e4),
    forcedScatter: hold.forcedScatter,
  };
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * height * camera.projectionMatrix.elements[5];
  const sys = g.systems.indexOf(g.bodies[planetRow].star);
  const sourceOf = (row: number): TickSourceOnScreen => {
    const w = new Vector3(...bodyCentre(row, bodyDerp(row, sys, clocks, data), hold.ambient, data));
    const r = (g.bodies[row].R * focal) / w.distanceTo(eye);
    const q = w.project(camera);
    return { x: ((q.x + 1) / 2) * width, y: ((1 - q.y) / 2) * height, r };
  };
  const planet = sourceOf(planetRow);
  const moon = sourceOf(moonRow);
  const v = 1 - bodyLight(planetRow, clocks, data).fix;
  const scatterOut = bodyDerp(planetRow, sys, clocks, data).scatterS >= 0 ? v : 0;
  const ticks: TickOnScreen[] = [];
  const dress = s.freeze.dress * s.net.focus;
  if (s.net.show <= 0) return { ticks, moon, planet, scatterOut, v };
  // Screen angles are y up (freeze.ts); the page's y runs down.
  const toMoon = Math.atan2(-(moon.y - planet.y), moon.x - planet.x);
  const inner = (FREEZE_TICK_PLANET.r0 + FREEZE_TICK_PLANET.out * scatterOut) * planet.r;
  for (const source of ['moon', 'planet'] as const) {
    const show = freezeTickShow(source, dress) * s.net.show;
    const spec = source === 'moon' ? FREEZE_TICK_MOON : FREEZE_TICK_PLANET;
    const at = source === 'moon' ? moon : planet;
    for (let dash = 0; dash < spec.n; dash++)
      for (let mote = 0; mote < spec.motes; mote++) {
        const t = freezeTick(source, dash, mote, (twos % 2) as 0 | 1, v, scatterOut, toMoon);
        const out = t.radius * at.r + t.len;
        const x = at.x + out * Math.cos(t.angle);
        const y = at.y - out * Math.sin(t.angle);
        const clipped = clip && source === 'moon' && Math.hypot(x - planet.x, y - planet.y) < inner;
        if (show * (clipped ? 0 : t.visible) >= LOD_VISIBLE) ticks.push({ x, y, source, dash, mote, warm: freezeTickWarm(source, dash) });
      }
  }
  return { ticks, moon, planet, scatterOut, v };
}

let trackCache: { row: number; turns: number; sys: number }[] | null = null;
/**
 * The dotted orbits and moon tracks drawn at `s` and ambient `ambient` through `camera` on a screen of
 * `width` x `height` (Task 10 review I2: the close shots' tracks stood in the band and no twin saw them):
 * track.vert.glsl's twin, every dot whose gain is at least LOD_VISIBLE, at its place on its ellipse
 * (trackDot). The gain is its system's track detail (lodGain on the system's projected size, at most
 * two systems at full detail: bodySystem.ts's own detailPx), its body's presence, its lamp gain
 * (trackLampGain) and the galaxy's presence.
 */
export function visibleTracks(s: SceneState, ambient: number, camera: PerspectiveCamera, width: number, height: number): GalaxyPoint[] {
  if (s.net.show <= 0) return [];
  const { g, data } = galaxyOf();
  if (!trackCache) {
    const t = buildTrackAttrs(g);
    trackCache = Array.from({ length: t.count }, (_, k) => ({ row: t.track[k * 4], turns: t.track[k * 4 + 1], sys: t.track[k * 4 + 2] }));
  }
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * height * camera.projectionMatrix.elements[5];
  const raw = g.systems.map((row) => {
    const w = new Vector3(...bodyWorld(data, row, ambient));
    const d = w.distanceTo(eye);
    const q = w.project(camera);
    if (!(q.z > -1 && q.z < 1)) return 0;
    const px = systemPx(systemOuter(g, row), d, focal);
    return px * onScreen(((q.x + 1) / 2) * width, ((1 - q.y) / 2) * height, px, width, height);
  });
  const sysPx = Float32Array.from(detailPx(raw, unitIndexOf(g)));
  const clocks = { lamp: Math.round(s.net.lamp), lampRow: lampFocusRow(s.net.lampAt, g), focus: s.net.focus };
  const out: GalaxyPoint[] = [];
  const places = trackPlaces(ambient);
  // Each factor is its system's or its row's, so each is taken once per system or row (a row has many
  // dots), and multiplied in the same order as ever: the same gain to the bit.
  const bySys: (number | undefined)[] = [];
  const presence: (number | undefined)[] = [];
  const lamp: (number | undefined)[] = [];
  trackCache.forEach((dot, k) => {
    const gain =
      (bySys[dot.sys] ??= sysGain(LodElement.Track, dot.sys, sysPx)) *
      (presence[dot.row] ??= bodyPresence(dot.row, s.net.growth, data)) *
      (lamp[dot.row] ??= trackLampGain(dot.row, clocks, data)) *
      s.net.show;
    if (gain >= LOD_VISIBLE) out.push({ pos: (places[k] ??= trackDot(dot.row, dot.turns, ambient, data)), track: true, row: dot.row });
  });
  return out;
}

/**
 * Each track dot's place at an ambient, as trackDot has it, filled as the dots are drawn: a dot's place
 * depends on the ambient alone, and the clearance sweeps ask for the same few ambients (AMBIENT_GRID)
 * at thousands of states. The most recent ambients only.
 */
const placesCache = new Map<number, Vec3[]>();
function trackPlaces(ambient: number): Vec3[] {
  let places = placesCache.get(ambient);
  if (!places) {
    if (placesCache.size >= 16) placesCache.delete(placesCache.keys().next().value as number);
    placesCache.set(ambient, (places = []));
  }
  return places;
}
