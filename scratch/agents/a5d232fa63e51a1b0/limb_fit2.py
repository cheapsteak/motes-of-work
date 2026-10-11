import subprocess, math, sys, cmath
A="<scratchpad>/morph-ref/analysis"
W,H=640,360
def load(p): return subprocess.run(["convert",p,"-colorspace","Gray","-depth","8","gray:-"],capture_output=True,check=True).stdout
def profile(g, cx, cy, nbins=360, thr=60):
    best=[0.0]*nbins; cnt=[0]*nbins
    for y in range(H):
        row=g[y*W:(y+1)*W]
        for x in range(W):
            if row[x]>thr:
                dx,dy=x+0.5-cx,y+0.5-cy; d=math.hypot(dx,dy)
                if 95<d<150:
                    b=int(((math.degrees(math.atan2(dx,-dy))+360)%360)//(360/nbins))
                    if d>best[b]: best[b]=d
    out=[sorted([best[(i-1)%nbins],best[i],best[(i+1)%nbins]])[1] for i in range(nbins)]
    return out
def harm(v,k):
    n=len(v); return sum(v[i]*cmath.exp(-2j*math.pi*k*i/n) for i in range(n))*2/n
def fit(f):
    g=load(f"{A}/{f}.png"); cx,cy=320.0,180.0
    for it in range(3):  # centre correction from the k=1 harmonic
        p=profile(g,cx,cy); m=sum(p)/len(p); c1=harm(p,1)
        # r(θ) ≈ m + Re(c1 e^{iθ}); a centre offset (ex,ey) adds -ex sinθ ... : fix by moving the centre along the k=1 vector
        n=len(p); ax=sum(p[i]*math.sin(math.radians(i+0.5)) for i in range(n))*2/n; ay=-sum(p[i]*math.cos(math.radians(i+0.5)) for i in range(n))*2/n
        cx+=ax*0.9; cy+=ay*0.9
    p=profile(g,cx,cy); m=sum(p)/len(p); sp=[abs(harm(p,k)) for k in range(1,41)]
    return cx,cy,m,p,sp
res={}
for f in sys.argv[1:]:
    cx,cy,m,p,sp=fit(f); res[f]=(m,p,sp)
    top=sorted(range(1,40),key=lambda k:-sp[k])[:6]
    band=sum(sp[k] for k in range(9,25)); tot=sum(sp[k] for k in range(1,40))
    print(f"{f}: centre ({cx:.1f},{cy:.1f}) R {m:.1f} px; limb ±{(max(p)-min(p))/2/m:.3f} R; rms {math.sqrt(sum((x-m)**2 for x in p)/len(p))/m:.4f} R; top k: "+", ".join(f"{k+1}:{sp[k]/m:.4f}R" for k in top)+f"; share of k=10..25 {band/tot:.2f}")
    name=f.split('/')[-1]; n=len(p); ks=top[:4]; coef=[(k+1,harm(p,k+1)) for k in ks]
    pts=[]; raw=[]
    for i in range(n):
        th=math.radians(i+0.5); r=m+sum((c*cmath.exp(2j*math.pi*kk*i/n)).real for kk,c in coef)
        pts.append(f"{cx+r*math.sin(th):.1f},{cy-r*math.cos(th):.1f}"); raw.append(f"{cx+p[i]*math.sin(th):.1f},{cy-p[i]*math.cos(th):.1f}")
    subprocess.run(["convert",f"{A}/{f}.png","-fill","none","-stroke","#ffffff","-strokewidth","0.8","-draw","polyline "+" ".join(raw),"-stroke","#ff40ff","-strokewidth","1.2","-draw","polyline "+" ".join(pts),"-crop","320x320+160+20","+repage","-resize","200%","-fill","white","-stroke","none","-pointsize","18","-draw",f"text 8,24 '{name}: white = measured limb, magenta = top 4 harmonics (k={','.join(str(k+1) for k in ks)})'",f"{A}/eq/{name}-limbfit.png"],check=True)
    bars=[]; sc=70/max(sp[1:])
    for k in range(1,40): bars.append(f"rectangle {10+k*14},{80-sp[k]*sc} {10+k*14+10},80")
    subprocess.run(["convert","-size","590x118","xc:#111","-fill","#4da3ff","-draw"," ".join(bars),"-fill","white","-pointsize","11","-draw",f"text 5,95 '{name}: limb radius harmonics k=2..40 (k=1 removed by centring); bar = amplitude, tallest {max(sp[1:])/m:.4f} R'",
                    "-draw"," ".join(f"text {10+k*14},110 '{k+1}'" for k in range(1,40,2)),f"{A}/eq/{name}-spectrum.png"],check=True)
# unwrapped profiles stacked: one row per frame, radius deviation as a greyscale strip (angle along x)
strips=[]
for f,(m,p,sp) in res.items():
    name=f.split('/')[-1]; pg=bytes(int(128+ (x-m)*18) if 0<=128+(x-m)*18<=255 else (0 if (x-m)<0 else 255) for x in p)
    open(f"{A}/eq/{name}-strip.pgm","wb").write(b"P5\n360 1\n255\n"+pg)
    subprocess.run(["convert",f"{A}/eq/{name}-strip.pgm","-scale","720x14!",f"{A}/eq/{name}-strip.png"],check=True); strips.append(f"{A}/eq/{name}-strip.png")
subprocess.run(["montage",*strips,"-tile","1x","-geometry","+0+1","-label","%t","-pointsize","10","-background","#222","-fill","white",f"{A}/eq/limb-strips.png"],check=True)
