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

function paint(type, red) {
  const cv = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
  cv.width = FW; cv.height = FH;
  const ctx = cv.getContext('2d');
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
    if (k === 4) {        // haku: blue frame
      ctx.strokeStyle = C_BLU; ctx.lineWidth = 10;
      rr(ctx, 46, 58, FW - 92, FH - 116, 14); ctx.stroke();
      ctx.lineWidth = 3; rr(ctx, 62, 74, FW - 124, FH - 148, 8); ctx.stroke();
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
  if (!u) { u = canvas(type, red).toDataURL('image/png'); urls.set(k, u); }
  return u;
}
function reset() { cache.clear(); urls.clear(); }
const RED = new Set([16, 52, 88]);
const MJTiles = { FW, FH, canvas, url, reset, ofId: id => ({ t: id >> 2, red: RED.has(id) }), urlId: id => url(id >> 2, RED.has(id)) };
root.MJTiles = MJTiles;
})(window);
