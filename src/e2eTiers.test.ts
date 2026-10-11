// The e2e suite's two tiers (e2e/tiers.ts): every spec file runs in `npm run e2e:full`, and every one
// but the full-only set runs in `npm run e2e:task`. Each tier is listed by Playwright itself, with the
// package's own script, so a file the config does not collect, a script that drifts, or a file tagged
// into the full-only set by mistake fails here. Changing the full-only set is a change to this test.
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { FULL_ONLY } from '../e2e/tiers';

/** The spec files that run only in the full tier (the brief's three slowest that a task can spare). */
const FULL_ONLY_FILES = ['pages.spec.ts', 'purity.spec.ts', 'reducedMotion.spec.ts'];

const run = promisify(execFile);
const scripts = (JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }).scripts;

interface Spec {
  title: string;
  tags: string[];
}
interface Suite {
  file: string;
  specs?: Spec[];
  suites?: Suite[];
}

/** Every test a tier's script would run, per file (Playwright's own listing; no server is started). */
async function listed(script: string): Promise<Map<string, Spec[]>> {
  const [bin, ...args] = scripts[script].split(' ');
  expect(bin, `${script} runs playwright`).toBe('playwright');
  const { stdout } = await run('npx', ['playwright', ...args, '--list', '--reporter=json'], { maxBuffer: 64 << 20 });
  const report = JSON.parse(stdout) as { suites: Suite[]; errors: unknown[] };
  expect(report.errors, `${script} lists without errors`).toEqual([]);
  const out = new Map<string, Spec[]>();
  const walk = (s: Suite): void => {
    out.set(s.file, [...(out.get(s.file) ?? []), ...(s.specs ?? [])]);
    s.suites?.forEach(walk);
  };
  report.suites.forEach(walk);
  return out;
}

/** The files in e2e/ that hold Playwright tests: they import `test` from @playwright/test. */
const testFiles = readdirSync('e2e')
  .filter((f) => /\.[cm]?[jt]sx?$/.test(f))
  .filter((f) => /import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"]/.test(readFileSync(`e2e/${f}`, 'utf8')))
  .sort();

describe('the e2e tiers', () => {
  it('every file of e2e tests runs in a tier: all of them in e2e:full, all but the full-only set in e2e:task, each whole', { timeout: 120_000 }, async () => {
    expect(scripts['e2e:full']).toBe(scripts.e2e);
    // One listing at a time: each is a Playwright process that loads every spec, beside the suite's workers.
    const full = await listed('e2e:full');
    const task = await listed('e2e:task');
    expect(testFiles.length).toBeGreaterThan(10);
    // A file in neither tier: one the config does not collect, or one whose every test is filtered out.
    expect([...full.keys()].sort(), 'files e2e:full runs').toEqual(testFiles);
    expect([...task.keys()].sort(), 'files e2e:task runs').toEqual(testFiles.filter((f) => !FULL_ONLY_FILES.includes(f)));
    for (const [file, specs] of full) {
      expect(specs.length, `${file} lists tests`).toBeGreaterThan(0);
      // The JSON reporter lists a tag without its '@'.
      const tagged = specs.filter((s) => s.tags.includes(FULL_ONLY.slice(1)));
      // A file sits in one tier whole: every test of a full-only file is tagged, and none of any other.
      expect(tagged.length, file).toBe(FULL_ONLY_FILES.includes(file) ? specs.length : 0);
      if (!FULL_ONLY_FILES.includes(file)) expect(task.get(file)?.length, `${file}: every test in e2e:task`).toBe(specs.length);
    }
  });
});
