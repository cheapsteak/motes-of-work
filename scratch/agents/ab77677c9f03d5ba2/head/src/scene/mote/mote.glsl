// GLSL mirror of src/scene/mote/mote.ts, step for step. It has no main(), and it is not usable raw:
// take it from moteLibraryGlsl() / withMoteLibrary() in shaderSource.ts, which splice in the
// generated SALT constants and the MoteAttrs and MoteOut structs at the markers below.
// Constants must stay in sync with the TS: TAU = 6.283185307179586 (drift phase and spawn azimuth),
// NORMAL_EPS = 1e-4 (normal blend fallback).
// The parity page (src/parity) renders this library and compares it with the TS reference.

// #include SALT constants (generated from src/math/salts.ts by shaderSource.ts)

// #include MoteAttrs struct (generated from src/scene/mote/layout.ts by shaderSource.ts)

// #include MoteOut struct (generated from src/parity/fields.ts by shaderSource.ts)

// RGBA32F, NEAREST. Two texels per part: [qx,qy,qz,qw], [px,py,pz,0]. Width = 2*partCount, row = copy.
uniform highp sampler2D uParts;
uniform float uAssembly, uVariant, uDrive, uDrift, uVibed, uMisallocated;

const float MOTE_TAU = 6.283185307179586;
const float MOTE_NORMAL_EPS = 1e-4;

// PCG hash: uint32 in, uint32 out. uint arithmetic wraps mod 2^32, matching Math.imul + >>> 0.
uint pcg(uint v) {
  uint state = v * 747796405u + 2891336453u;
  uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}

// Deterministic hash of (seed, salt) in [0, 1): the top 24 bits of pcg, exact in float32 and never 1.
float hash01(uint seed, uint salt) {
  return float(pcg(seed ^ (salt * 0x9e3779b9u)) >> 8u) / 16777216.0;
}

// (sin x, cos x) to ~1e-7 absolute. Builtin sin/cos are not precise enough: the spec only asks for
// ~2^-11 absolute (SwiftShader is near that), and the spawn radius of up to 12 amplifies it past
// the 1e-3 parity tolerance. Cody-Waite reduction by pi/2, then Taylor polynomials on [-pi/4, pi/4].
vec2 moteSinCos(float x) {
  float q = round(x * 0.6366197723675814);
  // pi/2 split into three parts; the first has few mantissa bits, so q * part is exact.
  float r = ((x - q * 1.5703125) - q * 4.837512969970703e-4) - q * 7.549789954891882e-8;
  float r2 = r * r;
  float s = r + r * r2 * (-1.0 / 6.0 + r2 * (1.0 / 120.0 + r2 * (-1.0 / 5040.0 + r2 * (1.0 / 362880.0))));
  float c = 1.0 + r2 * (-0.5 + r2 * (1.0 / 24.0 + r2 * (-1.0 / 720.0 + r2 * (1.0 / 40320.0 + r2 * (-1.0 / 3628800.0)))));
  int quadrant = int(q) & 3;
  if (quadrant == 0) return vec2(s, c);
  if (quadrant == 1) return vec2(c, -s);
  if (quadrant == 2) return vec2(-s, -c);
  return vec2(-c, s);
}

// Rotate p by unit quaternion q = (x, y, z, w).
vec3 moteRotate(vec4 q, vec3 p) {
  vec3 t = 2.0 * cross(q.xyz, p);
  return p + q.w * t + cross(q.xyz, t);
}

vec3 moteSpawnPoint(uint seed) {
  float z = 2.0 * hash01(seed, SALT_SPAWN_Z) - 1.0;
  float a = MOTE_TAU * hash01(seed, SALT_SPAWN_AZIMUTH);
  float r = sqrt(1.0 - z * z);
  float radius = 9.0 + 3.0 * hash01(seed, SALT_SPAWN_RADIUS);
  vec2 sc = moteSinCos(a);
  return vec3(r * sc.y * radius, r * sc.x * radius * 0.6, z * radius);
}

MoteOut mote(MoteAttrs a, int copy) {
  // round(), not x + 0.5: above 2^23 the float32 ulp is 1, so an odd seed + 0.5 rounds up to seed + 1.
  uint seed = uint(round(a.seed));

  // 1. Scenario: 0 specced, 1 vibed, 2 misallocated.
  float u = hash01(seed, SALT_SCENARIO);
  float v = clamp(uVibed, 0.0, 1.0);
  float m = clamp(uMisallocated, 0.0, 1.0 - v);
  int k = u < v ? 1 : (u < v + m ? 2 : 0);

  // 2. Rest position in world space.
  vec3 lp = mix(a.local, a.localTwin, uVariant);
  int part = int(round(a.part));
  vec4 q = texelFetch(uParts, ivec2(2 * part, copy), 0);
  vec3 p = texelFetch(uParts, ivec2(2 * part + 1, copy), 0).xyz;
  vec3 rest0 = moteRotate(q, lp) + p;

  // 3. Drift (right-hand side uses the pre-drift rest).
  float w = uDrift * (int(round(a.role)) == 2 ? 1.0 : 0.25);
  float h5 = hash01(seed, SALT_DRIFT_X);
  float h6 = hash01(seed, SALT_DRIFT_Y);
  float h7 = hash01(seed, SALT_DRIFT_Z);
  vec3 rest = rest0 + w * 0.6 * vec3(
    moteSinCos(1.7 * rest0.y + 1.3 * uDrive + MOTE_TAU * h5).x,
    moteSinCos(1.9 * rest0.z + 1.1 * uDrive + MOTE_TAU * h6).x,
    moteSinCos(2.3 * rest0.x + 0.9 * uDrive + MOTE_TAU * h7).x
  );

  // 4. Settle progress.
  float t = smoothstep(a.settle - 0.08, a.settle, uAssembly);
  float e = 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);

  // 5. Spawn point.
  vec3 spawn = moteSpawnPoint(seed);

  // 6. Quadratic Bezier from spawn to rest through a sideways control point.
  vec3 side = cross(rest - spawn, vec3(0.0, 1.0, 0.0));
  if (length(side) < 1e-6) side = vec3(1.0, 0.0, 0.0);
  float sc = 2.0 * (hash01(seed, SALT_BEZIER_SIDE) - 0.5);
  vec3 c = (spawn + rest) / 2.0 + sc * side / length(side);
  float om = 1.0 - e;
  vec3 pos = om * om * spawn + 2.0 * om * e * c + e * e * rest;

  // 7. Surface normal: blend the variants; where the blend passes through zero (normals pointing
  // opposite ways) fall back to the correct normal, then pose it with the part rotation.
  vec3 nm = mix(a.normal, a.normalTwin, uVariant);
  vec3 n0 = length(nm) < MOTE_NORMAL_EPS ? a.normal : nm;

  // 8. Outputs.
  MoteOut o;
  o.pos = pos;
  o.type = a.type[k];
  o.brightness = mix(1.0, 0.35, t);
  o.visible = a.visible[k];
  o.settled = t;
  o.normal = normalize(moteRotate(q, n0));
  return o;
}
