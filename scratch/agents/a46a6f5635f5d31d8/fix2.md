
## Fix round 2

Commit: `29f75cf` galaxy: keep the full background and make its stars crisp points instead.

- **The counts are back to the spec's:** `BG.stars` is phone 2,400 and desktop 4,000.
- **Halos apart now comes from smaller sprite caps.** `HALO_PX` is star 2 px (was 3.5), bright 3 px (was 6), and neighbourhood glow floor 5 px (unchanged). A background star is now a crisp 2 px point with at most a 1 px halo.
  - The generator spaces stars by these caps as before: first clear draw, else the roomiest of 64, with a hard clearance round the neighbourhood's stars.
- **Caps tried** (planar measure, seeds 1–4, full counts):

  | Cap (star / bright) | Phone | Desktop |
  |---|---|---|
  | 2 / 3 px | 99.1–99.4 % | 100 % |
  | 1.5 / 2.5 px | 100 % | 100 % |
  | 1.5 / 2 px | 100 % | 100 % |
  | 1.25 / 2 px | 100 % | 100 % |

  I chose 2 / 3 px, the largest of these that still passes with a clear margin.
- **Pass rates with the test exactly as written** (real camera through `portraitRig`, both sizes, the neighbourhood's stars counted as neighbours):
  - phone, MOTE_SEED with the neighbourhood: 98.96 %
  - phone, seeds 2–5: 98.88 %, 99.04 %, 99.17 %, 98.92 %
  - desktop, MOTE_SEED with the neighbourhood: 99.52 %
  - desktop, seeds 2–5: 99.22 %, 99.52 %, 99.35 %, 99.60 %
  - no background halo touches a neighbourhood star's
- **Doc comment.** The `BG` doc comment no longer says the counts supersede §2.1. It keeps the note that §4's 7 px median spacing cannot hold, and the removal of the neighbourhood exclusion.
  - The `HALO_PX` doc says where the glow lives instead: the core haze, the neighbourhood's stars and nearer stars.
  - This supersedes the plan's Global Constraint figures for background sprites (3.5 px, and 6 px for the brightest 15 %). Tasks 5 and 6 should draw background stars at `HALO_PX` and keep the neighbourhood and core glows as specified.
- **Everything else from round 1 is unchanged:**
  - eccentricity easing before dropping slots
  - pieces never touching
  - core rings
  - the 16-unit core exclusion only
- **Results:**
  - `npm run typecheck && npm test`: 71 files, 1595 passed.
  - Full e2e: see below.
