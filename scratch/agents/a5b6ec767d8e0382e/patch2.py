import sys

p = sys.argv[1]
s = open(p).read()
# A bold bolt: four segments with jogs of about 0.2 L, a larger wedge, a lip share of a quarter.
old_start = s.index("  const xt = (-0.10 + 0.05 * (2 * rng() - 1)) * L")
old_end = s.index("  const lin = (vs, t) =>")
new = """  const xt = (-0.18 + 0.04 * (2 * rng() - 1)) * L;
  // The front trace, top to bottom: (fraction of H from the top, x offset in L from the mouth), a bolt.
  const BOLT = [[0, 0], [0.3, 0.28], [0.5, 0.08], [0.78, 0.36], [1, 0.22]];
  const pv = BOLT.map(([fy, dx], i) => [H / 2 - fy * H, xt + (dx + (i === 0 || i === 4 ? 0 : 0.03 * (2 * rng() - 1))) * L]);
  const xb = pv[4][1];
  // The top trace, front edge to back edge: a jog, drifting 0.14 L toward -x.
  const qv = [[D / 2, 0], [D / 6, -0.10 * L], [-D / 6, -0.02 * L], [-D / 2, -0.14 * L]];
"""
s = s[:old_start] + new + s[old_end:]
s = s.replace("const theta = (0.10 * H) / (0.5 * L), g0 = 0.03 * U, pivot = [xb, -H / 2];", "const theta = 0.14, g0 = 0.04 * U, pivot = [xb, -H / 2];")
s = s.replace("else m = k % 5 === 0 ? newCrack.lip(k / 5, rng) : newCrack.shift(q, n);", "else m = k % 4 === 0 ? newCrack.lip(k / 4, rng) : newCrack.shift(q, n);")
# A fourth pane: the lone cube from bearing -25, elevation 24.
s = s.replace(
    "so it does not depend on how cubes are arranged.</figcaption></figure>",
    "so it does not depend on how cubes are arranged.</figcaption></figure>\n"
    '<figure><canvas id="d" width="390" height="844"></canvas><figcaption><b>Lone cube, bearing −25, elevation 24</b>: squarer on the front face, more of the top.</figcaption></figure>',
)
s = s.replace(
    "draw('c', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36 }, LONE, 5000, 1);",
    "draw('c', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36 }, LONE, 5000, 1);\n"
    "draw('d', 'new', { bearing: -25, elevation: 24, distance: 1.6, fov: 36 }, LONE, 5000, 1);",
)
open(p, "w").write(s)
print("ok", "BOLT" in s, s.count("draw('"))
