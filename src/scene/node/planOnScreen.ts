// Where the plans' schematics light the screen (re-skin §4.7, Task 7b): net-plan's and net-plan-screen's
// TypeScript twin as a whole, for the unit tests and the clearance twins (galaxyOnScreen.ts, netShots.ts
// cylinderTop). planFrameAt frames a camera as bodySystem.ts does (each system's real share by its unit's
// plain glow and the beats' hold; the held sizes its derps are scaled by, the focus's never under
// FREEZE_MIN_SYS_PX), then plan.ts planFrameOf; planPixels returns every lit plan dot on screen.
import { Vector3, type PerspectiveCamera } from 'three';
import { FREEZE_PINS } from '../../galaxy/ambient';
import { systemOuter, type Galaxy } from '../../galaxy/generate';
import { lampFocusRow } from '../../timeline/netTrack';
import type { SceneState } from '../../timeline/sceneState';
import { FREEZE_MIN_SYS_PX } from './birth';
import { systemIndexOf, unitIndexOf } from './bodyAttrs';
import type { BodyData } from './bodyData';
import type { BodyClocks } from './bodyMote';
import { detailPx, hoodGlowPx, hoodHold, hoodReal, LOD_COUNT, LOD_VISIBLE, onScreen, systemPx } from './lod';
import { bodyWorld } from './orbit';
import { planDot, planFrameOf, type PlanDot, type PlanFrame } from './plan';
import { buildPlanAttrs, planTable, PLAN_STRIDE } from './planAttrs';

const cache = new WeakMap<Galaxy, { table: Float32Array; pools: { world: Float32Array; screen: Float32Array } }>();

/** The essay galaxy's static plan pools and table, built once per galaxy. */
export function planStatic(g: Galaxy): { table: Float32Array; pools: { world: Float32Array; screen: Float32Array } } {
  let c = cache.get(g);
  if (!c) {
    const attrs = buildPlanAttrs(g);
    c = { table: planTable(g, g.systems.map((row) => systemOuter(g, row))), pools: { world: attrs.world, screen: attrs.screen } };
    cache.set(g, c);
  }
  return c;
}

/** The clocks a plan frame reads but the held sizes (planFrameAt fills them), and the beats' hold on the neighbourhood (uHoodHold: lod.ts hoodHold of net.hoodHold). */
export type PlanClocks = Omit<BodyClocks, 'sysPx'> & { hoodHold?: number };

/**
 * The plan frame bodySystem.ts draws through `camera` on a screen of `size` (CSS px) at `clocks`: each
 * system's real share by its unit's plain glow (hoodReal, held up to the beats' hold), the held sizes
 * (detailPx of each system's size on screen, the focused system never under FREEZE_MIN_SYS_PX while the
 * lamp's focus is up) for its derps, and the test mode's level-of-detail overrides `force` (none by default).
 */
export function planFrameAt(
  g: Galaxy,
  data: BodyData,
  camera: PerspectiveCamera,
  size: { width: number; height: number },
  clocks: PlanClocks,
  force: Float32Array = new Float32Array(LOD_COUNT).fill(-1),
): PlanFrame {
  camera.updateMatrixWorld();
  const eye = camera.getWorldPosition(new Vector3());
  const focal = 0.5 * size.height * camera.projectionMatrix.elements[5];
  const t = clocks.ambient;
  const unitOf = unitIndexOf(g);
  const at = new Vector3();
  const project = (p: readonly number[]) => {
    at.set(p[0], p[1], p[2]);
    const d = at.distanceTo(eye);
    at.project(camera);
    return { x: ((at.x + 1) / 2) * size.width, y: ((1 - at.y) / 2) * size.height, d, front: at.z < 1 && at.z > -1 };
  };
  const spots = g.units.map((row) => project(bodyWorld(data, row, t)));
  const real = g.systems.map((_, i) => hoodReal(hoodGlowPx(spots[unitOf[i]].d, focal), clocks.hoodHold ?? 0));
  const raw = g.systems.map((row) => {
    const c = project(bodyWorld(data, row, t));
    if (!c.front) return 0;
    const s = systemPx(systemOuter(g, row), c.d, focal);
    return s * onScreen(c.x, c.y, s, size.width, size.height);
  });
  const sysPx = new Float32Array(32);
  sysPx.set(detailPx(raw, unitOf));
  const focusSys = clocks.lampRow >= 0 ? systemIndexOf(g)[clocks.lampRow] : -1;
  if (clocks.focus > 0 && focusSys >= 0) sysPx[focusSys] = Math.max(sysPx[focusSys], FREEZE_MIN_SYS_PX);
  const view = { view: camera.matrixWorldInverse.elements, projection: camera.projectionMatrix.elements, width: size.width, height: size.height };
  return planFrameOf(g, data, planStatic(g).table, { view, clocks: { ...clocks, sysPx }, real, force });
}

/** Every lit plan dot of frame `f` (alpha at least LOD_VISIBLE), world marks and screen marks: its dot and which pool it is in. */
export function planPixels(g: Galaxy, data: BodyData, f: PlanFrame): (PlanDot & { screen: boolean })[] {
  const out: (PlanDot & { screen: boolean })[] = [];
  const { pools } = planStatic(g);
  for (const [a, screen] of [
    [pools.world, false],
    [pools.screen, true],
  ] as const) {
    for (let i = 0; i < a.length / PLAN_STRIDE; i++) {
      const d = planDot(a, i, f, data);
      if (d.alpha >= LOD_VISIBLE) out.push({ ...d, screen });
    }
  }
  return out;
}

/** The lit plan dots of frame `f`: how many and Σ alpha × size² (the test hook's plan()). */
export function planCount(g: Galaxy, data: BodyData, f: PlanFrame): { dots: number; brightness: number } {
  let dots = 0;
  let brightness = 0;
  for (const d of planPixels(g, data, f)) {
    dots++;
    brightness += d.alpha * d.sizeCss * d.sizeCss;
  }
  return { dots, brightness };
}

/** A lit plan dot on screen: its centre's x and its top (its centre less half its size), CSS px from the top left. */
export interface PlanPoint {
  x: number;
  top: number;
}

/**
 * The plan's dots the reader can make out at `s` (its net and freeze leaves) and ambient `ambient` (the
 * ambient shown: the pin while the hold is up, galaxyOnScreen.ts held), through `camera` on a screen of
 * `size` (CSS px): framed as bodySystem.ts frames them (planFrameAt: the lamp, the beats' hold on the
 * neighbourhood, the held planet's forced scatter while the freeze holds, the dressing on C1's piece with
 * the flash off, as the test mode draws it), every lit dot's centre x and top. The numerals are masked
 * under the text band already (planScreen.glsl streamBandMask). The clearance twins' plan term
 * (netShots.ts cylinderTop, netShots.test.ts visibleClearance).
 */
export function visiblePlan(
  g: Galaxy,
  data: BodyData,
  s: Pick<SceneState, 'net' | 'freeze'>,
  ambient: number,
  camera: PerspectiveCamera,
  size: { width: number; height: number },
): PlanPoint[] {
  if (!(s.net.show > 0)) return [];
  return planPixels(g, data, planFrameAt(g, data, camera, size, planClocksOf(g, s, ambient))).map((d) => ({ x: d.px[0], top: d.px[1] - 0.5 * d.sizeCss }));
}

/** The clocks bodySystem.ts hands the plan at `s` and the ambient shown `ambient` (visiblePlan's: the test mode's freeze frame, its flash off). */
export function planClocksOf(g: Galaxy, s: Pick<SceneState, 'net' | 'freeze'>, ambient: number): PlanClocks {
  const holding = s.freeze.hold >= 0.5 && s.net.focus > 0;
  const planet = g.ids.C1;
  return {
    growth: s.net.growth,
    fix: s.net.fix,
    highlight: s.net.highlight,
    show: s.net.show,
    ambient,
    focus: s.net.focus,
    lamp: Math.round(s.net.lamp),
    lampRow: lampFocusRow(s.net.lampAt, g),
    forcedScatter: holding && FREEZE_PINS.C1.path !== 'full' ? planet : -1,
    holding,
    freeze: { dress: s.freeze.dress, flash: 0, copy: 0, moon: g.ids[FREEZE_PINS.C1.moon], planet },
    hoodHold: hoodHold(s.net.hoodHold),
  };
}
