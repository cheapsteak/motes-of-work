def edit(p, pairs):
    s = open(p).read()
    for old, new in pairs:
        assert old in s, (p, old[:70])
        s = s.replace(old, new)
    open(p, "w").write(s)


edit(
    "/home/user/mow-compare/src/compare/controls.ts",
    [
        (
            """  preset('Vibed (wrong twin)', 'Built fast from a vague prompt: a polished, working, wrong machine, cool throughout.', {""",
            """  preset('Vibed (wrong twin)', 'Built fast from a vague prompt: polished, working, wrong, cool throughout.', {""",
        ),
        (
            """  preset('Exploded', "Mid-assembly: parts hang just off their places, against the finished machine's ghost.", {""",
            """  preset('Exploded', 'Mid-assembly: parts hang just off their places, against the ghost of the whole.', {""",
        ),
    ],
)
edit(
    "/home/user/mow-compare/src/compare/controls.test.ts",
    [
        (
            """      'Vibed (wrong twin) — built fast from a vague prompt: a polished, working, wrong machine, cool throughout. No ghost.',""",
            """      'Vibed (wrong twin) — built fast from a vague prompt: polished, working, wrong, cool throughout. No ghost.',""",
        ),
    ],
)
edit(
    "/home/user/mow-compare/src/compare/compare.css",
    [
        (
            """h2 {
  margin: 7px 0 2px;""",
            """h2 {
  margin: 6px 0 2px;""",
        ),
        (
            """.blurb {
  min-height: 2.7em;
  margin: 6px 0;
}""",
            """.blurb {
  min-height: 2.7em;
  margin: 5px 0;
  font-size: 12px;
}""",
        ),
        (
            """.presets button {
  padding: 3px 6px;
}""",
            """.presets button {
  padding: 2px 6px;
}""",
        ),
        (
            """.cameras button {
  padding: 3px 6px;
}""",
            """.cameras button {
  padding: 2px 6px;
}""",
        ),
    ],
)
