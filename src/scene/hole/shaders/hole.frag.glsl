precision highp float;

// The black hole's dots (hole.vert.glsl): a hard disc with a soft edge, 1 − smoothstep(r − edge.x,
// r + edge.y, d) in device px (HOLE_DOT.edge, the inspector's FRAG), premultiplied, drawn additively
// (One, One). Nothing is drawn inside the shadow's disc on screen.

in vec2 vUv;
flat in vec3 vRgb;
flat in float vAlpha;
flat in float vRadiusPx;

out vec4 outColor;

// The black hole's shadow (src/scene/hole/shadow.ts): its centre in device px from the bottom left,
// and its radius (0: none). Shared by every galaxy material.
uniform vec3 uShadow;

// #include HOLE dot (generated from src/scene/hole/holeLook.ts by holeSystem.ts)

void main() {
  // The shadow stays black (re-skin §4.2): the hole's own dots pile onto its rim, and none lights inside it.
  if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;
  float d = length(vUv) * vRadiusPx;
  float a = vAlpha * (1.0 - smoothstep(vRadiusPx - HOLE_DOT_EDGE.x, vRadiusPx + HOLE_DOT_EDGE.y, d));
  outColor = vec4(vRgb * a, a);
}
