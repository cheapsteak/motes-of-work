import * as K from './k.ts';
const {JANSEN:J, solveLeg, footPath, groundFlatness} = K;
const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
let maxErr=0, minFoot=1e9,maxFoot=-1e9;
for(let s=0;s<720;s++){const t=s/720*Math.PI*2; const j=solveLeg(t,J);
 const ls=[[j.O,j.C,J.m],[j.C,j.top,J.j],[j.A,j.top,J.b],[j.C,j.low,J.k],[j.A,j.low,J.c],[j.A,j.outer,J.d],[j.top,j.outer,J.e],[j.outer,j.knee,J.f],[j.low,j.knee,J.g],[j.knee,j.foot,J.h],[j.low,j.foot,J.i]];
 for(const [p,q,l] of ls) maxErr=Math.max(maxErr,Math.abs(d(p,q)-l));
}
console.log('maxErr',maxErr);
const fp=footPath(J,720); const xs=fp.map(p=>p[0]), ys=fp.map(p=>p[1]);
console.log('x range',Math.min(...xs),Math.max(...xs),'y range',Math.min(...ys),Math.max(...ys),'flat',groundFlatness(fp));
// ratio fault continuity
for (const g of [0.1,0.2,0.36,0.6]) { const L={...J,m:J.m*(1+g)}; let mj=0,cl=0,prev=null; for(let s=0;s<=2000;s++){const j=solveLeg(s/2000*Math.PI*2,L); cl+=j.clamped>0; if(prev) mj=Math.max(mj,d(j.foot,prev.foot)); prev=j; if(!j.foot.every(Number.isFinite)) console.log('NaN'); } console.log('ratio gain',g,'clamped steps',cl,'max foot step',mj.toFixed(2)); }
