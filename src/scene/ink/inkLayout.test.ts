import { describe, expect, it } from 'vitest';
import { applyToPoint } from '../../math/transform';
import { mechanisms } from '../../mechanisms';
import { partIndex } from '../../mechanisms/bike';
import { inkSegmentCount } from '../../mechanisms/bike/ink';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import { ZERO_FAULTS } from '../../timeline/sceneState';
import { INK_CLASS, INK_FLAG, inkInstances, partXRanks } from './inkLayout';
import { inkPoses, inkUniforms, PENTIMENTO, segmentEnds, segmentLook } from './inkPose';

// The drawing's segments as the renderer draws them (docs/specs/2026-10-05-blueprint-and-build.md
// §2.5, §5 tests 2 and 11): the pen's arc and the redraw's, the lift's rank, and, through the TS
// mirror of the shader, what the shipped keyframes show of it.

const bike = mechanisms.bike;
const strokes = bike.ink?.() ?? [];
const ranks = partXRanks(strokes, bike.pose(0, ZERO_FAULTS, 0));
const inst = inkInstances(strokes, ranks);
const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const spec = spans.find((s) => s.id === 'spec');
const at = (l: number) => sampler.sample((spec?.start ?? 0) + l * ((spec?.end ?? 1) - (spec?.start ?? 0)));

const flagsOf = (k: number) => inst.meta[k * 4 + 2];
const arcsOf = (k: number) => [...inst.arcs.subarray(k * 4, k * 4 + 4)];
const segments = Array.from({ length: inst.count }, (_, k) => k);
const firstPass = segments.filter((k) => !(flagsOf(k) & INK_FLAG.copy) && inst.style[k * 4 + 1] !== INK_CLASS.person);
const redrawn = segments.filter((k) => flagsOf(k) & INK_FLAG.copy);

describe('the segments', () => {
  it('are one per segment of each stroke, moving strokes twice', () => {
    expect(inst.count).toBe(inkSegmentCount(strokes));
    expect(redrawn.length).toBeGreaterThan(100);
  });

  it('carry the pen arc from 0 to 1 over the first pass, without a gap, in the pen order', () => {
    let prev = 0;
    for (const k of firstPass) {
      const [a, b] = arcsOf(k);
      expect(a).toBeCloseTo(prev, 6);
      expect(b).toBeGreaterThan(a);
      prev = b;
    }
    expect(prev).toBeCloseTo(1, 9);
  });

  it('carry the redraw arc from 0 to 1 over the moving strokes, the seat first, the cables last', () => {
    const order = [...redrawn].sort((p, q) => arcsOf(p)[2] - arcsOf(q)[2]);
    let prev = 0;
    for (const k of order) {
      const [, , a, b] = arcsOf(k);
      expect(a).toBeCloseTo(prev, 6);
      prev = b;
    }
    expect(prev).toBeCloseTo(1, 9);
    const firstOf = (part: string) => Math.min(...redrawn.filter((k) => inst.meta[k * 4] === partIndex(part)).map((k) => arcsOf(k)[2]));
    expect(firstOf('saddle')).toBe(0);
    expect(firstOf('saddle')).toBeLessThan(firstOf('handlebars'));
    expect(firstOf('handlebars')).toBeLessThan(firstOf('frame'));
  });

  it('lift rear first: the rear wheel ranks 1 and the front wheel near 0', () => {
    expect(ranks[partIndex('rear-wheel')]).toBeGreaterThan(0.85);
    expect(ranks[partIndex('front-wheel')]).toBeLessThan(0.1);
    for (const r of ranks) {
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});

describe('the drawing through the spec section (the shipped keyframes)', () => {
  it('draws nothing before the pen sets out and every first-pass line by the end of sp-2', () => {
    for (const k of firstPass) expect(segmentLook(inst, k, inkUniforms(at(0.04))).alpha).toBe(0);
    const drawn = inkUniforms(at(0.165));
    for (const k of firstPass) expect(segmentLook(inst, k, drawn).vis, `segment ${k}`).toBe(1);
  });

  it('shows the wrong lines until the redraw, then leaves them faint and the new ones drawn', () => {
    const before = inkUniforms(at(0.3));
    const after = inkUniforms(at(0.45));
    // (Lines running straight across the side view are hidden while the drawing is flat.)
    const moving = firstPass.filter((k) => flagsOf(k) & INK_FLAG.moves && !(flagsOf(k) & INK_FLAG.across));
    expect(moving.length).toBeGreaterThan(100);
    for (const k of moving) {
      expect(segmentLook(inst, k, after).alpha / segmentLook(inst, k, before).alpha).toBeCloseTo(PENTIMENTO, 9);
    }
    for (const k of redrawn) {
      expect(segmentLook(inst, k, before).alpha).toBe(0);
      expect(segmentLook(inst, k, after).vis).toBe(1);
    }
  });

  it('touches nothing but the moving lines and the ring while it redraws', () => {
    const from = inkUniforms(at(0.31));
    for (const l of [0.33, 0.36, 0.39, 0.42]) {
      const u = inkUniforms(at(l));
      for (const k of segments) {
        if (flagsOf(k) & (INK_FLAG.moves | INK_FLAG.ring)) continue;
        expect(segmentLook(inst, k, u), `segment ${k} at spec@${l}`).toEqual(segmentLook(inst, k, from));
      }
    }
  });

  it('presses every line flat on the page before the lift, and stands each on its part after it', () => {
    const flat = at(0.6);
    expect(flat.ink.flat).toBe(1);
    const posesFlat = inkPoses(bike, flat);
    for (const k of segments) for (const p of segmentEnds(inst, k, posesFlat, 1)) expect(Math.abs(p[2])).toBe(0);
    const lifted = at(0.69);
    expect(lifted.ink.flat).toBe(0);
    const poses = inkPoses(bike, lifted);
    for (const k of segments.filter((j) => !(flagsOf(j) & INK_FLAG.paper))) {
      const part = inst.meta[k * 4];
      const twin = flagsOf(k) & INK_FLAG.moves && !(flagsOf(k) & INK_FLAG.copy);
      const xf = (twin ? poses.twin : poses.correct)[part];
      const a = (twin ? inst.aTwin : inst.a).subarray(k * 3, k * 3 + 3);
      const want = applyToPoint(xf, [a[0], a[1], a[2]]);
      const [got] = segmentEnds(inst, k, poses, 0);
      for (let c = 0; c < 3; c++) expect(got[c]).toBeCloseTo(want[c], 5);
    }
  });
});
