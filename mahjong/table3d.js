// 3D mahjong table (three.js r128). Draws rivers, opponents' hands, melds, the center console and riichi sticks.
// Seat 0 is the player (bottom); seats go counter-clockwise (1 right, 2 top, 3 left).
// Rendering is on demand: render() only when something changed or while tweens run.
(function (root) {
'use strict';
const W = 1, H = 1.36, D = 0.78;
// ---- the table's own materials (2026-11-14, ユーザー: a more real automatic table — a quieter felt, real wood with rounded
// edges, the lift seams of an automatic table, a real score unit) ----
// periodic fractal noise (several octaves of smooth value noise; wraps at 1)
function mkNoise(seed) {
  const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sm = t => t * t * (3 - 2 * t);
  const oct = ps => ps.map(P => { const a = new Float32Array(P * P); for (let i = 0; i < P * P; i++) a[i] = R(); return [a, P]; });
  const val = (G, P, u, v) => { const x = u * P, y = v * P, x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0), i0 = ((x0 % P) + P) % P, j0 = ((y0 % P) + P) % P, i1 = (i0 + 1) % P, j1 = (j0 + 1) % P;
    return (G[j0 * P + i0] * (1 - fx) + G[j0 * P + i1] * fx) * (1 - fy) + (G[j1 * P + i0] * (1 - fx) + G[j1 * P + i1] * fx) * fy; };
  const fbm = (O, u, v) => { let t = 0, a = .5, n = 0; for (const [G, P] of O) { t += val(G, P, u, v) * a; n += a; a *= .5; } return t / n; };
  return { R, oct, fbm };
}
// the felt's nap: a small tiling height map (short fibres lying every way) for the bump — the light catches it as cloth
function napTex() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), N = mkNoise(31);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 5200; i++) { const x = N.R() * S, y = N.R() * S, a = N.R() * 6.283, l = 2 + N.R() * 5, v = N.R() < .5 ? 255 : 0;
    g.strokeStyle = `rgba(${v},${v},${v},${.05 + N.R() * .1})`; g.lineWidth = .7 + N.R() * .6; g.beginPath();
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.moveTo(x + ox, y + oy); g.lineTo(x + ox + Math.cos(a) * l, y + oy + Math.sin(a) * l); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(26, 26); return t;
}
// walnut, lacquered: long streaks, the rings' figure folded by the grain, pores. u runs along the grain and wraps.
function woodTex() {
  const Wd = 1024, Hd = 256, c = document.createElement('canvas'); c.width = Wd; c.height = Hd; const g = c.getContext('2d'), im = g.createImageData(Wd, Hd), o = im.data, N = mkNoise(53);
  const A = N.oct([4, 8, 16, 32]), B = N.oct([2, 4, 8]), Cn = N.oct([8, 16, 32, 64]);
  const mix = (a, b, t) => a + (b - a) * t;
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
    const u = x / Wd, v = y / Hd;
    const fold = N.fbm(B, u, v) - .5;                                   // the board's slow wander
    const ring = v * 7 + fold * 3.2 + (N.fbm(A, u, v * 3) - .5) * .8;      // growth rings, cut along the length: long figure
    const fig = Math.pow(.5 + .5 * Math.sin(ring * 6.2832), 2.2);         // dark late wood in narrow bands
    const streak = N.fbm(Cn, u, v * 6) - .5;                             // fine streaks along the grain
    let t = .42 + fig * .34 + streak * .5 + fold * .25; t = Math.min(1, Math.max(0, t));
    const d = (N.R() - .5) * 3, p = (y * Wd + x) * 4;
    o[p] = mix(54, 142, t) + d; o[p + 1] = mix(30, 88, t) + d; o[p + 2] = mix(16, 50, t) + d; o[p + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 1500; i++) { const x = N.R() * Wd, y = N.R() * Hd, l = 6 + N.R() * 26; g.strokeStyle = `rgba(24,10,4,${.1 + N.R() * .16})`; g.lineWidth = .6 + N.R() * .5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (N.R() - .5) * 1.2); g.stroke(); }   // pores
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
// a seven-segment digit (the score unit's LED): the lit segments in `col`, the unlit ones as a ghost when `ghost` is given
const SEG = { '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc', '5': 'afgcd', '6': 'afgedc', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg', '-': 'g', ' ': '' };
function seg7(g, x, y, w, h, ch, col, ghost) {
  const t = h * .13, k = w * .12, hh = h / 2, bar = (x0, y0, x1, y1) => { g.beginPath();
    if (y0 === y1) { g.moveTo(x0 + t * .5, y0); g.lineTo(x0 + t, y0 - t * .5); g.lineTo(x1 - t, y0 - t * .5); g.lineTo(x1 - t * .5, y0); g.lineTo(x1 - t, y0 + t * .5); g.lineTo(x0 + t, y0 + t * .5); }
    else { g.moveTo(x0, y0 + t * .5); g.lineTo(x0 + t * .5, y0 + t); g.lineTo(x0 + t * .5, y1 - t); g.lineTo(x0, y1 - t * .5); g.lineTo(x0 - t * .5, y1 - t); g.lineTo(x0 - t * .5, y0 + t); }
    g.closePath(); g.fill(); };
  const S = { a: [x, y, x + w, y], g: [x, y + hh, x + w, y + hh], d: [x, y + h, x + w, y + h], f: [x, y, x, y + hh], b: [x + w, y, x + w, y + hh], e: [x, y + hh, x, y + h], c: [x + w, y + hh, x + w, y + h] };
  g.save(); g.transform(1, 0, -k / h, 1, k * .5 + (y + hh) * k / h - k * .5, 0);   // the usual slant
  const on = SEG[ch] || '';
  for (const n in S) { const lit = on.includes(n); if (!lit && !ghost) continue; g.fillStyle = lit ? col : ghost; bar(...S[n]); }
  g.restore();
}

// the polished stone of the tile backs (a canvas, drawn once). 2026-11-14 (ユーザー: the colour is right, but the pattern read as
// block noise, not as stone): the old one was a straight gradient with a few polylines of straight segments under a wide blur —
// stretched over a tile that showed as rectangles and steps. Now the pattern is grown the way stone looks: smooth fractal noise
// (several octaves, each one interpolated, so nothing has an edge), folded through itself (a domain warp) so the clouds flow, and
// a few soft pale veins that follow the same flow. It stays as faint as before (clouds ±3%, veins +5%), it wraps (the four
// backs take different pieces of it), and a little dither keeps the dark purple from banding into steps.
function stoneTex() {
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S), o = im.data;
  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid = P => { const a = new Float32Array(P * P); for (let i = 0; i < P * P; i++) a[i] = R(); return a; };
  const sm = t => t * t * t * (t * (t * 6 - 15) + 10);
  const val = (G, P, u, v) => { const x = u * P, y = v * P, x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0), i0 = ((x0 % P) + P) % P, j0 = ((y0 % P) + P) % P, i1 = (i0 + 1) % P, j1 = (j0 + 1) % P;
    return (G[j0 * P + i0] * (1 - fx) + G[j0 * P + i1] * fx) * (1 - fy) + (G[j1 * P + i0] * (1 - fx) + G[j1 * P + i1] * fx) * fy; };
  const oct = ps => ps.map(P => [grid(P), P]);
  const fbm = (O, u, v) => { let s = 0, a = .5, n = 0; for (const [G, P] of O) { s += val(G, P, u, v) * a; n += a; a *= .5; } return s / n; };   // 0..1, periodic
  const A = oct([3, 6, 12, 24, 48]), B = oct([2, 4, 8, 16]), Cc = oct([2, 4, 8, 16]);
  const br = 0x59, bg = 0x36, bb = 0x86;   // the deep 袱紗 purple (unchanged)
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, wx = (fbm(B, u, v) - .5) * .5, wy = (fbm(Cc, u, v) - .5) * .5;        // the fold
    const cl = fbm(A, u + wx, v + wy) - .5;                                                         // the clouds
    const ph = (u + wx * 1.4) * 2 + (v + wy * 1.4) * 1 + cl * 1.6, vn = Math.pow(1 - Math.abs(Math.sin(ph * Math.PI)), 9);   // thin veins along the flow
    const f = 1 + cl * .1 + vn * .04, d = (R() - .5) * 1.6, p = (y * S + x) * 4;
    o[p] = Math.min(255, br * f + vn * 5 + d); o[p + 1] = Math.min(255, bg * f + vn * 4 + d); o[p + 2] = Math.min(255, bb * f + vn * 6 + d); o[p + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
// a small studio around the table for the polished surfaces to reflect: a soft ceiling light, a window strip, dark walls
function studioEnv() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  const v = g.createLinearGradient(0, 0, 0, 256); v.addColorStop(0, '#d8d4e4'); v.addColorStop(.45, '#6c6878'); v.addColorStop(1, '#2a2632'); g.fillStyle = v; g.fillRect(0, 0, 512, 256);
  const L = g.createRadialGradient(256, 10, 4, 256, 10, 120); L.addColorStop(0, 'rgba(255,255,255,1)'); L.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = L; g.fillRect(0, 0, 512, 140);
  g.fillStyle = 'rgba(255,250,240,.85)'; g.fillRect(60, 70, 70, 50); g.fillRect(380, 80, 50, 40);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding; return t;
}
// a rounded tile part (w × h, d thick along z, centred): corner radius r, edges rounded by b. withFace: group 0 is the +z face
// (uv 0..1 over the tile), group 1 everything else; otherwise one group. ~120 triangles.
function roundTile(w, h, d, r, b, withFace) {
  const s = new THREE.Shape(), x0 = -w / 2 + b, y0 = -h / 2 + b, x1 = w / 2 - b, y1 = h / 2 - b, q = Math.max(.01, r - b);
  s.moveTo(x0 + q, y0); s.lineTo(x1 - q, y0); s.quadraticCurveTo(x1, y0, x1, y0 + q); s.lineTo(x1, y1 - q); s.quadraticCurveTo(x1, y1, x1 - q, y1);
  s.lineTo(x0 + q, y1); s.quadraticCurveTo(x0, y1, x0, y1 - q); s.lineTo(x0, y0 + q); s.quadraticCurveTo(x0, y0, x0 + q, y0);
  let g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 3 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
  for (let i = 0; i < P.count; i++) UV.setXY(i, (P.getX(i) + w / 2) / w, (P.getY(i) + h / 2) / h);
  // the face: the +z cap only (the extrude's caps are group 0 — front and back); faces of the −z cap go to the plain group
  g.clearGroups();
  if (withFace) {
    const idx = []; for (let i = 0; i < P.count; i += 3) idx.push(i);
    const isFace = i => N.getZ(i) > .99 && N.getZ(i + 1) > .99 && N.getZ(i + 2) > .99 && P.getZ(i) > d / 2 - 1e-3;
    const face = idx.filter(isFace), rest = idx.filter(i => !isFace(i)), order = face.concat(rest);
    const ng = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) { const A = g.attributes[k], n = A.itemSize, out = new Float32Array(order.length * 3 * n); order.forEach((i, j) => { for (let v = 0; v < 3; v++) for (let c = 0; c < n; c++) out[(j * 3 + v) * n + c] = A.array[(i + v) * n + c]; }); ng.setAttribute(k, new THREE.BufferAttribute(out, n)); }
    ng.addGroup(0, face.length * 3, 0); ng.addGroup(face.length * 3, rest.length * 3, 1);
    g.dispose(); g = ng;
  }
  return g;
}
// One tile, cut in two for its two materials (2026-11-14, ユーザー: the face's edge was sharp and the join between the white
// front and the purple back showed as a groove — make it one piece). The tile is a single rounded block: the corners rounded
// in plan (r), every edge of the face and of the back rounded over (b, three steps), its normals smoothed across the steps so
// the rounding reads as a curve. Only then is it split at the plane where the white meets the purple (zs from the back): the
// two halves share that ring of vertices and their normals, so the side runs straight through the colour change — no bevel,
// no groove. Returns { front (group 0: the flat face, 1: the white body), back (the purple) }.
function tileGeos(w, h, d, r, b, backT) {
  const s = new THREE.Shape(), x0 = -w / 2 + b, y0 = -h / 2 + b, x1 = w / 2 - b, y1 = h / 2 - b, q = Math.max(.01, r - b);
  s.moveTo(x0 + q, y0); s.lineTo(x1 - q, y0); s.quadraticCurveTo(x1, y0, x1, y0 + q); s.lineTo(x1, y1 - q); s.quadraticCurveTo(x1, y1, x1 - q, y1);
  s.lineTo(x0 + q, y1); s.quadraticCurveTo(x0, y1, x0, y1 - q); s.lineTo(x0, y0 + q); s.quadraticCurveTo(x0, y0, x0 + q, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, steps: 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 3 });
  g.translate(0, 0, -(d - 2 * b) / 2);
  const P = g.attributes.position, n = P.count, zs = -d / 2 + backT, pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { let z = P.getZ(i); if (Math.abs(z) < 1e-4) z = zs; pos[i * 3] = P.getX(i); pos[i * 3 + 1] = P.getY(i); pos[i * 3 + 2] = z; }   // the middle ring → the colour line
  // face normals, then each vertex takes the mean of the faces that meet at its point and lie within 60° of its own (the two flat caps stay flat)
  const fn = new Float32Array(n * 3), at = new Map(), key = i => Math.round(pos[i * 3] * 2000) + ',' + Math.round(pos[i * 3 + 1] * 2000) + ',' + Math.round(pos[i * 3 + 2] * 2000);
  for (let i = 0; i < n; i += 3) { const ax = pos[i * 3 + 3] - pos[i * 3], ay = pos[i * 3 + 4] - pos[i * 3 + 1], az = pos[i * 3 + 5] - pos[i * 3 + 2], bx = pos[i * 3 + 6] - pos[i * 3], by = pos[i * 3 + 7] - pos[i * 3 + 1], bz = pos[i * 3 + 8] - pos[i * 3 + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let v = 0; v < 3; v++) { fn[(i + v) * 3] = nx; fn[(i + v) * 3 + 1] = ny; fn[(i + v) * 3 + 2] = nz; const k = key(i + v); (at.get(k) || at.set(k, []).get(k)).push(i + v); } }
  for (let i = 0; i < n; i++) { const fx = fn[i * 3], fy = fn[i * 3 + 1], fz = fn[i * 3 + 2];
    if (Math.abs(fz) > .999) { nor[i * 3] = 0; nor[i * 3 + 1] = 0; nor[i * 3 + 2] = fz; continue; }
    let sx = 0, sy = 0, sz = 0; for (const j of at.get(key(i))) { const d0 = fx * fn[j * 3] + fy * fn[j * 3 + 1] + fz * fn[j * 3 + 2]; if (d0 > .5) { sx += fn[j * 3]; sy += fn[j * 3 + 1]; sz += fn[j * 3 + 2]; } }
    const l = Math.hypot(sx, sy, sz) || 1; nor[i * 3] = sx / l; nor[i * 3 + 1] = sy / l; nor[i * 3 + 2] = sz / l; }
  // the face's picture fills the flat of the face with a small margin (the rounding takes the rest); the back's stone runs over the whole tile
  for (let i = 0; i < n; i++) { uv[i * 2] = pos[i * 3] / (w - 2 * b) * .94 + .5; uv[i * 2 + 1] = pos[i * 3 + 1] / (h - 2 * b) * .94 + .5; }
  const tris = []; for (let i = 0; i < n; i += 3) tris.push(i);
  const cz = i => (pos[i * 3 + 2] + pos[i * 3 + 5] + pos[i * 3 + 8]) / 3, isFace = i => fn[i * 3 + 2] > .999 && pos[i * 3 + 2] > d / 2 - 1e-3;
  const make = (list, backUV) => { const ng = new THREE.BufferGeometry(), m = list.length * 3, p = new Float32Array(m * 3), nn = new Float32Array(m * 3), u = new Float32Array(m * 2);
    list.forEach((i, j) => { for (let v = 0; v < 3; v++) { const a = i + v, o = j * 3 + v; p.set(pos.subarray(a * 3, a * 3 + 3), o * 3); nn.set(nor.subarray(a * 3, a * 3 + 3), o * 3);
      if (backUV) { u[o * 2] = (pos[a * 3] + w / 2) / w; u[o * 2 + 1] = (pos[a * 3 + 1] + h / 2) / h; } else { u[o * 2] = uv[a * 2]; u[o * 2 + 1] = uv[a * 2 + 1]; } } });
    ng.setAttribute('position', new THREE.BufferAttribute(p, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); ng.setAttribute('uv', new THREE.BufferAttribute(u, 2)); return ng; };
  const face = tris.filter(isFace), body = tris.filter(i => !isFace(i) && cz(i) > zs), bk = tris.filter(i => cz(i) <= zs);
  const front = make(face.concat(body)); front.addGroup(0, face.length * 3, 0); front.addGroup(face.length * 3, body.length * 3, 1);
  g.dispose();
  return { front, back: make(bk, true) };
}
const ROW = 6;
const PI = Math.PI;

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

class Table3D {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.mobile = mobile;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = true;
    host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);
    this.tweens = [];
    this.tiles = new Map();
    this.faceTex = new Map();
    this.dirty = true;
    this.build(mobile);
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------------------------------------------------------------- scene
  build(mobile) {
    const s = this.scene;
    s.add(new THREE.HemisphereLight(0xf2f6ff, 0x1c2440, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(-6, 22, 10);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.key = key;
    const sc = key.shadow.camera; sc.left = -14; sc.right = 14; sc.top = 14; sc.bottom = -14; sc.near = 4; sc.far = 50;
    key.shadow.bias = -0.0006; key.shadow.radius = 3;
    s.add(key);
    const rim = new THREE.DirectionalLight(0xd9c8ff, 0.25); rim.position.set(8, 10, -12); s.add(rim);

    // ---- the felt: a quiet dusty blue cloth (ユーザー: the blue is fine, but quieter and felt-like) with the seams of an automatic
    // table pressed into it — the centre lift panel round the score unit, the four flaps that swallow the tiles (the square
    // with its diagonals, as on a real table) and the four slots the walls rise from.
    const U = 2048 / 21.2;                       // texture px per world unit
    const fc = document.createElement('canvas'); fc.width = fc.height = 2048;
    const g = fc.getContext('2d');
    { const N = mkNoise(11), A = N.oct([6, 12, 24, 48, 96]), img = g.createImageData(2048, 2048), d = img.data;
      for (let y = 0; y < 2048; y++) for (let x = 0; x < 2048; x++) {
        const u = x / 2048, v = y / 2048, r = Math.hypot(u - .5, v - .5) * 2, vig = 1 - Math.min(1, r * r) * .2;   // (only a soft falloff to the rim)
        const m = (N.fbm(A, u, v) - .5) * .16, n = (N.R() - .5) * .09, f = vig * (1 + m + n), p = (y * 2048 + x) * 4;
        d[p] = 44 * f; d[p + 1] = 72 * f; d[p + 2] = 112 * f; d[p + 3] = 255;
      }
      g.putImageData(img, 0, 0); }
    g.translate(1024, 1024);
    // a seam: a dark hairline with a pale edge beside it (the cloth turns over the plate's edge)
    const seam = draw => { g.lineJoin = 'round';
      g.strokeStyle = 'rgba(8,14,30,.5)'; g.lineWidth = 4.5; g.save(); draw(); g.stroke(); g.restore();
      g.strokeStyle = 'rgba(190,210,245,.12)'; g.lineWidth = 2; g.save(); g.translate(2.5, 3); draw(); g.stroke(); g.restore(); };
    const rr = (h, r) => { g.beginPath(); g.moveTo(-h + r, -h); g.lineTo(h - r, -h); g.quadraticCurveTo(h, -h, h, -h + r); g.lineTo(h, h - r); g.quadraticCurveTo(h, h, h - r, h); g.lineTo(-h + r, h); g.quadraticCurveTo(-h, h, -h, h - r); g.lineTo(-h, -h + r); g.quadraticCurveTo(-h, -h, -h + r, -h); g.closePath(); };
    const cI = 2.62 * U, cO = 5.35 * U;
    seam(() => rr(cI, .3 * U)); seam(() => rr(cO, .25 * U));
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) seam(() => { g.beginPath(); g.moveTo(x * (cI - .08 * U), y * (cI - .08 * U)); g.lineTo(x * (cO - .06 * U), y * (cO - .06 * U)); });
    for (let k = 0; k < 4; k++) { g.save(); g.rotate(k * PI / 2); seam(() => { const x0 = -7.3 * U, y0 = 7.42 * U, w = 14.6 * U, h = .98 * U, r = .16 * U; g.beginPath(); g.moveTo(x0 + r, y0); g.lineTo(x0 + w - r, y0); g.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); g.lineTo(x0 + w, y0 + h - r); g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); g.lineTo(x0 + r, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); g.lineTo(x0, y0 + r); g.quadraticCurveTo(x0, y0, x0 + r, y0); g.closePath(); }); g.restore(); }
    // the dark well the score unit stands in (its shadow on the cloth)
    { const sh = g.createRadialGradient(0, 0, 1.5 * U, 0, 0, 2.6 * U); sh.addColorStop(0, 'rgba(4,8,18,.6)'); sh.addColorStop(.75, 'rgba(4,8,18,.3)'); sh.addColorStop(1, 'rgba(4,8,18,0)'); g.fillStyle = sh; g.fillRect(-2.7 * U, -2.7 * U, 5.4 * U, 5.4 * U); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const felt = new THREE.CanvasTexture(fc); felt.encoding = THREE.sRGBEncoding; felt.anisotropy = 8;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 21.2), new THREE.MeshStandardMaterial({ map: felt, roughness: 1, metalness: 0, bumpMap: napTex(), bumpScale: .012 }));
    table.rotation.x = -PI / 2; table.receiveShadow = true; s.add(table);

    // ---- the frame: four walnut rails with rounded edges and four rounded corner blocks, lacquered; a black lip round the cloth
    const wood = woodTex(); this.envTex = this.envTex || studioEnv();
    const rimMat = new THREE.MeshPhysicalMaterial({ map: wood, roughness: .42, metalness: 0, clearcoat: .55, clearcoatRoughness: .22, envMap: this.envTex, envMapIntensity: .5 });
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: .45, metalness: .2 });
    const RW = 1.75, RH0 = -0.28, RH1 = 0.92, RR = 0.26, RL = 21.1, RC = 10.55 + RW / 2;   // rail: width, bottom, top, edge radius, length, centre line
    { const sh = new THREE.Shape(), x0 = -RW / 2, x1 = RW / 2;
      sh.moveTo(x0 + RR, RH0); sh.lineTo(x1 - RR, RH0); sh.quadraticCurveTo(x1, RH0, x1, RH0 + RR); sh.lineTo(x1, RH1 - RR); sh.quadraticCurveTo(x1, RH1, x1 - RR, RH1);
      sh.lineTo(x0 + RR, RH1); sh.quadraticCurveTo(x0, RH1, x0, RH1 - RR); sh.lineTo(x0, RH0 + RR); sh.quadraticCurveTo(x0, RH0, x0 + RR, RH0);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: RL, bevelEnabled: false, curveSegments: 5 }); rg.translate(0, 0, -RL / 2);
      const P = rg.attributes.position, UV = rg.attributes.uv, cy = (RH0 + RH1) / 2;
      for (let i = 0; i < P.count; i++) UV.setXY(i, P.getZ(i) / 7.5, Math.atan2(P.getX(i), P.getY(i) - cy) / (2 * PI) * 1.15 + .5);   // the grain runs along the rail and wraps round its section (the join is underneath)
      rg.rotateY(PI / 2);
      for (let k = 0; k < 4; k++) { const a = k * PI / 2, b = new THREE.Mesh(rg, rimMat); b.position.set(Math.sin(a) * RC, 0, Math.cos(a) * RC); b.rotation.y = a; b.castShadow = b.receiveShadow = true; s.add(b);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.2, 0.12), lipMat); lip.position.set(Math.sin(a) * 10.56, 0.1, Math.cos(a) * 10.56); lip.rotation.y = a; s.add(lip); } }
    { const E = RW + .06, cr = 1.15, bv = .2, sh = new THREE.Shape();   // corner block: a square whose outer corner is rounded, its top edge rounded like the rails'
      sh.moveTo(0, 0); sh.lineTo(E, 0); sh.lineTo(E, E - cr); sh.quadraticCurveTo(E, E, E - cr, E); sh.lineTo(0, E); sh.closePath();
      const cg = new THREE.ExtrudeGeometry(sh, { depth: RH1 - RH0 - bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 4, curveSegments: 8 });
      cg.rotateX(-PI / 2); cg.translate(0, RH0, 0);   // (shape x → x, shape y → −z, height → y)
      const P = cg.attributes.position, UV = cg.attributes.uv;
      for (let i = 0; i < P.count; i++) UV.setXY(i, (P.getX(i) + P.getZ(i)) / 7.5 + .31, (P.getX(i) - P.getZ(i)) / 3.4 + P.getY(i) * .25);   // grain across the corner
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(cg, rimMat); m.rotation.y = k * PI / 2; const q = this.local(k, 10.53, -10.53 + 0); m.position.set(0, 0, 0);
        // the block's own corner sits at the cloth's corner (+x, −z in its own frame), turned round the table's centre
        const piv = new THREE.Group(); piv.rotation.y = k * PI / 2; m.rotation.y = 0; m.position.set(10.53, 0, -10.53); piv.add(m); m.castShadow = m.receiveShadow = true; s.add(piv); void q; } }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: 0x0c0a14, roughness: 1 }));
    under.rotation.x = -PI / 2; under.position.y = -0.4; s.add(under);

    // ---- the score unit (the centre of an automatic table): a rounded panel under a clear cover, standing on a narrower
    // neck in its well — the lift the tiles go down. Two canvases: the panel as it looks, and what glows (the LEDs and the screen).
    this.conCanvas = document.createElement('canvas'); this.conCanvas.width = this.conCanvas.height = 1024;
    this.conGlow = document.createElement('canvas'); this.conGlow.width = this.conGlow.height = 1024;
    this.conTex = new THREE.CanvasTexture(this.conCanvas); this.conTex.encoding = THREE.sRGBEncoding; this.conTex.anisotropy = 8;
    this.conETex = new THREE.CanvasTexture(this.conGlow); this.conETex.encoding = THREE.sRGBEncoding; this.conETex.anisotropy = 8;
    const CH = 1.95, CR = 0.46;                  // half size, corner radius
    const rsq = (h, r) => { const p = new THREE.Shape(); p.moveTo(-h + r, -h); p.lineTo(h - r, -h); p.quadraticCurveTo(h, -h, h, -h + r); p.lineTo(h, h - r); p.quadraticCurveTo(h, h, h - r, h); p.lineTo(-h + r, h); p.quadraticCurveTo(-h, h, -h, h - r); p.lineTo(-h, -h + r); p.quadraticCurveTo(-h, -h, -h + r, -h); return p; };
    const cgeo = new THREE.ExtrudeGeometry(rsq(CH - .07, CR), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 6 });
    for (const t of [this.conTex, this.conETex]) { t.repeat.set(1 / (CH * 2), 1 / (CH * 2)); t.offset.set(.5, .5); }
    const conTop = new THREE.MeshPhysicalMaterial({ map: this.conTex, roughness: .34, metalness: .25, clearcoat: 1, clearcoatRoughness: .08, envMap: this.envTex, envMapIntensity: .55, emissive: 0xffffff, emissiveMap: this.conETex, emissiveIntensity: .95 });
    const conSide = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, roughness: .28, metalness: .9, envMap: this.envTex, envMapIntensity: .8 });   // a bright metal trim round the panel
    const con = new THREE.Mesh(cgeo, [conTop, conSide]);
    con.rotation.x = -PI / 2; con.position.y = 0.36; con.castShadow = true; con.receiveShadow = true; s.add(con);
    const neck = new THREE.Mesh(new THREE.ExtrudeGeometry(rsq(CH - .3, CR - .1), { depth: 0.36, bevelEnabled: false, curveSegments: 4 }), new THREE.MeshStandardMaterial({ color: 0x0b0c10, roughness: .7, metalness: .3 }));
    neck.rotation.x = -PI / 2; neck.position.y = 0.0; s.add(neck);

    // riichi sticks
    const stc = document.createElement('canvas'); stc.width = 256; stc.height = 24;
    const sg = stc.getContext('2d'); sg.fillStyle = '#f7f3ea'; sg.fillRect(0, 0, 256, 24); sg.fillStyle = '#d42a2a'; sg.beginPath(); sg.arc(128, 12, 8, 0, 7); sg.fill();
    const stTex = new THREE.CanvasTexture(stc); stTex.encoding = THREE.sRGBEncoding;
    const stMat = new THREE.MeshStandardMaterial({ map: stTex, roughness: .4 });
    this.sticks = [0, 1, 2, 3].map(k => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.2), [stMat, stMat, stMat, stMat, stMat, stMat]);
      const p = this.local(k, -0.4, 2.42);
      m.position.set(p.x, 0.05, p.z); m.rotation.y = k * PI / 2; m.visible = false; m.castShadow = true; s.add(m);
      return m;
    });

    // shared tile geometry/materials
    // the tiles (2026-11-14, as 上海's): rounded white blocks with a purple back — corners and edges rounded, the face
    // carved (normal map from tiles.js). One shared geometry for the white part and one for the back.
    { const tg = tileGeos(W, H, D, 0.14, 0.085, 0.28); this.geoFront = tg.front; this.geoBack = tg.back; }   // (one rounded block, split where the white meets the purple)
    this.matIvory = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf7f7f3).convertSRGBToLinear(), roughness: .38, metalness: 0 });
    // the back (2026-11-14, ユーザー：紫をもう少し淡く、高級石を磨いたような質感): a pale lavender stone with soft veins, polished
    // (a clear coat over it, a little studio light reflected in it) — four cuts of the same slab so neighbours don't match
    this.envTex = this.envTex || studioEnv();
    const stone = stoneTex();
    this.matBacks = [0, 1, 2, 3].map(k => { const t = stone.clone(); t.needsUpdate = true; t.offset.set(k * .27, k * .41);
      return new THREE.MeshPhysicalMaterial({ map: t, roughness: .3, metalness: 0, ior: 2.1, clearcoat: .8, clearcoatRoughness: .32, envMap: this.envTex, envMapIntensity: 1 }); });   // (2026-11-14, ユーザー: a little more sheen — stone polished by hand, not a gloss coat: a denser stone (ior 2.1: it gives back about three times the light of the plain 1.5) under a soft coat, both rough enough that the room shows as a broad glow, never as a mirror image)
    this.matBack = this.matBacks[0];
    this.matHi = new THREE.MeshStandardMaterial({ color: 0xfff1b8, roughness: .35, emissive: 0x6a5208, emissiveIntensity: .45 });
    this.setInfo({ round: 0, kyoku: 0, honba: 0, kyotaku: 0, left: 70, scores: [25000, 25000, 25000, 25000], dealer: 0, turn: -1 });
  }

  faceMat(id) {
    const t = id >> 2, red = id === 16 || id === 52 || id === 88;
    const k = t + (red ? 'r' : '');
    let m = this.faceTex.get(k);
    if (!m) {
      const tex = new THREE.CanvasTexture(MJTiles.canvas(t, red));
      tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8;
      const nrm = MJTiles.sheets() ? new THREE.CanvasTexture(MJTiles.normal(t, red)) : null; if (nrm) nrm.anisotropy = 8;
      m = { normal: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38 }), hi: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38, emissive: 0xffd36a, emissiveIntensity: .28 }), dim: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38, color: 0x9c9c9c }) };
      this.faceTex.set(k, m);
    }
    return m;
  }
  tile(id) {
    let g = this.tiles.get(id);
    if (g) return g;
    g = new THREE.Group();
    const fm = this.faceMat(id);
    const front = new THREE.Mesh(this.geoFront, [fm.normal, this.matIvory]);   // (group 0: the face cap, 1: the rest)
    const back = new THREE.Mesh(this.geoBack, this.matBacks[id % 4]);
    front.castShadow = back.castShadow = true; front.receiveShadow = true;
    g.add(front, back);
    g.rotation.order = 'YXZ';
    g.userData = { id, front, fm };
    g.visible = false;
    this.scene.add(g);
    this.tiles.set(id, g);
    return g;
  }
  setTileLook(g, look) {
    const fm = g.userData.fm;
    g.userData.front.material[0] = look === 'hi' ? fm.hi : look === 'dim' ? fm.dim : fm.normal;
  }

  // local (lx right of seat, lz toward seat) -> world
  local(seat, lx, lz) {
    const a = seat * PI / 2;
    return { x: lx * Math.cos(a) + lz * Math.sin(a), z: -lx * Math.sin(a) + lz * Math.cos(a) };
  }
  place(g, seat, lx, lz, pose, anim) {
    // pose: 'flat' (face up), 'side' (face up, turned 90°), 'stand' (standing, face to owner), 'back' (face down)
    const p = this.local(seat, lx, lz);
    const yaw = seat * PI / 2;
    let rx = 0, rz = 0, y = H / 2;
    if (pose === 'flat') { rx = -PI / 2; y = D / 2; }
    else if (pose === 'side') { rx = -PI / 2; rz = PI / 2; y = D / 2; }
    else if (pose === 'back') { rx = PI / 2; y = D / 2; }
    const to = { x: p.x, y, z: p.z, rx, ry: yaw, rz };
    g.visible = true;
    if (anim) this.tween(g, to, anim.dur || 260, anim.from);
    else { g.position.set(to.x, to.y, to.z); g.rotation.set(rx, yaw, rz); g.userData.target = to; this.dirty = true; }
  }
  tween(g, to, dur, from) {
    const f = from || { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z };
    this.tweens = this.tweens.filter(t => t.g !== g);
    this.tweens.push({ g, from: f, to, t0: performance.now(), dur });
    g.userData.target = to;
    this.dirty = true;
  }

  // ---------------------------------------------------------------- layout
  hideAll() { for (const g of this.tiles.values()) { g.visible = false; this.setTileLook(g, 'normal'); } this.sticks.forEach(s => s.visible = false); this.tweens = []; this.dirty = true; }

  layoutRiver(seat, river, animLast, fromSeatHand) {
    let row = 0, col = 0, x = -3.0 * W;
    river.forEach((r, i) => {
      if (col === ROW && row < 2) { row++; col = 0; x = -3.0 * W; }
      const g = this.tile(r.id);
      const side = !!r.sideways;
      const w = side ? H : W;
      const lx = x + (w - W) / 2;
      const lz = 3.56 + row * (H + 0.02) + (side ? (H - W) / 2 * 0 : 0);
      const anim = (animLast && i === river.length - 1) ? { dur: 240, from: this.handOrigin(seat) } : null;
      this.place(g, seat, lx, lz, side ? 'side' : 'flat', anim);
      g.userData.taken = !!r.taken;
      g.visible = !r.taken;
      this.setTileLook(g, r.dim ? 'dim' : 'normal');
      x += w + 0.02; col++;
    });
  }
  handOrigin(seat) {
    const p = this.local(seat, 0, seat === 0 ? 10 : 8.4);
    return { x: p.x, y: 1.4, z: p.z, rx: -PI / 2, ry: seat * PI / 2, rz: 0 };
  }
  layoutHand(seat, ids, drawn, open) {
    // opponents: standing tiles; open = lay face up (end of hand)
    const n = ids.length + (drawn != null ? 1 : 0);
    let x = -6.6;
    const lz = 8.45;
    const all = drawn != null ? ids.concat([drawn]) : ids;
    all.forEach((id, i) => {
      const g = this.tile(id);
      if (drawn != null && i === all.length - 1) x += 0.3;
      this.place(g, seat, x + W / 2, open ? lz - 0.2 : lz, open ? 'flat' : 'stand');
      this.setTileLook(g, 'normal');
      x += W + 0.02;
    });
    void n;
  }
  layoutMelds(seat, melds) {
    let x = 9.7;                  // right edge (from the owner's view)
    const lz0 = 8.75;
    for (const m of melds) {
      // the called tile is turned sideways: from left player -> leftmost, across -> middle, right -> rightmost
      const rel = (m.from - seat + 4) % 4;   // 1 right(shimocha), 2 across, 3 left(kamicha)
      let order = m.tiles.slice();
      if (m.type === 'kakan') order = m.tiles.filter(t => t !== m.added);
      if (m.type !== 'ankan' && m.called != null) {
        order = order.filter(t => t !== m.called);
        const pos = rel === 3 ? 0 : rel === 2 ? 1 : order.length;
        order.splice(pos, 0, m.called);
      }
      const items = order.map((id, i) => ({ id, side: m.type !== 'ankan' && id === m.called, back: m.type === 'ankan' && (i === 0 || i === 3) }));
      // place right to left
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const w = it.side ? H : W;
        x -= w;
        const g = this.tile(it.id);
        const lz = it.side ? lz0 + (H - W) / 2 : lz0;
        this.place(g, seat, x + w / 2, lz, it.back ? 'back' : it.side ? 'side' : 'flat');
        this.setTileLook(g, 'normal');
        if (it.side && m.type === 'kakan' && m.added != null) {
          const g2 = this.tile(m.added);
          this.place(g2, seat, x + w / 2, lz - W - 0.02, 'side');
          this.setTileLook(g2, 'normal');
        }
        x -= 0.02;
      }
      x -= 0.22;
    }
  }
  setStick(seat, on) { this.sticks[seat].visible = !!on; this.dirty = true; }
  highlightType(t) {
    for (const g of this.tiles.values()) {
      if (!g.visible) continue;
      const tt = g.userData.id >> 2;
      this.setTileLook(g, t != null && tt === t ? 'hi' : 'normal');
    }
    this.dirty = true;
  }

  // ---------------------------------------------------------------- console
  setInfo(o) {
    this.info = Object.assign(this.info || {}, o);
    const I = this.info, S = 1024, C = S / 2, WN = ['東', '南', '西', '北'];
    // pass 0 paints the panel, pass 1 only what gives light (the emissive map)
    for (const em of [0, 1]) {
      const g = (em ? this.conGlow : this.conCanvas).getContext('2d');
      g.setTransform(1, 0, 0, 1, 0, 0); g.shadowBlur = 0;
      if (em) { g.fillStyle = '#000'; g.fillRect(0, 0, S, S); }
      else {
        // the panel: dark graphite plastic, finely brushed, a pale line where its edge turns
        const bg = g.createLinearGradient(0, 0, S, S); bg.addColorStop(0, '#343841'); bg.addColorStop(.5, '#22252c'); bg.addColorStop(1, '#2c3038');
        g.fillStyle = bg; g.fillRect(0, 0, S, S);
        let sd = 5; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${R() < .5 ? '255,255,255' : '0,0,0'},${R() * .035})`; g.lineWidth = 1; const y = R() * S, x = R() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + R() * 160, y); g.stroke(); }
        g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 3; roundRect(g, 26, 26, S - 52, S - 52, 96); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 3; roundRect(g, 30, 30, S - 60, S - 60, 94); g.stroke();
        for (const [x, y] of [[88, 88], [S - 88, 88], [S - 88, S - 88], [88, S - 88]]) {   // the cover's screws
          const sg = g.createRadialGradient(x - 3, y - 3, 1, x, y, 13); sg.addColorStop(0, '#c9ced6'); sg.addColorStop(1, '#4b4f58'); g.fillStyle = sg; g.beginPath(); g.arc(x, y, 12, 0, 7); g.fill();
          g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 7, y - 4); g.lineTo(x + 7, y + 4); g.stroke(); }
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      // each side: the wind lamp, the score in seven-segment LED behind dark glass, the turn light along the edge
      for (let s = 0; s < 4; s++) {
        g.save(); g.translate(C, C); g.rotate(-s * PI / 2);
        const wind = (s - I.dealer + 4) % 4, on = I.turn === s, east = wind === 0;
        if (!em) {   // the turn light's slot · the score window · the lamp's housing
          g.fillStyle = '#0a0b0e'; roundRect(g, -250, 438, 500, 16, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; roundRect(g, -250, 438, 500, 16, 8); g.stroke();
          g.fillStyle = '#050608'; roundRect(g, -178, 312, 396, 104, 14); g.fill();
          const gl = g.createLinearGradient(0, 312, 0, 416); gl.addColorStop(0, 'rgba(255,255,255,.1)'); gl.addColorStop(.4, 'rgba(255,255,255,0)'); g.fillStyle = gl; roundRect(g, -178, 312, 396, 104, 14); g.fill();
          g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2.5; roundRect(g, -178, 312, 396, 104, 14); g.stroke();
          g.fillStyle = '#08090c'; roundRect(g, -300, 312, 104, 104, 16); g.fill(); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2.5; roundRect(g, -300, 312, 104, 104, 16); g.stroke();
        }
        if (on) { const lg = g.createLinearGradient(-250, 0, 250, 0); lg.addColorStop(0, 'rgba(255,150,40,.25)'); lg.addColorStop(.5, 'rgba(255,190,90,1)'); lg.addColorStop(1, 'rgba(255,150,40,.25)');
          g.fillStyle = lg; g.shadowColor = '#ff9a2e'; g.shadowBlur = em ? 26 : 12; roundRect(g, -246, 441, 492, 10, 5); g.fill(); g.shadowBlur = 0; }
        // the wind lamp: the dealer's is lit red, the others glow faintly
        g.fillStyle = east ? '#d12a3c' : (em ? '#10141c' : '#161a22'); roundRect(g, -292, 320, 88, 88, 11); g.fill();
        g.fillStyle = east ? '#fff' : (em ? '#56617a' : '#a9b4cc'); g.font = '800 62px "Shippori Mincho B1", serif'; g.fillText(WN[wind], -248, 366);
        // the score: up to six places, right-aligned; unlit segments show faintly through the glass
        const txt = String(I.scores[s]).slice(-6).padStart(6, ' '), dw = 44, dh = 68, gap = 16, x0 = 200 - 6 * dw - 5 * gap, col = on ? '#ffc04a' : '#ff5a36';
        g.shadowColor = on ? '#ff9a2e' : '#ff3a1a'; g.shadowBlur = em ? 16 : 8;
        for (let i = 0; i < 6; i++) seg7(g, x0 + i * (dw + gap), 330, dw, dh, txt[i], col, em ? null : 'rgba(255,90,54,.07)');
        g.shadowBlur = 0;
        g.restore();
      }
      // the centre: a round screen behind a metal ring (where a table's dice dome sits) — the round, the tiles left, 本場 / 供託
      g.save(); g.translate(C, C);
      if (!em) { const ring = g.createLinearGradient(-230, -230, 230, 230); ring.addColorStop(0, '#e2e6ec'); ring.addColorStop(.35, '#7c828c'); ring.addColorStop(.6, '#c4c9d1'); ring.addColorStop(1, '#565b64');
        g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(3, 5, 232, 0, 7); g.fill();
        g.fillStyle = ring; g.beginPath(); g.arc(0, 0, 228, 0, 7); g.fill(); }
      const scr = g.createRadialGradient(-40, -60, 20, 0, 0, 215); scr.addColorStop(0, em ? '#0d2242' : '#12305c'); scr.addColorStop(1, em ? '#030814' : '#06101f');
      g.fillStyle = scr; g.beginPath(); g.arc(0, 0, 208, 0, 7); g.fill();
      g.fillStyle = '#8fe6ff'; g.shadowColor = '#3ab8ff'; g.shadowBlur = em ? 20 : 10;
      g.font = '800 84px "Shippori Mincho B1", serif'; g.fillText(`${WN[I.round]}${I.kyoku + 1}局`, 0, -74);
      g.font = '700 38px "Zen Kaku Gothic New", sans-serif'; g.fillText('余', -74, 34);
      const lf = String(I.left).padStart(2, ' '); for (let i = 0; i < 2; i++) seg7(g, -30 + i * 62, 0, 44, 68, lf[i], '#8fe6ff', em ? null : 'rgba(143,230,255,.06)');
      g.shadowBlur = em ? 8 : 0;
      g.font = '700 30px "Zen Kaku Gothic New", sans-serif'; g.fillStyle = em ? '#7f95bd' : '#a9bcdf';
      g.fillText(`${I.honba}本場  供託${I.kyotaku / 1000}`, 0, 126);
      g.shadowBlur = 0;
      if (!em) { const gl = g.createLinearGradient(0, -208, 0, 40); gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 208, PI, 2 * PI); g.fill(); }   // the glass
      g.restore();
    }
    this.conETex.needsUpdate = true;
    this.conTex.needsUpdate = true;
    this.dirty = true;
  }

  // ---------------------------------------------------------------- camera / loop
  resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    const a = w / h;
    this.camera.aspect = a;
    // fit the table width: landscape tilts toward the player, portrait looks almost straight down
    const P = a >= 1.9 ? { fov: 30, elev: 50, fitX: 11.9, tz: 0.9 }
      : a >= 1.55 ? { fov: 34, elev: 54, fitX: 14.8, tz: 1.6 }
      : a >= 1.2 ? { fov: 34, elev: 52, fitX: 12.9, tz: 0.45 }
      : a >= 0.8 ? { fov: 42, elev: 66, fitX: 10.8, tz: 0.4 }
      : { fov: 46, elev: 78, fitX: 7.5, tz: -1.8 };
    const V = P.fov * PI / 180, hf = 2 * Math.atan(Math.tan(V / 2) * a);
    const d = P.fitX / Math.tan(hf / 2);
    const e = P.elev * PI / 180;
    this.camera.fov = P.fov;
    this.lookAt = new THREE.Vector3(0, 0, P.tz);
    this.camera.position.set(0, d * Math.sin(e), P.tz + d * Math.cos(e));
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.lookAt);
    this.dirty = true;
  }
  // quality: 'high' | 'lite'. Lite drops shadows and renders at 1x pixel ratio.
  setQuality(q) {
    const lite = q === 'lite';
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lite ? 1 : this.mobile ? 1.25 : 1.5));
    this.renderer.shadowMap.enabled = !lite;
    this.key.castShadow = !lite;
    this.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(x => x.needsUpdate = true); } });
    this.resize();
  }
  // stop the frame loop while the table is not on screen
  pause() { this.paused = true; }
  resume() { if (!this.paused) return; this.paused = false; this.dirty = true; requestAnimationFrame(this._loop); }
  // ---------------------------------------------------------------- debug (the I key): polygons and the rest of the frame's cost
  // The numbers are the renderer's own for the last frame drawn (the table draws on demand, so they stand still while nothing
  // moves): triangles and draw calls as sent to the GPU (the shadow pass included), then the scene by itself — meshes shown,
  // their triangles, how many are tiles — and the memory side (geometries, textures, programs), the canvas size and the frame time.
  toggleDebug() {
    if (this._dbg) { this._dbg.remove(); this._dbg = null; return false; }
    const el = this._dbg = document.createElement('pre');
    el.style.cssText = 'position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:50;margin:0;padding:10px 12px;border-radius:10px;background:rgba(8,10,18,.82);color:#d6f5e3;font:12px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;pointer-events:none;white-space:pre;text-align:left;direction:ltr';
    (this.renderer.domElement.parentNode || document.body).appendChild(el);
    this._dbgT = 0; this.dirty = true; return true;
  }
  _dbgPaint(now) {
    const I = this.renderer.info, R = I.render, n = x => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    let meshes = 0, tris = 0, tileTris = 0, tilesOn = 0;
    this.scene.traverseVisible(o => { if (!o.isMesh) return; meshes++; const g = o.geometry, t = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += t; });
    for (const g of this.tiles.values()) if (g.visible) { tilesOn++; g.traverse(o => { if (o.isMesh) { const q = o.geometry; tileTris += (q.index ? q.index.count : q.attributes.position.count) / 3; } }); }
    const dt = this._dbgT ? now - this._dbgT : 0; this._dbgT = now;
    const cv = this.renderer.domElement;
    this._dbg.textContent = [
      'DEBUG  (I: close)',
      'triangles  ' + n(R.triangles) + '   (GPU, with the shadow pass)',
      'draw calls ' + n(R.calls),
      'scene      ' + n(tris) + ' tris · ' + n(meshes) + ' meshes',
      ' tiles     ' + n(tileTris) + ' tris · ' + n(tilesOn) + ' shown',
      ' table     ' + n(tris - tileTris) + ' tris',
      'geometries ' + n(I.memory.geometries) + ' · textures ' + n(I.memory.textures) + ' · programs ' + (I.programs ? I.programs.length : '-'),
      'canvas     ' + cv.width + '×' + cv.height + ' (×' + this.renderer.getPixelRatio().toFixed(2) + ') · shadows ' + (this.renderer.shadowMap.enabled ? 'on' : 'off'),
      'frame      ' + (dt && dt < 1000 ? dt.toFixed(1) + ' ms since the last draw' : 'on demand (idle)'),
    ].join('\n');
  }
  _loop(now) {
    if (this.paused) return;
    requestAnimationFrame(this._loop);
    if (this.tweens.length) {
      this.tweens = this.tweens.filter(tw => {
        let k = Math.min(1, (now - tw.t0) / tw.dur);
        const e = 1 - Math.pow(1 - k, 3);
        const f = tw.from, t = tw.to, g = tw.g;
        const arc = Math.sin(k * PI) * 0.6;
        g.position.set(f.x + (t.x - f.x) * e, f.y + (t.y - f.y) * e + arc, f.z + (t.z - f.z) * e);
        g.rotation.set(f.rx + (t.rx - f.rx) * e, f.ry + (t.ry - f.ry) * e, f.rz + (t.rz - f.rz) * e);
        return k < 1;
      });
      this.dirty = true;
    }
    if (!this.dirty || document.hidden) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
    if (this._dbg) this._dbgPaint(now);
  }
  // screen position of a seat's area (for placing HTML badges)
  project(seat, lx, lz) {
    const p = this.local(seat, lx, lz);
    const v = new THREE.Vector3(p.x, 0.5, p.z).project(this.camera);
    return { x: (v.x + 1) / 2 * this.host.clientWidth, y: (1 - v.y) / 2 * this.host.clientHeight };
  }
}
root.Table3D = Table3D;
})(window);
