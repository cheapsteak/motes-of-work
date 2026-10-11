precision highp float;

// The background galaxy's points (star.vert.glsl), premultiplied for the screen blend, by profile:
// 0 a hard dot with a 1 px edge (dust); 1 a star sprite, the glow profile of galaxy §4 (a crisp core
// and a tight halo, zero at the edge; the same as mote.frag.glsl's glow, bodySystem.test.ts holds
// the two together); 2 the core's haze, a soft disc with no core.

in vec2 vUv;
in vec3 vColor;
flat in float vRadiusPx;

uniform int uProfile;

out vec4 outColor;

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float alpha;
  if (uProfile == 0) {
    alpha = 1.0 - smoothstep(1.0 - 1.0 / max(vRadiusPx, 1.0), 1.0, r);
  } else if (uProfile == 1) {
    alpha = (1.0 - smoothstep(0.0, 0.35, r)) + 0.45 * (1.0 - r) * (1.0 - r);
  } else {
    alpha = (1.0 - r) * (1.0 - r);
  }
  alpha = min(alpha, 1.0);
  outColor = vec4(vColor * alpha, alpha);
}
