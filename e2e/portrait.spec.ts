import { expect, test, type Page } from '@playwright/test';
import { settle } from './helpers';

// Portrait (a phone held upright): the text takes the top of the screen over a scrim (its place and
// its pages are pinned for both sizes in e2e/pages.spec.ts). Where the camera puts the machine is
// pinned by the rig's unit tests (src/scene/portrait.test.ts) and the clearance test.

test.setTimeout(120_000);
test.use({ viewport: { width: 390, height: 844 } });

const QUERY = '&mech=bike&n=3000';

async function open(page: Page, query = QUERY): Promise<string[]> {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`/?test=1${query}`);
  await page.waitForFunction(() => {
    const m = (window as unknown as { __motes?: { frames(): number } }).__motes;
    return m !== undefined && m.frames() >= 1;
  });
  await settle(page);
  return errors;
}

test('portrait lays a fixed scrim under the text band, draws nothing behind a panel, and lowers the vignette', async ({ page }) => {
  const errors = await open(page);
  const look = await page.evaluate(() => {
    const scrim = getComputedStyle(document.getElementById('story') as HTMLElement, '::before');
    return {
      pool: getComputedStyle(document.querySelector('.panel') as HTMLElement, '::before').content,
      scrim: { position: scrim.position, pointerEvents: scrim.pointerEvents, image: scrim.backgroundImage },
      vignette: getComputedStyle(document.body, '::after').backgroundImage,
    };
  });
  expect(look.pool).toBe('none');
  expect(look.scrim.position).toBe('fixed');
  expect(look.scrim.pointerEvents).toBe('none');
  expect(look.scrim.image).toBe('linear-gradient(rgba(11, 13, 18, 0.72) 0px, rgba(11, 13, 18, 0.45) 22svh, rgba(0, 0, 0, 0) 42svh)');
  expect(look.vignette).toMatch(/at 50% 64%/);
  expect(errors).toEqual([]);
});
