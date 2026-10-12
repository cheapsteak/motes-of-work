// The look of the galaxy's classes of body (docs/specs/2026-10-09-act-2-reskin.md §4.3, §4.4, §4.6):
// one place for the stars' values and the planets' (the re-skin's Task 7). A re-tune is a one-line
// change here: star.ts and terminator.ts read these, and glslClassLookConstants() and
// glslPlanetLookConstants() splice them into star.glsl and terminator.glsl (shaderSource.ts), so the
// TS and the GLSL cannot drift; the planets' colours reach the shaders in the bodies texture (T6).
import { STAR_TINT } from '../galaxy/spriteLook';
import { hexToRgb } from './birth';
import { LIGHTING } from '../lighting';

/**
 * A star's dots (§4.3): `core` in a gaussian ball and `halo` round it, its shell motes (160); and its
 * spikes, `spikeRows` rows of `spikeDots` dots (96), drawn in screen space (net-spikes).
 */
export const STAR_DOTS = { core: 40, halo: 120, spikeRows: 6, spikeDots: 16 } as const;

/**
 * How a star looks (§4.3):
 *  - its tint runs from `white` to `amber` by its temperature; the amber end is the background's warm
 *    tint (one home: STAR_TINT.warm, src/scene/galaxy/galaxySystem.ts), short of the person's amber
 *    and the ember;
 *  - each dot is `dotDiameter` world units across: today's star shell mote, BODY_LOOK.dotShare 0.5 ×
 *    π × STAR_R 0.9 / 20 rows, drawn by motePx (its 1 px floor);
 *  - the core's dots lie in a gaussian ball of `coreSigma` R; the halo's at `haloFrom` R plus an
 *    exponential draw of scale `haloScale` R, cut at `haloMax` R; a dot ρ R out has gain e^(−ρ/`fall`);
 *  - its `brightness` is drawn in this range: it scales its light and its spikes' length, and from
 *    `sixFrom` up a star has six spikes, below it four, at `spikeAngles` degrees (none vertical, so
 *    they stand lower above the star than across it);
 *  - only the brightest stars carry spikes: brightness from `spikeFrom` (7 of the essay's 30, about
 *    the top quarter), or any star the camera is close to, by its glow's unclamped size
 *    (5 R focal / d, CSS px) over `spikeNear`, so a close-up star keeps its spikes;
 *  - a spike is `spikeLen` × the glow sprite's px × brightness long, its dot u of the way out
 *    `spikeGain` × (1 − u)^`spikeFall` as bright (they hint, not shout), and the spikes come in by the
 *    glow's px over `spikeLod`;
 *  - it breathes ×(1 + `breath` sin(2π t / period + 2π phase)), its period drawn in `breathPeriod` s.
 */
export const STAR_LOOK = {
  white: '#F4F7FF',
  amber: STAR_TINT.warm,
  dotDiameter: 0.0707,
  coreSigma: 0.25,
  haloFrom: 0.6,
  haloScale: 0.55,
  haloMax: 2.2,
  fall: 0.7,
  brightness: [0.55, 1],
  sixFrom: 0.8,
  spikeAngles: { 4: [45, 135, 225, 315], 6: [0, 60, 120, 180, 240, 300] },
  spikeFrom: 0.85,
  spikeNear: [60, 80],
  spikeLen: 1.6,
  spikeGain: 0.5,
  spikeFall: 1.5,
  spikeLod: [6, 12],
  breath: 0.12,
  breathPeriod: [4, 9],
} as const;

/**
 * How a planet and its moons look (§4.4):
 *  - its colour is one of the `cool` hues (its Body.hue, drawn from the planetHue stream), mixed
 *    `starTint` of the way toward its star's tint; a moon takes its planet's; C1 is pinned to `hero`,
 *    unmixed (× FOCUS_GAIN that is the freeze mock's luminous cyan);
 *  - every shell mote and icosphere fragment is lit by its terminator toward its own star:
 *    mix(night, 1, smoothstep(−`edge`, `edge`, n·L)), `night` the planet lamp's subject's or the rest's;
 *    a lit (ember) body is unshaded;
 *  - the icosphere has no rim: its `fill` alone, lit by the same terminator;
 *  - the hemisphere facing away from the camera is dimmed to `farSide.dim`, rising to full over
 *    `farSide.soft` of n·V up to the limb (n·V = 0, kept whole), so a lattice lit from behind reads as a
 *    crescent rather than its lit far side seen through it (the controller's ruling, fix round 1:
 *    spec df-1, "the moons are crescents"); a lit body is not dimmed.
 */
export const PLANET_LOOK = { cool: ['#4DA3FF', '#3D8BFF', '#5BC0EB', '#46C2C9', '#6FA8DC'], hero: '#1FB0FF', starTint: 0.25,
  night: { rest: 0.15, subject: 0.5 }, edge: 0.2, fill: 0.035, farSide: { dim: 0.2, soft: 0.3 } } as const;

/**
 * A moon's far hemisphere's light (re-skin Task 9, the moon see-through): the night's, PLANET_LOOK.night.rest
 * x LIGHTING.backfaceDim, where a planet's is PLANET_LOOK.farSide.dim. At 16-24 px a moon's lattice is
 * open enough that its lit far side, at a planet's 0.2, showed through its night half.
 */
export const MOON_FAR_DIM = PLANET_LOOK.night.rest * LIGHTING.backfaceDim;

/** The share of the halo's exponential law that lies inside its cut at haloMax (star.ts draws inside it). */
export const STAR_HALO_CUT = 1 - Math.exp(-(STAR_LOOK.haloMax - STAR_LOOK.haloFrom) / STAR_LOOK.haloScale);

/** A number as a GLSL float literal that parses back to it. */
function lit(v: number): string {
  const s = String(v);
  return /[.e]/.test(s) ? s : `${s}.0`;
}

const vec3Of = (hex: string): string => `vec3(${hexToRgb(hex).map(lit).join(', ')})`;
const name = (k: string): string => `STAR_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

/** The constants star.glsl reads, generated from STAR_DOTS and STAR_LOOK (spliced by shaderSource.ts). */
export function glslClassLookConstants(): string {
  const out = ['// The look of the stars, generated from src/scene/node/classLook.ts.'];
  for (const [k, v] of Object.entries(STAR_DOTS)) out.push(`const int ${name(`dots${k[0].toUpperCase()}${k.slice(1)}`)} = ${v};`);
  for (const [k, v] of Object.entries(STAR_LOOK)) {
    if (typeof v === 'string') out.push(`const vec3 ${name(k)} = ${vec3Of(v)}; // ${v}`);
    else if (typeof v === 'number') out.push(`const float ${name(k)} = ${lit(v)};`);
    else if (Array.isArray(v)) out.push(`const vec2 ${name(k)} = vec2(${v.map(lit).join(', ')});`);
  }
  out.push(`const float STAR_HALO_CUT = ${lit(STAR_HALO_CUT)}; // derived: 1 - exp(-(haloMax - haloFrom) / haloScale)`);
  for (const n of [4, 6] as const) {
    const a = STAR_LOOK.spikeAngles[n];
    out.push(`const float STAR_SPIKE_ANGLES_${n}[${a.length}] = float[${a.length}](${a.map(lit).join(', ')});`);
  }
  return out.join('\n');
}

/**
 * The constants terminator.glsl reads, generated from PLANET_LOOK (spliced by shaderSource.ts). The
 * colours are not among them: they reach the shaders in the bodies texture's T6 (bodyData.ts).
 */
export function glslPlanetLookConstants(): string {
  return [
    '// The look of the planets and moons, generated from src/scene/node/classLook.ts.',
    `const float PLANET_EDGE = ${lit(PLANET_LOOK.edge)};`,
    `const float PLANET_NIGHT_REST = ${lit(PLANET_LOOK.night.rest)};`,
    `const float PLANET_NIGHT_SUBJECT = ${lit(PLANET_LOOK.night.subject)};`,
    `const float PLANET_FILL = ${lit(PLANET_LOOK.fill)};`,
    `const float PLANET_FAR_DIM = ${lit(PLANET_LOOK.farSide.dim)};`,
    `const float PLANET_MOON_FAR_DIM = ${lit(MOON_FAR_DIM)}; // derived: night.rest x LIGHTING.backfaceDim`,
    `const float PLANET_FAR_SOFT = ${lit(PLANET_LOOK.farSide.soft)};`,
  ].join('\n');
}

// ---- The plan's schematic (re-skin §4.7, Task 7b) ----

/**
 * How a plan's schematic looks (re-skin §4.7; scratch/session/schematic/mock.html `drawPlan` and
 * `drawRH`, concepts R and H). R's alphas and sizes are already × `bold`. A re-tune is a one-line change
 * here: plan.ts reads these and glslPlanConstants() splices them into plan.glsl (shaderSource.ts).
 *  - `phosphor`: hue 154, clear of the agents' blue, the frozen cyan, the amber, the ember and the jets' violet;
 *  - `bandHalfWidth`: R's band is the orbit ± this (units); the closed arc is its fill on the centre line;
 *  - `centreCircle`: R's small circle round the star (units); no crosshair (the spikes are the star's mark);
 *  - `arc`: H's forward arc, `span` rad of eccentric anomaly ahead of the planned place; node k at
 *    t + k·period·`nodeStep` (k < `nodes`); a dash is on for dash[0] of every dash[1] parts of a
 *    `dashPeriod` (rad), fixed in angle so it never crawls as the camera zooms, or of `dashDots` of the
 *    arc's pitch where that is longer (a small orbit's dash a stroke of whole dots, not a speck: at df-5
 *    on a phone a 12.5° period on a 15 px orbit is 3 px, one pitch); its dots its mark's pitch apart, or
 *    closer, to `pitchMin`, where that leaves its 100° under `minDots` (a small orbit's arc then holds
 *    two dashes and more, so the window's dissolve, dash by dash, leaves it an arc); a `chevron` at its end,
 *    two legs `len` units long (at least `lenPx` CSS px on screen, so it reads in the neighbourhood: at
 *    df-5 on a phone 0.7 units are 3 px), `spread` rad off the arc's tangent;
 *  - `deviation`: H's departure, from the body's drawn place curving out `out` units over `span` rad;
 *  - `edge`: R's departure, the band's outer edge over ± `span` rad about the body's actual angle;
 *  - `graduations`: `count` ticks on the outermost orbit, pushed `out` units, every `major`th long;
 *    `len` units long (major, minor), of `dots` dots;
 *  - `stalkFoot`: the stalk's foot cross's half-width (units); `nodeArm`: a node cross's, at least
 *    `nodeArmPx` CSS px on screen (0.35 units are 1.6 px at df-5 on a phone: a cross read as a dot);
 *  - `outline`: a silhouette is `padPx` CSS px wider than its body, so its rim and the body's do not merge;
 *    a moon's outline comes in by the moon's own diameter over `moonPx` CSS px;
 *  - `dimension`: its extension past the line's end (`ext` units), its tick (± `tick` rad), its planned
 *    value `along` the line and `offsetPx` off it, the actual value `past` units past the body, in
 *    `decimals` decimals; the numerals stay `margin` CSS px inside the screen's sides;
 *  - `numeral`: 5×7 dot-matrix numerals, a cell `pitchPx` CSS px, a dot `size` × the pitch (11 × 16 px a
 *    glyph: the readable floor on a phone);
 *  - `departure`: the derp's offset, in band half-widths, over which a body's departure marks rise;
 *  - `stretch`: a mark too long for its dots may space them out to this many times its pitch, and past
 *    that draws the part of itself nearest its planned place;
 *  - `glowEdgePx`: nothing is drawn inside the star's glow sprite, fading in over this many CSS px past it;
 *  - `binary`: a pair's marks (re-skin §4.10): the barycentre's cross (`crossLen` units, `crossDots` a
 *    bar) and circle (`circle` units, `circleDots`), each star's ellipse, and its stable limit, dashed
 *    `limitDash` of every 8 of `limitDots`;
 *  - `marks`: per mark, [alpha, size CSS px, pitch CSS px] (0: a fixed count, no pitch).
 */
export const PLAN_LOOK = {
  phosphor: '#8FE3C8',
  bold: 1.2,
  bandHalfWidth: 0.45,
  centreCircle: 1.3,
  arc: { span: 1.75, nodes: 3, nodeStep: 1 / 12, dash: [7, 11], dashPeriod: 0.2182, dashDots: 6, minDots: 24, pitchMin: 2, chevron: { len: 0.7, lenPx: 6, spread: 0.6 } },
  deviation: { span: 1.2, out: 0.8 },
  edge: { span: 0.3, size: 2.0 },
  graduations: { count: 24, major: 6, len: [1.2, 0.5], dots: [4, 2], out: 1.2 },
  stalkFoot: 0.3,
  nodeArm: 0.35,
  nodeArmPx: 2.5,
  outline: { padPx: 2, moonPx: [10, 14] },
  dimension: { ext: 0.7, tick: 0.045, along: 0.5, offsetPx: 16, decimals: 1, past: 2.6, margin: 16 },
  numeral: { pitchPx: 2.5, size: 0.72 },
  departure: [0.15, 0.6],
  stretch: 3,
  glowEdgePx: 2,
  binary: { crossLen: 1.6, crossDots: 7, circle: 0.45, circleDots: 10, limitDots: 96, limitDash: 5 },
  marks: {
    ring: [0.55, 1.4, 7],
    bandEdge: [0.6, 1.68, 5],
    bandFill: [0.27, 1.43, 11],
    arc: [0.85, 1.5, 3],
    node: [1.0, 1.8, 0],
    chevron: [0.95, 1.5, 2],
    deviation: [0.95, 1.5, 3],
    stalk: [0.72, 1.1, 4],
    outline: [0.9, 1.4, 4],
    wire: [0.5, 1.1, 4],
    graduation: [0.66, 1.2, 0],
    centre: [0.96, 1.1, 4],
    dimension: [0.95, 1.2, 4],
    numeral: [0.95, 1.8, 0],
    binaryCross: [1.0, 1.6, 0],
    binaryCircle: [0.9, 1.3, 0],
    binaryEllipse: [0.5, 1.3, 0],
    binaryLimit: [0.95, 1.7, 0],
  },
} as const;

/**
 * The plan's 5×7 dot-matrix numerals (mock.html FONT): 0-9 then '.', seven rows each, a row's five
 * cells as bits, the leftmost the highest (16). Spliced into plan.glsl as a uint array.
 */
export const PLAN_FONT: readonly number[] = [
  ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
].flatMap((rows) => rows.map((r) => parseInt(r, 2)));

/** The glyph index of '.' in PLAN_FONT (the digits are 0-9). */
export const PLAN_GLYPH_POINT = 10;

const planName = (k: string): string => `PLAN_${k.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

/** The constants plan.glsl reads, generated from PLAN_LOOK and PLAN_FONT (spliced by shaderSource.ts). */
export function glslPlanConstants(): string {
  const L = PLAN_LOOK;
  const out = ["// The look of the plan's schematic, generated from src/scene/node/classLook.ts."];
  out.push(`const vec3 PLAN_PHOSPHOR = ${vec3Of(L.phosphor)}; // ${L.phosphor}`);
  for (const k of ['bold', 'bandHalfWidth', 'centreCircle', 'stalkFoot', 'nodeArm', 'nodeArmPx', 'stretch', 'glowEdgePx'] as const) out.push(`const float ${planName(k)} = ${lit(L[k])};`);
  out.push(`const float PLAN_ARC_SPAN = ${lit(L.arc.span)};`);
  out.push(`const int PLAN_ARC_NODES = ${L.arc.nodes};`);
  out.push(`const float PLAN_ARC_NODE_STEP = ${lit(L.arc.nodeStep)};`);
  out.push(`const vec2 PLAN_ARC_DASH = vec2(${L.arc.dash.map(lit).join(', ')});`);
  out.push(`const float PLAN_ARC_DASH_PERIOD = ${lit(L.arc.dashPeriod)};`);
  out.push(`const float PLAN_ARC_DASH_DOTS = ${lit(L.arc.dashDots)};`);
  out.push(`const int PLAN_ARC_DASH_ON = ${Math.ceil((L.arc.dashDots * L.arc.dash[0]) / L.arc.dash[1])}; // a dash's lit slots of its dashDots`);
  out.push(`const vec2 PLAN_ARC_PITCH = vec2(${lit(L.arc.minDots)}, ${lit(L.arc.pitchMin)}); // minDots, pitchMin`);
  out.push(`const vec3 PLAN_CHEVRON = vec3(${lit(L.arc.chevron.len)}, ${lit(L.arc.chevron.spread)}, ${lit(L.arc.chevron.lenPx)}); // len, spread, lenPx`);
  out.push(`const vec2 PLAN_DEVIATION = vec2(${lit(L.deviation.span)}, ${lit(L.deviation.out)}); // span, out`);
  out.push(`const vec2 PLAN_EDGE = vec2(${lit(L.edge.span)}, ${lit(L.edge.size)}); // span, size`);
  const gr = L.graduations;
  out.push(`const int PLAN_GRAD_COUNT = ${gr.count};`);
  out.push(`const int PLAN_GRAD_MAJOR = ${gr.major};`);
  out.push(`const vec2 PLAN_GRAD_LEN = vec2(${gr.len.map(lit).join(', ')});`);
  out.push(`const ivec2 PLAN_GRAD_DOTS = ivec2(${gr.dots.join(', ')});`);
  out.push(`const float PLAN_GRAD_OUT = ${lit(gr.out)};`);
  out.push(`const float PLAN_OUTLINE_PAD_PX = ${lit(L.outline.padPx)};`);
  out.push(`const vec2 PLAN_MOON_PX = vec2(${L.outline.moonPx.map(lit).join(', ')});`);
  const d = L.dimension;
  out.push(`const float PLAN_DIM_EXT = ${lit(d.ext)};`);
  out.push(`const float PLAN_DIM_TICK = ${lit(d.tick)};`);
  out.push(`const float PLAN_DIM_ALONG = ${lit(d.along)};`);
  out.push(`const float PLAN_DIM_OFFSET_PX = ${lit(d.offsetPx)};`);
  out.push(`const float PLAN_DIM_DECIMALS = ${lit(d.decimals)};`);
  out.push(`const float PLAN_DIM_PAST = ${lit(d.past)};`);
  out.push(`const float PLAN_DIM_MARGIN = ${lit(d.margin)};`);
  out.push(`const float PLAN_NUMERAL_PITCH = ${lit(L.numeral.pitchPx)};`);
  out.push(`const float PLAN_NUMERAL_SIZE = ${lit(L.numeral.size)};`);
  out.push(`const vec2 PLAN_DEPARTURE = vec2(${L.departure.map(lit).join(', ')});`);
  const b = L.binary;
  out.push(`const float PLAN_BIN_CROSS_LEN = ${lit(b.crossLen)};`);
  out.push(`const int PLAN_BIN_CROSS_DOTS = ${b.crossDots};`);
  out.push(`const float PLAN_BIN_CIRCLE = ${lit(b.circle)};`);
  out.push(`const int PLAN_BIN_CIRCLE_DOTS = ${b.circleDots};`);
  out.push(`const int PLAN_BIN_LIMIT_DOTS = ${b.limitDots};`);
  out.push(`const int PLAN_BIN_LIMIT_DASH = ${b.limitDash};`);
  for (const [k, v] of Object.entries(L.marks)) out.push(`const vec3 ${planName(`look${k[0].toUpperCase()}${k.slice(1)}`)} = vec3(${v.map(lit).join(', ')}); // alpha, size, pitch`);
  out.push(`const uint PLAN_FONT[${PLAN_FONT.length}] = uint[${PLAN_FONT.length}](${PLAN_FONT.map((v) => `${v}u`).join(', ')});`);
  out.push(`const int PLAN_GLYPH_POINT = ${PLAN_GLYPH_POINT};`);
  return out.join('\n');
}
