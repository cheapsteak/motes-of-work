# Scratch

This folder holds work that is still up in the air: design mocks, reference boards, probes, one-off
scripts, and the build-plan records. It is kept in git so none of it is lost when a working session
ends. Nothing here is part of the essay's build: `tsc`, vitest and the e2e suite never look in here.

Treat it as a notebook, not as source. Once a piece is settled, it moves somewhere real. A mock that
became the design moved to `docs/mocks/`, as `docs/mocks/freeze-frame.html` did. A decision moved
into `docs/specs/`.

## What is where

- **`session/`** holds the working folder of the design sessions, which was the session scratchpad.
  - Mocks:
    - `freeze-mocks/`: the comic freeze frame;
    - `morph-mock/`: the lumpy shell;
    - `galaxy-mocks/`: early galaxy studies;
    - `orbitpub/`: the orbits mock;
    - `formpick/` and `form-mocks/`: the network-form options;
    - `defect-mocks/`, `act2-mocks/`, `storyboard/`, `textmock/` and `blueprint/`.
  - The script-notes page (`notes/`) and the publishing scripts: `assemble.py`, which builds the
    published essay page, and `add_galaxy_doors.py`, which adds the galaxy preview cards.
  - Reference write-ups: `freeze-refs/board.md` and `refboard/freeze-board.html`. The reference
    images themselves stay out of the repo (see below).
  - Screenshots, reduced to JPEGs of at most 1000 px with a dark background.
- **`agents/`** holds the helper agents' probe scripts and notes, one folder per agent. Their probe
  screenshots and logs are left out.
- **`sdd/`** holds the build plans' records: ledgers (`progress.md`), task briefs, reports and
  reviews. The review diffs are left out, because `git diff` regenerates them.
- **`tools/`**:
  - `collect_scratch.py` refreshes this folder from a session scratchpad.
  - `preview-build.patch` is the preview-only change used to publish galaxy previews. It reads
    the page's settings from the `#hash`, allows `?shot=` outside test mode, and hides the text in
    shot views. Apply it to a throwaway worktree, never to main.

## Paths inside mocks

Mocks import three.js from the project's own `node_modules/three/build/`. To view one, serve the repo
root over http (for example `python3 -m http.server`) and open its path; `file://` fails on module
imports.

## What is deliberately not here

- **Third-party material:**
  - downloaded web pages and their stylesheets, which were research examples;
  - reference stills and pages pulled for the freeze-frame and morph boards;
  - frames of the morph reference video.

  These stay out because we don't own them. The boards that describe them are here.
- **Reproducible files:**
  - builds (`dist/`, the published `pub/` bundle);
  - vendored three.js copies;
  - git worktrees;
  - logs, and the helper agents' probe screenshots.
