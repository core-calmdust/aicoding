// Tile faces painted with Canvas 2D (shared by the 3D table textures and the HTML hand).
//   MJTiles.canvas(type, red)  -> cached canvas (FW x FH)
//   MJTiles.url(type, red)     -> cached data URL (for <img>)
(function (root) {
'use strict';
const FW = 240, FH = 320;
const C_RED = '#d42a2a', C_GRN = '#14864a', C_BLU = '#1b4fa0', C_BLK = '#1d1b22';
const KANJI_FONT = '"Shippori Mincho B1","Noto Serif JP","Yu Mincho","Hiragino Mincho ProN",serif';
const cache = new Map(), urls = new Map();

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function ground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, FH);
  g.addColorStop(0, '#fffdf6'); g.addColorStop(1, '#f1ead8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, FW, FH);
}

function pin(ctx, x, y, r, col) {
  ctx.save();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(x, y, r * .72, 0, 7); ctx.fill();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * .52, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(x, y, r * .2, 0, 7); ctx.fill();
  // petals
  ctx.strokeStyle = '#fffdf6'; ctx.lineWidth = r * .07;
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * .24, y + Math.sin(a) * r * .24); ctx.lineTo(x + Math.cos(a) * r * .5, y + Math.sin(a) * r * .5); ctx.stroke(); }
  ctx.restore();
}
function bigPin(ctx, red) {
  const x = FW / 2, y = FH / 2, r = 92;
  ctx.save();
  ctx.fillStyle = C_GRN; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(x, y, r * .86, 0, 7); ctx.fill();
  for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; ctx.fillStyle = k % 2 ? C_BLU : C_GRN; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * .72, y + Math.sin(a) * r * .72, r * .1, 0, 7); ctx.fill(); }
  ctx.fillStyle = C_RED; ctx.beginPath(); ctx.arc(x, y, r * .5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(x, y, r * .36, 0, 7); ctx.fill();
  ctx.fillStyle = C_BLU; ctx.beginPath(); ctx.arc(x, y, r * .26, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(x, y, r * .09, 0, 7); ctx.fill();
  ctx.restore();
}
const PIN = {   // [x, y, color] in 0..1 coordinates
  2: [[.5, .27, 'b'], [.5, .73, 'g']],
  3: [[.27, .2, 'b'], [.5, .5, 'r'], [.73, .8, 'g']],
  4: [[.29, .29, 'b'], [.71, .29, 'g'], [.29, .71, 'g'], [.71, .71, 'b']],
  5: [[.27, .22, 'b'], [.73, .22, 'g'], [.5, .5, 'r'], [.27, .78, 'g'], [.73, .78, 'b']],
  6: [[.3, .2, 'g'], [.7, .2, 'g'], [.3, .55, 'r'], [.7, .55, 'r'], [.3, .82, 'r'], [.7, .82, 'r']],
  7: [[.22, .14, 'g'], [.5, .23, 'g'], [.78, .32, 'g'], [.3, .58, 'r'], [.7, .58, 'r'], [.3, .84, 'r'], [.7, .84, 'r']],
  8: [[.3, .13, 'b'], [.7, .13, 'b'], [.3, .38, 'b'], [.7, .38, 'b'], [.3, .63, 'b'], [.7, .63, 'b'], [.3, .88, 'b'], [.7, .88, 'b']],
  9: [[.2, .18, 'g'], [.5, .18, 'g'], [.8, .18, 'g'], [.2, .5, 'r'], [.5, .5, 'r'], [.8, .5, 'r'], [.2, .82, 'b'], [.5, .82, 'b'], [.8, .82, 'b']],
};
const PR = { 2: 44, 3: 36, 4: 40, 5: 34, 6: 33, 7: 28, 8: 27, 9: 30 };
const COL = { r: C_RED, g: C_GRN, b: C_BLU };

function stick(ctx, x, y, h, col, ang) {
  const w = 22;
  ctx.save(); ctx.translate(x, y); if (ang) ctx.rotate(ang);
  ctx.fillStyle = col;
  rr(ctx, -w / 2, -h / 2, w, h, 9); ctx.fill();
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(-1.6, -h / 2 + 8, 3.2, h - 16);
  ctx.fillStyle = col;
  ctx.fillRect(-w / 2 - 1, -2.5, w + 2, 5);
  ctx.restore();
}
const SOU = {   // [x, y, color, angle]
  2: [[.5, .27, 'g'], [.5, .73, 'g']],
  3: [[.5, .27, 'g'], [.3, .73, 'g'], [.7, .73, 'g']],
  4: [[.3, .27, 'g'], [.7, .27, 'g'], [.3, .73, 'g'], [.7, .73, 'g']],
  5: [[.25, .27, 'g'], [.75, .27, 'g'], [.5, .5, 'r'], [.25, .73, 'g'], [.75, .73, 'g']],
  6: [[.22, .27, 'g'], [.5, .27, 'g'], [.78, .27, 'g'], [.22, .73, 'g'], [.5, .73, 'g'], [.78, .73, 'g']],
  7: [[.5, .16, 'r'], [.22, .5, 'g'], [.5, .5, 'g'], [.78, .5, 'g'], [.22, .83, 'g'], [.5, .83, 'g'], [.78, .83, 'g']],
  8: [[.2, .27, 'g'], [.38, .27, 'g', .35], [.62, .27, 'g', -.35], [.8, .27, 'g'], [.2, .73, 'g'], [.38, .73, 'g', -.35], [.62, .73, 'g', .35], [.8, .73, 'g']],
  9: [[.22, .17, 'g'], [.5, .17, 'r'], [.78, .17, 'g'], [.22, .5, 'g'], [.5, .5, 'r'], [.78, .5, 'g'], [.22, .83, 'g'], [.5, .83, 'r'], [.78, .83, 'g']],
};
const SH = { 2: 104, 3: 104, 4: 104, 5: 100, 6: 104, 7: 74, 8: 104, 9: 76 };

function bird(ctx) {
  // a small stylised peacock for 1s
  ctx.save(); ctx.translate(FW / 2, FH / 2 + 10);
  // tail fan
  for (let k = -3; k <= 3; k++) {
    ctx.save(); ctx.rotate(k * 0.22);
    ctx.fillStyle = k % 2 ? C_GRN : '#1f9d5c';
    ctx.beginPath(); ctx.ellipse(0, 52, 16, 58, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C_BLU; ctx.beginPath(); ctx.arc(0, 92, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.arc(0, 92, 4, 0, 7); ctx.fill();
    ctx.restore();
  }
  // body
  ctx.fillStyle = C_GRN; ctx.beginPath(); ctx.ellipse(0, -10, 34, 46, 0, 0, 7); ctx.fill();
  ctx.fillStyle = C_RED; ctx.beginPath(); ctx.ellipse(0, 0, 20, 30, 0, 0, 7); ctx.fill();
  // head
  ctx.fillStyle = C_GRN; ctx.beginPath(); ctx.arc(0, -66, 20, 0, 7); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(7, -70, 6, 0, 7); ctx.fill();
  ctx.fillStyle = C_BLK; ctx.beginPath(); ctx.arc(8, -70, 3, 0, 7); ctx.fill();
  ctx.fillStyle = C_RED; ctx.beginPath(); ctx.moveTo(18, -64); ctx.lineTo(34, -60); ctx.lineTo(18, -56); ctx.fill();
  ctx.strokeStyle = C_RED; ctx.lineWidth = 4;
  for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(0, -84); ctx.lineTo(k * 12, -104); ctx.stroke(); ctx.fillStyle = C_RED; ctx.beginPath(); ctx.arc(k * 12, -106, 5, 0, 7); ctx.fill(); }
  ctx.restore();
}

const MAN = ['一', '二', '三', '四', '伍', '六', '七', '八', '九'];
const HONOR = ['東', '南', '西', '北', '', '發', '中'];

// 2026-11-14: the faces of 上海 (大百科) — characters and pictures traced from photos of real Japanese tiles
// (atlas/tools/shanghai-glyphs.py → ../atlas/img/shanghai-glyphs.png: ink per channel R black / G red / B green, 8×3 cells;
// shanghai-art.png: RGBA pictures, 8×4 cells: 0–8 筒子, 9–17 索子). Drawn once the two sheets are in (MJTiles.ready()); until then
// (or if they fail) the older drawn faces below.
const GW = 280, GH = 390, SHEET = new URL('../atlas/img/', (document.currentScript && document.currentScript.src) || location.href).href;
let gImg = null, aImg = null, readyP = null;
function ready() {
  const one = (u, set) => new Promise(res => { const im = new Image(); im.onload = () => { set(im); res(); }; im.onerror = () => res(); im.src = (root.JANKA_ASSETS ? root.JANKA_ASSETS + 'tiles/' : SHEET) + u; setTimeout(res, 5000); });
  return readyP || (readyP = Promise.all([one('shanghai-glyphs.png?v=2', im => { gImg = im; }), one('shanghai-art.png?v=9', im => { aImg = im; })]));
}
const GROUND = '#fafaf6';
// one cell of a sheet in a colour (glyph sheet: channel ch; art sheet: ch < 0 keeps its colours, or recolours all to `col`)
function cell(img, k, ch, col) {
  const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const c = cv.getContext('2d');
  c.drawImage(img, (k % 8) * GW, Math.floor(k / 8) * GH, GW, GH, 0, 0, GW, GH);
  if (ch >= 0 || col) {
    const im = c.getImageData(0, 0, GW, GH), d = im.data, rgb = col ? [1, 3, 5].map(i => parseInt(col.slice(i, i + 2), 16)) : null;
    for (let p = 0; p < d.length; p += 4) { const a = ch >= 0 ? d[p + ch] : d[p + 3]; if (rgb) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; } d[p + 3] = a; }
    c.putImageData(im, 0, 0);
  }
  return cv;
}
const INK = '#141414', RED2 = '#d0122a', GRN2 = '#127040';
function paintSheet(ctx, type, red) {
  const put = cv => ctx.drawImage(cv, 0, 0, FW, FH);
  if (type < 9) { put(cell(gImg, type, 0, red ? RED2 : INK)); put(cell(gImg, type, 1, RED2)); return true; }
  if (type < 27) { put(cell(aImg, type < 18 ? type - 9 : 9 + type - 18, -1, red ? RED2 : null)); return true; }
  const k = type - 27;
  if (k < 4) { put(cell(gImg, 9 + k, 0, INK)); return true; }
  if (k === 5) { put(cell(gImg, 13, 2, GRN2)); return true; }
  if (k === 6) { put(cell(gImg, 14, 1, RED2)); return true; }
  return false;   // 白: the frame below
}
function paint(type, red) {
  const cv = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  cv.width = FW; cv.height = FH;
  const ctx = cv.getContext('2d');
  if (gImg && aImg) {
    ctx.fillStyle = GROUND; ctx.fillRect(0, 0, FW, FH);
    paintSheet(ctx, type, red);   // (白: nothing drawn — a plain white tile, as Japanese sets, ユーザー 2026-11-14)
    return cv;
  }
  ground(ctx);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (type < 9) {
    const n = type;
    ctx.fillStyle = red ? C_RED : C_BLK;
    ctx.font = `800 112px ${KANJI_FONT}`;
    ctx.fillText(MAN[n], FW / 2, FH * .3);
    ctx.fillStyle = C_RED;
    ctx.font = `800 124px ${KANJI_FONT}`;
    ctx.fillText('萬', FW / 2, FH * .7);
  } else if (type < 18) {
    const n = type - 9 + 1;
    if (n === 1) bigPin(ctx, red);
    else {
      const padX = 26, padY = 30, w = FW - padX * 2, h = FH - padY * 2;
      for (const [x, y, c] of PIN[n]) pin(ctx, padX + x * w, padY + y * h, PR[n], red ? C_RED : COL[c]);
    }
  } else if (type < 27) {
    const n = type - 18 + 1;
    if (n === 1) bird(ctx);
    else {
      const padX = 30, padY = 26, w = FW - padX * 2, h = FH - padY * 2;
      for (const [x, y, c, a] of SOU[n]) stick(ctx, padX + x * w, padY + y * h, SH[n], red ? C_RED : (c === 'r' ? C_RED : C_GRN), a || 0);
    }
  } else {
    const k = type - 27;
    if (k === 4) {        // haku: plain white
    } else {
      ctx.fillStyle = k === 5 ? C_GRN : k === 6 ? C_RED : C_BLK;
      ctx.font = `800 ${k >= 5 ? 168 : 176}px ${KANJI_FONT}`;
      ctx.fillText(HONOR[k], FW / 2, FH / 2 + 6);
    }
  }
  // soft inner edge
  const e = ctx.createLinearGradient(0, 0, 0, FH);
  e.addColorStop(0, 'rgba(255,255,255,.35)'); e.addColorStop(.12, 'rgba(255,255,255,0)'); e.addColorStop(.9, 'rgba(0,0,0,0)'); e.addColorStop(1, 'rgba(120,100,60,.12)');
  ctx.fillStyle = e; ctx.fillRect(0, 0, FW, FH);
  return cv;
}

// ---- the carving (2026-11-14, Fable) ----
// A real tile is cut with a round bit and the paint lies in the cut: the groove is a shallow U — its walls fall from the
// white face into the paint and the floor is flat. depthOf() gives that profile (0 = the face, 1 = the floor of a wide cut;
// hairlines are narrower than the bit and so stay shallower, as on real tiles):
//   the paint's coverage (how far a pixel is from the white ground) → blurred (≈ the bit's radius) → the wall starts just
//   outside the stroke's edge and reaches the floor ~3 px inside it.
// From it: normalOf() (the 3D tiles' normal map) and lit() (the 2D tiles: the same cut under a light from the top left,
// baked — a soft shade under the wall nearest the light, a glint on the far wall; the paint keeps its own colour, no ink line).
function depthOf(cv) {
  const W = cv.width, H = cv.height, src = cv.getContext('2d').getImageData(0, 0, W, H).data, a = new Float32Array(W * H), t = new Float32Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += 4) { const d = Math.max(Math.abs(src[p] - 250), Math.abs(src[p + 1] - 250), Math.abs(src[p + 2] - 246)); a[i] = d < 10 ? 0 : Math.min(1, (d - 10) / 60); }
  const box = (A, B, dx, dy) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = A[i], n = 1; if (x - dx >= 0 && y - dy >= 0) { v += A[i - dy * W - dx]; n++; } if (x + dx < W && y + dy < H) { v += A[i + dy * W + dx]; n++; } B[i] = v / n; } };
  const h = a.slice();
  for (let k = 0; k < 3; k++) { box(h, t, 1, 0); box(t, h, 0, 1); }
  for (let i = 0; i < W * H; i++) { const v = Math.min(1, Math.max(0, (h[i] - .4) / .52)); h[i] = v * v * (3 - 2 * v); }
  return { W, H, h, src };
}
const SLOPE = 3.6;   // how steep the walls read (the cut's depth against a pixel)
function normalOf(cv) {
  const { W, H, h } = depthOf(cv);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const oc = out.getContext('2d'), im = oc.createImageData(W, H), o = im.data, S = SLOPE;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, l = h[x > 0 ? i - 1 : i], r = h[x < W - 1 ? i + 1 : i], u = h[y > 0 ? i - W : i], d = h[y < H - 1 ? i + W : i];
    let nx = (r - l) * S, ny = (u - d) * S, nz = 1; const k = 1 / Math.hypot(nx, ny, nz); const p = i * 4; o[p] = (nx * k * .5 + .5) * 255; o[p + 1] = (ny * k * .5 + .5) * 255; o[p + 2] = (nz * k * .5 + .5) * 255; o[p + 3] = 255; }
  oc.putImageData(im, 0, 0); return out;
}
function lit(cv) {
  const { W, H, h, src } = depthOf(cv);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const oc = out.getContext('2d'), im = oc.createImageData(W, H), o = im.data, S = SLOPE;
  const lx = -.42, ly = -.58, lz = .7, hx = lx, hy = ly, hz = lz + 1, hk = 1 / Math.hypot(hx, hy, hz), flat = Math.pow(hz * hk, 60);   // the light (from the top left) and its half vector
  const at = (x, y) => h[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, p = i * 4, gx = (at(x + 1, y) - at(x - 1, y)) * S, gy = (at(x, y + 1) - at(x, y - 1)) * S;
    // the surface z = −depth: its normal (gx, gy, 1) normalised
    const k = 1 / Math.hypot(gx, gy, 1), nx = gx * k, ny = gy * k, nz = k;
    let dif = (nx * lx + ny * ly + nz * lz) / lz;                                  // 1 on the flat
    dif = dif < 1 ? 1 - (1 - Math.max(.2, dif)) * .5 : 1 + Math.min(.5, dif - 1) * .5;
    const sh = Math.max(0, h[i] - at(Math.round(x + lx * 4.5), Math.round(y + ly * 4.5))) * .2;   // the wall nearest the light shades the floor under it
    const dark = 1 + (1 - (src[p] * .3 + src[p + 1] * .5 + src[p + 2] * .2) / 255) * 1.1;   // (a dark paint shows its cut by the glint alone)
    const sp = (Math.max(0, Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) * hk), 60) - flat) * 150 + (dif > 1 ? (dif - 1) * 90 : 0)) * dark;   // the glint on the far wall
    const f = dif * (1 - sh);
    o[p] = Math.min(255, src[p] * f + sp); o[p + 1] = Math.min(255, src[p + 1] * f + sp); o[p + 2] = Math.min(255, src[p + 2] * f + sp); o[p + 3] = 255;
  }
  oc.putImageData(im, 0, 0); return out;
}
const ncache = new Map();
function normal(type, red) { const k = key(type, red); let n = ncache.get(k); if (!n) { n = normalOf(canvas(type, red)); ncache.set(k, n); } return n; }
function key(type, red) { return type + (red ? 'r' : ''); }
function canvas(type, red) {
  const k = key(type, red);
  let c = cache.get(k);
  if (!c) { c = paint(type, red); cache.set(k, c); }
  return c;
}
function url(type, red) {
  const k = key(type, red);
  let u = urls.get(k);
  if (!u) { const c = canvas(type, red); u = (gImg && aImg ? lit(c) : c).toDataURL('image/png'); urls.set(k, u); }   // (the 2D tiles: the carving baked in)
  return u;
}
function reset() { cache.clear(); urls.clear(); ncache.clear(); }
const RED = new Set([16, 52, 88]);
const MJTiles = { FW, FH, canvas, url, reset, normal, ready, sheets: () => !!(gImg && aImg), ofId: id => ({ t: id >> 2, red: RED.has(id) }), urlId: id => url(id >> 2, RED.has(id)) };
root.MJTiles = MJTiles;
})(window);
