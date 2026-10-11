// GLSL mirror of src/scene/node/bodyMote.ts, step for step: the galaxy's motes in motion (their
// flights, light, lamp and the defect on moving bodies) and what the body, glow, track, stream and
// ring draws share of them, the stream dots (stream.ts streamDot, streamGain) among them. bodyMote.ts says what each term is. It has no main(), and it is not usable
// raw: take it from withGalaxyLibrary() in shaderSource.ts (this folder), which splices in the
// generated body mote constants (birth.ts) and the BodyMoteOut struct (src/parity/fields.ts) at the
// markers below and puts before it the mote library (hash01, moteSinCos), orbit.glsl (bodyWorld,
// orbitLocal, galaxyTurn), derp.glsl (derp), shell.glsl (shellWarpK, shellHome, spinShell), star.glsl
// (starDotPolar, starBreath), lod.glsl (lodGain),
// light.glsl (nodeLight, nodeSettle, nodeArrival, nodeSpread) and the galaxy's constants (KIND_,
// ROLE_). Like orbit.glsl it never calls the builtin sin or cos. The parity page (src/parity,
// ?lib=body) renders it and compares it with the TS reference.

// #include BODY MOTE constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// #include BodyMoteOut struct (generated from src/parity/fields.ts by shaderSource.ts)

// Per body row (bodyAttrs.ts packShellData): T0, T1 the shape; T2 the spin axis and the morph's A;
// T3 the motes' world diameter, their number and the body's own seed; T4, T5 the next shape; T6 the
// scatter's sweep and its aftershock. The streams texture (bodyData.ts): a row per stream, the feed last.
uniform highp sampler2D uShellTex;
uniform highp sampler2D uStreamTex;
// The story's clocks (SceneState.net), the ambient clock, and the lamp: its focus, level and body row.
uniform float uGrowth, uFix, uHighlight, uShow, uAmbient, uFocus, uLamp, uLampRow;
// The row whose derp the freeze's hold replaces with a scatter FREEZE_SCATTER_S in (-1 none).
uniform float uForcedScatter;
// The freeze frame (freeze.glsl): the dressing, the flash and whether it shows, which copy of the held
// piece this draw is (0 the base, 1 cold, 2 warm), and the held moon's and planet's rows (-1 none).
uniform float uDress, uFlash, uFlashOn, uCopy;
uniform vec2 uHeld;
// Each system's projected outer radius (CSS px), and a test-mode override of each LodElement's gain
// (-1 leaves it to the system's size).
uniform float uSysPx[GALAXY_SYS_MAX];
uniform float uLodForce[LOD_COUNT];
// How far a beat holds the neighbourhood's real form whole against its dissolve (lod.ts hoodHold of net.hoodHold).
uniform float uHoodHold;

// What a mote is (bodyMote.ts BodyMoteAttrs).
struct BodyMoteAttrs {
  int row;
  int role;
  vec2 ll;
  float birth;
  uint seed;
  int host;
  float index;
  int sys;
};

vec4 shellTexel(int t, int row) {
  return texelFetch(uShellTex, ivec2(t, row), 0);
}

vec4 streamTexel(int t, int row) {
  return texelFetch(uStreamTex, ivec2(t, row), 0);
}

// An element's gain at system sys's size, or the test mode's override. The core is no system: its
// bodies, and their derps, are drawn at every level, whatever the override.
float sysGain(int el, int sys) {
  if (sys < 0) return 1.0;
  float forced = uLodForce[el];
  if (forced >= 0.0) return forced;
  return lodGain(el, uSysPx[sys]);
}

// The early-out's level of detail (lod.glsl lodSkip) on a dot of system sys, at its size and the test
// mode's override of its element, as sysGain takes them: the core's dots (sys -1) are never skipped.
bool bodyLodSkip(int kind, int role, float index, int sys) {
  int el = lodSkipElement(kind, role, index);
  return sys >= 0 && el >= 0 && lodSkip(kind, role, index, uSysPx[sys], uLodForce[el]);
}

int bodyKind(int row) {
  return int(round(bodyTexel(0, row).w));
}

// A star's look as the bodies texture's T7 holds it (bodyMote.ts bodyStarLook): its temperature is in
// its tint (T6), 0 here.
StarLook bodyStarLook(int row) {
  vec4 t7 = bodyTexel(7, row);
  StarLook s;
  s.brightness = t7.x;
  s.spikes = t7.y;
  s.temperature = 0.0;
  s.period = t7.z;
  s.phase = t7.w;
  return s;
}

// A body's base colour (T6.rgb): a star's tint, every other body's the agents' blue.
vec3 bodyBase(int row) {
  return bodyTexel(6, row).rgb;
}

// A row's piece: a planet's own row, a moon's planet; -1 for the core and the stars.
int bodyPiece(int row) {
  int k = bodyKind(row);
  if (k == KIND_PLANET) return row;
  return k == KIND_MOON ? int(round(bodyTexel(3, row).x)) : -1;
}

// Whether row is in the lamp's lit set at `level` about the focus body (-1 none).
bool lampLit(int row, int level, int focus) {
  int kind = bodyKind(row);
  if (level == 0 || level == 3) return true;
  if (level == 4) return kind == KIND_CORE;
  if (level == 6) return kind != KIND_CORE;
  if (level == 5 && kind == KIND_CORE) return true;
  if (focus < 0) return false;
  if (level == 1) {
    int p = bodyPiece(focus);
    return p >= 0 && bodyPiece(row) == p;
  }
  int c = level == 2 ? 2 : 3; // T5.z the star, T5.w the rule
  return round(bodyTexel(5, row)[c]) == round(bodyTexel(5, focus)[c]);
}

// The lamp's subject: the focus body, and for a piece all of it.
bool lampSubject(int row, int focus) {
  if (focus < 0) return false;
  if (row == focus) return true;
  int p = bodyPiece(focus);
  return p >= 0 && bodyPiece(row) == p;
}

// The lamp's gain on a body: 0 outside the lit set, 1 inside, LAMP_FLOOR at focus 1 but for the subject.
float lampGain(int row) {
  int level = int(round(uLamp));
  if (level == 0) return 1.0;
  int focus = int(round(uLampRow));
  if (!lampLit(row, level, focus)) return 0.0;
  return lampSubject(row, focus) ? 1.0 : mix(1.0, LAMP_FLOOR, uFocus);
}

// The freeze frame's look on a mote, a body or a dot of `row` at its fix's v (bodyMote.ts freezeLook):
// its brightness as a multiple of its own, its offset along the rolled screen x (CSS px), and the colour
// it is mixed toward (rgb, a). The held piece's base takes the flash, its copies freezeCopy's; the rest
// dims and greys with the dressing and has no copy. Every term is times net.focus.
struct FreezeLook {
  float gain;
  float offPx;
  vec4 tint;
};

FreezeLook freezeLook(int row, float v) {
  float dress = uDress * uFocus;
  float flash = uFlash * uFlashOn * uFocus;
  int copy = int(round(uCopy));
  int planet = int(round(uHeld.y));
  FreezeLook f;
  f.gain = 1.0;
  f.offPx = 0.0;
  f.tint = vec4(0.0);
  if (!(planet >= 0 && bodyPiece(row) == planet)) {
    if (copy > 0) {
      f.gain = 0.0;
      return f;
    }
    f.gain = 1.0 - (1.0 - FREEZE_DIM) * dress;
    f.tint = vec4(FREEZE_GREY, FREEZE_GREY_MIX * dress);
    return f;
  }
  FreezeCopy c = freezeCopy(copy, dress, v, FREEZE_WARM_MODE, row == int(round(uHeld.x)));
  if (copy > 0) {
    f.gain = c.gain;
    f.offPx = c.offPx;
    f.tint = vec4(c.tint, 1.0);
    return f;
  }
  f.gain = 1.0 + FREEZE_FLASH.x * flash;
  f.tint = vec4(1.0, 1.0, 1.0, FREEZE_FLASH.y * flash);
  return f;
}

// Whether row is the planet lamp's subject (the focused piece).
bool planetLampSubject(int row) {
  return int(round(uLamp)) == 1 && lampSubject(row, int(round(uLampRow)));
}

// The focused piece's light under the planet lamp (bodyMote.ts focusGain): mix(1, FOCUS_GAIN, focus).
float focusGain(int row) {
  return planetLampSubject(row) ? mix(1.0, FOCUS_GAIN, uFocus) : 1.0;
}

// How much of its own orbit derp the focused piece's planet keeps (bodyMote.ts focusDerp): 1 - focus.
float focusDerp(int row) {
  return bodyKind(row) == KIND_PLANET && planetLampSubject(row) ? 1.0 - uFocus : 1.0;
}

// A dotted orbit's or moon track's gain under the lamp (track.vert.glsl): its body's lampGain, save
// that under the planet lamp the lit planet's own orbit round its star (the one planet row it lights)
// is never drawn: it is the star's, not the piece's (bodyMote.ts trackLampGain).
float trackLampGain(int row) {
  if (int(round(uLamp)) == 1 && bodyKind(row) == KIND_PLANET) return 0.0;
  return lampGain(row);
}

// A body's light: (fix, hi, surge) over its T4 (fixAt, hiAt, hop).
vec3 bodyLight(int row) {
  vec4 t4 = bodyTexel(4, row);
  return nodeLight(t4.x, t4.y, t4.z, uFix, uHighlight);
}

// How far a body has come up by growth.
float bodyPresence(int row) {
  vec4 t3 = bodyTexel(3, row);
  return nodeArrival(t3.z + t3.w, uGrowth, t3.w + NODE_BIRTH_WINDOW);
}

// A body's derp at the ambient, its terms but the scatter's clock scaled by lodGain(Derp); the freeze's
// forced row a scatter FREEZE_SCATTER_S in and nothing else.
Derp bodyDerp(int row, int sys) {
  if (uForcedScatter >= 0.0 && row == int(round(uForcedScatter))) {
    Derp f = derpZero();
    f.scatterS = FREEZE_SCATTER_S;
    return f;
  }
  vec4 t1 = bodyTexel(1, row);
  vec4 t2 = bodyTexel(2, row);
  vec4 t5 = bodyTexel(5, row);
  float omega = t2.z > 0.0 ? MOTE_TAU / t2.z : 0.0;
  float v = 1.0 - bodyLight(row).x;
  Derp d = derp(t5.x, t5.y, uAmbient, bodyKind(row), t1.x, bodyTexel(3, row).y, omega, v);
  float g = sysGain(LOD_DERP, sys) * focusDerp(row);
  d.dNu *= g;
  d.dR *= g;
  d.lift *= g;
  d.wobble *= g;
  d.orbitT *= g;
  d.ghost *= g;
  d.ghostNu *= g;
  return d;
}

// A vector of the galaxy's own frame turned into the world's (bodyWorld's turn, without its anchor).
vec3 turnVec(vec3 p, float t) {
  vec2 sc = moteSinCos(galaxyTurn(t));
  return vec3(p.x * sc.y + p.z * sc.x, p.y, -p.x * sc.x + p.z * sc.y);
}

// p turned about +y by a (x toward z) and pushed dR further out in the plane.
vec3 aboutY(vec3 p, float a, float dR) {
  vec2 sc = moteSinCos(a);
  float x = p.x * sc.y - p.z * sc.x;
  float z = p.x * sc.x + p.z * sc.y;
  float planar = sqrt(x * x + z * z);
  float push = planar > 0.0 ? 1.0 + dR / planar : 1.0;
  return vec3(x * push, p.y, z * push);
}

// Where a body is drawn, its derp on: about its undisturbed host on its own clock, turned, pushed,
// lifted; a star or a core body at its spot; every body offset by the wobble.
vec3 bodyCentre(int row, Derp d, float t) {
  int host = int(round(bodyTexel(3, row).x));
  if (host < 0) return bodyWorld(row, t) + d.wobble;
  vec3 local = aboutY(orbitLocal(bodyTexel(1, row), bodyTexel(2, row), t + d.orbitT), d.dNu, d.dR);
  local.y += d.lift;
  return bodyWorld(host, t) + turnVec(local, t) + d.wobble;
}

// The burst's ghost: on the track at the undisturbed angle plus ghostNu (xyz), at its gain (w).
vec4 bodyGhost(int row, Derp d, float t) {
  int host = int(round(bodyTexel(3, row).x));
  if (host < 0 || !(d.ghost > 0.0)) return vec4(bodyWorld(row, t), 0.0);
  vec3 local = aboutY(orbitLocal(bodyTexel(1, row), bodyTexel(2, row), t), d.ghostNu, 0.0);
  return vec4(bodyWorld(host, t) + turnVec(local, t), BURST_GHOST_GAIN * d.ghost);
}

// A body's scatter event as the shell texture holds it, with derp()'s clock.
ShellEvent bodyShellEvent(int row, float sec) {
  vec4 sweep = shellTexel(6, row);
  ShellEvent ev;
  ev.sec = sec;
  ev.sweep = sweep.xyz;
  ev.aftershock = sweep.w > 0.5;
  ev.shapeA = shellTexel(0, row);
  ev.shapeB = shellTexel(1, row);
  ev.nextA = shellTexel(4, row);
  ev.nextB = shellTexel(5, row);
  return ev;
}

// The level-of-detail gain a body's shell (and its person motes) come in by.
float shellElement(int kind, int sys) {
  if (kind == KIND_MOON) return sysGain(LOD_MOON, sys);
  return kind == KIND_PLANET ? sysGain(LOD_PLANET_SHELL, sys) : 1.0;
}

// A stream's control point: the midpoint moved STREAM_BOW of the chord square to it, toward `bearing`.
vec3 streamControl(vec3 a, vec3 b, float bearing) {
  vec3 d = b - a;
  float len = length(d);
  vec3 mid = 0.5 * (a + b);
  if (!(len > 1e-6)) return mid;
  vec3 t = d / len;
  vec3 ref = abs(t.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 e1 = normalize(cross(t, ref));
  vec3 e2 = cross(t, e1);
  vec2 sc = moteSinCos(bearing);
  return mid + STREAM_BOW * len * (sc.y * e1 + sc.x * e2);
}

// A stream dot (stream.ts StreamDot): where, how far along, and how much of it is drawn.
struct StreamDot {
  vec3 pos;
  float u;
  float presence;
};

// Dot i of the streams texture's row `row` at ambient t, from its parent's place to its child's (the
// feed's far end is `end`), on the stream's Bezier at offset i / n, n one per STREAM_PITCH of chord.
StreamDot streamDot(int row, float i, float t, vec3 end) {
  vec4 s0 = streamTexel(0, row);
  int to = int(round(s0.y));
  vec3 a = bodyWorld(int(round(s0.x)), t);
  vec3 b = to >= 0 ? bodyWorld(to, t) : end;
  vec3 c = streamControl(a, b, streamTexel(1, row).z);
  float n = clamp(length(b - a) / STREAM_PITCH, STREAM_DOTS[0], STREAM_DOTS[1]);
  float k = i / n;
  StreamDot sd;
  sd.u = fract(k + NODE_STREAM_SPEED * t);
  float om = 1.0 - sd.u;
  sd.pos = om * om * a + 2.0 * om * sd.u * c + sd.u * sd.u * b;
  sd.presence = clamp(n - i, 0.0, 1.0);
  return sd;
}

// A stream dot's brightness as a share of a star glow's core: streams · lamp · STREAM_CAP · mix(1, 0.15, u).
float streamGain(float u, float streams, float lamp) {
  return streams * lamp * STREAM_CAP * (STREAM_FADE[0] + (STREAM_FADE[1] - STREAM_FADE[0]) * u);
}

// A feed dot's brightness as a share of a star glow's core: feed · lamp · FEED_CAP, unfaded along it
// (stream.ts feedGain: the feed is re-3's subject, not ambient lineage, galaxy §15.2).
float feedGain(float feed, float lamp) {
  return feed * lamp * FEED_CAP;
}

// The text band's mask on a stream or feed dot (stream.ts streamBandMask): 0 wherever the top of its
// pixel, yTop CSS px from the top of a screen `height` CSS px tall, is at or above the band's margin,
// rising to 1 over the STREAM_BAND_SOFT_PX below it.
float streamBandMask(float yTop, float height) {
  float edge = TEXT_BAND * height + BAND_MARGIN_PX;
  return smoothstep(edge, edge + STREAM_BAND_SOFT_PX, yTop);
}

BodyMoteOut bodyMote(BodyMoteAttrs a) {
  float t = uAmbient;
  int row = a.row;
  int kind = bodyKind(row);
  vec4 t3 = bodyTexel(3, row);
  float R = t3.y;
  bool person = a.role == ROLE_PERSON;
  // A star's dot: its own direction and distance from the centre (in R), in place of a lattice point.
  bool star = kind == KIND_STAR && !person;
  StarDotPolar cloud;
  cloud.ll = a.ll;
  cloud.rho = 1.0;
  if (star) cloud = starDotPolar(a.index, a.seed);

  // 1. The body as drawn: its derp, its light, the fix's v, and where the shell is.
  Derp d = bodyDerp(row, a.sys);
  vec3 light = bodyLight(row);
  float v = 1.0 - light.x;
  vec3 centre = bodyCentre(row, d, t);
  vec4 axisA = shellTexel(2, row);
  vec3 normal = spinShell(shellUnit(cloud.ll), axisA.xyz, t);

  // 2. Where it lands: a star's dot at its distance along its direction, the morph scaling the
  // distance and the scatter flinging it along it.
  vec3 land;
  float k = 0.0;
  if (person) {
    land = centre + R * normal;
  } else {
    uint seed = uint(round(shellTexel(3, row).z));
    uint base = uint(round(a.index)) * SHELL_MOTE_STRIDE;
    vec4 hA = vec4(hash01(seed, base), hash01(seed, base + 1u), hash01(seed, base + 2u), hash01(seed, base + 3u));
    vec4 hB = vec4(hash01(seed, base + 4u), hash01(seed, base + 5u), hash01(seed, base + 6u), hash01(seed, base + 7u));
    ShellEvent ev = bodyShellEvent(row, d.scatterS);
    float g = v * sysGain(LOD_DERP, a.sys);
    float cap = kind == KIND_MOON ? SCATTER_MOON_CAP : SCATTER_AMP_MAX;
    vec4 warp = shellWarpK(cloud.ll, hA, hB, t, ev, axisA.w * g, g, cap);
    vec3 local = warp.xyz;
    if (star) local += (cloud.rho - 1.0) * shellHome(cloud.ll, hB.x, t, ev, axisA.w * g, g);
    land = centre + R * spinShell(local, axisA.xyz, t);
    k = warp.w * g;
  }

  // 3. Where it sets out, through what, and when.
  vec3 j = nodeSpread(a.seed);
  vec3 spawn;
  vec3 ctrl;
  float settle;
  if (person) {
    int piece = kind == KIND_MOON ? int(round(t3.x)) : row;
    float Rp = bodyTexel(3, piece).y;
    spawn = bodyWorld(piece, t) + vec3(0.0, NODE_PERSON_HEIGHT * Rp, 0.0) + NODE_PERSON_SPREAD * Rp * j;
    ctrl = 0.5 * (spawn + land) + vec3(0.0, NODE_PERSON_BOW * Rp, 0.0);
    settle = bodyTexel(4, row).x;
  } else {
    vec3 arrival = vec3(0.0, 1.0, 0.0);
    if (a.host >= 0) {
      vec4 s0 = streamTexel(0, a.host);
      int parent = int(round(s0.x));
      vec3 pa = bodyWorld(parent, t);
      vec3 pb = bodyWorld(int(round(s0.y)), t);
      spawn = pa + NODE_BUILDER_SPREAD * bodyTexel(3, parent).y * j;
      ctrl = streamControl(pa, pb, streamTexel(1, a.host).z);
      vec3 toward = pa - bodyWorld(row, t);
      float len = sqrt(dot(toward, toward));
      if (len > 1e-6) arrival = toward / len;
    } else {
      spawn = centre + vec3(0.0, BODY_FALL_HEIGHT * R, 0.0) + NODE_BUILDER_SPREAD * R * j;
      ctrl = 0.5 * (spawn + land);
    }
    float wrap = 0.5 * (1.0 - dot(normal, arrival));
    settle = nodeSettle(t3.z, t3.w, mix(wrap, a.birth, BODY_BUILD_JITTER));
  }
  float clock = person ? uFix : uGrowth;
  float window = person ? NODE_FIX_WINDOW : NODE_BIRTH_WINDOW;
  float tt = nodeArrival(settle, clock, window);
  float e = 1.0 - (1.0 - tt) * (1.0 - tt) * (1.0 - tt);
  float om = 1.0 - e;

  // 4. Outputs.
  float flare = 1.0 - smoothstep(0.0, NODE_FLARE_WIDTH, abs(clock - settle));
  float lamp = lampGain(row);
  float el = shellElement(kind, a.sys);
  float hi = person ? 0.0 : light.y;
  float surge = person ? 0.0 : light.z;
  FreezeLook look = freezeLook(row, v);
  // A star's dot: its star's brightness, its own gain by its distance, the star's breath.
  float self = 1.0;
  if (star) {
    StarLook sl = bodyStarLook(row);
    self = sl.brightness * exp(-cloud.rho / STAR_FALL) * starBreath(sl.period, sl.phase, t);
  }
  BodyMoteOut o;
  o.pos = om * om * spawn + 2.0 * om * e * ctrl + e * e * land;
  o.normal = normal;
  o.brightness = (mix(1.0 / NODE_SETTLED_BRIGHTNESS, 1.0, tt) + NODE_FLARE_GAIN * flare) * (1.0 + NODE_HI_GAIN * hi + surge) * (1.0 + SCATTER_OUT_GAIN * k) * uShow * lamp * el * look.gain * focusGain(row) * self;
  o.visible = uShow > 0.0 && clock >= settle - window && lamp > 0.0 && el >= LOD_VISIBLE && look.gain > 0.0 ? 1.0 : 0.0;
  o.settled = tt;
  o.hi = max(hi, surge);
  o.warm = person ? 1.0 : light.x * (kind == KIND_MOON ? BODY_WARM_MOON : BODY_WARM);
  o.tint = look.tint;
  o.offPx = look.offPx;
  return o;
}
