import * as fs from 'fs';
import { it } from 'vitest';
import { generateGalaxy, galaxyBudget } from '../../../src/galaxy/generate';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../../src/config';
it('bud', () => {
  const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
  const planets = g.bodies.filter(b => b.kind === 'planet');
  let tracks = 0;
  for (const p of planets) tracks += new Set(g.bodies.filter(m => m.kind==='moon' && m.host===p.index).map(m=>m.orbit!.r)).size;
  const shells = g.bodies.reduce((s,b)=>s+b.motes,0), person = g.bodies.reduce((s,b)=>s+b.personMotes,0);
  fs.writeFileSync('<scratchpad>/probe/out4.txt', JSON.stringify({ motes: g.motes, shells, person, planets: planets.length, moons: g.bodies.filter(b=>b.kind==='moon').length, tracks, trackDots: planets.length*90 + tracks*40, streams: g.streams.length, budget: galaxyBudget(MOTE_BUDGET_DESKTOP), bodies: g.bodies.length, systems: g.systems.length }));
});
