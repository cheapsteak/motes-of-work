import json

p = 'src/timeline/keyframes.json'
d = json.load(open(p))
tracks = d['tracks']

S8 = ([0, 0, 6.111], [0, 0, 0])
S11 = ([0.018, 0.182, 3.664], [0.018, 0.182, -0.002])
S11c = ([0.3, 0.305, 2.066], [0.3, 0.305, -0.002])
S10 = ([2.741, 1.669, 2.3], [0, 0, 0])
S9p = ([3.43, 1.898, 2.909], [-0.032, -0.21, 0.003])
S10p = ([2.651, 1.748, 2.651], [0, 0, 0])


def k(at, value, ease=None):
    out = {'at': f'spec@{at}', 'value': value}
    if ease:
        out['ease'] = ease
    return out


# Drop every spec key and the ghost tracks: the ink replaces the dotted drawing in this section.
for name in list(tracks):
    tracks[name] = [x for x in tracks[name] if not (isinstance(x['at'], str) and x['at'].startswith('spec@'))]
del tracks['mech.ghost']
del tracks['mech.ghostVariant']
for name in list(tracks):
    assert tracks[name], name

ioc = 'inOutCubic'
ioq = 'inOutQuad'
tracks['mech.assembly'] += [k(0.72, 0), k(0.84, 0.46), k(0.85, 0.46), k(0.95, 1)]
tracks['mech.drive'] += [k(0.9, 0), k(1, 1.4)]
moves = [
    (0.08, S11, ioc),
    (0.17, S11, None),
    (0.21, S11c, ioc),
    (0.27, S11c, None),
    (0.31, S11, ioc),
    (0.53, S11, None),
    (0.63, S10, ioc),
    (0.7, S10, None),
    (0.74, S9p, ioc),
    (0.84, S9p, None),
    (0.9, S10p, ioc),
]
tracks['camera.pos'] += [k(at, shot[0], e) for at, shot, e in moves]
tracks['camera.target'] += [k(at, shot[1], e) for at, shot, e in moves]
tracks['camera.fov'] += [k(0.08, 35, ioc), k(0.17, 35), k(0.21, 33, ioc), k(0.27, 33), k(0.31, 35, ioc)]
tracks['camera.frame'] += [k(0.17, 0), k(0.21, 1, ioc), k(0.27, 1), k(0.31, 0, ioc)]
tracks['camera.coreFocus'] += [k(0.7, 0), k(0.74, 0.6, ioc), k(0.84, 0.6), k(0.9, 0, ioc)]
tracks['sheet.opacity'] = [k(0.02, 0), k(0.08, 1, ioq), k(0.6, 1), k(0.69, 0, ioq)]
tracks['stage.motes'] = [k(0.02, 1), k(0.08, 0.1, ioq), k(0.62, 0.1), k(0.72, 1, ioq)]
tracks['ink.opacity'] = [k(0.04, 0), k(0.05, 1), k(0.9, 1), k(0.97, 0.25, ioq)]
tracks['ink.drawn'] = [k(0.05, 0), k(0.16, 1)]
tracks['ink.redraw'] = [k(0.32, 0), k(0.41, 1)]
tracks['ink.flat'] = [k(0.61, 1), k(0.69, 0, ioc)]
tracks['ink.ring'] = [k(0.28, 0), k(0.31, 1), k(0.39, 1), k(0.42, 2)]
tracks['ink.tick'] = [k(0.46, 0), k(0.49, 1)]


def fmt(v):
    if isinstance(v, list):
        return '[' + ', '.join(fmt(x) for x in v) + ']'
    return json.dumps(v)


lines = ['{', '  "tracks": {']
names = list(tracks)
for ti, name in enumerate(names):
    lines.append(f'    "{name}": [')
    keys = tracks[name]
    for i, x in enumerate(keys):
        parts = [f'"at": {json.dumps(x["at"])}', f'"value": {fmt(x["value"])}']
        if 'ease' in x:
            parts.append(f'"ease": {json.dumps(x["ease"])}')
        lines.append('      { ' + ', '.join(parts) + ' }' + (',' if i < len(keys) - 1 else ''))
    lines.append('    ]' + (',' if ti < len(names) - 1 else ''))
lines += ['  }', '}', '']
open(p, 'w').write('\n'.join(lines))
