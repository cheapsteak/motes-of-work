precision highp float;

in float vBrightness;

out vec4 outColor;

const vec3 DIALOGUE = vec3(0.9019608, 0.8666667, 1.0); // #E6DDFF

void main() {
  outColor = vec4(DIALOGUE * vBrightness, 0.25);
}
