from pathlib import Path

p = Path(__file__).parent / 'pub' / 'motes-of-work.html'
s = p.read_text()
reps = [
    ('Work in progress &middot; Act I draft', 'Work in progress &middot; Acts I and II draft'),
    (
        'Act I builds a bike from a list that looks complete, gets it confidently, unrideably wrong, then starts again with a drawing first.</p>',
        'Act I builds a bike from a list that looks complete, gets it confidently, unrideably wrong, then starts again with a drawing first. Act II zooms out to the rules, plans and code agents build all day, and follows one incorrect rule as its defect spreads.</p>',
    ),
    (
        '<p>Act I, about 19 screens: the list and the build, the reveal, taking it apart, and starting again.',
        '<p>About 49 screens: Act I (about 19) builds the bike; Act II (about 30, a first full cut, before trimming) is the network.',
    ),
    (
        '      <li>On the bench,',
        '      <li><strong>Zooming out.</strong> The bike loosens into a small stack of cubes, and the network grows round it: rules at the top, plans in the middle, code at the bottom.</li>\n'
        '      <li><strong>One incorrect rule.</strong> Up close, one piece of code has a defect; step back and twelve more carry it. A reviewer checks every new piece and passes them all. Follow the defects back up to the rule, fix it, then trace and fix what it made.</li>\n'
        '      <li>On the bench,',
    ),
]
for a, b in reps:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
p.write_text(s)
print('ok')
