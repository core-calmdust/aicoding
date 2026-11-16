/* =====================================================================
   Patolli on the 3D table — six boards and six sets of pieces (Table3D.BOARDS / PIECES.patolli; the ids are the 2D page's own
   designs, patolli/board2d.js BOARDS / PIECES, so one choice serves both views).
   The board is a mat / slab 9.92 × 9.92 with the X-shaped track painted (or woven, cut, inlaid) on it — the 2D page's picture in
   world units: 1 world unit = 100 units of the page's SVG (viewBox −500 … 500), x to the right, z towards the near player.
   The track comes from the engine's arm length (patolli/engine.js RULES[rule].arm: 'bell' 7 → 60 squares, 'popular' 6 → 52), so
   both rule sets are drawn by the same code. Everything is procedural (canvas textures + a normal map from a height canvas).
   Boards:  'petate' (the default) a woven palm mat with lines of black rubber · 'hide' a painted deerskin · 'stone' a slab with
            cut lines · 'codex' bark paper in flat colours · 'mosaic' turquoise tesserae with gold and red · 'night' a night sky.
   Pieces:  'pebble' (the default) red and blue pebbles · 'maize' red and blue maize kernels · 'obsidian' shell and obsidian ·
            'jade' red stone and jade beads · 'clay' terracotta and graphite discs · 'gold' gold and turquoise beads.
   Beans:   five black beans, a white dot on one face (beanUp turns the dot up or down).
   Registers into Table3D:
     Table3D.MODELS.patolli(live)    the board (+ a game in progress unless live)
     Table3D.patolli = { board(look, rule), piece(side, set, seed), bean(), beanUp(g, marked, yaw), beanIsUp(g), throwPlan(items, o),
                         gem(), heap(n) → [[x, y, z]…], geo(rule), LOOKS, SETS, PR, GR, BEAN }
     userData of a board: { top, S: 10, look, rule, u (one square, world units), xy(X, Y) → [x, z] (SVG units → world),
                            cell(r, c) → [x, z] (the engine's grid), tray(side, kind, k) → [x, z], spot(name) → [x, z] }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const LOOKS = ['petate', 'hide', 'stone', 'codex', 'mosaic', 'night'];
  const SETS = ['pebble', 'maize', 'obsidian', 'jade', 'clay', 'gold'];
  const SV = 992, W = SV / 100, HALF = 462, R2 = Math.SQRT2;   // the mat in SVG units / world units; the X reaches ±HALF
  const PR = .26, GR = .056, BEAN = [.3, .115, .19];           // piece radius, stake bead radius, the bean's half axes
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (p.emissive !== undefined) p.emissive = lin(p.emissive);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  /* ---------- the track (the engine's geometry; a small copy of its three functions for pages without the engine) ---------- */
  const ARM = { bell: 7, popular: 6 };
  function rules(rule) {
    const E = window.PatolliEngine, R = E && E.RULES && (E.RULES[rule] || E.RULES.bell);
    const a = R ? R.arm : (ARM[rule] || 7), seg = 2 * a + 1;
    return { arm: a, seg, N: 8 * a + 4 };
  }
  function kindQ(R, q) { const k = q % R.seg; return k === 0 ? 'c' : (k === R.arm || k === R.arm + 1) ? 'e' : (k === R.arm - 3 || k === R.arm + 4) ? 'p' : ''; }
  function rcOfQ(R, q) {
    const a = R.arm, s = Math.floor(q / R.seg), k = q % R.seg; let r, c;
    if (k === 0) { r = a; c = a; } else if (k <= a) { r = a - k; c = a; } else { r = k - a - 1; c = a + 1; }
    for (let t = 0; t < s; t++) { const nr = c, nc = 2 * a + 1 - r; r = nr; c = nc; }
    return [r, c];
  }
  // SVG units, as patolli/board2d.js: one square = u, the grid turned 45°
  function geo(rule) {
    const R = rules(rule), a = R.arm, u = HALF * R2 / (a + 2);
    return { R, a, u, cell: (r, c) => { const gx = c + .5 - (a + 1), gy = r + .5 - (a + 1); return [(gx - gy) * u / R2, (gx + gy) * u / R2]; } };
  }
  // the places off the track (patolli/board2d.js traySlot / trayBox / SPOT)
  const TP = 54, TX0 = 118;
  function traySlot(side, kind, k) {
    const sgn = side === 0 ? 1 : -1, cx = (kind === 'start' ? -TX0 : TX0) * sgn, col = k % 3, row = Math.floor(k / 3);
    return [cx + (col - 1) * TP * sgn, (422 - row * TP) * sgn];
  }
  const trayBox = (side, kind) => { const sgn = side === 0 ? 1 : -1, cx = (kind === 'start' ? -TX0 : TX0) * sgn; return { x: cx - 86, y: (side === 0 ? 422 - TP - 30 : -422 - 30), w: 172, h: TP + 60 }; };
  // the stakes: the heap stands where the 2D page draws its gems (beside / above the number)
  const SPOT = { gold0: [370, 168], gold1: [370, -168], pool: [356, -16], dock: [-370, -16] };
  const BEAN_AT = [[-47, -62], [47, -62], [0, 0], [-47, 62], [47, 62]];   // the five beans at rest, round the dock's middle
  function paths(rule) {
    const G = geo(rule), u = G.u, a = G.a, R = G.R, L = (a + 1) * u, rr = .82 * u;
    const plus = new Path2D(`M${-u} ${-u}V${-L + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}H${u - rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${-u}H${L - rr}a${rr} ${rr} 0 0 1 ${rr} ${rr}V${u - rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}H${u}V${L - rr}a${rr} ${rr} 0 0 1 ${-rr} ${rr}H${-u + rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}V${u}H${-L + rr}a${rr} ${rr} 0 0 1 ${-rr} ${-rr}V${-u + rr}a${rr} ${rr} 0 0 1 ${rr} ${-rr}Z`);
    let ln = `M0 ${-L}V${L}M${-L} 0H${L}`;
    for (let i = 1; i <= a; i++) { const d = i * u; ln += `M${-u} ${-d}H${u}M${-u} ${d}H${u}M${-d} ${-u}V${u}M${d} ${-u}V${u}`; }
    const ends = [], tri = new Path2D();
    for (let q = 0; q < R.N; q++) {
      const k = kindQ(R, q); if (k !== 'e' && k !== 'p') continue;
      const [r, c] = rcOfQ(R, q), x = (c - (a + 1)) * u, y = (r - (a + 1)) * u, cx = x + u / 2, cy = y + u / 2;
      if (k === 'e') { ends.push([cx, cy]); continue; }
      const vert = c === a || c === a + 1 ? (r < a || r > a + 1) : false; let p;
      if (vert) { const out = c === a ? x : x + u, inn = c === a ? x + u : x; p = [[out, y + u * .06], [out, y + u * .94], [inn - (c === a ? 1 : -1) * u * .1, cy]]; }
      else { const out = r === a ? y : y + u, inn = r === a ? y + u : y; p = [[x + u * .06, out], [x + u * .94, out], [cx, inn - (r === a ? 1 : -1) * u * .1]]; }
      tri.moveTo(p[0][0], p[0][1]); tri.lineTo(p[1][0], p[1][1]); tri.lineTo(p[2][0], p[2][1]); tri.closePath();
    }
    return { G, u, a, L, plus, ln: new Path2D(ln), ends, tri };
  }

  /* ---------- the six boards ---------- */
  // cell / line / mark / centre / end: the track's colours; ink: the trays' outline; th: thickness; rad: corner radius; bow: the edges
  // drawn in (a stretched hide); rough, cc: the top's material; nrm: the relief's strength; side: the edge's colour
  const LK = {
    petate: { cell: 'rgba(244,228,180,.26)', line: '#14100c', lw: .085, mark: '#14100c', centre: 'rgba(176,58,34,.36)', end: 'rgba(15,127,134,.3)', ink: '#2a1d10', th: .075, rad: .2, bow: 0, rough: .88, cc: 0, nrm: 2.2, side: '#a07a3c' },
    hide: { cell: 'rgba(244,220,178,.26)', line: '#541a10', lw: .07, mark: '#8a2214', centre: 'rgba(30,24,20,.36)', end: 'rgba(142,36,21,.28)', ink: '#2c160c', th: .05, rad: .75, bow: .1, rough: .8, cc: 0, nrm: 1.1, side: '#8a5c30' },
    stone: { cell: 'rgba(214,214,204,.15)', line: '#33322e', lw: .085, mark: '#3b3a36', centre: 'rgba(60,60,56,.28)', end: 'rgba(240,240,230,.18)', ink: '#22221f', th: .5, rad: .16, bow: 0, rough: .86, cc: 0, nrm: 2.6, side: '#7c7b74', incised: true },
    codex: { cell: '#f6efdc', line: '#1c1712', lw: .06, mark: '#b5351f', centre: '#e0b33e', end: '#2f8f95', ink: '#1c1712', th: .04, rad: .1, bow: 0, rough: .93, cc: 0, nrm: .9, side: '#cdbb92', flat: true },
    mosaic: { cell: '#2aa39f', line: '#071d20', lw: .085, mark: '#0b1f22', centre: '#deb24a', end: '#c44230', ink: '#e9fbf7', th: .34, rad: .2, bow: 0, rough: .26, cc: .55, nrm: 1.9, side: '#b8923c', tess: true },
    night: { cell: 'rgba(60,84,150,.24)', line: '#7fe6e0', lw: .05, mark: '#e0794f', centre: 'rgba(224,121,79,.36)', end: 'rgba(127,230,224,.28)', ink: '#dff7f5', th: .2, rad: .32, bow: 0, rough: .34, cc: .6, nrm: .5, side: '#121733', glow: true },
  };
  let noiseC = null;
  function noise() {
    if (noiseC) return noiseC;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), im = g.createImageData(256, 256), d = im.data, r = rng(7);
    for (let i = 0; i < d.length; i += 4) { const v = 90 + r() * 76 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); return (noiseC = c);
  }
  // grey noise laid over the whole canvas (px = the size of one noise pixel in canvas pixels)
  function grain(g, S, alpha, px, mode) {
    g.save(); g.setTransform(px, 0, 0, px, 0, 0); g.globalAlpha = alpha; g.globalCompositeOperation = mode || 'overlay';
    g.imageSmoothingEnabled = px > 1.5; g.fillStyle = g.createPattern(noise(), 'repeat'); g.fillRect(0, 0, S / px + 1, S / px + 1); g.restore();
  }
  function blotches(g, r, n, cols, a, r0, r1) {
    for (let i = 0; i < n; i++) {
      const x = (r() - .5) * SV, y = (r() - .5) * SV, rad = r0 + r() * (r1 - r0), gr = g.createRadialGradient(x, y, 0, x, y, rad), c = cols[i % cols.length];
      gr.addColorStop(0, c); gr.addColorStop(1, c.replace(/,1\)$/, ',0)')); g.globalAlpha = a * (.5 + r() * .5); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    g.globalAlpha = 1;
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // the woven mat: palm strips 13 units wide in a 2/2 twill, turned 45° (col: the colours; otherwise the heights)
  function weave(g, col) {
    const w = 13, n = Math.ceil(720 / w), C = ['#dcc283', '#d3b572', '#c9a862', '#e2ca8e', '#c39f58'];
    g.save(); g.rotate(Math.PI / 4);
    if (!col) { g.fillStyle = '#6c6c6c'; g.fillRect(-720, -720, 1440, 1440); }
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const x = i * w, y = j * w; if (Math.abs(x - y) > 730 || Math.abs(x + y) > 730) continue;
      const ph = (i + j) & 3, hor = ph < 2, id = hor ? j : i, tone = hash(id, hor ? 1.3 : 7.7), first = hor ? ph === 0 : ph === 2;
      if (col) {
        g.fillStyle = C[Math.floor(tone * C.length)]; g.fillRect(x, y, w + .4, w + .4);
        g.fillStyle = 'rgba(255,244,206,' + (.1 + hash(i, j) * .14).toFixed(3) + ')';
        if (hor) g.fillRect(x, y + w * .28, w, w * .36); else g.fillRect(x + w * .28, y, w * .36, w);
        g.fillStyle = 'rgba(84,56,18,.34)';
        if (hor) { g.fillRect(x, y, w, 1.2); g.fillRect(x, y + w - 1.2, w, 1.2); } else { g.fillRect(x, y, 1.2, w); g.fillRect(x + w - 1.2, y, 1.2, w); }
        g.fillStyle = 'rgba(70,44,12,.3)';   // where the strip dives under the next one
        if (hor) g.fillRect(first ? x : x + w - 2.6, y, 2.6, w); else g.fillRect(x, first ? y : y + w - 2.6, w, 2.6);
        g.fillStyle = 'rgba(96,66,24,.16)';   // the fibres
        const f = hash(i * 3.1, j * 5.3) * w * .6 + w * .2;
        if (hor) g.fillRect(x, y + f, w, .7); else g.fillRect(x + f, y, .7, w);
      } else {
        const b = (v, t0, t1) => { g.fillStyle = v; if (hor) g.fillRect(x, y + w * t0, w + .3, w * (t1 - t0)); else g.fillRect(x + w * t0, y, w * (t1 - t0), w + .3); };
        b('#7c7c7c', .1, .9); b('#929292', .22, .78); b('#a4a4a4', .36, .64);
        g.fillStyle = 'rgba(70,70,70,.75)';
        if (hor) g.fillRect(first ? x : x + w - 3, y, 3, w); else g.fillRect(x, first ? y : y + w - 3, w, 3);
      }
    }
    g.restore();
  }
  // small tiles (tesserae) over a box, in the current transform; col: colours, otherwise heights
  function tiles(g, x0, y0, x1, y1, sz, pal, gap, seed, col) {
    for (let y = y0, j = 0; y < y1 - .01; y += sz, j++) for (let x = x0, i = 0; x < x1 - .01; x += sz, i++) {
      const h = hash(i + seed * 13.7, j + seed * 3.1);
      if (col) g.fillStyle = pal[Math.floor(h * pal.length)]; else { const v = 132 + Math.floor(h * 44); g.fillStyle = `rgb(${v},${v},${v})`; }
      g.fillRect(x + gap, y + gap, sz - 2 * gap, sz - 2 * gap);
      if (col) { g.fillStyle = 'rgba(255,255,255,' + (.05 + hash(j, i + seed) * .1).toFixed(3) + ')'; g.fillRect(x + gap, y + gap, sz - 2 * gap, (sz - 2 * gap) * .35); }
    }
  }
  const TESS = { bg: ['#14353a', '#0f2a2e', '#173f45', '#0c2327', '#123036'], cell: ['#34b0ac', '#2aa39f', '#45bdb6', '#239089', '#57c7bd', '#1f8f9c', '#3fb3c0'], gold: ['#deb24a', '#c9982f', '#ecc869', '#d4a640'], red: ['#c44230', '#a8321f', '#d85a44', '#b53a28'], dark: ['#0b1f22', '#102a2e', '#0d2428'] };
  // the ground of each look (SVG units; S = the canvas size in pixels)
  function ground(g, S, look, col) {
    const r = rng(LOOKS.indexOf(look) * 97 + 11);
    if (!col) { g.fillStyle = '#808080'; g.fillRect(-500, -500, 1000, 1000); }
    if (look === 'petate') {
      weave(g, col);
      if (col) { grain(g, S, .22, 1.3); blotches(g, r, 14, ['rgba(120,84,30,1)', 'rgba(255,240,200,1)'], .1, 120, 300); }
      // the bound edge: a hem with stitches
      g.lineWidth = 15; g.strokeStyle = col ? '#8a652c' : '#9a9a9a'; rrect(g, -488.5, -488.5, 977, 977, 16); g.stroke();
      g.lineWidth = 10; g.strokeStyle = col ? '#6f4f20' : '#787878'; g.setLineDash([7, 5]); rrect(g, -488.5, -488.5, 977, 977, 16); g.stroke(); g.setLineDash([]);
    } else if (look === 'hide') {
      if (col) {
        g.fillStyle = '#bd8d56'; g.fillRect(-500, -500, 1000, 1000);
        blotches(g, r, 26, ['rgba(214,170,112,1)', 'rgba(140,94,48,1)', 'rgba(226,186,130,1)'], .3, 90, 280);
        g.strokeStyle = 'rgba(110,70,30,.2)'; g.lineWidth = 1.1;   // creases
        for (let i = 0; i < 22; i++) { const x = (r() - .5) * 940, y = (r() - .5) * 940, an = r() * 6.28, l = 60 + r() * 160; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an) * l * .5 + (r() - .5) * 50, y + Math.sin(an) * l * .5 + (r() - .5) * 50, x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); }
        grain(g, S, .34, 2.2); grain(g, S, .2, 1);
        const v = g.createRadialGradient(0, 0, 360, 0, 0, 720); v.addColorStop(0, 'rgba(90,50,16,0)'); v.addColorStop(1, 'rgba(90,50,16,.5)'); g.fillStyle = v; g.fillRect(-500, -500, 1000, 1000);
      } else { grain(g, S, .5, 2.2, 'source-over'); g.fillStyle = 'rgba(128,128,128,.55)'; g.fillRect(-500, -500, 1000, 1000); }
    } else if (look === 'stone') {
      if (col) {
        g.fillStyle = '#908f88'; g.fillRect(-500, -500, 1000, 1000);
        blotches(g, r, 30, ['rgba(176,175,166,1)', 'rgba(96,95,89,1)', 'rgba(150,146,132,1)'], .28, 60, 240);
        grain(g, S, .5, 2.6); grain(g, S, .4, 1);
        for (let i = 0; i < 2600; i++) { g.fillStyle = r() < .6 ? 'rgba(40,39,36,' + (.15 + r() * .3).toFixed(2) + ')' : 'rgba(255,255,250,' + (.12 + r() * .25).toFixed(2) + ')'; const s = .6 + r() * 1.8; g.fillRect((r() - .5) * 992, (r() - .5) * 992, s, s); }
      } else {
        grain(g, S, .9, 3, 'source-over'); g.fillStyle = 'rgba(128,128,128,.45)'; g.fillRect(-500, -500, 1000, 1000);
        for (let i = 0; i < 900; i++) { g.fillStyle = 'rgba(60,60,60,' + (.2 + r() * .4).toFixed(2) + ')'; const s = 1 + r() * 2.6; g.beginPath(); g.arc((r() - .5) * 992, (r() - .5) * 992, s, 0, 6.3); g.fill(); }   // pits
      }
    } else if (look === 'codex') {
      if (col) {
        g.fillStyle = '#ebe0c5'; g.fillRect(-500, -500, 1000, 1000);
        blotches(g, r, 24, ['rgba(246,238,216,1)', 'rgba(214,198,160,1)', 'rgba(226,212,178,1)'], .32, 80, 260);
        for (let i = 0; i < 900; i++) { const x = (r() - .5) * 992, y = (r() - .5) * 992, an = (r() - .5) * .9 + (r() < .3 ? 1.57 : 0), l = 14 + r() * 60; g.strokeStyle = 'rgba(120,96,52,' + (.05 + r() * .12).toFixed(3) + ')'; g.lineWidth = .5 + r() * .9; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); }   // bark fibres
        grain(g, S, .2, 1.6);
        g.lineWidth = 7; g.strokeStyle = '#b5351f'; g.strokeRect(-486, -486, 972, 972); g.lineWidth = 1.6; g.strokeStyle = '#1c1712'; g.strokeRect(-480, -480, 960, 960);
      } else {
        grain(g, S, .5, 1.6, 'source-over'); g.fillStyle = 'rgba(128,128,128,.6)'; g.fillRect(-500, -500, 1000, 1000);
        for (let i = 0; i < 500; i++) { const x = (r() - .5) * 992, y = (r() - .5) * 992, an = (r() - .5) * .9 + (r() < .3 ? 1.57 : 0), l = 14 + r() * 60; g.strokeStyle = 'rgba(170,170,170,.5)'; g.lineWidth = .8 + r(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke(); }
      }
    } else if (look === 'mosaic') {
      g.fillStyle = col ? '#06181a' : '#565656'; g.fillRect(-500, -500, 1000, 1000);
      g.save(); g.rotate(Math.PI / 4); tiles(g, -720, -720, 720, 720, 20, TESS.bg, 1.1, 1, col); g.restore();
      // a band of gold round the edge
      g.lineWidth = 16; g.strokeStyle = col ? '#06181a' : '#565656'; g.strokeRect(-488, -488, 976, 976);
      for (let k = 0; k < 4; k++) { g.save(); g.rotate(k * Math.PI / 2); tiles(g, -496, -496, 496, -480, 16, TESS.gold, 1, 5 + k, col); g.restore(); }
    } else {   // night
      if (col) {
        const v = g.createRadialGradient(-60, -80, 40, 0, 0, 760); v.addColorStop(0, '#1b2448'); v.addColorStop(.55, '#0e1228'); v.addColorStop(1, '#070917'); g.fillStyle = v; g.fillRect(-500, -500, 1000, 1000);
        blotches(g, r, 16, ['rgba(70,90,170,1)', 'rgba(110,70,150,1)'], .1, 120, 320);
        for (let i = 0; i < 620; i++) { const s = .5 + r() * r() * 1.9; g.fillStyle = `rgba(${220 + r() * 35 | 0},${230 + r() * 25 | 0},255,${(.3 + r() * .6).toFixed(2)})`; g.beginPath(); g.arc((r() - .5) * 992, (r() - .5) * 992, s, 0, 6.3); g.fill(); }
        g.shadowColor = '#bfe6ff'; g.shadowBlur = 9 * S / SV;
        for (let i = 0; i < 26; i++) { g.fillStyle = '#f4fbff'; g.beginPath(); g.arc((r() - .5) * 980, (r() - .5) * 980, 1.6 + r() * 1.4, 0, 6.3); g.fill(); }
        g.shadowBlur = 0; g.shadowColor = 'transparent';
        g.lineWidth = 3; g.strokeStyle = '#3d4a80'; rrect(g, -486, -486, 972, 972, 26); g.stroke();
      }
    }
  }
  // the places beside the track: where the waiting / finished pieces lie, the stakes in the middle, the place of the beans
  function places(g, K, col) {
    const ink = col ? K.ink : (K.incised ? '#5c5c5c' : '#787878');
    for (const sd of [0, 1]) for (const kind of ['start', 'goal']) {
      const b = trayBox(sd, kind); rrect(g, b.x, b.y, b.w, b.h, 18);
      if (col || K.incised) { g.globalAlpha = col ? .1 : .5; g.fillStyle = ink; g.fill(); }
      g.globalAlpha = col ? .34 : .6; g.strokeStyle = ink; g.lineWidth = 2.4; if (kind === 'start') g.setLineDash([6, 5]); g.stroke(); g.setLineDash([]);
    }
    g.beginPath(); g.arc(356, 0, 62, 0, 6.3);
    if (col || K.incised) { g.globalAlpha = col ? .1 : .5; g.fillStyle = ink; g.fill(); }
    g.globalAlpha = col ? .34 : .6; g.setLineDash([5, 5]); g.lineWidth = 2.4; g.strokeStyle = ink; g.stroke(); g.setLineDash([]);
    if (col) { g.globalAlpha = .07; rrect(g, -478, -125, 216, 250, 26); g.fillStyle = ink; g.fill(); }
    g.globalAlpha = 1;
  }
  function track(g, P, K, look, col, S) {
    const u = P.u, lw = K.lw * u, k = S / SV;
    g.save(); g.rotate(Math.PI / 4); g.lineJoin = 'round'; g.lineCap = 'round';
    const ends = fn => { for (const [cx, cy] of P.ends) { g.beginPath(); g.arc(cx, cy, u * .3, 0, 6.3); fn(); } };
    if (!col) {   // the relief
      if (K.tess) {
        g.save(); g.clip(P.plus); g.fillStyle = '#4a4a4a'; g.fillRect(-P.L, -P.L, 2 * P.L, 2 * P.L); const sz = u / 6;
        tiles(g, -P.L, -P.L, P.L, P.L, sz, null, sz * .09, 2, false); g.restore();
        g.strokeStyle = '#444'; g.lineWidth = lw * 1.5; g.stroke(P.plus); g.lineWidth = lw; g.stroke(P.ln);
      } else if (K.incised) {
        g.fillStyle = 'rgba(96,96,96,.55)'; g.fill(P.tri); ends(() => { g.fillStyle = 'rgba(104,104,104,.5)'; g.fill(); });
        for (const [w, c] of [[2.6, 'rgba(100,100,100,.5)'], [1.5, 'rgba(60,60,60,.7)'], [.7, '#262626']]) { g.strokeStyle = c; g.lineWidth = lw * 1.5 * w; g.stroke(P.plus); g.lineWidth = lw * w; g.stroke(P.ln); }
      } else if (look === 'petate') {   // the rubber stands a little proud of the weave
        g.fillStyle = 'rgba(150,150,150,.85)'; g.fill(P.tri);
        for (const [w, c] of [[1.25, 'rgba(150,150,150,.9)'], [.7, '#c2c2c2'], [.3, '#d8d8d8']]) { g.strokeStyle = c; g.lineWidth = lw * 1.5 * w; g.stroke(P.plus); g.lineWidth = lw * w; g.stroke(P.ln); }
      } else if (look === 'night') { g.strokeStyle = 'rgba(100,100,100,.6)'; g.lineWidth = lw * 1.2; g.stroke(P.plus); g.lineWidth = lw * .8; g.stroke(P.ln); }
      else { g.strokeStyle = 'rgba(112,112,112,.5)'; g.lineWidth = lw * 1.5; g.stroke(P.plus); g.lineWidth = lw; g.stroke(P.ln); }
      g.restore(); return;
    }
    if (K.flat || K.incised) { g.save(); g.translate(u * .04, u * .05); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = u * .2; g.stroke(P.plus); g.restore(); }
    if (K.tess) {
      const sz = u / 6, gap = sz * .09, box = (pal, seed) => tiles(g, -P.L, -P.L, P.L, P.L, sz, pal, gap, seed, true);
      g.save(); g.clip(P.plus); g.fillStyle = '#06282b'; g.fillRect(-P.L, -P.L, 2 * P.L, 2 * P.L); box(TESS.cell, 2);
      g.save(); g.beginPath(); g.rect(-u, -u, 2 * u, 2 * u); g.clip(); g.fillStyle = '#3a2a08'; g.fillRect(-u, -u, 2 * u, 2 * u); box(TESS.gold, 3); g.restore();
      g.save(); g.beginPath(); for (const [cx, cy] of P.ends) { g.moveTo(cx + u * .32, cy); g.arc(cx, cy, u * .32, 0, 6.3); } g.clip(); g.fillStyle = '#2a0c08'; g.fillRect(-P.L, -P.L, 2 * P.L, 2 * P.L); box(TESS.red, 4); g.restore();
      g.save(); g.clip(P.tri); g.fillStyle = '#03090a'; g.fillRect(-P.L, -P.L, 2 * P.L, 2 * P.L); box(TESS.dark, 6); g.restore();
      g.restore();
      g.strokeStyle = K.line; g.lineWidth = lw * 1.9; g.stroke(P.plus); g.lineWidth = lw; g.stroke(P.ln);
      g.strokeStyle = '#d6ad4c'; g.lineWidth = lw * .7; g.stroke(P.plus); g.lineWidth = lw * .5; g.stroke(P.tri);
      g.restore(); return;
    }
    g.fillStyle = K.cell; g.fill(P.plus);
    g.fillStyle = K.centre; g.fillRect(-u, -u, 2 * u, 2 * u);
    ends(() => { g.fillStyle = K.end; g.fill(); g.globalAlpha = K.glow ? .8 : .55; g.strokeStyle = K.line; g.lineWidth = u * .035; g.stroke(); g.globalAlpha = 1; });
    if (K.glow) { g.shadowColor = K.mark; g.shadowBlur = 7 * k; }
    g.fillStyle = K.mark; g.fill(P.tri);
    if (K.incised) { g.save(); g.translate(lw * .45, lw * .5); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = lw * 1.05; g.stroke(P.plus); g.lineWidth = lw * .7; g.stroke(P.ln); g.restore(); }
    if (K.glow) { g.shadowColor = K.line; g.shadowBlur = 8 * k; }
    g.strokeStyle = K.line; g.lineWidth = lw * 1.5; g.stroke(P.plus); g.lineWidth = lw; g.stroke(P.ln);
    if (K.glow) { g.shadowBlur = 0; g.shadowColor = 'transparent'; g.strokeStyle = '#eafffd'; g.lineWidth = lw * .5; g.stroke(P.plus); g.lineWidth = lw * .34; g.stroke(P.ln); }
    if (look === 'petate') {   // the rubber: a soft shine along one side, small uneven patches
      g.save(); g.translate(-lw * .22, -lw * .22); g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = lw * .28; g.stroke(P.plus); g.stroke(P.ln); g.restore();
    }
    g.restore();
  }
  // the top's colour map and its normal map, for one look and one rule set (the last two are kept; older ones are freed)
  const tops = new Map();
  function topTex(look, rule) {
    const key = look + '|' + rule; if (tops.has(key)) { const v = tops.get(key); tops.delete(key); tops.set(key, v); return v; }
    const TT = T(), K = LK[look], P = paths(rule);
    const S = SZ(LO() ? 1792 : 1536), c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), k = S / SV; g.setTransform(k, 0, 0, k, S / 2, S / 2);
    ground(g, S, look, true); places(g, K, true); track(g, P, K, look, true, S);
    if (look === 'hide' || look === 'codex') grain(g, S, look === 'hide' ? .14 : .08, 1.2);   // the paint takes the surface's grain
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    const NS = SZ(LO() ? 1024 : 1024), hc = document.createElement('canvas'); hc.width = hc.height = NS;
    const hg = hc.getContext('2d'), hk = NS / SV; hg.setTransform(hk, 0, 0, hk, NS / 2, NS / 2);
    ground(hg, NS, look, false); places(hg, K, false); track(hg, P, K, look, false, NS);
    const nm = new TT.CanvasTexture(normalFrom(hc, K.nrm)); nm.anisotropy = 4;
    const v = { map, nm };
    tops.set(key, v);
    while (tops.size > 2) { const [k0, v0] = tops.entries().next().value; tops.delete(k0); v0.map.dispose(); v0.nm.dispose(); if (mats['top' + k0]) { mats['top' + k0].dispose(); delete mats['top' + k0]; } }
    return v;
  }
  function normalFrom(hc, strength) {
    const Wd = hc.width, H = hc.height, src = hc.getContext('2d').getImageData(0, 0, Wd, H).data, h = new Float32Array(Wd * H);
    for (let i = 0; i < Wd * H; i++) h[i] = src[i * 4] / 255;
    const out = document.createElement('canvas'); out.width = Wd; out.height = H; const og = out.getContext('2d'), img = og.createImageData(Wd, H), d = img.data;
    for (let y = 0; y < H; y++) { const y0 = Math.max(0, y - 1) * Wd, y1 = Math.min(H - 1, y + 1) * Wd, yy = y * Wd;
      for (let x = 0; x < Wd; x++) {
        const dx = -(h[yy + Math.min(Wd - 1, x + 1)] - h[yy + Math.max(0, x - 1)]) * strength, dz = -(h[y1 + x] - h[y0 + x]) * strength, l = Math.hypot(dx, 1, dz), i = (yy + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      } }
    og.putImageData(img, 0, 0); return out;
  }

  /* ---------- the slab ---------- */
  const slabs = {};
  function slabGeo(look) {
    if (slabs[look]) return slabs[look];
    const TT = T(), K = LK[look], sh = new TT.Shape(), ra = K.rad, h = W / 2, a = h - ra, bow = K.bow, TH = K.th;
    // the four edges (bow: drawn in a little towards the middle, a hide stretched by its corners)
    sh.moveTo(-a, -h); sh.quadraticCurveTo(0, -h + 2 * bow, a, -h); sh.absarc(a, -a, ra, -Math.PI / 2, 0, false);
    sh.quadraticCurveTo(h - 2 * bow, 0, h, a); sh.absarc(a, a, ra, 0, Math.PI / 2, false);
    sh.quadraticCurveTo(0, h - 2 * bow, -a, h); sh.absarc(-a, a, ra, Math.PI / 2, Math.PI, false);
    sh.quadraticCurveTo(-h + 2 * bow, 0, -h, -a); sh.absarc(-a, -a, ra, Math.PI, Math.PI * 1.5, false);
    const bv = Math.min(.05, TH * .34), g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: LO() ? 2 : 3, curveSegments: LO() ? 8 : 14, steps: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale(W / (W + 2 * bv), 1, W / (W + 2 * bv));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count), rough = look === 'stone';
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      if (side[i]) UV.setXY(i, (x + z) / 2.6, P.getY(i) / Math.max(.2, TH) * .5); else UV.setXY(i, x / W + .5, .5 - z / W);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    if (rough) g.userData.rough = true;
    return (slabs[look] = g);
  }
  function sideTex(look) {
    return mat('sideT' + look, () => {
      const TT = T(), c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = LK[look].side; g.fillRect(0, 0, 128, 128); grain(g, 128, look === 'stone' ? .5 : .25, 1);
      if (look === 'petate') { g.fillStyle = 'rgba(60,40,10,.35)'; for (let x = 0; x < 128; x += 8) g.fillRect(x, 0, 1.5, 128); }
      const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.wrapS = t.wrapT = TT.RepeatWrapping; t.repeat.set(4, 1); return t;
    });
  }
  const lookNow = () => { const B = X.BOARDS && X.BOARDS.patolli; return B ? B.get() : 'petate'; };
  const setNow = () => { const P = X.PIECES && X.PIECES.patolli; return P ? P.get() : 'pebble'; };
  function board(look, rule) {
    look = LOOKS.includes(look) ? look : lookNow(); rule = ARM[rule] ? rule : 'bell';
    const TT = T(), g = new TT.Group(), K = LK[look], tx = topTex(look, rule), key = look + '|' + rule, G = geo(rule);
    const topM = mat('top' + key, () => phys(Object.assign({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: '#ffffff', roughness: K.rough, metalness: 0, envMapIntensity: K.cc ? .9 : .6 },
      K.cc ? { clearcoat: K.cc, clearcoatRoughness: .28 } : {}, K.glow ? { emissive: '#ffffff', emissiveMap: tx.map, emissiveIntensity: .55 } : {})));
    const sideM = mat('side' + look, () => phys({ map: sideTex(look), color: '#ffffff', roughness: Math.min(.95, K.rough + .08), metalness: look === 'mosaic' ? .7 : 0, envMapIntensity: .7 }));
    const slab = new TT.Mesh(slabGeo(look), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    const xy = (x, y) => [x / 100, y / 100];
    g.userData = { S: 10, top: K.th + .002, W, look, rule, sink: 0, u: G.u / 100, xy,
      cell: (r, c) => { const p = G.cell(r, c); return xy(p[0], p[1]); },
      tray: (side, kind, k) => { const p = traySlot(side, kind, k); return xy(p[0], p[1]); },
      spot: n => { const p = SPOT[n] || [0, 0]; return xy(p[0], p[1]); },
      beanAt: i => xy(SPOT.dock[0] + BEAN_AT[i % 5][0], SPOT.dock[1] + BEAN_AT[i % 5][1]),
      piece: (side, set, seed) => piece(side, set, seed) };
    return g;
  }

  /* ---------- the pieces ---------- */
  const geos = {};
  function geom(kind) {
    const k = kind + (LO() ? 'lo' : 'hi'); if (geos[k]) return geos[k];
    const TT = T(), V2 = (x, y) => new TT.Vector2(x, y), seg = LO() ? 16 : 22; let g;
    if (kind === 'pebble') {   // a river pebble: a flattened ball, a little uneven
      g = new TT.SphereGeometry(PR, seg, LO() ? 10 : 14); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + .07 * Math.sin(x * 9 + 1) * Math.cos(z * 8 - .5) + .04 * Math.sin(y * 13 + z * 5); P.setXYZ(i, x * n, y * .5 * (1 + .06 * Math.sin(x * 7 + z * 6)), z * .9 * n); }
      g.translate(0, PR * .47, 0);
    } else if (kind === 'kernel') {   // a maize kernel lying flat: broad at the crown (+z), narrow at the tip (−z; the sphere's poles lie on z)
      g = new TT.SphereGeometry(PR, seg, LO() ? 10 : 14); g.rotateX(Math.PI / 2); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), s = (z / PR + 1) / 2, e = s * s * (3 - 2 * s), dent = z > PR * .2 ? .12 * Math.exp(-(x * x) / (PR * PR * .12)) * (z / PR - .2) : 0;
        P.setXYZ(i, x * (.46 + .5 * e), y * (.3 + .2 * e) * (1 - dent * (y > 0 ? 2.2 : 0)), z * 1.08); }
      g.translate(0, PR * .44, 0);
    } else if (kind === 'flake') {   // knapped obsidian: a faceted flake
      g = new TT.IcosahedronGeometry(PR, 1); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), n = 1 + .12 * (hash(Math.round(x * 40), Math.round(z * 40) + Math.round(y * 40) * 7) - .5); P.setXYZ(i, x * n, y * .4, z * .92 * n); }
      g.translate(0, PR * .38, 0);
    } else if (kind === 'shell') {   // a disc cut from shell: a low lens with a turned rim
      const h = PR * .34, pts = [V2(0, h), V2(PR * .5, h * .97), V2(PR * .8, h * .82), V2(PR * .95, h * .55), V2(PR, h * .3), V2(PR * .96, h * .08), V2(PR * .86, 0), V2(0, 0)];
      g = new TT.LatheGeometry(pts.reverse(), seg);
    } else if (kind === 'bead') {   // a drilled bead: a fat ring
      const rc = PR * .6, a = PR * .4, b = PR * .31, pts = [], n = LO() ? 10 : 14;
      for (let i = 0; i <= n; i++) { const f = -Math.PI / 2 + i / n * Math.PI * 2; pts.push(V2(rc + a * Math.cos(f), b + b * Math.sin(f))); }
      g = new TT.LatheGeometry(pts, seg);
    } else if (kind === 'disc') {   // a fired clay disc with a cut ring and a small hollow in the middle
      const h = PR * .3, pts = [V2(0, h * .78), V2(PR * .16, h * .8), V2(PR * .22, h), V2(PR * .54, h), V2(PR * .59, h * .8), V2(PR * .66, h * .8), V2(PR * .71, h), V2(PR * .9, h), V2(PR * .985, h * .78), V2(PR, h * .3), V2(PR * .93, 0), V2(0, 0)];
      g = new TT.LatheGeometry(pts.reverse(), seg);
    } else if (kind === 'bean') {   // a fat bean, a little bent
      g = new TT.SphereGeometry(1, LO() ? 14 : 20, LO() ? 10 : 14); const P = g.attributes.position;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i); P.setXYZ(i, x * BEAN[0], y * BEAN[1] * (1 + .12 * (1 - x * x)), z * BEAN[2] - .035 * (1 - x * x) + .012); }
    } else {   // gem: a turquoise bead of the stakes
      g = new TT.SphereGeometry(GR, LO() ? 8 : 12, LO() ? 6 : 8);
    }
    if (!g.parameters || g.type !== 'LatheGeometry') smooth(g);
    if (X.share) X.share(g); return (geos[k] = g);
  }
  // normals after bending a sphere: the same on both sides of its seam and round its poles (no visible line)
  function smooth(g) {
    g.computeVertexNormals();
    const P = g.attributes.position, N = g.attributes.normal, M = new Map();
    for (let i = 0; i < P.count; i++) { const k = Math.round(P.getX(i) * 2e4) + ',' + Math.round(P.getY(i) * 2e4) + ',' + Math.round(P.getZ(i) * 2e4); let a = M.get(k); if (!a) M.set(k, a = [0, 0, 0, []]); a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); a[3].push(i); }
    for (const a of M.values()) { const l = Math.hypot(a[0], a[1], a[2]) || 1; for (const i of a[3]) N.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    N.needsUpdate = true;
  }
  // a small light texture of speckles and veins (the colour of the material tints it)
  function stoneTex(veins) {
    return mat('stT' + (veins ? 1 : 0), () => {
      const TT = T(), c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = rng(veins ? 5 : 3);
      g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 128, 128); grain(g, 128, .5, 1);
      for (let i = 0; i < 120; i++) { g.fillStyle = r() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(r() * 128, r() * 128, .4 + r() * 1.3, 0, 6.3); g.fill(); }
      if (veins) { g.strokeStyle = 'rgba(40,24,8,.55)'; for (let i = 0; i < 9; i++) { g.lineWidth = .6 + r() * 1.2; g.beginPath(); let x = r() * 128, y = r() * 128; g.moveTo(x, y); for (let s = 0; s < 5; s++) { x += (r() - .5) * 50; y += (r() - .5) * 50; g.lineTo(x, y); } g.stroke(); } }
      const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.wrapS = t.wrapT = TT.RepeatWrapping; return t;
    });
  }
  // a maize kernel: the body's colour, pale at the tip (v along the kernel)
  function kernelTex(col) {
    return mat('knT' + col, () => {
      const TT = T(), c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, col); gr.addColorStop(.62, col); gr.addColorStop(.82, '#e8c98a'); gr.addColorStop(1, '#f4e6c0'); g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
      const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; return t;
    });
  }
  // per set: [shape, colour] of side 0 and side 1, then the material (roughness, metalness, clearcoat, env) of each
  const PS = {
    pebble: { sh: ['pebble', 'pebble'], c: ['#c63a2a', '#2c62c8'], m: [[.3, 0, .55, 1], [.3, 0, .55, 1]], tex: 0 },
    maize: { sh: ['kernel', 'kernel'], c: ['#b8382c', '#3a4698'], m: [[.36, 0, .35, .9], [.36, 0, .35, .9]] },
    obsidian: { sh: ['shell', 'flake'], c: ['#f1e8d6', '#17181d'], m: [[.24, 0, 1, 1.2], [.07, 0, 1, 1.5]] },
    jade: { sh: ['bead', 'bead'], c: ['#c8442e', '#3fae7a'], m: [[.3, 0, .6, 1], [.16, 0, .9, 1.3]], tex: 0 },
    clay: { sh: ['disc', 'disc'], c: ['#c4743f', '#4c545e'], m: [[.95, 0, 0, .4], [.5, .3, 0, .8]], tex: 0 },
    gold: { sh: ['bead', 'bead'], c: ['#e6b63c', '#20a9aa'], m: [[.26, 1, 0, 1.3], [.38, 0, .35, 1]], tex: 0 },
  };
  function pieceMat(side, set) {
    const S = PS[set], m = S.m[side], TT = T();
    return mat('pc' + set + side, () => {
      const o = { color: S.c[side], roughness: m[0], metalness: m[1], envMapIntensity: m[3] };
      if (m[2]) { o.clearcoat = m[2]; o.clearcoatRoughness = .12; }
      if (S.sh[side] === 'kernel') { o.map = kernelTex(S.c[side]); o.color = '#ffffff'; }
      else if (S.tex !== undefined && !(set === 'gold' && side === 0)) o.map = stoneTex(S.tex === 1);
      if (S.sh[side] === 'flake') o.flatShading = true;
      const M = phys(o);
      if (set === 'obsidian' && side === 0 && M.isMeshPhysicalMaterial && 'iridescence' in M) { M.iridescence = .55; M.iridescenceIOR = 1.6; }
      return M;
    });
  }
  // side 0 the near player / 1 the far player; seed: each pebble a little different (its turn and its size)
  function piece(side, set, seed) {
    set = SETS.includes(set) ? set : setNow(); side = side ? 1 : 0; seed = seed | 0;
    const TT = T(), g = new TT.Group(), S = PS[set], sh = S.sh[side];
    const m = new TT.Mesh(geom(sh), pieceMat(side, set)); m.castShadow = m.receiveShadow = true;
    const h1 = hash(seed + 1, side * 5 + 2), h2 = hash(seed * 3 + 2, side + 9);
    if (sh === 'pebble' || sh === 'flake') { m.rotation.y = h1 * 6.28; m.scale.set(.95 + h2 * .1, .9 + h1 * .22, 1.02 - h2 * .1); }
    else if (sh === 'kernel') { m.rotation.y = (h1 - .5) * 1.2 + (side ? Math.PI : 0); }
    g.add(m);
    g.userData = { side, set, h: sh === 'pebble' ? PR * .94 : sh === 'bead' ? PR * .62 : PR * .4, r: PR };
    return g;
  }

  /* ---------- the beans ---------- */
  function beanMat() {
    return mat('bean', () => {
      const TT = T(), c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#1b1511'; g.fillRect(0, 0, 8, 128); g.fillStyle = '#f7f1df'; g.fillRect(0, 0, 8, 15);   // the dot: the cap round the top pole
      g.fillStyle = '#3a2f26'; g.fillRect(0, 15, 8, 1.5);
      const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.generateMipmaps = false; t.minFilter = TT.LinearFilter;
      return phys({ map: t, color: '#ffffff', roughness: .3, metalness: 0, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: 1 });
    });
  }
  function bean() {
    const TT = T(), g = new TT.Group(), m = new TT.Mesh(geom('bean'), beanMat()); m.castShadow = m.receiveShadow = true; g.add(m);
    g.userData = { rest: BEAN[1] * 1.08 }; return g;
  }
  // the dot (the top pole) up or down, turned by yaw on the mat
  function beanUp(g, marked, yaw) {
    const TT = T(), q = new TT.Quaternion().setFromAxisAngle(new TT.Vector3(0, 1, 0), yaw || 0);
    if (!marked) q.multiply(new TT.Quaternion().setFromAxisAngle(new TT.Vector3(1, 0, 0), Math.PI));
    g.quaternion.copy(q); return g;
  }
  function beanIsUp(g) { return new (T().Vector3)(0, 1, 0).applyQuaternion(g.quaternion).y > .7 ? 1 : 0; }
  // the throw (the motion of atlas/models/ur-dice.js): each bean flies in, tumbles, hops twice and lies still on its rolled face
  //   items: [{ g (the group on the mat), d (the bean inside it), sh (its contact shadow), from: [x, z], to: [x, z], marked, rest, yaw }]
  function throwPlan(items, o) {
    o = o || {};
    const TT = T(), dur = o.dur || 900, qt = new TT.Quaternion(), tmp = new TT.Object3D();
    const plan = items.map((it, i) => {
      beanUp(tmp, !!it.marked, it.yaw != null ? it.yaw : Math.random() * Math.PI * 2); const qf = tmp.quaternion.clone();
      const ax = new TT.Vector3(Math.random() - .5, Math.random() * .3, Math.random() - .5).normalize(), spin = (2.5 + Math.random() * 2) * Math.PI;
      return Object.assign({ qf, ax, spin, h0: (o.h0 || 1.3) + Math.random() * .5, delay: i * 40 + Math.random() * 50, sk: .45, hit: false }, it);
    });
    const total = dur + 260;
    const hAt = q => q < .42 ? 1 - (q / .42) * (q / .42) : q < .66 ? .22 * Math.sin((q - .42) / .24 * Math.PI) : q < .82 ? .07 * Math.sin((q - .66) / .16 * Math.PI) : 0;
    const place = (p, x, z, hh) => {
      p.g.position.x = x; p.g.position.z = z; p.d.position.y = p.rest + hh;
      if (p.sh) { const s2 = 1 + hh * .5; p.sh.scale.set(s2, s2, s2); p.sh.material.opacity = p.sk / (1 + hh * 1.5); }
    };
    return {
      total, plan,
      frame(tms) {
        for (let i = 0; i < plan.length; i++) {
          const p = plan[i], q = Math.min(1, Math.max(0, (tms - p.delay) / dur)), e = 1 - Math.pow(1 - q, 2.2);
          const hh = q < .42 ? p.h0 * hAt(q) : hAt(q) * p.h0 * .45;
          place(p, p.from[0] + (p.to[0] - p.from[0]) * e, p.from[1] + (p.to[1] - p.from[1]) * e, hh);
          qt.setFromAxisAngle(p.ax, p.spin * Math.pow(1 - q, 1.6)); p.d.quaternion.copy(qt).multiply(p.qf);
          if (q >= .42 && !p.hit) { p.hit = true; if (o.onHit) try { o.onHit(i, .6 + Math.random() * .5); } catch (x) {} }
        }
      },
      end() { for (const p of plan) { p.d.quaternion.copy(p.qf); place(p, p.to[0], p.to[1], 0); } },
    };
  }

  /* ---------- the stakes: a heap of turquoise beads ---------- */
  function gem() {
    const m = new (T().Mesh)(geom('gem'), mat('gem', () => phys({ color: '#27b4ae', roughness: .22, metalness: 0, clearcoat: .7, clearcoatRoughness: .15, envMapIntensity: 1.2 })));
    m.castShadow = true; return m;
  }
  // where the beads of a heap lie (the first ones in the middle of the bottom layer; three layers, 37 at most)
  let HEAP = null;
  function heap(n) {
    if (!HEAP) {
      const d = GR * 2.02, s3 = Math.sqrt(3) / 2, key = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
      let L = []; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const x = (i + j * .5) * d, z = j * s3 * d; if (Math.hypot(x, z) <= d * 2.01) L.push([x, z]); }
      HEAP = [];
      for (let lay = 0; lay < 3 && L.length; lay++) {
        L.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
        L.forEach(p => HEAP.push([p[0], GR + lay * d * .816, p[1]]));
        const S = new Set(L.map(key)), N = [];   // the next layer: over the hollows of the triangles that point the same way
        for (const p of L) if (S.has(key([p[0] + d, p[1]])) && S.has(key([p[0] + d / 2, p[1] + s3 * d]))) N.push([p[0] + d / 2, p[1] + s3 * d / 3]);
        const cx = N.reduce((a, p) => a + p[0], 0) / (N.length || 1), cz = N.reduce((a, p) => a + p[1], 0) / (N.length || 1);
        L = N.filter(p => Math.hypot(p[0] - cx, p[1] - cz) <= d * (1.6 - lay * .5));
      }
    }
    return HEAP.slice(0, Math.max(0, Math.min(HEAP.length, n | 0)));
  }

  X.MODELS.patolli = function (live) {
    const TT = T(), g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress (Bell's reconstruction): pieces on the track, in the trays, the beans thrown (a 3), the stakes
    const E = window.PatolliEngine, set = setNow();
    const put = (side, k, x, z) => { const p = piece(side, set, k); p.position.set(x, Y, z); g.add(p); const sh = X.contact(PR * .95, .45); sh.position.set(x, Y + .002, z); g.add(sh); };
    const G = geo(U.rule), R = G.R, on = [[3, 12, 26, 41], [5, 18, 37]];
    on.forEach((list, side) => list.forEach((i, k) => {
      const q = E ? E.qOf(E.RULES[U.rule], side, i, 1) : ((([2, 0][side]) * R.seg + i) % R.N), rc = rcOfQ(R, q), p = U.cell(rc[0], rc[1]); put(side, k, p[0], p[1]);
    }));
    [[0, 'start', 2, 4], [1, 'start', 2, 4], [1, 'goal', 1, 7]].forEach(([side, kind, n, k0]) => { for (let k = 0; k < n; k++) { const p = U.tray(side, kind, k); put(side, k0 + k, p[0], p[1]); } });
    [1, 0, 1, 1, 0].forEach((v, i) => { const b = bean(), p = U.beanAt(i); beanUp(b, !!v, i * 1.9 + .4); b.position.set(p[0], Y + b.userData.rest, p[1]); g.add(b); });
    [['gold0', 15], ['gold1', 17], ['pool', 8]].forEach(([n, c]) => { const p = U.spot(n); heap(c).forEach(q => { const m = gem(); m.position.set(p[0] + q[0], Y + q[1], p[1] + q[2]); g.add(m); }); });
    return g;
  };
  X.patolli = { board, piece, bean, beanUp, beanIsUp, throwPlan, gem, heap, geo, traySlot, LOOKS, SETS, PR, GR, BEAN, W: () => W };
})();
