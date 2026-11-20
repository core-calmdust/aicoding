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
      const W = 56.5, D = 56.3, LD = D / 2, TH = 1.2, PX = innerWidth < 820 ? 1024 : 1536;   // width, depth open, a leaf's depth, its thickness
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
        g.fillStyle = 'rgba(20,8,2,.85)'; g.fillRect(0, h / 2 - .06 * S, w, .12 * S);   // the hinge line between the leaves
        chessMask = new TT.CanvasTexture(mk); chessMask.colorSpace = TT.NoColorSpace;
      });
      /* ---------- the inside: backgammon ---------- */
      let bgMask;
      const FW = 1.2, HG = 1.5;   // outer fillet width, hinge-side fillet width (cm)
      const bgT = K.tex(PX, Math.round(PX * D / W), (g, w, h) => {
        const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const m = mk.getContext('2d'); m.fillStyle = '#000'; m.fillRect(0, 0, w, h); m.fillStyle = '#fff';
        shell(g, 0, 0, w, h, false);
        // each leaf holds one table (the hinge runs across the middle, along x)
        [[FW, FW, W - 2 * FW, LD - FW - HG], [FW, LD + HG, W - 2 * FW, LD - FW - HG]].forEach(([x0, y0, tw, td], ti) => {
          const X0 = x0 * S, Y0 = y0 * S, TW = tw * S, TD = td * S;
          // the central cross band and the narrower bands beside it
          const cx = X0 + TW / 2, band = 4.4 * S, nb = 1.6 * S;
          pearl(g, cx - band / 2, Y0, band, TD, false); m.fillRect(cx - band / 2, Y0, band, TD);
          // fretted central motif (four quarters) and spandrels, with green-stained bone
          g.save(); g.translate(cx, Y0 + TD / 2); g.fillStyle = '#6a3a18';
          for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(band * .5, -band * .1, band * .32, -band * .55); g.quadraticCurveTo(band * .1, -band * .3, 0, 0); g.fill(); }
          g.fillStyle = '#4f8a5a'; g.beginPath(); g.arc(0, 0, band * .12, 0, 6.29); g.fill(); g.restore();
          [-1, 1].forEach(sd => { const bx = cx + sd * (band / 2 + .5 * S) - (sd < 0 ? nb : 0); pearl(g, bx, Y0, nb, TD, false); m.fillRect(bx, Y0, nb, TD);
            for (let k = 0; k < 6; k++) { const yy = Y0 + (k + .5) * TD / 6; g.fillStyle = '#7a3c14'; g.beginPath(); g.ellipse(bx + nb / 2, yy, nb * .26, nb * .5, .5, 0, 6.29); g.fill(); } });
          // six cypress points at the top and the bottom of each half of the table (left and right of the band)
          const halfW = (TW - band) / 2 - nb - 1.2 * S, PL = TD * .42;
          [[X0 + .4 * S, 0], [cx + band / 2 + nb + .8 * S, 1]].forEach(([hx]) => {
            const pw = halfW / 6;
            for (let k = 0; k < 6; k++) for (const top of [true, false]) {
              const px = hx + k * pw, yb = top ? Y0 : Y0 + TD, dir = top ? 1 : -1;
              // the niche: an arch springing between neighbours, a triangle below, tear drops of green bone
              g.strokeStyle = '#efe7e0'; g.lineWidth = .16 * S; g.beginPath(); g.moveTo(px, yb + dir * PL * 1.06); g.quadraticCurveTo(px + pw / 2, yb + dir * PL * 1.28, px + pw, yb + dir * PL * 1.06); g.stroke();
              m.strokeStyle = '#fff'; m.lineWidth = .16 * S; m.beginPath(); m.moveTo(px, yb + dir * PL * 1.06); m.quadraticCurveTo(px + pw / 2, yb + dir * PL * 1.28, px + pw, yb + dir * PL * 1.06); m.stroke();
              g.fillStyle = '#4f8a5a'; g.beginPath(); g.ellipse(px + pw / 2, yb + dir * PL * 1.12, pw * .08, pw * .14, 0, 0, 6.29); g.fill();
              // the cypress: a tall flame shape with a short trunk
              const tree = new Path2D(); const tx = px + pw / 2, tw2 = pw * .38;
              tree.moveTo(tx - pw * .06, yb); tree.lineTo(tx - pw * .06, yb + dir * PL * .12); tree.quadraticCurveTo(tx - tw2, yb + dir * PL * .3, tx - tw2 * .7, yb + dir * PL * .62); tree.quadraticCurveTo(tx - tw2 * .3, yb + dir * PL * .9, tx, yb + dir * PL);
              tree.quadraticCurveTo(tx + tw2 * .3, yb + dir * PL * .9, tx + tw2 * .7, yb + dir * PL * .62); tree.quadraticCurveTo(tx + tw2, yb + dir * PL * .3, tx + pw * .06, yb + dir * PL * .12); tree.lineTo(tx + pw * .06, yb); tree.closePath();
              g.save(); g.clip(tree); pearl(g, tx - tw2 - 2, Math.min(yb, yb + dir * PL) - 2, tw2 * 2 + 4, PL + 4, false); g.restore(); m.fill(tree);
              g.strokeStyle = 'rgba(70,40,20,.5)'; g.lineWidth = 1; g.stroke(tree);
            }
          });
          void ti;
        });
        g.fillStyle = 'rgba(20,8,2,.85)'; g.fillRect(0, h / 2 - .06 * S, w, .12 * S);
        bgMask = new TT.CanvasTexture(mk); bgMask.colorSpace = TT.NoColorSpace;
      });
      // materials: shell / pearl in one picture; the pearl areas get a thin-film iridescence (mask)
      const face = (map, mask) => K.mat({ map, color: '#ffffff', roughness: .26, metalness: .05, clearcoat: .85, clearcoatRoughness: .12, iridescence: .85, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 520], iridescenceMap: mask });
      const chessMat = face(chessT, chessMask), bgMat = face(bgT, bgMask);
      const edgeT = K.tex(512, 64, (g, w, h) => { g.fillStyle = '#e8dcbc'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(90,70,40,.5)'; g.lineWidth = 2; for (let x = 0; x < w; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, h / 2); g.lineTo(x, h); g.stroke(); } }, { rep: [12, 1] });
      const bone = K.mat({ map: edgeT, color: '#ffffff', roughness: .45, clearcoat: .3 });
      const plaqT = K.tex(1024, 32, (g, w, h) => { g.fillStyle = '#5a2a0e'; g.fillRect(0, 0, w, h); for (let x = 0, k = 0; x < w; x += 64, k++) { if (k % 2) { g.fillStyle = '#ddd8d6'; g.beginPath(); g.moveTo(x + 4, h / 2); g.lineTo(x + 14, 3); g.lineTo(x + 50, 3); g.lineTo(x + 60, h / 2); g.lineTo(x + 50, h - 3); g.lineTo(x + 14, h - 3); g.closePath(); g.fill(); } else { g.fillStyle = '#b8682a'; g.fillRect(x + 2, 3, 60, h - 6); } } }, { rep: [6, 1] });
      const plaqV = (() => { const t = plaqT.clone(); t.needsUpdate = true; t.rotation = Math.PI / 2; t.center.set(.5, .5); t.repeat.set(3, 1); return K.mat({ map: t, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .15 }); })();
      const plaq = K.mat({ map: plaqT, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .15, iridescence: .5, iridescenceIOR: 1.6 });
      const wood = K.mat({ color: '#3a1d10', roughness: .5, clearcoat: .4 });
      // the two faces as one picture each across the open board (both leaves lie flat): a plane just above / below the leaves
      const top = new TT.Mesh(new TT.PlaneGeometry(W, D), bgMat); top.rotation.x = -Math.PI / 2; top.position.y = TH + .03; G.add(top);
      const bot = new TT.Mesh(new TT.PlaneGeometry(W, D), chessMat); bot.rotation.x = Math.PI / 2; bot.position.y = -.03; G.add(bot);
      [true, false].forEach(top => {
        const z = top ? -LD / 2 : LD / 2;
        const leaf = new TT.Mesh(new TT.BoxGeometry(W, TH, LD - .08), wood); leaf.position.set(0, TH / 2, z + (top ? -.04 : .04)); G.add(leaf);
        // raised framing fillets on the inside: outer three sides and the hinge side, tops of alternating plaques
        const fil = (w, d, x, zz) => { const f = new TT.Mesh(new TT.BoxGeometry(w, .5, d), [wood, wood, d > w ? plaqV : plaq, wood, wood, wood]); f.position.set(x, TH + .25, zz); G.add(f); };
        const zo = top ? -LD : LD, zh = 0;
        fil(W, FW, 0, zo - Math.sign(zo) * FW / 2); fil(FW, LD, -W / 2 + FW / 2, z); fil(FW, LD, W / 2 - FW / 2, z); fil(W, HG, 0, zh + Math.sign(zo) * HG / 2);
        // the bone lip along the three outer edges (half-round)
        const lip = (len, x, zz, ry) => { const c = new TT.Mesh(new TT.CylinderGeometry(.42, .42, len, 12, 1, false, 0, Math.PI), bone); c.rotation.set(0, ry, Math.PI / 2); c.position.set(x, TH / 2, zz); G.add(c); };
        lip(W, 0, zo, 0); lip(LD, -W / 2, z, Math.PI / 2); lip(LD, W / 2, z, Math.PI / 2);
      });
      // the two staple hinges
      [-W / 4, W / 4].forEach(x => { const h = new TT.Mesh(new TT.BoxGeometry(2.2, .12, 1.4), K.mat({ color: '#9a8a6a', roughness: .4, metalness: .9 })); h.position.set(x, -.09, 0); G.add(h); });
      return G;
    },
  };
})();
