// The ink drawing's geometry and visibility on the CPU: the TypeScript mirror of ink.vert.glsl's
// steps 1, 2, 4 and 5 (docs/specs/2026-10-05-blueprint-and-build.md §2.5), for the tests and the
// e2e machine extent. The shader adds what only the screen needs: the wobble, the pressure, the
// width and the nib. Pure functions of state.
import { applyToPoint, type PartTransform } from '../../math/transform';
import type { Vec3 } from '../../math/vec';
import type { Mechanism } from '../../mechanisms/types';
import { ZERO_FAULTS, type SceneState } from '../../timeline/sceneState';
import { partTransforms } from '../mote/partTransforms';
import { INK_CLASS, INK_FLAG, type InkInstances } from './inkLayout';

/** A struck-out line keeps this fraction of its ink: left faint on the page, as corrections are. */
export const PENTIMENTO = 0.17;
/** The redraw: the old lines fade over [0, OLD_FADE] of it, the new ones draw over [NEW_FROM, 1]. */
export const OLD_FADE = 0.3;
export const NEW_FROM = 0.2;
/** How far the x-rank staggers the lift: a part lifts over this much less of `ink.flat` than the whole. */
export const LIFT_STAGGER = 0.3;

/** The drawing's scalars, as the shaders take them. */
export interface InkUniforms {
  opacity: number;
  drawn: number;
  redraw: number;
  flat: number;
  sheet: number;
  ring: number;
  tick: number;
}

export function inkUniforms(s: SceneState): InkUniforms {
  return { ...s.ink, sheet: s.sheet.opacity };
}

/**
 * The two rest poses the drawing is posed in: the machine as intended (assembled, zero faults, no
 * authored steering, specced), on the correct build and on the wrong twin's, at the state's drive.
 */
export function inkPoses(mech: Mechanism, s: SceneState): { correct: PartTransform[]; twin: PartTransform[] } {
  const at = (variant: number) =>
    partTransforms(mech, { ...s, mech: { ...s.mech, assembly: 1, variant, steer: 0, faults: { ...ZERO_FAULTS } } });
  return { correct: at(0), twin: at(1) };
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** How flat a segment is pressed, 0 (in its place) to 1 (on the page): the page's own lines always. */
export function flatness(flags: number, flat: number, xRank: number): number {
  if (flags & INK_FLAG.paper) return 1;
  return clamp01((flat - LIFT_STAGGER * xRank) / (1 - LIFT_STAGGER));
}

/** A segment's ends in world space: posed in its build, pressed toward z = 0 by its flatness. */
export function segmentEnds(inst: InkInstances, k: number, poses: { correct: PartTransform[]; twin: PartTransform[] }, flat: number): [Vec3, Vec3] {
  const [part, , flags, xRank] = inst.meta.subarray(k * 4, k * 4 + 4);
  const twin = flags & INK_FLAG.moves && !(flags & INK_FLAG.copy);
  const xf = (twin ? poses.twin : poses.correct)[part];
  const a = (twin ? inst.aTwin : inst.a).subarray(k * 3, k * 3 + 3);
  const b = (twin ? inst.bTwin : inst.b).subarray(k * 3, k * 3 + 3);
  const f = flatness(flags, flat, xRank);
  return [a, b].map((p) => {
    const w = applyToPoint(xf, [p[0], p[1], p[2]]);
    return [w[0], w[1], w[2] * (1 - f)] as Vec3;
  }) as [Vec3, Vec3];
}

/** Ink alpha by class on the page (§2.6): outline, construction, hatch, note, the person's; and on the dark stage. */
export const CLASS_ALPHA = [0.9, 0.5, 0.55, 0.5, 0.85] as const;
export const STAGE_ALPHA = 0.7;

/**
 * How much of a segment is drawn (0..1 of its length from its start) and with what alpha (0 hidden),
 * at uniforms `u`: the pen's reveal, the redraw's, or a mark's; the struck-out fade; the page's fade
 * for its own lines and the struck-out ones; far-side and across lines faint or hidden while flat.
 */
export function segmentLook(inst: InkInstances, k: number, u: InkUniforms): { vis: number; alpha: number } {
  const [, , flags, xRank] = inst.meta.subarray(k * 4, k * 4 + 4);
  const [arc0, arc1, move0, move1] = inst.arcs.subarray(k * 4, k * 4 + 4);
  const [, cls, strokeAlpha] = inst.style.subarray(k * 4, k * 4 + 4);
  const copy1 = (flags & INK_FLAG.copy) !== 0;
  const moves = (flags & INK_FLAG.moves) !== 0;
  const reveal = (d: number, from: number, to: number) => clamp01((d - from) / Math.max(to - from, 1e-9));
  let vis: number;
  let alpha = u.opacity * strokeAlpha * (STAGE_ALPHA + (CLASS_ALPHA[cls] - STAGE_ALPHA) * u.sheet);
  if (cls === INK_CLASS.person) {
    const v = flags & INK_FLAG.ring ? u.ring : u.tick;
    vis = reveal(Math.min(v, 1), arc0, arc1);
    alpha *= clamp01(2 - v);
  } else if (copy1) {
    vis = reveal(clamp01((u.redraw - NEW_FROM) / (1 - NEW_FROM)), move0, move1);
  } else {
    vis = reveal(u.drawn, arc0, arc1);
  }
  if (moves && !copy1) alpha *= 1 + (PENTIMENTO - 1) * clamp01(u.redraw / OLD_FADE);
  if (flags & INK_FLAG.paper || (moves && !copy1)) alpha *= u.sheet;
  const f = flatness(flags, u.flat, xRank);
  if (flags & INK_FLAG.farSide) alpha *= 1 - 0.85 * f;
  if (flags & INK_FLAG.across) alpha *= 1 - f;
  return { vis, alpha: vis > 0 ? alpha : 0 };
}
