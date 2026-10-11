p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:80]
    s = s.replace(a, b); n += 1
# the twelve shot frames all three stars; the neighbourhood shot frames the core and the stars together so the streams converge in frame
rep("twelve: { b: -10, e: 74, d: 58, fov: 40, t: [0, 0, 0] },", "twelve: { b: -10, e: 74, d: 84, fov: 40, t: [0, 0, 0] },")
rep("hood: { b: 0, e: 82, d: 120, fov: 40, t: [0, 0, 0] },", "hood: { b: 0, e: 84, d: 150, fov: 40, t: [0, 0, 0] },")
rep("c.t = MODE === 'galaxy' ? [0, 0, 0] : MODE === 'system' ? worldOf(stars[3], t) : MODE === 'twelve' ? cen(stars.slice(0, 3)) : cen(stars);",
    "const hc = cen(stars); c.t = MODE === 'galaxy' ? [0, 0, 0] : MODE === 'system' ? worldOf(stars[3], t) : MODE === 'twelve' ? cen(stars.slice(0, 3)) : hc.map((v) => v * 0.55);")
# streams from the core are drawn only when the core is in the frame (the neighbourhood shot, and the end of the zoom), never into the band
rep("const gk = n.layer === 'rule' ? (MODE === 'galaxy' ? 0 : 0.6) : n.layer === 'plan' ? gains(p).track : gains(p).moon; if (gk < 0.05) continue;",
    "const gk = n.layer === 'rule' ? (MODE === 'hood' || (MODE === 'zoom' && zoom > 0.82) ? 0.6 : 0) : n.layer === 'plan' ? gains(p).track : gains(p).moon; if (gk < 0.05) continue;")
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
