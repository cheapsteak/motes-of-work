import sys
p = sys.argv[1]
s = open(p).read()
# 1. Three panes.
old_fig = s[s.index('<figure><canvas id="b"'):s.index('</figure>', s.index('<figure><canvas id="b"')) + len('</figure>')]
new_fig = (
    '<figure><canvas id="b" width="390" height="844"></canvas><figcaption><b>Proposed, on C1 as it is</b>: N8 (bearing −35, elev 22, d 1.6), '
    'the diagonal zig-zag crack wrapping over the top edge, piece B tilted about the crack\'s foot (a wedge: open at the mouth, hairline at the foot), '
    'the crack cube sampled 8× dense (CRACK_DENSITY, as the rule heroes are), the rest of the stack at 0.3.</figcaption></figure>\n'
    '<figure><canvas id="c" width="390" height="844"></canvas><figcaption><b>Proposed, on a lone cube</b> (0.42 a side, 5,000 motes, the same shot, '
    'nothing round it): the treatment is in the cube\'s own frame, so it does not depend on how cubes are arranged.</figcaption></figure>'
)
s = s.replace(old_fig, new_fig)
# 2. motes(mode, boxes, count, dense)
old_start = s.index('function motes(mode)')
old_end = s.index('// ---- Camera')
new = '''function motes(mode, boxes, count, dense) {
  const rng = mulberry32(0x5a17c0de), out = [];
  const crackIx = boxes.length - 1;
  const areas = boxes.map((b, i) => 2 * (b.s[0] * b.s[1] + b.s[1] * b.s[2] + b.s[0] * b.s[2]) * (i === crackIx ? dense : 1));
  const total = areas.reduce((a, c) => a + c, 0);
  const newCrack = mode === 'new' ? makeNew(boxes[crackIx], mulberry32(7)) : null;
  let k = 0;
  for (let i = 0; i < count; i++) {
    let r = rng() * total, bi = 0; for (; bi < boxes.length; bi++) { r -= areas[bi]; if (r < 0) break; } bi = Math.min(bi, crackIx);
    const b = boxes[bi]; let { q, n } = surfacePoint(b, rng); let m = { q, n, lip: false, cube: bi === crackIx };
    if (bi === crackIx) {
      if (mode === 'old') m = crackOld(b, q, n, k);
      else m = k % 5 === 0 ? newCrack.lip(k / 5, rng) : newCrack.shift(q, n);
      k++;
    }
    out.push({ p: toWorld(b, m.q), n: yawTurn(m.n, b.yaw), lip: m.lip, cube: m.cube });
  }
  return out;
}
const LONE = [{ c: [0, 0, 0], s: [0.42, 0.42, 0.42], yaw: -0.185 }];
'''
s = s[:old_start] + new + s[old_end:]
s = s.replace("function draw(id, mode, shot) {", "function draw(id, mode, shot, boxes, count, dense) {")
s = s.replace("const target = BOXES[CRACK].c;", "const target = boxes[boxes.length - 1].c;")
s = s.replace("const ms = motes(mode).map(", "const ms = motes(mode, boxes, count, dense).map(")
s = s.replace(
    "draw('a', 'old', { bearing: -10, elevation: 16, distance: 2.6, fov: 36 });",
    "draw('a', 'old', { bearing: -10, elevation: 16, distance: 2.6, fov: 36 }, BOXES, 8000, 1);",
)
s = s.replace(
    "draw('b', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36, focus: 0.3 });",
    "draw('b', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36, focus: 0.3 }, BOXES, 8000, 8);\n"
    "draw('c', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36 }, LONE, 5000, 1);",
)
open(p, 'w').write(s)
print('ok', s.count('draw('))
