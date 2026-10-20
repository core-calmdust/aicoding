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
     Look: soft plush / marshmallow toys. Chunky merged lobes, chibi proportions (big head, tiny body),
     matte soft-touch surface: high roughness + a velvety sheen, wrap lighting so the shadow side stays
     light (no self-shadowing), a faint fresnel glow and a pastel tint on the underside of every lobe.
     Faces are minimal: black bead eyes with one catchlight (or closed arcs), a thin line mouth, round blush.
     Everything faces +z. g.userData.head = [centreY, radius, z] for the bust camera.
     g.userData.tick(t) = optional idle (breathing squash, small bob, blink); harmless if never called. */
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const SOFT_FS = 'uniform float uWrap; uniform vec3 uUnder; uniform float uUK; uniform float uGlow; uniform float uRim; varying vec3 vWN;\n';
  const LIGHTS_WRAP = () => T.ShaderChunk.lights_physical_pars_fragment.replace('vec3 irradiance = dotNL * directLight.color;',
    'vec3 irradiance = saturate((dot(geometry.normal, directLight.direction) + uWrap) / (1. + uWrap)) * directLight.color;');
  function softHook(sh) {
    Object.assign(sh.uniforms, this.userData.u);
    sh.vertexShader = 'varying vec3 vWN;\n' + sh.vertexShader.replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = SOFT_FS + sh.fragmentShader
      .replace('#include <lights_physical_pars_fragment>', LIGHTS_WRAP())
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, uUnder, uUK * smoothstep(.25, -.95, vWN.y));')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n { float fr = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 2.4); reflectedLight.indirectDiffuse += diffuseColor.rgb * (uGlow + uRim * fr); }');
  }
  // soft-touch plush material. o.under = underside pastel tint, o.sheen/sheenK = velvet rim, o.wrap, o.glow, o.rim, o.rough
  function soft(hex, o = {}) {
    const m = M(Object.assign({ color: hex, roughness: o.rough ?? .84, sheen: new T.Color(o.sheen ?? 0xffffff).multiplyScalar((o.sheenK ?? .2) * .4) }, o.mat || {}));
    m.userData.soft = true;
    m.userData.u = { uWrap: { value: o.wrap ?? .5 }, uUnder: { value: new T.Color(o.under ?? hex).convertSRGBToLinear() }, uUK: { value: o.under != null ? (o.uk ?? .5) : 0 },
      uGlow: { value: o.glow ?? .015 }, uRim: { value: o.rim ?? .16 } };
    m.onBeforeCompile = softHook;
    return m;
  }
  // a blob: unit sphere scaled to radii R at p (optional rotation)
  function blob(g, mat, p, R, rot) {
    const m = mesh(new T.SphereGeometry(1, 48, 32), mat); R = Array.isArray(R) ? R : [R, R, R];
    m.scale.set(...R); m.position.set(...p); if (rot) m.rotation.set(...rot); g.add(m); return m;
  }
  // marshmallow cube: a superellipsoid (sphere pushed towards a box; e < 1 = squarer); seam at the back
  const sqCache = {};
  function sqGeo(e) {
    if (sqCache[e]) return sqCache[e];
    const geo = new T.SphereGeometry(1, 64, 48); geo.rotateY(-Math.PI / 2);
    const P = geo.attributes.position, f = v => Math.sign(v) * Math.pow(Math.abs(v), e);
    for (let i = 0; i < P.count; i++) P.setXYZ(i, f(P.getX(i)), f(P.getY(i)), f(P.getZ(i)));
    geo.computeVertexNormals(); return (sqCache[e] = geo);
  }
  function sq(g, mat, p, S, e = .32, rot) { const m = mesh(sqGeo(e), mat); m.scale.set(S[0] / 2, S[1] / 2, S[2] / 2); m.position.set(...p); if (rot) m.rotation.set(...rot); g.add(m); return m; }
  // point + outward normal on an ellipsoid (centre c, radii R) at yaw (around y, 0 = +z) and pitch
  function sph(c, R, yaw, pitch) {
    R = Array.isArray(R) ? R : [R, R, R];
    const d = V3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    return { p: V3(c.x + d.x * R[0], c.y + d.y * R[1], c.z + d.z * R[2]), n: V3(d.x / R[0], d.y / R[1], d.z / R[2]).normalize() };
  }
  // ellipsoid surface addressed by offsets in model units (u across, v up) — keeps face spacing even on any head
  const ell = (c, R) => (u, v) => sph(c, R, Math.asin(Math.max(-1, Math.min(1, u / R[0]))), Math.asin(Math.max(-1, Math.min(1, v / R[1]))));
  // front of a marshmallow cube sq(…, c, S, e): exact superellipsoid surface point + normal at offsets (u, v) from its centre
  const sqs = (c, S, e) => (u, v) => {
    const a = S[0] / 2, b = S[1] / 2, d = S[2] / 2, k = 2 / e, X = Math.min(Math.abs(u) / a, .999), Y = Math.min(Math.abs(v) / b, .999);
    const t = Math.max(1e-4, 1 - Math.pow(X, k) - Math.pow(Y, k)), Z = Math.pow(t, e / 2);
    return { p: V3(c.x + u, c.y + v, c.z + d * Z), n: V3(Math.sign(u) * Math.pow(X, k - 1) / a, Math.sign(v) * Math.pow(Y, k - 1) / b, Math.pow(Z, k - 1) / d).normalize() };
  };
  // a decal that hugs a curved surface: a spherical cap with the surface's local curvature (measured from surf), apex at the origin
  function hugDecal(surf, u, v, w, h, mat, lift = .004) {
    const n0 = surf(u - w * .4, v), n1 = surf(u + w * .4, v), ang = Math.acos(Math.min(1, n0.n.dot(n1.n))), Rc = ang > .01 ? n0.p.distanceTo(n1.p) / ang : 50;
    const geo = new T.SphereGeometry(Rc, 16, 10, Math.PI / 2 - w / Rc / 2, w / Rc, Math.PI / 2 - h / Rc / 2, h / Rc); geo.translate(0, 0, -Rc);
    const m = mesh(geo, mat); noShadow(m); return { m, s: surf(u, v), lift };
  }
  const flat = (x0, y0, z0) => (u, v) => ({ p: V3(x0 + u, y0 + v, z0), n: V3(0, 0, 1) });
  // put o on a surface point, local +z along the normal
  function stick(g, o, s, lift = 0) { o.position.copy(s.p).addScaledVector(s.n, lift); o.lookAt(o.position.clone().add(s.n)); g.add(o); return o; }
  const INK = 0x2a2233;
  const inkM = () => M({ color: INK, roughness: .5 });
  const noShadow = o => { o.traverse(c => { c.castShadow = false; c.receiveShadow = false; }); return o; };
  // black bead eye with one small white catchlight
  function bead(r) {
    const e = new T.Group();
    const b = mesh(new T.SphereGeometry(r, 28, 18), M({ color: 0x17141d, roughness: .2 })); b.scale.set(.92, 1.08, .45); e.add(b);
    const h = mesh(new T.SphereGeometry(r * .3, 14, 10), M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })); h.scale.z = .35; h.position.set(-r * .3, r * .36, r * .37); e.add(h);
    e.userData.eye = true; return noShadow(e);
  }
  function arc(r, tube, mat, ang = Math.PI) { const m = mesh(new T.TorusGeometry(r, tube, 10, 28, ang), mat); m.rotation.z = (Math.PI - ang) / 2; return noShadow(grp(m)); }
  const blushTex = () => X.canvasTex('mon-blush2', 128, 128, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,128,150,.75)'); gr.addColorStop(.55, 'rgba(255,130,155,.6)'); gr.addColorStop(1, 'rgba(255,140,165,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
  // the face on a surface function surf(u, v) → {p, n}
  //   o.eyes: 'bead' | 'happy' (closed ∩) | 'sleepy' (closed ∪ + lashes) | 'none';  o.er eye size, o.gap half eye distance, o.v eye height
  //   o.mouth: 'smile' | 'w' (cat) | 'open' (D + tongue) | 'o' | 'none';  o.my below the eyes, o.mw width, o.msurf another surface for the mouth
  function face(g, surf, o = {}) {
    const er = o.er || .1, gap = o.gap || .3, v = o.v || 0, ink = inkM(), eyes = [], kind = o.eyes || 'bead', lw = o.lw || .024;
    [-1, 1].forEach(s => {
      const p = surf(s * gap, v);
      if (kind === 'bead') eyes.push(stick(g, bead(er), p, -er * .12));
      else if (kind === 'happy') { const a = arc(er * 1.05, er * .22, ink, Math.PI * .9); stick(g, a, surf(s * gap, v - er * .4), -.002); }
      else if (kind === 'sleepy') {
        const e = new T.Group(), a = arc(er * 1.05, er * .2, ink, Math.PI * .9); a.rotation.z = Math.PI; e.add(a);
        [.5, -.15].forEach(t => { const d = [s * Math.cos(t), Math.sin(t)], L = er * .5, l = mesh(new T.CylinderGeometry(er * .09, er * .12, L, 6), ink); l.rotation.z = Math.atan2(-d[0], d[1]); l.position.set(s * er * 1.0 + d[0] * L * .45, er * .12 + d[1] * L * .45, 0); e.add(l); });
        stick(g, noShadow(e), surf(s * gap, v + er * .5), -.002);
      }
    });
    if (o.blush !== false) {
      const bm = M({ map: blushTex(), transparent: true, depthWrite: false, roughness: .9, bump: false, polygonOffset: true, polygonOffsetFactor: -2 });
      [-1, 1].forEach(s => { const d = hugDecal(surf, s * (gap + (o.bx ?? er * 1.1)), v - (o.by ?? er * 1.5), er * 2.6, er * 1.7, bm); stick(g, d.m, d.s, d.lift); });
    }
    const ms = o.msurf || surf, mv = o.msurf ? (o.mv || 0) : v - (o.my ?? er * 1.9), mx = o.mx || 0, mk = o.mouth || 'smile', mw = o.mw || er * .7;
    if (mk === 'smile') { const m = arc(mw, lw, ink, Math.PI * .8); stick(g, m, ms(mx, mv + mw * .6), 0); m.rotateZ(Math.PI); }
    else if (mk === 'w') [-1, 1].forEach(s => { const m = arc(mw * .5, lw, ink, Math.PI * .95); stick(g, m, ms(mx + s * mw * .5, mv + mw * .3), 0); m.rotateZ(Math.PI); });
    else if (mk === 'open' || mk === 'o') {
      const m = new T.Group(), mo = mesh(new T.SphereGeometry(mw, 28, 16, 0, Math.PI * 2, mk === 'o' ? 0 : Math.PI / 2, mk === 'o' ? Math.PI : Math.PI / 2), M({ color: 0x5c1f2c, roughness: .6 }));
      mo.scale.set(1, mk === 'o' ? .8 : 1, 1); m.add(mo);
      const tg = mesh(new T.SphereGeometry(mw * .55, 20, 12), M({ color: 0xff8a9e, roughness: .6 })); tg.scale.set(1.1, .6, .4); tg.position.set(0, -mw * (mk === 'o' ? .45 : .62), mw * .16); m.add(tg);
      m.children.forEach(c => { c.scale.z *= .32; }); tg.scale.z = .2;
      stick(g, noShadow(m), ms(mx, mk === 'open' ? mv + mw * .4 : mv), .002);
    }
    return eyes;
  }
  // a little soft crown (gold-ish matte felt with bead gems)
  function crown(mat, gemMat, s = 1) {
    const g = new T.Group(), base = mesh(new T.CylinderGeometry(.42, .38, .24, 32, 1, true), mat); base.position.y = .12; base.material.side = T.DoubleSide; g.add(base);
    const rim = mesh(new T.TorusGeometry(.4, .07, 12, 40), mat); rim.rotation.x = Math.PI / 2; g.add(rim);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; blob(g, mat, [Math.cos(a) * .4, .3, Math.sin(a) * .4], .12); }
    const gm = blob(g, gemMat, [0, .13, .42], [.1, .1, .05]);
    g.scale.setScalar(s); return g;
  }
  // idle: breathing squash + a small bob + a blink every few seconds (only if someone calls tick)
  function alive(g, eyes) {
    const ph = Math.random() * 6;
    g.traverse(o => { if (o.isMesh && o.material && o.material.userData && o.material.userData.soft) o.receiveShadow = false; });   // wrap-lit plush never self-shadows (no hard terminator)
    g.userData.tick = (t) => {
      const b = Math.sin(t * 2.2 + ph); g.scale.set(1 - b * .015, 1 + b * .022, 1 - b * .015);
      g.position.y = (g.userData.y0 ?? (g.userData.y0 = g.position.y)) + Math.max(0, Math.sin(t * 1.1 + ph)) * .03;
      const bl = ((t + ph) % 3.7) < .12 ? .1 : 1; eyes.forEach(e => { e.scale.y = bl; });
    };
    return g;
  }
  function decal(key, w, h, draw) { return M({ map: X.canvasTex(key, w, h, draw), transparent: true, roughness: .85, bump: false, polygonOffset: true, polygonOffsetFactor: -2 }); }
  const sparkle = (g, p, r) => { const m = M({ color: 0xfff6c0, emissive: 0xffe680, emissiveIntensity: .9 }); [0, Math.PI / 2].forEach(a => { const s = mesh(new T.OctahedronGeometry(r, 0), m); s.scale.set(.42, 1.3, .42); s.rotation.z = a; s.position.set(...p); noShadow(s); g.add(s); }); };

  // dice puppy (backgammon); gold = the rare golden variant
  function dicepup(gold) {
    const g = new T.Group();
    const Wm = gold ? soft(0xffc22e, { under: 0xff8a3a, uk: .5, sheen: 0xfff0a0, sheenK: .7, glow: .03, mat: { metalness: .15 } }) : soft(0xfffcf6, { under: 0xc9d6ff, uk: .55 });
    const ear = gold ? soft(0xf08a28, { under: 0xff6a5a }) : soft(0x7c86c4, { under: 0xb48ad8, uk: .4 });
    const pip = gold ? soft(0xff5a6e, { rough: .6, rim: .1 }) : soft(0x434a72, { rough: .6, rim: .1 }), red = soft(gold ? 0x6aa8ff : 0xff6f78, { under: gold ? 0x9a7cff : 0xff9fb0 });
    sq(g, Wm, [0, .42, 0], [.92, .78, .82], .4);                                                 // little body
    const col = mesh(new T.TorusGeometry(.38, .07, 12, 40), red); col.rotation.x = Math.PI / 2; col.position.y = .82; g.add(col);
    blob(g, soft(0xffd65a, { rough: .5, sheenK: .5 }), [0, .74, .4], .1);                        // bell
    const hc = V3(0, 1.62, 0), HS = [1.66, 1.42, 1.42];
    sq(g, Wm, [hc.x, hc.y, hc.z], HS, .36);                                                      // head = a soft die
    const eyes = face(g, sqs(hc, HS, .36), { er: .12, gap: .3, v: -.02, mouth: 'open', mw: .1, my: .3 });
    blob(g, soft(INK, { rough: .45, rim: .05 }), [0, 1.44, .72], [.08, .055, .04]);              // nose
    [-1, 1].forEach(s => blob(g, ear, [s * .86, 1.42, 0], [.2, .46, .36], [0, 0, s * (s > 0 ? .28 : .16)]));   // floppy ears
    blob(g, red, [0, 2.33, -.05], [.16, .05, .16]);                                               // top face = 1
    [[-.3, -.3], [0, 0], [.3, .3]].forEach(([a, b]) => [-1, 1].forEach(s => blob(g, pip, [s * .826, 1.55 + b, a * .9 - .05], [.03, .1, .1])));  // side pips (behind the ears too)
    [[-.28, .1, .32], [.28, .1, .32]].forEach(p => blob(g, Wm, p, [.17, .12, .2]));             // paws
    blob(g, Wm, [0, .5, -.45], [.12, .12, .14]);                                                 // tail nub
    if (gold) {
      const cr = crown(soft(0xffe48a, { sheen: 0xfff6c8, sheenK: .7, glow: .14, rough: .6 }), soft(0x5ec8ff, { rough: .35, rim: .05 }), .7);
      cr.position.set(.08, 2.3, -.05); cr.rotation.set(-.06, 0, -.16); g.add(cr);
      sparkle(g, [1.05, 2.45, .3], .14); sparkle(g, [-1.1, 1.1, .4], .11); sparkle(g, [.95, .55, .4], .09);
    }
    g.userData.head = [1.55, 1.02, .1]; return alive(g, eyes);
  }

  const MONS = {
    // ショウギツネ: a plush fox spirit wearing a shogi king piece as a hat
    shogi() {
      const g = new T.Group(), F = soft(0xff9a4a, { under: 0xff7f9a, uk: .45 }), cream = soft(0xfff4e6, { under: 0xffd6e4, uk: .4 }), pink = soft(0xffb3c6);
      blob(g, F, [0, .52, 0], [.52, .5, .46]);
      blob(g, cream, [0, .5, .22], [.34, .34, .28]);                                             // belly
      const hc = V3(0, 1.45, .02), HR = [.88, .74, .76];
      blob(g, F, [hc.x, hc.y, hc.z], HR);
      blob(g, cream, [0, 1.2, .34], [.6, .36, .44]);                                               // white lower face
      [-1, 1].forEach(s => {                                                                       // tall pointed fox ears (rounded tip)
        const e = mesh(new T.ConeGeometry(.3, .72, 32), F); e.position.set(s * .5, 2.12, -.1); e.rotation.set(-.1, 0, -s * .36); e.scale.z = .55; g.add(e);
        const ei = mesh(new T.ConeGeometry(.17, .46, 24), pink); ei.position.set(s * .48, 2.06, -.04); ei.rotation.set(-.1, 0, -s * .36); ei.scale.z = .4; g.add(ei);
      });
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .28, v: .1, mouth: 'w', mw: .12, my: .34, by: .1, bx: .14 });
      blob(g, soft(INK, { rough: .45, rim: .05 }), [0, 1.36, .78], [.075, .055, .05]);              // nose
      const hat = shogiPiece('王', .46); hat.position.set(.04, 2.42, -.12); hat.rotation.set(-.08, 0, -.12); g.add(hat);
      blob(g, F, [.6, .7, -.4], [.3, .52, .3], [.4, 0, -.85]);                                    // big puffy tail
      blob(g, cream, [.98, 1.0, -.52], [.22, .25, .22]);
      [-1, 1].forEach(s => { blob(g, F, [s * .24, .1, .26], [.15, .1, .18]); blob(g, F, [s * .42, .62, .26], [.12, .17, .12], [0, 0, s * .4]); });
      g.userData.head = [1.62, .95, .05]; return alive(g, eyes);
    },
    // ナイトン: a chubby knight-piece pony with a cloud mane, sitting on its chess base
    knight() {
      const g = new T.Group(), Wm = soft(0xfbf7ff, { under: 0xcdbfff, uk: .5 }), mane = soft(0xa98cff, { under: 0xff8fc8, uk: .6 }), sn = soft(0xfff4ee, { under: 0xe8d4ff, uk: .4 });
      g.add(puck(.8, .28, soft(0x55669c, { under: 0x7a6ad0, rough: .7 }), .5));
      blob(g, Wm, [0, .72, 0], [.5, .46, .44]);
      const hc = V3(0, 1.62, 0), HR = [.78, .7, .7];
      blob(g, Wm, [hc.x, hc.y, hc.z], HR);
      const sc = V3(0, 1.3, .48), SR = [.34, .32, .34];
      blob(g, sn, [sc.x, sc.y, sc.z], SR);                                                         // snout
      [-1, 1].forEach(s => blob(g, soft(0xc9a0b8, { rough: .6 }), [s * .14, 1.42, .82], [.03, .04, .015]));
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .27, v: .2, eyes: 'happy', mouth: 'open', msurf: ell(sc, SR), mv: -.08, mw: .09, by: .14, bx: .16 });
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.16, .42, 24), Wm); e.position.set(s * .42, 2.24, -.12); e.rotation.z = -s * .42; e.scale.z = .6; g.add(e); });
      [[-.06, 2.3, .22, .22], [-.04, 2.38, -.1, .27], [-.18, 2.22, -.4, .28], [-.3, 1.96, -.56, .27], [-.42, 1.62, -.56, .24], [-.5, 1.3, -.44, .2], [.1, 2.2, .44, .16], [-.14, 2.2, .44, .17], [-.56, 1.98, -.2, .2], [-.66, 1.62, -.16, .19], [-.66, 1.28, -.1, .15]].forEach(([x, y, z, r]) => blob(g, mane, [x, y, z], r));   // cloud mane
      [[0, .9, -.5, .18], [0, .72, -.66, .16], [0, .52, -.7, .13]].forEach(([x, y, z, r]) => blob(g, mane, [x, y, z], r));   // tail
      [-1, 1].forEach(s => blob(g, Wm, [s * .22, .36, .36], [.14, .12, .16]));
      g.userData.head = [1.62, .98, .05]; return alive(g, eyes);
    },
    // リバガメ: a plush turtle whose shell is a reversi disc (black underside, white top)
    disc() {
      const g = new T.Group(), skin = soft(0x9fe58c, { under: 0x7cc8ff, uk: .45 }), B = soft(0x34363f, { under: 0x4a4f7a, uk: .5, rough: .62, rim: .3, sheen: 0xaab4ff, sheenK: .3 }), Wt = soft(0xfbf8f1, { under: 0xd8dcf0, uk: .3, rough: .62 });
      const sh = new T.Group(), lo = puck(.95, .26, B, .5), hi = puck(.95, .26, Wt, .5); hi.position.y = .24; sh.add(lo, hi);
      blob(sh, Wt, [0, .46, 0], [.82, .3, .82]);
      sh.position.set(0, .2, -.3); sh.rotation.x = -.1; g.add(sh);
      const hc = V3(0, 1.22, .5), HR = [.74, .66, .64];
      blob(g, skin, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .25, v: .06, mouth: 'open', mw: .1, my: .3, bx: .12 });
      const sprout = new T.Group(); blob(sprout, soft(0x57c86a), [-.1, .08, 0], [.13, .05, .08], [0, 0, .5]); blob(sprout, soft(0x57c86a), [.1, .1, 0], [.13, .05, .08], [0, 0, -.5]);
      const st = mesh(new T.CylinderGeometry(.022, .028, .14, 8), soft(0x4aa85a)); sprout.add(st); sprout.position.set(.05, 1.92, .5); sprout.rotation.z = -.15; g.add(sprout);
      [[-.66, .14, .32], [.66, .14, .32], [-.58, .14, -.78], [.58, .14, -.78]].forEach(p => blob(g, skin, p, [.22, .15, .25]));
      blob(g, skin, [0, .26, -1.22], [.1, .09, .14]);
      g.userData.head = [1.1, .9, .35]; return alive(g, eyes);
    },
    // スウボ: a little sudoku robot — marshmallow-soft, glowing visor eyes, a 3×3 grid on its chest
    tile() {
      const g = new T.Group(), Y = soft(0xffe07a, { under: 0xffa98a, uk: .45, sheen: 0xfff6d0, sheenK: .3 }), Wc = soft(0xfff8ea, { under: 0xffd2c0, uk: .4 }), pink = soft(0xff8fb1, { under: 0xff7b9a }), vis = M({ color: 0x2b3150, roughness: .35 });
      sq(g, Y, [0, .46, 0], [.96, .8, .8], .45);                                                  // body
      const grid = mesh(new T.PlaneGeometry(.44, .44), decal('mon-sgrid', 128, 128, (c, W) => {
        c.clearRect(0, 0, W, W); c.fillStyle = '#fff8ea'; c.beginPath(); c.roundRect ? c.roundRect(4, 4, W - 8, W - 8, 22) : c.rect(4, 4, W - 8, W - 8); c.fill();
        c.strokeStyle = '#f2b34a'; c.lineWidth = 5; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(14 + i * 33.3, 14); c.lineTo(14 + i * 33.3, W - 14); c.moveTo(14, 14 + i * 33.3); c.lineTo(W - 14, 14 + i * 33.3); c.stroke(); }
        c.fillStyle = '#ff7b9a'; c.font = '700 30px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('3', 30.6, 31); c.fillText('7', 97.4, 64); c.fillStyle = '#5a8cff'; c.fillText('1', 64, 97.4);
      }));
      grid.position.set(0, .46, .405); g.add(grid);
      const hc = V3(0, 1.48, 0), HS = [1.6, 1.24, 1.28];
      sq(g, Y, [hc.x, hc.y, hc.z], HS, .38);                                                      // head
      sq(g, vis, [0, 1.52, .5], [1.12, .56, .32], .38);                                           // visor
      const glow = M({ color: 0x40e8ff, emissive: 0x30dcff, emissiveIntensity: 1.6 }), eyes = [];
      [-1, 1].forEach(s => { const e = arc(.11, .045, glow, Math.PI * .9); e.position.set(s * .25, 1.47, .672); g.add(e); });   // ^ ^ glowing eyes
      const bm = M({ map: blushTex(), transparent: true, depthWrite: false, roughness: .9, bump: false });
      const hs = sqs(hc, HS, .38);
      [-1, 1].forEach(s => { const d = hugDecal(hs, s * .5, -.34, .26, .17, bm); stick(g, d.m, d.s, d.lift); });
      const m = arc(.06, .022, inkM(), Math.PI * .8); stick(g, m, hs(0, -.32), 0); m.rotateZ(Math.PI);
      [-1, 1].forEach(s => { const b = mesh(new T.CylinderGeometry(.16, .16, .12, 28), Wc); b.rotation.z = Math.PI / 2; b.position.set(s * .8, 1.5, 0); g.add(b); blob(g, pink, [s * .87, 1.5, 0], [.05, .09, .09]); });   // ear bolts
      const ant = mesh(new T.CylinderGeometry(.035, .035, .3, 10), Wc); ant.position.set(0, 2.2, 0); g.add(ant); blob(g, pink, [0, 2.4, 0], .11);
      blob(g, Y, [-.56, .62, .1], [.13, .22, .13], [0, 0, -.5]); blob(g, Y, [.58, .86, .12], [.13, .22, .13], [0, 0, 2.3]);   // one arm waving
      blob(g, Wc, [.72, 1.0, .14], .11);
      [-1, 1].forEach(s => blob(g, Wc, [s * .24, .08, .1], [.16, .1, .2]));
      g.userData.head = [1.5, .82, .1]; return alive(g, eyes);
    },
    // ゴイシペン: a go-stone penguin chick — round charcoal body, white face, a white stone beret
    stone() {
      const g = new T.Group(), B = soft(0x30344a, { under: 0x5c66c0, uk: .5, sheen: 0xb8c4ff, sheenK: .4, rim: .32 }), Wt = soft(0xfffdf7, { under: 0xd6e0ff, uk: .35 }), O = soft(0xffb547, { under: 0xff8a5a });
      const bc = V3(0, .98, 0), BR = [.96, .94, .9];
      blob(g, B, [bc.x, bc.y, bc.z], BR);
      const fc = V3(0, 1.02, .26), FR = [.78, .76, .68];
      blob(g, Wt, [fc.x, fc.y, fc.z], FR);
      [-1, 1].forEach(s => blob(g, B, [s * .2, 1.66, .5], [.3, .2, .2]));                         // widow's peak
      const eyes = face(g, ell(fc, FR), { er: .11, gap: .24, v: .24, mouth: 'none', by: .17, bx: .13 });
      blob(g, O, [0, 1.06, .92], [.12, .07, .1]);                                                   // beak
      [-1, 1].forEach(s => blob(g, B, [s * .92, .82, .05], [.13, .34, .26], [0, 0, s * (s > 0 ? .9 : .45)]));   // flippers (one waving)
      [-1, 1].forEach(s => blob(g, O, [s * .3, .06, .45], [.17, .08, .22]));
      const hat = new T.Group(); blob(hat, Wt, [0, 0, 0], [.46, .2, .46]); blob(hat, Wt, [0, .17, 0], .07);
      hat.position.set(.14, 1.9, -.05); hat.rotation.set(-.1, 0, -.25); g.add(hat);
      g.userData.head = [1.3, .95, .25]; return alive(g, eyes);
    },
    // ハコピヨ: a dots-and-boxes chick — a marshmallow box with a drawn-line crest, wings up
    dot() {
      const g = new T.Group(), Y = soft(0xffd95a, { under: 0xffa0a0, uk: .45, sheen: 0xfff3c0, sheenK: .3 }), O = soft(0xffa140, { under: 0xff7a6a }), red = soft(0xff6b7a, { under: 0xd85a9a }), dotM = soft(0x434a72, { rough: .6, rim: .1 });
      sq(g, Y, [0, .82, 0], [1.6, 1.56, 1.36], .34);
      const eyes = face(g, sqs(V3(0, .82, 0), [1.6, 1.56, 1.36], .34), { er: .13, gap: .32, v: .3, eyes: 'happy', mouth: 'open', mw: .13, my: .28 });
      blob(g, O, [0, .98, .7], [.11, .065, .09]);                                                   // tiny beak
      const box = mesh(new T.PlaneGeometry(.5, .36), decal('mon-dbox', 160, 116, (c, W, H) => {
        c.clearRect(0, 0, W, H); const P = (i, j) => [24 + i * 56, 22 + j * 72]; c.fillStyle = 'rgba(255,140,150,.35)'; c.fillRect(24, 22, 56, 72);
        c.lineCap = 'round'; c.lineWidth = 9; [[0, 0, 1, 0, '#ff6b7a'], [0, 0, 0, 1, '#ff6b7a'], [1, 0, 1, 1, '#ff6b7a'], [0, 1, 1, 1, '#ff6b7a'], [1, 0, 2, 0, '#5a9cff']].forEach(([a, b, x, y, col]) => { c.strokeStyle = col; c.beginPath(); c.moveTo(...P(a, b)); c.lineTo(...P(x, y)); c.stroke(); });
        c.fillStyle = '#434a72'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const [x, y] = P(i, j); c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); }
      }));
      box.position.set(0, .4, .682); g.add(box);                                                    // a little dots-and-boxes game on its belly
      const crest = mesh(new T.CylinderGeometry(.07, .07, .5, 16), red); crest.rotation.z = Math.PI / 2; crest.position.set(0, 1.66, .05); g.add(crest);
      [-1, 1].forEach(s => blob(g, dotM, [s * .29, 1.66, .05], .1));
      [-1, 1].forEach(s => blob(g, Y, [s * .9, 1.12, .1], [.14, .32, .24], [0, 0, -s * .7]));     // wings up, cheering
      [-1, 1].forEach(s => blob(g, O, [s * .32, .06, .45], [.17, .08, .22]));
      g.userData.head = [1.15, .92, .1]; return alive(g, eyes);
    },
    // ポトンウサ: a connect-four bunny holding a big counter overhead, about to plop it in
    plop() {
      const g = new T.Group(), Wm = soft(0xfffaf3, { under: 0xffc4d6, uk: .45 }), Bl = soft(0x6fa2ff, { under: 0x8a76ff, uk: .5 }), R = soft(0xff6670, { under: 0xff4f8a, uk: .4 }), Yc = soft(0xffd64f, { under: 0xffa04a, uk: .5 });
      blob(g, Bl, [0, .5, 0], [.48, .46, .42]);
      blob(g, Wm, [0, .48, .24], [.28, .28, .22]);
      const hc = V3(0, 1.36, 0), HR = [.8, .7, .7];
      blob(g, Wm, [hc.x, hc.y, hc.z], HR);
      [-1, 1].forEach(s => { blob(g, Wm, [s * .3, 2.12, -.1], [.17, .46, .14], [0, 0, -s * .18]); blob(g, soft(0xffb6c8), [s * .3, 2.1, -.01], [.09, .32, .06], [0, 0, -s * .18]); });
      const eyes = face(g, ell(hc, HR), { er: .1, gap: .26, v: .04, mouth: 'open', mw: .09, my: .26, bx: .12 });
      const c = puck(.34, .16, R, .5); c.rotation.set(Math.PI / 2 - .15, 0, .1); c.position.set(0, .56, .36); g.add(c);   // hugging a connect-four counter
      const rim = mesh(new T.TorusGeometry(.21, .03, 10, 36), R); rim.position.set(0, .58, .53); rim.rotation.set(-.15, 0, 0); g.add(rim);
      [-1, 1].forEach(s => blob(g, Bl, [s * .3, .64, .5], [.12, .1, .14]));                       // paws on the counter
      blob(g, Wm, [0, .44, -.42], .14);
      [-1, 1].forEach(s => blob(g, Bl, [s * .24, .08, .28], [.15, .09, .19]));
      g.userData.head = [1.5, .86, 0]; return alive(g, eyes);
    },
    // マンカラビ: a round plush beetle carrying a wooden mancala pit full of gem seeds
    gem() {
      const g = new T.Group(), skin = soft(0xffb27a, { under: 0xff8fa8, uk: .45 }), wood = soft(0xc9824a, { under: 0xa8705a, uk: .4, rough: .75, sheen: 0xffe0b0 }), pit = soft(0x8a5a36, { rough: .9, rim: .05 }), dark = soft(0x6e4a3a);
      blob(g, wood, [0, .62, -.35], [.92, .52, .8]);                                                // shell
      const p = mesh(new T.CylinderGeometry(.6, .5, .1, 36), pit); p.position.set(0, 1.08, -.35); g.add(p);
      [0xff7f8e, 0x6cb8ff, 0xffd34f, 0x6edc9e, 0xb39cff, 0xff9fd0, 0x6cb8ff].forEach((c, i) => { const a = i / 6 * Math.PI * 2 + .3, r = i === 6 ? 0 : (i % 2 ? .34 : .22); blob(g, soft(c, { rough: .45, rim: .3, glow: .1 }), [Math.cos(a) * r, 1.15 + (i === 6) * .05, Math.sin(a) * r - .35], .13); });
      const hc = V3(0, .98, .55), HR = [.72, .64, .6];
      blob(g, skin, [hc.x, hc.y, hc.z], HR);
      const eyes = face(g, ell(hc, HR), { er: .11, gap: .24, v: .06, eyes: 'happy', mouth: 'smile', mw: .09, my: .26, bx: .12 });
      [-1, 1].forEach(s => { const an = mesh(new T.CylinderGeometry(.025, .03, .4, 8), dark); an.position.set(s * .24, 1.72, .5); an.rotation.z = -s * .45; g.add(an); blob(g, soft(s > 0 ? 0xff7f8e : 0x6cb8ff, { rough: .45, rim: .3, glow: .1 }), [s * .34, 1.92, .5], .1); });
      for (let i = 0; i < 3; i++) [-1, 1].forEach(s => blob(g, dark, [s * .8, .12, .2 - i * .4], [.16, .08, .1]));
      g.userData.head = [1.1, .98, .3]; return alive(g, eyes);
    },
    // ダイスン: a plush die puppy — its spots are the pips
    dice() { return dicepup(false); },
    // モリフク: a sleepy round owl — the morris board is drawn on its downy belly
    owl() {
      const g = new T.Group(), P = soft(0xb39cff, { under: 0xff9fcf, uk: .5 }), lav = soft(0xf1eaff, { under: 0xd8c4ff, uk: .35 }), O = soft(0xffb547, { under: 0xff8a5a });
      const bc = V3(0, 1.0, 0), BR = [.98, 1.0, .9];
      blob(g, P, [bc.x, bc.y, bc.z], BR);
      const bellyM = decal('mon-mill2', 256, 256, (c, W) => {
        c.clearRect(0, 0, W, W); c.fillStyle = '#fff4e4'; c.beginPath(); c.ellipse(W / 2, W / 2, W / 2 - 6, W / 2 - 6, 0, 0, 7); c.fill();
        c.strokeStyle = '#8a6ad8'; c.lineWidth = 10; c.lineJoin = 'round'; c.strokeRect(58, 58, W - 116, W - 116); c.strokeRect(100, 100, W - 200, W - 200);
        c.beginPath(); c.moveTo(W / 2, 58); c.lineTo(W / 2, 100); c.moveTo(W / 2, W - 58); c.lineTo(W / 2, W - 100); c.moveTo(58, W / 2); c.lineTo(100, W / 2); c.moveTo(W - 58, W / 2); c.lineTo(W - 100, W / 2); c.stroke();
        [[58, 58, '#ffffff'], [W / 2, 58, '#ffffff'], [W - 58, 58, '#ffffff'], [100, W - 100, '#8a6ad8'], [W - 58, W / 2, '#8a6ad8']].forEach(([x, y, f]) => { c.fillStyle = f; c.strokeStyle = '#8a6ad8'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 17, 0, 7); c.fill(); c.stroke(); });
      });
      const belly = mesh(new T.SphereGeometry(1, 32, 24, Math.PI / 2 - .5, 1.0, Math.PI / 2 + .02, .82), bellyM);
      belly.scale.set(BR[0] * 1.005, BR[1] * 1.005, BR[2] * 1.005); belly.position.copy(bc); noShadow(belly); g.add(belly);
      const fc = V3(0, 1.36, .48), FR = [.62, .42, .4];
      [-1, 1].forEach(s => blob(g, lav, [s * .3, 1.38, .6], [.34, .32, .3]));                    // face discs
      const eyes = face(g, (u, v) => { const s = Math.sign(u) || 1; return ell(V3(s * .3, 1.38, .6), [.34, .32, .3])(u - s * .3, v); }, { er: .12, gap: .3, v: .08, eyes: 'sleepy', mouth: 'none', by: .17, bx: .03 });
      blob(g, O, [0, 1.2, .93], [.08, .1, .07]);                                                     // beak
      [-1, 1].forEach(s => { blob(g, P, [s * .52, 1.92, -.05], [.16, .26, .14], [0, 0, -s * .5]); });   // ear tufts
      [-1, 1].forEach(s => blob(g, soft(0x9a80f0, { under: 0xff9fcf }), [s * .94, .96, 0], [.14, .4, .32], [0, 0, s * .3]));
      [-1, 1].forEach(s => blob(g, O, [s * .3, .06, .42], [.15, .07, .2]));
      const cap = new T.Group(), capM = soft(0x7ec4ff, { under: 0x9a86ff });                       // a little nightcap
      const cone = mesh(new T.ConeGeometry(.36, .7, 32), capM); cone.position.y = .35; cone.rotation.z = -.35; cap.add(cone);
      const band = mesh(new T.TorusGeometry(.34, .08, 12, 36), soft(0xfffaf2)); band.rotation.x = Math.PI / 2; cap.add(band);
      blob(cap, soft(0xfffaf2), [.27, .66, 0], .11);
      cap.position.set(.18, 1.86, -.08); cap.rotation.z = -.35; g.add(cap);
      g.userData.head = [1.4, .95, .2]; return alive(g, eyes);
    },
    // チェッカニ: a plush crab carrying a stacked king checker, claws up and proud of its crown
    crab() {
      const g = new T.Group(), R = soft(0xff7d72, { under: 0xff6aa0, uk: .45 }), Rd = soft(0xf06a64, { under: 0xd860a0 }), Wt = soft(0xfffaf3, { under: 0xffd0dc });
      const s1 = puck(.92, .44, R, .5); s1.position.y = .04; g.add(s1);
      const s2 = puck(.88, .42, R, .5); s2.position.y = .46; g.add(s2);
      [.26, .68].forEach(y => { const r = mesh(new T.TorusGeometry(.6, .035, 10, 48), Rd); r.rotation.x = Math.PI / 2; r.position.y = y + .2; g.add(r); });
      const cr = crown(soft(0xffd65a, { sheen: 0xfff3c0, sheenK: .5, glow: .1, rough: .6 }), soft(0x5ec8ff, { rough: .35, rim: .05 }), .72); cr.position.set(0, .88, -.15); g.add(cr);
      const eyes = [];
      [-1, 1].forEach(s => {
        const st = mesh(new T.CylinderGeometry(.07, .09, .4, 12), R); st.position.set(s * .36, 1.02, .5); st.rotation.z = -s * .2; g.add(st);
        const ec = V3(s * .42, 1.32, .52); blob(g, Wt, [ec.x, ec.y, ec.z], .22);
        eyes.push(stick(g, bead(.1), sph(ec, .22, 0, .02), -.012));
      });
      const fc = V3(0, .67, 0), FR = [.9, .3, .9];
      face(g, ell(fc, FR), { eyes: 'none', gap: .38, er: .1, v: .05, mouth: 'smile', mw: .1, my: .06, by: .02, bx: .1 });
      [-1, 1].forEach(s => {
        blob(g, Rd, [s * .98, .66, .22], [.12, .26, .12], [0, 0, s * .7]);
        const cl = new T.Group(); blob(cl, R, [0, 0, 0], [.26, .3, .22]); blob(cl, R, [s * .1, .3, 0], [.12, .18, .14], [0, 0, -s * .5]);
        cl.position.set(s * 1.16, 1.0, .26); cl.rotation.z = -s * .25; g.add(cl);                 // claws raised
        for (let i = 0; i < 3; i++) blob(g, Rd, [s * .94, .1, -.05 - i * .3], [.2, .07, .08], [0, s * (.2 + i * .25), 0]);
      });
      g.userData.head = [.95, .95, .3]; return alive(g, eyes);
    },
    // キンダイスン: the rare golden die puppy
    gold() { return dicepup(true); },
  };
  // names / game / one-liners / rarity (N < R < SR < SSR < UR) for the portal gacha and the in-game guide
  const MON_INFO = {
    shogi:  { ja: 'ショウギツネ', en: 'Shogitsune', game: 'shogi', rar: 'SR', desc_ja: '王将の駒をちょこんとかぶったふわふわの狐。先を読むのが大好き。', desc_en: 'A fluffy fox with a king piece perched on its head. Loves reading ahead.' },
    knight: { ja: 'ナイトン', en: 'Knighton', game: 'chess', rar: 'SR', desc_ja: '雲のたてがみのナイトの子馬。台座ごとL字にぴょんと跳ねる。', desc_en: 'A knight pony with a cloud mane — hops in an L, base and all.' },
    disc:   { ja: 'リバガメ', en: 'Flipturtle', game: 'reversi', rar: 'R', desc_ja: '石の甲羅は裏が黒。ひっくり返ると気分も変わる。', desc_en: 'Its disc shell is black underneath; flip it and its mood flips too.' },
    tile:   { ja: 'スウボ', en: 'Numbot', game: 'sudoku', rar: 'R', desc_ja: '数独が得意な小さなロボ。光るバイザーの目でマスを読む。', desc_en: 'A little sudoku robot that reads the grid with its glowing visor.' },
    stone:  { ja: 'ゴイシペン', en: 'Stoneguin', game: 'gomoku', rar: 'R', desc_ja: 'まんまる黒石のペンギン。白石のベレー帽がお気に入り。五つ並ぶと踊りだす。', desc_en: 'A round black-stone penguin in a white-stone beret. Dances when five line up.' },
    dot:    { ja: 'ハコピヨ', en: 'Boxchick', game: 'dots', rar: 'N', desc_ja: '箱のかたちのひよこ。線を引いて箱が閉じると羽をあげて大よろこび。', desc_en: 'A box-shaped chick that cheers, wings up, whenever a box closes.' },
    plop:   { ja: 'ポトンウサ', en: 'Plopbun', game: 'connect4', rar: 'N', desc_ja: 'コマをかかえたうさぎ。ポトンと落として四つそろえる。', desc_en: 'A bunny hugging a counter, ready to plop it in for four in a row.' },
    gem:    { ja: 'マンカラビ', en: 'Gembeetle', game: 'mancala', rar: 'R', desc_ja: '背中のくぼみに宝石の種をためこむ、まるい甲虫。', desc_en: 'A round beetle that hoards gem seeds in the pit on its back.' },
    dice:   { ja: 'ダイスン', en: 'Dicepup', game: 'backgammon', rar: 'N', desc_ja: 'サイコロの子犬。ぶち模様はぜんぶ目の数。', desc_en: 'A dice puppy — every spot on it is a pip.' },
    owl:    { ja: 'モリフク', en: 'Millowl', game: 'morris', rar: 'R', desc_ja: 'おなかにミル盤の模様があるねぼすけフクロウ。三つ並ぶと目をさます。', desc_en: 'A sleepy owl with a mill board on its belly. Wakes up when three line up.' },
    crab:   { ja: 'チェッカニ', en: 'Checkrab', game: 'checkers', rar: 'SR', desc_ja: '二段重ねのキング駒を背負ったカニ。はさみを上げて王冠を自慢する。', desc_en: 'A crab carrying a stacked king checker, claws up to show off its crown.' },
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
