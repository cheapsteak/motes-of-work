import { describe, expect, it } from 'vitest';
import { createGpuTimer, type TimerGl } from './gpuTimer';

// A scripted GL: the test decides when each query becomes available and whether the GPU was disjoint.
const EXT = { TIME_ELAPSED_EXT: 0x88bf, GPU_DISJOINT_EXT: 0x8fbb };
const QUERY_RESULT = 0x8866;
const QUERY_RESULT_AVAILABLE = 0x8867;

interface FakeQuery {
  ready: boolean;
  ns: number;
  deleted: boolean;
}

function fakeGl() {
  const queries: FakeQuery[] = [];
  const state = { disjoint: false, active: 0 };
  const gl: TimerGl = {
    QUERY_RESULT,
    QUERY_RESULT_AVAILABLE,
    createQuery: () => {
      const q: FakeQuery = { ready: false, ns: 0, deleted: false };
      queries.push(q);
      return q as unknown as WebGLQuery;
    },
    beginQuery: () => void state.active++,
    endQuery: () => void state.active--,
    deleteQuery: (q) => void ((q as unknown as FakeQuery).deleted = true),
    getQueryParameter: (q, pname) =>
      pname === QUERY_RESULT_AVAILABLE ? (q as unknown as FakeQuery).ready : (q as unknown as FakeQuery).ns,
    getParameter: (pname) => (pname === EXT.GPU_DISJOINT_EXT ? state.disjoint : null),
    getExtension: (name) => (name === 'EXT_disjoint_timer_query_webgl2' ? EXT : null),
  };
  return { gl, queries, state };
}

describe('createGpuTimer', () => {
  it('is null when the extension is missing', () => {
    const { gl } = fakeGl();
    gl.getExtension = () => null;
    expect(createGpuTimer(gl)).toBeNull();
  });

  it('converts a ready query from nanoseconds to milliseconds, and never blocks on an unready one', () => {
    const { gl, queries, state } = fakeGl();
    const timer = createGpuTimer(gl)!;
    timer.begin();
    expect(state.active).toBe(1);
    timer.end();
    expect(state.active).toBe(0);
    expect(timer.collect()).toEqual([]);
    queries[0].ready = true;
    queries[0].ns = 2_500_000;
    expect(timer.collect()).toEqual([2.5]);
    expect(queries[0].deleted).toBe(true);
    expect(timer.collect()).toEqual([]); // consumed once
  });

  it('collects ready queries in order and stops at the first unready one', () => {
    const { gl, queries } = fakeGl();
    const timer = createGpuTimer(gl)!;
    for (let i = 0; i < 3; i++) {
      timer.begin();
      timer.end();
    }
    queries[0].ready = true;
    queries[0].ns = 1_000_000;
    queries[2].ready = true;
    queries[2].ns = 3_000_000;
    expect(timer.collect()).toEqual([1]); // query 1 is still in flight, so 2 waits behind it
    queries[1].ready = true;
    queries[1].ns = 2_000_000;
    expect(timer.collect()).toEqual([2, 3]);
  });

  it('discards every pending sample when the GPU was disjoint', () => {
    const { gl, queries, state } = fakeGl();
    const timer = createGpuTimer(gl)!;
    for (let i = 0; i < 2; i++) {
      timer.begin();
      timer.end();
      queries[i].ready = true;
      queries[i].ns = 9_000_000;
    }
    state.disjoint = true;
    expect(timer.collect()).toEqual([]);
    expect(queries.every((q) => q.deleted)).toBe(true);
    // The next, clean sample is reported normally.
    state.disjoint = false;
    timer.begin();
    timer.end();
    queries[2].ready = true;
    queries[2].ns = 1_500_000;
    expect(timer.collect()).toEqual([1.5]);
  });

  it('bounds the queue when results never arrive', () => {
    const { gl, queries } = fakeGl();
    const timer = createGpuTimer(gl)!;
    for (let i = 0; i < 200; i++) {
      timer.begin();
      timer.end();
    }
    expect(queries.filter((q) => !q.deleted).length).toBeLessThanOrEqual(64);
  });
});
