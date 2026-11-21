/* 所蔵品：ルイス島のチェス駒（大英博物館 1831,1101.78–.144 ほか／スコットランド国立博物館） — units: 1 = 1 cm.
   Walrus ivory (a few of whale tooth), probably carved in Norway (Trondheim) c. 1150–1200; found on Lewis in 1831 or earlier.
   Shown: one of each kind as they stand in a case — a king (sword across the knees), a queen (right hand to the cheek),
   a seated bishop (mitre, crozier), a knight on a small horse (spear, kite shield), a warder biting his shield (the
   "berserker") and a slab pawn. Heights follow the museum records of representative pieces (king 9.8, queen 9.6,
   bishop 9.7, knight 10.0, warder 9.2, pawn 4.0 cm); the carving on the thrones (arcades, foliage scrolls) is drawn in the
   manner of the pieces, not copied from one throne (estimate). The red that Madden saw on a few pieces in 1831 is gone today.
   2026-11-21: the ivory's colour (grey-tan, mottled with brown staining) checked against the British Museum's 3D scans (Sketchfab). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).lewis = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1831; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const V3 = (x, y, z) => new TT.Vector3(x, y, z);
      // ---- ivory: warm white with fine growth lines, a little darker / yellower piece by piece, hairline cracks
      const ivoryTex = (k) => K.tex(512, 512, (g, w, h) => {
        K.grain(g, w, h, { a: '#cfc0a0', b: '#c2b190', seed: 40 + k, sx: 1.2, sy: 18, warp: .9 });   // aged walrus ivory, cream to tan (the British Museum's 3D scans)
        const n = K.noise(70 + k); const img = g.getImageData(0, 0, w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 120, y / 120, 4), s = Math.max(0, a - .42) * 150 + (n(x / 14, y / 14, 2) - .5) * 30, i = (y * w + x) * 4; d[i] -= s * .7; d[i + 1] -= s * .8; d[i + 2] -= s * .95; }   // mottled brown staining
        g.putImageData(img, 0, 0);
        g.strokeStyle = 'rgba(90,64,36,.45)'; g.lineWidth = 1;
        for (let q = 0; q < 5; q++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 8; s++) { x += (rnd() - .5) * 18; y += 8 + rnd() * 14; g.lineTo(x, y); } g.stroke(); }
      });
      const IV = [0, 1, 2].map(k => K.mat({ map: ivoryTex(k), color: k === 2 ? '#eedcb8' : '#ffffff', roughness: .5, clearcoat: .18, clearcoatRoughness: .55, sheen: .25, sheenRoughness: .6, sheenColor: K.lin('#fff1d6') }));
      // ---- carving: an ornament drawn white on black is both the relief (bump) and the grime in the cut-back ground
      const carved = (draw, rep) => {
        const W = 512, H = 512, bc = document.createElement('canvas'); bc.width = W; bc.height = H; const b = bc.getContext('2d');
        b.fillStyle = '#000'; b.fillRect(0, 0, W, H); b.strokeStyle = b.fillStyle = '#fff'; b.lineCap = b.lineJoin = 'round'; draw(b, W, H);
        b.filter = 'blur(2px)'; b.drawImage(bc, 0, 0); b.filter = 'none';
        const map = K.tex(W, H, (g, w, h) => {
          K.grain(g, w, h, { a: '#cbbb9a', b: '#bfae8c', seed: 9, sx: 1.2, sy: 18, warp: .9 });
          const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d');
          mg.fillStyle = '#8a6a44'; mg.fillRect(0, 0, w, h); mg.globalCompositeOperation = 'lighter'; mg.drawImage(bc, 0, 0);
          g.globalCompositeOperation = 'multiply'; g.drawImage(m, 0, 0); g.globalCompositeOperation = 'source-over';
        }, rep ? { rep } : {});
        const bump = new TT.CanvasTexture(bc); bump.colorSpace = TT.NoColorSpace; if (rep) { bump.wrapS = bump.wrapT = TT.RepeatWrapping; bump.repeat.set(rep[0], rep[1]); }
        return K.mat({ map, bumpMap: bump, bumpScale: 3, color: '#ffffff', roughness: .5, clearcoat: .12, clearcoatRoughness: .6 });
      };
      // round arches on columns (the commonest throne side)
      const arcade = (g, w, h) => {
        g.lineWidth = 22; g.strokeRect(14, 14, w - 28, h - 28);
        const n = 3, cw = (w - 60) / n;
        for (let i = 0; i < n; i++) { const x0 = 30 + i * cw, x1 = x0 + cw, cx = (x0 + x1) / 2, r = cw / 2 - 6;
          g.lineWidth = 14; g.beginPath(); g.moveTo(x0 + 6, h - 34); g.lineTo(x0 + 6, h * .42); g.arc(cx, h * .42, r, Math.PI, 0); g.lineTo(x1 - 6, h - 34); g.stroke();
          g.lineWidth = 7; g.beginPath(); g.arc(cx, h * .42, r - 18, Math.PI, 0); g.stroke();
          g.beginPath(); g.ellipse(cx, h * .7, r * .5, h * .14, 0, 0, 6.29); g.stroke(); }
      };
      // foliage scrolls: running S-curves with leaves (the Romanesque "acanthus" of the backs)
      const scrolls = (g, w, h) => {
        g.lineWidth = 20; g.strokeRect(12, 12, w - 24, h - 24);
        for (let r = 0; r < 3; r++) { const y = 80 + r * (h - 160) / 2;
          g.lineWidth = 12; g.beginPath(); g.moveTo(40, y);
          for (let x = 40; x < w - 40; x += 108) g.bezierCurveTo(x + 30, y - 60, x + 78, y + 60, x + 108, y);
          g.stroke();
          for (let x = 40; x < w - 60; x += 54) { const up = ((x - 40) / 54) % 2 ? 1 : -1; g.lineWidth = 6; g.beginPath(); g.arc(x + 27, y + up * 30, 20, 0, 6.29); g.stroke();
            g.beginPath(); g.ellipse(x + 27, y + up * 30, 7, 13, up * .6, 0, 6.29); g.fill(); } }
      };
      const sideM = carved(arcade), backM = carved(scrolls);
      // robe folds (vertical pleats running round a lathe) and braided hair
      const pleatBump = (n) => { const t = K.tex(256, 64, (g, w, h) => { for (let x = 0; x < w; x++) { const v = 128 + 110 * Math.sin(x / w * n * Math.PI * 2); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); } }, { data: true }); return t; };
      const robe = (k, n = 22) => K.mat({ map: IV[k].map, bumpMap: pleatBump(n), bumpScale: 1.6, color: IV[k].color, roughness: .46, clearcoat: .15, clearcoatRoughness: .55 });
      const braidT = K.tex(64, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w / 2, y + 8, w * .45, 7, (y / 16) % 2 ? .5 : -.5, 0, 6.29); g.fill(); g.fillStyle = '#000'; g.fillRect(0, y, w, 2); } }, { data: true });
      const braid = k => K.mat({ map: IV[k].map, bumpMap: braidT, bumpScale: 2, color: IV[k].color, roughness: .5 });
      const beardT = K.tex(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.lineWidth = 3; for (let x = 0; x < w; x += 7) { g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h * .4, x - 6, h * .7, x + 2, h); g.stroke(); } }, { data: true });
      const beardM = k => K.mat({ map: IV[k].map, bumpMap: beardT, bumpScale: 2.2, color: IV[k].color, roughness: .5 });
      // ---- the face: big staring eyes, heavy brows, long nose, a down-turned mouth (the pieces' famous glum look)
      const faceM = (k, o = {}) => {
        const W = 512, H = 256, cx = W * .25;
        const draw = (g, bump) => {
          if (!bump) { g.drawImage(IV[k].map.image, 0, 0, W, H); }
          const hi = bump ? '#fff' : 'rgba(0,0,0,0)', lo = bump ? '#000' : 'rgba(96,70,40,.55)', mid = bump ? '#808080' : null;
          if (bump) { g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); }
          g.lineCap = 'round';
          // brows and the nose ridge (raised)
          if (bump) { g.strokeStyle = '#d0d0d0'; g.lineWidth = 9; g.beginPath(); g.moveTo(cx - 40, 98); g.quadraticCurveTo(cx - 20, 90, cx - 4, 100); g.moveTo(cx + 40, 98); g.quadraticCurveTo(cx + 20, 90, cx + 4, 100); g.stroke();
            g.fillStyle = '#e8e8e8'; g.beginPath(); g.moveTo(cx - 5, 100); g.lineTo(cx + 5, 100); g.lineTo(cx + 10, 146); g.lineTo(cx - 10, 146); g.closePath(); g.fill(); }
          // eyes: raised almonds with a drilled pupil
          [-1, 1].forEach(s => { const ex = cx + s * 21, ey = 112;
            g.fillStyle = bump ? '#f4f4f4' : 'rgba(255,250,236,.25)'; g.beginPath(); g.ellipse(ex, ey, 14, 9, 0, 0, 6.29); g.fill();
            g.strokeStyle = lo; g.lineWidth = 2.5; g.stroke();
            g.fillStyle = lo; g.beginPath(); g.arc(ex, ey + 1, 2.6, 0, 6.29); g.fill(); });
          // moustache (drooping) and the mouth
          if (o.beard) { g.strokeStyle = bump ? '#dcdcdc' : 'rgba(120,90,56,.35)'; g.lineWidth = 8; g.beginPath(); g.moveTo(cx - 2, 152); g.quadraticCurveTo(cx - 22, 152, cx - 28, 172); g.moveTo(cx + 2, 152); g.quadraticCurveTo(cx + 22, 152, cx + 28, 172); g.stroke(); }
          g.strokeStyle = lo; g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx - 13, 166); g.quadraticCurveTo(cx, 160, cx + 13, 166); g.stroke();
          if (mid) { }
        };
        const map = K.tex(W, H, g => draw(g, false));
        const bump = K.tex(W, H, g => draw(g, true), { data: true });
        return K.mat({ map, bumpMap: bump, bumpScale: 2.4, color: IV[k].color, roughness: .45, clearcoat: .15, clearcoatRoughness: .5 });
      };
      // ---- helpers
      const add = (p, geo, m, x = 0, y = 0, z = 0) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o; };
      const limb = (p, a, b, r1, r2, m, seg = 10) => { const d = b.clone().sub(a), L = d.length(); const o = add(p, new TT.CylinderGeometry(r2, r1, L, seg, 1), m); o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); return o; };
      const ball = (p, r, m, x, y, z, sx = 1, sy = 1, sz = 1, seg = 18) => { const o = add(p, new TT.SphereGeometry(r, seg, Math.round(seg * .7)), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
      const lathe = (pts, seg = 28) => new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), seg);
      const head = (p, k, y, z, o = {}) => { const h = ball(p, 1.12, faceM(k, o), 0, y, z, 1, 1.13, .96, 26); h.rotation.y = 0; return h; };
      const crown = (p, m, y, r) => { add(p, new TT.CylinderGeometry(r, r * .97, .5, 24, 1, true), m, 0, y, 0).material.side = TT.DoubleSide;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, c = new TT.Group(); c.position.set(Math.sin(a) * r, y + .3, Math.cos(a) * r); c.rotation.y = a;
          [[-.17, .1], [.17, .1], [0, .3]].forEach(([dx, dy]) => { const s = add(c, new TT.SphereGeometry(.15, 10, 7), m, dx, dy, 0); s.scale.z = .5; }); p.add(c); } };
      const helmet = (p, m, y, r) => { const c = add(p, new TT.ConeGeometry(r, 1.35, 22), m, 0, y + .62, 0); add(p, new TT.CylinderGeometry(r * 1.02, r * 1.02, .22, 22), m, 0, y, 0); return c; };
      const kite = (m, w, h) => { const S = new TT.Shape(); S.moveTo(-w / 2, 0); S.quadraticCurveTo(-w / 2, w * .32, 0, w * .36); S.quadraticCurveTo(w / 2, w * .32, w / 2, 0); S.quadraticCurveTo(w * .42, -h * .5, 0, -h + w * .36); S.quadraticCurveTo(-w * .42, -h * .5, -w / 2, 0);
        const g = new TT.ExtrudeGeometry(S, { depth: .14, bevelEnabled: true, bevelThickness: .05, bevelSize: .06, bevelSegments: 2, curveSegments: 10 }); g.translate(0, h / 2 - w * .36, 0); return g; };
      const shieldM = (k) => { const map = IV[k].map, bump = K.tex(128, 256, (g, w, h) => { g.fillStyle = '#404040'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.moveTo(10, h * .38); g.lineTo(w - 10, h * .38); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(w / 2, h * .38, 12, 0, 6.29); g.fill(); }, { data: true });
        bump.repeat.set(1 / 2.2, 1 / 4.2); bump.offset.set(.5, .02); bump.wrapS = bump.wrapT = TT.ClampToEdgeWrapping; return K.mat({ map, bumpMap: bump, bumpScale: 2, color: IV[k].color, roughness: .46, clearcoat: .15 }); };

      // ---- a throne: the seat block (arcaded sides), its scrolled back, the figure's robe falling in front
      const throne = (p, k, o = {}) => {
        const w = o.w || 4.3, d = 3.2, seat = o.seat || 4.2, top = o.top || 7.2;
        const blk = add(p, new TT.BoxGeometry(w, seat, d), [sideM, sideM, IV[k], IV[k], IV[k], backM], 0, seat / 2, -.35);
        const S = new TT.Shape(); const r = w / 2; S.moveTo(-r, seat); S.lineTo(r, seat); S.lineTo(r, top - r * .7); S.absellipse(0, top - r * .7, r, r * .7, 0, Math.PI, false); S.lineTo(-r, seat);
        const bg = new TT.ExtrudeGeometry(S, { depth: .75, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 16 });
        const bm = backM.clone(); bm.map = backM.map.clone(); bm.map.repeat.set(1 / w, 1 / (top - seat)); bm.map.offset.set(.5, -seat / (top - seat)); bm.map.needsUpdate = true; bm.bumpMap = backM.bumpMap.clone(); bm.bumpMap.repeat.copy(bm.map.repeat); bm.bumpMap.offset.copy(bm.map.offset); bm.bumpMap.needsUpdate = true;
        add(p, bg, [bm, IV[k]], 0, 0, -1.95 - .75 + .75);
        // the robe from the knees to the feet, covering the front of the seat; the feet peep out at the hem
        const rb = add(p, lathe([[0, 0], [1.75, 0], [1.72, .25], [1.6, 2], [1.5, seat + .4], [0, seat + .4]], 26), robe(k, 26), 0, 0, .55); rb.scale.set(.92, 1, .55);
        ball(p, .42, IV[k], -.55, .25, 1.5, 1, .55, 1.3, 12); ball(p, .42, IV[k], .55, .25, 1.5, 1, .55, 1.3, 12);
        // the lap and the body
        const lap = add(p, new TT.BoxGeometry(3.1, .95, 2.5, 1, 1, 1), IV[k], 0, seat + .45, .45);
        const tor = add(p, lathe([[1.55, 0], [1.45, .9], [1.35, 1.9], [1.3, 2.6], [1.0, 3.1], [.55, 3.35], [0, 3.38]], 26), robe(k, 24), 0, seat + .5, -.45); tor.scale.z = .78;
        return { seat, top, tor };
      };

      // ---- the pieces
      const pieces = [];
      // KING (1831,1101.78 – 9.8 cm): sword across the knees, gripped by the right hand; crown with four trefoils; beard, braids
      { const p = new TT.Group(), k = 0; const t = throne(p, k); const hy = t.seat + 4.6;
        head(p, k, hy, -.35, { beard: true }); crown(p, IV[k], hy + 1.05, .98);
        ball(p, .78, beardM(k), 0, hy - 1.05, .2, 1, 1.05, .55, 16);
        [-1, 1].forEach(s => limb(p, V3(s * .85, hy - .5, -.95), V3(s * 1.2, t.seat + 2.2, -.9), .3, .26, braid(k), 8));
        limb(p, V3(-1.3, t.seat + 3.1, -.3), V3(-1.05, t.seat + 1.3, .9), .42, .38, robe(k, 10)); limb(p, V3(-1.05, t.seat + 1.3, .9), V3(-1.15, t.seat + 1.2, 1.75), .38, .3, IV[k]);
        limb(p, V3(1.3, t.seat + 3.1, -.3), V3(1.05, t.seat + 1.3, .9), .42, .38, robe(k, 10)); limb(p, V3(1.05, t.seat + 1.3, .9), V3(.9, t.seat + 1.15, 1.75), .38, .3, IV[k]);
        // the sword: scabbard across the lap, hilt and cross-guard at his right
        const sw = new TT.Group(); sw.position.set(0, t.seat + 1.05, 1.82); sw.rotation.z = .08;
        limb(sw, V3(-1.4, 0, 0), V3(2.25, 0, 0), .2, .17, IV[k], 10); add(sw, new TT.BoxGeometry(.18, .95, .3), IV[k], -1.45, 0, 0); limb(sw, V3(-1.5, 0, 0), V3(-2.3, 0, 0), .12, .12, IV[k], 8); ball(sw, .2, IV[k], -2.36, 0, 0);
        p.add(sw); pieces.push(p); }
      // QUEEN (1831,1101.84 – 9.6 cm): right hand to the cheek, the left supporting the elbow; veil over braided hair; crown
      { const p = new TT.Group(), k = 1; const t = throne(p, k, { top: 7.0 }); const hy = t.seat + 4.45;
        head(p, k, hy, -.35); crown(p, IV[k], hy + 1.06, 1.0);
        const veil = add(p, new TT.LatheGeometry([[1.12, 1.1], [1.25, .5], [1.32, -.4], [1.5, -1.25], [1.75, -1.75]].map(([r, y]) => new TT.Vector2(r, y)), 24, Math.PI * .3, Math.PI * 1.4), robe(k, 16), 0, hy, -.4);
        veil.material.side = TT.DoubleSide; veil.scale.z = .85;
        limb(p, V3(-1.35, t.seat + 3.0, -.3), V3(-.95, t.seat + 1.5, .95), .42, .38, robe(k, 10)); limb(p, V3(-.95, t.seat + 1.5, .95), V3(-.55, hy - .55, .75), .36, .3, robe(k, 10)); ball(p, .34, IV[k], -.55, hy - .35, .72, 1, 1.2, .8, 12);
        limb(p, V3(1.35, t.seat + 3.0, -.3), V3(1.1, t.seat + 1.45, .8), .42, .38, robe(k, 10)); limb(p, V3(1.1, t.seat + 1.45, .8), V3(-.75, t.seat + 1.45, 1.15), .36, .3, robe(k, 10)); ball(p, .3, IV[k], -.85, t.seat + 1.5, 1.15);
        pieces.push(p); }
      // BISHOP (1831,1101.90 – 9.7 cm): seated, mitre with its horns front and back, crozier in the left hand, the right raised
      { const p = new TT.Group(), k = 2; const t = throne(p, k, { top: 6.9 }); const hy = t.seat + 4.0;
        head(p, k, hy, -.3);
        // the mitre: a low cap with two pointed horns, one over the brow and one behind (worn the 12th-century way)
        const S = new TT.Shape(); S.moveTo(-1.0, 0); S.lineTo(1.0, 0); S.quadraticCurveTo(1.0, 1.0, 0, 1.75); S.quadraticCurveTo(-1.0, 1.0, -1.0, 0);
        const hg = new TT.ExtrudeGeometry(S, { depth: .22, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 2, curveSegments: 12 }); hg.translate(0, 0, -.11);
        const mitM = carved((g, w, h) => { g.lineWidth = 18; g.beginPath(); g.moveTo(w / 2, h * .12); g.lineTo(w / 2, h); g.moveTo(0, h * .82); g.lineTo(w, h * .82); g.stroke(); });
        mitM.map.repeat.set(1 / 2, 1 / 1.75); mitM.map.offset.set(.5, 0); mitM.bumpMap.repeat.copy(mitM.map.repeat); mitM.bumpMap.offset.copy(mitM.map.offset);
        [1, -1].forEach(s => { const h = add(p, hg, [mitM, IV[k]], 0, hy + .72, -.3 + s * .44); h.rotation.x = s * .1; });
        const cap = add(p, new TT.SphereGeometry(1.0, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), IV[k], 0, hy + .7, -.3); cap.scale.set(1, .95, .7);
        add(p, new TT.CylinderGeometry(1.08, 1.12, .32, 24), IV[k], 0, hy + .78, -.3).scale.z = .82;
        limb(p, V3(-.6, hy + .9, -.3), V3(-.6, hy - .9, -1.1), .1, .1, IV[k], 6); limb(p, V3(.6, hy + .9, -.3), V3(.6, hy - .9, -1.1), .1, .1, IV[k], 6);   // the lappets behind
        // the chasuble's pointed front (a raised band down the chest) and the pallium
        limb(p, V3(0, hy - 1.25, .55), V3(0, t.seat + 1.1, 1.45), .2, .2, IV[k], 8);
        limb(p, V3(-1.35, t.seat + 3.0, -.3), V3(-1.0, t.seat + 1.9, .85), .42, .38, robe(k, 10)); limb(p, V3(-1.0, t.seat + 1.9, .85), V3(-.45, hy - 1.1, 1.0), .34, .3, robe(k, 10)); ball(p, .3, IV[k], -.4, hy - .85, 1.05, .9, 1.3, .7, 12);
        limb(p, V3(1.35, t.seat + 3.0, -.3), V3(1.15, t.seat + 1.6, .85), .42, .38, robe(k, 10)); ball(p, .32, IV[k], 1.25, t.seat + 1.5, 1.1);
        limb(p, V3(1.3, .1, 1.45), V3(1.3, hy + 1.5, 1.05), .13, .13, IV[k], 8);
        const crook = add(p, new TT.TorusGeometry(.48, .11, 8, 20, Math.PI * 1.55), IV[k], 1.3 - .48, hy + 1.5, 1.05); crook.rotation.y = 0;
        pieces.push(p); }
      // KNIGHT (1831,1101.115 – 10.0 cm): bearded, conical helmet, spear upright, kite shield on the left arm, on a stocky pony
      { const p = new TT.Group(), k = 0;
        add(p, new TT.BoxGeometry(2.9, .45, 5.2), IV[k], 0, .225, 0);
        const hm = robe(k, 6);
        ball(p, 1.35, hm, 0, 2.75, -.05, .95, .82, 1.75, 22);
        [[-.62, 1.3], [.62, 1.3], [-.62, -1.4], [.62, -1.4]].forEach(([x, z]) => limb(p, V3(x, .45, z), V3(x * .9, 2.4, z * .95), .32, .4, IV[k], 10));
        limb(p, V3(0, 3.1, 1.55), V3(0, 4.55, 2.15), .7, .5, IV[k], 14);
        const hd = limb(p, V3(0, 4.75, 2.05), V3(0, 3.85, 2.95), .48, .36, IV[k], 12); ball(p, .38, IV[k], 0, 3.82, 2.98, 1, .9, 1.1, 12);
        [-1, 1].forEach(s => { const e = add(p, new TT.ConeGeometry(.12, .4, 8), IV[k], s * .22, 5.1, 2.05); e.rotation.x = -.3; });
        add(p, new TT.BoxGeometry(.18, .55, 1.9), braid(k), 0, 4.2, 1.75).rotation.x = .75;   // the mane
        limb(p, V3(0, 3.0, -2.35), V3(0, .9, -2.6), .3, .2, braid(k), 8);                      // the tail
        // the rider: legs hanging low beside the pony, body, head, helmet
        [-1, 1].forEach(s => { limb(p, V3(s * .95, 3.7, .2), V3(s * 1.28, 2.0, .45), .45, .36, robe(k, 8)); limb(p, V3(s * 1.28, 2.0, .45), V3(s * 1.3, .9, .55), .36, .3, IV[k]); ball(p, .3, IV[k], s * 1.3, .75, .75, 1, .7, 1.5, 10); });
        const tor = add(p, lathe([[1.25, 0], [1.2, .9], [1.15, 1.7], [.95, 2.25], [.5, 2.5], [0, 2.52]], 22), robe(k, 18), 0, 3.6, .05); tor.scale.z = .8;
        head(p, k, 7.0, .05, { beard: true }); ball(p, .7, beardM(k), 0, 6.05, .5, 1, 1, .55, 14); helmet(p, IV[k], 7.55, 1.03);
        // the shield on the left arm (+x), the spear in the right hand
        const sh = add(p, kite(shieldM(k), 2.2, 4.0), shieldM(k), 1.5, 4.6, .4); sh.rotation.y = Math.PI / 2 - .25;
        limb(p, V3(-1.15, 4.3, -.2), V3(-1.3, 4.7, .9), .34, .3, robe(k, 8)); ball(p, .3, IV[k], -1.35, 4.8, 1.0);
        limb(p, V3(-1.35, 1.0, 1.05), V3(-1.35, 9.4, .95), .12, .1, IV[k], 8); const tip = add(p, new TT.ConeGeometry(.2, .65, 8), IV[k], -1.35, 9.72, .95);
        pieces.push(p); }
      // WARDER, a "berserker" (1831,1101.123 – 9.2 cm): standing, helmet, biting the top of his shield, sword in the right hand
      { const p = new TT.Group(), k = 1;
        add(p, new TT.BoxGeometry(3.4, .55, 3.0), IV[k], 0, .275, 0);
        const body = add(p, lathe([[1.55, .55], [1.5, 1.2], [1.3, 3.2], [1.18, 4.3], [1.3, 5.6], [1.15, 6.2], [.6, 6.55], [0, 6.6]], 26), robe(k, 30), 0, 0, -.15); body.scale.z = .74;
        const hy = 7.35; head(p, k, hy, -.1, { beard: true }); ball(p, .66, beardM(k), 0, hy - .95, .45, 1, .95, .5, 14); helmet(p, IV[k], hy + .55, 1.02);
        const sh = add(p, kite(shieldM(k), 2.6, 4.9), shieldM(k), .05, hy - 2.55, 1.0); sh.rotation.x = -.06;
        limb(p, V3(1.25, 5.9, -.2), V3(1.25, 4.6, .6), .42, .36, robe(k, 8)); ball(p, .3, IV[k], 1.1, 4.7, .9);
        limb(p, V3(-1.25, 5.9, -.2), V3(-1.45, 4.4, .45), .42, .36, robe(k, 8)); ball(p, .3, IV[k], -1.5, 4.3, .6);
        const sw = new TT.Group(); sw.position.set(-1.55, 4.3, .6); sw.rotation.z = .12;
        add(sw, new TT.BoxGeometry(.32, 3.9, .1), IV[k], 0, 2.2, 0); add(sw, new TT.BoxGeometry(1.0, .16, .22), IV[k], 0, .28, 0); limb(sw, V3(0, -.6, 0), V3(0, .2, 0), .1, .1, IV[k], 8); p.add(sw);
        pieces.push(p); }
      // PAWN (1831,1101.134 – 4.0 cm): a plain slab with a rounded top
      { const p = new TT.Group(), k = 2;
        const S = new TT.Shape(); S.moveTo(-1.15, 0); S.lineTo(1.15, 0); S.lineTo(1.05, 2.8); S.absarc(0, 2.8, 1.05, 0, Math.PI, false); S.closePath();
        const g = new TT.ExtrudeGeometry(S, { depth: 1.3, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, curveSegments: 18 }); g.translate(0, .12, -.65);
        add(p, g, [IV[k], IV[k]], 0, 0, 0); pieces.push(p); }

      // ---- the case: dark felt on a low block; back row king · queen · bishop · knight, front row warder · pawn
      const feltT = K.tex(256, 256, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data; for (let i = 0; i < w * h; i++) { const v = 34 + n((i % w) / 6, (i / w | 0) / 6, 2) * 16; d[i * 4] = v * 1.05; d[i * 4 + 1] = v * .95; d[i * 4 + 2] = v * .9; d[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [4, 3] });
      const felt = K.mat({ map: feltT, color: '#ffffff', roughness: .96, sheen: .5, sheenRoughness: .9, sheenColor: K.lin('#5a4a40') });
      const base = add(G, new TT.BoxGeometry(25, 1.2, 15), felt, 0, -.6, 0); base.castShadow = false;
      const L = [[-8.4, -1.4, .6], [-2.8, -3.6, .06], [2.8, -3.6, -.06], [8.6, -2.6, -.3], [-3.6, 4.4, .25], [4.4, 4.0, -.2]];
      pieces.forEach((p, i) => { const [x, z, ry] = L[[1, 2, 3, 0, 4, 5][i]] ; p.position.set(x, 0, z); p.rotation.y = ry; G.add(p); });
      return G;
    },
  };
})();
