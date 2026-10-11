// Test-only. A check run at many thousands of samples is cheap; an `expect` per sample is not (vitest's
// expect costs microseconds a call, and it was most of the time of the sweeps that call it per sample).
// Such a sweep tests each sample with plain comparisons, written as the negation of what must hold so
// NaN fails as the matcher would fail it, adds each failure here, and holds the count to 0 once.

/** The failures of a sweep: how many, and the first FIRST of them as written. */
export class Fails {
  static readonly FIRST = 20;
  count = 0;
  readonly first: string[] = [];

  /** One failed sample: `what` names it and says what it was. */
  add(what: string): void {
    this.count++;
    if (this.first.length < Fails.FIRST) this.first.push(what);
  }

  /** The message for the final expect: the count and the first failures, one a line. */
  toString(): string {
    return `${this.count} failed${this.count > this.first.length ? `, the first ${this.first.length}` : ''}:\n${this.first.join('\n')}`;
  }
}
