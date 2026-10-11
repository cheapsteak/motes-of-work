// The ?lib=body parity cases (parity.ts bodyCases): which of the galaxy's motes each case draws and
// at which clocks. Kept apart from the parity page, which runs in a browser, so a unit test can read
// them (bodyCases.test.ts).
import { MOTE_SEED } from '../config';
import { AMBIENT_POSE, FREEZE_PINS } from '../galaxy/ambient';
import type { Galaxy } from '../galaxy/generate';
import { hash01 } from '../math/hash';
import { NODE_BIRTH_WINDOW, NODE_FIX_WINDOW, NodeRole } from '../scene/node/birth';
import { buildPersonAttrs, buildShellAttrs, type QuadSet } from '../scene/node/bodyAttrs';
import type { BodyClocks, BodyMoteAttrs, FreezeClocks } from '../scene/node/bodyMote';
import { Lamp } from '../timeline/netTrack';

/** The ambients each body case is drawn at: the pose (the freeze pin, half a tick of C1-m5's burst jitter off a cut) and 101 s. */
export const BODY_AMBIENTS = [AMBIENT_POSE, 101] as const;
/** How many hashed motes the last case draws, from every shell and person mote of the galaxy. */
const BODY_HASHED = 64;

/** A body case: which motes, and the clocks (sysPx per system), as a function of the galaxy; drawn at each of BODY_AMBIENTS, or its own. */
export interface BodyCase {
  name: string;
  motes: (g: Galaxy, all: BodyMoteAttrs[]) => BodyMoteAttrs[];
  clocks: (g: Galaxy) => Omit<BodyClocks, 'ambient'>;
  ambients?: readonly number[];
}

export const sysPxAll = (px: number): Float32Array => new Float32Array(32).fill(px);
/** Each system at its own size across every band (the hashed case's level of detail). */
const sysPxSpread = (): Float32Array => Float32Array.from({ length: 32 }, (_, i) => [0, 15, 30, 45, 70, 90, 110, 200][i % 8]);
const ofBody = (g: Galaxy, id: string) => (a: BodyMoteAttrs) => a.row === g.ids[id];
const ofPiece = (g: Galaxy, id: string) => (a: BodyMoteAttrs) => a.row === g.ids[id] || (g.bodies[a.row].host === g.ids[id] && g.bodies[a.row].kind === 'moon');
const quiet = { growth: 1, fix: 0, highlight: 0, show: 1, focus: 0, lamp: Lamp.Off, lampRow: -1 };

/**
 * The lamp's dark side: the same hashed motes under each level that lights a set, nearly all of them
 * outside it (lampLit's false branches, and Lineage's rule comparison on a non-core row).
 * bodyCases.test.ts holds each to at least 8 motes the lamp alone darkens.
 */
export const BODY_DARK_CASES: BodyCase[] = ([
  ['the planet lamp on C1', Lamp.Planet, 'C1', false],
  ['the star lamp on C1', Lamp.Star, 'C1', false],
  ['the core lamp', Lamp.Core, null, false],
  ['the lineage lamp on P1', Lamp.Lineage, 'P1'],
  // (The arms lamp darkened only the core's motes, half of its case's; the core rows draw nothing since
  // the re-skin's Task 5, so no drawn mote is dark under it, and its case went.)
] as const).map(
  ([label, lamp, focus]): BodyCase => ({
    name: `64 hashed motes, ${label}`,
    motes: (_, all) => Array.from({ length: BODY_HASHED }, (_, k) => all[Math.floor(hash01(MOTE_SEED, 0x5000 + k) * all.length)]),
    clocks: (g) => ({ ...quiet, growth: 0.55, highlight: 0.95, fix: 0.6, lamp, lampRow: focus === null ? -1 : g.ids[focus], focus: 0.5, sysPx: sysPxSpread() }),
  }),
);

/**
 * The freeze frame's held cases (freeze-frame §4 parity): C1's piece under the close shot's lamp at
 * full focus, the held system at full detail, C1's scatter forced FREEZE_SCATTER_S in, fully dressed,
 * at the pin only (the hold shows nothing else): at defect 0.33 (the fix not begun), the base draw; and
 * at 0.39 with the fix landing, mid-retraction (net.fix 0.07 there, v 0.26), its warm copy (turning
 * amber).
 * The pin stands off every cut of C1-m5's burst (ambient.ts FREEZE_PIN_OFFSET_S), so the TS and the
 * GLSL must agree at the very ambient, never across a cut.
 */
/** The dressing at full, the flash spent, copy `copy` of C1's piece, with the moon its pin caught. */
const held = (g: Galaxy, copy: 0 | 2): FreezeClocks => ({ dress: 1, flash: 0, copy, moon: g.ids[FREEZE_PINS.C1.moon], planet: g.ids.C1 });

export const BODY_HELD_CASES: BodyCase[] = [
  {
    name: 'defect 0.33, C1 held',
    motes: (g, all) => all.filter(ofPiece(g, 'C1')).filter((a, i) => a.role !== NodeRole.Builder || i % 5 === 0),
    clocks: (g) => ({ ...quiet, lamp: Lamp.Planet, lampRow: g.ids.C1, focus: 1, sysPx: sysPxAll(200), forcedScatter: g.ids.C1, freeze: held(g, 0) }),
    ambients: [AMBIENT_POSE],
  },
  {
    name: '0.39, C1 held and fixing',
    motes: (g, all) => all.filter(ofPiece(g, 'C1')).filter((a, i) => a.role !== NodeRole.Builder || i % 5 === 0),
    clocks: (g) => ({
      ...quiet,
      fix: g.bodies[g.ids.C1].fixAt! - NODE_FIX_WINDOW / 3,
      lamp: Lamp.Planet,
      lampRow: g.ids.C1,
      focus: 1,
      sysPx: sysPxAll(200),
      forcedScatter: g.ids.C1,
      freeze: held(g, 2),
    }),
    ambients: [AMBIENT_POSE],
  },
];

/** The ?lib=body cases, at each of BODY_AMBIENTS. */
export const BODY_CASES: BodyCase[] = [
  {
    name: 'C1 building',
    motes: (g, all) => all.filter(ofBody(g, 'C1')).filter((_, i) => i % 9 === 0),
    clocks: (g) => ({ ...quiet, growth: g.bodies[g.ids.C1].born + 0.6 * g.bodies[g.ids.C1].dur + NODE_BIRTH_WINDOW / 2, sysPx: sysPxAll(200) }),
  },
  {
    name: 'C1 and its moons, defect close',
    motes: (g, all) => all.filter(ofPiece(g, 'C1')).filter((a, i) => a.role !== NodeRole.Builder || i % 7 === 0),
    clocks: (g) => ({ ...quiet, highlight: 0.5, lamp: Lamp.Planet, lampRow: g.ids.C1, focus: 0.6, sysPx: sysPxAll(200) }),
  },
  {
    name: 'C1 and its moons, the fix landing',
    motes: (g, all) => all.filter(ofPiece(g, 'C1')).filter((a, i) => a.role !== NodeRole.Builder || i % 11 === 0),
    clocks: (g) => ({ ...quiet, fix: g.bodies[g.ids.C1].fixAt! - NODE_FIX_WINDOW / 3, lamp: Lamp.Planet, lampRow: g.ids.C1, sysPx: sysPxAll(90) }),
  },
  {
    name: 'P1, defect close',
    motes: (g, all) => all.filter(ofBody(g, 'P1')).filter((_, i) => i % 3 === 0),
    clocks: (g) => ({ ...quiet, highlight: 0.5, lamp: Lamp.Star, lampRow: g.ids.C1, focus: 1, sysPx: sysPxAll(200) }),
  },
  // A star's dots (re-skin §4.3): P_a's in flight and landed, and a cracked star's (P1) mid-scatter,
  // its scatter forced as the freeze forces C1's, so the morph and the fling act on its dot cloud.
  {
    name: 'P_a, its dots in flight',
    motes: (g, all) => all.filter(ofBody(g, 'P_a')).filter((_, i) => i % 2 === 0),
    clocks: (g) => ({ ...quiet, growth: g.bodies[g.ids.P_a].born + 0.6 * g.bodies[g.ids.P_a].dur + NODE_BIRTH_WINDOW / 2, sysPx: sysPxAll(200) }),
  },
  {
    name: 'P_a, its dots landed',
    motes: (g, all) => all.filter(ofBody(g, 'P_a')).filter((_, i) => i % 2 === 1),
    clocks: () => ({ ...quiet, sysPx: sysPxAll(200) }),
  },
  {
    name: 'P1 scattering',
    motes: (g, all) => all.filter(ofBody(g, 'P1')).filter((a) => a.role === NodeRole.Builder),
    clocks: (g) => ({ ...quiet, highlight: 0.5, sysPx: sysPxAll(200), forcedScatter: g.ids.P1 }),
  },
  {
    // A body of R0's lineage at its fix under the lineage lamp in the sweep (R0 itself until the re-skin's
    // Task 5, whose core rows draw nothing): C7, its warm motes landing.
    name: 'C7 at its fix',
    motes: (g, all) => all.filter(ofBody(g, 'C7')).filter((a, i) => a.role === NodeRole.Person || i % 4 === 0),
    clocks: (g) => ({ ...quiet, highlight: 1, fix: g.bodies[g.ids.C7].fixAt! - NODE_FIX_WINDOW / 2, lamp: Lamp.Lineage, lampRow: g.ids.R0, sysPx: sysPxAll(200) }),
  },
  {
    name: '64 hashed motes',
    motes: (_, all) => Array.from({ length: BODY_HASHED }, (_, k) => all[Math.floor(hash01(MOTE_SEED, 0x5000 + k) * all.length)]),
    clocks: () => ({ ...quiet, growth: 0.55, highlight: 0.95, fix: 0.6, lamp: Lamp.Hood, sysPx: sysPxSpread() }),
  },
  ...BODY_DARK_CASES,
  ...BODY_HELD_CASES,
];

/** Instance k of a quad set as bodyMote() takes it, its lattice point as the float attribute carries it. */
export function bodyAttrsOf(set: QuadSet, k: number): BodyMoteAttrs {
  const m = set.mote.subarray(k * 4, k * 4 + 4);
  const f = set.flight.subarray(k * 4, k * 4 + 4);
  return { row: m[0], role: m[1], ll: { lat: set.ll[k * 2], lon: set.ll[k * 2 + 1] }, birth: f[0], seed: f[1], host: f[2], index: m[3], sys: m[2] };
}

/** Every shell and person mote of the galaxy, as bodyMote() takes them: what the body cases pick from. */
export function allBodyMoteAttrs(g: Galaxy): BodyMoteAttrs[] {
  const sets = [buildShellAttrs(g), buildPersonAttrs(g)];
  return sets.flatMap((set) => Array.from({ length: set.count }, (_, k) => bodyAttrsOf(set, k)));
}
