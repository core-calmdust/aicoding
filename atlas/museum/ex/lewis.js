/* 所蔵品：ルイス島のチェス駒（大英博物館 1831,1101.78–.144 ほか／スコットランド国立博物館） — units: 1 = 1 cm.
   Walrus ivory (a few of whale tooth), probably carved in Norway (Trondheim) c. 1150–1200; found on Lewis in 1831 or earlier.
   Shown: one of each kind as they stand in a case — a king (sword across the knees), a queen (right hand to the cheek),
   a seated bishop (mitre, crozier), a knight on a small horse (spear, kite shield), a warder biting his shield (the
   "berserker") and a slab pawn. Heights follow the museum records of representative pieces (king 9.8, queen 9.6,
   bishop 9.7, knight 10.0, warder 9.2, pawn 4.0 cm); the carving on the thrones (arcades, foliage scrolls) is drawn in the
   manner of the pieces, not copied from one throne (estimate). The red that Madden saw on a few pieces in 1831 is gone today.
   2026-11-21: the ivory's colour (grey-tan, mottled with brown staining) and the seated pieces' build — one squat block with sloping
   shoulders as wide as the throne, a large long head sunk into it, the throne seen only at the sides and behind — after the British
   Museum's 3D scans (Sketchfab); the warder and the knight too (pointed helmets with nose guards over long faces, the pony with a
   large upright head, banded mane and legs carved as solid slabs). */
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

      // ---- the seated pieces, after the British Museum's 3D scans: one compact block — a slab-like body with rounded shoulders
      //      as wide as the throne, a large long head sunk into it, the robe falling in folds in front; the throne shows only at
      //      the sides (arcades) and behind (a back with a rounded top and scrolls)
      const bodyMat = (k, W, H, lapY, o = {}) => {   // the front of the body: mantle edges, folds below the lap (relief + grime)
        const PXW = 384, PXH = Math.round(384 * H / W), s = PXW / W;
        const draw = (g, bump) => {
          if (bump) { g.fillStyle = '#808080'; g.fillRect(0, 0, PXW, PXH); } else g.drawImage(IV[k].map.image, 0, 0, PXW, PXH);
          const Y = y => PXH - y * s, X = x => (x + W / 2) * s, lo = bump ? '#383838' : 'rgba(92,66,38,.32)', hi = bump ? '#c8c8c8' : 'rgba(0,0,0,0)';
          g.lineCap = 'round';
          // the folds of the robe below the lap: broad flat pleats with deep grooves
          const n = o.folds || 6; for (let i = 1; i < n; i++) { const x = -W / 2 + i * W / n + Math.sin(i * 2.1) * .12;
            g.strokeStyle = lo; g.lineWidth = s * .14; g.beginPath(); g.moveTo(X(x), Y(lapY - .5)); g.quadraticCurveTo(X(x + .1), Y(lapY * .5), X(x - .05), Y(.15)); g.stroke();
            if (bump) { g.strokeStyle = hi; g.lineWidth = s * .2; g.beginPath(); g.moveTo(X(x + .3), Y(lapY - .6)); g.lineTo(X(x + .32), Y(.2)); g.stroke(); } }
          // the hem
          g.strokeStyle = lo; g.lineWidth = s * .1; g.beginPath(); g.moveTo(X(-W / 2), Y(.45)); g.lineTo(X(W / 2), Y(.45)); g.stroke();
          // the mantle's edges falling from the shoulders to the lap, with a border
          [-1, 1].forEach(sd => { g.strokeStyle = lo; g.lineWidth = s * .09; for (const dx of [0, .28]) { g.beginPath(); g.moveTo(X(sd * (W / 2 - .9 - dx)), Y(H - .3)); g.quadraticCurveTo(X(sd * (W / 2 - .55 - dx)), Y((H + lapY) / 2), X(sd * (W / 2 - .7 - dx)), Y(lapY + .4)); g.stroke(); } });
          if (!bump) { const n2 = K.noise(300 + k); for (let q = 0; q < 140; q++) { const x = Math.random() * PXW, y = Math.random() * PXH; g.fillStyle = `rgba(100,70,40,${.05 + n2(x / 40, y / 40, 2) * .12})`; g.fillRect(x, y, 2 + Math.random() * 8, 1 + Math.random() * 3); } }
        };
        const map = K.tex(PXW, PXH, g => draw(g, false)), bump = K.tex(PXW, PXH, g => draw(g, true), { data: true });
        [map, bump].forEach(t => { t.repeat.set(1 / W, 1 / H); t.offset.set(.5, 0); });
        return K.mat({ map, bumpMap: bump, bumpScale: 2.6, color: IV[k].color, roughness: .5, clearcoat: .12, clearcoatRoughness: .6 });
      };
      // a long face on an ellipsoid head: big lentoid eyes with drilled pupils, heavy lids, a long straight nose, a small mouth
      const faceS = (k, o = {}) => {
        const W = 512, H = 256, cx = W * .25, ey = o.eye || 78, my = o.mouth || 140;
        const draw = (g, bump) => {
          if (bump) { g.fillStyle = '#808080'; g.fillRect(0, 0, W, H); } else g.drawImage(IV[k].map.image, 0, 0, W, H);
          const lo = bump ? '#202020' : 'rgba(80,56,30,.7)'; g.lineCap = 'round';
          [-1, 1].forEach(sd => { const ex = cx + sd * 17;
            if (bump) { g.fillStyle = '#e0e0e0'; g.beginPath(); g.ellipse(ex, ey, 13, 7.5, 0, 0, 6.29); g.fill(); }
            g.strokeStyle = lo; g.lineWidth = 3; g.beginPath(); g.ellipse(ex, ey, 13, 7.5, 0, 0, 6.29); g.stroke();
            g.lineWidth = 2.2; g.beginPath(); g.ellipse(ex, ey - 1, 16, 10.5, 0, Math.PI * 1.08, Math.PI * 1.92); g.stroke();   // the lid
            g.fillStyle = lo; g.beginPath(); g.arc(ex, ey + .5, 3.6, 0, 6.29); g.fill(); });
          if (bump) { g.fillStyle = '#f0f0f0'; g.beginPath(); g.moveTo(cx - 4, ey - 8); g.lineTo(cx + 4, ey - 8); g.lineTo(cx + 9, my - 16); g.lineTo(cx - 9, my - 16); g.closePath(); g.fill(); }
          g.strokeStyle = lo; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 9, my - 15); g.quadraticCurveTo(cx, my - 11, cx + 9, my - 15); g.stroke();   // nostrils
          g.lineWidth = 3; g.beginPath(); g.moveTo(cx - 9, my); g.quadraticCurveTo(cx, my - 3, cx + 9, my); g.stroke();
          if (o.moustache) { g.strokeStyle = bump ? '#d0d0d0' : 'rgba(110,80,46,.4)'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 2, my - 8); g.quadraticCurveTo(cx - 18, my - 8, cx - 22, my + 8); g.moveTo(cx + 2, my - 8); g.quadraticCurveTo(cx + 18, my - 8, cx + 22, my + 8); g.stroke(); }
        };
        return K.mat({ map: K.tex(W, H, g => draw(g, false)), bumpMap: K.tex(W, H, g => draw(g, true), { data: true }), bumpScale: 3, color: IV[k].color, roughness: .45, clearcoat: .12, clearcoatRoughness: .55 });
      };
      const seated = (p, k, o) => {
        const W = o.w, H = o.sh, D = 3.4, lapY = o.lap, z0 = -1.9, HZ = 1.3;
        // the body block with rounded shoulders
        const S = new TT.Shape(), r = o.r || 1.0; S.moveTo(-W / 2, 0); S.lineTo(W / 2, 0); S.lineTo(W / 2, H - r); S.quadraticCurveTo(W / 2, H, W / 2 - r, H); S.lineTo(-W / 2 + r, H); S.quadraticCurveTo(-W / 2, H, -W / 2, H - r); S.closePath();
        const bg = new TT.ExtrudeGeometry(S, { depth: D, bevelEnabled: true, bevelThickness: .25, bevelSize: .22, bevelSegments: 4, curveSegments: 12 });
        add(p, bg, [bodyMat(k, W, H, lapY, o), IV[k]], 0, 0, z0);
        // the throne: arcaded sides low down, the back behind the shoulders with a rounded top and scrolls
        [-1, 1].forEach(sd => { const sp = add(p, new TT.BoxGeometry(.12, lapY + .2, D - .6), [sideM, sideM, IV[k], IV[k], IV[k], IV[k]], sd * (W / 2 + .2), (lapY + .2) / 2, z0 + D / 2 - .2); });
        const B = new TT.Shape(), bw = W * .5; B.moveTo(-bw, 0); B.lineTo(bw, 0); B.lineTo(bw, o.back - bw * .55); B.absellipse(0, o.back - bw * .55, bw, bw * .55, 0, Math.PI, false); B.lineTo(-bw, 0);
        const bk = new TT.ExtrudeGeometry(B, { depth: .7, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 2, curveSegments: 16 });
        const bm = backM.clone(); bm.map = backM.map.clone(); bm.map.repeat.set(1 / W, 1 / o.back); bm.map.offset.set(.5, 0); bm.map.needsUpdate = true; bm.bumpMap = backM.bumpMap.clone(); bm.bumpMap.repeat.copy(bm.map.repeat); bm.bumpMap.offset.copy(bm.map.offset); bm.bumpMap.needsUpdate = true;
        add(p, bk, [bm, IV[k]], 0, 0, z0 - .75);
        // the head, sunk into the shoulders and standing forward of the body
        const hd = ball(p, 1, faceS(k, o.face || {}), 0, o.hy, HZ, o.hw, o.hh, .95, 30);
        return { W, H, D, lapY, front: z0 + D + .25, hd };
      };
      const hands = (p, k, x, y, z, ry = 0) => { const h = add(p, new TT.BoxGeometry(.62, .78, .5), IV[k], x, y, z); h.rotation.y = ry;
        const fb = K.tex(64, 64, (g, w) => { g.fillStyle = '#909090'; g.fillRect(0, 0, w, w); g.fillStyle = '#202020'; for (let i = 1; i < 4; i++) g.fillRect(0, i * w / 4 - 1, w, 2.5); }, { data: true }); h.material = K.mat({ map: IV[k].map, bumpMap: fb, bumpScale: 2, color: IV[k].color, roughness: .5 }); return h; };

      // ---- the pieces
      const pieces = [];
      // KING (1831,1101.78 – 9.8 cm): the sword across the knees in both hands; crown of four tall trefoil points; long beard
      { const p = new TT.Group(), k = 0;
        const t = seated(p, k, { w: 4.7, sh: 5.9, r: 1.6, lap: 3.6, back: 6.4, hy: 6.45, hw: 1.22, hh: 1.55, folds: 6, face: { eye: 74, mouth: 128, moustache: true } });
        ball(p, 1, beardM(k), 0, 5.3, 2.05, .95, 1.05, .5, 18);
        const CY = 6.45 + 1.55 * .66, cr = add(p, new TT.CylinderGeometry(1.0, 1.08, .6, 28, 1, true), IV[k], 0, CY, 1.3); cr.material = IV[k].clone(); cr.material.side = TT.DoubleSide; cr.scale.z = .85;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, x = Math.sin(a) * 1.0, z = 1.3 + Math.cos(a) * .88;
          const pt = add(p, new TT.BoxGeometry(.85, .7, .16), IV[k], x, CY + .6, z); pt.rotation.y = a; const tp = add(p, new TT.SphereGeometry(.42, 12, 8), IV[k], x, CY + 1.0, z); tp.scale.set(1, .75, .4); tp.rotation.y = a; }
        // the arms close to the body, the hands holding the sword across the lap
        [-1, 1].forEach(sd => { limb(p, V3(sd * 1.95, 6.2, 1.1), V3(sd * 2.15, 4.4, 1.35), .5, .46, robe(k, 10)); limb(p, V3(sd * 2.15, 4.4, 1.35), V3(sd * 1.95, 3.35, 1.85), .46, .4, robe(k, 10)); hands(p, k, sd * 1.95, 3.25, 2.1); });
        limb(p, V3(-2.3, 3.2, 2.05), V3(2.3, 3.2, 2.05), .33, .33, IV[k], 14);
        pieces.push(p); }
      // QUEEN (1831,1101.84 – 9.6 cm): right hand to the cheek, the left holding the right elbow; a veil over the head, crown
      { const p = new TT.Group(), k = 1;
        const t = seated(p, k, { w: 4.6, sh: 5.8, r: 1.6, lap: 3.5, back: 6.3, hy: 6.5, hw: 1.15, hh: 1.5, folds: 7, face: { eye: 80, mouth: 134 } });
        const veil = add(p, new TT.LatheGeometry([[1.12, .9], [1.25, .3], [1.3, -.6], [1.55, -1.4], [1.8, -1.8]].map(([r, y]) => new TT.Vector2(r, y)), 24, Math.PI * .28, Math.PI * 1.44), robe(k, 16), 0, 6.5, 1.25);
        veil.material.side = TT.DoubleSide; veil.scale.z = .9;
        const CY = 6.5 + 1.5 * .66, cr = add(p, new TT.CylinderGeometry(1.0, 1.06, .55, 28, 1, true), IV[k], 0, CY, 1.3); cr.material = IV[k].clone(); cr.material.side = TT.DoubleSide; cr.scale.z = .85;
        for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, x = Math.sin(a) * 1.0, z = 1.3 + Math.cos(a) * .85; const pt = add(p, new TT.BoxGeometry(.55, .8, .16), IV[k], x, CY + .62, z); pt.rotation.y = a; const tp = add(p, new TT.SphereGeometry(.3, 12, 8), IV[k], x, CY + 1.05, z); tp.scale.set(1, .75, .4); tp.rotation.y = a; }
        // right hand to the right cheek (her right = −x), the left hand under the right elbow
        limb(p, V3(-1.9, 6.0, 1.1), V3(-1.55, 4.3, 1.75), .5, .45, robe(k, 10)); limb(p, V3(-1.55, 4.3, 1.75), V3(-1.05, 5.9, 1.75), .42, .36, robe(k, 10)); hands(p, k, -1.0, 6.25, 1.65, .3);
        limb(p, V3(1.9, 6.0, 1.1), V3(2.0, 4.2, 1.5), .5, .45, robe(k, 10)); limb(p, V3(2.0, 4.2, 1.5), V3(-1.1, 4.1, 2.0), .42, .38, robe(k, 10)); hands(p, k, -1.3, 4.15, 2.05);
        pieces.push(p); }
      // BISHOP (1831,1101.90 – 9.7 cm): mitre with its points front and back, crozier in the left hand, the right on the chest
      { const p = new TT.Group(), k = 2;
        const t = seated(p, k, { w: 4.5, sh: 5.6, r: 1.6, lap: 3.5, back: 6.2, hy: 6.3, hw: 1.15, hh: 1.45, folds: 6, face: { eye: 82, mouth: 136 } });
        const Sm = new TT.Shape(); Sm.moveTo(-1.05, 0); Sm.lineTo(1.05, 0); Sm.quadraticCurveTo(1.05, 1.1, 0, 1.9); Sm.quadraticCurveTo(-1.05, 1.1, -1.05, 0);
        const hg = new TT.ExtrudeGeometry(Sm, { depth: .22, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 2, curveSegments: 12 }); hg.translate(0, 0, -.11);
        [1, -1].forEach(sd => { const h = add(p, hg, IV[k], 0, 7.45, 1.3 + sd * .5); h.rotation.x = sd * .08; });
        const cap = add(p, new TT.SphereGeometry(1.08, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), IV[k], 0, 7.45, 1.3); cap.scale.set(1, .95, .62);
        add(p, new TT.CylinderGeometry(1.18, 1.2, .34, 24), IV[k], 0, 7.55, 1.3).scale.z = .8;
        limb(p, V3(0, 4.9, 2.1), V3(0, .3, 2.2), .22, .22, IV[k], 8);   // the orphrey down the front
        limb(p, V3(-1.9, 6.0, 1.1), V3(-1.8, 4.4, 1.6), .5, .45, robe(k, 10)); limb(p, V3(-1.8, 4.4, 1.6), V3(-.6, 4.9, 2.1), .42, .36, robe(k, 10)); hands(p, k, -.4, 5.0, 2.25);
        limb(p, V3(1.9, 6.0, 1.1), V3(2.0, 4.3, 1.5), .5, .45, robe(k, 10)); hands(p, k, 1.55, 4.0, 2.1);
        limb(p, V3(1.55, .2, 2.2), V3(1.55, 8.3, 1.9), .14, .14, IV[k], 8);
        const crook = add(p, new TT.TorusGeometry(.5, .12, 8, 20, Math.PI * 1.55), IV[k], 1.55 - .5, 8.3, 1.9);
        pieces.push(p); }
      // KNIGHT (1831,1101.115 – 10.0 cm): bearded, conical helmet, spear upright, kite shield on the left arm, on a stocky pony
      { const p = new TT.Group(), k = 0;
        add(p, new TT.BoxGeometry(2.9, .45, 5.2), IV[k], 0, .225, 0);
        const hm = robe(k, 6);
        ball(p, 1.35, hm, 0, 2.75, -.05, .95, .82, 1.75, 22);
        [1.25, -1.35].forEach(z => { const lg = add(p, new TT.BoxGeometry(1.7, 2.1, .85), robe(k, 4), 0, 1.45, z); });   // the legs carved as two solid slabs (front and back pairs), as in the scan
        // the pony's head: large and upright before the rider's chest, a broad striped mane down its neck (the scan)
        limb(p, V3(0, 3.0, 1.6), V3(0, 4.9, 2.1), .95, .8, IV[k], 16);
        const hd = ball(p, 1, IV[k], 0, 4.6, 2.75, .8, 1.25, .75, 18); hd.rotation.x = .35;
        [-1, 1].forEach(s => { const e = add(p, new TT.ConeGeometry(.16, .5, 8), IV[k], s * .3, 5.85, 2.35); e.rotation.x = -.2; });
        const mane = add(p, new TT.BoxGeometry(1.75, 1.9, .3), braid(k), 0, 4.75, 1.45); mane.rotation.x = .25;   // the mane, combed in bands
        limb(p, V3(0, 3.0, -2.35), V3(0, .9, -2.6), .3, .2, braid(k), 8);                      // the tail
        // the rider: legs hanging low beside the pony, body, head, helmet
        [-1, 1].forEach(s => { limb(p, V3(s * .95, 3.7, .2), V3(s * 1.28, 2.0, .45), .45, .36, robe(k, 8)); limb(p, V3(s * 1.28, 2.0, .45), V3(s * 1.3, .9, .55), .36, .3, IV[k]); ball(p, .3, IV[k], s * 1.3, .75, .75, 1, .7, 1.5, 10); });
        const tor = add(p, lathe([[1.25, 0], [1.2, .9], [1.15, 1.7], [.95, 2.25], [.5, 2.5], [0, 2.52]], 22), robe(k, 18), 0, 3.6, .05); tor.scale.z = .8;
        ball(p, 1, faceS(k, { eye: 92, mouth: 150, moustache: true }), 0, 7.0, .05, 1.05, 1.3, .95, 28); ball(p, .9, beardM(k), 0, 5.95, .5, .95, 1.0, .5, 14);
        add(p, new TT.ConeGeometry(1.1, 2.1, 24), IV[k], 0, 8.75, .05); add(p, new TT.BoxGeometry(.24, .9, .2), IV[k], 0, 7.65, 1.0);   // pointed helmet, nose guard
        // the shield on the left arm (+x), the spear in the right hand
        const sh = add(p, kite(shieldM(k), 2.2, 4.0), shieldM(k), 1.5, 4.6, .4); sh.rotation.y = Math.PI / 2 - .25;
        limb(p, V3(-1.15, 4.3, -.2), V3(-1.3, 4.7, .9), .34, .3, robe(k, 8)); ball(p, .3, IV[k], -1.35, 4.8, 1.0);
        limb(p, V3(-1.35, 1.0, 1.05), V3(-1.35, 9.4, .95), .12, .1, IV[k], 8); const tip = add(p, new TT.ConeGeometry(.2, .65, 8), IV[k], -1.35, 9.72, .95);
        pieces.push(p); }
      // WARDER (1831,1101.123 – 9.2 cm), after the British Museum's scan: no base plate; a slender bell-shaped body; a tall pointed
      // helmet with a nose guard that runs straight into the long face and beard; a long kite shield held in front, the sword upright
      // in the right hand before it
      { const p = new TT.Group(), k = 1;
        const body = add(p, lathe([[1.75, 0], [1.72, .3], [1.5, 2.5], [1.32, 4.4], [1.38, 5.6], [1.15, 6.2], [.6, 6.5], [0, 6.55]], 26), robe(k, 30), 0, 0, -.15); body.scale.z = .72;
        const hy = 6.75; ball(p, 1, faceS(k, { eye: 92, mouth: 150, moustache: true }), 0, hy, .05, 1.08, 1.35, .95, 28);
        ball(p, 1, beardM(k), 0, hy - 1.2, .55, .9, 1.0, .5, 16);
        const hc = add(p, new TT.ConeGeometry(1.12, 2.3, 24), IV[k], 0, hy + 1.65, .05); hc.scale.z = .95;   // the pointed helmet, no brim
        add(p, new TT.BoxGeometry(.24, 1.0, .2), IV[k], 0, hy + .45, 1.05);                                  // the nose guard
        const sh = add(p, kite(shieldM(k), 2.5, 5.3), shieldM(k), .25, 3.0, 1.15); sh.rotation.x = -.04;
        limb(p, V3(1.3, 5.6, -.2), V3(1.35, 4.2, .7), .42, .36, robe(k, 8)); ball(p, .3, IV[k], 1.2, 4.4, 1.15);
        limb(p, V3(-1.3, 5.6, -.2), V3(-1.4, 4.0, .9), .42, .36, robe(k, 8)); ball(p, .34, IV[k], -1.25, 3.95, 1.45);
        const sw = new TT.Group(); sw.position.set(-1.2, 3.95, 1.5); sw.rotation.z = -.08;
        add(sw, new TT.BoxGeometry(.3, 3.7, .1), IV[k], 0, 2.1, 0); add(sw, new TT.BoxGeometry(.9, .16, .22), IV[k], 0, .26, 0); limb(sw, V3(0, -.6, 0), V3(0, .2, 0), .1, .1, IV[k], 8); p.add(sw);
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
