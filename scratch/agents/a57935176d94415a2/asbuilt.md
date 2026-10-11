
### 2.7 As built (2026-10-04)

The shots above were starting values. The built ones live in `src/timeline/shots.ts` (bike terms,
pinned by `src/timeline/shots.test.ts`); they changed where a frame did not show its line or the
machine entered the text band (`e2e/clearance.spec.ts`):

- **Close shots are medium-close.** The twin's mast and saddle stand over the front wheel, so any
  shot of the front holds about 1.1 m of bike, all of which must sit under the text. S2 targets the
  middle of the bike (0.5, 0.4) at 3.2 m so both wheels and the chain are in; S3 targets (0.95, 0.5)
  from bearing 50, elevation 20, at 3.0 m, so the turning wheel is seen nearly face-on; S4 targets
  (0.85, 0.65) at 2.4 m and shows the bars with their levers and bell; S6 targets (0.9, 0.65) at
  2.4 m, bearing 35, so the front wheel is in frame under the saddle; S7 is 2.6 m; S6g targets
  (0.75, 0.55) from bearing 40 at 3.0 m, because the drawing is sparse and a closer shot did not read.
- **`camera.frame` 1 on a wide screen lands the target at y 78 %, not 72 %.** The other three
  values of the §2.6 table are as designed.
- **S5 and S5′ pull back to 4.8 m and 4.6 m** so the whole twin and its ground sit under the 42 %
  band at both sizes.
- **S8 looks from the drive side (bearing 90),** as the existing pull-back did; bearing 0 would show
  the bike end-on as it comes apart.
- **S9′** is the core anchor's centre at 3.9 m with coreFocus 0.6, so the whole drawing stays in
  view as the gold lands.
- **The late body parts come in from below.** The fork, brakes, mudguards and frame used to fall
  into place from up to 0.6 m above the bike, through the text while the brief's lines light; their
  exploded offsets now point down or level, and their settle windows are unchanged.
- The steer swings ease in and out (`inOutQuad`); every other key is as §2.1–§2.4 give it.
