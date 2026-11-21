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
      // The letters were cut out of the plate by hand: the ground between them is pierced hole by hole, no two letters alike — heavy
      // strokes of uneven width, leaning a little, O a small ring tied to the bars above and below, T a cross whose stem runs on up to
      // the bar (the museum's photograph). Each letter [width, strokes] in a box 1 high, y downward; drawn with a seeded hand-wobble.
      const GL = {
        P: [.5, [[[0, 1], [0, 0], [.34, 0], [.52, .14], [.52, .34], [.34, .48], [0, .48]]]],
        R: [.56, [[[0, 1], [0, 0], [.34, 0], [.52, .14], [.52, .34], [.34, .48], [0, .48]], [[.22, .48], [.56, 1]]]],
        I: [0, [[[0, 0], [0, 1]]]],
        C: [.56, [[[.56, .26], [.42, .1], [.2, .1], [.03, .3], [0, .5], [.03, .7], [.2, .9], [.42, .9], [.56, .74]]]],
        T: [.6, [[[.3, 0], [.3, 1]], [[0, .24], [.6, .24]]]],
        O: [.6, [[[.3, 0], [.3, .2]], [[.3, .2], [.52, .29], [.6, .5], [.52, .71], [.3, .8], [.08, .71], [0, .5], [.08, .29], [.3, .2]], [[.3, .8], [.3, 1]]]],
        S: [.5, [[[.48, .2], [.36, .06], [.14, .06], [.02, .2], [.04, .38], [.25, .5], [.46, .62], [.5, .8], [.36, .94], [.14, .94], [0, .8]]]],
        V: [.62, [[[0, 0], [.31, 1], [.62, 0]]]],
        H: [.56, [[[0, 0], [0, 1]], [[.56, 0], [.56, 1]], [[0, .5], [.56, .5]]]],
        D: [.56, [[[0, 1], [0, 0], [.28, 0], [.5, .16], [.56, .5], [.5, .84], [.28, 1], [0, 1]]]],
        E: [.46, [[[.46, 0], [0, 0], [0, 1], [.46, 1]], [[0, .5], [.4, .5]]]],
        F: [.46, [[[.46, 0], [0, 0], [0, 1]], [[0, .5], [.4, .5]]]],
        L: [.44, [[[0, 0], [0, 1], [.44, 1]]]],
        A: [.64, [[[0, 1], [.32, 0], [.64, 1]], [[.12, .68], [.52, .68]]]],
        X: [.6, [[[0, 0], [.6, 1]], [[.6, 0], [0, 1]]]],
      };
      let sd = 41; const rr = () => ((sd = (sd * 16807) % 2147483647) / 2147483647), jit = a => (rr() - .5) * 2 * a;
      // a row with a word in it: the ground cut away (its edges uneven), the letters left standing and tied to the bars above and below
      const word = (g, s, x0, y0, ww, hh, txt) => { g.fillStyle = '#000'; g.beginPath(); const n = 14;
        for (let k = 0; k <= n; k++) { const x = x0 + ww * k / n, y = y0 + jit(s * .05); k ? g.lineTo(x, y) : g.moveTo(x, y); } for (let k = n; k >= 0; k--) g.lineTo(x0 + ww * k / n + jit(s * .03), y0 + hh + jit(s * .05)); g.closePath(); g.fill();
        const gap = .26, nat = [...txt].reduce((a, c) => a + GL[c][0], 0) + gap * (txt.length - 1), lw0 = s * .54, k = (ww - lw0 * 2.3) / (nat * hh);
        let x = x0 + lw0 * 1.15; g.strokeStyle = '#fff'; g.lineCap = 'butt'; g.lineJoin = 'round';
        for (const c of txt) { const [wd, strokes] = GL[c], sx = hh * k * (1 + jit(.08)), lean = jit(.07), lw = lw0 * (1 + jit(.16)), dy = jit(s * .03);
          strokes.forEach(st => { g.beginPath(); st.forEach(([u, v], i) => { const end = v <= 0 || v >= 1, X = x + (u + (end ? 0 : jit(.035)) + (v - .5) * lean) * sx, Y = y0 + dy + (v <= 0 ? -.12 : v >= 1 ? 1.12 : v + jit(.025)) * hh; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.lineWidth = lw * (1 + jit(.1)); g.stroke(); });
          x += (wd + gap) * hh * k; } };
      // a square panel of the sides (the museum's photograph and the DAI's, enlarged): a border of stepped-cross holes, five to a side; inside it
      // pointed-oval holes set on the diagonals — four meeting in an X in each of 2 × 2 cells — so that four-petalled flowers form round the
      // points between them; every hole cut by hand, none quite in line
      const panel = (g, s, cx, cy) => { g.fillStyle = '#000'; const pitch = s * 1.6, c = s * 2.15;
        const cross = (x, y) => { const a = s * .2 * (1 + jit(.12)), b = s * .3 * (1 + jit(.12)); g.beginPath(); g.ellipse(x, y, a * .95, b * 1.45, jit(.12), 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(x, y, a * 1.7, b * .62, jit(.12), 0, 6.2832); g.fill(); };
        for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { if (i > 0 && i < 4 && j > 0 && j < 4) continue; cross(cx + (i - 2) * pitch + jit(s * .05), cy + (j - 2) * pitch * 1.05 + jit(s * .05)); }
        const lens = (x, y, a) => { const len = c * .27 * (1 + jit(.08)), wd = c * .11 * (1 + jit(.15)); g.save(); g.translate(x + jit(s * .04), y + jit(s * .04)); g.rotate(a + jit(.07)); g.beginPath(); g.moveTo(-len, 0); g.quadraticCurveTo(0, wd * 1.9, len, 0); g.quadraticCurveTo(0, -wd * 1.9, -len, 0); g.fill(); g.restore(); };
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) { const x = cx + (i - .5) * c, y = cy + (j - .5) * c * 1.05; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([u, v]) => lens(x + u * c * .26, y + v * c * .27, Math.atan2(v, u))); }
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx + (i - 1) * c + jit(s * .03), cy + (j - 1) * c * 1.05 + jit(s * .03), s * .07, 0, 6.2832); g.fill(); } };
      const LINES = ['PICTOS', 'VICTOS', 'HOSTIS', 'DELETA', 'LVDITE', 'SECVRI'], FOOT = 4.8;   // FOOT: the front plate stops this far above the ground (the dice run out below it)
      const round = (g, w, h) => { g.filter = 'blur(2.2px)'; g.drawImage(g.canvas, 0, 0); g.filter = 'none'; };   // the corners of every cut eased, as a file leaves them
      const front = face((g, w, h, s) => { LINES.forEach((t, i) => word(g, s, s * .7, s * (.85 + i * 2.65), w - s * 1.4, s * 1.8, t)); g.fillStyle = '#000'; g.fillRect(s * 1.5, h - s * (FOOT + .75), s * 1.1, s * .22); round(g, w, h); g.fillStyle = '#000'; g.fillRect(0, h - s * FOOT, w, s * FOOT); });
      const side = txt => face((g, w, h, s) => { word(g, s, s * .85, s * .85, w - s * 1.7, s * 1.8, txt); panel(g, s, w / 2, s * 7.6); panel(g, s, w / 2, s * 16.6); round(g, w, h); });
      const dentT = K.tex(256, 256, (g, w, h) => { const n = K.noise(29), img = g.createImageData(w, h), d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 128 + (n(x / 50, y / 50, 3) - .5) * 150 + (n(x / 9, y / 9, 2) - .5) * 40, i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, { data: true });
      const mk = (am, dark) => K.mat({ map: patT, bumpMap: dentT, bumpScale: 1.6, alphaMap: am, alphaTest: .35, alphaToCoverage: true, transparent: false, side: TT.DoubleSide, color: dark ? '#4a4c4e' : '#ffffff', roughness: .46, metalness: .65 });   // (alpha-to-coverage: the openwork's edges anti-aliased, no sparkle at a distance)
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
