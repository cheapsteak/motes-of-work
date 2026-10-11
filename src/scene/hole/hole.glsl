// GLSL mirror of src/scene/hole/hole.ts, step for step: the lens, the disk (streak lifetimes, Doppler
// lopsidedness, the underside arc a moment late), the photon ring, the jets, the knots, the in-fall and
// the strands' disk part. hole.ts says what each term is, the frames, and why every clock is reduced
// before it is scaled. It has no main(), and it is not usable raw: take it from withHoleLibrary() in
// shaderSource.ts (src/scene/node), which splices in the hole's generated constants (holeLook.ts) at
// the marker below and puts the mote library (pcg, hash01, the SALT constants, moteSinCos, MOTE_TAU)
// and orbit.glsl (orbitTurns) before it. It never calls the builtin sin, cos or atan. The parity page
// (src/parity, ?lib=hole) renders it and compares it with the TS reference.

// #include HOLE constants (generated from src/scene/hole/holeLook.ts by shaderSource.ts)

// What a dot is drawn from (hole.ts HoleView): the ambient, the camera in the hole's frame, the hole's
// frame to view, the hole's centre in view space, and the part's gain before the per-dot clamp.
struct HoleView {
  float t;
  vec3 cam;
  mat3 viewRot;
  vec3 hv;
  float gain;
};

// A dot (hole.ts HoleDot): view space after the lens, colour, clamped alpha, CSS px, the lens's ok.
struct HoleDot {
  vec3 view;
  vec3 rgb;
  float alpha;
  float sizeCss;
  float ok;
};

// A seed in [0, 2^24) from a slot a and a launch index b >= -1, both whole (holeLook.ts holeSeed).
uint holeSeed(float a, float b) {
  return pcg(uint(round(a)) ^ pcg(uint(round(b + 1.0)))) >> 8u;
}

// A clock that runs `lives` times an hour, `phase` lives ahead (phase > -1): (n, u, the life's index
// n mod lives), from the integer seconds. The index is int arithmetic, never a float mod: GLSL's
// division may be by the reciprocal, and floor(N / N) is then 0 for some N (hole.ts holeLives).
vec3 holeLives(float t, float lives, float phase) {
  float ti = floor(t);
  float tf = t - ti;
  int hour = int(HOLE_HOUR);
  int n = int(round(lives));
  int x = (int(ti) + (ti < 0.0 ? hour : 0)) * n;
  int q = x / hour;
  float y = (float(x - q * hour) + lives * tf) / HOLE_HOUR + phase;
  float f = floor(y);
  return vec3(float(q) + f, y - f, float((q + int(f) + n) % n));
}

// A clock of `period` s, `phase` turns ahead: (n, u), the turns by orbitTurns.
vec2 holeCycle(float t, float period, float phase) {
  float k = floor(t / period);
  float w = orbitTurns(t, period) + phase;
  float f = floor(w);
  return vec2(k + f, w - f);
}

float holeSoftplus(float x, float k) {
  return max(x, 0.0) + log(1.0 + exp(-k * abs(x))) / k;
}

// The lens: a view-space point pv about the hole's centre hv, image 0 or 1: (the point, ok).
vec4 holeLens(vec3 pv, vec3 hv, float image, float scale) {
  vec3 rel = (pv - hv) / scale;
  float d = -rel.z;
  vec2 t = rel.xy;
  float b = sqrt(rel.x * rel.x + rel.y * rel.y);
  float deff = max(d, 0.0) + HOLE_LENS_NEAR * exp(-abs(d));
  float disc = sqrt(b * b + 8.0 * HOLE_LENS_BEND * deff);
  float bp;
  float ok = 1.0;
  if (image < 0.5) {
    bp = 0.5 * (b + disc);
    if (d > 0.0 && bp < HOLE_LENS_B_CRIT) ok = 0.0;
    ok *= 1.0 + HOLE_LENS_MAGNIFY * smoothstep(0.0, HOLE_LENS_MAGNIFY_DEPTH, d);
  } else {
    if (d < HOLE_LENS_UNDER_FROM) ok = 0.0;
    bp = 0.5 * (disc - b);
    bp = HOLE_LENS_B_CRIT + (bp - HOLE_LENS_B_CRIT) * HOLE_LENS_UNDER_HUG;
    t = -t;
  }
  if (bp > HOLE_LENS_EDGE) ok = 0.0;
  float x = bp - HOLE_LENS_B_CRIT;
  ok *= mix(HOLE_LENS_RIM_DIM, 1.0, smoothstep(HOLE_LENS_RIM.x, HOLE_LENS_RIM.y, x));
  bp = HOLE_LENS_B_CRIT + HOLE_LENS_RIM_GAP + holeSoftplus(x, HOLE_LENS_SOFTNESS);
  vec2 tp = b > HOLE_LENS_AXIS ? t * (bp / b) : vec2(0.0, bp);
  float w = d > 0.0 ? 1.0 : exp(d / HOLE_LENS_FLATTEN);
  float z = rel.z * (1.0 - w);
  return vec4(hv + vec3(tp, z) * scale, ok);
}

// Doppler beaming: (the gain g^(pow lop), the factor g).
vec2 holeDoppler(vec3 p, vec3 v, float beta, vec3 cam) {
  vec3 dc = cam - p;
  float c = dot(v, dc) / sqrt(dot(dc, dc));
  float g = sqrt(max(1.0 - beta * beta, 0.0)) / (1.0 - beta * c);
  return vec2(pow(g, HOLE_DISK_DOPPLER_POW * HOLE_LOOK_LOPSIDEDNESS), g);
}

vec3 holeTemp(float g, float heat) {
  float m = smoothstep(HOLE_COLOUR_COOL_BAND.x, HOLE_COLOUR_COOL_BAND.y, 1.0 + (g - 1.0) * HOLE_LOOK_LOPSIDEDNESS);
  return mix(mix(HOLE_COLOUR_WARM, HOLE_COLOUR_COOL, m), HOLE_COLOUR_WHITE, heat * HOLE_COLOUR_WHITE_MIX);
}

// The Kepler rate at r.
float holeOmega(float r) {
  return HOLE_DISK_OMEGA0 * pow(r, -1.5);
}

float holeMix(vec2 range, float h) {
  return range.x + (range.y - range.x) * h;
}

vec3 holeToView(HoleView v, vec3 p) {
  return v.hv + v.viewRot * (p * HOLE_LOOK_SCALE);
}

HoleDot holeFinish(vec3 view, vec3 rgb, float I, float sizeCss, float ok) {
  float alpha = ok < HOLE_DOT_HIDDEN ? 0.0 : clamp(I * min(ok, 1.0), 0.0, 1.0);
  return HoleDot(view, rgb, alpha, sizeCss, ok);
}

HoleDot holeEmit(HoleView v, vec3 p, float image, vec3 rgb, float I, float sizeCss, float ok) {
  vec4 lensed = holeLens(holeToView(v, p), v.hv, image, HOLE_LOOK_SCALE);
  return holeFinish(lensed.xyz, rgb, I, sizeCss, ok * lensed.w);
}

// A streak's life of index `index` in the hour, at the life's fraction u (hole.ts streakLife).
struct StreakLife {
  float rc;
  float angle;
  float len;
  float bright;
  float pitch;
  float hot;
};

StreakLife streakLife(float k, float rb, float index, float u) {
  uint seed = holeSeed(k, index);
  StreakLife s;
  s.hot = hash01(seed, SALT_DISK_HOT) < HOLE_DISK_MOTION_HOT_SHARE ? 1.0 : 0.0;
  s.rc = rb * (1.0 - HOLE_DISK_MOTION_LIFE_JITTER + 2.0 * HOLE_DISK_MOTION_LIFE_JITTER * hash01(seed, SALT_DISK_LIFE_R)) - HOLE_DISK_MOTION_DRIFT * u;
  s.angle = MOTE_TAU * hash01(seed, SALT_DISK_LIFE_ANGLE);
  s.len = holeMix(HOLE_DISK_STREAK_LEN, hash01(seed, SALT_DISK_LIFE_LEN)) * (1.0 + s.rc / HOLE_DISK_STREAK_LEN_GROW) * mix(1.0, HOLE_DISK_MOTION_HOT_LEN, s.hot);
  s.bright = holeMix(HOLE_DISK_STREAK_BRIGHT, hash01(seed, SALT_DISK_LIFE_BRIGHT)) * mix(1.0, HOLE_DISK_MOTION_HOT_BRIGHT, s.hot);
  s.pitch = holeMix(HOLE_DISK_STREAK_PITCH, hash01(seed, SALT_DISK_LIFE_PITCH));
  return s;
}

// Where a disk dot is (hole.ts diskPlace): r, phi, the brightness before the light law, the size added.
struct DiskPlace {
  float r;
  float phi;
  float bright;
  float sizeAdd;
};

DiskPlace diskPlace(vec4 aA, vec4 aB, vec4 aC, float t, float lag) {
  float lives = aB.w;
  float life = HOLE_HOUR / lives;
  float back = lag * lives / HOLE_HOUR;
  DiskPlace d;
  if (aC.x >= 0.0) {
    vec3 c = holeLives(t, lives, hash01(holeSeed(aC.x, -1.0), SALT_DISK_PHASE) - back);
    StreakLife s = streakLife(aC.x, aB.y, c.z, c.y);
    float tau = c.y * life;
    float offa = aC.y * s.len;
    d.r = max(HOLE_DISK_INNER, s.rc + aC.z * HOLE_DISK_STREAK_JITTER - offa * s.pitch);
    float wC = holeOmega(s.rc);
    float wI = holeOmega(d.r);
    d.phi = s.angle + offa + wC * tau + HOLE_DISK_MOTION_SHEAR * (wI - wC) * tau;
    float env = smoothstep(0.0, HOLE_DISK_MOTION_ENV.x, c.y) * (1.0 - smoothstep(HOLE_DISK_MOTION_ENV.y, 1.0, c.y));
    d.bright = s.bright * aC.w * env;
    d.sizeAdd = s.hot * HOLE_DISK_MOTION_HOT_SIZE;
    return d;
  }
  vec3 c = holeLives(t, lives, hash01(holeSeed(aB.z, -1.0), SALT_HAZE_PHASE) - back);
  d.r = aA.x;
  d.phi = MOTE_TAU * hash01(holeSeed(aB.z, c.z), SALT_HAZE_ANGLE) + holeOmega(aA.x) * c.y * life;
  float env = smoothstep(0.0, HOLE_DISK_MOTION_HAZE_ENV.x, c.y) * (1.0 - smoothstep(HOLE_DISK_MOTION_HAZE_ENV.y, 1.0, c.y));
  d.bright = aA.w * env;
  d.sizeAdd = 0.0;
  return d;
}

// A disk dot through image 0, or 1 (the underside arc: arcDelay behind, at underGain).
HoleDot diskDot(vec4 aA, vec4 aB, vec4 aC, HoleView v, float image) {
  DiskPlace d = diskPlace(aA, aB, aC, v.t, image > 0.5 ? HOLE_DISK_MOTION_ARC_DELAY : 0.0);
  vec2 sc = moteSinCos(d.phi);
  vec3 p = vec3(d.r * sc.y, aA.z, d.r * sc.x);
  vec2 dop = holeDoppler(p, vec3(-sc.x, 0.0, sc.y), sqrt(HOLE_DISK_BETA / max(d.r, HOLE_DISK_INNER)), v.cam);
  float heat = clamp((HOLE_DISK_HEAT.x - d.r) / HOLE_DISK_HEAT.y, 0.0, 1.0);
  float radial = pow(HOLE_DISK_RADIAL_REF / d.r, HOLE_DISK_RADIAL_POW) * smoothstep(HOLE_DISK_RISE.x, HOLE_DISK_RISE.y, d.r);
  float grav = max(1.0 - 1.0 / d.r, 0.0);
  float outer = 1.0 - smoothstep(HOLE_DISK_FADE.x, HOLE_DISK_FADE.y, d.r);
  float I = d.bright * radial * dop.x * grav * outer * HOLE_LOOK_DISK_BRIGHTNESS * v.gain * (image > 0.5 ? HOLE_LENS_UNDER_GAIN : 1.0);
  float size = aB.x + d.sizeAdd + HOLE_DISK_LIFT.x * clamp(I - 1.0, 0.0, HOLE_DISK_LIFT.y);
  return holeEmit(v, p, image, holeTemp(dop.y, heat), I, size, 1.0);
}

// A photon ring dot: a circle in the view plane about hv.
HoleDot ringDot(vec4 aA, vec4 aB, HoleView v) {
  vec2 sc = moteSinCos(aA.x);
  vec3 e = transpose(v.viewRot) * vec3(sc.y, sc.x, 0.0);
  vec2 planar = vec2(e.x + HOLE_LENS_AXIS, e.z);
  planar /= sqrt(dot(planar, planar));
  vec2 dop = holeDoppler(vec3(planar.x, 0.0, planar.y) * HOLE_LENS_B_CRIT, vec3(-planar.y, 0.0, planar.x), HOLE_RING_BETA, v.cam);
  float I = aA.z * pow(max(dop.x, 0.0), HOLE_RING_POW) * HOLE_RING_GAIN * v.gain;
  float rr = (HOLE_LENS_B_CRIT * HOLE_RING_RADIUS + aA.y * HOLE_RING_JITTER) * HOLE_LOOK_SCALE;
  return holeFinish(v.hv + vec3(sc.y * rr, sc.x * rr, 0.0), holeTemp(dop.y, HOLE_RING_HEAT), I, HOLE_RING_SIZE, 1.0);
}

float jetRho(float s) {
  return HOLE_LOOK_JET_WIDTH * 0.5 * pow(max(s, 0.0), HOLE_JET_RHO_POW);
}

// A jet dot's place (xyz) and s (w).
vec4 jetPlace(vec4 aA, vec4 aB, float t) {
  float f = holeMix(HOLE_JET_DRIFT, floor(hash01(uint(round(aB.y)), SALT_JET_SPEED) * HOLE_JET_DRIFT_STEPS) / HOLE_JET_DRIFT_STEPS);
  vec2 c = holeCycle(t, HOLE_PERIODS_JET_PERIOD, 0.0);
  float s = HOLE_LOOK_JET_LENGTH * fract(aA.x + fract(c.x * f) + f * c.y);
  float rr = jetRho(s) * aA.z;
  vec2 sc = moteSinCos(aA.y + aA.w * MOTE_TAU * orbitTurns(t, HOLE_PERIODS_TWIST_PERIOD));
  return vec4(rr * sc.y, aA.w * (HOLE_JET_BASE + s), rr * sc.x, s);
}

HoleDot jetDot(vec4 aA, vec4 aB, HoleView v) {
  vec4 j = jetPlace(aA, aB, v.t);
  float s = j.w;
  float fade = smoothstep(0.0, HOLE_JET_FADE_IN, s) * (1.0 - smoothstep(HOLE_JET_FADE_OUT * HOLE_LOOK_JET_LENGTH, HOLE_LOOK_JET_LENGTH, s));
  float I = aB.x * fade * (HOLE_JET_GAIN / (1.0 + s / HOLE_JET_FALLOFF)) * v.gain;
  vec3 rgb = mix(HOLE_JET_BASE_RGB, HOLE_JET_TIP_RGB, smoothstep(0.0, 1.0, s / HOLE_LOOK_JET_LENGTH));
  return holeEmit(v, j.xyz, 0.0, rgb, I, HOLE_JET_SIZE, 1.0);
}

// A knot dot's place (hole.ts knotPlace).
struct KnotPlace {
  vec3 p;
  float s;
  float ok;
  float emberDraw;
};

KnotPlace knotPlace(vec4 aA, vec4 aB, float t) {
  vec2 c = holeCycle(t, HOLE_PERIODS_KNOT_CYCLE, 0.0);
  float inCycle = c.y * HOLE_PERIODS_KNOT_CYCLE;
  float back = inCycle < aA.x * HOLE_PERIODS_KNOT_INTERVAL ? -1.0 : 0.0;
  uint id = holeSeed(aA.x + (aA.y < 0.0 ? HOLE_PERIODS_KNOT_SLOTS : 0.0), c.x + back);
  float launch = aA.x * HOLE_PERIODS_KNOT_INTERVAL + back * HOLE_PERIODS_KNOT_CYCLE + HOLE_KNOT_JITTER * HOLE_PERIODS_KNOT_INTERVAL * hash01(id, SALT_KNOT_LAUNCH);
  KnotPlace k;
  k.s = (inCycle - launch) * HOLE_KNOT_SPEED;
  k.ok = k.s >= 0.0 && k.s <= HOLE_LOOK_JET_LENGTH ? 1.0 : 0.0;
  float rho = jetRho(k.s);
  k.p = vec3(aB.x * rho * HOLE_KNOT_SPREAD, aA.y * (HOLE_JET_BASE + k.s + aB.y * (HOLE_KNOT_LIFT.x + HOLE_KNOT_LIFT.y * k.s)), aB.z * rho * HOLE_KNOT_SPREAD);
  k.emberDraw = hash01(id, SALT_KNOT_EMBER);
  return k;
}

// A knot dot under the fronts (ember, clean), its ember flag out.
HoleDot knotDot(vec4 aA, vec4 aB, HoleView v, vec2 fronts, out float ember) {
  KnotPlace k = knotPlace(aA, aB, v.t);
  ember = k.emberDraw < HOLE_KNOT_EMBER_SHARE && k.s <= fronts.x * HOLE_LOOK_JET_LENGTH && k.s >= fronts.y * HOLE_LOOK_JET_LENGTH ? 1.0 : 0.0;
  float fade = smoothstep(0.0, HOLE_KNOT_FADE.x, k.s) * (1.0 - smoothstep(HOLE_KNOT_FADE.y * HOLE_LOOK_JET_LENGTH, HOLE_LOOK_JET_LENGTH, k.s));
  float I = aA.z * fade * v.gain;
  return holeEmit(v, k.p, 0.0, mix(HOLE_KNOT_CLEAN, HOLE_KNOT_EMBER, ember), I, HOLE_KNOT_SIZE, k.ok);
}

// An in-fall dot's place (xyz) and its fall's u (w).
vec4 infallPlace(vec4 aA, float t) {
  uint slotSeed = holeSeed(aA.x, -1.0);
  float period = holeMix(HOLE_INFALL_PERIOD, floor(hash01(slotSeed, SALT_INFALL_PERIOD) * HOLE_INFALL_PERIOD_STEPS) / HOLE_INFALL_PERIOD_STEPS);
  vec2 c = holeCycle(t, period, hash01(slotSeed, SALT_INFALL_OFFSET));
  float u = c.y * period / HOLE_INFALL_FALL - aA.y * HOLE_INFALL_TRAIL;
  uint fallSeed = holeSeed(aA.x, c.x);
  float tilt = holeMix(HOLE_INFALL_TILT, hash01(fallSeed, SALT_INFALL_TILT)) * (hash01(fallSeed, SALT_INFALL_SIDE) < 0.5 ? -1.0 : 1.0);
  float from = holeMix(HOLE_INFALL_FROM, hash01(fallSeed, SALT_INFALL_FROM));
  float to = holeMix(HOLE_INFALL_TO, hash01(fallSeed, SALT_INFALL_TO));
  float uc = clamp(u, 0.0, 1.0);
  float e = pow(uc, HOLE_INFALL_EASE);
  vec2 st = moteSinCos(tilt);
  float rho = mix(from * st.y, to, e);
  float y = from * st.x * pow(1.0 - e, HOLE_INFALL_DROP);
  float phi = MOTE_TAU * hash01(fallSeed, SALT_INFALL_AZIMUTH) + holeMix(HOLE_INFALL_WIND, hash01(fallSeed, SALT_INFALL_WIND)) * e + holeOmega(to) * HOLE_INFALL_FALL * uc * e;
  vec2 sc = moteSinCos(phi);
  return vec4(rho * sc.y, y, rho * sc.x, u);
}

HoleDot infallDot(vec4 aA, vec4 aB, HoleView v) {
  vec4 f = infallPlace(aA, v.t);
  float ok = f.w >= 0.0 && f.w <= 1.0 ? 1.0 : 0.0;
  float fade = smoothstep(0.0, HOLE_INFALL_FADE.x, f.w) * (1.0 - smoothstep(HOLE_INFALL_FADE.y, 1.0, f.w));
  float I = (HOLE_INFALL_BRIGHT - HOLE_INFALL_TRAIL_DIM * aA.y) * fade * v.gain;
  return holeEmit(v, f.xyz, 0.0, HOLE_INFALL_RGB, I, HOLE_INFALL_SIZE, ok);
}

// Where strand `which` joins the disk at ambient t (R1's: where the C7 -> R1 stream ends).
vec3 strandJoin(float which, float t) {
  int w = int(round(which));
  vec2 sc = moteSinCos(MOTE_TAU * orbitTurns(t, HOLE_PERIODS_STRAND_PERIOD[w]));
  return HOLE_STRANDS_R_JOIN[w] * vec3(sc.y, 0.0, sc.x);
}

// A strand dot's place (xyz) and its un-jittered radius (w).
vec4 strandPlace(vec4 aA, vec4 aB, float t) {
  int w = int(round(aB.x));
  float psi = aA.x / HOLE_STRANDS_R_MEAN[w];
  float r = HOLE_STRANDS_R_JOIN[w] - HOLE_STRAND_SHAPE_PITCH * psi;
  vec2 sc = moteSinCos(psi + MOTE_TAU * orbitTurns(t, HOLE_PERIODS_STRAND_PERIOD[w]));
  float rj = r + aA.z * HOLE_STRAND_JITTER.x;
  return vec4(rj * sc.y, aA.w * HOLE_STRAND_JITTER.y, rj * sc.x, r);
}

// A strand dot inside its window [0, s.x] at heat s.y.
HoleDot strandDot(vec4 aA, vec4 aB, HoleView v, vec2 s) {
  vec4 d = strandPlace(aA, aB, v.t);
  float q = aA.x;
  float tail = 0.0;
  float vis = q >= tail && q <= s.x ? 1.0 : 0.0;
  float rv = sqrt(d.x * d.x + d.z * d.z);
  vec2 dop = holeDoppler(d.xyz, vec3(-d.z / rv, 0.0, d.x / rv), sqrt(HOLE_DISK_BETA / max(d.w, HOLE_STRAND_BETA_FLOOR)), v.cam);
  float endFade = smoothstep(tail, tail + HOLE_STRAND_FADE.x, q) * (1.0 - smoothstep(s.x - HOLE_STRAND_FADE.y, s.x, q));
  float I = holeMix(HOLE_STRAND_BRIGHT, hash01(uint(round(aA.y)), SALT_STRAND_BRIGHT)) * pow(max(dop.x, 0.0), HOLE_STRAND_DOPPLER_POW) * HOLE_LOOK_STRAND_BRIGHTNESS * v.gain * mix(HOLE_STRAND_CLEAN_GAIN, HOLE_EMBER_GAIN, s.y) * endFade;
  return holeEmit(v, d.xyz, 0.0, mix(HOLE_STRAND_CLEAN, HOLE_EMBER_RGB, s.y), I, mix(HOLE_STRAND_SIZE, HOLE_EMBER_SIZE, s.y), vis);
}

// A dot's size in device px: x the pixel ratio x clamp(refDist / z, near), never under one CSS px.
float holeDotPx(float sizeCss, float viewDepth, float pixelRatio) {
  float px = sizeCss * pixelRatio * clamp(HOLE_VIEW_REF_DIST / max(viewDepth, 1.0), HOLE_DOT_NEAR.x, HOLE_DOT_NEAR.y);
  return max(px, HOLE_DOT_FLOOR * pixelRatio);
}
