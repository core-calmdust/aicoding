/* =====================================================================
   Carrom on the 3D table — two boards (Table3D.BOARDS.carrom, chosen in the portal's 盤 row):
   · 'classic' the board of every Indian home and club: a honey-coloured birch plywood surface, lacquered and
              powdered, the ICF markings in black with red base circles and a red centre, arrows to the pockets and a rosette in
              the centre circle; a deep rosewood frame with curved inner corners, black netted pockets. Men of boxwood and ebony
              with turned rings, a red lacquer queen, a white acrylic striker with a printed star.
   · 'modern' (the default) an art board: the surface is a print of colour fields — four Mughal arches rising from the base lines round a
              rosette of overlapping circles, in terracotta, saffron, teal and ink on warm paper, with a fine risograph grain; the
              markings in ink and gold. A matte ink-blue lacquered frame with brass edging and brass-ringed pockets. Men in matte
              ivory and charcoal with a brass pip, a coral queen, a cream striker with a brass ring.
   Real proportions (ICF laws): surface 74 cm, frame 7 cm, pockets 4.45 cm, men 3.18 cm, striker 4.13 cm.
   Registers into Table3D:
     Table3D.MODELS.carrom(live)   board (+ the opening arrangement and a striker unless live)
     Table3D.carrom = { board(look), LOOKS, K }
     userData: { top, K, S, look, xz(x, y) → [wx, wz] (board cm → world), piece(c 'w'|'b'|'q') → Group, striker() → Group, H (piece height) }
   Units: K world units per cm (the 88 cm board ≈ 10 world units across).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const K = 10 / 88, S = 37 * K, FW = 7 * K, FH = 2.2 * K, TOP = .26, RP = 2.225 * K, PC = (37 - 2.225) * K;
  const RM = 1.59 * K, RS = 2.065 * K, HM = .8 * K, HS = .9 * K;
  const LOOKS = ['classic', 'modern'];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const lookNow = () => X.BOARDS && X.BOARDS.carrom ? X.BOARDS.carrom.get() : 'modern';

  /* ---------- the playing surface: a canvas in board centimetres ---------- */
  const PAL = {
    classic: { ink: '#16110d', red: '#c3271f', gold: null },
    modern: { ink: '#1d2340', red: '#d0563c', gold: '#b8893a' },
  };
  function markings(g, W, look) {
    const P = PAL[look], u = W / 74, X0 = cm => (cm + 37) * u;
    const line = (x0, y0, x1, y1, w, c) => { g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.moveTo(X0(x0), X0(y0)); g.lineTo(X0(x1), X0(y1)); g.stroke(); };
    const circ = (x, y, r, fill, stroke, w) => { g.beginPath(); g.arc(X0(x), X0(y), r * u, 0, Math.PI * 2); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w * u; g.stroke(); } };
    const accent = P.gold || P.ink;
    g.lineCap = 'round';
    for (let side = 0; side < 4; side++) {
      g.save(); g.translate(W / 2, W / 2); g.rotate(side * Math.PI / 2); g.translate(-W / 2, -W / 2);
      const yo = 37 - 10.15, yi = yo - 3.18, cx = 23.5 - 1.59;
      line(-cx, yo, cx, yo, .55, P.ink); line(-cx, yi, cx, yi, .3, P.ink);
      for (const s of [-1, 1]) { circ(s * cx, (yo + yi) / 2, 1.59, null, P.ink, .28); circ(s * cx, (yo + yi) / 2, 1.27, P.red); }
      g.restore();
    }
    // the arrows: on the diagonals, from 5 cm off the pocket towards the centre (25.7 cm), a head at the pocket end, an arc at the inner end
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const d0 = 34.775 * Math.SQRT2 - 2.225 - 5, d1 = d0 - 25.7, ux = sx / Math.SQRT2, uy = sy / Math.SQRT2;
      line(ux * d1, uy * d1, ux * d0, uy * d0, .2, P.ink);
      const hx = ux * d0, hy = uy * d0, px = -uy, py = ux, hl = 1.6, hw = .75;
      g.fillStyle = P.ink; g.beginPath(); g.moveTo(X0(hx + ux * .4), X0(hy + uy * .4)); g.lineTo(X0(hx - ux * hl + px * hw), X0(hy - uy * hl + py * hw)); g.lineTo(X0(hx - ux * hl - px * hw), X0(hy - uy * hl - py * hw)); g.closePath(); g.fill();
      const a = Math.atan2(uy, ux); g.strokeStyle = accent; g.lineWidth = .22 * u; g.beginPath(); g.arc(X0(ux * (d1 + 3.18)), X0(uy * (d1 + 3.18)), 3.18 * u, a + Math.PI * .28, a + Math.PI * 1.72, false); g.stroke();
    }
    // the centre: outer circle (17 cm), a rosette, the red centre circle (3.18 cm)
    circ(0, 0, 8.5, null, P.ink, .28);
    g.save(); g.translate(X0(0), X0(0));
    g.strokeStyle = accent; g.lineWidth = .16 * u;
    for (let k = 0; k < 8; k++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, -3.9 * u, 1.35 * u, 3.6 * u, 0, 0, Math.PI * 2); g.stroke(); }
    g.restore();
    circ(0, 0, 7.6, null, accent, .14);
    circ(0, 0, 1.59, P.red, P.ink, .16);
  }
  function surfaceTex(look) {
    const W = SZ(2048);
    const t = X.canvasTex('crSurf' + look + W, W, W, (g) => {
      const N = X.makeNoise(look === 'modern' ? 41 : 17), img = g.createImageData(W, W), d = img.data;
      if (look === 'classic') {
        // birch plywood: pale honey, long soft grain along x, a slow colour drift; lacquered (the gloss is the material's)
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const u = x / W, v = y / W, warp = N(u * 1.6, v * 4, 3) * 1.4;
          const ring = Math.sin((v * 7 + warp * 2.2) * Math.PI * 2) * .5 + .5, fib = N(u * 30, v * 300, 2);
          const k = Math.pow(ring, 3) * .22 + fib * .16 + N(u * 2.5, v * 2.5, 3) * .2;
          const i = (y * W + x) * 4;
          d[i] = 236 - k * 46; d[i + 1] = 206 - k * 52; d[i + 2] = 150 - k * 60; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        // the powder: a faint, uneven bloom
        g.globalAlpha = .05; g.fillStyle = '#ffffff'; for (let i = 0; i < 90; i++) { const r = W * (.03 + Math.random() * .08); g.beginPath(); g.arc(Math.random() * W, Math.random() * W, r, 0, 7); g.fill(); } g.globalAlpha = 1;
      } else {
        // warm paper
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const n = N(x / W * 40, y / W * 40, 2), i = (y * W + x) * 4;
          d[i] = 239 - n * 14; d[i + 1] = 228 - n * 14; d[i + 2] = 208 - n * 14; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        const u = W / 74, X0 = cm => (cm + 37) * u;
        g.globalCompositeOperation = 'multiply';
        const fill = (c, a, f) => { g.globalAlpha = a; g.fillStyle = c; g.beginPath(); f(); g.fill(); };
        // four Mughal arches, one rising from each base line (pointed ogee tops), in the four colours
        const COL = ['#c8643f', '#e0a43a', '#2f8a83', '#2c3a6b'];
        for (let side = 0; side < 4; side++) {
          g.save(); g.translate(W / 2, W / 2); g.rotate(side * Math.PI / 2); g.translate(-W / 2, -W / 2);
          const c = COL[side], c2 = COL[(side + 1) % 4];
          // the big arch
          fill(c, .78, () => { const w = 15, b = 37, top = 13.5; g.moveTo(X0(-w), X0(b)); g.lineTo(X0(-w), X0(top + 7)); g.bezierCurveTo(X0(-w), X0(top - 1), X0(-3), X0(top - 2), X0(0), X0(top - 6.5)); g.bezierCurveTo(X0(3), X0(top - 2), X0(w), X0(top - 1), X0(w), X0(top + 7)); g.lineTo(X0(w), X0(b)); g.closePath(); });
          // a smaller arch inside, the next colour
          fill(c2, .55, () => { const w = 8.5, b = 37, top = 21; g.moveTo(X0(-w), X0(b)); g.lineTo(X0(-w), X0(top + 4)); g.bezierCurveTo(X0(-w), X0(top - 1), X0(-2), X0(top - 1.5), X0(0), X0(top - 4.5)); g.bezierCurveTo(X0(2), X0(top - 1.5), X0(w), X0(top - 1), X0(w), X0(top + 4)); g.lineTo(X0(w), X0(b)); g.closePath(); });
          // quarter suns in the corners (behind the pockets)
          fill(c2, .42, () => { g.arc(X0(37), X0(37), 15 * u, Math.PI, Math.PI * 1.5); g.lineTo(X0(37), X0(37)); g.closePath(); });
          fill(c, .3, () => { g.arc(X0(37), X0(37), 9 * u, Math.PI, Math.PI * 1.5); g.lineTo(X0(37), X0(37)); g.closePath(); });
          g.restore();
        }
        // the centre: overlapping circles (a flower of life, coloured) under the outer circle
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; fill(COL[k % 4], .28, () => g.arc(X0(Math.cos(a) * 4.2), X0(Math.sin(a) * 4.2), 4.2 * u, 0, 7)); }
        fill('#f3e7cf', .6, () => g.arc(X0(0), X0(0), 2.4 * u, 0, 7));
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        // risograph grain + a few printed specks
        const img2 = g.getImageData(0, 0, W, W), d2 = img2.data;
        for (let i = 0; i < d2.length; i += 4) { const r = (Math.random() - .5) * 16; d2[i] += r; d2[i + 1] += r; d2[i + 2] += r; }
        g.putImageData(img2, 0, 0);
      }
      markings(g, W, look);
    });
    return t;
  }
  // a fine net under the pockets
  function netTex() {
    const t = X.canvasTex('crNet', 128, 128, (g, W) => { g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, W, W); g.strokeStyle = '#3a3a3a'; g.lineWidth = 2; for (let i = -W; i < W * 2; i += 12) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + W, W); g.stroke(); g.beginPath(); g.moveTo(i, W); g.lineTo(i + W, 0); g.stroke(); } }, 2);
    return t;
  }
  // the piece's face: turned rings (wood men), a star (striker), a brass pip (modern)
  function faceTex(kind) {
    const t = X.canvasTex('crFace' + kind, SZ(256), SZ(256), (g, W) => {
      const c = W / 2, base = { w: '#efe0c0', b: '#2b201a', q: '#c0262a', s: '#f4f1ea', mw: '#ece5d6', mb: '#2c2b2e', mq: '#e1694f', ms: '#efe6d2' }[kind];
      g.fillStyle = base; g.fillRect(0, 0, W, W);
      const N = X.makeNoise(kind.length * 7 + kind.charCodeAt(0));
      if (kind === 'w' || kind === 'b' || kind === 'q') {   // grain + turned rings
        const img = g.getImageData(0, 0, W, W), d = img.data;
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 2, y / W * 9, 2), i = (y * W + x) * 4, k = (n - .5) * (kind === 'w' ? 14 : kind === 'b' ? 12 : 10); /* soft grain: fine contrast shimmered on small men */ d[i] += k; d[i + 1] += k; d[i + 2] += k; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = kind === 'b' ? 'rgba(255,230,200,.18)' : 'rgba(60,30,10,.32)';
        for (const r of [.88, .62, .36]) { g.lineWidth = W * .018; g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); }
        if (kind === 'q') { g.fillStyle = 'rgba(255,230,180,.28)'; g.beginPath(); g.arc(c, c, c * .16, 0, 7); g.fill(); }
      } else if (kind === 's') {   // a printed red star in a ring
        g.strokeStyle = '#c3271f'; g.lineWidth = W * .03; g.beginPath(); g.arc(c, c, c * .82, 0, 7); g.stroke();
        g.fillStyle = '#c3271f'; g.beginPath();
        for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, r = (k % 2 ? .26 : .62) * c; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); }
        g.closePath(); g.fill();
      } else {   // modern: matte, a brass pip (men) or a brass ring (striker)
        const img = g.getImageData(0, 0, W, W), d = img.data;
        for (let i = 0; i < d.length; i += 4) { const r = (Math.random() - .5) * 3; d[i] += r; d[i + 1] += r; d[i + 2] += r; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = kind === 'mb' ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)'; g.lineWidth = W * .012; g.beginPath(); g.arc(c, c, c * .72, 0, 7); g.stroke();
        g.fillStyle = '#c69a45';
        if (kind === 'ms') { g.strokeStyle = '#c69a45'; g.lineWidth = W * .07; g.beginPath(); g.arc(c, c, c * .62, 0, 7); g.stroke(); }
        else { g.beginPath(); g.arc(c, c, c * .17, 0, 7); g.fill(); }
      }
    });
    return t;
  }

  /* ---------- geometry ---------- */
  const geos = {};
  // a carrom man / the striker: a flat disc with a softly rounded rim
  function discGeo(r, h) {
    const key = r.toFixed(4) + h.toFixed(4) + (LO() ? 'l' : 'h'); if (geos[key]) return geos[key];
    const TT = T(), b = h * .32, st = LO() ? 3 : 4, pts = [new TT.Vector2(0.001, 0)];
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new TT.Vector2(.001, h));
    const g = new TT.LatheGeometry(pts, LO() ? 20 : 30);
    const P = g.attributes.position, UV = g.attributes.uv;   // planar UVs from above (the face texture lies flat on the top)
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * r) + .5, P.getZ(i) / (2 * r) + .5);
    g.computeVertexNormals(); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function frameGeo(look) {
    const key = 'frame' + look; if (geos[key]) return geos[key];
    const TT = T(), o = S + FW, ri = 2.4 * K, ro = .12;
    const sh = new TT.Shape(); { const r = ro, a = -o, b = o; sh.moveTo(a + r, a); sh.lineTo(b - r, a); sh.quadraticCurveTo(b, a, b, a + r); sh.lineTo(b, b - r); sh.quadraticCurveTo(b, b, b - r, b); sh.lineTo(a + r, b); sh.quadraticCurveTo(a, b, a, b - r); sh.lineTo(a, a + r); sh.quadraticCurveTo(a, a, a + r, a); }
    const hole = new TT.Path(); { const r = ri, a = -S, b = S; hole.moveTo(a + r, a); hole.lineTo(b - r, a); hole.quadraticCurveTo(b, a, b, a + r); hole.lineTo(b, b - r); hole.quadraticCurveTo(b, b, b - r, b); hole.lineTo(a + r, b); hole.quadraticCurveTo(a, b, a, b - r); hole.lineTo(a, a + r); hole.quadraticCurveTo(a, a, a + r, a); }
    sh.holes.push(hole);
    const bev = look === 'modern' ? .02 : .045;
    const g = new TT.ExtrudeGeometry(sh, { depth: TOP + FH - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: LO() ? 2 : 3, curveSegments: LO() ? 4 : 8 });
    g.rotateX(-Math.PI / 2); g.translate(0, bev, 0);
    // UVs along the rails (wood grain runs along each rail)
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) { const x = P.getX(i), z = P.getZ(i), y = P.getY(i); const along = Math.abs(x) > Math.abs(z) ? z : x; UV.setXY(i, along / 3 + .5, (Math.max(Math.abs(x), Math.abs(z)) + y) / 1.4); }
    g.computeVertexNormals(); if (X.share) X.share(g);
    return (geos[key] = g);
  }
  function surfaceGeo() {
    if (geos.surf) return geos.surf;
    const TT = T(), sh = new TT.Shape(); sh.moveTo(-S, -S); sh.lineTo(S, -S); sh.lineTo(S, S); sh.lineTo(-S, S); sh.closePath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const h = new TT.Path(); h.absarc(sx * PC, sy * PC, RP, 0, Math.PI * 2, true); sh.holes.push(h); }
    const g = new TT.ShapeGeometry(sh, LO() ? 16 : 32); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, (P.getX(i) + S) / (2 * S), 1 - (P.getZ(i) + S) / (2 * S));
    if (X.share) X.share(g);
    return (geos.surf = g);
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    const TT = T();
    if (look === 'modern') return mat('bm' + look, () => ({
      surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .5, metalness: 0, clearcoat: .55, clearcoatRoughness: .3, envMapIntensity: .7 }),
      frame: phys({ color: '#1e2544', roughness: .42, metalness: 0, clearcoat: .7, clearcoatRoughness: .35, envMapIntensity: .9 }),
      brass: phys({ color: '#c79a48', roughness: .3, metalness: 1, envMapIntensity: 1.2 }),
      cup: phys({ color: '#141414', roughness: .9 }),
      net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }),
    }));
    return mat('bm' + look, () => {
      const fw = X.wood('crRose', '#6a2c1a', '#2a0f08', SZ(1024), SZ(256), 1.4); fw.wrapS = fw.wrapT = TT.RepeatWrapping;
      return {
        surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .22, metalness: 0, clearcoat: .9, clearcoatRoughness: .12, envMapIntensity: .85 }),
        frame: phys({ map: fw, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: 1 }),
        brass: null,
        cup: phys({ color: '#0f0d0c', roughness: .9 }),
        net: phys({ map: netTex(), color: '#ffffff', roughness: 1 }),
      };
    });
  }
  function pieceMat(look, c) {
    const m = look === 'modern' ? 'm' + c : c;
    return mat('pc' + m, () => {
      const t = faceTex(m), side = { w: '#e7d3ad', b: '#211813', q: '#a91f22', s: '#ece8de', mw: '#e3dccb', mb: '#26252a', mq: '#d55d45', ms: '#e7dcc5' }[m];
      const glossy = look === 'classic';
      const top = phys({ map: t, color: '#ffffff', roughness: glossy ? (c === 's' ? .3 : .38) : .62, clearcoat: glossy ? .35 : undefined, clearcoatRoughness: glossy ? .35 : undefined, envMapIntensity: glossy ? .85 : .6 });   // (no bump map: on discs this small it sparkled as the camera moved)
      return { top, side: phys({ color: side, roughness: glossy ? .34 : .6, clearcoat: glossy ? .5 : undefined, clearcoatRoughness: glossy ? .25 : undefined, envMapIntensity: glossy ? .9 : .55 }) };
    });
  }
  // a piece: the lathe disc with the face material on top (the texture is planar, so the top and rim share one material);
  // the rim keeps the face's colour from the texture's border — the face map is a solid base colour at its edges
  function pieceGroup(look, c) {
    const TT = T(), striker = c === 's', r = striker ? RS : RM, h = striker ? HS : HM, M2 = pieceMat(look, c);
    const g = new TT.Group(), body = new TT.Mesh(discGeo(r, h), M2.top); body.castShadow = true; body.receiveShadow = false; g.add(body);   // (no self-shadow: thin discs flickered with shadow acne)
    if (look === 'modern' && striker) { const ring = new TT.Mesh(geos.ring || (geos.ring = (() => { const q = new TT.TorusGeometry(r - .004, .006, 6, 36); q.rotateX(Math.PI / 2); if (X.share) X.share(q); return q; })()), boardMats('modern').brass); ring.position.y = h * .55; g.add(ring); }
    g.userData = { c, r, h };
    return g;
  }

  /* ---------- the board ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look);
    const frame = new TT.Mesh(frameGeo(look), BM.frame); frame.castShadow = frame.receiveShadow = true; g.add(frame);
    const surf = new TT.Mesh(surfaceGeo(), BM.surf); surf.position.y = TOP; surf.receiveShadow = true; g.add(surf);
    // a base under the surface (seen through the pockets' rims) and the pocket cups with their nets
    const base = new TT.Mesh(new TT.BoxGeometry(2 * S, .04, 2 * S), BM.cup); base.position.y = .03; g.add(base);
    const cupG = geos.cup || (geos.cup = (() => { const q = new TT.CylinderGeometry(RP, RP * .92, TOP - .05, LO() ? 16 : 28, 1, true); if (X.share) X.share(q); return q; })());
    const netG = geos.net || (geos.net = (() => { const q = new TT.CircleGeometry(RP * .92, LO() ? 16 : 28); q.rotateX(-Math.PI / 2); if (X.share) X.share(q); return q; })());
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const cup = new TT.Mesh(cupG, new TT.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, side: TT.BackSide })); cup.position.set(sx * PC, (TOP + .05) / 2, sz * PC); g.add(cup);
      const net = new TT.Mesh(netG, BM.net); net.position.set(sx * PC, .07, sz * PC); g.add(net);
      if (BM.brass) { const rg = geos.prim || (geos.prim = (() => { const q = new TT.TorusGeometry(RP + .012, .014, 6, LO() ? 20 : 36); q.rotateX(Math.PI / 2); if (X.share) X.share(q); return q; })()); const rim = new TT.Mesh(rg, BM.brass); rim.position.set(sx * PC, TOP + .004, sz * PC); g.add(rim); }
    }
    if (BM.brass) {   // brass edging along the frame's top inner edge
      const e = new TT.Mesh(new TT.BoxGeometry(2 * (S + FW) - .02, .012, .03), BM.brass);
      for (const [x, z, ry] of [[0, -(S + FW) + .03, 0], [0, S + FW - .03, 0], [-(S + FW) + .03, 0, Math.PI / 2], [S + FW - .03, 0, Math.PI / 2]]) { const m = e.clone(); m.position.set(x, TOP + FH + .006, z); m.rotation.y = ry; g.add(m); }
    }
    const U = g.userData;
    U.top = TOP; U.K = K; U.S = S; U.look = look; U.H = HM; U.HS = HS; U.R = RM; U.RS = RS; U.FH = FH;
    U.xz = (x, y) => [x * K, y * K];
    U.piece = c => pieceGroup(look, c);
    U.striker = () => pieceGroup(look, 's');
    return g;
  }

  X.MODELS.carrom = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: the opening arrangement just after a gentle break, the striker on the near base line
    const U = g.userData, E = window.CarromEngine;
    const pcs = E ? E.layout() : [];
    // (no nudges inside the arrangement: the men touch there, and an overlap made the centre flicker)
    const nudge = {};
    // a few men already round the board, as in a game (taken from the outer ring)
    const moved = { 7: [12, 14], 11: [-18, 20], 13: [24, -9], 15: [-30.5, -30] };
    pcs.forEach(p => {
      const c = p.c, m = U.piece(c), [dx, dy] = nudge[p.id] || [0, 0], mv = moved[p.id], [x, z] = mv ? U.xz(mv[0], mv[1]) : U.xz(p.x + dx, p.y + dy);
      m.position.set(x, TOP, z); g.add(m);
      const sh = X.contact(RM * 1.15, .4); sh.position.set(x, TOP + .004, z); g.add(sh);
    });
    const st = U.striker(), [x, z] = U.xz(-6, 25.26); st.position.set(x, TOP, z); g.add(st); const sh = X.contact(RS * 1.15, .45); sh.position.set(x, TOP + .004, z); g.add(sh);
    return g;
  };
  X.carrom = { board, LOOKS, K };
})();
