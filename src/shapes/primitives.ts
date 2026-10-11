// Machine-part primitives, each a closed BufferGeometry (except the helix, an open tube) with
// `position` and `normal` attributes, in part space.
import {
  BufferGeometry,
  Curve,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
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

/**
 * A closed, linearly tapered elliptical frustum along y, from y = 0 to `height`. Each end is an
 * ellipse given as [half-width along x, half-depth along z]; between them every cross-section is an
 * ellipse with both semi-axes interpolated, so the sides are smooth and everywhere convex.
 * Non-indexed, with exact outward normals on the sides and flat end caps.
 */
export function ellipticFrustum(
  bottom: [number, number],
  top: [number, number],
  height: number,
  segments = ARC_SEGMENTS * 2,
  rings = 4,
): BufferGeometry {
  const [a0, b0] = bottom;
  const [a1, b1] = top;
  const vertex = (r: number, j: number): { p: Vector3; n: Vector3 } => {
    const t = r / rings;
    const th = (j / segments) * Math.PI * 2;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const a = a0 + (a1 - a0) * t;
    const b = b0 + (b1 - b0) * t;
    // d/dt x d/dθ of (a cos θ, t height, b sin θ), which points out of the solid.
    const n = new Vector3(b * height * c, -((a1 - a0) * b * c * c + a * (b1 - b0) * s * s), a * height * s).normalize();
    return { p: new Vector3(a * c, t * height, b * s), n };
  };
  const positions: number[] = [];
  const normals: number[] = [];
  const push = (...vs: { p: Vector3; n: Vector3 }[]) => {
    for (const v of vs) {
      positions.push(v.p.x, v.p.y, v.p.z);
      normals.push(v.n.x, v.n.y, v.n.z);
    }
  };
  for (let r = 0; r < rings; r++) {
    for (let j = 0; j < segments; j++) {
      const v00 = vertex(r, j);
      const v10 = vertex(r + 1, j);
      const v01 = vertex(r, j + 1);
      const v11 = vertex(r + 1, j + 1);
      push(v00, v10, v01, v01, v10, v11);
    }
  }
  // Flat end caps, fanned from each end's centre.
  const down = new Vector3(0, -1, 0);
  const up = new Vector3(0, 1, 0);
  const lo = (j: number) => ({ p: vertex(0, j).p, n: down });
  const hi = (j: number) => ({ p: vertex(rings, j).p, n: up });
  for (let j = 0; j < segments; j++) {
    push({ p: new Vector3(0, 0, 0), n: down }, lo(j), lo(j + 1));
    push({ p: new Vector3(0, height, 0), n: up }, hi(j + 1), hi(j));
  }
  const geom = new BufferGeometry();
  geom.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geom.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return geom;
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
