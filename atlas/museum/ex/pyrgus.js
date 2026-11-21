/* 所蔵品：ヴェットヴァイス＝フロイツハイムのダイスタワー（ボン・ライン州立博物館 Inv. 85.0269.00） — units: 1 = 1 cm.
   A hollow square tower of copper-alloy plate, 22 cm high and 9 × 9 cm (EDH record): every face pierced with openwork, the front
   with the three lines PICTOS VICTOS / HOSTIS DELETA / LVDITE SECVRI, the other faces with VTERE · FELIX · VIVAS round the top;
   inside, three levels of sloping baffles; the dice run out at the foot of the front down a little flight of steps (three bells
   hung above it, one survives). Pine cones stand on three corners of the top.
   2026-11-22: redrawn after the museum's photograph: blue-grey tinned metal; the front plate ends above the steps; plain heavy
   capitals; each side two square panels of four-lobed holes round a rosette; a beaded moulding on the front's right corner.
   2026-11-21: redrawn after the photograph in the DAI's Arachne (1938922): blackened metal; the front's six words PICTOS · VICTOS ·
   HOSTIS · DELETA · LVDITE · SECVRI in large openwork capitals filling the face, one word to a band; the sides a lattice of
   overlapping rings under the word at the top; the steps between scrolled cheeks. The lattice's exact drawing is an estimate. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).pyrgus = {
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 9, H = 22, T = .12;
      // the metal: tinned copper alloy, now a blue-grey with darker, browner patches (the museum's photograph)
      const patT = K.tex(512, 512, (g, w, h) => { const n = K.noise(11), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 110, y / 110, 5), b = n(x / 16 + 9, y / 16, 3), c = Math.max(0, n(x / 60 + 40, y / 60, 4) - .56) * 2.2, i = (y * w + x) * 4;
          d[i] = (96 + b * 34 + a * 26) * (1 - c * .35) + c * 26; d[i + 1] = (106 + b * 34 + a * 26) * (1 - c * .45) + c * 12; d[i + 2] = (114 + b * 34 + a * 24) * (1 - c * .6); d[i + 3] = 255; } g.putImageData(img, 0, 0); });
      // a face as an alpha map: white = metal, black = cut away
      const face = (fn) => K.tex(768, Math.round(768 * H / W), (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); fn(g, w, h, w / W); }, { data: true });
      // the openwork capitals: plain, heavy strokes of even width (drawn here stroke by stroke — the same on every device); each
      // letter [width, strokes] in a box 1 high, y downward
      const GL = {
        P: [.56, g => { g.moveTo(0, 1); g.lineTo(0, 0); g.lineTo(.3, 0); g.bezierCurveTo(.66, 0, .66, .5, .3, .5); g.lineTo(0, .5); }],
        R: [.6, g => { g.moveTo(0, 1); g.lineTo(0, 0); g.lineTo(.3, 0); g.bezierCurveTo(.66, 0, .66, .5, .3, .5); g.lineTo(0, .5); g.moveTo(.26, .5); g.lineTo(.6, 1); }],
        I: [0, g => { g.moveTo(0, 0); g.lineTo(0, 1); }],
        C: [.62, g => { g.moveTo(.62, .2); g.bezierCurveTo(.4, -.08, 0, .05, 0, .5); g.bezierCurveTo(0, .95, .4, 1.08, .62, .8); }],
        T: [.66, g => { g.moveTo(0, 0); g.lineTo(.66, 0); g.moveTo(.33, 0); g.lineTo(.33, 1); }],
        O: [.72, g => { g.ellipse(.36, .5, .36, .5, 0, 0, 6.2832); }],
        S: [.54, g => { g.moveTo(.52, .16); g.bezierCurveTo(.4, -.06, 0, -.04, 0, .26); g.bezierCurveTo(0, .52, .54, .46, .54, .76); g.bezierCurveTo(.54, 1.05, .1, 1.05, 0, .84); }],
        V: [.7, g => { g.moveTo(0, 0); g.lineTo(.35, 1); g.lineTo(.7, 0); }],
        H: [.62, g => { g.moveTo(0, 0); g.lineTo(0, 1); g.moveTo(.62, 0); g.lineTo(.62, 1); g.moveTo(0, .5); g.lineTo(.62, .5); }],
        D: [.64, g => { g.moveTo(0, 1); g.lineTo(0, 0); g.lineTo(.22, 0); g.bezierCurveTo(.78, 0, .78, 1, .22, 1); g.lineTo(0, 1); }],
        E: [.5, g => { g.moveTo(.5, 0); g.lineTo(0, 0); g.lineTo(0, 1); g.lineTo(.5, 1); g.moveTo(0, .5); g.lineTo(.42, .5); }],
        F: [.5, g => { g.moveTo(.5, 0); g.lineTo(0, 0); g.lineTo(0, 1); g.moveTo(0, .5); g.lineTo(.42, .5); }],
        L: [.48, g => { g.moveTo(0, 0); g.lineTo(0, 1); g.lineTo(.48, 1); }],
        A: [.72, g => { g.moveTo(0, 1); g.lineTo(.36, 0); g.lineTo(.72, 1); g.moveTo(.14, .64); g.lineTo(.58, .64); }],
        X: [.66, g => { g.moveTo(0, 0); g.lineTo(.66, 1); g.moveTo(.66, 0); g.lineTo(0, 1); }],
      };
      // a window with a word standing in it: the ground cut away, the letters left, tied to the bars above and below
      const word = (g, s, x0, y0, ww, hh, txt) => { g.fillStyle = '#000'; g.fillRect(x0, y0, ww, hh);
        const lw = s * .4, gap = .3, nat = [...txt].reduce((a, c) => a + GL[c][0], 0) + gap * (txt.length - 1), k = (ww - lw * 1.5) / (nat * hh);   // letters squeezed or spread to fill the window
        let x = x0 + lw * .75; g.strokeStyle = '#fff'; g.lineWidth = lw; g.lineCap = 'butt'; g.lineJoin = 'round';
        for (const c of txt) { g.save(); g.translate(x, y0 - lw * .2); g.scale(hh * k, hh + lw * .4); g.beginPath(); GL[c][1](g); g.restore(); g.stroke(); x += (GL[c][0] + gap) * hh * k; } };
      // a square panel of the sides: rows of small four-lobed holes, and in the middle a rosette of eight pointed petals in a ring of round holes
      const panel = (g, s, cx, cy, n, nr = n) => { g.fillStyle = '#000'; const pitch = s * .98, q = s * .235;
        for (let j = 0; j < nr; j++) for (let i = 0; i < n; i++) { const x = cx + (i - (n - 1) / 2) * pitch, y = cy + (j - (nr - 1) / 2) * pitch; if (Math.hypot(x - cx, y - cy) < s * 2.6) continue;
          g.beginPath(); [[q, 0], [-q, 0], [0, q], [0, -q]].forEach(([a, b]) => { g.moveTo(x + a + q, y + b); g.arc(x + a, y + b, q, 0, 6.2832); }); g.fill(); g.fillRect(x - q, y - q, q * 2, q * 2); }
        for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; g.save(); g.translate(cx, cy); g.rotate(a); g.beginPath(); g.moveTo(s * .55, 0); g.quadraticCurveTo(s * 1.3, s * .42, s * 2.1, 0); g.quadraticCurveTo(s * 1.3, -s * .42, s * .55, 0); g.fill();
          g.rotate(Math.PI / 8); g.beginPath(); g.arc(s * 2.2, 0, s * .2, 0, 6.2832); g.fill(); g.beginPath(); g.arc(s * 1.25, 0, s * .12, 0, 6.2832); g.fill(); g.restore(); }
        g.beginPath(); g.arc(cx, cy, s * .2, 0, 6.2832); g.fill(); };
      const LINES = ['PICTOS', 'VICTOS', 'HOSTIS', 'DELETA', 'LVDITE', 'SECVRI'], FOOT = 4.8;   // FOOT: the front plate stops this far above the ground (the dice run out below it)
      const front = face((g, w, h, s) => { LINES.forEach((t, i) => word(g, s, s * .75, s * (1.0 + i * 2.65), w - s * 1.5, s * 1.8, t)); g.fillStyle = '#000'; g.fillRect(0, h - s * FOOT, w, s * FOOT); });
      const side = txt => face((g, w, h, s) => { word(g, s, s * .7, s * .9, w - s * 1.4, s * 1.9, txt); panel(g, s, w / 2, s * 7.5, 7, 8); panel(g, s, w / 2, s * 16.5, 7, 8); });
      const mk = (am, dark) => K.mat({ map: patT, alphaMap: am, alphaTest: .35, alphaToCoverage: true, transparent: false, side: TT.DoubleSide, color: dark ? '#4a4c4e' : '#ffffff', roughness: .46, metalness: .65 });   // (alpha-to-coverage: the openwork's edges anti-aliased, no sparkle at a distance)
      const faces = [[front, 0], [side('VTERE'), Math.PI / 2], [side('FELIX'), Math.PI], [side('VIVAS'), -Math.PI / 2]];
      const planeG = new TT.PlaneGeometry(W, H);
      faces.forEach(([am, ry]) => { const m = new TT.Mesh(planeG, mk(am, false)); m.rotation.y = ry; m.position.set(Math.sin(ry) * W / 2, H / 2, Math.cos(ry) * W / 2); G.add(m);
        const m2 = new TT.Mesh(planeG, mk(am, true)); m2.rotation.y = ry; m2.position.set(Math.sin(ry) * (W / 2 - T), H / 2, Math.cos(ry) * (W / 2 - T)); G.add(m2); });   // the inner skin: the same plate seen from inside, in shadow
      const solid = K.mat({ map: patT, color: '#ffffff', roughness: .46, metalness: .65 }), shade = K.mat({ map: patT, color: '#3c3e40', roughness: .6, metalness: .5 });
      const add = (geo, m, x, y, z) => { const o = new TT.Mesh(geo, m); o.position.set(x, y, z); G.add(o); return o; };
      // the plates' folded edges at the corners, the rim round the open top and the foot
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => add(new TT.BoxGeometry(.16, H, .16), solid, a * (W / 2 - .04), H / 2, b * (W / 2 - .04)));
      [[W + .12, .1, 0, W / 2], [W + .12, .1, 0, -W / 2], [.1, W + .12, W / 2, 0], [.1, W + .12, -W / 2, 0]].forEach(([a, c, x, z]) => { add(new TT.BoxGeometry(a, .22, c), solid, x, H - .11, z); if (z <= 0 || x) add(new TT.BoxGeometry(a + .5 * (a > 1), .1, c + .5 * (c > 1)), solid, x * 1.03, .05, z * 1.03); });
      add(new TT.BoxGeometry(W + .1, .3, .14), solid, 0, FOOT + .15, W / 2);   // the bar at the foot of the front plate
      // pine cones on the corners of the top (three remain), a beaded moulding down the front's right corner
      const coneT = K.tex(128, 128, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); g.strokeStyle = '#202020'; g.lineWidth = 3; for (let k = -8; k < 16; k++) { g.beginPath(); g.moveTo(k * 16, 0); g.lineTo(k * 16 + 128, 128); g.moveTo(k * 16, 0); g.lineTo(k * 16 - 128, 128); g.stroke(); } }, { data: true });
      const coneM = K.mat({ map: patT, bumpMap: coneT, bumpScale: 2.5, color: '#b0b0b0', roughness: .5, metalness: .65 });
      const coneG = new TT.LatheGeometry([[0, 2.0], [.14, 1.9], [.36, 1.5], [.46, 1.05], [.42, .6], [.24, .3], [.14, .24], [.14, 0], [0, 0]].map(([r, y]) => new TT.Vector2(r, y)), 14);
      [[-1, 1], [1, 1], [-1, -1]].forEach(([a, b]) => add(coneG, coneM, a * (W / 2 - .12), H, b * (W / 2 - .12)));
      const bead = []; for (let k = 0; k <= 12; k++) { const y = k * .3; bead.push(new TT.Vector2(.14, y), new TT.Vector2(.24, y + .1), new TT.Vector2(.24, y + .2)); } bead.push(new TT.Vector2(.14, 3.9), new TT.Vector2(0, 3.9)); bead.unshift(new TT.Vector2(0, 0));
      add(new TT.LatheGeometry(bead, 12), solid, W / 2 + .05, 16.4, W / 2 + .05);
      // inside: three sloping baffles, alternate sides (in shadow)
      [16.5, 11.5, 6.5].forEach((y, i) => { const b = add(new TT.BoxGeometry(W - .3, .1, W * .62), shade, 0, y, (i % 2 ? 1 : -1) * W * .17); b.rotation.x = (i % 2 ? -1 : 1) * .5; });
      // the flight of steps out of the front: four rounded treads on a slope, between two cheeks; a little bell hangs over them
      const SW = 6.2, treadG = new TT.CylinderGeometry(.66, .66, SW, 16); treadG.rotateZ(Math.PI / 2);
      for (let k = 0; k < 4; k++) add(treadG, solid, 0, 3.05 - k * .8, W / 2 + .5 + k * 1.25);
      const ramp = add(new TT.BoxGeometry(SW, .08, 5.6), shade, 0, 1.55, W / 2 + 2.3); ramp.rotation.x = .57;
      add(new TT.BoxGeometry(SW + 1.2, .1, 5.4), solid, 0, .05, W / 2 + 2.6);
      const ch = new TT.Shape(); ch.moveTo(0, 0); ch.lineTo(5.2, 0); ch.quadraticCurveTo(5.5, .5, 4.9, .75); ch.quadraticCurveTo(4.3, .7, 4.0, 1.25); ch.quadraticCurveTo(4.3, 1.9, 3.5, 1.9); ch.quadraticCurveTo(2.9, 1.8, 2.6, 2.5);
      ch.quadraticCurveTo(2.7, 3.2, 1.9, 3.3); ch.quadraticCurveTo(1.3, 3.3, 1.1, 4.0); ch.quadraticCurveTo(.9, 4.9, .3, 4.6); ch.quadraticCurveTo(0, 4.4, 0, 3.8); ch.closePath();
      const chG = new TT.ExtrudeGeometry(ch, { depth: .16, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 1, curveSegments: 8 }); chG.rotateY(-Math.PI / 2);
      [-1, 1].forEach(k => add(chG, solid, k * (SW / 2 + .1) + .08, 0, W / 2));
      const bell = add(new TT.LatheGeometry([[0, 0], [.1, 0], [.14, -.2], [.3, -.6], [.34, -.7], [.3, -.7], [0, -.62]].map(([r, y]) => new TT.Vector2(r, y)), 12), solid, 0, FOOT - .25, W / 2 + .12);
      add(new TT.TorusGeometry(.12, .03, 6, 12), solid, 0, FOOT - .12, W / 2 + .12);
      // a few dice just thrown, bone, with drilled pips
      const boneT = K.tex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,40,20,.85)'; [[.3, .3], [.7, .7], [.5, .5]].forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * h, w * .07, 0, 6.29); g.fill(); }); });
      const bone = K.mat({ map: boneT, color: '#ffffff', roughness: .6 });
      [[-7.2, 8.6, .5], [-6.0, 10.4, 1.2]].forEach(([x, z, r]) => { const d = new TT.Mesh(new TT.BoxGeometry(1.1, 1.1, 1.1), bone); d.position.set(x, .55, z); d.rotation.y = r; G.add(d); });
      return G;
    },
  };
})();
