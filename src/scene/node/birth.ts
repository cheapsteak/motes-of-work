// The galaxy's constants (docs/specs/2026-10-06-act-2-storyboard-and-network.md §3.4, §3.6-§3.8;
// docs/specs/2026-10-07-galaxy-orbits.md): one source for both mirrors. light.ts, orbit.ts, derp.ts,
// shell.ts and bodyMote.ts read them here, and shaderSource.ts (this folder) splices them into their
// GLSL (glslLightConstants() into light.glsl, and so on), so the GLSL and the TypeScript read the same
// numbers.

/** A builder mote sets out this far (on `net.growth`) before it lands, as a mote's settle window. */
export const NODE_BIRTH_WINDOW = 0.012;
/** A body's fix (its mend: nodeLight's `fix`, the derp's `v` 1 → 0) runs over this much of `net.fix`, up to its `fixAt`. */
export const NODE_FIX_WINDOW = 0.03;
/**
 * The fix's order (the author on v25: "the yellow stuff should descend first ... glows yellow for a
 * little bit, and then it should fix itself"), on `net.fix` before the planet lamp's subject's `fixAt`:
 * the person's motes fall over NODE_LAND_WINDOW and are home NODE_PULSE_WINDOW + NODE_FIX_WINDOW
 * before it (light.ts nodeLanded); the piece then glows gold over NODE_PULSE_WINDOW (nodePulse,
 * FIX_PULSE); then it mends over NODE_FIX_WINDOW. No mending starts before the landing ends. Every
 * other body (the sweep, seen from afar) keeps its motes landing with its mend over NODE_FIX_WINDOW.
 */
export const NODE_LAND_WINDOW = 0.025;
export const NODE_PULSE_WINDOW = 0.02;
/** A landing mote flares for this much of its clock either side of the landing. */
export const NODE_FLARE_WIDTH = 0.004;
/** The flare's brightness on top of the settled glow, at the instant of landing. */
export const NODE_FLARE_GAIN = 3.0;
/** A landed mote's brightness, as a share of its glow in flight (`mix(1, 0.5, t)`). */
export const NODE_SETTLED_BRIGHTNESS = 0.8;
/** A body lights over this much of `net.highlight` up to its `hiAt`. */
export const NODE_HI_WINDOW = 0.02;
/** A lit body's motes are brighter by this times the highlight (`1 + 1.5 hi`). */
export const NODE_HI_GAIN = 1.5;
/**
 * The fan-out surge (§3.4 step 7): hop h lights over [from + perHop h - window, from + perHop h] of
 * `net.highlight`. Hops past `maxHop` light with it: the surge completes hops 0..6 by highlight 1, and
 * a copy of hop-6 code (some seeds have one) is lit with its source.
 */
export const NODE_SURGE_FROM = 0.92;
export const NODE_SURGE_PER_HOP = 0.012;
export const NODE_SURGE_WINDOW = 0.01;
export const NODE_SURGE_MAX_HOP = 6;
/**
 * A stream's dots move this share of its length per ambient second, every stream from its parent to
 * its child: out from the core and the stars, along a copy, and in along the one up-stream from C7
 * to R1, the way their builders fly (stream.ts).
 */
export const NODE_STREAM_SPEED = 0.15;
/** Where a builder sets out: its stream's foot, spread by this times its parent's radius. */
export const NODE_BUILDER_SPREAD = 0.3;
/** Where a person mote sets out: this many radii above its body's centre ... */
export const NODE_PERSON_HEIGHT = 3.0;
/** ... spread by this many radii; it falls through a point this many radii above its flight's middle. */
export const NODE_PERSON_SPREAD = 0.5;
export const NODE_PERSON_BOW = 1.5;
/**
 * The texture value of a `hiAt` or `fixAt` that never comes (a clean body, or C1, never lit): past
 * the end of every clock (each runs 0..1), so the windows that end there never open.
 */
export const NODE_NEVER = 2.0;
/**
 * The galaxy's palette (§3.7), one source for every galaxy shader: the agents' blue (every body,
 * every stream), the person's amber (the fix), and the highlight's ember, with how far a lit thing is
 * mixed toward it. light.glsl takes the palette spliced; body.frag.glsl draws the bodies from its own
 * copies, held to these by a test (bodySystem.test.ts).
 */
export const NODE_PALETTE = {
  NODE_AGENT: '#4DA3FF',
  NODE_HUMAN: '#FFB347',
  NODE_EMBER: '#FF6B57',
} as const;
/** A lit mote's or body's colour is mixed this far toward ember at full highlight. */
export const NODE_EMBER_MIX = 0.8;

/**
 * What a galaxy mote is (`aMote.y`): it builds its body, it is the person's fix, it is a moon's shell,
 * a dotted orbit or track, or a star's or core body's glow sprite.
 */
export enum NodeRole {
  Builder = 0,
  Person = 1,
  Moon = 2,
  Track = 3,
  Glow = 4,
  /** A mote of the freeze frame's bursts (freeze.ts freezeTick): drawn by tick.vert.glsl, never by bodyMote. */
  Tick = 5,
}

/** The constants light.glsl reads (the landing's window, the light, the surge, the ember mix). */
const LIGHT_CONSTANT_LIST: readonly [string, number][] = [
  ['NODE_FIX_WINDOW', NODE_FIX_WINDOW],
  ['NODE_LAND_WINDOW', NODE_LAND_WINDOW],
  ['NODE_PULSE_WINDOW', NODE_PULSE_WINDOW],
  ['NODE_HI_WINDOW', NODE_HI_WINDOW],
  ['NODE_SURGE_FROM', NODE_SURGE_FROM],
  ['NODE_SURGE_PER_HOP', NODE_SURGE_PER_HOP],
  ['NODE_SURGE_WINDOW', NODE_SURGE_WINDOW],
  ['NODE_SURGE_MAX_HOP', NODE_SURGE_MAX_HOP],
  ['NODE_EMBER_MIX', NODE_EMBER_MIX],
];

/** `#rrggbb` as the three channels in [0, 1]. */
export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

/** The constants light.glsl reads, and the palette, generated from this file. */
export function glslLightConstants(): string {
  return [
    '// The light constants and the palette, generated from src/scene/node/birth.ts.',
    ...LIGHT_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    ...Object.entries(NODE_PALETTE).map(([name, hex]) => `const vec3 ${name} = vec3(${hexToRgb(hex).map(lit).join(', ')}); // ${hex}`),
  ].join('\n');
}

/** The ones light.glsl takes, for its declarations test. */
export const LIGHT_CONSTANTS: ReadonlyMap<string, number> = new Map(LIGHT_CONSTANT_LIST);

/**
 * The galaxy turns rigidly about its core once in this many ambient seconds (galaxy §2.1: twenty
 * minutes), so its arms keep their shape over any read. orbit.ts reads it here, and shaderSource.ts
 * splices glslOrbitConstants() into orbit.glsl.
 */
export const GALAXY_TURN_PERIOD = 1200;

/**
 * The significant bits a period's head keeps when orbitTurns (orbit.ts) reduces the ambient clock by
 * it, Cody-Waite style: k times the head is exact in float32 for k below 2^(24 − this). The GLSL
 * takes it as ORBIT_HEAD_MASK, the float32 bits it keeps.
 */
export const ORBIT_HEAD_BITS = 9;

const ORBIT_CONSTANT_LIST: readonly [string, number][] = [['GALAXY_TURN_PERIOD', GALAXY_TURN_PERIOD]];

/** ORBIT_HEAD_BITS as a float32 bit mask: the sign, the exponent and the top ORBIT_HEAD_BITS − 1 stored mantissa bits. */
export const ORBIT_HEAD_MASK = (0xffffffff << (24 - ORBIT_HEAD_BITS)) >>> 0;

/** The constants orbit.glsl reads, generated from this file. */
export function glslOrbitConstants(): string {
  return [
    '// The orbit constants, generated from src/scene/node/birth.ts.',
    ...ORBIT_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    `const uint ORBIT_HEAD_MASK = 0x${ORBIT_HEAD_MASK.toString(16).toUpperCase()}u; // ORBIT_HEAD_BITS = ${ORBIT_HEAD_BITS}`,
  ].join('\n');
}

/** Every constant spliced into orbit.glsl by name, for its declarations test. */
export const ORBIT_CONSTANTS: ReadonlyMap<string, number> = new Map(ORBIT_CONSTANT_LIST);

/**
 * The derps (galaxy §5, §12.3, §14.4; morph-and-scatter §2.2): the schedule, the six kinds and the
 * burst. derp.ts reads them here, and shaderSource.ts splices glslDerpConstants() into derp.glsl.
 * Lengths are in units of a body's track radius `r` or its own radius `R`, as named; times in
 * ambient seconds; `s` is the event's own time, 0 to 1 over NODE_DERP_DUR.
 */
/** A derping body has one event slot this long (galaxy §5.2) ... */
export const NODE_DERP_PERIOD = 2.2;
/** ... and its event, hashed somewhere inside the slot, lasts this long: a 45 % duty. */
export const NODE_DERP_DUR = 1.0;
/** The skip drifts this far off its track (× r) and lifts this far out of its plane (× r) at its peak. */
export const DERP_SKIP_R = 0.55;
export const DERP_SKIP_LIFT = 0.2;
/** The skip eases out to its peak by this `s`, snaps home by the next, then rings at this amplitude. */
export const DERP_SKIP_PEAK = 0.6;
export const DERP_SKIP_HOME = 0.72;
export const DERP_SKIP_RING = 0.25;
/** The stall holds the body still until this `s`, then lets it catch up. */
export const DERP_STALL_HOLD = 0.7;
/** The reverse backs the body up by this much of its angle (rad) at `s` 0.5. */
export const DERP_REVERSE = 0.5;
/** The wobble's amplitude (× R) on x and z (half on y), and its value noise's rate per unit of `s`. */
export const DERP_WOBBLE = 0.06;
export const DERP_WOBBLE_RATE = 9;
/** A star or a core body has no orbit to derp on: every kind but the scatter is a wobble this many times as large. */
export const DERP_STAR_SHIVER = 4;
/** The burst (galaxy §12.3) is this many micro-slots, each its own hashed cut. */
export const BURST_SLOTS = 8;
/** The snap along the orbit, (h0 − 0.5) × this (rad), held for this share of the slot, then cut back. */
export const BURST_SNAP = 0.45;
export const BURST_SNAP_HOLD = 0.6;
/** With this probability (h1) a slot also jumps off the track by (h2 − 0.5) × this (× r), square-pulsed with the snap. */
export const BURST_JUMP_P = 0.7;
export const BURST_JUMP = 0.9;
/** The lift with the snap: (h3 − 0.5) × this (× r). */
export const BURST_LIFT = 0.3;
/** A hashed offset of up to this (× r) in the galaxy's plane, held for 1 / BURST_JITTER_HZ s and cut to the next, all burst long. */
export const BURST_JITTER = 0.03;
export const BURST_JITTER_HZ = 30;
/** In the burst's middle third the body trembles: value noise at this rate (Hz) and this amplitude (× R). */
export const BURST_TREMBLE = 0.05;
export const BURST_TREMBLE_HZ = 40;
/** With this probability (h6) a held slot draws a ghost at this brightness, (h5 − 0.5) × this (rad) along the orbit. */
export const BURST_GHOST_P = 0.5;
export const BURST_GHOST_GAIN = 0.45;
export const BURST_GHOST_SPAN = 0.6;
/** With this probability (h7) a slot quantises the body's own orbital time to steps of this (s). */
export const BURST_QUANT_P = 0.45;
export const BURST_QUANT_STEP = 0.1;
/**
 * The salts of the derps' finer hashes, above every salt the schedule (2k, 2k + 1) and the burst
 * (k · 64 + slot · 8 + j) reach. Event k has a block of DERP_FINE_EVENT salts from
 * `DERP_FINE_SALT + k · DERP_FINE_EVENT`: its value-noise lattice (the wobble's and the tremble's)
 * at `+ i · DERP_FINE_LATTICE + axis` (one salt per axis), and its jitter from
 * `+ DERP_FINE_JITTER_AT`, tick m at `+ m · DERP_FINE_JITTER + c` (one per axis of the plane).
 */
export const DERP_FINE_SALT = 0x40000000;
export const DERP_FINE_EVENT = 256;
export const DERP_FINE_LATTICE = 3;
export const DERP_FINE_JITTER_AT = 128;
export const DERP_FINE_JITTER = 2;
/** The wobble and the tremble shake this share as much on y as on x and z. */
export const DERP_WOBBLE_Y = 0.5;
/** The tremble runs in the middle one of this many equal parts of the burst. */
export const BURST_TREMBLE_PARTS = 3;

/** A derp's kind, as derpEvent draws it and the GLSL's DERP_KIND_<KIND> constants number it. */
export enum DerpKind {
  Burst = 0,
  Scatter = 1,
  Skip = 2,
  Stall = 3,
  Reverse = 4,
  Wobble = 5,
}

/** The kinds' weights, in DerpKind order (morph-and-scatter §2.2). */
export const DERP_WEIGHTS = [0.3, 0.25, 0.2, 0.1, 0.075, 0.075] as const;

/**
 * The kinds' cumulative weights as float32, the thresholds an event's hash is compared with: the
 * TS rounds them as the GLSL does, so a hash exactly at a threshold picks the same kind in both.
 * The last is 1, which no hash reaches.
 */
export const DERP_CUMULATIVE: readonly number[] = DERP_WEIGHTS.map((_, i) =>
  i === DERP_WEIGHTS.length - 1 ? 1 : Math.fround(DERP_WEIGHTS.slice(0, i + 1).reduce((a, b) => a + b, 0)),
);

const DERP_CONSTANT_LIST: readonly [string, number][] = [
  ['NODE_DERP_PERIOD', NODE_DERP_PERIOD],
  ['NODE_DERP_DUR', NODE_DERP_DUR],
  ['DERP_SKIP_R', DERP_SKIP_R],
  ['DERP_SKIP_LIFT', DERP_SKIP_LIFT],
  ['DERP_SKIP_PEAK', DERP_SKIP_PEAK],
  ['DERP_SKIP_HOME', DERP_SKIP_HOME],
  ['DERP_SKIP_RING', DERP_SKIP_RING],
  ['DERP_STALL_HOLD', DERP_STALL_HOLD],
  ['DERP_REVERSE', DERP_REVERSE],
  ['DERP_WOBBLE', DERP_WOBBLE],
  ['DERP_WOBBLE_RATE', DERP_WOBBLE_RATE],
  ['DERP_STAR_SHIVER', DERP_STAR_SHIVER],
  ['DERP_WOBBLE_Y', DERP_WOBBLE_Y],
  ['BURST_SLOTS', BURST_SLOTS],
  ['BURST_SNAP', BURST_SNAP],
  ['BURST_SNAP_HOLD', BURST_SNAP_HOLD],
  ['BURST_JUMP_P', BURST_JUMP_P],
  ['BURST_JUMP', BURST_JUMP],
  ['BURST_LIFT', BURST_LIFT],
  ['BURST_JITTER', BURST_JITTER],
  ['BURST_JITTER_HZ', BURST_JITTER_HZ],
  ['BURST_TREMBLE', BURST_TREMBLE],
  ['BURST_TREMBLE_HZ', BURST_TREMBLE_HZ],
  ['BURST_TREMBLE_PARTS', BURST_TREMBLE_PARTS],
  ['BURST_GHOST_P', BURST_GHOST_P],
  ['BURST_GHOST_GAIN', BURST_GHOST_GAIN],
  ['BURST_GHOST_SPAN', BURST_GHOST_SPAN],
  ['BURST_QUANT_P', BURST_QUANT_P],
  ['BURST_QUANT_STEP', BURST_QUANT_STEP],
];

/** The salt layout's constants, which derp.glsl reads as uint. */
const DERP_UINT_CONSTANT_LIST: readonly [string, number][] = [
  ['DERP_FINE_SALT', DERP_FINE_SALT],
  ['DERP_FINE_EVENT', DERP_FINE_EVENT],
  ['DERP_FINE_LATTICE', DERP_FINE_LATTICE],
  ['DERP_FINE_JITTER_AT', DERP_FINE_JITTER_AT],
  ['DERP_FINE_JITTER', DERP_FINE_JITTER],
];

/** The constants derp.glsl reads, generated from this file. */
export function glslDerpConstants(): string {
  return [
    '// The derp constants, generated from src/scene/node/birth.ts.',
    ...DERP_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    // NODE_NEVER under its own name, so derp.glsl declares nothing another library might (the stacks' node.glsl, now gone, did).
    `const float DERP_NEVER = ${lit(NODE_NEVER)}; // NODE_NEVER: a healthy body's seed`,
    ...DERP_UINT_CONSTANT_LIST.map(([name, v]) => `const uint ${name} = ${v}u;`),
    `const float DERP_CUMULATIVE[${DERP_CUMULATIVE.length}] = float[${DERP_CUMULATIVE.length}](${DERP_CUMULATIVE.map(lit).join(', ')});`,
    ...Object.entries(DerpKind)
      .filter(([, v]) => typeof v === 'number')
      .map(([name, v]) => `const int DERP_KIND_${name.toUpperCase()} = ${v};`),
  ].join('\n');
}

/** Every float constant spliced into derp.glsl by name, for its declarations test. */
export const DERP_CONSTANTS: ReadonlyMap<string, number> = new Map(DERP_CONSTANT_LIST);
/** Every uint constant spliced into derp.glsl by name, for its declarations test. */
export const DERP_UINT_CONSTANTS: ReadonlyMap<string, number> = new Map(DERP_UINT_CONSTANT_LIST);

/**
 * The cracked shell (morph-and-scatter §7.2 the equation, §2.2 the scatter): shell.ts reads them
 * here, and shaderSource.ts splices glslShellConstants() into shell.glsl. Lengths are in units of the
 * body's radius R (the shell is drawn at unit radius and scaled by R); times in seconds, a scatter's
 * `sec` counted from the start of its event.
 *
 * The equation: r(lat, lon, t) = 1 + A [sin(p lon + φ1 + w0 t) sin(q lat' + φ2 + w1 t)
 *                                       + EQ_SECOND sin(p2 lon + φ3 − w2 t) sin(q2 lat' + φ4)],
 * lat' = lat + π/2, with A = EQ_A on a cracked shell and 0 on a healthy one, and w = EQ_W.
 */
export const EQ_A = 0.02;
/** The drifts w0, w1, w2 (rad/s): the wave walks along the rows between scatters. */
export const EQ_W = [0.35, -0.22, 0.5] as const;
/** The second product's weight: it breaks the first product's checkerboard into a band of wavelengths. */
export const EQ_SECOND = 0.45;
/** A shape's lobes round a parallel, `p`, one of these ... */
export const EQ_P = [12, 14, 16, 18, 20] as const;
/** ... its half-waves pole to pole `q = p / 2 + d`, d an integer in EQ_Q_STEP ... */
export const EQ_Q_STEP = [-1, 1] as const;
/** ... and the second product's `p2 = p + d` and `q2 = max(EQ_Q2_MIN, q − d)`, d an integer in these ranges. */
export const EQ_P2_STEP = [3, 7] as const;
export const EQ_Q2_STEP = [1, 3] as const;
export const EQ_Q2_MIN = 3;
/** The lattice turns about its seeded axis, tilted this many degrees off the vertical (a range), once in SHELL_SPIN_PERIOD s. */
export const SHELL_SPIN_TILT = [25, 40] as const;
export const SHELL_SPIN_PERIOD = 14;
/** The sweep: a mote with `su = u · sweep` leaves at `SCATTER_SWEEP (su + 1)`: the release crosses the body in 80 ms. */
export const SCATTER_SWEEP = 0.04;
/** The hold: out for `SCATTER_HOLD[0] + SCATTER_HOLD[1] h4` s. */
export const SCATTER_HOLD = [0.12, 0.06] as const;
/** The return: three hard cuts SCATTER_STEP apart, `k` 1 → 0.55 → 0.25 → 0. */
export const SCATTER_RETURN = [0.55, 0.25, 0] as const;
export const SCATTER_STEP = 0.05;
/** The jitter while out: a hashed offset of length at most this, held for 1 / SCATTER_JITTER_HZ s and cut to the next. */
export const SCATTER_JITTER = 0.03;
export const SCATTER_JITTER_HZ = 30;
/** Each axis of the jitter spans ± this, so the offset's length stays under SCATTER_JITTER. */
export const SCATTER_JITTER_AXIS = SCATTER_JITTER / Math.sqrt(3);
/** The direction: a share SCATTER_INWARD[0] of the motes (h6) leave along the normal times SCATTER_INWARD[1], the rest outward ... */
export const SCATTER_INWARD = [0.22, -0.6] as const;
/** ... weighted `SCATTER_NORMAL[0] + SCATTER_NORMAL[1] h0` along the normal, plus a tangential fuzz `SCATTER_FUZZ (h1..3 − 0.5)`. */
export const SCATTER_NORMAL = [0.35, 0.65] as const;
export const SCATTER_FUZZ = 0.9;
/** The amplitude `SCATTER_AMP[0] + SCATTER_AMP[1] h5²` (at most 0.40 R); a moon's is capped at SCATTER_MOON_CAP. */
export const SCATTER_AMP = [0.12, 0.28] as const;
export const SCATTER_MOON_CAP = 0.3;
/** After a mote lands its radius rings: `RING_AMP e^(−a / RING_TAU) cos(2π RING_HZ a)`, a seconds since landing. */
export const RING_AMP = 0.06;
export const RING_TAU = 0.16;
export const RING_HZ = 6;
/** With probability AFTERSHOCK_P an event repeats its sweep AFTERSHOCK_AT s in, at AFTERSHOCK_AMP, hold only, no shape step. */
export const AFTERSHOCK_AT = 0.55;
export const AFTERSHOCK_P = 0.5;
export const AFTERSHOCK_AMP = 0.45;
/** A mote out of the shell draws at `1 + SCATTER_OUT_GAIN k`. */
export const SCATTER_OUT_GAIN = 0.6;
/**
 * The freeze's pose (freeze-frame §1.2; src/galaxy/ambient.ts): the hero moon at this `s` of a burst
 * (micro-slot 2, the snap on); the scatter the renderer forces on the held planet when the search
 * finds none in frame; and how far along the ambient clock the search walks (the galaxy's turn).
 */
export const FREEZE_MOON_S = 0.3;
export const FREEZE_SCATTER_S = 0.16;
export const FREEZE_PIN_SEARCH_S = 1200;
/**
 * The pin stands this far past FREEZE_MOON_S of the moon's event: half a tick of the burst's jitter.
 * At FREEZE_MOON_S itself the jitter's tick is exactly 9.0 (0.3 s at 30 Hz), a cut that float32 reads
 * as tick 8 and float64 as tick 9, about 0.035 units apart; half a tick on, both read tick 9 with
 * 1/60 s to spare either side, and the snap is still held (micro-slot 2 holds to s 0.325).
 */
export const FREEZE_PIN_OFFSET_S = 0.5 / BURST_JITTER_HZ;
/**
 * The shell's salts. Per event, `k · SHELL_EVENT_STRIDE + j`: the burst's block of slot k, which a
 * scatter's slot never shares with a burst (a slot is one kind); j SHELL_EVENT_SWEEP_Z and
 * SHELL_EVENT_SWEEP_AZ for the sweep, SHELL_EVENT_AFTERSHOCK for the aftershock. j starts at 2:
 * slot 0's block begins at salts 0 and 1, which are derpEvent's own offset and kind hashes for slot
 * 0, and a sweep read from them would follow the event's own kind and start. Per mote,
 * `i · SHELL_MOTE_STRIDE + j`: j 0 the normal's weight, 1–3 the fuzz, 4 the hold, 5 the amplitude, 6
 * inward or out, 7 the seed of the mote's jitter (tick m, axis c at `m · SHELL_JITTER_STRIDE + c`).
 * The spin axis and the shapes sit above every derp salt: the axis at SHELL_SALT and SHELL_SALT + 1,
 * shape n at `SHELL_SALT + SHELL_SHAPE_AT + n · SHELL_SHAPE_STRIDE + j` (j 0–3 for p, q, p2 and q2,
 * 4–7 for φ1..φ4).
 */
export const SHELL_EVENT_STRIDE = 64;
export const SHELL_EVENT_SWEEP_Z = 2;
export const SHELL_EVENT_SWEEP_AZ = 3;
export const SHELL_EVENT_AFTERSHOCK = 4;
export const SHELL_MOTE_STRIDE = 8;
export const SHELL_JITTER_STRIDE = 3;
export const SHELL_SALT = 0x60000000;
export const SHELL_SHAPE_AT = 16;
export const SHELL_SHAPE_STRIDE = 8;

const SHELL_CONSTANT_LIST: readonly [string, number][] = [
  ['EQ_SECOND', EQ_SECOND],
  ['SHELL_SPIN_PERIOD', SHELL_SPIN_PERIOD],
  ['SCATTER_SWEEP', SCATTER_SWEEP],
  ['SCATTER_STEP', SCATTER_STEP],
  ['SCATTER_JITTER_HZ', SCATTER_JITTER_HZ],
  ['SCATTER_JITTER_AXIS', SCATTER_JITTER_AXIS],
  ['SCATTER_FUZZ', SCATTER_FUZZ],
  ['RING_AMP', RING_AMP],
  ['RING_TAU', RING_TAU],
  ['RING_HZ', RING_HZ],
  ['AFTERSHOCK_AT', AFTERSHOCK_AT],
  ['AFTERSHOCK_AMP', AFTERSHOCK_AMP],
];

/** The shell's arrays, which shell.glsl reads as float arrays (the spin's tilt in degrees). */
const SHELL_ARRAY_LIST: readonly [string, readonly number[]][] = [
  ['EQ_W', EQ_W],
  ['SHELL_SPIN_TILT', SHELL_SPIN_TILT],
  ['SCATTER_HOLD', SCATTER_HOLD],
  ['SCATTER_RETURN', SCATTER_RETURN],
  ['SCATTER_INWARD', SCATTER_INWARD],
  ['SCATTER_NORMAL', SCATTER_NORMAL],
  ['SCATTER_AMP', SCATTER_AMP],
];

/** The shell's salt layout, which shell.glsl reads as uint. */
const SHELL_UINT_CONSTANT_LIST: readonly [string, number][] = [
  ['SHELL_MOTE_STRIDE', SHELL_MOTE_STRIDE],
  ['SHELL_JITTER_STRIDE', SHELL_JITTER_STRIDE],
  ['SHELL_SALT', SHELL_SALT],
];

/** The constants shell.glsl reads, generated from this file. */
export function glslShellConstants(): string {
  return [
    '// The shell constants, generated from src/scene/node/birth.ts.',
    ...SHELL_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    ...SHELL_ARRAY_LIST.map(([name, a]) => `const float ${name}[${a.length}] = float[${a.length}](${a.map(lit).join(', ')});`),
    ...SHELL_UINT_CONSTANT_LIST.map(([name, v]) => `const uint ${name} = ${v}u;`),
  ].join('\n');
}

/** Every float constant spliced into shell.glsl by name, for its declarations test. */
export const SHELL_CONSTANTS: ReadonlyMap<string, number> = new Map(SHELL_CONSTANT_LIST);
/** Every float array spliced into shell.glsl by name, for its declarations test. */
export const SHELL_ARRAYS: ReadonlyMap<string, readonly number[]> = new Map(SHELL_ARRAY_LIST);
/** Every uint constant spliced into shell.glsl by name, for its declarations test. */
export const SHELL_UINT_CONSTANTS: ReadonlyMap<string, number> = new Map(SHELL_UINT_CONSTANT_LIST);

/**
 * The streams, when the story shows them (galaxy §15.2): a dot's brightness is at most STREAM_CAP of
 * a star glow's core, faded from STREAM_FADE[0] at the parent's end to STREAM_FADE[1] at the child's,
 * and a stream's control point sits STREAM_BOW of its chord off the midpoint, toward its bowBearing.
 * The dots' pitch and count bounds are the generator's (src/galaxy/generate.ts STREAM_PITCH,
 * STREAM_DOTS): stream.ts re-exports all five and splices them into the galaxy's shaders.
 */
export const STREAM_CAP = 0.3;
export const STREAM_FADE = [1, 0.15] as const;
export const STREAM_BOW = 0.1;
/**
 * The reviewer's feed is the one exception (galaxy §15.2, the author's ruling in Task 11): it is not
 * ambient lineage but re-3's subject, "the reviewer read the same rule", a single line from the hub to
 * the light. At STREAM_CAP fading to 0.15 of it, one stream that long is invisible even framed whole,
 * so the feed is drawn at FEED_CAP of a star glow's core, unfaded along its length. stream.ts splices it
 * in with the others.
 */
export const FEED_CAP = 0.9;

/**
 * The in-fall (re-skin §4.2): the C7 → R1 `in` stream is C7's notes falling into the black hole, the
 * visible ember stream of up-1, not ambient lineage. It is drawn at IN_STREAM_CAP of a star glow's core,
 * unfaded along its length as the feed is, and ends at R1's strand join (stream.ts inFallEnd), not at
 * R1's spot. stream.ts splices it in with the others.
 */
export const IN_STREAM_CAP = 0.9;

/**
 * The text band (galaxy §8): the text panel's bottom is never lower than TEXT_BAND of the screen's
 * height, and every lit thing keeps BAND_MARGIN_PX CSS px under it. The clearance twins hold the
 * picture to it (src/timeline/netShots.ts re-exports both), and the streams and the feed are masked to
 * it in screen space (Task 11 review I1, the ruling): a stream or feed dot fades in over the
 * STREAM_BAND_SOFT_PX CSS px just under the band's margin and is drawn nowhere above that, so neither
 * lights the band, as the loose cloud does not. A desktop stream visibly ends at the band's edge.
 * stream.ts splices all three into the galaxy's shaders.
 */
export const TEXT_BAND = 0.42;
export const BAND_MARGIN_PX = 8;
export const STREAM_BAND_SOFT_PX = 4;

/**
 * The galaxy's motes (bodyMote.ts; galaxy §14.4, §15; freeze-frame §2.3). A builder lands where the
 * shell wraps outward from its stream's arrival side, its place in that order jittered by
 * BODY_BUILD_JITTER of its own hash; a body nothing built falls from BODY_FALL_HEIGHT of its radius
 * above it. Lit, a shell's motes are NODE_HI_GAIN brighter (x 2.5) and a body's rim and fill
 * BODY_HI_GAIN (x 1.35); a dotted orbit or track takes BODY_TRACK_HI of its body's light. Fixed, a
 * shell is tinted BODY_WARM toward the person's amber, a moon BODY_WARM_MOON. Inside the lamp, at
 * `net.focus` 1, everything but the subject falls to LAMP_FLOOR.
 */
export const BODY_BUILD_JITTER = 0.15;
export const BODY_FALL_HEIGHT = 3;
export const BODY_HI_GAIN = 0.35;
export const BODY_TRACK_HI = 0.5;
export const BODY_WARM = 0.3;
export const BODY_WARM_MOON = 0.6;
export const LAMP_FLOOR = 0.3;
/**
 * Under the planet lamp the subject (the piece the close shot holds) comes up toward the mocks' luminous
 * cyan by `net.focus` (the author, Task 12): its shell motes, points and bodies draw FOCUS_GAIN times as
 * bright at focus 1, the agents' blue saturating toward cyan on the screen blend, short of white. The
 * piece holds still on its paths there (bodyMote.ts focusDerp; the author on v25, who found the skip's
 * elastic snap and the moons' wobble silly): its planet's and its moons' orbit derps (all but the
 * scatter, which their shells draw) are gone at every focus, so the close-up frames it where the shot
 * aims, its moons round it, and the defect shows in its shell: the scatter, the leak and the dropout.
 * While the freeze holds, its moons keep the derp the pin caught (the moon off its path beside its ghost).
 */
export const FOCUS_GAIN = 2.5;
/**
 * The fix's pulse on the planet lamp's subject (bodyMote.ts fixPulse; the author on v25): at its peak
 * the piece's shell motes, points and bodies are mixed FIX_PULSE.warm toward the person's amber and
 * drawn 1 + FIX_PULSE.gain as bright, rising and falling over NODE_PULSE_WINDOW between the landing
 * and the mend. The gain is below 1 on purpose: the piece stands at FOCUS_GAIN, where the amber
 * brightened saturates to cream-white on the screen blend (0.85 and +0.8 read white on a phone); at half
 * its light the amber reads gold.
 */
export const FIX_PULSE = { warm: 1, gain: -0.5 } as const;
/**
 * The forced scatter's gate (re-skin Task 8b, the controller's ruling 1): while the planet lamp's
 * subject planet carries the defect and `net.focus` is over this, its derp is a scatter in every slot,
 * so the reader never waits for the first (bodyMote.ts focusScatter). Its orbit derp is gone there
 * (focusDerp), and its moons keep their own schedules' scatters, their orbit derps held too.
 */
export const FOCUS_SCATTER = 0.5;

/**
 * What bodyMote.glsl reads: its own constants, and the birth window and flare the stacks' flight used
 * (their node.glsl is gone; this file holds the values).
 */
const BODY_MOTE_CONSTANT_LIST: readonly [string, number][] = [
  ['NODE_BIRTH_WINDOW', NODE_BIRTH_WINDOW],
  ['NODE_FLARE_WIDTH', NODE_FLARE_WIDTH],
  ['NODE_FLARE_GAIN', NODE_FLARE_GAIN],
  ['NODE_SETTLED_BRIGHTNESS', NODE_SETTLED_BRIGHTNESS],
  ['NODE_HI_GAIN', NODE_HI_GAIN],
  ['NODE_BUILDER_SPREAD', NODE_BUILDER_SPREAD],
  ['NODE_PERSON_HEIGHT', NODE_PERSON_HEIGHT],
  ['NODE_PERSON_SPREAD', NODE_PERSON_SPREAD],
  ['NODE_PERSON_BOW', NODE_PERSON_BOW],
  ['NODE_STREAM_SPEED', NODE_STREAM_SPEED],
  ['BODY_BUILD_JITTER', BODY_BUILD_JITTER],
  ['BODY_FALL_HEIGHT', BODY_FALL_HEIGHT],
  ['BODY_HI_GAIN', BODY_HI_GAIN],
  ['BODY_TRACK_HI', BODY_TRACK_HI],
  ['BODY_WARM', BODY_WARM],
  ['BODY_WARM_MOON', BODY_WARM_MOON],
  ['LAMP_FLOOR', LAMP_FLOOR],
  ['FOCUS_GAIN', FOCUS_GAIN],
  ['FIX_PULSE_WARM', FIX_PULSE.warm],
  ['FIX_PULSE_GAIN', FIX_PULSE.gain],
  ['SCATTER_OUT_GAIN', SCATTER_OUT_GAIN],
  ['SCATTER_MOON_CAP', SCATTER_MOON_CAP],
  ['SCATTER_AMP_MAX', SCATTER_AMP[0] + SCATTER_AMP[1]],
  ['FREEZE_SCATTER_S', FREEZE_SCATTER_S],
  ['FOCUS_SCATTER', FOCUS_SCATTER],
];

/** The constants bodyMote.glsl reads (beside light.glsl's), generated from this file. */
export function glslBodyMoteConstants(): string {
  return [
    '// The body mote constants, generated from src/scene/node/birth.ts.',
    ...BODY_MOTE_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
  ].join('\n');
}

/** Every constant spliced into bodyMote.glsl by name, for its declarations test. */
export const BODY_MOTE_CONSTANTS: ReadonlyMap<string, number> = new Map(BODY_MOTE_CONSTANT_LIST);

/**
 * The freeze frame's dressing (docs/specs/2026-10-07-freeze-frame.md §2.1, §3.2): freeze.ts reads them
 * here, and shaderSource.ts splices glslFreezeConstants() into freeze.glsl, so the GLSL and the
 * TypeScript read the same numbers. Lengths on screen are CSS px; a burst's radii are in its source's
 * own screen radius.
 *
 * The copies: the focused piece drawn twice more, a cold copy FREEZE_COPY_PX to one side and a warm
 * one as far to the other (the moon caught mid-burst, FREEZE_MOON_COPY_PX), at FREEZE_COPY_GAIN of
 * the base, both spreading in with the dressing. The warm copy is ember turning amber as the fix
 * lands (mode A, the author's choice) or amber throughout (B). They blend additively (re-skin §4.5,
 * as the mock: bodySystem.ts), so where they overlap the base they sum to a strong double image.
 */
export const FREEZE_COPY_PX = 3;
export const FREEZE_MOON_COPY_PX = 6;
export const FREEZE_COPY_GAIN = 0.26;
export const FREEZE_WARM_MODE: 'A' | 'B' = 'A';
/** The warm mode as the GLSL reads it: 0 A, 1 B. */
export const FREEZE_WARM_MODES = { A: 0, B: 1 } as const;
/**
 * The inked limb: a shell mote whose rest normal stands within FREEZE_LIMB_BAND of edge-on
 * (f = 1 − |n·v|, feathered from the first to the second) draws FREEZE_LIMB_GAIN brighter and up to
 * FREEZE_LIMB_SIZE larger, the size swelling by FREEZE_LIMB_WEIGHT[0] + FREEZE_LIMB_WEIGHT[1] max(0, n·L)
 * toward the key light (FREEZE_LIMB_LIGHT, upper left on screen); with a break of ±FREEZE_LIMB_BREAK[1]
 * degrees about the screen angle FREEZE_LIMB_BREAK[0] (top left), feathered across it, where the line
 * starts and ends. A copy's ink is FREEZE_LIMB_COPY of the base's.
 */
export const FREEZE_LIMB_BAND = [0.78, 0.92] as const;
export const FREEZE_LIMB_GAIN = 2.25;
export const FREEZE_LIMB_SIZE = 1.55;
export const FREEZE_LIMB_BREAK = [135, 10] as const;
export const FREEZE_LIMB_WEIGHT = [0.7, 0.6] as const;
export const FREEZE_LIMB_LIGHT = [-Math.SQRT1_2, Math.SQRT1_2, 0] as const;
export const FREEZE_LIMB_COPY = 0.5;
/** Everything but the focused piece: FREEZE_DIM of its brightness on top of the lamp's floor, mixed FREEZE_GREY_MIX toward FREEZE_GREY, at full dressing. */
export const FREEZE_DIM = 0.4;
export const FREEZE_GREY = '#5c6a86';
export const FREEZE_GREY_MIX = 0.55;
/**
 * The two bursts of straight dotted dashes, in the view plane round each source's projected centre:
 * the moon's (`n` dashes of `motes` motes, from `r0` of its screen radius, `len` px long by hash) and
 * the planet's (sparser and longer, from `r0` plus `out` while its shell is out, with a gap of
 * ±`gapHalf` rad toward the moon). Each dash is staggered by up to ±FREEZE_TICK_STAGGER / 2 rad; its
 * motes are FREEZE_TICK_PX across. A source's dashes come in over FREEZE_TICK_SHOW_MOON (and
 * _PLANET) of the dressing. As the fix lands a dash keeps min(1, FREEZE_TICK_KEEP v) of its motes,
 * from its inner end, and winks out once 1 − v passes FREEZE_TICK_WINK[0] + FREEZE_TICK_WINK[1] times
 * its own hash.
 */
export const FREEZE_TICK_MOON = { n: 14, motes: 6, r0: 2.1, len: [14, 30] } as const;
export const FREEZE_TICK_PLANET = { n: 22, motes: 7, r0: 1.12, out: 0.4, len: [26, 50], gapHalf: 0.45 } as const;
export const FREEZE_TICK_STAGGER = 0.14;
export const FREEZE_TICK_PX = 1.6;
/**
 * A tick mote is never under this many device px: 1.6 CSS px is 3.2 on the phones the essay is read on,
 * but on a 1x screen a 1.6 px disc lights no pixel whole (its soft edge is all of it), and the dashes
 * fade to specks. The floor keeps a 1x screen's dot the size a 2x phone draws.
 */
export const FREEZE_TICK_MIN_DEVICE_PX = 2.5;
export const FREEZE_TICK_SHOW_MOON = [0.45, 0.95] as const;
export const FREEZE_TICK_SHOW_PLANET = [0.4, 0.9] as const;
export const FREEZE_TICK_KEEP = 1.6;
export const FREEZE_TICK_WINK = [0.15, 0.8] as const;
/** The ticks' hashes: hash01(FREEZE_TICK_SEED, FREEZE_TICK_SALT + source · 256 + dash · 4 + j), j 0 the stagger, 1 and 2 the two length sets, 3 the wink. */
export const FREEZE_TICK_SEED = 0x7f2c51;
export const FREEZE_TICK_SALT = 0x70000000;
/** How many tick motes there are: every mote of every dash of both bursts. */
export const FREEZE_TICK_COUNT = FREEZE_TICK_MOON.n * FREEZE_TICK_MOON.motes + FREEZE_TICK_PLANET.n * FREEZE_TICK_PLANET.motes;
/** The roll (degrees), the one-frame flash (+`gain` brightness, mixed `white` toward white) and the twos: FREEZE_TWOS_HZ, the copies breathing ±FREEZE_BREATH_PX / 2. */
export const FREEZE_ROLL = 4;
export const FREEZE_FLASH = { gain: 1, white: 0.45 } as const;
export const FREEZE_TWOS_HZ = 12;
export const FREEZE_BREATH_PX = 0.6;
/**
 * The scatter haze (re-skin §4.5, as the mock): while the freeze holds and the held planet's scatter is
 * out (its scatter seconds in [FREEZE_SCATTER_WINDOW[0], FREEZE_SCATTER_WINDOW[1])), its icosphere's
 * fill is FREEZE_SCATTER_FILL of its own, so its scattered motes keep C1's hue instead of piling to white.
 */
export const FREEZE_SCATTER_FILL = 0.5;
export const FREEZE_SCATTER_WINDOW = [0, 0.36] as const;
/** The held system's size on screen is never under this while `net.focus` is up (CSS px), so the hold never catches a hand-over of detail. */
export const FREEZE_MIN_SYS_PX = 120;

const FREEZE_CONSTANT_LIST: readonly [string, number][] = [
  ['FREEZE_COPY_PX', FREEZE_COPY_PX],
  ['FREEZE_MOON_COPY_PX', FREEZE_MOON_COPY_PX],
  ['FREEZE_COPY_GAIN', FREEZE_COPY_GAIN],
  ['FREEZE_LIMB_GAIN', FREEZE_LIMB_GAIN],
  ['FREEZE_LIMB_SIZE', FREEZE_LIMB_SIZE],
  ['FREEZE_LIMB_COPY', FREEZE_LIMB_COPY],
  ['FREEZE_DIM', FREEZE_DIM],
  ['FREEZE_GREY_MIX', FREEZE_GREY_MIX],
  ['FREEZE_TICK_MOON_N', FREEZE_TICK_MOON.n],
  ['FREEZE_TICK_MOON_MOTES', FREEZE_TICK_MOON.motes],
  ['FREEZE_TICK_MOON_R0', FREEZE_TICK_MOON.r0],
  ['FREEZE_TICK_PLANET_N', FREEZE_TICK_PLANET.n],
  ['FREEZE_TICK_PLANET_MOTES', FREEZE_TICK_PLANET.motes],
  ['FREEZE_TICK_PLANET_R0', FREEZE_TICK_PLANET.r0],
  ['FREEZE_TICK_PLANET_OUT', FREEZE_TICK_PLANET.out],
  ['FREEZE_TICK_GAP_HALF', FREEZE_TICK_PLANET.gapHalf],
  ['FREEZE_TICK_STAGGER', FREEZE_TICK_STAGGER],
  ['FREEZE_TICK_PX', FREEZE_TICK_PX],
  ['FREEZE_TICK_MIN_DEVICE_PX', FREEZE_TICK_MIN_DEVICE_PX],
  ['FREEZE_TICK_KEEP', FREEZE_TICK_KEEP],
  ['FREEZE_ROLL', FREEZE_ROLL],
  ['FREEZE_TWOS_HZ', FREEZE_TWOS_HZ],
  ['FREEZE_BREATH_PX', FREEZE_BREATH_PX],
  ['FREEZE_SCATTER_FILL', FREEZE_SCATTER_FILL],
];

/** The freeze's pairs, which freeze.glsl reads as vec2. */
const FREEZE_VEC2_LIST: readonly [string, readonly [number, number]][] = [
  ['FREEZE_LIMB_BAND', FREEZE_LIMB_BAND],
  ['FREEZE_LIMB_BREAK', FREEZE_LIMB_BREAK],
  ['FREEZE_LIMB_WEIGHT', FREEZE_LIMB_WEIGHT],
  ['FREEZE_TICK_MOON_LEN', FREEZE_TICK_MOON.len],
  ['FREEZE_TICK_PLANET_LEN', FREEZE_TICK_PLANET.len],
  ['FREEZE_TICK_SHOW_MOON', FREEZE_TICK_SHOW_MOON],
  ['FREEZE_TICK_SHOW_PLANET', FREEZE_TICK_SHOW_PLANET],
  ['FREEZE_TICK_WINK', FREEZE_TICK_WINK],
  ['FREEZE_SCATTER_WINDOW', FREEZE_SCATTER_WINDOW],
  ['FREEZE_FLASH', [FREEZE_FLASH.gain, FREEZE_FLASH.white]],
];

/** The constants freeze.glsl reads, generated from this file (the palette is light.glsl's, spliced before it). */
export function glslFreezeConstants(): string {
  return [
    '// The freeze constants, generated from src/scene/node/birth.ts.',
    ...FREEZE_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    ...FREEZE_VEC2_LIST.map(([name, [a, b]]) => `const vec2 ${name} = vec2(${lit(a)}, ${lit(b)});`),
    `const vec3 FREEZE_LIMB_LIGHT = vec3(${FREEZE_LIMB_LIGHT.map(lit).join(', ')});`,
    `const vec3 FREEZE_GREY = vec3(${hexToRgb(FREEZE_GREY).map(lit).join(', ')}); // ${FREEZE_GREY}`,
    `const int FREEZE_WARM_MODE = ${FREEZE_WARM_MODES[FREEZE_WARM_MODE]}; // '${FREEZE_WARM_MODE}'`,
    `const uint FREEZE_TICK_SEED = ${FREEZE_TICK_SEED}u;`,
    `const uint FREEZE_TICK_SALT = ${FREEZE_TICK_SALT}u;`,
  ].join('\n');
}

/** Every float constant spliced into freeze.glsl by name, for its declarations test. */
export const FREEZE_CONSTANTS: ReadonlyMap<string, number> = new Map(FREEZE_CONSTANT_LIST);
/** Every vec2 spliced into freeze.glsl by name, for its declarations test. */
export const FREEZE_VEC2S: ReadonlyMap<string, readonly [number, number]> = new Map(FREEZE_VEC2_LIST);

/**
 * The defect's leak (re-skin Task 8b; the defect inspector's variant 18, `MOTIONS.leakBurst`): every
 * scatter slot that fires opens two wounds on the shell, which leak dots for up to two seconds.
 *  - Intensity: the inspector's dial at its default view, `intensity`; `amp` its ampOf (0.35 + 0.65 I).
 *  - Timing: wound 1 opens `wound1[0] + wound1[1] h` s after the scatter's onset, wound 2
 *    `wound2[0] + wound2[1] h` s after wound 1, each on a whole 1/`fps` s frame of the ambient.
 *  - Size: a wound holds the dots within `cosT[0] + cosT[1] h` rad of its centre (its cosine is the
 *    wound's `cosT`).
 *  - Which dots: `frac` of a wound's dots leak; an edge dot starts up to `edgeDelay` s later, plus
 *    `startJitter` h s.
 *  - How far: out along the normal bent by `bend` of a hashed direction, `reach` × (`dist[0]` +
 *    `dist[1]` h²) × `amp` R, dimming by `dim`.
 *  - The motion: out over `out[0] + out[1] h` s on 1 − (1 − x)³, then a linger of `linger[0] +
 *    linger[1] h` s creeping `creep` further with a held `shiverHz` shiver of `shiver` R, then home in
 *    one frame.
 * A re-tune is this line: the inspector judged at I = 1 is intensity 1, amp 1.
 */
export const LEAK = { intensity: 0.35, amp: 0.35 + 0.65 * 0.35, frac: 0.75, reach: 1.8, dim: 0.15,
  wound1: [0.30, 0.10], wound2: [0.18, 0.20], cosT: [0.45, 0.15], edgeDelay: 0.25, startJitter: 0.1,
  out: [0.5, 0.6], linger: [0.25, 0.7], creep: 0.08, shiverHz: 12, shiver: 0.012, bend: 0.5, dist: [0.12, 0.4], fps: 30 } as const;

/**
 * The defect's dropout (re-skin Task 8b; the inspector's G5 lines, GK.drop): one to three screen-space
 * lines go dark across the focused defective piece: its dots, its rim and fill, and its moons' tracks.
 *  - The schedule: cells of `cell` s; a cell fires with probability `p[0] + p[1] I` (I = LEAK.intensity),
 *    for `frames[0]`..`frames[1]` frames of 1/LEAK.fps s at a hashed start inside it.
 *  - Its lines, re-rolled every `reroll` frames: `lines[0] + floor(h · lines[1] · (0.5 + I))` of them,
 *    at most `maxLines`, each `heightPx[0] + heightPx[1] h` CSS px tall on a piece `refRadiusPx` px in
 *    radius (scaled by its radius on screen), within ± `spread` of its radius of its centre.
 *  - Where: inside a box of ± `box` × its radius about its centre on screen.
 */
export const DROPOUT = { cell: 0.5, p: [0.25, 0.35], frames: [2, 5], reroll: 2, lines: [1, 3], maxLines: 5,
  heightPx: [2, 6], refRadiusPx: 95, spread: 1.1, box: 3 } as const;

/** A wound slot with no wound in it (bodyAttrs.ts packShellData): a cone no dot is in, its cosine over 1. */
export const LEAK_CLOSED = 2;

const LEAK_CONSTANT_LIST: readonly [string, number][] = [
  ['LEAK_AMP', LEAK.amp],
  ['LEAK_FRAC', LEAK.frac],
  ['LEAK_REACH', LEAK.reach],
  ['LEAK_DIM', LEAK.dim],
  ['LEAK_EDGE_DELAY', LEAK.edgeDelay],
  ['LEAK_START_JITTER', LEAK.startJitter],
  ['LEAK_CREEP', LEAK.creep],
  ['LEAK_SHIVER_HZ', LEAK.shiverHz],
  ['LEAK_SHIVER', LEAK.shiver],
  ['LEAK_BEND', LEAK.bend],
  ['LEAK_CLOSED', LEAK_CLOSED],
];

/** The leak's pairs, which leak.glsl reads as vec2. */
const LEAK_VEC2_LIST: readonly [string, readonly [number, number]][] = [
  ['LEAK_OUT', LEAK.out],
  ['LEAK_LINGER', LEAK.linger],
  ['LEAK_DIST', LEAK.dist],
];

/** The constants leak.glsl reads, generated from this file. */
export function glslLeakConstants(): string {
  return [
    '// The leak constants, generated from src/scene/node/birth.ts.',
    ...LEAK_CONSTANT_LIST.map(([name, v]) => `const float ${name} = ${lit(v)};`),
    ...LEAK_VEC2_LIST.map(([name, [a, b]]) => `const vec2 ${name} = vec2(${lit(a)}, ${lit(b)});`),
  ].join('\n');
}

/** Every float constant spliced into leak.glsl by name, for its declarations test. */
export const LEAK_CONSTANTS: ReadonlyMap<string, number> = new Map(LEAK_CONSTANT_LIST);
/** Every vec2 spliced into leak.glsl by name, for its declarations test. */
export const LEAK_VEC2S: ReadonlyMap<string, readonly [number, number]> = new Map(LEAK_VEC2_LIST);
