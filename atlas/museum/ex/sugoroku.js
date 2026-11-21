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
      const L = 54.3, W = 31.0, H = 16.7, RAIL = .8, BASE = 13.3, LIN = .9, EDGE = H - BASE, RIM = .7, RT = .7;   // LIN: the strip of rosettes at the top of the base
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#3e2016', b: '#1f0e09', seed: 37, sx: .5, sy: 9, warp: .45, pores: .004 }));
      const baseT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#8a5a32', b: '#6a3e22', seed: 41, sx: .5, sy: 12, warp: .3, pores: .004 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 38, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      const inner = K.mat({ map: baseT, color: '#ffffff', roughness: .55, clearcoat: .2, clearcoatRoughness: .4 });
      const ivory = K.mat({ color: '#efe4cc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      const C = { iv: '#e4d3aa', grn: '#7f9258', bam: '#c9995e', eb: '#1c0f0a', tan: '#b98a55' };
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
        g.strokeStyle = C.bam; g.lineWidth = s * .09; g.lineCap = 'round';
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
      const mk = (t, base) => K.mat({ map: t, color: '#ffffff', roughness: .48, clearcoat: .3, clearcoatRoughness: .35 });
      /* ---------- the face ---------- */
      const IL = L - RT * 2, IW = W - RT * 2;
      const faceT = K.tex(2048, Math.round(2048 * IW / IL), (g, w, h) => { const s = w / IL;
        K.grain(g, w, h, { a: '#331a11', b: '#26120b', seed: 44, sx: .3, sy: 9, warp: .2, pores: .003 });   // straight grain along the length
        let y = 0, sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;   // planks along the length, slightly different in tone
        while (y < h) { const ph = s * (4.5 + rnd() * 2.5); g.fillStyle = rnd() < .5 ? `rgba(0,0,0,${rnd() * .18})` : `rgba(120,50,30,${rnd() * .12})`; g.fillRect(0, y, w, ph); g.fillStyle = 'rgba(10,3,2,.5)'; g.fillRect(0, y, w, s * .04); y += ph; }
        // a band of scroll inside each long rim (seen on the far side in the overall photograph)
        const band = K.tex(2048, Math.round(2048 * 2.1 / IL), (g2, w2, h2) => scroll(g2, w2, h2, w2 / IL, 9, shT, { per: 3.1, birds: false }));
        g.globalAlpha = .8; g.drawImage(band.image, 0, 0, w, s * 2.1); g.save(); g.translate(w, h); g.rotate(Math.PI); g.drawImage(band.image, 0, 0, w, s * 2.1); g.restore(); g.globalAlpha = 1;
        const row = s * 1.05, step = s * 3.1;
        [row, h - row].forEach((yy, side) => {
          // a thin crescent, horns towards the edge
          g.save(); g.translate(w / 2, yy); if (side) g.scale(1, -1);
          g.translate(0, s * .5); g.beginPath(); g.arc(0, -s * 4.6, s * 5.4, .27 * Math.PI, .73 * Math.PI); g.arc(0, -s * 5.15, s * 5.4, .71 * Math.PI, .29 * Math.PI, true); g.closePath();
          g.fillStyle = '#e2c47e'; g.fill(); g.strokeStyle = 'rgba(60,30,10,.45)'; g.lineWidth = s * .04; g.stroke(); g.restore();
          for (let i = 1; i <= 6; i++) [-1, 1].forEach(d => { const fx = w / 2 + d * (s * 1.6 + i * step); g.save(); g.translate(fx, yy);
            for (let q = 0; q < 6; q++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(s * .42, 0, s * .36, s * .25, 0, 0, 6.29); g.fillStyle = '#c99a4e'; g.fill(); g.strokeStyle = 'rgba(40,16,8,.5)'; g.lineWidth = s * .03; g.stroke(); }
            g.beginPath(); g.arc(0, 0, s * .2, 0, 6.29); g.fillStyle = '#efe2c2'; g.fill(); g.restore(); });
        });
        [s * 2.2, w - s * 2.2].forEach(fx => { g.save(); g.translate(fx, h / 2); for (let q = 0; q < 6; q++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(s * .3, 0, s * .28, s * .16, 0, 0, 6.29); g.fillStyle = '#d8b46e'; g.fill(); } g.beginPath(); g.arc(0, 0, s * .12, 0, 6.29); g.fillStyle = '#efe2c2'; g.fill(); g.restore(); });
      });
      const face = K.mat({ map: faceT, color: '#ffffff', roughness: .55, clearcoat: .12, clearcoatRoughness: .45 });
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; G.add(o); return o; };
      /* ---------- the board's edge (the slab with its rim, one band of marquetry outside) ---------- */
      const edgeTex = (len, seed) => { const s = 2048 / len; return K.tex(2048, Math.round(EDGE * s), (g, w, h) => scroll(g, w, h, s, seed, shT, { edge: true, per: 5.2 })); };
      const eL = mk(edgeTex(L, 1)), eW = mk(edgeTex(W, 2));
      const SL = EDGE - RIM;   // the slab; the face is at BASE + SL
      const eLs = mk(edgeTex(L, 1)), eWs = mk(edgeTex(W, 2));
      [eLs, eWs].forEach(m => { m.map.repeat.set(1, SL / EDGE); m.map.offset.set(0, 0); });
      add(new TT.BoxGeometry(L, SL, W), [eWs, eWs, shitan, shitan, eLs, eLs], 0, BASE + SL / 2, 0);
      face.polygonOffset = true; face.polygonOffsetFactor = -2; face.polygonOffsetUnits = -2;
      add(new TT.PlaneGeometry(IL, IW), face, 0, BASE + SL + .004, 0).rotation.x = -Math.PI / 2;
      [eL, eW].forEach(m => { m.map = m.map.clone(); m.map.repeat.set(1, RIM / EDGE); m.map.offset.set(0, SL / EDGE); m.map.needsUpdate = true; });
      [[L, W / 2 - RT / 2, 0, eL], [L, W / 2 - RT / 2, Math.PI, eL], [W - RT * 2, L / 2 - RT / 2, Math.PI / 2, eW], [W - RT * 2, L / 2 - RT / 2, -Math.PI / 2, eW]].forEach(([len, off, ry, m]) => {
        const g = new TT.Group(); g.rotation.y = ry; G.add(g);
        const r = new TT.Mesh(new TT.BoxGeometry(len, RIM, RT), [shitan, shitan, shitan, shitan, m, shitan]); r.position.set(0, BASE + SL + RIM / 2, off); r.castShadow = r.receiveShadow = true; g.add(r);
        const e = new TT.Mesh(new TT.BoxGeometry(len + .02, .1, .3), ivory); e.position.set(0, H - .05, off + RT / 2 - .14); g.add(e); });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(new TT.BoxGeometry(.2, EDGE, .2), ivory, a * (L / 2 - .08), BASE + EDGE / 2, b * (W / 2 - .08)));   // ivory strips on the corners
      /* ---------- the base: openings with bowed sides and two-arched tops, a waisted post on the long sides ---------- */
      const SK = BASE - RAIL, OT = SK - .35;   // skirt height, the openings' top
      const opening = (x0, x1) => { const p = new TT.Path(), cx = (x0 + x1) / 2, rx = 4.2, ry = 5.2, bow = 1.1, top = OT;
        // the bottom corners in long curves (the legs and the post flare out to their feet), the sides bowing out, the top in two arcs
        // meeting in a hanging point (photographs)
        p.moveTo(x0 + rx, .4); p.lineTo(x1 - rx, .4); p.bezierCurveTo(x1 - rx * .3, .4, x1 + bow * .4, ry * .45, x1 + bow * .55, ry); p.quadraticCurveTo(x1 + bow, (ry + top) / 2, x1 + .3, top - 2.6);
        p.quadraticCurveTo(x1, top - .2, x1 - 2.6, top - .1);
        p.quadraticCurveTo(cx + (x1 - cx) * .35, top + .1, cx + .6, top - .9); p.lineTo(cx, top - 1.5); p.lineTo(cx - .6, top - .9);
        p.quadraticCurveTo(cx - (cx - x0) * .35, top + .1, x0 + 2.6, top - .1); p.quadraticCurveTo(x0, top - .2, x0 - .3, top - 2.6);
        p.quadraticCurveTo(x0 - bow, (ry + top) / 2, x0 - bow * .55, ry); p.bezierCurveTo(x0 - bow * .4, ry * .45, x0 + rx * .3, .4, x0 + rx, .4); return p; };
      const skirtFor = (len, n) => { const S = new TT.Shape(); S.moveTo(-len / 2, 0); S.lineTo(len / 2, 0); S.lineTo(len / 2, SK); S.lineTo(-len / 2, SK); S.closePath();
        const LEG = 2.6, POST = 3.8, ow = (len - 2 * LEG - (n - 1) * POST) / n;
        for (let i = 0; i < n; i++) { const x0 = -len / 2 + LEG + i * (ow + POST); S.holes.push(opening(x0, x0 + ow)); }
        return S; };
      const baseTex = (len, n, seed) => { const S = skirtFor(len, n), s = 2048 / len; return K.tex(2048, Math.round(SK * s), (g, w, h) => {
        g.drawImage(baseT.image, 0, 0, w, h);
        // vertical scrolls up the corner legs and the post (where the wood stands between the openings)
        const LEG = 2.6, POST = 3.8, nO = S.holes.length, ow = (len - 2 * LEG - (nO - 1) * POST) / nO, cols = [LEG * .55, len - LEG * .55];
        for (let i = 1; i < nO; i++) cols.push(LEG + i * ow + (i - .5) * POST);
        const vs = K.tex(512, Math.round(512 * 3.4 / SK), (g2, w2, h2) => scroll(g2, w2, h2, w2 / SK, seed, baseT, { per: 5.2 }));
        cols.forEach(cxm => { g.save(); g.translate(cxm * s, h); g.rotate(-Math.PI / 2); g.globalAlpha = 1; g.drawImage(vs.image, 0, -s * 1.7, h, s * 3.4); g.restore(); });
        // across the top, between the openings and the edge, a running scroll
        const hs = K.tex(2048, Math.round(2048 * 2.2 / len), (g2, w2, h2) => scroll(g2, w2, h2, w2 / len, seed + 3, baseT, { per: 5.5, birds: false }));
        g.drawImage(hs.image, 0, s * .1, w, s * 2.2);
        // the strip of rosettes along the top
        g.fillStyle = C.iv; g.fillRect(0, 0, w, s * .14);
        S.holes.forEach(hp => { const xs = hp.getPoints(30).map(p => p.x), xa = (Math.min(...xs) + len / 2) * s, xb = (Math.max(...xs) + len / 2) * s;   // over each opening, a dark strip with rosettes
          g.fillStyle = '#2a140c'; g.fillRect(xa + s * 1.5, s * .14, xb - xa - s * 3, LIN * s); for (let x = xa + s * 2.4; x < xb - s * 2; x += s * 2.4) flower(g, x, s * .14 + LIN * s * .5, s * .26, x); });
        // a bamboo strip following each opening, ivory down the corners
        g.strokeStyle = C.bam; g.lineWidth = s * .14; S.holes.forEach(hp => { g.beginPath(); hp.getPoints(30).forEach((p, i) => { const X = (p.x + len / 2) * s, Y = h - p.y * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); });
        g.fillStyle = C.iv; g.fillRect(0, 0, s * .18, h); g.fillRect(w - s * .18, 0, s * .18, h);
      }); };
      const baseMat = (len, n, seed) => { const t = baseTex(len, n, seed); t.repeat.set(1 / len, 1 / SK); t.offset.set(.5, 0); return mk(t); };
      const geoFor = (len, n) => new TT.ExtrudeGeometry(skirtFor(len, n), { depth: 1.3, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 14 });
      const gL = geoFor(L, 2), gW = geoFor(W, 1), mL = baseMat(L, 2, 5), mW = baseMat(W, 1, 6);
      [[gL, mL, 0, W / 2 - 1.3, 0], [gL, mL, 0, -W / 2 + 1.3, Math.PI], [gW, mW, L / 2 - 1.3, 0, Math.PI / 2], [gW, mW, -L / 2 + 1.3, 0, -Math.PI / 2]].forEach(([geo, m, x, z, ry]) => {
        const o = new TT.Mesh(geo, [m, inner]); o.rotation.y = ry; o.position.set(x, RAIL, z); o.castShadow = o.receiveShadow = true; G.add(o); });
      add(new TT.BoxGeometry(L - 2.6, .5, W - 2.6), inner, 0, BASE - .25, 0);
      // the low rail: dark, with ivory edges and a row of ivory dots and little lozenges
      const railT = (len) => { const s = 2048 / len; return K.tex(2048, Math.max(8, Math.round(RAIL * s)), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h);
        g.fillStyle = C.iv; g.fillRect(0, 0, w, h * .12); g.fillRect(0, h * .88, w, h * .12);
        for (let x = s * .9, i = 0; x < w; x += s * 1.8, i++) { if (i % 2) { g.save(); g.translate(x, h / 2); g.rotate(Math.PI / 4); g.fillRect(-h * .14, -h * .14, h * .28, h * .28); g.restore(); } else { g.beginPath(); g.arc(x, h / 2, h * .2, 0, 6.29); g.strokeStyle = C.iv; g.lineWidth = h * .08; g.stroke(); } } }); };
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
