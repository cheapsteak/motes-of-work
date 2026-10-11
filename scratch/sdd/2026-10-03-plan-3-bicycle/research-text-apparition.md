# Research: how well-made scroll pages make text appear

Written 2026-10-04 for the Act I storyboard and text engine
(docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md). Tiers: T1 codebase / direct testing,
T2 official docs or peer-reviewed, T3 blogs and talks, T4 unverified. Items with no link are my own
synthesis from the sources around them. Re-verify every link before anything is published.

## 1. Scrubbed or triggered?

- **Apple product pages are scrubbed, not triggered.** A line-by-line reconstruction of the AirPods
  Pro page finds every text value computed from `scrollY`: `textOpacity = max(0, 1 − scrollY /
  (windowHeight / 2))`, `textTranslateY = min(scrollY / 2, 100)`. The old block fades and slides
  out, the next fades and slides in. Nothing is time-based once the page has loaded.
  https://dev.to/easyoon_ec43e8d635f9a3fbb/translations-analyzing-apple-website-animation-1scrolling-synchronization-3m65 — T3
  (a translation of a Korean teardown; numbers quoted from it).
- **GSAP ScrollTrigger's `scrub`** "links the progress of the animation directly to the scrollbar so
  it acts like a scrubber"; `scrub: 1` adds a one-second catch-up, i.e. a *time-smoothed* scrub whose
  frame is no longer a function of scroll alone. `toggleActions` is the triggered alternative
  (`play none none none` by default: a time-based tween fires once on entry).
  https://gsap.com/docs/v3/Plugins/ScrollTrigger/ — T2.
- **Journalism scrollytelling is almost all triggered**: Scrollama fires step callbacks from an
  IntersectionObserver, and the graphic transitions on its own clock. Pudding recommends `position:
  sticky` for the graphic and JavaScript only for the step triggers.
  https://pudding.cool/process/introducing-scrollama/ and
  https://pudding.cool/process/scrollytelling-sticky/ — T3. A survey of 50 pieces names the five
  shapes: graphic sequence, animated transition, pan-and-zoom, "moviescroller" (frame-by-frame, i.e.
  scrubbed), show-and-play. https://data.europa.eu/apps/data-visualisation-guide/scrollytelling-graphic-sequence — T3.
- **What this means for us.** Our purity invariant (frame = f(scroll)) is the "moviescroller" shape
  and matches Apple, not Scrollama. Scrubbed text is the honest choice: a reader who stops sees a
  frame that is exactly what they would see arriving there any other way, and the rewind works for
  text as well as motes. The thing triggered pages get for free, a *minimum* on-screen time per step
  regardless of scroll speed, we must buy with scroll distance instead (section 4).

## 2. The apparition techniques themselves

| Technique | Where it is used well | Notes for a dark canvas with a point cloud behind |
|---|---|---|
| Opacity + small translate (8–100 px) | Apple (above); the default of nearly every landing page | The translate is what reads as "motion"; opacity alone does not (WCAG, section 6). We drop the translate: the text must not move against a moving cloud (section 5). |
| Line-by-line mask (clip) reveal | GSAP SplitText `type: "lines", mask: "lines"` with `yPercent: 100`; editorial headlines | Needs `overflow: hidden` wrappers per line and a re-split on font load or resize. Strong for a headline, fussy for a paragraph, and it is a transform, so it is the first thing to remove under reduced motion. Rejected for body copy. https://gsap.com/community/forums/topic/33807-splittext-with-gsap-for-pararaph/ — T3. |
| Word stagger (fade or blur per word, cascading) | "Linear-style" hero copy; many Framer components ("Blur Reveal", "Unblur text reveal") | Scrubbed word-by-word reveal exists ("scroll-scrubbed word reveal": words come up as progress advances). It reads as *typing*, i.e. the page is talking, which fights a picture-book voice where a page is simply there to be read. Rejected except possibly for the ask line. https://www.framer.com/marketplace/components/unblur-text-reveal — T3/T4 (marketplace copy). |
| Blur-to-sharp | Same components | WCAG's erratum now counts blurring as motion (section 6). Rejected. |
| Dim → bright (colour, not opacity) | Scrollama's `.step.is-active` convention; our own brief lines (style C) | The one technique that keeps the *previous* line on screen for a reader who stops. The eye goes to the brightest line. We use it for superseded beats within a page. T1 (our mockups c-*.png). |
| Replace in place (old out, new in, same anchor) | Apple; Gannett scrolly topper | Each still shows one caption. Cleanest, but a reader who stops mid-fade sees two half-captions, and context of the previous line is lost. We use replacement between *pages*, not between lines. |

Ciechanowski's essays, including "Bicycle" (2023), do none of the above: text and figures are static and
inline, the figures animate on sliders, and ideas are colour-coded between the prose and the figure.
https://unsung.aresluna.org/three-good-interactive-explainers/ and
https://flowingdata.com/2023/04/04/physics-of-a-bicycle-visually-explained/ — T3. The transferable
lesson is the colour coding: a word in the text and the thing on the canvas share a hue (our warm /
cool / violet legend), and the legend is taught before it is used.

## 3. How text and the visual beat are synchronised

- Apple: one text block per pinned scene; the block's fade window is the first half-screen of the
  scene and the scene's own animation (video scale) runs over two screens, so the words are fully
  readable *before* the thing they describe finishes happening (section 1 source, T3).
- Graphic-sequence journalism: "text blocks move over a fixed visual element in the background, which
  is replaced with a new graphic with each new text block" — one step, one state; the state changes
  when the step's top crosses a trigger line (by default 50 % of the viewport in Scrollama).
  https://data.europa.eu/apps/data-visualisation-guide/scrollytelling-graphic-sequence — T3.
- The Guardian's "Firestorm" cut its text to under a third of the first draft because long passages
  over moving footage were not read; a sentence or two per step. (From the earlier note
  research-text-treatment.md: https://www.journalism.co.uk/how-the-guardian-built-multimedia-interactive-firestorm/ — T3.)
- Pudding on mobile: keep the scrolly form only "if the transitions are truly meaningful", keep steps
  few ("a few steps to grab the user and make your point and then you're out"), size steps from
  `window.innerHeight` rather than `vh` because mobile toolbars change the viewport height mid-scroll.
  https://pudding.cool/process/responsive-scrollytelling/ — T3.
- **Rule we take:** a caption appears at the start of its beat and is fully readable before the
  motion that makes it true peaks; the motion holds (or repeats periodically) until the caption
  leaves, so a reader who stops anywhere in the beat sees the words and the thing agreeing.

## 4. Dwell time and reading-speed budgets

- Meta-analysis of 190 studies (18,573 adults): silent reading of English non-fiction averages **238
  wpm**, fiction 260 wpm; most adults fall in 175–300 wpm for non-fiction; reading **aloud** averages
  **183 wpm**. Brysbaert, "How many words do we read per minute?", *Journal of Memory and Language*
  109 (2019). https://www.gwern.net/doc/psychology/linguistics/2019-brysbaert.pdf — T2.
- A picture book read to a child is read aloud, with pauses to look: assume **150 wpm = 2.5 words per
  second** as the pace to budget for (T4: my choice, below the measured 183 wpm aloud).
- Nobody publishes a reliable "screens per second" for a reader of a scrolly page; it depends on the
  device and on whether anything is happening. Apple gives a text block roughly half a viewport of
  fade and a further one to two viewports of scene (section 1), i.e. a 15-word block gets about two
  screens. Scrollama's default step is one viewport tall with a 40–80-word paragraph. (T3, both.)
- **Budget we take:** a beat *holds* (fully readable, nothing else changing in the text) for at least
  `words / 40` viewport heights and never less than 0.3 of one, plus a 0.1-viewport fade in. Twenty
  words hold for half a screen. At a leisurely 1 screen per 4 s this is 2.5 words per second,
  the read-aloud pace; a reader who scrolls faster is choosing to, and can stop. The brief
  (a 50-word document) holds for at least 1.3 screens before any of its lines lights.

## 5. Text over a moving background

- Text superimposed on a moving background: discomfort is rated higher when the background moves
  against the reading direction; neither reading time nor the number of saccades changed.
  Hogrefe, "Visual Information Processing in Augmented Reality: Some Aspects of Background Motion",
  https://econtent.hogrefe.com/doi/10.1024/1421-0185.63.3.183 — T2 (abstract only read).
- Scrolling text over moving gratings reads worse when the grating moves the opposite way.
  https://researchmap.jp/kenkihara/published_papers/13108836 — T2/T4 (listing only).
- From the earlier treatment research: a feathered scrim or a layered text shadow, a column at most
  half the width, and *copy space* framed by the camera (keep the dense part of the scene away from
  the text) — https://shop.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/ — T3.
- **Rule we take:** the text never translates; only the motes move, and the camera keeps the machine
  out of the text band (a tested clearance), with a soft top scrim and C's text shadow for the loose
  motes that cross it.

## 6. Accessibility

- WCAG 2.2 SC 2.3.3 *Animation from Interactions* (AAA): motion animation triggered by interaction can
  be disabled unless essential. "Motion animation" means steps that create the illusion of movement;
  changes of colour or opacity that do not alter perceived size, shape or position are not motion
  (an erratum removed *blurring* from that exclusion). "Moving new content into the viewport is
  essential for scrolling." https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html — T2.
- MDN on `prefers-reduced-motion`: remove scaling, panning and parallax; an opacity "dissolve" is the
  recommended replacement. Widely available since January 2020.
  https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion — T2.
- CSS WG / TAG thread on scroll-linked animations and reduced motion: motion the reader controls by
  scrolling "is much less troublesome than motion that happens on its own"; forcing reduction at the
  browser level "made content invisible", so the story for scroll-linked animation is the media
  query, applied by the author. https://lists.w3.org/Archives/Public/public-css-archive/2022Jun/0886.html — T2 (a WG member's position, not a resolution).
- Screen readers: opacity 0 does not remove an element from the accessibility tree, so a scrubbed
  fade keeps the whole story readable in order; `visibility: hidden` or `display: none` would not.
  (MDN on `opacity` and the accessibility tree — T2, well known; not fetched this session, T4 until
  re-verified.)
- **Rules we take:** fades only, no transforms, no blur; identical under reduced motion (nothing to
  remove); all beats in the DOM in reading order; the canvas stays `aria-hidden` with the section alt.

## 7. Native scroll-driven animations (`animation-timeline: scroll()` / `view()`)

Chrome 115+ and Safari 26+ ship them; Firefox 152 still has them behind a flag in stable.
https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026 — T3. A pure CSS
engine would be elegant but cannot read our section spans, cannot share the sampler with the
brief's lighting, and would not run in Firefox stable. The JavaScript scroll driver we already have
is the right place; it sets numbers, CSS draws them.

## 8. Picture-book precedents on the web

Little of quality exists as public case studies. The pattern in interactive children's books
(a repository thesis on a web e-picture-book, 16 full-screen illustrations with one short text each;
SBS "The Boat") is one illustration, one or two sentences, page by page.
https://repozitorij.uni-lj.si/IzpisGradiva.php?id=101535 and
https://www.designrush.com/best-designs/websites/the-boat-sbs — T3/T4. We borrow the *page*: a
section is a few pages, each page a few short lines over one picture, read top to bottom.

## 9. Summary of what the engine takes from this

1. Scrubbed, never triggered (Apple, the purity invariant).
2. Opacity only. No translate, no mask, no blur (WCAG 2.3.3; the cloud behind the text moves enough).
3. Pages, not a ticker: a page's lines appear one at a time in reading order and the newest is the
   brightest; superseded lines dim, not vanish (Scrollama's active-step convention; still frames).
4. Page replaces page with a clean handover at opacity 0; never two pages visible (Apple).
5. The caption is readable before its motion peaks and the motion holds while the caption is up.
6. Dwell is bought with scroll distance: `words / 40` screens, minimum 0.3 (Brysbaert for the pace).
7. Short: one idea, at most ~24 words per line, at most three lines on a page (Firestorm, Pudding).
8. The camera keeps the machine out of the text band; a soft top scrim and the C text shadow do the rest.
