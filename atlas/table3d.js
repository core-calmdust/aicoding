/* =====================================================================
   World Board Game Atlas — 3D tabletop (three.js r128, global THREE)
   Table3D.mount(el)          creates the scene in a container
   Table3D.show(gameId)       swaps the board on the table (slide + spin)
   Table3D.MODELS[id]()       board builders — reused later by the 3D game skins
   Everything is procedural (no model files): wood/felt textures are drawn
   on canvases, pieces are lathes / cylinders / extrusions.
   ===================================================================== */
(function () {
  'use strict';
  const T = () => window.THREE;

  /* ---------- procedural textures ---------- */
  const texCache = {};
  function canvasTex(key, w, h, draw, rep) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new (T().CanvasTexture)(c);
    t.anisotropy = 4; t.encoding = T().sRGBEncoding;
    if (rep) { t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(rep, rep); }
    return (texCache[key] = t);
  }
  function wood(key, base, dark, w = 512, h = 512, grain = 1) {
    return canvasTex(key, w, h, (g, W, H) => {
      g.fillStyle = base; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 90 * grain; i++) {
        const y = Math.random() * H, a = .04 + Math.random() * .1;
        g.strokeStyle = dark; g.globalAlpha = a; g.lineWidth = 1 + Math.random() * 3;
        g.beginPath(); g.moveTo(0, y);
        for (let x = 0; x <= W; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 4 + Math.sin(x / 23) * 1.5);
        g.stroke();
      }
      g.globalAlpha = 1;
    });
  }
  function grid(key, base, line, n, m, opts = {}) {
    return canvasTex(key, 1024, 1024 * (m / n) | 0, (g, W, H) => {
      if (opts.woodBase) { g.drawImage(wood(key + 'w', base, opts.woodBase).image, 0, 0, W, H); }
      else { g.fillStyle = base; g.fillRect(0, 0, W, H); }
      const pad = opts.pad ?? 0, cw = (W - 2 * pad) / (opts.points ? n - 1 : n), ch = (H - 2 * pad) / (opts.points ? m - 1 : m);
      g.strokeStyle = line; g.lineWidth = opts.lw || 4;
      const cols = opts.points ? n : n + 1, rows = opts.points ? m : m + 1;
      for (let i = 0; i < cols; i++) { g.beginPath(); g.moveTo(pad + i * cw, pad); g.lineTo(pad + i * cw, H - pad); g.stroke(); }
      for (let j = 0; j < rows; j++) { g.beginPath(); g.moveTo(pad, pad + j * ch); g.lineTo(W - pad, pad + j * ch); g.stroke(); }
      (opts.stars || []).forEach(([x, y]) => { g.fillStyle = line; g.beginPath(); g.arc(pad + x * cw, pad + y * ch, opts.lw * 2.2, 0, 7); g.fill(); });
      if (opts.after) opts.after(g, W, H);
    });
  }

  /* ---------- material helpers ---------- */
  const M = (o) => {   // colours are given as sRGB hex (as designed) → convert to linear for the sRGB output
    const m = new (T().MeshStandardMaterial)(Object.assign({ roughness: .55, metalness: 0 }, o));
    if (o.color !== undefined) m.color.convertSRGBToLinear();
    return m;
  };
  function mesh(geo, mat, x = 0, y = 0, z = 0) {
    const m = new (T().Mesh)(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
  }
  function slab(w, h, d, top, side) {   // box with a textured top face
    const s = side || M({ color: 0x9b6a3c });
    const mats = [s, s, top, s, s, s];
    return mesh(new (T().BoxGeometry)(w, h, d), mats, 0, h / 2, 0);
  }
  function disc(r, h, mat, seg = 40) { return mesh(new (T().CylinderGeometry)(r, r, h, seg), mat); }
  function bevelDisc(r, h, mat) {   // rounded checker / stone
    const pts = [], s = 12;
    for (let i = 0; i <= s; i++) { const a = -Math.PI / 2 + Math.PI * i / s; pts.push(new (T().Vector2)(Math.max(.001, r - h / 2 + Math.cos(a) * h / 2), h / 2 + Math.sin(a) * h / 2)); }
    pts.unshift(new (T().Vector2)(0, 0)); pts.push(new (T().Vector2)(0, h));
    return mesh(new (T().LatheGeometry)(pts, 40), mat);
  }
  function stone(r, mat) { const m = mesh(new (T().SphereGeometry)(r, 32, 16), mat); m.scale.y = .42; return m; }
  const cellPos = (n, size, i) => -size / 2 + size / n * (i + .5);

  /* ---------- board builders ---------- */
  const WHITE = () => M({ color: 0xf6f3ea, roughness: .35 }), BLACK = () => M({ color: 0x24262d, roughness: .3 });
  const MODELS = {
    reversi(live) {
      const g = new (T().Group)(), S = 8.4;
      const top = M({ map: grid('rv', '#1f9a5c', '#0d5a34', 8, 8, { lw: 5, stars: [[2, 2], [6, 2], [2, 6], [6, 6]] }) });
      g.add(slab(9.4, .45, 9.4, M({ color: 0x0f6d40 }), M({ color: 0x0b4f2f })));
      const inner = slab(S, .1, S, top); inner.position.y = .45; g.add(inner);
      g.userData.S = S; g.userData.top = .55;
      if (live) return g;
      const pos = { 27: 0, 28: 1, 35: 1, 36: 0, 19: 1, 26: 1, 37: 0, 44: 1, 20: 0, 29: 1 };
      const W = WHITE(), B = BLACK();
      for (const k in pos) {
        const i = +k, x = cellPos(8, S, i % 8), z = cellPos(8, S, i / 8 | 0);
        const d = new (T().Group)();
        const a = bevelDisc(.44, .1, pos[k] ? B : W), b = bevelDisc(.44, .1, pos[k] ? W : B);
        b.position.y = .1; d.add(a, b); d.position.set(x, .56, z); g.add(d);
      }
      return g;
    },
    shogi() {
      const g = new (T().Group)(), S = 8.6;
      const top = M({ map: grid('sh', '#e9bf73', '#3a2410', 9, 9, { woodBase: '#b8873f', lw: 3, stars: [[3, 3], [6, 3], [3, 6], [6, 6]] }), roughness: .45 });
      g.add(slab(9.6, 1.1, 9.6, top, M({ map: wood('shs', '#d8a65a', '#9a6a2a') })));
      // legs
      for (const [x, z] of [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]]) g.add(mesh(new (T().CylinderGeometry)(.55, .45, .6, 16), M({ color: 0x8a5a2a }), x, -.3, z));
      const piece = (ch, flip) => {
        const sh = new (T().Shape)(); sh.moveTo(0, .45); sh.lineTo(.3, .3); sh.lineTo(.37, -.42); sh.lineTo(-.37, -.42); sh.lineTo(-.3, .3); sh.closePath();
        const geo = new (T().ExtrudeGeometry)(sh, { depth: .14, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 2 });
        const label = canvasTex('k' + ch, 128, 128, (c, W, H) => { c.fillStyle = '#f2d59a'; c.fillRect(0, 0, W, H); c.fillStyle = '#1d120a'; c.font = '900 78px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, W / 2, H / 2 + 10); });
        const m = mesh(geo, [M({ map: label, roughness: .5 }), M({ color: 0xe0b56d })]);
        // map UVs so the label covers the face
        const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + .45) / .9, (uv.getY(i) + .5) / 1);
        m.rotation.x = -Math.PI / 2; if (flip) m.rotation.z = Math.PI;
        return m;
      };
      const row = ['香', '桂', '銀', '金', '王', '金', '銀', '桂', '香'];
      row.forEach((c, i) => { const p = piece(c, true); p.position.set(cellPos(9, S, i), 1.12, cellPos(9, S, 0)); g.add(p); const q = piece(c === '王' ? '玉' : c, false); q.position.set(cellPos(9, S, i), 1.12, cellPos(9, S, 8)); g.add(q); });
      for (let i = 0; i < 9; i++) { const p = piece('歩', true); p.position.set(cellPos(9, S, i), 1.12, cellPos(9, S, 2)); g.add(p); const q = piece('歩', false); q.position.set(cellPos(9, S, i), 1.12, cellPos(9, S, 6)); g.add(q); }
      [['飛', 7, 1, false], ['角', 1, 7, false], ['飛', 1, 1, true], ['角', 7, 7, true]].forEach(([c, x, z, f]) => { const p = piece(c, f); p.position.set(cellPos(9, S, x), 1.12, cellPos(9, S, f ? 1 : 7)); g.add(p); });
      return g;
    },
    chess() {
      const g = new (T().Group)(), S = 8.4;
      const top = M({ map: canvasTex('cs', 512, 512, (c, W) => { const s = W / 8; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#7a5434' : '#f0d9b0'; c.fillRect(x * s, y * s, s, s); } }), roughness: .35 });
      g.add(slab(9.6, .5, 9.6, M({ map: wood('cb', '#6b4325', '#3f2512') }), M({ map: wood('cb', '#6b4325', '#3f2512') })));
      const inner = slab(S, .06, S, top); inner.position.y = .5; g.add(inner);
      const prof = { p: [[.32, 0], [.3, .08], [.18, .14], [.13, .45], [.2, .5], [.2, .58], [0, .78]], r: [[.36, 0], [.34, .1], [.22, .16], [.2, .7], [.3, .75], [.3, .95], [0, .95]], b: [[.36, 0], [.34, .1], [.2, .16], [.14, .7], [.24, .78], [.18, 1.05], [.06, 1.18], [0, 1.22]],
        q: [[.38, 0], [.36, .1], [.22, .18], [.14, .9], [.26, 1], [.2, 1.18], [.08, 1.3], [0, 1.36]], k: [[.38, 0], [.36, .1], [.22, .18], [.16, .95], [.28, 1.05], [.22, 1.25], [.06, 1.3], [0, 1.32]] };
      const lathe = (t, mat) => mesh(new (T().LatheGeometry)(prof[t].map(([r, y]) => new (T().Vector2)(r, y)), 32), mat);
      const knight = mat => { const gr = new (T().Group)(); gr.add(lathe('p', mat)); const sh = new (T().Shape)(); sh.moveTo(-.18, 0); sh.lineTo(.2, 0); sh.lineTo(.22, .35); sh.lineTo(.05, .62); sh.lineTo(-.28, .5); sh.lineTo(-.22, .38); sh.lineTo(-.05, .4); sh.closePath(); const h = mesh(new (T().ExtrudeGeometry)(sh, { depth: .2, bevelEnabled: true, bevelSize: .04, bevelThickness: .04 }), mat); h.position.set(0, .45, -.1); gr.add(h); return gr; };
      const W = M({ color: 0xf3ead8, roughness: .3 }), B = M({ color: 0x2b2522, roughness: .3 });
      const back = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
      [[0, B, 1], [7, W, 6]].forEach(([r, mat, pr]) => {
        back.forEach((t, i) => { const p = t === 'n' ? knight(mat) : lathe(t, mat); p.position.set(cellPos(8, S, i), .56, cellPos(8, S, r)); if (t === 'n') p.rotation.y = r ? -Math.PI / 2 : Math.PI / 2; g.add(p); });
        for (let i = 0; i < 8; i++) { const p = lathe('p', mat); p.position.set(cellPos(8, S, i), .56, cellPos(8, S, pr)); g.add(p); }
      });
      return g;
    },
    gomoku() {
      const g = new (T().Group)(), S = 9;
      const top = M({ map: grid('gm', '#e7b768', '#2a1a0a', 15, 15, { points: true, pad: 40, lw: 2.5, woodBase: '#c8944a', stars: [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]] }) });
      g.add(slab(S, 1, S, top, M({ map: wood('gms', '#d9a35a', '#a06a2a') })));
      const W = M({ color: 0xf7f5ef, roughness: .25 }), B = M({ color: 0x1a1b20, roughness: .2 }), step = (S - 2 * S * 40 / 1024) / 14;
      [[7, 7, 1], [8, 6, 0], [8, 7, 1], [6, 8, 0], [9, 7, 1], [7, 6, 0], [6, 6, 1], [6, 7, 0], [7, 8, 1], [5, 9, 0], [9, 9, 1], [10, 7, 0], [8, 8, 1], [5, 7, 0]].forEach(([x, y, b]) => {
        const s = stone(.33, b ? B : W); s.position.set(-S / 2 + S * 40 / 1024 + x * step, 1.08, -S / 2 + S * 40 / 1024 + y * step); g.add(s);
      });
      return g;
    },
    dots() {
      const g = new (T().Group)(), S = 8, n = 5;
      g.add(slab(9, .3, 9, M({ color: 0xfdfaf2, roughness: .9 }), M({ color: 0xe6e0d0 })));
      const dotM = M({ color: 0x2b3044 }), A = M({ color: 0xff6b6b }), Bm = M({ color: 0x4cc3ff });
      const p = i => -S / 2 + S / (n - 1) * i;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const d = disc(.16, .14, dotM, 20); d.position.set(p(i), .37, p(j)); g.add(d); }
      const seg = (x1, z1, x2, z2, mat) => { const m = mesh(new (T().BoxGeometry)(S / (n - 1) - .3, .1, .14), mat); m.position.set((p(x1) + p(x2)) / 2, .36, (p(z1) + p(z2)) / 2); if (z1 !== z2) m.rotation.y = Math.PI / 2; g.add(m); };
      [[0, 0, 1, 0, A], [0, 0, 0, 1, A], [1, 0, 1, 1, Bm], [0, 1, 1, 1, A], [1, 1, 2, 1, Bm], [2, 0, 2, 1, Bm], [1, 0, 2, 0, Bm], [2, 2, 3, 2, A], [3, 2, 3, 3, A], [0, 3, 0, 4, Bm], [1, 3, 1, 4, A]].forEach(a => seg(...a));
      const box = (x, z, mat) => { const b = mesh(new (T().BoxGeometry)(S / (n - 1) * .8, .04, S / (n - 1) * .8), mat); b.position.set(p(x) + S / (n - 1) / 2, .32, p(z) + S / (n - 1) / 2); g.add(b); };
      box(0, 0, M({ color: 0xffc2c2 })); box(1, 0, M({ color: 0xbfe8ff }));
      return g;
    },
    connect4() {
      const g = new (T().Group)(), cols = 7, rows = 6, s = 1.15;
      const W = cols * s + .5, H = rows * s + .5;
      const sh = new (T().Shape)(); sh.moveTo(-W / 2, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.closePath();
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) { const h = new (T().Path)(); h.absarc(-W / 2 + .25 + s * (c + .5), .25 + s * (r + .5), .44, 0, Math.PI * 2, true); sh.holes.push(h); }
      const frame = mesh(new (T().ExtrudeGeometry)(sh, { depth: .45, bevelEnabled: true, bevelSize: .08, bevelThickness: .08 }), M({ color: 0x2a6fe8, roughness: .35 }));
      frame.position.set(0, .6, -.22); g.add(frame);
      [-W / 2 - .2, W / 2 + .2].forEach(x => { const f = mesh(new (T().BoxGeometry)(.5, .6, 3), M({ color: 0x1f58c0 })); f.position.set(x, .3, 0); g.add(f); });
      const R = M({ color: 0xff5050, roughness: .35 }), Y = M({ color: 0xffd23f, roughness: .35 });
      [[3, 0, R], [3, 1, Y], [2, 0, Y], [4, 0, R], [4, 1, R], [3, 2, R], [5, 0, Y], [2, 1, Y], [4, 2, Y]].forEach(([c, r, m]) => {
        const d = disc(.44, .3, m, 32); d.rotation.x = Math.PI / 2; d.position.set(-W / 2 + .25 + s * (c + .5), .6 + .25 + s * (r + .5), 0); g.add(d);
      });
      g.position.z = -.5; g.scale.setScalar(.78);
      return g;
    },
    mancala() {
      const g = new (T().Group)();
      const body = mesh(new (T().BoxGeometry)(10.5, .9, 4.2), M({ map: wood('mc', '#b07842', '#6e4520', 512, 512, 1.4), roughness: .5 })); body.position.y = .45; g.add(body);
      const pit = M({ color: 0x5e3a1a, roughness: .8 }), gems = [0xff6b6b, 0x4cc3ff, 0xffd23f, 0x4fd8a0, 0xa17cff, 0xff8fc7].map(c => M({ color: c, roughness: .15, metalness: .1 }));
      const addPit = (x, z, r, sx, cnt) => {
        const p = mesh(new (T().CylinderGeometry)(r, r * .82, .08, 32), pit); p.scale.x = sx; p.position.set(x, .93, z); g.add(p);
        const rim = mesh(new (T().TorusGeometry)(r, .06, 8, 32), M({ color: 0xc9925a })); rim.rotation.x = Math.PI / 2; rim.scale.x = sx; rim.position.set(x, .95, z); g.add(rim);
        for (let i = 0; i < cnt; i++) { const s = mesh(new (T().SphereGeometry)(.17, 14, 10), gems[(i + Math.round(x * 3)) % 6]); s.scale.y = .7; const a = i * 2.4, rr = .12 + .1 * (i % 3); s.position.set(x + Math.cos(a) * rr * sx, 1.04 + .08 * (i / 3 | 0), z + Math.sin(a) * rr); g.add(s); }
      };
      for (let i = 0; i < 6; i++) { addPit(-3.5 + i * 1.4, -1, .55, 1, 4); addPit(-3.5 + i * 1.4, 1, .55, 1, 4); }
      addPit(-4.75, 0, .5, 1.1, 3); addPit(4.75, 0, .5, 1.1, 5);
      return g;
    },
    backgammon() {
      const g = new (T().Group)();
      const top = M({ map: canvasTex('bgb', 1024, 768, (c, W, H) => {
        c.fillStyle = '#e9dcc0'; c.fillRect(0, 0, W, H); c.fillStyle = '#7a4a2a'; c.fillRect(W / 2 - 24, 0, 48, H);
        const pw = (W / 2 - 24) / 6;
        for (let half = 0; half < 2; half++) for (let i = 0; i < 6; i++) {
          const x0 = half * (W / 2 + 24) + i * pw;
          [[0, 1], [H, -1]].forEach(([y0, d], k) => { c.fillStyle = (i + k) % 2 ? '#2a8f8a' : '#d0543c'; c.beginPath(); c.moveTo(x0 + 4, y0); c.lineTo(x0 + pw - 4, y0); c.lineTo(x0 + pw / 2, y0 + d * H * .42); c.closePath(); c.fill(); });
        }
      }) });
      g.add(slab(11, .5, 8.25, M({ map: wood('bgw', '#7a4a2a', '#4a2a12') }), M({ map: wood('bgw', '#7a4a2a', '#4a2a12') })));
      const inner = slab(10.2, .05, 7.6, top); inner.position.y = .5; g.add(inner);
      const W = M({ color: 0xf4efe2, roughness: .3 }), B = M({ color: 0x3a2018, roughness: .3 });
      const px = i => { const half = i < 6 ? 0 : 1, k = i % 6; return -5.1 + half * (5.1 + .375) + (k + .5) * (5.1 - .375) / 6; };
      const stack = (i, top, n, mat) => { for (let k = 0; k < n; k++) { const d = bevelDisc(.36, .16, mat); d.position.set(px(i), .56, top ? -3.4 + k * .72 : 3.4 - k * .72); g.add(d); } };
      stack(0, true, 2, W); stack(11, true, 5, B); stack(7, true, 3, B); stack(5, true, 5, W);
      stack(0, false, 2, B); stack(11, false, 5, W); stack(7, false, 3, W); stack(5, false, 5, B);
      const die = (x, z, ry) => { const d = mesh(new (T().BoxGeometry)(.6, .6, .6), M({ color: 0xffffff, roughness: .3 })); d.position.set(x, .83, z); d.rotation.y = ry; g.add(d); };
      die(2.4, .3, .4); die(3.3, -.2, -.3);
      return g;
    },
    morris() {
      const g = new (T().Group)(), S = 8.4;
      const top = M({ map: canvasTex('nm', 1024, 1024, (c, W) => {
        c.drawImage(wood('nmw', '#e2c08a', '#a8804a').image, 0, 0, W, W);
        c.strokeStyle = '#3a2410'; c.lineWidth = 10; const p = v => 80 + v * (W - 160) / 6;
        [0, 1, 2].forEach(k => c.strokeRect(p(k), p(k), p(6 - k) - p(k), p(6 - k) - p(k)));
        c.beginPath(); [[3, 0, 3, 2], [3, 4, 3, 6], [0, 3, 2, 3], [4, 3, 6, 3]].forEach(([a, b, x, y]) => { c.moveTo(p(a), p(b)); c.lineTo(p(x), p(y)); }); c.stroke();
        c.fillStyle = '#3a2410'; [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]].forEach(([x, y]) => { c.beginPath(); c.arc(p(x), p(y), 18, 0, 7); c.fill(); });
      }) });
      g.add(slab(S + .8, .6, S + .8, top, M({ color: 0x8a5a2a })));
      const W = M({ color: 0xf3ead8, roughness: .35 }), B = M({ color: 0x5a2a1a, roughness: .35 }), p = v => -S / 2 + .4 + v * (S - .8) / 6 * (S - 1.2) / (S - .8);
      [[0, 0, W], [3, 1, B], [6, 0, W], [2, 2, B], [4, 3, W], [5, 5, B], [3, 6, W], [1, 3, B]].forEach(([x, y, m]) => { const d = bevelDisc(.4, .22, m); d.position.set(p(x) - .02, .62, p(y)); g.add(d); });
      return g;
    },
    sudoku() {
      const g = new (T().Group)();
      const top = M({ map: grid('sd', '#fffdf6', '#2b3044', 9, 9, { lw: 3, after: (c, W) => { c.lineWidth = 9; for (let i = 0; i <= 3; i++) { c.beginPath(); c.moveTo(i * W / 3, 0); c.lineTo(i * W / 3, W); c.moveTo(0, i * W / 3); c.lineTo(W, i * W / 3); c.stroke(); } c.fillStyle = '#2b3044'; c.font = '700 70px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const d = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'; for (let i = 0; i < 81; i++) if (d[i] !== '0') c.fillText(d[i], (i % 9 + .5) * W / 9, ((i / 9 | 0) + .55) * W / 9); } }), roughness: .9 });
      const p = slab(8, .08, 8, top, M({ color: 0xf0ead8 })); p.rotation.y = .12; g.add(p);
      const pen = mesh(new (T().CylinderGeometry)(.12, .12, 5, 12), M({ color: 0xff8fc7 })); pen.rotation.z = Math.PI / 2; pen.rotation.y = .6; pen.position.set(3.6, .25, 3.4); g.add(pen);
      return g;
    },
  };

  /* ---------- scene ---------- */
  let R, scene, cam, root, cur = null, el = null, drag = null, yaw = 0, spin = true, mode = 'view', camK = 0, camTo = 0;
  function mount(container) {
    el = container;
    R = new (T().WebGLRenderer)({ antialias: true, alpha: true });
    R.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    R.shadowMap.enabled = true; R.shadowMap.type = T().PCFSoftShadowMap;
    R.outputEncoding = T().sRGBEncoding; R.toneMapping = T().ACESFilmicToneMapping; R.toneMappingExposure = .85;
    container.appendChild(R.domElement);
    scene = new (T().Scene)();
    cam = new (T().PerspectiveCamera)(32, 1, .1, 200);
    scene.add(new (T().HemisphereLight)(0xfff4e0, 0x6a4a30, .6));
    const key = new (T().DirectionalLight)(0xfff0d8, 1.05); key.position.set(-6, 14, 8); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 }); key.shadow.bias = -.0005;
    scene.add(key);
    const rim = new (T().DirectionalLight)(0xbfe0ff, .35); rim.position.set(8, 6, -10); scene.add(rim);
    const table = new (T().Mesh)(new (T().CircleGeometry)(80, 64), M({ map: wood('table', '#c98b52', '#8a5428', 1024, 1024, 2), roughness: .6 }));
    table.rotation.x = -Math.PI / 2; table.receiveShadow = true; scene.add(table);
    root = new (T().Group)(); scene.add(root);
    container.addEventListener('pointerdown', e => { if (mode === 'view') { drag = { x: e.clientX, y: yaw }; spin = false; } });
    container.addEventListener('pointermove', e => { if (drag) yaw = drag.y + (e.clientX - drag.x) * .008; });
    const up = () => { drag = null; };
    container.addEventListener('pointerup', up); container.addEventListener('pointercancel', up);
    new ResizeObserver(resize).observe(container); resize();
    loop();
  }
  function resize() {
    if (!R) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  // camera distance keeps a ~11-unit board in frame for any aspect ratio
  function camPose(k) {
    const a = cam.aspect || 1, th = Math.tan(cam.fov * Math.PI / 360);
    // keep the board (~10.5 wide incl. margin, ~9 deep) inside both the width and the height of the view
    const needW = (k ? 5.4 : 6.2) / (th * a), needH = (k ? 6.3 : 6.4) / th;
    const dist = Math.max(needW, needH) * (k ? 1 : 1.08);
    const pitch = .78 + k * .55;                       // view: 3/4 · play: nearly top-down
    return [0, dist * Math.sin(pitch), dist * Math.cos(pitch)];
  }
  function show(id, model) {
    if (!R) return null;
    mode = 'view'; camTo = 0; spin = true; yaw = 0;
    if (cur) { const old = cur; root.remove(old); old.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const g = model || (MODELS[id] ? MODELS[id]() : null);
    cur = null; if (!g) return null;
    cur = new (T().Group)(); cur.add(g); root.add(cur);
    const c = cur, start = performance.now();
    c.scale.setScalar(.01);
    (function anim(now) {   // pop in: drop + springy scale
      const k = Math.min(1, (now - start) / 560);
      const e = k === 1 ? 1 : 1 - Math.pow(2, -9 * k) * Math.cos(k * 10);
      c.scale.setScalar(Math.max(.01, e)); c.position.y = Math.max(0, 1 - k * 1.8) * 4;
      if (k < 1) requestAnimationFrame(anim);
    })(start);
    return g;
  }
  function play(on) { mode = on ? 'play' : 'view'; camTo = on ? 1 : 0; spin = !on; }
  // pointer → point on the horizontal plane at height y, in the current model's local space
  function pick(ev, y) {
    if (!cur) return null;
    const r = el.getBoundingClientRect();
    const v = new (T().Vector2)(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    const rc = new (T().Raycaster)(); rc.setFromCamera(v, cam);
    const p = new (T().Vector3)();
    if (!rc.ray.intersectPlane(new (T().Plane)(new (T().Vector3)(0, 1, 0), -(y || 0)), p)) return null;
    cur.worldToLocal(p); return { x: p.x, z: p.z };
  }
  function loop() {
    requestAnimationFrame(loop);
    if (document.hidden || !el.offsetParent) return;
    camK += (camTo - camK) * .07;
    if (mode === 'play') yaw *= .88; else if (spin) yaw += .004;
    root.rotation.y = mode === 'play' ? yaw : Math.sin(yaw) * .5;
    const p = camPose(camK), q = camPose(0), r2 = camPose(1);
    cam.position.set(0, q[1] + (r2[1] - q[1]) * camK, q[2] + (r2[2] - q[2]) * camK);
    // view mode: on phones the board sits above the info card, on wide screens to the right of it
    cam.lookAt(0, .4, 0);   // the canvas itself is kept clear of the info card (app.js fitStage)
    R.render(scene, cam);
  }
  function project(x, z, y) { const v = new (T().Vector3)(x, y || 0, z); cur.localToWorld(v); v.project(cam); const r = el.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
  window.Table3D = { canvasTex, wood, grid, stone, project, mount, show, play, pick, MODELS, M, mesh, bevelDisc, disc, cellPos, ok: () => !!R };
})();
