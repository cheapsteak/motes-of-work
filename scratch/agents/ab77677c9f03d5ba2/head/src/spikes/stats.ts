/** Fixed-size rolling window of samples (the last `capacity`), with average and nearest-rank p95. */
export class RollingStats {
  private readonly samples: number[] = [];
  private next = 0;

  constructor(private readonly capacity: number) {}

  get count(): number {
    return this.samples.length;
  }

  push(x: number): void {
    if (!Number.isFinite(x)) return;
    if (this.samples.length < this.capacity) this.samples.push(x);
    else this.samples[this.next] = x;
    this.next = (this.next + 1) % this.capacity;
  }

  average(): number | null {
    if (this.samples.length === 0) return null;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }

  p95(): number | null {
    const n = this.samples.length;
    if (n === 0) return null;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.ceil(0.95 * n) - 1];
  }
}
