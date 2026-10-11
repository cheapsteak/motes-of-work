// The rewind invariant's sample grid (design spec §6.1): one list for the purity twin
// (src/purity/twin.ts), which checks every sample, and the browser fence (e2e/purity.spec.ts),
// which renders the samples marked `fence` and checks every sample's render is lit.
import { AMBIENT_POSE } from '../galaxy/ambient';
import type { SectionSpan } from '../scroll/progress';

/** A render with fewer lit pixels than this is blank or broken; byte-equal blanks would prove nothing. */
export const MIN_LIT_PIXELS = 5000; // measured: 38980 (p=0.12), 54636 (p=0.41), 163339 (p=0.88), when the essay was 21.6 screens
// Act II's keyed frames light a smaller set on this landscape screen (1280x720). Each such sample is
// held to half what it was measured to light, at the pose and at 101 s (the lesser): still a thousand or
// more pixels compared byte for byte, and a frame that lost half its lit set fails. Measured on Act II's
// look before its re-skin, which re-measures them.
const halfOf = (measured: number): number => Math.floor(measured / 2);
/**
 * The hole close’s lit px on this screen (re-skin Task 5): half the least measured at the pose and at
 * 101 s over ly-2, trace 0.52 and fix 0.08 (9,477, ly-2 at the pose; the rest 9,509 to 10,288).
 */
const HOLE_MIN_LIT = halfOf(9477);
/**
 * The story on the hole's samples' lit px on this screen (re-skin Task 6): half the least measured at
 * the pose and at 101 s. up-1 under the in-fall (spread 0.5 screens), on the hole close: 9,939 and
 * 10,203; fx-3 coming up as toNew pulls back (fix 0.43): 9,440 and 9,628.
 */
const STORY_MIN_LIT = { up1: halfOf(9939), fx3: halfOf(9440) };

// The essay's three points were chosen as fractions of the essay when it ended on the zoom-out.
// Each is that fraction of the way to the zoom-out's end, read from the spans, so it lands on the
// frame it was chosen for however long Act II grows or shrinks. Rounded to 1e-4, as the points were
// when they were scaled by hand.
export const ESSAY_FRACTIONS = [0.12, 0.41, 0.88];
export function essayPoints(spans: SectionSpan[]): number[] {
  const end = spans.find((s) => s.id === 'zoom-out')?.end;
  if (end === undefined) throw new Error('no zoom-out section');
  return ESSAY_FRACTIONS.map((f) => Math.round(f * end * 1e4) / 1e4);
}

export interface PuritySample {
  name: string;
  /** The section it samples, or `essay` for the essay's three points. */
  section: string;
  /** The twin's scene (twin.ts SCENES), where it is not its section's: the black hole's is its own. */
  scene?: string;
  /** Global progress, from the essay's section spans. */
  p(spans: SectionSpan[]): number;
  /** `?ambient=` held for the sample, or undefined for the test-mode pose. */
  ambient?: number;
  /** The jumped render must light more pixels than this. */
  minLit: number;
  /**
   * The browser fence renders this one by jump, scroll and rewind and compares the pixels (the twin
   * checks every sample's GPU inputs). One or two per scene, where a per-frame upload (a texture or
   * a geometry swapped mid-scroll) or a draw the twin cannot see would show first.
   */
  fence?: true;
}

/** Global progress of a section-local value. */
export function sectionProgress(spans: SectionSpan[], id: string, local: number): number {
  const span = spans.find((s) => s.id === id);
  if (!span) throw new Error(`no ${id} section`);
  return span.start + local * (span.end - span.start);
}

const at = (id: string, local: number, ambient?: number, minLit = MIN_LIT_PIXELS, fence?: true): PuritySample => ({
  name: ambient === undefined ? `${id}@${local}` : `${id}@${local} at ambient ${ambient}`,
  section: id,
  p: (spans) => sectionProgress(spans, id, local),
  ambient,
  minLit,
  ...(fence ? { fence } : {}),
});

const FENCE = true as const;

// Three points of the essay; four of the spec section's drawing (docs/specs/2026-10-05-
// blueprint-and-build.md §5 test 7): mid-draw, mid-redraw, mid-lift and the gold landing; and of Act
// II (docs/specs/2026-10-06-act-2-storyboard-and-network.md §6 test 13): mid-reflow, held at two
// ambients (`?ambient=`: the bike's moons and the galaxy stand where that ambient has them, and the
// camera rides the turn), mid-highlight, the ring moving, the surge and the sweep.
//
// The fence (one or two per scene): Act I's build mid-assembly, at 0.12 (the motes' part texture
// rewritten every frame); the drawing mid-redraw (both ink part textures rewritten every frame); the reflow at 311 s
// (the motes flown onto the galaxy's bodies, the camera riding the turn); the pull out to the galaxy
// wide at 101 s (the background's far stars); the release mid-peel at 101 s (the copies' geometry cut
// mid-scroll, the ticks, the shell texture re-packed off the pose); and the sweep at 101 s (streams).
export const PURITY_SAMPLES: PuritySample[] = [
  ...ESSAY_FRACTIONS.map(
    (f, i): PuritySample => ({
      name: `essay ${f} of the way to the zoom-out's end`,
      section: 'essay',
      p: (spans) => essayPoints(spans)[i],
      minLit: MIN_LIT_PIXELS,
      ...(f === 0.12 ? { fence: FENCE } : {}),
    }),
  ),
  ...[0.1, 0.36, 0.63, 0.78].map((l) => at('spec', l, undefined, MIN_LIT_PIXELS, l === 0.63 ? FENCE : undefined)),
  at('zoom-out', 0.22, AMBIENT_POSE),
  at('zoom-out', 0.22, 311, MIN_LIT_PIXELS, FENCE),
  // Layers and far keyed (Task 9), each at the pose and at 101 s: the pull back before ly-3's pan (1.8
  // screens), the way back from star-4 under the via lamp (star-4's system alone, 3.525 screens), and
  // the pull out to the galaxy wide across the boundary into far.
  ...(
    [
      ['layers', 0.4186, halfOf(2776)],
      ['layers', 0.8198, halfOf(2764)],
      ['far', 0.02, halfOf(2965)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit, id === 'far' && ambient === 101 ? FENCE : undefined))),
  // Defect keyed (Task 10), each at the pose and at 101 s: C1 held close (the pin's camera) and the
  // twelve mid-highlight under df-4 (lamp 5 on R0's lineage, from 120). (Retired: spread 0.51, the
  // wordless second fix on C5, which the author deleted.)
  ...(
    [
      ['defect', 0.33, MIN_LIT_PIXELS],
      ['defect', 0.68, halfOf(2001)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit))),
  // The freeze frame (Task 12; freeze-frame §4), each at the pose and at 101 s: the dressing mid-snap,
  // the fix landing on the held piece, and the release mid-peel (0.33, held, is above). The hold shows
  // the pin whatever the clock; the release runs on it again.
  ...[0.265, 0.395, 0.413].flatMap((l) => [AMBIENT_POSE, 101].map((ambient) => at('defect', l, ambient, MIN_LIT_PIXELS, l === 0.413 && ambient === 101 ? FENCE : undefined))),
  // The defect's motion (re-skin Task 8b), df-1's close shot before the cut, at the pose and at 101 s:
  // the forced scatter, the leak's wounds (packed per frame into the shell texture) and the dropout's
  // lines (uniforms set per frame) all run on the ambient. A fence at 101 s, where the browser proves
  // the page draws the wounds and the lines the twin computes.
  ...[AMBIENT_POSE, 101].map((ambient) => at('defect', 0.22, ambient, MIN_LIT_PIXELS, ambient === 101 ? FENCE : undefined)),
  // Reviewer, trace and fix keyed (Task 11), each at the pose and at 101 s: the ring moving over P5's
  // planets under re-2, the surge running out along R0's lineage, and the sweep from the neighbourhood.
  ...(
    [
      ['reviewer', 0.5, halfOf(1929)],
      ['trace', 0.8, halfOf(4547)],
      ['fix', 0.82, halfOf(4944)],
    ] as const
  ).flatMap(([id, l, minLit]) => [AMBIENT_POSE, 101].map((ambient) => at(id, l, ambient, minLit, id === 'fix' && ambient === 101 ? FENCE : undefined))),
  // The black hole (re-skin Task 5), each at the pose and at 101 s: ly-2's midpoint on the hole close,
  // tr-2's hold on it (trace 0.52) and fx-1's (fix 0.08). Its disk, jets, knots and in-fall all run on
  // the ambient, so a jump, a scroll and a detour must land on the same dots. A scene of their own
  // (`hole`), so the fence guard holds the hole to a fence: the hole close at 101 s, where the browser
  // proves the hole and the shadow it hands the background and the bodies draw what the twin computes.
  ...(
    [
      ['layers', 1.35 / 4.3, HOLE_MIN_LIT],
      ['trace', 0.52, HOLE_MIN_LIT],
      ['fix', 0.08, HOLE_MIN_LIT],
    ] as const
  ).flatMap(([id, l, minLit]) =>
    [AMBIENT_POSE, 101].map((ambient): PuritySample => ({ ...at(id, l, ambient, minLit, id === 'layers' && ambient === 101 ? FENCE : undefined), scene: 'hole' })),
  ),
  // The story on the hole (re-skin Task 6), each at the pose and at 101 s: up-1 under the in-fall
  // (spreadAt(0.5): the C7 -> R1 stream ember and ending at R1's strand join, which turns on the ambient,
  // R1's strand growing, the ember knots rising), tr-2 heated and singled out (trace 0.52, above) and fx-3's
  // clean front overtaking the knots (fix 0.43). A fence: up-1 at 101 s, where the browser proves the
  // in-fall's end (uInFallEnd) and its ember (uInEmber), and the strands' and knots' keys, draw what the
  // twin computes.
  ...(
    [
      ['spread', 0.5 / 2.808, STORY_MIN_LIT.up1],
      ['fix', 0.43, STORY_MIN_LIT.fx3],
    ] as const
  ).flatMap(([id, l, minLit]) =>
    [AMBIENT_POSE, 101].map((ambient): PuritySample => ({ ...at(id, l, ambient, minLit, id === 'spread' && ambient === 101 ? FENCE : undefined), scene: 'hole' })),
  ),
];
