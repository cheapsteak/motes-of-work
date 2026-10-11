// Shader sources of the parity page, kept free of WebGL so unit tests can check them (layout.test.ts:
// the attribute budget, and that mote.glsl is only ever in a vertex shader). Both checks are points
// draws: each instance lands on its own texel of a SIZE×SIZE float target via gl_InstanceID, and
// its result reaches the fragment shader as a flat varying, written out unchanged.
import { moteLibraryGlsl, VERTEX_INCLUDE_MARKER } from '../scene/mote/shaderSource';
import {
  DERP_INCLUDE_MARKER,
  FREEZE_INCLUDE_MARKER,
  GALAXY_INCLUDE_MARKER,
  HOLE_INCLUDE_MARKER,
  LOD_INCLUDE_MARKER,
  ORBIT_INCLUDE_MARKER,
  SHELL_INCLUDE_MARKER,
  STAR_INCLUDE_MARKER,
} from '../scene/node/shaderSource';
import {
  BODY_PARITY_FIELDS,
  DERP_PARITY_FIELDS,
  FREEZE_PARITY_FIELDS,
  glslFreezeOutStruct,
  glslHoleOutStruct,
  glslLodOutStruct,
  HOLE_PARITY_FIELDS,
  glslOrbitOutStruct,
  glslPassOutput,
  glslShellOutStruct,
  glslStarOutStruct,
  glslStreamOutStruct,
  LOD_PARITY_FIELDS,
  ORBIT_PARITY_FIELDS,
  parityPasses,
  SHELL_PARITY_FIELDS,
  STAR_PARITY_FIELDS,
  STREAM_PARITY_FIELDS,
  type PlacedField,
} from './fields';

/** Width and height of the readback target: one texel per instance. */
export const PARITY_SIZE = 16;

// `if (uPass == 0) vOut = vec4(o.pos, o.settled); else if (uPass == 1) ...`: one branch per pass.
function passSelect<Out>(passes: PlacedField<Out>[][]): string {
  return passes.map((pass, i) => `${i === 0 ? '' : 'else '}if (uPass == ${i}) vOut = ${glslPassOutput(pass, 'o')};`).join('\n  ');
}
const PASS_SELECT = passSelect(parityPasses());

/** Puts instance gl_InstanceID on its own texel, as a 1px point. */
const PLACE_ON_TEXEL = /* glsl */ `
  vec2 cell = vec2(float(gl_InstanceID % ${PARITY_SIZE}), float(gl_InstanceID / ${PARITY_SIZE}));
  gl_Position = vec4((cell + 0.5) / ${PARITY_SIZE}.0 * 2.0 - 1.0 + position.xy, 0.0, 1.0);
  gl_PointSize = 1.0;`;

/**
 * The production attribute path: instanceAttrs() unpacks the instanced attributes and mote() runs as
 * in the mote/thread/ghost vertex shaders. Carries the include marker: build with withMoteLibrary().
 */
export const MOTE_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${VERTEX_INCLUDE_MARKER}

in vec3 position; // the single non-instanced vertex, at the origin
uniform int uCopy;
uniform int uPass;
flat out vec4 vOut;

void main() {
  MoteOut o = mote(instanceAttrs(), uCopy);
  ${PASS_SELECT}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The orbit library (`?lib=orbit`): bodyWorld() at a body row and an ambient time per instance, over
 * the bodies texture, as the galaxy's vertex shaders will call it. Carries the orbit include marker:
 * build with withOrbitLibrary().
 */
export const ORBIT_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${ORBIT_INCLUDE_MARKER}

${glslOrbitOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aRowT; // the body's row, the ambient time
uniform int uPass;
flat out vec4 vOut;

void main() {
  OrbitOut o;
  o.bodyWorld = bodyWorld(int(round(aRowT.x)), aRowT.y);
  ${passSelect(parityPasses(ORBIT_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The derp library (`?lib=derp`): derp() at a body's seed, phase, kind and sizes and an ambient time
 * per instance, as the galaxy's vertex shaders will call it with the bodies texture's values.
 * Carries the derp include marker: build with withDerpLibrary().
 */
export const DERP_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${DERP_INCLUDE_MARKER}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aDerpA; // derp seed, derp phase, ambient time, body kind (bodyData.ts BODY_KIND)
in vec4 aDerpB; // track radius r, body radius R, angular speed, the fix's v
uniform int uPass;
flat out vec4 vOut;

void main() {
  Derp o = derp(aDerpA.x, aDerpA.y, aDerpA.z, int(round(aDerpA.w)), aDerpB.x, aDerpB.y, aDerpB.z, aDerpB.w);
  ${passSelect(parityPasses(DERP_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The shell library (`?lib=shell`): shellWarpK() at a mote's lattice point and hashes and a second
 * into a scatter per instance, the event, the time and the gains as uniforms (as the galaxy's shell
 * shader will take them per body), and the place turned by spinShell() about spinAxis(). Carries the
 * shell include marker: build with withShellLibrary().
 */
export const SHELL_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${SHELL_INCLUDE_MARKER}

${glslShellOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aLL; // the mote's lattice point (lat, lon)
in vec4 aHA; // its hashes h0..h3
in vec4 aHB; // its hashes h4..h7
in float aSec; // seconds into the scatter, -1 if none
uniform float uT;
uniform vec3 uSweep;
uniform float uAftershock; // 0 or 1
uniform vec4 uShapeA;
uniform vec4 uShapeB;
uniform vec4 uNextA;
uniform vec4 uNextB;
uniform float uA;
uniform float uGain;
uniform float uCap;
uniform float uSpinSeed; // an integer below 2^24
uniform int uPass;
flat out vec4 vOut;

void main() {
  ShellEvent ev;
  ev.sec = aSec;
  ev.sweep = uSweep;
  ev.aftershock = uAftershock > 0.5;
  ev.shapeA = uShapeA;
  ev.shapeB = uShapeB;
  ev.nextA = uNextA;
  ev.nextB = uNextB;
  vec4 w = shellWarpK(aLL, aHA, aHB, uT, ev, uA, uGain, uCap);
  ShellOut o;
  o.warp = w.xyz;
  o.k = w.w;
  o.spun = spinShell(w.xyz, spinAxis(uint(round(uSpinSeed))), uT);
  ${passSelect(parityPasses(SHELL_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * Hash check, per instance. Input aHashIn: (seed, salt, pcg input, 0). Output: (hash01(seed, salt),
 * pcg hi16, pcg lo16, 0). Complete as it stands (the mote library is included directly).
 */
export const HASH_VERTEX = /* glsl */ `
precision highp float;
precision highp int;
precision highp sampler2D;

${moteLibraryGlsl()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aHashIn;
flat out vec4 vOut;

void main() {
  uint p = pcg(uint(round(aHashIn.z)));
  vOut = vec4(hash01(uint(round(aHashIn.x)), uint(round(aHashIn.y))), float(p >> 16u), float(p & 0xffffu), 0.0);
${PLACE_ON_TEXEL}
}
`;

/** Both checks: write the vertex stage's result unchanged. */
export const PARITY_FRAGMENT = /* glsl */ `
precision highp float;
flat in vec4 vOut;
out vec4 outColor;
void main() {
  outColor = vOut;
}
`;

/**
 * The level of detail (`?lib=lod`): lodGain() of an element at a system's size (and a moon's handover
 * at that size as its diameter), glowPx() of a body's radius, distance, focal length and cap, and
 * motePx() of a world diameter at a scale, the early-out's lodSkip(), offScreenReachPx() and
 * offScreenSkip(), and the neighbourhood's dissolve (hoodGlowPx, hoodReal, hoodFar, hoodSkip), per instance, as the galaxy's vertex shaders call them. Carries the lod include marker: build with withLodLibrary().
 */
export const LOD_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${LOD_INCLUDE_MARKER}

${glslLodOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aGainIn; // LodElement, the system's size (CSS px)
in vec4 aGlowIn; // R, d, focal (CSS px), cap
in vec2 aMoteIn; // a mote's world diameter, CSS px per unit
in vec4 aSkipIn; // the early-out's lodSkip: kind, role, index, force (at aGainIn.y's size)
in vec4 aViewIn; // offScreenReachPx: a centre in view space, rho
in vec4 aFocalIn; // fx, fy, the dot's world diameter; offScreenSkip: the screen's height
in vec4 aOffIn; // offScreenSkip: a centre (CSS px), a reach, the screen's width
in vec4 aHoodIn; // the dissolve: a distance, a focal length (CSS px), the beats' hold, a body kind
uniform int uPass;
flat out vec4 vOut;

void main() {
  LodOut o;
  o.skip = lodSkip(int(round(aSkipIn.x)), int(round(aSkipIn.y)), aSkipIn.z, aGainIn.y, aSkipIn.w) ? 1.0 : 0.0;
  o.reach = offScreenReachPx(aViewIn.xyz, aViewIn.w, aFocalIn.x, aFocalIn.y, aFocalIn.z);
  o.offScreen = offScreenSkip(aOffIn.xy, aOffIn.z, aOffIn.w, aFocalIn.w) ? 1.0 : 0.0;
  o.gain = lodGain(int(round(aGainIn.x)), aGainIn.y);
  o.glow = glowPx(aGlowIn.x, aGlowIn.y, aGlowIn.z, aGlowIn.w);
  o.moonSphere = moonSphereGain(aGainIn.y);
  o.moonPoint = moonPointPx(aGainIn.y);
  o.mote = motePx(aMoteIn.x, aMoteIn.y);
  o.hoodGlow = hoodGlowPx(aHoodIn.x, aHoodIn.y);
  o.hoodReal = hoodReal(o.hoodGlow, aHoodIn.z);
  o.hoodFar = hoodFar(aHoodIn.x, aHoodIn.y, aHoodIn.z);
  o.hoodSkip = hoodSkip(int(round(aHoodIn.w)), o.hoodReal) ? 1.0 : 0.0;
  ${passSelect(parityPasses(LOD_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * A star's look (`?lib=star`): starDot() of a dot's index and seed, starSpike() of a look's spike row
 * and dot at a glow size, starBreath() of the look's period and phase at an ambient, and starTint() of
 * a temperature, every sample computing all four. Carries the star include marker: build with
 * withStarLibrary().
 */
export const STAR_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${STAR_INCLUDE_MARKER}

${glslStarOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aStarIn; // a dot's index, its seed, a spike row, a spike dot
in vec4 aLookIn; // brightness, spikes, period, phase
in vec4 aClockIn; // the glow's px, the ambient, the temperature, the glow's unclamped px
uniform int uPass;
flat out vec4 vOut;

void main() {
  StarLook look;
  look.brightness = aLookIn.x;
  look.spikes = aLookIn.y;
  look.temperature = aClockIn.z;
  look.period = aLookIn.z;
  look.phase = aLookIn.w;
  vec4 d = starDot(aStarIn.x, uint(round(aStarIn.y)));
  StarOut o;
  o.offset = d.xyz;
  o.gain = d.w;
  o.spike = starSpike(look, int(round(aStarIn.z)), aStarIn.w, aClockIn.x, aClockIn.w);
  o.breath = starBreath(look.period, look.phase, aClockIn.y);
  o.tint = starTint(aClockIn.z);
  ${passSelect(parityPasses(STAR_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The galaxy's motes (`?lib=body`): bodyMote() over the shell and person motes' own instanced
 * attributes (bodyAttrs.ts: aLL, aMote, aFlight), the three textures and the clocks as uniforms, as the
 * galaxy's shell shader calls it. Carries the galaxy's include marker: build with withGalaxyLibrary().
 */
export const BODY_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${GALAXY_INCLUDE_MARKER}

in vec3 position; // the single non-instanced vertex, at the origin
in vec2 aLL;
in vec4 aMote; // body row, NodeRole, system, lattice index
in vec4 aFlight; // birth, seed, host, 0
uniform int uPass;
flat out vec4 vOut;

void main() {
  BodyMoteAttrs a;
  a.row = int(round(aMote.x));
  a.role = int(round(aMote.y));
  a.ll = aLL;
  a.birth = aFlight.x;
  a.seed = uint(round(aFlight.y));
  a.host = int(round(aFlight.z));
  a.index = aMote.w;
  a.sys = int(round(aMote.z));
  BodyMoteOut o = bodyMote(a);
  ${passSelect(parityPasses(BODY_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The tracks' lamp gain (`?lib=body`'s track lamp case): bodyMote.glsl's trackLampGain() per track row,
 * as track.vert.glsl calls it, under the lamp's level, body and focus the uniforms hold. Carries the
 * galaxy's include marker: build with withGalaxyLibrary().
 */
export const TRACK_LAMP_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${GALAXY_INCLUDE_MARKER}

in vec3 position; // the single non-instanced vertex, at the origin
in float aRowIn; // the track's body row: a planet (its orbit round its star) or a moon (its track)
flat out vec4 vOut;

void main() {
  vOut = vec4(trackLampGain(int(round(aRowIn))), 0.0, 0.0, 0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The galaxy's stream dots (`?lib=body`'s stream case): bodyMote.glsl's streamDot(), streamGain(),
 * feedGain() and streamBandMask() per instance, as stream.vert.glsl calls them. Carries the galaxy's include marker: build with
 * withGalaxyLibrary().
 */
export const STREAM_DOT_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${GALAXY_INCLUDE_MARKER}

${glslStreamOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aDotIn; // row in the streams texture, the dot's index, net.streams, the lamp's gain
in vec2 aBandIn; // the top of the dot's pixel in CSS px from the screen's top, the screen's height
uniform vec3 uRing; // the feed's far end
uniform int uPass;
flat out vec4 vOut;

void main() {
  StreamDot sd = streamDot(int(round(aDotIn.x)), aDotIn.y, uAmbient, uRing);
  StreamOut o;
  o.pos = sd.pos;
  o.u = sd.u;
  o.presence = sd.presence;
  o.gain = streamGain(sd.u, aDotIn.z, aDotIn.w);
  o.feedGain = feedGain(aDotIn.z, aDotIn.w); // the third input read as net.feed
  o.bandMask = streamBandMask(aBandIn.x, aBandIn.y);
  ${passSelect(parityPasses(STREAM_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The freeze frame's dressing (`?lib=freeze`): freezeCopy(), freezeLimb(), freezeTick(),
 * freezeTickShow() and freezeBreath() per instance, over a grid of their inputs as attributes.
 * Carries the freeze include marker: build with withFreezeLibrary().
 */
export const FREEZE_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${FREEZE_INCLUDE_MARKER}

${glslFreezeOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aCopyIn; // copy (0, 1, 2), dress, v, warm mode (0 A, 1 B)
in vec4 aLimbN; // the rest normal in view space, and 1 for the defect moon's copy
in vec3 aLimbL; // the key light's direction in view space
in vec4 aTickIn; // source (0 moon, 1 planet), dash, mote, the twos' length set
in vec4 aTickClock; // v, scatterOut, toMoon, the twos' tick
uniform int uPass;
flat out vec4 vOut;

void main() {
  int copy = int(round(aCopyIn.x));
  FreezeCopy c = freezeCopy(copy, aCopyIn.y, aCopyIn.z, int(round(aCopyIn.w)), aLimbN.w > 0.5);
  FreezeLimb l = freezeLimb(aLimbN.xyz, aLimbL, aCopyIn.y, copy);
  int source = int(round(aTickIn.x));
  FreezeTick t = freezeTick(source, int(round(aTickIn.y)), int(round(aTickIn.z)), int(round(aTickIn.w)), aTickClock.x, aTickClock.y, aTickClock.z);
  FreezeOut o;
  o.copyOff = c.offPx;
  o.copyGain = c.gain;
  o.tint = c.tint;
  o.limbGain = l.gain;
  o.limbSize = l.size;
  o.tickAngle = t.angle;
  o.tickRadius = t.radius;
  o.tickLen = t.len;
  o.tickVisible = t.visible;
  o.tickShow = freezeTickShow(source, aCopyIn.y);
  o.tickWarm = freezeTickWarm(source, int(round(aTickIn.y))) ? 1.0 : 0.0;
  o.breath = freezeBreath(aTickClock.w);
  ${passSelect(parityPasses(FREEZE_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;

/**
 * The black hole (`?lib=hole`): one instance a sample, its part in aHoleIn.x (0 holeLens, 1 diskDot,
 * 2 ringDot, 3 jetDot, 4 knotDot, 5 infallDot, 6 strandDot, 7 strandJoin), the dot's own attributes
 * (aHoleA, aHoleB and the disk's aHoleC: holeAttrs.ts; a holeLens case's point in aHoleA.xyz, a
 * strandJoin's strand in aHoleA.x), its image, the fronts or the window and heat in aHoleIn.yzw, and
 * its ambient in aHoleT; the camera as uniforms, as hole.ts HoleView. Carries the hole include marker:
 * build with withHoleLibrary().
 */
export const HOLE_VERTEX = /* glsl */ `
precision highp float;
precision highp int;

${HOLE_INCLUDE_MARKER}

${glslHoleOutStruct()}

in vec3 position; // the single non-instanced vertex, at the origin
in vec4 aHoleA;
in vec4 aHoleB;
in vec4 aHoleC;
in vec4 aHoleIn; // part, image, and the fronts (ember, clean) or the window and heat (head, heat)
in float aHoleT; // the ambient
uniform vec3 uHoleCam;
uniform mat3 uHoleViewRot;
uniform vec3 uHoleHv;
uniform float uHoleGain;
uniform int uPass;
flat out vec4 vOut;

void main() {
  HoleView v = HoleView(aHoleT, uHoleCam, uHoleViewRot, uHoleHv, uHoleGain);
  int part = int(round(aHoleIn.x));
  HoleDot d = HoleDot(vec3(0.0), vec3(0.0), 0.0, 0.0, 0.0);
  float ember = 0.0;
  if (part == 0) {
    vec4 l = holeLens(aHoleA.xyz, uHoleHv, aHoleIn.y, HOLE_LOOK_SCALE);
    d.view = l.xyz;
    d.ok = l.w;
  } else if (part == 1) d = diskDot(aHoleA, aHoleB, aHoleC, v, aHoleIn.y);
  else if (part == 2) d = ringDot(aHoleA, aHoleB, v);
  else if (part == 3) d = jetDot(aHoleA, aHoleB, v);
  else if (part == 4) d = knotDot(aHoleA, aHoleB, v, aHoleIn.zw, ember);
  else if (part == 5) d = infallDot(aHoleA, aHoleB, v);
  else if (part == 6) d = strandDot(aHoleA, aHoleB, v, aHoleIn.zw);
  else if (part == 7) d.view = strandJoin(aHoleA.x, aHoleT);
  HoleOut o;
  o.view = d.view;
  o.alpha = d.alpha;
  o.rgb = d.rgb;
  o.sizeCss = d.sizeCss;
  o.ok = d.ok;
  o.ember = ember;
  o.px = holeDotPx(d.sizeCss, -d.view.z, 2.0);
  ${passSelect(parityPasses(HOLE_PARITY_FIELDS))}
  else vOut = vec4(0.0);
${PLACE_ON_TEXEL}
}
`;
