/* =====================================================================
   Mancala on the 3D table — "Luxe Mancala" (the 2D game's black board) as a
   piano-black lacquer board: one solid body with rounded edges, 6 + 6 round
   pits and two long stores carved into it (smooth bowls, darker towards the
   bottom), a polished gold ring round every hollow, a gold inlay line round
   the top and a gold band round the sides; the body stands on a recessed
   plinth. Stones: flattened glass marbles in the 2D game's eight colours,
   heaped in the pits (each settles on the bowl / the stones below it).
   Registers into Table3D:
     Table3D.MODELS.mancala(live)   the board (+ a mid-game position unless live)
     Table3D.mancala = { board(), stone(colour), PIT, STORE }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, RB, makeNoise } = X;

  // board units: the long side along x, the two rows of pits at z = ±PZ, the stores at x = ±SX (long along z)
  const W = 11, D = 4.3, H = .72, PL = .1;   // body size, plinth height
  const PX = 1.3, PZ = .95, PR = .55, PDEP = .32;           // pits: spacing, row offset, radius, depth
  const SX = 4.62, SL = .78, SR = .52, SDEP = .36;         // stores: x, half straight length, radius, depth
  const BT = .05, BS = .05;                                 // bevel of the carved edges
  const TOP = PL + H + BT;                                  // the top surface (y)
  const RIM = PL + H;                                       // where a bowl meets its hole (below the rounded edge)
  const GEMS = [['#ffb3bd', '#d6324b'], ['#bfe0ff', '#2f7fd6'], ['#c9ffd9', '#26a65b'], ['#ffe9b0', '#e0a526'],
    ['#e8ccff', '#9152d6'], ['#c4fbff', '#21b4c4'], ['#ffffff', '#d9dde6'], ['#ffd1b0', '#e2702e']];
  const seg = () => (X.lite ? 20 : X.coarse ? 24 : 32);

  // outline of a pit (L = 0) or a store (stadium, straight part 2L along z) at radius r, n points, centred on (cx, cz)
  function outline(cx, cz, L, r, n) {
    const pts = [];
    if (!L) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return pts; }
    // a stadium: two half circles joined by straight sides, the same n points every ring (so rings stitch together)
    const per = 2 * Math.PI * r + 4 * L;
    for (let i = 0; i < n; i++) {
      let s = i / n * per;
      const arc = Math.PI * r;
      if (s < arc) { const a = Math.PI + s / r; pts.push([cx + Math.cos(a) * r, cz - L + Math.sin(a) * r]); continue; } s -= arc;   // far end (−z)
      if (s < 2 * L) { pts.push([cx + r, cz - L + s]); continue; } s -= 2 * L;
      if (s < arc) { const a = s / r; pts.push([cx + Math.cos(a) * r, cz + L + Math.sin(a) * r]); continue; } s -= arc;          // near end (+z)
      pts.push([cx - r, cz + L - s]);
    }
    return pts;
  }
  // the carved bowl: rings of the outline shrinking towards the bottom on a quarter ellipse (depth dep).
  // uv.y = 0 at the rim … 1 at the bottom (a gradient map darkens the hollow), uv.x round the bowl
  function bowl(cx, cz, L, r, dep, n, rings) {
    const TT = T(), P = [], U = [], I = [];
    for (let k = 0; k <= rings; k++) {
      const th = k / rings * Math.PI / 2, rr = Math.max(.001, r * Math.cos(th)), y = RIM - dep * Math.sin(th);
      const o = outline(cx, cz, L, rr, n);
      for (let i = 0; i <= n; i++) { const p = o[i % n]; P.push(p[0], y, p[1]); U.push(i / n, k / rings); }
    }
    for (let k = 0; k < rings; k++) for (let i = 0; i < n; i++) {
      const a = k * (n + 1) + i, b = a + 1, c = a + n + 1, d = c + 1;
      I.push(a, c, b, b, c, d);
    }
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(U, 2)); g.setIndex(I);
    g.computeVertexNormals();
    // the bowl is seen from inside: make the normals point up / inwards (the winding above already faces the viewer above)
    const N = g.attributes.normal; let up = 0; for (let i = 0; i < N.count; i++) up += N.getY(i);
    if (up < 0) { for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.setIndex(I); g.computeVertexNormals(); }
    return g;
  }
  // the surface height inside a hollow at horizontal distance q from its centre line (for heaping the stones)
  const floorY = (q, r, dep) => RIM - dep * Math.sqrt(Math.max(0, 1 - Math.min(1, q / r) ** 2));

  /* ---------- textures ---------- */
  // top of the body (planar, the whole board): piano black with a faint depth, the gold inlay line round the edge and
  // a hairline with a small lozenge between the rows. Colour map + an ORM map (G roughness, B metalness: gold = metal)
  function topTex() {
    const s = X.texScale(), w = Math.round(2048 * s), h = Math.round(w * D / W), k = w / W;
    const U = v => v * k, ux = x => (x + W / 2) * k, uz = z => (z + D / 2) * k;
    const lines = (c, gold) => {
      c.strokeStyle = gold; c.lineWidth = U(.035); c.strokeRect(U(.2), U(.2), w - U(.4), h - U(.4));
      c.lineWidth = U(.012); c.strokeRect(U(.27), U(.27), w - U(.54), h - U(.54));
      c.lineWidth = U(.014); c.beginPath(); c.moveTo(ux(-3.6), uz(0)); c.lineTo(ux(-.2), uz(0)); c.moveTo(ux(.2), uz(0)); c.lineTo(ux(3.6), uz(0)); c.stroke();
      c.beginPath(); c.moveTo(ux(-.17), uz(0)); c.lineTo(ux(0), uz(-.1)); c.lineTo(ux(.17), uz(0)); c.lineTo(ux(0), uz(.1)); c.closePath(); c.fillStyle = gold; c.fill();
      for (const sx of [-1, 1]) { c.beginPath(); c.arc(ux(sx * 3.75), uz(0), U(.035), 0, 7); c.fill(); }
      // corner fleurons: a small gold quarter-arc in each corner of the inlay
      c.lineWidth = U(.014);
      for (const [cx, cy, a] of [[U(.2), U(.2), 0], [w - U(.2), U(.2), Math.PI / 2], [w - U(.2), h - U(.2), Math.PI], [U(.2), h - U(.2), -Math.PI / 2]]) { c.beginPath(); c.arc(cx, cy, U(.3), a, a + Math.PI / 2); c.stroke(); }
    };
    const col = X.canvasTex('mcTop' + s, w, h, (c) => {
      const N = makeNoise(5), img = c.createImageData(w, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = 12 + (N(x / (90 * s), y / (90 * s), 3) - .5) * 5 + (Math.random() - .5) * 2, i = (y * w + x) * 4;
        d[i] = v; d[i + 1] = v; d[i + 2] = v + 1.5; d[i + 3] = 255;
      }
      c.putImageData(img, 0, 0);
      lines(c, '#d8b468');
    });
    const orm = X.canvasTex('mcOrm' + s, w, h, (c) => {
      c.fillStyle = 'rgb(255,30,0)'; c.fillRect(0, 0, w, h);   // lacquer: smooth, not metal
      lines(c, 'rgb(255,80,255)');                               // gold: a little rougher, metal
    });
    orm.encoding = T().LinearEncoding;
    return { col, orm };
  }
  // the inside of a hollow: black lacquer at the rim, deeper black at the bottom with a warm hint (the 2D board's cups)
  function cupTex() {
    return X.canvasTex('mcCup', 8, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3a3a3f'); g.addColorStop(.3, '#1f1f23'); g.addColorStop(.75, '#0e0e10'); g.addColorStop(1, '#08080a');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
  }

  /* ---------- materials ---------- */
  let MAT = null;
  function mats() {
    if (MAT) return MAT;
    const TT = T(), t = topTex();
    const top = M({ map: t.col, bump: false, roughnessMap: t.orm, metalnessMap: t.orm, roughness: 1, metalness: 1, clearcoat: 1, clearcoatRoughness: .06 });
    const cup = M({ map: cupTex(), bump: false, roughness: .22, clearcoat: .8, clearcoatRoughness: .12 });
    const gold = M({ color: 0xe2bf72, metalness: 1, roughness: .2, clearcoat: .5, clearcoatRoughness: .1 });
    const plinth = M({ color: 0x0a0a0b, roughness: .5 });
    const gems = GEMS.map(([hi, body]) => {
      const m = M({ color: new TT.Color(body).getHex(), roughness: .06, metalness: 0, clearcoat: 1, clearcoatRoughness: .03, emissive: new TT.Color(body).multiplyScalar(.1).getHex() });
      if (m.sheen !== undefined && !X.lite) m.sheen = new TT.Color(hi).convertSRGBToLinear();
      m.emissive.convertSRGBToLinear(); return m;
    });
    return (MAT = { top, cup, gold, plinth, gems });
  }

  /* ---------- the board ---------- */
  const PITS = []; for (let i = 0; i < 6; i++) { PITS.push([-2.5 * PX + i * PX, PZ]); PITS.push([-2.5 * PX + i * PX, -PZ]); }
  const STORES = [[SX, 0], [-SX, 0]];
  function board() {
    const TT = T(), g = new TT.Group(), m = mats(), n = seg();
    // body: a rounded rectangle with the 14 hollows cut through, extruded with a rounded edge (outside and round each hole)
    const rr = .5, hw = W / 2 - .002, hd = D / 2 - .002, sh = new TT.Shape();
    sh.moveTo(-hw + rr, -hd); sh.lineTo(hw - rr, -hd); sh.quadraticCurveTo(hw, -hd, hw, -hd + rr); sh.lineTo(hw, hd - rr); sh.quadraticCurveTo(hw, hd, hw - rr, hd);
    sh.lineTo(-hw + rr, hd); sh.quadraticCurveTo(-hw, hd, -hw, hd - rr); sh.lineTo(-hw, -hd + rr); sh.quadraticCurveTo(-hw, -hd, -hw + rr, -hd);
    const hole = (cx, cz, L, r) => { const p = new TT.Path(), o = outline(cx, cz, L, r, n); o.forEach(([x, z], i) => i ? p.lineTo(x, -z) : p.moveTo(x, -z)); p.closePath(); sh.holes.push(p); };
    PITS.forEach(([x, z]) => hole(x, z, 0, PR)); STORES.forEach(([x, z]) => hole(x, z, SL, SR));
    const geo = new TT.ExtrudeGeometry(sh, { depth: H - BT, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelOffset: -BS, bevelSegments: X.coarse ? 2 : 3, curveSegments: 6 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, PL + BT, 0);
    { const P = geo.attributes.position, UV = geo.attributes.uv; for (let i = 0; i < P.count; i++) UV.setXY(i, (P.getX(i) + W / 2) / W, 1 - (P.getZ(i) + D / 2) / D); }
    geo.clearGroups(); geo.computeVertexNormals();
    const body = new TT.Mesh(geo, m.top); body.castShadow = body.receiveShadow = true; g.add(body);
    // the hollows: smooth bowls hanging from the holes (their rims sit where the rounded edge begins)
    const rings = X.coarse ? 6 : 8;
    PITS.forEach(([x, z]) => { const b = new TT.Mesh(bowl(x, z, 0, PR, PDEP, n, rings), m.cup); b.receiveShadow = true; g.add(b); });
    STORES.forEach(([x, z]) => { const b = new TT.Mesh(bowl(x, z, SL, SR, SDEP, n + 8, rings), m.cup); b.receiveShadow = true; g.add(b); });
    // gold rings round the hollows, lying on the rounded edge
    const tube = .022, ry = TOP - BT * .35, rad = BS * .55;
    const ringG = new TT.TorusGeometry(PR + rad, tube, X.coarse ? 4 : 6, n); ringG.rotateX(Math.PI / 2);
    PITS.forEach(([x, z]) => { const r = new TT.Mesh(ringG, m.gold); r.position.set(x, ry, z); r.castShadow = false; r.receiveShadow = true; g.add(r); });
    STORES.forEach(([x, z]) => {
      const o = outline(x, z, SL, SR + rad, n + 8).map(([a, b]) => new TT.Vector3(a, ry, b));
      const r = new TT.Mesh(new TT.TubeGeometry(new TT.CatmullRomCurve3(o, true), n + 8, tube, X.coarse ? 4 : 6, true), m.gold); r.receiveShadow = true; g.add(r);
    });
    // gold band round the sides, just under the rounded top edge (a thin ring of the outline)
    const band = (off, wd, y0, ht) => {
      const so = new TT.Shape(), a = hw + off, b = hd + off, r2 = rr + off;
      so.moveTo(-a + r2, -b); so.lineTo(a - r2, -b); so.quadraticCurveTo(a, -b, a, -b + r2); so.lineTo(a, b - r2); so.quadraticCurveTo(a, b, a - r2, b); so.lineTo(-a + r2, b); so.quadraticCurveTo(-a, b, -a, b - r2); so.lineTo(-a, -b + r2); so.quadraticCurveTo(-a, -b, -a + r2, -b);
      const ai = a - wd, bi = b - wd, ri = r2 - wd, ho = new TT.Path();
      ho.moveTo(-ai + ri, -bi); ho.lineTo(ai - ri, -bi); ho.quadraticCurveTo(ai, -bi, ai, -bi + ri); ho.lineTo(ai, bi - ri); ho.quadraticCurveTo(ai, bi, ai - ri, bi); ho.lineTo(-ai + ri, bi); ho.quadraticCurveTo(-ai, bi, -ai, bi - ri); ho.lineTo(-ai, -bi + ri); ho.quadraticCurveTo(-ai, -bi, -ai + ri, -bi);
      so.holes.push(ho);
      const bg = new TT.ExtrudeGeometry(so, { depth: ht, bevelEnabled: false, curveSegments: 6 }); bg.rotateX(-Math.PI / 2); bg.translate(0, y0, 0);
      const bm = new TT.Mesh(bg, m.gold); bm.receiveShadow = true; return bm;
    };
    g.add(band(.008, .03, PL + H * .62, .045));
    // recessed plinth with a fine gold line at its foot
    const pl = new TT.Mesh(RB(W - .5, PL + .02, D - .5, .04, 1), m.plinth); pl.position.y = (PL + .02) / 2; pl.receiveShadow = true; pl.castShadow = true; g.add(pl);
    Object.assign(g.userData, { top: TOP, viewY: .55 });
    return g;
  }

  /* ---------- the stones ---------- */
  const SRAD = .19, SFLAT = .62;
  let stoneG = null;
  function stoneGeo() {
    if (!stoneG) { stoneG = new (T().SphereGeometry)(SRAD, X.coarse ? 10 : 16, X.coarse ? 6 : 10); stoneG.scale(1, SFLAT, 1); X.share(stoneG); }
    return stoneG;
  }
  function stone(ci) { const s = new (T().Mesh)(stoneGeo(), mats().gems[ci % GEMS.length]); s.castShadow = true; s.receiveShadow = true; return s; }
  // heap cnt stones in a hollow: each one goes to the lowest free spot among a few candidates (on the bowl or on stones)
  function heap(g, cx, cz, L, r, dep, cnt, seed) {
    let q = seed * 9301 + 7; const rnd = () => ((q = (q * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const placed = [], hs = SRAD * SFLAT, d2 = (SRAD * 1.92) ** 2;
    for (let k = 0; k < cnt; k++) {
      let best = null;
      for (let t = 0; t < 14; t++) {
        const a = rnd() * Math.PI * 2, rho = Math.sqrt(rnd()) * (r - SRAD * 1.15), lz = L ? (rnd() * 2 - 1) * L : 0;
        const x = cx + Math.cos(a) * rho, z = cz + lz + Math.sin(a) * rho;
        let y = floorY(rho, r, dep) + hs * .92;
        for (const p of placed) { const dd = (p.x - x) ** 2 + (p.z - z) ** 2; if (dd < d2) y = Math.max(y, p.y + Math.sqrt(d2 - dd) * .62); }
        if (!best || y < best.y) best = { x, y, z };
      }
      placed.push(best);
      const s = stone((k * 3 + seed * 5 + (rnd() * 8 | 0)) % GEMS.length);
      s.position.set(best.x, best.y, best.z); s.rotation.set((rnd() - .5) * .5, rnd() * 6.3, (rnd() - .5) * .5); g.add(s);
    }
  }

  X.mancala = { board, stone, PITS, STORES };
  X.MODELS.mancala = function (live) {
    const g = board();
    if (live) return g;
    // a mid-game position (Kalah, 4 seeds): pits of the near row left → right, then the far row, and the two stores
    const near = [4, 0, 5, 5, 4, 1], far = [4, 5, 2, 0, 6, 4];
    for (let i = 0; i < 6; i++) {
      const [xn, zn] = PITS[i * 2], [xf, zf] = PITS[i * 2 + 1];
      heap(g, xn, zn, 0, PR, PDEP, near[i], i + 1); heap(g, xf, zf, 0, PR, PDEP, far[i], i + 11);
    }
    heap(g, STORES[0][0], 0, SL, SR, SDEP, 5, 31); heap(g, STORES[1][0], 0, SL, SR, SDEP, 3, 37);
    g.scale.setScalar(.98);
    return g;
  };
})();
