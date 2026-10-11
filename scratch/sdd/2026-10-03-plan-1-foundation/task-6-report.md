# Task 6 report: Mote attributes and TypeScript mote()

## Implemented
- `src/scene/mote/attributes.ts`: `MoteType`, `ROLE_INDEX`, `MoteAttrs`, `buildMoteAttrs` (rules verbatim from brief; h_k = hash01(seed,k)).
- `src/scene/mote/partTransforms.ts`: `partTransforms` = compose(lerpTransform(IDENTITY, explodedOffset, 1-assembly), pose[i]) (pose first, offset in world space); `packPartTexture` (2 RGBA texels/part: [q xyzw],[p xyz,0]).
- `src/scene/mote/mote.ts`: `mote()` and `spawnPoint()`, following the 7 numbered steps in order.
- `src/scene/mote/mote.test.ts`: 15 tests.

## Constants for the GLSL (Task 7)
- TAU = 6.283185307179586 used everywhere (drift phases `TAU*h5/h6/h7`, spawn azimuth `TAU*h9`); 6.283 not used.
- Local `clamp`, `mix(a,b,t)=a*(1-t)+b*t`, `smoothstep(e0,e1,x)` (t=clamp((x-e0)/(e1-e0),0,1); t*t*(3-2t)), `cross`.
- Step 1: k = u<v ? 1 : (u<v+m ? 2 : 0), u=hash01(seed,11), v=clamp(vibed,0,1), m=clamp(misallocated,0,1-v).
- Step 3: w = drift*(role==2?1:0.25); rest += w*0.6*[sin(1.7*r.y+1.3*drive+TAU*h5), sin(1.9*r.z+1.1*drive+TAU*h6), sin(2.3*r.x+0.9*drive+TAU*h7)] using pre-drift r.
- Step 4: t=smoothstep(settle-0.08, settle, assembly); e=1-(1-t)^3 (computed as om*om*om).
- spawnPoint: z=2*h8-1; a=TAU*h9; r=sqrt(1-z*z); dir=[r cos a, r sin a, z]; radius=9+3*h10; result=dir*radius, then y*=0.6 (i.e. y = r*sin(a)*radius*0.6).
- Step 6: d=rest-spawn; side=cross(d,[0,1,0]); if length(side)<1e-6 side=[1,0,0]; c=(spawn+rest)/2 + 2*(h12-0.5)*side/length(side); pos=(1-e)^2*spawn+2(1-e)e*c+e^2*rest.
- Step 7: brightness=mix(1,0.35,t); type=type[k]; visible=visible[k]; settled=t.
- Inputs to GLSL per mote: part, role, local, localTwin, seed, settle, type[3], visible[3] (visible[k] flags; extras = body with h3<0.15).

## TDD
- RED: `npx vitest run src/scene` before implementation: "Test Files 1 failed (1) / Tests no tests" (imports of ./attributes, ./partTransforms, ./mote unresolved), expected.
- GREEN: same command after: "Test Files 1 passed (1) / Tests 15 passed (15)".
- Full: `npm run typecheck && npm test`: typecheck clean; "Test Files 10 passed (10), Tests 111 passed (111)". e2e not run (nothing browser-facing).

## Tests cover
assembly 1 pos == applyToPoint(xf, local) (<1e-9), settled 1, brightness 0.35; assembly 0 pos == spawnPoint for settle>=0.08; variant 1 uses localTwin; vibed -> all Agent; specced core has Human and Dialogue, body all Agent; misallocated core Agent; drift ratio drift/core in (3.2, 4.8) over 2000 pts; misallocated core visible fraction in [0.45,0.55]; extras hidden when specced / shown when misallocated; determinism + reversed call order; spawnPoint radius in [9,12] with y/0.6; partTransforms exploded offset in world space; packPartTexture length parts*8.

## Files changed
Only the four new files under src/scene/mote/. No other files touched.

## Self-review / concerns
None. Note: `partTransforms` at assembly 1 composes with an IDENTITY-lerp offset (slerp near-parallel path -> normalized lerp), which keeps the pose quaternion normalized; the 1e-9 test passes.
