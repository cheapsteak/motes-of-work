p = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()
for a, b in [
    ('hand the list to an agent. (14)', 'hand the list to an agent. (15)'),
    ('the seat turns with it. (23)', 'the seat turns with it. (22)'),
    ('They never turn. (15)', 'They never turn. (14)'),
]:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w').write(s)
print('ok')
