/* 狼影灯 — 演出（シネマ）：カメラ・光・粒子・狼の疾走
   話す人へカメラが寄り（ほかの人はピントが外れる）、灯りがその人を照らす。地の文はゆっくり押し込む。
   集会・投票・選択肢の画面では使わない（遊びやすさ優先）。設定の「アニメーション」か「演出」を切ると止まる。 */
(function (root) {
  'use strict';
  const $ = id => document.getElementById(id);
  let cam, shade, bloom, grain, cv, cx, wx = null;
  let state = { s: 1, x: 0, y: 0 }, mode = 'reset', alt = 0, focusEl = null, timers = [];
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
    const tiles = []; for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256); for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - .5) * 230; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } g.putImageData(im, 0, 0); tiles.push(c.toDataURL()); }
    grain.style.setProperty('--g0', `url(${tiles[0]})`); grain.style.setProperty('--g1', `url(${tiles[1]})`); grain.style.setProperty('--g2', `url(${tiles[2]})`); grain.style.setProperty('--g3', `url(${tiles[3]})`);
    addEventListener('resize', () => { if (mode !== 'reset') refocus(0); sizeSky(); });
    sizeSky(); requestAnimationFrame(tick);
  }

  /* ---------- the camera ---------- */
  function apply(s, x, y, dur) {
    state = { s, x, y };
    cam.style.transition = dur === 0 ? 'none' : `transform ${dur || 1.6}s cubic-bezier(.42,0,.16,1)`;
    cam.style.transform = s === 1 && !x && !y ? '' : `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`;
    document.body.classList.toggle('cine-on', s !== 1);
  }
  function view() {
    const st = $('stage').getBoundingClientRect(), dock = $('dock');
    let vb = st.height;
    if (dock && !dock.classList.contains('hide')) { const d = dock.getBoundingClientRect(); if (d.top > st.top + 80 && d.top < st.bottom) vb = d.top - st.top; }
    return { w: st.width, h: st.height, vb, phone: !matchMedia('(min-width:1040px)').matches };
  }
  // a rectangle in the camera's own (untransformed) coordinates
  function base(el) {
    const r = el.getBoundingClientRect(), c = cam.getBoundingClientRect(), k = c.width / cam.offsetWidth || 1;
    return { x: (r.left - c.left) / k, y: (r.top - c.top) / k, w: r.width / k, h: r.height / k };
  }
  function frame(bx, by, s, sx, sy, v) {
    let x = sx - s * bx, y = sy - s * by;
    x = Math.min(0, Math.max(v.w - s * v.w, x)); y = Math.min(0, Math.max(v.h - s * v.h, y));
    return [x, y];
  }
  function light(sx, sy, k, night) {
    shade.style.setProperty('--lx', sx + 'px'); shade.style.setProperty('--ly', sy + 'px');
    shade.style.opacity = k; bloom.style.setProperty('--lx', sx + 'px'); bloom.style.setProperty('--ly', sy + 'px');
    bloom.style.opacity = night ? k * .35 : k * .8;
  }
  function refocus(delay) {
    clear();
    const go = () => {
      if (!active() || mode === 'reset') return;
      const v = view(), night = document.body.classList.contains('night');
      if (mode === 'speak' && focusEl && focusEl.isConnected) {
        const pup = focusEl.querySelector('.pup') || focusEl, b = base(pup);
        // a bust shot: head and shoulders fill the upper part of the screen above the text strip
        let s = v.phone ? 1.6 : 2.0; s = Math.min(s, (v.vb * 1.25) / Math.max(1, b.h));
        s = Math.max(1.25, s);
        const hx = b.x + b.w * .5, hy = b.y + b.h * .3;
        const [x, y] = frame(hx, hy, s, v.w * (v.phone ? .5 : .44), v.vb * .42, v);
        apply(s, x, y, 1.6);
        light(x + s * hx, y + s * (b.y + b.h * .18), .78, night);
      } else if (mode === 'body' && focusEl && focusEl.isConnected) {
        const b = base(focusEl.querySelector('.pup') || focusEl), s = v.phone ? 1.25 : 1.4;
        const [x, y] = frame(b.x + b.w * .5, b.y + b.h * .5, s, v.w * .5, v.vb * .55, v);
        apply(s, x, y, 2.4); light(x + s * (b.x + b.w * .5), y + s * (b.y + b.h * .5), .8, night);
      } else {   // narration: a slow push, alternately to one side and the other
        const s = 1.07, ax = alt % 2 ? .38 : .62;
        const [x, y] = frame(v.w * ax, v.vb * .45, s, v.w * ax, v.vb * .45, v);
        apply(s, x, y, 6); light(v.w * ax, v.vb * .38, .55, night);
      }
    };
    timers.push(setTimeout(go, delay || 0));
    timers.push(setTimeout(go, (delay || 0) + 760));   // the figures slide into place (0.7 s): look again once they stand
  }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  // a page of text: who speaks (an element) or null for narration
  function page(o) {
    if (!cam) init();
    document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
    if (!active() || o.wide) return reset();
    if (o.el) {
      mode = 'speak'; focusEl = o.el;
      document.querySelectorAll('#cast .pp').forEach(e => { if (e !== o.el && !e.classList.contains('fallen')) e.classList.add('cine-dim'); });
    } else {
      const fallen = document.querySelector('#cast .pp.fallen');
      if (fallen) { mode = 'body'; focusEl = fallen; } else { mode = 'wide'; focusEl = null; alt++; }
    }
    refocus(30);
  }
  function reset(dur) {
    if (!cam) init();
    clear(); mode = 'reset'; focusEl = null;
    document.querySelectorAll('#cast .pp.cine-dim').forEach(e => e.classList.remove('cine-dim'));
    apply(1, 0, 0, dur == null ? 1.1 : dur); shade.style.opacity = 0; bloom.style.opacity = 0;
  }
  // a little lift of the speaker's figure on each syllable
  function blip() {
    if (!active() || !focusEl) return;
    const p = focusEl.querySelector('.pup'); if (!p || !p.animate) return;
    p.animate([{ translate: '0 0' }, { translate: '0 -4px' }, { translate: '0 0' }], { duration: 110, easing: 'ease-out' });
  }

  /* ---------- the weather on the screen: snow (mountains, the abbey) or motes in the lamplight ---------- */
  const flakes = [];
  function sizeSky() { if (!cv) return; const r = $('stage').getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = r.width * d; cv.height = r.height * d; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; cx.setTransform(d, 0, 0, d, 0, 0); }
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

  root.WLCine = { init, page, reset, blip, weather, run, set enabled(v) { enabledPref = !!v; if (!v) reset(0); }, get enabled() { return enabledPref; } };
})(window);
