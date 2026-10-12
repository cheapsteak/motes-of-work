p = 'src/galaxy/background.ts'
s = open(p).read()


def rep(a, b):
    global s
    assert a in s, a[:70]
    s = s.replace(a, b)


rep('''/**
 * The galaxy's numbers (§2.1, §14.2): its radius; the stars and dust per tier; the core stars' share
 * and how far out they reach (a share of the radius); the arms' pitch (`θ = ln(r / 2) / pitch`) and the
 * bearing scatter of their stars and dust; the radial exponents (`r = radius · u^exp`); the share of
 * stars that are bright and that are warm; the neighbourhood's exclusion radius and the share of
 * draws let through it; the core's exclusion radius; and the height scatter of dust and stars.
 */
export const BG = {
  radius: 220,
  stars: { phone: 2400, desktop: 4000 },''', '''/**
 * The galaxy's numbers (§2.1, §14.2): its radius; the stars and dust per tier; the core stars' share
 * and how far out they reach (a share of the radius); the arms' pitch (`θ = ln(r / 2) / pitch`) and the
 * bearing scatter of their stars and dust; the radial exponents (`r = radius · u^exp`); the share of
 * stars that are bright and that are warm; the core's exclusion radius; and the height scatter of
 * dust and stars.
 *
 * The star counts are the halo rule's, not §2.1's 2,400 / 4,000: at the galaxy wide a phone sees
 * 0.94 CSS px per unit and a desktop 1.93, and with §2.1's counts most halos would merge (only 18 %
 * of a phone's stars, and 94 % of a desktop's, keep their halo under half the distance to their
 * nearest neighbour). These are the most that keep 95 % apart on every seed tried, at the arms' own
 * scatter. §2.1's 60-unit (and §14.2's 50-unit) neighbourhood exclusion is gone: the neighbourhood's
 * stars keep their halos apart from the background's instead, which leaves no hole.
 */
export const BG = {
  radius: 220,
  stars: { phone: 850, desktop: 3400 },''')
rep('''  hoodExclusion: 50,
  hoodLeak: 0.15,
''', '')
open(p, 'w').write(s)
