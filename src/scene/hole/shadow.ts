// The black hole's shadow on screen (docs/specs/2026-10-09-act-2-reskin.md §4.2, "The shadow stays
// black"): the disc of radius B_CRIT × scale, projected at the hole's distance, in device px with
// gl_FragCoord's origin (the bottom left). Every galaxy fragment shader discards inside it (uShadow:
// galaxyMote.frag, body.frag, ring.frag, star.frag and hole.frag), so no sprite, halo or dot of any
// draw lights a pixel there; the hole's own dots pile onto its rim through the lens (hole.ts holeLens).
import { Vector3, type PerspectiveCamera } from 'three';
import type { Vec3 } from '../../math/vec';
import type { Viewport } from '../node/lod';
import { HOLE_LENS, HOLE_LOOK } from './holeLook';

/** The shadow's disc: its centre (device px from the bottom left) and radius (device px); r 0 is none. */
export interface ShadowDisc {
  x: number;
  y: number;
  r: number;
}

/** No shadow: nothing is discarded. */
export const NO_SHADOW: ShadowDisc = Object.freeze({ x: 0, y: 0, r: 0 });

const at = new Vector3();

/**
 * The shadow of the hole at world `holeWorld` through `camera` on `viewport` (device px: the drawing
 * buffer): its centre where the hole projects, its radius B_CRIT × `scale` × focal / z, focal in device
 * px and z the hole's depth in front of the camera. NO_SHADOW when the hole is not in front of it.
 */
export function shadowDisc(camera: PerspectiveCamera, viewport: Viewport, holeWorld: Vec3, scale: number = HOLE_LOOK.scale): ShadowDisc {
  camera.updateMatrixWorld();
  at.set(holeWorld[0], holeWorld[1], holeWorld[2]).applyMatrix4(camera.matrixWorldInverse);
  const z = -at.z;
  if (!(z > camera.near)) return NO_SHADOW;
  at.applyMatrix4(camera.projectionMatrix);
  const focal = 0.5 * viewport.height * camera.projectionMatrix.elements[5];
  return {
    x: ((at.x + 1) / 2) * viewport.width,
    y: ((at.y + 1) / 2) * viewport.height,
    r: (HOLE_LENS.bCrit * scale * focal) / z,
  };
}
