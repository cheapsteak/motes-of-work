// GLSL mirror of src/scene/node/terminator.ts: the planets' and moons' terminator toward their own
// star (re-skin §4.4). terminator.ts says what each term is. It has no main(), and it is not usable
// raw: take it from withTerminatorLibrary() or withGalaxyLibrary() in shaderSource.ts (this folder),
// which splice in the generated planet constants (classLook.ts PLANET_LOOK) at the marker below and
// put the mote library and orbit.glsl (bodyTexel, bodyWorld) before it. A fragment shader takes only
// terminator() and farSide() (withTerminatorFragment: TERMINATOR_FRAGMENT defined, so lightDir, which reads the
// bodies texture, is left out). The parity page (src/parity, ?lib=terminator) renders it and
// compares it with the TS reference.

// #include PLANET constants (generated from src/scene/node/classLook.ts by shaderSource.ts)

// The terminator's light on a surface of unit normal n lit from the unit direction toStar:
// mix(night, 1, smoothstep(-PLANET_EDGE, PLANET_EDGE, n.L)).
float terminator(vec3 n, vec3 toStar, float night) {
  return mix(night, 1.0, smoothstep(-PLANET_EDGE, PLANET_EDGE, dot(n, toStar)));
}

// The far side's light on a surface of unit normal n seen along the unit direction toEye (both in one
// space): mix(dim, 1, smoothstep(-PLANET_FAR_SOFT, 0, n.V)), dim a planet's PLANET_FAR_DIM or a moon's
// PLANET_MOON_FAR_DIM. Whole on the near side and the limb.
float farSide(vec3 n, vec3 toEye, float dim) {
  return mix(dim, 1.0, smoothstep(-PLANET_FAR_SOFT, 0.0, dot(n, toEye)));
}

#ifndef TERMINATOR_FRAGMENT
// The unit direction from body row's place to its star's at ambient t (bodyWorld, the derp left out);
// a moon's star is its planet's (T5.z). No star, or at its star's very place: 0.
vec3 lightDir(int row, float t) {
  int star = int(round(bodyTexel(5, row).z));
  if (star < 0) return vec3(0.0);
  vec3 d = bodyWorld(star, t) - bodyWorld(row, t);
  float len = sqrt(dot(d, d));
  return len > 0.0 ? d / len : vec3(0.0);
}
#endif
