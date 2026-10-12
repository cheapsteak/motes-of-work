// The plan's screen-space marks (re-skin §4.7, Task 7b; net-plan-screen), the way net-spikes is
// drawn: each planned planet's and moon's silhouette circle, and the dimensions' values in 5x7
// dot-matrix numerals, placed in CSS px; and planDot(), every plan dot as plan.ts planDot has it,
// world marks (plan.glsl) and screen marks alike, with the factors every mark shares. Its twin is
// plan.ts. Spliced after plan.glsl by withPlanLibrary() (shaderSource.ts).

// A screen mark's place (its anchor `pos`, its centre on screen `px`), alpha before the common factors,
// size and ember share; false where the mark is not a screen mark.
bool planScreenMark(PlanAttrs d, PlanCtx c, inout vec3 pos, inout vec2 px, inout float alpha, inout float size, inout float ember) {
  vec4 sv = c.sv;
  int row = c.row;
  int planets = c.planets;
  vec3 starW = c.starW;
  float lit = c.lit;
  if (d.mark == PLAN_MARK_SILHOUETTE) {
    vec4 at = planProject(c.planned);
    pos = c.planned;
    if (!(at.z > 0.0)) {
      alpha = 0.0;
      return true;
    }
    float R = bodyTexel(3, row).y;
    float ppuBody = planFocal() / at.z;
    float full0 = R * ppuBody + PLAN_OUTLINE_PAD_PX;
    bool moon = d.ord >= planets;
    float w = moon ? planWin(LOD_PLAN_WIRE, sv) * smoothstep(PLAN_MOON_PX.x, PLAN_MOON_PX.y, 2.0 * R * ppuBody) : planWin(LOD_PLAN_OUTLINE, sv);
    float rpx = moon ? full0 : full0 * w;
    vec3 r = planRun(d.j, d.n, max(6.0 * PLAN_LOOK_OUTLINE.z, PLAN_TAU * rpx), PLAN_LOOK_OUTLINE.z);
    vec2 sc = moteSinCos(PLAN_TAU * (r.x + hash01(uint(row), SALT_PLAN_OUTLINE)));
    px = at.xy + rpx * vec2(sc.y, sc.x);
    alpha = PLAN_LOOK_OUTLINE.x * w * r.y;
    size = PLAN_LOOK_OUTLINE.y;
    return true;
  }
  if (d.mark == PLAN_MARK_NUMERAL) {
    vec3 end = d.aux > 0.5 ? c.actual : c.planned;
    float value = length(end - starW);
    // The value to one decimal (plan.ts planNumeral): its whole part's digits, the point, its tenth.
    float tenths = floor(max(0.0, value) * 10.0 + 0.5);
    float whole = floor(tenths / 10.0);
    int dec = int(tenths - whole * 10.0);
    int w = int(whole);
    int digits = w >= 100 ? 3 : w >= 10 ? 2 : 1;
    int count = digits + 2;
    int g = d.j / PLAN_GLYPH_CELLS;
    int cell = d.j - PLAN_GLYPH_CELLS * g;
    int gr = cell / 5;
    int gc = cell - 5 * gr;
    int glyph = -1;
    if (g < digits) {
      int p = digits - 1 - g;
      int div = p == 2 ? 100 : p == 1 ? 10 : 1;
      int x = w / div;
      glyph = x - 10 * (x / 10);
    } else if (g == digits) glyph = PLAN_GLYPH_POINT;
    else if (g == digits + 1) glyph = dec;
    float bit = glyph >= 0 ? float((PLAN_FONT[glyph * 7 + gr] >> uint(4 - gc)) & 1u) : 0.0;
    float along = d.aux > 0.5 ? 1.0 + PLAN_DIM_PAST / max(value, 1e-3) : PLAN_DIM_ALONG;
    vec3 mid = starW + (end - starW) * along;
    vec4 m = planProject(mid);
    vec4 c0 = planProject(starW);
    vec4 e0 = planProject(end);
    pos = mid;
    if (!(m.z > 0.0 && c0.z > 0.0 && e0.z > 0.0)) {
      alpha = 0.0;
      return true;
    }
    float dx = e0.x - c0.x;
    float dy = e0.y - c0.y;
    float l = max(sqrt(dx * dx + dy * dy), 1e-6);
    float side = d.aux > 0.5 ? 0.0 : 1.0;
    float pitch = PLAN_NUMERAL_PITCH;
    float wPx = 6.0 * pitch * float(count);
    float width = uViewport.x / uPixelRatio;
    float x0 = clamp(m.x + side * -dy * PLAN_DIM_OFFSET_PX / l - wPx / 2.0, PLAN_DIM_MARGIN, width - PLAN_DIM_MARGIN - wPx);
    float y0 = m.y + side * dx * PLAN_DIM_OFFSET_PX / l - 3.5 * pitch;
    size = pitch * PLAN_NUMERAL_SIZE;
    px = vec2(x0 + float(6 * g + gc) * pitch, y0 + float(gr) * pitch);
    alpha = PLAN_LOOK_NUMERAL.x * bit;
    if (d.aux > 0.5) {
      alpha *= max(c.dep, lit);
      ember = lit;
    }
    return true;
  }
  return false;
}

// Every plan dot (plan.ts planDot): its mark, then its star up, its body's lamp, the galaxy shown, the
// freeze frame's dressing, nothing inside the star's glow sprite nor near the camera; its colour
// phosphor to ember by its body's light, toward the freeze frame's tint. `marks` says which marks the
// shader draws: PLAN_MARKS_WORLD (plan.vert.glsl), PLAN_MARKS_SCREEN (planScreen.vert.glsl) or both (the
// parity page); a literal there, so a vertex shader holds only its own marks' code.
const int PLAN_MARKS_WORLD = 1;
const int PLAN_MARKS_SCREEN = 2;
PlanDot planDotOf(PlanAttrs d, int marks) {
  if (planSkips(d)) return planHidden();
  bool pair = planIsPair(d.mark);
  PlanCtx c;
  c.s = planSysOf(d);
  c.sv = uPlanSys[c.s];
  vec4 T4 = planTexel(c.s, 4);
  c.planets = int(round(T4.y));
  c.star = int(round(T4.w));
  c.ppu = c.sv.x / T4.x;
  int el = planElement(d.mark, d.aux, d.ord, c.planets);
  float gain = planGain(el, c.sv.x, d.rank, c.sv.y, c.sv.z, c.sv.w, uLodForce[el]);
  c.row = planMarkRow(d, c.s);
  if (c.row < 0) return planHidden();
  float t = uAmbient;
  c.starW = bodyWorld(c.star, t);
  c.lit = d.mark == PLAN_MARK_GRADUATION || d.mark == PLAN_MARK_CENTRE || pair ? 0.0 : planLit(c.row);
  // Each place once a dot (PlanCtx): the body's planned and actual places, the orbit its mark is on.
  c.planned = pair ? c.starW : bodyWorld(c.row, t);
  bool actual = d.mark == PLAN_MARK_DEVIATION || (d.mark == PLAN_MARK_CHEVRON && d.aux > 0.5) ||
    ((d.mark == PLAN_MARK_STALK || d.mark == PLAN_MARK_DIMENSION || d.mark == PLAN_MARK_NUMERAL) && d.aux > 0.5);
  c.actual = actual ? planActual(c.row, c.s) : c.planned;
  c.dep = actual ? planDeparture(c.actual, c.planned) : 0.0;
  c.orbitRow = d.mark == PLAN_MARK_GRADUATION ? planBodyRow(c.s, c.planets - 1) : pair && d.mark != PLAN_MARK_BINARY_LIMIT ? c.star : c.row;
  c.host = planHostWorld(c.orbitRow, t);
  c.E0 = planE0(c.row, t);
  c.normal = planNormal(c.row, t);
  PlanDot o = planHidden();
  o.pos = c.starW;
  bool screen = false;
  float ember = 0.0;
  bool drawn = false;
  if ((marks & PLAN_MARKS_WORLD) != 0) drawn = planWorldMark(d, c, o.pos, o.alpha, o.sizeCss, ember);
  if (!drawn && (marks & PLAN_MARKS_SCREEN) != 0) {
    screen = planScreenMark(d, c, o.pos, o.px, o.alpha, o.sizeCss, ember);
    drawn = screen;
  }
  if (!drawn) return planHidden();
  FreezeLook look = freezeLook(c.row, 1.0 - bodyLight(c.row).x);
  int other = pair && d.ord < 0 ? planStarOf(d.sys == c.s ? d.sys2 : d.sys) : c.star;
  float presence = max(bodyPresence(c.star), bodyPresence(other));
  float lamp = max(lampGain(c.row), other == c.star ? 0.0 : lampGain(other));
  vec4 q = planProject(o.pos);
  if (!screen) o.px = q.xy;
  vec4 sc = planProject(c.starW);
  float glowR = sc.z > 0.0 ? 0.5 * glowPx(bodyTexel(3, c.star).y, sc.w, planFocal(), HOOD_GLOW_CAP) : 0.0;
  float away = length(o.px - sc.xy);
  float clear = smoothstep(glowR, glowR + PLAN_GLOW_EDGE_PX, away) * smoothstep(PLAN_CULL_NEAR.x, PLAN_CULL_NEAR.y, q.z);
  o.alpha *= gain * planRank(presence, d.rank) * lamp * uShow * look.gain * clear * streamBandMask(o.px.y - 0.5 * o.sizeCss, uViewport.y / uPixelRatio);
  o.rgb = mix(mix(PLAN_PHOSPHOR, NODE_EMBER, ember), look.tint.rgb, look.tint.a);
  return o;
}

// Every plan dot, world marks and screen marks alike (the parity page).
PlanDot planDot(PlanAttrs d) {
  return planDotOf(d, PLAN_MARKS_WORLD | PLAN_MARKS_SCREEN);
}
