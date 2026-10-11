import sys
p='/home/user/motes-of-work/src/autoAdvance/plan.ts'
s=open(p).read()
end=s.index("/** How long to hold at a stop")
s=open(sys.argv[1]).read()+s[end:]
open(p,'w').write(s)
