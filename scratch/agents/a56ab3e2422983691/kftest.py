p = '/home/user/motes-of-work/src/timeline/keyframes.test.ts'
s = open(p).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old[:80]
    s = s.replace(old, new)


rep("""    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);
    expect(sampler.sample(at('vibe-build', 0.7)).mech.assembly).toBe(1);
  });
""", """    expect(sampler.sample(at('vibe-build', 0)).mech.assembly).toBe(0);
    expect(sampler.sample(at('vibe-build', 0.85)).mech.assembly).toBe(1);
  });

  // The storyboard (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md §2.1): the bike
  // assembles while the brief is up (vb-brief, 0.23 to 0.87), its lines lighting in reading order at
  // the storyboard's progress, and the drive stands still until the wheels have landed.
  it('builds the bike only while the brief is up, lighting its lines where the storyboard says', () => {
    const assembly = (l: number) => sampler.sample(at('vibe-build', l)).mech.assembly;
    for (const l of [0, 0.1, 0.2, 0.23]) expect(assembly(l), `local ${l}`).toBe(0);
    for (const l of [0.85, 0.87, 0.95, 1]) expect(assembly(l), `local ${l}`).toBe(1);
    const lines = [...(loadStory()[0].body.matchAll(/data-parts="([^"]*)"/g) ?? [])].map((m) => ({
      parts: parsePartList(m[1]),
    }));
    const thresholds = briefThresholds(lines, mechanisms.bike);
    const lights = thresholds.map((t) => {
      for (let i = 0; i <= 10_000; i++) if (assembly(i / 10_000) >= t) return i / 10_000;
      return Infinity;
    });
    [0.48, 0.56, 0.64, 0.72, 0.8].forEach((want, i) => expect(lights[i], `line ${i + 1}`).toBeCloseTo(want, 2));
    for (const l of [0, 0.3, 0.52]) expect(sampler.sample(at('vibe-build', l)).mech.drive, `local ${l}`).toBe(0);
  });
""")

rep("""  it('holds the bike assembled through the reveal while the drive keeps rising', () => {""",
    """  it('holds the bike assembled through the reveal while the drive never falls back', () => {""")
rep("""    expect(drive).toBeCloseTo(3.28, 9);
  });""", """    expect(drive).toBeCloseTo(3, 9);
  });""")

rep("""  it('turns the twin to near full lock for the rest of the reveal, and holds still mid-reveal', () => {
    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.3 the steering stays
    // within 10% of full lock; a fast scroller gets a still beat around the middle.""",
    """  it('turns the twin to near full lock for the rest of the reveal, and holds still from rv-5 on', () => {
    // Spec §5.8: the saddle visibly cocks with the front wheel. From reveal 0.3 the steering stays
    // within 10% of full lock; from rv-5 (0.52) to the end the reveal is a still life.""")
rep("""    const hold = sampler.sample(at('reveal', 0.4)).mech.drive;
    for (let i = 0; i <= 20; i++) expect(sampler.sample(at('reveal', 0.4 + i / 100)).mech.drive).toBe(hold);""",
    """    const hold = sampler.sample(at('reveal', 0.52)).mech.drive;
    for (let i = 0; i <= 48; i++) expect(sampler.sample(at('reveal', 0.52 + i / 100)).mech.drive).toBe(hold);""")

rep("""import { loadStory } from '../story/loader';""", """import { briefThresholds, parsePartList } from '../story/brief';
import { loadStory } from '../story/loader';""")
open(p, 'w').write(s)
print('ok')
