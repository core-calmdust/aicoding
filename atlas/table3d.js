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
  // ---- quality tier for older / weaker phones ----
  // 'lite': picked from the device (little memory / few cores on a touch device) or remembered from an earlier
  // visit where the frames were slow (see the adaptive check in loop()). Lite = 1× pixels, no antialias, small soft-free
  // shadows, half-size procedural textures, small parts cast no shadows (they have contact shadows).
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const LITE = (() => { try { if (localStorage.getItem('atlas-lite') === '1') return true; } catch (e) {}
    return COARSE && (navigator.deviceMemory || 8) <= 3; })();   // (core counts are unreliable on iOS: the frame-time check below decides there)
  const texScale = () => (LITE ? .5 : COARSE ? .5 : 1);   // phones never need 2048² procedural textures
  function canvasTex(key, w, h, draw, rep) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new (T().CanvasTexture)(c);
    t.anisotropy = 4; t.encoding = T().sRGBEncoding;
    if (rep) { t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(rep, rep); }
    return (texCache[key] = t);
  }
  // value noise / fbm for natural-looking textures
  function makeNoise(seed) {
    const P = new Uint8Array(512); let x = seed * 9301 + 49297 | 0;
    for (let i = 0; i < 256; i++) P[i] = i;
    for (let i = 255; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [P[i], P[j]] = [P[j], P[i]]; }
    for (let i = 0; i < 256; i++) P[i + 256] = P[i];
    const f = t => t * t * (3 - 2 * t), h = (i, j) => P[P[i & 255] + (j & 255)] / 255;
    const n = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = f(xf), v = f(yf);
      return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
    return (x, y, oct = 4) => { let s = 0, a = .5, fr = 1; for (let o = 0; o < oct; o++) { s += a * n(x * fr, y * fr); a *= .5; fr *= 2.03; } return s / (1 - Math.pow(.5, oct)); };
  }
  const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  // realistic wood: long fibres, growth rings, pores, gentle colour drift
  function wood(key, base, dark, w = 512, h = 512, grain = 1) {
    return canvasTex(key, w, h, (g, W, H) => {
      const N = makeNoise(key.length * 31 + key.charCodeAt(0)), A = hex(base), B = hex(dark), img = g.createImageData(W, H), d = img.data;
      const ringF = 9 * grain;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const warp = N(u * 2.2, v * 6, 4) * 1.6;                                   // fibres run along x
        const ring = Math.sin((v * ringF + warp * 2.4 + N(u * 1.2, v * 1.2, 2) * 2) * Math.PI * 2) * .5 + .5;
        const fibre = N(u * 40, v * 260, 2);
        let t = Math.pow(ring, 2.6) * .55 + fibre * .3 + N(u * 3, v * 3, 3) * .25;
        if (N(u * 90, v * 600, 1) > .82) t += .25;                                 // pores
        t = Math.max(0, Math.min(1, t));
        const i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // flat-sawn tabletop: a log cut by a plane gives cathedral arches; sharp latewood lines, fibre streaks, pores
  function woodTop(key, base, dark, W = 2048, H = 2048) {
    return canvasTex(key, W, H, (g) => {
      const N = makeNoise(77), A = hex(base), B = hex(dark), img = g.createImageData(W, H), d = img.data;
      const freq = 26;
      for (let y = 0; y < H; y++) {
        const v = y / H - .5;
        for (let x = 0; x < W; x++) {
          const u = x / W;
          // mostly straight grain with long gentle waves, and a soft cathedral arch through the middle
          const cath = Math.sqrt(v * v + Math.pow(.09 + (u - .55) * .12, 2)) * 1.0;
          const wob = (N(u * 1.3, v * 2.4, 3) - .5) * .09 + (N(u * 6, v * 9, 2) - .5) * .012;
          const r = Math.abs(v) * .35 + cath * .65 + wob;
          const f = (r * freq) % 1;
          const late = Math.exp(-Math.pow((f - .78) / .07, 2)) + .35 * Math.exp(-Math.pow((f - .78) / .2, 2));   // soft latewood band
          const fibre = N(u * 5, y * .55, 2), fine = N(u * 40, y * 2.2, 1);
          let t = .2 + late * .42 + (fibre - .5) * .32 + (fine - .5) * .12 + (N(u * 1.5, v * 1.5, 2) - .5) * .22;
          if (late > .4 && N(u * 300, y * 1.4, 1) > .78) t += .14;                   // open pores in the latewood
          t = Math.max(0, Math.min(1, t));
          const i = (y * W + x) * 4;
          d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
  }
  // planked wood (table): several boards, each with its own tone, long fibres and flame figure, thin dark seams
  function planks(key, base, dark, n = 4, W = 1024) {
    return canvasTex(key, W, W, (g) => {
      const N = makeNoise(key.length * 7 + 3), A = hex(base), B = hex(dark), img = g.createImageData(W, W), d = img.data, ph = W / n;
      for (let y = 0; y < W; y++) {
        const k = Math.floor(y / ph), vy = (y % ph) / ph, tone = (N(k * 7.3, 1.7, 1) - .5) * .35, off = k * 13.1;
        // tileable in x: blend the pattern at u and u-1 so repeated tiles join without a visible line
        const val = (u) => {
          const flame = Math.sin((vy * 3.2 + N(u * 1.6 + off, vy * 2 + off, 3) * 2.2) * Math.PI * 2) * .5 + .5;
          const fibre = N(u * 6 + off, y / W * 160, 3);
          return Math.pow(flame, 3) * .32 + (fibre - .5) * .55 + (N(u * 120 + off, y / W * 900, 1) > .86 ? .18 : 0);
        };
        for (let x = 0; x < W; x++) {
          const u = x / W, b = u < .5 ? 0 : (u - .5) * 2;
          let t = .18 + tone + val(u) * (1 - b) + val(u - 1) * b;
                    t = Math.max(0, Math.min(1, t));
          const i = (y * W + x) * 4;
          d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
  }
  // felt: dense fine fibres + soft mottling
  function felt(key, base, W = 1024) {
    return canvasTex(key, W, W, (g) => {
      const N = makeNoise(key.length * 23 + 5), A = hex(base), img = g.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = (Math.random() - .5) * 22 + (N(x / 2.2, y / 2.2, 2) - .5) * 26 + (N(x / 40, y / 40, 3) - .5) * 18, i = (y * W + x) * 4;
        d[i] = A[0] + k * .6; d[i + 1] = A[1] + k; d[i + 2] = A[2] + k * .6; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // fine cloth / paper-like noise on a flat colour
  function cloth(key, base, amt = 18, W = 512) {
    return canvasTex(key, W, W, (g) => {
      const N = makeNoise(key.length * 17), A = hex(base), img = g.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = (N(x / 6, y / 6, 2) - .5) * amt + (N(x / 60, y / 60, 3) - .5) * amt * .8, i = (y * W + x) * 4;
        d[i] = A[0] + k; d[i + 1] = A[1] + k; d[i + 2] = A[2] + k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  function grid(key, base, line, n, m, opts = {}) {
    return canvasTex(key, 1024, 1024 * (m / n) | 0, (g, W, H) => {
      if (opts.woodBase) { g.drawImage(wood(key + 'w', base, opts.woodBase).image, 0, 0, W, H); }
      else if (opts.felt) { g.drawImage(felt(key + 'f', base).image, 0, 0, W, H); }
      else if (opts.cloth) { g.drawImage(cloth(key + 'c', base, opts.cloth).image, 0, 0, W, H); }
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
    if (LITE && (o.clearcoat !== undefined || o.sheen !== undefined)) { o = Object.assign({}, o); delete o.clearcoat; delete o.clearcoatRoughness; delete o.sheen; o.roughness = Math.max(.18, (o.roughness ?? .55) * .9); }   // lite: the cheaper standard shader
    const phys = o.clearcoat !== undefined || o.sheen !== undefined;
    const m = new (T()[phys ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'])(Object.assign({ roughness: .55, metalness: 0 }, o));
    if (o.map && o.bump !== false && !o.bumpMap) { m.bumpMap = o.map; m.bumpScale = o.bumpScale ?? .012; }
    if (o.color !== undefined) m.color.convertSRGBToLinear();
    return m;
  };
  const at3 = (o, x, y, z) => { o.position.set(x, y, z); return o; };
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
  // soft contact shadow (ambient occlusion) under a piece, so it sits on the surface instead of floating
  function contact(r, k = .55) {
    const TT = T(), tex = canvasTex('aoDisc', 128, 128, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.75)'); g.addColorStop(.78, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); });
    tex.encoding = TT.LinearEncoding;
    const m = new TT.Mesh(new TT.PlaneGeometry(r * 2.5, r * 2.5), new TT.MeshBasicMaterial({ map: tex, transparent: true, opacity: k, depthWrite: false, color: 0x000000 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.userData.contact = true; return m;
  }
  const cellPos = (n, size, i) => -size / 2 + size / n * (i + .5);

  /* ---------- board builders ---------- */
  const WHITE = () => M({ color: 0xf3f0e6, roughness: .32, clearcoat: .6, clearcoatRoughness: .25 }), BLACK = () => M({ color: 0x16171b, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 });
  const MODELS = {
    reversi(live) {
      const g = new (T().Group)(), S = 8.4, TT = T();
      // bezel: a square ring with rounded, bevelled edges, a little higher than the field
      const O = S / 2 + .55, I = S / 2 + .02, rr = .42, sh = new TT.Shape();
      sh.moveTo(-O + rr, -O); sh.lineTo(O - rr, -O); sh.quadraticCurveTo(O, -O, O, -O + rr); sh.lineTo(O, O - rr); sh.quadraticCurveTo(O, O, O - rr, O); sh.lineTo(-O + rr, O); sh.quadraticCurveTo(-O, O, -O, O - rr); sh.lineTo(-O, -O + rr); sh.quadraticCurveTo(-O, -O, -O + rr, -O);
      const hole = new TT.Path(); hole.moveTo(-I, -I); hole.lineTo(-I, I); hole.lineTo(I, I); hole.lineTo(I, -I); hole.closePath(); sh.holes.push(hole);
      const bz = new TT.ExtrudeGeometry(sh, { depth: .4, bevelEnabled: true, bevelThickness: .1, bevelSize: .1, bevelSegments: 6, curveSegments: 10 });
      bz.rotateX(-Math.PI / 2); bz.translate(0, .1, 0);
      // planar UVs from the top view: the grain runs continuously round the frame (no stretched stripes)
      const P = bz.attributes.position, UV = bz.attributes.uv;
      for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + O) / (2 * O) + P.getY(i) * .05, (P.getZ(i) + O) / (2 * O));
      const wal = wood('rvf3', '#6a3a1e', '#2a1309', 1024, 1024, 1.1);
      const frame = M({ map: wal, color: 0xffffff, roughness: .3, clearcoat: .9, clearcoatRoughness: .18, bumpScale: .004 });
      g.add(mesh(bz, frame));
      const base = M({ map: wal, roughness: .4, bumpScale: .003 });
      g.add(at3(slab(O * 2 - .1, .2, O * 2 - .1, base, base), 0, 0, 0));
      const top = M({ map: grid('rv5', '#0b7d33', '#061509', 8, 8, { lw: 6, felt: true, stars: [[2, 2], [6, 2], [2, 6], [6, 6]] }), roughness: 1, bumpScale: .006, sheen: new TT.Color(0x153a22) });
      const field = mesh(new TT.PlaneGeometry(S, S), top); field.rotation.x = -Math.PI / 2; field.position.y = .42; field.receiveShadow = true; field.castShadow = false; g.add(field);
      g.userData.S = S; g.userData.top = .43;
      if (live) return g;
      const pos = { 27: 0, 28: 1, 35: 1, 36: 0, 19: 1, 26: 1, 37: 0, 44: 1, 20: 0, 29: 1 };
      const W = WHITE(), B = BLACK();
      for (const k in pos) {
        const i = +k, x = cellPos(8, S, i % 8), z = cellPos(8, S, i / 8 | 0);
        const d = new (T().Group)();
        const a = bevelDisc(.44, .1, pos[k] ? B : W), b = bevelDisc(.44, .1, pos[k] ? W : B);
        b.position.y = .1; d.add(a, b); d.position.set(x, .425, z); g.add(d);   // resting on the felt
        const sh = contact(.44); sh.position.set(x, .424, z); g.add(sh);
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
    go() {   // 19-line kaya goban (thick, like a legged board) with an opening position
      const g = new (T().Group)(), S = 9.4, P = 34;
      const top = M({ map: grid('go', '#dfaa58', '#2a1a0a', 19, 19, { points: true, pad: P, lw: 2, woodBase: '#c68c42', stars: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]] }) });
      g.add(slab(S, 1.6, S, top, M({ map: wood('gos', '#d39c52', '#9a6426') })));
      const W = M({ color: 0xf7f5ef, roughness: .25 }), B = M({ color: 0x1a1b20, roughness: .2 }), step = (S - 2 * S * P / 1024) / 18;
      [[15, 3, 1], [3, 15, 0], [15, 16, 1], [3, 3, 0], [16, 13, 1], [2, 5, 0], [13, 2, 1], [5, 16, 0], [9, 15, 1], [16, 6, 0], [15, 7, 1], [2, 9, 0]].forEach(([x, y, b]) => {
        const s = stone(.24, b ? B : W); s.position.set(-S / 2 + S * P / 1024 + x * step, 1.7, -S / 2 + S * P / 1024 + y * step); g.add(s);
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
    checkers() {   // English draughts: white / black squares, red and white men, one crowned king
      const g = new (T().Group)(), S = 8.4;
      const top = M({ map: canvasTex('ck2', 512, 512, (c, W) => { const s = W / 8; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { c.fillStyle = (x + y) % 2 ? '#1d1d20' : '#f4f1ea'; c.fillRect(x * s, y * s, s, s); } }), roughness: .4 });
      g.add(slab(9.6, .5, 9.6, M({ map: wood('ckb', '#5a3a22', '#2e1d10') }), M({ map: wood('ckb', '#5a3a22', '#2e1d10') })));
      const inner = slab(S, .06, S, top); inner.position.y = .5; g.add(inner);
      const W = M({ color: 0xf6f2ea, roughness: .3, clearcoat: .4 }), B = M({ color: 0xc8202a, roughness: .3, clearcoat: .4 });
      const put = (x, y, m, king) => { for (let h = 0; h < (king ? 2 : 1); h++) { const d = bevelDisc(.36, .2, m); d.position.set(cellPos(8, S, x), .58 + h * .22, cellPos(8, S, y)); g.add(d); } };
      [[1, 0], [3, 0], [7, 0], [0, 1], [2, 1], [6, 1], [1, 2], [5, 2], [4, 3]].forEach(([x, y]) => put(x, y, B));
      [[3, 4], [0, 5], [6, 5], [1, 6], [5, 6], [7, 6], [0, 7], [2, 7], [6, 7]].forEach(([x, y]) => put(x, y, W));
      put(5, 4, W, true);
      return g;
    },
    // Hex: an n × n rhombus of hexagons inlaid in a walnut slab, red edges (top and bottom rows, far and near) and blue sides,
    // glazed red / blue stones. live: no showcase position; o.n = 3 … 13 (default 11), every size the same outer width.
    // userData: { n, cell, top, W, D, pt(i) → [x, z] (cell i = r * n + c, row 0 on the far side), stone(col) → Mesh }
    hex(live, o = {}) {
      const TT = T(), g = new TT.Group(), n = o.n || 11, S3 = Math.sqrt(3), HR = 1 / S3;
      const cell = (o.W || 10.4) / (1.5 * (n - 1) + 1 + 2.1), cx = .75 * (n - 1), cz = (n - 1) * S3 / 4;
      const P = (r, c) => [(c + r / 2 - cx) * cell, (r * S3 / 2 - cz) * cell];
      // outline: the parallelogram of the corner cells' centres pushed out by d (clockwise as seen from above)
      const outline = d => {
        const C = [P(0, 0), P(0, n - 1), P(n - 1, n - 1), P(n - 1, 0)];
        return C.map((p, k) => { const a = C[(k + 3) % 4], b = C[(k + 1) % 4], nrm = (u, v) => { const dx = v[0] - u[0], dz = v[1] - u[1], L = Math.hypot(dx, dz); return [dz / L, -dx / L]; }, n1 = nrm(a, p), n2 = nrm(p, b), q = d / (1 + n1[0] * n2[0] + n1[1] * n2[1]); return [p[0] + (n1[0] + n2[0]) * q, p[1] + (n1[1] + n2[1]) * q]; });
      };
      const shapeOf = L => { const s = new TT.Shape(); L.forEach(([x, z], k) => (k ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath(); return s; };
      const rim = outline(cell * 1.08), inner = outline(cell * .96), H = .5;
      const xs = rim.map(p => p[0]), zs = rim.map(p => p[1]), minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs), W = maxX - minX, D = maxZ - minZ;
      // walnut slab with a rounded bevel
      const slabG = new TT.ExtrudeGeometry(shapeOf(rim), { depth: H, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 5, curveSegments: 4 });
      slabG.rotateX(-Math.PI / 2); slabG.translate(0, .08, 0);
      { const Pp = slabG.attributes.position, UV = slabG.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (Pp.getX(i) - minX) / W + Pp.getY(i) * .07, (Pp.getZ(i) - minZ) / D); }
      const wal = wood('hxw', '#6a3f22', '#2a160a', 1024, 1024, 1.2);
      g.add(mesh(slabG, M({ map: wal, color: 0xffffff, roughness: .32, clearcoat: .8, clearcoatRoughness: .2, bumpScale: .004 })));
      // the inlay: cells, coloured edges, a fine brass line round the field (drawn on one canvas, mapped by position)
      const CW = 2048, CH = Math.round(CW * D / W), px = x => (x - minX) / W * CW, pz = z => (z - minZ) / D * CH, R = cell * HR;
      const top = canvasTex('hxTop' + n, CW, CH, (c2) => {
        c2.drawImage(wood('hxw2', '#7a4a28', '#331b0c', 1024, 1024, 1.3).image, 0, 0, CW, CH);
        const poly = (L, fill, stroke, lw) => { c2.beginPath(); L.forEach(([x, z], k) => (k ? c2.lineTo(px(x), pz(z)) : c2.moveTo(px(x), pz(z)))); c2.closePath(); if (fill) { c2.fillStyle = fill; c2.fill(); } if (stroke) { c2.strokeStyle = stroke; c2.lineWidth = lw; c2.stroke(); } };
        poly(inner, null, 'rgba(226,194,117,.65)', 5);
        const hexL = (x, z, k) => { const L = []; for (let j = 0; j < 6; j++) { const a = Math.PI / 180 * (60 * j - 90); L.push([x + Math.cos(a) * R * k, z + Math.sin(a) * R * k]); } return L; };
        // coloured edges: the outer sides of the border cells, pushed out a little
        const DIRS = [[-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1]], SIDE = [[5, 0], [0, 1], [1, 2], [2, 3], [3, 4], [4, 5]];
        c2.lineCap = 'round'; c2.lineWidth = Math.max(10, R / W * CW * .42);
        for (let i = 0; i < n * n; i++) {
          const r = Math.floor(i / n), c = i % n, [x, z] = P(r, c), L = hexL(x, z, 1);
          DIRS.forEach(([dr, dc], d) => { const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < n && cc >= 0 && cc < n) return; const red = rr < 0 || rr >= n, [a, b] = SIDE[d], mx = (L[a][0] + L[b][0]) / 2 - x, mz = (L[a][1] + L[b][1]) / 2 - z, Lm = Math.hypot(mx, mz), ox = mx / Lm * R * .3, oz = mz / Lm * R * .3;
            c2.strokeStyle = red ? '#d8342a' : '#2a6fd6'; c2.beginPath(); c2.moveTo(px(L[a][0] + ox), pz(L[a][1] + oz)); c2.lineTo(px(L[b][0] + ox), pz(L[b][1] + oz)); c2.stroke(); });
        }
        for (let i = 0; i < n * n; i++) {
          const r = Math.floor(i / n), c = i % n, [x, z] = P(r, c), gr = c2.createRadialGradient(px(x - R * .3), pz(z - R * .35), 2, px(x), pz(z), R / W * CW * 1.1);
          const alt = (r + 2 * c) % 3 === 0; gr.addColorStop(0, alt ? '#f3dcae' : '#f7e6c0'); gr.addColorStop(1, alt ? '#d2b37a' : '#dcc08a');
          poly(hexL(x, z, .955), gr, 'rgba(60,34,12,.75)', 3);
        }
      });
      top.anisotropy = 8;
      const topG = new TT.ShapeGeometry(shapeOf(rim)); topG.rotateX(-Math.PI / 2);
      { const Pp = topG.attributes.position, UV = topG.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (Pp.getX(i) - minX) / W, 1 - (Pp.getZ(i) - minZ) / D); }
      const Y = H + .161, face = mesh(topG, M({ map: top, roughness: .38, clearcoat: .5, clearcoatRoughness: .3, bumpScale: .003 }), 0, Y, 0); face.castShadow = false; g.add(face);
      const RED = M({ color: 0xd2301f, roughness: .22, clearcoat: .9, clearcoatRoughness: .12 }), BLUE = M({ color: 0x2463c9, roughness: .22, clearcoat: .9, clearcoatRoughness: .12 });
      const stoneOf = col => bevelDisc(cell * .4, cell * .26, col === 1 ? RED : BLUE);
      const pt = i => P(Math.floor(i / n), i % n);
      Object.assign(g.userData, { n, cell, top: Y + .002, W, D, pt, stone: stoneOf, S: W });
      if (live) return g;
      // a mid-game position: a red chain of bridges from the far edge, blue blocking from the sides
      const put = (r, c, col) => { const [x, z] = P(r, c), s = stoneOf(col); s.position.set(x, Y + .002, z); g.add(s); const sh = contact(cell * .42); sh.position.set(x, Y + .003, z); g.add(sh); };
      [[1, 6, 1], [3, 5, 1], [4, 4, 1], [5, 4, 1], [6, 3, 1], [8, 2, 1], [3, 6, 2], [4, 6, 2], [5, 5, 2], [6, 5, 2], [2, 8, 2], [7, 4, 2], [8, 3, 2]].forEach(([r, c, col]) => { if (r < n && c < n) put(r, c, col); });
      return g;
    },
    sudoku() {
      const g = new (T().Group)();
      const top = M({ map: grid('sd', '#fffdf6', '#2b3044', 9, 9, { lw: 3, after: (c, W) => { c.lineWidth = 9; for (let i = 0; i <= 3; i++) { c.beginPath(); c.moveTo(i * W / 3, 0); c.lineTo(i * W / 3, W); c.moveTo(0, i * W / 3); c.lineTo(W, i * W / 3); c.stroke(); } c.fillStyle = '#2b3044'; c.font = '700 70px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const d = '530070000600195000098000060800060003400803001700020006060000280000419005000080079'; for (let i = 0; i < 81; i++) if (d[i] !== '0') c.fillText(d[i], (i % 9 + .5) * W / 9, ((i / 9 | 0) + .55) * W / 9); } }), roughness: .9 });
      const p = slab(8, .08, 8, top, M({ color: 0xf0ead8 })); p.rotation.y = .12; g.add(p);
      const pen = mesh(new (T().CylinderGeometry)(.12, .12, 5, 12), M({ color: 0xff8fc7 })); pen.rotation.z = Math.PI / 2; pen.rotation.y = .6; pen.position.set(3.6, .25, 3.4); g.add(pen);
      return g;
    },
    speedsudoku() {   // a chunky 4×4 tray of number tiles, a stopwatch and a lightning bolt
      const TT = T(), g = new TT.Group(), N = 4, cs = 1.7, S = N * cs;
      const tray = mesh(RB(S + 1, .7, S + 1, .3, 3), M({ color: 0xfffaf2, roughness: .35, clearcoat: .4 }), 0, .35, 0); g.add(tray);
      const well = mesh(RB(S + .2, .2, S + .2, .12, 2), M({ color: 0xffe2cc, roughness: .6 }), 0, .72, 0); g.add(well);
      const grid = [1, 0, 3, 0, 0, 3, 0, 2, 3, 0, 2, 0, 0, 2, 0, 3], hot = { 2: '#ff7a3d', 9: '#ffcd3c' };
      const face = (n, bg) => canvasTex('ssd' + n + bg, 128, 128, (c, W) => { c.fillStyle = bg; c.fillRect(0, 0, W, W); if (n) { c.fillStyle = bg === '#ffffff' ? '#2b3044' : '#fff'; c.font = '700 84px Fredoka, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, W / 2, W / 2 + 6); } });
      for (let i = 0; i < N * N; i++) {
        const x = (i % N - (N - 1) / 2) * cs, z = ((i / N | 0) - (N - 1) / 2) * cs, n = grid[i], bg = hot[i] || (n ? '#ffffff' : '#f3ead8');
        const h = n ? .55 : .3, side = M({ color: parseInt(bg.slice(1), 16), roughness: .4, clearcoat: .3 });
        const t = mesh(RB(cs - .2, h, cs - .2, .16, 2), [side, side, M({ map: face(n || '', bg), roughness: .4, clearcoat: .3 }), side, side, side], x, .82 + h / 2, z); g.add(t);
      }
      // stopwatch
      const sw = new TT.Group(); sw.position.set(S / 2 + 1.6, 0, -S / 2 + .9); g.add(sw);
      const body = mesh(new TT.CylinderGeometry(1.15, 1.15, .5, 40), M({ color: 0xff7a3d, roughness: .35, clearcoat: .5 }), 0, .25, 0); sw.add(body);
      const dial = mesh(new TT.CylinderGeometry(.95, .95, .06, 40), M({ map: canvasTex('ssdDial', 256, 256, (c, W) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.fill(); c.strokeStyle = '#2b3044'; c.lineWidth = 8; for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * 100, W / 2 + Math.sin(a) * 100); c.lineTo(W / 2 + Math.cos(a) * 116, W / 2 + Math.sin(a) * 116); c.stroke(); } c.strokeStyle = '#ff5d5d'; c.lineWidth = 10; c.beginPath(); c.moveTo(W / 2, W / 2); c.lineTo(W / 2 + 70, W / 2 - 60); c.stroke(); }), roughness: .4 }), 0, .53, 0); sw.add(dial);
      const knob = mesh(new TT.CylinderGeometry(.18, .18, .45, 16), M({ color: 0xc7ccd6, metalness: .6, roughness: .3 }), 0, .25, -1.3); knob.rotation.x = Math.PI / 2; sw.add(knob);
      // lightning bolt
      const sh = new TT.Shape(); [[.35, 1.25], [-.5, -.05], [-.02, -.05], [-.3, -1.25], [.55, .18], [.07, .18]].forEach(([x, y], k) => (k ? sh.lineTo(x, y) : sh.moveTo(x, y))); sh.closePath();
      const bolt = mesh(new TT.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: true, bevelThickness: .08, bevelSize: .07, bevelSegments: 3 }), M({ color: 0xffcd3c, roughness: .3, clearcoat: .6 }));
      bolt.scale.setScalar(1.3); bolt.position.set(-S / 2 - 1.3, 1.6, S / 2 - .6); bolt.rotation.set(0, .5, -.15); g.add(bolt);
      return g;
    },
    samegame() {   // a cream tray of chunky mid-century blocks (each colour with its own pattern), a few popping up
      const TT = T(), g = new TT.Group(), NX = 7, NZ = 6, cs = 1.12, SX = NX * cs, SZ = NZ * cs;
      const tray = mesh(RB(SX + 1, .6, SZ + 1, .3, 3), M({ color: 0xf2eadb, roughness: .4, clearcoat: .3 }), 0, .3, 0); g.add(tray);
      const well = mesh(RB(SX + .2, .2, SZ + .2, .12, 2), M({ color: 0x5e4b6b, roughness: .7 }), 0, .62, 0); g.add(well);
      const COL = ['#e8b83a', '#2e6f8e', '#d9622b', '#7a8b3a', '#d98c7a'];
      const pat = k => canvasTex('sgp' + k, 128, 128, (c, W) => {
        c.fillStyle = COL[k]; c.fillRect(0, 0, W, W); c.fillStyle = c.strokeStyle = 'rgba(242,234,219,.85)'; c.lineWidth = 10;
        if (k === 0) { c.beginPath(); c.arc(W / 2, W / 2, 26, 0, 7); c.fill(); }                                              // mustard: dot
        else if (k === 1) { for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(24, 34 + i * 30); c.lineTo(104, 34 + i * 30); c.stroke(); } }   // teal: stripes
        else if (k === 2) { c.beginPath(); c.moveTo(W / 2, 28); c.lineTo(100, 96); c.lineTo(28, 96); c.closePath(); c.fill(); }   // orange: triangle
        else if (k === 3) { c.beginPath(); c.moveTo(W / 2, 26); c.lineTo(102, W / 2); c.lineTo(W / 2, 102); c.lineTo(26, W / 2); c.closePath(); c.fill(); }   // olive: diamond
        else { c.beginPath(); c.arc(W / 2, W / 2, 34, 0, 7); c.stroke(); c.beginPath(); c.arc(W / 2, W / 2, 12, 0, 7); c.fill(); }   // salmon: ring
      });
      const mats = COL.map((hex, k) => { const sd = M({ color: parseInt(hex.slice(1), 16), roughness: .45, clearcoat: .35 }); return [sd, sd, M({ map: pat(k), roughness: .45, clearcoat: .35 }), sd, sd, sd]; });
      const B = '1102340' + '1132344' + '0222314' + '3324011' + '4310021' + '4413002', H = .62;   // rows back → front (colour index)
      const pos = (x, z) => [(x - (NX - 1) / 2) * cs, ((z) - (NZ - 1) / 2) * cs];
      const empty = new Set([[2, 0], [3, 0], [3, 1]].map(([x, z]) => z * NX + x));
      for (let i = 0; i < NX * NZ; i++) {
        if (empty.has(i)) continue;
        const [x, z] = pos(i % NX, i / NX | 0);
        g.add(mesh(RB(cs - .14, H, cs - .14, .14, 2), mats[+B[i]], x, .72 + H / 2, z));
      }
      // the popped group flies up, tumbling
      [[2, 0, 1.9, .5], [3, 0, 2.8, -.6], [3, 1, 2.2, .9]].forEach(([cx, cz, y, r], k) => {
        const [x, z] = pos(cx, cz), b = mesh(RB(cs - .14, H, cs - .14, .14, 2), mats[2], x + (k - 1) * .35, y, z - .3);
        b.scale.setScalar(.85 - k * .08); b.rotation.set(r, r * .7, -r * .5); g.add(b);
      });
      // POP! sparkle: a few cream confetti dots around the flying blocks
      [[-.6, 3.4, -2.6], [.9, 3.6, -3.0], [1.3, 2.6, -1.6], [-.9, 2.5, -1.5]].forEach(([x, y, z]) => g.add(mesh(new TT.SphereGeometry(.13, 12, 8), M({ color: 0xe8b83a, roughness: .4 }), x, y, z)));
      return g;
    },
    // Hnefatafl: an oak board with a carved grid, knotwork corners and throne, a rune-carved frame;
    // dark walnut attackers, bone defenders, a crowned king. o.n = 11 | 9 | 7 (same outer size, larger cells).
    // live → userData { top, S, n, cs, cell(f, r) → [x, z] (f: column left→right, r: row top→bottom), piece(k: 1 att | 2 def | 3 king) → Group }
    tafl(live, o = {}) {
      const TT = T(), g = new TT.Group(), n = o.n || 11, S = 8.6, cs = S / n, mid = n >> 1;
      const knot = (c, x, y, r, col) => {   // a carved sun-cross knot
        c.strokeStyle = col; c.lineWidth = r * .16; c.lineCap = 'round';
        c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.beginPath(); c.arc(x, y, r * .42, 0, 7); c.stroke();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .42, y + Math.sin(a) * r * .42); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
      };
      const top = M({ map: canvasTex('tf' + n, 1024, 1024, (c, W) => {
        c.drawImage(wood('tfw', '#c39762', '#7a5230', 512, 512, 1.3).image, 0, 0, W, W);
        const s = W / n, home = new Set();
        if (n === 11) [[0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5]].forEach(([a, b]) => [[a, b], [b, a], [n - 1 - a, b], [b, n - 1 - a]].forEach(([x, y]) => home.add(y * n + x)));
        else for (let k = 0; k < n; k++) if ((k >= mid - (n === 9 ? 1 : 0) && k <= mid + (n === 9 ? 1 : 0)) || k === mid) [[k, 0], [0, k], [k, n - 1], [n - 1, k]].forEach(([x, y]) => home.add(y * n + x));
        home.forEach(i => { c.fillStyle = 'rgba(70,38,16,.16)'; c.fillRect((i % n) * s, (i / n | 0) * s, s, s); });
        [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1], [mid, mid]].forEach(([x, y]) => {
          c.fillStyle = 'rgba(60,30,10,.5)'; c.fillRect(x * s + 4, y * s + 4, s - 8, s - 8);
          knot(c, x * s + s / 2, y * s + s / 2, s * .3, 'rgba(236,206,150,.85)');
        });
        c.strokeStyle = 'rgba(42,22,8,.9)'; c.lineWidth = n > 9 ? 4 : 5;
        for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, W); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(W, i * s); c.stroke(); }
      }), roughness: .52, bumpScale: .01 });
      const FW = S + 1.1, runes = 'ᚺᚾᛖᚠᛏᚨᚠᛚ ᚲᛁᚾᚷ ';
      const frameTop = M({ map: canvasTex('tfr', 1024, 1024, (c, W) => {
        c.drawImage(wood('tfrw', '#5a3a22', '#2a180c', 512, 512, 1.1).image, 0, 0, W, W);
        const b = W * .55 / FW / 2, m = W * .5 / FW / 2;   // the band's half-width and centre offset from the edge
        c.fillStyle = 'rgba(232,196,128,.78)'; c.font = `700 ${Math.round(b * .95)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let side = 0; side < 4; side++) {
          c.save(); c.translate(W / 2, W / 2); c.rotate(side * Math.PI / 2); c.translate(-W / 2, -W / 2);
          const k = 22; for (let i = 0; i < k; i++) c.fillText(runes[i % runes.length], W * (i + 1.5) / (k + 2), m + 2);
          c.restore();
        }
        c.strokeStyle = 'rgba(232,196,128,.45)'; c.lineWidth = 3; c.strokeRect(4, 4, W - 8, W - 8); c.strokeRect(2 * m - 4, 2 * m - 4, W - 4 * m + 8, W - 4 * m + 8);
      }), roughness: .45, bumpScale: .008 });
      const frameSide = M({ map: wood('tfrs', '#5a3a22', '#2a180c'), roughness: .5 });
      g.add(slab(FW, .5, FW, frameTop, frameSide));
      const inner = slab(S, .06, S, top, frameSide); inner.position.y = .5; g.add(inner);
      const Y = .56, cell = (f, r) => [cellPos(n, S, f), cellPos(n, S, r)];
      const MAT = {
        1: M({ map: wood('tfa', '#4a2c1c', '#1c0f08', 256, 256, 1.6), roughness: .32, clearcoat: .55, clearcoatRoughness: .3 }),
        2: M({ map: wood('tfd', '#f4ead4', '#cdb689', 256, 256, 1.2), roughness: .34, clearcoat: .5, clearcoatRoughness: .3 }),
        gold: M({ color: 0xf0c050, metalness: .7, roughness: .28 }),
      };
      const r0 = Math.min(.42, cs * .4);
      const prof = (h, k) => { const pts = [[0, 0], [k, 0], [k * 1.02, h * .08], [k * .9, h * .2], [k * .62, h * .42], [k * .5, h * .62], [k * .6, h * .74], [k * .48, h * .86], [k * .26, h * .97], [0, h]];
        return new TT.LatheGeometry(pts.map(([a, b]) => new TT.Vector2(Math.max(.001, a), b)), 32); };
      const GEO = { 1: prof(r0 * 2.0, r0), 2: prof(r0 * 2.0, r0), 3: prof(r0 * 2.9, r0 * 1.1) };
      function piece(k) {
        const p = new TT.Group(); p.userData.kind = k;
        p.add(mesh(GEO[k], MAT[k === 1 ? 1 : 2]));
        if (k === 3) {
          const h = r0 * 2.9, band = mesh(new TT.CylinderGeometry(r0 * .44, r0 * .5, r0 * .3, 24, 1, true), MAT.gold); band.position.y = h * .86; band.material.side = TT.DoubleSide; p.add(band);
          for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, c = mesh(new TT.ConeGeometry(r0 * .1, r0 * .32, 10), MAT.gold); c.position.set(Math.cos(a) * r0 * .44, h * .86 + r0 * .26, Math.sin(a) * r0 * .44); p.add(c); }
        }
        return p;
      }
      g.userData = { top: Y, S, n, cs, cell, piece, mats: MAT };
      if (live) return g;
      const start = '...aaaaa........a................a....d....aa...ddd...aaa.ddkdd.aaa...ddd...aa....d....a................a........aaaaa...';
      const moved = { 16: 13, 40: 46 };   // a couple of opening moves for a lived-in look (cells r*11+c)
      [...start].forEach((ch, i) => {
        if (ch === '.') return; const j = moved[i] ?? i, p = piece(ch === 'a' ? 1 : ch === 'd' ? 2 : 3), [x, z] = cell(j % n, j / n | 0);
        p.position.set(x, Y, z); g.add(p); const sh = contact(r0 * .9); sh.position.set(x, Y + .002, z); g.add(sh);
      });
      return g;
    },
  };

  /* ---------- scene ---------- */
  let roomMode = '', alignFn = null, alignSize = 0, alignTop = 0, zoom = 1, zoomTo = 1, envOK = false, vel = 0, tilt = 0, dragEnd = 0, idleT = 0;
  let R, scene, cam, root, cur = null, el = null, drag = null, yaw = 0, spin = true, mode = 'view', camK = 0, camTo = 0;

  /* ---------- the toy room: a chabudai (low round table) on tatami, walls, a window, toy shelves ----------
     Lighting follows the local time like the Sudoku backgrounds: morning / day / evening / night. */
  function timeOfDay(h) { return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'evening' : 'night'; }
  const LOOK = {
    morning: { sky: ['#cfe9ff', '#fff2d6'], sun: 0xfff4e2, sunI: 1.05, sunPos: [-14, 12, -10], hemi: [0xe8f2ff, 0x6a5038, .45], lamp: 0, exp: .84 },
    day:     { sky: ['#8fd0ff', '#e6f6ff'], sun: 0xffffff, sunI: 1.25, sunPos: [-8, 18, -6], hemi: [0xf4f8ff, 0x6a5038, .55], lamp: 0, exp: .86 },
    evening: { sky: ['#ff7a3c', '#ffc27a'], sun: 0xff8a3c, sunI: 1.35, sunPos: [-18, 5, -10], hemi: [0xffb070, 0x4a2010, .42], lamp: .6, exp: .82 },
    night:   { sky: ['#0b1230', '#24335e'], sun: 0xffe2b8, sunI: .55, sunPos: [-6, 18, 4], hemi: [0xffe6c8, 0x3a2614, .42], lamp: 2.4, exp: .9 },   // ceiling light on
  };

  // rounded box: a subdivided box whose edges are bent onto quarter-circles (exact normals, box UVs kept, so wood maps stay straight)
  const rbCache = {};
  function RB(w, h, d, r, m = 3) {
    if (r == null) r = Math.min(.25, Math.min(w, h, d) * .2);
    r = Math.max(.001, Math.min(r, Math.min(w, h, d) / 2 - .0005));
    const key = [w, h, d, r, m].map(v => +(+v).toFixed(3)).join(',');
    if (rbCache[key]) return rbCache[key];
    const TT = T(), n = 2 * m + 1, g = new TT.BoxGeometry(1, 1, 1, n, n, n), P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
    const H = [w / 2, h / 2, d / 2], I = H.map(x => x - r);
    const remap = (u, k) => {   // u in [-.5,.5] on the unit grid → corner bands get m steps each, the middle one step
      const i = Math.round((u + .5) * n);
      if (i <= m) return -H[k] + r * (i / m);
      if (i >= n - m) return I[k] + r * ((i - (n - m)) / m);
      return -I[k] + (2 * I[k]) * ((i - m) / (n - 2 * m));
    };
    const v = [0, 0, 0], q = [0, 0, 0];
    for (let i = 0; i < P.count; i++) {
      v[0] = remap(P.getX(i), 0); v[1] = remap(P.getY(i), 1); v[2] = remap(P.getZ(i), 2);
      for (let k = 0; k < 3; k++) q[k] = Math.max(-I[k], Math.min(I[k], v[k]));
      let dx = v[0] - q[0], dy = v[1] - q[1], dz = v[2] - q[2], L = Math.hypot(dx, dy, dz);
      if (L < 1e-6) { dx = N.getX(i); dy = N.getY(i); dz = N.getZ(i); L = 1; }
      dx /= L; dy /= L; dz /= L;
      // UVs follow the real position on the face (so a wood map isn't squeezed into the rounded edges)
      const fx = N.getX(i), fy = N.getY(i), fz = N.getZ(i), px = q[0] + dx * r, py = q[1] + dy * r, pz = q[2] + dz * r;
      const pl = Math.abs(fx) > .5 ? (fx > 0 ? ['z', 'y', -1, -1] : ['z', 'y', 1, -1]) : Math.abs(fy) > .5 ? (fy > 0 ? ['x', 'z', 1, 1] : ['x', 'z', 1, -1]) : (fz > 0 ? ['x', 'y', 1, -1] : ['x', 'y', -1, -1]);
      const C = { x: px / w, y: py / h, z: pz / d };
      UV.setXY(i, .5 + pl[2] * C[pl[0]], .5 - pl[3] * C[pl[1]]);
      P.setXYZ(i, px, py, pz); N.setXYZ(i, dx, dy, dz);
    }
    UV.needsUpdate = true;
    P.needsUpdate = N.needsUpdate = true; g.computeBoundingSphere();
    return (rbCache[key] = g);
  }
  /* ---------- toy-room props: toy chest, brick castle, retro TV game, and the Atlas Mon living in the room ---------- */
  const roomTicks = [];
  // merge the static room meshes that share a material into one mesh each: the toy room has ~350 small meshes
  // (bricks, toys, characters…) → a few dozen draw calls (and as many shadow draws). Animated parts are kept as they are.
  const SIGX = mt => mt.type + (mt.color ? mt.color.getHexString() : '') + '|' + (mt.map ? mt.map.uuid : '') + (mt.bumpMap ? mt.bumpMap.uuid + mt.bumpScale : '') + '|' + [mt.roughness, mt.metalness, mt.clearcoat, mt.clearcoatRoughness, mt.opacity, mt.transparent, mt.side, mt.toneMapped, mt.depthWrite, mt.emissive && mt.emissive.getHexString(), mt.roughnessMap && mt.roughnessMap.uuid, mt.normalMap && mt.normalMap.uuid, mt.alphaMap && mt.alphaMap.uuid].join(',');
  function mergeStatic(g) {
    const TT = T(); g.updateMatrixWorld(true);
    const inv = new TT.Matrix4().copy(g.matrixWorld).invert(), buckets = new Map(), drop = [];
    const animated = o => { for (let x = o; x && x !== g; x = x.parent) if (x.userData.keep) return true; return false; };
    const sigOf = mt => { const u = mt.userData.u; return SIGX(mt) + (u ? '|u' + Object.values(u).map(v => v.value && v.value.isColor ? v.value.getHexString() : v.value).join(',') : '') + (mt.sheen && mt.sheen.isColor ? '|sh' + mt.sheen.getHexString() : ''); };
    const add = (o, mt, grp, multi) => {
      const k = (mt.userData.noMerge ? mt.uuid : sigOf(mt)) + '|' + (o.castShadow ? 1 : 0) + (o.receiveShadow ? 1 : 0) + '|' + o.renderOrder + (mt.stencilWrite ? '|s' + mt.stencilRef + mt.stencilFunc : '');
      if (!buckets.has(k)) buckets.set(k, { mat: mt, cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder, list: [], multi: false });
      const b = buckets.get(k); b.list.push({ o, grp }); if (multi) b.multi = true;
    };
    const multis = [];
    g.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.visible || animated(o)) return;
      const gm = o.geometry; if (!gm || !gm.attributes.position || gm.morphAttributes && Object.keys(gm.morphAttributes).length) return;
      if (Array.isArray(o.material)) {   // a box with a different face material: each face group joins its material's bucket
        if (!gm.groups.length || o.material.some(m => !m)) return;
        gm.groups.forEach(gr => add(o, o.material[gr.materialIndex], gr, true)); multis.push(o); return;
      }
      add(o, o.material, null, false);
    });
    const nonIdx = new Map();   // one de-indexed, transformed copy per multi-material mesh (its groups are sliced from it)
    const geoFor = it => {
      const o = it.o;
      if (!it.grp) { const gm = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gm.applyMatrix4(new TT.Matrix4().multiplyMatrices(inv, o.matrixWorld)); return { gm, start: 0, count: gm.attributes.position.count, own: true }; }
      let gm = nonIdx.get(o); if (!gm) { gm = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); gm.applyMatrix4(new TT.Matrix4().multiplyMatrices(inv, o.matrixWorld)); nonIdx.set(o, gm); }
      return { gm, start: it.grp.start, count: Math.min(it.grp.count, gm.attributes.position.count - it.grp.start), own: false };
    };
    buckets.forEach(b => {
      if (b.list.length < 2 && !b.multi) return;
      const parts = b.list.map(geoFor);
      const n = parts.reduce((a, p) => a + p.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2);
      let off = 0;
      parts.forEach(({ gm, start, count, own }) => {
        const A = gm.attributes; P.set(A.position.array.subarray(start * 3, (start + count) * 3), off * 3);
        if (A.normal) N.set(A.normal.array.subarray(start * 3, (start + count) * 3), off * 3);
        if (A.uv) U.set(A.uv.array.subarray(start * 2, (start + count) * 2), off * 2);
        off += count; if (own) gm.dispose();
      });
      const mg = new TT.BufferGeometry(); mg.setAttribute('position', new TT.BufferAttribute(P, 3)); mg.setAttribute('normal', new TT.BufferAttribute(N, 3)); mg.setAttribute('uv', new TT.BufferAttribute(U, 2));
      mg.computeBoundingSphere();
      const m = new TT.Mesh(mg, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.ro; m.matrixAutoUpdate = false; g.add(m);
      b.list.forEach(it => { if (!it.grp) drop.push(it.o); });
    });
    nonIdx.forEach(gm => gm.dispose()); multis.forEach(o => drop.push(o));
    drop.forEach(o => { o.visible = false; o.userData.merged = true; });   // hidden, not removed: groups and their children stay intact
  }
  function decorate(g, FLOOR, mode) {
    const TT = T(), F = FLOOR;
    roomTicks.length = 0;
    const box = (w, h, d, mat, x, y, z, ry = 0, par = g) => { const m = new TT.Mesh(RB(w, h, d), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; par.add(m); return m; };
    const rbox = (w, h, d, r, mat) => { const m = new TT.Mesh(RB(w, h, d, r, 4), mat); m.castShadow = m.receiveShadow = true; return m; };
    const plastic = c => M({ color: c, roughness: .32, clearcoat: .5, clearcoatRoughness: .25 });

    // --- brick castle (toy building bricks): bricks with studs, built layer by layer ---
    const U = .8, BH = .96 * U * 1.2;
    const castle = new TT.Group(); castle.position.set(13.2, F, -13.6); castle.rotation.y = -.55; castle.scale.setScalar(.72); g.add(castle);
    const studG = new TT.CylinderGeometry(.24, .245, .2, 24), studs = {};
    const brick = (cx, cz, layer, w, d, col, h = 1) => {   // cx,cz in studs; w,d in studs
      const mat = studs[col] || (studs[col] = { mat: plastic(col), pos: [] });
      const m = new TT.Mesh(RB(w * U - .03, BH * h - .02, d * U - .03, .06, 2), mat.mat);
      m.position.set((cx + w / 2) * U, (layer + h / 2) * BH, (cz + d / 2) * U); m.castShadow = m.receiveShadow = true; castle.add(m);
      for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) mat.pos.push([(cx + i + .5) * U, (layer + h) * BH + .1, (cz + j + .5) * U]);
    };
    const plate = new TT.Mesh(RB(10 * U, .3, 8 * U), plastic(0x3fae5a)); plate.position.set(4 * U, .15, 3 * U); plate.receiveShadow = true; castle.add(plate);
    const C = [0xe8463c, 0xffd23f, 0x2f7fe0, 0xf6f2e8];
    // walls: a little gatehouse with two towers
    for (let L = 0; L < 4; L++) {
      const c1 = C[L % 2 ? 3 : 0], c2 = C[L % 2 ? 0 : 3], y = L + .3 / BH;
      brick(1, 1, y, 2, 2, c1); brick(7, 1, y, 2, 2, c1);                 // towers
      if (L < 3) { brick(3, 1, y, L === 0 || L === 1 ? 1 : 4, 1, c2); if (L < 2) brick(6, 1, y, 1, 1, c2); }   // front wall with a door gap
      brick(3, 2, y, 4, 1, C[1]);                                       // back wall
    }
    brick(1, 1, 4 + .3 / BH, 2, 2, C[2]); brick(7, 1, 4 + .3 / BH, 2, 2, C[2]);
    [[1.5, 1.5], [7.5, 1.5]].forEach(([x, z]) => { const roof = new TT.Mesh(new TT.ConeGeometry(1.25, 1.6, 4), plastic(0x2f7fe0)); roof.rotation.y = Math.PI / 4; roof.position.set((x + .5) * U, (5 + .3 / BH) * BH + .8, (z + .5) * U); roof.castShadow = true; castle.add(roof); });
    const pole = new TT.Mesh(new TT.CylinderGeometry(.05, .05, 1.6, 8), plastic(0x555555)); pole.position.set(2 * U, 6.6 * BH, 2 * U); castle.add(pole);
    const flag = new TT.Mesh(new TT.PlaneGeometry(.9, .55), M({ color: 0xff5d5d, roughness: .7, side: TT.DoubleSide })); flag.position.set(2 * U + .46, 6.6 * BH + .5, 2 * U); castle.add(flag);
    flag.userData.keep = true; roomTicks.push(t => { flag.rotation.y = Math.sin(t * 3) * .25; });
    // a brick tree beside the gate
    brick(0, 5, .3 / BH, 1, 1, 0x8a5a2b); brick(0, 5, 1 + .3 / BH, 1, 1, 0x8a5a2b);
    const leaves = new TT.Mesh(new TT.SphereGeometry(.85, 18, 12), plastic(0x2fbf62)); leaves.position.set(.5 * U, 2 * BH + .9, 5.5 * U); leaves.castShadow = true; castle.add(leaves);
    Object.values(studs).forEach(({ mat, pos }) => { const im = new TT.InstancedMesh(studG, mat, pos.length), o = new TT.Object3D(); pos.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); im.setMatrixAt(i, o.matrix); }); im.castShadow = true; castle.add(im); });

    // --- toy chest with the lid open, toys spilling out ---
    const chest = new TT.Group(); chest.position.set(-12.6, F, -11.6); chest.rotation.y = .45; g.add(chest);
    const cw = wood('chest', '#c98a4b', '#8c5426', 512, 512, 1.1), chestM = M({ map: cw, roughness: .55, bumpScale: .004 });
    const paint = M({ color: 0x3fa0ff, roughness: .45 }), paint2 = M({ color: 0xff6b6b, roughness: .45 });
    const CW = 6.2, CH = 3.4, CD = 3.8, th = .3;
    box(CW, th, CD, chestM, 0, th / 2, 0, 0, chest);
    box(CW, CH, th, chestM, 0, CH / 2, CD / 2 - th / 2, 0, chest); box(CW, CH, th, chestM, 0, CH / 2, -CD / 2 + th / 2, 0, chest);
    box(th, CH, CD, chestM, -CW / 2 + th / 2, CH / 2, 0, 0, chest); box(th, CH, CD, chestM, CW / 2 - th / 2, CH / 2, 0, 0, chest);
    box(CW + .06, .5, CD + .06, paint, 0, CH - .55, 0, 0, chest).castShadow = false;                  // painted band
    [[-CW / 2, CD / 2], [CW / 2, CD / 2]].forEach(([x, z]) => box(.5, CH + .1, .5, paint2, x, CH / 2, z, 0, chest));   // corner posts
    const star = canvasTex('chestStar', 128, 128, (c, W) => { c.fillStyle = '#ffd23f'; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 24 : 54, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(W / 2 + Math.cos(a) * r, W / 2 + Math.sin(a) * r); } c.fill(); });
    const st = new TT.Mesh(new TT.PlaneGeometry(1.5, 1.5), new TT.MeshStandardMaterial({ map: star, transparent: true, roughness: .5 })); st.position.set(0, CH * .42, CD / 2 + .01); chest.add(st);
    // brass corner caps, hinges and a rope handle
    const brass = M({ color: 0xd9a441, roughness: .35, metalness: .85, clearcoat: .3 });
    [[-1, 1], [1, 1]].forEach(([sx, sz]) => [.18, CH - .18].forEach(y => { const c = new TT.Mesh(RB(.62, .36, .62, .1, 2), brass); c.position.set(sx * (CW / 2 - .02), y, sz * (CD / 2 - .02)); c.castShadow = true; chest.add(c); }));
    [-1.8, 1.8].forEach(x => { const h = new TT.Mesh(new TT.CylinderGeometry(.09, .09, .7, 14), brass); h.rotation.z = Math.PI / 2; h.position.set(x, CH, -CD / 2 - .02); chest.add(h); });
    [-1, 1].forEach(sx => { const rope = new TT.Mesh(new TT.TorusGeometry(.42, .07, 10, 28, Math.PI), M({ color: 0xc9a46a, roughness: .9 })); rope.position.set(sx * (CW / 2 + .05), CH * .62, 0); rope.rotation.set(0, Math.PI / 2, Math.PI); chest.add(rope); });
    const lid = new TT.Group(); lid.position.set(0, CH, -CD / 2); lid.rotation.x = -1.95; chest.add(lid);
    box(CW + .1, th, CD + .1, chestM, 0, 0, CD / 2, 0, lid); box(CW + .12, .32, .4, paint, 0, .05, CD, 0, lid);
    // stuff inside (peeking over the rim)
    const ballS = (r, c, x, y, z, par = chest) => { const m = new TT.Mesh(new TT.SphereGeometry(r, 28, 18), plastic(c)); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
    ballS(.9, 0xff8fc7, -1.6, CH - .3, -.3); ballS(.7, 0x3ccf91, 1.9, CH - .4, .6);
    const blk = (c, x, y, z, r) => { const b = rbox(1, 1, 1, .12, plastic(c)); b.position.set(x, y, z); b.rotation.set(r, r * 1.7, r * .5); chest.add(b); return b; };
    blk(0xffd23f, .2, CH - .1, -.9, .3); blk(0x36b4ff, 1, CH + .1, -.6, .8);
    // spilled toys on the floor
    blk(0xe8463c, -.6, .5, CD / 2 + 1.4, .2).position.y = .5; blk(0xffd23f, 1.2, .5, CD / 2 + 1, 1.1).position.y = .5;
    ballS(.55, 0x8d6bff, 2.6, .55, CD / 2 + 1.8);

    // --- retro TV game: a CRT on a low cabinet, a console and a corded pad on the floor ---
    const tv = new TT.Group(); tv.position.set(-1.5, F, -15.2); tv.scale.setScalar(.78); g.add(tv);
    const cab = M({ map: wood('cab', '#a86c3a', '#6e4220', 512, 512, 1.2), roughness: .5, bumpScale: .004 });
    box(9, 1.8, 3.2, cab, 0, .9, 0, 0, tv);
    [-2.2, 2.2].forEach(x => { const d = box(4.1, 1.2, .08, M({ color: 0x7a4a24, roughness: .5 }), x, .9, 1.62, 0, tv); d.castShadow = false; });
    [-2.2, 2.2].forEach(x => { const k = new TT.Mesh(new TT.SphereGeometry(.16, 16, 10), M({ color: 0xd9a441, roughness: .35, metalness: .8 })); k.position.set(x + (x < 0 ? 1.6 : -1.6), .9, 1.7); tv.add(k); });
    [-4.1, 4.1].forEach(x => [-1.2, 1.2].forEach(z => { const f = new TT.Mesh(new TT.CylinderGeometry(.22, .16, .25, 16), M({ color: 0x5a3418, roughness: .5 })); f.position.set(x, -.0, z); tv.add(f); }));
    const tvBody = rbox(5.2, 4.2, 3.6, .55, plastic(0xece6d8)); tvBody.position.set(-.8, 1.8 + 2.1, 0); tv.add(tvBody);
    const scr = canvasTex('tvscreen', 320, 240, (c, W, H) => {
      c.fillStyle = '#16204a'; c.fillRect(0, 0, W, H);
      const px = 10; c.fillStyle = '#1b8a43'; c.fillRect(80, 40, 160, 160);
      c.fillStyle = '#0d4f25'; for (let i = 0; i <= 8; i++) { c.fillRect(80 + i * 20 - 1, 40, 2, 160); c.fillRect(80, 40 + i * 20 - 1, 160, 2); }
      [[3, 3, 1], [4, 4, 1], [3, 4, 0], [4, 3, 0], [2, 3, 0], [5, 4, 1]].forEach(([x, y, b]) => { c.fillStyle = b ? '#fff' : '#111'; c.fillRect(84 + x * 20, 44 + y * 20, 12, 12); });
      c.fillStyle = '#ffd23f'; c.font = 'bold 20px monospace'; c.textAlign = 'center'; c.fillText('PRESS START', W / 2, 228); c.fillStyle = '#ff7fbe'; c.fillText('ATLAS', W / 2, 26);
      c.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
    });
    const screen = new TT.Mesh(new TT.PlaneGeometry(3.7, 2.8), new TT.MeshBasicMaterial({ map: scr, toneMapped: false }));
    screen.position.set(-1.25, 1.8 + 2.15, 1.82); tv.add(screen);
    const bezel = new TT.Mesh(new TT.PlaneGeometry(4.1, 3.2), M({ color: 0x2b3044, roughness: .4 })); bezel.position.set(-1.25, 1.8 + 2.15, 1.81); tv.add(bezel);
    [0, 1].forEach(i => { const k = new TT.Mesh(new TT.CylinderGeometry(.2, .2, .2, 20), plastic(i ? 0xff5d5d : 0x6a7088)); k.rotation.x = Math.PI / 2; k.position.set(1.15, 1.8 + 2.8 - i * .7, 1.82); tv.add(k); });
    const ant = new TT.Mesh(new TT.CylinderGeometry(.04, .04, 2.4, 8), plastic(0x9aa0b2)); ant.position.set(-.3, 1.8 + 4.2 + 1, -.3); ant.rotation.z = .5; tv.add(ant);
    const ant2 = ant.clone(); ant2.rotation.z = -.4; ant2.position.x = -1.4; tv.add(ant2);
    roomTicks.push(t => { scr.offset.y = (Math.floor(t * 8) % 2) * .002; });
    const con = rbox(2.4, .6, 1.8, .2, plastic(0x9aa0b2)); con.position.set(2.4, 1.8 + .3, .4); tv.add(con);
    const slot = box(1.4, .08, .5, M({ color: 0x2b3044, roughness: .6 }), 2.4, 1.8 + .62, .3, 0, tv); slot.castShadow = false;
    const cart = rbox(1.2, .9, .3, .08, plastic(0xff5d5d)); cart.position.set(2.4, 1.8 + 1, .3); tv.add(cart);
    // gamepad on the floor, cable running to the console
    const pad = new TT.Group(); pad.position.set(4.8, F + .18, -10.8); pad.rotation.y = -.35; g.add(pad);
    const pb = rbox(2, .35, 1, .16, plastic(0xece6d8)); pad.add(pb);
    const dp = box(.5, .12, .16, plastic(0x2b3044), -.55, .2, 0, 0, pad); box(.16, .12, .5, plastic(0x2b3044), -.55, .2, 0, 0, pad); dp.castShadow = false;
    [[.45, .1, 0xff5d5d], [.75, -.12, 0x36b4ff]].forEach(([x, z, c]) => { const b = new TT.Mesh(new TT.CylinderGeometry(.14, .14, .14, 16), plastic(c)); b.position.set(x, .2, z); pad.add(b); });
    const curve = new TT.CatmullRomCurve3([new TT.Vector3(4.2, F + .2, -11.2), new TT.Vector3(3.2, F + .05, -12.6), new TT.Vector3(1.6, F + .05, -13.2), new TT.Vector3(1.2, F + 1.6, -13.9), new TT.Vector3(.9, F + 1.9, -14.4)]);
    const cable = new TT.Mesh(new TT.TubeGeometry(curve, 40, .05, 6), M({ color: 0x2b3044, roughness: .6 })); g.add(cable);

    // --- the Atlas Mon live here ---
    // phones: build the room's figures with far fewer segments (they are small in the background; ~370k → ~60k triangles)
    const lowPoly = (make, f = .38) => {
      const sg = (n, d, lo) => Math.max(lo, Math.round((n || d) * f)), keep = {};
      const patch = (name, fn) => { const B = TT[name]; keep[name] = B; TT[name] = class extends B { constructor(...a) { super(...fn(a)); } }; };
      patch('SphereGeometry', a => { a[1] = sg(a[1], 32, 8); a[2] = sg(a[2], 16, 6); return a; });
      patch('TorusGeometry', a => { a[2] = sg(a[2], 16, 4); a[3] = sg(a[3], 48, 8); return a; });
      patch('LatheGeometry', a => { a[1] = sg(a[1], 12, 8); return a; });
      patch('CylinderGeometry', a => { a[3] = sg(a[3], 8, 6); return a; });
      try { return make(); } finally { Object.assign(TT, keep); }
    };
    const MON = window.Icons3D && Icons3D.MONS;
    if (MON) {
      const place = (id, h, x, y, z, ry, par = g) => {
        if (!MON[id]) return; let m; try { m = lowPoly(MON[id], COARSE ? .38 : .6); } catch (e) { return; }   // PC: still round at this size, ~1/3 of the triangles
        const bb = new TT.Box3().setFromObject(m), s = h / Math.max(.01, bb.max.y - bb.min.y);
        const w = new TT.Group(); w.add(m); m.position.y = -bb.min.y; w.scale.setScalar(s); w.position.set(x, y, z); w.rotation.y = ry; par.add(w);
        m.traverse(o => { if (o.isMesh) o.castShadow = !COARSE; });   // phones: tiny far-away figures, no shadow pass
        if (m.userData.tick && !COARSE) { w.userData.keep = true; try { mergeStatic(m); } catch (e) {} roomTicks.push(t => m.userData.tick(t)); }   // PC: it breathes and blinks, but as a few meshes (the eyes stay separate)   // phones: the room's characters stand still and get merged (far fewer draw calls)
        return w;
      };
      place('plop', 2.2, -.4, CH - .9, .2, .1, chest);                 // peeking out of the toy chest
      place('tile', 2.6, -16.2, F, -6.5, .9);                         // robot by the chest
      place('knight', 2.6, 10.6, F, -9.4, -.6);                        // guarding the castle gate
      place('dot', 1.0, 2.4, 4 * BH + .3 + .02, 1.2, 0, castle);  // up on the castle wall
      place('disc', 2.0, 3.4, F, -11.4, -.3);                         // playing the TV game
      place('owl', 1.9, -.8, 1.8 + 4.2 + .05, 0, .2, tv);              // dozing on the TV
      place('stone', 2.3, -15.2, F, 4.5, 1.1);                        // on the left of the table
      place('crab', 1.6, 15.4, F, 3.6, -1.2);                         // on the right
      if (mode === 'night') place('gold', 1.3, 7.2, 9.4 + .2, -15.9 + 1.2, 0, g);
    }
  }
  /* ---------- realistic tatami: woven igusa rush (fine strands along the long side, crossed by the warp every few mm),
     slight colour drift between strands, sun-faded yellow-green, and a dark green cloth border (heri) on the long sides ---------- */
  const TAT_W = 27, TAT_L = 54;
  let tatamiCache = null;
  function tatamiTex() {
    if (tatamiCache) return tatamiCache;
    const W = 1024, H = 2048, N = makeNoise(21), HERI = 54;
    const draw = (bump) => canvasTex('tatami3' + (bump ? 'b' : ''), W, H, (c) => {
      const img = c.createImageData(W, H), d = img.data;
      const strandW = 4.2, warp = 19;   // px: one rush strand, warp spacing
      for (let x = 0; x < W; x++) {
        const sid = Math.floor(x / strandW), sh = (N(sid * .37, 3.1, 1) - .5), cx = (x % strandW) / strandW;
        const round = Math.sin(cx * Math.PI);                    // each strand is a little cylinder
        for (let y = 0; y < H; y++) {
          const i = (y * W + x) * 4;
          if (x < HERI || x >= W - HERI) {   // heri: woven cotton, dark green with a faint twill
            const tw = ((x + y) % 6 < 3 ? 1 : 0) * 6 + N(x / 6, y / 6, 1) * 8, edge = Math.min(Math.abs(x - HERI), Math.abs(x - (W - HERI))) < 3 ? -18 : 0;
            if (bump) { d[i] = d[i + 1] = d[i + 2] = 150 + tw * 3; } else { d[i] = 38 + tw + edge; d[i + 1] = 56 + tw + edge; d[i + 2] = 36 + tw * .6 + edge; }
            d[i + 3] = 255; continue;
          }
          const wy = (y % warp) / warp, under = Math.exp(-Math.pow((wy - .5) / .06, 2));   // where the warp thread presses the strand down
          const fib = N(x * .9, y * .012, 2), len = N(sid * .5, y / 180, 2);
          let t = .5 + sh * .5 + (len - .5) * .5 + (fib - .5) * .25;
          if (bump) { const v = 70 + round * 150 - under * 90 + (fib - .5) * 30; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, v)); }
          else {
            const shade = .86 + round * .16 - under * .1;
            const r = (196 + t * 30) * shade, g2 = (186 + t * 26) * shade, b = (118 + t * 18) * shade;   // faded straw-green
            d[i] = r; d[i + 1] = g2; d[i + 2] = b;
            if (under > .6) { d[i] *= .93; d[i + 1] *= .93; d[i + 2] *= .9; }   // the warp thread itself (darker cotton)
          }
          d[i + 3] = 255;
        }
      }
      c.putImageData(img, 0, 0);
      if (!bump) { const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,.18)'); g.addColorStop(.08, 'rgba(0,0,0,0)'); g.addColorStop(.92, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); c.fillStyle = g; c.fillRect(HERI, 0, W - 2 * HERI, H); }
    });
    const map = draw(false), bump = draw(true); bump.encoding = T().LinearEncoding;
    map.anisotropy = bump.anisotropy = 8;
    return (tatamiCache = { map, bump });
  }
  let localFloor = false;
  // the floor texture as an image + its size in world units, for a page background that matches the 3D floor
  function floorImage(kind) { return kind === 'tatami' ? { img: tatamiTex().map.image, w: TAT_W, h: TAT_L } : { img: woodTop('tblR5', '#c08446', '#6a3e1c').image, w: 40, h: 40 }; }
  function buildRoom(scene, plain) {
    const TT = T(), mode = plain ? 'day' : timeOfDay(new Date().getHours()), L = LOOK[mode];   // the games themselves are always lit like daytime
    const g = new TT.Group(); scene.add(g);
    const FLOOR = -3.4;
    if (plain && localFloor) {   // skin pages: the floor is the page's own CSS background; the canvas only carries the board and its shadow
      const sc = new TT.Mesh(new TT.PlaneGeometry(200, 200), new TT.ShadowMaterial({ opacity: .32 })); sc.rotation.x = -Math.PI / 2; sc.receiveShadow = true; g.add(sc);
    } else if (plain === 'tatami') {   // shogi: the board stands on tatami
      const TA = tatamiTex(), mat = M({ map: TA.map, roughness: .78, sheen: new TT.Color(0x3a3a24), bumpScale: .006 });
      mat.bumpMap = TA.bump;
      // mats laid long side vertical; the board stands across the joint of two of them
      for (const sx of [-4, -2, 0, 2, 4]) for (const sz of [-1, 0, 1]) { const m = new TT.Mesh(new TT.PlaneGeometry(TAT_W, TAT_L), mat); m.rotation.x = -Math.PI / 2; m.position.set(sx * TAT_W / 2 + 10, 0, sz * TAT_L + (Math.abs(sx) % 4 === 2 ? 14 : -6)); m.receiveShadow = true; g.add(m); }
    } else if (plain) {   // play screen of the full games: just a wide wooden tabletop, no room edges
      const tm = M({ map: woodTop('tblR5', '#c08446', '#6a3e1c'), roughness: .62, clearcoat: .12, clearcoatRoughness: .55, bumpScale: .003 });
      const t = new TT.Mesh(new TT.PlaneGeometry(40, 40), tm); t.rotation.x = -Math.PI / 2; t.receiveShadow = true; g.add(t);
    } else {
    // tatami
    const tatami = canvasTex('tatami', 512, 1024, (c, W, H) => {
      const N = makeNoise(9), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const weave = (y % 6 < 3 ? 8 : -6) + (N(x / 3, y / 40, 2) - .5) * 26 + (N(x / 80, y / 80, 2) - .5) * 14, i = (y * W + x) * 4;
        d[i] = 196 + weave; d[i + 1] = 190 + weave; d[i + 2] = 132 + weave * .6; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      c.fillStyle = '#5a6a44'; c.fillRect(0, 0, 14, H); c.fillRect(W - 14, 0, 14, H);              // heri (cloth borders)
      c.fillStyle = 'rgba(255,255,255,.12)'; for (let y = 0; y < H; y += 14) c.fillRect(0, y, 14, 2), c.fillRect(W - 14, y, 14, 2);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 0, W, 3); c.fillRect(0, H - 3, W, 3);
    });
    tatami.wrapS = tatami.wrapT = TT.RepeatWrapping; tatami.repeat.set(6, 3);
    const floor = new TT.Mesh(new TT.PlaneGeometry(60, 60), M({ map: tatami, roughness: .85, bumpScale: .01 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; g.add(floor);
    // walls: warm plaster above a wooden wainscot
    const plaster = canvasTex('plaster', 512, 512, (c, W) => { const N = makeNoise(4), img = c.createImageData(W, W), d = img.data; for (let i = 0; i < W * W; i++) { const x = i % W, y = i / W | 0, k = (N(x / 18, y / 18, 3) - .5) * 16; d[i * 4] = 246 + k; d[i * 4 + 1] = 236 + k; d[i * 4 + 2] = 214 + k; d[i * 4 + 3] = 255; } c.putImageData(img, 0, 0); });
    plaster.wrapS = plaster.wrapT = TT.RepeatWrapping; plaster.repeat.set(3, 2);
    const wallM = M({ map: plaster, roughness: .95, bumpScale: .004 }), wain = M({ map: wood('wain', '#b9814a', '#7a4a22', 512, 512, 1.4), roughness: .6, bumpScale: .004 });
    const wall = (w, x, z, ry) => {
      const wg = new TT.Group(); wg.position.set(x, FLOOR, z); wg.rotation.y = ry; g.add(wg);
      const p = new TT.Mesh(new TT.PlaneGeometry(w, 22), wallM); p.position.y = 11; p.receiveShadow = true; wg.add(p);
      const wb = new TT.Mesh(RB(w, 3.2, .3), wain); wb.position.set(0, 1.6, .15); wb.receiveShadow = true; wg.add(wb);
      const rail = new TT.Mesh(RB(w, .25, .45), wain); rail.position.set(0, 3.3, .2); wg.add(rail);
      return wg;
    };
    const back = wall(44, 0, -17, 0); wall(44, -20, 0, Math.PI / 2); wall(44, 20, 0, -Math.PI / 2);
    // window with the sky of the hour
    const sky = canvasTex('sky-' + mode, 256, 256, (c, W) => {
      const gr = c.createLinearGradient(0, 0, 0, W); gr.addColorStop(0, L.sky[0]); gr.addColorStop(1, L.sky[1]); c.fillStyle = gr; c.fillRect(0, 0, W, W);
      if (mode === 'night') { c.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { c.globalAlpha = Math.random() * .8 + .2; c.fillRect(Math.random() * W, Math.random() * W * .8, 1.6, 1.6); } c.globalAlpha = 1; c.fillStyle = '#fff6d0'; c.beginPath(); c.arc(W * .72, W * .26, 16, 0, 7); c.fill(); }
      if (mode === 'evening') { c.fillStyle = 'rgba(255,240,200,.9)'; c.beginPath(); c.arc(W * .3, W * .78, 30, 0, 7); c.fill(); }
      if (mode === 'day' || mode === 'morning') { c.fillStyle = 'rgba(255,255,255,.9)'; [[.25, .3, 40], [.62, .45, 30], [.8, .22, 24]].forEach(([x, y, r]) => { c.beginPath(); c.arc(W * x, W * y, r, 0, 7); c.arc(W * x + r, W * y + 6, r * .8, 0, 7); c.arc(W * x - r, W * y + 8, r * .7, 0, 7); c.fill(); }); }
    });
    const win = new TT.Mesh(new TT.PlaneGeometry(12, 8), new TT.MeshBasicMaterial({ map: sky, toneMapped: false }));
    win.position.set(-7, 10.5, .02); back.add(win);
    const frameM = M({ color: 0xf6efe0, roughness: .5 });
    [[0, 4.1, 12.8, .5], [0, -4.1, 12.8, .5], [-6.2, 0, .5, 8.6], [6.2, 0, .5, 8.6], [0, 0, .25, 8], [0, 0, 12, .25]].forEach(([x, y, w, h]) => { const m = new TT.Mesh(RB(w, h, .4), frameM); m.position.set(-7 + x, 10.5 + y, .2); back.add(m); });
    const sill = new TT.Mesh(RB(13.6, .35, 1.2), frameM); sill.position.set(-7, 6.25, .5); back.add(sill);
    // toy shelf on the back wall, with blocks, balls and board-game boxes
    const shelfM = M({ map: wood('shelf', '#d8a46a', '#a06a3a', 512, 512, 1.2), roughness: .55 });
    [5.4, 9.4].forEach(y => { const s = new TT.Mesh(RB(14, .4, 2.4), shelfM); s.position.set(10, y, 1.2); s.castShadow = s.receiveShadow = true; back.add(s); });
    [[3.2], [16.8]].forEach(([x]) => { const s = new TT.Mesh(RB(.4, 8.6, 2.4), shelfM); s.position.set(x, 7.6, 1.2); back.add(s); });
    const toy = (geo, col, x, y, z, ry = 0) => { const m = new TT.Mesh(geo, M({ color: col, roughness: .35 })); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; back.add(m); };
    const blk = RB(1, 1, 1);
    toy(blk, 0xff5d5d, 5, 6.1, 1.4, .3); toy(blk, 0x36b4ff, 6.2, 6.1, 1.2, -.2); toy(blk, 0xffc928, 5.6, 7.1, 1.3, .6);
    toy(new TT.SphereGeometry(.7, 24, 16), 0x3ccf91, 8.2, 6.3, 1.4); toy(new TT.SphereGeometry(.5, 24, 16), 0x8d6bff, 9.4, 6.1, 1.0);
    [[11.5, 0xe8a33d], [12.9, 0x5a6b8c], [14.3, 0x22aa74], [15.6, 0xff6b6b]].forEach(([x, c], i) => toy(RB(1.1, 3, 2), c, x, 7.1, 1.2, i % 2 ? .05 : -.04));   // game boxes
    toy(RB(5, .7, 2.2), 0xc48a4a, 7.5, 9.95, 1.2); toy(RB(4.4, .7, 2), 0x2a6fe8, 7.6, 10.65, 1.2, .08);
    toy(new TT.ConeGeometry(.6, 1.4, 20), 0xff8fc7, 12.5, 10.3, 1.3); toy(new TT.CylinderGeometry(.8, .8, .5, 24), 0xffd23f, 14.5, 9.85, 1.3);
    // chabudai: a low round table, the game board sits on it (its top is y = 0)
    const top = M({ map: wood('chabu2', '#b8763e', '#8a5226', 1024, 1024, .8), roughness: .5, clearcoat: .25, clearcoatRoughness: .45, bumpScale: .004 });
    const disk = new TT.Mesh(new TT.CylinderGeometry(9.2, 9.2, .55, 72), top); disk.position.y = -.275; disk.castShadow = disk.receiveShadow = true; g.add(disk);
    const lip = new TT.Mesh(new TT.TorusGeometry(9.2, .14, 10, 72), top); lip.rotation.x = Math.PI / 2; lip.position.y = -.02; g.add(lip);
    const apron = new TT.Mesh(new TT.CylinderGeometry(8.4, 8.4, .5, 64, 1, true), M({ color: 0x5a3018, roughness: .6 })); apron.position.y = -.8; g.add(apron);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const l = new TT.Mesh(RB(.8, -FLOOR - .5, .8), M({ color: 0x5a3018, roughness: .6 })); l.position.set(sx * 5.6, (FLOOR - .5) / 2, sz * 5.6); l.castShadow = true; g.add(l); });
    // zabuton (floor cushions) and a few toys on the tatami
    const cush = (x, z, r, c) => { const m = new TT.Mesh(new TT.BoxGeometry(6, .9, 6, 6, 1, 6), M({ color: c, roughness: .8 })); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) p.setY(i, y * (1.2 - .5 * (Math.abs(p.getX(i)) + Math.abs(p.getZ(i))) / 6)); } m.geometry.computeVertexNormals(); m.position.set(x, FLOOR + .45, z); m.rotation.y = r; m.receiveShadow = true; m.castShadow = true; g.add(m); };
    cush(0, 13, .1, 0xd94a4a); cush(-13, 2, -.4, 0x3b6fd1);
    const ball = new TT.Mesh(new TT.SphereGeometry(1.1, 32, 20), M({ color: 0xffc928, roughness: .3 })); ball.position.set(14, FLOOR + 1.1, 9); ball.castShadow = true; g.add(ball);
      decorate(g, FLOOR, mode);
      try { mergeStatic(g); } catch (e) { console.warn('[table3d] merge', e); }
    }
    // lights of the hour
    scene.add(new TT.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    const key = new TT.DirectionalLight(L.sun, L.sunI * (plain ? .7 : 1)); key.position.set(...L.sunPos); key.castShadow = true;
    key.shadow.mapSize.setScalar(LITE ? 512 : COARSE ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    scene.add(key);
    const fill = new TT.DirectionalLight(0xfff0d8, { morning: .3, day: .35, evening: .18, night: .06 }[mode]); fill.position.set(6, 14, 10); scene.add(fill);
    if (L.lamp) { const lamp = new TT.PointLight(0xffc98a, L.lamp, 40, 1.6); lamp.position.set(0, 13, 2); lamp.castShadow = false;   // a point-light shadow is 6 extra shadow passes per frame scene.add(lamp);
      const shade = new TT.Mesh(new TT.ConeGeometry(2.2, 1.6, 32, 1, true), new TT.MeshBasicMaterial({ color: 0xffe2b0, side: TT.DoubleSide })); shade.position.set(0, 14, 2); shade.visible = camTo < .5; lampShade = shade; scene.add(shade); }
    if (R) R.toneMappingExposure = L.exp * (plain ? .8 : 1);
    scene.background = plain && localFloor ? null : new TT.Color(plain === 'tatami' ? '#6f6a40' : plain ? '#8a5226' : L.sky[1]).convertSRGBToLinear();
    roomMode = mode;
  }
  function mount(container, opts = {}) {
    el = container;
    R = new (T().WebGLRenderer)({ antialias: !LITE, alpha: true, powerPreference: 'high-performance' });
    const coarse = COARSE;
    pr = Math.min(LITE ? 1 : coarse ? 1.5 : 2, window.devicePixelRatio || 1); R.setPixelRatio(pr);   // phones: 1.5x is sharp enough and ~45% fewer pixels than 2x; lite: 1x
    R.shadowMap.enabled = true; R.shadowMap.type = LITE ? T().PCFShadowMap : T().PCFSoftShadowMap;
    R.outputEncoding = T().sRGBEncoding; R.toneMapping = T().ACESFilmicToneMapping; R.toneMappingExposure = .78;
    container.appendChild(R.domElement);
    scene = new (T().Scene)();
    cam = new (T().PerspectiveCamera)(32, 1, .1, 200);
    // studio-like image-based lighting (soft boxes) for believable reflections on lacquer, stones and discs
    try {
      const env = new (T().Scene)(), TT = T();
      const sky = new TT.Mesh(new TT.SphereGeometry(30, 32, 16), new TT.MeshBasicMaterial({ side: TT.BackSide, vertexColors: true }));
      const col = [], pos = sky.geometry.attributes.position, c = new TT.Color();
      // tinted by the hour (see LOOK): reflections and ambient follow morning / day / evening / night
      const Lk = LOOK[opts.plain ? 'day' : timeOfDay(new Date().getHours())], tint = new TT.Color(Lk.hemi[0]).convertSRGBToLinear(), sunC = new TT.Color(Lk.sun).convertSRGBToLinear(), amt = Lk.hemi[2] / .5;
      for (let i = 0; i < pos.count; i++) { const y = Math.max(0, pos.getY(i) / 30), k = (.06 + .3 * y) * amt; c.setRGB(tint.r * k, tint.g * k, tint.b * k); col.push(c.r, c.g, c.b); }
      sky.geometry.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); env.add(sky);
      [[-8, 16, 6, 12, 7, 1.6], [10, 10, -6, 8, 6, .8], [0, 6, 18, 18, 4, .4]].forEach(([x, y, z, w, h, k]) => {
        const kk = k * Math.min(1.2, Lk.sunI + (Lk.lamp ? .25 : 0)), lc = Lk.lamp > 1 ? new TT.Color(0xffc98a).convertSRGBToLinear() : sunC;
        const p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: new TT.Color(lc.r * kk, lc.g * kk, lc.b * kk), side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
      });
      const pm = new TT.PMREMGenerator(R); scene.environment = pm.fromScene(env, .03).texture; pm.dispose();
      envOK = true;
    } catch (e) {}
    localFloor = !!opts.local; buildRoom(scene, opts.plain || false);
    root = new (T().Group)(); scene.add(root);
    // touch / mouse: drag to spin the board (any mode). A drag longer than a few px is not a click.
    // zoom (view mode): mouse wheel, or pinch with two fingers
    container.addEventListener('wheel', e => { if (mode === 'play') return; e.preventDefault(); zoomTo = Math.max(.55, Math.min(1.7, zoomTo * Math.exp(e.deltaY * .0012))); }, { passive: false });
    const pts = new Map(); let pinch0 = 0, zoom0 = 1;
    const pdist = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    container.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2 && mode !== 'play') { pinch0 = pdist(); zoom0 = zoomTo; drag = null; } }, true);
    container.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2 && pinch0 && mode !== 'play') { zoomTo = Math.max(.55, Math.min(1.7, zoom0 * pinch0 / Math.max(10, pdist()))); dragEnd = performance.now(); } }, true);
    const pup = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    container.addEventListener('pointerup', pup, true); container.addEventListener('pointercancel', pup, true);
    container.addEventListener('pointerdown', e => { if (mode === 'play' || pts.size > 1) return; drag = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false }; vel = 0; });
    container.addEventListener('pointermove', e => {
      if (!drag || pts.size > 1) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 7) { drag.moved = true; spin = false; try { container.setPointerCapture(e.pointerId); } catch (x) {} }
      if (!drag.moved) return;
      const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly, now = performance.now(), dt = Math.max(8, now - drag.t);
      yaw += dx * .011; vel = dx * .011 / dt * 16; tilt = Math.max(-.35, Math.min(.35, tilt + dy * .004));
      drag.lx = e.clientX; drag.ly = e.clientY; drag.t = now;
    });
    const up = () => { if (drag && drag.moved) { dragEnd = performance.now(); idleT = performance.now(); } drag = null; };
    container.addEventListener('pointerup', up); container.addEventListener('pointercancel', up);
    new ResizeObserver(resize).observe(container); resize();
    loop();
  }
  // the canvas always fills the screen (no seams); `inset` px at the bottom are covered by the info card,
  // so the camera frames the board inside the free area above it (view offset), easing when it changes
  let inset = 0, insetTo = 0, cw = 1, ch = 1;
  function frame() {
    const free = Math.max(120, ch - inset);
    cam.aspect = cw / free;
    if (inset > .5) cam.setViewOffset(cw, free, 0, 0, cw, ch); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  // glide: a timed ease-in-out of the camera (and the framing above the info card) instead of the soft exponential follow
  let glide = null;
  const ioC = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function setInset(px) { insetTo = Math.max(0, px || 0); if (glide) glide.i1 = insetTo; }
  function resize() {
    if (!R) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    cw = w; ch = h; R.setSize(w, h, false); frame(); kick(300);
  }
  // camera distance keeps a ~11-unit board in frame for any aspect ratio
  function camPose(k) {
    const a = cam.aspect || 1, th = Math.tan(cam.fov * Math.PI / 360);
    // keep the board (~10.5 wide incl. margin, ~9 deep) inside both the width and the height of the view
    const fw = fitTo ? fitTo.w / 2 : 6.0, fd = fitTo ? fitTo.d / 2 : 7.0;   // play view: frame the given board size (half extents + a small margin)
    const needW = (k ? fw : 6.5) / (th * a), needH = (k ? fd : 6.8) / th;
    const dist = Math.max(needW, needH) * (k ? 1 : 1.08) * (1 + (zoom - 1) * (1 - k));   // zoom applies to the showcase view only
    const pitch = .52 + k * ((fitTo && fitTo.pitch ? fitTo.pitch : 1.34) - .52);   // play: nearly top-down (fit can ask for straight down)                       // view: low 3/4 so the room shows · play: nearly top-down
    return [0, dist * Math.sin(pitch), dist * Math.cos(pitch)];
  }
  // fit(o): play view frames a board of o.w × o.d world units whose top is at o.y (null = default); cleared by show()
  //   o.roll: the camera is rolled 90° (screen up = world −x): o.w then runs along the screen height, o.d along its width
  let fitTo = null;
  function fit(o) { fitTo = o || null; }
  // show a board. opts.intro = a small "icon" model: it spins up first, then bursts into the board,
  // which lands with squash & stretch. opts.onSwap fires at the burst (for 2D effects).
  const ease = { outBack: k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), out3: k => 1 - Math.pow(1 - k, 3), in2: k => k * k };
  function dispose(o) { o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); }
  // phones: free the GPU copies of the textures only the outgoing board used (the canvases stay cached, so a revisit
  // simply re-uploads them). Without this, flicking through every game piles up 150 MB+ of board textures on the GPU
  // and an older iPhone starts failing uploads (boards drawn without their wood / inlay).
  const TEXK = ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap', 'emissiveMap', 'aoMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap'];
  const texOf = (o, set) => { o.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; ms.forEach(m => TEXK.forEach(k => { const t = m[k]; if (t && t.isCanvasTexture) set.add(t); })); }); return set; };
  function freeTextures(old, keep) {
    if (!COARSE || !old) return;
    const gone = texOf(old, new Set()); if (!gone.size) return;
    const live = new Set(); keep.forEach(o => o && texOf(o, live));
    gone.forEach(t => { if (!live.has(t)) t.dispose(); });
  }
  // build (and compile shaders for) a board ahead of time, e.g. on pointerdown, so the transition doesn't hitch
  const prepared = {};
  function prepare(id, extra) {
    if (!R || prepared[id] || !MODELS[id]) return;
    const g = MODELS[id](), tmp = new (T().Scene)(); tmp.add(g); if (extra) tmp.add(extra);
    try { R.compile(tmp, cam); } catch (e) {}
    tmp.remove(g); if (extra) tmp.remove(extra);
    prepared[id] = { g, extra };
  }
  function take(id) { const p = prepared[id]; delete prepared[id]; return p; }
  function show(id, model, opts = {}) {
    if (!R) return null;
    mode = 'view'; camTo = 0; spin = true; yaw = 0; vel = 0; tilt = 0; idleT = performance.now(); zoomTo = 1; fitTo = null;
    const old = cur; if (old) { root.remove(old); dispose(old); }
    const pre = !model && take(id);
    const g = model || (pre && pre.g) || (MODELS[id] ? MODELS[id]() : null);
    freeTextures(old, [scene, g]);   // (the room and the incoming board keep theirs)
    if (opts.introFromCache) opts.intro = (pre && pre.extra) || (window.Icons3D && Icons3D.ICONS[id] ? Icons3D.ICONS[id]() : null);
    cur = null; if (!g) return null;
    if (!model && !g.userData.merged) { g.userData.merged = true; try { mergeStatic(g); } catch (e) {} }   // the showcase boards are static: fewer draw calls (stones, pieces, bowls…)
    const c = new (T().Group)(); c.add(g); cur = c;
    const land = () => {        // board drops in and lands with squash & stretch
      root.add(c);
      const t0 = performance.now();
      (function anim(now) {
        const t = now - t0; let y = 0, sy = 1, sxz = 1;
        if (t < 150) { const k = ease.in2(t / 150); y = 3.2 * (1 - k); sy = 1.12; sxz = .9; }
        else if (t < 250) { const k = (t - 150) / 100; sy = 1.12 - .44 * Math.sin(k * Math.PI / 2); sxz = .9 + .26 * Math.sin(k * Math.PI / 2); }
        else if (t < 430) { const k = ease.out3((t - 250) / 180); sy = .68 + .4 * k; sxz = 1.16 - .2 * k; }
        else if (t < 560) { const k = ease.out3((t - 430) / 130); sy = 1.08 - .08 * k; sxz = .96 + .04 * k; }
        c.position.y = y; c.scale.set(sxz, sy, sxz);
        if (t < 560 && cur === c) requestAnimationFrame(anim); else c.scale.set(1, 1, 1);
      })(t0);
    };
    if (opts.magic) {           // materialise: grows out of the smoke with a little twist and overshoot
      root.add(c); c.visible = false; c.scale.setScalar(.02);
      const go = () => { if (cur !== c || c.visible) return; c.visible = true; const t0 = performance.now();
      (function anim(now) {
        const k = Math.min(1, (now - t0) / 480), e = k === 1 ? 1 : 1 - Math.pow(2, -8 * k) * Math.cos(k * 9.5);
        c.scale.setScalar(Math.max(.02, e)); c.rotation.y = (1 - ease.out3(k)) * -.9; c.position.y = (1 - ease.out3(k)) * 1.2;
        if (k < 1 && cur === c) requestAnimationFrame(anim); else { c.scale.set(1, 1, 1); c.rotation.y = 0; c.position.y = 0; }
      })(t0); };
      if (opts.hold) { revealFn = go; setTimeout(go, 1500); } else go();   // hold: wait for reveal() (the moment the icon vanishes)
      return g;
    }
    if (opts.still) { root.add(c); return g; }   // no entrance animation (skin pages: the board is simply there)
    if (!opts.intro) { land(); return g; }
    // intro: the icon spins one turn while it grows and rises, then pops
    const ic = new (T().Group)(); ic.add(opts.intro); root.add(ic); spin = false; yaw = 0;
    const t0 = performance.now(), S0 = opts.introScale || 1.7, D = 380;
    (function anim(now) {
      const k = Math.min(1, (now - t0) / D);
      const s = S0 * (.55 + .45 * ease.outBack(k));
      ic.scale.setScalar(s); ic.position.y = Math.sin(k * Math.PI) * 1.4;
      ic.rotation.y = Math.PI / 4 - (1 - ease.out3(k)) * Math.PI * 2;
      if (k < 1 && cur === c) return requestAnimationFrame(anim);
      root.remove(ic); dispose(ic);
      if (cur !== c) return;
      if (opts.onSwap) opts.onSwap();
      land(); spin = true;
    })(t0);
    return g;
  }
  let revealFn = null;
  function reveal() { const f = revealFn; revealFn = null; if (f) f(); }
  let lampShade = null;
  function play(on, o) {   // (the ceiling lamp's shade hides while the camera looks down at a game: see loop)
    if (o && o.glide) glide = { t: 0, dur: o.glide, k0: camK, i0: inset, i1: insetTo };
    mode = on ? 'play' : 'view'; camTo = on ? 1 : 0; spin = !on; idleT = 0; drag = null; vel = 0; tilt = 0; }
  const wasDrag = () => performance.now() - dragEnd < 250;
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
  // frame cap: at most 60 fps (120 Hz phones/monitors would otherwise render twice as often for nothing)
  const FRAME_MS = 1000 / 60; let lastT = 0;
  // pause completely while the tab is hidden or the window isn't focused
  let rafId = 0, blurred = false;
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; } else if (!rafId && R) rafId = requestAnimationFrame(loop); });
  addEventListener('blur', () => { blurred = true; }); addEventListener('focus', () => { blurred = false; if (typeof kick === 'function') kick(300); });
  // on-demand rendering (shared rule for every 3D skin): a frame is drawn only while something moves —
  // a kick(ms) from an animation, a changed board rect / canvas size, or dirty; otherwise the GPU stays idle
  let lastKey = '', kickUntil = 0, dirty = true, lastDraw = 0, idleTick = 0;
  addEventListener('resize', () => kick(300));
  const ALIGN_FOV = 40, ALIGN_SHIFT = .9;
  function kick(ms = 700) { kickUntil = Math.max(kickUntil, performance.now() + ms); dirty = true; }
  // adaptive resolution: while something animates, watch the frame interval; if a phone can't keep up (median > 34 ms),
  // drop to 1× pixels at once and remember 'lite' for the next visit (half-size textures, small shadows)
  let pr = 1, slow = [], slowDone = false;
  function watchSpeed(dt) {
    if (slowDone || !COARSE || !R) return;
    slow.push(dt); if (slow.length < 40) return;
    const med = slow.slice().sort((a, b) => a - b)[20]; slow = [];
    if (med > 34) {
      if (pr > 1) { pr = 1; R.setPixelRatio(1); frame(); kick(300); }
      try { localStorage.setItem('atlas-lite', '1'); } catch (e) {}
      slowDone = true;
    } else if (med < 22) slowDone = true;   // fast enough: stop measuring
  }
  function loop(now = performance.now()) {
    if (document.hidden) { rafId = 0; return; }
    rafId = requestAnimationFrame(loop);
    if (!el.offsetParent && !alignFn) return;
    if (blurred) { lastT = now; return; }   // window not focused: no rendering at all (resumes on focus)
    if (now - lastT < FRAME_MS - 2) return;
    const dt = Math.min(250, now - (lastT || now)); lastT = now;
    const ez = r => 1 - Math.pow(1 - r, dt / 16.7);   // per-60fps-frame easing → same speed on slow devices
    if (glide) {
      glide.t += Math.min(dt, 34); const k = Math.min(1, glide.t / glide.dur), e = 1 - Math.pow(1 - k, 3);   // quick out, soft landing; time advances at most 2 frames per frame, so a stall (building the board) never makes it jump
      camK = glide.k0 + (camTo - glide.k0) * e; inset += (insetTo - inset) * ez(.22); frame();   // the framing follows smoothly even if the card changes size meanwhile
      if (k >= 1) { camK = camTo; glide = null; }
    } else camK += (camTo - camK) * ez(.07);
    zoom += (zoomTo - zoom) * ez(.18);
    if (glide) {} else if (Math.abs(insetTo - inset) > .5) { inset += (insetTo - inset) * ez(.07); frame(); }   // same pace as the camera, frame-rate independent
    else if (inset !== insetTo) { inset = insetTo; frame(); }
    if (lampShade) lampShade.visible = mode !== 'play' && camK < .5;   // the ceiling lamp only shows once the camera is back down in the room
    if (!drag) { yaw += vel; vel *= .94; if (Math.abs(vel) < .0004) vel = 0; tilt *= .96; }
    if (!drag && !vel && mode === 'view' && performance.now() - idleT > 2500) yaw += .004;   // gentle turntable when untouched
    if (mode === 'play') {   // in a game the board stays still, squared to the player
      const home = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2; yaw += (home - yaw) * .15; vel = 0;
    }
    root.rotation.y = yaw;
    if (roomTicks.length && !alignFn) { const ts = now / 1000; for (const f of roomTicks) f(ts); }
    if (alignFn) {   // skin mode: a straight top-down camera so the 3D field lands exactly on a DOM rectangle
      // idle (nothing moved for 1 s): only re-measure the DOM board ~10×/s; a resize or kick() wakes it at once
      if (now > kickUntil && !dirty && now - lastDraw > 1000 && (idleTick++ % 6)) return;
      const r = alignFn(); if (r && r.w > 10) {
        const W = cw, H = ch, half = (alignSize || 8.4) / 2, top = alignTop || .43;
        // match the DOM board's CSS transform: perspective(P px) rotateX(tilt) about its centre = a pinhole camera P px in front
        // of the board centre, the field leaning back by `tilt`; the principal point is moved onto the board centre
        // r.shift (world units, optional): a shift lens — the camera stands that far towards the player but still looks straight down,
        // so the field keeps its exact square on the DOM board while the near side of a thick board (and its legs) comes into view
        const unit = r.h / ((alignSize || 8.4)), P = r.persp || r.h * 3, tl = (r.tilt || 0) * Math.PI / 180, D = P / unit, sh = r.shift || 0;
        cam.fov = 2 * Math.atan(H / 2 / P) * 180 / Math.PI; cam.aspect = W / H;
        cam.position.set(0, top + D * Math.cos(tl), D * Math.sin(tl) + sh); cam.up.set(0, Math.sin(tl), -Math.cos(tl)); cam.lookAt(0, top, sh);
        const key = r.x.toFixed(1) + ',' + r.y.toFixed(1) + ',' + r.w.toFixed(1) + ',' + r.h.toFixed(1) + ',' + W + ',' + H;
        if (key === lastKey && now > kickUntil && !dirty) return;
        lastKey = key; if (now > kickUntil) dirty = false;
        cam.setViewOffset(W, H, W / 2 - (r.x + r.w / 2), H / 2 - (r.y + r.h / 2) - sh * unit, W, H); cam.updateProjectionMatrix();
        R.render(scene, cam); lastDraw = now; return;
      }
    }
    const q = camPose(0), r2 = camPose(1), k = camK;
    const py = q[1] + (r2[1] - q[1]) * k, pz = q[2] + (r2[2] - q[2]) * k, d = Math.hypot(py, pz), a = Math.atan2(py, pz) + tilt;
    cam.position.set(0, d * Math.sin(a), d * Math.cos(a));
    // view mode: on phones the board sits above the info card, on wide screens to the right of it
    if (mode === 'view' && !blurred && dt > 0 && dt < 250) watchSpeed(dt);   // the showcase renders every frame: a good place to measure
    { const m0 = cur && cur.children[0], vy = (m0 && m0.userData.viewY) || .4;   // a tall board (legged goban) asks to be framed around its own middle
      const ly = fitTo ? vy + (fitTo.y - vy) * camK : vy; cam.position.y += ly - .4; const rl = fitTo && fitTo.roll ? camK : 0; cam.up.set(-rl, 1 - rl, 0); cam.lookAt(0, ly, 0); }   // fit.roll: the view is turned 90° (a landscape view on a portrait screen held sideways)   // the canvas itself is kept clear of the info card (app.js fitStage)
    R.render(scene, cam);
  }
  // skin mode: fn() → {x,y,w,h} screen rect of the playing field; size/top = field width and height in world units
  function align(fn, size, top) { alignFn = fn; alignSize = size; alignTop = top; mode = 'play'; spin = false; yaw = 0; }
  function project(x, z, y) { const v = new (T().Vector3)(x, y || 0, z); cur.localToWorld(v); v.project(cam); const r = el.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
  // snap the camera to where it is heading (after a game: the showcase view at once, framed above the info card)
  function snap() { camK = camTo; zoom = zoomTo = 1; tilt = 0; vel = 0; inset = insetTo; frame(); kick(300); }
  const _dbg = () => ({ camK, camTo, inset, insetTo, zoom, zoomTo, yaw, tilt, mode, fitTo, aspect: cam && cam.aspect });
  const _scene = () => scene;
  window.Table3D = { mergeStatic, _scene, lite: LITE, coarse: COARSE, texScale, _dbg, snap, fit, kick, align, reveal, planks, felt, setInset, cloth, wasDrag, prepare, canvasTex, wood, woodTop, makeNoise, RB, grid, stone, project, mount, show, play, pick, MODELS, M, mesh, bevelDisc, disc, cellPos, contact, ok: () => !!R, renderer: () => R, floorImage };
})();
