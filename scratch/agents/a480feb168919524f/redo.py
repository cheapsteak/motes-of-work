p='src/mechanisms/contract.test.ts'
s=open(p).read()
s=s.replace("import { transformDistance } from '../math/transform';\n","import { transformDistance } from '../math/transform';\nimport { ROLE_SETTLE } from '../scene/mote/attributes';\n",1)
new="""  it('any declared settle window is non-empty and inside its role default', () => {
    for (const p of m.parts) {
      if (!p.settle) continue;
      const [from, to] = p.settle;
      const [lo, hi] = ROLE_SETTLE[p.role];
      expect(from, `${p.id} settle from < to`).toBeLessThan(to);
      expect(from, `${p.id} settle starts inside the ${p.role} window`).toBeGreaterThanOrEqual(lo);
      expect(to, `${p.id} settle ends inside the ${p.role} window`).toBeLessThanOrEqual(hi);
    }
  });

"""
marker="  it('pose returns one transform"
assert marker in s
s=s.replace(marker,new+marker,1)
open(p,'w').write(s)

p='src/mechanisms/types.ts'
s=open(p).read()
old="  explodedOffset: PartTransform;\n}"
assert old in s
s=s.replace(old,"""  explodedOffset: PartTransform;
  /**
   * The assembly window `[from, to]` in which this part's motes settle: each mote's settle value is
   * `from + (to - from) * h`, with `h` a per-mote hash in [0, 1). Omitted means the role default
   * (`ROLE_SETTLE` in `src/scene/mote/attributes.ts`). It must stay inside that default window; the
   * mechanism contract test checks it. A mote of the part is fully settled once assembly >= `to`.
   */
  settle?: readonly [number, number];
}""",1)
open(p,'w').write(s)

p='src/scene/mote/attributes.ts'
s=open(p).read()
def rep(a,b):
    global s
    assert a in s, a
    s=s.replace(a,b,1)
rep("import type { BoundPoint, Mechanism, Role }","import type { BoundPoint, Mechanism, MechanismPart, Role }")
rep("""/** Core motes settle by this assembly (the spec section stops at 0.45 with the whole core built). */
const CORE_SETTLED_BY = 0.45;
""","""
/**
 * The assembly window `[from, to]` in which a role's motes settle, unless a part declares its own.
 * Core: from SETTLE_WINDOW up, so no core mote is part-settled at assembly 0, and done by 0.45 (the
 * spec section stops there with the whole core built).
 */
export const ROLE_SETTLE: Record<Role, readonly [number, number]> = {
  core: [SETTLE_WINDOW, 0.45],
  body: [0.35, 0.95],
  drift: [0.5, 0.95],
};

/** The window in which a part's motes settle: its own `settle`, else its role's default. */
export function settleWindow(part: MechanismPart): readonly [number, number] {
  return part.settle ?? ROLE_SETTLE[part.role];
}
""")
rep("    const roleName = mech.parts[p.part].role;\n","    const part = mech.parts[p.part];\n    const roleName = part.role;\n    const [settleFrom, settleTo] = settleWindow(part);\n")
rep("    let settle: number;\n","    const settle = settleFrom + (settleTo - settleFrom) * h1;\n")
rep("      // From SETTLE_WINDOW up, so no core mote is part-settled at assembly 0.\n      settle = SETTLE_WINDOW + (CORE_SETTLED_BY - SETTLE_WINDOW) * h1;\n","")
rep("      settle = roleName === 'body' ? 0.35 + 0.6 * h1 : 0.5 + 0.45 * h1;\n","")
open(p,'w').write(s)
