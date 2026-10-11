import { describe, expect, it } from 'vitest';
import {
  defaultSceneState,
  FAULT_KEYS,
  mergeState,
  SCENE_STATE_PATHS,
  setPath,
  ZERO_FAULTS,
} from './sceneState';

function leafPaths(node: unknown, prefix = '', out: Record<string, 'number' | 'vec3'> = {}) {
  if (typeof node === 'number') out[prefix] = 'number';
  else if (Array.isArray(node)) {
    expect(node).toHaveLength(3);
    out[prefix] = 'vec3';
  } else {
    for (const [k, v] of Object.entries(node as object)) leafPaths(v, prefix ? `${prefix}.${k}` : k, out);
  }
  return out;
}

describe('SCENE_STATE_PATHS', () => {
  it('lists exactly the leaves of defaultSceneState(), with matching kinds', () => {
    const walked = leafPaths(defaultSceneState());
    expect(new Set(Object.keys(SCENE_STATE_PATHS))).toEqual(new Set(Object.keys(walked)));
    expect(SCENE_STATE_PATHS).toEqual(walked);
  });
});

describe('defaults', () => {
  it('matches the spec defaults', () => {
    const s = defaultSceneState();
    expect(s.camera).toEqual({ pos: [0, 0, 3.1], target: [0, 0, 0], fov: 40, focus: 0, coreFocus: 0 });
    expect(s.mech).toEqual({ assembly: 1, variant: 0, drive: 0, faults: ZERO_FAULTS, ghost: 0 });
    expect(s.motes).toEqual({ human: 0, agent: 1, dialogue: 0, activity: 0 });
    expect(s.workshop).toEqual({ copies: 1, spread: 0 });
    expect(s.clock).toBe(0);
  });
  it('FAULT_KEYS covers every fault', () => {
    expect(new Set(FAULT_KEYS)).toEqual(new Set(Object.keys(ZERO_FAULTS)));
    expect(FAULT_KEYS).toHaveLength(7);
  });
  it('returns an independent object each call', () => {
    const a = defaultSceneState();
    a.camera.pos[0] = 99;
    a.mech.faults.drift = 1;
    expect(defaultSceneState().camera.pos[0]).toBe(0);
    expect(ZERO_FAULTS.drift).toBe(0);
  });
});

describe('setPath', () => {
  it('sets nested numbers and copies vec3 values', () => {
    const s = defaultSceneState();
    setPath(s, 'mech.faults.drift', 0.7);
    const v: [number, number, number] = [1, 2, 3];
    setPath(s, 'camera.pos', v);
    v[0] = 9;
    expect(s.mech.faults.drift).toBe(0.7);
    expect(s.camera.pos).toEqual([1, 2, 3]);
  });
  it('throws on unknown paths and wrong shapes', () => {
    const s = defaultSceneState();
    expect(() => setPath(s, 'nope.x', 1)).toThrow(/nope\.x/);
    expect(() => setPath(s, 'camera.pos', 1)).toThrow(/camera\.pos/);
    expect(() => setPath(s, 'camera.fov', [1, 2, 3])).toThrow(/camera\.fov/);
    expect(() => setPath(s, '__proto__', 1)).toThrow();
  });
});

describe('mergeState', () => {
  it('sets known keys and ignores unknown ones', () => {
    const base = defaultSceneState();
    const m = mergeState(base, { mech: { assembly: 0.3 }, bogus: 1 });
    expect(m.mech.assembly).toBe(0.3);
    expect('bogus' in m).toBe(false);
    expect(m.mech.faults).toEqual(ZERO_FAULTS);
    expect(base.mech.assembly).toBe(1);
  });
  it('merges vec3 leaves and ignores malformed ones', () => {
    const m = mergeState(defaultSceneState(), { camera: { pos: [1, 2, 3], target: [1, 2], fov: 'wide' } });
    expect(m.camera.pos).toEqual([1, 2, 3]);
    expect(m.camera.target).toEqual([0, 0, 0]);
    expect(m.camera.fov).toBe(40);
  });
  it('ignores non-finite numbers and non-object partials', () => {
    expect(mergeState(defaultSceneState(), { clock: NaN }).clock).toBe(0);
    expect(mergeState(defaultSceneState(), null)).toEqual(defaultSceneState());
    expect(mergeState(defaultSceneState(), 'x')).toEqual(defaultSceneState());
  });
  it('does not pollute prototypes', () => {
    mergeState(defaultSceneState(), JSON.parse('{"__proto__":{"polluted":1}}'));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
