p = '<scratchpad>/galaxy-mocks/galaxy-mock.html'
s = open(p).read()
n = 0
def rep(a, b):
    global s, n
    assert a in s, a[:70]
    s = s.replace(a, b); n += 1
# ASCII-only UI strings, so the published fragment reads the same under any charset
rep('<button id="zoomplay">Zoom out ▶</button>', '<button id="zoomplay">Zoom out: play</button>')
rep("zp.textContent = 'Zoom out ▶'; build(b.dataset.mode); };", "zp.textContent = 'Zoom out: play'; build(b.dataset.mode); };")
rep("zoomPlaying = false; zp.textContent = 'Zoom out ▶'; if (MODE !== 'zoom') build('zoom'); };", "zoomPlaying = false; zp.textContent = 'Zoom out: play'; if (MODE !== 'zoom') build('zoom'); };")
rep("zp.textContent = zoomPlaying ? 'Zoom ❚❚' : 'Zoom out ▶'; };", "zp.textContent = zoomPlaying ? 'Zoom out: pause' : 'Zoom out: play'; };")
rep("if (zoom >= 1) { zoomPlaying = false; zp.textContent = 'Zoom out ▶'; } }", "if (zoom >= 1) { zoomPlaying = false; zp.textContent = 'Zoom out: play'; } }")
rep("out.textContent = `${ambient.toFixed(1)} s · ${fps.toFixed(0)} fps`;", "out.textContent = `${ambient.toFixed(1)} s, ${fps.toFixed(0)} fps`;")
rep("lastInfo = `distance ${d.toFixed(1)} · system radius on screen ${Math.max(...sysPx.values()).toFixed(0)} px · systems at full detail ${lod2}, star+planets ${lod1}, star only ${stars.length - lod1 - lod2} · instances ${instances + streamN} (+${GALAXY.stars + GALAXY.dust} background)`;",
    "lastInfo = `distance ${d.toFixed(1)}; system radius on screen ${Math.max(...sysPx.values()).toFixed(0)} px; systems at full detail ${lod2}, star+planets ${lod1}, star only ${stars.length - lod1 - lod2}; instances ${instances + streamN} (+${GALAXY.stars + GALAXY.dust} background)`;")
rep("label.textContent = STILL ? `${MODE} · ${MODE === 'far' ? (SICK ? 'carries the defect' : 'healthy') + ' · ' : ''}ambient ${ambient.toFixed(2)} s${ZOOM0 !== null ? ' · zoom ' + zoom.toFixed(2) : ''}` : '';",
    "label.textContent = STILL ? `${MODE} \\u00b7 ${MODE === 'far' ? (SICK ? 'carries the defect' : 'healthy') + ' \\u00b7 ' : ''}ambient ${ambient.toFixed(2)} s${ZOOM0 !== null ? ' \\u00b7 zoom ' + zoom.toFixed(2) : ''}` : '';")
rep("zoom: [['Now let’s zoom out.', 1],", "zoom: [['Now let\\u2019s zoom out.', 1],")
rep("(planet points at 10–20 px of system radius, planet shells at 25–50, moons at 60–120).", "(planet points at 10 to 20 px of system radius, planet shells at 25 to 50, moons at 60 to 120).")
rep("close: 'Left: a healthy plan (a planet) with the pieces of code built from it (its moons). Right: the same, with one piece carrying the defect: once in a while that moon stalls, runs backwards, drifts off its track and snaps back. The small pair above the controls is the same two from the far shot\\'s distance.',",
    "close: 'Left: a healthy plan (a planet) with the pieces of code built from it (its moons). Right: the same, with one piece carrying the defect: once in a while that moon stalls, runs backwards, drifts off its track and snaps back. The small pair above the controls is the same two from the far shot distance.',")
# the galaxy's turn is not applied in the close views (the two planets are placed by hand, not in the galaxy)
rep("galaxyGroup.rotation.y = (2 * Math.PI * t) / GALAXY.period;", "galaxyGroup.rotation.y = bgGroup.visible ? (2 * Math.PI * t) / GALAXY.period : 0;")
open(p, 'w').write(s)
import re
non = sorted(set(re.findall(r'[^\x00-\x7f]', s)))
print('patched', n, 'non-ascii left:', non)
# the publishable fragment: a charset meta first (no doctype/html/head/body), then the styles and the body's children
start = s.index('<title>'); end = s.index('</style>') + len('</style>')
bstart = s.index('<canvas'); bend = s.index('</body>')
pub = '<meta charset="UTF-8" />\n' + s[start:end] + '\n' + s[bstart:bend].rstrip() + '\n'
open('<scratchpad>/orbitpub/orbits.html', 'w').write(pub)
print('pub bytes', len(pub), 'doctype', '<!doctype' in pub.lower(), 'html tag', '<html' in pub, 'three rel', "'./three.module.js'" in pub)
