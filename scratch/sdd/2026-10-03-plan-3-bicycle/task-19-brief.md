# Task 19: auto-advance stops at the end of each scene; the indicator bottom-right

Repo /home/user/motes-of-work, branch main (HEAD 93a2d19 or later); commit there, do not push. Read global-constraints.md,
implementer-instructions.md and task-18-report.md (auto-advance as built) in this folder.

The author (2026-10-05):
- "I couldn't see the auto advance indicator on mobile. Show something on the bottom right please."
- "Auto advance currently seems to have twice as many steps as it should, pausing after text and after the animation
  corresponding to text. Don't have it pause after just text; the animation after text is where the scene is
  considered to end."

## Changes
1. **One stop per scene, at its end.** A scene is a beat plus the motion that goes with it. Its stop is the last scroll
   position at which that beat is fully visible AND its motion has finished: in practice the position just before the
   next change on screen begins — the earlier of (a) the next beat's fade-in start and (b) this beat's own fade-out
   start (a page change), minus a small margin so the frame is settled and the text fully inked. Remove the
   "text has faded in" stops entirely; also remove any separate stop per brief line if it duplicates a scene (each brief
   line IS a scene: line + its parts landing). If a beat's motion would continue past where its text fades (e.g. the
   orbit, the lift-off), the stop is at the latest settled point before the next text appears. The essay's end stays the
   last stop. Dwell at each stop stays `max(floor, words/wps)` for that beat.
   Update the unit tests: exactly one stop per beat (plus the end if distinct); each stop lies after its beat's appear
   point and before the next beat's appear point; at each stop the beat's opacity is 1 and the scene is at rest (sample
   the SceneState just before and at the stop: the motion tracks — assembly, drive, steer, camera, ink — change by less
   than a small epsilon over the last 0.02 screen before the stop, or document the exceptions that are continuous by
   design such as a still-riding bike's drive).
2. **Indicator bottom-right, visible on phones.** Move the ring to the bottom-right corner on every screen size (inset
   about 16px plus the safe-area inset), clear of the credits link (move the credits link if they collide). Make it
   findable: about 28px, ink at about 55 % opacity when running (the dial itself brighter), a soft dark halo behind it so
   it reads over motes (no border, no box; a radial-gradient pool is fine), and a 44px hit area for touch. Paused: a
   small play glyph at the same place. Check it at 390x844 over the bright parts of the scene (the build, the ink sheet).
3. Keep the e2e no-boxes rule passing; update the auto-advance e2e for the new stops and position.

## Verification
tsc; vitest; full e2e `E2E_PORT=4216 npx playwright test` once at the end. Screenshots at 1440x900 and 390x844 into
shots/task19/: the indicator during a dwell over the brief build, over the ink sheet, and paused. Also write the full
stop list (scroll fraction, beat id, dwell seconds) to shots/task19/stops.txt.

Commit. Report to task-19-report.md here; return only status, commits, one-line test summary, screenshot paths, the
number of stops before and after, concerns.
