"""Second patch round: GLSL3 via three's own prologue, preserveDrawingBuffer, readPixels-synced timing,
and a disk-only visibility switch for the mock (gain 0 still draws; visible=false does not)."""
import pathlib
import sys

d = pathlib.Path(sys.argv[1])

f = d / "disk-field.html"
s = f.read_text()
s = s.replace("const VERT = /* glsl */`#version 300 es\nprecision highp float;", "const VERT = /* glsl */`precision highp float;")
s = s.replace("const FRAG = /* glsl */`#version 300 es\nprecision highp float;", "const FRAG = /* glsl */`precision highp float;")
s = s.replace(
    "  return new THREE.RawShaderMaterial({\n    vertexShader: VERT, fragmentShader: FRAG,",
    "  return new THREE.RawShaderMaterial({\n    glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,",
)
s = s.replace(
    "new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, premultipliedAlpha: true })",
    "new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, premultipliedAlpha: true, preserveDrawingBuffer: true })",
)
old_t = """    const times = [];
    for (let i = 0; i < n; i++) { const t0 = performance.now(); renderOnce(); gl.finish(); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    return { info, medianMs: times[Math.floor(times.length / 2)], minMs: times[0], n };"""
new_t = """    const times = [], px = new Uint8Array(4);
    for (let i = 0; i < n; i++) { const t0 = performance.now(); renderOnce(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const readOnlyMs = performance.now() - t1;
    return { info, medianMs: times[Math.floor(times.length / 2)], minMs: times[0], readOnlyMs, n, sync: 'render + 1px readPixels' };"""
assert old_t in s
s = s.replace(old_t, new_t)
assert "#version" not in s and "GLSL3" in s
f.write_text(s)

m = d / "mock.html"
s = m.read_text()
old_t = """    const times = [];
    for (let i = 0; i < n; i++) { const t0 = performance.now(); renderer.render(scene, camera); gl.finish(); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    return { info, medianMs: times[Math.floor(times.length / 2)], minMs: times[0], n };"""
new_t = """    const times = [], px = new Uint8Array(4);
    for (let i = 0; i < n; i++) { const t0 = performance.now(); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const readOnlyMs = performance.now() - t1;
    return { info, medianMs: times[Math.floor(times.length / 2)], minMs: times[0], readOnlyMs, n, sync: 'render + 1px readPixels' };"""
assert old_t in s
s = s.replace(old_t, new_t)
s = s.replace(
    "  show: o => { Object.assign(show, o); },",
    "  show: o => { Object.assign(show, o); },\n  diskOnly: on => { for (const c of group.children) c.visible = !on || c.material === diskMat || c.material === diskMat2; },\n  hideUi: () => { document.getElementById('bottom').classList.add('hidden'); for (const el of document.querySelectorAll('header, #top, .top, h1')) el.style.display = 'none'; },",
)
s = s.replace("const renderer = new THREE.WebGLRenderer({ antialias: false", "const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true, antialias: false")
assert "diskOnly" in s
m.write_text(s)
print("patched")
