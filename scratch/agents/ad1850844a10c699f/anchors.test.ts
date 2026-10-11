import { writeFileSync } from 'node:fs';
import { it } from 'vitest';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';

it('writes the bike anchors (temporary)', () => {
  const a = mechanismAnchors(mechanisms.bike);
  writeFileSync(process.env.ANCHORS_OUT as string, JSON.stringify({ whole: a.whole, core: a.core }));
});
