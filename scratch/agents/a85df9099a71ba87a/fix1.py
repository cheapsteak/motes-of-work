p='e2e/galaxy.spec.ts'
s=open(p).read()

# --- Minor 3: halos, tighter slack against the glow profile's own lit radius
old="""        // The sprites drawn are no larger than that: every lit pixel of the glow alone is inside one.
        await call(page, 'isolate', ['net-glow']);
        const png = PNG.sync.read(await canvasShot(page));
        const mask = litMask(png, 4);
        let stray = 0;
        let lit = 0;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          lit++;
          const x = (i % png.width) + 0.5;
          const y = Math.floor(i / png.width) + 0.5;
          if (!on.some((s) => Math.hypot(x - s.x, y - s.y) <= s.r + 1.5)) stray++;
        }"""
new="""        // The sprites drawn are no larger than that: every pixel of the glow alone lit past GLOW_LIT is
        // inside the radius where the glow profile falls to GLOW_LIT, give or take GLOW_SLACK.
        await call(page, 'isolate', ['net-glow']);
        const png = PNG.sync.read(await canvasShot(page));
        const mask = litMask(png, GLOW_LIT);
        let stray = 0;
        let lit = 0;
        let excess = -Infinity;
        for (let i = 0; i < mask.length; i++) {
          if (!mask[i]) continue;
          lit++;
          const x = (i % png.width) + 0.5;
          const y = Math.floor(i / png.width) + 0.5;
          const over = Math.min(...on.map((s) => Math.hypot(x - s.x, y - s.y) - GLOW_LIT_R * s.r));
          excess = Math.max(excess, over);
          if (!(over <= GLOW_SLACK)) stray++;
        }
        if (process.env.GALAXY_MEASURE) console.log(`${size.label} ${shot}: lit ${lit}, most past the profile's lit radius ${excess.toFixed(2)} px`);"""
assert old in s; s=s.replace(old,new)

old="""const GROWN = encodeURIComponent"""
new="""/**
 * The glow's lit edge (galaxy §4's profile, mote.frag.glsl): a pixel counts as lit past GLOW_LIT of
 * 255 on a channel. Beyond the core (35 % of the radius) only the halo 0.45 (1 − r)² is left, drawn at
 * the glow's brightness (BODY_LOOK.glowBrightness) on the blue channel (1.0), so it falls under GLOW_LIT
 * at GLOW_LIT_R of the sprite's radius; the screen's sampling may light a pixel up to GLOW_SLACK further.
 */
const GLOW_LIT = 4;
const GLOW_LIT_R = 1 - Math.sqrt(GLOW_LIT / (255 * BODY_LOOK.glowBrightness * 0.45));
const GLOW_SLACK = 0.75;

const GROWN = encodeURIComponent"""
assert old in s; s=s.replace(old,new,1)
s=s.replace("import { FULL_DETAIL_MAX, LodElement } from '../src/scene/node/lod';","""import { BODY_LOOK } from '../src/scene/node/bodyAttrs';
import { FULL_DETAIL_MAX, LodElement, systemPx } from '../src/scene/node/lod';""")

# --- Minor 1: caps at DPR 2 (screenshot px = buffer px) and 3, bounded both ways
start=s.index("for (const size of SIZES) {\n  test.describe(`at ${size.width}x${size.height}, device pixel ratio 3`")
s=s[:start]+"""/**
 * The background's sprites at a device pixel ratio: the renderer draws at min(ratio, 2) buffer px per
 * CSS px (main.ts) and the browser scales the canvas to `ratio` device px per CSS px. A bright star is
 * 3 CSS px, a dust mote 1: in buffer px 3·b and b (b the buffer ratio), so in the screenshot about
 * 3·ratio and ratio, a pixel either way for the sampling and the scale. A sprite sized in buffer px
 * (the pixel ratio dropped) is b times too small and fails the lower bound.
 */
for (const ratio of [2, 3] as const) {
  for (const size of SIZES) {
    test.describe(`at ${size.width}x${size.height}, device pixel ratio ${ratio}`, () => {
      test.use({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: ratio });

      test(`caps are CSS px at DPR ${ratio}`, async ({ page }) => {
        // The neighbourhood: background stars and dust stand apart there, so each lit component is one sprite.
        await openShot(page, 'hood');
        await call(page, 'isolate', ['galaxy-bright']);
        let png = PNG.sync.read(await canvasShot(page));
        expect(png.width).toBe(ratio * size.width);
        const bright = components(png, litMask(png, 0)).sort((a, b) => b.peak - a.peak);
        expect(bright.length).toBeGreaterThan(5);
        const brightW = Math.max(bright[0].w, bright[0].h);

        await call(page, 'isolate', ['galaxy-dust']);
        png = PNG.sync.read(await canvasShot(page));
        const dust = components(png, litMask(png, 0)).sort((a, b) => b.peak - a.peak);
        expect(dust.length).toBeGreaterThan(5);
        const dustW = Math.max(dust[0].w, dust[0].h);
        if (process.env.GALAXY_MEASURE) console.log(`DPR ${ratio} ${size.label}: brightest star ${brightW} px, brightest dust ${dustW} px`);

        // The brightest star sprite: its 3 CSS px cap, 3·ratio device px, a pixel either way (plus one more for the 1.5× upscale at DPR 3).
        expect(brightW).toBeGreaterThanOrEqual(3 * ratio - 1);
        expect(brightW).toBeLessThanOrEqual(3 * ratio + (ratio === 3 ? 2 : 1));
        // A dust mote is never under its 1 CSS px floor.
        expect(dustW).toBeGreaterThanOrEqual(ratio);
      });
    });
  }
}
"""
open(p,'w').write(s)
