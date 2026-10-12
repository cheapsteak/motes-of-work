precision highp float;
precision highp int;

// #include the galaxy library + plan.glsl + planScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The plan's screen marks (bodySystem.ts: net-plan-screen; re-skin §4.7, Task 7b), the way net-spikes
// is drawn: one quad per dot, placed in CSS px on screen at its anchor's depth, drawn by
// galaxyMote.frag.glsl as a hard point in the plan's colour: each planned planet's and moon's
// silhouette circle, and the dimensions' values in dot-matrix numerals (masked to the text band:
// streamBandMask). planDot (planScreen.glsl, its twin plan.ts) places and lights it.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aPlan0; // owner (-2, the screen pool), mark, body ordinal, index in its pool
in vec4 aPlan1; // variant, rank, run, -1

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
  PlanDot p = planDotOf(d, PLAN_MARKS_SCREEN);
  if (p.alpha < LOD_VISIBLE) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 clip = uPlanProj * uPlanView * vec4(p.pos, 1.0);
  // Its centre on the drawing buffer (device px from the bottom left), then its quad.
  vec2 pixel = vec2(p.px.x, uViewport.y / uPixelRatio - p.px.y) * uPixelRatio;
  clip.xy = (pixel / uViewport * 2.0 - 1.0) * clip.w;
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
