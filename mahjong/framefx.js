// Animated frame effects drawn on a canvas around large character frames.
//   SR  : violet flames licking up from the frame edge
//   SSR : glittering gold — twinkling star sparks along the frame and gold dust rising
//   UR  : rainbow flames + glitter
// One shared loop at ~30fps; frames that are off screen or removed are skipped; html.lite stops everything.
(function (root) {
'use strict';
const PAD = 44;                     // canvas extends this far outside the frame
const items = new Set();
let running = false, last = 0;

function rnd(a, b) { return a + Math.random() * (b - a); }

// point on the rounded-rect perimeter, t in [0,1); returns position and outward normal
function perim(w, h, t) {
  const L = 2 * (w + h); let d = t * L;
  if (d < w) return { x: d, y: 0, nx: 0, ny: -1 };
  d -= w; if (d < h) return { x: w, y: d, nx: 1, ny: 0 };
  d -= h; if (d < w) return { x: w - d, y: h, nx: 0, ny: 1 };
  d -= w; return { x: 0, y: h - d, nx: -1, ny: 0 };
}

const PAL = {
  SR: { flame: ['255,255,255', '226,170,255', '170,100,255', '110,60,230'], glitter: null, rate: 1.0 },
  SSR: { flame: null, glitter: ['255,255,255', '255,236,160', '255,207,74', '255,170,40'], rate: 1.0 },
  UR: { flame: 'rainbow', glitter: ['255,255,255', '255,220,250', '200,240,255'], rate: 1.2 },
};

function attach(el, rarity) {
  if (!PAL[rarity] || !el) return;
  for (const it of items) if (it.el === el) { if (it.r === rarity) return; detach(el); }
  const cv = document.createElement('canvas');
  cv.className = 'ffx';
  el.appendChild(cv);
  const it = { el, cv, ctx: cv.getContext('2d'), r: rarity, ps: [], w: 0, h: 0, dpr: 1 };
  items.add(it);
  if (!running) { running = true; requestAnimationFrame(loop); }
}
function detach(el) { for (const it of items) if (it.el === el) { it.cv.remove(); items.delete(it); } }

function size(it) {
  const w = it.el.clientWidth, h = it.el.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  if (w !== it.w || h !== it.h || dpr !== it.dpr) {
    it.w = w; it.h = h; it.dpr = dpr;
    it.cv.width = Math.round((w + PAD * 2) * dpr); it.cv.height = Math.round((h + PAD * 2) * dpr);
  }
  return w > 0 && h > 0;
}

// Two layers: a quarter-resolution "glow" buffer scaled up (soft, translucent flame and light), and a crisp layer
// on top for a few fine details (ember sparks, star cores and flares).
const LO = 4;
function spawn(it, dt) {
  const P = PAL[it.r], w = it.w, h = it.h, per = 2 * (w + h);
  const scale = Math.min(1.4, Math.max(.45, per / 1500));
  const emit = (rate, make) => { let n = rate * dt; while (n > 0) { if (Math.random() < n) it.ps.push(make()); n -= 1; } };
  if (P.flame) {
    // soft flame puffs born just outside the frame edge; they rise, stretch and fade
    emit(120 * scale * P.rate, () => {
      const t = Math.random(), q = perim(w, h, t);
      const side = q.ny < 0 ? 1.2 : q.ny > 0 ? .55 : 1;      // taller on the top edge, low on the bottom
      return { k: 'f', x: q.x + q.nx * rnd(5, 12), y: q.y + q.ny * rnd(5, 12), vx: q.nx * rnd(6, 16) + rnd(-5, 5), vy: q.ny * rnd(3, 10) - rnd(30, 60) * side,
        life: 0, max: rnd(.5, .95), s: (rnd(6, 12) * scale + 4) * side, hue: Math.random() * 360, wob: Math.random() * 6 };
    });
    // a few crisp embers
    emit(5 * scale, () => { const q = perim(w, h, Math.random()); return { k: 'e', x: q.x + q.nx * 4, y: q.y + q.ny * 4, vx: q.nx * rnd(8, 22) + rnd(-10, 10), vy: -rnd(40, 90), life: 0, max: rnd(.7, 1.4), s: rnd(.8, 1.6), hue: Math.random() * 360 }; });
  }
  if (P.glitter) {
    emit(16 * scale * P.rate, () => {
      const q = perim(w, h, Math.random()), o = rnd(-2, 5);
      return { k: 'g', x: q.x + q.nx * o, y: q.y + q.ny * o, vx: rnd(-2, 2), vy: -rnd(1, 6), life: 0, max: rnd(.7, 1.4), s: rnd(3, 8) * scale + 2,
        c: P.glitter[(Math.random() * P.glitter.length) | 0], rot: rnd(-.25, .25) };
    });
    emit(12 * scale, () => ({ k: 'd', x: rnd(0, w), y: h + rnd(-4, 4), vx: rnd(-6, 6), vy: -rnd(18, 40), life: 0, max: rnd(1.4, 2.6), s: rnd(.8, 1.6), c: it.r === 'UR' ? '255,215,250' : '255,220,140' }));
    if (!it.comets) it.comets = [{ t: Math.random(), v: .13 }, { t: Math.random(), v: .13 }];
    for (const cm of it.comets) {
      cm.t = (cm.t + cm.v * dt) % 1;
      const q = perim(w, h, cm.t);
      it.ps.push({ k: 'c', x: q.x, y: q.y, vx: 0, vy: 0, life: 0, max: .45, s: 16 * scale + 8, c: P.glitter[2] });
      if (Math.random() < .35) it.ps.push({ k: 'g', x: q.x + rnd(-3, 3), y: q.y + rnd(-3, 3), vx: q.nx * rnd(2, 8), vy: q.ny * rnd(2, 8) - rnd(2, 8), life: 0, max: rnd(.5, .9), s: rnd(2.5, 5) * scale + 1.5, c: P.glitter[(Math.random() * P.glitter.length) | 0], rot: 0 });
    }
  }
  if (it.ps.length > 600) it.ps.splice(0, it.ps.length - 600);
}

function flameRGB(P, p, k) {
  if (P.flame === 'rainbow') { const h = (p.hue + k * 90) % 360; return [`hsla(${h},100%,90%,`, `hsla(${h},95%,62%,`]; }
  return [`rgba(${P.flame[1]},`, `rgba(${P.flame[3]},`];
}

function draw(it, dt) {
  const P = PAL[it.r], W = it.w + PAD * 2, H = it.h + PAD * 2;
  // low-res glow buffer
  if (!it.lo) { it.lo = document.createElement('canvas'); it.lg = it.lo.getContext('2d'); }
  const lw = Math.max(1, Math.round(W / LO)), lh = Math.max(1, Math.round(H / LO));
  if (it.lo.width !== lw || it.lo.height !== lh) { it.lo.width = lw; it.lo.height = lh; }
  const L = it.lg;
  L.setTransform(1 / LO, 0, 0, 1 / LO, PAD / LO, PAD / LO);
  L.globalCompositeOperation = 'source-over';
  L.clearRect(-PAD, -PAD, W, H);
  L.globalCompositeOperation = 'lighter';
  const t = performance.now() / 1000;
  if (P.flame) {        // faint breathing aura band
    L.lineWidth = 14;
    L.strokeStyle = P.flame === 'rainbow' ? `hsla(${(t * 60) % 360},100%,70%,.18)` : `rgba(${P.flame[2]},${.12 + .04 * Math.sin(t * 5)})`;
    L.strokeRect(-3, -3, it.w + 6, it.h + 6);
  }
  const g = it.ctx;
  g.setTransform(it.dpr, 0, 0, it.dpr, PAD * it.dpr, PAD * it.dpr);
  g.globalCompositeOperation = 'source-over';
  g.clearRect(-PAD, -PAD, W, H);

  const keep = [], crisp = [];
  for (const p of it.ps) {
    p.life += dt;
    if (p.life >= p.max) continue;
    keep.push(p);
    const k = p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'f') {
      p.vx *= .95; p.vy -= 24 * dt; p.x += Math.sin(p.life * 9 + p.wob) * 10 * dt;
      const r = p.s * (1 - k * .55), a = Math.sin(Math.min(1, k * 3) * Math.PI / 2) * (1 - k);
      const [c1, c2] = flameRGB(P, p, k);
      L.save(); L.translate(p.x, p.y); L.scale(1, 1.7);
      const gr = L.createRadialGradient(0, 0, 0, 0, 0, r);
      gr.addColorStop(0, `rgba(255,248,255,${.4 * a})`); gr.addColorStop(.35, c1 + (.3 * a) + ')'); gr.addColorStop(1, c2 + '0)');
      L.fillStyle = gr; L.beginPath(); L.arc(0, 0, r, 0, Math.PI * 2); L.fill(); L.restore();
    } else if (p.k === 'c') {
      const a = 1 - k, r = p.s * (1 - k * .4);
      const gr = L.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, `rgba(255,255,255,${.55 * a})`); gr.addColorStop(.4, `rgba(${p.c},${.35 * a})`); gr.addColorStop(1, `rgba(${p.c},0)`);
      L.fillStyle = gr; L.beginPath(); L.arc(p.x, p.y, r, 0, Math.PI * 2); L.fill();
    } else if (p.k === 'g') {
      const a = Math.max(0, Math.sin(k * Math.PI)) * (.7 + .3 * Math.sin(p.life * 26 + p.rot * 9));
      const gr = L.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 2.4);
      gr.addColorStop(0, `rgba(${p.c},${.35 * a})`); gr.addColorStop(1, `rgba(${p.c},0)`);
      L.fillStyle = gr; L.beginPath(); L.arc(p.x, p.y, p.s * 2.4, 0, Math.PI * 2); L.fill();
      crisp.push([p, a]);
    } else {
      crisp.push([p, 0]);
    }
  }
  it.ps = keep;
  // composite the soft layer (smoothing upscales it into a soft blur)
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.globalCompositeOperation = 'lighter';
  g.drawImage(it.lo, -PAD, -PAD, W, H);
  // keep the character art clear: effects live outside the frame and only creep a few px over its edge
  g.globalCompositeOperation = 'destination-out';
  const E = 10;
  g.fillStyle = 'rgba(0,0,0,.92)'; g.fillRect(E, E, it.w - E * 2, it.h - E * 2);
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, 0, E, 0, 0, it.w, E], [0, it.h, 0, it.h - E, 0, it.h - E, it.w, E], [0, 0, E, 0, 0, E, E, it.h - E * 2], [it.w, 0, it.w - E, 0, it.w - E, E, E, it.h - E * 2]]) {
    const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.92)');
    g.fillStyle = lg; g.fillRect(rx, ry, rw, rh);
  }
  g.globalCompositeOperation = 'lighter';
  // crisp details
  for (const [p, a0] of crisp) {
    const k = p.life / p.max;
    if (p.k === 'g') {
      const a = a0 * .85, r = p.s * (.6 + .6 * Math.sin(k * Math.PI));
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
      const lg = g.createLinearGradient(-r * 2.2, 0, r * 2.2, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(.5, `rgba(255,255,255,${a})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(-r * 2.2, -.6, r * 4.4, 1.2);
      const vg = g.createLinearGradient(0, -r * 1.3, 0, r * 1.3);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(.5, `rgba(255,255,255,${a * .8})`); vg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = vg; g.fillRect(-.6, -r * 1.3, 1.2, r * 2.6);
      g.fillStyle = `rgba(255,255,255,${a})`; g.beginPath(); g.arc(0, 0, Math.max(.8, r * .14), 0, Math.PI * 2); g.fill();
      g.restore();
    } else if (p.k === 'e') {
      const a = (1 - k) * .9;
      const col = P.flame === 'rainbow' ? `hsla(${p.hue},100%,85%,${a})` : `rgba(240,215,255,${a})`;
      g.strokeStyle = col; g.lineWidth = p.s; g.lineCap = 'round';
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .04, p.y - p.vy * .04); g.stroke();
    } else if (p.k === 'd') {
      g.fillStyle = `rgba(${p.c},${Math.sin(k * Math.PI) * .7})`;
      g.beginPath(); g.arc(p.x + Math.sin(p.life * 3 + p.s * 9) * 3, p.y, p.s, 0, Math.PI * 2); g.fill();
    }
  }
}

function loop(now) {
  if (!items.size) { running = false; return; }
  requestAnimationFrame(loop);
  if (now - last < 33) return;              // ~30fps
  const dt = Math.min(.05, (now - last) / 1000 || .033); last = now;
  if (document.hidden || document.documentElement.classList.contains('lite')) return;
  for (const it of [...items]) {
    if (!it.el.isConnected) { items.delete(it); continue; }
    if (!it.el.offsetParent || !size(it)) continue;      // not on screen
    spawn(it, dt); draw(it, dt);
  }
}

root.FrameFX = { attach, detach, scan(rootEl) {
  (rootEl || document).querySelectorAll('.pimg.frame, .ch-art.frame, .gc.frame, .ag-art.frame').forEach(el => {
    const m = /fr-(SR|SSR|UR)\b/.exec(el.className);
    if (m) attach(el, m[1]); else detach(el);
  });
} };
})(window);
