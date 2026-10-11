import { describe, expect, it } from 'vitest';
import { SystemCache } from './systemCache';

function fixture() {
  const built: string[] = [];
  const disposed: string[] = [];
  const cache = new SystemCache<'a' | 'b', { dispose(): void }>((id, budget) => {
    const key = `${id}@${budget}`;
    built.push(key);
    return { dispose: () => disposed.push(key) };
  });
  return { cache, built, disposed };
}

describe('SystemCache', () => {
  it('builds each mechanism and budget once', () => {
    const { cache, built } = fixture();
    const first = cache.get('a', 30_000);
    expect(cache.get('a', 30_000)).toBe(first);
    cache.get('b', 30_000);
    cache.get('a', 100_000);
    expect(built).toEqual(['a@30000', 'b@30000', 'a@100000']);
  });

  it('keeps every mechanism at the current budget and disposes the rest', () => {
    const { cache, disposed } = fixture();
    cache.get('a', 100_000);
    cache.get('b', 100_000);
    cache.get('a', 30_000);
    cache.keepOnly(30_000);
    expect(disposed.sort()).toEqual(['a@100000', 'b@100000']);
    expect(cache.keys()).toEqual(['a@30000']);
    expect(cache.has('a', 100_000)).toBe(false);
    cache.keepOnly(30_000); // idempotent: nothing left to dispose
    expect(disposed).toHaveLength(2);
  });

  it('rebuilds an entry after it was disposed', () => {
    const { cache, built } = fixture();
    cache.get('a', 100_000);
    cache.keepOnly(30_000);
    cache.get('a', 100_000);
    expect(built).toEqual(['a@100000', 'a@100000']);
  });
});
