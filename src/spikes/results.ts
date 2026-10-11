// The "copy results" panel shared by every spike page: a button, a status line, and the JSON in a
// read-only textarea (also the manual fallback when no copy method works, e.g. iOS over http).

/** Unmasked GPU string when the browser exposes it, else the generic RENDERER string. */
export function rendererString(gl: WebGLRenderingContext | WebGL2RenderingContext): string {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const raw = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(raw);
}

/** textarea + execCommand: works where navigator.clipboard does not (insecure contexts, old iOS). */
function copyViaTextarea(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px'; // 16px: no iOS zoom
  document.body.append(ta);
  try {
    ta.select();
    ta.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    ta.remove();
  }
}

/** Copy `text`; true when some method worked. Never throws. */
export async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or insecure context: fall through.
    }
  }
  return copyViaTextarea(text);
}

export interface ResultsPanel {
  /**
   * Re-render the JSON from the current results (cheap; call it as numbers change). A no-op once the
   * text is being copied by hand (focused, or the copy fallback fired), so the selection survives.
   */
  refresh(): void;
}

/** Mounts the panel into `parent`; `results()` is called on every refresh and on copy. */
export function mountResultsPanel(parent: HTMLElement, results: () => Record<string, unknown>): ResultsPanel {
  const root = document.createElement('div');
  root.innerHTML = `
    <button type="button" id="copy-results">Copy results</button>
    <span id="copy-status" class="muted" role="status"></span>
    <details id="results-details"><summary>Results JSON</summary><textarea id="results-json" readonly spellcheck="false"></textarea></details>`;
  parent.append(root);
  const button = root.querySelector('#copy-results') as HTMLButtonElement;
  const status = root.querySelector('#copy-status') as HTMLElement;
  const details = root.querySelector('#results-details') as HTMLDetailsElement;
  const area = root.querySelector('#results-json') as HTMLTextAreaElement;

  const text = (): string => JSON.stringify(results(), null, 2);
  let frozen = false; // set when the manual-copy fallback fires: the JSON stays put from then on
  const refresh = (): void => {
    if (frozen || document.activeElement === area) return;
    area.value = text();
  };
  refresh();

  button.addEventListener('click', async () => {
    area.value = text(); // always current at the moment of copying, even if refresh() is frozen
    if (await copyText(area.value)) {
      status.textContent = 'Copied';
    } else {
      // Nothing worked: show the text, selected, so the person can copy it by hand.
      status.textContent = 'Select the text below and copy it';
      frozen = true;
      details.open = true;
      area.focus();
      area.select();
    }
  });
  return { refresh };
}
