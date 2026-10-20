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

  /* ---------- collectible creatures ("Atlas Mon") — original board-game spirits ----------
     MONS[id]()  one creature → images/atlas/m-<id>.webp (avatar, tools/icons.html?kind=mon)
                              and images/atlas/g-<id>.webp (3/4 bust for the speech-bubble guide, &shot=bust)
     Chibi proportions: big round head, small body, nub limbs, big glossy eyes; everything faces +z.
     g.userData.head = [centreY, radius] of the head, used by the bust camera. */
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const vinyl = (hex, o) => C(hex, Object.assign({ roughness: .36, clearcoat: .55, clearcoatRoughness: .3 }, o || {}));
  // point + outward normal on an ellipsoid (centre c, radii R) at yaw (around y, 0 = +z) and pitch
  function sph(c, R, yaw, pitch) {
    R = Array.isArray(R) ? R : [R, R, R];
    const d = V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    return { p: V3(c.x + d.x * R[0], c.y + d.y * R[1], c.z + d.z * R[2]), n: V3(d.x / R[0], d.y / R[1], d.z / R[2]).normalize() };
  }
  const flat = (x0, y0, z0) => (u, v) => ({ p: V3(x0 + u, y0 + v, z0), n: V3(0, 0, 1) });
  // put o on a surface point, local +z along the normal
  function stick(g, o, s, lift = 0) { o.position.copy(s.p).addScaledVector(s.n, lift); o.lookAt(o.position.clone().add(s.n)); g.add(o); return o; }
  const INK = 0x231f2e;
  function eye(r, iris) {
    const e = new T.Group(), H = M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .85, roughness: .3 });
    const b = ball(r, C(INK, { roughness: .1, clearcoat: 1, clearcoatRoughness: .05 })); b.scale.set(.8, 1, .34); e.add(b);
    const ir = ball(r * .56, C(iris, { roughness: .2, emissive: iris, emissiveIntensity: .12 })); ir.scale.set(.86, .66, .3); ir.position.set(0, -r * .4, r * .2); e.add(ir);
    const h1 = ball(r * .3, H); h1.scale.set(1, 1.1, .35); h1.position.set(-r * .26, r * .36, r * .27); e.add(h1);
    const h2 = ball(r * .13, H); h2.scale.z = .35; h2.position.set(r * .3, -r * .16, r * .32); e.add(h2);
    return e;
  }
  // eyes + blush + mouth on a surface function surf(u, v) → {p, n}
  function face(g, surf, o = {}) {
    const er = o.eye || .22, u = o.gap || .36, v = o.v || 0, iris = o.iris || 0x4a7dff;
    if (!o.noEyes) [-1, 1].forEach(s => stick(g, eye(er, iris), surf(s * u, v), o.lift || 0));
    const bm = C(0xff7d9c, { roughness: .7, transparent: true, opacity: .75 });
    [-1, 1].forEach(s => { const b = ball(er * .55, bm); b.scale.set(1.4, .72, .25); stick(g, b, surf(s * (u + (o.bx ?? er * 1.25)), v - (o.by ?? er * 1.25)), 0); });
    const mv = v - (o.my ?? er * 1.35), mk = o.mouth || 'smile', ink = C(INK, { roughness: .4 });
    if (mk === 'smile' || mk === 'w') {
      (mk === 'w' ? [-1, 1] : [0]).forEach(s => {
        const w = (o.mw || er * .42) * (mk === 'w' ? .62 : 1);
        const m = mesh(new T.TorusGeometry(w, er * .085, 8, 20, Math.PI), ink);
        stick(g, m, surf(s * w, mv), 0); m.rotateZ(Math.PI);
      });
    } else if (mk === 'open') {
      const m = ball(er * .42, C(0x8a2a3a, { roughness: .5 })); m.scale.set(1.15, .8, .3); stick(g, m, surf(0, mv), 0);
      const t = ball(er * .22, C(0xff8fa8, { roughness: .5 })); t.scale.z = .3; stick(g, t, surf(0, mv - er * .12), .02);
    }
  }
  function nubs(g, mat, pts, r = .2, sy = .6, sz = 1.25) { pts.forEach(([x, y, z]) => { const f = ball(r, mat); f.scale.set(1, sy, sz); f.position.set(x, y, z); g.add(f); }); }
  function decal(key, w, h, draw) { return M({ map: X.canvasTex(key, w, h, draw), transparent: true, roughness: .45, bump: false }); }
  // a curved patch of an ellipsoid (centre c, radii R) facing +z, textured with mat (planar-ish UVs)
  function patch(c, R, phiW, thC, thW, mat) {
    const m = mesh(new T.SphereGeometry(1, 32, 24, Math.PI / 2 - phiW / 2, phiW, thC - thW / 2, thW), mat);
    m.scale.set(R[0], R[1], R[2]); m.position.copy(c); m.castShadow = false; return m;
  }
  function crown(mat, gemMat, s = 1) {
    const g = new T.Group(), base = mesh(new T.CylinderGeometry(.42, .38, .26, 28, 1, true), mat); base.position.y = .13; g.add(base);
    const rim = mesh(new T.TorusGeometry(.4, .05, 8, 32), mat); rim.rotation.x = Math.PI / 2; g.add(rim);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; const t = ball(.1, mat); t.position.set(Math.cos(a) * .4, .34, Math.sin(a) * .4); g.add(t); const sp = mesh(new T.ConeGeometry(.1, .2, 12), mat); sp.position.set(Math.cos(a) * .4, .22, Math.sin(a) * .4); g.add(sp); }
    const gm = ball(.09, gemMat); gm.scale.z = .5; gm.position.set(0, .13, .41); g.add(gm);
    g.scale.setScalar(s); return g;
  }

  // dice puppy (backgammon); gold = the rare golden variant
  function dicepup(gold) {
    const g = new T.Group();
    const Wm = gold ? C(0xffc93a, { roughness: .22, metalness: .35, clearcoat: 1, clearcoatRoughness: .1, emissive: 0x5a3a00, emissiveIntensity: .25 }) : vinyl(0xfdfcf8);
    const pip = gold ? C(0xd8203a, { roughness: .15, clearcoat: 1 }) : C(0x2b3044, { roughness: .3 }), red = C(0xe63b3b, { roughness: .3, clearcoat: .8 });
    const ear = gold ? C(0xe08a1e, { roughness: .3, clearcoat: .8 }) : vinyl(0x3a4260);
    g.add(at(rbox(1.0, .78, .9, .3, Wm), 0, .14, 0));                                         // body
    const col = mesh(new T.TorusGeometry(.42, .09, 10, 32), gold ? C(0x3a6bff, { roughness: .3 }) : red); col.rotation.x = Math.PI / 2; col.position.y = .92; g.add(col);
    const bell = ball(.12, C(0xffd23a, { roughness: .2, metalness: .3 })); bell.position.set(0, .82, .5); g.add(bell);
    g.add(at(rbox(1.72, 1.5, 1.5, .4, Wm), 0, .9, 0));                                         // head (a die)
    face(g, flat(0, 1.6, .755), { eye: .27, gap: .37, iris: gold ? 0xff7a00 : 0x3a8bff, mouth: 'open', bx: .26, by: .3 });
    const nose = ball(.09, C(INK, { roughness: .2 })); nose.scale.set(1.3, .9, .6); nose.position.set(0, 1.36, .78); g.add(nose);
    [-1, 1].forEach(s => { const e = rbox(.86, .18, .66, .2, ear); e.position.set(s * 1.07, 1.72, .06); e.rotation.z = s * (Math.PI / 2 + .3); g.add(e); });   // floppy ears
    const one = ball(.2, red); one.scale.y = .3; one.position.set(0, 2.4, 0); g.add(one);    // top face = 1
    [[-.35, -.35], [0, 0], [.35, .35]].forEach(([a, b]) => [-1, 1].forEach(s => { const p = ball(.11, pip); p.scale.x = .3; p.position.set(s * .865, 1.65 + b * .9, a * .9); g.add(p); }));
    nubs(g, Wm, [[-.32, .12, .38], [.32, .12, .38], [-.32, .12, -.3], [.32, .12, -.3]], .2, .6, 1.1);
    const tail = ball(.14, Wm); tail.scale.set(1, 1, 1.6); tail.position.set(0, .7, -.55); tail.rotation.x = -.7; g.add(tail);
    if (gold) {
      const cr = crown(C(0xfff1a8, { roughness: .2, metalness: .4, clearcoat: 1, emissive: 0x6a5000, emissiveIntensity: .3 }), C(0x37c6ff, { roughness: .1, clearcoat: 1 }), .82);
      cr.position.set(0, 2.36, 0); cr.rotation.set(-.08, 0, .14); g.add(cr);
      [[1.05, 2.4, .4, .16], [-1.1, 1.0, .5, .12], [.95, .5, .5, .1]].forEach(([x, y, z, r]) => { const sp = mesh(new T.OctahedronGeometry(r, 0), M({ color: 0xfff6c0, emissive: 0xffe680, emissiveIntensity: .9 })); sp.scale.set(.5, 1.4, .5); sp.position.set(x, y, z); g.add(sp); const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; g.add(sp2); });
      one.visible = false;
    }
    g.userData.head = [1.65, .82, .1]; return g;
  }

  const MONS = {
    // ショウギツネ: a fox spirit wearing a shogi piece as a hat
    shogi() {
      const g = new T.Group(), fur = vinyl(0xff9a44), cream = vinyl(0xfff3df), dark = C(0x6a3a1c, { roughness: .5 });
      const body = ball(.6, fur, .95); body.position.y = .6; g.add(body);
      const bel = ball(.42, cream, .95); bel.scale.z = .6; bel.position.set(0, .56, .32); g.add(bel);
      const hc = V3(0, 1.55, 0), HR = [.86, .78, .8];
      const head = ball(1, fur); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      const mz = ball(.4, cream); mz.scale.set(1.25, .72, .9); mz.position.set(0, 1.3, .52); g.add(mz);
      const nose = ball(.09, C(INK, { roughness: .2 })); nose.scale.set(1.3, .9, .7); nose.position.set(0, 1.42, .88); g.add(nose);
      face(g, (u, v) => sph(hc, HR, u, v), { eye: .21, gap: .4, v: .18, iris: 0xffb020, mouth: 'w', my: .42, bx: .2, by: .26 });
      [-1, 1].forEach(s => {
        const e = mesh(new T.ConeGeometry(.3, .7, 20), fur); e.position.set(s * .52, 2.2, -.08); e.rotation.z = -s * .42; g.add(e);
        const ei = mesh(new T.ConeGeometry(.16, .42, 16), cream); ei.position.set(s * .5, 2.16, .06); ei.rotation.z = -s * .42; g.add(ei);
        const tip = mesh(new T.ConeGeometry(.12, .2, 12), dark); tip.position.set(s * .64, 2.5, -.08); tip.rotation.z = -s * .42; g.add(tip);
      });
      const hat = shogiPiece('王', .62); hat.position.set(.05, 2.55, -.18); hat.rotation.set(-.12, 0, -.12); g.add(hat);
      const tail = ball(.42, fur, 1.35); tail.position.set(.62, .78, -.48); tail.rotation.z = -.7; g.add(tail);
      const tt = ball(.24, cream); tt.position.set(.92, 1.18, -.56); g.add(tt);
      nubs(g, fur, [[-.28, .08, .3], [.28, .08, .3]], .2);
      nubs(g, fur, [[-.5, .62, .3], [.5, .62, .3]], .15, 1.1, 1);
      g.userData.head = [1.62, .86, .05]; return g;
    },
    // ナイトン: a chubby knight-piece pony on its chess base
    knight() {
      const g = new T.Group(), Wm = vinyl(0xf3eee2), mane = vinyl(0x8d6bff), snoutM = vinyl(0xffe2d0);
      g.add(puck(.82, .3, C(0x3a4766, { roughness: .3, clearcoat: .6 }), .5));
      const ring = mesh(new T.TorusGeometry(.62, .05, 8, 40), C(0xffd25a, { roughness: .25, metalness: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = .31; g.add(ring);
      const body = ball(.55, Wm, .95); body.position.y = .82; g.add(body);
      const hc = V3(0, 1.7, -.05), HR = [.78, .74, .74];
      const head = ball(1, Wm); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      const sn = ball(.44, snoutM); sn.scale.set(1.1, .8, .9); sn.position.set(0, 1.38, .5); g.add(sn);
      [-1, 1].forEach(s => { const n = ball(.06, C(0xc07a6a)); n.scale.z = .5; n.position.set(s * .15, 1.42, .89); g.add(n); });
      face(g, (u, v) => sph(hc, HR, u, v), { eye: .21, gap: .38, v: .26, iris: 0x8d6bff, mouth: 'none', bx: .16, by: .24 });
      const sm = mesh(new T.TorusGeometry(.1, .02, 8, 20, Math.PI), C(INK)); sm.rotation.z = Math.PI; sm.position.set(0, 1.27, .89); g.add(sm);
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.17, .42, 16), Wm); e.position.set(s * .36, 2.38, -.12); e.rotation.z = -s * .3; g.add(e); const ei = mesh(new T.ConeGeometry(.09, .26, 12), snoutM); ei.position.set(s * .35, 2.36, -.04); ei.rotation.z = -s * .3; g.add(ei); });
      [[0, 2.42, .12, .2, .5], [0, 2.44, -.2, .24, .2], [0, 2.26, -.52, .24, -.4], [0, 1.96, -.72, .22, -.9], [0, 1.6, -.78, .2, -1.2]].forEach(([x, y, z, r, a]) => { const m = ball(r, mane); m.scale.set(.55, 1.25, .9); m.rotation.x = a; m.position.set(x, y, z); g.add(m); });
      const fl = ball(.14, mane); fl.scale.set(1.2, .7, .8); fl.position.set(.06, 2.3, .42); fl.rotation.z = -.4; g.add(fl);
      nubs(g, Wm, [[-.24, .36, .38], [.24, .36, .38]], .17, .7, 1.1);
      g.userData.head = [1.68, .8, .05]; return g;
    },
    // リバガメ: a turtle whose shell is a reversi disc (black underside, white top)
    disc() {
      const g = new T.Group(), skin = vinyl(0x86dc5e), B = C(0x17181d, { roughness: .22, clearcoat: 1 }), Wt = C(0xf6f3ea, { roughness: .25, clearcoat: 1 });
      const sh = new T.Group(), lo = puck(.98, .3, B, .5), hi = puck(.98, .3, Wt, .5); hi.position.y = .3; sh.add(lo, hi);
      const dome = ball(.8, Wt, .4); dome.position.y = .58; sh.add(dome);
      sh.position.set(0, .26, -.28); sh.rotation.x = -.12; g.add(sh);
      const hc = V3(0, 1.28, .62), HR = [.7, .66, .66];
      const head = ball(1, skin); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      face(g, (u, v) => sph(hc, HR, u, v), { eye: .2, gap: .42, v: .08, iris: 0x1fae5a, mouth: 'open', bx: .18, by: .24 });
      const leaf = ball(.16, C(0x3ccf6e, { roughness: .4 })); leaf.scale.set(.5, .2, 1); leaf.position.set(.08, 1.98, .55); leaf.rotation.set(.3, .5, .4); g.add(leaf);
      const stem = mesh(new T.CylinderGeometry(.025, .03, .16, 8), C(0x3a9d4a)); stem.position.set(0, 1.94, .6); g.add(stem);
      nubs(g, skin, [[-.72, .16, .38], [.72, .16, .38], [-.62, .16, -.78], [.62, .16, -.78]], .24, .6, 1.1);
      const tl = ball(.13, skin); tl.position.set(0, .3, -1.3); g.add(tl);
      g.userData.head = [1.3, .74, .62]; return g;
    },
    // スウニャン: a number-tile kitten with a pencil tail
    tile() {
      const g = new T.Group(), Wm = vinyl(0xfffdf9), pink = vinyl(0xff8fc7), inner = C(0xffc4dd, { roughness: .5 });
      g.add(at(rbox(1.0, .78, .82, .3, pink), 0, .12, 0));                                     // body tile
      const num = mesh(new T.PlaneGeometry(.5, .5), decal('mon-num3', 128, 128, (c, W) => { c.clearRect(0, 0, W, W); c.fillStyle = '#ffffff'; c.font = '700 110px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('3', W / 2, W / 2 + 8); }));
      num.position.set(0, .48, .418); g.add(num);
      g.add(at(rbox(1.66, 1.38, 1.36, .44, Wm), 0, .86, 0));                                    // head tile
      face(g, flat(0, 1.55, .685), { eye: .26, gap: .36, iris: 0xff4fa0, mouth: 'w', my: .3, bx: .25, by: .3 });
      const nose = ball(.07, C(0xff6fae, { roughness: .3 })); nose.scale.set(1.3, .9, .6); nose.position.set(0, 1.27, .7); g.add(nose);
      [-1, 1].forEach(s => {
        const e = mesh(new T.ConeGeometry(.36, .56, 4), Wm); e.position.set(s * .56, 2.44, 0); e.rotation.set(0, Math.PI / 4, -s * .18); g.add(e);
        const ei = mesh(new T.ConeGeometry(.2, .34, 4), inner); ei.position.set(s * .56, 2.38, .14); ei.rotation.set(0, Math.PI / 4, -s * .18); g.add(ei);
        [.06, -.08].forEach((dy, k) => { const w = mesh(new T.CylinderGeometry(.015, .015, .4, 6), C(0xd9c9d2)); w.rotation.z = Math.PI / 2 + s * (k ? -.12 : .12); w.position.set(s * .98, 1.25 + dy, .5); g.add(w); });
      });
      const tm = mesh(new T.PlaneGeometry(.42, .42), decal('mon-num7', 128, 128, (c, W) => { c.clearRect(0, 0, W, W); c.fillStyle = '#ff6fae'; c.font = '700 110px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', W / 2, W / 2 + 8); }));
      tm.rotation.x = -Math.PI / 2; tm.position.set(0, 2.245, -.05); g.add(tm);
      const pen = grp(at(mesh(new T.CylinderGeometry(.11, .11, 1.1, 6), vinyl(0xffc928)), 0, 0, 0), at(mesh(new T.ConeGeometry(.11, .26, 6), C(0xf2d2a0)), 0, -.68, 0), at(mesh(new T.ConeGeometry(.04, .1, 8), C(0x3a3040)), 0, -.78, 0), at(mesh(new T.CylinderGeometry(.115, .115, .2, 16), pink), 0, .64, 0));
      pen.position.set(.62, .78, -.6); pen.rotation.set(-.5, 0, -.7); g.add(pen);
      nubs(g, Wm, [[-.3, .1, .36], [.3, .1, .36]], .18);
      g.userData.head = [1.6, .8, .1]; return g;
    },
    // ゴイシペン: a go-stone penguin — glossy black stone body, white stone beret
    stone() {
      const g = new T.Group(), B = C(0x1a1b24, { roughness: .14, clearcoat: 1, clearcoatRoughness: .08 }), Wt = vinyl(0xfbfaf4), beak = vinyl(0xffb21e);
      const bc = V3(0, 1.0, 0), BR = [.98, .95, .9];
      const body = ball(1, B); body.scale.set(...BR); body.position.copy(bc); g.add(body);
      const fc = V3(0, 1.05, .3), FR = [.8, .8, .66];
      const fm = ball(1, Wt); fm.scale.set(...FR); fm.position.copy(fc); g.add(fm);
      const cap = ball(.5, B); cap.scale.set(.9, .5, .6); cap.position.set(0, 1.78, .52); g.add(cap);   // the black "widow's peak"
      face(g, (u, v) => sph(fc, FR, u, v), { eye: .22, gap: .34, v: .38, iris: 0x4a8bff, mouth: 'none', bx: .2, by: .25 });
      const bk = ball(.15, beak); bk.scale.set(1.3, .7, 1); bk.position.set(0, 1.13, .98); g.add(bk);
      [-1, 1].forEach(s => { const w = ball(.34, B); w.scale.set(.32, .95, .7); w.position.set(s * .95, .9, .05); w.rotation.z = s * .5; g.add(w); });
      nubs(g, beak, [[-.32, .08, .45], [.32, .08, .45]], .2, .5, 1.3);
      const hat = goStone(false, .95); hat.position.set(.12, 1.83, -.1); hat.rotation.set(-.15, 0, -.22); g.add(hat);
      const tuft = ball(.07, Wt); tuft.position.set(.16, 2.13, -.1); g.add(tuft);
      g.userData.head = [1.35, .95, .25]; return g;
    },
    // ハコピヨ: a dots-and-boxes chick — a square box with a drawn line for a crest
    dot() {
      const g = new T.Group(), Y = vinyl(0xffd84a), O = vinyl(0xff9a2a), red = C(0xff5d5d, { roughness: .3, clearcoat: .8 }), blue = C(0x36b4ff, { roughness: .3, clearcoat: .8 }), pinM = C(0x2b3044, { roughness: .25, clearcoat: .8 });
      g.add(at(rbox(1.7, 1.75, 1.5, .5, Y), 0, .2, 0));
      face(g, flat(0, 1.42, .755), { eye: .27, gap: .38, iris: 0x2b6bff, mouth: 'none', bx: .24, by: .3 });
      const bk = mesh(new T.ConeGeometry(.15, .26, 4), O); bk.rotation.set(Math.PI / 2, 0, Math.PI / 4); bk.position.set(0, 1.08, .86); g.add(bk);
      const panel = mesh(new T.PlaneGeometry(.72, .5), decal('mon-dots', 256, 180, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.fillStyle = '#fff7d8'; c.beginPath(); c.roundRect ? c.roundRect(4, 4, W - 8, H - 8, 30) : c.rect(4, 4, W - 8, H - 8); c.fill();
        const P = (i, j) => [48 + i * 80, 40 + j * 100]; c.lineCap = 'round'; c.lineWidth = 14;
        c.fillStyle = '#ffc2c2'; c.fillRect(48, 40, 80, 100);
        [[0, 0, 1, 0, '#ff5d5d'], [0, 0, 0, 1, '#ff5d5d'], [1, 0, 1, 1, '#ff5d5d'], [0, 1, 1, 1, '#ff5d5d'], [1, 0, 2, 0, '#36b4ff']].forEach(([a, b, x, y, col]) => { c.strokeStyle = col; c.beginPath(); c.moveTo(...P(a, b)); c.lineTo(...P(x, y)); c.stroke(); });
        c.fillStyle = '#2b3044'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const [x, y] = P(i, j); c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); }
      }));
      panel.position.set(0, .56, .757); g.add(panel);
      const crest = rbox(.86, .2, .22, .1, red); crest.position.set(0, 1.94, 0); g.add(crest);
      [-1, 1].forEach(s => { const p = ball(.15, pinM); p.position.set(s * .5, 2.05, 0); g.add(p); });
      const bl = rbox(.5, .16, .18, .08, blue); bl.position.set(-.5, 2.02, -.28); bl.rotation.y = Math.PI / 2; g.add(bl);
      [-1, 1].forEach(s => { const w = ball(.3, Y); w.scale.set(.35, .8, .8); w.position.set(s * .88, .95, 0); w.rotation.z = s * .5; g.add(w); });
      nubs(g, O, [[-.36, .1, .5], [.36, .1, .5]], .18, .5, 1.3);
      g.userData.head = [1.3, .95, .1]; return g;
    },
    // ポトンウサ: a connect-four bunny — a yellow disc face with red disc ears, plopping into place
    plop() {
      const g = new T.Group(), Y = C(0xffc928, { roughness: .24, clearcoat: 1 }), R = C(0xff4545, { roughness: .24, clearcoat: 1 }), Bl = C(0x2f78ff, { roughness: .28, clearcoat: .8 });
      const body = ball(.55, Bl, .95); body.position.y = .58; g.add(body);
      [[-.22, .7], [.22, .45]].forEach(([x, y], i) => { const h = puck(.13, .06, i ? R : Y, .5); h.rotation.x = Math.PI / 2; h.position.set(x, y, .5); g.add(h); });
      const head = puck(.88, .62, Y, .48); head.rotation.x = Math.PI / 2; head.position.set(0, 1.62, -.31); g.add(head);
      const rim = mesh(new T.TorusGeometry(.7, .045, 10, 48), Y); rim.position.set(0, 1.62, .33); g.add(rim);
      face(g, flat(0, 1.66, .335), { eye: .26, gap: .34, iris: 0xff4545, mouth: 'open', bx: .22, by: .28 });
      [-1, 1].forEach(s => {
        const e = new T.Group(); const d = puck(.3, .2, R, .5); d.rotation.x = Math.PI / 2; d.scale.set(1, 1, 1.9); e.add(d);
        const di = puck(.17, .2, C(0xffb3b3, { roughness: .4 }), .5); di.rotation.x = Math.PI / 2; di.scale.set(1, 1, 1.75); di.position.z = .02; e.add(di);
        e.position.set(s * .42, 2.62, 0); e.rotation.z = -s * .22; g.add(e);
      });
      const tl = ball(.16, vinyl(0xffffff)); tl.position.set(0, .5, -.55); g.add(tl);
      nubs(g, Bl, [[-.26, .08, .3], [.26, .08, .3]], .19);
      nubs(g, Bl, [[-.56, .7, .2], [.56, .7, .2]], .14, 1.1, 1);
      const drop = c4disc(0xff4545, .42); drop.position.set(1.02, 2.65, .1); drop.rotation.set(Math.PI / 2, 0, .4); g.add(drop);
      g.userData.head = [1.75, .92, 0]; return g;
    },
    // マンカラビ: a gem beetle — its shell is a wooden mancala pit full of gems
    gem() {
      const g = new T.Group(), wood = M({ map: X.wood('mon-gw', '#b97842', '#7a4a20'), roughness: .45, clearcoat: .5 }), skin = vinyl(0xe9a85e), dark = C(0x5e3a1a, { roughness: .5 });
      const shell = ball(.95, wood, .5); shell.position.set(0, .6, -.35); g.add(shell);
      const pit = mesh(new T.CylinderGeometry(.66, .55, .12, 32), C(0x5a3416, { roughness: .8 })); pit.position.set(0, 1.05, -.35); g.add(pit);
      [0xff5d5d, 0x36b4ff, 0xffc928, 0x3ccf91, 0x8d6bff, 0xff7fbe].forEach((c, i) => { const a = i / 6 * Math.PI * 2 + .3, r = i % 2 ? .38 : .24; g.add(at(gem(c, .58), Math.cos(a) * r, .95 + (i % 3) * .05, Math.sin(a) * r - .35, i * .4, i, 0)); });
      g.add(at(gem(0xffc928, .7), 0, 1.12, -.4, .4, .3, 0));
      const hc = V3(0, .86, .72), HR = [.68, .62, .58];
      const head = ball(1, skin); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      face(g, (u, v) => sph(hc, HR, u, v), { eye: .21, gap: .4, v: .12, iris: 0x2a9d5f, mouth: 'smile', bx: .18, by: .24 });
      [-1, 1].forEach(s => { const an = mesh(new T.CylinderGeometry(.03, .035, .5, 8), dark); an.position.set(s * .26, 1.6, .66); an.rotation.z = -s * .45; g.add(an); g.add(at(gem(s > 0 ? 0xff5d5d : 0x36b4ff, .4), s * .38, 1.74, .66)); });
      for (let i = 0; i < 3; i++) [-1, 1].forEach(s => { const l = ball(.12, dark); l.scale.set(1.5, .5, .7); l.position.set(s * .86, .14, .25 - i * .42); g.add(l); });
      g.userData.head = [1.0, .74, .55]; return g;
    },
    // ダイスン: a die puppy — its spots are the pips
    dice() { return dicepup(false); },
    // モリフク: a mill owl — the morris board is drawn on its belly
    owl() {
      const g = new T.Group(), P = vinyl(0x7552e0), lav = vinyl(0xd9ccff), cream = C(0xfff3dc, { roughness: .5 }), beak = vinyl(0xffb21e);
      const bc = V3(0, 1.02, 0), BR = [.98, 1.0, .9];
      const body = ball(1, P); body.scale.set(...BR); body.position.copy(bc); g.add(body);
      const belly = patch(V3(0, 1.02, .005), [.985, 1.005, .905], 1.45, Math.PI / 2 + .45, 1.0, decal('mon-mill', 256, 256, (c, W) => {
        c.clearRect(0, 0, W, W); c.fillStyle = '#fff1d8'; c.beginPath(); c.ellipse(W / 2, W / 2, W / 2 - 6, W / 2 - 6, 0, 0, 7); c.fill();
        c.strokeStyle = '#4a2e8a'; c.lineWidth = 9; c.lineJoin = 'round'; c.strokeRect(58, 58, W - 116, W - 116); c.strokeRect(100, 100, W - 200, W - 200);
        c.beginPath(); c.moveTo(W / 2, 58); c.lineTo(W / 2, 100); c.moveTo(W / 2, W - 58); c.lineTo(W / 2, W - 100); c.moveTo(58, W / 2); c.lineTo(100, W / 2); c.moveTo(W - 58, W / 2); c.lineTo(W - 100, W / 2); c.stroke();
        [[58, 58, '#ffffff'], [W / 2, 58, '#ffffff'], [W - 58, 58, '#ffffff'], [100, W - 100, '#4a2e8a'], [W - 58, W / 2, '#4a2e8a']].forEach(([x, y, f]) => { c.fillStyle = f; c.strokeStyle = '#4a2e8a'; c.lineWidth = 5; c.beginPath(); c.arc(x, y, 17, 0, 7); c.fill(); c.stroke(); });
      }));
      g.add(belly);
      [-1, 1].forEach(s => { const d = ball(.42, lav); d.scale.set(1, .95, .45); d.position.set(s * .34, 1.5, .6); g.add(d); });
      face(g, (u, v) => ({ p: V3(u, 1.5 + v, .79 - Math.abs(Math.abs(u) - .34) * .4), n: V3(0, 0, 1) }), { eye: .26, gap: .34, iris: 0xffb21e, mouth: 'none', bx: .26, by: .28 });
      const bk = mesh(new T.ConeGeometry(.1, .22, 12), beak); bk.rotation.x = Math.PI; bk.position.set(0, 1.27, .9); g.add(bk);
      [-1, 1].forEach(s => { const t = mesh(new T.ConeGeometry(.2, .52, 16), P); t.position.set(s * .58, 2.02, -.05); t.rotation.z = -s * .5; g.add(t); });
      [-1, 1].forEach(s => { const w = ball(.4, vinyl(0x5e3fc4)); w.scale.set(.3, .95, .75); w.position.set(s * .96, .98, -.02); w.rotation.z = s * .35; g.add(w); });
      nubs(g, beak, [[-.3, .06, .45], [.3, .06, .45]], .17, .5, 1.2);
      g.userData.head = [1.4, .95, .2]; return g;
    },
    // チェッカニ: a checkers crab — a stacked "king" checker shell with a crown
    crab() {
      const g = new T.Group(), R = C(0xe94040, { roughness: .28, clearcoat: 1 }), Rd = C(0xc72f30, { roughness: .3, clearcoat: .8 }), Wt = vinyl(0xffffff);
      const s1 = checker(0xe94040, 1.45); s1.position.y = .24; g.add(s1);
      const s2 = checker(0xe94040, 1.45); s2.position.y = .66; g.add(s2);
      const sep = mesh(new T.TorusGeometry(.86, .035, 8, 48), C(0x8a1c22)); sep.rotation.x = Math.PI / 2; sep.position.y = .64; g.add(sep);
      const cr = crown(C(0xffd23a, { roughness: .2, metalness: .3, clearcoat: 1 }), C(0x36b4ff, { roughness: .1, clearcoat: 1 }), .8); cr.position.set(0, 1.0, -.1); cr.scale.setScalar(.95); g.add(cr);
      [-1, 1].forEach(s => {
        const st = mesh(new T.CylinderGeometry(.07, .09, .55, 12), R); st.position.set(s * .48, 1.3, .48); st.rotation.z = -s * .25; g.add(st);
        const ec = V3(s * .6, 1.66, .52); const eb = ball(.32, Wt); eb.position.copy(ec); g.add(eb);
        stick(g, eye(.25, 0xff4545), sph(ec, .32, 0, .05), -.04);
      });
      const fc = V3(0, .66, 0), FR = [.88, .5, .88];
      face(g, (u, v) => sph(fc, FR, u, v), { noEyes: true, eye: .2, gap: .3, v: .1, mouth: 'open', bx: .12, by: .1, my: .2 });
      [-1, 1].forEach(s => {
        const arm = ball(.14, Rd); arm.scale.set(1.8, .8, .8); arm.position.set(s * 1.0, .62, .25); g.add(arm);
        const cl = ball(.3, R); cl.scale.set(1, .85, .85); cl.position.set(s * 1.25, .82, .35); g.add(cl);
        const cu = ball(.18, R); cu.scale.set(.8, 1.1, .8); cu.position.set(s * 1.36, 1.12, .38); cu.rotation.z = s * .5; g.add(cu);
        for (let i = 0; i < 3; i++) { const l = ball(.1, Rd); l.scale.set(2.2, .55, .7); l.position.set(s * .98, .12, -.1 - i * .3); l.rotation.y = s * (.2 + i * .25); g.add(l); }
      });
      g.userData.head = [1.15, .95, .3]; return g;
    },
    // キンダイスン: the rare golden die puppy
    gold() { return dicepup(true); },
  };
  // names / game / one-liners / rarity (N < R < SR < SSR < UR) for the portal gacha and the in-game guide
  const MON_INFO = {
    shogi:  { ja: 'ショウギツネ', en: 'Shogitsune', game: 'shogi', rar: 'SR', desc_ja: '王将の駒をかぶった狐の精。先を読むのが大好き。', desc_en: 'A fox spirit wearing a king piece as a hat. Loves reading ahead.' },
    knight: { ja: 'ナイトン', en: 'Knighton', game: 'chess', rar: 'SR', desc_ja: '台座ごとぴょんと跳ねるナイトの子馬。L字に歩く。', desc_en: 'A knight-piece pony that hops on its own base — always in an L.' },
    disc:   { ja: 'リバガメ', en: 'Flipturtle', game: 'reversi', rar: 'R', desc_ja: '石の甲羅は裏が黒。ひっくり返ると気分も変わる。', desc_en: 'Its disc shell is black underneath; flip it and its mood flips too.' },
    tile:   { ja: 'スウニャン', en: 'Numeow', game: 'sudoku', rar: 'R', desc_ja: '数字マスの子猫。鉛筆のしっぽでメモをとる。', desc_en: 'A number-tile kitten that takes pencil notes with its tail.' },
    stone:  { ja: 'ゴイシペン', en: 'Stoneguin', game: 'gomoku', rar: 'R', desc_ja: 'つやつや黒石のペンギン。五つ並ぶと踊りだす。', desc_en: 'A glossy black-stone penguin. Dances when five line up.' },
    dot:    { ja: 'ハコピヨ', en: 'Boxchick', game: 'dots', rar: 'N', desc_ja: '線を引いて箱を作るのが得意なひよこ。とさかは一本線。', desc_en: 'A chick that loves closing boxes; its crest is a drawn line.' },
    plop:   { ja: 'ポトンウサ', en: 'Plopbun', game: 'connect4', rar: 'N', desc_ja: '円盤の顔のうさぎ。ポトンと落ちて四つそろえる。', desc_en: 'A disc-faced bunny that plops down to make four in a row.' },
    gem:    { ja: 'マンカラビ', en: 'Gembeetle', game: 'mancala', rar: 'R', desc_ja: '背中のくぼみに宝石の種をためこむ甲虫。', desc_en: 'A beetle that hoards gem seeds in the pit on its back.' },
    dice:   { ja: 'ダイスン', en: 'Dicepup', game: 'backgammon', rar: 'N', desc_ja: 'サイコロの子犬。ぶち模様はぜんぶ目の数。', desc_en: 'A dice puppy — every spot on it is a pip.' },
    owl:    { ja: 'モリフク', en: 'Millowl', game: 'morris', rar: 'R', desc_ja: 'おなかにミル盤の模様があるフクロウ。三つ並べを見張る。', desc_en: 'An owl with a mill board on its belly, watching for three in a row.' },
    crab:   { ja: 'チェッカニ', en: 'Checkrab', game: 'checkers', rar: 'SR', desc_ja: '二段重ねのキング駒を背負ったカニ。王冠が自慢。', desc_en: 'A crab carrying a stacked king checker. Very proud of its crown.' },
    gold:   { ja: 'キンダイスン', en: 'Goldpup', game: 'atlas', rar: 'UR', desc_ja: 'めったに出会えない金色のダイスン。ふると幸運が出る。', desc_en: 'A rare golden Dicepup. Shake it and luck comes out.' },
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
  window.Icons3D = { PIECES, ICONS: FIX, MONS, MON_INFO };
})();
