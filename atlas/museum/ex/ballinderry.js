/* 所蔵品：バリンダリーのゲーム盤（アイルランド国立博物館 NMI 1932:6533） — units: 1 = 1 cm.
   Yew; found in 1932 at Ballinderry crannóg No. 1 (Co. Westmeath); 10th century. About 24 cm square.
   2026-11-22: rebuilt from the museum's photograph of the board seen from above (nothing invented): measured on it —
   the frame 2.3 cm wide, in three carved panels to a side with a joint between them; the sunk panel with 7 × 7 holes about 2.65 cm
   apart, two rings round the centre hole and a quarter-circle across each corner; the wood split from end to end about a third of the
   way across, the split pale and splintered; the grain running the way the heads point; on one edge a long oval human head on a
   tapering neck (brow, round eyes, long nose, mouth; hair combed back at the sides), on the opposite edge a small plain knob.
   Built in the photograph's own coordinates (x to the right, z downward, the head at the top), then turned so the head is at −x.
   Estimates: the thickness (2.4, the panel sunk 1.4) and the exact drawing inside each carved panel. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).ballinderry = {
    build(TT, X, K) {
      const G = new TT.Group(), Pg = new TT.Group(); Pg.rotation.y = Math.PI / 2; G.add(Pg);
      const S = 24, FW = 2.3, T0 = 1.0, T1 = 2.4, IN = S - FW * 2, P = 2.65, DP = .3;
      let sd = 1932; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      // yew, nearly black-brown with a warmer brown where it is worn; grain along the canvas's height
      const yew = (seed, lite) => K.tex(1024, 1024, (g, w, h) => { const n = K.noise(seed), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const wv = n(x / 300, y / 500, 3) * 60, ln = .5 + .5 * Math.sin((x + wv + n(x / 40, y / 400, 2) * 26) / 3.1), big = n(x / 120, y / 420, 3), f = n(x / 3, y / 40, 2), i = (y * w + x) * 4;
          const k = (lite ? .62 : .4) + ln * (lite ? .2 : .1) + big * .3 + (f - .5) * .12; d[i] = 56 * k; d[i + 1] = 39 * k; d[i + 2] = 25 * k; d[i + 3] = 255; }
        g.putImageData(img, 0, 0); });
      const frameMap = yew(31, true), panelMap = yew(47, false);
      const PAT = {
        // a plait of n strands: diagonal ribbons crossing over and under
        plait(g, x0, y0, w, h, n) {
          const sp = h * 2 / n, lw = sp * .36; g.lineWidth = lw;
          const N = Math.ceil((w + h) / sp) + 2, lines = [];
          for (let i = -2; i < N; i++) { const x = x0 + i * sp; lines.push(['\\', i, x - h, y0, x, y0 + h], ['/', i, x, y0 + h, x + h, y0]); }
          lines.forEach(([, , ax, ay, bx, by]) => { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); });
          // the crossings: under-strand cut away, over-strand redrawn — alternating, so every strand goes over, under, over …
          for (let i = -2; i < N; i++) for (let j = -2; j < N; j++) {
            const xi = x0 + i * sp - h, aj = x0 + j * sp, d = (aj - xi) / 2; if (d < 0 || d > h) continue;
            const cx = xi + d, cy = y0 + d; if (cx < x0 - sp || cx > x0 + w + sp) continue;
            const back = (i + j) % 2 === 0, u = back ? [1, 1] : [1, -1], L = lw * 1.25 / Math.SQRT2;
            g.save(); g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, lw * .95, 0, 6.29); g.fill(); g.restore();
            g.beginPath(); g.moveTo(cx - u[0] * L, cy - u[1] * L); g.lineTo(cx + u[0] * L, cy + u[1] * L); g.stroke(); }
        },
        // Borre ring-chain: a row of rings, each crossed by two diagonals that link to the next (the "ring-chain" of the Borre style)
        ring(g, x0, y0, w, h) {
          const r = h * .26, step = h * .95, cy = y0 + h / 2; g.lineWidth = h * .11;
          for (let x = x0 + step / 2; x < x0 + w; x += step) { g.beginPath(); g.arc(x, cy, r, 0, 6.29); g.stroke();
            g.beginPath(); g.moveTo(x - step / 2, y0 + h * .12); g.lineTo(x + step / 2, y0 + h * .88); g.moveTo(x - step / 2, y0 + h * .88); g.lineTo(x + step / 2, y0 + h * .12); g.stroke();
            g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, cy, r - g.lineWidth * .6, 0, 6.29); g.fill(); g.restore();
            g.beginPath(); g.arc(x, cy, r * .32, 0, 6.29); g.fill(); }
        },
        // the "vertebral" pattern: a spine of linked segments with ribs either side
        spine(g, x0, y0, w, h) {
          const cy = y0 + h / 2, step = h * .7; g.lineWidth = h * .1;
          g.beginPath(); g.moveTo(x0, cy); g.lineTo(x0 + w, cy); g.stroke();
          for (let x = x0 + step / 2; x < x0 + w; x += step) { g.beginPath(); g.ellipse(x, cy, step * .32, h * .2, 0, 0, 6.29); g.stroke();
            g.beginPath(); g.moveTo(x - step * .25, y0 + h * .12); g.quadraticCurveTo(x, cy - h * .12, x + step * .25, y0 + h * .12); g.moveTo(x - step * .25, y0 + h * .88); g.quadraticCurveTo(x, cy + h * .12, x + step * .25, y0 + h * .88); g.stroke(); }
        },
        // a key (fret) pattern: interlocking stepped spirals
        key(g, x0, y0, w, h) {
          const u = h / 6, step = u * 6; g.lineWidth = u * .9; g.lineCap = 'butt'; g.lineJoin = 'miter';
          for (let x = x0; x < x0 + w; x += step) { g.beginPath(); g.moveTo(x, y0 + u * 5); g.lineTo(x, y0 + u); g.lineTo(x + u * 4, y0 + u); g.lineTo(x + u * 4, y0 + u * 3.6); g.lineTo(x + u * 2, y0 + u * 3.6); g.stroke();
            g.beginPath(); g.moveTo(x + u * 6, y0 + u); g.lineTo(x + u * 6, y0 + u * 5); g.lineTo(x + u * 2, y0 + u * 5); g.stroke(); }
          g.lineCap = 'round'; g.lineJoin = 'round';
        },
        // a fret of nested triangles pointing alternately up and down (the long middle panels of the two sides)
        tri(g, x0, y0, w, h) { const st = h * 1.15; g.lineWidth = h * .09; g.lineJoin = 'miter';
          for (let x = x0, k = 0; x < x0 + w; x += st / 2, k++) { const up = k % 2; [1, .58, .22].forEach(q => { const a = st / 2 * q, t = h * .84 * q, by = up ? y0 + h * .08 : y0 + h * .92, d = up ? 1 : -1; g.beginPath(); g.moveTo(x + st / 4 - a / 2, by); g.lineTo(x + st / 4, by + d * t); g.lineTo(x + st / 4 + a / 2, by); g.stroke(); }); }
          g.lineJoin = 'round'; },
        // a plain ground with one small knot in the middle (the middle panel on the head's side)
        knot1(g, x0, y0, w, h) { const cx = x0 + w / 2; g.save(); g.beginPath(); g.rect(cx - h * 1.5, y0, h * 3, h); g.clip(); PAT.plait(g, cx - h * 1.5, y0 + h * .12, h * 3, h * .76, 3); g.restore(); },
      };

      // the frame: three panels to a side (the photograph, clockwise from the head's side): fine plait · plain with one knot · bold steps /
      // thick plait · triangles · fine plait / fine plait · ring-chain · bold steps / fine plait · triangles · fine plait
      const SIDES = [[['plait', 6, .31], ['knot1', 0, .36], ['plait', 3, .33]], [['plait', 3, .3], ['tri', 0, .4], ['plait', 5, .3]], [['plait', 5, .31], ['ring', 0, .36], ['plait', 3, .33]], [['plait', 5, .3], ['tri', 0, .4], ['plait', 6, .3]]];
      const wood = K.mat({ map: frameMap, color: '#ffffff', roughness: .62 });
      const sideMat = (panels, k, len) => { const W = 1024, H = Math.round(1024 * FW / len), bc = document.createElement('canvas'); bc.width = W; bc.height = H; const b = bc.getContext('2d');
        b.fillStyle = '#000'; b.fillRect(0, 0, W, H); b.strokeStyle = b.fillStyle = '#fff'; b.lineCap = b.lineJoin = 'round';
        let x = 0; panels.forEach(([kind, n, fr]) => { const pw = fr * W, m = H * .09; b.lineWidth = H * .07; b.strokeRect(x + m, m, pw - 2 * m, H - 2 * m);   // each panel in its own raised border, a joint between
          const ix = x + m * 2.2, iy = m * 2.2, iw = pw - m * 4.4, ih = H - m * 4.4; b.save(); b.beginPath(); b.rect(ix, iy, iw, ih); b.clip(); if (kind === 'knot1') { b.fillStyle = '#8a8a8a'; b.fillRect(ix, iy, iw, ih); b.fillStyle = '#fff'; } if (kind === 'plait') PAT.plait(b, ix, iy, iw, ih, n); else PAT[kind](b, ix, iy, iw, ih); b.restore(); x += pw; });
        b.filter = 'blur(2.5px)'; b.drawImage(bc, 0, 0); b.filter = 'none';   // a thousand years of wear
        b.fillStyle = 'rgba(0,0,0,.4)'; for (let q = 0; q < 40; q++) { b.beginPath(); b.ellipse(rnd() * W, rnd() * H, 4 + rnd() * 14, 3 + rnd() * 6, rnd() * 3, 0, 6.29); b.fill(); }
        const map = K.tex(W, H, (g, w, h) => { g.save(); g.translate(0, h); g.rotate(-Math.PI / 2); g.drawImage(frameMap.image, k * 190, 0, Math.max(8, 1024 * H / W), 1024, 0, 0, h, w); g.restore();   // the grain along the strip
          const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const mg = mk.getContext('2d'); mg.fillStyle = '#4a4a4a'; mg.fillRect(0, 0, w, h); mg.globalAlpha = .7; mg.globalCompositeOperation = 'lighter'; mg.drawImage(bc, 0, 0); mg.globalAlpha = 1;
          g.globalCompositeOperation = 'multiply'; g.drawImage(mk, 0, 0); g.globalCompositeOperation = 'source-over'; });
        const dc = document.createElement('canvas'); dc.width = W; dc.height = H; const dg = dc.getContext('2d'); dg.drawImage(bc, 0, 0); dg.strokeStyle = '#000'; dg.lineWidth = 5; dg.strokeRect(0, 0, W, H);
        const disp = new TT.CanvasTexture(dc); disp.colorSpace = TT.NoColorSpace; const bump = new TT.CanvasTexture(bc); bump.colorSpace = TT.NoColorSpace;
        return K.mat({ map, bumpMap: bump, bumpScale: 2, displacementMap: disp, displacementScale: DP, color: '#ffffff', roughness: .58 }); };
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; Pg.add(o); return o; };
      const strip = (k, len, x, z, ry) => { const o = add(new TT.BoxGeometry(len - .02, T1 - DP - .04, FW - .02), wood, x, (T1 - DP - .04) / 2, z); o.rotation.y = ry;   // (a hair smaller than the carved top and its neighbours: faces in one plane flicker)
        const tg = new TT.PlaneGeometry(len, FW, Math.round(len / .14), 16); tg.rotateX(-Math.PI / 2); const t = add(tg, sideMat(SIDES[k], k, len), x, T1 - DP, z); t.rotation.y = ry; };
      strip(0, S, 0, -(S / 2 - FW / 2), 0); strip(2, S, 0, S / 2 - FW / 2, Math.PI); strip(1, IN, S / 2 - FW / 2, 0, -Math.PI / 2); strip(3, IN, -(S / 2 - FW / 2), 0, Math.PI / 2);
      // ---- the sunk panel, in the photograph's coordinates (u to the right, v downward)
      const PX = 1024, cm = v => v / IN * PX, CX = cm(7.7 - FW);   // the split: about a third of the way across from the left
      const crack = []; { let x = CX + 6; for (let y = 0; y <= PX; y += 22) { x += (rnd() - .5) * 9 + (y > PX * .3 && y < PX * .62 ? -.9 : .5); crack.push([x, y]); } }
      const hole = (i, j) => [PX / 2 + (i - 3) * cm(P), PX / 2 + (j - 3) * cm(P)];
      const drawPanel = (g, bump) => { if (bump) { g.fillStyle = '#909090'; g.fillRect(0, 0, PX, PX); } else g.drawImage(panelMap.image, 0, 0, PX, PX);
        const cut = bump ? '#3a3a3a' : 'rgba(150,120,84,.5)'; g.strokeStyle = cut; g.lineWidth = bump ? 4 : 2.6; g.lineCap = 'round';
        const [cx, cy] = hole(3, 3); [1.5, 1.22].forEach(r => { g.beginPath(); g.arc(cx, cy, cm(r), 0, 6.29); g.stroke(); });   // two rings round the centre hole
        [[0, 0, 0], [PX, 0, 1], [PX, PX, 2], [0, PX, 3]].forEach(([x, y, q]) => { g.beginPath(); g.arc(x, y, cm(3.3), q * Math.PI / 2, q * Math.PI / 2 + Math.PI / 2); g.stroke(); });   // a quarter-circle across each corner
        // the split, pale where the wood has splintered
        const run = (dx, col, lw, a, b2) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); crack.forEach(([x, y], k) => { if (y < PX * a || y > PX * b2) return; g.lineTo(x + dx, y); }); g.stroke(); };
        if (bump) { g.fillStyle = '#9c9c9c'; g.beginPath(); crack.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineTo(0, PX); g.lineTo(0, 0); g.closePath(); g.fill(); run(0, '#000', 11, 0, 1); }
        else { run(-11, 'rgba(206,170,112,.55)', 13, .2, .78); run(8, 'rgba(190,150,96,.35)', 6, .3, .7); run(0, 'rgba(8,4,2,.95)', 7, 0, 1);
          g.strokeStyle = 'rgba(206,170,112,.45)'; g.lineWidth = 5; g.beginPath(); g.moveTo(CX - 8, PX * .66); g.lineTo(CX - 62, PX * .74); g.stroke(); }   // a splinter lifting to one side
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const [x, y] = hole(i, j), r = cm(.2) * (.9 + rnd() * .25); g.fillStyle = bump ? '#000' : 'rgba(6,4,3,.96)'; g.beginPath(); g.arc(x + (rnd() - .5) * 5, y + (rnd() - .5) * 5, r, 0, 6.29); g.fill();
          if (!bump) { g.strokeStyle = 'rgba(190,160,116,.4)'; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r + 1.6, 0, 6.29); g.stroke(); } } };
      const panel = K.mat({ map: K.tex(PX, PX, g => drawPanel(g, false)), bumpMap: K.tex(PX, PX, g => drawPanel(g, true), { data: true }), bumpScale: 5, color: '#ffffff', roughness: .5 });
      add(new TT.BoxGeometry(IN + .3, T0, IN + .3), [wood, wood, panel, wood, wood, wood], 0, T0 / 2 - .01, 0);
      // ---- the human head (the photograph): carved in one with the board, lying flat, the face upward
      const I = K.ink, hs = K.relief({ w: 5.4, h: 7.6, px: 320, depth: 1.25, round: .9, relief: .55, nx: 40, tex: panelMap.image, dirt: [10, 7, 5], dirtK: .7, bump: 1.8, mat: { roughness: .5, color: '#ffffff' },
        mask(g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-1.0, -.4); g.lineTo(-.95, 1.2); g.bezierCurveTo(-1.1, 2.2, -2.3, 2.9, -2.3, 4.7); g.bezierCurveTo(-2.3, 6.4, -1.3, 7.2, 0, 7.2); g.bezierCurveTo(1.3, 7.2, 2.3, 6.4, 2.3, 4.7); g.bezierCurveTo(2.3, 2.9, 1.1, 2.2, .95, 1.2); g.lineTo(1.0, -.4); g.closePath(); g.fill(); },
        thick(g) { g.fillStyle = '#9a9a9a'; g.fillRect(-1.6, -.5, 3.2, 2.2); },
        front(g) {   // (y runs from the neck, 0, to the crown: the chin is toward the board)
          I.area(g, [[-1.15, 2.3], [-1.3, 4.6], [-.95, 5.9], [0, 6.3], [.95, 5.9], [1.3, 4.6], [1.15, 2.3], [0, 1.75]], .16);   // the face, a long shield standing out from the hair
          I.line(g, [[-1.05, 5.3], [0, 5.5], [1.05, 5.3]], .42, .8);                                                         // brow
          [-1, 1].forEach(sx => { I.blob(g, sx * .58, 4.8, .46, .4, -.85); I.blob(g, sx * .58, 4.8, .26, .22, 1); });         // round eyes in hollows
          I.line(g, [[0, 5.3], [0, 4.2], [0, 3.5]], .44, 1.2); I.blob(g, 0, 3.45, .4, .26, .8);                                 // the long nose
          I.line(g, [[-.5, 2.95], [0, 2.9], [.5, 2.95]], .16, -1.2); I.line(g, [[-.45, 2.68], [0, 2.58], [.45, 2.68]], .22, .8); I.line(g, [[-.45, 3.15], [0, 3.2], [.45, 3.15]], .18, .6);   // mouth and lower lip
          [-1, 1].forEach(sx => { for (let k = 0; k < 4; k++) I.line(g, [[sx * (1.45 + k * .2), 2.6 + k * .2], [sx * (1.7 + k * .13), 4.6], [sx * (1.1 + k * .12), 6.3 + k * .15]], .07, -.5); }); } });   // hair combed back at the sides
      hs.rotation.x = -Math.PI / 2; hs.position.set(0, T1 * .5, -S / 2 + .3); Pg.add(hs);
      // ---- the knob on the opposite edge: a short neck and a plain ball
      const knobM = K.mat({ map: panelMap, color: '#ffffff', roughness: .45 });
      const nk = add(new TT.CylinderGeometry(.62, .75, 1.3, 18), knobM, 0, T1 * .5, S / 2 + .55); nk.rotation.x = Math.PI / 2;
      const ball = add(new TT.SphereGeometry(1.35, 28, 18), knobM, 0, T1 * .5, S / 2 + 2.2); ball.scale.set(1, .82, 1);
      return G;
    },
  };
})();
