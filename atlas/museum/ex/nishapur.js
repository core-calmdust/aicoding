/* 所蔵品：ニーシャープールのチェスセット（メトロポリタン美術館 1971.193a–ff） — units: 1 = 1 cm.
   Stonepaste, molded and finished by hand, glazed: 17 pieces turquoise, 15 manganese (the Met); attributed to Nishapur, Iran,
   12th century. Abstract shatranj forms (the Met): shah = a throne, firzan (vizier) = a smaller throne, elephant = two tusk-like
   protrusions, horse = a triangular knob for the head, chariot = rectangular with a wedge at the top, pawn = a faceted hemisphere
   with a knob. 2026-11-22: the forms redrawn after the Met's photograph of the whole set (domes with a ledge for shah and firzan,
   two-pointed elephants, beaked horses, seat-shaped chariots, eight-sided pawns; every piece a little different). Sizes: king H. 5.1 cm, diam. 5.4; pawn H. 3.3, diam. 2.9 (the Met). The other pieces' sizes, the exact profiles and
   the glaze effects are estimates (colours checked 2026-11-21 against photographs of the set: the light pieces a soft sea-green, the dark a streaky amber-brown; pawns as ribbed bells, horses as forward-leaning cones); the 32 are set out in the opening position of shatranj for display (no board survives with them). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).nishapur = {
    build(TT, X, K) {
      const G = new TT.Group();
      // ---- glazes: an alkaline turquoise (glassy, pooling deeper in hollows, fine crackle) and a manganese purple-black
      const glazeT = (base, deep, crackle, seed, pale = .3) => K.tex(512, 512, (g, w, h) => {
        const n = K.noise(seed), img = g.createImageData(w, h), d = img.data, A = base, B = deep;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 70, y / 70, 4), b = n(x / 12, y / 12, 2), k = Math.min(1, Math.max(0, (a - .35) * 1.6 + (b - .5) * .25 + y / h * .35)), i = (y * w + x) * 4;
          d[i] = A[0] + (B[0] - A[0]) * k; d[i + 1] = A[1] + (B[1] - A[1]) * k; d[i + 2] = A[2] + (B[2] - A[2]) * k; d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        if (crackle) { g.strokeStyle = 'rgba(40,70,44,.16)'; g.lineWidth = .8; let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
          for (let q = 0; q < 140; q++) { let x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - .5) * 40; y += (r() - .5) * 40; g.lineTo(x, y); } g.stroke(); } }
        { let s3 = seed * 3; const r3 = () => ((s3 = (s3 * 16807) % 2147483647) / 2147483647); for (let q = 0; q < 260; q++) { g.fillStyle = `rgba(30,22,16,${.1 + r3() * .25})`; g.beginPath(); g.arc(r3() * w, r3() * h, .6 + r3() * 2.2, 0, 6.29); g.fill(); } }   // pitting and dirt in the glaze
        // the white body showing through where the glaze ran thin, at the edges (a few soft pale spots)
        let s2 = seed * 7; const r2 = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
        for (let q = 0; q < 10; q++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); g.save(); g.translate(r2() * w, r2() * h * .5); gr.addColorStop(0, `rgba(230,236,226,${pale})`); gr.addColorStop(1, 'rgba(230,236,226,0)'); g.fillStyle = gr; g.fillRect(-14, -14, 28, 28); g.restore(); }
      });
      // (after the Met's photographs: the 'turquoise' has aged to a soft sea-green, the manganese to a streaky amber-brown; a satin sheen)
      const TQ = K.mat({ map: glazeT([126, 150, 124], [66, 92, 76], true, 21), color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .45 });
      const MN = K.mat({ map: glazeT([104, 58, 36], [34, 18, 13], false, 37, .2), color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .45 });
      // extruded forms carry UVs in centimetres: give them their own copies of the glazes, the texture spread over ~4 cm
      const perCm = (m) => { const c = m.clone(); c.map = m.map.clone(); c.map.wrapS = c.map.wrapT = TT.RepeatWrapping; c.map.repeat.set(.24, .24); c.map.needsUpdate = true; return c; };
      const TQx = perCm(TQ), MNx = perCm(MN), X2 = m => m === TQ ? TQx : MNx;
      const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
      const lathe = (pts, seg = 28) => new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), seg);
      const ext = (S, depth, bev = .18) => { const g = new TT.ExtrudeGeometry(S, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 14 }); g.translate(0, 0, -depth / 2); return g; };
      // ---- the six forms (front = +z), after the Met's photograph of the whole set: hand-finished, no two alike
      let sd = 1971; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      const warp = (g, fn) => { const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const v = fn(P.getX(i), P.getY(i), P.getZ(i)); P.setXYZ(i, v[0], v[1], v[2]); } g.computeVertexNormals(); return g; };
      const domeP = (r, h) => { const pts = [[0, 0], [r * .98, 0]]; for (let k = 1; k <= 26; k++) { const t = k / 26, y = h * t, rr = r * Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), .5) * (1 + .02 * Math.sin(t * 3)); pts.push([rr, y]); } return pts; };
      // shah / firzan: a heavy dome, the upper front cut back so that a rounded ledge runs across it (the seat of a throne)
      const throne = (m, s) => { const p = new TT.Group(), r = 2.7 * s, h = 5.1 * s;
        add(p, warp(lathe(domeP(r, h), 40), (x, y, z) => { const a = Math.atan2(z, x), front = Math.max(0, Math.sin(a)), up = Math.min(1, Math.max(0, (y - h * (.5 - .1 * front)) / (h * .06))), k = 1 - .26 * up * Math.min(1, front * 2.6); return [x * k, y, z * k]; }), m); return p; };
      // elephant: a tall dome whose top is pinched into two little points (the tusks)
      const elephant = (m) => { const p = new TT.Group(); add(p, lathe([[0, 0], [2.0, 0], [2.06, .3], [1.9, 1.5], [1.5, 2.8], [1.0, 3.7], [.72, 4.0], [0, 4.05]], 32), m);
        [-1, 1].forEach(k => { const t = add(p, new TT.ConeGeometry(.5, 1.3, 12), m, k * .5, 4.35, .2); t.rotation.z = -k * .3; }); return p; };
      // horse: a cone, a pointed beak standing out of its upper front (the head)
      const horse = (m) => { const p = new TT.Group(); add(p, lathe([[0, 0], [1.95, 0], [2.02, .3], [1.8, 1.5], [1.3, 2.9], [.75, 3.9], [.3, 4.4], [0, 4.5]], 32), m);
        const b = add(p, new TT.ConeGeometry(.7, 1.9, 4), m, 0, 3.5, 1.05); b.rotation.x = 1.0; b.scale.set(.8, 1, 1); return p; };
      // chariot: a block with a wedge cut out of its top (the Met; the colour photographs)
      const rook = (m) => { const p = new TT.Group(), S = new TT.Shape(), w = 1.7, h = 3.3; S.moveTo(-w, 0); S.lineTo(w, 0); S.lineTo(w, h); S.lineTo(w - .55, h); S.lineTo(0, h - 1.35); S.lineTo(-w + .55, h); S.lineTo(-w, h); S.closePath();
        add(p, ext(S, 2.0, .22), X2(m)); return p; };
      // pawn: an eight-sided dome spreading to its foot, a small knob on top
      const pawn = (m) => { const p = new TT.Group(); let g = lathe([[0, 0], [1.5, 0], [1.52, .2], [1.36, .9], [1.3, 1.9], [1.05, 2.5], [.5, 2.85], [0, 2.9]], 8); g = g.toNonIndexed(); g.computeVertexNormals(); add(p, g, m);
        add(p, new TT.SphereGeometry(.3, 10, 8), m, 0, 3.05, 0); return p; };
      // ---- set out as in the Met's photograph: the two colours facing each other in their opening rows, on a plain ground
      const SQ = 5.0, row = ['r', 'h', 'e', 'v', 'k', 'e', 'h', 'r'];
      const make = (t, m) => t === 'k' ? throne(m, 1) : t === 'v' ? throne(m, .9) : t === 'e' ? elephant(m) : t === 'h' ? horse(m) : t === 'r' ? rook(m) : pawn(m);
      const put = (o, x, z, ry) => { o.position.set(x + (rnd() - .5) * .9, 0, z + (rnd() - .5) * .9); o.rotation.set((rnd() - .5) * .05, ry + (rnd() - .5) * .5, (rnd() - .5) * .05); o.scale.set(.94 + rnd() * .12, .93 + rnd() * .14, .94 + rnd() * .12); G.add(o); };
      [[TQ, 1], [MN, -1]].forEach(([m, side]) => {
        row.forEach((t, i) => put(make(t, m), (i - 3.5) * SQ, side * 2.05 * SQ, side > 0 ? Math.PI : 0));
        for (let i = 0; i < 8; i++) put(make('p', m), (i - 3.5) * SQ + side * 1.2, side * .75 * SQ, i * .4);
      });
      // the case floor: a pale, unmarked linen (the set's own board is lost)
      const linT = K.tex(256, 256, (g, w, h) => { const n = K.noise(3), img = g.createImageData(w, h), d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const wv = (Math.sin(x * 1.7) * .5 + .5) * (Math.sin(y * 1.7 + 1) * .5 + .5), k = .86 + wv * .08 + (n(x / 30, y / 4) - .5) * .1, i = (y * w + x) * 4; d[i] = 214 * k; d[i + 1] = 200 * k; d[i + 2] = 186 * k; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [6, 6] });
      const lin = K.mat({ map: linT, color: '#ffffff', roughness: .95, sheen: .3, sheenRoughness: .8, sheenColor: K.lin('#fff6e4') });
      const base = new TT.Mesh(new TT.BoxGeometry(46, 1.2, 30), lin); base.position.y = -.6; base.receiveShadow = true; G.add(base);
      return G;
    },
  };
})();
