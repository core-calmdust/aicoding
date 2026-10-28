/* =====================================================================
   Dots and Boxes on the 3D table — a spiral-bound notebook left open on the
   chabudai mid-game: cream paper with faint blue ruling and a red margin, a
   6 × 6 grid of inked dots, hand-drawn red and blue ballpoint lines between
   them, finished boxes hatched and initialled in the colour of the player who
   closed them; the corner of the page curls up a little. A red and a blue
   ballpoint pen lie beside / on it. Hard navy back cover, page block with
   visible sheet edges, silver wire rings, one through each punched hole.
   Registers into Table3D:
     Table3D.MODELS.dots(live)   the notebook (+ the game and the pens unless live)
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, RB, makeNoise } = X;

  const PW = 7.6, PD = 9.4;              // page size (x, z); the rings run along the far edge (−z)
  const CB = .07, BLK = .2;              // back cover and page block thickness
  const PY = CB + BLK + .004;            // the top page
  const N = 6, SP = 1.12, GZ = .45;      // dots per side, spacing, grid centre offset towards the reader
  const RED = '#d8343c', BLUE = '#2357c9';
  // the game: lines [kind h|v, row, col, colour 0 red | 1 blue]; boxes [row, col, owner]
  const BOXES = [[0, 0, 0], [0, 1, 0], [1, 0, 0], [3, 3, 1], [3, 4, 1], [4, 4, 1], [2, 4, 1], [4, 0, 0]];
  const EXTRA = [['h', 2, 2, 1], ['v', 1, 2, 0], ['h', 1, 3, 0], ['v', 3, 1, 1], ['h', 5, 2, 0], ['v', 0, 3, 1], ['h', 0, 3, 1], ['v', 2, 2, 1], ['h', 3, 1, 0], ['v', 4, 2, 0], ['h', 2, 0, 1], ['v', 2, 0, 0], ['h', 1, 2, 1]];

  /* ---------- the page ---------- */
  function paperBase(c, w, h, k, seed) {
    const Nz = makeNoise(seed), img = c.createImageData(w, h), d = img.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = (Nz(x / 3, y / 3, 2) - .5) * 9 + (Nz(x / 70, y / 70, 3) - .5) * 8 + (Math.random() - .5) * 4, i = (y * w + x) * 4;
      d[i] = 251 + v; d[i + 1] = 247 + v; d[i + 2] = 236 + v * .9; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    const U = v => v * k;
    // faint blue ruling every half dot-spacing, a red margin, a printed header line, punched holes along the top
    c.strokeStyle = 'rgba(80,130,200,.32)'; c.lineWidth = Math.max(1, U(.014));
    const z0 = PD / 2 + GZ - (N - 1) * SP / 2;   // first dot row (page units from the top)
    for (let z = z0 - SP * 1.5; z < PD - .2; z += SP / 2) { if (z < 1.05) continue; c.beginPath(); c.moveTo(0, U(z)); c.lineTo(w, U(z)); c.stroke(); }
    c.strokeStyle = 'rgba(214,80,90,.4)'; c.lineWidth = U(.016); c.beginPath(); c.moveTo(U(.75), U(.75)); c.lineTo(U(.75), h); c.stroke();
    c.fillStyle = 'rgba(70,110,170,.55)'; c.font = `600 ${U(.17)}px "Helvetica Neue",Arial,sans-serif`; c.textBaseline = 'alphabetic';
    c.fillText('No.', U(4.3), U(.98)); c.fillText('Date', U(5.6), U(.98));
    c.strokeStyle = 'rgba(70,110,170,.5)'; c.lineWidth = U(.01); c.beginPath(); c.moveTo(U(4.62), U(1)); c.lineTo(U(5.45), U(1)); c.moveTo(U(6.05), U(1)); c.lineTo(U(7.2), U(1)); c.stroke();
    for (let i = 0; i < HOLES; i++) { const x = holeX(i) + PW / 2; c.beginPath(); c.arc(U(x), U(HZ), U(.1), 0, 7); c.fillStyle = '#25272d'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = U(.012); c.stroke(); }
  }
  const HZ = .32, HOLES = 19, holeX = i => -PW / 2 + .35 + i * (PW - .7) / (HOLES - 1);
  // a ballpoint stroke: a slightly bowed line drawn twice (pressure varies), with a small ink blob where the pen started
  function inkLine(c, x1, y1, x2, y2, col, w, rnd) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, bow = (rnd() - .5) * L * .06;
    const ox = (rnd() - .5) * w * .8, oy = (rnd() - .5) * w * .8;
    c.strokeStyle = col; c.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      c.globalAlpha = p ? .55 : .9; c.lineWidth = w * (p ? .55 : 1);
      c.beginPath(); c.moveTo(x1 + ox * p, y1 + oy * p); c.quadraticCurveTo(mx + nx * bow + ox, my + ny * bow + oy, x2 - ox * p, y2 - oy * p); c.stroke();
    }
    c.globalAlpha = .8; c.fillStyle = col; c.beginPath(); c.arc(x1, y1, w * .62, 0, 7); c.fill(); c.globalAlpha = 1;
  }
  function pageTex(game) {
    const s = X.texScale(), w = Math.round(2048 * s), h = Math.round(w * PD / PW), k = w / PW;
    return X.canvasTex('dtPage' + (game ? 'G' : '') + s, w, h, (c) => {
      paperBase(c, w, h, k, game ? 3 : 9);
      if (!game) return;
      const U = v => v * k, X0 = PW / 2 - (N - 1) * SP / 2, Z0 = PD / 2 + GZ - (N - 1) * SP / 2;
      const px = i => U(X0 + i * SP), pz = j => U(Z0 + j * SP);
      let q = 77; const rnd = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      // finished boxes: diagonal hatching and the owner's initial
      for (const [r, cc, o] of BOXES) {
        const col = o ? BLUE : RED, x0 = px(cc), y0 = pz(r), sz = U(SP);
        c.save(); c.beginPath(); c.rect(x0 + U(.07), y0 + U(.07), sz - U(.14), sz - U(.14)); c.clip();
        c.strokeStyle = col; c.globalAlpha = .26; c.lineWidth = U(.022);
        for (let t = -sz; t < sz * 2; t += U(.13)) { c.beginPath(); c.moveTo(x0 + t + (rnd() - .5) * U(.03), y0); c.lineTo(x0 + t - sz + (rnd() - .5) * U(.03), y0 + sz); c.stroke(); }
        c.restore();
        c.save(); c.translate(x0 + sz / 2, y0 + sz / 2 + U(.04)); c.rotate((rnd() - .5) * .3); c.globalAlpha = .9; c.fillStyle = col;
        c.font = `italic 700 ${U(.56)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(o ? 'B' : 'R', 0, 0); c.restore();
      }
      // the lines: every side of a finished box (the closing one in the owner's colour), then the open lines
      const seen = new Set(), L = [];
      const add = (kd, r, cc, col) => { const key = kd + r + ',' + cc; if (seen.has(key)) return; seen.add(key); L.push([kd, r, cc, col]); };
      BOXES.forEach(([r, cc, o], i) => { const sides = [['h', r, cc], ['h', r + 1, cc], ['v', r, cc], ['v', r, cc + 1]]; sides.forEach((sd, j) => add(...sd, j === (i % 4) ? o : (i + j) % 2)); });
      EXTRA.forEach(e => add(...e));
      for (const [kd, r, cc, col] of L) {
        const a = U(.11), cl = col ? BLUE : RED;
        if (kd === 'h') { const d = rnd() < .5; inkLine(c, d ? px(cc) + a : px(cc + 1) - a, pz(r), d ? px(cc + 1) - a : px(cc) + a, pz(r), cl, U(.045), rnd); }
        else { const d = rnd() < .5; inkLine(c, px(cc), d ? pz(r) + a : pz(r + 1) - a, px(cc), d ? pz(r + 1) - a : pz(r) + a, cl, U(.045), rnd); }
      }
      // the dots: inked by hand, slightly uneven
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        const x = px(i) + (rnd() - .5) * U(.02), y = pz(j) + (rnd() - .5) * U(.02);
        c.fillStyle = '#23252c'; c.beginPath(); c.ellipse(x, y, U(.07), U(.064), rnd() * 3, 0, 7); c.fill();
        c.fillStyle = 'rgba(35,37,44,.3)'; c.beginPath(); c.arc(x, y, U(.09), 0, 7); c.fill();
      }
      // the running score in the top margin, in each player's ink
      c.font = `italic 700 ${U(.34)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      const sr = BOXES.filter(b => !b[2]).length, sb = BOXES.length - sr;
      c.fillStyle = RED; c.fillText('R  ' + 'I'.repeat(sr), U(1.1), U(1.6)); c.fillStyle = BLUE; c.fillText('B  ' + 'I'.repeat(sb), U(3.6), U(1.6));
    });
  }
  // the edges of the page block: many sheets, fine grey lines
  function edgeTex() {
    return X.canvasTex('dtEdge', 64, 256, (c, w, h) => {
      c.fillStyle = '#f2ede0'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) { c.fillStyle = `rgba(120,110,95,${.12 + Math.random() * .18})`; c.fillRect(0, y, w, 1); }
    });
  }
  function coverTex() {
    return X.canvasTex('dtCover', 256, 256, (c, w, h) => {
      const Nz = makeNoise(13), img = c.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (Nz(x / 2, y / 2, 2) - .5) * 26 + (Math.random() - .5) * 10, i = (y * w + x) * 4; d[i] = 32 + v * .5; d[i + 1] = 44 + v * .6; d[i + 2] = 82 + v; d[i + 3] = 255; }
      c.putImageData(img, 0, 0);
    }, 3);
  }

  /* ---------- the notebook ---------- */
  function notebook(game) {
    const TT = T(), g = new TT.Group();
    const cover = M({ map: coverTex(), roughness: .8, bumpScale: .004 });
    const cov = new TT.Mesh(RB(PW + .22, CB, PD + .12, .03, 1), cover); cov.position.set(0, CB / 2, .04); cov.castShadow = cov.receiveShadow = true; g.add(cov);
    const edge = M({ map: edgeTex(), roughness: .9, bump: false }), under = M({ map: pageTex(false), roughness: .85, bump: false });
    const blk = new TT.Mesh(new TT.BoxGeometry(PW - .04, BLK, PD - .04), [edge, edge, under, edge, edge, edge]); blk.position.y = CB + BLK / 2; blk.castShadow = blk.receiveShadow = true; g.add(blk);
    // the top sheet: a fine grid so its near-right corner can curl up (front: the game, back: blank paper)
    const sx = X.coarse ? 16 : 24, sz = X.coarse ? 20 : 30, pg = new TT.PlaneGeometry(PW, PD, sx, sz); pg.rotateX(-Math.PI / 2);
    const P = pg.attributes.position, cx = PW / 2, cz = PD / 2;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), t = (x - cx + z - cz) / Math.SQRT2 + 1.1;   // distance past the fold line, near the corner
      if (t > 0) { const R = 2, th = Math.min(t / R, 1); const lift = R * (1 - Math.cos(th)), back = t - R * Math.sin(th);   // rolled on a cylinder of radius R
        P.setY(i, lift); P.setX(i, x - back / Math.SQRT2); P.setZ(i, z - back / Math.SQRT2); }
    }
    pg.computeVertexNormals(); pg.translate(0, PY, 0);
    const front = new TT.Mesh(pg, M({ map: pageTex(game), roughness: .82, bump: false })); front.receiveShadow = true; front.castShadow = true; g.add(front);
    const back = new TT.Mesh(pg, M({ map: pageTex(false), roughness: .85, bump: false, side: TT.BackSide })); back.receiveShadow = true; g.add(back);
    // the wire rings: one closed loop per punched hole — down through the hole in the pages (and the cover below),
    // round under the cover, up past the top edge of the block and back over into the same hole
    const wire = M({ color: 0xc9ccd2, metalness: .8, roughness: .28 });
    const hz = -PD / 2 + HZ, rz = .2, y0 = .006, y1 = PY + .06, ry = (y1 - y0) / 2;   // the loop's far side clears the cover edge (−PD/2 − .02)
    const lg = new TT.TorusGeometry(rz, .022, X.coarse ? 4 : 6, X.coarse ? 12 : 20); lg.rotateY(Math.PI / 2); lg.scale(1, ry / rz, 1);
    for (let i = 0; i < HOLES; i++) {
      const l = new TT.Mesh(lg, wire); l.position.set(holeX(i), y0 + ry, hz - rz); l.castShadow = true; l.receiveShadow = true; g.add(l);
    }
    g.userData.top = PY;
    return g;
  }

  /* ---------- a ballpoint pen (low-poly): body, grip, cap with clip, cone and tip ---------- */
  function pen(col, capped) {
    const TT = T(), g = new TT.Group(), n = X.coarse ? 8 : 10, R = .12;
    const body = M({ color: col, roughness: .3, clearcoat: .6, clearcoatRoughness: .2 }), clear = M({ color: 0xe8ecef, roughness: .15, metalness: .0, clearcoat: 1, clearcoatRoughness: .05 });
    const chrome = M({ color: 0xc4c8ce, metalness: .55, roughness: .3 }), grip = M({ color: 0x24262b, roughness: .7 });
    const cyl = (r1, r2, len, m, x) => { const c = new TT.Mesh(new TT.CylinderGeometry(r1, r2, len, n), m); c.rotation.z = Math.PI / 2; c.position.x = x; c.castShadow = true; c.receiveShadow = true; g.add(c); return c; };
    // along +x: tip at −x, end at +x; total ~3.3
    cyl(.012, .03, .07, chrome, -1.66);           // ball tip
    cyl(.03, .085, .26, chrome, -1.5);             // cone
    cyl(R * .95, R * .95, .7, grip, -1.02);        // rubber grip
    cyl(R, R, 1.9, body, .28);                     // barrel
    cyl(R * .7, R * .9, .1, body, 1.28);            // end plug
    if (capped) { cyl(R * 1.12, R * 1.12, 1.0, body, -1.15); cyl(R * .6, R * 1.12, .12, body, -1.71); }
    else { cyl(R * 1.12, R * 1.12, 1.0, body, 1.15); cyl(R * 1.12, R * .7, .1, body, 1.7); }   // cap posted on the end
    // the clip on the cap
    const cx = capped ? -.95 : 1.35, clip = new TT.Mesh(new TT.BoxGeometry(.8, .03, .07), chrome); clip.position.set(cx, R * 1.12 + .03, 0); clip.castShadow = true; g.add(clip);
    const knob = new TT.Mesh(new TT.SphereGeometry(.045, 6, 4), chrome); knob.position.set(cx + (capped ? -.38 : .38), R * 1.12 + .02, 0); g.add(knob);
    void clear;
    g.position.y = R * 1.12; return g;
  }

  X.MODELS.dots = function (live) {
    const TT = T(), root = new TT.Group(), nb = notebook(!live);
    nb.rotation.y = .06; nb.position.set(-.5, 0, 0); root.add(nb);
    if (!live) {
      // the blue pen rests on the page (uncapped, cap posted), the red one lies on the table beside the notebook
      const b = pen(0x2357c9, false); b.position.set(.2, PY + b.position.y, 2.75); b.rotation.y = .38; root.add(b);
      const r = pen(0xd8343c, true); r.position.set(4.75, r.position.y, .4); r.rotation.y = 1.42; root.add(r);
    }
    Object.assign(root.userData, { top: PY, viewY: .4 });
    root.scale.setScalar(.98);
    return root;
  };
})();
