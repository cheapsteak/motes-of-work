# Freeze-frame reference board: Motes of Work, Act II

Brief: the focus on the glitching moon becomes a held, comic-book-styled freeze frame, "in the vein of" two inspirations, never a copy.

All images are in `<scratchpad>/freeze-refs/img/<nn-slug>/ref.<ext>` (20 images, one per directory, each under 1 MB, each verified with `identify` and looked at). Stills and press frames are copyrighted by their owners. They are for private art-direction reference only. Do not ship them or trace them.

Source tiers: T1 = direct (the image itself, or codebase). T2 = official docs. T3 = trade press, blogs, talks. T4 = unverified.

## Honest gaps

- **No official Borderlands introduction-card still could be obtained.** The Fandom wiki and TV Tropes returned 403 through the proxy, and web search surfaced no hosted still of the actual card. What is on the board for Borderlands is (a) the ink-outlined look (images 17, 18) and (b) one fan-made imitation of the card layout (image 19), which is crude and only useful for layout (slanted slab, big name, tagline, character in profile).
- The card's behaviour (freeze, name slam, tilt) is described below from search-result summaries and general knowledge (T3/T4), not from a frame I could look at. Treat the "slam in" timing as unverified.
- Borderlands is not strictly cel-shaded. Gearbox's own account (T3, via Destructoid and DSOGaming search results) is hand-drawn textures plus software-generated ink outlines on ordinary lighting. This is good news: an outline plus hand-drawn hatching is exactly what particles can do.
- No particle-based or generative work that does a comic freeze frame turned up in search. Closest adjacent items are the shader write-ups (images 13, 14, 15, 16).
- Several Spider-Verse technique pages (the garagefarm Blender write-up) serve blurred placeholder images. Only the annotated frame (image 04) was usable from that page.

## The images

### Spider-Verse: sense lines, glitch, panels, print

**01 `img/01-sense-lines-wavy/ref.jpg`** (1024x429)
- Shows: a wide-eyed Spider-Man with short wavy squiggle marks arranged in a loose ring around the head on a dark, dotted night city. Light halftone and a slight colour split in the windows.
- Technique: "tingle" marks around the head. Short, separate marks (not one outline), each different in length and tilt, on a dark ground. Closest match to the brief's dark background.
- Source: https://vfxvoice.com/?p=5908138 ("Imageworks Artists 'Break the Mold' to Create an Alternate SPIDER-VERSE", VFX Voice). T3.

**02 `img/02-sense-lines-ring-group/ref.jpg`** (1024x873)
- Shows: three characters, each with a scatter of small white-and-red squiggles over their heads, on a near-black set. Fine halftone texture on the clothes.
- Technique: marks scale with how many there are and how close to the head they sit. A denser ring reads as a bigger reaction. The marks have a thin offset edge (misregistered).
- Source: https://vfxvoice.com/?p=5908138. T3.

**03 `img/03-sense-radiating-burst/ref.jpg`** (1024x429)
- Shows: a face centred, with a dense burst of short red radiating spikes crowding in from all four frame edges, plus a few long squiggles on a blue and red patterned wall.
- Technique: radiating "speed/shock" lines from the frame edge inward (a Japanese-comic device) combined with the wavy marks. The spikes sit at the border and point at the subject. Cheapest way to say "stop and look".
- Source: https://vfxvoice.com/?p=5908138. T3.

**04 `img/04-annotated-halftone-aberration-hatch/ref.jpg`** (1999x837)
- Shows: a close shot of a worried boy with three labelled circles: halftoning (a faint dot screen on the forehead), chromatic aberration (a coloured fringe on the left wall chart), and hatching lines (fine lines on the cheek).
- Technique: the clearest single diagram of the film's three print-simulation layers, all of them subtle and low-contrast. Note how quiet they are. They are texture, not decoration.
- Source: https://blog.garagefarm.net/blog/recreating-the-spider-verse-look-in-the-blender-node-editor (GarageFarm). T3.

**05 `img/05-glitch-misregistration-multiverse/ref.jpg`** (1920x1080)
- Shows: a figure shattered into offset, over-saturated cyan, magenta and yellow copies, with halftone patches and loose triangle fragments, floating on a black field of fine blue lines and small round planets and dots.
- Technique: glitch as misregistration. Several offset copies of one silhouette in separate hues, with some copies cut into shards. Black field, small dots, thin lines. This is almost the Motes of Work ground already.
- Source: https://sidefx.com/community/spider-man-into-the-spider-verse (SideFX, Imageworks effects breakdown). T3.

**06 `img/06-glitch-shards-city/ref.jpg`** (1920x1080)
- Shows: a city skyline dissolving into blocky, flat-colour fragments with offset edges at the centre of a dark frame.
- Technique: glitch confined to one region while the rest of the frame stays calm. The hold-and-break contrast is what carries it.
- Source: https://sidefx.com/community/spider-man-into-the-spider-verse. T3.

**07 `img/07-kirby-dots-battle/ref.jpg`** (1920x1080)
- Shows: a magenta and cyan frame filled with large round dots and splatters, a dark figure, and a small character flying through them.
- Technique: "Kirby dots", a field of round bubbles and splats of varied size. Per the SideFX page, Imageworks filled a volume with these in Houdini as streams of particles, composed in screen space. Directly particle-shaped. T3.
- Source: https://sidefx.com/community/spider-man-into-the-spider-verse. T3.

**08 `img/08-kirby-comic-page-source/ref.jpg`** (1058x756)
- Shows: a Jack Kirby comic page with a cosmic, black-dot-edged energy field, a hand, and a spaceship.
- Technique: the print source for the dots in 07. Shows the original Kirby crackle idea: dark dot clusters hugging the edge of an energy shape.
- Source: https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321.html (Cartoon Brew; the page quotes Danny Dimian on "Kirby dots"). T3.

**09 `img/09-ink-lines-on-3d-face/ref.jpg`** (1590x1112)
- Shows: a four-up of a 3D face with an ink-line pass: the same face with and without drawn lines, and the lines alone on white (see also the 3-up in the same set).
- Technique: ink lines drawn by a system, not painted. Line weight varies and lines break and start again; they are placed along contours, not everywhere. Shows how few lines are needed.
- Source: https://sidefx.com/community/spider-man-into-the-spider-verse. T3.

**10 `img/10-comic-panel-insets/ref.jpg`** (1024x429)
- Shows: a wall of small, differently shaped coloured comic panels (faces, mouths, a clock), with a boy running in front.
- Technique: panel insets and gutters. Irregular panel shapes pop in around the subject. Good model for a "panel border snapping in" beat.
- Source: https://vfxvoice.com/?p=5908138. T3.

**11 `img/11-onomatopoeia-caption-burst/ref.jpg`** (1920x802)
- Shows: a huge lettered "BOOM" slab with an orange halftone starburst behind it, a flying creature, yellow shard lines.
- Technique: lettering treated as a scene object, with a misregistered pink edge and halftone shading. This is the caption/impact-word device. It is also the most identifiable and most label-like thing on the board, so see the clash notes.
- Source: https://sidefx.com/community/spider-man-into-the-spider-verse. T3.

### Print and halftone fundamentals

**12 `img/12-benday-dot-diagram/ref.png`** (1280x957)
- Shows: a diagram of Ben-Day dots: a magnified circle of regular cyan, magenta and black dot rows overlapping to make purple and red.
- Technique: tint made of regular round dots in a lattice, overprinted. Size of dot sets tone; overlap sets colour.
- Source: https://en.wikipedia.org/wiki/Ben_Day_process (image from Wikimedia Commons, Benday_Dots.svg). T3.

**20 `img/20-cmyk-print-misregistration/ref.jpg`** (250x200)
- Shows: a macro of a printed raster: cyan and magenta dot screens at different angles, with a registration mark, with visible misalignment on the yellow area.
- Technique: the real print artefact that chromatic offset imitates: the plates sit a hair off each other, and each dot screen has its own angle.
- Source: https://en.wikipedia.org/wiki/Halftone (image from Wikimedia Commons, CMYK_raster_print.jpg). T3.

### Borderlands: ink and the introduction card

**17 `img/17-borderlands-inked-concept-art/ref.jpg`** (420x238)
- Shows: a painted concept piece of a masked, bladed character in a rocky, lit scene, with painterly texture and dark contour lines.
- Technique: hand-painted texture plus dark outline: the "concept art come to life" look Gearbox describes. Low resolution, so look at the line weight, not the detail.
- Source: https://en.wikipedia.org/wiki/Borderlands_2 (Zer0 concept art file). T3.

**18 `img/18-borderlands-3-inked-render/ref.jpg`** (690x388)
- Shows: a hooded, backpacked figure raising a blade among creatures and a wrecked vehicle, in washed-out pink dust, with thick contour lines and hatched grime textures.
- Technique: the game look in motion: ink outlines on every object, texture lines for form, and a pale, tinted backdrop that lets the outlined figure stand out. A frame from a character trailer.
- Source: https://www.shacknews.com/article/113291/meet-fl4k-in-new-borderlands-3-character-trailer (Shacknews). T3.

**19 `img/19-borderlands-style-intro-card-fan/ref.png`** (1192x670)
- Shows: a fan-made imitation of the introduction card: a grey slanted slab cut at jagged edges, a script name top-left, a condensed all-caps tagline below, a cartoon character in profile at right, skull line-art as texture, black bars top and bottom.
- Technique: the card layout (slab with notched ends, big name plus short tagline, character cut-out, ink-drawn texture). **Fan work, crude, and not an official frame.** Use it for layout only.
- Source: https://www.deviantart.com/boominalex/art/Gloomer-Borderlands-Character-Intro-829807510 (DeviantArt, by BoominAlex). T4.

### Rendering technique (code and diagrams)

**13 `img/13-webgl-rgb-halftone-example/ref.jpg`** (400x250)
- Shows: the stock three.js RGB halftone example: tumbling cubes with a per-channel rotated dot screen on black.
- Technique: `HalftonePass`. Parameters: `shape` (dot, ellipse, line, square), `radius`, `rotateR/G/B`, `scatter`, `blending`, `greyscale`. Per-channel rotation gives a free misregistered-print look on a dark ground.
- Source: https://threejs.org/examples/webgl_postprocessing_rgb_halftone.html and https://threejs.org/docs/pages/HalftonePass.html. T2.

**14 `img/14-webgl-outline-example/ref.jpg`** (400x250)
- Shows: the stock three.js outline example: coloured spheres with a dark-bordered outline on a plain ground.
- Technique: `OutlinePass`, a screen-space edge from the silhouette. For particles, the equivalent is to seed motes along the silhouette instead of drawing a line.
- Source: https://threejs.org/examples/webgl_postprocessing_outline.html. T2.

**15 `img/15-cel-outline-pipeline/ref.png`** (511x383)
- Shows: a flat-shaded scene with black outlines (the companion images on that page show the same scene without outlines and the edge-detection pass alone).
- Technique: how an ink outline is built: detect depth and normal edges, then composite. Same logic a limb ring of motes would follow.
- Source: https://en.wikipedia.org/wiki/Cel_shading (Wikimedia Commons, Cel_shading_with_outlines.png). T3.

**16 `img/16-anime-action-lines-shader/ref.jpg`** (1024x575)
- Shows: an anime close-up of a face with a burst of dense black radial lines and a scratchy ink texture, from a Godot "action lines" shader demo.
- Technique: the impact-frame family: high-contrast radial lines converging on a face, flat ink, a held pose. Adjacent reference only. The frame is an anime still shown by the shader author to demonstrate the effect.
- Source: https://godotshaders.com/?p=1139 (Godot Shaders listing; image from the same page). T3.

## Further reading (no image kept)

- Cartoon Brew, Imageworks approach (Danny Dimian on Kirby dots, line hatching): https://www.cartoonbrew.com/feature-film/if-its-not-broke-break-it-sony-imageworks-renegade-approach-to-spider-man-into-the-spider-verse-167321.html (T3)
- Creative Bloq, how the film got its look. Key quote (T3): Josh Beveridge, head of character animation, ruled that "smears and ink lines looked really good for one, maybe two frames, but any more than that and they became a distraction." Also confirms the film is animated mainly "on twos" (each pose held for two frames). https://www.creativebloq.com/features/how-into-the-spider-verse-got-its-mind-blowing-look
- SideFX, Houdini effects breakdown: glitching characters and buildings, Kirby-dot particle streams, sprite-sheet explosions animated on twos. https://sidefx.com/community/spider-man-into-the-spider-verse
- Foundry, comp breakdown (halftone, hatcher and thresher tools): https://www.foundry.com/insights/film-tv/graphic-look-in-comp-spiderman (T3; the page was fetched but not read in depth)
- Animation World Network breakdown: https://www.awn.com/print/animationworld/rewriting-visual-rule-book-spider-man-spider-verse (403 via the proxy; not read)
- Kirby krackle: https://en.wikipedia.org/wiki/Kirby_Krackle (T3). A field of black dots forming negative space around an energy effect.
- Comic effects with code (Unity/shader): https://lucy-creates.itch.io/spider-verse-effects (T3; screenshots are code, not kept)
- Blender shader write-up: https://www.blendernation.com/2024/01/15/7-steps-to-make-a-spiderverse-shader-in-blender/ (T3)
- Anime impact frames: search returned only generic, low-quality explainers (T4): black-and-white inversion, a single accent colour, radial speed lines, silhouette with a rim light. Nothing citable was found. Re-search with a named animator breakdown if this moves forward.

## What transfers to a particle essay

Ranked by how well each would read as glowing motes on a dark phone screen. "Read" = survives a small, bright-on-dark, portrait display with no explanation.

1. **Held frame, then low frame rate ("on twos")**
   - How: stop the scroll-driven motion; quantise mote positions to about 12 updates per second, with a tiny jitter on the held frame.
   - Why it is first: it costs nothing, reads on any screen, and is the heart of both inspirations. Creative Bloq and SideFX both confirm "on twos" is core to the film's feel (images 05, 06 show the break against a calm field).
   - Keep the stutter local to the moon and its halo. The rest of the field holds still.

2. **Radiating tick lines around the glitching moon** (images 01, 02, 03)
   - How: a ring of short, separate, jagged mote streaks (a dotted dash, not a solid line) around the moon, with varied length and a slight misalignment between them. Optionally a second set at the frame edge pointing inward (image 03).
   - Read: very high. Bright thin marks on dark are what motes do best.
   - Per Beveridge's rule (Creative Bloq), hold the marks for a beat, not for the whole freeze.
   - Imitation risk: the wavy squiggle ring over a head is the film's signature. Use straight or stepped ticks, or a shock-ring of dots, and put them around a moon, not a head.

3. **Chromatic misregistration** (images 04, 05, 20, 13)
   - How: draw the planet and moon's motes two or three times as additive layers, offset by a few pixels, in the essay's blue and ember. Offset the moon more than the planet to say "this is the broken one".
   - Read: very high on dark ground, since additive layers brighten where they overlap. It is also the cheapest, since it is the same point cloud.
   - Keep the offset small (image 04 shows how subtle the film's version is) and bigger only on the glitch beat (image 05).

4. **Halftone lattice** (images 12, 13, 04)
   - How: for the frozen frame, snap motes to a regular, rotated screen-space grid and set dot radius by brightness. The lit side gets big dots, the terminator gets small ones. The motes are already dots, so this is a re-arrangement, not an overlay.
   - Read: good on a large view, but on a phone a fine lattice turns to noise. Keep the pitch coarse (a few pixels at least) and use it only on the planet body.
   - Dark-ground halftone is "reverse" (light dots on black), which is the same logic as `HalftonePass` with `greyscale` on (image 13).

5. **Ink outline around the planet's limb** (images 14, 15, 17, 18)
   - How: a dense, slightly thick ring of motes along the silhouette, brighter than the body, with line weight that swells on the lit side and thins into the shade (image 09), and a small break or overlap where it starts and ends, as hand inking does.
   - Read: high. It also separates the planet from the starfield on a small screen.
   - This is the best Borderlands-flavoured move and needs no text.

6. **Hatching on the shadow side** (images 04, 09, 18)
   - How: short parallel rows of motes on the dark side, instead of a smooth gradient.
   - Read: medium. Works if the rows are spaced wider than a finger-width of blur. Muddy if the density is high.

7. **Held camera tilt** (Borderlands card, image 19; panels, image 10)
   - How: roll the camera 3 to 6 degrees and hold it, with an ease-in on the freeze.
   - Read: high, and trivial to do. Pairs with a slanted panel edge.

8. **Background dim and tint**
   - How: drop every mote that is not the moon system to a lower size and brightness, and pull them toward a single hue. The moon and its outline stay at full strength (image 18's pale backdrop does the same job).
   - Read: high. It is also the quietest, so it is safe for the essay's calm tone. The ground stays #0B0D12.

9. **Panel border snapping in** (images 10, 19, 03)
   - How: a thin frame (a line of motes, or a hairline) snaps around the held image, with a cut corner or an off-square angle, then holds.
   - Read: good and text-free. On a portrait phone, use the frame to set the crop, not to add inset panels. Multi-panel layouts (image 10) are too small to read on a phone.

10. **Single-frame flash (impact frame)** (image 16, plus the anime search notes)
    - How: one frame of near-white motes or an inverted frame at the instant of the glitch, then back.
    - Read: very high impact, high risk. Keep to one frame, fade over more than a few frames, never repeat more than 3 times a second, and honour `prefers-reduced-motion`.

11. **Kirby-dot voids and bubbles** (images 07, 08)
    - How: a loose cloud of round bubbles of mixed size drifting off the glitch (image 07 is literally a particle stream).
    - Read: medium. The original Kirby crackle is black dots on a bright energy shape (image 08), which inverts badly on a dark ground, so use bright bubbles, not dark gaps.
    - Good for the moment after the freeze, not the freeze itself.

12. **Hand-lettered name or caption card, onomatopoeia burst** (images 11, 19)
    - How: a slab with notched ends and a big hand-drawn word.
    - Read: high, but see the clash list. The only version that fits is a text-free slab shape.

## What clashes with the essay's rules

| Technique | Clash | What to do |
|---|---|---|
| Name card and tagline (image 19, Borderlands) | "No labels or metadata on screen." A name slab is a label by definition. | Drop the text. Keep only the slanted slab as a shape, or none. Any words belong to the essay prose at the top. |
| Onomatopoeia ("BOOM" word, image 11) | A label. Also the most recognisable lettering on the board. | Do not use. If a sound is wanted, show it as a ring of motes. |
| Caption box or speech bubble (comic caption, not on the board) | Text inside the picture breaks "text sits at the top above the picture". | Put the sentence in the essay's top text line, and let the picture carry only the frame. |
| Wavy squiggle ring over a head (images 01, 02) | The film's best-known mark. "In the vein of", not a copy. | Use ticks or a dot ring around the moon; vary the shape and give it a different silhouette. |
| Red and blue split colour scheme (images 03, 05) | Words for colour must not appear in the prose. The picture can still use the palette, but a red-blue split reads as the film's identity. | Use the essay's own blue and ember pair, and let the offset do the work. No colour words in the prose. |
| Panel grids with several insets (image 10) | Too small on a phone, and loud. | One frame only, with the border snapping in. |
| Script name lettering and skull art (image 19) | Direct copy risk for a known game's card. | No lettering at all. No skulls. |
| Lettering style, logo, or character (any) | "Must not name or imitate any film or game or brand." | No lettering that resembles the title treatments. No face or mask silhouette. The only subject is the planet and moon. |
| Flash (rank 10) | Not a brand clash but an accessibility one. | One frame, no repeats, respect reduced motion. |
| Fine halftone and hatch (ranks 4, 6) | Not a rule clash but a legibility one on a phone. | Coarse pitch, planet body only. |

## One-line direction

A held moment on twos: a limb of inked motes, a small split of the planet's own two lights, a dotted burst of ticks around the moon, the rest of the field dimmed and tipped a few degrees, and a thin frame snapping shut. All of it is made of motes, none of it is lettering, and all of it can fade by the next scroll step.
