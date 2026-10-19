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
  if (!window.THREE || !window.Table3D) return;
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
  // square, chunky base (seen corner-on it reads as a diamond). Its pieces are placed at y = .5 and lifted by BASE_H - .5
  const BASE_H = 1.05;
  function boardChunk(n, size, topMat, sideMat, lines, h) {
    const g = new T.Group(), inner = new T.Group();
    g.add(rbox(size, BASE_H, size, .3, sideMat));
    const top = mesh(new T.PlaneGeometry(size - .5, size - .5), topMat); top.rotation.x = -Math.PI / 2; top.position.y = BASE_H + .004; g.add(top);
    g.userData.lift = BASE_H - (h || .5);
    return g;
  }
  // wrap a scene: everything added after the base is lifted onto its top
  function lifted(base, ...items) { const L = new T.Group(); L.position.y = base.userData.lift || 0; items.forEach(i => L.add(i)); base.add(L); return base; }
  function plinth(size, mat) { const b = new T.Group(); b.add(rbox(size, BASE_H, size, .3, mat)); b.userData.lift = BASE_H; return b; }
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
      g.add(at(knight(C(0xe6dece, { roughness: .32 }), 1.15), -.1, .5, .15, 0, -.95, 0));
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
      g.add(rbox(3.9, .7, 3.9, .3, M({ map: X.wood('icm', '#c68a4c', '#7a4a20', 512, 512, 1.4), roughness: .5 })));
      const pit = C(0x6b3f1c, { roughness: .8 }), cols = [0xff5d5d, 0x36b4ff, 0xffc928, 0x3ccf91, 0x8d6bff, 0xff7fbe];
      [-1, 1].forEach((x, k) => {
        const p = mesh(new T.CylinderGeometry(.82, .68, .1, 40), pit); p.position.set(x * .9, .71, x * .9); g.add(p);
        for (let i = 0; i < (k ? 7 : 5); i++) { const a = i * 2.3, r = .1 + .25 * (i % 3) / 2; g.add(at(gem(cols[(i + k * 2) % 6], .55), x * .9 + Math.cos(a) * r, .68 + .14 * (i / 3 | 0), x * .9 + Math.sin(a) * r)); }
      });
      g.add(at(gem(0xff5d5d, .8), .9, 1.7, -.9, .3, .4, .2)); g.add(at(gem(0x36b4ff, .6), -.2, 2.3, -.4, .6, 0, 0));
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

  /* ---------- collectible creatures ("Atlas Mon") — original board-game spirits ---------- */
  // shared cute parts: big glossy eyes, blush, tiny feet. Everything faces +z (towards the camera).
  function eyes(g, x, y, z, r = .2, gap = .32, look = 0) {
    const W = C(0xffffff, { roughness: .2 }), K = C(0x1d1b26, { roughness: .15 }), H = M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .6 });
    [-1, 1].forEach(s => {
      const e = ball(r, W); e.scale.set(.85, 1.08, .5); e.position.set(x + s * gap, y, z); g.add(e);
      const p = ball(r * .66, K); p.scale.set(.9, 1.05, .45); p.position.set(x + s * gap + look, y - r * .05, z + r * .2); g.add(p);
      const h = ball(r * .22, H); h.position.set(x + s * gap + look - r * .22, y + r * .32, z + r * .42); g.add(h);
    });
  }
  function blush(g, x, y, z, gap = .55) { const m = C(0xff7fa8, { roughness: .6, transparent: true, opacity: .7 }); [-1, 1].forEach(s => { const b = ball(.1, m); b.scale.set(1.5, .7, .3); b.position.set(x + s * gap, y, z); g.add(b); }); }
  function smile(g, x, y, z, w = .14) { const m = mesh(new T.TorusGeometry(w, .028, 8, 20, Math.PI), C(0x1d1b26)); m.rotation.z = Math.PI; m.position.set(x, y, z); g.add(m); }
  function feet(g, mat, y = 0, gap = .38, z = .1) { [-1, 1].forEach(s => { const f = ball(.2, mat); f.scale.set(1, .6, 1.3); f.position.set(s * gap, y + .1, z); g.add(f); }); }

  const MONS = {
    // ダイスン: a die puppy — its spots are the pips
    dice() {
      const g = new T.Group(), Wm = C(0xffffff, { roughness: .32 }), red = C(0xe63b3b, { roughness: .3 }), K = C(0x2b3044, { roughness: .3 });
      g.add(at(rbox(1.6, 1.5, 1.4, .42, Wm), 0, .25, 0));
      eyes(g, 0, 1.12, .7, .2, .3); blush(g, 0, .86, .7, .52); smile(g, 0, .86, .72, .1);
      [[-.86, 1.62, 0, .6], [.86, 1.62, 0, -.6]].forEach(([x, y, z, r]) => { const ear = rbox(.42, .16, .7, .12, red); ear.position.set(x, y - .25, z); ear.rotation.z = r * 1.6; g.add(ear); });
      [[-.5, .55], [.5, .55], [0, .4]].forEach(([x, y]) => { const p = ball(.11, K); p.scale.z = .35; p.position.set(x * 1.2, y + .1, -.71); g.add(p); });
      [[.81, 1.0, .3], [.81, .6, -.3]].forEach(([x, y, z]) => { const p = ball(.11, K); p.scale.x = .35; p.position.set(x, y, z); g.add(p); });
      const top = ball(.17, red); top.scale.y = .35; top.position.set(0, 1.76, 0); g.add(top);
      feet(g, Wm, 0, .45, .3);
      const tail = ball(.16, Wm); tail.position.set(0, .7, -.82); g.add(tail);
      return g;
    },
    // リバモン: a reversi-disc turtle, shell half black / half white
    disc() {
      const g = new T.Group(), skin = C(0x7ed957, { roughness: .45 }), B = C(0x17181d, { roughness: .25 }), Wt = C(0xf6f3ea, { roughness: .28 });
      const lo = puck(1.05, .32, B, .5), hi = puck(1.05, .32, Wt, .5); hi.position.y = .32; const shell = grp(lo, hi); shell.position.y = .38; shell.rotation.x = -.18; g.add(shell);
      const dome = ball(.86, Wt, .45); dome.position.y = 1.02; dome.rotation.x = -.18; g.add(dome);
      const head = ball(.52, skin); head.position.set(0, .86, .98); g.add(head);
      eyes(g, 0, .98, 1.38, .15, .22); blush(g, 0, .78, 1.35, .32); smile(g, 0, .76, 1.47, .08);
      [[-.72, .55], [.72, .55], [-.6, -.62], [.6, -.62]].forEach(([x, z]) => { const l = ball(.24, skin); l.scale.set(1, .6, 1.1); l.position.set(x, .2, z); g.add(l); });
      const tl = ball(.14, skin); tl.position.set(0, .3, -1.08); g.add(tl);
      return g;
    },
    // ショウギツネ: a fox spirit wearing a shogi-piece hood (王)
    shogi() {
      const g = new T.Group(), fur = C(0xff9b4a, { roughness: .5 }), cream = C(0xfff2dc, { roughness: .55 });
      const body = ball(.78, fur, .95); body.position.y = .72; g.add(body);
      const belly = ball(.52, cream, .9); belly.position.set(0, .62, .42); belly.scale.z = .55; g.add(belly);
      const head = ball(.72, fur, .92); head.position.set(0, 1.62, .1); g.add(head);
      const muz = ball(.36, cream, .7); muz.position.set(0, 1.46, .66); g.add(muz);
      const nose = ball(.08, C(0x1d1b26)); nose.position.set(0, 1.56, 1.0); g.add(nose);
      eyes(g, 0, 1.78, .66, .17, .3); blush(g, 0, 1.5, .62, .5);
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.24, .6, 16), fur); e.position.set(s * .42, 2.3, 0); e.rotation.z = -s * .35; g.add(e); const ei = mesh(new T.ConeGeometry(.12, .32, 12), cream); ei.position.set(s * .42, 2.26, .1); ei.rotation.z = -s * .35; g.add(ei); });
      const hood = shogiPiece('王', .78); hood.position.set(0, 2.32, -.34); hood.rotation.x = -.35; g.add(hood);
      const tail = ball(.42, fur, 1.3); tail.position.set(.62, .72, -.62); tail.rotation.z = -.6; g.add(tail); const tt = ball(.22, cream); tt.position.set(.88, 1.12, -.72); g.add(tt);
      feet(g, fur, 0, .36, .3);
      return g;
    },
    // ナイトン: a chubby knight-piece pony
    knight() {
      const g = new T.Group(), Wm = C(0xe9e3d6, { roughness: .32 }), mane = C(0x8d6bff, { roughness: .4 });
      g.add(puck(.82, .32, C(0x2b3044, { roughness: .3 }), .5));
      const body = ball(.68, Wm, .9); body.position.y = .82; g.add(body);
      const head = ball(.66, Wm); head.scale.set(1, .95, 1.2); head.position.set(0, 1.62, .22); g.add(head);
      const snout = ball(.42, Wm); snout.scale.set(1.05, .82, 1); snout.position.set(0, 1.42, .78); g.add(snout);
      [-1, 1].forEach(s => { const n = ball(.05, C(0x8a7f6a)); n.position.set(s * .14, 1.46, 1.18); g.add(n); });
      eyes(g, 0, 1.82, .78, .16, .3); blush(g, 0, 1.56, .72, .5);
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.15, .38, 12), Wm); e.position.set(s * .3, 2.32, .02); e.rotation.z = -s * .2; g.add(e); });
      for (let i = 0; i < 5; i++) { const m = ball(.2 - i * .015, mane); m.position.set(0, 2.24 - i * .24, -.28 - i * .12); g.add(m); }
      return g;
    },
    // ゴイシペン: a go-stone penguin (black stone body, white stone belly)
    stone() {
      const g = new T.Group(), B = C(0x1a1b22, { roughness: .16 }), Wt = C(0xfbfaf4, { roughness: .2 }), beak = C(0xffb21e, { roughness: .4 });
      const body = ball(.9, B, .95); body.position.y = .92; g.add(body);
      const belly = ball(.66, Wt, .95); belly.scale.z = .6; belly.position.set(0, .86, .44); g.add(belly);
      eyes(g, 0, 1.32, .78, .17, .27); blush(g, 0, 1.06, .78, .44);
      const bk = mesh(new T.ConeGeometry(.12, .28, 16), beak); bk.rotation.x = Math.PI / 2; bk.position.set(0, 1.12, .98); g.add(bk);
      [-1, 1].forEach(s => { const w = ball(.3, B); w.scale.set(.35, 1, .7); w.position.set(s * .9, .88, 0); w.rotation.z = s * .4; g.add(w); });
      feet(g, beak, 0, .3, .4);
      const hat = puck(.42, .18, Wt, .5); hat.position.set(.08, 1.78, 0); hat.rotation.z = -.2; g.add(hat);
      return g;
    },
    // マンカラビ: a gem beetle — mancala gems on its back
    gem() {
      const g = new T.Group(), shell = C(0xb37540, { roughness: .45 }), dark = C(0x5e3a1a, { roughness: .6 });
      const b = ball(.95, shell, .62); b.position.y = .62; g.add(b);
      const head = ball(.5, dark, .9); head.position.set(0, .72, .86); g.add(head);
      eyes(g, 0, .86, 1.24, .16, .22); blush(g, 0, .66, 1.24, .34);
      [0xff5d5d, 0x36b4ff, 0xffc928, 0x3ccf91, 0x8d6bff].forEach((c, i) => { const a = i / 5 * Math.PI * 2; g.add(at(gem(c, .62), Math.cos(a) * .5, .86, Math.sin(a) * .5 - .1)); });
      [-1, 1].forEach(s => { const an = mesh(new T.CylinderGeometry(.03, .03, .5, 8), dark); an.position.set(s * .2, 1.3, 1.0); an.rotation.z = -s * .4; g.add(an); const tip = ball(.08, C(0xffc928, { roughness: .2 })); tip.position.set(s * .32, 1.52, 1.0); g.add(tip); });
      for (let i = 0; i < 3; i++) [-1, 1].forEach(s => { const l = ball(.12, dark); l.scale.set(1.6, .5, .6); l.position.set(s * .86, .16, .4 - i * .4); g.add(l); });
      return g;
    },
  };

  // post-process: pieces onto the thick base; scenes without a board get a square plinth
  const PLINTH = { connect4: [0x1f5ed9, 5.2], mancala: [0xb37540, 4.6], sudoku: [0xf4efe6, 3.9] };
  const FIX = {};
  Object.keys(ICONS).forEach(id => {
    FIX[id] = () => {
      const g = ICONS[id]();
      if (PLINTH[id]) {
        const [col, size] = PLINTH[id], wrap = new T.Group(), pl = rbox(size, BASE_H, size, .34, id === 'mancala' ? M({ map: X.wood('icpl', '#d39a5c', '#8a5a2a'), roughness: .5 }) : gloss(col));
        g.position.y = BASE_H; wrap.add(pl, g); return wrap;
      }
      const lift = g.userData.lift || 0;
      g.children.forEach((c, i) => { if (i >= 2) c.position.y += lift; });
      return g;
    };
  });
  window.Icons3D = { PIECES, ICONS: FIX, MONS };
})();
