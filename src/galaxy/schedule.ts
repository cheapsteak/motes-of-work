// The network's schedule: the values on its clocks that the story depends on, which the generator
// builds to and the keyframes must agree with (design: docs/specs/2026-10-06-act-2-storyboard-and-
// network.md §3.2, and the schedule fence of §6 test 5). Every value is in the units of its clock:
// births on `net.growth`, fixes on `net.fix`, lights on `net.highlight`, the ring on `net.review`.

/**
 * The growth span under df-5 ("Twelve new defects. You fixed one."): over all of it exactly the twelve
 * of `TWELVE` are lit, and no other node carrying the defect is built before its end.
 */
export const G_TWELVE = [0.345, 0.36] as const;

/** The twelve lit under df-5, in the order the highlight reaches them (§2.4). */
export const TWELVE = ['P1', 'C2', 'C3', 'C4', 'P2', 'C5', 'C6', 'P3', 'C8', 'C7', 'C9', 'C10'] as const;

/** `net.highlight` held under df-5: every one of the twelve has its `hiAt` at or below it. */
export const HI_TWELVE = 0.25;

/**
 * `net.fix` held from df-2b's mend to the move into fix: past the first fix (`C1`, 0.08), short of the
 * next (`R0`, 0.46). It holds through spread: the author deleted the second fix (`C5`) that played there.
 */
export const FIX_TWELVE = 0.1;

/**
 * The growth at which `net.fix` passes the incorrect rule's fix (`R0`, 0.46): every node born from
 * here on is clean, whatever it was built from.
 */
export const CLEAN_AFTER = 0.665;

/**
 * The first clean work built straight from the fixed rules (`P7`, from `R0`). No clean child of `R0`
 * or `R1` is born before it, so the correct new work appears under fx-3 ("Now new work built from
 * them is correct"), not while the second rule is still being fixed.
 */
export const CLEAN_WORK_FROM = 0.7;

/** The `hiAt` of every node carrying the defect that is born after the twelve: it lights as it is built. */
export const HI_AT_BIRTH = 0.3;

/** The sweep (fx-4): every swept node's `fixAt` lies in this span of `net.fix`. */
export const SWEEP = [0.64, 0.94] as const;

/** The nine planets the reviewer's ring visits, in birth order (§3.2; `V3`, `V5`, `V7`, `V8`, `V9` cracked). */
export const REVIEW_VISITS = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'] as const;

/**
 * The ring goes (§2.11's review 1.5..2, a ruling of the look pass): `net.review` holds at its last
 * reviewer key until the sweep starts under fx-4, and runs to 2 as the sweep runs, so the ring and
 * its feed are gone before the lesson, whose frame is the network alone. Fix-section locals.
 */
export const RING_OUT: Keys = [
  [0.68, 1.2],
  [0.96, 2],
];

/** The highlight's last fade under fx-4, fix-section locals: done before fx-4's stop, so it is at rest. */
export const HI_OUT: Keys = [
  [0.9, 1],
  [0.96, 0],
];

/** A track as [local progress, value] keys, linear between them and held past either end. */
export type Keys = readonly (readonly [number, number])[];

/**
 * The reviewer section's designed keys (§2.6), section-local: `net.review` (the ring's nine visits
 * over 0..1, then the feed) and `net.growth` under it. The fence of §6 test 7 checks that each visit
 * is built by the time the ring holds on it; the keyframes must carry these values.
 */
export const REVIEWER_KEYS: { review: Keys; growth: Keys } = {
  review: [
    [0.08, 0],
    [0.4, 0.55],
    [0.62, 1],
    [0.7, 1.2],
  ],
  growth: [
    [0, 0.54],
    [0.4, 0.576],
    [0.62, 0.595],
    [1, 0.6],
  ],
};

/** The value of `keys` at `x`. */
export function atKeys(keys: Keys, x: number): number {
  if (x <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [x1, y1] = keys[i];
    if (x <= x1) {
      const [x0, y0] = keys[i - 1];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return keys[keys.length - 1][1];
}

/** The first `x` at which a non-decreasing track reaches `y` (its inverse), or null if it never does. */
export function whenKeys(keys: Keys, y: number): number | null {
  if (y <= keys[0][1]) return keys[0][0];
  for (let i = 1; i < keys.length; i++) {
    const [x1, y1] = keys[i];
    if (y <= y1) {
      const [x0, y0] = keys[i - 1];
      return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
    }
  }
  return null;
}
