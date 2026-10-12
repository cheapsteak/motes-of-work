import os

os.chdir('.')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


P = 'src/mechanisms/bike/index.ts'
rep(P, """import {
  brakeFront,""", """import {
  basket,
  BASKET_DENSITY,
  brakeFront,""")

rep(P, """// Settle windows: the stages the cold open builds the bike in, one line of the brief each, end to
// end so no part sets out before the line before it has lit (docs/specs/2026-10-05-act-1-build-and-
// orbit.md §2.2). The core (saddle, bars, pedals) lands first, in its role default [0.08, 0.44];
// then the drive (both wheels, the cranks, the chain); then the fork; then the frame, laid tube by
// tube; and last the fittings hung on it (the brakes, the mudguards with the rack, the ground).
// Every stage sets out SETTLE_WINDOW before its `from`. The cold open holds assembly one flare
// width past each stage's end (0.45, 0.61, 0.73, then 1), and the spec section at 0.46 with the
// core built: no body mote has set out there, since the drive's motes start at 0.54 - 0.08 = 0.46.
const DRIVE_SETTLE = [0.54, 0.6] as const;
const FORK_SETTLE = [0.69, 0.72] as const;
/** The frame is laid in place, tube by tube, over its lay order's span (shapes.ts FRAME_LAY). */
const FRAME_SETTLE = [FRAME_LAY[0].slot[0], FRAME_LAY[FRAME_LAY.length - 1].slot[1]] as const;
/** The fittings set out while the seat tube is laid, and land once the frame is done. */
const FITTINGS_SETTLE = [0.94, 0.97] as const;
/** The loose bolts land with the drive, not spread over the whole build (they would flare through its holds). */
const BOLTS_SETTLE = [0.54, 0.59] as const;
""", """// Settle windows: the stages the cold open builds the bike in, one line of the brief each, end to
// end so no part sets out before the line before it has lit (docs/specs/2026-10-05-act-1-build-and-
// orbit.md §2.2, as amended for the basket). The core (saddle, bars, pedals) lands first, in its role
// default [0.08, 0.32]; then the drive (both wheels, the cranks, the chain); then the fork; then the
// basket, dropped onto it; then the frame, laid tube by tube; and last the fittings hung on it (the
// mudguards with the rack, which have their own line, then the brakes and the ground with them).
// Every stage sets out SETTLE_WINDOW before its `from`. The cold open holds assembly one flare
// width past each stage's end (0.33, 0.49, 0.61, 0.73, then 1), and the spec section at 0.34 with
// the core built: no body mote has set out there, since the drive's motes start at 0.42 - 0.08.
const DRIVE_SETTLE = [0.42, 0.48] as const;
const FORK_SETTLE = [0.57, 0.6] as const;
/** The basket has the fork's old window: it sets out once the front wheel has turned. */
const BASKET_SETTLE = [0.69, 0.72] as const;
/** The frame is laid in place, tube by tube, over its lay order's span (shapes.ts FRAME_LAY). */
const FRAME_SETTLE = [FRAME_LAY[0].slot[0], FRAME_LAY[FRAME_LAY.length - 1].slot[1]] as const;
/**
 * The mudguards (with the rack) set out while the top tube is laid, under their own line of the
 * brief, and land just after the frame is done: they are fresh parts of that line, after the frame's.
 */
const MUDGUARD_SETTLE = [0.95, 0.97] as const;
/** The brakes and the ground set out while the seat tube is laid, and land with the mudguards. */
const FITTINGS_SETTLE = [0.94, 0.97] as const;
/**
 * The loose bolts land with the fork, not spread over the whole build (they would flare through its
 * holds), and not with the drive, whose window is now below the drift role's.
 */
const BOLTS_SETTLE = [0.57, 0.59] as const;

/**
 * The basket's entrance: it gathers in the air above the fork while its motes fly in, then drops
 * onto the fork, gathering speed as a dropped thing does, and hops once as it settles. Over its
 * window, `x` 0 to 1: held up until HOVER, falling to IMPACT, then a hop of HOP of the drop.
 */
const BASKET_DROP = { hover: 0.8, impact: 0.9, hop: 0.12 } as const;
export function basketArrival(x: number): number {
  const { hover, impact, hop } = BASKET_DROP;
  if (x <= hover) return 0;
  if (x <= impact) return ((x - hover) / (impact - hover)) ** 2;
  if (x >= 1) return 1;
  return 1 - hop * Math.sin((Math.PI * (x - impact)) / (1 - impact));
}
""")

rep(P, """  { id: 'fork', role: 'body', settle: FORK_SETTLE, explodedOffset: at(0.9, -0.6, -0.8, Z, 0.5), geometry: fork },""",
    """  { id: 'fork', role: 'body', settle: FORK_SETTLE, explodedOffset: at(0.9, -0.6, -0.8, Z, 0.5), geometry: fork },
  {
    id: 'basket',
    role: 'body',
    settle: BASKET_SETTLE,
    // Above its seat on the fork, tipped a little nose down: it drops straight down onto it
    // (basketArrival), the one part that comes from above, and from not far.
    explodedOffset: at(0, 0.8, 0, Z, -0.15),
    arrival: basketArrival,
    geometry: basket,
    density: BASKET_DENSITY,
  },""")

rep(P, """    id: 'mudguard-front',
    role: 'body',
    settle: FITTINGS_SETTLE,""", """    id: 'mudguard-front',
    role: 'body',
    settle: MUDGUARD_SETTLE,""")
rep(P, """    id: 'mudguard-rear',
    role: 'body',
    settle: FITTINGS_SETTLE,""", """    id: 'mudguard-rear',
    role: 'body',
    settle: MUDGUARD_SETTLE,""")

rep(P, """const parts: MechanismPart[] = SPECS.map(({ id, role, explodedOffset, settle, settleField }) => ({
  id,
  role,
  explodedOffset,
  ...(settle ? { settle } : {}),
  ...(settleField ? { settleField } : {}),
}));""", """const parts: MechanismPart[] = SPECS.map(({ id, role, explodedOffset, settle, settleField, arrival }) => ({
  id,
  role,
  explodedOffset,
  ...(settle ? { settle } : {}),
  ...(settleField ? { settleField } : {}),
  ...(arrival ? { arrival } : {}),
}));""")

rep(P, """    fork: place(HEAD_TOP, steered),
""", """    fork: place(HEAD_TOP, steered),
    basket: place(HEAD_TOP, steered),
""")

# ---- the core role default ----
A = 'src/scene/mote/attributes.ts'
rep(A, """ * Core: from SETTLE_WINDOW up, so no core mote is part-settled at assembly 0, and done by 0.44, one
 * flare width before the cold open's hold at 0.45 (the spec section holds at 0.46, with the whole
 * core built). Body: to 0.97, so the bicycle's fittings, which land last, fit inside it.
 */
export const ROLE_SETTLE: Record<Role, readonly [number, number]> = {
  core: [SETTLE_WINDOW, 0.44],""", """ * Core: from SETTLE_WINDOW up, so no core mote is part-settled at assembly 0, and done by 0.32, one
 * flare width before the cold open's hold at 0.33 (the spec section holds at 0.34, with the whole
 * core built). 0.32, not the first 0.44: the bicycle's basket needed a stage of its own, and the
 * core, which lands as one group, gave it the room. Body: to 0.97, so the bicycle's fittings, which
 * land last, fit inside it.
 */
export const ROLE_SETTLE: Record<Role, readonly [number, number]> = {
  core: [SETTLE_WINDOW, 0.32],""")
rep('src/scene/mote/attributes.test.ts', """  if (role === "core") return SETTLE_WINDOW + (0.44 - SETTLE_WINDOW) * h1;""",
    """  if (role === "core") return SETTLE_WINDOW + (0.32 - SETTLE_WINDOW) * h1;""")
rep('src/scene/mote/attributes.test.ts', """    expect(settleWindow(part("core"))).toEqual([SETTLE_WINDOW, 0.44]);""",
    """    expect(settleWindow(part("core"))).toEqual([SETTLE_WINDOW, 0.32]);""")
M = 'src/scene/mote/mote.test.ts'
rep(M, """  it('settles every core mote inside [SETTLE_WINDOW, 0.44]: unsettled at assembly 0, settled by 0.44', () => {""",
    """  it('settles every core mote inside [SETTLE_WINDOW, 0.32]: unsettled at assembly 0, settled by 0.32', () => {""")
rep(M, """      expect(a.settle).toBeLessThanOrEqual(0.44);""", """      expect(a.settle).toBeLessThanOrEqual(0.32);""")
print('ok')
