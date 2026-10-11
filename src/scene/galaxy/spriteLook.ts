// The background sprites' look values (docs/specs/2026-10-09-act-2-reskin.md §4.1, §4.6), in a module
// that loads no GLSL: the galaxy system (galaxySystem.ts, which re-exports them as their home) draws
// with them, and the stars' look (src/scene/node/classLook.ts STAR_LOOK.amber) reads the warm tint,
// which the e2e clearance twins import under Playwright, whose loader cannot load `?raw` shader files.

/**
 * A background star's tint (§4.1, §4.6): the agents' blue (NODE_PALETTE), or for a warm star (a
 * negative brightness) mixed `warmMix` of the way toward `warm`. The keys are the galaxy tuner's
 * sprite keys, so its "Copy values" line pastes in.
 */
export const STAR_TINT = { warm: '#FFD9A0', warmMix: 0.85 } as const;

/**
 * The core's haze (§4.1, §4.6; the tuner's keys): one sprite `hazePx` CSS px across at brightness
 * `hazeGain`, warm while `hazeWarm` is 1 (stored as a negative brightness and mixed fully to
 * STAR_TINT.warm). It is drawn × `net.haze`, the story leaf that is up only at the galaxy wides (§5).
 */
export const HAZE = { hazePx: 64, hazeGain: 0.35, hazeWarm: 1 } as const;
