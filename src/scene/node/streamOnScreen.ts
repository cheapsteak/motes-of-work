// Where the galaxy's stream and feed dots light the screen (Task 11 review I1): stream.vert.glsl's
// TypeScript twin as a whole, for the clearance twins (netShots.ts cylinderTop, e2e/machine.ts). Each dot
// is placed by streamDot (the in-fall's ending at R1's strand join, inFallEnd), shown by its gain
// (streamGain, inFallGain for the in-fall, feedGain for the feed), its count's fade,
// its child's arrival (the feed's alpha for the feed) and the galaxy's presence, put on its pixel, and
// masked to the text band there (streamBandMask): the dots it returns are the ones the page lights.
import { Vector3, type PerspectiveCamera } from 'three';
import { bodyIndex, pieceOuter, type Galaxy } from '../../galaxy/generate';
import { feedAlpha, ringAt, type RingVisit } from '../../galaxy/review';
import { lampFocusRow } from '../../timeline/netTrack';
import { buildStreamAttrs } from './bodyAttrs';
import { bodyTexel, STREAM_KIND, type BodyData } from './bodyData';
import { lampGain } from './bodyMote';
import { feedGain, inFallEnd, inFallGain, streamBandMask, streamCurve, streamDotOn, streamGain, streamPresence, type StreamCurve } from './stream';

/** The story leaves the streams' draw reads (SceneState's `net`). */
export interface StreamLeaves {
  show: number;
  growth: number;
  streams: number;
  feed: number;
  review: number;
  lamp: number;
  lampAt: number;
  focus: number;
}

/** A lit stream or feed dot on screen: its pixel's centre `x` and the top of that pixel `y`, CSS px from the top left. */
export interface StreamPixel {
  x: number;
  y: number;
}

const dotsCache = new WeakMap<Galaxy, { streams: [number, number][]; feed: [number, number][]; visits: RingVisit[] }>();

function dotsOf(g: Galaxy) {
  let d = dotsCache.get(g);
  if (!d) {
    const attrs = buildStreamAttrs(g);
    const pairs = (a: Float32Array): [number, number][] => Array.from({ length: a.length / 2 }, (_, k) => [a[2 * k], a[2 * k + 1]]);
    const visits = g.visits.map((id) => {
      const row = bodyIndex(g, id);
      return { row, radius: pieceOuter(g, row) };
    });
    d = { streams: pairs(attrs.streams.dot), feed: pairs(attrs.feed.dot), visits };
    dotsCache.set(g, d);
  }
  return d;
}

/**
 * Every stream and feed dot the page lights at `net` and ambient `t`, through `camera` (its matrices
 * current) on a screen of `size` CSS px at a pixel ratio of 1: the lineage streams while `net.streams`
 * is up, the feed while `net.feed` and its alpha are, each as stream.vert.glsl draws it, after the band
 * mask. A dot behind the camera or off a side lights nothing. `masked` false leaves the mask off: what
 * the dots would light without it (the tests that show what it does).
 */
export function streamPixels(
  net: StreamLeaves,
  g: Galaxy,
  data: BodyData,
  camera: PerspectiveCamera,
  size: { width: number; height: number },
  t: number,
  masked = true,
): StreamPixel[] {
  const out: StreamPixel[] = [];
  if (!(net.show > 0)) return out;
  const fa = feedAlpha(net.review);
  const sets: [number, number][][] = [];
  const dots = dotsOf(g);
  if (net.streams > 0) sets.push(dots.streams);
  if (net.feed > 0 && fa > 0) sets.push(dots.feed);
  if (sets.length === 0) return out;
  const ring = ringAt(net.review, dots.visits, t, data);
  const ringRow = dots.visits[Math.min(dots.visits.length - 1, Math.round(ring.along))].row;
  const clocks = { lamp: Math.round(net.lamp), lampRow: lampFocusRow(net.lampAt, g), focus: net.focus };
  const p = new Vector3();
  // Each row's curve, arrival and lamp once (the dots of a row share them); streamDot is streamDotOn of its row's curve.
  let row0 = -1;
  let curve: StreamCurve | null = null;
  let [to, present, lamp, inFall] = [0, 0, 0, false];
  const inEnd = inFallEnd(data, t);
  for (const set of sets)
    for (const [row, i] of set) {
      if (row !== row0) {
        row0 = row;
        const texel = bodyTexel(data.streams, 0, row);
        to = texel[1];
        inFall = texel[2] === STREAM_KIND.in;
        present = to >= 0 ? streamPresence(data, row, net.growth) : fa;
        lamp = Math.max(lampGain(Math.round(texel[0]), clocks, data), lampGain(to >= 0 ? Math.round(to) : ringRow, clocks, data));
        curve = present * lamp > 0 ? streamCurve(data, row, t, ring.position, inEnd) : null;
      }
      if (curve === null) continue;
      const sd = streamDotOn(curve, i, t);
      const gain = inFall ? inFallGain(net.streams, lamp) : to >= 0 ? streamGain(sd.u, net.streams, lamp) : feedGain(net.feed, lamp);
      const shown = gain * sd.presence * present * net.show;
      if (!(shown > 0)) continue;
      p.set(...sd.pos).project(camera);
      if (!(p.z > -1 && p.z < 1) || Math.abs(p.x) > 1) continue;
      // Its pixel, as the shader finds it (y up from the bottom), and the top of that pixel from the top.
      const px = Math.floor((p.x * 0.5 + 0.5) * size.width) + 0.5;
      const py = Math.floor((p.y * 0.5 + 0.5) * size.height) + 0.5;
      const yTop = size.height - py - 0.5;
      if (shown * (masked ? streamBandMask(yTop, size.height) : 1) > 0) out.push({ x: px, y: yTop });
    }
  return out;
}
