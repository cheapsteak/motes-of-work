// C1's bricks (docs/specs/2026-10-07-defect-shape.md; from essayNetwork()): centre, size, yaw. Crack box = 5.
const BOXES = [
  { c: [-4.58, 0.126, 4.88], s: [0.53, 0.252, 0.336], yaw: -0.19 },
  { c: [-4.00, 0.126, 5.01], s: [0.63, 0.252, 0.336], yaw: -0.19 },
  { c: [-3.41, 0.126, 5.14], s: [0.54, 0.252, 0.336], yaw: -0.19 },
  { c: [-4.28, 0.378, 4.95], s: [0.58, 0.252, 0.336], yaw: -0.16 },
  { c: [-3.69, 0.378, 5.05], s: [0.58, 0.252, 0.336], yaw: -0.16 },
  { c: [-4.011, 0.252 + 0.378, 5.011], s: [0.581, 0.252, 0.336], yaw: -0.185 },
];
// The stack's courses stand at y = 0.126, 0.378, 0.63 (height 0.756 about centre y 0); the script's crack
// box centre y 0.252 is the course index times 0.252 over the stack's bottom; use course tops consistently.
for (const b of BOXES) b.c[1] -= 0.378; // bottom course at 0.126 - 0.378 = -0.252 ... keep relative only
const CRACK = 5, U = 0.42;
const KEY = norm([-0.4, 0.7, 0.6]);
function norm(v) { const l = Math.hypot(...v); return v.map(x => x / l); }
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const yawTurn = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
const toWorld = (b, q) => { const w = yawTurn(q, b.yaw); return [b.c[0] + w[0], b.c[1] + w[1], b.c[2] + w[2]]; };
function surfacePoint(b, rng) {
  const [x, y, z] = b.s; const faces = [y * z, y * z, x * z, x * z, x * y, x * y];
  let r = rng() * faces.reduce((a, c) => a + c, 0), f = 5;
  for (let i = 0; i < 6; i++) { r -= faces[i]; if (r < 0) { f = i; break; } }
  const u = 2 * rng() - 1, v = 2 * rng() - 1, h = [x / 2, y / 2, z / 2], sign = f % 2 === 0 ? 1 : -1, axis = f >> 1;
  const l = axis === 0 ? [sign * h[0], u * h[1], v * h[2]] : axis === 1 ? [u * h[0], sign * h[1], v * h[2]] : [u * h[0], v * h[1], sign * h[2]];
  const n = axis === 0 ? [sign, 0, 0] : axis === 1 ? [0, sign, 0] : [0, 0, sign];
  return { q: l, n };
}
// ---- Today's crack (crack.ts): plane normal (1, 0.15, 0), triangle-wave jag, gap 0.07u, every fifth mote onto a lip.
const tri = x => 1 - 4 * Math.abs(x - Math.floor(x) - 0.5);
const jagOld = y => 0.08 * U * (tri(4.1 * y + 0.31) + 0.6 * tri(9.7 * y + 0.17));
const NOLD = norm([1, 0.15, 0]);
function crackOld(b, q, n, k) {
  const side = NOLD[0] * q[0] + NOLD[1] * q[1] - jagOld(q[1]) >= 0 ? 1 : -1;
  const g = 0.07 * U;
  if (k % 5 === 0) {
    const s = (k / 5) % 2 === 0 ? 1 : -1;
    const y = q[1], z = q[2], x = (jagOld(y) - NOLD[1] * y) / NOLD[0];
    return { q: [x + s * g / 2 * NOLD[0], y + s * g / 2 * NOLD[1], z], n: [-s * NOLD[0], -s * NOLD[1], 0], lip: true, cube: true };
  }
  return { q: [q[0] + side * g / 2 * NOLD[0], q[1] + side * g / 2 * NOLD[1], q[2]], n, lip: false, cube: true };
}
// ---- Proposed crack (§2): x = p(y) + q(z); piece B (+x) tilts about the foot; hairline g0; lips weighted to the mouth.
function makeNew(b, rng) {
  const [L, H, D] = b.s;
  const xt = (-0.10 + 0.05 * (2 * rng() - 1)) * L, xb = xt + H * Math.tan(Math.PI / 6);
  const pv = [[H / 2, xt]];
  for (let i = 1; i <= 4; i++) { const f = i / 5; const chord = xt + (xb - xt) * f; pv.push([H / 2 - f * H, chord + (i % 2 ? 1 : -1) * (0.05 + 0.03 * rng()) * L]); }
  pv.push([-H / 2, xb]);
  const qv = [[D / 2, 0], [D / 6, 0.04 * L - 0.04 * L], [-D / 6, -0.08 * L - 0.04 * L], [-D / 2, -0.12 * L]];
  qv[1][1] = -0.04 * L + 0.04 * L; qv[2][1] = -0.08 * L - 0.04 * L; // alternate ±0.04 about the drift
  const lin = (vs, t) => { for (let i = 0; i < vs.length - 1; i++) { const [a, xa] = vs[i], [c, xc] = vs[i + 1]; if ((t <= a && t >= c) || (t >= a && t <= c)) return xa + (xc - xa) * (t - a) / (c - a); } return vs[vs.length - 1][1]; };
  const X = (y, z) => lin(pv, y) + lin(qv, z);
  const theta = (0.10 * H) / (0.5 * L), g0 = 0.03 * U, pivot = [xb, -H / 2];
  const rot = v => { const dx = v[0] - pivot[0], dy = v[1] - pivot[1], c = Math.cos(-theta), s = Math.sin(-theta); return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c, v[2]]; };
  const rotN = n => { const c = Math.cos(-theta), s = Math.sin(-theta); return [n[0] * c - n[1] * s, n[0] * s + n[1] * c, n[2]]; };
  return { X, theta, g0, rot, rotN, H, D, lip(k, rng) {
    // Height weighted toward the mouth: w ∝ g0 + θH·fy, inverse CDF.
    const a = g0, bb = theta * H, r = rng(); const fy = (-a + Math.sqrt(a * a + r * (2 * a * bb + bb * bb))) / bb;
    const y = (fy - 0.5) * H, z = (rng() - 0.5) * D, x = X(y, z);
    const side = k % 2 === 0 ? 1 : -1; // B = +1
    const eps = 1e-3, gx = 1, gy = -(X(y + eps, z) - X(y - eps, z)) / (2 * eps), gz = -(X(y, z + eps) - X(y, z - eps)) / (2 * eps);
    const n = norm([-side * gx, -side * gy, -side * gz]);
    let q = [x + side * g0 / 2, y, z];
    if (side > 0) { q = rot(q); return { q, n: rotN(n), lip: true, cube: true }; }
    return { q, n, lip: true, cube: true };
  }, shift(q, n) {
    const side = q[0] - X(q[1], q[2]) >= 0 ? 1 : -1;
    if (side > 0) return { q: rot([q[0] + g0 / 2, q[1], q[2]]), n: rotN(n), lip: false, cube: true };
    return { q: [q[0] - g0 / 2, q[1], q[2]], n, lip: false, cube: true };
  } };
}
// ---- Motes: 8000 over the stack by area, same seed both panes.
function motes(mode) {
  const rng = mulberry32(0x5a17c0de), out = [];
  const areas = BOXES.map(b => 2 * (b.s[0] * b.s[1] + b.s[1] * b.s[2] + b.s[0] * b.s[2]));
  const total = areas.reduce((a, c) => a + c, 0);
  const newCrack = mode === 'new' ? makeNew(BOXES[CRACK], mulberry32(7)) : null;
  let k = 0;
  for (let i = 0; i < 8000; i++) {
    let r = rng() * total, bi = 0; for (; bi < 6; bi++) { r -= areas[bi]; if (r < 0) break; } bi = Math.min(bi, 5);
    const b = BOXES[bi]; let { q, n } = surfacePoint(b, rng); let m = { q, n, lip: false, cube: bi === CRACK };
    if (bi === CRACK) {
      if (mode === 'old') m = crackOld(b, q, n, k);
      else m = k % 5 === 0 ? newCrack.lip(k / 5, rng) : newCrack.shift(q, n);
      k++;
    }
    out.push({ p: toWorld(b, m.q), n: yawTurn(m.n, b.yaw), lip: m.lip, cube: m.cube });
  }
  return out;
}
// ---- Camera: the rig's framing (frame 1 on a phone: target at (0.5, 0.76); portrait widening).
function draw(id, mode, shot) {
  const cv = document.getElementById(id), ctx = cv.getContext('2d'), W = cv.width, Hh = cv.height;
  const target = BOXES[CRACK].c;
  const DEG = Math.PI / 180, b = shot.bearing * DEG, e = shot.elevation * DEG;
  const dir = [Math.cos(e) * Math.sin(b), Math.sin(e), Math.cos(e) * Math.cos(b)];
  const kk = Math.sqrt(Math.min(2.4, Math.max(1, 0.89 / (W / Hh))));
  const dist = shot.distance * kk, fov = 2 * Math.atan(Math.tan(shot.fov * DEG / 2) * kk), tanH = Math.tan(fov / 2);
  const pos = target.map((t, i) => t + dir[i] * dist);
  const f = norm(target.map((t, i) => t - pos[i])), rgt = norm([f[2], 0, -f[0]]), up = [rgt[1] * f[2] - rgt[2] * f[1], rgt[2] * f[0] - rgt[0] * f[2], rgt[0] * f[1] - rgt[1] * f[0]];
  const cam = p => { const d = p.map((x, i) => x - pos[i]); return [d[0] * rgt[0] + d[1] * rgt[1] + d[2] * rgt[2], d[0] * up[0] + d[1] * up[1] + d[2] * up[2], d[0] * f[0] + d[1] * f[1] + d[2] * f[2]]; };
  ctx.fillStyle = '#0B0D12'; ctx.fillRect(0, 0, W, Hh);
  ctx.globalCompositeOperation = 'screen';
  const ms = motes(mode).map(m => ({ ...m, v: cam(m.p) })).sort((a, b) => b.v[2] - a.v[2]);
  for (const m of ms) {
    const [x, y, z] = m.v; if (z <= 0.05) continue;
    const sx = W / 2 + (x / z) / tanH * (Hh / 2), sy = 0.76 * Hh - (y / z) / tanH * (Hh / 2);
    const pxPerUnit = 0.5 * Hh / tanH / z;
    const nv = norm(m.n), vdir = norm(m.p.map((c, i) => pos[i] - c));
    const ndv = nv[0] * vdir[0] + nv[1] * vdir[1] + nv[2] * vdir[2], rim = 1 - Math.abs(ndv);
    let lit = 0.45 + 0.85 * Math.max(0, nv[0] * KEY[0] + nv[1] * KEY[1] + nv[2] * KEY[2]) + 0.5 * rim * rim;
    const sstep = (a, bq, t) => { const u = Math.min(1, Math.max(0, (t - a) / (bq - a))); return u * u * (3 - 2 * u); };
    lit *= 0.5 + 0.5 * sstep(-0.2, 0.2, ndv);
    let bright = 0.8 * lit * (m.lip ? 1.3 : 1);
    if (shot.focus !== undefined && !m.cube) bright *= shot.focus;
    const px = Math.min(3.5, Math.max(1, 1.5 * 0.025 * pxPerUnit)) * 0.5;
    ctx.fillStyle = `rgba(77,163,255,${Math.min(1, 0.55 * bright)})`;
    ctx.beginPath(); ctx.arc(sx, sy, px, 0, 6.283); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#d8d8d2'; ctx.font = '18px Georgia, serif';
  ctx.fillText('Come closer. Down here, one piece of code', 18, 70); ctx.fillText('has a defect.', 18, 96);
}
draw('a', 'old', { bearing: -10, elevation: 16, distance: 2.6, fov: 36 });
draw('b', 'new', { bearing: -35, elevation: 22, distance: 1.6, fov: 36, focus: 0.3 });
