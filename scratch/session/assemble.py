"""Assemble scratchpad/pub from scratchpad/pubbuild: essay + compare and the assets they reach."""
import json, os, re, shutil

S = os.path.dirname(os.path.abspath(__file__))
B, P = os.path.join(S, 'pubbuild'), os.path.join(S, 'pub')

old_assets = set(os.listdir(os.path.join(P, 'assets')))
shutil.rmtree(os.path.join(P, 'assets'))
os.makedirs(os.path.join(P, 'assets'))

shutil.copy(os.path.join(B, 'index.html'), os.path.join(P, 'essay.html'))
cmp_html = open(os.path.join(B, 'src/compare/compare.html')).read().replace('href="../../index.html"', 'href="../../essay.html"')
open(os.path.join(P, 'src/compare/compare.html'), 'w').write(cmp_html)

ref = re.compile(r'[\w.-]+-[\w-]{8}\.(?:js|css|woff2?)')
todo = [open(os.path.join(P, 'essay.html')).read(), cmp_html]
seen = set()
while todo:
    text = todo.pop()
    for name in set(ref.findall(text)):
        src = os.path.join(B, 'assets', name)
        if name in seen or not os.path.exists(src):
            continue
        seen.add(name)
        data = open(src, 'rb').read()
        if name.endswith('.js'):
            data = data.replace('�'.encode(), b'\\uFFFD')
        open(os.path.join(P, 'assets', name), 'wb').write(data)
        if not name.endswith(('.woff', '.woff2')):
            todo.append(data.decode('utf-8', 'replace'))

files = {'essay.html': 'pub/essay.html', 'src/compare/compare.html': 'pub/src/compare/compare.html'}
files.update({f'assets/{n}': f'pub/assets/{n}' for n in sorted(seen)})
for n in old_assets - seen:
    files[f'assets/{n}'] = None
print(json.dumps(files, indent=1))
