// GLSL mirror of src/scene/node/star.ts, step for step: a star's dots (its shell motes: the core's
// gaussian ball and the halo's cut exponential, each dimmer further out), its spikes (rows of 1 px
// dots from its centre on screen), its breath and its tint. star.ts says what each term is. It has no
// main(), and it is not usable raw: take it from withStarLibrary() or withGalaxyLibrary() in
// shaderSource.ts (this folder), which splice in the stars' generated constants (classLook.ts) at the
// marker below and put the mote library (hash01, the SALT constants, moteSinCos, MOTE_TAU) and
// orbit.glsl (orbitTurns) before it. Like orbit.glsl it never calls the builtin sin or cos. The parity
// page (src/parity, ?lib=star) renders it and compares it with the TS reference.

// #include STAR constants (generated from src/scene/node/classLook.ts by shaderSource.ts)

// A star's own look (galaxy/body.ts StarLook): the bodies texture's T7 holds brightness, spikes, period
// and phase; its temperature is spent on the CPU, in its tint (T6).
struct StarLook {
  float brightness;
  float spikes;
  float temperature;
  float period;
  float phase;
};

// A dot's direction (lat, lon: y up, the lattice's frame) and its distance from the centre in R.
struct StarDotPolar {
  vec2 ll;
  float rho;
};

// Dot `index` of a star, of mote seed `seed`: a uniform direction, and a core dot's gaussian radius
// or a halo dot's exponential one, cut at STAR_HALO_MAX (star.ts starDotPolar).
StarDotPolar starDotPolar(float index, uint seed) {
  float z = 2.0 * hash01(seed, SALT_STAR_DOT_Z) - 1.0;
  float u = hash01(seed, SALT_STAR_DOT_RADIUS);
  StarDotPolar p;
  p.ll = vec2(asin(z), MOTE_TAU * hash01(seed, SALT_STAR_DOT_AZIMUTH));
  p.rho = index < float(STAR_DOTS_CORE) ? STAR_CORE_SIGMA * sqrt(-3.0 * log(1.0 - u)) : STAR_HALO_FROM - STAR_HALO_SCALE * log(1.0 - u * STAR_HALO_CUT);
  return p;
}

// A star's dot: its offset from the centre in R (xyz) and its gain e^(-rho / STAR_FALL) (w).
vec4 starDot(float index, uint seed) {
  StarDotPolar p = starDotPolar(index, seed);
  vec2 lat = moteSinCos(p.ll.x);
  vec2 lon = moteSinCos(p.ll.y);
  return vec4(p.rho * vec3(lat.y * lon.y, lat.x, lat.y * lon.x), exp(-p.rho / STAR_FALL));
}

// How much of its spikes a star shows: all if it is among the brightest, else by nearPx, its glow's
// unclamped size, as the camera comes close (star.ts starSpikeShare).
float starSpikeShare(StarLook look, float nearPx) {
  return look.brightness >= STAR_SPIKE_FROM ? 1.0 : smoothstep(STAR_SPIKE_NEAR.x, STAR_SPIKE_NEAR.y, nearPx);
}

// Dot j of spike `row` of a star whose glow is glowPx CSS px across (nearPx unclamped): its offset on
// screen (xy, CSS px, y up) and its gain (z); a row past the star's spikes has gain 0 (star.ts starSpike).
vec3 starSpike(StarLook look, int row, float j, float glowPx, float nearPx) {
  int n = int(round(look.spikes));
  if (row >= n) return vec3(0.0);
  float deg = n == 6 ? STAR_SPIKE_ANGLES_6[row] : STAR_SPIKE_ANGLES_4[row];
  vec2 sc = moteSinCos(radians(deg));
  float u = (j + 0.5) / float(STAR_DOTS_SPIKE_DOTS);
  float len = STAR_SPIKE_LEN * glowPx * look.brightness * u;
  float fade = smoothstep(STAR_SPIKE_LOD.x, STAR_SPIKE_LOD.y, glowPx) * starSpikeShare(look, nearPx);
  float gain = STAR_SPIKE_GAIN * fade * pow(1.0 - u, STAR_SPIKE_FALL);
  return vec3(len * sc.y, len * sc.x, gain);
}

// A star's breath at ambient t: 1 + STAR_BREATH sin(2 pi t / period + 2 pi phase).
float starBreath(float period, float phase, float t) {
  return 1.0 + STAR_BREATH * moteSinCos(MOTE_TAU * (orbitTurns(t, period) + phase)).x;
}

// A star's tint at its temperature: from STAR_WHITE to STAR_AMBER.
vec3 starTint(float temperature) {
  return mix(STAR_WHITE, STAR_AMBER, temperature);
}
