# Shear analysis of the reference disk's streaks (closed form + Monte Carlo on the reference's own distributions).
import math, random
random.seed(7)
OM=3.1
def omega(r): return OM*r**-1.5
def domega_dr(r): return -1.5*OM*r**-2.5
def period(r): return 2*math.pi/omega(r)
print("r   omega  period  |dω/dr|  time for Δr=0.2 (±0.1 band, 2σ) to spread 2π   time to spread one dot-width")
# Phone: disk r=12 spans ~? Need pixel scale. Camera dist 75, fov 45 -> visible half-height at hole = 75*tan(22.5deg)=31.07 units over 844/2 CSS px => 13.6 CSS px per unit => at dpr2 27 device px per unit.
pxPerUnit_css = (844/2)/(75*math.tan(math.radians(22.5)))
pxPerUnit_dev = 2*pxPerUnit_css
print("CSS px per unit:", round(pxPerUnit_css,2), " device px per unit:", round(pxPerUnit_dev,2))
for r in (3,6,10):
    dw = abs(domega_dr(r))
    # a streak's radial half-width: gauss*0.10 -> 95% within ±0.2 => total spread 0.4; plus pitch*len: pitch ~0.325 mean, len mean ~ (0.9)(1+r/12)
    len_mean = 0.9*(1+r/12); pitch=0.325
    dr_pitch = pitch*len_mean
    dr_gauss = 0.4
    dr_total = dr_gauss + dr_pitch
    # time for the angular spread across the streak's radial extent to reach 2π (wound into a ring)
    t_ring_gauss = 2*math.pi/(dw*dr_gauss)
    t_ring_total = 2*math.pi/(dw*dr_total)
    # one dot per pixel: a streak of ~48 dots (26000*.66/360) spread over arc = 2π r? a streak smeared below 1 dot/px when its dots are spread over an arc longer than N_dots * dotpitch... Let's define: streak reads as a streak while angular spread Δφ from shear < its own length (len).
    t_double = len_mean/(dw*dr_total)   # shear-induced spread equals original length => streak twice as long, half as dense
    # One dot per device pixel: streak dots 48 along arc of length r*len; original density 48/(r*len*pxPerUnit_dev) dots per px
    n=48
    dens0 = n/(r*len_mean*pxPerUnit_dev)
    # density falls as len/(len+shear spread). Time until density < 1 dot per 1.5 device px (visual continuity breaks) — 
    # Actually a streak with 48 dots over r*len units: at r=6, len=1.35, arc 8.1 units = 220 dev px -> 0.22 dots/px: already sparse! Streaks read by correlation, not continuity.
    print(f"{r:3d} {omega(r):6.3f} {period(r):6.1f} {dw:7.4f}  gauss-only ring: {t_ring_gauss:6.0f}s  with pitch: {t_ring_total:6.0f}s   length-doubling: {t_double:5.1f}s  dens0 {dens0:.2f} dots/devpx (arc {r*len_mean*pxPerUnit_dev:.0f} px)")

# Monte Carlo streakiness metric: regenerate the reference's disk exactly, rotate by t, compute angular autocorrelation / anisotropy.
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
R=[];PHI=[];B=[];SID=[]
for i in range(N):
    if rnd()<0.34:
        r=2.75+9.75*rnd()**1.5; R.append(r); PHI.append(rnd()*6.2832); B.append(0.15+0.32*rnd()); SID.append(-1)
    else:
        j=int(rnd()*NS); s=streaks[j]; off=(rnd()-0.5)*s[2]
        r=max(2.75, s[0]+gauss()*0.10-off*s[4]); R.append(r); PHI.append(s[1]+off); B.append(s[3]*(0.5+0.7*rnd())); SID.append(j)
    gauss(); rnd()
# Metric A: per-streak angular RMS spread of its dots relative to rigid co-rotation at the streak's mean radius, vs t.
import statistics
def spread_at(t):
    out=[]
    for j in (3,6,10):
        pass
    bystreak={}
    for i in range(N):
        if SID[i]<0: continue
        bystreak.setdefault(SID[i],[]).append(i)
    res={}
    for j,idx in bystreak.items():
        r0=streaks[j][0]
        phis=[PHI[i]+omega(R[i])*t - omega(r0)*t for i in idx]  # in the frame co-rotating with the streak centre
        # unwrap relative to mean using circular stats
        c=sum(math.cos(p) for p in phis)/len(phis); s_=sum(math.sin(p) for p in phis)/len(phis)
        Rbar=math.hypot(c,s_)   # mean resultant length: 1 = all at one angle, 0 = uniform ring
        res[j]=(r0,Rbar,streaks[j][2])
    return res
# Metric B: image-space anisotropy: bin dots into (r, phi) grid, measure variance of azimuthal density profile per radial bin, normalised by Poisson.
def contrast_at(t, nr=24, nphi=96):
    grid=[[0.0]*nphi for _ in range(nr)]
    for i in range(N):
        r=R[i]; 
        if r>12: continue
        ir=min(nr-1,int((r-2.75)/(9.25)*nr))
        phi=(PHI[i]+omega(r)*t)%6.2832
        ip=int(phi/6.2832*nphi)%nphi
        grid[ir][ip]+=B[i]
    # azimuthal coefficient of variation per ring, averaged weighted by counts; Poisson floor subtracted
    cvs=[]
    for ir in range(nr):
        row=grid[ir]; m=sum(row)/nphi
        if m<=0: continue
        var=sum((x-m)**2 for x in row)/nphi
        cvs.append(math.sqrt(var)/m)
    return sum(cvs)/len(cvs), cvs
print()
print("Streak coherence: mean resultant length Rbar of each streak's dots in its co-rotating frame (1 = tight, ~0.1 = ring). Averaged over streaks in radial bands.")
for t in (0,10,30,60,120,300,600,1800,3600):
    res=spread_at(t)
    bands={'r<4':[], '4-7':[], '7-12':[]}
    for j,(r0,Rb,ln) in res.items():
        k='r<4' if r0<4 else ('4-7' if r0<7 else '7-12')
        bands[k].append(Rb)
    print(f"t={t:5d}s  " + "  ".join(f"{k}: {statistics.mean(v):.3f} (n={len(v)})" for k,v in bands.items()))
print()
print("Azimuthal density contrast (CV of brightness-weighted azimuthal profile, mean over 24 radial bins; a uniform ring tends to the Poisson floor):")
# Poisson floor: shuffle phi uniformly
import copy
for t in (0,10,30,60,120,300,600,1800,3600):
    cv,cvs=contrast_at(t)
    print(f"t={t:5d}s  CV={cv:.3f}   inner(r<4.3)={statistics.mean(cvs[:4]):.3f} mid={statistics.mean(cvs[8:12]):.3f} outer={statistics.mean(cvs[18:]):.3f}")
PHI0=PHI[:]
PHI=[rnd()*6.2832 for _ in range(N)]
cv,cvs=contrast_at(0)
print(f"uniform-phi floor: CV={cv:.3f} inner={statistics.mean(cvs[:4]):.3f} mid={statistics.mean(cvs[8:12]):.3f} outer={statistics.mean(cvs[18:]):.3f}")
