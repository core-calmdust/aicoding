// 雀華 — light effects for the game (2026-11-16, ユーザー「ガチャ演出で学んだ表現で、重くしない程度にゲーム中のエフェクトをAAA仕様に」).
// The language of the gacha's light (gachafx.js), made small and cheap enough for every call and cut-in:
//   · light is ADDED (globalCompositeOperation 'lighter'), soft round sprites drawn once and stamped — nothing hard-edged
//   · rings are GLASS: a wide, faint band of colour with a hair-thin bright edge
//   · sparks are streaks with drag and a little gravity; embers drift and flicker; petals tumble (drawn normally, translucent)
//   · flares are thin and translucent; a horizontal lens streak; a short soft flash from the centre, never a white wall
// One canvas over the whole UI (inside #root, so a phone held upright turns it with everything else), created when an effect starts
// and removed as soon as nothing is left to draw. Particle counts are kept low (a few dozen) and halved on a phone; light mode draws
// only the rings. API: VFX.burst(x, y, opts) · VFX.slash(x, y, opts) · VFX.rise(x, y, opts) · VFX.at(el) → the element's centre
// in the UI's own coordinates · VFX.pal(hex) → [white-ish, colour, deep].
(function () {
'use strict';
let cv = null, g = null, W = 0, H = 0, DPR = 1, raf = 0, last = 0;
const FX = [], P = [];
const lite = () => document.documentElement.classList.contains('lite');
const phone = () => document.documentElement.classList.contains('lp');
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = k => 1 - Math.pow(1 - k, 3);
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function mix(h, w, k) { const a = parseInt(h.slice(1), 16), b = parseInt(w.slice(1), 16), f = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return '#' + [16, 8, 0].map(s => f(s).toString(16).padStart(2, '0')).join(''); }
function pal(hex) { hex = /^#[0-9a-f]{6}$/i.test(hex || '') ? hex : '#e8ce8c'; return [mix(hex, '#ffffff', .75), mix(hex, '#ffffff', .2), mix(hex, '#000000', .15)]; }
const sprites = {};
function glow(col) {
  if (sprites[col]) return sprites[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, col); gr.addColorStop(.5, hexA(col, .3)); gr.addColorStop(1, hexA(col, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return (sprites[col] = c);
}
function host() { return document.getElementById('root') || document.body; }
function ensure() {
  const h = host();
  if (!cv) { cv = document.createElement('canvas'); cv.className = 'vfx-cv'; g = cv.getContext('2d'); }
  if (cv.parentNode !== h) h.appendChild(cv);
  DPR = Math.min(phone() ? 1.25 : 1.5, devicePixelRatio || 1);
  const w = h.offsetWidth || innerWidth, hh = h.offsetHeight || innerHeight;
  if (w !== W || hh !== H || cv.width !== Math.round(w * DPR)) { W = w; H = hh; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
  g.setTransform(DPR, 0, 0, DPR, 0, 0);
}
function start() { ensure(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
// the centre of an element in the UI's own frame (layout offsets up to #root: right on a phone held upright too)
// (from the element's box on the screen, turned back into the UI's frame when the UI is turned 90°: html.rot — offsets do not cross
// the fixed-position cut-in)
function at(el) { const r = el.getBoundingClientRect(), hr = host().getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  if (document.documentElement.classList.contains('rot')) return { x: y - hr.top, y: hr.right - x };
  return { x: x - hr.left, y: y - hr.top }; }

function ring(x, y, r, lw, a, c, sq = 1) { if (r < 2 || a <= 0) return; g.save(); g.translate(x, y); g.scale(1, sq);
  const bw = lw * 6, rg = g.createRadialGradient(0, 0, Math.max(0, r - bw), 0, 0, r + bw * .4);
  rg.addColorStop(0, hexA(c, 0)); rg.addColorStop(.7, hexA(c, .18)); rg.addColorStop(.86, 'rgba(255,255,255,.24)'); rg.addColorStop(1, hexA(c, 0));
  // (2026-11-16, ユーザー「負荷を見た目を変えずに削減」) only the band is filled: inside r − bw the gradient is fully transparent, so the
  // hole is cut out of the path (the same pixels, a fraction of the area for a wide ring)
  const ri = Math.max(0, r - bw); g.globalAlpha = a; g.fillStyle = rg; g.beginPath(); g.arc(0, 0, r + bw * .4, 0, 6.2832); if (ri > 1) { g.moveTo(ri, 0); g.arc(0, 0, ri, 0, 6.2832, true); } g.fill();
  g.globalAlpha = a * .8; g.lineWidth = Math.max(.7, lw * .35); g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.restore(); }

// a burst of light: o = { pal, scale (1 = a call), sparks, embers, petals, flare, flash, rings, dur }
function burst(x, y, o = {}) {
  const L = lite(), K = (phone() ? .55 : 1) * (L ? 0 : 1), s = o.scale || 1, C = o.pal || pal();
  FX.push({ k: 'burst', x, y, s, C, sq: o.sq || 1, t0: performance.now(), dur: o.dur || 900, rings: o.rings ?? 2, flare: !L && o.flare !== false, flash: !L && o.flash !== false, veil: !L && !!o.veil });
  for (let i = 0; i < Math.round((o.sparks ?? 40) * K); i++) { const a = rnd(0, 6.283), v = rnd(260, 980) * s;
    P.push({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .85 - rnd(0, 140) * s, life: 0, max: rnd(.45, 1), w: rnd(1, 2.4) * Math.sqrt(s), c: C[(Math.random() * 3) | 0] }); }
  for (let i = 0; i < Math.round((o.embers ?? 14) * K); i++) { const a = rnd(0, 6.283), v = rnd(30, 200) * s;
    P.push({ k: 'ember', x: x + rnd(-14, 14) * s, y: y + rnd(-10, 10) * s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(40, 140) * s, life: 0, max: rnd(.9, 1.8), r: rnd(2.5, 6) * s, f: rnd(0, 9), c: C[(Math.random() * 2) | 0] }); }
  for (let i = 0; i < Math.round((o.petals ?? 0) * K); i++) { const a = rnd(0, 6.283), v = rnd(160, 620) * s;
    P.push({ k: 'petal', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8 - rnd(60, 260) * s, life: 0, max: rnd(1.6, 2.6), r: rnd(5, 10) * s, rot: rnd(0, 6.3), vr: rnd(-6, 6), ph: rnd(0, 6.3), vp: rnd(4, 9),
      c: (o.petalCols || ['#ffd0e2', '#ffffff', '#ffe7a8', '#ffb4cf'])[(Math.random() * (o.petalCols || [0, 0, 0, 0]).length) | 0] }); }
  start();
}
// a slash of light across a point (riichi): a long thin streak drawn out from one side, its glass afterglow, a few sparks off it
function slash(x, y, o = {}) {
  const s = o.scale || 1, C = o.pal || pal('#ffd56a');
  FX.push({ k: 'slash', x, y, s, C, a: o.angle ?? -.32, t0: performance.now(), dur: o.dur || 700 });
  if (!lite()) for (let i = 0; i < Math.round(22 * (phone() ? .55 : 1)); i++) { const u = rnd(-1, 1), a = (o.angle ?? -.32) + (Math.random() < .5 ? -1.57 : 1.57) + rnd(-.5, .5), v = rnd(120, 520) * s;
    P.push({ k: 'spark', x: x + Math.cos(o.angle ?? -.32) * u * 420 * s, y: y + Math.sin(o.angle ?? -.32) * u * 420 * s, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: -rnd(0, .25), max: rnd(.35, .7), w: rnd(.8, 1.8), c: C[(Math.random() * 2) | 0] }); }
  start();
}
// embers rising from a place (a skill taking hold at a seat)
function rise(x, y, o = {}) {
  if (lite()) return; const s = o.scale || 1, C = o.pal || pal();
  for (let i = 0; i < Math.round((o.n ?? 18) * (phone() ? .55 : 1)); i++)
    P.push({ k: 'ember', x: x + rnd(-40, 40) * s, y: y + rnd(-6, 16) * s, vx: rnd(-18, 18) * s, vy: -rnd(50, 150) * s, life: -rnd(0, .5), max: rnd(.9, 1.6), r: rnd(2, 4.5) * s, f: rnd(0, 9), c: C[(Math.random() * 2) | 0] });
  start();
}

// a shock ring on the table (skills): glass rings only, flattened by the table's perspective (sq), r: how far they run
function shock(x, y, o = {}) {
  const s = o.scale || 1, C = o.pal || pal();
  FX.push({ k: 'shock', x, y, s, C, sq: o.sq || .4, r: o.r || 260, n: o.n || 2, t0: performance.now(), dur: o.dur || 800 });
  start();
}
// streams of light drawn in to a point (skills that take: 総取り, 引き寄せ): o = { pal, n, from: [[x, y], …] or around (radius), dur }
function pull(tx, ty, o = {}) {
  if (lite()) return; const C = o.pal || pal(), n = Math.round((o.n ?? 26) * (phone() ? .55 : 1)), d = (o.dur || 650) / 1000;
  for (let i = 0; i < n; i++) { let sx, sy;
    if (o.from) { const f = o.from[i % o.from.length]; sx = f[0] + rnd(-60, 60); sy = f[1] + rnd(-30, 30); }
    else { const a = rnd(0, 6.283), r = (o.around || 300) * rnd(.6, 1.1); sx = tx + Math.cos(a) * r; sy = ty + Math.sin(a) * r * (o.sq || .5); }
    const bend = rnd(-1, 1) * (o.bend ?? 90);
    P.push({ k: 'home', x0: sx, y0: sy, tx, ty, bend, x: sx, y: sy, px: sx, py: sy, life: -rnd(0, d * .45), max: d * rnd(.55, .8), w: rnd(1, 2.4), c: C[(Math.random() * 2) | 0] }); }
  start();
}

function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (!FX.length && !P.length) { raf = 0; g.clearRect(0, 0, W, H); if (cv.parentNode) cv.remove(); return; }
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
  for (let i = FX.length - 1; i >= 0; i--) {
    const f = FX[i], u = (now - f.t0) / f.dur; if (u >= 1) { FX.splice(i, 1); continue; } if (u < 0) continue;
    const { x, y, s, C } = f;
    if (f.k === 'burst') {
      if (f.flash) { const fa = Math.max(0, 1 - u / .22), fr = (120 + 260 * ease(u)) * s; g.globalAlpha = .55 * fa * fa; g.drawImage(glow(C[0]), x - fr, y - fr, fr * 2, fr * 2); }
      const ca = Math.max(0, 1 - u / .7), cr = (60 + 140 * ease(clamp(u / .3, 0, 1))) * s;
      g.globalAlpha = ca * .55; g.drawImage(glow(C[1]), x - cr, y - cr, cr * 2, cr * 2); g.globalAlpha = ca * .6; g.drawImage(glow(C[0]), x - cr * .35, y - cr * .35, cr * .7, cr * .7);
      if (f.rings > 0) ring(x, y, ease(u) * 260 * s, 5 * s * (1 - u * .7), (1 - u) * .75, C[1], f.sq);
      if (f.rings > 1 && u > .08) ring(x, y, ease((u - .08) / .92) * 180 * s, 4 * s * (1 - u * .7), (1 - u) * .55, C[2], f.sq * .32);
      if (f.flare && u < .6) { const fa = 1 - u / .6, fl = (180 + 220 * u) * s; g.save(); g.translate(x, y); g.rotate(.4 + u * .8);
        for (let k = 0; k < 4; k++) { const q = k / 4 * Math.PI, len = fl * (k % 2 ? .5 : 1);
          for (const [w, a] of [[6 * s, .1], [2.2 * s, .32], [.9, .75]]) { g.globalAlpha = fa * a; g.strokeStyle = a > .7 ? '#fff' : C[1]; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(-Math.cos(q) * len, -Math.sin(q) * len); g.lineTo(Math.cos(q) * len, Math.sin(q) * len); g.stroke(); } }
        g.restore();
        g.save(); g.translate(x, y); g.scale(6, .14); const lr = 70 * s; g.globalAlpha = fa * .7; g.drawImage(glow(C[1]), -lr, -lr, lr * 2, lr * 2); g.restore(); }
    } else if (f.k === 'shock') {
      for (let k = 0; k < f.n; k++) { const v = (u - k * .14) / (1 - k * .14); if (v <= 0) continue;
        ring(x, y, ease(v) * f.r * s, (6 - k * 2) * s * (1 - v * .7), (1 - v) * (k ? .5 : .8), k ? C[2] : C[1], f.sq); }
      if (u < .35) { const fa = 1 - u / .35, fr = 90 * s; g.globalAlpha = fa * .5; g.save(); g.translate(x, y); g.scale(1, f.sq); g.drawImage(glow(C[0]), -fr, -fr, fr * 2, fr * 2); g.restore(); }
    } else if (f.k === 'slash') {
      const L = 520 * s, head = ease(clamp(u / .35, 0, 1)), tail = ease(clamp((u - .15) / .85, 0, 1)), ca = Math.cos(f.a), sa = Math.sin(f.a);
      const x0 = x - ca * L, y0 = y - sa * L, xh = x0 + ca * 2 * L * head, yh = y0 + sa * 2 * L * head, xt = x0 + ca * 2 * L * tail * .9, yt = y0 + sa * 2 * L * tail * .9;
      const lg = g.createLinearGradient(xt, yt, xh, yh); lg.addColorStop(0, hexA(C[1], 0)); lg.addColorStop(.7, hexA(C[1], .55)); lg.addColorStop(1, '#ffffff');
      for (const [w, a] of [[16 * s, .12], [6 * s, .35], [1.6 * s, 1]]) { g.globalAlpha = a * (1 - tail * .6); g.strokeStyle = a === 1 ? lg : hexA(C[1], 1); g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(xt, yt); g.lineTo(xh, yh); g.stroke(); }
      g.globalAlpha = (1 - u) * .8; const hr = 26 * s; g.drawImage(glow(C[0]), xh - hr, yh - hr, hr * 2, hr * 2);
    }
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.life += dt; if (p.life < 0) continue; if (p.life >= p.max) { P.splice(i, 1); continue; }
    const lk = p.life / p.max;
    if (p.k === 'spark') { const dr = Math.exp(-2.6 * dt); p.vx *= dr; p.vy = p.vy * dr + 380 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const sp = Math.hypot(p.vx, p.vy) || 1, len = Math.min(34, sp * .035); g.globalAlpha = .8 * (1 - lk) * (1 - lk); g.strokeStyle = lk < .2 ? '#fff' : p.c; g.lineWidth = p.w * (1 - lk * .5); g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len); g.lineTo(p.x, p.y); g.stroke(); }
    else if (p.k === 'ember') { const dr = Math.exp(-1.3 * dt); p.vx *= dr; p.vy = p.vy * dr - 24 * dt; p.x += p.vx * dt + Math.sin(p.life * 3 + p.f) * 10 * dt; p.y += p.vy * dt;
      const fl = .6 + .4 * Math.sin(p.life * 16 + p.f), r = p.r * (1 - lk * .5); g.globalAlpha = Math.min(1, p.life * 6) * (1 - lk) * fl * .9; g.drawImage(glow(p.c), p.x - r * 2, p.y - r * 2, r * 4, r * 4); }
    else if (p.k === 'home') { const e = lk * lk * (3 - 2 * lk), nx = -(p.ty - p.y0), ny = p.tx - p.x0, nl = Math.hypot(nx, ny) || 1, b = Math.sin(e * 3.1416) * p.bend;
      p.px = p.x; p.py = p.y; p.x = p.x0 + (p.tx - p.x0) * e + nx / nl * b; p.y = p.y0 + (p.ty - p.y0) * e + ny / nl * b;
      const al = Math.min(1, lk * 5) * (1 - Math.max(0, lk - .85) / .15); g.globalAlpha = .85 * al; g.strokeStyle = lk > .8 ? '#fff' : p.c; g.lineWidth = p.w; g.lineCap = 'round';
      let dx = p.x - p.px, dy = p.y - p.py; const dl = Math.hypot(dx, dy) * 4, cap = 46; if (dl > cap) { dx *= cap / dl; dy *= cap / dl; } g.beginPath(); g.moveTo(p.x - dx * 4, p.y - dy * 4);   // (a slow frame must not draw a long line) g.lineTo(p.x, p.y); g.stroke();
      g.globalAlpha = .5 * al; const r = 5 + p.w * 2; g.drawImage(glow(p.c), p.x - r, p.y - r, r * 2, r * 2); }
    else if (p.k === 'petal') { const dr = Math.exp(-1.5 * dt); p.vx = p.vx * dr + Math.sin(p.life * 2.2 + p.ph) * 40 * dt; p.vy = p.vy * dr + 120 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - lk) * 1.6) * .72; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(Math.cos(p.life * p.vp + p.ph), 1);
      g.fillStyle = p.c; g.beginPath(); g.moveTo(0, -p.r); g.bezierCurveTo(p.r * .9, -p.r * .7, p.r * .75, p.r * .6, 0, p.r); g.bezierCurveTo(-p.r * .75, p.r * .6, -p.r * .9, -p.r * .7, 0, -p.r); g.fill(); g.restore(); }
  }
  raf = requestAnimationFrame(frame);
}
window.VFX = { burst, slash, rise, shock, pull, at, pal, active: () => FX.length + P.length };
})();
