/* =====================================================================
   World Board Game Atlas — table designs for the 3D room (PROTOTYPE)
   Registers Table3D.TABLES[k] (k = 1..5; 0 is the toy room's chabudai in table3d.js):
     1 2D準拠      no room: the game's own 2D page colours as a soft gradient, the board floats over a contact shadow
     2 木のダイニング  light oak dining table, a blurred white wall with a house plant, soft daylight
     3 緑のフェルト    deep green felt in a walnut rail, one overhead spotlight, dark club room
     4 大理石のテラス  white marble top, an evening sky over the sea, balustrade silhouettes
     5 夜の書斎      walnut desk with a leather desk mat, a banker's lamp, a blurred bookshelf behind
   Each builder gets { TT, g, scene, texScale, game } and returns
     { bg, exp, key (the shadow-casting light), env: { top, bottom, panels }, onShow(id) }.
   The background is a painted, pre-blurred backdrop: one plane facing the camera far behind the table
   (the camera of the portal looks at the table from a fixed pitch; only its distance changes), so
   each look costs a table, a plane or two and a handful of lights.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X || !X.TABLES) return;
  const { TABLES, M, RB, canvasTex, woodTop, wood, makeNoise } = X;
  const PITCH = .52;   // the portal's showcase camera pitch (camPose)

  // painted backdrop: plane coords x ∈ [−w/2, w/2], v ∈ [−h/2, h/2] (v up); the table's back edge hides v < ~9..12
  function backdrop(o, key, draw, opt = {}) {
    const TT = o.TT, w = opt.w || 110, h = opt.h || 76, D = opt.D || 60, W = Math.round((opt.px || 1024) * Math.max(.5, o.texScale)), H = Math.round(W * h / w);
    // blur(c, px) starts a layer: what follows is drawn sharp on its own canvas and composited with ONE blur when the next
    // layer starts (a canvas filter on every small shape blurs a full-size layer per shape: minutes on a phone)
    const run = (main, fn) => {
      let layer = null, lpx = 0, target = main;
      const setup = (cx) => { cx.setTransform(1, 0, 0, 1, 0, 0); cx.translate(W / 2, H / 2); cx.scale(W / w, -H / h); };
      const flush = () => { if (!layer) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.filter = `blur(${lpx}px)`; main.drawImage(layer.canvas, 0, 0); main.restore(); layer = null; target = main; };
      const P = new Proxy({}, {
        get: (_, k) => { if (k === '__blur') return (px) => { flush(); if (px > .3) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; layer = cv.getContext('2d'); lpx = px; setup(layer); target = layer; } };
          const v = target[k]; return typeof v === 'function' ? v.bind(target) : v; },
        set: (_, k, v) => { target[k] = v; return true; },
      });
      main.save(); setup(main); fn(P, W / w); flush(); main.restore();
    };
    const tex = canvasTex(key, W, H, (c) => run(c, draw));
    const m = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ map: tex, toneMapped: false, depthWrite: false }));
    m.position.set(0, -D * Math.sin(PITCH), -D * Math.cos(PITCH)); m.rotation.x = -PITCH; m.renderOrder = -1; o.g.add(m);
    m.userData.repaint = (fn) => { const c = tex.image.getContext('2d'); c.clearRect(0, 0, W, H); run(c, fn); tex.needsUpdate = true; };
    return m;
  }
  const lin = (c, y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
  const rad = (c, x, y, r, stops) => { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([k, col]) => g.addColorStop(k, col)); return g; };
  const blur = (c, px) => c.__blur(px);
  function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2); c.fill(); }
  function rng(seed) { let s = seed | 0 || 1; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); }
  function dirLight(TT, col, I, pos, ext = 14) {
    const L = new TT.DirectionalLight(col, I); L.position.set(...pos);
    Object.assign(L.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 90 }); return L;
  }
  const sz = (o, n) => Math.round(n * Math.max(.5, o.texScale));
  // a rounded-rectangle path (THREE.Shape / Path)
  function rrect(p, x0, y0, x1, y1, r) {
    p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.quadraticCurveTo(x1, y0, x1, y0 + r); p.lineTo(x1, y1 - r); p.quadraticCurveTo(x1, y1, x1 - r, y1);
    p.lineTo(x0 + r, y1); p.quadraticCurveTo(x0, y1, x0, y1 - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0); return p;
  }

  /* ---------- 1 · 2D準拠: the game's own page colours ---------- */
  // [glow (the page's upper-left radial), base (--bg), lower-right glow] from each game's <game>/index.html body background
  const PAL = {
    chess: ['#2a2016', '#0b0a09', '#1c1712'], gomoku: ['#2a2016', '#0b0a09', '#1c1712'], shogi: ['#34230f', '#130d09', '#24180c'],
    reversi: ['#1b2b26', '#0b1110', '#16231f'], backgammon: ['#1b2b26', '#0b1110', '#16231f'], go: ['#1d2740', '#0b0e15', '#1a1f33'],
    xiangqi: ['#461521', '#13090b', '#3c121d'], checkers: ['#461521', '#13090b', '#3c121d'], hex: ['#461521', '#0b0f1c', '#3c121d'],
    connect4: ['#0f2c30', '#061315', '#0b2226'], mancala: ['#4a1a24', '#0b0708', '#3e1820'],
  };
  TABLES[1] = (o) => {
    const { TT, g, scene } = o;
    const paint = (id) => (c) => {
      const P = PAL[id] || PAL.chess;
      c.fillStyle = P[1]; c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, -22, 34, 60, [[0, P[0]], [1, 'rgba(0,0,0,0)']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, 40, -6, 50, [[0, P[2]], [1, 'rgba(0,0,0,0)']]); c.fillRect(-60, -40, 120, 80);
      // a soft halo behind the board so a dark board still reads against a dark page
      c.fillStyle = rad(c, 0, 16, 26, [[0, 'rgba(255,240,215,.07)'], [1, 'rgba(255,240,215,0)']]); c.fillRect(-60, -40, 120, 80);
    };
    let cur = o.game || 'chess';
    const bd = backdrop(o, 'tbl1-bd', (c) => paint(cur)(c), { px: 512 });
    // the board floats: a blurred contact shadow below it, plus the key light's own shadow (for the board's outline)
        const ao = canvasTex('tbl1-ao', 256, 256, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(0,0,0,.85)'], [.45, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, W); });
    ao.encoding = TT.LinearEncoding;
    const FL = -1.6;
    // a faint pool of the page's own glow colour under the board, so the floating shadow reads on a dark page
    const pt = canvasTex('tbl1-pool', 256, 256, (c, W) => { c.fillStyle = rad(c, W / 2, W / 2, W / 2, [[0, 'rgba(255,255,255,1)'], [.4, 'rgba(255,255,255,.5)'], [.75, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]); c.fillRect(0, 0, W, W); });
    const lift = (hx, k) => { const c = new TT.Color(hx); c.lerp(new TT.Color(0xfff2dc), k); return c; };
    const pool = new TT.Mesh(new TT.PlaneGeometry(28, 20), new TT.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, toneMapped: false, color: lift((PAL[cur] || PAL.chess)[0], .14) }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, FL - .02, .5); pool.renderOrder = 0; g.add(pool);
    const blob = new TT.Mesh(new TT.PlaneGeometry(17, 15), new TT.MeshBasicMaterial({ map: ao, transparent: true, depthWrite: false, color: 0x000000, opacity: .75 }));
    blob.rotation.x = -Math.PI / 2; blob.position.y = FL; blob.renderOrder = 1; g.add(blob);
    const sc = new TT.Mesh(new TT.PlaneGeometry(40, 40), new TT.ShadowMaterial({ opacity: .35 })); sc.rotation.x = -Math.PI / 2; sc.position.y = FL + .01; sc.receiveShadow = true; sc.renderOrder = 2; g.add(sc);
    scene.add(new TT.HemisphereLight(0xf2f4ff, 0x3a3028, .5));
    const key = dirLight(TT, 0xfff8ee, 1.0, [-5, 24, 7], 10); scene.add(key);
    const fill = new TT.DirectionalLight(0xffeedd, .3); fill.position.set(8, 10, 12); scene.add(fill);
    return {
      bg: (PAL[cur] || PAL.chess)[1], exp: .8, key,
      env: { top: '#c9cdd4', bottom: '#2a2420', panels: [[-8, 16, 6, 12, 7, '#ffffff', 1.5], [10, 10, -6, 8, 6, '#fff4e6', .7], [0, 6, 18, 18, 4, '#ffffff', .35]] },
      onShow(id) { if (id === cur) return; cur = id; bd.userData.repaint(paint(id)); pool.material.color.copy(lift((PAL[id] || PAL.chess)[0], .14)); o.scene.background = new TT.Color((PAL[id] || PAL.chess)[1]).convertSRGBToLinear(); },
    };
  };

  /* ---------- 2 · 木のダイニング: light oak, white wall, a plant, daylight ---------- */
  TABLES[2] = (o) => {
    const { TT, g, scene } = o;
    const pk = X.planks('tbl2-oak', '#d6b284', '#9a6c40', 5, sz(o, 2048));
    const top = M({ map: pk, roughness: .52, clearcoat: .2, clearcoatRoughness: .45, bumpScale: .0025 });
    const t = new TT.Mesh(RB(46, 1.6, 36, .55, 3), top); t.position.set(0, -.8, 5); t.receiveShadow = true; g.add(t);
    // a stoneware mug and a little bud vase at the far corners
    const mugM = M({ color: 0xe9e4da, roughness: .38, clearcoat: .4 }), inM = M({ color: 0x3a2214, roughness: .2 });
    const mugP = [[0, 0], [.95, 0], [1.05, .1], [1.1, 1.8], [1.02, 1.82], [.95, .2], [0, .2]].map(([x, y]) => new TT.Vector2(x, y));
    const mug = new TT.Mesh(new TT.LatheGeometry(mugP, 28), mugM); mug.position.set(-12.5, 0, -7.5); mug.castShadow = mug.receiveShadow = true; g.add(mug);
    const cof = new TT.Mesh(new TT.CircleGeometry(.96, 24), inM); cof.rotation.x = -Math.PI / 2; cof.position.set(-12.5, 1.45, -7.5); g.add(cof);
    const hdl = new TT.Mesh(new TT.TorusGeometry(.5, .13, 8, 16, Math.PI * 1.3), mugM); hdl.position.set(-11.35, .95, -7.5); hdl.rotation.z = -Math.PI * .65; hdl.castShadow = true; g.add(hdl);
    const vaseP = [[0, 0], [.55, 0], [.75, .5], [.7, 1.4], [.3, 2.4], [.28, 3], [.36, 3.15], [0, 3.15]].map(([x, y]) => new TT.Vector2(x, y));
    const vase = new TT.Mesh(new TT.LatheGeometry(vaseP, 24), M({ color: 0x9fb3a2, roughness: .3, clearcoat: .5 })); vase.position.set(12.5, 0, -9); vase.castShadow = true; g.add(vase);
    const twigM = M({ color: 0x6d7f4c, roughness: .7 });
    [[-.2, .25], [.25, -.15], [0, -.35]].forEach(([a, b], i) => { const s = new TT.Mesh(new TT.CylinderGeometry(.035, .05, 4.2 - i * .6, 5), twigM); s.position.set(12.5 + a * 1.8, 3.1 + (2.1 - i * .3), -9 + b * 1.4); s.rotation.set(b * .5, 0, -a * .6); s.castShadow = true; g.add(s);
      const lf = new TT.Mesh(new TT.SphereGeometry(.42, 8, 6), M({ color: 0x7e9a5a, roughness: .6 })); lf.scale.set(1, .35, .6); lf.position.set(12.5 + a * 4, 3.1 + 4.1 - i * .9, -9 + b * 3); g.add(lf); });
    // (visible: PC v 16..26 over x ±39; phone v 11..33 over x ±13 — the table hides what is below)
    backdrop(o, 'tbl2-bd', (c, ppu) => {
      const R = rng(7);
      c.fillStyle = lin(c, 40, 10, [[0, '#d9d2c6'], [1, '#f3efe8']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, -34, 26, 50, [[0, 'rgba(255,254,250,.95)'], [1, 'rgba(255,254,250,0)']]); c.fillRect(-60, -40, 120, 80);
      // window light on the wall: four soft panes
      blur(c, 1.4 * ppu); c.fillStyle = 'rgba(255,249,235,.6)';
      [[1, 19.5], [6.6, 19.5], [1, 26], [6.6, 26]].forEach(([x, y]) => { c.save(); c.translate(x, y); c.transform(1, 0, .45, 1, 0, 0); c.fillRect(0, 0, 4.8, 5.8); c.restore(); });
      // floor and skirting, far behind the table
      blur(c, .6 * ppu);
      c.fillStyle = lin(c, 14, 6, [[0, '#d6bd96'], [1, '#c2a47a']]); c.fillRect(-60, -40, 120, 54);
      c.fillStyle = '#f7f4ee'; c.fillRect(-60, 14, 120, .8);
      // a low oak sideboard on the right, with a vase of pampas and a few books
      c.fillStyle = '#d4b385'; c.fillRect(12, 14.3, 30, 6.2); c.fillStyle = '#c5a273'; c.fillRect(12, 20.2, 30, .5);
      c.fillStyle = 'rgba(90,64,40,.28)'; [19.5, 27, 34.5].forEach(x => c.fillRect(x, 14.8, .2, 5));
      c.fillStyle = '#3b3632'; c.fillRect(13, 13.6, .5, .8); c.fillRect(41, 13.6, .5, .8);
      c.fillStyle = '#ece6dc'; c.beginPath(); c.moveTo(15.4, 20.7); c.quadraticCurveTo(14.2, 23.2, 15.7, 25.3); c.lineTo(16.9, 25.3); c.quadraticCurveTo(18.4, 23.2, 17.2, 20.7); c.fill();
      c.strokeStyle = '#b89c74'; c.lineWidth = .12; for (let i = 0; i < 9; i++) { const a = -.7 + i * .17; c.beginPath(); c.moveTo(16.3, 25); c.quadraticCurveTo(16.3 + a * 3, 28, 16.3 + a * 6, 30 + R() * 2); c.stroke(); }
      c.fillStyle = 'rgba(232,214,180,.8)'; for (let i = 0; i < 9; i++) { const a = -.7 + i * .17; ell(c, 16.3 + a * 6.2, 30.6 + R() * 2, .9, 1.9, -a * .6); }
      [['#8a9a86', 1.1], ['#d9c9a8', .8], ['#b06a4c', .9]].reduce((y, [col, h]) => { c.fillStyle = col; c.fillRect(22, y, 5.2, h); return y + h; }, 20.7);
      c.fillStyle = '#efe7da'; ell(c, 31.5, 22, 1.6, 1.6); c.fillStyle = '#d8a46c'; c.fillRect(31.3, 20.7, .4, 1);   // a little globe lamp
      // a framed print above it
      c.fillStyle = '#e8e0d2'; c.fillRect(25, 22.5, 9, 11); c.fillStyle = '#c9cfbd'; c.fillRect(26, 23.5, 7, 9); c.fillStyle = '#a6b39a'; ell(c, 29.5, 28, 2.2, 2.8); c.fillStyle = '#d9a982'; ell(c, 28.3, 26, 1.1, 1.1);
      // a pendant lamp hanging over the room (phones see it)
      c.fillStyle = '#4a4744'; c.fillRect(3.93, 31, .14, 10); c.fillStyle = '#e8e2d8'; c.beginPath(); c.moveTo(1.6, 29); c.quadraticCurveTo(4, 33.4, 6.4, 29); c.fill();
      c.fillStyle = 'rgba(255,240,205,.95)'; ell(c, 4, 29, 2.4, .32);
      // the plant: a terracotta pot and a fiddle-leaf fig
      blur(c, .45 * ppu);
      c.fillStyle = '#c98c62'; c.beginPath(); c.moveTo(-12.4, 14.2); c.lineTo(-5.6, 14.2); c.lineTo(-5.1, 19.6); c.lineTo(-12.9, 19.6); c.fill();
      c.fillStyle = '#b77a52'; c.fillRect(-13.1, 19.3, 8.2, .7); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(-12.4, 14.2, 2, 5.1);
      c.strokeStyle = '#6b5638'; c.lineWidth = .32; c.beginPath(); c.moveTo(-9, 19.6); c.bezierCurveTo(-8.6, 23, -9.8, 26, -9.2, 31); c.stroke();
      c.lineWidth = .18; [[-9.1, 23, -12.5, 25.5], [-9.3, 25, -5.8, 27.4], [-9.4, 27.5, -12.2, 30.2], [-9.2, 29, -6.4, 31.4]].forEach(([a, b, x, y]) => { c.beginPath(); c.moveTo(a, b); c.quadraticCurveTo((a + x) / 2, b + .3, x, y); c.stroke(); });
      for (let i = 0; i < 34; i++) {
        const t = i / 34, y = 21 + t * 12 + (R() - .5) * 1.4, side = i % 2 ? 1 : -1, x = -9.2 + side * (1 + R() * (2.5 + 2.5 * Math.sin(t * Math.PI))), s = 1.15 + R() * .7;
        const sh = R(); c.fillStyle = `rgb(${46 + sh * 30 | 0},${88 + sh * 40 | 0},${40 + sh * 18 | 0})`;
        const ang = side * (.5 + R() * .6) + (R() - .5) * .3;
        c.save(); c.translate(x, y); c.rotate(ang); c.beginPath(); c.moveTo(0, -s); c.bezierCurveTo(s * .9, -s * .6, s * .8, s * .9, 0, s * 1.15); c.bezierCurveTo(-s * .8, s * .9, -s * .9, -s * .6, 0, -s); c.fill();
        c.strokeStyle = 'rgba(190,220,150,.35)'; c.lineWidth = .07; c.beginPath(); c.moveTo(0, -s * .9); c.lineTo(0, s); c.stroke(); c.restore();
      }
      blur(c, 0);
      c.fillStyle = 'rgba(243,239,232,.12)'; c.fillRect(-60, -40, 120, 80);   // a breath of haze (depth)
    }, { px: 2048 });
    scene.add(new TT.HemisphereLight(0xf3f1ec, 0xb8976c, .36));
    const key = dirLight(TT, 0xfff1dc, 1.55, [-19, 15, -5], 16); scene.add(key);
    const fill = new TT.DirectionalLight(0xeef2ff, .22); fill.position.set(9, 10, 16); scene.add(fill);
    return { bg: '#ece6dc', exp: .72, key, env: { top: '#f4efe6', bottom: '#b4936a', panels: [[-14, 12, -10, 14, 10, '#ffffff', 1.7], [12, 8, 10, 10, 6, '#fff3e4', .6], [0, 18, 4, 20, 6, '#ffffff', .5]] } };
  };

  /* ---------- 3 · 緑のフェルト: felt in a walnut rail, an overhead spotlight, a dark club room ---------- */
  TABLES[3] = (o) => {
    const { TT, g, scene } = o;
    const ft = canvasTex('tbl3-felt', sz(o, 1024), sz(o, 1024), (c, W) => {
      const N = makeNoise(31), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = (Math.random() - .5) * 16 + (N(x / 1.6, y / 1.6, 2) - .5) * 20 + (N(x / 50, y / 50, 3) - .5) * 10, i = (y * W + x) * 4;
        d[i] = 12 + k * .3; d[i + 1] = 58 + k * 1.1; d[i + 2] = 38 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
    ft.wrapS = ft.wrapT = TT.RepeatWrapping; ft.repeat.set(3, 2.2);
    const feltM = M({ map: ft, roughness: .95, bumpScale: .006, sheen: new TT.Color(0x2c7a50) });
    const cz = 2, OX = 23, OZ = 17, RW = 2.4;
    const felt = new TT.Mesh(new TT.PlaneGeometry(2 * OX - 1, 2 * OZ - 1), feltM); felt.rotation.x = -Math.PI / 2; felt.position.set(0, 0, cz); felt.receiveShadow = true; g.add(felt);
    // the walnut rail: a rounded-rectangle ring, extruded with a generous bevel (a padded, polished look)
    const sh = rrect(new TT.Shape(), -OX, -OZ, OX, OZ, 4);
    sh.holes.push(rrect(new TT.Path(), -OX + RW, -OZ + RW, OX - RW, OZ - RW, 2));
    const rg = new TT.ExtrudeGeometry(sh, { depth: .15, bevelEnabled: true, bevelThickness: .75, bevelSize: .95, bevelSegments: 6, curveSegments: 10 });
    const wt = wood('tbl3-walnut', '#7a4a2a', '#2a160b', sz(o, 512), sz(o, 512), 1.6); wt.wrapS = wt.wrapT = TT.RepeatWrapping; wt.repeat.set(.02, .02); wt.offset.set(.5, .5);
    const railM = M({ map: wt, roughness: .45, clearcoat: .35, clearcoatRoughness: .35, bumpScale: .002 });
    const rail = new TT.Mesh(rg, railM); rail.rotation.x = -Math.PI / 2; rail.position.set(0, .05, cz); rail.castShadow = rail.receiveShadow = true; g.add(rail);
    const apron = new TT.Mesh(RB(2 * OX + .6, 3, 2 * OZ + .6, 1.2, 2), M({ color: 0x24140a, roughness: .5 })); apron.position.set(0, -1.9, cz); g.add(apron);
    backdrop(o, 'tbl3-bd', (c, ppu) => {
      const R = rng(11);
      c.fillStyle = '#060607'; c.fillRect(-60, -40, 120, 80);
      c.fillStyle = rad(c, 0, 16, 40, [[0, '#1d1a14'], [1, 'rgba(10,10,10,0)']]); c.fillRect(-60, -40, 120, 80);
      // the far wall: dark panelling, picked out by a few warm sconces; out-of-focus lights as bokeh
      c.fillStyle = 'rgba(40,30,20,.5)'; for (let x = -54; x < 56; x += 9) c.fillRect(x, 10, .25, 30);
      blur(c, 1.5 * ppu);
      [[-26, 22], [26, 22], [-8, 24], [9, 24]].forEach(([x, y]) => { c.fillStyle = rad(c, x, y, 7, [[0, 'rgba(255,190,110,.55)'], [.15, 'rgba(255,170,90,.25)'], [1, 'rgba(255,150,80,0)']]); c.fillRect(x - 8, y - 8, 16, 16); });
      for (let i = 0; i < 26; i++) {
        const x = (R() - .5) * 100, y = 12 + R() * 24, r = .5 + R() * 1.4, warm = R() > .25;
        c.fillStyle = warm ? `rgba(255,${190 + R() * 40 | 0},120,${.08 + R() * .16})` : `rgba(120,200,190,${.06 + R() * .1})`; ell(c, x, y, r, r);
      }
      // a neighbouring table's lamp glow, far left
      c.fillStyle = rad(c, -40, 14, 14, [[0, 'rgba(70,140,90,.22)'], [1, 'rgba(70,140,90,0)']]); c.fillRect(-60, 0, 40, 30);
      blur(c, 0);
    });
    scene.add(new TT.HemisphereLight(0x8a96a8, 0x0a0a0a, .1));
    const key = new TT.SpotLight(0xfff0d4, 4.4, 90, .3, .85, 1.1); key.position.set(0, 36, 3); key.target.position.set(0, 0, 0); scene.add(key); scene.add(key.target);
    key.shadow.camera.near = 10; key.shadow.camera.far = 60; key.shadow.bias = -.0002;
    const rim = new TT.DirectionalLight(0xffd7a0, .18); rim.position.set(-12, 8, -18); scene.add(rim);
    return { bg: '#060607', exp: .95, key, env: { top: '#2b2620', bottom: '#040404', panels: [[0, 22, 3, 12, 12, '#fff0d8', 4], [-16, 8, -10, 5, 9, '#ffcf96', .9], [16, 8, -10, 5, 9, '#ffcf96', .7], [0, 9, 20, 22, 5, '#d8c8b0', .55], [-18, 6, 8, 5, 8, '#ffe2b8', .5]] } };
  };

  /* ---------- 4 · 大理石のテラス: white marble, an evening sky over the sea, a balustrade ---------- */
  TABLES[4] = (o) => {
    const { TT, g, scene } = o;
    const W = sz(o, 1024);
    const mt = canvasTex('tbl4-marble', W, W, (c) => {
      const N = makeNoise(53), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / W;
        const w1 = N(u * 2.2, v * 2.2, 5), w2 = N(u * 4 + 9, v * 4 + 3, 4);
        const vein = Math.abs(Math.sin((u * 2.6 + v * 1.4 + w1 * 2.6) * Math.PI)), fine = Math.abs(Math.sin((u * 7 - v * 3 + w2 * 3.2) * Math.PI));
        let k = Math.pow(1 - vein, 20) * .55 + Math.pow(1 - fine, 40) * .28 + (N(u * 12, v * 12, 3) - .5) * .06;
        const cloud = (N(u * 3 + 20, v * 3, 4) - .5) * .1;
        const i = (y * W + x) * 4, L = 247 - k * 110 + cloud * 50;
        d[i] = L + 1; d[i + 1] = L - 1; d[i + 2] = L - 4 + k * 4; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
    const marble = M({ map: mt, bump: false, roughness: .3, clearcoat: .35, clearcoatRoughness: .2 });
    const t = new TT.Mesh(RB(46, 1.4, 36, .5, 3), marble); t.position.set(0, -.7, 5); t.receiveShadow = true; g.add(t);
    backdrop(o, 'tbl4-bd', (c, ppu) => {
      const R = rng(5), HZ = 22.6, SX = -9;
      c.fillStyle = lin(c, 40, HZ, [[0, '#33407e'], [.3, '#7a5fa8'], [.6, '#e38ba0'], [.85, '#ffb07c'], [1, '#ffd69c']]); c.fillRect(-60, HZ, 120, 40);
      c.fillStyle = rad(c, SX, HZ + 1, 28, [[0, 'rgba(255,244,210,.95)'], [.1, 'rgba(255,216,160,.7)'], [.45, 'rgba(255,170,130,.22)'], [1, 'rgba(255,150,120,0)']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = '#fff8e2'; ell(c, SX, HZ + 1.1, 1.3, 1.3);
      blur(c, 1.2 * ppu);
      c.fillStyle = 'rgba(255,196,196,.5)'; [[16, 28, 9, .8], [25, 26.6, 6, .55], [-32, 30, 11, .7], [6, 32, 8, .55], [-18, 26.4, 6, .4]].forEach(([x, y, w, h]) => ell(c, x, y, w, h));
      blur(c, .3 * ppu);
      c.fillStyle = lin(c, HZ, 12, [[0, '#9a7fae'], [.25, '#6e639c'], [1, '#434b88']]); c.fillRect(-60, -40, 120, HZ + 40);
      c.fillStyle = '#6a5788'; c.beginPath(); c.moveTo(14, HZ); c.quadraticCurveTo(26, HZ + 2.6, 38, HZ + 1.8); c.quadraticCurveTo(48, HZ + 1, 60, HZ + 2.4); c.lineTo(60, HZ); c.fill();
      c.fillStyle = '#7a6694'; c.beginPath(); c.moveTo(-60, HZ); c.quadraticCurveTo(-48, HZ + 1.4, -38, HZ + .6); c.lineTo(-30, HZ); c.fill();
      for (let i = 0; i < 46; i++) { const y = HZ - .2 - R() * 6.5, k = 1 - (HZ - y) / 8, wd = (1.2 + R() * 3) * k; c.fillStyle = `rgba(255,${205 + R() * 40 | 0},160,${.3 + R() * .5})`; c.fillRect(SX - wd / 2 + (R() - .5) * 2.2 * (1.5 - k), y, wd, .13); }
      // the balustrade, close behind the table: silhouettes against the light
      blur(c, .2 * ppu);
      const SIL = '#3f2b40', B0 = 13.4, B1 = 19.8, bh = (B1 - B0) / 9.2, by = v => B0 + (v - 9.5) * bh;
      c.fillStyle = SIL; c.fillRect(-60, -40, 120, B0 + 40);           // the parapet below (mostly hidden behind the table)
      c.fillRect(-60, B1, 120, 1.3); c.fillStyle = '#4a3249'; c.fillRect(-60, B1 - .3, 120, .45);
      c.fillStyle = SIL;
      for (let x = -59; x < 60; x += 2.7) {   // slim vase-shaped balusters with clear gaps between them
        c.beginPath(); c.moveTo(x - .3, by(9.5)); c.lineTo(x - .4, by(10.4)); c.bezierCurveTo(x - .95, by(11.6), x - .9, by(14.4), x - .3, by(15.6)); c.lineTo(x - .22, by(17.3)); c.lineTo(x - .45, by(18.7));
        c.lineTo(x + .45, by(18.7)); c.lineTo(x + .22, by(17.3)); c.lineTo(x + .3, by(15.6)); c.bezierCurveTo(x + .9, by(14.4), x + .95, by(11.6), x + .4, by(10.4)); c.lineTo(x + .3, by(9.5)); c.fill();
      }
      c.fillStyle = 'rgba(255,196,150,.5)'; c.fillRect(-60, B1 + 1.2, 120, .1);   // the rail's sunlit edge
      // bougainvillea trailing over the rail and in from the corners, out of focus
      blur(c, .9 * ppu);
      const flower = (x, y, n, sx, sy) => { for (let i = 0; i < n; i++) { const fx = x + (R() - .5) * sx, fy = y + (R() - .5) * sy; c.fillStyle = R() > .28 ? `rgba(${205 + R() * 40 | 0},${48 + R() * 40 | 0},${128 + R() * 40 | 0},.9)` : `rgba(${58 + R() * 20 | 0},${92 + R() * 20 | 0},${52},.9)`; ell(c, fx, fy, .45 + R() * .6, .4 + R() * .45); } };
      flower(-26, 21.8, 60, 16, 3.2); flower(-33, 18.5, 26, 6, 5); flower(30, 21.8, 40, 12, 2.6); flower(-28, 30, 70, 26, 9); flower(36, 30, 40, 22, 7); flower(-9, 34, 30, 14, 4);
      blur(c, 0);
    }, { px: 2048 });
    scene.add(new TT.HemisphereLight(0xfbeee8, 0xffdcc4, .5));
    const key = dirLight(TT, 0xffc896, 1.15, [-8, 9, -22], 15); scene.add(key);
    const fill = new TT.DirectionalLight(0xffe4dc, .38); fill.position.set(5, 12, 16); scene.add(fill);
    return { bg: '#e8a07c', exp: .8, key, env: { top: '#d8bcc4', bottom: '#f6dcc8', panels: [[-12, 3, -20, 10, 4, '#ffcf9a', 3], [0, 16, -8, 26, 8, '#c8b6f0', .8], [0, 6, 18, 20, 5, '#ffe2d4', .55]] } };
  };

  /* ---------- 5 · 夜の書斎: walnut desk, leather desk mat, a banker's lamp, a blurred bookshelf ---------- */
  TABLES[5] = (o) => {
    const { TT, g, scene } = o;
    const MAT = .16;
    const desk = M({ map: woodTop('tbl5-walnut', '#80502f', '#3a1f10', sz(o, 2048), sz(o, 2048)), roughness: .4, clearcoat: .45, clearcoatRoughness: .3, bumpScale: .002 });
    const t = new TT.Mesh(RB(48, 1.6, 36, .5, 3), desk); t.position.set(0, -MAT - .8, 5); t.receiveShadow = true; g.add(t);
    // the desk mat: dark green leather, a tooled gold line and a stitched edge
    const LW = 24, LD = 16, LT = sz(o, 1024), LH = Math.round(LT * LD / LW);
    const lt = canvasTex('tbl5-leather', LT, LH, (c, W, H) => {
      const N = makeNoise(17), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = N(x / 2.2, y / 2.2, 2), k = (p - .5) * 22 + (N(x / 70, y / 70, 3) - .5) * 14, i = (y * W + x) * 4;
        d[i] = 30 + k * .5; d[i + 1] = 52 + k * .8; d[i + 2] = 40 + k * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      const u = W / LW;
      c.strokeStyle = 'rgba(214,176,96,.85)'; c.lineWidth = Math.max(1, u * .07); c.strokeRect(u * 1.1, u * 1.1, W - u * 2.2, H - u * 2.2);
      c.strokeStyle = 'rgba(214,176,96,.5)'; c.lineWidth = Math.max(1, u * .035); c.strokeRect(u * 1.35, u * 1.35, W - u * 2.7, H - u * 2.7);
      c.strokeStyle = 'rgba(190,180,150,.55)'; c.lineWidth = Math.max(1, u * .05); c.setLineDash([u * .22, u * .16]); c.strokeRect(u * .4, u * .4, W - u * .8, H - u * .8);
    });
    const mat = new TT.Mesh(RB(LW, MAT, LD, .07, 2), [M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 }), M({ map: lt, roughness: .62, clearcoat: .15, clearcoatRoughness: .6, bumpScale: .004 }), M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 }), M({ color: 0x1c2a20, roughness: .6 })]);
    mat.position.set(0, -MAT / 2, 0); mat.receiveShadow = true; g.add(mat);
    // banker's lamp (back left): brass base and stem, a green glass shade glowing underneath
    const brass = M({ color: 0xc8a050, metalness: 1, roughness: .28 }), LX = -12.5, LZ = -8.5;
    const base = new TT.Mesh(new TT.CylinderGeometry(1.5, 1.8, .45, 32), brass); base.position.set(LX, .22 - MAT, LZ); base.castShadow = true; g.add(base);
    const stem = new TT.Mesh(new TT.CylinderGeometry(.16, .16, 3.4, 12), brass); stem.position.set(LX, 2.1 - MAT, LZ); g.add(stem);
    const arm = new TT.Mesh(new TT.CylinderGeometry(.12, .12, 2.2, 10), brass); arm.rotation.x = Math.PI / 2; arm.position.set(LX, 3.75 - MAT, LZ + 1.1); g.add(arm);
    const glass = M({ color: 0x0f5a2c, roughness: .15, clearcoat: 1, clearcoatRoughness: .05, emissive: new TT.Color(0x05200d) });
    const shade = new TT.Mesh(new TT.CylinderGeometry(1.25, 1.25, 6.2, 28, 1, true, 0, Math.PI), glass); shade.rotation.set(0, 0, Math.PI / 2); shade.rotation.order = 'ZYX'; shade.position.set(LX, 4.1 - MAT, LZ + 2.1);
    shade.material.side = TT.DoubleSide; shade.castShadow = true; g.add(shade);
    const capM = M({ color: 0xc8a050, metalness: 1, roughness: .3 });
    [-3.1, 3.1].forEach(dx => { const cp = new TT.Mesh(new TT.CircleGeometry(1.27, 20, 0, Math.PI), capM); cp.rotation.y = dx > 0 ? Math.PI / 2 : -Math.PI / 2; cp.rotation.order = 'YXZ'; cp.position.set(LX + dx, 4.1 - MAT, LZ + 2.1); g.add(cp); });
    const glow = new TT.Mesh(new TT.PlaneGeometry(6, 2.2), new TT.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })); glow.rotation.x = Math.PI / 2; glow.position.set(LX, 3.95 - MAT, LZ + 2.1); g.add(glow);
    // a stack of books (back right)
    [[0x5a2420, 7, 5, 1.1, .05], [0x23392c, 6.4, 4.6, .9, -.08], [0x6b4a24, 6.8, 4.8, 1, .12]].reduce((y, [col, w, d, h, r]) => {
      const b = new TT.Mesh(RB(w, h, d, .08, 2), M({ color: col, roughness: .6 })); b.position.set(15, y + h / 2, -7.5); b.rotation.y = r; b.castShadow = b.receiveShadow = true; g.add(b);
      const pg = new TT.Mesh(RB(w - .3, h - .25, d - .1, .04, 1), M({ color: 0xe8dcc0, roughness: .8 })); pg.position.set(15 + .17, y + h / 2, -7.5); pg.rotation.y = r; g.add(pg);
      return y + h;
    }, -MAT);
    backdrop(o, 'tbl5-bd', (c, ppu) => {
      const R = rng(23);
      c.fillStyle = '#100a06'; c.fillRect(-60, -40, 120, 80);
      // the bookshelf: dark shelves full of spines, in the warm falloff of the lamp
      const SH = [10, 16.2, 23.4, 30.6, 37.8];
      blur(c, 1.2 * ppu);
      for (let s = 0; s < SH.length - 1; s++) {
        let x = -58; const y0 = SH[s] + .6, top = SH[s + 1];
        while (x < 58) {
          const w = .55 + R() * .75, h = Math.min(top - y0 - .4, 3.6 + R() * 2.4), pal = ['#5c1f1a', '#2a3c2c', '#6d4a28', '#1e2a3c', '#7a6440', '#3d2a20', '#8a3a24', '#40463a'];
          const lean = R() < .06 ? .25 : 0;
          c.fillStyle = pal[R() * pal.length | 0]; c.save(); c.translate(x, y0); c.transform(1, 0, lean, 1, 0, 0); c.fillRect(0, 0, w, h);
          if (R() > .4) { c.fillStyle = 'rgba(210,170,90,.55)'; c.fillRect(0, h * .78, w, .18); c.fillRect(0, h * .2, w, .12); }
          c.restore(); x += w + (R() < .08 ? 1.5 + R() * 2 : .04);
        }
      }
      c.fillStyle = '#2a1a0f'; SH.forEach(y => c.fillRect(-60, y, 120, .7));
      c.fillStyle = '#1c1108'; [-40, -14, 12, 38].forEach(x => c.fillRect(x, 0, .9, 40));
      // the lamp's warm light falls on the left of the shelf; the right sinks into the dark
      blur(c, 0);
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = rad(c, -16, 16, 46, [[0, '#ffffff'], [.45, '#c4a68e'], [1, '#3a2c26']]); c.fillRect(-60, -40, 120, 80);
      c.globalCompositeOperation = 'source-over';
      c.fillStyle = rad(c, -16, 14, 22, [[0, 'rgba(255,170,90,.22)'], [1, 'rgba(255,150,70,0)']]); c.fillRect(-60, -40, 120, 80);
      c.fillStyle = lin(c, 9, 4, [[0, 'rgba(10,6,4,0)'], [1, 'rgba(10,6,4,.9)']]); c.fillRect(-60, -40, 120, 49);
    });
    scene.add(new TT.HemisphereLight(0x6a78a8, 0x1a0e08, .2));
    const key = new TT.SpotLight(0xffc27e, 4.6, 70, 1.0, .9, 1.25); key.position.set(LX, 3.7 - MAT, LZ + 2.1); key.target.position.set(2, 0, 3); scene.add(key); scene.add(key.target);
    key.shadow.camera.near = 1; key.shadow.camera.far = 50; key.shadow.bias = -.0003;
    const pool = new TT.PointLight(0xffb060, .9, 16, 2); pool.position.set(LX, 3.1, LZ + 2.1); scene.add(pool);
    const moon = new TT.DirectionalLight(0x8090c8, .16); moon.position.set(14, 12, 12); scene.add(moon);
    return { bg: '#0d0906', exp: 1.0, key, env: { top: '#2e2218', bottom: '#080504', panels: [[-12, 6, -6, 8, 5, '#ffc070', 5], [14, 10, 6, 7, 9, '#7a88b8', .6], [0, 10, 18, 20, 5, '#5a4636', .8], [-16, 4, 10, 5, 6, '#ffb060', .8]] } };
  };
})();
