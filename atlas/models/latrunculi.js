/* =====================================================================
   Ludus latrunculorum on the 3D table — six boards and six sets of counters (Table3D.BOARDS / PIECES.latrunculi, chosen in
   the full game's design tab and the portal's 盤 / 駒 rows).
   Boards (the 2D page's rendered surfaces, latrunculi/img/bd-<look>.webp, framed by fr-<look>.webp; the grid is cut in):
     'marble' (the default) a worn slab of white marble in a rosso antico surround · 'travertine' a basilica step ·
     'tile' a fired roof tile (tegula) · 'mosaic' a floor of cream tesserae in a black border · 'wood' an oiled walnut
     gaming table · 'porphyry' imperial porphyry with gilded lines in black-and-gold marble.
   Counters: 'glass' (the default: black and white glass domes, the "glass soldiers" of the Laus Pisonis) · 'gem' blue and
     amber glass · 'bone' turned bone and horn discs · 'stone' river pebbles · 'bronze' bronze and silver coins ·
     'terra' fired clay, red and cream.
   A blocked counter (incitus) lies turned over: Table3D.latrunculi.turn(piece, on) sets the body upside down — the skin
   and the table adapter animate it.
   Registers into Table3D:
     Table3D.MODELS.latrunculi(live)   board (+ a game in progress unless live)
     Table3D.latrunculi = { board(look), piece(col, set), turn(g, k), W, H, R, LOOKS, SETS }
     userData: { S: 8, top, W, H, look, sink: 0, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col) → Group }
   Units: one square is 1.0; the slab is 8.9 × 9.6 (the 2D page's frame: the count plates sit on the far / near bands).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const N = 8, BX = .45, BZ = .8, TH = .46, RAD = .3, R = .36, PH = .2;
  const W = N + 2 * BX, H = N + 2 * BZ;
  const LOOKS = ['marble', 'travertine', 'tile', 'mosaic', 'wood', 'porphyry'];
  const SETS = ['glass', 'gem', 'bone', 'stone', 'bronze', 'terra'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../latrunculi/img/', s).href; } catch (e) {} return '../latrunculi/img/'; })();
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const loadImg = src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * .65 + vnoise(x * 2.3 + 5, y * 2.3 + 9) * .35;

  // per board: [fallback field, fallback band, groove colour, groove width (squares), the band's tile (squares), top roughness, clearcoat, side tint]
  const LK = {
    marble: ['#e9e4da', '#6a2c20', 'rgba(84,74,66,.78)', .034, 3.4, .42, .35, '#ffffff'],
    travertine: ['#d8c7a6', '#6a5a44', 'rgba(92,70,40,.75)', .036, 3.4, .78, 0, '#ffffff'],
    tile: ['#c26a45', '#4a2416', 'rgba(84,30,14,.78)', .05, 3.4, .88, 0, '#ffffff'],
    mosaic: ['#d9d3c6', '#262422', 'rgba(30,28,26,.9)', .055, 2.7, .6, 0, '#ffffff'],
    wood: ['#8a5a34', '#3a2212', 'rgba(34,16,6,.85)', .03, 3.8, .45, .5, '#ffffff'],
    porphyry: ['#6d2a44', '#1b1a19', 'rgba(226,190,112,.92)', .026, 3.6, .28, .6, '#ffffff'],
  };

  /* ---------- the top: colour (the surface + the surround + the cut lines), relief (the grooves) ---------- */
  const tops = {};
  function topTex(look) {
    if (tops[look]) return tops[look];
    const TT = T(), K = LK[look], ppu = SZ(LO() ? 96 : 132), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = N * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const lines = () => {
      g.strokeStyle = K[2]; g.lineWidth = Math.max(1.5, K[3] * ppu); g.lineCap = 'round';
      g.beginPath(); for (let k = 0; k <= N; k++) { g.moveTo(ox + k * ppu, oz); g.lineTo(ox + k * ppu, oz + F); g.moveTo(ox, oz + k * ppu); g.lineTo(ox + F, oz + k * ppu); } g.stroke();
      if (look === 'marble' || look === 'travertine') {   // the lower lip of each groove catches the light
        g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = Math.max(1, .012 * ppu);
        g.beginPath(); for (let k = 0; k <= N; k++) { g.moveTo(ox + k * ppu + .028 * ppu, oz); g.lineTo(ox + k * ppu + .028 * ppu, oz + F); g.moveTo(ox, oz + k * ppu + .028 * ppu); g.lineTo(ox + F, oz + k * ppu + .028 * ppu); } g.stroke();
      }
    };
    const base = () => { g.fillStyle = K[1]; g.fillRect(0, 0, Wp, Hp); g.fillStyle = K[0]; g.fillRect(ox, oz, F, F); };
    base(); lines();
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    Promise.all([loadImg(IMG + 'fr-' + look + '.webp'), loadImg(IMG + 'bd-' + look + '.webp')]).then(([fr, bd]) => {
      base();
      if (fr) { const tile = ppu * K[4]; for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile); }
      if (bd) g.drawImage(bd, ox, oz, F, F);
      // the field sits a hair inside the surround: a soft shade along its edge
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = ppu * .05; g.strokeRect(ox - ppu * .02, oz - ppu * .02, F + ppu * .04, F + ppu * .04);
      lines();
      map.needsUpdate = true; if (X.kick) X.kick(300);
    });
    // the relief: a V groove along every line, the joint round the field
    const ns = SZ(LO() ? 36 : 52), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH), gw = Math.max(.03, K[3] * 1.2);
    const grainy = look === 'tile' || look === 'travertine' ? .012 : look === 'mosaic' ? .006 : 0;
    const hAt = (x, z) => {
      const u = x - BX, v = z - BZ; let h = grainy ? (fbm(x * 9, z * 9) - .5) * grainy : 0;
      if (u > -gw && u < N + gw && v > -gw && v < N + gw) {
        const du = Math.abs(u - Math.round(u)), dv = Math.abs(v - Math.round(v)), dd = Math.min(du, dv);
        if (dd < gw) h -= .03 * (1 - dd / gw);
      }
      return h;
    };
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) hh[y * nW + x] = hAt((x + .5) / ns, (y + .5) / ns);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
      const L = hh[y * nW + Math.max(0, x - 1)], Rr = hh[y * nW + Math.min(nW - 1, x + 1)], U = hh[Math.max(0, y - 1) * nW + x], D = hh[Math.min(nH - 1, y + 1) * nW + x];
      const dx = -(Rr - L) * ns / 2, dz = -(D - U) * ns / 2, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    const nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    return (tops[look] = { map, nm: nmT });
  }

  /* ---------- the slab: a block with eased edges (the tile and the travertine a little uneven) ---------- */
  const slabs = {};
  function slabGeo(look) {
    if (slabs[look]) return slabs[look];
    const TT = T(), sh = new TT.Shape(), ra = look === 'tile' ? .18 : look === 'wood' ? .42 : RAD, a = W / 2 - ra, b = H / 2 - ra, rough = look === 'tile' || look === 'travertine';
    sh.moveTo(-a, -H / 2); sh.lineTo(a, -H / 2); sh.absarc(a, -b, ra, -Math.PI / 2, 0, false); sh.lineTo(W / 2, b); sh.absarc(a, b, ra, 0, Math.PI / 2, false);
    sh.lineTo(-a, H / 2); sh.absarc(-a, b, ra, Math.PI / 2, Math.PI, false); sh.lineTo(-W / 2, -b); sh.absarc(-a, -b, ra, Math.PI, Math.PI * 1.5, false);
    const bv = .06, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 2 : 4, curveSegments: LO() ? 6 : 12, steps: rough ? 3 : 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale((W - .02) / (W + 2 * (bv - .01)), 1, (H - .02) / (H + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count);
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      if (rough && y < TH - .03) { const k = 1 + (fbm(x * 1.7 + y * 3, z * 1.7 - y * 2) - .5) * .02; P.setX(i, x * k); P.setZ(i, z * k); }
      if (side[i]) UV.setXY(i, (x + z) / 2.6, P.getY(i) / TH * .35); else UV.setXY(i, x / W + .5, .5 - z / H);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (slabs[look] = g);
  }
  function sideTex(look) {
    return mat('sideT' + look, () => { const t = new (T().TextureLoader)().load(IMG + 'fr-' + look + '.webp', () => X.kick && X.kick(200)); t.encoding = T().sRGBEncoding; t.wrapS = t.wrapT = T().RepeatWrapping; t.repeat.set(3, 1); return t; });
  }
  const lookNow = () => { const B = X.BOARDS && X.BOARDS.latrunculi; return B ? B.get() : 'marble'; };
  const setNow = () => { const P = X.PIECES && X.PIECES.latrunculi; return P ? P.get() : 'glass'; };
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), tx = topTex(look), K = LK[look];
    const topM = mat('top' + look, () => phys(Object.assign({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: '#ffffff', roughness: K[5], metalness: 0, envMapIntensity: .8 }, K[6] ? { clearcoat: K[6], clearcoatRoughness: .3 } : {})));
    const sideM = mat('side' + look, () => phys(Object.assign({ map: sideTex(look), color: K[7], roughness: Math.min(.95, K[5] + .1), envMapIntensity: .7 }, K[6] ? { clearcoat: K[6] * .8, clearcoatRoughness: .3 } : {})));
    const slab = new TT.Mesh(slabGeo(look), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    // four low feet under the table (wood) / nothing under stone
    g.userData.S = N; g.userData.top = TH + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-N / 2 + x + .5, -N / 2 + y + .5];
    g.userData.piece = (col, set) => piece(col, set); g.userData.sink = 0; g.userData.look = look;
    return g;
  }

  /* ---------- the counters ---------- */
  const geos = {};
  // 'dome' a plano-convex glass counter · 'disc' a turned disc with two rings · 'coin' a thin struck coin · 'peb' a pebble
  function geo(kind, v = 0) {
    const k = kind + (LO() ? 'lo' : 'hi') + v; if (geos[k]) return geos[k];
    const TT = T(), V2 = (x, y) => new TT.Vector2(x, y), seg = LO() ? 20 : 32; let pts = [];
    if (kind === 'dome') { pts.push(V2(0, 0), V2(R * .96, 0), V2(R, .02)); const st = LO() ? 6 : 9; for (let i = 1; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(V2(R * Math.cos(a), .02 + (PH - .02) * Math.sin(a))); } }
    else if (kind === 'disc') pts = [V2(0, 0), V2(R * .95, 0), V2(R, .025), V2(R, PH * .62), V2(R * .95, PH * .74), V2(R * .78, PH * .74), V2(R * .74, PH * .62), V2(R * .68, PH * .74), V2(R * .46, PH * .78), V2(R * .42, PH * .66), V2(R * .36, PH * .78), V2(R * .1, PH * .8), V2(R * .06, PH * .7), V2(0, PH * .7)];
    else if (kind === 'coin') pts = [V2(0, 0), V2(R * .97, 0), V2(R, .015), V2(R, PH * .42), V2(R * .95, PH * .5), V2(R * .88, PH * .5), V2(R * .84, PH * .4), V2(0, PH * .44)];
    else { const st = LO() ? 6 : 8; for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI * i / st; pts.push(V2(Math.max(0, Math.cos(a) * R * (1 + .05 * Math.cos(a * 2))), (Math.sin(a) * .5 + .5) * PH * .95)); } }
    const g = new TT.LatheGeometry(pts, kind === 'peb' ? (LO() ? 12 : 16) : seg);
    if (kind === 'peb') {
      const P = g.attributes.position, o = v * 17.3;
      for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), w = 1 + (fbm(x * 4 + 3 + o, z * 4 + y * 4 - o) - .5) * .2; P.setX(i, x * w * (1 + .08 * Math.cos(v))); P.setZ(i, z * w * (1 - .07 * Math.cos(v))); P.setY(i, y * (1 + (fbm(z * 4 + o, x * 4) - .5) * .2)); }
    }
    g.computeVertexNormals(); if (X.share) X.share(g); return (geos[k] = g);
  }
  // [geometry, [Black colour, White colour], roughness, metalness, clearcoat, env]
  const PS = {
    glass: ['dome', ['#12161f', '#f1f3ee'], .08, 0, 1, 1.5],
    gem: ['dome', ['#1848a6', '#e7ad2c'], .1, 0, 1, 1.5],
    bone: ['disc', ['#4a3322', '#efe3c6'], .55, 0, 0, .8],
    stone: ['peb', ['#2b2927', '#e6e0d3'], .8, 0, 0, .6],
    bronze: ['coin', ['#9a6a36', '#c9ccd0'], .34, 1, 0, 1.2],
    terra: ['disc', ['#a8452c', '#e9dcc0'], .9, 0, 0, .5],
  };
  function pieceMat(col, set) {
    const S = PS[set];
    return mat('pc' + set + col, () => phys(Object.assign({ color: S[1][col - 1], roughness: S[2], metalness: S[3], envMapIntensity: S[5] }, S[4] ? { clearcoat: S[4], clearcoatRoughness: .08 } : {})));
  }
  // col 1 Black (the first player) / 2 White. The body sits in an inner group that turns over about the counter's middle.
  let seed = 1;
  function piece(col, set) {
    set = SETS.includes(set) ? set : setNow();
    const TT = T(), g = new TT.Group(), S = PS[set];
    seed = (seed * 16807) % 2147483647;
    const body = new TT.Mesh(geo(S[0], S[0] === 'peb' ? 1 + seed % 4 : 0), pieceMat(col, set)); body.castShadow = body.receiveShadow = true;
    const hh = S[0] === 'coin' ? PH * .5 : S[0] === 'disc' ? PH * .8 : PH;
    const flip = new TT.Group(); flip.position.y = hh / 2; body.position.y = -hh / 2; body.rotation.y = seed / 2147483647 * Math.PI * 2; flip.add(body); g.add(flip);
    g.userData = { col, h: hh, set, flip, inc: false };
    return g;
  }
  // a blocked counter lies turned over: k 0 (face up) … 1 (face down)
  function turn(g, k) { const f = g.userData && g.userData.flip; if (f) f.rotation.z = Math.PI * k; }

  X.MODELS.latrunculi = function (live) {
    const g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress: White's counter on d5 is blocked (face down) between c5 and e5
    const B = ['c5', 'e5', 'd3', 'f4', 'c3', 'g5', 'b6', 'e7', 'f2'], Wt = ['d5', 'e4', 'f6', 'b4', 'g3', 'd7', 'c6', 'g7', 'e2'];
    const put = (nm, col, inc) => { const x = 'abcdefgh'.indexOf(nm[0]), y = 8 - +nm[1], p = U.piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); if (inc) turn(p, 1); g.add(p); const sh = X.contact(R * .9, .45); sh.position.set(px, Y + .001, pz); g.add(sh); };
    B.forEach(nm => put(nm, 1)); Wt.forEach(nm => put(nm, 2, nm === 'd5'));
    return g;
  };
  X.latrunculi = { board, piece, turn, W: () => W, H: () => H, R, LOOKS, SETS };
})();
