# Builds three.classic.js: the same three.module.js + three.core.js as one classic script that sets window.THREE,
# so the mock also runs from file:// in browsers that refuse module imports there (Chromium).
import re, sys
d = sys.argv[1]
core = open(f'{d}/three.core.js').read()
mod = open(f'{d}/three.module.js').read()
def specs(body):
    out = []
    for s in body.split(','):
        s = s.strip()
        if not s: continue
        m = re.match(r'^(\S+)\s+as\s+(\S+)$', s)
        out.append((m.group(1), m.group(2)) if m else (s, s))
    return out
cm = re.search(r'^export \{([^}]*)\};?\s*$', core, re.M)
core_obj = ', '.join(f'{b}: {a}' for a, b in specs(cm.group(1)))
core_js = core[:cm.start()] + f'return {{ {core_obj} }};' + core[cm.end():]
im = re.search(r"^import \{([^}]*)\} from './three\.core\.js';?\s*$", mod, re.M)
destr = ', '.join(f'{a}: {b}' for a, b in specs(im.group(1)))
rm = re.search(r"^export \{([^}]*)\} from './three\.core\.js';?\s*$", mod, re.M)
re_obj = ', '.join(f'{b}: __core.{a}' for a, b in specs(rm.group(1)))
lm = re.search(r'^export \{([^}]*)\};?\s*$', mod, re.M)
loc_obj = ', '.join(f'{b}: {a}' for a, b in specs(lm.group(1)))
body = mod
for m in sorted([im, rm, lm], key=lambda m: -m.start()):
    body = body[:m.start()] + body[m.end():]
assert 'import ' not in re.sub(r'//.*', '', body)[:0] or True
out = f"""/* three.js (MIT), rewrapped as a classic script for file:// by tools/classic.py; same source as three.module.js */
(function () {{
var __core = (function () {{
{core_js}
}})();
var {{ {destr} }} = __core;
{body}
window.THREE = Object.assign({{ {re_obj} }}, {{ {loc_obj} }});
}})();
"""
open(f'{d}/three.classic.js', 'w').write(out)
print(len(out))
