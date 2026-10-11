p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:70]
    s = s.replace(a, b); n += 1
# un-eased: the jitter is a hashed value held for 1/30 s and then cut to the next (no sine); some slots quantise the body's own
# orbital time to 0.1 s steps (a dropped-frame stutter: held, then a jump along the orbit)
rep("""          out.dAngle = (on ? (h(0) - 0.5) * B.snap : 0) + B.jitter * Math.sin(s * 160 + h(6) * 6);
          out.dRadius = (on && h(1) < 0.7 ? (h(2) - 0.5) * B.jump : 0) + B.jitter * Math.sin(s * 230 + 1);""",
"""          const jq = Math.floor(s * 30); // the jitter is cut, not eased: a new hashed offset every 1/30 s, held between
          out.dAngle = (on ? (h(0) - 0.5) * B.snap : 0) + B.jitter * (2 * hash01(seed ^ 0x3a3, e.k * 100 + jq) - 1);
          out.dRadius = (on && h(1) < 0.7 ? (h(2) - 0.5) * B.jump : 0) + B.jitter * (2 * hash01(seed ^ 0x3a4, e.k * 100 + jq) - 1);
          out.step = h(7) < 0.45 ? B.step : 0; // in some slots the body's own clock is quantised: held, then a jump along the orbit""")
rep("burst: { slots: 8, hold: 0.6, snap: 0.45, jump: 0.9, lift: 0.3, jitter: 0.03, tremble: 0.05, ghost: 0.6 } };",
    "burst: { slots: 8, hold: 0.6, snap: 0.45, jump: 0.9, lift: 0.3, jitter: 0.03, tremble: 0.05, ghost: 0.6, step: 0.1 } };")
rep("const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0], ghost: null };", "const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0], ghost: null, step: 0 };")
rep("function ellipsePos(n, t, dAngle, dRadius, up) { const M = n.phase + (2 * Math.PI * t) / n.period;",
    "function ellipsePos(n, t, dAngle, dRadius, up, tM = t) { const M = n.phase + (2 * Math.PI * tM) / n.period;")
rep("""          const omega = (2 * Math.PI) / n.period; let dA = 0, dR = 0, up = 0;
          if (n.cracked && n.layer !== 'rule') { const d = derp(n.seed, t, omega, n.phase, n.v); dA = d.dAngle; dR = d.dRadius; up = d.dUp * n.orbitR; }
          const o = ellipsePos(n, t, dA, dR, up); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
          n._ghost = null;
          if (n.cracked) { const d = derp(n.seed, t, omega, n.phase, n.v); if (d.ghost !== null) { const og = ellipsePos(n, t, dA + d.ghost, dR, up); n._ghost = [base[0] + og[0], base[1] + og[1], base[2] + og[2]]; } }""",
"""          const omega = (2 * Math.PI) / n.period; let dA = 0, dR = 0, up = 0, tM = t, ghost = null;
          if (n.cracked && n.layer !== 'rule') { const d = derp(n.seed, t, omega, n.phase, n.v); dA = d.dAngle; dR = d.dRadius; up = d.dUp * n.orbitR; ghost = d.ghost; if (d.step) tM = Math.floor(t / d.step) * d.step; }
          const o = ellipsePos(n, t, dA, dR, up, tM); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
          n._ghost = null;
          if (ghost !== null) { const og = ellipsePos(n, t, dA + ghost, dR, up, tM); n._ghost = [base[0] + og[0], base[1] + og[1], base[2] + og[2]]; }""")
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
