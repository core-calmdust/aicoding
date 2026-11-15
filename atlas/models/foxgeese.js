/* =====================================================================
   Fox and Geese on the 3D table — six boards and six sets of pieces (Table3D.BOARDS / PIECES.foxgeese, chosen in the full
   game's design tab and the portal's 盤 / 駒 rows).
   Boards (the 2D page's rendered surfaces, foxgeese/img/bd-<look>.webp, framed by fr-<look>.webp; the lines of the cross and
   a small hollow on each of the 33 points are cut in, the four corners outside the cross are the frame's material):
     'oak' (the default) an old oak pub board · 'slate' a school slate with chalk lines · 'linen' a stitched linen sampler ·
     'meadow' a mown meadow · 'night' dark blue with brass lines · 'paper' off-white paper.
   Pieces: the fox is a head with two pointed ears, a goose a smaller rounded body with a bill.
     'wood' (the default) painted wood · 'marble' glass · 'pewter' cast pewter and copper · 'paint' glossy enamel ·
     'bronze' bronze and silver · 'clay' fired clay.
   Registers into Table3D:
     Table3D.MODELS.foxgeese(live)   board (+ a game in progress unless live)
     Table3D.foxgeese = { board(look), piece(col, set), W, H, R, LOOKS, SETS }
     userData: { S: 7, top, W, H, look, sink: 0, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col 1 fox | 2 goose) → Group }
   Units: one step between points is 1.0; the slab is 7.9 × 8.6 (the 2D page's frame: the count plates sit on the far / near bands).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const N = 7, BX = .45, BZ = .8, TH = .46, RAD = .3, R = .3, PH = .34;
  const W = N + 2 * BX, H = N + 2 * BZ;
  const LOOKS = ['oak', 'slate', 'linen', 'meadow', 'night', 'paper'];
  const SETS = ['wood', 'marble', 'pewter', 'paint', 'bronze', 'clay'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../foxgeese/img/', s).href; } catch (e) {} return '../foxgeese/img/'; })();
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

  // per board: [fallback field, fallback band, line colour, line width (steps), the band's tile (steps), top roughness, clearcoat, side tint]
  const LK = {
    oak: ['#b98a52', '#4a2e18', 'rgba(52,30,12,.9)', .05, 3.8, .5, .35, '#ffffff'],
    slate: ['#39424a', '#a07a44', 'rgba(238,242,244,.9)', .05, 3.8, .8, 0, '#ffffff'],
    linen: ['#e6dcc6', '#6b5a3a', 'rgba(150,52,40,.95)', .05, 3, .95, 0, '#ffffff'],
    meadow: ['#6f9a4a', '#3d5a26', 'rgba(248,246,228,.92)', .05, 3.2, .95, 0, '#ffffff'],
    night: ['#1a2238', '#0e1424', 'rgba(226,190,112,.95)', .036, 3.2, .35, .5, '#ffffff'],
    paper: ['#f1ece0', '#3a3836', 'rgba(70,64,58,.9)', .036, 3.2, .9, 0, '#ffffff'],
  };
  // the 33 points and the lines between them (the Alquerque pattern: diagonals on the points with (r + c) even)
  const ON = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7 && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
  const SEGS = [];
  for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) { if (!ON(r, c)) continue;
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) { if (dr && dc && (r + c) % 2) continue; if (ON(r + dr, c + dc)) SEGS.push([c + .5, r + .5, c + dc + .5, r + dr + .5]); } }

  /* ---------- the top: colour (the surface + the surround + the cut lines), relief (the grooves) ---------- */
  const tops = {};
  function topTex(look) {
    if (tops[look]) return tops[look];
    const TT = T(), K = LK[look], ppu = SZ(LO() ? 96 : 132), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = N * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const lines = () => {
      g.strokeStyle = K[2]; g.lineWidth = Math.max(2, K[3] * ppu); g.lineCap = 'round';
      if (look === 'linen') g.setLineDash([ppu * .09, ppu * .06]); else if (look === 'slate') g.setLineDash([ppu * .17, ppu * .012]);
      g.beginPath(); for (const [x0, y0, x1, y1] of SEGS) { g.moveTo(ox + x0 * ppu, oz + y0 * ppu); g.lineTo(ox + x1 * ppu, oz + y1 * ppu); } g.stroke(); g.setLineDash([]);
      g.fillStyle = K[2]; for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (ON(r, c)) { g.beginPath(); g.arc(ox + (c + .5) * ppu, oz + (r + .5) * ppu, ppu * .11, 0, Math.PI * 2); g.fill(); }
    };
    // the four corners outside the cross: the frame's material again
    const corners = fr => { for (const [cx, cy] of [[0, 0], [5, 0], [0, 5], [5, 5]]) { g.save(); g.beginPath(); g.rect(ox + cx * ppu, oz + cy * ppu, 2 * ppu, 2 * ppu); g.clip(); if (fr) { const tile = ppu * K[4]; for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile); } else { g.fillStyle = K[1]; g.fillRect(0, 0, Wp, Hp); } g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, Wp, Hp); g.restore(); } };
    const base = () => { g.fillStyle = K[1]; g.fillRect(0, 0, Wp, Hp); g.fillStyle = K[0]; g.fillRect(ox, oz, F, F); };
    base(); corners(null); lines();
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    Promise.all([loadImg(IMG + 'fr-' + look + '.webp'), loadImg(IMG + 'bd-' + look + '.webp')]).then(([fr, bd]) => {
      base();
      if (fr) { const tile = ppu * K[4]; for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile); }
      if (bd) g.drawImage(bd, ox, oz, F, F);
      // the field sits a hair inside the surround: a soft shade along its edge
      corners(fr);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = ppu * .05; g.strokeRect(ox - ppu * .02, oz - ppu * .02, F + ppu * .04, F + ppu * .04);
      lines();
      map.needsUpdate = true; if (X.kick) X.kick(300);
    });
    // the relief: a V groove along every line, the joint round the field
    const ns = SZ(LO() ? 36 : 52), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH), gw = Math.max(.03, K[3] * 1.2);
    const grainy = look === 'linen' || look === 'meadow' ? .01 : 0;
    const hAt = (x, z) => {
      const u = x - BX, v = z - BZ; let h = grainy ? (fbm(x * 11, z * 11) - .5) * grainy : 0;
      const c = Math.floor(u), r = Math.floor(v);
      if (ON(r, c)) { const d = Math.hypot(u - c - .5, v - r - .5); if (d < .16) h -= .035 * Math.sqrt(1 - (d / .16) * (d / .16)); }   // a small hollow on each point
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
    const TT = T(), sh = new TT.Shape(), ra = look === 'oak' ? .42 : look === 'slate' ? .16 : RAD, a = W / 2 - ra, b = H / 2 - ra, rough = false;
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
  const lookNow = () => { const B = X.BOARDS && X.BOARDS.foxgeese; return B ? B.get() : 'oak'; };
  const setNow = () => { const P = X.PIECES && X.PIECES.foxgeese; return P ? P.get() : 'wood'; };
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

  /* ---------- the pieces: the fox (a head with two ears), a goose (a rounded body with a bill) ---------- */
  const geos = {};
  function geo(kind) {
    const k = kind + (LO() ? 'lo' : 'hi'); if (geos[k]) return geos[k];
    const TT = T(), V2 = (x, y) => new TT.Vector2(x, y), seg = LO() ? 16 : 26; let g;
    if (kind === 'fox' || kind === 'goose') {   // a squat egg standing on a flat base
      const rr = kind === 'fox' ? R * 1.22 : R, hh = kind === 'fox' ? PH * 1.25 : PH, pts = [V2(0, 0), V2(rr * .72, 0), V2(rr * .86, hh * .06)], st = LO() ? 7 : 11;
      for (let i = 1; i <= st; i++) { const t = i / st; pts.push(V2(rr * Math.cos(t * Math.PI / 2) * (.86 + .14 * Math.sin(t * Math.PI)), hh * (.06 + .94 * Math.sin(t * Math.PI / 2)))); }
      g = new TT.LatheGeometry(pts, seg);
    } else if (kind === 'ear') { g = new TT.ConeGeometry(R * .34, R * .8, LO() ? 8 : 12); g.scale(1, 1, .55); }
    else { g = new TT.ConeGeometry(R * .2, R * .5, LO() ? 8 : 12); g.rotateX(-Math.PI / 2); }   // the bill, pointing up the board
    g.computeVertexNormals(); if (X.share) X.share(g); return (geos[k] = g);
  }
  // [[fox colour, goose colour], roughness, metalness, clearcoat, env, bill colour]
  const PS = {
    wood: [['#b4502a', '#f1e8d4'], .6, 0, 0, .7, '#e9902a'],
    marble: [['#c8501e', '#eef2f4'], .08, 0, 1, 1.5, '#e9902a'],
    pewter: [['#a8603a', '#c4c8cc'], .42, 1, 0, 1.1, '#8a8f94'],
    paint: [['#d9622b', '#ffffff'], .3, 0, .8, 1, '#f0a020'],
    bronze: [['#9a6a36', '#cfd2d6'], .3, 1, 0, 1.3, '#b08a4a'],
    clay: [['#a8452c', '#e9dcc0'], .92, 0, 0, .5, '#c8763a'],
  };
  function pieceMat(col, set, part) {
    const S = PS[set];
    return mat('pc' + set + col + (part || ''), () => phys(Object.assign({ color: part === 'bill' ? S[5] : S[0][col - 1], roughness: S[1], metalness: S[2], envMapIntensity: S[4] }, S[3] ? { clearcoat: S[3], clearcoatRoughness: .1 } : {})));
  }
  // col 1 the fox / 2 a goose
  function piece(col, set) {
    set = SETS.includes(set) ? set : setNow();
    const TT = T(), g = new TT.Group(), fox = col === 1;
    const body = new TT.Mesh(geo(fox ? 'fox' : 'goose'), pieceMat(col, set)); body.castShadow = body.receiveShadow = true; g.add(body);
    if (fox) for (const sx of [-1, 1]) { const e = new TT.Mesh(geo('ear'), pieceMat(1, set)); e.position.set(sx * R * .62, PH * 1.25 * .98, -R * .1); e.rotation.z = -sx * .28; e.castShadow = true; g.add(e); }
    else { const b = new TT.Mesh(geo('bill'), pieceMat(2, set, 'bill')); b.position.set(0, PH * .62, -R * .92); b.castShadow = true; g.add(b); }
    g.userData = { col, h: fox ? PH * 1.25 : PH, set };
    return g;
  }

  X.MODELS.foxgeese = function (live) {
    const g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress: the fox has slipped past on the right; twelve geese left
    const G = ['a3', 'b4', 'c4', 'd4', 'e3', 'f4', 'g3', 'c3', 'd3', 'c2', 'd2', 'e2'];
    const put = (nm, col) => { const x = 'abcdefg'.indexOf(nm[0]), y = 7 - +nm[1], p = U.piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); g.add(p); const sh = X.contact(R * (col === 1 ? 1.2 : .95), .45); sh.position.set(px, Y + .001, pz); g.add(sh); };
    G.forEach(nm => put(nm, 2)); put('e5', 1);
    return g;
  };
  X.foxgeese = { board, piece, W: () => W, H: () => H, R, LOOKS, SETS };
})();
