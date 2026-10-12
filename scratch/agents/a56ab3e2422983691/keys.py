p = 'src/timeline/keyframes.json'
s = open(p).read()
old_assembly = '''      { "at": "vibe-build@0", "value": 0 },
      { "at": "vibe-build@0.7", "value": 1, "ease": "outCubic" },
      { "at": "rewind@0", "value": 1 },'''
new_assembly = '''      { "at": "vibe-build@0", "value": 0 },
      { "at": "vibe-build@0.23", "value": 0 },
      { "at": "vibe-build@0.48", "value": 0.45 },
      { "at": "vibe-build@0.56", "value": 0.72 },
      { "at": "vibe-build@0.64", "value": 0.8 },
      { "at": "vibe-build@0.72", "value": 0.87 },
      { "at": "vibe-build@0.8", "value": 0.95 },
      { "at": "vibe-build@0.85", "value": 1 },
      { "at": "rewind@0", "value": 1 },'''
old_drive = '''      { "at": "vibe-build@0", "value": 0 },
      { "at": "vibe-build@1", "value": 2 },
      { "at": "reveal@0.3", "value": 3 },
      { "at": "reveal@0.4", "value": 3.08 },
      { "at": "reveal@0.6", "value": 3.08 },
      { "at": "reveal@1", "value": 3.28 },
      { "at": "rewind@1", "value": 0 },'''
new_drive = '''      { "at": "vibe-build@0", "value": 0 },
      { "at": "vibe-build@0.52", "value": 0 },
      { "at": "vibe-build@0.56", "value": 0.25 },
      { "at": "vibe-build@0.64", "value": 0.9 },
      { "at": "vibe-build@0.72", "value": 1.3 },
      { "at": "vibe-build@0.8", "value": 1.6 },
      { "at": "vibe-build@1", "value": 2 },
      { "at": "reveal@0.14", "value": 2.6 },
      { "at": "reveal@0.26", "value": 2.9 },
      { "at": "reveal@0.52", "value": 3 },
      { "at": "reveal@1", "value": 3 },
      { "at": "rewind@1", "value": 0 },'''
assert s.count(old_assembly) == 1 and s.count(old_drive) == 1
s = s.replace(old_assembly, new_assembly).replace(old_drive, new_drive)
open(p, 'w').write(s)
print('ok')
