precision highp float;

in vec2 vUv;
flat in float vRadiusPx;

uniform float uRingAlpha; // RING_ALPHA x presence x net.show
uniform float uPixelRatio;

out vec4 outColor; // additive (bodySystem.ts)

// Cool white: the ghost's pencil family, neither the person's warmth nor the builders' blue.
const vec3 RING = vec3(0.8627451, 0.9019608, 1.0); // #DCE6FF
const float INNER = 0.8; // of the outer radius
const float EDGE_PX = 2.0; // soft edges, CSS px

void main() {
  float r = length(vUv);
  float soft = EDGE_PX * uPixelRatio / max(vRadiusPx, 1.0);
  float a = smoothstep(INNER - soft, INNER, r) * (1.0 - smoothstep(1.0 - soft, 1.0, r));
  if (a <= 0.0) discard;
  outColor = vec4(RING, uRingAlpha * a);
}
