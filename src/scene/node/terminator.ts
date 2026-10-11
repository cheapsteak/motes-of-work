// The planets' and moons' light (docs/specs/2026-10-09-act-2-reskin.md §4.4, the re-skin's Task 7): a
// terminator toward their own star, and their colour. A planet is lit on the side facing its star and
// dark on the far side, a crescent made by dimming its dots; a moon is lit from its planet's star. Its
// colour is one of PLANET_LOOK's cool hues tinted by that star, C1's pinned to its luminous cyan. The
// GLSL in terminator.glsl mirrors terminator() and lightDir() (the parity page, `?lib=terminator`);
// planetTint() is packed into the bodies texture's T6 on the CPU (bodyData.ts), so it has no twin.
// Only operations GLSL has are used, and both mirrors read PLANET_LOOK (classLook.ts, spliced).
import type { Vec3 } from '../../math/vec';
import { hexToRgb } from './birth';
import { bodyTexel, type BodyData } from './bodyData';
import { PLANET_LOOK } from './classLook';
import { bodyWorld } from './orbit';
import { starTint } from './star';

// GLSL semantics.
function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
  return t * t * (3 - 2 * t);
}

/**
 * The terminator's light on a surface of unit normal `n` lit from the unit direction `toStar`:
 * mix(night, 1, smoothstep(−PLANET_LOOK.edge, PLANET_LOOK.edge, n·L)). 1 facing the star, `night`
 * behind it, half way between on the terminator itself.
 */
export function terminator(n: Vec3, toStar: Vec3, night: number): number {
  const d = n[0] * toStar[0] + n[1] * toStar[1] + n[2] * toStar[2];
  const s = smoothstep(-PLANET_LOOK.edge, PLANET_LOOK.edge, d);
  return night * (1 - s) + s;
}

/**
 * The unit direction from body `row`'s place to its star's at ambient `t` (bodyWorld, the derp left
 * out): normalize(star − centre). A moon's star is its planet's (the bodies texture's T5.z carries it,
 * generate.ts). A body with no star (the core, a barycentre), or one at its star's very place, has none: 0.
 */
export function lightDir(data: BodyData, row: number, t: number): Vec3 {
  const star = Math.round(bodyTexel(data.bodies, 5, row)[2]);
  if (star < 0) return [0, 0, 0];
  const s = bodyWorld(data, star, t);
  const c = bodyWorld(data, row, t);
  const d: Vec3 = [s[0] - c[0], s[1] - c[1], s[2] - c[2]];
  const len = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  return len > 0 ? [d[0] / len, d[1] / len, d[2] / len] : [0, 0, 0];
}

/**
 * A planet's colour (and its moons'): PLANET_LOOK.cool[hue] mixed PLANET_LOOK.starTint toward its star's
 * tint (star.ts starTint of the star's temperature); the hero (C1) PLANET_LOOK.hero, unmixed.
 */
export function planetTint(hue: number, starTemperature: number, hero: boolean): Vec3 {
  if (hero) return hexToRgb(PLANET_LOOK.hero);
  const cool = hexToRgb(PLANET_LOOK.cool[hue]);
  const star = starTint(starTemperature);
  const k = PLANET_LOOK.starTint;
  return [0, 1, 2].map((i) => cool[i] * (1 - k) + star[i] * k) as Vec3;
}
