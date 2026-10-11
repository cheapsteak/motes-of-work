export function listedTests(output: string): string[];
export function testKey(line: string): string;
export function medianTime(times: Record<string, number>): number;
export function dealShards(lines: readonly string[], total: number, times: Record<string, number>): string[][];
export function shardOf(lines: readonly string[], shard: number, total: number, times: Record<string, number>): string[];
export function playwrightList(args: string[], cwd?: string): string[];
export function verifyReadBack(dealt: readonly string[], readBack: readonly string[]): void;
export function shardTests(options: { shard: number; total: number; args: string[]; times: Record<string, number>; cwd?: string }): string[];
