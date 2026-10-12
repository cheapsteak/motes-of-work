import os

os.chdir('.')
p = 'src/compare/compare.css'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


rep(""".presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}""", """.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.presets button {
  padding: 3px 6px;
}""")
rep("""  grid-template-columns: 76px 1fr 32px;""", """  grid-template-columns: 82px 1fr 30px;""")
open(p, 'w').write(s)
print('ok')
