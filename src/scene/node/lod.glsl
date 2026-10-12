// GLSL mirror of src/scene/node/lod.ts: an element's brightness by its system's projected size, a
// glow sprite's size, a moon's handover from its point to its dotted sphere, a shell mote's size, the neighbourhood's dissolve (hoodReal), and the early-out (lodSkip, offScreenSkip, hoodSkip). lod.ts says what each is. It has no main(), and it is not usable raw: take it
// from lodLibraryGlsl() in shaderSource.ts (this folder), which splices in the generated constants
// at the marker below. The parity page (src/parity, ?lib=lod) renders it and compares it with the TS.

// #include LOD constants (generated from src/scene/node/lod.ts by shaderSource.ts)

// An element's brightness at a system's s_px: 0 below its band, 1 above it, smoothstep between.
float lodGain(int el, float sysPx) {
  vec2 band = LOD_BANDS[el];
  return smoothstep(band.x, band.y, sysPx);
}

// A star's or core body's glow sprite in CSS px: clamp(5 R focal / d, 5, cap).
float glowPx(float R, float d, float focalPx, float cap) {
  return min(cap, max(GLOW_MIN_PX, GLOW_SCALE * R * focalPx / d));
}

// The neighbourhood's dissolve (lod.ts HOOD_LOD, "Dissolve (late)"): a neighbourhood star's plain glow
// at distance d, its real form's share at that glow (held up to a beat's hold), and its far form's share
// (the rest: star.vert.glsl fades the far sets by it).
float hoodGlowPx(float d, float focalCss) {
  return glowPx(HOOD_STAR_R, d, focalCss, HOOD_GLOW_CAP);
}

float hoodReal(float glow, float hold) {
  return max(smoothstep(HOOD_LOD.x, HOOD_LOD.y, glow), hold);
}

float hoodFar(float d, float focalCss, float hold) {
  return 1.0 - hoodReal(hoodGlowPx(d, focalCss), hold);
}

// A moon's sphere's share of its light at `across` CSS px (its point takes the rest).
float moonSphereGain(float across) {
  return smoothstep(MOON_POINT_PX.x, MOON_POINT_PX.y, across);
}

// A moon's point's diameter (CSS px): its own disc, floored at PX_MOON, held at MOON_POINT_PX.x.
float moonPointPx(float across) {
  return min(MOON_POINT_PX.x, max(PX_MOON, across));
}

// A shell mote's diameter (CSS px) for a world diameter at pxPerUnit CSS px per unit, floored at PX_MOTE.
float motePx(float diameter, float pxPerUnit) {
  return max(PX_MOTE, diameter * pxPerUnit);
}

// The early-out (lod.ts lodSkipElement, lodSkip, offScreenReachPx, offScreenSkip): a dot the late path
// would hide skips the heavy vertex path first. Each implies the late path hides it.

// The element whose gain decides whether the late path draws a dot (-1: none).
int lodSkipElement(int kind, int role, float index) {
  if (role == LOD_ROLE_TRACK) return LOD_TRACK;
  if (role == LOD_ROLE_GLOW) return -1;
  if (kind == LOD_KIND_MOON) return LOD_MOON;
  if (kind == LOD_KIND_PLANET) return role != LOD_ROLE_PERSON && index == 0.0 ? LOD_PLANET_POINT : LOD_PLANET_SHELL;
  return -1;
}

// Whether a dot of a system sysPx CSS px across is certainly hidden by its level of detail (force: its
// element's override, -1 none). A shell, moon or person mote under LOD_VISIBLE; a point or a track dot,
// whose late gain carries factors over 1, only at 0.
bool lodSkip(int kind, int role, float index, float sysPx, float force) {
  int el = lodSkipElement(kind, role, index);
  if (el < 0) return false;
  float gain = force >= 0.0 ? force : lodGain(el, sysPx);
  bool point = role == LOD_ROLE_TRACK || (role != LOD_ROLE_PERSON && index == 0.0);
  return point ? gain <= 0.0 : !(gain >= LOD_VISIBLE);
}

// How far on screen (CSS px) a dot can stand from its body's centre at `view` (view space), the dot at
// most rho world units from it and dotWorld across; NO_REACH_PX when the ball is not wholly in front.
float offScreenReachPx(vec3 view, float rho, float fx, float fy, float dotWorld) {
  float Z = -view.z;
  float nearZ = Z - rho;
  if (!(nearZ > 0.0)) return NO_REACH_PX;
  float shift = max(fx * (1.0 + abs(view.x) / Z), fy * (1.0 + abs(view.y) / Z)) * (rho / nearZ);
  return shift + 0.5 * max(PX_MOTE, dotWorld * fy / nearZ) + REACH_MARGIN_PX;
}

// Whether a body's dots are certainly off a w x h CSS px screen: its centre further outside than reachPx.
bool offScreenSkip(vec2 centreCss, float reachPx, float w, float h) {
  return max(max(-centreCss.x, centreCss.x - w), max(-centreCss.y, centreCss.y - h)) > reachPx;
}

// Whether a dot of a body of `kind` is certainly hidden by the neighbourhood's dissolve: a star's where
// its real share is 0 (its glow, dots and spikes are each drawn times it).
bool hoodSkip(int kind, float real) {
  return kind == LOD_KIND_STAR && !(real > 0.0);
}

// The plan's schematic (lod.ts planFull, planCull, planRank, planWindow, planGain, planSkip; re-skin
// §4.7): a system's full-detail gain over the third (third -1e30: none), its soft cull, a dot's rank
// dissolve, an element's window (x full for R's, the elements from PLAN_R_FROM; 1 - w for PlanLeave),
// a dot's gain from it, and whether that gain is 0 for every rank (the early-out).
float planFull(float sPx, float third, float soft) {
  return third <= -1e30 ? 1.0 : smoothstep(0.0, 2.0 * soft, sPx - third);
}

float planCull(float insidePx, float depth, float sPx) {
  return smoothstep(-max(PLAN_CULL_MARGIN, sPx), 0.0, insidePx) * smoothstep(PLAN_CULL_DEPTH.x, PLAN_CULL_DEPTH.y, depth);
}

float planRank(float w, float rank) {
  return clamp((w * (1.0 + PLAN_RAMP) - rank) / PLAN_RAMP, 0.0, 1.0);
}

float planWindow(int el, float sPx, float full, float force) {
  float w = force >= 0.0 ? force : lodGain(el, sPx);
  if (el == LOD_PLAN_LEAVE) return 1.0 - w;
  return el >= PLAN_R_FROM ? w * full : w;
}

float planGain(int el, float sPx, float rank, float full, float cull, float real, float force) {
  return planRank(planWindow(el, sPx, full, force), rank) * planRank(cull, rank) * real;
}

bool planSkip(int el, float sPx, float full, float cull, float real, float force) {
  return !(planWindow(el, sPx, full, force) > 0.0) || !(cull > 0.0) || !(real > 0.0);
}
