// Credits and licences: CREDITS.md ships inside every page that bundles code it covers, so its
// licence notices go wherever the site goes (BSD-2 and MIT both ask for the notice with binary
// redistributions). Shared by the essay and the comparison page.
import { marked } from 'marked';
import credits from '../../CREDITS.md?raw';

/** CREDITS.md rendered to HTML (a trusted file from this repo, bundled at build time). */
export function creditsHtml(): string {
  return marked.parse(credits, { async: false });
}

export interface CreditsElements {
  open: HTMLElement;
  dialog: HTMLDialogElement;
  body: HTMLElement;
  close: HTMLElement;
}

/** Fill the credits dialog and wire its open and close buttons. */
export function mountCredits({ open, dialog, body, close }: CreditsElements): void {
  body.innerHTML = creditsHtml();
  open.addEventListener('click', () => dialog.showModal());
  close.addEventListener('click', () => dialog.close());
}
