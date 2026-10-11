import type { StorySection } from './loader.ts';

/**
 * The story as HTML, in reading order (docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md
 * §3.4): per section `section[data-section] > p.sr-only (alt) + div.track > article.panel >
 * div.page[data-page][data-out]? > div.beat[data-beat][data-at]` (`data-out` only on a page given an
 * explicit out: where it is gone), then one trailing spacer. Pure, so the build
 * writes it into index.html (vite.config.ts) and the story reads without JavaScript.
 *
 * Each section is `length` screens tall and the spacer one screen, so the scroll range is the summed
 * section heights and a section's top meets the top of the viewport exactly when its span starts.
 */
export function storyMarkup(story: readonly StorySection[]): string {
  const sections = story.map((s) => {
    const pages = s.pages.map((page, pi) => {
      const beats = page.beats.map((b) => {
        const document = b.document ? ' data-document' : '';
        return `<div class="beat" data-beat="${attr(b.id)}" data-at="${b.at}"${document}>${b.html}</div>`;
      });
      const out = page.out === undefined ? '' : ` data-out="${page.out}"`;
      return `<div class="page" data-page="${pi + 1}"${out}>${beats.join('')}</div>`;
    });
    return (
      `<section class="section" data-section="${attr(s.id)}" style="--length: ${s.length}">` +
      `<p class="sr-only">${text(s.alt)}</p>` +
      `<div class="track"><article class="panel">${pages.join('')}</article></div>` +
      `</section>`
    );
  });
  return `${sections.join('\n')}\n<div class="story-end" aria-hidden="true"></div>`;
}

function text(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function attr(s: string): string {
  return text(s).replace(/"/g, '&quot;');
}
