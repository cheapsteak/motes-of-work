import type { Vec3 } from '../math/vec';
import type { PartTransform } from '../math/transform';
import type { Faults } from '../timeline/sceneState';

export type Role = 'core' | 'body' | 'drift';

export interface MechanismPart {
  id: string;
  role: Role;
  /**
   * Displacement from the assembled pose. Each part closes it over its own settle window (below),
   * from its first mote setting out to its last landing (`partAssembly` in
   * `src/scene/mote/partTransforms.ts`), so it is fully applied before the window and gone after
   * it. It acts about the part's own posed position: the part origin moves by `offset.position`
   * (world space) and the part turns in place by `offset.quaternion` (applied on top of the pose
   * rotation). It never swings the part around the world origin.
   */
  explodedOffset: PartTransform;
  /**
   * The assembly window `[from, to]` in which this part's motes settle: each mote's settle value is
   * `from + (to - from) * h`, with `h` a per-mote hash in [0, 1). Omitted means the role default
   * (`ROLE_SETTLE` in `src/scene/mote/attributes.ts`). It must stay inside that default window; the
   * mechanism contract test checks it. A mote of the part is fully settled once assembly >= `to`.
   */
  settle?: readonly [number, number];
  /**
   * Where in its settle window each mote lands, by place: given the mote's correct-variant position
   * in part space and its settle hash `h` in [0, 1), a value inside `settle` (the contract test
   * checks it). Used in place of `from + (to - from) * h`, so a part can be laid in an order (the
   * bicycle's frame, tube by tube). Omitted means the hash alone. Pure.
   */
  settleField?: (local: Vec3, h: number) => number;
  /**
   * How the part closes its exploded offset over its window: given `x`, how far assembly is through
   * the window (0 as its first mote sets out, 1 as its last lands), how far it has come together (0
   * fully exploded, 1 in its pose). It must be 0 at x = 0 and 1 at x = 1, so the part is still
   * exploded before its window and exactly posed after it (the contract test checks it); in between
   * it may hold, fall and rebound (the bicycle's basket hovers, drops onto the fork and hops). Omitted
   * means the motes' smoothstep. Pure.
   */
  arrival?: (x: number) => number;
}

export interface BoundPoint {
  part: number; // index into parts
  local: Vec3; // position in part space, correct variant
  localTwin: Vec3; // position in part space, wrong-twin variant
  normal: Vec3; // unit surface normal in part space, correct variant
  normalTwin: Vec3; // unit surface normal in part space, wrong-twin variant
  seed: number; // integer in [0, 2^24)
}

/** What an ink stroke is: the drawing's own lines, its under-drawing, shading, margin notes, or the person's marks. */
export type StrokeClass = 'outline' | 'construction' | 'hatch' | 'note' | 'person';

/**
 * One line of a mechanism's ink drawing (docs/specs/2026-10-05-blueprint-and-build.md §2.4): a
 * polyline in part space (world units, like `BoundPoint.local`), posed with its part.
 */
export interface InkStroke {
  /** The builder's name for it (`frame.topTube.near`), unique. */
  id: string;
  part: number; // index into parts
  cls: StrokeClass;
  /** Correct build. */
  points: Vec3[];
  /** The wrong twin's build, point for point (equal to `points` when the stroke is the same on both). */
  pointsTwin: Vec3[];
  /** The two builds put it in different places (more than 2 mm apart, posed): struck out and redrawn. */
  moves: boolean;
  /** Drawn on one build only: the twin's (struck out, never redrawn) or the correct one's (drawn in the redraw). */
  only?: 'twin' | 'correct';
  /** A mirror duplicate on the far side (left pedal, far blade): faint while the drawing is flat. */
  farSide: boolean;
  /** Runs straight across the side view (along z): it collapses to a dot while flat, so it is hidden until it lifts. */
  across: boolean;
  /** Belongs to the page: never lifts, and fades with the sheet. */
  paper: boolean;
  /** The last point repeats the first. */
  closed: boolean;
  /** Line width in CSS px at full pressure. */
  width: number;
  /** Opacity relative to its class's ink. */
  alpha: number;
  /** The person's marks: the ring round the wrong seat, or the tick. */
  mark?: 'ring' | 'tick';
  /** Where it falls in the redraw, for a moving stroke: lower first (ties in pen order). */
  redrawRank?: number;
}

/** The sheet of paper a mechanism's ink drawing is made on: a quad facing +z, in world units. */
export interface InkSheet {
  centre: Vec3;
  width: number;
  height: number;
}

export interface Mechanism {
  id: string;
  parts: MechanismPart[];
  // Pure. Ghost pose is pose(drive, ZERO_FAULTS, ghostVariant). `steer` (the scene's mech.steer,
  // default 0) is steering added to the drive's own, as a fraction of full lock; a machine that
  // does not steer ignores it.
  pose(drive: number, faults: Faults, variant: number, steer?: number): PartTransform[];
  // Deterministic for a given (budget, seed).
  samplePoints(budget: number, seed: number): BoundPoint[];
  /** Its ink drawing, in the pen's order; deterministic. Optional: a machine without one is never drawn. */
  ink?(): InkStroke[];
  /** The page the ink is drawn on; present exactly when `ink` is. */
  sheet?: InkSheet;
}
