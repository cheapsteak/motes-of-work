// GPU frame time through EXT_disjoint_timer_query_webgl2. Results arrive a few frames late, so
// queries queue up and `collect()` drains the ones that are ready without ever blocking.

/** The slice of WebGL2RenderingContext the timer uses (a fake satisfies it in tests). */
export interface TimerGl {
  readonly QUERY_RESULT: number;
  readonly QUERY_RESULT_AVAILABLE: number;
  createQuery(): WebGLQuery;
  beginQuery(target: number, query: WebGLQuery): void;
  endQuery(target: number): void;
  deleteQuery(query: WebGLQuery): void;
  getQueryParameter(query: WebGLQuery, pname: number): unknown;
  getParameter(pname: number): unknown;
  getExtension(name: string): unknown;
}

interface TimerExt {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

export interface GpuTimer {
  begin(): void;
  end(): void;
  /** GPU milliseconds of every finished frame since the last call, oldest first. */
  collect(): number[];
}

/**
 * Queries still unread beyond this are dropped, so results that never arrive cannot leak. Generous on
 * purpose: a software renderer (SwiftShader) reports results more than 8 frames late.
 */
const MAX_PENDING = 64;

/** A timer for `gl`, or null when the extension is unavailable. */
export function createGpuTimer(gl: TimerGl): GpuTimer | null {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null;
  if (!ext) return null;
  const pending: WebGLQuery[] = [];
  let open: WebGLQuery | null = null;

  return {
    begin() {
      if (open) return; // one TIME_ELAPSED query may be active at a time
      open = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, open);
    },

    end() {
      if (!open) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(open);
      open = null;
      while (pending.length > MAX_PENDING) gl.deleteQuery(pending.shift() as WebGLQuery);
    },

    collect() {
      const out: number[] = [];
      // A disjoint event (clock change, context power event) invalidates every sample in flight.
      if (gl.getParameter(ext.GPU_DISJOINT_EXT) === true) {
        for (const q of pending.splice(0)) gl.deleteQuery(q);
        return out;
      }
      while (pending.length > 0 && gl.getQueryParameter(pending[0], gl.QUERY_RESULT_AVAILABLE) === true) {
        const q = pending.shift() as WebGLQuery;
        out.push(Number(gl.getQueryParameter(q, gl.QUERY_RESULT)) / 1e6);
        gl.deleteQuery(q);
      }
      return out;
    },
  };
}
