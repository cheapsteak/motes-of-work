// Runs the mock's MODEL section in node and prints the numbers the notes quote.
import { readFileSync } from 'node:fs';
const html = readFileSync(new URL('../mock.html', import.meta.url), 'utf8');
const src = html.slice(html.indexOf('// MODEL BEGIN'), html.indexOf('// MODEL END'));
const M = new Function(src + '\nreturn { buildModel, budget, overLimit, extent, hwS, hwP };')();
const t0 = Date.now();
const m = M.buildModel();
console.log('build ms', Date.now() - t0);
console.log('close pairs', m.close.map((p) => `${p.a}-${p.b} d${p.d.toFixed(1)} k${p.k.toFixed(2)}`).join(', '));
console.log('kept', m.pairs.map((p) => `${p.a}-${p.b}`).join(', '), 'hero', m.hero && `${m.hero.a}-${m.hero.b}`);
for (const [k, units] of Object.entries(m.options)) {
  const b = M.budget(units), l = M.overLimit(units);
  console.log(k, 'R', M.extent(units).toFixed(1), 'systems', b.systems, 'planets', b.planets, 'moons', b.moonsN, 'budget', JSON.stringify({ stars: b.stars, shells: b.shells, moons: b.moons, tracks: b.tracks, plan: b.plan, total: b.total }), 'overLimit', l.n, '/', l.of, 'worst', l.worst.toFixed(2));
  for (const u of units) if (u.type !== 'single') console.log('   ', u.type, u.stars.map((s) => s.key).join('+'), 'a', u.bin.a.toFixed(2), 'e', u.bin.e.toFixed(2), 'P', u.bin.period.toFixed(0), 'ac', u.groups.map((g) => g.ac.toFixed(2)).join('/'), 'planets', u.groups.map((g) => g.planets.map((p) => `${p.orbit.r.toFixed(2)}e${p.orbit.e.toFixed(2)}`).join(' ')).join(' | '), 'dropped', u.dropped, 'outer', u.outer.toFixed(1), 'at', u.x.toFixed(1), u.z.toFixed(1));
}
const hu = (k) => m.options[k].filter((u) => u.stars.some((s) => s.key === m.hero.a || s.key === m.hero.b)).map((u) => `${u.stars.map((s) => s.key)} at ${u.x.toFixed(1)},${u.z.toFixed(1)} outer ${u.outer.toFixed(1)}`);
for (const k of ['a', 'b']) console.log('hero in', k, hu(k));
const outers = m.stars.map((s) => s.outer);
console.log('outer radii min/mean/max', Math.min(...outers).toFixed(1), (outers.reduce((a, b) => a + b) / outers.length).toFixed(1), Math.max(...outers).toFixed(1));
console.log('hwS(.5,0)', M.hwS(0.5, 0).toFixed(3), 'hwP(.5,0)', M.hwP(0.5, 0).toFixed(3), 'hwP K16', M.hwP(0.227, 0.159).toFixed(3), 'x0.2243 =', (M.hwP(0.227, 0.159) * 0.2243).toFixed(3), 'hwS aCen', M.hwS(0.46, 0.524).toFixed(3));
