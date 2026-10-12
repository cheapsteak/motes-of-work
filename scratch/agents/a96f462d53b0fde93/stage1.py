import subprocess

ROOT = '.'


def head(path):
    return subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout


def stage(path, content):
    sha = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=content, capture_output=True, text=True, check=True).stdout.strip()
    subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{sha},{path}'], cwd=ROOT, check=True)


# keyframes.json at HEAD with only the first stack's end glow raised.
k = head('src/timeline/keyframes.json')
old = '{ "at": "zoom-out@0.9", "value": 0.03, "ease": "inOutCubic" }'
assert old in k
stage('src/timeline/keyframes.json', k.replace(old, '{ "at": "zoom-out@0.9", "value": 0.05, "ease": "inOutCubic" }'))

# networkKeys.test.ts at HEAD with only the 0.03 -> 0.05 changes.
n = head('src/timeline/networkKeys.test.ts')
n2 = n.replace('toEqual([1, 1, 0.03, 0])', 'toEqual([1, 1, 0.05, 0])').replace('toEqual([1, 1, 0.03])', 'toEqual([1, 1, 0.05])')
assert n2 != n
stage('src/timeline/networkKeys.test.ts', n2)

# The node files and their tests whole.
for p in [
    'src/scene/node/birth.ts',
    'src/scene/node/node.glsl',
    'src/scene/node/node.ts',
    'src/scene/node/node.test.ts',
    'src/scene/node/nodeAttrs.ts',
    'src/scene/node/nodeLayout.ts',
    'src/scene/node/nodeSystem.test.ts',
    'src/scene/node/shaders/halo.vert.glsl',
    'src/scene/node/shaders/node.vert.glsl',
    'src/timeline/keyframes.test.ts',
]:
    subprocess.run(['git', 'add', p], cwd=ROOT, check=True)
