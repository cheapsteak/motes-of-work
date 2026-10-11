import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { applyToPoint } from '../math/transform';
import { mechanismAnchors } from '../mechanisms/anchors';
import { mechanisms } from '../mechanisms';
import { FRONT_AXLE, MAST_MOUNT, STUB_TOP } from '../mechanisms/bike/kinematics';
import { sectionSpans } from '../scroll/progress';
import { applyCamera } from '../scene/cameraRig';
import { partTransforms } from '../scene/mote/partTransforms';
import { loadStory } from '../story/loader';
import { KeyframeSampler, type KeyframeFile } from './keyframeSampler';
import keyframes from './keyframes.json';
import {
  LAP,
  LAP_FROM,
  LAP_KEYS,
  LAP_SECTION,
  LAP_TO,
  lapLocal,
  orbitKeys,
  SHOTS,
  shotKeys,
  shotOf,
  shotTarget,
  type Shot,
  type ShotName,
} from './shots';

/** The text band: the panel's bottom is never lower than this fraction of the height (storyboard §3.4). */
const TEXT_BAND = 0.42;

// The storyboard's shots (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §2), held in
// bike terms: each beat's camera, read back from the shipped keyframes, is its shot's bearing,
// elevation, distance, fov, target, frame and coreFocus over the whole of the shot's hold.

const anchors = mechanismAnchors(mechanisms.bike);
const spans = sectionSpans(loadStory());
const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
const at = (id: string, local: number): number => {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no section ${id}`);
  return span.start + local * (span.end - span.start);
};

/** Where each shot holds, section-local, and the line it is there for. */
const HOLDS: [section: string, from: number, to: number, shot: ShotName, line: string][] = [
  ['vibe-build', 0, 0.04166667, 'S0', 'vb-1: the spawn shell as a starfield'],
  ['vibe-build', 0.11111111, 0.22222222, 'S1', 'vb-brief: the ask, then line 1 and the core, low drive-side three-quarter'],
  ['vibe-build', 0.26388889, 0.375, 'S2', 'brief line 2: two wheels, the chain, the drive side'],
  ['vibe-build', 0.41666667, 0.68055556, 'S3', 'brief line 3, the turn and line 4: the front wheel, then the basket dropped onto it'],
  ['vibe-build', 0.72222222, 0.72222222, 'S1', 'brief line 5 comes up on the whole bike'],
  ['vibe-build', 0.82638889, 0.86111111, 'S1p', 'brief lines 5 and 6 light: the frame laid and the mudguards on, leaned in'],
  ['reveal', 0, 0.175, 'S1p', 'rv-1: it runs'],
  ['reveal', 0.325, 0.325, 'S5', 'rv-2 ends on the reveal shot'],
  ['reveal', 0.375, 0.5125, 'S6', 'rv-3: the seat on the steering post'],
  ['reveal', 0.5625, 0.625, 'S7', 'rv-4: the bars at the back'],
  ['reveal', 0.675, 0.825, 'S5', 'rv-5: the whole twin'],
  ['reveal', 0.925, 1, 'S5p', 'rv-7, pushed in'],
  ['rewind', 1, 1, 'S8', 'rw-1 ends on the nebula'],
  ['spec', 0.08, 0.17, 'S11', 'sp-1, sp-2: the page, square on, as the pen draws'],
  ['spec', 0.21, 0.27, 'S11c', 'sp-3: the seat on its mast, close on the page'],
  ['spec', 0.31, 0.53, 'S11', 'sp-4, sp-5: the redraw and the tick'],
  ['spec', 0.63, 0.7, 'S10', "sp-6: the lines lift, seen from the build's three-quarter"],
  ['spec', 0.74, 0.84, 'S9p', 'sp-7: the gold lands'],
  ['spec', 0.9, 1, 'S10p', 'sp-8: the finished bike rides'],
];

const close = (want: Shot, got: ReturnType<typeof shotOf>, where: string) => {
  const target = shotTarget(want, anchors);
  got.target.forEach((v, k) => expect(v, `${where} target[${k}] (m)`).toBeCloseTo(target[k], 2));
  expect(got.bearing, `${where} bearing`).toBeCloseTo(want.bearing, 0);
  expect(got.elevation, `${where} elevation`).toBeCloseTo(want.elevation, 0);
  expect(got.distance, `${where} distance (m)`).toBeCloseTo(want.distance, 2);
  expect(got.fov, `${where} fov`).toBe(want.fov);
  expect(got.frame, `${where} frame`).toBe(want.frame);
  expect(got.coreFocus, `${where} coreFocus`).toBe(want.coreFocus);
};

describe('shot conversion', () => {
  it.each(Object.keys(SHOTS) as ShotName[])('reads %s back from its keys in bike terms', (name) => {
    const shot = SHOTS[name];
    close(shot, shotOf(shotKeys(shot, anchors), anchors), name);
  });

  it('measures bearing from the front (0) toward the drive side (90) and behind (180)', () => {
    const base: Shot = { target: FRONT_AXLE, bearing: 0, elevation: 0, distance: 2, fov: 40, frame: 0, coreFocus: 0 };
    const pos = (bearing: number) => {
      const s = shotOf(shotKeys({ ...base, bearing }, anchors), anchors);
      return [s.target[0] + s.distance * Math.cos((s.bearing * Math.PI) / 180), s.target[2] + s.distance * Math.sin((s.bearing * Math.PI) / 180)];
    };
    expect(pos(0)[0]).toBeCloseTo(FRONT_AXLE[0] + 2, 9); // in front: further along +x
    expect(pos(90)[1]).toBeCloseTo(2, 9); // the drive side: +z
    expect(pos(180)[0]).toBeCloseTo(FRONT_AXLE[0] - 2, 9);
  });

  it('aims the close shots at the parts their lines are about', () => {
    // The front wheel; the twin's mast and stub (bike/kinematics.ts reference points).
    const near = (a: readonly number[], b: readonly number[], d: number) => Math.hypot(a[0] - b[0], a[1] - b[1]) < d;
    expect(near(shotTarget(SHOTS.S3, anchors), FRONT_AXLE, 0.2)).toBe(true);
    expect(near(shotTarget(SHOTS.S6, anchors), MAST_MOUNT, 0.4)).toBe(true);
    expect(shotTarget(SHOTS.S7, anchors)).toEqual([...STUB_TOP]);
  });
});

describe('the storyboard shots in the keyframes', () => {
  it.each(HOLDS)('%s %s..%s holds %s (%s)', (section, from, to, name) => {
    for (let i = 0; i <= 10; i++) {
      const local = from + ((to - from) * i) / 10;
      close(SHOTS[name], shotOf(sampler.sample(at(section, local)).camera, anchors), `${section}@${local.toFixed(3)}`);
    }
  });

  it('pins the reveal shot inside the reveal bounds: bearing 30-60, elevation at least 20, fov at most 33', () => {
    for (const name of ['S5', 'S5p'] as const) {
      const s = SHOTS[name];
      expect(s.bearing).toBeGreaterThanOrEqual(30);
      expect(s.bearing).toBeLessThanOrEqual(60);
      expect(s.elevation).toBeGreaterThanOrEqual(20);
      expect(s.fov).toBeLessThanOrEqual(33);
    }
  });

  it('turns from the page to the build in one move, bearing and elevation never turning back, coreFocus held for the gold', () => {
    let prev = shotOf(sampler.sample(at('spec', 0.53)).camera, anchors);
    for (let i = 1; i <= 200; i++) {
      const got = shotOf(sampler.sample(at('spec', 0.53 + (0.1 * i) / 200)).camera, anchors);
      expect(got.bearing, `step ${i}`).toBeLessThanOrEqual(prev.bearing + 1e-9);
      expect(got.elevation, `step ${i}`).toBeGreaterThanOrEqual(prev.elevation - 1e-9);
      prev = got;
    }
    for (let i = 0; i <= 20; i++) expect(sampler.sample(at('spec', 0.74 + (0.1 * i) / 20)).camera.coreFocus).toBe(0.6);
  });

  it.each([
    [1440, 900],
    [390, 844],
  ])('frames the page under the text band at S11, at %ix%i, and inside a phone\'s width', (w, h) => {
    // docs/specs/2026-10-05-blueprint-and-build.md §2.12: the sheet's top just under the band, its
    // bottom running off the screen (a page larger than the frame), its sides on a phone's screen.
    const sheet = mechanisms.bike.sheet;
    expect(sheet).toBeDefined();
    if (!sheet) return;
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    applyCamera(camera, sampler.sample(at('spec', 0.12)), anchors, { compose: true });
    const corners = [-1, 1].flatMap((sx) =>
      [-1, 1].map((sy) => new Vector3(sheet.centre[0] + (sx * sheet.width) / 2, sheet.centre[1] + (sy * sheet.height) / 2, sheet.centre[2]).project(camera)),
    );
    const top = Math.max(...corners.map((c) => c.y));
    expect(top, 'the top below the band').toBeLessThan(1 - 2 * TEXT_BAND);
    expect(top, 'the top not far below it').toBeGreaterThan(1 - 2 * 0.55);
    if (w < h) expect((Math.max(...corners.map((c) => c.x)) - Math.min(...corners.map((c) => c.x))) / 2, 'width on a phone').toBeLessThanOrEqual(0.92);
  });

  it('opens on the drive side: every cold-open shot sees the bike from in front of square-on to just behind it', () => {
    for (const name of ['S0', 'S1', 'S2', 'S3', 'S1p'] as const) {
      expect(SHOTS[name].bearing, name).toBeGreaterThan(0);
      expect(SHOTS[name].bearing, name).toBeLessThanOrEqual(95);
    }
  });
});

// The "Done" lap (docs/specs/2026-10-05-act-1-build-and-orbit.md §4, test 9): generated from its
// waypoints by orbitKeys(), pasted into the keyframes once, and held to them here.
describe('the "Done" lap', () => {
  const lapCamera = (local: number) => sampler.sample(at(LAP_SECTION, local)).camera;
  const file = keyframes as unknown as KeyframeFile;
  /** The keys of a camera track inside the lap, by section-local `at`. */
  const lapKeys = (track: string) =>
    file.tracks[track]
      .filter((k) => typeof k.at === 'string' && k.at.startsWith(`${LAP_SECTION}@`))
      .map((k) => ({ at: Number(String(k.at).split('@')[1]), value: k.value }))
      .filter((k) => k.at > LAP_FROM);

  it('is the keyframes: orbitKeys() regenerated equals the camera keys over the lap, to 1e-3', () => {
    const want = orbitKeys(anchors);
    expect(want.length).toBe(LAP_KEYS + LAP.length - 2);
    for (const [track, pick] of [
      ['camera.pos', (k: (typeof want)[number]) => k.pos],
      ['camera.target', (k: (typeof want)[number]) => k.target],
      ['camera.fov', (k: (typeof want)[number]) => [k.fov]],
    ] as const) {
      const got = lapKeys(track);
      expect(
        got.map((k) => k.at),
        track,
      ).toEqual(want.map((k) => k.at));
      got.forEach((k, i) => {
        const v = [k.value].flat() as number[];
        pick(want[i]).forEach((w, c) => expect(Math.abs(v[c] - w), `${track} key ${i}`).toBeLessThan(1e-3));
      });
    }
  });

  it("starts and ends on S1', at rest", () => {
    close(SHOTS.S1p, shotOf(lapCamera(LAP_FROM), anchors), 'lap start');
    close(SHOTS.S1p, shotOf(lapCamera(LAP_TO), anchors), 'lap end');
  });

  it('goes round once, one way: the bearing only rises, through 360 degrees', () => {
    let prev = shotOf(lapCamera(LAP_FROM), anchors).bearing;
    let turned = 0;
    for (let i = 1; i <= 1000; i++) {
      const b = shotOf(lapCamera(LAP_FROM + ((LAP_TO - LAP_FROM) * i) / 1000), anchors).bearing;
      const step = ((b - prev + 540) % 360) - 180;
      expect(step, `sample ${i}`).toBeGreaterThan(0);
      turned += step;
      prev = b;
    }
    expect(turned).toBeCloseTo(360, 0);
    expect(Math.abs(turned - 360)).toBeLessThan(1);
  });

  it.each(LAP.map((w, i) => [`W${i}`, w] as const))('passes through %s at its local', (name, w) => {
    // At its key's local, as orbitKeys() rounds it (to 8 places).
    const got = shotOf(lapCamera(Math.round(lapLocal(w.t) * 1e8) / 1e8), anchors);
    close({ ...w, bearing: ((w.bearing + 180) % 360) - 180 }, got, name);
  });

  it.each([
    [1440, 900],
    [390, 844],
  ])('keeps the riding twin under the text band and in the frame all the way round, at %ix%i', (w, h) => {
    // The clearance e2e (§4 test 12) is the arbiter on the built page; this holds the lap to the band
    // as designed (§4.4), with every point of the twin, ground and all.
    const bike = mechanisms.bike;
    const points = bike.samplePoints(8000, 1);
    const camera = new PerspectiveCamera(40, w / h, 0.1, 100);
    for (let i = 0; i <= 100; i++) {
      const s = sampler.sample(at(LAP_SECTION, LAP_FROM + ((LAP_TO - LAP_FROM) * i) / 100));
      applyCamera(camera, s, anchors, { compose: true });
      const xf = partTransforms(bike, s);
      const v = points.map((b) => new Vector3(...applyToPoint(xf[b.part], b.localTwin)).project(camera)).filter((p) => Math.abs(p.x) <= 1);
      expect(v.length, `sample ${i}: the bike is on screen`).toBeGreaterThan(points.length / 2);
      expect(Math.max(...v.map((p) => p.y)), `sample ${i}: the top below the band`).toBeLessThan(1 - 2 * TEXT_BAND);
    }
  });
});
