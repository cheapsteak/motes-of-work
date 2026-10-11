import sys
p='/home/user/motes-of-work/src/autoAdvance/plan.test.ts'
s=open(p).read()
end=s.index("describe('dwellSeconds'")
s=open(sys.argv[1]).read()+s[end:]
open(p,'w').write(s)
