from pathlib import Path

p = Path('/home/user/motes-of-work/docs/specs/2026-10-06-act-2-storyboard-and-network.md')
s = p.read_text().rstrip('\n')
s += '''

### As built (Tasks 2 and 3, 2026-10-07)

- **Close-up gain for hero stacks.** §3.3's glow normalisation alone left a hero stack (C1: about 0.0075 a
  mote) invisible at its close shot. A stack with glow under 1 now rises toward glow 1 as its on-screen radius
  grows from 120 to 300 CSS px; below 120 px it keeps the designed glow, so every far and wide shot is as §3.3
  says. It is pure (a function of the camera, so of scroll). This breaks "the same glow at any distance" for
  heroes only once they are big on screen (the dives, the climb onto R0). Ratified by the controller.
- **Zoom-out stays close.** On a phone, any pull-back past about 8 units sweeps the plans (y 7) and rules
  (y 14) down through the text band, at every elevation, target height and bearing tried. So N1 is elevation
  14 at distance 8 and N2 is target N0 at distance 8, bearing 40, elevation 18: a small swing round the first
  stack while new stacks appear round it, not the pull-back §2.1 drew. The layers section's first move must
  bring the upper layers in without crossing the band (Task 5).
- **Streams flow parent to child on every edge**, the up-stream included (C7's top to R1's foot), so the
  defect visibly climbs (§3.6); `stream.ts` is the shader's TypeScript twin and its test pins the direction.
'''
p.write_text(s + '\n')
print('ok')
