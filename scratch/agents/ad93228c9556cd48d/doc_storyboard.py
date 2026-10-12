"""Task 16: rewrite the storyboard's §2.1 (vibe-build) and §2.2 (reveal) tables for the new timing."""

PATH = "docs/specs/2026-10-04-act-1-storyboard-and-text-engine.md"
text = open(PATH).read()


def replace_between(text: str, start: str, end: str, new: str) -> str:
    a = text.index(start)
    b = text.index(end, a)
    return text[:a] + new + text[b:]


VB = """### 2.1 vibe-build (L = 6.4, fade 0.015625)

*Amended 2026-10-05: this is docs/specs/2026-10-05-act-1-build-and-orbit.md §2.1 as built (each
row there gives screens and local; here local comes first, then screens). The front wheel's turn is
its own segment, and the frame is laid tube by tube (that document's §3). S4 is retired with the
brakes line. Amended again 2026-10-05 (the author: "bring the 3d animation up to happen at the same
time as the text"): a brief line's parts set out the moment the line comes up, with no reading-time
lead, and the camera is in place before the line appears; vb-3 is cut (no colour or dot words in Act
I). The section goes 8 → 6.4 screens.*

| Beat | Page | Appears → leaves (local, then screens) | Camera | Motion while it is up |
|---|---|---|---|---|
| vb-1 | 1 | 0 (no fade-in: the essay opens on it) → dims at 0.046875 | S0: target whole, bearing 50, elev 10, d 6.0, fov 40, frame 0. The spawn shell fills the frame as a starfield. | assembly 0, drive 0, steer 0, variant 1, vibed 1. Nothing moves. |
| vb-2 | 1 | 0.046875 (0.30 screens) → page out ends 0.125 | S0 → S1 over 0.046875–0.125 (the camera comes down into the cloud as the list is handed over). | As above. |
| vb-brief | 2 | 0.125 (0.80 screens) → page out ends 0.84375. Only the ask is on the page until line 1 comes up. | S1: target whole, bearing 55, elev 8, d 4.6, fov 40, frame 0. Holds to 0.25. | assembly 0: the shell drifts, nothing has set out. |
| line 1 appears (seat, bars) | 2 | 0.171875 (1.10), up from nothing over one fade as its parts set out | S1. | assembly 0 → 0.45 over 0.171875–0.25 (1.10–1.60): the core flies in (saddle, bars, pedals) as the line comes up. drive 0. |
| line 1 lights | 2 | 0.248 (1.59; threshold 0.44) | S1 holds to 0.25, → S2 over 0.25–0.296875 (1.60–1.90): target (0.5, 0.4), bearing 95, elev 12, d 3.2, fov 38, frame 1, in place before line 2. | assembly 0.45 held. |
| line 2 appears (wheels, chain) | 2 | 0.296875 (1.90) | S2. | assembly 0.45 → 0.61 over 0.296875–0.3671875 (1.90–2.35): both wheels, the cranks and the chain. drive 0 → 2.0 over 0.3203125–0.421875 (2.05–2.70, two crank turns); `mech.steer` cancels the drive's own swing so the front wheel stays straight. |
| line 2 lights | 2 | 0.363 (2.32; threshold 0.60) | S2 holds to 0.421875, → S3 over 0.421875–0.46875 (2.70–3.00): target (0.95, 0.5), bearing 50, elev 20, d 3.0, fov 36, frame 1, in place before line 3. | drive turning to 0.421875, then held at 2.0. |
| line 3 appears (front wheel) | 2 | 0.46875 (3.00) | S3. | assembly 0.61 → 0.73 over 0.46875–0.5234375 (3.00–3.35): the fork with its basket and headlamp. drive 2.0 held. |
| line 3 lights | 2 | 0.519 (3.32; threshold 0.72) | S3. | Still. |
| the turn | 2 | 0.5390625–0.6328125 (3.45–4.05); no text changes | S3 holds. | `mech.steer` 0 → +1 at 0.5625 → −1 at 0.609375 → 0 at 0.6328125, inOutQuad each leg: straight, one lock, the other, straight. Nothing else moves. |
| line 4 appears (frame) | 2 | 0.6875 (4.40) | S3 → S1 over 0.6328125–0.6875 (4.05–4.40), in place as the line comes up; then a linear lean-in S1 → S1′ over 0.6875–0.8046875. | assembly 0.73 → 0.98 over 0.6875–0.8046875 (4.40–5.15): the frame laid tube by tube, the fittings last; → 1 at 0.8125 (5.20). drive 2.0 held. |
| line 4 lights | 2 | 0.800 (5.12; threshold 0.97); the page leaves whole over 0.828125–0.84375 | S1′ holds from 0.8046875. | assembly 1. |
| vb-4 | 3 | 0.84375 (5.40 screens) → fade-out ends 1.00 | The lap: S1′ → one full circuit → S1′ (2026-10-05 §4). | drive 2.0 → 2.4: the bike rides as the camera goes round. |

"""

RV = """### 2.2 reveal (L = 3.2, fade 0.03125)

*Amended 2026-10-05 (the author): rv-6 is cut (no colour or dot words in Act I). rv-1 to rv-4 keep
their screens; rv-5 comes up 0.08 screen sooner (the S7 hold is that much shorter) so it and rv-7
each keep their reading time, and the section goes 4 → 3.2 screens. The slow push-in that was rv-6's
now plays under rv-7.*

| Beat | Page | Appears → leaves | Camera | Motion |
|---|---|---|---|---|
| rv-1 | 1 | 0.00 → dims at 0.175 | S1′ (continuous from the cold open) holds to 0.175. | drive 2.0 → 2.6 over 0–0.175: the cranks and both wheels turn; natural steer 0 → −0.8, so the front wheel visibly turns as the line says. |
| rv-2 | 1 | 0.175 → page out ends 0.325 | → S5 over 0.175–0.325: the camera rises to the reveal shot. S5: target whole, bearing 40, elev 30, d 4.0, fov 33, frame 0 (within the pinned bounds: bearing 30–60, elev ≥ 20, fov ≤ 33). | drive 2.6 → 2.9 (natural steer → −0.99, near full lock): the bike arrives at the still with its saddle cocked over the front wheel. |
| rv-3 | 2 | 0.325 → dims at 0.5125 | → S6 over 0.325–0.375. S6: target `MAST_MOUNT`, bearing 30, elev 28, d 1.3, fov 33, frame 1: the saddle on its mast, the basket and front wheel under it. Nothing stands above the saddle, so the band above is empty. | steer swing: 0 at 0.3625, +2 at 0.43125, 0 at 0.5 (total −1 → +1 → −1): the saddle turns with the wheel, twice, while the line is up. drive 2.9 held (the still). |
| rv-4 | 2 | 0.5125 → page out ends 0.625 | → S7 over 0.5125–0.5625. S7: target `STUB_TOP`, bearing 150, elev 30, d 1.6, fov 33, frame 1: the bars on the stub in the foreground, the mast, saddle and cocked front wheel beyond. | drive 2.9 → 3.0 over 0.5125–0.625 (natural steer reaches exactly −1 at drive 3); steer 0. The bars stay square while the saddle and wheel sit at lock. |
| rv-5 | 3 | 0.625 → page out ends 0.825 | → S5 over 0.625–0.675 (the whole twin; the top tube's climb reads from here, ≥ 15° on screen as pinned). | drive 3.0 held to the end of the section. Steer at lock. Still life. |
| rv-7 | 4 | 0.825 → fade-out ends 1.00 | S5, drifting to bearing 45, d 3.8 over 0.825–0.925 (a slow push-in, nothing more), then holds. | Still. |

"""

text = replace_between(text, "### 2.1 vibe-build (L = 8", "### 2.2 reveal", VB)
text = replace_between(text, "### 2.2 reveal (L = 4", "### 2.3 rewind", RV)
open(PATH, "w").write(text)
print("ok")
