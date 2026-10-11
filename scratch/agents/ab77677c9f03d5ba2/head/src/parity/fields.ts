// What the parity page compares: every MoteOut field, packed into RGBA32F passes. Kept free of
// WebGL so a unit test can check it covers MoteOut exactly (fields.test.ts). The GLSL MoteOut
// struct is generated from this list too (glslMoteOutStruct, spliced into mote.glsl), so adding a
// MoteOut field means adding it to the TS interface and here, and nowhere else.
import type { MoteOut } from '../scene/mote/mote';

export interface ParityField {
  /** The MoteOut field; the GLSL struct member has the same name. */
  name: keyof MoteOut;
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

const GLSL_TYPE_OF_SIZE = ['', 'float', 'vec2', 'vec3', 'vec4'];

/** The GLSL MoteOut struct: one member per parity field, a float or vecN by its size. */
export function glslMoteOutStruct(fields: readonly ParityField[] = PARITY_FIELDS): string {
  const members = fields.map((f) => {
    const type = GLSL_TYPE_OF_SIZE[f.size];
    if (type === undefined || type === '') throw new Error(`MoteOut field ${f.name} has ${f.size} components`);
    return `  ${type} ${f.name};`;
  });
  return ['// Generated from PARITY_FIELDS in src/parity/fields.ts.', 'struct MoteOut {', ...members, '};'].join('\n');
}

/** A field placed in a pass, starting at component `offset` of the output texel. */
export interface PlacedField {
  field: ParityField;
  offset: number;
}

/** Pack the fields in order into passes of at most four components; a field is never split. */
export function parityPasses(fields: readonly ParityField[] = PARITY_FIELDS): PlacedField[][] {
  const passes: PlacedField[][] = [];
  let pass: PlacedField[] = [];
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
export function glslPassOutput(pass: readonly PlacedField[], out: string): string {
  const parts = pass.map((p) => `${out}.${p.field.name}`);
  const used = pass.reduce((n, p) => n + p.field.size, 0);
  for (let i = used; i < 4; i++) parts.push('0.0');
  return `vec4(${parts.join(', ')})`;
}

/** The TS reference value of one field as floats, in the GLSL component order. */
export function fieldValues(o: MoteOut, name: keyof MoteOut): number[] {
  const v = o[name];
  if (typeof v === 'boolean') return [v ? 1 : 0];
  if (typeof v === 'number') return [v];
  return [...v];
}
