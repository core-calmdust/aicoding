/* =====================================================================
   Ludus latrunculorum on the 3D table — the 2D page's six designs in 3D (2026-11-19, remade from the 2D art of 2026-11-18/19):
   Table3D.BOARDS / PIECES.latrunculi, chosen in the full game's design tab and the portal's 盤 / 駒 rows.
   Boards (the 2D page's rendered boards, latrunculi/img/2d/bd-<look>.webp — the grid is in the picture — on a slab whose
   surround is the frame picture fr-<look>.webp; a relief from the picture's own shading):
     'stone' (the default) 石板 — a slab just dug up: broken, chipped edges, rough sides stained with soil, lying in a bed of
       earth with rubble, two broken-off pieces, a potsherd and a trowel ·
     'wood' 木工 — one board of walnut (fr-woodfield, the grid inlaid: bd-woodgrid), brass corner caps, a plinth ·
     'abstract' アブストラクト — a white panel floating on a slate slab over a dark base ·
     'lux' ラピスと大理石 — lapis and Calacatta in gold lines (the gold is real metal), a gold molding and a black marble plinth ·
     'giallo' 黄大理石 — giallo antico in a rosso antico surround, on a stepped rosso antico plinth ·
     'pompeii' ポンペイの赤 — the red fresco in a black surround with a gilt bead round the edge.
   Counters (chess-like figures — 2026-11-19 user: 3D盤では駒に立体感があっても良い):
     'helm' (the default) a Roman helmet carved in marble / basalt, on a stand and plinth · 'wood' a turned pawn with burnt rings ·
     'abstract' a six-petal flower on a stem · 'coin' a stack of three coins (gold / silver; SPQR on top, S·C underneath) ·
     'glass' a domed counter of Roman glass with an iridescent weathering crust · 'bone' a turned bone counter with V grooves.
   A blocked counter (incitus): the tall figures (helm, wood, abstract) topple onto their side; the flat ones (coin, glass, bone)
   lie upside down showing their underside (the 2D page's turned-over pictures: S·C, the crust, VI).
   Table3D.latrunculi.turn(piece, k) (k 0 … 1) — the skin and the table adapter animate it.
   Older saved keys (the first 3D set of 2026-11-16) are read as the new ones (tables3d.js).
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
  const N = 8, BX = .45, BZ = .8, R = .36;
  const W = N + 2 * BX, H = N + 2 * BZ;
  const LOOKS = ['stone', 'wood', 'abstract', 'lux', 'giallo', 'pompeii'];
  const SETS = ['helm', 'wood', 'abstract', 'coin', 'glass', 'bone'];
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../latrunculi/img/2d/', s).href; } catch (e) {} return '../latrunculi/img/2d/'; })();
  const url = k => IMG + k + '.webp?v=7';   // (the 2D page's cache version, so the browser shares the files)
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  let IRI = null;   // does this three have iridescence (r186 yes, r128 no)
  function phys(o) {   // lite: the standard shader (no clearcoat / iridescence)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (p.emissive !== undefined && typeof p.emissive === 'string') p.emissive = lin(p.emissive);
    if (IRI === null) { try { IRI = 'iridescence' in new TT.MeshPhysicalMaterial(); } catch (e) { IRI = false; } }
    if (!IRI) { delete p.iridescence; delete p.iridescenceIOR; delete p.iridescenceThicknessRange; }
    const phy = p.clearcoat !== undefined || p.iridescence !== undefined;
    if (X.lite || !phy) { delete p.clearcoat; delete p.clearcoatRoughness; delete p.iridescence; delete p.iridescenceIOR; delete p.iridescenceThicknessRange; return new TT.MeshStandardMaterial(p); }
    return new TT.MeshPhysicalMaterial(p);
  }
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  const fbm = (x, y) => vnoise(x, y) * .5 + vnoise(x * 2.3 + 5, y * 2.3 + 9) * .3 + vnoise(x * 5.1 + 1, y * 5.1 + 3) * .2;
  const imgs = {};
  const loadImg = k => imgs[k] || (imgs[k] = new Promise(res => { const im = new Image(); im.decoding = 'async'; im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = url(k); }));
  const srgb = t => { const TT = T(); if ('colorSpace' in t && TT.SRGBColorSpace) t.colorSpace = TT.SRGBColorSpace; else t.encoding = TT.sRGBEncoding; return t; };
  const V2 = (x, y) => new (T().Vector2)(x, y);
  const geos = {}, G = (k, f) => { const kk = k + (LO() ? 'lo' : 'hi'); if (!geos[kk]) { const g = f(); g.computeBoundingSphere(); if (X.share) X.share(g); geos[kk] = g; } return geos[kk]; };
  const seg = n => Math.max(8, Math.round(n * (LO() ? .3 : .45)));   // (2026-11-19 user: ポリゴン数を削減 — 32 figures on the board)
  const ctex = (k, w, h, draw, rep, lin0) => mat('tx' + k, () => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new (T().CanvasTexture)(c); if (!lin0) srgb(t); if (rep) t.wrapS = t.wrapT = T().RepeatWrapping; t.anisotropy = 4; return t; });
  const M = (k, o) => mat('pm' + k, () => phys(o));
  const mesh = (geo, m, x, y, z) => { const o = new (T().Mesh)(geo, m); o.position.set(x || 0, y || 0, z || 0); o.castShadow = o.receiveShadow = true; return o; };

  // per board: [surround colour (before the pictures arrive), field colour, the frame tile (squares; 0 = one picture over all),
  //             roughness, clearcoat, relief, slab corner, slab thickness, plinth height]
  const LK = {
    stone: ['#8a7a62', '#d8cdb8', 3.4, .92, 0, 1.25, .12, .5, 0],
    wood: ['#4a2c18', '#8a5a34', 0, .48, .4, .45, .34, .38, .08],
    abstract: ['#3a3d42', '#ece4d6', 3.0, .82, 0, .2, .05, .2, .16],
    lux: ['#1c0c08', '#2a3f8f', 3.6, .24, .7, .22, .2, .36, .07],
    giallo: ['#5a1e18', '#dcae64', 3.4, .3, .55, .3, .14, .36, .11],
    pompeii: ['#1e1a18', '#8e2018', 3.2, .72, .12, .5, .16, .4, 0],
  };

  /* ---------- marble, made here: the black of the lux plinth, the rosso antico of the giallo surround ---------- */
  const marbles = {};
  function marble(k) {
    if (marbles[k]) return marbles[k];
    const S = LO() ? 512 : 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), id = g.createImageData(S, S), d = id.data;
    const P = k === 'rosso' ? { b: [96, 26, 20], cl: [70, 22, 14], v: [196, 120, 92], v2: [40, 10, 8], vw: 28 } : { b: [14, 13, 13], cl: [140, 140, 140], v: [178, 174, 168], v2: [210, 170, 90], vw: 34 };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S * 6, v = y / S * 6, w = fbm(u * .7, v * .7) * 5 + fbm(u * 2.1 + 3, v * 2.1) * 1.4;
      const f1 = Math.abs(Math.sin((u * .9 + v * .4 + w) * 1.7)), f2 = Math.abs(Math.sin((u * .3 - v * .8 + w * 1.3) * 2.3));
      const vein = Math.exp(-f1 * P.vw) * .8 + Math.exp(-f2 * 60) * .45, cloud = (fbm(u * 1.3 + 7, v * 1.3) - .5) * .35, thin = Math.exp(-Math.abs(Math.sin((u * .5 + v * .7 + w * .8) * 1.1)) * 140);
      const i = (y * S + x) * 4;
      for (let ch = 0; ch < 3; ch++) d[i + ch] = Math.max(0, Math.min(255, P.b[ch] + cloud * P.cl[ch] * .5 + (P.v[ch] - P.b[ch]) * vein + (P.v2[ch] - P.b[ch]) * thin * .8));
      d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    return (marbles[k] = c);
  }
  const marbleTex = k => mat('mbT' + k, () => { const t = srgb(new (T().CanvasTexture)(marble(k))); t.wrapS = t.wrapT = T().RepeatWrapping; return t; });

  // the gold of the picture (warm, bright pixels) as real metal — a metalness / roughness map (three: G roughness, B metalness)
  const metals = {};
  function metalFrom(c, look) {
    const w = Math.round(c.width / 2), h = Math.round(c.height / 2), m = document.createElement('canvas'); m.width = w; m.height = h;
    const q = m.getContext('2d'); q.drawImage(c, 0, 0, w, h);
    const id = q.getImageData(0, 0, w, h), d = id.data, rr = LK[look][3];
    for (let i = 0; i < w * h; i++) {
      const r = d[i * 4], gg = d[i * 4 + 1], b = d[i * 4 + 2], gold = r > 150 && r - b > 55 && gg > b + 25 && gg > 105 && r >= gg ? Math.min(1, (r - b - 55) / 40) : 0;
      d[i * 4] = 0; d[i * 4 + 1] = Math.round((rr + (.2 - rr) * gold) * 255); d[i * 4 + 2] = Math.round(gold * 255); d[i * 4 + 3] = 255;
    }
    q.putImageData(id, 0, 0);
    const t = metalTex(look); t.image = m; t.needsUpdate = true;
  }
  function metalTex(look) { return metals[look] || (metals[look] = (() => { const c = document.createElement('canvas'); c.width = c.height = 2; const q = c.getContext('2d'); q.fillStyle = 'rgb(0,' + Math.round(LK[look][3] * 255) + ',0)'; q.fillRect(0, 0, 2, 2); return new (T().CanvasTexture)(c); })()); }

  /* ---------- the excavated slab's outline (stone): chipped all round, the far right corner broken off ---------- */
  let STONE_OUT = null;
  function stoneOutline() {   // points in the shape's plane (x, s) — s = −z (far is +s)
    if (STONE_OUT) return STONE_OUT;
    const n = LO() ? 96 : 124, pts = [], ra = .12, a = W / 2 - ra, b = H / 2 - ra, L = 2 * (2 * a + 2 * b) + 2 * Math.PI * ra;
    const at = t => {   // a point on the rounded rectangle at arc length t, with its outward normal
      const seglist = [[2 * a, (u) => [-a + u, -H / 2, 0, -1]], [Math.PI * ra / 2, u => { const q = -Math.PI / 2 + u / ra; return [a + ra * Math.cos(q), -b + ra * Math.sin(q), Math.cos(q), Math.sin(q)]; }],
        [2 * b, u => [W / 2, -b + u, 1, 0]], [Math.PI * ra / 2, u => { const q = u / ra; return [a + ra * Math.cos(q), b + ra * Math.sin(q), Math.cos(q), Math.sin(q)]; }],
        [2 * a, u => [a - u, H / 2, 0, 1]], [Math.PI * ra / 2, u => { const q = Math.PI / 2 + u / ra; return [-a + ra * Math.cos(q), b + ra * Math.sin(q), Math.cos(q), Math.sin(q)]; }],
        [2 * b, u => [-W / 2, b - u, -1, 0]], [Math.PI * ra / 2, u => { const q = Math.PI + u / ra; return [-a + ra * Math.cos(q), -b + ra * Math.sin(q), Math.cos(q), Math.sin(q)]; }]];
      for (const [len, f] of seglist) { if (t <= len) return f(t); t -= len; } return seglist[0][1](0);
    };
    // chips: [position along the outline (0..1), depth, width]
    const chips = [[.03, .22, .035], [.08, .12, .015], [.13, .16, .02], [.2, .3, .03], [.27, .1, .012], [.33, .17, .025], [.41, .12, .015], [.47, .26, .035], [.53, .1, .012], [.58, .2, .025], [.64, .14, .018], [.69, .1, .015], [.78, .28, .035], [.83, .12, .015], [.88, .18, .025], [.95, .2, .03]];
    for (let i = 0; i < n; i++) {
      const t = i / n; let [x, s, nx, ns] = at(t * L);
      let d = .02 + (fbm(t * 50, 3.7) - .35) * .12 + (fbm(t * 190, 8.1) - .5) * .045;
      for (const [c, dep, wd] of chips) { const dt = Math.min(Math.abs(t - c), 1 - Math.abs(t - c)); d += dep * Math.max(0, 1 - dt / wd) * (.7 + .6 * hash(i, 5)); }
      // the band's width bounds the bite (the grid stays whole)
      const lim = Math.abs(nx) > .7 ? BX - .1 : Math.abs(ns) > .7 ? BZ - .14 : Math.min(BX, BZ) - .1;
      d = Math.max(0, Math.min(lim, d));
      x -= nx * d; s -= ns * d;
      // the broken corner (far right): everything beyond a jagged line goes
      const cx = W / 2, cs = H / 2, u0 = (cx - x) / .42 + (cs - s) / .74;   // < 1 → cut
      if (u0 < 1) { const k = 1 - u0 + (fbm(t * 80, 1.3) - .5) * .12; x -= k * .42 * .55; s -= k * .74 * .55; }
      pts.push([x, s]);
    }
    return (STONE_OUT = pts);
  }

  /* ---------- the top: the frame picture all round, the 2D board on the field; a normal map from the picture's own shading ---------- */
  const tops = {};
  function topTex(look) {
    if (tops[look]) return tops[look];
    const TT = T(), K = LK[look], ppu = SZ(LO() ? 110 : 160), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu), ox = BX * ppu, oz = BZ * ppu, F = N * ppu;
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    g.fillStyle = K[0]; g.fillRect(0, 0, Wp, Hp); g.fillStyle = K[1]; g.fillRect(ox, oz, F, F);
    const map = srgb(new TT.CanvasTexture(c)); map.anisotropy = 8;
    const ns = SZ(LO() ? 48 : 80), nW = Math.round(W * ns), nH = Math.round(H * ns), nm = document.createElement('canvas'); nm.width = nW; nm.height = nH;
    const nmT = new TT.CanvasTexture(nm); nmT.anisotropy = 4;
    { const q = nm.getContext('2d'); q.fillStyle = 'rgb(128,128,255)'; q.fillRect(0, 0, nW, nH); }
    const frKey = look === 'wood' ? 'fr-woodfield' : 'fr-' + look, bdKey = look === 'wood' ? 'bd-woodgrid' : 'bd-' + look;
    Promise.all([loadImg(frKey), loadImg(bdKey)]).then(([fr, bd]) => {
      const tile = ppu * K[2];
      if (look === 'giallo') { const mc = marble('rosso'), mt = ppu * 3.4; for (let y = 0; y < Hp; y += mt) for (let x = 0; x < Wp; x += mt) g.drawImage(mc, x, y, mt, mt); }
      else if (look === 'wood' && fr) { const s = Math.max(Wp / fr.width, Hp / fr.height); g.drawImage(fr, (Wp - fr.width * s) / 2, (Hp - fr.height * s) / 2, fr.width * s, fr.height * s); }
      else if (fr) for (let y = 0; y < Hp; y += tile) for (let x = 0; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile);
      if (look !== 'wood' && look !== 'stone') { g.save(); g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = ppu * .1; g.fillStyle = '#000'; g.fillRect(ox, oz, F, F); g.restore(); }
      if (bd && look === 'wood') {   // the grid is cut into the walnut and filled with pale wood: a dark hairline where the inlay meets the groove
        g.save(); g.shadowColor = 'rgba(20,8,0,.75)'; g.shadowBlur = ppu * .012; g.shadowOffsetX = g.shadowOffsetY = ppu * .006; g.drawImage(bd, ox, oz, F, F); g.restore();
      } else if (bd) g.drawImage(bd, ox, oz, F, F);
      // the frame lines of the 2D page (--frm)
      const line = (ins, lw, col) => { g.strokeStyle = col; g.lineWidth = ppu * lw; g.strokeRect(ppu * ins, ppu * ins, Wp - 2 * ppu * ins, Hp - 2 * ppu * ins); };
      const fieldLine = (off, lw, col) => { g.strokeStyle = col; g.lineWidth = ppu * lw; g.strokeRect(ox - ppu * off, oz - ppu * off, F + 2 * ppu * off, F + 2 * ppu * off); };
      if (look === 'lux') { line(.1, .03, '#dcb46a'); line(.16, .01, '#dcb46a'); fieldLine(.06, .022, '#dcb46a'); }
      if (look === 'pompeii') { fieldLine(.07, .03, '#d6a04a'); line(.13, .012, '#d6a04a'); }
      if (look === 'giallo') { fieldLine(.05, .04, 'rgba(30,8,4,.55)'); fieldLine(.1, .012, 'rgba(240,200,140,.5)'); }
      if (look === 'stone') weather(g, ppu, Wp, Hp);
      map.needsUpdate = true;
      if (look === 'lux' || look === 'pompeii') metalFrom(c, look);
      // the relief: the picture's brightness, blurred a little, as a height
      const hc = document.createElement('canvas'); hc.width = nW; hc.height = nH; const h2 = hc.getContext('2d');
      h2.filter = 'blur(' + Math.max(.5, ns / 90) + 'px)'; h2.drawImage(c, 0, 0, nW, nH); h2.filter = 'none';
      const src = h2.getImageData(0, 0, nW, nH).data, hh = new Float32Array(nW * nH);
      for (let i = 0; i < nW * nH; i++) hh[i] = (src[i * 4] * .3 + src[i * 4 + 1] * .59 + src[i * 4 + 2] * .11) / 255;
      if (look === 'wood' && bd) {   // wood: the grain only faintly; the inlaid lines sit a little below the surface
        const lc = document.createElement('canvas'); lc.width = nW; lc.height = nH; const l2 = lc.getContext('2d'); l2.drawImage(bd, BX * ns, BZ * ns, N * ns, N * ns);
        const la = l2.getImageData(0, 0, nW, nH).data; for (let i = 0; i < nW * nH; i++) hh[i] = hh[i] * .25 - la[i * 4 + 3] / 255 * .9;
      }
      if (look === 'stone') for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {   // pitting and a worn, uneven face
        const u = x / ns, v = y / ns, p = fbm(u * 14, v * 14); hh[y * nW + x] += (fbm(u * 1.6, v * 1.6) - .5) * .5 + (p < .3 ? (p - .3) * 2.2 : 0);
      }
      const e0x = Math.round(BX * ns), e0z = Math.round(BZ * ns), e1x = Math.round((BX + N) * ns), e1z = Math.round((BZ + N) * ns);
      const step = look === 'wood' || look === 'stone' ? 0 : .25;
      const ng = nm.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, s = K[5] * 2.2 * (ns / 64);
      for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
        const at = (xx, yy) => { xx = Math.max(0, Math.min(nW - 1, xx)); yy = Math.max(0, Math.min(nH - 1, yy)); return hh[yy * nW + xx] - ((xx >= e0x && xx < e1x && yy >= e0z && yy < e1z) ? step : 0); };
        const dx = -(at(x + 1, y) - at(x - 1, y)) * s, dz = -(at(x, y + 1) - at(x, y - 1)) * s, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
        d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
      }
      ng.putImageData(img, 0, 0); nmT.needsUpdate = true;
      if (X.kick) X.kick(300);
    });
    return (tops[look] = { map, nm: nmT });
  }
  // stone: earth in the chips and along the broken edges, stains, lichen, two cracks
  function weather(g, ppu, Wp, Hp) {
    const pts = stoneOutline(), P = ([x, s]) => [(x + W / 2) * ppu, (H / 2 - s) * ppu];
    g.save();
    g.beginPath(); pts.forEach((p, i) => { const [a, b] = P(p); i ? g.lineTo(a, b) : g.moveTo(a, b); }); g.closePath();
    g.clip();
    // soil worked into the edge: a soft dark rim inside the outline
    g.strokeStyle = 'rgba(58,40,22,.55)'; g.lineWidth = ppu * .32; g.filter = 'blur(' + Math.round(ppu * .08) + 'px)'; g.stroke(); g.filter = 'none';
    g.strokeStyle = 'rgba(40,26,14,.5)'; g.lineWidth = ppu * .06; g.stroke();
    // stains and lichen
    for (let k = 0; k < 70; k++) {
      const x = hash(k, 1.7) * Wp, y = hash(k, 9.1) * Hp, r = ppu * (.15 + hash(k, 3.3) * .6), kind = hash(k, 7.7);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      const col = kind < .45 ? '70,50,28' : kind < .7 ? '150,120,70' : kind < .85 ? '112,118,74' : '226,214,190';
      gr.addColorStop(0, 'rgba(' + col + ',' + (kind < .45 ? .22 : .16) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    // grains of earth
    for (let k = 0; k < 2600; k++) {
      const x = hash(k, 2.1) * Wp, y = hash(k, 4.9) * Hp, e = Math.min(x, y, Wp - x, Hp - y) / ppu;
      if (hash(k, 6.6) > Math.exp(-e * 1.3) * .9 + .06) continue;
      g.fillStyle = 'rgba(' + (hash(k, 8) < .5 ? '64,44,24' : '120,92,60') + ',' + (.25 + hash(k, 9) * .4) + ')'; const r = ppu * (.006 + hash(k, 3) * .016); g.fillRect(x, y, r, r);
    }
    // cracks: jagged, from the broken corner and from the near edge
    const crack = (x0, y0, ang, len, w) => {
      g.strokeStyle = 'rgba(30,20,12,.75)'; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); let x = x0, y = y0; g.moveTo(x, y);
      for (let i = 0; i < 40; i++) { ang += (hash(i, x0) - .5) * .7; x += Math.cos(ang) * len / 40; y += Math.sin(ang) * len / 40; g.lineTo(x, y); } g.stroke();
      g.strokeStyle = 'rgba(255,246,226,.18)'; g.lineWidth = w * .5; g.translate(w * .6, w * .6); g.stroke(); g.translate(-w * .6, -w * .6);
    };
    crack(Wp - ppu * .5, ppu * .55, 2.4, ppu * 2.6, ppu * .025);
    crack(ppu * 2.2, Hp - ppu * .1, -1.3, ppu * 1.4, ppu * .02);
    crack(ppu * .05, ppu * 5.2, .25, ppu * .9, ppu * .018);
    g.restore();
  }

  /* ---------- the slab ---------- */
  function rrect(TT, w, h, r) { const sh = new TT.Shape(), a = w / 2 - r, b = h / 2 - r; sh.moveTo(-a, -h / 2); sh.lineTo(a, -h / 2); sh.absarc(a, -b, r, -Math.PI / 2, 0, false); sh.lineTo(w / 2, b); sh.absarc(a, b, r, 0, Math.PI / 2, false); sh.lineTo(-a, h / 2); sh.absarc(-a, b, r, Math.PI / 2, Math.PI, false); sh.lineTo(-w / 2, -b); sh.absarc(-a, -b, r, Math.PI, Math.PI * 1.5, false); return sh; }
  const slabs = {};
  function slabGeo(look) {
    if (slabs[look]) return slabs[look];
    const TT = T(), K = LK[look], TH = K[7], stone = look === 'stone';
    let sh;
    if (stone) { sh = new TT.Shape(); stoneOutline().forEach(([x, s], i) => i ? sh.lineTo(x, s) : sh.moveTo(x, s)); sh.closePath(); }
    else sh = rrect(TT, W, H, K[6]);
    const bv = stone ? .05 : .06, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .01, bevelSegments: LO() ? 1 : 2, curveSegments: LO() ? 4 : 6, steps: stone ? 2 : 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);
    if (!stone) g.scale((W - .02) / (W + 2 * (bv - .01)), 1, (H - .02) / (H + 2 * (bv - .01)));
    const P = g.attributes.position, UV = g.attributes.uv, side = new Uint8Array(P.count), col = new Float32Array(P.count * 3);
    g.groups.forEach(q => { if (q.materialIndex === 1) for (let i = q.start; i < q.start + q.count; i++) side[i] = 1; });
    const tile = K[2] || 3.6;
    for (let i = 0; i < P.count; i++) {
      let x = P.getX(i), z = P.getZ(i); const y = P.getY(i);
      if (stone && y < TH - .015) {   // rough-hewn, broken sides: pushed in and out, more toward the foot
        const k = (fbm(x * 2.3 + y * 5, z * 2.3 - y * 4) - .5) * .09 + (fbm(x * 7 + y * 9, z * 7) - .5) * .03, len = Math.hypot(x, z) || 1;
        x += x / len * k; z += z / len * k; P.setX(i, x); P.setZ(i, z);
        P.setY(i, y + (y < .02 ? 0 : (fbm(x * 4, z * 4) - .5) * .03));
      }
      if (side[i]) UV.setXY(i, (x + z) / tile, P.getY(i) / (stone ? 1.2 : tile)); else UV.setXY(i, x / W + .5, .5 - z / H);
      // the soil's stain on the stone's sides: dark at the foot
      const yy = P.getY(i) / TH, sd = stone ? .55 + .4 * Math.min(1, Math.pow(yy, .7) + (fbm(x * 3, z * 3) - .5) * .3) : 1;
      col[i * 3] = sd; col[i * 3 + 1] = sd * (stone ? .96 : 1); col[i * 3 + 2] = sd * (stone ? .9 : 1);
    }
    g.setAttribute('color', new TT.BufferAttribute(col, 3));
    g.computeVertexNormals(); g.computeBoundingSphere();
    return (slabs[look] = g);
  }
  // stone: the slab's broken sides — weathered limestone with bedding layers, pits and fresh pale breaks
  const limeTex = () => mat('limeT', () => { const S = LO() ? 256 : 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), id = g.createImageData(S, S), d = id.data;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const u = x / S, v = y / S, layer = Math.sin((v * 9 + fbm(u * 3, v * 3) * 1.6) * Math.PI * 2) * .5 + .5, n = fbm(u * 14, v * 14), pit = fbm(u * 40 + 3, v * 40) < .28 ? .55 : 1;
      const k = (.78 + layer * .1 + (n - .5) * .25) * pit, i = (y * S + x) * 4;
      d[i] = 168 * k; d[i + 1] = 134 * k; d[i + 2] = 92 * k; d[i + 3] = 255;   // (the top's own sandy tone)
    }
    g.putImageData(id, 0, 0);
    const t = srgb(new (T().CanvasTexture)(c)); t.wrapS = t.wrapT = T().RepeatWrapping; return t; });
  function sideTex(look) {
    if (look === 'stone') return limeTex();
    if (look === 'giallo') return marbleTex('rosso');
    return mat('sideT' + look, () => {
      const t = srgb(new (T().CanvasTexture)(document.createElement('canvas'))); t.wrapS = t.wrapT = T().RepeatWrapping;
      loadImg(look === 'wood' ? 'fr-woodfield' : 'fr-' + look).then(im => { if (!im) return; t.image = im; t.needsUpdate = true; if (X.kick) X.kick(200); });
      return t;
    });
  }
  const lookNow = () => { const B = X.BOARDS && X.BOARDS.latrunculi; return B ? B.get() : 'stone'; };
  const setNow = () => { const P = X.PIECES && X.PIECES.latrunculi; return P ? P.get() : 'helm'; };
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), tx = topTex(look), K = LK[look], PL = K[8];
    const metal = look === 'lux' || look === 'pompeii';
    const topM = mat('top' + look, () => phys(Object.assign({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: '#ffffff', roughness: K[3], metalness: 0, envMapIntensity: .8 }, K[4] ? { clearcoat: K[4], clearcoatRoughness: .25 } : {},
      metal ? { metalnessMap: metalTex(look), roughnessMap: metalTex(look), metalness: 1, roughness: 1, envMapIntensity: 1.2 } : {})));
    const sideM = mat('side' + look, () => phys(Object.assign({ map: sideTex(look), bumpMap: look === 'stone' ? sideTex(look) : null, bumpScale: 2, color: '#ffffff', vertexColors: look === 'stone', roughness: Math.min(.95, K[3] + .08), envMapIntensity: .7 }, K[4] ? { clearcoat: K[4] * .8, clearcoatRoughness: .3 } : {})));
    const slab = new TT.Mesh(slabGeo(look), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; slab.position.y = PL; g.add(slab);
    let top = PL + K[7];
    top = dress(g, look, top) || top;
    g.userData.S = N; g.userData.top = top + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-N / 2 + x + .5, -N / 2 + y + .5];
    g.userData.piece = (col, set) => piece(col, set); g.userData.sink = 0; g.userData.look = look;
    return g;
  }

  // a rounded-rectangle band: outer w × h, t thick, hh high (y 0 … hh)
  function ring(k, w, h, r, t, hh, bev) {
    return G(k, () => { const TT = T(), sh = rrect(TT, w, h, r); sh.holes.push(rrect(TT, w - 2 * t, h - 2 * t, Math.max(.01, r - t)));
      const b = bev || .005, e = new TT.ExtrudeGeometry(sh, { depth: Math.max(.002, hh - 2 * b), bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: bev ? 2 : 1, curveSegments: 4 }); e.rotateX(-Math.PI / 2); e.translate(0, b, 0); e.computeVertexNormals(); return e; });
  }
  const block = (k, w, h, r, hh, uvs) => G(k, () => { const TT = T(), e = new TT.ExtrudeGeometry(rrect(TT, w, h, r), { depth: hh - .03, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1, curveSegments: 4 }); e.rotateX(-Math.PI / 2); e.translate(0, .015, 0);
    const P = e.attributes.position, UV = e.attributes.uv; for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / (uvs || 3.6), (P.getZ(i) + P.getY(i)) / (uvs || 3.6)); e.computeVertexNormals(); return e; });

  /* ---------- each board's dressing (returns the new top when the field is raised) ---------- */
  function dress(g, look, top) {
    const TT = T(), K = LK[look], PL = K[8], add = (geo, m, x, y, z) => { const o = mesh(geo, m, x, y, z); g.add(o); return o; };
    if (look === 'stone') { excavation(g); return; }
    if (look === 'wood') {
      const walnut = M('wdPlinth', { map: sideTex('wood'), color: '#7a5a44', roughness: .55, clearcoat: .3, clearcoatRoughness: .4 });
      add(block('wdPl', W + .2, H + .2, K[6] + .1, PL, 3.6), walnut, 0, 0, 0);
      // brass corner caps: a quarter ring and two arms on the top, the same wrapped round the side; two screws
      const brass = M('brass', { color: '#f4c968', metalness: 1, roughness: .07, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 2.8 }), brassD = M('brassD', { color: '#e6b85c', metalness: 1, roughness: .1, envMapIntensity: 2.6 });   // (2026-11-19 user: 煌めき感を — polished, nearly gold)
      const r0 = K[6], armL = .42, bw = .1, TH = K[7], sh = TH * .8, y0 = PL;
      for (const [sx, sz] of [[1, -1], [-1, -1], [1, 1], [-1, 1]]) {
        const cx = sx * (W / 2 - r0), cz = sz * (H / 2 - r0);
        const ph0 = sx > 0 ? (sz < 0 ? 0 : -Math.PI / 2) : (sz < 0 ? Math.PI / 2 : Math.PI);
        void ph0;
        // the top: one bevelled L following the corner (its rounded edges catch the light), mirrored for each corner
        const capG = G('wdCapL', () => { const sh2 = new TT.Shape(), ri = r0 - bw, A = armL + r0;
          sh2.moveTo(-A, r0); sh2.lineTo(0, r0); sh2.absarc(0, 0, r0, Math.PI / 2, 0, true); sh2.lineTo(r0, -A); sh2.lineTo(ri, -A); sh2.lineTo(ri, 0); sh2.absarc(0, 0, ri, 0, Math.PI / 2, false); sh2.lineTo(-A, ri); sh2.closePath();
          const e = new TT.ExtrudeGeometry(sh2, { depth: .006, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2, curveSegments: 8 }); e.rotateX(Math.PI / 2); e.translate(0, .012, 0); e.computeVertexNormals(); return e; });
        const cap = mesh(capG, brass, cx, y0 + TH, cz); cap.scale.set(sx, 1, sz); g.add(cap);
        const thk = G('wdArmT', () => new TT.BoxGeometry(1, .012, 1));
        const thS = Math.PI / 2 + Math.atan2(-sz, sx) - Math.PI / 4;   // (the cylinder's θ for this quadrant)
        const th0 = sx > 0 ? (sz > 0 ? 0 : Math.PI / 2) : (sz < 0 ? Math.PI : Math.PI * 1.5);
        void thS;
        g.add(mesh(G('wdW' + th0.toFixed(2), () => new TT.CylinderGeometry(r0 + .006, r0 + .006, sh, 10, 1, true, th0, Math.PI / 2)), brass, cx, y0 + TH - sh / 2, cz));
        const s1 = mesh(thk, brass, cx - sx * armL / 2, y0 + TH - sh / 2, sz * (H / 2 + .004)); s1.scale.set(armL, sh / .012, .006); g.add(s1);
        const s2 = mesh(thk, brass, sx * (W / 2 + .004), y0 + TH - sh / 2, cz - sz * armL / 2); s2.scale.set(.006, sh / .012, armL); g.add(s2);
        const sc = G('wdScrew', () => new TT.SphereGeometry(.02, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2));
        g.add(mesh(sc, brassD, cx - sx * (armL - .06), y0 + TH + .007, sz * (H / 2 - bw / 2)));
        g.add(mesh(sc, brassD, sx * (W / 2 - bw / 2), y0 + TH + .007, cz - sz * (armL - .06)));
      }
      return;
    }
    if (look === 'abstract') {   // the slate slab floats on a dark base; the white field is a panel laid on it
      add(block('abBase', W - .7, H - .7, .05, PL, 3), M('abBase', { color: '#1a1a1c', roughness: .6 }), 0, 0, 0);
      const pm = M('abPanel', { map: tops.abstractPanel || (tops.abstractPanel = (() => { const t = srgb(new TT.CanvasTexture(document.createElement('canvas'))); t.anisotropy = 8; loadImg('bd-abstract').then(im => { if (im) { t.image = im; t.needsUpdate = true; if (X.kick) X.kick(200); } }); return t; })()),
        color: '#ffffff', roughness: .78 });
      const pw = N + .06, ph = .05, pg = G('abPanelG', () => { const q = new TT.BoxGeometry(pw, ph, pw); const UV = q.attributes.uv, P = q.attributes.position; for (let i = 0; i < P.count; i++) UV.setXY(i, P.getX(i) / pw + .5, .5 - P.getZ(i) / pw); return q; });
      const edge = M('abEdge', { color: '#f4efe6', roughness: .7 });
      add(pg, [edge, edge, pm, edge, edge, edge], 0, top + ph / 2, 0);
      return top + ph;
    }
    if (look === 'lux') {
      const r = K[6], gold = M('luxGold', { color: '#e2bb68', metalness: 1, roughness: .16, envMapIntensity: 1.6 });
      const nero = M('luxPl', { map: marbleTex('nero'), color: '#ffffff', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.2 });
      add(ring('lxTop', W + .02, H + .02, r + .01, .07, .025), gold, 0, PL + K[7] - .012, 0);
      add(ring('lxMid', W + .03, H + .03, r + .015, .04, .03), gold, 0, PL + .12, 0);
      add(block('lxPlinth', W + .26, H + .26, r + .13, PL + .005, 3.6), nero, 0, 0, 0);
      add(ring('lxFoot', W + .3, H + .3, r + .15, .03, .02), gold, 0, PL - .02, 0);
      return;
    }
    if (look === 'giallo') {   // a stepped rosso antico plinth and a fillet
      const rosso = M('gpRosso', { map: marbleTex('rosso'), color: '#ffffff', roughness: .28, clearcoat: .6, clearcoatRoughness: .2 });
      add(block('giPl1', W + .36, H + .36, K[6] + .18, .06, 3.4), rosso, 0, 0, 0);
      add(block('giPl2', W + .16, H + .16, K[6] + .08, .05, 3.4), rosso, 0, .06, 0);
      return;
    }
    if (look === 'pompeii') {   // a gilt bead round the top edge and a thin one near the foot
      const gilt = M('pmGilt', { color: '#d6a04a', metalness: 1, roughness: .28, envMapIntensity: 1.4 });
      add(ring('pmBead', W + .05, H + .05, K[6] + .02, .06, .05, .02), gilt, 0, K[7] - .035, 0);
      add(ring('pmFoot', W + .03, H + .03, K[6] + .015, .035, .03, .01), gilt, 0, .05, 0);
      return;
    }
  }

  /* ---------- stone: the dig — a bed of earth, rubble, the broken-off pieces, a potsherd, a trowel ---------- */
  const soilTex = () => ctex('soil', 512, 512, (g, w, h) => {
    const id = g.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const u = x / w * 8, v = y / h * 8, n = fbm(u, v) * .6 + fbm(u * 6, v * 6) * .4, i = (y * w + x) * 4;
      d[i] = 84 + n * 62; d[i + 1] = 66 + n * 50; d[i + 2] = 46 + n * 36; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
    for (let k = 0; k < 1400; k++) { const x = hash(k, 1) * w, y = hash(k, 2) * h, r = .6 + hash(k, 3) * 2.4, l = hash(k, 4); g.fillStyle = l < .5 ? 'rgba(40,28,16,.55)' : l < .85 ? 'rgba(170,140,100,.5)' : 'rgba(210,196,170,.7)'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  }, true);
  function excavation(g) {
    const TT = T(), add = (o, x, y, z) => { o.position.set(x, y, z); o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); g.add(o); return o; };
    // the bed: a low mound of earth round the slab (its edge sinks below the table top, so it has no hard outline)
    const bed = G('ltBed', () => {
      // rings round the slab, out to an uneven edge that comes down flush with the table
      const NA = LO() ? 72 : 100, K = LO() ? 5 : 6, pos = [], uv = [], col = [], idx = [];
      for (let i = 0; i < NA; i++) {
        const th = i / NA * Math.PI * 2, cx = Math.cos(th), sz = Math.sin(th);
        const t0 = Math.min((W / 2 - .25) / Math.abs(cx || 1e-6), (H / 2 - .25) / Math.abs(sz || 1e-6));   // inside the slab's foot
        const reach = .2 + fbm(th * 2.2 + 4, 1.7) * .5 + (fbm(th * 9, 3.1) - .5) * .12;   // (kept close: the full game's view crops a little round the slab)
        for (let k = 0; k <= K; k++) {
          const e = k === 0 ? -.9 : k === 1 ? -.38 : Math.pow((k - 1) / (K - 1), 1.15) * (reach + .2), r = t0 + .25 + e, x = cx * r, z = sz * r, f = Math.max(0, e) / (reach + .2);
          let y = k <= 1 ? .16 : .02 + .16 * Math.pow(1 - f, 1.3) + (k < K ? (fbm(x * 3, z * 3) - .5) * .04 * (1 - f) : 0);
          if (k === K) y = .003;
          pos.push(x, y, z); uv.push(x / 2.4, z / 2.4);
          const dark = Math.max(0, 1 - Math.max(0, e) / .45) * .18 + (1 - f) * .06; col.push(1 - dark, 1 - dark * 1.05, 1 - dark * 1.12);
        }
      }
      const Kp = K + 1;
      for (let i = 0; i < NA; i++) { const j = (i + 1) % NA; for (let k = 0; k < K; k++) { const a = i * Kp + k, b = j * Kp + k, c = j * Kp + k + 1, d = i * Kp + k + 1; idx.push(a, b, d, b, c, d); } }
      const q = new TT.BufferGeometry(); q.setAttribute('position', new TT.Float32BufferAttribute(pos, 3)); q.setAttribute('uv', new TT.Float32BufferAttribute(uv, 2)); q.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); q.setIndex(idx);
      { const nn = q; nn.computeVertexNormals(); const N0 = nn.attributes.normal; if (N0.getY(0) < 0) { const I = nn.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i]; I[i] = I[i + 1]; I[i + 1] = t; } nn.computeVertexNormals(); } } return q;
    });
    const soil = M('soil', { map: soilTex(), color: '#ffffff', vertexColors: true, roughness: 1 });
    const b = mesh(bed, soil); b.castShadow = false; g.add(b);
    // rubble: little rough stones
    const rub = G('ltRub', () => { const q = new TT.IcosahedronGeometry(1, 0), P = q.attributes.position; for (let i = 0; i < P.count; i++) { const k = .75 + hash(P.getX(i) * 3 + P.getZ(i), P.getY(i)) * .5; P.setXYZ(i, P.getX(i) * k, P.getY(i) * k * .7, P.getZ(i) * k); } q.computeVertexNormals(); return q; });
    const rm = [M('rub1', { color: '#b8a888', roughness: .95, flatShading: true }), M('rub2', { color: '#8a7a62', roughness: .95, flatShading: true }), M('rub3', { color: '#d2c4a8', roughness: .95, flatShading: true })];
    const ox = W / 2 + .14, oz = H / 2 + .14, spots = [[-ox - .05, -3.4], [-ox, -2.9], [-ox - .1, 1.4], [ox, 1.6], [ox + .08, 2.2], [-3.4, -oz - .05], [-2.8, -oz - .1], [1.8, oz + .05], [2.4, oz], [-ox, 4.4], [3.6, -oz], [ox + .1, -2.0], [-0.6, oz + .1], [-ox - .1, -0.6], [0.4, -oz - .08]];
    spots.forEach(([x, z], i) => { const s = .05 + hash(i, 4) * .07, o = mesh(rub, rm[i % 3]); o.scale.setScalar(s); o.rotation.set(hash(i, 1) * 3, hash(i, 2) * 6, hash(i, 3) * 3); add(o, x, .02 + s * .3, z); });
    // the broken-off pieces of the far right corner, lying in the earth beside it
    const topM = mat('topstone', () => null), frag = (k, pts, th) => G(k, () => { const sh = new TT.Shape(); pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath();
      const e = new TT.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 2, curveSegments: 4 }); e.rotateX(-Math.PI / 2);
      const P = e.attributes.position, UV = e.attributes.uv, C = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { UV.setXY(i, (P.getX(i) + P.getZ(i)) / 3.4 + .3, P.getY(i) / 3.4 + .5); const yy = P.getY(i) / th; C[i * 3] = C[i * 3 + 1] = C[i * 3 + 2] = .55 + .45 * Math.max(0, Math.min(1, yy)); }
      e.setAttribute('color', new TT.BufferAttribute(C, 3)); e.computeVertexNormals(); return e; });
    const fm = mat('fragM', () => phys({ map: sideTex('stone'), color: '#f2e8d4', vertexColors: true, roughness: .95 }));
    void topM;
    const f1 = mesh(frag('ltFrag1', [[0, 0], [.3, .04], [.36, .28], [.13, .42], [-.04, .22]], .26), fm); f1.rotation.set(.12, .7, -.08); add(f1, W / 2 + .12, .02, -H / 2 + .55);
    const f2 = mesh(frag('ltFrag2', [[0, 0], [.26, -.04], [.3, .2], [.08, .28]], .22), fm); f2.rotation.set(-.2, 2.1, .15); add(f2, W / 2 - .45, .02, -H / 2 - .08);
    // a potsherd (the curved wall of a red jar) near the far left
    const sherd = G('ltSherd', () => { const q = new TT.CylinderGeometry(.55, .5, .32, 12, 1, true, 0, .9); return q; });
    const sm = M('sherd', { color: '#b0583a', roughness: .85, side: TT.DoubleSide });
    const s1 = mesh(sherd, sm); s1.rotation.set(Math.PI / 2 - .1, .3, .2); add(s1, -W / 2 - .18, .04, -H / 2 + 1.6); s1.scale.setScalar(.55);
    // a trowel resting at the near right
    const tr = new TT.Group();
    const blade = mesh(G('ltBlade', () => { const sh = new TT.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(.2, .08, .22, .34); sh.lineTo(0, .62); sh.lineTo(-.22, .34); sh.quadraticCurveTo(-.2, .08, 0, 0);
      const e = new TT.ExtrudeGeometry(sh, { depth: .008, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 1, curveSegments: 8 }); e.rotateX(-Math.PI / 2); return e; }), M('steel', { color: '#9a9ea2', metalness: 1, roughness: .42, envMapIntensity: 1.1 }));
    tr.add(blade);
    const tang = mesh(G('ltTang', () => new TT.CylinderGeometry(.012, .012, .2, 6)), M('steel', {}), 0, .06, .08); tang.rotation.x = Math.PI / 2 - .5; tr.add(tang);
    const hd = mesh(G('ltHandle', () => new TT.CylinderGeometry(.04, .034, .42, 12)), M('trHandle', { color: '#8a5530', roughness: .6, clearcoat: .2 }), 0, .14, .36); hd.rotation.x = Math.PI / 2 - .12; tr.add(hd);
    tr.rotation.y = Math.PI / 2 + .12; tr.scale.setScalar(.8); add(tr, W / 2 + .2, .05, H / 2 - 1.2);
  }

  /* ---------- the counters ---------- */
  const boneTex = () => ctex('bone', 256, 256, (g, w, h) => {
    const id = g.createImageData(w, h), d = id.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const n = fbm(x * .04, y * .3) * .6 + fbm(x * .3, y * .03) * .4, i = (y * w + x) * 4; d[i] = 236 - n * 40; d[i + 1] = 224 - n * 44; d[i + 2] = 196 - n * 50; d[i + 3] = 255; }
    g.putImageData(id, 0, 0);
  }, true);
  // turned wood: growth rings across the piece (u round, v up)
  const woodTex = (k, base, dark) => ctex('wood' + k, 256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) { const t = fbm(y * .05, 3.1) * 4 + y * .09, a = .1 + .2 * Math.pow(.5 + .5 * Math.sin(t * 6.283), 6); g.fillStyle = dark; g.globalAlpha = a; g.fillRect(0, y, w, 1); }
    g.globalAlpha = 1;
  }, true);
  // stone for the figures, old and weathered (2026-11-19 user: もう少し古い感じに): marble yellowed with grime in patches and in the
  // hollows, basalt dulled with paler worn patches; both pitted (the same picture as a bump map)
  const stoneTex = k => ctex('st' + k, 256, 256, (g, w, h) => {
    const id = g.createImageData(w, h), d = id.data, white = k === 'w', green = k === 'g';
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = x / w * Math.PI * 2, v = y / h * 4, i = (y * w + x) * 4, cx = Math.cos(a) * 1.3, sx = Math.sin(a) * 1.3;
      const n = fbm(cx * 3 + v, sx * 3 + v), grime = Math.max(0, fbm(cx + v * .7 + 5, sx - v * .5) - .45) * 1.8, pit = fbm(cx * 12 + v * 9, sx * 12 - v * 7) < .27 ? 1 : 0;
      let r, gg, b;
      if (white) { const vein = Math.exp(-Math.abs(Math.sin((cx + v * .6 + fbm(cx, v) * 3) * 2.2)) * 16); r = 222 - n * 18 - vein * 40; gg = r - 6; b = r - 18; r -= grime * 60; gg -= grime * 66; b -= grime * 70; }
      else if (green) { const vein = Math.exp(-Math.abs(Math.sin((cx * 1.3 - v * .8 + fbm(sx * 2, v * 2) * 4) * 2.6)) * 30) * .6; r = 30 + n * 22 + vein * 70; gg = 42 + n * 26 + vein * 84; b = 36 + n * 22 + vein * 72; r += grime * 26; gg += grime * 24; b += grime * 18; }
      else { r = gg = b = 48 + n * 20 + (hash(x, y) > .985 ? 36 : 0); r += grime * 34; gg += grime * 30; b += grime * 24; }
      if (pit) { r *= .62; gg *= .62; b *= .62; }
      d[i] = Math.max(0, r); d[i + 1] = Math.max(0, gg); d[i + 2] = Math.max(0, b); d[i + 3] = 255;
    }
    g.putImageData(id, 0, 0);
  }, true);
  const oldStone = (k, col) => M('old' + k + col, { map: stoneTex(k), bumpMap: stoneTex(k), bumpScale: 1.6, color: '#ffffff', roughness: k === 'w' ? .62 : .72, metalness: 0, envMapIntensity: .7 });
  // a 2D counter picture (latrunculi/img/2d/pc-*.webp) as a texture, for a face of a disc
  const picTex = k => mat('pic' + k, () => { const t = srgb(new (T().CanvasTexture)((() => { const c = document.createElement('canvas'); c.width = c.height = 2; return c; })())); t.anisotropy = 8;
    loadImg(k).then(im => { if (!im) return; t.image = im; t.needsUpdate = true; if (X.kick) X.kick(200); }); return t; });
  // a round face (y up, or facing down when down) with a picture whose disc fills `fill` of the picture
  const faceGeo = (k, r, fill, down) => G(k, () => { const q = new (T().CircleGeometry)(r, seg(48)), P = q.attributes.position, UV = q.attributes.uv;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) / r, y = P.getY(i) / r; UV.setXY(i, .5 + (down ? -x : x) * fill / 2, .5 + (down ? -y : y) * fill / 2); }
    q.rotateX(down ? Math.PI / 2 : -Math.PI / 2); if (down) { /* seen from below after the turn: reads the right way round */ } return q; });

  // helm: a Roman helmet (galea) carved in marble / basalt on a round plinth — faces the near side (+z)
  function helm(g, col) {
    const TT = T(), white = col === 2;
    const m = oldStone(white ? 'w' : 'b', ''), m2 = M('helm2s' + col, { map: stoneTex(white ? 'w' : 'b'), bumpMap: stoneTex(white ? 'w' : 'b'), bumpScale: 1.6, color: '#ffffff', roughness: .7, side: TT.DoubleSide });
    g.add(mesh(G('hmPlinth', () => new TT.LatheGeometry([V2(0, 0), V2(.31, 0), V2(.3, .055), V2(.255, .075), V2(.27, .095), V2(.15, .125), V2(.12, .2), V2(0, .2)], LO() ? 14 : 22)), m));
    const hd = new TT.Group(); hd.position.y = .3; hd.rotation.y = col === 1 ? 1.15 : -1.15; g.add(hd);   // (turned three-quarters, the crest's fan shows — the two sides face each other)
    // the bowl, deep, a little longer front to back
    const bowl = mesh(G('hmBowl2', () => new TT.SphereGeometry(.2, seg(30), 8, 0, Math.PI * 2, 0, Math.PI * .62)), m); bowl.scale.set(1, 1.05, 1.1); hd.add(bowl);
    // the brow ridge in front, the wide neck guard behind
    const brow = mesh(G('hmBrow2', () => { const q = new TT.TorusGeometry(.2, .022, 4, 12, Math.PI * .9); q.rotateX(Math.PI / 2); q.rotateY(Math.PI * .05); return q; }), m, 0, -.07, 0); brow.scale.set(1.02, 1, 1.12); hd.add(brow);
    const guard = mesh(G('hmGuard2', () => new TT.CylinderGeometry(.205, .31, .08, seg(28), 1, true, Math.PI * .58, Math.PI * .84)), m2, 0, -.1, -.01); guard.scale.z = 1.1; hd.add(guard);
    // cheek guards
    for (const sx of [-1, 1]) {
      const ck = mesh(G('hmCheek2', () => new TT.CylinderGeometry(.21, .18, .17, 8, 1, true, 0, .62)), m2, 0, -.15, 0);
      ck.rotation.y = sx > 0 ? .22 : -.22 - .62; ck.scale.z = 1.1; hd.add(ck);
    }
    // the crest: a fan of horsehair front to back on a little holder, its strands cut in
        const crestG = G('hmCrest2', () => {
      const sh = new TT.Shape(), r0 = .31, r1 = .17; sh.moveTo(-r0, -.02); sh.absarc(0, 0, r0, Math.PI + .06, -.06, true); sh.lineTo(r1, -.02); sh.absarc(0, 0, r1, -.06, Math.PI + .06, false); sh.closePath();
      const e = new TT.ExtrudeGeometry(sh, { depth: .05, bevelEnabled: true, bevelThickness: .015, bevelSize: .012, bevelSegments: 1, curveSegments: 8 }); e.translate(0, 0, -.025); e.rotateY(Math.PI / 2);
      const P = e.attributes.position, UV = e.attributes.uv; for (let i = 0; i < P.count; i++) { const a = Math.atan2(P.getY(i), P.getZ(i)); UV.setXY(i, a / Math.PI, Math.hypot(P.getY(i), P.getZ(i)) * 3); } e.computeVertexNormals(); return e; });
    const strands = ctex('strand' + col, 256, 32, (q, w, h) => { q.fillStyle = white ? '#d8ccb4' : '#3a3836'; q.fillRect(0, 0, w, h); q.strokeStyle = white ? 'rgba(120,112,100,.5)' : 'rgba(10,10,10,.7)'; q.lineWidth = 2; for (let x = 4; x < w; x += 9) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, h); q.stroke(); } }, true);
    const crest = mesh(crestG, M('crest' + col, { map: strands, color: white ? '#e6dcc8' : '#ffffff', roughness: .8 }), 0, 0, -.01); crest.scale.set(1, .82, 1.0); hd.add(crest);
    g.userData.h = .56; g.userData.lie = .31;
  }
  // wood: a turned pawn with burnt rings
  function wood(g, col) {
    const TT = T(), dark = col === 1;
    const wm = M('pawn' + col, { map: dark ? woodTex('wn', '#6a4226', '#2c180a') : woodTex('bx', '#e6cfa2', '#b38a58'), color: '#ffffff', roughness: .48, clearcoat: .35, clearcoatRoughness: .45 });
    g.add(mesh(G('pwBody', () => new TT.LatheGeometry([V2(0, 0), V2(.3, 0), V2(.3, .03), V2(.25, .07), V2(.25, .095), V2(.15, .16), V2(.1, .34), V2(.16, .365), V2(.09, .405), V2(0, .42)], LO() ? 14 : 22)), wm));
    g.add(mesh(G('pwHead', () => new TT.SphereGeometry(.125, 16, 10)), wm, 0, .52, 0));
    const burnt = M('burnt', { color: '#1c0f06', roughness: .9 });
    g.add(mesh(G('pwRing1', () => { const q = new TT.TorusGeometry(.252, .01, 4, seg(32)); q.rotateX(Math.PI / 2); return q; }), burnt, 0, .08, 0));
    g.add(mesh(G('pwRing2', () => { const q = new TT.TorusGeometry(.164, .009, 4, seg(28)); q.rotateX(Math.PI / 2); return q; }), burnt, 0, .372, 0));
    g.userData.h = .645; g.userData.lie = .3;
  }
  // abstract: a six-petal flower on a stem (the 2D counters' flower, standing up)
  function abstract(g, col) {
    const TT = T(), dark = col === 1;
    const body = M('abs' + col, { color: dark ? '#2e2c2c' : '#ece6dc', roughness: .62, clearcoat: .15, clearcoatRoughness: .5 });
    const petal = M('absP' + col, { color: dark ? '#55524f' : '#bdb6aa', roughness: .55, clearcoat: .2, clearcoatRoughness: .4 });
    g.add(mesh(G('abBaseG', () => new TT.LatheGeometry([V2(0, 0), V2(.27, 0), V2(.28, .015), V2(.28, .05), V2(.25, .07), V2(.17, .09), V2(.1, .12), V2(.06, .17), V2(0, .175)], LO() ? 14 : 22)), body));
    g.add(mesh(G('abStem', () => { const q = new TT.CylinderGeometry(.04, .055, .2, seg(16)); q.translate(0, .1 + .16, 0); return q; }), body));
    const fl = new TT.Group(); fl.position.y = .38; g.add(fl);
    fl.add(mesh(G('abCup', () => new TT.LatheGeometry([V2(.04, -.04), V2(.08, -.015), V2(.09, 0), V2(0, .005)], seg(20))), body));
    const pg = G('abPetal', () => { const q = new TT.SphereGeometry(1, 8, 4); q.scale(.075, .028, .15); q.translate(0, 0, .14); return q; });
    for (let k = 0; k < 6; k++) { const p = mesh(pg, petal); p.rotation.set(0, k * Math.PI / 3, 0); const t = new TT.Group(); t.rotation.y = k * Math.PI / 3; p.rotation.set(-.18, 0, 0); t.add(p); fl.add(t); }
    fl.add(mesh(G('abHeart', () => new TT.SphereGeometry(.05, 10, 6)), body, 0, .025, 0));
    g.userData.h = .46; g.userData.lie = .29;
  }
  // coin: one thick coin struck as a proof (2026-11-19 user: 1枚で、プルーフ貨幣並みに — 金貨と銀貨): a mirror field, the design
  // frosted (a roughness map from the picture: where it has relief, matt), a mirror rim; SPQR on top, S·C underneath (the 2D pictures)
  const proofR = k => mat('proofR' + k, () => { const c = document.createElement('canvas'); c.width = c.height = 2; const t = new (T().CanvasTexture)(c);
    loadImg(k).then(im => { if (!im) return; const S = 320, a = document.createElement('canvas'); a.width = a.height = S; const g = a.getContext('2d'); g.drawImage(im, 0, 0, S, S);
      const o = g.getImageData(0, 0, S, S).data, b2 = document.createElement('canvas'); b2.width = b2.height = S; const h = b2.getContext('2d'); h.filter = 'blur(3px)'; h.drawImage(im, 0, 0, S, S);
      const bl = h.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), d = out.data;
      for (let i = 0; i < S * S; i++) { const l = (o[i * 4] + o[i * 4 + 1] + o[i * 4 + 2]) / 3, lb = (bl[i * 4] + bl[i * 4 + 1] + bl[i * 4 + 2]) / 3, rel = Math.min(1, Math.abs(l - lb) / 14);
        d[i * 4] = 0; d[i * 4 + 1] = Math.round((.05 + rel * .5) * 255); d[i * 4 + 2] = 255; d[i * 4 + 3] = 255; }
      g.putImageData(out, 0, 0); t.image = a; t.needsUpdate = true; if (X.kick) X.kick(200); });
    return t; });
  function coin(g, col) {
    const TT = T(), gold = col === 1, r = .3, th = .07;
    const metal = M('coin' + col, { color: gold ? '#ffd27a' : '#f2f4f7', metalness: 1, roughness: .04, envMapIntensity: 2.6 });
    const face = (k, img) => M('coinF' + k, { bumpMap: picTex(img), bumpScale: 1.6, roughnessMap: proofR(img), color: gold ? '#ffd27a' : '#f2f4f7', metalness: 1, roughness: 1, envMapIntensity: 2.6 });   // (no colour picture: the design shows as frosted relief on the mirror field)
    g.add(mesh(G('cnSide1', () => { const q = new TT.CylinderGeometry(r, r, th, seg(56), 1, true); q.translate(0, th / 2, 0); return q; }), metal));
    for (const y of [0, th]) g.add(mesh(G('cnRim1', () => { const q = new TT.TorusGeometry(r - .007, .008, 3, seg(48)); q.rotateX(Math.PI / 2); return q; }), metal, 0, y, 0));
    g.add(mesh(faceGeo('cnTop', r, .9, false), face(col + 't', 'pc-coin-' + (gold ? 'b' : 'w')), 0, th + .0005, 0));
    g.add(mesh(faceGeo('cnBot', r, .9, true), face(col + 'b', 'pc-coin-' + (gold ? 'bx' : 'wx')), 0, -.0005, 0));
    g.userData.h = th; g.userData.lie = 0;
  }
  // 'glass' (in 3D, 2026-11-19 user: 石細工でこだわりのチェス駒的な像で): a little Ionic column carved in marble — a square plinth,
  // the torus–scotia base, a fluted shaft (the flutes in a normal map), the capital with its two scrolls and the abacus slab.
  // Black verde antico (dark green-black), White Carrara; both old and weathered like the helmets.
  const fluteN = () => mat('fluteN', () => { const w = 256, h = 8, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), id = g.createImageData(w, h), d = id.data, F = 16;
    for (let x = 0; x < w; x++) { const t = (x / w * F) % 1, sl = -Math.cos(t * Math.PI * 2) * Math.sign(t - .5) * .0 + (t < .08 || t > .92 ? 0 : -Math.cos((t - .08) / .84 * Math.PI) * .9), nx = sl, l = Math.hypot(nx, 1);
      for (let y = 0; y < h; y++) { const i = (y * w + x) * 4; d[i] = (nx / l * .5 + .5) * 255; d[i + 1] = 128; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255; } }
    g.putImageData(id, 0, 0); const t = new (T().CanvasTexture)(c); t.wrapS = t.wrapT = T().RepeatWrapping; return t; });
  const voluteTex = k => ctex('volute' + k, 128, 128, (g, w, h) => {
    g.fillStyle = k === 'w' ? '#d9cfba' : '#33463c'; g.fillRect(0, 0, w, h);
    g.strokeStyle = k === 'w' ? 'rgba(90,70,40,.75)' : 'rgba(8,14,10,.85)'; g.lineWidth = 5; g.beginPath();
    for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 5, r = 58 * (1 - i / 140); const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = g.strokeStyle; g.beginPath(); g.arc(w / 2, h / 2, 9, 0, 7); g.fill();
  });
  function glass(g, col) {
    const TT = T(), white = col === 2, k = white ? 'w' : 'g', m = oldStone(k, '');
    g.add(mesh(G('icPl', () => { const q = new TT.BoxGeometry(.42, .04, .42); q.translate(0, .02, 0); return q; }), m));
    g.add(mesh(G('icBase', () => new TT.LatheGeometry([V2(.18, .04), V2(.192, .052), V2(.182, .068), V2(.148, .075), V2(.138, .085), V2(.15, .094), V2(.138, .104), V2(.112, .11), V2(0, .11)], seg(36))), m));
    const sh = M('icShaft' + k, { map: stoneTex(k), normalMap: fluteN(), normalScale: new TT.Vector2(2.2, 2.2), color: '#ffffff', roughness: white ? .62 : .72, envMapIntensity: .7 });
    g.add(mesh(G('icShaft', () => { const q = new TT.CylinderGeometry(.092, .108, .34, seg(40), 1, true); q.translate(0, .11 + .17, 0); return q; }), sh));
    g.add(mesh(G('icNeck', () => new TT.LatheGeometry([V2(.092, .45), V2(.104, .457), V2(.098, .466), V2(.13, .484), V2(0, .485)], seg(36))), m));
    // the capital: the bolster across with a scroll at each end, the abacus on top
    const vg = G('icVol', () => { const q = new TT.CylinderGeometry(.046, .046, .22, seg(24)); q.rotateX(Math.PI / 2); return q; });
    const vm = M('icVolM' + k, { map: stoneTex(k), bumpMap: stoneTex(k), bumpScale: 1.6, color: '#ffffff', roughness: .7 }), face = M('icVolF' + k, { map: voluteTex(k), bumpMap: voluteTex(k), bumpScale: 2, color: '#ffffff', roughness: .7 });
    for (const sx of [-1, 1]) g.add(mesh(vg, [vm, face, face], sx * .11, .49, 0));
    g.add(mesh(G('icBol', () => new TT.BoxGeometry(.22, .06, .17)), m, 0, .5, 0));
    g.add(mesh(G('icAb', () => { const q = new TT.BoxGeometry(.27, .03, .25); q.translate(0, .545, 0); return q; }), m));
    g.children.forEach(o => { o.scale.multiplyScalar(1.18); o.position.multiplyScalar(1.18); });   // (2026-11-19 user: マスに対して小さめ → 一回り大きく)
    g.userData.h = .56 * 1.18; g.userData.lie = .21 * 1.18;
  }
  // bone: one turned disc (2026-11-19 user: 1枚でOK) — a bead round the edge, rings cut in the top; VI cut underneath (the 2D picture)
  function bone(g, col) {
    const TT = T(), dark = col === 1;
    const bm = M('boneC' + col, { map: boneTex(), bumpMap: boneTex(), bumpScale: .8, color: dark ? '#6e5640' : '#ffffff', roughness: .5, clearcoat: .15, clearcoatRoughness: .5 });
    g.add(mesh(G('bnBody1', () => new TT.LatheGeometry([V2(0, .002), V2(.27, .002), V2(.29, .02), V2(.295, .05), V2(.29, .075), V2(.27, .092),
      V2(.22, .098), V2(.2, .082), V2(.18, .1), V2(.12, .1), V2(.1, .084), V2(.08, .1), V2(0, .096)], seg(38))), bm));
    g.add(mesh(faceGeo('bnBot', .27, .9, true), M('boneU' + col, { map: picTex('pc-bone-' + (dark ? 'bx' : 'wx')), color: '#ffffff', roughness: .55 }), 0, 0, 0));
    g.userData.h = .1; g.userData.lie = 0;
  }
  const BUILD = { helm, wood, abstract, coin, glass, bone };
  // col 1 Black (the first player) / 2 White. The body sits in an inner group that turns (topples or turns over).
  function piece(col, set) {
    set = SETS.includes(set) ? set : setNow();
    const TT = T(), g = new TT.Group(), body = new TT.Group();
    body.userData = {}; BUILD[set](body, col);
    const h = body.userData.h, lie = body.userData.lie, flip = new TT.Group();
    if (lie) { flip.position.y = lie; body.position.y = -lie; }   // the tall figures topple about a point their radius up
    else { flip.position.y = h / 2; body.position.y = -h / 2; }   // the flat ones turn over about their middle
    flip.add(body); g.add(flip);
    g.userData = { col, h, set, flip, lie, inc: false };
    return g;
  }
  // a blocked counter: k 0 (standing / face up) … 1 (lying on its side / face down)
  function turn(g, k) {
    const U = g.userData, f = U && U.flip; if (!f) return;
    if (U.lie) { f.rotation.z = Math.PI / 2 * k; f.position.x = k * (U.h / 2 - U.lie); }   // (lying, it stays centred on its square)
    else f.rotation.z = Math.PI * k;
  }

  X.MODELS.latrunculi = function (live) {
    const g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a game in progress: White's counter on d5 is blocked (lying / turned over) between c5 and e5
    const B = ['c5', 'e5', 'd3', 'f4', 'c3', 'g5', 'b6', 'e7', 'f2'], Wt = ['d5', 'e4', 'f6', 'b4', 'g3', 'd7', 'c6', 'g7', 'e2'];
    const put = (nm, col, inc) => { const x = 'abcdefgh'.indexOf(nm[0]), y = 8 - +nm[1], p = U.piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); if (inc) turn(p, 1); g.add(p); const sh = X.contact(R * .9, .45); sh.position.set(px, Y + .001, pz); g.add(sh); };
    B.forEach(nm => put(nm, 1)); Wt.forEach(nm => put(nm, 2, nm === 'd5'));
    return g;
  };
  X.latrunculi = { board, piece, turn, W: () => W, H: () => H, R, LOOKS, SETS };
})();
