"""Build the intermediate tree for commit 1 (the cold open only) from HEAD and the final files."""
import importlib.util
import re

import subprocess

REPO = "/home/user/motes-of-work"
HERE = "<scratchpad>/agents/ad93228c9556cd48d"
FINAL = f"{HERE}/final"


def head(path: str) -> str:
    return subprocess.run(["git", "-C", REPO, "show", f"HEAD:{path}"], capture_output=True, text=True, check=True).stdout


def final(path: str) -> str:
    return open(f"{FINAL}/{path}").read()


def write(path: str, text: str) -> None:
    open(f"{REPO}/{path}", "w").write(text)


def rep(s: str, old: str, new: str) -> str:
    assert s.count(old) == 1, old[:100]
    return s.replace(old, new)


# Unchanged in commit 1: the reveal, the spec copy, the blueprint doc.
for p in ["src/story/02-reveal.md", "src/story/04-spec.md", "docs/specs/2026-10-05-blueprint-and-build.md"]:
    write(p, head(p))

# Final in commit 1 already (cold open only).
for p in ["src/story/01-vibe-build.md", "src/story/markup.test.ts", "e2e/shots.spec.ts"]:
    write(p, final(p))

# keyframes.json: HEAD with only the vibe-build keys re-timed.
spec = importlib.util.spec_from_file_location("retime_mod", f"{HERE}/retime_lib.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
kj = head("src/timeline/keyframes.json")
kj = re.sub(r'"at": "(vibe-build)@([0-9.]+)"', lambda m: f'"at": "vibe-build@{mod.vb_new(float(m.group(2)))}"', kj)
write("src/timeline/keyframes.json", kj)

# shots.ts: the lap start and S0's comment, not S5p's.
s = final("src/timeline/shots.ts")
s = rep(s, "/** rv-7: S5 pushed in a little. */", "/** rv-6: S5 pushed in a little. */")
write("src/timeline/shots.ts", s)

# shots.test.ts: the vibe-build holds, the reveal ones as at HEAD.
s = final("src/timeline/shots.test.ts")
h = head("src/timeline/shots.test.ts")
fr = s[s.index("  ['reveal', 0, 0.175"): s.index("  ['rewind', 1, 1, 'S8'")]
hr = h[h.index("  ['reveal', 0, 0.14"): h.index("  ['rewind', 1, 1, 'S8'")]
write("src/timeline/shots.test.ts", s.replace(fr, hr))

# keyframes.test.ts: final, with the reveal edits undone.
s = final("src/timeline/keyframes.test.ts")
h = head("src/timeline/keyframes.test.ts")


def block(text: str, start: str, end: str) -> str:
    a = text.index(start)
    return text[a: text.index(end, a)]


for start, end in [
    ("  it('turns the twin to near full lock", "  // The steer track"),
    ("  it('swings the seat with the wheel in rv-3", "  it('adds steering nowhere else'"),
    ("  it.each([\n    [1440, 900],\n    [390, 844],\n  ])('frames the whole reveal twin", "  it('ends the rewind as"),
]:
    s = s.replace(block(s, start, end), block(h, start, end))
s = rep(s, "      [at('reveal', 0.3625), at('reveal', 0.5)],", "      [at('reveal', 0.29), at('reveal', 0.4)],")
write("src/timeline/keyframes.test.ts", s)

# content.test.ts: final without the Act I vocabulary fence.
s = final("src/story/content.test.ts")
a = s.index("/**\n * Act I asks nothing of the reader's eye for colour")
b = s.index("describe('the brief', () => {")
write("src/story/content.test.ts", s[:a] + s[b:])

# The build-and-orbit doc: final, but the summary does not yet claim the reveal's cut.
s = final("docs/specs/2026-10-05-act-1-build-and-orbit.md")
s = rep(
    s,
    """  the reveal 4 → 3.2 with rv-6 cut (storyboard §2.2); Act I 21 → 18.6 screens.""",
    """  Act I 21 → 19.4 screens.""",
)
write("docs/specs/2026-10-05-act-1-build-and-orbit.md", s)

# The storyboard doc: HEAD plus the cold-open edits only.
P = "docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md"
s = head(P)
f = final(P)
s = rep(
    s,
    s[s.index("### Section 1: vibe-build (8 screens)"): s.index("| vb-brief (document)")],
    f[f.index("### Section 1: vibe-build (6.4 screens)"): f.index("| vb-brief (document)")],
)
s = rep(
    s,
    """§3.5), before its parts set out; each lights""",
    """§3.5) as its parts set out (amended 2026-10-05: no longer before them); each lights""",
)
s = rep(s, s[s.index("### 2.1 vibe-build (L = 8"): s.index("### 2.2 reveal")], f[f.index("### 2.1 vibe-build (L = 6.4"): f.index("### 2.2 reveal")])
s = rep(
    s,
    """- Section lengths: vibe-build 3 → 6 → 8 (2026-10-05), reveal 2 → 4, rewind 2 → 1, spec 3 → 6 → 8
  (2026-10-05: 21 screens).""",
    """- Section lengths: vibe-build 3 → 6 → 8 → 6.4 (2026-10-05), reveal 2 → 4, rewind 2 → 1,
  spec 3 → 6 → 8 (2026-10-05: 21 screens; with the simultaneous build, 19.4).""",
)
fa = f[f.index("- `mech.assembly` in vibe-build (2026-10-05 §2.4"): f.index("- `mech.drive` in vibe-build")]
s = rep(s, s[s.index("- `mech.assembly` in vibe-build (2026-10-05 §2.4"): s.index("- `mech.drive` in vibe-build")], fa)
s = rep(
    s,
    """- `mech.drive` in vibe-build: 0 until 0.43125, 2.0 at 0.5125, held to 0.875, 2.4 at 1.0; reveal
  0.14→2.7, 0.26→2.9, 0.52→3.0, 1.0→3.0. Rewind and spec as today.""",
    """- `mech.drive` in vibe-build: 0 until 0.3203125, 2.0 at 0.421875, held to 0.84375, 2.4 at 1.0;
  reveal 0.14→2.7, 0.26→2.9, 0.52→3.0, 1.0→3.0. Rewind and spec as today.""",
)
s = rep(
    s,
    """  Where it differs from its own design, that document's §7 says so.""",
    """  Where it differs from its own design, that document's §7 says so.
- **The author's edits (2026-10-05).** vb-3 is cut, so the cold open names no colour and no dots
  (§1); a brief line's parts set out as the line comes up, with no reading lead (§2.1). vibe-build is
  6.4 screens.""",
)
ex = f[f.index("```markdown\n---\nid: vibe-build"): f.index("```\n", f.index("```markdown\n---\nid: vibe-build") + 12)]
s = rep(s, s[s.index("```markdown\n---\nid: vibe-build"): s.index("```\n", s.index("```markdown\n---\nid: vibe-build") + 12)], ex)
vb3 = "| vb-3 names the blue dots while assembly is 0 (the spawn shell). | True as rendered; if the shell is made sparser later, move vb-3 to after assembly starts. |"
s = rep(s, vb3, "| ~~vb-3 names the blue dots while assembly is 0 (the spawn shell).~~ | Retired 2026-10-05: the author cut vb-3, so Act I names no colours or dots. |")
write(P, s)
print("ok")
