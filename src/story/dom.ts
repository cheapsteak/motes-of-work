import type { StorySection } from './loader';
import type { PageLook } from './reveal';

/**
 * The story's elements, found in the markup the build wrote into the page (src/story/markup.ts),
 * per section, per page, per beat, in the order of `storyLooks`.
 */
export interface StoryDom {
  pages: HTMLElement[][];
  beats: HTMLElement[][][];
  /** Each beat's document lines (`ul.brief > li`), empty for any other beat. */
  lines: HTMLElement[][][][];
}

/**
 * Finds the prerendered story under `root` and checks it is the story this bundle carries. Keeps
 * each section's `--panel-h` (its panel's height, which CSS cannot read) up to date: the track runs
 * that far past its section so the panel stays at its anchor, unmoved, for the whole section and is
 * only pushed up once its last page has faded out (src/style.css).
 */
export function mountStory(root: HTMLElement, story: readonly StorySection[]): StoryDom {
  const sections = [...root.querySelectorAll<HTMLElement>(':scope > section[data-section]')];
  const pages = sections.map((s) => [...s.querySelectorAll<HTMLElement>('.page')]);
  const beats = pages.map((ps) => ps.map((p) => [...p.querySelectorAll<HTMLElement>(':scope > .beat')]));
  const lines = beats.map((ps) => ps.map((bs) => bs.map((b) => [...b.querySelectorAll<HTMLElement>('ul.brief > li')])));
  // Each beat by id, and a document's by its number of lines too.
  const name = (id: string | undefined, n: number) => (n > 0 ? `${id}[${n}]` : `${id}`);
  const want = story.map((s) => `${s.id}:${s.pages.map((p) => p.beats.map((b) => name(b.id, b.lines.length)).join(',')).join('|')}`);
  const got = sections.map(
    (s, i) => `${s.dataset.section}:${beats[i].map((p, j) => p.map((b, k) => name(b.dataset.beat, lines[i][j][k].length)).join(',')).join('|')}`,
  );
  if (want.join(' ') !== got.join(' ')) {
    throw new Error(`the page's story markup is not this bundle's story (got ${got.join(' ')}, want ${want.join(' ')})`);
  }

  const measure = (panel: HTMLElement) =>
    panel.closest('section')?.style.setProperty('--panel-h', `${panel.offsetHeight}px`);
  const panels = sections.map((s) => s.querySelector('.panel') as HTMLElement);
  panels.forEach(measure);
  const observer = new ResizeObserver((entries) => entries.forEach((e) => measure(e.target as HTMLElement)));
  panels.forEach((p) => observer.observe(p));
  return { pages, beats, lines };
}

/**
 * Writes the looks onto the story: each page's opacity, each beat's `--reveal` and `--dim`, which
 * CSS draws as its opacity and its mix from ink to dim ink, and each document line's `--reveal`
 * (its opacity). Set, never transitioned.
 */
export function applyLooks(dom: StoryDom, looks: readonly PageLook[][]): void {
  looks.forEach((section, si) =>
    section.forEach((page, pi) => {
      dom.pages[si][pi].style.opacity = String(page.opacity);
      page.beats.forEach((b, bi) => {
        const el = dom.beats[si][pi][bi];
        el.style.setProperty('--reveal', String(b.reveal));
        el.style.setProperty('--dim', String(b.dim));
        b.lines.forEach((r, li) => dom.lines[si][pi][bi][li].style.setProperty('--reveal', String(r)));
      });
    }),
  );
}
