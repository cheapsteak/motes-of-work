precision highp float;

in vec2 vUv;
flat in float vType; // MoteType: picks the colour
flat in float vForm; // 0 halo, 1 point, 2 twin (FORM_* in instance.glsl): picks the shape
in float vBrightness;
flat in float vRadiusPx;

out vec4 outColor;

const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
const vec3 AGENT = vec3(0.3019608, 0.6392157, 1.0); // #4DA3FF
const vec3 DIALOGUE = vec3(0.9019608, 0.8666667, 1.0); // #E6DDFF

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  int type = int(round(vType));
  int form = int(round(vForm));
  vec3 color = type == 0 ? HUMAN : (type == 1 ? AGENT : DIALOGUE);
  float alpha;
  if (form == 0) {
    // Hero human: soft halo plus a bright core.
    alpha = 0.5 * exp(-4.0 * r * r) + (1.0 - smoothstep(0.12, 0.22, r));
  } else if (form == 1) {
    // Point: hard disc with a 1px edge.
    alpha = 1.0 - smoothstep(1.0 - 1.0 / max(vRadiusPx, 1.0), 1.0, r);
  } else {
    // Hero dialogue twin: small soft disc.
    alpha = 1.0 - smoothstep(0.3, 1.0, r);
  }
  outColor = vec4(color * vBrightness, min(alpha, 1.0));
}
