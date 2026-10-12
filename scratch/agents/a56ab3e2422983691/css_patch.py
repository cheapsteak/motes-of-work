p = 'src/style.css'
s = open(p).read()


def rep(old, new):
    global s
    assert s.count(old) == 1, old[:70]
    s = s.replace(old, new)


rep("""  --gutter: clamp(1rem, 5vw, 4rem);
}
""", """  --gutter: clamp(1rem, 5vw, 4rem);
  /* Where the text sits: a band at the top of the screen, the machine framed below it. */
  --text-top: 7vh;
}
""")

rep("""/* The containing block for the footer, which sits inside the story's trailing spacer. */
/*
 * Literata for the text. Legibility over the motes comes from a layered shadow in the stage colour
 * (a tight one, the last line of defence where text crosses bright motes, and two wide ones) and
 * the camera's copy space: no pool and no scrim on a wide screen (portrait keeps its scrim).
 */
body {""", """/*
 * Literata for the text. Legibility over the motes comes from a layered shadow in the stage colour
 * (a tight one, the last line of defence where text crosses bright motes, and two wide ones), a
 * scrim that darkens the top of the stage under the text band, and the camera keeping the machine
 * below that band. `body` is also the containing block for the footer, which sits inside the
 * story's trailing spacer.
 */
body {""")

rep("""  background: radial-gradient(ellipse at 60% 50%, transparent 55%, rgba(0, 0, 0, 0.45) 100%);
}

#story {
  position: relative;
  z-index: 1;
}

.section {
  position: relative;
  height: calc(var(--length, 1) * 100vh);
  padding-top: 50vh;
  box-sizing: border-box;
}

/* Starts and ends half a viewport below its section; see src/story/dom.ts for why. */
.track {
  height: calc(var(--length, 1) * 100vh);
  padding: 0 var(--gutter);
  box-sizing: border-box;
}
""", """  background: radial-gradient(ellipse at 50% 62%, transparent 55%, rgba(0, 0, 0, 0.45) 100%);
}

#story {
  position: relative;
  z-index: 1;
}

/* The scrim: above the canvas and the vignette, under the text (it paints first in #story). */
#story::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(11, 13, 18, 0.72) 0, rgba(11, 13, 18, 0.45) 22svh, transparent 42svh);
}

/*
 * A section is `length` screens tall (vh, because progress is measured against innerHeight), so its
 * top meets the top of the viewport exactly when its span starts. Its track runs from that top to
 * `--text-top + --panel-h` past its end (`--panel-h` measured by src/story/dom.ts): the panel sticks
 * at the anchor from 0.07 screens before the section, at opacity 0, until exactly the section's end,
 * when its last page has faded out, and only then is pushed up. The overflow lies over the next
 * section, or the trailing spacer, and never changes the scroll range.
 */
.section {
  position: relative;
  height: calc(var(--length, 1) * 100vh);
}

.track {
  height: calc(var(--length, 1) * 100vh + var(--text-top) + var(--panel-h, 50vh));
  padding: 0 var(--gutter);
  box-sizing: border-box;
}
""")

rep("""/*
 * A story panel is type on the stage, not a card: no border, no fill and nothing drawn behind it.
 * Its opacity is set from scroll progress (src/story/reveal.ts), never transitioned.
 */
.panel {
  position: sticky;
  top: max(0px, calc(50vh - var(--half-h, 25vh)));
  box-sizing: border-box;
  width: min(30rem, calc(100vw - 2 * var(--gutter)));
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}

.panel > :first-child {
  margin-top: 0;
}

.panel > :last-child {
  margin-bottom: 0;
}

.panel p {
  margin: 0 0 0.85em;
}
""", """/*
 * A story panel is type on the stage, not a card: no border, no fill and nothing drawn behind it. A
 * centred column, its text left-aligned. Its pages share one grid cell, so they overlay at one
 * anchor and the panel is as tall as its tallest page; each beat is in its final place from the
 * start, so a line coming up never moves another.
 *
 * A page's opacity and a beat's `--reveal` and `--dim` are set from scroll progress
 * (src/story/reveal.ts), never transitioned: a beat comes up by opacity, and dims from ink to dim
 * ink once the next line on its page is up.
 */
.panel {
  position: sticky;
  top: var(--text-top);
  display: grid;
  box-sizing: border-box;
  width: min(36rem, 100%);
  margin: 0 auto;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: none;
}

.page {
  grid-area: 1 / 1;
}

.beat {
  opacity: var(--reveal, 0);
  color: color-mix(in oklab, var(--ink), var(--ink-dim) calc(var(--dim, 0) * 100%));
}

.beat > :first-child {
  margin-top: 0;
}

.page > .beat:last-child > :last-child {
  margin-bottom: 0;
}

.panel p {
  margin: 0 0 0.85em;
}
""")

rep("""/*
 * Portrait (the camera reframes at the same aspect, src/scene/cameraRig.ts): the machine takes the
 * upper part of the screen and the text sits under it, its bottom edge 20px above the screen's,
 * over a fixed scrim that darkens the lower part of the stage. The track starts where the panel
 * sticks and runs one panel height past its span, so a panel holds its place for the whole span
 * and leaves only once faded out (src/story/dom.ts). svh, not vh, so a phone's toolbars never
 * push the text off the bottom.
 */
@media (orientation: portrait) {
  body {
    font-size: 1.0625rem;
  }

  body::after {
    background: radial-gradient(ellipse at 50% 38%, transparent 55%, rgba(0, 0, 0, 0.45) 100%);
  }

  /* Above the canvas and the vignette, under the panels (it paints first in #story). */
  #story::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(
      to top,
      rgba(11, 13, 18, 0.95) 0,
      rgba(11, 13, 18, 0.88) 38svh,
      rgba(11, 13, 18, 0) 62svh
    );
  }

  .section {
    padding-top: calc(100svh - 2 * var(--half-h, 25svh) - 20px);
  }

  .track {
    /* vh on purpose, the one exception: it matches the section heights, which are vh because the
       scroll range (and so progress) is measured against window.innerHeight. */
    height: calc(var(--length, 1) * 100vh + 2 * var(--half-h, 25svh));
    padding: 0 16px;
  }

  .panel {
    top: calc(100svh - 2 * var(--half-h, 25svh) - 20px);
    width: auto;
  }

  /* A little tighter than on a wide screen: the longest panel sits low enough to clear the machine. */
  .panel .brief-ask {""", """/*
 * Portrait: the text takes the full width at the top, 16px from the sides, below the safe area. svh
 * for the anchor, so a phone's toolbars never move the text.
 */
@media (orientation: portrait) {
  :root {
    --text-top: calc(env(safe-area-inset-top, 0px) + 6svh);
  }

  body {
    font-size: 1.0625rem;
  }

  body::after {
    background: radial-gradient(ellipse at 50% 64%, transparent 55%, rgba(0, 0, 0, 0.45) 100%);
  }

  .track {
    padding: 0 16px;
  }

  /* A little tighter than on a wide screen, so the brief's page stays in the text band. */
  .panel .brief-ask {""")

rep("""/* Context lost or no WebGL: the story reads on its own. */
.no-webgl #stage,
.no-webgl::after {
  display: none;
}
""", """/* Context lost or no WebGL: the story reads on its own. */
.no-webgl #stage,
.no-webgl::after {
  display: none;
}

/*
 * No JavaScript (index.html's first script removes `no-js`): nothing drives the scroll, so the
 * story is a plain document. Every page flows in order, nothing sticks, every line is up at full
 * ink, and the canvas, the scrim and the vignette are off.
 */
.no-js #stage,
.no-js #story::before,
.no-js body::after,
.no-js .story-end {
  display: none;
}

.no-js .section,
.no-js .track {
  height: auto;
}

.no-js .section {
  padding: 2rem 0;
}

.no-js .panel {
  position: static;
  display: block;
}

.no-js .page {
  grid-area: auto;
}

.no-js .page + .page {
  margin-top: 0.85em;
}

.no-js .beat {
  --reveal: 1;
  --dim: 0;
}
""")
open(p, 'w').write(s)
print('ok')
