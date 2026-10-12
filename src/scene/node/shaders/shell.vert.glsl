precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + leak.glsl + shell.glsl + star.glsl + terminator.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The galaxy's shell motes, the person's warm motes and the glow sprites (bodySystem.ts: net-shells,
// net-persons, net-glow), one quad per instance, drawn by galaxyMote.frag.glsl over its body's base
// colour (vBase, the bodies texture's T6: a star's tint, a planet's or moon's colour). A shell or person mote is
// bodyMote(): it flies in from its stream's parent (or falls from above), lands on its body's lattice
// at the equation's radius turned by the body's own spin (a star's dot in its star's cloud), round
// where the body is drawn (its derp on), lights, and goes dark outside the lamp. A star lights itself:
// its dots are not shaded (T6's light mode), and its dots and glow take its brightness and breath. A
// planet's and a moon's shell motes are shaded by their terminator toward their own star (bodyMote's
// brightness, re-skin Task 7), never by the camera's key light. A planet's lattice mote 0 is its point, a 2 px dot at its
// centre (3 px lit), in its colour and never shaded, that comes up with the planet, and is never drawn as a shell mote: once the shell
// shows, that one lattice site is missing from the bubble, so that net-shells stays Σ latticeCount
// (the generator's budget) with the point inside it. A moon's mote 0 is its point too: the whole moon
// while it is a few px across, handing over to its fine-dotted sphere (its other motes and its body)
// as it grows on screen (lod.glsl moonSphereGain), so a small moon is a dot, never a ring. Every shell
// mote is its body's grain on screen (motePx), a moon's as its planet's. What a system shows comes
// in by its projected size (lod.glsl, uSysPx): a planet's point over 10-20 px, its shell over 25-50, a
// moon's over 60-120; a star's and a core body's shell always, but faded into its glow sprite where the body is under a few
// px across (BODY_LOOK.shellFade*). A glow sprite sits at its body's centre, sized by glowPx under its
// own cap (uGlowCap: the CPU keeps the halos apart), and is ember while its body is lit. A neighbourhood
// star's glow, dots and person motes are drawn times its real form's share (bodyScreen.glsl
// bodyHoodReal: the dissolve, re-skin §4.1); its far form is the background's (galaxySystem.ts).

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec2 aLL; // (lat, lon) on its body's lattice, or a person mote's rest point
in vec4 aMote; // body row, NodeRole, system (-1 the core), lattice index (a glow's slot, a person mote's index)
in vec4 aFlight; // its own hash in the landing order, its spread's seed, its stream (a person mote's host), 0

uniform float uGlowCap[GALAXY_GLOW_MAX];
// The freeze frame: the copies' offset direction (the rolled screen x, clip space) and the twos' tick.
uniform vec2 uOffPx;
uniform float uTwos;

out vec2 vUv;
flat out float vType; // 1 the body base colour, toward 0 the person amber (galaxyMote.frag.glsl mixes them)
flat out float vForm; // FORM_POINT, or 3: the glow profile
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a)
flat out vec3 vBase; // the body's base colour (T6)

const int FORM_GLOW = 3;

// A quad of pxCss CSS px at `view`, `look`'s offset along the rolled screen x (a copy's, breathing on
// the twos) and its colour.
void emit(vec4 view, float pxCss, float brightness, int form, float hi, float warm, FreezeLook look) {
  float px = pxCss * uPixelRatio;
  vec4 clip = projectionMatrix * view;
  // The defect's dropout (bodyScreen.glsl): the focused piece's dots in a dark line go out.
  if (dropoutHides(int(round(aMote.x)), clip, 0.5 * pxCss)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  float off = look.offPx + (uCopy > 0.5 ? freezeBreath(uTwos) : 0.0);
  clip.xy += (aCorner * px + 2.0 * uOffPx * off * uPixelRatio) / uViewport * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0 - warm;
  vForm = float(form);
  vBrightness = brightness * look.gain;
  vRadiusPx = 0.5 * px;
  vHi = hi;
  vTint = look.tint;
  vBase = bodyBase(int(round(aMote.x)));
}

// How far a lit planet's point has handed back to its shell, by the planet's size on screen (CSS px across).
float litHandover(float across) {
  return smoothstep(2.0 * LOOK_LIT_POINT_MAX, 4.0 * LOOK_LIT_POINT_MAX, across);
}

// A lit planet's point's diameter (CSS px): LOOK_LIT_POINT of the planet's disc, at least its lit floor and at most LOOK_LIT_POINT_MAX.
float litPointPx(float across) {
  return clamp(LOOK_LIT_POINT * across, max(PX_LIT_PLANET, LOOK_LIT_POINT_MIN), LOOK_LIT_POINT_MAX);
}

void main() {
  int row = int(round(aMote.x));
  int role = int(round(aMote.y));
  int sys = int(round(aMote.z));
  int kind = bodyKind(row);
  // The early-out (re-skin §7): what the late path below would hide is hidden first, before the body's
  // place, its derp and bodyMote(). Below its level of detail (lod.glsl lodSkip), or dark under the lamp
  // (every role's late gain is times lampGain, and bodyMote draws only where it is above 0).
  if (bodyLodSkip(kind, role, aMote.w, sys) || !(lampGain(row) > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  float R = bodyTexel(3, row).y;

  // The body's diameter on screen (CSS px) at its undisturbed place: what a moon's point hands over by.
  vec4 home = toView(bodyWorld(row, uAmbient));
  float across = bodyAcrossAt(row, home);
  // A neighbourhood star's real form's share (re-skin §4.1, the dissolve): its glow, its dots and its
  // person motes are drawn times it, so where it is 0 the early-out hides them here (lod.glsl hoodSkip).
  float real = bodyHoodReal(row, kind, home);
  if (hoodSkip(kind, real)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }

  if (role == ROLE_GLOW || ((kind == KIND_PLANET || kind == KIND_MOON) && role != ROLE_PERSON && aMote.w == 0.0)) {
    // A glow sprite or a planet's or moon's point: at the body as drawn, up with it, lit with it, under the lamp.
    vec3 centre = bodyCentre(row, bodyDerp(row, sys), uAmbient);
    vec3 light = bodyLight(row);
    float hi = max(light.y, light.z);
    float warm = light.x * (kind == KIND_MOON ? BODY_WARM_MOON : BODY_WARM);
    // The freeze frame: a glow outside the held piece dims and greys; a held point is copied (none else).
    FreezeLook look = freezeLook(row, 1.0 - light.x);
    float gain = (look.gain > 0.0 ? bodyPresence(row) * lampGain(row) * uShow * focusGain(row) : 0.0) * real;
    vec4 view = toView(centre);
    if (role == ROLE_GLOW) {
      float focal = 0.5 * uViewport.y * projectionMatrix[1][1] / uPixelRatio;
      float px = glowPx(R, length(view.xyz), focal, uGlowCap[int(round(aMote.w))]);
      if (px <= 0.0 || gain < LOD_VISIBLE) {
        gl_Position = MOTE_HIDDEN;
        return;
      }
      // A lit glow is the light itself: pure ember (galaxyMote.frag.glsl mixes NODE_EMBER_MIX of vHi),
      // its core filled to a crisp disc (vForm 3 + hi). A star's glow takes its brightness and breath,
      // handing them over to the full light as it is lit: a lit star is today's ember disc (re-skin §4.3).
      if (kind == KIND_STAR) {
        StarLook star = bodyStarLook(row);
        gain *= mix(star.brightness * starBreath(star.period, star.phase, uAmbient), 1.0, hi);
      }
      emit(view, px, LOOK_GLOW_BRIGHTNESS * gain, FORM_GLOW, hi / NODE_EMBER_MIX, warm, look);
      vForm = float(FORM_GLOW) + hi;
      return;
    }
    if (kind == KIND_MOON) {
      // A moon's point comes up with the moons and hands over to its sphere as the moon grows on
      // screen: its own disc, ember while lit, as bright as a planet's.
      gain *= shellElement(kind, sys) * (1.0 - moonSphereGain(across));
      if (gain < LOD_VISIBLE) {
        gl_Position = MOTE_HIDDEN;
        return;
      }
      emit(view, moonPointPx(across), LOOK_POINT_BRIGHTNESS * gain * mix(1.0, LOOK_LIT_POINT_GAIN, hi), FORM_POINT, hi / NODE_EMBER_MIX, warm, look);
      return;
    }
    // Lit, the point is an ember disc of LOOK_LIT_POINT of the planet's disc (at least its lit
    // floor), handing back to the lit shell as the planet grows on screen.
    float pointAcross = 2.0 * R * pxPerUnit(view) / uPixelRatio;
    float litPx = litPointPx(pointAcross);
    gain *= sysGain(LOD_PLANET_POINT, sys) * (1.0 - hi * litHandover(pointAcross));
    if (gain < LOD_VISIBLE) {
      gl_Position = MOTE_HIDDEN;
      return;
    }
    emit(view, mix(PX_POINT, litPx, hi), LOOK_POINT_BRIGHTNESS * gain * mix(1.0, LOOK_LIT_POINT_GAIN, hi), FORM_POINT, hi / NODE_EMBER_MIX, warm, look);
    return;
  }

  // The rest of the early-out, on the shell, star and person motes: a star's or core body's shell faded
  // into its glow, a moon's not yet come in over its point (the same gains as below, each alone in its
  // product), or a landed dot of a host-less body certainly off screen (bodyScreen.glsl bodyOffScreen).
  if (((kind == KIND_STAR || kind == KIND_CORE) && smoothstep(LOOK_SHELL_FADE_FROM, LOOK_SHELL_FADE_TO, 0.5 * across) < LOD_VISIBLE) ||
      (kind == KIND_MOON && role != ROLE_PERSON && moonSphereGain(across) < LOD_VISIBLE) || bodyOffScreen(row, role, home)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }

  BodyMoteAttrs a;
  a.row = row;
  a.role = role;
  a.ll = aLL;
  a.birth = aFlight.x;
  a.seed = uint(round(aFlight.y));
  a.host = int(round(aFlight.z));
  a.index = aMote.w;
  a.sys = sys;
  BodyMoteOut o = bodyMote(a);
  float gain = real;
  float bodyPx = 0.5 * across;
  // A star's or core body's shell hands over to its glow sprite as it shrinks under a few px.
  if (kind == KIND_STAR || kind == KIND_CORE) gain *= smoothstep(LOOK_SHELL_FADE_FROM, LOOK_SHELL_FADE_TO, bodyPx);
  // A lit planet's shell is the dust round its ember point while the point stands for it: dimmed to
  // LOOK_LIT_DUST, and none over the point's own disc, where it would only pale the ember toward white
  // (re-skin Task 9, the twelve counted with their shells on). Over the point: the mote's rest normal,
  // seen from the camera, falls within the point's share of the planet's disc on screen, a 1 px soft edge.
  if (kind == KIND_PLANET && role != ROLE_PERSON) {
    float stand = o.hi * (1.0 - litHandover(across));
    float off = length((mat3(viewMatrix) * o.normal).xy);
    float over = 1.0 - smoothstep(-0.5, 0.5, 0.5 * (off * across - litPointPx(across)));
    gain *= mix(1.0, LOOK_LIT_DUST * (1.0 - over), stand);
  }
  // A moon's shell comes in over its point as the moon grows on screen.
  if (kind == KIND_MOON && role != ROLE_PERSON) gain *= moonSphereGain(across);
  if (o.visible < 0.5 || gain < LOD_VISIBLE) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 view = toView(o.pos);
  vec4 dots = shellTexel(3, row);
  float px = motePx(dots.x, pxPerUnit(view) / uPixelRatio);
  // The freeze frame's look is bodyMote's (in o.brightness, o.tint, o.offPx); the held piece's shell
  // motes are inked on the limb by their rest normal, so a flung limb mote keeps its ink.
  FreezeLook look;
  look.gain = 1.0;
  look.offPx = o.offPx;
  look.tint = o.tint;
  if (role == ROLE_PERSON) {
    // The person's warm dust: unshaded, never crowded (a few dozen on a body).
    emit(view, px, LOOK_SHELL_BRIGHTNESS * o.brightness * gain, FORM_POINT, o.hi, o.warm, look);
    return;
  }
  float ink = 1.0;
  if (uHeld.y >= 0.0 && bodyPiece(row) == int(round(uHeld.y))) {
    FreezeLimb limb = freezeLimb(normalize(mat3(viewMatrix) * o.normal), FREEZE_LIMB_LIGHT, uDress * uFocus, int(round(uCopy)));
    look.gain = limb.gain;
    ink = limb.size;
  }
  // No camera light (re-skin Task 7): a star's dots are their own light, and a planet's and a moon's
  // are shaded by their terminator toward their own star, in o.brightness (bodyMote.glsl bodyShade).
  // Their far hemisphere, seen through the lattice, is dimmed (terminator.glsl farSide, on the mote's
  // rest normal as its terminator is, so a scattered or leaking dot keeps its side's light), unless lit.
  float far = 1.0;
  if (kind == KIND_PLANET || kind == KIND_MOON) far = mix(farSide(normalize(mat3(viewMatrix) * o.normal), normalize(-view.xyz), kind == KIND_MOON ? PLANET_MOON_FAR_DIM : PLANET_FAR_DIM), 1.0, o.hi);
  // Where the shell is small on screen its motes overlap: each carries no more than its share of the disc.
  // A lit shell's gain shows where its motes stand apart; where they pile up it is spent within the
  // same share, so a lit disc is the same light in ember, not a white blot.
  float lit = 1.0 + NODE_HI_GAIN * o.hi;
  float density = min(1.0, LOOK_DENSITY * 3.14159265 * bodyPx * bodyPx / (0.5 * max(dots.y, 1.0) * px * px) / lit);
  emit(view, px * ink, LOOK_SHELL_BRIGHTNESS * o.brightness * far * gain * density, FORM_POINT, o.hi, o.warm, look);
}
