"""Apply one exact string mutation to a file, run a command, then apply the exact inverse edit.

Usage: python3 mutate.py FILE OLD NEW -- COMMAND...
Prints the command's summary lines and whether the file is byte-identical afterwards.
"""
import hashlib
import subprocess
import sys

path, old, new = sys.argv[1], sys.argv[2], sys.argv[3]
cmd = sys.argv[sys.argv.index('--') + 1 :]
src = open(path, encoding='utf-8').read()
before = hashlib.sha256(src.encode()).hexdigest()
if src.count(old) != 1:
    sys.exit(f'mutation target found {src.count(old)} times')
open(path, 'w', encoding='utf-8').write(src.replace(old, new))
try:
    out = subprocess.run(cmd, capture_output=True, text=True, cwd='/home/user/motes-of-work')
    lines = [l for l in (out.stdout + out.stderr).splitlines() if any(w in l for w in ('Tests ', 'passed', 'failed', 'FAIL', 'AssertionError', 'maxError', 'Expected', 'Received'))]
    print('\n'.join(lines[:14]))
    print('exit', out.returncode)
finally:
    cur = open(path, encoding='utf-8').read()
    if cur.count(new) != 1:
        sys.exit('inverse target missing')
    open(path, 'w', encoding='utf-8').write(cur.replace(new, old))
    after = hashlib.sha256(open(path, encoding='utf-8').read().encode()).hexdigest()
    print('restored byte-identical:', before == after)
