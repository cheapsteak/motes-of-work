// The ?lib=leak parity cases (parity.ts leakParity; re-skin Task 8b): which dots and wounds each case
// draws, at which ambients. Kept apart from the parity page, which runs in a browser, so a unit test can
// read them (leak.test.ts). The wounds reach both mirrors as the shell texture carries them (leak.ts
// packLeak, float32): the GLSL takes the texels as uniforms, the TS reads them back (unpackLeak).
import { latticeCount } from '../galaxy/body';
import type { Galaxy } from '../galaxy/generate';
import type { Vec3 } from '../math/vec';
import { NODE_DERP_PERIOD } from '../scene/node/birth';
import { LEAK_WOUNDS, leakWoundsAt, packLeak, unpackLeak, type Wound } from '../scene/node/leak';
import { latticeLL, llUnit, shellSeed } from '../scene/node/shell';

/** C1's slots the cases sample, its schedule forced to a scatter in every slot (the focused planet's): two early and one late in the hour. */
export const LEAK_SLOTS = [45, 46, 1200] as const;
/** Seconds after a slot's first wound opens the cases sample: curving out, lingering, coming home, home. */
export const LEAK_SINCE = [0.05, 0.4, 0.8, 1.2, 1.6, 2.0, 2.4, 2.9] as const;
/** Of C1's dots outside every open wound, every LEAK_OUTSIDE_STRIDE-th is sampled too (they must stay home). */
const LEAK_OUTSIDE_STRIDE = 97;

/** One leak case: C1's dots (each its unit lattice point, float32, and its index) under the wounds open at `t`, as the texture carries them. */
export interface LeakCase {
  name: string;
  t: number;
  /** The wounds' texels (packLeak), float32: LEAK_WOUNDS of (centre, cone), the ages, the seeds. */
  texels: Float32Array;
  /** The wounds as the TS reads them back from the texels at `t`. */
  wounds: Wound[];
  dots: { u: Vec3; i: number }[];
}

/** The leak cases over the essay's galaxy: each of LEAK_SLOTS at each of LEAK_SINCE after its first wound opens. */
export function leakCases(g: Galaxy): LeakCase[] {
  const c1 = g.bodies[g.ids.C1];
  const phase = Math.fround(c1.derpPhase);
  const seed = shellSeed(c1.id);
  const [rows, cols] = c1.lattice!;
  const f = Math.fround;
  const units: Vec3[] = Array.from({ length: latticeCount(rows, cols) }, (_, i) => {
    const ll = latticeLL(i, rows, cols);
    const u = llUnit({ lat: f(ll.lat), lon: f(ll.lon) });
    return [f(u[0]), f(u[1]), f(u[2])];
  });
  const out: LeakCase[] = [];
  for (const k of LEAK_SLOTS) {
    // The slot's own two wounds, read from the middle of the slot (the later pair of what it holds).
    const first = leakWoundsAt(c1.derpSeed, phase, seed, (k - phase + 0.5) * NODE_DERP_PERIOD, true).at(-2)!;
    for (const since of LEAK_SINCE) {
      const t = f(first.open + since);
      const texels = Float32Array.from(packLeak(leakWoundsAt(c1.derpSeed, phase, seed, t, true), t));
      const wounds = unpackLeak((j) => Array.from(texels.subarray(j * 4, j * 4 + 4)), t);
      const inside = (u: Vec3) => wounds.some((w) => u[0] * w.dir[0] + u[1] * w.dir[1] + u[2] * w.dir[2] >= w.cosT - 1e-3);
      const dots = units.flatMap((u, i) => (inside(u) || i % LEAK_OUTSIDE_STRIDE === 0 ? [{ u, i }] : []));
      out.push({ name: `slot ${k} at +${since} s`, t, texels, wounds, dots });
    }
  }
  if (out.some((c) => c.wounds.length > LEAK_WOUNDS)) throw new Error('leakCases: more wounds than the texture holds');
  return out;
}
