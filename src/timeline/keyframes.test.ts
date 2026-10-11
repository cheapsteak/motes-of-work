import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyToPoint, transformDistance } from '../math/transform';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { CENTRE, SCALE } from '../mechanisms/bike';
import { steer, STEER_TWIN } from '../mechanisms/bike/kinematics';
import { topTubeEnds } from '../mechanisms/bike/shapes';
import { applyCamera } from '../scene/cameraRig';
import { buildMoteAttrs, MoteType, ROLE_INDEX } from '../scene/mote/attributes';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../config';
import { AMBIENT_POSE } from '../galaxy/ambient';
import { galaxyBudget, generateGalaxy } from '../galaxy/generate';
import { FLARE_WIDTH, groupCounts, mote, reflowBodies, reflowKeep } from '../scene/mote/mote';
import { partGroups } from '../mechanisms/bike/partGroups';
import { packBodyData } from '../scene/node/bodyData';
import { partTransforms } from '../scene/mote/partTransforms';
import { inkPoses } from '../scene/ink/inkPose';
import { sectionSpans } from '../scroll/progress';
import { briefThresholds, parsePartList } from '../story/brief';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import { SCENE_STATE_PATHS, ZERO_FAULTS, type SceneState } from './sceneState';
import { shotOf } from './shots';

// The shipped keyframes against the shipped story: they compile, they never jump at a section
// boundary, and the beats the thesis depends on hold across the whole of each section.

const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans); // validated at load

function at(id: string, local: number): number {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return span.start + local * (span.end - span.start);
}

function leaf(s: SceneState, path: string): number | number[] {
  return path.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown>)[k], s) as number | number[];
}

const LOCALS = Array.from({ length: 21 }, (_, i) => i / 20);
/** The bike's steering as a fraction of full lock, the drive's swing and the authored steer together. */
const steerFraction = (s: SceneState): number => steer(s.mech.drive, s.mech.variant, s.mech.steer) / STEER_TWIN;
/** The text band: the panel's bottom is never lower than this fraction of the height (storyboard §3.4). */
const TEXT_BAND = 0.42;

describe('keyframes.json', () => {
  it('covers the first story sections', () => {
    expect(spans.map((s) => s.id).slice(0, 4)).toEqual(['vibe-build', 'reveal', 'rewind', 'spec']);
  });

  it('is continuous across every section boundary', () => {
    // Small enough that a fast move through a boundary (the pull-back from ly-5 out to the galaxy
    // wide, through the page turn from layers into far: about 1e5 machine radii of camera key per unit
    // of progress at the boundary, Task 9) is no jump, and still large enough for a real jump to show.
    const eps = 1e-10;
    for (const { end } of spans.slice(0, -1)) {
      const before = sampler.sample(end - eps);
      const after = sampler.sample(end + eps);
      for (const path of Object.keys(SCENE_STATE_PATHS)) {
        const a = [leaf(before, path)].flat();
        const b = [leaf(after, path)].flat();
        a.forEach((v, i) => expect(Math.abs(v - b[i]), `${path} at ${end}`).toBeLessThan(1e-4));
      }
    }
  });

  it('never shakes the machine into a smear: jitter stays at or below 0.25, and the ghost below 1', () => {
    // Visual review (Task 9): jitter above ~0.25 smears every silhouette before any fault reads, and
    // a ghost at 1 washes out the misallocation colouring.
    for (let i = 0; i <= 400; i++) {
      const s = sampler.sample(i / 400);
      expect(s.mech.faults.jitter, `progress ${i / 400}`).toBeLessThanOrEqual(0.25);
      expect(s.mech.ghost, `progress ${i / 400}`).toBeLessThan(1);
    }
  });

  it('keeps the vibe build and the reveal fully vibed, the wrong twin, with no ghost', () => {
    for (const id of ['vibe-build', 'reveal']) {
      for (const l of LOCALS) {
        const s = sampler.sample(at(id, l));
        expect([s.provenance.vibed, s.mech.variant, s.mech.ghost], `${id} local ${l}`).toEqual([1, 1, 0]);
      }
    }
    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);
    expect(sampler.sample(at('vibe-build', 0.83333333)).mech.assembly).toBe(1);
  });

  // The cold open (docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1, §2.4, as amended for the
  // basket and the mudguards): the bike is built in five held stages while the brief is up, each
  // stage flying in as its line comes up (the author, 2026-10-05: the parts arrive with the words)
  // and lighting the line once its parts have landed; every stage is held until the next line comes
  // up. The mudguards' line comes up inside the frame's stage, as their motes set out.
  it('builds the bike in five held stages while the brief is up, lighting its lines where the storyboard says', () => {
    const assembly = (l: number) => sampler.sample(at('vibe-build', l)).mech.assembly;
    for (const l of [0, 0.05, 0.11111111, 0.15277778]) expect(assembly(l), `local ${l}`).toBe(0);
    for (const [from, to, value] of [
      [0.22222222, 0.26388889, 0.33],
      [0.32638889, 0.41666667, 0.49],
      [0.46527778, 0.58333333, 0.61],
      [0.67361111, 0.72222222, 0.73],
    ]) {
      for (let i = 0; i <= 10; i++) expect(assembly(from + ((to - from) * i) / 10), `held at ${value}`).toBeCloseTo(value, 12);
    }
    for (const l of [0.83333333, 0.86111111, 0.95, 1]) expect(assembly(l), `local ${l}`).toBe(1);
    const lines = [...loadStory()[0].body.matchAll(/data-parts="([^"]*)"/g)].map((m) => ({
      parts: parsePartList(m[1]),
    }));
    const thresholds = briefThresholds(lines, mechanisms.bike);
    // Where each line lights: the first 1e-5 of the section at which the build reaches its threshold.
    // One scan for every line, through the assembly track alone (a whole-state sample builds all 41
    // tracks' state, ten times the cost; a scan per line read the start of the section six times).
    const one = new KeyframeSampler({ tracks: { 'mech.assembly': (keyframes as unknown as KeyframeFile).tracks['mech.assembly'] } }, spans);
    const built = (l: number) => one.sample(at('vibe-build', l)).mech.assembly;
    const lights = thresholds.map(() => Infinity);
    for (let i = 0; i <= 100_000 && lights.includes(Infinity); i++) {
      const a = built(i / 100_000);
      thresholds.forEach((t, k) => {
        if (lights[k] === Infinity && a >= t) lights[k] = i / 100_000;
      });
    }
    // The one track is the whole state's: the same build on either side of every light.
    for (const l of lights.flatMap((x) => [x - 1e-5, x])) expect(built(l), `local ${l}`).toBe(assembly(l));
    [0.2201, 0.3225, 0.4612, 0.6667, 0.8139, 0.8222].forEach((want, i) => expect(lights[i], `line ${i + 1}`).toBeCloseTo(want, 3));
    for (const l of [0, 0.22222222, 0.28472222]) expect(sampler.sample(at('vibe-build', l)).mech.drive, `local ${l}`).toBe(0);
  });

  it('drops the basket in only once the front wheel has turned and is straight, and lands it before the frame line', () => {
    // The author, 2026-10-05: "Can we animate the basket in after the wheel turns?"
    const s = (l: number) => sampler.sample(at('vibe-build', l));
    const basket = mechanisms.bike.parts.find((p) => p.id === 'basket');
    if (!basket?.settle) throw new Error('no basket window');
    const setOut = basket.settle[0] - 0.08;
    let firstOut = Infinity;
    for (let i = 0; i <= 20_000; i++) {
      const l = i / 20_000;
      if (s(l).mech.assembly > setOut + 1e-12) {
        firstOut = l;
        break;
      }
    }
    // The turn is over (steer back at 0 from 0.5625) before the basket's motes leave the shell.
    expect(firstOut).toBeGreaterThan(0.5625);
    for (let l = 0.5625; l <= firstOut; l += 0.001) expect(s(l).mech.steer, `local ${l}`).toBe(0);
    // It has landed, hop and all, before the frame's line comes up at 0.72222222.
    expect(s(0.67).mech.assembly).toBeGreaterThanOrEqual(basket.settle[1]);
  });

  it('turns the cranks twice with the chain, then holds the drive at an even number of turns until vb-4 rides', () => {
    const drive = (l: number) => sampler.sample(at('vibe-build', l)).mech.drive;
    expect(drive(0.28472222)).toBe(0);
    expect(drive(0.375)).toBe(2);
    for (let i = 0; i <= 20; i++) expect(drive(0.375 + ((0.86111111 - 0.375) * i) / 20)).toBe(2);
    expect(drive(1)).toBeCloseTo(2.4, 12);
  });

  // No mote may flare while the picture is at rest (§3.7, test 5): every assembly hold in the essay
  // sits at least FLARE_WIDTH from every settle value of the bike.
  it('never flares a mote of the bike while assembly is held', () => {
    const settles = buildMoteAttrs(mechanisms.bike, mechanisms.bike.samplePoints(30_000, 9)).map((a) => a.settle);
    const STEP = 0.0005;
    let holds = 0;
    let p = 0;
    while (p < 1) {
      const value = sampler.sample(p).mech.assembly;
      let q = p;
      while (q + STEP <= 1 && sampler.sample(q + STEP).mech.assembly === value) q += STEP;
      if (q > p) {
        holds++;
        const near = Math.min(...settles.map((s) => Math.abs(s - value)));
        expect(near, `assembly held at ${value} from progress ${p.toFixed(4)} to ${q.toFixed(4)}`).toBeGreaterThanOrEqual(FLARE_WIDTH);
      }
      p = q + STEP;
    }
    // The cold open's 0 and four stage holds, the finished bike, the spec's 0 and its core at 0.34.
    expect(holds).toBeGreaterThanOrEqual(8);
  });

  it('holds the bike assembled through the reveal while the drive never falls back', () => {
    const start = sampler.sample(at('reveal', 0));
    expect(start.mech.drive).toBeCloseTo(2.4, 9);
    let drive = start.mech.drive;
    for (const l of LOCALS) {
      const s = sampler.sample(at('reveal', l));
      expect(s.mech.assembly, `local ${l}`).toBe(1);
      expect(s.mech.drive, `local ${l}`).toBeGreaterThanOrEqual(drive);
      drive = s.mech.drive;
    }
    expect(drive).toBeCloseTo(3, 9);
  });

  it('turns the twin to near full lock for the rest of the reveal, and holds still from rv-5 on', () => {
    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.375 the steering stays
    // within 10% of full lock, but for rv-3's swing (0.3625 to 0.5); from rv-5 (0.625) to the end the
    // reveal is a still life.
    for (let i = 0; i <= 100; i++) {
      const l = 0.375 + (0.625 * i) / 100;
      if (l > 0.3625 && l < 0.5) continue;
      const s = sampler.sample(at('reveal', l));
      expect(Math.abs(steerFraction(s)), `local ${l}`).toBeGreaterThanOrEqual(0.9);
    }
    const hold = sampler.sample(at('reveal', 0.625)).mech.drive;
    for (let i = 0; i <= 50; i++) {
      const s = sampler.sample(at('reveal', 0.625 + (0.375 * i) / 50));
      expect(s.mech.drive).toBe(hold);
      expect(s.mech.steer).toBe(0);
    }
  });

  // The steer track (§2.3): the front wheel stays straight while the chain is shown, and turns on
  // its own segment, before the frame, with nothing else moving.
  it('keeps the front wheel straight while the drive turns twice: the authored steer cancels its swing', () => {
    let worst = 0;
    for (let i = 0; i <= 400; i++) {
      const l = 0.28472222 + ((0.375 - 0.28472222) * i) / 400;
      worst = Math.max(worst, Math.abs(steerFraction(sampler.sample(at('vibe-build', l)))));
    }
    expect(worst).toBeLessThanOrEqual(0.02);
    // Not vacuous: the drive's own swing reaches full lock over the same stretch.
    expect(Math.abs(Math.sin((Math.PI * sampler.sample(at('vibe-build', 0.32986111)).mech.drive) / 2))).toBeCloseTo(1, 6);
  });

  it('turns the front wheel straight, to one lock, across to the other and back, with nothing else moving', () => {
    const s = (l: number) => sampler.sample(at('vibe-build', l));
    const fractions = Array.from({ length: 401 }, (_, i) => steerFraction(s(0.47916667 + ((0.5625 - 0.47916667) * i) / 400)));
    expect(fractions[0]).toBeCloseTo(0, 9);
    expect(fractions[400]).toBeCloseTo(0, 9);
    expect(Math.max(...fractions)).toBeCloseTo(1, 9);
    expect(Math.min(...fractions)).toBeCloseTo(-1, 9);
    expect(steerFraction(s(0.5))).toBeCloseTo(1, 9);
    expect(steerFraction(s(0.54166667))).toBeCloseTo(-1, 9);
    for (const l of [0.47916667, 0.5, 0.53, 0.5625]) {
      expect(s(l).mech.assembly, `local ${l}`).toBeCloseTo(0.61, 12);
      expect(s(l).mech.drive, `local ${l}`).toBe(2);
    }
  });

  it('swings the seat with the wheel in rv-3, reaching the other lock and coming back', () => {
    // Storyboard §2.2: the drive's own swing has the wheel near one lock; the authored swing carries
    // it to the other and back while the line is up.
    const fractions = Array.from({ length: 201 }, (_, i) => steerFraction(sampler.sample(at('reveal', 0.325 + (0.1875 * i) / 200))));
    const start = fractions[0];
    expect(Math.sign(start), 'it starts on the other lock').toBe(-1);
    expect(Math.abs(start)).toBeGreaterThan(0.85);
    expect(Math.max(...fractions)).toBeCloseTo(1, 9);
    expect(Math.abs(fractions[200] - start), 'and comes back').toBeLessThan(0.15);
  });

  it('adds steering nowhere else', () => {
    const swings = [
      [at('vibe-build', 0.28472222), at('vibe-build', 0.375)],
      [at('vibe-build', 0.47916667), at('vibe-build', 0.5625)],
      [at('reveal', 0.3625), at('reveal', 0.5)],
    ];
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000;
      if (swings.some(([a, b]) => p > a && p < b)) continue;
      expect(sampler.sample(p).mech.steer, `progress ${p}`).toBe(0);
    }
  });

  it.each([
    [1440, 900],
    [390, 844],
  ])('frames the whole reveal twin, ground and all, inside the frame and below the text band, at %ix%i', (w, h) => {
    // The text sits at the top (storyboard §3.4): its band ends at 42% of the height. The wide
    // reveal shots (rv-5 and rv-7, from local 0.675) show the whole twin under it, nothing cropped.
    const bike = mechanisms.bike;
    const anchors = mechanismAnchors(bike);
    const points = bike.samplePoints(20_000, 1);
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    for (let i = 0; i <= 13; i++) {
      const l = 0.675 + 0.025 * i;
      const s = sampler.sample(at('reveal', l));
      applyCamera(camera, s, anchors, { compose: true });
      const xf = partTransforms(bike, s);
      const v = points.map((b) => new Vector3(...applyToPoint(xf[b.part], b.localTwin)).project(camera));
      const top = Math.max(...v.map((p) => p.y));
      expect(top, `local ${l}: the top below the band`).toBeLessThan(1 - 2 * TEXT_BAND);
      expect(Math.min(...v.map((p) => p.y)), `local ${l}: the bottom on screen`).toBeGreaterThan(-1);
      expect(Math.max(...v.map((p) => Math.abs(p.x))), `local ${l}: both ends on screen`).toBeLessThan(1);
    }
  });

  it.each([
    [1440, 900],
    [1280, 720],
    [390, 844],
  ])('shows the twin top tube climbing at least 15 degrees to the front through the reveal, at %ix%i', (w, h) => {
    // Spec §5.8: the frame is built round the swap, and its climbing top tube is the whole-frame cue.
    // The frame never moves, so its top tube's ends are fixed bike points.
    const anchors = mechanismAnchors(mechanisms.bike);
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    const [rear, front] = topTubeEnds('twin').map((p) => new Vector3(...p.map((v, k) => (v - CENTRE[k]) * SCALE)));
    for (let i = 0; i <= 15; i++) {
      const l = 0.375 + (0.625 * i) / 15;
      applyCamera(camera, sampler.sample(at('reveal', l)), anchors, { compose: true });
      const a = rear.clone().project(camera);
      const b = front.clone().project(camera);
      // In pixels: the front end stands higher on screen than the rear, by at least 15 degrees.
      const dx = Math.abs((b.x - a.x) * w);
      const dy = (b.y - a.y) * h;
      expect((Math.atan2(dy, dx) * 180) / Math.PI, `local ${l}`).toBeGreaterThanOrEqual(15);
    }
  });

  it('rises in the reveal to a high front three-quarter, never side-on, so the swap cannot read as reversed', () => {
    // Spec §4 I.1b: side-on is the most mistakable angle (a swapped bike reads as a normal bike facing
    // the other way); from high and in front, the saddle's turn and the fork under it read.
    // From rv-5 on (the camera is back on the wide reveal shot by local 0.675). Bearing in bike terms:
    // 0 from the front, 90 from the drive side (src/timeline/shots.ts).
    const anchors = mechanismAnchors(mechanisms.bike);
    for (let i = 0; i <= 26; i++) {
      const l = 0.675 + 0.0125 * i;
      const s = sampler.sample(at('reveal', l));
      const shot = shotOf(s.camera, anchors);
      expect(shot.bearing, `local ${l}`).toBeGreaterThanOrEqual(30);
      expect(shot.bearing, `local ${l}`).toBeLessThanOrEqual(60);
      expect(shot.elevation, `local ${l}`).toBeGreaterThanOrEqual(20);
      expect(s.camera.fov, `local ${l}`).toBeLessThanOrEqual(33);
    }
  });

  it('ends the rewind as a specced nebula that has never shown a ghost', () => {
    for (const l of LOCALS) expect(sampler.sample(at('rewind', l)).mech.ghost, `local ${l}`).toBe(0);
    const end = sampler.sample(at('rewind', 1));
    expect([end.mech.assembly, end.mech.variant, end.provenance.vibed, end.mech.drive]).toEqual([0, 0, 0, 0]);
  });

  // The spec section, the drawing first (storyboard §2.4; docs/specs/2026-10-05-blueprint-and-
  // build.md §4.2, §5 test 4): the agent draws the bike in ink on a sheet of paper, in the wrong
  // shape; you ring the seat, the agent strikes out the wrong lines and draws new ones, you tick it;
  // the lines lift off the page, the page goes, the gold core lands on the lines, then the blue body
  // round it, and the finished bike rides. The motes are the correct, specced machine throughout;
  // only the drawing is ever the twin.
  const SPEC_SAMPLES = 10_000;
  const specAt = (i: number) => sampler.sample(at('spec', i / SPEC_SAMPLES));
  const specStates = Array.from({ length: SPEC_SAMPLES + 1 }, (_, i) => ({ l: i / SPEC_SAMPLES, s: specAt(i) }));

  it('keeps the motes the correct, specced machine through the spec, the cloud loose until sp-7, and the dotted ghost off', () => {
    for (const { l, s } of specStates) {
      expect([s.provenance.vibed, s.mech.variant, s.mech.ghost, s.mech.ghostVariant], `local ${l}`).toEqual([0, 0, 0, 0]);
      if (l <= 0.72) expect(s.mech.assembly, `local ${l}`).toBe(0);
    }
  });

  it('draws the page and the ink only in the spec section', () => {
    for (let i = 0; i <= 2000; i++) {
      const p = i / 2000;
      if (p >= at('spec', 0)) break;
      const s = sampler.sample(p);
      expect([s.sheet.opacity, s.ink.opacity, s.stage.motes], `progress ${p}`).toEqual([0, 0, 1]);
    }
  });

  it('draws the ink in by the pen as sp-2 is up, and holds it drawn', () => {
    let prev = 0;
    for (const { l, s } of specStates) {
      expect(s.ink.drawn, `local ${l}`).toBeGreaterThanOrEqual(prev);
      prev = s.ink.drawn;
      if (l <= 0.05) expect(s.ink.drawn, `local ${l}`).toBe(0);
      if (l >= 0.16) expect(s.ink.drawn, `local ${l}`).toBe(1);
      if (l > 0.05 && l < 0.16) expect(s.ink.opacity, `local ${l}`).toBe(1);
    }
  });

  it('redraws during sp-4 only: the ring drawn as the line says it, the redraw after it, the ring gone by its end', () => {
    for (const { l, s } of specStates) {
      if (l <= 0.32) expect(s.ink.redraw, `local ${l}`).toBe(0);
      if (l >= 0.41) expect(s.ink.redraw, `local ${l}`).toBe(1);
      if (l <= 0.28) expect(s.ink.ring, `local ${l}`).toBe(0);
      if (l >= 0.42) expect(s.ink.ring, `local ${l}`).toBe(2);
      if (l < 0.46) expect(s.ink.tick, `local ${l}`).toBe(0);
      if (l >= 0.49) expect(s.ink.tick, `local ${l}`).toBe(1);
    }
    const ringUp = specStates.filter(({ s }) => s.ink.ring === 1).map(({ l }) => l);
    expect(Math.min(...ringUp)).toBeGreaterThanOrEqual(0.27);
    expect(Math.max(...ringUp)).toBeLessThanOrEqual(0.43);
  });

  it('presses the drawing flat on an opaque page until the lift, and lets it up only as the page goes', () => {
    for (const { l, s } of specStates) {
      if (l <= 0.61) expect(s.ink.flat, `local ${l}`).toBe(1);
      if (l >= 0.69) expect(s.ink.flat, `local ${l}`).toBe(0);
      if (l >= 0.08 && l <= 0.6) expect(s.sheet.opacity, `local ${l}`).toBe(1);
      if (l >= 0.69) expect(s.sheet.opacity, `local ${l}`).toBe(0);
      // Nothing lifts through an opaque page.
      if (s.ink.flat < 1) expect(s.sheet.opacity, `local ${l}`).toBeLessThan(0.999);
      // The cloud is dust behind the page while it is up.
      if (s.sheet.opacity === 1) expect(s.stage.motes, `local ${l}`).toBeCloseTo(0.1, 12);
    }
  });

  it('brings the cloud back before any mote lands, everywhere in Act I', () => {
    // Act II dims the built bike on purpose as it reflows into one small stack (zoom-out, below).
    const end = at('zoom-out', 0);
    for (let i = 0; i < 20_000; i++) {
      const p = (i / 20_000) * end;
      const s = sampler.sample(p);
      if (s.mech.assembly > 0) expect(s.stage.motes, `progress ${p}`).toBeGreaterThanOrEqual(0.9);
      if (s.sheet.opacity === 0 && p < at('spec', 0)) expect(s.stage.motes).toBe(1);
    }
    for (const { l, s } of specStates) if (l >= 0.72) expect(s.stage.motes, `local ${l}`).toBe(1);
  });

  it('leaves the lines faint beneath the finished bike', () => {
    const s = (l: number) => sampler.sample(at('spec', l));
    for (const l of [0.05, 0.5, 0.7, 0.9]) expect(s(l).ink.opacity, `local ${l}`).toBe(1);
    expect(s(0.97).ink.opacity).toBe(0.25);
    expect(s(1).ink.opacity).toBe(0.25);
    expect(s(1).ink.flat).toBe(0);
  });

  // sp-7: the gold lands first, and only the gold. The core lands by spec@0.84 (a little past its
  // settle window, 0.32, so no per-mote ease is still finishing) and holds while no body mote has
  // begun to land, until sp-8 starts the body at 0.85.
  // The bicycle staggers its body after the core (bike/index.ts), so its body has not begun; the
  // other machines' default windows overlap, so for them only the core is checked.
  it.each(Object.entries(mechanisms))('lands the whole %s core during sp-7 (and, for the bicycle, nothing of its body)', (id, mech) => {
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4));
    const frame = (l: number) => {
      const s = sampler.sample(at('spec', l));
      const xf = partTransforms(mech, s);
      return attrs.map((a) => ({ role: a.role, m: mote(a, s, xf) }));
    };
    for (const l of [0.84, 0.845, 0.85]) {
      const motes = frame(l);
      const core = motes.filter((x) => x.role === ROLE_INDEX.core);
      expect(core.length).toBeGreaterThan(0);
      for (const { m } of core) expect(m.settled, `core at spec@${l}`).toBe(1);
      if (id !== 'bike') continue;
      for (const { m } of motes.filter((x) => x.role === ROLE_INDEX.body)) expect(m.settled, `body at spec@${l}`).toBe(0);
    }
    expect(sampler.sample(at('spec', 0.84)).mech.assembly).toBe(0.34);
  });

  it.each(Object.entries(mechanisms))('builds the whole %s onto its drawing by spec@0.95 and keeps it there to the end', (_id, mech) => {
    for (const l of [0.95, 0.97, 1]) {
      const s = sampler.sample(at('spec', l));
      expect(s.mech.assembly, `spec@${l}`).toBe(1);
      const xf = partTransforms(mech, s);
      // Where the lines stand: the intended machine, as the ink is posed (src/scene/ink/inkPose.ts).
      const lines = inkPoses(mech, s).correct;
      mech.parts.forEach((part, i) => {
        expect(transformDistance(xf[i], lines[i]), `${part.id} at spec@${l}`).toBeLessThan(1e-6);
      });
    }
  });

  it('draws the finished bicycle on its lines at the end of Act I, to a tenth of a pixel, at desktop and phone sizes', () => {
    // Every settled mote stands on its part's posed surface, and the ink's outline points, lifted
    // (ink.flat 0), stand on the same posed parts: the two coincide part for part.
    const mech = mechanisms.bike;
    const anchors = mechanismAnchors(mech);
    const s = sampler.sample(at('spec', 1));
    const xf = partTransforms(mech, s);
    const lines = inkPoses(mech, s).correct;
    const attrs = buildMoteAttrs(mech, mech.samplePoints(6000, 4)).filter((a) => a.role !== ROLE_INDEX.drift);
    for (const [w, h] of [
      [1440, 900],
      [390, 844],
    ]) {
      const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
      applyCamera(camera, s, anchors, { compose: true });
      const px = (p: Vector3) => [(p.x * w) / 2, (p.y * h) / 2];
      let worst = 0;
      for (const a of attrs) {
        const m = mote(a, s, xf);
        expect(m.settled).toBe(1);
        const drawn = px(new Vector3(...m.pos).project(camera));
        const onLines = px(new Vector3(...applyToPoint(lines[a.part], a.local)).project(camera));
        worst = Math.max(worst, Math.hypot(drawn[0] - onLines[0], drawn[1] - onLines[1]));
      }
      expect(worst, `${w}x${h}`).toBeLessThan(0.1);
    }
  });

  it('holds the drive still until the bike is nearly built, then rides it out to the end', () => {
    const drive = (l: number) => sampler.sample(at('spec', l)).mech.drive;
    for (const l of [0, 0.3, 0.6, 0.8, 0.84, 0.9]) expect(drive(l), `local ${l}`).toBe(0);
    let prev = 0;
    for (let i = 91; i <= 100; i++) {
      const d = drive(i / 100);
      expect(d, `local ${i / 100}`).toBeGreaterThan(prev);
      prev = d;
    }
    expect(drive(1)).toBe(1.4);
  });

  // A jump in the world-space camera keeps its size as sampling gets finer; a continuous path's
  // largest step halves. Covers the coreFocus hand-over in the spec, where pos and anchor both move.
  it.each(Object.entries(mechanisms))('moves the %s camera continuously through the whole story', (_id, mech) => {
    const anchors = mechanismAnchors(mech);
    const camera = new PerspectiveCamera(40, 1280 / 720, 0.1, 100);
    const maxStep = (n: number): number => {
      let worst = 0;
      let prev: Vector3[] | null = null;
      for (let i = 0; i <= n; i++) {
        applyCamera(camera, sampler.sample(i / n), anchors);
        const look = camera.getWorldDirection(new Vector3()).add(camera.position);
        const cur = [camera.position.clone(), look];
        if (prev) worst = Math.max(worst, ...cur.map((v, k) => v.distanceTo((prev as Vector3[])[k])));
        prev = cur;
      }
      return worst;
    };
    // Fine enough to resolve Act II's page-turn moves, keyed every 0.025 screens (netShots.ts
    // MOVE_KEYS): at 2,000 samples (one every 0.025 screens) a sample spans a whole key interval of
    // the fastest of them, the pull-back into fr-1, and the step cannot halve.
    const coarse = maxStep(8000);
    expect(coarse).toBeGreaterThan(0);
    expect(maxStep(16000)).toBeLessThan(0.6 * coarse);
  });
});

/**
 * Act II opens (docs/specs/2026-10-06-act-2-storyboard-and-network.md §2.1, §2.10, §4; galaxy-orbits
 * §14.3): under zo-1 the riding bike reflows into its planet and seven moons while the camera rises
 * over it, the drawing's faint lines go and the bike's draw dims so a hundred thousand motes on one
 * small planet do not blow out white; the galaxy comes up as zo-2 does, and its growth and stream
 * clocks start. By zo-2's end the bike's draw is out and its planet is the galaxy's own N0, drawn as
 * every planet is.
 */
describe('zoom-out', () => {
  const z = (l: number) => sampler.sample(at('zoom-out', l));
  const between = (a: number, b: number) => Array.from({ length: 41 }, (_, i) => a + ((b - a) * i) / 40);

  it('starts where Act I ends, the bike whole, riding, and unreflowed', () => {
    const s = z(0);
    expect([s.mech.reflow, s.mech.assembly, s.mech.drive, s.ink.opacity, s.stage.motes, s.net.show, s.net.growth, s.clock]).toEqual([
      0, 1, 1.4, 0.25, 1, 0, 0, 0,
    ]);
  });

  it('reflows the bike into its planet and moons over 0.04-0.40, and keeps it there', () => {
    for (const l of between(0, 0.04)) expect(z(l).mech.reflow, `local ${l}`).toBe(0);
    let prev = 0;
    for (const l of between(0.04, 0.4)) {
      expect(z(l).mech.reflow, `local ${l}`).toBeGreaterThanOrEqual(prev);
      prev = z(l).mech.reflow;
    }
    expect(z(0.22).mech.reflow).toBeCloseTo(0.5, 9); // the middle of an inOutCubic
    for (const l of between(0.4, 1)) expect(z(l).mech.reflow, `local ${l}`).toBe(1);
  });

  it('turns the wheels on as the bike loosens: the drive 1.4 to 1.9 over 0-0.40, then held', () => {
    for (const l of between(0, 0.4).slice(1)) expect(z(l).mech.drive, `local ${l}`).toBeGreaterThan(z(l - 0.009).mech.drive);
    for (const l of between(0.4, 1)) expect(z(l).mech.drive, `local ${l}`).toBe(1.9);
  });

  it('lets the faint lines go over 0-0.08', () => {
    expect(z(0.04).ink.opacity).toBeGreaterThan(0);
    expect(z(0.04).ink.opacity).toBeLessThan(0.25);
    for (const l of between(0.08, 1)) expect(z(l).ink.opacity, `local ${l}`).toBe(0);
  });

  it('dims the bike to 0.2 over the reflow and out by the end of zo-2, its planet drawn by the galaxy then, never brightening', () => {
    for (const l of between(0, 0.1)) expect(z(l).stage.motes, `local ${l}`).toBe(1);
    expect(z(0.45).stage.motes).toBeCloseTo(0.2, 12);
    expect(z(0.5).stage.motes).toBeCloseTo(0.2, 12);
    for (const l of between(0.9, 1)) expect(z(l).stage.motes, `local ${l}`).toBe(0);
    for (const l of between(0, 1).slice(1)) expect(z(l).stage.motes, `local ${l}`).toBeLessThanOrEqual(z(l - 0.025).stage.motes + 1e-12);
  });

  it('brings the galaxy up over 0.30-0.50 as zo-2 comes, and starts its clocks', () => {
    for (const l of between(0, 0.3)) expect(z(l).net.show, `local ${l}`).toBe(0);
    for (const l of between(0.5, 1)) expect(z(l).net.show, `local ${l}`).toBe(1);
    // Growth: nothing but the first piece's own rule and plan until the arms light (0.52), then the
    // first rules and plans under zo-2 (netShots.ts ZOOM_OUT.growth, against the schedule's births).
    expect([z(0).net.growth, z(0.52).net.growth, z(1).net.growth]).toEqual([0, 0.018, 0.12]);
    // The streams' clock runs 1.3 per screen of scroll from the start of Act II.
    expect(z(1).clock).toBeCloseTo(1.3 * 2.2, 12);
    for (const l of between(0, 1).slice(1)) {
      expect(z(l).net.growth, `local ${l}`).toBeGreaterThan(z(l - 0.025).net.growth);
      expect(z(l).clock, `local ${l}`).toBeGreaterThan(z(l - 0.025).clock);
    }
  });

  it('leaves the rest of the galaxy asleep, and the bike assembled and the right twin', () => {
    for (const l of between(0, 1)) {
      const s = z(l);
      expect([s.net.fix, s.net.highlight, s.net.review, s.mech.assembly, s.mech.variant, s.camera.coreFocus]).toEqual([0, 0, 0, 1, 0, 0]);
    }
  });

  it('continues Act I’s camera across the boundary: Act II’s first key is S10′, the shot Act I ends on', () => {
    const tracks = (keyframes as unknown as KeyframeFile).tracks;
    const end = sampler.sample(at('spec', 1));
    const first = (path: string) => tracks[path].find((k) => typeof k.at === 'string' && k.at.startsWith('zoom-out@'))!;
    expect(first('camera.pos')).toEqual({ at: 'zoom-out@0', value: end.camera.pos });
    expect(first('camera.target')).toEqual({ at: 'zoom-out@0', value: end.camera.target });
    expect(first('camera.fov')).toEqual({ at: 'zoom-out@0', value: end.camera.fov });
    expect(first('camera.frame')).toEqual({ at: 'zoom-out@0', value: end.camera.frame });
    expect(shotOf(end.camera, mechanismAnchors(mechanisms.bike))).toMatchObject({
      bearing: expect.closeTo(45, 1),
      elevation: expect.closeTo(25, 1),
    });
    // Untracked through Act I, the camera tracks N0 (the world's origin) from a thousandth in: no jump.
    expect([end.camera.track.a, end.camera.track.b, end.camera.track.turn, end.camera.landscape.mix]).toEqual([0, 0, 0, 0]);
  });

  it('runs growth and the fix forward only, through the whole essay', () => {
    let prev = sampler.sample(0);
    for (let i = 1; i <= 8000; i++) {
      const x = sampler.sample(i / 8000);
      expect(x.net.growth, `growth at ${i / 8000}`).toBeGreaterThanOrEqual(prev.net.growth);
      expect(x.net.fix, `fix at ${i / 8000}`).toBeGreaterThanOrEqual(prev.net.fix);
      prev = x;
    }
  });

  // Ruling 1 (design §11): the bike's warm speckle fades under zo-2, so its planet has the look of
  // every other planet. Keys alone: `provenance.vibed` 0 to 1 over 0.50-0.90 hands every mote, one
  // by one by its hash, the scenario in which it is the agents' colour, and that scenario changes
  // nothing but the colour (attributes.ts: the vibed scenario's visibility is the specced one's).
  it('fades the bike’s warm speckle to the agents’ colour under zo-2, and moves no mote', () => {
    const bike = mechanisms.bike;
    const attrs = buildMoteAttrs(bike, bike.samplePoints(3000, 1));
    const g = generateGalaxy(MOTE_SEED, 'desktop', galaxyBudget(MOTE_BUDGET_DESKTOP));
    const bodies = reflowBodies(g, packBodyData(g), AMBIENT_POSE);
    const home = { bodies, groups: partGroups(bike), keep: reflowKeep(bodies, groupCounts(partGroups(bike), attrs)) };
    const warm = (s: SceneState) => attrs.filter((a) => mote(a, s, partTransforms(bike, s), home).type !== MoteType.Agent).length;
    for (const l of between(0, 0.5)) expect(z(l).provenance.vibed, `local ${l}`).toBe(0);
    for (const l of between(0.9, 1)) expect(z(l).provenance.vibed, `local ${l}`).toBe(1);
    for (const l of between(0.5, 0.9).slice(1)) expect(z(l).provenance.vibed, `local ${l}`).toBeGreaterThan(z(l - 0.01).provenance.vibed);
    // Act II stays this way: the planet is never warm again.
    for (const l of [0, 0.5, 1]) expect(sampler.sample(at('defect', l)).provenance.vibed).toBe(1);
    expect(warm(z(0.5))).toBeGreaterThan(100);
    expect(warm(z(0.7))).toBeLessThan(warm(z(0.5)));
    expect(warm(z(0.9))).toBe(0);
    for (const l of [0.5, 0.7, 0.9]) {
      const s = z(l);
      const plain: SceneState = { ...s, provenance: { ...s.provenance, vibed: 0 } };
      const xf = partTransforms(bike, s);
      for (const a of attrs) {
        const [o, p] = [mote(a, s, xf, home), mote(a, plain, xf, home)];
        expect([o.pos, o.visible, o.brightness, o.settled]).toEqual([p.pos, p.visible, p.brightness, p.settled]);
      }
    }
  });

  it('keeps every Act II leaf at 0 through Act I', () => {
    for (let i = 0; i <= 2000 && i / 2000 < at('zoom-out', 0); i++) {
      const s = sampler.sample(i / 2000);
      expect([s.mech.reflow, s.net.show, s.net.growth, s.net.fix, s.net.highlight, s.net.review, s.clock], `progress ${i / 2000}`).toEqual([
        0, 0, 0, 0, 0, 0, 0,
      ]);
    }
  });
});
