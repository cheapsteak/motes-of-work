precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The freeze frame's two bursts (bodySystem.ts: net-ticks; freeze-frame §2.1 items 2 and 2b), one
// quad per mote, drawn by galaxyMote.frag.glsl: straight dotted dashes in the view plane round the moon the
// pin caught mid-burst and round its planet caught mid-scatter. Each source is where the twin draws it
// (bodyCentre, its derp on: the moon off its track, the planet held), projected; a mote stands out along
// its dash (freeze.glsl freezeTick) from the source's screen radius times the dash's radius, the
// planet's ring leaving a gap toward the moon and the moon's dashes stopping where the planet's ring
// begins, so the two read as two. They come in with the dressing (freezeTickShow), times net.focus,
// retract and wink out as the fix lands (uFixV, the held planet's v), and are drawn at their source's
// depth, alternating cold and warm (the warm half ember turning amber in mode A, as the warm copy).

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec4 aTick; // source (0 the moon, 1 the planet), dash, mote, 0

// The held planet's system (an index into uSysPx), how far its shell is out (0..1: its dashes start
// further while it is), the held planet's v, and the twos' tick.
uniform float uHeldSys;
uniform float uScatterOut;
uniform float uFixV;
uniform float uTwos;

out vec2 vUv;
flat out float vType;
flat out float vForm;
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint;
flat out vec3 vBase; // galaxyMote.frag.glsl's base colour: the agents' blue (a planet's own colour is the re-skin's Task 7)

// A view-space point's clip position and its place on screen (CSS px from the frame's centre, y up).
vec2 onScreen(vec4 clip) {
  return 0.5 * clip.xy / clip.w * uViewport / uPixelRatio;
}

void main() {
  int moon = int(round(uHeld.x));
  int planet = int(round(uHeld.y));
  int source = int(round(aTick.x));
  float show = freezeTickShow(source, uDress * uFocus);
  if (moon < 0 || planet < 0 || !(show > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  int sys = int(round(uHeldSys));
  vec4 pView = toView(bodyCentre(planet, bodyDerp(planet, sys), uAmbient));
  vec4 mView = toView(bodyCentre(moon, bodyDerp(moon, sys), uAmbient));
  vec4 pClip = projectionMatrix * pView;
  vec4 mClip = projectionMatrix * mView;
  vec2 p = onScreen(pClip);
  vec2 m = onScreen(mClip);
  float pR = bodyTexel(3, planet).y * pxPerUnit(pView) / uPixelRatio;
  float mR = bodyTexel(3, moon).y * pxPerUnit(mView) / uPixelRatio;
  bool fromPlanet = source == FREEZE_SOURCE_PLANET;
  int dash = int(round(aTick.y));
  FreezeTick t = freezeTick(source, dash, int(round(aTick.z)), int(mod(uTwos, 2.0)), uFixV, uScatterOut, atan(m.y - p.y, m.x - p.x));
  vec2 sc = moteSinCos(t.angle);
  vec2 at = (fromPlanet ? p : m) + (t.radius * (fromPlanet ? pR : mR) + t.len) * vec2(sc.y, sc.x);
  // The moon's dashes stop where the planet's ring begins.
  float inner = (FREEZE_TICK_PLANET_R0 + FREEZE_TICK_PLANET_OUT * uScatterOut) * pR;
  float visible = !fromPlanet && distance(at, p) < inner ? 0.0 : t.visible;
  float gain = show * visible * uShow;
  if (gain < LOD_VISIBLE) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  // At the source's depth, at its place on screen.
  vec4 src = fromPlanet ? pClip : mClip;
  float px = max(FREEZE_TICK_PX * uPixelRatio, FREEZE_TICK_MIN_DEVICE_PX);
  vec4 clip = vec4(2.0 * at * uPixelRatio / uViewport * src.w, src.z, src.w);
  clip.xy += aCorner * (px / uViewport) * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0;
  vForm = float(FORM_POINT);
  vBrightness = gain;
  vRadiusPx = 0.5 * px;
  vHi = 0.0;
  // Cold (the agents' blue) or warm (the warm copy's colour), alternating.
  FreezeCopy colour = freezeCopy(freezeTickWarm(source, dash) ? 2 : 1, 1.0, uFixV, FREEZE_WARM_MODE, false);
  vTint = vec4(colour.tint, 1.0);
  vBase = NODE_AGENT;
}
