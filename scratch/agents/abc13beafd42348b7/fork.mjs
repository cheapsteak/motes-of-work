const DEG=Math.PI/180, lock=0.42, PD=lock/Math.cos(30*DEG);
const r=lock+0.03, nudge=0.5*DEG;
const at=a=>[-PD+r*Math.cos(a), r*Math.sin(a)];
const stones=[at(-30*DEG-nudge), at(30*DEG-nudge)];
const E=[-PD,0];
function segDist(p,a,b){const ab=[b[0]-a[0],b[1]-a[1]];const t=Math.max(0,Math.min(1,((p[0]-a[0])*ab[0]+(p[1]-a[1])*ab[1])/(ab[0]**2+ab[1]**2)));return Math.hypot(a[0]+t*ab[0]-p[0],a[1]+t*ab[1]-p[1]);}
for (const [w,lw] of [[0.034,0.038],[0.068,0.076]]) {
  const s=stones[1], len=Math.hypot(...s), d=[s[0]/len,s[1]/len], n=[d[1],-d[0]];
  const along=(t,side)=>[t*d[0]+side*w*n[0], t*d[1]+side*w*n[1]];
  const t0=(lw-w*n[1])/d[1], tAxis=(w*n[1])/d[1];
  const upper=[along(t0,1),along(len,1),along(len,-1),along(tAxis,-1)];
  let m=1e9; for(let i=0;i<upper.length;i++) m=Math.min(m,segDist(E,upper[i],upper[(i+1)%upper.length]));
  const stoneInner = Math.hypot(s[0]-E[0], s[1]-E[1]) - 0.045;
  console.log(`w=${w}: arm closest to escape arbor ${m.toFixed(4)}, stone inner end ${stoneInner.toFixed(4)}, escape tip radius ${lock}`);
}
