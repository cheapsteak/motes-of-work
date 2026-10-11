// The defect's dropout (re-skin Task 8b; the defect inspector's G5 lines, GK.drop with its gEvent and
// glitchParams' doDrop): now and then, for a few frames, one to three screen-space lines go dark across
// the focused defective piece. CPU only: once a frame it gives the shaders the lines (CSS px rows, from
// the top) and the piece's box, as uniforms (bodySystem.ts uDrop, uDropN, uDropBox); shell.vert.glsl and
// track.vert.glsl hide the piece's dots whose centres fall in a line inside the box, and body.frag.glsl
// discards its rim and fill there. A pure function of the ambient (on whole 1/LEAK.fps s frames) and
// the piece's disc on screen.
//
// Hashes: every draw is hash01 of the essay's seed mixed with what it is of, under a SALT name: a cell
// c's `pcg(MOTE_SEED ^ pcg(c)) + j` under dropCell (j 0 whether it fires, 1 its length, 2 its start),
// and its lines' `pcg(cellSeed ^ pcg(roll)) + j` under dropLine (roll: which pair of frames; j 0 the
// count, 2 n + 1 and 2 n + 2 line n's place and height).
import { MOTE_SEED } from '../../config';
import { hash01, pcg } from '../../math/hash';
import { SALT } from '../../math/salts';
import { DROPOUT, LEAK } from './birth';

/** The inspector's frame guard: an ambient a hair under a frame's start falls on that frame. */
const FRAME_EPS = 1e-6;

/** A dropout event at an ambient: its cell, its first frame (whole frames of the ambient), how many frames it lasts, and which of them this is. */
export interface DropoutEvent {
  cell: number;
  start: number;
  frames: number;
  frame: number;
  /** Its lines' seed for this pair of frames. */
  seed: number;
}

/** Cell c's seed (the essay's seed mixed with c). */
const cellSeed = (c: number): number => pcg((MOTE_SEED ^ pcg(c >>> 0)) >>> 0);

/**
 * The dropout event at ambient `t`, null if none: of its cell or the one before (an event may run into
 * the next cell's first frames), the one whose frames hold t's frame. A cell fires with probability
 * DROPOUT.p at intensity LEAK.intensity, for DROPOUT.frames whole frames, starting at a hashed frame
 * that keeps it inside its cell.
 */
export function dropoutEvent(t: number): DropoutEvent | null {
  const fps = LEAK.fps;
  const frame = Math.floor(t * fps + FRAME_EPS);
  const c0 = Math.floor(t / DROPOUT.cell);
  for (const c of [c0, c0 - 1]) {
    if (c < 0) continue;
    const seed = cellSeed(c);
    if (hash01(seed, SALT.dropCell) >= DROPOUT.p[0] + DROPOUT.p[1] * LEAK.intensity) continue;
    const span = DROPOUT.frames[1] - DROPOUT.frames[0] + 1;
    const frames = DROPOUT.frames[0] + Math.min(span - 1, Math.floor(hash01((seed + 1) >>> 0, SALT.dropCell) * span));
    const start = Math.floor((c * DROPOUT.cell + hash01((seed + 2) >>> 0, SALT.dropCell) * Math.max(0, DROPOUT.cell - frames / fps)) * fps + FRAME_EPS);
    if (frame < start || frame >= start + frames) continue;
    const roll = Math.floor((frame - start) / DROPOUT.reroll);
    return { cell: c, start, frames, frame: frame - start, seed: pcg((seed ^ pcg(roll >>> 0)) >>> 0) };
  }
  return null;
}

/**
 * The dark lines at ambient `t` on a piece whose centre is at (cx, cy) on screen and radius rPx (CSS
 * px, from the top left): each [top, bottom) a row band, within ± DROPOUT.spread rPx of its centre and
 * DROPOUT.heightPx tall at the scale rPx / DROPOUT.refRadiusPx; and the box they cut in, ± DROPOUT.box
 * rPx about the centre ([x0, y0, x1, y1]). No event, no lines.
 */
export function dropoutLines(t: number, cx: number, cy: number, rPx: number): { lines: [number, number][]; box: [number, number, number, number] } {
  const box: [number, number, number, number] = [cx - DROPOUT.box * rPx, cy - DROPOUT.box * rPx, cx + DROPOUT.box * rPx, cy + DROPOUT.box * rPx];
  const e = dropoutEvent(t);
  if (e === null) return { lines: [], box };
  const scale = rPx / DROPOUT.refRadiusPx;
  const n = Math.min(DROPOUT.maxLines, DROPOUT.lines[0] + Math.floor(hash01(e.seed, SALT.dropLine) * DROPOUT.lines[1] * (0.5 + LEAK.intensity)));
  const lines: [number, number][] = [];
  for (let j = 0; j < n; j++) {
    const y = cy + (hash01((e.seed + 2 * j + 1) >>> 0, SALT.dropLine) - 0.5) * 2 * DROPOUT.spread * rPx;
    const h = (DROPOUT.heightPx[0] + DROPOUT.heightPx[1] * hash01((e.seed + 2 * j + 2) >>> 0, SALT.dropLine)) * scale;
    lines.push([y, y + h]);
  }
  return { lines, box };
}
