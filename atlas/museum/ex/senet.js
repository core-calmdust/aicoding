/* 所蔵品：ツタンカーメンのセネト盤（エジプト博物館 JE 62058、Carter No. 345 / 383 / 580） — units: 1 = 1 cm.
   After Howard Carter's object cards (Griffith Institute): an oblong games-box of ebony and ivory, a board on the top (30 squares)
   and on the bottom (20), the playing squares of ivory divided by narrow ebony strips; a long ebony drawer for the pieces at one
   end (its bolts and staples wrenched away); the sides, end and drawer front carry hieroglyphic texts, incised and filled with a
   light-yellow pigment imitating ivory. The stand: an open-work stool of ebony on a sledge, four feline legs with ivory claws,
   the rest of the decoration gold, the top frame rebated to take the box. Box 44.4 × 14.3 × 8.1; drawer 22.2 × 9.5 × 4.0;
   stand (with sledge) 55.0 × 17.5 × 20.2; 28 high overall (Carter). The pieces kept with it: two ivory knuckle-bones and two
   pairs of casting sticks, black ebony above and white ivory below, one pair ending in fingers, one in fox heads (about 17.5 long).
   Estimates: the wording and layout of the texts (Tutankhamun's throne name in cartouches, the rest in the manner of royal
   texts), the signs on squares 15 and 26–30.
   Checked 2026-11-21 against photographs of the set in the Egyptian Museum (Global Egyptian Museum 15033; egypt-museum.com): brown
   ebony, one band of text in the upper middle of the sides, legs with a heavy thigh, ribbed gold drums under the paws, runners with
   upturned ends and cross-bars; shown as displayed, the drawer open and reels and cones on the board. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).senet = {
    build(TT, X, K) {
      const G = new TT.Group();
      const L = 44.4, W = 14.3, BH = 8.1, Y0 = 19.9;   // box length, width, height, its bottom (28 overall; it sits .3 down in the stand's rebate)
      const SQ = 3.5, ST = .36, ROWS = 3, COLS = 10;
      const fieldW = COLS * SQ + (COLS + 1) * ST, fieldD = ROWS * SQ + (ROWS + 1) * ST;
      /* ---------- materials ---------- */
      const ebonyT = K.tex(512, 512, (g, w, h) => K.grain(g, w, h, { a: '#3a2a20', b: '#1d130e', seed: 3, sx: 1, sy: 30, warp: 1.6, pores: .012 }), { rep: [2, 1] });
      const ebonyR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#8a8a8a', b: '#5c5c5c', seed: 5, sy: 30 }), { data: true, rep: [2, 1] });
      const ebony = K.mat({ map: ebonyT, roughnessMap: ebonyR, color: '#ffffff', roughness: .55, metalness: 0, clearcoat: .35, clearcoatRoughness: .45 });
      const ivoryT = K.tex(512, 512, (g, w, h) => { K.grain(g, w, h, { a: '#e8dab9', b: '#d3bf96', seed: 9, sx: 1, sy: 3, warp: 1.2 });
        // a few age cracks along the grain
        g.strokeStyle = 'rgba(90,60,30,.18)'; g.lineWidth = 1; for (let i = 0; i < 9; i++) { g.beginPath(); let x = (i * 97) % w, y = (i * 53) % h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += 6 + (k % 3); y += (k % 2 ? 2 : -2); g.lineTo(x, y); } g.stroke(); } });
      const ivory = K.mat({ map: ivoryT, color: '#ffffff', roughness: .42, metalness: 0, clearcoat: .2, clearcoatRoughness: .5 });
      const gold = K.mat({ color: '#e2b65a', roughness: .32, metalness: 1 });
      /* ---------- the box ---------- */
      // the texts round the box: incised in the ebony and filled with a light-yellow paste (Carter); Tutankhamun's throne name
      // Nebkheperure in cartouches, the rest in the manner of a royal text (the real wording is not reproduced here)
      const HF = '"Noto Sans Egyptian Hieroglyphs"';
      const textTex = (len, ht, glyphs) => { const PX = 1536, s = PX / len; return K.tex(PX, Math.round(ht * s), (g, w, h) => {
        g.drawImage(ebonyT.image, 0, 0, w, h); const yel = 'rgba(212,178,104,.9)';
        // one register of text between two incised lines, in the upper middle of the side (photographs in the Egyptian Museum)
        const cy = h * (ht > 5 ? .53 : .5), bh = Math.min(h * .34, s * 1.55);   // (the museum's side view: a narrow band a little below the middle)
        g.strokeStyle = yel; g.lineWidth = s * .05; [cy - bh / 2 - s * .12, cy + bh / 2 + s * .12].forEach(y => { g.beginPath(); g.moveTo(s * .35, y); g.lineTo(w - s * .35, y); g.stroke(); });
        g.fillStyle = yel; g.textBaseline = 'middle'; const FS = bh * .9; g.font = `${Math.round(FS)}px ${HF}`;
        const cart = (x) => { const cw = s * 3.6, ch = bh * .92, y0 = cy - ch / 2; g.lineWidth = s * .09; g.beginPath(); g.roundRect(x, y0, cw, ch, ch / 2); g.stroke(); g.beginPath(); g.moveTo(x + cw, y0 + ch * .1); g.lineTo(x + cw, y0 + ch * .9); g.stroke();
          g.textAlign = 'center'; g.font = `${Math.round(FS * .7)}px ${HF}`; g.fillText('\u{131F3}\u{1319F}\u{133E5}\u{1339F}', x + cw / 2, cy); g.font = `${Math.round(FS)}px ${HF}`; g.textAlign = 'left'; return cw; };
        let x = s * 1.0; g.textAlign = 'left'; let i = 0;
        // signs set close, small ones stacked two high in one square (as Egyptian texts are composed); the king's name in its ring at the far end
        const endX = w - s * (ht > 5 ? 4.6 : 1.0);
        while (x < endX) { const c = glyphs[i % glyphs.length]; i++; if (c === 'C') continue;
          if (i % 3 === 0) { const c2 = glyphs[(i * 7 + 3) % glyphs.length]; g.font = `${Math.round(FS * .52)}px ${HF}`; const wd = Math.max(g.measureText(c).width, c2 === 'C' ? 0 : g.measureText(c2).width); g.fillText(c, x, cy - bh * .25); if (c2 !== 'C') g.fillText(c2, x, cy + bh * .25); g.font = `${Math.round(FS)}px ${HF}`; x += Math.min(wd, FS * .7) + s * .06; }
          else { g.fillText(c, x, cy); x += Math.min(g.measureText(c).width, FS * 1.0) + s * .04; } }
        if (ht > 5) cart(w - s * 4.3);
      }); };
      const LINE = ['\u{13079}', '\u{1309D}', '\u{13190}', '\u{13000}', '\u{132F9}', '\u{13216}', '\u{1340D}', '\u{13283}', '\u{132B9}', '\u{130ED}', '\u{13290}', '\u{13000}', '\u{1309D}', '\u{1308B}', '\u{13171}', '\u{1340D}', '\u{132AA}', '\u{133CF}', '\u{13216}', '\u{1309E}', '\u{13193}', '\u{132F4}', '\u{1308B}', '\u{13000}', '\u{132B9}', 'C'];
      const sideT = textTex(L, BH, LINE), endT = textTex(W, BH, LINE.slice(4));
      const sideM = K.mat({ map: sideT, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .45 }), endM = K.mat({ map: endT, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .45 });
      const box = new TT.Mesh(new TT.BoxGeometry(L, BH, W), [ebony, endM, ebony, ebony, sideM, sideM]); box.position.set(0, Y0 + BH / 2, 0); G.add(box);
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
      const slab = new TT.Mesh(new TT.BoxGeometry(fieldW, .12, fieldD), [ebony, ebony, topMat, ebony, ebony, ebony]); slab.position.set(0, Y0 + BH + .06, 0); G.add(slab);
      // raised strips: rows and columns (and the outer frame), ebony
      const SH = .22, strips = [];
      for (let r = 0; r <= ROWS; r++) strips.push([fieldW, ST, 0, -fieldD / 2 + ST / 2 + r * (SQ + ST)]);
      for (let c = 0; c <= COLS; c++) strips.push([ST, fieldD, -fieldW / 2 + ST / 2 + c * (SQ + ST), 0]);
      strips.forEach(([w, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, SH, d), ebony); m.position.set(x, Y0 + BH + .12 + SH / 2, z); G.add(m); });
      // a thin ivory edge where the field meets the ebony
      const band = (w, d, y, x = 0, z = 0) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .2, d), ivory); m.position.set(x, y, z); G.add(m); };
      // the drawer at the +x end (22.2 long, 9.5 wide, 4 high), shown pulled out as in the museum's photographs
      const DL = 22.2, DWd = 9.5, DHt = 4.0, DOUT = 8.5, dg = new TT.Group(); dg.position.set(L / 2 + DOUT - DL / 2, Y0 + .9 + DHt / 2, 0); G.add(dg);
      const dT = textTex(9.5, 4.0, ['C', '\u{13079}', '\u{1309D}']);
      const dpart = (w, h, d, x, y, z, m) => { const o = new TT.Mesh(new TT.BoxGeometry(w, h, d), m || ebony); o.position.set(x, y, z); dg.add(o); };
      dpart(.35, DHt, DWd, DL / 2 - .175, 0, 0, [K.mat({ map: dT, color: '#ffffff', roughness: .5, clearcoat: .35 }), ebony, ebony, ebony, ebony, ebony]);   // front
      dpart(DL - .35, DHt - .2, .3, -.175, -.1, DWd / 2 - .15); dpart(DL - .35, DHt - .2, .3, -.175, -.1, -DWd / 2 + .15);   // sides
      dpart(.3, DHt - .2, DWd - .6, -DL / 2 + .15, -.1, 0); dpart(DL - .35, .25, DWd - .6, -.175, -DHt / 2 + .125, 0, K.mat({ color: '#4a3324', roughness: .85 }));   // back, rough floor
      { const hm = K.mat({ color: '#0a0605', roughness: 1 }), hg = new TT.CylinderGeometry(.11, .11, .06, 10); hg.rotateZ(Math.PI / 2); [[-1.5, .45], [-1.5, -.45], [1.5, .45], [1.5, -.45]].forEach(([z, y]) => { const sc = new TT.Mesh(hg, hm); sc.position.set(DL / 2 + .005, y, z); dg.add(sc); }); }   // four small holes: the staples of the bolt, wrenched away (the museum's photograph)
      { const st = new TT.Mesh(new TT.TorusGeometry(.32, .07, 8, 16, Math.PI), gold); st.rotation.set(0, Math.PI / 2, -Math.PI / 2); st.position.set(L / 2 + .02, Y0 + .9 + DHt / 2, DWd / 2 + .85); G.add(st); }   // one gold staple still on the box's end, beside the drawer   // where the bolt's staples were wrenched away
      const hole = new TT.Mesh(new TT.BoxGeometry(.05, DHt, DWd), K.mat({ color: '#080504', roughness: 1 })); hole.position.set(L / 2 + .03, Y0 + .9 + DHt / 2, 0); G.add(hole);   // the empty opening in the box's end
      /* ---------- pieces on the board, as the set is shown in the museum: reels and cones (ivory; two cones blue faience) ---------- */
      const faience = K.mat({ color: '#6fa9a0', roughness: .45, clearcoat: .3 });
      const reelG = new TT.LatheGeometry([[0, 0], [.95, 0], [1.0, .12], [.62, .35], [.5, .9], [.62, 1.35], [.98, 1.55], [.9, 1.66], [0, 1.66]].map(([x, y]) => new TT.Vector2(x, y)), 24);
      const coneG = new TT.LatheGeometry([[0, 0], [.95, 0], [1.0, .15], [.7, .5], [.42, 1.6], [.3, 2.4], [.34, 2.7], [.2, 2.9], [0, 2.95]].map(([x, y]) => new TT.Vector2(x, y)), 24);
      const sqc = (c, r) => [-fieldW / 2 + ST + c * (SQ + ST) + SQ / 2, Y0 + BH + .12, -fieldD / 2 + ST + r * (SQ + ST) + SQ / 2];
      [[0, 0], [2, 0], [3, 1], [5, 0], [1, 2]].forEach(([c, r]) => { const m = new TT.Mesh(reelG, ivory); m.position.set(...sqc(c, r)); m.scale.setScalar(.82); G.add(m); });
      [[6, 1], [7, 2], [8, 1], [9, 2], [9, 0]].forEach(([c, r], i) => { const m = new TT.Mesh(coneG, i === 1 || i === 3 ? faience : ivory); m.position.set(...sqc(c, r)); m.scale.set(.75, .9, .75); G.add(m); });
      /* ---------- the stand: rails, four animal legs on drums, two sledge runners ---------- */
      const RL = 46.4, RW = 16.4, RH = 1.8;   // the top frame (rebated for the box)
      [[RL, RH, .9, 0, RW / 2 - .45], [RL, RH, .9, 0, -RW / 2 + .45], [.9, RH, RW, RL / 2 - .45, 0], [.9, RH, RW, -RL / 2 + .45, 0]].forEach(([w, h, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, h, d), ebony); m.position.set(x, 20.2 - h / 2, z); G.add(m); });
      // the ledge inside the frame the box rests on
      [[RL - 1.8, .3, .6, 0, RW / 2 - 1.2], [RL - 1.8, .3, .6, 0, -RW / 2 + 1.2]].forEach(([w, h, d, x, z]) => { const m = new TT.Mesh(new TT.BoxGeometry(w, h, d), ebony); m.position.set(x, Y0 - .15, z); G.add(m); });
      const gilt = (w, d, x, z) => { const m = new TT.Mesh(new TT.BoxGeometry(w, .14, d), gold); m.position.set(x, 20.2 - RH + .07, z); G.add(m); };   // gold bands at the foot of the frame
      gilt(RL + .02, .92, 0, RW / 2 - .45); gilt(RL + .02, .92, 0, -RW / 2 + .45);
      // the legs: a lion's — two forelegs at the drawer's end, two hind legs behind, all four facing the same way (the museum's side
      // view): a broad block under the frame, the limb narrowing to the ankle, the hind legs bent back at the hock; the paw on a ribbed gold drum
      const prof = pts => { const sh = new TT.Shape(); sh.moveTo(pts[0][0], pts[0][1]); sh.splineThru(pts.slice(1).map(([x, y]) => new TT.Vector2(x, y))); sh.closePath(); return sh; };
      const PAW = [[-.62, .02], [.6, .0], [1.5, .0], [1.92, .2], [1.9, .72], [1.45, 1.12], [.85, 1.32]];
      const fore = prof([[-1.25, 10.3], [-1.25, 9.4], [-1.05, 8.2], [-.78, 6.6], [-.66, 4.8], [-.7, 3.2], [-.92, 2.6], [-.7, 2.15], [-.62, 1.2], [-.78, .5], ...PAW, [.52, 1.9], [.5, 3.0], [.6, 4.4], [.86, 5.9], [.9, 7.4], [1.1, 8.6], [1.25, 9.4], [1.25, 10.3]]);
      const hind = prof([[-1.25, 10.3], [-1.3, 9.4], [-1.42, 8.2], [-1.1, 6.9], [-.95, 5.9], [-1.3, 5.0], [-.78, 4.3], [-.52, 3.2], [-.5, 2.0], [-.72, .6], ...PAW, [.5, 1.9], [.36, 3.0], [.3, 4.2], [.62, 5.4], [1.15, 6.8], [1.32, 8.0], [1.25, 9.4], [1.25, 10.3]]);
      const legOpt = { depth: 1.5, bevelEnabled: true, bevelThickness: .3, bevelSize: .28, bevelSegments: 5, curveSegments: 6 };
      const foreG = new TT.ExtrudeGeometry(fore, legOpt), hindG = new TT.ExtrudeGeometry(hind, legOpt); [foreG, hindG].forEach(q => q.translate(0, 0, -.75));
      const clawG = new TT.ConeGeometry(.1, .4, 8); clawG.rotateZ(-Math.PI / 2);
      const toeG = new TT.SphereGeometry(.2, 12, 8); toeG.scale(2.7, 2.9, .95);
      const drumG = new TT.LatheGeometry([[0, -.9], [1.3, -.9], [1.36, -.78], [1.2, -.62], [1.3, -.46], [1.14, -.3], [1.24, -.14], [1.08, .02], [1.18, .18], [1.02, .34], [1.12, .5], [.98, .66], [1.06, .8], [1.0, .9], [0, .9]].map(([x, y]) => new TT.Vector2(x, y)), 28);
      const RUN = .95, LX = RL / 2 - 1.9, LZ = RW / 2 - 1.05, LY = RUN + 1.8, LS = (20.2 - RH - LY) / 10.3;   // the runner's thickness; the legs stretched to the stand's height
      for (const sx of [1, -1]) for (const sz of [1, -1]) {
        const x = sx * LX, z = sz * LZ;
        const leg = new TT.Mesh(sx > 0 ? foreG : hindG, ebony); leg.position.set(x, LY, z); leg.scale.set(1, LS, 1); G.add(leg);
        for (let k = -1.5; k <= 1.5; k++) { const t = new TT.Mesh(toeG, ebony); t.position.set(x + 1.72, LY + .72, z + k * .42); t.rotation.z = -.35; G.add(t);
          const c = new TT.Mesh(clawG, ivory); c.position.set(x + 2.22, LY + .3, z + k * .42); c.rotation.z = -.5; G.add(c); }
        const dr = new TT.Mesh(drumG, gold); dr.position.set(x + .62, RUN + .9, z); G.add(dr);
        const gb = new TT.Mesh(new TT.BoxGeometry(.42, 1.9, .1), gold); gb.position.set(x - .2, 20.2 - RH - 1.25, z - sz * 1.06); gb.rotation.z = .22; G.add(gb);   // the gilt strap inside the top of each leg
      }
      // the sledge: two thin flat runners, both ends curling up; a flat cross-bar joins them inside each pair of feet
      const RLn = 55, rs = new TT.Shape(), E = RLn / 2;
      rs.moveTo(-E + 4.2, 0); rs.lineTo(E - 4.2, 0); rs.bezierCurveTo(E - 1.6, 0, E + .1, .7, E, 1.9); rs.quadraticCurveTo(E - .05, 2.55, E - .6, 2.55); rs.quadraticCurveTo(E - 1.15, 2.5, E - 1.3, 1.95);
      rs.bezierCurveTo(E - 1.6, 1.3, E - 2.6, RUN, E - 4.2, RUN); rs.lineTo(-E + 4.2, RUN); rs.bezierCurveTo(-E + 2.6, RUN, -E + 1.6, 1.3, -E + 1.3, 1.95);
      rs.quadraticCurveTo(-E + 1.15, 2.5, -E + .6, 2.55); rs.quadraticCurveTo(-E + .05, 2.55, -E, 1.9); rs.bezierCurveTo(-E - .1, .7, -E + 1.6, 0, -E + 4.2, 0);
      const runG = new TT.ExtrudeGeometry(rs, { depth: 2.4, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 16 }); runG.translate(0, 0, -1.2);
      [LZ, -LZ].forEach(z => { const m = new TT.Mesh(runG, ebony); m.position.set(0, 0, z); G.add(m); });
      [LX - 2.2, -LX - 2.6].forEach(x => { const m = new TT.Mesh(new TT.BoxGeometry(2.2, .7, 2 * LZ - 2.2), ebony); m.position.set(x, .5, 0); G.add(m); });
      /* ---------- the pieces kept with it: two knuckle-bones and two pairs of casting sticks (black ebony over white ivory) ---------- */
      // a casting stick (Carter): a half-round rod about 17.5 long, the rounded back black ebony, the flat face white ivory; one pair
      // ends in a finger-tip with its nail, the other in a fox's head. Two lie back up, two face up.
      const dsh = new TT.Shape(); dsh.moveTo(-.62, 0); dsh.lineTo(.62, 0); dsh.absarc(0, 0, .62, 0, Math.PI, false); dsh.closePath();
      const rodG = new TT.ExtrudeGeometry(dsh, { depth: 14.6, bevelEnabled: false, curveSegments: 12 }); rodG.scale(1, .62, 1); rodG.rotateY(Math.PI / 2); rodG.translate(-7.3, 0, 0);
      const faceG = new TT.BoxGeometry(14.6, .1, 1.2);
      const stick = (x, z, ry, up, fox) => { const g = new TT.Group(); g.position.set(x, up ? .1 : .5, z); g.rotation.y = ry; if (!up) g.rotation.x = Math.PI; G.add(g);
        const A = (geo, m, px, py, pz) => { const o = new TT.Mesh(geo, m); o.position.set(px, py, pz); g.add(o); return o; };
        A(rodG, ebony, 0, 0, 0); A(faceG, ivory, 0, -.04, 0);
        [-1, 1].forEach(e => { const cap = A(new TT.SphereGeometry(.62, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), ebony, e * 7.3, 0, 0); cap.scale.set(fox && e > 0 ? 2.6 : 1.5, .62, 1); const ci = A(new TT.CylinderGeometry(.6, .6, .1, 12), ivory, e * 7.3, -.04, 0); ci.scale.set(fox && e > 0 ? 2.6 : 1.5, 1, 1); });
        if (fox) { [-1, 1].forEach(k => { const ear = A(new TT.ConeGeometry(.2, .75, 8), ebony, 7.0, .36, k * .36); ear.rotation.z = .9; }); [-1, 1].forEach(k => A(new TT.SphereGeometry(.08, 8, 6), ivory, 7.9, .3, k * .3)); }
        else { const nail = A(new TT.SphereGeometry(.4, 12, 8), K.mat({ color: '#3a2a22', roughness: .35 }), 7.75, .3, 0); nail.scale.set(1, .25, .9); [6.3, 6.6].forEach(px => { const j = A(new TT.TorusGeometry(.55, .03, 4, 12, Math.PI), K.mat({ color: '#120b08', roughness: .8 }), px, .02, 0); j.rotation.y = Math.PI / 2; j.scale.y = .62; }); } };
      stick(-3, 12.6, .05, 1, 0); stick(-2.4, 14.6, -.12, 0, 0); stick(3.2, 16.4, .1, 1, 1); stick(2.4, 18.3, -.04, 0, 1);
      [[-15.5, 13.2], [-13.2, 15.6]].forEach(([x, z], i) => { const kb = new TT.Mesh(new TT.SphereGeometry(1, 16, 12), ivory); kb.scale.set(1.15, .7, .8); kb.position.set(x, .6, z); kb.rotation.y = i * .9; G.add(kb);
        const n = new TT.Mesh(new TT.TorusGeometry(.45, .14, 8, 16), ivory); n.position.set(x, 1.05, z); n.rotation.x = Math.PI / 2; G.add(n); });
      return G;
    },
    ready: () => new Promise(res => {   // the hieroglyph font: wait for its stylesheet, then for the face itself
      const go = () => (document.fonts && document.fonts.load ? document.fonts.load('40px "Noto Sans Egyptian Hieroglyphs"', '\u{131F3}\u{1319F}\u{13079}') : Promise.resolve()).catch(() => {}).then(res);
      let l = document.querySelector('link[href*="Egyptian+Hieroglyphs"]');
      if (l && l.sheet) return go();
      if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Egyptian+Hieroglyphs&display=swap'; document.head.appendChild(l); }
      l.addEventListener('load', go); l.addEventListener('error', res); setTimeout(res, 4000);
    }),
  };
})();
