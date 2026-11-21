/* 所蔵品：ヴェットヴァイス＝フロイツハイムのダイスタワー（ボン・ライン州立博物館 Inv. 85.0269.00） — units: 1 = 1 cm.
   A hollow square tower of copper-alloy plate, 22 cm high and 9 × 9 cm (EDH record): every face pierced with openwork, the front
   with the three lines PICTOS VICTOS / HOSTIS DELETA / LVDITE SECVRI, the other faces with VTERE · FELIX · VIVAS round the top;
   inside, three levels of sloping baffles; the dice run out at the foot of the front down a little flight of steps (three bells
   hung above it, one survives — not shown). The lost top (perhaps battlements and pine cones) is not restored, as in the museum.
   2026-11-21: redrawn after the photograph in the DAI's Arachne (1938922): blackened metal; the front's six words PICTOS · VICTOS ·
   HOSTIS · DELETA · LVDITE · SECVRI in large openwork capitals filling the face, one word to a band; the sides a lattice of
   overlapping rings under the word at the top; the steps between scrolled cheeks. The lattice's exact drawing is an estimate. */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).pyrgus = {
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 9, H = 22, T = .12;
      // the metal: blackened copper alloy, a faint brown sheen on the worn edges (the photograph in the DAI's Arachne, 1938922)
      const patT = K.tex(512, 512, (g, w, h) => { const n = K.noise(11), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 90, y / 90, 5), b = n(x / 14 + 9, y / 14, 3), i = (y * w + x) * 4;
          d[i] = 74 + b * 40 + a * 20; d[i + 1] = 72 + b * 34 + a * 12; d[i + 2] = 70 + b * 28; d[i + 3] = 255; } g.putImageData(img, 0, 0); });
      // a face as an alpha map: white = metal, black = cut away
      const face = (fn) => K.tex(512, Math.round(512 * H / W), (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); fn(g, w, h, w / W); }, { data: true });
      const ROM = (g, s, txt, x, y, size, wide) => { g.font = `700 ${size * s}px "Times New Roman",Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        const m = g.measureText(txt).width, k = Math.min(1.6, wide / m); g.save(); g.translate(x, y); g.scale(k, 1); g.fillText(txt, 0, 0); g.strokeStyle = g.fillStyle; g.lineWidth = s * .22; g.lineJoin = 'round'; g.strokeText(txt, 0, 0); g.restore(); };
      // a band of openwork letters: the ground cut away, the letters left standing, tied to the bars above and below
      const letters = (g, w, s, y0, bh, txt) => { g.fillStyle = '#000'; g.fillRect(s * .45, y0, w - s * .9, bh); g.fillStyle = '#fff'; ROM(g, s, txt, w / 2, y0 + bh * .53, bh / s * 1.05, w - s * 1.1); };
      // the lattice of the sides: overlapping rings leaving quatrefoils and lozenges between them
      const lattice = (g, w, s, y0, y1) => { g.fillStyle = '#000'; g.fillRect(s * .45, y0, w - s * .9, y1 - y0); g.save(); g.beginPath(); g.rect(s * .45, y0, w - s * .9, y1 - y0); g.clip();
        const r = s * 1.25, st = r * 1.42; g.strokeStyle = '#fff'; g.lineWidth = s * .42;
        for (let y = y0; y < y1 + st; y += st) for (let x = s * .45; x < w + st; x += st) { g.beginPath(); g.arc(x, y, r, 0, 6.29); g.stroke(); }
        g.fillStyle = '#fff'; for (let y = y0 + st / 2; y < y1 + st; y += st) for (let x = s * .45 + st / 2; x < w + st; x += st) { g.beginPath(); g.arc(x, y, s * .3, 0, 6.29); g.fill(); }
        g.restore(); };
      const LINES = ['PICTOS', 'VICTOS', 'HOSTIS', 'DELETA', 'LVDITE', 'SECVRI'];
      const front = face((g, w, h, s) => { const top = s * .7, foot = s * 3.0, bh = (h - top - foot) / 6;
        LINES.forEach((t, i) => letters(g, w, s, top + i * bh + s * .12, bh - s * .24, t));
        g.fillStyle = '#000'; g.beginPath(); g.rect(s * 2.0, h - s * 2.6, w - s * 4.0, s * 2.6); g.fill(); });   // the exit at the foot, onto the steps
      const side = word => face((g, w, h, s) => { letters(g, w, s, s * .75, s * 2.3, word); lattice(g, w, s, s * 3.45, h - s * .7); });
      const metal = am => K.mat({ map: patT, alphaMap: am, alphaTest: .35, alphaToCoverage: true, transparent: false,   /* (alpha-to-coverage: the openwork's edges are anti-aliased, so the lattice does not sparkle at a distance) */ side: TT.DoubleSide, color: '#ffffff', roughness: .45, metalness: .7 });
      const faces = [[front, 0, W / 2, 0], [side('VTERE'), Math.PI / 2, 0, W / 2], [side('FELIX'), Math.PI, -W / 2, 0], [side('VIVAS'), -Math.PI / 2, 0, -W / 2]];
      // front faces +z
      const planeG = new TT.PlaneGeometry(W, H);
      faces.forEach(([am, ry], i) => { const m = new TT.Mesh(planeG, metal(am)); m.rotation.y = ry; m.position.set(Math.sin(ry) * W / 2, H / 2, Math.cos(ry) * W / 2); G.add(m);
        const m2 = m.clone(); m2.position.multiplyScalar(1).setY(H / 2); m2.position.x *= (W / 2 - T) / (W / 2); m2.position.z *= (W / 2 - T) / (W / 2); G.add(m2); });
      // corner posts and the rims at the top and the foot (solid plate)
      const solid = K.mat({ map: patT, color: '#ffffff', roughness: .45, metalness: .7 });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const p = new TT.Mesh(new TT.BoxGeometry(.32, H, .32), solid); p.position.set(a * (W / 2 - .1), H / 2, b * (W / 2 - .1)); G.add(p); });
      [H - .25, .25].forEach(y => { [[W + .1, .5, .12, 0, W / 2], [W + .1, .5, .12, 0, -W / 2], [.12, .5, W + .1, W / 2, 0], [.12, .5, W + .1, -W / 2, 0]].forEach(([a, b, c, x, z]) => { const r = new TT.Mesh(new TT.BoxGeometry(a, b, c), solid); r.position.set(x, y, z); G.add(r); }); });
      // inside: three sloping baffles, alternate sides
      [16.5, 11.5, 6.5].forEach((y, i) => { const b = new TT.Mesh(new TT.BoxGeometry(W - .3, .1, W * .62), solid); b.position.set(0, y, (i % 2 ? 1 : -1) * W * .17); b.rotation.x = (i % 2 ? -1 : 1) * .5; G.add(b); });
      // the flight of steps out of the front, between two scrolled cheeks (the photograph)
      for (let k = 0; k < 4; k++) { const st = new TT.Mesh(new TT.BoxGeometry(W - 3.4, .15 + .45 * (3 - k), 1.0), solid); st.position.set(0, (.15 + .45 * (3 - k)) / 2, W / 2 + .5 + k * 1.0); G.add(st); }
      const ch = new TT.Shape(); ch.moveTo(0, 0); ch.lineTo(4.4, 0); ch.quadraticCurveTo(4.8, .9, 4.0, 1.1); ch.quadraticCurveTo(3.3, 1.2, 3.1, 1.9); ch.quadraticCurveTo(2.2, 2.0, 2.0, 2.8); ch.quadraticCurveTo(1.0, 2.8, .9, 3.6); ch.quadraticCurveTo(.3, 3.4, 0, 3.0); ch.closePath();
      ch.holes.push(new TT.Path().absarc(3.6, .65, .3, 0, 6.29, true), new TT.Path().absarc(2.5, 1.5, .28, 0, 6.29, true), new TT.Path().absarc(1.3, 2.4, .26, 0, 6.29, true));
      const chG = new TT.ExtrudeGeometry(ch, { depth: .14, bevelEnabled: false, curveSegments: 10 });
      [-1, 1].forEach(k => { const m = new TT.Mesh(chG, solid); m.rotation.y = -Math.PI / 2; m.position.set(k * (W / 2 - 1.62), 0, W / 2); G.add(m); });
      // a few dice just thrown, bone, with drilled pips
      const boneT = K.tex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,40,20,.85)'; [[.3, .3], [.7, .7], [.5, .5]].forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * h, w * .07, 0, 6.29); g.fill(); }); });
      const bone = K.mat({ map: boneT, color: '#ffffff', roughness: .6 });
      [[-1.4, 9.8, .5], [.4, 10.3, 1.2], [2.1, 9.6, .3]].forEach(([x, z, r]) => { const d = new TT.Mesh(new TT.BoxGeometry(1.1, 1.1, 1.1), bone); d.position.set(x, .55, z); d.rotation.y = r; G.add(d); });
      return G;
    },
  };
})();
