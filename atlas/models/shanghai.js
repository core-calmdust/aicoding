/* =====================================================================
   Shanghai (mahjong solitaire) on the 3D table — the tiles (2026-11-13, user: 角が丸く、重みと素材の質感がある高級な牌).
   · One tile mesh for every tile (an InstancedMesh: a whole layout is ONE draw call): a rounded block, ivory over a coloured
     back (two tones, a crisp line between them), the face only on the top. No bottom (a tile always lies on something).
     ~150 triangles a tile on PC (~100 on phones) — the 144-tile turtle ≈ 2.2万 (PC), well inside the board budget (8万).
   · The faces: one canvas atlas drawn once (the 34 tiles + flowers + seasons, engraved ink on ivory), each instance picks its
     cell with a per-instance offset (onBeforeCompile; the sides read a plain ivory texel). Per-instance colour = the tint
     (a blocked tile dimmed a little, the chosen one warm, gold-mission tiles gilded).
   · The mat: a thin leather tray under the layout (two rounded boxes).
   Registers: Table3D.MODELS.shanghai(live) · Table3D.shanghai = { TW, TD, TH, BACKS, back(), tiles(n) → InstancedMesh, mat(w, d),
     atlas() → texture, faceOff(f) → [u, v], ready() → Promise (the face font) }
   Faces f: 0–8 萬子 1–9 · 9–17 筒子 · 18–26 索子 · 27–30 東南西北 · 31–33 白發中 · 34–37 梅蘭菊竹 · 38–41 春夏秋冬.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const TW = 1.0, TD = 1.36, TH = .74, RE = .085, CR = .15;   // width (x), depth (z), height; the top edge's round; the corners' round
  const SPLIT = .42;   // the ivory / back line (part of the height from the bottom)
  const BACKS = ['jade', 'lapis', 'ebony', 'coral'];
  const BACK_COL = { jade: '#2b8a62', lapis: '#2c56a8', ebony: '#3a2a20', coral: '#d8763c' };   // (lighter than the stone itself: the side band sits in the shade)
  const IVORY = '#f7f7f3';   // (2026-11-13: a clean milky white, as modern tiles — the yellowed ivory read old-fashioned)
  const GROUND = '#fafaf6';   // the face itself (flat: the carving's depth is read from how far a pixel is from it)
  const pref = () => { try { return (JSON.parse(localStorage.getItem('aicoding-shanghai') || '{}') || {}).settings || {}; } catch (e) { return {}; } };
  const backNow = () => { const v = pref().back; return BACKS.includes(v) ? v : 'jade'; };

  /* ---------- the tile geometry: rings of a rounded rectangle, top cap fanned from the middle ---------- */
  const geos = {};
  function tileGeo() {
    const key = LO() ? 'l' : 'h'; if (geos[key]) return geos[key];
    const TT = T(), cs = LO() ? 2 : 3, arc = LO() ? [0, 45, 90] : [0, 30, 60, 90];
    // the outline (a rounded rectangle) at an inset d: points + outward normals (corner arcs only; the straight sides join them)
    const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]], A0 = [0, 90, 180, 270];
    const outline = d => { const P = []; corners.forEach(([sx, sz], k) => { const r = Math.max(.02, CR - d), cx = sx * (TW / 2 - CR), cz = sz * (TD / 2 - CR);
      for (let i = 0; i <= cs; i++) { const a = (A0[k] + 90 * i / cs) * Math.PI / 180, nx = Math.cos(a), nz = Math.sin(a); P.push([cx + nx * r, cz + nz * r, nx, nz]); } }); return P; };
    const N = 4 * (cs + 1);
    // the rings from the top: [inset, y, up-ness of the normal (0 side … 1 up), colour 0 ivory / 1 back]
    const rings = [];
    arc.forEach(t => { const th = t * Math.PI / 180; rings.push([RE - RE * Math.sin(th), TH - RE + RE * Math.cos(th), Math.cos(th), 0]); });
    const ys = TH * SPLIT, RB = .045;
    rings.push([0, ys, 0, 0]); rings.push([0, ys, 0, 1, 'cut']);   // (the same height twice: a crisp ivory / back line)
    rings.push([0, RB, 0, 1]); rings.push([RB, 0, -.7, 1]);
    const pos = [], nor = [], col = [], uv = [], face = [], idx = [];
    const cI = new TT.Color(IVORY).convertSRGBToLinear(), cB = new TT.Color('#ffffff');   // the back's colour comes from a uniform (one geometry for every back)
    const vtx = (x, y, z, nx, ny, nz, c, u, v, f) => { pos.push(x, y, z); nor.push(nx, ny, nz); col.push(c.r, c.g, c.b); uv.push(u, v); face.push(f); return pos.length / 3 - 1; };
    // top cap: the flat top inside the round edge, fanned from its middle; the face picture spans it
    const capW = TW - 2 * RE, capD = TD - 2 * RE, O0 = outline(RE);
    const cU = (x, z) => [x / capW + .5, .5 - z / capD];
    const mid = vtx(0, TH, 0, 0, 1, 0, cB, .5, .5, 1), cap = O0.map(([x, z]) => { const [u, v] = cU(x, z); return vtx(x, TH, z, 0, 1, 0, cB, u, v, 1); });
    for (let i = 0; i < N; i++) idx.push(mid, cap[(i + 1) % N], cap[i]);
    // the rings (the sides read the ivory texel: uv 0,0 is unused — the shader swaps in the white cell)
    const R = rings.map(([d, y, up, c, cut]) => { const O = outline(d), s = Math.sqrt(Math.max(0, 1 - up * up)) * (up < 0 ? 1 : 1);
      return O.map(([x, z, nx, nz]) => { const l = Math.hypot(nx * s, up, nz * s) || 1; return vtx(x, y, z, nx * s / l, up / l, nz * s / l, c ? cB : cI, 0, 0, c ? -1 : 0); }); });
    for (let r = 0; r < R.length - 1; r++) {
      if (rings[r + 1][4] === 'cut') continue;   // (no strip across the colour line)
      for (let i = 0; i < N; i++) { const a = R[r][i], b = R[r][(i + 1) % N], c = R[r + 1][i], d = R[r + 1][(i + 1) % N]; idx.push(a, b, c, b, d, c); }
    }
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new TT.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(uv, 2));
    g.setAttribute('aCap', new TT.Float32BufferAttribute(face, 1)); g.setIndex(idx);
    g.computeBoundingSphere(); g.computeBoundingBox();
    if (X.share) X.share(g);
    return (geos[key] = g);
  }

  /* ---------- the face atlas ---------- */
  const COLS = 8, ROWS = 6;   // 48 cells: 42 faces, the ivory cell (47)
  let atlasTex = null, cellW = 0, cellH = 0, fontP = null;
  // the brush hand of real tiles: Yuji Syuku (Google Fonts, a subset with only the glyphs on the tiles)
  const FONT = '"Yuji Syuku","Noto Serif JP","Noto Serif CJK JP","Hiragino Mincho ProN","Yu Mincho",serif';
  function ready() {   // the face font, at most ~1.6 s
    if (fontP) return fontP;
    const GL = '一二三四五六七八九萬東南西北中發白梅蘭菊竹春夏秋冬1234';
    fontP = new Promise(res => {
      try {
        if (!document.getElementById('shFont')) { const l = document.createElement('link'); l.id = 'shFont'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Yuji+Syuku&display=block&text=' + encodeURIComponent(GL); document.head.appendChild(l); }
        const to = setTimeout(res, 1600);
        const go = () => document.fonts.load('64px "Yuji Syuku"', GL).then(() => { clearTimeout(to); res(); }, () => { clearTimeout(to); res(); });
        setTimeout(go, 60);
      } catch (e) { res(); }
    }).then(() => glyphP());
    return fontP;
  }
  // the hand of the characters (萬子・風牌・發・中・花／季節): traced from photos of real Japanese tiles into one sheet
  // (atlas/tools/shanghai-glyphs.py → atlas/img/shanghai-glyphs.png): 8×3 cells of GW×GH, ink per channel (R black, G red, B green)
  const GW = 280, GH = 390, GLYPH_URL = new URL('../img/shanghai-glyphs.png?v=2', (document.currentScript && document.currentScript.src) || location.href).href;
  let glyphImg = null, glyphPr = null; const glyphCv = {};
  function glyphP() {
    const one = (url, set) => new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { set(im); res(); }; im.onerror = () => res(); im.src = url; setTimeout(res, 4000); });
    return glyphPr || (glyphPr = Promise.all([one(GLYPH_URL, im => { glyphImg = im; }), one(ART_URL, im => { artImg = im; })]));
  }
  // 筒子・索子・花／季節: the pictures traced in colour from the same photos (atlas/tools/shanghai-glyphs.py art →
  // atlas/img/shanghai-art.png, 8×4 RGBA cells: 0–8 筒子, 9–17 索子 (9 = 一索の鳥), 18–21 梅蘭菊竹, 22–25 春夏秋冬), 2026-11-14
  const ART_URL = new URL('../img/shanghai-art.png?v=9', (document.currentScript && document.currentScript.src) || location.href).href;
  let artImg = null;
  const artCell = f => f >= 9 && f < 27 ? f - 9 : f >= 34 && f < 42 ? 18 + (f - 34) : -1;
  function art(c, f) { const k = artCell(f); if (!artImg || k < 0) return false; c.drawImage(artImg, (k % 8) * GW, Math.floor(k / 8) * GH, GW, GH, 0, 0, 256, 362); return true; }
  // one glyph (cell k, channel ch) as a canvas in the colour given (the ink's density = its alpha); cached
  function glyphCanvas(k, ch, color) {
    const key = k + ':' + ch + ':' + color; if (glyphCv[key]) return glyphCv[key];
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH; const c = cv.getContext('2d');
    c.drawImage(glyphImg, (k % 8) * GW, Math.floor(k / 8) * GH, GW, GH, 0, 0, GW, GH);
    const im = c.getImageData(0, 0, GW, GH), d = im.data, rgb = [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
    for (let p = 0; p < d.length; p += 4) { const a = d[p + ch]; d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = a; }
    c.putImageData(im, 0, 0);
    return (glyphCv[key] = cv);
  }
  // draw it on the 256 × 362 face (default: the whole face, as it sits on the real tile); false when the sheet is not there
  function glyph(c, k, ch, color, x = 0, y = 0, w = 256, h = 362) { if (!glyphImg) return false; c.drawImage(glyphCanvas(k, ch, color), x, y, w, h); return true; }
  const INK = '#141414', RED = '#d0122a', GRN = '#127040', BLU = '#1c3c86';   // the paint in the carving (red clearer, 2026-11-13)   // the paint in the carving
  let normalTex = null;
  function drawAtlas() {
    const TT = T(), W0 = LO() ? 160 : 256, H0 = Math.round(W0 * (TD - 2 * RE) / (TW - 2 * RE));
    cellW = W0; cellH = H0;
    const cv = document.createElement('canvas'); cv.width = W0 * COLS; cv.height = H0 * ROWS;
    const c = cv.getContext('2d');
    c.fillStyle = GROUND; c.fillRect(0, 0, cv.width, cv.height);
    for (let f = 0; f < 42; f++) { const x = (f % COLS) * W0, y = Math.floor(f / COLS) * H0; c.save(); c.beginPath(); c.rect(x, y, W0, H0); c.clip(); c.translate(x, y); c.scale(W0 / 256, H0 / 362); drawFace(c, f); c.restore(); }
    const D = depthOf(cv); bakeLight(cv, D); normalFrom(cv, D);
    const t = new TT.CanvasTexture(cv);
    if ('colorSpace' in t && TT.SRGBColorSpace) t.colorSpace = TT.SRGBColorSpace; else if (TT.sRGBEncoding) t.encoding = TT.sRGBEncoding;
    t.anisotropy = LO() ? 2 : 8; t.generateMipmaps = true; t.minFilter = TT.LinearMipmapLinearFilter; t.needsUpdate = true;
    return t;
  }
  // the carving (2026-11-14, Fable — the same cut as mahjong/tiles.js depthOf): a real tile is cut with a round bit and the paint
  // lies in the cut, so the groove is a shallow U — its walls fall from the white face into the paint, the floor is flat, and a
  // hairline (narrower than the bit) stays shallower. The paint's coverage (how far a pixel is from the white ground) is blurred
  // by about the bit's radius; the wall starts just outside the stroke's edge and reaches the floor ~3 px inside it. Its slopes
  // are written as a tangent-space normal map — the light then catches the walls as on an engraved tile (the paint keeps its own
  // colour: no ink line, ユーザー 2026-11-14). One pass over the atlas when it is drawn (no per-frame cost).
  function depthOf(cv) {
    const W = cv.width, H = cv.height, src = cv.getContext('2d').getImageData(0, 0, W, H);
    const d8 = src.data, g0 = [1, 3, 5].map(k => parseInt(GROUND.slice(k, k + 2), 16)), h = new Float32Array(W * H), tmp = new Float32Array(W * H);
    for (let i = 0, p = 0; i < W * H; i++, p += 4) { const d = Math.max(Math.abs(d8[p] - g0[0]), Math.abs(d8[p + 1] - g0[1]), Math.abs(d8[p + 2] - g0[2])); h[i] = d < 10 ? 0 : Math.min(1, (d - 10) / 60); }
    const box = (a, b, dx, dy) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let s = a[i], n = 1; if (x - dx >= 0 && y - dy >= 0) { s += a[i - dy * W - dx]; n++; } if (x + dx < W && y + dy < H) { s += a[i + dy * W + dx]; n++; } b[i] = s / n; } };
    for (let k = 0; k < (LO() ? 2 : 3); k++) { box(h, tmp, 1, 0); box(tmp, h, 0, 1); }
    for (let i = 0; i < W * H; i++) { const v = Math.min(1, Math.max(0, (h[i] - .4) / .52)); h[i] = v * v * (3 - 2 * v); }
    return { W, H, h, src };
  }
  // the cut under the table's light, painted into the atlas itself (the tiles all lie the same way up and the key light comes
  // from the top left, so it can be baked): the wall nearest the light shades the floor under it, the far wall catches a glint.
  // The normal map alone reads too faintly under the soft room light; with this the carving shows at any size.
  function bakeLight(cv, D) {
    const { W, H, h, src } = D, o = src.data, S = LO() ? 3 : 3.6;
    const lx = -.42, ly = -.58, lz = .7, hx = lx, hy = ly, hz = lz + 1, hk = 1 / Math.hypot(hx, hy, hz), flat = Math.pow(hz * hk, 60), R = LO() ? 3 : 4.5;
    const at = (x, y) => h[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!h[i] && !at(x + 1, y) && !at(x - 1, y) && !at(x, y + 1) && !at(x, y - 1)) continue;
      const p = i * 4, gx = (at(x + 1, y) - at(x - 1, y)) * S, gy = (at(x, y + 1) - at(x, y - 1)) * S, k = 1 / Math.hypot(gx, gy, 1), nx = gx * k, ny = gy * k, nz = k;
      let dif = (nx * lx + ny * ly + nz * lz) / lz;
      dif = dif < 1 ? 1 - (1 - Math.max(.2, dif)) * .5 : 1 + Math.min(.5, dif - 1) * .5;
      const sh = Math.max(0, h[i] - at(Math.round(x + lx * R), Math.round(y + ly * R))) * .2;
      const dark = 1 + (1 - (o[p] * .3 + o[p + 1] * .5 + o[p + 2] * .2) / 255) * 1.1;
      const sp = (Math.max(0, Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) * hk), 60) - flat) * 150 + (dif > 1 ? (dif - 1) * 90 : 0)) * dark, f = dif * (1 - sh);
      o[p] = Math.min(255, o[p] * f + sp); o[p + 1] = Math.min(255, o[p + 1] * f + sp); o[p + 2] = Math.min(255, o[p + 2] * f + sp);
    }
    cv.getContext('2d').putImageData(src, 0, 0);
  }
  function normalFrom(cv, D) {
    const TT = T(), { W, H, h } = D;
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const oc = out.getContext('2d'), im = oc.createImageData(W, H), o = im.data, S = (LO() ? 3 : 3.6);   // (how steep the walls read)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = h[x > 0 ? i - 1 : i], r = h[x < W - 1 ? i + 1 : i], u = h[y > 0 ? i - W : i], d = h[y < H - 1 ? i + W : i];
      // the surface height is −h (cut down): its slope along u (x) and v (up = −y on the canvas)
      let nx = (r - l) * S, ny = (u - d) * S, nz = 1; const k = 1 / Math.hypot(nx, ny, nz); nx *= k; ny *= k; nz *= k;
      const p = i * 4; o[p] = (nx * .5 + .5) * 255; o[p + 1] = (ny * .5 + .5) * 255; o[p + 2] = (nz * .5 + .5) * 255; o[p + 3] = 255;
    }
    oc.putImageData(im, 0, 0);
    const t = normalTex || (normalTex = new TT.CanvasTexture(out));
    t.image = out; t.generateMipmaps = true; t.minFilter = TT.LinearMipmapLinearFilter; t.anisotropy = LO() ? 2 : 8; t.needsUpdate = true;
    return t;
  }
  function atlas() { return atlasTex || (atlasTex = drawAtlas()); }
  // the offset of face f's cell in uv (v from the bottom: the canvas row 0 is at the top)
  const faceOff = f => [(f % COLS) / COLS, 1 - (Math.floor(f / COLS) + 1) / ROWS];
  const cellSize = () => [1 / COLS, 1 / ROWS];

  /* the faces, drawn on a 256 × 362 design box: an ivory ground with a soft rim, ink inlaid (a shade below and right, a glint above) */
  function ground(c) { c.fillStyle = GROUND; c.fillRect(0, 0, 256, 362); }   // flat white (the 3D light gives the shading)
  function inlay(c, paint) { c.save(); paint(null); c.restore(); }   // the paint in the cut (its depth: normalFrom)
  function kanji(c, ch, x, y, size, color, weight) {
    inlay(c, col => { c.fillStyle = col || color; c.font = `${weight || 400} ${size}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, x, y); });
  }
  function pin(c, x, y, r, color) {   // a 筒子 circle: a coloured ring, an ivory gap, a patterned middle
    inlay(c, col => {
      const k = col || color;
      c.fillStyle = k; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      if (col) return;
      c.fillStyle = GROUND; c.beginPath(); c.arc(x, y, r * .8, 0, 7); c.fill();
      c.strokeStyle = k; c.lineWidth = r * .13; c.beginPath(); c.arc(x, y, r * .58, 0, 7); c.stroke();
      if (r > 40) for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.fillStyle = i % 2 ? RED : k; c.beginPath(); c.arc(x + Math.cos(a) * r * .38, y + Math.sin(a) * r * .38, r * .07, 0, 7); c.fill(); }
      c.fillStyle = k === RED ? GRN : RED; c.beginPath(); c.arc(x, y, r * .22, 0, 7); c.fill();
      c.fillStyle = GROUND; c.beginPath(); c.arc(x, y, r * .08, 0, 7); c.fill();
    });
  }
  function stick(c, x, y, h, color, rot) {   // a 索子 bamboo stick: a rounded rod with three joints
    const w = 30;
    inlay(c, col => {
      c.save(); c.translate(x, y); if (rot) c.rotate(rot);
      const k = col || color; c.fillStyle = k; rr(c, -w / 2, -h / 2, w, h, w / 2); c.fill();
      if (!col) {
        c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, -w / 2 + 6, -h / 2 + 6, 7, h - 12, 3.5); c.fill();
        c.fillStyle = GROUND; [-.5, 0, .5].forEach(t => { const yy = t * (h - 14); c.fillRect(-w / 2, yy - 2.2, w, 4.4); c.fillStyle = k; c.fillRect(-w / 2 + 3, yy - 6, w - 6, 3); c.fillRect(-w / 2 + 3, yy + 3, w - 6, 3); c.fillStyle = GROUND; });
      }
      c.restore();
    });
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function bird(c) {   // 一索: a peacock on a bamboo twig
    inlay(c, col => {
      const k = v => col || v;
      // the tail: a fan of feathers with eyes
      for (let i = -3; i <= 3; i++) { const a = Math.PI / 2 + i * .26; c.save(); c.translate(128, 250); c.rotate(a - Math.PI / 2);
        c.fillStyle = k(i % 2 ? GRN : BLU); c.beginPath(); c.ellipse(0, 62, 15, 50, 0, 0, 7); c.fill();
        if (!col) { c.fillStyle = GROUND; c.beginPath(); c.arc(0, 92, 9, 0, 7); c.fill(); c.fillStyle = RED; c.beginPath(); c.arc(0, 92, 5, 0, 7); c.fill(); }
        c.restore(); }
      // the body and the neck
      c.fillStyle = k(GRN); c.beginPath(); c.ellipse(128, 196, 40, 58, -.15, 0, 7); c.fill();
      c.fillStyle = k(BLU); c.beginPath(); c.moveTo(118, 160); c.quadraticCurveTo(100, 110, 122, 82); c.lineTo(144, 88); c.quadraticCurveTo(128, 120, 146, 162); c.closePath(); c.fill();
      c.fillStyle = k(BLU); c.beginPath(); c.arc(134, 82, 18, 0, 7); c.fill();
      c.fillStyle = k(RED); c.beginPath(); c.moveTo(148, 80); c.lineTo(172, 86); c.lineTo(148, 92); c.closePath(); c.fill();   // the beak
      c.strokeStyle = k(RED); c.lineWidth = 4; [-1, 0, 1].forEach(i => { c.beginPath(); c.moveTo(132, 66); c.lineTo(126 + i * 12, 44); c.stroke(); c.fillStyle = k(RED); c.beginPath(); c.arc(126 + i * 12, 42, 5, 0, 7); c.fill(); });
      if (!col) { c.fillStyle = GROUND; c.beginPath(); c.arc(138, 78, 5, 0, 7); c.fill(); c.fillStyle = INK; c.beginPath(); c.arc(139, 78, 2.6, 0, 7); c.fill(); }
      // the wing
      c.fillStyle = k(RED); c.beginPath(); c.ellipse(118, 200, 20, 36, .3, 0, 7); c.fill();
      // the twig and the feet
      c.strokeStyle = k('#7a4a1a'); c.lineWidth = 7; c.beginPath(); c.moveTo(60, 312); c.lineTo(200, 300); c.stroke();
      c.strokeStyle = k(INK); c.lineWidth = 4; c.beginPath(); c.moveTo(120, 250); c.lineTo(116, 304); c.moveTo(138, 250); c.lineTo(140, 302); c.stroke();
    });
  }
  function frame(c, color) {   // 白: the blue double frame
    inlay(c, col => { c.strokeStyle = col || color; c.lineWidth = 9; rr(c, 44, 52, 168, 258, 10); c.stroke(); c.lineWidth = 4; rr(c, 62, 70, 132, 222, 6); c.stroke(); });
  }
  function bloom(c, f) {   // flowers and seasons: a coloured kanji in a ring of petals, the number in the corner
    const fl = f < 38, k = f - (fl ? 34 : 38);
    const ch = (fl ? '梅蘭菊竹' : '春夏秋冬')[k], col = (fl ? ['#c2283a', '#7a3aa0', '#c98a12', '#1f7a3e'] : ['#d0507a', '#1b8a8a', '#c8661a', '#2a5aa8'])[k];
    inlay(c, cc => {
      const kk = cc || col;
      if (fl) for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.fillStyle = kk; c.globalAlpha = cc ? c.globalAlpha : .22; c.beginPath(); c.ellipse(128 + Math.cos(a) * 82, 196 + Math.sin(a) * 82, 13, 22, a + Math.PI / 2, 0, 7); c.fill(); c.globalAlpha = cc ? c.globalAlpha : 1; }
      else { c.strokeStyle = kk; c.globalAlpha = cc ? c.globalAlpha : .3; c.lineWidth = 5; c.beginPath(); for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8, r = 98; c[i ? 'lineTo' : 'moveTo'](128 + Math.cos(a) * r, 196 + Math.sin(a) * r); } c.stroke(); c.globalAlpha = cc ? c.globalAlpha : 1; }
    });
    if (!glyph(c, 15 + (fl ? 4 : 0) + k, 1, RED, 66, 128, 124, 136)) kanji(c, ch, 128, 200, 150, col);   // (the traced kanji, in red as on Japanese tiles)
    kanji(c, String(k + 1), 216, 46, 50, BLU, 400);
  }
  function drawFace(c, f) {
    ground(c);
    if (f < 9) { if (glyph(c, f, 0, INK)) glyph(c, f, 1, RED); else { kanji(c, '一二三四五六七八九'[f], 128, 104, 132, INK); kanji(c, '萬', 128, 262, 140, RED); } return; }
    if (art(c, f)) return;
    if (f < 18) {
      const n = f - 8;
      const L = {
        1: [[128, 181, 96, BLU]],
        2: [[128, 96, 64, GRN], [128, 266, 64, BLU]],
        3: [[66, 76, 50, BLU], [128, 181, 50, RED], [190, 286, 50, GRN]],
        4: [[74, 100, 52, BLU], [182, 100, 52, GRN], [74, 262, 52, GRN], [182, 262, 52, BLU]],
        5: [[70, 88, 46, BLU], [186, 88, 46, GRN], [128, 181, 46, RED], [70, 274, 46, GRN], [186, 274, 46, BLU]],
        6: [[76, 70, 42, GRN], [180, 70, 42, GRN], [76, 196, 42, RED], [180, 196, 42, RED], [76, 290, 42, RED], [180, 290, 42, RED]],
        7: [[58, 56, 34, GRN], [128, 82, 34, GRN], [198, 108, 34, GRN], [80, 212, 36, RED], [176, 212, 36, RED], [80, 298, 36, RED], [176, 298, 36, RED]],
        8: [[80, 58, 36, BLU], [176, 58, 36, BLU], [80, 140, 36, BLU], [176, 140, 36, BLU], [80, 222, 36, BLU], [176, 222, 36, BLU], [80, 304, 36, BLU], [176, 304, 36, BLU]],
        9: [[52, 70, 37, BLU], [128, 70, 37, BLU], [204, 70, 37, BLU], [52, 181, 37, RED], [128, 181, 37, RED], [204, 181, 37, RED], [52, 292, 37, GRN], [128, 292, 37, GRN], [204, 292, 37, GRN]],
      }[n];
      L.forEach(([x, y, r, k]) => pin(c, x, y, r, k)); return;
    }
    if (f < 27) {
      const n = f - 17;
      if (n === 1) { bird(c); return; }
      const S = {
        2: [[128, 100, 140], [128, 264, 140]],
        3: [[128, 100, 140], [86, 264, 140], [170, 264, 140]],
        4: [[86, 100, 140], [170, 100, 140], [86, 264, 140], [170, 264, 140]],
        5: [[66, 100, 140], [190, 100, 140], [128, 181, 140, RED], [66, 264, 140], [190, 264, 140]],
        6: [[60, 100, 140], [128, 100, 140], [196, 100, 140], [60, 264, 140], [128, 264, 140], [196, 264, 140]],
        7: [[128, 62, 96, RED], [60, 182, 104], [128, 182, 104], [196, 182, 104], [60, 298, 104], [128, 298, 104], [196, 298, 104]],
        8: [[44, 100, 140], [98, 100, 140, 0, .42], [158, 100, 140, 0, -.42], [212, 100, 140], [44, 264, 140], [98, 264, 140, 0, -.42], [158, 264, 140, 0, .42], [212, 264, 140]],
        9: [[60, 70, 98], [128, 70, 98, RED], [196, 70, 98], [60, 181, 98], [128, 181, 98, RED], [196, 181, 98], [60, 292, 98], [128, 292, 98, RED], [196, 292, 98]],
      }[n];
      S.forEach(([x, y, h, k, rot]) => stick(c, x, y, h, k || GRN, rot)); return;
    }
    if (f < 31) { if (!glyph(c, 9 + f - 27, 0, INK)) kanji(c, '東南西北'[f - 27], 128, 186, 196, INK); return; }
    if (f === 31) return;   // 白: a plain white tile, as Japanese sets (ユーザー 2026-11-14)
    if (f === 32) { if (!glyph(c, 13, 2, GRN)) kanji(c, '發', 128, 186, 196, GRN); return; }
    if (f === 33) { if (!glyph(c, 14, 1, RED)) kanji(c, '中', 128, 186, 210, RED); return; }
    bloom(c, f);
  }

  /* ---------- the tile material: per-instance face cell (aFace), the back colour as a uniform ---------- */
  const mats = {};
  function tileMat(back) {
    if (mats[back]) return mats[back];
    const TT = T(), [cw, ch] = cellSize(), wo = faceOff(47);
    const m = new TT.MeshStandardMaterial({ map: atlas(), normalMap: normalTex, vertexColors: true, roughness: .38, metalness: 0, envMapIntensity: .7 });   // (a polished resin face; the carving in the normal map)
    const back3 = new TT.Color(BACK_COL[back] || BACK_COL.jade).convertSRGBToLinear();
    m.onBeforeCompile = sh => {
      sh.uniforms.uCell = { value: new TT.Vector2(cw, ch) }; sh.uniforms.uWhite = { value: new TT.Vector2(wo[0] + cw * .5, wo[1] + ch * .5) };
      sh.uniforms.uBack = { value: back3 };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCap;\nattribute vec2 aFace;\nuniform vec2 uCell;\nuniform vec2 uWhite;\nuniform vec3 uBack;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 shUv = aCap > .5 ? aFace + uv * uCell : uWhite;
        #ifdef USE_MAP
          #if defined( MAP_UV )
            vMapUv = shUv;
          #else
            vUv = shUv;
          #endif
        #endif
        #if defined( USE_NORMALMAP ) && defined( NORMALMAP_UV )
          vNormalMapUv = shUv;
        #endif`)
        .replace('#include <color_vertex>', '#include <color_vertex>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR )\nif (aCap < -.5) vColor.rgb *= uBack;\n#endif');
    };
    m.shadowSide = TT.BackSide;   // (the shadow pass from the inner faces: no striped self-shadow on the tile walls)
    m.customProgramCacheKey = () => 'shanghai-tile';
    return (mats[back] = m);
  }

  /* ---------- an InstancedMesh for n tiles ---------- */
  function tiles(n, back) {
    const TT = T(), g = tileGeo().clone();   // (its own copy: the per-instance face attribute)
    g.setAttribute('aFace', new TT.InstancedBufferAttribute(new Float32Array(n * 2), 2));
    const im = new TT.InstancedMesh(g, tileMat(back || backNow()), n);
    im.instanceMatrix.setUsage(TT.DynamicDrawUsage);
    im.castShadow = !LO(); im.receiveShadow = false; im.frustumCulled = false;   // (onto the mat and the table only: tile-on-tile shade is the soft quads of shades(), no striped self-shadow on the walls)
    const c = new TT.Color(1, 1, 1); for (let i = 0; i < n; i++) im.setColorAt(i, c);
    im.userData.setFace = (i, f) => { const [u, v] = faceOff(f), A = g.attributes.aFace; A.setXY(i, u, v); A.needsUpdate = true; };
    im.userData.dispose = () => g.dispose();
    return im;
  }
  function setBack(im, back) { if (!im || !BACK_COL[back]) return; im.material = tileMat(back); if (X.kick) X.kick(200); }

  /* ---------- the mat under the tiles: dark leather in a thin gilt edge ---------- */
  const matMats = {};
  function mat(w, d) {
    const TT = T(), gr = new TT.Group();
    const leather = matMats.l || (matMats.l = X.M({ color: '#2c5a48', roughness: .92 })), gilt = matMats.g || (matMats.g = X.M({ color: '#c9a35a', metalness: .9, roughness: .35 }));
    const e = new TT.Mesh(X.RB(w + .36, .1, d + .36, .05, 2), gilt); e.position.y = .05; e.receiveShadow = true; gr.add(e);
    const s = new TT.Mesh(X.RB(w + .22, .12, d + .22, .05, 2), leather); s.position.y = .06; s.receiveShadow = true; gr.add(s);
    gr.userData.top = .12;
    return gr;
  }

  /* ---------- the model on the table (the gallery / the portal's showcase): a small pyramid of tiles ---------- */
  X.MODELS.shanghai = function (live) {
    const TT = T(), g = new TT.Group(), K = window.ShanghaiCore;
    // the classic turtle part-way through (a fixed deal, some pairs taken), one tile lifted as if just chosen
    let P = [], face = [], alive = [];
    if (K) { P = K.LAYOUTS.turtle; const d = K.deal(P, 2026); face = d.face; alive = new Array(P.length).fill(1); d.order.slice(0, 22).forEach(([a, b]) => { alive[a] = alive[b] = 0; }); }
    else { for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) P.push([x * 2, y * 2, 0]); P.forEach((_, i) => { face.push((i * 7 + 3) % 42); alive.push(1); }); }
    const xs = P.map(p => p[0]), ys = P.map(p => p[1]), w = (Math.max(...xs) / 2 + 1) * TW, d = (Math.max(...ys) / 2 + 1) * TD;
    const m = mat(w, d); g.add(m);
    const idx = []; alive.forEach((v, i) => { if (v) idx.push(i); });
    const im = tiles(idx.length), o = new TT.Object3D();
    const G = K ? K.links(P) : null, free = i => !G || K.isFree(G, alive, i);
    const lift = idx.find(i => free(i) && P[i][2] === 0 && face[i] === 33) ?? idx.find(i => free(i) && P[i][2] === 0);
    idx.forEach((i, k) => { const [x, y, z] = P[i]; o.position.set((x / 2 + .5) * TW - w / 2, m.userData.top + z * TH + (i === lift ? .18 : 0), (y / 2 + .5) * TD - d / 2); o.updateMatrix(); im.setMatrixAt(k, o.matrix); im.userData.setFace(k, face[i]);
      const c = new TT.Color(); const f = free(i) ? 1 : .62; if (i === lift) c.setRGB(1.04, .93, .66); else c.setRGB(f, f, f); im.setColorAt(k, c); });
    g.add(im);
    const up = idx.filter(i => P[i][2] > 0), sh = shades(up.length || 1);
    up.forEach((i, k) => { const [x, y, z] = P[i]; o.position.set((x / 2 + .5) * TW - w / 2 + .05, m.userData.top + z * TH + .003, (y / 2 + .5) * TD - d / 2 + .07); o.updateMatrix(); sh.setMatrixAt(k, o.matrix); });
    if (!up.length) sh.count = 0; g.add(sh);
    g.userData = { top: m.userData.top + TH, im, _rb: Math.max(w, d) / 2 + .4, _h: TH * 3 };
    return g;
  };
  // the face font arrives a little later than the first frame: redraw the atlas once it is in
  ready().then(() => { if (atlasTex) { const n = drawAtlas(); atlasTex.image = n.image; atlasTex.needsUpdate = true; n.dispose(); if (X.kick) X.kick(300); } });
  // the soft shade a tile throws on the tiles it lies on: one flat quad per upper tile (an InstancedMesh, 2 triangles each)
  let shadeTex = null;
  function shades(n) {
    const TT = T();
    shadeTex = shadeTex || X.canvasTex('shShade', 128, 160, (c, W, H) => { H = H || 160; const g = c.createRadialGradient(64, 80, 20, 64, 80, 78); g.addColorStop(0, 'rgba(0,0,0,.9)'); g.addColorStop(.62, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 160); });
    const gq = new TT.PlaneGeometry(TW * 1.22, TD * 1.18); gq.rotateX(-Math.PI / 2);
    const m = new TT.MeshBasicMaterial({ map: shadeTex, color: 0x000000, transparent: true, opacity: .42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const im = new TT.InstancedMesh(gq, m, n); im.renderOrder = 1; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
    im.instanceMatrix.setUsage(TT.DynamicDrawUsage);
    im.userData.dispose = () => { gq.dispose(); m.dispose(); };
    return im;
  }
  X.shanghai = { TW, TD, TH, BACKS, BACK_COL, back: backNow, tiles, shades, setBack, mat, atlas, faceOff, ready, drawFace };
})();
