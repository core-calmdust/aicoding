/* 所蔵品：ツタンカーメンのセネト盤（エジプト博物館 JE 62058） — units: 1 = 1 cm.
   After the published description: an ebony box whose top is veneered with ivory and divided into 30 squares by raised strips
   (the reverse holds the 20-square game), a drawer for the pieces at one end, standing on an ebony stand with animal-shaped
   legs fixed to sledge runners; materials ebony, ivory, gold, faience. Height 20.5 cm, width 16 cm (Egyptian Museum record).
   Built: runners (1.8) + drums (0.6) + legs (10.3) + rails (1.0) + box (6.8) = 20.5 cm; the runners give the 16 cm width.
   The signs on squares 15 and 26–30 follow the usual New Kingdom marking (shown faintly); the gilding is kept to the claws
   and the drum caps. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).senet = {
    build(TT, X, K) {
      const G = new TT.Group();
      const L = 44, W = 15.2, BH = 6.8, Y0 = 13.7;   // box length, width, height, its bottom
      const SQ = 3.42, ST = .46, ROWS = 3, COLS = 10;
      const fieldW = COLS * SQ + (COLS + 1) * ST, fieldD = ROWS * SQ + (ROWS + 1) * ST;
      /* ---------- materials ---------- */
      const ebonyT = K.tex(512, 512, (g, w, h) => K.grain(g, w, h, { a: '#1c130d', b: '#0b0705', seed: 3, sx: 1, sy: 30, warp: 1.6, pores: .012 }), { rep: [2, 1] });
      const ebonyR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#8a8a8a', b: '#5c5c5c', seed: 5, sy: 30 }), { data: true, rep: [2, 1] });
      const ebony = K.mat({ map: ebonyT, roughnessMap: ebonyR, color: '#ffffff', roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .45 });
      const ivoryT = K.tex(512, 512, (g, w, h) => { K.grain(g, w, h, { a: '#e8dab9', b: '#d3bf96', seed: 9, sx: 1, sy: 3, warp: 1.2 });
        // a few age cracks along the grain
        g.strokeStyle = 'rgba(90,60,30,.18)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); let x = (i * 97) % w, y = (i * 53) % h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 6 + (k % 3); y += (k % 2 ? 2 : -2); g.lineTo(x, y); } g.stroke(); } });
      const ivory = K.mat({ map: ivoryT, color: '#ffffff', roughness: .42, metalness: 0, clearcoat: .2, clearcoatRoughness: .5 });
      const gold = K.mat({ color: '#e2b65a', roughness: .32, metalness: 1 });
      /* ---------- the box ---------- */
      const box = new TT.Mesh(new TT.BoxGeometry(L, BH, W), ebony); box.position.set(0, Y0 + BH / 2, 0); G.add(box);
      // the top field: one ivory slab, the raised ebony strips over it (the square signs are painted on the slab's texture)
      const signs = { 15: 'ankh', 26: 'nfr', 27: 'water', 28: 'III', 29: 'II', 30: 'ra' };
      const topT = K.tex(1024, Math.round(1024 * fieldD / fieldW), (g, w, h) => {
        const s = w / fieldW; g.drawImage(ivoryT.image, 0, 0, w, h);
        g.strokeStyle = 'rgba(30,18,10,.72)'; g.fillStyle = 'rgba(30,18,10,.72)'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = s * .16;
        for (let n = 1; n <= 30; n++) {
          const sg = signs[n]; if (!sg) continue;
          const r = Math.floor((n - 1) / 10), k = (n - 1) % 10, c = r === 1 ? 9 - k : k;   // the boustrophedon path: 1–10 → 11–20 ← 21–30 →
          const cx = (ST + c * (SQ + ST) + SQ / 2) * s, cy = (ST + r * (SQ + ST) + SQ / 2) * s, u = SQ * s * .3;
          g.beginPath();
          if (sg === 'ankh') { g.ellipse(cx, cy - u * .55, u * .28, u * .38, 0, 0, 6.29); g.moveTo(cx, cy - u * .17); g.lineTo(cx, cy + u); g.moveTo(cx - u * .5, cy - u * .1); g.lineTo(cx + u * .5, cy - u * .1); }
          else if (sg === 'nfr') { g.ellipse(cx, cy + u * .3, u * .35, u * .45, 0, 0, 6.29); g.moveTo(cx, cy - u * .15); g.lineTo(cx, cy - u); g.moveTo(cx - u * .3, cy - u * .55); g.lineTo(cx + u * .3, cy - u * .55); }
          else if (sg === 'water') { for (let j = -1; j <= 1; j++) { const yy = cy + j * u * .55; g.moveTo(cx - u * .8, yy); for (let q = 0; q < 6; q++) g.lineTo(cx - u * .8 + (q + 1) * u * .27, yy + (q % 2 ? -1 : 1) * u * .14); } }
          else if (sg === 'III' || sg === 'II') { const m = sg.length; for (let j = 0; j < m; j++) { const xx = cx + (j - (m - 1) / 2) * u * .55; g.moveTo(xx, cy - u * .7); g.lineTo(xx, cy + u * .7); } }
          else if (sg === 'ra') { g.arc(cx, cy, u * .62, 0, 6.29); g.moveTo(cx + u * .14, cy); g.arc(cx, cy, u * .14, 0, 6.29); }
          g.stroke();
        }
      });
      const topMat = K.mat({ map: topT, color: '#ffffff', roughness: .42, clearcoat: .2, clearcoatRoughness: .5 });
      const slab = new TT.Mesh(new TT.BoxGeometry(fieldW, .12, fieldD), [ivory, ivory, topMat, ivory, ivory, ivory]); slab.position.set(0, Y0 + BH + .06, 0); G.add(slab);
      // raised strips: rows and columns (and the outer frame), ebony
      const SH = .22, strips = [];
      for (let r = 0; r <= ROWS; r++) strips.push([fieldW, ST, 0, -fieldD / 2 + ST / 2 + r * (SQ + ST)]);
      for (let c = 0; c <= COLS; c++) strips.push([ST, fieldD, -fieldW / 2 + ST / 2 + c * (SQ + ST), 0]);
      strips.forEach(([w, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, SH, d), ebony); m.position.set(x, Y0 + BH + .12 + SH / 2, z); G.add(m); });
      // the box's rim round the field: a thin ivory band at the top edge and at the foot of each side
      const band = (w, d, y, x = 0, z = 0) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .32, d), ivory); m.position.set(x, y, z); G.add(m); };
      band(L + .06, .1, Y0 + BH - .45, 0, W / 2); band(L + .06, .1, Y0 + BH - .45, 0, -W / 2); band(.1, W + .06, Y0 + BH - .45, -L / 2, 0); band(.1, W + .06, Y0 + BH - .45, L / 2, 0);
      band(L + .06, .1, Y0 + .45, 0, W / 2); band(L + .06, .1, Y0 + .45, 0, -W / 2); band(.1, W + .06, Y0 + .45, -L / 2, 0);
      // ivory panels on the long sides, framed by the ebony (four on each side)
      for (const sz of [1, -1]) for (let k = 0; k < 4; k++) { const pw = 9.2, x = -L / 2 + 2 + pw / 2 + k * (pw + .9); const p = new TT.Mesh(new TT.BoxGeometry(pw, 3.2, .08), ivory); p.position.set(x, Y0 + BH / 2, sz * (W / 2 + .03)); G.add(p); }
      // the drawer at the +x end: a face inset with an ivory frame, an ivory knob, the bolt's two rings
      const df = new TT.Mesh(new TT.BoxGeometry(.25, 4.6, W - 1.6), ebony); df.position.set(L / 2 + .12, Y0 + BH / 2, 0); G.add(df);
      [[0, 2.3], [0, -2.3]].forEach(([, y]) => { const s = new TT.Mesh(new TT.BoxGeometry(.08, .22, W - 1.2), ivory); s.position.set(L / 2 + .27, Y0 + BH / 2 + y, 0); G.add(s); });
      [W / 2 - .7, -(W / 2 - .7)].forEach(z => { const s = new TT.Mesh(new TT.BoxGeometry(.08, 4.8, .22), ivory); s.position.set(L / 2 + .27, Y0 + BH / 2, z); G.add(s); });
      const knob = new TT.Mesh(new TT.SphereGeometry(.55, 24, 14), ivory); knob.scale.set(.8, 1, 1); knob.position.set(L / 2 + .55, Y0 + BH / 2, 0); G.add(knob);
      [-1.6, 1.6].forEach(z => { const r = new TT.Mesh(new TT.TorusGeometry(.32, .07, 8, 20), gold); r.rotation.y = Math.PI / 2; r.position.set(L / 2 + .3, Y0 + BH / 2 - 1.2, z); G.add(r); });
      /* ---------- the stand: rails, four animal legs on drums, two sledge runners ---------- */
      const RL = 39, RW = 13.6;
      [[RL, 1, .9, 0, RW / 2 - .45], [RL, 1, .9, 0, -RW / 2 + .45], [.9, 1, RW, RL / 2 - .45, 0], [.9, 1, RW, -RL / 2 + .45, 0]].forEach(([w, h, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, h, d), ebony); m.position.set(x, Y0 - h / 2, z); G.add(m); });
      // a feline leg seen from the side (paw forward to +x), extruded and rounded
      const sh = new TT.Shape();
      sh.moveTo(-.95, 10.3); sh.quadraticCurveTo(-1.25, 8.6, -1.0, 7.2); sh.quadraticCurveTo(-.82, 6.1, -1.12, 4.9); sh.quadraticCurveTo(-1.18, 3.9, -.62, 3.0);
      sh.quadraticCurveTo(-.48, 2.0, -.62, 1.35); sh.quadraticCurveTo(-.92, .8, -.7, .05); sh.lineTo(1.35, .05);
      sh.quadraticCurveTo(2.05, .1, 2.0, .62); sh.quadraticCurveTo(1.9, 1.05, 1.25, 1.12); sh.quadraticCurveTo(.62, 1.25, .52, 1.9);
      sh.quadraticCurveTo(.42, 3.0, .7, 4.2); sh.quadraticCurveTo(.92, 5.3, .66, 6.4); sh.quadraticCurveTo(.5, 7.4, .82, 8.5); sh.quadraticCurveTo(1.0, 9.4, .95, 10.3); sh.lineTo(-.95, 10.3);
      const legG = new TT.ExtrudeGeometry(sh, { depth: 1.15, bevelEnabled: true, bevelThickness: .24, bevelSize: .22, bevelSegments: 4, curveSegments: 10 });
      legG.translate(0, 0, -.575);
      const clawG = new TT.ConeGeometry(.12, .42, 10); clawG.rotateZ(-Math.PI / 2);
      const drumG = new TT.CylinderGeometry(.95, 1.05, .6, 28);
      const LX = RL / 2 - 1.6, LZ = RW / 2 - .9;
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const x = sx * LX, z = sz * LZ;
        const leg = new TT.Mesh(legG, ebony); leg.position.set(x, 2.4, z); G.add(leg);
        for (let k = -1; k <= 1; k++) { const c = new TT.Mesh(clawG, gold); c.position.set(x + 2.18, 2.4 + .3, z + k * .42); G.add(c); }
        const dr = new TT.Mesh(drumG, ebony); dr.position.set(x + .4, 2.1, z); G.add(dr);
        const cap = new TT.Mesh(new TT.CylinderGeometry(1.0, 1.0, .1, 28), gold); cap.position.set(x + .4, 2.42, z); G.add(cap);
      }
      // runners: long bars with rounded, slightly upturned ends
      const rs = new TT.Shape(); const RLn = 46, RH = 1.8;
      rs.moveTo(-RLn / 2 + 1.2, 0); rs.lineTo(RLn / 2 - 1.2, 0); rs.quadraticCurveTo(RLn / 2 + .2, .1, RLn / 2, RH * .9); rs.quadraticCurveTo(RLn / 2 - .3, RH, RLn / 2 - 1.4, RH);
      rs.lineTo(-RLn / 2 + 1.4, RH); rs.quadraticCurveTo(-RLn / 2 + .3, RH, -RLn / 2, RH * .9); rs.quadraticCurveTo(-RLn / 2 - .2, .1, -RLn / 2 + 1.2, 0);
      const runG = new TT.ExtrudeGeometry(rs, { depth: 1.5, bevelEnabled: true, bevelThickness: .15, bevelSize: .15, bevelSegments: 3, curveSegments: 10 }); runG.translate(0, 0, -.75);
      [LZ, -LZ].forEach(z => { const m = new TT.Mesh(runG, ebony); m.position.set(0, 0, z); G.add(m); });
      return G;
    },
  };
})();
