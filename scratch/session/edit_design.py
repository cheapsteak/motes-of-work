p = '/home/user/motes-of-work/docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
s = open(p).read()
old_copy = s[s.index('### Section 3: rewind (2 screens)'):s.index('### Section 4: spec')]
new_copy = '''### Section 3: rewind (1 screen)

| Beat | Text |
|---|---|
| rw-1 | So you take it all apart. (6) |

The author cut the rewind's commentary as long-winded and not essential (2026-10-04): the picture of
the bike coming apart carries it, and sp-1 ("Start again.") picks up at once.

'''
s = s.replace(old_copy, new_copy)
old_sb = s[s.index('### 2.3 rewind (L = 2, fade 0.05)'):s.index('### 2.4 spec')]
new_sb = '''### 2.3 rewind (L = 1, fade 0.1)

| Beat | Page | Appears → leaves | Camera | Motion |
|---|---|---|---|---|
| rw-1 | 1 | 0.00 → fade-out ends 1.00 | S5 → S8 over 0–1. S8: target whole, bearing 0, elev 0, d 6.5, fov 40, frame 0 (the existing pull-back to the nebula). | Existing keys compressed into one screen: drive 3.0 → 0 over the section; assembly 1 → 0 over 0–0.8 (inOutQuad); variant 1 → 0 by 0.9; vibed 1 → 0 over 0.9–1. The machine runs backward and comes apart. |

'''
s = s.replace(old_sb, new_sb)
s = s.replace('Section lengths: vibe-build 3 → 6, reveal 2 → 4, rewind 2, spec 3 → 4 (16 screens).',
              'Section lengths: vibe-build 3 → 6, reveal 2 → 4, rewind 2 → 1, spec 3 → 4 (15 screens).')
oq = s[s.index('## 6. Open questions'):]
s = s.replace(oq, '''## 6. Settled questions (2026-10-04)

1. Colour word: "orange" (a child's word; the dense amber reads gold-white, but orange names the hue).
2. Length: 15 screens after the rewind cut; the dwell constant stays the lever.
3. The brief leaves whole before vb-4, as specified: carrying it over dimmed would push the portrait
   text band past 42 % of the height, and vb-4 reads fine against the finished bike just after the list.
''')
open(p, 'w').write(s)
