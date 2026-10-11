// Settle constants shared by the per-mote attributes (attributes.ts) and mote() (mote.ts, mirrored
// in mote.glsl as MOTE_SETTLE_WINDOW / MOTE_SETTLED_BRIGHTNESS / MOTE_FLARE_WIDTH / MOTE_FLARE_GAIN;
// mote.test.ts compares them).

/**
 * A mote settles as assembly rises through [settle - SETTLE_WINDOW, settle]: it sets out from the
 * shell SETTLE_WINDOW before its settle value. 0.08, so the bicycle's build stages fit end to end
 * inside assembly 0..1 with a lead each (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.2).
 */
export const SETTLE_WINDOW = 0.08;
/** Brightness of a settled mote, as a fraction of its in-flight glow (lighting multiplies on top). */
export const SETTLED_BRIGHTNESS = 0.5;
/**
 * The landing flare: a mote is brightest the instant it lands (assembly at its settle value), by
 * FLARE_GAIN on top of its settled glow, and the flare is gone once assembly is FLARE_WIDTH either
 * side. Every assembly hold in the keyframes sits at least FLARE_WIDTH from every settle value, so
 * nothing flares at rest. 3, not the first 1: at 1 the tube being laid was barely brighter than the
 * laid ones (screen blending saturates the agent blue), so the frame's travelling seam did not read.
 */
export const FLARE_WIDTH = 0.01;
export const FLARE_GAIN = 3.0;
