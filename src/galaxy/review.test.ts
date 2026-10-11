import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { packBodyData } from '../scene/node/bodyData';
import { bodyWorld } from '../scene/node/orbit';
import { bodyIndex, galaxyBudget, generateGalaxy, pieceOuter } from './generate';
import { feedAlpha, RING, ringAt, visitHold, type RingVisit } from './review';
import { atKeys, REVIEW_VISITS, REVIEWER_KEYS, whenKeys } from './schedule';

const gap = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// The galaxy's ring rides its visits (galaxy §14.5): it is re-pinned at three ambients, where the
// visits have moved on their orbits, to each visit's bodyWorld at that ambient.
const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const visits: RingVisit[] = g.visits.map((id) => ({ row: bodyIndex(g, id), radius: pieceOuter(g, bodyIndex(g, id)) }));
const AMBIENTS = [0, 37.3, 101];

describe('ringAt', () => {
  it.each(AMBIENTS)('holds on each visit for 70 %% of its ninth at its place at ambient %s, then crosses to the next', (t) => {
    visits.forEach((v, j) => {
      const [from, to] = visitHold(j, visits.length);
      for (const r of [from, (from + to) / 2, to]) {
        const ring = ringAt(r, visits, t, data);
        expect(ring.position).toEqual(bodyWorld(data, v.row, t));
        expect(ring.radius).toBeCloseTo(RING.radiusScale * v.radius, 12);
        expect(ring.along).toBe(j);
      }
    });
    expect(visitHold(0, 9)).toEqual([0, 0.7 / 9]);
    expect(visitHold(8, 9)).toEqual([8 / 9, 1]);
  });

  it('rides its visit: the same review at two ambients is the visit’s two places', () => {
    const [from] = visitHold(4, visits.length);
    const a = ringAt(from, visits, 0, data).position;
    const b = ringAt(from, visits, 101, data).position;
    expect(gap(a, b)).toBeGreaterThan(0.1);
    expect(b).toEqual(bodyWorld(data, visits[4].row, 101));
  });

  it('its radius is 1.5 times the visit’s outer radius, the planet with its moons', () => {
    for (const v of visits) expect(v.radius).toBeGreaterThanOrEqual(g.bodies[v.row].R);
    expect(ringAt(0, visits, 0, data).radius).toBeCloseTo(1.5 * pieceOuter(g, visits[0].row), 12);
  });

  it.each(AMBIENTS)('stays on the last visit past the end of its visits (ambient %s)', (t) => {
    for (const r of [1, 1.1, 1.5, 2]) expect(ringAt(r, visits, t, data).position).toEqual(bodyWorld(data, visits[8].row, t));
  });

  it.each(AMBIENTS)('moves continuously and only forward along the visits at ambient %s', (t) => {
    const steps = 20_000;
    const places = visits.map((v) => bodyWorld(data, v.row, t));
    const longest = Math.max(...places.slice(1).map((p, j) => gap(p, places[j])));
    // No jump: a crossing takes 0.3 of a visit's ninth on a smoothstep, whose slope peaks at 1.5.
    const maxStep = (longest * 1.5 * visits.length) / (1 - RING.hold) / steps;
    let prev = ringAt(0, visits, t, data);
    for (let i = 1; i <= steps; i++) {
      const ring = ringAt(i / steps, visits, t, data);
      expect(ring.along).toBeGreaterThanOrEqual(prev.along);
      expect(gap(ring.position, prev.position)).toBeLessThanOrEqual(maxStep * 1.0001);
      prev = ring;
    }
  });

  it('fades in at the start and out over 1.5..2', () => {
    expect(ringAt(0, visits, 0, data).presence).toBe(0);
    expect(ringAt(0.03, visits, 0, data).presence).toBe(1);
    expect(ringAt(1.2, visits, 0, data).presence).toBe(1);
    expect(ringAt(1.75, visits, 0, data).presence).toBeCloseTo(0.5, 12);
    expect(ringAt(2, visits, 0, data).presence).toBe(0);
  });
});

describe('feedAlpha', () => {
  it('is 0 before review 1.0, 1 at 1.2, and gone by 2', () => {
    for (const r of [0, 0.5, 0.99, 1]) expect(feedAlpha(r)).toBe(0);
    expect(feedAlpha(1.1)).toBeCloseTo(0.5, 12);
    expect(feedAlpha(1.2)).toBe(1);
    expect(feedAlpha(1.5)).toBe(1);
    expect(feedAlpha(2)).toBe(0);
  });
});

// Design §6 test 7: when the ring is over a visit, that planet is at least 80 % built. Growth and
// the ring both move by the reviewer section's designed keys; growth never decreases, so the start
// of each hold is the worst case.
describe('the review visits against the ring', () => {
  const planets = g.visits.map((id) => g.bodies[bodyIndex(g, id)]);

  it('names the nine visits in birth order', () => {
    expect(g.visits).toEqual([...REVIEW_VISITS]);
    for (let j = 1; j < planets.length; j++) expect(planets[j].born).toBeGreaterThan(planets[j - 1].born);
  });

  it.each(REVIEW_VISITS.map((id, j) => [id, j] as const))('%s is at least 80 %% built when the ring reaches it', (_, j) => {
    const [from] = visitHold(j, planets.length);
    const local = whenKeys(REVIEWER_KEYS.review, from)!;
    const growth = atKeys(REVIEWER_KEYS.growth, local);
    const p = planets[j];
    expect(Math.min(1, (growth - p.born) / p.dur)).toBeGreaterThanOrEqual(0.8);
  });
});
