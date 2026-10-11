"""Copy bhmock/blackhole.html to particles/mock.html with measurement hooks exposed on window.__bh.

Adds: show(o) to toggle parts, info() for renderer.info.render, timeRender(n) (SwiftShader-labelled
timing of n renders with gl.finish()), fragEstimate() summing point-sprite squares over the disk dots,
and stop() to halt the rAF loop so timing is clean. The look is untouched.
"""
import pathlib
import sys

src = pathlib.Path(sys.argv[1])
dst = pathlib.Path(sys.argv[2])
html = src.read_text()

# Expose the disk's attribute arrays for the fragment estimate.
html = html.replace(
    "  const geo = geometry(N_DISK, { aR: [aR, 1], aPhi: [aPhi, 1], aH: [aH, 1], aBright: [aB, 1], aSize: [aS, 1] });",
    "  const geo = geometry(N_DISK, { aR: [aR, 1], aPhi: [aPhi, 1], aH: [aH, 1], aBright: [aB, 1], aSize: [aS, 1] });\n  window.__diskArrays = { aR, aPhi, aS };",
)

# A stoppable loop.
html = html.replace(
    "  renderer.render(scene, camera);\n  requestAnimationFrame(tick);\n}\nsetScene(0);",
    "  renderer.render(scene, camera);\n  if (!window.__stopLoop) requestAnimationFrame(tick);\n}\nsetScene(0);",
)

hooks = """
  frames: () => renderer.info.render.frame,
  show: o => { Object.assign(show, o); },
  stop: () => { window.__stopLoop = true; },
  info: () => { const r = renderer.info.render; return { calls: r.calls, triangles: r.triangles, points: r.points, lines: r.lines }; },
  dpr: () => DPR,
  size: () => { const s = new THREE.Vector2(); renderer.getDrawingBufferSize(s); return { w: s.x, h: s.y }; },
  // One frame exactly as tick() draws it, without advancing the clock; then n timed renders.
  timeRender: n => {
    const gl = renderer.getContext();
    const st = frameState();
    renderer.info.reset();
    renderer.render(scene, camera); gl.finish();
    const info = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, points: renderer.info.render.points };
    const times = [];
    for (let i = 0; i < n; i++) { const t0 = performance.now(); renderer.render(scene, camera); gl.finish(); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    return { info, medianMs: times[Math.floor(times.length / 2)], minMs: times[0], n };
  },
  // Point sprites rasterize a size x size square per dot: sum over the disk's dots at the camera's
  // distance (clamp(75/z) ~ 1 at REF_DIST), for image 0, plus image 1 where d >= 0.4 (the far half).
  fragEstimate: () => {
    const { aR, aS } = window.__diskArrays;
    let sq = 0;
    for (let i = 0; i < aR.length; i++) { const s = aS[i] * DPR; sq += s * s; }
    return { image0: Math.round(sq), image1approx: Math.round(sq * 0.5), dots: aR.length };
  },
"""
html = html.replace("  frames: () => renderer.info.render.frame,\n", hooks)
assert "__diskArrays" in html and "__stopLoop" in html and "timeRender" in html
dst.write_text(html)
print("wrote", dst, len(html))
