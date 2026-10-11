g = '/home/user/motes-of-work/src/galaxy/generate.ts'
t = open(g).read()
new = open('<scratchpad>/agents/a46a6f5635f5d31d8/fit-new.ts').read()
a = t.index('/**\n * The apoapses of a star\'s planets for eccentricities')
b = t.index('/** Spots for the core:')
t = t[:a] + new + '\n' + t[b:]
t = t.replace('const fit: FitCounts = { slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };', 'const fit: FitCounts = { systemsEased: 0, slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };')
t = t.replace('  PLANET_ORBIT_MAX,\n', '  PLANET_ORBIT_FIRST,\n  PLANET_ORBIT_MAX,\n', 1)
open(g, 'w').write(t)
p = '/home/user/motes-of-work/src/galaxy/zz-probe.test.ts'
s = open(p).read()
s = s.replace("const tot = { slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };", "const tot = { systemsEased: 0, slotsDropped: 0, systemsFlattened: 0, moonsDropped: 0 };")
open(p, 'w').write(s)
