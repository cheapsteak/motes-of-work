import { progressFromScroll, scrollYForProgress } from './progress';

export interface ScrollDriver {
  /** Latest progress, always derived from the actual window.scrollY. */
  progress(): number;
  dispose(): void;
}

function readProgress(): number {
  return progressFromScroll(window.scrollY, document.documentElement.scrollHeight, window.innerHeight);
}

/**
 * DOM scroll → progress. Scroll events are coalesced to one read per animation frame.
 * On resize the page is re-scrolled to where the last progress now lies, so the reader
 * keeps their place even though every section's height (in vh) changed.
 * Calls `onProgress` once synchronously with the current progress.
 */
export function createScrollDriver(onProgress: (p: number) => void): ScrollDriver {
  let last = readProgress();
  let pending = 0;

  function update(): void {
    pending = 0;
    const p = readProgress();
    if (p === last) return;
    last = p;
    onProgress(p);
  }

  function schedule(): void {
    if (pending === 0) pending = requestAnimationFrame(update);
  }

  function onResize(): void {
    // Reading scrollHeight forces layout at the new size; scrollTo is instant (no smooth scrolling).
    window.scrollTo(0, scrollYForProgress(last, document.documentElement.scrollHeight, window.innerHeight));
    // Progress is still re-read from scrollY, never set from `last` directly.
    schedule();
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', onResize);
  onProgress(last);

  return {
    progress: () => last,
    dispose() {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', onResize);
      if (pending !== 0) cancelAnimationFrame(pending);
      pending = 0;
    },
  };
}
