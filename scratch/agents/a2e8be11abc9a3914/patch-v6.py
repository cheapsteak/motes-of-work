p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:80]
    s = s.replace(a, b); n += 1

# 1. a fourth layer: the core's rule bodies. Internal layer names stay: rule = a star (now a plan), plan = a planet (a piece of code), code = a moon (a part)
rep("""        rule: { R: 0.9, shell: 700, dots: 90 },""", """        core: { R: 1.4, shell: 900, dots: 0 },
        rule: { R: 0.9, shell: 700, dots: 90 },""")
# 2. modes
rep("""<button data-mode="close">Close: healthy vs defect</button><button data-mode="system">One solar system</button><button data-mode="hood">The neighbourhood</button><button data-mode="galaxy">The galaxy</button>""",
    """<button data-mode="close">The bike's planet: healthy vs defect</button><button data-mode="system">One plan's system</button><button data-mode="twelve">The twelve</button><button data-mode="hood">The neighbourhood</button><button data-mode="galaxy">The galaxy</button>""")
# 3. the neighbourhood: the core's six rule bodies at the galaxy's centre, a dozen plan-stars on the arm stretch nearest it
rep("""        // six stars on one arm, a stretch of it 70 wide: the source first (the camera's centre)
        const spots = [[0, 0, 0], [-26, 0, 9], [22, 0, -14], [-9, 0, -27], [30, 0, 17], [-30, 0, -16]];
        spots.forEach((s, i) => addSystem(s, i === 0 ? { pinMoons: [4, 3, 3] } : {}));
        return nodes;""",
"""        // the core: six rule bodies at the galaxy's centre (the hood frame is offset by HOOD_AT, so the core sits at minus that); the source at the middle
        const coreSpots = [[0, 0, 0], [9, 0, 4], [-7, 0, 8], [3, 0, -10], [-10, 0, -4], [8, 0, -7]];
        const core = coreSpots.map((c) => addNode('core', null, 0, 0, 0, { at: [c[0] - HOOD_AT[0], 0, c[2] - HOOD_AT[2]] }));
        // the plan-stars: a dozen on the arm stretch nearest the core; P1, P2, P3 (the incorrect rule's plans) first, then P_a (the bike's plan)
        const spots = [[0, 0, 0], [-24, 0, 10], [22, 0, -12], [-8, 0, -26], [28, 0, 16], [-30, 0, -14], [12, 0, 30], [-36, 0, 22], [38, 0, -4], [6, 0, -40], [-16, 0, 40], [34, 0, 34]];
        spots.forEach((sp, i) => {
          const pins = i === 0 ? { pinPlanets: 4, pinMoons: [1, 0, 2, 0], lineage: 0 } : i === 1 ? { pinPlanets: 3, pinMoons: [0, 1, 0], lineage: 0 } : i === 2 ? { pinPlanets: 3, pinMoons: [2, 0, 1], lineage: 0 } : i === 3 ? { pinPlanets: 3, pinMoons: [7, 0, 1], lineage: 1 } : { lineage: 1 + Math.floor(rng() * 5) };
          addSystem(sp, pins);
        });
        for (const st of nodes.filter((x) => x.layer === 'rule')) st.lineage = core[st.lineageIdx ?? 0].idx;
        return nodes;""")
rep("""        const np = opts.pinMoons ? Math.max(opts.pinMoons.length, SIZES.planets()) : SIZES.planets();""",
    """        star.lineageIdx = opts.lineage ?? 0;
        const np = opts.pinPlanets ?? SIZES.planets();""")
# 4. the twelve: three plan-stars (P1, P2, P3) and nine of their planets; P1's first planet is the fixed one; a lit planet's moons go with it
rep("""        // the source: the first star; its three inner planets and nine of their moons; the first moon is the fixed one
        const src = nodes[0]; src.cracked = true; src.source = true;
        const ps = nodes.filter((n) => n.layer === 'plan' && n.parent === src.idx).slice(0, 3);
        const code = ps.flatMap((p) => nodes.filter((n) => n.layer === 'code' && n.parent === p.idx));
        code[0].fixed = true; code[0].cracked = true; code[0].v = 0;
        for (const n of [...ps, ...code.slice(1, 10)]) { n.lit = true; n.cracked = true; }""",
"""        // the source: the core's middle body; the twelve: its three plan-stars (P1, P2, P3) and nine of their planets; P1's first planet is the fixed one
        const src = nodes.find((x) => x.layer === 'core'); src.cracked = true; src.source = true;
        const stars = nodes.filter((x) => x.layer === 'rule').slice(0, 3);
        const planets = stars.flatMap((st) => nodes.filter((x) => x.layer === 'plan' && x.parent === st.idx));
        planets[0].fixed = true; planets[0].cracked = true; planets[0].v = 0;
        for (const x of [...stars, ...planets.slice(1, 10)]) { x.lit = true; x.cracked = true; }
        for (const m of nodes.filter((x) => x.layer === 'code')) { const pl = nodes[m.parent]; if (pl.cracked) { m.cracked = true; m.lit = pl.lit; m.fixed = pl.fixed; m.v = pl.v; } }""")
# 5. cameras and modes
rep("""        system: { b: -10, e: 70, d: 19, fov: 40, t: [0, 0, 0] },
        hood: { b: 0, e: 82, d: 100, fov: 40, t: [0, 0, 0] },""",
"""        system: { b: -10, e: 70, d: 19, fov: 40, t: [0, 0, 0] },
        twelve: { b: -10, e: 74, d: 58, fov: 40, t: [0, 0, 0] },
        hood: { b: 0, e: 82, d: 120, fov: 40, t: [0, 0, 0] },""")
rep("""          else { c = OVER ? parse(OVER) : { ...CAMS[MODE] }; if (!(MODE === 'close' || MODE === 'far')) { const src = worldOf(nodes[0], t); c.t = MODE === 'galaxy' ? [0, 0, 0] : src; if (MODE === 'system') c.d = 2.7 * (nodes[0].rOut || 9.6); } }""",
"""          else { c = OVER ? parse(OVER) : { ...CAMS[MODE] }; if (!(MODE === 'close' || MODE === 'far')) { const stars = nodes.filter((x) => x.layer === 'rule'); const cen = (ids) => { const ws = ids.map((st) => worldOf(st, t)); return ws[0].map((_, i) => ws.reduce((a, w) => a + w[i], 0) / ws.length); }; c.t = MODE === 'galaxy' ? [0, 0, 0] : MODE === 'system' ? worldOf(stars[3], t) : MODE === 'twelve' ? cen(stars.slice(0, 3)) : cen(stars); if (MODE === 'system') c.d = 2.7 * (stars[3].rOut || 9.6); } }""")
rep("""          const lamp = (n) => MODE !== 'system' || rootOf(n).idx === 0;""",
    """          const starsAll = nodes.filter((x) => x.layer === 'rule');
          const lamp = (n) => MODE === 'system' ? rootOf(n).idx === starsAll[3].idx : MODE === 'twelve' ? (n.layer === 'core' || starsAll.slice(0, 3).some((st) => st.idx === rootOf(n).idx)) : true;""")
# 6. the zoom-out: the bike's planet (the fourth star's first planet) -> its star -> the neighbourhood -> the galaxy's centre
rep("""        const star2 = nodes.filter((n) => n.layer === 'rule')[1]; const moon = nodes.find((n) => n.layer === 'code' && nodes[n.parent].parent === star2.idx); // a moon of the second star: the bike's piece
        const planet = nodes[moon.parent], star = nodes[planet.parent];
        const wm = worldOf(moon, t), wp = worldOf(planet, t), ws = worldOf(star, t);
        const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
        let tg = mix(wm, wp, smoothstep(0.08, 0.3, z)); tg = mix(tg, ws, smoothstep(0.3, 0.55, z)); tg = mix(tg, [0, 0, 0], smoothstep(0.7, 1, z));""",
"""        const stars = nodes.filter((x) => x.layer === 'rule'); const star = stars[3]; const planet = nodes.find((x) => x.layer === 'plan' && x.parent === star.idx); // the bike's planet: P_a's first
        const wp = worldOf(planet, t), ws = worldOf(star, t); const wh = (() => { const v = new THREE.Vector3(0, 0, 0); hoodGroup.localToWorld(v); return [v.x, v.y, v.z]; })();
        const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
        let tg = mix(wp, ws, smoothstep(0.12, 0.38, z)); tg = mix(tg, wh, smoothstep(0.45, 0.65, z)); tg = mix(tg, [0, 0, 0], smoothstep(0.72, 1, z));""")
rep("const d = Math.exp(Math.log(1.2) + z * (Math.log(640) - Math.log(1.2)));", "const d = Math.exp(Math.log(1.6) + z * (Math.log(640) - Math.log(1.6)));")
rep("if (mode === 'zoom') { nodes[1].cracked = false; }", "")
# 7. the close pair: the bike's planet with its seven moons (the part groups); the defect copy is cracked, moons and all
rep("""          const mk = (at, sick) => { const p = addNode('plan', null, 0, 0, 0, { at, hero: mode === 'close', R: 0.3 }); addMoons(p, 4, { sick }); return p; };""",
    """          const mk = (at, sick) => { const p = addNode('plan', null, 0, 0, 0, { at, hero: mode === 'close', R: 0.3 }); addMoons(p, 7, { sick }); if (sick) { p.cracked = true; p.seed = SEED * 131 + 7; p.phase = 0.37; for (const m of nodes) if (m.parent === p.idx) m.cracked = true; } return p; };""")
# 8. core bodies draw as stars do (always; a bigger glow), and moons of a lit planet in ember
rep("const k = n.layer === 'rule' ? 1 : n.layer === 'plan' ? Math.max(g.planetPoint * 0.5, g.planetShell) : g.moon;",
    "const isStar = n.layer === 'rule' || n.layer === 'core'; const k = isStar ? 1 : n.layer === 'plan' ? Math.max(g.planetPoint * 0.5, g.planetShell) : g.moon;")
rep("rec.mesh.material.uniforms.uGain.value = (n.layer === 'plan' ? Math.max(g.planetPoint, g.planetShell) : n.layer === 'code' ? g.moon : 1) * rec.baseGain;",
    "rec.mesh.material.uniforms.uGain.value = (n.layer === 'plan' ? Math.max(g.planetPoint, g.planetShell) : n.layer === 'code' ? g.moon : 1) * rec.baseGain;\n        if (n.layer === 'core') { rec.shell.material.uniforms.uGain.value = Math.max(0.35, g.planetPoint) * rec.baseGain; rec.shell.material.uniforms.uScale.value = focal; rec.shell.visible = true; rec.mesh.visible = true; if (rec.glow) { rec.glow.material.uniforms.uScale.value = focal; rec.glow.material.uniforms.uGain.value = rec.baseGain; } return; }")
rep("if (n.layer === 'rule') { glow = points([0, 0, 0], [col.r * 0.9, col.g * 0.9, col.b * 0.9], n.R * 5, 1, 5, 1, 18); g.add(glow); instances += 1; }",
    "if (n.layer === 'rule' || n.layer === 'core') { glow = points([0, 0, 0], [col.r * 0.9, col.g * 0.9, col.b * 0.9], n.R * 5, 1, n.layer === 'core' ? 7 : 5, 1, n.layer === 'core' ? 24 : 18); g.add(glow); instances += 1; }")
# streams: core -> star (the lineage), star -> planet, planet -> moon
rep("""          if (n.parent == null || !lamp(n)) continue; const p = nodes[n.parent];""",
    """          if (!lamp(n)) continue; const pi = n.parent ?? (n.layer === 'rule' ? n.lineage : null); if (pi == null) continue; const p = nodes[pi];""")
rep("""          const gk = n.layer === 'plan' ? gains(p).track : gains(p).moon; if (gk < 0.05) continue;""",
    """          const gk = n.layer === 'rule' ? (MODE === 'galaxy' ? 0 : 0.6) : n.layer === 'plan' ? gains(p).track : gains(p).moon; if (gk < 0.05) continue;""")
rep("const lit = (p.lit || p.source) && n.lit; const cc = lit ? EMBER : AGENT;", "const lit = (p.lit || p.source) && (n.lit || n.fixed); const cc = lit ? EMBER : AGENT;")
# 9. the scatter: a sixth kind; a cracked planet's shell comes apart in hard cuts and re-forms (morph-and-scatter spec, the scatter half)
rep("const KINDS = ['stall', 'reverse', 'skip', 'wobble', 'burst'];", "const KINDS = ['stall', 'reverse', 'skip', 'wobble', 'burst', 'scatter'];")
rep("const u = hash01(seed, k * 2 + 1); let kind = u < 0.4 ? 4 : u < 0.65 ? 2 : u < 0.8 ? 0 : u < 0.9 ? 1 : 3;",
    "const u = hash01(seed, k * 2 + 1); let kind = u < 0.3 ? 4 : u < 0.55 ? 5 : u < 0.75 ? 2 : u < 0.85 ? 0 : u < 0.925 ? 1 : 3;")
rep("const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0], ghost: null, step: 0 };", "const out = { dAngle: 0, dRadius: 0, dUp: 0, wobble: [0, 0, 0], ghost: null, step: 0, scatter: null };")
rep("""        if (e.kind === 4) {""", """        if (e.kind === 5) { out.scatter = { s, k: e.k }; return out; }
        if (e.kind === 4) {""")
# per-mote scatter data on planet shells, and the per-frame deformation
rep("""        const shell = points(sp, sc, n.hero ? 0.012 : n.layer === 'rule' ? 0.03 : n.layer === 'plan' ? 0.02 : 0.012, 0.85, n.layer === 'rule' ? 1.2 : 1.0); g.add(shell); instances += shellN;""",
    """        const shell = points(sp, sc, n.hero ? 0.012 : n.layer === 'rule' || n.layer === 'core' ? 0.03 : n.layer === 'plan' ? 0.02 : 0.012, 0.85, n.layer === 'rule' || n.layer === 'core' ? 1.2 : 1.0); g.add(shell); instances += shellN;
        let scat = null;
        if (n.cracked && n.layer === 'plan') { // the scatter's per-mote hashes: a direction mostly outward, an amplitude, a hold
          const base = new Float32Array(sp); const dir = new Float32Array(sp.length); const amp = new Float32Array(shellN); const hold = new Float32Array(shellN);
          for (let i = 0; i < shellN; i++) { const h = (j) => hash01(n.seed ^ 0x5ca7, i * 8 + j); const inward = h(6) < 0.22 ? -0.6 : 1; const ux = base[i * 3] / n.R, uy = base[i * 3 + 1] / n.R, uz = base[i * 3 + 2] / n.R; const w = 0.35 + 0.65 * h(0); let dx = ux * inward * w + 0.9 * (h(1) - 0.5), dy = uy * inward * w + 0.9 * (h(2) - 0.5), dz = uz * inward * w + 0.9 * (h(3) - 0.5); const L = Math.hypot(dx, dy, dz) || 1; dir[i * 3] = dx / L; dir[i * 3 + 1] = dy / L; dir[i * 3 + 2] = dz / L; amp[i] = n.R * (0.12 + 0.28 * h(5) * h(5)); hold[i] = 0.12 + 0.06 * h(4); }
          scat = { base, dir, amp, hold, shellN };
        }""")
rep("const rec = { node: n, group: g, mesh: m, shell, orbits, glow, ghost }; recs.push(rec); return rec;",
    "const rec = { node: n, group: g, mesh: m, shell, orbits, glow, ghost, scat }; recs.push(rec); return rec;")
rep("""          const w = rec.node.cracked ? bodyTremble(rec.node, t) : null; if (w) { rec.mesh.position.set(...w); rec.shell.position.set(...w); }""",
    """          const w = rec.node.cracked ? bodyTremble(rec.node, t) : null; if (w) { rec.mesh.position.set(...w); rec.shell.position.set(...w); }
          if (rec.scat) scatterShell(rec, t);""")
rep("""      function activeEvent(n, t) {""",
"""      // the scatter (hard cuts): a sweep crosses the body in 80 ms, each mote leaves at its own cut, holds 120-180 ms with a 1/30 s jitter,
      // and returns in three steps (1 -> 0.55 -> 0.25 -> 0); an aftershock at 550 ms with probability 0.5 at 0.45 amplitude
      function scatterShell(rec, t) {
        const n = rec.node; const d = derp(n.seed, t, (2 * Math.PI) / (n.period || 60), n.phase, n.v); const arr = rec.shell.geometry.attributes.position.array; const sc = rec.scat;
        if (!d.scatter) { if (rec.scatOn) { arr.set(sc.base); rec.shell.geometry.attributes.position.needsUpdate = true; rec.scatOn = false; rec.mesh.material.uniforms.uFill.value = 0.035; } return; }
        const { s, k } = d.scatter; const sec = s * DERP.dur;
        const hs = (j) => hash01(n.seed ^ 0x5ee9, k * 16 + j); const sw = [hs(0) - 0.5, hs(1) - 0.5, hs(2) - 0.5]; const Lw = Math.hypot(...sw) || 1; sw[0] /= Lw; sw[1] /= Lw; sw[2] /= Lw;
        const after = hs(3) < 0.5; const jq = Math.floor(sec * 30);
        let anyOut = false;
        for (let i = 0; i < sc.shellN; i++) {
          const bx = sc.base[i * 3], by = sc.base[i * 3 + 1], bz = sc.base[i * 3 + 2];
          const su = (bx * sw[0] + by * sw[1] + bz * sw[2]) / n.R; const tDep = 0.04 * (su + 1);
          let kk = 0; const a = sec - tDep;
          if (a >= 0) { if (a < sc.hold[i]) kk = 1; else { const b = a - sc.hold[i]; kk = b < 0.05 ? 0.55 : b < 0.1 ? 0.25 : 0; } }
          if (after) { const a2 = sec - 0.55 - tDep; if (a2 >= 0 && a2 < sc.hold[i]) kk = Math.max(kk, 0.45); }
          const jx = kk > 0 ? 0.03 * n.R * (2 * hash01(n.seed ^ 0x717, i * 97 + jq) - 1) : 0;
          arr[i * 3] = bx + sc.dir[i * 3] * sc.amp[i] * kk + jx; arr[i * 3 + 1] = by + sc.dir[i * 3 + 1] * sc.amp[i] * kk + jx; arr[i * 3 + 2] = bz + sc.dir[i * 3 + 2] * sc.amp[i] * kk - jx;
          if (kk > 0) anyOut = true;
        }
        rec.shell.geometry.attributes.position.needsUpdate = true; rec.scatOn = true; rec.mesh.material.uniforms.uFill.value = anyOut ? 0.018 : 0.035;
      }
      function activeEvent(n, t) {""")
# 10. lines and captions
rep("""        system: [['Now step back.', 1], ['The agents kept building. Whatever is built on a defect carries it too.', 1], ['Twelve new defects. You fixed one.', 0]],
        hood: [['Rules shape plans, and plans shape code.', 1], ['All of it is one system.', 0]],""",
    """        system: [['Each piece of work is built from what its agent reads.', 0]],
        twelve: [['Now step back.', 1], ['The agents kept building. Whatever is built on a defect carries it too.', 1], ['Twelve new defects. You fixed one.', 0]],
        hood: [['Rules shape plans, and plans shape code.', 1], ['All of it is one system.', 0]],""")
start = s.index("      const CAPS = {"); end = s.index("      };", start) + len("      };")
s = s[:start] + """      const CAPS = {
        close: 'Left: the bike as a piece of work, healthy: a planet (its frame) with seven moons (wheels, fork and bars, drivetrain, saddle, basket, fittings), running smooth. Right: the same piece carrying the defect: the planet breathes, comes apart in hard cuts and re-forms, and its moons stutter and burst. The small pair above the controls is the same two from far away.',
        system: 'One plan and what was built from it: a star (the plan) with its planets (the pieces of code), each with its moons (the parts). The stream from the core is the rule the plan was written from.',
        twelve: 'Three plans written from the incorrect rule and the pieces built from them: three stars and nine planets lit, the fixed piece amber. The core, where the rules are, is lit at its middle.',
        hood: 'The neighbourhood: the plans the essay follows, stars on the arm nearest the core; the core itself is the rules, six large bodies, every stream leaving it outward. A star here is a point with a few planet points.',
        galaxy: 'The galaxy: a bright core (the rules) and thousands of stars (plans) in two arms, dust between; the neighbourhood a knot of a dozen stars near the core. It turns once in twenty minutes.',
        zoom: 'The zoom-out, one piece to the whole: the bike as a planet with its moons, its plan as a star, the neighbourhood, the galaxy with its core. Drag the slider or press play; the detail levels hand over at 10 to 20, 25 to 50 and 60 to 120 px of system radius.',
      };""" + s[end:]
n += 1
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
