PATH = "/home/user/motes-of-work/docs/specs/2026-10-05-act-1-build-and-orbit.md"
s = open(PATH).read()


def rep(old: str, new: str) -> None:
    global s
    assert old in s, old[:80]
    s = s.replace(old, new, 1)


# Header: say what the author's edits change.
rep(
    """turn is its **own segment** before the frame; the frame's entrance is to look like the many-piece
build it is, not a slide; and "Done" gets an orbit that plays with angle and zoom.
""",
    """turn is its **own segment** before the frame; the frame's entrance is to look like the many-piece
build it is, not a slide; and "Done" gets an orbit that plays with angle and zoom.

**Amended 2026-10-05 (the author, after seeing it built):** "bring the 3d animation up to happen at
the same time as the text", and cut "See the blue dots?", since readers should not have to know what
blue and dots mean in Act I. So a brief line's parts now set out the moment the line comes up (no
reading lead; the camera is in place before the line appears), vb-3 is cut, and the section is 6.4
screens, not 8. The stages, the front wheel's turn, the frame laid tube by tube and the lap are
unchanged. Where this document still says "the words before the parts", or gives the 8-screen
timings, it is superseded by §2.1a below and by the storyboard's §2.1
(docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md), which the sync fence reads.
""",
)

# §1: the copy table is fenced; drop vb-3.
rep(
    """| vb-3 | See the blue dots? Each one is a little bit of work the agent can do. There are thousands. (19) |
""",
    "",
)
rep(
    """Word count 96 over 8 screens (12 per screen; the lint allows 35).""",
    """*Amended 2026-10-05 (the author): vb-3 ("See the blue dots? Each one is a little bit of work the
agent can do. There are thousands.") is cut: Act I's narration names no colour and no dots, and the
cloud needs no explanation. vb-2 leads straight into the list. Word count 77 over 6.4 screens.*

Word count 96 over 8 screens (12 per screen; the lint allows 35).""",
)

# §2.1a: the re-timed storyboard, in screens.
rep(
    """### 2.2 Settle windows (the order the bike is built in)""",
    """### 2.1a The simultaneous build (amended 2026-10-05)

The author: "bring the 3d animation up to happen at the same time as the text". Each line's parts
now set out as the line comes up; every reading lead above is gone, and the camera moves that used
to play inside the leads now play just before their line appears, so the camera is still in place
before anything sets out. vb-3 is cut. L = 6.4 (one screen is 0.15625 local, a fade 0.015625).

| Event | Screens | Local | Was (screens) |
|---|---|---|---|
| vb-2 (S0 → S1 over 0.30–0.80, down into the cloud) | 0.30 | 0.046875 | 0.30 (the descent was vb-3's, 0.80–1.40) |
| brief page in: the ask alone | 0.80 | 0.125 | 1.40 |
| line 1 up; assembly 0 → 0.45 | 1.10 → 1.60 | 0.171875 → 0.25 | 1.70; 2.25 → 2.75 |
| S1 → S2 (before line 2) | 1.60 → 1.90 | 0.25 → 0.296875 | 2.96 → 3.28 |
| line 2 up; assembly 0.45 → 0.61 | 1.90 → 2.35 | 0.296875 → 0.3671875 | 2.90; 3.30 → 3.75 |
| drive 0 → 2.0 and the steer cancel | 2.05 → 2.70 | 0.3203125 → 0.421875 | 3.45 → 4.10 |
| S2 → S3 (before line 3) | 2.70 → 3.00 | 0.421875 → 0.46875 | 4.24 → 4.52 |
| line 3 up; assembly 0.61 → 0.73 | 3.00 → 3.35 | 0.46875 → 0.5234375 | 4.20; 4.55 → 4.90 |
| the turn (+1 at 3.60, −1 at 3.90) | 3.45 → 4.05 | 0.5390625 → 0.6328125 | 5.00 → 5.60 |
| S3 → S1 (before line 4) | 4.05 → 4.40 | 0.6328125 → 0.6875 | 5.60 → 5.96 |
| line 4 up; assembly 0.73 → 0.98, lean-in S1 → S1′ | 4.40 → 5.15 | 0.6875 → 0.8046875 | 5.70; 6.05 → 6.80 |
| assembly 1 | 5.20 | 0.8125 | 6.85 |
| vb-4 and the lap (`LAP_FROM` 0.84375) | 5.40 → 6.40 | 0.84375 → 1 | 7.00 → 8.00 |

Every span keeps its length but the camera moves (0.30, 0.30 and 0.35 screens; were 0.32, 0.28 and
0.36) and vb-2's descent (0.5; was 0.6). Lines light at locals 0.248, 0.363, 0.519 and 0.800. Each
line still has its reading time before the next line comes up (0.8, 1.1 and 1.4 screens; the last
1.0 before the page goes), so a line is read while its parts are in flight.

### 2.2 Settle windows (the order the bike is built in)""",
)

# §2.4 summary: lengths.
rep(
    """- Section length: vibe-build 6 → 8 (Act I 17 → 19 screens).""",
    """- Section length: vibe-build 6 → 8 (Act I 17 → 19 screens). Amended 2026-10-05: 8 → 6.4 (§2.1a);
  the reveal 4 → 3.2 with rv-6 cut (storyboard §2.2); Act I 21 → 18.6 screens.""",
)

# §2.5 markdown block (fenced: the story must contain it).
a = s.index("```markdown\n<!-- page -->\n<!-- beat id=vb-brief")
b = s.index("```\n", a + 12)
cur = open("/home/user/motes-of-work/src/story/01-vibe-build.md").read()
c = cur.index("<!-- page -->\n<!-- beat id=vb-brief")
block = cur[c:]
if not block.endswith("\n"):
    block += "\n"
s = s[:a] + "```markdown\n" + block + s[b:]

rep(
    """- **Ordering fence (lint, vitest)**: for each brief line,""",
    """- **Ordering fence (lint, vitest), amended 2026-10-05**: the words and the parts arrive together.
  For each brief line, its new parts set out at or after its `at` and no more than 0.1 screen after
  it (`at_i ≤ local(setOut_i) ≤ at_i + 0.1 / L`); it is never met while invisible
  (`local(threshold_i) ≥ at_i + FADE`); and it stays the newest line for its reading time
  (`max(0.3, words_i / 40)` screens before the next line comes up or the page goes). The rule as
  first designed follows, superseded:
- ~~**Ordering fence (lint, vitest)**~~: for each brief line,""",
)

# §6 tests 7, 8, 9, 10, 16: say where the numbers moved.
rep(
    """11. **Dwell**: §2.1's budget table holds, with the per-line rule of §2.5.
""",
    """11. **Dwell**: §2.1's budget table holds, with the per-line rule of §2.5.

*Amended 2026-10-05: tests 7 to 10 and 16 hold the same things at §2.1a's locals (the chain ramp
0.3203125–0.421875, the turn 0.5390625–0.6328125, the lap from 0.84375, the frame frames at
0.7171875, 0.7546875 and 0.7859375); test 10's fence is the amended one (words and parts together);
and a content test keeps Act I's narration free of colour and dot words.*
""",
)

# §7 as built: the amendment.
s = s.rstrip("\n") + """
- **The author's edits (2026-10-05).** The parts fly in as their line comes up (§2.1a), vb-3 is cut,
  and the section is 6.4 screens. Nothing about the stages, the turn, the frame's lay order or the lap
  changed but their places in the section.
"""
open(PATH, "w").write(s)
print("ok")
