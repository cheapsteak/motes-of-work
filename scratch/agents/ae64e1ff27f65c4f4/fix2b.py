R = 'e2e/machine.ts'
s = open(R).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old
    s = s.replace(old, new)


rep("""import { generateNetwork, networkBudget } from '../src/network/generate';""",
    """import { boxCorners } from '../src/network/cluster';
import { generateNetwork, networkBudget, type Network } from '../src/network/generate';""")
rep("""import { buildNodeAttrs } from '../src/scene/node/nodeAttrs';""",
    """import { buildNodeAttrs, CUBE_LANDING } from '../src/scene/node/nodeAttrs';""")
rep("""// machine, and are left out. In Act II the visible machine includes the network (src/scene/node,
// through node.ts, the TypeScript twin of node.glsl): its born motes that have mostly landed, while
// it shows. The reflowed bike is the first stack, and mote() already follows it.
""", """// machine, and are left out. The reflowed bike is the first stack, and mote() already follows it.
//
// Act II's network is visibleNetwork(), not part of visibleMachine() (which is the bike's motes, its
// ghost and its drawing): machineOnScreen() takes both for the bike. The network's points are its
// born motes that have mostly landed (through node.ts, the TypeScript twin of node.glsl), plus the
// eight corners of every cube that has landed, so a stack's top course is counted however few of
// the sampled motes fall on it. machineOnScreen() counts network points only on the screen: a stack
// above the frame (zoom-out's rules) or below it covers nothing, so this cannot tell whether a wide
// shot's top has left the viewport (design test 14's second clause needs its own check).
""")
rep("""let networkCache: { attrs: NodeAttrs[]; data: NodeData } | null = null;
/** The essay's network (its seed, at this file's budget: the layout never depends on the budget), built once. */
function networkOf(): { attrs: NodeAttrs[]; data: NodeData } {
  if (!networkCache) {
    const net = generateNetwork(MOTE_SEED, networkBudget(BUDGET));
    networkCache = { attrs: buildNodeAttrs(net), data: packNodeData(net) };
  }
  return networkCache;
}
""", """let networkCache: { net: Network; attrs: NodeAttrs[]; data: NodeData } | null = null;
/** The essay's network (its seed, at this file's budget: the layout never depends on the budget), built once. */
function networkOf(): { net: Network; attrs: NodeAttrs[]; data: NodeData } {
  if (!networkCache) {
    const net = generateNetwork(MOTE_SEED, networkBudget(BUDGET));
    networkCache = { net, attrs: buildNodeAttrs(net), data: packNodeData(net) };
  }
  return networkCache;
}
""")
rep("""/** World positions of the network's motes the reader can make out at `s`: born, mostly landed, shown. */
export function visibleNetwork(s: SceneState): Vec3[] {
  if (s.net.show <= 0) return [];
  const { attrs, data } = networkOf();
  const clocks = nodeClocks(s);
  const out: Vec3[] = [];
  for (const a of attrs) {
    const o = node(a, clocks, data);
    if (o.visible && o.settled >= 0.5) out.push(o.pos);
  }
  return out;
}""", """/**
 * World positions of the network the reader can make out at `s`, while it shows: its born motes
 * that have mostly landed, and the corners of every cube whose motes have all landed (a cube's
 * builders land inside CUBE_LANDING of its share of its stack's duration; the first stack is the
 * bike's, and visibleMachine() has it).
 */
export function visibleNetwork(s: SceneState): Vec3[] {
  if (s.net.show <= 0) return [];
  const { net, attrs, data } = networkOf();
  const clocks = nodeClocks(s);
  const out: Vec3[] = [];
  for (const a of attrs) {
    const o = node(a, clocks, data);
    if (o.visible && o.settled >= 0.5) out.push(o.pos);
  }
  for (const n of net.nodes) {
    if (n.motes === 0) continue;
    n.boxes.forEach((b, k) => {
      if (s.net.growth >= n.born + (n.dur * (k + CUBE_LANDING[1])) / n.boxes.length) out.push(...boxCorners(b));
    });
  }
  return out;
}""")
open(R, 'w').write(s)
