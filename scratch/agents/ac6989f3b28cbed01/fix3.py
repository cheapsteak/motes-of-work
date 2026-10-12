import os

os.chdir('.')
p = 'src/compare/compare.css'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


rep("""h2 {
  margin: 10px 0 4px;""", """h2 {
  margin: 9px 0 2px;""")
rep(""".hint,
.blurb {
  margin: 2px 0 0;
  color: var(--muted);
}

.blurb {
  min-height: 2.7em;
  margin: 6px 0;
}
""", """.hint,
.blurb,
.preset-blurb,
.group-hint {
  margin: 2px 0 0;
  color: var(--muted);
}

.blurb {
  min-height: 2.7em;
  margin: 6px 0;
}

.preset-blurb {
  min-height: 2.7em;
  margin: 4px 0 0;
}

.group-hint {
  margin: 0 0 3px;
  font-size: 12px;
}
""")
rep("""#notice {
  position: absolute;""", """#building {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: 8px 14px;
  color: var(--text);
  background: var(--panel);
  border: 1px solid var(--edge);
  border-radius: 6px;
}

#notice {
  position: absolute;""")
open(p, 'w').write(s)
print('ok')
