/* 所蔵品：バリンダリーのゲーム盤（アイルランド国立博物館 NMI 1932:6533） — units: 1 = 1 cm.
   Yew; found in 1932 at Ballinderry crannóg No. 1 (Co. Westmeath), broken in two; 10th century. About 9½ in. (24 cm) square
   (the 1932 report); a dark panel with 7 × 7 peg holes, the centre and corner holes marked off with arcs; a raised frame of
   eight carved panels — plain five- and six-strand interlace, Borre-style ring-chain at two opposite corners, a "vertebral"
   pattern and a key pattern (NMI; 1932 report); a rough human head projecting from one edge, a smaller animal head from the
   opposite edge (handles). Estimates: the thickness and frame height (after a published replica: 2.5 cm, the frame raised
   1.5 cm), the hole pitch, which panel sits where, the drawing of each pattern, the line of the break and the heads' features.
   2026-11-21: colour, the marks on the panel (two rings at the centre, quarter-circles across the corners), the small holes and the
   worn relief checked against the Discovery Programme / NMI 3D scan (Sketchfab). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).ballinderry = {
    build(TT, X, K) {
      const G = new TT.Group();
      const S = 24, FW = 3.1, T0 = 1.0, T1 = 2.5, IN = S - FW * 2, P = 2.35, DP = .26;   // DP: how deep the frame's carving is cut
      // ---- yew: warm orange-brown, darkened by a thousand years in the bog; the heartwood streaks
      const yew = (seed, dark) => K.tex(1024, 1024, (g, w, h) => {
        K.grain(g, w, h, { a: dark ? '#5e5038' : '#66573c', b: dark ? '#493c29' : '#4c3f2b', seed, sx: 1, sy: 44, warp: .22, pores: .003 });   // grey-brown, as in the 3D scan
        const n = K.noise(seed + 5), img = g.getImageData(0, 0, w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 160, y / 160, 4), k = .82 + a * .3, i = (y * w + x) * 4; d[i] *= k; d[i + 1] *= k * .97; d[i + 2] *= k * .94; }
        g.putImageData(img, 0, 0);
      });
      const frameMap = yew(31, false), panelMap = yew(47, true);
      // ---- the carving of one frame side: two panels, each its own pattern; white = the raised strands (bump), the cut-back ground darker
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
      };
      // which pattern in which panel (two per side; ring-chain at two opposite corners) — estimate
      const SIDES = [['ring', 'plait5'], ['spine', 'key'], ['ring', 'plait6'], ['key', 'spine']];
      const sideMat = (pair, k) => {
        const W = 1024, H = 136, bc = document.createElement('canvas'); bc.width = W; bc.height = H; const b = bc.getContext('2d');
        b.fillStyle = '#000'; b.fillRect(0, 0, W, H); b.strokeStyle = b.fillStyle = '#fff'; b.lineCap = b.lineJoin = 'round';
        const m = 10, half = (W - m * 3) / 2;
        b.lineWidth = 7; b.strokeRect(4, 4, W - 8, H - 8); b.beginPath(); b.moveTo(W / 2, 4); b.lineTo(W / 2, H - 4); b.stroke();
        pair.forEach((p, i) => { const x = m + i * (half + m), y = 16, w = half, h = H - 32;
          b.save(); b.beginPath(); b.rect(x, y, w, h); b.clip();
          if (p === 'plait5') PAT.plait(b, x, y, w, h, 5); else if (p === 'plait6') PAT.plait(b, x, y, w, h, 6); else PAT[p](b, x, y, w, h);
          b.restore(); });
        // a thousand years of wear: the relief softened, chips in places
        b.filter = 'blur(3px)'; b.drawImage(bc, 0, 0); b.filter = 'none';
        b.fillStyle = 'rgba(0,0,0,.45)'; for (let q = 0; q < 60; q++) { b.beginPath(); b.ellipse(Math.random() * W, Math.random() * H, 4 + Math.random() * 16, 3 + Math.random() * 7, Math.random() * 3, 0, 6.29); b.fill(); }
        const map = K.tex(W, H, (g, w, h) => {
          g.drawImage(frameMap.image, 0, k * 200, 1024, 136, 0, 0, w, h);
          const mk = document.createElement('canvas'); mk.width = w; mk.height = h; const mg = mk.getContext('2d');
          mg.fillStyle = '#6e665a'; mg.fillRect(0, 0, w, h); mg.globalAlpha = .45; mg.globalCompositeOperation = 'lighter'; mg.drawImage(bc, 0, 0); mg.globalAlpha = 1;
          g.globalCompositeOperation = 'multiply'; g.drawImage(mk, 0, 0); g.globalCompositeOperation = 'source-over';
        });
        const bump = new TT.CanvasTexture(bc); bump.colorSpace = TT.NoColorSpace;
        // the carving is real relief: the top is a fine grid pushed up by the same picture (its outer edge held down, to meet the block below)
        const dc = document.createElement('canvas'); dc.width = W; dc.height = H; const dg = dc.getContext('2d'); dg.drawImage(bc, 0, 0); dg.strokeStyle = '#000'; dg.lineWidth = 6; dg.strokeRect(0, 0, W, H);
        const disp = new TT.CanvasTexture(dc); disp.colorSpace = TT.NoColorSpace;
        return K.mat({ map, bumpMap: bump, bumpScale: 2.2, displacementMap: disp, displacementScale: DP, color: '#b09a84', roughness: .66 });
      };
      const wood = K.mat({ map: frameMap, color: '#b09a84', roughness: .68 });
      // ---- the playing panel: dark, 49 holes, arcs round the centre and corner holes, the crack across it
      const PX = 1024, crack = [];
      { let x = 0, y = PX * .56; crack.push([x, y]); while (x < PX) { x += 18 + Math.random() * 30; y += (Math.random() - .5) * 26; crack.push([x, y]); } }
      const hole = (i, j) => [PX / 2 + (i - 3) * P / IN * PX, PX / 2 + (j - 3) * P / IN * PX];
      const drawPanel = (g, bump) => {
        if (bump) { g.fillStyle = '#909090'; g.fillRect(0, 0, PX, PX); } else g.drawImage(panelMap.image, 0, 0, PX, PX);
        const r = .2 / IN * PX, ink = bump ? '#000' : 'rgba(14,10,6,.85)', cut = bump ? '#303030' : 'rgba(22,16,10,.6)';
        // incised arcs: a ring round the centre hole, and an arc round each corner hole
        g.strokeStyle = cut; g.lineWidth = 3.5;
        // (after the 3D scan: two rings round the centre hole; at each corner a quarter-circle across the corner, centred on the panel's corner)
        const [cx, cy] = hole(3, 3), R = P * .62 / IN * PX; g.beginPath(); g.arc(cx, cy, R, 0, 6.29); g.stroke(); g.beginPath(); g.arc(cx, cy, R * .7, 0, 6.29); g.stroke();
        const RQ = P * 1.45 / IN * PX; [[0, 0, 0], [PX, 0, 1], [PX, PX, 2], [0, PX, 3]].forEach(([x, y, q]) => { g.beginPath(); g.arc(x, y, RQ, q * Math.PI / 2, q * Math.PI / 2 + Math.PI / 2); g.stroke(); });
        for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const [x, y] = hole(i, j); g.fillStyle = ink; g.beginPath(); g.arc(x, y, r, 0, 6.29); g.fill();
          if (!bump) { g.strokeStyle = 'rgba(150,130,100,.3)'; g.lineWidth = 2; g.beginPath(); g.arc(x - 1, y - 1, r + 1.5, Math.PI, Math.PI * 1.6); g.stroke(); } }
        // the break (the board was found in two pieces)
        g.strokeStyle = bump ? '#000' : 'rgba(8,4,2,.9)'; g.lineWidth = bump ? 7 : 4; g.beginPath(); crack.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      };
      const pMap = K.tex(PX, PX, g => drawPanel(g, false)), pBump = K.tex(PX, PX, g => drawPanel(g, true), { data: true });
      const panel = K.mat({ map: pMap, bumpMap: pBump, bumpScale: 3.5, color: '#948270', roughness: .7 });
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
      add(new TT.BoxGeometry(IN, T0, IN), [wood, wood, panel, wood, wood, wood], 0, T0 / 2, 0);
      // the four frame sides (mitred look: the top textures meet at the corners); each top carries two carved panels
      const fs = (k, w, x, z, ry) => { const m = sideMat(SIDES[k], k), o = add(new TT.BoxGeometry(w, T1 - DP, FW), wood, x, (T1 - DP) / 2, z); o.rotation.y = ry;
        const tg = new TT.PlaneGeometry(w, FW, Math.round(w / .16), 19); tg.rotateX(-Math.PI / 2); const t = add(tg, m, x, T1 - DP, z); t.rotation.y = ry; };
      fs(0, S, 0, -(S / 2 - FW / 2), 0); fs(2, S, 0, S / 2 - FW / 2, Math.PI); fs(1, S - FW * 2, S / 2 - FW / 2, 0, -Math.PI / 2); fs(3, S - FW * 2, -(S / 2 - FW / 2), 0, Math.PI / 2);
      // ---- the heads (handles), each carved in one with the board and lying flat, the face upward (after the 3D scan: on the west edge a
      // large flattened oval on a short neck — the human head; on the east a smaller rounded head on a narrow neck — the animal)
      const I = K.ink, knob = K.tex(256, 256, (g, w, h) => { const n = K.noise(77), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 30, y / 30, 4), r = n(x / 6, y / 60, 2), k = .78 + a * .32 + (r - .5) * .14, i = (y * w + x) * 4;
          d[i] = 84 * k; d[i + 1] = 71 * k; d[i + 2] = 50 * k; d[i + 3] = 255; } g.putImageData(img, 0, 0); });
      const head = (o, x, ry) => { const r = K.relief(Object.assign({ px: 256, round: .7, relief: .22, nx: 30, tex: knob.image, dirt: [34, 24, 14], dirtK: .7, bump: 1.6, mat: { roughness: .68, color: '#b09a84' } }, o));
        r.rotation.x = -Math.PI / 2; const h = new TT.Group(); h.add(r); h.rotation.y = ry; h.position.set(x, 1.2, 0); G.add(h); };
      head({ w: 4.4, h: 6.4, depth: 1.05,
        mask(g) { g.fillStyle = '#fff'; g.fillRect(-.95, -.5, 1.9, 2.4); g.beginPath(); g.ellipse(0, 3.7, 1.75, 2.3, 0, 0, 6.29); g.fill(); },
        thick(g) { g.fillStyle = '#b0b0b0'; g.fillRect(-1.2, -.5, 2.4, 1.6); },
        front(g) {   // worn features: a brow, round eye hollows, a ridge of nose, a slit mouth, the beard and hair combed in lines
          I.line(g, [[-1.1, 4.25], [0, 4.45], [1.1, 4.25]], .5, .7); [-1, 1].forEach(sx => { I.blob(g, sx * .62, 3.85, .36, .26, -.9); I.blob(g, sx * .62, 3.85, .14, .1, .5); });
          I.line(g, [[0, 4.2], [0, 3.6], [0, 3.15]], .42, .9); I.blob(g, 0, 3.1, .34, .22, .5);
          I.line(g, [[-.5, 2.62], [0, 2.56], [.5, 2.62]], .16, -1);
          for (let k = -4; k <= 4; k++) I.line(g, [[k * .2, 2.4], [k * .23, 1.95], [k * .2, 1.6]], .08, -.6);
          for (let k = -5; k <= 5; k++) I.line(g, [[k * .25, 4.95], [k * .26, 5.3], [k * .23, 5.6]], .07, -.4);
        } }, -S / 2 - .45, Math.PI / 2);
      head({ w: 3.6, h: 4.8, depth: .95,
        mask(g) { g.fillStyle = '#fff'; g.fillRect(-.55, -.5, 1.1, 2.0); g.beginPath(); g.ellipse(0, 2.75, 1.4, 1.55, 0, 0, 6.29); g.fill(); },
        thick(g) { g.fillStyle = '#909090'; g.fillRect(-.9, -.5, 1.8, 1.4); },
        front(g) {   // an animal's head, the snout outward: eyes to the sides, nostrils at the tip, small ears back by the neck
          [-1, 1].forEach(sx => { I.blob(g, sx * .7, 2.75, .26, .22, -.9); I.blob(g, sx * .7, 2.75, .1, .08, .5); I.blob(g, sx * .78, 1.75, .3, .22, .7, sx * .5); I.blob(g, sx * .22, 3.95, .1, .08, -.8);
            I.line(g, [[sx * .3, 3.3], [sx * .75, 3.5], [sx * 1.1, 3.2]], .1, -.5); });
          I.line(g, [[0, 2.3], [0, 3.2], [0, 3.9]], .5, .5);
        } }, S / 2 + .45, -Math.PI / 2);
      return G;
    },
  };
})();
