# Writes intermediate versions for commit N into the working tree. Final versions in FINAL dir.
import sys, subprocess, os
R='/home/user/motes-of-work'
FINAL=sys.argv[1]
step=sys.argv[2]
def fin(p): return open(os.path.join(FINAL,p)).read()
def head(p): return subprocess.run(['git','-C',R,'show','HEAD:'+p],capture_output=True,text=True,check=True).stdout
def write(p,s): open(os.path.join(R,p),'w').write(s)
def sub(s,pairs):
    for a,b in pairs:
        assert a in s,(a[:60])
        s=s.replace(a,b)
    return s
C3_MOTESYS=[("Human (2%) and Dialogue (4%)","Human (1%) and Dialogue (3%)"),
            ("every 4th instance as a 2px cool-white dot","every 4th instance as a 2px white dot")]
if step=='c1':
    write('src/scene/mote/moteSystem.ts', sub(fin('src/scene/mote/moteSystem.ts'), C3_MOTESYS))
    write('src/scene/mote/shaders/mote.frag.glsl', sub(fin('src/scene/mote/shaders/mote.frag.glsl'),[
        ("const vec3 DIALOGUE = vec3(0.7686275, 0.6901961, 1.0); // #C4B0FF","const vec3 DIALOGUE = vec3(0.9019608, 0.8666667, 1.0); // #E6DDFF"),
        ("alpha = 0.35 * exp(-5.0 * r * r)","alpha = 0.5 * exp(-4.0 * r * r)")]))
    write('src/scene/mote/shaders/thread.frag.glsl', sub(fin('src/scene/mote/shaders/thread.frag.glsl'),[
        ("const vec3 DIALOGUE = vec3(0.7686275, 0.6901961, 1.0); // #C4B0FF","const vec3 DIALOGUE = vec3(0.9019608, 0.8666667, 1.0); // #E6DDFF"),
        ("const float ALPHA = 0.4;","const float ALPHA = 0.25;")]))
    g=head('src/scene/mote/shaders/ghost.vert.glsl')
    write('src/scene/mote/shaders/ghost.vert.glsl', sub(g,[
        ("const float GHOST_HALF_SIZE_PX = 1.0; // 2px dot","const float GHOST_HALF_SIZE_PX = 1.0; // 2 CSS px dot"),
        ("clip.xy += aCorner * (2.0 * GHOST_HALF_SIZE_PX / uViewport) * clip.w;","clip.xy += aCorner * (2.0 * GHOST_HALF_SIZE_PX * uPixelRatio / uViewport) * clip.w;")]))
    write('src/scene/mote/shaders/instance.glsl', sub(fin('src/scene/mote/shaders/instance.glsl'),[
        ("const float HERO_HUMAN = 0.02;\nconst float HERO_DIALOGUE = 0.04;","const float HERO_HUMAN = 0.01;\nconst float HERO_DIALOGUE = 0.03;")]))
    write('e2e/looks.spec.ts', sub(fin('e2e/looks.spec.ts'),[
        ("      test.info().annotations.push({ type: 'near-white pixels ghost 1 / ghost 0', description: `${on} / ${off}` });\n","")]))
elif step=='c2':
    write('src/mechanisms/steam/index.ts', sub(head('src/mechanisms/steam/index.ts'),[
        ("""// they show. The core is small, so it is about 3x as dense as the body (warm and bright, not blown
// out: the lit-faces look test still sees the key light through it).
const CORE_SHARE = 0.25;""","""// they show. The governor is about 5% of the surface, so 15% still draws it denser than the body; it
// is bright because it is warm, not because it is dense (at 25% its balls blew out to white).
const CORE_SHARE = 0.15;""")]))
    write('src/mechanisms/steam/index.test.ts', sub(head('src/mechanisms/steam/index.test.ts'),[
        ("""    expect(share).toBeGreaterThan(0.24);
    expect(share).toBeLessThan(0.35);""","""    // Bright because it is warm, not because it is dense (Task 9 visual review): 15%.
    expect(share).toBeGreaterThan(0.14);
    expect(share).toBeLessThan(0.16);""")]))
    t=fin('src/mechanisms/watch/index.test.ts')
    a=t.index("  it('builds the pallet fork heavy enough to see")
    b=t.index("  it('lays the barrel down as the music box cylinder")
    t=t[:a]+t[b:]
    t=t.replace("import {\n  COMB,\n  CYLINDER,","import {\n  CYLINDER,")
    write('src/mechanisms/watch/index.test.ts', t)
