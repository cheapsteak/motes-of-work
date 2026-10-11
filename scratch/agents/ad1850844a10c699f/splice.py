import json
import os

os.chdir('/home/user/motes-of-work')
S = '<scratchpad>/agents/ad1850844a10c699f'
orbit = json.load(open(f'{S}/orbit.json'))
LAP_FROM = 0.86111111
path = 'src/timeline/keyframes.json'
data = json.load(open(path))
tracks = data['tracks']


def at_of(k):
    return float(k['at'].split('@')[1]) if k['at'].startswith('vibe-build@') else None


for name, pick in [('camera.pos', 'pos'), ('camera.target', 'target'), ('camera.fov', 'fov')]:
    keys = tracks[name]
    lap = [i for i, k in enumerate(keys) if at_of(k) is not None and at_of(k) > LAP_FROM + 1e-9]
    assert len(lap) == len(orbit), (name, len(lap), len(orbit))
    first = lap[0]
    assert lap == list(range(first, first + len(lap)))
    for i, o in zip(lap, orbit):
        old = at_of(keys[i])
        assert abs(old - o['at']) < 1e-6, (name, old, o['at'])
        keys[i] = {'at': f"vibe-build@{o['at']}" if o['at'] != 1 else 'vibe-build@1', 'value': o[pick]}

lines = ['{', '  "tracks": {']
names = list(tracks)
for i, name in enumerate(names):
    lines.append(f'    "{name}": [')
    keys = tracks[name]
    for j, k in enumerate(keys):
        body = json.dumps(k, separators=(', ', ': '))
        lines.append('      { ' + body[1:-1] + ' }' + (',' if j < len(keys) - 1 else ''))
    lines.append('    ]' + (',' if i < len(names) - 1 else ''))
lines += ['  }', '}', '']
open(path, 'w').write('\n'.join(lines))
print('spliced', len(orbit))
