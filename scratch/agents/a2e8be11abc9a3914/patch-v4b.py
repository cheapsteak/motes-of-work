p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:70]
    s = s.replace(a, b); n += 1

# 1. a fifth kind, the burst: weighted so it is the commonest; the hashed kind picks by weight
rep("let kind = Math.floor(4 * hash01(seed, k * 2 + 1)) % 4; if (KIND) kind = ['stall', 'reverse', 'skip', 'wobble'].indexOf(KIND); return { s, kind, active: s >= 0 && s <= 1, k }; }",
    "const u = hash01(seed, k * 2 + 1); let kind = u < 0.4 ? 4 : u < 0.65 ? 2 : u < 0.8 ? 0 : u < 0.9 ? 1 : 3; if (KIND) kind = KINDS.indexOf(KIND); return { s, kind, active: s >= 0 && s <= 1, k }; }")
rep("const KINDS = ['stall', 'reverse', 'skip', 'wobble'];", "// (KINDS is declared above derpEvent)")
rep("      function derpEvent(seed, t, phase) {", "      const KINDS = ['stall', 'reverse', 'skip', 'wobble', 'burst'];\n      function derpEvent(seed, t, phase) {")
rep("const DERP = { period: 2.2, dur: 1.0, stall: 0.7, reverse: 0.5, skip: 0.55, lift: 0.2, wobble: 0.06, ring: 2 };",
    "const DERP = { period: 2.2, dur: 1.0, stall: 0.7, reverse: 0.5, skip: 0.55, lift: 0.2, wobble: 0.06, ring: 2,\n        burst: { slots: 8, hold: 0.6, snap: 0.45, jump: 0.9, lift: 0.3, jitter: 0.03, tremble: 0.05, ghost: 0.6 } };")
# the burst's terms: eight micro-slots in the second; each slot a hashed snap along the orbit, often a jump off it, a lift, sometimes a ghost;
# the jump holds for 60 % of the slot and returns; a fine jitter throughout; the whole group trembles in the middle third
rep("""        const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0] };
        if (v <= 0) return out; const e = derpEvent(seed, t, phase); if (!e.active) return out; const s = e.s;
        if (e.kind === 0)""",
"""        const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0], ghost: null };
        if (v <= 0) return out; const e = derpEvent(seed, t, phase); if (!e.active) return out; const s = e.s;
        if (e.kind === 4) {
          const B = DERP.burst; const m = Math.floor(s * B.slots); const f = (s * B.slots) % 1; const on = f < B.hold;
          const h = (j) => hash01(seed ^ 0xb0b, e.k * 64 + m * 8 + j);
          out.dAngle = (on ? (h(0) - 0.5) * B.snap : 0) + B.jitter * Math.sin(s * 160 + h(6) * 6);
          out.dRadius = (on && h(1) < 0.7 ? (h(2) - 0.5) * B.jump : 0) + B.jitter * Math.sin(s * 230 + 1);
          out.dUp = on ? (h(3) - 0.5) * B.lift : 0;
          if (s > 0.3 && s < 0.7) { const env = Math.sin(((s - 0.3) / 0.4) * Math.PI); const q = (x) => 2 * hash01(seed ^ 0x7e7, Math.floor(x)) - 1; out.wobble = [B.tremble * env * q(s * 40), 0.5 * B.tremble * env * q(s * 40 + 17), B.tremble * env * q(s * 40 + 33)]; }
          if (on && h(4) < 0.5) out.ghost = (h(5) - 0.5) * B.ghost; // a ghost double, this far along the orbit from the body
        } else if (e.kind === 0)""")
# 2. the ghost double in the mock: a dim copy of a cracked body drawn only while a burst asks for it
rep("""          const o = ellipsePos(n, t, dA, dR, up); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];""",
"""          const o = ellipsePos(n, t, dA, dR, up); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];
          n._ghost = null;
          if (n.cracked) { const d = derp(n.seed, t, omega, n.phase, n.v); if (d.ghost !== null) { const og = ellipsePos(n, t, dA + d.ghost, dR, up); n._ghost = [base[0] + og[0], base[1] + og[1], base[2] + og[2]]; } }""")
rep("""        let glow = null;
        if (n.layer === 'rule')""",
"""        let ghost = null;
        if (n.cracked && n.layer !== 'rule') { ghost = new THREE.Mesh(n.layer === 'code' ? moonGeo : sphereGeo, rimMat(col, n.layer === 'code' ? 0.28 : 0.035, n.layer === 'code' ? 1.1 : 0.55, 0.45)); ghost.scale.setScalar(n.R); ghost.visible = false; hoodGroup.add(ghost); }
        let glow = null;
        if (n.layer === 'rule')""")
rep("const rec = { node: n, group: g, mesh: m, shell, orbits, glow }; recs.push(rec); return rec;",
    "const rec = { node: n, group: g, mesh: m, shell, orbits, glow, ghost }; recs.push(rec); return rec;")
rep("""          const p = nodePos(rec.node, t); rec.group.position.set(p[0], p[1], p[2]);
          if (rec.orbits && rec.orbits.visible) {""",
"""          const p = nodePos(rec.node, t); rec.group.position.set(p[0], p[1], p[2]);
          const w = rec.node.cracked ? bodyTremble(rec.node, t) : null; if (w) { rec.mesh.position.set(...w); rec.shell.position.set(...w); }
          if (rec.ghost) { const gp = rec.node._ghost; rec.ghost.visible = !!gp && rec.group.visible && rec.mesh.visible; if (gp) rec.ghost.position.set(gp[0], gp[1], gp[2]); }
          if (rec.orbits && rec.orbits.visible) {""")
rep("""      function activeEvent(n, t) {""",
"""      // the shiver of a body in place (a star's derp, and the burst's tremble on a planet or moon)
      function bodyTremble(n, t) { if (n.layer === 'rule') return [0, 0, 0]; const d = derp(n.seed, t, (2 * Math.PI) / n.period, n.phase, n.v); return d.wobble.map((w) => w * n.R * 4); }
      function activeEvent(n, t) {""")
rep("close: 'Left: a healthy plan (a planet) with the pieces of code built from it (its moons). Right: the same, with one piece carrying the defect: once in a while that moon stalls, runs backwards, drifts off its track and snaps back. The small pair above the controls is the same two from the far shot distance.',",
    "close: 'Left: a healthy plan (a planet) with the pieces of code built from it (its moons). Right: the same, with one piece carrying the defect: once in a while that moon stalls, runs backwards, drifts off its track and snaps back, or goes into a burst: a second of rapid stutters off and back, jittering, snapping ahead and behind, a ghost double, the planet trembling. The small pair above the controls is the same two from the far shot distance.',")
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
