/* 所蔵品：ルイス島のチェス駒（大英博物館 1831,1101.78–.144 ほか／スコットランド国立博物館） — units: 1 = 1 cm.
   Walrus ivory (a few of whale tooth), probably carved in Norway (Trondheim) c. 1150–1200; found on Lewis in 1831 or earlier.
   Shown: one of each kind as they stand in a case — a king (sword across the knees), a queen (right hand to the cheek),
   a seated bishop (mitre, crozier), a knight on a small horse (spear, kite shield), a warder biting his shield (the
   "berserker") and a slab pawn. Heights follow the museum records of representative pieces (king 9.8, queen 9.6,
   bishop 9.7, knight 10.0, warder 9.2, pawn 4.0 cm); the carving on the thrones (arcades, foliage scrolls) is drawn in the
   manner of the pieces, not copied from one throne (estimate). The red that Madden saw on a few pieces in 1831 is gone today.
   2026-11-21 (after the British Museum's 3D scans, Sketchfab): each figure is a carved block (kit.relief) — a height painting for its front
   and one for its back, the outline cut from the block: squat seated figures whose thrones show only behind (scrolls, lattice, arcade),
   long faces with bulging eyes, the king's sword across his knees, the queen's hand to her cheek, the bishop's crozier and blessing hand,
   the knight on his low-headed pony under a fringed caparison, the warder biting his shield. Ivory grey-tan with brown in the cuts. */
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
      // ---- the figures are carved blocks (kit.relief): a height painting for the front and one for the back of each piece, after the
      //      British Museum's 3D scans. Painters work in centimetres (x from the middle, y up from the base).
      const sh = (g, c, a) => { g.fillStyle = g.strokeStyle = `rgba(${c},${c},${c},${a})`; };
      const path = (g, pts, close) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
        g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); if (close) g.closePath(); };
      // a soft ridge (amt > 0) or groove (amt < 0) along a curve; a soft round bump or hollow; a flat raised / sunk area
      const line = (g, pts, w, amt) => { sh(g, amt > 0 ? 255 : 0, Math.abs(amt) / 2.6); for (const k of [1, .62, .3]) { g.lineWidth = w * k; path(g, pts); g.stroke(); } };
      const blob = (g, x, y, rx, ry, amt, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.scale(rx, ry); const c = amt > 0 ? 255 : 0, a = Math.abs(amt), gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        gr.addColorStop(0, `rgba(${c},${c},${c},${a})`); gr.addColorStop(.55, `rgba(${c},${c},${c},${a * .7})`); gr.addColorStop(1, `rgba(${c},${c},${c},0)`); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 1, 0, 6.29); g.fill(); g.restore(); };
      const area = (g, pts, amt) => { sh(g, amt > 0 ? 255 : 0, Math.abs(amt)); path(g, pts, true); g.fill(); };
      const both = fn => { fn(1); fn(-1); };
      // the long face of the Lewis figures: heavy brows, bulging almond eyes, a long wedge of a nose, a small set mouth
      const face = (g, ey, o = {}) => {
        blob(g, 0, ey - .35, 1.35, 1.75, .5); both(s => blob(g, s * .62, ey - .62, .5, .45, .25));   // the head stands out from the block; the cheeks
        both(s => { line(g, [[s * .98, ey + .3], [s * .5, ey + .4], [s * .14, ey + .28]], .2, .55);
          blob(g, s * .52, ey, .4, .26, .8); sh(g, 0, .6); g.lineWidth = .07; g.beginPath(); g.ellipse(s * .52, ey, .36, .21, 0, 0, 6.29); g.stroke(); g.beginPath(); g.arc(s * .52, ey, .075, 0, 6.29); g.fill();
          blob(g, s * .66, ey - .5, .32, .3, -.22); });
        area(g, [[-.13, ey + .22], [.13, ey + .22], [.3, ey - .62], [0, ey - .72], [-.3, ey - .62]], .75); blob(g, 0, ey - .55, .34, .2, .5);
        line(g, [[-.28, ey - .98], [0, ey - .94], [.28, ey - .98]], .1, -.85);
        if (o.beard) { both(s => line(g, [[s * .06, ey - .8], [s * .5, ey - .86], [s * .82, ey - 1.1]], .2, .5));
          area(g, [[-.98, ey - .7], [-.95, ey - 1.5], [-.5, ey - 2.05], [0, ey - 2.2], [.5, ey - 2.05], [.95, ey - 1.5], [.98, ey - .7], [.4, ey - 1.12], [0, ey - 1.08], [-.4, ey - 1.12]], .5);
          for (let x = -.78; x <= .79; x += .195) line(g, [[x, ey - 1.15], [x * .85, ey - 2.08 + Math.abs(x) * .5]], .06, -.7); }
        else line(g, [[-.5, ey - 1.45], [0, ey - 1.6], [.5, ey - 1.45]], .1, -.3);   // the chin
      };
      // hair in long twisted locks down the back and over the shoulders
      const locks = (g, list) => list.forEach(pts => { line(g, pts, .26, .5); const n = 7; for (let k = 1; k < n; k++) { const t = k / n, i = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), f = t * (pts.length - 1) - i, x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f; line(g, [[x - .12, y + .07], [x + .12, y - .07]], .05, -.6); } });
      // the robe over the knees, falling to the feet in flat pleats
      const robe = (g, top = 3.0, w = 2.3) => { both(s => blob(g, s * 1.15, top + .2, 1.0, .75, .6));
        for (let k = -3; k <= 3; k++) { const x = k * w / 3.3; line(g, [[x, top], [x * 1.03, top * .55], [x * 1.06, .45]], .11, -.7); line(g, [[x + .33, top - .1], [x * 1.03 + .33, top * .55], [x * 1.06 + .34, .5]], .3, .22); }
        line(g, [[-w - .2, .42], [w + .2, .42]], .08, -.6); line(g, [[-w - .2, .2], [w + .2, .2]], .12, .3); both(s => blob(g, s * .72, .34, .42, .24, .65)); };
      // the back of a throne: a framed panel of foliage scrolls, or an arcade
      const spiral = (cx, cy, r, turn, dir, a0) => { const pts = []; for (let k = 0; k <= 22; k++) { const t = k / 22, a = a0 + dir * t * turn, rr = r * (1 - t * .86); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return pts; };
      const throneBack = (g, kind, w = 2.15, top = 5.55) => {
        area(g, [[-w, .55], [-w, top], [w, top], [w, .55]], -.3);
        sh(g, 255, .55); g.lineWidth = .26; g.strokeRect(-w, .55, 2 * w, top - .55); g.lineWidth = .08; sh(g, 0, .5); g.strokeRect(-w + .22, .77, 2 * w - .44, top - .99);
        if (kind === 'scroll') { both(s => { [[4.15, 1], [2.0, -1]].forEach(([cy, d]) => { line(g, spiral(s * 1.0, cy, .82, 9.4, s * d, s > 0 ? 3.3 : -.15), .17, .85); blob(g, s * 1.0, cy, .2, .2, .7);
              blob(g, s * .28, cy + d * .78, .34, .17, .7, s * d * .8); blob(g, s * 1.78, cy - d * .85, .3, .15, .7, -s * d * .7); });
            line(g, [[s * .15, 1.0], [s * .2, 3.05], [s * .95, 3.1]], .15, .8); }); line(g, [[0, .9], [0, 5.2]], .14, .8); }
        else if (kind === 'arcade') { for (let k = -1; k <= 1; k++) { const cx = k * 1.3; line(g, [[cx - .5, .95], [cx - .5, 3.9], [cx - .45, 4.5], [cx, 4.85], [cx + .45, 4.5], [cx + .5, 3.9], [cx + .5, .95]], .16, .85);
              line(g, [[cx, 1.2], [cx, 3.6]], .12, .6); both(s => blob(g, cx + s * .22, 3.9, .16, .3, .6, s * .5)); } line(g, [[-w + .3, 5.1], [w - .3, 5.1]], .14, .7); }
        else { for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) { const cx = c * .82 + (r % 2 ? .41 : 0), cy = 1.3 + r * 1.12; if (Math.abs(cx) > w - .45) continue;
              line(g, [[cx - .4, cy], [cx, cy + .55], [cx + .4, cy], [cx, cy - .55], [cx - .4, cy]], .13, .8); blob(g, cx, cy, .13, .13, .7); } }
      };
      const ivC = IV.map(m => m.map.image), DIRT = [112, 78, 44];
      const carve = (k, o) => K.relief(Object.assign({ px: 384, depth: 1.7, round: .55, relief: .5, nx: 32, tex: ivC[k], dirt: DIRT, dirtK: .55, bump: 1.5, mat: { roughness: .5, clearcoat: .14, clearcoatRoughness: .55, color: IV[k].color } }, o));
      // the outline of a seated figure: the throne and body as one block, the head rising from sloping shoulders
      const seatedMask = (g, head) => { g.fillStyle = '#fff'; path(g, [[-2.6, -1], [-2.6, 4.9], [-2.6, 6.6], [-1.3, 6.85], [1.3, 6.85], [2.6, 6.6], [2.6, 4.9], [2.6, -1]], true); g.fill();
        g.beginPath(); g.ellipse(0, 7.45, 1.34, 1.3, 0, 0, 6.29); g.fill(); g.fillRect(-1.25, 6.4, 2.5, 1.1); head(g); };
      const seatedThick = (g) => { g.fillStyle = 'rgb(238,238,238)'; g.fillRect(-4, 6.75, 8, 6); };
      const crownMask = g => { g.fillRect(-1.42, 7.95, 2.84, .85); [-1.06, 0, 1.06].forEach(x => { g.fillRect(x - .3, 8.7, .6, .62); g.beginPath(); g.arc(x, 9.4, .4, 0, 6.29); g.fill(); }); };
      const crownCarve = g => { line(g, [[-1.4, 8.36], [1.4, 8.36]], .52, .5); for (let x = -1.2; x <= 1.21; x += .3) { sh(g, 0, .6); g.beginPath(); g.arc(x, 8.36, .07, 0, 6.29); g.fill(); }
        line(g, [[-1.45, 8.08], [1.45, 8.08]], .07, -.6); line(g, [[-1.45, 8.66], [1.45, 8.66]], .07, -.6); [-1.06, 0, 1.06].forEach(x => { blob(g, x, 9.4, .3, .3, .45); line(g, [[x, 8.75], [x, 9.2]], .06, -.5); }); };
      // ---- carved in the round (kit.loft): the block's cross-sections from the foot up, then a height painting for each of its four faces.
      // (The photographs: a squat block — the throne a squared slab as wide as the figure, the lap pushed forward under the sword, the
      // shoulders sloping to a round head, the crown or mitre a drum above it.)
      const SEAT = top => [[0, 5.2, 3.7, 0, 7], [.45, 5.2, 3.7, 0, 7], [2.9, 5.2, 3.8, .05, 6], [3.5, 5.2, 4.1, .2, 5], [4.1, 5.1, 3.7, .05, 5], [5.5, 4.9, 3.2, -.12, 4.5], [6.5, 4.5, 3.0, -.12, 3.4], [6.95, 3.3, 2.7, 0, 2.5], [7.5, 3.0, 2.9, .05, 2.2], [8.1, 2.9, 2.8, .05, 2.2]].concat(top);
      const CROWN = [[8.35, 3.15, 3.05, 0, 2.2], [9.45, 3.4, 3.3, 0, 2.2], [9.8, 3.3, 3.2, 0, 2.2]];
      const MITRE = [[8.3, 2.9, 2.6, 0, 2.6], [9.0, 2.5, 2.0, 0, 3], [9.7, .9, 1.2, 0, 3]];
      const WARD = [[0, 4.3, 3.0, 0, 6], [.5, 4.3, 3.0, 0, 6], [4.6, 3.9, 2.9, .1, 4.5], [5.9, 3.7, 2.7, 0, 3.6], [6.5, 2.6, 2.4, 0, 2.5], [7.3, 2.6, 2.6, 0, 2.2], [8.0, 2.4, 2.4, 0, 2.3], [9.2, .5, .5, 0, 2.2]];
      // a throne's side: a framed panel with a plait cut into it
      const throneSide = g => { area(g, [[-1.5, .55], [-1.5, 5.3], [1.5, 5.3], [1.5, .55]], -.3); sh(g, 255, .5); g.lineWidth = .22; g.strokeRect(-1.5, .55, 3, 4.75);
        for (let r = 0; r < 4; r++) { const cy = 1.2 + r * 1.1; line(g, [[-1.1, cy - .4], [0, cy + .45], [1.1, cy - .4]], .15, .8); line(g, [[-1.1, cy + .45], [0, cy - .4], [1.1, cy + .45]], .15, .8); } };
      const stat = (k, o) => K.loft(Object.assign({ h: o.h, px: 384, seg: 14, rows: 66, relief: .22, tex: ivC[k], dirt: DIRT, dirtK: .7, bump: 1.6, left: throneSide, right: throneSide, cap: { color: IV[k].color }, mat: { roughness: .5, clearcoat: .14, clearcoatRoughness: .55, color: IV[k].color } }, o));
      const add = (pp, geo, m, x = 0, y = 0, z = 0) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; pp.add(o); return o; };
      const pieces = [];
      // KING (1831,1101.78 – 9.8 cm): the sword in its scabbard across the knees, a hand at each end; crown of trefoils; long beard, locks on the shoulders
      { const g0 = stat(0, { h: 9.8, sections: SEAT(CROWN), mask: g => seatedMask(g, crownMask), thick: seatedThick,
          front: g => { face(g, 7.5, { beard: true }); crownCarve(g);
            locks(g, [[[-1.15, 7.7], [-1.5, 6.9], [-1.75, 5.9]], [[-1.3, 7.3], [-1.85, 6.6], [-2.2, 5.7]], [[1.15, 7.7], [1.5, 6.9], [1.75, 5.9]], [[1.3, 7.3], [1.85, 6.6], [2.2, 5.7]]]);
            both(s => { line(g, [[s * 1.25, 6.5], [s * 1.75, 5.4], [s * 1.6, 4.1]], .1, -.65); line(g, [[s * 1.5, 6.55], [s * 2.0, 5.4], [s * 1.86, 4.1]], .1, -.65);   // the mantle's border
              line(g, [[s * 2.3, 5.5], [s * 2.38, 4.4], [s * 2.0, 3.75]], .75, .4); });
            line(g, [[-.9, 5.0], [0, 4.45], [.9, 5.0]], .09, -.55); line(g, [[-.75, 4.55], [0, 4.1], [.75, 4.55]], .09, -.5);
            line(g, [[-2.4, 3.5], [2.4, 3.5]], .66, .85); line(g, [[-2.4, 3.86], [2.4, 3.86]], .06, -.6); line(g, [[-2.4, 3.14], [2.4, 3.14]], .06, -.6); [-1.1, -.9, .8, 1.0].forEach(x => line(g, [[x, 3.2], [x, 3.8]], .05, -.5));
            both(s => { blob(g, s * 1.85, 3.52, .52, .46, .6); [1.62, 1.84, 2.06].forEach(x => line(g, [[s * x, 3.22], [s * x, 3.84]], .05, -.65)); });
            robe(g, 2.95); },
          back: g => { throneBack(g, 'scroll'); crownCarve(g); locks(g, [-2, -1, 0, 1, 2].map(k => [[k * .42, 7.85], [k * .52, 6.9], [k * .62, 5.8]])); } });
        pieces.push(g0); }
      // QUEEN (1831,1101.84 – 9.6 cm): the right hand to the cheek, the left under the right elbow; a veil under the crown
      { const g0 = stat(1, { h: 9.6, sections: SEAT(CROWN).map(q => [q[0] * 9.6 / 9.8, q[1], q[2], q[3], q[4]]), mask: g => seatedMask(g, gg => { crownMask(gg); gg.beginPath(); gg.ellipse(0, 7.1, 1.62, 1.1, 0, 0, 6.29); gg.fill(); }), thick: seatedThick,
          front: g => { face(g, 7.45); crownCarve(g);
            both(s => { line(g, [[s * 1.05, 7.95], [s * 1.5, 7.2], [s * 1.7, 6.2], [s * 1.5, 5.6]], .5, .4); line(g, [[s * 1.0, 7.6], [s * 1.28, 6.9], [s * 1.2, 6.1]], .07, -.55);   // the veil
              line(g, [[s * 1.5, 6.5], [s * 2.0, 5.3], [s * 1.9, 4.1]], .1, -.6); });
            line(g, [[-2.2, 4.3], [-1.5, 4.9], [-1.05, 6.2]], .7, .55); blob(g, -.98, 6.55, .42, .5, .65); [-1.15, -.98, -.8].forEach(x => line(g, [[x, 6.3], [x + .05, 6.95]], .05, -.6));   // right hand to the cheek
            line(g, [[2.3, 5.2], [2.2, 4.3], [-.9, 4.05]], .68, .5); blob(g, -1.2, 4.1, .45, .4, .55); [-1.4, -1.2, -1.0].forEach(x => line(g, [[x, 3.85], [x, 4.4]], .05, -.6));
            line(g, [[-.2, 5.9], [.3, 5.2], [.9, 4.7]], .09, -.5); line(g, [[.2, 6.0], [.8, 5.4], [1.4, 5.0]], .09, -.5);
            robe(g, 3.1); },
          back: g => { throneBack(g, 'lattice'); crownCarve(g); line(g, [[-1.3, 7.9], [-1.65, 6.9], [-1.5, 5.75]], .1, -.55); line(g, [[1.3, 7.9], [1.65, 6.9], [1.5, 5.75]], .1, -.55);
            [-1, 0, 1].forEach(k => line(g, [[k * .5, 7.8], [k * .62, 6.8], [k * .7, 5.8]], .08, -.45)); } });
        pieces.push(g0); }
      // BISHOP (1831,1101.90 – 9.7 cm): seated, the mitre's point to the front, the crozier in the left hand, the right raised in blessing
      { const g0 = stat(2, { h: 9.7, sections: SEAT(MITRE),
          mask: g => seatedMask(g, gg => { path(gg, [[-1.36, 7.7], [-1.36, 8.25], [-.75, 9.0], [0, 9.72], [.75, 9.0], [1.36, 8.25], [1.36, 7.7]], true); gg.fill(); gg.fillRect(1.52, 6.3, .42, 2.3); gg.beginPath(); gg.arc(1.42, 8.75, .58, 0, 6.29); gg.fill(); }),
          thick: g => { seatedThick(g); g.fillStyle = 'rgb(150,150,150)'; g.fillRect(1.5, 6.9, 1.2, 3); },
          front: g => { face(g, 7.35);
            line(g, [[-1.36, 7.98], [1.36, 7.98]], .34, .5); line(g, [[0, 8.1], [0, 9.55]], .34, .45); both(s => line(g, [[s * 1.3, 8.2], [s * .7, 8.95], [0, 9.68]], .1, .5)); both(s => line(g, [[s * .22, 8.2], [s * .22, 9.3]], .05, -.5));
            for (let k = 0; k < 4; k++) line(g, [[-1.9 + k * .32, 6.3 - k * .08], [-1.2 + k * .2, 5.0 - k * .45], [0, 4.45 - k * .55], [1.2 - k * .2, 5.0 - k * .45], [1.9 - k * .32, 6.3 - k * .08]], .1, -.6);   // the chasuble
            line(g, [[1.74, .35], [1.74, 8.3]], .3, .85); line(g, spiral(1.36, 8.72, .46, 5.2, 1, -1.2), .2, .85);   // the crozier
            blob(g, 1.7, 4.55, .46, .42, .6); [4.35, 4.55, 4.75].forEach(y => line(g, [[1.4, y], [2.0, y]], .05, -.6));
            line(g, [[-2.2, 4.6], [-1.6, 4.9], [-.9, 5.3]], .62, .5); blob(g, -.72, 5.62, .4, .55, .65); [-.86, -.7].forEach(x => line(g, [[x, 5.5], [x + .04, 6.1]], .05, -.6));   // blessing
            both(s => line(g, [[s * .3, 2.9], [s * .32, .5]], .07, -.55)); for (let y = .9; y < 2.9; y += .5) blob(g, 0, y, .13, .13, .5);
            robe(g, 2.95); },
          back: g => { throneBack(g, 'arcade'); line(g, [[-1.36, 7.98], [1.36, 7.98]], .34, .5); line(g, [[0, 8.1], [0, 9.55]], .3, .4);
            both(s => { line(g, [[s * .45, 7.8], [s * .6, 6.6], [s * .7, 5.8]], .36, .5); line(g, [[s * .45, 6.1], [s * .95, 6.1]], .05, -.5); });   // the lappets
            line(g, [[-1.74, 5.9], [-1.74, 8.3]], .26, .6); } });
        pieces.push(g0); }
      // KNIGHT (1831,1101.115 – 10.0 cm): carved as two sides — a stocky pony under a long caparison, its head hanging low; the rider in a pointed
      // helmet, the spear upright in his right hand, the kite shield on his left arm
      { const horse = g => { g.fillStyle = '#fff'; g.fillRect(-2.95, -1, 5.9, 1.5);
          path(g, [[-2.7, .4], [-2.75, 3.4], [-2.4, 4.45], [-.8, 4.6], [1.0, 4.55], [1.7, 5.3], [2.2, 5.85], [2.75, 5.5], [3.0, 4.3], [2.95, 3.2], [2.55, 3.0], [2.35, 3.9], [2.15, 2.8], [2.1, .4]], true); g.fill();
          path(g, [[-.95, 4.2], [-1.0, 6.4], [-.85, 7.2], [-.75, 8.4], [-.55, 8.9], [0, 9.72], [.55, 8.9], [.75, 8.4], [.95, 7.75], [.78, 7.3], [.95, 6.4], [1.0, 4.2]], true); g.fill();
          };
        const cut = g => { g.fillStyle = '#000'; path(g, [[-1.75, .5], [-1.7, 1.75], [-.4, 2.05], [1.15, 1.75], [1.2, .5]], true); g.fill(); };
        const common = (g, s) => {   // s = 1: seen from his right (horse heading right); −1: from his left (heading left)
          const X = x => s * x, L = (pts, w, a) => line(g, pts.map(p => [X(p[0]), p[1]]), w, a), B = (x, y, rx, ry, a, r = 0) => blob(g, X(x), y, rx, ry, a, s * r);
          L([[-2.6, 2.3], [-1.0, 2.05], [1.4, 2.3], [2.15, 2.9]], .1, -.6); for (let x = -2.4; x <= 2.0; x += .36) L([[x, 2.2], [x + .03, 1.75]], .06, -.55);   // the caparison's fringed edge
          L([[1.75, 5.2], [2.35, 5.6], [2.8, 5.1], [2.85, 3.5]], .34, .4); B(2.62, 4.6, .13, .13, -.8); L([[2.5, 3.2], [2.95, 3.3]], .06, -.6);   // the head: eye, mouth
          for (let k = 0; k < 6; k++) L([[1.15 + k * .16, 4.75 + k * .14], [1.6 + k * .14, 4.2 + k * .1], [1.75 + k * .1, 3.6]], .07, -.55);   // the mane
          L([[-2.72, 4.0], [-2.85, 2.6], [-2.7, 1.0]], .32, .45); for (let y = 1.2; y < 3.9; y += .38) L([[-2.9, y + .12], [-2.55, y]], .05, -.5);   // the tail
          L([[-2.6, .52], [2.2, .52]], .07, -.6);
          B(.08, 7.95, .3, .2, .7); sh(g, 0, .6); g.lineWidth = .06; g.beginPath(); g.ellipse(X(.1), 7.95, .26, .16, 0, 0, 6.29); g.stroke(); g.beginPath(); g.arc(X(.14), 7.95, .06, 0, 6.29); g.fill();   // his eye, in profile
          L([[-.8, 8.42], [.82, 8.42]], .16, .5); L([[.72, 8.4], [.9, 7.7]], .16, .6); L([[.2, 7.45], [.62, 7.42]], .07, -.7);                // helmet rim, nasal, mouth
          area(g, [[X(-.2), 7.5], [X(.75), 7.35], [X(.6), 6.6], [X(-.1), 6.5]], .3); for (let x = -.05; x < .65; x += .16) L([[x, 7.35], [x + .03, 6.65]], .05, -.6);   // beard
          L([[-.55, 8.9], [0, 9.6]], .06, -.4); L([[-.75, 8.1], [-.95, 7.2], [-.8, 6.6]], .3, .35);                                              // helmet seam; hair at the nape
        };
        const g0 = K.relief({ w: 7.0, h: 10.8, px: 384, depth: 1.25, round: .5, relief: .42, nx: 46, tex: ivC[0], dirt: DIRT, dirtK: .55, bump: 1.5, mat: { roughness: .5, clearcoat: .14, clearcoatRoughness: .55, color: IV[0].color },
          mask: g => { horse(g); cut(g); },
          thick: g => { g.fillStyle = 'rgb(185,185,185)'; g.fillRect(-1.4, 4.6, 2.3, 7); g.fillStyle = 'rgb(140,140,140)'; g.fillRect(2.1, 2.6, 1.2, 3.6);  },
          front: g => { common(g, 1);
            line(g, [[-.2, 6.6], [.5, 5.6], [1.0, 5.2]], .62, .5); blob(g, 1.08, 5.15, .34, .34, .6);                                           // right arm and hand
            line(g, [[-.3, 4.9], [.2, 3.6], [.35, 2.3]], .78, .5); line(g, [[.35, 2.3], [.4, 1.3]], .5, .5); blob(g, .6, 1.05, .5, .26, .6);    // the leg and foot
            for (let k = 0; k < 4; k++) line(g, [[-.7 + k * .28, 6.5], [-.75 + k * .3, 5.0]], .06, -.5); line(g, [[-.9, 5.0], [.6, 4.75]], .1, -.55); },
          back: g => { common(g, -1);
            area(g, [[-.75, 6.95], [.15, 7.05], [1.0, 6.9], [.95, 5.2], [.45, 3.2], [.1, 2.2], [-.3, 3.2], [-.75, 5.2]], .7);                      // the kite shield
            sh(g, 0, .6); g.lineWidth = .08; path(g, [[-.55, 6.72], [.15, 6.8], [.8, 6.68], [.76, 5.2], [.36, 3.4], [.1, 2.65], [-.14, 3.4], [-.56, 5.2]], true); g.stroke();
            line(g, [[.12, 6.7], [.1, 2.8]], .07, -.6); line(g, [[-.55, 5.6], [.76, 5.6]], .07, -.6); blob(g, .12, 5.6, .2, .2, .7);
            line(g, [[.3, 2.4], [.25, 1.3]], .5, .5); blob(g, 0, 1.05, .5, .26, .6); } });
        g0.rotation.y = -Math.PI / 2; const p = new TT.Group(); p.add(g0);
        // the spear, held upright against his right side (a separate shaft: too slender for the carved block's grid)
        const sp = add(p, new TT.CylinderGeometry(.13, .15, 9.3, 8), IV[0], -1.18, 5.3, 1.1); const tip = add(p, new TT.ConeGeometry(.2, .7, 8), IV[0], -1.18, 10.3, 1.1); tip.scale.z = .5;
        pieces.push(p); }
      // WARDER (1831,1101.123 – 9.2 cm): standing, biting the top of his shield, the sword upright in his right hand
      { const g0 = stat(1, { h: 9.2, sections: WARD, left: null, right: null,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-2.15, -1], [-2.15, .6], [-1.85, 4.6], [-1.8, 5.9], [-1.2, 6.5], [-1.12, 7.6], [-.95, 8.0], [0, 9.2], [.95, 8.0], [1.12, 7.6], [1.2, 6.5], [1.8, 5.9], [1.85, 4.6], [2.15, .6], [2.15, -1]], true); g.fill(); g.fillRect(-2.12, 4.2, .5, 3.9); },
          thick: g => { g.fillStyle = 'rgb(225,225,225)'; g.fillRect(-3, 6.4, 6, 4); g.fillStyle = 'rgb(120,120,120)'; g.fillRect(-2.5, 6.0, .75, 2.4); },
          front: g => { face(g, 7.35); line(g, [[-1.1, 7.82], [1.1, 7.82]], .2, .55); line(g, [[0, 7.9], [0, 7.0]], .26, .8); both(s => line(g, [[s * 1.0, 7.8], [s * .5, 8.5], [0, 9.15]], .06, -.4));
            area(g, [[-1.45, 6.2], [-.7, 6.72], [0, 6.85], [.7, 6.72], [1.45, 6.2], [1.4, 4.4], [.9, 2.2], [0, .55], [-.9, 2.2], [-1.4, 4.4]], .75);                    // the shield
            sh(g, 0, .6); g.lineWidth = .09; path(g, [[-1.22, 6.05], [-.6, 6.48], [0, 6.58], [.6, 6.48], [1.22, 6.05], [1.18, 4.4], [.75, 2.3], [0, .95], [-.75, 2.3], [-1.18, 4.4]], true); g.stroke();
            line(g, [[0, 6.5], [0, 1.1]], .08, -.6); line(g, [[-1.2, 4.9], [1.2, 4.9]], .08, -.6); for (let k = -2; k <= 2; k++) { if (!k) continue; line(g, [[k * .42, 6.2], [k * .3, 2.2 + Math.abs(k) * .6]], .05, -.4); }
            for (let x = -.3; x <= .31; x += .2) { line(g, [[x, 6.86], [x, 6.66]], .05, -.75); }                                                                       // his teeth on the rim
            line(g, [[-1.88, 4.3], [-1.9, 7.85]], .3, .85); line(g, [[-2.15, 4.55], [-1.6, 4.55]], .14, .8); blob(g, -1.82, 4.15, .36, .36, .6);                        // the sword
            both(s => { line(g, [[s * 1.75, 3.6], [s * 1.95, .5]], .09, -.6); line(g, [[s * 1.3, 2.4], [s * 1.5, .5]], .09, -.6); }); line(g, [[-2.1, .42], [2.1, .42]], .08, -.6); both(s => blob(g, s * .55, .3, .4, .22, .6)); },
          back: g => { line(g, [[-1.1, 7.82], [1.1, 7.82]], .2, .55); both(s => line(g, [[s * 1.0, 7.8], [s * .5, 8.5], [0, 9.15]], .06, -.4));
            locks(g, [-1, 0, 1].map(k => [[k * .45, 7.7], [k * .52, 7.0], [k * .58, 6.4]]));
            for (let k = -3; k <= 3; k++) line(g, [[k * .45, 6.0], [k * .52, 3.2], [k * .62, .5]], .1, -.65); line(g, [[-1.85, 4.3], [1.85, 4.3]], .22, .5); line(g, [[-2.1, .42], [2.1, .42]], .08, -.6);
            line(g, [[1.88, 4.3], [1.9, 7.85]], .26, .5); } });
        pieces.push(g0); }
      // PAWN (1831,1101.134 – 4.0 cm): a plain slab with a rounded top
      { const p = new TT.Group(), k = 2;
        const S = new TT.Shape(); S.moveTo(-1.15, 0); S.lineTo(1.15, 0); S.lineTo(1.05, 2.8); S.absarc(0, 2.8, 1.05, 0, Math.PI, false); S.closePath();
        const g = new TT.ExtrudeGeometry(S, { depth: 1.3, bevelEnabled: true, bevelThickness: .12, bevelSize: .12, bevelSegments: 3, curveSegments: 18 }); g.translate(0, .12, -.65);
        const uvs = gg => { const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * .22 + .5, uv.getY(i) * .22 + .1); return gg; }; uvs(g);
        add(p, g, [IV[k], IV[k]], 0, 0, 0);
        // after the scan: a raised border following the outline on both faces, and a small knob on the top
        const R = new TT.Shape(); R.moveTo(-1.02, .25); R.lineTo(1.02, .25); R.lineTo(.93, 2.8); R.absarc(0, 2.8, .93, 0, Math.PI, false); R.closePath();
        const hl = new TT.Path(); hl.moveTo(-.8, .45); hl.lineTo(.8, .45); hl.lineTo(.72, 2.8); hl.absarc(0, 2.8, .72, 0, Math.PI, false); hl.closePath(); R.holes.push(hl);
        const rg = uvs(new TT.ExtrudeGeometry(R, { depth: .1, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2, curveSegments: 18 }));
        [.65 + .12, -.65 - .12 - .06].forEach(z => add(p, rg, IV[k], 0, .12, z));
        const kn = add(p, new TT.SphereGeometry(.28, 12, 8), IV[k], 0, 3.95, 0); kn.scale.set(1, .55, 1.3);
        pieces.push(p); }

      // ---- the case: dark felt on a low block; back row king · queen · bishop · knight, front row warder · pawn
      const feltT = K.tex(256, 256, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data; for (let i = 0; i < w * h; i++) { const v = 34 + n((i % w) / 6, (i / w | 0) / 6, 2) * 16; d[i * 4] = v * 1.05; d[i * 4 + 1] = v * .95; d[i * 4 + 2] = v * .9; d[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [4, 3] });
      const felt = K.mat({ map: feltT, color: '#ffffff', roughness: .96, sheen: .5, sheenRoughness: .9, sheenColor: K.lin('#5a4a40') });
      const base = add(G, new TT.BoxGeometry(25, 1.2, 15), felt, 0, -.6, 0); base.castShadow = false;
      const L = [[-8.4, -1.4, .6], [-2.8, -3.6, .06], [2.8, -3.6, -.06], [8.6, -2.6, -.3], [-3.6, 4.4, .25], [4.4, 4.0, -.2]];
      pieces.forEach((p, i) => { const [x, z, ry] = L[[1, 2, 3, 0, 4, 5][i]]; p.position.set(x, 0, z); p.rotation.y = ry; G.add(p); });
      return G;
    },
  };
})();
