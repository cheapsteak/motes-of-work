// Assembles the mote GLSL from its sources and the code generated from TS (SALT constants, the
// attribute layout, the MoteOut fields, the lighting uniforms). Splicing happens once, at module
// load, and throws if a marker is missing.
import { glslSaltConstants } from '../../math/salts';
import { glslMoteOutStruct } from '../../parity/fields';
import { glslLightingUniforms } from '../lighting';
import { glslAttributeDecls, glslInstanceAttrs, glslMoteAttrsStruct } from './layout';
import moteGlsl from './mote.glsl?raw';
import instanceGlsl from './shaders/instance.glsl?raw';

/** Replace the one line holding `marker` with `text`; throw unless the marker occurs exactly once. */
export function splice(source: string, marker: string, text: string, what = 'shader'): string {
  const parts = source.split(marker);
  if (parts.length !== 2) {
    throw new Error(`${what}: expected the marker "${marker}" exactly once, found ${parts.length - 1}`);
  }
  return parts.join(text);
}

const SALTS_MARKER = '// #include SALT constants (generated from src/math/salts.ts by shaderSource.ts)';
const STRUCT_MARKER = '// #include MoteAttrs struct (generated from src/scene/mote/layout.ts by shaderSource.ts)';
const OUT_MARKER = '// #include MoteOut struct (generated from src/parity/fields.ts by shaderSource.ts)';
const LIGHTING_MARKER = '// #include lighting uniforms (generated from src/scene/lighting.ts by shaderSource.ts)';
const DECLS_MARKER = '// #include attribute declarations (generated from src/scene/mote/layout.ts by shaderSource.ts)';
const UNPACK_MARKER = '// #include instanceAttrs() (generated from src/scene/mote/layout.ts by shaderSource.ts)';
/** The line each mote vertex shader (and the parity vertex shader) carries where the library goes. */
export const VERTEX_INCLUDE_MARKER = '// #include mote.glsl + instance.glsl (spliced in by shaderSource.ts)';

/** Splice each [marker, text] into `source` in turn. */
function spliceAll(source: string, what: string, pairs: [marker: string, text: string][]): string {
  return pairs.reduce((src, [marker, text]) => splice(src, marker, text, what), source);
}

const MOTE_LIBRARY = spliceAll(moteGlsl, 'mote.glsl', [
  [SALTS_MARKER, glslSaltConstants()],
  [STRUCT_MARKER, glslMoteAttrsStruct()],
  [OUT_MARKER, glslMoteOutStruct()],
]);

const INSTANCE_CHUNK = spliceAll(instanceGlsl, 'instance.glsl', [
  [DECLS_MARKER, glslAttributeDecls()],
  [LIGHTING_MARKER, glslLightingUniforms()],
  [UNPACK_MARKER, glslInstanceAttrs()],
]);

/** mote.glsl with its generated parts: the mote() library alone (pcg, hash01, mote(), ...). */
export function moteLibraryGlsl(): string {
  return MOTE_LIBRARY;
}

/** Splice the mote() library and the instance chunk into a vertex shader at its marker line. */
export function withMoteLibrary(vertex: string): string {
  return splice(vertex, VERTEX_INCLUDE_MARKER, `${MOTE_LIBRARY}\n${INSTANCE_CHUNK}`, 'vertex shader');
}
