p = 'docs/superpowers/plans/2026-10-08-act-2-galaxy.md'
s = open(p).read()


def rep(a, b, count=1):
    global s
    assert s.count(a) == count, (s.count(a), a[:60])
    s = s.replace(a, b)


# Spec list: §15 is binding.
rep(
    "Binding: §14 (revision 6), §13 (revision 5)",
    "Binding: §15 (revision 7, streams only when the story needs them), §14 (revision 6), §13 (revision 5)",
)

# Global constraint.
rep(
    "- **Level of detail by projected px**",
    "- **Streams only on lineage beats** (galaxy §15). The lineage streams and the reviewer's feed are scaled by the story leaf `net.streams`, never by the level of detail.\n"
    "  - `net.streams` is 1 only on ly-1, ly-5, up-1, re-3, tr-1, tr-2 and fx-4, and 0 everywhere else, the whole zoom-out included.\n"
    "  - Shown streams are 1 px dots, one per 1.2 units of chord, capped at `STREAM_CAP` 0.3 of a star glow's core, and faded `mix(1, 0.15, u)` from parent to child.\n"
    "  - Their control point sits 0.10 of the chord off the midpoint. Their dots flow on the ambient clock.\n"
    "  - A builder's flight is not a stream and is never gated.\n"
    "- **Level of detail by projected px**",
)

# Task 6: modify list.
rep(
    "  - `src/autoAdvance/plan.ts`: `sceneMotion` adds `net.focus`\n  - the parity files (`?lib=body`)\n  - `e2e/galaxy.spec.ts`\n",
    "  - `src/autoAdvance/plan.ts`: `sceneMotion` adds `net.focus` and `net.streams`\n"
    "  - `src/timeline/sceneState.ts` also gets `net.streams` (0..1, default 0)\n"
    "  - `src/scene/node/stream.ts` and `stream.test.ts`: the dot flow moves from `uClock` to `uAmbient`; `streamGain` is added\n"
    "  - `src/timeline/galaxyShots.ts`: `STREAM_BEATS`\n"
    "  - `src/scene/node/birth.ts`: `STREAM_CAP`, `STREAM_FADE`, `STREAM_PITCH`, `STREAM_BOW`\n"
    "  - the parity files (`?lib=body`, and the stream dot's gain inside it)\n"
    "  - `e2e/galaxy.spec.ts`\n",
)

# Task 6: interfaces.
rep(
    "  export function lampGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number; // 0 outside, 0.3 floor inside for non-subject at focus 1\n  ```\n",
    "  export function lampGain(row: number, c: Pick<BodyClocks, 'lamp' | 'lampRow' | 'focus'>, data: BodyData): number; // 0 outside, 0.3 floor inside for non-subject at focus 1\n"
    "  // stream.ts (stream.vert.glsl mirrors it; galaxy §15)\n"
    "  export const STREAM_CAP = 0.3, STREAM_FADE = [1, 0.15] as const, STREAM_PITCH = 1.2, STREAM_DOTS = [6, 40] as const, STREAM_BOW = 0.10;\n"
    "  export function streamDotU(k: number, ambient: number): number;            // fract(k + NODE_STREAM_SPEED · ambient)\n"
    "  export function streamGain(u: number, streams: number, lamp: number): number; // streams · lamp · STREAM_CAP · mix(1, 0.15, u); 0 when streams = 0\n"
    "  // galaxyShots.ts\n"
    "  export const STREAM_BEATS = ['ly-1', 'ly-5', 'up-1', 're-3', 'tr-1', 'tr-2', 'fx-4'] as const; // galaxy §15.1: net.streams = 1 on these, 0 on every other Act II beat\n"
    "  ```\n"
    "  **The streams** (galaxy §15.2):\n"
    "  - Each stream and the feed is drawn as 1 px dots (pixel floor and cap both 1), `round(chord / 1.2)` of them, clamped to [6, 40].\n"
    "  - A dot's brightness is `streamGain(u, net.streams, lampGain)`. It is ember while the stream carries the defect (its `hiAt`, out as its child's fix lands), and capped the same when lit.\n"
    "  - `net-streams` and `net-feed` are invisible, not drawn, while `net.streams` is 0.\n",
)

# Task 6: unit tests.
rep(
    "  - `netTrack.test.ts`: `lampFocusRow` for each kind of target.\n  - `review.test.ts`: re-pin `ringAt` to the visit's `bodyWorld` at three ambients.\n",
    "  - `netTrack.test.ts`: `lampFocusRow` for each kind of target.\n"
    "  - `review.test.ts`: re-pin `ringAt` to the visit's `bodyWorld` at three ambients.\n"
    "  - `stream.test.ts`:\n"
    "    - `streamGain(u, 0, 1)` is 0 for every `u`\n"
    "    - `streamGain` falls monotonically along `u`, `streamGain(0, 1, 1) = STREAM_CAP` and `streamGain(1, 1, 1) = 0.15 · STREAM_CAP`\n"
    "    - no lit or unlit dot exceeds `STREAM_CAP`\n"
    "    - the dots move with ambient and not with scroll: same `uAmbient`, any `uClock`, same positions\n",
)

# Task 6: e2e tests.
rep(
    "test('a healthy planet is a sphere and a cracked one breathes', ...); // close shot, ambient 0 vs 0.5: diff inside a healthy planet's rect only from orbital motion masked by the twin; cracked > 0\n```\n",
    "test('a healthy planet is a sphere and a cracked one breathes', ...); // close shot, ambient 0 vs 0.5: diff inside a healthy planet's rect only from orbital motion masked by the twin; cracked > 0\n"
    "test('streams are off by default', ...); // system probe, growth 0.2, net.streams 0: net-streams and net-feed not in drawStats().visible; the frame equals the frame with both meshes forced hidden\n"
    "test('streams are quiet when shown', ...); // system probe, net.streams 1 vs 0: no pixel of the difference above 96 in any channel (both sizes);\n"
    "                                          // the brightest stream px in the parent-end 10 % of each stream ≥ 3× the child-end 10 % (from the twin's projected endpoints)\n"
    "```\n",
)

# Task 6: stills.
rep(
    "`T6-hood-lit` (highlight 0.3). Retired: nothing. Re-pinned: `src/network/review.test.ts` for ambient, because the ring now tracks moving visits.",
    "`T6-hood-lit` (highlight 0.3), `T6-system-streams` (net.streams 1) beside `T6-system-nostreams` (net.streams 0). Retired: nothing. Re-pinned:\n"
    "  - `src/network/review.test.ts`, for ambient: the ring now tracks moving visits.\n"
    "  - `src/scene/node/stream.test.ts`'s `fract(aK + NODE_STREAM_SPEED * uClock)` assertion becomes `uAmbient`: galaxy §15 moves the dot flow to the ambient clock.\n"
    "  - `nodeSystem.test.ts`'s `DOT_SPACING` 0.6 assertion stays for the old network, which Task 8 deletes.",
)

# Task 8: zoom-out keys.
rep(
    "  - `net.growth` 0 → 0.12, with B1 and B2 born in frame.\n- **Every other Act II section** holds `PROVISIONAL` with lamp 3 and keeps its current `net.*` clock keys.\n",
    "  - `net.growth` 0 → 0.12, with B1 and B2 born in frame.\n"
    "  - `net.streams` 0 throughout (galaxy §15).\n"
    "- **Every other Act II section** holds `PROVISIONAL` with lamp 3 and `net.streams` 0, and keeps its current `net.*` clock keys.\n",
)
rep(
    "  - `networkKeys.test.ts`: re-pointed at `src/galaxy/*`; the schedule fence (test 5) and twelve (test 4) hold on the galaxy.\n",
    "  - `networkKeys.test.ts`: re-pointed at `src/galaxy/*`; the schedule fence (test 5) and twelve (test 4) hold on the galaxy.\n"
    "  - `networkKeys.test.ts`, **\"streams follow the story\"**: `net.streams` ≥ 0.99 at the hold middle of every keyed beat in `STREAM_BEATS` and ≤ 0.01 at every other keyed Act II beat. It covers zoom-out now, and each later keyframe task adds its sections.\n"
    "  - `galaxy.spec.ts`, **\"no stream pixels in the zoom-out\"**: at zoom-out 0.10, 0.25, 0.40, 0.55, 0.75 and 1.0 on both sizes, `net-streams` and `net-feed` are absent from `drawStats().visible`.\n",
)

# Task 9 keys.
rep(
    "- Moves ride the page turns, as built.\n- `net.growth` keeps the end values 0.23 (layers) and 0.27 (far).\n",
    "- Moves ride the page turns, as built.\n"
    "- `net.streams` (galaxy §15.1), fades on the page turns:\n"
    "  - 1 under ly-1\n"
    "  - 0 under ly-2, ly-3 and ly-4\n"
    "  - 1 under ly-5\n"
    "  - 0 by ly-6's full ink: fading over ly-6's transit-in, done before ly-6's stop\n"
    "  - 0 under fr-1\n"
    "- `net.growth` keeps the end values 0.23 (layers) and 0.27 (far).\n",
)
rep(
    "  - `networkKeys.test.ts` (test 6, re-pinned): one stop per scene, with stops for ly-5 and ly-6 both at rest. Every layers and far stop is at rest in the motion leaves.\n",
    "  - `networkKeys.test.ts` (test 6, re-pinned): one stop per scene, with stops for ly-5 and ly-6 both at rest. Every layers and far stop is at rest in the motion leaves, `net.streams` included.\n"
    "  - `networkKeys.test.ts`, \"streams follow the story\": extended to layers and far.\n",
)

# Task 10 keys.
rep(
    "Defect and spread leave `PROVISIONAL`.\n",
    "`net.streams` (galaxy §15.1), fades on the page turns:\n"
    "- 0 through the defect section\n"
    "- 1 under up-1, from the follow's start; the up-stream C7 → R1 is lit ember\n"
    "- 0 through the wordless second fix and up-2\n\n"
    "Defect and spread leave `PROVISIONAL`.\n",
)
rep(
    "    - the second fix lies between up-1's stop and up-2's\n",
    "    - the second fix lies between up-1's stop and up-2's\n"
    "    - \"streams follow the story\" extended to defect and spread\n",
)

# Task 11 keys.
rep(
    "| ls-1 | (10, 80, 40, 40, 0; core) | 3 | |\n",
    "| ls-1 | (10, 80, 40, 40, 0; core) | 3 | |\n\n"
    "`net.streams` (galaxy §15.1), fades on the page turns:\n"
    "- 0 under re-1 and re-2\n"
    "- 1 under re-3: the feed comes up, times its own `feedAlpha`\n"
    "- 1 under tr-1 and tr-2: the climb and the surge\n"
    "- 0 under fx-1, fx-2 and fx-3\n"
    "- 1 under fx-4: the sweep\n"
    "- 0 under ls-1\n",
)
rep(
    "    - \"no Act II section uses `PROVISIONAL`\"\n",
    "    - \"no Act II section uses `PROVISIONAL`\"\n"
    "    - \"streams follow the story\" now covers every Act II beat\n",
)

# Task 13: per-beat stream check.
rep(
    "test('budget (test 16)', ...);",
    "test('streams only on lineage beats', ...);         // at every Act II beat midpoint: net-streams/net-feed visible iff the beat is in STREAM_BEATS; where visible, the quiet test's 96 cap holds\n"
    "test('budget (test 16)', ...);",
)

# Self-review coverage.
rep(
    "| rev 2 lamp | 6 |\n",
    "| rev 2 lamp | 6 |\n| galaxy §15 streams (leaf, cap, fade, ambient flow) | 6, keyed in 8–11, checked in 13 |\n",
)

open(p, 'w').write(s)
print('ok')
