p = '/home/user/mow-compare/src/compare/compare.css'
s = open(p).read()
def rep(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)
rep("""h2 {
  margin: 9px 0 2px;""", """h2 {
  margin: 7px 0 2px;""")
rep(""".toggles {
  display: flex;
  gap: 6px;
  align-items: center;
}

.views {
  display: flex;
  gap: 9px;
}
""", """/* The Mechanism heading, with the one budget selector at its right. */
.heading-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 4px;
}

.heading-row h2 {
  margin-bottom: 3px;
}

.heading-row select {
  padding: 1px 4px;
}

.views {
  display: flex;
  gap: 12px;
  min-height: 20px;
}
""")
rep(""".toggles select {
  padding: 3px 4px;
}

.toggles .check {
  overflow: visible;
}

.toggles select {
  margin-left: auto;
}
""", "")
rep("""  min-height: 2.7em;
  margin: 5px 0 0;
  padding-left: 8px;""", """  min-height: 2.7em;
  margin: 5px 0 0;
  padding-left: 8px;
  font-size: 12px;""")
open(p, 'w').write(s)
