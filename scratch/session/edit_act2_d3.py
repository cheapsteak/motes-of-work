p = '/home/user/motes-of-work/docs/script/act-2.md'
s = open(p).read()


def sub(old, new):
    global s
    assert old in s, old[:60]
    s = s.replace(old, new)


sub('# Act II script: the incorrect rule (draft 2, for the author)', '# Act II script: the incorrect rule (draft 3, for the author)')
sub('Draft 2 applies the author\'s notes of 2026-10-05 (see "Changes in draft 2" at the end).*',
    'Drafts 2 and 3 apply the author\'s notes of 2026-10-05 and 2026-10-06 (see "Changes" at the end).*')

sub('''## Labels on the layers: recommendation

**No labels.** Pages 2 to 4 name the three layers in the lines, one scene each, in the order the camera
visits them; after that the shapes carry it, and later lines say "at the top", "down here".

*Alternative, in one line: three small captions ("rules", "plans", "code") that come up with pages 2–4
and fade with them, never to return.*''', '''## Labels on the layers

**No labels** (the author, 2026-10-06). Pages 2 to 4 name the three layers in the lines, one scene each,
in the order the camera visits them; after that the shapes carry it, and later lines say "at the top",
"down here".''')

sub('While you were close, the agents kept building. Whatever is built on a defect carries it too. (17)',
    'The agents kept building. Whatever is built on a defect carries it too. (13)')

sub('''Fix another. Step back again. (5)

*A quick dive to a second defective stack; it is rebuilt; a quick pull-out. Faster than before.*

More. (1)

*The highlighted tree is bigger than it was, still growing down, sideways and up.*

You cannot fix them one at a time as fast as they are made. (14)

*Hold wide. New defective stacks keep appearing while the line is up; the two fixed ones are lost among
them.*''', '''You cannot fix them one at a time as fast as they are made. (14)

*Wordless first: a quick dive to a second defective stack, it is rebuilt, a quick pull-out. Then hold
wide as the line comes up: the highlighted tree has grown, down, sideways and up, and new defective
stacks keep appearing; the two fixed ones are lost among them.*''')

sub('''They all lead to one place at the top: one incorrect rule. (12)

*The source: a large top-layer stack. Up close, one cube with a bright jagged line. Every highlighted
branch converges on it.*

It looked like many mistakes. It was one, copied. Even the reviewer was copying it. (15)

*Pull back a little: the source's streams fan out, down into the plans, across to the reviewer's ring,
and over to the second defective stack at the top.*''', '''They all lead to one place at the top: one incorrect rule. (12)

*The source: a large top-layer stack. Up close, one cube with a bright jagged line. Every highlighted
branch converges on it. Then, still under this line, the camera pulls back a little and the source's
streams fan out, down into the plans, across to the reviewer's ring, and over to the second defective
stack at the top: one mistake, copied, with no words needed.*''')

sub('''- **The fence at the source's outflow** is not in the text. Keep it as a picture or drop it. **Author to
  decide.**
- **Still to decide:** the layer-label recommendation above.''', '''- **No fence** at the source's outflow, in the text or the picture (the author, 2026-10-06).''')

sub('## Changes in draft 2 (the author\'s notes, 2026-10-05)', '## Changes\n\n### Draft 2 (the author\'s notes, 2026-10-05)')
s = s.rstrip('\n') + '''

### Draft 3 (the author's notes, 2026-10-06)

- No labels on the layers; no fence.
- Page 8: "While you were close" cut.
- Page 10 keeps only "You cannot fix them one at a time as fast as they are made."; "Fix another. Step back
  again." and "More." are cut, and the second fix plays wordlessly before the line.
- Page 12: "It looked like many mistakes. It was one, copied. Even the reviewer was copying it." is cut;
  the fan-out it described plays wordlessly under "one incorrect rule".
'''
open(p, 'w').write(s)
print('ok')
