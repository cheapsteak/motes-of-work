precision highp float;

in float vAlpha;

out vec4 outColor;

void main() {
  outColor = vec4(1.0, 1.0, 1.0, vAlpha);
}
