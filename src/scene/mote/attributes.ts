import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import type { BoundPoint, Mechanism, MechanismPart, Role } from '../../mechanisms/types';
import { SETTLE_WINDOW } from './settle';

export enum MoteType {
  Human = 0,
  Agent = 1,
  Dialogue = 2,
}

export const ROLE_INDEX: Record<Role, number> = { core: 0, body: 1, drift: 2 };

export interface MoteAttrs {
  part: number;
  role: number;
  local: Vec3;
  localTwin: Vec3;
  normal: Vec3; // unit, part space, correct variant
  normalTwin: Vec3; // unit, part space, wrong twin
  seed: number;
  settle: number;
  type: [MoteType, MoteType, MoteType]; // [specced, vibed, misallocated]
  visible: [boolean, boolean, boolean];
}

/** The specced core is mostly Human (amber), with Dialogue (violet) accents. */
export const CORE_HUMAN_SHARE = 0.8;

/**
 * The assembly window `[from, to]` in which a role's motes settle, unless a part declares its own.
 * Core: from SETTLE_WINDOW up, so no core mote is part-settled at assembly 0, and done by 0.32, one
 * flare width before the cold open's hold at 0.33 (the spec section holds at 0.34, with the whole
 * core built). 0.32, not the first 0.44: the bicycle's basket needed a stage of its own, and the
 * core, which lands as one group, gave it the room. Body: to 0.97, so the bicycle's fittings, which
 * land last, fit inside it.
 */
export const ROLE_SETTLE: Record<Role, readonly [number, number]> = {
  core: [SETTLE_WINDOW, 0.32],
  body: [0.35, 0.97],
  drift: [0.5, 0.95],
};

/** The window in which a part's motes settle: its own `settle`, else its role's default. */
export function settleWindow(part: MechanismPart): readonly [number, number] {
  return part.settle ?? ROLE_SETTLE[part.role];
}

export function buildMoteAttrs(mech: Mechanism, points: BoundPoint[]): MoteAttrs[] {
  return points.map((p) => {
    const part = mech.parts[p.part];
    const roleName = part.role;
    const [settleFrom, settleTo] = settleWindow(part);
    const h1 = hash01(p.seed, SALT.settle);
    const h2 = hash01(p.seed, SALT.type);
    const h3 = hash01(p.seed, SALT.extra);
    const h4 = hash01(p.seed, SALT.misVisible);

    // A part with a settle field orders its landing by place (read at the correct position; the
    // twin's points map one to one, so they inherit it); any other spreads it by the hash alone.
    const settle = part.settleField ? part.settleField(p.local, h1) : settleFrom + (settleTo - settleFrom) * h1;
    let specced: MoteType;
    let misallocated: MoteType;
    if (roleName === 'core') {
      specced = h2 < CORE_HUMAN_SHARE ? MoteType.Human : MoteType.Dialogue;
      misallocated = MoteType.Agent;
    } else {
      specced = MoteType.Agent;
      misallocated = h2 < 0.3 ? MoteType.Human : MoteType.Agent;
    }

    const extra = roleName === 'body' && h3 < 0.15;
    const misallocatedVisible = extra ? true : roleName === 'core' ? h4 >= 0.5 : true;

    return {
      part: p.part,
      role: ROLE_INDEX[roleName],
      local: p.local,
      localTwin: p.localTwin,
      normal: p.normal,
      normalTwin: p.normalTwin,
      seed: p.seed,
      settle,
      type: [specced, MoteType.Agent, misallocated],
      visible: [!extra, !extra, misallocatedVisible],
    };
  });
}
