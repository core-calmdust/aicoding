/* =====================================================================
   Kōnane on the 3D table — two boards (Table3D.BOARDS.konane, chosen in the portal's 盤 row and the full game's design tab):
   · 'quilt'  (the default) an artistic board after the 2D page's Hawaiian quilt: an oiled koa-wood tray (konane/img/fr-koa.webp)
              holding a kapa kuiki — the teal ʻulu appliqué with its echo quilting (konane/img/bd-quilt.webp) — a soft hollow
              stitched into the cloth on every square;
   · 'papamu' the primitive papamū of old: one rough slab of weathered basalt (konane/img/bd-stone.webp / fr-stone.webp), its
              edges hand-dressed and uneven, a cup pecked on every square.
   The stones are smooth pebbles as in old Hawaiʻi: black basalt and white coral (after konane/img/pc-stone-b/w).
   Registers into Table3D:
     Table3D.MODELS.konane(live)   board (+ a game in progress unless live)
     Table3D.konane = { board(n, look), piece, W(n), H(n), R, LOOKS }
     userData: { S, top, W, H, look, sink, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col 1 black | 2 white) → Group }
   Units: one square is 1.0; the slab is (n + .9) × (n + 1.6) (the 2D page's frame: the count plates sit on the far / near bands).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const BX = .45, BZ = .8, TH = .5, RAD = .5, R = .36, PH = .22, CUP = .4, DEPTH = .07;   // side bands (x) / the bands with the count plates (z)
  const WOf = n => n + 2 * BX, HOf = n => n + 2 * BZ;
  const LOOKS = ['quilt', 'papamu'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../konane/img/', s).href; } catch (e) {} return '../konane/img/'; })();
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (p.emissive !== undefined) p.emissive = lin(p.emissive);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const loadImg = src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  // a small deterministic noise (value noise, two octaves) for the rock relief
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * .65 + vnoise(x * 2.3 + 5, y * 2.3 + 9) * .35;

  /* ---------- the top: colour (the design + the band), relief (the cups) ---------- */
  const tops = {};
  function topTex(n, look) {
    const key = look + n; if (tops[key]) return tops[key];
    const Q = look === 'quilt';
    const TT = T(), W = WOf(n), H = HOf(n), ppu = SZ(LO() ? 96 : 132), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = n * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const cupsPaint = () => {   // each cup: a soft shadow in the cloth (quilt) / a dark, worn bowl in the rock (papamū)
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const cx = ox + (x + .5) * ppu, cy = oz + (y + .5) * ppu, r = CUP * ppu;
        const gr = g.createRadialGradient(cx, cy + r * .14, r * .1, cx, cy, r);
        if (Q) { gr.addColorStop(0, 'rgba(70,56,36,.32)'); gr.addColorStop(.7, 'rgba(70,56,36,.18)'); gr.addColorStop(1, 'rgba(70,56,36,0)'); }
        else { gr.addColorStop(0, 'rgba(40,34,28,.55)'); gr.addColorStop(.6, 'rgba(48,42,34,.4)'); gr.addColorStop(.92, 'rgba(40,34,28,.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        if (Q) { g.setLineDash([ppu * .05, ppu * .035]); g.strokeStyle = 'rgba(13,95,91,.55)'; g.lineWidth = ppu * .02; g.beginPath(); g.arc(cx, cy, r * 1.02, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }   // the stitched ring
      }
    };
    const base = () => {
      g.fillStyle = Q ? '#6e3818' : '#7a7368'; g.fillRect(0, 0, Wp, Hp);
      g.fillStyle = Q ? '#f2ead8' : '#8a8276'; g.fillRect(ox, oz, F, F);
    };
    base(); cupsPaint();
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    Promise.all([loadImg(IMG + (Q ? 'fr-koa.webp' : 'fr-stone.webp')), loadImg(IMG + (Q ? 'bd-quilt.webp' : 'bd-stone.webp'))]).then(([fr, bd]) => {
      base();
      if (fr) {   // the band: the koa tray / the same rock
        const tile = ppu * (Q ? 3.6 : 3.2);
        for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile);
      }
      if (bd) {
        if (Q) { g.drawImage(bd, ox, oz, F, F); g.strokeStyle = 'rgba(30,14,4,.55)'; g.lineWidth = ppu * .05; g.strokeRect(ox - ppu * .02, oz - ppu * .02, F + ppu * .04, F + ppu * .04); }
        else {   // the rock: one picture over the middle, fading into the band so there is no seam
          const m = document.createElement('canvas'); m.width = Math.round(F + ppu * .9); m.height = m.width; const gm = m.getContext('2d');
          gm.drawImage(bd, 0, 0, m.width, m.height);
          gm.globalCompositeOperation = 'destination-in';
          const gr = gm.createRadialGradient(m.width / 2, m.height / 2, m.width * .38, m.width / 2, m.height / 2, m.width * .55); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
          gm.fillStyle = gr; gm.fillRect(0, 0, m.width, m.height);
          g.drawImage(m, ox - ppu * .45, oz - ppu * .45);
        }
      }
      if (!Q) { g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(66,61,54,1)'; g.fillRect(0, 0, Wp, Hp); g.globalCompositeOperation = 'source-over'; }   // weathered pale on top, so the black stones read
      cupsPaint();
      map.needsUpdate = true; if (X.kick) X.kick(300);
    });
    // the relief: a hollow in every square (a spherical bowl), ropy ridges on the field, rough rock on the band
    const ns = SZ(LO() ? 40 : 56), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH);
    const hAt = (x, z) => {   // board units from the slab corner
      const u = x - BX, v = z - BZ;
      const rough = Q ? 0 : (fbm(x * 3, z * 3) - .5) * .03 + (fbm(x * 9, z * 9) - .5) * .012;
      if (u > 0 && u < n && v > 0 && v < n) {
        const cx = Math.floor(u) + .5, cz = Math.floor(v) + .5, r = Math.hypot(u - cx, v - cz);
        const R0 = Q ? CUP : CUP * (1 + (fbm(u * 4 + 7, v * 4 + 3) - .5) * .18);   // pecked by hand: not quite round
        const puff = Q ? .006 * Math.cos(Math.min(1, Math.max(0, r - CUP) / .5) * Math.PI / 2) : 0;   // the batting puffs up round the stitched hollow
        if (r < R0) { const k = r / R0; return -DEPTH * Math.sqrt(Math.max(0, 1 - k * k)) + rough * (Q ? 0 : .6); }
        return rough + puff;
      }
      return Q ? 0 : rough;
    };
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) hh[y * nW + x] = hAt((x + .5) / ns, (y + .5) / ns);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
      const L = hh[y * nW + Math.max(0, x - 1)], Rr = hh[y * nW + Math.min(nW - 1, x + 1)], U = hh[Math.max(0, y - 1) * nW + x], D = hh[Math.min(nH - 1, y + 1) * nW + x];
      const dx = -(Rr - L) * ns / 2, dz = -(D - U) * ns / 2, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    const nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    return (tops[key] = { map, nm: nmT });
  }

  /* ---------- the slab: a rounded basalt block, its sides roughened ---------- */
  const slabs = {};
  function slabGeo(n, look) {
    const key = look + n; if (slabs[key]) return slabs[key]; const Q = look === 'quilt';
    const TT = T(), W = WOf(n), H = HOf(n), sh = new TT.Shape(), a = W / 2 - RAD, b = H / 2 - RAD;
    if (Q) {
      sh.moveTo(-a, -H / 2); sh.lineTo(a, -H / 2); sh.absarc(a, -b, RAD, -Math.PI / 2, 0, false); sh.lineTo(W / 2, b); sh.absarc(a, b, RAD, 0, Math.PI / 2, false);
      sh.lineTo(-a, H / 2); sh.absarc(-a, b, RAD, Math.PI / 2, Math.PI, false); sh.lineTo(-W / 2, -b); sh.absarc(-a, -b, RAD, Math.PI, Math.PI * 1.5, false);
    } else {   // the papamū: an uneven outline, as a boulder split and dressed by hand (the cups stay clear of it)
      const ra = RAD * 1.5, A = W / 2 - ra, B = H / 2 - ra, r0 = new TT.Shape();
      r0.moveTo(-A, -H / 2); r0.lineTo(A, -H / 2); r0.absarc(A, -B, ra, -Math.PI / 2, 0, false); r0.lineTo(W / 2, B); r0.absarc(A, B, ra, 0, Math.PI / 2, false);
      r0.lineTo(-A, H / 2); r0.absarc(-A, B, ra, Math.PI / 2, Math.PI, false); r0.lineTo(-W / 2, -B); r0.absarc(-A, -B, ra, Math.PI, Math.PI * 1.5, false);
      const pts = r0.getSpacedPoints(96); pts.pop();
      pts.forEach((p, i) => {
        const l = Math.hypot(p.x, p.y), d = (fbm(p.x * .55 + 11, p.y * .55 + 4) - .5) * .5 - .1;   // in / out along the line from the middle
        const q = [p.x + p.x / l * d, p.y + p.y / l * d]; i ? sh.lineTo(q[0], q[1]) : sh.moveTo(q[0], q[1]);
      });
    }
    const bv = Q ? .08 : .07, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 3 : 5, curveSegments: LO() ? 8 : 14, steps: Q ? 1 : 3 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale((W - .02) / (W + 2 * (bv - .01)), 1, (H - .02) / (H + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count);
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (!Q && y < TH - .03) { const k = 1 + (fbm(x * 1.7 + y * 3, z * 1.7 - y * 2) - .5) * .045; P.setX(i, x * k); P.setZ(i, z * k); if (y < TH * .6) P.setY(i, y * (1 + (fbm(x * 2.3, z * 2.3) - .5) * .25)); }   // the papamū's sides: rough, hand-dressed stone
      if (side[i]) UV.setXY(i, (x + z) / 2.6, P.getY(i) / TH * .35); else UV.setXY(i, x / W + .5, .5 - z / H);   // the sides: the grain runs round the slab
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (slabs[key] = g);
  }
  function sideTex(look) {   // the slab's sides: oiled koa / the rock
    return mat('sideT' + look, () => { const t = new (T().TextureLoader)().load(IMG + (look === 'quilt' ? 'fr-koa.webp' : 'fr-stone.webp'), () => X.kick && X.kick(200)); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(3, 1); return t; });
  }
  function board(n, look) {
    n = n || 8; look = LOOKS.includes(look) ? look : (X.BOARDS && X.BOARDS.konane ? X.BOARDS.konane.get() : 'quilt');
    const Q = look === 'quilt', TT = T(), g = new TT.Group(), tx = topTex(n, look), W = WOf(n), H = HOf(n);
    const topM = mat('top' + look + n, () => Q
      ? phys({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: '#ffffff', roughness: .82, metalness: 0, envMapIntensity: .75 })
      : phys({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1.2, 1.2), color: '#ffffff', roughness: .86, metalness: 0, envMapIntensity: .6 }));
    const sideM = mat('side' + look, () => Q
      ? phys({ map: sideTex(look), color: '#ffffff', roughness: .38, clearcoat: .6, clearcoatRoughness: .25, envMapIntensity: 1 })
      : phys({ map: sideTex(look), color: '#e6e0d6', roughness: .92, envMapIntensity: .5 }));
    const slab = new TT.Mesh(slabGeo(n, look), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    g.userData.S = n; g.userData.top = TH + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-n / 2 + x + .5, -n / 2 + y + .5];
    g.userData.piece = col => piece(col, look); g.userData.sink = DEPTH * .55; g.userData.look = look;   // a stone rests a little down in its cup
    return g;
  }

  /* ---------- the stones: smooth white coral and black basalt pebbles ---------- */
  const geos = {};
  // v: 0 the smooth pebble (quilt board); 1..4 rough beach stones for the papamū — each a different, uneven shape
  function pebbleGeo(v = 0) {
    const k = (LO() ? 'lo' : 'hi') + v; if (geos[k]) return geos[k];
    const TT = T(), st = LO() ? 10 : 16, pts = [], rough = v > 0, o = v * 17.3;
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI * i / st, r = Math.cos(a), y = Math.sin(a); pts.push(new TT.Vector2(Math.max(0, r * R * (1 + .05 * Math.cos(a * 2))), (y * .5 + .5) * PH * (rough ? .9 : 1))); }
    const g = new TT.LatheGeometry(pts, LO() ? 22 : 36);
    const P = g.attributes.position;   // a pebble, not a lathe: a lumpy wobble (strong and uneven on the papamū's stones)
    const A = rough ? .3 : .09, B = rough ? .35 : .08, F = rough ? 3.2 : 5;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const w = 1 + (fbm(x * F + 3 + o, z * F + y * 4 - o) - .5) * A + (rough ? (fbm(x * 11 + o, z * 11 + y * 9) - .5) * .06 : 0);
      P.setX(i, x * w * (rough ? 1 + .12 * Math.cos(v) : 1)); P.setZ(i, z * w * (rough ? 1 - .1 * Math.cos(v) : 1));
      P.setY(i, y * (1 + (fbm(z * 4 + o, x * 4) - .5) * B) + (rough ? (fbm(x * 6 - o, z * 6) - .5) * .03 * (y / PH) : 0));
    }
    g.computeVertexNormals(); if (X.share) X.share(g); return (geos[k] = g);
  }
  // a faint unevenness on each pebble's skin (a normal map, a canvas)
  function poreTex(kind) {
    const t = X.canvasTex('knPore' + kind, SZ(256), SZ(256), (g2, Wd) => {
      const id = g2.createImageData(Wd, Wd), d = id.data, h = new Float32Array(Wd * Wd);
      for (let y = 0; y < Wd; y++) for (let x = 0; x < Wd; x++) {
        let v = fbm(x / Wd * 10, y / Wd * 10) * .5;
        const cell = hash(Math.floor(x / Wd * 26), Math.floor(y / Wd * 26)); if (cell > .97) { const fx = (x / Wd * 26) % 1 - .5, fy = (y / Wd * 26) % 1 - .5; v -= Math.max(0, .3 - Math.hypot(fx, fy)) * (kind === 'w' ? 2.4 : 1); }
        h[y * Wd + x] = v;
      }
      for (let y = 0; y < Wd; y++) for (let x = 0; x < Wd; x++) {
        const L = h[y * Wd + (x + Wd - 1) % Wd], Rr = h[y * Wd + (x + 1) % Wd], U = h[((y + Wd - 1) % Wd) * Wd + x], D = h[((y + 1) % Wd) * Wd + x];
        const s = kind === 'w' ? 2 : 2.5, dx = -(Rr - L) * s, dz = -(D - U) * s, l = Math.hypot(dx, 1, dz), i = (y * Wd + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      }
      g2.putImageData(id, 0, 0);
    }, 1);
    t.encoding = T().LinearEncoding;   // (a normal map: no colour space)
    return t;
  }
  function pieceMat(col, rough) {
    const TT = T();
    if (rough) return col === 2   // the papamū: weathered coral and dull basalt, as they come off the beach
      ? mat('pw2', () => { const t = poreTex('w'); return phys({ color: '#e7dfcd', roughness: .92, normalMap: t, normalScale: new TT.Vector2(.9, .9), envMapIntensity: .6 }); })
      : mat('pb2', () => { const t = poreTex('b'); return phys({ color: '#22201d', roughness: .78, normalMap: t, normalScale: new TT.Vector2(.8, .8), envMapIntensity: .7 }); });
    return col === 2
      ? mat('pw', () => { const t = poreTex('w'); return phys({ color: '#f1ece2', roughness: .7, normalMap: t, normalScale: new TT.Vector2(.3, .3), envMapIntensity: .9 }); })
      : mat('pb', () => { const t = poreTex('b'); return phys({ color: '#181716', roughness: .34, normalMap: t, normalScale: new TT.Vector2(.25, .25), clearcoat: .5, clearcoatRoughness: .2, envMapIntensity: 1.3 }); });
  }
  // col 1 black (basalt, Black) / 2 white (coral, White); each pebble turned a little differently
  let seed = 1;
  function piece(col, look) {
    const TT = T(), g = new TT.Group(), rough = look === 'papamu';
    seed = (seed * 16807) % 2147483647;
    const body = new TT.Mesh(pebbleGeo(rough ? 1 + seed % 4 : 0), pieceMat(col, rough)); body.castShadow = body.receiveShadow = true;
    body.rotation.y = seed / 2147483647 * Math.PI * 2;
    g.add(body); g.userData = { col, h: PH };
    return g;
  }

  X.MODELS.konane = function (live) {
    const g = board(8), U = g.userData, Y = U.top - U.sink;
    if (live) return g;
    // a game in progress: the full board after a few jumps (Black = col 1 at a1)
    const empty = new Set(['3,4', '4,4', '3,2', '5,4', '2,4', '3,6', '5,2', '6,4', '1,4']);
    const put = (x, y, col) => { const p = U.piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); g.add(p); const sh = X.contact(R * .9, .45); sh.position.set(px, Y + .001, pz); g.add(sh); };
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (empty.has(x + ',' + y)) continue; const r = 7 - y; put(x, y, (x + r) % 2 === 0 ? 1 : 2); }
    g.scale.setScalar(.88);
    return g;
  };
  X.konane = { board, piece, W: WOf, H: HOf, R, LOOKS };
})();
