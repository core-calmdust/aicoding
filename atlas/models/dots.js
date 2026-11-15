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
     Table3D.dots = { notebook(game), pen(colour, capped), inkLine(), PW, PD, PY, … }
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
  function KL(X) {
    const makeNoise = X.makeNoise;
    return {
      paper(d, w, h, p) {
        const Nz = makeNoise(p.seed);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
          const v = (Nz(x / 3, y / 3, 2) - .5) * 9 + (Nz(x / 70, y / 70, 3) - .5) * 8 + (Math.random() - .5) * 4, i = (y * w + x) * 4;
          d[i] = 251 + v; d[i + 1] = 247 + v; d[i + 2] = 236 + v * .9; d[i + 3] = 255;
        }
      },
    };
  }
  // the heavy pixel loops live in KL() (self-contained): on the portal they run in a worker (atlas/texgen.js) and the
  // canvas fills a moment later; on the game pages (no texgen) right here, as before
  function paint(c, name, p, after, c2) {
    const TG = window.AtlasTexGen; if (TG) return TG.paint(c, KL, name, p, after, c2);
    const g = c.getContext('2d'), a = g.createImageData(c.width, c.height), b = c2 ? c2.getContext('2d').createImageData(c2.width, c2.height) : null;
    (KL.L || (KL.L = KL(X)))[name](a.data, c.width, c.height, p || {}, b && b.data, (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k.getContext('2d'); });
    g.putImageData(a, 0, 0); if (b) c2.getContext('2d').putImageData(b, 0, 0); if (after) after(g, c.width, c.height); return c;
  }
  const later = (deps, c, fn) => window.AtlasTexGen ? AtlasTexGen.later(deps, c, fn) : (fn(c.getContext('2d'), c.width, c.height), c);
  // the paper (pixel noise, then the printed ruling); then(c) draws on top once it is there
  function paperBase(c0, w, h, k, seed, then) { paint(c0.canvas, 'paper', { seed }, (c) => {
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
    if (then) then(c);
  }); }
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
      paperBase(c, w, h, k, game ? 3 : 9, game && (c => {
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
    }));
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
  function notebook(game, set) {
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
    const front = new TT.Mesh(pg, M({ map: !set || set === 'ballpoint' ? pageTex(game) : pageTex2('notebook', set, game), roughness: .82, bump: false })); front.receiveShadow = true; front.castShadow = true; g.add(front);
    const back = new TT.Mesh(pg, M({ map: pageTex(false), roughness: .85, bump: false, side: TT.BackSide })); back.receiveShadow = true; g.add(back);
    // the wire rings: one closed loop per punched hole — down through the hole in the pages (and the cover below),
    // round under the cover, up past the top edge of the block and back over into the same hole
    const wire = M({ color: 0xc9ccd2, metalness: .8, roughness: .28 });
    const hz = -PD / 2 + HZ, rz = .2, y0 = .006, y1 = PY + .06, ry = (y1 - y0) / 2;   // the loop's far side clears the cover edge (−PD/2 − .02)
    const lg = new TT.TorusGeometry(rz, .022, X.coarse ? 4 : 6, X.coarse ? 12 : 20); lg.rotateY(Math.PI / 2); lg.scale(1, ry / rz, 1);
    for (let i = 0; i < HOLES; i++) {
      const l = new TT.Mesh(lg, wire); l.position.set(holeX(i), y0 + ry, hz - rz); l.castShadow = true; l.receiveShadow = true; g.add(l);
    }
    g.userData.top = PY; g.userData.page = front;   // (page: the top sheet — table play draws the game on it)
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

  /* =====================================================================
     Six surfaces and six pairs of writing tools (2026-11-15).
       boards (atlas-dots-look):  notebook ノート（既定）· clipboard 方眼のクリップボード · slate 木枠の石盤 ·
                                  blueprint 製図台の青焼き · daifuku 大福帳 · whiteboard ホワイトボード
       tools  (atlas-dots-pc3):   ballpoint ボールペン（既定）· pencil 色鉛筆 · fountain 万年筆 · marker サインペン ·
                                  chalk チョーク · brush 筆
     Every surface keeps the notebook's page (PW × PD, top PY) so table play, the rules tour and the full game's skin
     draw the game on it the same way: surface() paints the paper and the dots, stroke() / boxMark() the ink.
     ===================================================================== */
  const LOOKS = ['notebook', 'clipboard', 'slate', 'blueprint', 'daifuku', 'whiteboard'];
  const SETS = ['ballpoint', 'pencil', 'fountain', 'marker', 'chalk', 'brush'];
  const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const curLook = () => { const v = lsGet('atlas-dots-look'); return LOOKS.includes(v) ? v : 'notebook'; };
  const curSet = () => { const v = lsGet('atlas-dots-pc3'); return SETS.includes(v) ? v : 'ballpoint'; };
  const isDark = look => look === 'slate' || look === 'blueprint';
  // each tool's red and blue: on paper / on a dark surface (lighter, so the line still reads)
  const INKS = {
    ballpoint: [[RED, BLUE], ['#ff7d84', '#86b4ff']],
    pencil: [['#c4373f', '#2f5fb5'], ['#f59aa2', '#a2c3ff']],
    fountain: [['#a3122a', '#1a2f8f'], ['#ff93a3', '#aab9ff']],
    marker: [['#e3263a', '#1c6fe2'], ['#ff6f7d', '#62b6ff']],
    chalk: [['#cf4c68', '#3a7cc6'], ['#f6a3b5', '#9fd0ff']],
    brush: [['#cf3a1c', '#22306b'], ['#ff8c66', '#93a9ff']],
  };
  const inkOf = (set, look) => INKS[SETS.includes(set) ? set : 'ballpoint'][isDark(look) ? 1 : 0];
  const SW = { ballpoint: .05, pencil: .05, fountain: .055, marker: .1, chalk: .085, brush: .09 };
  const strokeW = set => SW[set] || .05;

  /* ---------- painting helpers (page units: U(v) = v × pixels per unit) ---------- */
  // soft clouds painted small and scaled up (fast at any size), then a tiled grain
  function cloud(c, W, H, rgb, amp, sc, seed, tint) {
    const sw = Math.ceil(W / 6), sh = Math.ceil(H / 6), sm = document.createElement('canvas'); sm.width = sw; sm.height = sh;
    const g = sm.getContext('2d'), Nz = makeNoise(seed), img = g.createImageData(sw, sh), d = img.data, t = tint || [1, 1, 1];
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { const v = (Nz(x / sc, y / sc, 3) - .5) * amp, i = (y * sw + x) * 4; d[i] = rgb[0] + v * t[0]; d[i + 1] = rgb[1] + v * t[1]; d[i + 2] = rgb[2] + v * t[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); c.imageSmoothingEnabled = true; c.drawImage(sm, 0, 0, W, H);
  }
  const grainC = {};
  function grain(c, W, H, a0, a1) {
    const k = a0 + ',' + a1; let g = grainC[k];
    if (!g) { g = grainC[k] = document.createElement('canvas'); g.width = g.height = 256; const gc = g.getContext('2d'), gi = gc.createImageData(256, 256), gd = gi.data;
      for (let i = 0; i < 256 * 256; i++) { const v = Math.random() < .5 ? 0 : 255; gd[i * 4] = gd[i * 4 + 1] = gd[i * 4 + 2] = v; gd[i * 4 + 3] = a0 + Math.random() * (a1 - a0); } gc.putImageData(gi, 0, 0); }
    c.fillStyle = c.createPattern(g, 'repeat'); c.fillRect(0, 0, W, H);
  }
  // a speckled pattern in one colour (pencil grain, chalk): cover = share of pixels inked
  const patC = {};
  function speckle(c, col, cover, seed) {
    const k = col + cover; let g = patC[k];
    if (!g) { g = patC[k] = document.createElement('canvas'); g.width = g.height = 64; const gc = g.getContext('2d'), Nz = makeNoise(seed || 5), gi = gc.createImageData(64, 64), gd = gi.data, cc = new (T().Color)(col);
      const r = Math.round(cc.r * 255), gg = Math.round(cc.g * 255), b = Math.round(cc.b * 255);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const i = (y * 64 + x) * 4, v = Math.random() * .7 + Nz(x / 3, y / 3, 1) * .3; gd[i] = r; gd[i + 1] = gg; gd[i + 2] = b; gd[i + 3] = v < cover ? 255 * (.55 + Math.random() * .45) : 0; }
      gc.putImageData(gi, 0, 0); }
    return c.createPattern(g, 'repeat');
  }
  const rng = seed => { let q = seed; return () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); };
  const hz = (c, U, W, z, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(0, U(z)); c.lineTo(W, U(z)); c.stroke(); };
  const vt = (c, U, H, x, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(U(x), 0); c.lineTo(U(x), H); c.stroke(); };

  /* ---------- the surfaces: paper (or slate, board) and the dots ----------
     g = { dots: [[x, z], …] page units, sp: spacing, z0: first dot row, warm: the full game's warmer cream } */
  function surface(look, c, U, g) {
    const W = U(PW), H = U(PD), sp = g.sp, z0 = g.z0, x0 = g.dots.length ? g.dots[0][0] : PW / 2, R = rng(99);
    const rowsFrom = (step, top) => { const a = []; for (let z = z0 - Math.ceil((z0 - top) / step) * step; z < PD - .05; z += step) a.push(z); return a; };
    const colsFrom = step => { const a = []; for (let x = x0 - Math.ceil(x0 / step) * step; x < PW; x += step) a.push(x); return a; };
    if (look === 'clipboard') {   // graph paper: a 5-to-the-spacing grid (every second line a little stronger), the pad's gum along the top
      cloud(c, W, H, [246, 248, 241], 7, 12, 4, [1, 1, .9]); grain(c, W, H, 4, 11);
      const f = sp / 4;
      colsFrom(f).forEach((x, i) => vt(c, U, H, x, `rgba(70,150,120,${Math.abs((x - x0) / sp - Math.round((x - x0) / sp)) < .01 ? .42 : .2})`, Math.max(1, U(.011))));
      rowsFrom(f, .85).forEach(z => hz(c, U, W, z, `rgba(70,150,120,${Math.abs((z - z0) / sp - Math.round((z - z0) / sp)) < .01 ? .42 : .2})`, Math.max(1, U(.011))));
      c.fillStyle = '#f6f8f1'; c.fillRect(0, 0, W, U(.85));
      for (const [x, z] of g.dots) {   // graphite: a dull dark grey, a little grainy halo
        const px = U(x) + (R() - .5) * U(.015), pz = U(z) + (R() - .5) * U(.015);
        c.fillStyle = 'rgba(60,64,70,.28)'; c.beginPath(); c.arc(px, pz, U(.085), 0, 7); c.fill();
        c.fillStyle = '#3b3e45'; c.beginPath(); c.arc(px, pz, U(.06), 0, 7); c.fill();
      }
      return;
    }
    if (look === 'slate') {   // slate: dark grey-green, the clouds of chalk wiped off, faint scratched ruling
      cloud(c, W, H, [44, 52, 50], 14, 14, 21, [1, 1.05, 1]); grain(c, W, H, 3, 10);
      const N2 = makeNoise(8); c.globalAlpha = 1;
      for (let i = 0; i < 26; i++) { const x = R() * W, y = R() * H, r = U(.6 + R() * 1.6); const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(220,226,222,.07)'); gr.addColorStop(1, 'rgba(220,226,222,0)'); c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); }
      void N2;
      rowsFrom(sp / 2, .4).forEach(z => hz(c, U, W, z, 'rgba(190,200,196,.07)', Math.max(1, U(.012))));
      for (const [x, z] of g.dots) {   // chalk dots: a few overlapping specks
        const px = U(x), pz = U(z);
        for (let k = 0; k < 7; k++) { c.fillStyle = `rgba(240,242,236,${.35 + R() * .4})`; c.beginPath(); c.arc(px + (R() - .5) * U(.05), pz + (R() - .5) * U(.05), U(.035 + R() * .03), 0, 7); c.fill(); }
      }
      return;
    }
    if (look === 'blueprint') {   // a blueprint: Prussian blue, white grid, a double border and a small title block in the head
      cloud(c, W, H, [28, 76, 142], 16, 16, 31, [.6, .8, 1]); grain(c, W, H, 3, 9);
      const f = sp / 4;
      colsFrom(f).forEach(x => vt(c, U, H, x, `rgba(225,238,255,${Math.abs((x - x0) / sp - Math.round((x - x0) / sp)) < .01 ? .2 : .08})`, Math.max(1, U(.01))));
      rowsFrom(f, 0).forEach(z => hz(c, U, W, z, `rgba(225,238,255,${Math.abs((z - z0) / sp - Math.round((z - z0) / sp)) < .01 ? .2 : .08})`, Math.max(1, U(.01))));
      c.strokeStyle = 'rgba(235,244,255,.75)'; c.lineWidth = U(.02); c.strokeRect(U(.25), U(.25), W - U(.5), H - U(.5));
      c.lineWidth = U(.01); c.strokeRect(U(.33), U(.33), W - U(.66), H - U(.66));
      c.fillStyle = 'rgba(28,76,142,.92)'; c.fillRect(U(4.9), U(.42), U(2.3), U(.8)); c.strokeStyle = 'rgba(235,244,255,.8)'; c.lineWidth = U(.012); c.strokeRect(U(4.9), U(.42), U(2.3), U(.8));
      c.beginPath(); c.moveTo(U(4.9), U(.82)); c.lineTo(U(7.2), U(.82)); c.moveTo(U(6.3), U(.82)); c.lineTo(U(6.3), U(1.22)); c.stroke();
      c.fillStyle = 'rgba(235,244,255,.85)'; c.font = `600 ${U(.17)}px "Helvetica Neue",Arial,sans-serif`; c.textBaseline = 'middle';
      c.fillText('DOTS & BOXES', U(5.02), U(.62)); c.font = `500 ${U(.12)}px "Helvetica Neue",Arial,sans-serif`; c.fillText('SHEET 1 / 1', U(5.02), U(1.02)); c.fillText('1 : 1', U(6.42), U(1.02)); c.textBaseline = 'alphabetic';
      for (const [x, z] of g.dots) {   // drafted points: a small ring with a cross through it
        const px = U(x), pz = U(z);
        c.strokeStyle = 'rgba(240,247,255,.9)'; c.lineWidth = U(.016); c.beginPath(); c.arc(px, pz, U(.055), 0, 7); c.stroke();
        c.lineWidth = U(.009); c.beginPath(); c.moveTo(px - U(.11), pz); c.lineTo(px + U(.11), pz); c.moveTo(px, pz - U(.11)); c.lineTo(px, pz + U(.11)); c.stroke();
        c.fillStyle = 'rgba(240,247,255,.95)'; c.beginPath(); c.arc(px, pz, U(.018), 0, 7); c.fill();
      }
      return;
    }
    if (look === 'daifuku') {   // washi: warm, with fibres; a vermilion grid on the dots; sumi dots with a little bleed
      cloud(c, W, H, [247, 240, 224], 10, 9, 41, [1, 1, .85]); grain(c, W, H, 4, 12);
      for (let i = 0; i < 520; i++) { const x = R() * W, y = R() * H, l = U(.08 + R() * .35), a = R() * 7; c.strokeStyle = `rgba(${R() < .5 ? '255,255,250' : '170,150,120'},${.12 + R() * .2})`; c.lineWidth = Math.max(1, U(.006)); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * l * .5 + U(.05), y + Math.sin(a) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke(); }
      colsFrom(sp).forEach(x => vt(c, U, H, x, 'rgba(206,70,50,.28)', Math.max(1, U(.013))));
      rowsFrom(sp, 1.0).forEach(z => hz(c, U, W, z, 'rgba(206,70,50,.28)', Math.max(1, U(.013))));
      c.strokeStyle = 'rgba(206,70,50,.45)'; c.lineWidth = U(.02); c.strokeRect(U(.3), U(1.0), W - U(.6), H - U(1.3));
      for (const [x, z] of g.dots) {
        const px = U(x) + (R() - .5) * U(.02), pz = U(z) + (R() - .5) * U(.02);
        c.fillStyle = 'rgba(30,26,24,.16)'; c.beginPath(); c.arc(px, pz, U(.12), 0, 7); c.fill();
        c.fillStyle = '#1e1a18'; c.beginPath(); c.ellipse(px, pz, U(.08), U(.072), R() * 3, 0, 7); c.fill();
      }
      return;
    }
    if (look === 'whiteboard') {   // a whiteboard: white with a soft sheen and the ghosts of wiped-off marker
      c.fillStyle = '#f7f8f9'; c.fillRect(0, 0, W, H);
      const gr = c.createLinearGradient(0, 0, W, H); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.45, 'rgba(225,230,236,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const x = R() * W, y = R() * H; c.strokeStyle = `rgba(${R() < .5 ? '90,100,120' : '150,90,90'},.028)`; c.lineWidth = U(.15 + R() * .3); c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + U(R() * 2 - 1), y + U(R() * 2 - 1), x + U(R() * 3 - 1.5), y + U(R() * 1.2 - .6)); c.stroke(); }
      for (const [x, z] of g.dots) { const px = U(x), pz = U(z); c.fillStyle = '#1b1d22'; c.beginPath(); c.arc(px, pz, U(.075), 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.arc(px - U(.02), pz - U(.025), U(.022), 0, 7); c.fill(); }
      return;
    }
    // notebook: cream paper, faint blue ruling every half spacing, a red margin, the printed head, the punched holes, hand-inked dots
    cloud(c, W, H, [251, 247, 236], 9, 12, 3, [1, 1, .9]); grain(c, W, H, 5, 14);
    if (g.warm) { c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgba(255,236,205,1)'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
    rowsFrom(sp / 2, 1.1).forEach(z => hz(c, U, W, z, 'rgba(80,130,200,.3)', Math.max(1, U(.014))));
    c.strokeStyle = 'rgba(214,80,90,.4)'; c.lineWidth = U(.016); c.beginPath(); c.moveTo(U(.75), U(.75)); c.lineTo(U(.75), H); c.stroke();
    c.fillStyle = 'rgba(70,110,170,.55)'; c.font = `600 ${U(.17)}px "Helvetica Neue",Arial,sans-serif`;
    c.fillText('No.', U(4.3), U(.98)); c.fillText('Date', U(5.6), U(.98));
    c.strokeStyle = 'rgba(70,110,170,.5)'; c.lineWidth = U(.01); c.beginPath(); c.moveTo(U(4.62), U(1)); c.lineTo(U(5.45), U(1)); c.moveTo(U(6.05), U(1)); c.lineTo(U(7.2), U(1)); c.stroke();
    for (let i = 0; i < HOLES; i++) { const x = holeX(i) + PW / 2; c.beginPath(); c.arc(U(x), U(.32), U(.085), 0, 7); c.fillStyle = '#2a2c33'; c.fill(); }
    for (const [x, z] of g.dots) {
      const px = U(x) + (R() - .5) * U(.02), pz = U(z) + (R() - .5) * U(.02);
      c.fillStyle = 'rgba(35,37,44,.3)'; c.beginPath(); c.arc(px, pz, U(.095), 0, 7); c.fill();
      c.fillStyle = '#23252c'; c.beginPath(); c.ellipse(px, pz, U(.072), U(.066), R() * 3, 0, 7); c.fill();
    }
  }

  /* ---------- the ink: one line (st = the hand-drawn curve: x1 z1 → cx cz → x2 z2, w, jitter j) ---------- */
  const qp = (st, k) => { const u = 1 - k; return [u * u * st.x1 + 2 * u * k * st.cx + k * k * st.x2, u * u * st.z1 + 2 * u * k * st.cz + k * k * st.z2]; };
  function ribbonPath(c, st, U, wf) {   // a filled band along the curve, width wf(k) (page units)
    const n = 28, L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, [x, z] = qp(st, k), [xa, za] = qp(st, Math.max(0, k - .01)), [xb, zb] = qp(st, Math.min(1, k + .01));
      const dx = xb - xa, dz = zb - za, l = Math.hypot(dx, dz) || 1, w = wf(k) / 2, nx = -dz / l * w, nz = dx / l * w;
      L.push([U(x + nx), U(z + nz)]); Rr.push([U(x - nx), U(z - nz)]);
    }
    c.beginPath(); c.moveTo(L[0][0], L[0][1]); L.forEach(p => c.lineTo(p[0], p[1])); for (let i = Rr.length - 1; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]); c.closePath();
  }
  const curve = (c, st, U, ox = 0, oz = 0) => { c.beginPath(); c.moveTo(U(st.x1) + ox, U(st.z1) + oz); c.quadraticCurveTo(U(st.cx) + ox, U(st.cz) + oz, U(st.x2) - ox, U(st.z2) - oz); };
  function stroke(set, c, st, col, U) {
    const w = st.w; c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    if (set === 'pencil') {   // coloured pencil: grainy, two passes a hair apart
      c.strokeStyle = speckle(c, col, .75, 7);
      for (let p = 0; p < 3; p++) { c.globalAlpha = p ? .55 : .9; c.lineWidth = U(w) * (p ? .6 : 1); curve(c, st, U, p ? U(st.j[0]) * (p === 1 ? 1 : -1) : 0, p ? U(st.j[1]) * (p === 1 ? 1 : -1) : 0); c.stroke(); }
    } else if (set === 'fountain') {   // fountain pen: wet ink, a little wider in the middle, darker where it pooled at the end
      c.fillStyle = col; c.globalAlpha = .88; ribbonPath(c, st, U, k => w * (.7 + .5 * Math.sin(Math.PI * k))); c.fill();
      c.globalAlpha = .35; c.strokeStyle = col; c.lineWidth = U(w) * .22; ribbonPath(c, st, U, k => w * (.7 + .5 * Math.sin(Math.PI * k))); c.stroke();
      c.globalAlpha = .55; c.beginPath(); c.arc(U(st.x2), U(st.z2), U(w) * .62, 0, 7); c.fill();
    } else if (set === 'marker') {   // felt tip: broad and even, the ink a touch denser where the tip rested
      c.strokeStyle = col; c.globalAlpha = .84; c.lineWidth = U(w); curve(c, st, U); c.stroke();
      c.fillStyle = col; c.globalAlpha = .3; for (const [x, z] of [[st.x1, st.z1], [st.x2, st.z2]]) { c.beginPath(); c.arc(U(x), U(z), U(w) * .5, 0, 7); c.fill(); }
    } else if (set === 'chalk') {   // chalk: dusty, broken, a few crumbs beside the line
      c.strokeStyle = speckle(c, col, .5, 13);
      for (let p = 0; p < 2; p++) { c.globalAlpha = p ? .6 : .95; c.lineWidth = U(w) * (p ? .7 : 1); curve(c, st, U, p ? U(st.j[0]) : 0, p ? U(st.j[1]) : 0); c.stroke(); }
      c.fillStyle = col; const r = rng(Math.round((st.x1 + st.z1 * 7) * 1000)); for (let i = 0; i < 6; i++) { const [x, z] = qp(st, r()); c.globalAlpha = .35 + r() * .3; c.beginPath(); c.arc(U(x + (r() - .5) * w * 2.4), U(z + (r() - .5) * w * 2.4), U(w * (.06 + r() * .08)), 0, 7); c.fill(); }
    } else if (set === 'brush') {   // brush: pressed down at the start, a full belly, lifted off to a tail
      const wf = k => w * (k < .1 ? .75 + k / .1 * .4 : 1.15 - .8 * Math.pow((k - .1) / .9, 2.2));
      c.fillStyle = col; c.globalAlpha = .9; ribbonPath(c, st, U, wf); c.fill();
      c.globalAlpha = .25; ribbonPath(c, st, U, k => wf(k) * .55); c.fill();
      c.globalAlpha = .85; c.beginPath(); c.arc(U(st.x1), U(st.z1), U(w) * .58, 0, 7); c.fill();
    } else {   // ballpoint: drawn twice with a little offset (pressure varies), an ink blob where the pen started
      c.strokeStyle = col;
      for (let p = 0; p < 2; p++) { c.globalAlpha = p ? .5 : .92; c.lineWidth = U(w) * (p ? .55 : 1); curve(c, st, U, p ? U(st.j[0]) : 0, p ? U(st.j[1]) : 0); c.stroke(); }
      c.globalAlpha = .8; c.fillStyle = col; c.beginPath(); c.arc(U(st.x1), U(st.z1), U(w) * .62, 0, 7); c.fill();
    }
    c.restore();
  }
  // a closed box (inside the clip x0 y0 sz in canvas pixels): hatching in the tool's own line, or a wash for marker / brush
  function boxMark(set, c, x0, y0, sz, col, rr, U, faint) {
    c.save(); c.beginPath(); c.rect(x0 + U(.08), y0 + U(.08), sz - U(.16), sz - U(.16)); c.clip();
    if (set === 'marker' || set === 'brush') {
      c.fillStyle = col; c.globalAlpha = (faint ? .07 : .15); c.fillRect(x0, y0, sz, sz);
      if (set === 'brush') { c.globalAlpha = faint ? .05 : .1; c.beginPath(); c.ellipse(x0 + sz * (.45 + rr() * .1), y0 + sz * (.5 + rr() * .1), sz * .4, sz * .32, rr() * 3, 0, 7); c.fill(); }
    } else {
      c.strokeStyle = set === 'pencil' || set === 'chalk' ? speckle(c, col, set === 'chalk' ? .5 : .62, set === 'chalk' ? 13 : 7) : col;
      c.globalAlpha = (faint ? .5 : 1) * (set === 'chalk' ? .45 : set === 'pencil' ? .4 : .24); c.lineWidth = U(set === 'chalk' ? .035 : .022);
      const gap = U(Math.max(.11, sz / U(1) * .11));
      for (let t = -sz; t < sz * 2; t += gap) { c.beginPath(); c.moveTo(x0 + t + (rr() - .5) * U(.03), y0); c.lineTo(x0 + t - sz + (rr() - .5) * U(.03), y0 + sz); c.stroke(); }
    }
    c.restore();
  }

  /* ---------- the boards: each one a group with the page (userData.page) at height PY ---------- */
  const flatPage = (g, look, set, game, mat) => {
    const TT = T(), pg = new TT.PlaneGeometry(PW, PD); pg.rotateX(-Math.PI / 2); pg.translate(0, PY, 0);
    const m = new TT.Mesh(pg, M(Object.assign({ map: pageTex2(look, set, game), roughness: .85, bump: false }, mat || {}))); m.receiveShadow = true; g.add(m);
    g.userData.top = PY; g.userData.page = m; return m;
  };
  const box = (g, w, h, d, mat, x, y, z, r) => { const TT = T(), m = new TT.Mesh(r ? RB(w, h, d, r, 2) : new TT.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  const tex = (key, w, h, f, rep) => X.canvasTex(key, w, h, f, rep);
  // plain materials with a little texture: wood with grain, masonite, felt…
  function woodTex(key, rgb, amp, streak) {
    return tex(key, 512, 512, (c, w, h) => {
      const Nz = makeNoise(key.length * 7 + 3), img = c.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (Nz(x / 90, y / 6, 3) - .5) * amp + Math.sin((y + Nz(x / 40, y / 40, 2) * 60) / streak) * amp * .35 + (Math.random() - .5) * 6, i = (y * w + x) * 4; d[i] = rgb[0] + v; d[i + 1] = rgb[1] + v * .85; d[i + 2] = rgb[2] + v * .6; d[i + 3] = 255; }
      c.putImageData(img, 0, 0);
    }, 1);
  }
  function plainTex(key, rgb, amp, sc) {
    return tex(key, 256, 256, (c, w, h) => { const Nz = makeNoise(key.length * 5 + 1), img = c.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (Nz(x / sc, y / sc, 2) - .5) * amp + (Math.random() - .5) * amp * .4, i = (y * w + x) * 4; d[i] = rgb[0] + v; d[i + 1] = rgb[1] + v; d[i + 2] = rgb[2] + v; d[i + 3] = 255; }
      c.putImageData(img, 0, 0); }, 2);
  }
  function board(look, game) {
    if (!LOOKS.includes(look)) look = 'notebook';
    const set = curSet();
    if (look === 'notebook') return notebook(game, set);
    const TT = T(), g = new TT.Group();
    if (look === 'clipboard') {
      const mason = M({ map: plainTex('dtMason', [112, 76, 46], 22, 3), roughness: .7, bumpScale: .003 });
      box(g, PW + .8, .07, PD + 1.35, mason, 0, .035, -.25, .1);
      const edge = M({ map: edgeTex(), roughness: .9, bump: false });
      const blk = new TT.Mesh(new TT.BoxGeometry(PW, PY - .07, PD), [edge, edge, M({ color: 0xf3f5ee }), edge, edge, edge]); blk.position.y = .07 + (PY - .07) / 2; blk.castShadow = blk.receiveShadow = true; g.add(blk);
      flatPage(g, look, set, game);
      box(g, PW + .01, .02, .26, M({ color: 0x7a2a22, roughness: .6 }), 0, PY + .009, -PD / 2 + .13);   // the pad's gum
      const chrome = M({ color: 0xd2d5da, metalness: .85, roughness: .25 });
      box(g, 3.2, .04, .95, chrome, 0, PY + .05, -PD / 2 + .32, .02);                                   // the clip's jaw
      const hinge = new TT.Mesh(new TT.CylinderGeometry(.11, .11, 3.2, 14), chrome); hinge.rotation.z = Math.PI / 2; hinge.position.set(0, PY - .02, -PD / 2 - .2); hinge.castShadow = true; g.add(hinge);
      box(g, 3.2, .03, .5, chrome, 0, .12, -PD / 2 - .52, .02);                                          // the base plate
      const ring = new TT.Mesh(new TT.TorusGeometry(.42, .035, 8, 28, Math.PI), chrome); ring.rotation.x = -Math.PI / 2 + .5; ring.position.set(0, PY + .05, -PD / 2 - .2); ring.castShadow = true; g.add(ring);
      for (const x of [-1.2, 1.2]) { const r = new TT.Mesh(new TT.CylinderGeometry(.06, .06, .03, 10), chrome); r.position.set(x, .14, -PD / 2 - .62); g.add(r); }
    } else if (look === 'slate') {
      box(g, PW, PY, PD, M({ color: 0x2c3431, roughness: .9 }), 0, PY / 2, 0);
      flatPage(g, look, set, game, { roughness: .92 });
      const wood = M({ map: woodTex('dtFrame', [176, 128, 82], 26, 5), roughness: .6, bumpScale: .006 }), F = .44, FH = PY + .08;
      box(g, PW + F * 2, FH, F, wood, 0, FH / 2, -PD / 2 - F / 2, .06); box(g, PW + F * 2, FH, F, wood, 0, FH / 2, PD / 2 + F / 2, .06);
      box(g, F, FH, PD, wood, -PW / 2 - F / 2, FH / 2, 0, .06); box(g, F, FH, PD, wood, PW / 2 + F / 2, FH / 2, 0, .06);
      const iron = M({ color: 0x3a3632, metalness: .6, roughness: .5 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const n = new TT.Mesh(new TT.CylinderGeometry(.035, .035, .02, 8), iron); n.position.set(sx * (PW / 2 + F / 2), FH + .005, sz * (PD / 2 + F / 2)); g.add(n); }
      const hole = new TT.Mesh(new TT.CylinderGeometry(.07, .07, .02, 12), M({ color: 0x1a1612 })); hole.position.set(0, FH + .003, -PD / 2 - F / 2); g.add(hole);
    } else if (look === 'blueprint') {
      const birch = M({ map: woodTex('dtBirch', [214, 186, 146], 16, 9), roughness: .55, bumpScale: .003 });
      box(g, PW + 1.8, PY - .006, PD + 1.6, birch, 0, (PY - .006) / 2, .05, .05);
      flatPage(g, look, set, game, { roughness: .8 });
      const alu = M({ color: 0xb9bec6, metalness: .75, roughness: .32 });
      box(g, PW + 1.8, .06, .16, alu, 0, PY + .025, PD / 2 + .62, .02);                                  // the parallel rule
      for (const x of [-(PW + 1.8) / 2 + .1, (PW + 1.8) / 2 - .1]) { const p = new TT.Mesh(new TT.CylinderGeometry(.09, .09, .1, 14), M({ color: 0x2b2d31, roughness: .5 })); p.position.set(x, PY + .04, PD / 2 + .62); g.add(p); }
      const tape = M({ color: 0xe9dcb4, roughness: .8, transparent: true, opacity: .9 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const t = box(g, .95, .006, .3, tape, sx * (PW / 2 - .05), PY + .004, sz * (PD / 2 - .05)); t.rotation.y = sx * sz * Math.PI / 4; t.castShadow = false; }
    } else if (look === 'daifuku') {
      const kraft = M({ map: plainTex('dtKraft', [150, 108, 64], 20, 4), roughness: .85, bumpScale: .003 });
      box(g, PW + .14, CB, PD + .12, kraft, 0, CB / 2, .02, .02);
      const edge = M({ map: tex('dtWashiEdge', 64, 256, (c, w, h) => { c.fillStyle = '#efe6d2'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(150,130,100,${.1 + Math.random() * .2})`; c.fillRect(0, y, w, 1); } }), roughness: .95, bump: false });
      const blk = new TT.Mesh(new TT.BoxGeometry(PW - .02, BLK, PD - .02), [edge, edge, M({ color: 0xf2eadb }), edge, edge, edge]); blk.position.y = CB + BLK / 2; blk.castShadow = blk.receiveShadow = true; g.add(blk);
      flatPage(g, look, set, game, { roughness: .95 });
      // the cover band over the binding: kraft with a paper label 大福帳
      const band = tex('dtBand', 1024, 128, (c, w, h) => {
        const Nz = makeNoise(17), img = c.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (Nz(x / 4, y / 4, 2) - .5) * 22 + (Math.random() - .5) * 8, i = (y * w + x) * 4; d[i] = 128 + v; d[i + 1] = 84 + v * .8; d[i + 2] = 46 + v * .6; d[i + 3] = 255; }
        c.putImageData(img, 0, 0);
        c.fillStyle = '#f1e7cf'; c.fillRect(w * .36, h * .14, w * .28, h * .72); c.strokeStyle = 'rgba(120,40,30,.6)'; c.lineWidth = 3; c.strokeRect(w * .37, h * .2, w * .26, h * .6);
        c.fillStyle = '#1d1a17'; c.font = `700 ${h * .5}px "Yu Mincho","Hiragino Mincho ProN","Noto Serif JP","Noto Serif CJK JP",serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('大福帳', w / 2, h * .53);
      });
      const bandM = M({ map: band, roughness: .8, bump: false }), side = M({ color: 0x7b5232, roughness: .85 });
      const bd = new TT.Mesh(new TT.BoxGeometry(PW + .14, .05, 1.0), [side, side, bandM, side, side, side]); bd.position.set(0, PY + .025, -PD / 2 + .48); bd.castShadow = bd.receiveShadow = true; g.add(bd);
      const hemp = M({ color: 0xcfa86c, roughness: .9 });
      const lg = new TT.TorusGeometry(.2, .035, 6, 18); lg.rotateY(Math.PI / 2); lg.scale(1, (PY + .1) / .4, 1);
      for (const x of [-1.9, 1.9]) {
        const l = new TT.Mesh(lg, hemp); l.position.set(x, (PY + .1) / 2, -PD / 2 + .33 - .2); l.castShadow = true; g.add(l);
        const k = new TT.Mesh(new TT.SphereGeometry(.075, 10, 8), hemp); k.position.set(x, PY + .08, -PD / 2 + .33); k.castShadow = true; g.add(k);
      }
    } else if (look === 'whiteboard') {
      box(g, PW, PY, PD, M({ color: 0xe9ecef, roughness: .5 }), 0, PY / 2, 0);
      flatPage(g, look, set, game, { roughness: .22, clearcoat: .6, clearcoatRoughness: .15 });
      const alu = M({ color: 0xc3c8cf, metalness: .8, roughness: .3 }), F = .22, FH = PY + .06;
      box(g, PW + F * 2, FH, F, alu, 0, FH / 2, -PD / 2 - F / 2, .03); box(g, PW + F * 2, FH, F, alu, 0, FH / 2, PD / 2 + F / 2, .03);
      box(g, F, FH, PD, alu, -PW / 2 - F / 2, FH / 2, 0, .03); box(g, F, FH, PD, alu, PW / 2 + F / 2, FH / 2, 0, .03);
      const cap = M({ color: 0x5a5f68, roughness: .5 });
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, F + .08, FH + .03, F + .08, cap, sx * (PW / 2 + F / 2), (FH + .03) / 2, sz * (PD / 2 + F / 2), .04);
      // the eraser beside the board: a plastic back, a felt pad
      const er = new TT.Group(); box(er, 1.3, .07, .55, M({ color: 0x3d4148, roughness: .95 }), 0, .035, 0, .02); box(er, 1.3, .26, .55, M({ color: 0x2f6fb8, roughness: .4 }), 0, .2, 0, .08);
      er.position.set(PW / 2 + 1.25, 0, -PD / 2 + 1.6); er.rotation.y = .25; g.add(er);
    }
    return g;
  }

  /* ---------- the tools: lying along x, the tip at x = −1.695 (as the ballpoint), resting on the table ---------- */
  function tool(set, who, look, capped) {
    if (!SETS.includes(set)) set = 'ballpoint';
    const col = inkOf(set, 'notebook')[who];   // (the body keeps the paper colour; the ink on a dark board is the lighter one)
    if (set === 'ballpoint') return pen(new (T().Color)(col).getHex(), !!capped);
    const TT = T(), g = new TT.Group(), n = X.coarse ? 8 : 12;
    const cyl = (r1, r2, len, m, x, seg) => { const c = new TT.Mesh(new TT.CylinderGeometry(r1, r2, len, seg || n), m); c.rotation.z = Math.PI / 2; c.position.x = x; c.castShadow = true; c.receiveShadow = true; g.add(c); return c; };
    let R = .12;
    if (set === 'pencil') {   // a hexagonal coloured pencil: lacquered body, sharpened wood, the coloured lead
      R = .105; const body = M({ color: col, roughness: .35, clearcoat: .5, clearcoatRoughness: .3 }), wood = M({ color: 0xe0bf8e, roughness: .8 }), lead = M({ color: col, roughness: .6 });
      cyl(R, R, 2.7, body, .25, 6); cyl(.03, R * .98, .5, wood, -1.35, 6); cyl(.004, .03, .095, lead, -1.6475);
      cyl(R * 1.01, R * 1.01, .05, M({ color: 0xd8b25a, metalness: .7, roughness: .35 }), 1.35, 6); cyl(R * .99, R * .99, .02, M({ color: 0x1d1d1f }), 1.6, 6);
    } else if (set === 'fountain') {   // a fountain pen: deep lacquer barrel, gold rings and clip, black section, a gold nib
      R = .13; const lac = M({ color: new TT.Color(col).multiplyScalar(.75).getHex(), roughness: .18, clearcoat: 1, clearcoatRoughness: .05 }), gold = M({ color: 0xd9b45a, metalness: .9, roughness: .22 }), blk = M({ color: 0x141416, roughness: .3, clearcoat: .6 });
      cyl(R, R * .92, 1.6, lac, .2); cyl(R * .82, R * .7, .55, blk, -.87);
      const nib = cyl(.006, .085, .5, gold, -1.445); nib.scale.set(1, 1, .35);
      cyl(R * 1.12, R * 1.12, .95, lac, 1.25); cyl(R * 1.14, R * 1.14, .05, gold, .8); cyl(R * 1.14, R * 1.14, .03, gold, 1.64); cyl(R * .9, R * .6, .12, lac, 1.78);
      const clip = new TT.Mesh(new TT.BoxGeometry(.75, .03, .06), gold); clip.position.set(1.32, R * 1.12 + .03, 0); clip.castShadow = true; g.add(clip);
    } else if (set === 'marker') {   // a felt-tip marker: white barrel, coloured cap posted on the end, a bullet tip
      R = .16; const white = M({ color: 0xf2f3f4, roughness: .45 }), cc = M({ color: col, roughness: .35, clearcoat: .4 });
      cyl(R, R, 2.0, white, -.05); cyl(.07, R, .35, white, -1.225); cyl(.032, .06, .22, cc, -1.51); cyl(.06, .06, .02, cc, -1.4);
      cyl(R * 1.1, R * 1.1, 1.0, cc, 1.2); cyl(R * 1.1, R * .8, .1, cc, 1.75); cyl(R * 1.02, R * 1.02, .3, cc, -.75);
      const clip = new TT.Mesh(new TT.BoxGeometry(.7, .035, .08), cc); clip.position.set(1.25, R * 1.1 + .03, 0); clip.castShadow = true; g.add(clip);
    } else if (set === 'chalk') {   // a stick of coloured chalk in a brass holder (knurled), worn round at the tip
      R = .1; const brass = M({ color: 0xc9a24e, metalness: .85, roughness: .35 }), ch = M({ color: col, roughness: .95 });
      cyl(R, R, 2.2, brass, .45); for (let i = 0; i < 6; i++) cyl(R * 1.04, R * 1.04, .04, brass, .9 + i * .1, 10);
      cyl(R * .7, R, .26, brass, -.78); cyl(.065, .065, .5, ch, -1.16);
      const tip = new TT.Mesh(new TT.SphereGeometry(.065, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), ch); tip.rotation.z = Math.PI / 2; tip.position.x = -1.41; tip.scale.set(1, 4.2, 1); g.add(tip);
    } else if (set === 'brush') {   // a brush: bamboo shaft with nodes, a coloured collar, the hair tuft wet with ink
      R = .09; const bam = M({ color: 0xc9a868, roughness: .5, clearcoat: .3 }), node = M({ color: 0x9a7a45, roughness: .55 }), collar = M({ color: col, roughness: .3, clearcoat: .6 }), hair = M({ color: new TT.Color(col).multiplyScalar(.55).getHex(), roughness: .45 });
      cyl(R, R * .95, 2.6, bam, .35); for (const x of [-.25, .65, 1.5]) cyl(R * 1.08, R * 1.08, .05, node, x);
      cyl(R * 1.1, R * 1.1, .2, collar, -1.0);
      const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push(new TT.Vector2(Math.max(.002, R * 1.05 * Math.sin(Math.PI * (.12 + .88 * Math.pow(1 - k, .9)) / 1.12) * (1 - k * .2)), -k * .62)); }
      const tuft = new TT.Mesh(new TT.LatheGeometry(pts, n), hair); tuft.rotation.z = -Math.PI / 2; tuft.position.x = -1.075; tuft.castShadow = true; g.add(tuft);
      const loop = new TT.Mesh(new TT.TorusGeometry(.09, .015, 6, 14), M({ color: 0xb53a2a, roughness: .7 })); loop.position.set(1.72, 0, 0); g.add(loop);
    }
    g.position.y = R * (set === 'marker' ? 1.1 : 1); return g;
  }

  /* ---------- the page texture of a board (the showcase: a game in progress) ---------- */
  function pageTex2(look, set, game) {
    const s = X.texScale(), w = Math.round(2048 * s), h = Math.round(w * PD / PW), k = w / PW, U = v => v * k;
    return X.canvasTex('dtP2' + look + (game ? set : '') + s, w, h, (c) => {
      const X0 = PW / 2 - (N - 1) * SP / 2, Z0 = PD / 2 + GZ - (N - 1) * SP / 2, dots = [];
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) dots.push([X0 + i * SP, Z0 + j * SP]);
      surface(look, c, U, { dots, sp: SP, z0: Z0 });
      if (!game) return;
      const INK = inkOf(set, look), rnd = rng(77), px = i => X0 + i * SP, pz = j => Z0 + j * SP;
      for (const [r, cc, o] of BOXES) {
        boxMark(set, c, U(px(cc)), U(pz(r)), U(SP), INK[o], rnd, U);
        c.save(); c.translate(U(px(cc) + SP / 2), U(pz(r) + SP / 2 + .04)); c.rotate((rnd() - .5) * .3); c.globalAlpha = .9; c.fillStyle = INK[o];
        c.font = `italic 700 ${U(.56)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o ? 'B' : 'R', 0, 0); c.restore();
      }
      const seen = new Set(), L = [], add = (kd, r, cc, col) => { const key = kd + r + ',' + cc; if (seen.has(key)) return; seen.add(key); L.push([kd, r, cc, col]); };
      BOXES.forEach(([r, cc, o], i) => [['h', r, cc], ['h', r + 1, cc], ['v', r, cc], ['v', r, cc + 1]].forEach((sd, j) => add(...sd, j === (i % 4) ? o : (i + j) % 2)));
      EXTRA.forEach(e => add(...e));
      for (const [kd, r, cc, col] of L) {
        const a = .11; let x1 = px(cc), z1 = pz(r), x2 = kd === 'h' ? px(cc + 1) : x1, z2 = kd === 'h' ? z1 : pz(r + 1);
        if (kd === 'h') { x1 += a; x2 -= a; } else { z1 += a; z2 -= a; }
        if (rnd() < .5) [x1, z1, x2, z2] = [x2, z2, x1, z1];
        const Lg = Math.hypot(x2 - x1, z2 - z1), bow = (rnd() - .5) * Lg * .06;
        stroke(set, c, { x1, z1, x2, z2, cx: (x1 + x2) / 2 - (z2 - z1) / Lg * bow, cz: (z1 + z2) / 2 + (x2 - x1) / Lg * bow, w: strokeW(set), j: [(rnd() - .5) * .03, (rnd() - .5) * .03] }, INK[col], U);
      }
      c.font = `italic 700 ${U(.34)}px "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE",cursive`; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
      const sr = BOXES.filter(b => !b[2]).length, sb = BOXES.length - sr;
      c.fillStyle = INK[0]; c.fillText('R  ' + 'I'.repeat(sr), U(1.1), U(1.6)); c.fillStyle = INK[1]; c.fillText('B  ' + 'I'.repeat(sb), U(3.6), U(1.6));
    });
  }

  X.dots = { notebook, pen, inkLine, PW, PD, PY, N, SP, GZ, RED, BLUE, HOLES, holeX,   // (for table play)
    LOOKS, SETS, curLook, curSet, board, tool, surface, stroke, boxMark, inkOf, strokeW, dark: isDark };
  X.MODELS.dots = function (live) {
    const TT = T(), root = new TT.Group(), look = curLook(), set = curSet(), nb = board(look, !live);
    nb.rotation.y = .06; nb.position.set(-.5, 0, 0); root.add(nb);
    if (!live) {
      // the blue pen rests on the page (uncapped, cap posted), the red one lies on the table beside the notebook
      const b = tool(set, 1, look, false); b.position.set(.2, PY + b.position.y, 2.75); b.rotation.y = .38; root.add(b);
      const r = tool(set, 0, look, true); r.position.set(4.75, r.position.y, .4); r.rotation.y = 1.42; root.add(r);
    }
    Object.assign(root.userData, { top: PY, viewY: .4 });
    root.scale.setScalar(.98);
    return root;
  };
})();
