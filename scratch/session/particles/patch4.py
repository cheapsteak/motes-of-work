"""Fourth round: the dark-sample search projects every dot once and compares screen positions."""
import pathlib
import sys

f = pathlib.Path(sys.argv[1]) / "disk-field.html"
s = f.read_text()
old = """    const byRing = []; for (const d of DOTS) (byRing[d.i] ??= []).push(d);
    const dark = { tested: 0, pass: 0, fail: [] };
    for (let n = 0; n < nDark * 50 && dark.tested < nDark; n++) {
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
new = """    // Every dot's screen place once (the twin's forward projection), bucketed by ring.
    const byRing = []; for (const d of DOTS) { const q = dotScreen(d, t); (byRing[d.i] ??= []).push(q.x, q.y); }
    const dark = { tested: 0, pass: 0, fail: [] };
    for (let n = 0; n < nDark * 50 && dark.tested < nDark; n++) {
      const r = R_IN + 0.5 + rnd() * (R_OUT - R_IN - 1.5), phi = rnd() * TAU;
      const i = Math.floor((r - R_IN) / DR);
      // The sample as it is NOW (no unwinding): a fake dot with no rotation at t = 0.
      const s = dotScreen({ ri: 1e9, rc: r, phi0: phi, bright: 1, size: 1 }, 0);
      if (s.ok < 0.5) continue;
      // Screen-space distance to every dot of the three nearest rings.
      let minPx = Infinity;
      for (let di = -1; di <= 1; di++) { const a = byRing[i + di] ?? []; for (let k = 0; k < a.length; k += 2) { const dd = Math.hypot(a[k] - s.x, a[k + 1] - s.y); if (dd < minPx) minPx = dd; } }
      if (minPx < 2.5 * 2.2 * DPR + 2) continue;"""
assert old in s
s = s.replace(old, new)
f.write_text(s)
print("patched4")
