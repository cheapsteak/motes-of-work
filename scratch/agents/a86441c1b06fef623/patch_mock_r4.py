p = '<scratchpad>/freeze-mocks/freeze-mock.html'
s = open(p).read()
rep = [
 ("      const N_WARM = 40; const warmLocal = [], warmStart = [], warmCtl = [];\n      { const r = mulberry32(777); for (let i = 0; i < N_WARM; i++) { const zz = 2 * r() - 1, ph = r() * TAU, s = Math.sqrt(1 - zz * zz); warmLocal.push([s * Math.cos(ph) * 1.2, zz * 1.2, s * Math.sin(ph) * 1.2]); warmStart.push([(r() - 0.5) * 0.5, 1.4 + r() * 0.5, (r() - 0.5) * 0.5]); warmCtl.push([(r() - 0.5) * 0.6, 0.7 + r() * 0.3, (r() - 0.5) * 0.6]); } }",
  "      // The person's warm motes land across the whole piece: 70 on the planet's shell, 50 over its moons (the\n      // derping one takes 20, the others 6 each); each rides what it landed on. `warmHost` -1 = the planet, else the moon.\n      const N_WARM = 120; const warmLocal = [], warmStart = [], warmCtl = [], warmHost = [];\n      { const r = mulberry32(777); for (let i = 0; i < N_WARM; i++) { const zz = 2 * r() - 1, ph = r() * TAU, s = Math.sqrt(1 - zz * zz); const host = i < 70 ? -1 : i < 90 ? hero.defectMoon : (i - 90) % hero.moons.length; const k = host < 0 ? hero.R * 1.06 : 1.2; warmHost.push(host); warmLocal.push([s * Math.cos(ph) * k, zz * k, s * Math.sin(ph) * k]); warmStart.push([(r() - 0.5) * 0.9, 1.6 + r() * 0.6, (r() - 0.5) * 0.9]); warmCtl.push([(r() - 0.5) * 0.8, 0.8 + r() * 0.3, (r() - 0.5) * 0.8]); } }"),
 ("            const end = tmpV.set(...warmLocal[i]).applyMatrix4(M.mm.matrixWorld);",
  "            const host = warmHost[i]; const end = host < 0 ? tmpV.set(...warmLocal[i]).add(heroRec.group.position) : tmpV.set(...warmLocal[i]).applyMatrix4(heroRec.moonMeshes[host].mm.matrixWorld);"),
 ("          for (const m of [M.mm.material, M.dust.material, M.ghost.material]) { m.uniforms.uOff.value.set((offPx * 2 * 2) / vw, 0); if (side === 0) { m.uniforms.uTint.value.copy(HUMAN); m.uniforms.uTintMix.value = Math.max(flashMix, 0.85 * (1 - s.v)); } }",
  "          for (const m of [M.mm.material, M.dust.material, M.ghost.material]) m.uniforms.uOff.value.set((offPx * 2 * 2) / vw, 0);\n          if (side === 0) { for (const mm of heroRec.moonMeshes) for (const m of [mm.mm.material, mm.dust.material]) { m.uniforms.uTint.value.copy(HUMAN); m.uniforms.uTintMix.value = Math.max(flashMix, 0.6 * (1 - s.v)); } for (const m of [heroRec.mesh.material]) { m.uniforms.uTint.value.copy(HUMAN); m.uniforms.uTintMix.value = Math.max(flashMix, 0.3 * (1 - s.v)); } }"),
 ("      function render() {\n        const s0 = stateAt(local, opts);", "      const FREEZE_WARM_MODE = 'A'; // the author's choice: ember before the fix, amber as it lands (B = amber throughout)\n      function render() {\n        const s0 = stateAt(local, opts);"),
 ("          drawView([0, 0, W, H], s0, shown, twos, true);", "          drawView([0, 0, W, H], s0, shown, twos, FREEZE_WARM_MODE === 'A');"),
 ("M.mm.updateMatrixWorld(true);", "M.mm.updateMatrixWorld(true); heroRec.group.updateMatrixWorld(true);"),
 ("the held frame replaces that clock with a pinned instant: the defect moon mid-burst, off its track with its ghost beside it, and the planet's shell caught mid-scatter.",
  "the held frame replaces that clock with a pinned instant: the piece (a planet with its moons) caught mid-derp, the planet's shell mid-scatter and one moon mid-burst, off its track with its ghost beside it. The fix heals the whole piece: the shell re-forms, every moon settles, the person's motes land across all of it."),
 ('<div class="small a" id="smallA">later, on page 8: the twelve light up</div><div class="small b" id="smallB">later, on page 8: the twelve light up</div>',
  '<div class="small a" id="smallA">later, on page 8: defective pieces light up (one star of them)</div><div class="small b" id="smallB">later, on page 8: defective pieces light up (one star of them)</div>'),
 ("const mc = planet.lit && !(planet.fixedMoon === mi) ? EMBER : col;", "const mc = planet.lit ? EMBER : col;"),
]
for a, b in rep:
    assert a in s, a[:70]
    s = s.replace(a, b)
a = s[s.index("        BODY.star.orbits.forEach((r, i) => {"):s.index("      function poseSystem(t) {")]
b = """        BODY.star.orbits.forEach((r, i) => {
          const o = makeOrbit(r, rr, 'planet'); const lit = i !== 1; const pl = makePlanet(6000 + i * 13, { lit }); pl.cracked = false; pl.orbit = o; pl.oPeriod = BODY.star.orbitPeriods[i]; pl.oPhase = rr() * TAU;
          const rec = addPlanet(pl, [0, 0, 0], sysScene, false); rec.sys = true;
          if (i === 1) { // the fixed piece: blue, dusted warm on the planet and every moon
            for (const m of [rec.mesh.material, ...rec.moonMeshes.map((mm) => mm.mm.material)]) { m.uniforms.uTint.value.copy(HUMAN); m.uniforms.uTintMix.value = 0.35; }
            for (const mm of rec.moonMeshes) { const dc = mm.dust.geometry.attributes.color.array; for (let j = 0; j < dc.length; j += 3) { dc[j] = HUMAN.r; dc[j + 1] = HUMAN.g; dc[j + 2] = HUMAN.b; } mm.dust.geometry.attributes.color.needsUpdate = true; }
          }
          const TN = 90; const op = new Array(TN * 3).fill(0), oc = []; for (let j = 0; j < TN; j++) { const c = lit ? EMBER : AGENT; const k = lit ? 0.45 : 0.28; oc.push(c.r * k, c.g * k, c.b * k); }
          const orbitPts = points(op, oc, 0.03, 0.8); sysScene.add(orbitPts); rec.orbitPts = orbitPts; rec.orbitTN = TN;
        });
      }
"""
s = s.replace(a, b)
old = "for (const rec of recs) if (rec.sys) setMats(rec.mats, (u) => { u.uOff.value.set(0, 0); u.uGain.value = 1; u.uTintMix.value = 0; u.uLimb.value = 0; u.uMorphAmp.value = 0; u.uScatS.value = -1; });"
assert old in s
s = s.replace(old, "for (const rec of recs) if (rec.sys) setMats(rec.mats, (u) => { u.uOff.value.set(0, 0); u.uGain.value = 1; if (!u.uTint.value.equals(HUMAN)) u.uTintMix.value = 0; u.uLimb.value = 0; u.uMorphAmp.value = 0; u.uScatS.value = -1; });")
open(p, 'w').write(s)
print('mock ok')
