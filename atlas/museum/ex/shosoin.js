/* 所蔵品：木画紫檀棊局（正倉院 北倉36） — units: 1 = 1 cm, about 48 cm square and 12.7 cm high.
   After the Shōsōin's published notes: a go board veneered with shitan (red sandalwood) over a pine core, the playing face
   ruled 19 × 19 with ivory and set with 17 flower-shaped points (花眼) instead of the usual nine; the sides and legs in marquetry
   (木画) of plants, animals — camels and elephants among them —, people and mythical creatures; two drawers, on the sides
   where the players sit, each holding a tray for the stones, one shaped like a turtle and one like a soft-shelled turtle,
   linked by a crank inside so that pulling one pushes out the other.
   The exact placing of the 17 points and the pictures on the sides are drawn after photographs in the manner of the piece
   (estimates where the record is silent); the drawer on the near side is shown a little open with its turtle tray. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).shosoin = {
    build(TT, X, K) {
      const G = new TT.Group();
      const S = 48, H = 12.7, BASE = 4.4, TOPT = 1.0;   // side, height, the open base under the body, the top slab
      const BODY = H - BASE;                           // the body that holds the drawers
      /* ---------- shitan veneer (deep purple-brown with dark streaks and a soft sheen) ---------- */
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#4a1c14', b: '#2a0e0a', seed: 21, sx: .6, sy: 5, warp: .9, pores: .004 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 22, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .4, clearcoatRoughness: .35 });
      const ivory = K.mat({ color: '#efe4cc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      /* ---------- the playing face: 19 × 19 ivory lines, 17 flower points, an ivory border ---------- */
      const N = 19, M = 3.1, P = (S - 2 * M) / (N - 1);   // margin to the outer line, line pitch (≈ 2.32 cm)
      const faceT = K.tex(2048, 2048, (g, w) => {
        g.drawImage(shT.image, 0, 0, w, w);
        const s = w / S, ivoryC = '#f1e6cf';
        g.fillStyle = 'rgba(20,4,8,.18)'; g.fillRect(0, 0, w, w);
        // an inlaid border band a little inside the edge
        g.strokeStyle = ivoryC; g.lineWidth = s * .16; g.strokeRect(s * 1.05, s * 1.05, w - s * 2.1, w - s * 2.1);
        g.lineWidth = s * .06; g.strokeRect(s * 1.4, s * 1.4, w - s * 2.8, w - s * 2.8);
        // the lines (ivory strips: slightly uneven width, a darker joint each side)
        for (let i = 0; i < N; i++) {
          const p = (M + i * P) * s, lw = s * (.085 + (i % 3) * .006);
          g.fillStyle = 'rgba(25,10,5,.5)'; g.fillRect(M * s - lw, p - lw / 2 - s * .02, (S - 2 * M) * s + 2 * lw, lw + s * .04); g.fillRect(p - lw / 2 - s * .02, M * s - lw, lw + s * .04, (S - 2 * M) * s + 2 * lw);
          g.fillStyle = ivoryC; g.fillRect(M * s - lw / 2, p - lw / 2, (S - 2 * M) * s + lw, lw); g.fillRect(p - lw / 2, M * s - lw / 2, lw, (S - 2 * M) * s + lw);
        }
        // 17 flower points: the nine of today and eight more between them (placing estimated)
        const pts = [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15], [6, 6], [6, 12], [12, 6], [12, 12], [9, 6], [6, 9], [12, 9], [9, 12]];
        pts.forEach(([a, b]) => {
          const cx = (M + a * P) * s, cy = (M + b * P) * s, R = s * .78;
          g.save(); g.translate(cx, cy);
          for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(R * .55, 0, R * .5, R * .2, 0, 0, 6.29); g.fillStyle = k % 2 ? '#f4ead6' : '#e8d7b4'; g.fill(); }
          g.beginPath(); g.arc(0, 0, R * .26, 0, 6.29); g.fillStyle = '#c98a4a'; g.fill(); g.restore();
        });
      });
      const faceMat = K.mat({ map: faceT, color: '#ffffff', roughness: .45, clearcoat: .45, clearcoatRoughness: .3 });
      /* ---------- the marquetry of the sides: a dark field framed by ivory, scenes in light woods, ivory and stained ivory ---------- */
      const C = { iv: '#efe3c8', box: '#d9b46a', grn: '#5e8d6a', red: '#b4493a', dk: '#3a1a10', tan: '#b98a55' };
      const sil = (g, kind, x, y, k, col) => {   // a figure in silhouette with a few engraved lines (the 撥鏤-like detail)
        g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = col; g.strokeStyle = 'rgba(40,18,8,.55)'; g.lineWidth = .9; g.beginPath();
        if (kind === 'camel') { g.moveTo(-26, 4); g.quadraticCurveTo(-24, -14, -10, -16); g.quadraticCurveTo(-4, -26, 2, -16); g.quadraticCurveTo(8, -24, 14, -14); g.quadraticCurveTo(20, -12, 22, -22); g.lineTo(30, -26); g.lineTo(31, -21); g.lineTo(26, -18); g.quadraticCurveTo(24, -4, 18, 2);
          g.lineTo(18, 22); g.lineTo(14, 22); g.lineTo(13, 4); g.lineTo(-14, 4); g.lineTo(-15, 22); g.lineTo(-19, 22); g.lineTo(-20, 4); g.closePath(); }
        else if (kind === 'elephant') { g.moveTo(-28, -2); g.quadraticCurveTo(-26, -24, 0, -24); g.quadraticCurveTo(18, -24, 22, -10); g.quadraticCurveTo(30, -6, 30, 8); g.quadraticCurveTo(30, 20, 34, 22); g.lineTo(28, 22); g.quadraticCurveTo(24, 10, 22, 4);
          g.lineTo(18, 22); g.lineTo(12, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-14, 22); g.lineTo(-20, 22); g.lineTo(-20, 4); g.quadraticCurveTo(-28, 6, -28, -2); g.closePath(); }
        else if (kind === 'bird') { g.moveTo(-14, 2); g.quadraticCurveTo(-2, -10, 10, -6); g.lineTo(16, -10); g.lineTo(14, -4); g.quadraticCurveTo(10, 6, -4, 6); g.lineTo(-18, 12); g.lineTo(-12, 4); g.closePath(); g.moveTo(0, -2); g.quadraticCurveTo(-8, -18, -20, -16); g.quadraticCurveTo(-10, -8, 0, -2); }
        else if (kind === 'rider') { g.moveTo(-24, 6); g.quadraticCurveTo(-22, -8, -6, -8); g.lineTo(12, -10); g.lineTo(20, -20); g.lineTo(24, -16); g.lineTo(18, -6); g.quadraticCurveTo(20, 4, 14, 6); g.lineTo(16, 22); g.lineTo(12, 22); g.lineTo(9, 7); g.lineTo(-14, 7); g.lineTo(-18, 22); g.lineTo(-22, 22); g.closePath();
          g.moveTo(-6, -8); g.lineTo(-4, -22); g.arc(-3, -25, 3.2, 0, 6.29); g.moveTo(-2, -18); g.lineTo(8, -26); }
        else if (kind === 'tree') { g.moveTo(-1.6, 24); g.lineTo(-1.2, -2); g.lineTo(1.2, -2); g.lineTo(1.6, 24); g.closePath(); for (let i = 0; i < 5; i++) { const yy = -4 - i * 6, ww = 14 - i * 2.2; g.moveTo(0, yy - 6); g.quadraticCurveTo(ww, yy, 0, yy + 2); g.quadraticCurveTo(-ww, yy, 0, yy - 6); } }
        else if (kind === 'flower') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(0, 0); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 3, a, 0, 6.29); } }
        else if (kind === 'lion') { g.moveTo(-24, 4); g.quadraticCurveTo(-22, -12, -4, -12); g.quadraticCurveTo(8, -24, 20, -14); g.quadraticCurveTo(26, -8, 22, 0); g.lineTo(18, 22); g.lineTo(13, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-17, 22); g.lineTo(-21, 22); g.lineTo(-22, 6);
          g.quadraticCurveTo(-34, 0, -30, -12); g.quadraticCurveTo(-28, -2, -24, 4); g.closePath(); }
        g.fill('evenodd'); g.stroke(); g.restore();
      };
      const sideTex = seed => K.tex(2048, Math.round(2048 * BODY / S), (g, w, h) => {
        g.drawImage(shT.image, 0, 0, w, h);
        const s = w / S;
        // ivory frame lines (double) and the drawer-front seams
        g.strokeStyle = C.iv; g.lineWidth = s * .14; g.strokeRect(s * .7, s * .55, w - s * 1.4, h - s * 1.1);
        g.lineWidth = s * .05; g.strokeRect(s * 1.05, s * .9, w - s * 2.1, h - s * 1.8);
        // a running scroll of figures between trees and flowers
        const order = seed % 2 ? ['tree', 'camel', 'flower', 'rider', 'tree', 'bird', 'elephant', 'flower', 'tree'] : ['tree', 'elephant', 'bird', 'flower', 'lion', 'tree', 'camel', 'bird', 'tree'];
        const cols = [C.box, C.iv, C.red, C.tan, C.box, C.iv, C.iv, C.red, C.box];
        const cy = h / 2 + s * .4, k = s * .1;
        order.forEach((kd, i) => { const x = s * 3.6 + i * (w - s * 7.2) / (order.length - 1); sil(g, kd, x, cy, kd === 'tree' ? k * .95 : kd === 'flower' ? k * 1.1 : k * 1.05, kd === 'tree' ? C.grn : cols[i]); });
        // small flower dots along the frame
        for (let i = 0; i < 26; i++) { const x = s * 2 + i * (w - s * 4) / 25; [s * .72, h - s * .72].forEach(y => { g.beginPath(); g.arc(x, y, s * .1, 0, 6.29); g.fillStyle = C.box; g.fill(); }); }
      });
      const sides = [0, 1, 2, 3].map(i => K.mat({ map: sideTex(i), color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .35 }));
      /* ---------- the body: top slab with the face, the decorated sides ---------- */
      const body = new TT.Mesh(new TT.BoxGeometry(S, BODY - TOPT, S), [sides[0], sides[1], shitan, shitan, sides[2], sides[3]]);
      body.position.y = BASE + (BODY - TOPT) / 2; G.add(body);
      const top = new TT.Mesh(new TT.BoxGeometry(S + .3, TOPT, S + .3), [shitan, shitan, faceMat, shitan, shitan, shitan]); top.position.y = H - TOPT / 2; G.add(top);
      // ivory edging round the top slab
      const edge = (w, d, x, z) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .22, d), ivory); m.position.set(x, H - TOPT - .11, z); G.add(m); };
      edge(S + .34, .12, 0, S / 2 + .15); edge(S + .34, .12, 0, -S / 2 - .15); edge(.12, S + .34, S / 2 + .15, 0); edge(.12, S + .34, -S / 2 - .15, 0);
      /* ---------- the base: a skirt on each side cut with two cusped arches (格狭間), the corners as feet ---------- */
      const skirt = new TT.Shape(); skirt.moveTo(-S / 2, 0); skirt.lineTo(S / 2, 0); skirt.lineTo(S / 2, BASE); skirt.lineTo(-S / 2, BASE); skirt.closePath();
      const arch = (cx, w, h) => { const p = new TT.Path(), x0 = cx - w / 2, x1 = cx + w / 2, y0 = 0, y1 = h;
        p.moveTo(x0 + .5, y0); p.lineTo(x1 - .5, y0); p.quadraticCurveTo(x1, y0 + .1, x1 - .1, y0 + h * .35); p.quadraticCurveTo(x1 - w * .12, y0 + h * .55, x1 - w * .2, y1 - .5);
        p.quadraticCurveTo(cx + w * .12, y1 + .1, cx + w * .02, y1 - .55); p.quadraticCurveTo(cx, y1 - .2, cx - w * .02, y1 - .55); p.quadraticCurveTo(cx - w * .12, y1 + .1, x0 + w * .2, y1 - .5);
        p.quadraticCurveTo(x0 + w * .12, y0 + h * .55, x0 + .1, y0 + h * .35); p.quadraticCurveTo(x0, y0 + .1, x0 + .5, y0); return p; };
      skirt.holes.push(arch(-S / 4 + .8, S / 2 - 6.5, BASE - 1.1), arch(S / 4 - .8, S / 2 - 6.5, BASE - 1.1));
      const skG = new TT.ExtrudeGeometry(skirt, { depth: 1.1, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 12 });
      const legT = K.tex(1024, 128, (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); for (let i = 0; i < 12; i++) { const x = (i + .5) * w / 12; sil(g, 'flower', x, h * .5, h / 60, i % 2 ? C.box : C.iv); } });
      legT.repeat.set(1 / S, 1 / BASE); legT.offset.set(.5, 0);
      const legMat = K.mat({ map: legT, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      for (let i = 0; i < 4; i++) {
        const m = new TT.Mesh(skG, [legMat, shitan]); const a = i * Math.PI / 2;
        m.position.set(Math.sin(a) * (S / 2 - 1.1), 0, Math.cos(a) * (S / 2 - 1.1)); m.rotation.y = a; m.translateZ(0); G.add(m);
      }
      const floor = new TT.Mesh(new TT.BoxGeometry(S - 2.2, .6, S - 2.2), shitan); floor.position.y = BASE - .3; G.add(floor);
      /* ---------- the near drawer, a little open, with the turtle tray ---------- */
      const DW = 16, DH = BODY - TOPT - 2.4, OUT = 7.5;
      const dFront = new TT.Mesh(new TT.BoxGeometry(DW, DH, .5), sides[0]); dFront.position.set(0, BASE + 1.2 + DH / 2, S / 2 + OUT); G.add(dFront);
      const dSide = new TT.BoxGeometry(.4, DH - .2, OUT + .5); [-DW / 2 + .2, DW / 2 - .2].forEach(x => { const m = new TT.Mesh(dSide, shitan); m.position.set(x, BASE + 1.2 + DH / 2 - .1, S / 2 + OUT / 2); G.add(m); });
      const dBot = new TT.Mesh(new TT.BoxGeometry(DW, .3, OUT + .5), shitan); dBot.position.set(0, BASE + 1.35, S / 2 + OUT / 2); G.add(dBot);
      // the opening it leaves in the side (a dark shadow box)
      const hole = new TT.Mesh(new TT.BoxGeometry(DW + .1, DH + .1, .4), K.mat({ color: '#0d0705', roughness: 1 })); hole.position.set(0, BASE + 1.2 + DH / 2, S / 2 - .1); G.add(hole);
      // the turtle tray: a shallow shell-shaped dish with head, feet and tail, in shitan with ivory rims
      const tr = new TT.Group();
      const bowl = shitan.clone(); bowl.side = TT.DoubleSide;
      const shell = new TT.Mesh(new TT.SphereGeometry(1, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), bowl); shell.scale.set(6.2, 1.6, 4.6); shell.rotation.x = Math.PI; shell.position.y = 1.7; tr.add(shell);
      const rim = new TT.Mesh(new TT.TorusGeometry(1, .06, 8, 48), ivory); rim.rotation.x = Math.PI / 2; rim.scale.set(6.2, 4.6, 1); rim.position.y = 1.7; tr.add(rim);
      const head = new TT.Mesh(new TT.SphereGeometry(.9, 16, 12), shitan); head.scale.set(1.5, .8, 1); head.position.set(7, 1.2, 0); tr.add(head);
      [[4, 3.8], [4, -3.8], [-4, 3.8], [-4, -3.8]].forEach(([x, z]) => { const f = new TT.Mesh(new TT.SphereGeometry(.8, 12, 8), shitan); f.scale.set(1.3, .5, .9); f.position.set(x, .6, z); tr.add(f); });
      tr.rotation.y = Math.PI / 2; tr.position.set(0, BASE + 1.5, S / 2 + OUT / 2 - .2); tr.scale.setScalar(.95); G.add(tr);
      return G;
    },
  };
})();
