p = 'docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()


def lum(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


ratio = (lum('bcbbc2') + 0.05) / (lum('0b0d12') + 0.05)
print('superseded contrast', ratio)
r = f'{ratio:.1f}'

reps = [
    ('`color: color-mix(in oklab, var(--ink), var(--ink-dim) calc(var(--dim) * 100%))`',
     '`color: color-mix(in oklab, var(--ink), var(--ink-superseded) calc(var(--dim) * 100%))`'),
    ('the earlier ones dim to `--ink-dim` (6.3:1 on the stage, still',
     f'the earlier ones step back to `--ink-superseded` (the ink at 80 % over the stage, {r}:1; amended\n2026-10-05: the first value, `--ink-dim` at about 67 %, read as greyed out), still'),
    ('`--ink-dim` (its own `--reveal`, `lineReveal` in `src/story/reveal.ts`), and never dims. It turns to\n`--ink` and takes C',
     'full `--ink` (its own `--reveal`, `lineReveal` in `src/story/reveal.ts`; amended 2026-10-05: it\nused to come up in `--ink-dim`, which read as greyed out), and never dims. It brightens to `--ink-lit`\nand takes C'),
    ('- Contrast: `--ink` on the stage ≥ 12:1, `--ink-dim` 6.3:1; the scrim only raises these.',
     f'- Contrast: `--ink` on the stage ≥ 12:1, `--ink-superseded` {r}:1; the scrim only raises these.'),
    ('- Ink `#e8e6ee`; superseded lines `#9f9dab`; agent halo `rgba(77,163,255,.5)`.',
     '- Ink `#e8e6ee`; a met brief line `#f8f7fc`; superseded lines `#bcbbc2`; agent halo `rgba(77,163,255,.5)`.'),
    ('If dim lines distract, set `--ink-dim` to the stage colour',
     'If dim lines distract, set `--ink-superseded` to the stage colour'),
]
for a, b in reps:
    assert a in s, a
    s = s.replace(a, b)
open(p, 'w').write(s)
