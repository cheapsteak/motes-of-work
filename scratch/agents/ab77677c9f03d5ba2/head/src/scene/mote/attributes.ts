import { hash01 } from '../../math/hash';
import { SALT } from '../../math/salts';
import type { Vec3 } from '../../math/vec';
import type { BoundPoint, Mechanism, Role } from '../../mechanisms/types';

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

export function buildMoteAttrs(mech: Mechanism, points: BoundPoint[]): MoteAttrs[] {
  return points.map((p) => {
    const roleName = mech.parts[p.part].role;
    const h1 = hash01(p.seed, SALT.settle);
    const h2 = hash01(p.seed, SALT.type);
    const h3 = hash01(p.seed, SALT.extra);
    const h4 = hash01(p.seed, SALT.misVisible);

    let settle: number;
    let specced: MoteType;
    let misallocated: MoteType;
    if (roleName === 'core') {
      settle = 0.05 + 0.4 * h1;
      specced = h2 < 0.55 ? MoteType.Human : MoteType.Dialogue;
      misallocated = MoteType.Agent;
    } else {
      settle = roleName === 'body' ? 0.35 + 0.6 * h1 : 0.5 + 0.45 * h1;
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
