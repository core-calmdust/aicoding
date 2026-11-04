/* =====================================================================
   The Royal Game of Ur on the 3D table — the board from the Royal Tombs of Ur
   (British Museum, BM 120834), modelled after the museum piece:
     • shell plaques (milky, yellowed by age) with black engraved motifs — rosettes with
       red (carnelian / red limestone) and lapis petals, eyes, five circles, four-part dots,
       zig-zag frames with five dots, dot grids; each plaque a little higher / lower, its own tone,
       hairline cracks and chipped corners (hand-made inlay)
     • lapis lazuli strips between the squares (small mottled ultramarine pieces, uneven joints)
     • a black bitumen frame (dull sheen) with bands of shell and red diamonds
     • the sides of the box: vertical slips of red limestone and shell with eye plaques
   Pieces: shell discs with five lapis dots / black shale discs with five shell dots (4 looks).
   Dice: tetrahedra, two of the four tips inlaid white (shell ring, lapis centre).
   Normal / roughness maps carry the engraving and the joints of the inlay.
   Registers into Table3D:
     Table3D.MODELS.ur(live)   board (+ a game in progress and four dice unless live)
     Table3D.ur = { board, piece, die, dieUp, MOTIF, U, … }
   Units: one square (pitch) = 1.0; the grid is 8 × 3, centred on the origin, horizontal
   (row 0 far = −z, row 2 near = +z, the big block on the left = −x).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { makeNoise } = X;
  const SZ = v => Math.max(64, Math.round(v * (X.texScale ? X.texScale() : 1)));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const lin = c => new (T().Color)(c).convertSRGBToLinear();

  /* ---------- layout ---------- */
  const U = 1, P = .84, BAND = U - P, MG = .34, H = .42, FR = .012;   // pitch, plaque, lapis strip, bitumen margin, box height, inlay field rise
  const X0 = 3.92 + MG, Z0 = 1.42 + MG, XB = -.08 + MG, XS = 2.08 - MG, ZB = .42 + MG;   // outline: outer, big block's inner edge, small block's, bridge
  const minX = -X0, minZ = -Z0, W = 2 * X0, D = 2 * Z0;
  const pt = (r, c) => [(c - 3.5) * U, (r - 1) * U];
  const exists = (r, c) => r === 1 || c < 4 || c > 5;
  // the motifs, as on the museum board (row 0 / 2 are mirror rows, row 1 the shared middle row)
  const OUTER = ['rosette', 'eyes', 'circles5', 'eyes', null, null, 'rosette', 'zig5'];
  const MID = ['dotgrid', 'circles5', 'dots4', 'rosette', 'circles5', 'dots4', 'eyes', 'circles5'];
  const motif = (r, c) => (r === 1 ? MID[c] : OUTER[c]) || null;
  const CELLS = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if (exists(r, c)) CELLS.push([r, c]);
  // the three inlay fields (lapis ground + plaques): [x0, z0, x1, z1]
  const FIELDS = [[-3.92, -1.42, -.08, 1.42], [-.08, -.42, 2.08, .42], [2.08, -1.42, 3.92, 1.42]];
  // bands of shell / red diamonds in the bitumen margin: one unbroken ring round every edge of the frame (the outline pushed in
  // to the middle of the margin — the blocks' outer sides, both sides of the bridge, the steps of the notches). Built from OUT below.
  const BM = MG / 2;
  let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  // per-plaque hand-made variation (fixed: the same board every time)
  const VAR = {}; seed = 41;
  CELLS.forEach(([r, c]) => { VAR[r * 8 + c] = { dh: .006 + rnd() * .012, rx: (rnd() - .5) * .006, rz: (rnd() - .5) * .006, tint: rnd(), tint2: rnd(), ox: rnd(), oy: rnd(),
    chips: [rnd() < .45 ? [rnd() * 4 | 0, .3 + rnd() * .5] : null, rnd() < .25 ? [rnd() * 4 | 0, .3 + rnd() * .5] : null].filter(Boolean), cracks: rnd() * 3 | 0, cs: rnd() * 1e4 | 0 }; });

  /* ---------- noise swatches (pattern fills) ---------- */
  const SWC = {};
  function swatch(key, n, f) {
    if (SWC[key]) return SWC[key];
    const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n), d = img.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = f(x / n, y / n), i = (y * n + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (SWC[key] = c);
  }
  // seamless fbm: blend the four copies of the tile
  const tileN = (N, sc, oct) => (u, v) => { const a = N(u * sc, v * sc, oct), b = N((u - 1) * sc, v * sc, oct), c = N(u * sc, (v - 1) * sc, oct), e = N((u - 1) * sc, (v - 1) * sc, oct);
    return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + e * u * v; };
  const cl = v => Math.max(0, Math.min(255, v));
  const SHELL = () => { const N = makeNoise(11), f1 = tileN(N, 5, 4), f2 = tileN(N, 22, 2), f3 = tileN(N, 3, 2);
    return swatch('urShell', 256, (u, v) => { const m = f1(u, v) - .5, fine = f2(u, v) - .5, band = Math.sin((v * 9 + f3(u, v) * 3) * Math.PI * 2) * .5 + .5;
      const t = m * 46 + fine * 16 + band * 9; return [cl(222 + t), cl(204 + t * .95), cl(162 + t * .8 - band * 6)]; }); };
  const LAPIS = () => { const N = makeNoise(23), f1 = tileN(N, 6, 4), f2 = tileN(N, 30, 2), f3 = tileN(N, 14, 1);
    return swatch('urLapis', 256, (u, v) => { const m = f1(u, v) - .5, fine = f2(u, v) - .5, fl = f3(u, v);
      let rgb = [cl(28 + m * 34 + fine * 18), cl(40 + m * 44 + fine * 22), cl(116 + m * 66 + fine * 30)];
      if (fl > .8) { const k = (fl - .8) * 4; rgb = [rgb[0] + (190 - rgb[0]) * k, rgb[1] + (190 - rgb[1]) * k, rgb[2] + (200 - rgb[2]) * k * .7]; }   // calcite veins
      if (fine > .44) rgb = [215, 182, 90];   // pyrite specks
      return rgb; }); };
  const BIT = () => { const N = makeNoise(5), f1 = tileN(N, 6, 4), f2 = tileN(N, 40, 1);
    return swatch('urBit', 256, (u, v) => { const t = (f1(u, v) - .5) * 26 + (f2(u, v) - .5) * 12; return [cl(14 + t * .6), cl(12 + t * .55), cl(11 + t * .5)]; }); };
  const RED = () => { const N = makeNoise(31), f1 = tileN(N, 7, 4), f2 = tileN(N, 30, 2);
    return swatch('urRed', 256, (u, v) => { const t = (f1(u, v) - .5) * 50 + (f2(u, v) - .5) * 20; return [cl(150 + t), cl(58 + t * .6), cl(38 + t * .4)]; }); };
  const GREYN = () => { const N = makeNoise(47), f1 = tileN(N, 8, 3), f2 = tileN(N, 40, 1);
    return swatch('urGreyN', 256, (u, v) => { const t = 128 + (f1(u, v) - .5) * 120 + (f2(u, v) - .5) * 60; return [cl(t), cl(t), cl(t)]; }); };
  function pat(g, cv, unitsPerPx, ox = 0, oy = 0, rot = 0) {
    const p = g.createPattern(cv, 'repeat');
    try { let m = new DOMMatrix(); m = m.translate(ox, oy); if (rot) m = m.rotate(rot); p.setTransform(m.scale(unitsPerPx)); } catch (e) {}
    return p;
  }

  /* ---------- palettes per pass: c = colour, h = height (grey), r = roughness (grey) ---------- */
  function palette(pass, g) {
    if (pass === 'c') return { pass, bit: pat(g, BIT(), 1 / 260), lap: pat(g, LAPIS(), 1 / 330), shell: pat(g, SHELL(), 1 / 300), red: pat(g, RED(), 1 / 330),
      line: 'rgba(34,22,14,.93)', dot: pat(g, LAPIS(), 1 / 600, .3, .2), joint: 'rgba(8,12,40,.75)', shellEdge: '#ded0ae' };
    if (pass === 'h') return { pass, bit: '#3a3a3a', lap: '#8c8c8c', shell: '#c8c8c8', red: '#b4b4b4', line: '#5c5c5c', dot: '#a8a8a8', joint: '#4e4e4e', shellEdge: '#a8a8a8', noise: pat(g, GREYN(), 1 / 260) };
    return { pass, bit: '#909090', lap: '#606060', shell: '#a4a4a4', red: '#8a8a8a', line: '#d8d8d8', dot: '#606060', joint: '#c8c8c8', shellEdge: '#a0a0a0' };   // roughness ≈ grey / 255
  }

  /* ---------- the engraved motifs (plaque-local units, plaque side P, centred) ---------- */
  const TAU = Math.PI * 2;
  function lens(g, w, h) { g.beginPath(); g.moveTo(-w / 2, 0); g.quadraticCurveTo(0, -h, w / 2, 0); g.quadraticCurveTo(0, h, -w / 2, 0); g.closePath(); }
  function petal(g, r0, r1, w) { g.beginPath(); g.moveTo(r0, 0); g.bezierCurveTo(r0 + (r1 - r0) * .25, -w, r0 + (r1 - r0) * .7, -w * .9, r1, 0); g.bezierCurveTo(r0 + (r1 - r0) * .7, w * .9, r0 + (r1 - r0) * .25, w, r0, 0); g.closePath(); }
  function dot(g, x, y, r, fill, S, lw) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = fill; g.fill(); g.strokeStyle = S.line; g.lineWidth = lw; g.stroke(); }
  function zig(g, x0, y0, x1, y1, n, a) {   // a triangle wave from (x0,y0) to (x1,y1), n teeth, amplitude a (to the left of the direction)
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    for (let i = 0; i <= 2 * n; i++) { const t = i / (2 * n), o = i % 2 ? a : 0; const x = x0 + dx * t + nx * o, y = y0 + dy * t + ny * o; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  }
  function zigSquare(g, h, n, a) { g.beginPath(); zig(g, -h, -h, h, -h, n, -a); zig(g, h, -h, h, h, n, -a); zig(g, h, h, -h, h, n, -a); zig(g, -h, h, -h, -h, n, -a); g.stroke(); }
  const FIVE = (s) => [[0, 0], [-s, -s], [s, -s], [-s, s], [s, s]];
  const MOTIF = {
    rosette(g, S, lw) {
      for (let k = 0; k < 8; k++) {
        g.save(); g.rotate(k * TAU / 8 - Math.PI / 2);
        petal(g, .05, .39, .085); g.fillStyle = S.shell; g.fill();
        g.save(); g.translate(.215, 0); g.scale(.78, .66); g.translate(-.215, 0); petal(g, .05, .39, .085); g.fillStyle = k % 2 ? S.dot : S.red; g.fill(); g.strokeStyle = S.line; g.lineWidth = lw * .7 / .72; g.stroke(); g.restore();
        petal(g, .05, .39, .085); g.strokeStyle = S.line; g.lineWidth = lw; g.stroke();
        g.rotate(TAU / 16); petal(g, .27, .41, .028); g.lineWidth = lw * .8; g.stroke();   // the little leaves between the petals
        g.restore();
      }
      dot(g, 0, 0, .062, S.red, S, lw); dot(g, 0, 0, .022, S.line, S, lw * .5);
    },
    eyes(g, S, lw) {
      const e = P / 2 - .035, m = .125;
      g.strokeStyle = S.line; g.lineWidth = lw; g.beginPath();
      g.moveTo(-m, -e); g.lineTo(-m, e); g.moveTo(m, -e); g.lineTo(m, e); g.moveTo(-e, 0); g.lineTo(-m, 0); g.moveTo(m, 0); g.lineTo(e, 0);
      g.moveTo(0, -e); g.lineTo(0, e);   // the ladder: a spine with rungs
      for (const y of [-.33, -.27, -.2, -.07, .07, .2, .27, .33]) { g.moveTo(-m, y); g.lineTo(m, y); }
      for (const y of [-.135, .135]) { g.moveTo(-m * .55, y - .03); g.lineTo(-m * .55, y + .03); g.moveTo(m * .55, y - .03); g.lineTo(m * .55, y + .03); }
      g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.save(); g.translate(sx * (m + e) / 2, sy * e / 2);
        const w = e - m - .02;
        lens(g, w, .17); g.stroke(); lens(g, w * .64, .095); g.stroke();
        dot(g, 0, 0, .026, S.line, S, lw * .5);
        g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2 - .01, 0); g.stroke();
        g.restore();
      }
    },
    circles5(g, S, lw) {
      for (const [x, y] of FIVE(.235)) {
        g.beginPath(); g.arc(x, y, .1, 0, TAU); g.strokeStyle = S.line; g.lineWidth = lw * 1.25; g.stroke();
        dot(g, x, y, .058, S.dot, S, lw);
      }
    },
    dots4(g, S, lw) {
      const q = P / 4;
      g.strokeStyle = S.line; g.lineWidth = lw; g.beginPath(); g.moveTo(0, -P / 2 + .03); g.lineTo(0, P / 2 - .03); g.moveTo(-P / 2 + .03, 0); g.lineTo(P / 2 - .03, 0); g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        g.save(); g.translate(sx * q, sy * q);
        zigSquare(g, .15, 4, .03);
        for (const [x, y] of FIVE(.062)) dot(g, x, y, .021, S.dot, S, lw * .6);
        g.restore();
      }
    },
    zig5(g, S, lw) {
      g.strokeStyle = S.line; g.lineWidth = lw; g.strokeRect(-.37, -.37, .74, .74);
      zigSquare(g, .37, 7, .05);
      // a stepped diamond round the centre
      g.save(); g.rotate(Math.PI / 4); zigSquare(g, .17, 3, .03); g.restore();
      for (const [x, y] of [[0, 0], [-.075, 0], [.075, 0], [0, -.075], [0, .075]]) dot(g, x, y, .026, S.dot, S, lw * .6);
    },
    dotgrid(g, S, lw) {
      const e = P / 2 - .04;
      g.strokeStyle = S.line; g.lineWidth = lw; g.strokeRect(-e, -e, 2 * e, 2 * e);
      g.beginPath(); for (const o of [-.014, .014]) { g.moveTo(o, -e); g.lineTo(o, e); g.moveTo(-e, o); g.lineTo(e, o); } g.stroke();
      const s = (e - .014) / 2;
      g.beginPath(); for (const sg of [-1, 1]) { const m = sg * (.014 + s); g.moveTo(m, -e); g.lineTo(m, e); g.moveTo(-e, m); g.lineTo(e, m); } g.stroke();
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const a of [0, 1]) for (const b of [0, 1]) {
        const x = sx * (.014 + s * (a + .5)), y = sy * (.014 + s * (b + .5));
        g.strokeStyle = S.line; g.lineWidth = lw * .4; g.strokeRect(x - .045, y - .045, .09, .09); dot(g, x, y, .02, S.line, S, lw * .4);   // (the width set every time: dot() changes it)
      }
    },
  };

  /* ---------- the top: bitumen, diamond bands, lapis fields, plaques ---------- */
  function paintTop(g, Wpx, pass) {
    const k = Wpx / W, S = palette(pass, g), lw = .011;
    g.setTransform(k, 0, 0, k, -minX * k, -minZ * k);
    g.fillStyle = S.bit; g.fillRect(minX, minZ, W, D);
    if (S.noise) { g.globalAlpha = .18; g.fillStyle = S.noise; g.fillRect(minX, minZ, W, D); g.globalAlpha = 1; }
    if (pass === 'c') {   // a dull sheen is patchy: worn smooth here, dusty there
      g.globalAlpha = .12; g.fillStyle = pat(g, GREYN(), 1 / 60); g.globalCompositeOperation = 'overlay'; g.fillRect(minX, minZ, W, D); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    }
    if (pass === 'r') { g.globalAlpha = .35; g.fillStyle = pat(g, GREYN(), 1 / 90); g.fillRect(minX, minZ, W, D); g.globalAlpha = 1; }
    // diamond bands
    seed = 99;
    const t = .1;
    for (const [x0, z0, x1, z1] of BANDS) {
      const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
      g.save(); g.translate(x0, z0); g.rotate(ang);
      g.fillStyle = S.shellEdge; g.fillRect(-t - .012, -t - .012, L + 2 * (t + .012), .012); g.fillRect(-t - .012, t, L + 2 * (t + .012), .012);   // the fine shell lines run on into the corners
      const n = Math.max(1, Math.round(L / .148)), p = L / n;
      for (let i = 0; i < n; i++) {
        const cx = (i + .5) * p, j = (rnd() - .5) * .008, q1 = rnd(), q2 = rnd(), q3 = rnd(), q4 = rnd(), q5 = rnd();
        g.beginPath(); g.moveTo(cx - p * .44, j); g.lineTo(cx, -t * .82); g.lineTo(cx + p * .44, j); g.lineTo(cx, t * .82); g.closePath();
        g.fillStyle = S.shell; g.fill();
        if (pass === 'c') { g.fillStyle = q1 < .3 ? `rgba(120,85,40,${(.15 + q2 * .25).toFixed(2)})` : `rgba(255,248,230,${(q2 * .18).toFixed(2)})`; g.fill(); }   // each piece its own tone
        for (const ex of [i * p, (i + 1) * p]) { g.beginPath(); g.moveTo(ex - p * .06, 0); g.lineTo(ex, -t * .5); g.lineTo(ex + p * .06, 0); g.lineTo(ex, t * .5); g.closePath(); g.fillStyle = S.red; g.fill(); }   // red between (and at the corners)
        if (q3 < .07) { g.fillStyle = S.bit; g.beginPath(); g.arc(cx + (q4 - .5) * .06, (q5 - .5) * .08, .018 + q4 * .014, 0, TAU); g.fill(); }   // a small chip (the band itself stays complete)
      }
      g.restore();
      // a shell square at each corner joins the band round the turn
      g.save(); g.translate(x0, z0); g.rotate(Math.PI / 4); const cs = t * .55; g.fillStyle = S.shell; g.fillRect(-cs / 2, -cs / 2, cs, cs); g.restore();
    }
    // lapis fields: mottled ground, then the strips cut into small pieces with dark joints
    seed = 5;
    for (const [x0, z0, x1, z1] of FIELDS) {
      g.fillStyle = S.lap; g.fillRect(x0, z0, x1 - x0, z1 - z0);
      const strips = [];
      for (let z = z0 + P; z < z1 - .01; z += U) strips.push([x0, z, x1, z, true]);
      for (let x = x0 + P; x < x1 - .01; x += U) strips.push([x, z0, x, z1, false]);
      strips.push([x0, z0 - .005, x1, z0 - .005, true]);
      for (const [a, b, c2, d2, hor] of strips) {
        const L = hor ? c2 - a : d2 - b; let s = 0;
        while (s < L) {
          const len = Math.min(L - s, .06 + rnd() * .14), wv = rnd(), w2 = rnd(), j1 = rnd(), j2 = rnd();
          const rx = hor ? a + s : a, rz = hor ? b : b + s, rw = hor ? len : BAND, rh = hor ? BAND : len;
          if (pass === 'c') { g.fillStyle = wv < .1 ? 'rgba(120,130,170,.3)' : wv < .6 ? `rgba(6,10,45,${(w2 * .45).toFixed(2)})` : `rgba(60,80,180,${(w2 * .16).toFixed(2)})`; g.fillRect(rx, rz, rw, rh); }
          else if (pass === 'h') { const v = 120 + w2 * 50 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rx, rz, rw, rh); }
          else { const v = 70 + w2 * 60 | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rx, rz, rw, rh); }
          g.strokeStyle = S.joint; g.lineWidth = .006; g.beginPath();
          if (hor) { g.moveTo(rx, rz + (j1 - .5) * .02); g.lineTo(rx + (j2 - .5) * .02, rz + rh); } else { g.moveTo(rx + (j1 - .5) * .02, rz); g.lineTo(rx + rw, rz + (j2 - .5) * .02); }
          g.stroke(); s += len;
        }
      }
      g.strokeStyle = S.joint; g.lineWidth = .008; g.strokeRect(x0, z0, x1 - x0, z1 - z0);
    }
    // the plaques
    for (const [r, c] of CELLS) {
      const [cx, cz] = pt(r, c), v = VAR[r * 8 + c], h = P / 2;
      g.save(); g.translate(cx, cz);
      g.save(); g.beginPath(); g.rect(-h, -h, P, P); g.clip();
      if (pass === 'c') {
        g.fillStyle = pat(g, SHELL(), 1 / 300, v.ox * 3, v.oy * 3, v.tint * 90); g.fillRect(-h, -h, P, P);
        // age: each plaque its own yellowing / greying, darker towards the worn edges
        g.fillStyle = v.tint < .35 ? `rgba(170,120,40,${(.08 + v.tint2 * .14).toFixed(2)})` : v.tint < .7 ? `rgba(120,95,60,${(.05 + v.tint2 * .12).toFixed(2)})` : `rgba(255,250,235,${(.05 + v.tint2 * .12).toFixed(2)})`;
        g.fillRect(-h, -h, P, P);
        const gr = g.createRadialGradient(0, 0, P * .25, 0, 0, P * .75); gr.addColorStop(0, 'rgba(90,60,25,0)'); gr.addColorStop(1, `rgba(90,60,25,${(.18 + v.tint2 * .14).toFixed(2)})`); g.fillStyle = gr; g.fillRect(-h, -h, P, P);
      } else { g.fillStyle = S.shell; g.fillRect(-h, -h, P, P); if (S.noise) { g.globalAlpha = .12; g.fillStyle = S.noise; g.fillRect(-h, -h, P, P); g.globalAlpha = 1; } }
      const m = motif(r, c); if (m) MOTIF[m](g, S, lw);
      // hairline cracks (dirt in them)
      seed = v.cs;
      for (let i = 0; i < v.cracks; i++) {
        let x = (rnd() - .5) * P, y = -h; const vert = rnd() < .5; if (!vert) { y = x; x = -h; }
        g.beginPath(); g.moveTo(x, y);
        for (let s = 0; s < 6; s++) { if (vert) { x += (rnd() - .5) * .06; y += P / 6; } else { y += (rnd() - .5) * .06; x += P / 6; } g.lineTo(x, y); }
        g.strokeStyle = pass === 'c' ? 'rgba(60,40,20,.45)' : pass === 'h' ? '#8a8a8a' : '#c0c0c0'; g.lineWidth = .005; g.stroke();
      }
      // chipped corners / edges: the bitumen bed shows through
      for (const [corner, sz] of v.chips) {
        const sx = corner & 1 ? 1 : -1, sy = corner & 2 ? 1 : -1, a = .05 + sz * .06;
        g.beginPath(); g.moveTo(sx * h, sy * (h - a)); g.lineTo(sx * (h - a * .4), sy * (h - a * .8)); g.lineTo(sx * (h - a * .7), sy * (h - a * .3)); g.lineTo(sx * (h - a), sy * h); g.lineTo(sx * h, sy * h); g.closePath();
        g.fillStyle = pass === 'c' ? 'rgba(40,30,22,1)' : pass === 'h' ? '#505050' : '#a0a0a0'; g.fill();
      }
      g.restore();
      g.strokeStyle = pass === 'c' ? 'rgba(30,22,16,.55)' : pass === 'h' ? '#707070' : '#c8c8c8'; g.lineWidth = .007; g.strokeRect(-h, -h, P, P);   // the joint round the plaque
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- the sides of the box: red limestone and shell slips, eye plaques ---------- */
  // the outline (seen from above, x right, z down): clockwise
  const OUT = [[-X0, -Z0], [XB, -Z0], [XB, -ZB], [XS, -ZB], [XS, -Z0], [X0, -Z0], [X0, Z0], [XS, Z0], [XS, ZB], [XB, ZB], [XB, Z0], [-X0, Z0]];
  const BANDS = (() => {   // OUT runs clockwise on screen (x right, z down): inward normal of an edge d = (−dz, dx)
    const n = OUT.length, nrm = i => { const p = OUT[i], q = OUT[(i + 1) % n], L = Math.hypot(q[0] - p[0], q[1] - p[1]); return [-(q[1] - p[1]) / L, (q[0] - p[0]) / L]; };
    const V = OUT.map((p, i) => { const a = nrm((i + n - 1) % n), b = nrm(i); return [p[0] + BM * (a[0] + b[0]), p[1] + BM * (a[1] + b[1])]; });
    return V.map((p, i) => [p[0], p[1], V[(i + 1) % n][0], V[(i + 1) % n][1]]);
  })();
  // the sides, traversed so that u runs to the right as seen from outside (counter-clockwise from above)
  const SIDES = (() => { const L = [], n = OUT.length; let u = 0;
    for (let i = 0; i < n; i++) { const p = OUT[(n - i) % n], q = OUT[(n - i - 1 + n) % n], len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      L.push({ p, q, len, u0: u, strip: Math.abs(q[1] - p[1]) < 1e-6 }); u += len; }
    L.total = u; return L; })();
  function paintSide(g, Wpx, Hpx, pass) {
    const S = palette(pass, g), kx = Wpx / SIDES.total, ky = Hpx / H;
    g.setTransform(kx, 0, 0, ky, 0, 0);
    g.fillStyle = S.bit; g.fillRect(0, 0, SIDES.total, H);
    seed = 314;
    const eye = (x, w) => {   // an eye plaque on a side slip
      g.save(); g.translate(x + w / 2, H * .52); g.scale(1, ky / kx > 0 ? 1 : 1);
      g.strokeStyle = S.line; g.lineWidth = .012;
      lens(g, w * .86, H * .32); g.stroke(); lens(g, w * .56, H * .18); g.stroke();
      g.beginPath(); g.arc(0, 0, H * .055, 0, TAU); g.fillStyle = S.line; g.fill();
      g.restore();
    };
    for (const s of SIDES) {
      g.save(); g.translate(s.u0, 0);
      if (s.strip && s.len > .5) {
        let x = .03; const top = H * .07, bot = H * .9;
        let nextEye = .35 + rnd() * .5;
        while (x < s.len - .04) {
          if (x > nextEye && x < s.len - .55) {
            const w = .4 + rnd() * .06, q = rnd(); g.fillStyle = S.shell; g.fillRect(x, top, w, bot - top);
            if (pass === 'c') { g.fillStyle = `rgba(150,110,50,${(q * .25).toFixed(2)})`; g.fillRect(x, top, w, bot - top); }
            eye(x, w); x += w + .012; nextEye = x + .9 + rnd() * .7; continue;
          }
          const red = rnd() < .5, w = red ? .04 + rnd() * .035 : .05 + rnd() * .045, q = rnd();
          g.fillStyle = red ? S.red : S.shell; g.fillRect(x, top, Math.min(w, s.len - .04 - x), bot - top);
          if (pass === 'c') { g.fillStyle = `rgba(${red ? '50,20,10' : '130,95,50'},${(q * .38).toFixed(2)})`; g.fillRect(x, top, Math.min(w, s.len - .04 - x), bot - top); }
          x += w + .01;
        }
        g.fillStyle = S.shell; g.fillRect(0, 0, s.len, H * .055);   // the shell slip round the top edge
        if (pass === 'c') { g.fillStyle = 'rgba(120,90,50,.25)'; g.fillRect(0, 0, s.len, H * .055); }
      } else {
        g.fillStyle = S.shellEdge; g.fillRect(0, 0, s.len, H * .045);
      }
      g.restore();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------- canvases → textures (colour, normal from a height pass, roughness) ---------- */
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function normalFrom(hc, strength) {
    const w = hc.width, h = hc.height, src = hc.getContext('2d').getImageData(0, 0, w, h).data, out = canvas(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), d = img.data;
    const Hh = (x, y) => src[((Math.min(h - 1, Math.max(0, y))) * w + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (Hh(x + 1, y - 1) + 2 * Hh(x + 1, y) + Hh(x + 1, y + 1)) - (Hh(x - 1, y - 1) + 2 * Hh(x - 1, y) + Hh(x - 1, y + 1));
      const dy = (Hh(x - 1, y + 1) + 2 * Hh(x, y + 1) + Hh(x + 1, y + 1)) - (Hh(x - 1, y - 1) + 2 * Hh(x, y - 1) + Hh(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1; const L = Math.hypot(nx, ny, nz); nx /= L; ny /= L; nz /= L;
      const i = (y * w + x) * 4; d[i] = (nx * .5 + .5) * 255; d[i + 1] = (ny * .5 + .5) * 255; d[i + 2] = (nz * .5 + .5) * 255; d[i + 3] = 255;
    }
    og.putImageData(img, 0, 0); return out;
  }
  function tex(c, srgb) { const TT = T(), t = new TT.CanvasTexture(c); t.encoding = srgb ? TT.sRGBEncoding : TT.LinearEncoding; t.anisotropy = 8; return t; }
  let TOPT = null, SIDET = null;
  function topTextures() {
    if (TOPT) return TOPT;
    const cw = SZ(3072), ch = Math.round(cw * D / W), nw = SZ(2048), nh = Math.round(nw * D / W), rw = SZ(1024), rh = Math.round(rw * D / W);
    const c = canvas(cw, ch); paintTop(c.getContext('2d'), cw, 'c');
    const hc = canvas(nw, nh); paintTop(hc.getContext('2d'), nw, 'h');
    const rc = canvas(rw, rh); paintTop(rc.getContext('2d'), rw, 'r');
    return (TOPT = { map: tex(c, true), normal: tex(normalFrom(hc, 1.1 * nw / 2048), false), rough: tex(rc, false) });
  }
  function sideTextures() {
    if (SIDET) return SIDET;
    const cw = SZ(6144), ch = SZ(192), nw = SZ(4096), nh = SZ(128);
    const c = canvas(cw, ch); paintSide(c.getContext('2d'), cw, ch, 'c');
    const hc = canvas(nw, nh); paintSide(hc.getContext('2d'), nw, nh, 'h');
    const rc = canvas(nw / 2, nh / 2); paintSide(rc.getContext('2d'), nw / 2, nh / 2, 'r');
    return (SIDET = { map: tex(c, true), normal: tex(normalFrom(hc, .9), false), rough: tex(rc, false) });
  }

  /* ---------- geometry ---------- */
  const planarUV = geo => { const Pp = geo.attributes.position, UV = geo.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (Pp.getX(i) - minX) / W, 1 - (Pp.getZ(i) - minZ) / D); UV.needsUpdate = true; };
  function merged(parts) {   // [{ geo }] (indexed, non-indexed mixed) → one indexed geometry with position / normal / uv
    const TT = T(), Pa = [], Na = [], Ua = [], I = []; let base = 0;
    for (const g of parts) {
      const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
      for (let i = 0; i < p.count; i++) { Pa.push(p.getX(i), p.getY(i), p.getZ(i)); Na.push(n.getX(i), n.getY(i), n.getZ(i)); Ua.push(u.getX(i), u.getY(i)); }
      if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + base); else for (let i = 0; i < p.count; i++) I.push(i + base);
      base += p.count; g.dispose();
    }
    const out = new TT.BufferGeometry();
    out.setAttribute('position', new TT.Float32BufferAttribute(Pa, 3)); out.setAttribute('normal', new TT.Float32BufferAttribute(Na, 3)); out.setAttribute('uv', new TT.Float32BufferAttribute(Ua, 2));
    out.setIndex(I); out.computeBoundingSphere(); return out;
  }
  const mats = {};
  function board() {
    const TT = T(), g = new TT.Group(), tt = topTextures(), st = sideTextures();
    const topM = mats.top || (mats.top = new TT.MeshStandardMaterial({ map: tt.map, normalMap: tt.normal, normalScale: new TT.Vector2(1, 1), roughnessMap: tt.rough, roughness: 1, metalness: 0, envMapIntensity: .9 }));
    const sideM = mats.side || (mats.side = new TT.MeshStandardMaterial({ map: st.map, normalMap: st.normal, roughnessMap: st.rough, roughness: 1, metalness: 0, envMapIntensity: .8 }));
    // bitumen top (with the diamond bands) and the bottom
    const shp = new TT.Shape(); OUT.forEach(([x, z], i) => (i ? shp.lineTo(x, -z) : shp.moveTo(x, -z))); shp.closePath();
    const top = new TT.ShapeGeometry(shp); top.rotateX(-Math.PI / 2); top.translate(0, H, 0); planarUV(top);
    // the inlay: three lapis fields, and the twenty plaques (each a little higher / lower and leaning)
    const parts = [top];
    for (const [x0, z0, x1, z1] of FIELDS) { const b = new TT.BoxGeometry(x1 - x0, FR + .004, z1 - z0); b.translate((x0 + x1) / 2, H + (FR - .004) / 2, (z0 + z1) / 2); parts.push(b); }
    for (const [r, c] of CELLS) {
      const v = VAR[r * 8 + c], [x, z] = pt(r, c), hh = FR + v.dh, b = new TT.BoxGeometry(P - .004, hh, P - .004);
      b.translate(0, hh / 2, 0); b.applyMatrix4(new TT.Matrix4().makeRotationFromEuler(new TT.Euler(v.rx, 0, v.rz))); b.translate(x, H, z); parts.push(b);
    }
    parts.forEach(planarUV);
    const tg = merged(parts), tm = new TT.Mesh(tg, topM); tm.castShadow = false; tm.receiveShadow = true; g.add(tm);
    // the box sides (one strip of quads round the outline) + bottom
    const Pa = [], Na = [], Ua = [], I = [];
    for (const s of SIDES) {
      const [px, pz] = s.p, [qx, qz] = s.q, nx = (qz - pz) / s.len, nz = -(qx - px) / s.len, b = Pa.length / 3;
      // outward normal: the outline runs counter-clockwise (seen from above, z down) → outward = (dz, -dx) flipped
      const on = [-nx, 0, -nz];
      Pa.push(px, 0, pz, qx, 0, qz, qx, H, qz, px, H, pz);
      for (let k = 0; k < 4; k++) Na.push(...on);
      const u0 = s.u0 / SIDES.total, u1 = (s.u0 + s.len) / SIDES.total; Ua.push(u0, 0, u1, 0, u1, 1, u0, 1);
      // winding: front face towards `on`
      const e1 = [qx - px, 0, qz - pz], e2 = [0, H, 0], cx = e1[1] * e2[2] - e1[2] * e2[1], cz = e1[0] * e2[1] - e1[1] * e2[0];
      if (cx * on[0] + cz * on[2] > 0) I.push(b, b + 1, b + 2, b, b + 2, b + 3); else I.push(b, b + 2, b + 1, b, b + 3, b + 2);
    }
    const sg = new TT.BufferGeometry(); sg.setAttribute('position', new TT.Float32BufferAttribute(Pa, 3)); sg.setAttribute('normal', new TT.Float32BufferAttribute(Na, 3)); sg.setAttribute('uv', new TT.Float32BufferAttribute(Ua, 2)); sg.setIndex(I); sg.computeBoundingSphere();
    const sm = new TT.Mesh(sg, sideM); sm.castShadow = true; sm.receiveShadow = true; g.add(sm);
    const bs = new TT.Shape(); OUT.forEach(([x, z], i) => (i ? bs.lineTo(x, z) : bs.moveTo(x, z))); bs.closePath();
    const bot = new TT.ShapeGeometry(bs); bot.rotateX(Math.PI / 2); bot.translate(0, .001, 0);
    const bm = new TT.Mesh(bot, mats.bot || (mats.bot = new TT.MeshStandardMaterial({ color: lin(0x141110), roughness: .8 }))); bm.castShadow = true; bm.receiveShadow = false; g.add(bm);
    // a top-face caster (the top mesh doesn't cast: its plaques would self-shadow in streaks)
    const cap = new TT.ShapeGeometry(shp); cap.rotateX(-Math.PI / 2); cap.translate(0, H - .002, 0);
    const cm = new TT.Mesh(cap, mats.bot); cm.castShadow = true; cm.receiveShadow = false; cm.visible = true; g.add(cm);
    Object.assign(g.userData, userData());
    return g;
  }

  /* ---------- pieces ---------- */
  const PR = .3, PH = .085;
  const LOOKS = {   // [light, dark]: body, dots, roughness, metal
    orig:  [{ body: SHELL, tint: null, dot: 'lapis', rough: .55 }, { body: 'shale', dot: 'shell', rough: .5 }],
    ivory: [{ body: 'ivory', dot: 'ebony', rough: .38 }, { body: 'ebony', dot: 'ivory', rough: .34 }],
    wood:  [{ body: 'wood', dot: 'burnt', rough: .6 }, { body: 'burnt', dot: 'wood', rough: .55 }],
    gold:  [{ body: 'gold', dot: 'lapis', rough: .28, metal: true }, { body: 'lapisb', dot: 'gold', rough: .35 }],
  };
  const FILL = {
    shale: () => { const N = makeNoise(61), f = tileN(N, 5, 4), f2 = tileN(N, 30, 2); return swatch('urShale', 128, (u, v) => { const t = (f(u, v) - .5) * 40 + (f2(u, v) - .5) * 18; return [cl(52 + t), cl(55 + t), cl(60 + t)]; }); },
    ivory: () => { const N = makeNoise(63), f = tileN(N, 3, 3), f2 = tileN(N, 50, 1); return swatch('urIvory', 128, (u, v) => { const t = (f(u, v) - .5) * 20 + (f2(u, v) - .5) * 8; return [cl(238 + t), cl(228 + t), cl(204 + t)]; }); },
    ebony: () => { const N = makeNoise(65), f = tileN(N, 2, 3), f2 = tileN(N, 4, 1); return swatch('urEbony', 128, (u, v) => { const t = (f(u, v * 8) - .5) * 26 + (f2(u * 30, v) - .5) * 10; return [cl(36 + t), cl(28 + t), cl(24 + t)]; }); },
    wood: () => { const N = makeNoise(67), f = tileN(N, 2, 3); return swatch('urWood', 128, (u, v) => { const r = Math.sin((v * 14 + f(u, v) * 3) * TAU) * .5 + .5, t = r * 26 + (f(u * 2, v * 2) - .5) * 20; return [cl(214 - t), cl(170 - t), cl(118 - t * .8)]; }); },
    burnt: () => { const N = makeNoise(69), f = tileN(N, 2, 3); return swatch('urBurnt', 128, (u, v) => { const r = Math.sin((v * 14 + f(u, v) * 3) * TAU) * .5 + .5, t = r * 22 + (f(u * 2, v * 2) - .5) * 16; return [cl(96 - t), cl(56 - t * .7), cl(30 - t * .4)]; }); },
    gold: () => { const N = makeNoise(71), f = tileN(N, 6, 2); return swatch('urGold', 128, (u, v) => { const t = (f(u, v) - .5) * 30; return [cl(232 + t), cl(186 + t), cl(92 + t * .5)]; }); },
    lapisb: LAPIS, lapis: LAPIS, shell: SHELL,
  };
  const pieceGeos = {};
  function pieceGeo() {
    const key = LO() ? 'lo' : 'hi'; if (pieceGeos[key]) return pieceGeos[key];
    const TT = T(), prof = [[0, 0], [PR - .03, 0], [PR - .008, .008], [PR, .028], [PR + .002, .05], [PR - .004, .068], [PR - .018, .08], [PR - .05, PH], [PR * .5, PH + .004], [0, PH + .005]];
    const g = new TT.LatheGeometry(prof.map(([a, b]) => new TT.Vector2(a, b)), LO() ? 20 : 32);
    const Pp = g.attributes.position, UV = g.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, .5 + Pp.getX(i) / (2 * PR * 1.04), .5 - Pp.getZ(i) / (2 * PR * 1.04));
    if (X.share) X.share(g); return (pieceGeos[key] = g);
  }
  const pieceMats = {};
  function pieceMat(side, design) {
    const key = side + design; if (pieceMats[key]) return pieceMats[key];
    const TT = T(), L = (LOOKS[design] || LOOKS.orig)[side], n = SZ(256), Dn = n / 2;
    const body = typeof L.body === 'function' ? L.body() : FILL[L.body](), dotC = FILL[L.dot]();
    const dots = (g, f) => { for (const [x, y] of FIVE(.42)) { g.beginPath(); g.arc(Dn + x * Dn * .96 * .78, Dn + y * Dn * .96 * .78, Dn * .085, 0, TAU); f(); } };
    seed = side * 31 + design.length;
    const c = canvas(n, n), g = c.getContext('2d');
    g.fillStyle = g.createPattern(body, 'repeat'); g.fillRect(0, 0, n, n);
    const gr = g.createRadialGradient(Dn * .9, Dn * .85, Dn * .1, Dn, Dn, Dn); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.85, 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = gr; g.fillRect(0, 0, n, n);
    const dp = g.createPattern(dotC, 'repeat'); dots(g, () => { g.fillStyle = dp; g.fill(); g.strokeStyle = 'rgba(20,14,10,.55)'; g.lineWidth = n / 160; g.stroke(); });
    const hc = canvas(n, n), h = hc.getContext('2d'); h.fillStyle = '#b0b0b0'; h.fillRect(0, 0, n, n); dots(h, () => { h.fillStyle = '#a4a4a4'; h.fill(); h.strokeStyle = '#606060'; h.lineWidth = n / 110; h.stroke(); });
    const o = { map: tex(c, true), normalMap: tex(normalFrom(hc, 1.6), false), roughness: L.rough, metalness: 0 };
    if (L.metal) { const mc = canvas(n, n), mg = mc.getContext('2d'); mg.fillStyle = '#ffffff'; mg.fillRect(0, 0, n, n); dots(mg, () => { mg.fillStyle = '#000'; mg.fill(); }); o.metalness = 1; o.metalnessMap = tex(mc, false); o.roughness = .3; }
    return (pieceMats[key] = new TT.MeshStandardMaterial(o));
  }
  // side 0 = light (shell, row 2 / near), 1 = dark (shale, row 0 / far); design 'orig' | 'ivory' | 'wood' | 'gold'
  function piece(side, design = 'orig') {
    const TT = T(), g = new TT.Group(), m = new TT.Mesh(pieceGeo(), pieceMat(side ? 1 : 0, LOOKS[design] ? design : 'orig'));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    g.userData = { side, design, h: PH, r: PR }; return g;
  }

  /* ---------- dice: truncated tetrahedra, two tips inlaid (shell ring, lapis centre) ---------- */
  const DR = .3, DT = .3;   // circumradius, how much of each edge the tips are cut
  const TV = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]].map(v => v.map(a => a * DR / Math.sqrt(3)));
  const MARKED = [true, true, false, false];
  const dieGeos = {};
  function dieGeo(look) {
    if (dieGeos[look]) return dieGeos[look];
    // colours come from a small swatch strip (UVs point into it): vertex colours would be lost when the showcase merges meshes
    const TT = T(), Pa = [], Ca = [];
    const add = (a, b, c, col) => {   // col = [u, v] in the swatch strip   // a triangle, turned to face outwards
      const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])];
      const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
      if (n[0] * m[0] + n[1] * m[1] + n[2] * m[2] < 0) { const t = b; b = c; c = t; }
      Pa.push(...a, ...b, ...c); for (let k = 0; k < 3; k++) Ca.push(col[0], col[1]);
    };
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const cut = (i, j) => lerp(TV[i], TV[j], DT);
    seed = 77;
    const shell = [.6875, .5], lap = [.9375, .5];
    const jit = () => [.0625 + (rnd() * 3 | 0) * .125, .5];   // one of the body tones (columns 0..2 of 8)
    // the four faces (hexagons), each opposite one vertex
    for (let l = 0; l < 4; l++) {
      const [i, j, k] = [0, 1, 2, 3].filter(x => x !== l), hx = [cut(i, j), cut(j, i), cut(j, k), cut(k, j), cut(k, i), cut(i, k)];
      const cen = [0, 1, 2].map(a => (TV[i][a] + TV[j][a] + TV[k][a]) / 3), col = jit();
      for (let s = 0; s < 6; s++) add(cen, hx[s], hx[(s + 1) % 6], col);
    }
    // the tips: plain, or a shell ring with a lapis centre
    for (let i = 0; i < 4; i++) {
      const o = [0, 1, 2, 3].filter(x => x !== i), tri = o.map(j => cut(i, j)), cen = [0, 1, 2].map(a => (tri[0][a] + tri[1][a] + tri[2][a]) / 3);
      // pull the tip out a little: a rounded point instead of a flat cut
      const tip = lerp(cen, TV[i], .82);   // nearly the full point: sharp tips
      if (!MARKED[i]) { for (let s = 0; s < 3; s++) add(tip, tri[s], tri[(s + 1) % 3], jit()); continue; }
      const inn = tri.map(p => lerp(tip, p, .5));
      for (let s = 0; s < 3; s++) { const a = tri[s], b = tri[(s + 1) % 3], ia = inn[s], ib = inn[(s + 1) % 3]; add(a, b, ib, shell); add(a, ib, ia, shell); add(tip, ia, ib, lap); }
    }
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(Pa, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(Ca, 2));
    g.computeVertexNormals();   // (non-indexed: flat faces) g.computeBoundingSphere();
    if (X.share) X.share(g); return (dieGeos[look] = g);
  }
  const dieMats = {};
  function die(o = {}) {
    const TT = T(), look = o.look === 'stone' ? 'stone' : 'bone';   // bone / shell-like (default), or a darker stone
    const mt = dieMats[look] || (dieMats[look] = (() => {
      const c = canvas(8, 1), x = c.getContext('2d'), B = look === 'stone' ? ['#a89a84', '#9e8f78', '#b1a48f'] : ['#d6c7a6', '#ccbb98', '#ddd0b2'];
      ['', '', '', '', '', '#fbf8f0', '#fbf8f0', '#1f3290'].forEach((col, i) => { x.fillStyle = col || B[i % 3]; x.fillRect(i, 0, 1, 1); });
      const t = tex(c, true); t.magFilter = t.minFilter = TT.NearestFilter; t.generateMipmaps = false; t.anisotropy = 1;
      return new TT.MeshStandardMaterial({ map: t, roughness: look === 'bone' ? .42 : .6, metalness: 0 }); })());
    const g = new TT.Group(), m = new TT.Mesh(dieGeo(look), mt); m.castShadow = true; m.receiveShadow = true; g.add(m);
    g.userData = { die: look, rest: DR / 3 }; return g;
  }
  // turn a die so that a marked (white) tip — or a plain one — points straight up, resting on the opposite face; yaw about the vertical
  function dieUp(g, marked, yaw = 0) {
    const TT = T(), v = new TT.Vector3(...TV[marked ? 0 : 2]).normalize();
    const q = new TT.Quaternion().setFromUnitVectors(v, new TT.Vector3(0, 1, 0));
    g.quaternion.copy(new TT.Quaternion().setFromAxisAngle(new TT.Vector3(0, 1, 0), yaw).multiply(q));
    return g;
  }

  /* ---------- places off the board ---------- */
  const TOP = H + FR + .02;   // pieces rest here on the plaques
  const sgn = side => (side ? -1 : 1);   // side 0 near (+z), side 1 far (−z)
  // pieces waiting to enter: a row beside the big block, outside the board (k = 0..6)
  const start = (side, k) => [-3.62 + k * .66, sgn(side) * (Z0 + .42)];
  // finished pieces: two stacks on the table in the notch beside the bridge (k = 0..6) → [x, y, z]
  const goal = (side, k) => [k < 4 ? .62 : 1.38, (k % 4) * (PH + .004), sgn(side) * (ZB + Z0) / 2];
  // the four dice of each side, beside the small block (k = 0..3)
  const diceAt = (side, k) => [2.05 + k * .56, sgn(side) * (Z0 + .46)];

  function userData() {
    return {
      U, P, W, D, H, top: TOP, S: W, outer: { w: W, d: D },
      grid: { w: 8 * U, d: 3 * U },                 // the 8 × 3 squares (pitch), centred on the origin: the DOM board's playing area
      pt: (r, c) => pt(r, c), exists, motif, rosette: (r, c) => motif(r, c) === 'rosette', cells: CELLS.slice(),
      piece, die, dieUp, PR, PH, dieRest: DR / 3, dieR: DR, dieVerts: TV.map(v => v.slice()), dieMarked: MARKED.slice(),
      start, goal, diceAt,
      // orientation: the model is built horizontal (rotation.y = 0). A vertical DOM board (phone portrait) is the same board turned
      // by rot.v = −π/2 (clockwise on screen: the big block on top, row 0 on the right, row 2 on the left) or rot.vccw = +π/2
      // (counter-clockwise: row 2 on the right, the big block at the bottom). orient(o) sets the board group's rotation.y.
      // A point (x, z) of the horizontal model ends at (x cos θ + z sin θ, −x sin θ + z cos θ).
      rot: { h: 0, v: -Math.PI / 2, vccw: Math.PI / 2 },
      size: o => (o === 'v' || o === 'vccw' ? { w: 3 * U, d: 8 * U } : { w: 8 * U, d: 3 * U }),   // grid size on screen (w across, d down): align(…, size(o).d, top)
    };
  }

  X.MODELS.ur = function (live) {
    const g = board(), Y = TOP, ud = g.userData;
    ud.orient = function (o) { g.rotation.y = ud.rot[o] || 0; ud.o = o in ud.rot ? o : 'h'; return g.rotation.y; };
    ud.o = 'h';
    if (live) return g;
    // a game in progress: light pieces on the near row / middle, dark on the far row / middle, a stack each in the notch
    const put = (side, x, y, z, rot) => { const p = piece(side); p.position.set(x, y, z); p.rotation.y = rot || 0; g.add(p); const sh = X.contact(PR * .95, .5); sh.position.set(x, y + .001, z); g.add(sh); };
    [[2, 2], [1, 1], [1, 6]].forEach(([r, c], i) => { const [x, z] = pt(r, c); put(0, x, Y, z, i); });
    [[0, 1], [1, 3], [1, 4]].forEach(([r, c], i) => { const [x, z] = pt(r, c); put(1, x, Y, z, i + 2); });
    for (let k = 0; k < 3; k++) { const [x, z] = start(0, k + 4); put(0, x, 0, z, k); const [x1, z1] = start(1, k + 4); put(1, x1, 0, z1, k); }
    { const [x, y, z] = goal(0, 0); put(0, x, y, z); const [x1, y1, z1] = goal(1, 0); put(1, x1, y1, z1); }
    // the four dice just thrown by the light side: 2
    [true, false, true, false].forEach((mk, k) => { const d = die(), [x, z] = diceAt(0, k); dieUp(d, mk, k * 1.3 + .4); d.position.set(x + (k % 2) * .05, DR / 3, z + (k % 2 ? .12 : -.05)); g.add(d); });
    g.scale.setScalar(1.15);   // about the other boards' size on the chabudai
    return g;
  };
  X.ur = { board, piece, die, dieUp, MOTIF, motif, pt, U, P, W, D, H, TOP, PR, PH, DR, start, goal, diceAt };
})();
