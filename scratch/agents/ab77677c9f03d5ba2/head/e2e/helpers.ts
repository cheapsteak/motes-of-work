import type { Page } from '@playwright/test';
import { PNG } from 'pngjs';
import { sectionSpans, type SectionSpan } from '../src/scroll/progress';

// Shared by the rewind-invariant and section-screenshot specs. Pages use ?test=1 so frames render
// only on change and shimmer is off; every shot is of the canvas alone with the story panels hidden
// (element screenshots are composited, so panel text would add antialiasing noise).

interface Motes {
  frames(): number;
  settle(): Promise<void>;
}

export async function openStage(page: Page, query = ''): Promise<void> {
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: Motes }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await page.addStyleTag({ content: '#story { visibility: hidden; }' });
  await settle(page);
}

/**
 * `settle()` resolves two quiet frames after the last scroll/resize event, which is correct by a
 * one-frame margin. Wait one more animation frame so the render it triggered has certainly run.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await (window as unknown as { __motes: Motes }).__motes.settle();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

/** Integer scrollY for progress `p`: the formula of `scrollYForProgress`, evaluated in the page. */
export function targetScrollY(page: Page, p: number): Promise<number> {
  return page.evaluate((q) => {
    const range = document.documentElement.scrollHeight - window.innerHeight;
    if (!Number.isFinite(range) || range <= 0) return 0;
    return Math.round(Math.min(1, Math.max(0, q)) * range);
  }, p);
}

export const scrollY = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);

/** Progress spans from the story DOM (`[data-section]` and its `--length`), never hard-coded. */
export async function readSpans(page: Page): Promise<SectionSpan[]> {
  const sections = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('section[data-section]')].map((s) => ({
      id: s.dataset.section as string,
      length: Number(s.style.getPropertyValue('--length')),
    })),
  );
  if (sections.length === 0) throw new Error('no [data-section] elements in the page');
  for (const s of sections) {
    if (!Number.isFinite(s.length) || s.length <= 0) throw new Error(`section ${s.id}: bad --length ${s.length}`);
  }
  return sectionSpans(sections);
}

/** Stage background, #0B0D12. */
const BACKGROUND = [0x0b, 0x0d, 0x12];

/** Pixels of a PNG whose colour differs from the stage background by more than 24 on any channel. */
export function countNonBackground(png: Buffer): number {
  const { width, height, data } = PNG.sync.read(png);
  let n = 0;
  for (let i = 0; i < width * height; i++) {
    for (let c = 0; c < 3; c++) {
      if (Math.abs(data[i * 4 + c] - BACKGROUND[c]) > 24) {
        n++;
        break;
      }
    }
  }
  return n;
}

export function canvasShot(page: Page, path?: string): Promise<Buffer> {
  return page.locator('#stage').screenshot(path === undefined ? {} : { path });
}
