// 雀華 — the gacha's shrine bursting with light (2026-11-16, ユーザー「神社が吹っ飛ぶくらいド派手に。リッチなエフェクトで。
// AAAタイトルの仕事として入念に」). A full-screen canvas over everything, drawn additively (light adds up to white), in the colour of
// the best rarity drawn. Timeline (ms):
//   0–1300   CHARGE  the screen dims around the shrine; streaks of light are drawn in from all sides into its doorway; a sacred seal
//                    (two rings, ticks, the five-petalled plum crest) opens on the ground and turns; the doorway's glow swells; from
//                    500 a pillar of light climbs to the sky; embers rise; the shrine trembles (CSS).
//   1300     BLAST   a white-out that fades over half a second; the shrine is swallowed by the light (CSS); shock rings run out (two in
//                    the air, one along the ground); a turning eight-pointed star flare and a horizontal lens streak; god rays; a
//                    storm of sparks (streaks with drag and gravity), slow embers, plum petals tumbling out; clouds of light; the
//                    screen quakes (CSS).
//   2100     the cards appear (app.js) while the sparks and petals are still falling; the canvas fades out by 3300.
// Light mode draws about a third of the particles, no clouds and no shake.
(function () {
'use strict';
const PAL = {
  N: ['#ffffff', '#cfd9ff', '#9fb4ff'], R: ['#e6f4ff', '#8fcaff', '#3d8fff'], SR: ['#f6e6ff', '#d29bff', '#9a4dff'],
  SSR: ['#fffbe6', '#ffd86a', '#ff9d1f'], UR: null,
};
const TB = 1300, TEND = 3300;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => 1 - Math.pow(1 - k, 3);
const sprites = {};
function glow(col) {   // a soft round light of one colour (drawn once, then stamped)
  if (sprites[col]) return sprites[col];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, col); gr.addColorStop(.5, hexA(col, .35)); gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (sprites[col] = c);
}
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function hsl(hh, s, l) { return `hsl(${hh},${s}%,${l}%)`; }
function hslHex(hh, s, l) { s /= 100; l /= 100; const k = n => (n + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }

// run(origin, rarity, opts): origin = the doorway on the screen {x, y} and the shrine's on-screen size {w, h}
function run(o, rar, opt = {}) {
  const lite = !!opt.lite, K = lite ? .35 : 1;
  const cv = document.createElement('canvas'); cv.className = 'gfx-cv';
  const DPR = Math.min(1.5, devicePixelRatio || 1); let W = innerWidth, H = innerHeight;
  cv.width = W * DPR; cv.height = H * DPR; document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(DPR, DPR);
  const s = clamp(Math.min(W, H) / 800, .45, 1.6) * (o.w ? clamp(o.w / 520, .6, 1.4) : 1);
  const ur = rar === 'UR', P0 = PAL[rar] || PAL.N;
  const col = (i, t) => ur ? [hslHex((t * .25 + i * 47) % 360, 100, 92), hslHex((t * .25 + i * 47) % 360, 95, 70), hslHex((t * .25 + i * 47 + 40) % 360, 95, 55)] : P0;
  const cx = o.x, cy = o.y;
  const P = [];   // particles
  let last = performance.now(); const t0 = last; let blasted = false, raf = 0, done = false;
  const spawnIn = (t, n) => { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), r = rnd(260, 620) * s;
    P.push({ k: 'in', x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * .8, vx: 0, vy: 0, a, life: 0, max: 2, w: rnd(1.2, 2.6) * s, ci: (Math.random() * 3) | 0, h: Math.random() * 360 }); } };
  const blast = () => {
    blasted = true;
    const n = Math.round(380 * K);
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(500, 1900) * s * (Math.random() < .2 ? 1.4 : 1);
      P.push({ k: 'spark', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .85 - rnd(0, 300) * s, life: 0, max: rnd(.7, 1.6), w: rnd(1.2, 3) * s, ci: (Math.random() * 3) | 0, h: Math.random() * 360 }); }
    for (let i = 0; i < Math.round(150 * K); i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, 420) * s;
      P.push({ k: 'ember', x: cx + rnd(-30, 30) * s, y: cy + rnd(-20, 20) * s, vx: Math.cos(a) * v, vy: Math.sin(a) * v - rnd(80, 260) * s, life: 0, max: rnd(1.4, 2.6), r: rnd(3, 9) * s, ci: (Math.random() * 3) | 0, f: rnd(0, 9), h: Math.random() * 360 }); }
    for (let i = 0; i < Math.round(44 * K); i++) { const a = rnd(0, Math.PI * 2), v = rnd(260, 980) * s;
      P.push({ k: 'petal', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .8 - rnd(100, 380) * s, life: 0, max: rnd(2, 3.2), r: rnd(6, 12) * s, rot: rnd(0, 6.3), vr: rnd(-7, 7), ph: rnd(0, 6.3), vp: rnd(4, 9),
        c: ['#ffd0e2', '#ffffff', '#ffe7a8', '#ffb4cf'][(Math.random() * 4) | 0] }); }
    if (!lite) for (let i = 0; i < 12; i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, 260) * s;
      P.push({ k: 'cloud', x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * .6 - 40 * s, life: 0, max: rnd(1.1, 1.8), r: rnd(90, 160) * s, ci: (Math.random() * 3) | 0, h: Math.random() * 360 }); }
  };
  const ring = (r, lw, a, c, squash = 1) => { g.save(); g.translate(cx, cy); g.scale(1, squash);
    g.globalAlpha = a * .35; g.lineWidth = lw * 3.2; g.strokeStyle = c; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.globalAlpha = a; g.lineWidth = lw; g.strokeStyle = '#fff'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); g.restore(); };
  const seal = (t, grow, a) => {   // the sacred seal on the ground: rings, ticks and the plum crest, turning
    const C = col(0, t), R = 150 * s * grow;
    g.save(); g.translate(cx, cy + 34 * s); g.scale(1, .34); g.globalAlpha = a;
    g.rotate(t * .0012);
    g.strokeStyle = C[1]; g.lineWidth = 2.2 * s; g.beginPath(); g.arc(0, 0, R, 0, 7); g.stroke();
    g.lineWidth = 1.2 * s; g.beginPath(); g.arc(0, 0, R * .9, 0, 7); g.stroke();
    for (let i = 0; i < 48; i++) { const q = i / 48 * Math.PI * 2, l = i % 4 ? .95 : .86; g.beginPath(); g.moveTo(Math.cos(q) * R * .9, Math.sin(q) * R * .9); g.lineTo(Math.cos(q) * R * l * (i % 4 ? 1 : .98), Math.sin(q) * R * l); g.stroke(); }
    g.rotate(-t * .0026);
    g.strokeStyle = C[0]; g.lineWidth = 1.6 * s; g.beginPath(); g.arc(0, 0, R * .62, 0, 7); g.stroke();
    for (let i = 0; i < 5; i++) { const q = i / 5 * Math.PI * 2 - Math.PI / 2; g.beginPath(); g.arc(Math.cos(q) * R * .34, Math.sin(q) * R * .34, R * .19, 0, 7); g.stroke(); }
    g.beginPath(); g.arc(0, 0, R * .12, 0, 7); g.stroke();
    g.beginPath(); for (let i = 0; i <= 5; i++) { const q = i * 2 / 5 * Math.PI * 2 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](Math.cos(q) * R * .62, Math.sin(q) * R * .62); } g.stroke();
    g.restore();
  };
  const frame = now => {
    if (done) return;
    const t = now - t0, dt = Math.min(.05, (now - last) / 1000); last = now;
    if (innerWidth !== W || innerHeight !== H) { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    // the dimming around the shrine (charge), lifting after the blast
    const dim = t < TB ? .55 * ease(t / TB) : .55 * (1 - clamp((t - TB) / 500, 0, 1));
    if (dim > .01) { const vg = g.createRadialGradient(cx, cy, 80 * s, cx, cy, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(4,2,10,${dim})`); g.fillStyle = vg; g.fillRect(0, 0, W, H); }
    g.globalCompositeOperation = 'lighter';
    const C = col(0, t);
    if (t < TB) {
      const k = t / TB;
      spawnIn(t, Math.round((1 + k * k * 9) * K));
      // the doorway's glow
      const gr = (40 + 150 * k * k) * s; g.globalAlpha = .55 + .45 * k; g.drawImage(glow(C[1]), cx - gr, cy - gr, gr * 2, gr * 2);
      g.globalAlpha = .8 * k; const gr2 = gr * .45; g.drawImage(glow(C[0]), cx - gr2, cy - gr2, gr2 * 2, gr2 * 2);
      if (t > 150) seal(t, ease(clamp((t - 150) / 700, 0, 1)), clamp((t - 150) / 400, 0, 1) * (.75 + .25 * Math.sin(t * .02)));
      if (t > 500) { const pk = clamp((t - 500) / 600, 0, 1), pw = (10 + 30 * pk) * s * (1 + .15 * Math.sin(t * .05)), top = cy - (cy + 80) * ease(pk);
        const lg = g.createLinearGradient(cx - pw, 0, cx + pw, 0); lg.addColorStop(0, hexA(C[2], 0)); lg.addColorStop(.3, hexA(C[1], .5)); lg.addColorStop(.5, 'rgba(255,255,255,.95)'); lg.addColorStop(.7, hexA(C[1], .5)); lg.addColorStop(1, hexA(C[2], 0));
        g.globalAlpha = .9; g.fillStyle = lg; g.fillRect(cx - pw, top, pw * 2, cy - top);
        g.globalAlpha = .5; const bw = pw * 3; const lg2 = g.createLinearGradient(cx - bw, 0, cx + bw, 0); lg2.addColorStop(0, hexA(C[2], 0)); lg2.addColorStop(.5, hexA(C[1], .35)); lg2.addColorStop(1, hexA(C[2], 0)); g.fillStyle = lg2; g.fillRect(cx - bw, top, bw * 2, cy - top); }
      if (Math.random() < .5 * K) P.push({ k: 'ember', x: cx + rnd(-220, 220) * s, y: cy + rnd(10, 60) * s, vx: rnd(-20, 20) * s, vy: -rnd(60, 200) * s, life: 0, max: rnd(.8, 1.6), r: rnd(2, 5) * s, ci: 1, f: rnd(0, 9), h: Math.random() * 360 });
    } else {
      if (!blasted) blast();
      const u = (t - TB) / 1000;
      // white-out
      const wo = Math.max(0, 1 - u / .5); if (wo > 0) { g.globalAlpha = wo * wo; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.globalAlpha = wo * .6; g.fillStyle = C[1]; g.fillRect(0, 0, W, H); }
      // the core of the light
      const ca = Math.max(0, 1 - u / 1.1), cr = (180 + 380 * ease(clamp(u / .4, 0, 1))) * s;
      g.globalAlpha = ca; g.drawImage(glow(C[1]), cx - cr, cy - cr, cr * 2, cr * 2); g.globalAlpha = ca * .9; g.drawImage(glow(C[0]), cx - cr * .4, cy - cr * .4, cr * .8, cr * .8);
      // shock rings: two in the air, one along the ground
      if (u < .9) ring(u * 2600 * s, (7 - 6 * u) * s, (1 - u / .9) * .9, C[1]);
      if (u > .08 && u < 1.1) ring((u - .08) * 1700 * s, (5 - 4 * u) * s, (1 - (u - .08) / 1.02) * .7, C[2]);
      if (u < 1.2) ring(u * 1500 * s, (9 - 6 * u) * s, (1 - u / 1.2) * .8, C[1], .28);
      // god rays
      if (u < 1.3) { const ra = (1 - u / 1.3) * .32, L = Math.max(W, H) * 1.2; g.save(); g.translate(cx, cy); g.rotate(u * .35);
        for (let i = 0; i < 16; i++) { const q = i / 16 * Math.PI * 2, wd = (i % 2 ? .05 : .09); g.globalAlpha = ra * (i % 3 ? .7 : 1);
          const lg = g.createLinearGradient(0, 0, Math.cos(q) * L, Math.sin(q) * L); lg.addColorStop(0, C[0]); lg.addColorStop(.4, hexA(C[1], .5)); lg.addColorStop(1, hexA(C[2], 0)); g.fillStyle = lg;
          g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q - wd) * L, Math.sin(q - wd) * L); g.lineTo(Math.cos(q + wd) * L, Math.sin(q + wd) * L); g.closePath(); g.fill(); }
        g.restore(); }
      // the star flare (eight points, turning) and the horizontal lens streak
      if (u < .9) { const fa = (1 - u / .9), fl = (600 + 500 * u) * s; g.save(); g.translate(cx, cy); g.rotate(.4 + u * .6);
        for (let i = 0; i < 8; i++) { const q = i / 8 * Math.PI * 2, len = fl * (i % 2 ? .55 : 1); g.globalAlpha = fa;
          for (const [w, a] of [[10 * s, .25], [4 * s, .6], [1.6 * s, 1]]) { g.globalAlpha = fa * a; g.strokeStyle = a > .9 ? '#fff' : C[1]; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(q) * len, Math.sin(q) * len); g.stroke(); } }
        g.restore();
        g.save(); g.translate(cx, cy); g.scale(7, .16); const lr = 160 * s; g.globalAlpha = fa; g.drawImage(glow(C[1]), -lr, -lr, lr * 2, lr * 2); g.drawImage(glow('#ffffff'), -lr * .5, -lr * .5, lr, lr); g.restore(); }
    }
    // particles
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      const pc = ur ? [hslHex((p.h + t * .3) % 360, 100, 88), hslHex((p.h + t * .3) % 360, 95, 66), hslHex((p.h + t * .3) % 360, 95, 55)] : P0;
      if (p.k === 'in') {
        const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy); if (d < 14 * s || blasted) { P.splice(i, 1); continue; }
        const sp = (300 + 2200 * Math.min(1, p.life * 1.4)) * s; p.vx = dx / d * sp; p.vy = dy / d * sp;
        const ox = p.x, oy = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
        g.globalAlpha = Math.min(1, p.life * 4) * .9; g.strokeStyle = pc[p.ci]; g.lineWidth = p.w; g.lineCap = 'round';
        g.beginPath(); g.moveTo(ox - p.vx * .035, oy - p.vy * .035); g.lineTo(p.x, p.y); g.stroke(); continue; }
      if (p.life >= p.max) { P.splice(i, 1); continue; }
      const lk = p.life / p.max;
      if (p.k === 'spark') {
        const dr = Math.exp(-2.4 * dt); p.vx *= dr; p.vy = p.vy * dr + 620 * s * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        const sp = Math.hypot(p.vx, p.vy), len = Math.min(70 * s, sp * .04);
        g.globalAlpha = (1 - lk) * (1 - lk); g.strokeStyle = lk < .25 ? '#fff' : pc[p.ci]; g.lineWidth = p.w * (1 - lk * .6); g.lineCap = 'round';
        g.beginPath(); g.moveTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len); g.lineTo(p.x, p.y); g.stroke();
      } else if (p.k === 'ember') {
        const dr = Math.exp(-1.2 * dt); p.vx *= dr; p.vy = p.vy * dr - 40 * s * dt; p.x += p.vx * dt + Math.sin(p.life * 3 + p.f) * 12 * s * dt; p.y += p.vy * dt;
        const fl = .6 + .4 * Math.sin(p.life * 18 + p.f), r = p.r * (1 - lk * .5);
        g.globalAlpha = Math.min(1, p.life * 6) * (1 - lk) * fl; g.drawImage(glow(pc[p.ci]), p.x - r * 2, p.y - r * 2, r * 4, r * 4);
      } else if (p.k === 'cloud') {
        const dr = Math.exp(-1.6 * dt); p.vx *= dr; p.vy *= dr; p.x += p.vx * dt; p.y += p.vy * dt; const r = p.r * (1 + 2.4 * ease(lk));
        g.globalAlpha = .28 * (1 - lk); g.drawImage(glow(pc[p.ci]), p.x - r, p.y - r, r * 2, r * 2);
      } else if (p.k === 'petal') {
        const dr = Math.exp(-1.5 * dt); p.vx = p.vx * dr + Math.sin(p.life * 2.2 + p.ph) * 60 * s * dt; p.vy = p.vy * dr + 160 * s * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
        const fl = Math.cos(p.life * p.vp + p.ph);
        g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - lk) * 1.6) * .95; g.translate(p.x, p.y); g.rotate(p.rot); g.scale(fl, 1);
        g.fillStyle = p.c; g.beginPath(); g.moveTo(0, -p.r); g.bezierCurveTo(p.r * .9, -p.r * .7, p.r * .75, p.r * .6, 0, p.r); g.bezierCurveTo(-p.r * .75, p.r * .6, -p.r * .9, -p.r * .7, 0, -p.r); g.fill();
        g.globalAlpha *= .5; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, -p.r * .2, p.r * .22, p.r * .5, 0, 0, 7); g.fill(); g.restore();
        g.globalCompositeOperation = 'lighter';
      }
    }
    // the end: fade the whole canvas out
    if (t > TEND - 600) cv.style.opacity = String(clamp((TEND - t) / 600, 0, 1));
    if (t >= TEND) { stop(); return; }
    raf = requestAnimationFrame(frame);
  };
  const stop = () => { done = true; cancelAnimationFrame(raf); cv.remove(); };
  raf = requestAnimationFrame(frame);
  return { stop, TB };
}
window.GachaFX = { run, TB };
})();
