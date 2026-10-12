b = 'src/galaxy/background.ts'
s = open(b).read()


def rep(a, c):
    global s
    assert a in s, a[:70]
    s = s.replace(a, c)


rep('''/**
 * Sprite caps in CSS px at the galaxy wide: a background star is a crisp 2 px point (a 1 px halo at
 * most), a bright one 3 px, and a neighbourhood star's glow is at its 5 px floor. The glow belongs to
 * the core's haze, the neighbourhood's stars and nearer stars, not to the thousands behind them: at
 * 3.5 and 6 px (§4) only about a fifth of a phone's stars would keep their halos apart.
 */
export const HALO_PX = { star: 2, bright: 3, hood: 5 } as const;''', '''/**
 * Background sprite caps in CSS px: a background star is a crisp 2 px point (a 1 px halo at most),
 * a bright one 3 px. The glow belongs to the core's haze, the neighbourhood's stars (their sprite is
 * `glowPx`, sized by distance: `hoodGlowPx` at the galaxy wide) and nearer stars, not to the
 * thousands behind them: at §4's 3.5 and 6 px only about a fifth of a phone's stars would keep their
 * halos apart at the galaxy wide.
 */
export const HALO_PX = { star: 2, bright: 3 } as const;''')
rep('''/**
 * CSS px per unit at the galactic centre at the galaxy wide, on a `width` × `height` screen: in
 * portrait the shot is reframed as `portraitRig` does (backed off and opened by `k = sqrt(m)`).
 */
export function galaxyWidePxPerUnit(width: number, height: number): number {
  const aspect = width / height;
  const k2 = aspect < 1 ? Math.min(2.4, Math.max(1, 0.89 / aspect)) : 1;
  return height / (2 * GALAXY_WIDE.distance * Math.tan((GALAXY_WIDE.fov * Math.PI) / 360) * k2);
}''', '''/**
 * The galaxy wide on a `width` × `height` screen (bearing 0, aimed at the core), reframed in portrait
 * as `portraitRig` does (backed off and opened by `k = sqrt(m)`): the camera's position, its focal
 * length in CSS px (vertical fov), and CSS px per unit at the galactic centre.
 */
export function galaxyWideView(width: number, height: number): { pos: [number, number, number]; focal: number; pxPerUnit: number } {
  const aspect = width / height;
  const k = Math.sqrt(aspect < 1 ? Math.min(2.4, Math.max(1, 0.89 / aspect)) : 1);
  const el = (GALAXY_WIDE.elevation * Math.PI) / 180;
  const d = GALAXY_WIDE.distance * k;
  const focal = height / (2 * Math.tan((GALAXY_WIDE.fov * Math.PI) / 360) * k);
  return { pos: [0, d * Math.sin(el), d * Math.cos(el)], focal, pxPerUnit: focal / d };
}

/** CSS px per unit at the galactic centre at the galaxy wide (`galaxyWideView`). */
export function galaxyWidePxPerUnit(width: number, height: number): number {
  return galaxyWideView(width, height).pxPerUnit;
}

/** A neighbourhood star's glow sprite at the galaxy wide on a tier's probe screen, in CSS px (`glowPx`, capped as a star's). */
export function hoodGlowPx(tier: Tier, spot: readonly number[]): number {
  const { pos, focal } = galaxyWideView(...TIER_SCREEN[tier]);
  return glowPx(STAR_R, Math.hypot(spot[0] - pos[0], spot[1] - pos[1], spot[2] - pos[2]), focal, GLOW_CAP.star);
}''')
rep('''  const cell = gap(HALO_PX.bright, HALO_PX.hood);''', '''  const glows = hood.map((s) => hoodGlowPx(tier, s));
  const cell = gap(HALO_PX.bright, Math.max(HALO_PX.bright, ...glows));''')
rep('''    hood.some((s) => Math.hypot(p[0] - s[0], p[2] - s[2]) < gap(px, HALO_PX.hood));''', '''    hood.some((s, k) => Math.hypot(p[0] - s[0], p[2] - s[2]) < gap(px, glows[k]));''')
rep("import { streamFor } from './seeds';", "import { GLOW_CAP, STAR_R, glowPx } from './body';\nimport { streamFor } from './seeds';")
open(b, 'w').write(s)

y = 'src/galaxy/body.ts'
t = open(y).read()
t += '''
/** The glow sprites' caps in CSS px (galaxy §4): a star's (a plan's) and a core body's (a rule's). */
export const GLOW_CAP = { star: 18, core: 24 } as const;

/**
 * A star's or core body's glow sprite, in CSS px: `clamp(5 R focal / d, 5, cap)` for a body of radius
 * `R` at distance `d` seen through a focal length of `focalPx` (CSS px, vertical fov). The halo
 * inside it reaches half of it. The renderer and the background's clearance both size it here.
 */
export function glowPx(R: number, d: number, focalPx: number, cap: number): number {
  return Math.min(cap, Math.max(5, (5 * R * focalPx) / d));
}
'''
open(y, 'w').write(t)

q = 'src/galaxy/background.test.ts'
u = open(q).read()
u = u.replace('''  const others = hood.map((p) => [...project(p), HALO_PX.hood]);''', '''  const others = hood.map((p) => [...project(p), hoodGlowPx(tier, p)]);''')
u = u.replace('''  galaxyWidePxPerUnit,
''', '''  galaxyWidePxPerUnit,
  hoodGlowPx,
''')
u = u.replace('''    expect(galaxyWidePxPerUnit(390, 844)).toBeCloseTo(0.94, 2);
    expect(galaxyWidePxPerUnit(1440, 900)).toBeCloseTo(1.93, 2);''', '''    expect(galaxyWidePxPerUnit(390, 844)).toBeCloseTo(0.94, 2);
    expect(galaxyWidePxPerUnit(1440, 900)).toBeCloseTo(1.93, 2);
    // A neighbourhood star's glow there: at its 5 px floor on the phone, 8.7 px on the desktop.
    expect(hoodGlowPx('phone', [0, 0, 0])).toBe(5);
    expect(hoodGlowPx('desktop', [0, 0, 0])).toBeCloseTo((5 * 0.9 * 1236.4) / 640, 1);''')
open(q, 'w').write(u)
