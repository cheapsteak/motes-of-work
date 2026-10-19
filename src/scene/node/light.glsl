// GLSL mirror of src/scene/node/light.ts, step for step: when something built lands, where a flight
// sets out about its spot, and how it lights and goes out at its fix, in the network's palette. It has
// no main(), and it is not usable raw: take it from lightLibraryGlsl() in shaderSource.ts (this folder),
// which splices in the generated light constants and the palette (birth.ts) at the marker below and
// puts the mote library (hash01, the SALT constants) before it. bodyMote.glsl (the galaxy) reads it.

// #include LIGHT constants (generated from src/scene/node/birth.ts by shaderSource.ts)

// Step 7 for a body, or a stream by its child's fix, at the clocks fix and highlight:
// (fix, hi, surge). The surge's hop is clamped at NODE_SURGE_MAX_HOP; both lights go out as the fix
// lands.
vec3 nodeLight(float fixAt, float hiAt, float hop, float fix, float highlight) {
  float f = smoothstep(fixAt - NODE_FIX_WINDOW, fixAt, fix);
  float hi = smoothstep(hiAt - NODE_HI_WINDOW, hiAt, highlight) * (1.0 - f);
  float at = NODE_SURGE_FROM + NODE_SURGE_PER_HOP * min(hop, NODE_SURGE_MAX_HOP);
  float surge = hop >= 0.0 ? smoothstep(at - NODE_SURGE_WINDOW, at, highlight) * (1.0 - f) : 0.0;
  return vec3(f, hi, surge);
}

// Where on net.fix the person's motes of a body fixed at fixAt are home (light.ts nodeLanded):
// NODE_PULSE_WINDOW + NODE_FIX_WINDOW before it, so the gold lands, then pulses, then the mend begins.
float nodeLanded(float fixAt) {
  return fixAt - NODE_FIX_WINDOW - NODE_PULSE_WINDOW;
}

// The fix's pulse at fix (light.ts nodePulse): 16 u^2 (1 - u)^2, u the way through NODE_PULSE_WINDOW
// from nodeLanded: up to 1 half way, 0 at both ends.
float nodePulse(float fixAt, float fix) {
  float u = clamp((fix - nodeLanded(fixAt)) / NODE_PULSE_WINDOW, 0.0, 1.0);
  float w = u * (1.0 - u);
  return 16.0 * w * w;
}

// Step 2's landing time for something built at `birth` (0..1) of its body's duration, on growth.
float nodeSettle(float born, float dur, float birth) {
  return born + dur * birth;
}

// Step 2's landing: 0 until `window` before `settle` on `clock`, 1 from `settle`, smoothstepped between.
float nodeArrival(float settle, float clock, float window) {
  return smoothstep(settle - window, settle, clock);
}

// A unit-cube spread from the seed: each axis in [-1, 1).
vec3 nodeSpread(uint seed) {
  return vec3(2.0 * hash01(seed, SALT_NODE_SPREAD_X) - 1.0, 2.0 * hash01(seed, SALT_NODE_SPREAD_Y) - 1.0, 2.0 * hash01(seed, SALT_NODE_SPREAD_Z) - 1.0);
}
