precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The reviewer's ring on the galaxy (bodySystem.ts: net-ring): one quad lying flat in the galaxy's
// plane round the planet it is visiting, riding it. Where it is, how big and how present are pure
// functions of net.review and the ambient on the CPU (src/galaxy/review.ts ringAt); it changes
// nothing it passes over. ring.frag.glsl draws the band, as on the stacks network. It is drawn never
// under RING_MIN_PX CSS px across its outer radius (review.ts ringDrawnRadius, its twin), so the
// shots that frame it with the hub, 170 to 210 off, still show a ring. The quad's corners wind
// clockwise seen from above, so the material draws both sides (bodySystem.ts): every Act II camera
// looks down on it.

in vec2 aCorner; // quad corner in [-1, 1]^2

uniform vec3 uRing; // its centre (the feed ends there too)
uniform float uRingRadius; // outer radius, world units

out vec2 vUv;
flat out float vRadiusPx; // outer radius, drawing-buffer px

void main() {
  float perUnit = pxPerUnit(toView(uRing)); // drawing-buffer px per world unit at the ring
  float radius = max(uRingRadius, RING_MIN_PX * uPixelRatio / perUnit);
  vec4 view = toView(uRing + radius * vec3(aCorner.x, 0.0, aCorner.y));
  gl_Position = projectionMatrix * view;
  vRadiusPx = radius * perUnit;
  vUv = aCorner;
}
