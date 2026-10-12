from pathlib import Path

p = Path('tools/script-notes/build.py')
s = p.read_text()
reps = [
    (
        '"""Build the script-notes page from docs/script/act-2.md (pages, lines, stage directions, choices)."""\n\nimport json\nimport re\nfrom pathlib import Path\n',
        '"""Build the script-notes page from a script draft (pages, lines, stage directions, choices).\n\nUsage: python3 build.py [draft.md]  (default docs/script/act-2.md)\n"""\n\nimport json\nimport re\nimport sys\nfrom pathlib import Path\n',
    ),
    ("SRC = Path(__file__).resolve().parents[2] / 'docs/script/act-2.md'", "SRC = Path(__file__).resolve().parents[2] / 'docs/script/act-2.md'"),
    ("SCRIPT_ID = 'act2-d3'", "SCRIPT_ID = 'act2-d4'"),
    ("    intro = md[md.index('## What Act II is for'):md.index('## Labels on the layers')]", "    intro = md[md.index('## What Act II is for'):md.index('## Labels on the')]"),
    (
        "    choices_md = md[md.index('## Choices I made'):md.index('## Changes')] if '## Changes' in md else md[md.index('## Choices I made'):]",
        "    choices_md = section(md, '## Choices I made')",
    ),
    ("    labels = md[md.index('## Labels on the layers'):md.index('## The script')]", "    labels = md[md.index('## Labels on the'):md.index('## The script')]"),
    (
        "def parse(md: str) -> dict:",
        "def section(md: str, heading: str) -> str:\n    \"\"\"From `heading` to the next level-two heading (or the end).\"\"\"\n    start = md.index(heading)\n    nxt = md.find('\\n## ', start + len(heading))\n    return md[start:] if nxt < 0 else md[start:nxt]\n\n\ndef parse(md: str) -> dict:",
    ),
    ("    script = md[md.index('## The script'):md.index('## Choices I made')]", "    script = section(md, '## The script')"),
    (
        "    data = parse(SRC.read_text())\n    data['version'] = '2026-10-06, draft 3'",
        "    src = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else SRC\n    data = parse(src.read_text())\n    data['version'] = '2026-10-07, draft 4 (the galaxy)'",
    ),
]
for a, b in reps:
    assert s.count(a) == 1, a[:60]
    s = s.replace(a, b)
p.write_text(s)
print('ok')
