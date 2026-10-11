// What the parity page compares: every MoteOut field, packed into RGBA32F passes. Kept free of
// WebGL so a unit test can check it covers MoteOut exactly (fields.test.ts). The GLSL MoteOut
// struct is generated from this list too (glslMoteOutStruct, spliced into mote.glsl), so adding a
// MoteOut field means adding it to the TS interface and here, and nowhere else.
import type { MoteOut } from '../scene/mote/mote';
import type { BodyMoteOut } from '../scene/node/bodyMote';
import type { Derp } from '../scene/node/derp';
import type { Vec3 } from '../math/vec';

export interface ParityField<Out = MoteOut> {
  /** The output field; the GLSL struct member has the same name. */
  name: keyof Out & string;
  /** Float components (a boolean is one: 0 or 1). */
  size: number;
}

export const PARITY_FIELDS: readonly ParityField[] = [
  { name: 'pos', size: 3 },
  { name: 'settled', size: 1 },
  { name: 'type', size: 1 },
  { name: 'brightness', size: 1 },
  { name: 'visible', size: 1 },
  { name: 'normal', size: 3 },
];

/** What the orbit parity mode (`?lib=orbit`) computes per (body row, ambient): orbit.glsl's bodyWorld(). */
export interface OrbitOut {
  bodyWorld: Vec3;
}

/**
 * What the orbit parity mode compares: bodyWorld's xyz. The orbit parity shader's OrbitOut struct is
 * generated from this list (glslOrbitOutStruct).
 */
export const ORBIT_PARITY_FIELDS: readonly ParityField<OrbitOut>[] = [{ name: 'bodyWorld', size: 3 }];

/**
 * What the derp parity mode (`?lib=derp`) compares: every Derp field. derp.glsl's Derp struct is
 * generated from this list (glslDerpStruct), as MoteOut is from PARITY_FIELDS.
 */
export const DERP_PARITY_FIELDS: readonly ParityField<Derp>[] = [
  { name: 'dNu', size: 1 },
  { name: 'dR', size: 1 },
  { name: 'lift', size: 1 },
  { name: 'wobble', size: 3 },
  { name: 'orbitT', size: 1 },
  { name: 'ghost', size: 1 },
  { name: 'ghostNu', size: 1 },
  { name: 'scatterS', size: 1 },
];

/**
 * What the shell parity mode (`?lib=shell`) computes per (mote, event): shell.glsl's shellWarpK(),
 * its place in the lattice's frame (`warp`) and how far out it is (`k`), and that place turned by
 * spinShell() about spinAxis() (`spun`).
 */
export interface ShellOut {
  warp: Vec3;
  k: number;
  spun: Vec3;
}

/** What the shell parity mode compares. The shell parity shader's ShellOut struct is generated from this list (glslShellOutStruct). */
export const SHELL_PARITY_FIELDS: readonly ParityField<ShellOut>[] = [
  { name: 'warp', size: 3 },
  { name: 'k', size: 1 },
  { name: 'spun', size: 3 },
];

/**
 * What the lod parity mode (`?lib=lod`) computes per sample: lod.glsl's lodGain() of an element at a
 * system's size, glowPx() of a body's radius, distance, focal length and cap, a moon's handover
 * (moonSphereGain, moonPointPx) at that size taken as the moon's diameter, and motePx() of a world
 * diameter at a scale.
 */
export interface LodOut {
  gain: number;
  glow: number;
  moonSphere: number;
  moonPoint: number;
  mote: number;
  /** The early-out: lodSkip (1 skipped, 0 not), offScreenReachPx and offScreenSkip (1, 0). */
  skip: number;
  reach: number;
  offScreen: number;
  /**
   * The neighbourhood's dissolve: hoodGlowPx() of a distance and focal length, hoodReal() of that glow
   * under a hold, hoodFar() (star.vert.glsl's fade of the far sets) and hoodSkip() of a kind at that share (1, 0).
   */
  hoodGlow: number;
  hoodReal: number;
  hoodFar: number;
  hoodSkip: number;
}

/** What the lod parity mode compares. The lod parity shader's LodOut struct is generated from this list (glslLodOutStruct). */
export const LOD_PARITY_FIELDS: readonly ParityField<LodOut>[] = [
  { name: 'gain', size: 1 },
  { name: 'glow', size: 1 },
  { name: 'moonSphere', size: 1 },
  { name: 'moonPoint', size: 1 },
  { name: 'mote', size: 1 },
  { name: 'skip', size: 1 },
  { name: 'reach', size: 1 },
  { name: 'offScreen', size: 1 },
  { name: 'hoodGlow', size: 1 },
  { name: 'hoodReal', size: 1 },
  { name: 'hoodFar', size: 1 },
  { name: 'hoodSkip', size: 1 },
];

/**
 * What the freeze parity mode (`?lib=freeze`) computes per instance (src/scene/node/freeze.ts): a
 * copy's offset, gain and tint (freezeCopy), the limb's gain and size (freezeLimb), a tick mote's
 * angle, radius, length and visibility (freezeTick), its burst's showing (freezeTickShow) and the
 * copies' breath (freezeBreath).
 */
export interface FreezeOut {
  copyOff: number;
  copyGain: number;
  tint: Vec3;
  limbGain: number;
  limbSize: number;
  tickAngle: number;
  tickRadius: number;
  tickLen: number;
  tickVisible: number;
  tickShow: number;
  /** freezeTickWarm: 1 for a warm dash, 0 for a cold one. */
  tickWarm: number;
  breath: number;
}

/** What the freeze parity mode compares. The freeze parity shader's FreezeOut struct is generated from this list (glslFreezeOutStruct). */
export const FREEZE_PARITY_FIELDS: readonly ParityField<FreezeOut>[] = [
  { name: 'copyOff', size: 1 },
  { name: 'copyGain', size: 1 },
  { name: 'tint', size: 3 },
  { name: 'limbGain', size: 1 },
  { name: 'limbSize', size: 1 },
  { name: 'tickAngle', size: 1 },
  { name: 'tickRadius', size: 1 },
  { name: 'tickLen', size: 1 },
  { name: 'tickVisible', size: 1 },
  { name: 'tickShow', size: 1 },
  { name: 'tickWarm', size: 1 },
  { name: 'breath', size: 1 },
];

/**
 * What the body parity mode (`?lib=body`) compares: every BodyMoteOut field. bodyMote.glsl's
 * BodyMoteOut struct is generated from this list (glslBodyMoteOutStruct).
 */
export const BODY_PARITY_FIELDS: readonly ParityField<BodyMoteOut>[] = [
  { name: 'pos', size: 3 },
  { name: 'brightness', size: 1 },
  { name: 'normal', size: 3 },
  { name: 'visible', size: 1 },
  { name: 'settled', size: 1 },
  { name: 'hi', size: 1 },
  { name: 'warm', size: 1 },
  { name: 'tint', size: 4 },
  { name: 'offPx', size: 1 },
];

/**
 * What the body parity mode's stream case computes per dot: bodyMote.glsl's streamDot() (where, how far
 * along, how much of it is drawn), streamGain() of its `u`, feedGain(), the feed's own, and
 * streamBandMask() at a pixel row about the text band's edge (stream.ts streamDot, streamGain, feedGain,
 * streamBandMask).
 */
export interface StreamOut {
  pos: Vec3;
  u: number;
  presence: number;
  gain: number;
  feedGain: number;
  bandMask: number;
}

/** What the stream case compares. The parity shader's StreamOut struct is generated from this list (glslStreamOutStruct). */
export const STREAM_PARITY_FIELDS: readonly ParityField<StreamOut>[] = [
  { name: 'pos', size: 3 },
  { name: 'u', size: 1 },
  { name: 'presence', size: 1 },
  { name: 'gain', size: 1 },
  { name: 'feedGain', size: 1 },
  { name: 'bandMask', size: 1 },
];

const GLSL_TYPE_OF_SIZE = ['', 'float', 'vec2', 'vec3', 'vec4'];

/** A GLSL struct `name` with one member per parity field, a float or vecN by its size. */
/**
 * What the star parity mode (`?lib=star`) computes per sample (src/scene/node/star.ts): a dot's offset
 * from its star's centre in R and its gain (starDot), a spike dot's offset on screen and gain
 * (starSpike), the breath (starBreath) and the tint (starTint).
 */
export interface StarOut {
  offset: Vec3;
  gain: number;
  spike: Vec3;
  breath: number;
  tint: Vec3;
}

/** What the star parity mode compares. The star parity shader's StarOut struct is generated from this list (glslStarOutStruct). */
export const STAR_PARITY_FIELDS: readonly ParityField<StarOut>[] = [
  { name: 'offset', size: 3 },
  { name: 'gain', size: 1 },
  { name: 'spike', size: 3 },
  { name: 'breath', size: 1 },
  { name: 'tint', size: 3 },
];

function glslOutStruct<Out>(name: string, list: string, fields: readonly ParityField<Out>[]): string {
  const members = fields.map((f) => {
    const type = GLSL_TYPE_OF_SIZE[f.size];
    if (type === undefined || type === '') throw new Error(`${name} field ${f.name} has ${f.size} components`);
    return `  ${type} ${f.name};`;
  });
  return [`// Generated from ${list} in src/parity/fields.ts.`, `struct ${name} {`, ...members, '};'].join('\n');
}

/** The GLSL MoteOut struct: one member per parity field, a float or vecN by its size. */
export function glslMoteOutStruct(fields: readonly ParityField[] = PARITY_FIELDS): string {
  return glslOutStruct('MoteOut', 'PARITY_FIELDS', fields);
}

/** The GLSL OrbitOut struct, from ORBIT_PARITY_FIELDS. */
export function glslOrbitOutStruct(): string {
  return glslOutStruct('OrbitOut', 'ORBIT_PARITY_FIELDS', ORBIT_PARITY_FIELDS);
}

/** The GLSL Derp struct, from DERP_PARITY_FIELDS. */
export function glslDerpStruct(): string {
  return glslOutStruct('Derp', 'DERP_PARITY_FIELDS', DERP_PARITY_FIELDS);
}

/** The GLSL ShellOut struct, from SHELL_PARITY_FIELDS. */
export function glslShellOutStruct(): string {
  return glslOutStruct('ShellOut', 'SHELL_PARITY_FIELDS', SHELL_PARITY_FIELDS);
}

/** A field placed in a pass, starting at component `offset` of the output texel. */
export interface PlacedField<Out = MoteOut> {
  field: ParityField<Out>;
  offset: number;
}

/** Pack the fields in order into passes of at most four components; a field is never split. */
export function parityPasses<Out = MoteOut>(fields: readonly ParityField<Out>[] = PARITY_FIELDS as readonly ParityField<Out>[]): PlacedField<Out>[][] {
  const passes: PlacedField<Out>[][] = [];
  let pass: PlacedField<Out>[] = [];
  let used = 0;
  for (const field of fields) {
    if (field.size > 4) throw new Error(`parity field ${field.name} has ${field.size} components`);
    if (used + field.size > 4) {
      passes.push(pass);
      pass = [];
      used = 0;
    }
    pass.push({ field, offset: used });
    used += field.size;
  }
  if (pass.length > 0) passes.push(pass);
  return passes;
}

/** The pass's output texel in GLSL, from a MoteOut variable named `out`: `vec4(o.pos, o.settled)`. */
export function glslPassOutput<Out>(pass: readonly PlacedField<Out>[], out: string): string {
  const parts = pass.map((p) => `${out}.${p.field.name}`);
  const used = pass.reduce((n, p) => n + p.field.size, 0);
  for (let i = used; i < 4; i++) parts.push('0.0');
  return `vec4(${parts.join(', ')})`;
}

/** The TS reference value of one field as floats, in the GLSL component order. */
export function fieldValues<Out extends object>(o: Out, name: keyof Out): number[] {
  const v = o[name] as unknown;
  if (typeof v === 'boolean') return [v ? 1 : 0];
  if (typeof v === 'number') return [v];
  return [...(v as number[])];
}

/** The GLSL LodOut struct, from LOD_PARITY_FIELDS. */
export function glslLodOutStruct(): string {
  return glslOutStruct('LodOut', 'LOD_PARITY_FIELDS', LOD_PARITY_FIELDS);
}

/** The GLSL BodyMoteOut struct, from BODY_PARITY_FIELDS. */
export function glslBodyMoteOutStruct(): string {
  return glslOutStruct('BodyMoteOut', 'BODY_PARITY_FIELDS', BODY_PARITY_FIELDS);
}

/** The GLSL StarOut struct, from STAR_PARITY_FIELDS. */
export function glslStarOutStruct(): string {
  return glslOutStruct('StarOut', 'STAR_PARITY_FIELDS', STAR_PARITY_FIELDS);
}

/** The GLSL FreezeOut struct, from FREEZE_PARITY_FIELDS. */
export function glslFreezeOutStruct(): string {
  return glslOutStruct('FreezeOut', 'FREEZE_PARITY_FIELDS', FREEZE_PARITY_FIELDS);
}

/** The GLSL StreamOut struct, from STREAM_PARITY_FIELDS. */
export function glslStreamOutStruct(): string {
  return glslOutStruct('StreamOut', 'STREAM_PARITY_FIELDS', STREAM_PARITY_FIELDS);
}

/**
 * The black hole's twins (`?lib=hole`, src/scene/hole/hole.ts): a dot's view-space place after the
 * lens, its alpha, colour and CSS size, the lens's ok, a knot's ember flag (0 for the other parts) and
 * its size in device px at its depth at pixel ratio 2 (holeDotPx). A holeLens case fills view and ok, a
 * strandJoin case view (the join, in the hole's frame).
 */
export interface HoleOut {
  view: Vec3;
  alpha: number;
  rgb: Vec3;
  sizeCss: number;
  ok: number;
  ember: number;
  px: number;
}

/** What the hole parity mode compares. The hole parity shader's HoleOut struct is generated from this list (glslHoleOutStruct). */
export const HOLE_PARITY_FIELDS: readonly ParityField<HoleOut>[] = [
  { name: 'view', size: 3 },
  { name: 'alpha', size: 1 },
  { name: 'rgb', size: 3 },
  { name: 'sizeCss', size: 1 },
  { name: 'ok', size: 1 },
  { name: 'ember', size: 1 },
  { name: 'px', size: 1 },
];

/** The GLSL HoleOut struct, from HOLE_PARITY_FIELDS. */
export function glslHoleOutStruct(): string {
  return glslOutStruct('HoleOut', 'HOLE_PARITY_FIELDS', HOLE_PARITY_FIELDS);
}
