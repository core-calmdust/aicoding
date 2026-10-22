/* =====================================================================
   Shogi on the 3D table — a legged kaya board (足付き盤) and boxwood
   pieces with raised black-lacquer, two-character inscriptions (盛り上げ駒).
   Registers into Table3D:
     Table3D.MODELS.shogi(live, o)   board (+ the opening position unless live)
     Table3D.shogi.piece(type, gote)  one piece (type = page/engine code 1..14, 8 = king)
     Table3D.shogi.images(px)         Promise → { 'k<type>[g]': dataURL } top-down renders for the DOM
   Units: one square is 1.0 wide and 1.1 deep (like a real board).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, canvasTex, makeNoise, RB, mesh } = X;
  const CW = 1, CH = 1.1, FW = 9 * CW, FH = 9 * CH, MARGIN = .5;
  const BW = FW + MARGIN * 2, BD = FH + MARGIN * 2, THICK = 2.6, LEG = 1.15;

  /* ---------- the brush font for the inscriptions ---------- */
  const FONT = '"Yuji Boku","Yuji Syuku","Shippori Mincho B1","Hiragino Mincho ProN","Yu Mincho",serif';
  let fontOK = false;
  const fontReady = (document.fonts && document.fonts.load) ? Promise.all(['900 120px "Yuji Boku"', '120px "Yuji Boku"'].map(f => document.fonts.load(f, '王将飛車角行金銀桂馬香歩兵龍成と'))).then(() => { fontOK = document.fonts.check('120px "Yuji Boku"'); }).catch(() => {}) : Promise.resolve();
  (function addFont() {
    if (document.querySelector('link[data-yuji]')) return;
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.yuji = 1;
    l.href = 'https://fonts.googleapis.com/css2?family=Yuji+Boku&display=swap'; document.head.appendChild(l);
  })();

  /* ---------- inscriptions from the game's "本格（立体）" piece set (2kanji_3d, Little-Mage & orangain, CC BY-SA 3.0) ----------
     The SVGs draw each character as stacked grey (or red) layers, light → dark: that stack is used as the
     height of the raised lacquer (bump) and its outline as the lacquer itself. */
  const PCODE = ['', 'FU', 'KY', 'KE', 'GI', 'KA', 'HI', 'KI', 'GY', 'TO', 'NY', 'NK', 'NG', 'UM', 'RY'];
  const GLYPH_BASE = (() => { try { return new URL('../../shogi/pieces/2kanji_3d/', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../shogi/pieces/2kanji_3d/'; } })();
  const GLYPHS = {};   // 'k<type>[o]' → canvas (RGBA: rgb = colour, a = coverage; height in the red channel of .h)
  function loadGlyph(type, ou) {
    const code = type === 8 && ou ? 'OU' : PCODE[type];
    return fetch(GLYPH_BASE + '0' + code + '.svg').then(r => r.ok ? r.text() : Promise.reject()).then(svg => {
      // bounding box of the piece body in the drawing (the light yellow path) → crop to it
      const body = svg.match(/<path fill="#feec99"[^>]*\sd="([^"]+)"/);
      const noBody = svg.replace(/<path fill="#feec99"[^>]*\/>/g, '').replace(/<path fill="#c3983c"[^>]*\/>/g, '').replace(/filter="url\([^)]*\)"/g, '');
      const bodyOnly = svg.replace(/<path fill="(?!#feec99)[^"]*"[^>]*\/>/g, '').replace(/filter="url\([^)]*\)"/g, '');
      const S = 600, draw = txt => new Promise((res, rej) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = c.height = S; c.getContext('2d').drawImage(im, 0, 0, S, S); res(c); }; im.onerror = rej; im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt); });
      return Promise.all([draw(bodyOnly), draw(noBody)]).then(([b, g]) => {
        const bd = b.getContext('2d').getImageData(0, 0, S, S).data; let x0 = S, y0 = S, x1 = 0, y1 = 0;
        for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (bd[(y * S + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        if (x1 <= x0) throw 0;
        const W = 256, H = 296, out = document.createElement('canvas'); out.width = W; out.height = H;
        out.getContext('2d').drawImage(g, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
        GLYPHS['k' + type + (ou ? 'o' : '')] = out;
      });
    }).catch(() => {});
  }
  // baked once from those SVGs into one sheet (images/atlas/shogi-glyphs.png, same licence) — fast to load and slice
  const SHEET = (() => { try { return new URL('../../images/atlas/shogi-glyphs.png?v=1', (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) { return '../images/atlas/shogi-glyphs.png?v=1'; } })();
  const SHEET_KEYS = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k8o'];
  const glyphsReady = new Promise(res => {
    const im = new Image();
    im.onload = () => { SHEET_KEYS.forEach((k, i) => { const c = document.createElement('canvas'); c.width = 256; c.height = 296; c.getContext('2d').drawImage(im, (i % 5) * 256, (i / 5 | 0) * 296, 256, 296, 0, 0, 256, 296); GLYPHS[k] = c; }); res(); };
    im.onerror = () => Promise.all([...Array(14).keys()].map(i => loadGlyph(i + 1, false)).concat([loadGlyph(8, true)])).then(res);   // fall back to the SVGs
    im.src = SHEET;
  });
  /* ---------- textures ---------- */
  // boxwood (柘植) face of a piece: pale honey with very fine straight grain and a few silky flecks
  function tsuge(c, W, H, seed) {
    const N = makeNoise(seed), img = c.createImageData(W, H), d = img.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const g = N(u * 60, v * 3, 2) * .5 + N(u * 9 + N(v * 2, u, 2) * 2, v * .8, 3) * .5;
      const fleck = N(u * 30, v * 90, 1) > .8 ? .06 : 0;
      const t = .18 + g * .32 - fleck, i = (y * W + x) * 4;
      d[i] = 236 - t * 60; d[i + 1] = 204 - t * 70; d[i + 2] = 140 - t * 80; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
  }
  const FRONT = ['', '歩兵', '香車', '桂馬', '銀将', '角行', '飛車', '金将', '玉将', 'と金', '成香', '成桂', '成銀', '龍馬', '龍王'];
  // face: wood + lacquer characters; rough: glossy where lacquered; bump: raised, rounded strokes
  function faceTex(type, kingOu, kind) {
    const G = GLYPHS['k' + type + (kingOu ? 'o' : '')];
    const key = `shf-${type}${kingOu ? 'o' : ''}-${kind}-${G ? 'g' : fontOK ? 1 : 0}`;
    if (G) return canvasTex(key, 256, 296, (c, W, H) => glyphFace(c, W, H, G, type, kind));
    return canvasTex(key, 256, 296, (c, W, H) => {
      const txt = type === 8 && kingOu ? '王将' : FRONT[type], red = type > 8;
      if (kind === 'map') tsuge(c, W, H, 11 + type);
      else { c.fillStyle = kind === 'rough' ? '#888' : '#000'; c.fillRect(0, 0, W, H); }
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const fs = W * (txt.length > 1 ? .4 : .62);
      c.font = `${fontOK ? '' : '700 '}${fs}px ${FONT}`;
      const ys = txt.length > 1 ? [H * .4, H * .7] : [H * .58];
      const draw = (fill, blur, grow = 0) => { c.save(); c.fillStyle = fill; c.strokeStyle = fill; c.lineJoin = 'round'; c.lineWidth = fs * (.05 + grow); if (blur) { c.shadowColor = fill; c.shadowBlur = blur; }
        [...txt].forEach((ch, i) => { c.save(); c.translate(W / 2, ys[i]); c.scale(1, txt.length > 1 ? .92 : 1); c.fillText(ch, 0, 0); c.strokeText(ch, 0, 0); c.restore(); }); c.restore(); };
      if (kind === 'map') {
        // the face darkens a little towards the edges (a hand-rubbed finish), then the lacquer
        const vg = c.createRadialGradient(W / 2, H * .55, W * .2, W / 2, H * .55, W * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(90,50,10,.22)'); c.fillStyle = vg; c.fillRect(0, 0, W, H);
        c.save(); c.translate(1.5, 2.5); draw('rgba(60,30,5,.35)', 4, .02); c.restore();             // soft shadow under the raised strokes
        draw(red ? '#9c1f16' : '#120804', 0);
        c.save(); c.translate(-1.2, -1.6); c.globalCompositeOperation = 'lighter'; draw(red ? 'rgba(120,40,20,.25)' : 'rgba(70,60,50,.22)', 0, -.03); c.restore();   // highlight on the crown of the lacquer
      }
      if (kind === 'rough') draw('#1a1a1a', 2);
      if (kind === 'bump') { draw('#606060', 8, .03); draw('#c0c0c0', 4); draw('#ffffff', 1, -.02); }
    });
  }
  function glyphFace(c, W, H, G, type, kind) {
    const gd = G.getContext('2d').getImageData(0, 0, W, H).data, red = type > 8;
    if (kind === 'map') tsuge(c, W, H, 11 + type); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
    const img = c.getImageData(0, 0, W, H), d = img.data;
    // a soft shadow under the raised lacquer (map only)
    if (kind === 'map') for (let y = H - 1; y >= 3; y--) for (let x = W - 1; x >= 2; x--) { const j = ((y - 3) * W + (x - 2)) * 4 + 3, a = gd[j] / 255 * .28, i = (y * W + x) * 4; if (a) { d[i] *= 1 - a; d[i + 1] *= 1 - a; d[i + 2] *= 1 - a; } }
    for (let i = 0; i < W * H; i++) {
      const a = gd[i * 4 + 3] / 255; if (!a) { if (kind === 'rough') { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = 150; } continue; }
      const hgt = 1 - (red ? gd[i * 4 + 1] : gd[i * 4]) / 255;    // dark layer = top of the stroke
      if (kind === 'map') { const L = red ? [150, 22, 14] : [16, 9, 5], hi = Math.pow(hgt, 3) * 26; for (let k = 0; k < 3; k++) d[i * 4 + k] = d[i * 4 + k] * (1 - a) + (L[k] + hi) * a; }
      else if (kind === 'rough') { const v = 150 * (1 - a) + 28 * a; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
      else { const v = 255 * a * (.35 + .65 * hgt); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; }
    }
    c.putImageData(img, 0, 0);
  }
  // board top: straight-grained kaya with the black lacquer lines (太刀盛り) and four stars
  // n: squares per side (9; 5 for 5五将棋 — no stars)
  function boardTop(n = 9) {
    const MG = n === 9 ? MARGIN : MARGIN * n / 9;   // rim scales with the grid (the 5x5 board is fitted to the same screen size)
    const PX = 100, BW = n * CW + MG * 2, BD = n * CH + MG * 2;
    return canvasTex(n === 9 ? 'shogiTop3' : 'shogiTop3-' + n, BW * PX | 0, BD * PX | 0, (c, W, H) => {
      const N = makeNoise(5), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H;
        const r = (u * 34 + N(u * 1.5, v * 2.2, 3) * 1.8 + N(u * 12, v * 30, 2) * .05) % 1;
        const late = Math.exp(-Math.pow((r - .85) / .05, 2)) * .55 + Math.exp(-Math.pow((r - .85) / .18, 2)) * .25;
        const t = .16 + late * .45 + (N(u * 3, v * 260, 1) - .5) * .12 + (N(u * 2, v * 2, 2) - .5) * .18, i = (y * W + x) * 4;
        d[i] = 208 - t * 66; d[i + 1] = 150 - t * 62; d[i + 2] = 78 - t * 46; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      const ox = MG * PX, oy = MG * PX, cw = CW * PX, ch = CH * PX;
      c.strokeStyle = 'rgba(20,10,4,.92)'; c.lineCap = 'square';
      for (let i = 0; i <= n; i++) {
        c.lineWidth = i === 0 || i === n ? 3.4 : 2.2;
        c.beginPath(); c.moveTo(ox + i * cw, oy); c.lineTo(ox + i * cw, oy + n * ch); c.stroke();
        c.beginPath(); c.moveTo(ox, oy + i * ch); c.lineTo(ox + n * cw, oy + i * ch); c.stroke();
      }
      c.fillStyle = 'rgba(20,10,4,.95)';
      if (n === 9) [[3, 3], [6, 3], [3, 6], [6, 6]].forEach(([i, j]) => { c.beginPath(); c.arc(ox + i * cw, oy + j * ch, 5.5, 0, 7); c.fill(); });
    });
  }
  // the lines are raised lacquer too: a bump map with the grid
  function boardBump(n = 9) {
    const MG = n === 9 ? MARGIN : MARGIN * n / 9;
    const PX = 100, BW = n * CW + MG * 2, BD = n * CH + MG * 2;
    return canvasTex(n === 9 ? 'shogiTopB' : 'shogiTopB-' + n, BW * PX | 0, BD * PX | 0, (c, W, H) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
      const ox = MG * PX, oy = MG * PX, cw = CW * PX, ch = CH * PX;
      c.strokeStyle = '#fff'; c.shadowColor = '#fff'; c.shadowBlur = 2;
      for (let i = 0; i <= n; i++) { c.lineWidth = i === 0 || i === n ? 3.4 : 2.2; c.beginPath(); c.moveTo(ox + i * cw, oy); c.lineTo(ox + i * cw, oy + n * ch); c.stroke(); c.beginPath(); c.moveTo(ox, oy + i * ch); c.lineTo(ox + n * cw, oy + i * ch); c.stroke(); }
    });
  }
  // the sides of the block show end grain: tight growth rings arching across the face (like the photo of a real 榧 board)
  function endGrain(key, w, h, cx, cy, k) {
    return canvasTex(key, w, h, (c, W, H) => {
      const N = makeNoise(key.length * 7), img = c.createImageData(W, H), d = img.data;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, dx = (u - cx) * k, dy = (v - cy);
        const r = Math.sqrt(dx * dx + dy * dy) * 60 + N(u * 4, v * 4, 3) * 3 + N(u * 40, v * 40, 1) * .2;
        const f = r % 1, late = Math.exp(-Math.pow((f - .8) / .08, 2));
        const t = .2 + late * .35 + (N(u * 2, v * 2, 2) - .5) * .2, i = (y * W + x) * 4;
        d[i] = 212 - t * 70; d[i + 1] = 158 - t * 70; d[i + 2] = 82 - t * 55; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    });
  }

  /* ---------- a piece ---------- */
  const SIZE = ['', 1, 2, 2, 3, 4, 4, 3, 5, 1, 2, 2, 3, 4, 4];
  const geoCache = {};
  function pieceGeo(sz) {
    if (geoCache[sz]) return geoCache[sz];
    const TT = T(), s = .8 + sz * .045, bw = .4 * s, sw = .335 * s, sy = .25 * s, tip = .47 * s, bot = -.47 * s;
    const sh = new TT.Shape(); sh.moveTo(0, tip); sh.lineTo(sw, sy); sh.lineTo(bw, bot); sh.lineTo(-bw, bot); sh.lineTo(-sw, sy); sh.closePath();
    const bev = .045 * s;
    const geo = new TT.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 1 });
    // taper: thick at the bottom, thinner towards the tip (as real pieces are)
    const P = geo.attributes.position, UV = geo.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const y = P.getY(i), z = P.getZ(i), th = (.3 - (y - bot) / (tip - bot) * .1) * s;
      P.setZ(i, z < 0 ? z : z > 1 ? th + (z - 1) : z * th);
    }
    for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + bw) / (2 * bw), (P.getY(i) - bot) / (tip - bot));
    geo.computeVertexNormals();
    geo.rotateX(-Math.PI / 2);                 // face up (+y), tip towards -z (the far side / top of the screen)
    geo.computeBoundingBox(); geo.translate(0, -geo.boundingBox.min.y, 0);
    return (geoCache[sz] = geo);
  }
  const matCache = {};
  function pieceMats(type, ou) {
    const key = type + (ou ? 'o' : '');
    if (matCache[key]) return matCache[key];
    const TT = T();
    const face = new TT.MeshPhysicalMaterial({ map: faceTex(type, ou, 'map'), roughnessMap: faceTex(type, ou, 'rough'), bumpMap: faceTex(type, ou, 'bump'), bumpScale: .032, roughness: 1, clearcoat: .55, clearcoatRoughness: .28 });
    const side = M({ map: X.canvasTex('tsugeSide', 128, 128, (c, W, H) => tsuge(c, W, H, 3)), roughness: .5, bumpScale: .002 });
    return (matCache[key] = [face, side]);
  }
  glyphsReady.then(() => {   // upgrade the faces made before the glyphs arrived
    for (const key in matCache) { const ou = key.endsWith('o'), type = parseInt(key, 10), f = matCache[key][0];
      if (!GLYPHS['k' + type + (ou ? 'o' : '')]) continue;
      f.map = faceTex(type, ou, 'map'); f.roughnessMap = faceTex(type, ou, 'rough'); f.bumpMap = faceTex(type, ou, 'bump'); f.needsUpdate = true; }
  });
  function piece(type, gote, ou) {
    const m = new (T().Mesh)(pieceGeo(SIZE[type] || 1), pieceMats(type, ou));
    m.castShadow = true; m.receiveShadow = true;
    const g = new (T().Group)(); g.add(m); if (gote) g.rotation.y = Math.PI;
    g.userData.type = type; return g;
  }

  /* ---------- the legged board ---------- */
  function leg(mat) {   // kuchinashi (gardenia fruit) foot: a carved, eight-lobed bulb
    const TT = T(), pts = [[0, 0], [.34, 0], [.42, .08], [.6, .32], [.62, .45], [.55, .62], [.36, .78], [.26, .86], [.28, .93], [.42, .98], [.44, 1.04], [.36, 1.1], [.36, LEG], [0, LEG]];
    const geo = new TT.LatheGeometry(pts.map(([r, y]) => new TT.Vector2(r, y)), 64);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), z = P.getZ(i), y = P.getY(i), a = Math.atan2(z, x), lobe = y < .9 ? 1 + .1 * Math.pow(Math.abs(Math.cos(a * 4)), .6) - .05 : 1;
      P.setX(i, x * lobe); P.setZ(i, z * lobe);
    }
    geo.computeVertexNormals();
    return mesh(geo, mat);
  }
  function board(o = {}) {
    const g = new (T().Group)(), TT = T();
    // o.n = 5: the 5五将棋 board — same squares, a smaller block (thickness and legs scaled with it)
    const n = o.n === 5 ? 5 : 9, MG = n === 9 ? MARGIN : MARGIN * n / 9, k = n === 9 ? 1 : .62, FW = n * CW, FH = n * CH, BW = FW + MG * 2, BD = FH + MG * 2, THICK = 2.6 * k;
    const kaya = M({ map: X.wood('kayaSide2', '#d4a057', '#9c6628', 512, 512, 2.4), roughness: .5, bumpScale: .003 });
    const endF = M({ map: endGrain('kayaEndF2', 512, 256, .5, 2.6, .7), roughness: .5, bumpScale: .003 });
    const endS = M({ map: endGrain('kayaEndS2', 512, 256, -1.4, .5, .5), roughness: .5, bumpScale: .003 });
    const top = new TT.MeshPhysicalMaterial({ map: boardTop(n), bumpMap: boardBump(n), bumpScale: .006, roughness: .58, clearcoat: .15, clearcoatRoughness: .45 });   // soft satin, no glare on the playing field
    top.map.anisotropy = 8;
    const bottom = M({ color: 0x8a5a2a, roughness: .7 });
    const base = o.legs === false ? 0 : LEG * k;
    const block = new TT.Mesh(RB(BW, THICK, BD, .05, 2), [endS, endS, top, bottom, endF, endF]);
    block.position.y = base + THICK / 2; block.castShadow = block.receiveShadow = true; g.add(block);
    if (o.legs !== false) {
      const lm = M({ map: X.wood('kayaLeg', '#e0b06a', '#a87232', 256, 256, 2), roughness: .5, bumpScale: .002 });
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => { const l = leg(lm); l.scale.setScalar(k); l.position.set(sx * (BW / 2 - 1.15 * k), 0, sz * (BD / 2 - 1.2 * k)); g.add(l); });
    }
    // board colour (the game's "board & piece skin"): a tint over the kaya
    const tinted = [top, kaya, endF, endS, bottom]; g.traverse(o => { if (o.isMesh && o.material && !Array.isArray(o.material) && !tinted.includes(o.material)) tinted.push(o.material); });
    const base0 = tinted.map(m => m.color.clone());
    const TONES = { classic: 0xe8c9a0, grain: 0xd2a26e, metal: 0xb4bcc6, ink: 0x5e5046 };
    g.userData.setTone = name => { g.userData.tone = name; const c = new TT.Color(TONES[name] || 0xffffff).convertSRGBToLinear(); tinted.forEach((m, i) => { m.color.copy(base0[i]).multiply(c); }); };
    g.userData.setTone('classic');
    g.userData.S = FH; g.userData.W = FW; g.userData.top = base + THICK + .001; g.userData.outer = BD / FH; g.userData.n = n;
    return g;
  }
  const cell = (c, r) => [-FW / 2 + CW * (c + .5), -FH / 2 + CH * (r + .5)];   // c: 0 = left column on screen, r: 0 = top row

  /* ---------- 駒台: one pedestal — square top plate, waisted column, stepped square base on the floor ---------- */
  let colMat = null;
  function komadai(mat, KH) {
    const TT = T(), g = new TT.Group();
    g.add(mesh(RB(2.5, .26, 3.1, .05, 2), mat, 0, KH - .13, 0));                                   // top plate
    g.add(mesh(RB(2.3, .32, 2.7, .08, 2), mat, 0, .16, 0));                                        // base
    g.add(mesh(RB(1.5, .24, 1.8, .06, 2), mat, 0, .32 + .12, 0));                                   // step
    const H = KH - .26 - .56, pts = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, w = .26 + .16 * Math.pow(Math.abs(t - .55) / .55, 2); pts.push(new TT.Vector2(w, t * H)); }
    const col = new TT.LatheGeometry(pts, 4); col.rotateY(Math.PI / 4);                             // square, waisted
    // the lathe wraps the texture round the column: use a soft, low-contrast grain there so it doesn't band
    const cm = colMat || (colMat = M({ map: X.wood('komadaiCol', '#d6a462', '#c69350', 256, 256, .6), roughness: .55, bumpScale: .001 }));
    const c = mesh(col, cm, 0, .56, 0); c.scale.set(1, 1, 1.15); g.add(c);
    return g;
  }
  /* ---------- MODELS.shogi: board + the opening position ---------- */
  X.MODELS.shogi = function (live, o) {
    const g = board(o), Y = g.userData.top;
    if (live) return g;
    const back = [2, 3, 4, 7, 8, 7, 4, 3, 2];
    const put = (type, c, r, gote) => { const p = piece(type, gote, gote && type === 8); const [x, z] = cell(c, r); p.position.set(x, Y, z); g.add(p); };
    back.forEach((t, c) => { put(t, c, 0, true); put(t, c, 8, false); });
    for (let c = 0; c < 9; c++) { put(1, c, 2, true); put(1, c, 6, false); }
    put(6, 1, 1, true); put(5, 7, 1, true); put(6, 7, 7, false); put(5, 1, 7, false);
    // 駒台 (piece stands): yours at the bottom right, the opponent's at the top left — same as the rules tour
    const KH = g.userData.top, sw = M({ map: X.wood('komadai', '#d9a764', '#a06c30', 256, 256, 1.6), roughness: .55, bumpScale: .002 });
    [{ x: FW / 2 + 1.95, z: 3.9 }, { x: -FW / 2 - 1.95, z: -3.9 }].forEach(st => { const k = komadai(sw, KH); k.position.set(st.x, 0, st.z); g.add(k); });
    // in the toy room the tall board would hide the room: a little smaller than life
    g.scale.setScalar(.72);   // board + stands about the reversi board's size on the chabudai
    g.userData.viewY = g.userData.top * .72 * 1.05;   // the chabudai camera looks at the (scaled) playing surface of the legged board, like the goban
    return g;
  };

  /* ---------- top-down renders of each piece for the DOM (hands, dragging, the board itself in the skin) ---------- */
  let imgCache = null;
  function images(px = 220) {
    if (imgCache) return imgCache;
    return (imgCache = Promise.all([Promise.race([fontReady, new Promise(r => setTimeout(r, 1500))]), glyphsReady]).then(() => {
      const TT = T(), W = px, H = Math.round(px * CH / CW);
      const R = new TT.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      R.setSize(W, H, false); R.setPixelRatio(1); R.outputEncoding = TT.sRGBEncoding; R.toneMapping = TT.ACESFilmicToneMapping; R.toneMappingExposure = .95;
      R.setClearColor(0x000000, 0);
      const scene = new TT.Scene();
      try {   // a soft studio for the lacquer gloss
        const env = new TT.Scene(); env.add(new TT.Mesh(new TT.SphereGeometry(20, 16, 8), new TT.MeshBasicMaterial({ color: 0x3a3226, side: TT.BackSide })));
        const p = new TT.Mesh(new TT.PlaneGeometry(14, 8), new TT.MeshBasicMaterial({ color: 0xffffff, side: TT.DoubleSide })); p.position.set(-6, 12, 8); p.lookAt(0, 0, 0); env.add(p);
        const pm = new TT.PMREMGenerator(R); scene.environment = pm.fromScene(env, .04).texture; pm.dispose();
      } catch (e) {}
      scene.add(new TT.HemisphereLight(0xfff4e0, 0x6a5038, .55));
      const key = new TT.DirectionalLight(0xffffff, 1.05); key.position.set(-3, 10, 4); scene.add(key);
      const cam = new TT.OrthographicCamera(-CW / 2, CW / 2, CH / 2, -CH / 2, .1, 20); cam.position.set(0, 8, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
      const out = {};
      for (let type = 1; type <= 14; type++) for (const ou of type === 8 ? [false, true] : [false]) {
        const p = piece(type, false, ou); scene.add(p);
        R.render(scene, cam); out['k' + type + (ou ? 'o' : '')] = R.domElement.toDataURL('image/png');
        scene.remove(p);
      }
      R.dispose(); R.forceContextLoss && R.forceContextLoss();
      return out;
    }));
  }

  X.shogi = { komadai, piece, board, cell, images, fontReady, GLYPHS, CW, CH, FW, FH };
})();
