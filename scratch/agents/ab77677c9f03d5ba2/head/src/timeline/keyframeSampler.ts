import { lerp, lerpVec3, isVec3, type Vec3 } from '../math/vec';
import type { SectionSpan } from '../scroll/progress';
import { EASINGS, type EaseName } from './easing';
import type { Sampler } from './sampler';
import { defaultSceneState, SCENE_STATE_PATHS, setPath, type SceneState } from './sceneState';

export interface Keyframe {
  at: number | string;
  value: number | Vec3;
  ease?: EaseName;
}
export interface KeyframeFile {
  tracks: Record<string, Keyframe[]>;
}

export class KeyframeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyframeError';
  }
}

interface Key {
  at: number;
  value: number | Vec3;
  ease: (t: number) => number;
}
interface Track {
  path: string;
  kind: 'number' | 'vec3';
  keys: Key[];
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function resolveAt(path: string, i: number, at: unknown, spans: SectionSpan[]): number {
  const where = `track "${path}" key ${i}`;
  if (typeof at === 'number') {
    if (!Number.isFinite(at) || at < 0 || at > 1) throw new KeyframeError(`${where}: "at" must be within [0,1], got ${at}`);
    return at;
  }
  if (typeof at !== 'string') throw new KeyframeError(`${where}: "at" must be a number or "<sectionId>@<local>"`);
  const sep = at.lastIndexOf('@');
  if (sep < 0) throw new KeyframeError(`${where}: "at" string "${at}" must look like "<sectionId>@<local>"`);
  const id = at.slice(0, sep);
  const localText = at.slice(sep + 1).trim();
  const local = localText === '' ? NaN : Number(localText);
  const span = spans.find((s) => s.id === id);
  if (!span) throw new KeyframeError(`${where}: unknown section id "${id}"`);
  if (!Number.isFinite(local) || local < 0 || local > 1) {
    throw new KeyframeError(`${where}: local position in "${at}" must be within [0,1]`);
  }
  return span.start + local * (span.end - span.start);
}

function compile(path: string, frames: unknown, spans: SectionSpan[]): Track {
  const kind = Object.hasOwn(SCENE_STATE_PATHS, path) ? SCENE_STATE_PATHS[path] : undefined;
  if (kind === undefined) throw new KeyframeError(`track "${path}": unknown scene state path`);
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new KeyframeError(`track "${path}": must be a non-empty array of keyframes`);
  }
  const keys: Key[] = [];
  frames.forEach((raw: unknown, i) => {
    const where = `track "${path}" key ${i}`;
    if (typeof raw !== 'object' || raw === null) throw new KeyframeError(`${where}: keyframe must be an object`);
    const f = raw as Partial<Keyframe>;
    const at = resolveAt(path, i, f.at, spans);
    if (i > 0 && !(at > keys[i - 1].at)) {
      throw new KeyframeError(`${where}: "at" must be strictly increasing (${at} after ${keys[i - 1].at})`);
    }
    if (kind === 'number') {
      if (typeof f.value !== 'number') throw new KeyframeError(`${where}: expected a number value`);
      if (!Number.isFinite(f.value)) throw new KeyframeError(`${where}: value must be finite`);
    } else {
      if (!Array.isArray(f.value) || f.value.length !== 3) throw new KeyframeError(`${where}: expected a [x, y, z] value`);
      if (!isVec3(f.value)) throw new KeyframeError(`${where}: vec3 components must be finite numbers`);
    }
    const easeName = f.ease ?? 'linear';
    if (typeof easeName !== 'string' || !Object.hasOwn(EASINGS, easeName)) {
      throw new KeyframeError(`${where}: unknown ease "${String(easeName)}"`);
    }
    const value = kind === 'vec3' ? ([...(f.value as Vec3)] as Vec3) : (f.value as number);
    keys.push({ at, value, ease: EASINGS[easeName as EaseName] });
  });
  return { path, kind, keys };
}

function evaluate(track: Track, p: number): number | Vec3 {
  const { keys, kind } = track;
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (p <= first.at) return first.value;
  if (p >= last.at) return last.value;
  let i = 1;
  while (keys[i].at <= p) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const e = b.ease((p - a.at) / (b.at - a.at));
  return kind === 'vec3' ? lerpVec3(a.value as Vec3, b.value as Vec3, e) : lerp(a.value as number, b.value as number, e);
}

/** No DOM and no three.js: a Theatre.js sampler will sit beside this one behind `Sampler`. */
export class KeyframeSampler implements Sampler {
  private readonly tracks: Track[];

  constructor(file: KeyframeFile, spans: SectionSpan[]) {
    if (typeof file !== 'object' || file === null || typeof file.tracks !== 'object' || file.tracks === null) {
      throw new KeyframeError('keyframe file must have a "tracks" object');
    }
    this.tracks = Object.entries(file.tracks).map(([path, frames]) => compile(path, frames, spans));
  }

  sample(progress: number): SceneState {
    const p = clamp01(progress);
    const state = defaultSceneState();
    for (const t of this.tracks) setPath(state, t.path, evaluate(t, p));
    return state;
  }
}
