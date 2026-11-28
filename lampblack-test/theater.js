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



  /* ---------- drawing on one canvas ----------
     Every picture (backdrop layers, floor, rooms, puppets, props) is turned into a bitmap once, at the size it will be seen,
     and each frame only places those bitmaps. No CSS filters or blending, no big composited layers: light on the
     graphics chip and on memory (phones restarted the page when every layer was its own huge texture). */
  const PAL_DEF = { paper: '#efe3c8', lamp: '#ffcf86', ink: '#1b120c', night: '#16233a', moon: '#b9c8e6', acc: '#c2412d' };
  const SVGCSS = `.scn .far{opacity:.17;filter:url(#fb2)}.scn .mid{opacity:.42}.scn .near{opacity:.94}
.scn .glow{fill:var(--lamp);opacity:.95}.night .scn .glow{fill:#ffd99a;opacity:.85}.scn .snow{fill:var(--paper);opacity:.85}
.scn .pane{fill:color-mix(in srgb,var(--night) 55%,var(--paper));opacity:.9}.scn .cel-s{opacity:.8}
.scn .cut:not([fill="none"]){fill:var(--paper);opacity:.9}.scn [fill="none"].cut{stroke:var(--paper);opacity:.85}
.night .scn .cut:not([fill="none"]){fill:color-mix(in srgb,var(--moon) 55%,var(--night))}.night .scn [fill="none"].cut{stroke:color-mix(in srgb,var(--moon) 55%,var(--night))}
.scn .moonc{fill:color-mix(in srgb,var(--lamp) 35%,white);opacity:.9}.scn .smoke{opacity:.35}.scn .smokecut{stroke:var(--paper);opacity:.55}
.scn .ice{fill:var(--paper);opacity:.45}.scn .snowland{fill:var(--paper);opacity:.75}
.only-far .mid,.only-far .near,.only-mid .far,.only-mid .near,.only-near .far,.only-near .mid{display:none}
.floor .road{fill:currentColor;opacity:.09;filter:url(#fb1)}.floor .tuft{fill:currentColor;opacity:.88}.floor .side{fill:currentColor;opacity:.2;filter:url(#fb1)}
.floor .far{fill:currentColor;opacity:.42;filter:url(#fb1)}.floor .pave{fill:currentColor;opacity:.13}.floor .dark{fill:currentColor;opacity:.5}
.floor .water{fill:currentColor;opacity:.13}.floor .wave{fill:none;stroke:currentColor;stroke-width:1.5;opacity:.28}
.floor .snow{fill:#fffaf0;opacity:.55;stroke:currentColor;stroke-opacity:.25;stroke-width:1.5}.night .floor .snow{fill:color-mix(in srgb,var(--moon) 70%,white);opacity:.4}
.floor .w-plank .pave,.floor .w-step .pave{opacity:.3}.floor .s-snow .road{opacity:.2}.floor .rug{fill:currentColor;opacity:.16}.floor .sand{fill:currentColor;opacity:.1;filter:url(#fb1)}
.night .floor .road{opacity:.13}
.pup .cel{fill:var(--cel);opacity:.92}.pup .cel-s{stroke:var(--cel)}.pup .lamp{fill:#ffd27a}.pup .rod{stroke:rgba(20,12,6,.38);stroke-width:1.3;fill:none}`;
  // a whole svg document for one picture, with the story's colours and the cut-paper styles inside it
  function svgDoc(w, h, inner, pal, night, blur) {
    const vars = Object.keys(PAL_DEF).map(k => `--${k}:${pal[k] || PAL_DEF[k]}`).join(';');
    const ink = night ? '#05070d' : (pal.ink || PAL_DEF.ink);
    const bl = blur ? `<filter id="pb" x="-30%" y="-10%" width="160%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${blur}"/></filter>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="${night ? 'night' : ''}" style="${vars};color:${ink}"><defs><filter id="fb1" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="1"/></filter><filter id="fb2" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.4"/></filter>${bl}</defs><style>${SVGCSS}</style>${blur ? `<g filter="url(#pb)">${inner}</g>` : inner}</svg>`;
  }
  // svg text → bitmap (a canvas) of pw × ph pixels
  function raster(doc, pw, ph) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(pw)); c.height = Math.max(1, Math.round(ph)); try { c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); } catch (e) { } res(c); };
      img.onerror = () => res(null);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(doc);
    });
  }
  // how many bitmap pixels per world pixel the pictures need (the frame's scale on screen × the screen's pixel ratio, kept modest)
  let RQ = 1;
  const ratio = () => Math.min(window.devicePixelRatio || 1, 1.5);

  /* ---------- a world: backdrop (far/mid/near) + floor + people + props, seen by a camera ---------- */
  // o: { st, loc, room, night, ww, wh, gy, pFar, pMid, blurBg }
  function World(o) {
    const s = o.st, pal = this.pal = Object.assign({}, PAL_DEF, s.pal, o.pal || {});
    this.o = o; this.s = s; this.night = !!o.night;
    const ww = this.ww = o.ww || W, wh = this.wh = o.wh || H;
    const gy = this.gy = o.gy != null ? o.gy : Math.round(wh * .58);
    const bw = ww, bh = this.bh = Math.round(bw * 900 / 1600), by = this.by = gy - bh * (872 / 900);
    this.cam = { x: ww / 2, y: wh / 2, z: 1, r: 0 };
    this.people = {}; this.sprites = []; this.pending = [];
    this.lt = {}; this.bl = null; this.shakeY = 0; this.box = { classList: { add() { } } };
    const R = o.room ? o.room(ww, wh, gy) : null;
    const scn = !R && o.loc ? (ART.sceneNew && ART.sceneNew(s.scene, o.loc, o.seed || 1)) || ART.scene(s.scene, o.loc, o.seed || 1) : '';
    const clipH = Math.round(gy - by + 3);
    const bd = part => scn ? `<clipPath id="cl"><rect x="0" y="0" width="${bw}" height="${clipH}"/></clipPath><g transform="translate(0 ${by.toFixed(1)})" clip-path="url(#cl)">${scn.replace('<svg class="scn"', `<svg class="scn only-${part}" x="0" y="0" width="${bw}" height="${bh}"`)}</g>` : '';
    const floc = R && R.floor ? R.floor : o.loc;
    const fl = floc && o.floor !== false ? `<defs><linearGradient id="fg0" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.ink}" stop-opacity=".14"/><stop offset=".4" stop-color="${pal.ink}" stop-opacity="0"/></linearGradient></defs><g class="floor" transform="translate(0 ${gy - 4})"><rect width="${ww}" height="${wh - gy + 4}" fill="url(#fg0)"/>${floorSVG(floc, ww, wh - gy + 4)}</g>` : '';
    // the layers: [name, parallax, svg body, height of the picture]
    const L = [['far', o.pFar != null ? o.pFar : .55, R ? R.far : bd('far')], ['mid', o.pMid != null ? o.pMid : .78, R ? R.mid : bd('mid')], ['near', .95, R ? R.near : bd('near')], ['floor', 1, fl], ['cast', 1, ''], ['fx', 1, ''], ['fg', 1.25, '']];
    this.layers = L.map(([name, p, body]) => ({ name, p, body: body || '', bmp: null }));
    for (const k of ['far', 'mid', 'near', 'floor', 'cast', 'fx', 'fg']) this[k] = k;
    // the backdrop is blurred into its picture once (rooms seen past a speaker's shoulder)
    this.blurBg = o.blurBg || 0;
  }
  // make the bitmaps (call once the frame's size on screen is known)
  World.prototype.prepare = function () {
    const q = RQ, out = [];
    for (const L of this.layers) {
      if (!L.body || L.bmp) continue;
      const blurred = this.blurBg && L.name !== 'floor';
      // blurred pictures need fewer pixels; and never more than 4096 across
      // only the band that has something in it: the backdrop down to the ground, the floor from the ground down
      const y0 = L.name === 'floor' ? Math.max(0, this.gy - 4) : 0, y1 = L.name === 'floor' ? this.wh : Math.min(this.wh, this.gy + 6), hh = y1 - y0;
      const k = Math.min(q * (blurred ? .5 : 1.05), 4096 / this.ww, 4096 / hh, Math.sqrt(5e6 / (this.ww * hh)));   // at most 5 million pixels a layer
      const doc = svgDoc(this.ww, hh, `<g transform="translate(0 ${-y0})">${L.body}</g>`, this.pal, this.night, blurred ? this.blurBg : 0);
      L.y0 = y0; L.hh = hh;
      out.push(raster(doc, this.ww * k, hh * k).then(c => { L.bmp = c; }));
    }
    for (const sp of this.sprites) if (sp.svg && !sp.bmp) out.push(sp.make());
    for (const id in this.people) out.push(this.people[id].need(0, 300));
    return Promise.all(out);
  };
  World.prototype.camera = function (x, y, z, r) { const c = this.cam; c.x = x; c.y = y; c.z = z; c.r = r || 0; };
  World.prototype.toFrame = function (x, y, p) { p = p == null ? 1 : p; const c = this.cam, zp = 1 + (c.z - 1) * p, px = this.ww / 2 + (c.x - this.ww / 2) * p, py = this.wh / 2 + (c.y - this.wh / 2) * p; return [W / 2 + (x - px) * zp, H / 2 + (y - py) * zp]; };
  World.prototype.light = function (o) { this.lt = o; };
  World.prototype.bloom = function (o) { this.bl = o; };
  // a prop: an svg picture (or a soft glow) in a layer. Its fields (x, y, w, h, op, rot, sx, sy, ox, oy) are set by the shot.
  World.prototype.add = function (layer, svg, o) {
    o = o || {};
    const sp = Object.assign({ layer: layer || 'cast', svg: svg || null, x: 0, y: 0, w: 100, h: 100, op: 1, rot: 0, sx: 1, sy: 1, ox: .5, oy: .5, blur: 0, glow: null, z: 0 }, o);
    const world = this;
    sp.make = function () { if (!sp.svg) return Promise.resolve(); const k = Math.min(RQ * 1.2 * (sp.blur ? .5 : 1), 2048 / Math.max(sp.w, sp.h)); const body = sp.svg.replace(/width="100%" height="100%"/, `width="${sp.w}" height="${sp.h}"`); return raster(svgDoc(sp.w, sp.h, body, world.pal, world.night, sp.blur), sp.w * k, sp.h * k).then(c => { sp.bmp = c; }); };
    this.sprites.push(sp); return sp;
  };
  // a puppet of the story (or opt.look for someone who is not in the cast)
  World.prototype.puppet = function (key, id, opt) {
    opt = opt || {};
    const c = opt.look ? { id: key, look: opt.look, color: opt.color || '#000' } : this.s.chars.find(x => x.id === id); if (!c) return null;
    const world = this;
    const P = { c, id, layer: opt.layer || 'cast', rod: opt.rod !== false, phase: opt.phase || (Object.keys(this.people).length * 1.37) % 4.6, lift: 0, st: null, bmps: {}, wait: {} };
    const svg = ART.puppet(c.look, c.color, { rod: P.rod });
    // the head, as a share of the height from the top (from the drawing: hats, hoods and children differ)
    try { const tmp = document.createElement('div'); tmp.style.cssText = 'position:absolute;left:-9999px;top:0;width:120px;height:250px;visibility:hidden'; tmp.innerHTML = svg; document.body.appendChild(tmp);
      const sv = tmp.querySelector('svg'); sv.style.width = '120px'; sv.style.height = '250px'; const g = sv.querySelector('.fig > g[transform]'), sr = sv.getBoundingClientRect(), gr = g.getBoundingClientRect();
      if (sr.height > 0 && gr.height > 0) { P.hc = (gr.top + gr.height * .55 - sr.top) / sr.height; P.ht = (gr.top - sr.top) / sr.height; } tmp.remove(); } catch (e) { }
    const body = svg.replace(/^<svg [^>]*>/, '<svg x="0" y="0" width="120" height="250" viewBox="0 0 120 250" class="pup" style="--cel:' + c.color + '">');
    // a bitmap of this puppet at about px pixels tall, with blur b (world pixels) painted in
    P.need = (b, px) => {
      const hb = [192, 320, 512, 768, 1024, 1400, 1800, 2400][[192, 320, 512, 768, 1024, 1400, 1800, 2400].findIndex(v => v >= px * (b ? .6 : 1)) >>> 0] || 2400;
      const key = b + '|' + hb;
      if (P.bmps[key] || P.wait[key]) return P.wait[key] || Promise.resolve();
      const sd = b ? b * 250 / Math.max(1, P.h || 1000) : 0;
      P.wait[key] = raster(svgDoc(120, 250, body, world.pal, world.night, sd ? Math.max(.15, sd) : 0), hb * 120 / 250, hb).then(cv => { if (cv) P.bmps[key] = cv; delete P.wait[key]; });
      return P.wait[key];
    };
    P.pick = (b, px) => {
      // the best bitmap we have now; ask for a better one if it is missing
      const want = [192, 320, 512, 768, 1024, 1400, 1800, 2400].find(v => v >= px * (b ? .6 : 1)) || 2400, k = b + '|' + want;
      if (P.bmps[k]) return P.bmps[k];
      P.need(b, px);
      let best = null, bd = 1e9;
      for (const kk in P.bmps) { const [bb, hh] = kk.split('|').map(Number); const d = Math.abs(bb - b) * 300 + Math.abs(hh - want) / 10 + (hh < want ? 50 : 0); if (d < bd) { bd = d; best = P.bmps[kk]; } }
      return best;
    };
    this.people[key] = P; return P;
  };
  // the middle of a puppet's head in the world, for feet at y and height h
  World.prototype.head = function (key, y, h) { const P = this.people[key]; return y - h * 236 / 250 + h * ((P && P.hc) || .3); };
  World.prototype.place = function (key, o, t) {
    const P = this.people[key]; if (!P) return;
    const h = o.h || 420, w = h * 120 / 250;
    const wk = o.walk ? Math.abs(Math.sin(t * Math.PI * 1.7 + P.phase)) : 0, hop = o.walk ? wk * h * .012 * o.walk : 0;
    const b = o.blur || 0, bq = b > 2 ? Math.max(3, Math.round(b / 3) * 3) : 0;   // blur in steps: each step is one bitmap
    const still = o.still || bq >= 3;
    const sw = still ? 0 : Math.sin((t + P.phase) / 4.6 * Math.PI * 2) * 1.1, sc = still ? 1 : 1 + .008 * (1 + Math.sin((t + P.phase) / 2.3 * Math.PI * 2));
    const lean = o.walk ? (o.face === -1 ? -1 : 1) * 2.2 * o.walk : 0;
    P.h = h; P.st = { x: o.x, y: o.y - hop, h, w, face: o.face === -1 ? -1 : 1, rot: sw + lean + (o.rot || 0), sc, op: o.op != null ? o.op : 1, b: bq, z: o.z != null ? o.z : o.y };
  };

  /* ---------- the theater ---------- */
  let host = null, cv = null, g = null, cur = null, old = null, raf = 0, talkAt = -1e9, ctx = null, seekT = null;
  let paperC = null, paperKey = '', sizeKey = '', grainP = null;
  const css = () => `#theater{position:absolute;inset:0;z-index:7;overflow:hidden;background:#000;opacity:0;transition:opacity .9s ease;pointer-events:none}
#theater.on{opacity:1}
#theater canvas{position:absolute;left:0;top:0}
body.th-full #cam,body.th-full #scrim,body.th-full #cineShade,body.th-full #cineBloom,body.th-full #cineSky,body.th-full #cineGrain,body.th-full #cineFg{visibility:hidden}`;
  function init() {
    if (host) return;
    const st = $('stage'); if (!st) return;
    const s = document.createElement('style'); s.textContent = css(); document.head.appendChild(s);
    host = el('div', null, null, st); host.id = 'theater';
    cv = el('canvas', null, null, host); g = cv.getContext('2d');
  }
  function view() {
    const s = $('stage').getBoundingClientRect(), d = $('dock');
    let vb = s.height, solid = false;
    if (d && !d.classList.contains('hide')) { const r = d.getBoundingClientRect(); if (r.top > s.top + 80 && r.top < s.bottom) { vb = r.top - s.top; const tb = $('tx'), tr = tb && !tb.classList.contains('hide') ? tb.getBoundingClientRect() : r; solid = tr.width > s.width * .9; } }
    return { w: s.width, h: s.height, vb, solid };
  }
  // where the 1920×1080 frame sits on the stage, keeping the shot's point of interest (fx,fy) in view
  function fit(fx, fy) {
    const v = view(), hh = v.solid ? v.vb : v.h, vcx = v.w / 2, vcy = v.vb * .5;
    let s = Math.max(v.w / W, hh / H);
    if (fy < H && !v.solid) s = Math.max(s, (hh - vcy) / (H - fy));
    s = Math.min(s, Math.max(v.w / W, hh / H) * 1.35);
    const x0 = clamp(vcx - s * fx, v.w - s * W, 0), y0 = clamp(vcy - s * fy, hh - s * H, 0);
    return { s, x0, y0, v, hh };
  }
  // the paper of the screen (colour and fibres), made once for each size and story
  function paper(pal, pw, ph) {
    const k = pal.paper + pw + 'x' + ph;
    if (paperKey === k && paperC) return paperC;
    paperKey = k; paperC = null;
    const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}"><filter id="f1"><feTurbulence type="fractalNoise" baseFrequency="${(.0125 / 1).toFixed(4)} ${(.03125).toFixed(4)}" numOctaves="4" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .42 0 0 0 0 .32 0 0 0 0 .22 0 0 0 .31 0"/></filter><filter id="f2"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 .42 0 0 0 0 .32 0 0 0 0 .22 0 0 0 .09 0"/></filter><rect width="100%" height="100%" fill="${pal.paper}"/><rect width="100%" height="100%" filter="url(#f1)"/><rect width="100%" height="100%" filter="url(#f2)"/></svg>`;
    raster(doc, pw, ph).then(c => { if (paperKey === k) paperC = c; });
    return null;
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  // draw one world into the frame (frame coordinates are set up on g)
  function drawWorld(w, alpha) {
    const pal = w.pal, lt = w.lt || {};
    g.save(); g.globalAlpha = alpha;
    // the paper with the lamp behind it
    const pc = paper(pal, Math.min(1600, Math.round(W * RQ * .7)), Math.min(900, Math.round(H * RQ * .7)));
    if (pc) g.drawImage(pc, 0, 0, W, H); else { g.fillStyle = pal.paper; g.fillRect(0, 0, W, H); }
    const lx = (lt.lx != null ? lt.lx : .5) * W, ly = (lt.ly != null ? lt.ly : .46) * H;
    const lamp = (lt.lamp != null ? lt.lamp : .95) * .42, ls = lt.ls || 1;
    if (lamp > .01) { const r = 1300 * ls, gr = g.createRadialGradient(lx, ly, 0, lx, ly, r); gr.addColorStop(0, rgba(pal.lamp, lamp)); gr.addColorStop(.22, rgba(pal.lamp, lamp * .55)); gr.addColorStop(.64, rgba(pal.lamp, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    if (lt.moon) { const gr = g.createRadialGradient(W * .72, H * .18, 0, W * .72, H * .18, W * .95); gr.addColorStop(0, '#dfe6f4'); gr.addColorStop(.25, pal.moon); gr.addColorStop(.62, pal.night); gr.addColorStop(1, pal.night); g.globalAlpha = alpha * lt.moon; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = alpha; }
    if ((lt.edge != null ? lt.edge : 1) > 0) { const gr = g.createRadialGradient(W / 2, H * .45, W * .3, W / 2, H * .45, W * .72); gr.addColorStop(0, 'rgba(40,20,6,0)'); gr.addColorStop(1, `rgba(40,20,6,${.5 * (lt.edge != null ? lt.edge : 1)})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    // the layers, far to near, each with its people and props
    const c = w.cam, cx0 = w.ww / 2, cy0 = w.wh / 2, k = W * 0;
    for (const L of w.layers) {
      g.save();
      const zp = 1 + (c.z - 1) * L.p, px = cx0 + (c.x - cx0) * L.p, py = cy0 + (c.y - cy0) * L.p;
      g.translate(W / 2, H / 2 + (w.shakeY || 0)); if (c.r) g.rotate(c.r * Math.PI / 180); g.scale(zp, zp); g.translate(-px, -py);
      if (L.bmp) g.drawImage(L.bmp, 0, L.y0 || 0, w.ww, L.hh || w.wh);
      const items = [];
      for (const id in w.people) { const P = w.people[id]; if (P.layer === L.name && P.st) items.push({ z: P.st.z, P }); }
      for (const sp of w.sprites) if (sp.layer === L.name) items.push({ z: sp.z || 0, sp });
      items.sort((a, b) => a.z - b.z);
      const onScreen = RQ * zp;
      for (const it of items) {
        if (it.P) {
          const P = it.P, s = P.st; if (s.op <= 0) continue;
          const bmp = P.pick(s.b, s.h * onScreen); if (!bmp) continue;
          g.save(); g.globalAlpha = alpha * s.op;
          g.translate(s.x, s.y - s.h * 236 / 250 + s.h * .944 - P.lift);
          g.scale(s.face, 1); g.rotate(s.rot * Math.PI / 180 * s.face); g.scale(1, s.sc);
          g.drawImage(bmp, -s.w / 2, -s.h * .944, s.w, s.h);
          g.restore();
        } else {
          const sp = it.sp; if (sp.op <= 0) continue;
          g.save(); g.globalAlpha = alpha * sp.op;
          g.translate(sp.x + sp.ox * sp.w, sp.y + sp.oy * sp.h); if (sp.rot) g.rotate(sp.rot * Math.PI / 180); g.scale(sp.sx, sp.sy);
          if (sp.glow) { const r = Math.max(sp.w, sp.h) / 2, gr = g.createRadialGradient(0, 0, 0, 0, 0, r); sp.glow.forEach(([o, col]) => gr.addColorStop(o, col)); g.translate((.5 - sp.ox) * sp.w, (.5 - sp.oy) * sp.h); g.fillStyle = gr; g.scale(sp.w / (2 * r), sp.h / (2 * r)); g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
          else if (sp.bmp) g.drawImage(sp.bmp, -sp.ox * sp.w, -sp.oy * sp.h, sp.w, sp.h);
          g.restore();
        }
      }
      g.restore();
    }
    // the light falling off away from the lamp, and the lamp's glow
    const d = lt.dark != null ? lt.dark : 0;
    if (d > 0) { const r = (lt.r || 75) / 100, tint = lt.tint || '26,12,4', rx = W * r * 1.25, gr = g.createRadialGradient(lx, ly, 0, lx, ly, rx);
      gr.addColorStop(0, `rgba(${tint},0)`); gr.addColorStop(.35, `rgba(${tint},${(d * .18).toFixed(3)})`); gr.addColorStop(.7, `rgba(${tint},${(d * .62).toFixed(3)})`); gr.addColorStop(1, `rgba(${tint},${d.toFixed(3)})`);
      g.save(); g.translate(lx, ly); g.scale(1, (H * r) / rx); g.translate(-lx, -ly); g.fillStyle = gr; g.fillRect(-W, -H * 2, W * 3, H * 5); g.restore(); }
    if (w.bl) { const b = w.bl, r = (b.r || 1400) / 2, x = b.x * W, y = b.y * H, gr = g.createRadialGradient(x, y, 0, x, y, r); const col = b.c || 'rgba(255,226,170,.5)'; gr.addColorStop(0, col); gr.addColorStop(.45, col.replace(/[\d.]+\)$/, m => (parseFloat(m) * .32).toFixed(3) + ')')); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = alpha * (b.a == null ? .35 : b.a); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    g.restore();
  }

  /* snow, in the frame's pixels */
  const flakeImg = (() => { const out = []; for (const b of [0, 1, 2]) { const c = document.createElement('canvas'), n = 32; c.width = c.height = n; const gg = c.getContext('2d'); const gr = gg.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2); gr.addColorStop(0, 'rgba(255,252,244,1)'); gr.addColorStop(b === 0 ? .55 : b === 1 ? .3 : .1, 'rgba(255,252,244,.85)'); gr.addColorStop(1, 'rgba(255,252,244,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, n, n); out.push(c); } return out; })();
  function makeSnow(o) {
    const r = rng(o.seed || 7), f = [];
    for (let i = 0; i < (o.n || 120); i++) { const d = r(); f.push({ x: r() * W, y: r() * H, d, v: lerp(30, 130, d) * (o.speed || 1), a: r() * 6.28, sw: lerp(8, 40, d), s: lerp(o.min || 2.5, o.max || 11, Math.pow(d, 2.2)), op: (o.op || .85) * (d > .85 ? .5 : .45 + d * .55) }); }
    return { f, o };
  }
  function drawSnow(list, t) {
    if (!list) return;
    for (const sn of list) {
      const o = sn.o, w = W, h = H + 60;
      for (let i = 0; i < sn.f.length; i += lite ? 2 : 1) { const p = sn.f[i];
        const y = ((p.y + p.v * t) % h + h) % h - 30; let x = p.x + Math.sin(t * .7 + p.a) * p.sw + (o.wind || 0) * t * (.5 + p.d); x = ((x % w) + w) % w;
        const S = p.s * (p.d > .85 ? 2.2 : 1);
        g.globalAlpha = p.op * (o.a == null ? 1 : o.a);
        g.drawImage(flakeImg[p.d > .85 ? 2 : p.d > .5 ? 1 : 0], x - S, y - S, S * 2, S * 2);
      }
    }
    g.globalAlpha = 1;
  }

  // a slow machine: when frames take too long, fewer frames and half the snow (decided once, kept)
  let lite = false, ema = 33, lastDraw = 0, pausedAt = 0;
  // drawn 30 times a second (the camera moves slowly), 20 once a shot has settled; not at all while the game is paused
  function tick(now) {
    raf = 0; if (!cur || !host.classList.contains('on')) return;
    if (document.body.classList.contains('paused') || document.hidden) { if (!pausedAt) pausedAt = now; setTimeout(() => { if (!raf && host.classList.contains('on')) raf = requestAnimationFrame(tick); }, 250); return; }
    if (pausedAt) { const d = now - pausedAt; cur.t0 += d; if (old) { old.t0 += d; old.at += d; } pausedAt = 0; lastDraw = 0; }
    raf = requestAnimationFrame(tick);
    if (!cur.ready) return;
    const settled = (now - cur.t0) > 14000 && now - talkAt > 400;
    const gap = 1000 / (lite || settled ? 20 : 30);
    if (lastDraw && now - lastDraw < gap - 4) return;
    if (lastDraw) { const dt = Math.min(250, now - lastDraw); ema = ema * .9 + dt * .1; if (!lite && (now - cur.t0) > 1500 && ema > 48) lite = true; }
    lastDraw = now; TH.draws = (TH.draws || 0) + 1;
    render(now);
  }
  function render(now) {
    const t = seekT != null ? seekT : (now - cur.t0) / 1000;
    const talk = Math.max(0, 1 - (now - talkAt) / 140);
    const r = cur.def.draw(cur.S, t, ctx, { talk, now }) || {};
    const F = fit(r.fx != null ? r.fx : W / 2, r.fy != null ? r.fy : H * .42), Rr = ratio();
    // the canvas covers what is visible of the stage, at a modest pixel ratio
    const cw = Math.round(F.v.w * Rr), chh = Math.round(F.hh * Rr), key = cw + 'x' + chh;
    if (key !== sizeKey) { cv.width = cw; cv.height = chh; cv.style.width = F.v.w + 'px'; cv.style.height = F.hh + 'px'; sizeKey = key; }
    const q = F.s * Rr; if (Math.abs(q - RQ) / RQ > .25) { RQ = q; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, cw, chh);
    g.setTransform(Rr * F.s, 0, 0, Rr * F.s, Rr * F.x0, Rr * F.y0);
    let black = r.black || 0;
    if (old) {
      const k = clamp((now - old.at) / (old.dur * 1000), 0, 1);
      if (old.kind === 'fade') { old.def.draw(old.S, (now - old.t0) / 1000, ctx, { talk: 0, now }); drawWorld(old.S.w, 1); drawSnow(old.r && old.r.snow, (now - old.t0) / 1000); drawWorld(cur.S.w, E.s(k)); drawSnow(r.snow, t); }
      else { if (k < .5) { old.def.draw(old.S, (now - old.t0) / 1000, ctx, { talk: 0, now }); drawWorld(old.S.w, 1); drawSnow(old.r && old.r.snow, (now - old.t0) / 1000); } else { drawWorld(cur.S.w, 1); drawSnow(r.snow, t); } black = Math.max(black, k < .5 ? E.s(k * 2) : 1 - E.s((k - .5) * 2)); }
      if (k >= 1) old = null;
    } else { drawWorld(cur.S.w, 1); drawSnow(r.snow, t); }
    cur.r = r;
    // the vignette of the lens, and black
    const vg = g.createRadialGradient(W / 2, H * .48, W * .33, W / 2, H * .48, W * .78); vg.addColorStop(0, 'rgba(6,3,1,0)'); vg.addColorStop(1, 'rgba(6,3,1,.6)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);
    if (black > 0) { g.globalAlpha = black; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    // film grain: one small tile of noise laid over the picture in screen pixels, shifted 12 times a second (plain drawing, no blending)
    if (!lite) {
      if (!grainP) { const c = document.createElement('canvas'); c.width = c.height = 192; const gg = c.getContext('2d'), im = gg.createImageData(192, 192), rr = rng(31);
        for (let i = 0; i < im.data.length; i += 4) { const v = rr() < .5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = Math.round(rr() * rr() * 34); }
        gg.putImageData(im, 0, 0); grainP = g.createPattern(c, 'repeat'); }
      const f = Math.floor(now / 83), ox = (f * 73) % 192, oy = (f * 131) % 192;
      g.setTransform(1, 0, 0, 1, -ox, -oy); g.globalAlpha = 1; g.fillStyle = grainP; g.fillRect(ox, oy, cv.width, cv.height); g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  // play a shot: tr = 'cut' | 'fade' (dissolve) | 'dip' (through black). The cut waits until its pictures are made.
  let seq = 0;
  function play(def, tr, dur) {
    init(); if (!host) return;
    const my = ++seq;
    const S = def.build(ctx) || {};
    const go = () => {
      if (my !== seq) return;
      const now = performance.now();
      if (cur && tr && tr !== 'cut' && cur.ready) old = Object.assign(cur, { kind: tr, at: now, dur: dur || (tr === 'dip' ? 1.2 : .8) }); else old = null;
      cur = { def, S, t0: now, ready: true };
      lastDraw = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    // the size the pictures are needed at: the frame's scale now
    const F = fit(W / 2, H * .42); RQ = F.s * ratio();
    const p = S.w ? S.w.prepare() : Promise.resolve();
    let done = false; const fin = () => { if (!done) { done = true; go(); } };
    p.then(fin); setTimeout(fin, 900);   // never wait more than a moment
    if (!cur) { cur = { def, S, t0: performance.now(), ready: false }; }
  }
  const TH = {
    W, H, E, clamp, lerp, seg, glide, noise1, flick, breath, rng, el, World, makeSnow,
    get on() { return !!(host && host.classList.contains('on')); },
    has(st) { return !!(root.WL_SHOTS && st && root.WL_SHOTS[st.id]); },
    start(c) {
      init(); if (!host) return;
      ctx = c; host.classList.add('on'); document.body.classList.add('th-on');
      clearTimeout(TH._full); TH._full = setTimeout(() => { if (TH.on) document.body.classList.add('th-full'); }, 1000);
      if (!raf) raf = requestAnimationFrame(tick);
    },
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
      setTimeout(() => { if (host.classList.contains('on')) return; cancelAnimationFrame(raf); raf = 0; cur = old = null; seq++; cv.width = cv.height = 1; sizeKey = ''; paperC = null; paperKey = ''; }, 1000);   // let the memory go
    },
    seek(t) { seekT = t; if (cur && cur.ready) render(performance.now()); },
  };
  root.WLTheater = TH;
})(typeof window !== "undefined" ? window : globalThis);
