/* 所蔵品：オスマン帝国のチェス・バックギャモン盤（ヴィクトリア＆アルバート博物館 861-1907） — units: 1 = 1 cm.
   After the V&A's physical description: a folding board of two leaves, 56.5 × 56.3 cm open, about 1.2 cm deep each.
   Inside (shown open): backgammon — two "tables" on turtle shell laid over gold leaf, each with six mother-of-pearl points
   at the top and bottom shaped as stylised cypress trees, a central cross band with a fretted motif picked out in green-stained
   bone, narrower bands beside it; raised framing fillets topped with alternating turtle-shell and mother-of-pearl plaques.
   Outside (turn it over): chess — 64 squares of mother-of-pearl (four-part, pink and blue tones) and pale turtle shell on gold
   leaf, a turtle-shell roundel with an eight-pointed scalloped edge where four squares meet, nine alternating light and dark
   fillets round the field, a wide border of turtle shell with a mother-of-pearl chain linked at the corners by shield motifs
   set with baleen, and the outer edge lipped with half-round bone in interlocking chevrons. Patterns drawn after the record;
   exact proportions of the motifs are estimates.
   2026-11-21: the chess side and the edges redrawn after the V&A's photographs 2012FP3719 / 3721 / FT9876 — dark shell with amber
   flecks, pearl squares of four pieces round a dark eight-pointed star, S-scroll chain, bone edging, pearl hexagons on the sides. */
(function () {
  'use strict';
  // the inlay's layout, taken off the V&A's photograph 2012FP3720 (set square, 2048 px across the open board): alpha = mother-of-pearl
  // and bone stringing, red = the green-stained bone. Only where each piece lies — the shell and the pearl themselves are painted here.
  const HERE = (document.currentScript && document.currentScript.src) || location.href; let INLAY = null;
  (window.AtlasEx = window.AtlasEx || {}).ottoman = {
    flip: true,
    ready: () => new Promise(res => { const im = new Image(); im.onload = () => { INLAY = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/ottoman-inlay.webp', HERE).href; setTimeout(res, 8000); }),
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 56.5, D = 56.3, LD = D / 2, TH = 2.0, PX = innerWidth < 820 ? 1536 : 2048;   // width, depth open, a leaf's depth, its thickness
      const N = K.noise(23);
      /* ---------- painters ---------- */
      // turtle shell over gold leaf: amber with dark mottles and warm flecks; returns nothing (paints the rect)
      const shell = (g, x, y, w, h, pale) => {
        const W2 = Math.max(1, Math.ceil(w)), H2 = Math.max(1, Math.ceil(h)), oc = document.createElement('canvas'); oc.width = W2; oc.height = H2;
        const og = oc.getContext('2d'), img = og.createImageData(W2, H2), d = img.data;
        for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
          const u = (x + i) / PX, v = (y + j) / PX, m = N(u * 34, v * 34, 3), f = N(u * 90 + 7, v * 90, 1), k = Math.max(0, Math.min(1, (m - .46) * 3.2));
          const base = pale === 'dark' ? [50, 20, 10] : pale ? [214, 150, 70] : [178, 102, 34], dark = pale === 'dark' ? [22, 8, 5] : pale ? [104, 52, 18] : [44, 18, 6];
          if (pale === 'dark') { const fl = N(u * 30 + 3, v * 70, 2); if (fl > .72) { const t = Math.min(1, (fl - .72) * 7); const p0 = (j * W2 + i) * 4; d[p0] = 50 + (186 - 50) * t; d[p0 + 1] = 20 + (96 - 20) * t; d[p0 + 2] = 10 + (22 - 10) * t; d[p0 + 3] = 255; continue; } }
          const p = (j * W2 + i) * 4; for (let c = 0; c < 3; c++) d[p + c] = base[c] + (dark[c] - base[c]) * k + (f - .5) * 18; d[p + 3] = 255;
        }
        og.putImageData(img, 0, 0); g.drawImage(oc, x, y);
      };
      // mother-of-pearl: pale with soft pink / blue / green flushes and the four-part split of a square
      const pearl = (g, x, y, w, h, four) => {
        const W2 = Math.max(1, Math.ceil(w)), H2 = Math.max(1, Math.ceil(h)), oc = document.createElement('canvas'); oc.width = W2; oc.height = H2;
        const og = oc.getContext('2d'), img = og.createImageData(W2, H2), d = img.data;
        for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
          const q = four ? ((i < W2 / 2) ^ (j < H2 / 2)) : 0, u = (x + i) / PX, v = (y + j) / PX, a = N(u * 40 + q * 3, v * 9, 3), b = N(u * 12 + 5, v * 30 + q, 2);
          const p = (j * W2 + i) * 4; const sh = N(u * 160, v * 30, 2) * 22; d[p] = 172 + a * 52 - b * 30 + sh; d[p + 1] = 170 + b * 40 - a * 22 + sh; d[p + 2] = 178 + b * 46 + a * 12 - q * 14 + sh; d[p + 3] = 255;
        }
        og.putImageData(img, 0, 0); g.drawImage(oc, x, y);
        if (four) { g.strokeStyle = 'rgba(120,100,90,.35)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.stroke(); }
      };
      const fillets = (g, x, y, w, h, n, s) => {   // n alternating light (ivory) / dark (wood) fillets, mitred (drawn as nested frames)
        for (let k = 0; k < n; k++) { g.strokeStyle = k % 2 ? '#2e1a10' : '#efe2c4'; g.lineWidth = s; const o = s * (k + .5); g.strokeRect(x + o, y + o, w - 2 * o, h - 2 * o); }
      };
      // masks for iridescence (mother-of-pearl areas are white)
      const S = PX / W;   // px per cm (both faces are drawn over the whole open board)
      /* ---------- the outside: chess ---------- */
      let chessMask;
      const chessT = K.tex(PX, Math.round(PX * D / W), (g, w, h) => {
        const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const m = mk.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, w, h); m.fillStyle = '#fff';
        // (after the V&A's photograph 2012FP3719: dark turtle shell with amber flecks, a narrow border with a mother-of-pearl chain,
        //  pearl squares of four pieces round a dark eight-pointed star, every square framed by fine light stringing)
        shell(g, 0, 0, w, h, 'dark');
        // the bone frame at the edge, in short lengths with chevron joints
        g.fillStyle = '#e3d6b8'; [[0, 0, w, .9 * S], [0, h - .9 * S, w, .9 * S], [0, 0, .9 * S, h], [w - .9 * S, 0, .9 * S, h]].forEach(([a, b, c, d2]) => g.fillRect(a, b, c, d2));
        g.strokeStyle = 'rgba(110,80,50,.55)'; g.lineWidth = .05 * S;
        for (let t = 2; t < W - 1; t += 2.6) [[t, .45, 1], [t, D - .45, 1]].forEach(([a, b]) => { g.beginPath(); g.moveTo((a - .35) * S, (b - .4) * S); g.lineTo((a + .15) * S, b * S); g.lineTo((a - .35) * S, (b + .4) * S); g.stroke(); });
        for (let t = 2; t < D - 1; t += 2.6) [[.45, t], [W - .45, t]].forEach(([a, b]) => { g.beginPath(); g.moveTo((a - .4) * S, (b - .35) * S); g.lineTo(a * S, (b + .15) * S); g.lineTo((a + .4) * S, (b - .35) * S); g.stroke(); });
        g.strokeStyle = '#e6dac0'; g.lineWidth = .07 * S; g.strokeRect(1.15 * S, 1.15 * S, w - 2.3 * S, h - 2.3 * S);
        const B0 = 1.1, B1 = 5.6, mid = (B0 + B1) / 2;
        const mop = (path) => { g.fillStyle = '#ece6e0'; g.fill(path); m.fill(path); };
        // the chain: S-scrolls (two commas turning round each other) alternating with small four-pointed stars
        const sMotif = (cx, cy, horiz, k) => { const P = new Path2D(), r = .95 * S; g.save(); m.save(); g.translate(cx, cy); m.translate(cx, cy); if (!horiz) { g.rotate(Math.PI / 2); m.rotate(Math.PI / 2); } if (k % 2) { g.scale(1, -1); m.scale(1, -1); }
          P.moveTo(-2.1 * r, 0); P.bezierCurveTo(-2.1 * r, -1.1 * r, -.4 * r, -1.2 * r, 0, -.15 * r); P.bezierCurveTo(.3 * r, .6 * r, 1.2 * r, .7 * r, 1.3 * r, 0); P.bezierCurveTo(1.3 * r, -.5 * r, .7 * r, -.6 * r, .55 * r, -.25 * r);
          P.bezierCurveTo(1.0 * r, -1.05 * r, 2.1 * r, -.7 * r, 2.1 * r, 0); P.bezierCurveTo(2.1 * r, 1.1 * r, .4 * r, 1.2 * r, 0, .15 * r); P.bezierCurveTo(-.3 * r, -.6 * r, -1.2 * r, -.7 * r, -1.3 * r, 0);
          P.bezierCurveTo(-1.3 * r, .5 * r, -.7 * r, .6 * r, -.55 * r, .25 * r); P.bezierCurveTo(-1.0 * r, 1.05 * r, -2.1 * r, .7 * r, -2.1 * r, 0); P.closePath(); mop(P); g.restore(); m.restore(); };
        const star4 = (cx, cy, r) => { const P = new Path2D(); for (let q = 0; q < 8; q++) { const a = q * Math.PI / 4, rr = q % 2 ? r * .35 : r; q ? P.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : P.moveTo(cx + rr, cy); } P.closePath(); mop(P); };
        const nM = 9;
        for (let k = 0; k < nM; k++) { const t = B1 + .9 + (k + .5) * ((W - 2 * B1 - 1.8) / nM); sMotif(t * S, mid * S, true, k); sMotif(t * S, h - mid * S, true, k + 1); if (k) { const t2 = B1 + .9 + k * ((W - 2 * B1 - 1.8) / nM); star4(t2 * S, mid * S, .45 * S); star4(t2 * S, h - mid * S, .45 * S); } }
        for (let k = 0; k < nM; k++) { const t = B1 + .9 + (k + .5) * ((D - 2 * B1 - 1.8) / nM); sMotif(mid * S, t * S, false, k); sMotif(w - mid * S, t * S, false, k + 1); if (k) { const t2 = B1 + .9 + k * ((D - 2 * B1 - 1.8) / nM); star4(mid * S, t2 * S, .45 * S); star4(w - mid * S, t2 * S, .45 * S); } }
        // the corners: a pointed shield of pearl with a dark heart (baleen)
        [[mid, mid, 1, 1], [W - mid, mid, -1, 1], [mid, D - mid, 1, -1], [W - mid, D - mid, -1, -1]].forEach(([cx, cy, sx, sy]) => { const P = new Path2D(), r = 1.5 * S; g.save(); m.save(); g.translate(cx * S, cy * S); m.translate(cx * S, cy * S); g.scale(sx, sy); m.scale(sx, sy);
          P.moveTo(-r, -r); P.quadraticCurveTo(0, -r * .55, r * .2, -r * .2); P.lineTo(r * 1.1, r * 1.1); P.lineTo(-r * .2, r * .2); P.quadraticCurveTo(-r * .55, 0, -r, -r); P.closePath();
          P.moveTo(r * .3, -r * .9); P.arc(r * .3, -r * .9, r * .28, 0, 6.29); P.moveTo(-r * .9, r * .3); P.arc(-r * .9, r * .3, r * .28, 0, 6.29); mop(P);
          g.fillStyle = '#140c08'; g.beginPath(); g.moveTo(-r * .45, -r * .45); g.lineTo(r * .3, r * .1); g.lineTo(r * .1, r * .3); g.closePath(); g.fill(); g.restore(); m.restore(); });
        // fine fillets round the field, then the squares
        const F0 = B1 + .2, FS = .12;
        fillets(g, F0 * S, F0 * S, w - 2 * F0 * S, h - 2 * F0 * S, 5, FS * S);
        const q0x = F0 + 5 * FS, q0y = F0 + 5 * FS, QW = (W - 2 * q0x) / 8, QD = (D - 2 * q0y) / 8;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          const x = (q0x + c * QW) * S, y = (q0y + r * QD) * S, qw = QW * S, qd = QD * S, gap = .07 * qw;
          if ((r + c) % 2 === 1) {   // pearl: four pieces, each with a notch, leaving a dark eight-pointed star in the middle
            pearl(g, x + gap, y + gap, qw - 2 * gap, qd - 2 * gap, true); m.fillRect(x + gap, y + gap, qw - 2 * gap, qd - 2 * gap);
            const cx = x + qw / 2, cy = y + qd / 2, R = qw * .2; const P = new Path2D(); for (let q = 0; q < 16; q++) { const a = q * Math.PI / 8 + Math.PI / 8, rr = q % 2 ? R * .52 : R; q ? P.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : P.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } P.closePath();
            g.fillStyle = '#160a06'; g.fill(P); m.fillStyle = '#000'; m.fill(P); m.fillStyle = '#fff';
            g.fillStyle = '#1a0c07'; [[x + gap, y + gap], [x + qw - gap, y + gap], [x + gap, y + qd - gap], [x + qw - gap, y + qd - gap]].forEach(([px, py]) => { g.beginPath(); g.arc(px, py, qw * .09, 0, 6.29); g.fill(); });   // the pieces' rounded outer corners
            g.strokeStyle = 'rgba(40,20,14,.8)'; g.lineWidth = qw * .035; g.beginPath(); g.moveTo(cx, y + gap); g.lineTo(cx, y + qd - gap); g.moveTo(x + gap, cy); g.lineTo(x + qw - gap, cy); g.stroke();   // the joins between the four pieces
          }
          g.strokeStyle = 'rgba(214,196,160,.75)'; g.lineWidth = .05 * S; g.strokeRect(x + .05 * S, y + .05 * S, qw - .1 * S, qd - .1 * S);   // the stringing round each square
        }
        g.fillStyle = 'rgba(20,8,2,.85)'; g.fillRect(w / 2 - .06 * S, 0, .12 * S, h);   // the hinge line between the leaves
        chessMask = new TT.CanvasTexture(mk); chessMask.colorSpace = TT.NoColorSpace;
      });
      /* ---------- the inside: backgammon (after the V&A's photograph 2012FP3720 and description) ----------
         The leaves lie side by side, the hinge running front to back between them (x = 0). Each leaf holds one table: six
         mother-of-pearl cypress points from the far edge and six from the near edge, their tips under a row of niches; across
         the middle a deep band with a fretted medallion between two narrower bands of roundels. Shapes are traced by eye from
         the photograph (proportions estimates). */
      let bgMask;
      const FW = 1.6, HG = .8, LW = W / 2;   // (widths measured on the V&A photograph; the record gives 1.2 / 1.5 for the raised fillets)   // outer fillet width, hinge-side fillet width, a leaf's width (cm)
      // a sheet of mother-of-pearl to cut shapes from (made once: soft grey-white with pink, blue and green flushes, cut in strips)
      const PS = 1024, pearlC = document.createElement('canvas'); pearlC.width = pearlC.height = PS;
      { const og = pearlC.getContext('2d'), img = og.createImageData(PS, PS), d = img.data;
        for (let j = 0; j < PS; j++) for (let i = 0; i < PS; i++) { const u = i / PS, v = j / PS, a = N(u * 22, v * 5, 3), b = N(u * 7 + 5, v * 16, 2), sh = N(u * 90, v * 14, 2), band = Math.sin((v * 9 + a * 2) * Math.PI) * .5 + .5;
          const gr = 118 + sh * 60 + band * 22 + a * 18; const p = (j * PS + i) * 4; d[p] = gr + a * 16 - b * 14; d[p + 1] = gr + b * 12 - a * 6; d[p + 2] = gr + 10 + b * 18 + a * 6; d[p + 3] = 255; }
        og.putImageData(img, 0, 0); }
      const shellC = document.createElement('canvas'); shellC.width = shellC.height = PS;
      { const og = shellC.getContext('2d'), img = og.createImageData(PS, PS), d = img.data;
        for (let j = 0; j < PS; j++) for (let i = 0; i < PS; i++) { const u = i / PS, v = j / PS, m = N(u * 30 + 3, v * 18, 4) * .7 + N(u * 90, v * 50, 2) * .3, f = N(u * 90 + 7, v * 90, 2), t = Math.max(0, Math.min(1, (.405 - m) * 7));
          // dark, almost black-brown ground with amber-to-orange blotches (gold leaf glowing through the thin parts)
          const p = (j * PS + i) * 4; d[p] = 30 + t * 128 + (f - .5) * 10; d[p + 1] = 12 + t * 58 + (f - .5) * 6; d[p + 2] = 9 + t * 6; d[p + 3] = 255; }
        og.putImageData(img, 0, 0); }
      // the amber of thin turtle shell over gold leaf (for the X-shaped pieces between the plaques)
      const amberC = document.createElement('canvas'); amberC.width = amberC.height = 256;
      { const og = amberC.getContext('2d'), img = og.createImageData(256, 256), d = img.data;
        for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) { const a = N(i / 256 * 14 + 11, j / 256 * 14, 3), t = Math.max(0, Math.min(1, (a - .32) * 2.4)), p = (j * 256 + i) * 4; d[p] = 70 + t * 96; d[p + 1] = 24 + t * 48; d[p + 2] = 8 + t * 6; d[p + 3] = 255; }
        og.putImageData(img, 0, 0); }
      const bgT = K.tex(PX, Math.round(PX * D / W), (g, w, h) => {
        const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const m = mk.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
        const PP = g.createPattern(pearlC, 'repeat'), SP = g.createPattern(shellC, 'repeat');
        g.fillStyle = SP; g.fillRect(0, 0, w, h);
        const cm = v => v * S;
        // draw a path in pearl (and white on the mask), outlined with the fine dark joint of inlay
        let pv = 7; const pr = () => ((pv = (pv * 16807) % 2147483647) / 2147483647);
        const P = (path, line = .03) => { g.fillStyle = PP; g.fill(path); const t = pr(); g.fillStyle = t < .5 ? `rgba(70,64,74,${.08 + t * .5})` : `rgba(235,238,245,${(t - .5) * .25})`; g.fill(path); m.fillStyle = '#fff'; m.fill(path); g.strokeStyle = 'rgba(40,22,14,.55)'; g.lineWidth = cm(line); g.stroke(path); };
        const GR = (x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 6.29); g.fillStyle = '#3d7a64'; g.fill(); g.strokeStyle = 'rgba(20,40,30,.6)'; g.lineWidth = 1; g.stroke(); };   // green-stained bone
        const string = (x, y, ww, hh) => { [[.0, '#e6dccb'], [.07, '#2a1208'], [.14, '#e6dccb']].forEach(([o, c]) => { g.strokeStyle = c; g.lineWidth = cm(.05); g.strokeRect(x + cm(o), y + cm(o), ww - cm(2 * o), hh - cm(2 * o)); }); };
        if (INLAY) {   // the real layout: pearl laid where the photograph has pearl, each piece outlined by the dark joint of the inlay
          const lay = (fill, op) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.drawImage(INLAY, 0, 0, w, h); q.globalCompositeOperation = op || 'source-in'; q.fillStyle = fill; q.fillRect(0, 0, w, h); return c; };
          const dk = lay('rgba(18,8,5,.8)'); [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].forEach(([dx, dy]) => g.drawImage(dk, dx, dy));
          const pc = lay(PP); { const q = pc.getContext('2d'), nn = K.noise(57), t = document.createElement('canvas'); t.width = 256; t.height = 256; const tq = t.getContext('2d'), im = tq.createImageData(256, 256), d = im.data;   // each piece its own tone: lighter and greyer patches
            for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) { const v = nn(x / 9, y / 22, 2), i = (y * 256 + x) * 4, wt = v > .5; d[i] = d[i + 1] = d[i + 2] = wt ? 255 : 40; d[i + 3] = Math.abs(v - .5) * (wt ? 110 : 190); } tq.putImageData(im, 0, 0);
            q.globalCompositeOperation = 'source-atop'; q.drawImage(t, 0, 0, w, h); }
          g.drawImage(pc, 0, 0);
          // the green-stained bone (the picture's red channel)
          { const c = document.createElement('canvas'); c.width = w; c.height = h; const q = c.getContext('2d'); q.drawImage(INLAY, 0, 0, w, h); const im = q.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const a = d[i]; d[i] = 58; d[i + 1] = 122; d[i + 2] = 100; d[i + 3] = a; } q.putImageData(im, 0, 0); g.drawImage(c, 0, 0); }
          m.drawImage(lay('#fff'), 0, 0);
          bgMask = new TT.CanvasTexture(mk); bgMask.colorSpace = TT.NoColorSpace; return; }
        // ---- traced from the V&A's colour photograph 2012FP3720 (measured on it, 30.5 px to the cm) ----
        g.lineJoin = g.lineCap = m.lineJoin = m.lineCap = 'round';
        const AP = g.createPattern(amberC, 'repeat');
        const RIB = (path, lw) => { g.strokeStyle = 'rgba(30,14,8,.6)'; g.lineWidth = cm(lw + .07); g.stroke(path); g.strokeStyle = PP; g.lineWidth = cm(lw); g.stroke(path); m.strokeStyle = '#fff'; m.lineWidth = cm(lw); m.stroke(path); };   // a ribbon of pearl
        const CUT = path => { g.fillStyle = SP; g.fill(path); g.fillStyle = 'rgba(14,6,4,.55)'; g.fill(path); m.fillStyle = '#000'; m.fill(path); };   // shell showing through a hole in the pearl
        const DARK = (x, y, ww, hh, a = .78) => { g.fillStyle = `rgba(20,9,6,${a})`; g.fillRect(x, y, ww, hh); };
        const LINE2 = (xa, ya, xb, yb) => { [['#e2d8c4', .13], ['#2a1208', .05]].forEach(([c, lw]) => { g.strokeStyle = c; g.lineWidth = cm(lw); g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke(); }); };   // the fine light stringing (two light lines, a dark one between)
        // a long plaque of pearl with pointed ends, the shoulders cut in a concave curve (len along the axis, wd across); horizontal unless vert
        const loz = (cx, cy, len, wd, vert) => { const q = new Path2D(), L = len / 2, A = wd * 1.15, pt = (u, v) => vert ? [cx + v, cy + u] : [cx + u, cy + v], M = (u, v) => q.moveTo(...pt(u, v)), Ln = (u, v) => q.lineTo(...pt(u, v)), Q = (a1, b1, u, v) => q.quadraticCurveTo(...pt(a1, b1), ...pt(u, v));
          M(-L, 0); Q(-L + A * .55, -wd * .12, -L + A, -wd / 2); Ln(L - A, -wd / 2); Q(L - A * .55, -wd * .12, L, 0); Q(L - A * .55, wd * .12, L - A, wd / 2); Ln(-L + A, wd / 2); Q(-L + A * .55, wd * .12, -L, 0); q.closePath(); return q; };
        // a strip of plaques: pearl pieces end to end, the amber shell showing in the X between their points
        const strip = (xa, ya, len, wd, vert, n) => { DARK(vert ? xa - wd / 2 : xa, vert ? ya : ya - wd / 2, vert ? wd : len, vert ? len : wd, .9); const per = len / n, pl = per * .74;
          for (let k = 0; k <= n; k++) { const c = k * per; g.fillStyle = AP; const e = per - pl + wd * .9, lo = Math.max(0, c - e / 2), hi = Math.min(len, c + e / 2); if (vert) g.fillRect(xa - wd / 2, ya + lo, wd, hi - lo); else g.fillRect(xa + lo, ya - wd / 2, hi - lo, wd); }
          for (let k = 0; k < n; k++) { const c = (k + .5) * per; P(vert ? loz(xa, ya + c, pl, wd * .9, true) : loz(xa + c, ya, pl, wd * .9, false), .02); } };
        const drop = (x, y, r, up) => { const q = new Path2D(), d = up ? -1 : 1; q.moveTo(x, y - d * r * 1.7); q.bezierCurveTo(x + r * 1.2, y - d * r * .2, x + r, y + d * r, x, y + d * r); q.bezierCurveTo(x - r, y + d * r, x - r * 1.2, y - d * r * .2, x, y - d * r * 1.7); return q; };
        const GD = (x, y, r, up) => { const q = drop(x, y, r, up); g.fillStyle = '#3f7d68'; g.fill(q); g.strokeStyle = 'rgba(16,36,28,.7)'; g.lineWidth = cm(.03); g.stroke(q); m.fillStyle = '#000'; m.fill(q); };
        [0, 1].forEach(L => {   // left leaf (hinge on its right) and right leaf (hinge on its left)
          const x0 = cm(L ? LW + HG : FW), x1 = cm(L ? W - FW : LW - HG), y0 = cm(FW), y1 = h - cm(FW), fw = x1 - x0, fh = y1 - y0;
          string(x0 + cm(.12), y0 + cm(.12), fw - cm(.24), fh - cm(.24));
          const ix0 = x0 + cm(.62), ix1 = x1 - cm(.62), iy0 = y0 + cm(.62), iy1 = y1 - cm(.62), iw = ix1 - ix0, cy = (iy0 + iy1) / 2;
          string(ix0 - cm(.14), iy0 - cm(.14), iw + cm(.28), iy1 - iy0 + cm(.28));
          const BW = cm(.8), NB = cm(3.0), DB = cm(7.0), GAP = cm(.22), AZ = cm(4.5);   // the border strip, the narrow and deep bands, the zone of palmettes and arches
          const mid0 = cy - DB / 2 - GAP - NB, mid1 = cy + DB / 2 + GAP + NB;
          // the border strips round the field
          strip(ix0, iy0 + BW / 2, iw, BW, false, 7); strip(ix0, iy1 - BW / 2, iw, BW, false, 7);
          [ix0 + BW / 2, ix1 - BW / 2].forEach(x => { strip(x, iy0 + BW, mid0 - GAP - iy0 - BW, BW, true, 4); strip(x, mid1 + GAP, iy1 - BW - mid1 - GAP, BW, true, 4); });
          // six points to a side: a point's own ground 2.75 wide, a strip of plaques .9 wide between each two
          const px0 = ix0 + BW, pw = ix1 - BW - px0, SWd = cm(.9), ZW = (pw - 5 * SWd) / 6, zc = k => px0 + ZW / 2 + k * (ZW + SWd), sc = k => px0 + ZW + SWd / 2 + k * (ZW + SWd);
          [[iy0 + BW, 1], [iy1 - BW, -1]].forEach(([top, dir]) => {
            const end = dir > 0 ? mid0 - GAP : mid1 + GAP, PL = Math.abs(end - top) - AZ, tip = top + dir * PL, Y = v => top + dir * cm(v);
            for (let k = 0; k < 5; k++) strip(sc(k), dir > 0 ? top : tip, PL, SWd, true, 3);
            for (let k = 0; k < 6; k++) { const cx = zc(k), xa = cx - ZW / 2, xb = cx + ZW / 2;
              DARK(xa, Math.min(top, Y(3.55)), ZW, cm(3.55), .86); if ((k + L) % 2) DARK(xa, Math.min(Y(3.55), tip), ZW, PL - cm(3.55), .22);
              LINE2(xa + cm(.1), top, xa + cm(.1), tip); LINE2(xb - cm(.1), top, xb - cm(.1), tip);
              // the cypress: a cup, a tapering neck, then the long spike from a shouldered foot
              let q = new Path2D(); q.moveTo(cx - cm(1.05), Y(.12)); q.lineTo(cx + cm(1.05), Y(.12)); q.bezierCurveTo(cx + cm(1.05), Y(.75), cx + cm(.6), Y(1.0), cx, Y(1.0)); q.bezierCurveTo(cx - cm(.6), Y(1.0), cx - cm(1.05), Y(.75), cx - cm(1.05), Y(.12)); P(q);
              q = new Path2D(); q.moveTo(cx - cm(.6), Y(1.02)); q.lineTo(cx + cm(.6), Y(1.02)); q.lineTo(cx + cm(.3), Y(3.45)); q.lineTo(cx - cm(.3), Y(3.45)); q.closePath(); P(q);
              const LEN = PL / S - .15; q = new Path2D(); q.moveTo(cx - cm(.3), Y(3.55)); q.lineTo(cx + cm(.3), Y(3.55)); q.quadraticCurveTo(cx + cm(.7), Y(3.75), cx + cm(.7), Y(4.3)); q.lineTo(cx + cm(.04), Y(LEN)); q.lineTo(cx - cm(.04), Y(LEN)); q.lineTo(cx - cm(.7), Y(4.3)); q.quadraticCurveTo(cx - cm(.7), Y(3.75), cx - cm(.3), Y(3.55)); P(q);
              [6.2, 8.6].forEach(v => { g.strokeStyle = 'rgba(60,44,40,.4)'; g.lineWidth = cm(.03); g.beginPath(); g.moveTo(cx - cm(.6), Y(v + k % 2 * .7)); g.lineTo(cx + cm(.6), Y(v + k % 2 * .7 + .05)); g.save(); g.clip(q); g.stroke(); g.restore(); });   // the spike is pieced from several lengths
            }
            // under the tips: a palmette below every point, a bracket with a green drop below every strip, and the arches springing from them
            const T = v => tip + dir * cm(v), A0 = 2.45, A1 = AZ / S - .12;
            
            const cols = [px0 - BW / 2 + cm(.25)]; for (let k = 0; k < 5; k++) cols.push(sc(k)); cols.push(px0 + pw + BW / 2 - cm(.25));
            for (let k = 0; k < 6; k++) { const cx = zc(k), xl = cols[k], xr = cols[k + 1];
              const q = new Path2D(); [[xl, 1], [xr, -1]].forEach(([sx, sg]) => { q.moveTo(sx + sg * cm(.3), T(1.7)); q.bezierCurveTo(sx + sg * cm(.5), T(2.9), cx - sg * cm(1.25), T(2.6), cx - sg * cm(.95), T(3.5)); q.quadraticCurveTo(cx - sg * cm(.7), T(A1 - .35), cx - sg * cm(.05), T(A1)); }); RIB(q, .34);

              // palmette: a pointed head between two curled leaves, a drop cut out of it, on a stem
              const pm = new Path2D(), Xp = (u, v) => [cx + cm(u), T(v)]; pm.moveTo(...Xp(0, .2)); [1, -1].forEach(sg => { const X = (u, v) => Xp(sg * u, v); if (sg < 0) pm.lineTo(...X(.13, 2.35));
                if (sg > 0) { pm.bezierCurveTo(...X(.3, .5), ...X(.42, .45), ...X(.48, .75)); pm.bezierCurveTo(...X(.75, .5), ...X(.98, .75), ...X(.8, 1.05)); pm.bezierCurveTo(...X(.7, 1.3), ...X(.42, 1.2), ...X(.34, 1.45)); pm.lineTo(...X(.13, 1.75)); pm.lineTo(...X(.13, 2.35)); }
                else { pm.lineTo(...X(.13, 1.75)); pm.lineTo(...X(.34, 1.45)); pm.bezierCurveTo(...X(.42, 1.2), ...X(.7, 1.3), ...X(.8, 1.05)); pm.bezierCurveTo(...X(.98, .75), ...X(.75, .5), ...X(.48, .75)); pm.bezierCurveTo(...X(.42, .45), ...X(.3, .5), ...X(0, .2)); } }); pm.closePath(); P(pm);
              CUT(drop(cx, T(.95), cm(.17), dir < 0)); }
            cols.forEach((sx, k) => { if (k === 0 || k === 6) return; const X = (u, v) => [sx + cm(u), T(v)], br = new Path2D();
              br.moveTo(...X(-.78, 1.55)); br.lineTo(...X(-.3, 1.55)); br.quadraticCurveTo(...X(-.3, 1.95), ...X(0, 1.95)); br.quadraticCurveTo(...X(.3, 1.95), ...X(.3, 1.55)); br.lineTo(...X(.78, 1.55)); br.bezierCurveTo(...X(.8, 2.2), ...X(.3, 2.2), ...X(.3, 2.75)); br.lineTo(...X(-.3, 2.75)); br.bezierCurveTo(...X(-.3, 2.2), ...X(-.8, 2.2), ...X(-.78, 1.55)); br.closePath(); P(br);
              GD(sx, T(2.32), cm(.15), dir < 0);
              const cl = new Path2D(); cl.moveTo(...X(-.95, A1 - .1)); cl.bezierCurveTo(...X(-.5, A1 - .15), ...X(-.4, A1 - .75), ...X(0, A1 - .8)); cl.bezierCurveTo(...X(.4, A1 - .75), ...X(.5, A1 - .15), ...X(.95, A1 - .1)); cl.closePath(); P(cl); });
          });
          // the bands across the middle: narrow · deep · narrow
          [[mid0, NB, 0], [cy - DB / 2, DB, 1], [cy + DB / 2 + GAP, NB, 0]].forEach(([by, bh, deep]) => {
            string(ix0 + cm(.05), by, iw - cm(.1), bh);
            const bx0 = ix0 + cm(.5), bw = iw - cm(1.0), bcy = by + bh / 2, X = (u, v) => [bx0 + bw / 2 + cm(u), bcy + cm(v)], HW = bw / 2 / S;
            if (!deep) {   // a chain: a leaf with a green drop at each end, three roundels with a wave of shell across them, little double beads between
              [-1, 0, 1].forEach(k => { const u = k * 5.45, q = new Path2D(); q.moveTo(...X(u - 2.25, 0)); q.bezierCurveTo(...X(u - 1.6, -.2), ...X(u - 1.5, -1.2), ...X(u, -1.25)); q.bezierCurveTo(...X(u + 1.5, -1.2), ...X(u + 1.6, -.2), ...X(u + 2.25, 0));
                q.bezierCurveTo(...X(u + 1.6, .2), ...X(u + 1.5, 1.2), ...X(u, 1.25)); q.bezierCurveTo(...X(u - 1.5, 1.2), ...X(u - 1.6, .2), ...X(u - 2.25, 0)); q.closePath(); P(q);
                const wv = new Path2D(); wv.moveTo(...X(u - .95, .12)); wv.bezierCurveTo(...X(u - .8, -.6), ...X(u - .1, -.55), ...X(u + .1, -.1)); wv.bezierCurveTo(...X(u + .3, .3), ...X(u + .7, .3), ...X(u + .95, -.12)); wv.bezierCurveTo(...X(u + .8, .6), ...X(u + .1, .55), ...X(u - .1, .1)); wv.bezierCurveTo(...X(u - .3, -.3), ...X(u - .7, -.3), ...X(u - .95, .12)); wv.closePath(); CUT(wv); });
              [-2.72, 2.72].forEach(u => [-.24, .24].forEach(v => { const q = new Path2D(); q.arc(...X(u, v), cm(.25), 0, 6.2832); P(q); }));
              [-1, 1].forEach(sg => { const u0 = sg * (HW - .3), q = new Path2D(), Xs = (u, v) => X(u0 - sg * u, v); q.moveTo(...Xs(0, 0)); q.bezierCurveTo(...Xs(.35, -.5), ...Xs(.9, -.2), ...Xs(1.05, -.62)); q.bezierCurveTo(...Xs(1.5, -.8), ...Xs(2.0, -.55), ...Xs(2.2, -.3)); q.lineTo(...Xs(3.25, 0)); q.lineTo(...Xs(2.2, .3));
                q.bezierCurveTo(...Xs(2.0, .55), ...Xs(1.5, .8), ...Xs(1.05, .62)); q.bezierCurveTo(...Xs(.9, .2), ...Xs(.35, .5), ...Xs(0, 0)); q.closePath(); P(q); const c = Xs(1.35, 0); g.save(); g.translate(c[0], c[1]); g.rotate(sg * Math.PI / 2); GD(0, 0, cm(.17), false); g.restore(); });
            } else {   // the deep band: a fretted medallion of interlaced pearl bands, a small cartouche to either side, pearl corner-pieces with leaves cut out
              const med = new Path2D(), ring = (u, v, r) => { med.moveTo(X(u, v)[0] + cm(r), X(u, v)[1]); med.arc(...X(u, v), cm(r), 0, 6.2832); };
              // (traced on the photograph, 147 px to the cm in the enlargement: in each quarter three lobes round the edge, a large ring inside
              //  them, a heart rising from the centre, and a cusped band along the long axis out to the point)
              [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a2, b2]) => { ring(a2 * 1.12, b2 * 2.38, .8); ring(a2 * 2.42, b2 * 1.72, .8); ring(a2 * 2.88, b2 * .62, .6); ring(a2 * 1.45, b2 * 1.32, 1.12);
                med.moveTo(...X(0, 0)); med.bezierCurveTo(...X(a2 * .85, b2 * .35), ...X(a2 * .95, b2 * 1.25), ...X(a2 * .12, b2 * 1.85)); med.lineTo(...X(0, b2 * 3.15));
                med.moveTo(...X(a2 * .75, b2 * .2)); med.quadraticCurveTo(...X(a2 * 1.4, b2 * .62), ...X(a2 * 1.95, b2 * .2)); med.quadraticCurveTo(...X(a2 * 2.6, b2 * .5), ...X(a2 * 3.55, 0)); });
              med.moveTo(...X(-3.55, 0)); med.lineTo(...X(3.55, 0)); RIB(med, .27);
              [-1, 1].forEach(b2 => GD(X(0, b2 * .85)[0], X(0, b2 * .85)[1], cm(.13), b2 > 0));
              [-1, 1].forEach(sg => { const u = sg * 6.9, q = new Path2D(); for (let k = 0; k < 8; k++) { const a2 = k * Math.PI / 4, rr = k % 2 ? [1.25, .78] : [2.0, 1.2]; const p1 = X(u + Math.cos(a2) * rr[0], Math.sin(a2) * rr[1]); k ? q.quadraticCurveTo(...X(u + Math.cos(a2 - Math.PI / 8) * rr[0] * .82, Math.sin(a2 - Math.PI / 8) * rr[1] * .82), ...p1) : q.moveTo(...p1); }
                q.quadraticCurveTo(...X(u + Math.cos(-Math.PI / 8) * 1.6, Math.sin(-Math.PI / 8) * .95), ...X(u + 2.0, 0)); q.closePath(); P(q);
                const hq = new Path2D(); [[.75, 0], [-.75, 0], [0, .45], [0, -.45]].forEach(([du, dv]) => { hq.moveTo(X(u + du, dv)[0] + cm(.24), X(u + du, dv)[1]); hq.ellipse(...X(u + du, dv), cm(du ? .34 : .22), cm(du ? .2 : .2), 0, 0, 6.2832); }); CUT(hq);
                const bd = new Path2D(); [2.35, -2.35].forEach(du => { bd.moveTo(X(u + du, 0)[0] + cm(.22), X(u + du, 0)[1]); bd.arc(...X(u + du, 0), cm(.22), 0, 6.2832); }); P(bd);
                // the corner-pieces
                [-1, 1].forEach(tb => { const C = (du, dv) => X(sg * (HW - du), tb * (bh / 2 / S - .12 - dv)), cp = new Path2D(); cp.moveTo(...C(0, 0)); cp.lineTo(...C(5.1, 0)); cp.bezierCurveTo(...C(4.9, .7), ...C(4.0, .5), ...C(3.6, 1.0)); cp.bezierCurveTo(...C(3.1, 1.7), ...C(2.2, 1.2), ...C(1.9, 1.9));
                  cp.bezierCurveTo(...C(1.7, 2.6), ...C(.9, 2.3), ...C(.8, 2.9)); cp.bezierCurveTo(...C(.6, 3.2), ...C(.2, 3.1), ...C(0, 3.25)); cp.closePath(); P(cp);
                  const lf = new Path2D(); [[.55, .5, 1.5, .6, .9], [2.3, .45, 3.6, .5, .5], [.5, 1.3, 1.2, 1.9, .55]].forEach(([u1, v1, u2, v2, bw2]) => { const mu = (u1 + u2) / 2, mv = (v1 + v2) / 2, nx = -(v2 - v1), ny = u2 - u1, nl = Math.hypot(nx, ny) || 1; lf.moveTo(...C(u1, v1)); lf.quadraticCurveTo(...C(mu + nx / nl * bw2 * .6, mv + ny / nl * bw2 * .6), ...C(u2, v2)); lf.quadraticCurveTo(...C(mu - nx / nl * bw2 * .25, mv - ny / nl * bw2 * .25), ...C(u1, v1)); }); CUT(lf); }); });
            }
          });
        });
        bgMask = new TT.CanvasTexture(mk); bgMask.colorSpace = TT.NoColorSpace;
      });
      // materials: shell / pearl in one picture; the pearl areas get a thin-film iridescence (mask)
      const face = (map, mask) => K.mat({ map, color: '#ffffff', roughness: .3, metalness: .05, clearcoat: .6, clearcoatRoughness: .24, iridescence: .85, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], iridescenceMap: mask });
      const chessMat = face(chessT, chessMask), bgMat = face(bgT, bgMask);
      const edgeT = K.tex(512, 64, (g, w, h) => { g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,70,40,.5)'; g.lineWidth = 2; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, h / 2); g.lineTo(x, h); g.stroke(); } }, { rep: [12, 1] });
      const bone = K.mat({ map: edgeT, color: '#ffffff', roughness: .45, clearcoat: .3 });
      // the frame tops: plaques of turtle shell alternating with mother-of-pearl cut as long pieces with concave ends running to a point
      const plaqC = (len) => K.tex(1024, 48, (g, w, h) => { g.fillStyle = g.createPattern(shellC, 'repeat'); g.fillRect(0, 0, w, h); const n = Math.max(4, Math.round(len / 3.2)), st = w / n;
        g.strokeStyle = '#e6dccb'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 2); g.lineTo(w, 2); g.moveTo(0, h - 2); g.lineTo(w, h - 2); g.stroke();
        for (let k = 0; k < n; k++) { const x = k * st, p = new Path2D(); p.moveTo(x + st * .08, h / 2); p.quadraticCurveTo(x + st * .26, h / 2, x + st * .3, 6); p.lineTo(x + st * .7, 6); p.quadraticCurveTo(x + st * .74, h / 2, x + st * .92, h / 2); p.quadraticCurveTo(x + st * .74, h / 2, x + st * .7, h - 6); p.lineTo(x + st * .3, h - 6); p.quadraticCurveTo(x + st * .26, h / 2, x + st * .08, h / 2); p.closePath();
          g.fillStyle = g.createPattern(pearlC, 'repeat'); g.fill(p); g.strokeStyle = 'rgba(40,22,14,.6)'; g.lineWidth = 1.2; g.stroke(p); } });
      const plaqMat = (len, vert) => { const t = plaqC(len); if (vert) { t.center.set(.5, .5); t.rotation = Math.PI / 2; } return K.mat({ map: t, color: '#ffffff', roughness: .28, clearcoat: .85, clearcoatRoughness: .14, iridescence: .45, iridescenceIOR: 1.6 }); };
      // the hinge-side fillets: rosewood and mother-of-pearl triangles making little four-part squares (~1.7 cm)
      const hingeT = K.tex(64, 1024, (g, w, h) => { const n = Math.round(D / 1.7), st = h / n; g.fillStyle = '#3a1a10'; g.fillRect(0, 0, w, h);
        for (let k = 0; k < n; k++) { const y = k * st, p = new Path2D(); p.moveTo(w / 2, y + 2); p.lineTo(w - 3, y + st / 2); p.lineTo(w / 2, y + st - 2); p.lineTo(3, y + st / 2); p.closePath(); g.fillStyle = g.createPattern(pearlC, 'repeat'); g.fill(p); g.strokeStyle = 'rgba(30,14,8,.7)'; g.lineWidth = 1; g.stroke(p); g.beginPath(); g.moveTo(3, y + st / 2); g.lineTo(w - 3, y + st / 2); g.moveTo(w / 2, y); g.lineTo(w / 2, y + st); g.stroke(); } });
      const hingeMat = K.mat({ map: hingeT, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .15, iridescence: .4, iridescenceIOR: 1.6 });
      const wood = K.mat({ color: '#3a1d10', roughness: .5, clearcoat: .4 });
      // the leaves' edges: a row of pointed mother-of-pearl hexagons on turtle shell between bone lines (V&A 2012FP3721, 2012FT9876)
      const sideT = K.tex(256, 128, (g, w, h) => { g.fillStyle = '#2a1008'; g.fillRect(0, 0, w, h);
        const sh = K.noise(5); for (let x = 0; x < w; x += 4) for (let y = 0; y < h; y += 4) { const v = sh(x / 30, y / 30, 2); if (v > .55) { g.fillStyle = `rgba(170,80,20,${(v - .55) * 1.6})`; g.fillRect(x, y, 4, 4); } }
        g.fillStyle = '#e3d6b8'; g.fillRect(0, 0, w, h * .1); g.fillRect(0, h * .9, w, h * .1);
        const hex = (cx) => { g.beginPath(); g.moveTo(cx - w * .4, h / 2); g.lineTo(cx - w * .18, h * .16); g.lineTo(cx + w * .18, h * .16); g.lineTo(cx + w * .4, h / 2); g.lineTo(cx + w * .18, h * .84); g.lineTo(cx - w * .18, h * .84); g.closePath();
          const gr = g.createLinearGradient(cx - w * .4, 0, cx + w * .4, h); gr.addColorStop(0, '#d9d6dc'); gr.addColorStop(.5, '#f2ece6'); gr.addColorStop(1, '#c9ccd6'); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(60,40,30,.5)'; g.lineWidth = 2; g.stroke(); };
        hex(w / 2); }, { rep: [1, 1] });
      const sideM = len => { const t = sideT.clone(); t.wrapS = TT.RepeatWrapping; t.repeat.set(Math.round(len / 2.1), 1); t.needsUpdate = true; return K.mat({ map: t, color: '#ffffff', roughness: .4, clearcoat: .35 }); };
      const sdD = sideM(D), sdL = sideM(LW);
      [bgMat, chessMat].forEach(m => { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; });
      const top = new TT.Mesh(new TT.PlaneGeometry(W, D), bgMat); top.rotation.x = -Math.PI / 2; top.position.y = TH + .03; G.add(top);
      const bot = new TT.Mesh(new TT.PlaneGeometry(W, D), chessMat); bot.rotation.x = Math.PI / 2; bot.position.y = -.03; G.add(bot);
      [-1, 1].forEach(sd => {   // the two leaves, left and right of the hinge
        const cx = sd * LW / 2;
        const leaf = new TT.Mesh(new TT.BoxGeometry(LW - .08, TH, D), [sdD, sdD, wood, wood, sdL, sdL]); leaf.position.set(cx + sd * .04, TH / 2, 0); G.add(leaf);
        // raised framing fillets (about 5 mm): far, near and outer sides 1.2 cm wide, the hinge side 1.5 cm
        // (with the photograph's layout, the raised fillets carry their own part of the same picture)
        const part = (w, d, x, z) => { const m = bgMat.clone(); ['map', 'iridescenceMap'].forEach(k => { const t = bgMat[k].clone(); t.repeat.set(w / W, d / D); t.offset.set((x - w / 2 + W / 2) / W, (D / 2 - z - d / 2) / D); t.needsUpdate = true; m[k] = t; }); m.polygonOffset = false; return m; };
        const fil = (w, d, x, z, m) => { const f = new TT.Mesh(new TT.BoxGeometry(w, .5, d), [wood, wood, INLAY ? part(w, d, x, z) : m, wood, wood, wood]); f.position.set(x, TH + .25, z); G.add(f); };
        fil(LW, FW, cx, -D / 2 + FW / 2, plaqMat(LW, false)); fil(LW, FW, cx, D / 2 - FW / 2, plaqMat(LW, false));
        fil(FW, D - 2 * FW, sd * (W / 2 - FW / 2), 0, plaqMat(D, true)); const HG2 = INLAY ? 1.45 : HG; fil(HG2, D - 2 * FW, sd * HG2 / 2, 0, hingeMat);
        // the bone lip on the three outer edges (half-round, in interlocking lengths)
        const lip = (len, x, z, ry) => { const c = new TT.Mesh(new TT.CylinderGeometry(.3, .3, len, 12, 1, false, 0, Math.PI), bone); c.rotation.set(0, ry, Math.PI / 2); c.position.set(x, TH / 2, z); G.add(c); };
        // (the bone edging is drawn on the faces: the leaves' edges carry the row of pearl hexagons)
      });
      return G;
    },
  };
})();
