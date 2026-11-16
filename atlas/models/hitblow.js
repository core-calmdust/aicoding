/* =====================================================================
   ヒット＆ブロー on the 3D table (2026-11-16, user: 3Dのゲームとして実装、2Dは廃止 · ミッドナイトベース).
   One board for now — "Midnight": a slab of deep-blue lacquer with a neon glass rim, the rows of round sockets drilled in it,
   the row numbers and the 2×2 answer pins beside each row; at the far end a jewel case holds the hidden code under a lid
   marked ？ (it opens when the game ends).
   Pieces: glass cabochons with a picture inside (炎 · 稲妻 · 葉 · しずく · 月 · ハート · 星 · 結晶) — or a digit for the
   ナンバー 種目. Answer pins: ヒット = yellow-green, ブロー = white.
   Registers into Table3D:
     Table3D.MODELS.hitblow(live)   the showcase board (a race half played) unless live
     Table3D.hitblow = { board(cfg) → Group, gem(kind, v) → Group, pin(hit) → Mesh, ICONS, COLORS, DIGIT, R, TOP }
   board(cfg) userData: { cfg, rows, slot(row, k) → [x, z] (row 0 = the first row, under the case), pinPos(row, k) → [x, z],
     caseSlot(k) → [x, y, z], lid (the lid's hinge Group), rowZ(row), rowMark(row, who) (who 0 / 1 / 2 = ghost), active(row),
     W, L, top, pitch, sock (the socket radius) }
   Units: one socket pitch is 1.0; the board's top is at y = TOP.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const TOP = .42, R = .36, PITCH = 1, ROWP = .92, PIN = .1;
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const geos = {}, geo = (k, f) => geos[k + (LO() ? 'l' : 'h')] || (geos[k + (LO() ? 'l' : 'h')] = (g => { if (X.share) X.share(g); return g; })(f()));

  // the pictures inside the colour gems (24×24, also drawn in the page's palette — atlas/games/hitblow.js)
  const ICONS = [
    'M12 2.6c.7 3.4 4.4 5.1 4.4 9.6a4.4 4.4 0 0 1-8.8 0c0-2 .9-3.3 2.1-4.4-.1 1.8.6 2.9 1.8 3.2-.6-2.8-.2-5.7.5-8.4z',   // 0 炎
    'M13.6 2 5 13.4h6.1L10 22l9-12.6h-6.2z',                                                                                   // 1 稲妻
    'M19.5 4.5C10 4.6 4.6 9.8 4.6 18.6c.1.5.4.8.9.9C14.2 19.5 19.4 14 19.5 4.5zM5.6 18.4c3-4.4 6.4-7.6 10.2-9.6',            // 2 葉
    'M12 2.4c3.6 4.7 6.6 8.4 6.6 12.1a6.6 6.6 0 0 1-13.2 0c0-3.7 3-7.4 6.6-12.1z',                                          // 3 しずく
    'M15.2 2.8a9 9 0 1 0 6 15.4 7.4 7.4 0 0 1-6-15.4z',                                                                      // 4 月
    'M12 20.6 4.3 13a4.7 4.7 0 0 1 6.6-6.6L12 7.5l1.1-1.1a4.7 4.7 0 0 1 6.6 6.6z',                                          // 5 ハート
    'M12 2.6l2.8 5.8 6.3.8-4.6 4.3 1.2 6.3L12 16.8l-5.7 3 1.2-6.3-4.6-4.3 6.3-.8z',                                         // 6 星
    'M12 2.4 19.6 9 12 21.6 4.4 9zM4.4 9h15.2M9 9l3 12.6L15 9M8.6 2.9 9 9M15.4 2.9 15 9',                                    // 7 結晶
  ];
  const STROKE = [false, false, true, false, false, false, false, true];   // (leaf, crystal: their veins / facets are lines)
  const COLORS = ['#ff4f5e', '#ffcc33', '#3fd97a', '#3ea0ff', '#a97cff', '#ff76c4', '#ff9940', '#38e0e6'];
  // the ナンバー gems: clear glass tinted per digit, the digit inside
  const DIGIT = ['#9fb3ff', '#ff6b7a', '#ffb347', '#ffe066', '#7ee08a', '#4fd6c8', '#58a8ff', '#a48bff', '#ff8fd8', '#e8edf7'];
  const HIT = '#a6e81f', BLOW = '#f4f7ff';

  /* ---------- the gem's face: a planar picture seen from above (colour, depth, the picture, a soft inner light) ---------- */
  function gemTex(kind, v) {
    const key = 'hbGem' + kind + v;
    return X.canvasTex(key, 256, 256, (c, W) => {
      const col = kind === 'num' ? DIGIT[v] : COLORS[v];
      const g = c.createRadialGradient(W * .42, W * .38, W * .04, W * .5, W * .5, W * .52);
      g.addColorStop(0, mix(col, '#ffffff', .55)); g.addColorStop(.38, col); g.addColorStop(.86, mix(col, '#050817', .55)); g.addColorStop(1, mix(col, '#050817', .75));
      c.fillStyle = g; c.fillRect(0, 0, W, W);
      // an inner ring of light (the glass's edge seen through it)
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = W * .02; c.beginPath(); c.arc(W / 2, W / 2, W * .46, 0, 7); c.stroke();
      c.save(); c.translate(W / 2, W / 2);
      if (kind === 'num') {
        c.font = `800 ${W * .66}px "Outfit", "Zen Kaku Gothic New", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.lineJoin = 'round'; c.strokeStyle = 'rgba(10,8,30,.55)'; c.lineWidth = W * .07; c.strokeText(String(v), 0, W * .03);   // (a dark edge: the digit reads under any light, 2026-11-16)
        c.shadowColor = 'rgba(255,255,255,.6)'; c.shadowBlur = W * .03; c.fillStyle = '#ffffff'; c.fillText(String(v), 0, W * .03);
        c.shadowBlur = 0;
      } else {
        const s = W * .64 / 24; c.scale(s, s); c.translate(-12, -12.2);   // (2026-11-16 user: 柄は大きめに)
        const p = new Path2D(ICONS[v]);
        c.lineJoin = c.lineCap = 'round'; c.strokeStyle = 'rgba(10,8,30,.35)'; c.lineWidth = 2.6; c.stroke(p);   // (a soft dark edge: the picture reads on every colour)
        c.shadowColor = 'rgba(255,255,255,.95)'; c.shadowBlur = 9;
        if (STROKE[v]) { c.strokeStyle = 'rgba(255,255,255,.96)'; c.lineWidth = 1.9; c.lineJoin = c.lineCap = 'round'; c.fillStyle = 'rgba(255,255,255,.32)'; c.fill(p); c.stroke(p); }
        else { c.fillStyle = 'rgba(255,255,255,.95)'; c.fill(p); }
      }
      c.restore();
    });
  }
  function mix(a, b, k) { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, '0')).join(''); }
  const gemMat = (kind, v) => mat('gem' + kind + v, () => {
    const tx = gemTex(kind, v);
    const m = X.M({ map: tx, emissiveMap: tx, emissive: '#ffffff', emissiveIntensity: .78, roughness: .34, clearcoat: .35, clearcoatRoughness: .35, bump: false, envMapIntensity: .35 });   // (2026-11-16 user: the same in every room)
    m.emissive.set(0xffffff); return m;
  });
  // the cabochon: a low dome (lathe) whose UVs are projected from above — the picture sits flat on its face
  function domeGeo() {
    return geo('hbDome', () => {
      const TT = T(), pts = [], n = LO() ? 10 : 16, H = R * .82;
      for (let i = 0; i <= n; i++) { const a = i / n * Math.PI / 2; pts.push(new TT.Vector2(Math.cos(a) * R, Math.sin(a) * H)); }
      pts.unshift(new TT.Vector2(R * .9, -R * .14)); pts.unshift(new TT.Vector2(0.001, -R * .14));   // (bottom → top: the faces look outward)
      const gl = new TT.LatheGeometry(pts, LO() ? 24 : 40), P = gl.attributes.position, uv = gl.attributes.uv;
      for (let i = 0; i < P.count; i++) uv.setXY(i, .5 + P.getX(i) / (2 * R) * .98, .5 - P.getZ(i) / (2 * R) * .98);
      uv.needsUpdate = true; gl.computeVertexNormals(); return gl;
    });
  }
  function gem(kind, v) {
    const TT = T(), g = new TT.Group();
    const d = X.mesh(domeGeo(), gemMat(kind, v)); d.castShadow = true; d.receiveShadow = false; g.add(d);
    // a sharp highlight (a small bright cap off the top)
    const hl = new TT.Mesh(geo('hbHl', () => { const s = new TT.SphereGeometry(R * .2, 12, 8); s.scale(1, .45, .8); return s; }), mat('hbHlM', () => new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, depthWrite: false })));
    hl.position.set(-R * .34, R * .66, -R * .3); g.add(hl);
    g.userData = { kind, v, h: R * .82 };
    return g;
  }
  function pin(hit) {
    const TT = T();
    const m = X.mesh(geo('hbPin', () => { const s = new TT.SphereGeometry(PIN, LO() ? 12 : 18, LO() ? 8 : 12); s.scale(1, .8, 1); return s; }),
      mat('hbPin' + (hit ? 'h' : 'b'), () => { const c = hit ? HIT : BLOW, m = X.M({ color: c, roughness: .4, envMapIntensity: .3, emissive: c, emissiveIntensity: hit ? .75 : .32 }); m.emissive.convertSRGBToLinear(); return m; }));
    m.castShadow = false; return m;
  }

  /* ---------- the board ---------- */
  function layout(cfg) {
    const n = cfg.n, rows = cfg.rows;
    const lab = .95, gap = .3, fbw = 1.0, side = .42;
    const W = side + lab + n * PITCH + gap + fbw + side;
    const caseD = 1.55, top0 = .45, L = top0 + caseD + .35 + rows * ROWP + .45;
    const x0 = -W / 2 + side + lab, z0 = -L / 2 + top0 + caseD + .35;
    const slot = (r, k) => [x0 + (k + .5) * PITCH, z0 + (r + .5) * ROWP];
    const fbx = x0 + n * PITCH + gap + fbw / 2;
    // the answer pins: as many holes as gems in the row (2026-11-16 user) — 3: 2 over 1 · 4: 2 × 2 · 5: 3 over 2
    const PP = { 3: [[-.19, -.17], [.19, -.17], [0, .19]], 4: [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]], 5: [[-.25, -.17], [0, -.17], [.25, -.17], [-.13, .19], [.13, .19]] }[n] || [[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]];
    const pinPos = (r, k) => { const q = PP[Math.min(k, PP.length - 1)]; return [fbx + q[0], z0 + (r + .5) * ROWP + q[1]]; };
    const labX = x0 - lab / 2, caseZ = -L / 2 + top0 + caseD / 2, caseW = n * PITCH + .5, caseX = x0 + n * PITCH / 2;
    return { n, rows, W, L, x0, z0, slot, pinPos, fbx, labX, caseZ, caseW, caseD, caseX };
  }
  function topTex(cfg, Lt) {
    const PX = LO() ? 56 : 84, cw = Math.round(Lt.W * PX), ch = Math.round(Lt.L * PX);
    return X.canvasTex('hbTop' + cfg.n + 'x' + cfg.rows + (LO() ? 'l' : ''), cw, ch, (c, W, H) => {
      H = H || ch;
      const px = x => (x + Lt.W / 2) * PX, pz = z => (z + Lt.L / 2) * PX;
      // the lacquer: deep blue, lighter toward the far end, a fine grid in the varnish
      const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d2a66'); g.addColorStop(.45, '#121a45'); g.addColorStop(1, '#0a0f2c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      const rg = c.createRadialGradient(W * .5, H * .12, 10, W * .5, H * .3, H * .8); rg.addColorStop(0, 'rgba(120,150,255,.16)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = rg; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(130,160,255,.06)'; c.lineWidth = 1; for (let x = 0; x < W; x += PX * .25) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += PX * .25) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      // the inlaid neon line round the play field
      const fx0 = px(Lt.x0 - .95 + .08), fx1 = px(Lt.fbx + .5 + .02), fz0 = pz(Lt.z0 - .12), fz1 = pz(Lt.z0 + Lt.rows * ROWP + .12);
      rr(c, fx0, fz0, fx1 - fx0, fz1 - fz0, PX * .22); c.strokeStyle = 'rgba(120,170,255,.55)'; c.lineWidth = PX * .03; c.shadowColor = '#6f8cff'; c.shadowBlur = PX * .18; c.stroke(); c.shadowBlur = 0;
      // the rows
      for (let r = 0; r < Lt.rows; r++) {
        const zc = pz(Lt.z0 + (r + .5) * ROWP);
        if (r) { c.strokeStyle = 'rgba(140,170,255,.13)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(fx0 + PX * .15, pz(Lt.z0 + r * ROWP)); c.lineTo(fx1 - PX * .15, pz(Lt.z0 + r * ROWP)); c.stroke(); }
        // the row number
        c.font = `700 ${PX * .32}px "Outfit", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = 'rgba(200,214,255,.6)'; c.fillText(String(r + 1), px(Lt.labX + .12), zc + PX * .01);
        for (let k = 0; k < Lt.n; k++) socket(c, px(Lt.slot(r, k)[0]), zc, PX * (R + .06));
        // the answer pins' plate
        rr(c, px(Lt.fbx - .42), zc - PX * .42, PX * .84, PX * .84, PX * .16); c.fillStyle = 'rgba(4,7,26,.55)'; c.fill(); c.strokeStyle = 'rgba(140,170,255,.22)'; c.lineWidth = 1.2; c.stroke();
        for (let k = 0; k < Lt.n; k++) { const [x, z] = Lt.pinPos(r, k); pinHole(c, px(x), pz(z), PX * (Lt.n > 4 ? .1 : .11)); }
      }
      // the case's bed (the case stands here)
      rr(c, px(Lt.caseX - Lt.caseW / 2 - .1), pz(Lt.caseZ - Lt.caseD / 2 - .05), PX * (Lt.caseW + .2), PX * (Lt.caseD + .1), PX * .25); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
    });
  }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function socket(c, x, y, r) {
    const g = c.createRadialGradient(x, y + r * .25, r * .1, x, y, r); g.addColorStop(0, '#02030c'); g.addColorStop(.62, '#060a22'); g.addColorStop(.86, '#1a2560'); g.addColorStop(1, 'rgba(120,150,255,.0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.strokeStyle = 'rgba(150,180,255,.35)'; c.lineWidth = r * .07; c.beginPath(); c.arc(x, y, r * .9, Math.PI * .1, Math.PI * .9); c.stroke();
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(x, y, r * .9, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  }
  function pinHole(c, x, y, r) { const g = c.createRadialGradient(x, y + r * .3, 0, x, y, r); g.addColorStop(0, '#000'); g.addColorStop(.75, '#0b1030'); g.addColorStop(1, 'rgba(150,180,255,.35)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }

  const lacquer = () => mat('hbLacq', () => X.M({ color: '#10173c', roughness: .7, envMapIntensity: .2, bump: false }));
  const neonMat = (c, k) => mat('hbNeon' + c, () => { const m = new (T().MeshBasicMaterial)({ color: c, toneMapped: false }); m.color.convertSRGBToLinear(); if (k) m.color.multiplyScalar(k); return m; });
  // a rounded rectangle extruded (the board, the case, the lid)
  function rbox(w, d, h, r, bev) {
    const TT = T(), s = new TT.Shape(), x = -w / 2, z = -d / 2;
    s.moveTo(x + r, z); s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r); s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d); s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r); s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z);
    const b = bev == null ? Math.min(.06, h * .3) : bev;
    const ex = new TT.ExtrudeGeometry(s, { depth: Math.max(.001, h - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: LO() ? 2 : 3, curveSegments: LO() ? 5 : 8 });
    ex.rotateX(-Math.PI / 2); ex.translate(0, b, 0);   // (no mirroring: a mirrored solid turns its faces inside out — the sides flickered with self-shadow, 2026-11-16)
    return ex;
  }
  // a rounded-rect ring (the lid's skirt): outer w × d, wall t, height h, standing on y = 0
  function rframe(w, d, h, r, t) {
    const TT = T(), rr2 = (x, z, w, d, r, s) => { s.moveTo(x + r, z); s.lineTo(x + w - r, z); s.quadraticCurveTo(x + w, z, x + w, z + r); s.lineTo(x + w, z + d - r); s.quadraticCurveTo(x + w, z + d, x + w - r, z + d); s.lineTo(x + r, z + d); s.quadraticCurveTo(x, z + d, x, z + d - r); s.lineTo(x, z + r); s.quadraticCurveTo(x, z, x + r, z); return s; };
    const s = rr2(-w / 2, -d / 2, w, d, r, new TT.Shape()), hole = rr2(-w / 2 + t, -d / 2 + t, w - 2 * t, d - 2 * t, Math.max(.02, r - t), new TT.Path());
    s.holes.push(hole);
    const ex = new TT.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: LO() ? 5 : 8 }); ex.rotateX(-Math.PI / 2); return ex;
  }
  function planeTop(w, d, map) {
    const TT = T(), p = new TT.PlaneGeometry(w, d); p.rotateX(-Math.PI / 2);
    return new TT.Mesh(p, map);
  }

  function board(cfg) {
    const TT = T(), Lt = layout(cfg), g = new TT.Group(), BH = TOP;
    // the slab: lacquered body, the printed top, a neon tube round the top edge
    const body = X.mesh(geo('hbBody' + cfg.n + 'x' + cfg.rows, () => rbox(Lt.W, Lt.L, BH, .38, .08)), lacquer()); g.add(body);
    const top = planeTop(Lt.W - .16, Lt.L - .16, mat('hbTopM' + cfg.n + 'x' + cfg.rows, () => (() => { const tt = topTex(cfg, Lt), m = X.M({ map: tt, emissiveMap: tt, emissive: '#ffffff', emissiveIntensity: .55, roughness: .9, envMapIntensity: .12, bump: false }); m.emissive.set(0xffffff); return m; })()));   // (matte: the room's lamp glared on the glossy top, 2026-11-16)
    top.position.y = BH + .002; top.receiveShadow = true; g.add(top);
    const rim = (() => {
      const w = Lt.W / 2 - .07, d = Lt.L / 2 - .07, r = .32, pts = [];
      const arc = (cx, cz, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push(new TT.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } };
      arc(w - r, d - r, 0); arc(-w + r, d - r, Math.PI / 2); arc(-w + r, -d + r, Math.PI); arc(w - r, -d + r, Math.PI * 1.5);
      const t = new TT.Mesh(geo('hbRim' + cfg.n + 'x' + cfg.rows, () => new TT.TubeGeometry(new TT.CatmullRomCurve3(pts, true), LO() ? 80 : 160, .028, 6, true)), neonMat('#7fa2ff', 1.5));
      t.position.y = BH + .01; return t;
    })();
    g.add(rim);
    // the case: a tray with the code's sockets, a lid on a hinge at its far edge
    const cw = Lt.caseW, cd = Lt.caseD - .2, ch = .34;
    const tray = new TT.Group(); tray.position.set(Lt.caseX, BH, Lt.caseZ); g.add(tray);
    const shell = X.mesh(geo('hbCase' + cfg.n, () => rbox(cw, cd, ch, .22, .05)), mat('hbCaseM', () => X.M({ color: '#1a2150', roughness: .65, metalness: .1, envMapIntensity: .25, bump: false })));
    tray.add(shell);
    const velvet = planeTop(cw - .2, cd - .22, mat('hbVelvet', () => X.M({ color: '#2a0f3a', roughness: .95, sheen: 1, sheenColor: new (T().Color)('#a070ff'), bump: false })));
    velvet.position.y = ch + .003; tray.add(velvet);
    const caseSlots = [];
    for (let k = 0; k < cfg.n; k++) {
      const x = (k + .5 - cfg.n / 2) * PITCH;
      const cup = X.mesh(geo('hbCup', () => { const c = new TT.CircleGeometry(R + .06, 28); c.rotateX(-Math.PI / 2); return c; }), mat('hbCupM', () => new TT.MeshBasicMaterial({ color: 0x07040e, transparent: true, opacity: .75, depthWrite: false })));
      cup.position.set(x, ch + .006, 0); cup.renderOrder = 1; tray.add(cup);
      caseSlots.push([Lt.caseX + x, BH + ch - R * .36, Lt.caseZ]);   // (low enough to stay inside the closed lid)
    }
    const trim = new TT.Mesh(geo('hbTrim' + cfg.n, () => { const b = new TT.BoxGeometry(cw - .1, .03, .03); return b; }), neonMat('#c38bff', 1.4)); trim.position.set(0, ch * .55, cd / 2 + .005); tray.add(trim);
    // the lid (pivot on the far edge of the case)
    const hinge = new TT.Group(); hinge.position.set(Lt.caseX, BH + ch, Lt.caseZ - cd / 2); g.add(hinge);
    const lidG = new TT.Group(); lidG.position.set(0, 0, cd / 2); hinge.add(lidG);
    const lidM = mat('hbLidM', () => X.M({ color: '#2a3478', roughness: .65, metalness: .1, envMapIntensity: .25, bump: false }));
    const lid = X.mesh(geo('hbLid' + cfg.n, () => rbox(cw + .14, cd + .14, .22, .26, .06)), lidM); lidG.add(lid);
    // the skirt: the lid comes down over the case like a cap (2026-11-16 user: ケースで覆い被さるように — no gap to see into from the side)
    const skirt = X.mesh(geo('hbSkirt' + cfg.n, () => rframe(cw + .14, cd + .14, .17, .26, .06)), lidM); skirt.position.y = -.16; lidG.add(skirt);
    const lidFace = planeTop(cw - .16, cd - .16, mat('hbLidFace' + cfg.n, () => X.M({ map: lidTex(cfg.n, cw - .16, cd - .16), emissiveMap: lidTex(cfg.n, cw - .16, cd - .16), emissive: '#ffffff', emissiveIntensity: .6, roughness: .85, envMapIntensity: .12, bump: false, transparent: false })));
    lidFace.material.emissive.set(0xffffff); lidFace.position.y = .224; lidG.add(lidFace);
    // the active row's glow (a soft bar under the row being filled) and the who-guessed lights
    const act = new TT.Mesh(geo('hbAct' + cfg.n, () => { const p = new TT.PlaneGeometry(cfg.n * PITCH + .2, ROWP - .1); p.rotateX(-Math.PI / 2); return p; }), mat('hbActM', () => new TT.MeshBasicMaterial({ color: 0x7df3d2, transparent: true, opacity: .14, depthWrite: false, toneMapped: false })));
    act.renderOrder = 1; act.visible = false; act.position.set(Lt.x0 + cfg.n * PITCH / 2, BH + .006, 0); g.add(act);
    const marks = [];
    const rowMark = (r, who) => {
      if (marks[r]) { g.remove(marks[r]); marks[r] = null; }
      if (who == null) return;
      const c = who === 0 ? '#7df3d2' : who === 1 ? '#ff7ac8' : '#8f98c8';
      const m = new TT.Mesh(geo('hbMark', () => new TT.CylinderGeometry(.07, .07, .03, 16)), neonMat(c, 1.2));
      m.position.set(Lt.labX - .26, BH + .02, Lt.z0 + (r + .5) * ROWP); g.add(m); marks[r] = m;
    };
    g.userData = { cfg, rows: cfg.rows, slot: Lt.slot, pinPos: Lt.pinPos, caseSlot: k => caseSlots[k], lid: hinge, rowZ: r => Lt.z0 + (r + .5) * ROWP, rowMark,
      active: r => { act.visible = r != null && r >= 0; if (act.visible) act.position.z = Lt.z0 + (r + .5) * ROWP; }, W: Lt.W, L: Lt.L, top: BH, pitch: PITCH, sock: R + .06, _s: Math.max(Lt.W, Lt.L) / 2, _rb: Math.max(Lt.W, Lt.L) / 2 };
    return g;
  }
  // the input tray (2026-11-16 user: ゲーム盤と入力ボックスを同じ3Dに): a slab joined to the board's near edge, only while playing —
  // the row being made (sockets under the board's columns, the cursor ring), OK on the pins' column, and the palette (bigger gems).
  // Coordinates are the board's. userData: D (depth), z0, sock(k) → [x, z], pal(v) → [x, z], ok → [x, z, w, d], gemS (palette scale),
  // put(k, v|null), cursor(k|-1), okOn(bool), used(v, bool), off(bool)
  function tray(cfg, Lt0) {
    const TT = T(), Lt = Lt0 || layout(cfg), g = new TT.Group(), BH = TOP, n = cfg.n, C = cfg.c;
    const per = C > 8 ? Math.ceil(C / 2) : C, prow = Math.ceil(C / per);
    const pp = Math.min(1.2, (Lt.W - .7) / per), gemS = Math.min(1.3, pp / (2 * R) * .86);
    const rowH = 1.25, palH = pp * .98, D = .3 + rowH + prow * palH + .3, z0 = Lt.L / 2 + .14, zc = z0 + D / 2;
    const sz = z0 + .3 + rowH / 2, sock = k => [Lt.slot(0, k)[0], sz];
    const pal = v => { const r = Math.floor(v / per), q = v % per, m = Math.min(per, C - r * per); return [(q - (m - 1) / 2) * pp, z0 + .3 + rowH + (r + .5) * palH]; };
    const okW = .98, okD = .82, ok = [Lt.fbx, sz, okW, okD];
    const PX = 80, tex = X.canvasTex('hbTray' + n + 'c' + C, Math.round((Lt.W - .16) * PX), Math.round((D - .16) * PX), (c, W, H) => {
      const px = x => (x + (Lt.W - .16) / 2) * PX, pz = z => (z - (zc - (D - .16) / 2)) * PX;
      const gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#141d4c'); gr.addColorStop(1, '#0a0f2c'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(130,160,255,.06)'; c.lineWidth = 1; for (let x = 0; x < W; x += PX * .25) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let y = 0; y < H; y += PX * .25) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
      // the row's well: as the board's play field, a neon line round it
      const fx0 = px(Lt.x0 - .3), fx1 = px(Lt.x0 + n * PITCH + .3), f0 = pz(sz - rowH / 2 + .08), f1 = pz(sz + rowH / 2 - .08);
      rr(c, fx0, f0, fx1 - fx0, f1 - f0, PX * .3); c.fillStyle = 'rgba(2,4,18,.55)'; c.fill(); c.strokeStyle = 'rgba(120,170,255,.5)'; c.lineWidth = PX * .03; c.shadowColor = '#6f8cff'; c.shadowBlur = PX * .15; c.stroke(); c.shadowBlur = 0;
      for (let k = 0; k < n; k++) { const [x, z] = sock(k); socket(c, px(x), pz(z), PX * (R + .06)); }
      // the palette's bed
      const b0 = pz(z0 + .3 + rowH - .02), b1 = pz(z0 + D - .2);
      rr(c, px(-Lt.W / 2 + .3), b0, PX * (Lt.W - .6), b1 - b0, PX * .3); c.fillStyle = 'rgba(0,0,0,.28)'; c.fill(); c.strokeStyle = 'rgba(140,170,255,.18)'; c.lineWidth = 1.5; c.stroke();
      for (let v = 0; v < C; v++) { const [x, z] = pal(v); const r = PX * R * gemS * 1.02, gg = c.createRadialGradient(px(x), pz(z) + r * .2, r * .2, px(x), pz(z), r * 1.1); gg.addColorStop(0, 'rgba(0,0,0,.6)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gg; c.beginPath(); c.arc(px(x), pz(z), r * 1.1, 0, 7); c.fill(); }
    });
    const body = X.mesh(geo('hbTrayB' + n + 'c' + C, () => rbox(Lt.W, D, BH, .38, .08)), lacquer()); body.position.z = zc; g.add(body);
    const top = planeTop(Lt.W - .16, D - .16, mat('hbTrayT' + n + 'c' + C, () => { const m = X.M({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: .55, roughness: .9, envMapIntensity: .12, bump: false }); m.emissive.set(0xffffff); return m; }));
    top.position.set(0, BH + .002, zc); g.add(top);
    const rim = (() => { const w = Lt.W / 2 - .07, d = D / 2 - .07, r = .32, pts = [];
      const arc = (cx, cz, a0) => { for (let i = 0; i <= 6; i++) { const a = a0 + i / 6 * Math.PI / 2; pts.push(new TT.Vector3(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r)); } };
      arc(w - r, d - r, 0); arc(-w + r, d - r, Math.PI / 2); arc(-w + r, -d + r, Math.PI); arc(w - r, -d + r, Math.PI * 1.5);
      const t = new TT.Mesh(geo('hbTrayRim' + n + 'c' + C, () => new TT.TubeGeometry(new TT.CatmullRomCurve3(pts, true), LO() ? 60 : 120, .028, 6, true)), neonMat('#7fa2ff', 1.5)); t.position.set(0, BH + .01, zc); return t; })();
    g.add(rim);
    // OK: a raised key with its label (lit mint when the row is full)
    const okTex = on => X.canvasTex('hbOk' + (on ? 1 : 0), 160, 134, (c, W, H) => {
      const gr = c.createLinearGradient(0, 0, 0, H); if (on) { gr.addColorStop(0, '#a8ffe6'); gr.addColorStop(1, '#4fd6b0'); } else { gr.addColorStop(0, '#2c3672'); gr.addColorStop(1, '#1e2756'); }
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      c.font = '900 64px "Outfit", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = on ? '#0d3a33' : 'rgba(180,195,255,.55)'; c.fillText('OK', W / 2, H / 2 + 3);
    });
    const okM = on => mat('hbOkM' + (on ? 1 : 0), () => { const t = okTex(on), m = X.M({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: on ? .75 : .45, roughness: .6, envMapIntensity: .15, bump: false }); m.emissive.set(0xffffff); return m; });
    const okG = new TT.Group(); okG.position.set(ok[0], BH, ok[1]); g.add(okG);
    const okBody = X.mesh(geo('hbOkB', () => rbox(okW, okD, .16, .16, .04)), mat('hbOkBM', () => X.M({ color: '#1a2150', roughness: .6, envMapIntensity: .2, bump: false }))); okG.add(okBody);
    const okFace = planeTop(okW - .1, okD - .1, okM(false)); okFace.position.y = .165; okG.add(okFace);
    const okGlow = new TT.Mesh(geo('hbOkGl', () => { const p = new TT.PlaneGeometry(okW + .3, okD + .3); p.rotateX(-Math.PI / 2); return p; }), mat('hbOkGlM', () => new TT.MeshBasicMaterial({ color: 0x7df3d2, transparent: true, opacity: .22, depthWrite: false, toneMapped: false })));
    okGlow.position.y = .004; okGlow.visible = false; okGlow.renderOrder = 1; okG.add(okGlow);
    // the cursor: a mint ring round the socket a gem goes into
    const ring = new TT.Mesh(geo('hbCur', () => { const r = new TT.RingGeometry(R + .08, R + .15, 40); r.rotateX(-Math.PI / 2); return r; }), neonMat('#7df3d2', 1.6)); ring.position.y = BH + .012; ring.visible = false; g.add(ring);
    // the palette gems (their own materials: a used colour dims)
    const pgs = [];
    for (let v = 0; v < C; v++) { const m = gem(cfg.kind, v), [x, z] = pal(v); m.position.set(x, BH + .02, z); m.scale.setScalar(gemS); m.userData.pv = v;
      m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.userData.e0 = o.material.emissiveIntensity; } }); g.add(m); pgs.push(m); }
    const dim = (m, k) => m.traverse(o => { if (o.material && o.material.color) { if (o.userData.c0 == null) o.userData.c0 = o.material.color.clone(); o.material.color.copy(o.userData.c0).multiplyScalar(k); if (o.userData.e0 != null) o.material.emissiveIntensity = o.userData.e0 * k; } });
    const usedS = new Set(); let isOff = false;
    const paint = () => pgs.forEach((m, v) => { const u = usedS.has(v); dim(m, isOff ? .4 : u ? .3 : 1); m.position.y = BH + (u ? -.06 : .02); });
    const placed = [];
    g.userData = { D, z0, zc, W: Lt.W, sock, pal, ok, gemS, pp,
      put(k, v) { if (placed[k]) { g.remove(placed[k]); placed[k] = null; } if (v == null) return; const m = gem(cfg.kind, v), [x, z] = sock(k); m.position.set(x, BH - R * .12, z); g.add(m); placed[k] = m; },
      cursor(k) { ring.visible = k >= 0; if (k >= 0) { const [x, z] = sock(k); ring.position.x = x; ring.position.z = z; } },
      okOn(on) { okFace.material = okM(!!on); okGlow.visible = !!on; okG.position.y = BH + (on ? .03 : 0); },
      used(v, u) { if (u) usedS.add(v); else usedS.delete(v); paint(); }, usedAll(set) { usedS.clear(); set.forEach(v => usedS.add(v)); paint(); },
      off(o) { isOff = !!o; paint(); }, palGem: v => pgs[v] };
    return g;
  }
  function lidTex(n, w, d) {
    const PX = 96;
    return X.canvasTex('hbLidT' + n, Math.round(w * PX), Math.round(d * PX), (c, W, H) => {
      H = H || Math.round(d * PX);
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2b3683'); g.addColorStop(1, '#161c4c'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (let x = -H; x < W; x += 6) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x + H, H); c.stroke(); }
      for (let k = 0; k < n; k++) {   // a drawn ？ (no font needed)
        const x = (k + .5) / n * W, u = PX * .12; c.save(); c.translate(x, H / 2); c.shadowColor = '#b48cff'; c.shadowBlur = PX * .14; c.strokeStyle = 'rgba(232,220,255,.95)'; c.fillStyle = 'rgba(232,220,255,.95)'; c.lineWidth = u * .9; c.lineCap = 'round';
        c.beginPath(); c.arc(0, -u * 1.05, u * 1.05, Math.PI * 1.05, Math.PI * 2.35); c.quadraticCurveTo(0, -u * .2, 0, u * .55); c.stroke(); c.beginPath(); c.arc(0, u * 1.55, u * .5, 0, 7); c.fill(); c.restore();
      }
      c.shadowBlur = 0; c.strokeStyle = 'rgba(200,170,255,.5)'; c.lineWidth = 2; rr(c, 6, 6, W - 12, H - 12, PX * .16); c.stroke();
    });
  }

  // the showcase: a race in progress on the カラー board
  X.MODELS.hitblow = function (live) {
    const E = window.HitBlowEngine, cfg = E ? Object.assign({}, E.rule(1)) : { n: 4, c: 6, rep: false, kind: 'color', rows: 10 };
    const g = board(cfg), U = g.userData; if (live || !E) return g;
    const secret = [3, 0, 5, 1], rows = [[0, 1, 2, 3], [4, 3, 0, 5], [3, 5, 1, 0]];
    rows.forEach((code, r) => {
      code.forEach((v, k) => { const m = gem('color', v), [x, z] = U.slot(r, k); m.position.set(x, U.top - R * .12, z); g.add(m); });
      const f = E.feedback(secret, code); let k = 0;
      for (let i = 0; i < f.h; i++, k++) { const p = pin(true), [x, z] = U.pinPos(r, k); p.position.set(x, U.top + .03, z); g.add(p); }
      for (let i = 0; i < f.b; i++, k++) { const p = pin(false), [x, z] = U.pinPos(r, k); p.position.set(x, U.top + .03, z); g.add(p); }
      U.rowMark(r, r % 2);
    });
    return g;   // (no lit row on the showcase: only while playing, 2026-11-16 user)
  };
  X.hitblow = { board, tray, gem, pin, layout, ICONS, STROKE, COLORS, DIGIT, HIT, BLOW, R, TOP, mix };
})();
