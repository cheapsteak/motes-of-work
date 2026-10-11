import * as fs from 'fs';
import { it } from 'vitest';
import { generateGalaxy, galaxyBudget } from '/home/user/motes-of-work/src/galaxy/generate';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '/home/user/motes-of-work/src/config';
it('probe', () => {
  for (const seed of [MOTE_SEED, 2, 3]) {
    const g = generateGalaxy(seed, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    let moons = 0, over = 0, worst = 0, overSysR = 0;
    const planets = g.bodies.filter(b => b.kind === 'planet');
    for (const b of g.bodies) if (b.kind === 'moon') {
      const p = g.bodies[b.host]; moons++;
      const lift = b.orbit!.r * Math.sin(Math.abs(b.orbit!.tilt));
      if (lift > 2.5 * p.R * Math.sin(0.2) + 1e-12) over++;
      worst = Math.max(worst, b.orbit!.r / p.R);
    }
    for (const p of planets) { const ms = g.bodies.filter(m => m.kind==='moon' && m.host===p.index); const reach = Math.max(0, ...ms.map(m=>m.orbit!.r+m.R)); if (reach > 2.85*p.R+1e-12) overSysR++; }
    const n0 = g.bodies[g.ids['N0']]; const n0m = g.bodies.filter(m=>m.host===n0.index).map(m=>(m.orbit!.r/n0.R).toFixed(2));
    const c1 = g.bodies[g.ids['C1']]; const c1m = g.bodies.filter(m=>m.host===c1.index).map(m=>(m.orbit!.r/c1.R).toFixed(2));
    fs.appendFileSync('<scratchpad>/probe/out.txt', '\n' + JSON.stringify({ seed, planets: planets.length, moons, liftOverBound: over, maxTrackOverR: worst.toFixed(2), planetsWithReachOver2_85R: overSysR, n0Tracks: [...new Set(n0m)], c1Tracks: [...new Set(c1m)], motes: g.motes, phoneBg: 0 }));
  }
});
