import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import type { MechanismAnchors } from '../mechanisms/anchors';
import type { Vec3 } from '../math/vec';
import { hash01 } from '../math/hash';
import { applyCamera } from '../scene/cameraRig';
import { BURST_GHOST_P, BURST_JITTER_HZ, BURST_JUMP, BURST_JUMP_P, FREEZE_MOON_S, FREEZE_PIN_OFFSET_S, FREEZE_PIN_SEARCH_S, NODE_DERP_DUR, NODE_DERP_PERIOD } from '../scene/node/birth';
import { packBodyData } from '../scene/node/bodyData';
import { derp, derpEvent, DerpKind } from '../scene/node/derp';
import { bodyWorld } from '../scene/node/orbit';
import { lookFromBearing } from '../timeline/cameraSpline';
import { defaultSceneState, mergeState } from '../timeline/sceneState';
import { AMBIENT_GRID, AMBIENT_GRID_TIMES, AMBIENT_POSE, FREEZE_PINS, HERO_CLOSE, pinnedMoon, searchPin, type PinPath } from './ambient';
import { galaxyBudget, generateGalaxy, HERO_MOON, PERSON_HERO_MOON, PERSON_HERO_PLANET, PERSON_MOON, type Body } from './generate';

const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const C1 = g.bodies[g.ids.C1];
const moons = g.bodies.filter((b) => b.kind === 'moon' && b.host === C1.index);
const PHONE = { w: 390, h: 844 };

/** Anchors under which machine-relative and world coordinates coincide. */
const UNIT: MechanismAnchors = {
  whole: { center: [0, 0, 0], radius: 1 },
  core: { center: [0, 0, 0], radius: 1 },
  body: { center: [0, 0, 0], radius: 1 },
};

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v: Vec3): number => Math.hypot(v[0], v[1], v[2]);
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const derpOf = (b: Body, t: number) =>
  derp(b.derpSeed, b.derpPhase, t, b.kind, b.orbit?.a ?? 0, b.R, b.orbit ? (2 * Math.PI) / b.orbit.period : 0, 1);

/** Where a world point lands on the phone, in CSS px, through the composed close shot on C1 at ambient t. */
function onPhone(p: Vec3, t: number): { x: number; y: number } {
  const shot = HERO_CLOSE.C1;
  const target = bodyWorld(data, C1.index, t);
  const dir = lookFromBearing(shot.bearing, shot.elevation);
  const pos = target.map((c, i) => c + dir[i] * shot.distance) as Vec3;
  const camera = new PerspectiveCamera(shot.fov, PHONE.w / PHONE.h, 0.01, 1000);
  applyCamera(camera, mergeState(defaultSceneState(), { camera: { pos, target, fov: shot.fov, frame: shot.frame, coreFocus: 0 } }), UNIT, {
    compose: true,
  });
  const q = new Vector3(...p).project(camera);
  return { x: ((q.x + 1) / 2) * PHONE.w, y: ((1 - q.y) / 2) * PHONE.h };
}

const inFrame = (p: { x: number; y: number }): boolean => p.x > 0.2 * PHONE.w && p.x < 0.8 * PHONE.w && p.y > 0.42 * PHONE.h && p.y < PHONE.h;

/** What one moon slot meets, read independently of searchPin: the hashes, the camera, the projection and C1's schedule. */
interface Clauses {
  t: number;
  moon: string;
  /** (a) a burst at s = 0.3 with the jump on, ≥ 0.2 r off the ellipse, and the ghost on. */
  burst: boolean;
  jump: boolean;
  ghost: boolean;
  /** (b) and (c): its home faces the camera, and it and its home are in the phone's frame. */
  framed: boolean;
  /** (d) C1 0.10–0.20 s into a scatter. */
  scatter: boolean;
}

let walked: Clauses[] | null = null;

/** Every slot k = 0..545 of every C1 moon, in the search's own order (k, then the moons' generated order), at s = 0.3 and half a jitter tick on. */
function clauseWalk(): Clauses[] {
  if (walked) return walked;
  const camDir = lookFromBearing(HERO_CLOSE.C1.bearing, HERO_CLOSE.C1.elevation);
  const out: Clauses[] = [];
  for (let k = 0; k <= Math.floor(FREEZE_PIN_SEARCH_S / NODE_DERP_PERIOD); k++)
    for (const m of moons) {
      const ev = derpEvent(m.derpSeed, m.derpPhase, (k - m.derpPhase) * NODE_DERP_PERIOD + NODE_DERP_PERIOD / 2);
      const t = ev.t0 + FREEZE_MOON_S * NODE_DERP_DUR + FREEZE_PIN_OFFSET_S;
      if (t < 0 || t > FREEZE_PIN_SEARCH_S) continue;
      // s = 0.3 (and 1/60 s) is micro-slot 2 of 8, 0.53 of the way in: the snap held.
      const h = (j: number) => hash01(m.derpSeed, ev.k * 64 + 2 * 8 + j);
      const burst = ev.kind === DerpKind.Burst;
      const rel = sub(bodyWorld(data, m.index, t), bodyWorld(data, C1.index, t));
      const facing = dot(rel, camDir) / len(rel) > 0.35;
      const framed = facing && inFrame(onPhone(pinnedMoon(g, data, m.index, t), t)) && inFrame(onPhone(bodyWorld(data, m.index, t), t));
      const s = derpOf(C1, t).scatterS;
      out.push({
        t,
        moon: m.id,
        burst,
        jump: burst && h(1) < Math.fround(BURST_JUMP_P) && Math.abs((h(2) - 0.5) * BURST_JUMP) >= 0.2,
        ghost: burst && h(6) < Math.fround(BURST_GHOST_P),
        framed,
        scatter: s >= 0.1 && s <= 0.2,
      });
    }
  walked = out;
  return out;
}

/** The paths, strongest first, and the clauses each needs. */
const PATHS: readonly PinPath[] = ['full', 'forced-scatter', 'forced-ghost', 'forced'];
const MEETS: Record<PinPath, (c: Clauses) => boolean> = {
  full: (c) => c.burst && c.jump && c.ghost && c.framed && c.scatter,
  'forced-scatter': (c) => c.burst && c.jump && c.ghost && c.framed,
  'forced-ghost': (c) => c.burst && c.jump && c.framed,
  forced: (c) => c.framed,
};

describe('the freeze pin', () => {
  it('walks the six moons of C1', () => {
    expect(moons).toHaveLength(6);
    expect(moons.every((m) => m.cracked)).toBe(true);
  });

  it('holds the moon the generator names (HERO_MOON), which takes 20 of the person’s motes to the others’ 6 and C1’s 70', () => {
    expect(FREEZE_PINS.C1.moon).toBe(HERO_MOON);
    expect(C1.personMotes).toBe(PERSON_HERO_PLANET);
    for (const m of moons) expect(m.personMotes, m.id).toBe(m.id === HERO_MOON ? PERSON_HERO_MOON : PERSON_MOON);
    expect([PERSON_HERO_PLANET, PERSON_HERO_MOON, PERSON_MOON]).toEqual([70, 20, 6]);
  });

  it('the pin is a fence: the path is named and its clauses hold', () => {
    const { t, path, moon } = FREEZE_PINS.C1;
    expect(['full', 'forced-scatter', 'forced-ghost', 'forced']).toContain(path);
    const m = moons.find((b) => b.id === moon)!;
    expect(m, moon).toBeDefined();
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(FREEZE_PIN_SEARCH_S);
    // (a) the moon is at s = 0.3 of a burst: micro-slot 2, the snap held, the jump (and the ghost) on.
    const ev = derpEvent(m.derpSeed, m.derpPhase, t);
    const d = derpOf(m, t);
    if (path !== 'forced') {
      expect(ev.active).toBe(true);
      expect(ev.kind).toBe(DerpKind.Burst);
      expect(ev.s).toBeCloseTo(FREEZE_MOON_S + FREEZE_PIN_OFFSET_S / NODE_DERP_DUR, 9);
      const h = (j: number) => hash01(m.derpSeed, ev.k * 64 + 2 * 8 + j);
      expect(h(1)).toBeLessThan(BURST_JUMP_P);
      // At least 0.2 r off its ellipse (freeze-frame §3.3).
      expect(Math.abs(d.dR)).toBeGreaterThanOrEqual(0.2 * m.orbit!.a);
      if (path !== 'forced-ghost') {
        expect(h(6)).toBeLessThan(BURST_GHOST_P);
        expect(d.ghost).toBe(1);
      }
    }
    // (b) its home faces the camera: the landing is not behind the planet's limb.
    const c1 = bodyWorld(data, C1.index, t);
    const home = bodyWorld(data, m.index, t);
    const camDir = lookFromBearing(HERO_CLOSE.C1.bearing, HERO_CLOSE.C1.elevation);
    const rel = sub(home, c1);
    expect(dot(rel, camDir) / len(rel)).toBeGreaterThan(0.35);
    // (c) the pinned moon (and its home) projects inside the central 60 % of a phone and under 0.42 of its height.
    for (const p of [pinnedMoon(g, data, m.index, t), home]) {
      const at = onPhone(p, t);
      expect(at.x).toBeGreaterThan(0.2 * PHONE.w);
      expect(at.x).toBeLessThan(0.8 * PHONE.w);
      expect(at.y).toBeGreaterThan(0.42 * PHONE.h);
      expect(at.y).toBeLessThan(PHONE.h);
    }
    // (d) C1's shell is 0.10–0.20 s into a scatter: every mote out, none home.
    if (path === 'full') {
      const s = derpOf(C1, t).scatterS;
      expect(s).toBeGreaterThanOrEqual(0.1);
      expect(s).toBeLessThanOrEqual(0.2);
    }
    expect(AMBIENT_POSE).toBe(t);
    expect(AMBIENT_GRID[0]).toBe(t);
    expect(AMBIENT_GRID).toHaveLength(8);
    expect(AMBIENT_GRID.slice(1)).toEqual([...AMBIENT_GRID_TIMES]);
  });

  it('is the first slot of its path, and no slot anywhere meets a stronger path', () => {
    const pin = FREEZE_PINS.C1;
    const walk = clauseWalk();
    expect(walk.length).toBeGreaterThan(3000);
    // Positive controls: each clause is true somewhere, so "no slot meets a stronger path" is not vacuous.
    for (const key of ['burst', 'jump', 'ghost', 'framed', 'scatter'] as const)
      expect(walk.some((c) => c[key]), `some slot has ${key}`).toBe(true);
    const at = walk.findIndex((c) => c.t === pin.t && c.moon === pin.moon);
    expect(at, 'the pin is a slot of the walk').toBeGreaterThanOrEqual(0);
    const rank = PATHS.indexOf(pin.path);
    // The pin meets its own path's clauses (`forced` may also be the very first slot) ...
    if (pin.path !== 'forced' || at !== 0) expect(MEETS[pin.path](walk[at]), pin.path).toBe(true);
    // ... no slot before it in the search's order does ...
    for (let i = 0; i < at; i++) expect(MEETS[pin.path](walk[i]), `${walk[i].moon} at ${walk[i].t}`).toBe(false);
    // ... and no slot at all meets any stronger path: forced-scatter means no (a)–(d) anywhere,
    // forced-ghost no (a)–(c), forced not even (a) without the ghost.
    for (const stronger of PATHS.slice(0, rank))
      for (const c of walk) expect(MEETS[stronger](c), `${stronger}: ${c.moon} at ${c.t}`).toBe(false);
  });

  it('holds the moon half a tick of the burst’s jitter past s = 0.3: off a jitter cut, so float32 and float64 read the same tick', () => {
    const { t, moon } = FREEZE_PINS.C1;
    const m = moons.find((b) => b.id === moon)!;
    const tick = (time: number) => {
      const ev = derpEvent(m.derpSeed, m.derpPhase, time);
      return ev.s * NODE_DERP_DUR * BURST_JITTER_HZ;
    };
    expect(FREEZE_PIN_OFFSET_S).toBeCloseTo(1 / 60, 12);
    // Half way through tick 9, in float64 and at the ambient float32 holds (the shaders' uAmbient).
    expect(tick(t) - 9).toBeCloseTo(0.5, 6);
    expect(Math.floor(tick(Math.fround(t)))).toBe(9);
    expect(Math.abs(tick(Math.fround(t)) - 9.5)).toBeLessThan(1e-4);
    // So the derp is the same either way: the jitter moved by the float32 rounding of the ambient is
    // none, where at the unoffset s = 0.3 (tick 9.0 exactly) the two read different ticks.
    const d64 = derpOf(m, t);
    const d32 = derpOf(m, Math.fround(t));
    for (let k = 0; k < 3; k++) expect(Math.abs(d64.wobble[k] - d32.wobble[k])).toBeLessThan(1e-6);
    const at = t - FREEZE_PIN_OFFSET_S;
    expect(tick(at)).toBeCloseTo(9, 9);
    const nearCut = [-1e-6, 1e-6].map((e) => derpOf(m, at + e).wobble);
    expect(Math.hypot(...nearCut[0].map((w, k) => w - nearCut[1][k]))).toBeGreaterThan(1e-3);
  });

  it('is the same pin on either tier', () => {
    expect(searchPin(generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP)), 'C1')).toEqual(FREEZE_PINS.C1);
  });

  it('places the pinned moon off its track by the derp, about its planet', () => {
    const { t, moon } = FREEZE_PINS.C1;
    const m = moons.find((b) => b.id === moon)!;
    const d = derpOf(m, t);
    const c1 = bodyWorld(data, C1.index, t);
    // Its home on its own clock (the burst may quantise it), about the planet where the planet is.
    const own = t + d.orbitT;
    const home = sub(bodyWorld(data, m.index, own), sub(bodyWorld(data, C1.index, own), c1));
    const p = pinnedMoon(g, data, m.index, t);
    const flat = (v: Vec3) => Math.hypot(v[0], v[2]);
    // Off the track radially by dR (in the plane, give or take the jitter), lifted by `lift`, turned along by dNu.
    expect(flat(sub(p, c1)) - flat(sub(home, c1))).toBeCloseTo(d.dR, 1);
    expect(p[1] - home[1]).toBeCloseTo(d.lift + d.wobble[1], 9);
    const bearing = (v: Vec3) => Math.atan2(v[2], v[0]);
    let turn = bearing(sub(p, c1)) - bearing(sub(home, c1));
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    expect(Math.abs(turn - d.dNu)).toBeLessThan(0.05);
  });
});

describe('the ambient grid', () => {
  it('poses the galaxy at the pin, then across its turn', () => {
    expect([...AMBIENT_GRID_TIMES]).toEqual([0, 149, 311, 487, 659, 853, 1061]);
    expect(AMBIENT_GRID).toEqual([AMBIENT_POSE, 0, 149, 311, 487, 659, 853, 1061]);
    expect(HERO_CLOSE.C1).toEqual({ bearing: -35, elevation: 32, distance: 3.4, fov: 36, frame: 1 });
  });
});
