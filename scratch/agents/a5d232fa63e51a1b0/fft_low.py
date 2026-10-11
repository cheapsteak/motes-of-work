import subprocess, math, cmath, sys
A="<scratchpad>/morph-ref/analysis"
N=128
def fft(a):
    n=len(a)
    if n==1: return a
    e=fft(a[0::2]); o=fft(a[1::2])
    return [e[k]+cmath.exp(-2j*math.pi*k/n)*o[k] for k in range(n//2)]+[e[k]-cmath.exp(-2j*math.pi*k/n)*o[k] for k in range(n//2)]
for spec in sys.argv[1:]:
    f,ox,oy=spec.split(':'); name=f.split('/')[-1]+f"-{ox}-{oy}"
    # blur 1.2 px merges the dots into row density; subtract a 6 px blur to drop the sphere's shading
    patch=subprocess.run(["convert",f"{A}/{f}.png","-colorspace","Gray","-crop",f"{N}x{N}+{ox}+{oy}","+repage","-blur","0x1.2","(","+clone","-blur","0x6",")","-compose","minus_src","-composite","-depth","8","gray:-"],capture_output=True,check=True).stdout
    rows=[]
    for y in range(N):
        wy=0.5-0.5*math.cos(2*math.pi*y/N)
        rows.append([complex((patch[y*N+x])*wy*(0.5-0.5*math.cos(2*math.pi*x/N))) for x in range(N)])
    R=[fft(r) for r in rows]; cols=[fft([R[y][x] for y in range(N)]) for x in range(N)]
    P=[[abs(cols[x][y])**2 for x in range(N)] for y in range(N)]
    pk=[]
    for y in range(N):
        for x in range(N):
            fy=(y+N//2)%N-N//2; fx=(x+N//2)%N-N//2; fr=math.hypot(fx,fy)
            if 1.5<fr<40: pk.append((P[(y+N//2)%N][(x+N//2)%N],fx,fy,fr))
    mx=max(p for p,*_ in pk); pg=bytearray()
    for y in range(N):
        for x in range(N):
            v=P[(y+N//2)%N][(x+N//2)%N]; pg.append(int(255*min(1,math.log(1+v)/math.log(1+mx))))
    open(f"{A}/eq/{name}-fftlow.pgm","wb").write(b"P5\n%d %d\n255\n"%(N,N)+bytes(pg))
    subprocess.run(["convert",f"{A}/eq/{name}-fftlow.pgm","-crop","64x64+32+32","+repage","-resize","600%","-fill","yellow","-pointsize","12","-draw",f"text 4,14 '{name} |f|<32 cyc/128px'",f"{A}/eq/{name}-fftlow.png"],check=True)
    pk.sort(reverse=True); print(name,"strongest wave vectors after low-pass (power, (fx,fy) cycles/128px, wavelength px, direction deg from +x):"); seen=[]
    for p,fx,fy,fr in pk:
        if any(math.hypot(fx-a,fy-b)<2.5 for a,b in seen) or (fx<0 or (fx==0 and fy<0)): continue
        seen.append((fx,fy)); print(f"   {p/mx:5.2f}  ({fx:+d},{fy:+d})  λ={N/fr:5.1f} px = {N/fr/128:.3f} R  dir {math.degrees(math.atan2(fy,fx)):+.0f}°")
        if len(seen)>=7: break
