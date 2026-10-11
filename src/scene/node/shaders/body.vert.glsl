precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The galaxy's bodies (bodySystem.ts: net-bodies): one icosphere per body but a star, where it is drawn (its derp
// on), scaled by its radius and bent by its shell's equation (the morph, at A·v·gain, from the vertex's
// own lattice point: the spin undone), and after them a ghost per planet or moon that carries the
// defect: the burst's dim double, on its track at its undisturbed angle plus ghostNu, at
// BURST_GHOST_GAIN of the ghost's gain, drawn only while a burst slot holds it. The geometry holds both
// spheres, 320 triangles (aPart 0) and 80 (aPart 1): a moon draws the small one, every other body the
// large, and each collapses the other's vertices. A core body is drawn at every level (a star draws none: re-skin §4.3); a
// planet fades in with its shell (25-50 px), a moon with the moons (60-120 px) and over its point as
// it grows on screen (lod.glsl moonSphereGain of bodyScreen.glsl bodyAcross, as its shell motes in
// shell.vert.glsl); each comes up with its build and goes dark outside the lamp. body.frag.glsl shades
// the rim over the faint fill, a moon's as its planet's, ember while lit (BODY_HI_GAIN brighter),
// tinted toward the person's amber once fixed.

in vec3 position; // unit icosphere vertex
in float aPart; // 0 the 320-triangle sphere, 1 the 80-triangle one
in vec3 aBody; // body row, system (-1 the core), 1 for a ghost

// The freeze frame: the copies' offset direction (the rolled screen x, clip space) and the twos' tick.
uniform vec2 uOffPx;
uniform float uTwos;

out vec3 vNormal; // view space
out vec3 vToEye; // view space
flat out float vFill;
flat out float vGain;
flat out float vHi;
flat out float vWarm;
flat out vec4 vTint; // the freeze frame's colour (rgb) and how far toward it (a)

void main() {
  int row = int(round(aBody.x));
  int sys = int(round(aBody.y));
  bool ghost = aBody.z > 0.5;
  int kind = bodyKind(row);
  bool moon = kind == KIND_MOON;
  float gain = shellElement(kind, sys) * bodyPresence(row) * lampGain(row);
  if (moon) gain *= moonSphereGain(bodyAcross(row));
  if ((aPart > 0.5) != moon || gain < LOD_VISIBLE) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  Derp d = bodyDerp(row, sys);
  vec3 light = bodyLight(row);
  // The freeze frame: the held piece's bodies (its ghost too) are copied and flash, the rest dims and greys.
  FreezeLook look = freezeLook(row, 1.0 - light.x);
  if (!(look.gain > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec3 centre;
  if (ghost) {
    vec4 g = bodyGhost(row, d, uAmbient);
    gain *= g.w;
    if (gain < LOD_VISIBLE) {
      gl_Position = MOTE_HIDDEN;
      return;
    }
    centre = g.xyz;
  } else {
    centre = bodyCentre(row, d, uAmbient);
  }
  // The morph on the mesh: the vertex's own lattice point, its spin undone, on the shell's shape.
  vec4 axisA = shellTexel(2, row);
  vec3 u = spinShell(position, axisA.xyz, -uAmbient);
  vec2 ll = vec2(asin(clamp(u.y, -1.0, 1.0)), atan(u.z, u.x));
  float r = morphR(ll, uAmbient, shellTexel(0, row), shellTexel(1, row), axisA.w * (1.0 - light.x) * sysGain(LOD_DERP, sys));
  float R = bodyTexel(3, row).y;
  vec4 view = toView(centre + R * r * position);
  vec4 clip = projectionMatrix * view;
  float off = look.offPx + (uCopy > 0.5 ? freezeBreath(uTwos) : 0.0);
  clip.xy += 2.0 * uOffPx * off * uPixelRatio / uViewport * clip.w;
  gl_Position = clip;
  vNormal = mat3(viewMatrix) * position;
  vToEye = -view.xyz;
  vFill = LOOK_FILL;
  vHi = max(light.y, light.z);
  vGain = gain * uShow * (1.0 + BODY_HI_GAIN * vHi) * look.gain * focusGain(row);
  vWarm = light.x * (moon ? BODY_WARM_MOON : BODY_WARM);
  vTint = look.tint;
}
