// The per-instance mote attribute layout, declared once. Everything that reads or writes a mote's
// instanced attributes derives from INSTANCE_ATTRIBUTES:
//   - instancedAttributes() packs MoteAttrs into the InstancedBufferAttributes (moteSystem, parity)
//   - glslAttributeDecls() declares them in the vertex shaders (spliced into instance.glsl)
//   - glslMoteAttrsStruct() is the GLSL MoteAttrs struct (spliced into mote.glsl)
//   - glslInstanceAttrs() unpacks them into a MoteAttrs (spliced into instance.glsl)
// Adding a field to MoteAttrs means adding one LayoutField here; layout.test.ts fails until you do.
import { InstancedBufferAttribute } from 'three';
import type { Vec3 } from '../../math/vec';
import type { MoteAttrs } from './attributes';

export interface LayoutField {
  field: keyof MoteAttrs;
  /** Type of the member in the GLSL MoteAttrs struct. */
  glslType: 'float' | 'vec3';
  comment: string;
  /** Attribute components this field occupies. */
  components: number;
  pack(a: MoteAttrs): number[];
  /** GLSL expression for the struct member, given the attribute components it occupies (e.g. `aMeta1.w`). */
  unpack(src: string): string;
}

export interface AttributeSpec {
  name: string;
  itemSize: number;
  fields: readonly LayoutField[];
  pack(a: MoteAttrs): number[];
}

const same = (src: string): string => src;

/** The MoteAttrs keys whose value type is assignable to `T`. */
type FieldsOf<T> = { [K in keyof MoteAttrs]: MoteAttrs[K] extends T ? K : never }[keyof MoteAttrs];

/** One number-valued field: a single attribute component, a float in the struct. */
function scalar(field: FieldsOf<number>, comment: string): LayoutField {
  return { field, glslType: 'float', comment, components: 1, pack: (a) => [a[field]], unpack: same };
}

/** Three numbers: three attribute components, a vec3 in the struct. */
function vec3Field(field: FieldsOf<Vec3>, comment: string): LayoutField {
  return { field, glslType: 'vec3', comment, components: 3, pack: (a) => [...a[field]], unpack: same };
}

/** Name of the GLSL helper that decodes the visibility bits (emitted by glslInstanceAttrs). */
const UNPACK_BITS3 = 'moteUnpackBits3';

const visibleBits: LayoutField = {
  field: 'visible',
  glslType: 'vec3',
  comment: '0/1 per scenario',
  components: 1,
  // Bits 1 specced, 2 vibed, 4 misallocated: one float component for three flags.
  pack: (a) => [(a.visible[0] ? 1 : 0) | (a.visible[1] ? 2 : 0) | (a.visible[2] ? 4 : 0)],
  unpack: (src) => `${UNPACK_BITS3}(${src})`,
};

function attribute(name: string, fields: LayoutField[]): AttributeSpec {
  const itemSize = fields.reduce((n, f) => n + f.components, 0);
  if (itemSize > 4) throw new Error(`attribute ${name}: ${itemSize} components exceed a vec4`);
  return { name, itemSize, fields, pack: (a) => fields.flatMap((f) => f.pack(a)) };
}

export const INSTANCE_ATTRIBUTES: readonly AttributeSpec[] = [
  attribute('aLocal', [vec3Field('local', 'rest point in the part frame, correct variant')]),
  attribute('aTwin', [vec3Field('localTwin', 'rest point in the part frame, wrong twin')]),
  attribute('aMeta0', [
    scalar('part', 'index into the part texture'),
    scalar('seed', 'integer in [0, 2^24), exact in float32'),
    scalar('settle', 'assembly at which the mote has landed'),
    scalar('role', '0 core, 1 body, 2 drift'),
  ]),
  attribute('aMeta1', [vec3Field('type', 'MoteType per scenario: [specced, vibed, misallocated]'), visibleBits]),
  attribute('aNormal', [vec3Field('normal', 'unit surface normal in the part frame, correct variant')]),
  attribute('aNormalTwin', [vec3Field('normalTwin', 'unit surface normal in the part frame, wrong twin')]),
];

/** One InstancedBufferAttribute per spec, keyed by attribute name, holding pack() of every mote. */
export function instancedAttributes(attrs: readonly MoteAttrs[]): Record<string, InstancedBufferAttribute> {
  const out: Record<string, InstancedBufferAttribute> = {};
  for (const spec of INSTANCE_ATTRIBUTES) {
    const data = new Float32Array(attrs.length * spec.itemSize);
    attrs.forEach((a, i) => data.set(spec.pack(a), i * spec.itemSize));
    out[spec.name] = new InstancedBufferAttribute(data, spec.itemSize);
  }
  return out;
}

const glslVec = (n: number): string => (n === 1 ? 'float' : `vec${n}`);
const fieldNames = (spec: AttributeSpec): string => spec.fields.map((f) => f.field).join(', ');

export function glslAttributeDecls(): string {
  const lines = INSTANCE_ATTRIBUTES.map((s) => `in ${glslVec(s.itemSize)} ${s.name}; // ${fieldNames(s)}`);
  return ['// Per-instance attributes, generated from src/scene/mote/layout.ts.', ...lines].join('\n');
}

export function glslMoteAttrsStruct(): string {
  const members = INSTANCE_ATTRIBUTES.flatMap((s) => s.fields).map(
    (f) => `  ${f.glslType} ${f.field}; // ${f.comment}`,
  );
  return ['// Generated from src/scene/mote/layout.ts.', 'struct MoteAttrs {', ...members, '};'].join('\n');
}

export function glslInstanceAttrs(): string {
  const assigns: string[] = [];
  for (const spec of INSTANCE_ATTRIBUTES) {
    let offset = 0;
    for (const f of spec.fields) {
      const src = `${spec.name}.${'xyzw'.slice(offset, offset + f.components)}`;
      assigns.push(`  a.${f.field} = ${f.unpack(src)};`);
      offset += f.components;
    }
  }
  return [
    '// Generated from src/scene/mote/layout.ts.',
    '// Three 0/1 flags from bits 1, 2, 4 of a float component.',
    `vec3 ${UNPACK_BITS3}(float x) {`,
    '  int bits = int(round(x));',
    '  return vec3(float(bits & 1), float((bits >> 1) & 1), float((bits >> 2) & 1));',
    '}',
    '',
    'MoteAttrs instanceAttrs() {',
    '  MoteAttrs a;',
    ...assigns,
    '  return a;',
    '}',
  ].join('\n');
}
