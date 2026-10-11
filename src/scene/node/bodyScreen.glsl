// What the galaxy's draws measure of a body on screen. It is spliced last by withGalaxyLibrary()
// (shaderSource.ts, this folder), after the instance chunk whose toView() and pxPerUnit() it reads.
// GLSL only: the compositions that call it (shell.vert.glsl, body.vert.glsl) have no TS twin, and its
// inputs to mirrored functions, a moon's diameter for lod.glsl's moonSphereGain() and a body's centre
// and reach for lod.glsl's offScreenSkip(), are parity-checked there. bodySystem.ts countSkips()
// counts what bodyOffScreen() skips, from the same twins.

// A body's diameter on screen (CSS px) at `view`, its undisturbed place at the ambient in view space.
float bodyAcrossAt(int row, vec4 view) {
  return 2.0 * bodyTexel(3, row).y * pxPerUnit(view) / uPixelRatio;
}

// A neighbourhood star's real form's share (lod.glsl hoodReal, re-skin §4.1 "Dissolve (late)") at
// `view`, its undisturbed place in view space: by its plain glow at that distance, held up to the beats'
// uHoodHold. Its glow, dots, person motes and spikes are drawn times it; every other body is whole (1).
// A binary's star (a star with a host, re-skin Task 1e) dissolves at its host, the pair's barycentre,
// where the pair's one far star stands: so its two stars and that far star always share 1 between them.
float bodyHoodReal(int row, int kind, vec4 view) {
  if (kind != KIND_STAR) return 1.0;
  int host = int(round(bodyTexel(3, row).x));
  vec4 at = host >= 0 ? toView(bodyWorld(host, uAmbient)) : view;
  return hoodReal(hoodGlowPx(length(at.xyz), 0.5 * uViewport.y * projectionMatrix[1][1] / uPixelRatio), uHoodHold);
}

// A body's diameter on screen (CSS px) at its undisturbed place at the ambient: a moon hands over from
// its point to its dotted sphere by it, its shell motes, its point and its icosphere alike.
float bodyAcross(int row) {
  return bodyAcrossAt(row, toView(bodyWorld(row, uAmbient)));
}

// The early-out's off-screen half (lod.glsl offScreenSkip, re-skin §7): whether a `role` mote of `row`,
// whose undisturbed centre is at `view`, is certainly off screen. Only a landed mote (on growth past its
// body's build, a person mote past its fix: a flight crosses systems) of a body with no host (a star, a
// core body: it moves only by its shiver, HOSTLESS_REACH bounds its dots), and never in the freeze
// frame's copies (they are offset on screen). A planet or moon off screen is its system's: its size
// there is 0 (bodySystem.ts onScreen), and lodSkip hides it.
bool bodyOffScreen(int row, int role, vec4 view) {
  vec4 t3 = bodyTexel(3, row);
  if (int(round(t3.x)) >= 0 || uCopy > 0.5) return false;
  bool landed = role == ROLE_PERSON ? uFix >= bodyTexel(4, row).x + NODE_FIX_WINDOW : uGrowth >= t3.z + t3.w + NODE_BIRTH_WINDOW;
  if (!landed) return false;
  float fx = 0.5 * uViewport.x * projectionMatrix[0][0] / uPixelRatio;
  float fy = 0.5 * uViewport.y * projectionMatrix[1][1] / uPixelRatio;
  vec4 clip = projectionMatrix * view;
  vec2 css = vec2(clip.x / clip.w + 1.0, 1.0 - clip.y / clip.w) * 0.5 * uViewport / uPixelRatio;
  float reach = offScreenReachPx(view.xyz, HOSTLESS_REACH * t3.y, fx, fy, shellTexel(3, row).x);
  return offScreenSkip(css, reach, uViewport.x / uPixelRatio, uViewport.y / uPixelRatio);
}
