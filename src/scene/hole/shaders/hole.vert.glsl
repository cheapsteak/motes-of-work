precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + hole.glsl (spliced in by src/scene/node/shaderSource.ts)
// The black hole (holeSystem.ts; re-skin §4.2): one quad per dot, every part's dots from hole.glsl
// (the TS twin is hole.ts) through the view the CPU computes each frame (holeFrame.ts: the camera in
// the hole's frame, the frame's rotation into view space, the hole's centre in view space). uPart says
// which part a draw is: the disk 0, the arch 1 (the disk's first dots again, through the lens's image
// 1), the ring 2, the jets 3, the knots 4, the in-fall 5 and a strand 6 (which one by its dots' own
// attribute). A dot is HOLE_DOT's hard disc, its alpha its part's compensation (holeComp) times its own
// after the clamp, and its size × the compensation's size; drawn by hole.frag.glsl, additively.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aHoleA;
in vec4 aHoleB;
in vec4 aHoleC; // the disk's (and the arch's) third vec4; unbound (0, 0, 0, 1) for the other parts

uniform mat4 projectionMatrix;
uniform int uPart;
uniform float uAmbient;
uniform vec3 uHoleCam;
uniform mat3 uHoleViewRot;
uniform vec3 uHoleHv;
uniform float uGain; // the hole's gain times the part's story gain, before the per-dot clamp (holeFrame.ts holeStory)
uniform vec2 uComp; // the part's compensation (holeComp): its gain, after the clamp, and its size
uniform vec2 uFronts; // the knots' fronts (ember, clean)
uniform vec2 uStrand; // a strand's window head and heat
uniform vec2 uViewport; // device px
uniform float uPixelRatio;

out vec2 vUv;
flat out vec3 vRgb;
flat out float vAlpha;
flat out float vRadiusPx;

// Off the clip volume: a quad that draws nothing (the galaxy's MOTE_HIDDEN, instance.glsl).
const vec4 HOLE_HIDDEN = vec4(2.0, 2.0, 2.0, 1.0);

void main() {
  HoleView v = HoleView(uAmbient, uHoleCam, uHoleViewRot, uHoleHv, uGain);
  HoleDot d;
  float ember = 0.0;
  if (uPart <= 1) d = diskDot(aHoleA, aHoleB, aHoleC, v, float(uPart));
  else if (uPart == 2) d = ringDot(aHoleA, aHoleB, v);
  else if (uPart == 3) d = jetDot(aHoleA, aHoleB, v);
  else if (uPart == 4) d = knotDot(aHoleA, aHoleB, v, uFronts, ember);
  else if (uPart == 5) d = infallDot(aHoleA, aHoleB, v);
  else d = strandDot(aHoleA, aHoleB, v, uStrand);
  float alpha = min(1.0, d.alpha * uComp.x);
  float depth = -d.view.z;
  if (!(alpha > 0.0) || !(depth > 0.0)) {
    gl_Position = HOLE_HIDDEN;
    return;
  }
  float px = holeDotPx(d.sizeCss * uComp.y, depth, uPixelRatio);
  vec4 clip = projectionMatrix * vec4(d.view, 1.0);
  clip.xy += aCorner * (px / uViewport) * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vRgb = d.rgb;
  vAlpha = alpha;
  vRadiusPx = 0.5 * px;
}
