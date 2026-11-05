/* =====================================================================
   Alquerque (al-qirkat) on the 3D table — a Damascene inlaid board: the game came from the Arab world
   (named in the 10th-century Kitab al-Aghani) to Spain, so the board is made the way Damascus workshops
   make their game boards and boxes: dark walnut, a border of tessellated marquetry (bone, ebony and
   lemonwood triangles and a chequer of tiny diamonds between bone stringing), eight-pointed khatam stars
   of mother-of-pearl in the corners, a lighter field with a faint khatam rosette, the lines inlaid as
   mother-of-pearl strips edged in ebony and every point a brass stud; the captured pieces wait in two
   velvet-lined trays sunk into the board above and below the field.
   Pieces: brass discs engraved with an eight-pointed star, and bronze discs with a cobalt enamel face
   (cloisonné gold star) — the 2D page's brass / blue set.
   Registers into Table3D:
     Table3D.MODELS.alquerque(live)   board (+ a game in progress unless live)
     Table3D.alquerque = { board(rule), piece, dims, R, TH }
     userData (the same as atlas/models/fanorona.js, so the Fanorona page skin / table play drive it):
       { NC, NR, W, H, top, rest, R, pt(c, r) → [x, z], piece(col, scale) → Group { col, r, ball, noRoll },
         groove: { z: [far, near], L, y(s), at(side, i, n), step(n) } }
   Units: one step between points is 1.0; the board is 7 × 8 (points + 2 across, points + 3 deep).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const LO = () => !!(X.coarse || X.lite);
  const NC = 5, NR = 5, W = NC + 2, H = NR + 3, TH = .5, TD = .15, RAD = .26;
  const R = .34, PH = .15;                                   // piece radius, thickness
  const GZ = H / 2 - 1.02, GW = .29, GL = 5.6, GR = .2;      // trays: axis, half width, length, corner round
  const FP = 2.52;                                          // the field panel's half size
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const NZ = X.makeNoise ? X.makeNoise(931) : ((x, y) => .5 + .25 * Math.sin(x * 3.1 + y * 1.7));
  function phys(o) { const TT = T(), p = Object.assign({}, o); if (p.color !== undefined && typeof p.color !== 'number') p.color = lin(p.color); if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); } return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p); }
  const diag = (c, r) => (c + r) % 2 === 0;   // the classic pattern: diagonals through the points where c + r is even

  /* ---------- the top: colour, height (→ normal map) and roughness / metalness, painted on three canvases ---------- */
  let TOP = null;
  function topTex() {
    if (TOP) return TOP;
    const TT = T(), ppu = SZ(LO() ? 110 : 160), Wp = Math.round(W * ppu), Hp = Math.round(H * ppu);
    const mk = () => { const c = document.createElement('canvas'); c.width = Wp; c.height = Hp; return c; };
    const cA = mk(), cH = mk(), cM = mk(), a = cA.getContext('2d'), h = cH.getContext('2d'), m = cM.getContext('2d');
    const X0 = x => (x + W / 2) * ppu, Z0 = z => (z + H / 2) * ppu, S = v => v * ppu;
    // three layers drawn together: colour, height (grey, 128 = the varnished surface), rough (G) / metal (B)
    const fillAll = (path, col, hv, rough, metal) => { a.fillStyle = col; path(a); a.fill(); h.fillStyle = `rgb(${hv},${hv},${hv})`; path(h); h.fill(); m.fillStyle = `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`; path(m); m.fill(); };
    const rect = (x0, z0, x1, z1) => g => { g.beginPath(); g.rect(X0(x0), Z0(z0), S(x1 - x0), S(z1 - z0)); };
    const rrect = (x0, z0, x1, z1, r) => g => { g.beginPath(); const L = X0(x0), Tt = Z0(z0), Wd = S(x1 - x0), Hd = S(z1 - z0), rr = S(r); g.moveTo(L + rr, Tt); g.arcTo(L + Wd, Tt, L + Wd, Tt + Hd, rr); g.arcTo(L + Wd, Tt + Hd, L, Tt + Hd, rr); g.arcTo(L, Tt + Hd, L, Tt, rr); g.arcTo(L, Tt, L + Wd, Tt, rr); g.closePath(); };
    const poly = pts => g => { g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X0(x), Z0(z)) : g.moveTo(X0(x), Z0(z))); g.closePath(); };
    const star8 = (cx, cz, r, rot = 0) => { const p = []; for (let k = 0; k < 16; k++) { const ang = rot + k * Math.PI / 8, rr = k % 2 ? r * .62 : r; p.push([cx + Math.cos(ang) * rr, cz + Math.sin(ang) * rr]); } return poly(p); };
    // 1. walnut: long grain along x, at half resolution
    {
      const hw = Wp >> 1, hh = Hp >> 1, c = document.createElement('canvas'); c.width = hw; c.height = hh;
      const g = c.getContext('2d'), img = g.createImageData(hw, hh), d = img.data;
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
        const u = x / hw * W, v = y / hh * H, w = NZ(u * .35, v * 1.2, 3) * 2.2, ring = Math.pow(.5 + .5 * Math.sin((v * 5.5 + w) * Math.PI), 3), f = NZ(u * 6, v * 40, 2);
        const k = Math.min(1, Math.max(0, .3 + .5 * ring + .3 * (f - .5)));
        const i = (y * hw + x) * 4; d[i] = 92 - 44 * k; d[i + 1] = 60 - 30 * k; d[i + 2] = 38 - 20 * k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); a.drawImage(c, 0, 0, Wp, Hp);
      h.fillStyle = 'rgb(128,128,128)'; h.fillRect(0, 0, Wp, Hp);
      m.fillStyle = `rgb(255,${Math.round(.42 * 255)},0)`; m.fillRect(0, 0, Wp, Hp);
    }
    const BONE = '#ece2cc', EBONY = '#1e1510', LEMON = '#c99a55', PEARL = '#e9eee8';
    // 2. the marquetry border: bone stringing, a band of triangles, a chequer of tiny diamonds
    const e0 = .13, hw = W / 2, hh = H / 2;
    // (frame rings are drawn with the even-odd rule)
    const ringEO = (ins, wd, col, hv, rough = .4, metal = 0) => {
      const p = g => { g.beginPath(); g.rect(X0(-hw + ins), Z0(-hh + ins), S(W - 2 * ins), S(H - 2 * ins)); g.rect(X0(-hw + ins + wd), Z0(-hh + ins + wd), S(W - 2 * (ins + wd)), S(H - 2 * (ins + wd))); };
      a.fillStyle = col; p(a); a.fill('evenodd'); h.fillStyle = `rgb(${hv},${hv},${hv})`; p(h); h.fill('evenodd'); m.fillStyle = `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`; p(m); m.fill('evenodd');
    };
    ringEO(e0, .022, BONE, 132); ringEO(e0 + .022, .012, EBONY, 120);
    // the triangle band: e0 + .05 … e0 + .25
    const tb0 = e0 + .05, tb1 = e0 + .25, tw = .2;
    const band = (along, fixed0, fixed1, horiz, len0, len1) => {
      const n = Math.round((len1 - len0) / tw), st = (len1 - len0) / n;
      for (let k = 0; k < n; k++) {
        const s0 = len0 + k * st, s1 = s0 + st, sm = (s0 + s1) / 2;
        const P = (s, f) => horiz ? [s, f] : [f, s];
        fillAll(poly([P(s0, fixed1), P(s1, fixed1), P(sm, fixed0)]), BONE, 133, .38);
        fillAll(poly([P(sm, fixed0), P(s1, fixed1), P(s1 + st / 2 > len1 ? s1 : s1 + st / 2, fixed0)]), k % 2 ? LEMON : EBONY, 131, .4);
      }
    };
    fillAll(rect(-hw + tb0, -hh + tb0, hw - tb0, -hh + tb1), EBONY, 128, .4); fillAll(rect(-hw + tb0, hh - tb1, hw - tb0, hh - tb0), EBONY, 128, .4);
    fillAll(rect(-hw + tb0, -hh + tb0, -hw + tb1, hh - tb0), EBONY, 128, .4); fillAll(rect(hw - tb1, -hh + tb0, hw - tb0, hh - tb0), EBONY, 128, .4);
    band(0, -hh + tb0, -hh + tb1, true, -hw + tb1, hw - tb1); band(0, hh - tb0, hh - tb1, true, -hw + tb1, hw - tb1);
    band(0, -hw + tb0, -hw + tb1, false, -hh + tb1, hh - tb1); band(0, hw - tb0, hw - tb1, false, -hh + tb1, hh - tb1);
    // the chequer of tiny diamonds: e0 + .28 … e0 + .38
    const cb0 = e0 + .285, cs = .1;
    ringEO(e0 + .265, .02, BONE, 132);
    fillAll(g => { g.beginPath(); g.rect(X0(-hw + cb0), Z0(-hh + cb0), S(W - 2 * cb0), S(H - 2 * cb0)); g.rect(X0(-hw + cb0 + cs), Z0(-hh + cb0 + cs), S(W - 2 * (cb0 + cs)), S(H - 2 * (cb0 + cs))); }, '#3a2618', 128, .4);
    {
      const dia = (cx, cz) => poly([[cx, cz - cs / 2], [cx + cs / 2, cz], [cx, cz + cs / 2], [cx - cs / 2, cz]]);
      const c = -hh + cb0 + cs / 2, c2 = hh - cb0 - cs / 2, cx1 = -hw + cb0 + cs / 2, cx2 = hw - cb0 - cs / 2;
      for (let x = -hw + cb0 + cs / 2; x <= hw - cb0 - cs / 2 + 1e-6; x += cs) { fillAll(dia(x, c), BONE, 132, .38); fillAll(dia(x, c2), BONE, 132, .38); }
      for (let z = -hh + cb0 + cs * 1.5; z <= hh - cb0 - cs * 1.5 + 1e-6; z += cs) { fillAll(dia(cx1, z), BONE, 132, .38); fillAll(dia(cx2, z), BONE, 132, .38); }
    }
    ringEO(cb0 + cs, .02, BONE, 132); ringEO(cb0 + cs + .02, .012, EBONY, 120);
    // corner khatam stars in mother-of-pearl
    const pearlFill = (g, cx, cz, r) => { const gr = g.createLinearGradient(X0(cx - r), Z0(cz - r), X0(cx + r), Z0(cz + r)); gr.addColorStop(0, '#f4e9ef'); gr.addColorStop(.35, '#e2f0ea'); gr.addColorStop(.65, '#eaf0fa'); gr.addColorStop(1, '#f6efe0'); return gr; };
    const cornerS = (cx, cz) => {
      const r = .2; fillAll(star8(cx, cz, r + .03, Math.PI / 8), EBONY, 124, .4);
      a.fillStyle = pearlFill(a, cx, cz, r); star8(cx, cz, r, Math.PI / 8)(a); a.fill(); h.fillStyle = 'rgb(136,136,136)'; star8(cx, cz, r, Math.PI / 8)(h); h.fill(); m.fillStyle = `rgb(255,${Math.round(.22 * 255)},0)`; star8(cx, cz, r, Math.PI / 8)(m); m.fill();
      fillAll(star8(cx, cz, .065, Math.PI / 8), '#c8a04a', 140, .3, .9);
    };
    const co = e0 + .15; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => cornerS(sx * (hw - co), sz * (hh - co)));
    // 3. the trays' bone stringing (the trays themselves are cut out of the slab)
    [-GZ, GZ].forEach(z => { fillAll(rrect(-GL / 2 - .07, z - GW - .07, GL / 2 + .07, z + GW + .07, GR + .07), BONE, 131, .38); fillAll(rrect(-GL / 2 - .045, z - GW - .045, GL / 2 + .045, z + GW + .045, GR + .045), EBONY, 126, .4); });
    // 4. the field: a lighter lemonwood panel in ebony / bone stringing, a faint khatam rosette
    fillAll(rect(-FP - .07, -FP - .07, FP + .07, FP + .07), BONE, 132, .38);
    fillAll(rect(-FP - .045, -FP - .045, FP + .045, FP + .045), EBONY, 126, .4);
    {
      const c = document.createElement('canvas'), n = Math.round(S(2 * FP)); c.width = c.height = n >> 1;
      const g = c.getContext('2d'), img = g.createImageData(c.width, c.height), d = img.data;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const u = x / c.width * 2 * FP, v = y / c.height * 2 * FP, w = NZ(u * .5 + 9, v * 1.6, 3) * 1.6, ring = Math.pow(.5 + .5 * Math.sin((v * 7 + w) * Math.PI), 4), f = NZ(u * 8 + 3, v * 50, 2);
        const k = Math.min(1, Math.max(0, .25 + .45 * ring + .3 * (f - .5)));
        const i = (y * c.width + x) * 4; d[i] = 196 - 50 * k; d[i + 1] = 150 - 42 * k; d[i + 2] = 92 - 30 * k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); a.drawImage(c, X0(-FP), Z0(-FP), n, n);
      h.fillStyle = 'rgb(128,128,128)'; h.fillRect(X0(-FP), Z0(-FP), n, n); m.fillStyle = `rgb(255,${Math.round(.4 * 255)},0)`; m.fillRect(X0(-FP), Z0(-FP), n, n);
    }
    // the rosette under the lines: a large eight-pointed star and four small ones, in pale bone / walnut lines
    a.save(); a.globalAlpha = .34; a.lineWidth = S(.025); a.strokeStyle = '#5a3a20';
    [[0, 0, 1.75], [-1, -1, .48], [1, -1, .48], [1, 1, .48], [-1, 1, .48]].forEach(([cx, cz, r]) => { star8(cx, cz, r, Math.PI / 8)(a); a.stroke(); star8(cx, cz, r * .78, Math.PI / 8)(a); a.stroke(); });
    a.globalAlpha = .18; a.fillStyle = '#fff6e4'; star8(0, 0, 1.75, Math.PI / 8)(a); a.fill(); a.restore();
    // 5. the lines: mother-of-pearl strips edged in ebony
    const lines = [];
    for (let r = 0; r < NR; r++) lines.push([[0, r], [NC - 1, r]]);
    for (let c = 0; c < NC; c++) lines.push([[c, 0], [c, NR - 1]]);
    for (let c = 0; c < NC - 1; c++) for (let r = 0; r < NR - 1; r++) lines.push(diag(c, r) ? [[c, r], [c + 1, r + 1]] : [[c + 1, r], [c, r + 1]]);
    const P = (c, r) => [c - (NC - 1) / 2, r - (NR - 1) / 2];
    const strokeAll = (wd, col, hv, rough, metal, cap = 'round') => {
      [[a, col], [h, `rgb(${hv},${hv},${hv})`], [m, `rgb(255,${Math.round(rough * 255)},${Math.round(metal * 255)})`]].forEach(([g, s]) => {
        g.lineCap = cap; g.lineWidth = S(wd); g.beginPath();
        lines.forEach(([p0, p1]) => { const [x0, z0] = P(...p0), [x1, z1] = P(...p1); g.moveTo(X0(x0), Z0(z0)); g.lineTo(X0(x1), Z0(z1)); });
        g.strokeStyle = typeof s === 'function' ? s(g) : s; g.stroke();
      });
    };
    strokeAll(.1, EBONY, 120, .4, 0);
    strokeAll(.064, g => { const gr = g.createLinearGradient(0, 0, Wp, Hp); ['#f3e7ee', '#e0efe8', '#e8eefa', '#f5eedf', '#e6f1ec', '#f1e6f0'].forEach((cc, i, arr) => gr.addColorStop(i / (arr.length - 1), cc)); return gr; }, 140, .2, 0);
    // a little shimmer: the pearl strips are cut from several shells (small tone changes along them)
    a.save(); a.globalAlpha = .22; a.lineWidth = S(.05); a.lineCap = 'butt';
    lines.forEach(([p0, p1]) => { const [x0, z0] = P(...p0), [x1, z1] = P(...p1), n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / .18); for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n; a.strokeStyle = ['#d8c8e8', '#c8e6d8', '#f8f0d8', '#d0dcf4'][(k * 7 + Math.round(x0 * 3 + z0 * 5)) & 3]; a.beginPath(); a.moveTo(X0(x0 + (x1 - x0) * t0), Z0(z0 + (z1 - z0) * t0)); a.lineTo(X0(x0 + (x1 - x0) * t1), Z0(z0 + (z1 - z0) * t1)); a.stroke(); } });
    a.restore();
    // 6. the points: brass studs (domed: the height map rises to their centre)
    for (let c = 0; c < NC; c++) for (let r = 0; r < NR; r++) {
      const [x, z] = P(c, r), big = c === 2 && r === 2, rr = big ? .13 : .105;
      a.fillStyle = EBONY; a.beginPath(); a.arc(X0(x), Z0(z), S(rr + .025), 0, Math.PI * 2); a.fill();
      const gr = a.createRadialGradient(X0(x - rr * .35), Z0(z - rr * .35), S(rr * .1), X0(x), Z0(z), S(rr)); gr.addColorStop(0, '#fff1b8'); gr.addColorStop(.5, '#d8a944'); gr.addColorStop(1, '#8a6020');
      a.fillStyle = gr; a.beginPath(); a.arc(X0(x), Z0(z), S(rr), 0, Math.PI * 2); a.fill();
      const hg = h.createRadialGradient(X0(x), Z0(z), 0, X0(x), Z0(z), S(rr)); hg.addColorStop(0, 'rgb(190,190,190)'); hg.addColorStop(1, 'rgb(140,140,140)');
      h.fillStyle = hg; h.beginPath(); h.arc(X0(x), Z0(z), S(rr), 0, Math.PI * 2); h.fill();
      m.fillStyle = `rgb(255,${Math.round(.28 * 255)},${Math.round(.95 * 255)})`; m.beginPath(); m.arc(X0(x), Z0(z), S(rr), 0, Math.PI * 2); m.fill();
      if (big) { a.strokeStyle = '#6a4818'; a.lineWidth = S(.012); star8(x, z, rr * .8, Math.PI / 8)(a); a.stroke(); }
    }
    // the height field → a normal map (joints between the inlay pieces read as fine dark seams in the varnish)
    const hd = h.getImageData(0, 0, Wp, Hp).data, nC = mk(), ng = nC.getContext('2d'), out = ng.createImageData(Wp, Hp), o = out.data, k = 2.2;
    const H0 = (x, y) => hd[((Math.min(Hp - 1, Math.max(0, y)) * Wp) + Math.min(Wp - 1, Math.max(0, x))) * 4] / 255;
    for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) {
      const dx = (H0(x + 1, y) - H0(x - 1, y)) * k, dy = (H0(x, y + 1) - H0(x, y - 1)) * k, l = Math.hypot(dx, dy, 1), i = (y * Wp + x) * 4;
      o[i] = (-dx / l * .5 + .5) * 255; o[i + 1] = (dy / l * .5 + .5) * 255; o[i + 2] = (1 / l * .5 + .5) * 255; o[i + 3] = 255;
    }
    ng.putImageData(out, 0, 0);
    const map = new TT.CanvasTexture(cA); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    const nm = new TT.CanvasTexture(nC); nm.anisotropy = 4;
    const rm = new TT.CanvasTexture(cM);
    return (TOP = { map, nm, rm });
  }
  function sideTex() {
    return X.canvasTex('alqSide', SZ(1024), SZ(96), (g, Wd, Hd) => {
      const img = g.createImageData(Wd, Hd), d = img.data;
      for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) {
        const u = x / Wd, v = y / Hd, w = NZ(u * 8, v * 2, 3) * 1.6, ring = Math.pow(.5 + .5 * Math.sin((v * 3 + w) * Math.PI * 2), 3), f = NZ(u * 160, v * 6, 2);
        const kk = Math.min(1, Math.max(0, .3 + .5 * ring + .3 * (f - .5))), i = (y * Wd + x) * 4; d[i] = 86 - 40 * kk; d[i + 1] = 56 - 28 * kk; d[i + 2] = 36 - 18 * kk; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      g.fillStyle = '#ece2cc'; g.fillRect(0, Hd * .1, Wd, Math.max(1, Hd * .03));   // a bone line round the top of the edge
    });
  }
  function velvetTex() {
    return X.canvasTex('alqVelvet', SZ(512), SZ(64), (g, Wd, Hd) => {
      const img = g.createImageData(Wd, Hd), d = img.data;
      for (let y = 0; y < Hd; y++) for (let x = 0; x < Wd; x++) { const n = NZ(x * .08, y * .3, 3), f = NZ(x * .9, y * .9, 1), kk = .55 + .3 * n + .15 * f, i = (y * Wd + x) * 4; d[i] = 120 * kk; d[i + 1] = 14 * kk; d[i + 2] = 28 * kk; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
  }

  /* ---------- the slab: a walnut base, the inlaid top with the two trays cut out of it ---------- */
  function rr(sh, x0, y0, x1, y1, r, hole) {
    const p = hole ? new (T().Path)() : sh;
    p.moveTo(x0 + r, y0); p.lineTo(x1 - r, y0); p.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false); p.lineTo(x1, y1 - r); p.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    p.lineTo(x0 + r, y1); p.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false); p.lineTo(x0, y0 + r); p.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    return p;
  }
  // points of a closed path without doubled points (a doubled point broke the bevel of the card tables' rails)
  const clean = p => { const out = []; for (const q of p.getPoints(LO() ? 6 : 12)) { const l = out[out.length - 1]; if (!l || Math.hypot(q.x - l.x, q.y - l.y) > 1e-4) out.push(q); } if (out.length > 2 && out[0].distanceTo(out[out.length - 1]) < 1e-4) out.pop(); return out; };
  let GEO = null;
  function slabGeos() {
    if (GEO) return GEO;
    const TT = T(), bv = .05, cs = LO() ? 4 : 8;
    const outer = () => new TT.Shape(clean(rr(new TT.Shape(), -W / 2, -H / 2, W / 2, H / 2, RAD)));
    const fit = (g, depth, y0) => { g.rotateX(-Math.PI / 2); g.translate(0, y0 + bv, 0); const k = (W - .004) / (W + 2 * (bv - .004)), kz = (H - .004) / (H + 2 * (bv - .004)); g.scale(k, 1, kz); };
    // the base (under the trays' floor)
    const base = new TT.ExtrudeGeometry(outer(), { depth: TH - TD - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv - .004, bevelSegments: LO() ? 2 : 3, curveSegments: cs });
    fit(base, 0, 0);
    // the top layer: the same outline with the two trays as holes (shape y = −z)
    const sh = outer();
    [-GZ, GZ].forEach(z => sh.holes.push(new TT.Path(clean(rr(null, -GL / 2, -z - GW, GL / 2, -z + GW, GR, true)))));
    const top = new TT.ExtrudeGeometry(sh, { depth: TD - bv, bevelEnabled: true, bevelThickness: bv * .6, bevelSize: bv * .6 - .004, bevelSegments: LO() ? 2 : 3, curveSegments: cs });
    top.rotateX(-Math.PI / 2); top.translate(0, TH - TD + bv * .6 - .0, 0);
    { const k = (W - .004) / (W + 2 * (bv * .6 - .004)), kz = (H - .004) / (H + 2 * (bv * .6 - .004)); top.scale(k, 1, kz); }
    // UVs: the top faces from the plan, the edges round the board
    [base, top].forEach(g => {
      const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
      for (let i = 0; i < UV.count; i++) {
        const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), nz = N.getZ(i);
        if (Math.abs(N.getY(i)) > .7) UV.setXY(i, x / W + .5, .5 - z / H);
        else UV.setXY(i, (Math.abs(nx) > Math.abs(nz) ? z + (nx > 0 ? W : 3 * W) : x + (nz > 0 ? 0 : 2 * W)) / (W * 1.6), y / TH);
      }
    });
    base.computeBoundingSphere(); top.computeBoundingSphere();
    return (GEO = { base, top });
  }
  function board(rule) {
    const TT = T(), g = new TT.Group(), tx = topTex(), G = slabGeos();
    const topM = mat('top', () => phys({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1, 1), roughnessMap: tx.rm, metalnessMap: tx.rm, roughness: 1, metalness: 1, color: 0xffffff, clearcoat: .45, clearcoatRoughness: .2, envMapIntensity: 1.05 }));
    const sideM = mat('side', () => { const m = phys({ map: sideTex(), roughness: .35, metalness: 0, clearcoat: .5, clearcoatRoughness: .18, color: 0xffffff, envMapIntensity: .9 }); m.side = TT.DoubleSide; return m; });
    const baseTop = mat('baseTop', () => phys({ color: '#3a2416', roughness: .6 }));
    const base = new TT.Mesh(G.base, [baseTop, sideM]), top = new TT.Mesh(G.top, [topM, sideM]);
    base.castShadow = base.receiveShadow = top.castShadow = top.receiveShadow = true; g.add(base, top);
    // the trays' velvet floors
    const vel = mat('velvet', () => phys({ map: velvetTex(), roughness: .95, metalness: 0, color: 0xffffff, envMapIntensity: .3 }));
    [-GZ, GZ].forEach(z => { const p = new TT.Mesh(new TT.PlaneGeometry(GL - .06, 2 * GW - .06), vel); p.rotation.x = -Math.PI / 2; p.position.set(0, TH - TD + .003, z); p.receiveShadow = true; g.add(p); });
    const ox = (NC - 1) / 2, oz = (NR - 1) / 2, floor = TH - TD + .004;
    g.userData = {
      NC, NR, W, H, top: TH, rest: TH + PH / 2, R,
      pt: (c, r) => [c - ox, r - oz],
      piece,
      groove: {
        z: [-GZ, GZ], L: GL,
        y: s => floor + PH * s / 2,
        at: (side, i, n) => { const s = Math.min(.46, (GL - .1) / Math.max(1, n)); return [-GL / 2 + .05 + s * (i + .5), side ? GZ : -GZ]; },
        step: n => Math.min(.46, (GL - .1) / Math.max(1, n)),
      },
    };
    return g;
  }

  /* ---------- the pieces: brass discs, and bronze discs with a cobalt enamel face ---------- */
  const geos = {};
  function discGeo() {   // unit radius (scaled by the piece's radius), centred on its middle
    const key = LO() ? 'lo' : 'hi'; if (geos[key]) return geos[key];
    const TT = T(), hU = PH / R, p = [[0, -hU / 2], [.9, -hU / 2], [.97, -hU / 2 + .05], [1, -hU / 2 + .14], [1, hU / 2 - .16]];
    const st = LO() ? 3 : 5; for (let i = 1; i <= st; i++) { const t = i / st * Math.PI / 2; p.push([.9 + Math.cos(t) * .1, hU / 2 - .16 + Math.sin(t) * .14]); }
    p.push([.88, hU / 2 - .02], [.84, hU / 2 - .05], [.78, hU / 2 - .02], [0, hU / 2 - .02]);
    const g = new TT.LatheGeometry(p.map(([a, b]) => new TT.Vector2(a, b)), LO() ? 28 : 44); if (X.share) X.share(g); return (geos[key] = g);
  }
  function faceGeo() { const key = 'f' + (LO() ? 'lo' : 'hi'); if (geos[key]) return geos[key]; const g = new (T().CircleGeometry)(.78, LO() ? 28 : 44); g.rotateX(-Math.PI / 2); g.translate(0, PH / R / 2 - .018, 0); if (X.share) X.share(g); return (geos[key] = g); }
  // the face: an eight-pointed star in a ring of small lobes — engraved in brass / gold cloisonné wires in cobalt enamel
  function faceTex(col) {
    return X.canvasTex('alqFace' + col, SZ(512), SZ(512), (g, Wd) => {
      const c = Wd / 2, r = Wd / 2;
      const ground = g.createRadialGradient(c * .8, c * .75, 0, c, c, r);
      if (col === 1) { ground.addColorStop(0, '#f4d987'); ground.addColorStop(.6, '#d4a744'); ground.addColorStop(1, '#a87a28'); }
      else { ground.addColorStop(0, '#2a58d0'); ground.addColorStop(.6, '#163a9c'); ground.addColorStop(1, '#0d2470'); }
      g.fillStyle = ground; g.fillRect(0, 0, Wd, Wd);
      const ink = col === 1 ? 'rgba(96,62,14,.85)' : '#e8c25a', w = Wd * (col === 1 ? .012 : .016);
      g.strokeStyle = ink; g.lineWidth = w; g.lineJoin = 'round';
      const star = (rad, rot) => { g.beginPath(); for (let k = 0; k < 16; k++) { const a = rot + k * Math.PI / 8, rr2 = k % 2 ? rad * .62 : rad; const x = c + Math.cos(a) * rr2, y = c + Math.sin(a) * rr2; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); };
      star(r * .62, Math.PI / 8); star(r * .38, Math.PI / 8);
      g.beginPath(); g.arc(c, c, r * .14, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(c, c, r * .86, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.beginPath(); g.arc(c + Math.cos(a) * r * .76, c + Math.sin(a) * r * .76, r * .05, 0, Math.PI * 2); g.stroke(); }
      if (col === 2) { g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.ellipse(c * .78, c * .7, r * .35, r * .18, -.6, 0, Math.PI * 2); g.fill(); }   // the glaze's soft highlight
    });
  }
  function pieceMats(col) {
    const body = mat('pb' + col, () => phys(col === 1 ? { color: '#d6aa48', metalness: .85, roughness: .34, envMapIntensity: 1.25 } : { color: '#5a4220', metalness: .9, roughness: .38, envMapIntensity: 1.1 }));
    const face = mat('pf' + col, () => phys(col === 1 ? { map: faceTex(1), color: 0xffffff, metalness: .85, roughness: .3, envMapIntensity: 1.25 } : { map: faceTex(2), color: 0xffffff, metalness: 0, roughness: .2, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: .9 }));
    return { body, face };
  }
  // col 1 White (brass) / 2 Black (cobalt enamel); the group's origin is the disc's middle (it rests at userData.rest)
  function piece(col, scale = 1) {
    const TT = T(), g = new TT.Group(), r = R * scale, M = pieceMats(col), d = new TT.Group();
    const body = new TT.Mesh(discGeo(), M.body); body.castShadow = body.receiveShadow = true;
    const face = new TT.Mesh(faceGeo(), M.face); face.receiveShadow = true; face.rotation.y = Math.random() * 6.28;
    d.add(body, face); d.scale.setScalar(r); g.add(d);
    g.userData = { col, r, ball: d, noRoll: true };
    return g;
  }

  X.MODELS.alquerque = function (live) {
    const g = board('alq'), U = g.userData;
    if (live) return g;
    // a game in progress: brass from the near side, cobalt from the far side, a few already taken
    const spec = ['bb.bb', 'b.bbb', 'w.b..', 'ww.ww', 'wwwww'];
    spec.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      const p = piece(ch === 'w' ? 1 : 2), [x, z] = U.pt(c, r); p.position.set(x, U.rest, z); g.add(p);
      const sh = X.contact(R * .95, .5); sh.position.set(x, U.top + .002, z); g.add(sh);
    }));
    const gs = .66, n = 12;
    for (let i = 0; i < 3; i++) { const p = piece(2, gs), [x, z] = U.groove.at(1, i, n); p.position.set(x, U.groove.y(gs), z); g.add(p); }
    for (let i = 0; i < 1; i++) { const p = piece(1, gs), [x, z] = U.groove.at(0, i, n); p.position.set(x, U.groove.y(gs), z); g.add(p); }
    g.scale.setScalar(1.3);
    return g;
  };
  const dims = () => ({ NC, NR, W, H });
  X.alquerque = { board, piece, dims, R, TH };
})();
