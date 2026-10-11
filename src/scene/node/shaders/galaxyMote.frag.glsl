precision highp float;

// The galaxy's dots (bodySystem.ts: every quad set but the ring): mote.frag.glsl's two galaxy forms,
// the point and the glow, over each body's own base colour (vBase: a star's tint, the agents' blue
// for the rest) where the machine's motes use the agents' blue. Act I's motes keep mote.frag.glsl.

in vec2 vUv;
flat in float vType; // 1 the body's base colour, toward 0 the person's amber
flat in float vForm; // 1 point; 3 glow, plus how far it is lit (its core filled to a crisp disc)
in float vBrightness;
flat in float vRadiusPx;
in float vHi; // the highlight: how far toward ember
flat in vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a): its copies, grey and flash
flat in vec3 vBase; // the body's base colour (the bodies texture's T6)

out vec4 outColor; // premultiplied: the material screen-blends (bodySystem.ts)

// The black hole's shadow (src/scene/hole/shadow.ts): its centre in device px from the bottom left,
// and its radius (0: none). Shared by every galaxy material.
uniform vec3 uShadow;

const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
// The highlight (Act II): what carries the defect, the camera's x-ray, nobody's colour. A lit dot's
// colour is mixed this far toward it at full highlight.
const vec3 EMBER = vec3(1.0, 0.4196078, 0.3411765); // #FF6B57
const float EMBER_MIX = 0.8;
// A lit glow's crisp core, as a share of its sprite's radius (bodyAttrs.ts BODY_LOOK.litCore).
const float LIT_CORE = 0.75;

void main() {
  // The shadow stays black (re-skin §4.2): nothing of the galaxy lights a pixel inside it.
  if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;
  float r = length(vUv);
  if (r > 1.0) discard;
  // The person's amber at 0, the body's base colour at 1 (the galaxy's fixed shells mix the two).
  vec3 color = mix(HUMAN, vBase, clamp(vType, 0.0, 1.0));
  if (vHi > 0.0) color = mix(color, EMBER, EMBER_MIX * vHi);
  if (vTint.a > 0.0) color = mix(color, vTint.rgb, vTint.a);
  float alpha;
  if (vForm < 2.0) {
    // Point: hard disc with a 1px edge.
    alpha = 1.0 - smoothstep(1.0 - 1.0 / max(vRadiusPx, 1.0), 1.0, r);
  } else {
    // Glow (a star's or core body's sprite, galaxy §4): a crisp core and a tight halo, zero at the
    // sprite's edge, so its reach is exactly half the sprite. Lit (vForm 3 + lit), its core fills out
    // to a crisp disc of LIT_CORE of the sprite: a lit star is an ember disc with its glow (galaxy §14.4).
    alpha = (1.0 - smoothstep(0.0, 0.35, r)) + 0.45 * (1.0 - r) * (1.0 - r);
    float lit = clamp(vForm - 3.0, 0.0, 1.0);
    if (lit > 0.0) alpha = max(alpha, lit * (1.0 - smoothstep(LIT_CORE - 1.0 / max(vRadiusPx, 1.0), LIT_CORE, r)));
  }
  alpha = min(alpha, 1.0);
  outColor = vec4(color * vBrightness * alpha, alpha);
}
