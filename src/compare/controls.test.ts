import { describe, expect, it } from 'vitest';
import { sectionSpans } from '../scroll/progress';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from '../timeline/keyframeSampler';
import keyframes from '../timeline/keyframes.json';
import { FAULT_KEYS, SCENE_STATE_PATHS } from '../timeline/sceneState';
import {
  CAMERAS,
  DRIVE_MAX,
  fitFov,
  GROUP_HINTS,
  gridShape,
  nudgeDrive,
  playDrive,
  PRESETS,
  presetText,
  SLIDERS,
  stateFromSliders,
  twinPair,
  VIEW_MODES,
  type SliderValues,
} from './controls';

const sliderPaths = SLIDERS.map((s) => s.path);
const camera = { pos: [1.6, 1.1, 2.4] as [number, number, number], target: [0, 0, 0] as [number, number, number] };

function leaves(x: unknown): number[] {
  if (typeof x === 'number') return [x];
  if (Array.isArray(x)) return x.flatMap(leaves);
  return Object.values(x as Record<string, unknown>).flatMap(leaves);
}

describe('sliders', () => {
  it('cover exactly the mech and provenance leaves of the scene state, save the reflow', () => {
    // The reflow is Act II's: every mote leaves the machine for the first stack of cubes, the same
    // for any machine, so it is no property of a mechanism on the bench (design §5: the compare page
    // changes nothing).
    const wanted = Object.keys(SCENE_STATE_PATHS).filter(
      (p) => (p.startsWith('mech.') || p.startsWith('provenance.')) && p !== 'mech.reflow',
    );
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
      // Jitter is capped at 0.25: at 0.6 it smears every machine (visual review, change 15).
      expect(by['Faults 0.6'][`mech.faults.${k}`]).toBe(k === 'jitter' ? 0.25 : 0.6);
      expect(by['Specced'][`mech.faults.${k}`]).toBe(0);
    }
  });

  it('never wash the pane with a full ghost (visual review, change 4)', () => {
    const ghost = Object.fromEntries(PRESETS.map((p) => [p.name, p.values['mech.ghost']]));
    expect(ghost).toEqual({
      Specced: 0,
      'Vibed (wrong twin)': 0,
      'Quiet failure': 0.4,
      Exploded: 0.6,
      'Faults 0.6': 0.6,
    });
  });
});

describe('presetText', () => {
  it('names the preset once, then its description and its ghost', () => {
    for (const p of PRESETS) {
      const text = presetText(p);
      expect(text.startsWith(`${p.name} — `), p.name).toBe(true);
      expect(text.split(':').length, p.name).toBeLessThanOrEqual(2); // never two colons in a row of clauses
      expect(text, p.name).toContain(p.values['mech.ghost'] === 0 ? 'No ghost.' : `Ghost ${p.values['mech.ghost']}.`);
    }
    expect(presetText(PRESETS[1])).toBe(
      'Vibed (wrong twin) — built fast from a vague prompt: polished, working, wrong, cool throughout. No ghost.',
    );
  });
});

describe('view modes', () => {
  it('are single, twin pair and side by side', () => {
    expect(VIEW_MODES.map((v) => [v.mode, v.label])).toEqual([
      ['single', 'Single'],
      ['twin', 'Twin pair'],
      ['grid', 'Side by side'],
    ]);
  });

  it('twin pair: the sliders as set with the correct, specced machine | the vibed wrong twin, no ghost', () => {
    const values = { ...PRESETS[3].values, 'mech.variant': 0.4, 'provenance.vibed': 0.3, 'mech.faults.stall': 0.2 };
    const [left, right] = twinPair(values);
    expect(left).toEqual({ ...values, 'mech.variant': 0, 'provenance.vibed': 0 });
    expect(right).toEqual({ ...values, 'mech.variant': 1, 'provenance.vibed': 1, 'mech.ghost': 0 });
    expect(values['mech.variant']).toBe(0.4); // the input is untouched
  });
});

describe('gridShape', () => {
  it('lays out every mechanism, near square, with no empty row or column', () => {
    for (let n = 1; n <= 12; n++) {
      const { cols, rows } = gridShape(n);
      expect(cols * rows, `n ${n}`).toBeGreaterThanOrEqual(n);
      expect(cols - rows, `n ${n}`).toBeGreaterThanOrEqual(0);
      expect(cols - rows, `n ${n}`).toBeLessThanOrEqual(1);
      expect((cols - 1) * rows, `n ${n}`).toBeLessThan(n);
      expect(cols * (rows - 1), `n ${n}`).toBeLessThan(n);
    }
    expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridShape(5)).toEqual({ cols: 3, rows: 2 });
  });
});

describe('cameras', () => {
  it('are the five framings of the visual review, machine-relative', () => {
    expect(CAMERAS).toEqual([
      { name: 'Three-quarter', pos: [1.6, 1.1, 2.4], target: [0, 0, 0], fov: 40, coreFocus: 0 },
      { name: 'Cold open', pos: [2.9, 0.576, 2.9], target: [0, 0, 0], fov: 40, coreFocus: 0 },
      { name: 'Spec (core)', pos: [0.406, 0.049, 4.137], target: [0, 0, 0], fov: 35, coreFocus: 1 },
      { name: 'Head-on', pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, coreFocus: 0 },
      { name: 'Side, low', pos: [0.1, 0.12, 2.9], target: [0, -0.15, 0], fov: 40, coreFocus: 0 },
    ]);
  });

  it('stand where the story camera ends the cold open, looking at the centre', () => {
    const spans = sectionSpans(loadStory());
    const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
    const endOf = (id: string): number => {
      const span = spans.find((s) => s.id === id);
      if (!span) throw new Error(`no section ${id}`);
      return span.end;
    };
    // The spec close-up is the bench's own framing of the core: the story's spec section now ends
    // on the whole bike (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §2.4).
    for (const [name, section] of [['Cold open', 'vibe-build']]) {
      const preset = CAMERAS.find((c) => c.name === name);
      if (!preset) throw new Error(`no ${name} camera`);
      const { pos, target, fov, coreFocus } = preset;
      expect(sampler.sample(endOf(section)).camera, name).toMatchObject({ pos, fov, coreFocus });
      expect(target, name).toEqual([0, 0, 0]);
    }
  });

  it('pass coreFocus into the scene state', () => {
    const spec = CAMERAS.find((c) => c.name === 'Spec (core)');
    if (!spec) throw new Error('no spec camera');
    const s = stateFromSliders(PRESETS[0].values, spec);
    expect(s.camera).toEqual({
      pos: spec.pos,
      target: spec.target,
      fov: 35,
      focus: 0,
      coreFocus: 1,
      frame: 0,
      track: { a: 0, b: 0, mix: 0, turn: 0 },
      landscape: { pos: spec.pos, frame: 0, mix: 0 },
      roll: 0,
    });
  });
});

describe('nudgeDrive', () => {
  it('moves the drive by exactly the step, without float noise', () => {
    expect(nudgeDrive(0.15, 0.02)).toBe(0.17);
    expect(nudgeDrive(0.15, -0.02)).toBe(0.13);
    expect(nudgeDrive(1.23456, 0.02)).toBe(1.25456);
  });

  it('stays within [0, DRIVE_MAX] and falls back to 0 for non-finite input', () => {
    expect(nudgeDrive(0.01, -0.02)).toBe(0);
    expect(nudgeDrive(DRIVE_MAX - 0.01, 0.02)).toBe(DRIVE_MAX);
    expect(nudgeDrive(Number.NaN, 0.02)).toBe(0.02);
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

describe('fitFov', () => {
  it('keeps the vertical fov in a landscape pane', () => {
    expect(fitFov(40, 1.6)).toBe(40);
    expect(fitFov(40, 1)).toBe(40);
  });

  it('widens it in a portrait pane so the horizontal fov is the framing fov', () => {
    const aspect = 0.63;
    const v = fitFov(40, aspect);
    const horizontal = (2 * Math.atan(Math.tan((v * Math.PI) / 360) * aspect) * 180) / Math.PI;
    expect(horizontal).toBeCloseTo(40, 9);
    expect(v).toBeGreaterThan(40);
  });

  it('falls back to the framing fov for a degenerate aspect', () => {
    expect(fitFov(40, 0)).toBe(40);
    expect(fitFov(40, Number.NaN)).toBe(40);
  });
});
