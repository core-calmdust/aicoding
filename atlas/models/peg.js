/* =====================================================================
   Peg Solitaire on the 3D table — the 2D page's boards turned in wood (Table3D.BOARDS.peg, the page's own design setting):
   · a round board turned on a lathe (English, European, diamond, German): a flat face drilled with shallow cups, a groove
     round the rim where the taken marbles roll, a bead and a soft edge; the triangle: a thick triangular block with rounded
     corners and a straight groove along its foot.
   · woods: 'walnut' (the default), 'maple', 'stone' (pale marble), 'night' (dark lacquer with a gilt bead).
   · marbles: 'glass' (six colours, the default), 'pearl', 'steel', 'peg' (turned wooden pegs).
   Registers into Table3D:
     Table3D.MODELS.peg(live)   board (+ a game in progress unless live)
     Table3D.peg = { board(id, look), marble(i, set), LOOKS, SETS, R }
     userData: { id, B (PegEngine board), top, pt(i) → [x, z], groove(k) → [x, y, z], marble(i) → Group, R }
   Units: one hole spacing is 1.0. Needs ../peg/engine.js (window.PegEngine), loaded first by atlas/lazy.js.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const IMG = new URL('../../peg/img/', (document.currentScript && document.currentScript.src) || location.href).href;
  const T = () => window.THREE;
  const LO = () => !!(X.coarse || X.lite);
  const LOOKS = ['walnut', 'maple', 'stone', 'night', 'art', 'pop'], SETS = ['glass', 'pearl', 'peg', 'mod', 'rainbow', 'pop'];   // (2026-11-13: the jewels gone; pop: the pop-art board's own pieces)   // (art: colourful art — a white plate; pop: pop art; rainbow: soft rainbow balls, 2026-11-13)
  const R = .32, TOP = .5, CUP = .26, SINK = .1;   // (SINK: how far a ball sits down into its cup)
  const pref = () => { try { return (JSON.parse(localStorage.getItem('aicoding-peg') || '{}') || {}).settings || {}; } catch (e) { return {}; } };
  const lookNow = () => { const v = pref().bd; return LOOKS.includes(v) ? v : 'walnut'; };
  const setNow = () => { const v = pref().pg; return SETS.includes(v) ? v : 'glass'; };
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());
  const geos = {}, geo = (k, f) => geos[k + (LO() ? 'l' : 'h')] || (geos[k + (LO() ? 'l' : 'h')] = (g => { if (X.share) X.share(g); return g; })(f()));

  /* ---------- woods ---------- */
  function woodMat(look) {
    return mat('w' + look, () => {
      if (look === 'maple') return X.M({ map: X.wood('pgMaple', '#e4c08a', '#b98a52'), roughness: .5, clearcoat: .35, clearcoatRoughness: .4 });
      if (look === 'stone') return X.M({ map: X.canvasTex('pgMarble', 512, 512, (c, W) => {
        c.fillStyle = '#e4e0d8'; c.fillRect(0, 0, W, W);
        let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 26; k++) { c.strokeStyle = `rgba(${120 + r() * 40},${115 + r() * 40},${110 + r() * 40},${.15 + r() * .3})`; c.lineWidth = .6 + r() * 2.2; c.beginPath(); let x = r() * W, y = r() * W; c.moveTo(x, y); for (let i = 0; i < 14; i++) { x += (r() - .5) * 90; y += (r() - .3) * 60; c.lineTo(x, y); } c.stroke(); }
      }), roughness: .28, clearcoat: .7, clearcoatRoughness: .2 });
      if (look === 'night') return X.M({ color: '#2b1f42', roughness: .22, clearcoat: 1, clearcoatRoughness: .12 });
      if (look === 'art') return X.M({ color: '#f7f4ee', roughness: .55 });
      if (look === 'pop') return X.M({ color: '#111111', roughness: .45 });
      return X.M({ map: X.wood('pgWalnut', '#8f5a36', '#4a2a16'), roughness: .48, clearcoat: .4, clearcoatRoughness: .35 });
    });
  }
  const rimMat = look => mat('rim' + look, () => look === 'night' ? X.M({ color: '#e2bd6a', metalness: 1, roughness: .3 }) : look === 'pop' ? X.M({ color: '#ffdb1e', roughness: .5 }) : woodMat(look));
  // a drilled cup: dark at the bottom, lit on the far wall (a disc with a radial picture, the face stays one piece)
  const cupMat = look => mat('cup' + look, () => X.M({ map: X.canvasTex('pgCup' + look, 128, 128, (c, W) => {
    const dark = { walnut: '#1a0d05', maple: '#4f3014', stone: '#3a3631', night: '#05030a', art: '#b58c5a', pop: '#111111' }[look];
    const g = c.createRadialGradient(W * .5, W * .56, W * .05, W * .5, W * .5, W * .5); g.addColorStop(0, dark); g.addColorStop(.72, dark); g.addColorStop(.86, 'rgba(255,240,220,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.fill();
  }), transparent: true, roughness: .9, depthWrite: false, bump: false }));
  const faceMat = (look, id) => mat('face' + look + id, () => {
    const tx = new (T().TextureLoader)().load(IMG + 'bd-' + look + '-' + id + '.webp?v=8', () => { if (X.kick) X.kick(200); });
    tx.anisotropy = 4; if (T().sRGBEncoding) tx.encoding = T().sRGBEncoding;
    return new (T().MeshStandardMaterial)({ map: tx, transparent: false, alphaTest: .92, roughness: .45, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });   // (opaque + alpha test: no sorting flicker with the marbles)
  });
  const grooveMat = look => mat('gr' + look, () => X.M({ color: { walnut: '#2a170c', maple: '#7a5530', stone: '#8e8a82', night: '#0b0714', art: '#ece8df', pop: '#111111' }[look], roughness: .8 }));

  /* ---------- the boards ---------- */
  function shape(B) {
    if (B.geoT) return B.geoT;
    const xs = B.pos.map(p => p[0]), ys = B.pos.map(p => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const pts = B.pos.map(([x, y]) => [x - cx, y - cy]);
    if (B.tri) {
      const top = Math.min(...pts.map(p => p[1])), bot = Math.max(...pts.map(p => p[1])), half = (Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]))) / 2;
      const s3 = Math.sqrt(3), m = 1.05, dy = .9;
      const P = [[0, top - m * 2], [-half - m * s3, bot + m + dy], [half + m * s3, bot + m + dy]];
      const span = Math.max(P[2][0] - P[1][0], P[1][1] - P[0][1]);
      return (B.geoT = { tri: true, pts, P, groove: { z: bot + 1.35, x0: -half - 1.1, x1: half + 1.1 }, size: span + .3, oz: (P[0][1] + P[1][1]) / 2 });
    }
    const Rr = Math.max(...pts.map(([x, y]) => Math.hypot(x, y))) + 1.22;   // (the 2D page's geometry: its pictures line up)
    return (B.geoT = { tri: false, pts, R: Rr, gr: Rr - .48, size: Rr * 2 + .12, oz: 0 });
  }
  // the pyramid (2026-11-14): a square wooden plinth with the 16 cups of the bottom layer and a groove round it; above it a
  // glass cage — four slanted rods up the pyramid's edges, and for each upper layer a lattice of glass rings (the cups of
  // that layer) joined by short rods. Every hole has its height: userData.y(i) = layer × LH.
  const LH = .72;
  function pyramid(id, look) {
    const TT = T(), E = window.PegEngine, B = E.BOARDS[id], g = new TT.Group(), n = B.layers, m0 = (n - 1) / 2;
    const pts = B.pos.map(([x, y]) => [x - m0, y - m0]); rbPts = pts;
    const W = woodMat(look).clone(), GM = grooveMat(look).clone(), RM = rimMat(look).clone();
    const half = m0 + 1.35, gr = m0 + .95, rr = .55;   // (the plinth's half width, the groove's square, the corner radius)
    const rsq = (h, r) => { const s = new TT.Shape(); s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r); s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h); s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r); s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h); return s; };
    const body = X.mesh(geo('pgPyrBody', () => { const ex = new TT.ExtrudeGeometry(rsq(half - .08, rr), { depth: TOP - .08, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 6 }); ex.rotateX(-Math.PI / 2); return ex; }), W);
    g.add(body);
    // the groove: a dark square ring round the cups, and a bead on the rim
    const gv = X.mesh(geo('pgPyrG', () => { const s = rsq(gr + .22, .45); s.holes.push(rsq(gr - .22, .3)); const p = new TT.ShapeGeometry(s, 6); p.rotateX(-Math.PI / 2); return p; }), GM, 0, TOP + .003, 0); gv.castShadow = false; g.add(gv);
    const bead = X.mesh(geo('pgPyrBead', () => { const s = rsq(half - .2, rr - .1), pp = s.getSpacedPoints(LO() ? 60 : 120).map(v => new TT.Vector3(v.x, 0, -v.y)); return new TT.TubeGeometry(new TT.CatmullRomCurve3(pp, true), LO() ? 60 : 120, .03, 5, true); }), RM, 0, TOP + .005, 0); g.add(bead);
    // the bottom layer's cups (the round boards' cup picture, one instanced disc)
    const base = B.cells.map((c, i) => i).filter(i => !B.z[i]);
    const cupG = geo('pgPyrCup', () => { const c = new TT.CircleGeometry(CUP * 1.45, 28); c.rotateX(-Math.PI / 2); return c; });
    const cups = new TT.InstancedMesh(cupG, cupMat(look), base.length), M4 = new TT.Matrix4();
    base.forEach((i, k) => { M4.makeTranslation(pts[i][0], TOP + .004, pts[i][1]); cups.setMatrixAt(k, M4); }); cups.renderOrder = 1; g.add(cups);
    // the glass: rings for the upper cups, rods (one unit cylinder, scaled and turned per rod)
    const glass = mat('pgGlass', () => X.M({ color: '#e8f6ff', roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .5, envMapIntensity: 1.8, bump: false }));
    const up = B.cells.map((c, i) => i).filter(i => B.z[i]), RG = .27;
    const ringG = geo('pgPyrRing', () => { const t = new TT.TorusGeometry(RG, .028, 6, LO() ? 20 : 32); t.rotateX(Math.PI / 2); return t; });
    const rings = new TT.InstancedMesh(ringG, glass, up.length);
    up.forEach((i, k) => { M4.makeTranslation(pts[i][0], TOP + B.z[i] * LH, pts[i][1]); rings.setMatrixAt(k, M4); }); g.add(rings);
    const rods = [], V = (x, y, z) => new TT.Vector3(x, y, z);
    for (let L = 1; L < n; L++) {
      const y = TOP + L * LH, k = n - L, o = m0 - L / 2, at = (r, c) => [c + L / 2 - m0, r + L / 2 - m0], e = o + .5;   // (e: the layer's outline, half a step outside its holes)
      for (let r = 0; r < k; r++) for (let c = 0; c < k; c++) {
        const [x, z] = at(r, c);
        if (c + 1 < k) rods.push([V(x + RG, y, z), V(x + 1 - RG, y, z)]);
        if (r + 1 < k) rods.push([V(x, y, z + RG), V(x, y, z + 1 - RG)]);
        if (c === 0) rods.push([V(-e, y, z), V(x - RG, y, z)]); if (c === k - 1) rods.push([V(x + RG, y, z), V(e, y, z)]);
        if (r === 0) rods.push([V(x, y, -e), V(x, y, z - RG)]); if (r === k - 1) rods.push([V(x, y, z + RG), V(x, y, e)]);
      }
      rods.push([V(-e, y, -e), V(e, y, -e)], [V(e, y, -e), V(e, y, e)], [V(e, y, e), V(-e, y, e)], [V(-e, y, e), V(-e, y, -e)]);
    }
    const e0 = m0 + .5, eT = .5, yT = TOP + (n - 1) * LH;   // the four edges of the pyramid, from the plinth to the top layer's outline
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => rods.push([V(sx * e0, TOP, sz * e0), V(sx * eT, yT, sz * eT)]));
    const rodG = geo('pgPyrRod', () => new TT.CylinderGeometry(.022, .022, 1, 6, 1, true));
    const rodM = new TT.InstancedMesh(rodG, glass, rods.length), Q = new TT.Quaternion(), Y = V(0, 1, 0), S3 = V(1, 1, 1);
    rods.forEach(([a, b], k) => { const d = b.clone().sub(a), l = d.length(); Q.setFromUnitVectors(Y, d.normalize()); S3.set(1, l, 1); M4.compose(a.clone().add(b).multiplyScalar(.5), Q, S3); rodM.setMatrixAt(k, M4); });
    g.add(rodM);
    // a glass bead on the top
    g.add(X.mesh(geo('pgPyrTop', () => new TT.SphereGeometry(.07, 10, 8)), glass, 0, yT + .05, 0));
    [rings, rodM].forEach(m => { m.castShadow = false; m.renderOrder = 3; });
    const side = 2 * gr, nPer = Math.floor(side / .62);
    g.userData = {
      id, B, look, top: TOP, R, W: half * 2, H: half * 2, sink: 0, LH, tall: yT - TOP + R * 2, pyr: true,
      pt: i => pts[i].slice(), y: i => B.z[i] * LH,
      // the taken marbles go round the groove: along the front, up the right side, the back, the left (a corner each time)
      groove: k => { const s = k % (nPer * 4), sd = Math.floor(s / nPer), t = ((s % nPer) + .5) / nPer * side - gr; const xz = [[t, gr], [gr, -t], [-t, -gr], [-gr, t]][sd]; return [xz[0], TOP + R * .78, xz[1]]; },
      marble: (i, set) => marble(i, set),
      setSet: k => { if (!LOOKS.includes(k) || k === g.userData.look) return; g.userData.look = k; W.copy(woodMat(k)); RM.copy(rimMat(k)); GM.copy(grooveMat(k)); cups.material = cupMat(k); [W, RM, GM].forEach(m => { m.needsUpdate = true; }); if (X.kick) X.kick(300); },
    };
    return g;
  }
  function board(id, look) {
    id = id || 'english'; look = LOOKS.includes(look) ? look : lookNow();
    if (window.PegEngine.BOARDS[id].pyr) return pyramid(id, look);
    const TT = T(), E = window.PegEngine, B = E.BOARDS[id], S = shape(B), g = new TT.Group(); rbPts = S.pts;
    // this board's own materials, swapped in place by setSet (the portal's 盤 row: a board kept from before / merged meshes
    // still show the chosen design — the same fix as chess)
    const W = woodMat(look).clone(), RM = rimMat(look).clone(), GM = grooveMat(look).clone(), FM = faceMat(look, id).clone();
    if (!S.tri) {
      const Rr = S.R, gr = S.gr, prof = [[0, TOP], [gr - .34, TOP], [gr - .3, TOP - .03], [gr - .22, TOP - .12], [gr, TOP - .16], [gr + .22, TOP - .12], [gr + .3, TOP - .03], [gr + .34, TOP], [Rr - .14, TOP - .012], [Rr - .04, TOP - .04], [Rr, TOP - .14], [Rr + .02, .12], [Rr - .06, 0], [0, 0]];
      const body = X.mesh(geo('pgBody' + id, () => { const L = new TT.LatheGeometry(prof.map(([a, b]) => new TT.Vector2(a, b)).reverse(), LO() ? 48 : 96), uv = L.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - Math.abs(uv.getX(i) * 2 - 1)); return L; }), W);   // (the wood picture mirrored half way round: no seam where its two ends met, 2026-11-13)
      g.add(body);
      // the groove's dark floor and a bead (gilt on the lacquer board) on the rim
      const gf = X.mesh(geo('pgGF' + id, () => { const r = new TT.RingGeometry(gr - .2, gr + .2, LO() ? 48 : 96); r.rotateX(-Math.PI / 2); return r; }), GM, 0, TOP - .155, 0); gf.castShadow = false; g.add(gf);
      const bead = X.mesh(geo('pgBead' + id, () => { const t = new TT.TorusGeometry(Rr - .1, .035, 6, LO() ? 60 : 120); t.rotateX(Math.PI / 2); return t; }), RM, 0, TOP - .05, 0); g.add(bead);   // (kept under the picture: nothing pokes through the face)
    } else {
      const sh = new TT.Shape(), P = S.P, rr = .7;
      for (let i = 0; i < 3; i++) {
        const a = P[(i + 2) % 3], b = P[i], c = P[(i + 1) % 3], v1 = [a[0] - b[0], a[1] - b[1]], v2 = [c[0] - b[0], c[1] - b[1]], l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        const s = [b[0] + v1[0] / l1 * rr, b[1] + v1[1] / l1 * rr], e = [b[0] + v2[0] / l2 * rr, b[1] + v2[1] / l2 * rr];
        if (i) sh.lineTo(s[0], -s[1]); else sh.moveTo(s[0], -s[1]); sh.quadraticCurveTo(b[0], -b[1], e[0], -e[1]);
      }
      const ex = new TT.ExtrudeGeometry(sh, { depth: TOP - .08, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 8 });
      ex.rotateX(-Math.PI / 2); ex.translate(0, .0, 0);
      g.add(X.mesh(geo('pgTri', () => ex), W));
      const gz = S.groove.z, gl = S.groove.x1 - S.groove.x0;
      const gv = X.mesh(geo('pgTriG', () => { const p = new TT.PlaneGeometry(gl, .42); p.rotateX(-Math.PI / 2); return p; }), GM, (S.groove.x0 + S.groove.x1) / 2, TOP + .002, gz); gv.castShadow = false; g.add(gv);
    }
    // the face: the 2D page's own picture of this board (peg/img/bd-<look>-<board>.webp: wood / stone / lacquer, inlay, cups, groove),
    // laid over the turned body so both views show the same set (2026-11-11)
    const face = X.mesh(geo('pgFace' + id, () => { const p = new TT.PlaneGeometry(S.size, S.size); p.rotateX(-Math.PI / 2); return p; }), FM, 0, TOP + .002, S.oz);
    face.castShadow = false; face.receiveShadow = true; g.add(face);
    g.userData = {
      id, B, look, top: TOP, R, W: S.tri ? S.P[2][0] * 2 : S.R * 2, H: S.tri ? S.P[1][1] - S.P[0][1] : S.R * 2, sink: 0,
      pt: i => S.pts[i].slice(), y: () => 0,
      groove: k => { if (S.tri) { const n = 13, x = S.groove.x0 + (S.groove.x1 - S.groove.x0) * ((k % n) + .5) / n; return [x, TOP + R * .78, S.groove.z]; } const step = Math.min(.66 / S.gr, Math.PI * 2 / B.n), a = -Math.PI / 2 + (k + .5) * step * 1.02; return [Math.cos(a) * S.gr, TOP + R * .78, Math.sin(a) * S.gr]; },
      marble: (i, set) => marble(i, set),
      setSet: k => { if (!LOOKS.includes(k) || k === g.userData.look) return; g.userData.look = k; W.copy(woodMat(k)); RM.copy(rimMat(k)); GM.copy(grooveMat(k)); FM.copy(faceMat(k, id)); [W, RM, GM, FM].forEach(m => { m.needsUpdate = true; }); if (X.kick) X.kick(300); },
    };
    return g;
  }

  /* ---------- marbles ---------- */
  const GLASS = ['#3a8be0', '#36b678', '#f0a030', '#e04656', '#9a66e8', '#2fc2b0'];
  // the 2D page's sets (peg/tools/render_boards.py): glass marbles, glazed ceramic balls, round jewels, lacquered wooden pegs — six colours each
  const CERAMIC = ['#8cbca8', '#2b4085', '#d19a3d', '#cc3d29', '#ede6d1', '#333338'];
  const JEWEL = ['#d10a24', '#102ed1', '#089a4c', '#8c24cc', '#f79a1a', '#59cce6'];
  const POP = ['#f2242f', '#ff6f9e', '#ffc61f', '#3f80ff', '#f4f2ea', '#1a1a1e'];   // (the pop board's colours)
  // the rainbow set: the 32 balls of the user's reference photo, each in its own place. The photo is the English board turned 45°
  // (green arm upper left, blue upper right, purple lower right, red lower left); here it is turned back: green left, blue top, purple right, red bottom.
  // key 'u,v' = the hole in board steps (u → right, v → toward the player); the centre hole (empty in the photo) gets a cream ball.
  const RAINBOW = { '-3,-1': '#0a8172', '-3,0': '#83b259', '-3,1': '#6dc449', '-2,-1': '#189f90', '-2,0': '#b2da30', '-2,1': '#f9e87c', '-1,-3': '#104964', '-1,-2': '#02aadf', '-1,-1': '#95e0ad', '-1,0': '#ebe35a', '-1,1': '#f6d713', '-1,2': '#fab604', '-1,3': '#f74b4f', '0,-3': '#0b6496', '0,-2': '#a0d6e7', '0,-1': '#b4ded6', '0,1': '#fad405', '0,2': '#fe9633', '0,3': '#c84052', '1,-3': '#03bbdb', '1,-2': '#1fd1e9', '1,-1': '#9eb6e5', '1,0': '#f4d7d4', '1,1': '#e7bdcc', '1,2': '#fa7546', '1,3': '#ad4b4f', '2,-1': '#8951b6', '2,0': '#c9a5d7', '2,1': '#fd8a93', '3,-1': '#77586d', '3,0': '#a77cac', '3,1': '#ba66c6', '0,0': '#f4eee2' };
  const RB_KEYS = Object.keys(RAINBOW).map(k => k.split(',').map(Number));
  const PAINT = ['#c72924', '#1f5cb3', '#1f8047', '#e6a81f', '#6b338c', '#ebe6d6'];
  // abstract pieces (for the abstract board): flat matte discs, the top painted with the 2D page's motif (m-mod-<k>.webp)
  const MOD = ['#d4694a', '#e3b34a', '#2e8f8a', '#f0e6d4', '#ed8c80', '#5473b3'];
  const modTop = k => mat('mmodt' + k, () => {
    const tx = new (T().TextureLoader)().load(IMG + 'm-mod-' + k + '.webp?v=5', () => { if (X.kick) X.kick(200); });
    tx.anisotropy = 4; if (T().sRGBEncoding) tx.encoding = T().sRGBEncoding;
    return new (T().MeshStandardMaterial)({ map: tx, roughness: .75, metalness: 0 });
  });
  let rbPts = [];   // (the board in use: its holes, for the rainbow set's colours)
  function marbleMat(i, set) {
    const k = (i * 7 + 3) % 6;
    if (set === 'rainbow') {   // the painted wooden rainbow set: the photo's colours in the photo's places (2026-11-13)
      const n = rbPts.length || 1, cx = rbPts.reduce((t, q) => t + q[0], 0) / n, cz = rbPts.reduce((t, q) => t + q[1], 0) / n;
      const rr = Math.max(...rbPts.map(q => Math.hypot(q[0] - cx, q[1] - cz)), 1e-6), sc = Math.sqrt(10) / rr, q = rbPts[i] || [cx, cz];   // (the English board: one step = 1; other boards scaled to the same reach)
      const u = (q[0] - cx) * sc, v = (q[1] - cz) * sc;
      const near = RB_KEYS.map(k => [(k[0] - u) * (k[0] - u) + (k[1] - v) * (k[1] - v), RAINBOW[k[0] + ',' + k[1]]]).sort((p1, p2) => p1[0] - p2[0]);
      let c = near[0][1];
      if (near[0][0] > 1e-4) {   // a hole the photo's board doesn't have (the other boards): the colours of the three nearest balls, blended
        let w = 0; const rgb = [0, 0, 0];
        near.slice(0, 3).forEach(([d, h]) => { const k = 1 / (d * d + 1e-4); w += k; for (let j = 0; j < 3; j++) rgb[j] += k * parseInt(h.substr(1 + j * 2, 2), 16); });
        c = '#' + rgb.map(x => Math.round(x / w).toString(16).padStart(2, '0')).join('');
      }
      return mat('mrb' + c, () => X.M({ color: c, roughness: .6 }));   // the photo's colour as it is, matte
    }
    if (set === 'mod') return mat('mmod' + k, () => X.M({ color: MOD[k], roughness: .75 }));
    if (set === 'pearl') return mat('mcer' + k, () => X.M({ color: CERAMIC[k], roughness: .28, clearcoat: .8, clearcoatRoughness: .2 }));
    if (set === 'steel') return mat('mjw' + k, () => { const m = X.M({ color: JEWEL[k], roughness: 0, metalness: .1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 4.5, transparent: true, opacity: .84, flatShading: true }); m.emissive.set(JEWEL[k]).convertSRGBToLinear().multiplyScalar(.28); try { m.ior = 2.4; if ('iridescence' in m) { m.iridescence = 1; m.iridescenceIOR = 1.9; } } catch (e) {} return m; });   // (jewels, 2026-11-13: cut facets that each catch the light, see-through, a play of colour — sparkle, not a glass ball)
    if (set === 'pop') return mat('mpop' + k, () => X.M({ roughness: .62, bump: false, map: X.canvasTex('pgPop' + k, 256, 128, (c, W, H) => {   // matte painted toys, each with a pattern (2026-11-13)
      const bg = POP[k], fg = k === 4 ? '#f2242f' : k === 5 ? '#ffc61f' : k === 2 ? '#f2242f' : '#f4f2ea', kind = k % 3;
      c.fillStyle = bg; c.fillRect(0, 0, W, H); c.fillStyle = fg; c.strokeStyle = '#111'; c.lineWidth = 3;
      if (kind === 0) { for (let y = 10; y < H; y += 26) for (let x = (y / 26 % 2) * 16 + 8; x < W; x += 32) { c.beginPath(); c.arc(x, y, 6.5, 0, 7); c.fill(); } }   // polka dots
      else if (kind === 1) { for (const y of [H * .3, H * .5, H * .7]) { c.fillRect(0, y - 7, W, 14); c.fillStyle = '#111'; c.fillRect(0, y - 9, W, 2); c.fillRect(0, y + 7, W, 2); c.fillStyle = fg; } }   // stripes round the middle
      else { for (const x of [W * .25, W * .75]) { const y = H * .5, s2 = 22; c.beginPath(); c.moveTo(x, y + s2 * .9); c.bezierCurveTo(x - s2 * 1.6, y - s2 * .1, x - s2 * .6, y - s2 * 1.1, x, y - s2 * .35); c.bezierCurveTo(x + s2 * .6, y - s2 * 1.1, x + s2 * 1.6, y - s2 * .1, x, y + s2 * .9); c.fill(); c.stroke(); } }   // a heart on each side
    }) }));
    if (set === 'peg') return mat('mpeg' + k, () => X.M({ color: PAINT[k], roughness: .3, clearcoat: .7, clearcoatRoughness: .25 }));
    const c = GLASS[k];
    return mat('mg' + c, () => X.M({ color: c, roughness: .04, clearcoat: 1, clearcoatRoughness: .03, envMapIntensity: 1.6 }));
  }
  function marble(i, set) {
    set = SETS.includes(set) ? set : setNow();
    const TT = T(), g = new TT.Group();
    if (set === 'mod') {   // a flat disc, like a modern design object
      const k = (i * 7 + 3) % 6, h = R * .55;
      const d = X.mesh(geo('pgDisc', () => new TT.CylinderGeometry(R * .98, R * .98, h, LO() ? 20 : 40)), marbleMat(i, set), 0, h / 2 + .004, 0);
      d.material = [marbleMat(i, set), modTop(k), marbleMat(i, set)];
      d.rotation.y = -Math.PI / 2;
      g.add(d);
    } else if (set === 'peg') {   // a turned wooden peg standing in its cup
      const prof = [[0, 0], [.13, 0], [.14, .22], [.2, .3], [.24, .4], [.22, .48], [.14, .54], [0, .56]].map(([a, b]) => new TT.Vector2(a, b));
      g.add(X.mesh(geo('pgPegG', () => new TT.LatheGeometry(prof, LO() ? 12 : 20)), marbleMat(i, set), 0, -.12, 0));
    } else {
      const s = set === 'steel' ? X.mesh(geo('pgGem', () => new TT.IcosahedronGeometry(R, 2)), marbleMat(i, set), 0, R * .97 - SINK, 0)   // (a cut stone: big flat facets that flash)
        : X.mesh(geo('pgBall', () => new TT.SphereGeometry(R, LO() ? 14 : 22, LO() ? 10 : 15)), marbleMat(i, set), 0, R * .97 - SINK, 0);   // (sunk a little into its cup: it sits in the hole, not on it — 2026-11-13)
      if (set === 'pop') {   // a bold black outline round the ball (an inverted hull): a comic-print look
        const ol = new TT.Mesh(geo('pgBallOL', () => new TT.SphereGeometry(R * 1.07, LO() ? 12 : 18, LO() ? 8 : 12)), mat('mpopol', () => new TT.MeshBasicMaterial({ color: 0x111111, side: TT.BackSide })));
        ol.position.copy(s.position); g.add(ol);
      }
      if (set === 'steel') {
        s.rotation.set(i * .7, i * 1.3, i * .4);
        // a light inside the stone (a smaller, brighter stone glowing through the facets): the sparkle of a cut gem
        const k = (i * 7 + 3) % 6, core = new TT.Mesh(geo('pgGemCore', () => new TT.IcosahedronGeometry(R * .62, 1)), mat('mjwc' + k, () => new TT.MeshBasicMaterial({ color: new TT.Color(JEWEL[k]).lerp(new TT.Color('#ffffff'), .55), transparent: true, opacity: .7, blending: TT.AdditiveBlending, depthWrite: false, toneMapped: false })));
        core.position.copy(s.position); core.rotation.set(i * 1.1, i * .5, i * .9); g.add(core);
      }
      g.add(s);
      if (set === 'glass') {   // a twist of white inside the glass
        const sw = X.mesh(geo('pgSwirl', () => new TT.TorusGeometry(R * .48, R * .07, 6, 24, Math.PI * 1.2)), mat('mswirl', () => X.M({ color: '#ffffff', roughness: .3, transparent: true, opacity: .55 })), 0, R * .97 - SINK, 0);
        sw.rotation.set(.9 + (i % 5) * .3, (i % 7) * .9, .4); g.add(sw);
      }
    }
    g.userData = { i, set, h: R * 1.6 };
    return g;
  }

  X.MODELS.peg = function (live) {
    const E = window.PegEngine; if (!E) return new (T().Group)();
    const B = E.BOARDS.english, g = board('english'), U = g.userData;
    if (live) return g;
    // a game in progress: the classic start after eleven jumps of a solution, the taken marbles in the groove
    let a = E.startPos(B, B.center); const path = E.findPath(B, a, { target: B.center, time: 800 }).path || [];
    path.slice(0, 11).forEach(j => { a = E.apply(a, j); });
    B.cells.forEach((_, i) => { if (!a[i]) return; const m = marble(i), [x, z] = U.pt(i); m.position.set(x, TOP, z); g.add(m); const sh = X.contact(R * 1.05, .5); sh.position.set(x, TOP + .014, z); g.add(sh); });
    for (let k = 0; k < Math.min(11, path.length); k++) { const m = marble(path[k][1]), [x, y, z] = U.groove(k); m.position.set(x, y - R * .78, z); m.scale.setScalar(.85); g.add(m); }
    return g;
  };
  X.peg = { board, marble, LOOKS, SETS, R, look: lookNow, set: setNow };
})();
