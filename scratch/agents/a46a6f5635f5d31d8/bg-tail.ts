/** The bearing scatter at radius `r`: `scatter (1 − 0.5 r / radius)`, narrowing toward the rim. */
function scatterAt(scatter: number, r: number): number {
  return scatter * (1 - (0.5 * r) / BG.radius);
}

/** One seeded stream per point: a star's or a dust mote's draws never shift another's. */
function rngFor(seed: number, salt: number, i: number): () => number {
  const key = pcg((Math.imul(salt, 0x9e3779b9) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0);
  return mulberry32(pcg((seed ^ key) >>> 0));
}

/** A draw at radius `r` and bearing `th`, `y` triangular in ±`yMax`. */
function at(r: number, th: number, yMax: number, rng: () => number): [number, number, number] {
  // Rounded to float32 here, so the exclusions are checked on the values the arrays hold.
  return [Math.fround(r * Math.cos(th)), Math.fround(yMax * (rng() + rng() - 1)), Math.fround(r * Math.sin(th))];
}

export function generateBackground(seed: number, tier: Tier, hoodCentroid: readonly [number, number, number]): Background {
  const nStars = BG.stars[tier];
  const nDust = BG.dust[tier];
  const nCore = Math.round(BG.coreShare * nStars);
  const inHood = (p: readonly number[]): boolean =>
    Math.hypot(p[0] - hoodCentroid[0], p[1] - hoodCentroid[1], p[2] - hoodCentroid[2]) < BG.hoodExclusion;

  // Stars: the core's first, then the arms'. A draw in the core's exclusion is drawn again. A star
  // is a leak star with probability `hoodLeak`: only a leak star may stay in the neighbourhood's
  // exclusion (its own stars own that stretch of the arm); any other draw there is drawn again.
  const stars: [number, number, number, number, boolean][] = [];
  for (let i = 0; i < nStars; i++) {
    const rng = rngFor(seed, 1, i);
    const leak = rng() < BG.hoodLeak;
    const u = rng();
    const warm = rng() < BG.warmShare;
    const core = i < nCore;
    let p: [number, number, number];
    do {
      const r = (core ? BG.coreAt : 1) * BG.radius * rng() ** BG.starExp;
      const th = core
        ? 2 * Math.PI * rng()
        : armAngleAt(Math.max(r, 1e-9), ARM_PHASE, rng() < 0.5 ? 0 : 1) + scatterAt(BG.scatter, r) * (2 * rng() - 1);
      p = at(r, th, BG.starY, rng);
    } while (Math.hypot(p[0], p[1], p[2]) < BG.coreExclusion || (!leak && inHood(p)));
    stars.push([p[0], p[1], p[2], 0.35 + 0.65 * u * u, warm]);
  }

  // The brightest 15 % go to `bright`; both sets keep their draw order.
  const nBright = Math.round(BG.brightShare * nStars);
  const rank = stars.map((_, i) => i).sort((a, b) => stars[b][3] - stars[a][3] || a - b);
  const isBright = new Uint8Array(nStars);
  for (let k = 0; k < nBright; k++) isBright[rank[k]] = 1;
  const dimArr = new Float32Array(4 * (nStars - nBright));
  const brightArr = new Float32Array(4 * nBright);
  let d = 0;
  let b = 0;
  stars.forEach(([x, y, z, br, warm], i) => {
    const v = warm ? -br : br;
    if (isBright[i]) brightArr.set([x, y, z, v], 4 * b++);
    else dimArr.set([x, y, z, v], 4 * d++);
  });

  // Dust: on the arms, wider and denser toward the core; the core's exclusion only.
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
