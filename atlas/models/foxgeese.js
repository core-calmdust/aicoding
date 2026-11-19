/* =====================================================================
   Fox and Geese on the 3D table — the 2D page's six designs in 3D (2026-11-19, remade from the 2D art of 2026-11-18):
   Table3D.BOARDS / PIECES.foxgeese, chosen in the full game's design tab and the portal's 盤 / 駒 rows.
   Boards (the 2D page's rendered boards, foxgeese/img/2d/bd-<look>.webp — the lines and points are in the picture — on a slab
   wrapped in the frame tile fr-<look>.webp; a light relief from the picture's own shading):
     'meadow' (the default) ひだまり牧場 · 'oak' オーク材 · 'bauhaus' アブストラクト · 'lux' 黒大理石と金 · 'norse' 北欧の石盤 · 'delft' デルフト焼き
   Pieces (the 2D page's piece pictures, img/2d/pc-<set>-f / -g.webp): each is cut out along the picture's outline and made into a
   thick token with the picture on top (rounded like a carving for wood / norse, a block for bauhaus, a glazed dish for delft, a
   flat painted token for cute); 'lux' (gold & pearl figures drawn from the side) stands up as a picture that always faces the
   camera on a real gold plinth.
     'cute' (the default) きつね＆がちょう · 'wood' 木の玉 · 'bauhaus' カラーブロック · 'lux' 金と真珠 · 'norse' 骨と琥珀 · 'delft' 染付
   Older saved keys (the first 3D set of 2026-11-16) are read as the new ones (tables3d.js).
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
  const N = 7, BX = .45, BZ = .8, TH = .46, R = .3, PH = .34;
  const W = N + 2 * BX, H = N + 2 * BZ;
  const LOOKS = ['meadow', 'oak', 'bauhaus', 'lux', 'norse', 'delft'];
  const SETS = ['cute', 'wood', 'bauhaus', 'lux', 'norse', 'delft'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../foxgeese/img/2d/', s).href; } catch (e) {} return '../foxgeese/img/2d/'; })();
  const PV = { 'pc-wood-f': 4, 'pc-wood-g': 5 };   // (the 2D page's cache versions, so the browser shares the files)
  const url = k => IMG + k + '.webp?v=' + (PV[k] || (k.startsWith('pc-') ? 2 : 2));
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat / sheen)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (p.sheenColor !== undefined) p.sheenColor = lin(p.sheenColor);
    const phy = p.clearcoat !== undefined || p.sheen !== undefined || p.transmission !== undefined;
    if (X.lite || !phy) { delete p.clearcoat; delete p.clearcoatRoughness; delete p.sheen; delete p.sheenColor; delete p.sheenRoughness; delete p.transmission; return new TT.MeshStandardMaterial(p); }
    return new TT.MeshPhysicalMaterial(p);
  }
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * .65 + vnoise(x * 2.3 + 5, y * 2.3 + 9) * .35;
  const imgs = {};
  const loadImg = k => imgs[k] || (imgs[k] = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url(k); }));
  const srgb = t => { const TT = T(); if ('colorSpace' in t && TT.SRGBColorSpace) t.colorSpace = TT.SRGBColorSpace; else t.encoding = TT.sRGBEncoding; return t; };

  // per board: [surround colour (before the pictures arrive), field colour, the frame tile (steps), roughness, clearcoat, relief, slab corner, side tint]
  const LK = {
    meadow: ['#e2c79c', '#8fcf6a', 3.2, .9, 0, .55, .42, '#ffffff'],
    oak: ['#4a2e18', '#b98a52', 3.6, .55, .25, .7, .42, '#ffffff'],
    bauhaus: ['#262628', '#ece6d8', 2.9, .8, 0, .15, .1, '#ffffff'],
    lux: ['#1a0f08', '#16120f', 3.4, .22, .8, .25, .2, '#ffffff'],
    norse: ['#5c5850', '#7c7a70', 3.4, .92, 0, 1, .16, '#ffffff'],
    delft: ['#2a1d14', '#eef0f4', 3.4, .07, 1, .2, .3, '#ffffff'],
  };

  const ON = (r, c) => r >= 0 && r < 7 && c >= 0 && c < 7 && ((r >= 2 && r <= 4) || (c >= 2 && c <= 4));
  // lux: the gold of the picture (warm, bright pixels) as real metal — a metalness / roughness map (three: G roughness, B metalness)
  const metals = {};
  function luxMetal(c, look) {
    const TT = T(), w = Math.round(c.width / 2), h = Math.round(c.height / 2), m = document.createElement('canvas'); m.width = w; m.height = h;
    const q = m.getContext('2d'); q.drawImage(c, 0, 0, w, h);
    const id = q.getImageData(0, 0, w, h), d = id.data;
    for (let i = 0; i < w * h; i++) {
      const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], gold = r > 110 && r - b > 45 && gg > b && r >= gg ? Math.min(1, (r - b - 45) / 40) : 0;
      d[i * 4] = 0; d[i * 4 + 1] = Math.round((.2 + (1 - gold) * .05) * 255); d[i * 4 + 2] = Math.round(gold * 255); d[i * 4 + 3] = 255;
    }
    q.putImageData(id, 0, 0);
    const t = metals[look]; if (t) { t.image = m; t.needsUpdate = true; }
  }
  function metalTex(look) { return metals[look] || (metals[look] = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; const q = c.getContext('2d'); q.fillStyle = 'rgb(0,56,0)'; q.fillRect(0, 0, 2, 2); return new (T().CanvasTexture)(c); })()); }

  /* ---------- the top: the frame tile all round, the 2D board on the field; a normal map from the picture's own shading ---------- */
  const tops = {};
  function topTex(look) {
    if (tops[look]) return tops[look];
    const TT = T(), K = LK[look], ppu = SZ(LO() ? 110 : 160), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = N * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    g.fillStyle = K[0]; g.fillRect(0, 0, Wp, Hp); g.fillStyle = K[1]; g.fillRect(ox, oz, F, F);
    const map = srgb(new TT.CanvasTexture(c)); map.anisotropy = 8;
    const ns = SZ(LO() ? 40 : 64), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    { const q = nm.getContext('2d'); q.fillStyle = 'rgb(128,128,255)'; q.fillRect(0, 0, nW, nH); }
    Promise.all([loadImg('fr-' + look), loadImg('bd-' + look)]).then(([fr, bd]) => {
      const tile = ppu * K[2];
      if (look === 'lux') {   // black marble all round, a double gold line inlaid round the edge and round the field
        const mc = marble(), mt = ppu * 3.6; for (let y = 0; y < Hp; y += mt) for (let x = 0; x < Wp; x += mt) g.drawImage(mc, x, y, mt, mt);
        g.strokeStyle = '#dcb468'; for (const [ins, lw] of [[.12, .035], [.19, .012]]) { g.lineWidth = ppu * lw; g.strokeRect(ppu * ins, ppu * ins, Wp - 2 * ppu * ins, Hp - 2 * ppu * ins); }
        g.lineWidth = ppu * .02; g.strokeRect(ox - ppu * .09, oz - ppu * .09, F + ppu * .18, F + ppu * .18);
      } else if (fr) for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile);
      // the field sits a hair below the surround: a soft shade round it
      g.save(); g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = ppu * .12; g.fillStyle = '#000'; g.fillRect(ox, oz, F, F); g.restore();
      if (bd) g.drawImage(bd, ox, oz, F, F);
      // meadow / bauhaus: the corner pictures become objects (cornerProps): the corners get the plain ground
      if (bd && (look === 'meadow' || look === 'bauhaus')) {
        const px = g.getImageData(Math.round(ox + ppu * .06), Math.round(oz + ppu * 1.95), 1, 1).data, base = 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')';
        for (const [cx, cz] of [[0, 0], [5, 0], [0, 5], [5, 5]]) {
          const x0 = ox + cx * ppu, z0 = oz + cz * ppu, S2 = 2 * ppu, inset = ppu * (look === 'meadow' ? .02 : .06);
          g.save(); g.beginPath(); g.rect(x0 + (cx ? inset : 0), z0 + (cz ? inset : 0), S2 - inset, S2 - inset); g.clip(); g.fillStyle = base; g.fillRect(x0, z0, S2, S2);
          if (look === 'meadow') for (let k = 0; k < 900; k++) { const x = x0 + hash(k, cx + cz * 7) * S2, z = z0 + hash(k * 3.1, cz + 1.7) * S2; g.fillStyle = 'rgba(' + (k % 3 ? '70,140,40' : '200,235,140') + ',.35)'; g.fillRect(x, z, ppu * .02, ppu * .05); }
          g.restore();
        }
      }
      // delft: one tile under each point, white grout between
      if (look === 'delft') { g.strokeStyle = 'rgba(214,220,230,.95)'; g.lineWidth = ppu * .03; g.beginPath(); for (let k = 0; k <= N; k++) { g.moveTo(ox + k * ppu, oz); g.lineTo(ox + k * ppu, oz + F); g.moveTo(ox, oz + k * ppu); g.lineTo(ox + F, oz + k * ppu); } g.stroke(); }
      map.needsUpdate = true;
      if (look === 'lux') luxMetal(c, look);
      // the relief: the picture's brightness, blurred a little, as a height (the lines and points of carved / raised boards)
      const hc = document.createElement('canvas'); hc.width = nW; hc.height = nH; const h2 = hc.getContext('2d');
      h2.filter = 'blur(' + Math.max(.6, ns / 70) + 'px)'; h2.drawImage(c, 0, 0, nW, nH); h2.filter = 'none';
      const src = h2.getImageData(0, 0, nW, nH).data, hh = new Float32Array(nW * nH);
      for (let i = 0; i < nW * nH; i++) hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
      // the step down at the field's edge
      const e0x = Math.round(BX * ns), e0z = Math.round(BZ * ns), e1x = Math.round((BX + N) * ns), e1z = Math.round((BZ + N) * ns);
      const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, s = K[5] * 2.4 * (look === 'delft' ? 2.2 : 1);
      // oak / norse: a drilled hollow on every point; delft: the grout sunk between the tiles
      let ex = null;
      if (look === 'oak' || look === 'norse' || look === 'delft') {
        ex = new Float32Array(nW * nH);
        for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
          const u = x / ns - BX, v = y / ns - BZ; if (u < 0 || v < 0 || u >= N || v >= N) continue;
          const c0 = Math.floor(u), r0 = Math.floor(v);
          if (look === 'delft') {   // a glazed tile: a soft pillow rising from the grout, the glaze a little wavy
            const du = Math.min(u - c0, c0 + 1 - u), dv = Math.min(v - r0, r0 + 1 - v), dd = Math.min(du, dv), k = Math.min(1, dd / .16);
            hh[y * nW + x] = 0; ex[y * nW + x] = (dd < .025 ? -.25 : .9 * Math.sin(k * Math.PI / 2)) + (fbm(u * 9 + c0 * 3, v * 9 + r0 * 5) - .5) * .05; continue;
          }
          if (!ON(r0, c0)) continue;
          const dd = Math.hypot(u - c0 - .5, v - r0 - .5); if (dd < .14) ex[y * nW + x] = -.35 * Math.sqrt(1 - (dd / .14) * (dd / .14));
        }
      }
      for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
        const at = (xx, yy) => { xx = Math.max(0, Math.min(nW - 1, xx)); yy = Math.max(0, Math.min(nH - 1, yy)); return hh[yy * nW + xx] - ((xx >= e0x && xx < e1x && yy >= e0z && yy < e1z) ? .25 : 0) + (ex ? ex[yy * nW + xx] : 0); };
        const dx = -(at(x + 1, y) - at(x - 1, y)) * s, dz = -(at(x, y + 1) - at(x, y - 1)) * s, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      }
      ng.putImageData(img, 0, 0); nmT.needsUpdate = true;
      if (X.kick) X.kick(300);
    });
    return (tops[look] = { map, nm: nmT });
  }

  // lux: polished black marble (white and smoke veins, a few gold threads) for the surround and the sides — no wood
  let marbleC = null;
  function marble() {
    if (marbleC) return marbleC;
    const S = LO() ? 512 : 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), id = g.createImageData(S, S), d = id.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * 6, v = y / S * 6, w = fbm(u * .7, v * .7) * 5 + fbm(u * 2.1 + 3, v * 2.1) * 1.4;
      const f1 = Math.abs(Math.sin((u * .9 + v * .4 + w) * 1.7)), f2 = Math.abs(Math.sin((u * .3 - v * .8 + w * 1.3) * 2.3));
      const vein = Math.exp(-f1 * 34) * .9 + Math.exp(-f2 * 60) * .5, cloud = fbm(u * 1.3 + 7, v * 1.3) * .08, gold = Math.exp(-Math.abs(Math.sin((u * .5 + v * .7 + w * .8) * 1.1)) * 140);
      const i = (y * S + x) * 4, b = 12 + cloud * 160;
      d[i] = Math.min(255, b + vein * 170 + gold * 200); d[i + 1] = Math.min(255, b + vein * 168 + gold * 160); d[i + 2] = Math.min(255, b + 2 + vein * 165 + gold * 80); d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return (marbleC = c);
  }

  /* ---------- the slab: a block with eased edges ---------- */
  const slabs = {};
  function slabGeo(look) {
    if (slabs[look]) return slabs[look];
    const TT = T(), sh = new TT.Shape(), ra = LK[look][6], a = W / 2 - ra, b = H / 2 - ra;
    sh.moveTo(-a, -H / 2); sh.lineTo(a, -H / 2); sh.absarc(a, -b, ra, -Math.PI / 2, 0, false); sh.lineTo(W / 2, b); sh.absarc(a, b, ra, 0, Math.PI / 2, false);
    sh.lineTo(-a, H / 2); sh.absarc(-a, b, ra, Math.PI / 2, Math.PI, false); sh.lineTo(-W / 2, -b); sh.absarc(-a, -b, ra, Math.PI, Math.PI * 1.5, false);
    const bv = .06, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 2 : 4, curveSegments: LO() ? 6 : 12, steps: look === 'norse' ? 4 : 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    g.scale((W - .02) / (W + 2 * (bv - .01)), 1, (H - .02) / (H + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count);
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), z = P.getZ(i); const y = P.getY(i);
      if (look === 'norse' && y < TH - .02) { const k = 1 + (fbm(x * 1.9 + y * 4, z * 1.9 - y * 3) - .5) * .035 - (y < .1 ? .006 : 0); x *= k; z *= k; P.setX(i, x); P.setZ(i, z); }   // (a rough-hewn stone: the sides uneven)
      if (side[i]) UV.setXY(i, (x + z) / LK[look][2], P.getY(i) / LK[look][2]); else UV.setXY(i, x / W + .5, .5 - z / H);
    }
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (slabs[look] = g);
  }
  function sideTex(look) {
    if (look === 'lux') return mat('sideTlux', () => { const t = srgb(new (T().CanvasTexture)(marble())); t.wrapS = t.wrapT = T().RepeatWrapping; return t; });
    return mat('sideT' + look, () => {
      const t = srgb(new (T().CanvasTexture)(document.createElement('canvas'))); t.wrapS = t.wrapT = T().RepeatWrapping;
      loadImg('fr-' + look).then(im => { if (!im) return; t.image = im; t.needsUpdate = true; if (X.kick) X.kick(200); });
      return t;
    });
  }
  const lookNow = () => { const B = X.BOARDS && X.BOARDS.foxgeese; return B ? B.get() : 'meadow'; };
  const setNow = () => { const P = X.PIECES && X.PIECES.foxgeese; return P ? P.get() : 'cute'; };
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), tx = topTex(look), K = LK[look];
    const topM = mat('top' + look, () => phys(Object.assign({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: '#ffffff', roughness: K[3], metalness: 0, envMapIntensity: .8 }, K[4] ? { clearcoat: K[4], clearcoatRoughness: .25 } : {},
      look === 'lux' ? { metalnessMap: metalTex(look), roughnessMap: metalTex(look), metalness: 1, roughness: 1, envMapIntensity: 1.3 } : {},
      look === 'delft' ? { clearcoatRoughness: .03, clearcoatNormalMap: tx.nm, envMapIntensity: 1.5 } : {})));
    const sideM = mat('side' + look, () => phys(Object.assign({ map: sideTex(look), color: K[7], roughness: Math.min(.95, K[3] + .1), envMapIntensity: .7 }, K[4] ? { clearcoat: K[4] * .8, clearcoatRoughness: .3 } : {}, look === 'lux' ? { roughness: .12, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.2 } : {})));
    const slab = new TT.Mesh(slabGeo(look), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    cornerProps(g, look);
    if (look === 'lux') luxDress(g);
    g.userData.S = N; g.userData.top = TH + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-N / 2 + x + .5, -N / 2 + y + .5];
    g.userData.piece = (col, set) => piece(col, set); g.userData.sink = 0; g.userData.look = look;
    return g;
  }

  // lux: a polished gold molding round the top edge and a gold band near the foot, the slab standing on a black marble plinth
  function rrect(TT, w, h, r) { const sh = new TT.Shape(), a = w / 2 - r, b = h / 2 - r; sh.moveTo(-a, -h / 2); sh.lineTo(a, -h / 2); sh.absarc(a, -b, r, -Math.PI / 2, 0, false); sh.lineTo(w / 2, b); sh.absarc(a, b, r, 0, Math.PI / 2, false); sh.lineTo(-a, h / 2); sh.absarc(-a, b, r, Math.PI / 2, Math.PI, false); sh.lineTo(-w / 2, -b); sh.absarc(-a, -b, r, Math.PI, Math.PI * 1.5, false); return sh; }
  function ring(k, w, h, r, t, hh) {   // a rounded-rectangle band: outer w × h, t thick, hh high (y 0 … hh)
    return G(k, () => { const TT = T(), sh = rrect(TT, w, h, r); sh.holes.push(rrect(TT, w - 2 * t, h - 2 * t, Math.max(.01, r - t)));
      const e = new TT.ExtrudeGeometry(sh, { depth: hh - .01, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 1, curveSegments: 6 }); e.rotateX(-Math.PI / 2); e.translate(0, .005, 0); e.computeVertexNormals(); return e; });
  }
  function luxDress(g) {
    const TT = T(), r = LK.lux[6], gold = mat('luxGold', () => phys({ color: '#e2bb68', metalness: 1, roughness: .16, envMapIntensity: 1.6 }));
    const mm = mat('luxPl', () => phys({ map: sideTex('lux'), color: '#ffffff', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.2 }));
    const add = (geo, m, y) => { const o = new TT.Mesh(geo, m); o.position.y = y; o.castShadow = o.receiveShadow = true; g.add(o); };
    add(ring('lxTop', W + .02, H + .02, r + .01, .07, .025), gold, TH - .012);            // the molding on the top edge
    add(ring('lxMid', W + .03, H + .03, r + .015, .04, .03), gold, .12);                   // a band low on the side
    add(G('lxPlinth', () => { const e = new TT.ExtrudeGeometry(rrect(TT, W + .24, H + .24, r + .12), { depth: .07, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 6 }); e.rotateX(-Math.PI / 2); e.translate(0, .02, 0);
      const P = e.attributes.position, UV = e.attributes.uv; for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / 3.6, (P.getZ(i) + P.getY(i)) / 3.6); e.computeVertexNormals(); return e; }), mm, -.005);
    add(ring('lxFoot', W + .3, H + .3, r + .15, .03, .02), gold, .025);                    // gold on the plinth's edge
  }

  /* ---------- the boards' objects: the meadow's diorama corners, the abstract board's sculptures, the gold studs ---------- */
  function cornerProps(g, look) {
    const TT = T(), Y = TH, add = (o, x, y, z) => { o.position.set(x, Y + y, z); o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.add(o); return o; };
    const Mb = (k, o) => mat('bp' + k, () => phys(o)), mesh2 = (geo, m) => new TT.Mesh(geo, m);
    const s2 = seg(24);
    if (look === 'meadow') {
      // far left: a hollow stump with toadstools
      { const o = new TT.Group(), bark = Mb('bark', { color: '#8a5a34', roughness: .9 }), ring = Mb('ring', { color: '#d9b07a', roughness: .8 }), hole = Mb('hole', { color: '#2a160a', roughness: 1 });
        o.add(mesh2(G('stump', () => new TT.CylinderGeometry(.62, .7, .26, s2, 1, true)), bark));
        const top = mesh2(G('stumpTop', () => new TT.RingGeometry(.3, .62, s2)), ring); top.rotation.x = -Math.PI / 2; top.position.y = .13; o.add(top);
        const hl = mesh2(G('stumpHole', () => new TT.CircleGeometry(.3, s2)), hole); hl.rotation.x = -Math.PI / 2; hl.position.y = .06; o.add(hl);
        const hw = mesh2(G('stumpHw', () => new TT.CylinderGeometry(.3, .3, .07, s2, 1, true)), bark); hw.position.y = .095; hw.material = Mb('holeW', { color: '#4a2a14', roughness: 1, side: TT.BackSide }); o.add(hw);
        for (const [x, z, s] of [[.5, .5, 1], [.66, .32, .8], [-.55, .5, .7]]) {
          const st = mesh2(G('mStem', () => new TT.CylinderGeometry(.03, .04, .1, 10)), Mb('mStem', { color: '#f2ead8', roughness: .7 })); st.position.set(x, -.08 + .05 * s, z); st.scale.setScalar(s); o.add(st);
          const cp = mesh2(G('mCap', () => new TT.SphereGeometry(.08, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)), Mb('mCap', { color: '#d23a2a', roughness: .5 })); cp.position.set(x, -.08 + .1 * s, z); cp.scale.setScalar(s); o.add(cp);
        }
        add(o, -2.5, .13, -2.5); }
      // far right: an apple tree
      { const o = new TT.Group(), leaf = Mb('leaf', { color: '#4f9a3a', roughness: .85 });
        o.add(Object.assign(mesh2(G('trunk', () => new TT.CylinderGeometry(.09, .14, .5, 12)), Mb('trunk', { color: '#7a4e2c', roughness: .9 })), {}));
        o.children[0].position.y = .25;
        for (const [x, y, z, r] of [[0, .72, 0, .48], [-.3, .58, .2, .34], [.32, .6, -.12, .36], [.1, .9, .15, .3]]) { const b = mesh2(G('leafB', () => new TT.IcosahedronGeometry(1, 1)), leaf); b.position.set(x, y, z); b.scale.setScalar(r); o.add(b); }
        const apple = Mb('apple', { color: '#d8262a', roughness: .35, clearcoat: .6 });
        for (let k = 0; k < 9; k++) { const t = k * 2.4, a = mesh2(G('apple', () => new TT.SphereGeometry(.055, 8, 6)), apple); a.position.set(Math.cos(t) * .44, .55 + (k % 3) * .14, Math.sin(t) * .44); o.add(a); }
        add(o, 2.5, 0, -2.5); }
      // near left: a pond with lily pads and reeds
      { const o = new TT.Group();
        const w = mesh2(G('pond', () => { const q = new TT.CircleGeometry(.72, s2 * 2); q.scale(1, .82, 1); q.rotateX(-Math.PI / 2); return q; }), Mb('water', { color: '#5aa6c8', roughness: .05, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.4 })); w.position.y = .004; o.add(w);
        const rim = mesh2(G('pondRim', () => { const q = new TT.TorusGeometry(.72, .045, 6, s2 * 2); q.scale(1, .82, 1); q.rotateX(Math.PI / 2); return q; }), Mb('pebble', { color: '#b8ad98', roughness: .9 })); o.add(rim);
        for (const [x, z, r] of [[-.2, .1, .14], [.25, -.15, .11], [.05, .3, .09]]) { const p = mesh2(G('pad', () => { const q = new TT.CircleGeometry(1, 16, .3, Math.PI * 2 - .6); q.rotateX(-Math.PI / 2); return q; }), Mb('pad', { color: '#3f8a3a', roughness: .6, side: TT.DoubleSide })); p.position.set(x, .012, z); p.scale.setScalar(r); o.add(p); }
        { const fl = mesh2(G('lotus', () => new TT.SphereGeometry(.045, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2)), Mb('lotus', { color: '#f0a8c0', roughness: .5 })); fl.position.set(-.2, .015, .1); o.add(fl); }
        for (const [x, z, hgt] of [[-.62, -.3, .42], [-.56, -.42, .34], [.6, .4, .38]]) { const st = mesh2(G('reed', () => new TT.CylinderGeometry(.012, .014, 1, 6)), Mb('reed', { color: '#6c8a3a', roughness: .8 })); st.scale.set(1, hgt, 1); st.position.set(x, hgt / 2, z); o.add(st); const hd = mesh2(G('cat', () => new TT.CylinderGeometry(.03, .03, .12, 8)), Mb('cat', { color: '#6a4426', roughness: .9 })); hd.position.set(x, hgt - .06, z); o.add(hd); }
        add(o, -2.5, 0, 2.5); }
      // near right: a little red shed and a fence
      { const o = new TT.Group(), red = Mb('shed', { color: '#c8462e', roughness: .7 }), roof = Mb('roof', { color: '#8a2e1e', roughness: .75 }), wd = Mb('fence', { color: '#a87848', roughness: .85 });
        const body = mesh2(G('shedB', () => new TT.BoxGeometry(.7, .32, .5)), red); body.position.y = .16; o.add(body);
        const rf = mesh2(G('shedR2', () => { const q = new TT.CylinderGeometry(.34, .34, .8, 3, 1); q.rotateZ(Math.PI / 2); q.rotateX(-Math.PI / 2); q.scale(1, .6, 1); return q; }), roof); rf.position.y = .32 + .34 * .5 * .6; o.add(rf);   // (the ridge up, the eaves on the walls)
        const dr = mesh2(G('shedD', () => new TT.BoxGeometry(.14, .2, .01)), Mb('door', { color: '#f2e2c0', roughness: .7 })); dr.position.set(.1, .1, .255); o.add(dr);
        for (let k = 0; k < 6; k++) { const p = mesh2(G('post', () => new TT.BoxGeometry(.04, .2, .04)), wd); p.position.set(-.6 + k * .24, .1, .62); o.add(p); }
        const rail = mesh2(G('rail', () => new TT.BoxGeometry(1.26, .03, .025)), wd); rail.position.set(0, .15, .62); o.add(rail);
        const rail2 = rail.clone(); rail2.position.y = .07; o.add(rail2);
        o.rotation.y = -.15; add(o, 2.5, 0, 2.3); }
    } else if (look === 'bauhaus') {
      const navy = Mb('bNavy', { color: '#1f2f6e', roughness: .45, clearcoat: .3 }), yel = Mb('bYel', { color: '#e3a82b', roughness: .45, clearcoat: .3 }), blk = Mb('bBlk', { color: '#1e1e20', roughness: .5 }), wht = Mb('bWht', { color: '#efe9dc', roughness: .5 });
      // far left: a navy quarter disc and a yellow ball
      { const o = new TT.Group(), q = mesh2(G('bQuarter', () => { const sh = new TT.Shape(); sh.moveTo(0, 0); sh.lineTo(1.5, 0); sh.absarc(0, 0, 1.5, 0, Math.PI / 2, false); sh.lineTo(0, 0); const e = new TT.ExtrudeGeometry(sh, { depth: .1, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 2, curveSegments: 20 }); e.rotateX(Math.PI / 2); e.translate(0, .115, 0); return e; }), navy);
        q.position.set(-.85, 0, -.85); o.add(q); const b = mesh2(G('bBall', () => new TT.SphereGeometry(.2, 18, 12)), yel); b.position.set(.15, .32, .15); o.add(b); add(o, -2.5, 0, -2.5); }
      // far right: a yellow block with a black arch
      { const o = new TT.Group(), bl = mesh2(G('bBlock', () => new TT.BoxGeometry(1.6, .1, 1.6)), yel); bl.position.y = .05; o.add(bl);
        const ar = mesh2(G('bArch', () => { const q = new TT.CylinderGeometry(.55, .55, .3, 32, 1, false, 0, Math.PI); q.rotateZ(Math.PI / 2); q.rotateY(Math.PI / 2); return q; }), blk); ar.position.set(0, .1, .35); ar.rotation.x = 0; o.add(ar);
        const ln = mesh2(G('bLine', () => new TT.BoxGeometry(1.1, .03, .06)), wht); ln.position.set(0, .115, -.5); o.add(ln); add(o, 2.5, 0, -2.5); }
      // near left: a black tile with white bars
      { const o = new TT.Group(), bl = mesh2(G('bBlock', () => new TT.BoxGeometry(1.6, .1, 1.6)), blk); bl.position.y = .05; o.add(bl);
        for (let k = 0; k < 4; k++) { const b = mesh2(G('bBar', () => new TT.BoxGeometry(.12, .1, 1.3)), wht); b.position.set(-.5 + k * .3, .14, 0); b.rotation.y = .7; o.add(b); }
        const st = mesh2(G('bStripe', () => new TT.BoxGeometry(.14, .16, 1.6)), navy); st.position.set(.7, .08, 0); o.add(st); add(o, -2.5, 0, 2.5); }
      // near right: a navy wedge and a yellow ball
      { const o = new TT.Group(), w = mesh2(G('bWedge', () => { const sh = new TT.Shape(); sh.moveTo(-.8, .8); sh.lineTo(.8, .8); sh.lineTo(.8, -.8); sh.lineTo(-.8, .8); const e = new TT.ExtrudeGeometry(sh, { depth: .5, bevelEnabled: false }); e.rotateX(Math.PI / 2); e.translate(0, .5, 0); return e; }), navy); o.add(w);
        const plate = mesh2(G('bBlock', () => new TT.BoxGeometry(1.6, .1, 1.6)), wht); plate.position.y = .03; plate.scale.y = .4; o.add(plate);
        const b = mesh2(G('bBall', () => new TT.SphereGeometry(.2, 18, 12)), yel); b.position.set(-.35, .2, .35); o.add(b); add(o, 2.5, 0, 2.5); }
    } else if (look === 'lux') {
      // a gold stud on every point
      const gold = Mb('luxStud', { color: '#e0b864', metalness: 1, roughness: .22, envMapIntensity: 1.5 }), geo = G('stud', () => new TT.SphereGeometry(.075, 10, 3, 0, Math.PI * 2, 0, Math.PI / 2));
      for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) if (ON(r, c)) { const m = mesh2(geo, gold); m.scale.y = .45; m.position.set(-N / 2 + c + .5, Y, -N / 2 + r + .5); m.castShadow = false; m.receiveShadow = true; g.add(m); }
    }
  }

  /* ---------- the pieces: each set its own object, after the 2D set's idea (2026-11-19 user: そっくり同じでなく、コンセプトを考えて) ----------
     cute    ころんとしたソフビ人形: a round head, the 2D face on the front half, pointed ears / a little tuft
     wood    ろくろ挽きの木のコマ: cherry fox (a turned body, a ball head, ears and a snout), maple goose ball, walnut beak and eyes
     bauhaus 幾何学の積み木: a teal diamond (an octahedron on a black foot) and an orange rounded cube
     lux     金と真珠: a faceted gold fox sitting on a gold plinth, a pearl on a gold plinth
     norse   骨と琥珀: the fox's head cut from amber (the 2D outline as a cabochon, see-through), a turned bone disc with a groove
     delft   染付の置物: white porcelain bells with cobalt bands, the 2D fox / goose motif painted on the crown */
  const V2 = (x, y) => new (T().Vector2)(x, y);
  const geos = {}, G = (k, f) => { const kk = k + (LO() ? 'lo' : 'hi'); if (!geos[kk]) { const g = f(); g.computeBoundingSphere(); if (X.share) X.share(g); geos[kk] = g; } return geos[kk]; };
  const seg = n => Math.max(8, Math.round(n * (LO() ? .4 : .6)));   // (2026-11-19: ~60 % of the old segments — smooth normals keep the look; ~1/3 of the triangles)
  // a canvas texture (cached)
  const ctex = (k, w, h, draw, rep) => mat('tx' + k, () => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = srgb(new (T().CanvasTexture)(c)); if (rep) t.wrapS = t.wrapT = T().RepeatWrapping; t.anisotropy = 4; return t; });
  // turned wood: growth rings across the piece (u round, v up)
  const woodTex = (k, base, dark) => ctex('wood' + k, 256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { const t = fbm(y * .05, 3.1) * 4 + y * .09, a = .1 + .16 * Math.pow(.5 + .5 * Math.sin(t * 6.283), 6); g.fillStyle = dark; g.globalAlpha = a; g.fillRect(0, y, w, 1); }
    g.globalAlpha = 1;
  }, true);
  const boneTex = () => ctex('bone', 256, 256, (g, w, h) => {
    const id = g.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * .04, y * .3) * .6 + fbm(x * .3, y * .03) * .4, i = (y * w + x) * 4; d[i] = 226 - n * 40; d[i + 1] = 214 - n * 42; d[i + 2] = 186 - n * 46; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }, true);
  const delftTex = () => ctex('delft', 512, 256, (g, w, h) => {
    g.fillStyle = '#f4f6fa'; g.fillRect(0, 0, w, h);
    const B = '#1d3b8a';
    g.fillStyle = B; g.fillRect(0, h * .9, w, h * .1);   // the foot
    g.fillRect(0, h * .78, w, h * .025);
    // a band of little leaves round the body
    g.strokeStyle = B; g.lineWidth = 3;
    for (let i = 0; i < 16; i++) { const x = (i + .5) * w / 16, y = h * .62; g.beginPath(); g.ellipse(x, y, w / 52, h * .07, .6, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.moveTo(x - w / 32, y + h * .1); g.quadraticCurveTo(x, y - h * .02, x + w / 32, y + h * .1); g.stroke(); }
    g.fillRect(0, h * .42, w, h * .02); g.fillRect(0, h * .12, w, h * .03);
  }, true);
  // a material, cached
  const M = (k, o) => mat('pm' + k, () => phys(o));
  const mesh = (geo, m, x, y, z) => { const o = new (T().Mesh)(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = o.receiveShadow = true; return o; };
  const plinth = (r, m) => G('plinth' + r, () => new (T().LatheGeometry)([V2(0, 0), V2(r, 0), V2(r * 1.03, .014), V2(r, .03), V2(r * .92, .044), V2(0, .044)], seg(40)));

  // cute: the head (a front half that wears the 2D face, a plain back half), ears or a tuft
  const CUTE = { 1: { r: .29, sy: .86, c: [.5, .6], rad: .47, ry: .37, back: '#e8813a', ear: '#e8813a', tip: '#5a3220' }, 2: { r: .235, sy: .9, c: [.5, .56], rad: .44, ry: .43, back: '#ffffff' } };
  function faceGeo(col) {
    const C = CUTE[col];
    return G('cuteF' + col, () => {
      const g = new (T().SphereGeometry)(C.r, seg(40), seg(28), 0, Math.PI);   // (phi 0..π: the z > 0 half — the front)
      const P = g.attributes.position, UV = g.attributes.uv;
      for (let i = 0; i < P.count; i++) UV.setXY(i, C.c[0] + P.getX(i) / C.r * C.rad, 1 - C.c[1] + P.getY(i) / C.r * C.ry);
      return g;
    });
  }
  function cute(g0, col) {
    const TT = T(), C = CUTE[col], fox = col === 1, y0 = C.r * C.sy * .92;
    // the head looks up a little (TILT): its face is seen from the portal's low table camera and the full game's view from above
    const g = new TT.Group(); g.position.y = y0; g.rotation.x = -TILT; g.position.z = -.02; g0.add(g);
    const back = mesh(G('cuteB' + col, () => new TT.SphereGeometry(C.r, seg(40), seg(28), Math.PI, Math.PI)), M('cuteB' + col, { color: C.back, roughness: .42, clearcoat: .5, clearcoatRoughness: .3 }), 0, 0, 0);
    back.scale.set(1, C.sy, 1); g.add(back);
    const face = new TT.Mesh(faceGeo(col), M('cuteF' + col, { map: picTex('pc-cute-' + (fox ? 'f' : 'g'), C.back), color: '#ffffff', roughness: .42, clearcoat: .5, clearcoatRoughness: .3 })); face.scale.set(1, C.sy, 1); face.castShadow = true; g.add(face);
    if (fox) for (const sx of [-1, 1]) {
      const e = mesh(G('cuteEar', () => { const q = new TT.ConeGeometry(.1, .17, seg(16)); q.scale(1, 1, .6); return q; }), M('cuteEar', { color: C.ear, roughness: .42, clearcoat: .5 }), sx * .17, C.r * C.sy * .78, -.02);
      e.rotation.z = -sx * .42; g.add(e);
      const t = mesh(G('cuteTip', () => { const q = new TT.ConeGeometry(.045, .07, seg(12)); q.scale(1, 1, .6); return q; }), M('cuteTip', { color: C.tip, roughness: .5 }), 0, .07, 0); e.add(t);
    }   // (no tuft on the goose: from behind it read as a beak pointing the wrong way, 2026-11-19 user)
    g0.userData.h = y0 + C.r * C.sy;
  }
  // wood: turned pieces
  function wood(g, col) {
    const TT = T(), walnut = M('walnut', { map: woodTex('w', '#5a3a24', '#2a170c'), color: '#ffffff', roughness: .5 });
    if (col === 1) {
      const cherry = M('cherry', { map: woodTex('c', '#b4573a', '#5e2414'), color: '#ffffff', roughness: .45, clearcoat: .35, clearcoatRoughness: .4 });
      g.add(mesh(G('wBody', () => new TT.LatheGeometry([V2(0, 0), V2(.24, 0), V2(.25, .03), V2(.22, .07), V2(.15, .2), V2(.12, .3), V2(0, .31)], seg(32))), cherry));
      const hd = new TT.Group(); hd.position.y = .42; hd.rotation.x = -TILT * .7; g.add(hd);   // (the face looks up a little)
      const head = mesh(G('wHead', () => new TT.SphereGeometry(.17, seg(32), seg(22))), cherry); head.scale.set(1, .92, 1); hd.add(head);
      hd.add(mesh(G('wSnout', () => { const q = new TT.ConeGeometry(.085, .2, seg(20)); q.rotateX(Math.PI / 2); return q; }), cherry, 0, -.03, .2));
      hd.add(mesh(G('wNose', () => new TT.SphereGeometry(.03, seg(12), seg(8))), walnut, 0, -.03, .3));
      for (const sx of [-1, 1]) {
        const e = mesh(G('wEar', () => { const q = new TT.ConeGeometry(.065, .16, seg(14)); q.scale(1, 1, .55); return q; }), cherry, sx * .1, .16, -.01); e.rotation.z = -sx * .3; hd.add(e);
        hd.add(mesh(G('wEye', () => new TT.SphereGeometry(.022, seg(10), seg(8))), walnut, sx * .07, .04, .14));
      }
      g.userData.h = .62;
    } else {
      const maple = M('maple', { map: woodTex('m', '#e8d2a8', '#b48c5a'), color: '#ffffff', roughness: .5, clearcoat: .25, clearcoatRoughness: .4 });
      g.add(mesh(G('wFoot', () => new TT.LatheGeometry([V2(0, 0), V2(.16, 0), V2(.17, .02), V2(.13, .05), V2(0, .05)], seg(28))), maple));
      const hd = new TT.Group(); hd.position.y = .25; hd.rotation.x = -TILT; g.add(hd);   // (the face looks up a little)
      hd.add(mesh(G('wBall', () => new TT.SphereGeometry(.23, seg(34), seg(24))), maple));
      hd.add(mesh(G('wBeak', () => { const q = new TT.ConeGeometry(.06, .17, seg(16)); q.rotateX(Math.PI / 2); return q; }), walnut, 0, 0, .27));
      for (const sx of [-1, 1]) hd.add(mesh(G('wEye', () => new TT.SphereGeometry(.022, seg(10), seg(8))), walnut, sx * .09, .08, .19));
      g.userData.h = .48;
    }
  }
  // bauhaus: a teal diamond on a black foot, an orange rounded cube
  function bauhaus(g, col) {
    const TT = T();
    if (col === 1) {
      g.add(mesh(G('bFoot', () => new TT.CylinderGeometry(.15, .17, .05, seg(32))), M('bBlack', { color: '#1e1e20', roughness: .5 }), 0, .025, 0));
      const d = mesh(G('bDia', () => { const q = new TT.OctahedronGeometry(.26, 0); q.scale(1, 1.3, 1); return q; }), M('bTeal', { color: '#13797a', roughness: .38, clearcoat: .4, flatShading: true }), 0, .05 + .26 * 1.3 * .92, 0);
      d.rotation.y = Math.PI / 4; g.add(d); g.userData.h = .05 + .26 * 1.3 * 1.92;
    } else {
      g.add(mesh(G('bCube', () => {
        const s = .19, r = .05, sh = new TT.Shape(); sh.moveTo(-s + r, -s); sh.lineTo(s - r, -s); sh.quadraticCurveTo(s, -s, s, -s + r); sh.lineTo(s, s - r); sh.quadraticCurveTo(s, s, s - r, s); sh.lineTo(-s + r, s); sh.quadraticCurveTo(-s, s, -s, s - r); sh.lineTo(-s, -s + r); sh.quadraticCurveTo(-s, -s, -s + r, -s);
        const q = new TT.ExtrudeGeometry(sh, { depth: .2, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 4, curveSegments: 4 }); q.rotateX(-Math.PI / 2); q.translate(0, .035, 0); q.computeVertexNormals(); return q;
      }), M('bOrange', { color: '#e8672b', roughness: .4, clearcoat: .4 })));
      g.userData.h = .27;
    }
  }
  // lux: a faceted gold fox sitting on a plinth; a pearl on a plinth
  function lux(g, col) {
    const TT = T(), gold = M('gold', { color: '#e3bc6a', metalness: 1, roughness: .24, envMapIntensity: 1.5 });
    if (col === 1) {
      g.add(mesh(plinth(.26), gold));
      const facet = M('goldF', { color: '#e8c070', metalness: 1, roughness: .2, envMapIntensity: 1.6, flatShading: true });
      const ico = (k, r) => G(k, () => new TT.IcosahedronGeometry(r, 0));
      const body = mesh(ico('lxBody', .17), facet, 0, .22, -.02); body.scale.set(.85, 1.25, .95); g.add(body);
      const head = mesh(ico('lxHead', .11), facet, 0, .47, .05); g.add(head);
      g.add(mesh(G('lxSnout', () => { const q = new TT.ConeGeometry(.055, .15, 4); q.rotateX(Math.PI / 2); return q; }), facet, 0, .45, .19));
      for (const sx of [-1, 1]) { const e = mesh(G('lxEar', () => new TT.ConeGeometry(.045, .13, 3)), facet, sx * .065, .6, .03); e.rotation.z = -sx * .2; g.add(e); }
      const tail = mesh(G('lxTail', () => { const q = new TT.ConeGeometry(.06, .26, 5); q.rotateX(-Math.PI / 2.4); return q; }), facet, .1, .1, -.17); tail.rotation.y = .5; g.add(tail);
      for (const sx of [-1, 1]) g.add(mesh(G('lxEye', () => new TT.SphereGeometry(.014, 8, 6)), M('ruby', { color: '#c0182a', roughness: .1, clearcoat: 1 }), sx * .04, .5, .14));
      g.userData.h = .66;
    } else {
      g.add(mesh(plinth(.21), gold));
      g.add(mesh(G('lxCup', () => new TT.LatheGeometry([V2(.09, .04), V2(.13, .07), V2(.12, .08), V2(.06, .06)], seg(28))), gold));
      const pearl = M('pearl', { color: '#f3ece6', roughness: .2, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.35 });   // (no sheen: r128 and r186 disagree on it)
      g.add(mesh(G('lxPearl', () => new TT.SphereGeometry(.19, seg(40), seg(28))), pearl, 0, .25, 0));
      g.userData.h = .44;
    }
  }
  // norse: the fox head cut from amber (the 2D outline, as a cabochon); a turned bone disc
  function norse(g, col) {
    const TT = T();
    if (col === 1) {
      const amber = M('amber', { color: '#c8680e', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, emissive: lin('#5a2400'), envMapIntensity: 1.5 });
      // the outline of a fox's head seen from above (the ears toward the far side, the chin narrowing toward the player)
      const NA = 128, rad = new Float32Array(NA);
      for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, z = Math.sin(th), b = d => Math.exp(-d * d / .045);
        rad[a] = .34 + .03 * z - .05 * Math.max(0, z) * Math.max(0, z) + .13 * (b(th - (Math.PI * 1.5 - .62)) + b(th - (Math.PI * 1.5 + .62))) - .04 * b(th - Math.PI * 1.5); }
      g.add(mesh(tokenGeo('norseF', { rad }, 1, .3, 2.2, .18), amber));
      g.userData.h = .3;
    } else {
      const bone = M('bone', { map: boneTex(), color: '#ffffff', roughness: .62 });
      g.add(mesh(G('nBone', () => new TT.LatheGeometry([V2(0, 0), V2(.25, 0), V2(.27, .03), V2(.27, .1), V2(.24, .16), V2(.17, .19), V2(.15, .175), V2(.12, .2), V2(0, .215)], seg(40))), bone));
      g.userData.h = .22;
    }
  }
  // delft: porcelain bells, cobalt bands, the motif on the crown
  function delft(g, col) {
    const TT = T(), fox = col === 1, s = fox ? 1 : .78;
    const por = M('delftB', { map: delftTex(), color: '#ffffff', roughness: .18, clearcoat: 1, clearcoatRoughness: .08 });
    const prof = [V2(0, 0), V2(.22, 0), V2(.23, .02), V2(.2, .05), V2(.21, .1), V2(.26, .2), V2(.27, .28), V2(.25, .36), V2(.215, .42), V2(.205, .45), V2(.2, .462), V2(0, .465)].map(p => V2(p.x * s, p.y * s));
    g.add(mesh(G('dBell' + col, () => new TT.LatheGeometry(prof, seg(40))), por));
    g.add(mesh(G('dCap2' + col, () => { const q = new TT.CircleGeometry(.198 * s, seg(40)), UV = q.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, .5 + (UV.getX(i) - .5) * .74, .5 + (UV.getY(i) - .5) * .74); q.rotateX(-Math.PI / 2); return q; }) /* (the plate's motif filling the crown: easier to read from above, 2026-11-19 user) */, M('delftC' + col, { map: picTex('pc-delft-' + (fox ? 'f' : 'g'), '#f4f6fa'), color: '#ffffff', roughness: .18, clearcoat: 1, clearcoatRoughness: .08 }), 0, .4655 * s + .001, 0));
    if (fox) {   // the fox's lid has a knob: a little porcelain fox sitting on it, cobalt ears, tail tip and eyes
      const wh = M('delftW', { color: '#f6f8fc', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.4 }), bl = M('delftBl', { color: '#1d3b8a', roughness: .12, clearcoat: 1, clearcoatRoughness: .05 });
      const k = new TT.Group(); k.position.y = .465 * s; g.add(k); k.scale.setScalar(1.15);
      k.add(mesh(G('dkBase2', () => new TT.CylinderGeometry(.15, .17, .02, seg(32))), bl, 0, .01, 0));   // (a cobalt crown under the fox: the fox's piece reads at once from above)
      const body = mesh(G('dkBody', () => new TT.SphereGeometry(.085, seg(24), seg(16))), wh, 0, .1, -.01); body.scale.set(.85, 1.15, .95); k.add(body);
      k.add(mesh(G('dkHead', () => new TT.SphereGeometry(.06, seg(22), seg(14))), wh, 0, .215, .025));
      k.add(mesh(G('dkSnout', () => { const q = new TT.ConeGeometry(.032, .085, seg(14)); q.rotateX(Math.PI / 2); return q; }), wh, 0, .205, .09));
      k.add(mesh(G('dkNose', () => new TT.SphereGeometry(.012, 8, 6)), bl, 0, .205, .132));
      for (const sx of [-1, 1]) {
        const e = mesh(G('dkEar', () => { const q = new TT.ConeGeometry(.026, .065, seg(12)); q.scale(1, 1, .6); return q; }), bl, sx * .035, .275, .015); e.rotation.z = -sx * .3; k.add(e);
        k.add(mesh(G('dkEye', () => new TT.SphereGeometry(.009, 8, 6)), bl, sx * .024, .23, .075));
      }
      const tail = mesh(G('dkTail', () => new TT.TorusGeometry(.07, .028, seg(10), seg(20), Math.PI * 1.1)), wh, .02, .06, -.04); tail.rotation.set(-Math.PI / 2, 0, -.4); k.add(tail);
      k.add(mesh(G('dkTip', () => new TT.SphereGeometry(.03, 10, 8)), bl, .08, .06, .03));
      g.userData.h = .465 * s + .3;
    } else g.userData.h = .47 * s;
  }
  const TILT = .75;
  // a picture's texture at once (a plain colour until the picture has come: the materials never change afterwards — the portal's
  // showcase turns the repeated geese into instances when it is built, so a material set later would never reach them)
  function picTex(k, col0) {
    return mat('pic' + k, () => {
      const c = document.createElement('canvas'); c.width = c.height = 4; const q = c.getContext('2d'); q.fillStyle = col0; q.fillRect(0, 0, 4, 4);
      const t = srgb(new (T().CanvasTexture)(c)); t.anisotropy = 4;
      cut(k).then(cv => { if (!cv) return; t.image = cv.tex.image; t.needsUpdate = true; if (X.kick) X.kick(200); });
      return t;
    });
  }
  const BUILD = { cute, wood, bauhaus, lux, norse, delft }, FOXK = { cute: 1.12, wood: 1.25, bauhaus: 1.3, lux: 1.3, norse: 1.2, delft: 1.1 };
  // a picture → its outline (the distance from the centre to the last opaque pixel in 128 directions, smoothed) and a texture
  // whose transparent pixels carry the nearest edge colour
  const cuts = {};
  function cut(k) {
    if (cuts[k]) return cuts[k];
    return (cuts[k] = loadImg(k).then(im => {
      if (!im) return null;
      const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); g.drawImage(im, 0, 0, S, S);
      const id = g.getImageData(0, 0, S, S), d = id.data, A = i => d[i * 4 + 3];
      const NA = 128, rad = new Float32Array(NA);
      for (let a = 0; a < NA; a++) { const t = a / NA * Math.PI * 2, cx = Math.cos(t), cy = Math.sin(t); let r = 0; for (let s = 0; s < S / 2; s += .5) { const x = Math.round(S / 2 + cx * s), y = Math.round(S / 2 + cy * s); if (x < 0 || y < 0 || x >= S || y >= S) break; if (A(y * S + x) > 110) r = s; } rad[a] = r / S; }
      const sm = new Float32Array(NA); for (let a = 0; a < NA; a++) { let s = 0; for (let k2 = -2; k2 <= 2; k2++) s += rad[(a + k2 + NA) % NA] * [1, 2, 3, 2, 1][k2 + 2]; sm[a] = s / 9; }
      for (let pass = 0; pass < 24; pass++) {
        const src = new Uint8ClampedArray(d);
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
          const i = y * S + x; if (src[i * 4 + 3] > 110) continue;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= S || yy >= S) continue; const j = yy * S + xx; if (src[j * 4 + 3] > 110) { d[i * 4] = src[j * 4]; d[i * 4 + 1] = src[j * 4 + 1]; d[i * 4 + 2] = src[j * 4 + 2]; d[i * 4 + 3] = 255; break; } }
        }
      }
      for (let i = 0; i < S * S; i++) d[i * 4 + 3] = 255;
      g.putImageData(id, 0, 0);
      const tex = srgb(new (T().CanvasTexture)(c)); tex.anisotropy = 4;
      return { rad: sm, tex, im };
    }));
  }
  // a cabochon over a picture's outline: rings from the centre out, the height a superellipse of the distance (p 2: a dome), a
  // short straight side, a flat bottom; uv straight from above
  function tokenGeo(k, cv, w, h, pw, edge) {
    return G('tok' + k, () => {
      const TT = T(), step = LO() ? 4 : 2, NA = cv.rad.length / step | 0, KR = LO() ? 6 : 10;
      const pos = [], uv = [], idx = [], rAt = a => cv.rad[(a * step) % cv.rad.length] * w * .985;
      const prof = t => edge + (1 - edge) * Math.pow(Math.max(0, 1 - Math.pow(t, pw)), 1 / pw);
      const V = (x, y, z) => { pos.push(x, y, z); uv.push(x / w + .5, .5 - z / w); return pos.length / 3 - 1; };
      const c0 = V(0, h, 0), ring = [];
      for (let kk = 1; kk <= KR; kk++) { const t = Math.sin(kk / KR * Math.PI / 2), row = []; for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, r = rAt(a) * t; row.push(V(Math.cos(th) * r, h * prof(t), Math.sin(th) * r)); } ring.push(row); }
      for (let a = 0; a < NA; a++) { const b = (a + 1) % NA; idx.push(c0, ring[0][b], ring[0][a]); }
      for (let kk = 1; kk < KR; kk++) for (let a = 0; a < NA; a++) { const b = (a + 1) % NA, p0 = ring[kk - 1][a], p1 = ring[kk - 1][b], q0 = ring[kk][a], q1 = ring[kk][b]; idx.push(p0, p1, q1, p0, q1, q0); }
      const top = [], bot = [];
      for (let a = 0; a < NA; a++) { const th = a / NA * Math.PI * 2, r = rAt(a); top.push(V(Math.cos(th) * r, h * edge, Math.sin(th) * r)); bot.push(V(Math.cos(th) * r * .97, 0, Math.sin(th) * r * .97)); }
      for (let a = 0; a < NA; a++) { const b = (a + 1) % NA; idx.push(top[a], top[b], bot[b], top[a], bot[b], bot[a]); }
      const cb = V(0, 0, 0); for (let a = 0; a < NA; a++) { const b = (a + 1) % NA; idx.push(cb, bot[a], bot[b]); }
      const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
      g.computeVertexNormals(); return g;
    });
  }
  // col 1 the fox / 2 a goose (facing +z, toward the near side)
  function piece(col, set) {
    set = SETS.includes(set) ? set : setNow();
    const TT = T(), g = new TT.Group();
    g.userData = { col, h: PH, set };
    BUILD[set](g, col);
    // the fox stands out among the geese (a size per set)
    if (col === 1) { const k = FOXK[set] || 1; if (k !== 1) { const inner = new TT.Group(); while (g.children.length) inner.add(g.children[0]); inner.scale.setScalar(k); g.add(inner); g.userData.h *= k; } }
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
