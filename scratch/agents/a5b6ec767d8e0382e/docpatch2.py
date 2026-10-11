import sys

p = sys.argv[1]
s = open(p).read()


def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)


# §2.0: the draws are by node row, so GLSL can repeat them.
rep(
    "Every random draw is `hash01(node seed,\nSALT_CRACK_*)` (new salts in `src/math/salts.ts`), so it is deterministic from the node's seed and the\nsame on every load.",
    "Every random draw is `hash01(node row,\nSALT_CRACK_*)` (new salts in `src/math/salts.ts`; the node's row in the texture, which both mirrors\nhave), so it is deterministic from the node and the same on every load, in TypeScript and in GLSL.",
)

# §2.4: node() untouched; the crack pair changes.
rep(
    "path that stays within 0.7 % of the arc: no new shader step, and node.glsl/node.ts are untouched by\n§2. The warm motes land on it as it closes, as §3.7 says.",
    "path that stays within 0.7 % of the arc: no new step in node(), and node.glsl/node.ts are untouched by\n§2. The pair that does change is crack.ts and its GLSL mirror crack.glsl (§2.5). The warm motes land on it\nas it closes, as §3.7 says.",
)

# §2.5 rewritten around what is in the tree.
i = s.index("### 2.5 The cube's translucent body (§12), split along the crack")
j = s.index("### 2.6 Why it vanishes from far away")
new_25 = r"""### 2.5 The cube's translucent body (§12), split along the crack

§12.1's bodies are in the tree (Task 8, in progress as this is written): a cracked stack's crack cube is
**two body instances, one per lip** (`BoxAttrs.side` ±1), each shifted half the gap off the plane while
the crack is open (`box.glsl` / `box.ts` step 3) and **cut by the fragment shader to its own side**
(`vSide · crackLevel(vQ) < 0` discards), through **`crack.glsl`, the GLSL mirror of `crackLevel` and
`crackGap` in `crack.ts`**, its constants generated from `CRACK`, held to the TypeScript by the box parity
mode (`?lib=box`, `e2e/parity.spec.ts`). So the surface already lives in both languages, and the design
goes into that pair rather than into a TypeScript clip:

- **`crackLevel(q, u)`** becomes `q.x − X(q.y, q.z)`: the bolt `p(y)` and the top jog `q(z)` evaluated
  piecewise-linearly from generated constants (the two vertex tables in S, `CRACK_BOLT_i`, `CRACK_TOP_i`)
  plus the node's jitters from `hash01(row, SALT_CRACK_*)`, with `S = min(H, 0.55 L)` from the box's size
  (both mirrors have `a.size`/`a.unit`). Its sign is still the side; the fragment cut is unchanged in form.
- **`crackGap(u)`** becomes the hairline `g0 = 0.04 u`.
- A new **`crackLipShift(q, side, u, v)`** replaces step 3's shift along the normal: side −1 (A) moves
  `−g0/2 · v` in x; side +1 (B) is rotated about `(L/2, −H/2)` by `θ · v` and moved `+g0/2 · v` in x. The
  body's normal on B turns with it. At v = 0 both are the identity, so the body closes with the motes.
- The motes' twin (`crackShift`, `crackFacePoint` in `nodeAttrs.ts`) is built from the same TypeScript
  functions, so the body's two halves and the motes' two pieces are the one surface and the one lean.
- The body draws no crack faces of its own: the opening is the absence of body between the halves, and
  the lip motes draw the line in it, as §2.3 says. (If the body ever wants lip quads, they are the
  surface's planar cells offset ±g0/2; not now.)
- Parity: the box cases already sample both lips of C1's and R0's crack cubes at many points; they hold
  the new `crackLevel`, `crackGap` and `crackLipShift` as they hold today's. `box.test.ts` gains: a point
  on B's bottom-outer edge does not move at any v; a point at B's mouth corner moves out by `H · θ · v`.

"""
s = s[:i] + new_25 + s[j:]

# §5.1 rows.
rep(
    "| `src/scene/node/crack.ts` | The ruled surface `X(y, z)` (the two seeded polylines), `crackSide`, piece B's rotation about the foot and the hairline (`crackShift`), lip points weighted toward the mouth with rotated normals (`crackFacePoint`), all from the node's seed. `CRACK` gains `tilt` (0.10 H over 0.5 L), `hairline` (0.03 u), `mouthDrift` (0.12 L), the kink amplitudes; `jag`/`gap` go. Exports `crackPieces` for §2.5 when §12 lands (or a sibling `crackBody.ts`). |",
    "| `src/scene/node/crack.ts` + **`crack.glsl` (the crack's parity pair)** | `crackLevel(q, u)` → `q.x − X(q.y, q.z)` (the bolt and the top jog at scale S, from the generated vertex tables and the node row's jitters), `crackGap` → the hairline, new `crackLipShift(q, side, u, v)` (A's half-hairline shift; B's lean about its bottom-outer edge plus its half), `crackSide`/`crackShift`/`crackFacePoint` on top of them with lip points weighted toward the mouth and B's normals turned. `CRACK` gains `lean` (0.14 rad), `hairline` (0.04 u), the bolt and top-jog tables and the jitter (0.06 S); `normal`, `jag`, `gap`, `waves` go. `glslCrackConstants()` emits the tables. |",
)
rep(
    "| `src/scene/node/crack.test.ts` | Determinism and seed-sensitivity; every twin point of A is within g0/2 of its rest point and every twin point of B is its rest point rotated by θ about the foot then shifted g0/2; the mouth gap is `θ·H + g0` and the foot's is g0; every lip point satisfies `x = X(y, z) ± g0/2`; the front trace is monotone in x (down-right) with exactly four kinks; the top trace reaches the back edge 0.12 L left of the mouth; a piece-B top corner drops 0.10 H; the whole/twin displacement of every mote is under 0.12 u (the far-invisibility bound). |",
    "| `src/scene/node/crack.test.ts`, `box.test.ts`, the box parity cases | Determinism by node row; every twin point of A is its rest point shifted −g0/2 in x, every twin point of B its rest point rotated by θ about `(L/2, −H/2)` then shifted +g0/2; the opening is `g0 + θ·H` at the mouth and `g0 + θ·(L/2 − x_b)` at the foot; every lip point satisfies `x = X(y, z) ± g0/2` before B's lean; the front trace has the bolt's three turns (right, back, right); the top trace reaches the back edge 0.35 S left of the mouth; B's bottom-outer edge is fixed at every v; the whole/twin displacement of every mote is under 0.2 u (the far-invisibility bound); the box parity cases on C1's and R0's lips pass against the new GLSL. |\n| `src/scene/node/box.glsl` + `box.ts` | Step 3 calls `crackLipShift` instead of shifting along a normal; B's normal turns with it. |",
)
rep(
    "| `src/math/salts.ts` | `SALT_CRACK_MOUTH`, `SALT_CRACK_KINK` (one per vertex, or one salt plus an index), `SALT_CRACK_TOP`. |",
    "| `src/math/salts.ts` | `SALT_CRACK_MOUTH`, `SALT_CRACK_KINK` (one salt, the vertex index folded in), spliced into the GLSL as the other salts are. |",
)

# §5.3 Task 1 and the note under it.
rep(
    "1. **The crack's shape** (`crack.ts`, salts, `nodeAttrs.ts`'s dense crack cube on every hero, lip sampling\n   and the `CrackCube` role, `birth.ts`, their tests; the `role` acceptance in both mirrors). Pure TypeScript; testable without a\n   browser; the picture changes at every existing shot. Ships with test 11's new thresholds. Half a day.",
    "1. **The crack's shape** (`crack.ts` and `crack.glsl` together, `box.glsl`/`box.ts` step 3, salts,\n   `nodeAttrs.ts`'s dense crack cube on every hero, lip sampling and the `CrackCube` role, `birth.ts`, their\n   tests and the box parity run; the `role` acceptance in both node mirrors). The picture changes at every\n   existing shot. Ships with test 11's new thresholds. A day.",
)
rep(
    "§2.5 (the split body) belongs to §12's Task 8, not here; this document is its design.",
    "§2.5 rides on §12's Task 8, which is in the tree: Task 1 here lands after it, on its crack pair.",
)
open(p, "w").write(s)
print("ok")
