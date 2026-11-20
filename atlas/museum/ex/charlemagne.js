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
   in the manner of the pieces (estimates). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).charlemagne = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1794; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const V3 = (x, y, z) => new TT.Vector3(x, y, z);
      // ---- elephant ivory: creamy, polished, fine lines; old wear darker in the hollows
      const ivT = (k) => K.tex(512, 512, (g, w, h) => {
        K.grain(g, w, h, { a: '#f2e8d2', b: '#e2d2b0', seed: 60 + k, sx: 1.2, sy: 14, warp: .6 });
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
      // the little building: a semicircular back with arcades, a half-dome with crenellations, a straight front on columns
      const pavilion = (p, o) => {
        const R = o.w / 2, H0 = .7, Hw = o.hw, D = R * .95;
        const bs = new TT.Shape(); bs.moveTo(-R, 0); bs.lineTo(R, 0); bs.absarc(0, 0, R, 0, Math.PI, true);
        const bg = new TT.ExtrudeGeometry(bs, { depth: H0, bevelEnabled: false, curveSegments: 24 }); bg.rotateX(-Math.PI / 2); bg.scale(1, 1, -D / R);
        const base = add(p, bg, iv, 0, 0, 0);
        const wall = add(p, new TT.CylinderGeometry(R - .05, R - .05, Hw, 32, 1, true, Math.PI / 2, Math.PI), [arcadeM(o.arches)][0], 0, H0 + Hw / 2, 0); wall.scale.z = D / R; wall.material.side = TT.DoubleSide;
        const dome = add(p, new TT.SphereGeometry(R, 32, 12, Math.PI, Math.PI, 0, Math.PI / 2), domeM, 0, H0 + Hw, 0); dome.scale.set(1, o.dome / R, D / R); dome.material.side = TT.DoubleSide;
        // the front arch: a thick slab with a round-headed opening, crenellated along the top
        const fs = new TT.Shape(); fs.moveTo(-R, 0); fs.lineTo(R, 0); fs.lineTo(R, o.arch + .9); fs.lineTo(-R, o.arch + .9); fs.closePath();
        const hole = new TT.Path(); hole.moveTo(-R + .9, 0); hole.lineTo(R - .9, 0); hole.lineTo(R - .9, o.arch - (R - .9)); hole.absarc(0, o.arch - (R - .9), R - .9, 0, Math.PI, false); hole.closePath(); fs.holes.push(hole);
        const fg = new TT.ExtrudeGeometry(fs, { depth: .55, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 1, curveSegments: 20 });
        add(p, fg, iv, 0, H0, -.3);
        for (let i = 0; i < 7; i++) add(p, new TT.BoxGeometry(o.w / 9, .55, .5), iv, -R + (i + .5) * o.w / 7, H0 + o.arch + .9 + .27, 0);
        // columns at the front corners (paired) and capitals
        [-1, 1].forEach(s => { [0, 1].forEach(k => { const x = s * (R - .45 - k * .5); limb(p, V3(x, H0, .1 - k * .45), V3(x, H0 + o.arch - (R - .9) - .1, .1 - k * .45), .2, .18, iv, 10);
            add(p, new TT.BoxGeometry(.55, .3, .55), iv, x, H0 + o.arch - (R - .9), .1 - k * .45); }); });
        // the curtains, drawn aside: gathered folds hanging from the arch
        [-1, 1].forEach(s => { const c = add(p, lathe([[.55, 0], [.62, 2], [.5, 4], [.75, 6], [.85, o.arch - .4]], 12), robe(10, 1), s * (R - 1.55), H0, .25); c.scale.set(.8, (o.arch - .2) / (o.arch - .4) * .98, .6); });
        return { H0, R };
      };
      const pieces = [];
      // KING (Inv.55.306, H 15.8 cm, w 10.5): bearded, crowned, long robe and short cloak, sceptre; two attendants draw the curtains
      { const p = new TT.Group(); const P = pavilion(p, { w: 10.5, hw: 10.4, dome: 4.2, arch: 10.8, arches: 6 });
        add(p, new TT.BoxGeometry(4.2, 4.2, 3.4), iv2, 0, P.H0 + 2.1, -1.4);
        add(p, lathe([[1.9, 0], [1.75, 1.4], [1.5, 4.6], [1.45, 5.6], [1.1, 6.3], [.55, 6.6], [0, 6.62]], 22), robe(24), 0, P.H0, -.8).scale.z = .75;
        const hem = add(p, lathe([[1.75, 0], [1.7, .3], [1.5, 3.6], [1.3, 4.3], [0, 4.35]], 22), robe(26), 0, P.H0, .75); hem.scale.z = .45;   // the robe falling in front from the knees
        [-1, 1].forEach(s => limb(p, V3(s * .75, P.H0 + 4.55, -1.1), V3(s * .8, P.H0 + 4.45, .95), .72, .66, robe(10), 14) && ball(p, .66, robe(10), s * .8, P.H0 + 4.45, .95, 1, 1, .7, 14));
        add(p, lathe([[1.55, 0], [1.65, .5], [1.3, 1.3], [0, 1.4]], 20), robe(18, 1), 0, P.H0 + 5.6, -.8).scale.z = .78;   // the short cloak
        head(p, 1.1, 0, P.H0 + 7.75, -.7, true); crown(p, .95, 0, P.H0 + 8.75, -.7);
        limb(p, V3(1.4, P.H0 + 6.0, -.5), V3(1.55, P.H0 + 4.9, .7), .42, .36, robe(8)); ball(p, .34, iv, 1.55, P.H0 + 5.0, .95);
        limb(p, V3(1.55, P.H0 + 4.2, .95), V3(1.5, P.H0 + 8.6, .9), .14, .12, iv, 8); ball(p, .36, iv, 1.5, P.H0 + 8.8, .9, 1, 1.3, 1, 10);   // the sceptre
        limb(p, V3(-1.4, P.H0 + 6.0, -.5), V3(-1.3, P.H0 + 4.8, .7), .42, .36, robe(8)); ball(p, .34, iv, -1.25, P.H0 + 4.8, .95);
        [-1, 1].forEach(s => { const { f } = figure(p, { x: s * 3.25, z: .9, h: 6.2, ry: -s * .5 }); f.position.y = P.H0;
          limb(f, V3(-s * .1, 4.2, .3), V3(s * .7, 5.6, .8), .26, .22, robe(6)); });
        pieces.push(p); }
      // QUEEN (Inv.55.309, H 12.7 cm, w 9.4): seated on a stool in a gown with very wide sleeves; servants with curly hair; a guard on the façade
      { const p = new TT.Group(); const P = pavilion(p, { w: 9.4, hw: 8.0, dome: 3.6, arch: 8.6, arches: 5 });
        add(p, new TT.CylinderGeometry(1.5, 1.6, 3.3, 16), iv2, 0, P.H0 + 1.65, -.9);
        add(p, lathe([[1.8, 0], [1.65, 1.4], [1.3, 3.8], [1.2, 4.7], [.9, 5.3], [.45, 5.55], [0, 5.57]], 22), robe(26), 0, P.H0, -.6).scale.z = .75;
        [-1, 1].forEach(s => limb(p, V3(s * .65, P.H0 + 3.7, -.9), V3(s * .7, P.H0 + 3.6, .85), .62, .56, robe(10), 14) && ball(p, .56, robe(10), s * .7, P.H0 + 3.6, .85, 1, 1, .7, 14));
        [-1, 1].forEach(s => { const sl = add(p, new TT.ConeGeometry(.95, 2.6, 14, 1, true), robe(10, 1), s * 1.45, P.H0 + 4.05, .1); sl.rotation.z = s * .25; sl.material.side = TT.DoubleSide; });   // the wide sleeves
        head(p, .95, 0, P.H0 + 6.4, -.5, false); crown(p, .82, 0, P.H0 + 7.25, -.5);
        ball(p, .98, curly, 0, P.H0 + 6.6, -.75, 1.02, .98, 1, 14);
        [-1, 1].forEach(s => { const { f } = figure(p, { x: s * 2.85, z: .85, h: 5.0, ry: -s * .5, hair: true }); f.position.y = P.H0;
          limb(f, V3(-s * .1, 3.4, .25), V3(s * .6, 4.6, .7), .22, .19, robe(6)); });
        // the little armed guard, high on the right of the façade, hiding behind his shield
        const gd = new TT.Group(); gd.position.set(3.0, P.H0 + 8.6 + .9 + .55, .25); p.add(gd);
        head(gd, .42, 0, 1.25, 0, false); add(gd, new TT.ConeGeometry(.46, .55, 12), iv, 0, 1.72, 0);
        const sh = kite(1.4, 1.9, lozM); sh.position.set(0, .55, .35); gd.add(sh);
        pieces.push(p); }
      // ELEPHANT (Inv.55.312, H 11.7 cm, w 8.6): an elephant carrying two mahouts armed with their hooks
      { const p = new TT.Group();
        const bs = new TT.Shape(); bs.moveTo(-3.6, -2.3); bs.lineTo(3.6, -2.3); bs.lineTo(3.6, 2.3); bs.lineTo(-3.6, 2.3); bs.closePath();
        add(p, new TT.ExtrudeGeometry(bs, { depth: .7, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 1 }), iv, 0, .7, 0).rotation.x = Math.PI / 2;
        const skinT = K.tex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a0a0a0'; g.lineWidth = 2; for (let y = 4; y < h; y += 9) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x < w; x += 16) g.lineTo(x, y + Math.sin(x * .2 + y) * 2.4); g.stroke(); } }, { data: true });
        const skin = K.mat({ map: IVT[1], bumpMap: skinT, bumpScale: 1.6, color: '#ffffff', roughness: .4, clearcoat: .25 });
        ball(p, 2.55, skin, 0, 4.6, 0, 1.35, 1.0, .9, 24);
        [[-1.9, 1.15], [1.9, 1.15], [-1.9, -1.15], [1.9, -1.15]].forEach(([x, z]) => limb(p, V3(x, .7, z), V3(x * .92, 4.0, z * .9), .78, .85, skin, 14));
        const hd = ball(p, 1.55, skin, 3.4, 5.6, 0, 1.0, 1.05, .95, 20);
        [-1, 1].forEach(s => { const e = add(p, new TT.CircleGeometry(1.45, 20), skin, 3.0, 5.7, s * 1.35); e.rotation.y = s > 0 ? 0 : Math.PI; e.scale.set(.75, 1.05, 1); e.material.side = TT.DoubleSide;
          limb(p, V3(4.2, 4.9, s * .55), V3(5.05, 4.55, s * .7), .2, .1, iv, 8); });   // ears and tusks
        const tr = new TT.CatmullRomCurve3([V3(4.6, 5.2, 0), V3(5.3, 4.0, 0), V3(5.3, 2.4, 0), V3(5.0, 1.2, 0), V3(5.4, .95, 0)]);
        add(p, new TT.TubeGeometry(tr, 24, .42, 10, false), skin);   // the trunk, down to the base
        const cl = add(p, new TT.SphereGeometry(2.62, 28, 10, 0, Math.PI * 2, 0, .8), lozM, 0, 4.6, 0); cl.scale.set(1.35, 1.0, .92);   // the saddle-cloth
        // the two mahouts, seated astride, each holding a hook
        [[-1.2, 0], [1.4, 0]].forEach(([x], i) => { const f = new TT.Group(); f.position.set(x, 6.95, 0); f.rotation.y = Math.PI / 2; p.add(f);
          add(f, lathe([[.75, 0], [.68, 1.0], [.55, 1.9], [.3, 2.2], [0, 2.22]], 16), robe(10), 0, 0, 0).scale.z = .8;
          [-1, 1].forEach(s => limb(f, V3(s * .6, .3, .2), V3(s * 1.4, -1.3, .55), .3, .24, robe(6)));
          head(f, .46, 0, 2.6, .05, i === 0, 0);
          limb(f, V3(.6, 1.6, .2), V3(.8, 1.1, .9), .2, .18, robe(6));
          limb(f, V3(.8, .6, .95), V3(.8, 3.3, .95), .08, .08, iv, 6); const hk = add(f, new TT.TorusGeometry(.28, .07, 6, 12, Math.PI * 1.3), iv, .8 - .28, 3.3, .95); });
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
      // HORSEMAN (Inv.55.319, H 12.4 cm, w 7.9): pointed shield with lozenges, sword in the right hand, head turned to his left
      { const p = new TT.Group();
        const bs = new TT.Shape(); const c = .9; bs.moveTo(-2.6 + c, -4.0); bs.lineTo(2.6 - c, -4.0); bs.lineTo(2.6, -4.0 + c); bs.lineTo(2.6, 4.0 - c); bs.lineTo(2.6 - c, 4.0); bs.lineTo(-2.6 + c, 4.0); bs.lineTo(-2.6, 4.0 - c); bs.lineTo(-2.6, -4.0 + c); bs.closePath();
        add(p, new TT.ExtrudeGeometry(bs, { depth: .6, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1 }), iv, 0, .6, 0).rotation.x = Math.PI / 2;   // the base with cut corners
        ball(p, 1.45, iv, 0, 4.0, 0, .85, .95, 2.05, 20);
        [[-.55, 1.85], [.55, 1.85], [-.55, -1.8], [.55, -1.8]].forEach(([x, z]) => limb(p, V3(x, .6, z), V3(x * .9, 3.4, z * .95), .26, .36, iv, 8));
        limb(p, V3(0, 4.6, 2.2), V3(0, 6.6, 3.0), .75, .55, iv, 12); limb(p, V3(0, 6.9, 2.95), V3(0, 5.9, 4.0), .5, .36, iv, 10);
        add(p, new TT.BoxGeometry(.18, 1.4, 1.9), curly, 0, 6.0, 2.55).rotation.x = .55;
        [-1, 1].forEach(s => add(p, new TT.ConeGeometry(.12, .45, 6), iv, s * .22, 7.25, 2.9));
        limb(p, V3(0, 4.3, -3.2), V3(0, 1.4, -3.7), .32, .18, curly, 8);
        // the rider: legs down the flanks, body, head turned to his left, conical helmet
        [-1, 1].forEach(s => { limb(p, V3(s * .75, 5.4, .3), V3(s * 1.45, 3.4, .6), .42, .34, robe(6)); limb(p, V3(s * 1.45, 3.4, .6), V3(s * 1.35, 1.9, .55), .34, .28, iv); });
        add(p, lathe([[1.15, 0], [1.1, 1.2], [1.05, 2.4], [.8, 3.0], [.4, 3.2], [0, 3.22]], 20), robe(16), 0, 5.2, .1).scale.z = .8;
        head(p, .82, 0, 9.0, .15, false, .55); const hm = add(p, new TT.ConeGeometry(.88, 1.05, 16), iv, 0, 9.75, .15);
        // shield on the left arm (+x), sword raised in the right hand (−x)
        const sh = kite(2.7, 4.6, lozM); sh.position.set(1.45, 6.0, .55); sh.rotation.y = Math.PI / 2 - .35; p.add(sh);
        limb(p, V3(-1.0, 7.6, .1), V3(-1.55, 8.7, .6), .32, .28, robe(6)); ball(p, .3, iv, -1.6, 8.85, .65);
        add(p, new TT.BoxGeometry(.28, 3.2, .09), iv, -1.62, 10.6, .7).rotation.z = .12; add(p, new TT.BoxGeometry(1.1, .16, .2), iv, -1.6, 9.05, .68);
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
