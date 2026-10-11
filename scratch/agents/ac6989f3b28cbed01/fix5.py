import os

os.chdir('/home/user/motes-of-work')
s = ''


def rep(a, b):
    global s
    assert a in s, a
    s = s.replace(a, b)


p = 'src/compare/compare.html'
s = open(p).read()
rep("""        <h1>Mechanism comparison</h1>
        <p class="hint">Drag to orbit, scroll to zoom, right-drag to pan.</p>
""", """        <h1>Mechanism comparison</h1>
""")
rep("""      <p id="building" role="status" hidden></p>""", """      <p id="orbit-hint">Drag to orbit, scroll to zoom, right-drag to pan.</p>
      <p id="building" role="status" hidden></p>""")
open(p, 'w').write(s)

p = 'src/compare/compare.css'
s = open(p).read()
rep("  --panel-width: 340px;", "  --panel-width: 372px;")
rep(""".hint,
.blurb,""", """.blurb,""")
rep("""#building {""", """#orbit-hint {
  position: absolute;
  right: 12px;
  bottom: 8px;
  margin: 0;
  font-size: 12px;
  color: var(--muted);
  pointer-events: none;
}

#building {""")
rep("""  grid-template-columns: 58px 1fr 32px;""", """  grid-template-columns: 76px 1fr 32px;""")
open(p, 'w').write(s)

p = 'src/compare/controls.ts'
s = open(p).read()
rep("    group('Provenance'),", "    group('Provenance', 'two'),")
open(p, 'w').write(s)

p = 'e2e/compare.spec.ts'
s = open(p).read()
rep("'#panes, .pane, #building, #notice { visibility: hidden !important; }'",
    "'#panes, .pane, #building, #notice, #orbit-hint { visibility: hidden !important; }'")
open(p, 'w').write(s)
print('ok')
