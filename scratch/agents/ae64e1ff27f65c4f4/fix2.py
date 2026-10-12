import re

R = './'


def edit(path, old, new, count=1):
    p = R + path
    s = open(p).read()
    assert s.count(old) == count, (path, old, s.count(old))
    s = s.replace(old, new)
    open(p, 'w').write(s)


# birth.ts: the stream speed, spliced.
edit('src/scene/node/birth.ts', """/** Where a builder sets out""", """/**
 * A stream's dots move this share of its length per unit of `clock`, every stream from its parent
 * to its child (a to b): down a stream from above, sideways along a copy, and up the one up-stream
 * from C7's top to R1's foot, which is how its dots climb (stream.ts).
 */
export const NODE_STREAM_SPEED = 0.15;
/** Where a builder sets out""")
edit('src/scene/node/birth.ts', """  ['NODE_NEVER', NODE_NEVER],""", """  ['NODE_NEVER', NODE_NEVER],
  ['NODE_STREAM_SPEED', NODE_STREAM_SPEED],""")

# stream.vert.glsl: one direction for every edge, the spliced speed.
edit('src/scene/node/shaders/stream.vert.glsl', """const float STREAM_SPEED = 0.15; // of a stream's length per unit of clock
""", "")
edit('src/scene/node/shaders/stream.vert.glsl', """  float u = fract(aK + (up ? -1.0 : 1.0) * STREAM_SPEED * uClock);""",
     """  // Parent to child along every edge (a to b): the up-stream's a is C7's top, so its dots climb
  // (stream.ts is the TypeScript twin).
  float u = fract(aK + NODE_STREAM_SPEED * uClock);""")

# Minor 9: the double blank line.
edit('src/scene/mote/shaders/mote.frag.glsl', """0 for the bike, which never lights

""", """0 for the bike, which never lights
""")

# Minor 5: the sentinel by name.
edit('src/scene/node/node.test.ts', "nodeLight(n.fixAt ?? 2, n.hiAt ?? 2, n.hop ?? -1,", "nodeLight(n.fixAt ?? NODE_NEVER, n.hiAt ?? NODE_NEVER, n.hop ?? -1,")
edit('src/scene/node/node.test.ts', "  NODE_FLARE_WIDTH,\n", "  NODE_FLARE_WIDTH,\n  NODE_NEVER,\n")

# Minor 8: the node parity test asserts the hash as the mote test does.
edit('e2e/parity.spec.ts', """  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
  expect(byName.get('pcg goldens')).toBe(0);""", """  for (const c of parity.cases) expect(c.maxError, c.name).toBeLessThan(1e-3);
  expect(byName.get('hash01')).toBeLessThan(1e-7);
  expect(byName.get('pcg goldens')).toBe(0);""")

# Minor 4: the change-detector test.
p = R + 'src/timeline/netShots.test.ts'
s = open(p).read()
s = re.sub(r"describe\('the zoom-out shots, as the clearance test moved them'.*?\n\}\);\n\n", '', s, flags=re.S)
open(p, 'w').write(s)
