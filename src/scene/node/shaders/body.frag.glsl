precision highp float;

// The galaxy's bodies (body.vert.glsl): a faint fill and a rim, rim (1 - |n.v|)^rimPow over the
// fill (galaxy §1.3), in the agents' blue, tinted toward the person's amber once fixed and mixed
// toward ember while lit, then toward the freeze frame's colour (vTint: a copy's, the grey, the flash's
// white), premultiplied for the screen blend. The constants are bodyAttrs.ts
// BODY_LOOK's and NODE_PALETTE's (bodySystem.test.ts holds the copies to them).

in vec3 vNormal;
in vec3 vToEye;
flat in float vFill;
flat in float vGain;
flat in float vHi;
flat in float vWarm;
flat in vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a): its copies, grey and flash

out vec4 outColor;

// The black hole's shadow (src/scene/hole/shadow.ts): its centre in device px from the bottom left,
// and its radius (0: none). Shared by every galaxy material.
uniform vec3 uShadow;

const vec3 AGENT = vec3(0.3019608, 0.6392157, 1.0); // #4DA3FF
const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
const vec3 EMBER = vec3(1.0, 0.4196078, 0.3411765); // #FF6B57
const float EMBER_MIX = 0.8;
const float RIM = 0.55;
const float RIM_POW = 2.6;

void main() {
  // The shadow stays black (re-skin §4.2): nothing of the galaxy lights a pixel inside it.
  if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;
  float f = 1.0 - abs(dot(normalize(vNormal), normalize(vToEye)));
  float a = min(1.0, (vFill + RIM * pow(f, RIM_POW)) * vGain);
  vec3 colour = mix(mix(AGENT, HUMAN, vWarm), EMBER, EMBER_MIX * vHi);
  if (vTint.a > 0.0) colour = mix(colour, vTint.rgb, vTint.a);
  outColor = vec4(colour * a, a);
}
