p = 'e2e/network.spec.ts'
s = open(p).read()

old = """//   11. the crack reads close and not far: a cracked stack's whole and cracked builds differ in many
//       pixels inside its crack cube's rectangle at its close shot, and in next to none at the far
//       shot (the design counts the stack's rectangle; the cube's is the stricter of the two);"""
new = """//   11. the crack reads close and not far: a cracked stack's whole and cracked builds differ in many
//       pixels inside the stack's rectangle at its close shots, and in next to none at the far shot;"""
assert old in s
s = s.replace(old, new)

i = s.index("/** A cracked stack's crack cube's rectangle")
j = s.index('for (const size of SIZES) {')
s = s[:i] + '''/** A stack's rectangle on the canvas at progress `p` (px of the PNG), clipped to it, through the essay's composed camera. */
function stackRect(id: string, p: number, spans: SectionSpan[], png: PNG, css: { width: number; height: number }): Rect {
  const net = essayNetwork();
  const n = net.nodes[nodeIndex(net, id)];
  const state = new KeyframeSampler(keyframes, spans).sample(p);
  const camera = new PerspectiveCamera(40, css.width / css.height, 0.1, 400);
  applyCamera(camera, state, mechanismAnchors(mechanisms.bike), { compose: true });
  camera.updateMatrixWorld();
  const sx = png.width / css.width;
  const sy = png.height / css.height;
  const xs: number[] = [];
  const ys: number[] = [];
  for (const b of n.boxes) {
    for (const c of boxCorners(b)) {
      const q = new Vector3(...c).project(camera);
      xs.push(((q.x + 1) / 2) * css.width * sx);
      ys.push(((1 - q.y) / 2) * css.height * sy);
    }
  }
  const clip = (v: number, hi: number) => Math.min(hi, Math.max(0, Math.round(v)));
  return {
    x0: clip(Math.floor(Math.min(...xs)), png.width),
    x1: clip(Math.ceil(Math.max(...xs)), png.width),
    y0: clip(Math.floor(Math.min(...ys)), png.height),
    y1: clip(Math.ceil(Math.max(...ys)), png.height),
  };
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const areaOf = (r: Rect): number => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);

/** Stage background, #0B0D12: a pixel further than CHANGED from it on some channel is drawn. */
const BACKGROUND = [0x0b, 0x0d, 0x12];

/**
 * What changes inside `r` between the cracked frame `a` and the whole one `b`: `all`, the pixels
 * that move by more than CHANGED on some channel; `crack`, the same less one carve-out, the fix's
 * own warm motes. A fix lands the person's amber motes (#FFB347) on the cracked cube, and they are
 * meant to be seen at any distance (§3.7: the warm dusting stays, the mark of where a person
 * looked); they are not the crack. Screen-blended amber over the stack can only raise each channel,
 * red most and blue least, so the carve-out is exactly a pixel whose change has amber's order:
 * red rising, and red's rise at least green's, green's at least blue's. An agent-blue mote moving
 * in raises blue most, one moving out lowers every channel, and the lips' brighter faces going dim
 * lower them: all of those count. `drawn` is how many pixels of `r` the cracked frame draws at all.
 */
function changes(a: PNG, b: PNG, r: Rect): { all: number; crack: number; drawn: number } {
  let all = 0;
  let crack = 0;
  let drawn = 0;
  for (let y = r.y0; y < r.y1; y++) {
    for (let x = r.x0; x < r.x1; x++) {
      const i = (y * a.width + x) * 4;
      const d = [0, 1, 2].map((c) => b.data[i + c] - a.data[i + c]);
      if ([0, 1, 2].some((c) => Math.abs(a.data[i + c] - BACKGROUND[c]) > CHANGED)) drawn++;
      if (!d.some((v) => Math.abs(v) > CHANGED)) continue;
      all++;
      const amber = d[0] > 0 && d[0] >= d[1] && d[1] >= d[2];
      if (!amber) crack++;
    }
  }
  return { all, crack, drawn };
}

/** Section-local progress of the middle of `beat`'s full ink within [from, to] of its section, read from the page. */
async function inkedWithin(page: Page, beat: string, from: number, to: number): Promise<number> {
  const { at, length } = await page.evaluate((id) => {
    const el = document.querySelector(`[data-beat="${id}"]`) as HTMLElement;
    const section = el.closest('section[data-section]') as HTMLElement;
    return { at: Number(el.dataset.at), length: Number(section.style.getPropertyValue('--length')) };
  }, beat);
  const lo = Math.max(from, at + FADE_SCREENS / length);
  if (!(lo < to)) throw new Error(`${beat} is not up between ${from} and ${to}`);
  return (lo + to) / 2;
}

/** `<section>@<local>` as its parts. */
const parse = (where: string): [string, number] => {
  const sep = where.lastIndexOf('@');
  return [where.slice(0, sep), Number(where.slice(sep + 1))];
};

''' + s[j:]

old_t = s[s.index("    // The close shots, each cracked stack's own;"):s.index("    test(`the twelve under df-5")]
new_t = '''    // Each cracked stack the camera visits close, at each of its close shots, and fr-1's wide shot,
    // from which no crack may show. R0's first close shot is tr-2's (the hold on its crack while tr-2
    // is fully up, before the pull-back); its others, and R1's, are the fix close-ups.
    const NEAR_MIN = size.label === 'phone' ? 400 : 900;
    const FAR_MAX = 20;
    /** A far rectangle smaller than this (px of the PNG) would make the far half all but vacuous. */
    const FAR_MIN_AREA = 100;
    const FAR_MIN_DRAWN = 20;

    for (const id of ['C1', 'R0', 'R1'] as const) {
      test(`${id}'s crack reads at its close shots and not from far away (test 11, ${size.label})`, async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (e) => errors.push(e.message));
        await openStage(page, '&mech=bike&n=500');
        const spans = await readSpans(page);
        const [, holdFrom] = parse(NET_MOVES.climb.to);
        const [, holdTo] = parse(NET_MOVES.fanOut.from);
        const near: [string, number][] = {
          C1: [['defect', 0.12]],
          R0: [
            ['trace', await inkedWithin(page, 'tr-2', holdFrom, holdTo)],
            ['fix', 0.12],
          ],
          R1: [['fix', 0.33]],
        }[id];
        // R1 is not born at fr-1.
        const far: [string, number][] = id === 'R1' ? [] : [['far', 0.5]];
        for (const [list, want] of [
          [near, 'near'],
          [far, 'far'],
        ] as const) {
          for (const [section, local] of list) {
            const p = progressAt(spans, section, local);
            // The highlight held at 0 in both: a fix puts a lit stack's light out, which is not the crack.
            const cracked = await frame(page, p, { net: { fix: 0, highlight: 0 } });
            const whole = await frame(page, p, { net: { fix: 1, highlight: 0 } });
            const rect = stackRect(id, p, spans, cracked, size);
            const c = changes(cracked, whole, rect);
            const what = `${id} ${want} at ${section}@${local.toFixed(4)}: ${c.crack} changed without the warm dusting, ${c.all} with it, ${c.drawn} drawn of ${areaOf(rect)} px`;
            if (want === 'near') {
              expect(c.crack, what).toBeGreaterThanOrEqual(NEAR_MIN);
            } else {
              expect(areaOf(rect), what).toBeGreaterThanOrEqual(FAR_MIN_AREA);
              expect(c.drawn, what).toBeGreaterThanOrEqual(FAR_MIN_DRAWN);
              expect(c.crack, what).toBeLessThanOrEqual(FAR_MAX);
            }
            if (process.env.TEST11_REPORT) console.log(`TEST11 ${size.label} ${what}`);
          }
        }
        expect(errors).toEqual([]);
      });
    }

'''
s = s.replace(old_t, new_t)
s = s.replace("import { essayNetwork } from '../src/timeline/netShots';", "import { essayNetwork, NET_MOVES } from '../src/timeline/netShots';\nimport { FADE_SCREENS } from '../src/story/reveal';")
open(p, 'w').write(s)
