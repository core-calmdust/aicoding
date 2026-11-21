/* 所蔵品：「シャルルマーニュのチェス駒」（フランス国立図書館 メダル・古代美術部門 Inv.55.305–55.323） — units: 1 = 1 cm.
   Elephant ivory with traces of gilding and paint; southern Italy (Salerno or Amalfi), 1080–1100; in the treasury of Saint-Denis,
   seized in the Revolution (18 Jan. 1794). 16 survive: 2 kings, 2 queens, 4 elephants, 3 quadrigae, 4 horsemen, 1 foot soldier.
   Shown, one of each, at the heights of the BnF records: king Inv.55.306 (15.8 cm), queen .309 (12.7), elephant .312 (11.7),
   quadriga .317 (12.6), horseman with pointed shield .319 (12.4), foot soldier .323 (7.3). What each shows follows the records
   (king under a small crenellated semicircular building on paired columns, two attendants drawing the curtains; queen on a stool
   in wide sleeves, curly-haired servants at the curtains, an armed guard behind his shield high on the façade, a dome on twin
   columns; elephant with two mahouts holding their hooks; quadriga driven by a charioteer with a three-thonged whip; horseman with
   a lozenge-decorated pointed shield, sword in the right hand, head turned to his left; soldier in cuirass and nasal helmet, sword
   held high behind a great pointed shield). Proportions, faces, folds and the ornament (arcades, palmettes, rosette) are drawn
   in the manner of the pieces (estimates).
   2026-11-21: rebuilt after photographs of the pieces on Wikimedia Commons: king and queen as deep ivory blocks with a framed niche
   (beaded borders, a band of lozenges, a pleated canopy over the king's pointed opening, crenellations over the queen's arch), the
   elephant and the horse as solid animals carved in one with their bases; warm cream ivory. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).charlemagne = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1794; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const V3 = (x, y, z) => new TT.Vector3(x, y, z);
      // ---- elephant ivory: creamy, polished, fine lines; old wear darker in the hollows
      const ivT = (k) => K.tex(512, 512, (g, w, h) => {
        K.grain(g, w, h, { a: '#eadab6', b: '#e0cda6', seed: 60 + k, sx: 1.2, sy: 30, warp: .25 });   // warm cream (the photographs)
        const n = K.noise(90 + k), img = g.getImageData(0, 0, w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 100, y / 100, 4), s = Math.max(0, a - .52) * 60, i = (y * w + x) * 4; d[i] -= s * .5; d[i + 1] -= s * .75; d[i + 2] -= s * 1.2; }
        g.putImageData(img, 0, 0);
      });
      const IVT = [ivT(0), ivT(1)];
      const IV = (k = 0) => K.mat({ map: IVT[k], color: '#ffffff', roughness: .36, clearcoat: .3, clearcoatRoughness: .4, sheen: .2, sheenColor: K.lin('#fff3dc') });
      const iv = IV(0), iv2 = IV(1);
      const carved = (draw, w = 512, h = 512) => {
        const bc = document.createElement('canvas'); bc.width = w; bc.height = h; const b = bc.getContext('2d');
        b.fillStyle = '#000'; b.fillRect(0, 0, w, h); b.strokeStyle = b.fillStyle = '#fff'; b.lineCap = b.lineJoin = 'round'; draw(b, w, h);
        b.filter = 'blur(1.5px)'; b.drawImage(bc, 0, 0); b.filter = 'none';
        const map = K.tex(w, h, (g) => { g.drawImage(IVT[0].image, 0, 0, w, h);
          const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
          mg.fillStyle = '#c8b28c'; mg.fillRect(0, 0, w, h); mg.globalCompositeOperation = 'lighter'; mg.drawImage(bc, 0, 0);
          g.globalCompositeOperation = 'multiply'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over'; });
        const bump = new TT.CanvasTexture(bc); bump.colorSpace = TT.NoColorSpace;
        return K.mat({ map, bumpMap: bump, bumpScale: 3, color: '#ffffff', roughness: .4, clearcoat: .25, clearcoatRoughness: .45 });
      };
      // round arches on columns, wrapped round the back of the little building
      const arcadeM = (n) => carved((g, w, h) => { const cw = w / n; g.lineWidth = 10;
        for (let i = 0; i < n; i++) { const x0 = i * cw, cx = x0 + cw / 2, r = cw / 2 - 8;
          g.beginPath(); g.moveTo(x0 + 8, h - 10); g.lineTo(x0 + 8, h * .35); g.arc(cx, h * .35, r, Math.PI, 0); g.lineTo(x0 + cw - 8, h - 10); g.stroke();
          g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + 3, h * .3); g.lineTo(x0 + 13, h * .3); g.stroke(); g.lineWidth = 10; }
        g.fillRect(0, 0, w, 14); g.fillRect(0, h - 16, w, 16); }, 1024, 512);
      // palmettes and a rosette of pentagons on the dome
      const domeM = carved((g, w, h) => { g.lineWidth = 6;
        for (let i = 0; i < 12; i++) { const x = (i + .5) * w / 12; g.beginPath(); g.moveTo(x, h); for (let k = -2; k <= 2; k++) { g.moveTo(x, h * .98); g.quadraticCurveTo(x + k * 10, h * .8, x + k * 14, h * .66); } g.stroke(); }
        const cx = w * .25, cy = h * .2; for (let r = 0; r < 3; r++) for (let k = 0; k < 5 + r * 5; k++) { const a = k / (5 + r * 5) * 6.283, rr = 14 + r * 22, x = cx + Math.cos(a) * rr * 2, y = cy + Math.sin(a) * rr * .6;
          g.beginPath(); for (let q = 0; q < 5; q++) { const b = a + q * 1.2566; g.lineTo(x + Math.cos(b) * 9, y + Math.sin(b) * 5); } g.closePath(); g.stroke(); } });
      const pleat = (n) => K.tex(256, 64, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 128 + 115 * Math.sin(x / w * n * Math.PI * 2); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }, { data: true });
      const robe = (n = 20, k = 0) => K.mat({ map: IVT[k], bumpMap: pleat(n), bumpScale: 1.4, color: '#ffffff', roughness: .38, clearcoat: .28, clearcoatRoughness: .45 });
      const hairT = K.tex(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; for (let y = 6; y < h; y += 13) for (let x = (y / 13 % 2) * 6; x < w; x += 12) { g.beginPath(); g.arc(x, y, 4.5, 0, 6.29); g.fill(); } }, { data: true });
      const curly = K.mat({ map: IVT[1], bumpMap: hairT, bumpScale: 2.4, color: '#ffffff', roughness: .45 });
      const lozT = K.tex(128, 256, (g, w, h) => { g.fillStyle = '#505050'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 6; for (let k = -8; k < 16; k++) { g.beginPath(); g.moveTo(k * 32, 0); g.lineTo(k * 32 + h, h); g.moveTo(k * 32, h); g.lineTo(k * 32 + h, 0); g.stroke(); } g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }, { data: true });
      const lozM = K.mat({ map: IVT[0], bumpMap: lozT, bumpScale: 2.6, color: '#ffffff', roughness: .38, clearcoat: .25 });
      // a face: almond eyes, straight nose, small mouth (the Salerno ivories' calm features); beard optional
      const faceM = (beard) => { const W = 512, H = 256, c = W * .25;
        const draw = (g, bump) => { if (bump) { g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); } else g.drawImage(IVT[0].image, 0, 0, W, H);
          const lo = bump ? '#000' : 'rgba(90,64,36,.6)'; g.fillStyle = g.strokeStyle = lo; g.lineCap = 'round';
          [-1, 1].forEach(s => { g.lineWidth = 2.5; g.beginPath(); g.ellipse(c + s * 17, 112, 10, 5, 0, 0, 6.29); g.stroke(); g.beginPath(); g.arc(c + s * 17, 112, 2.6, 0, 6.29); g.fill(); });
          if (bump) { g.fillStyle = '#d8d8d8'; g.fillRect(c - 4, 104, 8, 34); g.fillStyle = lo; }
          g.lineWidth = 3; g.beginPath(); g.moveTo(c - 8, 154); g.lineTo(c + 8, 154); g.stroke();
          if (beard) { g.lineWidth = 2; for (let x = -34; x <= 34; x += 6) { g.beginPath(); g.moveTo(c + x, 150 + Math.abs(x) * .2); g.quadraticCurveTo(c + x * .9, 175, c + x * .6, 196); g.stroke(); } }
        };
        return K.mat({ map: K.tex(W, H, g => draw(g, false)), bumpMap: K.tex(W, H, g => draw(g, true), { data: true }), bumpScale: 2.2, color: '#ffffff', roughness: .38, clearcoat: .25 }); };
      const faceB = faceM(true), faceN = faceM(false);
      // ---- helpers
      const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
      const limb = (p, a, b, r1, r2, m, seg = 10) => { const d = b.clone().sub(a), L = d.length(); const o = add(p, new TT.CylinderGeometry(r2, r1, L, seg, 1), m); o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return o; };
      const ball = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 16) => { const o = add(p, new TT.SphereGeometry(r, seg, Math.round(seg * .7)), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
      const lathe = (pts, seg = 24) => new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), seg);
      const head = (p, r, x, y, z, beard, ry = 0) => { const h = ball(p, r, beard ? faceB : faceN, x, y, z, 1, 1.12, .96, 22); h.rotation.y = ry; return h; };
      const crown = (p, r, x, y, z) => { add(p, new TT.CylinderGeometry(r, r * .96, r * .5, 18, 1, true), iv, x, y, z).material.side = TT.DoubleSide;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(p, new TT.ConeGeometry(r * .14, r * .36, 6), iv, x + Math.sin(a) * r, y + r * .38, z + Math.cos(a) * r); } };
      const kite = (w, h, m) => { const S = new TT.Shape(); S.moveTo(-w / 2, 0); S.quadraticCurveTo(-w / 2, w * .3, 0, w * .34); S.quadraticCurveTo(w / 2, w * .3, w / 2, 0); S.quadraticCurveTo(w * .42, -h * .5, 0, -h + w * .34); S.quadraticCurveTo(-w * .42, -h * .5, -w / 2, 0);
        const g = new TT.ExtrudeGeometry(S, { depth: .14, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2, curveSegments: 10 }); g.translate(0, h / 2 - w * .34, 0);
        const bb = new TT.Box3().setFromBufferAttribute(g.attributes.position); const uv = g.attributes.uv, pos = g.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
        return new TT.Mesh(g, m); };
      const figure = (p, o) => {   // a standing figure (attendant / soldier): robe, arms, head; o = {x, z, h, ry, beard, hair, arm}
        const f = new TT.Group(); f.position.set(o.x, o.y || 0, o.z); f.rotation.y = o.ry || 0; const H = o.h, s = H / 6;
        add(f, lathe([[.95 * s, 0], [.9 * s, .3 * s], [.7 * s, 2.4 * s], [.62 * s, 3.4 * s], [.72 * s, 4.2 * s], [.55 * s, 4.7 * s], [0, 4.75 * s]], 18), robe(14), 0, 0, 0).scale.z = .8;
        head(f, .55 * s, 0, 5.25 * s, .05 * s, o.beard, 0);
        if (o.hair) ball(f, .58 * s, curly, 0, 5.42 * s, -.12 * s, 1.02, .95, 1.0, 14);
        p.add(f); return { f, s };
      };
      // ---- the king and the queen are deep blocks of ivory carved like a little shrine (Commons photographs of the pieces in the
      //      Cabinet des médailles): a niche in the front, framed by bands of ornament (beads, lozenges, rosettes), the figures in
      //      high relief inside it; the king's niche opens between curtains drawn up into a point under a rounded, pleated canopy,
      //      the queen's is a round arch under a crenellated top
      const frameM = (w, h, hole) => { const PXW = 768, PXH = Math.round(768 * h / w), s = PXW / w;
        const draw = (g, bump) => {
          if (bump) { g.fillStyle = '#7a7a7a'; g.fillRect(0, 0, PXW, PXH); } else g.drawImage(IVT[0].image, 0, 0, PXW, PXH);
          const lo = bump ? '#202020' : 'rgba(120,90,50,.55)', hi = bump ? '#d8d8d8' : 'rgba(255,248,230,.0)', X = x => (x + w / 2) * s, Y = y => PXH - y * s;
          g.lineCap = 'round'; g.lineJoin = 'round';
          // outer and inner fillets
          g.strokeStyle = lo; g.lineWidth = s * .08; g.strokeRect(s * .12, s * .12, PXW - s * .24, PXH - s * .24); g.strokeRect(s * .95, s * .95, PXW - s * 1.9, PXH - s * 1.9);
          // a band of beads round the frame, between the fillets
          for (let t = 0; t < 1; t += .5 / (w + h)) { const p = t < .5 ? [t * 2 * w - w / 2, .53] : [t * 2 * w - w - w / 2, h - .53];
            if (p[0] < -w / 2 + .53 || p[0] > w / 2 - .53) continue; g.fillStyle = hi === 'rgba(255,248,230,.0)' ? 'rgba(120,90,50,.45)' : hi; g.beginPath(); g.arc(X(p[0]), Y(p[1]), s * .2, 0, 6.29); g.fill(); g.strokeStyle = lo; g.lineWidth = s * .04; g.stroke(); }
          for (let y = 1.2; y < h - .9; y += .5) [-w / 2 + .53, w / 2 - .53].forEach(x => { g.fillStyle = bump ? '#d8d8d8' : 'rgba(120,90,50,.45)'; g.beginPath(); g.arc(X(x), Y(y), s * .2, 0, 6.29); g.fill(); g.strokeStyle = lo; g.lineWidth = s * .04; g.stroke(); });
          // the base band: lozenges in squares
          const bh = 1.6; g.strokeStyle = lo; g.lineWidth = s * .07; g.strokeRect(X(-w / 2 + 1), Y(1 + bh), (w - 2) * s, bh * s);
          for (let x = -w / 2 + 1; x + bh <= w / 2 - 1 + .01; x += (w - 2) / Math.floor((w - 2) / bh)) { g.strokeRect(X(x + .12), Y(1 + bh - .12), (bh - .24) * s, (bh - .24) * s); g.beginPath(); g.moveTo(X(x + bh / 2), Y(1 + bh - .25)); g.lineTo(X(x + bh - .25), Y(1 + bh / 2)); g.lineTo(X(x + bh / 2), Y(1.25)); g.lineTo(X(x + .25), Y(1 + bh / 2)); g.closePath(); g.stroke(); }
          // a moulding round the niche
          g.strokeStyle = lo; g.lineWidth = s * .1; g.beginPath(); hole.getPoints(40).forEach((p, i) => { const xx = X(p.x * 1.06), yy = Y(p.y + (p.y > 3 ? .3 : 0)); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }); g.stroke();
          if (!bump) { for (let q = 0; q < 220; q++) { g.fillStyle = `rgba(130,96,52,${.04 + Math.random() * .1})`; g.fillRect(Math.random() * PXW, Math.random() * PXH, 1 + Math.random() * 6, 1 + Math.random() * 2); } }
        };
        const map = K.tex(PXW, PXH, g => draw(g, false)), bump = K.tex(PXW, PXH, g => draw(g, true), { data: true });
        [map, bump].forEach(t => { t.repeat.set(1 / w, 1 / h); t.offset.set(.5, 0); });
        return K.mat({ map, bumpMap: bump, bumpScale: 2.6, color: '#ffffff', roughness: .4, clearcoat: .25, clearcoatRoughness: .45 }); };
      const shrine = (p, o) => {
        const { w, h, d, nd } = o, hole = new TT.Path();
        if (o.gable) { const nw = o.nw, b = 2.6, top = o.nh; hole.moveTo(-nw / 2, b); hole.lineTo(nw / 2, b); hole.lineTo(nw / 2, top * .55); hole.quadraticCurveTo(nw * .35, top * .9, 0, top); hole.quadraticCurveTo(-nw * .35, top * .9, -nw / 2, top * .55); hole.closePath(); }
        else { const nw = o.nw, b = 2.6, r = nw / 2; hole.moveTo(-r, b); hole.lineTo(r, b); hole.lineTo(r, o.nh - r); hole.absarc(0, o.nh - r, r, 0, Math.PI, false); hole.closePath(); }
        const S = new TT.Shape(); S.moveTo(-w / 2, 0); S.lineTo(w / 2, 0); S.lineTo(w / 2, h); S.lineTo(-w / 2, h); S.closePath(); S.holes.push(hole);
        const fg = new TT.ExtrudeGeometry(S, { depth: nd, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 24 });
        add(p, fg, [frameM(w, h, hole), iv2], 0, 0, d / 2 - nd);
        add(p, new TT.BoxGeometry(w, h, d - nd), [iv2, iv2, iv2, iv2, IV(1), iv2], 0, h / 2, -nd / 2);
        if (o.crenel) for (let i = 0; i < o.crenel; i++) { const x = -w / 2 + .5 + i * (w - 1) / (o.crenel - 1); const m = add(p, new TT.CylinderGeometry(.42, .45, .9, 12), iv, x, h + .45, d / 2 - .5); ball(p, .42, iv, x, h + .9, d / 2 - .5, 1, .6, 1, 10); }
        if (o.canopy) { const c = add(p, new TT.CylinderGeometry(d / 2, d / 2, w, 24, 1, false, 0, Math.PI), robe(40, 1), 0, h, 0); c.rotation.z = Math.PI / 2; c.scale.set(.6, 1, 1); }
        // the curtains: gathered folds down the sides of the niche
        const nb = 2.6, cz = d / 2 - nd + .5;
        [-1, 1].forEach(s => { const c = add(p, lathe([[.4, 0], [.5, 2], [.42, 4], [.6, 6], [.7, o.nh - nb - .2]], 12), robe(10, 1), s * (o.nw / 2 - .55), nb, cz); c.scale.set(.8, 1, .6); });
        return { floor: nb, z: cz + .4 };
      };
      const fitUV = (g) => { g.computeBoundingBox(); const b = g.boundingBox, uv = g.attributes.uv, pos = g.attributes.position, n = g.attributes.normal; g.computeVertexNormals();
        for (let i = 0; i < uv.count; i++) { const side = Math.abs(g.attributes.normal.getZ(i)) < .5; uv.setXY(i, side ? (pos.getZ(i) - b.min.z) / (b.max.x - b.min.x) + (pos.getX(i) - b.min.x) / (b.max.x - b.min.x) : (pos.getX(i) - b.min.x) / (b.max.x - b.min.x), (pos.getY(i) - b.min.y) / (b.max.x - b.min.x)); } uv.needsUpdate = true; return g; };
      const pieces = [];
      // KING (Inv.55.306, H 15.8 cm, w 10.5): standing, bearded and crowned, a long robe, the sceptre held across the body in both
      // hands; two small attendants hold back the curtains
      { const p = new TT.Group(); const P = shrine(p, { w: 10.5, h: 14.6, d: 6.2, nd: 3.4, nw: 7.4, nh: 12.6, gable: true, canopy: true });
        const y0 = P.floor, z = P.z - .4;
        add(p, lathe([[1.6, 0], [1.55, .4], [1.3, 3.0], [1.15, 5.0], [1.25, 6.4], [.95, 7.0], [.4, 7.25], [0, 7.27]], 22), robe(26), 0, y0, z).scale.z = .65;
        add(p, lathe([[1.45, 0], [1.5, .5], [1.25, 1.5], [0, 1.6]], 20), robe(18, 1), 0, y0 + 5.7, z).scale.z = .7;   // the mantle over the shoulders
        head(p, .95, 0, y0 + 8.1, z + .1, true); crown(p, .82, 0, y0 + 9.0, z + .1);
        limb(p, V3(-1.2, y0 + 6.6, z), V3(-.4, y0 + 5.4, z + .9), .36, .32, robe(8)); ball(p, .3, iv, -.3, y0 + 5.35, z + 1.05);
        limb(p, V3(1.2, y0 + 6.6, z), V3(.45, y0 + 4.8, z + .9), .36, .32, robe(8)); ball(p, .3, iv, .4, y0 + 4.75, z + 1.05);
        limb(p, V3(.9, y0 + 3.6, z + 1.15), V3(-.6, y0 + 7.6, z + 1.0), .14, .12, iv, 8); ball(p, .3, iv, -.65, y0 + 7.8, z + 1.0, 1, 1.4, 1, 10);   // the sceptre
        [-1, 1].forEach(s => { const { f } = figure(p, { x: s * 2.9, z: z + .3, h: 5.6, ry: -s * .2 }); f.position.y = y0; limb(f, V3(s * .4, 3.6, .2), V3(s * .75, 4.3, .5), .2, .18, robe(6)); });
        pieces.push(p); }
      // QUEEN (Inv.55.309, H 12.7 cm, w 9.4): seated in a gown with wide sleeves; two attendants at the curtains
      { const p = new TT.Group(); const P = shrine(p, { w: 9.4, h: 11.8, d: 5.6, nd: 3.0, nw: 6.8, nh: 10.4, crenel: 5 });
        const y0 = P.floor, z = P.z - .4;
        add(p, lathe([[1.55, 0], [1.5, .4], [1.25, 3.0], [1.05, 4.3], [1.1, 5.1], [.8, 5.6], [.35, 5.8], [0, 5.82]], 22), robe(26), 0, y0, z).scale.z = .65;
        [-1, 1].forEach(s => { const sl = add(p, new TT.ConeGeometry(.7, 2.2, 14, 1, true), robe(10, 1), s * 1.2, y0 + 3.6, z + .3); sl.rotation.z = s * .2; sl.material.side = TT.DoubleSide; });   // the wide sleeves
        head(p, .82, 0, y0 + 6.55, z + .1, false); crown(p, .7, 0, y0 + 7.3, z + .1);
        [-1, 1].forEach(s => { const { f } = figure(p, { x: s * 2.55, z: z + .3, h: 5.2, ry: -s * .2, hair: true }); f.position.y = y0; });
        // the little armed guard high on the right of the façade, behind his shield (the BnF record)
        const gd = new TT.Group(); gd.position.set(3.35, 9.6, 2.85); p.add(gd);
        head(gd, .36, 0, 1.05, -.1, false); add(gd, new TT.ConeGeometry(.4, .5, 12), iv, 0, 1.45, -.1);
        const sh = kite(1.15, 1.6, lozM); sh.position.set(0, .45, .25); gd.add(sh);
        pieces.push(p); }
      // ELEPHANT (Inv.55.312, H 11.7 cm, w 8.6), after the photographs: a solid, compact animal carved in one with its base — pillar
      // legs, the trunk falling straight to the base, a large flat ear with radiating folds, a big round eye; a saddle-cloth with a
      // band of lozenges and a fringe; two mahouts sitting on its back; the base's edge carved with a running pattern
      { const p = new TT.Group();
        const baseM = carved((g, w, h) => { g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); for (let x = 20; x < w - 20; x += 40) { g.beginPath(); g.arc(x + 20, h / 2, 12, Math.PI, 0); g.stroke(); g.beginPath(); g.arc(x, h / 2, 12, 0, Math.PI); g.stroke(); } }, 512, 96);
        add(p, new TT.BoxGeometry(8.6, 1.3, 4.6), [baseM, baseM, iv, iv, baseM, baseM], 0, .65, 0);
        const E = new TT.Shape();   // the side profile (x along the body, head to +x)
        E.moveTo(-3.5, 0); E.lineTo(-2.2, 0); E.quadraticCurveTo(-2.25, 1.6, -1.9, 2.9); E.quadraticCurveTo(-.3, 2.5, 1.2, 2.9); E.quadraticCurveTo(1.45, 1.6, 1.4, 0); E.lineTo(2.75, 0);
        E.quadraticCurveTo(2.75, 1.7, 3.0, 2.6); E.quadraticCurveTo(3.3, 1.6, 3.55, .6); E.quadraticCurveTo(3.4, .1, 3.75, 0); E.lineTo(4.4, 0); E.quadraticCurveTo(4.25, .9, 4.2, 1.8);
        E.quadraticCurveTo(4.3, 3.6, 4.4, 4.6); E.quadraticCurveTo(4.3, 5.8, 3.3, 6.0); E.quadraticCurveTo(2.0, 6.35, .5, 6.2); E.quadraticCurveTo(-2.4, 6.2, -3.5, 5.0); E.quadraticCurveTo(-4.0, 3.9, -3.7, 2.6); E.quadraticCurveTo(-3.5, 1.4, -3.5, 0);
        const eg = new TT.ExtrudeGeometry(E, { depth: 2.2, bevelEnabled: true, bevelThickness: .95, bevelSize: .45, bevelSegments: 6, curveSegments: 16 }); eg.translate(0, 0, -1.1); fitUV(eg);
        const skinT = K.tex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a8a8a8'; g.lineWidth = 2; for (let y = 4; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x < w; x += 16) g.lineTo(x, y + Math.sin(x * .2 + y) * 2); g.stroke(); } }, { data: true });
        const skin = K.mat({ map: IVT[1], bumpMap: skinT, bumpScale: 1.4, color: '#ffffff', roughness: .4, clearcoat: .25 });
        add(p, eg, skin, 0, 1.3, 0);
        // the saddle-cloth: a band hanging over each flank, lozenges and a fringe
        const clothM = carved((g, w, h) => { g.lineWidth = 7; g.strokeRect(5, 5, w - 10, h * .8); for (let k = -6; k < 14; k++) { g.beginPath(); g.moveTo(k * 40, 10); g.lineTo(k * 40 + h * .7, h * .8); g.moveTo(k * 40, h * .8); g.lineTo(k * 40 + h * .7, 10); g.stroke(); }
          for (let x = 8; x < w; x += 14) { g.beginPath(); g.moveTo(x, h * .82); g.lineTo(x, h - 4); g.stroke(); } }, 512, 256);
        [-1, 1].forEach(sd => { const c = add(p, new TT.BoxGeometry(4.4, 2.3, .1), clothM, -.7, 1.3 + 4.6, sd * 2.08); });
        // the ear (a broad flat flap with radiating folds) and the eye, on both sides
        const earM = carved((g, w, h) => { g.lineWidth = 9; g.beginPath(); g.ellipse(w / 2, h / 2, w * .44, h * .44, 0, 0, 6.29); g.stroke(); for (let k = 0; k < 9; k++) { const a = -1.3 + k * .32; g.beginPath(); g.moveTo(w * .3, h * .5); g.lineTo(w * .3 + Math.cos(a) * w * .42, h * .5 + Math.sin(a) * h * .42); g.stroke(); } }, 256, 256);
        [-1, 1].forEach(sd => { const e = add(p, new TT.CircleGeometry(1.35, 24), earM, 2.55, 1.3 + 4.3, sd * 2.09); e.scale.set(.8, 1.3, 1); if (sd < 0) e.rotation.y = Math.PI;
          const eye = add(p, new TT.TorusGeometry(.32, .08, 6, 16), iv, 3.85, 1.3 + 4.95, sd * 1.75); eye.rotation.y = sd > 0 ? -.4 : Math.PI + .4; ball(p, .12, iv, 3.85, 1.3 + 4.95, sd * 1.78);
          limb(p, V3(4.3, 1.3 + 3.0, sd * .8), V3(4.95, 1.3 + 2.4, sd * .9), .2, .08, iv, 8); });   // tusks
        // the two mahouts, sitting astride, each with his hook
        [[-1.7, 0], [.6, 0]].forEach(([x], i) => { const f = new TT.Group(); f.position.set(x, 1.3 + 6.1, 0); f.rotation.y = Math.PI / 2; f.scale.setScalar(.85); p.add(f);
          add(f, lathe([[.75, 0], [.68, 1.0], [.55, 1.9], [.3, 2.2], [0, 2.22]], 16), robe(10), 0, 0, 0).scale.z = .8;
          [-1, 1].forEach(s => limb(f, V3(s * .6, .3, .2), V3(s * 1.5, -1.4, .5), .3, .24, robe(6)));
          head(f, .5, 0, 2.65, .05, i === 0, 0); ball(f, .52, curly, 0, 2.8, -.1, 1, .9, 1, 12);
          limb(f, V3(.6, 1.6, .2), V3(.8, 1.1, .9), .2, .18, robe(6));
          limb(f, V3(.8, .6, .95), V3(.8, 3.3, .95), .08, .08, iv, 6); add(f, new TT.TorusGeometry(.28, .07, 6, 12, Math.PI * 1.3), iv, .8 - .28, 3.3, .95); });
        pieces.push(p); }
      // QUADRIGA (Inv.55.317, H 12.6 cm, w 7.8): four horses abreast, a charioteer above with a three-thonged whip
      { const p = new TT.Group();
        add(p, new TT.BoxGeometry(7.8, .7, 5.4), iv, 0, .35, 0);
        for (let i = 0; i < 4; i++) { const x = -2.85 + i * 1.9, hg = new TT.Group(); hg.position.set(x, .7, 1.0); hg.rotation.y = (i - 1.5) * .08; p.add(hg);
          [-1, 1].forEach(s => { limb(hg, V3(s * .3, 0, 1.3), V3(s * .3, 2.7, 1.0), .22, .3, iv, 8); limb(hg, V3(s * .3, 0, -1.2), V3(s * .3, 2.7, -.9), .22, .3, iv, 8); });
          ball(hg, .95, iv, 0, 3.3, .05, .8, .95, 1.75, 16);
          limb(hg, V3(0, 3.8, 1.1), V3(0, 5.3, 1.7), .55, .4, iv, 10);
          const hh = limb(hg, V3(0, 5.6, 1.65), V3(0, 4.8, 2.5), .38, .28, iv, 10);
          [-1, 1].forEach(s => add(hg, new TT.ConeGeometry(.1, .35, 6), iv, s * .17, 5.95, 1.7)); }
        add(p, new TT.BoxGeometry(5.6, 2.6, 1.3), arcadeM(3), 0, 4.9, -1.5);   // the chariot box
        const { f } = figure(p, { x: 0, z: -1.6, h: 5.6 }); f.position.y = 4.4;
        limb(f, V3(.75, 3.8, .1), V3(1.6, 5.2, .7), .26, .22, robe(6));
        limb(f, V3(1.6, 5.2, .7), V3(1.75, 6.6, .9), .07, .06, iv, 6);
        for (let k = -1; k <= 1; k++) { const th = new TT.CatmullRomCurve3([V3(1.75, 6.6, .9), V3(2.2 + k * .3, 6.2, 1.2), V3(2.4 + k * .5, 5.2, 1.3 + k * .2)]); add(f, new TT.TubeGeometry(th, 10, .05, 5, false), iv); }
        limb(f, V3(-.75, 3.8, .1), V3(-1.0, 3.2, 1.0), .26, .22, robe(6));
        pieces.push(p); }
      // HORSEMAN (Inv.55.319, H 12.4 cm, w 7.9), after the photographs: a sturdy horse carved in one block with its base, legs in
      // pairs, the head bowed on an arched neck, a harness band across the chest; the rider in a long mail coat and a rounded helmet,
      // the sword upright in his right hand, the long pointed shield on his left side
      { const p = new TT.Group();
        const bs = new TT.Shape(); const c = .9; bs.moveTo(-2.6 + c, -4.0); bs.lineTo(2.6 - c, -4.0); bs.lineTo(2.6, -4.0 + c); bs.lineTo(2.6, 4.0 - c); bs.lineTo(2.6 - c, 4.0); bs.lineTo(-2.6 + c, 4.0); bs.lineTo(-2.6, 4.0 - c); bs.lineTo(-2.6, -4.0 + c); bs.closePath();
        add(p, new TT.ExtrudeGeometry(bs, { depth: .9, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1 }), iv, 0, .9, 0).rotation.x = Math.PI / 2;
        const Hs = new TT.Shape();   // the horse's side profile, head to +z (drawn in x, turned below)
        Hs.moveTo(-3.2, 0); Hs.lineTo(-2.5, 0); Hs.quadraticCurveTo(-2.45, 1.6, -2.2, 3.0); Hs.quadraticCurveTo(-.2, 2.7, 1.7, 3.0); Hs.quadraticCurveTo(1.95, 1.5, 2.0, 0); Hs.lineTo(2.7, 0);
        Hs.quadraticCurveTo(2.75, 1.8, 2.85, 3.2); Hs.quadraticCurveTo(3.3, 4.2, 3.4, 5.0); Hs.lineTo(4.1, 4.3); Hs.quadraticCurveTo(4.6, 4.2, 4.75, 4.6); Hs.lineTo(4.55, 5.7);
        Hs.lineTo(4.2, 6.6); Hs.lineTo(3.9, 6.15); Hs.quadraticCurveTo(3.0, 6.4, 2.4, 5.7); Hs.quadraticCurveTo(1.9, 5.2, 1.2, 5.3); Hs.quadraticCurveTo(-1.0, 5.4, -2.9, 5.1); Hs.quadraticCurveTo(-3.6, 4.6, -3.4, 3.2); Hs.quadraticCurveTo(-3.2, 1.6, -3.2, 0);
        const hg = new TT.ExtrudeGeometry(Hs, { depth: 1.6, bevelEnabled: true, bevelThickness: .85, bevelSize: .35, bevelSegments: 6, curveSegments: 12 }); hg.translate(0, 0, -.8); fitUV(hg);
        const horse = add(p, hg, iv, 0, .9, 0); horse.rotation.y = -Math.PI / 2;
        limb(p, V3(-1.15, .9 + 4.4, 3.0), V3(1.15, .9 + 4.4, 3.0), .22, .22, robe(12, 1), 8);   // the breast band
        // the rider
        [-1, 1].forEach(sd => { limb(p, V3(sd * .75, .9 + 5.5, .2), V3(sd * 1.2, .9 + 3.6, .7), .42, .36, robe(6)); limb(p, V3(sd * 1.2, .9 + 3.6, .7), V3(sd * 1.15, .9 + 2.3, .9), .34, .28, iv); });
        add(p, lathe([[1.2, 0], [1.15, 1.2], [1.05, 2.4], [.8, 3.0], [.4, 3.2], [0, 3.22]], 20), robe(16), 0, .9 + 5.3, 0).scale.z = .8;
        head(p, .82, 0, .9 + 9.2, .1, false, .4); const hm = add(p, new TT.SphereGeometry(.9, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), iv, 0, .9 + 9.55, .1); hm.scale.y = 1.1;
        const sh = kite(2.6, 5.0, lozM); sh.position.set(1.45, .9 + 6.0, .4); sh.rotation.y = Math.PI / 2 - .3; p.add(sh);
        limb(p, V3(-1.0, .9 + 7.8, .1), V3(-1.3, .9 + 6.8, .8), .32, .28, robe(6)); ball(p, .3, iv, -1.35, .9 + 6.7, .9);
        add(p, new TT.BoxGeometry(.3, 4.2, .09), iv, -1.38, .9 + 9.0, .95); add(p, new TT.BoxGeometry(1.0, .16, .2), iv, -1.38, .9 + 6.9, .95);
        pieces.push(p); }
      // FOOT SOLDIER (Inv.55.323, H 7.3 cm, w 4.8): cuirass, nasal helmet, sword held high behind a great pointed shield
      { const p = new TT.Group();
        add(p, new TT.BoxGeometry(4.0, .5, 3.0), iv, 0, .25, 0);
        add(p, lathe([[1.05, .5], [1.0, 1.2], [.85, 3.2], [.92, 4.2], [.7, 4.7], [.3, 4.85], [0, 4.86]], 20), robe(24), 0, 0, -.2).scale.z = .8;
        head(p, .62, 0, 5.4, -.15, false); add(p, new TT.ConeGeometry(.68, .78, 16), iv, 0, 6.05, -.15); add(p, new TT.BoxGeometry(.14, .55, .14), iv, 0, 5.45, .45);
        const sh = kite(2.4, 4.2, lozM); sh.position.set(.1, 2.75, .75); p.add(sh);
        limb(p, V3(-.9, 4.3, -.1), V3(-1.35, 5.3, .25), .26, .22, robe(6));
        add(p, new TT.BoxGeometry(.22, 2.2, .07), iv, -1.38, 6.45, .3); add(p, new TT.BoxGeometry(.8, .13, .16), iv, -1.38, 5.4, .3);
        pieces.push(p); }

      // ---- the case: dark felt; queen · king · quadriga at the back, horseman · elephant · soldier in front
      const feltT = K.tex(256, 256, (g, w, h) => { const n = K.noise(9), img = g.createImageData(w, h), d = img.data; for (let i = 0; i < w * h; i++) { const v = 30 + n((i % w) / 6, (i / w | 0) / 6, 2) * 14; d[i * 4] = v * .9; d[i * 4 + 1] = v * .95; d[i * 4 + 2] = v * 1.15; d[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [4, 3] });
      const felt = K.mat({ map: feltT, color: '#ffffff', roughness: .96, sheen: .5, sheenRoughness: .9, sheenColor: K.lin('#40486a') });
      const base = new TT.Mesh(new TT.BoxGeometry(40, 1.2, 26), felt); base.position.y = -.6; base.receiveShadow = true; G.add(base);
      const L = [[0, -5.5, 0], [-12.5, -5, .2], [12.5, 6.5, -.5], [12.5, -5, -.25], [-12.5, 6.5, .45], [0, 7.5, 0]];   // king, queen, elephant, quadriga, horseman, soldier
      pieces.forEach((p, i) => { const [x, z, ry] = L[i]; p.position.set(x, 0, z); p.rotation.y = ry; G.add(p); });
      return G;
    },
  };
})();
