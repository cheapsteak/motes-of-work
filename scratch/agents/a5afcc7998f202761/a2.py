import re

p = 'src/scene/mote/mote.test.ts'
s = open(p).read()
a = """  it('a landing mote flares for 0.01 of assembly either side of its settle value, by one flight glow', () => {
    expect(FLARE_WIDTH).toBe(0.01);
    expect(FLARE_GAIN).toBe(1);"""
b = """  it('a landing mote flares for 0.01 of assembly either side of its settle value, by three flight glows', () => {
    expect(FLARE_WIDTH).toBe(0.01);
    expect(FLARE_GAIN).toBe(3);"""
assert a in s
s = s.replace(a, b)
open(p, 'w').write(s)

p = 'src/scene/mote/settle.ts'
s = open(p).read()
a = """ * side. Every assembly hold in the keyframes sits at least FLARE_WIDTH from every settle value, so
 * nothing flares at rest."""
b = """ * side. Every assembly hold in the keyframes sits at least FLARE_WIDTH from every settle value, so
 * nothing flares at rest. 3, not the first 1: at 1 the tube being laid was barely brighter than the
 * laid ones (screen blending saturates the agent blue), so the frame's travelling seam did not read."""
assert a in s
s = s.replace(a, b)
open(p, 'w').write(s)
