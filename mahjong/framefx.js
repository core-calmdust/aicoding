// Animated frame effects drawn on a canvas around large character frames.
//   SR  : violet flames licking up from the frame edge
//   SSR : glittering gold — twinkling star sparks along the frame and gold dust rising
//   UR  : rainbow flames + glitter
// One shared loop at ~30fps; frames that are off screen or removed are skipped; html.lite stops everything.
(function (root) {
'use strict';
const PAD = 40;                     // canvas extends this far outside the frame
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

function spawn(it, dt) {
  const P = PAL[it.r], w = it.w, h = it.h, per = 2 * (w + h);
  const scale = Math.min(1.5, Math.max(.45, per / 1500));      // smaller frames get fewer / smaller particles
  const emit = (rate, make) => { let n = rate * dt; while (n > 0) { if (Math.random() < n) it.ps.push(make()); n -= 1; } };
  if (P.flame) {
    // flame tongues: born on the frame edge, rising and leaning outward
    emit(240 * scale * P.rate, () => {
      const q = perim(w, h, Math.random());
      const out = rnd(6, 22);
      return { k: 'f', x: q.x + q.nx * rnd(-2, 3), y: q.y + q.ny * rnd(-2, 3), vx: q.nx * out + rnd(-8, 8), vy: q.ny * out * .6 - rnd(40, 90),
        life: 0, max: rnd(.4, .85), s: rnd(5, 13) * scale + 3, hue: Math.random() * 360, wob: Math.random() * 6 };
    });
  }
  if (P.glitter) {
    // twinkling star sparks on the frame
    emit(55 * scale * P.rate, () => {
      const q = perim(w, h, Math.random()), o = rnd(-4, 8);
      return { k: 'g', x: q.x + q.nx * o, y: q.y + q.ny * o, vx: q.nx * rnd(0, 6), vy: q.ny * rnd(0, 6) - rnd(2, 10),
        life: 0, max: rnd(.5, 1.1), s: (rnd(4, 10) * scale + 2), c: P.glitter[(Math.random() * P.glitter.length) | 0], rot: rnd(-.3, .3) };
    });
    // gold dust drifting up
    emit(16 * scale, () => ({ k: 'd', x: rnd(-6, w + 6), y: h + rnd(-6, 6), vx: rnd(-8, 8), vy: -rnd(25, 60), life: 0, max: rnd(1.2, 2.4), s: rnd(1, 2.4), c: it.r === 'UR' ? '255,200,250' : '255,214,110' }));
    // comets of light running around the frame, shedding glitter
    if (!it.comets) it.comets = [{ t: Math.random(), v: .16 }, { t: Math.random(), v: .16 }];
    for (const cm of it.comets) {
      cm.t = (cm.t + cm.v * dt) % 1;
      const q = perim(w, h, cm.t);
      it.ps.push({ k: 'c', x: q.x, y: q.y, vx: 0, vy: 0, life: 0, max: .28, s: 14 * scale + 6, c: P.glitter[1] });
      if (Math.random() < 0.6) it.ps.push({ k: 'g', x: q.x + rnd(-4, 4), y: q.y + rnd(-4, 4), vx: q.nx * rnd(4, 16), vy: q.ny * rnd(4, 16) - rnd(4, 14), life: 0, max: rnd(.4, .8), s: rnd(3, 7) * scale + 1.5, c: P.glitter[(Math.random() * P.glitter.length) | 0], rot: 0 });
    }
  }
  if (it.ps.length > 700) it.ps.splice(0, it.ps.length - 700);
}

// 4-ray star with long thin flares
function star(g, x, y, r, rot, col, a) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const glow = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
  glow.addColorStop(0, `rgba(${col},${a * .9})`); glow.addColorStop(1, `rgba(${col},0)`);
  g.fillStyle = glow; g.beginPath(); g.arc(0, 0, r * 1.2, 0, Math.PI * 2); g.fill();
  g.fillStyle = `rgba(255,255,255,${a})`;
  g.beginPath();
  for (let i = 0; i < 4; i++) {
    const L = i % 2 ? r * 1.0 : r * 2.0, an = i * Math.PI / 2;
    g.lineTo(Math.cos(an) * L, Math.sin(an) * L);
    g.lineTo(Math.cos(an + Math.PI / 4) * r * .16, Math.sin(an + Math.PI / 4) * r * .16);
  }
  g.closePath(); g.fill(); g.restore();
}

function flameColor(P, p, k) {
  if (P.flame === 'rainbow') { const h = (p.hue + k * 90) % 360; return [`hsla(${h},100%,92%,${.55 * (1 - k)})`, `hsla(${h},100%,62%,${.45 * (1 - k)})`, `hsla(${(h + 40) % 360},100%,50%,0)`]; }
  const f = P.flame;
  return [`rgba(255,250,240,${(1 - k) * .5})`, `rgba(${f[1]},${.45 * (1 - k)})`, `rgba(${f[3]},0)`];
}

function draw(it, dt) {
  const g = it.ctx, P = PAL[it.r];
  g.setTransform(it.dpr, 0, 0, it.dpr, PAD * it.dpr, PAD * it.dpr);
  g.clearRect(-PAD, -PAD, it.w + PAD * 2, it.h + PAD * 2);
  g.globalCompositeOperation = 'lighter';
  if (P.flame) {             // soft burning band hugging the frame
    const t = performance.now() / 1000;
    g.lineWidth = 10; g.lineJoin = 'round';
    g.strokeStyle = P.flame === 'rainbow' ? `hsla(${(t * 80) % 360},100%,70%,.28)` : `rgba(${P.flame[2]},${.26 + .08 * Math.sin(t * 9)})`;
    g.strokeRect(-2, -2, it.w + 4, it.h + 4);
  }
  const keep = [];
  for (const p of it.ps) {
    p.life += dt;
    if (p.life >= p.max) continue;
    keep.push(p);
    const k = p.life / p.max;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.k === 'f') {
      p.vx *= .94; p.vy -= 30 * dt; p.x += Math.sin(p.life * 14 + p.wob) * 12 * dt;
      const r = p.s * (1 - k * .6), len = r * (2.6 + k * 1.4);
      const [c0, c1, c2] = flameColor(P, p, k);
      // teardrop: round base, tip pointing along the motion (mostly up)
      const ang = Math.atan2(p.vy, p.vx) + Math.PI / 2;
      g.save(); g.translate(p.x, p.y); g.rotate(ang);
      const gr = g.createLinearGradient(0, r, 0, -len);
      gr.addColorStop(0, c0); gr.addColorStop(.35, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(0, -len);
      g.bezierCurveTo(r * .9, -len * .45, r * 1.1, r * .3, 0, r);
      g.bezierCurveTo(-r * 1.1, r * .3, -r * .9, -len * .45, 0, -len);
      g.fill(); g.restore();
    } else if (p.k === 'g') {
      const a = Math.max(0, Math.sin(k * Math.PI) * (.75 + .25 * Math.sin(p.life * 30)));
      star(g, p.x, p.y, p.s * (.5 + .7 * Math.sin(k * Math.PI)), p.rot, p.c, a);
    } else if (p.k === 'c') {
      const a = 1 - k, r = p.s * (1 - k * .5);
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(.3, `rgba(${p.c},${a * .8})`); gr.addColorStop(1, `rgba(${p.c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
    } else {
      p.x += Math.sin(p.life * 3 + p.s) * 6 * dt;
      g.fillStyle = `rgba(${p.c},${Math.sin(k * Math.PI) * .9})`;
      g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill();
    }
  }
  it.ps = keep;
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
