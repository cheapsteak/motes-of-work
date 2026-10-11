import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { galaxyBudget, generateGalaxy } from '../galaxy/generate';
import { packShellData } from '../scene/node/bodyAttrs';
import { packBodyData } from '../scene/node/bodyData';
import { bodyMote, lampGain } from '../scene/node/bodyMote';
import { Lamp } from '../timeline/netTrack';
import { allBodyMoteAttrs, BODY_AMBIENTS, BODY_ARMS_CASE, BODY_CASES, BODY_DARK_CASES } from './bodyCases';

// The ?lib=body parity page compares the GLSL with the TS on these cases (parity.ts). The dark cases
// are there to compare the lamp's dark side: a case that drew no mote the lamp darkens would compare
// nothing of it and still pass.

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const all = allBodyMoteAttrs(g);

describe('the dark ?lib=body parity cases', () => {
  it('are the four lamps that light a set and darken drawn motes: the planet lamp on C1, the star lamp, the core lamp and the lineage lamp on P1 (the arms lamp darkens only the core rows, which draw nothing since the re-skin’s Task 5)', () => {
    const lamps = BODY_DARK_CASES.map((c) => {
      const k = c.clocks(g);
      return [k.lamp, k.lampRow === -1 ? null : g.bodies[k.lampRow].id];
    });
    expect(lamps).toEqual([
      [Lamp.Planet, 'C1'],
      [Lamp.Star, 'C1'],
      [Lamp.Core, null],
      [Lamp.Lineage, 'P1'],
    ]);
    for (const c of BODY_DARK_CASES) expect(BODY_CASES).toContain(c);
  });

  for (const c of BODY_DARK_CASES) {
    it(`${c.name}: at least 8 motes the lamp alone darkens, at each parity ambient`, () => {
      const motes = c.motes(g, all);
      const clocks = c.clocks(g);
      for (const ambient of BODY_AMBIENTS) {
        const shells = packShellData(g, Math.fround(ambient));
        const at = { ...clocks, ambient };
        // Visible with the lamp off (built, landed and at a drawn level), and outside the lamp's lit set
        // (lampGain 0): what the lamp alone takes out of the frame.
        const dark = motes.filter((a) => lampGain(a.row, at, data) === 0 && bodyMote(a, { ...at, lamp: Lamp.Off }, { ...data, shells }).visible);
        expect(dark.length, `${c.name} at ${ambient}`).toBeGreaterThanOrEqual(8);
        // And the lamp does darken them: the case compares the dark branch's outputs.
        for (const a of dark) {
          const out = bodyMote(a, at, { ...data, shells });
          expect(out.visible).toBe(false);
          expect(out.brightness).toBe(0);
        }
      }
    });
  }
});

describe('the arms lamp ?lib=body parity case', () => {
  it('samples the arms lamp (ly-4’s and the zoom-out’s) on the hashed motes, every drawn one of them lit, at each parity ambient', () => {
    expect(BODY_CASES).toContain(BODY_ARMS_CASE);
    const clocks = BODY_ARMS_CASE.clocks(g);
    expect(clocks.lamp).toBe(Lamp.Arms);
    const motes = BODY_ARMS_CASE.motes(g, all);
    for (const ambient of BODY_AMBIENTS) {
      const shells = packShellData(g, Math.fround(ambient));
      const at = { ...clocks, ambient };
      const drawn = motes.filter((a) => bodyMote(a, { ...at, lamp: Lamp.Off }, { ...data, shells }).visible);
      // Not vacuous: most of the 64 drawn, and every one of them lit under the lamp.
      expect(drawn.length, `at ${ambient}`).toBeGreaterThanOrEqual(8);
      for (const a of drawn) {
        expect(lampGain(a.row, at, data), `row ${a.row} at ${ambient}`).toBeGreaterThan(0);
        expect(bodyMote(a, at, { ...data, shells }).visible).toBe(true);
      }
    }
  });
});
