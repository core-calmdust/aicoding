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
    addEventListener('resize', () => { if (mode !== 'reset') reset(); sizeSky(); });
    sizeSky(); requestAnimationFrame(tick);
  }

  /* ---------- the camera: a director that chooses a shot for every page ----------
     Shots are cut to (not zoomed into) and then drift: a slow push, a truck across, a tilt up, a crane down.
     The backdrop's far and middle layers move less than the figures (parallax). Sometimes another figure
     stands huge and out of focus in the foreground (over the shoulder). */
  let fg = null, anim = null, par = [], lastKind = '', lastSpeaker = null, castAt = 0, shots = 0, sceneAt = 0;
  const R = () => { shots = (shots * 1103515245 + 12345) & 0x7fffffff; return shots / 0x7fffffff; };
  const T = o => `translate(${o.x.toFixed(1)}px,${o.y.toFixed(1)}px) rotate(${(o.r || 0).toFixed(2)}deg) scale(${o.s.toFixed(4)})`;
  function view() {
    const st = $('stage').getBoundingClientRect(), dock = $('dock');
    let vb = st.height;
    if (dock && !dock.classList.contains('hide')) { const d = dock.getBoundingClientRect(); if (d.top > st.top + 80 && d.top < st.bottom) vb = d.top - st.top; }
    return { w: st.width, h: st.height, vb, phone: !matchMedia('(min-width:1040px)').matches };
  }
  // where an element stands in the camera's own coordinates (whatever the camera is doing now)
  function base(el) {
    const r = el.getBoundingClientRect(), c = cam.getBoundingClientRect(), m = new DOMMatrix(getComputedStyle(cam).transform), k = Math.hypot(m.a, m.b) || 1;
    // undo the rotation too: use the inverse matrix on the corners
    const inv = m.inverse(), o = cam.offsetParent ? cam.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
    const p = (x, y) => inv.transformPoint(new DOMPoint(x - o.left, y - o.top));
    const a = p(r.left, r.top), d = p(r.right, r.bottom);
    return { x: Math.min(a.x, d.x), y: Math.min(a.y, d.y), w: Math.abs(d.x - a.x), h: Math.abs(d.y - a.y) };
  }
  // keep the camera inside the stage
  function clampShot(o, v) {
    const s = o.s; o.x = Math.min(-1, Math.max(v.w - s * v.w + 1, o.x)); o.y = Math.min(-1, Math.max(v.h - s * v.h + 1, o.y)); return o;
  }
  // a shot that puts world point (bx,by) at screen (sx,sy) with scale s
  const aim = (bx, by, s, sx, sy, r, v) => clampShot({ s, x: sx - s * bx, y: sy - s * by, r: r || 0 }, v);
  function light(sx, sy, k, night) {
    shade.style.setProperty('--lx', sx + 'px'); shade.style.setProperty('--ly', sy + 'px'); shade.style.opacity = k;
    bloom.style.setProperty('--lx', sx + 'px'); bloom.style.setProperty('--ly', sy + 'px'); bloom.style.opacity = night ? k * .35 : k * .8;
  }
  // the backdrop's depth: far and middle layers lag behind the camera's drift
  function parallax(from, to, dur, ease) {
    par.forEach(a => a.cancel()); par = [];
    const dx = (to.x - from.x) / to.s, dy = (to.y - from.y) / to.s;
    for (const [sel, f] of [['svg.scn.cine-far', .6], ['svg.scn.cine-mid', .3]]) {
      const g = document.querySelector('#scene ' + sel); if (!g) continue;
      par.push(g.animate([{ transform: 'translate(0px,0px)' }, { transform: `translate(${(-dx * f).toFixed(1)}px,${(-dy * f).toFixed(1)}px)` }], { duration: dur, easing: ease, fill: 'forwards' }));
    }
  }
  // split the backdrop into three stacked copies (far / middle / near) so each can move on its own, cheaply
  function layer() {
    const sc = $('scene'), svg = sc && sc.querySelector('svg.scn:not(.cine-far):not(.cine-mid)'); if (!svg || sc.querySelector('.cine-far')) return;
    for (const k of ['far', 'mid']) { const c2 = svg.cloneNode(true); c2.classList.add('cine-' + k); sc.insertBefore(c2, svg); }
    svg.classList.add('cine-near');
  }
  function play(from, to, dur, ease) {
    if (anim) anim.cancel();
    ease = ease || 'cubic-bezier(.3,0,.3,1)';
    anim = cam.animate([{ transform: T(from) }, { transform: T(to) }], { duration: dur, easing: ease, fill: 'forwards' });
    parallax(from, to, dur, ease);
    document.body.classList.toggle('cine-on', to.s > 1.001);
  }
  function foreground(srcPup, side, v) {
    if (!fg) { fg = document.createElement('div'); fg.id = 'cineFg'; $('stage').insertBefore(fg, $('roster')); }
    if (!srcPup) { fg.style.display = 'none'; return; }
    fg.innerHTML = srcPup.outerHTML; fg.style.display = 'block';
    const h = v.vb * 1.7, w = h * 120 / 250;
    Object.assign(fg.style, { width: w + 'px', height: h + 'px', top: (v.vb * .22) + 'px', left: side < 0 ? (-w * .52) + 'px' : (v.w - w * .48) + 'px', transform: side < 0 ? '' : 'scaleX(-1)' });
    fg.animate([{ translate: '0 0' }, { translate: `${side < 0 ? -40 : 40}px 0` }], { duration: 7000, easing: 'ease-out', fill: 'forwards' });
  }
  const emotional = t => /[！!？?]|……|――/.test(t || '');
  // choose and run the shot for this page
  function shoot(o) {
    const v = view(), night = document.body.classList.contains('night');
    const cast = [...document.querySelectorAll('#cast .pp')].filter(e => e.style.opacity !== '0');
    foreground(null, 0, v);
    if (o.el && o.el.isConnected) {
      // measure where the figure will stand, not where it is sliding now: a hidden copy with no transition
      const probe = o.el.cloneNode(true); probe.style.transition = 'none'; probe.style.visibility = 'hidden'; probe.style.opacity = '0';
      probe.querySelectorAll('*').forEach(e => { e.style.transition = 'none'; e.style.animation = 'none'; });
      o.el.parentNode.appendChild(probe);
      const pupEl = probe.querySelector('.pup') || probe, pb = base(pupEl);
      // the figure itself (children are shorter): the head group and the feet
      const hg = pupEl.querySelector('.fig > g[transform]'), hb = hg ? base(hg) : { x: pb.x + pb.w * .3, y: pb.y + pb.h * .08, w: pb.w * .4, h: pb.h * .2 };
      const feet = pb.y + pb.h * 236 / 250, top = hb.y, b = { x: pb.x, y: top, w: pb.w, h: Math.max(10, feet - top) };
      const hx = hb.x + hb.w * .5, head = hb.y + hb.h * .55, chest = top + b.h * .3;
      probe.remove();
      root.__cineDbg = { pb, hb, r: (r => [r.left, r.top, r.width, r.height])(pupEl.getBoundingClientRect()), left: o.el.style.left, id: o.el.dataset.id, cam: getComputedStyle(cam).transform };
      const others = cast.filter(e => e !== o.el && !e.classList.contains('fallen'));
      // pick a kind of shot: not the same twice running; feelings get closer
      let kinds = ['push', 'truck', 'tilt', 'ots', 'low'];
      if (!others.length) kinds = kinds.filter(k => k !== 'ots');
      if (emotional(o.text)) kinds = ['ecu', 'ecu', 'push', 'low'];
      if (o.el !== lastSpeaker && others.length && R() < .45) kinds = ['ots'];
      kinds = kinds.filter(k => k !== lastKind) .concat([]); if (!kinds.length) kinds = ['push'];
      const kind = kinds[Math.floor(R() * kinds.length)]; lastKind = kind; lastSpeaker = o.el; root.__cineShot = { kind, at: performance.now() };
      const side = R() < .5 ? -1 : 1;   // which third the face sits in
      const sx = v.w * (v.phone ? .5 : side < 0 ? .38 : .6), sy = v.vb * .4;
      // a bust: head to waist (half the figure) fills about 60% of the picture above the text
      let s = Math.max(1.4, Math.min(v.phone ? 3 : 3.6, (v.vb * .58) / (b.h * .5))), from, to, dur = 7000, ease = 'cubic-bezier(.25,.1,.25,1)';
      const roomUp = Math.max(1, head - hb.y);   // from the head's middle to the top of the hat
      s = Math.min(s, (v.vb * .22) / roomUp);    // the hat stays clear of the top edge with the head at 30%
      if (kind === 'ecu') { s = Math.min(s * 1.4, 5); to = aim(hx, head, s, sx, v.vb * .38, side * .8, v); from = aim(hx, head, s * .94, sx, v.vb * .38, side * .4, v); dur = 6000; }
      else if (kind === 'push') { to = aim(hx, head, s, sx, v.vb * .3, 0, v); from = aim(hx, head, s * .88, sx, v.vb * .32, 0, v); }
      else if (kind === 'truck') { const d = v.w * .09 * side; to = aim(hx, head, s * .95, sx, v.vb * .3, 0, v); from = aim(hx - d / s, head, s * .95, sx, v.vb * .3, 0, v); }
      else if (kind === 'tilt') { to = aim(hx, head, s * .95, sx, v.vb * .3, 0, v); from = aim(hx, head + v.vb * .16 / s, s * .92, sx, v.vb * .3, 0, v); dur = 6000; ease = 'cubic-bezier(.4,0,.2,1)'; }
      else if (kind === 'low') { to = aim(hx, head, s * .92, sx, v.vb * .32, -side * 1.4, v); from = aim(hx, head, s * .86, sx, v.vb * .36, -side * 1, v); }
      else if (kind === 'ots') {
        const other = others.sort((p, q) => Math.abs(base(q).x - hx) - Math.abs(base(p).x - hx))[0];
        foreground(other.querySelector('.pup'), side, v);
        const sx2 = v.w * (v.phone ? .58 : side < 0 ? .62 : .38);
        to = aim(hx, head, s * .85, sx2, v.vb * .32, 0, v); from = aim(hx + v.w * .03 * side / s, head, s * .85, sx2, v.vb * .32, 0, v);
      }
      play(from, to, dur, ease);
      light(to.x + to.s * hx, to.y + to.s * head, kind === 'ecu' ? .86 : .78, night);
      document.querySelectorAll('#cast .pp').forEach(e => e.classList.toggle('cine-dim', e !== o.el && !e.classList.contains('fallen')));
      return;
    }
    document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
    const fallen = document.querySelector('#cast .pp.fallen');
    if (fallen) {   // the body: a slow, low push toward it
      const b = base(fallen.querySelector('.pup') || fallen), cxp = b.x + b.w * .5, cyp = b.y + b.h * .5, s = v.phone ? 1.3 : 1.5;
      const to = aim(cxp, cyp, s, v.w * .5, v.vb * .58, 0, v), from = aim(cxp, cyp, s * .86, v.w * .5, v.vb * .6, 0, v);
      play(from, to, 8000, 'cubic-bezier(.2,0,.2,1)'); light(to.x + s * cxp, to.y + s * cyp, .82, night); lastKind = 'body'; root.__cineShot = { kind: 'body', at: performance.now() }; return;
    }
    // narration: a new place gets a crane down from the sky; otherwise a slow pan along the horizon
    const fl = $('floor'), gy = fl ? fl.offsetTop : v.vb * .7;   // the ground line (where the backdrop meets the road)
    const s = v.phone ? 1.1 : 1.14, newPlace = performance.now() - sceneAt < 1600 && lastKind !== 'crane';
    const atY = (s2, k) => v.vb * k - s2 * gy;   // ground line at k of the visible height
    let from, to;
    if (newPlace) { const x0 = -(s * v.w - v.w) * (R() < .5 ? .25 : .75); from = clampShot({ s: s * 1.06, x: x0, y: atY(s * 1.06, .98), r: 0 }, v); to = clampShot({ s, x: x0, y: atY(s, .7), r: 0 }, v); lastKind = 'crane'; }
    else { const dir = R() < .5 ? -1 : 1, span = s * v.w - v.w; from = clampShot({ s, x: dir < 0 ? -span * .1 : -span * .9, y: atY(s, .7), r: 0 }, v); to = clampShot({ s: s * 1.015, x: dir < 0 ? -span * .9 : -span * .1, y: atY(s * 1.015, .7), r: 0 }, v); lastKind = 'pan'; }
    play(from, to, newPlace ? 5600 : 10000, newPlace ? 'cubic-bezier(.35,0,.2,1)' : 'cubic-bezier(.45,0,.55,1)'); root.__cineShot = { kind: lastKind, at: performance.now() };
    light(v.w * (R() < .5 ? .38 : .62), v.vb * .36, .55, night);
  }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  // a page of text: who speaks (an element) or null for narration
  let shotAt = 0, shotWho = undefined;
  function page(o) {
    if (!cam) init();
    if (!active() || o.wide) return reset();
    // the same voice going on (or narration going on): stay in the shot while it is still moving
    const who = o.el || null, now = performance.now();
    if (mode !== 'reset' && who === shotWho && now - shotAt < 6500 && !(who && emotional(o.text) && lastKind !== 'ecu')) { focusEl = who; return; }
    clear(); mode = o.el ? 'speak' : 'wide'; focusEl = o.el || null;
    shotWho = who; shotAt = now + Math.max(0, castAt + 720 - now);
    // figures that were just placed slide for 0.7 s: hold the wide view until they stand, then cut
    const wait = Math.max(0, castAt + 760 - performance.now());
    if (wait > 0) {   // someone is stepping in: cut to the wide view and let them arrive, then cut in
      if (anim) { anim.cancel(); anim = null; } par.forEach(a => a.cancel()); par = [];
      cam.style.transform = ''; document.body.classList.remove('cine-on'); if (fg) fg.style.display = 'none';
      document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
      const v = view(); light(v.w * .5, v.vb * .42, .4, document.body.classList.contains('night'));
    }
    // shoot only once every figure stands still (the game slides them for 0.7 s; a slow device takes longer)
    let prev = null, tries = 0;
    const settle = () => {
      const now2 = [...document.querySelectorAll('#cast .pp')].map(e => { const r = e.getBoundingClientRect(); return r.left + ',' + r.top + ',' + getComputedStyle(e).opacity; }).join('|');
      if ((now2 === prev && performance.now() >= castAt + 700) || ++tries > 30) { shotAt = performance.now(); shoot(o); return; }
      prev = now2; timers.push(setTimeout(settle, 90));
    };
    timers.push(setTimeout(settle, wait > 0 ? 120 : 0));
  }
  function reset() {
    if (!cam) init();
    clear(); mode = 'reset'; focusEl = null; lastSpeaker = null; shotWho = undefined;
    if (anim) { anim.cancel(); anim = null; } par.forEach(a => a.cancel()); par = [];
    cam.style.transform = ''; document.body.classList.remove('cine-on');
    if (fg) fg.style.display = 'none';
    document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
    const v = view(); light(v.w * .5, v.vb * .42, .32, document.body.classList.contains('night'));
  }
  function cast() { castAt = performance.now(); }
  function scene() { sceneAt = performance.now(); }
  // a jolt: a door slams, a body falls
  function shake(k) {
    if (!active()) return; k = k || 1;
    $('stage').animate([{ translate: '0 0' }, { translate: `${-6 * k}px ${4 * k}px` }, { translate: `${5 * k}px ${-3 * k}px` }, { translate: `${-3 * k}px ${2 * k}px` }, { translate: '0 0' }], { duration: 420, easing: 'ease-out' });
  }
  // a little lift of the speaker's figure on each syllable
  function blip() {
    if (!active() || !focusEl) return;
    const p = focusEl.querySelector('.pup'); if (!p || !p.animate) return;
    p.animate([{ translate: '0 0' }, { translate: '0 -4px' }, { translate: '0 0' }], { duration: 110, easing: 'ease-out' });
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
    if (!cx || t - last < 33) return; const dt = Math.min(.1, (t - last) / 1000); last = t;
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

  root.WLCine = { init, page, reset, blip, weather, run, cast, scene, shake, layer, set enabled(v) { enabledPref = !!v; if (!v && cam) reset(); }, get enabled() { return enabledPref; } };
})(window);
