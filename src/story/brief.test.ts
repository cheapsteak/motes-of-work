import { describe, expect, it } from "vitest";
import { mechanisms } from "../mechanisms";
import {
  applyBrief,
  BRIEF_DONE,
  briefThresholds,
  matchesPart,
  parsePartList,
} from "./brief";
import { loadStory } from "./loader";

describe("parsePartList", () => {
  it("splits space-separated ids", () => {
    expect(parsePartList("saddle handlebars")).toEqual([
      "saddle",
      "handlebars",
    ]);
  });

  it("ignores leading, trailing and repeated whitespace", () => {
    expect(parsePartList("  saddle \n\t handlebars  chain-* ")).toEqual([
      "saddle",
      "handlebars",
      "chain-*",
    ]);
  });

  it("gives an empty list for an empty or blank value", () => {
    expect(parsePartList("")).toEqual([]);
    expect(parsePartList("   ")).toEqual([]);
  });
});

describe("matchesPart", () => {
  it("matches an exact id and nothing else", () => {
    expect(matchesPart("saddle", "saddle")).toBe(true);
    expect(matchesPart("saddle", "saddle-bag")).toBe(false);
    expect(matchesPart("wheel", "front-wheel")).toBe(false);
  });

  it("matches a trailing * as a prefix", () => {
    expect(matchesPart("chain-*", "chain-00")).toBe(true);
    expect(matchesPart("chain-*", "chain-23")).toBe(true);
    expect(matchesPart("chain-*", "chain-")).toBe(true);
    expect(matchesPart("chain-*", "chain")).toBe(false);
    expect(matchesPart("chain-*", "rear-chain-00")).toBe(false);
  });

  it("treats a * anywhere but the end literally", () => {
    expect(matchesPart("a*b", "axb")).toBe(false);
    expect(matchesPart("a*b", "a*b")).toBe(true);
  });
});

describe("briefThresholds", () => {
  // The shipped order (src/story/01-vibe-build.md): seat and bars, wheels and chain, steering, the
  // basket, the frame, and the mudguards.
  const lines = [
    { parts: parsePartList("saddle handlebars") },
    {
      parts: parsePartList(
        "front-wheel rear-wheel cranks chain-* pedal-left pedal-right",
      ),
    },
    { parts: parsePartList("fork front-wheel") },
    { parts: parsePartList("basket") },
    { parts: parsePartList("frame") },
    { parts: parsePartList("mudguard-front mudguard-rear") },
  ];

  it("is the latest settle end over the matched parts of the bike, in list order", () => {
    expect(briefThresholds(lines, mechanisms.bike)).toEqual([
      0.32, 0.48, 0.6, 0.72, 0.95, 0.97,
    ]);
  });

  it("is the same for the brief the story ships", () => {
    const shipped = loadStory()
      .flatMap((s) => [...s.body.matchAll(/data-parts="([^"]*)"/g)])
      .map((m) => ({ parts: parsePartList(m[1]) }));
    expect(shipped).toEqual(lines);
    expect(briefThresholds(shipped, mechanisms.bike)).toEqual([
      0.32, 0.48, 0.6, 0.72, 0.95, 0.97,
    ]);
  });

  it("is 1 for every line of a mechanism whose parts the lines do not name", () => {
    expect(briefThresholds(lines, mechanisms.steam)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it("is 1 for a line with no parts", () => {
    expect(briefThresholds([{ parts: [] }], mechanisms.bike)).toEqual([1]);
  });
});

describe("applyBrief", () => {
  const fakeLine = () => {
    const attrs = new Set<string>();
    const el = {
      toggleAttribute(name: string, force?: boolean) {
        if (force) attrs.add(name);
        else attrs.delete(name);
        return attrs.has(name);
      },
      hasAttribute: (name: string) => attrs.has(name),
    };
    return {
      el: el as unknown as HTMLElement,
      status: { textContent: "" } as HTMLElement,
      parts: [] as string[],
    };
  };

  it("meets a line exactly when assembly reaches its threshold, and clears it again below", () => {
    const lines = [fakeLine(), fakeLine()];
    const thresholds = [0.5, 1];
    const met = () => lines.map((l) => l.el.hasAttribute("data-met"));
    applyBrief(lines, thresholds, 0);
    expect(met()).toEqual([false, false]);
    applyBrief(lines, thresholds, 0.4999);
    expect(met()).toEqual([false, false]);
    applyBrief(lines, thresholds, 0.5);
    expect(met()).toEqual([true, false]);
    applyBrief(lines, thresholds, 1);
    expect(met()).toEqual([true, true]);
    applyBrief(lines, thresholds, 0.3);
    expect(met()).toEqual([false, false]);
  });

  it("tells a screen reader which lines are done, in step with the mark", () => {
    const lines = [fakeLine(), fakeLine()];
    const said = () => lines.map((l) => l.status.textContent);
    applyBrief(lines, [0.5, 1], 0.7);
    expect(said()).toEqual([BRIEF_DONE, ""]);
    applyBrief(lines, [0.5, 1], 0.2);
    expect(said()).toEqual(["", ""]);
    expect(BRIEF_DONE.trim()).toBe("(done)");
  });
});
