p = '<mow-compare checkout>/src/compare/compare.ts'
s = open(p).read()
old = s[:s.index("import { marked }")]
new = """// Mechanism comparison page: one mechanism, one mechanism as correct | wrong twin ("Twin pair"), or
// all of them (2×2), at a state set by sliders, orbited with OrbitControls. Not scroll-driven, so it
// is exempt from the story's purity invariant, except that the machine itself stays a pure function
// of the slider state: drive "play" only moves the drive slider from the wall clock; nothing
// accumulates.
//
// Camera: OrbitControls drives a rig camera in machine-relative space (SceneState.camera units:
// world = anchor centre + value × anchor radius, the anchor being lerp(whole, core) by coreFocus).
// Each pane maps the rig into world space through its own mechanism's anchors with applyCamera,
// which is a world-space orbit about that anchor. One rig means every pane shares the same orbit
// angles and zoom (scaled to each machine), and a newly picked mechanism is framed at the current
// angle. The camera row picks the framing (CAMERAS) the rig starts from and Reset view returns to;
// a framing with coreFocus 1 maps the rig about the core, so orbit then circles the core.
"""
s = s.replace(old, new)
s = s.replace("new PerspectiveCamera(FOV, 1, 0.05, 200)", "new PerspectiveCamera(CAMERAS[0].fov, 1, 0.05, 200)")
open(p, 'w').write(s)
