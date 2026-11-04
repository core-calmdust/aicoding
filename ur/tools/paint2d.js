/* =====================================================================
   Royal Game of Ur — 2D painter (bakes the images used by ur/board2d.js)
   Run by ur/tools/bake2d.py in headless Chrome (canvas 2D). Not loaded by the game.
     UrPaint2D.board(design, orient, upx) → canvas   (board top + visible box sides + drop shadow)
     UrPaint2D.piece(design, side, n)     → canvas   (one piece, seen from above, n×n px)
   Every surface is painted in three passes — albedo, height, specular — and lit
   from the top left (normals from the height map, ambient occlusion, a dull sheen),
   so the inlay stands up from the bitumen, the engraving sinks into the shell, etc.
   Geometry (board units: 1 = one square; x right, y down, row 0 = y −1) matches
   atlas/models/ur.js and board2d.js (user units = 100 × board units).
   ===================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const P = .84, MG = .34, BM = MG / 2, X0 = 4.26, Z0 = 1.76, XB = .26, XS = 1.74, ZB = .76, HS = .22;
  const OUT = [[-X0, -Z0], [XB, -Z0], [XB, -ZB], [XS, -ZB], [XS, -Z0], [X0, -Z0], [X0, Z0], [XS, Z0], [XS, ZB], [XB, ZB], [XB, Z0], [-X0, Z0]];
  const FIELDS = [[-3.92, -1.42, -.08, 1.42], [-.08, -.42, 2.08, .42], [2.08, -1.42, 3.92, 1.42]];
  const OUTER = ['rosette', 'eyes', 'circles5', 'eyes', null, null, 'rosette', 'zig5'];
  const MID = ['dotgrid', 'circles5', 'dots4', 'rosette', 'circles5', 'dots4', 'eyes', 'circles5'];
  const exists = (r, c) => r === 1 || c < 4 || c > 5;
  const motif = (r, c) => (r === 1 ? MID[c] : OUTER[c]) || null;
  const CELLS = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (exists(r, c)) CELLS.push([r, c]);
  const pt = (r, c) => [c - 3.5, r - 1];
  // image rectangles in the SVG user space (must match board2d.js)
  const IMG = { h: [-452, -202, 904, 426], v: [-202, -452, 404, 926] };

  /* ---------- deterministic randomness (pass-independent) ---------- */
  const hs = (a, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7 + 1.3) * 43758.5453; return x - Math.floor(x); };
  function makeNoise(seed) {
    const Pm = new Uint8Array(512); let x = seed * 9301 + 49297 | 0;
    for (let i = 0; i < 256; i++) Pm[i] = i;
    for (let i = 255; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [Pm[i], Pm[j]] = [Pm[j], Pm[i]]; }
    for (let i = 0; i < 256; i++) Pm[i + 256] = Pm[i];
    const f = t => t * t * (3 - 2 * t), h = (i, j) => Pm[Pm[i & 255] + (j & 255)] / 255;
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = f(xf), v = f(yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
    return (x, y, oct = 4) => { let s = 0, a = .5, fr = 1; for (let o = 0; o < oct; o++) { s += a * n(x * fr, y * fr); a *= .5; fr *= 2; } return s / (1 - Math.pow(.5, oct)); };
  }
  // seamless: integer frequencies wrap (the lattice repeats every 256, so scale·2^o must divide it → use powers of two)
  const tileN = (N, sc, oct) => (u, v) => { const a = N(u * sc, v * sc, oct), b = N((u - 1) * sc, v * sc, oct), c = N(u * sc, (v - 1) * sc, oct), e = N((u - 1) * sc, (v - 1) * sc, oct);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v; };
  const cl = v => Math.max(0, Math.min(255, v));
  const SW = {};
  function swatch(key, n, f) {
    if (SW[key]) return SW[key];
    const c = cv(n, n), g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = f(x / n, y / n, x, y), i = (y * n + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (SW[key] = c);
  }
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function pat(g, c, unitsPerPx, ox = 0, oy = 0, rot = 0) {
    const p = g.createPattern(c, 'repeat'); let m = new DOMMatrix(); m = m.translate(ox, oy); if (rot) m = m.rotate(rot); p.setTransform(m.scale(unitsPerPx)); return p;
  }

  /* ---------- material swatches (rgb) ---------- */
  const SWT = {
    shell: (vivid) => { const N = makeNoise(vivid ? 12 : 11), f1 = tileN(N, 4, 4), f2 = tileN(N, 32, 2), f3 = tileN(N, 2, 2), f4 = tileN(N, 8, 2);
      return swatch('shell' + vivid, 384, (u, v) => { const m = f1(u, v) - .5, fine = f2(u, v) - .5, w = f3(u, v), band = Math.sin((v * 6 + w * 3) * TAU) * .5 + .5;
        // the growth lines of the shell: fine, slightly wavy stripes, bunched in places
        const gl = Math.sin((v * 46 + w * 9 + f4(u, v) * 2.5) * TAU), gl2 = Math.sin((v * 110 + w * 20) * TAU), lines = (gl > .55 ? (gl - .55) * 2.2 : 0) + (gl2 > .7 ? (gl2 - .7) * 1.2 : 0);
        const t = m * (vivid ? 20 : 36) + fine * 12 + band * 8 - lines * (vivid ? 9 : 16);
        return vivid ? [cl(244 + t * .6), cl(236 + t * .62), cl(218 + t * .6)] : [cl(230 + t), cl(219 + t * .97), cl(188 + t * .92 - band * 8)]; }); },
    lapis: (vivid) => { const N = makeNoise(vivid ? 24 : 23), f1 = tileN(N, 4, 4), f2 = tileN(N, 64, 1), f3 = tileN(N, 16, 2);
      return swatch('lapis' + vivid, 256, (u, v) => { const m = f1(u, v) - .5, fine = f2(u, v) - .5, fl = f3(u, v);
        let rgb = vivid ? [cl(30 + m * 26 + fine * 30), cl(56 + m * 36 + fine * 40), cl(178 + m * 50 + fine * 50)] : [cl(36 + m * 40 + fine * 30), cl(48 + m * 50 + fine * 36), cl(118 + m * 76 + fine * 52)];
        if (fl > .74) { const k = Math.min(1, (fl - .74) * (vivid ? 2 : 4)); rgb = [rgb[0] + (175 - rgb[0]) * k * .7, rgb[1] + (182 - rgb[1]) * k * .7, rgb[2] + (205 - rgb[2]) * k * .6]; }   // calcite
        if (fine > .46) rgb = vivid ? [236, 200, 96] : [196, 170, 100];   // pyrite specks
        return rgb; }); },
    dlapis: (vivid) => { const N = makeNoise(29), f1 = tileN(N, 4, 3), f2 = tileN(N, 64, 1);   // the deep lapis of dots / pupils
      return swatch('dlapis' + vivid, 128, (u, v) => { const t = (f1(u, v) - .5) * 40 + (f2(u, v) - .5) * 30; return vivid ? [cl(26 + t * .5), cl(40 + t * .7), cl(150 + t)] : [cl(22 + t * .5), cl(28 + t * .6), cl(78 + t)]; }); },
    bit: (vivid) => { const N = makeNoise(5), f1 = tileN(N, 4, 4), f2 = tileN(N, 64, 1);
      return swatch('bit' + vivid, 256, (u, v) => { const t = (f1(u, v) - .5) * (vivid ? 12 : 30) + (f2(u, v) - .5) * 14; return [cl(20 + t * .65), cl(17 + t * .6), cl(15 + t * .55)]; }); },
    red: (vivid) => { const N = makeNoise(31), f1 = tileN(N, 8, 4), f2 = tileN(N, 32, 2);
      return swatch('red' + vivid, 256, (u, v) => { const t = (f1(u, v) - .5) * 50 + (f2(u, v) - .5) * 22; return vivid ? [cl(196 + t * .6), cl(62 + t * .4), cl(34 + t * .3)] : [cl(150 + t), cl(64 + t * .6), cl(44 + t * .4)]; }); },
    iri: () => { const N = makeNoise(91), f1 = tileN(N, 4, 3), f2 = tileN(N, 8, 2);   // nacre: a faint play of pink / green / blue
      return swatch('iri', 256, (u, v) => { const h = (f1(u, v) * 2.2 + f2(u, v) * .8 + v * 2) * TAU;
        const k = 34 * (.4 + f2(u, v) * .9); return [cl(128 + Math.cos(h) * k), cl(128 + Math.cos(h - 2.1) * k), cl(128 + Math.cos(h + 2.1) * k)]; }); },
    grey: () => { const N = makeNoise(47), f1 = tileN(N, 8, 3), f2 = tileN(N, 64, 1);
      return swatch('grey', 256, (u, v) => { const t = 128 + (f1(u, v) - .5) * 130 + (f2(u, v) - .5) * 70; return [cl(t), cl(t), cl(t)]; }); },
    ply: (light) => { const N = makeNoise(light ? 67 : 68), f = tileN(N, 2, 3), f2 = tileN(N, 64, 1);   // birch plywood (laser-cut kit)
      return swatch('ply' + light, 512, (u, v) => { const ring = Math.sin((v * 9 + f(u, v) * 2.2 + Math.sin(u * TAU) * .2) * TAU) * .5 + .5, fib = (f2(u, v * .08) - .5);
        const t = ring * 14 + fib * 20 + (f(u * 2 % 1, v) - .5) * 16; return light ? [cl(238 - t), cl(216 - t * 1.05), cl(178 - t * 1.1)] : [cl(222 - t), cl(194 - t * 1.05), cl(150 - t * 1.1)]; }); },
    clay: (light) => { const N = makeNoise(light ? 83 : 81), f1 = tileN(N, 4, 4), f2 = tileN(N, 64, 1), f3 = tileN(N, 16, 2);
      return swatch('clay' + light, 256, (u, v) => { const m = f1(u, v) - .5, fine = f2(u, v) - .5, sp = f3(u, v); let t = m * 34 + fine * 22;
        if (sp > .78) t -= (sp - .78) * 140;   // dark firing spots
        if (fine > .42) t += 30;                // grit
        return light ? [cl(196 + t), cl(132 + t * .8), cl(88 + t * .6)] : [cl(178 + t), cl(112 + t * .8), cl(72 + t * .6)]; }); },
  };

  /* ---------- palettes: pass 'a' albedo, 'h' height (grey), 's' specular strength ---------- */
  const g255 = v => { const k = Math.round(cl(v * 255)); return `rgb(${k},${k},${k})`; };
  function pal(design, pass, g) {
    const D = DESIGNS[design], L = D[pass];
    const S = {}; for (const k in L) S[k] = typeof L[k] === 'number' ? g255(L[k]) : typeof L[k] === 'function' ? L[k](g) : L[k];
    S.pass = pass; S.d = D; return S;
  }
  const DESIGNS = {
    museum: {
      aged: true, gloss: 16, spec: .5, bump: 4.2, ao: 1.5, round: .025, nacre: .55,
      a: { bit: g => pat(g, SWT.bit(0), 1 / 240), lap: g => pat(g, SWT.lapis(0), 1 / 420), shell: null, red: g => pat(g, SWT.red(0), 1 / 400), petalB: g => pat(g, SWT.lapis(0), 1 / 520, .2, .1),
        line: 'rgba(32,21,12,.94)', dot: g => pat(g, SWT.dlapis(0), 1 / 300), joint: 'rgba(8,12,40,.8)', band: g => pat(g, SWT.shell(0), 1 / 300, .4, .7), bred: g => pat(g, SWT.red(0), 1 / 300, .3, .1) },
      h: { bit: .3, lap: .56, shell: .8, red: .72, petalB: .72, line: .6, dot: .7, joint: .46, band: .56, bred: .5 },
      s: { bit: .42, lap: .5, shell: .3, red: .04, petalB: .5, line: .04, dot: .4, joint: .1, band: .32, bred: .04 },
      side: 'museum',
    },
    restored: {
      aged: false, gloss: 34, spec: .7, bump: 5, ao: 1.1, round: .02, nacre: .55,
      a: { bit: g => pat(g, SWT.bit(1), 1 / 240), lap: g => pat(g, SWT.lapis(1), 1 / 420), shell: null, red: g => pat(g, SWT.red(1), 1 / 400), petalB: g => pat(g, SWT.lapis(1), 1 / 520, .2, .1),
        line: 'rgba(22,14,8,.96)', dot: g => pat(g, SWT.dlapis(1), 1 / 300), joint: 'rgba(10,18,70,.7)', band: g => pat(g, SWT.shell(1), 1 / 300, .4, .7), bred: g => pat(g, SWT.red(1), 1 / 300, .3, .1) },
      h: { bit: .3, lap: .6, shell: .8, red: .76, petalB: .76, line: .62, dot: .74, joint: .5, band: .58, bred: .52 },
      s: { bit: .75, lap: .62, shell: .42, red: .06, petalB: .62, line: .05, dot: .55, joint: .1, band: .42, bred: .06 },
      side: 'restored',
    },
    wood: {
      aged: false, gloss: 8, spec: .12, bump: 5, ao: 1.6, round: .05,
      a: { bit: g => pat(g, SWT.ply(0), 1 / 260), lap: 'rgb(120,86,52)', shell: null, red: 'rgb(118,70,36)', petalB: 'rgb(178,128,80)',
        line: 'rgba(82,46,20,.92)', dot: 'rgb(58,34,18)', joint: 'rgba(70,44,22,.85)', band: g => pat(g, SWT.ply(1), 1 / 260, .3, .1), bred: 'rgb(126,80,42)' },
      h: { bit: .5, lap: .22, shell: .74, red: .66, petalB: .7, line: .64, dot: .3, joint: .2, band: .48, bred: .44 },
      s: { bit: .05, lap: .02, shell: .06, red: .03, petalB: .04, line: .02, dot: .01, joint: .01, band: .05, bred: .03 },
      side: 'wood',
    },
    clay: {
      aged: true, gloss: 6, spec: .08, bump: 6, ao: 1.8, round: .12,
      a: { bit: g => pat(g, SWT.clay(0), 1 / 300), lap: g => pat(g, SWT.clay(0), 1 / 300, .5, .5), shell: null, red: 'rgba(150,72,42,1)', petalB: 'rgba(170,98,62,1)',
        line: 'rgba(86,42,22,.9)', dot: 'rgb(78,40,22)', joint: 'rgba(90,46,24,.6)', band: g => pat(g, SWT.clay(1), 1 / 300, .3, .1), bred: 'rgb(150,78,46)' },
      h: { bit: .58, lap: .34, shell: .62, red: .56, petalB: .56, line: .42, dot: .26, joint: .3, band: .52, bred: .5 },
      s: { bit: .03, lap: .02, shell: .03, red: .03, petalB: .03, line: .01, dot: .01, joint: .01, band: .03, bred: .03 },
      side: 'clay',
    },
  };
  const shellFill = (S, g, k) => {   // per-plaque shell / tile fill
    const d = S.d;
    if (S.pass !== 'a') return S.shell;
    if (S.d === DESIGNS.museum) return pat(g, SWT.shell(0), 1 / 330, hs(k, 1) * 3, hs(k, 2) * 3, hs(k, 3) * 360);
    if (S.d === DESIGNS.restored) return pat(g, SWT.shell(1), 1 / 330, hs(k, 1) * 3, hs(k, 2) * 3, hs(k, 3) * 360);
    if (S.d === DESIGNS.wood) return pat(g, SWT.ply(1), 1 / 280, hs(k, 1) * 3, hs(k, 2) * 3, hs(k, 3) < .5 ? 0 : 90);
    return pat(g, SWT.clay(1), 1 / 300, hs(k, 1) * 3, hs(k, 2) * 3);
  };

  /* ---------- shapes ---------- */
  function lens(g, w, h) { g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(0, -h, w / 2, 0); g.quadraticCurveTo(0, h, -w / 2, 0); g.closePath(); }
  function petal(g, r0, r1, w) { g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * .25, -w, r0 + (r1 - r0) * .7, -w * .9, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * .7, w * .9, r0 + (r1 - r0) * .25, w, r0, 0); g.closePath(); }
  function dot(g, x, y, r, fill, S, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill(); if (lw) { g.strokeStyle = S.line; g.lineWidth = lw; g.stroke(); } }
  function zig(g, x0, y0, x1, y1, n, a, first) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= 2 * n; i++) { const t = i / (2 * n), o = i % 2 ? a : 0, x = x0 + dx * t + nx * o, y = y0 + dy * t + ny * o; (i || !first) ? g.lineTo(x, y) : g.moveTo(x, y); }
  }
  function zigSquare(g, h, n, a) { g.beginPath(); zig(g, -h, -h, h, -h, n, -a, true); zig(g, h, -h, h, h, n, -a); zig(g, h, h, -h, h, n, -a); zig(g, -h, h, -h, -h, n, -a); g.closePath(); g.stroke(); }
  const FIVE = s => [[0, 0], [-s, -s], [s, -s], [-s, s], [s, s]];
  function roundPoly(g, pts, rad) {
    const n = pts.length; g.beginPath();
    for (let i = 0; i < n; i++) { const a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      const m1 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if (!i) g.moveTo(m1[0], m1[1]); g.arcTo(b[0], b[1], c[0], c[1], rad); }
    g.closePath();
  }
  // the outline offset inwards by d (every corner is a right angle)
  function inset(d) {
    const n = OUT.length, nrm = i => { const p = OUT[i], q = OUT[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / L, (q[0] - p[0]) / L]; };
    return OUT.map((p, i) => { const a = nrm((i + n - 1) % n), b = nrm(i); return [p[0] + d * (a[0] + b[0]), p[1] + d * (a[1] + b[1])]; });
  }

  /* ---------- the engraved motifs (plaque-local, side P, centred) ---------- */
  const MOTIF = {
    rosette(g, S, lw) {
      g.beginPath();
      for (let k = 0; k < 16; k++) { const ang = k * TAU / 16 - Math.PI / 2, rr = k % 2 ? .405 : .3; g.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); }
      g.closePath(); g.strokeStyle = S.line; g.lineWidth = lw; g.lineJoin = 'miter'; g.stroke();
      for (let k = 0; k < 8; k++) {
        g.save(); g.rotate(k * TAU / 8 - Math.PI / 2);
        petal(g, .05, .405, .102); g.fillStyle = S.shellHere; g.fill(); g.strokeStyle = S.line; g.lineWidth = lw; g.stroke();
        petal(g, .095, .36, .058); g.fillStyle = k % 2 ? S.petalB : S.red; g.fill(); g.lineWidth = lw * .8; g.stroke();
        g.restore();
      }
      dot(g, 0, 0, .07, S.red, S, lw); dot(g, 0, 0, .026, S.dot, S, lw * .5);
    },
    eyes(g, S, lw) {
      const e = P / 2 - .035, m = .125;
      g.strokeStyle = S.line; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
      g.moveTo(-m, -e); g.lineTo(-m, e); g.moveTo(m, -e); g.lineTo(m, e); g.moveTo(-e, 0); g.lineTo(-m, 0); g.moveTo(m, 0); g.lineTo(e, 0);
      g.moveTo(0, -e); g.lineTo(0, e);
      for (const y of [-.335, -.27, -.205, -.075, .075, .205, .27, .335]) { g.moveTo(-m, y); g.lineTo(m, y); }
      for (const y of [-.14, .14]) { g.moveTo(-m * .55, y - .035); g.lineTo(-m * .55, y + .035); g.moveTo(m * .55, y - .035); g.lineTo(m * .55, y + .035); }
      g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.save(); g.translate(sx * (m + e) / 2, sy * e / 2);
        const w = e - m - .03;
        lens(g, w * 1.04, .25); g.stroke(); lens(g, w * .72, .15); g.stroke();
        g.beginPath(); g.ellipse(0, 0, .045, .032, 0, 0, TAU); g.fillStyle = S.dot; g.fill(); g.lineWidth = lw * .6; g.stroke(); g.lineWidth = lw;
        g.restore();
      }
    },
    circles5(g, S, lw) {
      for (const [x, y] of FIVE(.235)) {
        g.beginPath(); g.arc(x, y, .118, 0, TAU); g.strokeStyle = S.line; g.lineWidth = lw * 1.3; g.stroke();
        dot(g, x, y, .062, S.dot, S, lw);
      }
    },
    dots4(g, S, lw) {
      const q = P / 4;
      g.strokeStyle = S.line; g.lineWidth = lw; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(0, -P / 2 + .02); g.lineTo(0, P / 2 - .02); g.moveTo(-P / 2 + .02, 0); g.lineTo(P / 2 - .02, 0); g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.save(); g.translate(sx * q, sy * q);
        g.lineWidth = lw * .9; zigSquare(g, .155, 4, .034);
        for (const [x, y] of FIVE(.064)) dot(g, x, y, .03, S.dot, S, lw * .5);
        g.restore();
      }
    },
    zig5(g, S, lw) {
      g.strokeStyle = S.line; g.lineWidth = lw; g.lineJoin = 'miter'; g.strokeRect(-.375, -.375, .75, .75);
      zigSquare(g, .375, 7, .052);
      g.save(); g.rotate(Math.PI / 4); g.lineWidth = lw * .9; zigSquare(g, .2, 4, .036); g.restore();
      for (const [x, y] of FIVE(.062)) dot(g, x, y, .03, S.dot, S, lw * .5);
    },
    dotgrid(g, S, lw) {   // 4 × 4 small squares, every one the same: an inner frame and a dot
      const e = P / 2 - .035, o = .013, s = (e - o) / 2;
      g.strokeStyle = S.line; g.lineWidth = lw; g.strokeRect(-e, -e, 2 * e, 2 * e);
      g.beginPath(); for (const v of [-o, o]) { g.moveTo(v, -e); g.lineTo(v, e); g.moveTo(-e, v); g.lineTo(e, v); }
      for (const sg of [-1, 1]) { const v = sg * (o + s); g.moveTo(v, -e); g.lineTo(v, e); g.moveTo(-e, v); g.lineTo(e, v); }
      g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const a of [0, 1]) for (const b of [0, 1]) {
        const x = sx * (o + s * (a + .5)), y = sy * (o + s * (b + .5)), hh = s * .34;
        g.lineWidth = lw * .8; g.strokeRect(x - hh, y - hh, 2 * hh, 2 * hh);
        dot(g, x, y, .03, S.dot, S, lw * .5);
      }
    },
  };

  /* ---------- the top: frame, diamond band, lapis fields, plaques ---------- */
  function paintTop(g, S) {
    const D = S.d, lw = D === DESIGNS.wood ? .01 : .0125, a = S.pass === 'a';
    // frame
    roundPoly(g, OUT, D.round); g.fillStyle = S.bit; g.fill();
    if (a && D.aged) { g.save(); g.clip(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = .22; g.fillStyle = pat(g, SWT.grey(), 1 / 70); g.fillRect(-5, -3, 10, 6); g.restore(); }
    if (S.pass === 's' && D !== DESIGNS.wood && D !== DESIGNS.clay) { g.save(); roundPoly(g, OUT, D.round); g.clip(); g.globalAlpha = .45; g.fillStyle = pat(g, SWT.grey(), 1 / 110); g.fillRect(-5, -3, 10, 6); g.restore(); }
    if (S.pass === 'h') { g.save(); roundPoly(g, OUT, D.round); g.clip(); g.globalAlpha = D === DESIGNS.clay ? .25 : .12; g.fillStyle = pat(g, SWT.grey(), 1 / 200); g.fillRect(-5, -3, 10, 6); g.restore(); }
    // the band of diamonds all round the outline (a diamond on every corner)
    paintBand(g, S);
    // lapis fields
    for (const [x0, y0, x1, y1] of FIELDS) { g.fillStyle = S.lap; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    paintStrips(g, S);
    for (const [x0, y0, x1, y1] of FIELDS) { g.strokeStyle = S.joint; g.lineWidth = .008; g.strokeRect(x0, y0, x1 - x0, y1 - y0); }
    // plaques
    CELLS.forEach(([r, c], k) => paintPlaque(g, S, r, c, k, lw));
  }

  function paintBand(g, S) {
    const D = S.d, a = S.pass === 'a', V = inset(BM), n = V.length, wl = .105;
    // the two thin bordering lines (they meet at right angles at every corner)
    g.lineJoin = 'miter';
    for (const d of [BM - wl, BM + wl]) { const Q = inset(d); g.beginPath(); Q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.strokeStyle = S.band; g.lineWidth = .02; g.stroke(); }
    // diamonds: on each edge evenly spaced from corner to corner
    const pos = [], mids = [];
    for (let i = 0; i < n; i++) {
      const p = V[i], q = V[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]), m = Math.max(1, Math.round(L / .196));
      for (let k = 0; k < m; k++) { const t = k / m, t2 = (k + .5) / m; pos.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); mids.push([p[0] + (q[0] - p[0]) * t2, p[1] + (q[1] - p[1]) * t2]); }
    }
    const dia = (x, y, h) => { g.beginPath(); g.moveTo(x - h, y); g.lineTo(x, y - h); g.lineTo(x + h, y); g.lineTo(x, y + h); g.closePath(); };
    mids.forEach(([x, y], i) => {
      dia(x, y, .066); g.fillStyle = S.bred; g.fill();
      if (a && D.aged) { const q = hs(i, 41); g.fillStyle = q < .3 ? 'rgba(20,10,5,.35)' : q > .8 ? 'rgba(230,200,170,.15)' : 'rgba(0,0,0,0)'; g.fill(); }
    });
    pos.forEach(([x, y], i) => {
      const q1 = hs(i, 7), q2 = hs(i, 8), q3 = hs(i, 9), jx = D.aged ? (q2 - .5) * .008 : 0, jy = D.aged ? (q3 - .5) * .008 : 0;
      dia(x + jx, y + jy, .07); g.fillStyle = S.band; g.fill();
      if (a) {
        if (D.nacre) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = D.nacre * .8; g.fillStyle = pat(g, SWT.iri(), 1 / 200, q2, q3); g.fill(); g.restore(); }
        if (D.aged) { g.fillStyle = q1 < .25 ? 'rgba(150,70,40,.32)' : q1 < .5 ? 'rgba(110,80,40,.25)' : q1 < .7 ? 'rgba(60,50,40,.2)' : 'rgba(255,248,230,.12)'; g.fill(); }
        g.strokeStyle = D === DESIGNS.wood || D === DESIGNS.clay ? S.line : 'rgba(20,14,10,.55)'; g.lineWidth = .006; g.stroke();
      } else if (S.pass === 'h') { g.strokeStyle = g255(.4); g.lineWidth = .006; g.stroke(); }
      if (D.aged && q1 > .965) { g.beginPath(); g.moveTo(x + .07, y); g.lineTo(x + (q2 - .5) * .03, y + (q3 < .5 ? -.07 : .07)); g.lineTo(x - .02 + q3 * .04, y + (q2 - .5) * .04); g.closePath(); g.fillStyle = S.bit; g.fill(); }   // a broken corner
    });
  }

  function paintStrips(g, S) {
    const D = S.d, a = S.pass === 'a', W = 1 - P;
    const strips = [];
    for (const [x0, y0, x1, y1] of FIELDS) {
      for (let y = y0 + P; y < y1 - .01; y += 1) strips.push([x0, y, x1 - x0, true]);
      for (let x = x0 + P; x < x1 - .01; x += 1) strips.push([x, y0, y1 - y0, false]);
    }
    strips.forEach(([x, y, L, hor], si) => {
      let s = 0, k = 0;
      while (s < L - .001) {
        const len = Math.min(L - s, .07 + hs(si, k, 1) * .15), w2 = hs(si, k, 2), wv = hs(si, k, 3);
        const rx = hor ? x + s : x, ry = hor ? y : y + s, rw = hor ? len : W, rh = hor ? W : len;
        if (a) {
          if (D === DESIGNS.museum || D === DESIGNS.restored) { g.fillStyle = wv < .14 ? `rgba(150,165,215,${(.2 + w2 * .2).toFixed(2)})` : wv < .62 ? `rgba(4,8,40,${(.1 + w2 * .5).toFixed(2)})` : `rgba(70,100,210,${(.08 + w2 * .26).toFixed(2)})`; g.fillRect(rx, ry, rw, rh); }
          else { g.fillStyle = `rgba(40,20,8,${(w2 * .18).toFixed(2)})`; g.fillRect(rx, ry, rw, rh); }
        } else if (S.pass === 'h') { const base = D === DESIGNS.wood ? .2 : D === DESIGNS.clay ? .32 : .5; g.fillStyle = g255(base + w2 * .1); g.fillRect(rx, ry, rw, rh); }
        else { g.fillStyle = g255((D === DESIGNS.wood || D === DESIGNS.clay ? .02 : .25) + w2 * .2); g.fillRect(rx, ry, rw, rh); }
        if (D === DESIGNS.museum || D === DESIGNS.restored) {
          g.strokeStyle = S.joint; g.lineWidth = .006; g.beginPath();
          const j1 = hs(si, k, 4) - .5, j2 = hs(si, k, 5) - .5;
          if (hor) { g.moveTo(rx, ry + j1 * .02); g.lineTo(rx + j2 * .025, ry + rh); } else { g.moveTo(rx + j1 * .02, ry); g.lineTo(rx + rw, ry + j2 * .025); }
          g.stroke();
        }
        s += len; k++;
      }
    });
    // the grain of the lapis: specks of lighter blue, calcite and pyrite
    if ((D === DESIGNS.museum || D === DESIGNS.restored) && a) {
      strips.forEach(([x, y, L, hor], si) => {
        const n = Math.round(L * 200);
        for (let i = 0; i < n; i++) {
          const u = hs(si, i, 11) * L, v = hs(si, i, 12) * W, q = hs(si, i, 13), px = hor ? x + u : x + v, py = hor ? y + v : y + u;
          g.fillStyle = q < .5 ? 'rgba(80,110,220,.45)' : q < .88 ? 'rgba(10,14,50,.55)' : q < .97 ? 'rgba(190,200,230,.35)' : (D.aged ? 'rgba(200,175,105,.8)' : 'rgba(245,210,110,.95)');
          g.fillRect(px, py, .006 + q * .004, .006 + q * .004);
        }
      });
    }
  }

  function paintPlaque(g, S, r, c, k, lw) {
    const D = S.d, [cx, cy] = pt(r, c), h = P / 2, a = S.pass === 'a';
    g.save(); g.translate(cx, cy);
    const rr = D === DESIGNS.clay ? .03 : D === DESIGNS.wood ? .02 : .008;
    g.save(); roundPoly(g, [[-h, -h], [h, -h], [h, h], [-h, h]], rr); g.clip();
    const fill = shellFill(S, g, k);
    S.shellHere = fill;
    g.fillStyle = fill; g.fillRect(-h, -h, P, P);
    if (a) {
      if (D.aged && D === DESIGNS.museum) {
        const t = hs(k, 4), t2 = hs(k, 5);
        g.fillStyle = t < .35 ? `rgba(160,120,60,${(.1 + t2 * .14).toFixed(2)})` : t < .7 ? `rgba(120,100,75,${(.08 + t2 * .12).toFixed(2)})` : `rgba(255,250,238,${(.08 + t2 * .14).toFixed(2)})`;
        g.fillRect(-h, -h, P, P);
        // a mottled stain or two
        for (let i = 0; i < 3; i++) { const sx = (hs(k, i, 21) - .5) * P, sy = (hs(k, i, 22) - .5) * P, sr = .08 + hs(k, i, 23) * .2, gr = g.createRadialGradient(sx, sy, 0, sx, sy, sr);
          gr.addColorStop(0, `rgba(140,100,50,${(hs(k, i, 24) * .16).toFixed(2)})`); gr.addColorStop(1, 'rgba(140,100,50,0)'); g.fillStyle = gr; g.fillRect(-h, -h, P, P); }
        const gr = g.createRadialGradient(0, 0, P * .28, 0, 0, P * .74); gr.addColorStop(0, 'rgba(90,60,25,0)'); gr.addColorStop(1, `rgba(80,52,22,${(.2 + t2 * .16).toFixed(2)})`); g.fillStyle = gr; g.fillRect(-h, -h, P, P);
      } else if (D === DESIGNS.clay) {
        const gr = g.createRadialGradient(0, 0, P * .2, 0, 0, P * .75); gr.addColorStop(0, 'rgba(255,220,180,.06)'); gr.addColorStop(1, 'rgba(90,40,20,.16)'); g.fillStyle = gr; g.fillRect(-h, -h, P, P);
      } else if (D === DESIGNS.wood) {
        const gr = g.createLinearGradient(-h, -h, h, h); gr.addColorStop(0, 'rgba(255,240,210,.08)'); gr.addColorStop(1, 'rgba(120,80,40,.1)'); g.fillStyle = gr; g.fillRect(-h, -h, P, P);
      } else {
        const gr = g.createRadialGradient(0, 0, P * .3, 0, 0, P * .75); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(150,120,70,.1)'); g.fillStyle = gr; g.fillRect(-h, -h, P, P);
      }
    }
    if (S.pass === 'h') {   // each plaque its own height, the edges worn round
      const dh = D.aged ? (hs(k, 6) - .5) * .06 : 0;
      if (dh) { g.fillStyle = dh > 0 ? `rgba(255,255,255,${dh * 2})` : `rgba(0,0,0,${-dh * 2})`; g.fillRect(-h, -h, P, P); }
      if (D === DESIGNS.clay || D === DESIGNS.museum) { g.globalAlpha = .16; g.fillStyle = pat(g, SWT.grey(), 1 / 260, hs(k, 1), hs(k, 2)); g.fillRect(-h, -h, P, P); g.globalAlpha = 1; }
    }
    if (a && D.nacre) { g.save(); g.globalCompositeOperation = 'soft-light'; g.globalAlpha = D.nacre; g.fillStyle = pat(g, SWT.iri(), 1 / 260, hs(k, 8) * 2, hs(k, 9) * 2, hs(k, 10) * 360); g.fillRect(-h, -h, P, P); g.restore();
      // translucency: the edge of the plaque a touch lighter and cooler where it is thin
      g.save(); g.strokeStyle = 'rgba(255,252,240,.16)'; g.lineWidth = .03; g.strokeRect(-h + .015, -h + .015, P - .03, P - .03); g.restore(); }
    const m = motif(r, c); if (m) { g.save(); MOTIF[m](g, S, lw); g.restore(); }
    // hairline cracks and craquelure (dirt in them)
    if (D.aged) {
      const cs = S.pass === 'a' ? 'rgba(70,45,22,.5)' : S.pass === 'h' ? g255(.66) : g255(.05);
      const nC = D === DESIGNS.clay ? 1 : (hs(k, 7) * 3 | 0);
      for (let i = 0; i < nC; i++) {
        let x = (hs(k, i, 31) - .5) * P, y = -h; const vert = hs(k, i, 32) < .5; if (!vert) { y = x; x = -h; }
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 8; s++) { if (vert) { x += (hs(k, i * 9 + s, 33) - .5) * .05; y += P / 8; } else { y += (hs(k, i * 9 + s, 33) - .5) * .05; x += P / 8; } g.lineTo(x, y); }
        g.strokeStyle = cs; g.lineWidth = .0045; g.stroke();
      }
      if (D === DESIGNS.museum) {
        g.lineWidth = .0028; g.strokeStyle = S.pass === 'a' ? 'rgba(90,60,30,.32)' : S.pass === 'h' ? g255(.74) : g255(.1);
        for (let i = 0; i < 14; i++) {
          let x = (hs(k, i, 41) - .5) * P, y = (hs(k, i, 42) - .5) * P, ang = hs(k, i, 43) * TAU;
          g.beginPath(); g.moveTo(x, y);
          for (let s = 0; s < 4; s++) { ang += (hs(k, i * 7 + s, 44) - .5) * 1.6; const L = .02 + hs(k, i * 7 + s, 45) * .05; x += Math.cos(ang) * L; y += Math.sin(ang) * L; g.lineTo(x, y); }
          g.stroke();
        }
      }
    }
    // chipped corners: the bitumen bed shows through
    if (D === DESIGNS.museum) for (let i = 0; i < 2; i++) {
      if (hs(k, i, 51) > (i ? .25 : .45)) continue;
      const corner = hs(k, i, 52) * 4 | 0, sz = .3 + hs(k, i, 53) * .5, sx = corner & 1 ? 1 : -1, sy = corner & 2 ? 1 : -1, ac = .04 + sz * .05;
      g.beginPath(); g.moveTo(sx * h, sy * (h - ac)); g.lineTo(sx * (h - ac * .4), sy * (h - ac * .8)); g.lineTo(sx * (h - ac * .75), sy * (h - ac * .3)); g.lineTo(sx * (h - ac), sy * h); g.lineTo(sx * h, sy * h); g.closePath();
      g.fillStyle = S.pass === 'a' ? 'rgb(36,28,22)' : S.pass === 'h' ? g255(.42) : g255(.2); g.fill();
    }
    g.restore();
    roundPoly(g, [[-h, -h], [h, -h], [h, h], [-h, h]], rr);
    g.strokeStyle = a ? (D === DESIGNS.wood ? 'rgba(90,60,30,.55)' : D === DESIGNS.clay ? 'rgba(80,40,20,.35)' : 'rgba(26,20,14,.6)') : S.pass === 'h' ? g255(D === DESIGNS.wood ? .3 : .5) : g255(.1);
    g.lineWidth = .007; g.stroke();
    g.restore();
  }

  /* ---------- lighting ---------- */
  function blurred(c, r) { const o = cv(c.width, c.height), g = o.getContext('2d'); g.filter = `blur(${r}px)`; g.drawImage(c, 0, 0); return o; }
  const data = c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  function lightUp(A, Hc, Sc, o) {
    const w = A.width, h = A.height, s = o.scale || 1;
    const Hd = data(blurred(Hc, Math.max(.6, (o.soft || 1.1) * s))), HB = data(blurred(Hc, (o.aoR || 7) * s)), Ad = data(A), Sd = data(Sc);
    const out = cv(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
    let Lx = -.52, Ly = -.66, Lz = .62; const Ll = Math.hypot(Lx, Ly, Lz); Lx /= Ll; Ly /= Ll; Lz /= Ll;
    let Hx = Lx, Hy = Ly, Hz = Lz + 1; const Hl = Math.hypot(Hx, Hy, Hz); Hx /= Hl; Hy /= Hl; Hz /= Hl;
    const bump = o.bump * s / 255, amb = o.amb ?? .42, gloss = o.gloss, spk = o.spec, ao = o.ao, sc = o.specColor || [255, 248, 235];
    for (let y = 0; y < h; y++) {
      const y0 = y > 0 ? y - 1 : 0, y1 = y < h - 1 ? y + 1 : y;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4; if (!Ad[i + 3]) continue;
        const x0 = x > 0 ? x - 1 : 0, x1 = x < w - 1 ? x + 1 : x;
        const dx = (Hd[(y * w + x1) * 4] - Hd[(y * w + x0) * 4]) * bump, dy = (Hd[(y1 * w + x) * 4] - Hd[(y0 * w + x) * 4]) * bump;
        const nl = Math.hypot(dx, dy, 1), nx = -dx / nl, ny = -dy / nl, nz = 1 / nl;
        const dif = Math.max(0, nx * Lx + ny * Ly + nz * Lz) / Lz;
        const occ = Math.max(0, Math.min(.7, (HB[i] - Hd[i]) / 255 * ao));
        const sp = Sd[i] / 255 * Math.pow(Math.max(0, nx * Hx + ny * Hy + nz * Hz), gloss) * spk;
        const k = (amb + (1 - amb) * dif) * (1 - occ);
        d[i] = cl(Ad[i] * k + sp * sc[0]); d[i + 1] = cl(Ad[i + 1] * k + sp * sc[1]); d[i + 2] = cl(Ad[i + 2] * k + sp * sc[2]); d[i + 3] = Ad[i + 3];
      }
    }
    og.putImageData(img, 0, 0); return out;
  }

  /* ---------- the visible box sides (faces turned towards the viewer) ---------- */
  function paintSides(g, design, faces, K, hsPx, W, H) {
    const vivid = design === 'restored';
    if (design === 'museum' || design === 'restored') {
      g.fillStyle = vivid ? '#17120f' : '#1a1512'; g.fillRect(0, 0, W, H);
      // vertical slips of red limestone and shell, across the whole width (masked to the faces later)
      let x = 0, k = 0;
      while (x < W) {
        const red = hs(k, 61) < .5, w = (red ? .07 + hs(k, 62) * .05 : .075 + hs(k, 63) * .06) * K, q = hs(k, 64);
        g.fillStyle = red ? (vivid ? `rgb(${190 - q * 30 | 0},${70 - q * 15 | 0},${44 - q * 10 | 0})` : `rgb(${142 - q * 40 | 0},${70 - q * 25 | 0},${50 - q * 18 | 0})`)
          : (vivid ? `rgb(${240 - q * 14 | 0},${230 - q * 14 | 0},${210 - q * 14 | 0})` : `rgb(${214 - q * 40 | 0},${194 - q * 40 | 0},${156 - q * 36 | 0})`);
        g.fillRect(x, 0, w - Math.max(1, K * .008), H);
        if (!red && !vivid) { g.fillStyle = `rgba(255,240,215,${(.1 + q * .12).toFixed(2)})`; g.fillRect(x + w * .15, 0, w * .25, H); }   // a sheen on the shell slip
        x += w; k++;
      }
      // eye plaques and the shell slip round the top edge, per face
      faces.forEach((f, fi) => {
        const L = f.x2 - f.x1, ew = .42 * K;
        for (let e = .35 * K + hs(fi, 70) * .3 * K; e < L - ew - .15 * K; e += ew + (.75 + hs(fi, e | 0, 71) * .5) * K) {
          const ex = f.x1 + e, top = f.y + hsPx * .14, eh = hsPx * .8;
          g.fillStyle = vivid ? '#efe6d2' : `rgb(${210 - hs(fi, e | 0, 72) * 30 | 0},${192 - hs(fi, e | 0, 72) * 30 | 0},${152 - hs(fi, e | 0, 72) * 26 | 0})`; g.fillRect(ex, top, ew, eh);
          g.strokeStyle = 'rgba(20,14,10,.8)'; g.lineWidth = Math.max(1, K * .006); g.strokeRect(ex, top, ew, eh);
          g.save(); g.translate(ex + ew / 2, top + eh / 2); g.strokeStyle = 'rgba(28,18,10,.9)'; g.lineWidth = Math.max(1, K * .008);
          lens(g, ew * .84, eh * .62); g.stroke(); lens(g, ew * .56, eh * .36); g.stroke();
          g.beginPath(); g.ellipse(0, 0, ew * .07, eh * .13, 0, 0, TAU); g.fillStyle = vivid ? '#1e2f8c' : '#1a1a2c'; g.fill(); g.restore();
        }
        g.fillStyle = vivid ? '#f1e8d4' : '#cdb994'; g.fillRect(f.x1, f.y, L, hsPx * .12);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(f.x1, f.y + hsPx * .12, L, Math.max(1, K * .006));
      });
    } else if (design === 'wood') {
      g.fillStyle = pat(g, SWT.ply(0), 1, 0, 0, 90); g.fillRect(0, 0, W, H);
      faces.forEach(f => { const L = f.x2 - f.x1;   // the plies of the plywood edge
        for (let i = 1; i < 5; i++) { g.fillStyle = i % 2 ? 'rgba(150,110,60,.35)' : 'rgba(255,240,210,.18)'; g.fillRect(f.x1, f.y + hsPx * i / 5 - 1, L, Math.max(1.5, K * .008)); }
        // laser-cut finger joints at the ends
        g.fillStyle = 'rgba(90,60,30,.35)'; for (let x = f.x1 + .1 * K; x < f.x2 - .1 * K; x += .5 * K) g.fillRect(x, f.y, Math.max(1, K * .006), hsPx);
      });
    } else {
      g.fillStyle = pat(g, SWT.clay(0), 1.4); g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(90,45,20,.25)'; g.lineWidth = Math.max(1, K * .004);
      for (let i = 0; i < W / (K * .03); i++) { const x = i * K * .03 + hs(i, 81) * K * .02; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + hs(i, 82) * 6, H); g.stroke(); }
    }
  }

  /* ---------- the whole board image ---------- */
  function board(design, orient = 'h', upx = 2.4) {
    const R = IMG[orient], K = upx * 100, W = Math.round(R[2] * upx), H = Math.round(R[3] * upx), D = DESIGNS[design];
    const setT = (g, dy = 0) => orient === 'h' ? g.setTransform(K, 0, 0, K, -R[0] * upx, -R[1] * upx + dy) : g.setTransform(0, K, K, 0, -R[0] * upx, -R[1] * upx + dy);   // v: screen (x, y) = board (y, x)
    const toPx = orient === 'h' ? (x, y) => [(x * 100 - R[0]) * upx, (y * 100 - R[1]) * upx] : (x, y) => [(y * 100 - R[0]) * upx, (x * 100 - R[1]) * upx];
    const pass = p => { const c = cv(W, H), g = c.getContext('2d'); setT(g); if (p !== 'a') { g.fillStyle = '#000'; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, W, H); g.restore(); } paintTop(g, pal(design, p, g)); return c; };
    const A = pass('a'), Hc = pass('h'), Sc = pass('s');
    const top = lightUp(A, Hc, Sc, { bump: D.bump, gloss: D.gloss, spec: D.spec, ao: D.ao, scale: upx / 2.4, amb: design === 'restored' ? .5 : .42 });
    // extrusion mask (top + sides seen from slightly in front)
    const hsPx = HS * K, M = cv(W, H), mg = M.getContext('2d');
    for (let k = 0; k <= Math.ceil(hsPx); k++) { setT(mg, Math.min(k, hsPx)); roundPoly(mg, OUT, D.round); mg.fillStyle = '#000'; mg.fill(); }
    // faces turned to the viewer (outward normal points down the screen)
    const faces = [];
    for (let i = 0; i < OUT.length; i++) {
      const p = toPx(...OUT[i]), q = toPx(...OUT[(i + 1) % OUT.length]);
      if (Math.abs(p[1] - q[1]) > .5) continue;
      const mx = (OUT[i][0] + OUT[(i + 1) % OUT.length][0]) / 2, my = (OUT[i][1] + OUT[(i + 1) % OUT.length][1]) / 2;
      const nx = -(OUT[(i + 1) % OUT.length][1] - OUT[i][1]), ny = OUT[(i + 1) % OUT.length][0] - OUT[i][0];   // inward (unnormalised)
      const pi = toPx(mx + nx * .001, my + ny * .001), pm = toPx(mx, my);
      if (pi[1] < pm[1]) faces.push({ x1: Math.min(p[0], q[0]), x2: Math.max(p[0], q[0]), y: p[1] });   // inside is above → the face looks down
    }
    const Sd = cv(W, H), sg = Sd.getContext('2d');
    paintSides(sg, design, faces, K, hsPx, W, H);
    sg.globalCompositeOperation = 'destination-in'; sg.drawImage(M, 0, 0); sg.globalCompositeOperation = 'source-over';
    // side shading: lit from above, darker towards the bottom; a lighter lip at the top edge
    sg.globalCompositeOperation = 'source-atop';
    faces.forEach(f => { const gr = sg.createLinearGradient(0, f.y, 0, f.y + hsPx); gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(.7, 'rgba(0,0,0,.3)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); sg.fillStyle = gr; sg.fillRect(f.x1 - hsPx, f.y, f.x2 - f.x1 + 2 * hsPx, hsPx + 2); });
    sg.fillStyle = 'rgba(0,0,0,.45)'; sg.fillRect(0, 0, W, H * 0);   // (no-op: keep the composite mode explicit)
    sg.globalCompositeOperation = 'source-over';
    // compose: drop shadow, sides, lit top
    const F = cv(W, H), fg = F.getContext('2d');
    fg.save(); fg.filter = `blur(${10 * upx / 2.4}px)`; fg.globalAlpha = .6; fg.drawImage(M, 7 * upx / 2.4, 12 * upx / 2.4); fg.restore();
    fg.save(); fg.filter = `blur(${3 * upx / 2.4}px)`; fg.globalAlpha = .5; fg.drawImage(M, 2 * upx / 2.4, 4 * upx / 2.4); fg.restore();
    fg.drawImage(Sd, 0, 0); fg.drawImage(top, 0, 0);
    // a crisp dark edge line round the top (the box's arris), lit edge on the top-left
    fg.save(); setT(fg); roundPoly(fg, OUT, D.round); fg.lineWidth = 1.2 / K; fg.strokeStyle = design === 'wood' ? 'rgba(120,86,48,.6)' : design === 'clay' ? 'rgba(90,44,22,.5)' : 'rgba(0,0,0,.6)'; fg.stroke(); fg.restore();
    return F;
  }

  /* ---------- pieces ---------- */
  const PIECES = {
    orig:  [{ body: () => SWT.shell(0), dot: () => SWT.dlapis(0), gloss: 14, spec: .3, tint: 'rgba(150,110,60,.12)' }, { body: () => swatch('shale', 256, shaleF()), dot: () => SWT.shell(0), gloss: 12, spec: .25 }],
    ivory: [{ body: () => swatch('ivory', 256, ivoryF()), dot: () => swatch('ebony', 256, ebonyF()), gloss: 40, spec: .55 }, { body: () => swatch('ebony', 256, ebonyF()), dot: () => swatch('ivory', 256, ivoryF()), gloss: 44, spec: .55 }],
    wood:  [{ body: () => SWT.ply(1), dot: () => swatch('burnt', 256, burntF()), gloss: 8, spec: .1 }, { body: () => swatch('burnt', 256, burntF()), dot: () => SWT.ply(1), gloss: 10, spec: .14 }],
    gold:  [{ body: () => swatch('gold', 256, goldF()), dot: () => SWT.dlapis(1), gloss: 30, spec: 1.1, metal: true }, { body: () => SWT.lapis(1), dot: () => swatch('gold', 256, goldF()), gloss: 30, spec: .6 }],
  };
  function shaleF() { const N = makeNoise(61), f = tileN(N, 4, 4), f2 = tileN(N, 64, 1); return (u, v) => { const t = (f(u, v) - .5) * 40 + (f2(u, v) - .5) * 20; return [cl(64 + t), cl(66 + t), cl(72 + t)]; }; }
  function ivoryF() { const N = makeNoise(63), f = tileN(N, 2, 3), f2 = tileN(N, 32, 1); return (u, v) => { const t = (f(u, v) - .5) * 16 + Math.sin((u + v + f2(u, v) * .4) * TAU * 6) * 4; return [cl(240 + t), cl(230 + t), cl(205 + t)]; }; }
  function ebonyF() { const N = makeNoise(65), f = tileN(N, 2, 3), f2 = tileN(N, 64, 1); return (u, v) => { const t = (f(u, v * 4 % 1) - .5) * 20 + (f2(u, v * .1) - .5) * 26; return [cl(40 + t), cl(31 + t * .9), cl(27 + t * .8)]; }; }
  function burntF() { const N = makeNoise(69), f = tileN(N, 2, 3); return (u, v) => { const r = Math.sin((v * 10 + f(u, v) * 2.4) * TAU) * .5 + .5, t = r * 18 + (f(u, v) - .5) * 20; return [cl(112 - t), cl(66 - t * .7), cl(36 - t * .4)]; }; }
  function goldF() { const N = makeNoise(71), f = tileN(N, 4, 2), f2 = tileN(N, 64, 1); return (u, v) => { const t = (f(u, v) - .5) * 30 + (f2(u, v) - .5) * 14; return [cl(226 + t), cl(176 + t), cl(76 + t * .5)]; }; }
  function piece(design, side, n = 192) {
    const L = PIECES[design][side], R = n * .45, c0 = n / 2, s = n / 192;
    const DOTS = FIVE(R * .44).map(([x, y]) => [c0 + x, c0 + y]), dr = R * .13;
    const mk = p => {
      const c = cv(n, n), g = c.getContext('2d');
      if (p === 'a') {
        g.save(); g.beginPath(); g.arc(c0, c0, R, 0, TAU); g.clip();
        g.fillStyle = pat(g, L.body(), side ? 1 : .7, side * 37, 11); g.fillRect(0, 0, n, n);
        if (design === 'orig' && !side) { const gr = g.createRadialGradient(c0, c0, R * .3, c0, c0, R); gr.addColorStop(0, 'rgba(150,110,60,0)'); gr.addColorStop(1, 'rgba(120,80,40,.28)'); g.fillStyle = gr; g.fillRect(0, 0, n, n); }
        if (design === 'orig' && side) { g.globalAlpha = .25; g.fillStyle = pat(g, SWT.grey(), .5); g.fillRect(0, 0, n, n); g.globalAlpha = 1; }
        for (const [x, y] of DOTS) { g.beginPath(); g.arc(x, y, dr, 0, TAU); g.fillStyle = pat(g, L.dot(), .6, x, y); g.fill(); g.strokeStyle = 'rgba(20,14,10,.55)'; g.lineWidth = 1.2 * s; g.stroke(); }
        g.restore();
      } else if (p === 'h') {
        g.fillStyle = '#000'; g.fillRect(0, 0, n, n);
        const gr = g.createRadialGradient(c0, c0, R * .72, c0, c0, R); gr.addColorStop(0, g255(.85)); gr.addColorStop(.7, g255(.7)); gr.addColorStop(1, g255(.25));
        g.beginPath(); g.arc(c0, c0, R, 0, TAU); g.fillStyle = gr; g.fill();
        for (const [x, y] of DOTS) { g.beginPath(); g.arc(x, y, dr, 0, TAU); g.fillStyle = g255(.76); g.fill(); g.strokeStyle = g255(.66); g.lineWidth = 1.5 * s; g.stroke(); }
        if (design === 'orig') { g.globalAlpha = .1; g.fillStyle = pat(g, SWT.grey(), .6); g.beginPath(); g.arc(c0, c0, R * .9, 0, TAU); g.fill(); g.globalAlpha = 1; }
      } else {
        g.fillStyle = '#000'; g.fillRect(0, 0, n, n); g.beginPath(); g.arc(c0, c0, R, 0, TAU); g.fillStyle = g255(1); g.fill();
      }
      return c;
    };
    const top = lightUp(mk('a'), mk('h'), mk('s'), { bump: 9, gloss: L.gloss, spec: L.spec, ao: .8, scale: s, amb: .45, specColor: L.metal ? [255, 220, 140] : null });
    // compose: the disc's edge (thickness) under the top
    const F = cv(n, n), g = F.getContext('2d');
    g.save(); g.beginPath(); g.arc(c0, c0 + R * .09, R, 0, TAU); g.clip(); g.fillStyle = pat(g, L.body(), 1); g.fillRect(0, 0, n, n); g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, n, n); g.restore();
    g.drawImage(top, 0, 0);
    g.beginPath(); g.arc(c0, c0, R - .6 * s, 0, TAU); g.strokeStyle = side ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.3)'; g.lineWidth = 1.2 * s; g.stroke();
    return F;
  }

  window.UrPaint2D = { board, piece, IMG, DESIGNS: Object.keys(DESIGNS), PIECES: Object.keys(PIECES) };
})();
