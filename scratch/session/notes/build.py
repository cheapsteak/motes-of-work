"""Build the script-notes page from docs/script/act-2.md (pages, lines, stage directions, choices)."""

import json
import re
from pathlib import Path

SRC = Path('/home/user/motes-of-work/docs/script/act-2.md')
OUT = Path(__file__).parent / 'script-notes.html'
TEMPLATE = Path(__file__).parent / 'template.html'
SCRIPT_ID = 'act2-d3'  # bump with each draft so notes on an old draft never attach to the wrong line


def parse(md: str) -> dict:
    title = md.splitlines()[0].lstrip('# ').strip()
    intro = md[md.index('## What Act II is for'):md.index('## Labels on the layers')]
    intro_paras = [
        re.sub(r'\s+', ' ', p).strip()
        for p in intro.split('\n\n')[1:]
        if p.strip() and not p.startswith('##')
    ]
    script = md[md.index('## The script'):md.index('## Choices I made')]
    pages = []
    for block in re.split(r'^### Page (\d+)\s*$', script, flags=re.M)[1:]:
        if block.strip().isdigit():
            pages.append({'n': int(block.strip()), 'lines': []})
            continue
        paras = [p.strip() for p in block.split('\n\n') if p.strip()]
        for p in paras:
            flat = re.sub(r'\s+', ' ', p)
            if flat.startswith('*') and flat.endswith('*') and pages[-1]['lines']:
                pages[-1]['lines'][-1]['dir'] = flat.strip('*').strip()
            else:
                m = re.match(r'(.*?)\s*\((\d+)\)$', flat)
                text, words = (m.group(1), int(m.group(2))) if m else (flat, len(flat.split()))
                pages[-1]['lines'].append({'text': text, 'words': words, 'dir': ''})
    for page in pages:
        for i, line in enumerate(page['lines'], 1):
            line['id'] = f"{SCRIPT_ID}-p{page['n']}-l{i}"
    choices_md = md[md.index('## Choices I made'):md.index('## Changes')] if '## Changes' in md else md[md.index('## Choices I made'):]
    choices = []
    for item in re.split(r'^- ', choices_md, flags=re.M)[1:]:
        flat = re.sub(r'\s+', ' ', item).strip()
        choices.append({'id': f'{SCRIPT_ID}-c{len(choices) + 1}', 'text': flat})
    labels = md[md.index('## Labels on the layers'):md.index('## The script')]
    label_paras = [re.sub(r'\s+', ' ', p).strip() for p in labels.split('\n\n')[1:] if p.strip()]
    return {'title': title, 'intro': intro_paras, 'labels': label_paras, 'pages': pages, 'choices': choices}


def main() -> None:
    data = parse(SRC.read_text())
    data['version'] = '2026-10-06, draft 3'
    data['scriptId'] = SCRIPT_ID
    payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
    page = TEMPLATE.read_text().replace('/*SCRIPT_DATA*/null', payload)
    OUT.write_text(page)
    n = sum(len(p['lines']) for p in data['pages'])
    print(f"{len(data['pages'])} pages, {n} lines, {len(data['choices'])} choices -> {OUT}")


if __name__ == '__main__':
    main()
