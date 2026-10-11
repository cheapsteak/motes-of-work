import { test } from '/home/user/motes-of-work/node_modules/vitest/dist/index.js';
import { InstancedBufferAttribute } from 'three';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '/home/user/motes-of-work/src/config';
import { generateNetwork, networkBudget } from '/home/user/motes-of-work/src/network/generate';
import { buildNodeAttrs } from '/home/user/motes-of-work/src/scene/node/nodeAttrs';
import { packNodeData } from '/home/user/motes-of-work/src/scene/node/nodeData';
import { NODE_ATTRIBUTES, nodeInstancedAttributes, type NodeAttrs } from '/home/user/motes-of-work/src/scene/node/nodeLayout';
import { createNodeSystem } from '/home/user/motes-of-work/src/scene/node/nodeSystem';

const ms = (t0: number) => performance.now() - t0;

/** The packer as it was before: an array per mote per attribute (flatMap). */
function oldPacker(attrs: readonly NodeAttrs[]): Record<string, InstancedBufferAttribute> {
  const out: Record<string, InstancedBufferAttribute> = {};
  for (const spec of NODE_ATTRIBUTES) {
    const data = new Float32Array(attrs.length * spec.itemSize);
    attrs.forEach((a, i) =>
      data.set(
        spec.fields.flatMap((f) => {
          const v = a[f.field];
          return typeof v === 'number' ? [v] : [...v];
        }),
        i * spec.itemSize,
      ),
    );
    out[spec.name] = new InstancedBufferAttribute(data, spec.itemSize);
  }
  return out;
}

test('network build cost', () => {
  const budget = networkBudget(MOTE_BUDGET_DESKTOP);
  for (let run = 0; run < 6; run++) {
    let t = performance.now();
    const net = generateNetwork(MOTE_SEED, budget);
    const gen = ms(t);
    t = performance.now();
    const attrs = buildNodeAttrs(net);
    const build = ms(t);
    t = performance.now();
    packNodeData(net);
    const pack = ms(t);
    t = performance.now();
    oldPacker(attrs);
    const oldInst = ms(t);
    t = performance.now();
    nodeInstancedAttributes(attrs);
    const inst = ms(t);
    t = performance.now();
    createNodeSystem(net).dispose();
    const whole = ms(t);
    const f = (v: number) => v.toFixed(1);
    console.log(
      `run ${run}: generate ${f(gen)}, buildNodeAttrs ${f(build)}, packNodeData ${f(pack)}, packer old ${f(oldInst)} new ${f(inst)}, createNodeSystem ${f(whole)}, ` +
        `total new ${f(gen + whole)}, total old (est) ${f(gen + whole - inst + oldInst)} ms`,
    );
  }
});
