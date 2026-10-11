PATH = "/home/user/motes-of-work/docs/specs/2026-10-05-blueprint-and-build.md"
s = open(PATH).read()


def rep(old: str, new: str) -> None:
    global s
    assert old in s, old[:80]
    s = s.replace(old, new, 1)


rep(
    "| sp-7 | 6 | The gold dots are where you looked closely. They land first, on the seat, the handlebars and the pedals. (19) |",
    "| sp-7 | 6 | You looked closely at the parts a person touches, so they land first: the seat, the handlebars and the pedals. (20) |",
)
rep(
    """The legend, revised: **blue** = the agent's work (vb-3); **ink lines** = the drawing (sp-2);
**gold** = the person (first seen as the ring and the tick, named in sp-7 as "where you looked
closely").""",
    """~~The legend, revised: **blue** = the agent's work (vb-3); **ink lines** = the drawing (sp-2);
**gold** = the person (first seen as the ring and the tick, named in sp-7 as "where you looked
closely").~~

*Amended 2026-10-05 (the author): "we don't want readers to have to know what blue and dots mean, at
least not in act 1." sp-7 was "The gold dots are where you looked closely. They land first, on the
seat, the handlebars and the pedals." (the old sp-6 in the author's numbering). It now says what you
did, not what colour it made: "You looked closely at the parts a person touches, so they land first:
the seat, the handlebars and the pedals." vb-3 ("See the blue dots?") and rv-6 ("Look at the
colours. Every dot is blue.") are cut, so Act I's narration teaches no legend; the picture keeps its
colours, and the alt text below still names them. 113 words over 8 screens.*""",
)
open(PATH, "w").write(s)
print("ok")
