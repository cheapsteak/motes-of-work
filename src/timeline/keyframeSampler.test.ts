import { describe, expect, it } from 'vitest';
import { sectionSpans } from '../scroll/progress';
import { KeyframeError, KeyframeSampler, progressOfSectionAt, splitSectionAt, type KeyframeFile } from './keyframeSampler';
import { defaultSceneState } from './sceneState';

const spans = sectionSpans([
  { id: 'intro', length: 1 },
  { id: 'spec', length: 3 },
]); // intro 0..0.25, spec 0.25..1

const make = (tracks: KeyframeFile['tracks']) => new KeyframeSampler({ tracks }, spans);

describe('sampling', () => {
  const s = make({
    'mech.assembly': [
      { at: 0, value: 0 },
      { at: 1, value: 1 },
    ],
  });
  it('returns key values exactly at a key', () => {
    expect(s.sample(0).mech.assembly).toBe(0);
    expect(s.sample(1).mech.assembly).toBe(1);
  });
  it('interpolates linearly by default', () => {
    expect(s.sample(0.5).mech.assembly).toBe(0.5);
  });
  it('shapes the segment with the later key\'s ease', () => {
    const e = make({
      'mech.assembly': [
        { at: 0, value: 0 },
        { at: 1, value: 1, ease: 'inOutCubic' },
      ],
    });
    expect(e.sample(0.5).mech.assembly).toBe(0.5);
    expect(e.sample(0.25).mech.assembly).toBeLessThan(0.5);
  });
  it('step holds the previous value until the next key', () => {
    const e = make({
      'mech.variant': [
        { at: 0.2, value: 0 },
        { at: 0.6, value: 1, ease: 'step' },
      ],
    });
    expect(e.sample(0.59).mech.variant).toBe(0);
    expect(e.sample(0.6).mech.variant).toBe(1);
  });
  it('holds first value before and last value after the keys', () => {
    const e = make({
      'camera.fov': [
        { at: 0.3, value: 20 },
        { at: 0.6, value: 60 },
      ],
    });
    expect(e.sample(0).camera.fov).toBe(20);
    expect(e.sample(0.3).camera.fov).toBe(20);
    expect(e.sample(0.9).camera.fov).toBe(60);
  });
  it('interpolates vec3 componentwise', () => {
    const e = make({
      'camera.pos': [
        { at: 0, value: [0, 0, 8] },
        { at: 1, value: [4, -2, 0] },
      ],
    });
    expect(e.sample(0.5).camera.pos).toEqual([2, -1, 4]);
    expect(e.sample(0).camera.pos).toEqual([0, 0, 8]);
  });
  it('resolves "<sectionId>@<local>" through spans', () => {
    const e = make({
      'overlay.strip': [
        { at: 'spec@0', value: 0 },
        { at: 'spec@1', value: 1 },
      ],
    });
    expect(e.sample(0.25).overlay.strip).toBe(0);
    expect(e.sample(0.625).overlay.strip).toBeCloseTo(0.5, 12);
    const half = make({ clock: [{ at: 'spec@0.5', value: 7 }] });
    expect(half.sample(0.6249).clock).toBe(7); // single key: constant everywhere
    const two = make({
      clock: [
        { at: 0, value: 0 },
        { at: 'spec@0.5', value: 1 },
      ],
    });
    expect(two.sample(0.625).clock).toBe(1);
  });
  it('gives untracked fields their defaults', () => {
    expect(s.sample(0.5).camera).toEqual(defaultSceneState().camera);
    expect(make({}).sample(0.5)).toEqual(defaultSceneState());
  });
  it('clamps out-of-range and NaN progress', () => {
    expect(s.sample(-1)).toEqual(s.sample(0));
    expect(s.sample(2)).toEqual(s.sample(1));
    expect(s.sample(NaN)).toEqual(s.sample(0));
    expect(s.sample(Infinity)).toEqual(s.sample(1));
    expect(s.sample(-Infinity)).toEqual(s.sample(0));
  });
});

describe('purity', () => {
  const s = make({
    'mech.drive': [
      { at: 0, value: 0 },
      { at: 1, value: 10 },
    ],
    'camera.pos': [
      { at: 0, value: [0, 0, 8] },
      { at: 1, value: [1, 1, 1] },
    ],
  });
  it('is independent of call history', () => {
    const first = s.sample(0.4);
    s.sample(0.9);
    s.sample(0.1);
    expect(s.sample(0.4)).toEqual(first);
  });
  it('returns states that callers can mutate without affecting later samples', () => {
    const a = s.sample(0.4);
    a.camera.pos[0] = 123;
    a.mech.drive = -5;
    expect(s.sample(0.4).camera.pos[0]).not.toBe(123);
    expect(s.sample(0.4).mech.drive).toBeCloseTo(4, 12);
    const atEnd = s.sample(1);
    atEnd.camera.pos[1] = 55; // the end key's own array must not be exposed
    expect(s.sample(1).camera.pos).toEqual([1, 1, 1]);
    const atStart = s.sample(0);
    atStart.camera.pos[2] = 55;
    expect(s.sample(0).camera.pos).toEqual([0, 0, 8]);
  });
  it('does not alias the input file', () => {
    const file: KeyframeFile = { tracks: { 'camera.pos': [{ at: 0, value: [1, 2, 3] }] } };
    const k = new KeyframeSampler(file, spans);
    (file.tracks['camera.pos'][0].value as number[])[0] = 99;
    expect(k.sample(0.5).camera.pos).toEqual([1, 2, 3]);
  });
});

describe('validation', () => {
  const bad = (tracks: unknown) => () => make(tracks as KeyframeFile['tracks']);
  it('rejects unknown paths', () => {
    expect(bad({ 'mech.bogus': [{ at: 0, value: 1 }] })).toThrow(KeyframeError);
    expect(bad({ 'mech.bogus': [{ at: 0, value: 1 }] })).toThrow(/mech\.bogus/);
    expect(bad({ __proto__x: [{ at: 0, value: 1 }], toString: [{ at: 0, value: 1 }] })).toThrow(KeyframeError);
  });
  it('rejects unknown section ids', () => {
    expect(bad({ clock: [{ at: 'nowhere@0.5', value: 1 }] })).toThrow(/clock.*nowhere/);
  });
  it('rejects malformed at strings', () => {
    expect(bad({ clock: [{ at: 'spec', value: 1 }] })).toThrow(/clock/);
    expect(bad({ clock: [{ at: 'spec@', value: 1 }] })).toThrow(/clock/);
    expect(bad({ clock: [{ at: 'spec@abc', value: 1 }] })).toThrow(/clock/);
  });
  it('rejects local positions outside [0,1]', () => {
    expect(bad({ clock: [{ at: 'spec@1.5', value: 1 }] })).toThrow(/clock/);
    expect(bad({ clock: [{ at: 'spec@-0.1', value: 1 }] })).toThrow(/clock/);
  });
  it('rejects at values that are not strictly increasing', () => {
    expect(
      bad({
        clock: [
          { at: 0.5, value: 0 },
          { at: 0.5, value: 1 },
        ],
      }),
    ).toThrow(/clock.*strictly increasing/);
    expect(
      bad({
        clock: [
          { at: 0.6, value: 0 },
          { at: 'intro@0.5', value: 1 },
        ],
      }),
    ).toThrow(/clock/);
  });
  it('rejects non-finite or out-of-range global at', () => {
    expect(bad({ clock: [{ at: NaN, value: 1 }] })).toThrow(/clock/);
    expect(bad({ clock: [{ at: 1.5, value: 1 }] })).toThrow(/clock/);
  });
  it('rejects value shape mismatches', () => {
    expect(bad({ 'camera.pos': [{ at: 0, value: 3 }] })).toThrow(/camera\.pos/);
    expect(bad({ 'camera.pos': [{ at: 0, value: [1, 2] }] })).toThrow(/camera\.pos/);
    expect(bad({ 'camera.fov': [{ at: 0, value: [1, 2, 3] }] })).toThrow(/camera\.fov/);
    expect(bad({ 'camera.fov': [{ at: 0, value: '40' }] })).toThrow(/camera\.fov/);
  });
  it('rejects non-finite values', () => {
    expect(bad({ 'camera.fov': [{ at: 0, value: NaN }] })).toThrow(/camera\.fov/);
    expect(bad({ 'camera.fov': [{ at: 0, value: Infinity }] })).toThrow(/camera\.fov/);
    expect(bad({ 'camera.pos': [{ at: 0, value: [0, NaN, 0] }] })).toThrow(/camera\.pos/);
  });
  it('rejects unknown eases', () => {
    expect(bad({ clock: [{ at: 0, value: 1, ease: 'bouncy' }] })).toThrow(/clock.*bouncy/);
    expect(bad({ clock: [{ at: 0, value: 1, ease: 'toString' }] })).toThrow(/clock/);
  });
  it('rejects empty tracks and malformed files', () => {
    expect(bad({ clock: [] })).toThrow(/clock/);
    expect(bad({ clock: 5 })).toThrow(/clock/);
    expect(() => new KeyframeSampler(null as unknown as KeyframeFile, spans)).toThrow(KeyframeError);
    expect(() => new KeyframeSampler({} as KeyframeFile, spans)).toThrow(KeyframeError);
  });
});

describe('section-local positions', () => {
  it('split at the last @, and resolve over the spans as a keyframe does', () => {
    expect(splitSectionAt('spec@0.5')).toEqual({ id: 'spec', local: 0.5 });
    expect(splitSectionAt('a@b@ 0.25')).toEqual({ id: 'a@b', local: 0.25 });
    expect(splitSectionAt('spec@')?.local).toBeNaN();
    expect(splitSectionAt('spec')).toBeNull();
    expect(progressOfSectionAt('spec@0.5', spans)).toBeCloseTo(0.625, 12);
    expect(make({ clock: [{ at: 'spec@0.5', value: 0 }, { at: 1, value: 1 }] }).sample(progressOfSectionAt('spec@0.5', spans)).clock).toBe(0);
    expect(() => progressOfSectionAt('nope@0.5', spans)).toThrow(KeyframeError);
    expect(() => progressOfSectionAt('spec@1.5', spans)).toThrow(KeyframeError);
  });
});
