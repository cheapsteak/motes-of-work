g = '/home/user/motes-of-work/src/galaxy/generate.ts'
s = open(g).read()


def rep(a, c):
    global s
    assert a in s, a[:70]
    s = s.replace(a, c)


rep('''  /** All body motes: shells plus person sets. At most the budget, unless even the thinnest shells exceed it. */
  motes: number;
}''', '''  /**
   * Every instance the galaxy draws (`instances.total`): at most the budget, unless even the
   * thinnest shells exceed it.
   */
  motes: number;
  /** The instances by set, as the renderer's meshes hold them (`GalaxyInstances`). */
  instances: GalaxyInstances;
  /** How often the layout had to give way (`fitSystem`). */
  fit: FitCounts;
}

/**
 * The galaxy's instances by set, each as the renderer draws it, so the budget covers all of them:
 * the shells (`net-shells`, Σ `latticeCount`) and the person sets; the dotted orbits and tracks
 * (`net-tracks`: `TRACK_DOTS.planet` per planet, `TRACK_DOTS.moonTrack` per moon track in use, the
 * moons of a track sharing it); the bodies (`net-bodies`: one icosphere per body, and a ghost per
 * planet or moon that carries the defect); the glow sprites (`net-glow`: one per star and core
 * body); and the stream dots (`streamDots` per stream, and the feed at `STREAM_DOTS[1]`).
 */
export interface GalaxyInstances {
  shells: number;
  persons: number;
  tracks: number;
  bodies: number;
  glow: number;
  streams: number;
  total: number;
}

/** Dots per dotted planet orbit and per moon track (galaxy §3.4). */
export const TRACK_DOTS = { planet: 90, moonTrack: 40 } as const;
/** A stream's dots: one per `STREAM_PITCH` units of its chord, between the bounds of `STREAM_DOTS` (galaxy §15.2). */
export const STREAM_PITCH = 1.2,
  STREAM_DOTS = [6, 40] as const;

/**
 * The most dots a stream can need: its longest chord over any ambient (the distance between the two
 * systems' fixed spots, plus each end's apoapsis round its star), one per `STREAM_PITCH`, clamped.
 */
export function streamDots(bodies: readonly Body[], s: Pick<Stream, 'from' | 'to'>): number {
  const anchor = (b: Body): readonly number[] =>
    b.spot ?? (b.kind === 'planet' ? bodies[b.host].spot! : bodies[bodies[b.host].host].spot!);
  const range = (b: Body): number => (b.kind === 'planet' ? b.orbit!.r : b.kind === 'moon' ? bodies[b.host].orbit!.r + b.orbit!.r : 0);
  const [a, b] = [bodies[s.from], bodies[s.to]];
  const chord = dist(anchor(a), anchor(b)) + range(a) + range(b);
  return Math.min(STREAM_DOTS[1], Math.max(STREAM_DOTS[0], Math.round(chord / STREAM_PITCH)));
}''')
rep('''  // 8. Shells and person sets, thinned only if the budget is short.
  const motes = fitBudget(bodies, budget);''', '''  // 8. Every instance the galaxy draws: the shells and person sets are thinned if the rest leaves
  // them too little of the budget.
  const instances = fitBudget(bodies, streams, budget);''')
rep('''    motes,
  };
}''', '''    motes: instances.total,
    instances,
    fit,
  };
}''')
a0 = s.index('/**\n * Sets every body\'s lattice, motes and person set.')
s = s[:a0] + '''/**
 * Sets every body's lattice, motes and person set, and returns every instance the galaxy draws. The
 * orbits, tracks, bodies, glow and streams are fixed by the layout; the shells and person sets get
 * the rest of the budget. At full detail if that fits. Else the shells the story does not name are
 * thinned first: every planet's and moon's rows and columns but the hero planet's, scaled by the
 * largest factor that fits (never under 3 × 6), so the hero planet, the core and the stars keep their
 * lattices. Only if the thinnest of those still does not fit are the named lattices scaled too.
 */
function fitBudget(bodies: Body[], streams: readonly Stream[], budget: number): GalaxyInstances {
  const planets = bodies.filter((b) => b.kind === 'planet');
  const moonTracks = planets.reduce((n, p) => n + new Set(bodies.filter((m) => m.kind === 'moon' && m.host === p.index).map((m) => m.orbit!.r)).size, 0);
  const tracks = TRACK_DOTS.planet * planets.length + TRACK_DOTS.moonTrack * moonTracks;
  const ghosts = bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;
  const glow = bodies.filter((b) => b.kind === 'star' || b.kind === 'core').length;
  const dots = streams.reduce((n, st) => n + streamDots(bodies, st), STREAM_DOTS[1]);
  const fixed = tracks + bodies.length + ghosts + glow + dots;
  const room = budget - fixed;
  const base = bodies.map(baseLattice);
  const named = bodies.map((b) => b.kind === 'core' || b.kind === 'star' || b.id === HERO_PLANET);
  const scale = ([rows, cols]: [number, number], f: number): [number, number] =>
    f >= 1 ? [rows, cols] : [Math.max(3, Math.round(rows * f)), Math.max(6, Math.round(cols * f))];
  const apply = (fOther: number, fNamed: number): number => {
    let total = 0;
    bodies.forEach((b, i) => {
      b.lattice = scale(base[i], named[i] ? fNamed : fOther);
      b.motes = latticeCount(...b.lattice);
      b.personMotes = personFor(b, b.motes);
      total += b.motes + b.personMotes;
    });
    return total;
  };
  if (apply(1, 1) > room) {
    if (apply(0, 1) <= room) apply(largestFit((f) => apply(f, 1) <= room), 1);
    else apply(0, largestFit((f) => apply(0, f) <= room));
  }
  const shells = bodies.reduce((n, b) => n + b.motes, 0);
  const persons = bodies.reduce((n, b) => n + b.personMotes, 0);
  return { shells, persons, tracks, bodies: bodies.length + ghosts, glow, streams: dots, total: shells + persons + fixed };
}
'''
open(g, 'w').write(s)
