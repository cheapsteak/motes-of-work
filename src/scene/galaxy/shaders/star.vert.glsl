precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + leak.glsl + shell.glsl + star.glsl + terminator.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The background galaxy (galaxySystem.ts: galaxy-stars, galaxy-bright, galaxy-far-stars,
// galaxy-far-bright, galaxy-dust, galaxy-haze),
// one quad per point in the galaxy's own frame; the mesh's model matrix turns it with the galaxy
// and anchors it at N0, as bodyWorld places the bodies. Every point is
// clamp(uSizeWorld px per unit, uMinPx, uMaxPx) CSS px times the pixel ratio (galaxySystem.ts
// bgStarPx): a star a little larger nearer, the dust and the haze one size; the background never
// gets detail (galaxy §3.1). A point's brightness is negative when it is warm: its tint is mixed
// uWarmMix of the way from the agents' blue to WARM (galaxySystem.ts STAR_TINT; the haze takes it whole).
// The far sets (uHoodFar 1) are the neighbourhood's far form, the background stars pulled onto its
// spots (background.ts pullToHood): each fades out as its spot's real star comes in, by 1 - hoodReal of
// the plain glow at its own distance, the spot's (lod.glsl hoodFar), held off by a beat's uHoodHold.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aStar; // xyz in the galaxy's frame, brightness (negative: warm)

uniform float uSizeWorld;
uniform float uMinPx;
uniform float uMaxPx;
uniform float uGain;
// The freeze frame's dressing, times net.focus (galaxySystem.ts): the background is the rest of the
// frame, so it dims to FREEZE_DIM and greys toward FREEZE_GREY as the dressing comes in.
uniform float uFreezeDress;
// How far a warm point mixes toward WARM: STAR_TINT.warmMix for the star sets, 1 for the haze (galaxySystem.ts SETS).
uniform float uWarmMix;
// 1 for the far sets, 0 for the rest. (The beats' hold, uHoodHold, is the galaxy library's: bodyMote.glsl.)
uniform float uHoodFar;

out vec2 vUv;
out vec3 vColor;
flat out float vRadiusPx;

// #include STAR tint (generated from src/scene/galaxy/galaxySystem.ts)

void main() {
  vec4 view = toView(aStar.xyz);
  // A far star's share: its spot's far form's (the real star at the spot takes the rest).
  float far = 1.0;
  if (uHoodFar > 0.5) {
    far = hoodFar(length(view.xyz), 0.5 * uViewport.y * projectionMatrix[1][1] / uPixelRatio, uHoodHold);
    if (!(far > 0.0)) {
      gl_Position = MOTE_HIDDEN;
      return;
    }
  }
  float px = clamp(uSizeWorld * pxPerUnit(view) / uPixelRatio, uMinPx, uMaxPx) * uPixelRatio;
  vec4 clip = projectionMatrix * view;
  clip.xy += aCorner * (px / uViewport) * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vec3 tint = aStar.w < 0.0 ? mix(AGENT, WARM, uWarmMix) : AGENT;
  tint = mix(tint, FREEZE_GREY, FREEZE_GREY_MIX * uFreezeDress);
  vColor = tint * abs(aStar.w) * uGain * far * (1.0 - (1.0 - FREEZE_DIM) * uFreezeDress);
  vRadiusPx = 0.5 * px;
}
