import subprocess, math, sys, cmath
A="<scratchpad>/morph-ref/analysis"
W,H=640,360
def load(p): return subprocess.run(["convert",p,"-colorspace","Gray","-depth","8","gray:-"],capture_output=True,check=True).stdout
def annulus_thr(g,cx,cy):
    vals=[]
    for y in range(0,H,2):
        row=g[y*W:(y+1)*W]
        for x in range(0,W,2):
            d=math.hypot(x+0.5-cx,y+0.5-cy)
            if 100<d<140: vals.append(row[x])
    vals.sort(); return max(70, int(0.55*vals[int(0.99*len(vals))]))
def profile(g, cx, cy, thr, nbins=360):
    best=[0.0]*nbins
    for y in range(H):
        row=g[y*W:(y+1)*W]
        for x in range(W):
            if row[x]>thr:
                dx,dy=x+0.5-cx,y+0.5-cy; d=math.hypot(dx,dy)
                if 100<d<150:
                    b=int(((math.degrees(math.atan2(dx,-dy))+360)%360)//(360/nbins))
                    if d>best[b]: best[b]=d
    return [sorted([best[(i-1)%nbins],best[i],best[(i+1)%nbins]])[1] for i in range(nbins)]
def harm(v,k):
    n=len(v); return sum(v[i]*cmath.exp(-2j*math.pi*k*i/n) for i in range(n))*2/n
def autocorr_period(p):
    n=len(p); m=sum(p)/n; q=[x-m for x in p]; v=sum(x*x for x in q)
    ac=[sum(q[i]*q[(i+l)%n] for i in range(n))/v for l in range(0,91)]
    # first local max after the first zero crossing
    l=1
    while l<90 and ac[l]>0: l+=1
    best=max(range(l,91),key=lambda k:ac[k]) if l<90 else 0
    return best, ac[best] if best else 0
out=[]
for f in sys.argv[1:]:
    g=load(f"{A}/{f}.png"); cx,cy=320.0,180.0; thr=annulus_thr(g,cx,cy)
    for it in range(3):
        p=profile(g,cx,cy,thr); n=len(p)
        ax=sum(p[i]*math.sin(math.radians(i+0.5)) for i in range(n))*2/n; ay=-sum(p[i]*math.cos(math.radians(i+0.5)) for i in range(n))*2/n
        cx+=ax*0.9; cy+=ay*0.9
    p=profile(g,cx,cy,thr); m=sum(p)/n; sp=[abs(harm(p,k)) for k in range(1,41)]
    top=sorted(range(1,40),key=lambda k:-sp[k])[:5]; per,acv=autocorr_period(p)
    band=sum(sp[k] for k in range(9,25)); low=sum(sp[k] for k in range(1,9)); hi=sum(sp[k] for k in range(25,40))
    name=f.split('/')[-1]
    print(f"{name}: thr {thr} centre ({cx:.1f},{cy:.1f}) R {m:.1f}px; limb ±{(max(p)-min(p))/2/m:.3f}R rms {math.sqrt(sum((x-m)**2 for x in p)/n)/m:.4f}R; top k: "+", ".join(f"{k+1}:{sp[k]/m:.4f}" for k in top)+f"; sum k2-9 {low/m:.3f} k10-25 {band/m:.3f} k26-40 {hi/m:.3f}; autocorr period {per}° (~{round(360/per) if per else 0} lobes, ac {acv:.2f})")
    ks=top[:4]; coef=[(k+1,harm(p,k+1)) for k in ks]; pts=[]; raw=[]
    for i in range(n):
        th=math.radians(i+0.5); r=m+sum((c*cmath.exp(2j*math.pi*kk*i/n)).real for kk,c in coef)
        pts.append(f"{cx+r*math.sin(th):.1f},{cy-r*math.cos(th):.1f}"); raw.append(f"{cx+p[i]*math.sin(th):.1f},{cy-p[i]*math.cos(th):.1f}")
    subprocess.run(["convert",f"{A}/{f}.png","-fill","none","-stroke","#ffffff","-strokewidth","0.8","-draw","polyline "+" ".join(raw),"-stroke","#ff40ff","-strokewidth","1.2","-draw","polyline "+" ".join(pts),"-crop","320x320+160+20","+repage","-resize","200%","-fill","white","-stroke","none","-pointsize","16","-draw",f"text 8,22 '{name}: white = measured limb; magenta = its 4 largest harmonics k={','.join(str(k+1) for k in ks)}'",f"{A}/eq/{name}-limbfit.png"],check=True)
    sc=70/max(sp[1:]); bars=[f"rectangle {10+k*14},{80-sp[k]*sc} {10+k*14+10},80" for k in range(1,40)]
    subprocess.run(["convert","-size","590x118","xc:#111","-fill","#4da3ff","-draw"," ".join(bars),"-fill","white","-pointsize","11","-draw",f"text 5,95 '{name}: limb-radius harmonics k=2..40 (k=1 is the centre, removed); tallest bar = {max(sp[1:])/m:.4f} R'","-draw"," ".join(f"text {10+k*14},110 '{k+1}'" for k in range(1,40,2)),f"{A}/eq/{name}-spectrum.png"],check=True)
    pg=bytes(max(0,min(255,int(128+(x-m)*18))) for x in p); open(f"{A}/eq/{name}-strip.pgm","wb").write(b"P5\n360 1\n255\n"+pg)
    subprocess.run(["convert",f"{A}/eq/{name}-strip.pgm","-scale","720x16!",f"{A}/eq/{name}-strip.png"],check=True); out.append(f"{A}/eq/{name}-strip.png")
subprocess.run(["montage",*out,"-tile","1x","-geometry","+0+1","-label","%t","-pointsize","10","-background","#222","-fill","white",f"{A}/eq/limb-strips.png"],check=True)
