import * as fs from 'fs';
import { it } from 'vitest';
import { generateGalaxy, galaxyBudget } from '../../../src/galaxy/generate';
import { generateBackground } from '../../../src/galaxy/background';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../../src/config';
it('sector', () => {
  for (const tier of ['phone', 'desktop'] as const) {
    const g = generateGalaxy(MOTE_SEED, tier, galaxyBudget(MOTE_BUDGET_DESKTOP));
    for (const [name, bg] of [['mote', g.background], ['seed2', generateBackground(2, tier, [])]] as const) {
      const pts: number[][] = [];
      for (const a of [bg.stars, bg.bright]) for (let i = 0; i < a.length; i += 4) pts.push([a[i], a[i+1], a[i+2]]);
      const counts = Array(36).fill(0);
      for (const [x,,z] of pts) { if (Math.hypot(x,z) >= 40) continue; counts[Math.min(35, Math.floor(((Math.atan2(z,x)+Math.PI)/(2*Math.PI))*36))]++; }
      const s = [...counts].sort((a,b)=>a-b);
      // hood band: stars within 10 units of each hood star vs expected
      fs.appendFileSync(`<scratchpad>/probe/out2.txt`, `${tier} ${name} min=${s[0]} median=${(s[17]+s[18])/2} max=${s[35]}\n`);
    }
  }
});
