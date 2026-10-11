/** Anything that holds GPU resources until disposed (a mote system and its scene). */
export interface Disposable {
  dispose(): void;
}

/**
 * The comparison page's mote systems, keyed by mechanism and budget. Within one budget every
 * mechanism stays cached, so switching mechanisms back and forth is instant; entries at any other
 * budget are disposed by `keepOnly` when the budget changes (one budget serves every view).
 */
export class SystemCache<Id extends string, T extends Disposable> {
  private readonly entries = new Map<string, { budget: number; value: T }>();

  constructor(private readonly build: (id: Id, budget: number) => T) {}

  private static key(id: string, budget: number): string {
    return `${id}@${budget}`;
  }

  has(id: Id, budget: number): boolean {
    return this.entries.has(SystemCache.key(id, budget));
  }

  /** The cached entry, built on first use. */
  get(id: Id, budget: number): T {
    const key = SystemCache.key(id, budget);
    let e = this.entries.get(key);
    if (!e) {
      e = { budget, value: this.build(id, budget) };
      this.entries.set(key, e);
    }
    return e.value;
  }

  /** Dispose and forget every entry whose budget is not `budget`. */
  keepOnly(budget: number): void {
    for (const [key, e] of this.entries) {
      if (e.budget === budget) continue;
      e.value.dispose();
      this.entries.delete(key);
    }
  }

  /** Live keys, `<id>@<budget>`, in build order. */
  keys(): string[] {
    return [...this.entries.keys()];
  }
}
