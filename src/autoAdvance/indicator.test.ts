import { describe, expect, it } from 'vitest';
import { AUTO_ADVANCE } from '../config';
import { arcDash, type Phase } from './indicator';
import { planTransit } from './pace';

// The author: the ring "goes back and forth, switches direction ... can we have it always go the same
// direction? (Clockwise)". Both ends of the arc may only ever move clockwise: forward along the path.
describe('the ring only moves clockwise', () => {
  const dwell = (elapsed: number): Phase => ({ kind: 'dwell', elapsed, duration: 3 });
  const transit = (elapsed: number): Phase => ({ kind: 'transit', from: 0, to: 1, plan: planTransit(0, 0.1, 1, [], AUTO_ADVANCE), elapsed });

  it('sweeps on from empty to full through a hold, from twelve o’clock', () => {
    const arcs = [0, 0.5, 1.5, 2.9, 3, 4].map((t) => arcDash(dwell(t)));
    expect(arcs.every((a) => a.start === 0)).toBe(true);
    for (let i = 1; i < arcs.length; i++) expect(arcs[i].length).toBeGreaterThanOrEqual(arcs[i - 1].length);
    expect(arcs[0].length).toBe(0);
    expect(arcs.at(-1)!.length).toBe(1);
  });

  it('clears from its start, clockwise, through the scroll that follows, leaving the end where it was', () => {
    const arcs = [0, 0.2, 0.6, 1, 2, 10].map((t) => arcDash(transit(t)));
    for (let i = 1; i < arcs.length; i++) expect(arcs[i].start).toBeGreaterThanOrEqual(arcs[i - 1].start);
    for (const a of arcs) expect(a.start + a.length).toBeCloseTo(1, 9);
    expect(arcs[0]).toEqual({ start: 0, length: 1 });
    expect(arcs.at(-1)!.length).toBeCloseTo(0, 9);
  });

  it('hands over from a finished hold to a starting scroll without moving', () => {
    expect(arcDash(dwell(3))).toEqual(arcDash(transit(0)));
  });

  it('is full while waiting for the page, empty when paused or ended', () => {
    expect(arcDash({ kind: 'dwell', elapsed: 0, duration: Infinity })).toEqual({ start: 0, length: 1 });
    expect(arcDash({ kind: 'paused' }).length).toBe(0);
    expect(arcDash({ kind: 'ended' }).length).toBe(0);
  });
});
