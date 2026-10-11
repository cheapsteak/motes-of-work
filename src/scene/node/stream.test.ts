import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { galaxyBudget, generateGalaxy, STREAM_DOTS as GENERATED_DOTS, STREAM_PITCH as GENERATED_PITCH } from '../../galaxy/generate';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { strandJoin } from '../hole/hole';
import { HOLE_EMBER, HOLE_LOOK, STRANDS } from '../hole/holeLook';
import { BAND_MARGIN_PX, NODE_STREAM_SPEED, TEXT_BAND } from './birth';
import { bodyTexel, packBodyData, STREAM_KIND } from './bodyData';
import { bodyWorld, galacticToWorld } from './orbit';
import { withGalaxyLibrary } from './shaderSource';
import {
  FEED_CAP,
  IN_EMBER,
  IN_STREAM_CAP,
  inFallEmber,
  inFallEnd,
  inFallGain,
  STREAM_BAND_SOFT_PX,
  streamBandMask,
  feedGain,
  STREAM_BOW,
  STREAM_CAP,
  STREAM_DOTS,
  STREAM_FADE,
  STREAM_PITCH,
  streamControl,
  streamCount,
  streamCurve,
  streamDot,
  streamDotOn,
  streamDotU,
  streamGain,
} from './stream';
import bodyMoteGlsl from './bodyMote.glsl?raw';
import streamVert from './shaders/stream.vert.glsl?raw';

// Galaxy §15: the galaxy's streams are shown only on the lineage beats (`net.streams`), thin, dim,
// fading from parent to child, slightly bowed, and flowing on the ambient clock.
const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
const data = packBodyData(g);
const U = Array.from({ length: 101 }, (_, i) => i / 100);

describe('streamGain', () => {
  it('is §15.2’s numbers, the pitch and the bounds re-exported from the generator, never redeclared', () => {
    expect([STREAM_CAP, STREAM_FADE, STREAM_BOW, STREAM_PITCH, STREAM_DOTS]).toEqual([0.3, [1, 0.15], 0.1, 1.2, [6, 40]]);
    expect(STREAM_PITCH).toBe(GENERATED_PITCH);
    expect(STREAM_DOTS).toBe(GENERATED_DOTS);
  });

  it('is 0 at every u while the streams are off', () => {
    for (const u of U) for (const lamp of [0, 0.3, 1]) expect(streamGain(u, 0, lamp)).toBe(0);
  });

  it('falls along the stream, from STREAM_CAP at the parent to 0.15 of it at the child', () => {
    expect(streamGain(0, 1, 1)).toBe(STREAM_CAP);
    expect(streamGain(1, 1, 1)).toBeCloseTo(0.15 * STREAM_CAP, 15);
    for (let i = 1; i < U.length; i++) expect(streamGain(U[i], 1, 1)).toBeLessThan(streamGain(U[i - 1], 1, 1));
  });

  it('no dot, lit or not, is brighter than STREAM_CAP of a glow’s core', () => {
    for (const u of U) for (const s of [0, 0.5, 1]) for (const lamp of [0, 0.3, 1]) expect(streamGain(u, s, lamp)).toBeLessThanOrEqual(STREAM_CAP);
    // The shader draws a dot at the glow's core brightness times the gain, and its light only tints
    // it: no highlight gain multiplies a stream dot.
    expect(/vBrightness = (.*);/.exec(streamVert)?.[1]).toBe('LOOK_GLOW_BRIGHTNESS * shown');
    expect(/float gain = (.*);/.exec(streamVert)?.[1]).toBe('inFall ? inFallGain(uStreams, lamp) : to >= 0 ? streamGain(sd.u, uStreams, lamp) : feedGain(uFeedOn, lamp)');
    expect(/float shown = (.*);/.exec(streamVert)?.[1]).toBe('gain * sd.presence * present * uShow');
    expect(streamVert).not.toMatch(/NODE_HI_GAIN/);
  });
});

// The author's ruling (Task 11, galaxy §15.2): the reviewer's feed is re-3's subject, not ambient
// lineage, so it is drawn by its own leaf (`net.feed`) at FEED_CAP, the same along its length.
describe('feedGain', () => {
  it('is FEED_CAP of a glow’s core, spliced into the shaders with the stream constants', () => {
    expect(FEED_CAP).toBe(0.9);
    expect(withGalaxyLibrary(streamVert)).toContain('const float FEED_CAP = 0.9;');
    expect(feedGain(1, 1)).toBe(FEED_CAP);
  });

  it('is 0 while the feed is off, and scales with its leaf and the lamp', () => {
    for (const lamp of [0, 0.3, 1]) expect(feedGain(0, lamp)).toBe(0);
    expect(feedGain(0.5, 1)).toBeCloseTo(0.5 * FEED_CAP, 15);
    expect(feedGain(1, 0.3)).toBeCloseTo(0.3 * FEED_CAP, 15);
    expect(feedGain(1, 0)).toBe(0);
  });

  it('is brighter than any lineage stream dot, and unfaded: the same at both ends', () => {
    expect(feedGain(1, 1)).toBeGreaterThan(Math.max(...U.map((u) => streamGain(u, 1, 1))));
    // The shader reads no `u` for the feed: one gain from the hub to the light.
    expect(/float feedGain\(float feed, float lamp\) \{\s*return (.*);/.exec(bodyMoteGlsl)?.[1]).toBe('feed * lamp * FEED_CAP');
  });

  it('is gated by `net.feed` alone: the lineage streams by `net.streams`, the feed row by uFeedOn', () => {
    expect(streamVert).toContain('uniform float uFeedOn; // net.feed');
  });
});

// The in-fall (re-skin §4.2): the C7 → R1 `in` stream is C7's notes falling into the black hole. It ends
// at R1's strand join, is drawn at IN_STREAM_CAP, unfaded, and is ember (HOLE_EMBER) by net.inEmber ×
// (1 − net.cool1). `?lib=body`'s stream case holds the GLSL to it (its row among every stream's).
describe('the in-fall', () => {
  const inRow = Array.from({ length: data.streamCount }, (_, row) => row).filter((row) => bodyTexel(data.streams, 0, row)[2] === STREAM_KIND.in);

  it('is the one in stream, C7 to R1', () => {
    expect(inRow).toHaveLength(1);
    const [from, to] = bodyTexel(data.streams, 0, inRow[0]);
    expect([g.bodies[from].id, g.bodies[to].id]).toEqual(['C7', 'R1']);
  });

  it('ends at R1’s strand join, strandJoin(1, t) carried into the world as the hole is, at every ambient', () => {
    for (const t of [0, AMBIENT_POSE, 101, 1061, 3599.9]) {
      const j = strandJoin(1, t);
      const want = galacticToWorld(data, [j[0] * HOLE_LOOK.scale, j[1] * HOLE_LOOK.scale, j[2] * HOLE_LOOK.scale], t);
      expect(inFallEnd(data, t)).toEqual(want);
      // R1's join is in the disk's plane, 6.5 from the centre: not R1's spot.
      const centre = galacticToWorld(data, [0, 0, 0], t);
      expect(Math.hypot(want[0] - centre[0], want[1] - centre[1], want[2] - centre[2])).toBeCloseTo(STRANDS[1].rJoin * HOLE_LOOK.scale, 9);
      const curve = streamCurve(data, inRow[0], t);
      expect(curve.b).toEqual(want);
      // Its last dot, as u runs to 1, lands on the join (the Bezier's end).
      const n = curve.n;
      let last = streamDotOn(curve, 0, t);
      for (let i = 1; i < Math.ceil(n); i++) {
        const d = streamDotOn(curve, i, t);
        if (d.u > last.u) last = d;
      }
      const end = streamDotOn({ ...curve }, 0, (1 - 1e-9 - streamDotU(0, 0)) / NODE_STREAM_SPEED);
      expect(Math.hypot(end.pos[0] - want[0], end.pos[1] - want[1], end.pos[2] - want[2])).toBeLessThan(1e-6);
      expect(last.u).toBeGreaterThanOrEqual(1 - 1 / n - 1e-9);
      // No other stream ends anywhere but its child.
      for (let row = 0; row < data.feedRow; row++) {
        if (row === inRow[0]) continue;
        expect(streamCurve(data, row, t).b).toEqual(bodyWorld(data, Math.round(bodyTexel(data.streams, 0, row)[1]), t));
      }
    }
  });

  it('is drawn at IN_STREAM_CAP, unfaded, under net.streams and the lamp, spliced into the shaders', () => {
    expect(IN_STREAM_CAP).toBe(0.9);
    expect(withGalaxyLibrary(streamVert)).toContain('const float IN_STREAM_CAP = 0.9;');
    expect(withGalaxyLibrary(streamVert)).toContain(`const int STREAM_KIND_IN = ${STREAM_KIND.in};`);
    expect(inFallGain(1, 1)).toBe(IN_STREAM_CAP);
    expect(inFallGain(0, 1)).toBe(0);
    expect(inFallGain(1, 0)).toBe(0);
    expect(inFallGain(0.5, 0.3)).toBeCloseTo(0.15 * IN_STREAM_CAP, 15);
    // Unfaded: the shader reads no `u` for it.
    expect(/float inFallGain\(float streams, float lamp\) \{\s*return (.*);/.exec(bodyMoteGlsl)?.[1]).toBe('streams * lamp * IN_STREAM_CAP');
    expect(streamVert).toContain('bool inFall = int(round(s0.z)) == STREAM_KIND_IN;');
  });

  it('is ember by net.inEmber × (1 − net.cool1), in the strands’ HOLE_EMBER, and only the in-fall', () => {
    expect(IN_EMBER).toEqual(HOLE_EMBER.rgb);
    expect(withGalaxyLibrary(streamVert)).toContain('const vec3 IN_EMBER = vec3(1.0, 0.26, 0.18);');
    expect(inFallEmber({ inEmber: 0, cool1: 0 })).toBe(0);
    expect(inFallEmber({ inEmber: 1, cool1: 0 })).toBe(1);
    expect(inFallEmber({ inEmber: 1, cool1: 1 })).toBe(0);
    expect(inFallEmber({ inEmber: 0.5, cool1: 0.25 })).toBeCloseTo(0.375, 15);
    // Its colour is its own ember, never the highlight's NODE_EMBER; every other stream keeps the highlight's.
    expect(/vBase = (.*);/.exec(streamVert)?.[1]).toBe('inFall ? mix(NODE_AGENT, IN_EMBER, uInEmber) : NODE_AGENT');
    expect(/vHi = (.*);/.exec(streamVert)?.[1]).toBe('inFall ? 0.0 : max(light.y, light.z)');
  });
});

describe('the galaxy’s stream dots', () => {
  it('flow on the ambient clock, by the rule stream.ts has, and never on the scroll clock', () => {
    // stream.vert.glsl places each dot by bodyMote.glsl's streamDot at the ambient (?lib=body holds it to stream.ts).
    expect(/sd\.u = (.*);/.exec(bodyMoteGlsl)?.[1]).toBe('fract(k + NODE_STREAM_SPEED * t)');
    expect(streamVert).toContain('StreamDot sd = streamDot(row, i, uAmbient, uRing, uInFallEnd);');
    expect(streamVert).not.toMatch(/uClock/);
    expect(withGalaxyLibrary(streamVert)).not.toMatch(/uniform float uClock/);
    // The twin has no scroll clock to read: the same ambient gives the same dots, whatever the scroll.
    for (const row of [0, 7, data.feedRow - 1]) {
      const a = streamDot(data, row, 3, 41.5);
      expect(streamDot(data, row, 3, 41.5)).toEqual(a);
      expect(streamDot(data, row, 3, 42.5).pos).not.toEqual(a.pos);
    }
  });

  it('are one per STREAM_PITCH of chord within STREAM_DOTS, the last faded in as the chord grows', () => {
    expect(streamCount(0)).toBe(6);
    expect(streamCount(12)).toBeCloseTo(10, 12);
    expect(streamCount(1000)).toBe(40);
    expect(streamDot(data, 3, 0, 0).presence).toBe(1);
    expect(streamDot(data, 3, 40, 0).presence).toBe(0);
  });

  it('run on a curve bowed STREAM_BOW of the chord off its midpoint', () => {
    for (const bearing of [0, 1, 2.5, 4]) {
      const c = streamControl([0, 0, 0], [10, 0, 0], bearing);
      expect(Math.hypot(c[0] - 5, c[1], c[2])).toBeCloseTo(STREAM_BOW * 10, 12);
      expect(c[0]).toBeCloseTo(5, 12);
    }
  });
});

// Task 11 review I1, the ruling: the streams and the feed must not light the text band. Every stream and
// feed dot is masked to it on screen, after it is placed on its pixel.
describe('streamBandMask', () => {
  const SCREENS = [844, 900];
  const edge = (height: number) => TEXT_BAND * height + BAND_MARGIN_PX;

  it('is 0 at and above the band’s margin, on a phone and a desktop, and nothing above the band is lit', () => {
    for (const h of SCREENS) {
      for (const y of [-50, 0, 0.2 * h, TEXT_BAND * h, edge(h) - 1, edge(h)]) expect(streamBandMask(y, h), `${y} of ${h}`).toBe(0);
    }
  });

  it('rises to 1 over the STREAM_BAND_SOFT_PX below the margin, a smoothstep, and is 1 under it', () => {
    expect(STREAM_BAND_SOFT_PX).toBe(4);
    for (const h of SCREENS) {
      const e = edge(h);
      expect(streamBandMask(e + STREAM_BAND_SOFT_PX, h)).toBe(1);
      expect(streamBandMask(e + STREAM_BAND_SOFT_PX / 2, h)).toBeCloseTo(0.5, 12);
      expect(streamBandMask(h, h)).toBe(1);
      for (let k = 1; k <= 40; k++) expect(streamBandMask(e + (k * STREAM_BAND_SOFT_PX) / 40, h)).toBeGreaterThan(streamBandMask(e + ((k - 1) * STREAM_BAND_SOFT_PX) / 40, h));
    }
  });

  it('multiplies every stream and feed dot in the shader, on its pixel, before the dot is drawn', () => {
    const shader = withGalaxyLibrary(streamVert);
    for (const [name, v] of [
      ['TEXT_BAND', TEXT_BAND],
      ['BAND_MARGIN_PX', BAND_MARGIN_PX],
      ['STREAM_BAND_SOFT_PX', STREAM_BAND_SOFT_PX],
    ] as const)
      expect(shader).toMatch(new RegExp(`const float ${name} = ${v}(\\.0)?;`));
    expect(/shown \*= (.*);/.exec(streamVert)?.[1]).toBe('streamBandMask((uViewport.y - pixel.y - 0.5) / uPixelRatio, uViewport.y / uPixelRatio)');
    // After the pixel is found and before the visibility test that hides a dark dot.
    const [pixel, mask, hide] = ['vec2 pixel =', 'shown *= streamBandMask', 'gl_Position = MOTE_HIDDEN'].map((s) => streamVert.indexOf(s));
    expect(pixel).toBeLessThan(mask);
    expect(streamVert.indexOf('gl_Position = MOTE_HIDDEN', mask)).toBeGreaterThan(mask);
    expect(hide).toBeGreaterThan(0);
  });
});
