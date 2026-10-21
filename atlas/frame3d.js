/* =====================================================================
   World Board Game Atlas — 3D avatar frames (soft plush rings).
   Pre-rendered by atlas/tools/frames.html?id=<key> → images/atlas/frame/<key>.webp
   The portal only shows the images (drawn over the full 0–100 avatar square).

   Space: the image spans x, y ∈ [-1, 1] (1 unit = 50 avatar units), camera looks down -z.
   The avatar circle (r 46) is r .92 here; the band covers r ≈ .80–.99 to hide its edge.
   Ornaments stay inside r ≈ .72 … .99 (a little more toward the corners).
   Rarity (FRAME[key].r in art.js): N = plain soft ring … UR = gold, gems, sparkles.
   ===================================================================== */
(function () {
  'use strict';
  if (!window.Icons3D || !Icons3D.KIT) return;
  const K = Icons3D.KIT, T = K.T, M = K.M, soft = K.soft, blob = K.blob, mesh = K.mesh, V3 = K.V3, X = K.X;
  const R0 = .895, T0 = .092, SZ = .78;          // band centre radius, tube radius, z squash
  const PI = Math.PI, TAU = PI * 2;

  /* ---------- materials ---------- */
  const felt = (hex, under, o = {}) => soft(hex, Object.assign(under != null ? { under, uk: .45 } : {}, o));
  const goldFelt = (o = {}) => soft(0xffb81f, Object.assign({ under: 0xe8701a, uk: .55, sheen: 0xfff0b0, sheenK: .5, glow: .05, rough: .6 }, o));
  const gemM = (hex, o = {}) => soft(hex, Object.assign({ rough: .32, rim: .4, glow: .14 }, o));
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  const vcMat = (o = {}) => soft(0xffffff, Object.assign({ mat: { vertexColors: true } }, o));

  /* ---------- ring helpers ---------- */
  // plain soft ring (torus in the xy plane, squashed in z)
  function ring(g, mat, R = R0, t = T0, sz = SZ, arc = TAU, a0 = 0) {
    const m = mesh(new T.TorusGeometry(R, t, 28, Math.max(24, Math.round(200 * arc / TAU)), arc), mat);
    m.scale.z = sz; m.rotation.z = a0; m.userData.band = true; g.add(m); return m;
  }
  // ring with per-vertex colour: fn(a, phi) → hex | THREE.Color  (a: angle round the ring, 0 = right, π/2 = top;
  // phi: angle round the tube, 0 = outer edge, π/2 = front, π = inner edge)
  function vcRing(g, fn, o = {}) {
    const R = o.R || R0, t = o.t || T0, geo = new T.TorusGeometry(R, t, 32, 240), P = geo.attributes.position, col = [];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = (Math.atan2(y, x) + TAU) % TAU, phi = Math.atan2(z, Math.hypot(x, y) - R);
      const c = fn(a, phi); const cc = c.isColor ? c.clone() : new T.Color(c); cc.convertSRGBToLinear(); col.push(cc.r, cc.g, cc.b);
    }
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    const m = mesh(geo, vcMat(o.mat)); m.scale.z = o.sz || SZ; m.userData.band = true; g.add(m); return m;
  }
  // point + normal on the band surface
  function onRing(a, phi, R = R0, t = T0, sz = SZ) {
    const r = R + t * Math.cos(phi);
    const p = V3(r * Math.cos(a), r * Math.sin(a), t * Math.sin(phi) * sz);
    const n = V3(Math.cos(phi) * Math.cos(a) * sz, Math.cos(phi) * Math.sin(a) * sz, Math.sin(phi)).normalize();
    return { p, n };
  }
  // place o at angle a, radius r, depth z; its local +y points outward (spin adds to that)
  function put(g, o, a, r, z = 0, spin = 0, s) {
    o.position.set(Math.cos(a) * r, Math.sin(a) * r, z); o.rotation.z += a - PI / 2 + spin; if (s) o.scale.multiplyScalar(s); g.add(o); return o;
  }
  const deg = d => d * PI / 180;
  const putU = (g, o, a, r, z = 0, spin = 0) => { o.position.set(Math.cos(a) * r, Math.sin(a) * r, z); o.rotation.z += spin; g.add(o); return o; };   // upright (not radial)
  const each = (n, f, off = PI / 2) => { for (let i = 0; i < n; i++) f(off + i / n * TAU, i); };
  // a flat-ish blob stuck onto the band front
  function dot(g, mat, a, phi, rx, ry = rx, rz = rx * .45, spin = 0) {
    const s = onRing(a, phi), m = blob(new T.Group(), mat, [0, 0, 0], [rx, ry, rz]);
    const w = new T.Group(); w.add(m); m.rotation.z = spin; K.stick(g, w, s, -rz * .25); return w;
  }

  /* ---------- 2D shapes → soft extruded pieces ---------- */
  function extr(shape, mat, depth = .3, bev = .12) {
    const geo = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .85, bevelSegments: 6, curveSegments: 18 });
    geo.center(); return mesh(geo, mat);
  }
  function starShape(n = 5, ro = 1, ri = .48) {
    const s = new T.Shape(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + PI / 2, r = i % 2 ? ri : ro; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); return s;
  }
  function heartShape() {
    const s = new T.Shape(); s.moveTo(0, -.9);
    s.bezierCurveTo(-.35, -.55, -1, -.2, -1, .3); s.bezierCurveTo(-1, .75, -.6, .95, -.5, .95); s.bezierCurveTo(-.2, .95, 0, .75, 0, .5);
    s.bezierCurveTo(0, .75, .2, .95, .5, .95); s.bezierCurveTo(.6, .95, 1, .75, 1, .3); s.bezierCurveTo(1, -.2, .35, -.55, 0, -.9); return s;
  }
  function diamondShape() { const s = new T.Shape(); s.moveTo(0, 1); s.quadraticCurveTo(.25, .4, .72, 0); s.quadraticCurveTo(.25, -.4, 0, -1); s.quadraticCurveTo(-.25, -.4, -.72, 0); s.quadraticCurveTo(-.25, .4, 0, 1); return s; }
  function crescentShape(d = .5, r1 = .84) {
    const x = (d * d + 1 - r1 * r1) / (2 * d), y = Math.sqrt(1 - x * x), al = Math.atan2(y, x), be = Math.atan2(y, x - d), s = new T.Shape();
    s.moveTo(x, y); s.absarc(0, 0, 1, al, TAU - al, false); s.absarc(d, 0, r1, TAU - be, be, true); return s;
  }
  const heart = (mat, s = 1) => { const m = extr(heartShape(), mat, .3, .16); m.scale.setScalar(s); return grp(m); };
  const star = (mat, s = 1, n = 5, ri = .5) => { const m = extr(starShape(n, 1, ri), mat, .26, .14); m.scale.setScalar(s); return grp(m); };
  const grp = (...k) => { const g = new T.Group(); k.forEach(x => g.add(x)); return g; };
  const sparkle = (g, x, y, r, z = .2) => K.sparkle(g, [x, y, z], r);
  const sparkleA = (g, a, r, size, z = .2) => sparkle(g, Math.cos(a) * r, Math.sin(a) * r, size, z);

  /* ---------- small ornaments ---------- */
  function bow(s, hex = 0xff7f9e, under = 0xff5f8a) {
    const g = new T.Group(), m = felt(hex, under);
    [-1, 1].forEach(k => blob(g, m, [k * .21, .03, 0], [.22, .15, .1], [0, 0, k * .35]));
    blob(g, m, [0, 0, .03], [.09, .09, .08]);
    [-1, 1].forEach(k => blob(g, m, [k * .1, -.17, -.01], [.06, .15, .05], [0, 0, k * .4]));
    g.scale.setScalar(s); return g;
  }
  function flower(s, hex = 0xffffff, mid = 0xffd34f, n = 5, under = 0xffc4d6) {
    const g = new T.Group(), pm = felt(hex, under);
    for (let i = 0; i < n; i++) { const a = i / n * TAU + PI / 2; blob(g, pm, [Math.cos(a) * .15, Math.sin(a) * .15, 0], [.12, .12, .055]); }
    blob(g, felt(mid, 0xffa040), [0, 0, .04], [.085, .085, .06]);
    g.scale.setScalar(s); return g;
  }
  function daisy(s) {
    const g = new T.Group(), pm = felt(0xffffff, 0xd8e4ff);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; blob(g, pm, [Math.cos(a) * .17, Math.sin(a) * .17, 0], [.13, .055, .04], [0, 0, a]); }
    blob(g, felt(0xffd34f, 0xff9a40), [0, 0, .04], [.095, .095, .065]);
    g.scale.setScalar(s); return g;
  }
  function sakuraFl(s, hex = 0xffc2d8) {
    const g = new T.Group(), pm = felt(hex, 0xff9ec0);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * TAU + PI / 2, c = [Math.cos(a) * .15, Math.sin(a) * .15, 0];
      [-1, 1].forEach(k => blob(g, pm, [c[0] + Math.cos(a + k * 1.2) * .035, c[1] + Math.sin(a + k * 1.2) * .035, 0], [.1, .065, .05], [0, 0, a + k * .32]));   // notched petal = two lobes
    }
    blob(g, felt(0xff7fa8, 0xe0607f), [0, 0, .035], [.06, .06, .05]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + PI / 2 + PI / 5; blob(g, felt(0xffe07a), [Math.cos(a) * .07, Math.sin(a) * .07, .06], .018); }
    g.scale.setScalar(s); return g;
  }
  function leaf(mat, s = 1, w = .45) { const g = new T.Group(); blob(g, mat, [0, .5, 0], [w * .5, .5, .14]); g.scale.setScalar(s); return g; }
  function pawnP(mat, s = 1) { const g = new T.Group(); const b = K.puck(.42, .18, mat, .5); g.add(b); blob(g, mat, [0, .36, 0], [.2, .24, .2]); const c = K.puck(.25, .07, mat, .5); c.position.y = .5; g.add(c); blob(g, mat, [0, .74, 0], .2); g.position.y = -.45; return scaleWrap(g, s); }
  function rookP(mat, s = 1) { const g = new T.Group(); g.add(K.puck(.42, .18, mat, .5)); K.sq(g, mat, [0, .45, 0], [.48, .62, .48], .5); K.sq(g, mat, [0, .8, 0], [.6, .2, .6], .45); [-1, 0, 1].forEach(i => K.sq(g, mat, [i * .2, .96, 0], [.14, .16, .3], .5)); g.position.y = -.5; return scaleWrap(g, s); }
  function kingP(mat, s = 1, gold) { const g = new T.Group(); g.add(K.puck(.45, .18, mat, .5)); blob(g, mat, [0, .44, 0], [.24, .34, .24]); blob(g, mat, [0, .82, 0], [.3, .12, .3]); blob(g, mat, [0, .96, 0], [.22, .14, .22]); const cm = gold || mat; blob(g, cm, [0, 1.18, 0], [.05, .14, .05]); blob(g, cm, [0, 1.2, 0], [.13, .045, .05]); g.position.y = -.6; return scaleWrap(g, s); }
  function knightP(mat, s = 1) {
    const g = new T.Group(); g.add(K.puck(.42, .18, mat, .5));
    blob(g, mat, [0, .42, 0], [.26, .3, .22]); blob(g, mat, [.06, .74, 0], [.2, .28, .18], [0, 0, -.35]); blob(g, mat, [.24, .78, 0], [.2, .12, .14], [0, 0, -.2]);
    blob(g, mat, [-.04, 1.0, 0], [.07, .1, .06], [0, 0, .3]); blob(g, soft(0x2a2233, { rough: .4 }), [.08, .86, .15], .035); g.position.y = -.5; return scaleWrap(g, s);
  }
  function scaleWrap(g, s) { const w = new T.Group(); w.add(g); w.scale.setScalar(s); return w; }
  function die(s, body = 0xfffcf6, pipHex = 0xff6f78, n = 3) {
    const g = new T.Group(), m = soft(body, { under: 0xc9d6ff, uk: .5 }), pip = soft(pipHex, { rough: .6, rim: .1 });
    K.sq(g, m, [0, 0, 0], [1, 1, 1], .34);
    const P = { 1: [[0, 0]], 2: [[-.22, .22], [.22, -.22]], 3: [[-.24, .24], [0, 0], [.24, -.24]], 4: [[-.22, -.22], [.22, -.22], [-.22, .22], [.22, .22]], 5: [[-.24, -.24], [.24, -.24], [0, 0], [-.24, .24], [.24, .24]], 6: [[-.22, -.25], [.22, -.25], [-.22, 0], [.22, 0], [-.22, .25], [.22, .25]] };
    P[n].forEach(([x, y]) => blob(g, pip, [x, y, .5], [n === 1 ? .15 : .1, n === 1 ? .15 : .1, .035]));
    g.scale.setScalar(s); return g;
  }
  const texCache = {};
  function numTex(n, fg = '#5a6aa8', bg = '#ffffff') {
    const k = n + fg + bg; if (texCache[k]) return texCache[k];
    return (texCache[k] = X.canvasTex('fr-n' + k, 128, 128, (c, W) => {
      c.clearRect(0, 0, W, W); c.fillStyle = fg; c.font = '700 96px Fredoka, "Arial Rounded MT Bold", "Helvetica Neue", Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), W / 2, W / 2 + 6);
    }));
  }
  function tile(n, s, body = 0xffffff, fg = '#5a6aa8', under = 0xcfe0ff) {
    const g = new T.Group(); K.sq(g, soft(body, { under, uk: .45 }), [0, 0, 0], [1, 1, .55], .3);
    const lab = mesh(new T.PlaneGeometry(.8, .8), M({ map: numTex(n, fg), transparent: true, roughness: .8, bump: false, depthWrite: false }));
    lab.position.z = .285; K.noShadow(lab); g.add(lab);
    g.scale.setScalar(s); return g;
  }
  function gem(hex, s = 1, set = true) {
    const g = new T.Group();
    if (set) { const b = mesh(new T.TorusGeometry(.5, .14, 12, 32), goldFelt()); b.scale.z = .7; g.add(b); }
    const m = mesh(new T.IcosahedronGeometry(.5, 1), gemM(hex, { mat: { flatShading: true } })); m.scale.set(1, 1, .6); m.position.z = .12; g.add(m);
    g.scale.setScalar(s); return g;
  }
  function pearl(g, p, r, hex = 0xfff7fb) { const m = blob(g, soft(hex, { under: 0xd8c8ff, uk: .5, sheen: 0xffe0f0, sheenK: .9, rim: .35, glow: .05, rough: .55 }), p, r); return m; }
  function gloss(g, p, r) { blob(g, M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .6, roughness: .9 }), p, [r, r * .7, r * .4], [0, 0, .7]); }

  /* ---------- frames ---------- */
  const N = (hex, under, o) => g => { ring(g, felt(hex, under, o)); };
  const B = {};
  // N — simple soft rings
  B.white = N(0xffffff, 0xc8d4f4);
  B.coral = N(0xff7f74, 0xff5a8a);
  B.sky = N(0x6ab8ff, 0x7a8cff);
  B.cream = N(0xffe2a8, 0xffbb88);
  B.lemon = N(0xffdc4a, 0xffa83a);
  B.lilac = N(0xb49cff, 0x9078f0);
  B.peach = N(0xffaa88, 0xff8890);
  B.rose = N(0xff90b8, 0xff6a98);
  B.ink = N(0x3d3a5c, 0x2a2440, { sheen: 0x9ab4ff, sheenK: .5, rim: .3 });
  B.dots = g => {
    ring(g, felt(0xfffdf8, 0xd9e2ff));
    const cols = [0xff8fb0, 0x7fcbff, 0xffd65a, 0x7fe0b0, 0xbfa0ff];
    each(16, (a, i) => dot(g, felt(cols[i % 5]), a, PI / 2 - .1, .042, .042, .016));
  };
  B.stitch = g => {
    ring(g, felt(0x8fb4ea, 0x7a86d8));
    const w = felt(0xffffff, 0xe0e8ff);
    [.55, 2.6].forEach(ph => each(28, a => dot(g, w, a, ph, .034, .011, .009, PI / 2), PI / 2));
  };
  B.ribbon = g => {
    ring(g, felt(0xffd0e0, 0xffa0c0));
    const b = bow(.85, 0xff7f9e, 0xff5f8a); b.position.set(0, .86, .12); g.add(b);
  };
  B.cloud = g => {
    const m = felt(0xffffff, 0xbfd8ff, { uk: .55 });
    each(26, (a, i) => { const s = i % 2 ? .085 : .1; blob(g, m, [Math.cos(a) * (R0 - .01 + (i % 3 - 1) * .01), Math.sin(a) * (R0 - .01 + (i % 3 - 1) * .01), 0], [s, s, s * .7]); });
  };
  // R
  B.mint = g => { ring(g, felt(0x6fe0b0, 0x40b8a8)); ring(g, felt(0xffffff, 0xd0f0e8), .82, .028, .8); ring(g, felt(0xffffff, 0xd0f0e8), .965, .02, .8); };
  B.candy = g => {
    vcRing(g, (a, phi) => { const v = Math.sin(a * 14 + phi * 1.2); return v > 0 ? 0xff8fc7 : 0xffffff; }, { mat: { rim: .2 } });
  };
  B.bubble = g => {
    ring(g, felt(0xd8f0ff, 0xb8c8ff), R0, .06);
    const cols = [0xbfe8ff, 0xd8ccff, 0xc8f4e8, 0xffd6ea];
    each(16, (a, i) => {
      const r = [.1, .07, .115, .08][i % 4], rr = R0 + [0, .02, -.01, -.03][i % 4], p = [Math.cos(a) * rr, Math.sin(a) * rr, .03];
      blob(g, soft(cols[i % 4], { rim: .55, glow: .06, under: 0xa8b8ff, uk: .3 }), p, [r, r, r * .8]);
      gloss(g, [p[0] - r * .38, p[1] + r * .38, p[2] + r * .7], r * .28);
    }, .2);
  };
  B.daisy = g => {
    ring(g, felt(0x8fdc8a, 0x50b098));
    each(6, (a, i) => { const f = daisy(i % 2 ? .42 : .5); f.position.set(Math.cos(a) * .89, Math.sin(a) * .89, .09); f.rotation.z = a; g.add(f); }, PI / 2);
    each(6, a => { const l = leaf(felt(0x70c878, 0x40a080), .13); put(g, l, a, .89, .07, -PI / 2 - .5); }, PI / 2 + PI / 6);
  };
  B.vine = g => {
    ring(g, felt(0x8ad890, 0x50b098), R0, .07);
    const L = felt(0x6cc96e, 0x3fa58a), L2 = felt(0x9be37a, 0x5ab88a);
    each(18, (a, i) => { const s = i % 2 ? 1 : -1, l = leaf(i % 3 ? L : L2, .12, .5); put(g, l, a, R0 + s * .015, .05, s > 0 ? -.9 : -PI + .9); });
    each(5, a => { blob(g, felt(0xffb0c8, 0xff80a8), [Math.cos(a) * R0, Math.sin(a) * R0, .08], .035); }, PI / 2 + .17);
  };
  B.hearts = g => {
    ring(g, felt(0xffb6cf, 0xff86ac));
    each(8, (a, i) => { const h = heart(felt(i % 2 ? 0xff6f9a : 0xffffff, i % 2 ? 0xff4f7a : 0xffc8da), i % 2 ? .1 : .08); put(g, h, a, R0 - .01, .08, PI / 2 - a + (i % 2 ? .15 : -.15)); });
  };
  B.stars = g => {
    ring(g, felt(0x8f8ae8, 0x6a5ac8, { sheen: 0xc0d0ff, sheenK: .4 }));
    each(8, (a, i) => { const s = star(felt(0xffd65a, 0xffa040, { glow: .06 }), i % 2 ? .075 : .1); put(g, s, a, R0 - .005, .08, i * .4); });
  };
  B.beads = g => {
    ring(g, felt(0xffffff), R0, .025);
    const cols = [0xff9ab8, 0xffd36a, 0x8fd8ff, 0x9be8c0, 0xc8a8ff];
    const n = 30; each(n, (a, i) => blob(g, soft(cols[i % 5], { under: 0xa8a0ff, uk: .25, rim: .25 }), [Math.cos(a) * R0, Math.sin(a) * R0, 0], [.088, .088, .08]));
  };
  B.donut = g => {
    ring(g, felt(0xf2c287, 0xd89a5c), R0, T0 + .002);
    // icing: a slimmer squashed torus pushed to the front
    const ic = mesh(new T.TorusGeometry(R0, T0 * .86, 28, 220), felt(0xff9ec4, 0xff7aa8)); ic.userData.band = true; ic.scale.z = SZ * .9; ic.position.z = .03; g.add(ic);
    const cols = [0xffffff, 0x7fcbff, 0xffe066, 0x7fe0b0, 0xb89cff];
    for (let i = 0; i < 36; i++) { const a = i / 44 * TAU + (i * 7 % 5) * .03, ph = PI / 2 + ((i * 37) % 9 - 4) * .14; const s = onRing(a, ph, R0, T0 * .86, SZ * .9); s.p.z += .03; const sp = new T.Group(); blob(sp, felt(cols[i % 5]), [0, 0, 0], [.032, .011, .011], [0, 0, i * 1.3]); K.stick(g, sp, s, .002); }
  };
  B.twotone = g => {
    vcRing(g, (a) => { const k = Math.sin(a - PI / 4); return k > 0 ? 0x5fd0a8 : 0xa98aff; });
    ring(g, felt(0xffffff, 0xe0e0ff), R0, .024, SZ, TAU).position.z = .07;
  };
  B.pearl = g => {
    ring(g, felt(0xf3e8ff, 0xd8c8ff), R0, .03);
    each(28, (a, i) => pearl(g, [Math.cos(a) * R0, Math.sin(a) * R0, 0], i % 2 ? .075 : .09));
  };
  B.paw = g => {
    ring(g, felt(0xffc7a6, 0xff9a9a));
    const pad = felt(0xff6f8e, 0xff4f78);
    each(6, (a) => {
      const p = new T.Group(); blob(p, pad, [0, -.12, 0], [.24, .19, .1]);
      [[-.26, .1], [-.09, .22], [.09, .22], [.26, .1]].forEach(([x, y]) => blob(p, pad, [x, y, 0], [.09, .1, .07]));
      p.scale.setScalar(.36); put(g, p, a, R0, .075, 0);
    });
  };
  B.cookie = g => {
    ring(g, felt(0xe8b878, 0xc88a50, { rough: .9 }));
    const ch = soft(0x6a4232, { rough: .7, rim: .1 });
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU + (i % 3) * .05, ph = PI / 2 + ((i * 53) % 7 - 3) * .32; dot(g, ch, a, ph, .028, .023, .015, i); }
  };
  // SR — board-game motifs
  B.board = g => {
    const W = felt(0xfff8ee, 0xd9e2ff), Bk = felt(0x3d4060, 0x2a2848, { sheen: 0x9ab4ff, sheenK: .4 });
    for (let i = 0; i < 16; i++) ring(g, i % 2 ? Bk : W, R0, T0, SZ, TAU / 16 + .001, i / 16 * TAU);
    sparkleA(g, deg(40), .95, .045); sparkleA(g, deg(220), .95, .035);
  };
  B.rainbow = g => {
    const C = [0xff6a7a, 0xff9f4a, 0xffd84a, 0x5fd48a, 0x5ab4ff, 0x9a7aff];
    vcRing(g, (a, phi) => { const t = Math.max(0, Math.min(.9999, (1 - Math.cos(phi)) / 2)) * 6, i = Math.floor(t), f = t - i; return new T.Color(C[i]).lerp(new T.Color(C[Math.min(5, i + 1)]), Math.max(0, (f - .7) / .3)); });
    const cw = felt(0xffffff, 0xc8d8ff, { uk: .5 });
    [[deg(205), 1], [deg(-25), -1]].forEach(([a, s]) => { const c = [Math.cos(a) * R0, Math.sin(a) * R0]; [[0, 0, .085], [s * -.08, .04, .065], [s * .08, -.02, .06], [0, -.05, .06]].forEach(([x, y, r]) => blob(g, cw, [c[0] + x, c[1] + y, .08], [r, r, r * .75])); });
    sparkleA(g, deg(60), .96, .045); sparkleA(g, deg(125), .95, .035);
  };
  B.dice = g => {
    ring(g, felt(0xbcd6ff, 0x9a9cff));
    each(6, (a, i) => { const d = die(.24, 0xfffcf6, i === 0 ? 0xff6f78 : 0x535a86, (i % 6) + 1); put(g, d, a, R0 - .005, .07, .25 * (i % 2 ? 1 : -1)); d.rotation.x = .25 * (i % 2 ? 1 : -1); d.rotation.y = .3; });
    sparkleA(g, deg(45), .96, .04);
  };
  B.go = g => {
    ring(g, felt(0xf0cc88, 0xd09858, { rough: .8 }));
    const Bk = soft(0x2b2a33, { rough: .5, rim: .3, sheen: 0x9aa0c0, sheenK: .5 }), Wt = soft(0xfbfaf4, { under: 0xd8dcef, uk: .5, rough: .55, rim: .2 });
    each(12, (a, i) => blob(g, i % 2 ? Bk : Wt, [Math.cos(a) * R0, Math.sin(a) * R0, .07], [.088, .088, .05]));
    // grid lines on the wood between stones
    each(12, a => dot(g, soft(0x8a5a2a, { rough: .8 }), a, PI / 2, .006, .085, .005, 0), PI / 2 + PI / 12);
  };
  B.reversi = g => {
    ring(g, felt(0x52c98a, 0x2a9f78));
    const Bk = soft(0x2b2a33, { rough: .55, rim: .3 }), Wt = soft(0xfbfaf4, { under: 0xd8dcef, uk: .4, rim: .2 });
    each(8, (a, i) => {
      const d = new T.Group(), up = i % 2;
      const p1 = K.puck(.5, .12, up ? Bk : Wt, .5), p2 = K.puck(.5, .12, up ? Wt : Bk, .5); p2.position.y = .12; d.add(p1, p2);
      d.rotation.x = PI / 2; const w = grp(d); if (i === 0) w.rotation.y = .9;
      w.scale.setScalar(.19); put(g, w, a, R0, .05);
    });
    sparkleA(g, deg(60), .97, .04);
  };
  B.chess = g => {
    const W = felt(0xf6e4c4, 0xd8b88a), Bk = felt(0x9a6a48, 0x7a4a38);
    for (let i = 0; i < 24; i++) ring(g, i % 2 ? Bk : W, R0, T0, SZ, TAU / 24 + .001, i / 24 * TAU);
    const pw = soft(0xfffcf6, { under: 0xc9d6ff, uk: .5 }), pb = soft(0x45405e, { under: 0x2a2440, uk: .4, rim: .3, sheen: 0x9ab4ff, sheenK: .4 });
    putU(g, kingP(pw, .25, goldFelt()), PI / 2, R0 - .04, .1);
    putU(g, knightP(pb, .25), deg(155), R0 - .03, .1);
    putU(g, rookP(pb, .23), deg(25), R0 - .03, .1);
    putU(g, pawnP(pw, .24), deg(225), R0 - .02, .1);
    putU(g, pawnP(pb, .24), deg(-45), R0 - .02, .1);
    sparkleA(g, deg(75), .97, .035);
  };
  B.shogi = g => {
    ring(g, felt(0xe9c27c, 0xc48a4a, { rough: .8 }));
    const P = [['王', PI / 2, .22], ['飛', deg(162), .19], ['角', deg(18), .19], ['金', deg(234), .18], ['歩', deg(306), .18]];
    P.forEach(([ch, a, s]) => { const p = K.shogiPiece(ch, 1, '#f6d690'); p.geometry.center(); const w = grp(p); w.scale.setScalar(s); putU(g, w, a, R0 - .01, .07, a === PI / 2 ? 0 : Math.cos(a) > 0 ? -.2 : .2); });
    sparkleA(g, deg(70), .97, .035);
  };
  B.cards = g => {
    ring(g, felt(0xffe4ec, 0xffb8cc));
    const red = felt(0xff6f86, 0xe0507a), blk = felt(0x45405e, 0x2a2440);
    const club = m => { const c = new T.Group(); [[0, .38], [-.36, -.06], [.36, -.06]].forEach(([x, y]) => blob(c, m, [x, y, 0], [.36, .36, .2])); blob(c, m, [0, -.45, 0], [.12, .4, .12]); blob(c, m, [0, -.8, 0], [.3, .1, .12]); return c; };
    const spade = m => { const c = new T.Group(); const h = heart(m, 1); h.rotation.z = PI; h.position.y = .15; c.add(h); blob(c, m, [0, -.65, 0], [.12, .35, .12]); blob(c, m, [0, -.92, 0], [.32, .1, .12]); return c; };
    const S = [() => heart(red, 1), () => grp(extr(diamondShape(), red, .3, .14)), club, spade];
    each(8, (a, i) => { const o = i % 4 === 0 ? S[0]() : i % 4 === 1 ? S[1]() : S[i % 4](blk); const w = grp(o); w.scale.setScalar(i % 2 ? .1 : .115); w.position.set(Math.cos(a) * (R0 - .005), Math.sin(a) * (R0 - .005), .08); w.rotation.z = (i % 2 ? .25 : -.25); g.add(w); });
    sparkleA(g, deg(68), .97, .035);
  };
  B.sakura = g => {
    ring(g, felt(0xfff0f5, 0xffc8da));
    each(7, (a, i) => { const f = sakuraFl(i % 2 ? .62 : .74, i % 3 ? 0xff9ec0 : 0xffb8d0); f.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .09); f.rotation.z = a * 1.7; g.add(f); });
    each(7, (a, i) => dot(g, felt(0xffb0cc, 0xff8ab0), a, PI / 2 + (i % 2 ? .5 : -.5), .03, .018, .012, a), PI / 2 + PI / 7);
    sparkleA(g, deg(55), .97, .035);
  };
  B.mancala = g => {
    ring(g, felt(0xe0a868, 0xb07038, { rough: .85 }));
    const pit = soft(0x9a6234, { rough: .9 }), cols = [0xff7fa0, 0x6fc8ff, 0xffd65a, 0x7fe0a8, 0xb89cff];
    each(6, (a, i) => {
      blob(g, pit, [Math.cos(a) * R0, Math.sin(a) * R0, .045], [.1, .1, .035]);
      [[-.04, .03], [.04, .03], [0, -.04], [.045, -.03]].slice(0, 3 + (i % 2)).forEach(([x, y], j) => {
        const c = Math.cos(a), s = Math.sin(a); blob(g, gemM(cols[(i + j) % 5]), [c * R0 + x * c - y * s, s * R0 + x * s + y * c, .085], [.04, .04, .028]);
      });
    });
    sparkleA(g, deg(60), .97, .035);
  };
  B.sudoku = g => {
    ring(g, felt(0x8fc4ff, 0x7a88ff));
    const cols = ['#5a6aa8', '#ff6f8a', '#3fb08a'];
    each(9, (a, i) => { const t = tile(i + 1, .2, 0xffffff, cols[i % 3]); t.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .07); t.rotation.z = (i % 2 ? .12 : -.12); g.add(t); });
    sparkleA(g, deg(70), .97, .035);
  };
  // SSR
  B.laurel = g => {
    ring(g, goldFelt(), R0, .055);
    const L = felt(0x5fcf8a, 0x2f9f7a, { sheen: 0xd0ffe0, sheenK: .4 }), L2 = felt(0x7ddc8e, 0x3fb08a);
    [-1, 1].forEach(s => { for (let i = 0; i < 9; i++) { const a = -PI / 2 + s * (.32 + i * .29); [-1, 1].forEach(k => { const l = leaf(i % 2 ? L : L2, .135, .5); put(g, l, a, R0 + k * .02, .04 + (k > 0) * .01, (k > 0 ? -.95 : -PI + .95) * s + (s < 0 ? PI : 0)); }); } });
    each(6, a => blob(g, goldFelt({ glow: .14 }), [Math.cos(a) * R0, Math.sin(a) * R0, .08], .03), PI / 2 + .45);
    const b = bow(.75, 0xff7f9e, 0xff5f8a); b.position.set(0, -.87, .14); g.add(b);
    sparkleA(g, deg(50), .96, .05); sparkleA(g, deg(130), .97, .04); sparkleA(g, deg(-20), .98, .035);
  };
  B.gold = g => {
    ring(g, goldFelt({ glow: .1 }));
    ring(g, felt(0xfff4c8, 0xffd080), .805, .02, .8);
    each(4, a => pearl(g, [Math.cos(a) * R0, Math.sin(a) * R0, .07], .075));
    each(4, (a, i) => { const gm = gem([0xff6f9a, 0x5ec8ff, 0x7fe0a8, 0xb89cff][i], .12); gm.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .07); g.add(gm); }, PI / 4);
    sparkleA(g, deg(60), .97, .05); sparkleA(g, deg(200), .97, .04); sparkleA(g, deg(-35), .98, .035);
  };
  B.jewel = g => {
    ring(g, felt(0xb89cff, 0x8a6ae8, { sheen: 0xffe0ff, sheenK: .6, glow: .03 }));
    ring(g, goldFelt(), .81, .022, .8); ring(g, goldFelt(), .975, .018, .8);
    const cols = [0xff5f8f, 0x5ec8ff, 0x6fe0a0, 0xffc94a, 0xb88cff, 0xff8f6a];
    each(12, (a, i) => { const gm = gem(cols[i % 6], i === 0 ? .15 : i % 2 ? .085 : .115, i % 2 === 0); gm.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .08); g.add(gm); });
    sparkleA(g, deg(55), .97, .05); sparkleA(g, deg(140), .97, .04); sparkleA(g, deg(-40), .98, .045); sparkleA(g, deg(230), .96, .035);
  };
  B.moon = g => {
    vcRing(g, (a) => new T.Color(0x4a4f8a).lerp(new T.Color(0x8a7ad8), (Math.sin(a - PI / 4) + 1) / 2), { mat: { sheen: 0xb8c8ff, sheenK: .6, rim: .35, glow: .04 } });
    const mn = extr(crescentShape(), felt(0xffe48a, 0xffb850, { glow: .12, sheen: 0xfff8d0, sheenK: .5 }), .35, .18); const w = grp(mn); w.scale.setScalar(.26); w.rotation.z = -.5;
    w.position.set(Math.cos(deg(135)) * 1.02, Math.sin(deg(135)) * 1.02, .12); g.add(w);
    each(9, (a, i) => { const s = star(felt(0xfff3b0, 0xffd060, { glow: .1 }), i % 3 ? .045 : .065); put(g, s, a, R0 + (i % 2 ? .02 : -.02), .08, i); }, deg(175));
    sparkleA(g, deg(30), .97, .045); sparkleA(g, deg(-60), .98, .035); sparkleA(g, deg(200), .97, .04);
  };
  B.ocean = g => {
    vcRing(g, (a, phi) => new T.Color(0x7fd8f0).lerp(new T.Color(0x4f9fe8), Math.max(0, Math.min(1, (1 - Math.cos(phi)) / 2))));
    const foam = felt(0xffffff, 0xbfe0ff);
    each(22, (a, i) => blob(g, foam, [Math.cos(a) * (R0 + .065), Math.sin(a) * (R0 + .065), .02], [.04, .04, .035]), 0);
    const sf = star(felt(0xff9a7a, 0xff6f8a), .12, 5, .45); put(g, sf, deg(210), R0, .09, .3);
    const sh = new T.Group(), shm = felt(0xffd0dc, 0xff9ab8); for (let i = 0; i < 5; i++) blob(sh, shm, [0, 0, 0], [.13, .5, .12], [0, 0, (i - 2) * .32]).position.set((i - 2) * .12, .25, 0); blob(sh, shm, [0, -.18, 0], [.18, .12, .12]); sh.scale.setScalar(.22); put(g, sh, deg(-30), R0, .08, 0);
    const bub = soft(0xe0f8ff, { rim: .6, glow: .08 });
    [[deg(100), .045], [deg(110), .03], [deg(60), .035], [deg(150), .03], [deg(20), .032]].forEach(([a, r]) => { const p = [Math.cos(a) * R0, Math.sin(a) * R0, .1]; blob(g, bub, p, r); gloss(g, [p[0] - r * .3, p[1] + r * .35, p[2] + r * .8], r * .3); });
    sparkleA(g, deg(45), .97, .045); sparkleA(g, deg(250), .97, .035);
  };
  B.autumn = g => {
    vcRing(g, (a) => new T.Color(0xffc27a).lerp(new T.Color(0xffa070), (Math.sin(a * 3) + 1) / 2));
    const cols = [[0xff6a50, 0xd8405a], [0xffa040, 0xff6a50], [0xffd050, 0xffa040]];
    each(9, (a, i) => { const [c, u] = cols[i % 3], s = star(felt(c, u), i % 2 ? .1 : .125, 5, .52); put(g, s, a, R0 - .005, .08, .3 * (i % 3 - 1)); });
    each(4, (a) => { const ac = new T.Group(); blob(ac, felt(0xc88a50, 0xa86a3a), [0, -.1, 0], [.3, .36, .26]); blob(ac, felt(0x8a5a32, 0x6a4028, { rough: .95 }), [0, .2, 0], [.36, .18, .3]); blob(ac, felt(0x6a4028), [0, .42, 0], [.05, .1, .05]); ac.scale.setScalar(.16); put(g, ac, a, R0, .08, .2); }, PI / 2 + PI / 9);
    sparkleA(g, deg(60), .97, .045); sparkleA(g, deg(-30), .98, .035);
  };
  B.snow = g => {
    vcRing(g, (a, phi) => new T.Color(0xa8d4ff).lerp(new T.Color(0x6a98ec), Math.max(0, Math.min(1, (1 - Math.sin(phi)) * .7))), { mat: { sheen: 0xe0f0ff, sheenK: .7, rim: .3 } });
    const sm = soft(0xffffff, { under: 0x9ac8ff, uk: .5, glow: .1, rim: .3 });
    const flake = s => { const f = new T.Group(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; blob(f, sm, [Math.cos(a) * .45, Math.sin(a) * .45, 0], [.5, .09, .08], [0, 0, a]); [-1, 1].forEach(k => blob(f, sm, [Math.cos(a) * .62 + Math.cos(a + k * .9) * .1, Math.sin(a) * .62 + Math.sin(a + k * .9) * .1, 0], [.17, .06, .06], [0, 0, a + k * .9])); } blob(f, sm, [0, 0, .02], .16); f.scale.setScalar(s); return f; };
    each(6, (a, i) => { const f = flake(i % 2 ? .16 : .2); f.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .09); f.rotation.z = a; g.add(f); });
    each(12, (a, i) => blob(g, felt(0xffffff, 0xcfe4ff), [Math.cos(a) * (R0 + (i % 2 ? .04 : -.04)), Math.sin(a) * (R0 + (i % 2 ? .04 : -.04)), .07], .03), PI / 2 + PI / 12);
    sparkleA(g, deg(60), .97, .045); sparkleA(g, deg(205), .97, .04); sparkleA(g, deg(-40), .98, .035);
  };
  B.sunflower = g => {
    ring(g, felt(0x9fdc7a, 0x5ab88a));
    const P = felt(0xffd03a, 0xffa020, { glow: .04 }), C = soft(0x8a5a32, { rough: .95, under: 0x5a3a28, uk: .5 }), Cd = soft(0x5a3a22, { rough: .9 });
    const sf = s => { const f = new T.Group(); for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; blob(f, P, [Math.cos(a) * .3, Math.sin(a) * .3, 0], [.16, .07, .06], [0, 0, a]); } blob(f, C, [0, 0, .05], [.2, .2, .1]); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU; blob(f, Cd, [Math.cos(a) * .1, Math.sin(a) * .1, .13], .03); } f.scale.setScalar(s); return f; };
    each(5, (a, i) => { const f = sf(i === 0 ? .34 : .27); f.position.set(Math.cos(a) * (R0 - .02), Math.sin(a) * (R0 - .02), .1); g.add(f); });
    each(10, (a, i) => { const l = leaf(felt(0x6cc96e, 0x3fa58a), .13, .55); put(g, l, a, R0, .05, i % 2 ? -1.1 : -PI + 1.1); }, PI / 2 + PI / 5 - .2);
    sparkleA(g, deg(50), .97, .05); sparkleA(g, deg(160), .97, .04); sparkleA(g, deg(-60), .98, .035);
  };
  // UR — the most special
  B.galaxy = g => {
    vcRing(g, (a, phi) => { const n = Math.sin(a * 3 + Math.sin(phi * 2) * 1.5) * .5 + Math.sin(a * 7 + 1) * .3; const c = new T.Color(0x3a2f7a); c.lerp(new T.Color(0x8a5ae0), Math.max(0, n + .2)); c.lerp(new T.Color(0xff8ad0), Math.max(0, Math.sin(a * 2 + 2) - .4) * .6); return c; }, { mat: { sheen: 0xc8b0ff, sheenK: .8, rim: .5, glow: .06 } });
    ring(g, goldFelt({ glow: .14 }), .805, .016, .8);
    // twinkle dots
    for (let i = 0; i < 40; i++) dot(g, M({ color: 0xffffff, emissive: 0xfff6d0, emissiveIntensity: .9 }), i * 2.399, PI / 2 + ((i * 37) % 11 - 5) * .17, i % 5 ? .008 : .013);
    // a little ringed planet at the top-right
    const pl = new T.Group(); blob(pl, felt(0xffb0d8, 0xb88cff, { glow: .06 }), [0, 0, 0], .5);
    const rg = mesh(new T.TorusGeometry(.8, .09, 12, 48), goldFelt({ glow: .15 })); rg.rotation.set(1.2, .3, 0); pl.add(rg);
    pl.scale.setScalar(.2); pl.position.set(Math.cos(deg(45)) * 1.0, Math.sin(deg(45)) * 1.0, .12); g.add(pl);
    const st = star(goldFelt({ glow: .2 }), .1); st.position.set(Math.cos(deg(200)) * R0, Math.sin(deg(200)) * R0, .1); g.add(st);
    const mn = extr(crescentShape(), felt(0xfff0a0, 0xffc860, { glow: .14 }), .35, .18), w = grp(mn); w.scale.setScalar(.12); w.rotation.z = 2.4; w.position.set(Math.cos(deg(-60)) * R0, Math.sin(deg(-60)) * R0, .1); g.add(w);
    [[deg(100), .05], [deg(140), .035], [deg(-10), .045], [deg(250), .04], [deg(-110), .03], [deg(20), .03]].forEach(([a, s]) => sparkleA(g, a, .97, s));
  };
  B.prism = g => {
    vcRing(g, (a, phi) => new T.Color().setHSL((a / TAU + .02 * Math.sin(phi)) % 1, .9, .7), { mat: { sheen: 0xffffff, sheenK: .9, rim: .5, glow: .07 } });
    ring(g, M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .35, roughness: .6 }), .81, .012, .8);
    ring(g, M({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .35, roughness: .6 }), .975, .012, .8);
    each(8, (a, i) => {
      const c = new T.Color().setHSL((a / TAU + .5) % 1, .85, .78).getHex(), cr = mesh(new T.OctahedronGeometry(.5, 0), gemM(c, { mat: { flatShading: true }, glow: .25, rim: .6 }));
      cr.scale.set(i % 2 ? .075 : .095, i % 2 ? .12 : .16, .06); cr.rotation.y = .5; const w = grp(cr); put(g, w, a, R0, .08);
    });
    [[deg(68), .05], [deg(158), .04], [deg(-22), .05], [deg(248), .04], [deg(112), .03], [deg(22), .03]].forEach(([a, s]) => sparkleA(g, a, .97, s));
  };
  B.royal = g => {
    ring(g, goldFelt({ glow: .1 }));
    ring(g, felt(0xd8405a, 0xa02848, { sheen: 0xffb0c0, sheenK: .7 }), .81, .03, .85);
    each(32, (a, i) => { if (Math.abs(((a - PI / 2) + 3 * TAU) % TAU) < .3 || Math.abs(((a - PI / 2) + 3 * TAU) % TAU - TAU) < .3) return; pearl(g, [Math.cos(a) * .975, Math.sin(a) * .975, .02], .018); }, PI / 2);
    const cols = [0xff4f7a, 0x4fb8ff, 0x5fe0a0, 0xb07cff];
    each(8, (a, i) => { if (i === 0) return; const gm = gem(cols[i % 4], i % 2 ? .085 : .11); gm.position.set(Math.cos(a) * R0, Math.sin(a) * R0, .08); g.add(gm); });
    const cr = K.crown(goldFelt({ glow: .16 }), gemM(0xff4f7a), .56); cr.rotation.x = .1; cr.position.set(0, .8, .18); g.add(cr);
    [[deg(40), .055], [deg(140), .045], [deg(-30), .045], [deg(210), .04], [deg(-90), .035]].forEach(([a, s]) => sparkleA(g, a, .97, s));
  };
  B.atlas = g => {
    vcRing(g, (a) => { const t = (Math.cos(a - deg(135)) + 1) / 2, c = new T.Color(0xff7fbf); return t > .5 ? c.lerp(new T.Color(0x9a78ff), 1).lerp(new T.Color(0x4fb4ff), (t - .5) * 2) : c.lerp(new T.Color(0x9a78ff), t * 2); }, { mat: { sheen: 0xffffff, sheenK: .8, rim: .45, glow: .06 } });
    ring(g, goldFelt({ glow: .14 }), .808, .018, .8);
    // a tiny globe at the top
    const gl = new T.Group(); blob(gl, felt(0x7fcbff, 0x6a8cff, { glow: .05 }), [0, 0, 0], .5);
    const land = felt(0x7fe0a0, 0x40b890); [[-.18, .2, .42, .2, .16], [.22, -.05, .42, .16, .22], [-.1, -.28, .4, .14, .1]].forEach(([x, y, z, rx, ry]) => blob(gl, land, [x, y, z], [rx, ry, .1]));
    const rg = mesh(new T.TorusGeometry(.66, .06, 10, 48), goldFelt({ glow: .15 })); rg.rotation.set(1.3, 0, .35); gl.add(rg);
    gl.scale.setScalar(.2); gl.position.set(0, .86, .16); g.add(gl);
    each(8, (a, i) => { if (i === 0) return; const s = star(felt(0xffffff, 0xd8e4ff, { glow: .2 }), i % 2 ? .06 : .08, 4, .38); put(g, s, a, R0, .09); });
    [[deg(55), .045], [deg(125), .045], [deg(-20), .04], [deg(200), .04]].forEach(([a, s]) => sparkleA(g, a, .975, s));
  };

  // keep every ornament inside the image (|x|, |y| ≤ LIM) and out of the avatar's middle (r ≥ IN):
  // each top-level child is nudged along its own radial direction (rings centred at 0 are left alone)
  const LIM = .985, IN = .74;
  function fit(g) {
    g.children.forEach(ch => {
      if (ch.userData.band) return;
      for (let it = 0; it < 12; it++) {
        g.updateMatrixWorld(true);
        const box = new T.Box3().setFromObject(ch), c = box.getCenter(V3()), rc = Math.hypot(c.x, c.y);
        if (rc < .05) return;
        const ux = c.x / rc, uy = c.y / rc;
        let over = 0;
        if (box.max.x > LIM) over = Math.max(over, (box.max.x - LIM) / Math.max(ux, .2));
        if (box.min.x < -LIM) over = Math.max(over, (-LIM - box.min.x) / Math.max(-ux, .2));
        if (box.max.y > LIM) over = Math.max(over, (box.max.y - LIM) / Math.max(uy, .2));
        if (box.min.y < -LIM) over = Math.max(over, (-LIM - box.min.y) / Math.max(-uy, .2));
        // innermost corner of the box (closest point to the centre)
        const ix = Math.max(box.min.x, Math.min(0, box.max.x)), iy = Math.max(box.min.y, Math.min(0, box.max.y)), inner = Math.hypot(ix, iy);
        const under = Math.max(0, IN - inner);
        if (!over && !under) return;
        if (over && under) { ch.scale.multiplyScalar(.92); continue; }      // too big for the band: shrink, then retry
        const d = over ? -over : under; ch.position.x += ux * d; ch.position.y += uy * d;
        if (under) {                                                        // pushed out → would it now poke past the edge? then shrink instead
          g.updateMatrixWorld(true); const b2 = new T.Box3().setFromObject(ch);
          if (b2.max.x > LIM || b2.min.x < -LIM || b2.max.y > LIM || b2.min.y < -LIM) { ch.position.x -= ux * d; ch.position.y -= uy * d; ch.scale.multiplyScalar(.92); }
        }
      }
    });
  }
  function build(key) {
    const g = new T.Group(); (B[key] || B.white)(g);
    g.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    fit(g);
    return g;
  }
  window.FRAME3D = { build, keys: Object.keys(B) };
})();
