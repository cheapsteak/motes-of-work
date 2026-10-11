# Research: text treatment for scrollytelling over a dark animated canvas

Sources read by the research agent (links); items not linked are its synthesis.

## Legible text without cards
- Directional scrim (bottom or side gradient), column at most ~50% width on desktop (Gannett scrolly topper: https://storytelling.gannettdigital.com/in-depth/toppers/scrolly-topper/). Scrims "more elegant" than overlays, need tuning (Smashing: https://shop.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/).
- Feathered pool behind the column (blur or dark fill with mask-image edges, so no edge reads as a border) — unverified idea.
- Tight dark text-shadow in the scrim colour as a last line of defence (unverified).
- Copy space: frame the camera so the dense part of the scene sits away from the text column (Smashing).
- Cut copy: a sentence or two per step (Gannett); Guardian Firestorm cut text to under a third over moving footage (https://www.journalism.co.uk/how-the-guardian-built-multimedia-interactive-firestorm/).
- Dark mode: light text reads heavier; use slightly reduced weight / GRAD -50 (https://nerdy.dev/adjust-perceived-typepace-weight-for-dark-mode-without-layout-shift); 90-95% luminance text rather than #FFF.
- Cards are a library default (Closeread, Pudding demo CSS excludes aesthetics), not evidence of the best work.

## Lists, quoted documents, specs inline
- Ciechanowski blockquote: margin-left 2.5em, padding-left 1em, italic, border-left 4px solid #eaeaea; 1em on small screens (https://ciechanow.ski/css/base.css). Inline code: flat tint, no border.
- Marginalia: Distill gutter (https://distill.pub/guide); Tufte CSS collapses sidenotes on narrow screens (https://edwardtufte.github.io/tufte-css/).
- Monospace as a "document voice" (Pudding loads Atlas Typewriter; usage unverified).
- Suggestions: hanging glyphs, hairline rules between items not around them, ticks animating in the left margin, a mono label such as "THE BRIEF" with one left rule.

## Mobile portrait with a sticky graphic
- Pudding: stay scrolly when transitions carry meaning (https://pudding.cool/process/responsive-scrollytelling/); avoid vh for step heights (address bars) — use innerHeight or svh/dvh.
- Gannett ships separate mobile framings. Ciechanowski never overlays (inline figures, 1.2rem padding at <=450px).
- Recommendation (synthesis): full-screen canvas with the camera framed into the upper ~55%; text steps pass over it, anchored low with a bottom scrim, one or two sentences per step.

## Type
- Ciechanowski: IBM Plex Sans 1.2em/1.6, 44rem measure, Inter headings.
- Google Fonts verified available: Newsreader, Source Serif 4, Literata, Spectral, Instrument Serif, IBM Plex Sans/Mono, JetBrains Mono, Inter, Geist, Geist Mono, Space Grotesk.
- Suggested pairing: Newsreader or Source Serif 4 ~20px/1.55 body; Geist Mono or IBM Plex Mono for the brief and labels; Inter/Geist for UI; ~1.25 scale; measure 34-40rem.

## Rules
Do: anchor text to a side or the bottom with a feathered scrim; reframe the camera away from text; near-white text at slightly reduced weight with a tight dark shadow; render the checklist as typography (mono labels, hairlines, one left rule at most, margin ticks); short steps, measure 34-40rem, svh/dvh or innerHeight.
Avoid: boxed or bordered cards, above all nested; pure white heavy text; vh triggers on phones; non-collapsing gutters on mobile; long paragraphs over moving imagery.
