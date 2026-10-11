// Spike 3 (spec §10): can a vertex shader texelFetch an RGBA32F texture on this device (iOS Safari
// is the doubt)? Decides the transform storage format. A 4×4 RGBA32F texture holds known values;
// the vertex shader fetches texel i and places a quad for each of the 16 at a position and a colour
// taken from it. The page reads the pixels back and compares them with what the texels say.
import { mountResultsPanel, rendererString } from './results';

const SIZE = 4;
const COUNT = SIZE * SIZE;
const CELL = 8; // pixels per quad cell in the 32×32 target

// Texel i = (x, y, 65536 + i, 1): x and y pick the cell of quad i. The z offset is exact in float32
// but overflows a half float (max 65504), so a silent downgrade to a lower-precision format fails.
const Z_OFFSET = 65536;
function texelData(): Float32Array {
  const data = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) data.set([i % SIZE, Math.floor(i / SIZE), Z_OFFSET + i, 1], i * 4);
  return data;
}

const VERTEX = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uTex;
out float vValue;
void main() {
  int instance = gl_VertexID / 6;
  int corner = gl_VertexID % 6;
  vec4 t = texelFetch(uTex, ivec2(instance % ${SIZE}, instance / ${SIZE}), 0);
  // Two triangles: corners (0,0) (1,0) (1,1) (0,0) (1,1) (0,1).
  vec2 c = vec2(float(corner == 1 || corner == 2 || corner == 4), float(corner == 2 || corner == 4 || corner == 5));
  vec2 cell = (t.xy + c) / ${SIZE}.0; // 0..1 across the target
  gl_Position = vec4(cell * 2.0 - 1.0, 0.0, 1.0);
  vValue = (t.z - ${Z_OFFSET}.0) / ${COUNT}.0; // i / 16, in [0, 1)
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in float vValue;
out vec4 outColor;
void main() { outColor = vec4(vValue, 0.0, 0.0, 1.0); }`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type) as WebGLShader;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
  return shader;
}

interface FloatTexResult {
  pass: boolean;
  maxError: number;
  expected: number[];
  observed: number[];
  error?: string;
}

/** Runs the spike; never throws (a failure is a FAIL result with the reason). */
function run(gl: WebGL2RenderingContext): FloatTexResult {
  const expected = Array.from({ length: COUNT }, (_, i) => Math.round((i / COUNT) * 255));
  try {
    const program = gl.createProgram() as WebGLProgram;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SIZE, SIZE, 0, gl.RGBA, gl.FLOAT, texelData());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.viewport(0, 0, SIZE * CELL, SIZE * CELL);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.uniform1i(gl.getUniformLocation(program, 'uTex'), 0);
    gl.bindVertexArray(gl.createVertexArray()); // attribute-less draw: positions come from gl_VertexID
    gl.drawArrays(gl.TRIANGLES, 0, COUNT * 6);

    const pixels = new Uint8Array(SIZE * CELL * SIZE * CELL * 4);
    gl.readPixels(0, 0, SIZE * CELL, SIZE * CELL, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    // Sample the centre of each quad's cell.
    const observed: number[] = [];
    for (let i = 0; i < COUNT; i++) {
      const x = (i % SIZE) * CELL + CELL / 2;
      const y = Math.floor(i / SIZE) * CELL + CELL / 2;
      observed.push(pixels[(y * SIZE * CELL + x) * 4]);
    }
    const maxError = Math.max(...observed.map((o, i) => Math.abs(o - expected[i])));
    // One 8-bit step of slack for rounding in the fragment output.
    return { pass: maxError <= 1, maxError, expected, observed };
  } catch (e) {
    return { pass: false, maxError: NaN, expected, observed: [], error: e instanceof Error ? e.message : String(e) };
  }
}

const canvas = document.createElement('canvas');
canvas.width = SIZE * CELL;
canvas.height = SIZE * CELL;
const gl = canvas.getContext('webgl2');
const verdict = document.getElementById('verdict') as HTMLElement;
const detail = document.getElementById('detail') as HTMLElement;
const page = document.getElementById('results') as HTMLElement;

let result: FloatTexResult;
let renderer = 'no WebGL2';
if (gl) {
  result = run(gl);
  renderer = rendererString(gl);
} else {
  result = { pass: false, maxError: NaN, expected: [], observed: [], error: 'WebGL2 is not available' };
}

verdict.textContent = result.pass ? 'PASS' : 'FAIL';
verdict.className = result.pass ? 'pass' : 'fail';
detail.textContent = result.error
  ? `Error: ${result.error}`
  : `Largest difference ${result.maxError} of 255 across ${COUNT} fetched texels.`;

mountResultsPanel(page, () => ({
  spike: 'floattex',
  ua: navigator.userAgent,
  renderer,
  devicePixelRatio: window.devicePixelRatio,
  pass: result.pass,
  maxError: Number.isFinite(result.maxError) ? result.maxError : null,
  expected: result.expected,
  observed: result.observed,
  error: result.error ?? null,
}));
