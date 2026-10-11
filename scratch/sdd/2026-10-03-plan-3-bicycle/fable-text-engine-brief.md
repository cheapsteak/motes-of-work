# Design brief: the text engine, the storyboard and the copy (Act I)

You are the art director and writer for "Motes of Work", a public, non-commercial, scroll-driven essay built on
a three.js point cloud. Repo: /home/user/motes-of-work (read-only for you, except the output files named below).
Do not edit source code; you design, an implementer builds from your document.

## The author's feedback, verbatim (this is your brief)
1. "C looks the closest, but the text shouldn't appear until it's their turn to be read. Have a fable agent think
   through the cadence of text appearing, and design a text engine for an opus agent to build. Have it do research
   on text apparition techniques that fancy websites use. Fade in is fine."
2. "Text should show up above the figure, not below."
3. "Delete the metadata looking things that don't add much for the reader e.g. '01 — The brief'."
4. "The text itself needs some work too. It's got some directional problems still. 'Nothing in it is warm' what
   does that mean? Let's treat this as something like a picture book for software developers introducing their
   kids to the concept."
5. "Can we also better align the relationship between the text and both the camera angle and the motion. E.g. when
   we talk about the front wheel being able to turn, let's zoom in to the front wheel and show it turning then. See
   if we can try to apply this to all the text."
6. "Remove the mannequin, I don't feel like it's adding anything besides distraction." (Being removed in parallel by
   an implementer; design without it.)

## What exists (read these)
- The design spec: docs/specs/2026-10-02-motes-of-work-design.md (thesis §2, narrative §4 Act I, visual language §5
  incl. §5.8 the bicycle, purity invariant §6.1, SceneState §6.2, content rules §7, accessibility §8).
- The story today: src/story/01-vibe-build.md, 02-reveal.md, 03-rewind.md, 04-spec.md (front matter: id, length in
  screens, alt, draft); src/story/brief.ts (the brief lines light as their parts settle), loader.ts, dom.ts, reveal.ts.
- Motion and camera: src/timeline/keyframes.json (tracks keyed as "<section>@<0..1>"), sceneState.ts, sampler,
  src/scene/cameraRig.ts (machine-relative camera: world = anchor centre + value x anchor radius; coreFocus lerps
  the anchor from whole machine to core; portrait reframing), src/scene/mote/partTransforms.ts.
- The bike: src/mechanisms/bike/ (parts: saddle, handlebars, pedal-left/right = core; front-wheel, rear-wheel,
  cranks, chain-00..23, fork, brake-front/rear, frame, mudguard-front/rear, ground = body; loose-bolts = drift;
  pose(drive, faults, variant); faults: slip, misalign, jitter, stall, drift; wrong twin = variant 1: saddle on
  top of the steering column over a front basket, handlebars on a seat-tube stub over a rear rack, frame shaped
  around the swap). The compare page src/compare/ shows every state.
- Text style C ("Ink", chosen as closest): Literata body, Instrument Serif italic accents, a met brief line simply
  brightens. Its CSS: src/text-options.css ([data-text="c"]) plus src/style.css. Earlier mockup and frames in
  .superpowers/sdd/2026-10-03-plan-3-bicycle/ (c.html, c-*.png; research-text-treatment.md).
- Current frames: shots/task9/*.png, shots/task8/*.png (look at them).

## Hard constraints
- Purity invariant: every frame is a pure function of scroll progress (jump to any scroll position = same pixels as
  scrolling there). Text apparition must be scroll-scrubbed (opacity etc. derived from progress), not a time-based
  CSS transition triggered by crossing a threshold — unless you make a strong case, in which case say exactly what
  breaks and how tests would change. Honour prefers-reduced-motion.
- Publication-safe copy: no company names, internal paths, issue numbers or people's names.
- Mobile portrait must work (390x844 is the test size); desktop 1440x900.
- The mote shader (mote.glsl / mote.ts) cannot change. Colours come from mote roles (warm core = human-specified,
  cool body = agent-filled, dialogue violet); the ghost is a faint white outline of the intended machine.
- Everything must still read when a reader stops scrolling (still frames matter; readers scroll slowly and stop).

## What to produce
1. Research (web search; cite links with tiers T1-T4): how well-made scrollytelling and "fancy" sites make text
   appear — e.g. Apple product pages, NYT/Guardian/Pudding/Reuters graphics, Bartosz Ciechanowski, Stripe, Linear,
   GSAP ScrollTrigger demos, Lusion/Active Theory-style sites, picture-book-like web stories. Techniques: line-by-line
   or sentence-by-sentence reveal, word stagger, mask/clip reveals, blur-to-sharp, opacity+translate, scrubbed vs
   triggered, dwell time, reading-speed budgets, how text and the visual beat are synchronised, how they keep the
   old line visible or fade it, and accessibility (screen readers, reduced motion). Save to
   .superpowers/sdd/2026-10-03-plan-3-bicycle/research-text-apparition.md.
2. The design document: docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md (you may write this file). It must
   contain:
   a. The copy, rewritten as a picture book for software developers reading to their kids: short sentences, concrete
      images, one idea per beat, no jargon a child would trip on, but still landing the essay's thesis for the adult
      (a brief that looks complete but never says how a body uses the thing; the agent builds exactly what was asked;
      the expensive part is the part a person must specify; the warm motes are where a person's attention went).
      Fix the "directional problems": every line must say something true of what is on screen at that moment, and
      every claim must match the bike (e.g. the brief promises an adjustable seat; the twin's seat is fixed atop the
      steering column; "Every line is met" must stay literally true). Replace "Nothing in it is warm" with something
      a child understands (the colour legend has to be taught before it is used, or not used).
      Keep the brief (the bulleted list the agent was handed) as a document-within-the-story; it can be reworded
      but must still look reasonable and complete, and its lines light in reading order as their parts land
      (current part mapping in 01-vibe-build.md; settle windows in bike/index.ts).
   b. The storyboard: a table of beats across the four sections (vibe-build, reveal, rewind, spec; change section
      lengths if needed). For each beat: the exact text; where it sits on screen (desktop and portrait — the author
      wants text ABOVE the machine, i.e. the machine framed low with text over it on portrait; decide desktop too);
      when it appears and leaves (in section progress); the camera shot (target part or anchor, distance, angle,
      fov, in the machine-relative terms cameraRig uses, or a new "look at part X" primitive if needed); and the
      motion (drive, steering, assembly, variant, ghost, faults) that makes the line true while it is on screen.
      Example the author gave: when the text says the front wheel turns, zoom to the front wheel and show it turning.
      Apply this to every beat. Keep it achievable with the existing pose() parameters plus at most one or two new
      SceneState scalars (e.g. an explicit steering override if the drive-coupled steer cannot show "it turns");
      name them.
   c. The text engine spec for an implementer (Opus): the data model for beats (e.g. markdown with beat markers, or
      front matter, or a beats.json), how each beat's opacity/offset is derived from scroll progress (curves and
      numbers), how many lines may be visible at once, where old lines go, the dwell budget (words-per-second at a
      relaxed reading pace converted to scroll distance), layout per breakpoint, the brief's special handling,
      accessibility (all text in the DOM in order for screen readers; reduced motion = no transforms, quick fades),
      no-JS / no-WebGL fallback, and the tests that pin it (pure-of-scroll, ordering, never two beats overlapping
      unreadably, beat text matches the storyboard, text never overlaps the machine at test sizes).
   d. Type: style C as the base, adjusted as you see fit now that text sits above the machine; no labels like
      "01 — The brief"; no borders, cards or boxes (an e2e check enforces this).
   e. A short list of decisions you made and what each costs if wrong.
3. If it helps you decide, make one or two static mock frames (HTML in the scratchpad
   <scratchpad>/storyboard/ rendered with
   Chromium at 1440x900 and 390x844; screenshots of the running essay are available via `npx vite` + `?test=1&p=<0..1>`,
   fresh page per URL; never run `playwright install`). Optional.

Return only: the two file paths, a 10-line summary of the cadence and the engine, and the open questions you
could not settle (at most three).
