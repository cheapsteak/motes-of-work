// The bike's part groups (docs/specs/2026-10-07-galaxy-orbits.md §14.3): which body of its piece of
// work each part becomes when Act II's reflow carries the bike into a planet and seven moons. Beside
// the bike, so the galaxy generator (N0's moon radii, from each group's share of the parts) and the
// mote mirror's caller (moteSystem.ts, the part texture's fourth channel) read one table.
import type { Mechanism } from '../types';

/** A part group: 0 the planet N0, 1-7 its moons (galaxy §14.3). */
export type PartGroup = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * The bike's parts by the body each reflows onto (galaxy §14.3): the frame is the planet itself, and
 * the ground and the loose bolts, the stage and the build's debris, fall into it as its dust; the two
 * wheels are a moon each; the steering, the drivetrain, the saddle, the basket and the fittings are
 * one moon each. The chain's links (`chain-00` ...) are the drivetrain's (partGroupOf); a part of any
 * other machine is the planet's.
 */
export const PART_GROUP: Readonly<Record<string, PartGroup>> = Object.freeze({
  frame: 0,
  ground: 0,
  'loose-bolts': 0,
  'front-wheel': 1,
  'rear-wheel': 2,
  fork: 3,
  handlebars: 3,
  cranks: 4,
  'pedal-left': 4,
  'pedal-right': 4,
  saddle: 5,
  basket: 6,
  'mudguard-front': 7,
  'mudguard-rear': 7,
  'brake-front': 7,
  'brake-rear': 7,
});

/** The body part `id` reflows onto: PART_GROUP's, the drivetrain's for a chain link, else the planet. */
export function partGroupOf(id: string): PartGroup {
  return PART_GROUP[id] ?? (/^chain-\d+$/.test(id) ? 4 : 0);
}

/** Every part's group, in part order: what the part texture's fourth channel carries. */
export function partGroups(mech: Pick<Mechanism, 'parts'>): PartGroup[] {
  return mech.parts.map((p) => partGroupOf(p.id));
}
