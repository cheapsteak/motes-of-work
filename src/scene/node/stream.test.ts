import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { galaxyBudget, generateGalaxy, STREAM_DOTS as GENERATED_DOTS, STREAM_PITCH as GENERATED_PITCH } from '../../galaxy/generate';
import { BAND_MARGIN_PX, NODE_STREAM_SPEED, TEXT_BAND } from './birth';
import { packBodyData } from './bodyData';
import { withGalaxyLibrary } from './shaderSource';
import {
  FEED_CAP,
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
  streamDot,
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
    expect(/float gain = (.*);/.exec(streamVert)?.[1]).toBe('to >= 0 ? streamGain(sd.u, uStreams, lamp) : feedGain(uFeedOn, lamp)');
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

describe('the galaxy’s stream dots', () => {
  it('flow on the ambient clock, by the rule stream.ts has, and never on the scroll clock', () => {
    // stream.vert.glsl places each dot by bodyMote.glsl's streamDot at the ambient (?lib=body holds it to stream.ts).
    expect(/sd\.u = (.*);/.exec(bodyMoteGlsl)?.[1]).toBe('fract(k + NODE_STREAM_SPEED * t)');
    expect(streamVert).toContain('StreamDot sd = streamDot(row, i, uAmbient, uRing);');
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
