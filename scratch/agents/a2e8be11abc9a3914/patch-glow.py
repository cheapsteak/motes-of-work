p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
# 1. the point material: a tight halo option (a star photograph profile), with a pixel cap so halos never merge
old = s[s.index("      const pointMat = (size, opacity, minPx) =>"):s.index("      function points(pos, col, size, opacity, minPx = 1.0)")]
new = '''      // uHalo 0: a hard dot. uHalo 1: a star: a bright core (the inner 35 % of the sprite) with a tight halo falling to zero at
      // the sprite edge; the sprite is clamped between uMinPx and uMaxPx so a halo can never grow past its neighbours.
      const pointMat = (size, opacity, minPx, halo = 0, maxPx = 64) => new THREE.ShaderMaterial({
        uniforms: { uSize: { value: size }, uOpacity: { value: opacity }, uMinPx: { value: minPx }, uMaxPx: { value: maxPx }, uScale: { value: 1 }, uGain: { value: 1 }, uHalo: { value: halo } },
        vertexShader: `attribute vec3 color; varying vec3 vC; uniform float uSize, uMinPx, uMaxPx, uScale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; float px = uSize * uScale / -mv.z; gl_PointSize = clamp(px, uMinPx, uMaxPx); }`,
        fragmentShader: `varying vec3 vC; uniform float uOpacity, uGain, uHalo; void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d) * 2.0; if (r > 1.0) discard; float core = 1.0 - smoothstep(0.0, 0.35, r); float halo = (1.0 - r) * (1.0 - r) * 0.45; float a = uHalo > 0.5 ? core + halo : 1.0; gl_FragColor = vec4(vC * uOpacity * uGain * a, 1.0); }`,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
'''
s = s.replace(old, new)
s = s.replace("function points(pos, col, size, opacity, minPx = 1.0) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return new THREE.Points(g, pointMat(size, opacity, minPx)); }",
              "function points(pos, col, size, opacity, minPx = 1.0, halo = 0, maxPx = 64) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return new THREE.Points(g, pointMat(size, opacity, minPx, halo, maxPx)); }")
# 2. background stars as tight star sprites (3.5 px, bright ones 6 px), a soft core haze, dust as hard 1 px motes
s = s.replace("sp.push(x, (r0() - 0.5) * 1.2, z); const b = 0.35 + 0.65 * r0() * r0(); const warm = r0() < 0.12; sc.push(AGENT.r * b * (warm ? 1.2 : 1), AGENT.g * b, AGENT.b * b * (warm ? 0.8 : 1)); n++;",
              "const b = 0.35 + 0.65 * r0() * r0(); const warm = r0() < 0.12; (b > 0.75 ? bp : sp).push(x, (r0() - 0.5) * 1.2, z); (b > 0.75 ? bc : sc).push(AGENT.r * b * (warm ? 1.2 : 1), AGENT.g * b, AGENT.b * b * (warm ? 0.8 : 1)); n++;")
s = s.replace("const sp = [], sc = [], dp = [], dc = [];\n        const r0 = mulberry32(SEED * 77 + 1);", "const sp = [], sc = [], dp = [], dc = [], bp = [], bc = [];\n        const r0 = mulberry32(SEED * 77 + 1);")
s = s.replace("const stars = points(sp, sc, 1.6, 1, 1.5); const dust = points(dp, dc, 0.8, 1, 1.0);\n        galaxyGroup.add(stars); galaxyGroup.add(dust); instances += sp.length / 3 + dp.length / 3;",
"""// stars: a star sprite 3.5 px (bright ones 6 px), the halo inside the sprite, capped so no two neighbours' halos meet at the wide shot (spacing about 7 px)
        const stars = points(sp, sc, 3.5, 1, 3.5, 1, 3.5); const bright = points(bp, bc, 6, 1, 6, 1, 6); const dust = points(dp, dc, 0.8, 1, 1.0);
        // the core haze: one soft sprite, faint, 56 px across: the only soft disc in the picture
        const core = points([0, 0, 0], [AGENT.r * 0.35, AGENT.g * 0.35, AGENT.b * 0.4], 0, 1, 56, 1, 56);
        galaxyGroup.add(dust); galaxyGroup.add(core); galaxyGroup.add(stars); galaxyGroup.add(bright); instances += sp.length / 3 + bp.length / 3 + dp.length / 3 + 1;""")
# 3. a star (rule) carries a glow sprite: its core and a tight halo, 5-18 px, which is what reads at star-only detail
s = s.replace("        const rec = { node: n, group: g, mesh: m, shell, orbits }; recs.push(rec); return rec;",
"""        let glow = null;
        if (n.layer === 'rule') { glow = points([0, 0, 0], [col.r * 0.9, col.g * 0.9, col.b * 0.9], n.R * 5, 1, 5, 1, 18); g.add(glow); instances += 1; }
        const rec = { node: n, group: g, mesh: m, shell, orbits, glow }; recs.push(rec); return rec;""")
s = s.replace("        rec.mesh.visible = n.layer === 'rule' || rec.mesh.material.uniforms.uGain.value > 0.02;",
"        rec.mesh.visible = n.layer === 'rule' || rec.mesh.material.uniforms.uGain.value > 0.02;\n        if (rec.glow) { rec.glow.material.uniforms.uScale.value = focal; rec.glow.material.uniforms.uGain.value = rec.baseGain; }")
open(p, 'w').write(s)
print('ok', s.count('uHalo'), 'glow' in s)
