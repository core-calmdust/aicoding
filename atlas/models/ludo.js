/* =====================================================================
   Ludo & Pachisi on the 3D table.
     · ludo: a square board of lacquered wood whose top is the 2D board's own picture (LudoBoard2D.drawBoard → SVG →
       canvas), framed in dark wood; turned pawns (a round foot, a waisted body and a ball on top) in red, green, yellow, blue
     · pachisi: the embroidered cross of cloth laid flat on the table (its picture from the 2D board too, the corners
       left open), turned wooden "beehive" pieces in yellow, red, black and green
     · a die (rounded cube, pips) and six cowrie shells
   Registers into Table3D:
     Table3D.MODELS.ludo(live, rule)   board (+ a few pieces unless live)    rule: 'ludo' (default) | 'pachisi'
     userData: { top, u, n, rule, xz(gx, gy) → [x, z] (2D grid units, cell centres = i + .5), piece(rule, seat) → Group, die(), cowrie(up) }
   Needs ludo/engine.js and ludo/board2d.js on the page (window.LudoEngine, window.LudoBoard2D).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; delete p.sheen; delete p.sheenColor; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined || p.sheen !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const u = .66;   // one grid cell in world units (ludo 15 × .66 = 9.9; pachisi 19 × .55)
  const UP = { ludo: .66, pachisi: .54 };

  /* ---------- the board's picture: the 2D SVG drawn into a canvas ---------- */
  const pics = {};
  function boardTex(rule, design) {
    const key = 'ld-' + rule + '-' + design;
    if (pics[key]) return pics[key];
    const B = window.LudoBoard2D, TT = T();
    const S = X.texScale ? Math.round(2048 * X.texScale()) : 2048;
    const c = document.createElement('canvas'); c.width = c.height = S;
    const tex = new TT.CanvasTexture(c); tex.encoding = TT.sRGBEncoding; tex.anisotropy = 8;
    pics[key] = tex;
    if (!B) return tex;
    const d = B.drawBoard(rule, design), pad = rule === 'pachisi' ? .25 : .32;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${d.n + 2 * pad} ${d.n + 2 * pad}" width="${S}" height="${S}">${d.svg}</svg>`;
    const img = new Image();
    img.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, S, S); g.drawImage(img, 0, 0, S, S); tex.needsUpdate = true; if (X.kick) X.kick(300); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return tex;
  }

  /* ---------- pieces ---------- */
  const COLS = { ludo: [0xe2403a, 0x2fa65a, 0xf2c12e, 0x2f7ad8], pachisi: [0xf0c02c, 0xd63a2c, 0x2b2b31, 0x3a9a5a] };
  const geos = {};
  function pawnGeo(rule) {
    if (geos[rule]) return geos[rule];
    const TT = T(), s = UP[rule], P = [];
    if (rule === 'pachisi') {   // a beehive: a flat foot and three stacked rounded rings, a knob on top
      const prof = [[0, 0], [.4, 0], [.42, .04], [.4, .1], [.36, .12], [.38, .2], [.33, .27], [.34, .34], [.27, .42], [.26, .48], [.17, .56], [.1, .6], [.11, .66], [.06, .72], [0, .74]];
      prof.forEach(([r, y]) => P.push(new TT.Vector2(r * s, y * s)));
    } else {   // a turned pawn: foot, waist, collar, ball
      const prof = [[0, 0], [.38, 0], [.4, .05], [.37, .1], [.24, .16], [.17, .3], [.14, .46], [.2, .5], [.2, .53], [.12, .56]];
      prof.forEach(([r, y]) => P.push(new TT.Vector2(r * s, y * s)));
      for (let k = 0; k <= 8; k++) { const a = -Math.PI / 2 + k / 8 * Math.PI; P.push(new TT.Vector2(Math.max(0, Math.cos(a) * .16 * s), (.71 + Math.sin(a) * .16) * s)); }
    }
    const g = new TT.LatheGeometry((X.lp || (a => a))(P, .003), LO() ? 16 : 20); if (X.share) X.share(g);
    return (geos[rule] = g);
  }
  function piece(rule, seat) {
    const TT = T(), col = COLS[rule][seat];
    const m = mat('pc' + rule + seat, () => rule === 'pachisi'
      ? phys({ color: col, roughness: .42, clearcoat: .5, clearcoatRoughness: .35 })
      : phys({ color: col, roughness: .3, clearcoat: .8, clearcoatRoughness: .2 }));
    const g = new TT.Group(), b = new TT.Mesh(pawnGeo(rule), m); b.castShadow = true; b.receiveShadow = true; g.add(b);
    g.userData = { seat, rule, r: (rule === 'pachisi' ? .42 : .4) * UP[rule], h: (rule === 'pachisi' ? .74 : .87) * UP[rule] };
    return g;
  }
  /* ---------- the die and the cowries ---------- */
  // (2026-11-09 v2) the die: a cube with softly rounded edges and corners, the pips drilled into it — each face has holes (an
  // alpha map, alphaTest) and under each hole a small painted bowl (the inside of a sphere cap), so the light falls into the
  // dimples from any side
  const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
  const pipR = v => v === 1 ? .12 : .085, PIP_D = .26;
  function dieHoles(v) {   // white = the face, black = a hole
    return X.canvasTex('ld-dieh-' + v, 256, 256, (c, W) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, W, W); c.fillStyle = '#000';
      PIPS[v].forEach(([x, y]) => { c.beginPath(); c.arc(W / 2 + x * W * PIP_D, W / 2 + y * W * PIP_D, W * pipR(v), 0, 7); c.fill(); });
    });
  }
  // a rounded box that keeps BoxGeometry's six face groups (one material per face): each vertex is pulled onto a rounded
  // shell round the inner box, its normal points away from the inner box (smooth edges)
  function roundDieGeo(s, r) {
    if (geos.die) return geos.die;
    const TT = T(), N = 16, g = new TT.BoxGeometry(s, s, s, N, N, N), P = g.attributes.position, Nm = g.attributes.normal, h = s / 2 - r, v = new TT.Vector3(), q = new TT.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); q.set(Math.max(-h, Math.min(h, v.x)), Math.max(-h, Math.min(h, v.y)), Math.max(-h, Math.min(h, v.z)));
      const d = v.clone().sub(q); if (d.lengthSq() < 1e-12) continue;
      d.normalize(); P.setXYZ(i, q.x + d.x * r, q.y + d.y * r, q.z + d.z * r); Nm.setXYZ(i, d.x, d.y, d.z);
    }
    P.needsUpdate = Nm.needsUpdate = true; g.computeBoundingSphere(); if (X.share) X.share(g);
    return (geos.die = g);
  }
  // per face of the (unrounded) box: where its uv square lies — origin and the u / v directions — to place the pips
  function faceFrames(s) {
    if (geos.dieF) return geos.dieF;
    const TT = T(), g = new TT.BoxGeometry(s, s, s), P = g.attributes.position, UV = g.attributes.uv, NM = g.attributes.normal, F = [];
    g.groups.forEach(gr => { const ix = []; for (let k = gr.start; k < gr.start + gr.count; k++) ix.push(g.index ? g.index.getX(k) : k);
      const at = (u, v) => { const i = ix.find(i => Math.abs(UV.getX(i) - u) < 1e-6 && Math.abs(UV.getY(i) - v) < 1e-6); return new TT.Vector3().fromBufferAttribute(P, i); };
      const o = at(0, 0), U = at(1, 0).sub(o), V = at(0, 1).sub(o), n = new TT.Vector3().fromBufferAttribute(NM, ix[0]);
      F.push({ o, U, V, n }); });
    g.dispose();
    return (geos.dieF = F);
  }
  function bowlGeo(pr) {   // the inside of the bottom cap of a sphere; rim radius pr at y = 0, sinking to −depth
    const k = 'dieBowl' + pr; if (geos[k]) return geos[k];
    const TT = T(), th = Math.PI / 3, Rs = pr / Math.sin(th), g = new TT.SphereGeometry(Rs, 18, 6, 0, Math.PI * 2, Math.PI - th, th);
    g.translate(0, Rs * Math.cos(th), 0); if (X.share) X.share(g);
    return (geos[k] = g);
  }
  function die() {
    const TT = T(), s = .5;
    const geo = roundDieGeo(s, .07);
    // BoxGeometry faces: +x, −x, +y, −y, +z, −z → 1..6 with opposite faces summing to 7
    const order = [3, 4, 1, 6, 2, 5];
    const ms = order.map(v => mat('die2-' + v, () => phys({ color: 0xfbf7ee, alphaMap: dieHoles(v), alphaTest: .5, roughness: .3, clearcoat: .55, clearcoatRoughness: .18 })));
    const m = new TT.Mesh(geo, ms); m.castShadow = true;
    // (2026-11-09) matt paint in the pips: a glossy coat mirrored the room at the dimple's steep walls — the red 1 read as a white ring
    const pipM = [mat('diePip2', () => phys({ color: 0x1b1916, roughness: .75, envMapIntensity: .25, side: TT.BackSide })), mat('diePip12', () => phys({ color: 0xc8261f, roughness: .7, envMapIntensity: .25, side: TT.BackSide }))];
    // (2026-11-09) the cube and its pips side by side in one turning group (children[0] — the face up is set on it): the
    // showcase merges static meshes and hides the originals, and a pip that was the cube's child vanished with it (the lone
    // red 1 is not merged — the 1 showed a hole through the die)
    const body = new TT.Group(); body.add(m);
    const up = new TT.Vector3(0, 1, 0);
    faceFrames(s).forEach((f, i) => { const v = order[i], pr = pipR(v) * s;
      PIPS[v].forEach(([x, y]) => { const u = .5 + x * PIP_D, w = .5 - y * PIP_D;   // (canvas y down, uv v up)
        const b = new TT.Mesh(bowlGeo(pr), pipM[v === 1 ? 1 : 0]);
        b.position.copy(f.o).addScaledVector(f.U, u).addScaledVector(f.V, w).addScaledVector(f.n, -.0005); b.quaternion.setFromUnitVectors(up, f.n); body.add(b); }); });
    const g = new TT.Group(); g.add(body); g.userData = { size: s, faces: order };
    return g;
  }
  // a cowrie: an egg-shaped shell; mouth up shows the toothed slit
  function cowrie(up) {
    const TT = T(), g = new TT.Group();
    const geo = geos.cow || (geos.cow = (() => { const q = new TT.SphereGeometry(.13, LO() ? 10 : 12, LO() ? 7 : 8); q.scale(1, .55, .72); return q; })());
    const shell = mat('cow', () => phys({ color: 0xf1e2c0, roughness: .25, clearcoat: .9, clearcoatRoughness: .15 }));
    const m = new TT.Mesh(geo, shell); m.castShadow = true; m.position.y = .07; g.add(m);
    if (up) {   // the mouth: a dark slit with little white teeth
      const slit = new TT.Mesh(new TT.BoxGeometry(.2, .012, .024), mat('slit', () => phys({ color: 0x4a3418, roughness: .6 })));
      slit.position.set(0, .07 + .13 * .55 - .002, 0); g.add(slit);
    } else {   // the humped back: a golden blush
      const sp = new TT.Mesh(geo, mat('cowb', () => phys({ color: 0xd8b77a, roughness: .3, clearcoat: .7, transparent: true, opacity: .55 })));
      sp.scale.set(.75, .8, .75); sp.position.y = .085; g.add(sp);
    }
    return g;
  }

  /* ---------- boards ---------- */
  function board(rule = 'ludo', design = 'classic') {
    const TT = T(), g = new TT.Group(), base = new TT.Group(); g.add(base);
    const s = UP[rule], n = rule === 'pachisi' ? 19 : 15;
    let top;
    if (rule === 'pachisi') {   // the cloth: a thin cut-out cross with soft edges
      const pad = .25, W = (n + 2 * pad) * s;
      const tex = boardTex(rule, design);
      const cloth = new TT.Mesh(new TT.PlaneGeometry(W, W), mat('cloth' + design, () => phys({ map: tex, color: 0xffffff, roughness: .92, transparent: true, alphaTest: .4, side: TT.DoubleSide })));
      cloth.rotation.x = -Math.PI / 2; cloth.position.y = .012; cloth.receiveShadow = true; base.add(cloth);
      // a faint shadow under the cloth so it sits on the table
      const sh = X.contact ? X.contact(W * .48, .25) : null; if (sh) { sh.position.y = .002; base.add(sh); }
      top = .02;
    } else {
      const pad = .32, W = (n + 2 * pad) * s, H = .34;
      const wood = X.wood ? X.wood('ldFrame', '#5a3418', '#2e1a0c', 512, 256, 2.4) : null;
      const frame = mat('ldframe', () => phys({ map: wood || undefined, color: wood ? 0xffffff : 0x4a2c16, roughness: .45, clearcoat: .6, clearcoatRoughness: .25 }));
      const face = mat('ldface' + design, () => phys({ map: boardTex(rule, design), color: 0xffffff, roughness: .35, clearcoat: .7, clearcoatRoughness: .2 }));
      const block = new TT.Mesh(new TT.BoxGeometry(W + .3, H, W + .3), [frame, frame, frame, frame, frame, frame]);
      block.position.y = H / 2; block.castShadow = true; block.receiveShadow = true; base.add(block);
      const pic = new TT.Mesh(new TT.PlaneGeometry(W, W), face); pic.rotation.x = -Math.PI / 2; pic.position.y = H + .003; pic.receiveShadow = true; base.add(pic);
      top = H + .004;
    }
    const pad = rule === 'pachisi' ? .25 : .32;
    g.userData = {
      top, u: s, n, rule,
      xz: (gx, gy) => [(gx - n / 2) * s, (gy - n / 2) * s],
      piece: (r, seat) => piece(r || rule, seat), die, cowrie, pad,
    };
    return g;
  }
  X.MODELS.ludo = function (live, rule) {
    const g = board(rule || 'ludo', 'classic');
    if (live) return g;
    // a few pieces on their way (the shelf / thumbnail picture)
    const B = window.LudoBoard2D, E = window.LudoEngine, U = g.userData;
    if (B && E) {
      const geo = B.geometry(U.rule), P = U.rule === 'pachisi' ? [[0, [3, 20, -1, -1]], [1, [12, -1, -1, -1]], [2, [40, -1, -1, -1]], [3, [-1, -1, -1, -1]]] : [[0, [5, 30, -1, -1]], [1, [12, -1, -1, -1]], [2, [-1, 44, -1, -1]], [3, [0, -1, -1, -1]]];
      P.forEach(([seat, ps]) => ps.forEach((p, k) => { const [gx, gy] = p < 0 ? geo.yard(seat, k) : geo.cellXY(seat, p); const [x, z] = U.xz(gx, gy); const pc = piece(U.rule, seat); pc.position.set(x, U.top, z); g.add(pc); const sh = X.contact(pc.userData.r * 1.1, .45); sh.position.set(x, U.top + .002, z); g.add(sh); }));
      // the die: flat in the middle of blue's yard, clear of the pieces (2026-11-09: it was tilted into the board beside a piece)
      const d = die(), [dx, dz] = U.xz(12, 12); d.position.set(dx, U.top + d.userData.size / 2 + .002, dz); d.rotation.set(0, .6, 0); d.children[0].rotation.set(0, 0, 0);
      if (U.rule === 'ludo') { g.add(d); const ds = X.contact && X.contact(d.userData.size * .75, .4); if (ds) { ds.position.set(dx, U.top + .002, dz); g.add(ds); } }
    }
    return g;
  };
  X.MODELS.pachisi = live => X.MODELS.ludo(live, 'pachisi');
  X.ludo = { board, piece, die, cowrie, UP, COLS };
})();
