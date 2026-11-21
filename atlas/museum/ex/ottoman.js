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
  (window.AtlasEx = window.AtlasEx || {}).ottoman = {
    flip: true,
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
          const gr = 112 + sh * 70 + band * 22 + a * 18; const p = (j * PS + i) * 4; d[p] = gr + a * 16 - b * 14; d[p + 1] = gr + b * 12 - a * 6; d[p + 2] = gr + 10 + b * 18 + a * 6; d[p + 3] = 255; }
        og.putImageData(img, 0, 0); }
      const shellC = document.createElement('canvas'); shellC.width = shellC.height = PS;
      { const og = shellC.getContext('2d'), img = og.createImageData(PS, PS), d = img.data;
        for (let j = 0; j < PS; j++) for (let i = 0; i < PS; i++) { const u = i / PS, v = j / PS, m = N(u * 30 + 3, v * 18, 4) * .7 + N(u * 90, v * 50, 2) * .3, f = N(u * 90 + 7, v * 90, 2), t = Math.max(0, Math.min(1, (.4 - m) * 6));
          // dark, almost black-brown ground with amber-to-orange blotches (gold leaf glowing through the thin parts)
          const p = (j * PS + i) * 4; d[p] = 27 + t * 160 + (f - .5) * 12; d[p + 1] = 11 + t * 80 + (f - .5) * 7; d[p + 2] = 8 + t * 12; d[p + 3] = 255; }
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
        [0, 1].forEach(L => {   // left leaf (hinge on its right) and right leaf (hinge on its left)
          const x0 = cm(L ? LW + HG : FW), x1 = cm(L ? W - FW : LW - HG), y0 = cm(FW), y1 = h - cm(FW), fw = x1 - x0, fh = y1 - y0;
          string(x0 + cm(.15), y0 + cm(.15), fw - cm(.3), fh - cm(.3));
          const ix0 = x0 + cm(.45), ix1 = x1 - cm(.45), iy0 = y0 + cm(.45), iy1 = y1 - cm(.45), iw = ix1 - ix0, ih = iy1 - iy0, cy = (iy0 + iy1) / 2;
          // the bands across the middle: narrow · deep · narrow (heights from the photograph)
          const NB = cm(2.7), DB = cm(8.0), gap = cm(.2);
          const bands = [[cy - DB / 2 - gap - NB, NB, 0], [cy - DB / 2, DB, 1], [cy + DB / 2 + gap, NB, 0]];
          bands.forEach(([by, bh, deep]) => {
            string(ix0 + cm(.2), by, iw - cm(.4), bh);
            const bx0 = ix0 + cm(.45), bx1 = ix1 - cm(.45), bw = bx1 - bx0, bcy = by + bh / 2;
            // a hole cut through a pearl piece, showing the turtle shell beneath
            const H = (path) => { g.fillStyle = SP; g.fill(path); m.fillStyle = '#000'; m.fill(path); g.strokeStyle = 'rgba(40,22,14,.5)'; g.lineWidth = 1; g.stroke(path); };
            const drop = (x, y, rx, ry, rot) => { const p = new Path2D(); const c = Math.cos(rot), s2 = Math.sin(rot), T = (u, v) => [x + u * c - v * s2, y + u * s2 + v * c];
              p.moveTo(...T(0, -ry)); p.quadraticCurveTo(...T(rx, -ry * .1), ...T(0, ry)); p.quadraticCurveTo(...T(-rx, -ry * .1), ...T(0, -ry)); return p; };
            if (!deep) {
              // (after the photograph) three roundels, each a disc of pearl with a wave of shell through it, flanked by pointed lobes;
              // a bead between the groups; a leaf with a green drop at each end
              const n = 3, step = bw / n;
              for (let i = 0; i < n; i++) { const rx = bx0 + step * (i + .5), R1 = Math.min(bh * .42, cm(1.15));
                const u = new Path2D(); u.ellipse(rx, bcy, R1 * 1.05, R1, 0, 0, 6.29);
                [-1, 1].forEach(sd => { u.moveTo(rx + sd * R1 * .9, bcy - R1 * .55); u.quadraticCurveTo(rx + sd * R1 * 1.6, bcy - R1 * .5, rx + sd * R1 * 2.25, bcy); u.quadraticCurveTo(rx + sd * R1 * 1.6, bcy + R1 * .5, rx + sd * R1 * .9, bcy + R1 * .55); u.closePath(); });
                P(u);
                const ss = new Path2D(); ss.moveTo(rx - R1 * .62, bcy + R1 * .12); ss.bezierCurveTo(rx - R1 * .25, bcy - R1 * .62, rx + R1 * .25, bcy + R1 * .62, rx + R1 * .62, bcy - R1 * .12);
                ss.lineTo(rx + R1 * .62, bcy + R1 * .3); ss.bezierCurveTo(rx + R1 * .25, bcy + R1 * 1.1, rx - R1 * .25, bcy - R1 * .14, rx - R1 * .62, bcy + R1 * .56); ss.closePath(); H(ss);
                if (i) { const bx = bx0 + step * i, bd = new Path2D(); bd.ellipse(bx, bcy, R1 * .32, R1 * .38, 0, 0, 6.29); bd.moveTo(bx + R1 * .7, bcy); bd.ellipse(bx + R1 * .55, bcy, R1 * .15, R1 * .15, 0, 0, 6.29); bd.moveTo(bx - R1 * .4, bcy); bd.ellipse(bx - R1 * .55, bcy, R1 * .15, R1 * .15, 0, 0, 6.29); P(bd); }
              }
              [bx0, bx1].forEach((ex, k) => { const sd = k ? -1 : 1, f = new Path2D(), R1 = Math.min(bh * .4, cm(1.1)); f.moveTo(ex, bcy - R1 * .5); f.quadraticCurveTo(ex + sd * R1 * 1.2, bcy - R1 * .9, ex + sd * R1 * 2.0, bcy); f.quadraticCurveTo(ex + sd * R1 * 1.2, bcy + R1 * .9, ex, bcy + R1 * .5); f.closePath(); P(f); GR(ex + sd * R1 * .95, bcy, R1 * .2, R1 * .28); });
            } else {
              // (after the photograph) the deep band: a lobed medallion of fretted pearl at the centre, a fretted lozenge of palmettes
              // either side on a stem, and large fretted spandrels filling the four corners
              const mx = bx0 + bw / 2, MW = bw * .19, MH = bh * .48;
              const stem = new Path2D(); stem.rect(bx0 + bw * .2, bcy - cm(.09), bw * .6, cm(.18)); P(stem, .02);
              const med = new Path2D(), LB = 8;
              for (let q = 0; q <= 160; q++) { const a = q / 160 * Math.PI * 2, f = Math.abs(Math.sin(a * LB / 2)), rr = 1 - .12 * Math.pow(1 - f, 2), x = mx + Math.cos(a) * MW * rr, y = bcy + Math.sin(a) * MH * rr; q ? med.lineTo(x, y) : med.moveTo(x, y); } med.closePath();
              [-1, 1].forEach(sd => { med.moveTo(mx + sd * MW * .96, bcy - MH * .14); med.lineTo(mx + sd * MW * 1.32, bcy); med.lineTo(mx + sd * MW * .96, bcy + MH * .14); });   // the pointed ends on the axis
              P(med);
              // the fretwork: rings of holes — hearts and drops — leaving the interlaced straps of pearl; the axes left solid
              for (let q = 0; q < 16; q++) { const a = (q + .5) / 16 * Math.PI * 2; H(drop(mx + Math.cos(a) * MW * .78, bcy + Math.sin(a) * MH * .78, MW * .14, MH * .2, a + Math.PI / 2)); }
              for (let q = 0; q < 8; q++) { const a = (q + .5) / 8 * Math.PI * 2; H(drop(mx + Math.cos(a) * MW * .5, bcy + Math.sin(a) * MH * .5, MW * .2, MH * .26, a - Math.PI / 2)); }
              for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2 + Math.PI / 8; const p = new Path2D(); p.ellipse(mx + Math.cos(a) * MW * .64, bcy + Math.sin(a) * MH * .64, MW * .09, MH * .1, 0, 0, 6.29); H(p); }
              for (let q = 0; q < 4; q++) { const a = (q + .5) * Math.PI / 2; H(drop(mx + Math.cos(a) * MW * .26, bcy + Math.sin(a) * MH * .26, MW * .15, MH * .19, a + Math.PI / 2)); }
              [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([ux, uy]) => { const l = new Path2D(); l.rect(Math.min(mx, mx + ux * MW * .95) - (ux ? 0 : cm(.04)), Math.min(bcy, bcy + uy * MH * .95) - (uy ? 0 : cm(.04)), ux ? MW * .95 : cm(.08), uy ? MH * .95 : cm(.08)); g.fillStyle = PP; g.fill(l); m.fillStyle = '#fff'; m.fill(l); });
              GR(mx, bcy - MH * .22, cm(.09), cm(.14)); GR(mx, bcy + MH * .22, cm(.09), cm(.14));
              // either side: a lozenge of palmettes, fretted
              [-1, 1].forEach(sd => { const lx = mx + sd * bw * .3, LWd = bw * .1, LHt = bh * .3, lz = new Path2D();
                lz.moveTo(lx - LWd, bcy); lz.quadraticCurveTo(lx - LWd * .45, bcy - LHt * .35, lx - LWd * .2, bcy - LHt * .8); lz.quadraticCurveTo(lx, bcy - LHt * 1.1, lx + LWd * .2, bcy - LHt * .8); lz.quadraticCurveTo(lx + LWd * .45, bcy - LHt * .35, lx + LWd, bcy);
                lz.quadraticCurveTo(lx + LWd * .45, bcy + LHt * .35, lx + LWd * .2, bcy + LHt * .8); lz.quadraticCurveTo(lx, bcy + LHt * 1.1, lx - LWd * .2, bcy + LHt * .8); lz.quadraticCurveTo(lx - LWd * .45, bcy + LHt * .35, lx - LWd, bcy); lz.closePath();
                [-1, 1].forEach(e => { lz.moveTo(lx + e * LWd * 1.5, bcy - LHt * .2); lz.lineTo(lx + e * LWd * 1.0, bcy); lz.lineTo(lx + e * LWd * 1.5, bcy + LHt * .2); lz.lineTo(lx + e * LWd * 1.25, bcy); lz.closePath(); });
                P(lz);
                H(drop(lx, bcy - LHt * .42, LWd * .16, LHt * .22, 0)); H(drop(lx, bcy + LHt * .42, LWd * .16, LHt * .22, Math.PI)); H(drop(lx - LWd * .5, bcy, LWd * .12, LHt * .16, -Math.PI / 2)); H(drop(lx + LWd * .5, bcy, LWd * .12, LHt * .16, Math.PI / 2));
                const c0 = new Path2D(); c0.ellipse(lx, bcy, LWd * .14, LHt * .14, 0, 0, 6.29); H(c0); GR(lx, bcy, LWd * .07, LHt * .08); });
              // the corner spandrels: big pieces of pearl reaching in from each corner, cut with crescents and drops
              [[bx0, by, 1, 1], [bx1, by, -1, 1], [bx0, by + bh, 1, -1], [bx1, by + bh, -1, -1]].forEach(([sx, sy, dx, dy]) => { const sp = new Path2D(), SW = bw * .2, SH = bh * .5;
                sp.moveTo(sx, sy); sp.lineTo(sx + dx * SW, sy); sp.quadraticCurveTo(sx + dx * SW * .55, sy + dy * SH * .25, sx + dx * SW * .62, sy + dy * SH * .55); sp.quadraticCurveTo(sx + dx * SW * .3, sy + dy * SH * .45, sx + dx * SW * .2, sy + dy * SH * .92); sp.quadraticCurveTo(sx + dx * SW * .08, sy + dy * SH * .7, sx, sy + dy * SH); sp.closePath(); P(sp);
                const cr = new Path2D(); cr.ellipse(sx + dx * SW * .32, sy + dy * SH * .38, SW * .22, SH * .24, 0, 0, 6.29); cr.ellipse(sx + dx * SW * .4, sy + dy * SH * .3, SW * .16, SH * .17, 0, 0, 6.29, true); H(cr);
                H(drop(sx + dx * SW * .75, sy + dy * SH * .1, SW * .08, SH * .1, dx * 1.2));
                H(drop(sx + dx * SW * .62, sy + dy * SH * .18, SW * .07, SH * .12, dx * .8)); H(drop(sx + dx * SW * .1, sy + dy * SH * .62, SW * .05, SH * .14, dx * -.3)); });
            }
          });
          // the points: six from the far edge, six from the near edge
          const nP = 6, colW = iw / nP, sep = cm(.5);
          [[iy0, cy - DB / 2 - gap - NB - gap, 1], [iy1, cy + DB / 2 + gap + NB + gap, -1]].forEach(([edge, inner, dir]) => {
            const span = Math.abs(inner - edge), arc = cm(5.0), tipEnd = inner - dir * arc;   // the niche row next to the bands
            // separators: narrow bands of the frame's marquetry between the columns (stringing and slivers of pearl)
            for (let k = 0; k <= nP; k++) { const sx = ix0 + k * colW, sx0 = sx - sep / 2;
              g.fillStyle = '#e6dccb'; g.fillRect(sx0, Math.min(edge, tipEnd), cm(.05), Math.abs(tipEnd - edge)); g.fillRect(sx0 + sep - cm(.05), Math.min(edge, tipEnd), cm(.05), Math.abs(tipEnd - edge));
              if (k > 0 && k < nP) { const nd = new Path2D(), nl = Math.abs(tipEnd - edge) * .78, e1 = edge + dir * cm(.3); nd.moveTo(sx - cm(.3), e1); nd.lineTo(sx + cm(.3), e1); nd.lineTo(sx, e1 + dir * nl); nd.closePath(); P(nd, .015); }
            }
            for (let k = 0; k < nP; k++) {
              const cx = ix0 + (k + .5) * colW, half = colW * .24;
              // the point: a short cap at the edge, then a long tapering triangle (widest at the edge) running to the niche
              const tr = new Path2D(), Lp = Math.abs(tipEnd - edge) - cm(.3), e0 = edge + dir * cm(.2), bw2 = colW * .17;
              tr.moveTo(cx - bw2 * .55, e0); tr.lineTo(cx + bw2 * .55, e0); tr.lineTo(cx + bw2 * .55, e0 + dir * cm(.75)); tr.lineTo(cx + bw2 * .35, e0 + dir * cm(.95));
              tr.lineTo(cx + bw2, e0 + dir * cm(1.15)); tr.quadraticCurveTo(cx + bw2 * .7, e0 + dir * Lp * .55, cx, e0 + dir * Lp); tr.quadraticCurveTo(cx - bw2 * .7, e0 + dir * Lp * .55, cx - bw2, e0 + dir * cm(1.15));
              tr.lineTo(cx - bw2 * .35, e0 + dir * cm(.95)); tr.lineTo(cx - bw2 * .55, e0 + dir * cm(.75)); tr.closePath();
              P(tr);
              // fine double stringing either side of each point (the photograph shows several light lines per column)
              [-1, 1].forEach(sd2 => [.3, .36].forEach(f => { g.fillStyle = '#d8d0c4'; g.fillRect(cx + sd2 * colW * f - cm(.03), Math.min(edge, tipEnd), cm(.06), Math.abs(tipEnd - edge)); }));
              // the joins of the pieces the cypress is made of
              g.strokeStyle = 'rgba(60,40,30,.45)'; g.lineWidth = 1; [.18, .42, .66].forEach(f => { const yy = e0 + dir * Lp * f; g.beginPath(); g.moveTo(cx - half, yy + dir * cm(.2)); g.lineTo(cx + half, yy - dir * cm(.1)); g.stroke(); });
              // the niche over the tip: a U of two bands with outward hooks, its lowest point near the bands; the pendant inside it
              const a0 = ix0 + k * colW, a1 = a0 + colW, top0 = tipEnd + dir * cm(.1), bot0 = inner - dir * cm(.25);
              const ni = new Path2D(), tw = cm(.6);
              ni.moveTo(a0 - cm(.25), top0); ni.quadraticCurveTo(a0 + cm(.15), top0 + dir * cm(.35), a0 + cm(.2), top0 + dir * cm(.9));
              ni.quadraticCurveTo(a0 + cm(.25), bot0 - dir * cm(.5), cx, bot0); ni.quadraticCurveTo(a1 - cm(.25), bot0 - dir * cm(.5), a1 - cm(.2), top0 + dir * cm(.9)); ni.quadraticCurveTo(a1 - cm(.15), top0 + dir * cm(.35), a1 + cm(.25), top0);
              ni.lineTo(a1 + cm(.05), top0 + dir * cm(.25)); ni.quadraticCurveTo(a1 - cm(.45), top0 + dir * cm(.55), a1 - cm(.48), top0 + dir * cm(1.0));
              ni.quadraticCurveTo(a1 - cm(.55), bot0 - dir * (tw + cm(.5)), cx, bot0 - dir * tw * 1.3); ni.quadraticCurveTo(a0 + cm(.55), bot0 - dir * (tw + cm(.5)), a0 + cm(.48), top0 + dir * cm(1.0)); ni.quadraticCurveTo(a0 + cm(.45), top0 + dir * cm(.55), a0 - cm(.05), top0 + dir * cm(.25)); ni.closePath(); P(ni);
              // the pendant: a cusped drop on a stem from the cypress tip, pierced in the middle
              const st0 = tipEnd - dir * cm(.2), pH = Math.abs(bot0 - st0) * .7, pd = new Path2D(), pw2 = half * 1.45;
              pd.moveTo(cx - cm(.06), st0); pd.lineTo(cx + cm(.06), st0); pd.lineTo(cx + cm(.06), st0 + dir * pH * .22);
              pd.quadraticCurveTo(cx + pw2 * 1.1, st0 + dir * pH * .3, cx + pw2 * .8, st0 + dir * pH * .7); pd.quadraticCurveTo(cx + pw2 * .35, st0 + dir * pH * .82, cx, st0 + dir * pH);
              pd.quadraticCurveTo(cx - pw2 * .35, st0 + dir * pH * .82, cx - pw2 * .8, st0 + dir * pH * .7); pd.quadraticCurveTo(cx - pw2 * 1.1, st0 + dir * pH * .3, cx - cm(.06), st0 + dir * pH * .22); pd.closePath();
              [-1, 1].forEach(hs => { pd.moveTo(cx + hs * cm(.06), st0 + dir * pH * .24); pd.quadraticCurveTo(cx + hs * pw2 * .9, st0 + dir * pH * .18, cx + hs * pw2 * 1.05, st0 - dir * pH * .05); pd.quadraticCurveTo(cx + hs * pw2 * .7, st0 + dir * pH * .1, cx + hs * cm(.06), st0 + dir * pH * .32); });
              pd.moveTo(cx + pw2 * .3, st0 + dir * pH * .55); pd.ellipse(cx, st0 + dir * pH * .55, pw2 * .3, pH * .14, 0, 0, 6.29, true); P(pd);
              GR(cx, st0 + dir * pH * .55, pw2 * .16, pH * .07); [a0, a1].forEach(ax => GR(ax, top0 + dir * cm(.55), cm(.12), cm(.2)));
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
        const fil = (w, d, x, z, m) => { const f = new TT.Mesh(new TT.BoxGeometry(w, .5, d), [wood, wood, m, wood, wood, wood]); f.position.set(x, TH + .25, z); G.add(f); };
        fil(LW, FW, cx, -D / 2 + FW / 2, plaqMat(LW, false)); fil(LW, FW, cx, D / 2 - FW / 2, plaqMat(LW, false));
        fil(FW, D - 2 * FW, sd * (W / 2 - FW / 2), 0, plaqMat(D, true)); fil(HG, D - 2 * FW, sd * HG / 2, 0, hingeMat);
        // the bone lip on the three outer edges (half-round, in interlocking lengths)
        const lip = (len, x, z, ry) => { const c = new TT.Mesh(new TT.CylinderGeometry(.3, .3, len, 12, 1, false, 0, Math.PI), bone); c.rotation.set(0, ry, Math.PI / 2); c.position.set(x, TH / 2, z); G.add(c); };
        // (the bone edging is drawn on the faces: the leaves' edges carry the row of pearl hexagons)
      });
      return G;
    },
  };
})();
