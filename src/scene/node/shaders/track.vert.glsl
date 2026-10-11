precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The galaxy's dotted orbits and tracks (bodySystem.ts: net-tracks), one quad per dot, drawn by
// galaxyMote.frag.glsl. A dot marks the ellipse of the body in its row (a planet's orbit round its star, or
// a moon track round its planet, which the track's moons share) at its own mean anomaly: orbitLocal
// with the dot's anomaly in place of the body's, so the dot stays put on the ellipse while the
// ellipse precesses and turns with the galaxy. It comes in with its system's moons, over 60-120 px,
// up with its body's build and dark outside the lamp (trackLampGain: under the planet lamp the lit
// planet's own orbit is never drawn), and takes BODY_TRACK_HI of its body's light.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aTrack; // body row, mean anomaly (turns), system, 1 on a moon's track

out vec2 vUv;
flat out float vType;
flat out float vForm;
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a)
flat out vec3 vBase; // galaxyMote.frag.glsl's base colour: its planet's (T6; a moon's track its planet's colour, re-skin Task 7)

// The freeze frame: the copies' offset direction (the rolled screen x, clip space) and the twos' tick.
uniform vec2 uOffPx;
uniform float uTwos;

void main() {
  int row = int(round(aTrack.x));
  int sys = int(round(aTrack.z));
  // The early-out (re-skin §7): a dot whose system has not brought its tracks in (lod.glsl lodSkip), or
  // whose lamp is dark, has a gain of 0 below, whatever else it is multiplied by.
  if (bodyLodSkip(bodyKind(row), ROLE_TRACK, 0.0, sys) || !(trackLampGain(row) > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec3 light = bodyLight(row);
  // The freeze frame: the held piece's tracks are copied and flash, the rest dims and greys.
  FreezeLook look = freezeLook(row, 1.0 - light.x);
  float gain = sysGain(LOD_TRACK, sys) * bodyPresence(row) * trackLampGain(row) * uShow * look.gain;
  if (gain < LOD_VISIBLE || !(look.gain > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  int host = int(round(bodyTexel(3, row).x));
  vec4 t2 = bodyTexel(2, row);
  // orbitLocal reads fract(phase + orbitTurns(t, period)): this phase leaves the dot's own anomaly.
  t2.w = aTrack.y - orbitTurns(uAmbient, t2.z);
  // The ellipse is in the galaxy's own frame: turned with the galaxy, as its host is.
  vec3 pos = bodyWorld(host, uAmbient) + turnVec(orbitLocal(bodyTexel(1, row), t2, uAmbient), uAmbient);
  vec4 view = toView(pos);
  float px = clamp(LOOK_TRACK_DOT * pxPerUnit(view) / uPixelRatio, PX_TRACK.x, PX_TRACK.y) * uPixelRatio;
  vec4 clip = projectionMatrix * view;
  // The defect's dropout (bodyScreen.glsl): the focused piece's moon tracks go dark in its lines.
  if (dropoutHides(row, clip, 0.5 * px / uPixelRatio)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  float off = look.offPx + (uCopy > 0.5 ? freezeBreath(uTwos) : 0.0);
  clip.xy += (aCorner * px + 2.0 * uOffPx * off * uPixelRatio) / uViewport * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0;
  vForm = float(FORM_POINT);
  vBrightness = LOOK_TRACK_BRIGHTNESS * gain;
  vRadiusPx = 0.5 * px;
  vHi = BODY_TRACK_HI * max(light.y, light.z);
  vTint = look.tint;
  vBase = bodyBase(row);
}
