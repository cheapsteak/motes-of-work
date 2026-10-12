from pathlib import Path
r = Path('.')
p = r/'src/scene/mote/reflow.test.ts'
s = p.read_text()
s = s.replace("import { firstStack, type Box } from '../../network/cluster';", "import { boxCorners, firstStack, type Box } from '../../network/cluster';")
old = "describe('the reflow at 1 (test 1: the target)', () => {\n"
new = old + """  it("measures the boxes the network draws: every corner from cluster.ts lies on its box's surface", () => {
    // Binds this oracle's yaw convention (and so the mirrors it checks) to the boxes the node set draws.
    for (const b of boxes) for (const c of boxCorners(b)) expect(Math.abs(sdf(c, b))).toBeLessThan(1e-9);
  });

"""
assert old in s; s = s.replace(old, new, 1); p.write_text(s)

p = r/'src/scene/mote/stack.ts'
s = p.read_text()
old = "export const STACK: Readonly<StackConstants> = build();"
new = """/** Frozen to the leaves, so neither mirror can drift from what shaderSource.ts spliced at load. */
function deepFreeze<T>(v: T): T {
  if (v && typeof v === 'object') {
    for (const x of Object.values(v)) deepFreeze(x);
    Object.freeze(v);
  }
  return v;
}

export const STACK: Readonly<StackConstants> = deepFreeze(build());"""
assert old in s; s = s.replace(old, new); p.write_text(s)

p = r/'src/timeline/keyframes.test.ts'
s = p.read_text()
old = """    for (let i = 0; i <= 20_000 && i / 20_000 < at('zoom-out', 0); i++) {
      const s = sampler.sample(i / 20_000);
      if (s.mech.assembly > 0) expect(s.stage.motes, `progress ${i / 20_000}`).toBeGreaterThanOrEqual(0.9);
      if (s.sheet.opacity === 0 && i / 20_000 < at('spec', 0)) expect(s.stage.motes).toBe(1);
    }"""
new = """    const end = at('zoom-out', 0);
    for (let i = 0; i < 20_000; i++) {
      const p = (i / 20_000) * end;
      const s = sampler.sample(p);
      if (s.mech.assembly > 0) expect(s.stage.motes, `progress ${p}`).toBeGreaterThanOrEqual(0.9);
      if (s.sheet.opacity === 0 && p < at('spec', 0)) expect(s.stage.motes).toBe(1);
    }"""
assert old in s; s = s.replace(old, new); p.write_text(s)
print('ok')
