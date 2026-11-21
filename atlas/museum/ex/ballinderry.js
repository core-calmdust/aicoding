/* 所蔵品：バリンダリーのゲーム盤（アイルランド国立博物館 NMI 1932:6533） — units: 1 = 1 cm.
   Yew; found in 1932 at Ballinderry crannóg No. 1 (Co. Westmeath); 10th century. About 24 cm square.
   2026-11-22: rebuilt from the museum's photograph of the board seen from above (nothing invented): measured on it —
   the frame 2.3 cm wide, in three carved panels to a side with a joint between them; the sunk panel with 7 × 7 holes about 2.65 cm
   apart, two rings round the centre hole and a quarter-circle across each corner; the wood split from end to end about a third of the
   way across, the split pale and splintered; the grain running the way the heads point; on one edge a long oval human head on a
   tapering neck (brow, round eyes, long nose, mouth; hair combed back at the sides), on the opposite edge a small plain knob.
   Built in the photograph's own coordinates (x to the right, z downward, the head at the top), then turned so the head is at −x.
   The carving of the frame and everything on the sunk panel are that photograph itself: straightened to a square (the four corners of the
   board found on it), then turned into maps of light and dark that the drawn yew is multiplied by and embossed with. The face is placed
   by measuring it (brow, eyes, nostrils, mouth). Estimate: the thickness (2.4, the panel sunk 1.4). */
(function () {
  'use strict';
  // the frame's carving, off the same photograph (1536 × 592: four rows, a side each): red = how light or dark (128 = even), green = how warm
  // (the rubbed high parts), blue = the same as red but smoothed (the height the surface is pushed up by)
  // the sunk panel, off the same photograph (1024², everything inside the frame): red = how light or dark the wood is there (128 = the
  // usual tone: the grain, the stains, the incised rings, the split), green = pale splintered wood, blue = the holes, alpha = the fine
  // relief only (128 = level)
  const HERE = (document.currentScript && document.currentScript.src) || location.href; let WEAR = null, FRAME = null;
  (window.AtlasEx = window.AtlasEx || {}).ballinderry = {
    ready: () => { const get = (f, set) => new Promise(res => { const im = new Image(); im.onload = () => { set(im); res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/' + f, HERE).href; setTimeout(res, 8000); });
      return Promise.all([get('ballinderry-panel.webp?v=3', im => { WEAR = im; }), get('ballinderry-frame.webp?v=1', im => { FRAME = im; })]); },
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
      const I = K.ink, hs = K.relief({ w: 5.4, h: 7.6, px: 320, depth: 1.25, round: .9, relief: .55, nx: 48, soft: 4, tex: frameMap.image, dirt: [10, 7, 5], dirtK: .85, bump: 1.8, mat: { roughness: .4, color: '#ffffff' },
        mask(g) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-1.0, -.4); g.lineTo(-.95, 1.2); g.bezierCurveTo(-1.1, 2.2, -2.3, 2.9, -2.3, 4.7); g.bezierCurveTo(-2.3, 6.4, -1.3, 7.2, 0, 7.2); g.bezierCurveTo(1.3, 7.2, 2.3, 6.4, 2.3, 4.7); g.bezierCurveTo(2.3, 2.9, 1.1, 2.2, .95, 1.2); g.lineTo(1.0, -.4); g.closePath(); g.fill(); },
        thick(g) { g.fillStyle = '#9a9a9a'; g.fillRect(-1.6, -.5, 3.2, 2.2); },
        front(g) {   // (y runs from the neck, 0, to the crown: the chin is toward the board)
          I.area(g, [[-1.1, 2.7], [-1.35, 4.8], [-1.05, 6.1], [0, 6.45], [1.05, 6.1], [1.35, 4.8], [1.1, 2.7], [0, 2.2]], .14);   // the face, standing out a little from the hair (measured on the photograph: brow 5.7, eyes 5.3, nostrils 4.0, mouth 3.15 above the neck's foot)
          I.blob(g, -.62, 5.78, .62, .3, .55); I.blob(g, .62, 5.78, .62, .3, .55);                                                         // the brow
          [-1, 1].forEach(sx => { I.blob(g, sx * .66, 5.28, .5, .4, -.45); I.blob(g, sx * .66, 5.3, .33, .27, 1.25); });       // round bulging eyes under it
          I.blob(g, 0, 5.0, .2, .95, .9); I.blob(g, 0, 4.45, .27, .6, .7); I.blob(g, 0, 4.1, .44, .3, 1.0);                                // the long nose, wider at the nostrils
          I.blob(g, 0, 3.15, .82, .58, .6); I.blob(g, 0, 3.38, .56, .17, .5); I.blob(g, 0, 2.93, .5, .17, .45); I.line(g, [[-.42, 3.15], [0, 3.12], [.42, 3.15]], .09, -1.1);   // the mouth pushed forward, the lips parted
          [-1, 1].forEach(sx => { for (let k = 0; k < 4; k++) I.line(g, [[sx * (1.45 + k * .2), 2.6 + k * .2], [sx * (1.7 + k * .13), 4.6], [sx * (1.1 + k * .12), 6.3 + k * .15]], .07, -.5); }); } });   // hair combed back at the sides
      hs.rotation.x = -Math.PI / 2; hs.position.set(0, T1 * .5, -S / 2 + .3); Pg.add(hs);
      // ---- the knob on the opposite edge: a short neck and a plain ball
      const knobM = K.mat({ map: frameMap, color: '#d8d8d8', roughness: .4 });
      const nk = add(new TT.CylinderGeometry(.62, .75, 1.3, 18), knobM, 0, T1 * .5, S / 2 + .55); nk.rotation.x = Math.PI / 2;
      const ball = add(new TT.SphereGeometry(1.35, 28, 18), knobM, 0, T1 * .5, S / 2 + 2.2); ball.scale.set(1, .82, 1);
      return G;
    },
  };
})();
