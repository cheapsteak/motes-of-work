precision highp float;

in float vAlpha;

out vec4 outColor;

// A cool pencil line, so the ghost never reads as Dialogue motes or as a clipped core.
const vec3 GHOST = vec3(0.78, 0.84, 1.0);

void main() {
  outColor = vec4(GHOST, vAlpha); // additive, drawn after the motes (moteSystem.ts)
}
