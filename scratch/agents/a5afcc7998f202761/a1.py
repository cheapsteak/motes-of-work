p='e2e/brief.spec.ts'
s=open(p).read()
old='''          return {
            opacity: Number(getComputedStyle(li).opacity),
            met: li.hasAttribute("data-met"),
          };'''
new='''          return {
            opacity: Number(getComputedStyle(li).opacity),
            met: li.hasAttribute("data-met"),
            color: getComputedStyle(li).color,
          };'''
assert old in s; s=s.replace(old,new)
old='''        expect(await look(k), `${name} just before its turn`).toEqual({
          opacity: 0,
          met: false,
        });
        await scrollToProgress(page, global(line.at + fade + 0.001));
        expect(await look(k), `${name} once up`).toEqual({
          opacity: 1,
          met: false,
        });'''
new='''        expect(await look(k), `${name} just before its turn`).toMatchObject({
          opacity: 0,
          met: false,
        });
        // Up and unmet, the line is in full ink: never greyed out while it waits for its parts.
        await scrollToProgress(page, global(line.at + fade + 0.001));
        expect(await look(k), `${name} once up`).toEqual({
          opacity: 1,
          met: false,
          color: INK,
        });'''
assert old in s; s=s.replace(old,new)
old='''        expect(await look(k), `${name} once its parts have landed`).toEqual({
          opacity: 1,
          met: true,
        });'''
new='''        expect(await look(k), `${name} once its parts have landed`).toMatchObject({
          opacity: 1,
          met: true,
        });'''
assert old in s; s=s.replace(old,new)
old='''// Each line is absent, not dim, until its own scroll position, and comes up before it is met'''
new='''/** The story's full ink, --ink in src/style.css. */
const INK = "rgb(232, 230, 238)";

// Each line is absent, not dim, until its own scroll position, and comes up before it is met'''
assert old in s; s=s.replace(old,new)
open(p,'w').write(s)

p='e2e/text.spec.ts'
s=open(p).read()
old="test('a met line brightens, takes a halo and says so to a screen reader; the same by a jump as by a scroll'"
new="test('a met line brightens from full ink, takes a halo and says so to a screen reader; the same by a jump as by a scroll'"
assert old in s; s=s.replace(old,new)
open(p,'w').write(s)
