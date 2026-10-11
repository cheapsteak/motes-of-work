import { describe, expect, it } from 'vitest';
import { FAULT_KEYS, SCENE_STATE_PATHS } from '../timeline/sceneState';
import { DRIVE_MAX, GROUP_HINTS, playDrive, PRESETS, SLIDERS, stateFromSliders, type SliderValues } from './controls';

const sliderPaths = SLIDERS.map((s) => s.path);
const camera = { pos: [1.6, 1.1, 2.4] as [number, number, number], target: [0, 0, 0] as [number, number, number] };

function leaves(x: unknown): number[] {
  if (typeof x === 'number') return [x];
  if (Array.isArray(x)) return x.flatMap(leaves);
  return Object.values(x as Record<string, unknown>).flatMap(leaves);
}

describe('sliders', () => {
  it('cover exactly the mech and provenance leaves of the scene state', () => {
    const wanted = Object.keys(SCENE_STATE_PATHS).filter((p) => p.startsWith('mech.') || p.startsWith('provenance.'));
    expect(new Set(sliderPaths)).toEqual(new Set(wanted));
    expect(sliderPaths).toHaveLength(wanted.length); // no duplicates
  });

  it('every group has a visible hint', () => {
    expect(new Set(Object.keys(GROUP_HINTS))).toEqual(new Set(SLIDERS.map((s) => s.group)));
  });

  it('include every fault', () => {
    for (const k of FAULT_KEYS) expect(sliderPaths).toContain(`mech.faults.${k}`);
  });

  it('have sentence-case labels and sane ranges', () => {
    for (const s of SLIDERS) {
      expect(s.label[0], s.path).toBe(s.label[0].toUpperCase());
      expect(s.label.slice(1), s.path).toBe(s.label.slice(1).toLowerCase());
      expect(s.max, s.path).toBeGreaterThan(s.min);
      expect(s.step, s.path).toBeGreaterThan(0);
    }
  });
});

describe('presets', () => {
  it('are the five the brief names, in order', () => {
    expect(PRESETS.map((p) => p.name)).toEqual([
      'Specced',
      'Vibed (wrong twin)',
      'Quiet failure',
      'Exploded',
      'Faults 0.6',
    ]);
  });

  it.each(PRESETS.map((p) => [p.name, p] as const))('%s sets every slider, within its range', (_name, preset) => {
    expect(new Set(Object.keys(preset.values))).toEqual(new Set(sliderPaths));
    for (const s of SLIDERS) {
      const v = preset.values[s.path];
      expect(v, s.path).toBeGreaterThanOrEqual(s.min);
      expect(v, s.path).toBeLessThanOrEqual(s.max);
    }
  });

  it('each carry a one-sentence description', () => {
    for (const p of PRESETS) {
      expect(p.blurb[0], p.name).toBe(p.blurb[0].toUpperCase());
      expect(p.blurb.endsWith('.'), p.name).toBe(true);
      expect(p.blurb.slice(0, -1), p.name).not.toMatch(/[.!?]\s/);
    }
  });

  it('say what they claim', () => {
    const by = Object.fromEntries(PRESETS.map((p) => [p.name, p.values]));
    expect(by['Specced']['mech.variant']).toBe(0);
    expect(by['Specced']['provenance.vibed']).toBe(0);
    expect(by['Vibed (wrong twin)']['mech.variant']).toBe(1);
    expect(by['Vibed (wrong twin)']['provenance.vibed']).toBe(1);
    expect(by['Quiet failure']['provenance.misallocated']).toBe(1);
    expect(by['Exploded']['mech.assembly']).toBeLessThan(1);
    for (const k of FAULT_KEYS) {
      expect(by['Faults 0.6'][`mech.faults.${k}`]).toBe(0.6);
      expect(by['Specced'][`mech.faults.${k}`]).toBe(0);
    }
  });
});

describe('stateFromSliders', () => {
  it('writes every slider into the scene state and the camera through unchanged', () => {
    const values = Object.fromEntries(SLIDERS.map((s, i) => [s.path, s.min + ((i + 1) / 20) * (s.max - s.min)]));
    const s = stateFromSliders(values as SliderValues, { ...camera, fov: 35 });
    expect(s.mech.assembly).toBe(values['mech.assembly']);
    expect(s.mech.faults.stall).toBe(values['mech.faults.stall']);
    expect(s.provenance.misallocated).toBe(values['provenance.misallocated']);
    expect(s.camera.pos).toEqual(camera.pos);
    expect(s.camera.fov).toBe(35);
    expect(s.camera.coreFocus).toBe(0);
  });

  it('is finite at every slider extreme', () => {
    for (const pick of ['min', 'max'] as const) {
      const values = Object.fromEntries(SLIDERS.map((s) => [s.path, s[pick]])) as SliderValues;
      expect(leaves(stateFromSliders(values, { ...camera, fov: 40 })).every(Number.isFinite)).toBe(true);
    }
  });
});

describe('playDrive', () => {
  it('advances at the rate from where play started', () => {
    expect(playDrive(1, 0.25, 2)).toBeCloseTo(1.5);
  });

  it('wraps into [0, DRIVE_MAX)', () => {
    expect(playDrive(DRIVE_MAX - 0.5, 1, 1)).toBeCloseTo(0.5);
    expect(playDrive(DRIVE_MAX, 0, 0)).toBe(0);
  });

  it('falls back to the start for non-finite input', () => {
    expect(playDrive(0.3, Number.NaN, 1)).toBe(0.3);
    expect(playDrive(0.3, 1, Number.POSITIVE_INFINITY)).toBe(0.3);
    expect(playDrive(Number.NaN, 1, 1)).toBe(1); // a non-finite start counts as 0
  });
});
