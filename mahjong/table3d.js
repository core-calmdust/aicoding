// 3D mahjong table (three.js r128). Draws rivers, opponents' hands, melds, the center console and riichi sticks.
// Seat 0 is the player (bottom); seats go counter-clockwise (1 right, 2 top, 3 left).
// Rendering is on demand: render() only when something changed or while tweens run.
(function (root) {
'use strict';
const W = 1, H = 1.36, D = 0.78;
// ---- baked textures (2026-11-14, optimisation): the slow procedural pictures — the felt (~0.5 s), the walnut and its height map
// (~0.9 s), the stone of the backs (~0.1 s) — ship as images made from the very same code (tools/bake-tex.py). They are fetched as
// the page opens; if one is not there in time (or ?nobake), the code below draws it as before. Every drawn one is kept in
// JANKA_TEXGEN for the baking tool.
const BAKE_V = 1, BAKED = {};
if (!/[?&]nobake\b/.test(location.search)) for (const n of ['felt', 'wood', 'woodb', 'stone']) { const im = new Image(); im.decoding = 'async'; im.src = (root.JANKA_ASSETS || '../images/mahjong/') + 'tex/' + n + '.webp?v=' + BAKE_V; BAKED[n] = im; }
function bakedCanvas(name) { const im = BAKED[name]; if (!im || !im.complete || !im.naturalWidth) return null;
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); return c; }
const keepGen = (name, c) => { (root.JANKA_TEXGEN = root.JANKA_TEXGEN || {})[name] = c; };
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
// the sleeve's weave (ユーザー 2026-11-14: cloth, not a slick, shiny skin): a tiling twill height map — over-under threads in a diagonal
// rhythm plus a little slub — for the bump, so the light breaks up on the threads instead of sliding over a smooth surface
function weaveTex() {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), im = g.createImageData(S, S), N = mkNoise(53), T = 4;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const cx = (x % T) / T, cy = (y % T) / T, warp = ((Math.floor(x / T) + Math.floor(y / T)) % 4) < 2;   // a 2/2 twill
    const v = warp ? Math.sin(cy * Math.PI) * (.6 + .4 * Math.sin(cx * Math.PI)) : Math.sin(cx * Math.PI) * (.6 + .4 * Math.sin(cy * Math.PI));
    const k = Math.max(0, Math.min(255, 70 + v * 150 + (N.R() - .5) * 40)), i = (y * S + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = k; im.data[i + 3] = 255; }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 10); return t;
}
// walnut, lacquered (ユーザー 2026-11-14: a more real grain, and a gloss): a flat-sawn board — the growth rings cut at a slant
// show as long bands that open into flame-like arches (cathedrals) and close again, each ring a pale early wood fading into a dark,
// sharp late-wood edge; open pores as fine dark dashes along the grain (thick in the early wood), a few darker mineral streaks,
// and a slow shift of colour from honey to chocolate along the board. A matching height map (the pores and the late wood a hair
// lower) gives the lacquer something to catch on. u runs along the grain and wraps.
function woodTex() {
  const tex = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  { const bm = bakedCanvas('wood'), bb = bakedCanvas('woodb'); if (bm && bb) { const map = tex(bm); map.encoding = THREE.sRGBEncoding; return { map, bump: tex(bb) }; } }
  const Wd = 4096, Hd = 384, N = mkNoise(53);   // (one whole rail along u: nothing repeats along a rail — ユーザー 2026-11-14)
  const c = document.createElement('canvas'); c.width = Wd; c.height = Hd; const g = c.getContext('2d'), im = g.createImageData(Wd, Hd), o = im.data;
  const cb = document.createElement('canvas'); cb.width = Wd; cb.height = Hd; const gb = cb.getContext('2d'), ib = gb.createImageData(Wd, Hd), ob = ib.data;
  const A = N.oct([5, 11, 23]), B = N.oct([3, 7]), Cn = N.oct([40, 83, 167]), Dn = N.oct([5, 13]), Pn = N.oct([512, 257]), E = N.oct([7, 17]);
  const mix = (a, b, t) => a + (b - a) * t, sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const H = new Float32Array(Wd * Hd);
  for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
    const u = x / Wd, v = y / Hd;
    const warp = N.fbm(B, u, v) - .5, slow = N.fbm(Dn, u, v * .5);
    // the cathedrals: the ring index bends into arches along the board (two arches per wrap), their tips wandering
    // (ユーザー 2026-11-14: no knots or closed rings — a table like this is cut clear of them: the grain runs as long, uneven
    // lines.) The ring index climbs steadily across the board (it never turns back, so no line closes on itself); it drifts
    // a little along the length, and the years are of uneven width.
    const ring = (v + (N.fbm(B, u, v) - .5) * .09 + (N.fbm(Dn, u, v) - .5) * .05) * 10 + (N.fbm(A, u, v) - .5) * .35;   // (every term wraps with v: no seam round the rail)
    const f = ring - Math.floor(ring);
    const yr = Math.floor(ring), hsh = Math.abs(Math.sin(yr * 12.9898 + 4.1) * 43758.5453) % 1;   // this year's own width of late wood
    const late = sstep(.5 + hsh * .3, .9, f) * (1 - sstep(.93, 1, f)) * (.55 + hsh * .45);               // early wood pale, darkening into a sharp late-wood edge
    const streak = N.fbm(Cn, u, v * 5) - .5;                               // fine streaks along the grain
    const mineral = Math.max(0, N.fbm(Dn, u + .37, v * 4) - .64) * 3;   // the odd darker streak
    let t = .64 - late * .34 + streak * .3 - mineral * .35 + (slow - .5) * .3; t = Math.min(1, Math.max(0, t));
    // pores: short dark dashes along the grain (high-frequency noise squeezed along u), more of them in the early wood
    const pn = N.fbm(Pn, u, v * 6);
    const pore = sstep(.66 - (1 - late) * .04, .76, pn);
    const warm = slow;                                                       // honey ↔ chocolate along the board
    const d = (N.R() - .5) * 2.5, p = (y * Wd + x) * 4;
    let r = mix(mix(46, 58, warm), mix(150, 170, warm), t), gg = mix(mix(24, 30, warm), mix(92, 104, warm), t), bb = mix(mix(12, 14, warm), mix(50, 52, warm), t);
    r *= 1 - pore * .3; gg *= 1 - pore * .34; bb *= 1 - pore * .34;
    o[p] = r + d; o[p + 1] = gg + d; o[p + 2] = bb + d; o[p + 3] = 255;
    const h = .6 - late * .25 - pore * .28 + streak * .1; H[y * Wd + x] = h;
    const k = Math.max(0, Math.min(255, h * 255)); ob[p] = ob[p + 1] = ob[p + 2] = k; ob[p + 3] = 255;
  }
  g.putImageData(im, 0, 0); gb.putImageData(ib, 0, 0); keepGen('wood', c); keepGen('woodb', cb);
  const tex_ = cv => { const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; };
  void tex_; const map = tex(c); map.encoding = THREE.sRGBEncoding;
  return { map, bump: tex(cb) };
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
  { const b = bakedCanvas('stone'); if (b) { const t = new THREE.CanvasTexture(b); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; } }
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
  keepGen('stone', c);
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
// (ユーザー 2026-11-14: the face looked angular. What is meant is the edge where the face turns down into the sides — a fuller round
// there (a quarter round of 0.15, five steps), not a rounder outline seen from the front: the corner radius stays as it was.
// The picture keeps its size.)
function tileGeos(w, h, d, r, b, backT, bs) {
  bs = bs || b;
  const PW = (w - 0.17) / .94, PH = (h - 0.17) / .94;   // the picture's size on the face (as before the wider round-over)
  const s = new THREE.Shape(), x0 = -w / 2 + bs, y0 = -h / 2 + bs, x1 = w / 2 - bs, y1 = h / 2 - bs, q = Math.max(.01, r - bs);
  s.moveTo(x0 + q, y0); s.lineTo(x1 - q, y0); s.quadraticCurveTo(x1, y0, x1, y0 + q); s.lineTo(x1, y1 - q); s.quadraticCurveTo(x1, y1, x1 - q, y1);
  s.lineTo(x0 + q, y1); s.quadraticCurveTo(x0, y1, x0, y1 - q); s.lineTo(x0, y0 + q); s.quadraticCurveTo(x0, y0, x0 + q, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * b, steps: 2, bevelEnabled: true, bevelThickness: b, bevelSize: bs, bevelSegments: 5, curveSegments: 4 });
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
  for (let i = 0; i < n; i++) { uv[i * 2] = pos[i * 3] / PW + .5; uv[i * 2 + 1] = pos[i * 3 + 1] / PH + .5; }
  const tris = []; for (let i = 0; i < n; i += 3) tris.push(i);
  const cz = i => (pos[i * 3 + 2] + pos[i * 3 + 5] + pos[i * 3 + 8]) / 3, isFace = i => fn[i * 3 + 2] > .6 && cz(i) > d / 2 - b * .75;   // the flat and the gentle start of the round-over
  const make = (list, backUV) => { const ng = new THREE.BufferGeometry(), m = list.length * 3, p = new Float32Array(m * 3), nn = new Float32Array(m * 3), u = new Float32Array(m * 2);
    list.forEach((i, j) => { for (let v = 0; v < 3; v++) { const a = i + v, o = j * 3 + v; p.set(pos.subarray(a * 3, a * 3 + 3), o * 3); nn.set(nor.subarray(a * 3, a * 3 + 3), o * 3);
      if (backUV) { u[o * 2] = (pos[a * 3] + w / 2) / w; u[o * 2 + 1] = (pos[a * 3 + 1] + h / 2) / h; } else { u[o * 2] = uv[a * 2]; u[o * 2 + 1] = uv[a * 2 + 1]; } } });
    ng.setAttribute('position', new THREE.BufferAttribute(p, 3)); ng.setAttribute('normal', new THREE.BufferAttribute(nn, 3)); ng.setAttribute('uv', new THREE.BufferAttribute(u, 2)); return ng; };
  const face = tris.filter(isFace), body = tris.filter(i => !isFace(i) && cz(i) > zs), bk = tris.filter(i => cz(i) <= zs);
  const front = make(face.concat(body)); front.addGroup(0, face.length * 3, 0); front.addGroup(face.length * 3, body.length * 3, 1);
  g.dispose();
  return { front, back: make(bk, true) };
}
// ---- a hand (2026-11-14, ユーザー: a slender woman's hand lays the tile down — for discards, and for chi / pon / kan; very real) ----
// The mesh is the "generic-hand" model of WebXR Input Profiles (MIT License, Copyright (c) 2019 Amazon — ユーザー: MIT with a credit
// is fine), posed offline to lay a tile and baked (mahjong/tools/hand-gen.py → hand.js; the licence text is in hand.js and
// tools/hand-src/). Here it gets its skin (vertex colours: warmer at the fingertips), glossy nails, and the sleeve of a Chinese
// dress closing just above the wrist. The rig's origin is the point the fingertips hold (the top of the tile);
// −z points away from the owner, +z up the arm.
// the sleeve's silk brocade, woven on a ground of `base` (crimson by default; each seat wears its sisters' colour — ユーザー 2026-11-14)
function brocadeTex(base) {
  const bc = document.createElement('canvas'); bc.width = bc.height = 512; const g2 = bc.getContext('2d');
  { g2.fillStyle = base; g2.fillRect(0, 0, 512, 512);
    let sd = 9; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 2600; i++) { g2.strokeStyle = `rgba(${R() < .5 ? '255,190,170' : '40,0,6'},${.03 + R() * .05})`; g2.lineWidth = 1; const x = R() * 512, y = R() * 512; g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x, y + 6 + R() * 16); g2.stroke(); }   // the weave
    const gold = 'rgba(232,186,96,.92)', dim = 'rgba(206,150,70,.6)';
    const flower = (x, y, r) => { g2.save(); g2.translate(x, y);
      g2.strokeStyle = gold; g2.lineWidth = 3; g2.beginPath(); g2.arc(0, 0, r, 0, 7); g2.stroke(); g2.lineWidth = 1.6; g2.beginPath(); g2.arc(0, 0, r * .86, 0, 7); g2.stroke();
      for (let k = 0; k < 8; k++) { g2.rotate(Math.PI / 4); g2.fillStyle = gold; g2.beginPath(); g2.ellipse(0, -r * .47, r * .15, r * .27, 0, 0, 7); g2.fill(); g2.fillStyle = dim; g2.beginPath(); g2.ellipse(r * .2, -r * .5, r * .07, r * .17, .4, 0, 7); g2.fill(); }
      g2.fillStyle = base; g2.beginPath(); g2.arc(0, 0, r * .2, 0, 7); g2.fill(); g2.fillStyle = gold; g2.beginPath(); g2.arc(0, 0, r * .12, 0, 7); g2.fill(); g2.restore(); };
    const cloud = (x, y, k) => { g2.save(); g2.translate(x, y); g2.scale(k, k); g2.strokeStyle = dim; g2.lineWidth = 3.2; g2.lineCap = 'round';
      for (const sx of [-1, 1]) { g2.beginPath(); for (let a = 0; a < 5.4; a += .2) { const rr = 4 + a * 3.4; g2.lineTo(sx * (22 + Math.cos(a) * rr), Math.sin(a) * rr); } g2.stroke(); }
      g2.beginPath(); g2.moveTo(-44, 14); g2.quadraticCurveTo(0, 30, 44, 14); g2.stroke(); g2.restore(); };
    for (const [x, y] of [[128, 128], [384, 384]]) for (const [ox, oy] of [[0, 0], [512, 0], [-512, 0], [0, 512], [0, -512]]) flower(x + ox, y + oy, 86);
    for (const [x, y] of [[384, 128], [128, 384]]) cloud(x, y, 1.25); }
  const bro = new THREE.CanvasTexture(bc); bro.encoding = THREE.sRGBEncoding; bro.wrapS = bro.wrapT = THREE.RepeatWrapping; bro.repeat.set(4, 5); bro.anisotropy = 4;
  return bro;
}
// the carpet under the table (ユーザー 2026-11-14, from a reference photo): a deep red rug of the Turkmen kind — rows of dark
// octagonal guls on the red field with small branch motifs between, a border of stepped motifs between dark bands. Low in
// contrast, and lit only a little: it is barely there in the dark room, just enough to read. 2048 px over the whole rug.
function rugTex() {
  const S = 2048, c = document.createElement('canvas'); c.width = c.height = S / 2; const g = c.getContext('2d'); g.scale(.5, .5);   // (drawn at half size: it lies dim and far — 2026-11-14, optimisation)
  let sd = 21; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const red = '#5c171b', red2 = '#4a1215', dark = 'rgba(28,6,8,.92)', dark2 = 'rgba(28,6,8,.6)';
  g.fillStyle = red; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40000; i++) { g.fillStyle = `rgba(${R() < .5 ? '255,120,110' : '20,0,0'},${.025 + R() * .05})`; g.fillRect(R() * S, R() * S, 2 + R() * 3, 1 + R() * 2); }   // the wool
  const B = 230;   // the border's width
  // the field: rows of guls (an octagon, quartered, with small hooks) and little branch motifs between them
  const gul = (x, y, w, h) => { g.save(); g.translate(x, y);
    const oct = (a, b) => { const k = .3; g.beginPath(); g.moveTo(-a * (1 - k), -b); g.lineTo(a * (1 - k), -b); g.lineTo(a, -b * (1 - k)); g.lineTo(a, b * (1 - k)); g.lineTo(a * (1 - k), b); g.lineTo(-a * (1 - k), b); g.lineTo(-a, b * (1 - k)); g.lineTo(-a, -b * (1 - k)); g.closePath(); };
    oct(w, h); g.fillStyle = dark; g.fill();
    oct(w * .86, h * .8); g.fillStyle = red2; g.fill();
    g.fillStyle = dark2; g.fillRect(-w * .86, -2, w * 1.72, 4); g.fillRect(-2, -h * .8, 4, h * 1.6);   // quartered
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.fillStyle = dark; g.fillRect(sx * w * .45 - 9, sy * h * .42 - 9, 18, 18); g.fillStyle = red; g.fillRect(sx * w * .45 - 4, sy * h * .42 - 4, 8, 8); }
    for (const sx of [-1, 1]) { g.fillStyle = dark; g.beginPath(); g.moveTo(sx * w, 0); g.lineTo(sx * (w + 18), -14); g.lineTo(sx * (w + 18), 14); g.closePath(); g.fill(); }
    g.restore(); };
  const branch = (x, y) => { g.save(); g.translate(x, y); g.strokeStyle = dark; g.lineWidth = 6; g.lineCap = 'square';
    g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 34); for (const yy of [-22, -6, 10, 26]) { g.moveTo(0, yy); g.lineTo(-16, yy - 10); g.moveTo(0, yy); g.lineTo(16, yy - 10); } g.stroke(); g.restore(); };
  const GX = 230, GY = 150;
  for (let row = 0, y = B + 90; y < S - B - 40; y += GY, row++) for (let x = B + 100 + (row % 2) * GX / 2; x < S - B - 60; x += GX) gul(x, y, 72, 46);
  for (let row = 0, y = B + 90 + GY / 2; y < S - B - 40; y += GY, row++) for (let x = B + 100 + ((row + 1) % 2) * GX / 2; x < S - B - 60; x += GX) branch(x, y);
  // the border: a dark outer band with a chain of small diamonds, a red band of stepped (elem) motifs, a dark inner line
  g.fillStyle = dark; g.fillRect(0, 0, S, 60); g.fillRect(0, S - 60, S, 60); g.fillRect(0, 0, 60, S); g.fillRect(S - 60, 0, 60, S);
  g.fillStyle = red2; g.fillRect(60, 60, S - 120, B - 80); g.fillRect(60, S - B + 20, S - 120, B - 80); g.fillRect(60, 60, B - 80, S - 120); g.fillRect(S - B + 20, 60, B - 80, S - 120);
  g.fillStyle = red; g.fillRect(B - 20, B - 20, S - 2 * B + 40, S - 2 * B + 40);
  g.fillStyle = red; for (let k = 30; k < S; k += 46) for (const [x, y] of [[k, 30], [k, S - 30], [30, k], [S - 30, k]]) { g.save(); g.translate(x, y); g.rotate(PI / 4); g.fillRect(-9, -9, 18, 18); g.restore(); }
  const step = (x, y) => { g.save(); g.translate(x, y); g.fillStyle = dark; for (const [w, h, yy] of [[64, 14, -28], [44, 14, -14], [24, 14, 0], [44, 14, 14], [64, 14, 28]]) g.fillRect(-w / 2, yy - h / 2, w, h); g.fillStyle = red; g.fillRect(-6, -6, 12, 12); g.restore(); };
  const mid = (60 + B - 20) / 2;
  for (let k = mid + 40; k < S - mid - 20; k += 110) { step(k, mid); step(k, S - mid); g.save(); g.translate(mid, k); g.rotate(PI / 2); step(0, 0); g.restore(); g.save(); g.translate(S - mid, k); g.rotate(PI / 2); step(0, 0); g.restore(); }
  g.strokeStyle = dark; g.lineWidth = 10; g.strokeRect(B - 20, B - 20, S - 2 * B + 40, S - 2 * B + 40); g.lineWidth = 6; g.strokeRect(66, 66, S - 132, S - 132);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
}
function buildHand(env) {
  const Hd = window.JANKA_HAND, rig = new THREE.Group(); if (!Hd) return rig;
  const b64 = t => { const s = atob(t), a = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a; };
  const q = new Uint16Array(b64(Hd.p).buffer), pos = new Float32Array(Hd.nv * 3), cb = b64(Hd.c), col = new Float32Array(Hd.nv * 3), lin = v => Math.pow(v / 255, 2.2);
  for (let i = 0; i < Hd.nv * 3; i++) { const k = i % 3; pos[i] = Hd.lo[k] + q[i] / 65535 * (Hd.hi[k] - Hd.lo[k]); col[i] = lin(cb[i]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint16Array(b64(Hd.i).buffer), 1));
  if (Hd.n) { const nb = new Int8Array(b64(Hd.n).buffer), nr = new Float32Array(Hd.nv * 3); for (let i = 0; i < nr.length; i++) nr[i] = nb[i] / 127; g.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); } else g.computeVertexNormals();
  // the second pose (pinching: the thumb under the tile, the forefinger on its face — ユーザー 2026-11-14) as a morph target
  if (Hd.mi) { const mi = new Uint16Array(b64(Hd.mi).buffer), mp = new Uint16Array(b64(Hd.mp).buffer), mn = new Int8Array(b64(Hd.mn).buffer), p2 = pos.slice(), n2 = g.attributes.normal.array.slice();
    for (let k = 0; k < mi.length; k++) for (let c = 0; c < 3; c++) { p2[mi[k] * 3 + c] = Hd.lo[c] + mp[k * 3 + c] / 65535 * (Hd.hi[c] - Hd.lo[c]); n2[mi[k] * 3 + c] = mn[k * 3 + c] / 127; }
    g.morphAttributes.position = [new THREE.BufferAttribute(p2, 3)]; g.morphAttributes.normal = [new THREE.BufferAttribute(n2, 3)]; }
  g.addGroup(0, Hd.nail * 3, 0); g.addGroup(Hd.nail * 3, (Hd.nt - Hd.nail) * 3, 1);
  // skin (ユーザー 2026-11-14: it read as polygons — the mesh is now rounded finer and coloured unevenly as skin is, by the generator):
  // soft and matt; where the light turns to shade the flesh glows a little red (light passing through it), and a thin warm rim at grazing angles
  // (ユーザー 2026-11-14: the hand looked dark in the shade — fair and clean like a hand model's: lighter skin that glows a little from within
  // (so the shaded side stays rosy, never grey), and casts no shadow on itself)
  const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, color: new THREE.Color(0xf6e6de).convertSRGBToLinear(), roughness: .5, metalness: 0, sheen: .35, sheenRoughness: .5, sheenColor: new THREE.Color(0xffe0d4), emissive: new THREE.Color(0xc98a78), emissiveIntensity: .32, envMap: env, envMapIntensity: .35 });
  // (ユーザー 2026-11-14: a feel of skin — a fine texture on the hand.) The mesh has no uv, so the detail is solid noise in the hand's own
  // space, worked into the normal as a bump: pores (a fine pitted grain), the faint diamond lines of skin, and a slow unevenness; the
  // same noise makes the gloss uneven (the pores matt, the skin between a little sheen) and the colour very slightly blotchy.
  skin.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vSkP;\n' + sh.vertexShader.replace('#include <morphtarget_vertex>', '#include <morphtarget_vertex>\n vSkP = transformed;');
    sh.fragmentShader = `varying vec3 vSkP;
      float skH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float skN(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(mix(skH(i), skH(i + vec3(1,0,0)), f.x), mix(skH(i + vec3(0,1,0)), skH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(skH(i + vec3(0,0,1)), skH(i + vec3(1,0,1)), f.x), mix(skH(i + vec3(0,1,1)), skH(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float skHeight(vec3 p){
        float pore = smoothstep(.62, .82, skN(p * 46.)) ;                                  // pits
        float lines = abs(sin(dot(p, vec3(31., 9., 23.)) + skN(p * 7.) * 3.)) * abs(sin(dot(p, vec3(-11., 27., 19.)) + skN(p * 6.) * 3.));   // the skin's criss-cross lines
        return -pore * .6 + (1. - smoothstep(0., .25, lines)) * -.35 + skN(p * 9.) * .4; }
      vec3 skPerturb(vec3 surf_pos, vec3 n, vec2 dH, float fd){ vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos), r1 = cross(sy, n), r2 = cross(n, sx);
        float det = dot(sx, r1) * fd; vec3 g = sign(det) * (dH.x * r1 + dH.y * r2); return normalize(abs(det) * n - g); }
    ` + sh.fragmentShader
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float hh = skHeight(vSkP) * .0016; normal = skPerturb(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor * (.9 + .25 * smoothstep(.55, .85, skN(vSkP * 46.))), .05, 1.);`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        diffuseColor.rgb *= .97 + .06 * skN(vSkP * 4.5);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
    { vec3 sL = normalize((viewMatrix * vec4(.2, 1., .3, 0.)).xyz); float sn = dot(normalize(vNormal), sL), sv = 1. - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0., 1.);
      totalEmissiveRadiance += diffuseColor.rgb * vec3(1., .3, .2) * (smoothstep(-.55, .05, sn) * (1. - smoothstep(.0, .6, sn)) * .34 + sv * sv * sv * .16); }`); };
  const nail = new THREE.MeshPhysicalMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: .22, clearcoat: 1, clearcoatRoughness: .05, envMap: env, envMapIntensity: .9,   // (long nails: a thin shell, seen from both sides — ユーザー 2026-11-14)
    emissive: new THREE.Color(0x40141c), emissiveIntensity: .35 });
  // the nails (ユーザー 2026-11-14, a picture of long coffin nails): a sheer nude pink under a high gloss, with fine glitter in it —
  // tiny flecks that flash as the hand turns
  nail.onBeforeCompile = sh => {
    sh.vertexShader = 'varying vec3 vNkP;\n' + sh.vertexShader.replace('#include <morphtarget_vertex>', '#include <morphtarget_vertex>\n vNkP = transformed;');
    sh.fragmentShader = 'varying vec3 vNkP;\nfloat nkH(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec3 c = floor(vNkP * 90.), f = fract(vNkP * 90.) - .5; float r = nkH(c);
        if (r > .78) { vec3 fn = normalize(vec3(nkH(c + 1.), nkH(c + 2.), nkH(c + 3.)) - .5); float sp = pow(max(0., dot(reflect(normalize(vViewPosition), normalize(vNormal)), fn)), 6.);
          totalEmissiveRadiance += vec3(1., .95, .97) * sp * smoothstep(.45, .1, length(f)) * 2.2; } }`); };
  const hand = new THREE.Mesh(g, [skin, nail]); hand.castShadow = true; hand.frustumCulled = false; rig.add(hand); if (Hd.mi) hand.morphTargetInfluences = [0];
  // the sleeve (ユーザー 2026-11-14: only a glimpse of the wrist, the sleeve long; a pattern as on a Chinese dress): crimson silk
  // brocade — gold flower roundels and cloud scrolls woven in — closing just above the wrist in a black band between two gold pipings.
  const bro = brocadeTex('#8c1626');
  const cloth = new THREE.MeshPhysicalMaterial({ map: bro, roughness: .93, metalness: 0, sheen: .3, sheenRoughness: .9, sheenColor: new THREE.Color(0xb08078), envMap: env, envMapIntensity: .04, bumpMap: weaveTex(), bumpScale: 1.2 });   // (ユーザー 2026-11-14: woven cloth — matt, a soft fuzz at the edges, no reflections)
  const band = new THREE.MeshStandardMaterial({ color: new THREE.Color(0x14080c).convertSRGBToLinear(), roughness: .6 });
  rig.clothMat = cloth;   // (not in userData: clone() copies that through JSON)
  const gold = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd9b062).convertSRGBToLinear(), roughness: .32, metalness: .85, envMap: env, envMapIntensity: .9 });
  const sl = new THREE.Group(); sl.position.set(Hd.wrist[0], Hd.wrist[1], Hd.wrist[2]); sl.rotation.x = Hd.pitch; rig.add(sl);   // from just above the wrist on up the arm
  { const r0 = Hd.wr ? Hd.wr[0] * 1.1 : .8, SY = Hd.wr ? Math.min(1, Hd.wr[1] * 1.16 / r0) : .8, r1 = r0 + .95, Ls = 15;   // (the cuff fits the wrist of the model)
    const cg = new THREE.CylinderGeometry(r1, r0, Ls, 28, 1, true); cg.rotateX(PI / 2); cg.translate(0, 0, Ls / 2 + .34); const m = new THREE.Mesh(cg, cloth); m.scale.set(1, SY, 1); m.castShadow = true; m.userData.sleeve = true; sl.add(m);
    const bg = new THREE.CylinderGeometry(r0 + .02, r0 - .02, .34, 28, 1, true); bg.rotateX(PI / 2); bg.translate(0, 0, .17); const bm = new THREE.Mesh(bg, band); bm.scale.set(1, SY, 1); sl.add(bm);
    for (const z of [0, .34]) { const cuff = new THREE.Mesh(new THREE.TorusGeometry(r0 + (z ? .02 : -.02), .045, 8, 32), gold); cuff.position.z = z; cuff.scale.set(1, SY, 1); cuff.castShadow = true; sl.add(cuff); }
    const cap = new THREE.Mesh(new THREE.CircleGeometry(r0 - .04, 24), band); cap.scale.set(1, SY, 1); cap.rotation.y = PI; cap.position.z = .06; sl.add(cap); }
  // (the sleeve follows the wrist between the two poses)
  if (Hd.wristA) { const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1), qB = new THREE.Quaternion().setFromAxisAngle(X, Hd.pitch), qA = new THREE.Quaternion().setFromAxisAngle(Z, Hd.rollA).multiply(new THREE.Quaternion().setFromAxisAngle(X, Math.min(Hd.dpA + Hd.pitch, -.12)))   /* (pinching, the hand dips at the wrist; the forearm stays level — it must not go down into the table) */, pB = new THREE.Vector3().fromArray(Hd.wrist), pA = new THREE.Vector3().fromArray(Hd.wristA);
    buildHand.K = { pB, pA, qB, qA }; }
  rig.scale.setScalar(.84);   // (a little under life size against the tiles: it must not hide the table)
  return rig;
}
const ROW = 6;
// the opponents' hand rows stand inside the slot the automatic table raises them from (ユーザー 2026-11-15) — the slot pressed into
// the felt runs x −7.3…7.3, z 7.42…8.40 from its owner's side: the row starts at its left end and stands on its middle line
const HX0 = -7.27, HZ = 7.91, HGAP = 0.25;
const SPD = 1.6;   // every movement on the table runs this much faster than its written duration (ユーザー 2026-11-14: a little quicker overall)
const PI = Math.PI;

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

class Table3D {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 1.5, alpha: true, powerPreference: 'high-performance' });   // (2026-11-14, optimisation: a high-density screen is already sharp — no multisampling on top; and the faster GPU when there are two)
    const mobile = matchMedia('(pointer: coarse)').matches;
    this.mobile = mobile;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5)); this.prMax = mobile ? 1.25 : 1.5; this.dyn = 1;
    r.outputEncoding = THREE.sRGBEncoding;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.shadowMap.autoUpdate = false;   // (redrawn only when something moved — not for the dora's glint: _loop)
    host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 200);
    this.tweens = [];
    this.handFx = [];
    this.tiles = new Map();
    this.faceTex = new Map();
    this.dirty = true;
    this.build(mobile);
    this.scene.traverse(o => { if (o.isLight) o.layers.enable(1); });   // (the overlay pass draws layer 1 only: the lights must reach it)
    this.resize();
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  // ---------------------------------------------------------------- scene
  build(mobile) {
    const s = this.scene;
    // The table's light (ユーザー 2026-11-14 — the rule for every skin of the table, whatever its cloth): low contrast; a soft pool of
    // light on the middle of the table, the rim a tone lower. So the fill and the key are a little under what a flat light would
    // need, and a wide, fully soft spot from above the middle adds the rest: brightest at the score unit, easing off to the rails
    // (no edge to the pool — penumbra 1). It is light, not paint: the cloth's own texture stays even, so a new skin gets the same mood.
    s.add(new THREE.HemisphereLight(0xf2f6ff, 0x141a30, 0.22));
    const pool = new THREE.SpotLight(0xfff3e2, 0.7, 0, 0.46, 1, 1); pool.position.set(0, 24, 1.5); pool.target.position.set(0, 0, 0.6); s.add(pool); s.add(pool.target);
    const key = new THREE.DirectionalLight(0xffffff, 0.3);
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
    let fc = bakedCanvas('felt');
    if (!fc) { fc = document.createElement('canvas'); fc.width = fc.height = 2048;
    const g = fc.getContext('2d');
    { const N = mkNoise(11), A = N.oct([6, 12, 24, 48, 96]), img = g.createImageData(2048, 2048), d = img.data;
      for (let y = 0; y < 2048; y++) for (let x = 0; x < 2048; x++) {
        const u = x / 2048, v = y / 2048, vig = 1;   // (even: the pool of light on the middle is the lamp's, see the lights)
        const m = (N.fbm(A, u, v) - .5) * .16, n = (N.R() - .5) * .09, f = vig * (1 + m + n), p = (y * 2048 + x) * 4;
        d[p] = 32 * f; d[p + 1] = 56 * f; d[p + 2] = 100 * f; d[p + 3] = 255;
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
    keepGen('felt', fc); }
    const felt = new THREE.CanvasTexture(fc); felt.encoding = THREE.sRGBEncoding; felt.anisotropy = 8;
    const table = new THREE.Mesh(new THREE.PlaneGeometry(21.2, 21.2), new THREE.MeshStandardMaterial({ map: felt, roughness: 1, metalness: 0, bumpMap: napTex(), bumpScale: .012 }));
    table.rotation.x = -PI / 2; table.receiveShadow = true; s.add(table);
    // ---- the floor under the table: a dark Chinese carpet (ユーザー 2026-11-14) — an indigo field with scattered roundels and
    // cloud scrolls, a rust border with the key fret (回紋) in old gold between dark bands. Under the table, so only its outer
    // part shows round the table (lying on the floor the table stands on).
    { const rug = new THREE.Mesh(new THREE.PlaneGeometry(38, 30), (() => { const t = rugTex(); return new THREE.MeshStandardMaterial({ map: t, color: 0x5e5e5e, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .05, roughness: 1, metalness: 0 }); })());   // (a rug a little larger than the table, its border in view; dim — barely there, just readable)
      rug.rotation.x = -PI / 2; rug.position.y = -0.38; rug.receiveShadow = true; s.add(rug); }   // (just above the dark floor plane below)

    // ---- the frame: four walnut rails with rounded edges and four rounded corner blocks, lacquered; a black lip round the cloth
    const wood = woodTex(); this.envTex = this.envTex || studioEnv();
    // (ユーザー 2026-11-14: glossy — a deep lacquer over the open-pored wood: the coat is near mirror-smooth and shows the room's lights
    // as long highlights along the rails, the wood under it stays satin, the pores read through the coat as a fine texture)
    const rimMat = new THREE.MeshStandardMaterial({ map: wood.map, bumpMap: wood.bump, bumpScale: .45, roughness: .18, metalness: 0, envMap: this.envTex, envMapIntensity: 1.25 });   // (2026-11-14, optimisation: the lacquer's gloss in one smooth layer instead of a clear coat over a satin wood)
    const lipMat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: .45, metalness: .2 });
    const RW = 1.75, RH0 = -0.28, RH1 = 0.92, RR = 0.26, RL = 21.1, RC = 10.55 + RW / 2;   // rail: width, bottom, top, edge radius, length, centre line
    { const sh = new THREE.Shape(), x0 = -RW / 2, x1 = RW / 2;
      sh.moveTo(x0 + RR, RH0); sh.lineTo(x1 - RR, RH0); sh.quadraticCurveTo(x1, RH0, x1, RH0 + RR); sh.lineTo(x1, RH1 - RR); sh.quadraticCurveTo(x1, RH1, x1 - RR, RH1);
      sh.lineTo(x0 + RR, RH1); sh.quadraticCurveTo(x0, RH1, x0, RH1 - RR); sh.lineTo(x0, RH0 + RR); sh.quadraticCurveTo(x0, RH0, x0 + RR, RH0);
      const rg = new THREE.ExtrudeGeometry(sh, { depth: RL, bevelEnabled: false, curveSegments: 5 }); rg.translate(0, 0, -RL / 2);
      const P = rg.attributes.position, UV = rg.attributes.uv, cy = (RH0 + RH1) / 2;
      for (let i = 0; i < P.count; i++) UV.setXY(i, P.getZ(i) / RL + .5, Math.atan2(P.getX(i), P.getY(i) - cy) / (2 * PI) * 1.15 + .5);   // (the whole board along the rail, once)   // the grain runs along the rail and wraps round its section (the join is underneath)
      rg.rotateY(PI / 2);
      // (each rail its own cut of the board — another stretch, other rings: the same texture, its uv shifted per rail)
      const shifted = (geo, du, dv) => { const q = geo.clone(), U = q.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) + du, U.getY(i) + dv); return q; };
      for (let k = 0; k < 4; k++) { const a = k * PI / 2, b = new THREE.Mesh(shifted(rg, k * .37, k * .29), rimMat); b.position.set(Math.sin(a) * RC, 0, Math.cos(a) * RC); b.rotation.y = a; b.castShadow = b.receiveShadow = true; s.add(b);
        const lip = new THREE.Mesh(new THREE.BoxGeometry(21.2, 0.2, 0.12), lipMat); lip.position.set(Math.sin(a) * 10.56, 0.1, Math.cos(a) * 10.56); lip.rotation.y = a; s.add(lip); } }
    { const E = RW + .06, cr = 1.15, bv = .2, sh = new THREE.Shape();   // corner block: a square whose outer corner is rounded, its top edge rounded like the rails'
      sh.moveTo(0, 0); sh.lineTo(E, 0); sh.lineTo(E, E - cr); sh.quadraticCurveTo(E, E, E - cr, E); sh.lineTo(0, E); sh.closePath();
      const cg = new THREE.ExtrudeGeometry(sh, { depth: RH1 - RH0 - bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 4, curveSegments: 8 });
      cg.rotateX(-PI / 2); cg.translate(0, RH0, 0);   // (shape x → x, shape y → −z, height → y)
      const P = cg.attributes.position, UV = cg.attributes.uv;
      for (let i = 0; i < P.count; i++) UV.setXY(i, (P.getX(i) + P.getZ(i)) / RL + .31, (P.getX(i) - P.getZ(i)) / 3.4 + P.getY(i) * .25);   // grain across the corner
      for (let k = 0; k < 4; k++) { const cq = cg.clone(), U = cq.attributes.uv; for (let i = 0; i < U.count; i++) U.setXY(i, U.getX(i) + .13 + k * .23, U.getY(i) + .61 + k * .17);
        const m = new THREE.Mesh(cq, rimMat); m.rotation.y = k * PI / 2; const q = this.local(k, 10.53, -10.53 + 0); m.position.set(0, 0, 0);
        // the block's own corner sits at the cloth's corner (+x, −z in its own frame), turned round the table's centre
        const piv = new THREE.Group(); piv.rotation.y = k * PI / 2; m.rotation.y = 0; m.position.set(10.53, 0, -10.53); piv.add(m); m.castShadow = m.receiveShadow = true; s.add(piv); void q; } }
    const under = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x05040a).convertSRGBToLinear() }));   // (the floor beyond the rug: the same dark as the page round the table — ユーザー 2026-11-14: a lighter band showed at the top)
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
    const conTop = new THREE.MeshStandardMaterial({ map: this.conTex, roughness: .14, metalness: .25, envMap: this.envTex, envMapIntensity: .7, emissive: 0xffffff, emissiveMap: this.conETex, emissiveIntensity: .95 });
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
    { const tg = tileGeos(W, H, D, 0.16, 0.1, 0.28, 0.1), tb = tileGeos(W, H, D, 0.16, 0.05, 0.28, 0.05); this.geoFront = tg.front; this.geoBack = tb.back; }   // (ユーザー 2026-11-14: the face keeps its full round edge; the purple back has the crisper edge of the tiles in the dora box — the two meet on the straight side, same outline)   // (one rounded block, split where the white meets the purple)
    this.matIvory = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xe6e5df).convertSRGBToLinear(), roughness: .38, metalness: 0 });
    // the back (2026-11-14, ユーザー：紫をもう少し淡く、高級石を磨いたような質感): a pale lavender stone with soft veins, polished
    // (a clear coat over it, a little studio light reflected in it) — four cuts of the same slab so neighbours don't match
    this.envTex = this.envTex || studioEnv();
    const stone = stoneTex();
    this.matBacks = [0, 1, 2, 3].map(k => { const t = stone.clone(); t.needsUpdate = true; t.offset.set(k * .27, k * .41);
      return new THREE.MeshStandardMaterial({ map: t, roughness: .26, metalness: 0, envMap: this.envTex, envMapIntensity: 1.35 }); });   // (2026-11-14, optimisation: the same polished look without the clear-coat layer — the light it reflected is put into a smoother, brighter-reflecting surface)   // (2026-11-14, ユーザー: a little more sheen — stone polished by hand, not a gloss coat: a denser stone (ior 2.1: it gives back about three times the light of the plain 1.5) under a soft coat, both rough enough that the room shows as a broad glow, never as a mirror image)
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
      m = { normal: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38, color: 0xe4e2dc }), hi: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38, emissive: 0xffd36a, emissiveIntensity: .28 }), dim: new THREE.MeshStandardMaterial({ map: tex, normalMap: nrm, roughness: .38, color: 0x9c9c9c }) };
      this.faceTex.set(k, m);
    }
    return m;
  }
  tile(id) {
    let g = this.tiles.get(id);
    if (g) return g;
    g = new THREE.Group();   // (an empty frame: the tile itself is drawn by the instanced meshes, _inst / _syncInst)
    this._inst();
    g.rotation.order = 'YXZ';
    g.userData = { id, look: 'normal' };
    g.visible = false;
    this.scene.add(g);
    this.tiles.set(id, g);
    return g;
  }
  // a picture of one tile as the table draws it (ユーザー 2026-11-14: the dora in the box are the 3D tiles): seen straight on
  // (orthographic); back = the tile face down. Drawn once by a small renderer of its own
  // with a light from the front, and kept (data URL).
  tileShot(id, back) {
    const key = back ? 'back' : (id >> 2) + (id === 16 || id === 52 || id === 88 ? 'r' : '');
    this.shots = this.shots || new Map();
    if (this.shots.has(key)) return this.shots.get(key);
    if (!this.shotR) {
      const c = document.createElement('canvas'); c.width = 132; c.height = 172;
      const r = this.shotR = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
      r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x000000, 0); r.setPixelRatio(1); r.setSize(132, 172, false);
      const sc = this.shotS = new THREE.Scene();
      sc.add(new THREE.HemisphereLight(0xffffff, 0x404060, .75));
      const k = new THREE.DirectionalLight(0xffffff, .75); k.position.set(-2, 3, 6); sc.add(k);
      const cam = this.shotC = new THREE.OrthographicCamera(-.62, .62, .81, -.81, .1, 20); cam.position.set(0, 0, 6); cam.lookAt(0, 0, 0);   // (ユーザー 2026-11-14: straight on, no perspective — the tiles stand in a straight row)
      this.shotG = new THREE.Group(); sc.add(this.shotG);
    }
    const G = this.shotG; while (G.children.length) G.remove(G.children[0]);
    const fm = back ? null : this.faceMat(id);
    // (ユーザー 2026-11-14: at this small size the table's round edge read as too soft — the box's tiles get crisper edges of their own)
    if (!this.shotGeo) this.shotGeo = tileGeos(W, H, D, 0.11, 0.05, 0.28, 0.05);
    G.add(new THREE.Mesh(this.shotGeo.front, [back ? this.matIvory : fm.normal, this.matIvory]), new THREE.Mesh(this.shotGeo.back, this.matBacks[0]));
    G.rotation.set(back ? 0 : 0, back ? PI : 0, 0);
    this.shotR.render(this.shotS, this.shotC);
    // cropped to the tile itself (so the tiles in the box can stand right next to each other)
    const src = this.shotR.domElement, c2 = document.createElement('canvas'), w0 = src.width, h0 = src.height; c2.width = w0; c2.height = h0;
    const x2 = c2.getContext('2d'); x2.drawImage(src, 0, 0); const px = x2.getImageData(0, 0, w0, h0).data; let a0 = w0, a1 = -1, b0 = h0, b1 = -1;
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) if (px[(y * w0 + x) * 4 + 3] > 8) { if (x < a0) a0 = x; if (x > a1) a1 = x; if (y < b0) b0 = y; if (y > b1) b1 = y; }
    let url;
    if (a1 >= a0) { const c3 = document.createElement('canvas'); c3.width = a1 - a0 + 1; c3.height = b1 - b0 + 1; c3.getContext('2d').drawImage(c2, -a0, -b0); url = c3.toDataURL('image/png'); this.shotAR = c3.width / c3.height; }
    else url = src.toDataURL('image/png');
    this.shots.set(key, url);
    return url;
  }
  setTileLook(g, look) {
    if (g.userData.look !== look) { g.userData.look = look; this.dirty = true; }
    const so = g.userData.solo; if (so) { const fm = this.faceMat(g.userData.id); so[0].material[0] = look === 'hi' ? fm.hi : look === 'dim' ? fm.dim : fm.normal; }
  }
  // ---- the tiles in three draws (2026-11-14, optimisation — ユーザー: as light as it can be): every tile on the table is one
  // instance of three InstancedMeshes — the faces (all the pictures in one atlas, each instance pointing at its cell), the white
  // body and the purple back (four cuts of the stone, an offset per instance). Before each frame the tiles' frames (the groups
  // the rest of the code moves) are copied in. ~180 draw calls (and as many again for the shadows) become 3.
  _atlas() {
    if (this.A && (this.A.sheets || !MJTiles.sheets())) return this.A;
    const FW = MJTiles.FW, FH = MJTiles.FH, pad = 8, cw = FW + pad * 2, ch = FH + pad * 2, cols = 8, rows = 5;
    const mk = () => { const c = document.createElement('canvas'); c.width = cols * cw; c.height = rows * ch; return c; };
    const cv = mk(), cn = MJTiles.sheets() ? mk() : null, g = cv.getContext('2d'), gn = cn && cn.getContext('2d');
    const cells = {}; let k = 0;
    const put = (gg, src, x, y) => { gg.drawImage(src, x - pad, y - pad, FW + pad * 2, FH + pad * 2); gg.drawImage(src, x, y, FW, FH); };   // (the picture's edge stretched into the padding: no bleeding from the neighbours)
    for (let t = 0; t < 34; t++) for (const red of t === 4 || t === 13 || t === 22 ? [false, true] : [false]) {
      const col = k % cols, row = (k / cols) | 0, x = col * cw + pad, y = row * ch + pad;
      put(g, MJTiles.canvas(t, red), x, y); if (gn) put(gn, MJTiles.normal(t, red), x, y);
      cells[t + (red ? 'r' : '')] = [col, rows - 1 - row]; k++; }
    const tex = c => { const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; };
    const map = tex(cv); map.encoding = THREE.sRGBEncoding;
    const A = { map, nrm: cn ? tex(cn) : null, cells, sheets: !!cn, cell: new THREE.Vector4(cw / cv.width, ch / cv.height, FW / cv.width, FH / cv.height), pad: new THREE.Vector2(pad / cv.width, pad / cv.height) };
    if (this.A && this.I) { const m = this.I.face.material; m.map = A.map; m.normalMap = A.nrm; m.needsUpdate = true; }
    return (this.A = A);
  }
  _inst() {
    if (this.I) return this.I;
    const N = 136, F = this.geoFront, nf = F.groups[0].count, A = this._atlas();
    const sub = (geo, st, n) => { const o = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) { const a = geo.attributes[k]; o.setAttribute(k, new THREE.BufferAttribute(a.array.slice(st * a.itemSize, (st + n) * a.itemSize), a.itemSize)); } return o; };
    const gFace = sub(F, 0, nf), gBody = sub(F, nf, F.groups[1].count), gBack = this.geoBack.clone();
    const aCell = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); aCell.setUsage(THREE.DynamicDrawUsage); gFace.setAttribute('aCell', aCell);
    const aOff = new THREE.InstancedBufferAttribute(new Float32Array(N * 2), 2); aOff.setUsage(THREE.DynamicDrawUsage); gBack.setAttribute('aOff', aOff);
    const faceMat = new THREE.MeshStandardMaterial({ map: A.map, normalMap: A.nrm, roughness: .38, color: 0xe4e2dc });
    faceMat.onBeforeCompile = sh => {
      sh.uniforms.uCell = { value: this.A.cell }; sh.uniforms.uPad = { value: this.A.pad };
      sh.vertexShader = 'attribute vec3 aCell;\nvarying vec3 vCell;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vCell = aCell;');
      sh.fragmentShader = 'uniform vec4 uCell; uniform vec2 uPad; varying vec3 vCell;\nvec2 atlasUV(vec2 u){ return vCell.xy * uCell.xy + uPad + clamp(u, 0., 1.) * uCell.zw; }\n' + sh.fragmentShader
        .replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.split('vMapUv').join('atlasUV(vMapUv)'))   // (the chunks are opened here: their texture reads go through the atlas)
        .replace('#include <normal_fragment_maps>', THREE.ShaderChunk.normal_fragment_maps.split('vNormalMapUv').join('atlasUV(vNormalMapUv)'))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1., .66, .15) * .28 * vCell.z;');   // (a highlighted tile: a soft gold glow)
    };
    const backMat = this.matBacks[0].clone(); backMat.map = this.matBacks[0].map;
    backMat.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec2 aOff;\nvarying vec2 vOff;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOff = aOff;');
      sh.fragmentShader = 'varying vec2 vOff;\n' + sh.fragmentShader.replace('#include <map_fragment>', THREE.ShaderChunk.map_fragment.split('vMapUv').join('(vMapUv + vOff)'));
    };
    const mk = (geo, mat, recv) => { const m = new THREE.InstancedMesh(geo, mat, N); m.count = 0; m.frustumCulled = false; m.castShadow = true; m.receiveShadow = recv; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); return m; };
    const face = mk(gFace, faceMat, true), body = mk(gBody, this.matIvory, true), back = mk(gBack, backMat, false);
    face.setColorAt(0, new THREE.Color(1, 1, 1)); face.instanceColor.setUsage(THREE.DynamicDrawUsage);
    return (this.I = { face, body, back, aCell, aOff, N });
  }
  _syncInst() {
    const I = this.I; if (!I) return;
    const A = this._atlas(), dimC = new THREE.Color(.68, .68, .68), one = new THREE.Color(1, 1, 1);
    let n = 0;
    for (const g of this.tiles.values()) {
      if (!g.visible) continue;
      g.updateMatrix();
      I.face.setMatrixAt(n, g.matrix); I.body.setMatrixAt(n, g.matrix); I.back.setMatrixAt(n, g.matrix);
      const id = g.userData.id, t = id >> 2, red = id === 16 || id === 52 || id === 88, c = A.cells[t + (red ? 'r' : '')], look = g.userData.look;
      I.aCell.setXYZ(n, c[0], c[1], look === 'hi' ? 1 : 0); I.face.setColorAt(n, look === 'dim' ? dimC : one);
      I.aOff.setXY(n, (id % 4) * .27, (id % 4) * .41);
      if (++n >= I.N) break;
    }
    for (const m of [I.face, I.body, I.back]) { m.count = n; m.instanceMatrix.needsUpdate = true; }
    I.aCell.needsUpdate = true; I.aOff.needsUpdate = true; I.face.instanceColor.needsUpdate = true;
  }
  // the player's own discard is also drawn over the page (layer 1): for that moment the tile gets real meshes of its own, on layer 1 only
  _solo(g, on) {
    if (on) {
      if (!g.userData.solo) { const fm = this.faceMat(g.userData.id), lk = g.userData.look;
        const f = new THREE.Mesh(this.geoFront, [lk === 'hi' ? fm.hi : lk === 'dim' ? fm.dim : fm.normal, this.matIvory]), b = new THREE.Mesh(this.geoBack, this.matBacks[g.userData.id % 4]);
        g.add(f, b); g.userData.solo = [f, b]; }
      g.traverse(o => o.layers.enable(1)); for (const m of g.userData.solo) m.layers.set(1);
    } else {
      g.traverse(o => o.layers.disable(1));
      if (g.userData.solo) { for (const m of g.userData.solo) g.remove(m); g.userData.solo = null; }
    }
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
    g.userData.rseat = null;   // (layoutRiver marks its own tiles again)
    let rx = 0, rz = 0, y = H / 2;
    if (pose === 'flat') { rx = -PI / 2; y = D / 2; }
    else if (pose === 'side') { rx = -PI / 2; rz = PI / 2; y = D / 2; }
    else if (pose === 'back') { rx = PI / 2; y = D / 2; }
    const to = { x: p.x, y, z: p.z, rx, ry: yaw, rz };
    g.userData.pose = pose;
    g.visible = true;
    if (anim && anim.reach != null) this.reach(g, anim.reach, anim.from, to);
    else if (anim) { this.tween(g, to, anim.dur || 260, anim.from, anim.hand); const tw = this.tweens[this.tweens.length - 1]; tw.t0 += anim.delay || 0; tw.level = !!anim.level; }
    else { if (this.tweens.length) this.tweens = this.tweens.filter(t => t.g !== g || !t.level); g.position.set(to.x, to.y, to.z); g.rotation.set(rx, yaw, rz); g.userData.target = to; this.dirty = true; }
  }
  _drop(g, keep) {   // end the tile's movements; a hand that was carrying it (other than `keep`) lets go and draws back
    if (!this.tweens.some(t => t.g === g)) return;
    for (const t of this.tweens) if (t.g === g && t.hand != null && t.hand !== keep) this._handBack(t.hand);
    this.tweens = this.tweens.filter(t => t.g !== g);
  }
  tween(g, to, dur, from, hand, after) {   // hand: the seat whose hand carries the tile (it lets go and draws back when the tile is down)
    const f = from || { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z };
    this._drop(g, hand);
    this.tweens.push({ g, from: f, to, t0: performance.now(), dur, hand: hand == null ? null : hand, after });
    if (hand != null) { const rig = this.hand(hand); this.handFx = this.handFx.filter(h => h.rig !== rig); rig.visible = true; rig.position.set(f.x, f.y + this._top(f.rx), f.z); }
    g.userData.target = to;
    this.dirty = true;
  }
  // ---------------------------------------------------------------- dora
  // Every dora that lies face up on the table (rivers, melds, opened hands) wears a soft gold edge, and a band of gold light
  // crosses it now and then (ユーザー 2026-11-14: so the dora is easy to find). `doraFn(id)` says which tiles are dora (app.js).
  // One shared material; the overlay is a quad just above the face, made the first time a tile needs it.
  _doraSync() {
    let n = 0;
    if (this.doraFn) for (const g of this.tiles.values()) {
      const want = g.visible && (g.userData.pose === 'flat' || g.userData.pose === 'side') && this.doraFn(g.userData.id);
      let o = g.userData.dora;
      if (want && !o) {
        // (ユーザー 2026-11-14: the glow covers the whole tile, every side — a skin over the full block — and looks the same as in the hand row)
        if (!this.doraMat) this._doraMake();
        o = g.userData.dora = new THREE.Mesh(this.doraGeo, this.doraMat); o.renderOrder = 3; g.add(o);
      }
      if (o) o.visible = !!want;
      if (want) n++;
    }
    this._doraN = n;
  }
  // the dora's glow lies on the face itself (ユーザー 2026-11-14: not a flat pane over the tile, like a case): the face's own
  // triangles (the flat and the start of the round-over) lifted a hair along their normals, uv 0..1 over that area
  _doraMake() { this.doraGeo = this._tileSkin();
          this.doraMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: -1 } },
            vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vF;
              void main(){ vP = position; vF = normal.z; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
            fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV; varying float vF; uniform float uT;
              float star(vec2 s, float k){ return k * (exp(-abs(s.x) * 46.0 - abs(s.y) * 7.0) + exp(-abs(s.y) * 46.0 - abs(s.x) * 7.0) + exp(-dot(s, s) * 420.0)); }
              void main(){
                vec2 p = vP.xy / vec2(${(W / 2).toFixed(3)}, ${(H / 2).toFixed(3)});            // -1..1 over the tile, on every side
                float edge = max(abs(p.x), abs(p.y));
                float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);   // brighter where the surface turns away: the outline from any angle
                float rim = smoothstep(.78, .97, edge) * (vF > .5 ? 1.0 : .5) + fres * .4;
                float ang = fract(atan(p.x, p.y) / 6.2831853 + .5), dd = abs(fract(ang - uT * 1.15 + .5) - .5);   // a light runs once round the tile
                float run = uT < 0.0 ? 0.0 : smoothstep(.7, .97, edge) * exp(-dd * dd / .006) * sin(clamp(uT, 0.0, 1.0) * 3.14159);
                float t1 = uT < 0.0 ? 0.0 : max(0.0, sin(clamp(uT * 1.7, 0.0, 1.0) * 3.14159)), t2 = uT < 0.0 ? 0.0 : max(0.0, sin(clamp(uT * 1.7 - .7, 0.0, 1.0) * 3.14159));
                float st = vF > .5 ? star((p - vec2(.72, .8)) * vec2(.5, .68), t1) + star((p - vec2(-.76, -.84)) * vec2(.5, .68) * 1.35, t2) : 0.0;
                float sw = uT < 0.0 ? 0.0 : clamp(uT * 1.25, 0.0, 1.0), bp = p.x * .4 + p.y * .5 - mix(-1.3, 1.3, sw);
                float band = uT < 0.0 ? 0.0 : (exp(-bp * bp / .006) * .85 + exp(-bp * bp / .05) * .25) * sin(sw * 3.14159) * 1.35;   // a band of light sweeps across the tile
                float a = clamp(.15 + rim * .6 + run * 1.2 + st + band, 0.0, .96);
                gl_FragColor = vec4(mix(vec3(1.0, .42, .68), vec3(1.0, .92, .96), clamp(run * 1.4 + st + band * 1.2, 0.0, 1.0)), a); }` }); }
  // compile the shaders ahead of time (ユーザー 2026-11-14: no hitch the first time a dora or a new look shows mid-game)
  warm() { try { if (!this.doraMat) this._doraMake(); const m = new THREE.Mesh(this.doraGeo, this.doraMat); m.frustumCulled = false; this.scene.add(m); this.renderer.compile(this.scene, this.camera); this.scene.remove(m); } catch (e) {} }
  _tileSkin() {   // the whole tile (white part and back), lifted a hair along the normals
    const parts = [this.geoFront, this.geoBack], pos = [], nor = [];
    for (const f of parts) { const P = f.attributes.position, N = f.attributes.normal;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i) + N.getX(i) * .004, P.getY(i) + N.getY(i) * .004, P.getZ(i) + N.getZ(i) * .004); nor.push(N.getX(i), N.getY(i), N.getZ(i)); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
  }
  _faceSkin() {
    const f = this.geoFront, gr = f.groups[0], P = f.attributes.position, N = f.attributes.normal, U = f.attributes.uv, n = gr.count;
    const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (let i = 0; i < n; i++) { const j = gr.start + i; u0 = Math.min(u0, U.getX(j)); u1 = Math.max(u1, U.getX(j)); v0 = Math.min(v0, U.getY(j)); v1 = Math.max(v1, U.getY(j)); }
    for (let i = 0; i < n; i++) { const j = gr.start + i;
      pos[i * 3] = P.getX(j) + N.getX(j) * .003; pos[i * 3 + 1] = P.getY(j) + N.getY(j) * .003; pos[i * 3 + 2] = P.getZ(j) + N.getZ(j) * .003;
      uv[i * 2] = (U.getX(j) - u0) / (u1 - u0); uv[i * 2 + 1] = (U.getY(j) - v0) / (v1 - v0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
  }
  // ---------------------------------------------------------------- hands
  hand(seat) {
    if (!this.hands) this.hands = [];
    let rig = this.hands[seat];
    if (!rig) { if (!this.handProto) this.handProto = buildHand(this.envTex); rig = this.hands[seat] = this.handProto.clone(true); rig.rotation.y = seat * PI / 2; rig.visible = false; this.scene.add(rig); if (this.sleeves && this.sleeves[seat]) this._sleeve(rig, this.sleeves[seat]); }
    return rig;
  }
  // each seat's sleeve in the colour of its character's sisters (cols: four CSS colours). The ground is the colour taken deeper,
  // as silk is (a light colour stays light); one material per colour, made once.
  setSleeves(cols) { this.sleeves = cols.slice(); (this.hands || []).forEach((rig, s) => { if (rig && cols[s]) this._sleeve(rig, cols[s]); }); this.dirty = true; }
  _sleeve(rig, col) {
    this.sleeveMats = this.sleeveMats || new Map();
    if (!this.handProto || !this.handProto.clothMat) return;
    let m = this.sleeveMats.get(col);
    if (!m) { const c = new THREE.Color(col), hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * .9), hsl.l > .78 ? hsl.l * .9 : hsl.l * .52);
      const base = '#' + c.getHexString(), proto = this.handProto.clothMat;
      m = proto.clone(); m.map = brocadeTex(base); m.sheenColor = new THREE.Color(col).lerp(new THREE.Color(0xffffff), .2).multiplyScalar(.6); this.sleeveMats.set(col, m); }
    rig.traverse(o => { if (o.userData && o.userData.sleeve) o.material = m; });
    // (ユーザー 2026-11-14: the nails in her colour too, like the sleeve) — a glossy polish of the sisters' colour, a little lighter,
    // the glitter in it as before (the same shader: the clone keeps onBeforeCompile)
    this.nailMats = this.nailMats || new Map();
    let nm = this.nailMats.get(col);
    if (!nm) { rig.traverse(o => { if (!nm && o.isMesh && Array.isArray(o.material) && o.material[1]) { const b = this.nailBase || (this.nailBase = o.material[1]);
        nm = b.clone(); nm.onBeforeCompile = b.onBeforeCompile; nm.vertexColors = false;
        const c = new THREE.Color(col), hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, Math.min(1, hsl.s * .85), Math.min(.72, Math.max(.42, hsl.l)));
        nm.color = c.convertSRGBToLinear(); this.nailMats.set(col, nm); } }); }
    if (nm) rig.traverse(o => { if (o.isMesh && Array.isArray(o.material) && o.material[1]) o.material = [o.material[0], nm]; });
  }
  _over2() {   // the overlay's renderer (made on the first use; no shadows)
    if (this.r2) return this.r2;
    const c = this.over = document.createElement('canvas'); c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:6;pointer-events:none';
    (this.host.parentNode || this.host).appendChild(c);
    const r = this.r2 = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, powerPreference: 'low-power' });
    r.outputEncoding = THREE.sRGBEncoding; r.setClearColor(0x000000, 0); r.shadowMap.enabled = false;
    r.setPixelRatio(this.renderer.getPixelRatio()); r.setSize(this.host.clientWidth || 1, this.host.clientHeight || 1, false);
    return r;
  }
  // where a tile must float to cover a tile of the page's hand row: (cx, cy) its centre and w its width, in CSS px inside the
  // table's canvas. It faces the camera, at the depth where a tile is exactly that wide.
  screenPose(cx, cy, w) {
    const cv = this.renderer.domElement, Wc = cv.clientWidth || 1, Hc = cv.clientHeight || 1, cam = this.camera;
    const d = W * Hc / (2 * Math.tan(cam.fov * PI / 360) * w);
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd);
    const q = new THREE.Vector3(cx / Wc * 2 - 1, 1 - cy / Hc * 2, .5).unproject(cam).sub(cam.position).normalize();
    const pos = cam.position.clone().addScaledVector(q, d / q.dot(fwd)), e = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
    return { x: pos.x, y: pos.y, z: pos.z, rx: e.x, ry: e.y, rz: e.z, page: true };
  }
  // the hand's pose: 0 = laying (fingers on the tile, the thumb beside it), 1 = pinching (the thumb under the tile, the forefinger on its face)
  pinch(rig, k) { const K = buildHand.K; if (!K || rig.userData.pinch === k) return; rig.userData.pinch = k; const m = rig.children[0], sl = rig.children[1];
    m.morphTargetInfluences[0] = k; sl.position.lerpVectors(K.pB, K.pA, k); sl.quaternion.copy(K.qB).slerp(K.qA, k); this.dirty = true; }
  _top(rx) { const c = Math.cos(rx); return D / 2 + (H / 2 - D / 2) * c * c; }   // how far the tile's top is above its centre (standing: H/2, lying: D/2)
  // a discard (ユーザー 2026-11-14: the hand takes the tile out of the owner's own hand and puts it out): the hand comes in over
  // the hand tiles, down onto the tile where it stands (from: its pose there; null = where it is now), lifts it and lays it at `to`.
  reach(g, seat, from, to) {
    const f = from || { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z }, rig = this.hand(seat);
    this._drop(g, seat);
    g.visible = true; g.position.set(f.x, f.y, f.z); g.rotation.set(f.rx, f.ry, f.rz); g.userData.target = to;
    const out = this.local(seat, 0, 3.4), r = { x: f.x + out.x, y: f.y + 2.6, z: f.z + out.z };   // from behind and above the tile
    if (f.page) { this._solo(g, true); rig.traverse(o => o.layers.enable(1)); this._ov = { g, rig }; }   // (the tile of the page's hand row: drawn over the page too)
    this.handFx = this.handFx.filter(h => h.rig !== rig); rig.visible = true; rig.position.set(r.x, r.y, r.z);
    // (the first frame of the overlay uploads its textures and builds its shaders: draw it once before the clock starts, or
    // that pause would eat the movement — it is timed, not counted in frames. The player's own discard is also a little slower, to be seen.)
    if (f.page) { const R2 = this._over2(); this.camera.layers.set(1); R2.render(this.scene, this.camera); this.camera.layers.set(0); }
    // (ユーザー 2026-11-14: it should be plain where the tile is taken from — the others' too. The hand comes down on the tile
    // where it stands in the row, lifts it straight up out of the row, then carries it to the river; the row closes afterwards.)
    const go = () => { if (g.userData.target !== to) return this._handBack(seat);
      if (f.page) return this.tween(g, to, 440, f, seat, () => this._land('river', seat));
      // (ユーザー 2026-11-14: pinched between the thumb and the forefinger — as the tile comes up out of the row it is turned flat,
      // the thumb going under it and the forefinger lying on its face; so it is carried, and the thumb slips out as it is laid down)
      const up = { x: f.x, y: f.y + 0.95, z: f.z, rx: to.rx, ry: f.ry, rz: to.rz };
      this.tween(g, up, 250, f, seat, () => { if (g.userData.target === to) { this.tween(g, to, 460, up, seat, () => { this._land('river', seat); this._sortNext(seat); }); this.tweens[this.tweens.length - 1].grip = 'held'; } else this._handBack(seat); });
      const tw = this.tweens[this.tweens.length - 1]; tw.level = true; tw.grip = 'take'; g.userData.target = to; };
    this.handFx.push({ rig, from: r, to: { x: f.x, y: f.y + this._top(f.rx), z: f.z }, t0: performance.now(), dur: f.page ? 380 : 280, then: go });
    this.dirty = true;
  }
  // ---------------------------------------------------------------- 理牌 (ユーザー 2026-11-14: the others tidy their hands by hand)
  // After an opponent's discard the row is not closed up by itself: once the hand has laid the tile in the river it goes back
  // into the row — the tile drawn this turn is lifted out, carried over the row and set down where it belongs while the tiles
  // between make room (drawn: that tile); with no drawn tile (a discard after a call) the hand pushes the tiles right of the gap
  // together. ids: the hand after the discard, in order. The player's own row is the page's and closes up by itself.
  sortAfterDiscard(seat, ids, drawn) {
    this.sorting = this.sorting || [];
    this._cancelSort(seat);
    const S = this.sorting[seat] = { seat, ids: ids.slice(), drawn: drawn == null ? null : drawn, ran: false };
    const later = () => { if (!this._sortLive(S) || S.ran) return; if ((window.__focusGate && window.__focusGate.frozen) || this.tweens.some(t => t.hand === seat)) S.timer = setTimeout(later, 300); else this._runSort(S); };
    S.timer = setTimeout(later, 1500);   // (in case the hand never lays the discard: it starts anyway)
  }
  _sortNext(seat) { const S = this.sorting && this.sorting[seat]; if (S && !S.ran) this._runSort(S); }
  _sortLive(S) { return this.sorting && this.sorting[S.seat] === S; }
  _cancelSort(seat) {
    const S = this.sorting && this.sorting[seat]; if (!S) return;
    clearTimeout(S.timer); this.sorting[seat] = null;
    this.tweens = this.tweens.filter(t => t.sort !== seat);
    if (S.ran) { const rig = this.hand(seat); this.handFx = this.handFx.filter(h => h.rig !== rig); if (rig.visible) this._handBack(seat); }
  }
  _slot(seat, i) { const p = this.local(seat, HX0 + i * (W + 0.02) + W / 2, HZ); return { x: p.x, y: H / 2, z: p.z, rx: 0, ry: seat * PI / 2, rz: 0 }; }
  _pose(g) { return { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z }; }
  _runSort(S) {
    if (!this._sortLive(S) || S.ran) return;
    S.ran = true; clearTimeout(S.timer);
    const seat = S.seat, rig = this.hand(seat), now = performance.now();
    const moves = [];   // the row's other tiles: where they go
    S.ids.forEach((id, i) => { if (id === S.drawn) return; const g = this.tile(id), to = this._slot(seat, i); g.userData.target = to;
      if (Math.hypot(g.position.x - to.x, g.position.z - to.z) > 1e-3) moves.push([g, to]); });
    const slide = (dur, delay) => { for (const [g, to] of moves) { this.tween(g, to, dur); const tw = this.tweens[this.tweens.length - 1]; tw.level = true; tw.sort = seat; tw.t0 += delay || 0; } };
    const from = rig.visible ? { x: rig.position.x, y: rig.position.y, z: rig.position.z } : this._handRest(seat);
    this.handFx = this.handFx.filter(h => h.rig !== rig); rig.visible = true; this.pinch(rig, 0); rig.position.set(from.x, from.y, from.z);
    const k = S.drawn != null ? S.ids.indexOf(S.drawn) : -1;
    if (k >= 0) {
      // the drawn tile: lifted out, carried over the row to its place, set down; the others make room while it is in the air
      const g = this.tile(S.drawn), f = this._pose(g), slot = this._slot(seat, k);
      g.userData.target = slot;
      const lift = Object.assign({}, f, { y: f.y + H * .75 }), above = Object.assign({}, slot, { y: slot.y + H * .75 });
      const step = (to, dur, fr, then, last) => { if (!this._sortLive(S)) return; this.tween(g, to, dur, fr, seat, then); const tw = this.tweens[this.tweens.length - 1]; tw.sort = seat; tw.level = true; if (!last) tw.grip = 'take'; };
      this.handFx.push({ rig, from, to: { x: f.x, y: f.y + this._top(f.rx), z: f.z }, t0: now, dur: 300, then: () => {
        if (!this._sortLive(S)) return this._handBack(seat);
        step(lift, 210, f, () => {
          if (!this._sortLive(S)) return this._handBack(seat);
          slide(330, 40);
          step(above, 420, lift, () => { if (!this._sortLive(S)) return this._handBack(seat); step(slot, 220, above, () => { if (this._sortLive(S)) this.sorting[seat] = null; }, true); });
        });
      } });
    } else if (moves.length) {
      // a gap and no drawn tile: the hand comes down beside the rightmost tile and pushes the tiles right of the gap along
      const [gl, tl] = moves[moves.length - 1], side = this.local(seat, W * .78, 0), o = { x: side.x, z: side.z };
      const p0 = { x: gl.position.x + o.x, y: H * .62, z: gl.position.z + o.z }, p1 = { x: tl.x + o.x, y: H * .62, z: tl.z + o.z };
      this.handFx.push({ rig, from, to: p0, t0: now, dur: 300, then: () => {
        if (!this._sortLive(S)) return this._handBack(seat);
        slide(340, 0);
        this.handFx.push({ rig, from: p0, to: p1, t0: performance.now(), dur: 340, then: () => { if (this._sortLive(S)) this.sorting[seat] = null; this._handBack(seat); } });
      } });
    } else { this.sorting[seat] = null; this._handBack(seat); }
    this.dirty = true;
  }
  // a tile set down on the table — a discard in the river, the called tile in a meld: the app plays the tile's sound (ユーザー 2026-11-14)
  _land(kind, seat) { if (this.onTileLand) try { this.onTileLand(kind, seat); } catch (e) {} }
  _handRest(seat) { const p = this.local(seat, 0, 12.5); return { x: p.x, y: 3.2, z: p.z }; }   // off the table, on the owner's side
  _handBack(seat) { const rig = this.hand(seat); this.pinch(rig, 0); const f = { x: rig.position.x, y: rig.position.y, z: rig.position.z }, d = this.local(seat, 0, 6.5);
    this.handFx = this.handFx.filter(h => h.rig !== rig);
    this.handFx.push({ rig, from: f, to: { x: f.x + d.x, y: f.y + 2.2, z: f.z + d.z }, t0: performance.now(), dur: 340, hide: true }); }
  tilePose(id) { const g = this.tiles.get(id); if (!g) return null; const t = g.userData.target || {}; return { x: g.position.x, y: g.position.y, z: g.position.z, rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z, seen: g.visible, to: t }; }
  // a call: the caller's hand reaches for the tile where it lies (from: its pose before the new layout), then carries it to its
  // place in the meld (the tile's new target). Without `from` (暗槓 / 加槓) the tile comes from the caller's own hand.
  // A tile with no place on the table afterwards (the player's own melds are drawn in the page) is carried off toward its owner.
  carry(seat, id, from) {
    const g = this.tiles.get(id); if (!g) return;
    const shown = g.visible, to = shown ? g.userData.target : this.handOrigin(seat), rig = this.hand(seat);
    if (!to) return;
    const done = shown ? null : () => { g.visible = false; };
    const landed = () => { if (done) done(); this._land('meld', seat); };
    if (!from) { g.visible = true; this.tween(g, to, 320, this.handOrigin(seat), seat, landed); return; }
    g.visible = true; this._drop(g, seat);
    g.position.set(from.x, from.y, from.z); g.rotation.set(from.rx, from.ry, from.rz);
    const r = this._handRest(seat);
    this.handFx = this.handFx.filter(h => h.rig !== rig); rig.visible = true; rig.position.set(r.x, r.y, r.z);
    this.handFx.push({ rig, from: r, to: { x: from.x, y: from.y + D / 2, z: from.z }, t0: performance.now(), dur: 240, then: () => this.tween(g, to, 420, from, seat, landed) });
    this.dirty = true;
  }
  hideAll() { if (this.sorting) for (const S of this.sorting) if (S) clearTimeout(S.timer); this.sorting = []; for (const g of this.tiles.values()) { g.visible = false; this.setTileLook(g, 'normal'); } this.sticks.forEach(s => s.visible = false); this.tweens = []; this.handFx = []; if (this._ov) { this._solo(this._ov.g, false); this._ov.rig.traverse(o => o.layers.disable(1)); this._ov = null; if (this.r2) this.r2.clear(); } (this.hands || []).forEach(h => { if (h) h.visible = false; }); this.dirty = true; }

  layoutRiver(seat, river, animLast, fromLx) {   // fromLx: where the player's own discard stood — a pose from screenPose() (the tile of the page's hand row), or a place along the near edge
    // (ユーザー 2026-11-14: the far seat's discards looked stuck to each other — a little air between the tiles. The row is
    // centred as before: six tiles and their gaps, and a riichi tile laid sideways still clears the neighbour's river.)
    const GX = 0.006, GZ = 0.006, X0 = -(ROW * W + (ROW - 1) * GX) / 2;   // (ユーザー 2026-11-14: each tile right against its neighbours — touching, not joined)
    // (ユーザー 2026-11-14: rivers must never overlap — a long row (a riichi tile laid sideways, the third row running on) could
    // reach into the neighbour's river. Each row is checked against the other seats' river tiles where they lie, and only a row
    // that would touch one is moved along its own line, by as little as clears it.)
    const items = [];
    let row = 0, col = 0, x = X0;
    river.forEach((r, i) => {
      if (col === ROW && row < 2) { row++; col = 0; x = X0; }
      const side = !!r.sideways, w = side ? H : W;
      items.push({ r, i, row, side, lx: x + (w - W) / 2, lz: 3.56 + row * (H + GZ) });
      x += w + GX; col++;
    });
    const others = [];
    for (const g of this.tiles.values()) { const t = g.userData.target; if (g.visible && g.userData.rseat != null && g.userData.rseat !== seat && t) others.push(this._foot(t, g.userData.pose, g.userData.rseat)); }
    const hits = (it, dx, dz) => { const p = this.local(seat, it.lx + dx, it.lz + dz), f = this._foot(p, it.side ? 'side' : 'flat', seat);
      return others.some(o => Math.abs(o.x - f.x) < o.hx + f.hx + .03 && Math.abs(o.z - f.z) < o.hz + f.hz + .03); };
    // along the row first (the smallest move either way); only if that cannot clear it, the row (and the rows behind it) steps back toward its owner
    const shift = [], back = []; let acc = 0;
    for (let rw = 0; rw <= row; rw++) {
      const its = items.filter(it => it.row === rw && !it.r.taken), clear = (dx, dz) => !its.some(it => hits(it, dx, dz));
      let found = null;
      for (let dz = acc; dz <= acc + 1.5 + 1e-9 && !found; dz += .05) {
        if (clear(0, dz)) { found = [0, dz]; break; }
        for (let k = 1; k <= 40; k++) { const d = k * .05; if (clear(-d, dz)) { found = [-d, dz]; break; } if (clear(d, dz)) { found = [d, dz]; break; } }
      }
      if (!found) found = [0, acc];
      shift[rw] = found[0]; back[rw] = acc = found[1];
    }
    for (const it of items) {
      // a called tile is no longer the river's: it lies in the caller's meld (or the player's hand row) — leave it where that put it.
      // (ユーザー 2026-11-14: a pon sometimes showed only two tiles — when the caller's melds were laid out before the discarder's
      // river, the river took its tile back and hid it)
      if (it.r.taken) continue;
      const g = this.tile(it.r.id), lx = it.lx + shift[it.row], lz = it.lz + back[it.row], last = animLast && it.i === river.length - 1;
      const anim = last ? { reach: seat, from: g.visible && g.userData.pose === 'stand' ? null : fromLx && typeof fromLx === 'object' ? fromLx : this.handOrigin(seat, fromLx) }   // (the hand takes the tile out of the owner's hand)
        : (g.visible && g.userData.rseat === seat && g.userData.target && Math.hypot(g.userData.target.x - this.local(seat, lx, lz).x, g.userData.target.z - this.local(seat, lx, lz).z) > .01 ? { dur: 240, level: true } : null);   // (a row moved aside slides there)
      this.place(g, seat, lx, lz, it.side ? 'side' : 'flat', anim);
      g.userData.rseat = seat;
      g.userData.taken = !!it.r.taken;
      g.visible = !it.r.taken;
      this.setTileLook(g, it.r.dim ? 'dim' : 'normal');
    }
  }
  _foot(p, pose, seat) {   // a lying tile's footprint on the cloth: centre and half sizes along x and z
    let hx = W / 2, hz = H / 2; if (pose === 'side') { hx = H / 2; hz = W / 2; }
    return seat % 2 ? { x: p.x, z: p.z, hx: hz, hz: hx } : { x: p.x, z: p.z, hx, hz };
  }
  handOrigin(seat, lx) {   // a tile standing in the owner's hand (the row the opponents' tiles stand in; the player's own is at the near edge)
    const p = this.local(seat, lx || 0, seat === 0 ? 9.9 : HZ);
    return { x: p.x, y: H / 2, z: p.z, rx: 0, ry: seat * PI / 2, rz: 0 };
  }
  layoutHand(seat, ids, drawn, open, slide) {   // slide: after a discard — the tiles wait a moment, then slide together
    const S = this.sorting && this.sorting[seat];
    if (S) { if (!open && drawn == null && ids.length === S.ids.length && ids.every((id, i) => id === S.ids[i])) return; this._cancelSort(seat); }   // (a 理牌 under way over the same tiles places them itself)
    // opponents: standing tiles; open = lay face up (end of hand)
    const n = ids.length + (drawn != null ? 1 : 0);
    let x = HX0;
    const lz = HZ;
    const all = drawn != null ? ids.concat([drawn]) : ids;
    all.forEach((id, i) => {
      const g = this.tile(id);
      if (drawn != null && i === all.length - 1) x += HGAP;
      this.place(g, seat, x + W / 2, open ? lz - 0.2 : lz, open ? 'flat' : 'stand', open && g.visible && g.userData.pose === 'stand' ? { dur: 300 + i * 12 } : slide && g.visible && g.userData.pose === 'stand' ? { dur: 240, delay: 620, level: true } : null);   // (opened: each tile falls forward where it stands — テンパイ / 和了)
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
      // the centre: a round screen behind a metal ring (where a table's dice dome sits) — the round and the tiles left
      g.save(); g.translate(C, C);
      // (ユーザー 2026-11-14: a wider round screen, the round and the tiles left larger)
      if (!em) { const ring = g.createLinearGradient(-290, -290, 290, 290); ring.addColorStop(0, '#e2e6ec'); ring.addColorStop(.35, '#7c828c'); ring.addColorStop(.6, '#c4c9d1'); ring.addColorStop(1, '#565b64');
        g.fillStyle = 'rgba(0,0,0,.5)'; g.beginPath(); g.arc(3, 5, 294, 0, 7); g.fill();
        g.fillStyle = ring; g.beginPath(); g.arc(0, 0, 290, 0, 7); g.fill(); }
      const scr = g.createRadialGradient(-50, -76, 26, 0, 0, 275); scr.addColorStop(0, em ? '#0d2242' : '#12305c'); scr.addColorStop(1, em ? '#030814' : '#06101f');
      g.fillStyle = scr; g.beginPath(); g.arc(0, 0, 268, 0, 7); g.fill();
      g.fillStyle = '#8fe6ff'; g.shadowColor = '#3ab8ff'; g.shadowBlur = em ? 24 : 12;
      // (ユーザー 2026-11-14: only the round and the tiles left here — the pot and the counters are in the box with the dora)
      g.font = '800 124px "Shippori Mincho B1", serif'; g.fillText(`${WN[I.round]}${I.kyoku + 1}局`, 0, -72);
      g.font = '700 58px "Zen Kaku Gothic New", sans-serif'; g.fillText('余', -118, 74);
      const lf = String(I.left).padStart(2, ' '); for (let i = 0; i < 2; i++) seg7(g, -56 + i * 94, 18, 68, 112, lf[i], '#8fe6ff', em ? null : 'rgba(143,230,255,.06)');
      g.shadowBlur = 0;
      if (!em) { const gl = g.createLinearGradient(0, -268, 0, 50); gl.addColorStop(0, 'rgba(255,255,255,.16)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 268, PI, 2 * PI); g.fill(); }   // the glass
      g.restore();
    }
    this.conETex.needsUpdate = true;
    this.conTex.needsUpdate = true;
    this.dirty = true;
  }

  // ---------------------------------------------------------------- camera / loop
  // (ユーザー 2026-11-14: full screen on a Mac dropped frames) the drawing resolution has a budget of pixels: a big window (a Retina
  // screen in full screen is ~4–5 million at 1.5×) is drawn at a lower ratio and scaled up, and if frames still come slowly while
  // things move, the ratio steps down a little more (and back up when there is room). `prMax`: the quality's ceiling.
  _pr() { const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1, BUDGET = this.lite ? 2e6 : 3.8e6;
    return Math.max(.75, Math.min(window.devicePixelRatio || 1, this.prMax || 1.5, Math.sqrt(BUDGET / (w * h))) * (this.dyn || 1)); }
  resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    const pr = this._pr(); if (Math.abs(this.renderer.getPixelRatio() - pr) > .01) this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    if (this.r2) { this.r2.setPixelRatio(this.renderer.getPixelRatio()); this.r2.setSize(w, h, false); }
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
    const lite = q === 'lite'; this.lite = lite;
    this.prMax = lite ? 1 : this.mobile ? 1.25 : 1.5; this.dyn = 1;
    this.renderer.setPixelRatio(this._pr());
    if (this.r2) { this.r2.setPixelRatio(this.renderer.getPixelRatio()); this.r2.setSize(this.host.clientWidth || 1, this.host.clientHeight || 1, false); }
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
      const ends = [];   // (what follows a tween may start another: run it after the list is rebuilt)
      this.tweens = this.tweens.filter(tw => {
        let k = Math.max(0, Math.min(1, (now - tw.t0) * SPD / tw.dur));
        const e = 1 - Math.pow(1 - k, 3);
        const f = tw.from, t = tw.to, g = tw.g;
        const arc = tw.level ? 0 : Math.sin(k * PI) * 0.6;
        g.position.set(f.x + (t.x - f.x) * e, f.y + (t.y - f.y) * e + arc, f.z + (t.z - f.z) * e);
        g.rotation.set(f.rx + (t.rx - f.rx) * e, f.ry + (t.ry - f.ry) * e, f.rz + (t.rz - f.rz) * e);
        if (tw.hand != null) { const rig = this.hand(tw.hand); rig.position.set(g.position.x, g.position.y + this._top(g.rotation.x), g.position.z);   // the hand holds the tile
          const ss = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); }, sn = Math.sin(g.rotation.x), flat = sn * sn;
          // (pinched only while the tile is in the air and lying flat: the thumb goes under as it leaves the row or the table, and is out again before it lands)
          this.pinch(rig, flat * flat * (tw.grip === 'take' ? ss(0, .85, k) : (tw.grip === 'held' ? 1 : ss(.1, .38, k)) * (1 - ss(.5, .8, k)))); }
        if (k >= 1) { if (tw.hand != null && tw.grip !== 'take') this._handBack(tw.hand); if (tw.after) ends.push(tw.after); }
        return k < 1;
      });
      for (const f of ends) f();
      this.dirty = true;
    }
    if (this.handFx.length) {
      const run = this.handFx; this.handFx = [];
      for (const h of run) { const k = Math.min(1, (now - h.t0) * SPD / h.dur), e = k * k * (3 - 2 * k);
        h.rig.position.set(h.from.x + (h.to.x - h.from.x) * e, h.from.y + (h.to.y - h.from.y) * e, h.from.z + (h.to.z - h.from.z) * e);
        if (k < 1) this.handFx.push(h); else { if (h.hide) h.rig.visible = false; if (h.then) h.then(); } }
      this.dirty = true;
    }
    const moved = this.dirty;   // (anything moved or changed this frame: the shadows are redrawn too)
    // the dora's glint: a light runs round the rim of every dora that lies face up and two small stars twinkle, about once in three seconds
    // (at ~30 frames a second when it is the only thing changing: the whole table is redrawn for it)
    // (`quiet`: a full-screen result is over the table — nothing behind it needs to move, so the glint waits: 2026-11-14, optimisation)
    if (this._doraN && !this.quiet) { const ph = now % 2600, on = ph < 1300;
      if (on && (moved || now - (this._glT || 0) > 32)) { this._glT = now; this.doraMat.uniforms.uT.value = ph / 1300; this.dirty = true; } else if (this._doraOn) { this.doraMat.uniforms.uT.value = -1; this.dirty = true; }
      this._doraOn = on; }
    if (this._ov) this.dirty = true;
    if (!this.dirty || document.hidden) return;
    this.dirty = false;
    if (moved || this._ov) this.renderer.shadowMap.needsUpdate = true;
    this._syncInst();
    this._doraSync();
    // the player's own discard: the hand and the tile are also drawn over the page (the hand row is HTML, above the table's
    // canvas). A second, small renderer on a canvas over the page draws only those two (layer 1) with the same camera and lights.
    // (2026-11-14: the first version drew the main canvas twice and copied it across — each such frame took so long that the
    // whole movement was over in one or two frames, i.e. nothing was seen.)
    if (this._ov) {
      const R2 = this._over2(), O = this._ov;
      this.camera.layers.set(1); R2.render(this.scene, this.camera); this.camera.layers.set(0);
      if (!O.rig.visible && !this.tweens.some(t => t.g === O.g) && !this.handFx.some(h => h.rig === O.rig)) { R2.clear(); this._solo(O.g, false); O.rig.traverse(o => o.layers.disable(1)); this._ov = null; }
    }
    this.renderer.render(this.scene, this.camera);
    // frame pacing while things move (consecutive frames only): slow → a lower drawing ratio, quick again → back up
    { const P = this._pace || (this._pace = { last: 0, ema: 16, t: 0 }), dt = now - P.last; P.last = now;
      if (dt > 0 && dt < 120) { P.ema += (dt - P.ema) * .08;
        if (now - P.t > 1200) { P.t = now; const d0 = this.dyn || 1;
          if (P.ema > 28 && d0 > .8) this.dyn = d0 * .9; else if (P.ema < 18 && d0 < 1) this.dyn = Math.min(1, d0 * 1.08);
          if (this.dyn !== d0) this.resize(); } } }
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
