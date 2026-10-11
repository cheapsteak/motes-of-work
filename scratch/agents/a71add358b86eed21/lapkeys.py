"""Splice the generated lap (orbitKeys) and the dive's frame keys into keyframes.json."""

import json

D = '<scratchpad>/agents/a71add358b86eed21'
P = '/home/user/motes-of-work/src/timeline/keyframes.json'
src = open(D + '/keys.py').read()
fmt_src = src[src.index('def fmt'):src.index("open(P, 'w').write(fmt(d))")]
exec(fmt_src)

d = json.load(open(P))
t = d['tracks']
lap = json.load(open(D + '/lap.json'))


def at(local):
    return f'vibe-build@{local:.10g}'


def splice(track, after, keys):
    """Insert keys after the key whose at is `after`."""
    i = next(i for i, k in enumerate(t[track]) if k['at'] == after)
    t[track][i + 1:i + 1] = keys


splice('camera.pos', 'vibe-build@0.875', [{'at': at(k['at']), 'value': k['pos']} for k in lap])
splice('camera.target', 'vibe-build@0.875', [{'at': at(k['at']), 'value': k['target']} for k in lap])
splice('camera.fov', 'vibe-build@0.745', [{'at': 'vibe-build@0.875', 'value': 40}] + [{'at': at(k['at']), 'value': k['fov']} for k in lap])
splice('camera.frame', 'vibe-build@0.745', [
    {'at': 'vibe-build@0.94375', 'value': 0},
    {'at': 'vibe-build@0.9675', 'value': 1, 'ease': 'inOutCubic'},
    {'at': 'vibe-build@0.9875', 'value': 0, 'ease': 'inOutCubic'},
])
open(P, 'w').write(fmt(d))
