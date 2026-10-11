// GLSL mirror of src/scene/node/leak.ts leakOffset, step for step: the defect's leak (re-skin Task 8b).
// leak.ts says what each term is, which hash it reads, and what stays on the CPU (the wounds, packed
// into the shell texture per body and frame: their centres and cones, their ages at the frame's
// ambient and their seeds). Its time is each wound's age, so it never reads the ambient itself and
// float32 keeps it to the precision of a few seconds. It has no main(), and it is not usable raw: take
// it from withLeakLibrary() or withShellLibrary() in shaderSource.ts (this folder), which splices in the
// generated leak constants (birth.ts) at the marker below and puts the mote library (pcg, hash01, the
// SALT constants, moteSinCos) before it. Like shell.glsl it never calls the builtin sin or cos. The
// parity page (src/parity, ?lib=leak) renders this library and compares it with the TS reference.

// #include LEAK constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// A body's wounds (leak.ts packLeak): each wound's centre (xyz, the lattice's frame) and its cone's
// cosine (w; LEAK_CLOSED for none, the open ones first), each one's age (s since it opened) and seed.
struct Leak {
  vec4 wound[4];
  vec4 age;
  vec4 seed;
};

// Where a dot is moved by the leak (units of R, the lattice's frame, before the spin) and its light.
struct LeakOut {
  vec3 off;
  float gain;
};

// No wound open: what a body with none holds.
Leak leakNone() {
  Leak l;
  for (int j = 0; j < 4; j++) l.wound[j] = vec4(0.0, 1.0, 0.0, LEAK_CLOSED);
  l.age = vec4(0.0);
  l.seed = vec4(0.0);
  return l;
}

// A unit direction from two draws in [0, 1): its height z = 2 h0 - 1, then its azimuth 2 pi h1.
vec3 leakDirOf(float h0, float h1) {
  float z = 2.0 * h0 - 1.0;
  vec2 az = moteSinCos(MOTE_TAU * h1);
  float rho = sqrt(max(0.0, 1.0 - z * z));
  return vec3(rho * az.y, z, rho * az.x);
}

// Where dot i at the unit lattice point u is moved by the wounds, and its light (leak.ts leakOffset):
// the first wound that holds it (in its cone, leaking, between setting out and coming home) wins.
LeakOut leakOffset(vec3 u, float i, Leak leak) {
  LeakOut o;
  o.off = vec3(0.0);
  o.gain = 1.0;
  for (int w = 0; w < 4; w++) {
    vec4 wd = leak.wound[w];
    float cw = dot(u, wd.xyz);
    if (cw < wd.w) continue;
    uint ds = pcg(uint(round(leak.seed[w])) ^ uint(round(i)));
    if (hash01(ds, SALT_LEAK_DOT) >= LEAK_FRAC) continue;
    float delay = LEAK_EDGE_DELAY * (1.0 - (cw - wd.w) / (1.0 - wd.w)) + LEAK_START_JITTER * hash01(ds + 1u, SALT_LEAK_DOT);
    float out_ = LEAK_OUT.x + LEAK_OUT.y * hash01(ds + 2u, SALT_LEAK_DOT);
    float linger = LEAK_LINGER.x + LEAK_LINGER.y * hash01(ds + 3u, SALT_LEAK_DOT);
    float s = leak.age[w] - delay;
    if (!(s >= 0.0) || s >= out_ + linger) continue;
    float k;
    if (s < out_) {
      float x = 1.0 - s / out_;
      k = 1.0 - x * x * x;
    } else {
      k = 1.0 + LEAK_CREEP * (s - out_) / linger;
    }
    vec3 aim = leakDirOf(hash01(ds, SALT_LEAK_AIM), hash01(ds + 1u, SALT_LEAK_AIM));
    vec3 dir = u + LEAK_BEND * aim;
    float hd = hash01(ds, SALT_LEAK_REACH);
    float dist = (LEAK_DIST.x + LEAK_DIST.y * hd * hd) * LEAK_REACH * LEAK_AMP / sqrt(dot(dir, dir));
    // The linger's shiver, on x and y alike, held for one tick and cut to the next.
    float jx = s >= out_ ? LEAK_SHIVER * (hash01(ds + uint(floor((s - out_) * LEAK_SHIVER_HZ)), SALT_LEAK_SHIVER) - 0.5) : 0.0;
    o.off = vec3(dir.x * dist * k + jx, dir.y * dist * k + jx, dir.z * dist * k);
    o.gain = 1.0 - LEAK_DIM * min(1.0, k);
    return o;
  }
  return o;
}
