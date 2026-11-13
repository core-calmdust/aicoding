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
  const LOOKS = ['walnut', 'maple', 'stone', 'night', 'art', 'pop'], SETS = ['glass', 'pearl', 'steel', 'peg', 'mod', 'rainbow'];   // (art: colourful art — a white plate; pop: pop art; rainbow: soft rainbow balls, 2026-11-13)
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
      if (look === 'art') return X.M({ color: '#f6f5f1', roughness: .7 });
      if (look === 'pop') return X.M({ color: '#111111', roughness: .45 });
      return X.M({ map: X.wood('pgWalnut', '#8f5a36', '#4a2a16'), roughness: .48, clearcoat: .4, clearcoatRoughness: .35 });
    });
  }
  const rimMat = look => mat('rim' + look, () => look === 'night' ? X.M({ color: '#e2bd6a', metalness: 1, roughness: .3 }) : look === 'pop' ? X.M({ color: '#ffdb1e', roughness: .5 }) : woodMat(look));
  // a drilled cup: dark at the bottom, lit on the far wall (a disc with a radial picture, the face stays one piece)
  const cupMat = look => mat('cup' + look, () => X.M({ map: X.canvasTex('pgCup' + look, 128, 128, (c, W) => {
    const dark = { walnut: '#1a0d05', maple: '#4f3014', stone: '#3a3631', night: '#05030a', art: '#c9c7c0', pop: '#111111' }[look];
    const g = c.createRadialGradient(W * .5, W * .56, W * .05, W * .5, W * .5, W * .5); g.addColorStop(0, dark); g.addColorStop(.72, dark); g.addColorStop(.86, 'rgba(255,240,220,.25)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, 7); c.fill();
  }), transparent: true, roughness: .9, depthWrite: false, bump: false }));
  const faceMat = (look, id) => mat('face' + look + id, () => {
    const tx = new (T().TextureLoader)().load(IMG + 'bd-' + look + '-' + id + '.webp?v=5', () => { if (X.kick) X.kick(200); });
    tx.anisotropy = 4; if (T().sRGBEncoding) tx.encoding = T().sRGBEncoding;
    return new (T().MeshStandardMaterial)({ map: tx, transparent: false, alphaTest: .92, roughness: .45, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1 });   // (opaque + alpha test: no sorting flicker with the marbles)
  });
  const grooveMat = look => mat('gr' + look, () => X.M({ color: { walnut: '#2a170c', maple: '#7a5530', stone: '#8e8a82', night: '#0b0714', art: '#dedcd5', pop: '#111111' }[look], roughness: .8 }));

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
  function board(id, look) {
    id = id || 'english'; look = LOOKS.includes(look) ? look : lookNow();
    const TT = T(), E = window.PegEngine, B = E.BOARDS[id], S = shape(B), g = new TT.Group(); rbPts = S.pts; rbR = Math.max(...S.pts.map(([x, y]) => Math.hypot(x, y))) || 3;
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
      pt: i => S.pts[i].slice(),
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
  const PAINT = ['#c72924', '#1f5cb3', '#1f8047', '#e6a81f', '#6b338c', '#ebe6d6'];
  // abstract pieces (for the abstract board): flat matte discs, the top painted with the 2D page's motif (m-mod-<k>.webp)
  const MOD = ['#d4694a', '#e3b34a', '#2e8f8a', '#f0e6d4', '#ed8c80', '#5473b3'];
  const modTop = k => mat('mmodt' + k, () => {
    const tx = new (T().TextureLoader)().load(IMG + 'm-mod-' + k + '.webp?v=5', () => { if (X.kick) X.kick(200); });
    tx.anisotropy = 4; if (T().sRGBEncoding) tx.encoding = T().sRGBEncoding;
    return new (T().MeshStandardMaterial)({ map: tx, roughness: .75, metalness: 0 });
  });
  let rbPts = [], rbR = 3;   // (the board in use: its holes, for the rainbow set's colours)
  function marbleMat(i, set) {
    const k = (i * 7 + 3) % 6;
    if (set === 'rainbow') {   // the painted wooden rainbow set (the user's reference): the colour by where the ball starts — greens top-left,
      // blues top-right, purples right, pinks bottom, reds and oranges bottom-left, yellows left; deep at the rim, pastel toward the centre
      const q = rbPts[i] || [0, 0], a = ((Math.atan2(q[0], -q[1]) * 180 / Math.PI) + 360) % 360, rr = Math.min(1, Math.hypot(q[0], q[1]) / rbR);
      const HK = [[0, 165], [55, 205], [100, 270], [150, 300], [190, 340], [235, 368], [270, 410], [315, 455], [360, 525]];
      let h = 165; for (let k = 1; k < HK.length; k++) if (a <= HK[k][0]) { const [a0, h0] = HK[k - 1], [a1, h1] = HK[k]; h = h0 + (h1 - h0) * (a - a0) / (a1 - a0); break; }
      h = Math.round((h % 360) / 6) * 6; const L = Math.round((.74 - .34 * rr) * 20) / 20, S2 = .5 + .2 * rr;
      return mat('mrb' + h + ':' + L, () => { const c = new (T().Color)().setHSL(h / 360, S2, L); return X.M({ color: '#' + c.getHexString(), roughness: .6 }); });
    }
    if (set === 'mod') return mat('mmod' + k, () => X.M({ color: MOD[k], roughness: .75 }));
    if (set === 'pearl') return mat('mcer' + k, () => X.M({ color: CERAMIC[k], roughness: .28, clearcoat: .8, clearcoatRoughness: .2 }));
    if (set === 'steel') return mat('mjw' + k, () => { const m = X.M({ color: JEWEL[k], roughness: 0, metalness: .1, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 4.5, transparent: true, opacity: .84, flatShading: true }); m.emissive.set(JEWEL[k]).convertSRGBToLinear().multiplyScalar(.28); try { m.ior = 2.4; if ('iridescence' in m) { m.iridescence = 1; m.iridescenceIOR = 1.9; } } catch (e) {} return m; });   // (jewels, 2026-11-13: cut facets that each catch the light, see-through, a play of colour — sparkle, not a glass ball)
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
