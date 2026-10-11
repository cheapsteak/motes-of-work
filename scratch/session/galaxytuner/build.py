import re
src = open('galaxy-tuner.src.html').read()
gen = open('gen.js').read().replace('/*HOOD*/', open('hood.txt').read().strip())
gen = re.sub(r'^export ', '', gen, flags=re.M)
open('galaxy-tuner.html', 'w').write(src.replace('/*GEN*/', gen))
print(len(open('galaxy-tuner.html').read()))
