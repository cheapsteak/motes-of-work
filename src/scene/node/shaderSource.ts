// Assembles the galaxy's vertex shaders and the parity pages' from their libraries: the mote library
// first (hash01, the SALT constants, MoteOut: shared by splicing, as the mote shaders share it), then
// light.glsl (the landing, the spread, the light and the palette, with its generated constants), then
// the galaxy's own, then the mote system's instance chunk (toView, moteLight, pxPerUnit, the lighting
// uniforms) over no attributes (the galaxy's shaders declare their own). Splicing happens once, at
// module load, and throws if a marker is missing. orbit.glsl (the galaxy's orbits and its turn) needs
// only its generated constants and the mote library before it (moteSinCos).
// derp.glsl (the derps) needs its generated constants and Derp struct, with the mote library and
// orbit.glsl before it (hash01, moteSinCos, orbitTurns). shell.glsl (the shells) needs only its
// generated constants, with the same two before it; a shader that also takes derp.glsl appends
// shellLibraryGlsl() to withDerpLibrary()'s splice. leak.glsl (the defect's leak, which shell.glsl's
// warp reads) needs its generated constants and the mote library, and goes before shell.glsl. lod.glsl (the level of detail) needs only its
// generated constants. freeze.glsl (the freeze frame's dressing) needs its generated constants, with
// the mote library (hash01) and light.glsl (the palette) before it. The galaxy's own draws
// (bodySystem.ts) put their libraries together once: the mote library, orbit.glsl, shell.glsl,
// star.glsl, lod.glsl, light.glsl and freeze.glsl, then the instance chunk (withGalaxyLibrary).
// star.glsl (a star's dots and spikes) needs its generated constants (classLook.ts), with the mote
// library and orbit.glsl (orbitTurns) before it. hole.glsl (the black hole: its lens, disk, ring, jets,
// knots, in-fall and strands) needs its generated constants (holeLook.ts), with the mote library
// (pcg, hash01, the SALT constants, moteSinCos) and orbit.glsl (orbitTurns) before it.
import { glslBodyMoteOutStruct, glslDerpStruct } from '../../parity/fields';
import { instanceChunk, moteLibraryGlsl, splice, spliceAll } from '../mote/shaderSource';
import { glslBodyMoteConstants, glslDerpConstants, glslFreezeConstants, glslLeakConstants, glslLightConstants, glslOrbitConstants, glslShellConstants } from './birth';
import { glslGalaxyConstants } from './bodyAttrs';
import { DROPOUT } from './birth';
import { glslClassLookConstants } from './classLook';
import { glslHoleConstants } from '../hole/holeLook';
import holeGlsl from '../hole/hole.glsl?raw';
import { BODY_KIND } from './bodyData';
import { glslLodConstants } from './lod';
import { glslStreamConstants } from './stream';
import bodyMoteGlsl from './bodyMote.glsl?raw';
import bodyScreenGlsl from './bodyScreen.glsl?raw';
import derpGlsl from './derp.glsl?raw';
import freezeGlsl from './freeze.glsl?raw';
import leakGlsl from './leak.glsl?raw';
import lightGlsl from './light.glsl?raw';
import lodGlsl from './lod.glsl?raw';
import orbitGlsl from './orbit.glsl?raw';
import shellGlsl from './shell.glsl?raw';
import starGlsl from './star.glsl?raw';

const LIGHT_CONSTANTS_MARKER = '// #include LIGHT constants (generated from src/scene/node/birth.ts by shaderSource.ts)';

const LIGHT_LIBRARY = spliceAll(lightGlsl, 'light.glsl', [[LIGHT_CONSTANTS_MARKER, glslLightConstants()]]);

/** light.glsl with its generated constants and the palette: the landing, the spread and the light, without the mote library it reads. */
export function lightLibraryGlsl(): string {
  return LIGHT_LIBRARY;
}

const ORBIT_CONSTANTS_MARKER = '// #include ORBIT constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
/** The line a vertex shader (the orbit parity shader) carries where orbit.glsl goes. */
export const ORBIT_INCLUDE_MARKER = '// #include orbit.glsl (spliced in by src/scene/node/shaderSource.ts)';

const ORBIT_LIBRARY = spliceAll(orbitGlsl, 'orbit.glsl', [[ORBIT_CONSTANTS_MARKER, glslOrbitConstants()]]);

/** orbit.glsl with its generated constants: bodyWorld() and the orbits under it, without the mote library it reads. */
export function orbitLibraryGlsl(): string {
  return ORBIT_LIBRARY;
}

const WITH_ORBIT = `${moteLibraryGlsl()}\n${ORBIT_LIBRARY}`;

/** Splice the mote library (for moteSinCos) and orbit.glsl into a vertex shader at its marker. */
export function withOrbitLibrary(vertex: string): string {
  return splice(vertex, ORBIT_INCLUDE_MARKER, WITH_ORBIT, 'orbit vertex shader');
}

const DERP_CONSTANTS_MARKER = '// #include DERP constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
const DERP_STRUCT_MARKER = '// #include Derp struct (generated from src/parity/fields.ts by shaderSource.ts)';
/** The line a vertex shader (the derp parity shader) carries where the mote library, orbit.glsl and derp.glsl go. */
export const DERP_INCLUDE_MARKER = '// #include mote.glsl + orbit.glsl + derp.glsl (spliced in by src/scene/node/shaderSource.ts)';

/** The two body kinds derp.glsl tells apart (a star and a core body shiver), from bodyData.ts. */
const DERP_BODY_KINDS = [
  `const int DERP_BODY_CORE = ${BODY_KIND.core}; // bodyData.ts BODY_KIND`,
  `const int DERP_BODY_STAR = ${BODY_KIND.star};`,
].join('\n');

const DERP_LIBRARY = spliceAll(derpGlsl, 'derp.glsl', [
  [DERP_CONSTANTS_MARKER, `${glslDerpConstants()}\n${DERP_BODY_KINDS}`],
  [DERP_STRUCT_MARKER, glslDerpStruct()],
]);

/** derp.glsl with its generated parts: derp() alone, without the mote library and orbit.glsl it reads. */
export function derpLibraryGlsl(): string {
  return DERP_LIBRARY;
}

const WITH_DERP = `${WITH_ORBIT}\n${DERP_LIBRARY}`;

/** Splice the mote library, orbit.glsl (for orbitTurns) and derp.glsl into a vertex shader at its marker. */
export function withDerpLibrary(vertex: string): string {
  return splice(vertex, DERP_INCLUDE_MARKER, WITH_DERP, 'derp vertex shader');
}

const LEAK_CONSTANTS_MARKER = '// #include LEAK constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
/** The line a vertex shader (the leak parity shader) carries where the mote library and leak.glsl go. */
export const LEAK_INCLUDE_MARKER = '// #include mote.glsl + leak.glsl (spliced in by src/scene/node/shaderSource.ts)';

const LEAK_LIBRARY = spliceAll(leakGlsl, 'leak.glsl', [[LEAK_CONSTANTS_MARKER, glslLeakConstants()]]);

/** leak.glsl with its generated constants: leakOffset() alone, without the mote library it reads. */
export function leakLibraryGlsl(): string {
  return LEAK_LIBRARY;
}

/** Splice the mote library (pcg, hash01, the SALT constants, moteSinCos) and leak.glsl into a vertex shader at its marker (the leak parity shader). */
export function withLeakLibrary(vertex: string): string {
  return splice(vertex, LEAK_INCLUDE_MARKER, `${moteLibraryGlsl()}\n${LEAK_LIBRARY}`, 'leak vertex shader');
}

const SHELL_CONSTANTS_MARKER = '// #include SHELL constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
/** The line a vertex shader (the shell parity shader) carries where the mote library, orbit.glsl and shell.glsl go. */
export const SHELL_INCLUDE_MARKER = '// #include mote.glsl + orbit.glsl + shell.glsl (spliced in by src/scene/node/shaderSource.ts)';

const SHELL_LIBRARY = spliceAll(shellGlsl, 'shell.glsl', [[SHELL_CONSTANTS_MARKER, glslShellConstants()]]);

/** shell.glsl with its generated constants: shellWarpK() and the spin alone, without the mote library and orbit.glsl it reads. */
export function shellLibraryGlsl(): string {
  return SHELL_LIBRARY;
}

const WITH_SHELL = `${WITH_ORBIT}\n${LEAK_LIBRARY}\n${SHELL_LIBRARY}`;

/** Splice the mote library, orbit.glsl (for orbitTurns), leak.glsl (the leak the shell's warp reads) and shell.glsl into a vertex shader at its marker. */
export function withShellLibrary(vertex: string): string {
  return splice(vertex, SHELL_INCLUDE_MARKER, WITH_SHELL, 'shell vertex shader');
}

const STAR_CONSTANTS_MARKER = '// #include STAR constants (generated from src/scene/node/classLook.ts by shaderSource.ts)';
/** The line a vertex shader (the star parity shader) carries where the mote library, orbit.glsl and star.glsl go. */
export const STAR_INCLUDE_MARKER = '// #include mote.glsl + orbit.glsl + star.glsl (spliced in by src/scene/node/shaderSource.ts)';

const STAR_LIBRARY = spliceAll(starGlsl, 'star.glsl', [[STAR_CONSTANTS_MARKER, glslClassLookConstants()]]);

/** star.glsl with the stars' generated constants: a star's dots, spikes, breath and tint, without the mote library and orbit.glsl it reads. */
export function starLibraryGlsl(): string {
  return STAR_LIBRARY;
}

/** Splice the mote library (hash01, moteSinCos), orbit.glsl (orbitTurns) and star.glsl into a vertex shader at its marker (the star parity shader). */
export function withStarLibrary(vertex: string): string {
  return splice(vertex, STAR_INCLUDE_MARKER, `${WITH_ORBIT}\n${STAR_LIBRARY}`, 'star vertex shader');
}

const HOLE_CONSTANTS_MARKER = '// #include HOLE constants (generated from src/scene/hole/holeLook.ts by shaderSource.ts)';
/** The line a vertex shader (the hole's, and its parity shader) carries where the mote library, orbit.glsl and hole.glsl go. */
export const HOLE_INCLUDE_MARKER = '// #include mote.glsl + orbit.glsl + hole.glsl (spliced in by src/scene/node/shaderSource.ts)';

const HOLE_LIBRARY = spliceAll(holeGlsl, 'hole.glsl', [[HOLE_CONSTANTS_MARKER, glslHoleConstants()]]);

/** hole.glsl with the hole's generated constants: the lens and every part's dots, without the mote library and orbit.glsl it reads. */
export function holeLibraryGlsl(): string {
  return HOLE_LIBRARY;
}

/** Splice the mote library (pcg, hash01, moteSinCos), orbit.glsl (orbitTurns) and hole.glsl into a vertex shader at its marker (the hole's shader, the hole parity shader). */
export function withHoleLibrary(vertex: string): string {
  return splice(vertex, HOLE_INCLUDE_MARKER, `${WITH_ORBIT}\n${HOLE_LIBRARY}`, 'hole vertex shader');
}

const LOD_CONSTANTS_MARKER = '// #include LOD constants (generated from src/scene/node/lod.ts by shaderSource.ts)';
/** The line a vertex shader (the lod parity shader) carries where lod.glsl goes. */
export const LOD_INCLUDE_MARKER = '// #include lod.glsl (spliced in by src/scene/node/shaderSource.ts)';

const LOD_LIBRARY = spliceAll(lodGlsl, 'lod.glsl', [[LOD_CONSTANTS_MARKER, glslLodConstants()]]);

/** lod.glsl with its generated constants: lodGain() and glowPx(), which need nothing before them. */
export function lodLibraryGlsl(): string {
  return LOD_LIBRARY;
}

/** Splice lod.glsl into a vertex shader at its marker (the lod parity shader). */
export function withLodLibrary(vertex: string): string {
  return splice(vertex, LOD_INCLUDE_MARKER, LOD_LIBRARY, 'lod vertex shader');
}

const FREEZE_CONSTANTS_MARKER = '// #include FREEZE constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
/** The line a vertex shader (the freeze parity shader) carries where the mote library, light.glsl and freeze.glsl go. */
export const FREEZE_INCLUDE_MARKER = '// #include mote.glsl + light.glsl + freeze.glsl (spliced in by src/scene/node/shaderSource.ts)';

const FREEZE_LIBRARY = spliceAll(freezeGlsl, 'freeze.glsl', [[FREEZE_CONSTANTS_MARKER, glslFreezeConstants()]]);

/** freeze.glsl with its generated constants: the copies, the limb and the bursts, without the mote library (hash01) and light.glsl (the palette) it reads. */
export function freezeLibraryGlsl(): string {
  return FREEZE_LIBRARY;
}

/** Splice the mote library, light.glsl (the palette) and freeze.glsl into a vertex shader at its marker (the freeze parity shader). */
export function withFreezeLibrary(vertex: string): string {
  return splice(vertex, FREEZE_INCLUDE_MARKER, `${moteLibraryGlsl()}\n${LIGHT_LIBRARY}\n${FREEZE_LIBRARY}`, 'freeze vertex shader');
}

/** The line each of the galaxy's vertex shaders (bodySystem.ts, galaxySystem.ts) carries where its libraries go. */
export const GALAXY_INCLUDE_MARKER =
  '// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)';

const BODY_MOTE_CONSTANTS_MARKER = '// #include BODY MOTE constants (generated from src/scene/node/birth.ts by shaderSource.ts)';
const BODY_MOTE_OUT_MARKER = '// #include BodyMoteOut struct (generated from src/parity/fields.ts by shaderSource.ts)';

const BODY_MOTE_LIBRARY = spliceAll(bodyMoteGlsl, 'bodyMote.glsl', [
  [BODY_MOTE_CONSTANTS_MARKER, glslBodyMoteConstants()],
  [BODY_MOTE_OUT_MARKER, glslBodyMoteOutStruct()],
]);

/** bodyMote.glsl with its generated parts: bodyMote() and what the galaxy's draws share, without the libraries before it. */
export function bodyMoteLibraryGlsl(): string {
  return BODY_MOTE_LIBRARY;
}

const WITH_GALAXY = [
  moteLibraryGlsl(),
  ORBIT_LIBRARY,
  DERP_LIBRARY,
  LEAK_LIBRARY,
  SHELL_LIBRARY,
  STAR_LIBRARY,
  LOD_LIBRARY,
  LIGHT_LIBRARY,
  FREEZE_LIBRARY,
  glslGalaxyConstants(),
  glslStreamConstants(),
  BODY_MOTE_LIBRARY,
  instanceChunk("// No per-instance mote attributes here: the galaxy's shaders declare their own inputs.", ''),
  bodyScreenGlsl,
].join('\n');

/**
 * Splice the mote library (hash01, moteSinCos), orbit.glsl (bodyWorld, orbitLocal), derp.glsl (the
 * derps), shell.glsl (the lattice, the equation, the spin, the scatter), star.glsl (a star's dots,
 * spikes, breath and tint), lod.glsl, light.glsl (the
 * landing, the spread, the light, the palette), freeze.glsl (the freeze frame's dressing), the galaxy's
 * and the streams' constants, bodyMote.glsl
 * (the motes in motion, the lamp, the defect on moving bodies), the instance chunk (toView,
 * moteLight, pxPerUnit, the lighting uniforms) and bodyScreen.glsl (a body's size on screen) into one
 * of the galaxy's vertex shaders at its marker, each library once.
 */
export function withGalaxyLibrary(vertex: string): string {
  return splice(vertex, GALAXY_INCLUDE_MARKER, WITH_GALAXY, 'galaxy vertex shader');
}

/** The line body.frag.glsl carries where the dropout's constants go. */
const DROPOUT_FRAGMENT_MARKER = '// #include DROPOUT constants (generated from src/scene/node/bodyAttrs.ts by shaderSource.ts)';

/** body.frag.glsl (or any fragment shader carrying the marker) with the dropout's constants: its most lines (re-skin Task 8b). */
export function withDropoutConstants(fragment: string): string {
  return splice(fragment, DROPOUT_FRAGMENT_MARKER, `const int DROPOUT_MAX = ${DROPOUT.maxLines}; // birth.ts DROPOUT.maxLines`, 'body fragment shader');
}
