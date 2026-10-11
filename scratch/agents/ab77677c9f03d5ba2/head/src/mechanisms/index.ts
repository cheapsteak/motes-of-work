import type { Mechanism } from './types';
import { gears } from './gears';
import { steam } from './steam';
import { strandbeest } from './strandbeest';
import { watch } from './watch';

export const mechanisms = { gears, steam, strandbeest, watch } as const satisfies Record<string, Mechanism>;

export type MechanismId = keyof typeof mechanisms;

/** Every registered mechanism id, in registration order. */
export const MECHANISM_IDS = Object.keys(mechanisms) as MechanismId[];

export function isMechanismId(id: string): id is MechanismId {
  return Object.hasOwn(mechanisms, id);
}
