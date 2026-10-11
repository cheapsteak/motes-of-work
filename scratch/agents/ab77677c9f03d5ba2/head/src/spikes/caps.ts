// Spike 5 (spec §10): point-size and clipping limits, the reason motes are quads and not
// gl_Points. Records ALIASED_POINT_SIZE_RANGE and the other limits the renderer leans on, on
// each test device. A small ALIASED_POINT_SIZE_RANGE maximum confirms the quads decision.
import { mountResultsPanel, rendererString } from './results';

const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');
const table = document.getElementById('caps') as HTMLElement;
const results = document.getElementById('results') as HTMLElement;

type CapValue = string | number | number[];
const caps: Record<string, CapValue> = {};
let renderer = 'no WebGL2';

if (gl) {
  renderer = rendererString(gl);
  const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array;
  caps.ALIASED_POINT_SIZE_RANGE = [range[0], range[1]];
  caps.MAX_VERTEX_UNIFORM_VECTORS = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number;
  caps.MAX_VERTEX_ATTRIBS = gl.getParameter(gl.MAX_VERTEX_ATTRIBS) as number;
  caps.MAX_TEXTURE_SIZE = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  for (const name of ['EXT_color_buffer_float', 'EXT_disjoint_timer_query_webgl2']) {
    caps[name] = gl.getExtension(name) ? 'yes' : 'no';
  }
}

function show(value: CapValue): string {
  return Array.isArray(value) ? `${value[0]} to ${value[1]}` : String(value);
}

const rows: Array<[string, string]> = [
  ['Renderer', renderer],
  ['Device pixel ratio', String(window.devicePixelRatio)],
  ...Object.entries(caps).map(([name, value]): [string, string] => [name, show(value)]),
];
for (const [name, value] of rows) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  th.textContent = name;
  const td = document.createElement('td');
  td.textContent = value;
  td.dataset.cap = name;
  tr.append(th, td);
  table.append(tr);
}
if (!gl) {
  const p = document.createElement('p');
  p.className = 'fail';
  p.textContent = 'WebGL2 is not available on this device.';
  table.after(p);
}

mountResultsPanel(results, () => ({
  spike: 'caps',
  ua: navigator.userAgent,
  renderer,
  devicePixelRatio: window.devicePixelRatio,
  caps,
}));
