// The comparison page's "Lighting (dev)" group (`?dev=1` only): a slider per scalar lighting constant,
// bound live to the lighting uniforms of every mote system on screen, and a "Copy as JSON" button
// so a tuning session ends in values to paste into LIGHTING. Defaults are read from
// src/scene/lighting.ts, never restated here. Pure definitions first, then the DOM.
import type { IUniform, Object3D } from 'three';
import { LIGHTING } from '../scene/lighting';
import { copyText } from '../spikes/results';

type LightingKey = keyof typeof LIGHTING;
type ScalarKey = { [K in LightingKey]: (typeof LIGHTING)[K] extends number ? K : never }[LightingKey];

export interface LightingSlider {
  key: ScalarKey;
  /** The uniform the materials are given for it (lightingUniforms: `keyStrength` → `uKeyStrength`). */
  uniform: string;
  label: string;
  /** The module's value: where the slider starts and what Reset returns to. */
  value: number;
  min: number;
  max: number;
  step: number;
}

const isScalar = (key: LightingKey): key is ScalarKey => typeof LIGHTING[key] === 'number';

/** `backfaceDim` → `Backface dim`. */
const sentence = (key: string): string => {
  const words = key.replace(/([A-Z])/g, ' $1').toLowerCase();
  return words[0].toUpperCase() + words.slice(1);
};

/** One slider per scalar in LIGHTING (keyDir, a direction, is not one). Dims and fractions run 0..1. */
export const LIGHTING_SLIDERS: readonly LightingSlider[] = (Object.keys(LIGHTING) as LightingKey[])
  .filter(isScalar)
  .map((key) => {
    const value = LIGHTING[key];
    return {
      key,
      uniform: `u${key[0].toUpperCase()}${key.slice(1)}`,
      label: sentence(key),
      value,
      min: 0,
      max: value < 1 ? 1 : Math.ceil(value * 2),
      step: 0.01,
    };
  });

export type LightingValues = Partial<Record<ScalarKey, number>>;

/** Set the lighting uniforms of every material under `object` (materials without them are skipped). */
export function applyLighting(object: Object3D, values: LightingValues): void {
  object.traverse((o) => {
    const material = (o as { material?: { uniforms?: Record<string, IUniform> } }).material;
    const uniforms = material?.uniforms;
    if (!uniforms) return;
    for (const s of LIGHTING_SLIDERS) {
      const v = values[s.key];
      if (v !== undefined && s.uniform in uniforms) uniforms[s.uniform].value = v;
    }
  });
}

/** The whole LIGHTING table with `values` applied, as pretty JSON. */
export function lightingJson(values: LightingValues): string {
  return JSON.stringify({ ...LIGHTING, ...values }, null, 2);
}

// ---------------------------------------------------------------------------------------------
// DOM

export interface LightingDev {
  /** Every scalar's current value. */
  values(): LightingValues;
}

/** Append the collapsed group to `root`; `onChange` fires on every slider move. */
export function createLightingDev(root: HTMLElement, onChange: () => void): LightingDev {
  const values: LightingValues = Object.fromEntries(LIGHTING_SLIDERS.map((s) => [s.key, s.value]));
  const details = document.createElement('details');
  details.id = 'lighting-dev';
  details.className = 'dev';
  const summary = document.createElement('summary');
  summary.textContent = 'Lighting (dev)';
  const rows = document.createElement('div');
  rows.className = 'sliders dev-sliders';
  details.append(summary, rows);

  const inputs = LIGHTING_SLIDERS.map((s) => {
    const id = `light-${s.key}`;
    const input = Object.assign(document.createElement('input'), {
      type: 'range',
      id,
      min: String(s.min),
      max: String(s.max),
      step: String(s.step),
    });
    input.dataset.light = s.key;
    const out = document.createElement('output');
    out.htmlFor.add(id);
    const label = Object.assign(document.createElement('label'), { htmlFor: id, textContent: s.label });
    const row = document.createElement('div');
    row.className = 'row';
    row.title = `${s.uniform}; ${s.value} in src/scene/lighting.ts`;
    row.append(label, input, out);
    rows.append(row);
    const show = (): void => {
      input.value = String(values[s.key]);
      out.textContent = (values[s.key] ?? s.value).toFixed(2);
    };
    input.addEventListener('input', () => {
      values[s.key] = Number(input.value);
      show();
      onChange();
    });
    show();
    return show;
  });

  // Copy, with the spike pages' fallback: when no copy method works, show the JSON selected.
  const copy = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Copy as JSON' });
  const reset = Object.assign(document.createElement('button'), {
    type: 'button',
    className: 'quiet',
    textContent: 'Reset',
    title: 'Back to the values in src/scene/lighting.ts',
  });
  const status = Object.assign(document.createElement('span'), { className: 'dev-status' });
  status.setAttribute('role', 'status');
  const area = Object.assign(document.createElement('textarea'), { readOnly: true, hidden: true, spellcheck: false });
  area.className = 'dev-json';
  const actions = document.createElement('div');
  actions.className = 'dev-actions';
  actions.append(copy, reset, status);
  details.append(actions, area);

  copy.addEventListener('click', async () => {
    area.value = lightingJson(values);
    if (await copyText(area.value)) {
      status.textContent = 'Copied';
      area.hidden = true;
    } else {
      status.textContent = 'Select the text below and copy it';
      area.hidden = false;
      area.focus();
      area.select();
    }
  });
  reset.addEventListener('click', () => {
    for (const s of LIGHTING_SLIDERS) values[s.key] = s.value;
    inputs.forEach((show) => show());
    status.textContent = '';
    onChange();
  });

  root.append(details);
  return { values: () => values };
}
