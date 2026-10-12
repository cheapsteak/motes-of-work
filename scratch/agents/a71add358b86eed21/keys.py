"""Re-keys the cold open (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.4), lap excepted."""

import json
import math

P = 'src/timeline/keyframes.json'
d = json.load(open(P))
t = d['tracks']


def vb(local):
    return f'vibe-build@{local:.10g}'


def key(at, value, ease=None):
    k = {'at': at, 'value': value}
    if ease:
        k['ease'] = ease
    return k


def others(track):
    """The keys of a track outside the vibe-build section, in order."""
    return [k for k in t[track] if not str(k['at']).startswith('vibe-build@')]


S = {
    'S0': ([3.571, 0.979, 4.255], [0, 0, 0], 40),
    'S1': ([2.456, 0.602, 3.508], [0, 0, 0], 40),
    'S2': ([-0.285, 0.507, 2.929], [-0.029, -0.118, -0.002], 38),
    'S3': ([2.098, 0.94, 2.028], [0.394, -0.024, -0.002], 36),
    'S1p': ([2.896, 0.576, 2.896], [0, 0, 0], 40),
}

# mech.assembly: four stages, each held one flare width past its window's end.
t['mech.assembly'] = [
    key(vb(0), 0),
    key(vb(0.28125), 0),
    key(vb(0.34375), 0.45),
    key(vb(0.4125), 0.45),
    key(vb(0.46875), 0.61),
    key(vb(0.56875), 0.61),
    key(vb(0.6125), 0.73),
    key(vb(0.75625), 0.73),
    key(vb(0.85), 0.98),
    key(vb(0.85625), 1),
] + others('mech.assembly')

# mech.drive: two crank turns with the chain, held at an even number of turns, then riding.
drive_rest = [k for k in others('mech.drive') if not str(k['at']).startswith('reveal@')]
t['mech.drive'] = [
    key(vb(0), 0),
    key(vb(0.43125), 0),
    key(vb(0.5125), 2),
    key(vb(0.875), 2),
    key(vb(1), 2.4),
    key('reveal@0.14', 2.7),
    key('reveal@0.26', 2.9),
    key('reveal@0.52', 3),
    key('reveal@1', 3),
] + drive_rest

# mech.steer: the cancel over the drive ramp (nine linear keys, -sin(pi drive / 2) at drive 0.25 k),
# then the turn, its own segment.
cancel = []
for k in range(9):
    local = 0.43125 + k * 0.01015625
    value = -math.sin(math.pi * 0.25 * k / 2)
    v = round(value, 5) + 0.0
    cancel.append(key(vb(round(local, 8)), int(v) if v == int(v) else v))
t['mech.steer'] = (
    cancel
    + [
        key(vb(0.625), 0),
        key(vb(0.64375), 1, 'inOutQuad'),
        key(vb(0.68125), -1, 'inOutQuad'),
        key(vb(0.7), 0, 'inOutQuad'),
    ]
    + others('mech.steer')
)


def cam(index, shot):
    return S[shot][index]


def camera_track(index):
    return [
        key(vb(0), cam(index, 'S0')),
        key(vb(0.1), cam(index, 'S0')),
        key(vb(0.175), cam(index, 'S1'), 'inOutCubic'),
        key(vb(0.37), cam(index, 'S1')),
        key(vb(0.41), cam(index, 'S2'), 'inOutCubic'),
        key(vb(0.53), cam(index, 'S2')),
        key(vb(0.565), cam(index, 'S3'), 'inOutCubic'),
        key(vb(0.7), cam(index, 'S3')),
        key(vb(0.745), cam(index, 'S1'), 'inOutCubic'),
        key(vb(0.85), cam(index, 'S1p')),
        key(vb(0.875), cam(index, 'S1p')),
    ]


t['camera.pos'] = camera_track(0) + others('camera.pos')
t['camera.target'] = camera_track(1) + others('camera.target')
t['camera.fov'] = [
    key(vb(0), 40),
    key(vb(0.37), 40),
    key(vb(0.41), 38, 'inOutCubic'),
    key(vb(0.53), 38),
    key(vb(0.565), 36, 'inOutCubic'),
    key(vb(0.7), 36),
    key(vb(0.745), 40, 'inOutCubic'),
] + others('camera.fov')
t['camera.frame'] = [
    key(vb(0), 0),
    key(vb(0.37), 0),
    key(vb(0.41), 1, 'inOutCubic'),
    key(vb(0.7), 1),
    key(vb(0.745), 0, 'inOutCubic'),
] + others('camera.frame')



def fmt(d):
    out = ['{', '  "tracks": {']
    names = list(d['tracks'])
    for i, name in enumerate(names):
        out.append(f'    {json.dumps(name)}: [')
        keys = d['tracks'][name]
        for j, k in enumerate(keys):
            parts = [f'"at": {json.dumps(k["at"])}', f'"value": {json.dumps(k["value"]).replace(",", ", ").replace(",  ", ", ")}']
            if 'ease' in k:
                parts.append(f'"ease": {json.dumps(k["ease"])}')
            out.append('      { ' + ', '.join(parts) + ' }' + (',' if j < len(keys) - 1 else ''))
        out.append('    ]' + (',' if i < len(names) - 1 else ''))
    out += ['  }', '}']
    return '\n'.join(out) + '\n'


open(P, 'w').write(fmt(d))
