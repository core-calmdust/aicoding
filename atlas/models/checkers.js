/* =====================================================================
   Checkers (English draughts) on the 3D table — a luxury lacquered board:
   high-gloss grey-black burl and ivory squares inside a burl border,
   a thick rounded frame of swirled gold / grey / white marble resin;
   polished metal checkers (silver and gold) with concentric ring grooves
   on the top, kings stacked two high with a little crown.
   The lacquer mirrors the pieces (stencil reflections, PC only).
   Registers into Table3D (replaces the simple builder in table3d.js):
     Table3D.MODELS.checkers(live)   board (+ a mid-game position unless live)
     userData: { S, top, pt(x, y) → [x, z], piece(color 'w'|'g', king) → Group }
   Units: one square is 1.0; the field 8 × 8.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex, makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const S = 8, MG = .36, FR = .56, HF = .3, HT = .5;   // field, burl border round the squares, marble frame width, field height, frame height
  const IN = S + 2 * MG, OW = IN + 2 * FR;
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {   // lite: the standard shader (no clearcoat)
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());

  /* ---------- textures ---------- */
  const raw = {};
  function pix(key, Wd, Ht, f) {   // a plain canvas filled pixel by pixel: f(u, v) → [r, g, b]
    if (raw[key]) return raw[key];
    const c = document.createElement('canvas'); c.width = Wd; c.height = Ht; const g = c.getContext('2d'), img = g.createImageData(Wd, Ht), d = img.data;
    for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { const v = f(x / Wd, y / Ht), i = (y * Wd + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return (raw[key] = c);
  }
  const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  // grey-black burl: domain-warped noise, swirling figure, clusters of tiny dark knots
  function burl(W) {
    const N = makeNoise(29), A = hexRGB('#626265'), B = hexRGB('#18181b'), TAU = Math.PI * 2;
    return pix('ckBurl', W, W, (x, y) => {
      const px = x * 7 + 3, py = y * 7 + 3;
      const q = N(px * 1.4, py * 1.4, 3), r = N(px * 1.6 + q * 3.2 + 1.7, py * 1.6 + q * 3.2 + 9.2, 3);
      const f = N(px * 2.6 + r * 4.2, py * 2.6 + r * 4.2, 4);
      const band = Math.sin((f * 9 + r * 5) * TAU) * .5 + .5, fine = N(px * 22 + r * 6, py * 22 + r * 6, 2);
      let t = .5 + Math.pow(band, 1.8) * .2 + (fine - .5) * .34 + (q - .5) * .3;
      const eye = N(px * 30, py * 30, 1), cl = N(px * 3.3 + 7, py * 3.3 + 1, 2); if (cl > .58 && eye > .74) t += (eye - .74) * 3;
      return mix(A, B, Math.max(0, Math.min(1, t)));
    });
  }
  // ivory: a warm white with very fine straight fibres and a soft cloud
  function ivory(W) {
    const N = makeNoise(53);
    return pix('ckIvory', W, W, (x, y) => { const t = (N(x * 3, y * 160, 2) - .5) * .5 + (N(x * 2.5, y * 2.5, 3) - .5) * .6; return [228 - t * 14, 221 - t * 16, 203 - t * 22]; });
  }
  // marbled resin: long swirled streaks of olive-grey, gold and white (stretched along the frame)
  function marble() {
    const N = makeNoise(17), TAU = Math.PI * 2;
    const C = [hexRGB('#23221c'), hexRGB('#4a4636'), hexRGB('#7a6c48'), hexRGB('#a98d52'), hexRGB('#8d8c86'), hexRGB('#ebe8df')];
    return pix('ckMarble2', SZ(1024), SZ(512), (x, y) => {
      const px = x * 6, py = y * 4;
      const w1 = N(px * .5, py * 1.2, 4), w2 = N(px * 1.6 + w1 * 2, py * 3 + w1 * 2, 3);
      const f = py * 2.2 + w1 * 1.6 + w2 * .7;   // long streaks along u, gently waving
      const b = Math.sin(f * TAU) * .5 + .5, fine = N(px * 5 + w2 * 3, py * 30 + w2 * 6, 2);
      const vein = Math.pow(1 - Math.abs(Math.sin((f * 2.7 + fine * .9) * Math.PI)), 34);
      let col;
      if (b < .35) col = mix(C[0], C[1], b / .35);
      else if (b < .7) col = mix(C[1], C[2], (b - .35) / .35);
      else col = mix(C[2], C[3], (b - .7) / .3);
      const grey = N(px * .7 + 9, py * 2 + 3, 3); if (grey > .6) col = mix(col, C[4], Math.min(.8, (grey - .6) * 2.5));
      col = mix(col, C[5], vein * .85);
      const k = 1 + (fine - .5) * .22; return [col[0] * k, col[1] * k, col[2] * k];
    });
  }
  function fieldTex() {
    return canvasTex('ckField1', SZ(2048), SZ(2048), (c, Wd) => {
      const k = Wd / IN, BU = burl(SZ(768)), IV = ivory(SZ(512)), rnd = makeNoise(5);
      c.drawImage(BU, 0, 0, BU.width * .8, BU.width * .8, 0, 0, Wd, Wd);   // the border and the dark squares: one burl sheet
      const o = MG * k, s = k;
      for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
        if ((r + f) % 2) continue;   // dark squares stay burl
        const x = o + f * s, y = o + r * s, sw = IV.width * .45, ox = rnd(f * 3.1, r * 2.7, 1) * (IV.width - sw), oy = rnd(r * 1.9 + 4, f * 2.3, 1) * (IV.width - sw);
        c.save(); c.beginPath(); c.rect(x, y, s, s); c.clip();
        if ((f + r) % 4 === 0) { c.translate(x + s / 2, y + s / 2); c.rotate(Math.PI / 2); c.translate(-x - s / 2, -y - s / 2); }
        c.drawImage(IV, ox, oy, sw, sw, x, y, s, s); c.restore();
      }
      c.strokeStyle = 'rgba(20,20,22,.35)'; c.lineWidth = Math.max(1, k * .008);   // hairline joints
      for (let i = 0; i <= 8; i++) { c.beginPath(); c.moveTo(o + i * s, o); c.lineTo(o + i * s, o + 8 * s); c.moveTo(o, o + i * s); c.lineTo(o + 8 * s, o + i * s); c.stroke(); }
      c.strokeStyle = 'rgba(232,226,210,.55)'; c.lineWidth = k * .02; c.strokeRect(o - k * .07, o - k * .07, 8 * s + k * .14, 8 * s + k * .14);   // a fine pale inlay line
      const g = c.createRadialGradient(Wd / 2, Wd / 2, Wd * .3, Wd / 2, Wd / 2, Wd * .72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)'); c.fillStyle = g; c.fillRect(0, 0, Wd, Wd);
    });
  }

  /* ---------- the marble frame: a profile swept round the square (mitred corners) ---------- */
  function sweep(A, prof) {
    const TT = T(), P = [], N = [], UV = [], idx = [], nrm = [], arc = [0];
    for (let i = 0; i < prof.length; i++) {
      let nd = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) { if (a < 0 || b >= prof.length) continue; const dd = prof[b][0] - prof[a][0], dy = prof[b][1] - prof[a][1], L = Math.hypot(dd, dy); if (L < 1e-6) continue; nd += -dy / L; ny += dd / L; }
      const L = Math.hypot(nd, ny) || 1; nrm.push([nd / L, ny / L]);
      if (i) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    }
    const tot = arc[arc.length - 1];
    [[[0, 0, -1], [1, 0, 0]], [[1, 0, 0], [0, 0, 1]], [[0, 0, 1], [-1, 0, 0]], [[-1, 0, 0], [0, 0, -1]]].forEach(([o, e], si) => {
      const base = P.length / 3;
      prof.forEach(([d, y], i) => {
        const L = A - d, [nd, ny] = nrm[i];
        for (const s of [-L, L]) {
          P.push(o[0] * (A - d) + e[0] * s, y, o[2] * (A - d) + e[2] * s); N.push(-o[0] * nd, ny, -o[2] * nd);
          UV.push((s + A) / (2 * A) * .62 + (si & 1) * .3, arc[i] / tot * .38 + si * .15);   // each side its own part of the marble sheet
        }
      });
      for (let i = 0; i < prof.length - 1; i++) { if (arc[i + 1] - arc[i] < 1e-6) continue; const a = base + i * 2; idx.push(a, a + 3, a + 1, a, a + 2, a + 3); }
    });
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(UV, 2));
    g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  function board() {
    const TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const ft = fieldTex(); ft.anisotropy = 8;
    const top = mat('top', () => { const m = phys({ map: ft, color: 0xffffff, roughness: .14, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.5 });
      Object.assign(m, { stencilWrite: true, stencilRef: 2, stencilFunc: TT.AlwaysStencilFunc, stencilZPass: TT.ReplaceStencilOp }); return m; });   // marks where reflections may show
    const frameM = mat('frame', () => { const mt = new TT.CanvasTexture(marble()); mt.encoding = TT.sRGBEncoding; mt.anisotropy = 4; mt.wrapS = mt.wrapT = TT.RepeatWrapping; return phys({ map: mt, color: 0xffffff, roughness: .2, metalness: .12, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.3 }); });
    const dark = mat('groove', () => phys({ color: 0x141414, roughness: .4 }));
    // profile: the outer wall, a full rounded top edge, a flat top, a smaller round into the inner wall, down to the field, a dark step at the foot
    const A = OW / 2, r1 = .17, r2 = .07, prof = [[0, 0], [0, HT - r1]], st = LO() ? 4 : 7;
    for (let i = 1; i <= st; i++) { const a = i / st * Math.PI / 2; prof.push([r1 - Math.cos(a) * r1, HT - r1 + Math.sin(a) * r1]); }
    prof.push([FR - .08 - r2, HT]);
    for (let i = 1; i <= Math.ceil(st / 2); i++) { const a = i / Math.ceil(st / 2) * Math.PI / 2; prof.push([FR - .08 - r2 + Math.sin(a) * r2, HT - r2 + Math.cos(a) * r2]); }
    prof.push([FR - .08, HF + .06]);
    const fr = new TT.Mesh(sweep(A, prof), frameM); fr.castShadow = fr.receiveShadow = true; base.add(fr);
    const step = new TT.Mesh(sweep(A, [[FR - .08, HF + .06], [FR - .08, HF + .045], [FR, HF + .045], [FR, HF]]), dark); step.receiveShadow = true; base.add(step);   // a fine black step between frame and field
    const fg = new TT.PlaneGeometry(IN, IN); fg.rotateX(-Math.PI / 2);
    const field = new TT.Mesh(fg, top); field.position.y = HF; field.receiveShadow = true; field.renderOrder = -2; base.add(field);   // drawn first: the reflections test against it
    g.userData.S = S; g.userData.top = HF + .001; g.userData.outer = OW / S;
    g.userData.pt = (x, y) => [-S / 2 + x + .5, -S / 2 + y + .5];   // x: column left → right, y: row far → near
    g.userData.piece = piece;
    return g;
  }

  /* ---------- pieces: turned metal checkers, rings stepping down into the top, a small boss in the middle ---------- */
  const R = .39, PH = .18, geos = {};
  function profile(lo) {
    const p = [[0, 0], [R - .03, 0], [R - .008, .01], [R, .03], [R + .004, PH * .5], [R, PH - .03], [R - .01, PH - .008], [R - .035, PH]];
    if (lo) return p.concat([[R * .55, PH - .035], [R * .25, PH - .03], [0, PH - .02]]);
    // concentric grooves: ridge, V groove, ridge … each ring a little lower (the top is a shallow stepped dish)
    let r = R - .035, y = PH;
    for (let k = 0; k < 4; k++) {
      const w = .06 - k * .004, dy = .012;
      p.push([r - w * .35, y - .022], [r - w * .5, y - .026], [r - w * .65, y - .02], [r - w, y - dy]);   // the groove, then the next ridge crest
      r -= w; y -= dy;
    }
    p.push([r - .015, y - .016], [r * .55, y - .012], [r * .35, y + .012], [r * .12, y + .02], [0, y + .021]);   // a domed boss
    return p;
  }
  function pieceGeo(lo) {
    const key = lo ? 'lo' : LO() ? 'mid' : 'hi'; if (geos[key]) return geos[key];
    const TT = T(), g = new TT.LatheGeometry(profile(lo).map(([a, b]) => new TT.Vector2(a, b)), lo ? 14 : LO() ? 20 : 28);
    if (X.share) X.share(g); return (geos[key] = g);
  }
  function crownGeo() {   // a small open crown: a band with five points (one lathe-free extrusion, bent round a circle)
    if (geos.crown) return geos.crown;
    const TT = T(), n = LO() ? 30 : 50, rr = .17, h0 = .055, h1 = .135, P = [], N = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * Math.PI * 2, f = (i / n * 5) % 1, top = h0 + (h1 - h0) * Math.max(0, 1 - Math.abs(f - .5) * 3.2);
      const c = Math.cos(a), s = Math.sin(a);
      P.push(c * rr, 0, s * rr, c * rr, top, s * rr, c * (rr - .02), top, s * (rr - .02), c * (rr - .02), 0, s * (rr - .02));
      N.push(c, 0, s, c, .4, s, -c, .4, -s, -c, 0, -s);
      if (i < n) { const b = i * 4, q = b + 4; idx.push(b, b + 1, q + 1, b, q + 1, q, b + 1, b + 2, q + 2, b + 1, q + 2, q + 1, b + 2, b + 3, q + 3, b + 2, q + 3, q + 2); }
    }
    const g = new TT.BufferGeometry(); g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setIndex(idx);
    if (X.share) X.share(g); return (geos.crown = g);
  }
  function metal(col) {
    return mat('m' + col, () => phys(col === 'g' ? { color: 0xf0c25e, metalness: 1, roughness: .2, envMapIntensity: 1.4 } : { color: 0xe6e8ec, metalness: 1, roughness: .16, envMapIntensity: 1.4 }));
  }
  function refMat(col) {   // the mirror image in the lacquer: drawn before the pieces, only behind the lacquered top (stencil 2), one layer per pixel
    return mat('r' + col, () => { const TT = T(); return new TT.MeshBasicMaterial({ color: lin(col === 'g' ? 0xb88a3a : 0xa9adb3), opacity: .32, blending: TT.CustomBlending, blendSrc: TT.SrcAlphaFactor, blendDst: TT.OneMinusSrcAlphaFactor, blendSrcAlpha: TT.ZeroFactor, blendDstAlpha: TT.OneFactor,
      depthWrite: false, depthFunc: TT.GreaterDepth, stencilWrite: true, stencilRef: 2, stencilFunc: TT.EqualStencilFunc, stencilZPass: TT.IncrementStencilOp, stencilFail: TT.KeepStencilOp, stencilZFail: TT.KeepStencilOp }); });
  }
  // col 'w' silver / 'g' gold; king: two stacked with a crown; o.reflect: a mirror image under it (PC)
  function piece(col, king, o = {}) {
    const TT = T(), g = new TT.Group(), m = metal(col), n = king ? 2 : 1;
    const add = (geo, mt, y, par = g) => { const x = new TT.Mesh(geo, mt); x.position.y = y; x.castShadow = true; x.receiveShadow = true; par.add(x); return x; };
    for (let k = 0; k < n; k++) { const p = add(pieceGeo(false), m, k * (PH + .004)); p.rotation.y = k * .7; }
    if (king) add(crownGeo(), m, n * (PH + .004) - .03);
    g.userData = { col, king: !!king, h: n * PH };
    if (o.reflect && !LO()) {
      const r = new TT.Group(); r.scale.y = -1; r.userData.reflection = true; g.add(r);
      for (let k = 0; k < n; k++) { const x = add(pieceGeo(true), refMat(col), k * (PH + .004), r); x.castShadow = x.receiveShadow = false; x.renderOrder = -1; }
    }
    return g;
  }

  X.MODELS.checkers = function (live) {
    const g = board(), Y = g.userData.top;
    if (live) return g;
    // a game in progress: silver from the far side, gold from the near side, a king each
    const put = (x, y, col, king) => {
      const p = piece(col, king, { reflect: true }), [px, pz] = g.userData.pt(x, y); p.position.set(px, Y, pz); g.add(p);
      const sh = X.contact(R * .92, .55); sh.position.set(px, Y + .001, pz); g.add(sh);
    };
    [[1, 0], [5, 0], [0, 1], [2, 1], [4, 1], [6, 1], [1, 2], [3, 2], [7, 2], [2, 3]].forEach(([x, y]) => put(x, y, 'w'));
    [[4, 3], [3, 4], [7, 4], [0, 5], [2, 5], [4, 5], [6, 5], [1, 6], [5, 6], [0, 7], [6, 7]].forEach(([x, y]) => put(x, y, 'g'));
    put(7, 0, 'g', true); put(1, 4, 'w', true);
    g.scale.setScalar(.97);   // about the other boards' size on the chabudai
    return g;
  };
  X.checkers = { board, piece, S, OW };
})();
