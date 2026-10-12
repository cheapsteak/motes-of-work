p='e2e/machine.ts'
s=open(p).read()
s=s.replace("""/** World positions of the visible machine at `s` (the network's included, for the bike: it is the essay's machine). */
export function visibleMachine(mech: Mechanism, s: SceneState): Vec3[] {""","""/** World positions of the visible machine at `s` (the bike's motes, its ghost and its drawing; not the network). */
export function visibleMachine(mech: Mechanism, s: SceneState): Vec3[] {""")
s=s.replace("""  out.push(...visibleInk(mech, s), ...sheetCorners(mech, s));
  if (mech.id === 'bike') for (const p of visibleNetwork(s)) out.push(p);
  return out;
}""","""  out.push(...visibleInk(mech, s), ...sheetCorners(mech, s));
  return out;
}""")
old=s[s.index("/**\n * Screen extent, in CSS px from the top-left, of the visible machine"):]
new='''/**
 * Screen extent, in CSS px from the top-left, of the visible machine at `s` on a `width` x `height`
 * page, through the essay's composed camera (the portrait rig and `camera.frame`). Only the points
 * in front of the camera and inside the screen's width count: a close shot may run off a side, and
 * what is off a side covers nothing. For the bike (the essay's machine) the network of Act II
 * counts too, where it is on screen: a stack born high above the frame (zoom-out's rules) is out of
 * the picture, not over the text. `count` is how many points counted, `total` how many there are.
 */
export function machineOnScreen(
  mech: Mechanism,
  s: SceneState,
  width: number,
  height: number,
): { top: number; bottom: number; left: number; right: number; count: number; total: number } {
  const camera = new PerspectiveCamera(40, width / height, 0.1, 400); // the far plane of main.ts
  applyCamera(camera, s, mechanismAnchors(mech), { compose: true });
  camera.updateMatrixWorld();
  const xs: number[] = [];
  const ys: number[] = [];
  const project = (points: Vec3[], offTopCounts: boolean) => {
    for (const p of points) {
      const q = new Vector3(...p).project(camera);
      if (Math.abs(q.x) > 1 || q.z > 1) continue;
      if (!offTopCounts && Math.abs(q.y) > 1) continue;
      xs.push(((q.x + 1) / 2) * width);
      ys.push(((1 - q.y) / 2) * height);
    }
  };
  const machine = visibleMachine(mech, s);
  const network = mech.id === 'bike' ? visibleNetwork(s) : [];
  project(machine, true);
  project(network, false);
  return {
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    left: Math.min(...xs),
    right: Math.max(...xs),
    count: xs.length,
    total: machine.length + network.length,
  };
}
'''
s=s.replace(old,new)
open(p,'w').write(s)
