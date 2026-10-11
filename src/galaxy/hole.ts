// The black hole's share of the galaxy's budget (docs/specs/2026-10-09-act-2-reskin.md §7): how many
// dots each of its parts draws. The one home of these counts: the generator reserves their sum
// (generate.ts fitBudget) before the hole is drawn, and the hole's draw (from the re-skin's Task 5)
// takes its instance counts from here.

/**
 * The hole's dots (§7):
 *  - `disk` the accretion disk, and `arch` the underside arc (a second draw of the disk's first dots);
 *  - `ring` the photon ring;
 *  - `jetsPerSide` each jet's dots, two jets;
 *  - `knotSlots` knots a side, each `knotDots` (its `knotCore` core dots and the rest halo);
 *  - `infallSlots` streaks of the in-fall, each a trail of `infallTrail` dots;
 *  - `strand0` R0's strand and `strand1` R1's (§2.1).
 */
export const HOLE_DOTS = {
  disk: 18000,
  arch: 2400,
  ring: 320,
  jetsPerSide: 2400,
  knotSlots: 6,
  knotDots: 64,
  knotCore: 24,
  infallSlots: 18,
  infallTrail: 4,
  strand0: 750,
  strand1: 500,
} as const;

/** Every instance the hole draws: 27,610. */
export function holeInstances(): number {
  const h = HOLE_DOTS;
  return h.disk + h.arch + h.ring + 2 * h.jetsPerSide + 2 * h.knotSlots * h.knotDots + h.infallSlots * h.infallTrail + h.strand0 + h.strand1;
}
