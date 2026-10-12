import { AdditiveBlending, CustomBlending, Vector3, type IUniform, type Mesh, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { MOTE_BUDGET_DESKTOP, MOTE_SEED } from '../../config';
import { AMBIENT_POSE } from '../../galaxy/ambient';
import { galaxyTier } from '../../galaxy/background';
import { latticeCount } from '../../galaxy/body';
import { bodyIndex, galaxyBudget, generateGalaxy, STREAM_DOTS, streamDots, TRACK_DOTS } from '../../galaxy/generate';
import { GALAXY_SHOTS, galaxyShotCamera } from '../../timeline/netShots';
import { KeyframeSampler, type KeyframeFile } from '../../timeline/keyframeSampler';
import keyframes from '../../timeline/keyframes.json';
import { lampFocusRow } from '../../timeline/netTrack';
import { sectionSpans } from '../../scroll/progress';
import { loadStory } from '../../story/loader';
import { galaxyOf } from './galaxyOnScreen';
import { bodyLight, bodyMote, focusScatterRow, type BodyClocks } from './bodyMote';
import { mulberry32 } from '../../math/hash';
import { defaultSceneState } from '../../timeline/sceneState';
import { hexToRgb, NODE_EMBER_MIX, NODE_PALETTE, NodeRole } from './birth';
import {
  BODY_LOOK,
  buildBodyAttrs,
  buildGlowAttrs,
  buildPersonAttrs,
  buildShellAttrs,
  buildSpikeAttrs,
  buildStreamAttrs,
  buildTrackAttrs,
  meanAnomalyTurns,
  packShellData,
  SHELL_TEXELS,
  systemIndexOf,
  unitIndexOf,
} from './bodyAttrs';
import { packBodyData } from './bodyData';
import { PLANET_LOOK, STAR_LOOK } from './classLook';
import { createBodySystem, icospheres, type FreezeFrame } from './bodySystem';
import { GALAXY_INCLUDE_MARKER, withGalaxyLibrary } from './shaderSource';
import { detailPx, FULL_DETAIL_MAX, glowCaps, HALO_APART, LOD_BANDS, LodElement, motePx, onScreen } from './lod';
import { bodyWorld, elementsAt, orbitLocal, orbitTurns } from './orbit';
import { latticeLL, shapeAt, shapeUniforms, shellEvent, shellSeed, spinAxis } from './shell';
import bodyFrag from './shaders/body.frag.glsl?raw';
import bodyVert from './shaders/body.vert.glsl?raw';
import shellVert from './shaders/shell.vert.glsl?raw';
import spikeVert from './shaders/spike.vert.glsl?raw';
import { bodyHoodReal, shellSkips, spikeSkips } from './earlyOut';
import moteFrag from '../mote/shaders/mote.frag.glsl?raw';
import galaxyMoteFrag from './shaders/galaxyMote.frag.glsl?raw';
import starFrag from '../galaxy/shaders/star.frag.glsl?raw';
import ringFrag from './shaders/ring.frag.glsl?raw';
import holeFrag from '../hole/shaders/hole.frag.glsl?raw';
import { createHoleSystem } from '../hole/holeSystem';
import { planFrameAt, planPixels } from './planOnScreen';

const g = generateGalaxy(MOTE_SEED, 'phone', galaxyBudget(MOTE_BUDGET_DESKTOP));
const shadow: IUniform<Vector3> = { value: new Vector3() };
const system = createBodySystem(g, shadow);

describe('the body set, counted', () => {
  const planets = g.bodies.filter((b) => b.kind === 'planet');
  const moonTracks = planets.reduce((n, p) => n + new Set(g.bodies.filter((m) => m.kind === 'moon' && m.host === p.index).map((m) => m.track)).size, 0);
  const ghosts = g.bodies.filter((b) => b.cracked && (b.kind === 'planet' || b.kind === 'moon')).length;

  it('draws every shell mote: Σ latticeCount and each star’s 160 dots, the generator’s shells', () => {
    // A barycentre (re-skin Task 1e) draws nothing.
    const sum = g.bodies.reduce((n, b) => n + (b.lattice ? latticeCount(...b.lattice) : b.kind === 'star' ? 160 : 0), 0);
    expect(g.bodies.some((b) => b.kind === 'bary')).toBe(true);
    expect(system.counts.shells).toBe(sum);
    expect(system.counts.shells).toBe(g.instances.shells);
  });

  it('draws 90 dots per planet orbit and 40 per moon track in use', () => {
    expect(system.counts.tracks).toBe(TRACK_DOTS.planet * planets.length + TRACK_DOTS.moonTrack * moonTracks);
    expect(system.counts.tracks).toBe(g.instances.tracks);
  });

  it('draws a glow per star, and none for the core (re-skin Task 5: the six core rows draw nothing)', () => {
    const stars = g.bodies.filter((b) => b.kind === 'star').length;
    expect(g.bodies.filter((b) => b.kind === 'core')).toHaveLength(6);
    expect(system.counts.glow).toBe(stars);
    expect(system.counts.glow).toBe(g.instances.glow);
  });

  it('draws an icosphere per planet and moon (none for a star, a core row or a barycentre) and a ghost per cracked planet or moon', () => {
    const planetsAndMoons = g.bodies.filter((b) => b.kind === 'planet' || b.kind === 'moon').length;
    expect(system.counts.ghosts).toBe(ghosts);
    expect(system.counts.bodies).toBe(planetsAndMoons + ghosts);
    expect(system.counts.bodies).toBe(g.instances.bodies);
    const drawn = buildBodyAttrs(g);
    for (let k = 0; k < drawn.count; k++) expect(['star', 'bary', 'core']).not.toContain(g.bodies[drawn.body[k * 3]].kind);
    expect(new Set(Array.from({ length: drawn.count - ghosts }, (_, k) => g.bodies[drawn.body[k * 3]].kind))).toEqual(new Set(['planet', 'moon']));
  });

  it('draws no core row’s shell, person or glow instance', () => {
    const core = new Set(g.bodies.filter((b) => b.kind === 'core').map((b) => b.index));
    for (const set of [buildShellAttrs(g), buildPersonAttrs(g), buildGlowAttrs(g)])
      for (let k = 0; k < set.count; k++) expect(core.has(set.mote[k * 4]), `instance ${k}`).toBe(false);
  });

  it('draws 96 spike dots per star', () => {
    expect(system.counts.spikes).toBe(2_880);
    expect(system.counts.spikes).toBe(g.instances.spikes);
  });

  it('draws the person’s motes of every body that carries the defect', () => {
    expect(system.counts.persons).toBe(g.bodies.reduce((n, b) => n + (b.cracked ? b.personMotes : 0), 0));
    expect(system.counts.persons).toBe(g.instances.persons);
  });

  it('draws streamDots per stream and STREAM_DOTS[1] for the feed', () => {
    expect(system.counts.streams).toBe(g.streams.reduce((n, st) => n + streamDots(g.bodies, st), 0));
    expect(system.counts.feed).toBe(STREAM_DOTS[1]);
    expect(system.counts.streams + system.counts.feed).toBe(g.instances.streams);
  });

  it('draws every instance Galaxy.instances counts with the hole’s, and no more, within the budget', () => {
    const { shells, persons, bodies, glow, spikes, tracks, streams, feed, plan, planScreen } = system.counts;
    // Σ every net-* count and Σ the hole's.
    const hole = createHoleSystem(g, packBodyData(g), shadow);
    const holeDrawn = Object.values(hole.counts).reduce((n, c) => n + c, 0);
    expect(holeDrawn).toBe(27_610);
    // The plans' two meshes (re-skin §4.7, Task 7b): the world pool with the pairs' marks, and the screen pool.
    expect(plan + planScreen).toBe(g.instances.plan);
    expect(shells + persons + bodies + glow + spikes + tracks + streams + feed + plan + planScreen + holeDrawn).toBe(g.instances.total);
    hole.dispose();
    expect(g.instances.total).toBeLessThanOrEqual(galaxyBudget(MOTE_BUDGET_DESKTOP));
    const sets = system.object.children.filter((o) => o.name.startsWith('net-') && !o.name.startsWith('net-copy') && o.name !== 'net-ring' && o.name !== 'net-ticks');
    expect(sets.map((o) => o.name).sort()).toEqual(['net-bodies', 'net-feed', 'net-glow', 'net-persons', 'net-plan', 'net-plan-screen', 'net-shells', 'net-spikes', 'net-streams', 'net-tracks']);
  });
});

describe('the shell attributes', () => {
  const shells = buildShellAttrs(g);

  it('give each body its own lattice, aLL = latticeLL, in order (a star’s dots none: they are placed from their seeds)', () => {
    let at = 0;
    for (const b of g.bodies) {
      for (let i = 0; i < b.motes; i++, at++) {
        const ll = b.lattice ? latticeLL(i, ...b.lattice) : { lat: 0, lon: 0 };
        expect(shells.ll[at * 2], `${b.id} ${i}`).toBe(Math.fround(ll.lat));
        expect(shells.ll[at * 2 + 1], `${b.id} ${i}`).toBe(Math.fround(ll.lon));
        expect(shells.mote[at * 4]).toBe(b.index);
        expect(shells.mote[at * 4 + 1]).toBe(b.kind === 'moon' ? NodeRole.Moon : NodeRole.Builder);
        expect(shells.mote[at * 4 + 3]).toBe(i);
      }
    }
    expect(at).toBe(shells.count);
  });

  it('put every mote of a system in its star’s system (a binary’s star its own), and the core in none', () => {
    for (let k = 0; k < shells.count; k += 97) {
      const b = g.bodies[shells.mote[k * 4]];
      expect(shells.mote[k * 4 + 2]).toBe(b.kind === 'core' ? -1 : g.systems.indexOf(b.star));
    }
    const sys = systemIndexOf(g);
    for (const b of g.bodies) if (b.kind === 'bary') expect(sys[b.index]).toBe(-1);
    // ...and a binary's two stars share one unit, every other star its own.
    const unit = unitIndexOf(g);
    g.systems.forEach((row, i) => expect(g.units[unit[i]]).toBe(g.bodies[row].host >= 0 ? g.bodies[row].host : row));
    expect(new Set(unit).size).toBe(g.units.length);
  });

  it('fly each builder in on its body’s stream, a moon’s on its planet’s, each with its own seed and order', () => {
    let at = 0;
    const seeds = new Set<number>();
    for (const b of g.bodies) {
      const stream = (b.kind === 'moon' ? g.bodies[b.host].stream : b.stream) ?? -1;
      for (let i = 0; i < b.motes; i++, at++) {
        expect(shells.flight[at * 4 + 2]).toBe(stream);
        const birth = shells.flight[at * 4];
        expect(birth >= 0 && birth < 1).toBe(true);
        seeds.add(shells.flight[at * 4 + 1]);
        expect(Number.isInteger(shells.flight[at * 4 + 1]) && shells.flight[at * 4 + 1] < 2 ** 24).toBe(true);
      }
    }
    expect(seeds.size).toBeGreaterThan(0.99 * shells.count);
  });

  it('rest each person mote on its own body’s sphere, its host', () => {
    const persons = buildPersonAttrs(g);
    for (let k = 0; k < persons.count; k++) {
      expect(persons.mote[k * 4 + 1]).toBe(NodeRole.Person);
      expect(persons.flight[k * 4 + 2]).toBe(persons.mote[k * 4]);
      expect(Math.abs(persons.ll[k * 2])).toBeLessThanOrEqual(Math.PI / 2 + 1e-6);
    }
    const c1 = g.bodies[g.ids.C1];
    let onC1 = 0;
    for (let k = 0; k < persons.count; k++) if (persons.mote[k * 4] === c1.index) onC1++;
    expect(onC1).toBe(70);
  });

  it('put a ghost after the bodies for each cracked planet or moon', () => {
    const b = buildBodyAttrs(g);
    const bodies = b.count - b.ghosts;
    for (let k = 0; k < b.count; k++) expect(b.body[k * 3 + 2]).toBe(k < bodies ? 0 : 1);
    for (let k = bodies; k < b.count; k++) {
      const body = g.bodies[b.body[k * 3]];
      expect(body.cracked && (body.kind === 'planet' || body.kind === 'moon')).toBe(true);
    }
  });

  it('give every stream its dots, numbered from 0, and the feed its own set', () => {
    const { streams, feed } = buildStreamAttrs(g);
    let at = 0;
    g.streams.forEach((st, row) => {
      for (let i = 0; i < streamDots(g.bodies, st); i++, at++) expect([streams.dot[at * 2], streams.dot[at * 2 + 1]]).toEqual([row, i]);
    });
    expect(at).toBe(streams.count);
    for (let i = 0; i < feed.count; i++) expect([feed.dot[i * 2], feed.dot[i * 2 + 1]]).toEqual([g.streams.length, i]);
  });

  it('give each star its 96 spike dots, in its glow slot, k from 0', () => {
    const glow = buildGlowAttrs(g);
    const { count, spike } = buildSpikeAttrs(g);
    const stars = glow.rows.filter((r) => g.bodies[r].kind === 'star');
    expect(count).toBe(96 * stars.length);
    for (let k = 0; k < count; k++) {
      const row = spike[k * 4];
      expect(g.bodies[row].kind).toBe('star');
      expect(spike[k * 4 + 1]).toBe(g.systems.indexOf(row));
      expect(glow.rows[spike[k * 4 + 2]]).toBe(row);
      expect(spike[k * 4 + 3]).toBe(k % 96);
      expect(row).toBe(stars[Math.floor(k / 96)]);
    }
  });

  it('give the glow sprites one slot each, the stars only', () => {
    const glow = buildGlowAttrs(g);
    expect(glow.rows.map((r) => g.bodies[r].kind).every((k) => k === 'star')).toBe(true);
    for (let k = 0; k < glow.count; k++) {
      expect(glow.mote[k * 4 + 1]).toBe(NodeRole.Glow);
      expect(glow.mote[k * 4 + 3]).toBe(k);
    }
  });
});

describe('the shell texture', () => {
  it('holds each body’s own shape and spin axis, and the morph only on a cracked body', () => {
    const data = packShellData(g, 0);
    for (const b of g.bodies) {
      const at = b.index * SHELL_TEXELS * 4;
      const axis = spinAxis(shellSeed(b.id));
      for (let k = 0; k < 3; k++) expect(data[at + 8 + k]).toBe(Math.fround(axis[k]));
      expect(data[at + 11]).toBe(b.cracked ? Math.fround(0.02) : 0);
      if (!b.cracked) expect([...data.slice(at, at + 8)]).toEqual(shapeUniforms(shapeAt(shellSeed(b.id), 0)).flat().map(Math.fround));
      // A star's dot is STAR_LOOK.dotDiameter across: the old star shell mote, 0.5 × π × 0.9 / 20 rows, to 4 places.
      expect(data[at + 12]).toBeCloseTo(b.lattice ? (BODY_LOOK.dotShare * Math.PI * b.R) / b.lattice[0] : STAR_LOOK.dotDiameter, 6);
      if (!b.lattice) expect(STAR_LOOK.dotDiameter).toBeCloseTo((0.5 * Math.PI * 0.9) / 20, 4);
      expect(data[at + 13]).toBe(b.motes);
      expect(data[at + 14]).toBe(shellSeed(b.id));
    }
  });

  it('holds a cracked body’s next shape and its scatter’s sweep and aftershock at the ambient', () => {
    for (const t of [0, 9.49, 101]) {
      const data = packShellData(g, t);
      for (const b of g.bodies.filter((x) => x.cracked).slice(0, 40)) {
        const at = b.index * SHELL_TEXELS * 4;
        const ev = shellEvent(b.derpSeed, b.derpPhase, t, shellSeed(b.id));
        expect([...data.slice(at, at + 8)]).toEqual(shapeUniforms(ev.shape).flat().map(Math.fround));
        expect([...data.slice(at + 16, at + 24)]).toEqual(shapeUniforms(ev.next).flat().map(Math.fround));
        expect([...data.slice(at + 24, at + 28)]).toEqual([...ev.sweep, ev.aftershock ? 1 : 0].map(Math.fround));
      }
    }
  });
});

describe('the dotted orbits', () => {
  it('sit evenly in true anomaly round their ellipse', () => {
    const data = packBodyData(g);
    const { track, count } = buildTrackAttrs(g);
    const row = track[0];
    const o = elementsAt(data, row);
    const n = TRACK_DOTS.planet;
    // At ambient 0 with the dot's anomaly as the phase, orbitLocal puts dot i at true anomaly 2π i / n.
    for (let i = 0; i < n; i += 9) {
      const p = orbitLocal({ ...o, precession: 1e12, phase: track[i * 4 + 1] - orbitTurns(0, o.period) }, 0);
      const flatR = Math.hypot(p[0], p[1], p[2]);
      const want = (o.a * (1 - o.e * o.e)) / (1 + o.e * Math.cos((2 * Math.PI * i) / n));
      expect(flatR, `dot ${i}`).toBeCloseTo(want, 4);
    }
    expect(count).toBe(g.instances.tracks);
  });

  it('meanAnomalyTurns is Kepler’s equation from the true anomaly', () => {
    expect(meanAnomalyTurns(0, 0.2)).toBe(0);
    expect(meanAnomalyTurns(Math.PI, 0.2)).toBeCloseTo(0.5, 12);
    expect(meanAnomalyTurns(1, 0)).toBeCloseTo(1 / (2 * Math.PI), 12);
  });
});

describe('at most two systems at full detail', () => {
  const full = LOD_BANDS[LodElement.Moon][0];

  it('keeps the two largest and holds every other just under full detail', () => {
    const rng = mulberry32(7);
    for (let trial = 0; trial < 200; trial++) {
      const raw = Array.from({ length: 30 }, () => 400 * rng() * rng());
      const out = detailPx(raw);
      expect(out.filter((s) => s >= full).length).toBeLessThanOrEqual(FULL_DETAIL_MAX);
      out.forEach((s, i) => expect(s).toBeLessThanOrEqual(raw[i]));
      // Below where a held system is held, nothing changes.
      const below = raw.filter((s) => s < full - 0.1);
      for (const s of below) expect(out[raw.indexOf(s)]).toBe(s);
    }
    expect(detailPx([223, 217, 209, 30])[0]).toBeGreaterThanOrEqual(120);
    expect(detailPx([223, 217, 209, 30])[1]).toBeGreaterThanOrEqual(120);
    expect(detailPx([223, 217, 209, 30])[2]).toBeLessThan(full);
  });

  it("a binary's two stars count as one unit (re-skin Task 1e)", () => {
    const full = LOD_BANDS[LodElement.Moon][0];
    // Four systems, the first two one binary: it and the third are the two largest units, so all three
    // keep full detail, and the fourth is held under it.
    const out = detailPx([200, 190, 180, 170], [0, 0, 1, 2]);
    expect(out.slice(0, 3).every((s) => s >= full)).toBe(true);
    expect(out[3]).toBeLessThan(full);
    // Counted alone, the third would be held instead.
    expect(detailPx([200, 190, 180, 170])[2]).toBeLessThan(full);
    // Without units it is the rule as it was.
    expect(detailPx([200, 190, 180, 170], [0, 1, 2, 3])).toEqual(detailPx([200, 190, 180, 170]));
  });

  it('is continuous: a system overtaking another hands its detail over without a jump', () => {
    let last = detailPx([200, 150, 100]);
    for (let s = 100; s <= 200; s += 0.01) {
      const now = detailPx([200, 150, s]);
      for (let i = 0; i < 3; i++) expect(Math.abs(now[i] - last[i])).toBeLessThan(0.2);
      last = now;
    }
  });

  it('fades a system leaving the screen over its own radius', () => {
    expect(onScreen(100, 100, 50, 390, 844)).toBe(1);
    expect(onScreen(-10, 100, 50, 390, 844)).toBeGreaterThan(0.5);
    expect(onScreen(-50, 100, 50, 390, 844)).toBe(0);
    expect(onScreen(390 + 25, 100, 50, 390, 844)).toBeCloseTo(0.5, 12);
  });
});

describe('the glow sprites keep their halos apart', () => {
  it('whatever the camera does to their centres', () => {
    const rng = mulberry32(11);
    for (let trial = 0; trial < 100; trial++) {
      const sprites = Array.from({ length: 36 }, () => ({ x: 400 * rng(), y: 800 * rng(), diam: 5 + 30 * rng(), cap: rng() < 0.2 ? 24 : 18, front: rng() < 0.95 }));
      const caps = glowCaps(sprites);
      caps.forEach((c, i) => expect(c).toBeLessThanOrEqual(Math.min(sprites[i].diam, sprites[i].cap)));
      for (let i = 0; i < sprites.length; i++)
        for (let j = i + 1; j < sprites.length; j++) {
          if (!sprites[i].front || !sprites[j].front) continue;
          const d = Math.hypot(sprites[i].x - sprites[j].x, sprites[i].y - sprites[j].y);
          expect(caps[i] / 2 + caps[j] / 2).toBeLessThanOrEqual(HALO_APART * d + 1e-9);
        }
    }
  });

  it('leaves a lone sprite its own size', () => {
    expect(glowCaps([{ x: 0, y: 0, diam: 12, cap: 18, front: true }, { x: 500, y: 0, diam: 30, cap: 18, front: true }])).toEqual([12, 18]);
  });
});

describe('the shaders’ copies', () => {
  it('draw the bodies in their own colour, their fill lit by the terminator and no rim but a ghost’s, toward amber fixed and ember lit, as the palette has them (re-skin Task 7)', () => {
    const glsl = (hex: string) => hexToRgb(hex).map((c) => (Number.isInteger(c) ? c.toFixed(1) : c.toFixed(7)));
    expect(bodyFrag).toContain(`const vec3 HUMAN = vec3(${glsl(NODE_PALETTE.NODE_HUMAN).join(', ')});`);
    expect(bodyFrag).toContain(`const vec3 EMBER = vec3(${glsl(NODE_PALETTE.NODE_EMBER).join(', ')});`);
    expect(bodyFrag).toContain(`const float EMBER_MIX = ${NODE_EMBER_MIX};`);
    // The colour is the body's own (T6, through vBase), never a hand copy of the agents' blue; the rim
    // term is gone (planets do not glow), and the fill is PLANET_LOOK's, spliced with terminator().
    expect(bodyFrag).toContain('flat in vec3 vBase;');
    expect(bodyFrag).not.toMatch(/AGENT/);
    // The rim stays on the burst's ghost alone (its outline), BODY_LOOK's.
    expect(bodyFrag).toContain(`const float GHOST_RIM = ${BODY_LOOK.ghostRim};`);
    expect(bodyFrag).toContain(`const float GHOST_RIM_POW = ${BODY_LOOK.ghostRimPow};`);
    expect(bodyFrag).toContain('vRim * GHOST_RIM');
    const bodies = system.object.children.find((o) => o.name === 'net-bodies') as Mesh;
    const frag = (bodies.material as ShaderMaterial).fragmentShader;
    expect(frag).toContain(`const float PLANET_EDGE = ${PLANET_LOOK.edge};`);
    expect(frag).toContain(`const float PLANET_FILL = ${PLANET_LOOK.fill};`);
    expect(frag).toContain('float terminator(vec3 n, vec3 toStar, float night)');
    // A fragment shader takes terminator() alone: lightDir reads the bodies texture, left out by the define.
    expect(frag.indexOf('#define TERMINATOR_FRAGMENT')).toBeGreaterThanOrEqual(0);
    expect(frag.indexOf('#define TERMINATOR_FRAGMENT')).toBeLessThan(frag.indexOf('#ifndef TERMINATOR_FRAGMENT'));
    // The held planet's scatter haze (re-skin §4.5): its fill × heldFill, the hold's window on its scatter seconds.
    expect((bodies.material as ShaderMaterial).vertexShader).toContain('vFill = PLANET_FILL * heldFill(row, d.scatterS);');
  });

  it('fill a lit glow’s core to BODY_LOOK.litCore, galaxyMote.frag.glsl’s one hand copy (the galaxy’s dots alone draw glows)', () => {
    expect(galaxyMoteFrag).toContain(`const float LIT_CORE = ${BODY_LOOK.litCore};`);
    expect(galaxyMoteFrag.match(/LIT_CORE = /g)).toHaveLength(1);
    // Act I's motes draw no glow, highlight or freeze tint: those forms moved to galaxyMote.frag.glsl.
    expect(moteFrag).not.toMatch(/LIT_CORE|EMBER|vHi|vTint/);
  });

  it('give the glow one profile, in the galaxy’s and the background’s fragment shaders', () => {
    const profile = '(1.0 - smoothstep(0.0, 0.35, r)) + 0.45 * (1.0 - r) * (1.0 - r)';
    expect(moteFrag).not.toContain(profile);
    expect(galaxyMoteFrag).toContain(profile);
    expect(starFrag).toContain(profile);
  });

  it('draw every galaxy dot with galaxyMote.frag.glsl, over its body’s base colour, mote.frag.glsl’s copies as the palette has them', () => {
    const glsl = (hex: string) => hexToRgb(hex).map((c) => (Number.isInteger(c) ? c.toFixed(1) : c.toFixed(7)));
    expect(galaxyMoteFrag).toContain(`const vec3 HUMAN = vec3(${glsl(NODE_PALETTE.NODE_HUMAN).join(', ')});`);
    expect(galaxyMoteFrag).toContain(`const vec3 EMBER = vec3(${glsl(NODE_PALETTE.NODE_EMBER).join(', ')});`);
    expect(galaxyMoteFrag).toContain(`const float EMBER_MIX = ${NODE_EMBER_MIX};`);
    expect(galaxyMoteFrag).toContain(`const float LIT_CORE = ${BODY_LOOK.litCore};`);
    expect(galaxyMoteFrag).toContain('flat in vec3 vBase;');
    expect(galaxyMoteFrag).not.toContain('AGENT');
    const dots = system.object.children.filter((o) => o.name.startsWith('net-') && o.name !== 'net-bodies' && o.name !== 'net-ring' && !o.name.startsWith('net-copy-bodies'));
    expect(dots.length).toBe(14);
    for (const o of dots) expect(((o as Mesh).material as ShaderMaterial).fragmentShader, o.name).toBe(galaxyMoteFrag);
  });
});

describe('the icospheres', () => {
  it('are 320 triangles for a planet, and 80 for a moon', () => {
    const geo = icospheres();
    const part = geo.getAttribute('aPart').array as Float32Array;
    const triangles = [0, 1].map((k) => part.filter((p) => p === k).length / 3);
    expect(triangles).toEqual([320, 80]);
    expect(geo.getAttribute('position').count).toBe(3 * (320 + 80));
    geo.dispose();
  });
});

describe('a moon is a small sphere of its planet’s material (galaxy §1.3)', () => {
  /** A body's shell motes' world diameter, as the shell texture holds it for the shaders (T3.x). */
  const moteWorld = (shell: Float32Array, row: number): number => shell[row * SHELL_TEXELS * 4 + 12];

  it('at the close shot, a moon’s mote is its planet’s on screen at the same depth, within 10 %, on both screens', () => {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      const gs = generateGalaxy(MOTE_SEED, galaxyTier(size.width, size.height), galaxyBudget(MOTE_BUDGET_DESKTOP));
      const data = packBodyData(gs);
      const shell = packShellData(gs, AMBIENT_POSE);
      const c1 = gs.bodies[bodyIndex(gs, 'C1')];
      // The essay's camera on the close shot at the pose, and its CSS px per unit at C1's depth.
      const camera = galaxyShotCamera(GALAXY_SHOTS.close, gs, data, size, AMBIENT_POSE);
      camera.updateMatrixWorld();
      const depth = -new Vector3(...bodyWorld(data, c1.index, AMBIENT_POSE)).applyMatrix4(camera.matrixWorldInverse).z;
      const perUnit = (0.5 * size.height * camera.projectionMatrix.elements[5]) / depth;
      const planet = motePx(moteWorld(shell, c1.index), perUnit);
      const moons = gs.bodies.filter((b) => b.kind === 'moon' && b.host === c1.index);
      expect(moons.length).toBeGreaterThan(0);
      for (const m of moons) expect(Math.abs(motePx(moteWorld(shell, m.index), perUnit) / planet - 1), `${m.id} at ${size.width}x${size.height}`).toBeLessThanOrEqual(0.1);
    }
  });

  it('no moon’s grain is coarser than its planet’s but for rounding its rows (at most 3.5 to 3)', () => {
    const shell = packShellData(g, 0);
    for (const m of g.bodies.filter((b) => b.kind === 'moon')) expect(moteWorld(shell, m.index) / moteWorld(shell, m.host), m.id).toBeLessThanOrEqual(3.5 / 3 + 1e-6);
  });
});

describe('the moon’s draw in the shaders', () => {
  it('sizes every shell and person mote by motePx alone: no floor of a moon’s own (PX_MOON is its point’s, in lod.glsl)', () => {
    expect(shellVert).toContain('float px = motePx(dots.x, pxPerUnit(view) / uPixelRatio);');
    expect(shellVert.match(/motePx\(/g)).toHaveLength(1);
    expect(shellVert).not.toContain('PX_MOON');
    expect(shellVert).not.toContain('PX_MOTE');
  });

  it('hands a moon over by one measure of its size on screen, bodyScreen.glsl’s bodyAcross, in its shell and its icosphere', () => {
    // The shell takes it at the body's place it has already found for the early-out (bodyAcrossAt).
    expect(shellVert).toContain('vec4 home = toView(bodyWorld(row, uAmbient));');
    expect(shellVert).toContain('bodyAcrossAt(row, home)');
    expect(bodyVert).toContain('bodyAcross(row)');
    for (const src of [shellVert, bodyVert]) {
      expect(src).toContain('moonSphereGain(');
      expect(src).not.toContain('pxPerUnit(toView(bodyWorld(');
    }
    const shader = withGalaxyLibrary(GALAXY_INCLUDE_MARKER);
    expect(shader.split('float bodyAcross(int row)')).toHaveLength(2);
    expect(shader.split('float bodyAcrossAt(int row, vec4 view)')).toHaveLength(2);
    expect(shader).toContain('return bodyAcrossAt(row, toView(bodyWorld(row, uAmbient)));');
    expect(shader.indexOf('float bodyAcrossAt(int row, vec4 view)')).toBeGreaterThan(shader.indexOf('float pxPerUnit('));
  });
});

describe('the freeze frame’s forced scatter', () => {
  it('is forced on the held planet only under the hold in a focused frame, as every other freeze term is times net.focus', () => {
    const data = packBodyData(g);
    const size = { width: 390, height: 844 };
    const camera = galaxyShotCamera(GALAXY_SHOTS.close, g, data, size, AMBIENT_POSE);
    const C1 = bodyIndex(g, 'C1');
    const freeze: FreezeFrame = { hero: { planet: C1, moon: bodyIndex(g, 'C1-m1'), forceScatter: true }, live: null, flashOn: false };
    let uniform: { value: number } | undefined;
    system.object.traverse((o) => {
      uniform ??= ((o as Mesh).material as ShaderMaterial | undefined)?.uniforms?.uForcedScatter as { value: number } | undefined;
    });
    if (!uniform) throw new Error('no uForcedScatter uniform');
    const forced = (hold: number, focus: number): number => {
      const s = defaultSceneState();
      s.net = { ...s.net, show: 1, growth: 1, focus };
      s.freeze = { ...s.freeze, hold };
      system.update(s, camera, { ...size, pixelRatio: 1 }, AMBIENT_POSE, freeze);
      return uniform!.value;
    };
    expect(forced(1, 1)).toBe(C1);
    expect(forced(1, 0.5)).toBe(C1);
    expect(forced(1, 0)).toBe(-1);
    expect(forced(0.49, 1)).toBe(-1);
    expect(forced(1, 1)).toBe(C1);
  });
});

describe('the freeze frame’s copies', () => {
  it('add over the frame, as the mock’s (re-skin §4.5: AdditiveBlending over premultiplied colour, One + One); the rest keeps its blend', () => {
    const meshes = system.object.children as Mesh[];
    const copies = meshes.filter((m) => m.name.startsWith('net-copy-'));
    expect(copies.map((m) => m.name).sort()).toEqual(['bodies', 'shells', 'tracks'].flatMap((k) => [1, 2].map((i) => `net-copy-${k}-${i}`)).sort());
    for (const m of copies) {
      const mat = m.material as ShaderMaterial;
      expect(mat.blending, m.name).toBe(AdditiveBlending);
      expect(mat.premultipliedAlpha, m.name).toBe(true);
    }
    // The base piece and the rest of the galaxy keep the screen blend; the ring adds its band as before.
    for (const m of meshes.filter((x) => !x.name.startsWith('net-copy-') && x.name !== 'net-ring')) {
      const mat = m.material as ShaderMaterial;
      expect(mat.blending, m.name).toBe(CustomBlending);
      expect(mat.premultipliedAlpha, m.name).toBe(false);
    }
  });
});

describe('the freeze’s release (re-skin Task 8, from 8b’s review: M7)', () => {
  // The hold lets go at defect 0.405 and the dressing fades out over 0.405-0.421. Then the focused planet's
  // own motion (Task 8b: the forced scatter in every slot, its leak and the dropout) no longer stands down,
  // and the copies, which share the uniforms, would carry it too. The ruling: that reads right, because the
  // fix has landed on C1 by 0.400 (v = 0), and the scatter and the leak are times v and the dropout needs
  // v > 0. So the release draws the mended piece whole, its copies fading, exactly as if the motion still
  // stood down. These hold it, and fail if the keys ever move the fix past the hold.
  const story = loadStory();
  const spans = sectionSpans(story);
  const sampler = new KeyframeSampler(keyframes as unknown as KeyframeFile, spans);
  const span = spans.find((x) => x.id === 'defect')!;
  const stateAt = (local: number) => sampler.sample(span.start + local * (span.end - span.start));
  // The release as the keys have it, not a copy of their numbers: every defect-local point, by 0.0005, where
  // the hold is let go and the dressing still shows (freeze.hold 0, freeze.dress × net.focus > 0). A hold or
  // dressing key that opens the window earlier, or a fix key that lands later, puts an unmended frame in it.
  const RELEASE_STEP = 0.0005;
  const RELEASE = Array.from({ length: Math.round(1 / RELEASE_STEP) + 1 }, (_, k) => k * RELEASE_STEP).filter((l) => {
    const s = stateAt(l);
    return s.freeze.hold === 0 && s.freeze.dress * s.net.focus > 0;
  });
  /** `n` points of the release, evenly over it, its first and last among them. */
  const releasePoints = (n: number): number[] => Array.from({ length: n }, (_, k) => RELEASE[Math.round((k * (RELEASE.length - 1)) / (n - 1))]);
  // Ambients across the hour, a wound's peak, and a second of 30 fps frames from 101 s (dropout cells).
  const AMBIENTS = [...Array.from({ length: 25 }, (_, k) => 7.3 + 143.1 * k), 99.45, 100.2, ...Array.from({ length: 30 }, (_, k) => 101 + k / 30)];
  // Measured alone at load 1.3: 0.84 s (the dropout) and 2.3 s (the twin), over the keys' release. A loaded
  // run here takes up to 8 times its alone time (the test-speed report), so 25 s and 60 s are over 3 times
  // that and over 5 times CI's.
  const DROPOUT_TIMEOUT = 25_000;
  const TWIN_TIMEOUT = 60_000;

  it('lands the fix on C1 before the hold lets go: v = 0 through the release, the dressing still up', () => {
    const { g: dg, data } = galaxyOf();
    const C1 = dg.ids.C1;
    // The window is the keys' (today 0.405 to 0.4205), one stretch, after the cut.
    expect(RELEASE.length, 'a release to look at').toBeGreaterThan(10);
    expect(RELEASE.every((l, i) => i === 0 || Math.abs(l - RELEASE[i - 1] - RELEASE_STEP) < 1e-9), 'one stretch').toBe(true);
    for (const l of RELEASE) expect(1 - bodyLight(C1, stateAt(l).net, data).fix, `C1's v at ${l}`).toBe(0);
    // The last held frame before it is mended already.
    const lastHeld = RELEASE[0] - RELEASE_STEP;
    expect(stateAt(lastHeld).freeze.hold, `held at ${lastHeld}`).toBe(1);
    expect(1 - bodyLight(C1, stateAt(lastHeld).net, data).fix).toBe(0);
  });

  it('draws no dropout line on the piece through the release, at any ambient; with the fix withheld it would', () => {
    const data = packBodyData(g);
    const size = { width: 390, height: 844 };
    const C1 = bodyIndex(g, 'C1');
    const freeze: FreezeFrame = { hero: { planet: C1, moon: bodyIndex(g, 'C1-m5'), forceScatter: true }, live: null, flashOn: false };
    let withheld = 0;
    for (const l of releasePoints(5))
      for (const t of AMBIENTS) {
        const camera = galaxyShotCamera(GALAXY_SHOTS.close, g, data, size, t);
        const s = stateAt(l);
        system.update(s, camera, { ...size, pixelRatio: 1 }, t, freeze);
        expect(system.dropout(), `defect ${l}, ambient ${t}`).toBeNull();
        const unfixed = { ...s, net: { ...s.net, fix: 0 } };
        system.update(unfixed, camera, { ...size, pixelRatio: 1 }, t, freeze);
        if ((system.dropout()?.lines.length ?? 0) > 0) withheld++;
      }
    expect(withheld, 'frames with lines had the fix not landed').toBeGreaterThan(0);
  }, DROPOUT_TIMEOUT);

  it('draws the piece and both copies as if the motion stood down: no scatter, no leak, at any ambient; with the fix withheld they would differ', () => {
    const { g: dg, data, motes } = galaxyOf();
    const C1 = dg.ids.C1;
    const moon = dg.ids['C1-m5'];
    const rows = [C1, ...dg.bodies.filter((b) => b.kind === 'moon' && b.host === C1).map((b) => b.index)];
    const piece = rows.flatMap((row) => motes[row]);
    expect(piece.length).toBeGreaterThan(100);
    let moved = 0;
    // Every mote of the piece is a bodyMote() a copy a frame: the release's two ends and its middle, at
    // five ambients across the hour, a wound's peak, the slot after and a dropout second.
    for (const l of releasePoints(3))
      for (const t of [7.3, 579.7, 1295.2, 2153.8, 3012.4, 99.45, 100.2, 101.5])
        for (const fix of [null, 0]) {
          const s = stateAt(l);
          const net = fix === null ? s.net : { ...s.net, fix };
          const clocks = (copy: 0 | 1 | 2): BodyClocks => ({
            growth: net.growth,
            fix: net.fix,
            highlight: net.highlight,
            show: net.show,
            ambient: t,
            focus: net.focus,
            lamp: Math.round(net.lamp),
            lampRow: lampFocusRow(net.lampAt, dg),
            sysPx: new Float32Array(32).fill(1e4),
            forcedScatter: -1,
            holding: false,
            freeze: { dress: s.freeze.dress, flash: s.freeze.flash, copy, moon, planet: C1 },
          });
          // The shells as bodySystem packs them: the focus's forced row, the leak unless held (the copy packs nothing of its own).
          const c0 = clocks(0);
          if (fix === null) expect(focusScatterRow(c0, data), 'the motion is back in name').toBe(C1);
          const live = { ...data, shells: packShellData(dg, t, focusScatterRow(c0, data), true) };
          const still = { ...data, shells: packShellData(dg, t, focusScatterRow({ ...c0, holding: true }, data), false) };
          for (const copy of [0, 1, 2] as const) {
            const c = clocks(copy);
            const down: BodyClocks = { ...c, holding: true };
            for (const a of piece) {
              const x = bodyMote(a, c, live);
              const y = bodyMote(a, down, still);
              const off = Math.hypot(x.pos[0] - y.pos[0], x.pos[1] - y.pos[1], x.pos[2] - y.pos[2]);
              const dim = Math.abs(x.brightness - y.brightness);
              if (fix === null) {
                expect(off, `defect ${l}, ambient ${t}, copy ${copy}`).toBeLessThan(1e-9);
                expect(dim, `defect ${l}, ambient ${t}, copy ${copy}`).toBeLessThan(1e-9);
                expect(x.visible).toBe(y.visible);
              } else if (off > 1e-3 || dim > 1e-3) moved++;
            }
          }
        }
    expect(moved, 'motes moved or dimmed by the motion had the fix not landed').toBeGreaterThan(0);
  }, TWIN_TIMEOUT);
});

describe('the neighbourhood’s dissolve (re-skin §4.1)', () => {
  const data = packBodyData(g);
  const size = { width: 390, height: 844 };
  const shells = buildShellAttrs(g);
  const persons = buildPersonAttrs(g);
  const glows = buildGlowAttrs(g);
  const spikes = buildSpikeAttrs(g);
  /** The body set drawn at a probe shot, everything up and lit, with the beats' hold at `hold`; its early-out frame. */
  const drawAt = (shot: keyof typeof GALAXY_SHOTS, hold: number) => {
    const camera = galaxyShotCamera(GALAXY_SHOTS[shot], g, data, size, AMBIENT_POSE);
    const s = defaultSceneState();
    s.net = { ...s.net, show: 1, growth: 1, hoodHold: hold };
    system.update(s, camera, { ...size, pixelRatio: 1 }, AMBIENT_POSE);
    return system.earlyOut()!;
  };
  const kindOf = (row: number) => g.bodies[row].kind;

  it('reads one plain glow per star at its place: the far form only at the galaxy wide, the real form only at the hood shot', () => {
    drawAt('galaxyWide', 0);
    const wide = system.hood();
    // Every star, a binary's two each at its own place, with its unit (one far form per unit).
    expect(wide).toHaveLength(g.systems.length);
    expect(wide.map((s) => s.unit)).toEqual(unitIndexOf(g));
    for (const s of wide) {
      expect(s.glowPx).toBe(5); // the phone's galaxy wide: every star at the glow's floor
      expect(s.real).toBe(0);
    }
    // No star's glow is drawn, nor a spike (and the core has no glow since the re-skin's Task 5).
    expect(system.glows()).toHaveLength(0);
    expect(system.spikes()).toEqual([]);
    drawAt('hood', 0);
    for (const s of system.hood()) expect(s.real).toBe(1);
    // Under a beat's hold the real form is whole at the wide too (HOOD_LOD.beatsHold).
    drawAt('galaxyWide', 1);
    for (const s of system.hood()) expect(s.real).toBe(1);
    expect(system.glows().length).toBeGreaterThan(0);
  });

  it("a binary's two stars dissolve as one, at their barycentre, where the pair's far star stands (re-skin Task 1e)", () => {
    const pairs = [...new Set(unitIndexOf(g))].map((u) => g.systems.filter((_, i) => unitIndexOf(g)[i] === u)).filter((rows) => rows.length === 2);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
    // Back off the hood shot until the pair is part way through its hand-over.
    const frameAt = (distance: number) => {
      const camera = galaxyShotCamera({ ...GALAXY_SHOTS.hood, distance }, g, data, size, AMBIENT_POSE);
      const s = defaultSceneState();
      s.net = { ...s.net, show: 1, growth: 1, hoodHold: 0 };
      system.update(s, camera, { ...size, pixelRatio: 1 }, AMBIENT_POSE);
      return system.earlyOut()!;
    };
    const unit = unitIndexOf(g);
    let mid = 0;
    for (let distance = 40; distance < 4000 && mid === 0; distance *= 1.04) {
      const f = frameAt(distance);
      const hood = system.hood();
      for (const [i, s] of hood.entries()) {
        // The early-out's twin of the shaders' share is the hook's, star by star.
        expect(bodyHoodReal(f, data, g.systems[i]), `star ${i} at ${distance}`).toBeCloseTo(s.real, 12);
        // A binary's two stars, at their two places, share one real form.
        const other = hood.findIndex((o, j) => j !== i && unit[j] === unit[i]);
        if (other >= 0) {
          expect(s.real).toBe(hood[other].real);
          expect([s.x, s.y]).not.toEqual([hood[other].x, hood[other].y]);
          if (s.real > 0.05 && s.real < 0.95) mid++;
        }
      }
    }
    expect(mid, 'a pair seen part way through its hand-over').toBeGreaterThan(0);
  });

  it('a neighbourhood star’s glow, shells, person motes and spikes carry the real form’s share; planets, moons and core rows do not', () => {
    // At the wide with no hold, every instance of every star skips (hoodSkip: each is drawn times its
    // share, 0 there); with the hold whole, the same frame's planets, moons and core bodies skip exactly
    // as they did, and the stars' do not all.
    const skips = (f: ReturnType<typeof drawAt>) => ({
      shells: Array.from({ length: shells.count }, (_, k) => shellSkips(f, data, ...(Array.from(shells.mote.subarray(4 * k, 4 * k + 4)) as [number, number, number, number]))),
      persons: Array.from({ length: persons.count }, (_, k) => shellSkips(f, data, ...(Array.from(persons.mote.subarray(4 * k, 4 * k + 4)) as [number, number, number, number]))),
      glows: Array.from({ length: glows.count }, (_, k) => shellSkips(f, data, ...(Array.from(glows.mote.subarray(4 * k, 4 * k + 4)) as [number, number, number, number]))),
      spikes: Array.from({ length: spikes.count }, (_, k) => spikeSkips(f, data, spikes.spike[4 * k], spikes.spike[4 * k + 2], spikes.spike[4 * k + 3])),
    });
    const far = skips(drawAt('galaxyWide', 0));
    const held = skips(drawAt('galaxyWide', 1));
    const rowOf = { shells: shells.mote, persons: persons.mote, glows: glows.mote, spikes: spikes.spike } as const;
    let stars = 0;
    let starsHeldDrawn = 0;
    for (const set of ['shells', 'persons', 'glows', 'spikes'] as const) {
      far[set].forEach((skip, k) => {
        const row = rowOf[set][4 * k];
        if (kindOf(row) === 'star') {
          stars++;
          expect(skip, `${set} ${k}`).toBe(true);
          if (!held[set][k]) starsHeldDrawn++;
        } else expect(held[set][k], `${set} ${k} (${kindOf(row)})`).toBe(skip);
      });
    }
    expect(stars).toBeGreaterThan(30 * 160);
    // Held whole, the stars' glows at least come back (their dots are faded into the glow at the wide).
    expect(starsHeldDrawn).toBeGreaterThanOrEqual(30);
  });

  it('multiplies the share into each gain the shaders compare with LOD_VISIBLE, and computes it once per body', () => {
    const lib = withGalaxyLibrary(shellVert);
    expect(lib.split('float bodyHoodReal(int row, int kind, vec4 view)')).toHaveLength(2);
    expect(shellVert).toContain('float real = bodyHoodReal(row, kind, home);');
    expect(shellVert).toContain('* focusGain(row) : 0.0) * real;');
    expect(shellVert).toContain('float gain = real;');
    expect(spikeVert).toContain('* focusGain(row) : 0.0) * real;');
    // The early-out's hoodSkip comes before the heavy path (bodyMote()). A spike needs none of its own:
    // a star with no real form draws no glow, so its cap (uGlowCap) is 0 and its spikes skip on it.
    expect(shellVert.indexOf('hoodSkip(kind, real)')).toBeLessThan(shellVert.indexOf('bodyMote(a)'));
  });
});

describe('the shadow stays black (re-skin §4.2)', () => {
  const discard = 'if (uShadow.z > 0.0 && distance(gl_FragCoord.xy, uShadow.xy) < uShadow.z) discard;';

  it('every galaxy fragment shader discards inside the shadow’s disc, before it draws anything', () => {
    for (const [name, frag] of [
      ['galaxyMote.frag', galaxyMoteFrag],
      ['body.frag', bodyFrag],
      ['ring.frag', ringFrag],
      ['star.frag', starFrag],
      ['hole.frag', holeFrag],
    ] as const) {
      expect(frag, name).toContain('uniform vec3 uShadow;');
      expect(frag, name).toContain(discard);
      expect(frag.indexOf(discard), name).toBeLessThan(frag.indexOf('outColor ='));
    }
  });

  it('every material of the body set reads the one shared uniform', () => {
    const materials = system.object.children.map((o) => (o as Mesh).material as ShaderMaterial);
    expect(materials.length).toBeGreaterThan(10);
    for (const m of materials) expect(m.uniforms.uShadow).toBe(shadow);
  });
});

describe("the plans' meshes (re-skin §4.7, Task 7b)", () => {
  const data = packBodyData(g);
  for (const size of [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ]) {
    it(`draw what the twin draws, the two largest systems in R, ${size.width}x${size.height}`, () => {
      for (const shot of ['hood', 'system', 'twelve'] as const) {
        const camera = galaxyShotCamera(GALAXY_SHOTS[shot], g, data, size, AMBIENT_POSE);
        const s = defaultSceneState();
        s.net = { ...s.net, show: 1, growth: 1 };
        system.update(s, camera, { ...size, pixelRatio: 1 }, AMBIENT_POSE);
        const stats = system.plan();
        const f = planFrameAt(g, data, camera, size, { growth: 1, fix: 0, highlight: 0, show: 1, ambient: AMBIENT_POSE, focus: 0, lamp: s.net.lamp, lampRow: -1 });
        expect(stats.dots, shot).toBe(planPixels(g, data, f).length);
        expect(stats.dots, shot).toBeGreaterThan(300);
        // R by the culled size's lead over the third (spec §4.7, at most two systems in R): the largest
        // in R, the third and every later one at 0.
        const culled = Array.from({ length: g.systems.length }, (_, i) => [f.sys[i * 4] * f.sys[i * 4 + 2], f.sys[i * 4 + 1], i]).sort((a, b) => b[0] - a[0] || a[2] - b[2]);
        expect(culled[0][1], shot).toBeGreaterThan(0);
        for (const [, full] of culled.slice(2)) expect(full, shot).toBe(0);
        for (let k = 1; k < culled.length; k++) expect(culled[k][1]).toBeLessThanOrEqual(culled[k - 1][1]);
        expect(stats.slots).toEqual(
          Array.from({ length: g.systems.length }, (_, i) => i)
            .filter((i) => f.sys[i * 4 + 1] > 0)
            .slice(0, 2)
            .concat([-1, -1])
            .slice(0, 2),
        );
        // The early-out counts its skips, mesh by mesh.
        const skipped = system.skipped();
        expect(skipped['net-plan'], shot).toBeGreaterThan(0);
        expect(skipped['net-plan'] + stats.dots, shot).toBeLessThanOrEqual(system.counts.plan + system.counts.planScreen);
      }
      // P_a's system shot: P_a in R, its bands and outlines drawn.
      const camera = galaxyShotCamera(GALAXY_SHOTS.system, g, data, size, AMBIENT_POSE);
      const s = defaultSceneState();
      s.net = { ...s.net, show: 1, growth: 1 };
      system.update(s, camera, { ...size, pixelRatio: 1 }, AMBIENT_POSE);
      const stats = system.plan();
      expect(stats.slots[0]).toBe(g.systems.indexOf(g.ids.P_a));
      expect(stats.byMark.bandEdge).toBeGreaterThan(300);
      expect(stats.byMark.silhouette).toBeGreaterThan(10);
      expect(stats.byMark.numeral).toBeGreaterThan(10);
    });
  }
});
