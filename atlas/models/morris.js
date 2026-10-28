/* =====================================================================
   Nine Men's Morris on the 3D table — a jeweller's board:
     • a frame of macassar ebony (one bevelled, rounded slab) on a brass plinth
     • the field: polished nero marble with violet clouds and fine veins,
       framed by a double gold stringing line
     • the three squares and the four cross lines are raised brass strips;
       each of the 24 points is a small gold rosette
     • two felt-lined channels left and right hold the pieces in hand
   Pieces: turned discs of polished gold and platinum with an engraved ring
   and a domed centre (the game's own gold / platinum colours).
   Everything is procedural (canvas textures, extrusions, lathes).
   Registers into Table3D:
     Table3D.MODELS.morris(live)   board (+ a mid-game position unless live)
        userData: { top, pt(x, y) → [x, z] (x, y = 0…6 on the 7 × 7 lattice), piece(color 'gold'|'plat') → Mesh }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const lerp3 = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];

  /* ---------- dimensions (board units; the whole group is scaled to the chabudai at the end) ---------- */
  const W = 11.2, D = 9.4;           // outer frame
  const F = 4.0;                     // field half size
  const CH = [4.3, 5.3];             // channel x range (both sides), z = ±F
  const Y0 = .08, YB = .44, YF = .62, YT = .67;   // plinth top, body top, field (marble) top, frame top
  const P = v => -3.4 + v * 6.8 / 6; // lattice 0…6 → board units
  const SCALE = .86;

  /* ---------- textures (cached) ---------- */
  const TX = {};
  function canvasTex(key, w, h, draw, o = {}) {
    if (TX[key]) return TX[key];
    const TT = T(), c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
    const t = new TT.CanvasTexture(c); t.anisotropy = 8; if (o.srgb !== false) t.encoding = TT.sRGBEncoding;
    if (o.wrap) t.wrapS = t.wrapT = TT.RepeatWrapping;
    return (TX[key] = t);
  }
  // nero marble: layered violet clouds with an overall flow (the noise domain is turned and stretched along one
  // direction); veins are contour lines of a smooth, gently warped field, measured as signed distance (value /
  // gradient): they widen and taper, keep a crisp edge on one side and feather out on the other, fade in and out
  // along their length, and split into secondary veins at shallow angles (neighbouring contour levels of the same
  // field). Broad diffuse bands sit in the ground; white / lilac / gold tints; faint crystalline glints.
  function marbleStone(g, w, h) {
    const mix = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    // fields are evaluated on grids (coarse for the slow ones) and sampled bilinearly: fbm per texel would be far too slow
    const grid = (G, fn) => { const a = new Float32Array((G + 1) * (G + 1)); for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) a[j * (G + 1) + i] = fn(i / G, j / G); a.G = G; return a; };
    const at = (a, u, v) => { const G = a.G, fx = Math.min(G - 1e-4, Math.max(0, u * G)), fy = Math.min(G - 1e-4, Math.max(0, v * G)), x = fx | 0, y = fy | 0, s = fx - x, t = fy - y, i = y * (G + 1) + x;
      return (a[i] * (1 - s) + a[i + 1] * s) * (1 - t) + (a[i + G + 1] * (1 - s) + a[i + G + 2] * s) * t; };
    const N1 = makeNoise(11), N2 = makeNoise(29), N3 = makeNoise(47), N4 = makeNoise(63), N5 = makeNoise(81), N6 = makeNoise(97);
    const K = 4, R = Math.max(64, w >> 1), CA = Math.cos(-.62), SA = Math.sin(-.62);
    // flow frame: X runs along the veins (stretched), Y across them; a smooth two-level warp bends them without folding
    const F0 = (u, v) => { const cu = u * K, cv = v * K; return [(cu * CA + cv * SA) * .42, (-cu * SA + cv * CA) * 1.25]; };
    const wa = grid(48, (u, v) => { const [x, y] = F0(u, v); return N1(x * .8, y * .5, 3); }), wb = grid(96, (u, v) => { const [x, y] = F0(u, v); return N2(x * 1.6 + 4, y * 1.1 + 2, 3); });
    const Fw = (u, v) => { const [x, y] = F0(u, v), a = at(wa, u, v), b = at(wb, u, v); return [x + (a - .5) * .8, y + (a - .5) * 2.6 + (b - .5) * .7]; };
    const cl = grid(128, (u, v) => { const [x, y] = Fw(u, v); return N3(x * .7, y * .45, 5); });
    const cl2 = grid(96, (u, v) => { const [x, y] = F0(u, v); return N3(x * 2 + 3, y * 1.2 + 7, 4); });
    // vein phases: a gradient across the flow plus turbulence; every integer level is a vein (classic marble, sin(y + turbulence))
    const fV = grid(R, (u, v) => { const [x, y] = Fw(u, v); return y * .38 + N4(x * .9, y * .9, 4) * 1.2; });            // main veins
    const fF = grid(R, (u, v) => { const [x, y] = Fw(u, v); return y * 1.35 + N6(x * 1.6 + 4, y * 1.6 + 1, 3) * 2.4 + .37; });  // finer veins
    const fBd = grid(128, (u, v) => { const [x, y] = Fw(u, v); return N5(x * .45 + 9, y * .5 + 3, 2); }); // broad bands
    const slow = (seed, f) => grid(64, (u, v) => { const [x, y] = F0(u, v); return seed(x * f, y * f * .6, 3); });
    const thk = slow((x, y, o) => N5(x + 2, y + 4, o), 1.4), opa = slow((x, y, o) => N2(x + 7, y + 1, o), 1.1), gate = slow((x, y, o) => N3(x + 13, y + 2, o), 1.3), tin = slow((x, y, o) => N1(x + 11, y + 4, o), .9);
    const G0 = hexRGB('#08070d'), G1 = hexRGB('#17132a'), G2 = hexRGB('#342b5c'), G3 = hexRGB('#4a3f7a');
    const VW = hexRGB('#a59bc2'), VL = hexRGB('#7d71a8'), VG = hexRGB('#a88c5a'), VS = hexRGB('#4a3f78');   // muted lilac-grey / soft gold: the dark stone dominates, the gold inlay reads on top
    let seed = 12345; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const img = g.createImageData(w, h), d = img.data, e = 1.5 / R, pxMin = .9 / w;
    // a vein across signed distance sd: solid core, crisp fall-off on one side, a long feather on the other
    const vein = (sd, hw) => { const a = Math.abs(sd), core = Math.max(hw * .45, pxMin * .6);
      if (a <= core) return 1;
      return sd < 0 ? Math.max(0, 1 - (a - core) / Math.max(pxMin, hw * .55)) : Math.exp(-(a - core) / Math.max(pxMin, hw * 1.7)) * .5; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const u = (x + .5) / w, v = (y + .5) / h;
      // clouds: deep layered violet haze, drifting with the flow
      const c1 = at(cl, u, v);
      let c = mix(G0, G1, sm(.3, .62, c1));
      c = mix(c, G2, sm(.5, .78, c1) * .7);
      c = mix(c, G3, sm(.62, .85, c1 * .7 + at(cl2, u, v) * .3) * .3);
      const grad = a => Math.max(1e-7, Math.hypot(at(a, u + e, v) - at(a, u - e, v), at(a, u, v + e) - at(a, u, v - e)) / (2 * e));   // (central differences over ~1.5 grid cells: smooth, no blocky steps)
      // broad diffuse bands blended into the ground
      const nb = at(fBd, u, v), sb = (nb - .5) / grad(fBd);
      c = mix(c, VS, Math.exp(-Math.pow(sb / .045, 2)) * .12);
      // main veins: width swells and tapers, opacity drifts along the length; secondary veins split off at shallow angles
      const pv = at(fV, u, v), gv = grad(fV), n = pv - Math.round(pv) + .5, tk = at(thk, u, v), op = sm(.4, .72, at(opa, u, v)), gt = sm(.45, .66, at(gate, u, v));
      const hw = .0006 + .0065 * sm(.35, .9, tk);
      let V = vein((n - .5) / gv, hw) * (.15 + .85 * op);
      V = Math.max(V, vein((n - .5 - .02) / gv, hw * .45) * gt * (.3 + .6 * op));
      V = Math.max(V, vein((.5 - .035 - n) / gv, hw * .35) * gt * op * .7);
      const near = Math.exp(-Math.abs(n - .5) / gv / .02);
      // finer veins: a quieter family that follows the same flow
      const pf = at(fF, u, v), F = vein((pf - Math.round(pf)) / grad(fF), .0011) * gt * gt * .5 * Math.min(1, w / 1024 + .25);
      // vein colour: white with lilac and gold drifts
      const tint = at(tin, u, v), gold = sm(.58, .7, tint), lil = sm(.5, .3, tint);
      let vc = mix(VW, VL, .2 + lil * .6); vc = mix(vc, VG, gold * .8);
      c = mix(c, mix(VL, vc, .5), Math.min(1, F) * .3);
      c = mix(c, vc, Math.min(1, V) * .65);
      // crystalline speckle: tiny glints, denser along the veins
      const r = rnd();
      if (r < .0006 + near * .01) c = mix(c, VL, .12 + rnd() * .3);
      else if (r > .997) c = mix(c, G0, .4);
      const k = (rnd() - .5) * 3, i = (y * w + x) * 4;
      d[i] = c[0] + k; d[i + 1] = c[1] + k; d[i + 2] = c[2] + k; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  // the field: the marble with a double gold stringing and corner fleurons
  function marble() {
    const S = SZ(1024);
    return canvasTex('nmMarble' + S, S, S, (g, w, h) => {
      marbleStone(g, w, h);
      // the double gold stringing round the field (a fine line, a gap, a finer line)
      const s = w / (2 * F), e = (m) => [m * s, w - 2 * m * s];
      g.strokeStyle = 'rgba(226,194,117,.95)'; g.lineWidth = Math.max(1.5, .045 * s); { const [a, b] = e(.22); g.strokeRect(a, a, b, b); }
      g.strokeStyle = 'rgba(226,194,117,.7)'; g.lineWidth = Math.max(1, .02 * s); { const [a, b] = e(.32); g.strokeRect(a, a, b, b); }
      // gold fleurons in the four corners of the stringing
      g.fillStyle = 'rgba(226,194,117,.95)';
      [[.27, .27], [2 * F - .27, .27], [.27, 2 * F - .27], [2 * F - .27, 2 * F - .27]].forEach(([cx, cy]) => {
        g.save(); g.translate(cx * s, cy * s); g.rotate(Math.PI / 4);
        for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(.05 * s, .07 * s, 0, .13 * s); g.quadraticCurveTo(-.05 * s, .07 * s, 0, 0); g.fill(); }
        g.restore();
      });
    });
  }
  // macassar ebony: near-black heartwood with long chocolate / honey streaks (fibres along x)
  function macassar(key, rx, ry) {
    const S = SZ(1024), base = canvasTex('nmMac' + S, S, S, (g, w, h) => {
      const N = makeNoise(7), img = g.createImageData(w, h), d = img.data;
      const A = hexRGB('#7a4a26'), B = hexRGB('#2a170b'), C = hexRGB('#0b0604');
      const val = (u, v) => {
        const warp = N(u * 1.4, v * 3.2, 3) * 2.6;
        const s1 = Math.sin((v * 9 + warp) * Math.PI) * .5 + .5, s2 = Math.sin((v * 31 + warp * 2.3) * Math.PI) * .5 + .5;
        const fib = N(u * 4, v * 160, 2);
        return Math.max(0, Math.min(1, Math.pow(s1, 3) * .55 + Math.pow(s2, 6) * .22 + (fib - .5) * .35 + (N(u * 60, v * 500, 1) > .85 ? .12 : 0)));
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const u = x / w, v = y / h, b = u;   // tileable in x
        const t = val(u, v) * (1 - b) + val(u - 1, v) * b;
        const c = t < .5 ? lerp3(C, B, t * 2) : lerp3(B, A, (t - .5) * 2), i = (y * w + x) * 4;
        d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { wrap: true });
    if (!rx) return base;
    const k = 'nmMac' + key + S; if (TX[k]) return TX[k];
    const t = base.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); t.offset.set(.5, .5); return (TX[k] = t);
  }
  // deep violet felt for the channels
  function felt() {
    const S = SZ(512);
    return canvasTex('nmFelt' + S, S, S, (g, w, h) => {
      const N = makeNoise(5), A = hexRGB('#2a2352'), img = g.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const k = (Math.random() - .5) * 20 + (N(x / 2.2, y / 2.2, 2) - .5) * 22 + (N(x / 40, y / 40, 3) - .5) * 14, i = (y * w + x) * 4;
        d[i] = A[0] + k * .8; d[i + 1] = A[1] + k * .7; d[i + 2] = A[2] + k; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    }, { wrap: true });
  }

  /* ---------- materials (cached per build: cheap, and a disposed board never leaves a dead material behind) ---------- */
  function mats() {
    const TT = T(), C = c => new TT.Color(c).convertSRGBToLinear(), lite = X.lite;
    const metal = (c, r, cc) => lite ? new TT.MeshStandardMaterial({ color: C(c), metalness: 1, roughness: r + .04 }) : new TT.MeshPhysicalMaterial({ color: C(c), metalness: 1, roughness: r, clearcoat: cc, clearcoatRoughness: .12, envMapIntensity: 1.25 });
    const mac = macassar('top', 1 / W, 1 / D), macS = macassar();
    return {
      brass: metal(0xd9b260, .26, .3),
      brassD: new TT.MeshStandardMaterial({ color: C(0x8a6a2c), metalness: 1, roughness: .38 }),
      gold: metal(0xf0c66c, .16, .6),
      plat: metal(0xe3e6ea, .12, .6),
      frame: X.M({ map: mac, bumpScale: .006, roughness: .32, clearcoat: .7, clearcoatRoughness: .18, color: 0xffffff }),
      body: X.M({ map: macS, bumpScale: .006, roughness: .36, clearcoat: .5, clearcoatRoughness: .22, color: 0xffffff }),
      marble: X.M({ map: marble(), bump: false, roughness: .14, clearcoat: 1, clearcoatRoughness: .05, color: 0xffffff }),
      felt: X.M({ map: felt(), bumpScale: .01, roughness: .95, color: 0xffffff }),
    };
  }

  /* ---------- geometry helpers ---------- */
  function rrect(path, x0, y0, x1, y1, r) {
    path.moveTo(x0 + r, y0); path.lineTo(x1 - r, y0); path.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x1, y1 - r); path.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false);
    path.lineTo(x0 + r, y1); path.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x0, y0 + r); path.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false);
    return path;
  }
  const mesh = (geo, mat, cast = true) => { const m = new (T().Mesh)(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  const GEO = {};
  function lathe(key, prof, seg) {
    const k = key + '@' + seg; if (GEO[k]) return GEO[k];
    const TT = T(), g = new TT.LatheGeometry(prof.map(([r, y]) => new TT.Vector2(r, y)), seg);
    X.share && X.share(g); return (GEO[k] = g);
  }
  // a piece: rounded rim, an engraved V-ring, a gently domed centre with a small boss (base at y = 0)
  const PIECE = [[0, 0], [.33, 0], [.37, .012], [.393, .04], [.4, .08], [.398, .125], [.386, .16], [.362, .182], [.33, .193], [.3, .192], [.282, .176], [.264, .19], [.22, .198], [.15, .203], [.085, .208], [.07, .222], [.045, .232], [0, .235]];
  function piece(color, m) {
    const p = mesh(lathe('nmPiece', PIECE, X.coarse ? 28 : 40), color === 'plat' ? m.plat : m.gold, !X.lite);
    p.rotation.y = Math.random() * 6.28; return p;
  }
  // a point: a small gold rosette, nearly flush with the marble (base at y = 0)
  const ROSE = [[.2, 0], [.195, .006], [.18, .014], [.15, .018], [.12, .013], [.095, .02], [.065, .03], [.035, .036], [0, .038]];   // (outside → in: the lathe faces up)

  /* ---------- the board ---------- */
  function board(m) {
    const TT = T(), g = new TT.Group();
    // brass plinth (the board stands on a thin gilt band, set back under the frame)
    const pl = mesh(X.RB(W - .3, Y0, D - .3, .03, 2), m.brassD); pl.position.y = Y0 / 2; g.add(pl);
    // body
    const body = mesh(X.RB(W - .06, YB - Y0 + .02, D - .06, .06, 2), m.body); body.position.y = (YB + Y0) / 2; g.add(body);
    // frame: one bevelled slab with three openings (the field and two channels)
    const bv = .03, sh = rrect(new TT.Shape(), -W / 2 + bv, -D / 2 + bv, W / 2 - bv, D / 2 - bv, .35);
    sh.holes.push(rrect(new TT.Path(), -F - bv, -F - bv, F + bv, F + bv, .02));
    [-1, 1].forEach(s => { const [a, b] = s > 0 ? CH : [-CH[1], -CH[0]]; sh.holes.push(rrect(new TT.Path(), a - bv, -F - bv, b + bv, F + bv, .45)); });
    const fg = new TT.ExtrudeGeometry(sh, { depth: YT - YB - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: X.coarse ? 5 : 8 });
    const fr = mesh(fg, [m.frame, m.body]); fr.rotation.x = -Math.PI / 2; fr.position.y = YB + bv; g.add(fr);
    // field: polished marble
    const mb = mesh(new TT.BoxGeometry(2 * F, YF - YB, 2 * F), m.marble, false); mb.position.y = (YF + YB) / 2; g.add(mb);
    // channels: felt floors
    [-1, 1].forEach(s => { const f = mesh(new TT.BoxGeometry(CH[1] - CH[0], .02, 2 * F), m.felt, false); f.position.set(s * (CH[0] + CH[1]) / 2, YB + .01, 0); g.add(f); });
    // the lines: raised brass strips (3 squares + 4 cross lines)
    const LW = .085, LH = .018, y = YF + LH / 2;
    const strip = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0) + LW, s = mesh(new TT.BoxGeometry(len, LH, LW), m.brass, false);
      s.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); if (Math.abs(z1 - z0) > Math.abs(x1 - x0)) s.rotation.y = Math.PI / 2; g.add(s);
    };
    [0, 1, 2].forEach(k => { const a = P(k), b = P(6 - k); strip(a, a, b, a); strip(a, b, b, b); strip(a, a, a, b); strip(b, a, b, b); });
    strip(P(3), P(0), P(3), P(2)); strip(P(3), P(4), P(3), P(6)); strip(P(0), P(3), P(2), P(3)); strip(P(4), P(3), P(6), P(3));
    // the 24 points: gold rosettes
    const rg = lathe('nmRose', ROSE, X.coarse ? 16 : 24);
    PTS.forEach(([i, j]) => { const r = mesh(rg, m.gold, false); r.position.set(P(i), YF + LH - .004, P(j)); g.add(r); });
    // small brass rosettes inlaid at the ends of the channels
    [-1, 1].forEach(sx => [-1, 1].forEach(sz => { const r = mesh(rg, m.brass, false); r.scale.setScalar(.8); r.position.set(sx * (CH[0] + CH[1]) / 2, YT - .002, sz * (F + .36)); g.add(r); }));
    Object.assign(g.userData, { top: YF + LH, pt: (i, j) => [P(i), P(j)] });
    return g;
  }
  const PTS = [[0, 0], [3, 0], [6, 0], [1, 1], [3, 1], [5, 1], [2, 2], [3, 2], [4, 2], [0, 3], [1, 3], [2, 3], [4, 3], [5, 3], [6, 3], [2, 4], [3, 4], [4, 4], [1, 5], [3, 5], [5, 5], [0, 6], [3, 6], [6, 6]];

  /* ---------- MODELS.morris: board + a mid-game position (gold has just closed a mill on the far row) ---------- */
  X.MODELS.morris = function (live) {
    const TT = T(), outer = new TT.Group(), g = new TT.Group(), m = mats();
    const b = board(m); g.add(b);
    const top = b.userData.top;
    Object.assign(outer.userData, { top: top * SCALE, pt: b.userData.pt, piece: c => piece(c, m) });
    outer.add(g); g.scale.setScalar(SCALE);
    if (live) return outer;
    const put = (c, x, z, y) => {
      const p = piece(c, m); p.position.set(x, y, z); g.add(p);
      const s = X.contact(.4, .5); s.position.set(x, y + .002, z); g.add(s);
    };
    [[0, 0], [3, 0], [6, 0], [4, 2], [5, 3], [3, 6]].forEach(([i, j]) => put('gold', P(i), P(j), top + .03));   // (resting on the rosettes)
    [[1, 1], [5, 1], [2, 3], [2, 4], [3, 5]].forEach(([i, j]) => put('plat', P(i), P(j), top + .03));
    // pieces in hand: platinum in the left channel, gold in the right (with the platinum piece it has just taken)
    const cx = (CH[0] + CH[1]) / 2, yC = YB + .02;
    [0, 1, 2].forEach(k => { put('plat', -cx, -3.3 + k * .86, yC); put('gold', cx, -3.3 + k * .86, yC); });
    put('plat', cx, 3.3, yC);
    return outer;
  };
})();
