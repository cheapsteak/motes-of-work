precision highp float;
precision highp int;

// A segment of ink: the distance to its centre line in px, round at a stroke's own ends and butt
// where it joins the next segment, clipped where the pen has got to, with the last few px before the
// pen tapered to a nib. Antialiased over 1.5 px; premultiplied (blended One, OneMinusSrcAlpha).

in vec2 vLocal;
flat in float vLength;
flat in float vCut;
flat in int vCaps;
in float vHalf;
in vec4 vColour;

out vec4 outColor;

const float NIB_PX = 7.0;

void main() {
  float u = vLocal.x;
  float across = abs(vLocal.y);
  float half_ = vHalf;
  float d;
  if (u < 0.0) {
    if ((vCaps & 1) == 0) discard;
    d = length(vec2(u, across));
  } else if (vCut < vLength && u > vCut) {
    // Where the pen is: a rounded nib, the line narrowing into it.
    d = length(vec2(u - vCut, across));
    half_ *= 0.35;
  } else if (u > vLength) {
    if ((vCaps & 2) == 0) discard;
    d = length(vec2(u - vLength, across));
  } else {
    d = across;
  }
  if (vCut < vLength && u <= vCut) half_ *= mix(0.35, 1.0, clamp((vCut - u) / NIB_PX, 0.0, 1.0));
  float edge = 1.0 - smoothstep(half_ - 0.75, half_ + 0.75, d);
  float a = vColour.a * edge;
  if (a <= 0.002) discard;
  outColor = vec4(vColour.rgb * a, a);
}
