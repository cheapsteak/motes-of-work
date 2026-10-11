# Moon look fix: moons are fine-dotted spheres like their planet

An author request after the Task 7 preview, slotted in before Task 8. Everything stays behind `?galaxy=1`.

## What the author saw and asked for

In the close shot, every moon looks like **a moon that has its own moons**. Each moon draws as a dark,
solid ball (the icosphere at `BODY_LOOK.moonFill` 0.28) studded with a handful of big bright dots
(its about 36 lattice motes at roughly 4–5 CSS px on a phone, against the planet's roughly 1–1.5 px).
The dots on the limb stick out past the ball, so they read as satellites. See
`shots/galaxy/T6-close-pose-390x844.png` and `T7-close-a0-390x844.png`.

Agreed direction, in the author's terms: **the moons should be dots, with no smooth sphere inside**. A
moon should read as a small sphere of the same material as its planet.

1. **Up close:** fine motes at the planet's grain, with the planet's faint fill (`BODY_LOOK.fill`
   0.035, plus the same rim). There is no dark solid ball.
   - The mote size on screen should match the planet's at the same distance. The cause of the
     oversized dots is yours to find: it may be the per-body `dots.x` world size in the shell
     texture (`shellTexel(3, row)`, built in bodyAttrs.ts), the `PX_MOON` floor of 1.5 px, the
     moon lattice (`moonLattice`, body.ts), or something else.
   - Fix it at the cause, not with a moon-only fudge factor. If the moon lattice must get denser
     to keep a moon reading as a sphere at the planet's grain, raise it, and keep
     `Galaxy.instances.total` ≤ `galaxyBudget` (currently 75,925 against 76,000). Report the new
     total. If the budget can't hold it, report the trade instead of overspending.
   - The faint fill still has to hide the far side's motes. A nearby moon must not read as a
     see-through cage. Use whatever the planet does for this.
2. **Far away:** when a moon is only a few px across, it must not read as a tiny ring. It becomes a
   single soft point, the way a planet hands over to its point (`PLANET_POINT_PX`, `lodGain`
   bands).
   - Choose the handover size so the transition is continuous: no pop, and a pure function of
     projected size.
   - The spec's original reason for the solid fill, "so a 3 px moon is a dot, not a ring", must
     still hold through this point.
3. **Keep the scatter and the derp working.** Moon motes still leap and return. The bike-to-moons
   reflow (Task 8) depends on moons being motes.
4. **Lit and fixed looks:**
   - A lit moon reads ember.
   - A fixed moon reads amber, with dots, not a solid amber ball. Update the moon branch of the
     rim/fill/look accordingly.

## Spec

Update `docs/specs/2026-10-07-galaxy-orbits.md` §1.3, the sentence "Moons are 36 motes and a small
icosphere with a solid fill (0.28)…". It should state the new rule and its reason, the author's
request: moons are fine-dotted spheres with the planet's faint fill, and a point when small. Keep
the edit to that sentence and any table row that restates it.

## Tests

- **A unit test:** at the close shot's distance, a moon mote's CSS px equals a planet mote's at
  the same depth, within 10 %.
  - Mutation-check it by putting the old cause back.
- **A pixel e2e at the close shot (phone, `AMBIENT_POSE`):**
  - no moon draws a dark disc: inside each moon's projected disc, the fraction of near-black
    pixels must not exceed the planet's;
  - no moon mote lands further than one mote radius outside its projected disc.
  - Mutation-check by restoring `moonFill` 0.28.
- **A small-moon check:** at a shot where moons are 2–5 px across, each moon reads as one blob
  (one connected lit component), not a ring.
- **Parity:** if the GLSL changes, `?lib=body` stays green; extend it where a branch is new.
- **Existing tests:** the "twelve light as twelve", lamp-edge and budget tests stay green.

## Look, phone first

Re-run the stills `T6-close-pose`, `T6-close-fixed`, `T7-close-a0` and `T6-system` at 390×844, then
at 1440×900. Look at them with the Read tool, and crop and enlarge one moon. Say plainly whether a
moon now reads as a small dotted sphere of the planet's material, and whether a far moon reads as a
point.
