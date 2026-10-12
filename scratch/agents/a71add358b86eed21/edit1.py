p='src/scene/mote/mote.test.ts'
s=open(p).read()
s=s.replace("import { mote, SETTLE_WINDOW, SETTLED_BRIGHTNESS, spawnPoint } from './mote';",
"import { FLARE_GAIN, FLARE_WIDTH, mote, SETTLE_WINDOW, SETTLED_BRIGHTNESS, spawnPoint } from './mote';")
s=s.replace("""  it('settles every core mote inside [SETTLE_WINDOW, 0.45]: unsettled at assembly 0, settled by 0.45', () => {""",
"""  it('settles every core mote inside [SETTLE_WINDOW, 0.44]: unsettled at assembly 0, settled by 0.44', () => {""")
s=s.replace("""      expect(a.settle).toBeLessThanOrEqual(0.45);
    }""","""      expect(a.settle).toBeLessThanOrEqual(0.44);
    }""")
s=s.replace("""      expect(a.settle).toBeLessThan(0.95 + 1e-9);""","""      expect(a.settle).toBeLessThan(0.97 + 1e-9);""")
old=s[s.index("describe('settle constants', () => {"):s.index("describe('mote()', () => {")]
new='''describe('settle constants', () => {
  it('settled motes keep half their flight glow, and settle over an assembly window of 0.08', () => {
    expect(SETTLED_BRIGHTNESS).toBe(0.5);
    expect(SETTLE_WINDOW).toBe(0.08);
  });

  it('a landing mote flares for 0.01 of assembly either side of its settle value, by one flight glow', () => {
    expect(FLARE_WIDTH).toBe(0.01);
    expect(FLARE_GAIN).toBe(1);
  });

  it('mote.glsl declares the same values as mote.ts', () => {
    const constant = (name: string) => Number(new RegExp(`const float ${name} = ([0-9.]+);`).exec(moteGlsl)?.[1]);
    expect(constant('MOTE_SETTLE_WINDOW')).toBe(SETTLE_WINDOW);
    expect(constant('MOTE_SETTLED_BRIGHTNESS')).toBe(SETTLED_BRIGHTNESS);
    expect(constant('MOTE_FLARE_WIDTH')).toBe(FLARE_WIDTH);
    expect(constant('MOTE_FLARE_GAIN')).toBe(FLARE_GAIN);
  });
});

describe('the landing flare', () => {
  // A mote is brightest the instant it lands, and the flare is gone 0.01 of assembly either side:
  // landed, it is back to its settled glow; still in flight, to its flight glow.
  const at = (a: MoteAttrs, assembly: number): number => {
    const s = state((x) => {
      x.mech.assembly = assembly;
    });
    return mote(a, s, partTransforms(mech, s)).brightness;
  };
  const sample = attrs.filter((a) => a.settle > 0.2 && a.settle < 0.9).slice(0, 200);
  const flightGlow = (a: MoteAttrs, assembly: number): number => {
    const x = Math.min(1, Math.max(0, (assembly - (a.settle - SETTLE_WINDOW)) / SETTLE_WINDOW));
    const t = x * x * (3 - 2 * x);
    return 1 * (1 - t) + SETTLED_BRIGHTNESS * t;
  };

  it('is SETTLED_BRIGHTNESS + FLARE_GAIN at the instant a mote lands', () => {
    expect(sample.length).toBeGreaterThan(50);
    for (const a of sample) expect(at(a, a.settle)).toBeCloseTo(SETTLED_BRIGHTNESS + FLARE_GAIN, 12);
  });

  it('is gone FLARE_WIDTH after landing (settled glow) and FLARE_WIDTH before it (flight glow)', () => {
    for (const a of sample) {
      expect(at(a, a.settle + FLARE_WIDTH)).toBeCloseTo(SETTLED_BRIGHTNESS, 12);
      expect(at(a, a.settle - FLARE_WIDTH)).toBeCloseTo(flightGlow(a, a.settle - FLARE_WIDTH), 12);
      expect(at(a, a.settle - SETTLE_WINDOW)).toBe(1);
    }
  });

  it('rises toward landing and falls after it, the same either way of travel', () => {
    for (const a of sample.slice(0, 40)) {
      const d = FLARE_WIDTH / 4;
      expect(at(a, a.settle - d)).toBeGreaterThan(at(a, a.settle - 2 * d));
      expect(at(a, a.settle + d)).toBeGreaterThan(at(a, a.settle + 2 * d));
    }
  });
});

'''
s=s.replace(old,new)
open(p,'w').write(s)

p='src/scene/mote/attributes.test.ts'
s=open(p).read()
s=s.replace('if (role === "core") return SETTLE_WINDOW + (0.45 - SETTLE_WINDOW) * h1;\n  return role === "body" ? 0.35 + 0.6 * h1 : 0.5 + 0.45 * h1;',
 'if (role === "core") return SETTLE_WINDOW + (0.44 - SETTLE_WINDOW) * h1;\n  return role === "body" ? 0.35 + 0.62 * h1 : 0.5 + 0.45 * h1;')
s=s.replace('expect(settleWindow(part("core"))).toEqual([SETTLE_WINDOW, 0.45]);\n    expect(settleWindow(part("body"))).toEqual([0.35, 0.95]);',
 'expect(settleWindow(part("core"))).toEqual([SETTLE_WINDOW, 0.44]);\n    expect(settleWindow(part("body"))).toEqual([0.35, 0.97]);')
open(p,'w').write(s)
