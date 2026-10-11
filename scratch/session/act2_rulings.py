import shutil
from pathlib import Path

repo = Path('/home/user/motes-of-work')
p = repo / 'docs/specs/2026-10-06-act-2-storyboard-and-network.md'
s = p.read_text().rstrip('\n')
s += '''

## 11. Rulings (2026-10-07)

The author: "Let's start with the full 30 and see how it feels before we trim." The three questions in §10
were left to the controller, who ruled:

1. **The first stack's warm speckle fades** to the same glow as every other stack under zo-2, so "from far
   away, everything looks right" is literally true. (Cost if wrong: one key.)
2. **The surge keeps the loop path** (down to the plans, to C7, up its stream to R1): it is the agreed design
   and it shows the defect coming back up. (Cost if wrong: one scripted stream.)
3. **The second fix visits one of the twelve** (C5), so the count the reader holds visibly drops by one.
   (Cost if wrong: one lineage entry.)

Also: no highlight of any kind before the defect is found (fr-1 is all one glow); the mock frame "far" shows
highlights only because the mock reused one render.
'''
p.write_text(s)

ws = repo / '.superpowers/sdd/2026-10-07-act-2'
ws.mkdir(parents=True, exist_ok=True)
old = repo / '.superpowers/sdd/2026-10-03-plan-3-bicycle'
for name in ['global-constraints.md', 'implementer-instructions.md', 'reviewer-instructions.md']:
    shutil.copy(old / name, ws / name)
(ws / 'progress.md').write_text(
    '# SDD ledger — plan: docs/specs/2026-10-06-act-2-storyboard-and-network.md §7 (seven tasks)\n'
    'Spec: docs/specs/2026-10-06-act-2-storyboard-and-network.md (+ §11 rulings 2026-10-07). '
    'Branch main; push after the full e2e passes.\n'
    'Author: start with the full 30 screens, trim later.\n'
)
print('ok')
