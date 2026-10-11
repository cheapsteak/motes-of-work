def patch(p, pairs):
    s = open(p).read()
    for old, new in pairs:
        assert s.count(old) == 1, (p, old[:90])
        s = s.replace(old, new)
    open(p, 'w').write(s)


D = '/home/user/motes-of-work/docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md'
patch(D, [
    ("""A beat's **hold** is the local span in which it is full ink and nothing on the page changes:
`hold_i = at_{i+1} − (at_i + FADE)` for a beat followed by another on its page, and
`hold_i = out_k − FADE − (at_i + FADE)` for the last beat on its page. In screens, `hold_i · L` must be
at least `max(0.3, words_i / 40)`. For a document beat the budget is measured to the first event that
changes it (the first brief line's lighting, read from the assembly keys): `≥ words / 40` screens
(55 words: 1.375; the storyboard gives 1.4). Rationale: 40 words per screen at a leisurely 4 s per
screen is 2.5 words per second, under the 183 wpm measured for reading aloud (research note §4).
The storyboard's timings satisfy this; the lint stops a later edit from quietly breaking it.""",
     """A beat's **dwell** is the local span from the start of its fade-in to the next change on its page:
`dwell_i = at_{i+1} − at_i` for a beat followed by another on its page, and `dwell_i = out_k − at_i`
for the last beat on its page (to the end of the page's fade-out, or to 1 on the essay's last page).
In screens, `dwell_i · L` must be at least `max(0.3, words_i / 40)`. For a document beat the dwell is
measured to the first event that changes it (the first brief line's lighting, read from the assembly
keys): `≥ words / 40` screens (55 words: 1.375; the storyboard gives 1.5, of which 1.4 at full ink).
Rationale: 40 words per screen at a leisurely 4 s per screen is 2.5 words per second, under the
183 wpm measured for reading aloud (research note §4). The storyboard's timings satisfy this; the lint
stops a later edit from quietly breaking it.

The fades count as reading time: a line is legible well before it reaches full ink. (A first draft of
this rule measured only the full-ink hold between the fades. The storyboard's timings do not meet
that: vb-3 and six of the reveal's seven beats fall short by up to 0.2 screens, and a 4-screen reveal
cannot meet it at all, since its 132 words need 3.4 screens of hold plus 1.1 screens of fades. The
timings were authored to the dwell above; if readers miss lines, the lever is the reveal's length.)"""),
    ("""- No JavaScript: `<html class="no-js">`, removed by the first inline script. Under `.no-js`: pages
  flow (`grid-area: auto`), the panel is `position: static`, every `--reveal` is 1 and `--dim` 0, the
  scrim and vignette are off. The result is a plain, readable document in order.""",
     """- No JavaScript: `<html class="no-js">`, removed by the first inline script. Under `.no-js`: pages
  flow (`grid-area: auto`), the panel is `position: static`, every `--reveal` is 1 and `--dim` 0, the
  scrim and vignette are off. The result is a plain, readable document in order. For the text to be
  there at all, the build writes the story's markup into `index.html` (a Vite `transformIndexHtml`
  plugin running the same loader and `src/story/markup.ts`); the bundle finds that markup and checks
  it is its own story rather than rendering it."""),
])

M = '/home/user/motes-of-work/docs/specs/2026-10-02-motes-of-work-design.md'
patch(M, [
    ("""Each section is one idea with a text panel of ≤ ~80 words. Copy below is the *gist*, not final text — final copy is the author's (voice and taste are high-touch).""",
     """Each section is one idea, told as a picture book: a few pages of short lines, each line coming up when it is its turn to be read. Act I's copy, storyboard and text engine are designed in `docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md` (the storyboard doc below); elsewhere the copy here is the *gist*, not final text — final copy is the author's (voice and taste are high-touch)."""),
    ("""| I.1 | The vibe build (cold open) | The **brief card** (below) sits in the text panel. One human mote (the brief) → swarm floods in → a polished bike assembles and runs; each brief line ticks once its parts have settled (the core settles first, so the seat-and-handlebars line ticks first and the frame's "sturdy" line last). All settled motes are cool (no human touched the core). No ghost. Effort counter running | Low three-quarter, drive side; wide |
| I.1b | Reveal | Its own section, because the brief fills the I.1 panel's word budget (§7). The running bike is the **wrong twin**, and its frame is shaped around the mistake: the saddle is fixed on top of a tall mast that rises from the head tube and steers, the handlebars stick out of a stub where the seat tube should be, and the top tube climbs to the front to meet the mast, so the still reads as a new frame to fix, not a part to turn. Gist: "It passes every test. Now try to ride it. Every line is met; nobody wrote down that you sit on the seat and steer with the handlebars." Still cool throughout, no ghost. The saddle visibly turns with the front wheel. | Rises to a high front three-quarter so the saddle's turn and the fork under it read (side-on is the most mistakable angle: a swapped bike reads as a normal bike facing the other way) |
| I.2 | Rewind | Scrolling runs the cloud backward to a nebula. Effort counter does **not** reset. The ghost of intent has never existed yet | Pulls back |
| I.3 | Spec (high touch) | Exploded view. Human + dialogue motes place core parts and define interfaces. The **ghost** of the intended machine appears for the first time. Text: commander's intent — purpose, end state, constraints, not the how. The brief's missing purpose (how a body sits, steers and pedals) is what built the wrong bike. The core has fully landed in the outline by four fifths of the section and holds there to the end of the scroll, the drive slowing to rest | Close on all three contact points together, slow, shallow focus |""",
     """| I.1 | The vibe build (cold open), 6 screens | You want a bike; you write down what it needs and hand the list to an agent; the blue dots are the agent's work. The **brief** (a document, on its own page) comes up, and a polished bike assembles and runs; each brief line lights in reading order once its parts have settled (seat and handlebars first, the frame's "sturdy" line last). All settled motes are cool (no human touched the core). No ghost. Copy and beats: storyboard doc §1, §2.1 | Low three-quarter, drive side; wide |
| I.1b | Reveal, 4 screens | The running bike is the **wrong twin**, and its frame is shaped around the mistake: the saddle is fixed on top of a tall mast that rises from the head tube and steers, the handlebars stick out of a stub where the seat tube should be, and the top tube climbs to the front to meet the mast, so the still reads as a new frame to fix, not a part to turn. The lines walk the reader through it: it runs; now try to ride it; the seat turns with the wheel; the bars never turn; to fix it you need a new frame; every dot is blue; every line on the list is met, and nobody wrote down that you sit on the seat and hold the bars. Still cool throughout, no ghost. The saddle visibly turns with the front wheel. Copy and beats: storyboard doc §1, §2.2 | Rises to a high front three-quarter so the saddle's turn and the fork under it read (side-on is the most mistakable angle: a swapped bike reads as a normal bike facing the other way) |
| I.2 | Rewind, 1 screen | "So you take it all apart." Scrolling runs the machine backward to a nebula. The ghost of intent has never existed yet. Storyboard doc §2.3 | Pulls back |
| I.3 | Spec: the drawing first (high touch), 6 screens | Before anything is built, the agent draws the bike as a white wireframe (the **ghost**, first appearance) from the same list, and makes the same mistake. Caught in a drawing, it costs a moment: you point it out, the agent redraws, and no frame has to be rebuilt. Then the gold (human) motes land on the seat, the handlebars and the pedals, the agent builds the rest, and Act I ends on the correct bike running. Copy and beats: storyboard doc §1, §2.4 | Storyboard doc §2.4 |"""),
    ("""**The brief (I.1).** Shown as a bulleted card; each tick is a pure function of scroll progress (§6.1), landing when the parts its line names have settled. Every line is met by the swapped bike:

> Build me a bike for getting around town.
> - Two wheels, with the pedals driving the back one through a chain.
> - A comfy seat and a set of handlebars, both adjustable so it fits people of different heights.
> - The front wheel turns so you can steer.
> - Hand brakes and a bell.
> - Sturdy, but light enough to carry up a flight of stairs.

"Both adjustable" makes the seat and handlebars read as interchangeable; "the front wheel turns so you can steer" ties steering to the wheel, not to anything a person holds. Final wording is the author's.""",
     """**The brief (I.1).** Shown as a document on its own page (wording: storyboard doc §1, its handling §3.5): an Instrument Serif ask and five hanging lines, no bullets, no box. Each line lights as a pure function of scroll progress (§6.1), when the parts it names have settled, and every line is met by the swapped bike. "Both adjustable" makes the seat and handlebars read as interchangeable; "the front wheel turns, so you can steer" ties steering to the wheel, not to anything a person holds. Final wording is the author's."""),
    ("""- **Idle shimmer** while the reader pauses is the single exception: an additive, time-based perturbation applied after sampling, never fed back into state; disabled in test mode and under reduced motion.""",
     """- **Idle shimmer** while the reader pauses is the single exception: an additive, time-based perturbation applied after sampling, never fed back into state; disabled in test mode and under reduced motion.
- The text obeys it too: every page's opacity and every line's reveal and dim are pure functions of progress, set from the scroll driver with no CSS transition (storyboard doc §3.2)."""),
    ("""  story/        NN-name.md sections (frontmatter: scroll length, timeline keys)""",
     """  story/        NN-name.md sections (front matter: id, length, alt; body: beat and page markers),
                the loader, the text engine's curves and the story markup"""),
    ("""- One idea per section; panel ≤ ~80 words.""",
     """- One idea per section, told in pages of short lines. Limits per line (≤ 26 words; a document such as the brief ≤ 60), per page (≤ 3 lines) and per section (≤ 35 words per screen), and the dwell each line must get, are in the storyboard doc §3.3."""),
    ("""- **Content lint** (a deterministic check, not a prose rule): panel word count, and a denylist of internal-identifier patterns.""",
     """- **Content lint** (a deterministic check, not a prose rule): the limits and the dwell budget above, a denylist of internal-identifier patterns, and a sync fence between the story markdown and the storyboard doc's copy and timing tables."""),
    ("""- Text fully readable without the canvas; keyboard scrolling works; canvas is `aria-hidden` with a short per-section text description.
- Mobile portrait: canvas on top with a text card below, or text over a scrim — decided by testing.""",
     """- Text fully readable without the canvas, and without JavaScript (the build writes the story into the page); keyboard scrolling works; canvas is `aria-hidden` with a short per-section text description. The text engine is opacity and a colour mix only, the same under reduced motion (storyboard doc §3.6, §3.7).
- Text sits above the machine on every screen, over a scrim at the top of the stage (storyboard doc §3.4)."""),
])

R = '/home/user/motes-of-work/README.md'
patch(R, [
    ("""npm run shots       # screenshots of every story section, and of every mechanism""",
     """npm run shots       # screenshots of every story beat, and of every mechanism"""),
])
print('ok')
