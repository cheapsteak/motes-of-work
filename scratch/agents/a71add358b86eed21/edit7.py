p = 'src/mechanisms/bike/index.ts'
s = open(p).read()
s = s.replace("""// Settle windows: the core lands first (its role default, done by 0.45); then the wheels, cranks and
// chain; then the fork; then the brakes; and last the frame, mudguards and ground. The spec section
// holds at assembly 0.46, a little past the core's end, and no body mote has begun to land there:
// the drive's motes start at 0.58 - SETTLE_WINDOW = 0.46.
const DRIVE_SETTLE = [0.58, 0.72] as const;
const FORK_SETTLE = [0.65, 0.8] as const;
const BRAKE_SETTLE = [0.72, 0.87] as const;
const FRAME_SETTLE = [0.8, 0.95] as const;
/** The frame is laid in place, tube by tube, over its lay order's span (shapes.ts FRAME_LAY). */
const FRAME_LAY_SETTLE = [FRAME_LAY[0].slot[0], FRAME_LAY[FRAME_LAY.length - 1].slot[1]] as const;
""", """// Settle windows: the stages the cold open builds the bike in, one line of the brief each, end to
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
""")
s = s.replace("""    settle: FRAME_LAY_SETTLE,
    // Laid where it stands""", """    settle: FRAME_SETTLE,
    // Laid where it stands""")
s = s.replace("""    settle: BRAKE_SETTLE,
    explodedOffset: at(1.2, -0.4, 0.8),""", """    settle: FITTINGS_SETTLE,
    explodedOffset: at(1.2, -0.4, 0.8),""")
s = s.replace("""    settle: BRAKE_SETTLE,
    explodedOffset: at(-1.2, -0.4, 0.8),""", """    settle: FITTINGS_SETTLE,
    explodedOffset: at(-1.2, -0.4, 0.8),""")
s = s.replace("""    settle: FRAME_SETTLE,
    explodedOffset: at(1.2, -0.5, -0.6, X, 0.6),""", """    settle: FITTINGS_SETTLE,
    explodedOffset: at(1.2, -0.5, -0.6, X, 0.6),""")
s = s.replace("""    settle: FRAME_SETTLE,
    explodedOffset: at(-1.2, -0.5, -0.6, X, -0.6),""", """    settle: FITTINGS_SETTLE,
    explodedOffset: at(-1.2, -0.5, -0.6, X, -0.6),""")
s = s.replace("""  { id: 'loose-bolts', role: 'drift', explodedOffset: at(-0.8, 1.2, 1.0), geometry: looseBolts, density: 1.3 },""",
              """  {
    id: 'loose-bolts',
    role: 'drift',
    settle: BOLTS_SETTLE,
    explodedOffset: at(-0.8, 1.2, 1.0),
    geometry: looseBolts,
    density: 1.3,
  },""")
s = s.replace("""    settle: FRAME_SETTLE,
    explodedOffset: at(0, -0.8, 0),""", """    settle: FITTINGS_SETTLE,
    explodedOffset: at(0, -0.8, 0),""")
open(p, 'w').write(s)
