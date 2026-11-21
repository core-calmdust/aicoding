/* 所蔵品：木画紫檀棊局（正倉院 北倉36） — units: 1 = 1 cm; 49.0 × 48.8 cm, 12.7 cm high (the Shōsōin's record).
   Rebuilt after the Shōsōin's photographs (CO0000000418–436, 2026-11-21): a go board of shitan veneer, ruled 19 × 19 in ivory,
   with 17 flower points — every third line round a square on the 4th lines from the edge, and the centre — framed by a band of
   small ivory lozenges; a shallow body whose sides are divided into four panels by bands of lozenges, each panel with figures in
   dyed ivory (birds, deer, a lion, camels, horsemen, flowers); two drawers, at diagonally opposite ends of two opposite sides,
   with a beaded gilt ring pull, holding turtle-shaped trays; the body on a 床脚: on each side two openings with cusped tops,
   a post between them and the corner legs set with small birds and deer, all standing on a floor rail faced on top with 華角
   (horn over red, with dark flowers). Heights measured on the photographs: body 4.6, base 8.1 (rail included) — estimates;
   the figures are drawn after the photographs, not traced. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).shosoin = {
    build(TT, X, K) {
      const G = new TT.Group();
      const S = 48.9, H = 12.7, RAIL = .8, BASE = 8.1, BODY = H - BASE, TOP = .15;
      const shT = K.tex(1024, 1024, (g, w, h) => K.grain(g, w, h, { a: '#331b14', b: '#20100b', seed: 21, sx: .5, sy: 9, warp: .35, pores: .003 }));
      const shR = K.tex(256, 256, (g, w, h) => K.grain(g, w, h, { a: '#7a7a7a', b: '#4e4e4e', seed: 22, sy: 14 }), { data: true });
      const shitan = K.mat({ map: shT, roughnessMap: shR, color: '#ffffff', roughness: .5, clearcoat: .4, clearcoatRoughness: .35 });
      const ivory = K.mat({ color: '#e9dcbc', roughness: .4, clearcoat: .25, clearcoatRoughness: .4 });
      const C = { iv: '#e6d2a4', box: '#d9b46a', grn: '#6f9a62', red: '#c0664c', dk: '#3a1a10', tan: '#c49a5c', pink: '#d99a86' };
      const sil = (g, kind, x, y, k, col) => {   // a figure in silhouette with a few engraved lines (the 撥鏤-like detail)
        g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = col; g.strokeStyle = 'rgba(40,18,8,.55)'; g.lineWidth = .9; g.beginPath();
        if (kind === 'camel') { g.moveTo(-26, 4); g.quadraticCurveTo(-24, -14, -10, -16); g.quadraticCurveTo(-4, -26, 2, -16); g.quadraticCurveTo(8, -24, 14, -14); g.quadraticCurveTo(20, -12, 22, -22); g.lineTo(30, -26); g.lineTo(31, -21); g.lineTo(26, -18); g.quadraticCurveTo(24, -4, 18, 2);
          g.lineTo(18, 22); g.lineTo(14, 22); g.lineTo(13, 4); g.lineTo(-14, 4); g.lineTo(-15, 22); g.lineTo(-19, 22); g.lineTo(-20, 4); g.closePath(); }
        else if (kind === 'elephant') { g.moveTo(-28, -2); g.quadraticCurveTo(-26, -24, 0, -24); g.quadraticCurveTo(18, -24, 22, -10); g.quadraticCurveTo(30, -6, 30, 8); g.quadraticCurveTo(30, 20, 34, 22); g.lineTo(28, 22); g.quadraticCurveTo(24, 10, 22, 4);
          g.lineTo(18, 22); g.lineTo(12, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-14, 22); g.lineTo(-20, 22); g.lineTo(-20, 4); g.quadraticCurveTo(-28, 6, -28, -2); g.closePath(); }
        else if (kind === 'bird') { g.moveTo(-14, 2); g.quadraticCurveTo(-2, -10, 10, -6); g.lineTo(16, -10); g.lineTo(14, -4); g.quadraticCurveTo(10, 6, -4, 6); g.lineTo(-18, 12); g.lineTo(-12, 4); g.closePath(); g.moveTo(0, -2); g.quadraticCurveTo(-8, -18, -20, -16); g.quadraticCurveTo(-10, -8, 0, -2); }
        else if (kind === 'man') {   // a foreigner in a peaked cap and boots, leading with a rope
          g.arc(0, -19, 3.6, 0, 6.29); g.moveTo(-3.4, -21); g.lineTo(0, -29); g.lineTo(3.4, -21); g.closePath();
          g.moveTo(-4.5, -15); g.lineTo(4.5, -15); g.lineTo(6, 6); g.lineTo(3, 6); g.lineTo(2.6, 22); g.lineTo(-.4, 22); g.lineTo(0, 7); g.lineTo(-1.6, 22); g.lineTo(-4.6, 22); g.lineTo(-3.6, 6); g.lineTo(-6, 6); g.closePath();
          g.moveTo(4, -12); g.lineTo(13, -8); g.lineTo(12.4, -6.6); g.lineTo(3.6, -10); g.closePath(); }
        else if (kind === 'deer') { g.moveTo(-20, -2); g.quadraticCurveTo(-18, -12, -4, -12); g.lineTo(10, -12); g.quadraticCurveTo(14, -14, 15, -22); g.lineTo(21, -24); g.lineTo(22, -20); g.lineTo(18, -18); g.quadraticCurveTo(16, -6, 12, -2);
          g.lineTo(13, 22); g.lineTo(10, 22); g.lineTo(8, 0); g.lineTo(-12, 0); g.lineTo(-13, 22); g.lineTo(-16, 22); g.lineTo(-16, 0); g.closePath();
          g.moveTo(16, -22); g.lineTo(12, -32); g.lineTo(13, -32.5); g.lineTo(16.5, -25); g.lineTo(19, -34); g.lineTo(20, -33.5); g.lineTo(18, -23); g.closePath(); }
        else if (kind === 'rider') {   // a mounted archer turning in the saddle to shoot back (the "Parthian shot")
          g.moveTo(-24, 6); g.quadraticCurveTo(-22, -8, -6, -8); g.lineTo(12, -10); g.lineTo(20, -20); g.lineTo(24, -16); g.lineTo(18, -6); g.quadraticCurveTo(20, 4, 14, 6); g.lineTo(18, 22); g.lineTo(14, 22); g.lineTo(9, 7); g.lineTo(-14, 7); g.lineTo(-20, 22); g.lineTo(-24, 22); g.closePath();
          g.moveTo(-4, -8); g.lineTo(-2, -22); g.arc(-2, -25, 3.2, 0, 6.29); g.moveTo(-2, -18); g.lineTo(-14, -22); g.lineTo(-14, -20); g.lineTo(-2, -16); g.closePath();
          g.moveTo(-16, -30); g.quadraticCurveTo(-22, -21, -16, -12); g.lineTo(-15.4, -12.4); g.quadraticCurveTo(-20.6, -21, -15.4, -29.6); g.closePath(); }
        else if (kind === 'rider0') { g.moveTo(-24, 6); g.quadraticCurveTo(-22, -8, -6, -8); g.lineTo(12, -10); g.lineTo(20, -20); g.lineTo(24, -16); g.lineTo(18, -6); g.quadraticCurveTo(20, 4, 14, 6); g.lineTo(16, 22); g.lineTo(12, 22); g.lineTo(9, 7); g.lineTo(-14, 7); g.lineTo(-18, 22); g.lineTo(-22, 22); g.closePath();
          g.moveTo(-6, -8); g.lineTo(-4, -22); g.arc(-3, -25, 3.2, 0, 6.29); g.moveTo(-2, -18); g.lineTo(8, -26); }
        else if (kind === 'runner' || kind === 'hound' || kind === 'hunter') {   // the flying gallop of the hunting scenes on the sides
          const hd = kind === 'hound' ? [[18, -6], [24, -14], [30, -11], [33, -10], [27, -6], [20, 0]] : [[16, -7], [20, -18], [26, -17], [30, -14], [24, -12], [19, -1]];
          g.moveTo(-20, -4); g.quadraticCurveTo(-8, -12, 10, -10); g.lineTo(hd[0][0], hd[0][1]); hd.slice(1).forEach(([a, b]) => g.lineTo(a, b));
          g.lineTo(34, 3); g.lineTo(35, 5.5); g.lineTo(28, 4); g.lineTo(18, 3);              // forelegs stretched forward
          g.quadraticCurveTo(0, 6, -12, 3); g.lineTo(-32, 10); g.lineTo(-33, 7.5); g.lineTo(-27, 5); g.lineTo(-18, 1);   // hind legs stretched back
          g.quadraticCurveTo(-23, -1, -20, -4); g.closePath();
          if (kind === 'hound') { g.moveTo(-20, -3); g.quadraticCurveTo(-30, -6, -32, -16); g.quadraticCurveTo(-27, -8, -19, -5.5); g.closePath(); g.moveTo(24, -13); g.lineTo(21, -20); g.lineTo(26, -14); g.closePath(); }
          else { g.moveTo(-20, -4); g.lineTo(-25, -9); g.lineTo(-21, -6); g.closePath(); }
          if (kind === 'runner') { g.moveTo(22, -18); g.lineTo(18, -30); g.lineTo(13, -33); g.lineTo(18.6, -31); g.lineTo(20, -36); g.lineTo(20.4, -30); g.lineTo(23.6, -19); g.closePath();
            g.moveTo(24, -18); g.lineTo(27, -28); g.lineTo(32, -31); g.lineTo(28, -27); g.lineTo(25.4, -18); g.closePath(); }
          if (kind === 'hunter') {   // the rider turns in the saddle and draws the bow backwards
            g.moveTo(-4, -10); g.lineTo(-7, -24); g.lineTo(-1, -24); g.lineTo(2, -10); g.closePath(); g.moveTo(-1, -28); g.arc(-4, -28, 3.4, 0, 6.29);
            g.moveTo(-5, -21); g.lineTo(-17, -23); g.lineTo(-17, -21); g.lineTo(-5, -19); g.closePath();
            g.moveTo(-17, -33); g.quadraticCurveTo(-24, -22, -17, -11); g.lineTo(-16.2, -11.4); g.quadraticCurveTo(-22.4, -22, -16.2, -32.6); g.closePath(); }
          g.fill('evenodd'); g.stroke(); g.beginPath(); g.moveTo(-8, -6); g.quadraticCurveTo(2, -3, 12, -6); g.moveTo(14, -4); g.lineTo(17, -12); g.stroke();   // engraved lines
          g.fillStyle = 'rgba(40,14,6,.75)'; g.beginPath(); g.arc(kind === 'hound' ? 26 : 23.5, kind === 'hound' ? -11 : -15, 1, 0, 6.29); g.fill(); g.restore(); return; }
        else if (kind === 'tree') { g.moveTo(-1.6, 24); g.lineTo(-1.2, -2); g.lineTo(1.2, -2); g.lineTo(1.6, 24); g.closePath(); for (let i = 0; i < 5; i++) { const yy = -4 - i * 6, ww = 14 - i * 2.2; g.moveTo(0, yy - 6); g.quadraticCurveTo(ww, yy, 0, yy + 2); g.quadraticCurveTo(-ww, yy, 0, yy - 6); } }
        else if (kind === 'flower') { for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.moveTo(0, 0); g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 6, 3, a, 0, 6.29); } }
        else if (kind === 'lion') { g.moveTo(-24, 4); g.quadraticCurveTo(-22, -12, -4, -12); g.quadraticCurveTo(8, -24, 20, -14); g.quadraticCurveTo(26, -8, 22, 0); g.lineTo(18, 22); g.lineTo(13, 22); g.lineTo(12, 6); g.lineTo(-14, 6); g.lineTo(-17, 22); g.lineTo(-21, 22); g.lineTo(-22, 6);
          g.quadraticCurveTo(-34, 0, -30, -12); g.quadraticCurveTo(-28, -2, -24, 4); g.closePath(); }
        g.fill('evenodd'); g.stroke(); g.restore();
      };

      // a band of small ivory lozenges (the "diamond chain" round every edge in the photographs)
      const chain = (g, x0, y0, len, wd, vert) => { g.save(); g.translate(x0, y0); if (vert) g.rotate(Math.PI / 2);
        g.fillStyle = 'rgba(14,6,4,.35)'; g.fillRect(0, 0, len, wd); g.fillStyle = '#d8bb7c'; g.fillRect(0, 0, len, wd * .07); g.fillRect(0, wd * .93, len, wd * .07);
        // each motif is a lozenge of four small ivory squares (as on the photographed sides), a dark dot in the middle
        const n = Math.max(1, Math.round(len / (wd * .95))), q = wd * .13;
        for (let i = 0; i < n; i++) { const cx = (i + .5) * len / n, cy = wd / 2; g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = '#e4d2a2';
          [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => g.fillRect(u * q * 1.15 - q / 2, v * q * 1.15 - q / 2, q, q)); g.restore(); }
        g.restore(); };
      /* ---------- the playing face ---------- */
      const N = 19, BAND = .7, M = 1.15, P = (S - 2 * M) / (N - 1);
      const faceT = K.tex(2048, 2048, (g, w) => {
        g.drawImage(shT.image, 0, 0, w, w); const s = w / S;
        // the veneer is laid in strips running across the board, each a little different in tone (as in the top photograph)
        let sx0 = 0, sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        while (sx0 < w) { const sw = s * (1.6 + rnd() * 2.2), t = rnd(); g.fillStyle = t < .5 ? `rgba(10,3,2,${.1 + t * .35})` : `rgba(120,40,30,${(t - .5) * .22})`; g.fillRect(sx0, 0, sw, w); sx0 += sw; }
        chain(g, 0, 0, w, BAND * s, false); chain(g, 0, w - BAND * s, w, BAND * s, false); chain(g, BAND * s, 0, w, BAND * s, true); chain(g, w, 0, w, BAND * s, true);
        for (let i = 0; i < N; i++) { const p = (M + i * P) * s, lw = s * .055;
          g.fillStyle = 'rgba(20,8,4,.5)'; g.fillRect(M * s - lw, p - lw / 2 - s * .02, (S - 2 * M) * s + 2 * lw, lw + s * .04); g.fillRect(p - lw / 2 - s * .02, M * s - lw, lw + s * .04, (S - 2 * M) * s + 2 * lw);
          g.fillStyle = '#d6bd88'; g.fillRect(M * s - lw / 2, p - lw / 2, (S - 2 * M) * s + lw, lw); g.fillRect(p - lw / 2, M * s - lw / 2, lw, (S - 2 * M) * s + lw); }
        // 17 flower points (from the top photograph): lines 4, 7, 10, 13, 16 round a square on the 4th lines, and the centre
        const pts = [[9, 9]]; [3, 6, 9, 12, 15].forEach(k => { pts.push([3, k], [15, k]); if (k !== 3 && k !== 15) pts.push([k, 3], [k, 15]); });
        pts.forEach(([a, b]) => { const cx = (M + a * P) * s, cy = (M + b * P) * s, R = s * .42; g.save(); g.translate(cx, cy);
          g.beginPath(); g.arc(0, 0, R, 0, 6.29); g.fillStyle = '#2a140c'; g.fill();
          g.beginPath(); g.arc(0, 0, R * .82, 0, 6.29); g.strokeStyle = '#e2cf9e'; g.lineWidth = R * .22; g.stroke();   // an ivory ring (the flower's rim)
          for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(R * .4, 0, R * .26, R * .1, 0, 0, 6.29); g.fillStyle = '#c9a56c'; g.fill(); }
          g.beginPath(); g.arc(0, 0, R * .16, 0, 6.29); g.fillStyle = '#ecdcb4'; g.fill(); g.restore(); });
      });
      const faceMat = K.mat({ map: faceT, color: '#ffffff', roughness: .55, clearcoat: .12, clearcoatRoughness: .4 });
      /* ---------- the body's sides: lozenge bands, four panels of figures in dyed ivory ---------- */
      const VIGN = [   // after the photographs: running deer and hounds, mounted archers, birds; camels led by a foreigner on one side
        [['runner', 1], ['hound', 2]], [['runner', 0], ['hound', 3], ['hunter', 1]], [['bird', 0], ['hunter', 2], ['runner', 3]], [['hound', 1], ['runner', 0], ['bird', 2]],
        [['man', 1], ['camel', 0], ['camel', 3]], [['hunter', 0], ['runner', 2]], [['runner', 3], ['hound', 0], ['bird', 1]], [['flower', 2], ['hunter', 3], ['hound', 0]],
      ];
      const PAL = [C.iv, C.red, C.grn, '#d8b878'];
      const sideTex = (seed, drawerAt) => K.tex(2048, Math.round(2048 * (BODY - TOP) / S), (g, w, h) => {
        g.drawImage(shT.image, 0, 0, w, h); const s = w / S, cb = s * .85;
        chain(g, 0, 0, w, cb, false); chain(g, 0, h - cb, w, cb, false);
        const pw = w / 4;
        for (let i = 0; i < 4; i++) { const x0 = i * pw;
          chain(g, x0 + s * .75, cb, h - 2 * cb, s * .75, true);
          g.strokeStyle = C.iv; g.lineWidth = s * .05; g.strokeRect(x0 + s * .85, cb + s * .1, pw - s * .95, h - 2 * cb - s * .2);
          const v = VIGN[(seed * 4 + i) % VIGN.length], cy = h / 2;
          v.forEach(([kd, c], n) => { const x = x0 + s * .6 + (n + .5) * (pw - s * .7) / v.length; sil(g, kd, x, cy, s * (kd === 'flower' ? .05 : kd === 'camel' || kd === 'man' ? .05 : .052), kd === 'flower' ? C.grn : PAL[(c + seed) % 4]); });
        }
        chain(g, w, cb, h - 2 * cb, s * .75, true);
      });
      const sides = [0, 1, 2, 3].map(i => K.mat({ map: sideTex(i), color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .35 }));
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); G.add(o); return o; };
      add(new TT.BoxGeometry(S, BODY - TOP, S), [sides[0], sides[1], shitan, shitan, sides[2], sides[3]], 0, BASE + (BODY - TOP) / 2, 0);
      const edgeT = K.tex(1024, 64, (g, w, h) => { g.fillStyle = '#c9a564'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(50,24,8,.5)'; for (let x = 0; x < w; x += 8) g.fillRect(x, h * .35, 3, h * .3); });
      const edgeM = K.mat({ map: edgeT, color: '#ffffff', roughness: .45, clearcoat: .35 });
      add(new TT.BoxGeometry(S + .1, TOP, S + .1), [edgeM, edgeM, faceMat, shitan, edgeM, edgeM], 0, H - TOP / 2, 0);
      /* ---------- the 床脚: corner legs, a post in the middle of each side, openings with cusped tops, the floor rail ---------- */
      const LEG = 1.8, POST = 1.6, OH = BASE - RAIL - .05;   // leg / post width; the openings' height (the cusps hang right under the body)
      const skirt = new TT.Shape(); skirt.moveTo(-S / 2, 0); skirt.lineTo(S / 2, 0); skirt.lineTo(S / 2, BASE - RAIL); skirt.lineTo(-S / 2, BASE - RAIL); skirt.closePath();
      const open = (x0, x1) => { const p = new TT.Path(), R = OH * .43, top = OH, xa0 = x0 + R, xa1 = x1 - R, nC = 7, cw = (xa1 - xa0) / nC;
        // the opening's ends are almost half-round (photographs of each side), its top a row of hanging cusps
        p.moveTo(x0 + R, 0); p.lineTo(x1 - R, 0); p.quadraticCurveTo(x1, 0, x1, R); p.lineTo(x1, top - R); p.quadraticCurveTo(x1, top - .3, xa1, top - .45);
        for (let i = nC; i > 0; i--) { const xa = xa0 + i * cw, xb = xa - cw; p.quadraticCurveTo((xa + xb) / 2, top - 1.6, xb, top - .45); }
        p.quadraticCurveTo(x0, top - .3, x0, top - R); p.lineTo(x0, R); p.quadraticCurveTo(x0, 0, x0 + R, 0); return p; };
      const half = (S - 2 * LEG - POST) / 2;
      skirt.holes.push(open(-S / 2 + LEG, -S / 2 + LEG + half), open(S / 2 - LEG - half, S / 2 - LEG));
      const skG = new TT.ExtrudeGeometry(skirt, { depth: 1.2, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1, curveSegments: 10 });
      // the legs' faces: dark shitan edged in ivory, little birds and deer set into the legs and the post
      const legT = K.tex(2048, Math.round(2048 * (BASE - RAIL) / S), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); const s = w / S;
        g.strokeStyle = C.iv; g.lineWidth = s * .08; g.strokeRect(s * .15, s * .1, w - s * .3, h - s * .2);
        g.strokeStyle = '#d8bb7c'; g.lineWidth = s * .09; skirt.holes.forEach(hp => { g.beginPath(); hp.getPoints(24).forEach((p, i) => { const X = (p.x + S / 2) * s, Y = h - p.y * s; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.closePath(); g.stroke(); });
        [[LEG / 2, 'bird', .8], [LEG / 2, 'deer', .3], [S / 2, 'bird', .75], [S / 2, 'flower', .35], [S - LEG / 2, 'bird', .8], [S - LEG / 2, 'deer', .3]].forEach(([x, kd, fy], i) => sil(g, kd, x * s, h * (1 - fy), s * .035, [C.box, C.grn, C.pink][i % 3])); });
      legT.repeat.set(1 / S, 1 / (BASE - RAIL)); legT.offset.set(.5, 0);
      const legM = K.mat({ map: legT, color: '#ffffff', roughness: .5, clearcoat: .35, clearcoatRoughness: .35 });
      for (let i = 0; i < 4; i++) { const m = new TT.Mesh(skG, [legM, shitan]), a = i * Math.PI / 2; m.position.set(Math.sin(a) * (S / 2 - 1.2), RAIL, Math.cos(a) * (S / 2 - 1.2)); m.rotation.y = a; G.add(m); }
      add(new TT.BoxGeometry(S - 2.4, .5, S - 2.4), shitan, 0, BASE - .25, 0);   // the floor of the body
      // the floor rail: horn over red (華角), dark flowers; its outer faces with the lozenge band
      const kakT = K.tex(1024, 128, (g, w, h) => { g.fillStyle = '#9c3a24'; g.fillRect(0, 0, w, h); const n = K.noise(5);
        for (let x = 0; x < w; x += 4) for (let y = 0; y < h; y += 4) { const v = n(x / 40, y / 40, 3); g.fillStyle = `rgba(230,110,50,${(v - .5) * .4 + .08})`; g.fillRect(x, y, 4, 4); }
        for (let i = 0; i < 10; i++) { const cx = (i + .5) * w / 10, cy = h / 2; g.fillStyle = 'rgba(40,14,8,.85)'; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.beginPath(); g.ellipse(cx + Math.cos(a) * h * .18, cy + Math.sin(a) * h * .18, h * .14, h * .07, a, 0, 6.29); g.fill(); }
          g.beginPath(); g.arc(cx, cy, h * .08, 0, 6.29); g.fill(); g.strokeStyle = 'rgba(40,14,8,.7)'; g.lineWidth = 3; g.beginPath(); g.moveTo(cx + h * .35, cy); g.quadraticCurveTo(cx + w / 20, cy - h * .35, cx + w / 10 - h * .35, cy); g.stroke(); } });
      const kak = K.mat({ map: kakT, color: '#ffffff', roughness: .28, clearcoat: .85, clearcoatRoughness: .18 });
      const railSide = K.tex(2048, Math.round(2048 * RAIL / S), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); chain(g, 0, 0, w, h, false); });
      const rsM = K.mat({ map: railSide, color: '#ffffff', roughness: .45, clearcoat: .35 });
      const RW = 3.0;
      [[S + .3, RW, 0, S / 2 - RW / 2 + .15], [S + .3, RW, 0, -S / 2 + RW / 2 - .15]].forEach(([w, d, x, z]) => add(new TT.BoxGeometry(w, RAIL, d), [rsM, rsM, kak, shitan, z > 0 ? rsM : shitan, z > 0 ? shitan : rsM], x, RAIL / 2, z));
      [[RW, S - 2 * RW + .3, S / 2 - RW / 2 + .15, 0], [RW, S - 2 * RW + .3, -S / 2 + RW / 2 - .15, 0]].forEach(([w, d, x, z]) => { const k2 = kak.clone(); k2.map = kakT.clone(); k2.map.center.set(.5, .5); k2.map.rotation = Math.PI / 2; k2.map.needsUpdate = true; add(new TT.BoxGeometry(w, RAIL, d), [x > 0 ? rsM : shitan, x > 0 ? shitan : rsM, k2, shitan, shitan, shitan], x, RAIL / 2, z); });
      /* ---------- the drawers: at diagonally opposite ends of the two side faces (±x); the near one pulled out ---------- */
      const DW = S / 4 - .95, DH = BODY - TOP - 1.75, OUT = 7.2, gilt = K.mat({ color: '#d6a84c', roughness: .3, metalness: 1 });
      const dark = K.mat({ color: '#2a1810', roughness: .6 });
      const DG = new TT.Group(); DG.rotation.y = 0; G.add(DG);
      const drawer = (sx, z, out) => { const g2 = new TT.Group(); g2.position.set(sx * (S / 2 + out), BASE + (BODY - TOP) / 2, z); g2.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; DG.add(g2);
        // the drawer front is one of the side's panels: birds and flowers in dyed ivory, a large beaded gilt ring in the middle (side A)
        const dfT = K.tex(1024, Math.round(1024 * DH / DW), (g, w, h) => { g.drawImage(shT.image, 0, 0, w, h); const s2 = w / DW;
          g.strokeStyle = C.iv; g.lineWidth = s2 * .05; g.strokeRect(s2 * .1, s2 * .1, w - s2 * .2, h - s2 * .2);
          sil(g, 'bird', w * .22, h * .45, s2 * .06, C.grn); sil(g, 'flower', w * .22, h * .78, s2 * .035, C.red); sil(g, 'bird', w * .78, h * .45, s2 * .06, C.grn); g.save(); g.translate(w * .78, 0); g.scale(-1, 1); g.restore(); sil(g, 'flower', w * .78, h * .78, s2 * .035, C.red); });
        const f = new TT.Mesh(new TT.BoxGeometry(DW, DH, .45), [dark, dark, dark, dark, K.mat({ map: dfT, color: '#ffffff', roughness: .5, clearcoat: .35 }), dark]); g2.add(f);
        const RR = .78, ring = new TT.Mesh(new TT.TorusGeometry(RR, .16, 10, 32), gilt); ring.position.set(0, -.15, .55); g2.add(ring);
        for (let k = 0; k < 16; k++) { const a = k / 16 * 6.283, b = new TT.Mesh(new TT.SphereGeometry(.17, 10, 8), gilt); b.position.set(Math.cos(a) * RR, -.15 + Math.sin(a) * RR, .62); g2.add(b); }   // the beaded ring
        const knob = new TT.Mesh(new TT.CylinderGeometry(.2, .2, .4, 12), gilt); knob.rotation.x = Math.PI / 2; knob.position.set(0, -.15 + RR + .1, .45); g2.add(knob);
        if (out > .1) { const sd = new TT.BoxGeometry(.35, DH - .3, out + 1); [-DW / 2 + .2, DW / 2 - .2].forEach(x => { const m = new TT.Mesh(sd, dark); m.position.set(x, -.15, -(out + 1) / 2); g2.add(m); });
          const bt = new TT.Mesh(new TT.BoxGeometry(DW, .3, out + 1), dark); bt.position.set(0, -DH / 2 + .15, -(out + 1) / 2); g2.add(bt);
          // the turtle tray: a round open bowl with a shell-segmented rim, head and feet
          const tr = new TT.Group(); tr.position.set(0, -DH / 2 + .3, -out / 2 - .6); g2.add(tr);
          const rimT = K.tex(512, 64, (g, w, h) => { g.fillStyle = '#3a2418'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1a0c06'; g.lineWidth = 3; for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, h / 2); g.lineTo(x, h); g.stroke(); } });
          const bowl = new TT.Mesh(new TT.CylinderGeometry(3.4, 3.1, 1.8, 40, 1, true), K.mat({ map: rimT, color: '#ffffff', roughness: .55, side: TT.DoubleSide })); bowl.position.y = .9; tr.add(bowl);
          const inner = new TT.Mesh(new TT.CircleGeometry(3.1, 40), dark); inner.rotation.x = -Math.PI / 2; inner.position.y = .2; tr.add(inner);
          const hd = new TT.Mesh(new TT.SphereGeometry(.75, 14, 10), K.mat({ color: '#4a2a18', roughness: .5 })); hd.scale.set(1, .8, 1.3); hd.position.set(0, .9, 3.8); tr.add(hd);
          [[2.4, 2.4], [-2.4, 2.4], [2.4, -2.4], [-2.4, -2.4]].forEach(([x, z]) => { const ft = new TT.Mesh(new TT.SphereGeometry(.6, 10, 8), K.mat({ color: '#4a2a18', roughness: .5 })); ft.scale.set(1.2, .5, .9); ft.position.set(x, .3, z); tr.add(ft); }); }
      };
      drawer(1, S / 2 - (.75 + S / 4) / 2, OUT); drawer(-1, -S / 2 + (.75 + S / 4) / 2, .3);
      return G;
    },
  };
})();
