import os
os.chdir('.')

def rep(p, old, new):
    s = open(p).read()
    assert s.count(old) == 1, (p, old[:60])
    open(p, 'w').write(s.replace(old, new))

rep('src/mechanisms/types.ts', """  settleField?: (local: Vec3, h: number) => number;
}""", """  settleField?: (local: Vec3, h: number) => number;
  /**
   * How the part closes its exploded offset over its window: given `x`, how far assembly is through
   * the window (0 as its first mote sets out, 1 as its last lands), how far it has come together (0
   * fully exploded, 1 in its pose). It must be 0 at x = 0 and 1 at x = 1, so the part is still
   * exploded before its window and exactly posed after it (the contract test checks it); in between
   * it may hold, fall and rebound (the bicycle's basket hovers, drops onto the fork and hops). Omitted
   * means the motes' smoothstep. Pure.
   */
  arrival?: (x: number) => number;
}""")

rep('src/scene/mote/partTransforms.ts', """/**
 * How far one part has come together at `assembly`, 0 to 1. A part closes over its own settle
 * window, from the moment its first mote sets out (`from - SETTLE_WINDOW`) to the moment its last
 * lands (`to`), with the motes' smoothstep, so it arrives with its motes: a part whose window has
 * ended sits exactly in its pose, and a part whose window has not begun stays fully exploded.
 */
export function partAssembly(part: MechanismPart, assembly: number): number {
  const [from, to] = settleWindow(part);
  const lo = from - SETTLE_WINDOW;
  const x = Math.min(1, Math.max(0, (assembly - lo) / (to - lo)));
  return x * x * (3 - 2 * x);
}""", """/**
 * How far one part has come together at `assembly`: 0 exploded, 1 in its pose. A part closes over
 * its own settle window, from the moment its first mote sets out (`from - SETTLE_WINDOW`) to the
 * moment its last lands (`to`), with the motes' smoothstep or its own `arrival` curve, so it arrives
 * with its motes: a part whose window has ended sits exactly in its pose, and a part whose window has
 * not begun stays fully exploded.
 */
export function partAssembly(part: MechanismPart, assembly: number): number {
  const [from, to] = settleWindow(part);
  const lo = from - SETTLE_WINDOW;
  const x = Math.min(1, Math.max(0, (assembly - lo) / (to - lo)));
  if (part.arrival) return x === 0 ? 0 : x === 1 ? 1 : part.arrival(x);
  return x * x * (3 - 2 * x);
}""")

# partTransforms test: monotone only for the default curve; an own arrival is checked by the contract.
rep('src/scene/mote/partTransforms.test.ts', """  it('closes each part monotonically over its window', () => {
    for (const part of mech.parts) {""", """  it('closes each part on the default curve monotonically over its window', () => {
    for (const part of mech.parts) {
      if (part.arrival) continue; // its own curve may hold and rebound: the contract test bounds it""")

rep('src/scene/mote/partTransforms.test.ts', """describe('the scene steer', () => {""", """describe('a part with its own arrival curve', () => {
  const base = mechanisms.gears.parts[0];
  const hop = (x: number) => (x < 0.5 ? 0 : 1 - 0.2 * Math.sin(Math.PI * (2 * x - 1)));
  const part = { ...base, settle: [0.5, 0.6] as const, arrival: hop };

  it('follows the curve through its window, and is exploded before it and posed after it, whatever the curve says at its ends', () => {
    const lo = 0.5 - SETTLE_WINDOW;
    const x = (a: number) => (a - lo) / (0.6 - lo);
    for (const a of [0.45, 0.5, 0.55, 0.58]) expect(partAssembly(part, a), `assembly ${a}`).toBeCloseTo(hop(x(a)), 12);
    expect(partAssembly({ ...part, arrival: () => 0.5 }, lo)).toBe(0);
    expect(partAssembly({ ...part, arrival: () => 0.5 }, 0.6)).toBe(1);
    expect(partAssembly(part, 0.3)).toBe(0);
    expect(partAssembly(part, 0.9)).toBe(1);
  });
});

describe('the scene steer', () => {""")

rep('src/mechanisms/contract.test.ts', """  it('pose returns one transform per part, deterministically and independent of call order', () => {""", """  it('any arrival curve starts exploded, ends in the pose and stays finite and near the path between', () => {
    for (const p of m.parts) {
      if (!p.arrival) continue;
      expect(p.arrival(0), `${p.id} arrival at 0`).toBeCloseTo(0, 12);
      expect(p.arrival(1), `${p.id} arrival at 1`).toBeCloseTo(1, 12);
      for (let i = 0; i <= 1000; i++) {
        const v = p.arrival(i / 1000);
        expect(Number.isFinite(v), p.id).toBe(true);
        // A rebound may run a little past either end of the path, never far.
        expect(v, `${p.id} arrival`).toBeGreaterThanOrEqual(-0.25);
        expect(v, `${p.id} arrival`).toBeLessThanOrEqual(1.25);
      }
    }
  });

  it('pose returns one transform per part, deterministically and independent of call order', () => {""")

rep('docs/adding-a-mechanism.md', """  window has ended, while later parts stay exploded. Keep the core's offsets modest: the spec section frames
  the assembled core, and a test checks it fits.""", """  window has ended, while later parts stay exploded. Keep the core's offsets modest: the spec section frames
  the assembled core, and a test checks it fits. By default the offset closes on a smoothstep; a part may
  give its own `arrival(x)` curve instead (0 at the window's start, 1 at its end; in between it may hold,
  fall and rebound a little), as the bicycle's basket does to hover, drop onto the fork and settle.""")
print('ok')
