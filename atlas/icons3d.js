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
  function taflPiece(hex, s = 1, king = false) {
    const g = new T.Group(), m = C(hex, { roughness: .3 }), h = king ? 1.5 : 1.05, k = .5;
    const pts = [[0, 0], [k, 0], [k * 1.04, h * .1], [k * .9, h * .24], [k * .6, h * .46], [k * .5, h * .64], [k * .62, h * .76], [k * .5, h * .88], [k * .26, h * .98], [0, h]];
    g.add(mesh(new T.LatheGeometry(pts.map(([a, b]) => new T.Vector2(Math.max(.001, a), b)), 40), m));
    if (king) { const cr = new T.Group(), gm = gloss(0xf2c94c), band = mesh(new T.CylinderGeometry(.24, .27, .16, 32, 1, true), gm); band.material.side = T.DoubleSide; cr.add(band);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, c = mesh(new T.ConeGeometry(.06, .2, 12), gm); c.position.set(Math.cos(a) * .25, .16, Math.sin(a) * .25); cr.add(c); }
      cr.position.y = h * .9; g.add(cr); }
    g.scale.setScalar(s); return g;
  }
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
  function xqPiece(ch, red, s = 1, turn = 0) {
    const g = new T.Group(), ink = red ? '#9a140d' : '#15110e';
    g.add(puck(.62, .34, C(0xe2bb7c, { roughness: .4 }), .38));
    const face = M({ map: X.canvasTex('ic-xq' + ch, 256, 256, (c, W) => { const r = W / 2, gr = c.createRadialGradient(r * .8, r * .7, 10, r, r, r); gr.addColorStop(0, '#fbe8c2'); gr.addColorStop(1, '#e8c286'); c.fillStyle = gr; c.fillRect(0, 0, W, W); c.strokeStyle = ink; c.lineWidth = 11; c.beginPath(); c.arc(r, r, r * .8, 0, 7); c.stroke(); c.fillStyle = ink; c.font = '900 138px "Shippori Mincho B1","Noto Serif CJK SC","Noto Serif CJK JP",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, r, r + 8); }), roughness: .45 });
    const top = mesh(new T.CircleGeometry(.52, 44), face); top.rotation.set(-Math.PI / 2, 0, turn); top.position.y = .342; top.castShadow = false; g.add(top);
    g.scale.setScalar(s); return g;
  }
  // a Gzhel porcelain piece (ugolki): glazed puck, the face painted with a cobalt (or white) eight-stroke rose, a band and a dot ring
  function gzhelPiece(white, s = 1) {
    const g = new T.Group(), body = white ? 0xf3f6fd : 0x1d47a6;
    g.add(puck(.62, .3, C(body, { roughness: .16 }), .38));
    const face = M({ map: X.canvasTex('ic-gz' + (white ? 'w' : 'b'), 256, 256, (c, W) => {
      const r = W / 2, ink = white ? ['#0f2f86', '#2152b5', '#86a3e2'] : ['#ffffff', '#e8eefb', '#9fb6e6'];
      const gr = c.createRadialGradient(r * .8, r * .7, 8, r, r, r); gr.addColorStop(0, white ? '#ffffff' : '#3561c4'); gr.addColorStop(1, white ? '#e6ecf8' : '#173c96');
      c.fillStyle = gr; c.fillRect(0, 0, W, W);
      c.strokeStyle = ink[1]; c.lineWidth = 9; c.beginPath(); c.arc(r, r, r * .8, 0, 7); c.stroke();
      c.fillStyle = ink[1]; for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; c.beginPath(); c.arc(r + Math.cos(a) * r * .9, r + Math.sin(a) * r * .9, 3.2, 0, 7); c.fill(); }
      const petal = (len, wid, rot) => { c.save(); c.translate(r, r); c.rotate(rot); const lg = c.createLinearGradient(-wid, 0, wid, 0); lg.addColorStop(0, ink[0]); lg.addColorStop(.55, ink[1]); lg.addColorStop(1, ink[2]); c.fillStyle = lg;
        c.beginPath(); c.moveTo(0, -6); c.bezierCurveTo(-wid * 1.3, -len * .3, -wid, -len * .8, 0, -len); c.bezierCurveTo(wid, -len * .8, wid * 1.3, -len * .3, 0, -6); c.fill(); c.restore(); };
      for (let k = 0; k < 8; k++) petal(r * .66, r * .2, k * Math.PI / 4);
      c.fillStyle = white ? '#f6f8fe' : '#2a56b8'; c.beginPath(); c.arc(r, r, r * .22, 0, 7); c.fill();
      for (let k = 0; k < 5; k++) petal(r * .3, r * .09, k * 2 * Math.PI / 5 + .4);
      c.fillStyle = ink[0]; c.beginPath(); c.arc(r, r, r * .07, 0, 7); c.fill();
    }), roughness: .15 });
    const top = mesh(new T.CircleGeometry(.5, 48), face); top.rotation.x = -Math.PI / 2; top.position.y = .302; top.castShadow = false; g.add(top);
    g.scale.setScalar(s); return g;
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
    alquerque() {   // a rug board fragment (crimson, gold lines with diagonals), brass and lapis coins, one brass coin mid-jump
      const top = M({ map: X.canvasTex('icg-alq', 512, 512, (g, W) => {
        g.fillStyle = '#9a1f22'; g.fillRect(0, 0, W, W);
        g.strokeStyle = '#6a1418'; g.lineWidth = 26; g.strokeRect(13, 13, W - 26, W - 26);
        g.strokeStyle = '#e2b254'; g.lineWidth = 6; g.strokeRect(34, 34, W - 68, W - 68);
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r1 = W * .2, r2 = W * .09; g.fillStyle = 'rgba(70,20,60,.55)'; g.beginPath(); g.moveTo(W / 2, W / 2); g.lineTo(W / 2 + Math.cos(a - .3) * r2, W / 2 + Math.sin(a - .3) * r2); g.lineTo(W / 2 + Math.cos(a) * r1, W / 2 + Math.sin(a) * r1); g.lineTo(W / 2 + Math.cos(a + .3) * r2, W / 2 + Math.sin(a + .3) * r2); g.fill(); }
        const pad = W / 6, st = (W - 2 * pad) / 2, P = i => pad + i * st;
        g.strokeStyle = '#f3dfae'; g.lineWidth = 12; g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(P(i), P(0)); g.lineTo(P(i), P(2)); g.stroke(); g.beginPath(); g.moveTo(P(0), P(i)); g.lineTo(P(2), P(i)); g.stroke(); }
        g.beginPath(); g.moveTo(P(0), P(0)); g.lineTo(P(2), P(2)); g.moveTo(P(2), P(0)); g.lineTo(P(0), P(2)); g.stroke();
        g.fillStyle = '#e9c46a'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc(P(i), P(j), 14, 0, Math.PI * 2); g.fill(); }
      }), roughness: .85 });
      const g = boardChunk(3, 3.6, top, C(0x5e1416, { roughness: .7 }));
      const coin = (lapis, s) => { const c = new T.Group(); c.add(puck(.6, .22, C(lapis ? 0xd2a24c : 0xd9a84e, { roughness: .45, metalness: .25 }), .4));
        const face = mesh(new T.CircleGeometry(lapis ? .44 : .5, 40), lapis ? C(0x253c8e, { roughness: .5 }) : C(0xe6b85c, { roughness: .45, metalness: .25 })); face.rotation.x = -Math.PI / 2; face.position.y = .225; c.add(face);
        const star = new T.Shape(); for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8, r = k % 2 ? .13 : .3; const x = Math.cos(a) * r, y = Math.sin(a) * r; k ? star.lineTo(x, y) : star.moveTo(x, y); }
        const sm = mesh(new T.ShapeGeometry(star), C(lapis ? 0xf0c45a : 0xb07a26, { roughness: .4, metalness: .3 })); sm.rotation.x = -Math.PI / 2; sm.position.y = .23; c.add(sm);
        c.scale.setScalar(s); return c; };
      const S = 3.1 / 3 * 1.06, p = i => (i - 1) * S;
      g.add(at(coin(true, .78), p(0), .5, p(0)), at(coin(false, .78), p(0), .5, p(2)), at(coin(false, .78), p(2), .5, p(2)), at(coin(true, .78), p(1), .5, p(1)));
      g.add(at(coin(false, 1.25), .45, 2.05, -.3, .55, 0, .3));   // a brass coin jumping over the centre
      return g;
    },
    gomoku() {
      const g = boardChunk(4, 3.8, gridMat('gm', '#efc173', '#3a2410', 4, { points: true, lw: 9 }), M({ map: X.wood('icw2', '#e2ad5c', '#a87430') }), null, .7);
      const st = (3.8 - .3 - 3.5 / 4) / 3, p = i => -(st * 1.5) + st * i;
      [[0, 3, 1], [1, 2, 1], [2, 1, 1], [1, 1, 0], [2, 2, 0], [3, 3, 0]].forEach(([x, z, b]) => g.add(at(goStone(!!b, .78), p(x), .7, p(z))));
      g.add(at(goStone(true, 1.15), p(3) + .1, 1.9, p(0) - .1, .5, 0, -.3));
      return g;
    },
    hex() {
      // the same chunky square block as the other games (not the wide rhombus board): a honeycomb inlay with red
      // edges far / near and blue sides, a red chain, a blue stone, and the red stone that connects dropping in
      const S3 = Math.sqrt(3), W = 512, m = 46, R = 70, cw = S3 * R, ox = (W - 3.5 * cw) / 2 + cw / 2, oy = (W - 5 * R) / 2 + R;
      const cpt = (r, c) => [ox + cw * (c + (r % 2) * .5), oy + 1.5 * R * r];   // canvas centre of cell (row r, col c), 3 × 3
      const top = M({ map: X.canvasTex('ichx', W, W, (c2) => {
        c2.drawImage(X.wood('ichxw', '#7a4a28', '#331b0c').image, 0, 0, W, W);
        c2.lineCap = 'round'; c2.lineWidth = 22;
        c2.strokeStyle = '#d8342a'; [m * .5, W - m * .5].forEach(y => { c2.beginPath(); c2.moveTo(m, y); c2.lineTo(W - m, y); c2.stroke(); });
        c2.strokeStyle = '#2a6fd6'; [m * .5, W - m * .5].forEach(x => { c2.beginPath(); c2.moveTo(x, m); c2.lineTo(x, W - m); c2.stroke(); });
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
          const [x, y] = cpt(r, c); c2.beginPath();
          for (let j = 0; j < 6; j++) { const a = Math.PI / 180 * (60 * j - 90); c2[j ? 'lineTo' : 'moveTo'](x + Math.cos(a) * R * .94, y + Math.sin(a) * R * .94); }
          c2.closePath(); const alt = (r + 2 * c) % 3 === 0; c2.fillStyle = alt ? '#ecd3a2' : '#f6e4bd'; c2.fill(); c2.lineWidth = 4; c2.strokeStyle = 'rgba(60,34,12,.75)'; c2.stroke();
        }
      }), roughness: .45 });
      const g = boardChunk(4, 3.6, top, M({ map: X.wood('ichxs', '#6a3f22', '#2a160a') }));
      const wp = (r, c) => { const [x, y] = cpt(r, c); return [(x / W - .5) * 3.1, (y / W - .5) * 3.1]; };
      const RED = gloss(0xd2301f), BLUE = gloss(0x2463c9), stone = (mat, s) => { const p = puck(.5, .28, mat, .45); p.scale.setScalar(s); return p; };
      [[0, 1, RED], [2, 0, RED], [1, 1, BLUE], [2, 2, BLUE]].forEach(([r, c, mt]) => { const [x, z] = wp(r, c); g.add(at(stone(mt, .66), x, .5, z)); });
      const [bx, bz] = wp(1, 0); g.add(at(stone(RED, 1.3), bx + .15, 1.95, bz - .1, .45, 0, -.3));   // the connecting stone, dropping in
      return g;
    },
    go() {
      // 5 lines of a kaya board: a white stone in atari, the capturing black stone dropping onto its last liberty
      const g = boardChunk(5, 3.8, gridMat('go', '#d9a14e', '#2a1a0a', 5, { points: true, lw: 7 }), M({ map: X.wood('icgo', '#c8904a', '#7e5222') }), null, .7);
      const st = 3.3 * 4 / 5 / 4, p = i => -st * 2 + st * i, S = .64;
      [[2, 2, 0], [1, 2, 1], [2, 1, 1], [3, 2, 1], [1, 3, 0], [3, 3, 0], [3, 1, 0], [0, 1, 1]].forEach(([x, z, b]) => g.add(at(goStone(!!b, S), p(x), .7, p(z))));
      g.add(at(goStone(true, .95), p(2), 2.75, p(3), .35, 0, -.2));
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
    checkers() {
      const g = boardChunk(3, 3.6, gridMat('ck2', '#f4f1ea', '#f4f1ea', 3, { check: '#1d1d20' }), M({ map: X.wood('ickw', '#7a4a2a', '#4a2a12') }));
      const S = 3.3 / 3, p = i => -1.65 + S * (i + .5);
      g.add(at(checker(0xf6f2ea, .72), p(0), .5, p(1))); g.add(at(checker(0xc8202a, .72), p(2), .5, p(1))); g.add(at(checker(0xc8202a, .72), p(1), .5, p(2)));
      // the crowned king: two stacked red checkers with a gold crown, jumping
      const k = new T.Group(); k.add(at(checker(0xc8202a, 1), 0, 0, 0)); k.add(at(checker(0xc8202a, 1), 0, .3, 0));
      const gold = gloss(0xf2c94c), band = mesh(new T.CylinderGeometry(.3, .32, .14, 32, 1, true), gold); band.position.y = .66; k.add(band);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, c = mesh(new T.ConeGeometry(.075, .2, 12), gold); c.position.set(Math.cos(a) * .3, .82, Math.sin(a) * .3); k.add(c); }
      k.scale.setScalar(1.45); g.add(at(k, .3, 2.0, -.3, .45, 0, -.3));
      return g;
    },
    ugolki() {   // a corner of a Gzhel board (white porcelain / cobalt, cobalt side band); a white porcelain piece hops over a cobalt one into the house
      const g = boardChunk(3, 3.6, gridMat('ugz2', '#f3f6fd', '#f3f6fd', 3, { check: '#163a94' }), C(0x1d3f9a, { roughness: .25 }));
      const band = rbox(3.66, .09, 3.66, .32, gloss(0xf3f6fd)); band.position.y = .16; g.add(band);
      const S = 3.3 / 3, p = i => -1.65 + S * (i + .5);
      const white = s => gzhelPiece(true, s);
      const blue = s => gzhelPiece(false, s);
      g.add(at(white(.72), p(0), .5, p(2))); g.add(at(blue(.72), p(1), .5, p(1))); g.add(at(white(.72), p(2), .5, p(0)));
      // the big piece mid-jump over the cobalt one, a dotted cobalt arc under it
      g.add(at(white(1.35), p(1) - .15, 1.85, p(1) - .25, .35, 0, -.25));
      for (let i = 0; i < 5; i++) { const t = (i + 1) / 6, d = ball(.06, gloss(0x2a56b8)); d.position.set(p(0) + (p(2) - p(0)) * t, .62 + Math.sin(t * Math.PI) * 1.1, p(2) + (p(0) - p(2)) * t); g.add(d); }
      return g;
    },
    agon() {   // a fragment of the painted folk Agon board (sage ground, red / black / mustard / cream hexes round the dark throne); the hexagonal queen with a gold crown steps onto the throne past a guard
      const top = M({ map: X.canvasTex('icag', 512, 512, (c, W) => {
        c.fillStyle = '#87916b'; c.fillRect(0, 0, W, W);
        const R = W / 6.2, hex = (x, y, col) => { c.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; c[k ? 'lineTo' : 'moveTo'](x + R * .94 * Math.cos(a), y + R * .94 * Math.sin(a)); } c.closePath(); c.fillStyle = col; c.fill(); c.strokeStyle = '#141412'; c.lineWidth = 5; c.stroke(); };
        const cx = W / 2, cy = W / 2, dx = R * Math.sqrt(3), dy = R * 1.5;
        const cells = [[0, 0, '#232a1c'], [1, 0, '#a32a22'], [-1, 0, '#1d1b17'], [.5, -1, '#1d1b17'], [-.5, -1, '#a32a22'], [.5, 1, '#a32a22'], [-.5, 1, '#1d1b17'],
          [2, 0, '#cc9426'], [-2, 0, '#e6dcc4'], [1.5, -1, '#e6dcc4'], [-1.5, -1, '#cc9426'], [1.5, 1, '#cc9426'], [-1.5, 1, '#e6dcc4'], [1, -2, '#cc9426'], [0, -2, '#e6dcc4'], [-1, -2, '#cc9426'], [1, 2, '#e6dcc4'], [0, 2, '#cc9426'], [-1, 2, '#e6dcc4']];
        cells.forEach(([q, r, col]) => hex(cx + q * dx, cy + r * dy, col));
      }), roughness: .62 });
      const g = boardChunk(3, 3.6, top, C(0x1b2d2a, { roughness: .6 }));
      const hexPc = (col, rim, s) => { const p = new T.Group(); const body = mesh(new T.CylinderGeometry(.62, .66, .32, 6, 1), C(col, { roughness: .35 })); body.rotation.y = Math.PI / 6; body.position.y = .16; p.add(body);
        const lip = mesh(new T.CylinderGeometry(.5, .6, .08, 6, 1), C(rim, { roughness: .35 })); lip.rotation.y = Math.PI / 6; lip.position.y = .36; p.add(lip); p.scale.setScalar(s); return p; };
      const guard = (col, ring, s) => { const p = new T.Group(); p.add(puck(.6, .28, C(col, { roughness: .35 }), .45)); const r = mesh(new T.TorusGeometry(.38, .05, 10, 40), C(ring, { roughness: .35 })); r.rotation.x = Math.PI / 2; r.position.y = .29; p.add(r); p.scale.setScalar(s); return p; };
      g.add(at(guard(0xefe6d2, 0xa32a22, .62), .95, .5, -.55)); g.add(at(guard(0x231a15, 0xc8952e, .62), -.95, .5, .55)); g.add(at(guard(0xefe6d2, 0xa32a22, .62), -.95, .5, -.55));
      // the big queen mid-step onto the throne: an ivory hexagon with a gold crown
      const qn = hexPc(0xf2ead6, 0xc9b892, 1);
      const cr = crown(gloss(0xf2c94c), gloss(0xc0392b), .78); cr.position.y = .4; qn.add(cr);
      qn.scale.setScalar(1.5); g.add(at(qn, .15, 1.85, .05, .32, 0, -.22));
      return g;
    },
    tafl() {   // a corner of the hnefatafl board: the king steps onto the knotted corner square, attackers too late
      const top = M({ map: X.canvasTex('ictf', 512, 512, (c, W) => {
        c.drawImage(X.wood('ictfw', '#d4a66a', '#8a5e34').image, 0, 0, W, W); const s = W / 3;
        c.fillStyle = 'rgba(70,36,14,.55)'; c.fillRect(2 * s + 8, 8, s - 16, s - 16);
        c.strokeStyle = 'rgba(244,214,160,.95)'; c.lineWidth = 12; c.lineCap = 'round'; const cx = 2.5 * s, cy = .5 * s, r = s * .3;
        c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.beginPath(); c.arc(cx, cy, r * .42, 0, 7); c.stroke();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * .42, cy + Math.sin(a) * r * .42); c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); c.stroke(); }
        c.strokeStyle = '#3a200c'; c.lineWidth = 10; for (let i = 1; i < 3; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, W); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(W, i * s); c.stroke(); }
      }), roughness: .5 });
      const g = boardChunk(3, 3.6, top, M({ map: X.wood('ictfs', '#5a3a22', '#2a180c') }));
      const S = 3.3 / 3, p = i => -1.65 + S * (i + .5);
      g.add(at(taflPiece(0x3a2418, .68), p(0), .5, p(0))); g.add(at(taflPiece(0x3a2418, .68), p(1), .5, p(2)));
      g.add(at(taflPiece(0xf2e6cc, .68), p(0), .5, p(2)));
      g.add(at(taflPiece(0xf2e6cc, 1.25, true), p(2) - .15, 1.05, p(0) + .25, -.2, 0, -.22));   // the king, arriving
      return g;
    },
    xiangqi() {
      // a corner of the board (lines on the points) with two small pieces; the big red general (帥) hops in
      const g = boardChunk(3, 3.6, gridMat('xq', '#f0c77e', '#3d220c', 3, { points: true, lw: 9 }), M({ map: X.wood('icxq', '#c98f4b', '#8a5626') }));
      const q = k => -1.033 + 1.033 * k, tw = -Math.PI / 4;
      g.add(at(xqPiece('卒', false, .62, tw), q(2), .5, q(1)));
      g.add(at(xqPiece('馬', false, .62, tw), q(0), .5, q(0)));
      g.add(at(xqPiece('兵', true, .62, tw), q(0), .5, q(2)));
      g.add(at(xqPiece('帥', true, 1.25, tw), -.1, 1.9, -.25, .42, 0, -.25));
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
    speedsudoku() {
      const g = new T.Group(), cols = ['#ffffff', '#ffe2cc', '#ffffff', '#fff3c4'], nums = [1, '', 3, 2];
      for (let i = 0; i < 4; i++) { const x = (i % 2 - .5) * 1.15, z = ((i / 2 | 0) - .5) * 1.15; g.add(at(nums[i] ? numTile(nums[i], 1.05, cols[i]) : rbox(1.05, .5, 1.05, .18, C(parseInt(cols[i].slice(1), 16))), x, 0, z)); }
      g.add(at(numTile(4, 1.15, '#ff7a3d', '#ffffff'), -.25, 1.6, -.1, .35, .3, -.2));
      const sh = new T.Shape(); [[.35, 1.25], [-.5, -.05], [-.02, -.05], [-.3, -1.25], [.55, .18], [.07, .18]].forEach(([x, y], k) => (k ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
      const bolt = mesh(new T.ExtrudeGeometry(sh, { depth: .28, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 4 }), gloss(0xffcd3c));
      g.add(at(bolt, 1.35, 1.25, .7, 0, -.5, -.15));
      return g;
    },
    samegame() {   // a 3×3 patch of patterned mid-century blocks; an orange pair pops up
      const g0 = new T.Group();
      const COL = ['#e8b83a', '#2e6f8e', '#d9622b', '#7a8b3a', '#d98c7a'];
      const blk = k => {
        const tex = X.canvasTex('ic-sg' + k, 256, 256, (c, W) => {
          c.fillStyle = COL[k]; c.fillRect(0, 0, W, W); c.fillStyle = c.strokeStyle = 'rgba(242,234,219,.9)'; c.lineWidth = 20; const m = W / 2;
          if (k === 0) { c.beginPath(); c.arc(m, m, 52, 0, 7); c.fill(); }
          else if (k === 1) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(48, 68 + i * 60); c.lineTo(208, 68 + i * 60); c.stroke(); }
          else if (k === 2) { c.beginPath(); c.moveTo(m, 56); c.lineTo(200, 192); c.lineTo(56, 192); c.closePath(); c.fill(); }
          else if (k === 3) { c.beginPath(); c.moveTo(m, 52); c.lineTo(204, m); c.lineTo(m, 204); c.lineTo(52, m); c.closePath(); c.fill(); }
          else { c.beginPath(); c.arc(m, m, 66, 0, 7); c.stroke(); c.beginPath(); c.arc(m, m, 24, 0, 7); c.fill(); }
        });
        const b = rbox(1, .6, 1, .18, C(parseInt(COL[k].slice(1), 16), { roughness: .35 }));
        const top = mesh(new T.PlaneGeometry(.8, .8), M({ map: tex, roughness: .45 })); top.rotation.x = -Math.PI / 2; top.position.y = .605;
        return grp(b, top);
      };
      const B = [0, 1, 1, 3, -1, 1, 3, 4, 0];
      for (let i = 0; i < 9; i++) { if (B[i] < 0) continue; const x = (i % 3 - 1) * 1.12, z = ((i / 3 | 0) - 1) * 1.12; g0.add(at(blk(B[i]), x, 0, z)); }
      g0.add(at(blk(2), -.15, 1.55, -.05, .4, .35, -.25));
      const b2 = blk(2); b2.scale.setScalar(.75); g0.add(at(b2, .95, 2.35, -.5, -.5, .6, .4));
      return g0;
    },
    solitaire() {   // chunky toy playing cards fanned on green baize; the Ace of spades pops up
      const g0 = new T.Group();
      const faceTex = (k, r, s) => X.canvasTex('ic-sol' + k, 256, 352, (c, W, H) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); const red = s === 1 || s === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
        c.font = 'bold 96px Georgia, serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText(r, 20, 14);
        c.font = '230px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠♥♦♣'[s], W / 2 + 10, H * .6);
      });
      const backTex = X.canvasTex('ic-solb', 256, 352, (c, W, H) => { c.fillStyle = '#a51e2f'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 5; for (let i = -H; i < W + H; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + H, H); c.stroke(); c.beginPath(); c.moveTo(i + H, 0); c.lineTo(i, H); c.stroke(); } c.strokeStyle = '#fbf3e2'; c.lineWidth = 14; c.strokeRect(14, 14, W - 28, H - 28); });
      const edge = C(0xf3ead6, { roughness: .4 }), bk = M({ map: backTex, roughness: .45 });
      const card = (top) => { const b = rbox(1.5, .16, 2.1, .12, edge); const f = mesh(new T.PlaneGeometry(1.36, 1.96), top); f.rotation.x = -Math.PI / 2; f.position.y = .165; return grp(b, f); };
      g0.add(at(card(bk), -.55, 0, .2, 0, .35, 0));
      g0.add(at(card(M({ map: faceTex('h', 'K', 1), roughness: .4 })), .1, .17, .1, 0, -.05, 0));
      g0.add(at(card(M({ map: faceTex('d', 'Q', 2), roughness: .4 })), .65, .34, .25, 0, -.42, 0));
      g0.add(at(card(M({ map: faceTex('s', 'A', 0), roughness: .35 })), -.1, 1.75, -.35, 1.05, .35, -.18));
      return g0;
    },
    baccarat() {   // a wine-red baccarat felt with ivory printed arcs: a natural 9 (9 + K) leaning on gold / red / black chip stacks
      const g0 = new T.Group();
      // felt print on top of the plinth: wine-red baize, ivory arcs (Tie / Banker / Player) and a fine ivory border
      const feltTex = X.canvasTex('ic-bcf', 512, 512, (c, W) => {
        const r = 40; c.beginPath(); c.moveTo(r, 0); c.arcTo(W, 0, W, W, r); c.arcTo(W, W, 0, W, r); c.arcTo(0, W, 0, 0, r); c.arcTo(0, 0, W, 0, r); c.closePath();
        const gr = c.createRadialGradient(W * .5, W * .4, 20, W * .5, W * .5, W * .75); gr.addColorStop(0, '#8a2a3c'); gr.addColorStop(1, '#3d0f1a'); c.fillStyle = gr; c.fill();
        c.strokeStyle = '#efe3cf'; c.lineWidth = 5; c.save(); c.translate(14, 14); c.scale((W - 28) / W, (W - 28) / W); c.stroke(); c.restore();
        c.strokeStyle = '#f3e8d6'; c.lineWidth = 10; [360, 410, 460].forEach(rr => { c.beginPath(); c.arc(0, W, rr, -.5 * Math.PI, 0); c.stroke(); });
      });
      const top = mesh(new T.PlaneGeometry(3.86, 3.86), M({ map: feltTex, transparent: true, roughness: .85 })); top.rotation.x = -Math.PI / 2; top.position.y = .006; top.receiveShadow = true; g0.add(top);
      const faceTex = (k, r, su) => X.canvasTex('ic-bc' + k, 256, 352, (c, W, H) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); const red = su === 1 || su === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
        c.font = 'bold 104px Georgia, serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText(r, 18, 12);
        c.font = '220px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠♥♦♣'[su], W / 2 + 12, H * .62);
        c.strokeStyle = '#c9a44c'; c.lineWidth = 6; c.strokeRect(8, 8, W - 16, H - 16);
      });
      const edge = C(0xf3ead6, { roughness: .4 });
      const card = (mt) => { const b = rbox(1.4, .14, 1.96, .12, edge); const f = mesh(new T.PlaneGeometry(1.26, 1.82), mt); f.rotation.x = -Math.PI / 2; f.position.y = .145; return grp(b, f); };
      const chipTex = (k, body, ins, inl) => X.canvasTex('ic-bcc' + k, 256, 256, (c, W, H) => {
        c.fillStyle = body; c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, 7); c.fill();
        c.fillStyle = ins; for (let i = 0; i < 8; i++) { c.save(); c.translate(W / 2, H / 2); c.rotate(i * Math.PI / 4); c.fillRect(-14, -W / 2, 28, 34); c.restore(); }
        c.fillStyle = inl; c.beginPath(); c.arc(W / 2, H / 2, W * .3, 0, 7); c.fill();
        c.strokeStyle = body; c.lineWidth = 6; c.setLineDash([12, 8]); c.beginPath(); c.arc(W / 2, H / 2, W * .25, 0, 7); c.stroke();
      });
      const chipM = (hex) => C(hex, { roughness: .25, metalness: hex === 0xd4ad55 ? .45 : 0 });
      const chip = (k, body, ins, inl, hex) => { const p = puck(.62, .2, chipM(hex), .35); const t = mesh(new T.CircleGeometry(.56, 40), M({ map: chipTex(k, body, ins, inl), roughness: .3, metalness: hex === 0xd4ad55 ? .35 : 0 })); t.rotation.x = -Math.PI / 2; t.position.y = .203; return grp(p, t); };
      const stack = (k, body, ins, inl, hex, n, x, z) => { for (let i = 0; i < n; i++) g0.add(at(chip(k, body, ins, inl, hex), x + (i % 2 ? .03 : -.02), i * .2, z + (i % 3 === 1 ? .03 : 0), 0, i * .7, 0)); };
      stack('g', '#d4ad55', '#fff4d6', '#f7efd9', 0xd4ad55, 5, .55, -.6);
      stack('r', '#a3182c', '#f3e3b8', '#f6f1e4', 0xa3182c, 3, 1.15, .45);
      stack('k', '#1c1d22', '#d4ad55', '#f6f1e4', 0x1c1d22, 2, .55, 1.05);
      // a natural 9: the 9 of hearts and the king of spades, leaning on the gold stack
      g0.add(at(card(M({ map: faceTex('ks', 'K', 0), roughness: .35 })), -.85, 0, .35, 0, .55, 0));
      g0.add(at(card(M({ map: faceTex('9h', '9', 1), roughness: .35 })), -.3, .15, .55, 0, .12, 0));
      return g0;
    },
    blackjack() {   // a deep-teal blackjack felt: ivory printed arcs and a gold betting circle, a blackjack (A♠ + K♥) and black / gold chip stacks
      const g0 = new T.Group();
      const feltTex = X.canvasTex('ic-bjf', 512, 512, (c, W) => {
        const r = 40; c.beginPath(); c.moveTo(r, 0); c.arcTo(W, 0, W, W, r); c.arcTo(W, W, 0, W, r); c.arcTo(0, W, 0, 0, r); c.arcTo(0, 0, W, 0, r); c.closePath();
        const gr = c.createRadialGradient(W * .5, W * .4, 20, W * .5, W * .5, W * .75); gr.addColorStop(0, '#1f7a72'); gr.addColorStop(1, '#0b3a3a'); c.fillStyle = gr; c.fill();
        c.strokeStyle = '#efe3cf'; c.lineWidth = 5; c.save(); c.translate(14, 14); c.scale((W - 28) / W, (W - 28) / W); c.stroke(); c.restore();
        // the printed arcs of the table (BLACKJACK PAYS 3 TO 2 / INSURANCE)
        c.strokeStyle = 'rgba(243,232,214,.85)'; c.lineWidth = 9; c.beginPath(); c.arc(W / 2, -W * .55, W * 1.02, .32 * Math.PI, .68 * Math.PI); c.stroke();
        c.lineWidth = 26; c.strokeStyle = 'rgba(243,232,214,.22)'; c.beginPath(); c.arc(W / 2, -W * .55, W * 1.12, .34 * Math.PI, .66 * Math.PI); c.stroke();
        // gold betting circle
        c.strokeStyle = '#e0aa48'; c.lineWidth = 8; c.beginPath(); c.arc(W * .72, W * .76, 74, 0, 7); c.stroke();
      });
      const top = mesh(new T.PlaneGeometry(3.86, 3.86), M({ map: feltTex, transparent: true, roughness: .85 })); top.rotation.x = -Math.PI / 2; top.position.y = .006; top.receiveShadow = true; g0.add(top);
      const faceTex = (k, r, su) => X.canvasTex('ic-bj' + k, 256, 352, (c, W, H) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); const red = su === 1 || su === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
        c.font = 'bold 104px Georgia, serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText(r, 18, 12);
        c.font = '220px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠♥♦♣'[su], W / 2 + 12, H * .62);
      });
      const edge = C(0xf3ead6, { roughness: .4 });
      const card = (mt) => { const b = rbox(1.4, .14, 1.96, .12, edge); const f = mesh(new T.PlaneGeometry(1.26, 1.82), mt); f.rotation.x = -Math.PI / 2; f.position.y = .145; return grp(b, f); };
      const chipTex = (k, body, ins, inl) => X.canvasTex('ic-bjc' + k, 256, 256, (c, W, H) => {
        c.fillStyle = body; c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, 7); c.fill();
        c.fillStyle = ins; for (let i = 0; i < 8; i++) { c.save(); c.translate(W / 2, H / 2); c.rotate(i * Math.PI / 4); c.fillRect(-14, -W / 2, 28, 34); c.restore(); }
        c.fillStyle = inl; c.beginPath(); c.arc(W / 2, H / 2, W * .3, 0, 7); c.fill();
        c.strokeStyle = body; c.lineWidth = 6; c.setLineDash([12, 8]); c.beginPath(); c.arc(W / 2, H / 2, W * .25, 0, 7); c.stroke();
      });
      const chipM = (hex) => C(hex, { roughness: .25, metalness: hex === 0xd9a93a ? .45 : 0 });
      const chip = (k, body, ins, inl, hex) => { const p = puck(.62, .2, chipM(hex), .35); const t = mesh(new T.CircleGeometry(.56, 40), M({ map: chipTex(k, body, ins, inl), roughness: .3, metalness: hex === 0xd9a93a ? .35 : 0 })); t.rotation.x = -Math.PI / 2; t.position.y = .203; return grp(p, t); };
      const stack = (k, body, ins, inl, hex, n, x, z) => { for (let i = 0; i < n; i++) g0.add(at(chip(k, body, ins, inl, hex), x + (i % 2 ? .03 : -.02), i * .2, z + (i % 3 === 1 ? .03 : 0), 0, i * .7, 0)); };
      stack('k', '#23262e', '#e8c66e', '#f1ede2', 0x23262e, 5, .55, -.6);
      stack('y', '#d9a93a', '#2a1f08', '#fbf3dc', 0xd9a93a, 3, 1.15, .45);
      stack('g', '#1d8b52', '#f7f1e3', '#eef3e6', 0x1d8b52, 2, .55, 1.05);
      // a blackjack: the ace of spades and the king of hearts, leaning on the black stack
      g0.add(at(card(M({ map: faceTex('as', 'A', 0), roughness: .35 })), -.85, 0, .35, 0, .55, 0));
      g0.add(at(card(M({ map: faceTex('kh', 'K', 1), roughness: .35 })), -.3, .15, .55, 0, .12, 0));
      return g0;
    },
    poker() {   // a luxury black felt square: toy chip stacks (red / black / white), pocket aces leaning on the chips, a dealer button
      const g0 = new T.Group();
      const faceTex = (k, r, su) => X.canvasTex('ic-pk' + k, 256, 352, (c, W, H) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, W, H); const red = su === 1 || su === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
        c.font = 'bold 96px Georgia, serif'; c.textBaseline = 'top'; c.textAlign = 'left'; c.fillText(r, 20, 14);
        c.font = '230px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠♥♦♣'[su], W / 2 + 10, H * .6);
      });
      const edge = C(0xf3ead6, { roughness: .4 });
      const card = (top) => { const b = rbox(1.4, .14, 1.96, .12, edge); const f = mesh(new T.PlaneGeometry(1.26, 1.82), top); f.rotation.x = -Math.PI / 2; f.position.y = .145; return grp(b, f); };
      // chip: fat rounded disc + white edge inserts + inlay disc on top
      const chipTex = (k, body, ins) => X.canvasTex('ic-pkc' + k, 256, 256, (c, W, H) => {
        c.fillStyle = body; c.beginPath(); c.arc(W / 2, H / 2, W / 2, 0, 7); c.fill();
        c.fillStyle = ins; for (let i = 0; i < 8; i++) { c.save(); c.translate(W / 2, H / 2); c.rotate(i * Math.PI / 4); c.fillRect(-14, -W / 2, 28, 34); c.restore(); }
        c.fillStyle = '#f6f1e4'; c.beginPath(); c.arc(W / 2, H / 2, W * .3, 0, 7); c.fill();
        c.strokeStyle = body; c.lineWidth = 6; c.setLineDash([12, 8]); c.beginPath(); c.arc(W / 2, H / 2, W * .25, 0, 7); c.stroke();
      });
      const chip = (k, body, ins, hex) => { const p = puck(.62, .2, gloss(hex), .35); const top = mesh(new T.CircleGeometry(.56, 40), M({ map: chipTex(k, body, ins), roughness: .3 })); top.rotation.x = -Math.PI / 2; top.position.y = .203; return grp(p, top); };
      const stack = (k, body, ins, hex, n, x, z) => { for (let i = 0; i < n; i++) g0.add(at(chip(k, body, ins, hex), x + (i % 2 ? .03 : -.02), i * .2, z + (i % 3 === 1 ? .03 : 0), 0, i * .7, 0)); };
      stack('r', '#c8203a', '#f7f1e3', 0xc8203a, 5, .55, -.6);
      stack('k', '#23262e', '#e8c66e', 0x23262e, 3, 1.15, .45);
      stack('w', '#efe9db', '#2f5fb8', 0xefe9db, 2, .55, 1.05);
      // pocket aces leaning on the red stack
      g0.add(at(card(M({ map: faceTex('as', 'A', 0), roughness: .35 })), -.85, 0, .35, 0, .55, 0));
      g0.add(at(card(M({ map: faceTex('ah', 'A', 1), roughness: .35 })), -.3, .15, .55, 0, .12, 0));
      // dealer button
      const dTex = X.canvasTex('ic-pkd', 256, 256, (c, W) => { c.fillStyle = '#f7f4ec'; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.fill(); c.fillStyle = '#1f1f26'; c.font = 'bold 150px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('D', W / 2, W / 2 + 8); });
      const db = grp(puck(.42, .16, C(0xf7f4ec, { roughness: .3 }), .4), at(mesh(new T.CircleGeometry(.4, 36), M({ map: dTex, roughness: .3 })), 0, .081, 0, -Math.PI / 2, 0, 0));
      g0.add(at(db, 1.2, .08, -.8, 0, .3, 0));
      return g0;
    },
    ur() {   // a corner of the Ur board: shell plaques (a rosette, eyes, five circles) on a lapis grid in a black frame with a
      // shell diamond band; a shale piece on the rosette, a shell piece hopping in, a tetrahedral die with its white tip up
      const top = M({ map: X.canvasTex('icur', 512, 512, (g, W) => {
        g.fillStyle = '#141110'; g.fillRect(0, 0, W, W);
        // the diamond band round the edge
        g.strokeStyle = '#e8dcc0'; g.lineWidth = 3; g.strokeRect(14, 14, W - 28, W - 28); g.strokeRect(46, 46, W - 92, W - 92);
        const n = 9, st = (W - 60) / n;
        for (let side = 0; side < 4; side++) for (let i = 0; i <= n; i++) {
          const t = 30 + i * st, [x, y] = [[t, 30], [W - 30, t], [W - t, W - 30], [30, W - t]][side];
          g.fillStyle = '#efe5cf'; g.beginPath(); g.moveTo(x - 13, y); g.lineTo(x, y - 13); g.lineTo(x + 13, y); g.lineTo(x, y + 13); g.closePath(); g.fill();
        }
        // the lapis ground and three shell plaques + one more (2 × 2)
        g.fillStyle = '#1d2d8f'; g.fillRect(58, 58, W - 116, W - 116);
        const P = (W - 116 - 18) / 2, o = [64, 64 + P + 6];
        const plaque = (x, y, f) => { g.fillStyle = '#efe6d0'; g.fillRect(x, y, P, P); g.save(); g.translate(x + P / 2, y + P / 2); g.strokeStyle = '#2a1c12'; g.lineWidth = 6; f(); g.restore(); };
        const ros = () => { for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); g.beginPath(); g.moveTo(10, 0); g.quadraticCurveTo(40, -22, 78, 0); g.quadraticCurveTo(40, 22, 10, 0); g.fillStyle = k % 2 ? '#2a3fa8' : '#a63a26'; g.fill(); g.stroke(); g.restore(); } g.beginPath(); g.arc(0, 0, 13, 0, 7); g.fillStyle = '#a63a26'; g.fill(); g.stroke(); };
        const five = () => [[0, 0], [-48, -48], [48, -48], [-48, 48], [48, 48]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 20, 0, 7); g.stroke(); g.beginPath(); g.arc(x, y, 11, 0, 7); g.fillStyle = '#2a3fa8'; g.fill(); });
        const eyes = () => { g.beginPath(); g.moveTo(-14, -80); g.lineTo(-14, 80); g.moveTo(14, -80); g.lineTo(14, 80); g.moveTo(-80, 0); g.lineTo(80, 0); for (const y of [-60, -40, 40, 60]) { g.moveTo(-14, y); g.lineTo(14, y); } g.stroke();
          for (const sx of [-1, 1]) for (const sy of [-1, 1]) { g.save(); g.translate(sx * 48, sy * 40); g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(0, -24, 26, 0); g.quadraticCurveTo(0, 24, -26, 0); g.stroke(); g.beginPath(); g.arc(0, 0, 6, 0, 7); g.fillStyle = '#2a1c12'; g.fill(); g.restore(); } };
        plaque(o[0], o[0], ros); plaque(o[1], o[0], eyes); plaque(o[0], o[1], five); plaque(o[1], o[1], five);
      }), roughness: .55 });
      const g = boardChunk(2, 3.6, top, C(0x2e2420, { roughness: .45 }));
      const p = i => (i - .5) * 1.47;
      const piece = (shell, s) => { const c = new T.Group(); c.add(puck(.62, .26, C(shell ? 0xeee4cc : 0x3c4046, { roughness: .45 }), .5));
        const dm = C(shell ? 0x2a3fa8 : 0xf1e8d2, { roughness: .4 }); [[0, 0], [-.27, -.27], [.27, -.27], [-.27, .27], [.27, .27]].forEach(([x, z]) => { const d = mesh(new T.CylinderGeometry(.08, .08, .04, 16), dm); d.position.set(x, .26, z); c.add(d); });
        c.scale.setScalar(s); return c; };
      g.add(at(piece(false, .82), p(1), .5, p(0)));   // shale piece on the eyes
      g.add(at(piece(true, .82), p(0), .5, p(1)));    // shell piece on the five circles
      // the tetrahedral die: bone body, a shell-and-lapis tip pointing up
      const dg = new T.Group(), body = C(0xd9cba8, { roughness: .45 }), V = [[0, 1, 0], [.943, -.333, 0], [-.471, -.333, .816], [-.471, -.333, -.816]].map(v => new T.Vector3(...v).multiplyScalar(.62));
      const tet = new T.BufferGeometry().setFromPoints([V[1], V[2], V[3], V[0], V[2], V[1], V[0], V[3], V[2], V[0], V[1], V[3]]); tet.computeVertexNormals();
      dg.add(mesh(tet, body)); const tip = mesh(new T.SphereGeometry(.13, 16, 10), C(0xf6f0e2, { roughness: .3 })); tip.position.copy(V[0]).multiplyScalar(.92); dg.add(tip);
      const lap = mesh(new T.SphereGeometry(.07, 12, 8), C(0x2a3fa8, { roughness: .3 })); lap.position.copy(V[0]).multiplyScalar(1.02); dg.add(lap);
      dg.scale.setScalar(1.25); g.add(at(dg, p(1), .5 + .26, p(1), 0, .9, 0));   // the die on the near plaque, white tip up
      // the big shell piece hopping onto the rosette (far corner, so the rosette shows below it)
      g.add(at(piece(true, 1.35), p(0) - .15, 2.15, p(0) - .2, .55, 0, -.35));
      return g;
    },
    jailbreak() {   // a 3×3 patch of concrete cell floor: crates, the orange inmate slipping through the bars, a gold key
      const g0 = new T.Group();
      const tile = C(0xd8d2c4, { roughness: .7 });
      for (let i = 0; i < 9; i++) { const x = (i % 3 - 1) * 1.12, z = ((i / 3 | 0) - 1) * 1.12; g0.add(at(rbox(1.08, .3, 1.08, .1, tile), x, 0, z)); }
      g0.add(at(rbox(1, .8, 2.1, .16, C(0x7a8fa6)), -1.12, .3, -.56));
      g0.add(at(rbox(1, .8, 1, .16, C(0xa0784f)), 1.12, .3, 1.12));
      const orange = gloss(0xf26b1d), inm = new T.Group();
      inm.add(rbox(2.1, .95, 1, .3, orange));
      [-.75, -.45, -.15].forEach(dx => inm.add(at(mesh(new T.BoxGeometry(.14, .03, .84), C(0xffc59a)), dx, .96, 0)));
      inm.add(at(puck(.42, .2, C(0xfbe6cf), .5), .5, .9, 0));
      [-.15, .15].forEach(dz => inm.add(at(ball(.07, C(0x2a2622)), .62, 1.12, dz)));
      inm.add(at(mesh(new T.BoxGeometry(.05, .04, .2), C(0x2a2622)), .36, 1.11, 0));
      g0.add(at(inm, .45, .3, 0, 0, 0, 0));
      const steel = C(0x5d6575, { roughness: .3, metalness: .6 });
      for (let i = 0; i < 3; i++) g0.add(at(mesh(new T.CylinderGeometry(.08, .08, 2.2, 12), steel), 1.75, 1.3, -1.1 + i * .55));
      g0.add(at(mesh(new T.BoxGeometry(.18, .16, 1.5), steel), 1.75, 2.42, -.55));
      const gold = C(0xffcd3c, { roughness: .2, metalness: .7 }), key = new T.Group();
      key.add(mesh(new T.TorusGeometry(.3, .1, 12, 28), gold)); key.add(at(mesh(new T.BoxGeometry(.7, .14, .14), gold), .58, 0, 0)); key.add(at(mesh(new T.BoxGeometry(.12, .26, .14), gold), .82, -.14, 0));
      key.scale.setScalar(.8); g0.add(at(key, -.55, .42, 1.05, -Math.PI / 2, 0, .6));
      return g0;
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
    m.userData.soft = true; m.userData.hex = hex; m.userData.underHex = o.under ?? null;
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
    eyes.forEach(e => { e.userData.keep = true; });   // blinking parts stay separate when a host merges the rest
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
    // タフリン: a plush puffin in a horned viking helmet (hnefatafl's guide)
    puffin() {
      const g = new T.Group(), D = soft(0x2f3550, { under: 0x5a5fa0, uk: .5 }), Wt = soft(0xfffbf4, { under: 0xd8dcff, uk: .4 }), O = soft(0xff8a3a, { under: 0xff6a6a }), Yl = soft(0xffcf4a);
      blob(g, D, [0, .7, 0], [.62, .64, .56]);
      blob(g, Wt, [0, .62, .3], [.44, .48, .32]);                                                  // belly
      const hc = V3(0, 1.56, .02), HR = [.72, .64, .64];
      blob(g, D, [hc.x, hc.y, hc.z], HR);
      const fc = V3(0, 1.52, .22), FR = [.58, .46, .5];
      blob(g, Wt, [fc.x, fc.y, fc.z], FR);                                                          // white face disc
      const eyes = face(g, ell(fc, FR), { er: .1, gap: .27, v: .1, mouth: 'none', by: .2, bx: .12 });
      const bk = new T.Group(), cone = mesh(new T.ConeGeometry(.2, .42, 28), O); cone.rotation.x = Math.PI / 2; cone.scale.set(1, 1, 1.45); bk.add(cone);
      const base = mesh(new T.CylinderGeometry(.205, .205, .08, 28), Yl); base.rotation.x = Math.PI / 2; base.position.z = -.17; base.scale.set(1, 1.45, 1); bk.add(base);
      bk.position.set(0, 1.36, .78); g.add(bk);                                                     // the big striped beak
      [-1, 1].forEach(s => blob(g, D, [s * .62, .78, -.02], [.14, .38, .3], [0, 0, s * .32]));      // wings
      [-1, 1].forEach(s => blob(g, O, [s * .24, .08, .32], [.18, .07, .22]));                       // feet
      const H = new T.Group(), steel = soft(0xc8ccd6, { under: 0x8a92b0, rough: .45, sheenK: .5 }), brass = soft(0xe8b456, { rough: .5 }), horn = soft(0xfff2dc, { under: 0xe8c8a0 });
      const dome = mesh(new T.SphereGeometry(.68, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), steel); dome.scale.set(1.02, .82, 1); H.add(dome);
      const rim = mesh(new T.TorusGeometry(.69, .07, 12, 48), brass); rim.rotation.x = Math.PI / 2; H.add(rim);
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob(H, brass, [Math.cos(a) * .7, .02, Math.sin(a) * .7], .055); }   // rivets
      blob(H, brass, [0, .56, 0], [.1, .08, .1]);                                                   // the knob on top
      [-1, 1].forEach(s => {                                                                        // horns: out from the sides, curving up
        const hg = new T.Group(), R = .3, arcM = mesh(new T.TorusGeometry(R, .1, 12, 24, Math.PI / 2), horn); arcM.rotation.z = -Math.PI / 2; arcM.position.y = R; hg.add(arcM);
        const tip = mesh(new T.ConeGeometry(.1, .26, 16), horn); tip.position.set(R, R + .12, 0); hg.add(tip);
        hg.position.set(s * .58, .18, 0); hg.scale.x = s; H.add(hg);
      });
      H.position.set(0, 1.82, -.02); H.rotation.x = -.12; g.add(H);
      g.userData.head = [1.62, 1.0, .1]; return alive(g, eyes);
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
    puffin: { ja: 'タフリン', en: 'Taflin', game: 'tafl', rar: 'R', desc_ja: '角つきかぶとのツノメドリ。王さまを隅まで送りとどけるのが夢。', desc_en: 'A puffin in a horned helmet who dreams of escorting the king to a corner.' },
    gold:   { ja: 'キンダイスン', en: 'Goldpup', game: 'atlas', rar: 'UR', desc_ja: 'めったに出会えない金色のダイスン。ふると幸運が出る。', desc_en: 'A rare golden Dicepup. Shake it and luck comes out.' },
  };

  // post-process: pieces onto the thick base; scenes without a board get a square plinth
  const PLINTH = { connect4: [0x1f5ed9, 5.2], mancala: [0xb37540, 4.6], sudoku: [0xf4efe6, 3.9], speedsudoku: [0xfff0e2, 3.9], samegame: [0xf2eadb, 3.9], jailbreak: [0x3a3f4a, 3.9], solitaire: [0x22704a, 3.9], poker: [0x1f1f24, 3.9], baccarat: [0x3d0f1a, 3.9], blackjack: [0x0b3a3a, 3.9] };
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
  // building kit for other creature files (atlas/avatars3d.js and atlas/avatars/*.js)
  const KIT = { T, X, M, mesh, C, gloss, rbox, puck, ball, V3, soft, blob, sq, sqs, sph, ell, flat, hugDecal, stick, bead, arc, face, crown, alive, decal, sparkle, noShadow, inkM, INK, blushTex, shogiPiece };
  window.Icons3D = { PIECES, ICONS: FIX, MONS, MON_INFO, KIT };
})();
