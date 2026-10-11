// The network (design: docs/specs/2026-10-06-act-2-storyboard-and-network.md §3.2-§3.3): three layers
// of stacks joined by streams, generated once from a seed. Pure and deterministic: the same seed and
// budget give the same network, bit for bit. Each concern draws from its own seeded streams (births,
// parents, positions, sizes, yaws, bows), one per stack where it can, so a change to one does not
// reshuffle another; the budget only sets the mote counts, never the layout.
//
// The scripted lineage (lineage.ts) is placed first; the filler is drawn round it in birth order.
// The story's clocks: births on `net.growth`, lights (`hiAt`) on `net.highlight`, fixes (`fixAt`) on
// `net.fix` (schedule.ts holds the values they must agree on).
import { MOTE_BUDGET_DESKTOP } from '../config';
import { mulberry32, pcg } from '../math/hash';
import type { Vec3 } from '../math/vec';
import { buildCluster, firstStack, type Cluster } from './cluster';
import { FIRST, LINEAGE, OWN_FIXES, SOURCE, type Place, type Scripted } from './lineage';
import { CLEAN_AFTER, CLEAN_WORK_FROM, G_TWELVE, HI_AT_BIRTH, HI_TWELVE, REVIEW_VISITS, SWEEP } from './schedule';

/** The three layers, bottom to top: the code, the plans, the rules. */
export type Layer = 'code' | 'plan' | 'rule';
/** A stack's name: a scripted id ('R0', 'C12', 'V3') or a filler's ('code-17', 'plan-4'). */
export type NodeId = string;

export interface LayerSpec {
  /** Centre line of the layer's slab. */
  y: number;
  /** A drawn stack's height is the centre line plus up to this either way. */
  jitter: number;
  /** A drawn stack lies within this horizontal distance of the origin. */
  extent: number;
  /** Stacks in the layer by the end of growth. */
  count: number;
  /** The layer's count by growth g is `count * g^growthExponent`. */
  growthExponent: number;
  /** Cube unit u (§3.3). */
  unit: number;
  /** Cubes per stack, inclusive. */
  cubes: readonly [number, number];
  /** Motes per plain stack at the reference budget (scaled to fit the budget). */
  motes: number;
  /** How long a stack's cubes take to land, in growth units. */
  dur: number;
  /** A drawn stack lies within this horizontal distance of its main parent (a copy: `COPY_REACH`). */
  reach: number;
}

export const LAYERS: Readonly<Record<Layer, LayerSpec>> = {
  code: { y: 0, jitter: 0.6, extent: 26, count: 300, growthExponent: 1.3, unit: 0.42, cubes: [5, 7], motes: 120, dur: 0.012, reach: 4 },
  plan: { y: 7, jitter: 1.0, extent: 18, count: 40, growthExponent: 1, unit: 0.65, cubes: [9, 12], motes: 300, dur: 0.03, reach: 7 },
  rule: { y: 14, jitter: 1.5, extent: 7, count: 6, growthExponent: 1, unit: 1.1, cubes: [16, 22], motes: 700, dur: 0.06, reach: 7 },
};

const LAYER_ABOVE: Readonly<Record<Layer, Layer | null>> = { code: 'plan', plan: 'rule', rule: null };

/** Two stacks of a layer keep their centres at least this times the sum of their radii apart. */
export const SPACING = 1.1;
/** A copy lies within this of its source. */
export const COPY_REACH = 3;
/** The share of filler code stacks that copy a nearby code stack instead of reading a plan. */
export const COPY_SHARE = 0.15;
/** The share of filler plans that also reuse an earlier plan (a second, sideways stream). */
export const REUSE_SHARE = 0.1;
/** Parents are chosen by closeness to a random spot: weight exp(-d / PARENT_REACH), times age for a layer above. */
export const PARENT_REACH = 6;
/** A stream's control point sits this share of its length off its midpoint, sideways (§3.6). */
export const STREAM_BOW = 0.12;
/** The heroes visited close turn by at most this either way, so their crack faces the default bearing. */
export const HERO_YAW = 0.2;

/** A cracked stack's person set: this share of its motes, never fewer than `PERSON_MIN`. */
export const PERSON_SHARE = 0.06;
export const PERSON_MIN = 24;
/** A hero's person set on desktop (it scales with the hero). */
export const HERO_PERSON_MOTES = 300;

/** The network's mote budget for a mote budget (§3.3: 0.76 of it). */
export function networkBudget(moteBudget: number): number {
  return Math.round(0.76 * moteBudget);
}
/** The desktop network budget: the reference at which the heroes carry their designed counts. */
export const NETWORK_BUDGET = networkBudget(MOTE_BUDGET_DESKTOP);

export interface Node extends Cluster {
  /** Its place in `Network.nodes` (birth order). */
  index: number;
  id: NodeId;
  /** The design's second name for it, if any (`C19` for `V3`). */
  alias?: string;
  layer: Layer;
  /** True for the stacks of the scripted lineage, false for the filler. */
  scripted: boolean;
  /** Stream parents (indices into `nodes`), the main stream first. Empty for a rule nothing built. */
  parents: number[];
  /** Birth on the growth clock: its first cube sets out here. */
  born: number;
  /** How long its cubes take to land: the last lands at `born + dur`. */
  dur: number;
  /** It carries the defect: R0, or built from a stack that does before `CLEAN_AFTER`. */
  cracked: boolean;
  /** A stack the camera visits close (C1, C5, R0, R1), dense enough for its crack to read at two radii. */
  hero: boolean;
  /** When it lights on the highlight clock; null if it never does (clean, or C1, found close before any light). */
  hiAt: number | null;
  /** When it is rebuilt on the fix clock; null if clean. */
  fixAt: number | null;
  /** Streams from R0 to it through stacks that carry the defect (the surge's order); null if clean. */
  hop: number | null;
  centre: Vec3;
  /** Radians about +y. */
  yaw: number;
  /** Cube unit. */
  unit: number;
  cubes: number;
  /** Index into `edges` of its main stream, or null for a rule nothing built. */
  stream: number | null;
  /** Where its builder motes set out: its main stream's start, or high above a rule nothing built. */
  spawn: Vec3;
  /** The radius of what it is built from (its main parent's, or its own): the spread of its spawn. */
  spawnRadius: number;
  /** Builder motes (surface points on its boxes). N0 has none: its motes are the bike's. */
  motes: number;
  /** Person motes (the fix's warm motes on its crack cube), cracked stacks only. */
  personMotes: number;
  /** Brightness factor so its light per unit of surface matches a plain code stack's (§3.3). */
  glow: number;
}

export type EdgeKind = 'down' | 'side' | 'up';

/** A stream: a quadratic Bezier a → c → b from a parent to a child, the path its child's motes fly in on. */
export interface Edge {
  from: number;
  to: number;
  /** Down from the layer above; sideways in a layer (a copy, a reused plan); up (C7 → R1 only). */
  kind: EdgeKind;
  /**
   * Its start: the parent's foot (down), top (up) or the side facing the child (side). Its end: the
   * child's head (down, side) or foot (up).
   */
  a: Vec3;
  b: Vec3;
  /** The control point: the midpoint bowed sideways by `STREAM_BOW` of the length. */
  c: Vec3;
  /** The growth at which it comes up: its child's birth (N0's waits for its plan to be half built). */
  born: number;
  /** When it lights: its child's `hiAt`, if the defect ran along it (both ends cracked); else null. */
  hiAt: number | null;
  /** Its parent's hop plus one, if the defect ran along it; else null. */
  hop: number | null;
}

/** The feed: the stream from R0's foot to the reviewer's ring (its other end moves with the ring). */
export interface Feed {
  from: number;
  a: Vec3;
  /** It is the first step of R0's lineage: the surge lights it with R0's plans. */
  hop: 1;
}

/** Values the keyframes are checked against, as this network realises them. */
export interface NetworkSchedule {
  /** The stacks lit under df-5, in the order they light. */
  twelve: NodeId[];
  /** The first birth of a cracked stack after the twelve's span. */
  nextCrackedBirth: number;
  /** The review visits' births, V1 to V9. */
  visitBirths: number[];
  /** The sweep's first and last `fixAt`. */
  sweep: [number, number];
}

export interface Network {
  seed: number;
  budget: number;
  /** Every stack, in birth order. */
  nodes: Node[];
  /** Every stream, one per (child, stream parent). */
  edges: Edge[];
  feed: Feed;
  /** The reviewer's visits, in order. */
  visits: NodeId[];
  schedule: NetworkSchedule;
  /** Node index by id and by alias. */
  ids: Record<NodeId, number>;
  /** All motes: builders plus person sets. At most `budget`. */
  motes: number;
}

/** The index of the stack named `id` (or its alias). */
export function nodeIndex(net: Network, id: NodeId): number {
  const i = net.ids[id];
  if (i === undefined) throw new Error(`no stack named ${id}`);
  return i;
}

/** How much of a stack has landed at `growth`, 0..1 (the halo's `bornFrac`, §3.8). */
export function bornFrac(node: Pick<Node, 'born' | 'dur'>, growth: number): number {
  if (node.dur <= 0) return growth >= node.born ? 1 : 0;
  return Math.min(1, Math.max(0, (growth - node.born) / node.dur));
}

// ---------------------------------------------------------------------------------------------------

/** One seeded stream per (concern, key): `mulberry32(pcg(seed ^ salt))`, the salt mixing both in. */
const CONCERN = { births: 1, parents: 2, positions: 3, sizes: 4, yaws: 5, bows: 6 } as const;
function rngFor(seed: number, concern: keyof typeof CONCERN, key: number): () => number {
  const salt = pcg((Math.imul(CONCERN[concern], 0x9e3779b9) ^ Math.imul(key + 1, 0x85ebca6b)) >>> 0);
  return mulberry32(pcg((seed ^ salt) >>> 0));
}
const FILLER_KEY: Readonly<Record<Layer, number>> = { code: 10_000, plan: 20_000, rule: 30_000 };
const BIRTH_GAP = 0.001;

interface Draft {
  key: number;
  id: NodeId;
  alias?: string;
  layer: Layer;
  born: number;
  dur: number;
  script?: Scripted;
  shape: Cluster;
  yaw: number;
  centre?: Vec3;
  node?: Node;
}

const hDist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[2] - b[2]);
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const halfBuilt = (n: Node): number => n.born + 0.5 * n.dur;

/**
 * Filler births for one layer: the layer's count follows `count * g^exponent` (scripted stacks
 * included), each filler born at a random point of its slot, none before `from` (when the layer has
 * something to be built from), and in order.
 */
function fillerBirths(spec: LayerSpec, scripted: number[], from: number, rng: () => number): number[] {
  const total = spec.count - scripted.length;
  const steps = 8000;
  const f: number[] = [];
  let best = 0;
  for (let i = 0; i <= steps; i++) {
    const g = i / steps;
    const s = scripted.filter((b) => b <= g).length;
    best = Math.max(best, spec.count * g ** spec.growthExponent - s);
    f.push(best);
  }
  const births: number[] = [];
  let prev = from - BIRTH_GAP;
  let i = 1;
  for (let k = 0; k < total; k++) {
    const y = Math.min(k + rng(), f[steps] - 1e-9);
    while (f[i] < y) i++;
    const g = (i - 1 + (y - f[i - 1]) / (f[i] - f[i - 1])) / steps;
    prev = Math.max(g, prev + BIRTH_GAP);
    births.push(prev);
  }
  return births;
}

/** Picks an index by weight from `rng`; -1 if every weight is 0. */
function pickWeighted(weights: number[], rng: () => number): number {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!(sum > 0)) return -1;
  let r = rng() * sum;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

export function generateNetwork(seed: number, budget: number): Network {
  const scriptedById = new Map(LINEAGE.map((s) => [s.id, s]));

  // 1. Every stack's draft: who, which layer, when, its shape and yaw. The shapes are built at the
  // origin and moved when placed (a stack's radius does not depend on where it is).
  const drafts: Draft[] = [];
  const shapeFor = (key: number, layer: Layer, cubes?: number) => {
    const L = LAYERS[layer];
    const rng = rngFor(seed, 'sizes', key);
    const n = cubes ?? L.cubes[0] + Math.min(L.cubes[1] - L.cubes[0], Math.floor(rng() * (L.cubes[1] - L.cubes[0] + 1)));
    return { n, rng };
  };
  LINEAGE.forEach((s, key) => {
    const L = LAYERS[s.layer];
    let shape: Cluster;
    let yaw: number;
    if (s.id === FIRST) {
      shape = firstStack();
      yaw = 0;
    } else {
      const yawRng = rngFor(seed, 'yaws', key);
      yaw = s.hero ? HERO_YAW * (2 * yawRng() - 1) : 2 * Math.PI * yawRng();
      const { n, rng } = shapeFor(key, s.layer, s.cubes);
      shape = buildCluster(n, L.unit, yaw, [0, 0, 0], rng);
    }
    drafts.push({ key, id: s.id, alias: s.alias, layer: s.layer, born: s.born, dur: s.dur ?? L.dur, script: s, shape, yaw });
  });
  for (const layer of ['code', 'plan'] as const) {
    const L = LAYERS[layer];
    const above = LAYER_ABOVE[layer]!;
    const scriptedBirths = LINEAGE.filter((s) => s.layer === layer).map((s) => s.born);
    const from = Math.min(...LINEAGE.filter((s) => s.layer === above).map((s) => s.born + 0.5 * (s.dur ?? LAYERS[above].dur)));
    fillerBirths(L, scriptedBirths, from, rngFor(seed, 'births', FILLER_KEY[layer])).forEach((born, k) => {
      const key = FILLER_KEY[layer] + k;
      const yaw = 2 * Math.PI * rngFor(seed, 'yaws', key)();
      const { n, rng } = shapeFor(key, layer);
      drafts.push({ key, id: `${layer}-${k + 1}`, layer, born, dur: L.dur, shape: buildCluster(n, L.unit, yaw, [0, 0, 0], rng), yaw });
    });
  }

  // 2. Places. Scripted stacks first (designed places, moved apart where they crowd, then the drawn
  // ones in table order); the filler is drawn later, round all of them.
  // The placed stacks of each layer in a grid of cells as wide as the largest spacing, so a spot is
  // checked against its own cell and the eight round it only.
  const cellOf: Record<Layer, number> = { code: 0, plan: 0, rule: 0 };
  for (const d of drafts) cellOf[d.layer] = Math.max(cellOf[d.layer], 2 * SPACING * d.shape.radius);
  const grid: Record<Layer, Map<number, Draft[]>> = { code: new Map(), plan: new Map(), rule: new Map() };
  const cellKey = (i: number, k: number): number => (i + 4096) * 8192 + (k + 4096);
  const placed: Record<Layer, Draft[]> = { code: [], plan: [], rule: [] };
  const clear = (d: Draft, c: Vec3) => {
    const size = cellOf[d.layer];
    const [i, k] = [Math.floor(c[0] / size), Math.floor(c[2] / size)];
    for (let di = -1; di <= 1; di++) {
      for (let dk = -1; dk <= 1; dk++) {
        for (const o of grid[d.layer].get(cellKey(i + di, k + dk)) ?? []) {
          if (dist(c, o.centre!) < SPACING * (d.shape.radius + o.shape.radius)) return false;
        }
      }
    }
    return true;
  };
  const settle = (d: Draft, c: Vec3) => {
    d.centre = c;
    placed[d.layer].push(d);
    const size = cellOf[d.layer];
    const key = cellKey(Math.floor(c[0] / size), Math.floor(c[2] / size));
    const cell = grid[d.layer].get(key);
    if (cell) cell.push(d);
    else grid[d.layer].set(key, [d]);
  };
  /** Tries `attempts` spots within `reach` of `anchor` (horizontally, in the layer's slab); true if one was clear. */
  const tryDraw = (d: Draft, anchor: Vec3, reach: number, attempts: number, rng: () => number): boolean => {
    const L = LAYERS[d.layer];
    for (let attempt = 0; attempt < attempts; attempt++) {
      const a = 2 * Math.PI * rng();
      const rho = reach * Math.sqrt(rng());
      const c: Vec3 = [anchor[0] + rho * Math.cos(a), L.y + L.jitter * (2 * rng() - 1), anchor[2] + rho * Math.sin(a)];
      if (Math.hypot(c[0], c[2]) <= L.extent && clear(d, c)) {
        settle(d, c);
        return true;
      }
    }
    return false;
  };
  /** Draws a place within `reach` of `anchor`, widening the reach a little at a time if it is full. */
  const draw = (d: Draft, anchor: Vec3, reach: number, rng = rngFor(seed, 'positions', d.key)) => {
    for (let round = 0, r = reach; round < 200; round++, r += 0.5) if (tryDraw(d, anchor, r, 30, rng)) return;
    throw new Error(`no room for ${d.id}`);
  };
  const byId = new Map(drafts.filter((d) => d.script).map((d) => [d.id, d]));
  const placeOf = (s: Scripted): Place => s.place ?? { near: (s.parents as string[])[0], within: 0 };
  for (const d of drafts.filter((x) => x.script && 'at' in placeOf(x.script))) {
    const c: Vec3 = [...(placeOf(d.script!) as { at: Vec3 }).at];
    for (let iter = 0; iter < 100; iter++) {
      const o = placed[d.layer].find((p) => dist(c, p.centre!) < SPACING * (d.shape.radius + p.shape.radius));
      if (!o) break;
      // Push it straight away from the stack it crowds, horizontally, just far enough.
      const need = SPACING * (d.shape.radius + o.shape.radius);
      const dy = c[1] - o.centre![1];
      const h = Math.sqrt(Math.max(0, need * need - dy * dy)) + 1e-6;
      const dx = c[0] - o.centre![0];
      const dz = c[2] - o.centre![2];
      const len = Math.hypot(dx, dz) || 1;
      c[0] = o.centre![0] + (h * (dx || 1)) / len;
      c[2] = o.centre![2] + (h * dz) / len;
    }
    if (!clear(d, c)) throw new Error(`could not make room for ${d.id}`);
    settle(d, c);
  }
  for (const d of drafts.filter((x) => x.script && !('at' in placeOf(x.script)))) {
    const p = placeOf(d.script!);
    if ('around' in p) draw(d, p.around, p.within);
    else {
      const q = p as { near: string; within: number };
      const anchor = byId.get(q.near)!;
      const reach = q.within || (anchor.layer === d.layer ? COPY_REACH : LAYERS[d.layer].reach);
      draw(d, anchor.centre!, reach);
    }
  }

  // 3. In birth order: parents, the defect, hops, streams; the filler is placed as it is born.
  const order = [...drafts].sort((a, b) => a.born - b.born || (a.script ? 0 : 1) - (b.script ? 0 : 1) || a.key - b.key);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const ids: Record<NodeId, number> = {};
  order.forEach((d, index) => {
    ids[d.id] = index;
    if (d.alias) ids[d.alias] = index;
  });
  const eligible = (layer: Layer, at: number): Node[] =>
    nodes.filter((n) => {
      if (n.layer !== layer || halfBuilt(n) > at + 1e-12) return false;
      // Before the twelve's span ends, the defect spreads only along the scripted lineage.
      if (n.cracked && at <= G_TWELVE[1]) return false;
      // Between the rule's fix and the first correct work, nothing new is built from the two rules.
      if ((n.id === SOURCE || n.id === 'R1') && at >= CLEAN_AFTER && at < CLEAN_WORK_FROM) return false;
      return true;
    });
  const nearestTo = (c: Vec3, ns: Node[]): Node | null =>
    ns.reduce<Node | null>((best, n) => (!best || hDist(n.centre, c) < hDist(best.centre, c) ? n : best), null);

  for (const d of order) {
    let parents: Node[];
    if (d.script) {
      const ps = d.script.parents;
      if (ps === 'nearest-clean-plan') {
        const p = nearestTo(d.centre!, eligible('plan', d.born).filter((n) => !n.cracked));
        if (!p) throw new Error(`no clean plan for ${d.id}`);
        parents = [p];
      } else {
        parents = ps.map((id) => {
          const p = nodes[ids[id]];
          if (!p && d.id !== FIRST) throw new Error(`${d.id} is born before its parent ${id}`);
          return p;
        });
      }
    } else {
      const rng = rngFor(seed, 'parents', d.key);
      const L = LAYERS[d.layer];
      const a = 2 * Math.PI * rng();
      const rho = L.extent * Math.sqrt(rng());
      const spot: Vec3 = [rho * Math.cos(a), L.y, rho * Math.sin(a)];
      const copy = d.layer === 'code' && rng() < COPY_SHARE;
      const reuse = d.layer === 'plan' && rng() < REUSE_SHARE;
      // A parent by weight (closeness to the spot, times age for a layer above) that has room for
      // the child within its reach; a parent whose neighbourhood is full is passed over. If none has
      // room, the first choice's reach widens until a place is found.
      const positions = rngFor(seed, 'positions', d.key);
      const pick = (candidates: Node[], aged: boolean, reach: number, widen: boolean): Node | null => {
        const ns = [...candidates];
        const w = ns.map((n) => Math.exp(-hDist(n.centre, spot) / PARENT_REACH) * (aged ? d.born - n.born : 1));
        let first: Node | null = null;
        for (;;) {
          const i = pickWeighted(w, rng);
          if (i < 0) break;
          first ??= ns[i];
          if (tryDraw(d, ns[i].centre, reach, 40, positions)) return ns[i];
          w[i] = 0;
        }
        if (!first || !widen) return null;
        draw(d, first.centre, reach, positions);
        return first;
      };
      const source = copy ? pick(eligible('code', d.born), false, COPY_REACH, false) : null;
      const main = source ?? pick(eligible(LAYER_ABOVE[d.layer]!, d.born), true, L.reach, true);
      if (!main) throw new Error(`nothing to build ${d.id} from at ${d.born}`);
      parents = [main];
      if (reuse) {
        const second = nearestTo(d.centre!, eligible('plan', d.born));
        if (second) parents.push(second);
      }
    }

    const index = nodes.length;
    const centre = d.centre!;
    const shape = d.shape;
    const boxes = shape.boxes.map((b) => ({ ...b, centre: [b.centre[0] + centre[0], b.centre[1] + centre[1], b.centre[2] + centre[2]] as Vec3 }));
    const isFirst = d.id === FIRST;
    // The bike is clean, and there before its plan: its parent is not built yet.
    const live = isFirst ? [] : parents;
    const cracked = d.id === SOURCE || (d.born < CLEAN_AFTER && live.some((p) => p.cracked));
    const hop = d.id === SOURCE ? 0 : cracked ? Math.min(...live.filter((p) => p.cracked).map((p) => p.hop! + 1)) : null;
    const node: Node = {
      ...shape,
      boxes,
      index,
      id: d.id,
      ...(d.alias ? { alias: d.alias } : {}),
      layer: d.layer,
      scripted: !!d.script,
      parents: parents.map((p) => (p ? p.index : ids[(d.script!.parents as string[])[0]])),
      born: d.born,
      dur: d.dur,
      cracked,
      hero: !!d.script?.hero,
      hiAt: d.script ? (d.script.hiAt ?? null) : cracked ? HI_AT_BIRTH : null,
      fixAt: d.script ? (d.script.fixAt ?? null) : null,
      hop,
      centre,
      yaw: d.yaw,
      unit: LAYERS[d.layer].unit,
      cubes: shape.boxes.length,
      stream: null,
      spawn: [centre[0], centre[1] + 3 * shape.radius, centre[2]],
      spawnRadius: shape.radius,
      motes: 0,
      personMotes: 0,
      glow: 1,
    };
    nodes.push(node);
    d.node = node;
  }

  // Streams, now every parent exists (N0's plan is born after it).
  const rank: Record<Layer, number> = { code: 0, plan: 1, rule: 2 };
  for (const node of nodes) {
    node.parents.forEach((pi, slot) => {
      const p = nodes[pi];
      const step = rank[p.layer] - rank[node.layer];
      const kind: EdgeKind = step === 1 ? 'down' : step === 0 ? 'side' : 'up';
      const top = (n: Node): Vec3 => [n.centre[0], n.centre[1] + n.height / 2, n.centre[2]];
      const foot = (n: Node): Vec3 => [n.centre[0], n.centre[1] - n.height / 2, n.centre[2]];
      let a: Vec3;
      let b: Vec3;
      if (kind === 'down') [a, b] = [foot(p), top(node)];
      else if (kind === 'up') [a, b] = [top(p), foot(node)];
      else {
        const dx = node.centre[0] - p.centre[0];
        const dz = node.centre[2] - p.centre[2];
        const len = Math.hypot(dx, dz) || 1;
        a = [p.centre[0] + (p.radius * dx) / len, p.centre[1], p.centre[2] + (p.radius * dz) / len];
        b = top(node);
      }
      const c = bowed(a, b, rngFor(seed, 'bows', node.index * 4 + slot));
      const carried = p.cracked && node.cracked;
      const edge: Edge = {
        from: pi,
        to: node.index,
        kind,
        a,
        b,
        c,
        born: Math.max(node.born, halfBuilt(p)),
        hiAt: carried ? node.hiAt : null,
        hop: carried ? p.hop! + 1 : null,
      };
      if (slot === 0) {
        node.stream = edges.length;
        node.spawn = a;
        node.spawnRadius = p.radius;
      }
      edges.push(edge);
    });
  }

  // 4. The sweep: the filler's fixes slot in among the scripted ones by (plans first, hop, birth).
  sweep(nodes);

  // 5. Motes, then glow.
  const total = allocateMotes(nodes, budget);
  const plainCode = nodes.filter((n) => n.layer === 'code' && !n.hero && n.motes > 0);
  const area = plainCode.reduce((s, n) => s + n.area, 0);
  const ref = area > 0 ? plainCode.reduce((s, n) => s + n.motes, 0) / area : 1;
  for (const n of nodes) n.glow = n.motes > 0 ? (ref * n.area) / n.motes : 1;

  // 6. The schedule as realised.
  const twelve = nodes
    .filter((n) => n.cracked && n.born <= G_TWELVE[1] && n.hiAt !== null && n.hiAt <= HI_TWELVE)
    .sort((a, b) => a.hiAt! - b.hiAt!)
    .map((n) => n.id);
  const later = nodes.filter((n) => n.cracked && n.born > G_TWELVE[1]).map((n) => n.born);
  const swept = nodes.filter((n) => n.fixAt !== null && n.fixAt >= SWEEP[0]).map((n) => n.fixAt!);
  const r0 = nodes[ids[SOURCE]];
  return {
    seed,
    budget,
    nodes,
    edges,
    feed: { from: r0.index, a: [r0.centre[0], r0.centre[1] - r0.height / 2, r0.centre[2]], hop: 1 },
    visits: [...REVIEW_VISITS],
    schedule: {
      twelve,
      nextCrackedBirth: Math.min(...later),
      visitBirths: REVIEW_VISITS.map((id) => nodes[ids[id]].born),
      sweep: [Math.min(...swept), Math.max(...swept)],
    },
    ids,
    motes: total,
  };
}

/** The control point: the midpoint, moved `STREAM_BOW` of the length along a seeded direction square to the stream. */
function bowed(a: Vec3, b: Vec3, rng: () => number): Vec3 {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const mid: Vec3 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  if (len === 0) return mid;
  const t: Vec3 = [d[0] / len, d[1] / len, d[2] / len];
  // A basis square to the stream: e1 = t x (up, or x when the stream is vertical), e2 = t x e1.
  const ref: Vec3 = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (u: Vec3, v: Vec3): Vec3 => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  const e1raw = cross(t, ref);
  const l1 = Math.hypot(e1raw[0], e1raw[1], e1raw[2]);
  const e1: Vec3 = [e1raw[0] / l1, e1raw[1] / l1, e1raw[2] / l1];
  const e2 = cross(t, e1);
  const angle = 2 * Math.PI * rng();
  const k = STREAM_BOW * len;
  return [0, 1, 2].map((i) => mid[i] + k * (Math.cos(angle) * e1[i] + Math.sin(angle) * e2[i])) as Vec3;
}

/**
 * The sweep's fixes (fx-4). Every cracked stack without a fix of its own is rebuilt in the order
 * (plans before code, then by hop from R0, then by birth). The scripted stacks carry their designed
 * `fixAt`; each run of filler between two of them is spaced evenly between their values (after the
 * last, up to the sweep's end).
 */
function sweep(nodes: Node[]): void {
  const own = new Set<string>(OWN_FIXES);
  const swept = nodes
    .filter((n) => n.cracked && !own.has(n.id))
    .sort((a, b) => (a.layer === 'plan' ? 0 : 1) - (b.layer === 'plan' ? 0 : 1) || a.hop! - b.hop! || a.born - b.born || a.index - b.index);
  let lo: number | null = null;
  let run: Node[] = [];
  const flush = (hi: number) => {
    const from = lo ?? SWEEP[0];
    if (run.length > 0 && hi <= from) throw new Error(`no room in the sweep before ${hi}`);
    run.forEach((n, i) => (n.fixAt = from + ((hi - from) * (i + 1)) / (run.length + 1)));
    run = [];
  };
  for (const n of swept) {
    if (!n.scripted) {
      run.push(n);
      continue;
    }
    if (n.fixAt === null || (lo !== null && n.fixAt <= lo)) throw new Error(`the sweep's order puts ${n.id} out of turn`);
    flush(n.fixAt);
    lo = n.fixAt;
  }
  flush(SWEEP[1]);
}

/**
 * Mote counts for `budget`. The heroes keep their share of the reference budget (their designed
 * counts on desktop, scaled with the budget); the plain stacks share the rest by their layer's
 * count, all scaled by one factor, the largest that fits. Person sets are 6 % of a cracked stack's
 * motes, never fewer than 24 (unless the budget cannot hold even that). Returns the total.
 */
function allocateMotes(nodes: Node[], budget: number): number {
  const k = budget / NETWORK_BUDGET;
  let heroTotal = 0;
  for (const n of nodes) {
    if (!n.hero) continue;
    const script = LINEAGE.find((s) => s.id === n.id)!;
    n.motes = Math.round(script.hero! * k);
    n.personMotes = n.cracked ? Math.round(HERO_PERSON_MOTES * k) : 0;
    heroTotal += n.motes + n.personMotes;
  }
  const plain = nodes.filter((n) => !n.hero && n.id !== FIRST);
  const room = Math.max(0, budget - heroTotal);
  const cracked = plain.filter((n) => n.cracked).length;
  const personMin = cracked * PERSON_MIN <= room ? PERSON_MIN : Math.floor(room / Math.max(1, cracked));
  const fill = (s: number): number => {
    let t = 0;
    for (const n of plain) {
      n.motes = Math.floor(LAYERS[n.layer].motes * s);
      n.personMotes = n.cracked ? Math.max(personMin, Math.round(PERSON_SHARE * n.motes)) : 0;
      t += n.motes + n.personMotes;
    }
    return t;
  };
  let lo = 0;
  let hi = 8;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (fill(mid) <= room) lo = mid;
    else hi = mid;
  }
  return heroTotal + fill(lo);
}
