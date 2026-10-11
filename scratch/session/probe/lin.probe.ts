import * as fs from 'fs';
import { it } from 'vitest';
import { LINEAGE as NEW } from '/home/user/motes-of-work/src/galaxy/lineage';
import { LINEAGE as OLD } from '/home/user/motes-of-work/src/network/lineage';
it('lin', () => {
  const out: string[] = [`old ${OLD.length} new ${NEW.length}`];
  const map: Record<string,string> = { rule: 'core', plan: 'star', code: 'planet' };
  for (const o of OLD as any[]) {
    const n = (NEW as any[]).find((x) => x.id === o.id);
    if (!n) { out.push('missing ' + o.id); continue; }
    for (const k of ['born','dur','hiAt','fixAt','hero','alias']) if (o[k] !== n[k]) out.push(`${o.id}.${k}: ${o[k]} vs ${n[k]}`);
    const op = o.parents === 'nearest-clean-plan' ? 'nearest-clean-star' : JSON.stringify(o.parents);
    const np = n.parents === 'nearest-clean-star' ? 'nearest-clean-star' : JSON.stringify(n.parents);
    if (op !== np) out.push(`${o.id}.parents ${op} vs ${np}`);
    const ok = o.kind ?? o.layer;
    if (map[ok] !== n.kind) out.push(`${o.id}.kind ${ok} vs ${n.kind}`);
  }
  fs.writeFileSync('<scratchpad>/probe/out3.txt', out.join('\n'));
});
