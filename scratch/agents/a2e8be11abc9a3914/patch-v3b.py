p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:60]
    s = s.replace(a, b); n += 1
# a. the background point sets live in their own group, so the close views can hide them without hiding the bodies
rep("const hoodGroup = new THREE.Group(); galaxyGroup.add(hoodGroup);  // the neighbourhood rides the arm",
    "const hoodGroup = new THREE.Group(); galaxyGroup.add(hoodGroup);  // the neighbourhood rides the arm\n      const bgGroup = new THREE.Group(); galaxyGroup.add(bgGroup);      // the background stars, dust and core")
rep("galaxyGroup.add(dust); galaxyGroup.add(core); galaxyGroup.add(stars); galaxyGroup.add(bright);",
    "bgGroup.add(dust); bgGroup.add(core); bgGroup.add(stars); bgGroup.add(bright);")
rep("galaxyGroup.visible = !(mode === 'close' || mode === 'far');", "bgGroup.visible = !(mode === 'close' || mode === 'far');")
# b. pixel floors and caps are CSS px: scale by the device pixel ratio in the shader
rep("uniforms: { uSize: { value: size }, uOpacity: { value: opacity }, uMinPx: { value: minPx }, uMaxPx: { value: maxPx }, uScale: { value: 1 }, uGain: { value: 1 }, uHalo: { value: halo } },",
    "uniforms: { uSize: { value: size }, uOpacity: { value: opacity }, uMinPx: { value: minPx }, uMaxPx: { value: maxPx }, uScale: { value: 1 }, uGain: { value: 1 }, uHalo: { value: halo }, uDpr: { value: devicePixelRatio } },")
rep("uniform float uSize, uMinPx, uMaxPx, uScale; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; float px = uSize * uScale / -mv.z; gl_PointSize = clamp(px, uMinPx, uMaxPx); }",
    "uniform float uSize, uMinPx, uMaxPx, uScale, uDpr; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; float px = uSize * uScale / -mv.z; gl_PointSize = clamp(px, uMinPx, uMaxPx) * uDpr; }")
# c. orbit and track dots, and streams, bright enough to read as dotted lines on a phone
rep("const kk = (k.lit ? 0.6 : 0.4) * gain;", "const kk = (k.lit ? 0.8 : 0.55) * gain;")
rep("orbits = points(op, oc, 0.02, 0.8, 1.0); g.add(orbits);", "orbits = points(op, oc, 0.02, 0.9, 1.4); g.add(orbits);")
rep("streamObj = points(pos, col, 0.05, 0.7, 1.0); hoodGroup.add(streamObj);", "streamObj = points(pos, col, 0.05, 0.9, 1.3); hoodGroup.add(streamObj);")
# d. moons appear a little later, so the neighbourhood shot is star-and-planets
rep("const LOD = { planets: [10, 20], shells: [25, 50], moons: [50, 100] };", "const LOD = { planets: [10, 20], shells: [25, 50], moons: [60, 120] };")
rep("watch the detail levels hand over (planets at 5–12 px of system radius, shells at 20–40, moons at 40–80).", "watch the detail levels hand over (planet points at 10–20 px of system radius, planet shells at 25–50, moons at 60–120).")
open(p, 'w').write(s)
print('patched', n)
