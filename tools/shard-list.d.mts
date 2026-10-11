export function listedTests(output: string): string[];
export function testKey(line: string): string;
export function medianTime(times: Record<string, number>): number;
export function dealShards(lines: readonly string[], total: number, times: Record<string, number>): string[][];
export function shardOf(lines: readonly string[], shard: number, total: number, times: Record<string, number>): string[];
