/* 所蔵品：「シャルルマーニュのチェス駒」（フランス国立図書館 メダル・古代美術部門 Inv.55.305–55.323） — units: 1 = 1 cm.
   Elephant ivory with traces of gilding and paint; southern Italy (Salerno or Amalfi), 1080–1100; in the treasury of Saint-Denis,
   seized in the Revolution (18 Jan. 1794). 16 survive: 2 kings, 2 queens, 4 elephants, 3 quadrigae, 4 horsemen, 1 foot soldier.
   Shown, one of each, at the heights of the BnF records: king Inv.55.306 (15.8 cm), queen .309 (12.7), elephant .312 (11.7),
   quadriga .317 (12.6), horseman with pointed shield .319 (12.4), foot soldier .323 (7.3). What each shows follows the records
   (king under a small crenellated semicircular building on paired columns, two attendants drawing the curtains; queen on a stool
   in wide sleeves, curly-haired servants at the curtains, an armed guard behind his shield high on the façade, a dome on twin
   columns; elephant with two mahouts holding their hooks; quadriga driven by a charioteer with a three-thonged whip; horseman with
   a lozenge-decorated pointed shield, sword in the right hand, head turned to his left; soldier in cuirass and nasal helmet, sword
   held high behind a great pointed shield). Proportions, faces, folds and the ornament (arcades, palmettes, rosette) are drawn
   in the manner of the pieces (estimates).
   2026-11-21 (after photographs of the pieces on display, Wikimedia Commons): every piece is a carved block (kit.relief). King and queen:
   deep blocks with a niche — a pleated canopy and curtains drawn into a pointed opening for the king, a round arch with a zigzag moulding
   under crenellations for the queen, attendants either side, zigzag frames, arcades behind. Elephant, quadriga and horseman are carved
   from the side and stand in profile. Warm cream ivory with brown in the cuts. Figures and ornament are simplified (estimates). */
(function () {
  'use strict';
  (window.AtlasEx = window.AtlasEx || {}).charlemagne = {
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1794; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      const V3 = (x, y, z) => new TT.Vector3(x, y, z);
      // ---- elephant ivory: creamy, polished, fine lines; old wear darker in the hollows
      const ivT = (k) => K.tex(512, 512, (g, w, h) => {
        K.grain(g, w, h, { a: '#eadab6', b: '#e0cda6', seed: 60 + k, sx: 1.2, sy: 30, warp: .25 });   // warm cream (the photographs)
        const n = K.noise(90 + k), img = g.getImageData(0, 0, w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = n(x / 100, y / 100, 4), s = Math.max(0, a - .52) * 60, i = (y * w + x) * 4; d[i] -= s * .5; d[i + 1] -= s * .75; d[i + 2] -= s * 1.2; }
        g.putImageData(img, 0, 0);
      });
      const IVT = [ivT(0), ivT(1)];
      const IV = (k = 0) => K.mat({ map: IVT[k], color: '#ffffff', roughness: .36, clearcoat: .3, clearcoatRoughness: .4, sheen: .2, sheenColor: K.lin('#fff3dc') });
      const iv = IV(0), iv2 = IV(1);
      const lozM = K.mat({ map: IVT[0], color: '#ffffff', roughness: .4 });
      /* ---- every piece is a carved block (kit.relief): a height painting for each of its two faces, after photographs of the pieces
              in the Cabinet des médailles (Wikimedia Commons). Painters work in centimetres, x from the middle, y up from the base. ---- */
      const { line, blob, area, path, sh } = K.ink, both = fn => { fn(1); fn(-1); }, DIRT = [128, 92, 50], ivC = IVT.map(t => t.image);
      const carve = (o) => K.relief(Object.assign({ px: 448, round: .35, nx: 40, tex: ivC[0], dirt: DIRT, dirtK: .8, bump: 1.8, mat: { roughness: .4, clearcoat: .25, clearcoatRoughness: .45 } }, o));
      // small helpers, in units of the piece's relief R (cm): a = centimetres wanted / R
      const zig = (g, x, y0, y1, w, a) => { const n = Math.max(2, Math.round((y1 - y0) / (w * .9))), st = (y1 - y0) / n; for (let k = 0; k < n; k++) line(g, [[x - w / 2, y0 + k * st], [x + w / 2, y0 + (k + .5) * st], [x - w / 2, y0 + (k + 1) * st]], w * .22, a); };
      const beads = (g, x0, x1, y, r, a) => { const n = Math.round((x1 - x0) / (r * 2.6)); for (let k = 0; k <= n; k++) blob(g, x0 + (x1 - x0) * k / n, y, r, r, a); };
      // a standing figure in a long robe, in high relief: head (hair or crown), shoulders, the robe in long folds, feet; lv = how far it stands out
      const figure = (g, x, y0, h, lv, o = {}) => { const u = h / 6.2, w = (o.w || 1) * u;
        area(g, [[x - 1.0 * w, y0 + .25 * u], [x - 1.05 * w, y0 + 2.6 * u], [x - 1.15 * w, y0 + 4.5 * u], [x - .7 * w, y0 + 5.0 * u], [x + .7 * w, y0 + 5.0 * u], [x + 1.15 * w, y0 + 4.5 * u], [x + 1.05 * w, y0 + 2.6 * u], [x + 1.0 * w, y0 + .25 * u]], lv);
        blob(g, x, y0 + 3.2 * u, .9 * w, 2.4 * u, lv * .35);
        g.beginPath(); g.ellipse(x, y0 + 5.55 * u, .52 * u, .62 * u, 0, 0, 6.29); sh(g, 255, lv); g.fill(); blob(g, x, y0 + 5.5 * u, .45 * u, .55 * u, lv * .4);
        const a = .16 / R0; [-0.62, -0.25, .12, .5].forEach(k => line(g, [[x + k * w, y0 + 2.9 * u], [x + k * w * 1.08, y0 + 1.4 * u], [x + k * w * 1.12, y0 + .35 * u]], .12 * u, -a));           // folds
        line(g, [[x - w, y0 + .42 * u], [x + w, y0 + .42 * u]], .1 * u, -a); both(s => blob(g, x + s * .4 * w, y0 + .16 * u, .3 * u, .16 * u, lv * .9));                                       // hem, feet
        both(s => { blob(g, x + s * .2 * u, y0 + 5.62 * u, .1 * u, .07 * u, -a * 1.3); }); line(g, [[x, y0 + 5.62 * u], [x, y0 + 5.38 * u]], .09 * u, a * .8); line(g, [[x - .14 * u, y0 + 5.22 * u], [x + .14 * u, y0 + 5.22 * u]], .05 * u, -a);   // eyes, nose, mouth
        if (o.hair) { for (let k = -2; k <= 2; k++) blob(g, x + k * .2 * u, y0 + (6.0 - Math.abs(k) * .08) * u, .13 * u, .13 * u, a * 1.1); }
        if (o.crown) { area(g, [[x - .55 * u, y0 + 5.95 * u], [x - .55 * u, y0 + 6.45 * u], [x + .55 * u, y0 + 6.45 * u], [x + .55 * u, y0 + 5.95 * u]], lv, true); beads(g, x - .4 * u, x + .4 * u, y0 + 6.2 * u, .08 * u, a); line(g, [[x - .55 * u, y0 + 5.98 * u], [x + .55 * u, y0 + 5.98 * u]], .07 * u, -a); }
        if (o.beard) { area(g, [[x - .42 * u, y0 + 5.3 * u], [x - .3 * u, y0 + 4.7 * u], [x, y0 + 4.5 * u], [x + .3 * u, y0 + 4.7 * u], [x + .42 * u, y0 + 5.3 * u]], a * 1.2); for (let k = -1; k <= 1; k++) line(g, [[x + k * .15 * u, y0 + 5.15 * u], [x + k * .1 * u, y0 + 4.62 * u]], .04 * u, -a); }
        if (o.arms) o.arms(u, a); };
      let R0 = 1;
      const pieces = [];
      // KING (Inv.55.306, H 15.8 cm, w 10.5): a block of ivory carved as a little pavilion — a pleated canopy, a zigzag frame, curtains drawn
      // aside into a pointed opening; inside, the bearded king, crowned, the sceptre held slantwise, between two attendants; arcades behind
      { const W = 10.5, H = 15.8, R = R0 = 1.5, a = c => c / R;
        const frame = (g) => { both(s => { zig(g, s * 4.45, 2.6, 12.9, .9, a(.14)); line(g, [[s * 3.85, 2.5], [s * 3.85, 13.0]], .12, -a(.2)); line(g, [[s * 5.02, 2.2], [s * 5.02, 13.4]], .1, -a(.15)); });
          for (let x = -4.6; x <= 4.61; x += .46) line(g, [[x, 13.5], [x * 1.02, 15.4]], .1, -a(.16));                                 // the canopy's pleats
          line(g, [[-5.1, 13.35], [5.1, 13.35]], .16, -a(.22)); line(g, [[-5.1, 2.35], [5.1, 2.35]], .14, -a(.2));
          for (let k = 0; k < 6; k++) { const cx = -4.1 + k * 1.64; area(g, [[cx - .62, .5], [cx + .62, .5], [cx + .62, 1.95], [cx - .62, 1.95]], -a(.12), true); area(g, [[cx, 1.8], [cx + .5, 1.22], [cx, .65], [cx - .5, 1.22]], a(.2), true); }   // the base: lozenges in squares
          beads(g, -4.7, 4.7, 2.15, .13, a(.12)); };
        const g0 = carve({ w: W + .7, h: H + .6, depth: 3.3, relief: R, round: .5,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-5.25, -1], [-5.25, 13.6], [-5.0, 15.0], [-3.2, 15.75], [3.2, 15.75], [5.0, 15.0], [5.25, 13.6], [5.25, -1]], true); g.fill(); },
          front: g => { frame(g);
            area(g, [[-3.7, 2.55], [-3.7, 9.4], [-3.3, 10.6], [-1.6, 12.2], [0, 13.0], [1.6, 12.2], [3.3, 10.6], [3.7, 9.4], [3.7, 2.55]], -a(1.35));                       // the niche
            both(s => { area(g, [[s * 3.75, 2.6], [s * 3.75, 13.0], [0, 13.05], [s * 1.5, 12.0], [s * 2.6, 10.2], [s * 2.95, 7.6], [s * 3.1, 2.6]], .52);                 // the curtains
              for (let k = 0; k < 5; k++) line(g, [[s * (.5 + k * .62), 12.85], [s * (1.9 + k * .4), 10.8 + k * .3], [s * (2.95 + k * .16), 7.5], [s * (3.12 + k * .13), 2.7]], .11, -a(.16)); });
            figure(g, -2.3, 2.6, 5.3, .5, { hair: true, arms: (u, k) => line(g, [[-2.75, 6.3], [-3.1, 6.9]], .28, k * 1.2) });
            figure(g, 2.3, 2.6, 5.3, .5, { hair: true, arms: (u, k) => line(g, [[2.75, 6.3], [3.1, 6.9]], .28, k * 1.2) });
            figure(g, 0, 2.6, 8.9, .62, { crown: true, beard: true, w: 1.12, arms: (u, k) => { line(g, [[-1.2, 8.6], [-.5, 7.5], [.2, 7.9]], .5, k * 1.5); line(g, [[1.25, 8.6], [.9, 7.2], [.1, 6.9]], .5, k * 1.5);
              line(g, [[-.35, 6.1], [.75, 9.5]], .26, k * 2.2); blob(g, .82, 9.75, .28, .34, k * 2.4);                                                                     // the sceptre
              for (let q = 0; q < 5; q++) line(g, [[-1.2 + q * .1, 8.4 - q * .5], [1.2 - q * .1, 8.2 - q * .55]], .07, -k * .8); } }); },
          back: g => { frame(g); for (let k = -1; k <= 1; k++) { const cx = k * 2.5; area(g, [[cx - .95, 2.7], [cx - .95, 10.2], [cx - .6, 11.4], [cx, 11.9], [cx + .6, 11.4], [cx + .95, 10.2], [cx + .95, 2.7]], -a(.55));
              line(g, [[cx - 1.1, 2.7], [cx - 1.1, 10.3], [cx, 12.15], [cx + 1.1, 10.3], [cx + 1.1, 2.7]], .2, a(.14)); line(g, [[cx - 1.2, 10.2], [cx + 1.2, 10.2]], .22, a(.12)); } } });
        const p = new TT.Group(); p.add(g0); pieces.push(p); }
      // QUEEN (Inv.55.309, H 12.7 cm, w 9.4): a round arch with a zigzag moulding under crenellations; the queen in a gown with wide sleeves, a
      // hand to her breast, between two attendants; a band of pierced dots along the base
      { const W = 9.4, H = 12.7, R = R0 = 1.4, a = c => c / R;
        const frame = (g) => { both(s => { zig(g, s * 4.05, 2.3, 10.6, .8, a(.14)); line(g, [[s * 3.5, 2.2], [s * 3.5, 8.0]], .12, -a(.2)); });
          line(g, [[-4.6, 11.15], [4.6, 11.15]], .14, -a(.2)); line(g, [[-4.6, 2.05], [4.6, 2.05]], .14, -a(.2)); line(g, [[-4.6, .35], [4.6, .35]], .1, -a(.15));
          for (let x = -4.1; x <= 4.11; x += .82) { blob(g, x, 1.5, .16, .16, -a(.3)); blob(g, x + .41, .9, .16, .16, -a(.3)); }
          for (let x = -4.25; x <= 4.26; x += .5) line(g, [[x, 11.3], [x, 11.9]], .08, -a(.1)); };
        const g0 = carve({ w: W + .7, h: H + .6, depth: 2.9, relief: R, round: .4,
          mask: g => { g.fillStyle = '#fff'; g.fillRect(-4.7, -1, 9.4, 12.95); for (let k = 0; k < 6; k++) g.fillRect(-4.7 + k * 1.72, 11.9, .82, .8); },
          front: g => { frame(g);
            const arch = [[-3.35, 2.25], [-3.35, 7.4], [-3.1, 9.2], [-1.9, 10.5], [0, 10.95], [1.9, 10.5], [3.1, 9.2], [3.35, 7.4], [3.35, 2.25]]; area(g, arch, -a(1.25));
            for (let k = 0; k <= 12; k++) { const t = Math.PI * k / 12, x = -Math.cos(t) * 3.75, y = 7.6 + Math.sin(t) * 3.75; line(g, [[x * .93, 7.6 + (y - 7.6) * .93], [x * 1.04, 7.6 + (y - 7.6) * 1.04]], .22, a(.16)); }     // the arch's zigzag moulding
            figure(g, -2.35, 2.3, 5.7, .5, { hair: true, arms: (u, k) => line(g, [[-2.0, 5.9], [-2.9, 6.6]], .3, k * 1.2) });
            figure(g, 2.35, 2.3, 5.7, .5, { hair: true, arms: (u, k) => line(g, [[2.0, 5.9], [2.9, 6.6]], .3, k * 1.2) });
            figure(g, 0, 2.3, 8.1, .62, { crown: true, w: 1.15, arms: (u, k) => { both(s => line(g, [[s * 1.3, 7.9], [s * 1.45, 6.2], [s * .55, 6.0]], .62, k * 1.4)); blob(g, .15, 6.7, .34, .5, k * 2);
              both(s => line(g, [[s * .5, 9.2], [s * .95, 8.2], [s * 1.1, 6.6]], .09, -k * .9)); beads(g, -.55, .55, 9.15, .08, k * .8); } }); },
          back: g => { frame(g); for (let k = -1; k <= 1; k++) { const cx = k * 2.25; area(g, [[cx - .8, 2.4], [cx - .8, 8.3], [cx, 9.6], [cx + .8, 8.3], [cx + .8, 2.4]], -a(.5)); line(g, [[cx - .95, 2.4], [cx - .95, 8.4], [cx, 9.9], [cx + .95, 8.4], [cx + .95, 2.4]], .18, a(.13)); } } });
        // the little armed guard high on the right of the façade, behind his shield (the BnF record)
        const p = new TT.Group(); p.add(g0); const gd = new TT.Mesh(new TT.SphereGeometry(.34, 12, 8), iv); gd.position.set(3.9, 12.95, 1.6); const sh2 = new TT.Mesh(new TT.BoxGeometry(.7, .9, .12), lozM); sh2.position.set(3.9, 12.5, 2.05); p.add(gd, sh2); pieces.push(p); }
      // ELEPHANT (Inv.55.312, H 11.7 cm, w 8.6): carved from the side — pillar legs, the trunk curling down to a little stand, a great ribbed ear,
      // the saddle-cloth in lozenges with a fringed border, two mahouts astride; a band of leaves round the base
      { const R = R0 = .8, a = c => c / R;
        const body = (g, s) => { const X = pts => pts.map(p => [s * p[0], p[1]]), L = (pts, w, k) => line(g, X(pts), w, k), B = (x, y, rx, ry, k, r = 0) => blob(g, s * x, y, rx, ry, k, s * r);
          for (let x = -3.9; x <= 3.91; x += .4) { L([[x, .35], [x + .12, .95], [x, 1.5]], .1, a(.09)); } L([[-4.2, 1.72], [4.2, 1.72]], .12, -a(.16)); L([[-4.2, .22], [4.2, .22]], .1, -a(.12));   // the base's leaves
          B(-.4, 6.6, 2.9, 2.2, a(.45)); B(3.1, 6.9, 1.3, 1.6, a(.4));                                                                         // the barrel of the body, the head
          area(g, X([[-3.1, 5.4], [-3.2, 8.3], [-2.2, 9.1], [.3, 9.2], [1.7, 8.6], [1.9, 5.6], [.6, 4.9], [-1.9, 4.9]]), a(.16));              // the saddle-cloth
          for (let k = -6; k <= 6; k++) { L([[-2.9 + k * .62, 8.9], [-2.9 + k * .62 + 2.6, 5.3]], .07, -a(.1)); L([[-.6 + k * .62, 8.9], [-.6 + k * .62 - 2.6, 5.3]], .07, -a(.1)); }
          L([[-3.15, 5.35], [-1.9, 4.85], [.6, 4.85], [1.95, 5.55]], .34, a(.14)); for (let x = -2.9; x <= 1.7; x += .3) L([[x, 5.25 - Math.abs(x + .6) * .0], [x, 4.75]], .06, -a(.1));   // its fringed border
          area(g, X([[1.55, 8.5], [1.4, 6.2], [1.9, 4.9], [2.75, 4.7], [3.15, 6.0], [3.0, 8.0], [2.4, 8.9]]), a(.22)); for (let k = 0; k < 7; k++) L([[2.55, 8.5], [1.6 + k * .24, 5.0 + (k > 4 ? (k - 4) * .5 : 0)]], .06, -a(.12));   // the ear
          B(3.45, 7.5, .26, .17, a(.22)); sh(g, 0, a(.3)); g.beginPath(); g.ellipse(s * 3.45, 7.5, .22, .13, 0, 0, 6.29); g.lineWidth = .06; g.stroke(); g.beginPath(); g.arc(s * 3.47, 7.5, .06, 0, 6.29); g.fill();    // the eye
          L([[3.35, 6.0], [3.9, 5.3], [4.05, 4.9]], .3, a(.25));                                                                              // the tusk
          for (let y = 2.6; y < 6.4; y += .42) L([[3.45, y], [4.1, y + .08]], .06, -a(.1));                                                    // the trunk's rings
          [[-2.7, 0], [1.2, 0]].forEach(([x0]) => { L([[x0 - .1, 4.6], [x0 - .1, 1.9]], .08, -a(.12)); L([[x0 + 1.25, 4.6], [x0 + 1.25, 1.9]], .08, -a(.12)); for (let k = 0; k < 3; k++) L([[x0 + .15 + k * .4, 2.05], [x0 + .15 + k * .4, 2.4]], .12, -a(.12)); });   // legs, toes
          // the mahouts: seated astride, facing forward, bare legs hanging, a hook in the hand
          [[-1.5, 0], [.55, 0]].forEach(([mx], i) => { B(mx, 9.9, .55, .8, a(.3)); L([[mx + .1, 9.4], [mx + .6, 8.4], [mx + .5, 7.3]], .34, a(.26)); B(mx + .12, 10.95, .42, .46, a(.34));
            for (let k = -2; k <= 2; k++) B(mx + .05 + k * .16, 11.3 - Math.abs(k) * .07, .11, .11, a(.12)); B(mx + .3, 10.95, .07, .05, -a(.2)); L([[mx + .2, 10.2], [mx + .75, 9.9], [mx + .9, 10.5]], .2, a(.2)); L([[mx + .9, 9.6], [mx + .9, 11.4]], .09, a(.16)); }); };
        const g0 = carve({ w: 9.3, h: 12.2, depth: 2.3, relief: R, round: .45, nx: 44,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-4.25, -1], [-4.25, 1.8], [-3.6, 2.0], [-3.75, 5.2], [-3.6, 7.6], [-2.6, 8.9], [-2.0, 9.3], [-2.0, 10.6], [-1.75, 11.45], [-1.2, 11.5], [-.9, 10.6], [-.2, 10.4], [.05, 11.3], [.6, 11.55], [1.1, 11.2], [1.25, 10.3], [1.6, 9.2], [2.6, 9.0], [3.6, 8.6], [4.15, 7.4], [4.25, 5.0], [4.2, 2.0], [4.25, 1.8], [4.25, -1]], true); g.fill();
            g.fillStyle = '#000'; path(g, [[-1.35, 1.85], [-1.4, 3.9], [-.6, 4.4], [.6, 4.4], [1.1, 3.9], [1.1, 1.85]], true); g.fill(); path(g, [[2.55, 1.85], [2.5, 4.2], [3.0, 4.7], [3.3, 4.1], [3.35, 1.85]], true); g.fill(); },
          front: g => body(g, 1), back: g => body(g, -1) });
        g0.rotation.y = -Math.PI / 2; const p = new TT.Group(); p.add(g0); pieces.push(p); }
      // QUADRIGA (Inv.55.317, H 12.6 cm, w 7.8): four horses abreast, carved from the side — the heads in a row, a harness band with a lozenge
      // panel, the chariot's lattice side and wheel, the charioteer standing above in a cap, the reins in his hands
      { const R = R0 = .7, a = c => c / R;
        const side = (g, s) => { const X = pts => pts.map(p => [s * p[0], p[1]]), L = (pts, w, k) => line(g, X(pts), w, k), B = (x, y, rx, ry, k, r = 0) => blob(g, s * x, y, rx, ry, k, s * r);
          for (let x = -3.7; x <= 3.71; x += .42) L([[x, .3], [x, 1.25]], .12, -a(.1)); L([[-3.9, 1.5], [3.9, 1.5]], .12, -a(.16));                                 // the base
          B(.9, 5.6, 2.3, 1.5, a(.4)); B(3.05, 7.7, .75, 1.0, a(.3));
          for (let k = 0; k < 4; k++) { L([[2.25 - k * .3, 8.75 - k * .03], [2.35 - k * .3, 7.3], [2.2 - k * .3, 6.3]], .07, -a(.12)); }                              // four necks, one behind the other
          B(3.2, 8.15, .12, .1, -a(.25)); L([[3.3, 7.0], [3.75, 6.9]], .06, -a(.14)); L([[2.4, 8.75], [3.0, 8.95], [3.5, 8.2], [3.7, 7.0]], .1, a(.1));               // eye, mouth, bridle
          L([[-1.0, 6.5], [1.0, 6.25], [2.6, 6.5]], .34, a(.14)); for (let x = -.8; x <= 2.4; x += .3) L([[x, 6.2], [x, 5.75]], .06, -a(.1));                        // the harness band, fringed
          area(g, X([[.35, 6.1], [1.35, 6.1], [1.35, 4.3], [.35, 4.3]]), a(.12), true); for (let k = -3; k <= 3; k++) { L([[.35 + k * .34, 6.1], [.35 + k * .34 + 1.0, 4.3]], .06, -a(.1)); L([[1.35 + k * .34, 6.1], [1.35 + k * .34 - 1.0, 4.3]], .06, -a(.1)); }
          for (let k = 0; k < 4; k++) { L([[2.6 - k * .2, 4.4], [2.75 - k * .2, 1.7]], .07, -a(.12)); L([[-.2 - k * .2, 4.3], [-.4 - k * .2, 1.7]], .07, -a(.12)); }       // the legs, four deep
          area(g, X([[-1.0, 8.2], [-3.3, 6.9], [-3.4, 4.3], [-1.3, 4.6]]), a(.2), true); for (let k = -4; k <= 5; k++) { L([[-3.3 + k * .42, 7.9], [-3.3 + k * .42 + 1.4, 4.4]], .06, -a(.1)); L([[-1.1 + k * .42, 7.9], [-1.1 + k * .42 - 1.4, 4.4]], .06, -a(.1)); }   // the chariot's side
          B(-2.6, 2.95, 1.0, 1.0, a(.3)); [.95, .62, .3].forEach(r => { sh(g, 0, a(.16)); g.lineWidth = .08; g.beginPath(); g.arc(s * -2.6, 2.95, r, 0, 6.29); g.stroke(); });                 // the wheel
          B(-1.3, 9.7, .8, 1.5, a(.4)); B(-1.35, 11.55, .5, .56, a(.38)); L([[-1.85, 11.9], [-1.3, 12.25], [-.8, 11.85]], .3, a(.18)); B(-1.0, 11.55, .07, .05, -a(.2));   // the charioteer, his cap
          L([[-1.1, 10.3], [-.2, 9.5], [.2, 9.0]], .36, a(.22)); for (let k = 0; k < 5; k++) L([[-1.9 + k * .08, 10.6 - k * .42], [-.7, 10.4 - k * .42]], .06, -a(.1)); L([[.2, 9.0], [2.3, 8.7]], .07, a(.1)); };
        const g0 = carve({ w: 8.6, h: 13.1, depth: 2.9, relief: R, round: .45, nx: 42,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-3.9, -1], [-3.9, 1.6], [-3.7, 2.2], [-3.6, 6.9], [-2.2, 8.2], [-2.1, 10.6], [-1.95, 11.9], [-1.3, 12.5], [-.7, 11.9], [-.55, 10.6], [.2, 9.4], [1.8, 9.0], [2.3, 9.3], [2.7, 9.05], [3.3, 9.0], [3.85, 7.9], [3.95, 6.8], [3.3, 6.5], [3.1, 5.2], [3.1, 2.0], [3.9, 1.6], [3.9, -1]], true); g.fill();
            g.fillStyle = '#000'; path(g, [[.05, 1.75], [0, 3.9], [.7, 4.2], [1.6, 4.2], [2.1, 3.9], [2.2, 1.75]], true); g.fill(); },
          front: g => side(g, 1), back: g => side(g, -1) });
        g0.rotation.y = -Math.PI / 2; const p = new TT.Group(); p.add(g0); pieces.push(p); }
      // HORSEMAN (Inv.55.319, H 12.4 cm, w 7.9): carved from the side — a sturdy horse, head bowed on an arched neck; the rider in a long coat
      // and rounded helmet; on his left the long pointed shield in lozenges, on his right the sword held upright
      { const R = R0 = .7, a = c => c / R;
        const side = (g, s) => { const X = pts => pts.map(p => [s * p[0], p[1]]), L = (pts, w, k) => line(g, X(pts), w, k), B = (x, y, rx, ry, k, r = 0) => blob(g, s * x, y, rx, ry, k, s * r);
          L([[-3.7, .95], [3.7, .95]], .12, -a(.16)); B(-.3, 5.2, 2.6, 1.5, a(.42)); B(2.9, 6.4, .8, 1.2, a(.3)); B(3.2, 5.0, .5, .9, a(.25));
          for (let k = 0; k < 7; k++) L([[1.75 + k * .17, 7.25 + k * .05], [1.5 + k * .2, 6.5], [1.55 + k * .2, 5.9]], .07, -a(.12));                              // the mane
          B(3.1, 6.3, .12, .1, -a(.25)); L([[3.0, 4.3], [3.5, 4.35]], .06, -a(.14)); L([[2.5, 6.9], [3.1, 6.95], [3.55, 5.6], [3.5, 4.6]], .1, a(.1));              // eye, mouth, bridle
          L([[1.6, 5.9], [2.2, 4.6], [2.3, 3.9]], .26, a(.12)); L([[-3.0, 5.6], [-3.5, 4.2], [-3.3, 2.4]], .34, a(.2)); for (let y = 2.6; y < 5.4; y += .4) L([[-3.6, y + .1], [-3.15, y]], .06, -a(.1));   // breast band; tail
          [[-2.6, -2.0], [1.7, 2.3]].forEach(([x0, x1]) => { L([[x0 + .3, 3.9], [x0 + .3, 1.2]], .07, -a(.12)); });
          B(-.2, 8.4, .95, 1.6, a(.42)); B(-.1, 10.7, .55, .6, a(.38)); L([[-.7, 11.0], [-.1, 11.45], [.5, 11.0]], .32, a(.2)); L([[-.7, 10.85], [.55, 10.85]], .08, -a(.14));   // the rider, his helmet
          B(.22, 10.65, .07, .05, -a(.22)); L([[.3, 10.35], [.45, 10.3]], .05, -a(.14));
          L([[-.2, 7.3], [.3, 5.6], [.5, 4.0]], .7, a(.28)); L([[.5, 4.0], [.6, 3.0]], .44, a(.26)); B(.85, 2.75, .45, .22, a(.3));                                   // his leg and foot
          if (s > 0) { L([[-.5, 9.3], [.4, 8.4], [1.0, 8.2]], .44, a(.25)); B(1.1, 8.2, .26, .26, a(.3)); L([[1.15, 8.5], [1.2, 12.0]], .26, a(.3)); L([[.8, 8.55], [1.5, 8.55]], .14, a(.26)); }   // sword arm
          else { area(g, X([[-.95, 9.6], [-.1, 9.85], [.8, 9.55], [.75, 7.6], [.3, 5.2], [-.05, 4.2], [-.45, 5.2], [-.95, 7.6]]), a(.42));                              // the shield
            for (let k = -4; k <= 4; k++) { L([[-.95 + k * .4, 9.7], [-.95 + k * .4 + 2.2, 4.3]], .06, -a(.1)); L([[.8 + k * .4, 9.7], [.8 + k * .4 - 2.2, 4.3]], .06, -a(.1)); } } };
        const g0 = carve({ w: 8.4, h: 12.9, depth: 1.9, relief: R, round: .45, nx: 42,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-3.8, -1], [-3.8, 1.0], [-3.2, 1.3], [-3.75, 3.0], [-3.7, 5.2], [-3.0, 6.3], [-1.3, 6.6], [-1.2, 9.6], [-.8, 10.4], [-.75, 11.1], [-.1, 11.75], [.6, 11.1], [.7, 10.2], [1.0, 9.4], [.95, 7.2], [1.6, 7.3], [2.3, 7.75], [3.3, 7.4], [3.8, 6.2], [3.85, 4.4], [3.4, 3.9], [2.9, 4.6], [2.6, 3.6], [2.55, 1.3], [3.8, 1.0], [3.8, -1]], true); g.fill();
            g.fillRect(1.02, 8.0, .36, 4.3); g.fillStyle = '#000'; path(g, [[-1.75, 1.2], [-1.8, 3.2], [-.9, 3.7], [.4, 3.7], [1.35, 3.2], [1.4, 1.2]], true); g.fill(); },
          thick: g => { g.fillStyle = 'rgb(205,205,205)'; g.fillRect(-1.4, 6.6, 2.3, 6); g.fillStyle = 'rgb(160,160,160)'; g.fillRect(2.6, 3.6, 1.4, 4.4); },
          front: g => side(g, 1), back: g => side(g, -1) });
        g0.rotation.y = -Math.PI / 2; const p = new TT.Group(); p.add(g0); pieces.push(p); }
      // FOOT SOLDIER (Inv.55.323, H 7.3 cm, w 4.8): almost hidden behind a great pointed shield worked in lozenges; a nasal helmet, the sword held high
      { const R = R0 = .5, a = c => c / R;
        const g0 = carve({ w: 5.3, h: 7.9, depth: 1.25, relief: R, round: .35, nx: 30,
          mask: g => { g.fillStyle = '#fff'; path(g, [[-2.3, -1], [-2.3, .7], [-1.6, 1.0], [-1.35, 3.6], [-1.3, 5.3], [-.75, 5.8], [-.7, 6.6], [0, 7.3], [.7, 6.6], [.75, 5.8], [1.3, 5.3], [1.35, 3.6], [1.6, 1.0], [2.3, .7], [2.3, -1]], true); g.fill(); g.fillRect(-1.75, 4.6, .34, 2.6); },
          front: g => { line(g, [[-2.2, .62], [2.2, .62]], .1, -a(.12)); for (let x = -2.0; x <= 2.01; x += .4) line(g, [[x, .15], [x, .5]], .08, -a(.08));
            blob(g, 0, 6.35, .6, .7, a(.3)); line(g, [[-.7, 6.5], [.7, 6.5]], .1, a(.12)); line(g, [[0, 6.5], [0, 5.9]], .14, a(.2)); both(s => blob(g, s * .3, 6.25, .09, .06, -a(.2)));
            area(g, [[-1.15, 5.45], [0, 5.8], [1.15, 5.45], [1.1, 3.6], [.6, 1.9], [0, .95], [-.6, 1.9], [-1.1, 3.6]], a(.3));
            for (let k = -5; k <= 5; k++) { line(g, [[-1.15 + k * .4, 5.7], [-1.15 + k * .4 + 2.3, 1.0]], .06, -a(.1)); line(g, [[1.15 + k * .4, 5.7], [1.15 + k * .4 - 2.3, 1.0]], .06, -a(.1)); }
            line(g, [[-1.58, 4.7], [-1.58, 7.1]], .22, a(.22)); blob(g, -1.5, 4.6, .26, .26, a(.25)); },
          back: g => { line(g, [[-2.2, .62], [2.2, .62]], .1, -a(.12)); line(g, [[-.7, 6.5], [.7, 6.5]], .1, a(.12)); for (let k = -2; k <= 2; k++) line(g, [[k * .42, 5.2], [k * .5, 3.0], [k * .58, 1.0]], .09, -a(.12)); line(g, [[-1.3, 3.6], [1.3, 3.6]], .2, a(.12)); } });
        const p = new TT.Group(); p.add(g0); pieces.push(p); }

      // ---- the case: dark felt; queen · king · quadriga at the back, horseman · elephant · soldier in front
      const feltT = K.tex(256, 256, (g, w, h) => { const n = K.noise(9), img = g.createImageData(w, h), d = img.data; for (let i = 0; i < w * h; i++) { const v = 30 + n((i % w) / 6, (i / w | 0) / 6, 2) * 14; d[i * 4] = v * .9; d[i * 4 + 1] = v * .95; d[i * 4 + 2] = v * 1.15; d[i * 4 + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [4, 3] });
      const felt = K.mat({ map: feltT, color: '#ffffff', roughness: .96, sheen: .5, sheenRoughness: .9, sheenColor: K.lin('#40486a') });
      const base = new TT.Mesh(new TT.BoxGeometry(40, 1.2, 26), felt); base.position.y = -.6; base.receiveShadow = true; G.add(base);
      const L = [[0, -5.5, 0], [-12.5, -5, .2], [12.5, 6.5, 1.25], [12.5, -5, 1.2], [-12.5, 6.5, -1.25], [0, 7.5, 0]];   // (the side-carved pieces stand in profile)   // king, queen, elephant, quadriga, horseman, soldier
      pieces.forEach((p, i) => { const [x, z, ry] = L[i]; p.position.set(x, 0, z); p.rotation.y = ry; G.add(p); });
      return G;
    },
  };
})();
