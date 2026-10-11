import { describe, expect, it } from 'vitest';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { nodeIndex } from '../network/generate';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { fadeWidth, pageOut } from '../story/reveal';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import { portraitRig } from '../scene/cameraRig';
import {
  essayNetwork,
  NET_CENTRE,
  NET_MOVES,
  NET_SHOTS,
  netShotKeyframe,
  netShotKeys,
  netShotOf,
  netTarget,
  splineKeys,
  type NetMoveName,
  type NetShot,
  type NetShotName,
} from './netShots';
import { SHOTS, shotKeys } from './shots';

// Act II's shots (docs/specs/2026-10-06-act-2-storyboard-and-network.md §2, §3.9), held in network
// terms: each beat's camera, read back from the shipped keyframes, is its shot's target, bearing,
// elevation, distance, fov and frame, with coreFocus 0, over the whole of the shot's hold.

const anchors = mechanismAnchors(mechanisms.bike);
const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const at = (id: string, local: number): number => {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return span.start + local * (span.end - span.start);
};

/** Where each shot holds, section-local, and the line it is there for. */
const HOLDS: [section: string, from: number, to: number, shot: NetShotName, line: string][] = [
  ['zoom-out', 0, 0.02, 'S10p', 'zo-1 opens on Act I’s last shot, the finished bike riding'],
  ['zoom-out', 0.5, 0.5, 'N1', 'zo-1 ends on the first stack, small and low under the text'],
  ['zoom-out', 1, 1, 'N2', 'zo-2 ends looking further down on the first stack as the first stacks are born round it'],
  ['layers', 0.06, 0.14, 'N3', 'ly-1: the bottom cluster, B1 and B2 forming in frame'],
  ['layers', 0.18, 0.18, 'rise', 'ly-2 comes up with the rise over: above every stack'],
  ['layers', 0.26, 0.36, 'N4', 'ly-2: the top layer, level with the camera'],
  ['layers', 0.46, 0.54, 'N5', 'ly-3: the middle layer'],
  ['layers', 0.58, 0.58, 'drop', 'ly-4 comes up with the drop over: low among the code'],
  ['layers', 0.64, 0.7, 'N6', 'ly-4: the code, close'],
  ['layers', 0.74, 0.74, 'pullBack', 'ly-5 comes up with the camera above every stack on the way out'],
  ['layers', 0.92, 1, 'N7', 'ly-5: all three layers as three bands'],
  ['far', 0, 0, 'N7', 'fr-1 opens where ly-5 left off'],
  ['far', 0.92, 0.9375, 'N7p', 'fr-1: the orbit ends and holds through the stop'],
  ['defect', 0.0208, 0.4392, 'N8', 'df-1, df-2: the cracked cube, close'],
  ['defect', 0.4808, 0.4808, 'pullOut', 'df-3 comes up with the camera back above every stack'],
  ['defect', 0.58, 1, 'N9', 'df-3 to df-5: the whole network, the twelve'],
];

const close = (want: NetShot, got: ReturnType<typeof netShotOf>, where: string) => {
  const target = netTarget(want);
  got.target.forEach((v, k) => expect(v, `${where} target[${k}]`).toBeCloseTo(target[k], 2));
  expect(got.bearing, `${where} bearing`).toBeCloseTo(want.bearing, 0);
  expect(got.elevation, `${where} elevation`).toBeCloseTo(want.elevation, 0);
  expect(got.distance, `${where} distance`).toBeCloseTo(want.distance, 2);
  expect(got.fov, `${where} fov`).toBe(want.fov);
  expect(got.frame, `${where} frame`).toBe(want.frame);
  expect(got.coreFocus, `${where} coreFocus`).toBe(0);
};

describe('network shot conversion', () => {
  it.each(Object.keys(NET_SHOTS) as NetShotName[])('reads %s back from its keys in network terms', (name) => {
    const shot: NetShot = NET_SHOTS[name];
    const got = netShotOf(netShotKeys(shot));
    const target = netTarget(shot);
    got.target.forEach((v, k) => expect(v).toBeCloseTo(target[k], 9));
    expect(got.bearing).toBeCloseTo(shot.bearing, 9);
    expect(got.elevation).toBeCloseTo(shot.elevation, 9);
    expect(got.distance).toBeCloseTo(shot.distance, 9);
  });

  it('measures bearing from +z (0) toward +x (90), and distance in world units', () => {
    const base: NetShot = { target: [1, 2, 3], bearing: 0, elevation: 0, distance: 5, fov: 40, frame: 0 };
    const { center, radius } = anchors.whole;
    const world = (bearing: number) => netShotKeys({ ...base, bearing }).pos.map((v, k) => center[k] + v * radius);
    const p0 = world(0);
    const p90 = world(90);
    [1, 2, 8].forEach((v, k) => expect(p0[k]).toBeCloseTo(v, 9));
    [6, 2, 3].forEach((v, k) => expect(p90[k]).toBeCloseTo(v, 9));
  });

  it('resolves a stack id from the essay network, and `net` to the framing centre', () => {
    const net = essayNetwork();
    expect(netTarget({ target: 'N0' })).toEqual(net.nodes[nodeIndex(net, 'N0')].centre);
    // N0 is the first stack, at the origin: where the bike stands and reflows.
    expect(netTarget({ target: 'N0' })).toEqual([0, 0, 0]);
    expect(netTarget({ target: 'net' })).toEqual(NET_CENTRE);
  });

  it('starts Act II on Act I’s last shot, exactly', () => {
    const a = netShotKeys(NET_SHOTS.S10p);
    const b = shotKeys(SHOTS.S10p, anchors);
    for (const k of [0, 1, 2]) {
      expect(a.pos[k]).toBeCloseTo(b.pos[k], 12);
      expect(a.target[k]).toBeCloseTo(b.target[k], 12);
    }
    expect([a.fov, a.frame, a.coreFocus]).toEqual([b.fov, b.frame, b.coreFocus]);
  });
});

describe('the network shots in the keyframes', () => {
  it.each(HOLDS)('%s %s..%s holds %s (%s)', (section, from, to, name) => {
    for (let i = 0; i <= 10; i++) {
      const local = from + ((to - from) * i) / 10;
      close(NET_SHOTS[name], netShotOf(sampler.sample(at(section, local)).camera), `${section}@${local.toFixed(3)}`);
    }
  });

  it('carries each network shot as its rounded keys, pasted once', () => {
    for (const [section, from, , name] of HOLDS.filter(([, , , n]) => n !== 'S10p')) {
      const s = sampler.sample(at(section, from));
      const want = netShotKeyframe(NET_SHOTS[name]);
      // A waypoint's key sits at its local to 1e-8, so read it back to well within a rounding step.
      for (const k of [0, 1, 2]) {
        expect(s.camera.pos[k], `${name} at ${section}@${from}`).toBeCloseTo(want.pos[k], 6);
        expect(s.camera.target[k], `${name} at ${section}@${from}`).toBeCloseTo(want.target[k], 6);
      }
      expect(s.camera.fov, `${name} at ${section}@${from}`).toBeCloseTo(want.fov, 6);
    }
  });

  it('holds the camera exactly where Act I left it until zoom-out 0.02: the boundary does not move', () => {
    // Act I's last keys were rounded from S10p long ago; the hold repeats them, not a fresh rounding.
    const end = sampler.sample(at('spec', 1)).camera;
    for (const l of [0, 0.01, 0.02]) expect(sampler.sample(at('zoom-out', l)).camera, `zoom-out@${l}`).toEqual(end);
  });

  it('moves from S10′ to N1 over 0.02-0.50 and on to N2 over 0.50-1.00, never holding between', () => {
    const cam = (l: number) => sampler.sample(at('zoom-out', l)).camera.pos;
    const step = (a: number, b: number) => Math.hypot(...cam(a).map((v, k) => v - cam(b)[k]));
    for (const [a, b] of [
      [0.03, 0.04],
      [0.26, 0.27],
      [0.49, 0.495],
      [0.51, 0.52],
      [0.75, 0.76],
      [0.99, 0.995],
    ]) {
      expect(step(a, b), `zoom-out ${a}..${b}`).toBeGreaterThan(0);
    }
  });
});

/** The keyed camera, and the portrait rig's, in world units at global progress `p`. */
function cameras(p: number): { landscape: number[]; portrait: number[] } {
  const c = sampler.sample(p).camera;
  const { center, radius } = anchors.whole;
  const world = (v: readonly number[]) => v.map((x, k) => center[k] + x * radius);
  return { landscape: world(c.pos), portrait: world(portraitRig(c, 390 / 844).pos) };
}

const globalOf = (where: string): number => {
  const sep = where.lastIndexOf('@');
  return at(where.slice(0, sep), Number(where.slice(sep + 1)));
};

describe('the generated moves', () => {
  it.each(Object.keys(NET_MOVES) as NetMoveName[])('pastes %s as its generated keys, to 1e-3', (name) => {
    const tracks = (keyframes as unknown as KeyframeFile).tracks;
    const find = (path: string, where: string) => tracks[path].find((k) => k.at === where);
    const keys = splineKeys(NET_MOVES[name], spans);
    expect(keys.length).toBeGreaterThanOrEqual(NET_MOVES[name].keys);
    // And nothing else: inside the move every camera key is a generated one.
    const [a, b] = [globalOf(NET_MOVES[name].from), globalOf(NET_MOVES[name].to)];
    for (const path of ['camera.pos', 'camera.target', 'camera.fov']) {
      const inside = tracks[path].filter((k) => typeof k.at === 'string' && globalOf(k.at) > a && globalOf(k.at) <= b);
      expect(inside.map((k) => k.at), `${name} ${path}`).toEqual(keys.map((k) => k.at));
    }
    for (const k of keys) {
      const pos = find('camera.pos', k.at);
      const target = find('camera.target', k.at);
      const fov = find('camera.fov', k.at);
      expect(pos && target && fov, `${name} key at ${k.at}`).toBeTruthy();
      expect([pos?.ease, target?.ease, fov?.ease], `${name} at ${k.at}: linear`).toEqual([undefined, undefined, undefined]);
      (pos?.value as number[]).forEach((v, i) => expect(Math.abs(v - k.pos[i]), `${name} pos at ${k.at}`).toBeLessThanOrEqual(1e-3));
      (target?.value as number[]).forEach((v, i) => expect(Math.abs(v - k.target[i]), `${name} target at ${k.at}`).toBeLessThanOrEqual(1e-3));
      expect(Math.abs((fov?.value as number) - k.fov), `${name} fov at ${k.at}`).toBeLessThanOrEqual(1e-3);
    }
  });

  it('starts each move from the shot held before it and ends it on its last waypoint', () => {
    for (const [name, move] of Object.entries(NET_MOVES)) {
      const [first, last] = [move.waypoints[0], move.waypoints[move.waypoints.length - 1]];
      const before = netShotOf(sampler.sample(globalOf(move.from)).camera);
      const after = netShotOf(sampler.sample(globalOf(move.to)).camera);
      for (const [want, got, where] of [
        [first, before, move.from],
        [last, after, move.to],
      ] as const) {
        expect(got.distance, `${name} at ${where}`).toBeCloseTo(want.distance, 1);
        expect(got.elevation, `${name} at ${where}`).toBeCloseTo(want.elevation, 0);
      }
    }
  });

  it('circles the network in the orbit with its bearing always increasing', () => {
    let prev = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const b = netShotOf(sampler.sample(at('far', (0.92 * i) / 200)).camera).bearing;
      if (i > 0) expect(b, `far@${((0.92 * i) / 200).toFixed(4)}`).toBeGreaterThan(prev);
      prev = b;
    }
    expect(prev).toBeCloseTo(NET_SHOTS.N7p.bearing, 0);
  });

  it('never flies the camera through a plan or a rule: every move keeps 2 units clear of them, on both rigs', () => {
    // The design's dive passes six units above C1 so it never cuts through the middle layer (§3.9);
    // the page-turn moves are fast, and this keeps every one of them, and the rest, out of the stacks.
    const net = essayNetwork();
    for (const [name, move] of Object.entries(NET_MOVES)) {
      const [a, b] = [globalOf(move.from), globalOf(move.to)];
      for (let i = 0; i <= 400; i++) {
        const p = a + ((b - a) * i) / 400;
        const growth = sampler.sample(p).net.growth;
        for (const cam of Object.values(cameras(p))) {
          for (const n of net.nodes) {
            if (n.layer === 'code' || growth < n.born) continue;
            const gap = Math.hypot(cam[0] - n.centre[0], cam[1] - n.centre[1], cam[2] - n.centre[2]) - n.radius;
            expect(gap, `${name} at ${p.toFixed(5)}: ${n.id}`).toBeGreaterThanOrEqual(2);
          }
        }
      }
    }
  });

  it('drops onto C1 from over the middle layer: the dive and the pull-out pass a waypoint 2 units above every plan', () => {
    const net = essayNetwork();
    const planTop = Math.max(...net.nodes.filter((n) => n.layer === 'plan').map((n) => n.centre[1] + n.height / 2));
    const over = netShotKeys(NET_SHOTS.diveOver);
    expect(anchors.whole.center[1] + over.pos[1] * anchors.whole.radius).toBeGreaterThanOrEqual(planTop + 2);
    for (const name of ['dive', 'pullOut'] as const) {
      const passes = NET_MOVES[name].waypoints.some((w) => w.target === NET_SHOTS.diveOver.target && w.elevation === NET_SHOTS.diveOver.elevation);
      expect(passes, name).toBe(true);
    }
  });
});

describe('the page-turn moves against the story', () => {
  // Each move that crosses the text band leaves as its page starts to fade and stands on its
  // waypoint (the end, for the dive) as the next page is fully up. The times are pasted to 1e-4 of a
  // section; a re-timed page fails here before it can misalign a move with its page turn.
  const story = loadStory();
  /** Global progress where page `pi` of `section` starts to fade, and where the page after it is fully up. */
  const turn = (section: string, pi: number): [number, number] => {
    const si = story.findIndex((x) => x.id === section);
    const fade = fadeWidth(story[si].length);
    const fadeOut = at(section, pageOut(story[si].pages, pi) - fade);
    const next = story[si].pages[pi + 1];
    const nextIn = next ? at(section, next.beats[0].at + fadeWidth(story[si].length)) : at(story[si + 1].id, fadeWidth(story[si + 1].length));
    return [fadeOut, nextIn];
  };
  const tol = (section: string) => {
    const span = spans.find((x) => x.id === section);
    return 1e-4 * ((span?.end ?? 1) - (span?.start ?? 0));
  };
  it.each([
    ['rise', 'layers', 0, 1],
    ['drop', 'layers', 2, 1],
    ['pullBack', 'layers', 3, 1],
    ['dive', 'far', 0, 2],
    ['pullOut', 'defect', 0, 2],
  ] as const)('%s leaves as %s page %i fades and stands on waypoint %i as the next page is up', (name, section, pi, wi) => {
    const move = NET_MOVES[name];
    const [fadeOut, nextIn] = turn(section, pi);
    const [a, b] = [globalOf(move.from), globalOf(move.to)];
    expect(Math.abs(a - fadeOut), `${name} leaves`).toBeLessThanOrEqual(tol(section));
    const when = a + (b - a) * move.waypoints[wi].t;
    expect(Math.abs(when - nextIn), `${name} waypoint ${wi}`).toBeLessThanOrEqual(tol(section));
  });
});
