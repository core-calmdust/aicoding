/* 所蔵品：ニーシャープールのチェスセット（メトロポリタン美術館 1971.193a–ff） — units: 1 = 1 cm.
   Stonepaste, molded and finished by hand, glazed: 17 pieces turquoise, 15 manganese (the Met); attributed to Nishapur, Iran,
   12th century. Abstract shatranj forms (the Met): shah = a throne, firzan (vizier) = a smaller throne, elephant = two tusk-like
   protrusions, horse = a triangular knob for the head, chariot = rectangular with a wedge at the top, pawn = a faceted hemisphere
   with a knob. Sizes: king H. 5.1 cm, diam. 5.4; pawn H. 3.3, diam. 2.9 (the Met). The other pieces' sizes, the exact profiles and
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
        // the white body showing through where the glaze ran thin, at the edges (a few soft pale spots)
        let s2 = seed * 7; const r2 = () => ((s2 = (s2 * 16807) % 2147483647) / 2147483647);
        for (let q = 0; q < 10; q++) { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 14); g.save(); g.translate(r2() * w, r2() * h * .5); gr.addColorStop(0, `rgba(230,236,226,${pale})`); gr.addColorStop(1, 'rgba(230,236,226,0)'); g.fillStyle = gr; g.fillRect(-14, -14, 28, 28); g.restore(); }
      });
      // (after the Met's photographs: the 'turquoise' has aged to a soft sea-green, the manganese to a streaky amber-brown; a satin sheen)
      const TQ = K.mat({ map: glazeT([150, 180, 142], [100, 136, 98], true, 21), color: '#ffffff', roughness: .38, clearcoat: .55, clearcoatRoughness: .35 });
      const MN = K.mat({ map: glazeT([124, 78, 46], [50, 26, 16], false, 37, .12), color: '#ffffff', roughness: .38, clearcoat: .55, clearcoatRoughness: .35 });
      // extruded forms carry UVs in centimetres: give them their own copies of the glazes, the texture spread over ~4 cm
      const perCm = (m) => { const c = m.clone(); c.map = m.map.clone(); c.map.wrapS = c.map.wrapT = TT.RepeatWrapping; c.map.repeat.set(.24, .24); c.map.needsUpdate = true; return c; };
      const TQx = perCm(TQ), MNx = perCm(MN), X2 = m => m === TQ ? TQx : MNx;
      const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
      const lathe = (pts, seg = 28) => new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), seg);
      const ext = (S, depth, bev = .18) => { const g = new TT.ExtrudeGeometry(S, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 14 }); g.translate(0, 0, -depth / 2); return g; };
      // ---- the six forms (front = +z)
      const throne = (m, s) => {   // shah / firzan: a round seat with a high back (a throne), the back rounded at the top
        const p = new TT.Group();
        add(p, lathe([[0, 0], [2.6 * s, 0], [2.7 * s, .3 * s], [2.55 * s, 1.0 * s], [2.35 * s, 1.75 * s], [2.2 * s, 1.95 * s], [0, 2.0 * s]], 32), m);
        const S = new TT.Shape(); const w = 2.1 * s, t = 5.1 * s; S.moveTo(-w, 0); S.lineTo(w, 0); S.lineTo(w, t - w * .9); S.absarc(0, t - w * .9, w, 0, Math.PI, false); S.closePath();
        const b = add(p, ext(S, 1.25 * s, .2 * s), X2(m), 0, 0, -1.3 * s);
        // the arms of the throne: two low rolls either side of the seat
        [-1, 1].forEach(k => { const a = add(p, new TT.CapsuleGeometry(.42 * s, 1.6 * s, 6, 12), m, k * 1.85 * s, 2.15 * s, -.2 * s); a.rotation.x = Math.PI / 2; });
        return p;
      };
      const dome = (m, r, h) => lathe([[0, 0], [r, 0], [r * 1.03, h * .12], [r * .92, h * .5], [r * .66, h * .82], [r * .3, h * .98], [0, h]], 30);
      const elephant = (m) => { const p = new TT.Group(); add(p, dome(m, 2.15, 2.7), m);
        [-1, 1].forEach(k => { const t = add(p, new TT.SphereGeometry(.62, 16, 12), m, k * .5, 2.75, .05); t.scale.set(.8, 1.15, 1); }); return p; };   // the top split into two low humps (the tusks)
      const horse = (m) => { const p = new TT.Group();   // a tall cone rising to a point that leans forward (the head)
        const c = add(p, lathe([[0, 0], [2.0, 0], [2.05, .3], [1.75, 1.4], [1.15, 2.6], [.55, 3.6], [.18, 4.2], [0, 4.3]], 30), m); c.geometry.translate(0, 0, 0);
        const pos = c.geometry.attributes.position; for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, pos.getZ(i) + Math.pow(y / 4.3, 2) * .9); } c.geometry.computeVertexNormals(); return p; };
      const rook = (m) => { const p = new TT.Group(); const S = new TT.Shape(); const w = 1.55, h = 3.9;
        S.moveTo(-w, 0); S.lineTo(w, 0); S.lineTo(w, h); S.lineTo(.42, h); S.lineTo(0, h - 1.05); S.lineTo(-.42, h); S.lineTo(-w, h); S.closePath();
        add(p, ext(S, 2.3, .22), X2(m)); return p; };
      const pawn = (m) => { const p = new TT.Group();   // a ribbed bell (eight lobes) with a knob
        const g = lathe([[0, 0], [1.35, 0], [1.4, .25], [1.32, 1.2], [1.15, 2.0], [.8, 2.5], [0, 2.6]], 48); const pos = g.attributes.position;
        for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i), a = Math.atan2(z, x), k = 1 + .07 * Math.cos(a * 8); pos.setX(i, x * k); pos.setZ(i, z * k); } g.computeVertexNormals(); add(p, g, m);
        add(p, new TT.SphereGeometry(.4, 12, 8), m, 0, 2.6 + .4 * .6, 0); add(p, new TT.CylinderGeometry(.26, .32, .35, 10), m, 0, 2.6, 0); return p; };
      // ---- set out as at the start of a game of shatranj: turquoise at the front, manganese behind
      const SQ = 6.2, row = ['r', 'h', 'e', 'v', 'k', 'e', 'h', 'r'];
      const make = (t, m) => t === 'k' ? throne(m, 1) : t === 'v' ? throne(m, .84) : t === 'e' ? elephant(m) : t === 'h' ? horse(m) : t === 'r' ? rook(m) : pawn(m);
      [[TQ, 1], [MN, -1]].forEach(([m, side]) => {
        row.forEach((t, i) => { const o = make(t, m); o.position.set((i - 3.5) * SQ, 0, side * 3.5 * SQ); o.rotation.y = side > 0 ? Math.PI : 0; o.rotation.y += (Math.sin(i * 7.1 + side) * .06); G.add(o); });
        for (let i = 0; i < 8; i++) { const o = make('p', m); o.position.set((i - 3.5) * SQ, 0, side * 2.5 * SQ); o.rotation.y = i * .4; G.add(o); }
      });
      // the case floor: a pale, unmarked linen (the set's own board is lost)
      const linT = K.tex(256, 256, (g, w, h) => { const n = K.noise(3), img = g.createImageData(w, h), d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const wv = (Math.sin(x * 1.7) * .5 + .5) * (Math.sin(y * 1.7 + 1) * .5 + .5), k = .86 + wv * .08 + (n(x / 30, y / 4) - .5) * .1, i = (y * w + x) * 4; d[i] = 228 * k; d[i + 1] = 214 * k; d[i + 2] = 200 * k; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [6, 6] });
      const lin = K.mat({ map: linT, color: '#ffffff', roughness: .95, sheen: .3, sheenRoughness: .8, sheenColor: K.lin('#fff6e4') });
      const base = new TT.Mesh(new TT.BoxGeometry(56, 1.2, 52), lin); base.position.y = -.6; base.receiveShadow = true; G.add(base);
      return G;
    },
  };
})();
