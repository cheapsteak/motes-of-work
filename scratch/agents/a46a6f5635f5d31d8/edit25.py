P = 'docs/superpowers/plans/2026-10-08-act-2-galaxy.md'
C = '.superpowers/sdd/2026-10-08-act-2-galaxy/plan-constraints.md'

OLD_GC = '- **No soft discs.** The only glows are capped star sprites: 3.5 px for background stars, 6 px for the brightest 15 %, `clamp(5 R focal / d, 5, 18)` px for neighbourhood stars and `clamp(5 R focal / d, 5, 24)` px for core bodies.'
NEW_GC = '- **No soft discs.** The only glows are capped star sprites: 2 px for background stars and 3 px for the brightest 15 % (crisp points with at most a 1 px halo, `HALO_PX`; ruled in Task 1 fix round 2 so the galaxy wide keeps its halos apart at the full counts, superseding galaxy §4\'s 3.5 / 6 px), `clamp(5 R focal / d, 5, 18)` px for neighbourhood stars and `clamp(5 R focal / d, 5, 24)` px for core bodies (`glowPx`, src/galaxy/body.ts).'

for path in (P, C):
    s = open(path).read()
    assert OLD_GC in s, path
    s = s.replace(OLD_GC, NEW_GC)
    open(path, 'w').write(s)

s = open(P).read()


def rep(a, c):
    global s
    assert a in s, a[:80]
    s = s.replace(a, c)


rep('A reader expects a 3.5 px star to be 10.5 device px, not 3.5 device px,', 'A reader expects a 2 px star to be 6 device px, not 2 device px,')
rep('''    hoodExclusion: 50, hoodLeak: 0.15, coreExclusion: 16, dustY: 1.1, starY: 0.6 } as const;
  export interface Background { stars: Float32Array; bright: Float32Array; dust: Float32Array; armPhase: number } // xyz + brightness per point''', '''    coreExclusion: 16, dustY: 1.1, starY: 0.6 } as const;                  // (as built: the 50-unit neighbourhood exclusion is gone, fix round 1)
  export interface Background { stars: Float32Array; bright: Float32Array; dust: Float32Array; armPhase: number } // xyz + brightness per point; a negative brightness is a warm star (|b| is the brightness)
  export const HALO_PX = { star: 2, bright: 3 } as const;                  // background sprite caps, CSS px
  export function galaxyWideView(width: number, height: number): { pos: [number, number, number]; focal: number; pxPerUnit: number };
  export function hoodGlowPx(tier: Tier, spot: readonly number[]): number; // a neighbourhood star's glow at the galaxy wide (glowPx)''')
rep('''  export function generateBackground(seed: number, tier: Tier, hoodCentroid: readonly [number, number, number]): Background;''', '''  export function generateBackground(seed: number, tier: Tier, hood: readonly (readonly [number, number, number])[]): Background; // hood: the neighbourhood's star spots, whose glows no background halo touches''')
rep('''  export interface Stream { from: number; to: number; kind: StreamKind; born: number; hiAt: number | null; hop: number | null; bow: number }
  export interface Galaxy { seed: number; tier: Tier; bodies: Body[]; streams: Stream[]; feedFrom: number; visits: string[];
    ids: Record<string, number>; systems: number[]; hoodCentroid: [number, number, number]; background: Background; motes: number }''', '''  export interface Stream { from: number; to: number; kind: StreamKind; born: number; hiAt: number | null; hop: number | null; bowBearing: number } // bowBearing: the side of the chord the control point bows to, [0, 2π); its size is STREAM_BOW × chord
  export interface Galaxy { seed: number; tier: Tier; bodies: Body[]; streams: Stream[]; feedFrom: number; visits: string[];
    ids: Record<string, number>; systems: number[]; hoodCentroid: [number, number, number]; background: Background;
    motes: number; instances: GalaxyInstances; fit: FitCounts }  // motes = instances.total: every net-* instance, ≤ the budget
  export interface GalaxyInstances { shells: number; persons: number; tracks: number; bodies: number; glow: number; streams: number; total: number }
  export const TRACK_DOTS = { planet: 90, moonTrack: 40 } as const, STREAM_PITCH = 1.2, STREAM_DOTS = [6, 40] as const;
  export function streamDots(bodies: readonly Body[], s: Pick<Stream, 'from' | 'to'>): number; // the most dots a stream needs''')
rep('''  // Streams: T0 from, to, kind (0 out, 1 side, 2 in, 3 feed), born   T1 hiAt, hop, bow, childFixAt''', '''  // Streams: T0 from, to, kind (0 out, 1 side, 2 in, 3 feed), born   T1 hiAt, hop, bowBearing, childFixAt''')
rep('''bgStar: 3.5, brightStar: 6,''', '''bgStar: 2, brightStar: 3,''')
rep('''  export function glowPx(R: number, dist: number, focalPx: number, cap: number): number; // clamp(5·R·focal/d, 5, cap)''', '''  export { glowPx } from '../../galaxy/body';                             // clamp(5·R·focal/d, 5, cap): one TS function (Task 1), lod.glsl mirrors it''')
rep('''  - `net-tracks`: dotted orbits (90 per planet orbit, 40 per moon track) placed''', '''  - `net-tracks`: dotted orbits (90 per planet orbit, 40 per moon track in use: a track's moons share its ellipse) placed''')
rep('''tracks = 90·planets + 40·moons; glow = stars + 6)''', '''tracks = 90·planets + 40·moon tracks; glow = stars + 6; the sum of every set = `Galaxy.instances`)''')
rep('''the brightest star sprite's lit width ≤ 6 × 3 + 2 device px''', '''the brightest star sprite's lit width ≤ 3 × 3 + 2 device px''')
rep('''test('the galaxy keeps within its budget', ...);                // Σ net-* instances ≤ galaxyBudget(n); galaxy-* = tier counts exactly''', '''test('the galaxy keeps within its budget', ...);                // Σ net-* instances = Galaxy.instances.total ≤ galaxyBudget(n); galaxy-* = tier counts exactly''')
rep('''takes a Bezier whose control point is the midpoint bowed by `bow`,''', '''takes a Bezier whose control point is the midpoint moved `STREAM_BOW`·chord toward `bowBearing` about the chord,''')
open(P, 'w').write(s)
