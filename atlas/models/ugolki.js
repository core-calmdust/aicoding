/* =====================================================================
   Ugolki on the 3D table — a Gzhel porcelain board, built from the 2D page's own
   white-and-cobalt design (ugolki/img/bd-gzhel.webp: the glazed tiles,
   ugolki/img/fr-gzhel.webp: the hand-painted cobalt flowers of the frame):
   one glazed porcelain slab with rounded edges, the 8 × 8 field of slightly
   pillowed tiles with grout lines between them (a normal map under a clear,
   glossy glaze), a double cobalt rim round the field, painted flowers on the band;
   the pieces are glazed porcelain pucks, white with a cobalt flower and
   cobalt with a white flower (drawn here, after ugolki/img/pc-porcelain-1/2).
   Registers into Table3D:
     Table3D.MODELS.ugolki(live)   board (+ a race in progress unless live)
     Table3D.ugolki = { board, piece, W, H, R }
     userData: { S, top, pt(x, y) → [x, z] (x: column left → right, y: row far → near), piece(col 1 white | 2 cobalt) → Group }
   Units: one square is 1.0; the slab is 8.5 × 9.5 (the 2D page's frame).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const S = 8, W = 8.5, H = 9.5, TH = .42, RAD = .3, R = .4, PH = .2;
  const IMG = (() => { try { const s = document.currentScript && document.currentScript.src; if (s) return new URL('../../ugolki/img/', s).href; } catch (e) {} return '../ugolki/img/'; })();
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const WHITE = '#f3f5fa', COBALT = '#1d3f9a', COBALT2 = '#2b56c0';
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; delete p.clearcoatNormalMap; delete p.clearcoatNormalScale; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const loadImg = src => new Promise(res => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });

  /* ---------- the top: the 2D page's own pictures (tiles + painted frame) on one canvas, and a normal map of the tiles ---------- */
  let topT = null;
  function topTex() {
    if (topT) return topT;
    const TT = T(), ppu = SZ(LO() ? 110 : 150), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu);
    const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; const g = c.getContext('2d');
    const ox = (W - S) / 2 * ppu, oy = (H - S) / 2 * ppu, F = S * ppu;
    const base = () => {   // a porcelain white with a soft cool glaze cloud (while the pictures load, and under the frame's flowers)
      const gr = g.createLinearGradient(0, 0, Wp, Hp); gr.addColorStop(0, '#f6f8fc'); gr.addColorStop(.5, '#eef1f8'); gr.addColorStop(1, '#f4f6fb'); g.fillStyle = gr; g.fillRect(0, 0, Wp, Hp);
      g.fillStyle = COBALT; g.globalAlpha = .9; g.fillRect(ox, oy, F, F); g.globalAlpha = 1;
    };
    const rim = () => {   // the double cobalt rim round the field
      g.strokeStyle = COBALT2; g.lineWidth = ppu * .035; g.strokeRect(ox - ppu * .06, oy - ppu * .06, F + ppu * .12, F + ppu * .12);
      g.strokeStyle = 'rgba(29,63,154,.55)'; g.lineWidth = ppu * .012; g.strokeRect(ox - ppu * .13, oy - ppu * .13, F + ppu * .26, F + ppu * .26);
    };
    base(); rim();
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    Promise.all([loadImg(IMG + 'fr-gzhel.webp'), loadImg(IMG + 'bd-gzhel.webp')]).then(([fr, bd]) => {
      base();
      if (fr) {   // the painted flowers, as the 2D frame shows them (the picture is a 2 × 2 sheet of motifs, ~1.9 squares each)
        const tile = ppu * 3.8;
        g.save(); g.globalAlpha = .96;
        for (let y = -tile * .25; y < Hp; y += tile) for (let x = -tile * .3; x < Wp; x += tile) g.drawImage(fr, x, y, tile, tile);
        g.restore();
      }
      if (bd) g.drawImage(bd, ox, oy, F, F);
      rim();
      map.needsUpdate = true; if (X.kick) X.kick(300);
    });
    // the relief: each tile a gently pillowed glazed square, a grout groove between them, a raised rim line round the field
    const ns = SZ(LO() ? 48 : 64), nW = Math.round(W * ns), nH = Math.round(H * ns), n = document.createElement('canvas'); n.width = nW; n.height = nH;
    const ng = n.getContext('2d'), img = ng.createImageData(nW, nH), d = img.data, hh = new Float32Array(nW * nH);
    const hAt = (x, z) => {   // world x, z → height (relative)
      const u = x + S / 2, v = z + S / 2;
      if (u > -.02 && u < S + .02 && v > -.02 && v < S + .02) {
        const fu = u - Math.floor(u), fv = v - Math.floor(v), e = Math.min(fu, 1 - fu, fv, 1 - fv);
        if (e < .018) return -.03;                                   // grout
        const k = Math.min(1, (e - .018) / .1); return -.03 + .03 * Math.sin(k * Math.PI / 2);   // the rounded tile edge
      }
      const rr = Math.max(Math.abs(x), Math.abs(z)) - S / 2;       // distance outside the field (a square ring)
      if (rr > .02 && rr < .1) return .008 * Math.sin((rr - .02) / .08 * Math.PI);
      return 0;
    };
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) hh[y * nW + x] = hAt((x + .5) / ns - W / 2, (y + .5) / ns - H / 2);
    for (let y = 0; y < nH; y++) for (let x = 0; x < nW; x++) {
      const L = hh[y * nW + Math.max(0, x - 1)], Rr = hh[y * nW + Math.min(nW - 1, x + 1)], U = hh[Math.max(0, y - 1) * nW + x], D = hh[Math.min(nH - 1, y + 1) * nW + x];
      const dx = -(Rr - L) * ns / 2, dz = -(D - U) * ns / 2, l = Math.hypot(dx, 1, dz), i = (y * nW + x) * 4;
      d[i] = (dx / l * .5 + .5) * 255; d[i + 1] = (-dz / l * .5 + .5) * 255; d[i + 2] = (1 / l * .5 + .5) * 255; d[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
    const nm = new TT.CanvasTexture(n); nm.anisotropy = 4;
    return (topT = { map, nm });
  }

  /* ---------- the slab: a rounded, bevelled porcelain block ---------- */
  function slabGeo() {
    const TT = T(), sh = new TT.Shape(), a = W / 2 - RAD, b = H / 2 - RAD;
    sh.moveTo(-a, -H / 2); sh.lineTo(a, -H / 2); sh.absarc(a, -b, RAD, -Math.PI / 2, 0, false); sh.lineTo(W / 2, b); sh.absarc(a, b, RAD, 0, Math.PI / 2, false);
    sh.lineTo(-a, H / 2); sh.absarc(-a, b, RAD, Math.PI / 2, Math.PI, false); sh.lineTo(-W / 2, -b); sh.absarc(-a, -b, RAD, Math.PI, Math.PI * 1.5, false);
    const bv = .07, g = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .005, bevelSegments: LO() ? 3 : 5, curveSegments: LO() ? 6 : 10 });
    g.rotateX(-Math.PI / 2); g.translate(0, bv, 0);   // the bottom at 0, the top at TH
    g.scale((W - .01) / (W + 2 * (bv - .005)), 1, (H - .01) / (H + 2 * (bv - .005)));   // (the bevel grows the shape: keep the outer size W × H)
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / W + .5, .5 - P.getZ(i) / H);
    g.computeBoundingSphere();
    return g;
  }
  function board() {
    const TT = T(), g = new TT.Group(), tx = topTex();
    const topM = mat('top', () => phys({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), color: 0xffffff, roughness: .32, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, clearcoatNormalMap: tx.nm, clearcoatNormalScale: new TT.Vector2(.8, .8), envMapIntensity: 1.25 }));
    const sideM = mat('side', () => phys({ color: 0xf1f3f9, roughness: .3, clearcoat: 1, clearcoatRoughness: .06, envMapIntensity: 1.2 }));
    const slab = new TT.Mesh(slabGeo(), [topM, sideM]); slab.castShadow = slab.receiveShadow = true; g.add(slab);
    g.userData.S = S; g.userData.top = TH + .002; g.userData.W = W; g.userData.H = H;
    g.userData.pt = (x, y) => [-S / 2 + x + .5, -S / 2 + y + .5];
    g.userData.piece = piece;
    return g;
  }

  /* ---------- the pieces: glazed porcelain pucks with a painted flower ---------- */
  const geos = {};
  function pieceGeo() {
    const k = LO() ? 'lo' : 'hi'; if (geos[k]) return geos[k];
    const TT = T(), p = [[0, 0], [R - .05, 0], [R - .015, .012], [R, .045], [R + .006, PH * .5], [R - .004, PH - .055]];
    const st = LO() ? 4 : 6; for (let i = 1; i <= st; i++) { const a = i / st * Math.PI / 2; p.push([R - .05 + Math.cos(a) * .046, PH - .055 + Math.sin(a) * .055]); }
    p.push([R * .82, PH + .004], [R * .5, PH + .008], [0, PH + .009]);
    const g = new TT.LatheGeometry(p.map(([a, b]) => new TT.Vector2(a, b)), LO() ? 24 : 40); if (X.share) X.share(g); return (geos[k] = g);
  }
  function decalGeo() { if (geos.decal) return geos.decal; const g = new (T().CircleGeometry)(R * .8, LO() ? 24 : 40); g.rotateX(-Math.PI / 2); if (X.share) X.share(g); return (geos.decal = g); }
  // the painted face: an eight-petal flower with small inner petals, a dotted ring and a fine rim line (cobalt on white / white on cobalt)
  function decalTex(col) {
    return X.canvasTex('ugDecal' + col, SZ(512), SZ(512), (g, Wd) => {
      const bg = col === 1 ? WHITE : COBALT, ink = col === 1 ? COBALT : '#eef2fb', ink2 = col === 1 ? '#4f78d8' : '#ffffff', c = Wd / 2, r = Wd / 2;
      g.fillStyle = bg; g.fillRect(0, 0, Wd, Wd);
      if (col === 2) { const gr = g.createRadialGradient(c * .8, c * .7, 0, c, c, r); gr.addColorStop(0, '#2c58c4'); gr.addColorStop(1, '#173788'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); }
      else { const gr = g.createRadialGradient(c * .8, c * .7, 0, c, c, r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e6ebf5'); g.fillStyle = gr; g.fillRect(0, 0, Wd, Wd); }
      g.strokeStyle = ink; g.lineWidth = Wd * .012; g.beginPath(); g.arc(c, c, r * .9, 0, Math.PI * 2); g.stroke();
      g.fillStyle = ink; for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * r * .8, c + Math.sin(a) * r * .8, Wd * .009, 0, Math.PI * 2); g.fill(); }
      const petal = (a, len, wid, a0) => {   // a pointed brush stroke: dense at the base, the tip lighter
        g.save(); g.translate(c, c); g.rotate(a);
        const gr = g.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, ink); gr.addColorStop(.75, ink2); gr.addColorStop(1, ink);
        g.fillStyle = gr; g.globalAlpha = a0;
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * .45, -wid, len, 0); g.quadraticCurveTo(len * .45, wid, 0, 0); g.fill();
        g.globalAlpha = 1; g.strokeStyle = bg; g.lineWidth = Wd * .004; g.beginPath(); g.moveTo(len * .1, 0); g.lineTo(len * .8, 0); g.stroke();   // the vein
        g.restore();
      };
      for (let k = 0; k < 8; k++) petal(k / 8 * Math.PI * 2 - Math.PI / 2, r * .62, r * .17, .95);
      for (let k = 0; k < 8; k++) petal((k + .5) / 8 * Math.PI * 2 - Math.PI / 2, r * .3, r * .09, .85);
      g.fillStyle = bg; g.beginPath(); g.arc(c, c, r * .07, 0, Math.PI * 2); g.fill();
      g.fillStyle = ink; g.beginPath(); g.arc(c, c, r * .04, 0, Math.PI * 2); g.fill();
    });
  }
  function pieceMats(col) {
    return [mat('pb' + col, () => phys({ color: col === 1 ? 0xf4f6fb : 0x1f43a6, roughness: .28, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 })),
      mat('pd' + col, () => phys({ map: decalTex(col), color: 0xffffff, roughness: .28, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 }))];
  }
  // col 1 white (White) / 2 cobalt (Black)
  function piece(col) {
    const TT = T(), g = new TT.Group(), [mb, md] = pieceMats(col);
    const body = new TT.Mesh(pieceGeo(), mb); body.castShadow = body.receiveShadow = true; g.add(body);
    const face = new TT.Mesh(decalGeo(), md); face.position.y = PH + .0095; face.receiveShadow = true; g.add(face);
    g.userData = { col, h: PH };
    return g;
  }

  X.MODELS.ugolki = function (live) {
    const g = board(), U = g.userData, Y = U.top;
    if (live) return g;
    // a race in progress: White (from the bottom-left) and cobalt (from the top-right) on their way
    const put = (x, y, col) => { const p = piece(col), [px, pz] = U.pt(x, y); p.position.set(px, Y, pz); g.add(p); const sh = X.contact(R * .95, .5); sh.position.set(px, Y + .001, pz); g.add(sh); };
    [[0, 7], [1, 7], [0, 6], [2, 6], [1, 5], [3, 5], [2, 4], [4, 4], [3, 3]].forEach(([x, y]) => put(x, y, 1));
    [[7, 0], [6, 0], [7, 1], [5, 1], [6, 2], [4, 2], [5, 3], [7, 3], [3, 1]].forEach(([x, y]) => put(x, y, 2));
    g.scale.setScalar(.95);
    return g;
  };
  X.ugolki = { board, piece, W, H, R, S };
})();
