// GLSL mirror of src/scene/node/shell.ts, step for step: the cracked shell's equation, the scatter's
// cuts, a mote's place (shellHome, shellWarpK), and the lattice's spin. shell.ts says what each term is, which
// hash it reads and what stays on the CPU (the lattice's (lat, lon), a mote's hashes, the shapes, the
// scatter count, and the event's sweep and aftershock with their salts, which reach the shader as
// attributes and uniforms). It has no main(), and it is
// not usable raw: take it from withShellLibrary() in shaderSource.ts (this folder), which splices in
// the generated shell constants (birth.ts) at the marker below and puts the mote library (hash01,
// moteSinCos, MOTE_TAU) and orbit.glsl (orbitTurns) before it. Like orbit.glsl and derp.glsl it never
// calls the builtin sin or cos, which are only good to about 2^-11: on a 0.02 R wave that alone would
// use up the parity tolerance. The parity page (src/parity, ?lib=shell) renders this library and
// compares it with the TS reference.

// #include SHELL constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// A body's scatter as the shader takes it (shell.ts ShellEvent): seconds into it (-1 if none), the
// sweep, the aftershock, and shape n and shape n + 1, each as two vec4 (shapeUniforms in shell.ts):
// A = (p, q, phi1, phi2), B = (p2, q2, phi3, phi4).
struct ShellEvent {
  float sec;
  vec3 sweep;
  bool aftershock;
  vec4 shapeA;
  vec4 shapeB;
  vec4 nextA;
  vec4 nextB;
};

// A lattice point (lat, lon) on the unit sphere: y up, longitude from +x toward +z.
vec3 shellUnit(vec2 ll) {
  vec2 lat = moteSinCos(ll.x);
  vec2 lon = moteSinCos(ll.y);
  return vec3(lat.y * lon.y, lat.x, lat.y * lon.x);
}

// The equation's wave at a lattice point, ambient t: r = 1 + A * this. The bracket is enveloped by
// the latitude's cosine, so the wave vanishes at the poles.
float shellMorphTerm(vec2 ll, float t, vec4 a, vec4 b) {
  float lat1 = ll.x + MOTE_TAU / 4.0;
  float envelope = moteSinCos(ll.x).y;
  return envelope * (moteSinCos(a.x * ll.y + a.z + EQ_W[0] * t).x * moteSinCos(a.y * lat1 + a.w + EQ_W[1] * t).x +
                     EQ_SECOND * moteSinCos(b.x * ll.y + b.z - EQ_W[2] * t).x * moteSinCos(b.y * lat1 + b.w).x);
}

// The shell's radius at a lattice point of the shape (a, b).
float morphR(vec2 ll, float t, vec4 a, vec4 b, float A) {
  return 1.0 + A * shellMorphTerm(ll, t, a, b);
}

// When a mote of sweep coordinate su leaves, and how long it stays out.
float shellDeparture(float su) {
  return SCATTER_SWEEP * (su + 1.0);
}
float shellHold(float h4) {
  return SCATTER_HOLD[0] + SCATTER_HOLD[1] * h4;
}

// How far out a mote is sec seconds into a scatter: 0, then 1 for its hold, then the return's cuts.
float scatterK(float sec, float su, float h4) {
  float a = sec - shellDeparture(su);
  if (!(a >= 0.0)) return 0.0;
  float back = a - shellHold(h4);
  if (back < 0.0) return 1.0;
  int cut = int(floor(back / SCATTER_STEP));
  return cut < SCATTER_RETURN.length() ? SCATTER_RETURN[cut] : 0.0;
}

// When a mote is home again: the last cut, onto the next shape.
float shellLanding(float su, float h4) {
  return shellDeparture(su) + shellHold(h4) + float(SCATTER_RETURN.length() - 1) * SCATTER_STEP;
}

// How far out a mote is in the event: the scatter's k, plus the aftershock's hold.
float shellKAt(float su, float h4, ShellEvent ev) {
  if (!(ev.sec >= 0.0)) return 0.0;
  float k = scatterK(ev.sec, su, h4);
  if (!ev.aftershock) return k;
  float a = ev.sec - AFTERSHOCK_AT - shellDeparture(su);
  return k + (a >= 0.0 && a < shellHold(h4) ? AFTERSHOCK_AMP : 0.0);
}

// A shell mote's place on the shell in units of R, in the lattice's frame (shell.ts shellHome): at the
// equation's radius of the shape it is on, and after landing the settle ring; h4 its fifth hash.
vec3 shellHome(vec2 ll, float h4, float t, ShellEvent ev, float A, float gain) {
  vec3 u = shellUnit(ll);
  float land = shellLanding(dot(u, ev.sweep), h4);
  bool landed = ev.sec >= 0.0 && ev.sec >= land;
  float r = 1.0 + A * (landed ? shellMorphTerm(ll, t, ev.nextA, ev.nextB) : shellMorphTerm(ll, t, ev.shapeA, ev.shapeB));
  if (landed) {
    float a = ev.sec - land;
    r += gain * RING_AMP * exp(-a / RING_TAU) * moteSinCos(MOTE_TAU * RING_HZ * a).y;
  }
  return u * r;
}

// A shell mote's place in units of R, in the lattice's frame, and (w) how far out it is: its place on
// the shell (shellHome), plus k along its own leap.
// hA = (h0, h1, h2, h3), hB = (h4, h5, h6, h7): the mote's hashes as shell.ts numbers them.
vec4 shellWarpK(vec2 ll, vec4 hA, vec4 hB, float t, ShellEvent ev, float A, float gain, float cap) {
  vec3 u = shellUnit(ll);
  float su = dot(u, ev.sweep);
  vec3 p = shellHome(ll, hB.x, t, ev, A, gain);
  float k = shellKAt(su, hB.x, ev);
  if (!(k > 0.0)) return vec4(p, 0.0);
  float w = (hB.z < SCATTER_INWARD[0] ? SCATTER_INWARD[1] : 1.0) * (SCATTER_NORMAL[0] + SCATTER_NORMAL[1] * hA.x);
  vec3 d = u * w + SCATTER_FUZZ * (hA.yzw - 0.5);
  float amp = min(SCATTER_AMP[0] + SCATTER_AMP[1] * hB.y * hB.y, cap) / max(sqrt(dot(d, d)), 1e-6);
  // The jitter, held for one tick and cut to the next, from the mote's own seed (its h7's 24 bits).
  uint jseed = uint(round(hB.w * 16777216.0));
  uint tick = uint(floor(ev.sec * SCATTER_JITTER_HZ)) * SHELL_JITTER_STRIDE;
  vec3 jit = (2.0 * vec3(hash01(jseed, tick), hash01(jseed, tick + 1u), hash01(jseed, tick + 2u)) - 1.0) * SCATTER_JITTER_AXIS;
  return vec4(p + gain * k * (d * amp + jit), k);
}

vec3 shellWarp(vec2 ll, vec4 hA, vec4 hB, float t, ShellEvent ev, float A, float gain, float cap) {
  return shellWarpK(ll, hA, hB, t, ev, A, gain, cap).xyz;
}

// The axis the lattice turns about: tilted off the vertical by a hashed angle in SHELL_SPIN_TILT
// (degrees), at a hashed azimuth.
vec3 spinAxis(uint seed) {
  vec2 tilt = moteSinCos(radians(SHELL_SPIN_TILT[0] + (SHELL_SPIN_TILT[1] - SHELL_SPIN_TILT[0]) * hash01(seed, SHELL_SALT)));
  vec2 az = moteSinCos(MOTE_TAU * hash01(seed, SHELL_SALT + 1u));
  return vec3(tilt.x * az.y, tilt.y, tilt.x * az.x);
}

// p turned about the unit axis by the spin's angle at ambient t: one turn in SHELL_SPIN_PERIOD s.
vec3 spinShell(vec3 p, vec3 axis, float t) {
  vec2 sc = moteSinCos(MOTE_TAU * orbitTurns(t, SHELL_SPIN_PERIOD));
  return p * sc.y + cross(axis, p) * sc.x + axis * (dot(axis, p) * (1.0 - sc.y));
}
