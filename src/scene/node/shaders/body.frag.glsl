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
flat in float vDrop; // 1 on the focused piece (body.vert.glsl)

out vec4 outColor;

// The black hole's shadow (src/scene/hole/shadow.ts): its centre in device px from the bottom left,
// and its radius (0: none). Shared by every galaxy material.
uniform vec3 uShadow;

// #include DROPOUT constants (generated from src/scene/node/bodyAttrs.ts by shaderSource.ts)
// The defect's dropout (re-skin Task 8b; dropout.ts, bodyScreen.glsl): its dark lines (CSS px rows from
// the top), how many, the box they cut in, and the drawing buffer (device px) and its pixel ratio.
uniform vec2 uDrop[DROPOUT_MAX];
uniform float uDropN;
uniform vec4 uDropBox;
uniform vec2 uViewport;
uniform float uPixelRatio;

const vec3 AGENT = vec3(0.3019608, 0.6392157, 1.0); // #4DA3FF
const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
const vec3 EMBER = vec3(1.0, 0.4196078, 0.3411765); // #FF6B57
const float EMBER_MIX = 0.8;
const float RIM = 0.55;
const float RIM_POW = 2.6;

void main() {
  // The shadow stays black (re-skin §4.2): nothing of the galaxy lights a pixel inside it.
  if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;
  // The defect's dropout: the focused piece's rim and fill go dark in its lines, inside its box.
  if (vDrop > 0.5 && uDropN > 0.0) {
    vec2 css = vec2(gl_FragCoord.x, uViewport.y - gl_FragCoord.y) / uPixelRatio;
    if (css.x >= uDropBox.x && css.x <= uDropBox.z && css.y >= uDropBox.y && css.y <= uDropBox.w) {
      int n = int(round(uDropN));
      for (int j = 0; j < DROPOUT_MAX; j++) {
        if (j >= n) break;
        if (css.y >= uDrop[j].x && css.y < uDrop[j].y) discard;
      }
    }
  }
  float f = 1.0 - abs(dot(normalize(vNormal), normalize(vToEye)));
  float a = min(1.0, (vFill + RIM * pow(f, RIM_POW)) * vGain);
  vec3 colour = mix(mix(AGENT, HUMAN, vWarm), EMBER, EMBER_MIX * vHi);
  if (vTint.a > 0.0) colour = mix(colour, vTint.rgb, vTint.a);
  outColor = vec4(colour * a, a);
}
