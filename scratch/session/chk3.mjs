import * as K from './k.ts';
const {JANSEN:J, solveLeg, intersectCircles} = K;
const L={...J,m:J.m*1.1};
for (const deg of [192.9,192.95,193,193.05,193.1,193.2]) { const j=solveLeg(deg*Math.PI/180,L);
 const dl=Math.hypot(j.low[0]-j.outer[0],j.low[1]-j.outer[1]);
 console.log(deg,'low',j.low.map(x=>x.toFixed(2)),'outer',j.outer.map(x=>x.toFixed(2)),'|low-outer|',dl.toFixed(2),'f+g',(L.f+L.g).toFixed(2),'knee',j.knee.map(x=>x.toFixed(2)),'clamped',j.clamped);}
