"""Third round: ring width 0.35 (a foreshortened 2.2 px dot reaches 0.29 units, so 0.25 rings let the
3x3 search miss), dark samples judged by screen-space distance to the nearby dots, and a tests-per-pixel
figure in the hooks."""
import pathlib
import sys

f = pathlib.Path(sys.argv[1]) / "disk-field.html"
s = f.read_text()
s = s.replace("R_OUT = 12.5, DR = 0.25, TAU", "R_OUT = 12.5, DR = Number(params.get('dr') ?? 0.35), TAU")
old = """    for (let n = 0; n < nDark * 20 && dark.tested < nDark; n++) {
      const r = R_IN + 0.5 + rnd() * (R_OUT - R_IN - 1.5), phi = rnd() * TAU;
      const i = Math.floor((r - R_IN) / DR);
      let minD = Infinity;
      for (let di = -1; di <= 1; di++) for (const d of byRing[i + di] ?? []) {
        const omega = OMEGA0 * Math.pow(d.ri, -1.5); const turns = omega * t / TAU - Math.floor(omega * t / TAU);
        const dphi = Math.atan2(Math.sin(phi - d.phi0 - turns * TAU), Math.cos(phi - d.phi0 - turns * TAU));
        minD = Math.min(minD, Math.hypot(r - d.rc, d.rc * dphi));
      }
      if (minD < 4 * 2.2 * DPR * upp) continue;
      const fake = { ri: R_IN + (i + 0.5) * DR, rc: r, phi0: phi, bright: 1, size: 1 };
      // the point as it is NOW (so no unwinding): pass t = 0 with phi0 = phi
      const s = (() => { const save = fake.ri; fake.ri = 1e9; const o = dotScreen(fake, 0); fake.ri = save; return o; })();
      if (s.ok < 0.5) continue;"""
new = """    for (let n = 0; n < nDark * 50 && dark.tested < nDark; n++) {
      const r = R_IN + 0.5 + rnd() * (R_OUT - R_IN - 1.5), phi = rnd() * TAU;
      const i = Math.floor((r - R_IN) / DR);
      // The sample as it is NOW (no unwinding): a fake dot with no rotation at t = 0.
      const s = dotScreen({ ri: 1e9, rc: r, phi0: phi, bright: 1, size: 1 }, 0);
      if (s.ok < 0.5) continue;
      // Screen-space distance to every dot of the three nearest rings, within 3 cells of angle.
      let minPx = Infinity;
      for (let di = -1; di <= 1; di++) for (const d of byRing[i + di] ?? []) {
        const omega = OMEGA0 * Math.pow(d.ri, -1.5); const turns = omega * t / TAU - Math.floor(omega * t / TAU);
        const dphi = Math.atan2(Math.sin(phi - d.phi0 - turns * TAU), Math.cos(phi - d.phi0 - turns * TAU));
        if (Math.abs(dphi) * d.rc > 3 * DR) continue;
        const q = dotScreen(d, t);
        minPx = Math.min(minPx, Math.hypot(q.x - s.x, q.y - s.y));
      }
      if (minPx < 2.5 * 2.2 * DPR + 2) continue;"""
assert old in s
s = s.replace(old, new)
s = s.replace(
    "  dpr: DPR, K, density: DENSITY, dots: DOTS.length, cells, mesh:",
    "  dpr: DPR, K, density: DENSITY, dots: DOTS.length, cells, dr: DR, testsPerPixel: 9 * K, mesh:",
)
assert "testsPerPixel" in s and "minPx" in s
f.write_text(s)
print("patched3")
