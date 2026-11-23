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
      // a face: three flat parts — the frame, the narrow slope of its moulding, the sunk field (f0 … f1: where the slope falls, as a share of the
      // width in from the edge). 9 quads = 18 triangles a face (2026-11-23, the user: the board is a simple shape — it was a 120 × 120 grid,
      // 28,800 triangles a face, for a step that needs none of them).
      const face = (mat, f0, f1, drop) => { const a = f0 * W, b = f1 * W, P = [], U = [], I = [];
        const ring = (ins, y) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => { const x = sx * (W / 2 - ins), z = sz * (D / 2 - ins); P.push(x, y, z); U.push(x / W + .5, .5 - z / D); return P.length / 3 - 1; });
        const band = (r0, r1) => { for (let k = 0; k < 4; k++) { const n = (k + 1) % 4; I.push(r0[k], r1[k], r1[n], r0[k], r1[n], r0[n]); } };
        band(ring(0, 0), ring(a, 0)); band(ring(a, 0), ring(b, -drop));   // (each part has its own corners, so the frame and the field stay flat-shaded)
        const f = ring(b, -drop); I.push(f[0], f[3], f[2], f[0], f[2], f[1]);
        const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
        const m = new TT.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m; };
      const DROP = .35;
      const go = face(faceMat('go', 'gor'), .062, .078, DROP); go.position.y = H; G.add(go);
      const chG = new TT.Group(); chG.rotation.z = Math.PI; const chM = faceMat('ch', 'chr'); chG.add(face(chM, .040, .060, DROP));
      // the chess side's two ornaments: at the middle of the left and right sides a U-shaped tongue of the frame reaches out over the scalloped
      // moulding into the field, level with the frame (its place and size from the photograph). Its top is the photograph, its wall plain ebony.
      // (The scallops of the moulding themselves stay in the picture, on the slope: 2 × 24 triangles for the tongues is all the face needs.)
      [-1, 1].forEach(sd => { const x0 = sd * (.5 - .040) * W, xc = sd * (.5 - .108) * W, zc = .0025 * D, r = .0505 * D, N = 10, O = [[x0, zc - r], [xc, zc - r]];
        for (let i = 1; i < N; i++) { const t = -Math.PI / 2 + i / N * Math.PI; O.push([xc - sd * Math.cos(t) * r * (.05 * W / (.0505 * D)), zc + Math.sin(t) * r]); }
        O.push([xc, zc + r], [x0, zc + r]);
        const P = [], U = [], I = []; O.forEach(([x, z]) => { P.push(x, .002, z); U.push(x / W + .5, .5 - z / D); });
        for (let i = 1; i < O.length - 1; i++) sd < 0 ? I.push(0, i + 1, i) : I.push(0, i, i + 1);
        const tg = new TT.BufferGeometry(); tg.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); tg.setAttribute('uv', new TT.Float32BufferAttribute(U, 2)); tg.setIndex(I); tg.computeVertexNormals();
        const top = new TT.Mesh(tg, chM); top.castShadow = top.receiveShadow = true; chG.add(top);
        const WP = [], WI = []; O.forEach(([x, z]) => { WP.push(x, .002, z, x, -DROP, z); });
        for (let i = 0; i < O.length - 1; i++) { const q = i * 2; sd < 0 ? WI.push(q, q + 2, q + 1, q + 1, q + 2, q + 3) : WI.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
        const wg = new TT.BufferGeometry(); wg.setAttribute('position', new TT.Float32BufferAttribute(WP, 3)); wg.setIndex(WI); wg.computeVertexNormals();
        const wall = new TT.Mesh(wg, ebony); wall.castShadow = wall.receiveShadow = true; chG.add(wall); });
      G.add(chG);   // (underneath: seen right way round once the board is turned over)
      // the edge: plain ebony, the arrises a little rounded
      const edge = (len, rotY, x, z) => { const g = new TT.PlaneGeometry(len, H, 1, 1), m = new TT.Mesh(g, ebony); m.rotation.y = rotY; m.position.set(x, H / 2, z); m.castShadow = m.receiveShadow = true; G.add(m); };
      edge(W, 0, 0, D / 2); edge(W, Math.PI, 0, -D / 2); edge(D, Math.PI / 2, W / 2, 0); edge(D, -Math.PI / 2, -W / 2, 0);
      G.userData.dispose = () => owned.forEach(t => t.dispose());
      for (const k in IMG) delete IMG[k];
      return G;
    },
  };
})();
