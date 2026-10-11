p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:70]
    s = s.replace(a, b); n += 1

# 1. the orbit model: an ellipse (eccentricity, tilt, a slowly precessing periapsis) with Kepler-ish speed
rep("""      function orbitXYZ(tr, rad, a, up) { const x = rad * Math.cos(a), z = rad * Math.sin(a); const ca = Math.cos(tr.az), sa = Math.sin(tr.az); const ct = Math.cos(tr.tilt), st = Math.sin(tr.tilt); const along = x * ca + z * sa; const px = x - along * ca, pz = z - along * sa; return [along * ca + px * ct, (sa * px - ca * pz) * st + up, along * sa + pz * ct]; }""",
"""      // the orbit's frame: a point at polar (rad, a) in the orbit plane, the plane tilted by tr.tilt about the axis at azimuth tr.az
      function orbitXYZ(tr, rad, a, up) { const x = rad * Math.cos(a), z = rad * Math.sin(a); const ca = Math.cos(tr.az), sa = Math.sin(tr.az); const ct = Math.cos(tr.tilt), st = Math.sin(tr.tilt); const along = x * ca + z * sa; const px = x - along * ca, pz = z - along * sa; return [along * ca + px * ct, (sa * px - ca * pz) * st + up, along * sa + pz * ct]; }
      // Kepler: mean anomaly M -> eccentric anomaly E (three Newton steps) -> true anomaly nu and the radius. Deterministic in M.
      function kepler(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 3; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2)); return { nu, r: 1 - e * Math.cos(E) }; }
      // a body's place on its orbit at ambient t: semi-major axis a (so that a(1+e) is the designed outer radius), eccentricity e,
      // periapsis turning slowly (omega0 + 2 pi t / precession), then the derp on the angle and the radius
      function ellipsePos(n, t, dAngle, dRadius, up) { const M = n.phase + (2 * Math.PI * t) / n.period; const k = kepler(M, n.e); const w = n.omega0 + (2 * Math.PI * t) / n.precession; return orbitXYZ(n.track, n.a * k.r * (1 + dRadius), k.nu + w + dAngle, up); }""")
rep("""          const omega = (2 * Math.PI) / n.period; let a = n.phase + omega * t; let rad = n.orbitR, up = 0;
          if (n.cracked && n.layer !== 'rule') { const d = derp(n.seed, t, omega, n.phase, n.v); a += d.dAngle; rad *= 1 + d.dRadius; up = d.dUp * n.orbitR; }
          const o = orbitXYZ(n.track, rad, a, up); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];""",
"""          const omega = (2 * Math.PI) / n.period; let dA = 0, dR = 0, up = 0;
          if (n.cracked && n.layer !== 'rule') { const d = derp(n.seed, t, omega, n.phase, n.v); dA = d.dAngle; dR = d.dRadius; up = d.dUp * n.orbitR; }
          const o = ellipsePos(n, t, dA, dR, up); p = [base[0] + o[0], base[1] + o[1], base[2] + o[2]];""")
# eccentricity, tilt and precession per orbit, seeded: planets 0.05-0.22 and +-0.25 rad, moons 0.05-0.12 and +-0.2 rad
rep("""        const n = { layer, parent, orbitR, phase, period, idx: nodes.length, R: LAYERS[layer].R, seed: SEED * 131 + nodes.length * 7, v: 1, cracked: false, lit: false, fixed: false, track: { tilt: (rng() * 2 - 1) * 0.1, az: rng() * Math.PI * 2 }, ...extra };""",
"""        const e = layer === 'plan' ? 0.05 + 0.17 * rng() : layer === 'code' ? 0.05 + 0.07 * rng() : 0;
        const n = { layer, parent, orbitR, phase, period, idx: nodes.length, R: LAYERS[layer].R, seed: SEED * 131 + nodes.length * 7, v: 1, cracked: false, lit: false, fixed: false,
          track: { tilt: (rng() * 2 - 1) * (layer === 'plan' ? 0.25 : 0.2), az: rng() * Math.PI * 2 }, e, a: orbitR / (1 + e), omega0: rng() * Math.PI * 2, precession: layer === 'plan' ? 400 + 500 * rng() : 90 + 110 * rng(), ...extra };""")
# 2. the tracks are the ellipses at their current orientation: rebuilt per frame for the visible systems
rep("""          for (const k of kids) { const nd = Math.round(L.dots * (n.layer === 'rule' ? k.orbitR / 5.6 : 1)); for (let i = 0; i < nd; i++) { const p = orbitXYZ(k.track, k.orbitR, (i / nd) * Math.PI * 2, 0); op.push(...p); const kk = (k.lit ? 0.8 : 0.55) * gain; const c = k.lit ? EMBER : AGENT; oc.push(c.r * kk, c.g * kk, c.b * kk); } }
          orbits = points(op, oc, 0.02, 0.9, 1.4); g.add(orbits); instances += op.length / 3;""",
"""          const spans = [];
          for (const k of kids) { const nd = Math.round(L.dots * (n.layer === 'rule' ? k.orbitR / 5.6 : 1)); spans.push([k, nd]); for (let i = 0; i < nd; i++) { op.push(0, 0, 0); const kk = (k.lit ? 0.8 : 0.55) * gain; const c = k.lit ? EMBER : AGENT; oc.push(c.r * kk, c.g * kk, c.b * kk); } }
          orbits = points(op, oc, 0.02, 0.9, 1.4); orbits.userData.spans = spans; g.add(orbits); instances += op.length / 3;""")
rep("""      function pose(t) { for (const rec of recs) { const p = nodePos(rec.node, t); rec.group.position.set(p[0], p[1], p[2]); } }""",
"""      function pose(t) {
        for (const rec of recs) {
          const p = nodePos(rec.node, t); rec.group.position.set(p[0], p[1], p[2]);
          if (rec.orbits && rec.orbits.visible) { // the dotted ellipse where the orbit is now (it precesses)
            const arr = rec.orbits.geometry.attributes.position.array; let j = 0;
            for (const [k, nd] of rec.orbits.userData.spans) { const w = k.omega0 + (2 * Math.PI * t) / k.precession; for (let i = 0; i < nd; i++) { const nu = (i / nd) * Math.PI * 2; const r = k.a * (1 - k.e * k.e) / (1 + k.e * Math.cos(nu)); const q = orbitXYZ(k.track, r, nu + w, 0); arr[j++] = q[0]; arr[j++] = q[1]; arr[j++] = q[2]; } }
            rec.orbits.geometry.attributes.position.needsUpdate = true;
          }
        }
      }""")
# 3. the tracks fade with zoom: invisible until the system is 60 px, full by 120, so a far system is a star with planet points
rep("const LOD = { planets: [10, 20], shells: [25, 50], moons: [60, 120] };", "const LOD = { planets: [10, 20], shells: [25, 50], moons: [60, 120], tracks: [60, 120] };")
rep("return { star: 1, planetPoint: smoothstep(LOD.planets[0], LOD.planets[1], sysPx), planetShell: smoothstep(LOD.shells[0], LOD.shells[1], sysPx), moon: smoothstep(LOD.moons[0], LOD.moons[1], sysPx) };",
    "return { star: 1, planetPoint: smoothstep(LOD.planets[0], LOD.planets[1], sysPx), planetShell: smoothstep(LOD.shells[0], LOD.shells[1], sysPx), moon: smoothstep(LOD.moons[0], LOD.moons[1], sysPx), track: smoothstep(LOD.tracks[0], LOD.tracks[1], sysPx) };")
rep("if (rec.orbits) { rec.orbits.material.uniforms.uGain.value = (n.layer === 'rule' ? g.planetPoint : g.moon) * rec.baseGain;",
    "if (rec.orbits) { rec.orbits.material.uniforms.uGain.value = (n.layer === 'rule' ? g.track : g.moon * g.track) * rec.baseGain;")
# order: the pose (which writes the ellipses) must run after the level of detail has set visibility; render does pose first, so pose again after
rep("          for (const r of recs) { const on = lamp(r.node); r.group.visible = on; if (on) applyLod(r, gainsOf(r.node), focalPx); }\n          const streamN = buildStreams(t, lamp, gainsOf);",
    "          for (const r of recs) { const on = lamp(r.node); r.group.visible = on; if (on) applyLod(r, gainsOf(r.node), focalPx); }\n          pose(t);\n          const streamN = buildStreams(t, lamp, gainsOf);")
rep("aim({ b: -35, e: 32, d: 3.0, fov: 36, t: [i, 0, 0] }, halfW, mainH, 0.5); const g = lodGains(1e4); for (const r of recs) applyLod(r, g, focalPx); buildStreams(t, () => true, () => g); renderer.render(scene, camera);",
    "aim({ b: -35, e: 32, d: 3.0, fov: 36, t: [i, 0, 0] }, halfW, mainH, 0.5); const g = lodGains(1e4); for (const r of recs) applyLod(r, g, focalPx); pose(t); buildStreams(t, () => true, () => g); renderer.render(scene, camera);")
rep("(planet points at 10 to 20 px of system radius, planet shells at 25 to 50, moons at 60 to 120).", "(planet points at 10 to 20 px of system radius, planet shells at 25 to 50, moons and the dotted tracks at 60 to 120). Orbits are ellipses that precess slowly; bodies run faster near periapsis.")
rep("hood: 'The neighbourhood: the essay\\'s six rules, six solar systems on one arm of the galaxy. At this range a system is a star with planet points on faint orbits; moons and derps are below the detail threshold.',",
    "hood: 'The neighbourhood: the six rules, six solar systems on one arm of the galaxy. At this range a system is a star with a few planet points; the tracks, the moons and the derps are below the detail threshold.',")
open(p, 'w').write(s)
print('patched', n)
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub))
