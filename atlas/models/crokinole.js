/* =====================================================================
   Crokinole on the 3D table — two boards (Table3D.BOARDS.crokinole, chosen in the portal's 盤 row):
   · 'classic' (the default) the Ontario parlour board: a honey maple playing surface, lacquered, the 5 / 10 / 15 lines and the
              quadrant lines in black, a red ring round the 20 hole; eight brass pegs with black rubber sleeves on the 15 line;
              a green felt ditch and a round walnut rail. Discs of red- and black-stained maple with turned rings.
   · 'neon'      the night board of carrom carried over: black lacquer with the lines glowing in a flowing rainbow (gaming RGB),
              the rail's top edge and the pegs lit, discs of acrylic with an RGB ring that flash when they knock.
   Real proportions (NCA): a 26-inch playing surface, lines at 8 / 16 / 24 inches, a 1⅜-inch hole, a 2-inch ditch, 1¼-inch discs.
   Registers into Table3D:
     Table3D.MODELS.crokinole(live)   board (+ a few discs in play unless live)
     Table3D.crokinole = { board(look), LOOKS, K }
     userData: { top, K, look, RO (outer radius, world), RDITCH (the ditch's middle, world), DITCHY (its floor), xz(x, y),
                 piece(c 0|1) → Group, dot(c) → css colour }
   Units: K world units per cm (the 80 cm board ≈ 10 world units across).
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));
  const IN = 2.54, K = 10 / 80;
  const RB = 13 * IN, R5 = 12 * IN, R10 = 8 * IN, R15 = 4 * IN, RH = 1.375 * IN / 2, RD = 1.25 * IN / 2, RP = .55;
  const DW = 2 * IN, RR = RB + DW, RO = RR + 2.2;   // the ditch (2 in), the rail (2.2 cm thick)
  const TOP = .26, DY = TOP - 1.3 * K, RAIL_H = TOP + 2.4 * K, HD = .9 * K, PEG_H = 1.6 * K;
  const LOOKS = ['classic', 'neon'];
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  function phys(o) {
    const TT = T(), p = Object.assign({}, o);
    if (p.color !== undefined) p.color = lin(p.color);
    Object.keys(p).forEach(k => p[k] === undefined && delete p[k]);
    if (X.lite) { delete p.clearcoat; delete p.clearcoatRoughness; return new TT.MeshStandardMaterial(p); }
    return new TT[p.clearcoat !== undefined ? 'MeshPhysicalMaterial' : 'MeshStandardMaterial'](p);
  }
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const lookNow = () => X.BOARDS && X.BOARDS.crokinole ? X.BOARDS.crokinole.get() : 'classic';

  /* ---------- gaming RGB (the neon board): the glow's hue flows with the clock (as carrom's night board) ---------- */
  const RGB = { uT: { value: 0 } };
  const HUE = 'vec3 ckHue(float h){return clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);}\n';
  function rgbify(m, mode) {
    m.customProgramCacheKey = () => 'ckRGB' + mode;
    m.onBeforeCompile = sh => {
      sh.uniforms.uT = RGB.uT;
      if (mode !== 'uv') sh.vertexShader = 'varying vec3 vCkP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCkP = position;');
      sh.fragmentShader = 'uniform float uT;\n' + (mode !== 'uv' ? 'varying vec3 vCkP;\n' : '') + HUE + sh.fragmentShader;
      const hue = mode === 'uv' ? 'vec2 ckp = vUv - 0.5; float ckh = atan(ckp.y, ckp.x) / 6.2831853 - length(ckp) * 1.2 - uT * 0.16;'
        : mode === 'halo' ? 'float ckh = atan(vCkP.z, vCkP.x) / 6.2831853 + uT * 1.4;'
        : 'float ckh = atan(vCkP.z, vCkP.x) / 6.2831853 - uT * 0.5;';
      if (mode === 'halo') sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( outgoingLight, diffuseColor.a );', '{ ' + hue + ' outgoingLight = ckHue(fract(ckh)) * 1.15; }\ngl_FragColor = vec4( outgoingLight, diffuseColor.a );');
      else sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n{ ' + hue + ' float ckL = max(max(totalEmissiveRadiance.r, totalEmissiveRadiance.g), totalEmissiveRadiance.b); totalEmissiveRadiance = ckHue(fract(ckh)) * ckL * 1.2; }');
    };
    return m;
  }

  /* ---------- the playing surface: a canvas in board centimetres (the square round the circle) ---------- */
  function surfaceTex(look) {
    const W = SZ(2048);
    return X.canvasTex('ckSurf' + look + W, W, W, (g) => {
      const u = W / (2 * RB), X0 = cm => (cm + RB) * u, N = X.makeNoise(look === 'neon' ? 7 : 23), img = g.createImageData(W, W), d = img.data;
      if (look === 'neon') {
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 30, y / W * 30, 2), i = (y * W + x) * 4; d[i] = 11 - n * 6; d[i + 1] = 12 - n * 6; d[i + 2] = 24 - n * 8; d[i + 3] = 255; }
        g.putImageData(img, 0, 0);
        g.strokeStyle = 'rgba(70,90,200,.14)'; g.lineWidth = .06 * u;
        for (let r = 2; r < RB; r += 2) { g.beginPath(); g.arc(X0(0), X0(0), r * u, 0, 7); g.stroke(); }
      } else {
        // maple: pale honey, a soft straight grain, a slow colour drift
        for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
          const uu = x / W, v = y / W, warp = N(uu * 1.4, v * 3.5, 3) * 1.2;
          const ring = Math.sin((v * 9 + warp * 2) * Math.PI * 2) * .5 + .5, fib = N(uu * 26, v * 260, 2);
          const k = Math.pow(ring, 3) * .18 + fib * .14 + N(uu * 2.2, v * 2.2, 3) * .18, i = (y * W + x) * 4;
          d[i] = 238 - k * 40; d[i + 1] = 212 - k * 48; d[i + 2] = 162 - k * 60; d[i + 3] = 255;
        }
        g.putImageData(img, 0, 0);
      }
      const neon = look === 'neon';
      const ink = neon ? '#3ce6ff' : '#17110c', red = neon ? '#ff3fb4' : '#b8241c';
      const glow = c => { if (neon) { g.shadowColor = c; g.shadowBlur = 1.1 * u; } };
      const circ = (r, w, c) => { glow(c); g.strokeStyle = c; g.lineWidth = w * u; g.beginPath(); g.arc(X0(0), X0(0), r * u, 0, Math.PI * 2); g.stroke(); };
      circ(R5, .32, ink); circ(R10, .26, ink); circ(R15, .26, ink);
      // the quadrant lines: on the diagonals, from the 10 line out to the 5 line
      glow(ink); g.strokeStyle = ink; g.lineWidth = .26 * u;
      for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); g.beginPath(); g.moveTo(X0(c * R10), X0(s * R10)); g.lineTo(X0(c * R5), X0(s * R5)); g.stroke(); }
      // the ring round the 20 hole and a fine inner ring (decoration)
      g.fillStyle = red; glow(red); g.beginPath(); g.arc(X0(0), X0(0), (RH + .9) * u, 0, Math.PI * 2); g.arc(X0(0), X0(0), RH * u, Math.PI * 2, 0, true); g.fill();
      circ(R15 - 1.1, .1, neon ? '#b47bff' : 'rgba(23,17,12,.55)');
      g.shadowBlur = 0;
    });
  }

  /* ---------- the discs' faces ---------- */
  const FACE = { 0: '#b3312a', 1: '#211c19', n0: '#d8f6ff', n1: '#2a1f48' };
  function faceTex(kind) {
    return X.canvasTex('ckFace' + kind, SZ(256), SZ(256), (g, W) => {
      const c = W / 2; g.fillStyle = FACE[kind]; g.fillRect(0, 0, W, W);
      const ring = (r, w, col, blur) => { g.save(); if (blur) { g.shadowColor = col; g.shadowBlur = W * blur; } g.strokeStyle = col; g.lineWidth = W * w; g.beginPath(); g.arc(c, c, c * r, 0, 7); g.stroke(); g.restore(); };
      if (kind === 'n0' || kind === 'n1') { ring(.8, .05, kind === 'n0' ? '#3ce6ff' : '#ff3fb4', .06); ring(.5, .025, kind === 'n0' ? 'rgba(60,230,255,.6)' : 'rgba(255,63,180,.6)', .04); return; }
      const N = X.makeNoise(kind === 0 ? 3 : 5), img = g.getImageData(0, 0, W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) { const n = N(x / W * 2, y / W * 9, 2), i = (y * W + x) * 4, k = (n - .5) * 14; d[i] += k; d[i + 1] += k; d[i + 2] += k; }
      g.putImageData(img, 0, 0);
      const col = kind === 0 ? 'rgba(60,10,5,.35)' : 'rgba(255,230,200,.16)';
      for (const r of [.86, .58]) ring(r, .02, col);
    });
  }

  /* ---------- geometry ---------- */
  const geos = {};
  const share = g => { if (X.share) X.share(g); return g; };
  function discGeo() {
    if (geos.disc) return geos.disc;
    const TT = T(), r = RD * K, h = HD, b = h * .3, st = LO() ? 3 : 4, pts = [new TT.Vector2(.001, 0)];
    for (let i = 0; i <= st; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new TT.Vector2(r - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new TT.Vector2(.001, h));
    const g = new TT.LatheGeometry(pts, LO() ? 20 : 30), P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * r) + .5, P.getZ(i) / (2 * r) + .5);
    g.computeVertexNormals(); return (geos.disc = share(g));
  }
  function surfaceGeo() {
    if (geos.surf) return geos.surf;
    const TT = T(), sh = new TT.Shape(); sh.absarc(0, 0, RB * K, 0, Math.PI * 2, false);
    const h = new TT.Path(); h.absarc(0, 0, RH * K, 0, Math.PI * 2, true); sh.holes.push(h);
    const g = new TT.ShapeGeometry(sh, LO() ? 48 : 96); g.rotateX(-Math.PI / 2);
    const P = g.attributes.position, UV = g.attributes.uv;
    for (let i = 0; i < UV.count; i++) UV.setXY(i, P.getX(i) / (2 * RB * K) + .5, 1 - (P.getZ(i) / (2 * RB * K) + .5));
    return (geos.surf = share(g));
  }
  // the rail: a ring with a rounded top (lathe of its cross-section)
  function railGeo() {
    if (geos.rail) return geos.rail;
    const TT = T(), V = TT.Vector2, ri = RR * K, ro = RO * K, h = RAIL_H, b = .08, st = LO() ? 3 : 5, pts = [new V(ro, 0)];
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 * i / st; pts.push(new V(ro - b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    for (let i = 0; i <= st; i++) { const a = Math.PI / 2 + Math.PI / 2 * i / st; pts.push(new V(ri + b + Math.cos(a) * b, h - b + Math.sin(a) * b)); }
    pts.push(new V(ri, DY - .02));
    const g = new TT.LatheGeometry(pts, LO() ? 48 : 96); g.computeVertexNormals();
    const P = g.attributes.position, UV = g.attributes.uv;   // the grain runs round the rail
    for (let i = 0; i < UV.count; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)); UV.setXY(i, (a / (Math.PI * 2) + .5) * 6, P.getY(i) * 2 + Math.hypot(P.getX(i), P.getZ(i)) * .6); }
    return (geos.rail = share(g));
  }

  /* ---------- materials ---------- */
  function boardMats(look) {
    const TT = T();
    if (look === 'neon') return mat('bm' + look, () => {
      const st = surfaceTex(look), surf = phys({ map: st, color: '#4a4a4a', roughness: .25, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .5 });
      surf.emissiveMap = st; surf.emissive = new TT.Color(.95, .95, .95); rgbify(surf, 'uv');
      const glowM = () => { const m = phys({ color: '#000000', roughness: .4, metalness: 0 }); m.emissive = new TT.Color(1, 1, 1); m.emissiveIntensity = 1.6; return rgbify(m, 'ring'); };
      return { surf, edge: phys({ color: '#0b0c14', roughness: .25, metalness: 0 }), rail: phys({ color: '#0b0c14', roughness: .22, metalness: 0, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1 }),
        ditch: phys({ color: '#07070d', roughness: .95 }), glow: glowM(), peg: phys({ color: '#15151f', roughness: .3, metalness: .4 }), sleeve: glowM(), cup: phys({ color: '#05050a', roughness: 1 }), base: phys({ color: '#0b0c14', roughness: .5 }) };
    });
    return mat('bm' + look, () => {
      const rw = X.wood('ckWalnut', '#6b4426', '#2a170b', SZ(1024), SZ(256), 1.2); rw.wrapS = rw.wrapT = TT.RepeatWrapping;
      const brass = phys({ color: '#d4a64e', roughness: .25, metalness: 1, envMapIntensity: 1.2 }); brass.emissive = new TT.Color(0x2a1a06);
      return { surf: phys({ map: surfaceTex(look), color: '#ffffff', roughness: .2, metalness: 0, clearcoat: .9, clearcoatRoughness: .1, envMapIntensity: .85 }),
        edge: phys({ color: '#c9a576', roughness: .4 }), rail: phys({ map: rw, color: '#ffffff', roughness: .3, clearcoat: .8, clearcoatRoughness: .18, envMapIntensity: 1 }),
        ditch: phys({ color: '#1f4a34', roughness: 1 }), glow: null, peg: brass, sleeve: phys({ color: '#111111', roughness: .85 }), cup: phys({ color: '#0f0d0c', roughness: 1 }), base: phys({ map: rw, color: '#d8c8b8', roughness: .5 }) };
    });
  }
  function pieceMat(look, c) {
    const k = look === 'neon' ? 'n' + c : c;
    return mat('pc' + k, () => {
      const t = faceTex(k), neon = look === 'neon';
      const m = phys({ map: t, color: '#ffffff', roughness: .36, clearcoat: .4, clearcoatRoughness: .3, envMapIntensity: .85 });
      if (neon) { m.emissiveMap = t; m.emissive = new (T().Color)(.55, .55, .55); }
      return m;
    });
  }
  function pieceGroup(look, c) {
    const TT = T(), neon = look === 'neon', base = pieceMat(look, c), top = neon ? base.clone() : base, r = RD * K;
    const g = new TT.Group(), body = new TT.Mesh(discGeo(), top); body.castShadow = true; body.receiveShadow = false; g.add(body);
    g.userData = { c, r, h: HD };
    if (neon) {   // an RGB ring round the rim, a rainbow halo and shock ring when it knocks (as carrom's night board)
      const lm = rgbify(phys({ color: '#000000', roughness: .4, metalness: 0 }), 'ring'); lm.emissive = new TT.Color(1, 1, 1); lm.emissiveIntensity = .55;
      const led = new TT.Mesh(geos.led || (geos.led = share((() => { const q = new TT.TorusGeometry(r + .002, .007, 6, LO() ? 28 : 44); q.rotateX(Math.PI / 2); return q; })())), lm); led.position.y = HD * .5; g.add(led);
      const hm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const wm = rgbify(new TT.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: TT.AdditiveBlending, depthWrite: false }), 'halo');
      const hg = geos.halo || (geos.halo = share((() => { const q = new TT.RingGeometry(.5, 1, LO() ? 24 : 40); q.rotateX(-Math.PI / 2); return q; })()));
      const halo = new TT.Mesh(hg, hm); halo.position.y = HD + .002; halo.visible = false; halo.renderOrder = 3; g.add(halo);
      const wave = new TT.Mesh(hg, wm); wave.position.y = .006; wave.visible = false; wave.renderOrder = 3; g.add(wave);
      const e0 = top.emissive.clone();
      g.userData.flash = k => {
        k = Math.max(0, Math.min(1, k)); top.emissive.copy(e0).multiplyScalar(1 + 1.8 * k); lm.emissiveIntensity = .55 + 2.2 * k;
        halo.visible = wave.visible = k > .01; hm.opacity = .55 * k; wm.opacity = .3 * k * k;
        const sc = r * (1.2 + (1 - k) * .9), sw = r * (1.3 + (1 - k) * 2.2); halo.scale.set(sc, 1, sc); wave.scale.set(sw, 1, sw);
      };
    }
    return g;
  }

  /* ---------- the board ---------- */
  function board(look) {
    look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), g = new TT.Group(), BM = boardMats(look);
    // the body under it all (a low drum the size of the rail)
    const body = new TT.Mesh(geos.body || (geos.body = share(new TT.CylinderGeometry(RO * K, RO * K, DY - .02, LO() ? 48 : 96))), BM.base); body.position.y = (DY - .02) / 2; body.receiveShadow = true; g.add(body);
    // the ditch's floor
    const df = new TT.Mesh(geos.ditch || (geos.ditch = share((() => { const q = new TT.RingGeometry(RB * K - .01, RR * K + .01, LO() ? 48 : 96, 1); q.rotateX(-Math.PI / 2); return q; })())), BM.ditch); df.position.y = DY; df.receiveShadow = true; g.add(df);
    // the playing surface and its edge (it stands up out of the ditch)
    const surf = new TT.Mesh(surfaceGeo(), BM.surf); surf.position.y = TOP; surf.receiveShadow = true; g.add(surf);
    const edge = new TT.Mesh(geos.edge || (geos.edge = share(new TT.CylinderGeometry(RB * K, RB * K, TOP - DY, LO() ? 48 : 96, 1, true))), BM.edge); edge.position.y = (TOP + DY) / 2; g.add(edge);
    // the 20 hole: a shallow cup
    const cup = new TT.Mesh(geos.cup || (geos.cup = share(new TT.CylinderGeometry(RH * K, RH * K, .1, 24, 1, true))), new TT.MeshStandardMaterial({ color: 0x0c0b0a, roughness: 1, side: TT.BackSide })); cup.position.y = TOP - .05; g.add(cup);
    const cb = new TT.Mesh(geos.cupb || (geos.cupb = share((() => { const q = new TT.CircleGeometry(RH * K, 24); q.rotateX(-Math.PI / 2); return q; })())), BM.cup); cb.position.y = TOP - .095; g.add(cb);
    // the rail
    const rail = new TT.Mesh(railGeo(), BM.rail); rail.castShadow = rail.receiveShadow = true; g.add(rail);
    if (BM.glow) { const tube = new TT.Mesh(geos.tube || (geos.tube = share((() => { const q = new TT.TorusGeometry(RR * K + .03, .014, 6, LO() ? 64 : 128); q.rotateX(Math.PI / 2); return q; })())), BM.glow); tube.position.y = RAIL_H - .01; g.add(tube); }
    // the pegs on the 15 line: a post and a rubber sleeve
    const post = geos.post || (geos.post = share(new TT.CylinderGeometry(RP * K * .62, RP * K * .62, PEG_H, 16)));
    const sleeve = geos.sleeve || (geos.sleeve = share(new TT.CylinderGeometry(RP * K, RP * K, PEG_H * .55, 20)));
    for (let k = 0; k < 8; k++) {
      const a = (k + .5) * Math.PI / 4, x = Math.cos(a) * R15 * K, z = Math.sin(a) * R15 * K;
      const p = new TT.Mesh(post, BM.peg); p.position.set(x, TOP + PEG_H / 2, z); p.castShadow = true; g.add(p);
      const sl = new TT.Mesh(sleeve, BM.sleeve); sl.position.set(x, TOP + PEG_H * .32, z); sl.castShadow = true; g.add(sl);
    }
    if (look === 'neon') { surf.userData.keep = true; surf.onBeforeRender = () => { RGB.uT.value = performance.now() / 1000; }; }
    const U = g.userData;
    U.top = TOP; U.K = K; U.look = look; U.RO = RO * K; U.RDITCH = (RB + DW / 2) * K; U.DITCHY = DY; U.R = RD * K;
    U.xz = (x, y) => [x * K, y * K];
    U.piece = c => pieceGroup(look, c);
    U.dot = c => look === 'neon' ? (c === 0 ? '#bff0ff' : '#ff3fb4') : (c === 0 ? '#b3312a' : '#211c19');
    return g;
  }

  X.MODELS.crokinole = function (live, look) {
    const g = board(look);
    if (live) return g;
    // the showcase: a round in play — discs on the 15, 10 and 5, one behind a peg, two in the ditch
    const U = g.userData;
    const at = [[0, 3.2, 6.6], [1, -4.8, -5.4], [0, 12.6, 3.4], [1, -2.6, 13.8], [0, -14.4, 7.2], [1, 9.6, -11.2], [0, 4.2, 11.4], [1, 22.4, -6.4], [0, -21, -9.2], [1, 3.3, -9.2]];
    at.forEach(([c, x, y]) => { const m = U.piece(c), [a, b] = U.xz(x, y); m.position.set(a, TOP, b); g.add(m); const sh = X.contact(RD * K * 1.15, .4); sh.position.set(a, TOP + .004, b); g.add(sh); });
    for (const [c, a] of [[1, 2.2], [0, 4.1]]) { const m = U.piece(c), r = U.RDITCH; m.position.set(Math.cos(a) * r, DY, Math.sin(a) * r); g.add(m); }
    return g;
  };
  X.crokinole = { board, LOOKS, K };
})();
