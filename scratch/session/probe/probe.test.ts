import { it } from 'vitest';
import { appendFileSync } from 'node:fs';
const R = 'src';
it('probe2', async () => {
  const { generateGalaxy, galaxyBudget } = await import(R + '/galaxy/generate');
  const { MOTE_SEED, MOTE_BUDGET_DESKTOP } = await import(R + '/config');
  let worst = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = generateGalaxy(seed === 1 ? MOTE_SEED : seed, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
    const shells = g.bodies.reduce((s: number, b: any) => s + b.motes, 0);
    const person = g.bodies.reduce((s: number, b: any) => s + b.personMotes, 0);
    const planets = g.bodies.filter((b: any) => b.kind === 'planet').length;
    const moons = g.bodies.filter((b: any) => b.kind === 'moon').length;
    const t5 = shells + 90 * planets + 40 * moons + g.bodies.length + g.systems.length + 6;
    worst = Math.max(worst, t5);
    if (seed <= 3) appendFileSync('out2.txt', JSON.stringify({ seed, shells, person, planets, moons, task5Sum: t5 }) + '\n');
  }
  appendFileSync('out2.txt', 'worst ' + worst + '\n');
});
