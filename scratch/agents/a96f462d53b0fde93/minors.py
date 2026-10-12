p = 'e2e/clearance.spec.ts'
s = open(p).read()
old = """/** A wide shot: the camera on the network's framing centre (the shots that show all three layers). */
function wide(state: SceneState): boolean {
  const { target } = netShotOf(state.camera);
  return Math.hypot(target[0] - NET_CENTRE[0], target[1] - NET_CENTRE[1], target[2] - NET_CENTRE[2]) < 0.5;
}"""
new = """/**
 * A wide shot: the camera on the network's framing centre (the shots that show all three layers), or
 * on fx-3's and the lesson's targets above it (N18, N20), which frame the network from higher up.
 */
const WIDE_TARGETS = [NET_CENTRE, netTarget(NET_SHOTS.N18), netTarget(NET_SHOTS.N20)];
function wide(state: SceneState): boolean {
  const { target } = netShotOf(state.camera);
  return WIDE_TARGETS.some((w) => Math.hypot(target[0] - w[0], target[1] - w[1], target[2] - w[2]) < 0.5);
}"""
assert old in s
s = s.replace(old, new)
s = s.replace("import { essayNetwork, NET_CENTRE, netShotOf } from '../src/timeline/netShots';", "import { essayNetwork, NET_CENTRE, NET_SHOTS, netShotOf, netTarget } from '../src/timeline/netShots';")
old = """      let checked = 0;
      for (const [si, s] of story.entries()) {
        const bottom = (await panelText(page, s)).bottom;"""
new = """      let checked = 0;
      const ids = new Set<string>();
      for (const [si, s] of story.entries()) {
        const bottom = (await panelText(page, s)).bottom;"""
assert old in s
s = s.replace(old, new)
old = """              checked++;
              expect(m.top, `${f.id}: its fix in"""
new = """              checked++;
              ids.add(f.id);
              expect(m.top, `${f.id}: its fix in"""
assert old in s
s = s.replace(old, new)
old = """      // C1, R0, R1 and the sweep: every fix that lands under a line (C5's is wordless).
      expect(checked, 'not vacuous').toBeGreaterThan(40);"""
new = """      // C1, R0, R1 and the sweep: every fix that lands under a line (C5's is wordless).
      expect(checked, 'not vacuous').toBeGreaterThan(40);
      for (const id of ['C1', 'R0', 'R1']) expect(ids.has(id), `${id}'s fix checked`).toBe(true);"""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)

p = 'src/parity/parity.ts'
s = open(p).read()
old = """    birth: f32(a.birth),
  });"""
assert old in s
s = s.replace(old, """    birth: f32(a.birth),
    share: f32(a.share),
  });""")
open(p, 'w').write(s)

p = 'docs/specs/2026-10-06-act-2-storyboard-and-network.md'
s = open(p).read()
old = """- N9: bearing −30, elevation 20, distance 66, not 50, 14, 60: from bearing 50 the three lit plans stand
  one behind another and the twelve read as ten shapes; from here test 12 counts twelve on both sizes."""
new = """- N9: bearing −30, elevation 20, distance 66, not 50, 14, 60: from bearing 50 the three lit plans stand
  one behind another and the twelve read as ten shapes; from here test 12 counts twelve on both sizes.
  The pull-out's waypoint over the network turned with it (bearing −20, elevation 16, not 50 and 14)."""
assert old in s
s = s.replace(old, new)
old = """**Tests as built.** Test 11 compares the crack cube's rectangle (stricter than the stack's) with the
highlight held at 0 in both frames (a fix also puts a lit stack's light out) and leaves out the warm
dusting, which is meant to show at any distance. The clearance test also checks every fix at the instant
its warm motes are all half landed, and that a wide shot's top (points above the screen counted) stays
under the band (test 14). Tests 12 and 16 are as §6."""
new = """**Tests as built.** Test 11 counts changed pixels inside the stack's rectangle, as §6 says, with the
highlight held at 0 in both frames (a fix also puts a lit stack's light out). Near: C1 at df-1, R0 at
tr-2's close shot (the hold on its crack while tr-2 is up, trace about 0.47) and at its fix close-up, and
R1 at its fix close-up. Far: C1 and R0 at fr-1, where the rectangle must be at least 100 px and drawn in
at least 20 px, so the far half cannot pass by being empty. One carve-out, ratified by the controller:
the fix's own warm motes (§3.7 means them to be seen at any distance) are not the crack, so a changed
pixel whose change has amber's channel order (red rising, red's rise ≥ green's ≥ blue's: screen-blended
amber over the stack, and nothing else) is left out of the count the limits apply to. Each assertion
reports both counts, with and without the carve-out. The clearance test also checks every fix at the
instant its warm motes are all half landed (C1's, R0's and R1's among them), and that a wide shot's top
(points above the screen counted; N18 and N20 count as wide) stays under the band (test 14). Tests 12 and
16 are as §6; test 12's smallest phone shape is 36 px against the 30 px floor, deterministic under the
pinned renderer but fragile to a renderer or look change, which is what it is for."""
assert old in s
s = s.replace(old, new)
open(p, 'w').write(s)
