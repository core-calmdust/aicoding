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
  // 'lite' remembered from a slow visit only lasts a day (it used to stick forever, and a busy first second could trip it)
  try { localStorage.removeItem('atlas-lite'); } catch (e) {}
  const LITE = (() => { try { const t = +localStorage.getItem('atlas-lite2') || 0; if (t && Date.now() - t < 864e5) return true; } catch (e) {}
    return COARSE && (navigator.deviceMemory || 8) <= 3; })();   // (core counts are unreliable on iOS: the frame-time check below decides there)
  const texScale = () => (LITE ? .5 : COARSE ? .5 : 1);   // phones never need 2048² procedural textures
  let texNest = 0;   // > 1 while one procedural canvas is drawn inside another (a composite: its sources are drawn at once)
  function canvasTex(key, w, h, draw, rep) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    texNest++; try { draw(c.getContext('2d'), w, h); } finally { texNest--; }
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
  /* the pixel loops of the room's textures, self-contained: on the portal they run in a worker (atlas/texgen.js) */
  function KL(X) {
    const makeNoise = X.makeNoise;
    return {
      // realistic wood: long fibres, growth rings, pores, gentle colour drift
      wood(d, W, H, p) {
        const N = makeNoise(p.seed), A = p.A, B = p.B, ringF = p.ringF;
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
      },
      tatami(d, W, H) {
        const N = makeNoise(9);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const weave = (y % 6 < 3 ? 8 : -6) + (N(x / 3, y / 40, 2) - .5) * 26 + (N(x / 80, y / 80, 2) - .5) * 14, i = (y * W + x) * 4;
          d[i] = 196 + weave; d[i + 1] = 190 + weave; d[i + 2] = 132 + weave * .6; d[i + 3] = 255;
        }
      },
      plaster(d, W) { const N = makeNoise(4); for (let i = 0; i < W * W; i++) { const x = i % W, y = i / W | 0, k = (N(x / 18, y / 18, 3) - .5) * 16; d[i * 4] = 246 + k; d[i * 4 + 1] = 236 + k; d[i * 4 + 2] = 214 + k; d[i * 4 + 3] = 255; } },
    };
  }
  // fill a canvas with one of the loops above (portal: in a worker, the canvas fills a moment later; else right here)
  function paintPx(c, name, p, after) {
    const TG = window.AtlasTexGen;
    if (TG && texNest <= 1) return TG.paint(c, KL, name, p, after);
    const g = c.getContext('2d'), img = g.createImageData(c.width, c.height);
    (KL.L || (KL.L = KL({ makeNoise })))[name](img.data, c.width, c.height, p); g.putImageData(img, 0, 0);
    if (after) after(g, c.width, c.height); return c;
  }
  // draw fn once the source canvases are filled (composites of the textures above)
  const later = (deps, c, fn) => window.AtlasTexGen ? AtlasTexGen.later(deps, c, fn) : (fn(c.getContext('2d'), c.width, c.height), c);
  // realistic wood: long fibres, growth rings, pores, gentle colour drift
  function wood(key, base, dark, w = 512, h = 512, grain = 1) {
    return canvasTex(key, w, h, (g) => { paintPx(g.canvas, 'wood', { seed: key.length * 31 + key.charCodeAt(0), A: hex(base), B: hex(dark), ringF: 9 * grain }); });
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
  const discCache = {};
  function bevelDisc(r, h, mat) {   // rounded checker / stone (one shared geometry per size: a reversi game puts 128 of them on the table)
    const key = r.toFixed(4) + ',' + h.toFixed(4);
    let g = discCache[key];
    if (!g) {
      const pts = [], s = 5;   // (5 steps round the rounded edge, 20 round the disc: small pieces seen from the chabudai distance)
      for (let i = 0; i <= s; i++) { const a = -Math.PI / 2 + Math.PI * i / s; pts.push(new (T().Vector2)(Math.max(.001, r - h / 2 + Math.cos(a) * h / 2), h / 2 + Math.sin(a) * h / 2)); }
      pts.unshift(new (T().Vector2)(0, 0)); pts.push(new (T().Vector2)(0, h));
      g = discCache[key] = new (T().LatheGeometry)(pts, 20); SHARED.add(g);
    }
    return mesh(g, mat);
  }
  /* a real Othello disc: a thin flat cylinder (35 mm × ~5 mm), crisp straight side, a tiny rounded edge on each face,
     white half over black half; centred on its origin (white face up), so it flips round its diameter */
  const RV_R = .42, RV_H = .12, RV_B = .022;
  function rvHalf(up) {
    const key = 'rv' + (up ? 'u' : 'd'); let g = discCache[key];
    if (!g) {
      const TT = T(), r = RV_R, h = RV_H / 2, b = RV_B, s = 3, pts = [];   // (profile bottom → top, as the lathe wants it)
      if (up) { pts.push(new TT.Vector2(r, 0)); for (let i = 0; i <= s; i++) { const a = Math.PI / 2 * i / s; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); } pts.push(new TT.Vector2(.001, h)); }
      else { pts.push(new TT.Vector2(.001, -h)); for (let i = 0; i <= s; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / s; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, -h + b + Math.sin(a) * b)); } pts.push(new TT.Vector2(r, 0)); }
      g = new TT.LatheGeometry(pts, 28);
      const P = g.attributes.position, UV = g.attributes.uv;   // planar UVs from above: the matte grain lies flat on the face
      for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * r) + .5, P.getZ(i) / (2 * r) + .5);
      g.computeVertexNormals(); discCache[key] = g; SHARED.add(g);
    }
    return g;
  }
  function rvMats() {   // matte, slightly grainy (no lacquer, no clear coat): soft diffuse light with a very broad, faint sheen
    const grain = canvasTex('rvGrain', 128, 128, (c, W) => { const N = makeNoise(53), img = c.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const v = 128 + (Math.random() - .5) * 70 + (N(x / 9, y / 9, 2) - .5) * 40, i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      c.putImageData(img, 0, 0); });
    grain.encoding = T().LinearEncoding;
    const W = M({ color: 0xf2efe7, roughness: .78, metalness: 0, envMapIntensity: .55, bumpMap: grain, bumpScale: .0012 }),
      B = M({ color: 0x1b1c1f, roughness: .72, metalness: 0, envMapIntensity: .6, bumpMap: grain, bumpScale: .0012 });
    return { W, B };
  }
  function rvDisc(mats) {   // → Group, white face up (+y), centred; rotate .x by π for black
    const g = new (T().Group)(), w = mesh(rvHalf(true), mats.W), b = mesh(rvHalf(false), mats.B);
    g.add(w, b); return g;
  }
  rvDisc.R = RV_R; rvDisc.H = RV_H;
  function stone(r, mat) { const m = mesh(new (T().SphereGeometry)(r, 32, 16), mat); m.scale.y = .42; return m; }
  // soft contact shadow (ambient occlusion) under a piece, so it sits on the surface instead of floating
  function contact(r, k = .55) {
    const TT = T(), tex = canvasTex('aoDisc', 128, 128, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.75)'); g.addColorStop(.78, 'rgba(0,0,0,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W, W); });
    tex.encoding = TT.LinearEncoding;
    const gk = 'ao' + r.toFixed(4); let pg = discCache[gk]; if (!pg) { pg = discCache[gk] = new TT.PlaneGeometry(r * 2.5, r * 2.5); SHARED.add(pg); }   // one plane per size (shared: many pieces)
    const m = new TT.Mesh(pg, new TT.MeshBasicMaterial({ map: tex, transparent: true, opacity: k, depthWrite: false, color: 0x000000 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 1; m.userData.contact = true; return m;
  }
  const cellPos = (n, size, i) => -size / 2 + size / n * (i + .5);

  /* ---------- board builders ---------- */
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
      const RM = rvMats();
      for (const k in pos) {
        const i = +k, x = cellPos(8, S, i % 8), z = cellPos(8, S, i / 8 | 0);
        const d = rvDisc(RM); if (!pos[k]) d.rotation.x = Math.PI;
        d.position.set(x, .425 + RV_H / 2, z); g.add(d);   // resting on the felt
        const sh = contact(RV_R); sh.position.set(x, .424, z); g.add(sh);
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
    xiangqi(live) {   // Xiangqi: a boxwood board on low legs (lines, palaces, the river 楚河 漢界), thick discs with engraved characters
      const TT = T(), g = new TT.Group(), u = .9, W = 8 * u + 1.5, D = 9 * u + 1.5, H = .55;
      const tw = 1024, th = Math.round(1024 * D / W);
      const top = M({ map: canvasTex('xqTop', tw, th, (c, Wd, Ht) => {
        c.drawImage(wood('xqw', '#e9c27c', '#b98a45', 512, 512, .7).image, 0, 0, Wd, Ht);
        const k = Wd / W, ox = .75 * k, oy = .75 * k, s = u * k, X = i => ox + i * s, Y = j => oy + j * s;
        c.strokeStyle = '#3d220c'; c.lineCap = 'square';
        c.lineWidth = k * .06; c.strokeRect(X(0) - k * .14, Y(0) - k * .14, 8 * s + k * .28, 9 * s + k * .28);
        c.lineWidth = k * .022;
        const L = (a, b, e, f) => { c.beginPath(); c.moveTo(a, b); c.lineTo(e, f); c.stroke(); };
        for (let j = 0; j < 10; j++) L(X(0), Y(j), X(8), Y(j));
        for (let i = 0; i < 9; i++) { if (i === 0 || i === 8) L(X(i), Y(0), X(i), Y(9)); else { L(X(i), Y(0), X(i), Y(4)); L(X(i), Y(5), X(i), Y(9)); } }
        L(X(3), Y(0), X(5), Y(2)); L(X(5), Y(0), X(3), Y(2)); L(X(3), Y(7), X(5), Y(9)); L(X(5), Y(7), X(3), Y(9));
        const mk = (i, j) => { const a = s * .08, b = s * .22; for (const dx of [-1, 1]) { if ((dx < 0 && i === 0) || (dx > 0 && i === 8)) continue; for (const dy of [-1, 1]) { c.beginPath(); c.moveTo(X(i) + dx * a, Y(j) + dy * b); c.lineTo(X(i) + dx * a, Y(j) + dy * a); c.lineTo(X(i) + dx * b, Y(j) + dy * a); c.stroke(); } } };
        [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]].forEach(([i, j]) => mk(i, j));
        c.fillStyle = 'rgba(70,35,10,.82)'; c.font = `800 ${Math.round(s * .55)}px "Shippori Mincho B1","Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('楚 河', X(2), Y(4.5)); c.fillText('漢 界', X(6), Y(4.5));
      }), roughness: .42, bumpScale: .004 });
      const side = M({ map: wood('xqs', '#c48f4c', '#7a4a1e'), roughness: .5 });
      g.add(slab(W, H, D, top, side));
      for (const [x, z] of [[-W / 2 + .7, -D / 2 + .7], [W / 2 - .7, -D / 2 + .7], [-W / 2 + .7, D / 2 - .7], [W / 2 - .7, D / 2 - .7]]) g.add(mesh(new TT.CylinderGeometry(.42, .34, .35, 20), M({ map: wood('xql', '#8a5626', '#4a2a10'), roughness: .5 }), x, -.17, z));
      const Y0 = H + .001;
      g.userData.top = Y0; g.userData.u = u; g.userData.W = W; g.userData.D = D;
      g.userData.pt = (i, j) => [(i - 4) * u, (j - 4.5) * u];   // i: file 0..8 left → right, j: rank 0..9 far → near
      // a piece: a thick disc (rounded edge) with the character engraved on the top face. code: 1 帥 … 7 兵 (+8 black)
      const PR = u * .44, PH = u * .22, TYPE = ' KAEHRCP';
      const GL = { r: ' 帥仕相傌俥炮兵', b: ' 將士象馬車砲卒' };
      g.userData.piece = (code, o = {}) => {
        const black = code >= 8, tp = code & 7, ch = GL[black ? 'b' : 'r'][tp];
        const face = canvasTex('xqf' + code + (o.west ? 'w' : ''), 256, 256, (c, Wd) => {
          const r = Wd / 2; c.fillStyle = '#f3d7a0'; c.fillRect(0, 0, Wd, Wd);
          const gr = c.createRadialGradient(r * .8, r * .7, r * .1, r, r, r); gr.addColorStop(0, '#fbe8c2'); gr.addColorStop(1, '#e1b878'); c.fillStyle = gr; c.beginPath(); c.arc(r, r, r, 0, 7); c.fill();
          c.strokeStyle = black ? 'rgba(30,24,20,.75)' : 'rgba(170,30,22,.8)'; c.lineWidth = Wd * .025; c.beginPath(); c.arc(r, r, r * .82, 0, 7); c.stroke();
          c.fillStyle = black ? '#1e1a17' : '#b31f18'; c.font = `900 ${Math.round(Wd * .52)}px "Shippori Mincho B1","Noto Serif SC","Noto Serif CJK SC","Noto Serif CJK JP","Songti SC",serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(ch, r, r + Wd * .02);
        });
        const pts = [], e = PH * .3, seg = 3; pts.push(new TT.Vector2(0, 0));
        for (let k = 0; k <= seg; k++) { const a = -Math.PI / 2 + Math.PI / 2 * k / seg; pts.push(new TT.Vector2(PR - e + Math.cos(a) * e, e + Math.sin(a) * e)); }
        for (let k = 0; k <= seg; k++) { const a = Math.PI / 2 * k / seg; pts.push(new TT.Vector2(PR - e + Math.cos(a) * e, PH - e + Math.sin(a) * e)); }
        pts.push(new TT.Vector2(0, PH));
        const body = mesh(new TT.LatheGeometry(pts, 18), M({ map: wood('xqp', '#e7c287', '#b8874a', 256, 256, 1.6), roughness: .45, clearcoat: .3, clearcoatRoughness: .5 }));
        const capM = M({ map: face, roughness: .5, bumpScale: .003 }); capM.polygonOffset = true; capM.polygonOffsetFactor = -2; capM.polygonOffsetUnits = -6;   // (in front of the piece's top: no flicker from afar)
        const cap = new TT.Mesh(new TT.CircleGeometry(PR * .9, 18), capM);
        cap.rotation.x = -Math.PI / 2; cap.position.y = PH + .002; cap.castShadow = false; cap.receiveShadow = true;
        const p = new TT.Group(); p.add(body, cap); p.userData = { code, type: TYPE[tp], black, h: PH, r: PR };
        return p;
      };
      if (live) return g;
      // the start position (a central cannon already played)
      const start = ['rnbakabnr', '.........', '.c.....c.', 'p.p.p.p.p', '.........', '.........', 'P.P.P.P.P', '.C..C....', '.........', 'RNBAKABNR'];
      start.forEach((row, j) => [...row].forEach((chx, i) => {
        if (chx === '.') return; const blk = chx === chx.toLowerCase(), t = ' kabnrcp'.indexOf(chx.toLowerCase());
        const p = g.userData.piece(t | (blk ? 8 : 0)), [x, z] = g.userData.pt(i, j); p.position.set(x, Y0, z); g.add(p);
        const sh = contact(PR, .45); sh.position.set(x, Y0 + .001, z); g.add(sh);
      }));
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
      // a pink ballpoint pen: cap with a metal clip, barrel, white grip, tapered tip with a metal point (built along +Y, then laid down)
      const pen = new (T().Group)(), PT = T(), pk = M({ color: 0xff8fc7, roughness: .35, clearcoat: .6 }), pk2 = M({ color: 0xff5fae, roughness: .3, clearcoat: .6 }), wt = M({ color: 0xfff6fa, roughness: .5 }), mt = M({ color: 0xd9dde4, metalness: .85, roughness: .25 });
      const part = (geo, mat, y) => { const m = mesh(geo, mat); m.position.y = y; pen.add(m); return m; };
      part(new PT.CylinderGeometry(.13, .13, 2.9, 14), pk, .35);                       // barrel
      part(new PT.CylinderGeometry(.155, .155, 1.25, 14), pk2, 2.05);                  // cap
      part(new PT.SphereGeometry(.155, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), pk2, 2.675);   // rounded cap end
      part(new PT.BoxGeometry(.05, 1.0, .09), mt, 1.95).position.z = .17;              // clip
      part(new PT.CylinderGeometry(.14, .14, .7, 14), wt, -1.45);                      // grip
      part(new PT.CylinderGeometry(.14, .045, .5, 14), pk, -2.05);                      // tapered tip
      part(new PT.ConeGeometry(.045, .14, 8), mt, -2.37).rotation.x = Math.PI;          // metal point
      pen.traverse(o => { if (o.isMesh) o.castShadow = true; });
      pen.rotation.z = Math.PI / 2; pen.rotation.y = .6; pen.position.set(3.6, .25, 3.4); g.add(pen);
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
        const t = mesh(RB(cs - .2, h, cs - .2, .16, 1), [side, side, M({ map: face(n || '', bg), roughness: .4, clearcoat: .3 }), side, side, side], x, .82 + h / 2, z); g.add(t);
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
        g.add(mesh(RB(cs - .14, H, cs - .14, .14, 1), mats[+B[i]], x, .72 + H / 2, z));
      }
      // the popped group flies up, tumbling
      [[2, 0, 1.9, .5], [3, 0, 2.8, -.6], [3, 1, 2.2, .9]].forEach(([cx, cz, y, r], k) => {
        const [x, z] = pos(cx, cz), b = mesh(RB(cs - .14, H, cs - .14, .14, 1), mats[2], x + (k - 1) * .35, y, z - .3);
        b.scale.setScalar(.85 - k * .08); b.rotation.set(r, r * .7, -r * .5); g.add(b);
      });
      // POP! sparkle: a few cream confetti dots around the flying blocks
      [[-.6, 3.4, -2.6], [.9, 3.6, -3.0], [1.3, 2.6, -1.6], [-.9, 2.5, -1.5]].forEach(([x, y, z]) => g.add(mesh(new TT.SphereGeometry(.13, 8, 6), M({ color: 0xe8b83a, roughness: .4 }), x, y, z)));
      return g;
    },
    // Hnefatafl: an oak board with a carved grid, knotwork corners and throne, a rune-carved frame;
    // dark walnut attackers, bone defenders, a crowned king. o.n = 11 | 9 | 7 (same outer size, larger cells).
    // o.edge: escape at any edge (Tablut, Tawlbwrdd) → no corner knots; o.home: the attackers' start squares (y·n + x) when
    // they differ from the usual ones for n (Tawlbwrdd); o.key names the rule set for the texture cache
    // live → userData { top, S, n, cs, cell(f, r) → [x, z] (f: column left→right, r: row top→bottom), piece(k: 1 att | 2 def | 3 king) → Group }
    tafl(live, o = {}) {
      const TT = T(), g = new TT.Group(), n = o.n || 11, S = 8.6, cs = S / n, mid = n >> 1;
      const knot = (c, x, y, r, col) => {   // a carved sun-cross knot
        c.strokeStyle = col; c.lineWidth = r * .16; c.lineCap = 'round';
        c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
        c.beginPath(); c.arc(x, y, r * .42, 0, 7); c.stroke();
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .42, y + Math.sin(a) * r * .42); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); c.stroke(); }
      };
      const tw = wood('tfw', '#c39762', '#7a5230', 512, 512, 1.3).image;
      const top = M({ map: canvasTex('tf' + n + (o.key ? '-' + o.key : ''), 1024, 1024, (c0) => { later([tw], c0.canvas, (c, W) => {
        c.drawImage(tw, 0, 0, W, W);
        const s = W / n, home = new Set();
        if (o.home) o.home.forEach(i => home.add(i));
        else if (n === 11) [[0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [1, 5]].forEach(([a, b]) => [[a, b], [b, a], [n - 1 - a, b], [b, n - 1 - a]].forEach(([x, y]) => home.add(y * n + x)));
        else for (let k = 0; k < n; k++) if ((k >= mid - (n === 9 ? 1 : 0) && k <= mid + (n === 9 ? 1 : 0)) || k === mid) [[k, 0], [0, k], [k, n - 1], [n - 1, k]].forEach(([x, y]) => home.add(y * n + x));
        home.forEach(i => { c.fillStyle = 'rgba(70,38,16,.16)'; c.fillRect((i % n) * s, (i / n | 0) * s, s, s); });
        (o.edge ? [[mid, mid]] : [[0, 0], [n - 1, 0], [0, n - 1], [n - 1, n - 1], [mid, mid]]).forEach(([x, y]) => {
          c.fillStyle = 'rgba(60,30,10,.5)'; c.fillRect(x * s + 4, y * s + 4, s - 8, s - 8);
          knot(c, x * s + s / 2, y * s + s / 2, s * .3, 'rgba(236,206,150,.85)');
        });
        c.strokeStyle = 'rgba(42,22,8,.9)'; c.lineWidth = n > 9 ? 4 : 5;
        for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * s, 0); c.lineTo(i * s, W); c.stroke(); c.beginPath(); c.moveTo(0, i * s); c.lineTo(W, i * s); c.stroke(); }
      }); }), roughness: .52, bumpScale: .01 });
      const FW = S + 1.1, runes = 'ᚺᚾᛖᚠᛏᚨᚠᛚ ᚲᛁᚾᚷ ';
      const fw = wood('tfrw', '#5a3a22', '#2a180c', 512, 512, 1.1).image;
      const frameTop = M({ map: canvasTex('tfr', 1024, 1024, (c0) => { later([fw], c0.canvas, (c, W) => {
        c.drawImage(fw, 0, 0, W, W);
        const b = W * .55 / FW / 2, m = W * .5 / FW / 2;   // the band's half-width and centre offset from the edge
        c.fillStyle = 'rgba(232,196,128,.78)'; c.font = `700 ${Math.round(b * .95)}px serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        for (let side = 0; side < 4; side++) {
          c.save(); c.translate(W / 2, W / 2); c.rotate(side * Math.PI / 2); c.translate(-W / 2, -W / 2);
          const k = 22; for (let i = 0; i < k; i++) c.fillText(runes[i % runes.length], W * (i + 1.5) / (k + 2), m + 2);
          c.restore();
        }
        c.strokeStyle = 'rgba(232,196,128,.45)'; c.lineWidth = 3; c.strokeRect(4, 4, W - 8, W - 8); c.strokeRect(2 * m - 4, 2 * m - 4, W - 4 * m + 8, W - 4 * m + 8);
      }); }), roughness: .45, bumpScale: .008 });
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
        return new TT.LatheGeometry(pts.map(([a, b]) => new TT.Vector2(Math.max(.001, a), b)), 16); };
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
    // Solitaire (Klondike): a green baize mat with a deal in progress — stock, waste, four foundations, seven fanned columns
    solitaire() {
      const TT = T(), g = new TT.Group(), W = 9.4, D = 7.4, cw = 1.04, cd = 1.46, ch = .035, gx = 1.3;
      const felt = canvasTex('solFelt', 512, 512, (c, w) => { const gr = c.createRadialGradient(w / 2, w / 2, 40, w / 2, w / 2, w * .75); gr.addColorStop(0, '#2b7a51'); gr.addColorStop(1, '#14462d'); c.fillStyle = gr; c.fillRect(0, 0, w, w); for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '0,0,0'},.045)`; c.fillRect(Math.random() * w, Math.random() * w, 1.5, 1.5); } });
      g.add(mesh(RB(W + .5, .5, D + .5, .25, 3), M({ map: wood('solRim', '#6a3f22', '#3a2010'), roughness: .45, clearcoat: .4 }), 0, .25, 0));
      g.add(slab(W, .08, D, M({ map: felt, roughness: .95, bump: false }), M({ color: 0x1d5a3a })).translateY(.5));
      const SUIT = ['♠', '♥', '♦', '♣'], RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const face = (r, s) => canvasTex('solC' + r + s, 160, 224, (c, w, h) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); const red = s === 1 || s === 2; c.fillStyle = red ? '#c0232e' : '#1f1f26';
        c.font = 'bold 44px Georgia, serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(RK[r - 1], 12, 10); c.font = '34px serif'; c.fillText(SUIT[s], 14, 56);
        if (r > 10) { c.strokeStyle = '#a8873f'; c.lineWidth = 4; c.strokeRect(40, 36, 80, 152); c.font = 'italic bold 70px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(RK[r - 1], 80, 112); }
        else { c.font = '96px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(SUIT[s], 84, 128); }
      });
      const back = canvasTex('solBack', 160, 224, (c, w, h) => { c.fillStyle = '#9b1c2b'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 3; for (let i = -h; i < w + h; i += 14) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + h, h); c.stroke(); c.beginPath(); c.moveTo(i + h, 0); c.lineTo(i, h); c.stroke(); } c.strokeStyle = '#fbf3e2'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20); });
      const edge = M({ color: 0xf2ead8, roughness: .6 }), mb = M({ map: back, roughness: .5, bump: false });
      const card = (r, s, up, x, z, y) => { const top = up ? M({ map: face(r, s), roughness: .45, bump: false }) : mb; const m = mesh(RB(cw, ch, cd, .012, 1), [edge, edge, top, mb, edge, edge], x, y, z); g.add(m); return m; };
      const X0 = -3 * gx, Z0 = -D / 2 + .25 + cd / 2, Y = .56;
      for (let k = 0; k < 6; k++) card(1, 0, false, X0, Z0, Y + k * ch);                  // stock
      card(7, 1, true, X0 + gx, Z0, Y); card(4, 3, true, X0 + gx + .22, Z0, Y + ch); card(9, 2, true, X0 + gx + .44, Z0, Y + 2 * ch);   // waste (draw 3)
      [[2, 0], [1, 1], [3, 2], [0, 3]].forEach(([n, s], i) => { for (let k = 1; k <= n; k++) card(k, s, true, X0 + (3 + i) * gx, Z0, Y + k * ch); });   // foundations
      const COLS = [[[13, 3]], [[12, 1], [11, 0]], [[10, 2]], [[13, 1], [12, 3], [11, 2]], [[8, 0], [7, 1]], [[5, 3]], [[13, 0], [12, 2], [11, 3], [10, 1]]];
      COLS.forEach((up, i) => {
        let z = Z0 + cd + .35, y = Y;
        for (let k = 0; k < i; k++) { card(1, 0, false, X0 + i * gx, z, y); z += .14; y += ch; }
        up.forEach(([r, s]) => { card(r, s, true, X0 + i * gx, z, y); z += .38; y += ch; });
      });
      // one card lifted in mid-move
      const fly = card(6, 1, true, X0 + 5.5 * gx, Z0 + cd + 1.6, 1.7); fly.rotation.set(-.35, .2, .12);
      return g;
    },
    jailbreak() {   // a steel-framed 6×6 cell: concrete floor, crates and lockers, the orange inmate sliding out through the gap, a gold key
      const TT = T(), g = new TT.Group(), N = 6, cs = 1.15, S = N * cs;
      const steel = M({ color: 0x3a3f4a, roughness: .35, metalness: .5 }), steel2 = M({ color: 0x5d6575, roughness: .3, metalness: .6 });
      g.add(mesh(RB(S + 1.2, .55, S + 1.2, .25, 3), steel, 0, .275, 0));
      const floor = M({ map: canvasTex('jbFloor', 256, 256, (c, W) => { c.fillStyle = '#d8d2c4'; c.fillRect(0, 0, W, W); c.strokeStyle = '#bfb7a6'; c.lineWidth = 6; for (let i = 0; i <= N; i++) { const k = i * W / N; c.beginPath(); c.moveTo(k, 0); c.lineTo(k, W); c.stroke(); c.beginPath(); c.moveTo(0, k); c.lineTo(W, k); c.stroke(); } }), roughness: .8 });
      g.add(mesh(new TT.BoxGeometry(S, .06, S), floor, 0, .58, 0));
      const pos = (x, z) => [(x - (N - 1) / 2) * cs, (z - (N - 1) / 2) * cs];
      // walls on 3 sides + the right side with an exit gap in row 2
      const wallM = M({ color: 0x555c6a, roughness: .4, metalness: .4 });
      g.add(mesh(RB(S + 1.2, .9, .5, .12, 2), wallM, 0, 1.0, -S / 2 - .35));
      g.add(mesh(RB(S + 1.2, .9, .5, .12, 2), wallM, 0, 1.0, S / 2 + .35));
      g.add(mesh(RB(.5, .9, S + .2, .12, 2), wallM, -S / 2 - .35, 1.0, 0));
      const [, gz] = pos(0, 2);
      g.add(mesh(RB(.5, .9, (gz + S / 2) - cs / 2 + .1, .12, 2), wallM, S / 2 + .35, 1.0, (-S / 2 + gz - cs / 2) / 2));
      g.add(mesh(RB(.5, .9, S / 2 - gz - cs / 2 + .1, .12, 2), wallM, S / 2 + .35, 1.0, (S / 2 + gz + cs / 2) / 2));
      // EXIT sign
      const sign = M({ map: canvasTex('jbExit', 256, 128, (c, W, H) => { c.fillStyle = '#1fa463'; c.fillRect(0, 0, W, H); c.fillStyle = '#fff'; c.font = '900 72px Jost, Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', W / 2, H / 2 + 4); }), roughness: .4, emissive: 0x0c5a32 });
      const sg = mesh(new TT.BoxGeometry(1.5, .7, .12), [steel, steel, steel, steel, sign, steel], S / 2 + .5, 2.15, gz); sg.rotation.y = -Math.PI / 2; g.add(sg);
      g.add(mesh(new TT.CylinderGeometry(.06, .06, .9, 10), steel2, S / 2 + .5, 1.55, gz));
      // blocks: [x, z, len, vertical, colour]
      const COL = [0x7a8fa6, 0xa0784f, 0x6f8b5e, 0x8c7aa0, 0x5f8e94, 0xa86a5a];
      [[2, 0, 2, 1, 0], [3, 1, 3, 1, 1], [0, 3, 2, 0, 2], [4, 3, 2, 1, 3], [1, 4, 3, 0, 4], [5, 0, 2, 1, 5], [0, 0, 2, 0, 1]].forEach(([x, z, l, v, k]) => {
        const [px, pz] = pos(x + (v ? 0 : (l - 1) / 2), z + (v ? (l - 1) / 2 : 0));
        g.add(mesh(RB((v ? 1 : l) * cs - .14, .7, (v ? l : 1) * cs - .14, .14, 2), M({ color: COL[k], roughness: .45, clearcoat: .3 }), px, .96, pz));
      });
      // the inmate: an orange two-cell block with a round face, half out of the gap
      const inm = new TT.Group(), orange = M({ color: 0xf26b1d, roughness: .4, clearcoat: .4 });
      inm.add(mesh(RB(2 * cs - .14, .78, cs - .14, .24, 3), orange, 0, 0, 0));
      [-.55, -.15, .25].forEach(dx => inm.add(mesh(new TT.BoxGeometry(.12, .8, cs - .1), M({ color: 0xffb27a, roughness: .5 }), dx, .01, 0)));
      const face = mesh(new TT.SphereGeometry(.42, 24, 16), M({ color: 0xfbe6cf, roughness: .5 }), .62, .55, 0); face.scale.y = .9; inm.add(face);
      [-.15, .15].forEach(dz => inm.add(mesh(new TT.SphereGeometry(.06, 10, 8), M({ color: 0x2a2622 }), .98, .62, dz)));
      const [ix] = pos(4.5, 2); inm.position.set(ix + .6, 1.0, gz); g.add(inm);
      // gold key + keyhole
      const gold = M({ color: 0xffcd3c, roughness: .25, metalness: .7 });
      const key = new TT.Group(); key.add(mesh(new TT.TorusGeometry(.26, .09, 10, 24), gold)); const sh = mesh(new TT.BoxGeometry(.62, .12, .12), gold, .5, 0, 0); key.add(sh); key.add(mesh(new TT.BoxGeometry(.1, .22, .12), gold, .72, -.12, 0));
      const [kx, kz] = pos(1, 1); key.position.set(kx, 1.05, kz); key.rotation.set(-Math.PI / 2, 0, .5); g.add(key);
      // bars on the back wall
      for (let i = 0; i < 7; i++) g.add(mesh(new TT.CylinderGeometry(.07, .07, 1.5, 10), steel2, -S / 2 + .6 + i * .5, 1.9, -S / 2 - .35));
      g.add(mesh(new TT.BoxGeometry(3.6, .12, .16), steel2, -S / 2 + 2.1, 2.62, -S / 2 - .35));
      return g;
    },
  };


  /* ---------- museum gallery (ヒストリア): a second room the scene swaps to while Historia is open ----------
     built lazily on the first call and cached; the board on the table becomes the exhibit on a plinth.
     museum(on, {title, sub}) swaps at once (Historia fades the canvas through dark around it). */
  const PAINT_GLOW = .1;
  let museumObjs = null, museumOn = false, roomExp = 0, placard = null, museumSpot = null, glareW = -1;
  function buildMuseum() {
    const TT = T(), g = new TT.Group(), FLOOR = -3.4, before = new Set(scene.children); rbCap = 1;
    const SZm = v => Math.round(v * texScale());
    // herringbone parquet: oak blocks (each with its own tone and a run of grain), a dark joint between them
    const floorT = canvasTex('musParq', SZm(1024), SZm(1024), (c, W, H) => {
      const N = makeNoise(31), bw = W / 8, bl = bw * 4;
      c.fillStyle = '#2a170b'; c.fillRect(0, 0, W, H);
      for (let row = -2; row < 12; row++) for (let k = -2; k < 10; k++) for (let side = 0; side < 2; side++) {
        const x0 = k * bw * 2 + (side ? bw : 0), y0 = row * bw * 2 + k * bw * 0 + (side ? 0 : bw);
        c.save(); c.translate(x0 + (row % 2) * 0, y0); c.rotate(side ? Math.PI / 4 : -Math.PI / 4);
        const t = N(k * 3.1 + side * 7, row * 2.3, 1), r = 122 + t * 46 | 0, gg = 78 + t * 30 | 0, b = 42 + t * 16 | 0;
        const gr = c.createLinearGradient(0, 0, bl, 0); gr.addColorStop(0, `rgb(${r},${gg},${b})`); gr.addColorStop(.5, `rgb(${r - 14},${gg - 10},${b - 6})`); gr.addColorStop(1, `rgb(${r + 6},${gg + 4},${b + 2})`);
        c.fillStyle = gr; c.fillRect(1.5, 1.5, bl / 1.42 - 3, bw / 1.42 - 3);
        c.globalAlpha = .18; c.strokeStyle = '#3a200e'; c.lineWidth = 1;
        for (let i = 0; i < 7; i++) { const yy = 3 + i * (bw / 1.42 - 6) / 6; c.beginPath(); c.moveTo(2, yy); c.bezierCurveTo(bl * .25, yy + (N(i, k, 1) - .5) * 6, bl * .45, yy - 3, bl / 1.42 - 2, yy + (N(k, i, 1) - .5) * 5); c.stroke(); }
        c.globalAlpha = 1; c.restore();
      }
    });
    floorT.wrapS = floorT.wrapT = TT.RepeatWrapping; floorT.repeat.set(6, 6); floorT.anisotropy = 8;
    const floor = new TT.Mesh(new TT.PlaneGeometry(60, 60), M({ map: floorT, roughness: .32, clearcoat: .5, clearcoatRoughness: .3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; g.add(floor);
    const plaster = canvasTex('plaster', 512, 512, (c) => paintPx(c.canvas, 'plaster'));
    // silk damask above the wainscot: deep claret with a tone-on-tone medallion repeat
    const damask = canvasTex('musDamask', SZm(512), SZm(512), (c, W, H) => {
      c.fillStyle = '#7a2f2a'; c.fillRect(0, 0, W, H);
      { const N = makeNoise(4), img = c.getImageData(0, 0, W, H), d = img.data; for (let i = 0; i < W * H; i++) { const k = (N((i % W) / 14, (i / W | 0) / 14, 3) - .5) * 18 + (N((i % W) / 1.2, (i / W | 0) / 40, 1) - .5) * 8; d[i * 4] += k; d[i * 4 + 1] += k * .6; d[i * 4 + 2] += k * .6; } c.putImageData(img, 0, 0); }
      const motif = (cx, cy, s) => { c.save(); c.translate(cx, cy); c.scale(s, s);
        c.beginPath(); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.moveTo(0, 0); c.bezierCurveTo(30, -18, 46, -60, 0, -92); c.bezierCurveTo(-46, -60, -30, -18, 0, 0); }
        c.moveTo(0, -120); c.bezierCurveTo(18, -104, 18, -96, 0, -84); c.bezierCurveTo(-18, -96, -18, -104, 0, -120);
        c.moveTo(0, 120); c.bezierCurveTo(18, 104, 18, 96, 0, 84); c.bezierCurveTo(-18, 96, -18, 104, 0, 120); c.fill(); c.restore(); };
      c.fillStyle = 'rgba(40,8,8,.28)'; motif(W / 2, H / 2, W / 512); [[0, 0], [W, 0], [0, H], [W, H]].forEach(([x, y]) => motif(x, y, W / 512));
      c.fillStyle = 'rgba(232,180,120,.07)'; motif(W / 2 + 2, H / 2 - 2, W / 512 * .96);
    });
    damask.wrapS = damask.wrapT = TT.RepeatWrapping; damask.repeat.set(6, 3);
    const wallM = M({ map: damask, roughness: .82, sheen: new TT.Color(0x5a1c18) }), dark = M({ map: wood('musWain', '#5a3418', '#2e1808', 512, 512, 1.4), roughness: .45 });
    const gold = M({ color: 0xd9ad5b, roughness: .32, metalness: .85 }), marble = M({ color: 0xefe8db, roughness: .22, clearcoat: .6, clearcoatRoughness: .2 });
    const wall = (w, x, z, ry) => {
      const wg = new TT.Group(); wg.position.set(x, FLOOR, z); wg.rotation.y = ry; g.add(wg);
      const p = new TT.Mesh(new TT.PlaneGeometry(w, 22), wallM); p.position.y = 11; p.receiveShadow = true; wg.add(p);
      wg.add(mesh(RB(w, 3.6, .35), dark, 0, 1.8, .17)); wg.add(mesh(RB(w, .22, .5), gold, 0, 3.7, .22)); wg.add(mesh(RB(w, .6, .6), dark, 0, 14.6, .25));
      return wg;
    };
    const back = wall(44, 0, -17, 0), left = wall(44, -20, 0, Math.PI / 2), right = wall(44, 20, 0, -Math.PI / 2);
    // an arched doorway on the back wall, flanked by two columns
    const arch = new TT.Mesh(new TT.TorusGeometry(3.7, .35, 8, 28, Math.PI), marble); arch.position.set(0, 9.5, .3); back.add(arch);
    [-3.7, 3.7].forEach(x => back.add(mesh(RB(.7, 9.5, .7), marble, x, 4.75, .3)));
    const col = (x, z) => { const c = new TT.Group(); c.position.set(x, FLOOR, z); g.add(c);
      c.add(mesh(new TT.CylinderGeometry(.85, .85, 12.4, 18), marble, 0, 6.6, 0)); c.add(mesh(RB(2.2, .5, 2.2), marble, 0, .25, 0)); c.add(mesh(RB(2.2, .55, 2.2), marble, 0, 13.1, 0)); };
    col(-7.5, -15.6); col(7.5, -15.6);
    // framed paintings: the series' own game illustrations
    const loader = new TT.TextureLoader(), pic = (wg, id, x, y, w, h) => {
      wg.add(mesh(RB(w + .9, h + .9, .3), gold, x, y, .2));
      wg.add(mesh(new TT.PlaneGeometry(w, h), M({ color: 0xf3e9d2, roughness: .9, emissive: 0x7a6040 }), x, y, .37));
      const t = loader.load('../images/atlas/' + id + '.webp'); t.encoding = TT.sRGBEncoding;
      wg.add(mesh(new TT.PlaneGeometry(w * .86, h * .86), new TT.MeshStandardMaterial({ map: t, transparent: true, roughness: .8, emissive: 0xffe2b8, emissiveMap: t, emissiveIntensity: PAINT_GLOW }), x, y, .39));   // (the glow stands in for the picture lamps)
    };
    pic(back, 'chess', -13, 8.6, 5.5, 5.5); pic(back, 'go', 13, 8.6, 5.5, 5.5);
    pic(left, 'backgammon', 6, 8.6, 5, 5); pic(left, 'mancala', -6, 8.6, 5, 5); pic(right, 'xiangqi', -6, 8.6, 5, 5); pic(right, 'morris', 6, 8.6, 5, 5);
    // the plinth (its top is y = 0, where the board stands) with a placard on its front
    g.add(mesh(RB(16.4, .5, 16.4), dark, 0, FLOOR + .25, 0));
    const body = mesh(RB(15.4, -FLOOR - .9, 15.4), marble, 0, (FLOOR + .5 - .4) / 2, 0); body.castShadow = body.receiveShadow = true; g.add(body);
    const topS = mesh(RB(16.2, .4, 16.2), marble, 0, -.2, 0); topS.receiveShadow = true; g.add(topS);
    const pc = document.createElement('canvas'); pc.width = 640; pc.height = 200; placard = new TT.CanvasTexture(pc); placard.encoding = TT.sRGBEncoding; placard.anisotropy = 4;
    g.add(mesh(new TT.PlaneGeometry(6.4, 2), M({ map: placard, roughness: .5, metalness: .2 }), 0, -1.7, 7.72));
    // brass stanchions with velvet ropes (front and sides)
    const brass = M({ color: 0xc9a25a, roughness: .3, metalness: .9 }), velvet = M({ color: 0x8e1b2a, roughness: .7, sheen: new TT.Color(0x551018) });
    const posts = [[-11, 11], [11, 11], [11, -9], [-11, -9]];
    posts.forEach(([x, z]) => { g.add(mesh(new TT.CylinderGeometry(.16, .16, 3.4, 10), brass, x, FLOOR + 1.7, z)); g.add(mesh(new TT.SphereGeometry(.3, 12, 8), brass, x, FLOOR + 3.5, z)); g.add(mesh(new TT.CylinderGeometry(.7, .8, .2, 16), brass, x, FLOOR + .1, z)); });
    [[0, 1], [1, 2], [3, 0]].forEach(([a, b]) => { const A = posts[a], B = posts[b], y = FLOOR + 3.2;
      const cv = new TT.QuadraticBezierCurve3(new TT.Vector3(A[0], y, A[1]), new TT.Vector3((A[0] + B[0]) / 2, y - 1.1, (A[1] + B[1]) / 2), new TT.Vector3(B[0], y, B[1]));
      g.add(new TT.Mesh(new TT.TubeGeometry(cv, 20, .1, 6), velvet)); });
    // two display cases in the back corners
    const glass = new TT.MeshStandardMaterial({ color: 0xdfeef0, roughness: .08, metalness: 0, transparent: true, opacity: .16, depthWrite: false });
    [[-15, -11], [15, -11]].forEach(([x, z], i) => { g.add(mesh(RB(3.4, 4.2, 3.4), dark, x, FLOOR + 2.1, z)); g.add(mesh(RB(3.2, 2.8, 3.2), glass, x, FLOOR + 5.6, z));
      g.add(mesh(i ? new TT.IcosahedronGeometry(.7, 0) : new TT.TorusKnotGeometry(.45, .15, 48, 8), gold, x, FLOOR + 5.2, z)); });
    const preDeco = new Set(); g.traverse(o => { if (o.isMesh) preDeco.add(o); });
    /* ---------- the hall's finer dressing (2026-11: a grander gallery, ~the toy room's polygon budget) ---------- */
    const lamp = M({ color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 1.6, roughness: .4 });
    const velvetSeat = M({ color: 0x5c1420, roughness: .75, sheen: new TT.Color(0x7a2230) });
    // a carpet under the exhibit: claret field, gold and indigo border bands
    const rugT = canvasTex('musRug', SZm(1024), SZm(1024), (c, W) => {
      c.fillStyle = '#5e1219'; c.fillRect(0, 0, W, W);
      const band = (o, w, col) => { c.strokeStyle = col; c.lineWidth = w; c.strokeRect(o, o, W - 2 * o, W - 2 * o); };
      band(W * .03, W * .03, '#b4893e'); band(W * .075, W * .045, '#1f2a4e'); band(W * .11, W * .01, '#c99a4a'); band(W * .135, W * .006, '#c99a4a');
      c.fillStyle = 'rgba(201,154,74,.9)'; for (let i = 0; i < 40; i++) { const t = (i + .5) / 40 * (W - W * .2) + W * .1; [[t, W * .075], [t, W - W * .075], [W * .075, t], [W - W * .075, t]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, y - W * .012); c.lineTo(x + W * .012, y); c.lineTo(x, y + W * .012); c.lineTo(x - W * .012, y); c.fill(); }); }
      c.strokeStyle = 'rgba(201,154,74,.35)'; c.lineWidth = W * .004; for (let r = 1; r <= 4; r++) { c.beginPath(); c.arc(W / 2, W / 2, W * .09 * r, 0, Math.PI * 2); c.stroke(); }
      const N = makeNoise(12), img = c.getImageData(0, 0, W, W), d = img.data;
      for (let i = 0; i < W * W; i++) { const k = (N((i % W) / 1.5, (i / W | 0) / 1.5, 1) - .5) * 26; d[i * 4] += k; d[i * 4 + 1] += k * .7; d[i * 4 + 2] += k * .7; }
      c.putImageData(img, 0, 0);
    });
    const rug = new TT.Mesh(new TT.PlaneGeometry(27, 30), M({ map: rugT, roughness: 1, sheen: new TT.Color(0x3a0a10) })); rug.rotation.x = -Math.PI / 2; rug.position.set(0, FLOOR + .02, 1.5); rug.receiveShadow = true; g.add(rug);
    // walls: boiserie panels (gilt mouldings) and fluted pilasters between the paintings, a stepped cornice with dentils
    const moulding = (wg, x, y, w, h) => { const t = .12; [[x, y + h / 2, w, t], [x, y - h / 2, w, t], [x - w / 2, y, t, h], [x + w / 2, y, t, h]].forEach(([px, py, pw, ph]) => wg.add(mesh(RB(pw, ph, .1, .04, 1), gold, px, py, .06))); };
    const pilaster = (wg, x) => {
      const f = new TT.CylinderGeometry(.55, .55, 9.6, 20, 1, true, -Math.PI / 2, Math.PI);
      const P = f.attributes.position; for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getX(i), P.getZ(i)), k = 1 - .09 * Math.pow(Math.abs(Math.sin(a * 5)), .6); P.setX(i, P.getX(i) * k); P.setZ(i, P.getZ(i) * k); } f.computeVertexNormals();
      wg.add(mesh(f, marble, x, 8.6, 0));
      wg.add(mesh(RB(1.5, .5, .9, .08, 1), marble, x, 3.95, .3)); wg.add(mesh(new TT.TorusGeometry(.56, .1, 6, 20, Math.PI), gold, x, 4.3, 0));
      wg.add(mesh(RB(1.6, .35, .95, .06, 1), marble, x, 13.55, .3)); wg.add(mesh(new TT.TorusGeometry(.58, .12, 6, 20, Math.PI), gold, x, 13.25, 0));
      [-1, 1].forEach(sx => { const v = new TT.Mesh(new TT.TorusGeometry(.2, .07, 6, 14), gold); v.position.set(x + sx * .55, 13.55, .55); wg.add(v); });
    };
    const dentils = (wg, w) => { for (let x = -w / 2 + .3; x < w / 2; x += .6) wg.add(mesh(new TT.BoxGeometry(.3, .32, .3), marble, x, 13.95, .46)); };
    const dress = (wg, w, pics) => {
      wg.add(mesh(RB(w, .3, .7, .1, 1), marble, 0, 14.2, .34)); wg.add(mesh(RB(w, .18, .9, .06, 1), gold, 0, 14.42, .44)); wg.add(mesh(RB(w, .45, 1.1, .12, 1), dark, 0, 15.1, .55));
      dentils(wg, w);
      wg.add(mesh(RB(w, .14, .44, .05, 1), gold, 0, 3.15, .36));   // the wainscot's gilt cap
      for (let x = -w / 2 + 2.2; x < w / 2 - 1; x += 4.4) moulding(wg, x, 1.8, 3.4, 2.4);   // panels in the wainscot
      pics.forEach(px => moulding(wg, px, 8.6, 7.6, 8.4));
    };
    dress(back, 44, [-13, 13]); dress(left, 44, [6, -6]); dress(right, 44, [-6, 6]);
    [-17.5, -9.5, 9.5, 17.5].forEach(x => pilaster(back, x)); [-17, 0, 17].forEach(x => { pilaster(left, x); pilaster(right, x); });
    // picture lights: a brass bar over each painting, its glass glowing
    const picLight = (wg, x, w) => { wg.add(mesh(new TT.CylinderGeometry(.13, .13, w * .55, 12), brass, x, 12.1, .9).rotateZ(Math.PI / 2)); wg.add(mesh(new TT.BoxGeometry(w * .5, .05, .12), lamp, x, 12.0, .95)); wg.add(mesh(new TT.CylinderGeometry(.05, .05, .9, 6), brass, x, 12.35, .5).rotateX(Math.PI / 2)); };
    picLight(back, -13, 5.5); picLight(back, 13, 5.5); [-6, 6].forEach(x => { picLight(left, x, 5); picLight(right, x, 5); });
    // inside the arch: a lit niche with a cobalt vase (a shallow alcove in front of the wall's dark opening)
    const corr = new TT.Group(); corr.position.set(0, FLOOR, -17 + .06); g.add(corr);
    const glowT = canvasTex('musNiche', 64, 256, (c, W, H) => { const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2a120e'); gr.addColorStop(.55, '#6a3524'); gr.addColorStop(1, '#3a1c12'); c.fillStyle = gr; c.fillRect(0, 0, W, H); });
    corr.add(mesh(new TT.PlaneGeometry(6.9, 9.4), M({ map: glowT, roughness: 1, emissive: 0x2a1208 }), 0, 4.75, 0));
    corr.add(mesh(RB(2.6, 4, .5, .1, 1), marble, 0, 4.6, .3)); corr.add(mesh(new TT.PlaneGeometry(2, 3.4), lamp, 0, 4.7, .56));
    const vase = new TT.LatheGeometry([[0, 0], [.4, 0], [.5, .2], [.42, .5], [.7, 1.1], [.78, 1.5], [.5, 2], [.32, 2.3], [.42, 2.5], [0, 2.5]].map(([x, y]) => new TT.Vector2(x, y)), 18);
    corr.add(mesh(RB(1.8, 1.9, 1.6, .08, 1), marble, 0, .95, 1.1)); corr.add(mesh(vase, M({ color: 0x1d3a72, roughness: .2, clearcoat: 1 }), 0, 1.9, 1.1));
    // the arch made grander: a keystone, a gilt archivolt
    back.add(mesh(RB(1, 1.4, .7, .1, 1), marble, 0, 13.4, .45)); { const av = new TT.Mesh(new TT.TorusGeometry(4.15, .12, 6, 28, Math.PI), gold); av.position.set(0, 9.5, .45); back.add(av); }
    // museum benches: buttoned velvet tops on turned walnut legs, facing the exhibit
    const bench = (x, z, ry) => {
      const b = new TT.Group(); b.position.set(x, FLOOR, z); b.rotation.y = ry; g.add(b);
      b.add(mesh(RB(5, .5, 1.7, .22, 2), velvetSeat, 0, 1.55, 0)); b.add(mesh(RB(5.1, .22, 1.8, .06, 1), dark, 0, 1.22, 0));
      for (let i = -2; i <= 2; i++) b.add(mesh(new TT.SphereGeometry(.05, 6, 4), gold, i * .9, 1.81, 0));
      const leg = new TT.LatheGeometry([[0, 0], [.12, 0], [.14, .2], [.08, .45], [.13, .7], [.1, 1.05], [.15, 1.12], [0, 1.12]].map(([a, y]) => new TT.Vector2(a, y)), 10);
      [[-2.2, -.6], [2.2, -.6], [-2.2, .6], [2.2, .6]].forEach(([lx, lz]) => b.add(mesh(leg, dark, lx, 0, lz)));
    };
    bench(-15.5, 4, Math.PI / 2); bench(15.5, 4, -Math.PI / 2);
    // potted palms at the front corners of the hall
    const leafM = M({ color: 0x2f5a2c, roughness: .7, side: TT.DoubleSide }), potM = M({ color: 0xc8b48e, roughness: .4, clearcoat: .6 });
    const palm = (x, z) => {
      const p = new TT.Group(); p.position.set(x, FLOOR, z); g.add(p);
      p.add(mesh(new TT.LatheGeometry([[0, 0], [.7, 0], [.9, .3], [1.05, 1.6], [1.2, 1.8], [0, 1.8]].map(([a, y]) => new TT.Vector2(a, y)), 18), potM));
      p.add(mesh(new TT.CylinderGeometry(.12, .16, 3, 6), M({ color: 0x5a4126, roughness: .9 }), 0, 3.2, 0));
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, lf = new TT.PlaneGeometry(.7, 3, 1, 6), P = lf.attributes.position;
        for (let k = 0; k < P.count; k++) { const t = (P.getY(k) + 1.5) / 3; P.setX(k, P.getX(k) * Math.sin(Math.PI * Math.min(1, t * 1.1)) ); P.setZ(k, -t * t * 1.4); } lf.computeVertexNormals();
        const m = new TT.Mesh(lf, leafM); m.position.set(0, 4.6, 0); m.rotation.set(-.9 - (i % 2) * .25, a, 0, 'YXZ'); m.translateY(1.4); p.add(m);
      }
    };
    palm(-17.5, 13); palm(17.5, 13);
    // the plinth made grander: a gilt band and a stepped marble base
    g.add(mesh(RB(17.2, .3, 17.2, .08, 1), marble, 0, FLOOR + .15, 0)); g.add(mesh(RB(15.6, .14, 15.6, .04, 1), gold, 0, -.47, 0));
    g.traverse(o => { if (o.isMesh && !preDeco.has(o)) o.castShadow = false; });   // the dressing only receives: the exhibit's spotlight keeps its one shadow pass small
    g.traverse(o => { if (o.isMesh && o !== floor) o.castShadow = o.castShadow || false; });
    try { mergeStatic(g); } catch (e) {}
    rbCap = 9;
    // lights: dim warm ambient, a spotlight on the exhibit (the only shadow), soft wash on the paintings
    scene.add(g);
    scene.add(new TT.HemisphereLight(0xffeedd, 0x2a1810, .42));
    const spot = new TT.SpotLight(0xffe0b0, 2.1, 70, .42, .55, 1); spot.position.set(0, 24, 9); spot.target.position.set(0, 0, 0); museumSpot = spot;
    spot.castShadow = true; spot.shadow.mapSize.setScalar(LITE ? 512 : COARSE ? 1024 : 2048); spot.shadow.camera.near = 8; spot.shadow.camera.far = 50; spot.shadow.bias = -.0004; spot.shadow.normalBias = .02;
    scene.add(spot); scene.add(spot.target);
    const wash = new TT.DirectionalLight(0xffd9a8, .38); wash.position.set(0, 12, 14); scene.add(wash);
    // (two more spotlights used to aim at the back-wall paintings: they changed the picture by ~1% of pixels but every pixel of the
    // whole scene paid for them in its lighting loop — ~20% of a frame — so they are gone)
    const objs = scene.children.filter(o => !before.has(o));
    objs.forEach(o => { o.visible = false; });
    return objs;
  }
  function drawPlacard(o) {
    if (!placard) return; const c = placard.image, x = c.getContext('2d'), W = c.width, H = c.height;
    const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d9b46a'); gr.addColorStop(1, '#a9803e'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
    x.fillStyle = '#2a1a0c'; x.fillRect(10, 10, W - 20, H - 20); x.strokeStyle = '#d9b46a'; x.lineWidth = 3; x.strokeRect(22, 22, W - 44, H - 44);
    x.textAlign = 'center'; x.fillStyle = '#f3dfae'; x.font = "900 60px 'Zen Maru Gothic','Noto Sans Devanagari','Noto Sans Arabic',serif"; x.fillText(o.title || '', W / 2, 104, W - 80);
    x.font = "700 24px Fredoka,'Zen Maru Gothic',sans-serif"; x.fillStyle = '#d9b46a'; x.fillText(o.sub || 'WORLD BOARD GAME ATLAS', W / 2, 152, W - 80);
    placard.needsUpdate = true;
  }
  const MUSEUM_EXP = .92;
  let roomEnv = null, musEnv = null;
  function museumEnv() {   // warm gallery reflections: a dark room, a bright spot from above, soft wall washes (built once)
    if (musEnv) return musEnv;
    try {
      const TT = T(), env = new TT.Scene();
      env.add(new TT.Mesh(new TT.SphereGeometry(30, 24, 12), new TT.MeshBasicMaterial({ color: new TT.Color('#2a1c12').convertSRGBToLinear().multiplyScalar(.6), side: TT.BackSide })));
      [[0, 22, 6, 10, 10, 2.2, '#ffe2b8'], [-16, 9, 0, 8, 10, .45, '#ffd6a0'], [16, 9, 0, 8, 10, .45, '#ffd6a0'], [0, 8, -18, 18, 8, .35, '#ffe6c4'], [0, -6, 14, 22, 5, .12, '#8a6a48']].forEach(([x, y, z, w, h, k, hx]) => {
        const c = new TT.Color(hx).convertSRGBToLinear().multiplyScalar(k), p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: c, side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p); });
      const pm = new TT.PMREMGenerator(R); musEnv = pm.fromScene(env, .03).texture; pm.dispose();
    } catch (e) { musEnv = null; }
    return musEnv;
  }
  function museum(on, o = {}) {
    if (!R || !scene || mountOpts.plain) return false;
    on = !!on; if (on === museumOn) { if (on) drawPlacard(o); return true; }
    if (on && !museumObjs) museumObjs = buildMuseum();
    museumOn = on; glareW = -1;
    roomObjs.forEach(x => { x.visible = !on; });
    (museumObjs || []).forEach(x => { x.visible = on; });
    if (on) setTimeout(() => { if (museumOn) warmMuseum(); }, 1200);
    // the gallery has its own fixed light: its exposure (not the brightness option) and its own reflections — not the chosen
    // place's (a chabudai, a terrace…), which stayed in scene.environment and tinted the plinth and the board
    if (on) { drawPlacard(o); R.toneMappingExposure = MUSEUM_EXP; scene.background = new (T().Color)('#1d130d').convertSRGBToLinear(); roomEnv = scene.environment; scene.environment = museumEnv() || roomEnv; }
    else { R.toneMappingExposure = expo(baseExp); scene.background = roomBg; if (roomEnv) scene.environment = roomEnv; roomEnv = null; }
    paintCss(on ? '' : roomCss);
    if (lampShade && on) lampShade.visible = false;
    zoomTo = on ? 1.32 : 1;   // the gallery: step back a little so the plinth and the room show
    dirty = shadowDirty = true; kick(400);
    return true;
  }
  /* ---------- scene ---------- */
  let mountOpts = {}, envBuild = null, roomObjs = [];
  function setTimeOfDay(v) {   // rebuild the room's lights, sky and decor for another time of day
    try { localStorage.setItem('atlas-tod', v); } catch (e) {}
    if (!R || !scene || mountOpts.plain) return;
    roomObjs.forEach(o => { scene.remove(o); o.traverse && o.traverse(x => { if (x.geometry) x.geometry.dispose(); }); });
    const before = new Set(scene.children); buildRoom(scene, false); roomObjs = scene.children.filter(o => !before.has(o));
    try { envBuild && envBuild(); } catch (e) {}
    if (museumOn) { roomObjs.forEach(x => { x.visible = false; }); museumOn = false; museum(true); }
    kick(600);
  }
  // the place (table design, 0..5) and the brightness (0..2) are shared by the portal and every ?skin=atlas page:
  // localStorage 'atlas-table' / 'atlas-bright2'; a change fires window 'atlas-table' (detail { table, bright }) for the labels / floors
  const say = () => { try { dispatchEvent(new CustomEvent('atlas-table', { detail: { table: tableStyle, bright } })); } catch (e) {} };
  function setTable(k) {   // switch the table design (0..5) and rebuild the room (no reload)
    k = Math.max(0, Math.min(11, k | 0)); if (!TABLES[k] && k) k = 0;
    const same = k === tableStyle; tableStyle = k;
    try { localStorage.setItem('atlas-table', String(k)); } catch (e) {}
    if (R && scene && !same) {
      roomObjs.forEach(o => { scene.remove(o); o.traverse && o.traverse(x => { if (x.geometry && !SHARED.has(x.geometry)) x.geometry.dispose(); }); });
      const before = new Set(scene.children); buildRoom(scene, mountOpts.plain || false); roomObjs = scene.children.filter(o => !before.has(o) && o !== root);
      try { envBuild && envBuild(); } catch (e) {}
      if (museumOn) { roomObjs.forEach(x => { x.visible = false; }); museumOn = false; museum(true); }
      if (alignFn) { const c = keyLight && keyLight.shadow.camera; if (c) c.right = -1; fitShadow(); }
      dirty = shadowDirty = true; kick(600);
    }
    say();
  }
  // 明るさ: 0 暗い（やや抑えた明かり） · 1 標準 · 2 明るい — exposure × BRIGHT[b], the soft light on the board × BOARD_K + BOARD_ADD, a lift of the ambient.
  // Kept in 'atlas-bright2' (the earlier 'atlas-bright' 0 標準 · 1 明るい · 2 とても明るい is read once: 0 → 1, 1 / 2 → 2) (2026-11-07)
  // the places (2..9) a little dimmer than they were built, to sit with the chabudai's balance; reflections' soft boxes capped (2026-11-09)
  const OLD_DIM = { exp: .78, board: .5, key: .74 };   // ちゃぶ台〜書斎 (places 0..5) in the portal: × exposure, the soft board light, the key light
  const ROOM_DIM = [1, .9, .76, .92, .76, 1, .86, 1, .76, 1], ENV_MAX = 1.6;   // (by place; the study and the lodge are already dim)
  const BRIGHT = [.8, 1, 1.2], BOARD_K = [.7, 1, 1], BOARD_ADD = [0, 0, .32], AMB_ADD = [0, 0, .14];
  let bright = (() => { try { const v = localStorage.getItem('atlas-bright2'); if (v !== null && +v >= 0 && +v <= 2) return +v | 0; const o = localStorage.getItem('atlas-bright'); return o === '1' || o === '2' ? 2 : 1; } catch (e) { return 1; } })();
  let baseExp = .78, boardLamp = null, boardLampI = 0, ambLift = null;
  const expo = v => v * BRIGHT[bright];
  function setBright(b) {
    bright = Math.max(0, Math.min(2, b | 0));
    try { localStorage.setItem('atlas-bright2', String(bright)); } catch (e) {}
    if (R) { if (!museumOn) R.toneMappingExposure = expo(baseExp); else { glareW = -1; R.toneMappingExposure = MUSEUM_EXP; }
      if (boardLamp) boardLamp.intensity = boardLampI * BOARD_K[bright] + BOARD_ADD[bright]; if (ambLift) ambLift.intensity = AMB_ADD[bright]; dirty = true; kick(300); }
    say();
  }
  // the board is never left in the dark: every place gets a soft light straight onto the board (no shadow: free of shadow passes)
  // and the brightness option adds to it; `I` is the place's own guaranteed amount
  function boardLight(TT, scene, I, col = 0xfff4e6) {
    boardLampI = I;
    const L = new TT.DirectionalLight(col, I * BOARD_K[bright] + BOARD_ADD[bright]); L.position.set(2, 30, 18); scene.add(L); boardLamp = L;
    const h = new TT.HemisphereLight(0xffffff, 0xd8c8b0, AMB_ADD[bright]); scene.add(h); ambLift = h;
  }
  // a place may show the page's own CSS behind a transparent canvas (2D準拠): the canvas container carries it
  let roomCss = '';
  function paintCss(css) { if (!el || mountOpts.local) return; el.style.background = css || ''; }
  let roomMode = '', alignFn = null, alignSize = 0, alignTop = 0, zoom = 1, zoomTo = 1, pzoom = 1, pzoomTo = 1, envOK = false, vel = 0, tilt = 0, dragEnd = 0, idleT = 0;
  let R, scene, cam, root, cur = null, el = null, drag = null, yaw = 0, spin = true, mode = 'view', camK = 0, camTo = 0;
  // 盤面反転 on the skin pages (AtlasSkin): the table turned round its own centre — tYaw / tS set from outside each frame (turn())
  let tYaw = null, tS = 1, rootDirty = false;

  /* ---------- the toy room: a chabudai (low round table) on tatami, walls, a window, toy shelves ----------
     Lighting follows the local time like the Sudoku backgrounds: morning / day / evening / night. */
  // the room's time of day: 'auto' follows the clock, or morning / day / evening / night chosen on the board view (remembered)
  const todPick = () => { try { const v = localStorage.getItem('atlas-tod'); return ['morning', 'day', 'evening', 'night'].includes(v) ? v : 'auto'; } catch (e) { return 'auto'; } };
  const curTod = () => { const v = todPick(); return v === 'auto' ? timeOfDay(new Date().getHours()) : v; };
  function timeOfDay(h) { return h >= 5 && h < 10 ? 'morning' : h >= 10 && h < 16 ? 'day' : h >= 16 && h < 19 ? 'evening' : 'night'; }
  /* ---------- table designs (prototype): 0 = the toy room's chabudai, 1..5 = the environments in tables3d.js (Table3D.TABLES[k]) ----------
     picked by ?tbl=k (temporary) or localStorage 'atlas-table'; Table3D.setTable(k) rebuilds the room */
  const TABLES = {};
  let tableStyle = (() => { try { const m = /[?&]tbl=(\d+)/.exec(location.search); if (m) return +m[1]; return +(localStorage.getItem('atlas-table') || 0) || 0; } catch (e) { return 0; } })();
  let tblInfo = null, roomBg = null, viewOnly = [];
  try { const m = /[?&]bright=(\d)/.exec(location.search); if (m) localStorage.setItem('atlas-bright2', m[1]); } catch (e) {}
  const LOOK = {
    morning: { sky: ['#cfe9ff', '#fff2d6'], sun: 0xfff4e2, sunI: 1.05, sunPos: [-14, 12, -10], hemi: [0xe8f2ff, 0x6a5038, .45], lamp: 0, exp: .84 },
    day:     { sky: ['#8fd0ff', '#e6f6ff'], sun: 0xffffff, sunI: 1.02, sunPos: [-8, 18, -6], hemi: [0xf4f8ff, 0x6a5038, .46], lamp: 0, exp: .78 },
    evening: { sky: ['#ff7a3c', '#ffc27a'], sun: 0xff8a3c, sunI: 1.35, sunPos: [-18, 5, -10], hemi: [0xffb070, 0x4a2010, .42], lamp: .6, exp: .82 },
    night:   { sky: ['#0b1230', '#24335e'], sun: 0xffe2b8, sunI: .55, sunPos: [-6, 18, 4], hemi: [0xffe6c8, 0x3a2614, .42], lamp: 2.4, exp: .9 },   // ceiling light on
  };

  // rounded box: a subdivided box whose edges are bent onto quarter-circles (exact normals, box UVs kept, so wood maps stay straight)
  const rbCache = {};
  // cached geometries shared by many boards (rounded boxes, goban legs / stones / bowls): dispose() leaves them on the GPU
  const SHARED = new WeakSet(), share = g => { SHARED.add(g); return g; };
  // a lathe profile without the points that sit on the line of their neighbours (Douglas–Peucker; [r, y] pairs or Vector2s,
  // tol in board units) — the turned outline stays, at far fewer rings (2026-11-09: the full games' pieces)
  function lp(pts, tol = .003) {
    const P = pts.map(p => Array.isArray(p) ? p : [p.x, p.y]); if (P.length < 4) return pts;
    const keep = new Uint8Array(P.length); keep[0] = keep[P.length - 1] = 1;
    const rec = (a, b) => { const [x1, y1] = P[a], [x2, y2] = P[b], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1e-9; let m = -1, mi = -1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((P[i][0] - x1) * dy - (P[i][1] - y1) * dx) / L; if (d > m) { m = d; mi = i; } }
      if (m > tol) { keep[mi] = 1; rec(a, mi); rec(mi, b); } };
    rec(0, P.length - 1); return pts.filter((p, i) => keep[i]);
  }
  let rbCap = 9;   // the room is built with rbCap = 1: its rounded boxes get a single chamfer step (smooth normals keep them looking round)
  function RB(w, h, d, r, m = 3) {
    if (r == null) r = Math.min(.25, Math.min(w, h, d) * .2);
    r = Math.max(.001, Math.min(r, Math.min(w, h, d) / 2 - .0005));
    m = Math.max(1, Math.min(m, rbCap));
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
    SHARED.add(g); return (rbCache[key] = g);
  }
  /* ---------- toy-room props: toy chest, brick castle, retro TV game, and the Atlas Mon living in the room ---------- */
  const roomTicks = [];
  // merge the static room meshes that share a material into one mesh each: the toy room has ~350 small meshes
  // (bricks, toys, characters…) → a few dozen draw calls (and as many shadow draws). Animated parts are kept as they are.
  const SIGX = mt => mt.type + (mt.color ? mt.color.getHexString() : '') + '|' + (mt.map ? mt.map.uuid : '') + (mt.bumpMap ? mt.bumpMap.uuid + mt.bumpScale : '') + '|' + [mt.roughness, mt.metalness, mt.clearcoat, mt.clearcoatRoughness, mt.opacity, mt.transparent, mt.side, mt.toneMapped, mt.depthWrite, mt.emissive && mt.emissive.getHexString(), mt.roughnessMap && mt.roughnessMap.uuid, mt.normalMap && mt.normalMap.uuid, mt.alphaMap && mt.alphaMap.uuid, mt.polygonOffset ? 'po' + mt.polygonOffsetFactor + ':' + mt.polygonOffsetUnits : ''].join(',');
  // weld the merged (de-indexed) copy back into an indexed mesh: vertices whose position, normal and uv are the same (to 1e-5)
  // are shared, so ~3 vertices per triangle become ~1 (the picture is identical; only memory and vertex work go down)
  function weld(mg) {
    const P = mg.attributes.position.array, N = mg.attributes.normal.array, U = mg.attributes.uv.array, n = P.length / 3;
    if (n < 6) return;
    let cap = 1; while (cap < n * 2) cap <<= 1;
    const tab = new Int32Array(cap).fill(-1), q = v => Math.round(v * 1e5);
    const nP = new Float32Array(n * 3), nN = new Float32Array(n * 3), nU = new Float32Array(n * 2), idx = n > 65535 ? new Uint32Array(n) : new Uint16Array(n);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const a = i * 3, b = i * 2;
      const k0 = q(P[a]), k1 = q(P[a + 1]), k2 = q(P[a + 2]), k3 = q(N[a] * .1), k4 = q(N[a + 1] * .1), k5 = q(N[a + 2] * .1), k6 = q(U[b]), k7 = q(U[b + 1]);
      let h = (k0 * 73856093) ^ (k1 * 19349663) ^ (k2 * 83492791) ^ (k3 * 2654435761) ^ (k4 * 40503) ^ (k5 * 97) ^ (k6 * 31337) ^ (k7 * 7919);
      h &= cap - 1;
      for (;;) {
        const j = tab[h];
        if (j < 0) {
          tab[h] = m; nP[m * 3] = P[a]; nP[m * 3 + 1] = P[a + 1]; nP[m * 3 + 2] = P[a + 2]; nN[m * 3] = N[a]; nN[m * 3 + 1] = N[a + 1]; nN[m * 3 + 2] = N[a + 2];
          nU[m * 2] = U[b]; nU[m * 2 + 1] = U[b + 1]; idx[i] = m++; break;
        }
        const c = j * 3, d = j * 2;
        if (q(nP[c]) === k0 && q(nP[c + 1]) === k1 && q(nP[c + 2]) === k2 && q(nN[c] * .1) === k3 && q(nN[c + 1] * .1) === k4 && q(nN[c + 2] * .1) === k5 && q(nU[d]) === k6 && q(nU[d + 1]) === k7) { idx[i] = j; break; }
        h = (h + 1) & (cap - 1);
      }
    }
    if (m > n * .9) return;   // hardly anything shared: keep it as it is
    const TT = T();
    mg.setAttribute('position', new TT.BufferAttribute(nP.slice(0, m * 3), 3)); mg.setAttribute('normal', new TT.BufferAttribute(nN.slice(0, m * 3), 3)); mg.setAttribute('uv', new TT.BufferAttribute(nU.slice(0, m * 2), 2));
    mg.setIndex(new TT.BufferAttribute(m > 65535 ? idx : (idx instanceof Uint16Array ? idx : Uint16Array.from(idx)), 1));
  }
  function mergeStatic(g) {
    if (window.__t3NoMerge) return;   // a debug switch: keep the meshes apart (to check what sits where)
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
      weld(mg);
      mg.computeBoundingSphere();
      const m = new TT.Mesh(mg, b.mat); m.castShadow = b.cast; m.receiveShadow = b.recv; m.renderOrder = b.ro; m.matrixAutoUpdate = false; g.add(m);
      b.list.forEach(it => { if (!it.grp) drop.push(it.o); });
    });
    nonIdx.forEach(gm => gm.dispose()); multis.forEach(o => drop.push(o));
    drop.forEach(o => { o.visible = false; o.userData.merged = true; });   // hidden, not removed: groups and their children stay intact
  }
  // the Atlas Mon (the portal's creatures) as small figures in a room: low-poly, breathing and blinking on PC (2026-11-09: every place has some)
    // phones: build the room's figures with far fewer segments (they are small in the background; ~370k → ~60k triangles)
  function lowPoly(make, f = .38) {
      const TT = T();
      const sg = (n, d, lo) => Math.max(lo, Math.round((n || d) * f)), keep = {};
      const patch = (name, fn) => { const B = TT[name]; keep[name] = B; TT[name] = class extends B { constructor(...a) { super(...fn(a)); } }; };
      patch('SphereGeometry', a => { a[1] = sg(a[1], 32, 8); a[2] = sg(a[2], 16, 6); return a; });
      patch('TorusGeometry', a => { a[2] = sg(a[2], 16, 4); a[3] = sg(a[3], 48, 8); return a; });
      patch('LatheGeometry', a => { a[1] = sg(a[1], 12, 8); return a; });
      patch('CylinderGeometry', a => { a[3] = sg(a[3], 8, 6); return a; });
      try { return make(); } finally { Object.assign(TT, keep); }
  }
  function placeMon(par, id, h, x, y, z, ry = 0) {
        const TT = T(), MON = window.Icons3D && Icons3D.MONS; if (!MON) return null;
        if (!MON[id]) return null; let m; try { m = lowPoly(MON[id], COARSE ? .2 : .26); } catch (e) { return null; }   // small figures in the background: ~12×8 spheres (they were ~100k of the room's ~200k triangles)
        const bb = new TT.Box3().setFromObject(m), s = h / Math.max(.01, bb.max.y - bb.min.y);
        const w = new TT.Group(); w.add(m); m.position.y = -bb.min.y; w.scale.setScalar(s); w.position.set(x, y, z); w.rotation.y = ry; par.add(w);
        m.traverse(o => { if (o.isMesh) o.castShadow = !COARSE; });   // phones: tiny far-away figures, no shadow pass
        if (m.userData.tick && !COARSE) { w.userData.keep = true; try { mergeStatic(m); } catch (e) {} roomTicks.push(Object.assign(t => m.userData.tick(t), { obj: w })); }   // PC: it breathes and blinks, but as a few meshes (the eyes stay separate)   // phones: the room's characters stand still and get merged (far fewer draw calls)
        return w;
  }
  function decorate(g, FLOOR, mode) {
    const TT = T(), F = FLOOR;
    roomTicks.length = 0;
    const box = (w, h, d, mat, x, y, z, ry = 0, par = g) => { const m = new TT.Mesh(RB(w, h, d, null, 2), mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; par.add(m); return m; };
    const rbox = (w, h, d, r, mat) => { const m = new TT.Mesh(RB(w, h, d, r, 4), mat); m.castShadow = m.receiveShadow = true; return m; };
    const plastic = c => M({ color: c, roughness: .32, clearcoat: .5, clearcoatRoughness: .25 });

    // --- brick castle (toy building bricks): bricks with studs, built layer by layer ---
    const U = .8, BH = .96 * U * 1.2;
    const castle = new TT.Group(); castle.position.set(13.2, F, -13.6); castle.rotation.y = -.55; castle.scale.setScalar(.72); g.add(castle);
    const studG = new TT.CylinderGeometry(.24, .245, .2, 7, 1, true), studs = {};   // (tiny studs far back: 7 open sides — the brick top caps them)
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
    flag.userData.keep = true; roomTicks.push(Object.assign(t => { flag.rotation.y = Math.sin(t * 3) * .25; }, { obj: flag }));
    // a brick tree beside the gate
    brick(0, 5, .3 / BH, 1, 1, 0x8a5a2b); brick(0, 5, 1 + .3 / BH, 1, 1, 0x8a5a2b);
    const leaves = new TT.Mesh(new TT.SphereGeometry(.85, 10, 7), plastic(0x2fbf62)); leaves.position.set(.5 * U, 2 * BH + .9, 5.5 * U); leaves.castShadow = true; castle.add(leaves);
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
    [-1.8, 1.8].forEach(x => { const h = new TT.Mesh(new TT.CylinderGeometry(.09, .09, .7, 6), brass); h.rotation.z = Math.PI / 2; h.position.set(x, CH, -CD / 2 - .02); chest.add(h); });
    [-1, 1].forEach(sx => { const rope = new TT.Mesh(new TT.TorusGeometry(.42, .07, 4, 10, Math.PI), M({ color: 0xc9a46a, roughness: .9 })); rope.position.set(sx * (CW / 2 + .05), CH * .62, 0); rope.rotation.set(0, Math.PI / 2, Math.PI); chest.add(rope); });
    const lid = new TT.Group(); lid.position.set(0, CH, -CD / 2); lid.rotation.x = -1.95; chest.add(lid);
    box(CW + .1, th, CD + .1, chestM, 0, 0, CD / 2, 0, lid); box(CW + .12, .32, .4, paint, 0, .05, CD, 0, lid);
    // stuff inside (peeking over the rim)
    const ballS = (r, c, x, y, z, par = chest) => { const m = new TT.Mesh(new TT.SphereGeometry(r, 12, 8), plastic(c)); m.position.set(x, y, z); m.castShadow = true; par.add(m); return m; };
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
    [-2.2, 2.2].forEach(x => { const k = new TT.Mesh(new TT.SphereGeometry(.16, 6, 4), M({ color: 0xd9a441, roughness: .35, metalness: .8 })); k.position.set(x + (x < 0 ? 1.6 : -1.6), .9, 1.7); tv.add(k); });
    [-4.1, 4.1].forEach(x => [-1.2, 1.2].forEach(z => { const f = new TT.Mesh(new TT.CylinderGeometry(.22, .16, .25, 6, 1, true), M({ color: 0x5a3418, roughness: .5 })); f.position.set(x, -.0, z); tv.add(f); }));
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
    [0, 1].forEach(i => { const k = new TT.Mesh(new TT.CylinderGeometry(.2, .2, .2, 8), plastic(i ? 0xff5d5d : 0x6a7088)); k.rotation.x = Math.PI / 2; k.position.set(1.15, 1.8 + 2.8 - i * .7, 1.82); tv.add(k); });
    const ant = new TT.Mesh(new TT.CylinderGeometry(.04, .04, 2.4, 4, 1, true), plastic(0x9aa0b2)); ant.position.set(-.3, 1.8 + 4.2 + 1, -.3); ant.rotation.z = .5; tv.add(ant);
    const ant2 = ant.clone(); ant2.rotation.z = -.4; ant2.position.x = -1.4; tv.add(ant2);
    roomTicks.push(Object.assign(t => { scr.offset.y = (Math.floor(t * 8) % 2) * .002; }, { obj: screen }));
    const con = rbox(2.4, .6, 1.8, .2, plastic(0x9aa0b2)); con.position.set(2.4, 1.8 + .3, .4); tv.add(con);
    const slot = box(1.4, .08, .5, M({ color: 0x2b3044, roughness: .6 }), 2.4, 1.8 + .62, .3, 0, tv); slot.castShadow = false;
    const cart = rbox(1.2, .9, .3, .08, plastic(0xff5d5d)); cart.position.set(2.4, 1.8 + 1, .3); tv.add(cart);
    // gamepad on the floor, cable running to the console
    const pad = new TT.Group(); pad.position.set(4.8, F + .18, -10.8); pad.rotation.y = -.35; g.add(pad);
    const pb = rbox(2, .35, 1, .16, plastic(0xece6d8)); pad.add(pb);
    const dp = box(.5, .12, .16, plastic(0x2b3044), -.55, .2, 0, 0, pad); box(.16, .12, .5, plastic(0x2b3044), -.55, .2, 0, 0, pad); dp.castShadow = false;
    [[.45, .1, 0xff5d5d], [.75, -.12, 0x36b4ff]].forEach(([x, z, c]) => { const b = new TT.Mesh(new TT.CylinderGeometry(.14, .14, .14, 8), plastic(c)); b.position.set(x, .2, z); pad.add(b); });
    const curve = new TT.CatmullRomCurve3([new TT.Vector3(4.2, F + .2, -11.2), new TT.Vector3(3.2, F + .05, -12.6), new TT.Vector3(1.6, F + .05, -13.2), new TT.Vector3(1.2, F + 1.6, -13.9), new TT.Vector3(.9, F + 1.9, -14.4)]);
    const cable = new TT.Mesh(new TT.TubeGeometry(curve, 20, .05, 4), M({ color: 0x2b3044, roughness: .6 })); g.add(cable);

    // --- the Atlas Mon live here ---
    const MON = window.Icons3D && Icons3D.MONS;
    if (MON) {
      const place = (id, h, x, y, z, ry, par = g) => placeMon(par, id, h, x, y, z, ry);
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
  let localFloor = false, keyLight = null, shadowDirty = true;
  // the floor texture as an image + its size in world units, for a page background that matches the 3D floor
  // (the chosen place's own floor first: TABLES[k].floor in tables3d.js → { img, w, h, over } or { css })
  function floorImage(kind, game) {
    const F = tableStyle && TABLES[tableStyle] && TABLES[tableStyle].floor;
    if (F) { try { const r = F({ TT: T(), texScale: texScale(), game: game || 'chess', kind }); if (r) return r; } catch (e) { console.warn('[table3d] floor', e); } }
    return kind === 'tatami' ? { img: tatamiTex().map.image, w: TAT_W, h: TAT_L } : { img: woodTop('tblR5', '#c08446', '#6a3e1c').image, w: 40, h: 40 }; }
  function buildRoom(scene, plain) {
    const TT = T(), mode = plain ? 'day' : curTod(), L = LOOK[mode];   // the games themselves are always lit like daytime
    const g = new TT.Group(); scene.add(g); rbCap = 1;
    const FLOOR = -3.4;
    tblInfo = null; lampShade = null; boardLamp = ambLift = null; roomCss = ''; viewOnly = [];
    const ST = !plain && tableStyle && TABLES[tableStyle];
    if (ST) {   // one of the other table designs: it builds its own table, surroundings and lights
      rbCap = 4;
      const gid = () => (cur && cur.userData.gameId) || 'chess';
      // (tod: the time of day for the places that follow it — ダイニング, テラス; viewOnly objects such as a pendant over the table hide in play view)
      roomTicks.length = 0;   // (tick: a place's per-frame motion — the riad's fountain, the camp's fire; obj is what must be in view for it to run)
      try { tblInfo = ST({ TT, g, scene, LITE, COARSE, tod: mode, texScale: texScale(), game: gid(), tick: (fn, obj) => { if (obj) obj.userData.keep = true; roomTicks.push(Object.assign(fn, { obj })); }, css: v => { roomCss = v || ''; if (!museumOn) paintCss(roomCss); } }) || {}; } finally { rbCap = 9; }
      viewOnly = []; g.traverse(x => { if (x.userData.viewOnly) viewOnly.push(x); });
      keyLight = tblInfo.key || null;
      if (keyLight) { keyLight.castShadow = true; keyLight.shadow.mapSize.setScalar(LITE ? 512 : COARSE ? 1024 : 2048); keyLight.shadow.bias = keyLight.shadow.bias || -.0004; keyLight.shadow.normalBias = .02; }
      // the first places (2D準拠〜書斎, made before 2026-11-07) lit the board harder than the later ones: toned down to sit with them (2026-11-09)
      const OD = tableStyle <= 5 ? OLD_DIM : null;
      boardLight(TT, scene, (tblInfo.board ?? .3) * (OD ? OD.board : 1), tblInfo.boardCol);
      if (OD && keyLight) keyLight.intensity *= OD.key;
      baseExp = Math.max(tblInfo.minExp || .72, tblInfo.exp || .8) * (ROOM_DIM[tableStyle] || 1) * (OD ? OD.exp : 1); if (R) R.toneMappingExposure = expo(baseExp);
      roomBg = tblInfo.bg === null ? null : new TT.Color(tblInfo.bg || '#000').convertSRGBToLinear(); scene.background = roomBg;
      if (!museumOn) paintCss(roomCss);
      roomMode = mode; return;
    }
    paintCss('');
    // skin pages: a place's own light on the board (colour / strength / exposure), see tables3d.js (TABLES[k].plain)
    const PL = plain && tableStyle && TABLES[tableStyle] && TABLES[tableStyle].plain;
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
    const tatami = canvasTex('tatami', 512, 1024, (c0) => paintPx(c0.canvas, 'tatami', {}, (c, W, H) => {
      c.fillStyle = '#5a6a44'; c.fillRect(0, 0, 14, H); c.fillRect(W - 14, 0, 14, H);              // heri (cloth borders)
      c.fillStyle = 'rgba(255,255,255,.12)'; for (let y = 0; y < H; y += 14) c.fillRect(0, y, 14, 2), c.fillRect(W - 14, y, 14, 2);
      c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 0, W, 3); c.fillRect(0, H - 3, W, 3);
    }));
    tatami.wrapS = tatami.wrapT = TT.RepeatWrapping; tatami.repeat.set(6, 3);
    const floor = new TT.Mesh(new TT.PlaneGeometry(60, 60), M({ map: tatami, roughness: .85, bumpScale: .01 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR; floor.receiveShadow = true; g.add(floor);
    // walls: warm plaster above a wooden wainscot
    const plaster = canvasTex('plaster', 512, 512, (c) => paintPx(c.canvas, 'plaster'));
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
    // the side boards stand on the floor (not on the wainscot rail), with a bottom board and a kick plate
    [[3.2], [16.8]].forEach(([x]) => { const s = new TT.Mesh(RB(.4, 11.9, 2.4), shelfM); s.position.set(x, 5.95, 1.2); s.castShadow = s.receiveShadow = true; back.add(s); });
    { const b = new TT.Mesh(RB(13.2, .4, 2.4), shelfM); b.position.set(10, 1.3, 1.2); b.castShadow = b.receiveShadow = true; back.add(b);
      const k = new TT.Mesh(RB(13.2, 1.1, .3), shelfM); k.position.set(10, .55, 2.25); k.receiveShadow = true; back.add(k); }
    const toy = (geo, col, x, y, z, ry = 0) => { const m = new TT.Mesh(geo, M({ color: col, roughness: .35 })); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; back.add(m); };
    const blk = RB(1, 1, 1);
    toy(blk, 0xff5d5d, 5, 6.1, 1.4, .3); toy(blk, 0x36b4ff, 6.2, 6.1, 1.2, -.2); toy(blk, 0xffc928, 5.6, 7.1, 1.3, .6);
    toy(new TT.SphereGeometry(.7, 12, 8), 0x3ccf91, 8.2, 6.3, 1.4); toy(new TT.SphereGeometry(.5, 10, 7), 0x8d6bff, 9.4, 6.1, 1.0);
    [[11.5, 0xe8a33d], [12.9, 0x5a6b8c], [14.3, 0x22aa74], [15.6, 0xff6b6b]].forEach(([x, c], i) => toy(RB(1.1, 3, 2), c, x, 7.1, 1.2, i % 2 ? .05 : -.04));   // game boxes
    toy(RB(5, .7, 2.2), 0xc48a4a, 7.5, 9.95, 1.2); toy(RB(4.4, .7, 2), 0x2a6fe8, 7.6, 10.65, 1.2, .08);
    toy(new TT.ConeGeometry(.6, 1.4, 10), 0xff8fc7, 12.5, 10.3, 1.3); toy(new TT.CylinderGeometry(.8, .8, .5, 12), 0xffd23f, 14.5, 9.85, 1.3);
    // chabudai: a low round table, the game board sits on it (its top is y = 0)
    const top = M({ map: wood('chabu2', '#b8763e', '#8a5226', 1024, 1024, .8), roughness: .5, clearcoat: .25, clearcoatRoughness: .45, bumpScale: .004 });
    const disk = new TT.Mesh(new TT.CylinderGeometry(9.2, 9.2, .55, 72), top); disk.position.y = -.275; disk.castShadow = disk.receiveShadow = true; g.add(disk);
    const lip = new TT.Mesh(new TT.TorusGeometry(9.2, .14, 5, 72), top); lip.rotation.x = Math.PI / 2; lip.position.y = -.02; g.add(lip);
    const apron = new TT.Mesh(new TT.CylinderGeometry(8.4, 8.4, .5, 40, 1, true), M({ color: 0x5a3018, roughness: .6 })); apron.position.y = -.8; g.add(apron);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => { const l = new TT.Mesh(RB(.8, -FLOOR - .5, .8), M({ color: 0x5a3018, roughness: .6 })); l.position.set(sx * 5.6, (FLOOR - .5) / 2, sz * 5.6); l.castShadow = true; g.add(l); });
    // zabuton (floor cushions) and a few toys on the tatami
    const cush = (x, z, r, c) => { const m = new TT.Mesh(new TT.BoxGeometry(6, .9, 6, 6, 1, 6), M({ color: c, roughness: .8 })); const p = m.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0) p.setY(i, y * (1.2 - .5 * (Math.abs(p.getX(i)) + Math.abs(p.getZ(i))) / 6)); } m.geometry.computeVertexNormals(); m.position.set(x, FLOOR + .45, z); m.rotation.y = r; m.receiveShadow = true; m.castShadow = true; g.add(m); };
    cush(0, 13, .1, 0xd94a4a); cush(-13, 2, -.4, 0x3b6fd1);
    const ball = new TT.Mesh(new TT.SphereGeometry(1.1, 16, 10), M({ color: 0xffc928, roughness: .3 })); ball.position.set(14, FLOOR + 1.1, 9); ball.castShadow = true; g.add(ball);
      decorate(g, FLOOR, mode);
      try { mergeStatic(g); } catch (e) { console.warn('[table3d] merge', e); }
    }
    rbCap = 9;
    // lights of the hour
    scene.add(PL && PL.hemi ? new TT.HemisphereLight(...PL.hemi) : new TT.HemisphereLight(L.hemi[0], L.hemi[1], L.hemi[2]));
    const key = new TT.DirectionalLight(PL ? PL.sun : L.sun, PL ? PL.sunI : L.sunI * (plain ? .7 : 1)); key.position.set(...L.sunPos); key.castShadow = true; keyLight = key;
    // skin pages (plain + local floor): the shadow camera is fitted to the board (fitShadow), so 1024² keeps the room's texel density at a quarter of the fill
    key.shadow.mapSize.setScalar(LITE ? 512 : COARSE || (plain && localFloor) ? 1024 : 2048); Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 }); key.shadow.bias = -.0004; key.shadow.normalBias = .02;
    scene.add(key);
    const fill = new TT.DirectionalLight(0xfff0d8, { morning: .3, day: .35, evening: .18, night: .06 }[mode]); fill.position.set(6, 14, 10); scene.add(fill);
    if (L.lamp) { const lamp = new TT.PointLight(0xffc98a, L.lamp, 40, 1.6); lamp.position.set(0, 13, 2); lamp.castShadow = false;   // a point-light shadow is 6 extra shadow passes per frame scene.add(lamp);
      const shade = new TT.Mesh(new TT.ConeGeometry(2.2, 1.6, 20, 1, true), new TT.MeshBasicMaterial({ color: 0xffe2b0, side: TT.DoubleSide })); shade.position.set(0, 14, 2); shade.visible = camTo < .5; lampShade = shade; scene.add(shade); }
    boardLight(TT, scene, (plain ? .12 : mode === 'night' ? .38 : mode === 'evening' ? .3 : .2) * (plain ? 1 : OLD_DIM.board));   // (the chabudai: toned down like the other first places)
    if (!plain) key.intensity *= OLD_DIM.key;
    baseExp = PL && PL.exp ? PL.exp : L.exp * (plain ? .8 : OLD_DIM.exp); if (R) R.toneMappingExposure = expo(baseExp);
    scene.background = plain && localFloor ? null : new TT.Color(plain === 'tatami' ? '#6f6a40' : plain ? '#8a5226' : L.sky[1]).convertSRGBToLinear();
    roomBg = scene.background; roomMode = mode;
  }
  function mount(container, opts = {}) {
    el = container;
    const coarse = COARSE, skinPage = !!opts.local;
    pr = Math.min(LITE ? 1.25 : coarse ? 1.5 : 2, window.devicePixelRatio || 1);   // (lite: 1.25×, not 1× — 1× looked blurry on phones)   // phones: 1.5x is sharp enough and ~45% fewer pixels than 2x; lite: 1x
    // skin pages drawn at 2x: no MSAA on top (the 2x pixels already smooth the edges; MSAA would multiply the fill and memory again)
    R = new (T().WebGLRenderer)({ antialias: !LITE && !(skinPage && pr >= 2), alpha: true, powerPreference: 'high-performance' });
    R.setPixelRatio(pr);
    R.shadowMap.enabled = true; R.shadowMap.type = LITE ? T().PCFShadowMap : T().PCFSoftShadowMap;
    // skin pages: a static shadow map, redrawn only while something moves (kick) or the board changes — not for a scroll / re-alignment
    if (skinPage) R.shadowMap.autoUpdate = false;
    R.outputEncoding = T().sRGBEncoding; R.toneMapping = T().ACESFilmicToneMapping; R.toneMappingExposure = expo(baseExp);
    container.appendChild(R.domElement);
    scene = new (T().Scene)();
    cam = new (T().PerspectiveCamera)(32, 1, .1, 900);   // (far: the places' rooms and the terrace's sea and sky lie up to ~500 away)
    const envMake = () => {
    // studio-like image-based lighting (soft boxes) for believable reflections on lacquer, stones and discs
    try {
      const env = new (T().Scene)(), TT = T();
      const sky = new TT.Mesh(new TT.SphereGeometry(30, 32, 16), new TT.MeshBasicMaterial({ side: TT.BackSide, vertexColors: true }));
      const col = [], pos = sky.geometry.attributes.position, c = new TT.Color();
      // tinted by the hour (see LOOK): reflections and ambient follow morning / day / evening / night
      const EV = !opts.plain && tblInfo && tblInfo.env;
      if (EV) {   // a table design's own reflections: a graded sky + its soft boxes (each capped at ENV_MAX: no white glare on glossy boards)
        const a = new TT.Color(EV.top).convertSRGBToLinear(), b = new TT.Color(EV.bottom).convertSRGBToLinear();
        for (let i = 0; i < pos.count; i++) { const y = (pos.getY(i) / 30 + 1) / 2; c.copy(b).lerp(a, y); col.push(c.r, c.g, c.b); }
        sky.geometry.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); env.add(sky);
        EV.panels.forEach(([x, y, z, w, h, hx, k]) => { const lc = new TT.Color(hx).convertSRGBToLinear().multiplyScalar(Math.min(k, ENV_MAX)); const p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: lc, side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p); });
        const pm = new TT.PMREMGenerator(R); scene.environment = pm.fromScene(env, .03).texture; pm.dispose(); envOK = true; return;
      }
      const Lk = LOOK[opts.plain ? 'day' : curTod()], tint = new TT.Color(Lk.hemi[0]).convertSRGBToLinear(), sunC = new TT.Color(Lk.sun).convertSRGBToLinear(), amt = Lk.hemi[2] / .5;
      for (let i = 0; i < pos.count; i++) { const y = Math.max(0, pos.getY(i) / 30), k = (.06 + .3 * y) * amt; c.setRGB(tint.r * k, tint.g * k, tint.b * k); col.push(c.r, c.g, c.b); }
      sky.geometry.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); env.add(sky);
      [[-8, 16, 6, 12, 7, 1.6], [10, 10, -6, 8, 6, .8], [0, 6, 18, 18, 4, .4]].forEach(([x, y, z, w, h, k]) => {
        const kk = k * Math.min(1.2, Lk.sunI + (Lk.lamp ? .25 : 0)), lc = Lk.lamp > 1 ? new TT.Color(0xffc98a).convertSRGBToLinear() : sunC;
        const p = new TT.Mesh(new TT.PlaneGeometry(w, h), new TT.MeshBasicMaterial({ color: new TT.Color(lc.r * kk, lc.g * kk, lc.b * kk), side: TT.DoubleSide })); p.position.set(x, y, z); p.lookAt(0, 0, 0); env.add(p);
      });
      const pm = new TT.PMREMGenerator(R); scene.environment = pm.fromScene(env, .03).texture; pm.dispose();
      envOK = true;
    } catch (e) {}
    };
    localFloor = !!opts.local; mountOpts = opts; envBuild = envMake;
    { const before = new Set(scene.children); buildRoom(scene, opts.plain || false); roomObjs = scene.children.filter(o => !before.has(o)); }
    envMake();
    root = new (T().Group)(); scene.add(root);
    // touch / mouse: drag to spin the board (any mode). A drag longer than a few px is not a click.
    // zoom (view mode): mouse wheel, or pinch with two fingers
    // … and while playing (2026-11-09): the wheel moves the camera in / out along its own line (pzoom, kept for the game)
    container.addEventListener('wheel', e => { if (e.ctrlKey) return; e.preventDefault();
      if (mode === 'play') { pzoomTo = Math.max(.6, Math.min(1.5, pzoomTo * Math.exp(e.deltaY * .0012))); kick(400); return; }
      zoomTo = Math.max(.55, Math.min(1.7, zoomTo * Math.exp(e.deltaY * .0012))); }, { passive: false });
    // … and while playing on a phone (2026-11-09): pinch moves the camera in / out (pzoom, as the wheel); the tap a finger of the
    // pinch would make is swallowed, so pinching never moves a piece
    const pts = new Map(); let pinch0 = 0, zoom0 = 1, pinchEnd = 0;
    const pdist = () => { const a = [...pts.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    container.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.size === 2) { pinch0 = pdist(); zoom0 = mode === 'play' ? pzoomTo : zoomTo; drag = null; } }, true);
    container.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch0) { const z = zoom0 * pinch0 / Math.max(10, pdist());
        if (mode === 'play') { pzoomTo = Math.max(.6, Math.min(1.5, z)); kick(400); } else zoomTo = Math.max(.55, Math.min(1.7, z));
        dragEnd = performance.now(); } }, true);
    const pup = e => { if (pinch0 || pts.size > 1) pinchEnd = performance.now(); pts.delete(e.pointerId); if (pts.size < 2) pinch0 = 0; };
    addEventListener('click', e => { if (performance.now() - pinchEnd < 450 && container.parentNode && container.parentNode.contains(e.target)) { e.stopPropagation(); e.preventDefault(); } }, true);
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
    wakeHooks();
    loop();
  }
  // the canvas always fills the screen (no seams); `inset` px at the bottom are covered by the info card,
  // so the camera frames the board inside the free area above it (view offset), easing when it changes
  let inset = 0, insetTo = 0, cw = 1, ch = 1;
  // hshift px: the picture is moved sideways inside the canvas (a shift lens) — Historia keeps its board beside the page this way,
  // so the canvas itself never moves and the room fills the whole screen
  let hshift = 0, hshiftTo = 0;
  // insetT px at the top: a band kept free above the board (the portal's phone-landscape game bar, app.js landSync)
  let insetT = 0, insetTTo = 0;
  let vsh = 0;   // px: the play view's vertical lens shift (centreBoard)
  function frame() {
    const free = Math.max(120, ch - inset - insetT);
    cam.aspect = cw / free;
    if (inset > .5 || insetT > .5 || Math.abs(hshift) > .5 || Math.abs(vsh) > .5) cam.setViewOffset(cw, free, -hshift, -insetT + vsh, cw, ch); else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }
  function setShift(px) { const v = px || 0; if (v === hshiftTo) return; hshiftTo = v; kick(900); }
  // glide: a timed ease-in-out of the camera (and the framing above the info card) instead of the soft exponential follow
  let glide = null;
  const ioC = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function setInset(px, top) { const v = Math.max(0, px || 0), vt = Math.max(0, top || 0); if (v === insetTo && vt === insetTTo) return; insetTo = v; insetTTo = vt; if (glide) glide.i1 = insetTo; kick(300); }   // (the same value again: nothing to draw)
  let sizeLate = false;
  function resize() {
    if (!R) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    // the online dock's FLIP (shared/headerbar.js, html.dock-anim): the canvas is stretched with its box meanwhile (the board in it
    // scales uniformly, so the old picture still fits) — the new drawing buffer is made once, at its end (see loop)
    if (alignFn && dockAnim() && R.domElement.width) { sizeLate = w !== cw || h !== ch; return; }
    sizeLate = false;
    if (w === cw && h === ch && R.domElement.width) { kick(300); return; }   // (the same size again: no new buffer)
    cw = w; ch = h; R.setSize(w, h, false); frame(); kick(300);
    // setSize clears the canvas: draw the new size right away, in this frame (a resize observer runs after the animation frame callbacks)
    if (alignFn && !document.hidden) { cancelAnimationFrame(rafId); rafId = 0; lastT = 0; loop(performance.now()); }
  }
  // camera distance keeps a ~11-unit board in frame for any aspect ratio
  // the board's own size (half of its larger footprint side, world units), measured once per board — the gallery frames it by it
  function boardR() {
    if (!cur) return 6.5; if (cur.userData._r) return cur.userData._r;
    // measured in the board's own frame: the turntable's yaw and the pop-in's scale/turn made a turned board's box wider (2026-11-09:
    // the phone framing came back small after stepping between games)
    const ry = root.rotation.y, cs = cur.scale.clone(), cr = cur.rotation.y, cp = cur.position.y;
    root.rotation.y = 0; cur.scale.setScalar(1); cur.rotation.y = 0; cur.position.y = 0; root.updateMatrixWorld(true);
    let bx, bb; try { bx = new (T().Box3)().setFromObject(cur); bb = boardBox(); } finally { root.rotation.y = ry; cur.scale.copy(cs); cur.rotation.y = cr; cur.position.y = cp; root.updateMatrixWorld(true); }
    try { const sz = bx.getSize(new (T().Vector3)()); if (!isFinite(sz.x) || sz.x <= 0) return 6.5;
      cur.userData._h = Math.max(.3, Math.min(6, sz.y));
      { const z2 = (bb || bx).getSize(new (T().Vector3)()); cur.userData._s = Math.max(z2.x, z2.z) / 2; cur.userData._rb = Math.max(2.5, Math.min(9, cur.userData._s * .7 + Math.hypot(z2.x, z2.z) / 2 * .3)); }
      return cur.userData._r = Math.max(2.5, Math.min(9, Math.max(sz.x, sz.z) / 2 * .7 + Math.hypot(sz.x, sz.z) / 2 * .3)); } catch (e) { return 6.5; }   // (between half its side and half its diagonal: the slow turntable only swings it a little)
  }
  // the board alone (no komadai, go bowls or pieces set aside) — the phone framing sizes by this (2026-11-09). Meshes are merged
  // (one mesh may hold a board and its bowls), so it works on the drawn footprint: every visible triangle's x–z box is filled into a
  // fine grid (3 cm cells: the komadai stand ~10 cm off the shogi board), and the largest connected patch is the board
  function boardBox() {
    const V = T().Vector3, tris = [], p = [new V(), new V(), new V()];
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
    cur.traverse(o => {
      if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position || o.isInstancedMesh) return;
      if (o.material && (o.material.visible === false || o.material.colorWrite === false)) return;
      const P = o.geometry.attributes.position, I = o.geometry.index, n = I ? I.count : P.count, M = o.matrixWorld;
      for (let i = 0; i + 2 < n; i += 3) {
        let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
        for (let j = 0; j < 3; j++) { const k = I ? I.getX(i + j) : i + j; p[j].fromBufferAttribute(P, k).applyMatrix4(M); a = Math.min(a, p[j].x); b = Math.max(b, p[j].x); c = Math.min(c, p[j].z); d = Math.max(d, p[j].z); }
        tris.push(a, b, c, d); x0 = Math.min(x0, a); x1 = Math.max(x1, b); z0 = Math.min(z0, c); z1 = Math.max(z1, d);
      }
    });
    if (!tris.length) return null;
    const cs = .03, W = Math.ceil((x1 - x0) / cs) + 1, H = Math.ceil((z1 - z0) / cs) + 1; if (W * H > 4e6) return null;
    const G = new Uint8Array(W * H);
    for (let i = 0; i < tris.length; i += 4) {
      const ia = Math.floor((tris[i] - x0) / cs), ib = Math.floor((tris[i + 1] - x0) / cs), ja = Math.floor((tris[i + 2] - z0) / cs), jb = Math.floor((tris[i + 3] - z0) / cs);
      for (let j = ja; j <= jb; j++) G.fill(1, j * W + ia, j * W + ib + 1);
    }
    // the largest 4-connected patch
    const lab = new Int32Array(W * H), st = new Int32Array(W * H); let best = 0, bb = null, id = 0;
    for (let s0 = 0; s0 < W * H; s0++) {
      if (!G[s0] || lab[s0]) continue; id++; let top = 0, cnt = 0, ia = W, ib = 0, ja = H, jb = 0; st[top++] = s0; lab[s0] = id;
      while (top) { const c = st[--top], i = c % W, j = (c - i) / W; cnt++; if (i < ia) ia = i; if (i > ib) ib = i; if (j < ja) ja = j; if (j > jb) jb = j;
        if (i > 0 && G[c - 1] && !lab[c - 1]) { lab[c - 1] = id; st[top++] = c - 1; } if (i < W - 1 && G[c + 1] && !lab[c + 1]) { lab[c + 1] = id; st[top++] = c + 1; }
        if (j > 0 && G[c - W] && !lab[c - W]) { lab[c - W] = id; st[top++] = c - W; } if (j < H - 1 && G[c + W] && !lab[c + W]) { lab[c + W] = id; st[top++] = c + W; } }
      if (cnt > best) { best = cnt; bb = [ia, ib, ja, jb]; }
    }
    const B = new (T().Box3)(); B.min.set(x0 + bb[0] * cs, 0, z0 + bb[2] * cs); B.max.set(x0 + (bb[1] + 1) * cs, 1, z0 + (bb[3] + 1) * cs); return B;
  }
  // play view: the framed rectangle (fit's w × d at its height y), as the tilted camera draws it, is centred between the top and the
  // bottom of the free view with a vertical lens shift (vsh px) — framing the look point alone left boards sitting low (2026-11-09)
  // fit.cy: the height of that rectangle when it is not y (a board framed round a point below its top: the legged goban)
  const ctrV = [];
  function centreBoard(F, k) {
    if (!ctrV.length) for (let i = 0; i < 4; i++) ctrV.push(new (T().Vector3)());
    cam.updateMatrixWorld();
    const yy = fitTo && fitTo.cy != null ? fitTo.cy : F.y;
    let lo = 9, hi = -9;
    for (let i = 0; i < 4; i++) { const v = ctrV[i].set(i & 1 ? F.w / 2 : -F.w / 2, yy, i & 2 ? F.d / 2 : -F.d / 2).project(cam); if (v.y < lo) lo = v.y; if (v.y > hi) hi = v.y; }
    const free = Math.max(120, ch - inset - insetT), m = (lo + hi) / 2, band = insetT + free / 2;   // (NDC spans the canvas, ch)
    if (!(hi - lo > .05)) return;
    const want = Math.max(-.3 * free, Math.min(.3 * free, vsh + ch / 2 * (1 - m) - band)) * Math.min(1, k * 1.2);
    if (Math.abs(want - vsh) > .5) { vsh = want; frame(); }
  }
  function camPose(k) {
    // the free part of the view: the shift lens (Historia's page beside the board) leaves (width − 2·shift) for the board
    const a = (cam.aspect || 1) * (hshift ? Math.max(.3, (cw - 2 * Math.abs(hshift)) / cw) : 1), th = Math.tan(cam.fov * Math.PI / 360);
    // keep the board (~10.5 wide incl. margin, ~9 deep) inside both the width and the height of the view
    const F = fitCur || fitTo, fw = F ? F.w / 2 : 6.0, fd = F ? F.d / 2 : 7.0;   // play view: frame the given board size (half extents + a small margin)
    // the gallery's showcase: the board itself (its turning footprint) takes ~65% of the free area's shorter side
    // the gallery's showcase: the board is the exhibit — its turning footprint fills ~88% of the free area's limiting side
    // (width: the half-diagonal; height: the footprint seen from the camera's low angle plus the pieces' height)
    const mr = museumOn && !k ? boardR() / .9 : 0, mh = mr ? (boardR() * .5 + ((cur && cur.userData._h) || 1) * .7) / .9 : 0;
    // phones (a narrow view): the showcase frames the board by its own size, so it reads ~1.45× larger than the fixed ~11-unit frame
    // (a chess board fills ~60% of the width); never further than that frame (big boards such as the legged goban stay as they were)
    const pr = !k && !mr && cw && cw < 700 ? Math.min(6.5, Math.max((boardR(), (cur && cur.userData._rb) || 6.5) * .92, ((cur && cur.userData._s) || 0) * 1.06)) : 0;   // (a long board such as Ur's: its long side kept clear of the edges)
    const needW = (k ? fw : mr || pr || 6.5) / (th * a), needH = (k ? fd : mh || (pr ? 6.8 * pr / 6.5 : 6.8)) / th;
    const dist = Math.max(needW, needH) * (k ? 1 : mr ? 1 : 1.08) * (1 + ((mr ? 1 : zoom) - 1) * (1 - k)) * (1 + (pzoom - 1) * k) * (orthoWant ? 1 + .14 * k : 1);   // ortho plan: the whole depth shows unforeshortened, so a little more room   // zoom applies to the showcase view only
    const pitch = .52 + k * ((orthoWant ? 1.5703 : F && F.pitch ? F.pitch : 1.34) - .52);   // ortho (Historia's diagram view): straight down   // play: nearly top-down (fit can ask for straight down)                       // view: low 3/4 so the room shows · play: nearly top-down
    return [0, dist * Math.sin(pitch), dist * Math.cos(pitch)];
  }
  // fit(o): play view frames a board of o.w × o.d world units whose top is at o.y (null = default); cleared by show()
  //   o.up: shift the board up the screen by that many world units (a bottom HUD); o.roll: the camera is rolled 90° (screen up = world −x; roll: -1 the other way, screen up = world +x): o.w then runs along the screen height, o.d along its width
  //   o.cx, o.cz: the point of the board (world units, board space) to frame instead of its middle (a game's focus on the player to move);
  //   o.ek: the easing rate (default .06; a quick move in on a chosen piece ~.2)
  //   o.ease: move there smoothly (pan and zoom on the camera's own pace) instead of a cut — Ludo's focus on the seat to move (phones)
  let fitTo = null, fitCur = null, fitRelease = false;
  const FIT_K = ['w', 'd', 'y', 'cx', 'cz', 'pitch'];
  function fitStep(ez) {   // fitCur: the framing as drawn; it eases toward fitTo when fitTo.ease, else it is fitTo
    if (!fitTo) { fitCur = null; return false; }
    const tv = k => k === 'pitch' ? (fitTo.pitch || 1.34) : (fitTo[k] || 0);
    if (!fitCur || !fitTo.ease) { fitCur = {}; FIT_K.forEach(k => { fitCur[k] = tv(k); }); return false; }
    let mv = false;
    FIT_K.forEach(k => { const t = tv(k), d = t - fitCur[k]; if (Math.abs(d) > 1e-4) { fitCur[k] += d * ez(fitTo.ek || .06); mv = true; } else fitCur[k] = t; });
    return mv;
  }
  function fit(o) { fitRelease = false; const v = o || null; if (v === fitTo || (v && fitTo && JSON.stringify(v) === JSON.stringify(fitTo))) return; fitTo = v; kick(300); }
  // show a board. opts.intro = a small "icon" model: it spins up first, then bursts into the board,
  // which lands with squash & stretch. opts.onSwap fires at the burst (for 2D effects).
  const ease = { outBack: k => 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), out3: k => 1 - Math.pow(1 - k, 3), in2: k => k * k };
  function dispose(o) { o.traverse(x => { if (x.geometry && !SHARED.has(x.geometry)) x.geometry.dispose(); }); }
  // free the GPU copies of the textures and the materials only the outgoing board used (every device: flicking through
  // every game otherwise piles up 150 MB+ of board textures; the canvases stay cached, so a revisit simply re-uploads them).
  // Shader programs are pinned first (see pinPrograms), so disposing a material never throws a program away → no recompiles.
  const TEXK = ['map', 'bumpMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'alphaMap', 'emissiveMap', 'aoMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap'];
  const matsOf = (o, set) => { o.traverse(x => { if (!x.material) return; if (Array.isArray(x.material)) x.material.forEach(m => m && set.add(m)); else set.add(x.material); }); return set; };
  function pinPrograms() {   // keep every compiled program alive for the session (a few dozen variants at most)
    const L = R && R.info.programs; if (L) for (const p of L) if (!p.__pin) { p.__pin = true; p.usedTimes++; }
  }
  function freeBoard(old, keep) {
    if (!old) return;
    const gm = matsOf(old, new Set()); if (!gm.size) return;
    const lm = new Set(); keep.forEach(o => o && matsOf(o, lm));
    const gt = new Set(), lt = new Set();
    const tx = (ms, set) => ms.forEach(m => TEXK.forEach(k => { const t = m[k]; if (t && t.isTexture && !t.isRenderTargetTexture) set.add(t); }));
    tx(gm, gt); tx(lm, lt);
    pinPrograms();
    gm.forEach(m => { if (!lm.has(m)) m.dispose(); });
    gt.forEach(t => { if (!lt.has(t) && t !== (scene && scene.environment)) t.dispose(); });
  }
  // the last few showcase boards stay built (merged, uploaded): ‹ › back to one, or coming back from a table game, is instant
  const KEEP_N = COARSE ? 2 : 3, kept = [];   // [{ id, c, st }]
  // the settings a showcase board is built from (the goban look, the backgammon checker colours): a kept / prepared board is
  // only reused while they are unchanged (a table game can change them)
  const stamp = () => { try { const ls = localStorage; let ck = ''; try { ck = JSON.stringify(JSON.parse(ls.getItem('aicoding-backgammon-v2') || '{}').settings.ck || ''); } catch (e) {} return (ls.getItem('atlas-go-look') || '') + '|' + (ls.getItem('atlas-gomoku-look') || '') + '|' + ck + '|' + ['atlas-chess-pc', 'atlas-chess-pc-bd', 'atlas-bg-look', 'atlas-agon-look', 'atlas-agon-look3', 'atlas-konane-look', 'atlas-carrom-look', 'atlas-crokinole-look', 'atlas-ludo-look', 'atlas-hockey-look'].map(k => ls.getItem(k) || '').join(',') + '|' + (() => { try { return (JSON.parse(ls.getItem('aicoding-senet') || '{}').settings || {}).design || ''; } catch (e) { return ''; } })(); } catch (e) { return ''; } };
  function keepBoard(id, c, next) {
    kept.push({ id, c, st: c.userData.st ?? stamp() });   // (the settings it was built with: a board changed just now is not kept as the new look)
    while (kept.length > KEEP_N) { const k = kept.shift(); dispose(k.c); freeBoard(k.c, [scene, next, ...kept.map(e => e.c)]); }
  }
  function takeKept(id) {
    const i = kept.findIndex(e => e.id === id); if (i < 0) return null;
    const k = kept.splice(i, 1)[0];
    if (k.st !== stamp()) { dispose(k.c); freeBoard(k.c, [scene, cur, ...kept.map(e => e.c)]); return null; }   // its look changed meanwhile: build afresh
    return k.c.children[0] || null;
  }
  // build (and compile shaders for) a board ahead of time, e.g. on pointerdown, so the transition doesn't hitch
  const prepared = {};
  function prepare(id, extra) {
    if (!R || prepared[id] || !MODELS[id]) return;
    if (kept.some(e => e.id === id)) return;
    const g = MODELS[id](), tmp = new (T().Scene)(); tmp.add(g); if (extra) tmp.add(extra);
    g.userData.merged = true; try { mergeStatic(g); } catch (e) {}   // merged here (idle time), not at the swap
    try { R.compile(tmp, cam); } catch (e) {}
    tmp.remove(g); if (extra) tmp.remove(extra);
    prepared[id] = { g, extra, st: stamp() };
  }
  function take(id) { const p = prepared[id]; delete prepared[id]; return p && p.st === stamp() ? p : null; }
  function show(id, model, opts = {}) {
    if (!R) return null;
    // (soft = back from a game: the play framing stays until the camera's glide has left it — clearing it here made the camera
    // jump to an un-framed play pose first and then glide down: the 'bounce', 2026-11-09)
    mode = 'view'; camTo = 0; spin = true; yaw = 0; vel = 0; tilt = 0; idleT = performance.now(); zoomTo = 1; pzoomTo = 1;
    if (opts.soft && fitTo) fitRelease = true; else fitTo = null; kick(400);
    const old = cur;
    const back = !model && takeKept(id);
    if (old) root.remove(old);
    const pre = !model && !back && take(id);
    const g = model || back || (pre && pre.g) || (MODELS[id] ? MODELS[id]() : null);
    // a board taken back from the cache wears the look chosen now (chess: the lacquer's top is one material shared by every board, so the
    // board built for another look had left its own top on it — 赤い盤 → もう片方 kept showing the red top)
    { const BD = window.Table3D && Table3D.BOARDS; if (back && back.userData && back.userData.setSet && BD && BD[id]) { try { back.userData.setSet(BD[id].get()); } catch (e) {} } }
    if (old) {
      if (old.userData.showId && old.children[0] !== g) keepBoard(old.userData.showId, old, g);   // a showcase board: kept for a while
      else if (old.children[0] !== g) { dispose(old); freeBoard(old, [scene, g, ...kept.map(e => e.c)]); }   // a game's live board: freed at once (the room, the incoming board and the kept ones keep theirs)
    }
    if (opts.introFromCache) opts.intro = (pre && pre.extra) || (window.Icons3D && Icons3D.ICONS[id] ? Icons3D.ICONS[id]() : null);
    cur = null; if (!g) return null;
    if (!model && !g.userData.merged) { g.userData.merged = true; try { mergeStatic(g); } catch (e) {} }   // the showcase boards are static: fewer draw calls (stones, pieces, bowls…)
    const c = new (T().Group)(); c.add(g); cur = c; if (!model) c.userData.showId = id; c.userData.st = stamp(); c.userData.gameId = id;
    if (tblInfo && tblInfo.onShow) try { tblInfo.onShow(id); } catch (e) {}
    const land = () => {        // board drops in and lands with squash & stretch
      root.add(c);
      const t0 = performance.now();
      (function anim(now) {
        const t = now - t0; let y = 0, sy = 1, sxz = 1;
        if (t < 150) { const k = ease.in2(t / 150); y = 3.2 * (1 - k); sy = 1.12; sxz = .9; }
        else if (t < 250) { const k = (t - 150) / 100; sy = 1.12 - .44 * Math.sin(k * Math.PI / 2); sxz = .9 + .26 * Math.sin(k * Math.PI / 2); }
        else if (t < 430) { const k = ease.out3((t - 250) / 180); sy = .68 + .4 * k; sxz = 1.16 - .2 * k; }
        else if (t < 560) { const k = ease.out3((t - 430) / 130); sy = 1.08 - .08 * k; sxz = .96 + .04 * k; }
        c.position.y = y; c.scale.set(sxz, sy, sxz); kick(120);
        if (t < 560 && cur === c) requestAnimationFrame(anim); else c.scale.set(1, 1, 1);
      })(t0);
    };
    if (opts.soft) {            // back from a game on the table: the showcase board settles in without a bounce — a short ease-out
      root.add(c); const t0 = performance.now();   // (from a hair above, with the camera's glide) (2026-11-09: the drop's squash read as a bounce)
      (function anim(now) { const k = Math.min(1, (now - t0) / 340), e = ease.out3(k); c.position.y = (1 - e) * .35; kick(120);
        if (k < 1 && cur === c) requestAnimationFrame(anim); else c.position.y = 0; })(t0);
      dirty = shadowDirty = true; return g;
    }
    if (opts.magic) {           // materialise: grows out of the smoke with a little twist and overshoot
      root.add(c); c.visible = false; c.scale.setScalar(.02);
      const go = () => { if (cur !== c || c.visible) return; c.visible = true; const t0 = performance.now();
      (function anim(now) {
        const k = Math.min(1, (now - t0) / 480), e = k === 1 ? 1 : 1 - Math.pow(2, -8 * k) * Math.cos(k * 9.5);
        c.scale.setScalar(Math.max(.02, e)); c.rotation.y = (1 - ease.out3(k)) * -.9; c.position.y = (1 - ease.out3(k)) * 1.2; kick(120);
        if (k < 1 && cur === c) requestAnimationFrame(anim); else { c.scale.set(1, 1, 1); c.rotation.y = 0; c.position.y = 0; }
      })(t0); };
      if (opts.hold) { revealFn = go; setTimeout(go, 1500); } else go();   // hold: wait for reveal() (the moment the icon vanishes)
      return g;
    }
    if (opts.still) { root.add(c); dirty = shadowDirty = true; fitShadow(); return g; }   // no entrance animation (skin pages: the board is simply there)
    if (!opts.intro) { land(); return g; }
    // intro: the icon spins one turn while it grows and rises, then pops
    const ic = new (T().Group)(); ic.add(opts.intro); root.add(ic); spin = false; yaw = 0;
    const t0 = performance.now(), S0 = opts.introScale || 1.7, D = 380;
    (function anim(now) {
      const k = Math.min(1, (now - t0) / D);
      const s = S0 * (.55 + .45 * ease.outBack(k));
      ic.scale.setScalar(s); ic.position.y = Math.sin(k * Math.PI) * 1.4;
      ic.rotation.y = Math.PI / 4 - (1 - ease.out3(k)) * Math.PI * 2; kick(120);
      if (k < 1 && cur === c) return requestAnimationFrame(anim);
      root.remove(ic); dispose(ic);
      if (cur !== c) return;
      if (opts.onSwap) opts.onSwap();
      land(); spin = true;
    })(t0);
    return g;
  }
  let revealFn = null;
  function reveal() { const f = revealFn; revealFn = null; if (f) f(); kick(300); }
  let lampShade = null;
  // play(on, {ortho:true}) (Historia's 「盤」 chapter): the top view becomes a true orthographic plan — no perspective, nothing leans.
  // The projection blends from perspective to ortho with the camera move (and back on the way down), see orthoBlend
  let orthoWant = false, orthoW = 0, camLook = 0;
  function play(on, o) {   // (the ceiling lamp's shade hides while the camera looks down at a game: see loop)
    if (on) orthoWant = !!(o && o.ortho);
    if (o && o.glide) glide = { t: 0, dur: o.glide, k0: camK, i0: inset, i1: insetTo, v0: vsh, t0: insetT };   // (t0: the top band glides on the same curve — it used to snap away first)
    mode = on ? 'play' : 'view'; camTo = on ? 1 : 0; spin = !on; idleT = 0; drag = null; vel = 0; tilt = 0; kick(400); }
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
  // the gallery's shaders are compiled ahead, off screen, once it is up — the first camera move then never stalls on compiles
  let museumWarm = false;
  function warmMuseum() { if (museumWarm || !R || !scene || !cam) return; museumWarm = true; try { R.compile(scene, cam); } catch (e) {} }
  // quiet(true) (Historia on phones while a page is read): the turntable holds still and a frame is drawn only when something
  // actually moved (the camera, the framing, a kick) — the showcase otherwise redraws the whole gallery every frame
  let quietOn = false, quietKey = '';
  function quiet(on) { quietOn = !!on; quietKey = ''; kick(300); }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(rafId); rafId = 0; } else kick(300); });
  // window not focused (another window or the browser's side panel in front): no continuous rendering, but the picture stays —
  // anything that would change it (a resize: the side panel narrows the window, a move, the camera following the board) still
  // draws, in a short burst of frames that then stops again (the canvas is cleared by a resize, so it must be drawn once more)
  let blurBurst = 0;
  addEventListener('blur', () => { blurred = true; blurBurst = performance.now() + 400; wake(); }); addEventListener('focus', () => { blurred = false; kick(300); });
  // on-demand rendering (shared rule for every 3D skin): a frame is drawn only while something moves —
  // a kick(ms) from an animation, a changed board rect / canvas size, or dirty; otherwise the GPU stays idle
  let lastKey = null, kickUntil = 0, dirty = true, lastDraw = 0;
  addEventListener('resize', () => kick(300));
  const ALIGN_FOV = 40, ALIGN_SHIFT = .9;
  const dockAnim = () => document.documentElement.classList.contains('dock-anim');
  // the FLIP's end (shared/headerbar.js 'dockrelayout' with detail.final, in the task that takes the transform off): the new buffer
  // and the new picture right away, so the same frame shows the board crisp at its place — no snap afterwards
  addEventListener('dockrelayout', e => {
    if (!e.detail || !e.detail.final) return;
    queueMicrotask(() => {   // (after the skins' own listeners have placed the canvas box for the final layout; still before the paint)
      if (!R || !alignFn || dockAnim() || document.hidden) return;
      if (el.clientWidth !== cw || el.clientHeight !== ch || sizeLate) { sizeLate = false; resize(); return; }
      kick(300); cancelAnimationFrame(rafId); rafId = 0; lastT = 0; loop(performance.now());
    });
  });
  function kick(ms = 700) { kickUntil = Math.max(kickUntil, performance.now() + ms); dirty = true; shadowDirty = true; if (blurred) blurBurst = Math.max(blurBurst, performance.now() + Math.min(ms, 700) + 150); wake(); }
  // the loop runs only while something needs frames and stops by itself afterwards (0 callbacks while idle — battery):
  // wake() restarts it at once; poke(ms) asks it only to look whether the DOM board / the canvas moved or appeared
  // (a frame is drawn only if it did) — for layout changes nobody announces (a class, a transition, a scroll, a late font)
  let checkUntil = 0, wasHidden = false;
  let parked = true;   // the loop has stopped: its first frame again starts the clock afresh (no jump for the time it slept)
  function wake() { if (!rafId && R && !document.hidden && (!blurred || performance.now() < blurBurst)) rafId = requestAnimationFrame(loop); }
  // (quiet — Historia's page over the room on phones — : the page's own class changes, animations and scrolling are not looked at;
  // Historia announces every change of the stage itself — setInset / play / museum kick)
  function poke(ms = 250) { if (quietOn) return; checkUntil = Math.max(checkUntil, performance.now() + ms); if (blurred) blurBurst = Math.max(blurBurst, performance.now() + Math.min(ms, 700) + 150); wake(); }
  let hooked = false;
  function wakeHooks() {
    if (hooked) return; hooked = true;
    try {   // a texture uploaded again (a texgen picture done, a loaded image, a redrawn canvas): a frame for it
      const TP = T().Texture.prototype, d = Object.getOwnPropertyDescriptor(TP, 'needsUpdate');
      if (d && d.set) Object.defineProperty(TP, 'needsUpdate', { configurable: true, get: d.get, set(v) { d.set.call(this, v); if (v === true && R) kick(150); } });
    } catch (e) {}
    const de = document.documentElement, pk = () => poke(), pkLong = () => poke(600);
    // (an attribute written with its old value — a clock re-setting its class — or a text change is no layout change: ignored)
    // (the 3D room — portal, Historia — only needs to see its canvas appear: a style written by a page's own JS animation, e.g. the
    // portal's floating pieces 30×/s, is not looked at there)
    const real = m => m.type === 'attributes' ? m.oldValue !== m.target.getAttribute(m.attributeName) && (alignFn || m.attributeName !== 'style') : [...m.addedNodes, ...m.removedNodes].some(n => n.nodeType === 1);
    try { new MutationObserver(ms => { if (ms.some(real)) pk(); })
      .observe(de, { subtree: true, childList: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'style', 'hidden', 'open'] }); } catch (e) {}
    ['transitionrun', 'transitionend', 'transitioncancel', 'animationstart', 'animationend'].forEach(t => document.addEventListener(t, pkLong, true));
    ['scroll', 'load'].forEach(t => document.addEventListener(t, pk, { capture: true, passive: true }));
    // input: the skin pages kick for what they change themselves (a look is enough); the 3D room (portal, Historia, a game or the rules
    // on the table) draws a moment after it too — a safety net for a handler that changes the scene without a kick
    const inp = e => { if (quietOn && !(el && el.parentNode && e && el.parentNode.contains(e.target))) return;   // (quiet: a tap or a scroll on Historia's page is no reason to redraw the room)
      if (alignFn) poke(); else if (R && el && el.offsetParent) kick(400); else poke(); };
    ['pointerdown', 'pointerup', 'keydown', 'wheel'].forEach(t => addEventListener(t, inp, { capture: true, passive: true }));
    if (window.visualViewport) visualViewport.addEventListener('resize', () => kick(300));
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', pk);
  }
  /* ---------- auto-instancing (skin pages) ----------
     The skins keep one Group per piece (they move, lift, flip and fade them one by one). Right before each frame, every visible
     mesh that shares its geometry and material with others is drawn through one InstancedMesh per (geometry, material, mirrored)
     instead: the originals are moved to layer 1 (not seen by the camera nor the shadow pass) and their world matrices copied in.
     A board of 24 checkers + mirror images + contact shadows: ~80 draw calls → ~10. Nothing changes for the skins. */
  let instSig = 0;
  const INST = new Map(), instHidden = [], contactMats = new Map(), _m4 = { a: null, flip: null };
  function contactMatFor(src) {   // contact shadows each own a material (their opacity is animated): those at the same opacity share one
    const k = Math.round(src.opacity * 100); let m = contactMats.get(k);
    if (!m) { m = src.clone(); m.opacity = k / 100; contactMats.set(k, m); }
    return m;
  }
  function instBucket(geo, mat, neg) {
    let byM = INST.get(geo); if (!byM) INST.set(geo, byM = new Map());
    let pair = byM.get(mat); if (!pair) byM.set(mat, pair = [null, null]);
    const i = neg ? 1 : 0; return pair[i] || (pair[i] = { geo, mat, neg, list: [], im: null, cast: false, recv: false, ro: 0 });
  }
  function instCollect(o, ctr) {
    if (!o.visible) return;
    if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.geometry && o.material && !Array.isArray(o.material) && !o.userData.noInst && !o.userData.merged) {
      const ct = o.userData.contact && o.material.isMeshBasicMaterial;
      const mat = ct ? contactMatFor(o.material) : o.material;
      const b = instBucket(o.geometry, mat, o.matrixWorld.determinant() < 0);
      if (!b.list.length) { b.cast = o.castShadow; b.recv = o.receiveShadow; b.ro = o.renderOrder; }
      if (b.cast === o.castShadow && b.recv === o.receiveShadow && b.ro === o.renderOrder) b.list.push(o);
    }
    const ch = o.children; for (let i = 0; i < ch.length; i++) instCollect(ch[i], ctr);
  }
  function autoInstance(top) {
    for (let i = 0; i < instHidden.length; i++) instHidden[i].layers.set(0);
    instHidden.length = 0;
    if (!top || !top.parent) return;
    const TT = T(); if (rootDirty) { root.updateMatrixWorld(true); rootDirty = false; } else top.updateMatrixWorld(true);   // (the 盤面反転 turn moves root: the copies follow in the same frame)
    if (!_m4.a) { _m4.a = new TT.Matrix4(); _m4.flip = new TT.Matrix4().makeScale(1, -1, 1); }
    instCollect(top); let sig = 0;
    INST.forEach((byM, geo) => byM.forEach((pair, mat) => { for (let j = 0; j < 2; j++) {
      const b = pair[j]; if (!b) continue;
      const n = b.list.length;
      if (n < 2) {   // a single one draws itself; an unused InstancedMesh is dropped
        if (b.im && !n) { scene.remove(b.im); b.im.dispose(); b.im = null; }
        if (b.im) b.im.visible = false;
        if (!n && !b.im) { pair[j] = null; if (!pair[0] && !pair[1]) { byM.delete(mat); if (!byM.size) INST.delete(geo); } }
        b.list.length = 0; continue;
      }
      if (!b.im || b.im.instanceMatrix.count < n) {
        if (b.im) { scene.remove(b.im); b.im.dispose(); }
        let cap = 8; while (cap < n) cap *= 2;
        b.im = new TT.InstancedMesh(geo, mat, cap); b.im.frustumCulled = false; b.im.instanceMatrix.setUsage(TT.DynamicDrawUsage);
        b.im.matrixAutoUpdate = false; if (b.neg) { b.im.matrix.copy(_m4.flip); } b.im.matrixWorld.copy(b.im.matrix); b.im.userData.noInst = true;
        scene.add(b.im);
      }
      const im = b.im; im.visible = true; im.count = n; im.castShadow = b.cast; im.receiveShadow = b.recv; im.renderOrder = b.ro;
      for (let i = 0; i < n; i++) {
        const o = b.list[i];
        if (b.neg) { _m4.a.multiplyMatrices(_m4.flip, o.matrixWorld); im.setMatrixAt(i, _m4.a); } else im.setMatrixAt(i, o.matrixWorld);   // a mirrored one: the InstancedMesh itself is flipped (so the renderer turns the winding), the flip undone per instance
        o.layers.set(1); instHidden.push(o);
      }
      im.instanceMatrix.needsUpdate = true; b.list.length = 0; sig += n * 31 + im.id;
    } }));
    if (sig !== instSig) { instSig = sig; shadowDirty = true; }   // pieces added / removed without a kick: the static shadow map still follows
    if (!INST.size) contactMats.forEach(m => m.dispose()), contactMats.clear();
  }
  // skin pages: fit the key light's shadow camera round the board (the room's ±12 box wasted 3/4 of the map on the empty floor)
  const _box = { b: null, v: null };
  function fitShadow() {
    if (!keyLight || !alignFn || !cur) return;
    const TT = T(); _box.b = _box.b || new TT.Box3(); _box.v = _box.v || new TT.Vector3();
    cur.updateMatrixWorld(true); _box.b.setFromObject(cur); if (_box.b.isEmpty()) return;
    const r = _box.b.getBoundingSphere(new TT.Sphere()), e = r.radius + r.center.length() + .6;   // light looks at the origin: centre offset + a little slack for lifted pieces
    const c = keyLight.shadow.camera; if (Math.abs(c.right - e) < .05) return;
    Object.assign(c, { left: -e, right: e, top: e, bottom: -e }); c.updateProjectionMatrix(); shadowDirty = true;
  }
  // adaptive resolution: while something animates, watch the frame interval; if a phone can't keep up (median > 34 ms),
  // drop to 1× pixels at once and remember 'lite' for the next visit (half-size textures, small shadows)
  // (only after the first 4 s — textures and shaders are still being built then — and only when two windows in a row are slow;
  //  the step down is to 1.25×, never below)
  let pr = 1, slow = [], slowDone = false, slowHits = 0; const t0Speed = performance.now();
  function watchSpeed(dt) {
    if (slowDone || !COARSE || !R || performance.now() - t0Speed < 4000) return;
    slow.push(dt); if (slow.length < 40) return;
    const med = slow.slice().sort((a, b) => a - b)[20]; slow = [];
    if (med > 40) {
      if (++slowHits < 2) return;
      const lo = Math.min(1.25, window.devicePixelRatio || 1);
      if (pr > lo) { pr = lo; R.setPixelRatio(lo); frame(); kick(300); }
      try { localStorage.setItem('atlas-lite2', String(Date.now())); } catch (e) {}
      slowDone = true;
    } else { slowHits = 0; if (med < 22) slowDone = true; }   // fast enough: stop measuring
  }
  // one frame; the next one is asked for only while step() says something still needs frames
  function loop(now = performance.now()) {
    rafId = 0;
    if (document.hidden || !R) { parked = true; return; }
    if (parked) { parked = false; lastT = 0; }
    const more = step(now);
    if (rafId) return;   // (a kick inside the frame — or a resize() drawing at once — has asked for the next one already)
    if (more && !document.hidden) rafId = requestAnimationFrame(loop); else parked = true;
  }
  function step(now) {
    if (!el.offsetParent && !alignFn) { wasHidden = true; return now <= checkUntil; }   // the canvas is hidden: a poke (its class / style changed) looks again
    if (wasHidden) { wasHidden = false; kick(300); }
    if (blurred && now > blurBurst) return false;   // window not focused: only the short bursts above (resumes fully on focus)
    if (now - lastT < FRAME_MS - 2) return true;
    const dt = Math.min(250, now - (lastT || now)); lastT = now;
    let moving = false;   // anything below still easing / turning: more frames
    const ez = r => 1 - Math.pow(1 - r, dt / 16.7);   // per-60fps-frame easing → same speed on slow devices
    if (glide) {
      glide.t += Math.min(dt, 50); const k = Math.min(1, glide.t / glide.dur), e = ioC(k);   // one ease-in-out for everything that moves   // (a frame advances at most 50 ms: smooth steps, and a stall never makes it jump)   // quick out, soft landing; time advances at most 2 frames per frame, so a stall (building the board) never makes it jump
      camK = glide.k0 + (camTo - glide.k0) * e; inset = glide.i0 + (glide.i1 - glide.i0) * e; if (fitRelease && glide.v0 != null) vsh = glide.v0 * (1 - e); if (glide.t0 != null) insetT = glide.t0 + (insetTTo - glide.t0) * e; frame();   // the framing reaches its end on the same curve   // the framing follows smoothly even if the card changes size meanwhile
      if (k >= 1) { camK = camTo; inset = glide.i1; insetT = insetTTo; glide = null; if (fitRelease) { fitRelease = false; vsh = 0; if (camTo === 0) fitTo = null; } frame(); }
      moving = true;
    } else if (Math.abs(camTo - camK) > 1e-5) { camK += (camTo - camK) * ez(.07); moving = true; } else camK = camTo;
    if (Math.abs(zoomTo - zoom) > 1e-5) { zoom += (zoomTo - zoom) * ez(.18); moving = true; } else zoom = zoomTo;
    if (Math.abs(pzoomTo - pzoom) > 1e-5) { pzoom += (pzoomTo - pzoom) * ez(.18); moving = true; } else pzoom = pzoomTo;
    if (fitStep(ez)) moving = true;
    if (glide) {} else if (Math.abs(insetTo - inset) > .5) { inset += (insetTo - inset) * ez(.07); frame(); moving = true; }   // same pace as the camera, frame-rate independent
    else if (inset !== insetTo) { inset = insetTo; frame(); moving = true; }
    if (glide) {} else if (Math.abs(insetTTo - insetT) > .5) { insetT += (insetTTo - insetT) * ez(.12); frame(); moving = true; } else if (insetT !== insetTTo) { insetT = insetTTo; frame(); moving = true; }
    if (Math.abs(hshiftTo - hshift) > .5) { hshift += (hshiftTo - hshift) * ez(.09); frame(); moving = true; } else if (hshift !== hshiftTo) { hshift = hshiftTo; frame(); moving = true; }
    if (lampShade) lampShade.visible = !museumOn && mode !== 'play' && camK < .5;   // the ceiling lamp only shows once the camera is back down in the room
    if (viewOnly.length) { const on = !museumOn && mode !== 'play' && camK < .5; if (viewOnly[0].visible !== on) { viewOnly.forEach(x => { x.visible = on; }); dirty = true; } }   // (a place's lamp over the table: never between the play camera and the board)
    if (!drag) { yaw += vel; vel *= .94; if (Math.abs(vel) < .0004) vel = 0; tilt *= .96; if (Math.abs(tilt) < 1e-5) tilt = 0; } else moving = true;
    if (vel || tilt) moving = true;
    if (!drag && !vel && mode === 'view' && !quietOn && performance.now() - idleT > 2500) yaw += .004;   // gentle turntable when untouched
    if (mode === 'view' && !quietOn && !alignFn) moving = true;   // (the showcase turns — or is about to — : it keeps the frames coming, as designed)
    if (mode === 'play' && tYaw !== null) { yaw = tYaw; vel = 0; }   // the 盤面反転 turn (turn()): the angle is given
    else if (mode === 'play') {   // in a game the board stays still, squared to the player
      const home = Math.round(yaw / (Math.PI * 2)) * Math.PI * 2; if (Math.abs(home - yaw) > 1e-5) { yaw += (home - yaw) * .15; moving = true; } else yaw = home; vel = 0;
    }
    root.rotation.y = yaw;
    { // the turn's scale: about the floor (the board and its legs stay standing on the table — its shadow stays put under it),
      // enlarged a hair so the field (lower now, further from the camera) still looks exactly s × its size, like the DOM board on top
      const s = tYaw !== null ? tS : 1, H0 = Math.max(1, cam.position.y - (alignTop || 0)), t = alignTop || 0, k = s === 1 ? 1 : s * (H0 + t) / (H0 + s * t);
      if (root.scale.x !== k) { root.scale.setScalar(k); root.position.y = 0; rootDirty = true; } }
    const ticking = roomTicks.length && !alignFn && !(quietOn && now > kickUntil);
    if (ticking) { const ts = now / 1000; for (const f of roomTicks) f(ts); }
    // the online dock's move / resize (shared/headerbar.js, html.dock-anim): the canvas is scaled and moved with the board by the
    // page's FLIP transform, so the last picture is held as it is — a new drawing at the new size inside the old buffer showed
    // the board at a wrong size until the end; the crisp one is drawn at once when the transform is taken off (dockFinal)
    if (alignFn && dockAnim()) return true;
    if (alignFn && sizeLate) { resize(); return true; }   // (resize() draws the new size itself)
    const more = () => moving || dirty || now <= kickUntil || now <= checkUntil;
    if (alignFn) {   // skin mode: a straight top-down camera so the 3D field lands exactly on a DOM rectangle
      // idle: the loop has stopped; a kick(), a resize or a poke() (the page's layout may have moved the DOM board) runs it again,
      // and while the board's rect keeps changing it is followed for another second
      const r = alignFn(); if (r && r.w > 10) {
        const W = cw, H = ch, half = (alignSize || 8.4) / 2, top = alignTop || .43;
        // match the DOM board's CSS transform: perspective(P px) rotateX(tilt) about its centre = a pinhole camera P px in front
        // of the board centre, the field leaning back by `tilt`; the principal point is moved onto the board centre
        // r.shift (world units, optional): a shift lens — the camera stands that far towards the player but still looks straight down,
        // so the field keeps its exact square on the DOM board while the near side of a thick board (and its legs) comes into view
        const unit = r.h / ((alignSize || 8.4)), P = r.persp || r.h * 3, tl = (r.tilt || 0) * Math.PI / 180, D = P / unit, sh = r.shift || 0;
        cam.fov = 2 * Math.atan(H / 2 / P) * 180 / Math.PI; cam.aspect = W / H; cam.near = .1;
        cam.position.set(0, top + D * Math.cos(tl), D * Math.sin(tl) + sh); cam.up.set(0, Math.sin(tl), -Math.cos(tl)); cam.lookAt(0, top, sh);
        const LK = lastKey || (lastKey = [NaN, 0, 0, 0, 0, 0]), same = Math.abs(LK[0] - r.x) < .05 && Math.abs(LK[1] - r.y) < .05 && Math.abs(LK[2] - r.w) < .05 && Math.abs(LK[3] - r.h) < .05 && LK[4] === W && LK[5] === H;
        // (the online dock's move / resize, shared/headerbar.js html.dock-anim: the page slides the board with a CSS transform —
        // the picture is right as long as the board's place in the canvas is the same: the kicks of the resize are not redrawn)
        if (same && now > kickUntil && !dirty) return more();
        if (!same) checkUntil = Math.max(checkUntil, now + 1000);
        LK[0] = r.x; LK[1] = r.y; LK[2] = r.w; LK[3] = r.h; LK[4] = W; LK[5] = H; if (now > kickUntil) dirty = false;

        cam.setViewOffset(W, H, W / 2 - (r.x + r.w / 2), H / 2 - (r.y + r.h / 2) - sh * unit, W, H); cam.updateProjectionMatrix();
        autoInstance(cur);
        if (!R.shadowMap.autoUpdate) { R.shadowMap.needsUpdate = shadowDirty || now <= kickUntil; shadowDirty = false; }
        R.render(scene, cam); lastDraw = now; dbgTick(now); return more();
      }
    }
    const q = camPose(0), r2 = camPose(1), k = camK;
    const py = q[1] + (r2[1] - q[1]) * k, pz = q[2] + (r2[2] - q[2]) * k, d = Math.hypot(py, pz), a = Math.atan2(py, pz) + tilt;
    cam.position.set(0, d * Math.sin(a), d * Math.cos(a));
    // view mode: on phones the board sits above the info card, on wide screens to the right of it
    if (mode === 'view' && !blurred && dt > 0 && dt < 250) watchSpeed(dt);   // the showcase renders every frame: a good place to measure
    { const m0 = cur && cur.children[0], vy = (m0 && m0.userData.viewY) || .4;   // a tall board (legged goban) asks to be framed around its own middle
      const F = fitCur || fitTo, ly = F ? vy + (F.y - vy) * camK : vy, fcx = F && F.cx ? F.cx * camK : 0, fcz = F && F.cz ? F.cz * camK : 0; cam.position.y += ly - .4; const rl = fitTo && fitTo.roll ? camK : 0, rs = fitTo && fitTo.roll === -1 ? -1 : 1; cam.up.set(-rl * rs, 1 - rl, 0);
      const sh = fitTo && fitTo.up ? fitTo.up * camK : 0, ux = rl ? -rs : 0, uz = rl ? 0 : -1;   // fit.up: the board sits this far (world units) above the middle of the view (clear of a HUD at the bottom)
      cam.position.x += fcx - ux * sh; cam.position.z += fcz - uz * sh; cam.lookAt(fcx - ux * sh, ly, fcz - uz * sh); camLook = ly;
      // play view: centre the board itself (its bounding box as drawn) between the top and the bottom of the free view — with the
      // camera tilted, framing the look point left boards sitting low (2026-11-09). Not with a focus point (cx/cz), fit.up or a roll.
      if (fitRelease) {} else if (F && k > .01 && !rl && !sh && !fcx && !fcz && !orthoWant) centreBoard(F, k); else if (vsh) { vsh = 0; frame(); } }   // (fitRelease: the glide back eases vsh to 0 itself)   // fit.roll: the view is turned 90° (a landscape view on a portrait screen held sideways)   // the canvas itself is kept clear of the info card (app.js fitStage)
    // the near plane follows the camera's distance (a far camera — the gallery's showcase — with near .1 had too little depth
    // precision left at the board: inlays and piece faces a few thousandths above a surface flickered as it turned)
    { const nn = Math.min(2, Math.max(.1, d * .05)); if (Math.abs(cam.near - nn) > .01) { cam.near = nn; cam.updateProjectionMatrix(); dirty = true; } }
    orthoBlend(orthoWant ? camK : 0);   // (the projection flattens on the camera's own curve: it lands with it, no late zoom)
    if (museumOn) glare(camK);
    // the room's own life (PC: the characters breathe and blink, the castle flag waves, the TV flickers) keeps the frames coming
    // while one of them is in the picture — e.g. a character at the edge of a game on the table; out of the picture it waits
    if (ticking && !moving && !museumOn && tickSeen()) moving = true;
    if (quietOn) {
      const e = cam.projectionMatrix.elements, kq = [cam.position.x, cam.position.y, cam.position.z, yaw, e[0], e[5], e[8], e[9], e[11], cw, ch].map(v => v.toFixed(4)).join();
      if (kq === quietKey && now > kickUntil && !dirty) return more();
      quietKey = kq; dirty = false;
    } else if (!moving && !dirty && now > kickUntil) return more();   // nothing changed: no frame (the showcase's turntable counts as moving)
    R.render(scene, cam); lastDraw = now; dbgTick(now); if (now > kickUntil) dirty = false;
    if (DOF_OK && mode === 'view' && !museumOn && !quietOn) dof();
    return more();
  }
  /* ---------- a light depth of field (PC, the portal's room): what lies beyond the board goes softly out of focus ----------
     No second scene render: the finished frame is copied (copyFramebufferToTexture), blurred at half size in two passes
     (9 taps each) and laid back over the frame with a mask — clear on the board and in front of it, blurring in above the
     board's far edge (farther away in this slanted view) and a little toward the sides. Costs a copy and three cheap
     full-screen passes on the frames that are drawn anyway (the renderer stays on demand). Off on touch / lite devices. */
  const DOF_OK = !COARSE && !LITE && !/[?&]nodof\b/.test(location.search);
  let dofS = null;
  function dofInit(w, h) {
    const TT = T();
    if (dofS && dofS.w === w && dofS.h === h) return dofS;
    if (dofS) { dofS.tex.dispose(); dofS.a.dispose(); dofS.b.dispose(); }
    const tex = new TT.DataTexture(null, w, h, TT.RGBAFormat); tex.minFilter = tex.magFilter = TT.LinearFilter; tex.generateMipmaps = false;
    const o = { minFilter: TT.LinearFilter, magFilter: TT.LinearFilter, depthBuffer: false, stencilBuffer: false };
    const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1), a = new TT.WebGLRenderTarget(hw, hh, o), b = new TT.WebGLRenderTarget(hw, hh, o);
    if (!dofS) {
      const vs = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }';
      const blur = new TT.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new TT.Vector2() } }, vertexShader: vs, depthTest: false, depthWrite: false,
        fragmentShader: 'uniform sampler2D t; uniform vec2 d; varying vec2 vUv; void main(){ vec4 c = texture2D(t, vUv) * .2270; '
          + 'c += (texture2D(t, vUv + d * 1.3846) + texture2D(t, vUv - d * 1.3846)) * .3162; c += (texture2D(t, vUv + d * 3.2308) + texture2D(t, vUv - d * 3.2308)) * .0703; gl_FragColor = c; }' });
      const mix = new TT.ShaderMaterial({ uniforms: { t: { value: null }, top: { value: .6 }, cx: { value: 0 }, amt: { value: .85 } }, vertexShader: vs, depthTest: false, depthWrite: false, transparent: true,
        fragmentShader: 'uniform sampler2D t; uniform float top, cx, amt; varying vec2 vUv; void main(){ vec2 p = vUv * 2. - 1.; '
          + 'float m = smoothstep(top - .06, top + .34, p.y);'                       // above the board's far edge
          + 'm = max(m, smoothstep(.62, 1.05, abs(p.x - cx)) * .55 * smoothstep(top - .9, top, p.y));'   // a little toward the far sides
          + 'gl_FragColor = vec4(texture2D(t, vUv).rgb, m * amt); }' });
      blur.toneMapped = mix.toneMapped = false;
      const quad = new TT.Mesh(new TT.PlaneGeometry(2, 2), blur); quad.frustumCulled = false;
      const qs = new TT.Scene(); qs.add(quad);
      dofS = { blur, mix, quad, qs, qc: new TT.OrthographicCamera(-1, 1, 1, -1, 0, 1), box: new TT.Box3(), v: new TT.Vector3() };
    }
    Object.assign(dofS, { w, h, tex, a, b });
    return dofS;
  }
  const _dsz = { x: 0, y: 0 };
  function dof() {
    try {
      const TT = T(), sz = R.getDrawingBufferSize(new TT.Vector2()), w = sz.x, h = sz.y; if (w < 8 || h < 8) return;
      const D = dofInit(w, h);
      // the board's far edge on screen (NDC y): the focus ends there
      let top = .55, cx = 0;
      if (cur) {
        D.box.setFromObject(cur); if (!D.box.isEmpty()) {
          let y1 = -2, x0 = 2, x1 = -2;
          for (let i = 0; i < 8; i++) { D.v.set(i & 1 ? D.box.max.x : D.box.min.x, i & 2 ? D.box.max.y : D.box.min.y, i & 4 ? D.box.max.z : D.box.min.z).project(cam); y1 = Math.max(y1, D.v.y); x0 = Math.min(x0, D.v.x); x1 = Math.max(x1, D.v.x); }
          top = Math.min(.95, Math.max(-.6, y1)); cx = (x0 + x1) / 2;
        }
      }
      R.copyFramebufferToTexture(new TT.Vector2(0, 0), D.tex);
      const at = R.autoClear, rt = R.getRenderTarget(); R.autoClear = false;
      D.quad.material = D.blur;
      D.blur.uniforms.t.value = D.tex; D.blur.uniforms.d.value.set(1.6 / w, 0); R.setRenderTarget(D.a); R.render(D.qs, D.qc);
      D.blur.uniforms.t.value = D.a.texture; D.blur.uniforms.d.value.set(0, 1.6 / D.a.height); R.setRenderTarget(D.b); R.render(D.qs, D.qc);
      D.blur.uniforms.t.value = D.b.texture; D.blur.uniforms.d.value.set(1.6 / D.a.width, 0); R.setRenderTarget(D.a); R.render(D.qs, D.qc);   // (a second round: softer, still light)
      D.blur.uniforms.t.value = D.a.texture; D.blur.uniforms.d.value.set(0, 1.6 / D.a.height); R.setRenderTarget(D.b); R.render(D.qs, D.qc);
      D.quad.material = D.mix; D.mix.uniforms.t.value = D.b.texture; D.mix.uniforms.top.value = top; D.mix.uniforms.cx.value = cx;
      R.setRenderTarget(rt); R.render(D.qs, D.qc); R.autoClear = at;
    } catch (e) { console.warn('[table3d] dof', e); }
  }
  const _fr = { f: null, m: null };
  function tickSeen() {
    const TT = T(); if (!_fr.f) { _fr.f = new TT.Frustum(); _fr.m = new TT.Matrix4(); }
    cam.updateMatrixWorld(); _fr.m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); _fr.f.setFromProjectionMatrix(_fr.m);
    return roomTicks.some(f => {
      const o = f.obj; if (!o) return true; if (!o.visible) return false;
      if (!o.userData._bs) { const b = new TT.Box3().setFromObject(o); if (b.isEmpty()) return true; o.userData._bs = b.getBoundingSphere(new TT.Sphere()); }   // (the room stands still: measured once)
      return _fr.f.intersectsSphere(o.userData._bs);
    });
  }
  // perspective → orthographic: the ortho frustum is matched to the perspective one on the plane the camera looks at
  // (same size and the same view offset there), so blending the two matrices element by element is seamless
  function orthoBlend(w) {
    if (w < .001 && orthoW < .001) return;
    cam.updateProjectionMatrix(); orthoW = w; if (w < .001) return;
    const P = cam.projectionMatrix.elements, dd = Math.max(.5, Math.hypot(cam.position.x, cam.position.y - camLook, cam.position.z));   // distance to the look-at point (the board top)
    const n = cam.near, f = cam.far, O = [P[0] / dd, 0, 0, 0, 0, P[5] / dd, 0, 0, 0, 0, -2 / (f - n), 0, -P[8], -P[9], -(f + n) / (f - n), 1];
    for (let i = 0; i < 16; i++) P[i] += (O[i] - P[i]) * w;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  }
  // the gallery seen straight from above: the spotlight would bounce off lacquer / marble / glossy boards right into the camera
  // (a blown-out hotspot), so while the camera rises it swings off-axis towards the viewer's lower left, dims a little, and the
  // exposure comes down a touch
  function glare(w) {
    if (!museumSpot || Math.abs(w - glareW) < .002) return; glareW = w;
    museumSpot.position.set(-9 * w, 24 - 5 * w, 9 + 8 * w); museumSpot.intensity = 2.1 * (1 - .3 * w);
    R.toneMappingExposure = MUSEUM_EXP * (1 - .14 * w); shadowDirty = true;
  }
  // skin mode: fn() → {x,y,w,h} screen rect of the playing field; size/top = field width and height in world units
  function align(fn, size, top) { alignFn = fn; alignSize = size; alignTop = top; mode = 'play'; spin = false; yaw = 0; root.rotation.y = 0; fitShadow(); dirty = shadowDirty = true; kick(300); }
  // skin pages, 盤面反転: the whole board (root) turned by `a` radians round the vertical axis through the field's centre and
  // scaled by s (so its corners stay inside the canvas while it turns); turn(null) ends it (squared to the player again)
  function turn(a, s) { if (a == null) { tYaw = null; tS = 1; yaw = 0; } else { tYaw = a; tS = s || 1; } rootDirty = true; kick(250); }
  function project(x, z, y) { const v = new (T().Vector3)(x, y || 0, z); cur.localToWorld(v); v.project(cam); const r = el.getBoundingClientRect(); return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; }
  // snap the camera to where it is heading (after a game: the showcase view at once, framed above the info card)
  function snap() { camK = camTo; zoom = zoomTo = 1; pzoom = pzoomTo; tilt = 0; vel = 0; inset = insetTo; insetT = insetTTo; frame(); kick(300); }
  const _dbg = () => ({ camK, camTo, inset, insetTo, insetT, vsh, zoom, zoomTo, yaw, tilt, mode, fitTo, orthoW, museum: museumOn, aspect: cam && cam.aspect });
  const _scene = () => scene;
  /* ---------- I key: the debug overlay (2026-11-09) ----------
     Scene / board / room triangles, meshes, draw calls, lights, textures, the place / time / brightness, camera and renderer.
     Toggled by I (not while typing); remembered for the tab (sessionStorage). Updated twice a second from the last frame drawn. */
  let dbgEl = null, dbgOn = false, dbgT = 0, dbgFrames = 0, dbgFps = 0, dbgLast = 0;
  const PLACE_N = () => { try { const X = window.Table3D, l = (document.documentElement.lang || 'ja').slice(0, 2); return X.PLACES ? (X.PLACES.name[l] || X.PLACES.name.en)[tableStyle] : String(tableStyle); } catch (e) { return String(tableStyle); } };
  function dbgCount(obj) {   // visible triangles / meshes under obj (instances counted; hidden and merged-away meshes skipped)
    let tri = 0, mesh = 0, inst = 0, pts = 0;
    obj && obj.traverse(o => { let v = true; for (let p = o; p; p = p.parent) if (!p.visible) { v = false; break; } if (!v) return;
      if ((o.isMesh || o.isPoints || o.isLine) && o.geometry) { const g = o.geometry, n = g.index ? g.index.count : g.attributes.position ? g.attributes.position.count : 0, k = o.isInstancedMesh ? o.count : 1;
        if (o.isMesh) { tri += n / 3 * k; mesh++; if (o.isInstancedMesh) inst += k; } else pts += n * k; } });
    return { tri: Math.round(tri), mesh, inst, pts };
  }
  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : String(n);
  function dbgPaint() {
    if (!dbgOn || !dbgEl || !R || !scene) return;
    const info = R.info, room = { tri: 0, mesh: 0, inst: 0, pts: 0 }, board = cur ? dbgCount(cur) : { tri: 0, mesh: 0, inst: 0, pts: 0 }, all = dbgCount(scene);
    roomObjs.forEach(o => { const c = dbgCount(o); room.tri += c.tri; room.mesh += c.mesh; room.inst += c.inst; room.pts += c.pts; });
    let lights = 0, shadows = 0; scene.traverse(o => { if (o.isLight && o.visible) { lights++; if (o.castShadow) shadows++; } });
    const BUD = { room: 60000, board: cur && cur.userData.gameId === 'chess' ? 120000 : 80000 }, warn = (v, b) => v > b ? ' style="color:#ff8a7a"' : '';
    const gl = R.getContext(), dpr = R.getPixelRatio(), sz = R.getSize(new (T().Vector2)());
    const rows = [
      ['place', mountOpts.plain ? `${tableStyle} · ${PLACE_N()} (page floor)` : `${tableStyle} · ${PLACE_N()}`],
      ['time / bright', `${roomMode || '-'} (${todPick()}) · ${['暗い', '標準', '明るい'][bright] || bright}`],
      ['board', (cur && cur.userData.gameId) || '-'],
      ['mode', `${mode}${museumOn ? ' · museum' : ''}${alignFn ? ' · skin' : ''}${LITE ? ' · lite' : ''}${COARSE ? ' · coarse' : ''}`],
      ['', ''],
      ['tris · scene', `<b>${fmt(all.tri)}</b>  (drawn ${fmt(info.render.triangles)})`],
      ['tris · room', `<b${warn(room.tri, BUD.room)}>${fmt(room.tri)}</b> / ${fmt(BUD.room)}`],
      ['tris · board', `<b${warn(board.tri, BUD.board)}>${fmt(board.tri)}</b> / ${fmt(BUD.board)}`],
      ['meshes', `scene ${all.mesh} · room ${room.mesh} · board ${board.mesh}` + (all.inst ? ` · inst ${all.inst}` : '')],
      ['points / lines', fmt(all.pts)],
      ['draw calls', String(info.render.calls)],
      ['lights', `${lights} (${shadows} with shadow)`],
      ['geom / tex', `${info.memory.geometries} / ${info.memory.textures}`],
      ['programs', String((info.programs || []).length)],
      ['', ''],
      ['fps', dbgFps ? dbgFps.toFixed(0) : '-'],
      ['canvas', `${Math.round(sz.x)}×${Math.round(sz.y)} @${dpr.toFixed(2)}x · exp ${R.toneMappingExposure.toFixed(2)}`],
      ['camera', cam ? `fov ${cam.fov.toFixed(1)} · zoom ${zoom.toFixed(2)} · tilt ${tilt.toFixed(2)} · yaw ${(yaw % 6.283).toFixed(2)}` : '-'],
      ['gpu', (() => { try { const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)).slice(0, 48) : 'webgl' + (R.capabilities.isWebGL2 ? '2' : '1'); } catch (e) { return '-'; } })()],
    ];
    dbgEl.innerHTML = '<div class="t3dbg-h">3D DEBUG <span>I で閉じる</span></div>' + rows.map(([k, v]) => k ? `<div><i>${k}</i><span>${v}</span></div>` : '<hr>').join('');
  }
  function dbgTick(now) {   // called from the loop after each drawn frame
    if (!dbgOn) return; dbgFrames++;
    if (now - dbgT > 500) { dbgFps = dbgFrames * 1000 / (now - dbgT); dbgFrames = 0; dbgT = now; dbgPaint(); }
  }
  function dbgToggle(on) {
    dbgOn = on === undefined ? !dbgOn : !!on; try { sessionStorage.setItem('t3d-debug', dbgOn ? '1' : ''); } catch (e) {}
    if (dbgOn && !dbgEl) {
      const st = document.createElement('style'); st.textContent = '.t3dbg{position:fixed;left:10px;bottom:10px;z-index:2147483000;min-width:300px;max-width:min(440px,calc(100vw - 20px));padding:10px 12px;border-radius:10px;background:rgba(14,16,22,.82);color:#e8ecf4;font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;pointer-events:none;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);box-shadow:0 4px 18px rgba(0,0,0,.3)}.t3dbg div{display:flex;gap:10px;justify-content:space-between}.t3dbg i{font-style:normal;color:#9aa6bc;white-space:nowrap}.t3dbg span{text-align:right}.t3dbg b{color:#fff}.t3dbg hr{border:0;border-top:1px solid rgba(255,255,255,.14);margin:5px 0}.t3dbg .t3dbg-h{font-weight:700;letter-spacing:.08em;color:#ffd27a;margin-bottom:4px}.t3dbg .t3dbg-h span{font-weight:400;color:#8a94a8;letter-spacing:0}';
      document.head.appendChild(st); dbgEl = document.createElement('div'); dbgEl.className = 't3dbg'; document.body.appendChild(dbgEl);
    }
    if (dbgEl) dbgEl.hidden = !dbgOn;
    if (dbgOn) { dbgT = performance.now(); dbgFrames = 0; dbgPaint(); kick(1200); }
  }
  addEventListener('keydown', e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'i' && e.key !== 'I')) return;
    const t = e.target; if (t && t.closest && t.closest('input,textarea,select,[contenteditable],[contenteditable=""]')) return;
    if (!R) return; dbgToggle();
  });
  try { if (sessionStorage.getItem('t3d-debug')) setTimeout(() => R && dbgToggle(true), 500); } catch (e) {}
  setInterval(() => { if (dbgOn && performance.now() - dbgT > 1000) { dbgFps = 0; dbgT = performance.now(); dbgPaint(); } }, 1000);   // (the loop sleeps when nothing moves: keep the numbers fresh)

  window.Table3D = { debug: dbgToggle, TABLES, placeMon, setTable, table: () => tableStyle, setBright, bright: () => bright, turn, museum, setShift, quiet, setTimeOfDay, timeOfDayPick: todPick, share, lp, mergeStatic, _scene, lite: LITE, coarse: COARSE, texScale, _dbg, snap, fit, kick, align, reveal, planks, felt, setInset, cloth, wasDrag, prepare, canvasTex, wood, woodTop, makeNoise, RB, grid, stone, project, mount, show, play, pick, MODELS, M, mesh, bevelDisc, rvDisc, rvMats, disc, cellPos, contact, ok: () => !!R, renderer: () => R, floorImage };
})();
