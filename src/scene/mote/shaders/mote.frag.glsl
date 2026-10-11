precision highp float;

// Act I's motes (moteSystem.ts): the halo, the point and the twin. The galaxy's dots draw with their
// own fragment shader (src/scene/node/shaders/galaxyMote.frag.glsl: the point, the glow, the highlight
// and the freeze frame's tint).

in vec2 vUv;
flat in float vType; // MoteType: picks the colour
flat in float vForm; // 0 halo, 1 point, 2 twin (FORM_* in instance.glsl): picks the shape
in float vBrightness;
flat in float vRadiusPx;

out vec4 outColor; // premultiplied: the material screen-blends (moteSystem.ts)

const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
const vec3 AGENT = vec3(0.3019608, 0.6392157, 1.0); // #4DA3FF
const vec3 DIALOGUE = vec3(0.7686275, 0.6901961, 1.0); // #C4B0FF

void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  int form = int(round(vForm));
  // 0 HUMAN, 1 AGENT, 2 DIALOGUE.
  vec3 color = vType > 1.5 ? DIALOGUE : mix(HUMAN, AGENT, clamp(vType, 0.0, 1.0));
  float alpha;
  if (form == 0) {
    // Hero human: soft halo plus a bright core.
    alpha = 0.35 * exp(-5.0 * r * r) + (1.0 - smoothstep(0.12, 0.22, r));
  } else if (form == 1) {
    // Point: hard disc with a 1px edge.
    alpha = 1.0 - smoothstep(1.0 - 1.0 / max(vRadiusPx, 1.0), 1.0, r);
  } else {
    // Hero dialogue twin: small soft disc.
    alpha = 1.0 - smoothstep(0.3, 1.0, r);
  }
  alpha = min(alpha, 1.0);
  outColor = vec4(color * vBrightness * alpha, alpha);
}
