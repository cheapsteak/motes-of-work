# Credits

## Ported code

### BOSL2 `gears.scad` — involute spur gear profile

- Source: https://github.com/BelfrySCAD/BOSL2/blob/master/gears.scad (`_gear_tooth_profile`,
  `_base_radius`, `_dedendum`, `_invol`), fetched 2026-10-03.
- Licence: BSD-2-Clause.
- Used in: `src/shapes/involute.ts` (`involuteGear`).
- What was taken: the involute point construction (`base_r * [cos a + b sin a, sin a - b cos a]`),
  the radii of the full-depth system (pitch radius = module × teeth / 2, base radius = pitch radius ×
  cos(pressure angle), addendum = module, dedendum = module + clearance with the default clearance of
  module / 4), half-pitch tooth thickness at the pitch circle, and stopping the flanks short of
  meeting when a tooth would come to a point below the addendum circle. Simplified in the port: no
  backlash, profile shift, helical angle or rack undercut; the flank below the base circle is radial.
  (BOSL2's gear code is itself inspired by Leemon Baird's public-domain parametric involute spur
  gear, 2011.)

Notice, as the licence requires:

```
BSD 2-Clause License

Copyright (c) 2017-2019, Revar Desmera
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice, this
  list of conditions and the following disclaimer.

* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

### Derived, not ported

- Cycloidal tooth profile (`cycloidalGear` in `src/shapes/involute.ts`): written from the textbook
  epicycloid (a circle of radius ρ rolling outside the pitch circle R traces
  `((R+ρ) cos t − ρ cos((R+ρ)t/ρ), (R+ρ) sin t − ρ sin((R+ρ)t/ρ))`) with radial flanks below the
  pitch circle, as in horological wheel teeth. No source code consulted.

## Libraries

- three.js (MIT): rendering, `ExtrudeGeometry` and the other primitive geometries, and
  `MeshSurfaceSampler` (`three/examples/jsm/math/MeshSurfaceSampler.js`), used unmodified with a
  seeded random generator.

## Inspired by

- (none yet)

## Facts and data

- Strandbeest link lengths (Jansen's "holy numbers") are taken as published facts from Wikipedia, "Jansen's linkage" (https://en.wikipedia.org/wiki/Jansen%27s_linkage). No text or code was copied.
