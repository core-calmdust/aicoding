/* 狼影灯 — 演出（シネマ）：カメラ・光・粒子・狼の疾走
   話す人へカメラが寄り（ほかの人はピントが外れる）、灯りがその人を照らす。地の文はゆっくり押し込む。
   集会・投票・選択肢の画面では使わない（遊びやすさ優先）。設定の「アニメーション」か「演出」を切ると止まる。 */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  let cam, shade, bloom, grain, cv, cx, wx = null;
  let mode = 'reset', focusEl = null, timers = [];
  let enabledPref = true;
  const reduce = () => document.body.classList.contains('anim-off');
  const active = () => enabledPref && !reduce();

  function init() {
    const st = $('stage'); if (!st || $('cam')) return;
    cam = document.createElement('div'); cam.id = 'cam';
    for (const id of ['scene', 'floor', 'cast', 'fx']) { const e = $(id); if (e) cam.appendChild(e); }
    st.insertBefore(cam, $('roster'));
    shade = document.createElement('div'); shade.id = 'cineShade'; st.insertBefore(shade, $('roster'));
    bloom = document.createElement('div'); bloom.id = 'cineBloom'; st.insertBefore(bloom, $('roster'));
    cv = document.createElement('canvas'); cv.id = 'cineSky'; st.insertBefore(cv, $('roster')); cx = cv.getContext('2d');
    grain = document.createElement('div'); grain.id = 'cineGrain'; st.insertBefore(grain, $('roster'));
    // film grain: a few noise tiles made once
    const tiles = []; for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() < .5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.random() * 70; } g.putImageData(im, 0, 0); tiles.push(c.toDataURL()); }
    grain.style.setProperty('--g0', `url(${tiles[0]})`); grain.style.setProperty('--g1', `url(${tiles[1]})`); grain.style.setProperty('--g2', `url(${tiles[2]})`); grain.style.setProperty('--g3', `url(${tiles[3]})`);
    // if the stage changes size (the text box opening, a phone rotating), keep the picture inside it, gently
    if (window.ResizeObserver) new ResizeObserver(() => { if (mode === 'on' && cam) { const v = view(), o = clampShot({ ...cur }, v), n = clampShot({ ...now() }, v), m = now(); if (Math.abs(o.x - cur.x) + Math.abs(o.y - cur.y) > 1 || Math.abs(n.x - m.x) + Math.abs(n.y - m.y) > 1) glide(o, 1400); lastTarget = null; } }).observe($('stage'));
    addEventListener('resize', () => { if (mode !== 'reset') { lastTarget = null; } sizeSky(); });
    sizeSky(); requestAnimationFrame(tick);
  }

  /* ---------- the camera: calm ----------
     One gentle frame for the whole scene. It never cuts and never snaps: every move starts from where the
     camera is now and glides (2.6 s). The speaker is shown by the light and the focus, not by the camera;
     the camera only leans a little toward the voice, and only when that changes the frame enough to matter.
     A new place gets one slow settle from slightly higher. Menus ease back to the full stage. */
  let anim = null, par = [], castAt = 0, sceneAt = 0, cur = { s: 1, x: 0, y: 0 }, lastTarget = null;
  function view() {
    const st = $('stage').getBoundingClientRect(), dock = $('dock');
    let vb = st.height;
    if (dock && !dock.classList.contains('hide')) { const d = dock.getBoundingClientRect(); if (d.top > st.top + 80 && d.top < st.bottom) vb = d.top - st.top; }
    return { w: st.width, h: st.height, vb, phone: !matchMedia('(min-width:1040px)').matches };
  }
  // where an element will stand once it stops sliding, in the camera's own coordinates (a hidden copy, no transition)
  function finalRect(el) {
    const probe = el.cloneNode(true); probe.style.transition = 'none'; probe.style.visibility = 'hidden';
    probe.querySelectorAll('*').forEach(e => { e.style.transition = 'none'; e.style.animation = 'none'; });
    el.parentNode.appendChild(probe);
    const p = probe.querySelector('.pup') || probe, r = p.getBoundingClientRect(), c = $('stage').getBoundingClientRect();
    const m = new DOMMatrix(getComputedStyle(cam).transform), inv = m.inverse();
    const a = inv.transformPoint(new DOMPoint(r.left - c.left, r.top - c.top)), d = inv.transformPoint(new DOMPoint(r.right - c.left, r.bottom - c.top));
    probe.remove();
    return { x: a.x, y: a.y, w: d.x - a.x, h: d.y - a.y };
  }
  const clampShot = (o, v) => { const s = o.s; o.x = Math.min(-1, Math.max(v.w - s * v.w + 1, o.x)); o.y = Math.min(-1, Math.max(v.h - s * v.h + 1, o.y)); if (s <= 1.0005) { o.x = 0; o.y = 0; o.s = 1; } return o; };
  const T = o => `translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px) scale(${o.s.toFixed(4)})`;
  function now() { const m = new DOMMatrix(getComputedStyle(cam).transform); return { s: Math.hypot(m.a, m.b) || 1, x: m.e, y: m.f }; }
  // glide from wherever the camera is to o
  const ease = t => { // same shape as cubic-bezier(.45,.05,.25,1), smooth start and end
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function glide(o, dur) {
    const from = now(), v = view();
    if (anim) anim.cancel();
    cam.style.transform = T(from);
    // sampled keyframes, each kept inside the stage, so the edge of the picture never shows mid-move
    const ks = [];
    for (let i = 0; i <= 24; i++) { const k = ease(i / 24); ks.push({ transform: T(clampShot({ s: from.s + (o.s - from.s) * k, x: from.x + (o.x - from.x) * k, y: from.y + (o.y - from.y) * k }, v)) }); }
    anim = cam.animate(ks, { duration: dur, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => { cam.style.transform = T(o); };
    cur = o;
    // the far and middle backdrop lag behind (parallax), also from where they are now
    par.forEach(p => p.cancel()); par = [];
    for (const [sel, f] of [['svg.scn.cine-far', .45], ['svg.scn.cine-mid', .22]]) {
      const g = document.querySelector('#scene ' + sel); if (!g) continue;
      const m = new DOMMatrix(getComputedStyle(g).transform), tx = -(o.x + (o.s - 1) * 0) / o.s * f, ty = -o.y / o.s * f;
      g.style.transform = `translate(${m.e.toFixed(1)}px,${m.f.toFixed(1)}px)`;
      const a2 = g.animate([{ transform: `translate(${m.e.toFixed(1)}px,${m.f.toFixed(1)}px)` }, { transform: `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)` }], { duration: dur, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' });
      a2.onfinish = () => { g.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`; };
      par.push(a2);
    }
    document.body.classList.toggle('cine-on', o.s > 1.001);
  }
  function light(sx, sy, k) {
    shade.style.setProperty('--lx', sx + 'px'); shade.style.setProperty('--ly', sy + 'px'); shade.style.opacity = k;
    bloom.style.setProperty('--lx', sx + 'px'); bloom.style.setProperty('--ly', sy + 'px');
    bloom.style.opacity = document.body.classList.contains('night') ? k * .35 : k * .8;
  }
  // the frame for this page: the group on stage, leaning toward the speaker
  function frame(o) {
    const v = view(), cast = [...document.querySelectorAll('#cast .pp')].filter(e => e.style.opacity !== '0');
    const rects = cast.map(finalRect);
    let s = v.phone ? 1.1 : 1.14, cx = v.w / 2, cyHead = v.vb * .5;
    if (rects.length) {
      const L = Math.min(...rects.map(r => r.x)), R = Math.max(...rects.map(r => r.x + r.w));
      const heads = rects.map(r => r.y + r.h * .2), headY = heads.reduce((a, b) => a + b, 0) / heads.length;
      cx = (L + R) / 2; cyHead = headY;
      // keep the whole group in the picture: zoom no closer than the group allows
      s = Math.max(1.06, Math.min(s, (v.w * .92) / Math.max(1, R - L)));
    }
    let lx = null, ly = null;
    if (o.el) {
      const r = finalRect(o.el), sx = r.x + r.w / 2;
      cx = cx * .7 + sx * .3;   // lean toward the voice, but keep the room
      s = Math.min(s * 1.02, v.phone ? 1.14 : 1.17);
      lx = sx; ly = r.y + r.h * .22;
    }
    const target = clampShot({ s, x: v.w / 2 - s * cx, y: v.vb * .42 - s * cyHead, }, v);
    return { target, lx, ly, v };
  }
  function shoot(o) {
    const night = document.body.classList.contains('night');
    const { target, lx, ly, v } = frame(o);
    const fresh = performance.now() - sceneAt < 1800;
    // the light finds the speaker (it moves smoothly: see the @property in the CSS)
    if (lx != null) light(target.x + target.s * lx, target.y + target.s * ly, .66);
    else light(v.w * .5, v.vb * .4, .5);
    document.querySelectorAll('#cast .pp').forEach(e => e.classList.toggle('cine-dim', !!o.el && e !== o.el && !e.classList.contains('fallen')));
    if (fresh) {   // a new place: start a little higher and wider, settle down slowly
      sceneAt = 0; glide(target, 4200); lastTarget = target; return;
    }
    // only move when the frame would change enough to notice; otherwise stay still
    const d = lastTarget ? Math.hypot(target.x - lastTarget.x, target.y - lastTarget.y) / v.w + Math.abs(target.s - lastTarget.s) * 2 : 1;
    if (d < .08) return;
    glide(target, 3200); lastTarget = target;
  }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  function page(o) {
    if (!cam) init();
    if (!active() || o.wide) return reset();
    clear(); mode = 'on'; focusEl = o.el || null;
    timers.push(setTimeout(() => shoot(o), 40));
  }
  // a choice is on screen: keep the picture where it is, just let the light and focus relax
  function rest() {
    if (!cam) init();
    if (mode !== 'on' || !active()) return reset();
    clear(); focusEl = null;
    timers.push(setTimeout(() => shoot({ el: null }), 40));
  }
  function reset() {
    if (!cam) init();
    clear(); focusEl = null;
    document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
    const v = view();
    if (mode !== 'reset' && active()) glide({ s: 1, x: 0, y: 0 }, 1600);   // ease back, never snap
    else { if (anim) anim.cancel(); par.forEach(p => p.cancel()); cam.style.transform = ''; document.querySelectorAll('#scene svg.scn').forEach(g => g.style.transform = ''); document.body.classList.remove('cine-on'); }
    mode = 'reset'; lastTarget = null;
    light(v.w * .5, v.vb * .42, .32);
  }
  function cast() { castAt = performance.now(); }
  function scene() { sceneAt = performance.now(); lastTarget = null; }
  function shake() {}
  // a very small lift of the speaker on each syllable
  function blip() {
    if (!active() || !focusEl) return;
    const p = focusEl.querySelector('.pup'); if (!p || !p.animate) return;
    p.animate([{ translate: '0 0' }, { translate: '0 -2px' }, { translate: '0 0' }], { duration: 120, easing: 'ease-out' });
  }
  function layer() {
    const sc = $('scene'), svg = sc && sc.querySelector('svg.scn:not(.cine-far):not(.cine-mid)'); if (!svg || sc.querySelector('.cine-far')) return;
    for (const k of ['far', 'mid']) { const c2 = svg.cloneNode(true); c2.classList.add('cine-' + k); sc.insertBefore(c2, svg); }
    svg.classList.add('cine-near');
  }

  /* ---------- the weather on the screen: snow (mountains, the abbey) or motes in the lamplight ---------- */
  const flakes = [];
  function sizeSky() { if (!cv) return; const r = $('stage').getBoundingClientRect(), d = 1; /* soft flakes need no retina pixels */ cv.width = r.width * d; cv.height = r.height * d; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; cx.setTransform(d, 0, 0, d, 0, 0); }
  function weather(kind, night) {
    if (!cv) init();
    if (wx === kind + night) return; wx = kind + night;
    flakes.length = 0;
    const r = $('stage').getBoundingClientRect();
    const n = kind === 'snow' ? (night ? 150 : 110) : kind === 'motes' ? 46 : 0;
    for (let i = 0; i < n; i++) { const d = Math.random(); flakes.push({ x: Math.random() * r.width, y: Math.random() * r.height, d, a: Math.random() * 6.3 }); }
    cv.dataset.kind = kind || ''; cv.classList.toggle('night', !!night);
  }
  let last = 0;
  function tick(t) {
    requestAnimationFrame(tick);
    if (!cx || t - last < 33 || document.body.classList.contains('th-on')) return; const dt = Math.min(.1, (t - last) / 1000); last = t;
    const r = cv.getBoundingClientRect(); cx.clearRect(0, 0, r.width, r.height);
    if (!flakes.length || reduce() || document.body.classList.contains('paused') || document.hidden || !document.body.classList.contains('scr-play')) return;
    const snow = cv.dataset.kind === 'snow', night = cv.classList.contains('night');
    for (const f of flakes) {
      if (snow) { f.y += (18 + f.d * 70) * dt; f.x += Math.sin(t / 1400 + f.a) * (6 + f.d * 18) * dt + 8 * dt; }
      else { f.y -= (3 + f.d * 7) * dt; f.x += Math.sin(t / 2600 + f.a) * 6 * dt; }
      if (f.y > r.height + 10) { f.y = -10; f.x = Math.random() * r.width; }
      if (f.y < -10) { f.y = r.height + 10; f.x = Math.random() * r.width; }
      if (f.x > r.width + 10) f.x = -10;
      const s = snow ? .8 + f.d * f.d * 3.2 : 1 + f.d * 1.6;
      cx.globalAlpha = snow ? (night ? .5 + f.d * .4 : .35 + f.d * .4) : .18 + .22 * Math.sin(t / 900 + f.a) ** 2;
      cx.fillStyle = snow ? (night ? '#e8eeff' : '#fffaf0') : '#ffe7b8';
      cx.beginPath(); cx.arc(f.x, f.y, s, 0, 6.283); cx.fill();
    }
    cx.globalAlpha = 1;
  }

  /* ---------- the wolf at night: a real gallop, and a second shadow passing right before the eye ---------- */
  function runSVG(ph, wolfD) {
    const s = Math.sin, d = 180 / Math.PI;
    const leg = (px, py, a1, a2, L1, L2, w1, w2) => { const sg = (L, a, b) => `M${-a / 2},0 L${a / 2},0 L${b / 2},${L} L${-b / 2},${L} Z`; return `<g transform="translate(${px} ${py}) rotate(${a1.toFixed(1)})"><path d="${sg(L1, w1, w2)}"/><circle r="${w1 / 2}"/><g transform="translate(0 ${L1}) rotate(${a2.toFixed(1)})"><circle r="${w2 / 2}"/><path d="${sg(L2, w2, w2 * .7)}"/><ellipse cx="-2" cy="${L2}" rx="${w2 * .7}" ry="${w2 * .4}"/></g></g>`; };
    const hb = 44 * s(ph), hb2 = 44 * s(ph - .45), fb = 52 * s(ph + Math.PI * .9), fb2 = 52 * s(ph + Math.PI * .9 - .45);
    const hk = a => -35 - 25 * Math.max(0, s(a + 1.3)), fk = a => 10 + 55 * Math.max(0, s(a - .6));
    const legs = (b, x, y, back) => `<ellipse cx="${x}" cy="${y - 4}" rx="${back ? 24 : 17}" ry="${back ? 22 : 18}" transform="rotate(${(b * .5).toFixed(1)} ${x} ${y})"/>` + leg(x, y, b, back ? hk(b / d) : fk(b / d), back ? 30 : 28, back ? 32 : 30, back ? 24 : 18, back ? 12 : 11);
    return `<svg class="wolfsil" viewBox="-20 -20 340 210" style="overflow:visible"><defs><clipPath id="cineBody"><rect x="-20" y="-20" width="340" height="141"/></clipPath></defs><g fill="currentColor" transform="rotate(${(3.5 * s(ph + .6)).toFixed(2)} 150 100)"><g opacity=".85">${legs(hb2, 100, 112, 1)}${legs(fb2, 205, 108, 0)}</g><path d="${wolfD}" clip-path="url(#cineBody)"/><path d="M64,100 C80,126 190,128 212,104 L206,96 L70,92 Z"/>${legs(hb, 92, 114, 1)}${legs(fb, 212, 104, 0)}<circle cx="242" cy="52" r="2.6" class="eye"/></g></svg>`;
  }
  // replaces the stiff cut-out with a galloping wolf for the plain run; resolves when it is gone (2.9 s)
  function run(fx, wolfHTML) {
    if (!cam) init();
    const D = (wolfHTML.match(/ d="([^"]+)"/) || [])[1];
    if (!active() || !D) return null;
    const d = document.createElement('div'); d.className = 'run cine-gallop'; fx.appendChild(d);
    const lens = document.createElement('div'); lens.className = 'cine-lens'; $('stage').insertBefore(lens, $('roster'));
    const t0 = performance.now();
    return new Promise(res => {
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        if (t > 2.9) { d.remove(); lens.remove(); res(); return; }
        if (!document.body.classList.contains('paused')) {
          d.innerHTML = runSVG(t * 15.5, D);
          const q = (t - 1.7) / .75;
          if (q > 0 && q < 1) { lens.style.display = 'block'; lens.innerHTML = runSVG(t * 15.5 + 1, D); lens.style.left = (-110 + q * 180) + 'vw'; }
          else lens.style.display = 'none';
        }
        requestAnimationFrame(step);
      };
      step();
    });
  }

  root.WLCine = { init, page, rest, reset, blip, weather, run, cast, scene, shake, layer, set enabled(v) { enabledPref = !!v; if (!v && cam) reset(); }, get enabled() { return enabledPref; } };
})(window);
