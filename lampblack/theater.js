/* 狼影灯 — 影絵芝居（演出 試験版）
   序幕などの「台本が決まっている場面」を、ページごとに手で付けたカメラで見せる。
   カメラはゲームの人形や背景の動きを見て決めるのではなく、台本（stories/<物語>.shots.js）に書かれたとおりに動く。
   1920×1080 の一枚の画を舞台の大きさに合わせて切り取って見せる（狭い画面では、台本が決めた「見どころ」の位置で切り取る）。 */
(function (root) {
  'use strict';
  const W = 1920, H = 1080;
  const ART = root.WLArt;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const E = {
    lin: t => t, io: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, o2: t => 1 - (1 - t) * (1 - t), o3: t => 1 - Math.pow(1 - t, 3),
    s: t => -(Math.cos(Math.PI * clamp(t, 0, 1)) - 1) / 2, io3: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  };
  // a move that never stops dead: it eases in over `a` seconds, travels, and settles (the last few percent take a long time)
  const glide = (t, tau, a) => { a = a == null ? .9 : a; const ramp = t < a ? (t * t) / (2 * a) : t - a / 2; return 1 - Math.exp(-ramp / tau); };
  const rng = seed => { let s = (seed >>> 0) % 2147483647 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  function noise1(x, seed) { const i = Math.floor(x), f = x - i, h = n => { const s = Math.sin((n + seed * 101.3) * 127.1) * 43758.5453; return s - Math.floor(s); }; const u = f * f * (3 - 2 * f); return lerp(h(i), h(i + 1), u) * 2 - 1; }
  const flick = (t, seed) => .5 * noise1(t * 7.3, seed) + .3 * noise1(t * 17.1, seed + 3) + .2 * noise1(t * 2.1, seed + 9);
  // a very slow handheld breath (pixels in the frame)
  const breath = (t, amt, seed) => ({ x: noise1(t * .23, seed) * amt, y: noise1(t * .19, seed + 7) * amt * .6 });
  const el = (tag, cls, html, parent) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };

  function fiberURL(seed, fx, fy, a) {
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='640' height='640'><filter id='f'><feTurbulence type='fractalNoise' baseFrequency='${fx} ${fy}' numOctaves='4' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .42 0 0 0 0 .32 0 0 0 0 .22 0 0 0 ${a} 0'/></filter><rect width='640' height='640' filter='url(#f)'/></svg>`)}")`;
  }
  const FIB1 = fiberURL(4, .0125, .03125, .62), FIB2 = fiberURL(11, .9, .9, .55);

  /* ---------- the stage floor (ported from the game's drawFloor) ---------- */
  const FLOOR = {
    tower: ['dirt', 'snow', 'post'], inn: ['dirt', 'snow', 'post'], forge: ['dirt', 'snow', 'rock'], mill: ['plank', 'water', 'post'], grave: ['dirt', 'snow', 'cross'],
    engine: ['rail', 'grass', 'rock'], baggage: ['board', 0, 'crate'], third: ['aisle', 0, 0], dining: ['aisle', 0, 0], sleeper: ['aisle', 0, 0],
    light: ['dirt', 'rock', 'rock'], harbor: ['plank', 'water', 'post'], net: ['dirt', 'sand', 'post'], clinic: ['dirt', 'grass', 'tuft'], shrine: ['flag', 'grass', 'lantern'],
    bath: ['flag', 'grass', 'rock'], ryokan: ['flag', 'grass', 'lantern'], toji: ['dirt', 'grass', 'tuft'], mound: ['dirt', 'grass', 'rock'], spring: ['step', 'water', 'rock'],
    chapel: ['flag', 'snow', 'cross'], scriptorium: ['board', 0, 0], cloister: ['flag', 'rock', 'col'], cellar: ['flag', 0, 'barrel'], hospice: ['dirt', 'snow', 'post'],
    stage: ['board', 0, 0], trap: ['board', 0, 'crate'], green: ['aisle', 0, 0], quay: ['flag', 'water', 'post'], box: ['aisle', 0, 0],
  };
  function floorSVG(loc, w, h) {
    const [way, side, prop] = FLOOR[loc] || ['dirt', 'grass', 'tuft'];
    let sd = 7 + (loc || '').length * 131; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    const n0 = v => v.toFixed(0), cx = w / 2, hw = y => w * .11 + w * .62 * Math.pow(y / h, 1.15), X = (u, y) => cx + u * hw(y);
    const rowY = (j, n) => h * Math.pow(j / n, 1.6);
    const quad = (u0, u1, y0, y1, g) => `M${n0(X(u0, y0) + g)},${n0(y0 + g * .4)} L${n0(X(u1, y0) - g)},${n0(y0 + g * .4)} L${n0(X(u1, y1) - g)},${n0(y1 - g * .4)} L${n0(X(u0, y1) + g)},${n0(y1 - g * .4)} Z`;
    const L = [], R = [];
    for (let i = 0; i <= 14; i++) { const y = h * i / 14, j = (r() - .5) * w * .012 * (1 + i / 6); L.push([X(-1, y) + j, y]); R.push([X(1, y) - j, y]); }
    const road = L.concat(R.slice().reverse()).map(p => n0(p[0]) + ',' + n0(p[1])).join(' ');
    const bank = (sg, kind) => { const P = sg < 0 ? L : R; let d = `M${sg < 0 ? -2 : w + 2},-2`;
      for (let i = 0; i < P.length - 1; i++) { const [x0, y0] = P[i], [x1, y1] = P[i + 1]; const m = kind === 'grass' ? 6 : kind === 'sand' ? 1 : 3;
        for (let k = 0; k < m; k++) { const t = k / m, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, s = 3 + 16 * (y / h);
          if (kind === 'grass') d += ` L${n0(x - sg * s * .2)},${n0(y)} L${n0(x + sg * s * (.6 + r() * .9))},${n0(y + s * .35)}`;
          else if (kind === 'snow') d += ` Q${n0(x - sg * s * (.8 + r() * .6))},${n0(y + s * .5)} ${n0(x + sg * s * .3)},${n0(y + s * 1.1)}`;
          else if (kind === 'rock') d += ` L${n0(x - sg * s * (.3 + r() * .8))},${n0(y + s * .3)} L${n0(x + sg * s * .2)},${n0(y + s * .9)}`;
          else d += ` L${n0(x + sg * s * .2)},${n0(y)}`; } }
      return d + ` L${n0(P[P.length - 1][0])},${h + 2} L${sg < 0 ? -2 : w + 2},${h + 2} Z`; };
    let under = '', pave = '', dark = '', banks = '', bankCls = side === 'snow' ? 'snow' : side === 'sand' ? 'sand' : 'side', wave = '';
    if (side === 'water') { under = `<rect class="water" x="0" y="0" width="${w}" height="${h}"/>`; for (let j = 1; j < 12; j++) { const y = rowY(j, 12), s = 6 + 22 * y / h; for (let x = (j % 2) * s * 2 - s * 2; x < w; x += s * 5.5) wave += `M${n0(x)},${n0(y)} q${n0(s * .7)},${n0(-s * .35)} ${n0(s * 1.4)},0 q${n0(s * .7)},${n0(s * .35)} ${n0(s * 1.4)},0 `; } }
    else if (side) banks = bank(-1, side) + bank(1, side);
    if (way === 'dirt' || way === 'flag' || way === 'rail') under += `<polygon class="road" points="${road}"/>`;
    if (way === 'flag') for (let j = 0; j < 10; j++) { const y0 = rowY(j, 10), y1 = rowY(j + 1, 10), g = 1 + 4 * y1 / h, k = 2 + (j % 2); let u = -1; for (let i = 0; i < k; i++) { const u1 = i === k - 1 ? 1 : -1 + 2 * (i + .7 + r() * .6) / k; pave += quad(u, u1, y0, y1, g); u = u1; } }
    if (way === 'plank') { for (let j = 0; j < 18; j++) { const y0 = rowY(j, 18), y1 = rowY(j + 1, 18); pave += quad(-1, 1, y0, y1, .6 + 2.4 * y1 / h); } for (const u of [-1.04, 1.04]) dark += quad(u - .04, u + .04, 0, h, 0); }
    if (way === 'rail') { for (let j = 0; j < 16; j++) { const y0 = rowY(j, 16), y1 = rowY(j + 1, 16); pave += quad(-.8, .8, y0, y0 + (y1 - y0) * .45, 0); } for (const u of [-.46, .46]) dark += quad(u - .035, u + .035, 0, h, 0); }
    if (way === 'step') for (let j = 1; j < 8; j++) { const y = rowY(j, 7.6), s = hw(y), ux = (j % 2 ? -.18 : .18) + (r() - .5) * .12; const rx = s * (.32 + r() * .08), ry = rx * (.22 + .1 * y / h); pave += `M${n0(X(ux, y) - rx)},${n0(y)} a${n0(rx)},${n0(ry)} 0 1,0 ${n0(rx * 2)},0 a${n0(rx)},${n0(ry)} 0 1,0 ${n0(-rx * 2)},0 Z`; }
    if (way === 'board' || way === 'aisle') {
      under += `<rect class="sand" x="0" y="0" width="${w}" height="${h}"/>`;
      for (let u = -4; u <= 4; u += .5) { pave += quad(u - .012, u + .012, 0, h, 0); for (let j = 1; j < 9; j++) if ((j + Math.round(u * 2)) % 3 === 0) { const y0 = rowY(j, 9); pave += quad(u, u + .5, y0, y0 + 1 + 2 * y0 / h, 0); } }
      if (way === 'aisle') { dark += quad(-.5, .5, 0, h, 0); under += `<path class="rug" d="${quad(-.5, .5, 0, h, 0)}"/>`; pave += quad(-.43, -.4, 0, h, 0) + quad(.4, .43, 0, h, 0); dark = ''; } }
    const tuft = (x, y, s) => { let d = `M${n0(x - s)},${n0(y)}`; const n = 5 + Math.floor(r() * 3); for (let k = 0; k <= n; k++) { const bx = x - s + 2 * s * k / n; d += ` L${n0(bx + (r() - .5) * s * .5)},${n0(y - s * (.9 + r() * 1.3))} L${n0(bx + s / n)},${n0(y - s * .15)}`; } return d + ` L${n0(x + s)},${n0(y)} Z`; };
    const stone = (x, y, s) => `M${n0(x - s)},${n0(y)} Q${n0(x - s * .9)},${n0(y - s * .8)} ${n0(x - s * .1)},${n0(y - s * .75)} Q${n0(x + s * .9)},${n0(y - s * .6)} ${n0(x + s)},${n0(y)} Z`;
    const rect = (x, y, ww, hh) => `M${n0(x)},${n0(y)} h${n0(ww)} v${n0(hh)} h${n0(-ww)} Z`;
    const thing = (k, x, y, s) => {
      if (k === 'post') return rect(x - s * .12, y - s * 2.4, s * .24, s * 2.4) + rect(x - s * .2, y - s * 2.5, s * .4, s * .16);
      if (k === 'cross') return rect(x - s * .1, y - s * 2.2, s * .2, s * 2.2) + rect(x - s * .6, y - s * 1.7, s * 1.2, s * .2) + stone(x, y, s * .7);
      if (k === 'lantern') return rect(x - s * .5, y - s * .3, s, s * .3) + rect(x - s * .16, y - s * 1.6, s * .32, s * 1.3) + rect(x - s * .45, y - s * 2.3, s * .9, s * .7) + `M${n0(x - s * .8)},${n0(y - s * 2.3)} L${n0(x)},${n0(y - s * 2.9)} L${n0(x + s * .8)},${n0(y - s * 2.3)} Z`;
      if (k === 'col') return rect(x - s * .7, y - s * .4, s * 1.4, s * .4) + rect(x - s * .45, y - s * 4.2, s * .9, s * 3.8);
      if (k === 'barrel') return `M${n0(x - s * .7)},${n0(y)} Q${n0(x - s)},${n0(y - s * .8)} ${n0(x - s * .7)},${n0(y - s * 1.6)} H${n0(x + s * .7)} Q${n0(x + s)},${n0(y - s * .8)} ${n0(x + s * .7)},${n0(y)} Z`;
      if (k === 'crate') return rect(x - s * .8, y - s * 1.4, s * 1.6, s * 1.4);
      if (k === 'rock') return stone(x, y, s * (.6 + r() * .5));
      return tuft(x, y, s);
    };
    let near = '', far = '';
    if (prop) { const tall = ['post', 'cross', 'lantern', 'col', 'barrel', 'crate'].includes(prop), N = tall ? 7 : 16;
      for (const sg of [-1, 1]) for (let i = 0; i < N; i++) {
        const t = (i + (tall ? .5 : .2 + r() * .6)) / N, y = h * Math.pow(t, 1.25), x = X(sg * (tall ? 1.12 : 1 + r() * .03), y), s = 5 + 30 * Math.pow(y / h, 1.1);
        if (x < -s * 2 || x > w + s * 2) continue;
        let d = thing(prop, x, y, s);
        if (tall && side && side !== 'water' && r() < .6) d += thing(side === 'snow' || side === 'rock' ? 'rock' : 'tuft', X(sg * 1.3, y), y, s * .8);
        if (y < h * .4) far += d; else near += d;
      } }
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="w-${way} s-${side || 'none'}">${under}<path class="wave" d="${wave}"/><path class="pave" d="${pave}"/><path class="dark" d="${dark}"/><path class="${bankCls}" d="${banks}"/><path class="far" d="${far}"/><path class="tuft" d="${near}"/></svg>`;
  }


  const THCSS = `#theater .world{position:absolute;inset:0;overflow:hidden;color:var(--ink)}

#theater .scrim{position:absolute;inset:0}
#theater .scrim>div{position:absolute;inset:0}
#theater .scrim .base{background:var(--paper)}
#theater .scrim .fib{inset:-60%;transform-origin:50% 50%}
#theater .scrim .fib1{background-image:var(--fib1);background-size:640px 640px;mix-blend-mode:multiply;opacity:.5}
#theater .scrim .fib2{background-image:var(--fib2);background-size:320px 320px;mix-blend-mode:multiply;opacity:.16}
#theater .scrim .lampL{inset:auto;width:2600px;height:2600px;border-radius:50%;background:radial-gradient(closest-side,color-mix(in srgb,var(--lamp) 92%,white) 0%,color-mix(in srgb,var(--lamp) 60%,transparent) 22%,transparent 64%);}
#theater .scrim .moonl{background:radial-gradient(70% 80% at 72% 18%,color-mix(in srgb,var(--moon) 70%,white) 0%,var(--moon) 25%,color-mix(in srgb,var(--night) 60%,var(--moon)) 62%,var(--night) 100%)}
#theater .shadeL{position:absolute;inset:0;z-index:8;pointer-events:none}
#theater .scrim .edge{background:radial-gradient(120% 95% at 50% 45%,transparent 46%,rgba(40,20,6,.5) 100%)}
#theater .L{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}
#theater .bd{position:absolute}
#theater .bd svg{position:absolute;inset:0;width:100%;height:100%;color:var(--ink);overflow:visible}
#theater .only-far .mid,#theater .only-far .near,#theater .only-mid .far,#theater .only-mid .near,#theater .only-near .far,#theater .only-near .mid{display:none}
#theater .scn .far{opacity:.17;filter:blur(2.4px)}
#theater .scn .mid{opacity:.42;filter:blur(.8px)}
#theater .scn .near{opacity:.94;filter:blur(.35px)}
#theater .scn .glow{fill:var(--lamp);opacity:.95}
#theater .night .scn .glow{fill:#ffd99a;opacity:.85}
#theater .scn .snow{fill:var(--paper);opacity:.85}
#theater .scn .pane{fill:color-mix(in srgb,var(--night) 55%,var(--paper));opacity:.9}
#theater .scn .cel-s{opacity:.8}
#theater .scn .cut:not([fill="none"]){fill:var(--paper);opacity:.9}
#theater .scn [fill="none"].cut{stroke:var(--paper);opacity:.85}
#theater .night .scn .cut:not([fill="none"]){fill:color-mix(in srgb,var(--moon) 55%,var(--night))}
#theater .night .scn [fill="none"].cut{stroke:color-mix(in srgb,var(--moon) 55%,var(--night))}
#theater .scn .moonc{fill:color-mix(in srgb,var(--lamp) 35%,white);opacity:.9}
#theater .scn .smoke{opacity:.35}.scn .smokecut{stroke:var(--paper);opacity:.55}
#theater .scn .ice{fill:var(--paper);opacity:.45}.scn .snowland{fill:var(--paper);opacity:.75}
#theater .night .pup,#theater .night .scn,#theater .night .floor svg{color:#05070d}
#theater .floor{position:absolute;left:0;background:linear-gradient(to bottom,color-mix(in srgb,var(--ink) 14%,transparent),transparent 40%)}
#theater .floor svg{position:absolute;inset:0;width:100%;height:100%;color:var(--ink)}
#theater .floor .road{fill:currentColor;opacity:.09;filter:blur(1.2px)}
#theater .floor .tuft{fill:currentColor;opacity:.88;filter:blur(.5px)}
#theater .floor .side{fill:currentColor;opacity:.2;filter:blur(.9px)}
#theater .floor .far{fill:currentColor;opacity:.42;filter:blur(1px)}
#theater .floor .pave{fill:currentColor;opacity:.13;filter:blur(.6px)}
#theater .floor .dark{fill:currentColor;opacity:.5;filter:blur(.5px)}
#theater .floor .water{fill:currentColor;opacity:.13}
#theater .floor .wave{fill:none;stroke:currentColor;stroke-width:1.5;opacity:.28;filter:blur(.4px)}
#theater .floor .snow{fill:#fffaf0;opacity:.55;stroke:currentColor;stroke-opacity:.25;stroke-width:1.5;filter:blur(.5px)}
#theater .night .floor .snow{fill:color-mix(in srgb,var(--moon) 70%,white);opacity:.4}
#theater .floor .w-plank .pave,#theater .floor .w-step .pave{opacity:.3}
#theater .floor .s-snow .road{opacity:.2}
#theater .floor .rug{fill:currentColor;opacity:.16;filter:blur(.6px)}
#theater .floor .sand{fill:currentColor;opacity:.1;filter:blur(1px)}
#theater .night .floor .road{opacity:.13}
#theater .pp{position:absolute}
#theater .pp .sway{width:100%;height:100%;transform-origin:50% 94.4%}
#theater .pp .pup{display:block;width:100%;height:100%;color:var(--ink);overflow:visible}
#theater .pup .cel{fill:var(--cel);opacity:.92}
#theater .pup .cel-s{stroke:var(--cel)}
#theater .pup .lamp{fill:#ffd27a}
#theater .pup .rod{stroke:rgba(20,12,6,.38);stroke-width:1.3;fill:none}
#theater .wolfsil{display:block;width:100%;height:auto;overflow:visible}
#theater .wolfsil .eye{fill:#ffcf86}
#theater .flake{position:absolute;left:0;top:0;border-radius:50%;background:#fffaf0}
#theater .abs{position:absolute}
#theater .puff{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(235,242,255,.95),rgba(235,242,255,0));filter:blur(4px)}
#theater .pole{position:absolute;top:0;width:46px;height:62%;background:rgba(8,8,16,.55);filter:blur(10px)}
#theater .tlamp{position:absolute;z-index:9;width:260px;height:260px;border-radius:50%;pointer-events:none;mix-blend-mode:screen;background:radial-gradient(closest-side,rgba(255,214,150,.75),rgba(255,190,110,.2) 50%,transparent)}
#theater .steam{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(255,252,244,.9),rgba(255,252,244,0));filter:blur(18px)}
#theater .ember{position:absolute;left:0;top:0;border-radius:50%;background:radial-gradient(closest-side,#ffd49a,#ff8a30 60%,transparent)}
#theater .pp{left:0;top:0}`;

  /* ---------- a world: paper screen + backdrop (far/mid/near) + floor + people, seen by a camera ---------- */
  // o: { st (story), loc, night, ww, wh (world size), gy (ground line), pFar, pMid, blurBg }
  function World(root, o) {
    const s = o.st, pal = Object.assign({}, s.pal, o.pal || {});
    this.o = o; this.s = s;
    const ww = this.ww = o.ww || W, wh = this.wh = o.wh || H;
    const gy = this.gy = o.gy != null ? o.gy : Math.round(wh * .58);
    const box = this.box = el('div', 'world' + (o.night ? ' night' : ''), null, root);
    for (const k of ['paper', 'lamp', 'acc', 'ink', 'night', 'moon']) if (pal[k]) box.style.setProperty('--' + k, pal[k]);
    box.style.setProperty('--fib1', FIB1); box.style.setProperty('--fib2', FIB2);
    this.scrim = el('div', 'scrim', `<div class="base"></div><div class="fib fib1"></div><div class="fib fib2"></div><div class="lampL"></div><div class="moonl"></div><div class="edge"></div>`, box);
    const scn = o.loc ? (ART.sceneNew && ART.sceneNew(s.scene, o.loc, o.seed || 1)) || ART.scene(s.scene, o.loc, o.seed || 1) : '';
    const bw = ww, bh = this.bh = Math.round(bw * 900 / 1600);
    const by = this.by = gy - bh * (872 / 900);
    this.layers = [];
    const mk = (cls, p, html, z) => { const L = el('div', 'L ' + cls, html, box); L.style.width = ww + 'px'; L.style.height = wh + 'px'; L.style.zIndex = z; const o2 = { el: L, p }; this.layers.push(o2); return o2; };
    const clipH = Math.round(gy - by + 3);
    const bdrop = part => scn ? `<div class="bd" style="left:0;top:${by}px;width:${bw}px;height:${clipH}px;overflow:hidden">${scn.replace('<svg class="scn"', `<svg class="scn only-${part}" style="height:${bh}px;bottom:auto"`)}</div>` : '';
    // an interior (o.room: { far, mid, near } html, drawn for this world's size) replaces the outdoor backdrop
    const R = o.room ? o.room(ww, wh, gy) : null;
    this.far = mk('Lfar', o.pFar != null ? o.pFar : .55, R ? R.far || '' : bdrop('far'), 2);
    this.mid = mk('Lmid', o.pMid != null ? o.pMid : .78, R ? R.mid || '' : bdrop('mid'), 3);
    this.near = mk('Lnear', .95, R ? R.near || '' : bdrop('near'), 4);
    const floc = R && R.floor ? R.floor : o.loc;
    this.floor = mk('floorL', 1, floc && o.floor !== false ? `<div class="floor" style="top:${gy - 4}px;height:${wh - gy + 4}px;width:${ww}px">${floorSVG(floc, ww, wh - gy + 4)}</div>` : '', 5);
    this.cast = mk('cast', 1, '', 6);
    this.fx = mk('fx', 1, '', 7);
    this.fg = mk('fg', 1.25, '', 8);
    if (o.blurBg) for (const L of [this.far, this.mid, this.near]) { const c = L.el.firstElementChild; if (c) { c.style.filter = `blur(${o.blurBg}px)`; } }   // the blur sits on the still picture inside the moving layer, so it is drawn once, not every frame
    this.cam = { x: ww / 2, y: wh / 2, z: 1, r: 0 };
    this.people = {};
  }
  World.prototype.camera = function (x, y, z, r) {
    const c = this.cam; c.x = x; c.y = y; c.z = z; c.r = r || 0;
    const cx0 = this.ww / 2, cy0 = this.wh / 2;
    for (const L of this.layers) {
      const zp = 1 + (z - 1) * L.p, px = cx0 + (x - cx0) * L.p, py = cy0 + (y - cy0) * L.p;
      L.el.style.transform = `translate(${W / 2}px,${H / 2}px) rotate(${c.r.toFixed(3)}deg) scale(${zp.toFixed(4)}) translate(${(-px).toFixed(1)}px,${(-py).toFixed(1)}px)`;
    }
    const fz = 1 + (z - 1) * .85;

  };
  // where a world point lands in the frame
  World.prototype.toFrame = function (x, y, p) { p = p == null ? 1 : p; const c = this.cam, zp = 1 + (c.z - 1) * p, px = this.ww / 2 + (c.x - this.ww / 2) * p, py = this.wh / 2 + (c.y - this.wh / 2) * p; return [W / 2 + (x - px) * zp, H / 2 + (y - py) * zp]; };
  World.prototype.light = function (o) {
    const L = this._lamp || (this._lamp = this.scrim.querySelector('.lampL')), M = this.scrim.querySelector('.moonl'), Ed = this.scrim.querySelector('.edge'), B = this.scrim.querySelector('.base');
    L.style.left = (o.lx != null ? o.lx : .5) * W + 'px'; L.style.top = (o.ly != null ? o.ly : .46) * H + 'px';
    L.style.opacity = ((o.lamp != null ? o.lamp : .95) * .42).toFixed(3);   // a plain glow (no light blending: much cheaper for the graphics chip) L.style.transform = `translate(-50%,-50%) scale(${o.ls || 1})`;
    M.style.opacity = o.moon || 0; Ed.style.opacity = o.edge != null ? o.edge : 1;
    B.style.opacity = o.paper != null ? o.paper : 1;
    const Sd = this._sd || (this._sd = el('div', 'shadeL', null, this.box)), lx = (o.lx != null ? o.lx : .5) * 100, ly = (o.ly != null ? o.ly : .46) * 100;
    const d = o.dark != null ? o.dark : 0, r = o.r || 75, tint = o.tint || '26,12,4';
    const bg = d ? `radial-gradient(${(r * 1.25).toFixed(1)}% ${r.toFixed(1)}% at ${lx.toFixed(1)}% ${ly.toFixed(1)}%, rgba(${tint},0) 0%, rgba(${tint},${(d * .18).toFixed(3)}) 35%, rgba(${tint},${(d * .62).toFixed(3)}) 70%, rgba(${tint},${d.toFixed(3)}) 100%)` : 'none';
    if (Sd._bg !== bg) { Sd.style.background = bg; Sd._bg = bg; }
  };
  World.prototype.bloom = function (o) {
    const b = this._bl || (this._bl = el('div', 'bloomL', null, this.box));
    b.style.left = (o.x * W) + 'px'; b.style.top = (o.y * H) + 'px';
    b.style.width = b.style.height = (o.r || 1400) + 'px'; b.style.opacity = o.a == null ? .35 : o.a;
    if (o.c && b._c !== o.c) { b.style.background = `radial-gradient(closest-side, ${o.c}, transparent)`; b._c = o.c; }
  };
  World.prototype.add = function (layer, cls, html, style) { const e = el('div', 'abs ' + (cls || ''), html, this[layer].el); if (style) Object.assign(e.style, style); return e; };
  // a puppet of the story (feet at x,y; h = height in px)
  World.prototype.puppet = function (key, id, opt) {
    const c = this.s.chars.find(x => x.id === id); if (!c) return null;
    const wrap = el('div', 'pp', `<div class="sway">${ART.puppet(c.look, c.color, { rod: opt && opt.rod === false ? false : true })}</div>`, (opt && opt.layer ? this[opt.layer] : this.cast).el);
    const P = { el: wrap, sway: wrap.firstChild, c, id, phase: (opt && opt.phase) || (Object.keys(this.people).length * 1.37) % 4.6, lift: 0 };
    // where the head is, as a share of the puppet's height from the top (measured once: hats, hoods and children differ)
    try { wrap.style.width = '120px'; wrap.style.height = '250px'; const sv = wrap.querySelector('svg'), g = sv.querySelector('.fig > g[transform]'), sr = sv.getBoundingClientRect(), gr = g.getBoundingClientRect();
      if (sr.height > 0 && gr.height > 0) { P.hc = (gr.top + gr.height * .55 - sr.top) / sr.height; P.ht = (gr.top - sr.top) / sr.height; } } catch (e) { }
    this.people[key] = P; return P;
  };
  // the middle of a puppet's head in the world, for feet at y and height h
  World.prototype.head = function (key, y, h) { const P = this.people[key]; return y - h * 236 / 250 + h * ((P && P.hc) || .3); };
  World.prototype.place = function (key, o, t) {
    const P = this.people[key]; if (!P) return;
    const h = o.h || 420, w = h * 120 / 250, e = P.el;
    const k = `${w.toFixed(1)}|${h.toFixed(1)}`;
    if (P._k !== k) { e.style.width = w + 'px'; e.style.height = h + 'px'; P._k = k; }
    // walking: a rod puppet glides with a small hop and a lean
    const wk = o.walk ? Math.abs(Math.sin(t * Math.PI * 1.7 + P.phase)) : 0;
    const hop = o.walk ? wk * h * .012 * o.walk : 0;
    e.style.transform = `translate(${(o.x - w / 2).toFixed(1)}px,${(o.y - h * 236 / 250 - hop).toFixed(1)}px)`;
    e.style.left = '0px'; e.style.top = '0px';
    e.style.opacity = o.op != null ? o.op : 1;
    const bq = (o.blur || 0) > 2 ? Math.max(3, Math.round(o.blur / 3) * 3) : Math.round((o.blur || 0) * 4) / 4;   // in steps, so the blur is not redrawn every frame
    const f = `blur(${bq}px)` + (o.glow ? ` drop-shadow(0 0 ${o.glow}px ${o.glowC || 'rgba(255,200,120,.55)'})` : '');
    if (P._f !== f) { (P.svg || (P.svg = e.querySelector('svg') || e)).style.filter = f; P._f = f; }   // the blur is painted into the puppet's own picture (kept while it only moves), not applied again every frame
    const flip = o.face === -1 ? ' scaleX(-1)' : '';
    const still = o.still || bq >= 1.5;   // a blurred figure keeps still, so its blur is drawn once
    const sw = still ? 0 : Math.sin((t + P.phase) / 4.6 * Math.PI * 2) * 1.1, sc = still ? 1 : 1 + .008 * (1 + Math.sin((t + P.phase) / 2.3 * Math.PI * 2));
    const lean = o.walk ? (o.face === -1 ? -1 : 1) * 2.2 * o.walk : 0;
    P.sway.style.transform = `${flip} rotate(${(sw + lean + (o.rot || 0)).toFixed(3)}deg) scale(1,${sc.toFixed(4)})` + (P.lift ? ` translateY(${(-P.lift).toFixed(2)}px)` : '');
    e.style.zIndex = o.z != null ? o.z : Math.round(o.y);
  };

  /* ---------- the theater: one frame on the stage, cut or dissolved from shot to shot ---------- */
  let host = null, frame = null, sky = null, skyG = null, grainEl = null, blackEl = null, cur = null, old = null, raf = 0, talkAt = -1e9, ctx = null, seekT = null, lastFit = '';
  const css = () => `#theater{position:absolute;inset:0;z-index:7;overflow:hidden;background:#000;opacity:0;transition:opacity .9s ease;pointer-events:none}
#theater.on{opacity:1}
#theater .thFrame{position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0;overflow:hidden;background:#000}
#theater .shot{position:absolute;inset:0;overflow:hidden}
#theater .world{position:absolute;inset:0;overflow:hidden;color:var(--ink)}

#theater .thSky{position:absolute;left:0;top:0;z-index:3;pointer-events:none}
#theater .thVig{position:absolute;inset:0;z-index:4;pointer-events:none;background:radial-gradient(130% 110% at 50% 48%,transparent 52%,rgba(6,3,1,.6) 100%)}
#theater .thGrain{display:none;position:absolute;inset:-128px;z-index:5;pointer-events:none;opacity:.5;mix-blend-mode:overlay;will-change:transform;animation:thGrain .5s steps(6) infinite}
@keyframes thGrain{0%{transform:translate(0,0)}17%{transform:translate(-61px,37px)}33%{transform:translate(43px,-88px)}50%{transform:translate(-97px,-21px)}67%{transform:translate(19px,74px)}83%{transform:translate(88px,13px)}100%{transform:translate(0,0)}}
#theater .bloomL{position:absolute;z-index:9;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,170,.5),rgba(255,200,130,.16) 45%,transparent);pointer-events:none}
#theater .lit .pup .cel{filter:drop-shadow(0 0 5px var(--cel)) drop-shadow(0 0 14px var(--cel))}
#theater .wolfw{position:absolute}
#theater .scrim .fib{display:none}
#theater .scrim .base{background-color:var(--paper);background-image:var(--fib1),var(--fib2);background-size:640px 640px,320px 320px;background-blend-mode:multiply,multiply}
#theater .pp{will-change:transform}
#theater.lite .thGrain{display:none}
#theater .thBlack{position:absolute;inset:0;z-index:6;background:#000;opacity:0;pointer-events:none}
body.th-on #cineShade,body.th-on #cineBloom,body.th-on #cineSky,body.th-on #cineGrain{opacity:0!important}
/* the ordinary stage under the theater is not drawn while the theater plays (it comes back as the theater fades out) */
body.th-full #cam,body.th-full #scrim,body.th-full #cineShade,body.th-full #cineBloom,body.th-full #cineSky,body.th-full #cineGrain,body.th-full #cineFg{visibility:hidden}
` + THCSS;

  function init() {
    if (host) return;
    const st = $('stage'); if (!st) return;
    const s = document.createElement('style'); s.textContent = css(); document.head.appendChild(s);
    host = el('div', null, null, st); host.id = 'theater';
    frame = el('div', 'thFrame', null, host);
    sky = el('canvas', 'thSky', null, host); skyG = sky.getContext('2d');
    el('div', 'thVig', null, host);
    grainEl = el('div', 'thGrain', null, host);
    blackEl = el('div', 'thBlack', null, host);
    // film grain: one tile of noise, moved around (composited only)
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256), r = rng(31);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - .5) * 220; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 46; }
    g.putImageData(im, 0, 0); grainEl.style.backgroundImage = `url(${c.toDataURL()})`;
  }
  // the visible part of the stage (above the text box when it covers the stage)
  function view() {
    const s = $('stage').getBoundingClientRect(), d = $('dock');
    let vb = s.height, solid = false;
    if (d && !d.classList.contains('hide')) { const r = d.getBoundingClientRect(); if (r.top > s.top + 80 && r.top < s.bottom) { vb = r.top - s.top; const tb = $('tx'), tr = tb && !tb.classList.contains('hide') ? tb.getBoundingClientRect() : r; solid = tr.width > s.width * .9; } }
    return { w: s.width, h: s.height, vb, solid };
  }
  // fit the 1920×1080 frame over the stage, keeping the shot's point of interest (fx,fy in the frame) in the visible part
  function fit(fx, fy) {
    const v = view();
    // a text box across the whole width (a phone) hides what is under it: then only the part above it needs the picture
    const hh = v.solid ? v.vb : v.h;
    const vcx = v.w / 2, vcy = v.vb * .5;
    let s = Math.max(v.w / W, hh / H);
    // the point should be able to sit at the middle of what is visible without the frame's bottom edge showing
    if (fy < H && !v.solid) s = Math.max(s, (hh - vcy) / (H - fy));
    s = Math.min(s, Math.max(v.w / W, hh / H) * 1.35);
    const x0 = clamp(vcx - s * fx, v.w - s * W, 0), y0 = clamp(vcy - s * fy, hh - s * H, 0);
    const k = `translate(${x0.toFixed(1)}px,${y0.toFixed(1)}px) scale(${s.toFixed(4)})`;
    if (k !== lastFit) { frame.style.transform = k; lastFit = k; }
    return { s, x0, y0, v };
  }

  /* snow, drawn in the frame's own pixels on a small canvas (cheap: pre-made soft flakes) */
  const flakeImg = (() => { const out = []; for (const b of [0, 1, 2]) { const c = document.createElement('canvas'), n = 32; c.width = c.height = n; const g = c.getContext('2d'); const gr = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,252,244,1)'); gr.addColorStop(b === 0 ? .55 : b === 1 ? .3 : .1, 'rgba(255,252,244,.85)'); gr.addColorStop(1, 'rgba(255,252,244,0)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); out.push(c); } return out; })();
  function makeSnow(o) {
    const r = rng(o.seed || 7), f = [];
    for (let i = 0; i < (o.n || 120); i++) { const d = r(); f.push({ x: r() * W, y: r() * H, d, v: lerp(30, 130, d) * (o.speed || 1), a: r() * 6.28, sw: lerp(8, 40, d), s: lerp(o.min || 2.5, o.max || 11, Math.pow(d, 2.2)), op: (o.op || .85) * (d > .85 ? .5 : .45 + d * .55) }); }
    return { f, o };
  }
  function drawSnow(list, t, fitr) {
    const v = fitr.v;
    if (sky.width !== Math.round(v.w) || sky.height !== Math.round(v.h)) { sky.width = Math.round(v.w); sky.height = Math.round(v.h); }
    skyG.clearRect(0, 0, sky.width, sky.height);
    if (!list) return;
    for (const sn of list) {
      const o = sn.o, w = W, h = H + 60;
      for (let i = 0; i < sn.f.length; i += lite ? 2 : 1) { const p = sn.f[i];
        let y = ((p.y + p.v * t) % h + h) % h - 30, x = p.x + Math.sin(t * .7 + p.a) * p.sw + (o.wind || 0) * t * (.5 + p.d);
        x = ((x % w) + w) % w;
        const X = fitr.x0 + x * fitr.s, Y = fitr.y0 + y * fitr.s, S = p.s * fitr.s * (p.d > .85 ? 2.2 : 1);
        if (X < -S || Y < -S || X > v.w + S || Y > v.h + S) continue;
        skyG.globalAlpha = p.op * (o.a == null ? 1 : o.a);
        skyG.drawImage(flakeImg[p.d > .85 ? 2 : p.d > .5 ? 1 : 0], X - S, Y - S, S * 2, S * 2);
      }
    }
    skyG.globalAlpha = 1;
  }

  // a slow machine: when frames take too long, draw at 30 fps with less snow and no film grain (decided once, kept)
  let lite = false, ema = 33, lastNow = 0, lastDraw = 0, pausedAt = 0;
  // the picture is drawn 30 times a second (the camera moves slowly: more is wasted work and heat), 20 once a shot has settled,
  // and not at all while the game is paused (the window has lost focus or is hidden)
  function tick(now) {
    raf = 0; if (!cur) return;
    if (document.body.classList.contains('paused') || document.hidden) { if (!pausedAt) pausedAt = now; setTimeout(() => { if (!raf && host.classList.contains('on')) raf = requestAnimationFrame(tick); }, 250); return; }
    if (pausedAt) { const d = now - pausedAt; cur.t0 += d; if (old) { old.t0 += d; old.at += d; } pausedAt = 0; lastDraw = 0; }
    const settled = (now - cur.t0) > 14000 && now - talkAt > 400;
    const gap = 1000 / (lite || settled ? 20 : 30);
    if (lastDraw && now - lastDraw < gap - 4) { raf = requestAnimationFrame(tick); return; }
    if (lastDraw) { const dt = Math.min(250, now - lastDraw); ema = ema * .9 + dt * .1; if (!lite && (now - cur.t0) > 1500 && ema > 48) { lite = true; host.classList.add('lite'); } }
    lastDraw = now; lastNow = now; TH.draws = (TH.draws || 0) + 1;
    const t = seekT != null ? seekT : (now - cur.t0) / 1000;
    const talk = Math.max(0, 1 - (now - talkAt) / 140);
    const r = cur.def.draw(cur.S, t, ctx, { talk, now }) || {};
    const fitr = fit(r.fx != null ? r.fx : W / 2, r.fy != null ? r.fy : H * .42);
    if (old) {
      const k = clamp((now - old.at) / (old.dur * 1000), 0, 1);
      if (old.kind === 'fade') { old.def.draw(old.S, (now - old.t0) / 1000, ctx, { talk: 0, now }); cur.root.style.opacity = E.s(k).toFixed(3); }
      if (old.kind === 'dip') { const b = k < .5 ? E.s(k * 2) : 1 - E.s((k - .5) * 2); blackEl.style.opacity = b.toFixed(3); cur.root.style.visibility = k < .5 ? 'hidden' : ''; old.root.style.visibility = k < .5 ? '' : 'hidden'; if (k < .5) old.def.draw(old.S, (now - old.t0) / 1000, ctx, { talk: 0, now }); }
      if (k >= 1) { old.root.remove(); old = null; cur.root.style.opacity = ''; cur.root.style.visibility = ''; blackEl.style.opacity = r.black || 0; }
    } else blackEl.style.opacity = r.black || 0;
    drawSnow(r.snow, t, fitr);
    if (r.grain != null) grainEl.style.opacity = r.grain;
    if (host.classList.contains('on')) raf = requestAnimationFrame(tick);
  }

  // play a shot: tr = 'cut' | 'fade' (dissolve) | 'dip' (through black)
  function play(def, tr, dur) {
    init(); if (!host) return;
    const rootEl = el('div', 'shot', null, frame);
    const S = def.build(rootEl, ctx) || {};
    const now = performance.now();
    if (old) { old.root.remove(); old = null; }
    if (cur && tr && tr !== 'cut') { old = Object.assign(cur, { kind: tr, at: now, dur: dur || (tr === 'dip' ? 1.2 : .8) }); rootEl.style.opacity = tr === 'fade' ? '0' : ''; }
    else if (cur) cur.root.remove();
    cur = { def, S, root: rootEl, t0: now };
    if (!raf) raf = requestAnimationFrame(tick);
  }
  const TH = {
    W, H, E, clamp, lerp, seg, glide, noise1, flick, breath, rng, el, World, makeSnow,
    get on() { return !!(host && host.classList.contains('on')); },
    // the story's directed pages, if it has them and the player wants the show
    has(st) { return !!(root.WL_SHOTS && st && root.WL_SHOTS[st.id]); },
    start(c) {
      init(); if (!host) return;
      ctx = c; host.classList.add('on'); document.body.classList.add('th-on');
      clearTimeout(TH._full); TH._full = setTimeout(() => { if (TH.on) document.body.classList.add('th-full'); }, 1000);
      if (!raf) raf = requestAnimationFrame(tick);
    },
    // a line of the text strip: it.shot = { sid, part, who }
    line(it, instant) {
      if (!TH.on || !it || !it.shot) return;
      const book = root.WL_SHOTS[ctx.st.id] || {}, P = book.pages || {}, pg = P[it.shot.sid] || {};
      ctx.shot = it.shot;
      let def = pg[it.shot.part] || (it.shot.part.startsWith('cast:') && pg.cast) || null;
      if (typeof def === 'function') def = def(ctx);
      if (!def && book.generic) def = book.generic(it.shot, ctx);
      if (!def) return;
      play(def, instant ? 'cut' : def.tr || 'cut', def.trDur);
    },
    blip() { talkAt = performance.now(); },
    end() {
      if (!host) return;
      host.classList.remove('on'); document.body.classList.remove('th-on', 'th-full'); clearTimeout(TH._full);
      setTimeout(() => { if (host.classList.contains('on')) return; cancelAnimationFrame(raf); raf = 0; if (cur) cur.root.remove(); if (old) old.root.remove(); cur = old = null; skyG && skyG.clearRect(0, 0, sky.width, sky.height); }, 1000);
    },
    seek(t) { seekT = t; if (!raf && cur) raf = requestAnimationFrame(tick); },
  };
  root.WLTheater = TH;
})(typeof window !== "undefined" ? window : globalThis);
