p = '/home/user/motes-of-work/src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep(''' * The star counts are the halo rule's, not §2.1's 2,400 / 4,000: at the galaxy wide a phone sees
 * 0.94 CSS px per unit and a desktop 1.93, and with §2.1's counts most halos would merge (only 18 %
 * of a phone's stars, and 94 % of a desktop's, keep their halo under half the distance to their
 * nearest neighbour). These keep at least 95 % apart, with a margin, on every seed tried, at the arms'
 * own scatter. §2.1's 60-unit (and §14.2's 50-unit) neighbourhood exclusion is gone: the neighbourhood's
 * stars keep their halos apart from the background's instead, which leaves no hole.
 */''', ''' * Halos apart at the galaxy wide (§4) is kept by the background stars' sprite caps (`HALO_PX`), not
 * by their spacing: §4's "median spacing 7 px on the arms" at 0.86 px per unit cannot hold with these
 * counts (the arms cover about a sixth of the disc; measured, the median is about 1.5 px). §2.1's
 * 60-unit (and §14.2's 50-unit) neighbourhood exclusion is gone: the neighbourhood's stars keep their
 * halos apart from the background's instead, which leaves no hole.
 */''')
rep('''  stars: { phone: 850, desktop: 3400 },''', '''  stars: { phone: 2400, desktop: 4000 },''')
rep('''/** Sprite caps in CSS px (galaxy §4): a background star, a bright one, and a neighbourhood star's glow at its floor. */
export const HALO_PX = { star: 3.5, bright: 6, hood: 5 } as const;''', '''/**
 * Sprite caps in CSS px at the galaxy wide: a background star is a crisp 2 px point (a 1 px halo at
 * most), a bright one 3 px, and a neighbourhood star's glow is at its 5 px floor. The glow belongs to
 * the core's haze, the neighbourhood's stars and nearer stars, not to the thousands behind them: at
 * 3.5 and 6 px (§4) only about a fifth of a phone's stars would keep their halos apart.
 */
export const HALO_PX = { star: 2, bright: 3, hood: 5 } as const;''')
open(p, 'w').write(s)
