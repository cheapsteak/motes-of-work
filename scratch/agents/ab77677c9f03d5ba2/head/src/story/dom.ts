import type { StorySection } from './loader';

/**
 * Story DOM, laid out so panels and scroll progress agree.
 *
 * Each `<section>` is `length × 100vh` tall and a trailing 100vh spacer follows the last one, so the
 * scroll range equals the summed section heights and a section's top sits exactly at its progress
 * span's start. Inside, the panel rides a track that starts and ends half a viewport lower than
 * its section. Its natural top therefore reaches the viewport's centre line exactly when the span
 * starts, and once released its bottom edge leaves that line exactly when the span ends. Between
 * those points it sticks, centred vertically by the `--half-h` it is given here.
 */
export function renderStory(root: HTMLElement, story: StorySection[]): void {
  const panels: HTMLElement[] = [];
  for (const s of story) {
    const section = document.createElement('section');
    section.className = 'section';
    section.dataset.section = s.id;
    section.dataset.alt = s.alt;
    section.style.setProperty('--length', String(s.length));

    const alt = document.createElement('p');
    alt.className = 'sr-only';
    alt.textContent = s.alt;

    const track = document.createElement('div');
    track.className = 'track';
    const panel = document.createElement('article');
    panel.className = 'panel';
    panel.innerHTML = s.html; // authored markdown from src/story, bundled at build time
    track.append(panel);
    panels.push(panel);

    section.append(alt, track);
    root.append(section);
  }
  const spacer = document.createElement('div');
  spacer.className = 'story-end';
  spacer.setAttribute('aria-hidden', 'true');
  root.append(spacer);

  // Half of each panel's own height, which CSS cannot read, for centring its sticky offset.
  const measure = (panel: HTMLElement) => panel.style.setProperty('--half-h', `${panel.offsetHeight / 2}px`);
  panels.forEach(measure);
  const observer = new ResizeObserver((entries) => entries.forEach((e) => measure(e.target as HTMLElement)));
  panels.forEach((p) => observer.observe(p));
}
