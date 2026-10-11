/**
 * The galaxy wide (galaxy §14.5's fr-1: distance 640, fov 40, elevation 86), whose halos must stay
 * apart, and the screen each tier is held to it at (the probe sizes, phone first).
 */
export const GALAXY_WIDE = { distance: 640, fov: 40, elevation: 86 } as const;
export const TIER_SCREEN: Readonly<Record<Tier, readonly [number, number]>> = { phone: [390, 844], desktop: [1440, 900] };
/** Sprite caps in CSS px (galaxy §4): a background star, a bright one, and a neighbourhood star's glow at its floor. */
export const HALO_PX = { star: 3.5, bright: 6, hood: 5 } as const;
/** Two sprites keep this much more than their caps apart, for the perspective's spread of scale across the disc. */
export const HALO_MARGIN = 1.05;
/** Draws per star before the generator gives up: a full arm is a design error, not a case to paper over. */
const PLACE_ATTEMPTS = 2000;

/**
 * CSS px per unit at the galactic centre at the galaxy wide, on a `width` × `height` screen: in
 * portrait the shot is reframed as `portraitRig` does (backed off and opened by `k = sqrt(m)`).
 */
export function galaxyWidePxPerUnit(width: number, height: number): number {
  const aspect = width / height;
  const k2 = aspect < 1 ? Math.min(2.4, Math.max(1, 0.89 / aspect)) : 1;
  return height / (2 * GALAXY_WIDE.distance * Math.tan((GALAXY_WIDE.fov * Math.PI) / 360) * k2);
}

/** One seeded stream per (concern, point). The first output is dropped: for these closely keyed seeds it runs measurably high. */
function rngFor(seed: number, salt: number, i: number): () => number {
  const key = pcg((Math.imul(salt, 0x9e3779b9) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0);
  const rng = mulberry32(pcg((seed ^ key) >>> 0));
  rng();
  return rng;
}

/** A draw at radius `r` and bearing `th`, `y` triangular in ±`yMax`, rounded to float32 (the values the arrays hold). */
function at(r: number, th: number, yMax: number, rng: () => number): [number, number, number] {
  return [Math.fround(r * Math.cos(th)), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(r * Math.sin(th))];
}

/**
 * The background. `hood` is the neighbourhood's star spots: no background star's halo touches one of
 * theirs at the galaxy wide, which is all the room they need (no hole is cut round them).
 */
export function generateBackground(seed: number, tier: Tier, hood: readonly (readonly [number, number, number])[]): Background {
  const nStars = BG.stars[tier];
  const nDust = BG.dust[tier];
  const nCore = Math.round(BG.coreShare * nStars);
  const ppu = galaxyWidePxPerUnit(...TIER_SCREEN[tier]);
  const gap = (pxA: number, pxB: number): number => (Math.max(pxA, pxB) / ppu) * HALO_MARGIN;

  // Brightness first: the brightest 15 % are the bright set, with the larger sprite.
  const rngs = Array.from({ length: nStars }, (_, i) => rngFor(seed, 1, i));
  const level = rngs.map((rng) => {
    const u = rng();
    return { brightness: 0.35 + 0.65 * u * u, warm: rng() < BG.warmShare };
  });
  const nBright = Math.round(BG.brightShare * nStars);
  const rank = level.map((_, i) => i).sort((a, b) => level[b].brightness - level[a].brightness || a - b);
  const isBright = new Uint8Array(nStars);
  for (let k = 0; k < nBright; k++) isBright[rank[k]] = 1;

  // Places: the core's stars first, then the arms'. A draw is drawn again if it falls in the core's
  // exclusion, or if its halo would touch another's at the galaxy wide (each halo is half its sprite:
  // two stars keep the larger sprite's width apart, so each one's halo is under half the distance to
  // its nearest neighbour). A grid of cells as wide as the largest gap keeps the check local.
  const cell = gap(HALO_PX.bright, HALO_PX.hood);
  const grid = new Map<number, number[][]>();
  const cellKey = (x: number, z: number): number => (Math.floor(x / cell) + 4096) * 8192 + (Math.floor(z / cell) + 4096);
  const settle = (p: readonly number[], px: number) => {
    const key = cellKey(p[0], p[2]);
    const list = grid.get(key);
    if (list) list.push([p[0], p[2], px]);
    else grid.set(key, [[p[0], p[2], px]]);
  };
  const clear = (p: readonly number[], px: number): boolean => {
    const ci = Math.floor(p[0] / cell);
    const ck = Math.floor(p[2] / cell);
    for (let di = -1; di <= 1; di++) {
      for (let dk = -1; dk <= 1; dk++) {
        for (const [x, z, opx] of grid.get((ci + di + 4096) * 8192 + (ck + dk + 4096)) ?? []) {
          if (Math.hypot(p[0] - x, p[2] - z) < gap(px, opx)) return false;
        }
      }
    }
    return true;
  };
  for (const s of hood) settle(s, HALO_PX.hood);
  const stars: [number, number, number][] = [];
  for (let i = 0; i < nStars; i++) {
    const rng = rngs[i];
    const core = i < nCore;
    const px = isBright[i] ? HALO_PX.bright : HALO_PX.star;
    let p: [number, number, number] | null = null;
    for (let attempt = 0; attempt < PLACE_ATTEMPTS && !p; attempt++) {
      const r = (core ? BG.coreAt : 1) * BG.radius * rng() ** BG.starExp;
      const th = core
        ? 2 * Math.PI * rng()
        : armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      const c = at(r, th, BG.starY, rng);
      if (Math.hypot(c[0], c[1], c[2]) >= BG.coreExclusion && clear(c, px)) p = c;
    }
    if (!p) throw new Error(`no room for background star ${i} with its halo apart`);
    settle(p, px);
    stars.push(p);
  }
  const dimArr = new Float32Array(4 * (nStars - nBright));
  const brightArr = new Float32Array(4 * nBright);
  let d = 0;
  let b = 0;
  stars.forEach(([x, y, z], i) => {
    const v = level[i].warm ? -level[i].brightness : level[i].brightness;
    if (isBright[i]) brightArr.set([x, y, z, v], 4 * b++);
    else dimArr.set([x, y, z, v], 4 * d++);
  });

  // Dust: on the arms, wider and denser toward the core; the core's exclusion only (1 px hard motes, no halo).
  const dust = new Float32Array(4 * nDust);
  for (let i = 0; i < nDust; i++) {
    const rng = rngFor(seed, 2, i);
    const brightness = 0.08 + 0.1 * rng();
    let p: [number, number, number];
    do {
      const r = BG.radius * rng() ** BG.dustExp;
      const th = armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.dustScatter, r) * (2 * rng() - 1);
      p = at(r, th, BG.dustY, rng);
    } while (Math.hypot(p[0], p[1], p[2]) < BG.coreExclusion);
    dust.set([p[0], p[1], p[2], brightness], 4 * i);
  }

  return { stars: dimArr, bright: brightArr, dust, armPhase: ARM_PHASE };
}
