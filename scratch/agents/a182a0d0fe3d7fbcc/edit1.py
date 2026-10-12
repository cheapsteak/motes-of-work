import os
os.chdir('.')


def sub(path, old, new):
    s = open(path).read()
    assert old in s, (path, old[:60])
    s = s.replace(old, new, 1)
    open(path, 'w').write(s)


p = 'src/story/content.test.ts'
sub(p, """import { matchesPart } from './brief';""", """import { briefThresholds, matchesPart, parsePartList } from './brief';""")
sub(p, """    ['alt', section.alt],
  ];""", """    ['alt', section.alt],
    ['label', section.label],
  ];""")
sub(p, """    it('contains no term from the local denylist', () => {""", """    it('has a running label: a two-digit number, a dash, then sentence case', () => {
      expect(section.label).toMatch(/^\\d{2} \\u2014 [A-Z][^A-Z]*$/);
    });

    it('contains no term from the local denylist', () => {""")
sub(p, """    expect(unmatched).toEqual([]);
  });
});""", """    expect(unmatched).toEqual([]);
  });

  it('ticks its lines in reading order on the bike: thresholds never fall down the list', () => {
    const lines = story
      .flatMap((s) => [...s.body.matchAll(/data-parts="([^"]*)"/g)])
      .map((m) => ({ parts: parsePartList(m[1]) }));
    const at = briefThresholds(lines, mechanisms.bike);
    expect(at.length).toBeGreaterThan(1);
    for (let i = 1; i < at.length; i++) expect(at[i], `line ${i + 1}`).toBeGreaterThanOrEqual(at[i - 1]);
  });

  it('is introduced by its label, above the ask', () => {
    const body = story.map((s) => s.body).join('\\n');
    expect(body).toMatch(/<p class="brief-label">The brief<\\/p>\\s*<p class="brief-ask">/);
  });
});""")

p = 'src/story/brief.test.ts'
sub(p, """  const lines = [
    {
      parts: parsePartList(
        "front-wheel rear-wheel cranks chain-* pedal-left pedal-right",
      ),
    },
    { parts: parsePartList("saddle handlebars") },
    { parts: parsePartList("fork front-wheel") },""", """  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering,
  // brakes, frame.
  const lines = [
    { parts: parsePartList("saddle handlebars") },
    {
      parts: parsePartList(
        "front-wheel rear-wheel cranks chain-* pedal-left pedal-right",
      ),
    },
    { parts: parsePartList("fork front-wheel") },""")
sub(p, "      0.72, 0.45, 0.8, 0.87, 0.95,", "      0.45, 0.72, 0.8, 0.87, 0.95,")
s = open(p).read()
old_apply = s[s.index('describe("applyBrief"'):]
new_apply = '''describe("applyBrief", () => {
  const fakeLine = () => {
    const attrs = new Set<string>();
    const el = {
      toggleAttribute(name: string, force?: boolean) {
        if (force) attrs.add(name);
        else attrs.delete(name);
        return attrs.has(name);
      },
      hasAttribute: (name: string) => attrs.has(name),
    };
    return {
      el: el as unknown as HTMLElement,
      status: { textContent: "" } as HTMLElement,
      parts: [] as string[],
    };
  };

  it("meets a line exactly when assembly reaches its threshold, and clears it again below", () => {
    const lines = [fakeLine(), fakeLine()];
    const thresholds = [0.5, 1];
    const met = () => lines.map((l) => l.el.hasAttribute("data-met"));
    applyBrief(lines, thresholds, 0);
    expect(met()).toEqual([false, false]);
    applyBrief(lines, thresholds, 0.4999);
    expect(met()).toEqual([false, false]);
    applyBrief(lines, thresholds, 0.5);
    expect(met()).toEqual([true, false]);
    applyBrief(lines, thresholds, 1);
    expect(met()).toEqual([true, true]);
    applyBrief(lines, thresholds, 0.3);
    expect(met()).toEqual([false, false]);
  });

  it("tells a screen reader which lines are done, in step with the mark", () => {
    const lines = [fakeLine(), fakeLine()];
    const said = () => lines.map((l) => l.status.textContent);
    applyBrief(lines, [0.5, 1], 0.7);
    expect(said()).toEqual([BRIEF_DONE, ""]);
    applyBrief(lines, [0.5, 1], 0.2);
    expect(said()).toEqual(["", ""]);
    expect(BRIEF_DONE.trim()).toBe("(done)");
  });
});
'''
s = s.replace(old_apply, new_apply)
s = s.replace("""import {
  applyBrief,""", """import {
  applyBrief,
  BRIEF_DONE,""", 1)
open(p, 'w').write(s)
