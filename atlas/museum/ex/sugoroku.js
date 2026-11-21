/* 所蔵品：木画紫檀双六局（正倉院 北倉37） — units: 1 = 1 cm; 54.3 × 31.0 cm, 16.7 cm high (the Shōsōin's record).
   A ban-sugoroku board listed in the Kokka chinpō-chō (the gifts of Emperor Shōmu's belongings, 756): a rectangular face of
   shitan veneer on a wooden core, a raised rim on all four sides, the whole on a 床脚 base. On the face, an ivory crescent in the
   middle of each long side with six marquetry flowers either side of it, and one flower in the middle of each short side — the
   places where the pieces stand. The outer faces of the rim and the base: marquetry of flowering scrolls with birds (hoopoes,
   sparrows) in ivory, green-stained deer antler, boxwood, ebony, shitan and bamboo. Two ivory dice (双六頭, kept apart as North 17)
   are set on the board for reference. Estimates: the heights of base, slab and rim; the number of arches in the base; the drawing
   of the scrolls and birds; the size and spacing of the flowers. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).sugoroku = {
    build(TT, X, K) {
      const G = new TT.Group();
      const L = 54.3, W = 31.0, H = 16.7, BASE = 9.4, SLAB = 3.0, RIM = H - BASE - SLAB, RT = 1.6;   // RIM: the rim above the face
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#4a1c14', b: '#2a0e0a', seed: 37, sx: .6, sy: 5, warp: .9, pores: .004 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 38, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .4, clearcoatRoughness: .35 });
      const ivory = K.mat({ color: '#efe4cc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      const C = { iv: '#f0e4c8', box: '#d9b46a', grn: '#6f9a6e', eb: '#1c0f0a', bam: '#c9a86a', tan: '#b98a55' };
      /* ---------- marquetry: a flowering scroll with birds among it ---------- */
      const flower = (g, x, y, r, a = '#f3e9d2', b = C.box) => { g.save(); g.translate(x, y);
        for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(r * .55, 0, r * .5, r * .26, 0, 0, 6.29); g.fillStyle = i % 2 ? a : '#e2cfaa'; g.fill(); g.strokeStyle = 'rgba(40,16,8,.5)'; g.lineWidth = r * .05; g.stroke(); }
        g.beginPath(); g.arc(0, 0, r * .24, 0, 6.29); g.fillStyle = b; g.fill(); g.restore(); };
      const bird = (g, x, y, k, flip, crest, col) => { g.save(); g.translate(x, y); g.scale(flip ? -k : k, k); g.fillStyle = col; g.strokeStyle = 'rgba(30,12,6,.6)'; g.lineWidth = .8;
        g.beginPath(); g.moveTo(-16, 2); g.quadraticCurveTo(-4, -9, 9, -6); g.quadraticCurveTo(14, -9, 18, -7); g.lineTo(25, -6); g.lineTo(18, -4); g.quadraticCurveTo(12, 5, -2, 6); g.lineTo(-20, 12); g.lineTo(-14, 4); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = C.grn; g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(-10, -20, -24, -17); g.quadraticCurveTo(-12, -8, -2, -2); g.fill(); g.stroke();   // the raised wing, in green-stained antler
        if (crest) { g.fillStyle = C.box; g.beginPath(); g.moveTo(10, -8); g.lineTo(8, -17); g.lineTo(12, -10); g.lineTo(13, -18); g.lineTo(15, -9); g.closePath(); g.fill(); }   // a hoopoe's crest
        g.fillStyle = C.eb; g.beginPath(); g.arc(13, -6, 1.2, 0, 6.29); g.fill(); g.restore(); };
      const scroll = (g, w, h, s, seed) => {
        g.drawImage(shT.image, 0, 0, w, h);
        g.strokeStyle = C.iv; g.lineWidth = s * .12; g.strokeRect(s * .35, s * .35, w - s * .7, h - s * .7);
        const cy = h / 2, amp = h * .22, per = s * 7;
        g.strokeStyle = C.bam; g.lineWidth = s * .16; g.beginPath(); for (let x = s * .6; x <= w - s * .6; x += 2) { const y = cy + Math.sin(x / per * Math.PI * 2) * amp; x <= s * .6 + 1 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke();
        let k = 0;
        for (let x = s * .6 + per / 4; x < w - s; x += per / 2, k++) { const up = k % 2 ? 1 : -1, y = cy + up * amp;
          // a curling tendril with a leaf and a flower at its end
          g.strokeStyle = C.bam; g.lineWidth = s * .08; g.beginPath(); g.arc(x + per * .1, y - up * amp * .35, amp * .5, 0, Math.PI * 1.5 * (up > 0 ? 1 : -1), up < 0); g.stroke();
          g.fillStyle = C.grn; g.beginPath(); g.ellipse(x - per * .12, y + up * amp * .1, s * .55, s * .2, up * .7, 0, 6.29); g.fill();
          flower(g, x + per * .1, y - up * amp * .35, s * .62, C.iv, (k + seed) % 3 ? C.box : '#b4493a');
          if ((k + seed) % 3 === 1) bird(g, x + per * .26, cy - up * amp * .1, s * .055, (k + seed) % 2, (k + seed) % 4 === 1, k % 2 ? C.iv : C.box);
        }
      };
      const sideMat = (len, ht, seed) => { const s = 2048 / len; const t = K.tex(2048, Math.round(ht * s), (g, w, h) => scroll(g, w, h, s, seed));
        return K.mat({ map: t, color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .35 }); };
      /* ---------- the face: crescents and flowers marking the places for the pieces ---------- */
      const IL = L - RT * 2, IW = W - RT * 2;
      const faceT = K.tex(2048, Math.round(2048 * IW / IL), (g, w, h) => {
        g.drawImage(shT.image, 0, 0, w, h); const s = w / IL;
        g.fillStyle = 'rgba(20,4,8,.12)'; g.fillRect(0, 0, w, h);
        const row = s * 2.4, step = (IL / 2 - 4.2) / 6;   // the flowers' distance from the long edge; their spacing (estimates)
        [row, h - row].forEach((y, side) => {
          // the ivory crescent in the middle of the long side, horns towards the edge
          g.save(); g.translate(w / 2, y); if (side) g.scale(1, -1);
          g.beginPath(); g.arc(0, 0, s * 1.5, 0, Math.PI * 2); g.arc(0, -s * .8, s * 1.3, 0, Math.PI * 2, true); g.fillStyle = '#f2e8d2'; g.fill('evenodd');
          g.strokeStyle = 'rgba(60,30,10,.4)'; g.lineWidth = s * .05; g.stroke(); g.restore();
          for (let i = 1; i <= 6; i++) [-1, 1].forEach(d => flower(g, w / 2 + d * (s * 2.4 + (i - .5) * step * s), y, s * .8, C.iv, i % 2 ? C.box : '#b4493a'));
        });
        flower(g, s * 2.2, h / 2, s * .8, C.iv, C.box); flower(g, w - s * 2.2, h / 2, s * .8, C.iv, C.box);
      });
      const face = K.mat({ map: faceT, color: '#ffffff', roughness: .55, clearcoat: .22, clearcoatRoughness: .5 });
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
      // the slab and its face (inside the rim), the four rims with their carved outer faces and ivory-edged tops
      const slabL = sideMat(L, SLAB, 1), slabW = sideMat(W, SLAB, 2);
      add(new TT.BoxGeometry(L, SLAB, W), [slabW, slabW, shitan, shitan, slabL, slabL], 0, BASE + SLAB / 2, 0);
      face.polygonOffset = true; face.polygonOffsetFactor = -2; face.polygonOffsetUnits = -2;   // (drawn over the slab's top without shimmering)
      add(new TT.PlaneGeometry(IL, IW), face, 0, BASE + SLAB + .005, 0).rotation.x = -Math.PI / 2;
      const rimL = sideMat(L, RIM, 3), rimW = sideMat(W, RIM, 4);
      [[L, W / 2 - RT / 2, 0, rimL], [L, W / 2 - RT / 2, Math.PI, rimL], [W - RT * 2, L / 2 - RT / 2, Math.PI / 2, rimW], [W - RT * 2, L / 2 - RT / 2, -Math.PI / 2, rimW]].forEach(([len, off, ry, m]) => {
        const g = new TT.Group(); g.rotation.y = ry; G.add(g);
        const r = new TT.Mesh(new TT.BoxGeometry(len, RIM, RT), [shitan, shitan, shitan, shitan, m, shitan]); r.position.set(0, BASE + SLAB + RIM / 2, off); r.castShadow = r.receiveShadow = true; g.add(r);
        const e = new TT.Mesh(new TT.BoxGeometry(len + .02, .18, RT + .02), ivory); e.position.set(0, H - .09, off); g.add(e); });
      // ivory strips where the rim meets the slab, outside
      [[L + .1, .14, 0, W / 2 + .03], [L + .1, .14, 0, -W / 2 - .03], [.14, W + .1, L / 2 + .03, 0], [.14, W + .1, -L / 2 - .03, 0]].forEach(([a, b, x, z]) => add(new TT.BoxGeometry(a, .16, b), ivory, x, BASE + SLAB, z));
      /* ---------- the 床脚 base: skirts cut with cusped arches (two on the long sides, one on the short — estimate) ---------- */
      const arch = (cx, w, h) => { const p = new TT.Path(), x0 = cx - w / 2, x1 = cx + w / 2;
        p.moveTo(x0 + .5, 0); p.lineTo(x1 - .5, 0); p.quadraticCurveTo(x1, .1, x1 - .1, h * .35); p.quadraticCurveTo(x1 - w * .12, h * .55, x1 - w * .2, h - .5);
        p.quadraticCurveTo(cx + w * .12, h + .1, cx + w * .02, h - .55); p.quadraticCurveTo(cx, h - .2, cx - w * .02, h - .55); p.quadraticCurveTo(cx - w * .12, h + .1, x0 + w * .2, h - .5);
        p.quadraticCurveTo(x0 + w * .12, h * .55, x0 + .1, h * .35); p.quadraticCurveTo(x0, .1, x0 + .5, 0); return p; };
      const skirt = (len, n) => { const S = new TT.Shape(); S.moveTo(-len / 2, 0); S.lineTo(len / 2, 0); S.lineTo(len / 2, BASE); S.lineTo(-len / 2, BASE); S.closePath();
        const aw = (len - 3.2 - (n - 1) * 2.2) / n; for (let i = 0; i < n; i++) S.holes.push(arch(-len / 2 + 1.6 + aw / 2 + i * (aw + 2.2), aw, BASE - 2.4));
        return new TT.ExtrudeGeometry(S, { depth: 1.2, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 12 }); };
      const legM = (len, seed) => { const m = sideMat(len, BASE, seed); m.map.repeat.set(1 / len, 1 / BASE); m.map.offset.set(.5, 0); return m; };
      const lL = legM(L, 5), lW = legM(W, 6), gL = skirt(L, 2), gW = skirt(W, 1);
      [[gL, lL, 0, W / 2 - 1.2, 0], [gL, lL, 0, -W / 2 + 1.2, Math.PI], [gW, lW, L / 2 - 1.2, 0, Math.PI / 2], [gW, lW, -L / 2 + 1.2, 0, -Math.PI / 2]].forEach(([geo, m, x, z, ry]) => {
        const o = new TT.Mesh(geo, [m, shitan]); o.rotation.y = ry; o.position.set(x, 0, z); o.castShadow = o.receiveShadow = true; G.add(o); });
      add(new TT.BoxGeometry(L - 2.4, .6, W - 2.4), shitan, 0, BASE - .3, 0);
      // a low floor rail under the feet (the bottom of the 床脚)
      [[L, W / 2 - .6], [L, -W / 2 + .6]].forEach(([len, z]) => add(new TT.BoxGeometry(len, .5, 1.2), shitan, 0, .25, z));
      [[L / 2 - .6], [-L / 2 + .6]].forEach(([x]) => add(new TT.BoxGeometry(1.2, .5, W - 2.4), shitan, x, .25, 0));
      /* ---------- two ivory dice (双六頭, ~1.35 cm; opposite faces add up to 7) ---------- */
      const pipT = n => K.tex(128, 128, (g, w) => { g.fillStyle = '#efe3c6'; g.fillRect(0, 0, w, w); g.fillStyle = n === 1 ? '#a8322a' : '#2a1a10';
        const P = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .22], [.72, .22], [.28, .5], [.72, .5], [.28, .78], [.72, .78]] }[n];
        P.forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * w, w * (n === 1 ? .14 : .09), 0, 6.29); g.fill(); }); });
      const dieM = [1, 6, 2, 5, 3, 4].map(n => K.mat({ map: pipT(n), color: '#ffffff', roughness: .38, clearcoat: .3 }));   // +x 1 / −x 6, +y 2 / −y 5, +z 3 / −z 4
      [[4.5, -2.0, .4, .3], [7.0, -.6, -.7, 1.1]].forEach(([x, z, r1, r2]) => { const d = add(new TT.BoxGeometry(1.35, 1.35, 1.35), dieM, x, BASE + SLAB + .68, z); d.rotation.set(0, r1, 0); });
      return G;
    },
  };
})();
