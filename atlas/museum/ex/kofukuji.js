/* 所蔵品：興福寺旧境内出土の将棋駒（奈良県・橿原考古学研究所附属博物館） — units: 1 = 1 cm (piece sizes approximate).
   The 1992 find in the Kisshōin area: 玉将 3, 金将 4, 銀将 1, 桂馬 1, 歩兵 6 and one unreadable piece, from a layer dated by a
   scroll rod inscribed 天喜六年 (1058); with them the 酔象 found in the Kanzen'in area in 2013 (Nara Prefecture's record).
   Thin wooden pentagons cut by hand, the names written in ink on one face. Shown as they lie in a case, on linen. */
(function () {
  'use strict';
  const SET = [
    ['玉将', 3], ['金将', 4], ['銀将', 1], ['桂馬', 1], ['歩兵', 6], ['', 1], ['酔象', 1],
  ];
  // the brush font (the same as the portal's shogi pieces), loaded once
  let fontP = null;
  function font() {
    if (fontP) return fontP;
    if (!document.querySelector('link[href*="Yuji+Boku"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap'; document.head.appendChild(l); }
    fontP = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('120px "Yuji Boku"', '玉将金銀桂馬歩兵酔象'), new Promise(r => setTimeout(r, 2500))]).catch(() => {}) : Promise.resolve();
    return fontP;
  }
  font();
  (window.AtlasEx = window.AtlasEx || {}).kofukuji = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1058; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      // the linen the pieces lie on (a low covered board)
      const linT = K.tex(512, 512, (g, w, h) => { const n = K.noise(7); const img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const wv = (Math.sin(x * 1.6) * .5 + .5) * (Math.sin(y * 1.6 + 1.3) * .5 + .5), k = .82 + wv * .1 + (n(x / 40, y / 6) - .5) * .12, i = (y * w + x) * 4;
          d[i] = 150 * k; d[i + 1] = 140 * k; d[i + 2] = 124 * k; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [3, 3] });
      const linen = K.mat({ map: linT, color: '#ffffff', roughness: .95, sheen: .4, sheenRoughness: .8, sheenColor: K.lin('#fff6e4') });
      const BW = 26, BD = 15;
      const board = new TT.Mesh(new TT.BoxGeometry(BW, 1.2, BD), linen); board.position.y = .6; G.add(board);
      // one piece: an irregular hand-cut pentagon, extruded; its face carries the wood and the ink
      const pieces = []; SET.forEach(([nm, n]) => { for (let i = 0; i < n; i++) pieces.push(nm); });
      const make = (nm, k) => {
        const w = 2.3 + rnd() * .35, h = 2.75 + rnd() * .4 + (nm === '玉将' ? .2 : 0), sh = h * (.3 + rnd() * .05), j = () => (rnd() - .5) * .14;
        const S = new TT.Shape();
        S.moveTo(-w / 2 + j(), 0 + j() * .5); S.lineTo(w / 2 + j(), 0 + j() * .5); S.lineTo(w / 2 * .92 + j(), h - sh + j()); S.lineTo(0 + j(), h + j() * .6); S.lineTo(-w / 2 * .92 + j(), h - sh + j()); S.closePath();
        const geo = new TT.ExtrudeGeometry(S, { depth: .3 + rnd() * .06, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2 });
        // the face texture: weathered wood, darker at the worn edges, the name in ink (faded in places)
        const tone = .85 + rnd() * .3;
        const T = K.tex(256, 320, (g, W, H) => {
          K.grain(g, W, H, { a: '#6e5236', b: '#3a2816', seed: 30 + k, sx: 2, sy: 16, warp: .8 });
          g.fillStyle = `rgba(30,18,8,${.3 * tone})`; g.fillRect(0, 0, W, H);
          const gr = g.createRadialGradient(W / 2, H * .55, W * .2, W / 2, H * .55, W * .75); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,10,4,.45)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
          if (nm) {
            g.save(); g.fillStyle = 'rgba(10,6,3,.9)'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${Math.round(W * .36)}px "Yuji Boku","Yu Mincho","Hiragino Mincho ProN",serif`;
            g.fillText(nm[0], W / 2 + (rnd() - .5) * 8, H * .38); g.fillText(nm[1], W / 2 + (rnd() - .5) * 8, H * .66); g.restore();
            // worn ink: the wood shows through in patches (soft, half-transparent spots of the wood's colour over the strokes)
            for (let q = 0; q < 30; q++) { g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 4 + rnd() * 14, 2 + rnd() * 5, rnd() * 3, 0, 6.29); g.fillStyle = `rgba(${70 + rnd() * 30 | 0},${48 + rnd() * 20 | 0},${28 + rnd() * 14 | 0},${.25 + rnd() * .35})`; g.fill(); }
          }
        });
        T.repeat.set(1 / w, 1 / (h + .2)); T.offset.set(.5, .05);
        const face = K.mat({ map: T, color: '#ffffff', roughness: .85 });
        const side = K.mat({ color: '#2e1f12', roughness: .9 });
        const m = new TT.Mesh(geo, [face, side]); return { m, w, h };
      };
      // the layout of the case: kings and the drunk elephant at the back, golds / silver / knight, pawns in front
      const rows = [['玉将', '玉将', '玉将', '酔象', ''], ['金将', '金将', '金将', '金将', '銀将', '桂馬'], ['歩兵', '歩兵', '歩兵', '歩兵', '歩兵', '歩兵']];
      let k = 0;
      rows.forEach((row, ri) => {
        const z = -4.6 + ri * 4.3, n = row.length, gap = 3.55;
        row.forEach((nm, ci) => {
          const p = make(nm, k++), x = (ci - (n - 1) / 2) * gap + (rnd() - .5) * .3;
          p.m.rotation.x = -Math.PI / 2; p.m.rotation.z = (rnd() - .5) * .16;   // lying face up, the point away from the viewer
          p.m.position.set(x, 1.2, z + p.h / 2); G.add(p.m);
        });
      });
      return G;
    },
    ready: () => font(),
  };
})();
