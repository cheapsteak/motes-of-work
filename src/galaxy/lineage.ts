// The scripted bodies (design: docs/specs/2026-10-07-galaxy-orbits.md §14.1-§14.2, the hosts and pins
// of the Act II galaxy plan): the rules, plans and pieces the story needs at particular times, as the
// core bodies, stars and planets of the galaxy. Every id, birth, duration, light and fix is the
// stacks network's, which this galaxy replaced; what is new is the kind, the host each planet orbits and
// the few sizes the story pins. Whether a body carries the defect is not an input: it follows from
// its parents and its birth, by the generator's rule. The generator places these first and draws the
// filler round them.

import { PLANET_R_PIN } from './body';

/** A scripted body. */
export interface ScriptedBody {
  id: string;
  /** A second name the design also uses (the review visits are code C19-C23 too). */
  alias?: string;
  /** A rule is a core body, a plan a star, a piece of code a planet. */
  kind: 'core' | 'star' | 'planet';
  /**
   * Its stream parents, the main stream first: a body one level in (a stream out), of the same kind
   * (a copy, or a reused plan: sideways) or, once, a planet whose rule an agent wrote (C7 → R1: in).
   * `nearest-clean-star`: whichever clean star is nearest its host when it is born.
   */
  parents: readonly string[] | 'nearest-clean-star';
  /** The star a planet orbits (from `HOSTS`). */
  host?: string;
  /** Birth on the growth clock. */
  born: number;
  /** How long it takes to build, in growth units, if not its kind's. */
  dur?: number;
  /** A body the camera visits close. */
  hero?: boolean;
  /** When it lights on the highlight clock. */
  hiAt?: number;
  /** When it is rebuilt on the fix clock. */
  fixAt?: number;
  /** Its moon count, if the story pins it. */
  moons?: number;
  /** Its radius, if the story pins it. */
  R?: number;
  /** Its place in the galaxy's plane (x, z), if the story pins it. */
  spot?: readonly [number, number];
}

/** The incorrect rule: the one body that carries the defect without inheriting it. */
export const SOURCE = 'R0',
  /** The rule an agent wrote, in from cracked code: it inherits the defect, and has a fix of its own. */
  AGENT_RULE = 'R1',
  /** The first piece: the bike reflows into it, a planet with seven moons. */
  FIRST = 'N0',
  /** The three bodies with a fix of their own (the rest are swept, fx-4). */
  OWN_FIXES = ['C1', 'R0', 'R1'] as const;

/**
 * Each star's scripted planets, in orbit-slot order from the star outward: they take its innermost
 * slots, and the filler the rest.
 */
export const HOSTS: Readonly<Record<string, readonly string[]>> = {
  P_a: ['N0', 'B1', 'B2'],
  P1: ['C1', 'C2', 'C3', 'C4'],
  P2: ['C5', 'C6', 'C9', 'C12'],
  P3: ['C8', 'C10', 'C7', 'C11', 'C13'],
  P4: ['C14', 'C16', 'C18'],
  Q1: ['C15', 'C17'],
  P5: ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'],
  P6: ['C24', 'C25'],
  Q2: ['C26'],
  P7: ['C27', 'C28', 'C29'],
  Q3: ['C30', 'C31', 'C32'],
};

const hostOf = (id: string): string => {
  const host = Object.keys(HOSTS).find((s) => HOSTS[s].includes(id));
  if (!host) throw new Error(`no host for ${id}`);
  return host;
};

/** A planet, its host looked up in `HOSTS`. */
const planet = (s: Omit<ScriptedBody, 'kind' | 'host'>): ScriptedBody => ({ ...s, kind: 'planet', host: hostOf(s.id) });

export const LINEAGE: readonly ScriptedBody[] = [
  // The rules: all six are scripted. R0 sits at the galaxy's centre.
  { id: 'R_a', kind: 'core', parents: [], born: 0 },
  { id: 'R0', kind: 'core', parents: [], born: 0.05, dur: 0.08, hero: true, hiAt: 0.92, fixAt: 0.46, spot: [0, 0] },
  { id: 'R_b', kind: 'core', parents: [], born: 0.09 },
  { id: 'R_c', kind: 'core', parents: [], born: 0.2 },
  { id: 'R1', kind: 'core', parents: ['C7'], born: 0.39, dur: 0.05, hero: true, hiAt: 0.28, fixAt: 0.56 },
  { id: 'R_d', kind: 'core', parents: [], born: 0.8 },

  // The plans.
  { id: 'P_a', kind: 'star', parents: ['R_a'], born: 0.03 },
  { id: 'P1', kind: 'star', parents: ['R0'], born: 0.1, hiAt: 0.03, fixAt: 0.64 },
  { id: 'P2', kind: 'star', parents: ['R0', 'P1'], born: 0.24, hiAt: 0.1, fixAt: 0.65 },
  { id: 'P3', kind: 'star', parents: ['R0', 'P2'], born: 0.31, hiAt: 0.15, fixAt: 0.66 },
  { id: 'P4', kind: 'star', parents: ['R0', 'P3'], born: 0.44, hiAt: 0.3, fixAt: 0.67 },
  { id: 'P5', kind: 'star', parents: ['R0', 'P1'], born: 0.5, hiAt: 0.3, fixAt: 0.68 },
  { id: 'P6', kind: 'star', parents: ['R0', 'P4'], born: 0.55, hiAt: 0.3, fixAt: 0.69 },
  { id: 'Q1', kind: 'star', parents: ['R1'], born: 0.45, hiAt: 0.3, fixAt: 0.72 },
  { id: 'Q2', kind: 'star', parents: ['R1'], born: 0.52, hiAt: 0.3, fixAt: 0.73 },
  { id: 'P7', kind: 'star', parents: ['R0'], born: 0.7 },
  { id: 'Q3', kind: 'star', parents: ['R1'], born: 0.72 },

  // The code. N0 is the bike: there from the start, before its own plan, with its seven parts as moons.
  planet({ id: 'N0', parents: ['P_a'], born: 0, dur: 0, moons: 7, R: PLANET_R_PIN }),
  planet({ id: 'B1', parents: ['P_a'], born: 0.122 }),
  planet({ id: 'B2', parents: ['P_a'], born: 0.128 }),
  // The first fix: the freeze holds it with six moons.
  planet({ id: 'C1', parents: ['P1'], born: 0.14, hero: true, fixAt: 0.08, moons: 6, R: PLANET_R_PIN }),
  planet({ id: 'C2', parents: ['P1'], born: 0.18, hiAt: 0.06, fixAt: 0.75 }),
  planet({ id: 'C3', parents: ['P1'], born: 0.22, hiAt: 0.07, fixAt: 0.76 }),
  planet({ id: 'C4', parents: ['P1'], born: 0.27, hiAt: 0.08, fixAt: 0.77 }),
  // One of the twelve. It was the second fix's: the author deleted that fix (2026-10-09). Its three
  // moons and pinned radius are kept: they set P2's system radius, which places the neighbourhood. It
  // is an ordinary planet in the budget (re-skin §7), swept with the rest under fx-4, in its turn:
  // after C4, before C8.
  planet({ id: 'C5', parents: ['P2'], born: 0.29, hiAt: 0.12, fixAt: 0.775, moons: 3, R: PLANET_R_PIN }),
  planet({ id: 'C6', parents: ['P2'], born: 0.33, hiAt: 0.13, fixAt: 0.79 }),
  // A copy of C3 on P3's system; its stream runs in to the core, where it writes R1. Born 0.327,
  // not the stacks network's 0.3: a planet is built once its star is (P3, born 0.31, is half built
  // at 0.325), and N0 is the only piece there before its plan.
  planet({ id: 'C7', parents: ['C3'], born: 0.327, hiAt: 0.19, fixAt: 0.895 }),
  planet({ id: 'C8', parents: ['P3'], born: 0.325, hiAt: 0.17, fixAt: 0.78 }),
  planet({ id: 'C9', parents: ['C5'], born: 0.335, hiAt: 0.21, fixAt: 0.9 }),
  // The twelfth.
  planet({ id: 'C10', parents: ['P3'], born: 0.338, hiAt: 0.23, fixAt: 0.8 }),
  // Born after df-5.
  planet({ id: 'C11', parents: ['P3'], born: 0.37, hiAt: 0.3, fixAt: 0.81 }),
  planet({ id: 'C12', parents: ['P2'], born: 0.38, hiAt: 0.3, fixAt: 0.82 }),
  planet({ id: 'C13', parents: ['C8'], born: 0.41, hiAt: 0.3, fixAt: 0.905 }),
  planet({ id: 'C14', parents: ['P4'], born: 0.455, hiAt: 0.3, fixAt: 0.83 }),
  planet({ id: 'C15', parents: ['Q1'], born: 0.47, hiAt: 0.3, fixAt: 0.92 }),
  planet({ id: 'C16', parents: ['P4'], born: 0.49, hiAt: 0.3, fixAt: 0.84 }),
  planet({ id: 'C17', parents: ['Q1'], born: 0.51, hiAt: 0.3, fixAt: 0.925 }),
  planet({ id: 'C18', parents: ['C14'], born: 0.53, hiAt: 0.3, fixAt: 0.91 }),

  // The nine review visits, in birth order (0.530 + 0.0053 j), all on P5. V5 and V8 keep their
  // streams from Q2 and P6; the clean ones are built from the nearest clean star.
  planet({ id: 'V1', parents: 'nearest-clean-star', born: 0.53 }),
  planet({ id: 'V2', parents: 'nearest-clean-star', born: 0.5353 }),
  planet({ id: 'V3', alias: 'C19', parents: ['P5'], born: 0.5406, hiAt: 0.3, fixAt: 0.85 }),
  planet({ id: 'V4', parents: 'nearest-clean-star', born: 0.5459 }),
  planet({ id: 'V5', alias: 'C20', parents: ['Q2'], born: 0.5512, hiAt: 0.3, fixAt: 0.93 }),
  planet({ id: 'V6', parents: 'nearest-clean-star', born: 0.5565 }),
  planet({ id: 'V7', alias: 'C21', parents: ['P5'], born: 0.5618, hiAt: 0.3, fixAt: 0.86 }),
  planet({ id: 'V8', alias: 'C22', parents: ['P6'], born: 0.5671, hiAt: 0.3, fixAt: 0.87 }),
  planet({ id: 'V9', alias: 'C23', parents: ['P5'], born: 0.5724, hiAt: 0.3, fixAt: 0.88 }),

  // Born during the ring and the climb.
  planet({ id: 'C24', parents: ['P6'], born: 0.61, hiAt: 0.3, fixAt: 0.89 }),
  planet({ id: 'C25', parents: ['V7'], born: 0.63, hiAt: 0.3, fixAt: 0.915 }),
  planet({ id: 'C26', parents: ['Q2'], born: 0.645, hiAt: 0.3, fixAt: 0.935 }),

  // New work from the fixed rules, correct (fx-3).
  planet({ id: 'C27', parents: ['P7'], born: 0.715 }),
  planet({ id: 'C28', parents: ['P7'], born: 0.722 }),
  planet({ id: 'C29', parents: ['P7'], born: 0.73 }),
  planet({ id: 'C30', parents: ['Q3'], born: 0.736 }),
  planet({ id: 'C31', parents: ['Q3'], born: 0.743 }),
  planet({ id: 'C32', parents: ['Q3'], born: 0.75 }),
];
