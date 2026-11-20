/* 所蔵品：ヴェットヴァイス＝フロイツハイムのダイスタワー（ボン・ライン州立博物館 Inv. 85.0269.00） — units: 1 = 1 cm.
   A hollow square tower of copper-alloy plate, 22 cm high and 9 × 9 cm (EDH record): every face pierced with openwork, the front
   with the three lines PICTOS VICTOS / HOSTIS DELETA / LVDITE SECVRI, the other faces with VTERE · FELIX · VIVAS round the top;
   inside, three levels of sloping baffles; the dice run out at the foot of the front down a little flight of steps (three bells
   hung above it, one survives — not shown). The lost top (perhaps battlements and pine cones) is not restored, as in the museum.
   The openwork patterns between the letters are drawn in the manner of the piece (estimates). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).pyrgus = {
    build(TT, X, K) {
      const G = new TT.Group();
      const W = 9, H = 22, T = .12;
      // the metal: dark copper-alloy with a brown-green patina, brighter on the edges
      const patT = K.tex(512, 512, (g, w, h) => { const n = K.noise(11), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 90, y / 90, 5), b = n(x / 18 + 9, y / 18, 3), gr = Math.max(0, a - .52) * 2.2, i = (y * w + x) * 4;
          d[i] = 96 + b * 40 - gr * 40; d[i + 1] = 74 + b * 30 + gr * 50; d[i + 2] = 48 + b * 18 + gr * 34; d[i + 3] = 255; } g.putImageData(img, 0, 0); });
      // a face: openwork drawn white-on-black into an alpha map (black = holes)
      const face = (fn) => K.tex(512, Math.round(512 * H / W), (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; fn(g, w, h, w / W); }, { data: true });
      const ROM = (g, s, txt, x, y, size) => { g.font = `700 ${size * s}px "Times New Roman",Georgia,serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, x, y); };
      // the openwork below the letters: rows of peltae (twin curls) and lattice — a common late-Roman openwork vocabulary
      const pattern = (g, w, h, s, y0, y1) => {
        const rows = Math.floor((y1 - y0) / (s * 1.9)); const rh = (y1 - y0) / rows;
        for (let r = 0; r < rows; r++) {
          const cy = y0 + (r + .5) * rh, kind = r % 3;
          for (let c = 0; c < 4; c++) {
            const cx = s * (1.35 + c * 2.1);
            g.beginPath();
            if (kind === 0) { g.arc(cx - s * .38, cy, s * .36, 0, Math.PI * 2); g.arc(cx + s * .38, cy, s * .36, 0, Math.PI * 2); }
            else if (kind === 1) { g.moveTo(cx, cy - s * .7); g.lineTo(cx + s * .55, cy); g.lineTo(cx, cy + s * .7); g.lineTo(cx - s * .55, cy); g.closePath(); }
            else { g.ellipse(cx, cy, s * .7, s * .22, 0, 0, Math.PI * 2); }
            g.fill();
          }
        }
      };
      const frame = (g, w, h, s) => { g.fillStyle = '#fff'; };
      const front = face((g, w, h, s) => {
        // the three lines in pierced capitals, then the openwork, then the arched exit at the foot
        ['PICTOS VICTOS', 'HOSTIS DELETA', 'LVDITE SECVRI'].forEach((t, i) => ROM(g, s, t, w / 2, s * (1.6 + i * 1.55), .92));
        pattern(g, w, h, s, s * 6.2, h - s * 6.4);
        // the exit: an arched opening, and the two dolphins' outlines above it (the bells hung from them)
        g.beginPath(); g.moveTo(s * 2.2, h - s * .2); g.lineTo(s * 2.2, h - s * 3.2); g.quadraticCurveTo(w / 2, h - s * 5.2, w - s * 2.2, h - s * 3.2); g.lineTo(w - s * 2.2, h - s * .2); g.closePath(); g.fill();
        [-1, 1].forEach(k => { g.save(); g.translate(w / 2 + k * s * 1.9, h - s * 5.4); g.scale(k, 1); g.beginPath();
          g.moveTo(-s * 1.2, s * .2); g.quadraticCurveTo(-s * .4, -s * .9, s * .6, -s * .2); g.quadraticCurveTo(s * 1.1, s * .1, s * .9, s * .5); g.quadraticCurveTo(s * .3, s * .1, -s * .3, s * .5); g.quadraticCurveTo(-s * .9, s * .8, -s * 1.2, s * .2); g.fill(); g.restore(); });
      });
      const side = word => face((g, w, h, s) => { ROM(g, s, word, w / 2, s * 1.6, 1.35); pattern(g, w, h, s, s * 3.2, h - s * 1.2); });
      const metal = am => K.mat({ map: patT, alphaMap: am, alphaTest: .5, transparent: false, side: TT.DoubleSide, color: '#ffffff', roughness: .55, metalness: .85 });
      const faces = [[front, 0, W / 2, 0], [side('VTERE'), Math.PI / 2, 0, W / 2], [side('FELIX'), Math.PI, -W / 2, 0], [side('VIVAS'), -Math.PI / 2, 0, -W / 2]];
      // front faces +z
      const planeG = new TT.PlaneGeometry(W, H);
      faces.forEach(([am, ry], i) => { const m = new TT.Mesh(planeG, metal(am)); m.rotation.y = ry; m.position.set(Math.sin(ry) * W / 2, H / 2, Math.cos(ry) * W / 2); G.add(m);
        const m2 = m.clone(); m2.position.multiplyScalar(1).setY(H / 2); m2.position.x *= (W / 2 - T) / (W / 2); m2.position.z *= (W / 2 - T) / (W / 2); G.add(m2); });
      // corner posts and the rims at the top and the foot (solid plate)
      const solid = K.mat({ map: patT, color: '#ffffff', roughness: .5, metalness: .85 });
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { const p = new TT.Mesh(new TT.BoxGeometry(.32, H, .32), solid); p.position.set(a * (W / 2 - .1), H / 2, b * (W / 2 - .1)); G.add(p); });
      [H - .25, .25].forEach(y => { [[W + .1, .5, .12, 0, W / 2], [W + .1, .5, .12, 0, -W / 2], [.12, .5, W + .1, W / 2, 0], [.12, .5, W + .1, -W / 2, 0]].forEach(([a, b, c, x, z]) => { const r = new TT.Mesh(new TT.BoxGeometry(a, b, c), solid); r.position.set(x, y, z); G.add(r); }); });
      // inside: three sloping baffles, alternate sides
      [16.5, 11.5, 6.5].forEach((y, i) => { const b = new TT.Mesh(new TT.BoxGeometry(W - .3, .1, W * .62), solid); b.position.set(0, y, (i % 2 ? 1 : -1) * W * .17); b.rotation.x = (i % 2 ? -1 : 1) * .5; G.add(b); });
      // the little flight of steps out of the front
      for (let k = 0; k < 4; k++) { const st = new TT.Mesh(new TT.BoxGeometry(W - 4.6, .1 + .35 * (3 - k), .9), solid); st.position.set(0, (.1 + .35 * (3 - k)) / 2, W / 2 + .45 + k * .9 - .45); G.add(st); }
      // a few dice just thrown, bone, with drilled pips
      const boneT = K.tex(256, 256, (g, w, h) => { g.fillStyle = '#e8dcc0'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,40,20,.85)'; [[.3, .3], [.7, .7], [.5, .5]].forEach(([x, y]) => { g.beginPath(); g.arc(x * w, y * h, w * .07, 0, 6.29); g.fill(); }); });
      const bone = K.mat({ map: boneT, color: '#ffffff', roughness: .6 });
      [[-1.2, 5.6, .5], [1.4, 6.3, 1.2]].forEach(([x, z, r]) => { const d = new TT.Mesh(new TT.BoxGeometry(1.1, 1.1, 1.1), bone); d.position.set(x, .55, z); d.rotation.y = r; G.add(d); });
      return G;
    },
  };
})();
