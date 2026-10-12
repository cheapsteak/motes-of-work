"""Copy this session's scratch work into the repo's scratch/ folder, so it survives the session.

Policy (see scratch/README.md): our own text sources go in whole; our own screenshots go in as
reduced JPEGs; third-party material (downloaded pages, reference images, video frames), build
outputs, vendored libraries, logs and probe images stay out. Prints a summary.

Run it from the repo root (or set MOW_REPO to the repo's path). Copied text never keeps a machine
path: the repo's own path becomes a repo-relative one (an import specifier becomes relative to the
importing file), a `mow-<name>` sibling checkout becomes `<mow-<name> checkout>`, and the scratchpad
becomes `<scratchpad>`. A file that still holds one afterwards is flagged and left out, because
`tools/check-public.sh` fails on machine paths in tracked files.
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

S = Path(__file__).resolve().parent
REPO = Path(os.environ.get('MOW_REPO') or Path.cwd()).resolve()
DEST = REPO / 'scratch'
SDD = REPO / '.superpowers' / 'sdd'

SKIP_DIRS = {
    'old', 'previewwt', 'pub', 'pubbuild', 'dist-rel', 'node_modules', 'test-results', 'playwright-report',
    'prevshots', 'site', 'smoke2', 'tr', 'dist', 'dist-base', 'build',
}
# Third-party material: reference images, downloaded pages, video frames.
SKIP_PATHS = ('freeze-refs/img', 'freeze-refs/pages', 'refboard/img', 'morph-ref/video')
THIRD_PARTY_IMAGE_ROOTS = ('freeze-refs', 'refboard', 'morph-ref')
TEXT = {'.html', '.md', '.py', '.mjs', '.js', '.ts', '.json', '.css', '.txt', '.glsl', '.scad', '.svg', '.csv'}
IMAGES = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
FONTS = {'.woff', '.woff2'}
# Downloaded third-party pages and their stylesheets (research examples) stay out too.
SKIP_NAME = re.compile(r'^(https___.*|three\..*\.js|.*\.(log|pid|out|orig|bak)|watch\.html|ps\.html|base\.css|watchcss\.css|l_.*\.css)$')
# Private words that must never leave the scratchpad live in an untracked file beside this script
# (one per line); the generic secret patterns below always apply.
_LOCAL = Path(__file__).resolve().parent / 'flag-terms.local.txt'
_TERMS = [re.escape(t.strip()) for t in (_LOCAL.read_text().splitlines() if _LOCAL.exists() else []) if t.strip()]
# The same machine-path patterns as tools/check-public.sh; they run after relativise(), so a hit is a path it missed.
_MACHINE = [r'/home/[^/ ]+/', r'/Users/[^/ ]+/', r'/tmp/claude', r'/root/']
FLAG = re.compile('|'.join(_TERMS + [r'api[_-]?key', r'secret', r'BEGIN [A-Z ]*PRIVATE'] + _MACHINE), re.I)
CODE = {'.py', '.mjs', '.js', '.ts'}

copied, images, skipped, flagged = [], [], [], []


def rel_to_three(target: Path) -> str:
    return os.path.relpath(REPO / 'node_modules/three/build/three.module.js', target.parent).replace(os.sep, '/')


def relativise(s: str, dst: Path) -> str:
    """Replace this machine's paths with portable ones (see the module docstring)."""
    repo, code = re.escape(REPO.as_posix()), dst.suffix.lower() in CODE
    if code and dst.suffix.lower() != '.py':
        def imp(m: re.Match) -> str:
            rel = os.path.relpath(REPO / m.group(2), dst.parent).replace(os.sep, '/')
            return m.group(1) + (rel if rel.startswith('.') else './' + rel) + m.group(3)
        s = re.sub(r'''((?:\bfrom|\bimport|\brequire)\s*\(?\s*['"])''' + repo + r'''/([^'"]+)(['"])''', imp, s)
    s = s.replace(S.as_posix(), '<scratchpad>')
    s = re.sub(r'/home/[^/ ]+/mow-(\{[^}]*\}|[\w-]+)', r'<mow-\1 checkout>', s)
    s = re.sub(repo + r'/(?=[\w.@-])', '', s)
    s = re.sub(repo + r'/', './' if code else '<repo>/', s)
    return re.sub(repo + r'(?![\w-])', '.' if code else '<repo>', s)


def copy_text(src: Path, dst: Path) -> None:
    s = relativise(src.read_text(errors='replace'), dst)
    if FLAG.search(s):
        flagged.append(str(src.relative_to(S)))
        return
    if src.suffix == '.html':
        s = re.sub(r"(['\"])\./three\.module\.js\1", lambda m: f"{m.group(1)}{rel_to_three(dst)}{m.group(1)}", s)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(s)
    copied.append(dst)


def copy_image(src: Path, dst: Path) -> None:
    dst = dst.with_suffix('.jpg')
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['convert', str(src), '-resize', '1000x1000>', '-quality', '75', '-background', '#0b0d14',
                    '-flatten', str(dst)], check=True)
    images.append(dst)


def walk(root: Path, dest: Path, agent: bool) -> None:
    for dirpath, dirnames, filenames in os.walk(root):
        d = Path(dirpath)
        r = d.relative_to(S).as_posix()
        dirnames[:] = [n for n in dirnames if n not in SKIP_DIRS and not any((f'{r}/{n}').lstrip('./').startswith(p) for p in SKIP_PATHS)]
        for n in filenames:
            src = d / n
            rel = src.relative_to(root)
            ext = src.suffix.lower()
            if SKIP_NAME.match(n) or src.stat().st_size > 3_000_000 and ext not in IMAGES:
                skipped.append(str(src.relative_to(S)))
            elif ext in TEXT:
                copy_text(src, dest / rel)
            elif ext in FONTS and not agent:
                (dest / rel).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy(src, dest / rel)
                copied.append(dest / rel)
            elif ext in IMAGES and not agent and not str(src.relative_to(S)).startswith(THIRD_PARTY_IMAGE_ROOTS):
                copy_image(src, dest / rel)
            else:
                skipped.append(str(src.relative_to(S)))


if DEST.exists():
    for p in DEST.iterdir():
        if p.name != 'README.md':
            shutil.rmtree(p) if p.is_dir() else p.unlink()

for entry in sorted(S.iterdir()):
    if entry.name in SKIP_DIRS or entry.name == 'agents':
        continue
    if entry.is_dir():
        walk(entry, DEST / 'session' / entry.name, agent=False)
    else:
        ext = entry.suffix.lower()
        if SKIP_NAME.match(entry.name):
            skipped.append(entry.name)
        elif ext in TEXT:
            copy_text(entry, DEST / 'session' / entry.name)
        elif ext in IMAGES:
            copy_image(entry, DEST / 'session' / entry.name)
        else:
            skipped.append(entry.name)

# Subagents' working folders: their scripts and notes, not their probe images or logs.
walk(S / 'agents', DEST / 'agents', agent=True)

# The plan ledgers, briefs, reports and reviews (the diffs are reproducible from git).
for md in sorted(SDD.rglob('*.md')):
    copy_text(md, DEST / 'sdd' / md.relative_to(SDD))

total = sum(p.stat().st_size for p in copied + images)
print(f'text/fonts {len(copied)}, images {len(images)}, skipped {len(skipped)}, flagged {len(flagged)}, {total / 1e6:.1f} MB')
for f in flagged:
    print('FLAGGED', f)
if '-v' in sys.argv:
    for s in skipped:
        print('skip', s)
