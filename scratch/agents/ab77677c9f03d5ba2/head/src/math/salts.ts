// The single registry of hash01 salts for a mote seed. Every `hash01(seed, salt)` in the TS and the
// GLSL names its salt here; the GLSL constants are generated from this object (glslSaltConstants)
// and spliced into mote.glsl, so the two cannot drift. The values are frozen: changing one changes
// how every mote looks.
export const SALT = {
  settle: 1, // buildMoteAttrs: settle threshold
  type: 2, // buildMoteAttrs: specced / misallocated type
  extra: 3, // buildMoteAttrs: body mote that exists only when misallocated
  misVisible: 4, // buildMoteAttrs: core mote hidden when misallocated
  driftX: 5, // mote(): drift phase per axis
  driftY: 6,
  driftZ: 7,
  spawnZ: 8, // spawnPoint(): height on the shell
  spawnAzimuth: 9, // spawnPoint(): azimuth
  spawnRadius: 10, // spawnPoint(): shell radius
  scenario: 11, // mote(): which provenance scenario the mote follows
  bezierSide: 12, // mote(): sideways reach of the flight path
  twinPhase: 13, // instance.glsl: dialogue twin orbit phase
  shimmer: 14, // instance.glsl: idle shimmer phase
  hero: 15, // instance.glsl: hero form selection
} as const;

export type SaltName = keyof typeof SALT;

/** `misVisible` → `SALT_MIS_VISIBLE`. */
export function glslSaltName(name: SaltName): string {
  return `SALT_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;
}

/** `const uint SALT_X = Nu;` for every salt, in registry order. */
export function glslSaltConstants(): string {
  const lines = (Object.entries(SALT) as [SaltName, number][]).map(
    ([name, value]) => `const uint ${glslSaltName(name)} = ${value}u;`,
  );
  return ['// hash01 salts, generated from SALT in src/math/salts.ts.', ...lines].join('\n');
}
