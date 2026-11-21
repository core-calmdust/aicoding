/* 所蔵品：バリンダリーのゲーム盤（アイルランド国立博物館 NMI 1932:6533） — units: 1 = 1 cm.
   Yew; found in 1932 at Ballinderry crannóg No. 1 (Co. Westmeath); 10th century. About 24 cm square.
   2026-11-22: rebuilt from the museum's photograph of the board seen from above (nothing invented): measured on it —
   the frame 2.3 cm wide, in three carved panels to a side with a joint between them; the sunk panel with 7 × 7 holes about 2.65 cm
   apart, two rings round the centre hole and a quarter-circle across each corner; the wood split from end to end about a third of the
   way across, the split pale and splintered; the grain running the way the heads point; on one edge a long oval human head on a
   tapering neck (brow, round eyes, long nose, mouth; hair combed back at the sides), on the opposite edge a small plain knob.
   Built in the photograph's own coordinates (x to the right, z downward, the head at the top), then turned so the head is at −x.
   The carving of the frame and everything on the sunk panel are that photograph itself: straightened to a square (the four corners of the
   board found on it), then turned into maps of light and dark that the drawn yew is multiplied by and embossed with. The head's colour and fine relief
   are the photograph too, and its features are placed by measuring them on it. Estimate: the thickness (2.4, the panel sunk 1.4). */
(function () {
  'use strict';
  // the frame's carving, off the same photograph (1536 × 592: four rows, a side each): red = how light or dark (128 = even), green = how warm
  // (the rubbed high parts), blue = the same as red but smoothed (the height the surface is pushed up by)
  // the sunk panel, off the same photograph (1024², everything inside the frame): red = how light or dark the wood is there (128 = the
  // usual tone: the grain, the stains, the incised rings, the split), green = pale splintered wood, blue = the holes, alpha = the fine
  // relief only (128 = level)
  // the 49 holes as they are on the photograph (hand-bored, not quite in line): cm from the panel's centre, x to the right, z downward, row by row
  const HOLES = [[-7.64,-7.79],[-5.13,-7.82],[-2.54,-7.88],[0.06,-7.62],[2.81,-7.83],[5.53,-7.81],[7.72,-8.11],[-7.37,-5.62],[-5.04,-5.68],[-2.52,-5.6],[0.02,-5.28],[2.93,-5.7],[5.68,-5.69],[8.09,-5.75],[-7.48,-2.36],[-5.02,-2.46],[-2.35,-2.56],[0.2,-2.7],[2.75,-2.47],[5.57,-2.56],[8.11,-2.51],[-7.62,0.09],[-5.01,0.38],[-2.48,0.41],[0.01,0.15],[2.87,-0.01],[5.38,-0.07],[8.01,-0.1],[-7.62,2.75],[-5.1,2.96],[-2.18,3.08],[0.09,2.8],[3.27,2.69],[5.8,2.57],[7.97,2.64],[-7.55,5.51],[-5.25,5.55],[-2.59,5.47],[0.13,5.36],[3.34,5.48],[5.57,5.4],[8.07,5.1],[-7.58,7.98],[-5.16,8.07],[-2.59,8.14],[0.26,7.92],[3.02,7.98],[5.59,7.99],[8.19,8.05]];
  const HERE = (document.currentScript && document.currentScript.src) || location.href; let WEAR = null, FRAME = null, HEAD = null;
  (window.AtlasEx = window.AtlasEx || {}).ballinderry = {
    ready: () => { const get = (f, set) => new Promise(res => { const im = new Image(); im.onload = () => { set(im); res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/' + f, HERE).href; setTimeout(res, 8000); });
      return Promise.all([get('ballinderry-panel.webp?v=3', im => { WEAR = im; }), get('ballinderry-frame.webp?v=1', im => { FRAME = im; }), get('ballinderry-head.webp?v=4', im => { HEAD = im; })]); },
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
      // ---- the carved top of the frame, off the photograph: one row to a side (clockwise from the head's side, the outer edge upward),
      // the whole length of the board, so the mitred corners and the joints between the panels come with it
      const wood = K.mat({ map: frameMap, color: '#ffffff', roughness: .62 });
      const FPX = 1536, FPH = 148, FIN = FW / S;
      let frameM = wood;
      if (FRAME) { const pc = document.createElement('canvas'); pc.width = FPX; pc.height = FPH * 4; const pg = pc.getContext('2d'); pg.drawImage(FRAME, 0, 0, FPX, FPH * 4); const fd = pg.getImageData(0, 0, FPX, FPH * 4).data;
        const map = K.tex(FPX, FPH * 4, (g, w, h) => {
          for (let k = 0; k < 4; k++) for (let i = 0; i < 3; i++) { g.save();   // the yew under it: one piece of wood, the grain running the way the head points — across the two ends, along the two sides
            if (k % 2 === 0) { g.translate(i * 512 + (i % 2 ? 512 : 0), k * FPH); g.scale(i % 2 ? -1 : 1, 1); g.drawImage(frameMap.image, 0, k * 190, 1024, FPH * 2, 0, 0, 512, FPH); }
            else { g.translate(i * 512 + (i % 2 ? 512 : 0), k * FPH + FPH); g.scale(i % 2 ? -1 : 1, 1); g.rotate(-Math.PI / 2); g.drawImage(frameMap.image, k * 150, 0, FPH * 2, 1024, 0, 0, FPH, 512); }
            g.restore(); }
          const im = g.getImageData(0, 0, w, h), d = im.data;
          for (let i = 0; i < d.length; i += 4) { const lv = fd[i] / 128, k = Math.max(.3, Math.min(2.1, 1 + (lv - 1) * 1.15)), t = Math.max(0, Math.min(1, (lv - 1.1) / .8)) * .34 * (fd[i + 1] / 255 + .4);
            for (let q = 0; q < 3; q++) { const v = d[i + q] * k * 1.12; d[i + q] = v + ([176, 130, 88][q] - v) * t; } }   // rubbed pale and warm on the high parts
          g.putImageData(im, 0, 0); });
        const chan = q => K.tex(FPX, FPH * 4, (g, w, h) => { const im = g.createImageData(w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = fd[i + q]; d[i + 3] = 255; } g.putImageData(im, 0, 0); }, { data: true });
        frameM = K.mat({ map, bumpMap: chan(0), bumpScale: 2.2, displacementMap: chan(2), displacementScale: DP, color: '#ffffff', roughness: .55 }); }
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; Pg.add(o); return o; };
      const strip = (k, len, x, z, ry) => { const o = add(new TT.BoxGeometry(len - .02, T1 - DP - .04, FW - .02), wood, x, (T1 - DP - .04) / 2, z); o.rotation.y = ry;   // (a hair smaller than the carved top and its neighbours: faces in one plane flicker)
        const tg = new TT.PlaneGeometry(len, FW, Math.round(len / .1), 22); tg.rotateX(-Math.PI / 2); const uv = tg.attributes.uv, part = len < S;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, part ? FIN + uv.getX(i) * (1 - FIN * 2) : uv.getX(i), (3 - k + uv.getY(i)) / 4);   // its own row of the photograph
        const t = add(tg, frameM, x, T1 - DP, z); t.rotation.y = ry; };
      strip(0, S, 0, -(S / 2 - FW / 2), 0); strip(2, S, 0, S / 2 - FW / 2, Math.PI); strip(1, IN, S / 2 - FW / 2, 0, -Math.PI / 2); strip(3, IN, -(S / 2 - FW / 2), 0, Math.PI / 2);
      // ---- the sunk panel, in the photograph's coordinates (u to the right, v downward)
      const PX = 1024, cm = v => v / IN * PX, CX = cm(7.7 - FW);   // the split: about a third of the way across from the left
      const crack = []; { let x = CX + 6; for (let y = 0; y <= PX; y += 22) { x += (rnd() - .5) * 9 + (y > PX * .3 && y < PX * .62 ? -.9 : .5); crack.push([x, y]); } }
      const hole = (i, j) => [PX / 2 + (i - 3) * cm(P), PX / 2 + (j - 3) * cm(P)];
      let wd = null; if (WEAR) { const c = document.createElement('canvas'); c.width = c.height = PX; const q = c.getContext('2d'); q.drawImage(WEAR, 0, 0, PX, PX); wd = q.getImageData(0, 0, PX, PX).data; }
      const drawWorn = (g, bump) => { if (!bump) g.drawImage(panelMap.image, 0, 0, PX, PX); else { g.fillStyle = '#808080'; g.fillRect(0, 0, PX, PX); } const im = g.getImageData(0, 0, PX, PX), d = im.data;
        for (let i = 0; i < d.length; i += 4) { const w = wd[i] / 128, pale = wd[i + 1] / 255, hole = wd[i + 2] / 255;
          if (bump) d[i] = d[i + 1] = d[i + 2] = wd[i + 3] * (1 - hole);
          else { const k = Math.pow(Math.max(.25, Math.min(2.6, w)), 1.2); let c = [d[i] * k * 1.2, d[i + 1] * k * 1.08, d[i + 2] * k * .98]; c = c.map((v, q) => v + ([206, 168, 108][q] - v) * pale); const dk = 1 - hole * .96; d[i] = c[0] * dk; d[i + 1] = c[1] * dk; d[i + 2] = c[2] * dk; } }
        g.putImageData(im, 0, 0); };
      const drawPanel = (g, bump) => { if (wd) return drawWorn(g, bump); if (bump) { g.fillStyle = '#909090'; g.fillRect(0, 0, PX, PX); } else g.drawImage(panelMap.image, 0, 0, PX, PX);
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
      const panel = K.mat({ map: K.tex(PX, PX, g => drawPanel(g, false)), bumpMap: K.tex(PX, PX, g => drawPanel(g, true), { data: true }), bumpScale: wd ? 2.2 : 5, color: '#ffffff', roughness: .5 });
      add(new TT.BoxGeometry(IN + .3, T0, IN + .3), [wood, wood, panel, wood, wood, wood], 0, T0 / 2 - .01, 0);
      // ---- the human head (the photograph): carved in one with the board, lying flat, the face upward
      // its colour is the photograph itself (images/atlas/ex/ballinderry-head.webp: the head cut out of it, 5.4 × 7.6 cm, the crown at the top) —
      // the hair combed in fine strokes down the sides, the brow and cheeks rubbed pale — and the same picture, with its broad light and
      // dark taken out, raises the fine relief. The features are placed where they are on it: brow 6.05, eyes 5.65, nostrils 4.3, mouth
      // 3.45 cm above the neck's foot; the head 4.3 wide, the neck short.
      let headTex = frameMap.image, headFine = null;
      if (HEAD) { const hw = HEAD.width, hh = HEAD.height, c = document.createElement('canvas'); c.width = hw; c.height = hh; const q = c.getContext('2d'); q.drawImage(HEAD, 0, 0); const im = q.getImageData(0, 0, hw, hh), d = im.data;
        const f = document.createElement('canvas'); f.width = hw; f.height = hh; const fq = f.getContext('2d'); fq.filter = 'blur(14px)'; fq.drawImage(HEAD, 0, 0); fq.filter = 'none'; const lo = fq.getImageData(0, 0, hw, hh).data, fi = fq.createImageData(hw, hh), fd = fi.data;
        for (let k = 0; k < d.length; k += 4) { const L = .3 * d[k] + .59 * d[k + 1] + .11 * d[k + 2], Lo = .3 * lo[k] + .59 * lo[k + 1] + .11 * lo[k + 2], v = Math.max(0, Math.min(255, 128 + (L - Lo) * 1.6)); fd[k] = fd[k + 1] = fd[k + 2] = v; fd[k + 3] = 255;
          d[k] = Math.min(255, d[k] * .66); d[k + 1] = Math.min(255, d[k + 1] * .54); d[k + 2] = Math.min(255, d[k + 2] * .44); }   // (toned to sit with the frame beside it)
        q.putImageData(im, 0, 0); fq.putImageData(fi, 0, 0); headTex = c; headFine = f; }
      const I = K.ink, hs = K.relief({ w: 5.4, h: 7.6, px: 320, depth: 1.25, round: .9, relief: HEAD ? .34 : .55, nx: 48, soft: HEAD ? 3 : 4, tex: headTex, dirt: [10, 7, 5], dirtK: HEAD ? .25 : .85, bump: 1.8, mat: { roughness: .42, color: '#ffffff' },
        mask(g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-1.05, -.4); g.lineTo(-1.0, 1.5); g.bezierCurveTo(-1.15, 2.4, -2.15, 3.2, -2.15, 4.9); g.bezierCurveTo(-2.15, 6.4, -1.3, 7.15, 0, 7.15); g.bezierCurveTo(1.3, 7.15, 2.15, 6.4, 2.15, 4.9); g.bezierCurveTo(2.15, 3.2, 1.15, 2.4, 1.0, 1.5); g.lineTo(1.05, -.4); g.closePath(); g.fill(); },
        thick(g) { g.fillStyle = '#9a9a9a'; g.fillRect(-1.6, -.5, 3.2, 2.0); },
        front(g) {   // (y runs from the neck, 0, to the crown: the chin is toward the board)
          if (headFine) { g.save(); g.scale(1, -1); g.globalAlpha = .16; g.drawImage(headFine, -2.7, -7.6, 5.4, 7.6); g.restore(); }
          I.area(g, [[-1.25, 2.9], [-1.5, 4.9], [-1.2, 6.2], [0, 6.55], [1.2, 6.2], [1.5, 4.9], [1.25, 2.9], [0, 2.3]], .14);   // the face, standing out a little from the hair
          I.blob(g, -.68, 6.08, .66, .3, .5); I.blob(g, .68, 6.08, .66, .3, .5);                                              // the brow
          [-1, 1].forEach(sx => { I.blob(g, sx * .72, 5.62, .52, .42, -.45); I.blob(g, sx * .72, 5.65, .35, .28, 1.2); });     // round bulging eyes under it
          I.blob(g, 0, 5.2, .2, .95, .9); I.blob(g, 0, 4.65, .28, .6, .7); I.blob(g, 0, 4.3, .46, .3, 1.0);                     // the long nose, wider at the nostrils
          I.blob(g, 0, 3.45, .86, .6, .6); I.blob(g, 0, 3.68, .58, .17, .5); I.blob(g, 0, 3.22, .52, .17, .45); I.line(g, [[-.44, 3.45], [0, 3.42], [.44, 3.45]], .09, -1.1);   // the mouth pushed forward, the lips parted
          if (!headFine) [-1, 1].forEach(sx => { for (let k = 0; k < 4; k++) I.line(g, [[sx * (1.45 + k * .2), 2.6 + k * .2], [sx * (1.7 + k * .13), 4.6], [sx * (1.1 + k * .12), 6.3 + k * .15]], .07, -.5); }); } });
      hs.rotation.x = -Math.PI / 2; hs.position.set(0, T1 * .5, -S / 2 + .3); Pg.add(hs);
      // ---- the knob on the opposite edge: a short neck and a plain ball
      const knobM = K.mat({ map: frameMap, color: '#d8d8d8', roughness: .4 });
      const nk = add(new TT.CylinderGeometry(.62, .75, 1.3, 18), knobM, 0, T1 * .5, S / 2 + .55); nk.rotation.x = Math.PI / 2;
      const ball = add(new TT.SphereGeometry(1.35, 28, 18), knobM, 0, T1 * .5, S / 2 + 2.2); ball.scale.set(1, .82, 1);
      G.userData.holes = HOLES.map(([u, v]) => [v, -u]);   // (for play: in the model's own axes — the head at −x)
      return G;
    },
  };
})();
