"""Task 17: re-time vibe-build for the basket's stage (L 6.4 -> 7.2) and re-value the assembly holds.

Every vibe-build key keeps its screen up to the end of the turn (4.05); after it, every key moves
0.8 screen later. The S3 shot holds on through the basket's stage (to 4.90). The assembly track is
written out whole. Locals are screens / 7.2, to 8 places.
"""

import json
import os
import re

os.chdir('.')
OLD_L, NEW_L = 6.4, 7.2
TURN_END, SHIFT, S3_HOLD_TO = 4.05, 0.8, 4.90


def loc(screens):
    return round(screens / NEW_L, 8)


def fmt(v):
    return f'vibe-build@{v:.8f}'.rstrip('0').rstrip('.') if v not in (0, 1) else f'vibe-build@{int(v)}'


def screens_of(at):
    return round(float(at.split('@')[1]) * OLD_L, 6)


def moved(s):
    return s if s <= TURN_END + 1e-9 else round(s + SHIFT, 6)


path = 'src/timeline/keyframes.json'
text = open(path).read()
data = json.loads(text)
tracks = data['tracks']

for name, keys in tracks.items():
    out = []
    for k in keys:
        if not k['at'].startswith('vibe-build@'):
            out.append(k)
            continue
        s = screens_of(k['at'])
        k = dict(k)
        k['at'] = fmt(loc(moved(s)))
        out.append(k)
        # The front shot holds on through the basket's stage.
        if name.startswith('camera.') and abs(s - TURN_END) < 1e-6:
            hold = {kk: vv for kk, vv in k.items() if kk != 'ease'}
            hold['at'] = fmt(loc(S3_HOLD_TO))
            out.append(hold)
    tracks[name] = out

# The assembly track, written whole: the stage holds at 0.33, 0.49, 0.61 and 0.73; the basket's
# gather, drop and hop; the frame laid under line 5, with a key where the mudguards set out (line 6).
VB = [
    (0, 0), (1.10, 0), (1.60, 0.33), (1.90, 0.33), (2.35, 0.49), (3.00, 0.49), (3.35, 0.61),
    (4.20, 0.61), (4.50, 0.698), (4.65, 0.709), (4.80, 0.72), (4.85, 0.73),
    (5.20, 0.73), (5.62, 0.87), (5.95, 0.98), (6.00, 1),
]
rest = [k for k in tracks['mech.assembly'] if not k['at'].startswith('vibe-build@')]
for k in rest:
    if k['at'] in ('spec@0.84', 'spec@0.85'):
        assert k['value'] == 0.46
        k['value'] = 0.34
tracks['mech.assembly'] = [{'at': fmt(loc(s)), 'value': v} for s, v in VB] + rest

# Write in the file's own one-key-per-line style.
lines = ['{', '  "tracks": {']
names = list(tracks)
for i, name in enumerate(names):
    lines.append(f'    "{name}": [')
    keys = tracks[name]
    for j, k in enumerate(keys):
        body = json.dumps(k, separators=(', ', ': '))
        body = '{ ' + body[1:-1] + ' }'
        lines.append(f'      {body}' + (',' if j < len(keys) - 1 else ''))
    lines.append('    ]' + (',' if i < len(names) - 1 else ''))
lines += ['  }', '}', '']
new = '\n'.join(lines)
open(path, 'w').write(new)
print('written', len(new))
