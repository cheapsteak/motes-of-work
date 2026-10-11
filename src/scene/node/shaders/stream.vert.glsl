precision highp float;
precision highp int;

// #include mote.glsl + orbit.glsl + derp.glsl + shell.glsl + star.glsl + lod.glsl + light.glsl + freeze.glsl + bodyMote.glsl + instance.glsl + bodyScreen.glsl (spliced in by src/scene/node/shaderSource.ts)
// The galaxy's streams and the reviewer's feed (bodySystem.ts: net-streams, net-feed; galaxy §15),
// one quad per dot, drawn by galaxyMote.frag.glsl. The lineage streams are shown only where the story's
// line is about lineage (uStreams, `net.streams`), the feed only where it is the subject (uFeedOn,
// `net.feed`); the CPU hides each mesh while its leaf is 0. A stream runs from its parent's
// place to its child's (the feed from R0 to the ring), on a quadratic Bezier whose control point is
// the chord's midpoint bowed STREAM_BOW of the chord toward its bowBearing; its dots, one per
// STREAM_PITCH of chord within STREAM_DOTS, flow parent to child on the ambient clock, never on
// scroll, each 1 CSS px centred on its pixel, at most STREAM_CAP of a star glow's core and faded
// STREAM_FADE along the stream (stream.ts streamGain, streamDot: the TypeScript twin), ember while the
// stream carries the defect and capped the same; the feed at FEED_CAP, unfaded (feedGain: galaxy
// §15.2's exception). A stream is lit by the lamp where either end is. Neither lights the text band:
// each dot is masked to it on its pixel (streamBandMask, stream.ts: Task 11 review I1). The C7 -> R1 `in`
// stream is the in-fall (re-skin §4.2): it ends at R1's strand join (uInFallEnd), drawn at IN_STREAM_CAP,
// unfaded (inFallGain), its colour mixed to IN_EMBER by uInEmber in place of the highlight's ember.

in vec2 aCorner; // quad corner in [-1, 1]^2
in vec2 aDot; // row in the streams texture, the dot's index

uniform float uStreams; // net.streams
uniform vec3 uRing; // the ring's centre (review.ts ringAt), the feed's far end
uniform float uFeed; // the feed's alpha (review.ts feedAlpha)
uniform float uFeedOn; // net.feed
uniform float uRingRow; // the body the ring is on: the feed's lamp
uniform vec3 uInFallEnd; // R1's strand join in the world (stream.ts inFallEnd), the in-fall's end
uniform float uInEmber; // how far the in-fall is ember (stream.ts inFallEmber: net.inEmber x (1 - net.cool1))

out vec2 vUv;
flat out float vType;
flat out float vForm;
out float vBrightness;
flat out float vRadiusPx;
out float vHi;
flat out vec4 vTint; // galaxyMote.frag.glsl's freeze-frame colour: a stream has none (the streams are down under the freeze)
flat out vec3 vBase; // galaxyMote.frag.glsl's base colour: the agents' blue, the lineage's (not a planet's: re-skin Task 7)

void main() {
  int row = int(round(aDot.x));
  float i = aDot.y;
  vec4 s0 = streamTexel(0, row); // from, to, kind, born
  vec4 s1 = streamTexel(1, row); // hiAt, hop, bowBearing, the child's fixAt
  int from = int(round(s0.x));
  int to = int(round(s0.y));
  float present = to >= 0 ? nodeArrival(s0.w, uGrowth, NODE_BIRTH_WINDOW) : uFeed;
  float lamp = max(lampGain(from), lampGain(to >= 0 ? to : int(round(uRingRow))));
  // The early-out (re-skin §7): a dot whose stream is not yet up, whose lamp is dark, whose leaf is down
  // or whose galaxy is not shown is 0 below, whatever its place; so it skips streamDot(). One in the
  // text band is skipped below, once its pixel is known, before its light: the mask draws it at 0 there.
  if (!(present > 0.0) || !(lamp > 0.0) || !((to >= 0 ? uStreams : uFeedOn) > 0.0) || !(uShow > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  StreamDot sd = streamDot(row, i, uAmbient, uRing, uInFallEnd);
  bool inFall = int(round(s0.z)) == STREAM_KIND_IN;
  float gain = inFall ? inFallGain(uStreams, lamp) : to >= 0 ? streamGain(sd.u, uStreams, lamp) : feedGain(uFeedOn, lamp);
  float shown = gain * sd.presence * present * uShow;
  if (!(shown > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec4 view = toView(sd.pos);
  float px = uPixelRatio; // 1 CSS px: the floor and the cap
  vec4 clip = projectionMatrix * view;
  // Centred on its pixel, so a 1 px dot lights that pixel at its own brightness wherever it falls.
  vec2 pixel = floor((clip.xy / clip.w * 0.5 + 0.5) * uViewport) + 0.5;
  // The text band's mask (Task 11 review I1): the top of that pixel in CSS px from the screen's top.
  shown *= streamBandMask((uViewport.y - pixel.y - 0.5) / uPixelRatio, uViewport.y / uPixelRatio);
  if (!(shown > 0.0)) {
    gl_Position = MOTE_HIDDEN;
    return;
  }
  vec3 light = nodeLight(s1.w, s1.x, s1.y, uFix, uHighlight);
  clip.xy = (pixel / uViewport * 2.0 - 1.0) * clip.w;
  clip.xy += aCorner * (px / uViewport) * clip.w;
  gl_Position = clip;
  vUv = aCorner;
  vType = 1.0; // the agents' blue
  vForm = float(FORM_POINT);
  vBrightness = LOOK_GLOW_BRIGHTNESS * shown;
  vRadiusPx = 0.5 * px;
  vHi = inFall ? 0.0 : max(light.y, light.z);
  vTint = vec4(0.0);
  vBase = inFall ? mix(NODE_AGENT, IN_EMBER, uInEmber) : NODE_AGENT;
}
