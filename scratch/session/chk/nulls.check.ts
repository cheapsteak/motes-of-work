import { it } from 'vitest';
import { essayNetwork } from '../../../src/timeline/netShots';
it('nulls', () => {
  const net = essayNetwork();
  const odd = net.nodes.filter((n) => n.hiAt !== null && n.fixAt === null).map((n) => n.id);
  console.log('hiAt set, fixAt null:', odd.length, odd.slice(0, 10).join(','));
});
