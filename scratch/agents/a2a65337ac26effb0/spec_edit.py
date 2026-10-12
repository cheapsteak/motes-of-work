import sys

p = 'docs/specs/2026-10-02-motes-of-work-design.md'
s = open(p).read()


def swap(old, new):
    global s
    if s.count(old) != 1:
        sys.exit('not exactly one match: ' + old[:60])
    s = s.replace(old, new)


swap(
    "| Wrong twin | **The saddle and handlebars swap posts**: a fully working bike, every test green, that no one could ride. It follows from a plausible bulleted brief (§4, I.1) |",
    "| Wrong twin | **The saddle and handlebars swap posts, and the frame is built around the swap**: the saddle is welded to the top of a tall steering mast, the handlebars clamp to a stub of seat tube, and the top tube climbs from the stub to the mast. A fully working bike, every test green, that no one could ride, and that no spanner could put right: fixing it means a new frame. It follows from a plausible bulleted brief (§4, I.1) |",
)

swap(
    "The running bike is the **wrong twin**: the saddle is on the steering column and the handlebars stick out of the seat tube. Gist:",
    "The running bike is the **wrong twin**, and its frame is shaped around the mistake: the saddle is welded to the top of a tall mast that rises from the head tube and steers, the handlebars stick out of a stub where the seat tube should be, and the top tube climbs to the front to meet the mast, so the still reads as a new frame to fix, not a part to turn. Gist:",
)

swap(
    "A dim grey **mannequin** fades in for this section only: seated in an ordinary riding pose on the saddle over the front wheel, its hands closed on empty air where the handlebars should be and its feet hanging well ahead of the pedals",
    "A dim grey **mannequin** fades in for this section only: seated on the saddle atop the mast, over the front wheel, thighs level and shanks hanging either side of the wheel, its hands closed on empty air where the handlebars should be and its feet hanging well ahead of the pedals and clear of the ground",
)

swap(
    "**Wrong twin.** The saddle assembly and the handlebar assembly swap posts: the saddle rides the steering column and turns with the fork; the handlebars are fixed in the seat tube. Every other part keeps its pose and shape, so the variant morph reads as the two warm assemblies trading places.",
    "**Wrong twin.** The saddle assembly and the handlebar assembly swap posts, and the frame is built around the swap, so a reader sees at a glance that fixing it means a new frame, not turning a part (wrong specs harden into structure). The head tube runs on up as a tall mast; the steering column inside it carries the saddle, welded on a cradle at its top (no seat post, no clamp), so the saddle turns with the fork. The seat tube is cut to a stub a little above where the top tube and stays meet it, and the handlebars clamp into that stub through a short stem: low, behind the rider, square, never turning. The top tube climbs from the stub up to the mast, the opposite slope to the correct frame's nearly level one, and is the whole-frame cue from the reveal camera (at least 15° of rise on screen). The brake cables are committed to it: from the levers on the low rear bars forward along the top tube to the front brake, and a short loop down to the rear brake (on the correct bike they run the usual way, from the levers by the stem). The frame, saddle and handlebars change shape point for point (each tube keeps its points at the same place along and round it); every other part keeps its pose and shape, so the variant morph reads as the two warm assemblies trading places while the frame reshapes under them. Two direction cues, the same on both bikes, keep the twin from reading as a normal bike facing the other way: a small headlamp on the fork crown and a reflector on the rear mudguard.",
)

swap(
    "| Core (warm when specced) | Saddle and seat post; handlebars with brake levers and bell; pedals |\n| Body | Frame; fork; front and rear wheels; chainring and cranks; rear sprocket; chain; brakes; mudguards; ground strip |",
    "| Core (warm when specced) | Saddle and seat post (on the twin, its cradle and the top of the steering mast); handlebars with brake levers, the cable housings from the levers and bell; pedals |\n| Body | Frame with the brake cable runs; fork with a headlamp; front and rear wheels; chainring and cranks; rear sprocket; chain; brakes; mudguards (a reflector on the rear one); ground strip |",
)

swap(
    "and in the twin the saddle and handlebar assemblies have swapped posts while every other part's pose is unchanged;",
    "and in the twin the saddle and handlebar assemblies have swapped posts while every other part's pose is unchanged; the twin frame has a stub seat tube, a tall mast and a top tube that climbs at least 15° on screen from the reveal camera, its points map tube to tube from the correct frame, and only the frame, saddle and handlebars change shape; the reveal mannequin sits with level thighs on the twin saddle, its hands at least 0.3 m from the twin's handlebars, its feet at least 0.2 m from every pedal and its lowest point at least 0.1 m above the ground; the spec section's last stretch holds the core fully settled;",
)

open(p, 'w').write(s)
print('ok')
