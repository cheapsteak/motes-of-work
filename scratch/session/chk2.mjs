import * as K from './k.ts';
const {JANSEN:J, solveLeg} = K;
const d=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1]);
for (const g of [0.05,0.08,0.1,0.2]) { const L={...J,m:J.m*(1+g)}; let prev=null; const N=4000;
 let worst={};
 for(let s=0;s<=N;s++){const j=solveLeg(s/N*Math.PI*2,L); if(prev){ for(const k of ['top','low','outer','knee','foot']){const st=d(j[k],prev[k]); if(!worst[k]||st>worst[k][0]) worst[k]=[st,s/N*360, j.clamped, prev.clamped];}} prev=j;}
 console.log('gain',g, JSON.stringify(Object.fromEntries(Object.entries(worst).map(([k,v])=>[k,v.map(x=>+x.toFixed(2))])))); }
