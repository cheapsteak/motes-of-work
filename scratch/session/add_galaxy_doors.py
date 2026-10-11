"""Add a 'galaxy preview' section to the publish wrapper: links into essay.html with #-params."""
import json
import re
from pathlib import Path
from urllib.parse import quote

S = Path(__file__).resolve().parent
P = S / 'pub' / 'motes-of-work.html'
html = P.read_text()

def grown(**extra):
    return quote(json.dumps({'net': {'show': 1, 'growth': 1, **extra}}, separators=(',', ':')))

def shot(name, state=None, ambient=None):
    q = f'#mech=bike&auto=0&galaxy=1&shot={name}&state={state or grown()}'
    if ambient is not None:
        q += f'&ambient={ambient}'
    return 'essay.html' + q

POSE = 9.493782472098248
VIEWS = [
    ('Galaxy wide', 'The whole galaxy, star-only at this distance, turning slowly.', shot('galaxyWide')),
    ('The neighbourhood', 'The stars round the core, with their planets as dots. The core and the plans light up.', shot('hood', grown(highlight=0.3))),
    ('One system', 'One plan’s star system whole: planets on their orbits, moons on theirs.', shot('system')),
    ('The twelve, lit', 'The lineage lamp on the rule: three stars and nine planets light in ember.', shot('twelve', grown(growth=0.35, highlight=0.25, fix=0.1, lamp=5, lampAt=13))),
    ('Close on the defect', 'The hero planet and its moons, live. Every few seconds the whole piece derps: a stutter, a skip, a burst, a scatter.', shot('close')),
    ('The freeze moment', 'Held at the moment the freeze frame will stop on: a moon mid-burst with its ghost. The comic styling comes later.', shot('close', None, POSE)),
    ('Healed', 'The same planet once the fix lands: round, steady, amber moons.', shot('close', grown(fix=0.1))),
    ('Streams on', 'A system with its lineage streams shown, as on the lineage beats.', shot('system', grown(streams=1))),
]

cards = '\n'.join(
    f'''    <a class="door" href="{href.replace('&', '&amp;')}">
      <h2>{t}</h2>
      <p>{d}</p>
      <span class="go">Open &rarr;</span>
    </a>''' for t, d, href in VIEWS)

section = f'''  <section id="galaxy">
    <h2>Act II as a galaxy (in progress)</h2>
    <p class="lede" style="font-size:16px">The rebuild of Act II, partway through: the galaxy draws, moves on its own clock, lights and derps, but the essay does not use it yet. These open single shots of it, live. Scroll does nothing in them; reload to restart.</p>
    <div class="doors">
{cards}
    </div>
  </section>

'''

html = re.sub(r'  <section id="galaxy">.*?</section>\n\n', '', html, flags=re.S)
anchor = '  <section>\n    <h2>What to look for</h2>'
assert html.count(anchor) == 1
html = html.replace(anchor, section + anchor)
P.write_text(html)
print('ok', len(VIEWS))
