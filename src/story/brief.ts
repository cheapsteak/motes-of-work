import { settleWindow } from "../scene/mote/attributes";
import type { Mechanism } from "../mechanisms/types";

/**
 * The brief in the cold open: each line names the bike parts it asks for (`data-parts`) and
 * ticks once the motes of all of them have settled. The logic is DOM-free; `parseBrief` is the
 * only DOM glue.
 */

/** Part ids of a `data-parts` value: space-separated, a trailing `*` makes an id a prefix. */
export function parsePartList(attr: string): string[] {
  return attr.split(/\s+/).filter((t) => t !== "");
}

/** True when `id` is `pattern`, or starts with it when `pattern` ends in `*`. */
export function matchesPart(pattern: string, id: string): boolean {
  return pattern.endsWith("*")
    ? id.startsWith(pattern.slice(0, -1))
    : id === pattern;
}

export interface BriefLine {
  el: HTMLElement;
  /** Visually hidden text inside the line that says to a screen reader whether it is met. */
  status: HTMLElement;
  parts: string[];
}

/** What a met line's hidden status says; empty while the line is unmet. */
export const BRIEF_DONE = " (done)";

/**
 * Every `ul.brief > li[data-parts]` under `root`, in document order. Gives each line an empty,
 * visually hidden status span for `applyBrief` to fill.
 */
export function parseBrief(root: ParentNode): BriefLine[] {
  return [
    ...root.querySelectorAll<HTMLElement>("ul.brief > li[data-parts]"),
  ].map((el) => {
    const status = document.createElement("span");
    status.className = "sr-only";
    el.append(status);
    return { el, status, parts: parsePartList(el.dataset.parts ?? "") };
  });
}

/**
 * Per line, the assembly at which every matched part has settled. A line that matches no part of
 * the mechanism (another mechanism is on stage) waits for full assembly, so it is never ticked
 * early and never left unticked forever.
 */
export function briefThresholds(
  lines: readonly { parts: string[] }[],
  mechanism: Mechanism,
): number[] {
  return lines.map(({ parts }) => {
    const ends = mechanism.parts
      .filter((part) => parts.some((pattern) => matchesPart(pattern, part.id)))
      .map((part) => settleWindow(part)[1]);
    return ends.length === 0 ? 1 : Math.max(...ends);
  });
}

/**
 * Marks a line `data-met` exactly when `assembly` has reached its threshold, and says so in its
 * hidden status. Pure in `assembly`.
 */
export function applyBrief(
  lines: BriefLine[],
  thresholds: number[],
  assembly: number,
): void {
  lines.forEach((line, i) => {
    const met = assembly >= thresholds[i];
    line.el.toggleAttribute("data-met", met);
    line.status.textContent = met ? BRIEF_DONE : "";
  });
}
