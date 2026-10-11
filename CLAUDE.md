# Motes of Work — notes for agents

- **Phone first.** The author expects more readers on phones than on desktops. Every change that touches what a
  reader sees is checked at a phone size (390x844 portrait) before desktop (1440x900), in tests and in the
  screenshots you look at. A frame that only works on desktop is not done.
- Every frame is a pure function of scroll progress (design spec §6.1); `mote.glsl` and `mote.ts` change only together
  (`e2e/parity.spec.ts`).
- Essay copy is publication-safe: no company, product, service, person or issue names. Act I's voice is a picture book a
  developer reads to their kid, and its narration uses no colour or "dots" vocabulary.
- Designs live in `docs/specs/`, the scripts in `docs/script/`; the act scripts are what the author reviews.
