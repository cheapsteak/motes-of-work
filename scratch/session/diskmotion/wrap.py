import math
exec(open('twin.py').read().split('print("azimuthal contrast')[0])
mx=0; mxh=0
for d in dots[:8000]:
    a=place(d,0.0); b=place(d,3600.0)
    dphi=abs(((a[1]-b[1])+math.pi)%(2*math.pi)-math.pi)
    err=max(abs(a[0]-b[0]), dphi, abs(a[2]-b[2]))
    if d[0]>=0: mx=max(mx,err)
    else: mxh=max(mxh,err)
print("streak dots: max |place(0)-place(3600)| =", mx)
print("haze dots (rigid Kepler orbit): max =", mxh, " (omega*3600 is not a multiple of 2pi)")
# Fix for rigid orbits: quantise r so that omega(r)*3600 = 2*pi*m, m integer -> r_m = (3.1*3600/(2*pi*m))^(2/3)
rs=[(3.1*3600/(2*math.pi*m))**(2/3) for m in range(1,2000)]
rs=[r for r in rs if 2.75<=r<=12.5]
print("commensurate radii in [2.75,12.5]:", len(rs), " spacing at r=3:", round(rs[-1]-rs[-2],4), " at r=12:", round(rs[1]-rs[0],4), "units; device px per unit 27 -> ", round((rs[-1]-rs[-2])*27,2), "px and", round((rs[1]-rs[0])*27,2), "px")
