/* 所蔵品：興福寺旧境内出土の将棋駒・習書木簡・題箋軸（奈良県・橿原考古学研究所附属博物館、県指定文化財 31点） — units: 1 = 1 cm.
   Nara Prefecture's record (2022 designation): from the Kisshōin area (1992 dig, a well-like pit) 16 pieces — 玉将 3, 金将 4,
   銀将 1, 桂馬 1, 歩兵 6, one unreadable —, a practice tablet (習書木簡) written with 酔像 · 金将 · 歩 · 歩兵 · 歩兵兵, and a title-label
   scroll rod inscribed 天喜六年 (1058); from the Kanzen'in area (2013, a well and a pit) 12 pieces — 酔象 1, 桂馬 1, 歩兵 7,
   3 without names — and a scroll rod inscribed 承徳二年 (1098). The 酔象 is about 2.5 × 1.5 cm and 2 mm thick (press reports).
   Shown as in the museum's photograph: the 31 pieces laid out loosely on a dark cloth. Each piece's size and outline, how much of
   its ink survives, the size of the tablet and rods and the writing on them are drawn in the manner of the photograph (estimates).
   2026-11-21: colour, outline and ink checked against the Agency for Cultural Affairs' photograph (文化遺産オンライン 413142):
   warm tan wood, pieces about as wide as tall with low shoulders and a blunt top, heavy blurred ink filling the face. */
(function () {
  'use strict';
  let fontP = null;
  function font() {
    if (fontP) return fontP;
    fontP = new Promise(res => {
      const go = () => (document.fonts && document.fonts.load ? document.fonts.load('120px "Yuji Boku"', '玉将金銀桂馬歩兵酔象像天喜六年承徳二') : Promise.resolve()).catch(() => {}).then(res);
      let l = document.querySelector('link[href*="Yuji+Boku"]');
      if (l && l.sheet) return go();
      if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap'; document.head.appendChild(l); }
      l.addEventListener('load', go); l.addEventListener('error', res); setTimeout(res, 4000);
    });
    return fontP;
  }
  font();
  (window.AtlasEx = window.AtlasEx || {}).kofukuji = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1058; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      // the dark cloth of the photograph
      const clT = K.tex(512, 512, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 24 + n(x / 50, y / 50, 4) * 10 + (n(x / 2, y / 2, 1) - .5) * 6, i = (y * w + x) * 4; d[i] = v; d[i + 1] = v * .98; d[i + 2] = v * .97; d[i + 3] = 255; }
        g.putImageData(img, 0, 0); }, { rep: [2, 2] });
      const cloth = K.mat({ map: clT, color: '#ffffff', roughness: .97, sheen: .2, sheenRoughness: .9, sheenColor: K.lin('#5a5a5a') });
      const CW = 34, CD = 30;
      const base = new TT.Mesh(new TT.BoxGeometry(CW, .8, CD), cloth); base.position.y = .4; G.add(base);
      const font = '"Yuji Boku","Yu Mincho","Hiragino Mincho ProN",serif';
      // weathered wood, a thousand years in a waterlogged well: pale grey-beige, darker at the edges, streaked and stained
      const woodFace = (g, W, H, k, tone) => {   // (after the 2022 photograph of the pieces: pale yellow-brown wood, fine straight grain running the length of the piece, grey soiling)
        const n = K.noise(110 + k), img = g.createImageData(W, H), d = img.data, base = tone > .5 ? [178, 142, 86] : [164, 128, 76];
        const col = new Float32Array(W); { let x = 0; while (x < W) { const wd = 2 + ((n(x * .7, k, 1) * 3) | 0), dk = .1 + n(x * .31 + 9, k * 3, 1) * .3; for (let q = 0; q < wd && x < W; q++, x++) col[x] = q === 0 ? dk : q === 1 ? dk * .35 : 0; } }   // the grain: a dark line every few pixels
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const xs = Math.min(W - 1, Math.max(0, Math.round(x + (n(y / 70, x / 300 + k, 2) - .5) * 5))), e = Math.min(x, y, W - x, H - y) / W, a = n(x / 46, y / 60, 3), b = n(x / 7 + 3, y / 26, 2);
          const gr = col[xs] * (.6 + b * .8), soil = Math.max(0, a - .44) * 1.9 + Math.max(0, .1 - e) * 2.6, i = (y * W + x) * 4, k2 = (1 - gr) * (.94 + (b - .5) * .16);
          d[i] = base[0] * k2 * (1 - soil * .5); d[i + 1] = base[1] * k2 * (1 - soil * .52); d[i + 2] = base[2] * k2 * (1 - soil * .42); d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
      };
      const ink = (g, W, H, txt, keep) => {   // written large with a brush, two characters filling the face; the ink greyed, smeared and partly gone
        const ch = [...txt], nC = ch.length, fs = Math.min(W * .9, H * .9 / nC), y0 = H * .53 - (nC - 1) * fs * .48;
        g.save(); g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${Math.round(fs)}px ${font}`;
        [[7, .3], [2.4, .28 + keep * .5]].forEach(([bl, al]) => { g.filter = `blur(${bl}px)`; g.fillStyle = g.strokeStyle = `rgba(34,31,28,${al})`; g.lineWidth = fs * .05; g.lineJoin = 'round';
          ch.forEach((c, i) => { g.save(); g.translate(W / 2 + (rnd() - .5) * W * .06, y0 + i * fs * 1.0); g.rotate((rnd() - .5) * .1); g.scale(1.06, .96); g.fillText(c, 0, 0); g.strokeText(c, 0, 0); g.restore(); }); });
        g.filter = 'blur(4px)'; for (let q = 0; q < 5 + keep * 8; q++) { g.beginPath(); g.ellipse(W * (.2 + rnd() * .6), H * (.15 + rnd() * .7), 3 + rnd() * 9, 5 + rnd() * 16, (rnd() - .5) * .6, 0, 6.29); g.fillStyle = `rgba(34,31,28,${.12 + rnd() * .25})`; g.fill(); }   // smears
        g.restore();
        // worn along the grain: long thin streaks where the wood shows through
        for (let q = 0; q < 200 * (1.3 - keep); q++) { g.beginPath(); g.ellipse(rnd() * W, rnd() * H, .8 + rnd() * 2.6, 8 + rnd() * 34, 0, 0, 6.29); g.fillStyle = `rgba(${172 + rnd() * 20 | 0},${140 + rnd() * 18 | 0},${90 + rnd() * 14 | 0},${.25 + rnd() * .45})`; g.fill(); }
      };
      const mats = [];
      const pieceMat = (txt, k, w, h, keep) => {
        const W = 256, H = Math.round(256 * h / w), tone = rnd();
        const T = K.tex(W, H, g => { woodFace(g, W, H, k, tone); if (txt) ink(g, W, H, txt, keep); });
        T.repeat.set(1 / w, 1 / h); T.offset.set(.5, 0);
        const sideT = K.tex(64, 64, g => woodFace(g, 64, 64, k + 50, tone * .6));
        const m = [K.mat({ map: T, color: '#ffffff', roughness: .9 }), K.mat({ map: sideT, color: '#d8c4a0', roughness: .92 })]; mats.push(m); return m;
      };
      // one piece: an irregular, hand-cut pentagon, a little chipped
      const piece = (txt, k, w, h, t, keep) => {
        const j = () => (rnd() - .5) * .1, sh = h * (.08 + rnd() * .07), S = new TT.Shape();
        S.moveTo(-w / 2 + j(), j() * .4); S.lineTo(w / 2 + j(), j() * .4); S.lineTo(w / 2 * (.95 + rnd() * .04) + j(), h - sh + j());
        S.lineTo(j() * .6, h + j() * .4); S.lineTo(-w / 2 * (.95 + rnd() * .04) + j(), h - sh + j()); S.closePath();   // one shallow point at the head (the photograph)
        const geo = new TT.ExtrudeGeometry(S, { depth: t, bevelEnabled: true, bevelThickness: .03, bevelSize: .04, bevelSegments: 1 });
        const m = new TT.Mesh(geo, pieceMat(txt, k, w, h, keep)); m.castShadow = m.receiveShadow = true; return m;
      };
      // a flat tablet (習書木簡 / 題箋軸), written in ink
      const tablet = (w, h, t, k, draw, outline) => {
        const S = new TT.Shape(); outline(S, w, h);
        const geo = new TT.ExtrudeGeometry(S, { depth: t, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: 1 });
        const W = 512, H = Math.round(512 * h / w), tone = .3 + rnd() * .4;
        const T = K.tex(W, H, g => { woodFace(g, W, H, k, tone); draw(g, W, H); }); T.repeat.set(1 / w, 1 / h); T.offset.set(.5, 0);
        const m = new TT.Mesh(geo, [K.mat({ map: T, color: '#e4d2bc', roughness: .9 }), K.mat({ color: '#8a6a44', roughness: .92 })]); m.castShadow = m.receiveShadow = true; return m;
      };
      const lay = (m, x, z, rz, h) => { m.rotation.x = -Math.PI / 2; m.position.set(0, .8, h / 2); const o = new TT.Group(); o.add(m); o.position.set(x, 0, z); o.rotation.y = rz; G.add(o); return o; };   // face up, point away
      // ---- the practice tablet: broken, the names of pieces written over and over (酔像 · 金将 · 歩 · 歩兵 · 歩兵兵)
      const tb = tablet(10.5, 4.8, .5, 3, (g, W, H) => {
        g.fillStyle = 'rgba(20,12,6,.75)'; g.textAlign = 'center'; g.textBaseline = 'middle';
        const cols = ['酔像', '金将', '歩', '歩兵', '歩兵兵', '歩兵']; cols.forEach((c, i) => { const fs = H * .2; g.font = `${Math.round(fs)}px ${font}`; [...c].forEach((ch, j) => g.fillText(ch, W * (.1 + i * .155), H * .22 + j * fs * 1.05)); });
        for (let q = 0; q < 40; q++) { g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 6 + rnd() * 18, 3 + rnd() * 8, rnd() * 3, 0, 6.29); g.fillStyle = `rgba(150,130,100,${.3 + rnd() * .4})`; g.fill(); }
      }, (S, w, h) => { S.moveTo(-w / 2, 0); S.lineTo(w / 2 - .6, 0); S.lineTo(w / 2, .5); S.lineTo(w / 2 - .3, h * .55); S.lineTo(w / 2 - 1.1, h * .7); S.lineTo(w / 2 - .7, h); S.lineTo(-w / 2 + 1.6, h); S.lineTo(-w / 2 + 1.2, h * .8); S.lineTo(-w / 2, h * .74); S.closePath(); });
      lay(tb, 3.8, -12.2, .08, 4.8); const SP = {}; SP.tab = [3.8, 1.4, -9.8];
      // ---- the two title-label rods: a flat label (the dates) with the stub of the rod
      const rod = (txt, k) => tablet(1.9, 7.2, .45, k, (g, W, H) => { g.fillStyle = 'rgba(20,12,6,.72)'; g.textAlign = 'center'; g.textBaseline = 'middle'; const fs = W * .5; g.font = `${Math.round(fs)}px ${font}`; [...txt].forEach((ch, j) => g.fillText(ch, W / 2, H * .62 + j * fs * .95 - fs * 1.5)); },
        (S, w, h) => { S.moveTo(-w * .22, 0); S.lineTo(w * .22, 0); S.lineTo(w * .22, h * .42); S.lineTo(w / 2, h * .46); S.lineTo(w / 2, h); S.lineTo(-w / 2, h); S.lineTo(-w / 2, h * .46); S.lineTo(-w * .22, h * .42); S.closePath(); });
      lay(rod('天喜六年', 11), -12.6, -12.4, -.2, 7.2); SP.t1 = [-12.6, 1.4, -9.0];
      lay(rod('承徳二年', 12), 14.6, 6.2, .12, 7.2); SP.t2 = [14.6, 1.4, 9.6];
      // ---- the 28 pieces: the 1992 set (16) and the 2013 set (12)
      const SZ = { 玉将: [2.6, 2.8], 金将: [2.4, 2.6], 銀将: [2.4, 2.6], 桂馬: [2.3, 2.5], 歩兵: [2.1, 2.3], 酔象: [1.5, 2.5], '': [2.2, 2.4] };   // about as wide as tall (photographs)
      const list = [['玉将', 3], ['金将', 4], ['銀将', 1], ['桂馬', 1], ['歩兵', 6], ['', 1], ['酔象', 1], ['桂馬', 1], ['歩兵', 7], ['', 3]];
      const P = []; list.forEach(([n, c]) => { for (let i = 0; i < c; i++) P.push(n); });
      // loose rows, as laid out in the photograph (order shuffled a little)
      const rows = [5, 6, 6, 6, 5]; let k = 0;
      const order = [0, 3, 24, 1, 14, 9, 4, 22, 15, 10, 5, 17, 2, 6, 18, 11, 7, 23, 16, 20, 8, 12, 19, 25, 21, 13, 26, 27];
      rows.forEach((n, ri) => { const z = -6.6 + ri * 3.9;
        for (let c = 0; c < n; c++, k++) { const nm = P[order[k]], [w0, h0] = SZ[nm], s = .9 + rnd() * .18, w = w0 * s * (.86 + rnd() * .26), h = h0 * s, t = nm === '酔象' ? .2 : .3 + rnd() * .2;
          const keep = nm ? .25 + rnd() * .75 : 0;
          const m = piece(nm, k, w, h, t, keep), x = (c - (n - 1) / 2) * 4.2 + (rnd() - .5) * 1.1 + (ri % 2 ? .8 : -.4);
          const zz = z + (rnd() - .5) * .8; if (!SP[nm || 'none']) SP[nm || 'none'] = [x, 1.3, zz + h * .5];
          lay(m, x, zz, (rnd() - .5) * .5 + (rnd() < .2 ? Math.PI * (rnd() - .5) * .6 : 0), h); } });
      // the numbered details: a king, a gold, the drunk elephant, a pawn, an unmarked piece, the practice tablet, the two dated rods
      G.userData.spots = [SP['玉将'], SP['金将'], SP['酔象'], SP['歩兵'], SP.none, SP.tab, SP.t1, SP.t2];
      return G;
    },
    ready: () => font(),
  };
})();
