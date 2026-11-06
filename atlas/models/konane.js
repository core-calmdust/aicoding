/* =====================================================================
   Kōnane on the 3D table — a papamū of living lava, built from the 2D page's
   pāhoehoe design (konane/img/bd-pahoehoe.webp: the ropy lava field,
   konane/img/fr-pahoehoe.webp: black lava with glowing cracks for the band):
   one rough-edged basalt slab, the field of ropy pāhoehoe with a puka (a carved
   cup, as on the old boards) on every square — the cups are real hollows in a
   normal map with dark, worn bottoms —, the band round it cracked with molten
   orange light (an emissive map, so it glows in any lighting);
   the stones are pebbles as in old Hawaiʻi: porous white coral and polished
   black basalt (after konane/img/pc-coral-w/b).
   Registers into Table3D:
     Table3D.MODELS.konane(live)   board (+ a game in progress unless live)
     Table3D.konane = { board(n), piece, W(n), H(n), R }
     userData: { S, top, W, H, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col 1 black | 2 white) → Group }
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

  /* ---------- the top: colour (lava field + cracked band), glow (the cracks), relief (cups + ropes) ---------- */
  const tops = {};
  function topTex(n) {
    if (tops[n]) return tops[n];
    const TT = T(), W = WOf(n), H = HOf(n), ppu = SZ(LO() ? 96 : 132), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = n * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const e = document.createElement('canvas'); e.width = Math.round(Wp / 2); e.height = Math.round(Hp / 2); const ge = e.getContext('2d');
    const cupsPaint = () => {   // each puka: a dark, worn bowl with a soft lit lip on the far side
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const cx = ox + (x + .5) * ppu, cy = oz + (y + .5) * ppu, r = CUP * ppu;
        const gr = g.createRadialGradient(cx, cy + r * .12, r * .1, cx, cy, r);
        gr.addColorStop(0, 'rgba(58,46,38,.9)'); gr.addColorStop(.62, 'rgba(36,28,24,.72)'); gr.addColorStop(.9, 'rgba(20,16,13,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(190,170,150,.16)'; g.lineWidth = ppu * .025; g.beginPath(); g.arc(cx, cy, r * .93, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      }
    };
    const base = () => {
      g.fillStyle = '#17120f'; g.fillRect(0, 0, Wp, Hp);
      g.fillStyle = '#2a2420'; g.fillRect(ox, oz, F, F);
      ge.fillStyle = '#000'; ge.fillRect(0, 0, e.width, e.height);
    };
    base(); cupsPaint();
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    const em = new TT.CanvasTexture(e); em.encoding = TT.sRGBEncoding;
    Promise.all([loadImg(IMG + 'fr-pahoehoe.webp'), loadImg(IMG + 'bd-pahoehoe.webp')]).then(([fr, bd]) => {
      base();
      if (fr) {   // the band: black lava with molten cracks (tiled, ~3 squares a tile), its glow copied into the emissive map
        const tile = ppu * 3.2;
        g.save(); g.beginPath(); g.rect(0, 0, Wp, Hp); g.rect(ox - ppu * .05, oz - ppu * .05, F + ppu * .1, F + ppu * .1); g.clip('evenodd');
        for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile);
        g.restore();
        // glow: the bright orange of the cracks only
        const k = e.width / Wp, t2 = document.createElement('canvas'); t2.width = e.width; t2.height = e.height; const g2 = t2.getContext('2d');
        for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g2.drawImage(fr, x * k, y * k, tile * k, tile * k);
        const id = g2.getImageData(0, 0, t2.width, t2.height), d = id.data, owx = ox * k, owz = oz * k, fw = F * k;
        for (let p = 0; p < d.length; p += 4) {
          const q = p / 4, px = q % t2.width, py = (q / t2.width) | 0;
          const inside = px > owx - 2 && px < owx + fw + 2 && py > owz - 2 && py < owz + fw + 2;
          const hot = inside ? 0 : Math.max(0, (d[p] - d[p + 2]) - 70) / 120;   // red minus blue: the molten light
          d[p] = Math.min(255, 255 * hot); d[p + 1] = Math.min(255, 120 * hot); d[p + 2] = Math.min(255, 30 * hot); d[p + 3] = 255;
        }
        ge.putImageData(id, 0, 0);
      }
      if (bd) {   // the field: the ropy pāhoehoe, a little darker so the stones stand out
        g.save(); g.drawImage(bd, ox, oz, F, F);
        g.fillStyle = 'rgba(120,96,80,.08)'; g.fillRect(ox, oz, F, F); g.restore();
      }
      // a thin worn lip where the field meets the band
      g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = ppu * .06; g.strokeRect(ox - ppu * .04, oz - ppu * .04, F + ppu * .08, F + ppu * .08);
      cupsPaint();
      map.needsUpdate = true; em.needsUpdate = true; if (X.kick) X.kick(300);
    });
    // the relief: a hollow in every square (a spherical bowl), ropy ridges on the field, rough rock on the band
    const ns = SZ(LO() ? 40 : 56), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH);
    const hAt = (x, z) => {   // board units from the slab corner
      const u = x - BX, v = z - BZ;
      if (u > 0 && u < n && v > 0 && v < n) {
        const cx = Math.floor(u) + .5, cz = Math.floor(v) + .5, r = Math.hypot(u - cx, v - cz);
        const rope = Math.sin((u * .9 + Math.sin(v * 1.7) * .35) * 9) * .004;
        if (r < CUP) { const k = r / CUP; return -DEPTH * Math.sqrt(Math.max(0, 1 - k * k)) + rope * k; }
        return rope + (r < CUP + .05 ? .006 * Math.sin((r - CUP) / .05 * Math.PI) : 0);
      }
      return (fbm(x * 3, z * 3) - .5) * .03 + (fbm(x * 9, z * 9) - .5) * .01;
    };
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) hh[y * nW + x] = hAt((x + .5) / ns, (y + .5) / ns);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
      const L = hh[y * nW + Math.max(0, x - 1)], Rr = hh[y * nW + Math.min(nW - 1, x + 1)], U = hh[Math.max(0, y - 1) * nW + x], D = hh[Math.min(nH - 1, y + 1) * nW + x];
      const dx = -(Rr - L) * ns / 2, dz = -(D - U) * ns / 2, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    const nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    return (tops[n] = { map, em, nm: nmT });
  }

  /* ---------- the slab: a rounded basalt block, its sides roughened ---------- */
  const slabs = {};
  function slabGeo(n) {
    if (slabs[n]) return slabs[n];
    const TT = T(), W = WOf(n), H = HOf(n), sh = new TT.Shape(), a = W / 2 - RAD, b = H / 2 - RAD;
    sh.moveTo(-a, -H / 2); sh.lineTo(a, -H / 2); sh.absarc(a, -b, RAD, -Math.PI / 2, 0, false); sh.lineTo(W / 2, b); sh.absarc(a, b, RAD, 0, Math.PI / 2, false);
    sh.lineTo(-a, H / 2); sh.absarc(-a, b, RAD, Math.PI / 2, Math.PI, false); sh.lineTo(-W / 2, -b); sh.absarc(-a, -b, RAD, Math.PI, Math.PI * 1.5, false);
    const bv = .11, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 3 : 5, curveSegments: LO() ? 8 : 14 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale((W - .02) / (W + 2 * (bv - .01)), 1, (H - .02) / (H + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (y < TH - .03) { const k = 1 + (fbm(x * 1.7 + y * 3, z * 1.7 - y * 2) - .5) * .035; P.setX(i, x * k); P.setZ(i, z * k); }   // the sides: hand-dressed stone
      UV.setXY(i, x / W + .5, .5 - z / H);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (slabs[n] = g);
  }
  function board(n) {
    n = n || 8;
    const TT = T(), g = new TT.Group(), tx = topTex(n), W = WOf(n), H = HOf(n);
    const topM = mat('top' + n, () => phys({ map: tx.map, emissiveMap: tx.em, emissive: '#ffffff', emissiveIntensity: 1.25, normalMap: tx.nm, normalScale: new TT.Vector2(1.1, 1.1), color: '#ffffff', roughness: .62, metalness: 0, envMapIntensity: .9 }));
    const sideM = mat('side', () => phys({ color: '#221c18', roughness: .78, envMapIntensity: .7 }));
    const slab = new TT.Mesh(slabGeo(n), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    g.userData.S = n; g.userData.top = TH + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-n / 2 + x + .5, -n / 2 + y + .5];
    g.userData.piece = piece; g.userData.sink = DEPTH * .55;   // a stone rests a little down in its cup
    return g;
  }

  /* ---------- the stones: porous coral (white) and polished basalt (black) pebbles ---------- */
  const geos = {};
  function pebbleGeo() {
    const k = LO() ? 'lo' : 'hi'; if (geos[k]) return geos[k];
    const TT = T(), st = LO() ? 10 : 16, pts = [];
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI * i / st, r = Math.cos(a), y = Math.sin(a); pts.push(new TT.Vector2(Math.max(0, r * R * (1 + .05 * Math.cos(a * 2))), (y * .5 + .5) * PH)); }
    const g = new TT.LatheGeometry(pts, LO() ? 22 : 36);
    const P = g.attributes.position;   // a pebble, not a lathe: a gentle lumpy wobble
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), w = 1 + (fbm(x * 5 + 3, z * 5 + y * 4) - .5) * .09; P.setX(i, x * w); P.setZ(i, z * w); P.setY(i, y * (1 + (fbm(z * 4, x * 4) - .5) * .08)); }
    g.computeVertexNormals(); if (X.share) X.share(g); return (geos[k] = g);
  }
  // the coral's pores / the basalt's faint vesicles: one normal map each (a canvas)
  function poreTex(kind) {
    const t = X.canvasTex('knPore' + kind, SZ(256), SZ(256), (g2, Wd) => {
      const id = g2.createImageData(Wd, Wd), d = id.data, h = new Float32Array(Wd * Wd);
      for (let y = 0; y < Wd; y++) for (let x = 0; x < Wd; x++) {
        let v = fbm(x / Wd * 10, y / Wd * 10) * .5;
        const cell = hash(Math.floor(x / Wd * 26), Math.floor(y / Wd * 26)); if (cell > (kind === 'w' ? .62 : .9)) { const fx = (x / Wd * 26) % 1 - .5, fy = (y / Wd * 26) % 1 - .5; v -= Math.max(0, .3 - Math.hypot(fx, fy)) * (kind === 'w' ? 2.4 : 1); }
        h[y * Wd + x] = v;
      }
      for (let y = 0; y < Wd; y++) for (let x = 0; x < Wd; x++) {
        const L = h[y * Wd + (x + Wd - 1) % Wd], Rr = h[y * Wd + (x + 1) % Wd], U = h[((y + Wd - 1) % Wd) * Wd + x], D = h[((y + 1) % Wd) * Wd + x];
        const s = kind === 'w' ? 7 : 3, dx = -(Rr - L) * s, dz = -(D - U) * s, l = Math.hypot(dx, 1, dz), i = (y * Wd + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      }
      g2.putImageData(id, 0, 0);
    }, 1);
    t.encoding = T().LinearEncoding;   // (a normal map: no colour space)
    return t;
  }
  function pieceMat(col) {
    const TT = T();
    return col === 2
      ? mat('pw', () => { const t = poreTex('w'); return phys({ color: '#efe8da', roughness: .86, normalMap: t, normalScale: new TT.Vector2(.9, .9), envMapIntensity: .8 }); })
      : mat('pb', () => { const t = poreTex('b'); return phys({ color: '#141313', roughness: .22, normalMap: t, normalScale: new TT.Vector2(.35, .35), clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.6 }); });
  }
  // col 1 black (basalt, Black) / 2 white (coral, White); each pebble turned a little differently
  let seed = 1;
  function piece(col) {
    const TT = T(), g = new TT.Group();
    const body = new TT.Mesh(pebbleGeo(), pieceMat(col)); body.castShadow = body.receiveShadow = true;
    body.rotation.y = (seed = (seed * 16807) % 2147483647) / 2147483647 * Math.PI * 2;
    g.add(body); g.userData = { col, h: PH };
    return g;
  }

  X.MODELS.konane = function (live) {
    const g = board(8), U = g.userData, Y = U.top - U.sink;
    if (live) return g;
    // a game in progress: the full board after a few jumps (Black = col 1 at a1)
    const empty = new Set(['3,4', '4,4', '3,2', '5,4', '2,4', '3,6', '5,2', '6,4', '1,4']);
    const put = (x, y, col) => { const p = piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); g.add(p); const sh = X.contact(R * .9, .45); sh.position.set(px, Y + .001, pz); g.add(sh); };
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { if (empty.has(x + ',' + y)) continue; const r = 7 - y; put(x, y, (x + r) % 2 === 0 ? 1 : 2); }
    g.scale.setScalar(.88);
    return g;
  };
  X.konane = { board, piece, W: WOf, H: HOf, R };
})();
