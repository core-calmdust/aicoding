/* =====================================================================
   Carrom on the 3D table — five boards (Table3D.BOARDS.carrom, chosen in the portal's 盤 row):
   · 'classic' the board of every Indian home and club: a honey-coloured birch plywood surface, lacquered and
              powdered, the ICF markings in black with red base circles and a red centre, arrows to the pockets and a rosette in
              the centre circle; a deep rosewood frame with curved inner corners, black netted pockets. Men of boxwood and ebony
              with turned rings, a red lacquer queen, a white acrylic striker with a printed star.
   · 'modern' (the default) an art board: the surface is a print of colour fields — four Mughal arches rising from the base lines round a
              rosette of overlapping circles, in terracotta, saffron, teal and ink on warm paper, with a fine risograph grain; the
              markings in ink and gold. A matte ink-blue lacquered frame with brass edging and brass-ringed pockets. Men in matte
              ivory and charcoal with a brass pip, a coral queen, a cream striker with a brass ring.
   · 'neon'      night: a black lacquered board with a faint grid, the markings drawn as glowing tubes (cyan, magenta,
              violet); a neon tube along the frame's inner edge and round the pockets. Men of acrylic: ice-white and smoked
              violet with glowing rings, a hot-pink queen, a clear striker with a cyan ring.
   · 'rajasthan' a painted miniature: a saffron field strewn with little paisleys (buta), a crimson border band with gold dots,
              a lotus mandala in the centre and lotus fans in the corners, markings in maroon and gold. A dark sheesham frame
              with brass inlay. Men painted like lacquerware: ivory with a red-dot ring, ebony with gold dots, a vermilion queen
              with a gold lotus, an ivory striker with a lotus.
   · 'bauhaus'   geometry in primaries on off-white paper: a red circle, a blue square, a yellow triangle and black bars, the
              markings in black. A matte black frame with a sharp edge. Men in matte white and black, a red queen, a yellow
              striker with a black ring.
   Real proportions (ICF laws): surface 74 cm, frame 7 cm, pockets 4.45 cm, men 3.18 cm, striker 4.13 cm.
   Registers into Table3D:
     Table3D.MODELS.carrom(live)   board (+ the opening arrangement and a striker unless live)
     Table3D.carrom = { board(look), LOOKS, K }
     userData: { top, K, S, look, xz(x, y) → [wx, wz] (board cm → world), piece(c 'w'|'b'|'q') → Group, striker() → Group, H (piece height) }
   Units: K world units per cm (the 88 cm board ≈ 10 world units across).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const K = 10 / 88, S = 37 * K, FW = 7 * K, FH = 2.2 * K, TOP = .26, RP = 2.225 * K, PC = (37 - 2.225) * K;
  const RM = 1.59 * K, RS = 2.065 * K, HM = .8 * K, HS = .9 * K;
  const LOOKS = ['classic', 'modern', 'neon', 'rajasthan', 'bauhaus'];
  const PRE = { classic: '', modern: 'm', neon: 'n', rajasthan: 'r', bauhaus: 'h' };   // the piece-face kinds of each look
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const lookNow = () => X.BOARDS && X.BOARDS.carrom ? X.BOARDS.carrom.get() : 'modern';

  /* ---------- the playing surface: a canvas in board centimetres ---------- */
  const PAL = {
    classic: { ink: '#16110d', red: '#c3271f', gold: null },
    modern: { ink: '#1d2340', red: '#d0563c', gold: '#b8893a' },
    neon: { ink: '#3ce6ff', red: '#ff3fb4', gold: '#b47bff', glow: 1.1 },
    rajasthan: { ink: '#5a1414', red: '#c7262c', gold: '#8a1c1c' },
    bauhaus: { ink: '#111111', red: '#d6332a', gold: null },
  };
  function markings(g, W, look) {
    const P = PAL[look], u = W / 74, X0 = cm => (cm + 37) * u;
    const glow = c => { if (P.glow) { g.shadowColor = c; g.shadowBlur = P.glow * u; } };
    const line = (x0, y0, x1, y1, w, c) => { glow(c); g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.moveTo(X0(x0), X0(y0)); g.lineTo(X0(x1), X0(y1)); g.stroke(); };
    const circ = (x, y, r, fill, stroke, w) => { glow(stroke || fill); g.beginPath(); g.arc(X0(x), X0(y), r * u, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w * u; g.stroke(); } };
    const accent = P.gold || P.ink;
    g.lineCap = 'round';
    for (let side = 0; side < 4; side++) {
      g.save(); g.translate(W / 2, W / 2); g.rotate(side * Math.PI / 2); g.translate(-W / 2, -W / 2);
      const yo = 37 - 10.15, yi = yo - 3.18, cx = 23.5 - 1.59;
      line(-cx, yo, cx, yo, .55, P.ink); line(-cx, yi, cx, yi, .3, P.ink);
      for (const s of [-1, 1]) { circ(s * cx, (yo + yi) / 2, 1.59, null, P.ink, .28); circ(s * cx, (yo + yi) / 2, 1.27, P.red); }
      g.restore();
    }
    // the arrows: on the diagonals, from 5 cm off the pocket towards the centre (25.7 cm), a head at the pocket end, an arc at the inner end
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const d0 = 34.775 * Math.SQRT2 - 2.225 - 5, d1 = d0 - 25.7, ux = sx / Math.SQRT2, uy = sy / Math.SQRT2;
      line(ux * d1, uy * d1, ux * d0, uy * d0, .2, P.ink);
      const hx = ux * d0, hy = uy * d0, px = -uy, py = ux, hl = 1.6, hw = .75;
      glow(P.ink); g.fillStyle = P.ink; g.beginPath(); g.moveTo(X0(hx + ux * .4), X0(hy + uy * .4)); g.lineTo(X0(hx - ux * hl + px * hw), X0(hy - uy * hl + py * hw)); g.lineTo(X0(hx - ux * hl - px * hw), X0(hy - uy * hl - py * hw)); g.closePath(); g.fill();
      const a = Math.atan2(uy, ux); g.strokeStyle = accent; g.lineWidth = .22 * u; g.beginPath(); g.arc(X0(ux * (d1 + 3.18)), X0(uy * (d1 + 3.18)), 3.18 * u, a + Math.PI * .28, a + Math.PI * 1.72, false); g.stroke();
    }
    // the centre: outer circle (17 cm), a rosette, the red centre circle (3.18 cm)
    circ(0, 0, 8.5, null, P.ink, .28);
    g.save(); g.translate(X0(0), X0(0));
    glow(accent); g.strokeStyle = accent; g.lineWidth = .16 * u;
    for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, -3.9 * u, 1.35 * u, 3.6 * u, 0, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    circ(0, 0, 7.6, null, accent, .14);
    circ(0, 0, 1.59, P.red, P.ink, .16);
    g.shadowBlur = 0;
  }
  function surfaceTex(look) {
    const W = SZ(2048);
    const t = X.canvasTex('crSurf' + look + W, W, W, (g) => {
      const N = X.makeNoise({ classic: 17, modern: 41, neon: 5, rajasthan: 29, bauhaus: 53 }[look]), img = g.createImageData(W, W), d = img.data;
      const u = W / 74, X0 = cm => (cm + 37) * u;
      const paper = (r, gg, b, amp, f) => { for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * f, y / W * f, 2), i = (y * W + x) * 4; d[i] = r - n * amp; d[i + 1] = gg - n * amp; d[i + 2] = b - n * amp; d[i + 3] = 255; } g.putImageData(img, 0, 0); };
      const grain = a => { const im = g.getImageData(0, 0, W, W), q = im.data; for (let i = 0; i < q.length; i += 4) { const r = (Math.random() - .5) * a; q[i] += r; q[i + 1] += r; q[i + 2] += r; } g.putImageData(im, 0, 0); };
      const quad = f => { for (let side = 0; side < 4; side++) { g.save(); g.translate(W / 2, W / 2); g.rotate(side * Math.PI / 2); g.translate(-W / 2, -W / 2); f(side); g.restore(); } };
      if (look === 'neon') {
        // black lacquer, a faint blue grid, a violet bloom in the middle and glowing quarter rings behind the pockets
        paper(12, 13, 26, 8, 30);
        g.strokeStyle = 'rgba(70,90,200,.16)'; g.lineWidth = .08 * u;
        for (let c = -36; c <= 36; c += 4) { g.beginPath(); g.moveTo(X0(c), 0); g.lineTo(X0(c), W); g.stroke(); g.beginPath(); g.moveTo(0, X0(c)); g.lineTo(W, X0(c)); g.stroke(); }
        const rg = g.createRadialGradient(X0(0), X0(0), 0, X0(0), X0(0), 22 * u); rg.addColorStop(0, 'rgba(150,70,255,.32)'); rg.addColorStop(1, 'rgba(150,70,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, W);
        quad(side => {
          const c = side % 2 ? '#ff3fb4' : '#3ce6ff'; g.shadowColor = c; g.shadowBlur = 1.4 * u; g.strokeStyle = c;
          for (const [r, w, a] of [[12, .32, .9], [15.5, .16, .55], [19, .1, .35]]) { g.globalAlpha = a; g.lineWidth = w * u; g.beginPath(); g.arc(X0(37), X0(37), r * u, Math.PI * 1.04, Math.PI * 1.46); g.stroke(); }
          g.globalAlpha = 1; g.shadowBlur = 0;
        });
      } else if (look === 'rajasthan') {
        // saffron paper, little paisleys in rows, a crimson border band with gold dots, a lotus mandala, lotus fans in the corners
        paper(236, 168, 70, 22, 36);
        const buta = (x, y, s, a, c) => { g.save(); g.translate(X0(x), X0(y)); g.rotate(a); g.scale(s * u, s * u); g.fillStyle = c; g.beginPath(); g.moveTo(0, 1); g.bezierCurveTo(-1.1, .9, -1.1, -.4, 0, -.9); g.bezierCurveTo(.5, -1.2, .9, -1.5, .7, -1.9); g.bezierCurveTo(1.3, -1.2, 1.1, .8, 0, 1); g.fill(); g.fillStyle = 'rgba(255,240,200,.75)'; g.beginPath(); g.arc(0, .05, .28, 0, 7); g.fill(); g.restore(); };
        g.globalAlpha = .42;
        for (let r = 0, y = -30; y <= 30; y += 5, r++) for (let x = -30 + (r % 2) * 2.5; x <= 30; x += 5) if (Math.hypot(x, y) > 10.5) buta(x, y, .85, (r % 2 ? .4 : -.4), r % 3 === 1 ? '#2f6b3a' : '#9e1f27');
        g.globalAlpha = 1;
        // the border band (inside the base lines' reach: along the edge)
        const b0 = 35.6, b1 = 33.3; g.fillStyle = '#a8222b'; g.fillRect(X0(-b0), X0(-b0), (2 * b0) * u, (b0 - b1) * u); g.fillRect(X0(-b0), X0(b1), (2 * b0) * u, (b0 - b1) * u); g.fillRect(X0(-b0), X0(-b0), (b0 - b1) * u, (2 * b0) * u); g.fillRect(X0(b1), X0(-b0), (b0 - b1) * u, (2 * b0) * u);
        g.fillStyle = '#e6c25a'; for (let t = -34.5; t <= 34.5; t += 1.5) for (const [x, y] of [[t, -(b0 + b1) / 2], [t, (b0 + b1) / 2], [-(b0 + b1) / 2, t], [(b0 + b1) / 2, t]]) { g.beginPath(); g.arc(X0(x), X0(y), .28 * u, 0, 7); g.fill(); }
        g.strokeStyle = '#c99a2e'; g.lineWidth = .14 * u; g.strokeRect(X0(-b1 + .3), X0(-b1 + .3), (2 * b1 - .6) * u, (2 * b1 - .6) * u);
        // lotus petals (a ring of n pointed petals between radii r0 and r1)
        const petals = (cx, cy, n, r0, r1, wd, fill, stroke, a0 = 0, a1 = Math.PI * 2) => {
          for (let k = 0; k < n; k++) { const a = a0 + (a1 - a0) * (k + .5) / n, ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
            g.beginPath(); g.moveTo(X0(cx + ca * r0), X0(cy + sa * r0)); const m = (r0 + r1) / 2;
            g.quadraticCurveTo(X0(cx + ca * m + px * wd), X0(cy + sa * m + py * wd), X0(cx + ca * r1), X0(cy + sa * r1));
            g.quadraticCurveTo(X0(cx + ca * m - px * wd), X0(cy + sa * m - py * wd), X0(cx + ca * r0), X0(cy + sa * r0));
            g.fillStyle = fill; g.fill(); if (stroke) { g.strokeStyle = stroke; g.lineWidth = .12 * u; g.stroke(); } } };
        g.fillStyle = '#f6dfa8'; g.beginPath(); g.arc(X0(0), X0(0), 8.3 * u, 0, 7); g.fill();
        petals(0, 0, 16, 3.2, 8.2, 1.25, '#b3262e', '#7a1418');
        petals(0, 0, 8, 1.6, 5.6, 1.15, '#2f6b3a', '#1c4424', Math.PI / 8, Math.PI * 2 + Math.PI / 8);
        quad(() => { petals(37, 37, 7, 4.5, 13, 1.6, 'rgba(179,38,46,.85)', '#7a1418', Math.PI, Math.PI * 1.5); petals(37, 37, 5, 4.5, 8.5, 1.1, 'rgba(47,107,58,.85)', '#1c4424', Math.PI, Math.PI * 1.5); });
        grain(10);
      } else if (look === 'bauhaus') {
        // off-white paper; a red circle, a blue square, a yellow triangle, black bars; a small target in the centre
        paper(240, 235, 222, 10, 44);
        g.globalCompositeOperation = 'multiply';
        const sh = (c, a, f) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); f(); g.fill(); };
        sh('#d6332a', .9, () => g.arc(X0(-17), X0(-16), 10.5 * u, 0, 7));
        sh('#1f4fa3', .88, () => { g.save(); g.translate(X0(17), X0(-17)); g.rotate(.18); g.rect(-8 * u, -8 * u, 16 * u, 16 * u); g.restore(); });
        sh('#f2c230', .92, () => { g.moveTo(X0(-28), X0(26)); g.lineTo(X0(-6), X0(26)); g.lineTo(X0(-17), X0(7)); g.closePath(); });
        sh('#1f4fa3', .5, () => g.arc(X0(17), X0(17), 9 * u, Math.PI, Math.PI * 1.5, false) || g.lineTo(X0(17), X0(17)));
        sh('#d6332a', .85, () => { g.rect(X0(10), X0(19), 16 * u, 3.2 * u); });
        sh('#111111', .9, () => { g.rect(X0(-31), X0(-3.2), 10 * u, 1.4 * u); g.rect(X0(22), X0(1.8), 9 * u, 1.4 * u); g.rect(X0(-1.4), X0(-31), 1.4 * u, 9 * u); });
        sh('#f2c230', .9, () => g.arc(X0(0), X0(0), 6 * u, 0, 7));
        sh('#d6332a', .9, () => g.arc(X0(0), X0(0), 3.2 * u, 0, 7));
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        grain(8);
      } else if (look === 'classic') {
        // birch plywood: pale honey, long soft grain along x, a slow colour drift; lacquered (the gloss is the material's)
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const u = x / W, v = y / W, warp = N(u * 1.6, v * 4, 3) * 1.4;
          const ring = Math.sin((v * 7 + warp * 2.2) * Math.PI * 2) * .5 + .5, fib = N(u * 30, v * 300, 2);
          const k = Math.pow(ring, 3) * .22 + fib * .16 + N(u * 2.5, v * 2.5, 3) * .2;
          const i = (y * W + x) * 4;
          d[i] = 236 - k * 46; d[i + 1] = 206 - k * 52; d[i + 2] = 150 - k * 60; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        // the powder: a faint, uneven bloom
        g.globalAlpha = .05; g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { const r = W * (.03 + Math.random() * .08); g.beginPath(); g.arc(Math.random() * W, Math.random() * W, r, 0, 7); g.fill(); } g.globalAlpha = 1;
      } else {
        // warm paper
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const n = N(x / W * 40, y / W * 40, 2), i = (y * W + x) * 4;
          d[i] = 239 - n * 14; d[i + 1] = 228 - n * 14; d[i + 2] = 208 - n * 14; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        g.globalCompositeOperation = 'multiply';
        const fill = (c, a, f) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); f(); g.fill(); };
        // four Mughal arches, one rising from each base line (pointed ogee tops), in the four colours
        const COL = ['#c8643f', '#e0a43a', '#2f8a83', '#2c3a6b'];
        for (let side = 0; side < 4; side++) {
          g.save(); g.translate(W / 2, W / 2); g.rotate(side * Math.PI / 2); g.translate(-W / 2, -W / 2);
          const c = COL[side], c2 = COL[(side + 1) % 4];
          // the big arch
          fill(c, .78, () => { const w = 15, b = 37, top = 13.5; g.moveTo(X0(-w), X0(b)); g.lineTo(X0(-w), X0(top + 7)); g.bezierCurveTo(X0(-w), X0(top - 1), X0(-3), X0(top - 2), X0(0), X0(top - 6.5)); g.bezierCurveTo(X0(3), X0(top - 2), X0(w), X0(top - 1), X0(w), X0(top + 7)); g.lineTo(X0(w), X0(b)); g.closePath(); });
          // a smaller arch inside, the next colour
          fill(c2, .55, () => { const w = 8.5, b = 37, top = 21; g.moveTo(X0(-w), X0(b)); g.lineTo(X0(-w), X0(top + 4)); g.bezierCurveTo(X0(-w), X0(top - 1), X0(-2), X0(top - 1.5), X0(0), X0(top - 4.5)); g.bezierCurveTo(X0(2), X0(top - 1.5), X0(w), X0(top - 1), X0(w), X0(top + 4)); g.lineTo(X0(w), X0(b)); g.closePath(); });
          // quarter suns in the corners (behind the pockets)
          fill(c2, .42, () => { g.arc(X0(37), X0(37), 15 * u, Math.PI, Math.PI * 1.5); g.lineTo(X0(37), X0(37)); g.closePath(); });
          fill(c, .3, () => { g.arc(X0(37), X0(37), 9 * u, Math.PI, Math.PI * 1.5); g.lineTo(X0(37), X0(37)); g.closePath(); });
          g.restore();
        }
        // the centre: overlapping circles (a flower of life, coloured) under the outer circle
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; fill(COL[k % 4], .28, () => g.arc(X0(Math.cos(a) * 4.2), X0(Math.sin(a) * 4.2), 4.2 * u, 0, 7)); }
        fill('#f3e7cf', .6, () => g.arc(X0(0), X0(0), 2.4 * u, 0, 7));
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        // risograph grain + a few printed specks
        const img2 = g.getImageData(0, 0, W, W), d2 = img2.data;
        for (let i = 0; i < d2.length; i += 4) { const r = (Math.random() - .5) * 16; d2[i] += r; d2[i + 1] += r; d2[i + 2] += r; }
        g.putImageData(img2, 0, 0);
      }
      markings(g, W, look);
    });
    return t;
  }
  // a fine net under the pockets
  function netTex() {
    const t = X.canvasTex('crNet', 128, 128, (g, W) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, W, W); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (let i = -W; i < W * 2; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + W, W); g.stroke(); g.beginPath(); g.moveTo(i, W); g.lineTo(i + W, 0); g.stroke(); } }, 2);
    return t;
  }
  // the piece's face: turned rings (wood men), a star (striker), a brass pip (modern), glowing rings (neon), painted lotus
  // and dots (rajasthan), one clean ring (bauhaus)
  const FACE = { w: '#efe0c0', b: '#2b201a', q: '#c0262a', s: '#f4f1ea', mw: '#ece5d6', mb: '#2c2b2e', mq: '#e1694f', ms: '#efe6d2',
    nw: '#d8f6ff', nb: '#2a1f48', nq: '#ff4fbd', ns: '#eefcff', rw: '#f1e4c4', rb: '#2a1a12', rq: '#c7262c', rs: '#f3e8cc',
    hw: '#f2efe6', hb: '#161616', hq: '#d6332a', hs: '#f2c230' };
  const SIDE = { w: '#e7d3ad', b: '#211813', q: '#a91f22', s: '#ece8de', mw: '#e3dccb', mb: '#26252a', mq: '#d55d45', ms: '#e7dcc5',
    nw: '#bfeeff', nb: '#3a2a66', nq: '#ff2fa8', ns: '#d9f7ff', rw: '#e6d4ac', rb: '#1f130d', rq: '#a91f22', rs: '#e8d9b4',
    hw: '#e8e4d8', hb: '#111111', hq: '#c42a22', hs: '#e3b322' };
  function faceTex(kind) {
    const t = X.canvasTex('crFace' + kind, SZ(256), SZ(256), (g, W) => {
      const c = W / 2, base = FACE[kind];
      g.fillStyle = base; g.fillRect(0, 0, W, W);
      const N = X.makeNoise(kind.length * 7 + kind.charCodeAt(0) + (kind.charCodeAt(1) || 0));
      const ring = (r, w, col, blur) => { g.save(); if (blur) { g.shadowColor = col; g.shadowBlur = W * blur; } g.strokeStyle = col; g.lineWidth = W * w; g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); g.restore(); };
      const dotRing = (r, n, rr, col) => { g.fillStyle = col; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * c * r, c + Math.sin(a) * c * r, c * rr, 0, 7); g.fill(); } };
      const lotus = (n, r0, r1, wd, col) => { g.fillStyle = col; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), m = (r0 + r1) / 2; g.beginPath(); g.moveTo(c + ca * c * r0, c + sa * c * r0); g.quadraticCurveTo(c + (ca * m - sa * wd) * c, c + (sa * m + ca * wd) * c, c + ca * c * r1, c + sa * c * r1); g.quadraticCurveTo(c + (ca * m + sa * wd) * c, c + (sa * m - ca * wd) * c, c + ca * c * r0, c + sa * c * r0); g.fill(); } };
      if (kind[0] === 'n') {   // neon acrylic: a smooth face, glowing rings (the material makes them glow)
        ring(.8, .05, { nw: '#3ce6ff', nb: '#ff3fb4', nq: '#ffffff', ns: '#3ce6ff' }[kind], .06);
        ring(.5, .025, { nw: 'rgba(60,230,255,.6)', nb: 'rgba(255,63,180,.6)', nq: 'rgba(255,255,255,.7)', ns: 'rgba(60,230,255,.6)' }[kind], .04);
        if (kind === 'ns') ring(.18, .05, '#3ce6ff', .05);
      } else if (kind[0] === 'r') {   // painted like lacquerware
        if (kind === 'rw') { dotRing(.74, 14, .07, '#b3262e'); g.fillStyle = '#2f6b3a'; lotus(6, .08, .42, .18, '#2f6b3a'); g.fillStyle = '#b3262e'; g.beginPath(); g.arc(c, c, c * .1, 0, 7); g.fill(); }
        else if (kind === 'rb') { dotRing(.74, 14, .065, '#d9ad45'); lotus(6, .08, .42, .18, '#c99a2e'); }
        else if (kind === 'rq') { ring(.8, .035, '#e6c25a'); lotus(8, .1, .62, .22, '#e6c25a'); }
        else { ring(.84, .04, '#b3262e'); lotus(8, .12, .66, .2, '#b3262e'); lotus(8, .1, .4, .14, '#c99a2e'); }
      } else if (kind[0] === 'h') {   // bauhaus: flat colour, one clean ring
        ring(.62, .06, { hw: '#111111', hb: '#f0ece2', hq: '#f2c230', hs: '#111111' }[kind]);
        if (kind === 'hs') { g.fillStyle = '#1f4fa3'; g.beginPath(); g.arc(c, c, c * .24, 0, 7); g.fill(); }
      } else if (kind === 'w' || kind === 'b' || kind === 'q') {   // grain + turned rings
        const img = g.getImageData(0, 0, W, W), d = img.data;
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 2, y / W * 9, 2), i = (y * W + x) * 4, k = (n - .5) * (kind === 'w' ? 14 : kind === 'b' ? 12 : 10); /* soft grain: fine contrast shimmered on small men */ d[i] += k; d[i + 1] += k; d[i + 2] += k; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = kind === 'b' ? 'rgba(255,230,200,.18)' : 'rgba(60,30,10,.32)';
        for (const r of [.88, .62, .36]) { g.lineWidth = W * .018; g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
        if (kind === 'q') { g.fillStyle = 'rgba(255,230,180,.28)'; g.beginPath(); g.arc(c, c, c * .16, 0, 7); g.fill(); }
      } else if (kind === 's') {   // a printed red star in a ring
        g.strokeStyle = '#c3271f'; g.lineWidth = W * .03; g.beginPath(); g.arc(c, c, c * .82, 0, 7); g.stroke();
        g.fillStyle = '#c3271f'; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? .26 : .62) * c; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
        g.closePath(); g.fill();
      } else {   // modern: matte, a brass pip (men) or a brass ring (striker)
        const img = g.getImageData(0, 0, W, W), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const r = (Math.random() - .5) * 3; d[i] += r; d[i + 1] += r; d[i + 2] += r; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = kind === 'mb' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'; g.lineWidth = W * .012; g.beginPath(); g.arc(c, c, c * .72, 0, 7); g.stroke();
        g.fillStyle = '#c69a45';
        if (kind === 'ms') { g.strokeStyle = '#c69a45'; g.lineWidth = W * .07; g.beginPath(); g.arc(c, c, c * .62, 0, 7); g.stroke(); }
        else { g.beginPath(); g.arc(c, c, c * .17, 0, 7); g.fill(); }
      }
    });
    return t;
  }

  /* ---------- geometry ---------- */
  const geos = {};
  // a carrom man / the striker: a flat disc with a softly rounded rim
  function discGeo(r, h) {
    const key = r.toFixed(4) + h.toFixed(4) + (LO() ? 'l' : 'h'); if (geos[key]) return geos[key];
    const TT = T(), b = h * .32, st = LO() ? 3 : 4, pts = [new TT.Vector2(0.001, 0)];
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new TT.Vector2(.001, h));
    const g = new TT.LatheGeometry(pts, LO() ? 20 : 30);
    const P = g.attributes.position, UV = g.attributes.uv;   // planar UVs from above (the face texture lies flat on the top)
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * r) + .5, P.getZ(i) / (2 * r) + .5);
    g.computeVertexNormals(); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function frameGeo(look) {
    const key = 'frame' + look; if (geos[key]) return geos[key];
    const TT = T(), o = S + FW, ri = 2.4 * K, ro = .12;
    const sh = new TT.Shape(); { const r = ro, a = -o, b = o; sh.moveTo(a + r, a); sh.lineTo(b - r, a); sh.quadraticCurveTo(b, a, b, a + r); sh.lineTo(b, b - r); sh.quadraticCurveTo(b, b, b - r, b); sh.lineTo(a + r, b); sh.quadraticCurveTo(a, b, a, b - r); sh.lineTo(a, a + r); sh.quadraticCurveTo(a, a, a + r, a); }
    const hole = new TT.Path(); { const r = ri, a = -S, b = S; hole.moveTo(a + r, a); hole.lineTo(b - r, a); hole.quadraticCurveTo(b, a, b, a + r); hole.lineTo(b, b - r); hole.quadraticCurveTo(b, b, b - r, b); hole.lineTo(a + r, b); hole.quadraticCurveTo(a, b, a, b - r); hole.lineTo(a, a + r); hole.quadraticCurveTo(a, a, a + r, a); }
    sh.holes.push(hole);
    const bev = { modern: .02, bauhaus: .012, neon: .03 }[look] || .045;
    const g = new TT.ExtrudeGeometry(sh, { depth: TOP + FH - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: LO() ? 2 : 3, curveSegments: LO() ? 4 : 8 });
    g.rotateX(-Math.PI / 2); g.translate(0, bev, 0);
    // UVs along the rails (wood grain runs along each rail)
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) { const x = P.getX(i), z = P.getZ(i), y = P.getY(i); const along = Math.abs(x) > Math.abs(z) ? z : x; UV.setXY(i, (along + o) / (2 * o) * .999, (Math.max(Math.abs(x), Math.abs(z)) + y) / 1.4); }   // one span of the texture along each rail: no repeat, so no seam (only the mitres at the corners)
    g.computeVertexNormals(); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function surfaceGeo() {
    if (geos.surf) return geos.surf;
    const TT = T(), sh = new TT.Shape(); sh.moveTo(-S, -S); sh.lineTo(S, -S); sh.lineTo(S, S); sh.lineTo(-S, S); sh.closePath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const h = new TT.Path(); h.absarc(sx * PC, sy * PC, RP, 0, Math.PI * 2, true); sh.holes.push(h); }
    const g = new TT.ShapeGeometry(sh, LO() ? 16 : 32); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + S) / (2 * S), 1 - (P.getZ(i) + S) / (2 * S));
    if (X.share) X.share(g);
    return (geos.surf = g);
  }

  /* ---------- the gaming RGB of the night board ----------
     rgbify(material, mode): the glow is redrawn in a rainbow that flows with the clock (RGB.uT, seconds; set as the board is drawn).
     'uv' the surface (hue by the angle round the centre + the distance out), 'local' a tube / ring (hue along its own x, or round
     its own centre for a ring), 'halo' the flash ring of a man (a MeshBasicMaterial: the whole colour). The brightness stays the
     material's own: only the hue is replaced. */
  const RGB = { uT: { value: 0 } };
  const HUE = 'vec3 crHue(float h){return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);}\n';
  function rgbify(m, mode) {
    m.customProgramCacheKey = () => 'crRGB' + mode;
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = RGB.uT;
      if (mode !== 'uv') {
        sh.vertexShader = 'varying vec3 vCrP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCrP = position;');
      }
      sh.fragmentShader = 'uniform float uT;\n' + (mode !== 'uv' ? 'varying vec3 vCrP;\n' : '') + HUE + sh.fragmentShader;
      const hue = mode === 'uv' ? 'vec2 crp = vUv - 0.5; float crh = atan(crp.y, crp.x) / 6.2831853 + length(crp) * 0.9 - uT * 0.16;'
        : mode === 'ring' ? 'float crh = atan(vCrP.z, vCrP.x) / 6.2831853 - uT * 0.5;'
        : mode === 'halo' ? 'float crh = atan(vCrP.z, vCrP.x) / 6.2831853 + uT * 1.4;'
        : 'float crh = vCrP.x * 0.12 - uT * 0.3;';
      if (mode === 'halo') sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', '{ ' + hue + ' outgoingLight = crHue(fract(crh)) * 1.15; }\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
      else sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ ' + hue + ' float crL = max(max(totalEmissiveRadiance.r, totalEmissiveRadiance.g), totalEmissiveRadiance.b); totalEmissiveRadiance = crHue(fract(crh)) * crL * 1.2; }');
    };
    return m;
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    const TT = T();
    if (look === 'neon') return mat('bm' + look, () => {
      const glowM = (c, mode) => { const m = phys({ color: '#000000', roughness: .4, metalness: 0 }); m.emissive = lin(c); m.emissiveIntensity = 1.6; return rgbify(m, mode); };
      const st = surfaceTex(look), surf = phys({ map: st, color: '#4a4a4a', roughness: .25, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .5 });
      surf.emissiveMap = st; surf.emissive = new TT.Color(.95, .95, .95); rgbify(surf, 'uv');   // (a dim base colour under it: the glow's rainbow stays saturated)   // the drawn tubes glow in a flowing rainbow; the black stays black
      return { surf, frame: phys({ color: '#0b0c14', roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 }),
        edge: glowM('#ffffff', 'local'), rim: glowM('#ffffff', 'ring'), cup: phys({ color: '#05050a', roughness: .9 }), net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }) };
    });
    if (look === 'rajasthan') return mat('bm' + look, () => {
      const fw = X.wood('crSheesham', '#5a3418', '#1e0e05', SZ(1024), SZ(256), 1.2); fw.wrapS = fw.wrapT = TT.RepeatWrapping;
      const brass = phys({ color: '#d4a64e', roughness: .28, metalness: 1, envMapIntensity: 1.2 }); brass.emissive = new TT.Color(0x2a1a06);
      return { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .32, metalness: 0, clearcoat: .7, clearcoatRoughness: .2, envMapIntensity: .75 }),
        frame: phys({ map: fw, color: '#ffffff', roughness: .32, clearcoat: .8, clearcoatRoughness: .2, envMapIntensity: 1 }),
        brass, edge: brass, rim: brass, cup: phys({ color: '#0f0b08', roughness: .9 }), net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }) };
    });
    if (look === 'bauhaus') return mat('bm' + look, () => ({
      surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .62, metalness: 0, envMapIntensity: .55 }),
      frame: phys({ color: '#141414', roughness: .55, metalness: 0, envMapIntensity: .6 }),
      edge: null, rim: null, cup: phys({ color: '#111111', roughness: .9 }), net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }),
    }));
    if (look === 'modern') return mat('bm' + look, () => ({
      surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .5, metalness: 0, clearcoat: .55, clearcoatRoughness: .3, envMapIntensity: .7 }),
      frame: phys({ color: '#1e2544', roughness: .42, metalness: 0, clearcoat: .7, clearcoatRoughness: .35, envMapIntensity: .9 }),
      brass: phys({ color: '#c79a48', roughness: .3, metalness: 1, envMapIntensity: 1.2 }),
      get edge() { return this.brass; }, get rim() { return this.brass; },
      cup: phys({ color: '#141414', roughness: .9 }),
      net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }),
    }));
    return mat('bm' + look, () => {
      const fw = X.wood('crRose', '#6a2c1a', '#2a0f08', SZ(1024), SZ(256), 1.4); fw.wrapS = fw.wrapT = TT.RepeatWrapping;
      return {
        surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .22, metalness: 0, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: .85 }),
        frame: phys({ map: fw, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: 1 }),
        brass: null, edge: null, rim: null,
        cup: phys({ color: '#0f0d0c', roughness: .9 }),
        net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }),
      };
    });
  }
  function pieceMat(look, c) {
    const m = (PRE[look] || '') + c;
    return mat('pc' + m, () => {
      const t = faceTex(m), side = SIDE[m];
      const glossy = look === 'classic' || look === 'rajasthan' || look === 'neon';
      const top = phys({ map: t, color: '#ffffff', roughness: glossy ? (c === 's' ? .3 : .38) : .62, clearcoat: glossy ? .35 : undefined, clearcoatRoughness: glossy ? .35 : undefined, envMapIntensity: glossy ? .85 : .6 });   // (no bump map: on discs this small it sparkled as the camera moved)
      if (look === 'neon') { top.emissiveMap = t; top.emissive = new (T().Color)(.55, .55, .55); }   // acrylic lit from inside: the rings glow, the smoked men stay dark
      return { top, side: phys({ color: side, roughness: glossy ? .34 : .6, clearcoat: glossy ? .5 : undefined, clearcoatRoughness: glossy ? .25 : undefined, envMapIntensity: glossy ? .9 : .55 }) };
    });
  }
  // a piece: the lathe disc with the face material on top (the texture is planar, so the top and rim share one material);
  // the rim keeps the face's colour from the texture's border — the face map is a solid base colour at its edges
  function pieceGroup(look, c) {
    const TT = T(), striker = c === 's', r = striker ? RS : RM, h = striker ? HS : HM, M2 = pieceMat(look, c);
    const neon = look === 'neon', top = neon ? M2.top.clone() : M2.top;   // (neon: a material of its own, so one man can flash alone)
    const g = new TT.Group(), body = new TT.Mesh(discGeo(r, h), top); body.castShadow = true; body.receiveShadow = false; g.add(body);   // (no self-shadow: thin discs flickered with shadow acne)
    if (look === 'modern' && striker) { const ring = new TT.Mesh(geos.ring || (geos.ring = (() => { const q = new TT.TorusGeometry(r - .004, .006, 6, 36); q.rotateX(Math.PI / 2); if (X.share) X.share(q); return q; })()), boardMats('modern').brass); ring.position.y = h * .55; g.add(ring); }
    g.userData = { c, r, h };
    if (neon) {   // a hit lights the man up: its face glows hard and a halo flares round it (flash(k), k 1 → 0)
      // an RGB LED ring round the rim (dim at rest), and a rainbow halo that spins out from the man when it is hit
      const lm = rgbify(phys({ color: '#000000', roughness: .4, metalness: 0 }), 'ring'); lm.emissive = new TT.Color(1, 1, 1); lm.emissiveIntensity = .55;
      const led = new TT.Mesh(geos['led' + c] || (geos['led' + c] = (() => { const q = new TT.TorusGeometry(r + .002, .007, 6, LO() ? 28 : 44); q.rotateX(Math.PI / 2); if (X.share) X.share(q); return q; })()), lm);
      led.position.y = h * .5; g.add(led);
      const hm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const wm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const halo = new TT.Mesh(geos.halo || (geos.halo = (() => { const q = new TT.RingGeometry(.5, 1, LO() ? 24 : 40); q.rotateX(-Math.PI / 2); if (X.share) X.share(q); return q; })()), hm);
      halo.position.y = h + .002; halo.visible = false; halo.renderOrder = 3; g.add(halo);
      const wave = new TT.Mesh(geos.halo, wm); wave.position.y = .006; wave.visible = false; wave.renderOrder = 3; g.add(wave);   // a thin shock ring on the board
      const e0 = top.emissive.clone();
      g.userData.flash = k => {
        k = Math.max(0, Math.min(1, k)); top.emissive.copy(e0).multiplyScalar(1 + 3.5 * k); lm.emissiveIntensity = .55 + 4 * k;
        halo.visible = wave.visible = k > .01; hm.opacity = k; wm.opacity = .7 * k * k;
        const sc = r * (1.25 + (1 - k) * 1.3), sw = r * (1.4 + (1 - k) * 3.2); halo.scale.set(sc, 1, sc); wave.scale.set(sw, 1, sw);
      };
    }
    return g;
  }

  /* ---------- the board ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look);
    const frame = new TT.Mesh(frameGeo(look), BM.frame); frame.castShadow = frame.receiveShadow = true; g.add(frame);
    const surf = new TT.Mesh(surfaceGeo(), BM.surf); surf.position.y = TOP; surf.receiveShadow = true; g.add(surf);
    if (look === 'neon') {   // the RGB clock, set as the surface is drawn (kept out of the showcase's merge)
      surf.userData.keep = true;
      surf.onBeforeRender = () => { RGB.uT.value = performance.now() / 1000; };
    }
    // a base under the surface (seen through the pockets' rims) and the pocket cups with their nets
    const base = new TT.Mesh(new TT.BoxGeometry(2 * S, .04, 2 * S), BM.cup); base.position.y = .03; g.add(base);
    const cupG = geos.cup || (geos.cup = (() => { const q = new TT.CylinderGeometry(RP, RP * .92, TOP - .05, LO() ? 16 : 28, 1, true); if (X.share) X.share(q); return q; })());
    const netG = geos.net || (geos.net = (() => { const q = new TT.CircleGeometry(RP * .92, LO() ? 16 : 28); q.rotateX(-Math.PI / 2); if (X.share) X.share(q); return q; })());
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cup = new TT.Mesh(cupG, new TT.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, side: TT.BackSide })); cup.position.set(sx * PC, (TOP + .05) / 2, sz * PC); g.add(cup);
      const net = new TT.Mesh(netG, BM.net); net.position.set(sx * PC, .07, sz * PC); g.add(net);
      if (BM.rim) { const rg = geos.prim || (geos.prim = (() => { const q = new TT.TorusGeometry(RP + .012, .014, 6, LO() ? 20 : 36); q.rotateX(Math.PI / 2); if (X.share) X.share(q); return q; })()); const rim = new TT.Mesh(rg, BM.rim); rim.position.set(sx * PC, TOP + .004, sz * PC); g.add(rim); }
    }
    if (BM.edge) {   // brass edging (a neon tube on the night board) along the frame's top outer edge
      const e = new TT.Mesh(new TT.BoxGeometry(2 * (S + FW) - .02, .012, .03), BM.edge);
      for (const [x, z, ry] of [[0, -(S + FW) + .03, 0], [0, S + FW - .03, 0], [-(S + FW) + .03, 0, Math.PI / 2], [S + FW - .03, 0, Math.PI / 2]]) { const m = e.clone(); m.position.set(x, TOP + FH + .006, z); m.rotation.y = ry; g.add(m); }
    }
    const U = g.userData;
    U.top = TOP; U.K = K; U.S = S; U.look = look; U.H = HM; U.HS = HS; U.R = RM; U.RS = RS; U.FH = FH;
    U.xz = (x, y) => [x * K, y * K];
    U.piece = c => pieceGroup(look, c);
    U.striker = () => pieceGroup(look, 's');
    return g;
  }

  X.MODELS.carrom = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: the opening arrangement just after a gentle break, the striker on the near base line
    const U = g.userData, E = window.CarromEngine;
    const pcs = E ? E.layout() : [];
    // (no nudges inside the arrangement: the men touch there, and an overlap made the centre flicker)
    const nudge = {};
    // a few men already round the board, as in a game (taken from the outer ring)
    const moved = { 7: [12, 14], 11: [-18, 20], 13: [24, -9], 15: [-30.5, -30] };
    pcs.forEach(p => {
      const c = p.c, m = U.piece(c), [dx, dy] = nudge[p.id] || [0, 0], mv = moved[p.id], [x, z] = mv ? U.xz(mv[0], mv[1]) : U.xz(p.x + dx, p.y + dy);
      m.position.set(x, TOP, z); g.add(m);
      const sh = X.contact(RM * 1.15, .4); sh.position.set(x, TOP + .004, z); g.add(sh);
    });
    const st = U.striker(), [x, z] = U.xz(-6, 25.26); st.position.set(x, TOP, z); g.add(st); const sh = X.contact(RS * 1.15, .45); sh.position.set(x, TOP + .004, z); g.add(sh);
    return g;
  };
  X.carrom = { board, LOOKS, K };
})();
