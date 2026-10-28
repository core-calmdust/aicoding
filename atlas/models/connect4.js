/* =====================================================================
   Connect Four on the 3D table — a leather & walnut "tile tower":
     • a soft-cornered tray of deep teal pebble leather with cream saddle
       stitching round the rim and the walls; suede floor
     • a walnut spine across the tray; eight dark-bronze rails rise from brass
       ferrules, open at the top (small brass tips) so tiles drop in from above;
       seven brass column studs on the spine's front — the 7 × 6 grid reads at a glance
     • the counters are rounded-square tiles: a walnut frame with a leather
       inlay on both faces, saffron gold or pearl white (the game's gold /
       silver), stacking between the rails; spare tiles rest in the tray
   Everything is procedural (canvas textures, extrusions, rounded boxes).
   Registers into Table3D:
     Table3D.MODELS.connect4(live)   the stand (+ a mid-game position and spare tiles unless live)
        userData: { viewY, cell(c, r) → [x, y] (c 0…6 left → right, r 0…5 bottom → top), tile(color 'gold'|'pearl') → Mesh }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { makeNoise } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

  /* ---------- dimensions (board units; scaled to the chabudai at the end) ---------- */
  const PX = 1.0, PY = .89, TW = .86, TD = .26;      // column pitch, row pitch, tile size and thickness
  const TW_ = 9.6, TDp = 4.6, TR = 1.15, WALL = .22, TH = .78, FL = .14;   // tray: width, depth, corner radius, wall, height, floor
  const SP_H = .58, SP_D = .62;                       // spine top, depth
  const Y0 = SP_H + .012;                             // bottom of the first row
  const RAIL = .13, YTOP = Y0 + 6 * PY + .3;          // rail section, rail top
  const SCALE = .95;
  const colX = c => (c - 3) * PX, rowY = r => Y0 + r * PY + TW / 2;

  /* ---------- textures ---------- */
  const TX = {};
  function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function tex(key, c, o = {}) {
    if (TX[key]) return TX[key];
    const TT = T(), t = new TT.CanvasTexture(c); t.anisotropy = 8; t.encoding = TT.sRGBEncoding;
    if (o.wrap) t.wrapS = t.wrapT = TT.RepeatWrapping;
    if (o.rep) t.repeat.set(o.rep[0], o.rep[1]); if (o.off) t.offset.set(o.off[0], o.off[1]);
    return (TX[key] = t);
  }
  // pebble grain height tile (seamless cellular noise, 128 = flat)
  let pebC = null;
  function pebble() {
    if (pebC) return pebC;
    const N0 = 256, GN = 22, c = cv(N0, N0), g = c.getContext('2d'), img = g.createImageData(N0, N0), d = img.data, N = makeNoise(13);
    let s = 7; const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const P = new Float32Array(GN * GN * 2); for (let i = 0; i < GN * GN * 2; i++) P[i] = .15 + rnd() * .7;
    for (let y = 0; y < N0; y++) for (let x = 0; x < N0; x++) {
      const gx = x / N0 * GN, gy = y / N0 * GN, cx = Math.floor(gx), cy = Math.floor(gy);
      let f1 = 9, f2 = 9;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const X0 = cx + i, Y0_ = cy + j, ci = ((Y0_ % GN + GN) % GN) * GN + ((X0 % GN + GN) % GN);
        const dx = X0 + P[ci * 2] - gx, dy = Y0_ + P[ci * 2 + 1] - gy, dd = dx * dx + dy * dy;
        if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
      }
      const e = Math.sqrt(f2) - Math.sqrt(f1);
      let h = 122 + (1 - Math.min(1, Math.sqrt(f1) * 1.3)) * 40 + (N(x / 30, y / 30, 2) - .5) * 26;
      if (e < .12) h -= (1 - e / .12) * 70;
      const i = (y * N0 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.max(0, Math.min(255, h)); d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0); return (pebC = c);
  }
  // fill a canvas (or the current clip) with a leather colour and the pebble grain over it
  function leatherFill(g, w, h, col, amt, sc) {
    g.fillStyle = col; g.fillRect(0, 0, w, h);
    const p = g.createPattern(pebble(), 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(sc));
    g.save(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = amt; g.fillStyle = p; g.fillRect(0, 0, w, h); g.restore();
  }
  const stitch = (g, lw, dash, gap, col = 'rgba(238,226,200,.92)') => { g.setLineDash([dash, gap]); g.lineCap = 'round'; g.lineWidth = lw; g.strokeStyle = col; };
  function rrPath(g, x0, y0, x1, y1, r) { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x1, y0, x1, y1, r); g.arcTo(x1, y1, x0, y1, r); g.arcTo(x0, y1, x0, y0, r); g.arcTo(x0, y0, x1, y0, r); g.closePath(); }
  const LEATHER = '#1e4e4a', SUEDE = '#143936';
  // tray rim (the extrusion's caps carry world x / y as UVs → one canvas over the whole footprint)
  function trayTop() {
    const k = SZ(200), w = Math.round(TW_ * k), h = Math.round(TDp * k), c = cv(w, h), g = c.getContext('2d');
    leatherFill(g, w, h, LEATHER, .55, k / 256 * .9);
    const ins = (WALL / 2) * k; rrPath(g, ins, ins, w - ins, h - ins, (TR - WALL / 2) * k); stitch(g, .022 * k, .07 * k, .05 * k); g.stroke();
    return tex('c4TrayTop' + k, c, { rep: [1 / TW_, 1 / TDp], off: [.5, .5] });
  }
  // tray walls (side UVs: u = world x or y, v = 1 − extrusion depth) → a 1 × 1 unit tile with stitch rows near the top and the bottom
  function traySide() {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d');
    leatherFill(g, k, k, LEATHER, .55, k / 256 * .9);
    const row = z => { const t = (((1 - z) % 1) + 1) % 1, y = (1 - t) * k; g.beginPath(); g.moveTo(-k * .1, y); g.lineTo(k * 1.1, y); g.stroke(); };
    stitch(g, .022 * k, .07 * k, .05 * k); row(TH - .1); row(.09);
    return tex('c4TraySide' + k, c, { wrap: true });
  }
  function suede() {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d'), img = g.createImageData(k, k), d = img.data, N = makeNoise(3), A = hexRGB(SUEDE);
    for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) { const n = (Math.random() - .5) * 16 + (N(x / 2, y / 2, 2) - .5) * 14 + (N(x / 30, y / 30, 2) - .5) * 12, i = (y * k + x) * 4; d[i] = A[0] + n; d[i + 1] = A[1] + n; d[i + 2] = A[2] + n; d[i + 3] = 255; }
    g.putImageData(img, 0, 0); return tex('c4Suede' + k, c, { wrap: true, rep: [.5, .5] });
  }
  // walnut: warm brown with darker streaks, fibres along x, seamless
  function walnut(key, rep) {
    const k = SZ(512), name = 'c4Wal' + key + k; if (TX[name]) return TX[name];
    const base = 'c4WalC' + k;
    if (!TX[base + 'c']) {
      const c = cv(k, k), g = c.getContext('2d'), img = g.createImageData(k, k), d = img.data, N = makeNoise(17), A = hexRGB('#8a5a34'), B = hexRGB('#3a2112');
      const val = (u, v) => {
        const warp = N(u * 1.5 + 3, v * 3 + 3, 3) * 2.4, ring = Math.sin((v * 5 + warp) * Math.PI * 2) * .5 + .5, fib = N(u * 5 + 3, v * 140 + 3, 2);
        return .2 + Math.pow(ring, 3) * .45 + (fib - .5) * .45 + (N(u * 80, v * 420, 1) > .84 ? .14 : 0);
      };
      for (let y = 0; y < k; y++) for (let x = 0; x < k; x++) {
        const u = x / k, v = y / k, t = Math.max(0, Math.min(1, val(u, v) * (1 - u) + val(u - 1, v) * u)), i = (y * k + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0); TX[base + 'c'] = c;
    }
    return tex(name, TX[base + 'c'], { wrap: true, rep });
  }
  function inlayTex(col) {
    const k = SZ(256), c = cv(k, k), g = c.getContext('2d');
    leatherFill(g, k, k, col, col === 'gold' ? .5 : .42, k / 256 * 1.6);
    return tex('c4Inlay' + col + k, c, { wrap: true, rep: [1.4, 1.4] });
  }

  /* ---------- materials ---------- */
  function mats() {
    const TT = T(), C = c => new TT.Color(c).convertSRGBToLinear(), lite = X.lite;
    const metal = (c, r, cc) => lite ? new TT.MeshStandardMaterial({ color: C(c), metalness: 1, roughness: r + .04 }) : new TT.MeshPhysicalMaterial({ color: C(c), metalness: 1, roughness: r, clearcoat: cc, clearcoatRoughness: .15, envMapIntensity: 1.2 });
    const inl = (col, hex) => { const m = X.M({ map: inlayTex(hex), bumpScale: .004, roughness: .62, sheen: lite ? undefined : C(0x404040), color: 0xffffff }); return m; };
    return {
      top: X.M({ map: trayTop(), bumpScale: .004, roughness: .58, clearcoat: .15, clearcoatRoughness: .5, color: 0xffffff }),
      side: X.M({ map: traySide(), bumpScale: .004, roughness: .58, clearcoat: .15, clearcoatRoughness: .5, color: 0xffffff }),
      suede: X.M({ map: suede(), bumpScale: .006, roughness: .95, color: 0xffffff }),
      walnut: X.M({ map: walnut('w', [.25, .25]), bumpScale: .004, roughness: .34, clearcoat: .6, clearcoatRoughness: .2, color: 0xffffff }),
      walnutT: X.M({ map: walnut('t', [2.2, 2.2]), bumpScale: .003, roughness: .3, clearcoat: .7, clearcoatRoughness: .16, color: 0xffffff }),
      bronze: metal(0xb89460, .36, .3),
      brass: metal(0xd8b064, .22, .4),
      gold: inl('gold', '#d39a34'),
      pearl: inl('pearl', '#e8e3d8'),
    };
  }

  /* ---------- geometry ---------- */
  // rounded rectangle as a polyline without a repeated closing point
  // (a duplicate start/end vertex made the bevelled extrusion tear at the corner)
  function rrShape(path, hw, hh, r, seg = 5) {
    const q = new (T().Path)();
    q.moveTo(-hw + r, -hh); q.lineTo(hw - r, -hh); q.absarc(hw - r, -hh + r, r, -Math.PI / 2, 0, false);
    q.lineTo(hw, hh - r); q.absarc(hw - r, hh - r, r, 0, Math.PI / 2, false);
    q.lineTo(-hw + r, hh); q.absarc(-hw + r, hh - r, r, Math.PI / 2, Math.PI, false);
    q.lineTo(-hw, -hh + r); q.absarc(-hw + r, -hh + r, r, Math.PI, Math.PI * 1.5, false);
    const pts = q.getPoints(seg).filter((v, i, a) => i === 0 || v.distanceTo(a[i - 1]) > 1e-6);
    while (pts.length > 2 && pts[pts.length - 1].distanceTo(pts[0]) < 1e-6) pts.pop();
    path.setFromPoints(pts);
    return path;
  }
  const mesh = (geo, mat, cast = true) => { const m = new (T().Mesh)(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; };
  const GEO = {};
  function tileGeo() {
    const k = 'c4tile' + (X.coarse ? 'c' : ''); if (GEO[k]) return GEO[k];
    const TT = T(), bv = .035, hw = TW / 2 - bv, cs = X.coarse ? 3 : 5;
    const sh = rrShape(new TT.Shape(), hw, hw, .2, cs); sh.holes.push(rrShape(new TT.Path(), .335 + bv, .335 + bv, .14 + bv, cs));
    const dep = TD - 2 * bv, frame = new TT.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: cs });
    frame.translate(0, 0, -dep / 2);
    const inlay = new TT.ShapeGeometry(rrShape(new TT.Shape(), .34, .34, .145, cs), cs);
    X.share && (X.share(frame), X.share(inlay));
    return (GEO[k] = { frame, inlay, face: TD / 2 - .045 });
  }
  // a tile standing up, facing +z (centre at the origin)
  function tile(color, m) {
    const TT = T(), g = new TT.Group(), G = tileGeo();
    g.add(mesh(G.frame, m.walnutT));
    const inl = color === 'pearl' ? m.pearl : m.gold;
    const a = mesh(G.inlay, inl, false); a.position.z = G.face; g.add(a);
    const b = mesh(G.inlay, inl, false); b.position.z = -G.face; b.rotation.y = Math.PI; g.add(b);
    g.userData.color = color; return g;
  }

  function stand(m) {
    const TT = T(), g = new TT.Group();
    // tray: a stitched leather ring (rim + walls) and a suede floor
    const bv = .05, sh = rrShape(new TT.Shape(), TW_ / 2 - bv, TDp / 2 - bv, TR - bv, X.coarse ? 8 : 12);
    sh.holes.push(rrShape(new TT.Path(), TW_ / 2 - WALL + bv, TDp / 2 - WALL + bv, TR - WALL + bv, X.coarse ? 8 : 12));
    const ring = new TT.ExtrudeGeometry(sh, { depth: TH - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: X.coarse ? 2 : 3, curveSegments: X.coarse ? 8 : 12 });
    const tr = mesh(ring, [m.top, m.side]); tr.rotation.x = -Math.PI / 2; tr.position.y = bv; g.add(tr);
    const fl = mesh(new TT.ShapeGeometry(rrShape(new TT.Shape(), TW_ / 2 - WALL + .01, TDp / 2 - WALL + .01, TR - WALL, X.coarse ? 8 : 12), X.coarse ? 8 : 12), m.suede, false);
    fl.rotation.x = -Math.PI / 2; fl.position.y = FL; g.add(fl);
    const base = mesh(new TT.ShapeGeometry(rrShape(new TT.Shape(), TW_ / 2 - .02, TDp / 2 - .02, TR - .02, 6), 6), m.side, false); base.rotation.x = Math.PI / 2; base.position.y = .002; g.add(base);
    // walnut spine across the tray
    const spL = TW_ - 2 * WALL - .02, sp = mesh(X.RB(spL, SP_H - FL + .02, SP_D, .07, 3), m.walnut); sp.position.y = (SP_H + FL) / 2 - .01; g.add(sp);
    // eight bronze rails in brass ferrules
    const railG = X.RB(RAIL, YTOP - SP_H + .1, RAIL, .025, 1), ferG = X.RB(.19, .07, .19, .025, 2);
    for (let k = 0; k < 8; k++) {
      const x = (k - 3.5) * PX;
      const r = mesh(railG, m.bronze); r.position.set(x, (YTOP + SP_H - .1) / 2, 0); g.add(r);
      const f = mesh(ferG, m.brass, false); f.position.set(x, SP_H + .03, 0); g.add(f);
    }
    // the rails stay open at the top (tiles drop in from above): small brass tips; column studs on the spine's front
    const tipG = X.RB(RAIL + .035, .07, RAIL + .035, .03, 2);
    for (let k = 0; k < 8; k++) { const t = mesh(tipG, m.brass, false); t.position.set((k - 3.5) * PX, YTOP + .035, 0); g.add(t); }
    const stud = new TT.CylinderGeometry(.06, .07, .03, X.coarse ? 12 : 18);
    for (let c = 0; c < 7; c++) { const s = mesh(stud, m.brass, false); s.rotation.x = Math.PI / 2; s.position.set(colX(c), (SP_H + FL) / 2 + .03, SP_D / 2 + .012); g.add(s); }
    return g;
  }

  /* ---------- MODELS.connect4 ---------- */
  // a mid-game position: [column, colours bottom → top] (gold moved first)
  const SHOW = [[1, 'p'], [2, 'pgp'], [3, 'gpgg'], [4, 'gpg'], [5, 'pg'], [6, 'p']];
  X.MODELS.connect4 = function (live) {
    const TT = T(), outer = new TT.Group(), g = new TT.Group(), m = mats();
    g.add(stand(m)); outer.add(g); g.scale.setScalar(SCALE);
    Object.assign(outer.userData, { viewY: 2.3, cell: (c, r) => [colX(c) * SCALE, rowY(r) * SCALE], tile: c => tile(c, m) });
    if (live) return outer;
    SHOW.forEach(([c, s]) => [...s].forEach((ch, r) => { const t = tile(ch === 'g' ? 'gold' : 'pearl', m); t.position.set(colX(c), rowY(r), 0); g.add(t); }));
    // spare tiles resting in the tray: small stacks in the front well, a few in the back
    const flat = (col, x, z, n, ry) => {
      for (let k = 0; k < n; k++) {
        const t = tile(col, m); t.rotation.set(-Math.PI / 2, 0, ry + (k % 2 ? .05 : -.04)); t.position.set(x + (k % 2 ? .03 : 0), FL + TD / 2 + k * (TD + .004), z); g.add(t);
      }
      const s = X.contact(.5, .45); s.position.set(x, FL + .003, z); g.add(s);
    };
    const zf = (SP_D / 2 + TDp / 2 - WALL) / 2 + .02, zb = -zf;
    flat('gold', -3.3, zf, 3, .08); flat('gold', -2.2, zf + .05, 2, -.12); flat('gold', -1.15, zf - .02, 1, .2);
    flat('pearl', 1.2, zf, 1, -.15); flat('pearl', 2.25, zf + .04, 2, .1); flat('pearl', 3.3, zf, 3, -.06);
    flat('gold', -2.7, zb, 2, -.1); flat('pearl', 2.7, zb, 2, .12);
    return outer;
  };
})();
