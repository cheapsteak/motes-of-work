import type { MechanismId } from './mechanisms';

/** The one config line that selects the mechanism (spec §6.3). `?mech=<id>` overrides it in test mode. */
export const ACTIVE_MECHANISM: MechanismId = 'gears';

/** Mote budget on desktop (spec §8). */
export const MOTE_BUDGET_DESKTOP = 100_000;

/** Seed for the mote sample; integer in [0, 2^24). */
export const MOTE_SEED = 1;
