/** Pure scroll/progress math. Every function clamps and maps NaN to 0. */

export interface SectionSpan {
  id: string;
  start: number;
  end: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return x === Infinity ? 1 : 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Contiguous spans over [0,1], each weighted by its length (viewport heights). */
export function sectionSpans(sections: { id: string; length: number }[]): SectionSpan[] {
  const total = sections.reduce((sum, s) => sum + s.length, 0);
  // No usable weights (all lengths zero): split evenly instead of dividing by 0.
  const even = !(Number.isFinite(total) && total > 0);
  const n = sections.length;
  let acc = 0;
  return sections.map((s, i) => {
    const start = even ? i / n : acc / total;
    acc += s.length;
    // Pin the last end to exactly 1 so float accumulation never leaves a gap.
    const end = i === n - 1 ? 1 : even ? (i + 1) / n : acc / total;
    return { id: s.id, start, end };
  });
}

export function progressFromScroll(scrollY: number, scrollHeight: number, viewportH: number): number {
  const range = scrollHeight - viewportH;
  if (!Number.isFinite(range) || range <= 0 || Number.isNaN(scrollY)) return 0;
  return clamp01(scrollY / range);
}

/** Integer scroll position for a progress value (inverse of progressFromScroll to within 1px). */
export function scrollYForProgress(p: number, scrollHeight: number, viewportH: number): number {
  const range = scrollHeight - viewportH;
  if (!Number.isFinite(range) || range <= 0) return 0;
  return Math.round(clamp01(p) * range);
}

export function locate(p: number, spans: SectionSpan[]): { index: number; id: string; local: number } {
  if (spans.length === 0) throw new Error('locate: no sections');
  const q = clamp01(p);
  let index = spans.length - 1;
  for (let i = 0; i < spans.length; i++) {
    if (q < spans[i].end) {
      index = i;
      break;
    }
  }
  const { id, start, end } = spans[index];
  const width = end - start;
  const local = width > 0 ? clamp01((q - start) / width) : 0;
  return { index, id, local };
}
