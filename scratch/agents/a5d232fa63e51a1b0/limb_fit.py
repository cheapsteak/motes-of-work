import subprocess, math, sys, cmath
A="<scratchpad>/morph-ref/analysis"
W,H=640,360; cx,cy=320.0,180.0
def load(p): return subprocess.run(["convert",p,"-colorspace","Gray","-depth","8","gray:-"],capture_output=True,check=True).stdout
def profile(g, nbins=360, thr=100):
    best=[0.0]*nbins
    for y in range(H):
        row=g[y*W:(y+1)*W]
        for x in range(W):
            if row[x]>thr:
                dx,dy=x+0.5-cx,y+0.5-cy; d=math.hypot(dx,dy)
                if 90<d<160:
                    b=int(((math.degrees(math.atan2(dx,-dy))+360)%360)//(360/nbins))
                    if d>best[b]: best[b]=d
    return [sorted([best[(i-1)%nbins],best[i],best[(i+1)%nbins]])[1] for i in range(nbins)]
def dft(v, kmax=40):
    n=len(v); m=sum(v)/n; return m,[abs(sum((v[i]-m)*cmath.exp(-2j*math.pi*k*i/n) for i in range(n)))*2/n for k in range(1,kmax+1)]
def xcorr(a,b):
    n=len(a); ma=sum(a)/n; mb=sum(b)/n; a=[x-ma for x in a]; b=[x-mb for x in b]
    na=math.sqrt(sum(x*x for x in a)); nb=math.sqrt(sum(x*x for x in b)); best=(-2,0)
    for s in range(n):
        c=sum(a[i]*b[(i+s)%n] for i in range(n))/(na*nb+1e-9)
        if c>best[0]: best=(c,s)
    return best
frames=sys.argv[1:]; profs={}
for f in frames:
    g=load(f"{A}/{f}.png"); p=profile(g); profs[f]=p; m,sp=dft(p)
    top=sorted(range(len(sp)),key=lambda k:-sp[k])[:6]
    print(f"{f}: mean R {m:.1f} px; min {min(p):.0f} max {max(p):.0f} (±{(max(p)-min(p))/2/m:.3f} R); top harmonics (k: amp px):", ", ".join(f"{k+1}:{sp[k]:.2f}" for k in top))
    ks=top[:3]; coef=[]; n=len(p)
    for k in ks:
        kk=k+1; c=sum((p[i]-m)*cmath.exp(-2j*math.pi*kk*i/n) for i in range(n))*2/n; coef.append((kk,c))
    pts=[]; raw=[]
    for i in range(n):
        th=math.radians(i+0.5); r=m+sum((c*cmath.exp(2j*math.pi*kk*i/n)).real for kk,c in coef)
        pts.append(f"{cx+r*math.sin(th):.1f},{cy-r*math.cos(th):.1f}"); raw.append(f"{cx+p[i]*math.sin(th):.1f},{cy-p[i]*math.cos(th):.1f}")
    name=f.split('/')[-1]
    subprocess.run(["convert",f"{A}/{f}.png","-fill","none","-stroke","#ffffff","-strokewidth","1","-draw","polyline "+" ".join(raw),"-stroke","#ff40ff","-strokewidth","1.5","-draw","polyline "+" ".join(pts),"-crop","320x320+160+20","+repage","-resize","200%",f"{A}/eq/{name}-limbfit.png"],check=True)
    bars=[]; sc=60/max(sp)
    for k,a in enumerate(sp): bars.append(f"rectangle {10+k*14},{80-a*sc} {10+k*14+10},80")
    subprocess.run(["convert","-size","590x100","xc:#111","-fill","#4da3ff","-draw"," ".join(bars),"-fill","white","-pointsize","11","-draw",f"text 5,95 'harmonic k=1..40 of the limb radius, {f}'",f"{A}/eq/{name}-spectrum.png"],check=True)
names=list(profs)
for i in range(len(names)-1):
    c,s=xcorr(profs[names[i]],profs[names[i+1]]); print(f"xcorr {names[i]} -> {names[i+1]}: best corr {c:.2f} at shift {s if s<=180 else s-360} deg")
