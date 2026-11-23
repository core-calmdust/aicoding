/* =====================================================================
   チェスとガチョウのゲーム盤 — Chess and goose game board (The Metropolitan Museum of Art 62.14; Gujarat, late 16th century).
   Ebony and ebonized wood inlaid with ivory, horn (green and red-brown) and gold wire; 2.9 × 41.9 × 43 cm (the museum's record). 1 = 1 cm.

   A flat board with a game on each face: the Game of the Goose (63 spaces in a spiral — perhaps the oldest goose board there is) and chess.
   Both faces are the museum's own frontal photographs (Open Access, public domain), straightened and cut to the board
   (atlas/museum/tools/goose-maps.py): goose-go.webp (the goose side, up) and goose-ch.webp (the chess side, underneath; the case turns it over),
   each with a roughness picture (-r.webp: the ivory duller than the polished ebony).
   Estimated (no photograph of the edge, no section): the frame standing about 3 mm proud of the sunk field on either face, and the plain ebony edge.
   ===================================================================== */
(function () {
  'use strict';
  const HERE = (document.currentScript && document.currentScript.src) || location.href, IMG = {};
  const W = 41.9, D = 43, H = 2.9;
  (window.AtlasEx = window.AtlasEx || {}).goose = {
    flip: true,
    ready: () => { const get = (k, f) => new Promise(res => { const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = new URL('../../../images/atlas/ex/' + f, HERE).href; setTimeout(res, 9000); });
      return Promise.all([get('go', 'goose-go.webp?v=1'), get('gor', 'goose-go-r.webp?v=1'), get('ch', 'goose-ch.webp?v=1'), get('chr', 'goose-ch-r.webp?v=1')]); },
    build(TT, X, K) {
      const G = new TT.Group(), owned = [];
      const tex = (k, data) => { const t = new TT.Texture(IMG[k]); t.colorSpace = data ? TT.NoColorSpace : TT.SRGBColorSpace; t.anisotropy = 8; t.needsUpdate = true; owned.push(t); return t; };
      const ebT = K.tex(1024, 256, (g, w, h) => K.grain(g, w, h, { a: '#1c1411', b: '#0b0807', seed: 61, sx: .5, sy: 10, warp: .3, pores: .003 }));
      const ebony = K.mat({ map: ebT, color: '#ffffff', roughness: .5, envMapIntensity: .35 });
      const faceMat = (k, kr) => IMG[k] ? K.mat({ map: tex(k), roughnessMap: IMG[kr] ? tex(kr, true) : null, color: '#ffffff', roughness: 1.5, envMapIntensity: .35 })   /* (a waxed, hand-rubbed surface: a soft sheen, no mirror) */ : ebony;
      // a face: a grid over the whole board, the field inside the frame sunk (f0 … f1: where the moulding falls, as a share of the width from the edge)
      const face = (mat, f0, f1, drop) => { const N = 120, g = new TT.PlaneGeometry(W, D, N, N); g.rotateX(-Math.PI / 2); const P = g.attributes.position;
        for (let i = 0; i < P.count; i++) { const d = Math.min(W / 2 - Math.abs(P.getX(i)), D / 2 - Math.abs(P.getZ(i))) / W, t = Math.max(0, Math.min(1, (d - f0) / (f1 - f0))); P.setY(i, -drop * t * t * (3 - 2 * t)); }
        g.computeVertexNormals(); const m = new TT.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; };
      const DROP = .3;
      const go = face(faceMat('go', 'gor'), .062, .078, DROP); go.position.y = H; G.add(go);
      const chG = new TT.Group(); chG.rotation.z = Math.PI; chG.add(face(faceMat('ch', 'chr'), .060, .086, DROP)); G.add(chG);   // (underneath: seen right way round once the board is turned over)
      // the edge: plain ebony, the arrises a little rounded
      const edge = (len, rotY, x, z) => { const g = new TT.PlaneGeometry(len, H, 1, 1), m = new TT.Mesh(g, ebony); m.rotation.y = rotY; m.position.set(x, H / 2, z); m.castShadow = m.receiveShadow = true; G.add(m); };
      edge(W, 0, 0, D / 2); edge(W, Math.PI, 0, -D / 2); edge(D, Math.PI / 2, W / 2, 0); edge(D, -Math.PI / 2, -W / 2, 0);
      G.userData.dispose = () => owned.forEach(t => t.dispose());
      for (const k in IMG) delete IMG[k];
      return G;
    },
  };
})();
