// GLSL mirror of src/scene/node/orbit.ts, step for step: Kepler, the precession, the tilt, the host
// chain and the galaxy's rigid turn, anchored at N0. orbit.ts says the conventions and why the
// angles are reduced to one turn first. It has no main(), and it is not usable raw: take it from
// withOrbitLibrary() in shaderSource.ts (this folder), which splices in the generated orbit
// constants (birth.ts) at the marker below and puts the mote library before it, for moteSinCos:
// the builtin sin and cos are only good to about 2^-11 (SwiftShader is near that), which the
// galaxy's distances (a hundred units from N0 to the core) would carry past the parity tolerance.
// The TS reads Math.sin and Math.cos, which moteSinCos matches to about 1e-7. The parity page
// (src/parity, ?lib=orbit) renders this library and compares it with the TS reference.

// #include ORBIT constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// RGBA32F, NEAREST, eight texels a row, one row per body (bodyData.ts). Named for the texture, not
// `uBodies`: the reflow's per-part uniform array in mote.glsl, spliced in ahead of this, takes that.
uniform highp sampler2D uBodyTex;
// N0's row: the world's origin.
uniform int uN0Row;

const float ORBIT_TAU = 6.283185307179586;

vec4 bodyTexel(int t, int row) {
  return texelFetch(uBodyTex, ivec2(t, row), 0);
}

// How far into its period the clock t is, in turns: (t - k period) / period, k = floor(t / period),
// with k period taken as k head + k tail, the head the period's top ORBIT_HEAD_BITS significant bits
// (orbit.ts says why).
float orbitTurns(float t, float period) {
  float k = floor(t / period);
  float head = uintBitsToFloat(floatBitsToUint(period) & ORBIT_HEAD_MASK);
  return ((t - k * head) - k * (period - head)) / period;
}

// The eccentric anomaly E with E - e sin E = M: three Newton steps from E0 = M + e sin M.
float keplerE(float M, float e) {
  float E = M + e * moteSinCos(M).x;
  for (int i = 0; i < 3; i++) {
    vec2 sc = moteSinCos(E);
    E -= (E - e * sc.x - M) / (1.0 - e * sc.y);
  }
  return E;
}

// A body's place relative to what it goes round, from its orbit texels: t1 = (a, e, tilt, tiltAz),
// t2 = (omega0, precession, period, phase).
vec3 orbitLocal(vec4 t1, vec4 t2, float t) {
  float a = t1.x;
  float e = t1.y;
  float M = ORBIT_TAU * fract(t2.w + orbitTurns(t, t2.z));
  vec2 sE = moteSinCos(keplerE(M, e));
  float px = a * (sE.y - e);
  float py = a * sqrt(1.0 - e * e) * sE.x;
  vec2 sw = moteSinCos(t2.x + ORBIT_TAU * orbitTurns(t, t2.y));
  float x = px * sw.y - py * sw.x;
  float z = px * sw.x + py * sw.y;
  vec2 sa = moteSinCos(t1.w);
  float u = x * sa.y + z * sa.x;
  float v = -x * sa.x + z * sa.y;
  vec2 st = moteSinCos(t1.z);
  float h = v * st.y;
  return vec3(u * sa.y - h * sa.x, v * st.x, u * sa.x + h * sa.y);
}

// The galaxy's rigid turn at ambient t, in radians, reduced to one turn.
float galaxyTurn(float t) {
  return ORBIT_TAU * orbitTurns(t, GALAXY_TURN_PERIOD);
}

// A body's place in the galaxy's own frame: up its host chain, at most three hops, to a spot.
vec3 bodyGalactic(int row, float t) {
  vec3 p = vec3(0.0);
  int r = row;
  for (int i = 0; i < 3; i++) {
    float host = bodyTexel(3, r).x;
    if (host < 0.0) break;
    p += orbitLocal(bodyTexel(1, r), bodyTexel(2, r), t);
    r = int(round(host));
  }
  return p + bodyTexel(0, r).xyz;
}

// A body's place in the world: the galaxy turned about +y, anchored at N0.
vec3 bodyWorld(int row, float t) {
  vec3 d = bodyGalactic(row, t) - bodyGalactic(uN0Row, t);
  vec2 sc = moteSinCos(galaxyTurn(t));
  return vec3(d.x * sc.y + d.z * sc.x, d.y, -d.x * sc.x + d.z * sc.y);
}
