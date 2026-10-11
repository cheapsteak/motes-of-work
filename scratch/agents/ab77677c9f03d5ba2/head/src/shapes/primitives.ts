// Machine-part primitives, each a closed BufferGeometry (except the helix, an open tube) with
// `position` and `normal` attributes, in part space.
import { Curve, CylinderGeometry, SphereGeometry, TubeGeometry, Vector3, type BufferGeometry } from 'three';
import type { Vec2 } from '../math/vec';
import { extrudeProfile } from './extrude';

const ARC_SEGMENTS = 24;

/** Counter-clockwise polygon approximating a circle (use it for holes and round outlines). */
export function circle(cx: number, cy: number, r: number, segments = ARC_SEGMENTS): Vec2[] {
  return Array.from({ length: segments }, (_, i): Vec2 => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

/** Counter-clockwise arc from angle a0 to a1 (radians), both ends included. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, segments: number): Vec2[] {
  return Array.from({ length: segments + 1 }, (_, i): Vec2 => {
    const a = a0 + ((a1 - a0) * i) / segments;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  });
}

function bare(geom: BufferGeometry): BufferGeometry {
  geom.deleteAttribute('uv');
  return geom;
}

/** Capped cylinder of `radius`, `length` along z, centred on the origin. */
export function axle(radius: number, length: number, segments = ARC_SEGMENTS): BufferGeometry {
  return bare(new CylinderGeometry(radius, radius, length, segments, 1, false).rotateX(Math.PI / 2));
}

/**
 * Bar with rounded ends: the segment (0,0)→(length,0) swollen by `radius` in the xy plane,
 * `depth` thick along z (centred on z = 0), minus `holes`.
 */
export function bar(length: number, radius: number, depth: number, holes: Vec2[][] = []): BufferGeometry {
  const half = ARC_SEGMENTS / 2;
  const outline = [
    ...arc(length, 0, radius, -Math.PI / 2, Math.PI / 2, half),
    ...arc(0, 0, radius, Math.PI / 2, (3 * Math.PI) / 2, half),
  ];
  return extrudeProfile(outline, holes, depth);
}

/** Sphere of `radius` centred on the origin. */
export function ball(radius: number): BufferGeometry {
  return bare(new SphereGeometry(radius, ARC_SEGMENTS, ARC_SEGMENTS / 2));
}

/**
 * Plate: a `width` × `height` rectangle with corners rounded to `cornerRadius` (0 for square),
 * `depth` thick along z, centred on the origin, minus `holes`.
 */
export function plate(width: number, height: number, depth: number, cornerRadius: number, holes: Vec2[][] = []): BufferGeometry {
  const hw = width / 2;
  const hh = height / 2;
  const cr = Math.min(cornerRadius, hw, hh);
  const q = ARC_SEGMENTS / 4;
  const outline: Vec2[] =
    cr > 0
      ? [
          ...arc(hw - cr, -hh + cr, cr, -Math.PI / 2, 0, q),
          ...arc(hw - cr, hh - cr, cr, 0, Math.PI / 2, q),
          ...arc(-hw + cr, hh - cr, cr, Math.PI / 2, Math.PI, q),
          ...arc(-hw + cr, -hh + cr, cr, Math.PI, (3 * Math.PI) / 2, q),
        ]
      : [
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
          [-hw, hh],
        ];
  return extrudeProfile(outline, holes, depth);
}

export interface HelixOptions {
  /** Coil radius, to the wire's centre line. */
  radius: number;
  /** Rise per turn along +z. */
  pitch: number;
  turns: number;
  wireRadius: number;
}

/** The wire's centre line, exactly on the coil (a spline through samples would cut inside it). */
class HelixCurve extends Curve<Vector3> {
  constructor(
    private readonly radius: number,
    private readonly pitch: number,
    private readonly turns: number,
  ) {
    super();
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const a = t * this.turns * Math.PI * 2;
    return target.set(this.radius * Math.cos(a), this.radius * Math.sin(a), this.pitch * this.turns * t);
  }
}

/** A coil spring: a round wire wound about z from z = 0 up to `pitch * turns`. Open at the wire ends. */
export function helix({ radius, pitch, turns, wireRadius }: HelixOptions): BufferGeometry {
  const segments = Math.max(2, Math.ceil(turns * 48));
  return bare(new TubeGeometry(new HelixCurve(radius, pitch, turns), segments, wireRadius, 8, false));
}
