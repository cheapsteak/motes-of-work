const f = Math.fround;
const C = [1.5703125, 4.837512969970703e-4, 7.549789954891882e-8].map(f);
function sc(x, fold=false) {
  x = f(x);
  const q = Math.round(f(x * f(0.6366197723675814))); // GLSL round: half implementation-defined
  let r;
  if (fold) r = f(x - f(q * f(Math.PI/2)));
  else r = f(f(f(x - f(q*C[0])) - f(q*C[1])) - f(q*C[2]));
  const r2 = f(r*r);
  const s = f(r + f(f(r*r2) * f(f(-1/6) + f(r2*f(f(1/120) + f(r2*f(f(-1/5040) + f(r2*f(1/362880)))))))));
  const c = f(1 + f(r2*f(-0.5 + f(r2*f(f(1/24) + f(r2*f(f(-1/720) + f(r2*f(f(1/40320) + f(r2*f(-1/3628800)))))))))));
  const qd = ((q|0) & 3);
  return [[s,c],[c,-s],[-s,-c],[-c,s]][qd];
}
for (const R of [8, 20, 100, 1000, 10000]) {
  let es=0, ec=0, efold=0;
  for (let i=0;i<200000;i++){ const x = f((Math.random()*2-1)*R);
    const [s,c]=sc(x); es=Math.max(es,Math.abs(s-Math.sin(x))); ec=Math.max(ec,Math.abs(c-Math.cos(x)));
    const [s2]=sc(x,true); efold=Math.max(efold,Math.abs(s2-Math.sin(x)));
  }
  console.log(R, es.toExponential(2), ec.toExponential(2), 'folded-reduction sin err', efold.toExponential(2));
}
// boundary: odd multiples of pi/4
let e=0; for (let k=-200;k<=200;k++){ for (const d of [-1e-6,0,1e-6]) { const x=f(k*Math.PI/4+d); const [s,c]=sc(x); e=Math.max(e,Math.abs(s-Math.sin(x)),Math.abs(c-Math.cos(x)));}} console.log('pi/4 boundaries', e.toExponential(2));
