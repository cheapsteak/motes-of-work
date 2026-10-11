import { describe, expect, it } from "vitest";
import { hash01 } from "../../math/hash";
import { SALT } from "../../math/salts";
import { mechanisms } from "../../mechanisms";
import type { Mechanism, MechanismPart } from "../../mechanisms/types";
import { buildMoteAttrs, ROLE_SETTLE, settleWindow } from "./attributes";
import { SETTLE_WINDOW } from "./settle";

const part = (
  role: MechanismPart["role"],
  settle?: readonly [number, number],
): MechanismPart => ({
  id: "p",
  role,
  explodedOffset: { position: [0, 0, 0], quaternion: [0, 0, 0, 1] },
  ...(settle ? { settle } : {}),
});

/** The settle formulas as they were before per-part windows existed. */
function legacySettle(role: MechanismPart["role"], seed: number): number {
  const h1 = hash01(seed, SALT.settle);
  if (role === "core") return SETTLE_WINDOW + (0.32 - SETTLE_WINDOW) * h1;
  return role === "body" ? 0.35 + 0.62 * h1 : 0.5 + 0.45 * h1;
}

describe("settleWindow", () => {
  it("returns the role default for a part without settle", () => {
    expect(settleWindow(part("core"))).toEqual([SETTLE_WINDOW, 0.32]);
    expect(settleWindow(part("body"))).toEqual([0.35, 0.97]);
    expect(settleWindow(part("drift"))).toEqual([0.5, 0.95]);
    expect(settleWindow(part("body"))).toBe(ROLE_SETTLE.body);
  });

  it("returns the part's own window when given", () => {
    expect(settleWindow(part("body", [0.6, 0.7]))).toEqual([0.6, 0.7]);
  });
});

describe.each(Object.entries(mechanisms))(
  "buildMoteAttrs settle: %s",
  (_name, mech) => {
    const points = mech.samplePoints(3000, 11);

    // `to - from` rounds differently from the old literal spans (0.95 - 0.35 vs 0.6), so a value can differ
    // by one double-precision ULP (~1e-16); the GPU attribute is float32, which that never reaches.
    it("matches the pre-window formulas when no part declares settle or a settle field", () => {
      const bare: Mechanism = {
        ...mech,
        parts: mech.parts.map((p) => ({ ...p, settle: undefined, settleField: undefined })),
      };
      const attrs = buildMoteAttrs(bare, points);
      attrs.forEach((a, i) => {
        expect(a.settle).toBeCloseTo(
          legacySettle(mech.parts[points[i].part].role, points[i].seed),
          12,
        );
      });
    });
  },
);

describe("buildMoteAttrs with a part window", () => {
  it("keeps a part with settle [0.6, 0.7] inside that window and leaves other parts alone", () => {
    const mech = mechanisms.steam;
    const target = mech.parts.findIndex((p) => p.role === "body");
    const custom: Mechanism = {
      ...mech,
      parts: mech.parts.map((p, i) =>
        i === target ? { ...p, settle: [0.6, 0.7] as const } : p,
      ),
    };
    const points = mech.samplePoints(4000, 3);
    const attrs = buildMoteAttrs(custom, points);
    const plain = buildMoteAttrs(mech, points);
    let inTarget = 0;
    attrs.forEach((a, i) => {
      if (a.part === target) {
        inTarget++;
        expect(a.settle).toBeGreaterThanOrEqual(0.6);
        expect(a.settle).toBeLessThanOrEqual(0.7);
      } else {
        expect(a.settle).toBe(plain[i].settle);
      }
    });
    expect(inTarget).toBeGreaterThan(0);
  });
});

describe("buildMoteAttrs with a settle field", () => {
  it("takes a part's settle from its field, read at the mote's correct position and hash, and leaves other parts alone", () => {
    const mech = mechanisms.steam;
    const target = mech.parts.findIndex((p) => p.role === "body");
    // Settle by height, low motes first, with a little of the hash.
    const field = (local: readonly number[], h: number) =>
      0.6 + 0.1 * (0.8 * Math.min(1, Math.max(0, 0.5 + local[1] / 4)) + 0.2 * h);
    const custom: Mechanism = {
      ...mech,
      parts: mech.parts.map((p, i) =>
        i === target
          ? { ...p, settle: [0.6, 0.7] as const, settleField: field }
          : p,
      ),
    };
    const points = mech.samplePoints(4000, 3);
    const attrs = buildMoteAttrs(custom, points);
    const plain = buildMoteAttrs(mech, points);
    let inTarget = 0;
    attrs.forEach((a, i) => {
      if (a.part === target) {
        inTarget++;
        expect(a.settle).toBe(
          field(points[i].local, hash01(points[i].seed, SALT.settle)),
        );
      } else {
        expect(a.settle).toBe(plain[i].settle);
      }
    });
    expect(inTarget).toBeGreaterThan(0);
  });
});
