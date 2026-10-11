import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { bodyIndex, galaxyBudget, generateGalaxy } from '../galaxy/generate';
import { packBodyData } from '../scene/node/bodyData';
import { bodyWorld, galacticToWorld, GALAXY_TURN_PERIOD, galaxyTurn } from '../scene/node/orbit';
import { GALAXY_SHOTS, galaxyShotLampAt } from './netShots';
import { Lamp, lampFocusRow, TRACK_TARGETS, trackIndex, trackPoint, trackTurn, type TrackTarget } from './netTrack';

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);

describe('TRACK_TARGETS', () => {
  it('begins with no target (Act I, untracked), and names each target once', () => {
    expect(TRACK_TARGETS[0]).toBeNull();
    const keys = TRACK_TARGETS.slice(1).map((t) => JSON.stringify(t));
    expect(new Set(keys).size).toBe(keys.length);
    TRACK_TARGETS.forEach((t, i) => {
      if (t !== null) expect(trackIndex(t)).toBe(i);
    });
    expect(() => trackIndex({ body: 'nowhere' })).toThrow();
  });

  it('holds every probe shot’s target, each body one the galaxy has', () => {
    for (const shot of Object.values(GALAXY_SHOTS)) expect(TRACK_TARGETS[galaxyShotLampAt(shot)]).toEqual(shot.target);
    for (const t of TRACK_TARGETS) {
      if (t === null) continue;
      if ('body' in t) expect(() => bodyIndex(g, t.body)).not.toThrow();
      if ('centroid' in t) for (const id of t.centroid) expect(() => bodyIndex(g, id)).not.toThrow();
    }
  });
});

describe('lampFocusRow', () => {
  it('is a body target’s own row', () => {
    for (const id of ['C1', 'P_a', 'R0', 'N0', 'C5']) expect(lampFocusRow(trackIndex({ body: id }), g)).toBe(bodyIndex(g, id));
  });

  it('is a centroid’s first body’s row: the twelve’s P1, whose rule is the lineage’s', () => {
    const i = trackIndex({ centroid: ['P1', 'P2', 'P3'] });
    expect(lampFocusRow(i, g)).toBe(bodyIndex(g, 'P1'));
    expect(g.bodies[lampFocusRow(i, g)].rule).toBe(bodyIndex(g, 'R0'));
  });

  it('is −1 for the core, the neighbourhood, the galaxy and no target', () => {
    const none: TrackTarget[] = [{ core: true }, { hood: true }, { galaxy: true }];
    for (const t of none) expect(lampFocusRow(trackIndex(t), g)).toBe(-1);
    expect(lampFocusRow(0, g)).toBe(-1);
  });

  it('takes a step leaf mid-way as its nearest index', () => {
    const c1 = trackIndex({ body: 'C1' });
    expect(lampFocusRow(c1 + 0.3, g)).toBe(bodyIndex(g, 'C1'));
  });
});

describe('Lamp', () => {
  it('is one enum, with the probe shots’ values', () => {
    expect([Lamp.Off, Lamp.Planet, Lamp.Star, Lamp.Hood, Lamp.Core, Lamp.Lineage]).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('trackPoint', () => {
  const track = (a: number, b = a, mix = 0) => ({ a, b, mix, turn: 0 });
  const AMBIENTS = [0, 37.25, 1061];

  it('is bodyWorld for a body target, at three ambients', () => {
    for (const id of ['C1', 'P_a', 'R0']) {
      const i = trackIndex({ body: id });
      for (const t of AMBIENTS) expect(trackPoint(track(i), g, data, t)).toEqual(bodyWorld(data, bodyIndex(g, id), t));
    }
  });

  it('is the middle of a centroid, the galactic centre for the core and the galaxy, and the neighbourhood’s middle', () => {
    for (const t of AMBIENTS) {
      const twelve = trackPoint(track(trackIndex({ centroid: ['P1', 'P2', 'P3'] })), g, data, t);
      const ps = ['P1', 'P2', 'P3'].map((id) => bodyWorld(data, bodyIndex(g, id), t));
      for (let k = 0; k < 3; k++) expect(twelve[k]).toBeCloseTo((ps[0][k] + ps[1][k] + ps[2][k]) / 3, 12);
      expect(trackPoint(track(trackIndex({ core: true })), g, data, t)).toEqual(galacticToWorld(data, [0, 0, 0], t));
      expect(trackPoint(track(trackIndex({ galaxy: true })), g, data, t)).toEqual(galacticToWorld(data, [0, 0, 0], t));
      expect(trackPoint(track(trackIndex({ hood: true })), g, data, t)).toEqual(galacticToWorld(data, g.hoodCentroid, t));
    }
  });

  it('is the world’s origin with no target (Act I), at every ambient', () => {
    for (const t of AMBIENTS) expect(trackPoint(track(0), g, data, t)).toEqual([0, 0, 0]);
  });

  it('mixes from a to b: mix 0 is a, 1 is b and 0.5 the midpoint', () => {
    const a = trackIndex({ body: 'C1' });
    const b = trackIndex({ body: 'R0' });
    for (const t of AMBIENTS) {
      const pa = bodyWorld(data, bodyIndex(g, 'C1'), t);
      const pb = bodyWorld(data, bodyIndex(g, 'R0'), t);
      expect(trackPoint(track(a, b, 0), g, data, t)).toEqual(pa);
      expect(trackPoint(track(a, b, 1), g, data, t)).toEqual(pb);
      const mid = trackPoint(track(a, b, 0.5), g, data, t);
      for (let k = 0; k < 3; k++) expect(mid[k]).toBeCloseTo((pa[k] + pb[k]) / 2, 12);
    }
  });

  it('takes its step leaves mid-way as their nearest index, and clamps the mix', () => {
    const c1 = trackIndex({ body: 'C1' });
    const want = bodyWorld(data, bodyIndex(g, 'C1'), 5);
    expect(trackPoint(track(c1 + 0.3, c1 - 0.3, 0.4), g, data, 5)).toEqual(want);
    expect(trackPoint(track(0, c1, 1.7), g, data, 5)).toEqual(want);
    expect(trackPoint(track(c1, 0, -0.5), g, data, 5)).toEqual(want);
  });
});

describe('trackTurn', () => {
  const at = (turn: number) => ({ a: 1, b: 1, mix: 0, turn });
  it('is the galaxy’s own turn at 1 (up to whole turns), none at 0, and that share of it between (clamped)', () => {
    const unwrapped = (t: number) => (2 * Math.PI * t) / GALAXY_TURN_PERIOD;
    for (const t of [0, 37.25, 9.493782472098248, 1061, 2900]) {
      expect(trackTurn(at(1), t)).toBe(unwrapped(t));
      expect(Math.cos(trackTurn(at(1), t))).toBeCloseTo(Math.cos(galaxyTurn(t)), 12);
      expect(Math.sin(trackTurn(at(1), t))).toBeCloseTo(Math.sin(galaxyTurn(t)), 12);
      expect(trackTurn(at(0), t)).toBe(0);
      expect(trackTurn(at(0.5), t)).toBeCloseTo(unwrapped(t) / 2, 12);
      expect(trackTurn(at(3), t)).toBe(unwrapped(t));
    }
  });

  it('is continuous in the ambient at a share between: no snap at the half turns (600 s, 1800 s), as the ride eases on (review M2)', () => {
    // A thirtieth of a second either side of each half turn: a share of a quarter turn of the galaxy's own drift at most.
    const dt = 1 / 30;
    for (const t of [600, 1800]) {
      const jump = Math.abs(trackTurn(at(0.5), t + dt) - trackTurn(at(0.5), t - dt));
      expect(jump, `at ${t}`).toBeLessThan((2 * Math.PI * 2 * dt) / GALAXY_TURN_PERIOD);
    }
  });
});
