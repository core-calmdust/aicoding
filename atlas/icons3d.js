/* =====================================================================
   World Board Game Atlas — deformed (chunky, toy-like) 3D pieces & icon scenes.
   Only used by atlas/tools/icons.html to pre-render images/atlas/*.webp:
     PIECES[name]()  one symbolic piece      → images/atlas/p-<name>.webp (title screen props)
     ICONS[gameId]() the game's icon scene   → images/atlas/<gameId>.webp
   Each icon = the game's signature piece, big and exaggerated, on a tiny
   board fragment (2–4 lines/squares only).
   ===================================================================== */
(function () {
  'use strict';
  const T = THREE, X = Table3D, M = X.M, mesh = X.mesh;
  const C = (hex, o) => M(Object.assign({ color: hex, roughness: .42 }, o || {}));
  const gloss = (hex) => C(hex, { roughness: .22 });

  /* ---------- chunky primitives ---------- */
  function rbox(w, h, d, r, mat) {          // rounded box (extruded rounded rect + bevel)
    r = Math.min(r, w / 2, d / 2);
    const s = new T.Shape(), x = -w / 2 + r, z = -d / 2 + r, W = w - 2 * r, D = d - 2 * r;
    s.moveTo(x, z); s.lineTo(x + W, z); s.quadraticCurveTo(x + W + r, z, x + W + r, z + r);
    s.lineTo(x + W + r, z + D); s.quadraticCurveTo(x + W + r, z + D + r, x + W, z + D + r);
    s.lineTo(x, z + D + r); s.quadraticCurveTo(x - r, z + D + r, x - r, z + D); s.lineTo(x - r, z + r); s.quadraticCurveTo(x - r, z, x, z);
    const bv = Math.min(r * .8, h / 2.2);
    const g = new T.ExtrudeGeometry(s, { depth: h - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv * .9, bevelSegments: 5, curveSegments: 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0); g.computeVertexNormals();
    return mesh(g, mat);
  }
  function puck(r, h, mat, round = .45) {   // fat rounded disc
    const pts = [], s = 14, rr = h * round;
    pts.push(new T.Vector2(0, 0));
    for (let i = 0; i <= s; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / s; pts.push(new T.Vector2(r - rr + Math.cos(a) * rr, rr + Math.sin(a) * rr)); }
    for (let i = 0; i <= s; i++) { const a = Math.PI / 2 * i / s; pts.push(new T.Vector2(r - rr + Math.cos(a) * rr, h - rr + Math.sin(a) * rr)); }
    pts.push(new T.Vector2(0, h));
    return mesh(new T.LatheGeometry(pts, 48), mat);
  }
  function ball(r, mat, sy = 1) { const m = mesh(new T.SphereGeometry(r, 40, 24), mat); m.scale.y = sy; return m; }
  function label(key, text, opt = {}) {      // canvas texture with a glyph
    return X.canvasTex('ic-' + key, 256, 256, (g, W, H) => {
      g.fillStyle = opt.bg || '#f3d79c'; g.fillRect(0, 0, W, H);
      g.fillStyle = opt.fg || '#1b120a'; g.font = (opt.font || '900 150px serif'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(text, W / 2, H / 2 + (opt.dy || 10));
    });
  }
  const grp = (...k) => { const g = new T.Group(); k.forEach(x => g.add(x)); return g; };
  const at = (o, x, y, z, rx = 0, ry = 0, rz = 0) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };

  /* ---------- pieces ---------- */
  function shogiPiece(ch, s = 1, col = '#f0c878') {
    const sh = new T.Shape(); sh.moveTo(0, .62); sh.lineTo(.42, .42); sh.lineTo(.52, -.58); sh.lineTo(-.52, -.58); sh.lineTo(-.42, .42); sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth: .26, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 5, curveSegments: 4 });
    const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + .6) / 1.2, (uv.getY(i) + .66) / 1.32);
    const face = M({ map: label('sh' + ch, ch, { bg: col, font: '900 128px "Hiragino Mincho ProN","Yu Mincho",serif', dy: 6 }), roughness: .45 });
    const m = mesh(geo, [face, C(0xd9a656)]); m.scale.setScalar(s); return m;
  }
  function knight(mat, s = 1) {
    const g = new T.Group();
    g.add(puck(.62, .26, mat, .5));
    const neck = mesh(new T.CylinderGeometry(.34, .5, .4, 32), mat); neck.position.y = .42; g.add(neck);
    const sh = new T.Shape();   // chunky horse head profile
    sh.moveTo(-.38, 0); sh.lineTo(.42, 0); sh.quadraticCurveTo(.5, .55, .2, .9); sh.lineTo(.62, .78); sh.quadraticCurveTo(.86, .9, .72, 1.12);
    sh.quadraticCurveTo(.4, 1.5, -.05, 1.46); sh.lineTo(-.02, 1.66); sh.lineTo(-.22, 1.42); sh.quadraticCurveTo(-.58, 1.2, -.46, .6); sh.closePath();
    const head = mesh(new T.ExtrudeGeometry(sh, { depth: .44, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 6, curveSegments: 16 }), mat);
    head.position.set(0, .58, -.22); g.add(head);
    const eye = ball(.07, C(0xffffff, { roughness: .2 })); eye.position.set(.22, 1.85, .36); g.add(eye);
    const eye2 = ball(.07, C(0xffffff, { roughness: .2 })); eye2.position.set(.22, 1.85, -.36); g.add(eye2);
    g.scale.setScalar(s); return g;
  }
  function pawnChess(mat, s = 1) { const g = new T.Group(); g.add(puck(.5, .22, mat, .5)); const b = mesh(new T.CylinderGeometry(.2, .38, .55, 32), mat); b.position.y = .48; g.add(b); const c = puck(.34, .1, mat, .5); c.position.y = .74; g.add(c); g.add(at(ball(.3, mat), 0, 1.05, 0)); g.scale.setScalar(s); return g; }
  function die(s = 1, pipCol = 0x222533, faces = [1, 6, 2, 5, 3, 4]) {
    const g = new T.Group(); g.add(at(rbox(1, 1, 1, .2, C(0xffffff, { roughness: .3 })), 0, -.5, 0));
    const pm = C(pipCol, { roughness: .3 }), red = C(0xe63b3b, { roughness: .3 });
    const P = { 1: [[0, 0]], 2: [[-.24, -.24], [.24, .24]], 3: [[-.26, -.26], [0, 0], [.26, .26]], 4: [[-.24, -.24], [.24, -.24], [-.24, .24], [.24, .24]], 5: [[-.26, -.26], [.26, -.26], [0, 0], [-.26, .26], [.26, .26]], 6: [[-.26, -.27], [.26, -.27], [-.26, 0], [.26, 0], [-.26, .27], [.26, .27]] };
    const put = (n, nx, ny, nz) => P[n].forEach(([u, v]) => {
      const p = ball(n === 1 ? .16 : .1, n === 1 ? red : pm); p.scale.set(1, 1, 1);
      if (nx) p.position.set(nx * .5, u, v); else if (ny) p.position.set(u, ny * .5, v); else p.position.set(u, v, nz * .5);
      if (nx) p.scale.x = .35; else if (ny) p.scale.y = .35; else p.scale.z = .35;
      g.add(p);
    });
    put(faces[0], 0, 1, 0); put(faces[1], 0, -1, 0); put(faces[2], 0, 0, 1); put(faces[3], 0, 0, -1); put(faces[4], 1, 0, 0); put(faces[5], -1, 0, 0);
    g.scale.setScalar(s); return g;
  }
  function revDisc(s = 1, up = 'b') { const g = new T.Group(); const a = puck(.62, .14, C(up === 'b' ? 0xf4f1e8 : 0x15161b, { roughness: .3 }), .5), b = puck(.62, .14, C(up === 'b' ? 0x15161b : 0xf4f1e8, { roughness: .3 }), .5); b.position.y = .14; g.add(a, b); g.scale.setScalar(s); return g; }
  function goStone(black, s = 1) { const m = ball(.5, black ? C(0x15161b, { roughness: .18 }) : C(0xfbfaf4, { roughness: .2 }), .5); m.position.y = .24; const g = grp(m); g.scale.setScalar(s); return g; }
  function checker(hex, s = 1) { const g = new T.Group(); g.add(puck(.6, .26, C(hex, { roughness: .3 }), .4)); const r = mesh(new T.TorusGeometry(.38, .045, 10, 40), C(hex, { roughness: .3 })); r.rotation.x = Math.PI / 2; r.position.y = .27; g.add(r); g.scale.setScalar(s); return g; }
  function c4disc(hex, s = 1) { const g = new T.Group(); const d = puck(.6, .3, gloss(hex), .45); g.add(d); const r = mesh(new T.TorusGeometry(.38, .05, 10, 40), gloss(hex)); r.rotation.x = Math.PI / 2; r.position.y = .31; g.add(r); g.scale.setScalar(s); return g; }
  function gem(hex, s = 1) { const m = mesh(new T.IcosahedronGeometry(.4, 1), C(hex, { roughness: .15, metalness: .05, flatShading: true })); m.scale.set(1, .8, 1); m.position.y = .32; const g = grp(m); g.scale.setScalar(s); return g; }
  function numTile(n, s = 1, col = '#ffffff', fg = '#2b3044') {
    const tex = label('n' + n + col, String(n), { bg: col, fg, font: '700 170px Fredoka, "Arial Rounded MT Bold", sans-serif', dy: 12 });
    const side = C(parseInt(col.slice(1), 16));
    const b = rbox(1, .5, 1, .18, side);
    const top = mesh(new T.PlaneGeometry(.8, .8), M({ map: tex, roughness: .5 })); top.rotation.x = -Math.PI / 2; top.position.y = .505;
    const g = grp(b, top); g.scale.setScalar(s); return g;
  }
  function pin(hex, s = 1) { const g = new T.Group(); g.add(at(ball(.3, gloss(hex)), 0, .3, 0)); g.scale.setScalar(s); return g; }

  const PIECES = {
    die: () => die(1.2),
    shogi: () => at(shogiPiece('王', 1.4), 0, 0, 0, -.25, 0, 0),
    shogi2: () => at(shogiPiece('飛', 1.3, '#f3d08a'), 0, 0, 0, -.25, 0, .12),
    knight: () => knight(C(0xe6dece, { roughness: .32 }), 1),
    knightB: () => knight(C(0x26232a, { roughness: .3 }), 1),
    pawn: () => pawnChess(C(0x26232a, { roughness: .3 }), 1.1),
    disc: () => at(revDisc(1.3), 0, 0, 0, .5, 0, .2),
    stoneB: () => goStone(true, 1.3), stoneW: () => goStone(false, 1.3),
    checker: () => at(checker(0xe94040, 1.2), 0, 0, 0, .3, 0, 0),
    c4: () => at(c4disc(0xffc928, 1.2), 0, 0, 0, Math.PI / 2.4, 0, 0),
    gem: () => gem(0x3cb4ff, 1.6), gem2: () => gem(0xff5d8f, 1.6),
    tile: () => numTile(7, 1.3, '#ffffff', '#ff5d8f'),
    bgChecker: () => at(checker(0x5a2a1a, 1.2), 0, 0, 0, -.3, 0, .2),
  };

  /* ---------- icon scenes ---------- */
  function boardChunk(n, size, topMat, sideMat, lines, h = .5) {   // small board fragment
    const g = new T.Group();
    g.add(rbox(size, h, size, .32, sideMat));
    const top = mesh(new T.PlaneGeometry(size - .3, size - .3), topMat); top.rotation.x = -Math.PI / 2; top.position.y = h + .002; g.add(top);
    return g;
  }
  const gridMat = (key, base, line, n, opt = {}) => M({ map: X.canvasTex('icg-' + key, 512, 512, (g, W) => {
    g.fillStyle = base; g.fillRect(0, 0, W, W); g.strokeStyle = line; g.lineWidth = opt.lw || 14; g.lineCap = 'round';
    const pad = opt.points ? W / (n * 2) : 0, st = opt.points ? (W - 2 * pad) / (n - 1) : W / n;
    for (let i = opt.points ? 0 : 1; i < (opt.points ? n : n); i++) { const p = pad + i * st; g.beginPath(); g.moveTo(p, opt.points ? pad : 0); g.lineTo(p, opt.points ? W - pad : W); g.stroke(); g.beginPath(); g.moveTo(opt.points ? pad : 0, p); g.lineTo(opt.points ? W - pad : W, p); g.stroke(); }
    if (opt.check) { const s = W / n; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if ((x + y) % 2) { g.fillStyle = opt.check; g.fillRect(x * s, y * s, s, s); } }
  }), roughness: .5 });

  const ICONS = {
    reversi() {
      const g = boardChunk(3, 3.6, gridMat('rv', '#2fbf6e', '#167a43', 3), C(0x1e9d57));
      const S = 3.3 / 3, p = i => -1.65 + S * (i + .5);
      [[0, 0, 'w'], [1, 1, 'w'], [2, 1, 'b'], [0, 2, 'b'], [2, 2, 'w']].forEach(([x, z, c]) => g.add(at(revDisc(.75, c === 'b' ? 'w' : 'b'), p(x), .5, p(z))));
      g.add(at(revDisc(1.25, 'b'), .55, 2.0, -.35, 1.05, .2, .35));   // the big disc mid-flip
      return g;
    },
    shogi() {
      const g = boardChunk(3, 3.6, gridMat('sh', '#f1c97a', '#3a2410', 3, { lw: 8 }), M({ map: X.wood('icw', '#e8b866', '#b07a32') }));
      g.add(at(shogiPiece('歩', .62), -1.05, .62, 1.05, -Math.PI / 2, 0, 0));
      g.add(at(shogiPiece('金', .62), 1.05, .62, 1.05, -Math.PI / 2, 0, .1));
      g.add(at(shogiPiece('王', 1.55), 0, 1.6, -.3, -.42, 0, -.08));
      return g;
    },
    chess() {
      const g = boardChunk(3, 3.6, gridMat('cs', '#f3dcb1', '#f3dcb1', 3, { check: '#8a5a36' }), C(0x6b4325));
      g.add(at(pawnChess(C(0x26232a, { roughness: .3 }), .7), 1.1, .5, 1.0));
      g.add(at(pawnChess(C(0xf2ede2, { roughness: .3 }), .7), -1.15, .5, -1.05));
      g.add(at(knight(C(0xe6dece, { roughness: .32 }), 1.05), -.1, .5, .15, 0, .5, 0));
      return g;
    },
    gomoku() {
      const g = boardChunk(4, 3.8, gridMat('gm', '#efc173', '#3a2410', 4, { points: true, lw: 9 }), M({ map: X.wood('icw2', '#e2ad5c', '#a87430') }), null, .7);
      const st = (3.8 - .3 - 3.5 / 4) / 3, p = i => -(st * 1.5) + st * i;
      [[0, 3, 1], [1, 2, 1], [2, 1, 1], [1, 1, 0], [2, 2, 0], [3, 3, 0]].forEach(([x, z, b]) => g.add(at(goStone(!!b, .78), p(x), .7, p(z))));
      g.add(at(goStone(true, 1.15), p(3) + .1, 1.9, p(0) - .1, .5, 0, -.3));
      return g;
    },
    dots() {
      const g = boardChunk(3, 3.6, M({ color: 0xfffdf6, roughness: .9 }), C(0xe8e1cf));
      const p = i => -1.2 + 1.2 * i, red = gloss(0xff5d5d), blue = gloss(0x36b4ff);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) g.add(at(pin(0x2b3044, .7), p(i), .5, p(j)));
      const bar = (x1, z1, x2, z2, m) => { const b = rbox(1.0, .22, .24, .1, m); b.position.set((p(x1) + p(x2)) / 2, .56, (p(z1) + p(z2)) / 2); if (z1 !== z2) b.rotation.y = Math.PI / 2; g.add(b); };
      bar(0, 0, 1, 0, red); bar(0, 0, 0, 1, red); bar(1, 0, 1, 1, red); bar(0, 1, 1, 1, red); bar(1, 1, 2, 1, blue); bar(2, 1, 2, 2, blue);
      const fill = rbox(.95, .08, .95, .1, C(0xffb3b3)); fill.position.set(-.6, .5, -.6); g.add(fill);
      g.add(at(rbox(1.0, .26, .28, .12, blue), .7, 2.0, .6, .3, .5, -.4));   // the line being drawn
      return g;
    },
    connect4() {
      const g = new T.Group(), s = 1.25, cols = 3, rows = 3, W = cols * s + .4, H = rows * s + .4;
      const sh = new T.Shape(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.closePath();
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const h = new T.Path(); h.absarc(-W / 2 + .2 + s * (c + .5), .2 + s * (r + .5), .47, 0, Math.PI * 2, true); sh.holes.push(h); }
      const fr = mesh(new T.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: true, bevelSize: .16, bevelThickness: .16, bevelSegments: 5, curveSegments: 20 }), gloss(0x2f78ff));
      fr.position.set(0, .3, -.25); g.add(fr);
      g.add(at(rbox(W + .9, .3, 2.2, .14, gloss(0x1f5ed9)), 0, 0, 0));
      const R = 0xff4545, Y = 0xffc928, put = (c, r, col) => g.add(at(c4disc(col, .78), -W / 2 + .2 + s * (c + .5), .3 + .2 + s * (r + .5), .12, Math.PI / 2, 0, 0));
      put(0, 0, Y); put(1, 0, R); put(2, 0, Y); put(1, 1, R); put(2, 1, R); put(0, 1, Y);
      g.add(at(c4disc(R, .95), -W / 2 + .2 + s * 2.5, H + 1.15, .12, Math.PI / 2, 0, .25));   // dropping in
      return g;
    },
    mancala() {
      const g = new T.Group();
      g.add(rbox(4.2, .8, 2.4, .5, M({ map: X.wood('icm', '#c68a4c', '#7a4a20', 512, 512, 1.4), roughness: .5 })));
      const pit = C(0x6b3f1c, { roughness: .8 }), cols = [0xff5d5d, 0x36b4ff, 0xffc928, 0x3ccf91, 0x8d6bff, 0xff7fbe];
      [-1, 1].forEach((x, k) => {
        const p = mesh(new T.CylinderGeometry(.82, .68, .1, 40), pit); p.position.set(x, .81, 0); g.add(p);
        for (let i = 0; i < (k ? 7 : 5); i++) { const a = i * 2.3, r = .1 + .25 * (i % 3) / 2; g.add(at(gem(cols[(i + k * 2) % 6], .55), x + Math.cos(a) * r, .78 + .14 * (i / 3 | 0), Math.sin(a) * r)); }
      });
      g.add(at(gem(0xff5d5d, .8), .2, 1.9, -.3, .3, .4, .2)); g.add(at(gem(0x36b4ff, .6), -.6, 2.4, .1, .6, 0, 0));
      return g;
    },
    backgammon() {
      const g = new T.Group();
      const top = M({ map: X.canvasTex('icbg', 512, 512, (c, W) => { c.fillStyle = '#efe3c6'; c.fillRect(0, 0, W, W); [['#e2563d', 0], ['#2a9d8f', 1]].forEach(([col, i]) => { c.fillStyle = col; c.beginPath(); const x0 = 40 + i * 240; c.moveTo(x0, W - 10); c.lineTo(x0 + 190, W - 10); c.lineTo(x0 + 95, 90); c.closePath(); c.fill(); }); }) });
      g.add(boardChunk(2, 3.6, top, M({ map: X.wood('icbw', '#7a4a2a', '#4a2a12') })));
      for (let k = 0; k < 3; k++) g.add(at(checker(0xf4efe2, .7), -.85, .5 + k * .19, .85));
      for (let k = 0; k < 2; k++) g.add(at(checker(0x5a2a1a, .7), .85, .5 + k * .19, .85));
      g.add(at(die(1.0, 0x222533, [5, 2, 3, 4, 1, 6]), -.35, 1.75, -.4, .35, .5, .2));
      g.add(at(die(.9, 0x222533, [6, 1, 2, 5, 4, 3]), .85, 1.45, -.1, -.3, -.4, .35));
      return g;
    },
    morris() {
      const top = M({ map: X.canvasTex('icnm', 512, 512, (c, W) => { c.fillStyle = '#f2dcae'; c.fillRect(0, 0, W, W); c.strokeStyle = '#3a2410'; c.lineWidth = 18; c.lineCap = 'round'; c.strokeRect(70, 70, W - 140, W - 140); c.strokeRect(190, 190, W - 380, W - 380); c.beginPath(); c.moveTo(W / 2, 70); c.lineTo(W / 2, 190); c.moveTo(70, W / 2); c.lineTo(190, W / 2); c.stroke(); }) });
      const g = boardChunk(3, 3.6, top, M({ map: X.wood('icnw', '#d9a865', '#9a6a2a') }));
      const p = v => -1.65 + 3.3 * v / 512;
      g.add(at(checker(0xf3ead8, .62), p(70), .5, p(70))); g.add(at(checker(0xf3ead8, .62), p(256), .5, p(70)));
      g.add(at(checker(0x7a2a1a, .62), p(70), .5, p(256))); g.add(at(checker(0x7a2a1a, .62), p(190), .5, p(190)));
      g.add(at(checker(0xf3ead8, .95), p(420), 1.8, p(70) + .2, .5, 0, -.35));   // completing the mill
      return g;
    },
    sudoku() {
      const g = new T.Group(), cols = ['#ffffff', '#ffffff', '#fff3c4', '#ffffff', '#ffd6e8', '#ffffff', '#d8f0ff', '#ffffff', '#ffffff'], nums = [5, 3, '', 6, '', 9, '', 1, 8];
      for (let i = 0; i < 9; i++) { const x = (i % 3 - 1) * 1.1, z = ((i / 3 | 0) - 1) * 1.1; g.add(at(nums[i] ? numTile(nums[i], 1, cols[i]) : rbox(1, .5, 1, .18, C(parseInt(cols[i].slice(1), 16))), x, 0, z)); }
      g.add(at(numTile(7, 1.15, '#ff7fbe', '#ffffff'), .35, 1.55, -.2, .35, .3, -.2));
      const pen = grp(at(mesh(new T.CylinderGeometry(.13, .13, 2.4, 20), gloss(0xffc928)), 0, 0, 0), at(mesh(new T.ConeGeometry(.13, .35, 20), C(0xf2d2a0)), 0, -1.37, 0), at(mesh(new T.CylinderGeometry(.14, .14, .3, 20), C(0xff7fbe)), 0, 1.3, 0));
      g.add(at(pen, 1.6, .8, 1.1, .2, 0, .9));
      return g;
    },
  };
  window.Icons3D = { PIECES, ICONS };
})();
