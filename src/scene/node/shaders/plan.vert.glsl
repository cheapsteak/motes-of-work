precision highp float;
precision highp int;

// #include the galaxy library + plan.glsl + planScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The plan's world marks (bodySystem.ts: net-plan; re-skin §4.7, Task 7b), one quad per dot, drawn by
// galaxyMote.frag.glsl as a hard point in the plan's colour: the rings, arcs, nodes, chevrons and
// departures of H, and the bands, stalks, wireframes, graduations, centre circle and dimensions of R,
// and a binary pair's marks. planDot (planScreen.glsl, its twin plan.ts) places and lights it; a dot
// whose early-out holds (planSkips: its window, cull or real share 0, its pool dot unused, its star not up,
// its lamp dark) skips it, and a dot under LOD_VISIBLE is not drawn.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aPlan0; // owner (a pair's dot: a system; a pool's dot: -1, the world pool), mark, body ordinal, index in its run
in vec4 aPlan1; // variant, rank, run, a pair's second system

out vec2 vUv;
flat out float vType;
flat out float vForm;
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint;
flat out vec3 vBase;

void main() {
  PlanAttrs d = planResolve(aPlan0, aPlan1);
  if (planSkips(d)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  PlanDot p = planDotOf(d, PLAN_MARKS_WORLD);
  if (p.alpha < LOD_VISIBLE) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 clip = uPlanProj * uPlanView * vec4(p.pos, 1.0);
  float px = p.sizeCss * uPixelRatio;
  clip.xy += aCorner * px / uViewport * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0;
  vForm = float(FORM_POINT);
  vBrightness = p.alpha;
  vRadiusPx = 0.5 * px;
  vHi = 0.0;
  vTint = vec4(0.0);
  vBase = p.rgb;
}
