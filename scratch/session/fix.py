p='src/scene/mote/attributes.test.ts'
s=open(p).read()
s=s.replace("  it('matches the pre-window formulas exactly when no part declares settle', () => {","  // `to - from` rounds differently from the old literal spans (0.95 - 0.35 vs 0.6), so a value can differ\n  // by one double-precision ULP (~1e-16); the GPU attribute is float32, which that never reaches.\n  it('matches the pre-window formulas when no part declares settle', () => {")
s=s.replace("expect(a.settle).toBe(legacySettle(mech.parts[points[i].part].role, points[i].seed));","expect(a.settle).toBeCloseTo(legacySettle(mech.parts[points[i].part].role, points[i].seed), 12);")
s=s.replace('it("puts every mote of a part with settle [0.6, 0.7] inside that window and leaves other parts alone", () => {',"it('puts every mote of a part with settle [0.6, 0.7] inside that window and leaves other parts alone', () => {")
open(p,'w').write(s)
p='docs/adding-a-mechanism.md'
s=open(p).read()
old="   each role, with optional fixed shares) is the one to copy.\n"
assert old in s
s=s.replace(old,"   each role, with optional fixed shares) is the one to copy. A part may set `settle: [from, to]` to control\n   when its motes land; it must stay inside its role's default window.\n")
open(p,'w').write(s)
