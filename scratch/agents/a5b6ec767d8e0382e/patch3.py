import sys

p = sys.argv[1]
s = open(p).read()
old_start = s.index("  const xt = (-0.18 + 0.04 * (2 * rng() - 1)) * L;")
old_end = s.index("  // The top trace, front edge to back edge")
new = """  // The bolt's scale: the face's height, or 0.55 of its length on a tall face, so the shape keeps its angles.
  const S = Math.min(H, 0.55 * L);
  const xt = (-0.4 + 0.1 * (2 * rng() - 1)) * S;
  // The front trace, top to bottom: (fraction of H from the top, x offset in S from the mouth), a bolt.
  const BOLT = [[0, 0], [0.3, 0.6], [0.5, 0.15], [0.78, 0.8], [1, 0.45]];
  const pv = BOLT.map(([fy, dx], i) => [H / 2 - fy * H, xt + (dx + (i === 0 || i === 4 ? 0 : 0.06 * (2 * rng() - 1))) * S]);
  const xb = pv[4][1];
"""
s = s[:old_start] + new + s[old_end:]
s = s.replace("const qv = [[D / 2, 0], [D / 6, -0.10 * L], [-D / 6, -0.02 * L], [-D / 2, -0.14 * L]];", "const qv = [[D / 2, 0], [D / 6, -0.25 * S], [-D / 6, -0.05 * S], [-D / 2, -0.35 * S]];")
# Piece B leans out about its bottom-outer corner, not down about the crack's foot.
s = s.replace("const theta = 0.14, g0 = 0.04 * U, pivot = [xb, -H / 2];", "const theta = 0.14, g0 = 0.04 * U, pivot = [L / 2, -H / 2];")
open(p, "w").write(s)
print("ok", "const S = Math.min" in s, "pivot = [L / 2" in s)
