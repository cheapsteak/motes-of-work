import { describe, expect, it } from 'vitest';
import {
  atKeys,
  CLEAN_AFTER,
  CLEAN_WORK_FROM,
  FIX_TWELVE,
  G_TWELVE,
  HI_AT_BIRTH,
  HI_OUT,
  HI_TWELVE,
  REVIEW_VISITS,
  REVIEWER_KEYS,
  RING_OUT,
  SWEEP,
  TWELVE,
  whenKeys,
} from '../galaxy/schedule';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { AMBIENT_POSE } from '../galaxy/ambient';
import { bodyIndex, galaxyBudget, generateGalaxy, pieceOuter, type Body } from '../galaxy/generate';
import { OWN_FIXES } from '../galaxy/lineage';
import { feedAlpha, RING, ringAt, visitHold, type RingVisit } from '../galaxy/review';
import {
  NODE_FIX_WINDOW,
  NODE_FLARE_WIDTH,
  NODE_LAND_WINDOW,
  NODE_PULSE_WINDOW,
  NODE_HI_WINDOW,
  NODE_NEVER,
  NODE_SURGE_FROM,
  NODE_SURGE_MAX_HOP,
  NODE_SURGE_PER_HOP,
  NODE_SURGE_WINDOW,
} from '../scene/node/birth';
import { packBodyData } from '../scene/node/bodyData';
import { nodeLanded, nodeLight } from '../scene/node/light';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { fadeWidth, pageOut } from '../story/reveal';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import { Vector3 } from 'three';
import { bodyWorld } from '../scene/node/orbit';
import { lampGain } from '../scene/node/bodyMote';
import { BAND_MARGIN_PX, essayCamera, FEED_BEATS, LATE_MOVES, NET_MOVES, STREAM_BEATS, TEXT_BAND } from './netShots';
import { Lamp, lampFocusRow, trackIndex } from './netTrack';
import { autoStops, REST_EPSILON, REST_WINDOW_SCREENS, sceneMotion } from '../autoAdvance/plan';

// The galaxy's clocks through Act II, layers through lesson (design
// docs/specs/2026-10-06-act-2-storyboard-and-network.md §2.2-§2.10; tests 4, 5, 7 and 9 of §6; the
// galaxy's §14.4 and §15), keyed against the schedule the generator builds to (src/galaxy/schedule.ts),
// not against copies of its numbers, and held on the essay's galaxy.

const story = loadStory();
const spans = sectionSpans(story);
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
/** The galaxy's bodies that are pieces, plans and rules: a moon shares its planet's light, fix and birth window. */
const bodies = g.bodies.filter((b) => b.kind !== 'moon');
const at = (id: string, local: number): number => {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return span.start + local * (span.end - span.start);
};
const s = (id: string, local: number) => sampler.sample(at(id, local));
const node = (id: string): Body => g.bodies[bodyIndex(g, id)];
const lengthOf = (id: string): number => {
  const sec = story.find((x) => x.id === id);
  if (!sec) throw new Error(`no section ${id}`);
  return sec.length;
};
const steps = (a: number, b: number, n: number) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
const HALF = ['zoom-out', 'layers', 'far', 'defect'];
const SECOND_HALF = ['spread', 'reviewer', 'trace', 'fix', 'lesson'];
const ACT_II = [...HALF, ...SECOND_HALF];

describe('the growth clock and the stream clock, layers to defect', () => {
  it('grows by the storyboard, linear within each beat', () => {
    const rows: [string, number, number][] = [
      ['layers', 0, 0.12],
      // B1 and B2 are born and built under ly-1, while its shot holds P_a's system (Task 9): the
      // growth holds back over the move in, then runs to just past B2's build by ly-1's page turn.
      // Layers is 4.3 screens (the author deleted ly-6, and its 0.7 screens with it): these are 0.1,
      // 0.7, 1.8, 2.8, 3.4 and 3.6 screens in, and its end. The 3.4 key (Task 1d fix round 1) has
      // planet-10 half landed beside star-4 as ly-4's push-in on it ends (0.21 at 3.6 before).
      ['layers', 0.02325581, 0.121],
      ['layers', 0.1627907, 0.141],
      ['layers', 0.41860465, 0.165],
      ['layers', 0.65116279, 0.19],
      ['layers', 0.79069767, 0.2125],
      ['layers', 0.8372093, 0.215],
      ['layers', 1, 0.23],
      ['far', 1, 0.27],
      ['defect', 0.24, 0.3],
      ['defect', 0.46, 0.32],
      ['defect', 0.58, 0.335],
      ['defect', 0.78, G_TWELVE[0]],
      ['defect', 1, G_TWELVE[1]],
    ];
    for (const [id, l, g] of rows) expect(s(id, l).net.growth, `${id}@${l}`).toBeCloseTo(g, 12);
    // Linear: the midpoint of two keys is the mean of their values.
    for (let i = 1; i < rows.length; i++) {
      const [ia, la, ga] = rows[i - 1];
      const [ib, lb, gb] = rows[i];
      const mid = (at(ia, la) + at(ib, lb)) / 2;
      expect(sampler.sample(mid).net.growth, `between ${ia}@${la} and ${ib}@${lb}`).toBeCloseTo((ga + gb) / 2, 12);
    }
  });

  it('runs the stream clock at 1.3 a screen of scroll through every section, never holding', () => {
    for (const id of ACT_II) {
      expect(s(id, 1).clock - s(id, 0).clock, id).toBeCloseTo(1.3 * lengthOf(id), 9);
      for (const l of steps(0, 1, 50).slice(1)) expect(s(id, l).clock, `${id}@${l}`).toBeGreaterThan(s(id, l - 0.02).clock);
    }
  });

  it('keeps the network up and the bike reflowed, its own draw out, with no ring', () => {
    for (const id of ['layers', 'far', 'defect'])
      for (const l of steps(0, 1, 40)) {
        const x = s(id, l);
        expect([x.net.show, x.mech.reflow, x.stage.motes, x.net.review], `${id}@${l}`).toEqual([1, 1, 0, 0]);
      }
  });
});

describe('the schedule fence (test 5, for zoom-out to defect)', () => {
  it('never runs growth or the fix backwards, anywhere in the essay', () => {
    let prev = sampler.sample(0);
    for (const p of steps(0, 1, 8000).slice(1)) {
      const x = sampler.sample(p);
      expect(x.net.growth, `growth at ${p}`).toBeGreaterThanOrEqual(prev.net.growth);
      expect(x.net.fix, `fix at ${p}`).toBeGreaterThanOrEqual(prev.net.fix);
      prev = x;
    }
  });

  it('lights nothing before the defect is found: highlight 0 up to defect 0.60 (ruling: far is all one glow)', () => {
    for (const p of steps(0, at('defect', 0.6), 6000)) expect(sampler.sample(p).net.highlight, `at ${p}`).toBe(0);
  });

  it('reaches the twelve’s highlight before df-5 comes up and holds it to the end of the section', () => {
    const df5 = story.find((x) => x.id === 'defect')?.pages[1].beats[2];
    expect(df5?.id).toBe('df-5');
    expect(s('defect', 0.76).net.highlight).toBe(HI_TWELVE);
    for (const l of steps(0.76, 1, 120)) expect(s('defect', l).net.highlight, `defect@${l}`).toBe(HI_TWELVE);
    expect(0.76).toBeLessThan(df5?.at ?? 0);
  });

  it('mends C1 under df-2b, on the held frame, and nothing else in the section (freeze-frame §1.1)', () => {
    const c1 = node('C1').fixAt ?? NaN;
    // The next fix after C1's: R0's, under fx-1 (the second fix, C5's, is deleted; C5 is swept).
    const next = Math.min(...bodies.flatMap((n) => (n.fixAt !== null && n.fixAt > c1 ? [n.fixAt] : [])));
    expect(next).toBe(node('R0').fixAt);
    const df2b = beatAt('defect', 'df-2b');
    expect(df2b).toBe(0.36);
    // The fix's keys (the author on v25: the gold lands, then the piece glows, then it mends): 0 to
    // "So you fix it.", the person's motes falling 0.36-0.374 (home at nodeLanded), the pulse 0.374-0.388,
    // the mend 0.388-0.404 (C1 whole at 0.404, before the hold lets go at 0.405), FIX_TWELVE by 0.42.
    const fixKeys = (keyframes as unknown as KeyframeFile).tracks['net.fix'].filter((k) => typeof k.at === 'string' && k.at.startsWith('defect@'));
    const want: [string, number][] = [
      ['defect@0.36', 0],
      ['defect@0.374', nodeLanded(c1)],
      ['defect@0.388', c1 - NODE_FIX_WINDOW],
      ['defect@0.404', c1],
      ['defect@0.42', FIX_TWELVE],
    ];
    expect(fixKeys.map((k) => k.at)).toEqual(want.map(([at]) => at));
    fixKeys.forEach((k, i) => expect(k.value as number, String(k.at)).toBeCloseTo(want[i][1], 12));
    expect(nodeLanded(c1)).toBeCloseTo(c1 - NODE_FIX_WINDOW - NODE_PULSE_WINDOW, 12);
    for (const l of steps(0, df2b, 60)) expect(s('defect', l).net.fix, `defect@${l}`).toBe(0);
    for (const l of steps(0.42, 1, 60)) expect(s('defect', l).net.fix, `defect@${l}`).toBe(FIX_TWELVE);
    // C1's warm motes set out after df-2b comes up (a landing window before nodeLanded) and are home by
    // 0.374; it pulses to 0.388 and is mended by 0.404...
    expect(when('defect', (x) => x.net.fix, nodeLanded(c1) - NODE_LAND_WINDOW)).toBeGreaterThan(df2b);
    expect(when('defect', (x) => x.net.fix, nodeLanded(c1))).toBeCloseTo(0.374, 6);
    expect(when('defect', (x) => x.net.fix, c1 - NODE_FIX_WINDOW)).toBeCloseTo(0.388, 6);
    expect(when('defect', (x) => x.net.fix, c1)).toBeCloseTo(0.404, 6);
    // ...and the next fix's have not set out by the section's end.
    expect(FIX_TWELVE).toBeLessThan(next - NODE_FIX_WINDOW);
  });
});

describe('the twelve (test 4)', () => {
  it('lights exactly the twelve over the whole of df-5, with C1 and R0 dark', () => {
    const df5 = story.find((x) => x.id === 'defect')?.pages[1].beats[2].at ?? NaN;
    const want = [...TWELVE].sort();
    let checked = 0;
    for (let l = df5; l <= 1 + 1e-9; l += 0.002) {
      const x = s('defect', Math.min(1, l));
      expect(x.net.growth, `defect@${l}`).toBeGreaterThanOrEqual(G_TWELVE[0]);
      expect(x.net.growth, `defect@${l}`).toBeLessThanOrEqual(G_TWELVE[1]);
      const lit = bodies.filter((n) => nodeLight(n.fixAt ?? NODE_NEVER, n.hiAt ?? NODE_NEVER, n.hop ?? -1, x.net).hi >= 0.5);
      expect(lit.map((n) => n.id).sort(), `defect@${l.toFixed(3)}`).toEqual(want);
      // Every one of them is being built or built by then.
      for (const n of lit) expect(n.born, n.id).toBeLessThanOrEqual(x.net.growth);
      for (const id of ['C1', 'R0']) {
        const n = node(id);
        expect(nodeLight(n.fixAt ?? NODE_NEVER, n.hiAt ?? NODE_NEVER, n.hop ?? -1, x.net).hi, `${id} at defect@${l}`).toBe(0);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('shows the twelve under df-5 (re-pinned to the galaxy, Task 10): R0’s lineage lit, every one of the twelve lit by the lamp and in the frame under the band at both sizes, C1 and R0 not ember', () => {
    const df5 = beatAt('defect', 'df-5');
    let checked = 0;
    for (const l of steps(df5 + fadeOf('defect'), 1 - fadeOf('defect'), 12)) {
      const x = s('defect', l);
      expect([Math.round(x.net.lamp), g.bodies[lampFocusRow(Math.round(x.net.lampAt), g)].rule], `defect@${l}`).toEqual([Lamp.Lineage, node('R0').index]);
      const clocks = { lamp: Math.round(x.net.lamp), lampRow: lampFocusRow(Math.round(x.net.lampAt), g), focus: x.net.focus };
      for (const size of [
        { width: 390, height: 844 },
        { width: 1440, height: 900 },
      ]) {
        const camera = essayCamera(x.camera, g, data, size, AMBIENT_POSE);
        for (const id of TWELVE) {
          expect(lampGain(node(id).index, clocks, data), `${id} lit at defect@${l}`).toBe(1);
          const q = new Vector3(...bodyWorld(data, node(id).index, AMBIENT_POSE)).project(camera);
          const [px, py] = [((q.x + 1) / 2) * size.width, ((1 - q.y) / 2) * size.height];
          expect(px > 0 && px < size.width && q.z < 1, `${id} in the frame at defect@${l}, ${size.width}`).toBe(true);
          expect(py, `${id} under the band at defect@${l}, ${size.width}`).toBeGreaterThan(TEXT_BAND * size.height + BAND_MARGIN_PX);
          expect(py).toBeLessThan(size.height);
        }
      }
      for (const id of ['C1', 'R0']) expect(light(id, x).hi, `${id} at defect@${l}`).toBe(0);
      checked++;
    }
    expect(checked).toBe(13);
  });

  it('builds no other body carrying the defect before the line has gone', () => {
    const others = bodies.filter((n) => n.cracked && !(TWELVE as readonly string[]).includes(n.id) && n.id !== 'C1' && n.id !== 'R0');
    expect(Math.min(...others.map((n) => n.born))).toBeGreaterThan(G_TWELVE[1]);
  });
});

describe('the holds rule (test 9, over Act II)', () => {
  /** Stretches of at least 0.05 local where `value` holds, while the network shows. */
  function holds(id: string, value: (p: number) => number): { from: number; to: number; v: number }[] {
    const out: { from: number; to: number; v: number }[] = [];
    let start = 0;
    const ls = steps(0, 1, 2000);
    for (let i = 1; i <= ls.length; i++) {
      const same = i < ls.length && value(at(id, ls[i])) === value(at(id, ls[start]));
      if (same) continue;
      const [from, to] = [ls[start], ls[i - 1]];
      if (to - from >= 0.05 && sampler.sample(at(id, from)).net.show > 0) out.push({ from, to, v: value(at(id, from)) });
      start = i;
    }
    return out;
  }

  it('holds no growth key within a flare of a body’s landings, nor a fix key within a flare of a fix', () => {
    // Measured: 0.5 s on CI, 0.4 s alone, 4.7 s locally at load 12-22 beside the full suite (it ran out of
    // the default 5 s under load). 30 s is over 6 times the loaded time.
    // A body's builders land over [born, born + dur] (a moon's all at its birth).
    const landings = g.bodies.map((n) => [n.born, n.born + n.dur]);
    const fixes = bodies.flatMap((n) => (n.fixAt === null ? [] : [n.fixAt]));
    let fixHolds = 0;
    for (const id of ACT_II) {
      for (const h of holds(id, (p) => sampler.sample(p).net.growth)) {
        for (const [a, b] of landings) expect(h.v < a - NODE_FLARE_WIDTH || h.v > b + NODE_FLARE_WIDTH, `growth ${h.v} held in ${id}`).toBe(true);
      }
      for (const h of holds(id, (p) => sampler.sample(p).net.fix)) {
        fixHolds++;
        for (const f of fixes) expect(Math.abs(h.v - f), `fix ${h.v} held in ${id} ${h.from}-${h.to}`).toBeGreaterThan(NODE_FLARE_WIDTH);
      }
    }
    // Not vacuous: the fix holds at 0 before C1, at FIX_TWELVE after it (from the defect through the
    // trace), after each rule and at the end.
    expect(fixHolds).toBeGreaterThanOrEqual(8);
  }, 30_000);

  it('never holds the growth clock for a stretch, anywhere in Act II', () => {
    for (const id of ACT_II) expect(holds(id, (p) => sampler.sample(p).net.growth), id).toEqual([]);
  });
});

// ---- The second half, spread to lesson (§2.5-§2.10) ----

const fadeOf = (id: string): number => fadeWidth(lengthOf(id));
/** A beat's `at`, section-local. */
const beatAt = (section: string, beat: string): number => {
  const b = story
    .find((x) => x.id === section)
    ?.pages.flatMap((p) => p.beats)
    .find((x) => x.id === beat);
  if (!b) throw new Error(`no beat ${beat} in ${section}`);
  return b.at;
};
/** Where a beat is fully up, section-local. */
const upAt = (section: string, beat: string): number => beatAt(section, beat) + fadeOf(section);
type Clocks = { net: { fix: number; highlight: number } };
const lightOf = (n: Body, x: Clocks) => nodeLight(n.fixAt ?? NODE_NEVER, n.hiAt ?? NODE_NEVER, n.hop ?? -1, x.net);
const light = (id: string, x: Clocks) => lightOf(node(id), x);
/** The bodies lit at a state: born, and their highlight at least half up. */
const litAt = (x: Clocks & { net: { growth: number } }) => bodies.filter((n) => n.born <= x.net.growth && lightOf(n, x).hi >= 0.5);
/** The first section-local at which a clock that never decreases reaches `v`, to 1e-7. */
const when = (id: string, value: (x: ReturnType<typeof s>) => number, v: number): number => {
  if (value(s(id, 1)) < v) return Infinity;
  if (value(s(id, 0)) >= v) return 0;
  let [a, b] = [0, 1];
  while (b - a > 1e-7) {
    const m = (a + b) / 2;
    if (value(s(id, m)) >= v) b = m;
    else a = m;
  }
  return b;
};

/** Where growth reaches R1's birth under up-1, section-local in spread: 0.36 screens of its 2.808. */
const UP_ONE_R1 = 0.12820513;
/** Where up-2 comes up, as up-1's page goes: 1.44 screens into spread (the wordless second fix that played between them is deleted). */
const UP_TWO = 0.51282051;

describe('the growth clock, spread to lesson', () => {
  it('grows by the storyboard, linear within each beat', () => {
    const rows: [string, number, number][] = [
      ['defect', 1, G_TWELVE[1]],
      // R1 is born early under up-1 (not at 0.2, as the design's straight run had it), so the rule
      // that line names is forming, and lit, while the line is up (UP_ONE_R1 below).
      ['spread', UP_ONE_R1, node('R1').born],
      // Over up-1's page as before; then on under up-2 to the reviewer's 0.54 (it ran 0.42 -> 0.47
      // under the wordless second fix, which the author deleted).
      ['spread', UP_TWO, 0.42],
      ...REVIEWER_KEYS.growth.map(([l, g]): [string, number, number] => ['reviewer', l, g]),
      ['trace', 0.36, 0.63],
      ['trace', 1, 0.66],
      ['fix', 0.14, 0.67],
      ['fix', 0.4, 0.69],
      ['fix', 0.62, 0.76],
      ['fix', 1, 0.86],
      ['lesson', 1, 1],
    ];
    for (const [id, l, g] of rows) expect(s(id, l).net.growth, `${id}@${l}`).toBeCloseTo(g, 12);
    for (let i = 1; i < rows.length; i++) {
      const [ia, la, ga] = rows[i - 1];
      const [ib, lb, gb] = rows[i];
      const mid = (at(ia, la) + at(ib, lb)) / 2;
      expect(sampler.sample(mid).net.growth, `between ${ia}@${la} and ${ib}@${lb}`).toBeCloseTo((ga + gb) / 2, 12);
    }
  });

  it('keeps the network up and the bike reflowed, its own draw out, to the end', () => {
    for (const id of SECOND_HALF)
      for (const l of steps(0, 1, 40)) {
        const x = s(id, l);
        expect([x.net.show, x.mech.reflow, x.stage.motes], `${id}@${l}`).toEqual([1, 1, 0]);
      }
  });
});

describe('the reviewer’s ring (test 7, against the keyframes)', () => {
  it('carries the schedule’s reviewer keys exactly: the ring’s visits and the growth under them', () => {
    const tracks = (keyframes as unknown as KeyframeFile).tracks;
    const inReviewer = (path: string) =>
      tracks[path]
        .filter((k) => typeof k.at === 'string' && k.at.startsWith('reviewer@'))
        .map((k) => [Number((k.at as string).slice('reviewer@'.length)), k.value, k.ease ?? 'linear']);
    expect(inReviewer('net.review')).toEqual(REVIEWER_KEYS.review.map(([l, v]) => [l, v, 'linear']));
    expect(inReviewer('net.growth')).toEqual(REVIEWER_KEYS.growth.map(([l, v]) => [l, v, 'linear']));
  });

  it('moves the ring only in the reviewer section, holds it on the last visit with its feed up, and takes it away under the sweep', () => {
    // To 1e-12 at the key itself: its global progress is a sum of section lengths in floating point.
    for (const p of steps(0, at('reviewer', REVIEWER_KEYS.review[0][0]), 400)) expect(sampler.sample(p).net.review, `at ${p}`).toBeCloseTo(0, 12);
    for (const l of steps(0, 1, 200)) expect(s('reviewer', l).net.review, `reviewer@${l}`).toBeCloseTo(atKeys(REVIEWER_KEYS.review, l), 12);
    const last = REVIEWER_KEYS.review[REVIEWER_KEYS.review.length - 1][1];
    expect(RING_OUT[0][1]).toBe(last);
    for (const l of steps(0, 1, 20)) expect(s('trace', l).net.review, `trace@${l}`).toBe(last);
    for (const l of steps(0, 1, 200)) expect(s('fix', l).net.review, `fix@${l}`).toBeCloseTo(atKeys(RING_OUT, l), 12);
    // The ring and its feed are gone (review 2) by the end of the sweep and through the lesson.
    const visits: RingVisit[] = REVIEW_VISITS.map((id) => ({ row: bodyIndex(g, id), radius: pieceOuter(g, bodyIndex(g, id)) }));
    const ring = (review: number) => ringAt(review, visits, AMBIENT_POSE, data);
    expect(ring(s('fix', RING_OUT[0][0]).net.review).presence).toBe(1);
    expect(feedAlpha(s('fix', RING_OUT[0][0]).net.review)).toBe(1);
    for (const l of steps(RING_OUT[1][0], 1, 20)) expect(ring(s('fix', l).net.review).presence, `fix@${l}`).toBe(0);
    for (const l of steps(0, 1, 20)) {
      expect(ring(s('lesson', l).net.review).presence, `lesson@${l}`).toBe(0);
      expect(feedAlpha(s('lesson', l).net.review), `lesson@${l}`).toBe(0);
    }
    // It goes while the sweep runs, after fx-4 is up, so every stop stays at rest.
    expect(RING_OUT[0][0]).toBeGreaterThanOrEqual(upAt('fix', 'fx-4'));
  });

  it('lands each visit at least 80 % before the ring holds on it, the ring on it while it holds, and moves the ring continuously (test 7, as keyed, on P5)', () => {
    const visits: RingVisit[] = REVIEW_VISITS.map((id) => ({ row: bodyIndex(g, id), radius: pieceOuter(g, bodyIndex(g, id)) }));
    for (const [j, id] of REVIEW_VISITS.entries()) {
      const p = node(id);
      expect(g.bodies[p.star].id, `${id} is on P5`).toBe('P5');
      const [from, to] = visitHold(j, visits.length);
      // Growth never decreases, so the hold's first instant is the worst case.
      const start = when('reviewer', (x) => x.net.review, from);
      const end = when('reviewer', (x) => x.net.review, Math.min(to, 1));
      const built = (s('reviewer', start).net.growth - p.born) / p.dur;
      expect(Math.min(1, built), id).toBeGreaterThanOrEqual(0.8);
      // Over its hold the ring is on it (riding it at the ambient).
      for (const l of steps(start + 1e-6, end - 1e-6, 10)) {
        const ring = ringAt(s('reviewer', l).net.review, visits, AMBIENT_POSE, data);
        const q = bodyWorld(data, p.index, AMBIENT_POSE);
        expect(Math.hypot(ring.position[0] - q[0], ring.position[1] - q[1], ring.position[2] - q[2]), `${id} at reviewer@${l}`).toBeLessThan(1e-9);
      }
    }
    // Continuous: no jump between neighbouring samples beyond what the keyed crossing can carry it.
    const n = 4000;
    const longest = Math.max(
      ...visits.slice(1).map((v, j) => {
        const [a, b] = [bodyWorld(data, visits[j].row, AMBIENT_POSE), bodyWorld(data, v.row, AMBIENT_POSE)];
        return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      }),
    );
    let prev = ringAt(s('reviewer', 0).net.review, visits, AMBIENT_POSE, data);
    let travelled = 0;
    let worst = 0;
    for (let i = 1; i <= n; i++) {
      const [r0, r1] = [s('reviewer', (i - 1) / n).net.review, s('reviewer', i / n).net.review];
      const ring = ringAt(r1, visits, AMBIENT_POSE, data);
      const d = Math.hypot(...([0, 1, 2].map((k) => ring.position[k] - prev.position[k]) as [number, number, number]));
      // The crossing's smoothstep is at most 1.5 times as steep as a linear one over (1 − hold) of a visit's share.
      const bound = (longest * 1.5 * visits.length * Math.abs(r1 - r0)) / (1 - RING.hold) + 1e-9;
      worst = Math.max(worst, d / bound);
      travelled += d;
      prev = ring;
    }
    expect(worst).toBeLessThanOrEqual(1);
    expect(travelled, 'the ring does travel').toBeGreaterThan(longest);
  });

  it('changes nothing it passes over: the highlight and the fix hold through the whole section', () => {
    for (const l of steps(0, 1, 200)) {
      expect(s('reviewer', l).net.highlight, `reviewer@${l}`).toBe(HI_AT_BIRTH);
      expect(s('reviewer', l).net.fix, `reviewer@${l}`).toBe(s('reviewer', 0).net.fix);
    }
  });
});

describe('the spread (§2.5)', () => {
  it('lights R1 under up-1, before its page goes, and every new stack carrying the defect from then on', () => {
    expect(light('R1', s('defect', 1)).hi, 'R1 dark at the twelve').toBe(0);
    const pages = story.find((x) => x.id === 'spread')?.pages ?? [];
    const pageGone = pageOut(pages, 0) - fadeOf('spread');
    expect(light('R1', s('spread', pageGone)).hi, 'R1 lit while up-1 is whole').toBe(1);
    // The design keyed this at 0.38, as up-1's page fades; it is keyed as R1 forms, so the rule is
    // lit while up-1 says the defect is in the rules.
    const from = when('spread', (x) => x.net.highlight, HI_AT_BIRTH);
    expect(from, 'lit at birth before up-1 is gone').toBeLessThanOrEqual(pageOut(pages, 0));
    for (const l of steps(from, 1, 100)) expect(s('spread', l).net.highlight, `spread@${l}`).toBe(HI_AT_BIRTH);
  });

  it('has R1 forming and lit, and its up-stream running, by the middle of up-1', () => {
    const pages = story.find((x) => x.id === 'spread')?.pages ?? [];
    const mid = (pages[0].beats[0].at + fadeOf('spread') + (pageOut(pages, 0) - fadeOf('spread'))) / 2;
    const x = s('spread', mid);
    const r1 = node('R1');
    const built = (x.net.growth - r1.born) / r1.dur;
    expect(built, 'R1 forming').toBeGreaterThan(0.1);
    expect(built, 'R1 still forming').toBeLessThan(1);
    expect(light('R1', x).hi, 'R1 lit').toBe(1);
    expect(when('spread', (y) => y.net.growth, r1.born), 'born before the middle of up-1').toBeLessThan(mid - 0.05);
  });

  // Retired with the wordless second fix (the author, 2026-10-09: redundant): "mends C5, one of the
  // twelve, in the wordless stretch" pinned a fix that no longer plays. In its place: nothing is mended
  // between C1 and R0, and C5 is swept with the rest.
  it('mends nothing from the defect to the fix section: net.fix holds at FIX_TWELVE through spread, the reviewer and the trace', () => {
    for (const id of ['spread', 'reviewer', 'trace'])
      for (const l of steps(0, id === 'trace' ? LATE_MOVES.toFix.from[1] : 1, 80)) expect(s(id, l).net.fix, `${id}@${l}`).toBe(FIX_TWELVE);
    // C5, one of the twelve, has no fix of its own any more: the sweep mends it under fx-4.
    expect(TWELVE).toContain('C5');
    expect(OWN_FIXES as readonly string[]).not.toContain('C5');
    expect(node('C5').fixAt ?? NaN).toBeGreaterThanOrEqual(SWEEP[0]);
    expect(node('C5').fixAt ?? NaN).toBeLessThanOrEqual(SWEEP[1]);
  });

  it('lights more under up-2 than when it came up, as fast as they are made, with the one mended piece dark', () => {
    const [a, b] = [s('spread', upAt('spread', 'up-2')), s('spread', 1)];
    expect(litAt(b).length).toBeGreaterThan(litAt(a).length);
    for (const x of [a, b]) {
      expect(light('C1', x).hi, 'C1').toBe(0);
      // C5 is no longer mended here: lit among the rest.
      expect(light('C5', x).hi, 'C5').toBe(1);
    }
  });
});

describe('the climb, the fan-out and the fixes (§2.7, §2.8)', () => {
  it('leaves R0 dark until the climb is over, and lights it under tr-2', () => {
    const r0 = node('R0').hiAt ?? NaN;
    const lit = when('trace', (x) => x.net.highlight, r0 - NODE_HI_WINDOW);
    for (const p of steps(0, at('trace', lit - 1e-6), 4000)) expect(light('R0', sampler.sample(p)).hi, `at ${p}`).toBe(0);
    expect(lit, 'not before tr-2 is up').toBeGreaterThanOrEqual(upAt('trace', 'tr-2'));
    expect(light('R0', s('trace', 0.5)).hi).toBe(1);
  });

  it('surges out from R0 hop by hop under tr-2, every carrier lit by the end, the mended ones not', () => {
    const hops = new Set(bodies.flatMap((n) => (n.hop !== null && n.hop > 0 ? [Math.min(n.hop, NODE_SURGE_MAX_HOP)] : [])));
    expect([...hops].sort()).toEqual([1, 2, 3, 4, 5, 6]);
    // Hop 1 starts once tr-2 is up (its own pull-back is Task 11's to key), and each hop after the one before it.
    let prev = upAt('trace', 'tr-2');
    for (let h = 1; h <= NODE_SURGE_MAX_HOP; h++) {
      const start = when('trace', (x) => x.net.highlight, NODE_SURGE_FROM + NODE_SURGE_PER_HOP * h - NODE_SURGE_WINDOW);
      expect(start, `hop ${h}`).toBeGreaterThanOrEqual(prev);
      prev = start;
    }
    const end = s('trace', 0.92);
    for (const n of bodies) {
      if (n.hop === null) continue;
      // The mended one stays dark (ruling: the surge is multiplied by 1 - fixed): C1.
      expect(lightOf(n, end).surge, n.id).toBe(n.id === 'C1' ? 0 : 1);
    }
  });

  it('mends R0 under fx-1 and R1 under fx-2, each while its own line is up', () => {
    for (const [id, beat, next] of [
      ['R0', 'fx-1', 'fx-2'],
      ['R1', 'fx-2', 'fx-3'],
    ] as const) {
      const f = node(id).fixAt ?? NaN;
      expect(when('fix', (x) => x.net.fix, f - NODE_FIX_WINDOW), `${id} sets out`).toBeGreaterThanOrEqual(upAt('fix', beat));
      expect(when('fix', (x) => x.net.fix, f), `${id} lands`).toBeLessThanOrEqual(beatAt('fix', next));
    }
    // R0's land mid-hold (the shot pass: at fix 0.12-0.13 they landed as the camera left), the jump to
    // 0.42 over the page turn crossing no fix.
    expect(when('fix', (x) => x.net.fix, node('R0').fixAt ?? NaN)).toBeLessThan(0.1);
    expect(bodies.filter((n) => n.fixAt !== null && n.fixAt > FIX_TWELVE && n.fixAt <= 0.42 + NODE_FIX_WINDOW)).toEqual([]);
  });

  it('builds clean from the moment R0 is whole: the growth there is CLEAN_AFTER (test 5)', () => {
    const l = when('fix', (x) => x.net.fix, node('R0').fixAt ?? NaN);
    const g = s('fix', l).net.growth;
    expect(Math.abs(g - CLEAN_AFTER)).toBeLessThanOrEqual(0.01);
    for (const n of bodies) if (n.born >= g) expect(n.cracked, n.id).toBe(false);
  });

  it('builds the first new work from the fixed rules under fx-3, both rules whole by then (test 5)', () => {
    const rules = ['R0', 'R1'].map((id) => node(id).index);
    const fresh = bodies.filter((n) => !n.cracked && n.parents.some((p) => rules.includes(p)));
    expect(fresh.length).toBeGreaterThan(0);
    const first = Math.min(...fresh.map((n) => n.born));
    expect(first).toBeGreaterThanOrEqual(CLEAN_WORK_FROM);
    expect(s('fix', beatAt('fix', 'fx-3')).net.growth).toBeLessThanOrEqual(first);
    expect(s('fix', when('fix', (x) => x.net.growth, first)).net.fix).toBeGreaterThanOrEqual(node('R1').fixAt ?? NaN);
  });

  it('sweeps every other body under fx-4, and puts out what is left', () => {
    const swept = bodies.filter((n) => n.fixAt !== null && n.fixAt >= SWEEP[0]);
    expect(swept.length).toBeGreaterThan(30); // 38 on the essay galaxy (moons share their planet’s fix)
    for (const n of swept) {
      expect(when('fix', (x) => x.net.fix, (n.fixAt ?? NaN) - NODE_FIX_WINDOW), n.id).toBeGreaterThanOrEqual(upAt('fix', 'fx-4'));
      expect(n.fixAt ?? NaN, n.id).toBeLessThanOrEqual(SWEEP[1]);
    }
    expect(s('fix', 0.96).net.fix).toBe(1);
    // Every body is mended by 0.92, and the highlight's last fade puts out anything left by 0.96,
    // before fx-4's stop, so that stop is at rest (§6 test 6).
    for (const l of steps(0.92, 1, 20)) expect(litAt(s('fix', l)), `fix@${l}`).toEqual([]);
    for (const l of steps(0, 1, 200)) expect(s('fix', l).net.highlight, `fix@${l}`).toBeCloseTo(atKeys(HI_OUT, l), 12);
    for (const l of steps(HI_OUT[1][0], 1, 20)) expect(s('fix', l).net.highlight).toBe(0);
  });

  it('ends the act whole and clean: nothing lit and every body mended through the lesson', () => {
    for (const l of steps(0, 1, 40)) {
      const x = s('lesson', l);
      expect([x.net.fix, x.net.highlight], `lesson@${l}`).toEqual([1, 0]);
      expect(litAt(x), `lesson@${l}`).toEqual([]);
    }
    expect(s('lesson', 1).net.growth).toBe(1);
  });

  it('lights nothing new while the highlight climbs from the twelve to R0: no hiAt lies between', () => {
    const between = bodies.filter((n) => n.hiAt !== null && n.hiAt > HI_AT_BIRTH && n.hiAt < NODE_SURGE_FROM - NODE_HI_WINDOW);
    expect(between).toEqual([]);
  });
});

// ---- Galaxy §15.1: the streams follow the story ----

/** The Act II sections keyed on the galaxy so far (each later keyframe task adds its own). */
const KEYED_SECTIONS = ['zoom-out', 'layers', 'far', 'defect', 'spread', 'reviewer', 'trace', 'fix', 'lesson'];

/** The middle of a beat's hold: from where it is fully up to where the next beat (or its page's end) starts to come. */
function holdMiddle(section: string, beat: string): number {
  const sec = story.find((x) => x.id === section);
  if (!sec) throw new Error(`no section ${section}`);
  const pi = sec.pages.findIndex((p) => p.beats.some((b) => b.id === beat));
  const beats = sec.pages[pi].beats;
  const bi = beats.findIndex((b) => b.id === beat);
  const end = bi + 1 < beats.length ? beats[bi + 1].at : pageOut(sec.pages, pi);
  return (beats[bi].at + fadeOf(section) + end) / 2;
}

describe('the streams follow the story (galaxy §15.1)', () => {
  it('names only beats the story has', () => {
    const ids = new Set(story.flatMap((x) => x.pages.flatMap((p) => p.beats.map((b) => b.id))));
    for (const id of [...STREAM_BEATS, ...FEED_BEATS]) expect(ids.has(id), id).toBe(true);
    // The author's ruling (Task 11): under re-3 the feed is the subject, alone; the lineage is down.
    expect(STREAM_BEATS).not.toContain('re-3');
    expect(FEED_BEATS).toContain('re-3');
  });

  it('runs each leaf up under its beats keyed so far and keeps it down under every other: `net.streams` the lineage beats, `net.feed` the feed’s', () => {
    let checked = 0;
    for (const section of KEYED_SECTIONS) {
      const sec = story.find((x) => x.id === section)!;
      for (const b of sec.pages.flatMap((p) => p.beats)) {
        const { streams, feed } = s(section, holdMiddle(section, b.id)).net;
        for (const [leaf, v, beats] of [
          ['streams', streams, STREAM_BEATS],
          ['feed', feed, FEED_BEATS],
        ] as const) {
          if ((beats as readonly string[]).includes(b.id)) expect(v, `${b.id}: net.${leaf}`).toBeGreaterThanOrEqual(0.99);
          else expect(v, `${b.id}: net.${leaf}`).toBeLessThanOrEqual(0.01);
        }
        checked++;
      }
    }
    expect(checked).toBe(26);
  });

  it('holds the stream from the core under ly-5 until its page starts to fade, and has it gone by the turn into far', () => {
    // ly-5 is the section's last line (the author deleted ly-6): its stream goes with its page.
    const fade = fadeOf('layers');
    // From where ly-5 is full ink (to 1e-7: its at is written to 8 places) to where its page starts to fade.
    for (const l of steps(upAt('layers', 'ly-5'), 1 - fade, 40)) expect(s('layers', l).net.streams, `layers@${l}`).toBeCloseTo(1, 6);
    expect(s('layers', 1).net.streams).toBe(0);
    for (const l of steps(0, 1, 80)) expect(s('far', l).net.streams, `far@${l}`).toBe(0);
  });

  it('keeps the streams down through the whole zoom-out, not just its holds', () => {
    for (const l of steps(0, 1, 400)) expect(s('zoom-out', l).net.streams, `zoom-out@${l}`).toBe(0);
    // To its very last frame: ly-1's fade-in starts a thousandth after the boundary, so a frame a
    // hair past it (as a page reads the zoom-out's end) draws no stream.
    expect(sampler.sample(at('zoom-out', 1) + 1e-9).net.streams).toBe(0);
  });
});

// ---- Test 6, re-pinned for layers and far (Task 9): the stops ----

describe('the stops in layers and far (test 6)', () => {
  const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
  const screens = story.reduce((n, x) => n + x.length, 0);
  const ids = (section: string) => story.find((x) => x.id === section)!.pages.flatMap((p) => p.beats.map((b) => b.id));
  /** The largest change of any motion leaf (sceneMotion: the camera, the ride, the network's story clocks, the streams) over the rest window before `p`. */
  const lastChange = (p: number) => {
    const at = sceneMotion(sampler.sample(p));
    let worst = 0;
    for (let k = 1; k <= 40; k++) {
      const before = sceneMotion(sampler.sample(p - (REST_WINDOW_SCREENS / screens) * (k / 40)));
      worst = Math.max(worst, ...at.map((v, i) => Math.abs(v - before[i])));
    }
    return worst;
  };

  it('has one stop per scene', () => {
    for (const section of ['layers', 'far']) {
      const span = spans.find((x) => x.id === section)!;
      const mine = stops.filter((x) => x.from >= span.start - 1e-12 && x.from < span.end - 1e-12).map((x) => x.id);
      expect(mine, section).toEqual(ids(section));
    }
    expect(ids('layers')).toEqual(['ly-1', 'ly-2', 'ly-3', 'ly-4', 'ly-5']);
  });

  it('is at rest at every layers and far stop, in every motion leaf, net.streams included', () => {
    const mine = stops.filter((x) => [...ids('layers'), ...ids('far')].includes(x.id));
    expect(mine.map((x) => x.id)).toEqual([...ids('layers'), ...ids('far')]);
    for (const stop of mine) expect(lastChange(stop.progress), stop.id).toBeLessThan(REST_EPSILON);
    // Not vacuous: the streams are among the leaves, and they move between ly-5's stop and fr-1's.
    // ly-5's stop is the instant the move into far leaves (as every page-turn move's scene), where its
    // stream has just begun to go with the page: at rest, within a rest window of it.
    const [five, far] = ['ly-5', 'fr-1'].map((id) => mine.find((x) => x.id === id)!);
    expect(sampler.sample(five.progress).net.streams).toBeGreaterThan(1 - REST_EPSILON);
    expect(sampler.sample(far.progress).net.streams).toBe(0);
  });
});

// ---- Test 6, re-pinned for defect and spread (Task 10): the stops ----

describe('the stops in defect and spread (test 6)', () => {
  const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
  const screens = story.reduce((n, x) => n + x.length, 0);
  const ids = (section: string) => story.find((x) => x.id === section)!.pages.flatMap((p) => p.beats.map((b) => b.id));
  const localOf = (id: string, p: number) => {
    const span = spans.find((x) => x.id === id)!;
    return (p - span.start) / (span.end - span.start);
  };
  const stop = (id: string) => stops.find((x) => x.id === id)!;
  const lastChange = (p: number) => {
    const here = sceneMotion(sampler.sample(p));
    let worst = 0;
    for (let k = 1; k <= 40; k++) {
      const before = sceneMotion(sampler.sample(p - (REST_WINDOW_SCREENS / screens) * (k / 40)));
      worst = Math.max(worst, ...here.map((v, i) => Math.abs(v - before[i])));
    }
    return worst;
  };

  it('has one stop per scene', () => {
    for (const section of ['defect', 'spread']) {
      const span = spans.find((x) => x.id === section)!;
      const mine = stops.filter((x) => x.from >= span.start - 1e-12 && x.from < span.end - 1e-12).map((x) => x.id);
      expect(mine, section).toEqual(ids(section));
    }
    expect([...ids('defect'), ...ids('spread')]).toEqual(['df-1', 'df-2', 'df-2b', 'df-3', 'df-4', 'df-5', 'up-1', 'up-2']);
  });

  it('stops the defect’s first page at freeze-frame §1.1’s places: df-1 at 0.238, df-2 at 0.358, df-2b as the pull-out leaves', () => {
    expect(Math.abs(localOf('defect', stop('df-1').progress) - 0.238)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(localOf('defect', stop('df-2').progress) - 0.358)).toBeLessThanOrEqual(0.002);
    // df-2b: §1.1 has it at ≈ 0.437, "before the pull-out leaves". The pull-out leaves at 0.4392, where
    // page 7 starts to fade, so plan.ts stops the scene at the last point at rest before it (as every
    // page-turn move's scene), a hair past 0.4392: within a rest window of it, never before the text's end.
    const fade = 0.1 / 4.8;
    const leaves = NET_MOVES.pullOut.from[1];
    const at = localOf('defect', stop('df-2b').progress);
    expect(at).toBeGreaterThanOrEqual(leaves - 0.01 / 4.8 - 1e-9);
    expect(at).toBeLessThanOrEqual(leaves + REST_WINDOW_SCREENS / 4.8);
    expect(leaves).toBeCloseTo(beatAt('defect', 'df-3') - fade, 7);
    // The freeze's cut is after df-1's stop and df-2 is up; its release before df-2b's stop.
    expect(localOf('defect', stop('df-1').progress)).toBeLessThan(0.2605);
  });

  it('is at rest at every defect and spread stop, in every motion leaf', () => {
    for (const id of [...ids('defect'), ...ids('spread')]) expect(lastChange(stop(id).progress), id).toBeLessThan(REST_EPSILON);
  });

  // Retired: "plays the wordless second fix between up-1's stop and up-2's" (the author deleted the
  // second fix, 2026-10-09: redundant). up-1 now ends as the move to up-2 leaves, as every page-turn
  // move's scene does.
  it('stops up-1 as the move to up-2 leaves, on its page turn', () => {
    const leaves = at('spread', NET_MOVES.toHood.from[1]);
    expect(stop('up-1').ends).toBe('motion');
    expect(stop('up-1').progress).toBeGreaterThanOrEqual(leaves - 0.01 / screens - 1e-12);
    expect(stop('up-1').progress).toBeLessThanOrEqual(leaves + REST_WINDOW_SCREENS / screens);
  });
});

// ---- No Act II section holds PROVISIONAL (Task 11) ----

describe('every Act II section is keyed on the galaxy (Task 11)', () => {
  it('no section uses PROVISIONAL: it is gone, and every beat holds a shot of its own, keyed as generated', async () => {
    const shots = await import('./netShots');
    expect(Object.keys(shots)).not.toContain('PROVISIONAL');
    // The old hold: the neighbourhood from 390 (610 on a landscape screen), lamp 3. No Act II beat's
    // camera stands there, and every one is the generated frame of its section (actTwoFrame).
    const hood = trackIndex({ hood: true });
    let checked = 0;
    for (const section of ACT_II.slice(1)) {
      for (const b of story.find((x) => x.id === section)!.pages.flatMap((p) => p.beats)) {
        const l = holdMiddle(section, b.id);
        const x = s(section, l);
        const want = shots.actTwoFrame([section, l], g);
        const pos = shots.poseCamera(want.pose).pos;
        x.camera.pos.forEach((v, k) => expect(Math.abs(v - pos[k]), `${b.id}`).toBeLessThan(0.02 * Math.hypot(...pos) + 1e-3));
        const parked = x.camera.track.a === hood && x.camera.track.b === hood && Math.abs(want.pose.distance - 390) < 1;
        expect(parked, `${b.id} holds the old neighbourhood shot`).toBe(false);
        checked++;
      }
    }
    expect(checked).toBe(story.filter((x) => ACT_II.slice(1).includes(x.id)).flatMap((x) => x.pages.flatMap((p) => p.beats)).length);
  });
});

// ---- Test 6, re-pinned for the later sections (Task 11): the stops ----

describe('the stops in reviewer, trace, fix and lesson (test 6)', () => {
  const SECTIONS = ['reviewer', 'trace', 'fix', 'lesson'];
  const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
  const screens = story.reduce((n, x) => n + x.length, 0);
  const ids = (section: string) => story.find((x) => x.id === section)!.pages.flatMap((p) => p.beats.map((b) => b.id));
  const stop = (id: string) => stops.find((x) => x.id === id)!;
  const localOf = (id: string, p: number) => {
    const span = spans.find((x) => x.id === id)!;
    return (p - span.start) / (span.end - span.start);
  };
  const lastChange = (p: number) => {
    const here = sceneMotion(sampler.sample(p));
    let worst = 0;
    for (let k = 1; k <= 40; k++) {
      const before = sceneMotion(sampler.sample(p - (REST_WINDOW_SCREENS / screens) * (k / 40)));
      worst = Math.max(worst, ...here.map((v, i) => Math.abs(v - before[i])));
    }
    return worst;
  };

  it('has one stop per scene', () => {
    for (const section of SECTIONS) {
      const span = spans.find((x) => x.id === section)!;
      const mine = stops.filter((x) => x.from >= span.start - 1e-12 && x.from < span.end - 1e-12).map((x) => x.id);
      expect(mine, section).toEqual(ids(section));
    }
  });

  it('is at rest at every stop, in every motion leaf, the feed’s among them', () => {
    for (const id of SECTIONS.flatMap(ids)) expect(lastChange(stop(id).progress), id).toBeLessThan(REST_EPSILON);
    // Not vacuous: the feed is up at re-3's stop and was down at re-2's.
    expect(sampler.sample(stop('re-3').progress).net.feed).toBe(1);
    expect(sampler.sample(stop('re-2').progress).net.feed).toBe(0);
  });

  it('stops re-3 after the pull-back to the hub has landed, as the climb leaves; tr-2 after the surge, as the move into fix leaves', () => {
    expect(localOf('reviewer', stop('re-3').progress)).toBeGreaterThan(LATE_MOVES.toHub.until[1]);
    expect(localOf('reviewer', stop('re-3').progress)).toBeLessThanOrEqual(LATE_MOVES.climb.from[1] + REST_WINDOW_SCREENS / 3.2);
    expect(localOf('trace', stop('tr-2').progress)).toBeGreaterThan(0.92);
    expect(sampler.sample(stop('tr-2').progress).net.highlight, 'the surge has run').toBe(1);
  });

  it('stops fx-3 as fx-4’s streams start to come up, and fx-4 after the sweep, at rest, as the move into lesson leaves', () => {
    const fade = 0.1 / 4.6;
    expect(localOf('fix', stop('fx-3').progress)).toBeGreaterThan(LATE_MOVES.toNew.until[1]);
    expect(localOf('fix', stop('fx-3').progress)).toBeLessThanOrEqual(0.62 - fade + REST_WINDOW_SCREENS / 4.6);
    expect(localOf('fix', stop('fx-4').progress)).toBeGreaterThan(0.96);
    expect(sampler.sample(stop('fx-4').progress).net.fix, 'the sweep has run').toBe(1);
    expect(stop('ls-1').progress, 'the essay ends on the lesson').toBe(1);
  });
});

// ---- The freeze frame's keys (freeze-frame §1.1, §1.3, §3.2, §4; Task 12) ----

describe('the freeze frame’s leaves (Task 12)', () => {
  const FREEZE_PATHS = ['freeze.hold', 'freeze.dress', 'freeze.flash', 'camera.roll'] as const;
  const leaf = (x: ReturnType<typeof s>, path: (typeof FREEZE_PATHS)[number]) =>
    path === 'camera.roll' ? x.camera.roll : x.freeze[path.split('.')[1] as 'hold' | 'dress' | 'flash'];
  const defect = spans.find((x) => x.id === 'defect')!;
  const localOf = (p: number) => (p - defect.start) / (defect.end - defect.start);
  const file = keyframes as unknown as KeyframeFile;

  it('are 0 everywhere outside defect 0.260–0.421, and keyed only there', () => {
    for (let i = 0; i <= 4000; i++) {
      const p = i / 4000;
      const l = localOf(p);
      if (l >= 0.26 && l <= 0.421) continue;
      const x = sampler.sample(p);
      for (const path of FREEZE_PATHS) expect(leaf(x, path), `${path} at ${p}`).toBe(0);
    }
    for (const path of FREEZE_PATHS) {
      for (const k of file.tracks[path]) {
        const [id, l] = String(k.at).split('@');
        expect(id, path).toBe('defect');
        expect(Number(l), path).toBeGreaterThanOrEqual(0.2595);
        expect(Number(l), path).toBeLessThanOrEqual(0.421);
      }
    }
    // Not vacuous: inside, each is up somewhere.
    for (const path of FREEZE_PATHS) expect(steps(0.26, 0.421, 400).some((l) => leaf(s('defect', l), path) > 0), path).toBe(true);
  });

  it('are up only in a focused frame, and over no stream or feed: the clock the hold substitutes shows only where net.focus is 1, and the dressing never needs to dim a stream', () => {
    // Measured: 0.3 s on CI and alone, 2.9 s locally at load 12-22 beside the full suite (it ran out of the
    // default 5 s under load). 30 s is 10 times the loaded time.
    // Every freeze term is times net.focus in the shaders, and the forced scatter is gated by it
    // (bodySystem.ts); the hold's clock is not (main.ts reads the pin whenever the hold is up), and the
    // stream shader takes no dressing. The keys make both safe: this holds them to it.
    let up = 0;
    for (const l of steps(0, 1, 40000)) {
      const x = s('defect', l);
      if (!FREEZE_PATHS.some((path) => leaf(x, path) !== 0)) continue;
      up++;
      expect([x.net.focus, x.net.streams, x.net.feed], `defect ${l}`).toEqual([1, 0, 0]);
    }
    expect(up).toBeGreaterThan(6000);
  }, 30_000);

  it('holds the cut as a step: hold is 0 or 1 at every key and at every sample, up over 0.2605–0.405', () => {
    for (const k of file.tracks['freeze.hold']) expect([0, 1]).toContain(k.value);
    for (const l of steps(0.2, 0.45, 2500)) expect([0, 1], `hold at ${l}`).toContain(s('defect', l).freeze.hold);
    expect(s('defect', 0.2604).freeze.hold).toBe(0);
    expect(s('defect', 0.2605).freeze.hold).toBe(1);
    expect(s('defect', 0.4049).freeze.hold).toBe(1);
    expect(s('defect', 0.405).freeze.hold).toBe(0);
    // The dressing and the roll are at rest through the held frame, the roll at FREEZE_ROLL.
    for (const l of steps(0.292, 0.405, 20)) expect([s('defect', l).freeze.dress, s('defect', l).camera.roll]).toEqual([1, 4]);
  });

  it('flashes once, on the cut: one pulse no wider than 0.005 of the section, peak 1, and no stop inside it', () => {
    // Measured: 0.4 s on CI and alone, 2.8 s locally at load 12-22 beside the full suite (it ran out of the
    // default 5 s under load). 30 s is 10 times the loaded time.
    const fl = steps(0, 1, 40000).map((l) => s('defect', l).freeze.flash);
    const on = fl.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    expect(on.length).toBeGreaterThan(0);
    // One run of samples above 0.
    expect(on[on.length - 1] - on[0] + 1).toBe(on.length);
    expect((on.length + 1) / 40000).toBeLessThanOrEqual(0.005);
    expect(Math.max(...fl)).toBe(1);
    const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
    expect(stops.filter((x) => x.progress < defect.end && localOf(x.progress) >= 0.26 && localOf(x.progress) <= 0.264)).toEqual([]);
  }, 30_000);

  it('stops where freeze-frame §1.3 has it: df-1 at 0.238, df-2 at 0.358, df-2b as the pull-out leaves; none on the cut, the snap or the release', () => {
    const stops = autoStops(story, spans, (p) => sceneMotion(sampler.sample(p)));
    const mine = stops.filter((x) => x.progress > defect.start && x.progress < at('defect', 0.46)).map((x) => localOf(x.progress));
    expect(mine).toHaveLength(3);
    expect(Math.abs(mine[0] - 0.238)).toBeLessThanOrEqual(0.002);
    expect(Math.abs(mine[1] - 0.358)).toBeLessThanOrEqual(0.002);
    // df-2b as built (Ruling 3): the last point at rest before the page turns, a hair past the pull-out's
    // start at 0.4392, within a rest window of it; the dressing has been gone since 0.421.
    const leaves = NET_MOVES.pullOut.from[1];
    expect(mine[2]).toBeGreaterThanOrEqual(leaves - 0.01 / 4.8 - 1e-9);
    expect(mine[2]).toBeLessThanOrEqual(leaves + REST_WINDOW_SCREENS / 4.8);
    for (const [a, b] of [
      [0.26, 0.292],
      [0.37, 0.405],
      [0.405, 0.421],
    ])
      for (const l of mine) expect(l >= a && l <= b, `a stop at ${l} inside [${a}, ${b}]`).toBe(false);
    // The freeze's leaves are in sceneMotion: the dressing's snap and the release move it.
    const motion = (l: number) => sceneMotion(s('defect', l));
    expect(motion(0.27)).not.toEqual(motion(0.25));
    expect(motion(0.413)).not.toEqual(motion(0.43));
  });
});
