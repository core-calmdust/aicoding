/* =====================================================================
   Amazons on the 3D table — two boards (Table3D.BOARDS.amazons, the full game's design tab / the portal's 盤 row):
   · 'temple' (the default) the Temple of Themiscyra: the 2D page's marble board (amazons/img/bd-temple.webp, Carrara and
              verde antico squares with gold joints) on a polished slab framed in cream marble (fr-temple.webp), standing on
              a two-step stylobate like a temple's floor;
   · 'ruins'  the jungle ruins: the dressed stones of bd-ruins.webp, each one a block with a sunken joint (a normal map), on a
              rough, hand-split slab of mossy stone;
   · 'krater' the Amazonomachy vase: clay and black glaze (bd-vase / fr-vase) on a glazed foot with a clay-red band;
   · 'navy'   navy and ivory lacquer with gold hairlines, a thin top on a recessed plinth;
   · 'camp'   a campaign table: tooled leather squares with gilt fillets in walnut, brass corners (bd-camp / fr-camp);
   · 'minimal' modern and minimal: one thin slab of matte pale stone, no lines, floating on a dark recessed base (bd-minimal).
   The amazons are sculpted figures (Table3D.amazons.SETS, chosen under 「3D駒」 in the design tab, 'atlas-amazons-pc3'):
   · 'statue'  a marble bust with a crested Corinthian helmet and a spear (White: Carrara; Black: black marble with gold veins)
   · 'archer'  an abstract Scythian archer: a robed, turned figure in a Phrygian cap, a recurve bow held across the body and a
               quiver of arrows on the back (White: ivory; Black: ebony; gold fittings)
   · 'bronze'  a tall queen in bronze crowned with a crested helmet (White: gilt bronze with verdigris; Black: dark iron)
   An arrow is a fire arrow stuck in a scorched square (arrow(), scorch()); the skin animates its flight.
   Registers into Table3D:
     Table3D.MODELS.amazons(live)   board (+ a game in progress unless live)
     Table3D.amazons = { board(look), piece(col, set), arrow(), scorch(), SETS, LOOKS, W, H, R }
     userData: { S, top, W, H, look, sink, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col 1 White | 2 Black) }
   Units: one square is 1.0; the slab is (10 + .9) × (10 + 1.6) like the 2D page's frame (the count plates on the far / near bands).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const N = 10, BX = .45, BZ = .8, TH = .42, RAD = .36, R = .36;
  const W = N + 2 * BX, H = N + 2 * BZ;
  const LOOKS = ['temple', 'ruins', 'krater', 'navy', 'camp', 'minimal'], SETS = ['statue', 'archer', 'bronze'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../amazons/img/', s).href; } catch (e) {} return '../amazons/img/'; })();
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (p.emissive !== undefined) p.emissive = lin(p.emissive);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const loadImg = src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y, o = 4) => { let v = 0, a = .5, f = 1, s = 0; for (let i = 0; i < o; i++) { v += a * vnoise(x * f + i * 17, y * f - i * 9); s += a; a *= .5; f *= 2.03; } return v / s; };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = x => Math.max(0, Math.min(1, x));
  function pixTex(key, w, fn, repeat) {   // a texture painted pixel by pixel (cached)
    return mat('tx' + key, () => {
      const TT = T(), c = document.createElement('canvas'); c.width = c.height = w; const g = c.getContext('2d'), im = g.createImageData(w, w);
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const [r, gg, b] = fn(x / w, y / w), i = (y * w + x) * 4; im.data[i] = r; im.data[i + 1] = gg; im.data[i + 2] = b; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0);
      const t = new TT.CanvasTexture(c); t.wrapS = t.wrapT = TT.RepeatWrapping; if (repeat) t.repeat.set(repeat, repeat); t.anisotropy = 4; t.encoding = TT.sRGBEncoding; return t;
    });
  }

  /* ---------- the top: the 2D page's board and frame pictures, a normal map for the ruins' joints ---------- */
  const tops = {}, FILE = { krater: 'vase' };   // (the krater board uses the 2D page's vase pictures)
  function topTex(look) {
    if (tops[look]) return tops[look];
    const TT = T(), ppu = SZ(LO() ? 80 : 120), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = N * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const C0 = { temple: ['#ddd2bc', '#cfd6cc'], ruins: ['#2c3626', '#6a6e5c'], krater: ['#16110d', '#b4643a'], navy: ['#18243e', '#d8cfbd'], camp: ['#4a2e1a', '#a06a44'], minimal: ['#ddc7a4', '#dedbd4'] }[look];
    g.fillStyle = C0[0]; g.fillRect(0, 0, Wp, Hp);
    g.fillStyle = C0[1]; g.fillRect(ox, oz, F, F);
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    const file = FILE[look] || look;
    Promise.all([loadImg(IMG + 'fr-' + file + '.webp'), loadImg(IMG + 'bd-' + file + '.webp')]).then(([fr, bd]) => {
      if (fr) g.drawImage(fr, 0, 0, Wp, Hp);
      if (look === 'minimal' && fr) { g.fillStyle = '#efece6'; g.fillRect(0, 0, Wp, Hp); }   // (minimal: one stone slab, the oak only on the sides)
      if (bd) {
        if (look !== 'minimal') { g.save(); g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = ppu * .12; g.fillStyle = '#000'; g.fillRect(ox, oz, F, F); g.restore(); }
        g.drawImage(bd, ox, oz, F, F);
      }
      if (look === 'navy' || look === 'camp') { g.strokeStyle = '#d2ac5e'; g.lineWidth = ppu * .03; g.strokeRect(ox - ppu * .1, oz - ppu * .1, F + ppu * .2, F + ppu * .2); }
      if (look === 'temple') { g.strokeStyle = '#d2ac5e'; g.lineWidth = ppu * .05; g.strokeRect(ox - ppu * .06, oz - ppu * .06, F + ppu * .12, F + ppu * .12); }
      map.needsUpdate = true; if (X.kick) X.kick(300);
    });
    let nmT = null;
    if (look === 'ruins') {   // every square a block: the joint sinks between them, the arrises rounded
      const ns = SZ(LO() ? 32 : 48), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
      const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH);
      const hAt = (x, z) => {
        const u = x - BX, v = z - BZ, rough = (fbm(x * 3, z * 3) - .5) * .02;
        if (u <= 0 || u >= N || v <= 0 || v >= N) return rough * 1.5;
        const fx = u - Math.floor(u), fz = v - Math.floor(v), e = Math.min(fx, 1 - fx, fz, 1 - fz) - .05;
        return (e < 0 ? -.04 : -.04 + .04 * Math.sin(Math.min(1, e / .12) * Math.PI / 2)) + rough;
      };
      for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) hh[y * nW + x] = hAt((x + .5) / ns, (y + .5) / ns);
      for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
        const L = hh[y * nW + Math.max(0, x - 1)], Rr = hh[y * nW + Math.min(nW - 1, x + 1)], U = hh[Math.max(0, y - 1) * nW + x], D = hh[Math.min(nH - 1, y + 1) * nW + x];
        const dx = -(Rr - L) * ns / 2, dz = -(D - U) * ns / 2, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      }
      ng.putImageData(img, 0, 0); nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    }
    return (tops[look] = { map, nm: nmT });
  }

  /* ---------- the slab (and the temple's stylobate) ---------- */
  const geos = {};
  function roundRect(w, h, r, rough, seed) {
    const TT = T(), sh = new TT.Shape(), a = w / 2 - r, b = h / 2 - r;
    const r0 = new TT.Shape();
    r0.moveTo(-a, -h / 2); r0.lineTo(a, -h / 2); r0.absarc(a, -b, r, -Math.PI / 2, 0, false); r0.lineTo(w / 2, b); r0.absarc(a, b, r, 0, Math.PI / 2, false);
    r0.lineTo(-a, h / 2); r0.absarc(-a, b, r, Math.PI / 2, Math.PI, false); r0.lineTo(-w / 2, -b); r0.absarc(-a, -b, r, Math.PI, Math.PI * 1.5, false);
    if (!rough) return r0;
    const pts = r0.getSpacedPoints(110); pts.pop();
    pts.forEach((p, i) => { const l = Math.hypot(p.x, p.y), dd = (fbm(p.x * .6 + seed, p.y * .6 + 4) - .5) * rough; const q = [p.x + p.x / l * dd, p.y + p.y / l * dd]; i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]); });
    return sh;
  }
  function slabGeo(key, w, h, th, r, rough, uvTop) {
    if (geos[key]) return geos[key];
    const TT = T(), bv = .06;
    const g = new TT.ExtrudeGeometry(roundRect(w, h, r, rough, key.length * 3.1), { depth: th - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 1 : 2, curveSegments: LO() ? 5 : 8, steps: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale((w - .02) / (w + 2 * (bv - .01)), 1, (h - .02) / (h + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count);
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (rough && y < th - .03) { const k = 1 + (fbm(x * 1.7 + y * 3, z * 1.7 - y * 2) - .5) * .04; P.setX(i, x * k); P.setZ(i, z * k); }
      if (side[i]) UV.setXY(i, (x + z) / 3, P.getY(i) / th * .3); else if (uvTop) UV.setXY(i, x / w + .5, .5 - z / h); else UV.setXY(i, x / 4, z / 4);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (geos[key] = g);
  }
  function sideTex(look) {
    return mat('sideT' + look, () => { const t = new (T().TextureLoader)().load(IMG + 'fr-' + (FILE[look] || look) + '.webp', () => X.kick && X.kick(200)); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(2, 1); return t; });
  }
  const GOLDM = () => mat('gold', () => phys({ color: '#e2b660', metalness: 1, roughness: .28 }));
  function board(look) {
    look = LOOKS.includes(look) ? look : (X.BOARDS && X.BOARDS.amazons ? X.BOARDS.amazons.get() : 'temple');
    const TT = T(), g = new TT.Group(), tx = topTex(look);
    const TOP = {
      temple: { roughness: .3, clearcoat: .7, clearcoatRoughness: .14, envMapIntensity: .9 },
      ruins: { normalMap: tx.nm, normalScale: new TT.Vector2(1.4, 1.4), roughness: .9, envMapIntensity: .55 },
      krater: { roughness: .35, clearcoat: .8, clearcoatRoughness: .12, envMapIntensity: .9 },   // fired clay under a glossy glaze
      navy: { roughness: .25, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1 },       // lacquer
      camp: { roughness: .7, clearcoat: .15, clearcoatRoughness: .5, envMapIntensity: .6 },       // waxed leather
      minimal: { roughness: .85, envMapIntensity: .5 },                                          // matte stone
    }[look];
    const topM = mat('top' + look, () => phys(Object.assign({ map: tx.map, color: '#ffffff' }, TOP)));
    const SIDE = {
      temple: { color: '#ffffff', roughness: .32, clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: .9 },
      ruins: { color: '#c8ccb6', roughness: .95, envMapIntensity: .45 },
      krater: { color: '#ffffff', roughness: .25, clearcoat: .9, clearcoatRoughness: .1 },
      navy: { color: '#ffffff', roughness: .25, clearcoat: 1, clearcoatRoughness: .08 },
      camp: { color: '#ffffff', roughness: .4, clearcoat: .6, clearcoatRoughness: .25 },            // oiled walnut
      minimal: { color: '#ffffff', roughness: .6, envMapIntensity: .6 },                          // pale oak
    }[look];
    const sideM = mat('side' + look, () => phys(Object.assign({ map: sideTex(look) }, SIDE)));
    const add = (m, y) => { m.position.y = y || 0; m.castShadow = m.receiveShadow = true; g.add(m); return m; };
    let base = 0, th = TH, rad = RAD, rough = 0;
    if (look === 'temple') {   // the stylobate: two steps of the same marble under the slab, a gold fillet on the upper one
      add(new TT.Mesh(slabGeo('st1', W + 1.2, H + 1.2, .16, .5, 0, false), sideM));
      add(new TT.Mesh(slabGeo('st2', W + .6, H + .6, .16, .44, 0, false), sideM), .16);
      add(new TT.Mesh(slabGeo('fil', W + .3, H + .3, .03, .4, 0, false), GOLDM()), .32);
      base = .35;
    } else if (look === 'ruins') { rad = RAD * 1.4; rough = .4; }
    else if (look === 'krater') {   // a black-glazed slab on a foot, a clay-red band round its foot as on a krater
      const glaze = mat('glaze', () => phys({ color: '#17110d', roughness: .22, clearcoat: .9, clearcoatRoughness: .1 }));
      const clay = mat('clayband', () => phys({ color: '#c0663a', roughness: .5 }));
      add(new TT.Mesh(slabGeo('kf', W - .8, H - .8, .22, .5, 0, false), glaze));
      add(new TT.Mesh(slabGeo('kb', W - .5, H - .5, .06, .45, 0, false), clay), .2);
      base = .26;
    } else if (look === 'navy') {   // a thin lacquer top with a gold fillet, on a recessed plinth (it seems to float)
      const lac = mat('navylac', () => phys({ color: '#141e34', roughness: .2, clearcoat: 1, clearcoatRoughness: .06 }));
      add(new TT.Mesh(slabGeo('np', W - 1.4, H - 1.4, .28, .3, 0, false), lac));
      add(new TT.Mesh(slabGeo('nf', W + .06, H + .06, .03, RAD + .03, 0, false), GOLDM()), .28);
      base = .3; th = .24;
    } else if (look === 'camp') {   // a campaign table: walnut, the leather inset, brass corners
      const brass = mat('brass', () => phys({ color: '#c99a52', metalness: 1, roughness: .35 }));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = new TT.Mesh(new TT.BoxGeometry(.7, TH + .04, .7), brass); c.position.set(sx * (W / 2 - .3), TH / 2, sz * (H / 2 - .3)); c.castShadow = true; g.add(c); }
      rad = .08;
    } else if (look === 'minimal') {   // one thin slab of pale stone floating on a dark, recessed base
      const dark = mat('mindark', () => phys({ color: '#2a2a2c', roughness: .7 }));
      add(new TT.Mesh(slabGeo('mb', W - 2, H - 2, .3, .2, 0, false), dark));
      base = .3; th = .18; rad = .06;
    }
    const slab = add(new TT.Mesh(slabGeo('slab' + look, W, H, th, rad, rough, true), [topM, sideM]), base);
    void slab;
    const top = base + th + .002;
    Object.assign(g.userData, { S: N, top, W, H, look, sink: 0, pt: (x, y) => [-N / 2 + x + .5, -N / 2 + y + .5], piece: (col, set) => piece(col, set) });
    return g;
  }

  /* ---------- the amazons: sculpted figures ---------- */
  const SEG = () => LO() ? 12 : 18;   // (2026-11-10: polygons cut ~60% — 8 figures + up to 92 arrows on the board)
  const lathe = (pts, seg) => new (T().LatheGeometry)(pts.map(([x, y]) => new (T().Vector2)(x, y)), seg || SEG());
  const share = g => { if (X.share) X.share(g); return g; };
  const marbleTex = (key, base, vein, vein2, scale) => pixTex(key, SZ(LO() ? 192 : 320), (u, v) => {
    const w = fbm(u * 4, v * 4) * 6, s = Math.abs(Math.sin((u * 3 + v * 7) * scale + w * 2.2)), fine = Math.abs(Math.sin((u * 11 - v * 5) * scale + fbm(u * 9 + 3, v * 9) * 9));
    let c = base.slice(); c = mix(c, vein, clamp(Math.pow(1 - s, 9) * 1.1)); c = mix(c, vein2, clamp(Math.pow(1 - fine, 22) * .8));
    const cl = (fbm(u * 18, v * 18, 3) - .5) * 14; return c.map(x => Math.max(0, Math.min(255, x + cl)));
  });
  const bronzeTex = (key, dark) => pixTex(key, SZ(LO() ? 192 : 320), (u, v) => {
    const n = fbm(u * 6, v * 6), m = fbm(u * 24 + 7, v * 24, 3);
    if (dark) { let c = [58, 56, 60]; c = mix(c, [28, 26, 30], clamp((n - .4) * 2)); return mix(c, [92, 70, 48], clamp((m - .62) * 4) * .5); }
    let c = [176, 122, 64]; c = mix(c, [212, 162, 92], clamp((m - .5) * 2) * .6); return mix(c, [74, 138, 118], clamp((n - .56) * 3.2) * .85);
  });
  const ivoryTex = key => pixTex(key, SZ(LO() ? 192 : 320), (u, v) => { const g = Math.sin(v * 60 + fbm(u * 2, v * 12) * 6) * .5 + .5, n = fbm(u * 8, v * 8); return mix([246, 236, 214], [226, 208, 172], g * .35 + (n - .5) * .4); });
  const ebonyTex = key => pixTex(key, SZ(LO() ? 192 : 320), (u, v) => { const g = Math.sin(v * 140 + fbm(u * 3, v * 30) * 9) * .5 + .5; return mix([46, 31, 24], [10, 6, 5], Math.pow(g, 3) * .8); });
  function matSet(set, col) {
    const w = col === 1;
    return mat('m' + set + col, () => {
      const GOLD = mat('gold', () => phys({ color: '#e2b660', metalness: 1, roughness: .28 }));
      if (set === 'statue') return { body: w ? phys({ map: marbleTex('mw', [240, 236, 228], [150, 150, 158], [190, 186, 182], 2), roughness: .32, clearcoat: .5, clearcoatRoughness: .25 })
                                            : phys({ map: marbleTex('mb', [24, 24, 28], [212, 176, 104], [120, 120, 130], 2), roughness: .2, clearcoat: .9, clearcoatRoughness: .12 }),
                                     trim: w ? mat('pgold', () => phys({ color: '#e9d9b0', metalness: 1, roughness: .3 })) : GOLD };
      if (set === 'bronze') return { body: phys({ map: bronzeTex(w ? 'bw' : 'bb', !w), metalness: 1, roughness: w ? .34 : .42 }), trim: w ? GOLD : mat('copper', () => phys({ color: '#b87c48', metalness: 1, roughness: .32 })) };
      return { body: w ? phys({ map: ivoryTex('iv'), roughness: .38, clearcoat: .45, clearcoatRoughness: .3 }) : phys({ map: ebonyTex('eb'), roughness: .28, clearcoat: .7, clearcoatRoughness: .2 }), trim: GOLD };
    });
  }
  // shared geometries (one per set: every amazon of a set uses the same ones → instanced by Table3D)
  const pg = {};
  const G = (k, f) => pg[k + (LO() ? 'l' : 'h')] || (pg[k + (LO() ? 'l' : 'h')] = share(f()));
  function mesh(geo, m, x, y, z, rx, ry, rz, sx, sy, sz) {
    const o = new (T().Mesh)(geo, m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); if (sx) o.scale.set(sx, sy || sx, sz || sx); o.castShadow = true; return o;
  }
  function crestGeo(w, h, depth) {
    const TT = T(), s = new TT.Shape();
    s.moveTo(-w, 0); s.bezierCurveTo(-w, h * 1.1, w * .2, h * 1.25, w * .95, h * .5); s.bezierCurveTo(w * 1.05, h * .25, w, .05, w * .8, 0); s.lineTo(-w, 0);
    const g = new TT.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * .35, bevelSize: depth * .3, bevelSegments: 1, curveSegments: LO() ? 6 : 9 });
    g.translate(0, 0, -depth / 2); return g;
  }
  function helmet(g, M, key, r, y, open) {
    const TT = T();
    g.add(mesh(G(key + 'cap', () => lathe([[0, r * 1.02], [r * .45, r * .93], [r * .78, r * .66], [r * .97, r * .28], [r * 1.02, r * .05], [r * .9, r * .05], [0, r * .05]].reverse())), M.body, 0, y));
    const sk = G(key + 'sk', () => new TT.LatheGeometry([[r * 1.02, r * .06], [r * 1.04, -r * .3], [r * 1.1, -r * .62], [r * 1.05, -r * .68], [r * .96, -r * .4], [r * .92, r * .06]].reverse().map(([a, b]) => new TT.Vector2(a, b)), SEG(), open ? Math.PI * .3 : 0, open ? Math.PI * 1.4 : Math.PI * 2));
    g.add(mesh(sk, open ? mat(M.body.uuid + 'ds', () => { const c = M.body.clone(); c.side = TT.DoubleSide; return c; }) : M.body, 0, y));
    g.add(mesh(G(key + 'band', () => new TT.TorusGeometry(r, r * .05, 8, SEG())), M.trim, 0, y + r * .08, 0, Math.PI / 2));
    g.add(mesh(G(key + 'nose', () => new TT.BoxGeometry(r * .13, r * .5, r * .09)), M.body, 0, y - r * .2, r, -.1));
    g.add(mesh(G(key + 'crest', () => crestGeo(r * 1.3, r * 1.25, r * .34)), M.body, 0, y + r * .86, -r * .12, 0, Math.PI / 2));
    g.add(mesh(G(key + 'hold', () => new TT.CylinderGeometry(r * .1, r * .14, r * .3, 8, 1, true)), M.trim, 0, y + r * .98));
  }
  function statue(g, M) {   // a marble bust on a moulded plinth: crested helmet, cloak and brooch, a spear behind the shoulder
    const TT = T();
    g.add(mesh(G('st-pl', () => lathe([[0, 0], [.56, 0], [.56, .06], [.53, .09], [.5, .1], [.5, .24], [.53, .27], [.54, .29], [.48, .34], [0, .34]])), M.body));
    g.add(mesh(G('st-ring', () => new TT.TorusGeometry(.51, .016, 6, SEG())), M.trim, 0, .18, 0, Math.PI / 2));
    g.add(mesh(G('st-sock', () => lathe([[0, .34], [.24, .34], [.19, .38], [.17, .44], [.22, .48], [0, .48]])), M.body));
    g.add(mesh(G('st-torso', () => lathe([[0, .46], [.2, .46], [.27, .5], [.33, .58], [.38, .68], [.42, .76], [.43, .8], [.4, .85], [.31, .89], [.2, .93], [.12, .96], [0, .97]])), M.body, 0, 0, 0, 0, 0, 0, 1.05, 1, .56));
    g.add(mesh(G('st-nl', () => new TT.TorusGeometry(.16, .014, 4, 18)), M.trim, 0, .925, 0, Math.PI / 2, 0, 0, 1.05, .6, 1));
    g.add(mesh(G('st-fib', () => new TT.SphereGeometry(.035, 8, 5)), M.trim, .25, .84, .16));
    g.add(mesh(G('st-cloak', () => new TT.TorusGeometry(.3, .03, 5, 12, Math.PI * .5)), M.body, .02, .74, .06, -.35, .1, Math.PI * .1, 1, 1, .5));
    g.add(mesh(G('st-neck', () => new TT.CylinderGeometry(.095, .12, .24, 12, 1, true)), M.body, 0, 1.06));
    g.add(mesh(G('st-head', () => new TT.SphereGeometry(.19, 16, 12)), M.body, 0, 1.26, .02, 0, 0, 0, .86, 1.08, .98));
    g.add(mesh(G('st-jaw', () => new TT.SphereGeometry(.115, 10, 7)), M.body, 0, 1.14, .09, 0, 0, 0, .92, .8, .9));
    g.add(mesh(G('st-nose', () => new TT.ConeGeometry(.024, .075, 8)), M.body, 0, 1.25, .2, Math.PI / 2 + .4));
    helmet(g, M, 'st-h', .205, 1.32, true);
    g.add(mesh(G('st-hair', () => new TT.CylinderGeometry(.08, .15, .36, 10, 1, true)), M.body, 0, 1.1, -.13, .32));
    g.add(mesh(G('st-shaft', () => new TT.CylinderGeometry(.016, .016, 1.55, 5, 1, true)), M.trim, .42, 1.08, -.16, 0, 0, -.08));
    g.add(mesh(G('st-tip', () => new TT.SphereGeometry(.06, 8, 5)), M.trim, .488, 1.965, -.16, 0, 0, -.08, .55, 2.3, .22));
  }
  function bronze(g, M) {   // a tall queen: a fluted stem and a wide collar, crowned by a crested helmet
    const TT = T();
    g.add(mesh(G('br-body', () => lathe([[0, 0], [.58, 0], [.6, .05], [.58, .1], [.48, .13], [.5, .18], [.42, .22], [.32, .25], [.27, .32], [.22, .48], [.17, .7], [.14, .86], [.15, .9], [.3, .93], [.36, .97], [.3, 1.0], [.18, 1.02], [.15, 1.06], [0, 1.06]])), M.body));
    for (const [y, r] of [[.1, .585], [.96, .355]]) g.add(mesh(G('br-r' + r, () => new TT.TorusGeometry(r, .018, 6, SEG())), M.trim, 0, y, 0, Math.PI / 2));
    const fl = G('br-fl', () => new TT.CylinderGeometry(.01, .014, .52, 4, 1, true));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.add(mesh(fl, M.trim, Math.cos(a) * .2, .58, Math.sin(a) * .2)); }
    helmet(g, M, 'br-h', .25, 1.2, false);
  }
  // an abstract Scythian archer: a robe turned like a chess piece, a Phrygian cap bent forward, a recurve bow across the body,
  // a quiver with three fletched arrows on the back
  function archer(g, M) {
    const TT = T();
    g.add(mesh(G('ar-base', () => lathe([[0, 0], [.54, 0], [.56, .04], [.54, .08], [.46, .1], [.48, .14], [.4, .17], [0, .17]])), M.body));
    g.add(mesh(G('ar-r0', () => new TT.TorusGeometry(.545, .016, 6, SEG())), M.trim, 0, .065, 0, Math.PI / 2));
    // the robe: wide at the hem, the waist drawn in by a belt, the chest, the shoulders, a slender neck
    g.add(mesh(G('ar-robe', () => lathe([[0, .16], [.36, .16], [.345, .22], [.3, .3], [.25, .42], [.2, .56], [.158, .68], [.135, .76], [.152, .83], [.176, .9], [.182, .96], [.15, 1.01], [.075, 1.04], [.055, 1.09], [0, 1.09]])), M.body, 0, 0, 0, 0, 0, 0, 1, 1, .84));
    for (const [y, r] of [[.3, .302], [.44, .238], [.2, .352]]) g.add(mesh(G('ar-hem' + y, () => new TT.TorusGeometry(r, .009, 5, SEG())), M.trim, 0, y, 0, Math.PI / 2, 0, 0, 1, .84, 1));   // embroidered bands on the robe
    g.add(mesh(G('ar-belt', () => new TT.TorusGeometry(.138, .02, 6, SEG())), M.trim, 0, .76, 0, Math.PI / 2, 0, 0, 1, .84, 1));
    g.add(mesh(G('ar-buckle', () => new TT.SphereGeometry(.028, 6, 4)), M.trim, 0, .76, .118));
    g.add(mesh(G('ar-torc', () => new TT.TorusGeometry(.07, .013, 4, 14)), M.trim, 0, 1.06, 0, Math.PI / 2 + .12));   // a gold torc at the neck
    g.add(mesh(G('ar-head', () => new TT.SphereGeometry(.098, 14, 10)), M.body, 0, 1.17, .01, 0, 0, 0, .9, 1.1, .96));
    // the Phrygian cap: a tall cone whose tip curls forward and down, a gold band round the brow, lappets down the sides
    g.add(mesh(G('ar-cap', () => {
      const geo = lathe([[.112, 0], [.116, .05], [.104, .12], [.085, .19], [.062, .25], [.04, .3], [.02, .34], [0, .35]]), P = geo.attributes.position;
      for (let i = 0; i < P.count; i++) { const y = P.getY(i), t = y / .35; P.setZ(i, P.getZ(i) + t * t * .2); P.setY(i, y - t * t * t * t * .12); }
      geo.computeVertexNormals(); return geo;
    }), M.body, 0, 1.19, -.02));
    g.add(mesh(G('ar-capband', () => new TT.TorusGeometry(.113, .013, 6, SEG())), M.trim, 0, 1.2, -.02, Math.PI / 2));
    g.add(mesh(G('ar-captip', () => new TT.SphereGeometry(.022, 6, 4)), M.trim, 0, 1.19 + .23, -.02 + .2));
    for (const s of [1, -1]) g.add(mesh(G('ar-lap', () => new TT.BoxGeometry(.026, .17, .065)), M.body, s * .1, 1.1, -.02, 0, 0, s * .1));
    // the recurve bow (the Scythian kind: the grip set back, the limbs bending forward, the tips curling back), held upright beside
    // the body in the left hand with an arrow on the string; its plane faces the viewer, so the double curve reads
    const bowPts = [[.06, -.5], [.0, -.44], [-.05, -.32], [-.06, -.18], [-.02, -.05], [-.035, 0], [-.02, .05], [-.06, .18], [-.05, .32], [.0, .44], [.06, .5]];
    const bow = new TT.Group();
    bow.add(mesh(G('ar-bow', () => new TT.TubeGeometry(new TT.CatmullRomCurve3(bowPts.map(([x, y]) => new TT.Vector3(x, y, 0))), LO() ? 16 : 24, .017, 4, false)), M.trim));
    bow.add(mesh(G('ar-grip', () => new TT.CylinderGeometry(.026, .026, .12, 6, 1, true)), M.body, -.035, 0));
    bow.add(mesh(G('ar-string', () => new TT.CylinderGeometry(.0045, .0045, 1.0, 3, 1, true)), M.trim, .06, 0));
    for (const s of [1, -1]) bow.add(mesh(G('ar-nock', () => new TT.SphereGeometry(.022, 6, 4)), M.trim, .06, s * .5));
    bow.add(mesh(G('ar-arrow', () => new TT.CylinderGeometry(.006, .006, .3, 3, 1, true)), M.body, .02, .0, 0, 0, 0, Math.PI / 2));   // the nocked arrow
    bow.add(mesh(G('ar-arrowhead', () => new TT.ConeGeometry(.018, .05, 4)), M.trim, -.15, 0, 0, 0, 0, Math.PI / 2));
    bow.position.set(.27, .72, .1); bow.rotation.set(0, -.25, -.08); g.add(bow);
    // the quiver (a gorytos) on the back, three arrows with gold nocks and fletchings standing out of it
    const q = new TT.Group();
    q.add(mesh(G('ar-quiver', () => lathe([[0, 0], [.06, 0], [.075, .08], [.08, .32], [.085, .36], [0, .36]], 12)), M.body));
    q.add(mesh(G('ar-qband', () => new TT.TorusGeometry(.081, .01, 3, 10)), M.trim, 0, .3, 0, Math.PI / 2));
    q.add(mesh(G('ar-qband2', () => new TT.TorusGeometry(.077, .01, 3, 10)), M.trim, 0, .08, 0, Math.PI / 2));
    const vane = G('ar-vane', () => { const s = new TT.Shape(); s.moveTo(0, 0); s.lineTo(.035, .02); s.lineTo(.035, .1); s.lineTo(0, .085); s.lineTo(0, 0); return new TT.ExtrudeGeometry(s, { depth: .006, bevelEnabled: false }); });
    for (let k = 0; k < 3; k++) {
      const a = new TT.Group(), dx = (k - 1) * .035;
      a.add(mesh(G('ar-ashaft', () => new TT.CylinderGeometry(.006, .006, .12, 3, 1, true)), M.body, 0, .06));
      for (let v = 0; v < 3; v++) { const vm = mesh(vane, M.trim, 0, .02); vm.rotation.y = v * Math.PI * 2 / 3; a.add(vm); }
      a.add(mesh(G('ar-anock', () => new TT.SphereGeometry(.012, 4, 3)), M.trim, 0, .13));
      a.position.set(dx, .34, (k % 2) * .02); a.rotation.z = -(k - 1) * .12; q.add(a);
    }
    q.position.set(-.1, .58, -.16); q.rotation.set(-.32, 0, .38); g.add(q);
  }
  const BUILD = { statue, bronze, archer };
  const SCALE = { statue: .76, bronze: .78, archer: .84 };   // the base ≈ .36 across a square of 1.0
  const pcSet = () => { try { const v = localStorage.getItem('atlas-amazons-pc3'); return SETS.includes(v) ? v : 'statue'; } catch (e) { return 'statue'; } };
  // col 1 White / 2 Black (the game's P1 / P2); every figure faces the near side (the viewer)
  function piece(col, set) {
    set = SETS.includes(set) ? set : pcSet();
    const TT = T(), g = new TT.Group(), inner = new TT.Group(), M = matSet(set, col);
    BUILD[set](inner, M);
    inner.scale.setScalar(SCALE[set]); inner.rotation.y = set === 'archer' ? (col === 2 ? -.55 : .55) : col === 2 ? -.35 : .25;   // (both sides turned to the viewer, a little apart: the faces read)
    inner.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.add(inner); g.userData = { col, set, h: 1.2 };
    return g;
  }

  /* ---------- an arrow stuck in a burnt square ---------- */
  function arrow() {
    const TT = T(), g = new TT.Group();
    const wood = mat('aw', () => phys({ color: '#5a3a22', roughness: .6 })), iron = mat('ai', () => phys({ color: '#3a3836', metalness: .9, roughness: .45 }));
    const fl = mat('af', () => phys({ color: '#efe2c4', roughness: .8, side: TT.DoubleSide })), char = mat('ac', () => phys({ color: '#1a120c', roughness: .9 }));
    const a = new TT.Group();
    a.add(mesh(G('a-shaft', () => new TT.CylinderGeometry(.024, .024, .9, 5, 1, true)), wood, 0, .45));
    a.add(mesh(G('a-char', () => new TT.CylinderGeometry(.027, .025, .2, 5, 1, true)), char, 0, .08));   // the burnt end by the head
    a.add(mesh(G('a-head', () => new TT.ConeGeometry(.055, .16, 4)), iron, 0, -.05, 0, Math.PI));
    const vane = G('a-vane', () => { const s = new TT.Shape(); s.moveTo(0, 0); s.lineTo(.1, .05); s.lineTo(.1, .26); s.lineTo(0, .22); s.lineTo(0, 0); return new TT.ShapeGeometry(s); });
    for (let v = 0; v < 3; v++) { const m = mesh(vane, fl, 0, .66); m.rotation.y = v * Math.PI * 2 / 3; a.add(m); }
    a.rotation.z = .5; a.position.y = -.03; g.add(a);
    g.userData.arrow = a;
    return g;
  }
  // the scorch mark: a soft, uneven char burnt into the square (a transparent decal just above the top)
  function scorch() {
    const TT = T();
    const m = mat('scorch', () => {
      const t = X.canvasTex('amzScorch', SZ(256), SZ(256), (g2, w) => {
        g2.clearRect(0, 0, w, w); const c = w / 2;
        for (let k = 0; k < 7; k++) {   // a few overlapping blots: not a perfect circle
          const a = k / 7 * Math.PI * 2, r = w * (.12 + .06 * hash(k, 3)), x = c + Math.cos(a) * w * .1 * hash(k, 5), y = c + Math.sin(a) * w * .1 * hash(k, 9);
          const gr = g2.createRadialGradient(x, y, r * .2, x, y, r * 2.1); gr.addColorStop(0, 'rgba(26,16,9,.42)'); gr.addColorStop(.4, 'rgba(48,28,14,.26)'); gr.addColorStop(.72, 'rgba(96,58,26,.1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          g2.fillStyle = gr; g2.beginPath(); g2.arc(x, y, r * 2.1, 0, Math.PI * 2); g2.fill();
        }
      }, 1);
      return new TT.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    });
    const o = new TT.Mesh(G('scorch', () => { const p = new TT.PlaneGeometry(1.1, 1.1); p.rotateX(-Math.PI / 2); return p; }), m);
    o.renderOrder = 1; return o;
  }

  /* ---------- the fire arrow's effects (shared by the full game's skin and the portal's table play) ---------- */
  const spr = {};
  function sprTex(kind) {
    if (spr[kind]) return spr[kind];
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, kind === 'flame' ? 44 : 32, 0, 32, 32, 32);
    if (kind === 'fire') { gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.25, 'rgba(255,200,80,.95)'); gr.addColorStop(.55, 'rgba(255,110,20,.6)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); }
    else if (kind === 'flame') { gr.addColorStop(0, 'rgba(255,250,215,1)'); gr.addColorStop(.35, 'rgba(255,200,72,1)'); gr.addColorStop(.7, 'rgba(255,110,24,.8)'); gr.addColorStop(1, 'rgba(240,60,0,0)'); }
    else if (kind === 'spark') { gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.3, 'rgba(255,190,70,.9)'); gr.addColorStop(1, 'rgba(255,90,10,0)'); }
    else if (kind === 'ember') { gr.addColorStop(0, 'rgba(255,120,30,0)'); gr.addColorStop(.55, 'rgba(255,120,30,0)'); gr.addColorStop(.72, 'rgba(255,110,30,.55)'); gr.addColorStop(.86, 'rgba(255,70,10,.2)'); gr.addColorStop(1, 'rgba(255,60,0,0)'); }
    else { gr.addColorStop(0, 'rgba(210,206,200,.5)'); gr.addColorStop(.5, 'rgba(190,186,180,.22)'); gr.addColorStop(1, 'rgba(180,176,170,0)'); }
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (spr[kind] = new (T().CanvasTexture)(c));
  }
  const sprMat = kind => new (T().SpriteMaterial)({ map: sprTex(kind), transparent: true, depthWrite: false, blending: kind === 'smoke' ? T().NormalBlending : T().AdditiveBlending, toneMapped: false });
  const sprite = (parent, kind, x, y, z, s) => { const o = new (T().Sprite)(sprMat(kind)); o.position.set(x, y, z); o.scale.set(s, s, s); parent.add(o); return o; };
  const kill = o => { if (o.parent) o.parent.remove(o); if (o.material) o.material.dispose(); };
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  // the flight: from p0 to p1 ([x, z] on the board, Y = its top) in an arc, a flame at the head, sparks shed behind.
  // anim(dur, f(k), done) is the host's animation runner (it keeps Table3D drawing)
  function fly(root, Y, p0, p1, dur, anim, done) {
    const TT = T(), [x0, z0] = p0, [x1, z1] = p1, d = Math.hypot(x1 - x0, z1 - z0), hgt = .5 + d * .09;
    const g = new TT.Group(), a = arrow().userData.arrow; a.rotation.set(Math.PI / 2, 0, 0); a.position.set(0, 0, .38);
    const ar = new TT.Group(); ar.add(a); g.add(ar);
    const fire = new TT.Sprite(sprMat('fire')); fire.scale.set(.42, .42, .42); fire.position.set(0, 0, .12); ar.add(fire);
    root.add(g);
    let lastSpark = 0; const sparks = [];
    const pos = k => [x0 + (x1 - x0) * k, Y + .62 + Math.sin(k * Math.PI) * hgt - k * .55, z0 + (z1 - z0) * k];
    const age = () => { const now = performance.now(); for (let i = sparks.length - 1; i >= 0; i--) { const s = sparks[i], t = (now - s.userData.t) / 480; if (t >= 1) { kill(s); sparks.splice(i, 1); continue; } const v = s.userData.v; s.position.x += v[0] * .016; s.position.y += v[1] * .016; s.position.z += v[2] * .016; s.material.opacity = 1 - t; } };
    anim(dur, k => {
      const kk = io(k * .9 + .1 * k * k), [x, y, z] = pos(kk), [xn, yn, zn] = pos(Math.min(1, kk + .02));
      g.position.set(x, y, z); g.lookAt(xn, yn, zn);
      const fl = .38 + Math.sin(k * 40) * .06; fire.scale.set(fl, fl, fl);
      if (k - lastSpark > .06) { lastSpark = k; const s = sprite(root, 'spark', x, y, z, .1 + Math.random() * .06); s.userData.v = [(Math.random() - .5) * .6, -.2 - Math.random() * .5, (Math.random() - .5) * .6]; s.userData.t = performance.now(); sparks.push(s); }
      age();
    }, () => { kill(fire); if (g.parent) g.parent.remove(g); anim(500, age, () => sparks.forEach(kill)); if (done) done(); });
  }
  // the strike on an arrow's group g (placed on its square at the board's top): a flash, a burst of sparks, a puff of smoke; the
  // square catches fire (ignite) and keeps burning
  function strike(g, anim) {
    const TT = T(), fl = sprite(g, 'fire', 0, .25, 0, .2);
    anim(460, k => { const s = .2 + k * 1.5; fl.scale.set(s, s, s); fl.material.opacity = k < .2 ? k / .2 : 1 - (k - .2) / .8; }, () => kill(fl));
    const burst = [];
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + Math.random() * .4, sp = .9 + Math.random() * 1.2, s = sprite(g, 'spark', 0, .2, 0, .09 + Math.random() * .05); s.userData.v = [Math.cos(a) * sp, 1.2 + Math.random() * 1.2, Math.sin(a) * sp]; burst.push(s); }
    anim(620, k => { burst.forEach(s => { const v = s.userData.v; s.position.x += v[0] * .016; s.position.z += v[2] * .016; v[1] -= .09; s.position.y = Math.max(.02, s.position.y + v[1] * .016); s.material.opacity = 1 - k; }); }, () => burst.forEach(kill));
    ignite(g);
    let n = 0; const tick = () => {
      if (!g.parent || n > 12) return; n++;
      const s = new TT.Sprite(sprMat('smoke')); s.position.set((Math.random() - .5) * .15, .3, (Math.random() - .5) * .15); s.scale.set(.25, .25, .25); g.add(s);
      const v = (Math.random() - .5) * .3;
      anim(1900, k => { s.position.y = .3 + k * 1.2; s.position.x += v * .006; const sc = .25 + k * .6; s.scale.set(sc, sc, sc); s.material.opacity = Math.sin(k * Math.PI) * .6; }, () => { g.remove(s); s.material.dispose(); });
      setTimeout(tick, 320);
    };
    tick();
  }

  // every burnt square keeps burning for the rest of the game (2026-11-10 user: the blocked squares must read at a glance) — as a
  // still picture (an icon of three flame tongues, drawn like the 2D page's, and the scorch's glowing edge): nothing animates, so
  // the 3D view draws nothing while idle (the user chose a still fire over a moving one that keeps the GPU busy)
  function flameTex() {
    if (spr.flameIcon) return spr.flameIcon;
    const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
    const tongue = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s);
      const gr = g.createRadialGradient(0, -10, 2, 0, -22, 46); gr.addColorStop(0, '#fffbe0'); gr.addColorStop(.3, '#ffd658'); gr.addColorStop(.62, 'rgba(255,122,24,.95)'); gr.addColorStop(1, 'rgba(227,58,6,0)');
      g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-30, -4, -38, -34, -26, -56); g.bezierCurveTo(-18, -70, -18, -90, -8, -118); g.bezierCurveTo(-4, -94, 16, -80, 24, -58); g.bezierCurveTo(32, -32, 26, -4, 0, 0); g.fill(); g.restore(); };
    tongue(36, 156, .8); tongue(94, 158, .72); tongue(64, 160, 1.3);
    return (spr.flameIcon = new (T().CanvasTexture)(c));
  }
  function ignite(g) {
    if (g.userData.fire) return;
    const TT = T(), em = new TT.Mesh(G('emberPlane', () => new TT.PlaneGeometry(1.15, 1.15).rotateX(-Math.PI / 2)), mat('emberM', () => new TT.MeshBasicMaterial({ map: sprTex('ember'), transparent: true, depthWrite: false, toneMapped: false, opacity: .55 })));
    em.position.y = .006; g.add(em);
    const fl = new TT.Sprite(mat('flameIconM', () => new TT.SpriteMaterial({ map: flameTex(), transparent: true, depthWrite: false, toneMapped: false })));
    fl.center.set(.5, 0); fl.scale.set(.85, 1.06, 1); fl.position.set(0, .02, 0); g.add(fl);
    g.userData.fire = { fl, em };
  }
  function douse(g) { const f = g && g.userData.fire; if (!f) return; g.remove(f.fl); g.remove(f.em); delete g.userData.fire; }

  X.MODELS.amazons = function (live) {
    const g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress: the four amazons each, a few burnt squares
    const put = (x, y, col) => { const p = piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); g.add(p); const sh = X.contact(R * .95, .5); sh.position.set(px, Y + .002, pz); g.add(sh); };
    [[3, 9], [6, 9], [0, 6], [9, 6]].forEach(([x, y]) => put(x, y, 1));
    [[3, 0], [6, 0], [0, 3], [9, 3]].forEach(([x, y]) => put(x, y, 2));
    [[3, 6], [5, 4], [6, 2], [2, 3], [7, 7], [4, 1]].forEach(([x, y], i) => { const [px, pz] = U.pt(x, y), s = scorch(), a = arrow(); s.position.set(px, Y + .003, pz); a.position.set(px, Y, pz); a.rotation.y = i * 1.3; g.add(s); g.add(a); });
    g.scale.setScalar(.86);   // (the showcase: about 10 across with the stylobate)
    return g;
  };
  X.amazons = { board, piece, arrow, scorch, fly, strike, ignite, douse, SETS, LOOKS, W, H, R, pcSet };
})();
