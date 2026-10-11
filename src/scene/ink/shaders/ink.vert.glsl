precision highp float;
precision highp int;

// The ink drawing (docs/specs/2026-10-05-blueprint-and-build.md §2.5): one screen-space quad per
// segment of a stroke, posed with its part, pressed flat onto the page by uFlat, revealed by the
// pen's arc, and wobbled and pressed like a hand-held pen. Steps 1, 2, 4 and 5 are mirrored in
// src/scene/ink/inkPose.ts; the flag bits and classes are src/scene/ink/inkLayout.ts's.

// #include mote.glsl (spliced in by inkSystem.ts: moteRotate and hash01; nothing in it changes)

in vec2 aCorner; // x: 0 at the segment's start, 1 at its end; y: -1 or +1 across it
in vec3 aA;
in vec3 aB;
in vec3 aATwin;
in vec3 aBTwin;
in vec4 aArcs; // the pen's arc at each end (or the mark's own), then the redraw's (or -1)
in vec2 aAlong; // world units along the stroke at each end
in vec4 aMeta; // part, stroke, flags, x-rank
in vec4 aStyle; // width (CSS px), class, alpha, 0

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uViewport; // drawing-buffer pixels
uniform float uPixelRatio;
uniform highp sampler2D uPartsCorrect; // the intended machine on the correct build (packPartTexture)
uniform highp sampler2D uPartsTwin; // ... and on the wrong twin's
uniform float uDrawn, uRedraw, uFlat, uOpacity, uSheet, uRing, uTick;

out vec2 vLocal; // px: along the segment from its start, and across from its centre line
flat out float vLength; // px
flat out float vCut; // px drawn so far along the segment
flat out int vCaps; // 1 start, 2 end
out float vHalf; // half width, px
out vec4 vColour; // straight colour and alpha

const int F_MOVES = 1;
const int F_FAR = 2;
const int F_PAPER = 4;
const int F_COPY = 8;
const int F_CAP_START = 16;
const int F_CAP_END = 32;
const int F_ACROSS = 64;
const int F_RING = 128;
const int C_PERSON = 4;

const float PENTIMENTO = 0.17;
const float OLD_FADE = 0.3;
const float NEW_FROM = 0.2;
const float LIFT_STAGGER = 0.3;

// Ink on the page by class (outline, construction, hatch, note, the person's), and on the dark stage.
const vec3 PAPER_INK[5] = vec3[5](
  vec3(0.180, 0.129, 0.090), // #2E2117 iron-gall gone brown-black
  vec3(0.420, 0.329, 0.212), // #6B5436 the under-drawing
  vec3(0.180, 0.129, 0.090),
  vec3(0.180, 0.129, 0.090),
  vec3(0.612, 0.416, 0.078) // #9C6A14 ochre: gold on paper
);
const float PAPER_ALPHA[5] = float[5](0.9, 0.5, 0.55, 0.5, 0.85);
const vec3 STAGE_INK = vec3(0.859, 0.831, 0.761); // #DBD4C2 pale and warm
const float STAGE_ALPHA = 0.7;

// The pen's hand: a wobble across the line (CSS px) and a pressure on its width, each a slow 1D
// value noise along the stroke keyed on the stroke, so a line never shivers between frames.
const float WOBBLE_PX = 0.9;
const float WOBBLE_FREQ = 1.8; // per world unit (4 per bike metre)
const float PRESSURE_FREQ = 4.0; // per world unit (9 per bike metre)
const uint SALT_INK = 0x494e4bu;
const float AA_PX = 1.5; // the quad's margin for the antialiased edge

float inkNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  uint k = uint(int(i) + 1048576);
  return mix(hash01(k, SALT_INK), hash01(k + 1u, SALT_INK), f * f * (3.0 - 2.0 * f));
}

vec4 toClip(vec3 p) {
  return projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
}

void main() {
  int part = int(round(aMeta.x));
  float stroke = aMeta.y;
  int flags = int(round(aMeta.z));
  int cls = int(round(aStyle.y));
  bool moves = (flags & F_MOVES) != 0;
  bool copy1 = (flags & F_COPY) != 0;
  bool paper = (flags & F_PAPER) != 0;

  // 4, 5. How much of it is drawn, and how strongly.
  float vis;
  float alpha = uOpacity * aStyle.z * mix(STAGE_ALPHA, PAPER_ALPHA[cls], uSheet);
  if (cls == C_PERSON) {
    float v = (flags & F_RING) != 0 ? uRing : uTick;
    vis = clamp((min(v, 1.0) - aArcs.x) / max(aArcs.y - aArcs.x, 1e-9), 0.0, 1.0);
    alpha *= clamp(2.0 - v, 0.0, 1.0);
  } else if (copy1) {
    float d = clamp((uRedraw - NEW_FROM) / (1.0 - NEW_FROM), 0.0, 1.0);
    vis = clamp((d - aArcs.z) / max(aArcs.w - aArcs.z, 1e-9), 0.0, 1.0);
  } else {
    vis = clamp((uDrawn - aArcs.x) / max(aArcs.y - aArcs.x, 1e-9), 0.0, 1.0);
  }
  if (moves && !copy1) alpha *= mix(1.0, PENTIMENTO, clamp(uRedraw / OLD_FADE, 0.0, 1.0));
  if (paper || (moves && !copy1)) alpha *= uSheet;
  // 2. Flatten: the page's own lines always; the bike's lift off it rear first as uFlat falls.
  float f = paper ? 1.0 : clamp((uFlat - LIFT_STAGGER * aMeta.w) / (1.0 - LIFT_STAGGER), 0.0, 1.0);
  if ((flags & F_FAR) != 0) alpha *= 1.0 - 0.85 * f;
  if ((flags & F_ACROSS) != 0) alpha *= 1.0 - f;
  if (vis <= 0.0 || alpha <= 0.0) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }

  // 1. Pose both ends in their build.
  bool twin = moves && !copy1;
  vec3 a = twin ? aATwin : aA;
  vec3 b = twin ? aBTwin : aB;
  vec4 q = twin ? texelFetch(uPartsTwin, ivec2(2 * part, 0), 0) : texelFetch(uPartsCorrect, ivec2(2 * part, 0), 0);
  vec3 p = twin ? texelFetch(uPartsTwin, ivec2(2 * part + 1, 0), 0).xyz : texelFetch(uPartsCorrect, ivec2(2 * part + 1, 0), 0).xyz;
  a = moteRotate(q, a) + p;
  b = moteRotate(q, b) + p;
  a.z *= 1.0 - f;
  b.z *= 1.0 - f;

  // 3. To screen px, then out across the line by the pen's width and wobble.
  vec4 ca = toClip(a);
  vec4 cb = toClip(b);
  vec2 half_ = 0.5 * uViewport;
  vec2 pa = ca.xy / ca.w * half_;
  vec2 pb = cb.xy / cb.w * half_;
  vec2 t = pb - pa;
  float len = length(t);
  vec2 dir = len > 1e-4 ? t / len : vec2(1.0, 0.0);
  vec2 n = vec2(-dir.y, dir.x);
  float s = mix(aAlong.x, aAlong.y, aCorner.x);
  float w = aStyle.x * uPixelRatio * (0.78 + 0.44 * inkNoise(s * PRESSURE_FREQ + stroke * 17.0));
  float wobble = WOBBLE_PX * uPixelRatio * (2.0 * inkNoise(s * WOBBLE_FREQ + stroke * 31.0) - 1.0);
  int caps = ((flags & F_CAP_START) != 0 ? 1 : 0) | ((flags & F_CAP_END) != 0 ? 2 : 0);
  float cap = (aCorner.x < 0.5 ? (caps & 1) : (caps & 2)) != 0 ? 0.5 * w + AA_PX : 0.0;
  float across = aCorner.y * (0.5 * w + AA_PX);
  float end = 2.0 * aCorner.x - 1.0;
  vec2 px = mix(pa, pb, aCorner.x) + n * (wobble + across) + dir * end * cap;

  vec4 clip = mix(ca, cb, aCorner.x);
  gl_Position = vec4(px / half_ * clip.w, clip.z, clip.w);
  vLocal = vec2(aCorner.x * len + end * cap, across);
  vLength = len;
  vCut = vis * len;
  vCaps = caps;
  vHalf = 0.5 * w;
  vColour = vec4(mix(STAGE_INK, PAPER_INK[cls], uSheet), alpha);
}
