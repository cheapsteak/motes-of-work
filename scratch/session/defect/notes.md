# Defect inspector: working notes

(Written incrementally; container restarts happen. Newest status at the bottom.)

## Essay facts learned (motes-of-work src/scene/node/, src/galaxy/body.ts)

- A planet is a lat/long lattice shell (galaxy/body.ts latticeRowCols): row i at lat -pi/2 + pi(i+.5)/rows,
  max(6, round(cols cos lat)) points per row, odd rows offset half a step. The defect planet C1 is the
  HERO lattice 60 x 160 (6,116 motes); other planets use planetLattice(R) (14 x 36 at R = 0.30). Moons use
  their planet's row/col pitch (min 3 x 6). Mote world diameter = 0.5 * pi * R / rows (BODY_LOOK.dotShare).
- Dots: hard disc with a 1 px edge, screen-blended (premultiplied), shell brightness 0.7. Lit adds
  NODE_HI_GAIN 1.5 (x2.5 brightness) and mixes 0.8 toward ember #FF6B57 from the agents' blue #4DA3FF.
- Under the shell, the body mesh: fill 0.035 + rim 0.55 (1 - |n.v|)^2.6, x(1 + 0.35 hi).
- The lattice spins about a hashed axis tilted 25-40 deg off vertical, one turn per 14 s.
- Today's defect on a cracked body:
  - morph: r = 1 + A cos(lat) [sin(p lon + phi1 + w0 t) sin(q lat' + phi2 + w1 t) + 0.45 sin(p2 lon + phi3 - w2 t) sin(q2 lat' + phi4)],
    A = EQ_A = 0.02, w = (.35, -.22, .5), lat' = lat + pi/2, shapes hashed per scatter count.
  - scatter derp: 2.2 s slots, a 1 s event at a hashed offset; motes leave in an 80 ms sweep, hold
    120-180 ms with 30 Hz held jitter, return in 3 hard cuts (k 1 -> .55 -> .25 -> 0, 50 ms apart),
    land on the NEXT shape and ring 0.06 e^(-a/.16) cos(2 pi 6 a); 50 % aftershock at 0.55 s (k .45,
    hold only). Amplitude 0.12 + 0.28 h5^2 (cap .4 R planet, .3 R moon); 22 % go inward x -0.6;
    brightness x(1 + 0.6 k).
  - The freeze frame forces scatter sec 0.16 (mid-leap). It already draws offset cold/warm copies of
    the held piece, which rhymes with an RGB split.
- hash01(seed, salt) = PCG(seed ^ salt * 0x9e3779b9) >> 8 / 2^24 (src/scene/mote/mote.glsl), ported to JS
  with Math.imul.

## Plan

- The CPU computes every dot (lattice -> variant motion -> spin -> world -> project to CSS px), then
  the glitch kit runs in screen space on the defective piece only (planet, moons, moon tracks). three.js
  draws Points and a rim-disc shader in pixel space with the screen blend.
- Every frame is f(t, intensity, variant, camera). All randomness is hash01 of stepped time
  (floor(t * rate), cell indices), never Math.random.
- three r186 module copied beside the page (three.module.js + three.core.js).

## Status 1 (inspector built)

- inspector.html works in Playwright (swiftshader), no page errors. Framing at 390x844: defective planet
  centre ~(158, 671) R ~96 px; healthy ~(292, 481) R ~50 px; moons at 1.7 R and 2.25 R; text band 0-354 px.
- 18 variants: 0 today, 1-7 motions, 8-13 glitch kit G1-G6, 14-17 combinations.
- window.inspector API: manual(), render(v, t, I), measure(v, I), seedMoments(v, I), setView/setZoom,
  planetScreen(). URL params v, i, t, paused, reduced, ui=min|none.
- Measures (20 s at 30 fps, planet dots vs the calm sphere): fracChanging (>1 px frame-to-frame or
  hidden set change or split change), CV of onset intervals (onset = change after 3 quiet frames),
  peak px (incl. split), and a flash guard (luminance swings >10 % of calm, flips/s). First run: all
  variants <= 2 flashes/s; today itself swings 0.6 in luminance (its scatter brightens dots x1.6).
- Server: python http.server on 127.0.0.1:8765 from defect/, PID in agents/aec64dec061d096a3/server.pid.
- Playwright scripts: shots/_defect_shot.mjs and _defect_probe.mjs (delete at end).

- Status 2: full evidence rendered; then lumps enlarged (0.24/0.12/-0.2) and block snap draws one block-dot per grid node (no white stacking); v04, v10, v13, v16 re-rendered.

## Status 3 (done)

- strips/<id>/i035 and i100: f00-f15 (1/30 s), s0-s7 (0.5 s), static.png (reduced-motion frame, 1.5x closer), phone.png, meta.json (seed, measures); strips/<id>/sheet.html + sheet.png; strips/variants.json.
- review.html built from the meta files plus review-intro.html.
- Interaction checked: arrow keys, swipe, wheel, reduced toggle (freezes the time), 1440x900 layout. No page errors.
- Temporary Playwright scripts deleted from motes-of-work/shots; server stopped by PID. Repo untouched otherwise.
