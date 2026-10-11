# Python twin of the prototype's recommended placement (streakDot in proto.html), used for the contrast metric over t.
# Same structure as the shader: static per-dot (k, u, g, bf, rb); per-life streak params from hash(k, n mod N).
import math, statistics
OM=3.1
def hash1(n):
    x=math.sin(n*12.9898+78.233)*43758.5453
    return x-math.floor(x)
seed=1234567
def rnd():
    global seed
    seed=(seed*1664525+1013904223)&0xffffffff
    return seed/4294967296
def gauss():
    u=max(rnd(),1e-9); v=rnd(); return math.sqrt(-2*math.log(u))*math.cos(6.2832*v)
N=26000; NS=360
streaks=[]
for k in range(NS):
    r=2.75+9.25*rnd()**1.6
    streaks.append((r, rnd()*6.2832, (0.25+1.3*rnd())*(1+r/12), 0.35+0.65*rnd(), 0.15+0.35*rnd()))
dots=[]
for i in range(N):
    if rnd()<0.34:
        r=2.75+9.75*rnd()**1.5; dots.append((-1, r, rnd()*6.2832, 0.15+0.32*rnd(), 0,0,1,r))
    else:
        k=int(rnd()*NS); s=streaks[k]; u=rnd()-0.5; g=gauss(); bf=0.5+0.7*rnd(); off=u*s[2]
        r=max(2.75, s[0]+g*0.10-off*s[4]); dots.append((k, r, s[1]+off, s[3]*bf, u, g, bf, s[0]))
    gauss(); rnd()
def place(d, t, lifeMul=1.0, shear=0.5, hotFrac=0.02, sync=False):
    k,aR,aPhi,aB,u,g,bf,rb=d
    if k<0: return aR, aPhi+OM*aR**-1.5*t, aB
    dw=1.5*OM*rb**-2.5; lenMean=0.9*(1+rb/12); drTot=0.4+0.325*lenMean
    Lt=lifeMul*lenMean/(dw*drTot)/max(shear,0.15); Nn=max(1,math.floor(3600/Lt+0.5)); L=3600/Nn
    off=((k%2)*0.5*L) if sync else hash1(k*1.731+0.37)*L
    tt=t+off; n=math.floor(tt/L); tau=tt-n*L; nw=n%Nn
    s=k*0.613+nw*7.77+11
    hr,ha,hl,hb,hp,hh=[hash1(s+j) for j in range(1,7)]
    hot=1.0 if hh<hotFrac else 0.0
    rc=rb*(0.92+0.16*hr); a=ha*6.283185307179586
    ln=(0.25+1.3*hl)*(1+rc/12)*(0.3 if hot else 1.0); b=(0.35+0.65*hb)*(2.6 if hot else 1.0); pitch=0.15+0.35*hp
    offa=u*ln; r=max(2.75, rc+g*0.10-offa*pitch)
    wC=OM*rc**-1.5; wI=OM*r**-1.5
    phi=a+offa+wC*tau+shear*(wI-wC)*tau
    uu=tau/L
    ss=lambda a_,b_,x: (lambda q: q*q*(3-2*q))(min(max((x-a_)/(b_-a_),0),1))
    env=ss(0,0.18,uu)*(1-ss(0.72,1,uu))
    return r, phi, b*bf*env
def contrast(t, model, **kw):
    nr,nphi=24,96
    grid=[[0.0]*nphi for _ in range(nr)]
    for d in dots:
        if model=='current': r,phi,b=d[1], d[2]+OM*d[1]**-1.5*t, d[3]
        else: r,phi,b=place(d,t,**kw)
        if r>12: continue
        ir=min(nr-1,int((r-2.75)/9.25*nr)); ip=int((phi%6.283185307179586)/6.283185307179586*nphi)%nphi
        grid[ir][ip]+=b
    cvs=[]
    for row in grid:
        m=sum(row)/nphi
        if m<=0: continue
        cvs.append(math.sqrt(sum((x-m)**2 for x in row)/nphi)/m)
    return sum(cvs)/len(cvs), statistics.mean(cvs[:4]), statistics.mean(cvs[8:12]), statistics.mean(cvs[18:])
print("azimuthal contrast CV (all / inner / mid / outer)")
for t in (0,30,120,600,1800,3599):
    c=contrast(t,'current'); r=contrast(t,'reco'); x=contrast(t,'reco',sync=True)
    print(f"t={t:5d}  current {c[0]:.3f} {c[1]:.3f} {c[2]:.3f} {c[3]:.3f}   reco {r[0]:.3f} {r[1]:.3f} {r[2]:.3f} {r[3]:.3f}   xfade {x[0]:.3f} {x[1]:.3f} {x[2]:.3f} {x[3]:.3f}")
# total visible brightness over t (the cross-fade's breathing vs the de-synchronised lifetimes)
print("sum of dot brightness, streak dots only, relative to t=0 of reco:")
def total(t,**kw): return sum(place(d,t,**kw)[2] for d in dots if d[0]>=0)
b0=total(0)
for t in (0,2,4,6,8,10,12,14,16):
    print(f"t={t:3d}  reco {total(t)/b0:.3f}   xfade {total(t,sync=True)/b0:.3f}")
# the hour wrap: positions at t=3600 must equal t=0 exactly
mx=0
for d in dots[:5000]:
    a=place(d,0.0); b=place(d,3600.0)
    mx=max(mx, abs(a[0]-b[0]), abs(((a[1]-b[1])+math.pi)%(2*math.pi)-math.pi), abs(a[2]-b[2]))
print("max |place(0) - place(3600)| over 5000 dots:", mx)
