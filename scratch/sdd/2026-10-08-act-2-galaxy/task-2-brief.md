### Task 2: The orbit mirror pair and the bodies texture

**Files:**
- Create: `src/scene/node/bodyData.ts`, `src/scene/node/orbit.ts`, `src/scene/node/orbit.glsl`, `src/scene/node/orbit.test.ts`
- Modify: `src/scene/node/birth.ts` (orbit constants and their splice), `src/scene/node/shaderSource.ts` (`orbitLibraryGlsl()`), `src/parity/parity.ts`, `src/parity/fields.ts`, `src/parity/shaders.ts` (`?lib=orbit`), `e2e/parity.spec.ts`

**Interfaces:**
- Consumes: `Galaxy`, `Body`, `OrbitElements` (Task 1).
- Produces:
  ```ts
  // bodyData.ts. Rows = Body.index; RGBA32F; BODY_TEXELS = 6
  //  T0 spot.xyz, kind (0 core, 1 star, 2 planet, 3 moon)   T1 a, e, tilt, tiltAz
  //  T2 omega0, precession, period, phase                   T3 host row (−1), R, born, dur
  //  T4 fixAt, hiAt, hop, cracked                           T5 derpSeed, derpPhase, star row, rule row
  // Streams: T0 from, to, kind (0 out, 1 side, 2 in, 3 feed), born   T1 hiAt, hop, bowBearing, childFixAt
  export const BODY_TEXELS = 6;
  export interface BodyData { bodies: Float32Array; streams: Float32Array; bodyCount: number; streamCount: number; feedRow: number; n0Row: number }
  export function packBodyData(g: Galaxy): BodyData;
  export function bodyTexel(data: Float32Array, t: number, row: number): [number, number, number, number];
  // orbit.ts (orbit.glsl mirrors it)
  export const GALAXY_TURN_PERIOD = 1200;
  export function keplerE(M: number, e: number): number;                  // three Newton steps from E0 = M + e·sin M
  export function orbitLocal(o: Pick<OrbitElements, 'a' | 'e' | 'tilt' | 'tiltAz' | 'omega0' | 'precession' | 'period' | 'phase'>, t: number): Vec3;
  export function galaxyTurn(t: number): number;                          // 2π t / 1200
  export function bodyGalactic(data: BodyData, row: number, t: number): Vec3; // walks the host chain (moon → planet → star), ≤ 3 hops
  export function bodyWorld(data: BodyData, row: number, t: number): Vec3;    // turn(galactic) − turn(galactic(N0)): N0 ≡ origin
  ```
  GLSL: `vec3 bodyWorld(int row, float t)` reading `uBodies` with `texelFetch`, and `uN0Row`.

- [ ] **Step 1: Write the failing tests** (`orbit.test.ts`)

```ts
it('Kepler converges for e ≤ 0.3', () => { for (const e of [0, 0.1, 0.22, 0.3]) for (const M of grid(0, TAU, 360)) expect(Math.abs(keplerE(M, e) - e * Math.sin(keplerE(M, e)) - M)).toBeLessThan(1e-6); });
it('a body stays between periapsis and apoapsis', () => { /* every planet and moon, 1000 t samples: |local| ∈ [a(1−e), a(1+e)] */ });
it('e = 0 is revision 3\'s circle', () => { /* |local| = a and the angle = phase + 2πt/P (+ ω, tilt applied) */ });
it('N0 is the world origin at every ambient', () => { for (const t of [0, 37.3, 101, 953, 86_400]) expect(bodyWorld(data, data.n0Row, t)).toEqual([0, 0, 0]); });
it('the galaxy turns rigidly', () => { /* |world(Ri) − world(Rj)| and |world(Pi) − world(Pj)| constant over t to 1e-9 */ });
it('no two bodies meet at any ambient', () => {
  // 720 samples of 0..1200 s: no two planets of a star intersect as spheres of radius R;
  // a moon never crosses an adjacent track: a_i(1+e_i) < a_{i+1}(1 − e_{i+1})
});
it('every body stays inside its lift bound', () => { /* a planet's |y − star.y| ≤ 9.6·sin 0.25; a moon's |y − planet.y| ≤ 2.5·Rp·sin 0.2 */ });
```

- [ ] **Step 2: Run it.** `npx vitest run src/scene/node/orbit.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement `packBodyData`, `orbit.ts` and `orbit.glsl`.**
  - Precession: `ω(t) = ω0 + 2π t / precession`.
  - Mean anomaly: `M = phase·2π + 2π t / period`. The radius is `a(1 − e cos E)` at true anomaly ν.
  - The plane is tilted by `tilt` about the horizontal axis at azimuth `tiltAz`.
  - Splice `GALAXY_TURN_PERIOD` from `birth.ts`. Only GLSL operations are allowed, as in `node.ts`.

- [ ] **Step 4: Add `?lib=orbit` to the parity page.**
  - Sampled rows: N0, C1 and its six moons, P1, R0, R1, and 32 hashed rows.
  - Sampled times: t ∈ {0, 37.3, 101, 953, 3599.9}.
  - Compared field: `bodyWorld.xyz`.
  - Add `test('GLSL bodyWorld() matches the TS reference')` to `e2e/parity.spec.ts`.

- [ ] **Step 5: Run the tests.** Vitest file, then `E2E_PORT=$PORT npx playwright test e2e/parity.spec.ts -g bodyWorld`. Expected: PASS.

- [ ] **Close-out** A, C and D. There are no stills: the parity page is not a picture. Nothing is retired.

---

