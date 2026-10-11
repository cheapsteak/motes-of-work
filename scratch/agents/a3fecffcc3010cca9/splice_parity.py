import sys

p = '/home/user/motes-of-work/src/parity/parity.ts'
mid = open(sys.argv[1]).read()
s = open(p).read()
start = s.index('function run(): ParityCase[] {')
end = s.index('function report(cases: ParityCase[]')
s = s[:start] + mid + s[end:]
open(p, 'w').write(s)
