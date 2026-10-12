# Writing brief: the Act II script (first draft, for the author to review)

You are the writer for "Motes of Work", a scroll-driven essay on a three.js point cloud. Repo <repo>
(read-only for you except your output file). Do not edit source code.

## Read first
- docs/specs/2026-10-05-act-2-wrong-guidance.md — the agreed Act II design: the author's intent, the node-and-stream
  world, the hairline crack, three layers (durable guidance, specs, code), three flows (down, sideways, up), six beats,
  open questions. This is the backbone; follow it.
- docs/specs/2026-10-02-motes-of-work-design.md §2 thesis and §4 (Prologue, Act I, Act II table II.1–II.6, Coda).
  II.3 is now the wrong-guidance section; decide what the script keeps of II.1, II.2, II.4–II.6 and say why (the
  author has been cutting anything not central; a lean act is better than a complete one).
- Act I as it stands, to match its voice and pick up from its ending: src/story/01-vibe-build.md, 02-reveal.md,
  03-rewind.md, 04-spec.md (beat markers show the pages), and docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md
  §1 for the voice rules. Act I ends on a finished, correct bike riding, built from an approved drawing.

## The voice (the author's rules, accumulated)
- A picture book a software developer reads to their kid: short sentences, concrete images, one idea per line,
  nothing a child trips on, but the adult lands the thesis.
- Every line is true of what is on screen while it is up; the camera and motion show what the line says.
- No colour or "dots" vocabulary the reader must learn (the author removed it from Act I: "we don't want readers to
  have to know what blue and dots mean"). If Act II truly needs the reader to tell human work from agent work, find a
  way that doesn't depend on a colour legend, or argue for it once, explicitly.
- Cut anything not central. No long-winded commentary (the author cut a rewind passage as "罗嗦").
- Publication-safe: no company, product, service, tool, file path, issue number or person names. The real history (a
  security rule that wrongly placed a third-party service inside a security boundary; dozens of changes built on it;
  reviews that approved them because the reviewer's own instructions repeated the rule) may be told only in shape,
  if at all.
- Engineers will read it too: the adult layer can name "instruction files", "specs", "code", "reviewers" plainly.

## Produce
One markdown file the author can review easily: docs/script/act-2.md, containing:
1. A short header: what Act II is for, in two sentences, and how it hands off from Act I and to the Coda.
2. The script, as pages and lines in reading order (the same page/line rhythm as Act I: at most 3 lines a page, at most
   ~26 words a line). Under each line, one short italic stage direction: what is on screen and what the camera does
   (enough for a storyboard later; no implementation detail).
3. For the open question "label the layers or not", make a recommendation and write the script that way, noting the
   alternative in one line.
4. A short "choices I made" list (what you kept or cut from II.1–II.6 and why, how you handled colour, anything you
   would like the author to decide), at most 8 bullets.
Keep the whole file readable in a few minutes. Return only the file path and a 5-line summary.
