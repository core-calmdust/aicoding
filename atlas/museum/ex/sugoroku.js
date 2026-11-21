/* 所蔵品：木画紫檀双六局（正倉院 北倉37） — units: 1 = 1 cm; 54.3 × 31.0 cm, 16.7 cm high (the Shōsōin's record).
   A ban-sugoroku board listed in the Kokka chinpō-chō (the gifts of Emperor Shōmu's belongings, 756).
   Rebuilt 2026-11-21 after the Shōsōin's photographs (CO0000000441, CO0000011755–11767): a face of dark shitan in planks along
   the length with a low ivory-edged rim; on it a thin ivory crescent in the middle of each long side (horns to the edge) with six
   boxwood flowers either side, one flower in the middle of each short side, and a band of scroll inside the long rims. The board's
   edge (about 2.6 cm) is dark shitan with scrolls in bamboo-coloured strips, ivory flowers, green-stained antler leaves and flying
   birds with striped wings, between ivory strips. Below a narrow dark strip set with small ivory rosettes, the base (床脚) is of a
   lighter, redder wood with the same scrolls: on each long side two large openings — rounded at the bottom, their sides bowing
   out, their tops in two shallow arcs meeting in a point — leaving slender corner legs and a waisted post in the middle; one opening
   on each short side; the whole on a low rail set with ivory dots. Heights measured on the side photograph: edge 3.4 (rim
   included), base 12.5, rail .8. Two ivory dice (双六頭, kept apart as North 17) are set on the board for reference. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).sugoroku = {
    build(TT, X, K) {
      const G = new TT.Group();
      const L = 54.3, W = 31.0, H = 16.7, RAIL = .8, BASE = 13.3, LIN = .9, EDGE = H - BASE, RIM = 1.9, RT = .7;   // (RIM: the wall round the field stands upright, about 1.9 high — the overall photograph)   // LIN: the strip of rosettes at the top of the base
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#3e2016', b: '#1f0e09', seed: 37, sx: .5, sy: 9, warp: .45, pores: .004 }));
      const baseT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#70452a', b: '#4c2c1a', seed: 41, sx: .5, sy: 12, warp: .3, pores: .004 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 38, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      const inner = K.mat({ map: baseT, color: '#ffffff', roughness: .55, clearcoat: .2, clearcoatRoughness: .4 });
      const ivory = K.mat({ color: '#efe4cc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      const C = { iv: '#efe6d2', grn: '#5f9a78', bam: '#c98a3c', eb: '#1c0f0a', tan: '#b98a55' };
      /* ---------- marquetry (after the detail photographs) ---------- */
      const flower = (g, x, y, r, k = 0) => { g.save(); g.translate(x, y); g.rotate(k);
        for (let i = 0; i < 5; i++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.arc(r * .55, 0, r * .42, 0, 6.29); g.fillStyle = C.iv; g.fill(); g.strokeStyle = 'rgba(40,16,8,.55)'; g.lineWidth = r * .07; g.stroke(); }
        g.beginPath(); g.arc(0, 0, r * .38, 0, 6.29); g.fillStyle = '#3a1e12'; g.fill(); g.beginPath(); g.arc(0, 0, r * .15, 0, 6.29); g.fillStyle = C.iv; g.fill(); g.restore(); };
      const leaf = (g, x, y, r, a) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-r, 0); g.quadraticCurveTo(-r * .2, -r * .75, r, 0); g.quadraticCurveTo(-r * .2, r * .75, -r, 0);
        g.fillStyle = C.grn; g.fill(); g.strokeStyle = 'rgba(40,40,10,.45)'; g.lineWidth = r * .06; g.stroke(); g.beginPath(); g.moveTo(-r * .8, 0); g.lineTo(r * .7, 0); g.stroke(); g.restore(); };
      const bird = (g, x, y, k, flip) => { g.save(); g.translate(x, y); g.scale(flip ? -k : k, k); g.lineWidth = .8; g.strokeStyle = 'rgba(30,12,6,.6)';
        g.fillStyle = '#b88a5a'; g.beginPath(); g.moveTo(-18, 6); g.quadraticCurveTo(-6, -4, 8, -4); g.quadraticCurveTo(14, -14, 20, -16); g.lineTo(26, -15); g.lineTo(21, -12); g.quadraticCurveTo(18, -2, 12, 4); g.quadraticCurveTo(0, 10, -18, 6); g.fill(); g.stroke();
        // the wings raised, striped in green antler, boxwood and ebony
        [[-2, -2, -14, -22, -24, -12], [2, 0, 4, -24, -8, -26]].forEach(([a, b, c, d, e, f], j) => { g.save(); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.clip();
          for (let q = 0; q < 8; q++) { g.fillStyle = [C.grn, C.bam, C.eb, C.iv][q % 4]; g.fillRect(-30 + q * 4, -30, 4, 34); } g.restore(); g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.stroke(); });
        g.fillStyle = C.iv; g.beginPath(); g.moveTo(9, -4); g.quadraticCurveTo(14, -14, 20, -16); g.lineTo(26, -15); g.lineTo(21, -12); g.quadraticCurveTo(17, -4, 13, 0); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = C.eb; g.beginPath(); g.arc(19, -13, 1, 0, 6.29); g.fill(); g.restore(); };
      // a scroll: bamboo-coloured stems in loops, flowers, leaves, now and then a bird
      const scroll = (g, w, h, s, seed, bgT, opt = {}) => {
        g.drawImage(bgT.image, 0, 0, w, h); let sd = seed * 7919 + 1; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        const cy = h / 2, amp = Math.min(h * .26, s * 1.1), per = s * (opt.per || 7);
        g.strokeStyle = C.bam; g.lineWidth = s * .06; g.lineCap = 'round';
        g.beginPath(); for (let x = 0; x <= w; x += 2) { const y = cy + Math.sin(x / per * Math.PI * 2) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        let k = 0;
        for (let x = per / 4; x < w; x += per / 2, k++) { const up = k % 2 ? 1 : -1, y = cy + up * amp, lr = Math.min(h * .3, s * 1.15);
          g.beginPath(); g.arc(x + per * .12, cy - up * amp * .1, lr, 0, 6.29); g.stroke();   // a loop of stem round the flower
          const t = (k + seed) % 5;
          if (t === 2 && opt.birds !== false) bird(g, x + per * .12, cy, Math.min(s * .045, h * .018), (k + seed) % 2);
          else if (t === 0) { const fx = x + per * .12, fy = cy - up * amp * .1; g.save(); g.translate(fx, fy); for (let q = 0; q < 8; q++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(lr * .5, 0, lr * .38, lr * .2, 0, 0, 6.29); g.fillStyle = q % 2 ? C.grn : C.iv; g.fill(); }
            g.beginPath(); g.arc(0, 0, lr * .32, 0, 6.29); g.fillStyle = '#d8b46e'; g.fill(); g.beginPath(); g.arc(0, 0, lr * .14, 0, 6.29); g.fillStyle = '#3a1e12'; g.fill(); g.restore(); }
          else flower(g, x + per * .12, cy - up * amp * .1, lr * .62, rnd());
          leaf(g, x - per * .14, y - up * lr * .1, s * .62, up * .6 + rnd() * .4); leaf(g, x + per * .36, y + up * lr * .25, s * .45, -up * .9);
        }
        if (opt.edge) { g.fillStyle = C.iv; g.fillRect(0, 0, w, s * .18); g.fillRect(0, h - s * .18, w, s * .18); }
      };
      const inlC = null;   // (2026-11-22: a layout lifted from the frontal photographs was tried and dropped — at their resolution it came out broken and scratchy; the marquetry is drawn)
      const mk = (t, base) => K.mat({ map: t, color: '#ffffff', roughness: .48, clearcoat: .3, clearcoatRoughness: .35 });
      /* ---------- the face ---------- */
      const IL = L - RT * 2, IW = W - RT * 2, ROW = 2.0, P0 = 4.9, PS = 3.75;   // the row of points: its distance from the rim, the first point's distance from the centre, the pitch
      const faceT = K.tex(2048, Math.round(2048 * IW / IL), (g, w, h) => { const s = w / IL;
        K.grain(g, w, h, { a: '#331a11', b: '#26120b', seed: 44, sx: .3, sy: 9, warp: .2, pores: .003 });   // straight grain along the length
        let y = 0, sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;   // planks along the length, slightly different in tone
        while (y < h) { const ph = s * (4.5 + rnd() * 2.5); g.fillStyle = rnd() < .5 ? `rgba(0,0,0,${rnd() * .18})` : `rgba(120,50,30,${rnd() * .12})`; g.fillRect(0, y, w, ph); g.fillStyle = 'rgba(10,3,2,.5)'; g.fillRect(0, y, w, s * .04); y += ph; }
        // ---- the playing marks (the Shōsōin's overall photograph): along each long side twelve flower "points", six to the left and six to
        // the right of a half-moon; one flower in the middle of each short side. This is the board's layout as a game board (双六).
                const rosette = (fx, fy, r) => { g.save(); g.translate(fx, fy);
          for (let q = 0; q < 8; q++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(r * .28, 0); g.quadraticCurveTo(r * .7, r * .42, r, 0); g.quadraticCurveTo(r * .7, -r * .42, r * .28, 0); g.fillStyle = q % 2 ? '#efe6d2' : '#c98a3c'; g.fill(); g.strokeStyle = 'rgba(40,16,8,.6)'; g.lineWidth = s * .03; g.stroke(); }
          g.beginPath(); g.arc(0, 0, r * .36, 0, 6.29); g.fillStyle = '#5f9a8c'; g.fill(); g.strokeStyle = '#efe6d2'; g.lineWidth = s * .06; g.stroke(); g.beginPath(); g.arc(0, 0, r * .12, 0, 6.29); g.fillStyle = '#efe6d2'; g.fill(); g.restore(); };
        const row = s * ROW;
        [row, h - row].forEach((yy, side) => {
          g.save(); g.translate(w / 2, yy); if (!side) g.scale(1, -1); g.beginPath(); g.arc(0, s * 1.07, s * 3.47, Math.PI + .314, -.314); g.closePath(); g.fillStyle = 'rgba(8,3,2,.4)'; g.fill(); g.restore();   // the space inside the half-moon
          for (let i = 0; i < 6; i++) [-1, 1].forEach(d => rosette(w / 2 + d * s * (P0 + i * PS), yy, s * 1.05));
        });
        [s * 2.4, w - s * 2.4].forEach(fx => rosette(fx, h / 2, s * .8));
      });
      const face = K.mat({ map: faceT, color: '#ffffff', roughness: .55, clearcoat: .12, clearcoatRoughness: .45 });
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };

      /* ---------- the board's edge (the slab with its rim, one band of marquetry outside) ---------- */
      const edgeTex = (len, seed) => { const s = 2048 / len; return K.tex(2048, Math.round(EDGE * s), (g, w, h) => { if (!inlC) return scroll(g, w, h, s, seed, shT, { edge: true, per: 5.2 }); g.drawImage(shT.image, 0, 0, w, h);  g.fillStyle = C.iv; g.fillRect(0, 0, w, s * .14); g.fillRect(0, h - s * .14, w, s * .14); }); };
      const eL = mk(edgeTex(L, 1)), eW = mk(edgeTex(W, 2));
      const SL = EDGE - RIM;   // the slab; the face is at BASE + SL
      // the half-moons: a raised ivory arc in the middle of each long side, its horns toward the rim, the hollow facing the players' edge
      { const cs = new TT.Shape(); cs.moveTo(3.3, 0); cs.absarc(0, -1.07, 3.47, .314, Math.PI - .314, false); cs.absarc(0, -1.82, 3.77, Math.PI - .504, .504, true);
        const cg = new TT.ExtrudeGeometry(cs, { depth: .28, bevelEnabled: true, bevelThickness: .05, bevelSize: .04, bevelSegments: 2, curveSegments: 24 }); cg.rotateX(-Math.PI / 2);
        [1, -1].forEach(sd => { const m = new TT.Mesh(cg, ivory); m.position.set(0, BASE + SL, sd * (IW / 2 - ROW)); if (sd < 0) m.rotation.y = Math.PI; m.castShadow = true; G.add(m); }); }
      const eLs = mk(edgeTex(L, 1)), eWs = mk(edgeTex(W, 2));
      [eLs, eWs].forEach(m => { m.map.repeat.set(1, SL / EDGE); m.map.offset.set(0, 0); });
      add(new TT.BoxGeometry(L, SL, W), [eWs, eWs, shitan, shitan, eLs, eLs], 0, BASE + SL / 2, 0);
      face.polygonOffset = true; face.polygonOffsetFactor = -2; face.polygonOffsetUnits = -2;
      add(new TT.PlaneGeometry(IL, IW), face, 0, BASE + SL + .004, 0).rotation.x = -Math.PI / 2;
      [eL, eW].forEach(m => { m.map = m.map.clone(); m.map.repeat.set(1, RIM / EDGE); m.map.offset.set(0, SL / EDGE); m.map.needsUpdate = true; });
      const rimTop = K.mat({ map: K.tex(8, 64, (g, w, h) => { g.fillStyle = '#2c1810'; g.fillRect(0, 0, w, h); g.fillStyle = '#e4d3aa'; g.fillRect(0, h * .3, w, h * .4); }), color: '#ffffff', roughness: .45, clearcoat: .25 });
      // the wall's inner face (it stands at a right angle to the field): a spare run of thin stem, a small flower and a few green leaves
      // at wide intervals — much quieter than the outside (the overall photograph)
      const wallT = len => { const s = 2048 / len; return K.tex(2048, Math.max(16, Math.round(RIM * s)), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); g.lineCap = 'round';
        const per = s * 7.2, cy = h * .55;
        for (let x = per * .45, k = 0; x < w - per * .3; x += per, k++) { const up = k % 2 ? 1 : -1;
          g.strokeStyle = C.bam; g.lineWidth = s * .05; g.beginPath(); g.moveTo(x - per * .3, cy + up * h * .18); g.bezierCurveTo(x - per * .12, cy - up * h * .3, x + per * .1, cy + up * h * .3, x + per * .3, cy - up * h * .12); g.stroke();
          g.beginPath(); g.arc(x + per * .3, cy - up * h * .12 - h * .1, h * .1, 0, 5); g.stroke();
          flower(g, x, cy - up * h * .02, h * .16, k); leaf(g, x - per * .2, cy + up * h * .1, s * .5, up * .7); leaf(g, x + per * .17, cy - up * h * .05, s * .42, -up * .8); } }); };
      const wL = mk(wallT(L)), wW = mk(wallT(W - RT * 2));
      [[L, W / 2 - RT / 2, 0, eL], [L, W / 2 - RT / 2, Math.PI, eL], [W - RT * 2, L / 2 - RT / 2, Math.PI / 2, eW], [W - RT * 2, L / 2 - RT / 2, -Math.PI / 2, eW]].forEach(([len, off, ry, m]) => {
        const g = new TT.Group(); g.rotation.y = ry; G.add(g);
        // (the ivory line along the rim's top is in the texture, not a sliver of geometry: a strip 3 mm wide sparkled at a distance)
        const r = new TT.Mesh(new TT.BoxGeometry(len, RIM, RT), [shitan, shitan, rimTop, shitan, m, len === L ? wL : wW]); r.position.set(0, BASE + SL + RIM / 2, off); r.castShadow = r.receiveShadow = true; g.add(r); });
      /* ---------- the base: openings with bowed sides and two-arched tops, a waisted post on the long sides ---------- */
      const SK = BASE - RAIL, OT = SK - .35;   // skirt height, the openings' top
      const opening = (x0, x1) => { const p = new TT.Path(), top = OT, b0 = .35;
        // (the Shōsōin's detail photograph of a post: it stands like an hourglass — waisted a little above the middle, sweeping out in a
        // long curve to the foot and in a shorter one under the top rail; the opening's top is flat)
        const fx = 4.8, fy = top * .46, tx = 2.6, ty = top * .52, bow = 0;   // (measured on the frontal photographs: legs 2 wide at the waist, 6.5 at the foot, 3.7 under the rail)
        p.moveTo(x0 + fx, b0); p.lineTo(x1 - fx, b0); p.bezierCurveTo(x1 - fx * .45, b0 + fy * .22, x1 + bow, fy * .5, x1 + bow, fy);
        p.lineTo(x1 + bow, top - ty); p.bezierCurveTo(x1 + bow, top - ty * .5, x1 - tx * .45, top - .3 - ty * .2, x1 - tx, top - .3);
        { const cx = (x0 + x1) / 2, t0 = top - .3, hw = (x1 - x0) / 2, a = hw * .78, b = hw * .2, dp = 1.25;   // the rail's hanging bracket: a long lobe either side, a small peak between them
          p.lineTo(cx + a, t0); p.bezierCurveTo(cx + a * .8, t0, cx + a * .72, t0 - dp, cx + a * .52, t0 - dp); p.bezierCurveTo(cx + b * 1.6, t0 - dp, cx + b, t0 - dp * .75, cx, t0 - dp * .35);
          p.bezierCurveTo(cx - b, t0 - dp * .75, cx - b * 1.6, t0 - dp, cx - a * .52, t0 - dp); p.bezierCurveTo(cx - a * .72, t0 - dp, cx - a * .8, t0, cx - a, t0); }
        p.lineTo(x0 + tx, top - .3); p.bezierCurveTo(x0 + tx * .45, top - .3 - ty * .2, x0 - bow, top - ty * .5, x0 - bow, top - ty);
        p.lineTo(x0 - bow, fy); p.bezierCurveTo(x0 - bow, fy * .5, x0 + fx * .45, b0 + fy * .22, x0 + fx, b0); return p; };
      const skirtFor = (len, n) => { const S = new TT.Shape(); S.moveTo(-len / 2, 0); S.lineTo(len / 2, 0); S.lineTo(len / 2, SK); S.lineTo(-len / 2, SK); S.closePath();
        const LEG = 2.3, POST = 2.5, ow = (len - 2 * LEG - (n - 1) * POST) / n;
        for (let i = 0; i < n; i++) { const x0 = -len / 2 + LEG + i * (ow + POST); S.holes.push(opening(x0, x0 + ow)); }
        return S; };
      const baseTex = (len, n, seed) => { const S = skirtFor(len, n), s = 2048 / len; return K.tex(2048, Math.round(SK * s), (g, w, h) => {
        g.drawImage(baseT.image, 0, 0, w, h);
        // vertical scrolls up the corner legs and the post (where the wood stands between the openings)
        const LEG = 2.3, POST = 2.5, nO = S.holes.length, ow = (len - 2 * LEG - (nO - 1) * POST) / nO, cols = [LEG * .55, len - LEG * .55];
        for (let i = 1; i < nO; i++) cols.push(LEG + i * ow + (i - .5) * POST);
        const vs = K.tex(512, Math.round(512 * 3.4 / SK), (g2, w2, h2) => scroll(g2, w2, h2, w2 / SK, seed, baseT, { per: 5.2 }));
        cols.forEach(cxm => { g.save(); g.translate(cxm * s, h); g.rotate(-Math.PI / 2); g.globalAlpha = 1; g.drawImage(vs.image, 0, -s * 1.7, h, s * 3.4); g.restore(); });
        // across the top, between the openings and the edge, a running scroll
        // the strip of rosettes along the top
        g.fillStyle = C.iv; g.fillRect(0, 0, w, s * .14);
        S.holes.forEach(hp => { const xs = hp.getPoints(30).map(p => p.x), xa = (Math.min(...xs) + len / 2) * s, xb = (Math.max(...xs) + len / 2) * s;   // over each opening, a dark strip with rosettes
          g.fillStyle = '#2a140c'; g.fillRect(xa + s * 1.5, s * .14, xb - xa - s * 3, LIN * s); for (let x = xa + s * 2.4; x < xb - s * 2; x += s * 2.4) flower(g, x, s * .14 + LIN * s * .5, s * .26, x); });
        // a bamboo strip following each opening, ivory down the corners
        g.strokeStyle = C.iv; g.lineWidth = s * .13; S.holes.forEach(hp => { g.beginPath(); hp.getPoints(30).forEach((p, i) => { const X = (p.x + len / 2) * s, Y = h - p.y * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); });
        g.fillStyle = C.iv; g.fillRect(0, 0, s * .18, h); g.fillRect(w - s * .18, 0, s * .18, h);
      }); };
      const baseMat = (len, n, seed) => { const t = baseTex(len, n, seed); t.repeat.set(1 / len, 1 / SK); t.offset.set(.5, 0); return mk(t); };
      const geoFor = (len, n) => new TT.ExtrudeGeometry(skirtFor(len, n), { depth: 1.3, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 14 });
      const ivory2 = K.mat({ color: '#6a4c2e', roughness: .9 });   // (the openings are lined with a pale wood strip — tan, not white: the frontal photographs)
      const gL = geoFor(L, 2), gW = geoFor(W, 1); gL.userData = { len: L, n: 2 }; gW.userData = { len: W, n: 1 }; const mL = baseMat(L, 2, 5), mW = baseMat(W, 1, 6);
      [[gL, mL, 0, W / 2 - 1.3, 0], [gL, mL, 0, -W / 2 + 1.3, Math.PI], [gW, mW, L / 2 - 1.3, 0, Math.PI / 2], [gW, mW, -L / 2 + 1.3, 0, -Math.PI / 2]].forEach(([geo, m, x, z, ry]) => {
        // (the openings' cut faces are a pale wood strip: the extrusion's own side material — a separate ribbon lay in the same plane and flickered)
        const o = new TT.Mesh(geo, [m, ivory2]); o.rotation.y = ry; o.position.set(x, RAIL, z); o.scale.x = .9975;   /* (each panel a hair short: its end face lay in the same plane as the next panel's front and the two fought at the corner legs, a flicker at a distance) */ o.castShadow = o.receiveShadow = true; G.add(o); });
      add(new TT.BoxGeometry(L - 2.6, .5, W - 2.6), inner, 0, BASE - .25, 0);
      // the low rail: dark, with ivory edges and a row of ivory dots and little lozenges
      // the floor frame's outer face (the overall photograph): an ivory line top and bottom, and between them four-petalled lozenge flowers
      // in ivory alternating with small ivory dots
      const railT = (len) => { const s = 2048 / len; return K.tex(2048, Math.max(8, Math.round(RAIL * s)), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h);
        g.fillStyle = C.iv; g.fillRect(0, 0, w, h * .14); g.fillRect(0, h * .86, w, h * .14);
        const n = Math.round(len / 2.7), st = w / n;
        for (let i = 0; i < n; i++) { const x = (i + .5) * st, r = h * .24; g.fillStyle = C.iv;
          for (let q = 0; q < 4; q++) { const a = q * Math.PI / 2; g.beginPath(); g.ellipse(x + Math.cos(a) * r, h / 2 + Math.sin(a) * r, r * .95, r * .55, a, 0, 6.29); g.fill(); }
          g.fillStyle = '#3a1e12'; g.beginPath(); g.arc(x, h / 2, r * .3, 0, 6.29); g.fill(); g.fillStyle = C.iv; g.beginPath(); g.arc(x + st / 2, h / 2, h * .09, 0, 6.29); g.fill(); } }); };
      const rL = mk(railT(L)), rW = mk(railT(W));
      [[L, 1.8, 0, W / 2 - .9, 0], [L, 1.8, 0, -W / 2 + .9, Math.PI]].forEach(([len, d, x, z]) => add(new TT.BoxGeometry(len, RAIL, d), [rL, rL, inner, inner, z > 0 ? rL : inner, z > 0 ? inner : rL], x, RAIL / 2, z));
      [[1.8, W - 3.6, L / 2 - .9, 0], [1.8, W - 3.6, -L / 2 + .9, 0]].forEach(([wd, d, x]) => add(new TT.BoxGeometry(wd, RAIL, d), [x > 0 ? rW : inner, x > 0 ? inner : rW, inner, inner, inner, inner], x, RAIL / 2, 0));
      /* ---------- two ivory dice (双六頭, ~1.35 cm; opposite faces add up to 7) ---------- */
      const pipT = n => K.tex(128, 128, (g, w) => { g.fillStyle = '#efe3c6'; g.fillRect(0, 0, w, w); g.fillStyle = n === 1 ? '#a8322a' : '#2a1a10';
        const P = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.25, .25], [.5, .5], [.75, .75]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.25, .25], [.75, .25], [.5, .5], [.25, .75], [.75, .75]], 6: [[.28, .22], [.72, .22], [.28, .5], [.72, .5], [.28, .78], [.72, .78]] }[n];
        P.forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * w, w * (n === 1 ? .14 : .09), 0, 6.29); g.fill(); }); });
      const dieM = [1, 6, 2, 5, 3, 4].map(n => K.mat({ map: pipT(n), color: '#ffffff', roughness: .38, clearcoat: .3 }));   // +x 1 / −x 6, +y 2 / −y 5, +z 3 / −z 4
      [[4.5, -2.0, .4, .3], [7.0, -.6, -.7, 1.1]].forEach(([x, z, r1, r2]) => { const d = add(new TT.BoxGeometry(1.35, 1.35, 1.35), dieM, x, BASE + EDGE - RIM + .68, z); d.rotation.set(0, r1, 0); });
      return G;
    },
  };
})();
