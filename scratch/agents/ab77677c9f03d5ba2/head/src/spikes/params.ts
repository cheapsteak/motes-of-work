// Query-string parameters of the render spikes.

/** A positive finite number from the query string, else the fallback. */
function positive(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null) return fallback;
  const x = Number(raw);
  return Number.isFinite(x) && x > 0 ? x : fallback;
}

export interface FillParams {
  n: number;
  dpr: number;
}

/** `?n=30000&dpr=1.5`. dpr is applied as given, so it may exceed 2. */
export function fillParams(search: string): FillParams {
  const p = new URLSearchParams(search);
  return { n: Math.floor(positive(p, 'n', 30_000)), dpr: positive(p, 'dpr', 1.5) };
}

export interface VertexParams extends FillParams {
  isolate: boolean;
}

/** `?n=100000&dpr=<device, capped at 2>&isolate=1`. */
export function vertexParams(search: string, devicePixelRatio: number): VertexParams {
  const p = new URLSearchParams(search);
  return {
    n: Math.floor(positive(p, 'n', 100_000)),
    dpr: positive(p, 'dpr', Math.min(devicePixelRatio, 2)),
    isolate: p.get('isolate') === '1',
  };
}
