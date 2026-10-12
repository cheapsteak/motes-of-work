// GLSL mirror of src/scene/node/plan.ts: the plan's schematic (re-skin §4.7, Task 7b), every world mark
// of net-plan, and the frame values and helpers planScreen.glsl's screen marks share. plan.ts says what
// each is. It has no main(), and it is not usable raw: take it from withPlanLibrary() in
// shaderSource.ts (this folder), which splices it after the galaxy's libraries (bodyWorld, bodyDerp,
// bodyCentre, bodyLight, bodyPresence, lampGain, freezeLook, streamBandMask, lod.glsl's plan gains) with
// its generated constants at the markers below. The parity page (src/parity, ?lib=plan) renders it and
// compares it with the TS.

// #include PLAN constants (generated from src/scene/node/classLook.ts and planAttrs.ts by shaderSource.ts)

// The layout table (planAttrs.ts planTable, plan.ts planLayout), each system's frame values (s_px,
// full, cull, real) and its ranges in the world and the screen pools, and the camera (view and projection).
uniform highp sampler2D uPlanTex;
uniform vec4 uPlanSys[GALAXY_SYS_MAX];
uniform vec4 uPlanRange[GALAXY_SYS_MAX];
uniform mat4 uPlanView;
uniform mat4 uPlanProj;

const float PLAN_TAU = 6.283185307179586;

struct PlanAttrs {
  int sys;
  int mark;
  int ord;
  int j;
  int n;
  float aux;
  float rank;
  int sys2;
};

struct PlanDot {
  vec3 pos;
  vec2 px;
  vec3 rgb;
  float alpha;
  float sizeCss;
};

PlanDot planHidden() {
  return PlanDot(vec3(0.0), vec2(0.0), vec3(0.0), 0.0, 0.0);
}

vec4 planTexel(int s, int t) {
  return texelFetch(uPlanTex, ivec2(t, s), 0);
}

int planBodyRow(int s, int k) {
  if (k < 0 || k >= PLAN_BODY_MAX) return -1;
  return int(round(planTexel(s, k / 4)[k - 4 * (k / 4)]));
}

// A run's dot's arrival rank (plan.ts planRunRank): hash01 of its place with SALT_PLAN_RANK (a node's SALT_PLAN_NODE).
float planRunRank(int s, int r, int k, int j) {
  uint seed = uint(((s * 32 + r) * 16 + max(k, 0)) * 4096 + min(j, 4095));
  if (PLAN_RUN_MARK[r] == PLAN_MARK_NODE) return hash01(seed, SALT_PLAN_NODE);
  return hash01(seed, SALT_PLAN_RANK);
}

// A dot's attributes resolved against the frame (plan.ts planResolve): a pair's as they are; a pool's
// dot, the system whose range holds it, then the run and the body whose ends do (sys -1: unused).
PlanAttrs planResolve(vec4 a0, vec4 a1) {
  PlanAttrs d;
  int owner = int(round(a0.x));
  d.sys = owner;
  d.mark = int(round(a0.y));
  d.ord = int(round(a0.z));
  d.j = int(round(a0.w));
  d.n = int(round(a1.z));
  d.aux = a1.x;
  d.rank = a1.y;
  d.sys2 = int(round(a1.w));
  if (owner >= 0) return d;
  bool screen = owner == PLAN_POOL_SCREEN;
  int at = d.j;
  d.sys = -1;
  int s = -1;
  for (int k = 0; k < GALAXY_SYS_MAX; k++) {
    vec4 rg = uPlanRange[k];
    float lo = screen ? rg.z : rg.x;
    float hi = screen ? rg.w : rg.y;
    if (float(at) >= lo && float(at) < hi) {
      s = k;
      break;
    }
  }
  if (s < 0) return d;
  int l = at - int(round(screen ? uPlanRange[s].z : uPlanRange[s].x));
  int prev = 0;
  for (int r = 0; r < PLAN_RUN_COUNT; r++) {
    if (PLAN_RUN_SCREEN[r] != screen) continue;
    int last = int(round(planTexel(s, PLAN_TABLE_AT + 4 * r + 3).w));
    if (l >= last) {
      prev = last;
      continue;
    }
    for (int k = 0; k < PLAN_BODY_MAX; k++) {
      int end = int(round(planTexel(s, PLAN_TABLE_AT + 4 * r + k / 4)[k - 4 * (k / 4)]));
      if (l < end) {
        d.sys = s;
        d.mark = PLAN_RUN_MARK[r];
        d.aux = float(PLAN_RUN_AUX[r]);
        d.ord = PLAN_RUN_BODY[r] ? k : -1;
        d.j = l - prev;
        d.n = end - prev;
        d.rank = planRunRank(s, r, k, d.j);
        return d;
      }
      prev = end;
    }
  }
  return d;
}

// A place on an orbit relative to what it goes round, at eccentric anomaly E (orbit.glsl orbitLocal from its E on).
vec3 planOrbitLocalE(vec4 t1, vec4 t2, float E, float t) {
  float a = t1.x;
  float e = t1.y;
  vec2 sE = moteSinCos(E);
  float px = a * (sE.y - e);
  float py = a * sqrt(1.0 - e * e) * sE.x;
  vec2 sw = moteSinCos(t2.y == 0.0 ? t2.x : t2.x + PLAN_TAU * orbitTurns(t, t2.y));
  float x = px * sw.y - py * sw.x;
  float z = px * sw.x + py * sw.y;
  vec2 sa = moteSinCos(t1.w);
  float u = x * sa.y + z * sa.x;
  float v = -x * sa.x + z * sa.y;
  vec2 st = moteSinCos(t1.z);
  float h = v * st.y;
  return vec3(u * sa.y - h * sa.x, v * st.x, u * sa.x + h * sa.y);
}

vec3 planHostWorld(int row, float t) {
  return bodyWorld(int(round(bodyTexel(3, row).x)), t);
}

float planE0(int row, float t) {
  vec4 t1 = bodyTexel(1, row);
  vec4 t2 = bodyTexel(2, row);
  return keplerE(PLAN_TAU * fract(t2.w + orbitTurns(t, t2.z)), t1.y);
}

vec3 planOrbitPoint(int row, float E, float push, float t) {
  vec3 local = planOrbitLocalE(bodyTexel(1, row), bodyTexel(2, row), E, t);
  float r = length(local);
  return planHostWorld(row, t) + turnVec(local * (r > 0.0 ? 1.0 + push / r : 1.0), t);
}

vec3 planNode(int row, int k, float t) {
  vec4 t2 = bodyTexel(2, row);
  return planHostWorld(row, t) + turnVec(orbitLocal(bodyTexel(1, row), t2, t + float(k) * t2.z * PLAN_ARC_NODE_STEP), t);
}

vec3 planNormal(int row, float t) {
  vec4 t1 = bodyTexel(1, row);
  vec4 t2 = bodyTexel(2, row);
  return normalize(turnVec(cross(planOrbitLocalE(t1, t2, 0.0, t), planOrbitLocalE(t1, t2, 1.5707963267948966, t)), t));
}

vec3 planRotate(vec3 v, vec3 n, float a) {
  vec2 sc = moteSinCos(a);
  return v * sc.y + cross(n, v) * sc.x + n * (dot(n, v) * (1.0 - sc.y));
}

vec3 planActual(int row, int sys) {
  return bodyCentre(row, bodyDerp(row, sys), uAmbient);
}

float planDeparture(int row, int sys) {
  float off = length(planActual(row, sys) - bodyWorld(row, uAmbient));
  return smoothstep(PLAN_DEPARTURE.x, PLAN_DEPARTURE.y, off / PLAN_BAND_HALF_WIDTH);
}

float planLit(int row) {
  vec3 l = bodyLight(row);
  return max(l.y, l.z);
}

// Where a world point stands on screen (CSS px from the top left) through the plan's camera: (x, y,
// view depth, distance).
vec4 planProject(vec3 p) {
  vec4 v = uPlanView * vec4(p, 1.0);
  vec4 c = uPlanProj * v;
  vec2 css = uViewport / uPixelRatio;
  return vec4((c.x / c.w + 1.0) * 0.5 * css.x, (1.0 - c.y / c.w) * 0.5 * css.y, -v.z, length(v.xyz));
}

float planFocal() {
  return 0.5 * (uViewport.y / uPixelRatio) * uPlanProj[1][1];
}

// A run of n dots along a curve lenPx CSS px long at its pitch (plan.ts planRun): (u, light, share).
vec3 planRun(int j, int n, float lenPx, float pitch) {
  if (n < 1) return vec3(0.0, 0.0, 1.0);
  float want = lenPx / pitch;
  float fj = float(j);
  if (!(want > float(n))) {
    float nf = max(want, 1e-6);
    float k = floor(nf);
    float light = fj < k ? 1.0 : fj == k ? nf - k : 0.0;
    return vec3(fj / nf, light, 1.0);
  }
  float pitchUsed = min(lenPx / float(n), pitch * PLAN_STRETCH);
  float share = float(n) * pitchUsed / lenPx;
  float u = fj / float(n) * share;
  float end = min(u, share - u);
  return vec3(u, 1.0 - (1.0 - smoothstep(0.0, 0.15 * share, end)) * (1.0 - share), share);
}

float planDash(float a, float phase) {
  float x = fract(a / PLAN_ARC_DASH_PERIOD + phase);
  float on = PLAN_ARC_DASH.x / PLAN_ARC_DASH.y;
  return 1.0 - smoothstep(on - 0.02, on, x) * (1.0 - smoothstep(0.98, 1.0, x));
}

int planElement(int mark, float aux, int ord, int planets) {
  if (mark == PLAN_MARK_RING) return ord == planets - 1 ? LOD_PLAN_RING_OUTER : LOD_PLAN_RING_INNER;
  if (mark == PLAN_MARK_BAND_EDGE) return LOD_PLAN_BAND;
  if (mark == PLAN_MARK_CHEVRON) return aux > 0.5 ? LOD_PLAN_ARC : LOD_PLAN_CHEVRON;
  if (mark == PLAN_MARK_STALK) return LOD_PLAN_STALK;
  if (mark == PLAN_MARK_OUTLINE_EQ || mark == PLAN_MARK_OUTLINE_MER) return LOD_PLAN_WIRE;
  if (mark == PLAN_MARK_GRADUATION) return LOD_PLAN_GRAD;
  if (mark == PLAN_MARK_CENTRE) return LOD_PLAN_CENTRE;
  if (mark == PLAN_MARK_DIMENSION) return LOD_PLAN_DIM;
  if (mark == PLAN_MARK_SILHOUETTE) return ord >= planets ? LOD_PLAN_WIRE : LOD_PLAN_OUTLINE;
  if (mark == PLAN_MARK_NUMERAL) return LOD_PLAN_NUM;
  if (mark == PLAN_MARK_BINARY_CROSS || mark == PLAN_MARK_BINARY_CIRCLE || mark == PLAN_MARK_BINARY_ELLIPSE) return LOD_PLAN_RING_OUTER;
  return LOD_PLAN_ARC;
}

bool planIsPair(int mark) {
  return mark >= PLAN_MARK_BINARY_CROSS && mark <= PLAN_MARK_BINARY_LIMIT;
}

int planPairSys(PlanAttrs d) {
  if (d.ord == 1) return d.sys2;
  if (d.ord == 0) return d.sys;
  return uPlanSys[d.sys2].x > uPlanSys[d.sys].x ? d.sys2 : d.sys;
}

int planStarOf(int s) {
  return int(round(planTexel(s, 4).w));
}

int planMarkRow(PlanAttrs d, int s) {
  if (d.mark == PLAN_MARK_DIMENSION || d.mark == PLAN_MARK_NUMERAL) return int(round(planTexel(s, 5).x));
  if (d.ord >= 0 && !planIsPair(d.mark)) return planBodyRow(s, d.ord);
  return planStarOf(s);
}

// The system whose frame values a dot reads (a pair's barycentre's: the larger of its two).
int planSysOf(PlanAttrs d) {
  return planIsPair(d.mark) ? planPairSys(d) : d.sys;
}

float planWin(int el, vec4 sv) {
  return planWindow(el, sv.x, sv.y, uLodForce[el]);
}

// Whether a dot is certainly hidden before its marks are placed (plan.ts planSkips; the early-out).
bool planSkips(PlanAttrs d) {
  if (d.sys < 0) return true;
  int s = planSysOf(d);
  vec4 sv = uPlanSys[s];
  vec4 T4 = planTexel(s, 4);
  int el = planElement(d.mark, d.aux, d.ord, int(round(T4.y)));
  if (planSkip(el, sv.x, sv.y, sv.z, sv.w, uLodForce[el])) return true;
  int star = int(round(T4.w));
  int other = planIsPair(d.mark) && d.ord < 0 ? planStarOf(d.sys == s ? d.sys2 : d.sys) : star;
  if (!(max(bodyPresence(star), bodyPresence(other)) > 0.0)) return true;
  return !(max(lampGain(planMarkRow(d, s)), other == star ? 0.0 : lampGain(other)) > 0.0);
}

// The departure arc of `row` (H's, settling on R's band edge as pe rises), at u along it.
vec3 planDeviationAt(vec3 host, vec3 dirA, vec3 n, float r0, float span, float grow, float a0, float u) {
  return host + planRotate(dirA, n, a0 + span * u) * (r0 + grow * u);
}

// A world mark's place, alpha before its common factors, size and ember share (plan.ts planDot's
// switch, the world marks); false where the mark is not a world mark.
bool planWorldMark(PlanAttrs d, int s, int row, int star, int planets, float ppu, vec3 starW, float lit, inout vec3 pos, inout float alpha, inout float size, inout float ember) {
  vec4 sv = uPlanSys[s];
  float t = uAmbient;
  if (d.mark == PLAN_MARK_RING) {
    float E0 = planE0(row, t);
    vec3 r = planRun(d.j, d.n, PLAN_TAU * bodyTexel(1, row).x * ppu, PLAN_LOOK_RING.z);
    pos = planOrbitPoint(row, E0 + PLAN_TAU * (r.x - 0.5 * r.z), 0.0, t);
    alpha = PLAN_LOOK_RING.x * planRank(1.0 - planWin(LOD_PLAN_CLOSE, sv), d.rank) * r.y;
    size = PLAN_LOOK_RING.y;
    return true;
  }
  if (d.mark == PLAN_MARK_ARC) {
    float E0 = planE0(row, t);
    float close = planWin(LOD_PLAN_CLOSE, sv);
    float peel = planWin(LOD_PLAN_BAND, sv);
    float span = PLAN_ARC_SPAN + (PLAN_TAU - PLAN_ARC_SPAN) * close;
    vec3 r = planRun(d.j, d.n, span * bodyTexel(1, row).x * ppu, mix(PLAN_LOOK_ARC.z, PLAN_LOOK_BAND_FILL.z, peel));
    float phi = span * r.x;
    pos = planOrbitPoint(row, E0 + phi, 0.0, t);
    float on = planDash(phi, hash01(uint(row), SALT_PLAN_DASH));
    alpha = mix(PLAN_LOOK_ARC.x, PLAN_LOOK_BAND_FILL.x, peel) * mix(planRank(close, d.rank), 1.0, on) * r.y;
    size = mix(PLAN_LOOK_ARC.y, PLAN_LOOK_BAND_FILL.y, peel);
    ember = lit;
    return true;
  }
  if (d.mark == PLAN_MARK_BAND_EDGE) {
    float E0 = planE0(row, t);
    float peel = planWin(LOD_PLAN_BAND, sv);
    float hw = PLAN_BAND_HALF_WIDTH * peel * (d.aux > 0.5 ? 1.0 : -1.0);
    vec3 r = planRun(d.j, d.n, PLAN_TAU * (bodyTexel(1, row).x + hw) * ppu, PLAN_LOOK_BAND_EDGE.z);
    pos = planOrbitPoint(row, E0 + PLAN_TAU * (r.x - 0.5 * r.z), hw, t);
    alpha = PLAN_LOOK_BAND_EDGE.x * peel * r.y;
    size = PLAN_LOOK_BAND_EDGE.y;
    ember = lit;
    return true;
  }
  if (d.mark == PLAN_MARK_CHEVRON && d.aux < 0.5) {
    float E0 = planE0(row, t);
    float span = PLAN_ARC_SPAN + (PLAN_TAU - PLAN_ARC_SPAN) * planWin(LOD_PLAN_CLOSE, sv);
    vec3 tip = planOrbitPoint(row, E0 + span, 0.0, t);
    vec3 tangent = normalize(planOrbitPoint(row, E0 + span + 0.01, 0.0, t) - planOrbitPoint(row, E0 + span - 0.01, 0.0, t));
    int leg = d.j - 2 * (d.j / 2);
    vec3 r = planRun(d.j / 2, d.n / 2, PLAN_CHEVRON.x * ppu, PLAN_LOOK_CHEVRON.z);
    vec3 dir = -planRotate(tangent, planNormal(row, t), leg == 0 ? PLAN_CHEVRON.y : -PLAN_CHEVRON.y);
    pos = tip + dir * (PLAN_CHEVRON.x * r.x);
    alpha = PLAN_LOOK_CHEVRON.x * planRank(planWin(LOD_PLAN_LEAVE, sv), d.rank) * r.y;
    size = PLAN_LOOK_CHEVRON.y;
    ember = lit;
    return true;
  }
  if (d.mark == PLAN_MARK_DEVIATION || d.mark == PLAN_MARK_CHEVRON) {
    vec3 actual = planActual(row, s);
    vec3 host = planHostWorld(row, t);
    vec3 vA = actual - host;
    float rA = length(vA);
    float rEdge = length(bodyWorld(row, t) - host) + PLAN_BAND_HALF_WIDTH;
    float pe = planWin(LOD_PLAN_BAND, sv);
    float r0 = rA + (rEdge - rA) * pe;
    float span = PLAN_DEVIATION.x - (PLAN_DEVIATION.x - 2.0 * PLAN_EDGE.x) * pe;
    float grow = PLAN_DEVIATION.y * (1.0 - pe);
    float a0 = -PLAN_EDGE.x * pe;
    vec3 n = planNormal(row, t);
    vec3 dirA = rA > 0.0 ? vA / rA : vA;
    float dep = max(planDeparture(row, s), lit);
    if (d.mark == PLAN_MARK_CHEVRON) {
      vec3 tip = planDeviationAt(host, dirA, n, r0, span, grow, a0, 1.0);
      vec3 tangent = normalize(tip - planDeviationAt(host, dirA, n, r0, span, grow, a0, 0.98));
      int leg = d.j - 2 * (d.j / 2);
      vec3 r = planRun(d.j / 2, d.n / 2, PLAN_CHEVRON.x * ppu, PLAN_LOOK_CHEVRON.z);
      vec3 dir = -planRotate(tangent, n, leg == 0 ? PLAN_CHEVRON.y : -PLAN_CHEVRON.y);
      pos = tip + dir * (PLAN_CHEVRON.x * r.x);
      alpha = PLAN_LOOK_DEVIATION.x * 0.95 * dep * planRank(1.0 - pe, d.rank) * r.y;
      size = PLAN_LOOK_CHEVRON.y;
    } else {
      vec3 r = planRun(d.j, d.n, span * r0 * ppu, PLAN_LOOK_DEVIATION.z);
      pos = planDeviationAt(host, dirA, n, r0, span, grow, a0, r.x);
      alpha = PLAN_LOOK_DEVIATION.x * dep * mix(planRank(pe, d.rank), 1.0, planDash(span * r.x, 0.0)) * r.y;
      size = PLAN_LOOK_DEVIATION.y + (PLAN_EDGE.y - PLAN_LOOK_DEVIATION.y) * pe;
    }
    ember = lit;
    return true;
  }
  if (d.mark == PLAN_MARK_NODE) {
    int k = d.j - PLAN_ARC_NODES * (d.j / PLAN_ARC_NODES);
    int arm = min(d.j / PLAN_ARC_NODES, PLAN_NODE_DOTS - 1);
    float outW = planWin(LOD_PLAN_OUTLINE, sv);
    vec3 c = planNode(row, k, t);
    float reach = PLAN_NODE_ARM * (k == 0 ? 1.0 - outW : 1.0);
    vec3 dir = arm == 1 ? vec3(1.0, 0.0, 0.0) : arm == 2 ? vec3(-1.0, 0.0, 0.0) : arm == 3 ? vec3(0.0, 0.0, 1.0) : arm == 4 ? vec3(0.0, 0.0, -1.0) : vec3(0.0);
    pos = c + dir * reach;
    alpha = PLAN_LOOK_NODE.x * planRank(k == 0 ? 1.0 - outW : planWin(LOD_PLAN_LEAVE, sv), d.rank);
    size = PLAN_LOOK_NODE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_STALK) {
    float w = planWin(LOD_PLAN_STALK, sv);
    vec3 top = d.aux > 0.5 ? planActual(row, s) : bodyWorld(row, t);
    vec3 foot = vec3(top.x, starW.y, top.z);
    if (d.j < 4) {
      float sgn = d.j - 2 * (d.j / 2) == 0 ? 1.0 : -1.0;
      pos = foot + (d.j < 2 ? vec3(sgn * PLAN_STALK_FOOT, 0.0, 0.0) : vec3(0.0, 0.0, sgn * PLAN_STALK_FOOT));
      alpha = PLAN_LOOK_STALK.x * w;
    } else {
      vec3 lift = (top - foot) * w;
      vec3 r = planRun(d.j - 4, d.n - 4, length(lift) * ppu, PLAN_LOOK_STALK.z);
      pos = foot + lift * min(1.0, r.x);
      alpha = PLAN_LOOK_STALK.x * w * r.y;
    }
    if (d.aux > 0.5) alpha *= max(planDeparture(row, s), lit);
    size = PLAN_LOOK_STALK.y;
    ember = lit;
    return true;
  }
  if (d.mark == PLAN_MARK_OUTLINE_EQ || d.mark == PLAN_MARK_OUTLINE_MER) {
    float R = bodyTexel(3, row).y;
    vec3 c = bodyWorld(row, t);
    vec3 r = planRun(d.j, d.n, PLAN_TAU * R * ppu, PLAN_LOOK_WIRE.z);
    vec2 sc = moteSinCos(PLAN_TAU * r.x);
    if (d.mark == PLAN_MARK_OUTLINE_EQ) pos = c + vec3(R * sc.y, 0.0, R * sc.x);
    else {
      vec3 h = vec3(starW.x - c.x, 0.0, starW.z - c.z);
      vec3 dir = length(h) > 0.0 ? h / length(h) : vec3(1.0, 0.0, 0.0);
      pos = c + vec3(R * sc.y * dir.x, R * sc.x, R * sc.y * dir.z);
    }
    alpha = PLAN_LOOK_WIRE.x * r.y;
    size = PLAN_LOOK_WIRE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_GRADUATION) {
    float w = planWin(LOD_PLAN_GRAD, sv);
    int outerRow = planBodyRow(s, planets - 1);
    int per = PLAN_GRAD_DOTS.x + (PLAN_GRAD_MAJOR - 1) * PLAN_GRAD_DOTS.y;
    int group = d.j / per;
    int r = d.j - per * group;
    bool major = r < PLAN_GRAD_DOTS.x;
    int tick = major ? PLAN_GRAD_MAJOR * group : PLAN_GRAD_MAJOR * group + 1 + (r - PLAN_GRAD_DOTS.x) / PLAN_GRAD_DOTS.y;
    int m = major ? PLAN_GRAD_DOTS.x : PLAN_GRAD_DOTS.y;
    int k = major ? r : (r - PLAN_GRAD_DOTS.x) - PLAN_GRAD_DOTS.y * ((r - PLAN_GRAD_DOTS.x) / PLAN_GRAD_DOTS.y);
    float tickLen = (major ? PLAN_GRAD_LEN.x : PLAN_GRAD_LEN.y) * w;
    float push = PLAN_GRAD_OUT * w + (float(k) / float(m - 1) - 0.5) * tickLen;
    pos = planOrbitPoint(outerRow, PLAN_TAU * float(tick) / float(PLAN_GRAD_COUNT), push, t);
    alpha = PLAN_LOOK_GRADUATION.x * w;
    size = PLAN_LOOK_GRADUATION.y;
    return true;
  }
  if (d.mark == PLAN_MARK_CENTRE) {
    float w = planWin(LOD_PLAN_CENTRE, sv);
    float rad = PLAN_CENTRE_CIRCLE * w;
    vec3 r = planRun(d.j, d.n, PLAN_TAU * rad * ppu, PLAN_LOOK_CENTRE.z);
    vec2 sc = moteSinCos(PLAN_TAU * r.x);
    pos = starW + vec3(rad * sc.y, 0.0, rad * sc.x);
    alpha = PLAN_LOOK_CENTRE.x * w * r.y;
    size = PLAN_LOOK_CENTRE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_DIMENSION) {
    float lf = planWin(LOD_PLAN_DIM, sv);
    float late = smoothstep(0.85, 1.0, lf);
    vec3 end = d.aux > 0.5 ? planActual(row, s) : bodyWorld(row, t);
    vec3 v = end - starW;
    float rr = length(v);
    if (d.j < 6) {
      vec3 n = planNormal(row, t);
      vec3 a = planRotate(v, n, PLAN_DIM_TICK);
      vec3 b = planRotate(v, n, -PLAN_DIM_TICK);
      vec3 r = planRun(d.j, 6, length(a - b) * ppu, 3.0);
      pos = starW + mix(a, b, r.x);
      alpha = PLAN_LOOK_DIMENSION.x * late * r.y;
    } else if (d.j < 16) {
      vec3 r = planRun(d.j - 6, 10, PLAN_DIM_EXT * ppu, PLAN_LOOK_DIMENSION.z);
      pos = end + normalize(v) * (PLAN_DIM_EXT * r.x);
      alpha = PLAN_LOOK_DIMENSION.x * 0.7 * late * r.y;
    } else {
      vec3 r = planRun(d.j - 16, d.n - 16, rr * lf * ppu, PLAN_LOOK_DIMENSION.z);
      pos = starW + v * (lf * min(1.0, r.x));
      alpha = PLAN_LOOK_DIMENSION.x * r.y;
    }
    if (d.aux > 0.5) {
      alpha *= max(planDeparture(row, s), lit);
      ember = lit;
    }
    size = PLAN_LOOK_DIMENSION.y;
    return true;
  }
  if (d.mark == PLAN_MARK_BINARY_CROSS) {
    vec3 bary = planHostWorld(star, t);
    int bar = d.j / PLAN_BIN_CROSS_DOTS;
    float q = (float(d.j - PLAN_BIN_CROSS_DOTS * bar) / float(PLAN_BIN_CROSS_DOTS - 1) - 0.5) * PLAN_BIN_CROSS_LEN;
    pos = bary + (bar == 0 ? vec3(q, 0.0, 0.0) : vec3(0.0, 0.0, q));
    alpha = PLAN_LOOK_BINARY_CROSS.x;
    size = PLAN_LOOK_BINARY_CROSS.y;
    return true;
  }
  if (d.mark == PLAN_MARK_BINARY_CIRCLE) {
    vec3 bary = planHostWorld(star, t);
    vec2 sc = moteSinCos(PLAN_TAU * float(d.j) / float(PLAN_BIN_CIRCLE_DOTS));
    pos = bary + vec3(PLAN_BIN_CIRCLE * sc.y, 0.0, PLAN_BIN_CIRCLE * sc.x);
    alpha = PLAN_LOOK_BINARY_CIRCLE.x;
    size = PLAN_LOOK_BINARY_CIRCLE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_BINARY_ELLIPSE) {
    pos = planOrbitPoint(star, PLAN_TAU * float(d.j) / float(d.n), 0.0, t);
    alpha = PLAN_LOOK_BINARY_ELLIPSE.x;
    size = PLAN_LOOK_BINARY_ELLIPSE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_BINARY_LIMIT) {
    int k = 8 * (d.j / PLAN_BIN_LIMIT_DASH) + (d.j - PLAN_BIN_LIMIT_DASH * (d.j / PLAN_BIN_LIMIT_DASH));
    vec2 sc = moteSinCos(PLAN_TAU * float(k) / float(PLAN_BIN_LIMIT_DOTS));
    pos = starW + vec3(d.aux * sc.y, 0.0, d.aux * sc.x);
    alpha = PLAN_LOOK_BINARY_LIMIT.x;
    size = PLAN_LOOK_BINARY_LIMIT.y;
    return true;
  }
  return false;
}
