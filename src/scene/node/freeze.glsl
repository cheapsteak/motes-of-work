// GLSL mirror of src/scene/node/freeze.ts, step for step: the freeze frame's dressing (the copies, the
// inked limb, the two bursts of dotted dashes, the twos' breath). freeze.ts says what each term is. It
// has no main(), and it is not usable raw: take it from withGalaxyLibrary() (or, for the parity page,
// withFreezeLibrary()) in shaderSource.ts (this folder), which splices in the generated constants at
// the marker below and puts before it the mote library (hash01) and light.glsl (the palette:
// NODE_AGENT, NODE_HUMAN, NODE_EMBER). Screen angles are radians counter-clockwise from the screen's
// right, its y up; screen lengths CSS px. The parity page (src/parity, ?lib=freeze) renders it and
// compares it with the TS.

// #include FREEZE constants (generated from src/scene/node/birth.ts by shaderSource.ts)

const float FREEZE_PI = 0.5 * MOTE_TAU;
const int FREEZE_SOURCE_MOON = 0;
const int FREEZE_SOURCE_PLANET = 1;

struct FreezeCopy {
  float offPx;
  float gain;
  vec3 tint;
};

struct FreezeLimb {
  float gain;
  float size;
};

struct FreezeTick {
  float angle;
  float radius;
  float len;
  float visible;
};

// How far apart two angles are, radians in [0, pi].
float freezeAngleApart(float a, float b) {
  return abs(mod(a - b + FREEZE_PI, 2.0 * FREEZE_PI) - FREEZE_PI);
}

// Copy `copy` (0 the base, 1 cold, 2 warm) at dressing `dress`, the fix's `v`, warm mode `mode` (0 A, 1 B).
FreezeCopy freezeCopy(int copy, float dress, float v, int mode, bool isDefectMoon) {
  FreezeCopy c;
  if (copy == 0) {
    c.offPx = 0.0;
    c.gain = 1.0;
    c.tint = vec3(0.0);
    return c;
  }
  float px = isDefectMoon ? FREEZE_MOON_COPY_PX : FREEZE_COPY_PX;
  float side = copy == 1 ? -1.0 : 1.0;
  vec3 warm = mode == 0 ? mix(NODE_EMBER, NODE_HUMAN, 1.0 - v) : NODE_HUMAN;
  c.offPx = side * px * dress;
  c.gain = FREEZE_COPY_GAIN * dress;
  c.tint = copy == 1 ? NODE_AGENT : warm;
  return c;
}

// The inked limb's brightness and size (multiples) from the rest normal in view space.
FreezeLimb freezeLimb(vec3 restNormalView, vec3 lightDir, float dress, int copy) {
  vec3 n = restNormalView;
  float band = smoothstep(FREEZE_LIMB_BAND.x, FREEZE_LIMB_BAND.y, 1.0 - abs(n.z));
  float angle = atan(n.y, n.x) * 180.0 / FREEZE_PI;
  float apart = abs(mod(angle - FREEZE_LIMB_BREAK.x + 180.0, 360.0) - 180.0);
  float open = smoothstep(0.0, FREEZE_LIMB_BREAK.y, apart);
  float ink = band * open * dress * (copy == 0 ? 1.0 : FREEZE_LIMB_COPY);
  float lit = max(0.0, dot(n, lightDir));
  float weight = FREEZE_LIMB_WEIGHT.x + FREEZE_LIMB_WEIGHT.y * lit;
  FreezeLimb l;
  l.gain = 1.0 + (FREEZE_LIMB_GAIN - 1.0) * ink;
  l.size = 1.0 + (FREEZE_LIMB_SIZE - 1.0) * ink * weight;
  return l;
}

// A burst's hash j of dash i.
float freezeTickHash(int source, int i, int j) {
  return hash01(FREEZE_TICK_SEED, FREEZE_TICK_SALT + uint(source * 256 + i * 4 + j));
}

// Mote j of dash i of a source's burst (FREEZE_SOURCE_MOON or FREEZE_SOURCE_PLANET), twos set `variant`, the fix's v, how far the
// planet's shell is out, and the screen angle from the planet toward the moon.
FreezeTick freezeTick(int source, int i, int j, int variant, float v, float scatterOut, float toMoon) {
  bool planet = source == FREEZE_SOURCE_PLANET;
  float n = planet ? FREEZE_TICK_PLANET_N : FREEZE_TICK_MOON_N;
  float motes = planet ? FREEZE_TICK_PLANET_MOTES : FREEZE_TICK_MOON_MOTES;
  vec2 lens = planet ? FREEZE_TICK_PLANET_LEN : FREEZE_TICK_MOON_LEN;
  FreezeTick t;
  t.angle = 2.0 * FREEZE_PI * float(i) / n + (planet ? FREEZE_PI / n : 0.0) + (freezeTickHash(source, i, 0) - 0.5) * FREEZE_TICK_STAGGER;
  t.radius = planet ? FREEZE_TICK_PLANET_R0 + FREEZE_TICK_PLANET_OUT * scatterOut : FREEZE_TICK_MOON_R0;
  float u = float(j) / (motes - 1.0);
  t.len = u * (lens.x + (lens.y - lens.x) * freezeTickHash(source, i, 1 + variant));
  bool gone = 1.0 - v > FREEZE_TICK_WINK.x + FREEZE_TICK_WINK.y * freezeTickHash(source, i, 3);
  bool kept = u <= min(1.0, FREEZE_TICK_KEEP * v);
  bool inGap = planet && freezeAngleApart(t.angle, toMoon) < FREEZE_TICK_GAP_HALF;
  t.visible = !gone && kept && !inGap ? 1.0 : 0.0;
  return t;
}

// How far a source's burst has come in with the dressing.
float freezeTickShow(int source, float dress) {
  vec2 e = source == FREEZE_SOURCE_MOON ? FREEZE_TICK_SHOW_MOON : FREEZE_TICK_SHOW_PLANET;
  return smoothstep(e.x, e.y, dress);
}

// Whether dash i of a source's burst is drawn warm.
bool freezeTickWarm(int source, int i) {
  return (i + source) % 2 == 1;
}

// The copies' breath at twos tick `twos` (0: the twos are off).
float freezeBreath(float twos) {
  return twos > 0.0 ? (hash01(FREEZE_TICK_SEED, uint(twos)) - 0.5) * FREEZE_BREATH_PX : 0.0;
}
