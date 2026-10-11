# Visual review: the bicycle (Plan 3, Task 5)

Reviewer frames: <scratchpad>/agents/a87a9e4eade021787/frames/

## 1. Swap legibility in a still: does not read
A bicycle silhouette is nearly mirror-symmetric; readers locate the front by the handlebars, then the saddle — exactly the two parts the twin swaps — so every still reads as a normal bike facing the other way. Chain on the "bars" wheel, fork under the saddle, saddle nose direction: present but below mote resolution for a cold reader.
- vibe-build@0.9: 2/5. reveal@0.1: 2/5. reveal@0.5 (profile): 1.5/5 — profile is the most mistakable angle; spec I.1b "swings toward side-on" is backwards. reveal@0.9: 1.5/5, front wheel and ground clipped at the right edge.
- Steering at 0.14 rad (8 deg) does not help, in stills or motion.

## 2. Fixes, ranked
Within the no-rider staging:
1. Saddle visibly swivels with the wheel: STEER_TWIN = 0.45 rad for the twin (blend by variant: a = steer(drive) * (1 + (STEER_TWIN/STEER - 1) * variant)); keyframes mech.drive reveal@0.3 -> 3.0, reveal@1 -> 3.3 so the reveal sits near full lock. The cocked saddle with square bars is the one still cue that cannot read as "reversed".
2. Reveal camera: high front three-quarter instead of profile: camera.pos reveal@0.5 [1.9, 1.7, 2.1], reveal@1 [1.6, 1.5, 2.3]; target [-0.25, 0.05, 0]; fov 30-33. About 3/5 alone, about 4/5 with fix 1.
3. Saddle silhouette: shapes.ts saddle thick 0.05 -> 0.028; nose taper 0.62 - 0.38cos -> 0.55 - 0.45cos; nose-down 4 deg; saddle density 0.6 -> 0.5 (it bleaches to a white brick).
4. Fix right-edge clip: target x reveal@1 -0.614 -> -0.45 or fov 30 -> 33.
Needing a spec change:
5. A dim grey rider silhouette at the reveal only (seated over the front wheel, hands reaching back to nothing) — strongest cue by far; neutral grey, never warm.
6. Ghost at the reveal — reads, but breaks "the ghost has never existed" in I.2/I.3; weakest.

## 3. Other scores
Reads as a bicycle 5/5. Warm core 4/5 (pedals tiny and dim). Brief ticks 4/5 (ticked boxes a hair loud). Reveal lands 2/5. Faults in a still: stall 2/5, rest 1/5 (kinematic; fine for Act I).

## 4. Further changes
1. fov reveal@0.5 -> 33. 2. lighting keyStrength 1.0 -> 0.85 (flat tops blow out). 3. handlebars lever tube radius 0.005 -> 0.007. 4. pedals density -> 1.4. 5. CHAIN_DROP 0.12 -> 0.2, WOBBLE 0.18 -> 0.3 if stall/misalign must read in a still. 6. brief tick background rgba(236,235,242,0.85). 7. spec I.1b camera text -> "swings up to a high front three-quarter and the saddle turns with the wheel". 8. vibe-build@1 camera y -0.12 -> 0.4 (sits below the saddle). 9. rewind wide fine. 10. a short hold at reveal@0.4..0.6 with no drive change.
