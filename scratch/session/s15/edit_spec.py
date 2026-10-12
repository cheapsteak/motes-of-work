p = 'docs/specs/2026-10-07-galaxy-orbits.md'
s = open(p).read()
R = [
    ("| zo-1, zo-2 | the bike's frame contracts into a planet, its wheels, bars, saddle and basket into moons; the camera lifts: P_a's star and planets, the neighbourhood, the galaxy with its core |",
     "| zo-1, zo-2 | the bike's frame contracts into a planet, its wheels, bars, saddle and basket into moons; the camera lifts: P_a's star and planets, the neighbourhood, the galaxy with its core; **no streams (§15)** |"),
    ("| ly-2 | the core: six large bodies, slow, every stream leaving outward |",
     "| ly-2 | the core: six large bodies, slow, ~~every stream leaving outward~~ **no streams (§15)** |"),
    ("| ly-3 | the stars around the core: the neighbourhood's plans, each fed by a stream from a core body |",
     "| ly-3 | the stars around the core: the neighbourhood's plans, ~~each fed by a stream from a core body~~ **no streams (§15)** |"),
    ("| ly-5, ly-6 | one plan's system whole: the star, its planets, their moons, the stream from the core |",
     "| ly-5, ly-6 | one plan's system whole: the star, its planets, their moons, the stream from the core **under ly-5 only; it fades out under ly-6 (§15)** |"),
    ("| re-1..3 | the mark visits the newest planets of P5, Q2, P6; a stream from the core feeds it |",
     "| re-1..3 | the mark visits the newest planets of P5, Q2, P6; a stream from the core feeds it **(§15: the feed only, under re-3; no lineage streams)** |"),
    ("| ly-2 | At the centre, the rules every agent reads before it starts. | the camera flies in to the core: a handful of large bodies, slow to change, streams leaving them outward. **Unchanged from draft 4** |",
     "| ly-2 | At the centre, the rules every agent reads before it starts. | the camera flies in to the core: a handful of large bodies, slow to change~~, streams leaving them outward~~ (**§15: no streams**). **Unchanged from draft 4** |"),
    ("| ly-3 | Around them, the plans: the instructions for one piece of work. | out to the stars around the core, each fed by a stream from it. **Unchanged** |",
     "| ly-3 | Around them, the plans: the instructions for one piece of work. | out to the stars around the core~~, each fed by a stream from it~~ (**§15: no streams**). **Unchanged** |"),
    ("| re-1..3 | So you ask a reviewer… / …all fine. / …read the same rule. | the mark passes over new pieces at the edge of a star's system; a stream from the core feeds it. **Unchanged** |",
     "| re-1..3 | So you ask a reviewer… / …all fine. / …read the same rule. | the mark passes over new pieces at the edge of a star's system; a stream from the core feeds it (**§15: the feed only, under re-3**). **Unchanged** |"),
]
for a, b in R:
    assert s.count(a) == 1, a[:50]
    s = s.replace(a, b)

S15 = """

## 15. Streams only when the story needs them

*Revision 7, approved by the author (2026-10-08) after a look on a phone: the lineage streams (core
→ star → planet), drawn as bright, straight, laser-like arcs out of the core, dominated the zoom-out
and the neighbourhood, where no line is about lineage. This section supersedes every stage
direction above that shows a stream on a beat §15.1 does not list (marked in §14.5 and §14.6), and
revision 2's §3.1 where it keeps the streams' dots on the scroll `clock`.*

### 15.1 When

A new story leaf, **`net.streams`** (0..1, default 0, in `sceneMotion` so a stop waits for its
fades), multiplies the brightness of every stream dot, the reviewer's feed included. It is keyed per
beat and fades in and out on the page turns; it is never driven by the level of detail. It is **1**
only on the beats whose line is about lineage, and **0** everywhere else, the whole zoom-out included:

| Beat | Line | `net.streams` |
|---|---|---|
| ly-1 | Each piece of work is built from what its agent reads. | 1 |
| ly-5 | Rules shape plans, and plans shape code. | 1 (fades out under ly-6) |
| up-1 | One agent wrote down what it built… Now the defect is in the rules too. | 1 (the up-stream) |
| re-3 | The reviewer read the same rule. | 1 (the feed is a stream, times its own alpha) |
| tr-1, tr-2 | Follow the defects back. / They all lead to one place at the centre: one incorrect rule. | 1 (the climb and the surge) |
| fx-4 | Then trace everything built from the incorrect rule, and fix what it already made. | 1 (the sweep) |
| every other Act II beat, and the wordless second fix | | 0 |

A builder's flight is not a stream: a body is still built by its motes flying in from its parent, so
births read on every beat. Only the standing dotted line between parent and child is gated.

### 15.2 How, when shown

- **Thinner:** 1 CSS px dots (the pixel floor and cap both 1 px) at a wider pitch: one dot per
  1.2 units of chord (was 0.6), between 6 and 40 dots a stream.
- **Dimmer:** a stream dot's brightness is capped at `STREAM_CAP` = 0.3 of a star glow's core peak,
  well under any star's core; a lit (ember) stream is capped the same.
- **Fading along its length:** gain `mix(1, 0.15, u)` from the parent (`u` = 0) to the child
  (`u` = 1), so no stream reads as a full-strength beam end to end.
- **Slightly curved:** the control point sits 0.10 of the chord off the midpoint, sideways.
- **Ember only while it carries the defect**, as before: lit at its `hiAt`, out as its child's fix
  lands.
- **The dots flow on the ambient clock**, `fract(k + NODE_STREAM_SPEED · uAmbient)`, frozen in tests
  and under reduced motion like every ambient term.

### 15.3 Tests

- **Off by default:** at every zoom-out sample, and at every beat whose `net.streams` is 0, the
  streams and the feed draw nothing (`net-streams` and `net-feed` are absent from
  `drawStats().visible`).
- **Quiet when shown:** at ly-5, the difference between the frames with `net.streams` 1 and 0 has no
  pixel above 96 in any channel (phone and desktop), and the brightest stream pixel within the first
  10 % of a stream (its parent end) is at least 3× the brightest within the last 10 % (its child
  end), from the TS twin's projected endpoints.
- **Keys:** `net.streams` ≥ 0.99 at the middle of every on-beat's hold, and ≤ 0.01 at the middle of
  every other Act II beat's hold.
"""
s = s.rstrip('\n') + S15
open(p, 'w').write(s)
print('ok')
