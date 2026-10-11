import subprocess, math
A="<scratchpad>/morph-ref/analysis"
W,H=640,360
def load(p): return subprocess.run(["convert",p,"-colorspace","Gray","-blur","0x1","-depth","8","gray:-"],capture_output=True,check=True).stdout
def patch(g,x0,y0,n): return [[g[(y0+y)*W+x0+x] for x in range(n)] for y in range(n)]
def best_shift(a,b,R=10):
    n=len(a); best=(-9,0,0)
    for dy in range(-R,R+1):
        for dx in range(-R,R+1):
            s=0; c=0
            for y in range(R,n-R):
                ra=a[y]; rb=b[y+dy]
                for x in range(R,n-R): s+=(ra[x]-100)*(rb[x+dx]-100); c+=1
            if s/c>best[0]: best=(s/c,dx,dy)
    return best
pairs=[("frames/f001","frames/f012"),("frames/f012","frames/f022"),("frames/f022","frames/f045"),("frames/f045","frames/f060")]
regions={"top (320,70)":(290,50),"centre (320,180)":(290,150),"bottom (320,290)":(290,250),"left (210,180)":(180,150),"right (430,180)":(400,150)}
for a,b in pairs:
    ga=load(f"{A}/{a}.png"); gb=load(f"{A}/{b}.png")
    out=[]
    for nm,(x0,y0) in regions.items():
        s,dx,dy=best_shift(patch(ga,x0,y0,60),patch(gb,x0,y0,60)); out.append(f"{nm}: ({dx:+d},{dy:+d})")
    print(f"{a} -> {b}: lattice shift px  "+"; ".join(out))
