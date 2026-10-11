precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The stars' spikes (bodySystem.ts: net-spikes; re-skin §4.3), one 1 CSS px dot per instance, drawn
// by galaxyMote.frag.glsl. A spike dot stands in screen space off its star's centre as drawn (its derp
// on, as its glow sprite: shell.vert.glsl), by starSpike() of the star's look (T7) at the glow sprite's
// size under its own cap (uGlowCap), centred on its pixel. Its spikes come in with the glow's size
// (STAR_SPIKE_LOD), so a far star is a point, and times its star's real form's share (the dissolve,
// re-skin §4.1: the gains multiply). It is drawn while its star is up and the lamp lights
// it, ember while the star is lit, greyed and dimmed by the freeze frame's dressing as the glow is,
// and it breathes with the star.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aSpike; // star row, its system, its glow slot, k: spike row k / STAR_DOTS_SPIKE_DOTS, dot k mod it

uniform float uGlowCap[GALAXY_GLOW_MAX];

out vec2 vUv;
flat out float vType; // 1 the star's tint, toward 0 the person's amber
flat out float vForm;
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a)
flat out vec3 vBase; // the star's tint (T6)

void main() {
  int row = int(round(aSpike.x));
  int sys = int(round(aSpike.y));
  int k = int(round(aSpike.w));
  // The early-out (re-skin §7): before the star's place and derp. A row past the star's spikes; a glow
  // whose cap (uGlowCap: its sprite is never larger) keeps the spikes from coming in (STAR_SPIKE_LOD);
  // or a lamp that is dark: each is a factor of 0 below, whatever else it is multiplied by.
  if (k / STAR_DOTS_SPIKE_DOTS >= int(round(bodyStarLook(row).spikes)) || uGlowCap[int(round(aSpike.z))] <= STAR_SPIKE_LOD.x || !(lampGain(row) > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  // The star's real form's share (bodyScreen.glsl bodyHoodReal, the dissolve): its spikes are drawn
  // times it. Where it is 0 the early-out above has hidden them: the CPU draws no glow there (bodySystem.ts),
  // so its cap is 0.
  float real = bodyHoodReal(row, KIND_STAR, toView(bodyWorld(row, uAmbient)));
  vec3 centre = bodyCentre(row, bodyDerp(row, sys), uAmbient);
  vec3 light = bodyLight(row);
  float hi = max(light.y, light.z);
  FreezeLook look = freezeLook(row, 1.0 - light.x);
  float gain = (look.gain > 0.0 ? bodyPresence(row) * lampGain(row) * uShow * focusGain(row) : 0.0) * real;
  vec4 view = toView(centre);
  float focal = 0.5 * uViewport.y * projectionMatrix[1][1] / uPixelRatio;
  float R = bodyTexel(3, row).y;
  float glow = glowPx(R, length(view.xyz), focal, uGlowCap[int(round(aSpike.z))]);
  // The glow's unclamped size: how close the camera is (starSpikeShare).
  float near = GLOW_SCALE * R * focal / max(length(view.xyz), 1e-4);
  StarLook star = bodyStarLook(row);
  vec3 spike = starSpike(star, k / STAR_DOTS_SPIKE_DOTS, float(k % STAR_DOTS_SPIKE_DOTS), glow, near);
  // Hidden with its glow, where the spikes have not come in (a far star is a point), on a star that
  // shows none (not among the brightest, the camera not close), or past its spikes.
  if (glow <= 0.0 || gain * smoothstep(STAR_SPIKE_LOD.x, STAR_SPIKE_LOD.y, glow) * starSpikeShare(star, near) < LOD_VISIBLE || !(spike.z > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 clip = projectionMatrix * view;
  // The star's centre on the drawing buffer (device px), the dot's offset on it, centred on its pixel.
  vec2 pixel = floor((clip.xy / clip.w * 0.5 + 0.5) * uViewport + spike.xy * uPixelRatio) + 0.5;
  float px = uPixelRatio; // 1 CSS px
  clip.xy = (pixel / uViewport * 2.0 - 1.0) * clip.w;
  clip.xy += aCorner * (px / uViewport) * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0 - light.x * BODY_WARM;
  vForm = float(FORM_POINT);
  // The star's brightness and breath, handed over to the full light as it is lit (its glow's rule).
  vBrightness = LOOK_GLOW_BRIGHTNESS * gain * look.gain * mix(star.brightness * starBreath(star.period, star.phase, uAmbient), 1.0, hi) * spike.z;
  vRadiusPx = 0.5 * px;
  // A lit star's spikes are the light itself, as its glow: pure ember.
  vHi = hi / NODE_EMBER_MIX;
  vTint = look.tint;
  vBase = bodyBase(row);
}
