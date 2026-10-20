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
     Look: soft, fluffy, alive (not vinyl figures). Fur = a matte sheen base + FUR_N stacked shells
     (each a copy of the mesh pushed out along its normals, with procedural 3D strand noise discarding
     more texels per layer, darker roots / lighter tips, drooping a little with gravity). Glossy only
     where the game piece itself is (shogi hat, reversi shell, crown, gems…) and in the wet eyes.
     Chibi proportions; everything faces +z. g.userData.head = [centreY, radius, z] for the bust camera.
     g.userData.tick(t) = optional idle (breathing + blink) for live use; harmless if never called. */
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  const vinyl = (hex, o) => C(hex, Object.assign({ roughness: .36, clearcoat: .55, clearcoatRoughness: .3 }, o || {}));
  // fur material: len = fur length (model units), freq = strand density, sheen = soft rim tint
  function fur(hex, len = .08, o = {}) {
    const m = M(Object.assign({ color: hex, roughness: .92, sheen: new T.Color(o.sheen ?? 0xffffff).multiplyScalar(o.sheenK ?? .35) }, o.mat || {}));
    m.userData.fur = { len, freq: o.freq || 46, clump: o.clump ?? .32 };
    return m;
  }
  const fuzz = (hex, o = {}) => fur(hex, o.len || .035, Object.assign({ freq: 70, clump: .2 }, o));   // short velvet fuzz
  const FUR_N = 9;
  const FUR_VS = 'uniform float uOff; uniform float uLayer; uniform vec3 uS; uniform vec3 uDown; varying vec3 vFP;\n';
  const FUR_FS = 'uniform float uLayer; uniform float uFreq; uniform float uClump; varying vec3 vFP;\n' +
    'float fh(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }\n' +
    'float fn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);\n' +
    ' return mix(mix(mix(fh(i), fh(i + vec3(1,0,0)), f.x), mix(fh(i + vec3(0,1,0)), fh(i + vec3(1,1,0)), f.x), f.y),\n' +
    '            mix(mix(fh(i + vec3(0,0,1)), fh(i + vec3(1,0,1)), f.x), mix(fh(i + vec3(0,1,1)), fh(i + vec3(1,1,1)), f.x), f.y), f.z); }\n';
  function furHook(sh) {
    Object.assign(sh.uniforms, this.userData.u);
    sh.vertexShader = FUR_VS + sh.vertexShader.replace('#include <begin_vertex>',
      'vec3 transformed = position + (normal * uOff + uDown * uOff * uLayer * uLayer * .35) / uS; vFP = position * uS;');
    sh.fragmentShader = FUR_FS + sh.fragmentShader.replace('#include <clipping_planes_fragment>',
      '#include <clipping_planes_fragment>\n' +
      ' vec3 q = mat3(.80, .36, -.48, -.48, .86, -.17, .36, .36, .86) * vFP * uFreq;\n' +                 // skewed lattice + domain warp: no grid moiré
      ' q += (vec3(fn(q * .11), fn(q * .11 + 5.2), fn(q * .11 + 9.7)) - .5) * 3.;\n' +
      ' float st = fh(floor(q)); vec3 cf = fract(q) - .5;\n' +                     // one strand per cell…
      ' float strand = (.35 + .65 * st) * (1. - smoothstep(.18, .66, length(cf)));\n' +
      ' float clump = fn(vFP * uFreq * .16 + 3.1);\n' +                                                  // …grouped into soft clumps
      ' float h = mix(strand * 1.25, clump, uClump);\n' +
      ' if (h < mix(.02, .66, pow(uLayer, 1.25))) discard;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= mix(.58, 1.1, uLayer);');
  }
  // smooth normals for non-indexed geometry (extruded rounded boxes) so shells don't crack at seams
  const smoothCache = new WeakMap();
  function smoothGeo(geo) {
    if (geo.index || smoothCache.has(geo)) return smoothCache.get(geo) || geo;
    const g2 = geo.clone(), P = g2.attributes.position, N = g2.attributes.normal, acc = {};
    const key = i => (P.getX(i) * 1e3 | 0) + ',' + (P.getY(i) * 1e3 | 0) + ',' + (P.getZ(i) * 1e3 | 0);
    for (let i = 0; i < P.count; i++) { const k = key(i), a = acc[k] || (acc[k] = [0, 0, 0]); a[0] += N.getX(i); a[1] += N.getY(i); a[2] += N.getZ(i); }
    for (let i = 0; i < P.count; i++) { const a = acc[key(i)], l = Math.hypot(...a) || 1; N.setXYZ(i, a[0] / l, a[1] / l, a[2] / l); }
    smoothCache.set(geo, g2); return g2;
  }
  // grow shells on every mesh whose material is fur(); run once after a creature is built
  function furify(g) {
    g.updateMatrixWorld(true);
    const list = []; g.traverse(o => { if (o.isMesh && o.material.userData && o.material.userData.fur && !o.userData.shell) list.push(o); });
    const q = new T.Quaternion(), s = new T.Vector3();
    list.forEach(o => {
      const F = o.material.userData.fur, base = o.material, geo = smoothGeo(o.geometry);
      o.matrixWorld.decompose(new T.Vector3(), q, s);
      const down = V3(0, -1, 0).applyQuaternion(q.invert());
      for (let i = 1; i <= FUR_N; i++) {
        const k = i / FUR_N, m = new T.MeshStandardMaterial({ color: base.color.clone(), map: base.map || null, roughness: 1, metalness: base.metalness,
          emissive: base.emissive.clone(), emissiveIntensity: base.emissiveIntensity, alphaTest: base.map ? .5 : 0 });
        m.userData.u = { uOff: { value: F.len * k }, uLayer: { value: k }, uS: { value: s.clone() }, uDown: { value: down.clone() }, uFreq: { value: F.freq }, uClump: { value: F.clump } };
        m.onBeforeCompile = furHook;
        const sh = new T.Mesh(geo, m); sh.userData.shell = true; sh.castShadow = false; sh.receiveShadow = true; o.add(sh);
      }
    });
    return g;
  }
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
  // planar (xy) UVs, so a canvas reads straight on the front of a ball
  function frontUV(geo) { const P = geo.attributes.position, U = geo.attributes.uv; geo.computeBoundingSphere(); const r = geo.boundingSphere.radius; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / r * .5 + .5, P.getY(i) / r * .5 + .5); return geo; }
  function irisTex(iris) {
    const h = '#' + iris.toString(16).padStart(6, '0');
    return X.canvasTex('mon-iris-' + h, 256, 256, (c, W) => {
      const cx = W / 2, cy = W * .54, R = W * .45;
      c.fillStyle = '#fbfbff'; c.fillRect(0, 0, W, W);
      let gr = c.createRadialGradient(cx, cy + R * .35, R * .1, cx, cy, R);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(.25, h); gr.addColorStop(.8, h); gr.addColorStop(1, '#1a1626');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.globalAlpha = .35; c.strokeStyle = '#1a1626'; c.lineWidth = 3;                          // iris fibres
      for (let i = 0; i < 40; i++) { const a = i / 40 * 6.283; c.beginPath(); c.moveTo(cx + Math.cos(a) * R * .5, cy + Math.sin(a) * R * .5); c.lineTo(cx + Math.cos(a) * R * .9, cy + Math.sin(a) * R * .9); c.stroke(); }
      c.globalAlpha = 1; gr = c.createRadialGradient(cx, cy - R * .05, 0, cx, cy - R * .05, R * .56);
      gr.addColorStop(0, '#0d0b14'); gr.addColorStop(.85, '#15121f'); gr.addColorStop(1, 'rgba(21,18,31,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy - R * .05, R * .56, 0, 7); c.fill();               // big pupil
      gr = c.createLinearGradient(0, cy - R, 0, cy - R * .2); gr.addColorStop(0, 'rgba(10,8,20,.55)'); gr.addColorStop(1, 'rgba(10,8,20,0)');
      c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();                             // shade under the lid
    });
  }
  // wet eye: textured eyeball (sclera rim, iris, pupil) + clear glossy cornea + two catchlights;
  // o.lid = upper-lid coverage 0‥1 (lidMat = its material), o.tilt = lid angle (expression)
  function eye(r, iris, o = {}) {
    const e = new T.Group(), H = M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .95, roughness: .3 });
    const b = mesh(frontUV(new T.SphereGeometry(r, 36, 24)), M({ map: irisTex(iris), roughness: .35, bump: false })); b.scale.set(.82, 1, .36); b.castShadow = false; e.add(b);
    const co = mesh(new T.SphereGeometry(r * 1.03, 36, 24), M({ color: 0xffffff, roughness: .02, clearcoat: 1, clearcoatRoughness: .02, transparent: true, opacity: .14, depthWrite: false }));
    co.scale.set(.82, 1, .5); co.castShadow = false; e.add(co);
    const h1 = ball(r * .26, H); h1.scale.set(1, 1.15, .3); h1.position.set(-r * .26, r * .34, r * .5); e.add(h1);
    const h2 = ball(r * .11, H); h2.scale.z = .3; h2.position.set(r * .3, -r * .22, r * .5); e.add(h2);
    if (o.lid) {
      const L = mesh(new T.SphereGeometry(r * 1.06, 28, 14, 0, Math.PI * 2, 0, Math.PI * (.12 + .5 * o.lid)), o.lidMat || C(INK));
      L.scale.set(.86, 1.04, .46); L.rotation.z = o.tilt || 0; L.castShadow = false; e.add(L);
    }
    e.userData.eye = true; return e;
  }
  // soft airbrushed blush (gradient decal)
  const blushTex = () => X.canvasTex('mon-blush', 128, 128, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,110,140,.85)'); gr.addColorStop(.55, 'rgba(255,120,150,.4)'); gr.addColorStop(1, 'rgba(255,130,160,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
  // eyes + blush + mouth on a surface function surf(u, v) → {p, n}
  //   o.lift: float it all above the fur; o.asym: right eye a little smaller/higher; o.lid/o.tilt/o.lidMat: eyelids
  //   o.mouth: 'smile' | 'w' | 'open' (tongue) | 'grin' (open + fang) | 'teeth' (smile + buck teeth) | 'none'
  function face(g, surf, o = {}) {
    const er = o.eye || .22, u = o.gap || .36, v = o.v || 0, iris = o.iris || 0x4a7dff, L = o.lift || 0, A = o.asym ?? .06, eyes = [];
    if (!o.noEyes) [-1, 1].forEach(s => {
      const e = eye(er * (s > 0 ? 1 - A : 1), iris, { lid: o.lid ? o.lid * (s > 0 ? 1 + (o.lidAsym || 0) : 1) : 0, lidMat: o.lidMat, tilt: -s * (o.tilt || 0) });
      stick(g, e, surf(s * u, v + (s > 0 ? A * er * .4 : 0)), L + (o.elift || 0)); eyes.push(e);
    });
    const bm = M({ map: blushTex(), transparent: true, depthWrite: false, roughness: .9, bump: false });
    [-1, 1].forEach(s => { const b = mesh(new T.PlaneGeometry(er * 1.5, er * 1.0), bm); b.castShadow = false; stick(g, b, surf(s * (u + (o.bx ?? er * 1.25)), v - (o.by ?? er * 1.25)), L + .01); });
    const mv = v - (o.my ?? er * 1.35), mk = o.mouth || 'smile', ink = C(INK, { roughness: .4 }), mx = o.mx || 0;
    const tooth = M({ color: 0xffffff, roughness: .25 });
    if (mk === 'smile' || mk === 'w' || mk === 'teeth') {
      (mk === 'w' ? [-1, 1] : [0]).forEach(s => {
        const w = (o.mw || er * .42) * (mk === 'w' ? .62 : 1);
        const m = mesh(new T.TorusGeometry(w, er * .085, 8, 20, Math.PI), ink);
        stick(g, m, surf(mx + s * w, mv), L); m.rotateZ(Math.PI);
      });
      if (mk === 'teeth') [-1, 1].forEach(s => { const t = rbox(er * .2, er * .22, er * .1, er * .05, tooth); t.rotation.x = Math.PI / 2; stick(g, t, surf(mx + s * er * .11, mv - er * .12), L); });
      if (o.fang) { const f = mesh(new T.ConeGeometry(er * .09, er * .22, 10), tooth); stick(g, f, surf(mx + er * .2 * o.fang, mv - er * .1), L + .005); f.rotateX(-Math.PI / 2); f.rotateX(Math.PI); }
    } else if (mk === 'open' || mk === 'grin') {
      const m = ball(er * .42, C(0x6e1f30, { roughness: .5 })); m.scale.set(1.15, mk === 'grin' ? .7 : .85, .3); stick(g, m, surf(mx, mv), L);
      const t = ball(er * .26, C(0xff7f9a, { roughness: .45, clearcoat: .6, clearcoatRoughness: .2 })); t.scale.set(1.1, .7, .35); stick(g, t, surf(mx, mv - er * .14), L + .015);
      if (mk === 'grin') [-.5, .5].forEach(s => { const f = mesh(new T.ConeGeometry(er * .08, er * .17, 10), tooth); stick(g, f, surf(mx + s * er * .5, mv + er * .2), L + .02); f.rotateX(Math.PI / 2); });
    }
    return eyes;
  }
  function nubs(g, mat, pts, r = .2, sy = .6, sz = 1.25) { pts.forEach(([x, y, z]) => { const f = ball(r, mat); f.scale.set(1, sy, sz); f.position.set(x, y, z); g.add(f); }); }
  function decal(key, w, h, draw) { return M({ map: X.canvasTex(key, w, h, draw), transparent: true, roughness: .45, bump: false }); }
  // a curved patch of an ellipsoid (centre c, radii R) facing +z, textured with mat (planar-ish UVs)
  function patch(c, R, phiW, thC, thW, mat) {
    const m = mesh(new T.SphereGeometry(1, 32, 24, Math.PI / 2 - phiW / 2, phiW, thC - thW / 2, thW), mat);
    m.scale.set(R[0], R[1], R[2]); m.position.copy(c); m.castShadow = false; return m;
  }
  // a fluffy tuft: a fan of soft furry spikes (head tufts, cheek fluff, chest ruff, tail tips)
  function tuft(mat, n = 3, len = .3, r = .1, spread = .5) {
    const t = new T.Group();
    for (let i = 0; i < n; i++) { const a = n > 1 ? (i / (n - 1) - .5) * spread * 2 : 0; const sp = mesh(new T.ConeGeometry(r * (1 - Math.abs(a) * .3), len * (1 - Math.abs(a) * .35), 14), mat); sp.position.set(Math.sin(a) * len * .4, Math.cos(a) * len * .4, 0); sp.rotation.z = -a; t.add(sp); const bb = ball(r * 1.05, mat); t.add(bb); }
    return t;
  }
  function ruff(g, mat, y, z, w = .5, n = 7, r = .12, len = .26) {   // chest ruff: fur spikes around the neck pointing down/out
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - .5) * 2; const sp = mesh(new T.ConeGeometry(r, len, 12), mat); sp.position.set(a * w, y - Math.abs(a) * .04, z - a * a * .14); sp.rotation.set(Math.PI - .5, 0, a * .5); g.add(sp); }
  }
  function crown(mat, gemMat, s = 1) {
    const g = new T.Group(), base = mesh(new T.CylinderGeometry(.42, .38, .26, 28, 1, true), mat); base.position.y = .13; g.add(base);
    const rim = mesh(new T.TorusGeometry(.4, .05, 8, 32), mat); rim.rotation.x = Math.PI / 2; g.add(rim);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + Math.PI / 2; const t = ball(.1, mat); t.position.set(Math.cos(a) * .4, .34, Math.sin(a) * .4); g.add(t); const sp = mesh(new T.ConeGeometry(.1, .2, 12), mat); sp.position.set(Math.cos(a) * .4, .22, Math.sin(a) * .4); g.add(sp); }
    const gm = ball(.09, gemMat); gm.scale.z = .5; gm.position.set(0, .13, .41); g.add(gm);
    g.scale.setScalar(s); return g;
  }
  // idle: breathing squash on the whole creature + a blink every few seconds (only if someone calls tick)
  function alive(g, eyes) {
    const ph = Math.random() * 6;
    g.userData.tick = (t) => {
      const b = Math.sin(t * 2.2 + ph); g.scale.set(1 - b * .012, 1 + b * .018, 1 - b * .012);
      const bl = ((t + ph) % 3.7) < .12 ? .12 : 1; eyes.forEach(e => { e.scale.y = bl; });
    };
    return g;
  }

  // dice puppy (backgammon); gold = the rare golden variant
  function dicepup(gold) {
    const g = new T.Group(), FL = .07;
    const Wm = gold ? fur(0xffcc44, FL, { mat: { metalness: .25, emissive: 0x5a3a00, emissiveIntensity: .22 }, sheen: 0xfff0a0, sheenK: .6 }) : fur(0xfdfaf2, FL);
    const pip = gold ? C(0xd8203a, { roughness: .2, clearcoat: 1 }) : C(0x2b3044, { roughness: .45 }), red = C(0xe63b3b, { roughness: .5 });
    const ear = gold ? fur(0xe08a1e, .09) : fur(0x4a5274, .09);
    g.add(at(rbox(1.0, .78, .9, .3, Wm), 0, .14, 0));                                         // body
    const col = mesh(new T.TorusGeometry(.44, .08, 10, 32), gold ? C(0x3a6bff, { roughness: .4 }) : red); col.rotation.x = Math.PI / 2; col.position.y = .94; g.add(col);
    const bell = ball(.12, C(0xffd23a, { roughness: .2, metalness: .5 })); bell.position.set(0, .84, .56); g.add(bell);
    g.add(at(rbox(1.72, 1.5, 1.5, .44, Wm), 0, .9, 0));                                        // head (a die)
    [[-.3, 2.4, .1, .4], [.05, 2.44, .0, -.05], [.32, 2.38, .12, -.5]].forEach(([x, y, z, rz]) => { const t = tuft(Wm, 1, .3, .1); t.position.set(x, y, z); t.rotation.z = rz; g.add(t); });   // bed-head tuft
    const eyes = face(g, flat(0, 1.6, .755), { eye: .29, gap: .38, iris: gold ? 0xff8a10 : 0x3a8bff, mouth: 'open', bx: .27, by: .32, lift: FL * .9, asym: .05 });
    const muz = ball(.26, Wm); muz.scale.set(1.25, .8, .5); muz.position.set(0, 1.24, .76); g.add(muz);
    const nose = ball(.1, C(INK, { roughness: .25, clearcoat: .8 })); nose.scale.set(1.35, .9, .7); nose.position.set(0, 1.36, .93); g.add(nose);
    [-1, 1].forEach(s => { const e = rbox(.86, .2, .66, .2, ear); e.position.set(s * 1.14, 1.66, .1); e.rotation.set(0, -s * .25, s * (Math.PI / 2 + (s > 0 ? .5 : .3))); g.add(e); });   // floppy ears (one flops more)
    const one = ball(.2, red); one.scale.y = .3; one.position.set(0, 2.4 + FL, -.3); g.add(one);    // top face = 1
    [[-.35, -.35], [0, 0], [.35, .35]].forEach(([a, b]) => [-1, 1].forEach(s => { const p = ball(.13, pip); p.scale.x = .35; p.position.set(s * (.865 + FL * 1.1), 1.65 + b * .9, a * .9); g.add(p); }));
    nubs(g, Wm, [[-.32, .12, .38], [.32, .12, .38], [-.32, .12, -.3], [.32, .12, -.3]], .2, .6, 1.1);
    const tail = tuft(Wm, 3, .34, .1, .45); tail.position.set(0, .72, -.5); tail.rotation.x = -1.1; g.add(tail);
    if (gold) {
      const cr = crown(C(0xfff1a8, { roughness: .2, metalness: .4, clearcoat: 1, emissive: 0x6a5000, emissiveIntensity: .3 }), C(0x37c6ff, { roughness: .1, clearcoat: 1 }), .82);
      cr.position.set(0, 2.36 + FL, 0); cr.rotation.set(-.08, 0, .14); g.add(cr);
      [[1.05, 2.4, .4, .16], [-1.1, 1.0, .5, .12], [.95, .5, .5, .1]].forEach(([x, y, z, r]) => { const sp = mesh(new T.OctahedronGeometry(r, 0), M({ color: 0xfff6c0, emissive: 0xffe680, emissiveIntensity: .9 })); sp.scale.set(.5, 1.4, .5); sp.position.set(x, y, z); g.add(sp); const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; g.add(sp2); });
      one.visible = false;
    }
    g.userData.head = [1.65, .82, .1]; return alive(g, eyes);
  }

  const RAW = {
    // ショウギツネ: a fox spirit wearing a shogi piece as a hat
    shogi() {
      const g = new T.Group(), F = fur(0xff9a44, .08), cream = fur(0xfff3df, .1), dark = fur(0x6a3a1c, .06);
      const body = ball(.6, F, .95); body.position.y = .6; g.add(body);
      const bel = ball(.42, cream, .95); bel.scale.z = .6; bel.position.set(0, .56, .32); g.add(bel);
      ruff(g, cream, 1.0, .5, .3, 5, .12, .3);                                                          // fluffy chest ruff
      const hc = V3(0, 1.55, 0), HR = [.86, .78, .8];
      const head = ball(1, F); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      [-1, 1].forEach(s => { const ch = tuft(cream, 3, .34, .11, .5); ch.position.set(s * .78, 1.3, .2); ch.rotation.set(0, s * .3, s * 1.75); g.add(ch); });   // cheek fluff
      const mz = ball(.4, cream); mz.scale.set(1.25, .72, .9); mz.position.set(0, 1.3, .52); g.add(mz);
      const nose = ball(.1, C(INK, { roughness: .2, clearcoat: .9 })); nose.scale.set(1.3, .9, .75); nose.position.set(0, 1.44, .92); g.add(nose);
      const eyes = face(g, (u, v) => sph(hc, HR, u, v), { eye: .23, gap: .4, v: .18, iris: 0xffb020, mouth: 'w', fang: 1, my: .44, bx: .2, by: .27, lift: .06, lid: .28, lidAsym: .5, tilt: .18, lidMat: F, asym: .04 });
      [-1, 1].forEach(s => {
        const e = mesh(new T.ConeGeometry(.32, .74, 20), F); e.position.set(s * .52, 2.2, -.08); e.rotation.z = -s * (s > 0 ? .55 : .4); g.add(e);   // one ear cocked
        const ei = mesh(new T.ConeGeometry(.17, .44, 16), cream); ei.position.set(s * .5, 2.16, .07); ei.rotation.z = -s * (s > 0 ? .55 : .4); g.add(ei);
        const tip = mesh(new T.ConeGeometry(.13, .22, 12), dark); tip.position.set(s * (s > 0 ? .7 : .65), 2.5 - (s > 0 ? .03 : 0), -.08); tip.rotation.z = -s * (s > 0 ? .55 : .4); g.add(tip);
      });
      const hat = shogiPiece('王', .62); hat.position.set(.05, 2.6, -.18); hat.rotation.set(-.12, 0, -.12); g.add(hat);
      const tf = tuft(F, 3, .3, .09, .5); tf.position.set(-.18, 2.28, .3); tf.rotation.z = .5; g.add(tf);
      const tail = ball(.46, F, 1.4); tail.position.set(.64, .8, -.5); tail.rotation.z = -.7; g.add(tail);
      const tt = tuft(cream, 3, .4, .17, .45); tt.position.set(.95, 1.2, -.58); tt.rotation.z = -.6; g.add(tt);
      nubs(g, F, [[-.28, .08, .3], [.28, .08, .3]], .2);
      nubs(g, F, [[-.5, .62, .3], [.5, .66, .32]], .15, 1.1, 1);
      g.userData.head = [1.62, .86, .05]; return alive(g, eyes);
    },
    // ナイトン: a chubby knight-piece pony on its chess base
    knight() {
      const g = new T.Group(), Wm = fur(0xf6f1e6, .07), mane = fur(0x8d6bff, .13, { freq: 26, clump: .5 }), snoutM = fuzz(0xffe2d0);
      g.add(puck(.82, .3, C(0x3a4766, { roughness: .3, clearcoat: .6 }), .5));
      const ring = mesh(new T.TorusGeometry(.62, .05, 8, 40), C(0xffd25a, { roughness: .25, metalness: .3 })); ring.rotation.x = Math.PI / 2; ring.position.y = .31; g.add(ring);
      const body = ball(.55, Wm, .95); body.position.y = .82; g.add(body);
      const hc = V3(0, 1.7, -.05), HR = [.78, .74, .74];
      const head = ball(1, Wm); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      const sn = ball(.44, snoutM); sn.scale.set(1.12, .8, .9); sn.position.set(0, 1.36, .5); g.add(sn);
      [-1, 1].forEach(s => { const n = ball(.065, C(0xb86a5c, { roughness: .6 })); n.scale.set(1, 1.3, .5); n.position.set(s * .16, 1.44, .9); g.add(n); });
      const eyes = face(g, (u, v) => sph(hc, HR, u, v), { eye: .23, gap: .38, v: .26, iris: 0x8d6bff, mouth: 'none', bx: .16, by: .25, lift: .055, lid: .12, lidMat: Wm });
      const sm = mesh(new T.TorusGeometry(.12, .022, 8, 20, Math.PI), C(INK)); sm.rotation.z = Math.PI; sm.position.set(.02, 1.25, .88); g.add(sm);
      [-1, 1].forEach(s => { const t = rbox(.07, .08, .03, .02, M({ color: 0xffffff, roughness: .25 })); t.rotation.x = Math.PI / 2; t.position.set(.02 + s * .037, 1.15, .86); g.add(t); });   // buck teeth
      [-1, 1].forEach(s => { const e = mesh(new T.ConeGeometry(.18, .44, 16), Wm); e.position.set(s * .36, 2.38, -.12); e.rotation.z = -s * (s > 0 ? .5 : .3); g.add(e); const ei = mesh(new T.ConeGeometry(.09, .26, 12), snoutM); ei.position.set(s * .35, 2.36, -.03); ei.rotation.z = -s * (s > 0 ? .5 : .3); g.add(ei); });
      [[0, 2.42, .12, .22, .5], [0, 2.46, -.2, .26, .2], [0, 2.28, -.52, .26, -.4], [0, 1.98, -.72, .24, -.9], [0, 1.6, -.78, .22, -1.2]].forEach(([x, y, z, r, a]) => { const m = ball(r, mane); m.scale.set(.6, 1.25, .9); m.rotation.x = a; m.position.set(x, y, z); g.add(m); });
      const fl = tuft(mane, 3, .36, .1, .55); fl.position.set(.08, 2.32, .4); fl.rotation.set(.9, 0, -.6); g.add(fl);    // forelock flopping over
      const tl = tuft(mane, 3, .42, .12, .4); tl.position.set(0, .8, -.5); tl.rotation.x = -2.3; g.add(tl);
      nubs(g, Wm, [[-.24, .36, .38], [.24, .36, .38]], .17, .7, 1.1);
      g.userData.head = [1.68, .8, .05]; return alive(g, eyes);
    },
    // リバガメ: a turtle whose shell is a reversi disc (black underside, white top)
    disc() {
      const g = new T.Group(), skin = fuzz(0x86dc5e, { len: .04 }), B = C(0x17181d, { roughness: .22, clearcoat: 1 }), Wt = C(0xf6f3ea, { roughness: .25, clearcoat: 1 });
      const sh = new T.Group(), lo = puck(.98, .3, B, .5), hi = puck(.98, .3, Wt, .5); hi.position.y = .3; sh.add(lo, hi);
      const dome = ball(.8, Wt, .4); dome.position.y = .58; sh.add(dome);
      sh.position.set(0, .26, -.28); sh.rotation.x = -.12; g.add(sh);
      const hc = V3(0, 1.28, .62), HR = [.72, .66, .66];
      const head = ball(1, skin); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      const eyes = face(g, (u, v) => sph(hc, HR, u, v), { eye: .23, gap: .42, v: .1, iris: 0x1fae5a, mouth: 'open', bx: .18, by: .25, lift: .03, mx: .04, asym: .07 });
      const leaf = ball(.16, C(0x3ccf6e, { roughness: .5 })); leaf.scale.set(.5, .2, 1); leaf.position.set(.08, 2.0, .55); leaf.rotation.set(.3, .5, .4); g.add(leaf);
      const stem = mesh(new T.CylinderGeometry(.025, .03, .16, 8), C(0x3a9d4a)); stem.position.set(0, 1.96, .6); g.add(stem);
      const tf = tuft(skin, 3, .2, .06, .6); tf.position.set(-.1, 1.92, .62); tf.rotation.z = .2; g.add(tf);
      nubs(g, skin, [[-.72, .16, .38], [.72, .16, .38], [-.62, .16, -.78], [.62, .16, -.78]], .25, .62, 1.1);
      const tl = ball(.13, skin); tl.position.set(0, .3, -1.3); g.add(tl);
      g.userData.head = [1.3, .74, .62]; return alive(g, eyes);
    },
    // スウニャン: a number-tile kitten with a pencil tail
    tile() {
      const g = new T.Group(), Wm = fur(0xfffdf9, .075), pink = fur(0xff8fc7, .05), inner = fuzz(0xffc4dd);
      g.add(at(rbox(1.0, .78, .82, .3, pink), 0, .12, 0));                                     // body tile
      const num = mesh(new T.PlaneGeometry(.5, .5), decal('mon-num3', 128, 128, (c, W) => { c.clearRect(0, 0, W, W); c.fillStyle = '#ffffff'; c.font = '700 110px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('3', W / 2, W / 2 + 8); }));
      num.position.set(0, .48, .418 + .05); g.add(num);
      g.add(at(rbox(1.66, 1.38, 1.36, .48, Wm), 0, .86, 0));                                    // head tile
      [-1, 1].forEach(s => { const ch = tuft(Wm, 3, .3, .1, .5); ch.position.set(s * .86, 1.15, .3); ch.rotation.set(0, 0, s * 1.9); g.add(ch); });   // cheek fluff
      const eyes = face(g, flat(0, 1.55, .685), { eye: .28, gap: .37, iris: 0xff4fa0, mouth: 'w', my: .32, bx: .25, by: .32, lift: .07, lid: .1, lidMat: Wm, tilt: -.12, asym: .05 });
      const nose = ball(.075, C(0xff6fae, { roughness: .3, clearcoat: .6 })); nose.scale.set(1.3, .9, .6); nose.position.set(0, 1.28, .77); g.add(nose);
      const tg = ball(.07, C(0xff7f9a, { roughness: .4 })); tg.scale.set(1, 1.2, .4); tg.position.set(.04, 1.13, .76); g.add(tg);   // tongue peeking
      [-1, 1].forEach(s => {
        const e = mesh(new T.ConeGeometry(.36, .56, 4), Wm); e.position.set(s * .56, 2.44, 0); e.rotation.set(0, Math.PI / 4, -s * (s > 0 ? .3 : .16)); g.add(e);
        const ei = mesh(new T.ConeGeometry(.2, .34, 4), inner); ei.position.set(s * .56, 2.38, .16); ei.rotation.set(0, Math.PI / 4, -s * (s > 0 ? .3 : .16)); g.add(ei);
        const et = tuft(Wm, 2, .18, .04, .3); et.position.set(s * .6, 2.74, .02); g.add(et);
        [.06, -.08].forEach((dy, k) => { const w = mesh(new T.CylinderGeometry(.012, .012, .44, 6), C(0xd9c9d2)); w.rotation.z = Math.PI / 2 + s * (k ? -.12 : .12); w.position.set(s * 1.0, 1.25 + dy, .58); g.add(w); });
      });
      const tm = mesh(new T.PlaneGeometry(.42, .42), decal('mon-num7', 128, 128, (c, W) => { c.clearRect(0, 0, W, W); c.fillStyle = '#ff6fae'; c.font = '700 110px Fredoka, "Arial Rounded MT Bold", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('7', W / 2, W / 2 + 8); }));
      tm.rotation.x = -Math.PI / 2; tm.position.set(0, 2.245 + .08, -.05); g.add(tm);
      const pen = grp(at(mesh(new T.CylinderGeometry(.11, .11, 1.1, 6), vinyl(0xffc928)), 0, 0, 0), at(mesh(new T.ConeGeometry(.11, .26, 6), C(0xf2d2a0)), 0, -.68, 0), at(mesh(new T.ConeGeometry(.04, .1, 8), C(0x3a3040)), 0, -.78, 0), at(mesh(new T.CylinderGeometry(.115, .115, .2, 16), pink), 0, .64, 0));
      pen.position.set(.62, .78, -.6); pen.rotation.set(-.5, 0, -.7); g.add(pen);
      nubs(g, Wm, [[-.3, .1, .36], [.3, .1, .36]], .18);
      g.userData.head = [1.6, .8, .1]; return alive(g, eyes);
    },
    // ゴイシペン: a go-stone penguin chick — sleek black-stone back, fluffy white down, white stone beret
    stone() {
      const g = new T.Group(), B = fur(0x1d1e28, .035, { sheen: 0x9aa8ff, sheenK: .5, freq: 60 }), Wt = fur(0xfbfaf4, .08), beak = C(0xffb21e, { roughness: .4 });
      const bc = V3(0, 1.0, 0), BR = [.98, .95, .9];
      const body = ball(1, B); body.scale.set(...BR); body.position.copy(bc); g.add(body);
      const fc = V3(0, 1.05, .3), FR = [.8, .8, .66];
      const fm = ball(1, Wt); fm.scale.set(...FR); fm.position.copy(fc); g.add(fm);
      const cap = ball(.5, B); cap.scale.set(.9, .5, .6); cap.position.set(0, 1.78, .52); g.add(cap);   // the black "widow's peak"
      const eyes = face(g, (u, v) => sph(fc, FR, u, v), { eye: .24, gap: .34, v: .38, iris: 0x4a8bff, mouth: 'none', bx: .2, by: .26, lift: .07, asym: .08 });
      const bk = ball(.15, beak); bk.scale.set(1.3, .7, 1); bk.position.set(0, 1.13, 1.04); g.add(bk);
      const bl = ball(.12, C(0xff9a10, { roughness: .45 })); bl.scale.set(1.2, .45, .9); bl.position.set(0, 1.05, 1.0); g.add(bl);   // lower beak: little open mouth
      [-1, 1].forEach(s => { const w = ball(.34, B); w.scale.set(.32, .95, .7); w.position.set(s * .95, .9, .05); w.rotation.z = s * (s > 0 ? .8 : .5); g.add(w); });   // one flipper waving
      nubs(g, beak, [[-.32, .08, .45], [.32, .08, .45]], .2, .5, 1.3);
      const hat = goStone(false, .95); hat.position.set(.12, 1.85, -.1); hat.rotation.set(-.15, 0, -.22); g.add(hat);
      const tf = tuft(B, 3, .3, .08, .55); tf.position.set(-.3, 2.0, .2); tf.rotation.z = .55; g.add(tf);
      g.userData.head = [1.35, .95, .25]; return alive(g, eyes);
    },
    // ハコピヨ: a dots-and-boxes chick — a square fluffy box with a drawn line for a crest
    dot() {
      const g = new T.Group(), Y = fur(0xffd84a, .1, { freq: 28, clump: .5 }), O = C(0xff9a2a, { roughness: .45 }), red = C(0xff5d5d, { roughness: .35, clearcoat: .6 }), blue = C(0x36b4ff, { roughness: .35, clearcoat: .6 }), pinM = C(0x2b3044, { roughness: .3, clearcoat: .8 });
      g.add(at(rbox(1.7, 1.75, 1.5, .55, Y), 0, .2, 0));
      const eyes = face(g, flat(0, 1.42, .755), { eye: .29, gap: .39, iris: 0x2b6bff, mouth: 'none', bx: .24, by: .32, lift: .09, asym: .07 });
      const bk = mesh(new T.ConeGeometry(.16, .28, 4), O); bk.rotation.set(Math.PI / 2, 0, Math.PI / 4); bk.position.set(0, 1.08, .96); g.add(bk);
      const panel = mesh(new T.PlaneGeometry(.72, .5), decal('mon-dots', 256, 180, (c, W, H) => {
        c.clearRect(0, 0, W, H); c.fillStyle = '#fff7d8'; c.beginPath(); c.roundRect ? c.roundRect(4, 4, W - 8, H - 8, 30) : c.rect(4, 4, W - 8, H - 8); c.fill();
        const P = (i, j) => [48 + i * 80, 40 + j * 100]; c.lineCap = 'round'; c.lineWidth = 14;
        c.fillStyle = '#ffc2c2'; c.fillRect(48, 40, 80, 100);
        [[0, 0, 1, 0, '#ff5d5d'], [0, 0, 0, 1, '#ff5d5d'], [1, 0, 1, 1, '#ff5d5d'], [0, 1, 1, 1, '#ff5d5d'], [1, 0, 2, 0, '#36b4ff']].forEach(([a, b, x, y, col]) => { c.strokeStyle = col; c.beginPath(); c.moveTo(...P(a, b)); c.lineTo(...P(x, y)); c.stroke(); });
        c.fillStyle = '#2b3044'; for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { const [x, y] = P(i, j); c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); }
      }));
      panel.position.set(0, .56, .757 + .09); panel.rotation.z = .06; g.add(panel);   // a little card it holds
      const crest = rbox(.86, .2, .22, .1, red); crest.position.set(0, 2.02, 0); g.add(crest);
      [-1, 1].forEach(s => { const p = ball(.15, pinM); p.position.set(s * .5, 2.13, 0); g.add(p); });
      const bl = rbox(.5, .16, .18, .08, blue); bl.position.set(-.5, 2.1, -.28); bl.rotation.y = Math.PI / 2; g.add(bl);
      [[-.1, 1.98, .45, .35], [.12, 2.0, .4, -.3]].forEach(([x, y, z, rz]) => { const t = tuft(Y, 2, .28, .07, .4); t.position.set(x, y, z); t.rotation.z = rz; g.add(t); });
      [-1, 1].forEach(s => { const w = ball(.32, Y); w.scale.set(.38, .8, .8); w.position.set(s * .92, .95, 0); w.rotation.z = s * (s > 0 ? .9 : .5); g.add(w); });
      nubs(g, O, [[-.36, .1, .5], [.36, .1, .5]], .18, .5, 1.3);
      g.userData.head = [1.3, .95, .1]; return alive(g, eyes);
    },
    // ポトンウサ: a connect-four bunny — a yellow disc face with red disc ears, plopping into place
    plop() {
      const g = new T.Group(), Y = fuzz(0xffc928, { len: .035 }), R = fuzz(0xff4545, { len: .04 }), Bl = fur(0x2f78ff, .08), Wf = fur(0xffffff, .1);
      const body = ball(.55, Bl, .95); body.position.y = .58; g.add(body);
      [[-.22, .7], [.22, .45]].forEach(([x, y], i) => { const h = puck(.13, .06, C(i ? 0xff4545 : 0xffc928, { roughness: .3, clearcoat: .8 }), .5); h.rotation.x = Math.PI / 2; h.position.set(x, y, .58); g.add(h); });
      const head = puck(.88, .62, Y, .48); head.rotation.x = Math.PI / 2; head.position.set(0, 1.62, -.31); g.add(head);
      const rim = mesh(new T.TorusGeometry(.7, .045, 10, 48), C(0xffb800, { roughness: .5 })); rim.position.set(0, 1.62, .37); g.add(rim);
      [-1, 1].forEach(s => { const ch = tuft(Wf, 3, .32, .1, .5); ch.position.set(s * .86, 1.36, .12); ch.rotation.z = s * 2.0; g.add(ch); });   // white cheek fluff
      const eyes = face(g, flat(0, 1.66, .335), { eye: .28, gap: .35, iris: 0xff4545, mouth: 'grin', bx: .22, by: .3, lift: .04, asym: .06 });
      [-1, 1].forEach(s => {
        const e = new T.Group(); const d = puck(.3, .2, R, .5); d.rotation.x = Math.PI / 2; d.scale.set(1, 1, 1.9); e.add(d);
        const di = puck(.17, .2, fuzz(0xffb3b3), .5); di.rotation.x = Math.PI / 2; di.scale.set(1, 1, 1.75); di.position.z = .03; e.add(di);
        e.position.set(s * .42, 2.62, 0); e.rotation.z = -s * (s > 0 ? .5 : .2); if (s > 0) { e.position.set(.55, 2.55, 0); } g.add(e);   // one ear droops
      });
      const tl = ball(.2, Wf); tl.position.set(0, .5, -.55); g.add(tl);
      nubs(g, Bl, [[-.26, .08, .3], [.26, .08, .3]], .19);
      nubs(g, Bl, [[-.56, .7, .2], [.56, .74, .24]], .14, 1.1, 1);
      const drop = c4disc(0xff4545, .42); drop.position.set(1.08, 2.7, .1); drop.rotation.set(Math.PI / 2, 0, .4); g.add(drop);
      g.userData.head = [1.75, .92, 0]; return alive(g, eyes);
    },
    // マンカラビ: a fuzzy gem beetle (bumblebee-soft) — its shell is a wooden mancala pit full of gems
    gem() {
      const g = new T.Group(), wood = M({ map: X.wood('mon-gw', '#b97842', '#7a4a20'), roughness: .45, clearcoat: .5 }), skin = fur(0xe9a85e, .06, { freq: 44 }), dark = fuzz(0x5e3a1a), collar = fur(0xfff0d0, .1);
      const shell = ball(.95, wood, .5); shell.position.set(0, .6, -.35); g.add(shell);
      const pit = mesh(new T.CylinderGeometry(.66, .55, .12, 32), C(0x5a3416, { roughness: .8 })); pit.position.set(0, 1.05, -.35); g.add(pit);
      [0xff5d5d, 0x36b4ff, 0xffc928, 0x3ccf91, 0x8d6bff, 0xff7fbe].forEach((c, i) => { const a = i / 6 * Math.PI * 2 + .3, r = i % 2 ? .38 : .24; g.add(at(gem(c, .58), Math.cos(a) * r, .95 + (i % 3) * .05, Math.sin(a) * r - .35, i * .4, i, 0)); });
      g.add(at(gem(0xffc928, .7), 0, 1.12, -.4, .4, .3, 0));
      const cl = ball(.5, collar); cl.scale.set(1.3, .8, .7); cl.position.set(0, .62, .3); g.add(cl);   // fluffy collar
      const hc = V3(0, .9, .74), HR = [.68, .62, .58];
      const head = ball(1, skin); head.scale.set(...HR); head.position.copy(hc); g.add(head);
      const eyes = face(g, (u, v) => sph(hc, HR, u, v), { eye: .23, gap: .4, v: .12, iris: 0x2a9d5f, mouth: 'smile', fang: -1, bx: .18, by: .25, lift: .05, lid: .2, lidMat: skin, tilt: -.2, asym: .05 });
      [-1, 1].forEach(s => { const an = mesh(new T.CylinderGeometry(.03, .035, .5, 8), dark); an.position.set(s * .26, 1.64, .68); an.rotation.z = -s * (s > 0 ? .7 : .45); g.add(an); g.add(at(gem(s > 0 ? 0xff5d5d : 0x36b4ff, .4), s > 0 ? .46 : -.38, s > 0 ? 1.72 : 1.78, .68)); });
      for (let i = 0; i < 3; i++) [-1, 1].forEach(s => { const l = ball(.12, dark); l.scale.set(1.5, .5, .7); l.position.set(s * .86, .14, .25 - i * .42); g.add(l); });
      g.userData.head = [1.0, .74, .55]; return alive(g, eyes);
    },
    // ダイスン: a fluffy die puppy — its spots are the pips
    dice() { return dicepup(false); },
    // モリフク: a fluffy mill owl — the morris board is drawn on its downy belly
    owl() {
      const g = new T.Group(), P = fur(0x7552e0, .08, { freq: 30 }), lav = fur(0xd9ccff, .06), beak = C(0xffb21e, { roughness: .4 });
      const bc = V3(0, 1.02, 0), BR = [.98, 1.0, .9];
      const body = ball(1, P); body.scale.set(...BR); body.position.copy(bc); g.add(body);
      const bellyM = decal('mon-mill', 256, 256, (c, W) => {
        c.clearRect(0, 0, W, W); c.fillStyle = '#fff1d8'; c.beginPath(); c.ellipse(W / 2, W / 2, W / 2 - 6, W / 2 - 6, 0, 0, 7); c.fill();
        c.strokeStyle = '#4a2e8a'; c.lineWidth = 11; c.lineJoin = 'round'; c.strokeRect(58, 58, W - 116, W - 116); c.strokeRect(100, 100, W - 200, W - 200);
        c.beginPath(); c.moveTo(W / 2, 58); c.lineTo(W / 2, 100); c.moveTo(W / 2, W - 58); c.lineTo(W / 2, W - 100); c.moveTo(58, W / 2); c.lineTo(100, W / 2); c.moveTo(W - 58, W / 2); c.lineTo(W - 100, W / 2); c.stroke();
        [[58, 58, '#ffffff'], [W / 2, 58, '#ffffff'], [W - 58, 58, '#ffffff'], [100, W - 100, '#4a2e8a'], [W - 58, W / 2, '#4a2e8a']].forEach(([x, y, f]) => { c.fillStyle = f; c.strokeStyle = '#4a2e8a'; c.lineWidth = 6; c.beginPath(); c.arc(x, y, 18, 0, 7); c.fill(); c.stroke(); });
      });
      bellyM.transparent = false; bellyM.alphaTest = .5; bellyM.roughness = .92; bellyM.userData.fur = { len: .03, freq: 70, clump: .15 };   // short down that carries the drawing
      const belly = patch(V3(0, 1.02, .005), [1.07, 1.09, .99], 1.45, Math.PI / 2 + .45, 1.0, bellyM);
      g.add(belly);
      [-1, 1].forEach(s => { const d = ball(.42, lav); d.scale.set(1, .95, .45); d.position.set(s * .34, 1.5, .6); g.add(d); });
      const eyes = face(g, (u, v) => ({ p: V3(u, 1.5 + v, .79 - Math.abs(Math.abs(u) - .34) * .4), n: V3(0, 0, 1) }), { eye: .28, gap: .34, iris: 0xffb21e, mouth: 'none', bx: .26, by: .3, lift: .06, lid: .3, lidMat: P, tilt: .12, asym: .07, lidAsym: -.4 });
      const bk = mesh(new T.ConeGeometry(.11, .24, 12), beak); bk.rotation.x = Math.PI; bk.position.set(0, 1.26, .96); g.add(bk);
      [-1, 1].forEach(s => { const t = tuft(P, 3, .5, .14, .35); t.position.set(s * .56, 1.9, -.05); t.rotation.z = -s * (s > 0 ? .7 : .45); g.add(t); });   // ear tufts
      [-1, 1].forEach(s => { const w = ball(.4, fur(0x5e3fc4, .07)); w.scale.set(.3, .95, .75); w.position.set(s * .98, .98, -.02); w.rotation.z = s * .35; g.add(w); });
      nubs(g, beak, [[-.3, .06, .45], [.3, .06, .45]], .17, .5, 1.2);
      g.userData.head = [1.4, .95, .2]; return alive(g, eyes);
    },
    // チェッカニ: a hairy crab (毛ガニ) — a stacked "king" checker shell with a crown, fuzzy legs and claws
    crab() {
      const g = new T.Group(), R = fur(0xe94040, .06, { freq: 40 }), Rd = fur(0xc72f30, .07, { freq: 40 }), Wt = fur(0xffffff, .05);
      const s1 = checker(0xe94040, 1.45); s1.position.y = .24; g.add(s1);
      const s2 = checker(0xe94040, 1.45); s2.position.y = .66; g.add(s2);
      const sep = mesh(new T.TorusGeometry(.86, .035, 8, 48), C(0x8a1c22)); sep.rotation.x = Math.PI / 2; sep.position.y = .64; g.add(sep);
      const cr = crown(C(0xffd23a, { roughness: .2, metalness: .3, clearcoat: 1 }), C(0x36b4ff, { roughness: .1, clearcoat: 1 }), .8); cr.position.set(0, 1.0, -.1); cr.scale.setScalar(.95); g.add(cr);
      const eyes = [];
      [-1, 1].forEach(s => {
        const st = mesh(new T.CylinderGeometry(.08, .1, .55, 12), R); st.position.set(s * .48, 1.3, .48); st.rotation.z = -s * (s > 0 ? .4 : .25); g.add(st);
        const ec = V3(s * (s > 0 ? .66 : .6), s > 0 ? 1.62 : 1.68, .52); const eb = ball(.33, Wt); eb.position.copy(ec); g.add(eb);
        const e = eye(s > 0 ? .25 : .27, 0xff4545, { lid: s > 0 ? .25 : 0, lidMat: Wt }); stick(g, e, sph(ec, .33, 0, .05), .0); eyes.push(e);
      });
      const fc = V3(0, .66, 0), FR = [.88, .5, .88];
      face(g, (u, v) => sph(fc, FR, u, v), { noEyes: true, eye: .22, gap: .3, v: .1, mouth: 'grin', bx: .12, by: .1, my: .2 });
      [-1, 1].forEach(s => {
        const arm = ball(.15, Rd); arm.scale.set(1.8, .8, .8); arm.position.set(s * 1.0, .62, .25); g.add(arm);
        const cl = ball(.32, R); cl.scale.set(1, .85, .85); cl.position.set(s * 1.27, .84, .35); g.add(cl);
        const cu = ball(.19, R); cu.scale.set(.8, 1.1, .8); cu.position.set(s * 1.38, 1.15, .38); cu.rotation.z = s * .5; g.add(cu);
        for (let i = 0; i < 3; i++) { const l = ball(.11, Rd); l.scale.set(2.2, .55, .7); l.position.set(s * .98, .12, -.1 - i * .3); l.rotation.y = s * (.2 + i * .25); g.add(l); }
      });
      g.userData.head = [1.15, .95, .3]; return alive(g, eyes);
    },
    // キンダイスン: the rare golden die puppy
    gold() { return dicepup(true); },
  };
  const MONS = {};
  Object.keys(RAW).forEach(id => { MONS[id] = () => furify(RAW[id]()); });
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
