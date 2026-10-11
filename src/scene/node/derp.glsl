// GLSL mirror of src/scene/node/derp.ts, step for step: the derp schedule, the six kinds and the
// burst. derp.ts says what each term is, which hash it reads and why the slot's time is taken from
// a remainder. It has no main(), and it is not usable raw: take it from withDerpLibrary() in
// shaderSource.ts (this folder), which splices in the generated derp constants (birth.ts) and the
// Derp struct (src/parity/fields.ts) at the markers below, and puts the mote library (hash01,
// moteSinCos, MOTE_TAU) and orbit.glsl (orbitTurns) before it. Like orbit.glsl it never calls the
// builtin sin or cos, which are only good to about 2^-11: a planet's track radius of ten units
// would carry that past the parity tolerance. The parity page (src/parity, ?lib=derp) renders this
// library and compares it with the TS reference.

// #include DERP constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// #include Derp struct (generated from src/parity/fields.ts by shaderSource.ts)

// The schedule at an ambient time: which slot, when its event starts, how far into it, its kind.
struct DerpEvent {
  bool on; // derp.ts names it `active`, which GLSL reserves
  float k;
  float t0;
  float s;
  int kind;
};

// What a body that is not derping gets: nothing moved, no scatter.
Derp derpZero() {
  Derp d;
  d.dNu = 0.0;
  d.dR = 0.0;
  d.lift = 0.0;
  d.wobble = vec3(0.0);
  d.orbitT = 0.0;
  d.ghost = 0.0;
  d.ghostNu = 0.0;
  d.scatterS = -1.0;
  return d;
}

// The hash's kind by the cumulative weights.
int derpKindOf(float h) {
  for (int i = 0; i < DERP_KIND_WOBBLE; i++) {
    if (h < DERP_CUMULATIVE[i]) return i;
  }
  return DERP_KIND_WOBBLE;
}

// force: every slot's kind a scatter, nothing else changed (derp.ts derpEvent's forceScatter).
DerpEvent derpEvent(float seed, float phase, float t, bool force) {
  // t = k0 T + r0, r0 in [0, T); then the phase carries the slot on by at most one.
  float r0 = orbitTurns(t, NODE_DERP_PERIOD) * NODE_DERP_PERIOD;
  float k0 = round((t - r0) / NODE_DERP_PERIOD);
  float local = r0 + phase * NODE_DERP_PERIOD;
  float k1 = floor(local / NODE_DERP_PERIOD);
  local -= k1 * NODE_DERP_PERIOD;
  float k = k0 + k1;
  uint useed = uint(seed);
  uint salt = uint(2.0 * k);
  float off = hash01(useed, salt) * (NODE_DERP_PERIOD - NODE_DERP_DUR);
  DerpEvent ev;
  ev.k = k;
  ev.t0 = (k - phase) * NODE_DERP_PERIOD + off;
  ev.s = (local - off) / NODE_DERP_DUR;
  ev.on = seed != DERP_NEVER && ev.s >= 0.0 && ev.s < 1.0;
  ev.kind = force ? DERP_KIND_SCATTER : derpKindOf(hash01(useed, salt + 1u));
  return ev;
}

// One value of an event's lattice, in [-1, 1]: point i of axis `axis`, above the event's base salt.
float derpLattice(uint seed, uint base, float i, uint axis) {
  return 2.0 * hash01(seed, base + uint(i) * DERP_FINE_LATTICE + axis) - 1.0;
}

// Event k's seeded value noise at x >= 0, per axis: its lattice points smoothstepped between.
vec3 derpNoise(uint seed, float k, float x) {
  uint base = DERP_FINE_SALT + uint(k) * DERP_FINE_EVENT;
  float i = floor(x);
  float f = x - i;
  float u = f * f * (3.0 - 2.0 * f);
  vec3 a = vec3(derpLattice(seed, base, i, 0u), derpLattice(seed, base, i, 1u), derpLattice(seed, base, i, 2u));
  vec3 b = vec3(derpLattice(seed, base, i + 1.0, 0u), derpLattice(seed, base, i + 1.0, 1u), derpLattice(seed, base, i + 1.0, 2u));
  return a + (b - a) * u;
}

// The skip's profile: eases out to 1 by its peak, snaps to 0 by its home, then rings.
float derpSkipProfile(float s) {
  if (s < DERP_SKIP_PEAK) {
    float x = 1.0 - s / DERP_SKIP_PEAK;
    return 1.0 - x * x;
  }
  if (s < DERP_SKIP_HOME) return 1.0 - (s - DERP_SKIP_PEAK) / (DERP_SKIP_HOME - DERP_SKIP_PEAK);
  float tau = (s - DERP_SKIP_HOME) / (1.0 - DERP_SKIP_HOME);
  return -DERP_SKIP_RING * moteSinCos(2.0 * MOTE_TAU * tau).x * (1.0 - tau);
}

// What a derp moves on a body at ambient t: its seed and phase, its kind (bodyData.ts's BODY_KIND),
// its track's radius r, its own radius R, its angular speed omega and the fix's v; force reads every
// slot as a scatter (derpEvent).
Derp derp(float seed, float phase, float t, int kind, float r, float R, float omega, float v, bool force) {
  Derp d = derpZero();
  if (seed == DERP_NEVER || !(v > 0.0)) return d;
  DerpEvent ev = derpEvent(seed, phase, t, force);
  if (!ev.on) return d;
  float s = ev.s;
  float sec = s * NODE_DERP_DUR;
  if (ev.kind == DERP_KIND_SCATTER) {
    d.scatterS = sec;
    return d;
  }
  uint useed = uint(seed);
  bool shiver = kind == DERP_BODY_STAR || kind == DERP_BODY_CORE;
  if (shiver || ev.kind == DERP_KIND_WOBBLE) {
    float amp = DERP_WOBBLE * R * moteSinCos(0.5 * MOTE_TAU * s).x * v * (shiver ? DERP_STAR_SHIVER : 1.0);
    vec3 n = derpNoise(useed, ev.k, DERP_WOBBLE_RATE * s);
    d.wobble = vec3(amp * n.x, amp * DERP_WOBBLE_Y * n.y, amp * n.z);
    return d;
  }
  if (ev.kind == DERP_KIND_SKIP) {
    float p = derpSkipProfile(s);
    d.dR = DERP_SKIP_R * r * p * v;
    d.lift = DERP_SKIP_LIFT * r * p * v;
  } else if (ev.kind == DERP_KIND_STALL) {
    d.dNu = -omega * NODE_DERP_DUR * (min(s, DERP_STALL_HOLD) - DERP_STALL_HOLD * smoothstep(DERP_STALL_HOLD, 1.0, s)) * v;
  } else if (ev.kind == DERP_KIND_REVERSE) {
    d.dNu = -DERP_REVERSE * moteSinCos(0.5 * MOTE_TAU * s).x * v;
  } else {
    // The burst: micro-slot `slot`, `tau` of the way through it, each term a hard cut.
    float slot = min(floor(s * BURST_SLOTS), BURST_SLOTS - 1.0);
    float tau = s * BURST_SLOTS - slot;
    uint base = uint(ev.k) * 64u + uint(slot) * 8u;
    if (tau < BURST_SNAP_HOLD) {
      float snap = (hash01(useed, base) - 0.5) * BURST_SNAP;
      d.dNu = snap * v;
      if (hash01(useed, base + 1u) < BURST_JUMP_P) d.dR = (hash01(useed, base + 2u) - 0.5) * BURST_JUMP * r * v;
      d.lift = (hash01(useed, base + 3u) - 0.5) * BURST_LIFT * r * v;
      if (hash01(useed, base + 6u) < BURST_GHOST_P) {
        d.ghost = v;
        d.ghostNu = (snap + (hash01(useed, base + 5u) - 0.5) * BURST_GHOST_SPAN) * v;
      }
    }
    // The dropped-frame stutter: the body's own clock stands on multiples of the step.
    if (hash01(useed, base + 7u) < BURST_QUANT_P) d.orbitT = -orbitTurns(t, BURST_QUANT_STEP) * BURST_QUANT_STEP * v;
    // The jitter, held for one tick of the event's time and cut to the next.
    uint tick = DERP_FINE_SALT + uint(ev.k) * DERP_FINE_EVENT + DERP_FINE_JITTER_AT + uint(floor(sec * BURST_JITTER_HZ)) * DERP_FINE_JITTER;
    float jx = (2.0 * hash01(useed, tick) - 1.0) * BURST_JITTER * r * v;
    float jz = (2.0 * hash01(useed, tick + 1u) - 1.0) * BURST_JITTER * r * v;
    // The tremble, eased in and out over the middle third.
    float third = s * BURST_TREMBLE_PARTS - 1.0;
    float amp = third >= 0.0 && third < 1.0 ? BURST_TREMBLE * R * moteSinCos(0.5 * MOTE_TAU * third).x * v : 0.0;
    vec3 n = amp == 0.0 ? vec3(0.0) : derpNoise(useed, ev.k, BURST_TREMBLE_HZ * sec);
    d.wobble = vec3(jx + amp * n.x, amp * DERP_WOBBLE_Y * n.y, jz + amp * n.z);
  }
  return d;
}
