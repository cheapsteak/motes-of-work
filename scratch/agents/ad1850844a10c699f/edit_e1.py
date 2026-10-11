import os

os.chdir('/home/user/motes-of-work')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


B = 'e2e/brief.spec.ts'
rep(B, """test("the brief has four lines, none met at the start and all met by the end of the cold open", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  expect(await met(page)).toEqual([false, false, false, false]);
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true]);""", """test("the brief has six lines, none met at the start and all met by the end of the cold open", async ({
  page,
}) => {
  const errors = await open(page, BIKE);
  expect(await met(page)).toEqual([false, false, false, false, false, false]);
  const [vibeBuild] = await readSpans(page);
  await scrollToProgress(page, vibeBuild.end - 0.001);
  expect(await met(page)).toEqual([true, true, true, true, true, true]);""")

T = 'e2e/text.spec.ts'
rep(T, """    await expect(page.locator('ul.brief > li')).toHaveCount(4);""", """    await expect(page.locator('ul.brief > li')).toHaveCount(6);""")

S = 'e2e/shots.spec.ts'
rep(S, """ * The cold open's named frames (docs/specs/2026-10-05-act-1-build-and-orbit.md §6, test 16, and
 * §2.1a), section-local in vibe-build: the ask alone; each brief line just as it has come up, its
 * parts already in flight (they set out with it), and again just after it lights (keyframes.test.ts
 * pins the lighting at 0.2483, 0.3628, 0.5189 and 0.8); the front wheel at one lock; the frame as it
 * is laid; and the lap at its low pass, crane, diagram and dive.
 */
const COLD_OPEN: [name: string, local: number][] = [
  ['vb-brief-ask', 0.1484375],
  ['vb-brief-line1', 0.190625],
  ['vb-brief-line1-lit', 0.251],
  ['vb-brief-line2', 0.315625],
  ['vb-brief-line2-lit', 0.366],
  ['vb-brief-line3', 0.4875],
  ['vb-brief-line3-lit', 0.522],
  ['vb-brief-line4', 0.70625],
  ['vb-brief-line4-lit', 0.803],
  ['vb-turn-lock', 0.5625],
  ['vb-frame-knot', 0.7171875],
  ['vb-frame-mid', 0.7546875],
  ['vb-frame-stays', 0.7859375],""", """ * The cold open's named frames (docs/specs/2026-10-05-act-1-build-and-orbit.md §6, test 16, §2.1a
 * and §2.1b), section-local in vibe-build: the ask alone; each brief line just as it has come up,
 * its parts already in flight (they set out with it), and again just after it lights
 * (keyframes.test.ts pins the lighting at 0.2201, 0.3225, 0.4612, 0.6667, 0.8139 and 0.8222); the
 * front wheel at one lock; the basket dropping onto the fork; the frame as it is laid; and the lap
 * at its low pass, crane, diagram and dive. Line 4 is the basket's, line 5 the frame's and line 6
 * the mudguards'.
 */
const COLD_OPEN: [name: string, local: number][] = [
  ['vb-brief-ask', 0.13194444],
  ['vb-brief-line1', 0.16944444],
  ['vb-brief-line1-lit', 0.222],
  ['vb-brief-line2', 0.28055556],
  ['vb-brief-line2-lit', 0.325],
  ['vb-brief-line3', 0.43333333],
  ['vb-brief-line3-lit', 0.46388889],
  ['vb-brief-line4', 0.6],
  ['vb-brief-line4-lit', 0.67083333],
  ['vb-brief-line5', 0.73888889],
  ['vb-brief-line5-lit', 0.81666667],
  ['vb-brief-line6', 0.79722222],
  ['vb-brief-line6-lit', 0.82638889],
  ['vb-turn-lock', 0.5],
  ['vb-basket-drop', 0.63472222],
  ['vb-frame-knot', 0.74861111],
  ['vb-frame-mid', 0.78194444],
  ['vb-frame-stays', 0.80972222],""")
print('ok')
