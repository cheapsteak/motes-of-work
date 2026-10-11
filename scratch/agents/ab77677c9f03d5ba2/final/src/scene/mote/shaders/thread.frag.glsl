precision highp float;

in float vBrightness;

out vec4 outColor; // premultiplied: the material screen-blends (moteSystem.ts)

const vec3 DIALOGUE = vec3(0.7686275, 0.6901961, 1.0); // #C4B0FF
const float ALPHA = 0.4;

void main() {
  outColor = vec4(DIALOGUE * vBrightness * ALPHA, ALPHA);
}
