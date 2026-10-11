import subprocess, math, cmath, sys
A="<scratchpad>/morph-ref/analysis"
N=128
def fft(a):
    n=len(a)
    if n==1: return a
    e=fft(a[0::2]); o=fft(a[1::2])
    return [e[k]+cmath.exp(-2j*math.pi*k/n)*o[k] for k in range(n//2)]+[e[k]-cmath.exp(-2j*math.pi*k/n)*o[k] for k in range(n//2)]
for f in sys.argv[1:]:
    name=f.split('/')[-1]
    patch=subprocess.run(["convert",f"{A}/{f}.png","-colorspace","Gray","-crop",f"{N}x{N}+230+60","+repage","(","+clone","-blur","0x4",")","-compose","minus_src","-composite","-depth","8","gray:-"],capture_output=True,check=True).stdout
    rows=[]
    for y in range(N):
        wy=0.5-0.5*math.cos(2*math.pi*y/N)
        rows.append([complex((patch[y*N+x]-20)*wy*(0.5-0.5*math.cos(2*math.pi*x/N))) for x in range(N)])
    R=[fft(r) for r in rows]; cols=[fft([R[y][x] for y in range(N)]) for x in range(N)]
    P=[[abs(cols[x][y])**2 for x in range(N)] for y in range(N)]
    mx=max(max(r) for r in P); pg=bytearray()
    for y in range(N):
        for x in range(N):
            v=P[(y+N//2)%N][(x+N//2)%N]; pg.append(int(255*math.log(1+v)/math.log(1+mx)))
    open(f"{A}/eq/{name}-fft.pgm","wb").write(b"P5\n%d %d\n255\n"%(N,N)+bytes(pg))
    subprocess.run(["convert",f"{A}/eq/{name}-fft.pgm","-resize","400%",f"{A}/eq/{name}-fft.png"],check=True)
    peaks=[]
    for y in range(N):
        for x in range(N):
            fy=(y+N//2)%N-N//2; fx=(x+N//2)%N-N//2; fr=math.hypot(fx,fy)
            if 3<fr<60: peaks.append((P[(y+N//2)%N][(x+N//2)%N],fx,fy,fr))
    peaks.sort(reverse=True); print(name,"strongest wave vectors (power, fx, fy cycles/128px, |f| -> wavelength px):"); seen=[]
    for p,fx,fy,fr in peaks:
        if any(math.hypot(fx-a,fy-b)<3 for a,b in seen): continue
        seen.append((fx,fy)); print(f"   {p:.2e}  ({fx:+d},{fy:+d})  |f|={fr:.1f}  λ={N/fr:.1f} px")
        if len(seen)>=8: break
