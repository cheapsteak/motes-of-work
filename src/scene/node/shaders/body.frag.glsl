precision highp float;

// The galaxy's bodies (body.vert.glsl): a planet's or moon's faint fill (PLANET_LOOK.fill) in its
// colour (vBase, T6), lit by its terminator toward its own star and unshaded while lit (re-skin §4.4:
// no rim, so a planet does not glow), tinted toward the person's amber once fixed and mixed toward
// ember while lit, then toward the freeze frame's colour (vTint: a copy's, the grey, the flash's
// white), premultiplied for the screen blend. A burst's ghost keeps its rim, (1 - |n.v|)^GHOST_RIM_POW
// (BODY_LOOK.ghostRim): drawn by its icosphere alone, the rim is what reads as the moon's dim double.
// The palette's and the ghost rim's constants are NODE_PALETTE's and BODY_LOOK's (bodySystem.test.ts
// holds the copies to them); terminator() and the planets' constants are spliced.

in vec3 vNormal;
flat in vec3 vToStar;
flat in float vNight;
flat in vec3 vBase;
in vec3 vViewNormal;
in vec3 vToEye;
flat in float vRim;
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

// #include terminator() (spliced in by src/scene/node/shaderSource.ts)

const vec3 HUMAN = vec3(1.0, 0.7019608, 0.2784314); // #FFB347
const vec3 EMBER = vec3(1.0, 0.4196078, 0.3411765); // #FF6B57
const float EMBER_MIX = 0.8;
const float GHOST_RIM = 0.55;
const float GHOST_RIM_POW = 2.6;

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
  float lit = mix(terminator(normalize(vNormal), vToStar, vNight), 1.0, vHi);
  float f = 1.0 - abs(dot(normalize(vViewNormal), normalize(vToEye)));
  float a = min(1.0, (vFill * lit + vRim * GHOST_RIM * pow(f, GHOST_RIM_POW)) * vGain);
  vec3 colour = mix(mix(vBase, HUMAN, vWarm), EMBER, EMBER_MIX * vHi);
  if (vTint.a > 0.0) colour = mix(colour, vTint.rgb, vTint.a);
  outColor = vec4(colour * a, a);
}
