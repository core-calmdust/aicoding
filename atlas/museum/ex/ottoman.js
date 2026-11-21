/* 所蔵品：オスマン帝国のチェス・バックギャモン盤（ヴィクトリア＆アルバート博物館 861-1907） — units: 1 = 1 cm.
   After the V&A's physical description: a folding board of two leaves, 56.5 × 56.3 cm open, about 1.2 cm deep each.
   Inside (shown open): backgammon — two "tables" on turtle shell laid over gold leaf, each with six mother-of-pearl points
   at the top and bottom shaped as stylised cypress trees, a central cross band with a fretted motif picked out in green-stained
   bone, narrower bands beside it; raised framing fillets topped with alternating turtle-shell and mother-of-pearl plaques.
   Outside (turn it over): chess — 64 squares of mother-of-pearl (four-part, pink and blue tones) and pale turtle shell on gold
   leaf, a turtle-shell roundel with an eight-pointed scalloped edge where four squares meet, nine alternating light and dark
   fillets round the field, a wide border of turtle shell with a mother-of-pearl chain linked at the corners by shield motifs
   set with baleen, and the outer edge lipped with half-round bone in interlocking chevrons. Patterns drawn after the record;
   exact proportions of the motifs are estimates. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).ottoman = {
    flip: true,
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 56.5, D = 56.3, LD = D / 2, TH = 1.2, PX = innerWidth < 820 ? 1536 : 2048;   // width, depth open, a leaf's depth, its thickness
      const N = K.noise(23);
      /* ---------- painters ---------- */
      // turtle shell over gold leaf: amber with dark mottles and warm flecks; returns nothing (paints the rect)
      const shell = (g, x, y, w, h, pale) => {
        const W2 = Math.max(1, Math.ceil(w)), H2 = Math.max(1, Math.ceil(h)), oc = document.createElement('canvas'); oc.width = W2; oc.height = H2;
        const og = oc.getContext('2d'), img = og.createImageData(W2, H2), d = img.data;
        for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
          const u = (x + i) / PX, v = (y + j) / PX, m = N(u * 34, v * 34, 3), f = N(u * 90 + 7, v * 90, 1), k = Math.max(0, Math.min(1, (m - .46) * 3.2));
          const base = pale ? [214, 150, 70] : [178, 102, 34], dark = pale ? [104, 52, 18] : [44, 18, 6];
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
        shell(g, 0, 0, w, h, false);
        // outer dark fillet with stringing, and the bone lip drawn at the very edge (the lip itself is modelled)
        g.strokeStyle = '#2a140a'; g.lineWidth = .5 * S; g.strokeRect(.9 * S, .9 * S, w - 1.8 * S, h - 1.8 * S);
        g.strokeStyle = '#e8dcc0'; g.lineWidth = .08 * S; g.strokeRect(.62 * S, .62 * S, w - 1.24 * S, h - 1.24 * S); g.strokeRect(1.18 * S, 1.18 * S, w - 2.36 * S, h - 2.36 * S);
        // the wide border: a mother-of-pearl chain on the shell, shields at the corners (with baleen)
        const B0 = 1.6, B1 = 7.2, mid = (B0 + B1) / 2;
        const link = (cx, cy, horiz) => { const rw = (horiz ? 2.4 : .9) * S, rh = (horiz ? .9 : 2.4) * S; g.beginPath(); g.ellipse(cx, cy, rw, rh, 0, 0, 6.29); g.ellipse(cx, cy, rw * .62, rh * .5, 0, 0, 6.29); g.fillStyle = '#eee8e2'; g.fill('evenodd'); m.beginPath(); m.ellipse(cx, cy, rw, rh, 0, 0, 6.29); m.fill();
          g.beginPath(); g.ellipse(cx, cy, rw * .3, rh * .3, 0, 0, 6.29); g.fillStyle = '#141010'; g.fill(); };
        for (let k = 0; k < 9; k++) { const t = (B1 + 1.6 + k * ((W - 2 * B1 - 3.2) / 8)) * S; link(t, mid * S, true); link(t, h - mid * S, true); }
        for (let k = 0; k < 9; k++) { const t = (B1 + 1.6 + k * ((D - 2 * B1 - 3.2) / 8)) * S; link(mid * S, t, false); link(w - mid * S, t, false); }
        [[mid, mid], [W - mid, mid], [mid, D - mid], [W - mid, D - mid]].forEach(([cx, cy]) => { g.save(); g.translate(cx * S, cy * S); g.beginPath(); g.moveTo(0, -2.2 * S); g.lineTo(1.8 * S, -1.2 * S); g.quadraticCurveTo(1.6 * S, 1.4 * S, 0, 2.4 * S); g.quadraticCurveTo(-1.6 * S, 1.4 * S, -1.8 * S, -1.2 * S); g.closePath();
          g.fillStyle = '#efe9e4'; g.fill(); m.save(); m.translate(cx * S, cy * S); m.fill(new Path2D(`M0 ${-2.2 * S}L${1.8 * S} ${-1.2 * S}Q${1.6 * S} ${1.4 * S} 0 ${2.4 * S}Q${-1.6 * S} ${1.4 * S} ${-1.8 * S} ${-1.2 * S}Z`)); m.restore();
          g.beginPath(); g.moveTo(0, -1.2 * S); g.lineTo(.9 * S, -.6 * S); g.quadraticCurveTo(.8 * S, .8 * S, 0, 1.3 * S); g.quadraticCurveTo(-.8 * S, .8 * S, -.9 * S, -.6 * S); g.closePath(); g.fillStyle = '#121010'; g.fill(); g.restore(); });
        // nine fillets round the field, then the 64 squares
        const F0 = B1 + .2, FS = .26;
        fillets(g, F0 * S, F0 * S, w - 2 * F0 * S, h - 2 * F0 * S, 9, FS * S);
        const q0x = F0 + 9 * FS, q0y = F0 + 9 * FS, QW = (W - 2 * q0x) / 8, QD = (D - 2 * q0y) / 8;
        for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
          const x = (q0x + c * QW) * S, y = (q0y + r * QD) * S;
          if ((r + c) % 2) { pearl(g, x, y, QW * S, QD * S, true); m.fillRect(x, y, QW * S, QD * S); } else shell(g, x, y, QW * S, QD * S, true);
        }
        // turtle-shell roundels with an eight-pointed scalloped edge where four squares meet
        for (let r = 1; r < 8; r++) for (let c = 1; c < 8; c++) {
          const cx = (q0x + c * QW) * S, cy = (q0y + r * QD) * S, R0 = QW * S * .2;
          g.beginPath(); for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI * 2, rr = k % 2 ? R0 * .82 : R0; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath();
          g.fillStyle = '#7a3c14'; g.fill(); g.beginPath(); g.arc(cx, cy, R0 * .62, 0, 6.29); g.fillStyle = '#b8743a'; g.fill(); m.fillStyle = '#000'; m.beginPath(); m.arc(cx, cy, R0, 0, 6.29); m.fill(); m.fillStyle = '#fff';
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
      const FW = 1.2, HG = 1.5, LW = W / 2;   // outer fillet width, hinge-side fillet width, a leaf's width (cm)
      // a sheet of mother-of-pearl to cut shapes from (made once: soft grey-white with pink, blue and green flushes, cut in strips)
      const PS = 1024, pearlC = document.createElement('canvas'); pearlC.width = pearlC.height = PS;
      { const og = pearlC.getContext('2d'), img = og.createImageData(PS, PS), d = img.data;
        for (let j = 0; j < PS; j++) for (let i = 0; i < PS; i++) { const u = i / PS, v = j / PS, a = N(u * 22, v * 5, 3), b = N(u * 7 + 5, v * 16, 2), sh = N(u * 90, v * 14, 2), band = Math.sin((v * 9 + a * 2) * Math.PI) * .5 + .5;
          const gr = 132 + sh * 64 + band * 22 + a * 18; const p = (j * PS + i) * 4; d[p] = gr + a * 16 - b * 14; d[p + 1] = gr + b * 12 - a * 6; d[p + 2] = gr + 10 + b * 18 + a * 6; d[p + 3] = 255; }
        og.putImageData(img, 0, 0); }
      const shellC = document.createElement('canvas'); shellC.width = shellC.height = PS;
      { const og = shellC.getContext('2d'), img = og.createImageData(PS, PS), d = img.data;
        for (let j = 0; j < PS; j++) for (let i = 0; i < PS; i++) { const u = i / PS, v = j / PS, m = N(u * 30 + 3, v * 18, 4) * .7 + N(u * 90, v * 50, 2) * .3, f = N(u * 90 + 7, v * 90, 2), t = Math.max(0, Math.min(1, (.42 - m) * 6));
          // dark, almost black-brown ground with amber-to-orange blotches (gold leaf glowing through the thin parts)
          const p = (j * PS + i) * 4; d[p] = 34 + t * 168 + (f - .5) * 14; d[p + 1] = 14 + t * 84 + (f - .5) * 8; d[p + 2] = 9 + t * 14; d[p + 3] = 255; }
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
          const NB = cm(2.5), DB = cm(5.8), gap = cm(.18);
          const bands = [[cy - DB / 2 - gap - NB, NB, 0], [cy - DB / 2, DB, 1], [cy + DB / 2 + gap, NB, 0]];
          bands.forEach(([by, bh, deep]) => {
            string(ix0 + cm(.2), by, iw - cm(.4), bh);
            const bx0 = ix0 + cm(.45), bx1 = ix1 - cm(.45), bw = bx1 - bx0, bcy = by + bh / 2;
            if (!deep) {
              // a chain: roundels with an S of shell in the middle, between pointed lobed motifs, all on a thin stem
              const n = 4, step = bw / n;
              const stem = new Path2D(); stem.rect(bx0, bcy - cm(.1), bw, cm(.2)); P(stem, .02);
              for (let i = 0; i < n; i++) { const rx = bx0 + step * (i + .5);
                const ro = new Path2D(); ro.ellipse(rx, bcy, cm(1.2), cm(.92), 0, 0, 6.29); P(ro);
                const ss = new Path2D(); ss.moveTo(rx - cm(.5), bcy + cm(.1)); ss.bezierCurveTo(rx - cm(.2), bcy - cm(.5), rx + cm(.2), bcy + cm(.5), rx + cm(.5), bcy - cm(.1)); g.strokeStyle = SP; g.lineWidth = cm(.34); g.stroke(ss); m.strokeStyle = '#000'; m.lineWidth = cm(.34); m.stroke(ss);
                if (i < n) { const lx = bx0 + step * i; [-1, 1].forEach(sd => { if ((i === 0 && sd < 0)) return; const ax = lx + (i === 0 ? 0 : 0), lob = new Path2D();
                  lob.moveTo(ax + sd * cm(.25), bcy - cm(.95)); lob.quadraticCurveTo(ax + sd * cm(1.0), bcy - cm(.7), ax + sd * cm(1.55), bcy); lob.quadraticCurveTo(ax + sd * cm(1.0), bcy + cm(.7), ax + sd * cm(.25), bcy + cm(.95)); lob.quadraticCurveTo(ax + sd * cm(.75), bcy, ax + sd * cm(.25), bcy - cm(.95)); if (i) P(lob); }); if (i) GR(lx, bcy, cm(.14), cm(.2)); }
              }
              // the pointed finials at each end
              [bx0, bx1].forEach((ex, k) => { const sd = k ? -1 : 1, f = new Path2D(); f.moveTo(ex, bcy - cm(.55)); f.quadraticCurveTo(ex + sd * cm(.9), bcy - cm(.25), ex + sd * cm(1.25), bcy); f.quadraticCurveTo(ex + sd * cm(.9), bcy + cm(.25), ex, bcy + cm(.55)); f.closePath(); P(f); GR(ex + sd * cm(.45), bcy, cm(.13), cm(.2)); });
            } else {
              // the deep band: a round fretted medallion of interlace (four joined quarters), smaller lobed cartouches either side,
              // fretted hooks (spandrels) in the corners
              const mx = bx0 + bw / 2, MW = bw * .2, MH = bh * .47, lw = cm(.15);
              const strokeP = (p, wdt) => { g.strokeStyle = PP; g.lineWidth = wdt; g.stroke(p); m.strokeStyle = '#fff'; m.lineWidth = wdt; m.stroke(p); g.strokeStyle = 'rgba(40,22,14,.45)'; g.lineWidth = 1; g.stroke(p); };
              // a lobed round medallion (eight ogee lobes) filled with a dense interlace of rings, a quatrefoil at the heart
              const lob = new Path2D(), LB = 8;
              for (let q = 0; q <= LB * 8; q++) { const a = q / (LB * 8) * Math.PI * 2, f = Math.abs(Math.sin(a * LB / 2)), rr = 1 - .14 * Math.pow(1 - f, 2); const x = mx + Math.cos(a) * MW * rr, y = bcy + Math.sin(a) * MH * rr; q ? lob.lineTo(x, y) : lob.moveTo(x, y); } lob.closePath();
              strokeP(lob, lw * 1.2);
              const ring = new Path2D();
              for (let q = 0; q < 8; q++) { const a = q / 8 * Math.PI * 2 + Math.PI / 8, x = mx + Math.cos(a) * MW * .56, y = bcy + Math.sin(a) * MH * .56; ring.moveTo(x + MW * .3, y); ring.ellipse(x, y, MW * .3, MH * .3, 0, 0, Math.PI * 2); }
              for (let q = 0; q < 4; q++) { const a = q / 4 * Math.PI * 2, x = mx + Math.cos(a) * MW * .28, y = bcy + Math.sin(a) * MH * .28; ring.moveTo(x + MW * .2, y); ring.ellipse(x, y, MW * .2, MH * .2, 0, 0, Math.PI * 2); }
              strokeP(ring, lw);
              const qf = new Path2D(); for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; qf.moveTo(mx, bcy); qf.quadraticCurveTo(mx + Math.cos(a - .5) * MW * .3, bcy + Math.sin(a - .5) * MH * .3, mx + Math.cos(a) * MW * .2, bcy + Math.sin(a) * MH * .2); qf.quadraticCurveTo(mx + Math.cos(a + .5) * MW * .3, bcy + Math.sin(a + .5) * MH * .3, mx, bcy); } P(qf);
              GR(mx, bcy, cm(.13), cm(.19));
              const MWt = MW;
              // long finials from the points of the mandorla, ending in a lobed palmette; quarter medallions at the band's ends
              [-1, 1].forEach(sd => { const tx = mx + sd * MWt, fx = mx + sd * bw * .34, fin = new Path2D();
                fin.moveTo(tx, bcy - cm(.12)); fin.lineTo(fx - sd * cm(1.4), bcy - cm(.12)); fin.quadraticCurveTo(fx - sd * cm(1.0), bcy - bh * .42, fx + sd * cm(.7), bcy - bh * .28); fin.quadraticCurveTo(fx + sd * cm(.1), bcy - bh * .1, fx + sd * cm(1.4), bcy);
                fin.quadraticCurveTo(fx + sd * cm(.1), bcy + bh * .1, fx + sd * cm(.7), bcy + bh * .28); fin.quadraticCurveTo(fx - sd * cm(1.0), bcy + bh * .42, fx - sd * cm(1.4), bcy + cm(.12)); fin.lineTo(tx, bcy + cm(.12)); fin.closePath();
                fin.moveTo(fx + sd * cm(.35), bcy); fin.ellipse(fx, bcy, cm(.35), bh * .09, 0, 0, 6.29, sd > 0);
                [-1, 1].forEach(vs => { const ex2 = fx - sd * cm(.6), ey = bcy + vs * bh * .2; fin.moveTo(ex2 + cm(.2), ey); fin.ellipse(ex2, ey, cm(.2), bh * .06, vs * sd * .6, 0, 6.29, sd > 0); }); P(fin); GR(fx, bcy, cm(.1), cm(.15));
                const ex = sd < 0 ? bx0 : bx1, q = new Path2D(); q.moveTo(ex, bcy - bh * .36); q.quadraticCurveTo(ex - sd * cm(2.2), bcy - bh * .3, ex - sd * cm(2.0), bcy); q.quadraticCurveTo(ex - sd * cm(2.2), bcy + bh * .3, ex, bcy + bh * .36); q.lineTo(ex, bcy + bh * .2); q.quadraticCurveTo(ex - sd * cm(1.3), bcy, ex, bcy - bh * .2); q.closePath(); P(q); });
              // spandrels: a hooked cloud band in each corner
              [[bx0, by, 1, 1], [bx1, by, -1, 1], [bx0, by + bh, 1, -1], [bx1, by + bh, -1, -1]].forEach(([sx, sy, dx, dy]) => { const sp = new Path2D();
                sp.moveTo(sx, sy + dy * cm(.15)); sp.lineTo(sx + dx * cm(2.6), sy + dy * cm(.15)); sp.quadraticCurveTo(sx + dx * cm(1.6), sy + dy * cm(.6), sx + dx * cm(2.0), sy + dy * cm(1.5)); sp.quadraticCurveTo(sx + dx * cm(1.2), sy + dy * cm(1.1), sx + dx * cm(1.0), sy + dy * cm(1.7)); sp.quadraticCurveTo(sx + dx * cm(.6), sy + dy * cm(1.0), sx + dx * cm(.15), sy + dy * cm(2.1)); sp.lineTo(sx + dx * cm(.15), sy + dy * cm(.15)); sp.closePath();
                sp.moveTo(sx + dx * cm(.9), sy + dy * cm(.6)); sp.ellipse(sx + dx * cm(1.0), sy + dy * cm(.75), cm(.35), cm(.22), 0, 0, 6.29, dx * dy < 0); P(sp); });
            }
          });
          // the points: six from the far edge, six from the near edge
          const nP = 6, colW = iw / nP, sep = cm(.5);
          [[iy0, cy - DB / 2 - gap - NB - gap, 1], [iy1, cy + DB / 2 + gap + NB + gap, -1]].forEach(([edge, inner, dir]) => {
            const span = Math.abs(inner - edge), arc = cm(3.4), tipEnd = inner - dir * arc;   // the niche row next to the bands
            // separators: narrow bands of the frame's marquetry between the columns (stringing and slivers of pearl)
            for (let k = 0; k <= nP; k++) { const sx = ix0 + k * colW, sx0 = sx - sep / 2;
              g.fillStyle = '#e6dccb'; g.fillRect(sx0, Math.min(edge, tipEnd), cm(.05), Math.abs(tipEnd - edge)); g.fillRect(sx0 + sep - cm(.05), Math.min(edge, tipEnd), cm(.05), Math.abs(tipEnd - edge));
              if (k > 0 && k < nP) { const nd = new Path2D(), nl = Math.abs(tipEnd - edge) * .78, e1 = edge + dir * cm(.3); nd.moveTo(sx - cm(.16), e1); nd.lineTo(sx + cm(.16), e1); nd.lineTo(sx, e1 + dir * nl); nd.closePath(); P(nd, .015); }
            }
            for (let k = 0; k < nP; k++) {
              const cx = ix0 + (k + .5) * colW, half = colW * .24;
              // the point: a short cap at the edge, then a long tapering triangle (widest at the edge) running to the niche
              const tr = new Path2D(), Lp = Math.abs(tipEnd - edge) - cm(.3), e0 = edge + dir * cm(.2), bw2 = colW * .3;
              tr.moveTo(cx - bw2 * .55, e0); tr.lineTo(cx + bw2 * .55, e0); tr.lineTo(cx + bw2 * .55, e0 + dir * cm(.75)); tr.lineTo(cx + bw2 * .35, e0 + dir * cm(.95));
              tr.lineTo(cx + bw2, e0 + dir * cm(1.15)); tr.quadraticCurveTo(cx + bw2 * .7, e0 + dir * Lp * .55, cx, e0 + dir * Lp); tr.quadraticCurveTo(cx - bw2 * .7, e0 + dir * Lp * .55, cx - bw2, e0 + dir * cm(1.15));
              tr.lineTo(cx - bw2 * .35, e0 + dir * cm(.95)); tr.lineTo(cx - bw2 * .55, e0 + dir * cm(.75)); tr.closePath();
              P(tr);
              // the joins of the pieces the cypress is made of
              g.strokeStyle = 'rgba(60,40,30,.45)'; g.lineWidth = 1; [.18, .42, .66].forEach(f => { const yy = e0 + dir * Lp * f; g.beginPath(); g.moveTo(cx - half, yy + dir * cm(.2)); g.lineTo(cx + half, yy - dir * cm(.1)); g.stroke(); });
              // the niche over the tip: a U of two bands with outward hooks, its lowest point near the bands; the pendant inside it
              const a0 = ix0 + k * colW, a1 = a0 + colW, top0 = tipEnd + dir * cm(.1), bot0 = inner - dir * cm(.25);
              const ni = new Path2D(), tw = cm(.42);
              ni.moveTo(a0 - cm(.25), top0); ni.quadraticCurveTo(a0 + cm(.15), top0 + dir * cm(.35), a0 + cm(.2), top0 + dir * cm(.9));
              ni.quadraticCurveTo(a0 + cm(.25), bot0 - dir * cm(.5), cx, bot0); ni.quadraticCurveTo(a1 - cm(.25), bot0 - dir * cm(.5), a1 - cm(.2), top0 + dir * cm(.9)); ni.quadraticCurveTo(a1 - cm(.15), top0 + dir * cm(.35), a1 + cm(.25), top0);
              ni.lineTo(a1 + cm(.05), top0 + dir * cm(.25)); ni.quadraticCurveTo(a1 - cm(.45), top0 + dir * cm(.55), a1 - cm(.48), top0 + dir * cm(1.0));
              ni.quadraticCurveTo(a1 - cm(.55), bot0 - dir * (tw + cm(.5)), cx, bot0 - dir * tw * 1.3); ni.quadraticCurveTo(a0 + cm(.55), bot0 - dir * (tw + cm(.5)), a0 + cm(.48), top0 + dir * cm(1.0)); ni.quadraticCurveTo(a0 + cm(.45), top0 + dir * cm(.55), a0 - cm(.05), top0 + dir * cm(.25)); ni.closePath(); P(ni);
              // the pendant: a cusped drop on a stem from the cypress tip, pierced in the middle
              const st0 = tipEnd - dir * cm(.2), pH = Math.abs(bot0 - st0) * .85, pd = new Path2D(), pw2 = half * 1.25;
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
      const face = (map, mask) => K.mat({ map, color: '#ffffff', roughness: .26, metalness: .05, clearcoat: .85, clearcoatRoughness: .12, iridescence: .85, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], iridescenceMap: mask });
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
      [bgMat, chessMat].forEach(m => { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1; });
      const top = new TT.Mesh(new TT.PlaneGeometry(W, D), bgMat); top.rotation.x = -Math.PI / 2; top.position.y = TH + .03; G.add(top);
      const bot = new TT.Mesh(new TT.PlaneGeometry(W, D), chessMat); bot.rotation.x = Math.PI / 2; bot.position.y = -.03; G.add(bot);
      [-1, 1].forEach(sd => {   // the two leaves, left and right of the hinge
        const cx = sd * LW / 2;
        const leaf = new TT.Mesh(new TT.BoxGeometry(LW - .08, TH, D), wood); leaf.position.set(cx + sd * .04, TH / 2, 0); G.add(leaf);
        // raised framing fillets (about 5 mm): far, near and outer sides 1.2 cm wide, the hinge side 1.5 cm
        const fil = (w, d, x, z, m) => { const f = new TT.Mesh(new TT.BoxGeometry(w, .5, d), [wood, wood, m, wood, wood, wood]); f.position.set(x, TH + .25, z); G.add(f); };
        fil(LW, FW, cx, -D / 2 + FW / 2, plaqMat(LW, false)); fil(LW, FW, cx, D / 2 - FW / 2, plaqMat(LW, false));
        fil(FW, D - 2 * FW, sd * (W / 2 - FW / 2), 0, plaqMat(D, true)); fil(HG, D - 2 * FW, sd * HG / 2, 0, hingeMat);
        // the bone lip on the three outer edges (half-round, in interlocking lengths)
        const lip = (len, x, z, ry) => { const c = new TT.Mesh(new TT.CylinderGeometry(.42, .42, len, 12, 1, false, 0, Math.PI), bone); c.rotation.set(0, ry, Math.PI / 2); c.position.set(x, TH / 2, z); G.add(c); };
        lip(LW, cx, -D / 2, 0); lip(LW, cx, D / 2, 0); lip(D, sd * W / 2, 0, Math.PI / 2);
      });
      // the two staple hinges under the join
      [-D / 4, D / 4].forEach(z => { const h = new TT.Mesh(new TT.BoxGeometry(1.4, .12, 2.2), K.mat({ color: '#9a8a6a', roughness: .4, metalness: .9 })); h.position.set(0, -.09, z); G.add(h); });
      return G;
    },
  };
})();
