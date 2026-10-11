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

// The black hole's shadow (src/scene/hole/shadow.ts): its centre in device px from the bottom left,
// and its radius (0: none). Shared by every galaxy material.
uniform vec3 uShadow;

void main() {
  // The shadow stays black (re-skin §4.2): nothing of the galaxy lights a pixel inside it.
  if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;
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
