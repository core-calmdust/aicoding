/* =====================================================================
   Janggi on the 3D table — a thick Korean janggi board (장기판): a block of
   pale ginkgo-like wood on four short feet, black ink lines (no river), both
   palaces with their diagonals, small cross marks at the soldiers' and
   cannons' points; octagonal pieces in three sizes (general big; chariot,
   cannon, horse, elephant middle; guard and soldier small), the characters
   cut in and filled — Cho 楚 green (moves first), Han 漢 red.
   Registers into Table3D:
     Table3D.MODELS.janggi(live)   board (+ the opening position unless live)
     userData: { top, u, W, D, pt(i, j) → [x, z], piece(code) → Group }
     piece: children[0] = body, children[1] = the face (games turn it with rotation.z); code = type | 8 for Han
   Units: one point step u = 0.9; the lines span 8u × 9u.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const u = .9, MG = .55, H = .62, FEET = .16;
  const W = 8 * u + 2 * MG, D = 9 * u + 2 * MG;
  const MIN = '"Noto Serif KR","Noto Serif CJK KR","Noto Serif SC","Noto Serif CJK JP","Shippori Mincho B1","Songti SC",serif';
  const BRUSH = '"Yuji Syuku","Noto Serif KR","Shippori Mincho B1",serif';
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());

  /* ---------- the top: pale wood, black lines, palaces, cross marks ---------- */
  function topTex() {
    return canvasTex('jgTop1', SZ(2048), SZ(Math.round(2048 * D / W)), (c, CW, CH) => {
      const wd = X.wood ? X.wood('jgWood', '#ecd29b', '#cfa868', 1024, 1024, 2.2) : null;
      c.fillStyle = '#e8cd96'; c.fillRect(0, 0, CW, CH);
      if (wd) { c.globalAlpha = .55; c.drawImage(wd.image, 0, 0, CW, CH); c.globalAlpha = 1; }
      const k = CW / W; c.save(); c.scale(k, CH / D);
      const X0 = i => MG + i * u, Y0 = j => MG + j * u;
      c.strokeStyle = 'rgba(28,18,8,.9)'; c.lineCap = 'square';
      c.lineWidth = .028; c.beginPath();
      for (let j = 0; j < 10; j++) { c.moveTo(X0(0), Y0(j)); c.lineTo(X0(8), Y0(j)); }
      for (let i = 0; i < 9; i++) { c.moveTo(X0(i), Y0(0)); c.lineTo(X0(i), Y0(9)); }
      c.moveTo(X0(3), Y0(0)); c.lineTo(X0(5), Y0(2)); c.moveTo(X0(5), Y0(0)); c.lineTo(X0(3), Y0(2));
      c.moveTo(X0(3), Y0(7)); c.lineTo(X0(5), Y0(9)); c.moveTo(X0(5), Y0(7)); c.lineTo(X0(3), Y0(9));
      c.stroke();
      // the soldiers' and cannons' points: small crosses (as on many janggi boards)
      c.lineWidth = .018; c.beginPath();
      const a = u * .07, b = u * .2;
      [[1, 2], [7, 2], [1, 7], [7, 7], [0, 3], [2, 3], [4, 3], [6, 3], [8, 3], [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]].forEach(([i, j]) => {
        for (const dx of [-1, 1]) { if ((dx < 0 && i === 0) || (dx > 0 && i === 8)) continue; for (const dy of [-1, 1]) { c.moveTo(X0(i) + dx * a, Y0(j) + dy * b); c.lineTo(X0(i) + dx * a, Y0(j) + dy * a); c.lineTo(X0(i) + dx * b, Y0(j) + dy * a); } }
      });
      c.stroke();
      // a double border round the lines
      c.lineWidth = .045; c.strokeRect(X0(0) - .16, Y0(0) - .16, 8 * u + .32, 9 * u + .32);
      c.lineWidth = .014; c.strokeRect(X0(0) - .24, Y0(0) - .24, 8 * u + .48, 9 * u + .48);
      c.restore();
    });
  }
  function sideTex() {
    return X.wood ? X.wood('jgSide', '#d9b277', '#a87a42', 512, 256, 3) : null;
  }

  /* ---------- the board: a thick block with chamfered edges on four short feet ---------- */
  function board() {
    const TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const tex = topTex(); tex.anisotropy = 8;
    const top = mat('top', () => phys({ map: tex, color: 0xffffff, roughness: .55, clearcoat: .25, clearcoatRoughness: .4 }));
    const st = sideTex();
    const side = mat('side', () => phys({ map: st || null, color: st ? 0xf2dcb4 : 0xc99a5c, roughness: .55, clearcoat: .2, clearcoatRoughness: .5 }));
    const foot = mat('foot', () => phys({ color: 0x3a2414, roughness: .45, clearcoat: .5, clearcoatRoughness: .3 }));
    const block = new TT.Mesh(new TT.BoxGeometry(W, H, D), [side, side, top, side, side, side]);
    block.position.y = FEET + H / 2; block.castShadow = true; block.receiveShadow = true; base.add(block);
    // a darker band round the foot of the block
    const band = new TT.Mesh(new TT.BoxGeometry(W + .02, .05, D + .02), foot); band.position.y = FEET + .025; base.add(band);
    // four short turned feet, set in from the corners
    const fg = new TT.CylinderGeometry(.34, .28, FEET, LO() ? 12 : 20);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = new TT.Mesh(fg, foot); f.position.set(sx * (W / 2 - .7), FEET / 2, sz * (D / 2 - .7)); f.castShadow = true; base.add(f); }
    if (X.mergeStatic) { try { X.mergeStatic(base); } catch (err) {} }
    g.userData.top = FEET + H + .001; g.userData.u = u; g.userData.W = W; g.userData.D = D;
    g.userData.pt = (i, j) => [(i - 4) * u, (j - 4.5) * u];   // i: file 0..8 left → right, j: rank 0..9 far → near
    g.userData.piece = piece;
    return g;
  }

  /* ---------- pieces: octagonal blocks, three sizes ---------- */
  const SIZE = [0, .5, .34, .42, .42, .42, .42, .34];   // radius (× u) by type: general, guard, elephant, horse, chariot, cannon, soldier
  const PH = u * .3, TYPE = ' KAEHRCP';
  const GL = { r: ' 楚士象馬車包卒', b: ' 漢士象馬車包兵' };
  const geos = {};
  function bodyGeo(tp) {
    const r = SIZE[tp] * u, key = 'b' + r; if (geos[key]) return geos[key];
    const TT = T(), R = r / Math.cos(Math.PI / 8);   // (the flat sides at distance r)
    const g = new TT.CylinderGeometry(R * .97, R, PH, 8, 1); g.rotateY(Math.PI / 8); g.translate(0, PH / 2, 0);
    if (X.share) X.share(g); return (geos[key] = g);
  }
  function faceGeo(tp) {
    const r = SIZE[tp] * u * .97, key = 'f' + r; if (geos[key]) return geos[key];
    const TT = T(), R = r / Math.cos(Math.PI / 8), g = new TT.CircleGeometry(R, 8); g.rotateZ(Math.PI / 8);
    if (X.share) X.share(g); return (geos[key] = g);
  }
  function faceTex(code) {
    const han = code >= 8, tp = code & 7, ch = GL[han ? 'b' : 'r'][tp];
    return canvasTex('jgFace1_' + code, 256, 256, (c, Wd) => {
      const r = Wd / 2, R = r / Math.cos(Math.PI / 8);
      const gr = c.createRadialGradient(r * .75, r * .65, r * .05, r, r, r * 1.05); gr.addColorStop(0, '#fbf0d6'); gr.addColorStop(.7, '#efd9ad'); gr.addColorStop(1, '#d9b98a');
      c.fillStyle = gr; c.fillRect(0, 0, Wd, Wd);
      const wd = X.wood ? X.wood('jgPw', '#f2dcae', '#cfa96f', 256, 256, 1.6) : null;
      if (wd) { c.globalAlpha = .3; c.globalCompositeOperation = 'multiply'; c.drawImage(wd.image, 0, 0, Wd, Wd); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      const ink = han ? '#b8231b' : '#13705c';
      const oct = s => { c.beginPath(); for (let k = 0; k < 8; k++) { const a = Math.PI / 8 + k * Math.PI / 4; const x = r + Math.cos(a) * R * s, y = r + Math.sin(a) * R * s; if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); };
      const engrave = draw => {
        c.save(); c.translate(Wd * .006, Wd * .008); draw('rgba(255,246,222,.9)'); c.restore();
        c.save(); c.translate(-Wd * .005, -Wd * .006); draw('rgba(70,40,15,.5)'); c.restore();
        draw(ink);
      };
      engrave(col => { c.strokeStyle = col; c.lineWidth = Wd * .02; oct(.84); c.stroke(); });
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `${han ? 900 : 700} ${Math.round(Wd * (tp === 1 ? .6 : .56))}px ${han ? MIN : BRUSH}`;   // Cho: a brushier hand
      engrave(col => { c.fillStyle = col; c.fillText(ch, r, r + Wd * .03); });
    });
  }
  function piece(code, o = {}) {
    const TT = T(), han = code >= 8, tp = code & 7;
    const wood = mat('pw', () => phys({ color: 0xe9cf9c, roughness: .45, clearcoat: .4, clearcoatRoughness: .3 }));
    const fm = mat('pf' + code, () => phys({ map: faceTex(code), color: 0xffffff, roughness: .45, clearcoat: .35, clearcoatRoughness: .35 }));
    const body = new TT.Mesh(bodyGeo(tp), wood); body.castShadow = true; body.receiveShadow = true;
    const cap = new TT.Mesh(faceGeo(tp), fm); cap.rotation.x = -Math.PI / 2; cap.position.y = PH + .002; cap.receiveShadow = true;
    const p = new TT.Group(); p.add(body, cap); p.userData = { code, type: TYPE[tp], black: han, h: PH, r: SIZE[tp] * u };
    return p;
  }

  X.MODELS.janggi = function (live) {
    const g = board(), Y0 = g.userData.top;
    if (live) return g;
    // the opening position (상마상마 on both sides), a cannon already jumped
    const start = ['rbna.abnr', '....k....', '.c.....c.', 'p.p.p.p.p', '.........', '.........', 'P.P.P.P.P', '.C.....C.', '....K....', 'RBNA.ABNR'];
    start.forEach((row, j) => [...row].forEach((chx, i) => {
      if (chx === '.') return; const han = chx === chx.toLowerCase(), t = ' kabnrcp'.indexOf(chx.toLowerCase());
      const p = piece(t | (han ? 8 : 0)), [x, z] = g.userData.pt(i, j); p.position.set(x, Y0, z); g.add(p);
      const sh = X.contact(SIZE[t] * u * 1.05, .5); sh.position.set(x, Y0 + .001, z); g.add(sh);
    }));
    g.scale.setScalar(1.1);   // the long side ≈ 10.1 (portal display-board size rule)
    return g;
  };
  X.janggi = { board, piece, u, W, D, SIZE, PH };
})();
