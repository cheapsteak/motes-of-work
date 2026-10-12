import os

os.chdir('.')


def rep(p, old, new, count=1):
    s = open(p).read()
    assert s.count(old) == count, (p, s.count(old), old[:70])
    open(p, 'w').write(s.replace(old, new))


# ---- shapes.ts: the basket is its own solid, about the head-tube top ----
rep('src/mechanisms/bike/shapes.ts', """/**
 * The basket's broad panels draw this fraction of the fork's density: enough motes to read as a box,
 * few enough not to take the fork's share from the rest of the bike.
 */
const BASKET_WEIGHT = 0.22;
""", """/**
 * The basket's points per area, relative to the rest of the body: its broad panels need only enough
 * motes to read as a box, few enough not to take the share of the rest of the bike.
 */
export const BASKET_DENSITY = 0.22;
""")
rep('src/mechanisms/bike/shapes.ts', """/** The basket's walls, floor and rim, the stays that carry it, and its headlamp (bike coordinates). */
function basket(): BufferGeometry {""", """/** The basket's walls, floor and rim, the stays that carry it, and its headlamp (bike coordinates). */
function basketSolids(): BufferGeometry {""")
rep('src/mechanisms/bike/shapes.ts', """/** Steerer, headset cups, crown, the two blades down to the front axle, and the basket with its headlamp; about the head-tube top. */
export function fork(): BufferGeometry {""", """/**
 * The basket with its stays and its headlamp, about the head-tube top: carried on the fork, so it
 * steers with it, but its own part, so it can be built on its own line of the brief.
 */
export function basket(): BufferGeometry {
  return basketSolids().translate(...scale(HEAD_TOP, -1));
}

/** Steerer, headset cups, crown and the two blades down to the front axle; about the head-tube top. */
export function fork(): BufferGeometry {""")
rep('src/mechanisms/bike/shapes.ts', """  const steerer = merge(
    tube(at(add(HEAD_BOTTOM, scale(STEER_AXIS, -0.03))), at(STEER_MOUNT), 0.012, 12),
    cup(HEAD_TOP),
    cup(HEAD_BOTTOM),
    tube(at(withZ(CROWN, -FORK_Z - 0.01)), at(withZ(CROWN, FORK_Z + 0.01)), 0.015, 12),
    ...[-1, 1].map((s) => tube(at(withZ(CROWN, s * FORK_Z)), at(withZ(FRONT_AXLE, s * FORK_Z)), 0.011, 12)),
  );
  return merge(weighted(steerer, 1), weighted(basket().translate(...scale(HEAD_TOP, -1)), BASKET_WEIGHT));
}""", """  return merge(
    tube(at(add(HEAD_BOTTOM, scale(STEER_AXIS, -0.03))), at(STEER_MOUNT), 0.012, 12),
    cup(HEAD_TOP),
    cup(HEAD_BOTTOM),
    tube(at(withZ(CROWN, -FORK_Z - 0.01)), at(withZ(CROWN, FORK_Z + 0.01)), 0.015, 12),
    ...[-1, 1].map((s) => tube(at(withZ(CROWN, s * FORK_Z)), at(withZ(FRONT_AXLE, s * FORK_Z)), 0.011, 12)),
  );
}""")

# ---- shapes.test.ts ----
rep('src/mechanisms/bike/shapes.test.ts', """const SOLIDS = {
  frame,
  fork,""", """const SOLIDS = {
  frame,
  fork,
  basket,""")
rep('src/mechanisms/bike/shapes.test.ts', """  it('marks the front with a basket and its headlamp on the fork, and the back with a rack and a reflector', () => {
    // The basket (bike coordinates): over the front wheel, ahead of the head tube, clear of the tyre
    // and the mudguard, and under the bars. It rides the fork (head-tube-top space), so it steers.
    const pts = (() => {
      const p = fork().getAttribute('position');""", """  it('marks the front with a basket and its headlamp on the fork, and the back with a rack and a reflector', () => {
    // The basket (bike coordinates): over the front wheel, ahead of the head tube, clear of the tyre
    // and the mudguard, and under the bars. It rides the fork (head-tube-top space), so it steers.
    const pts = (() => {
      const p = basket().getAttribute('position');""")
rep('src/mechanisms/bike/shapes.test.ts', """    expect(distanceToMesh(fork(), sub(HEADLAMP.centre, HEAD_TOP))).toBeLessThan(HEADLAMP.radius + 1e-3);""",
    """    expect(distanceToMesh(basket(), sub(HEADLAMP.centre, HEAD_TOP))).toBeLessThan(HEADLAMP.radius + 1e-3);
    // And none of it is the fork's any more: the fork is the steerer, crown and blades.
    const forkPos = fork().getAttribute('position');
    for (let i = 0; i < forkPos.count; i++) {
      const [x, y] = [forkPos.getX(i) + HEAD_TOP[0], forkPos.getY(i) + HEAD_TOP[1]];
      if (x > BASKET.x0 && x < BASKET.x1) expect(y).toBeLessThan(BASKET.y0);
    }""")
rep('src/mechanisms/bike/shapes.test.ts', """  BASKET,
""", """  BASKET,
  basket,
""")

# ---- ink.ts: the basket and lamp strokes belong to the basket ----
rep('src/mechanisms/bike/ink.ts', """    case 'fork':
    case 'brake-front':""", """    case 'fork':
    case 'basket':
    case 'brake-front':""")
rep('src/mechanisms/bike/ink.ts', """/** Steerer, crown and blades, the basket with its stays, and the headlamp (shapes.ts `fork`, `basket`); about the head-tube top. */
function fork(pen: Pen): void {
  const part = 'fork';""", """/** Steerer, crown and blades (shapes.ts `fork`), then the basket with its stays and the headlamp (`basket`); about the head-tube top. */
function fork(pen: Pen): void {
  let part = 'fork';""")
rep('src/mechanisms/bike/ink.ts', """  const { x0, x1, y0, y1, halfWidth: w } = BASKET;
  for (const s of [1, -1]) {""", """  part = 'basket';
  const { x0, x1, y0, y1, halfWidth: w } = BASKET;
  for (const s of [1, -1]) {""")
print('ok')
