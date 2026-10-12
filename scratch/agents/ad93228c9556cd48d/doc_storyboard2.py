PATH = "docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md"
s = open(PATH).read()
cur = open("src/story/01-vibe-build.md").read()
body = cur.split("---\n", 2)[2]
a = s.index("```markdown\n---\nid: vibe-build\nlength: 8\n")
b = s.index("```\n", a + 12)
new = "```markdown\n---\nid: vibe-build\nlength: 6.4\nalt: A cloud of small blue dots. ...\n---\n" + body
if not new.endswith("\n"):
    new += "\n"
s = s[:a] + new + s[b:]

old = "| vb-3 names the blue dots while assembly is 0 (the spawn shell). | True as rendered; if the shell is made sparser later, move vb-3 to after assembly starts. |"
assert old in s
s = s.replace(
    old,
    "| ~~vb-3 names the blue dots while assembly is 0 (the spawn shell).~~ | Retired 2026-10-05: the author cut vb-3, so Act I names no colours or dots. |",
)
old = '| "Gold" for the warm mote in sp-4 (the author chose it). | The amber renders gold-white when dense, so the word matches the picture. |'
assert old in s
s = s.replace(
    old,
    '| "Gold" for the warm mote in sp-4 (the author chose it). | The amber renders gold-white when dense, so the word matches the picture. Amended 2026-10-05: Act I\'s narration no longer names it (the author: readers should not have to know what the colours mean in Act I); "gold" stays in the alt text and the design notes. |',
)
open(PATH, "w").write(s)
print("ok")
