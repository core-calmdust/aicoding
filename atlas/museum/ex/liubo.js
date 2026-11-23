/* =====================================================================
   六博の盤と駒 — Liubo board and pieces (The Metropolitan Museum of Art 1994.285a–m; China, Han dynasty, 1st century BCE – 1st century CE).
   Earthenware with pigment, and bone; 36.2 × 31.4 × 5.1 cm (the museum's record; its survey gives the board 37.0 × 31.8). 1 = 1 cm.

   A slab of grey earthenware on four feet, made for a tomb: the lines of the game — the square in the middle, the T at each of its sides, the L at the
   middle of each edge, the V at each corner — are cut in as grooves and painted red. Twelve bone blocks are the pieces, six a side.
   The top is the museum's photograph (Open Access, public domain) straightened (atlas/museum/tools/liubo-top.py): liubo-top.webp, and the grooves'
   depth from their red paint, liubo-top-b.webp. The slab's thickness (about 1.4) and the feet (about 3.3 × 3 × 3.7, set in about 5 from the front)
   are read off that one photograph — the back and the underside are not shown, and are estimated to match.
   ===================================================================== */
(function () {
  'use strict';
  const HERE = (document.currentScript && document.currentScript.src) || location.href, IMG = {};
  const W = 37, D = 31.4, H = 5.1, TH = 1.4;
  (window.AtlasEx = window.AtlasEx || {}).liubo = {
    ready: () => { const get = (k, f) => new Promise(res => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/' + f, HERE).href; setTimeout(res, 9000); });
      return Promise.all([get('top', 'liubo-top.webp?v=1'), get('bump', 'liubo-top-b.webp?v=1')]); },
    build(TT, X, K) {
      const G = new TT.Group(), owned = [];
      const tex = (k, data) => { const t = new TT.Texture(IMG[k]); t.colorSpace = data ? TT.NoColorSpace : TT.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; owned.push(t); return t; };
      // fired clay, grey-brown, with the darker specks and the pale earth still on it (the colours of the photograph's front face)
      const speck = (g, w, h, base, n, cols) => { g.fillStyle = base; g.fillRect(0, 0, w, h); let sd = 7; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 60; i++) { const x = R() * w, y = R() * h, r = 30 + R() * 90, q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, cols[i % 2] + '55'); q.addColorStop(1, cols[i % 2] + '00'); g.fillStyle = q; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
        for (let i = 0; i < n; i++) { g.fillStyle = R() < .6 ? 'rgba(52,40,30,' + (.25 + R() * .4) + ')' : 'rgba(226,214,196,' + (.2 + R() * .35) + ')'; const r = .5 + R() * R() * 2.6; g.beginPath(); g.arc(R() * w, R() * h, r, 0, 6.29); g.fill(); } };
      const clayT = K.tex(512, 512, (g, w, h) => speck(g, w, h, '#857868', 2600, ['#6a5e50', '#a09482']));
      const clay = K.mat({ map: clayT, bumpMap: clayT, bumpScale: .4, color: '#ffffff', roughness: .96 });
      const top = K.mat({ map: IMG.top ? tex('top') : clayT, bumpMap: IMG.bump ? tex('bump', true) : null, bumpScale: 1.6, color: '#b0b3b1', roughness: .95 });   // (the photograph is lit already: toned down so the case's lamp does not bleach it)
      const sh = m => { m.castShadow = m.receiveShadow = true; return m; };
      // the slab: a box with softened arrises (a 2-step bevel), the photograph on top — 5 faces × few quads
      const slab = sh(new TT.Mesh(new TT.BoxGeometry(W, TH, D), [clay, clay, top, clay, clay, clay])); slab.position.y = H - TH / 2; G.add(slab);
      // four feet (wedge blocks, a little narrower at the floor)
      const fg = new TT.CylinderGeometry(2.33, 2.0, H - TH, 4, 1); fg.rotateY(Math.PI / 4); fg.scale(1, 1, .9);
      [[-11.05, 9.2], [11.15, 9.2], [-11.05, -9.2], [11.15, -9.2]].forEach(([x, z]) => { const f = sh(new TT.Mesh(fg, clay)); f.position.set(x, (H - TH) / 2, z); G.add(f); });
      // the twelve bone pieces (2.5 × 1.3 × 1.5), laid out in front as on the photograph: six and six
      // (old bone: yellowed, stained brown in patches, as on the photograph)
      const boneT = (base, st) => K.tex(128, 128, (g, w, h) => speck(g, w, h, base, 260, [st, '#e6dac4']));
      const BM = [K.mat({ map: boneT('#c9b796', '#8a6a44'), color: '#ffffff', roughness: .75 }), K.mat({ map: boneT('#d6c8ac', '#9a7c58'), color: '#ffffff', roughness: .75 }), K.mat({ map: boneT('#b8a27e', '#7a5a38'), color: '#ffffff', roughness: .75 })];
      const pg = new TT.BoxGeometry(2.54, 1.27, 1.52), pieces = [];
      for (let s = 0; s < 2; s++) for (let i = 0; i < 6; i++) { const p = sh(new TT.Mesh(pg, BM[(i * 2 + s) % 3])); p.position.set((s ? 1 : -1) * (7.2 - (i % 2) * 4.6) + (s ? 0 : 0), .635, D / 2 + 4.2 + Math.floor(i / 2) * 2.5); p.rotation.y = ((i * 7 + s * 3) % 5 - 2) * .03; G.add(p); pieces.push(p); }
      G.userData.play = { hide: pieces };
      G.userData.dispose = () => owned.forEach(t => t.dispose());
      for (const k in IMG) delete IMG[k];
      return G;
    },
  };
})();
