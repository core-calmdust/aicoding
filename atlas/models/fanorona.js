/* =====================================================================
   Fanorona on the 3D table — a traditional solid-wood board:
   one slab of edge-glued acacia strips (golden to chocolate grain, oiled, matte),
   the lines and the points carved into it and scorched dark (a burnt V-groove
   for every line, a shallow burnt cup at every point), and a long rounded groove
   along each long side where the captured balls (Telo: the balls still to place) rest.
   The pieces are matte turned balls: pale rubberwood (White) and dark ebony (Black).
   Registers into Table3D:
     Table3D.MODELS.fanorona(live, rule)  board (+ a mid-game position unless live); rule 'sivy' 9×5 | 'dimy' 5×5 | 'telo' 3×3
     Table3D.fanorona = { board(rule), piece(col, scale), dims(rule), R }
     userData: { NC, NR, W, H, top, pt(c, r) → [x, z] (display column left → right, row far → near),
                 piece(col 1 White | 2 Black, scale) → Group, groove: { z: [far, near], L, y(r) → ball-centre y, at(side, i, n) → [x, z] } }
   Units: one step between points is 1.0; the slab is (NC + 2) × (NR + 3) — the DOM frame of the full game.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { canvasTex } = X;
  const SZ = v => Math.round(v * (X.texScale ? X.texScale() : 1));   // phones: half-size procedural textures
  const LO = () => !!(X.coarse || X.lite);
  const RULES = { sivy: [9, 5], dimy: [5, 5], telo: [3, 3], alq: [5, 5], alqf: [5, 5] };
  const dims = rule => { const [NC, NR] = RULES[rule] || RULES.sivy; return { NC, NR, W: NC + 2, H: NR + 3 }; };
  const TH = .62, RE = .09;                  // slab thickness, the round of its outer edge
  const GW = .28, GD = .24, GM = .62;        // groove: half width, depth, its axis from the long edge
  const R = .33;                             // ball radius (the 2D page's pieces are .7 of a step)
  const CUP = .17;                           // the carved cup at every point (radius)
  const lin = c => new (T().Color)(c).convertSRGBToLinear();
  const mats = {}, mat = (k, f) => mats[k] || (mats[k] = f());

  /* ---------- textures: the pixel loops (self-contained; on the portal they run in a worker, atlas/texgen.js) ---------- */
  function KL(X) {
    const makeNoise = X.makeNoise;
    const cl = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const ss = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    // acacia: edge-glued strips along the length, each its own tone; wavy dark streaks, golden flecks, fine fibres, pores
    function acacia(N, x, z, strips) {
      let k = 0; while (k < strips.length - 1 && z > strips[k + 1][0]) k++;
      const [z0, tone, seed] = strips[k], zz = z - z0;
      const wv = (N(x * .18 + seed, zz * .9 + seed, 3) - .5) * 1.6 + (N(x * .9 + seed * 2, zz * 2.2, 2) - .5) * .35;
      const g = zz * 7.5 + wv * 2.2;                                    // the grain coordinate (fibres run along x)
      const band = Math.sin(g * 2.1) * .5 + .5, band2 = Math.sin(g * 5.3 + N(x * .5, zz * 3, 2) * 4) * .5 + .5;
      const streak = Math.pow(cl(N(x * .07 + seed * 3, zz * 2.6 + seed, 3) * 1.35 - .25), 2.2);   // long dark heartwood streaks
      const fib = N(x * 3.2, zz * 120 + wv * 30, 2), fine = N(x * 26, zz * 340, 1);
      let t = .32 + tone + streak * .5 + Math.pow(band, 3) * .2 + Math.pow(band2, 4) * .12 + (fib - .5) * .22 + (fine - .5) * .08;
      if (N(x * 60, zz * 900, 1) > .8) t += .12;                       // pores
      const gold = Math.pow(cl(1 - Math.abs(N(x * .3 + 7, zz * 4 + seed, 2) - .55) * 5), 2) * .25;   // chatoyant golden bands
      t = cl(t - gold * .6);
      // palette: honey gold → amber → chocolate
      const A = [214, 150, 86], B = [160, 92, 44], C = [74, 36, 16];
      const col = t < .5 ? A.map((a, i) => a + (B[i] - a) * t * 2) : B.map((b, i) => b + (C[i] - b) * (t - .5) * 2);
      return [col[0] + gold * 30, col[1] + gold * 22, col[2] + gold * 8];
    }
    function stripsOf(H, seed) {   // [z0, tone, seed] from the far edge
      const N = makeNoise(seed), out = []; let z = -H / 2 - .01, k = 0;
      while (z < H / 2) { const w = 1.05 + N(k * 3.7, 1.3, 1) * 1.1; out.push([z, (N(k * 5.1, 9.2, 1) - .5) * .34, k * 13.7 + seed]); z += w; k++; }
      return out;
    }
    return {
      // the top: colour (d) + tangent-space normal map (d2) of the carved, scorched lines and cups
      top(d, Wp, Hp, p, d2) {
        const { NC, NR, W, H } = p, N = makeNoise(41), strips = stripsOf(H, 5), hpx = new Float32Array(Wp * Hp);
        const ox = (NC - 1) / 2, oz = (NR - 1) / 2, HW = .04, HALO = .07, DL = .035;
        const gz = H / 2 - .62, gw = .28, ga = (W - 1.1) / 2 - gw;
        for (let y = 0; y < Hp; y++) for (let xp = 0; xp < Wp; xp++) {
          const x = (xp + .5) / Wp * W - W / 2, z = (y + .5) / Hp * H - H / 2;
          const c = x + ox, r = z + oz;   // in point units (0 … NC-1, 0 … NR-1)
          // distance to the nearest line: rows, columns (capped at the outer points), the diagonals c ± r = even
          const cc = Math.max(0, Math.min(NC - 1, c)), rc = Math.max(0, Math.min(NR - 1, r));
          let dl = Math.min(Math.hypot(c - cc, r - Math.round(rc)), Math.hypot(c - Math.round(cc), r - rc));
          if (c >= 0 && c <= NC - 1 && r >= 0 && r <= NR - 1) {
            const a = c - r, b = c + r, da = Math.abs(a - 2 * Math.round(a / 2)), db = Math.abs(b - 2 * Math.round(b / 2));
            dl = Math.min(dl, Math.min(da, db) / Math.SQRT2);
          }
          // the cup at the nearest point
          const pc = Math.round(cc), pr = Math.round(rc), dp = Math.hypot(c - pc, r - pr);
          let h = 0, burn = 0;
          if (dl < HW) { const q = dl / HW; h -= DL * (1 - q * q * (3 - 2 * q) * .9); }
          burn = Math.max(burn, 1 - ss(HW * .55, HW + HALO, dl));
          if (dp < CUPR) { const q = dp / CUPR; h = Math.min(h, -.03 * (1 - q * q)); }
          burn = Math.max(burn, (1 - ss(CUPR * .7, CUPR + .1, dp)) * .9);
          hpx[y * Wp + xp] = h;
          // colour: the wood, darkened and warmed where scorched (the groove floor nearly black-brown, a soft halo round it)
          let col = acacia(N, x, z, strips);
          const char = .55 + (N(x * 40, z * 40, 2) - .5) * .5;   // uneven char
          const core = 1 - ss(HW * .25, HW * .95, dl), cup = (1 - ss(CUPR * .5, CUPR * .95, dp));
          const deep = Math.max(core, cup * .85);
          const halo = burn * (1 - deep);
          const BR = [58 * char + 14, 26 * char + 7, 10 * char + 3];
          col = col.map((v, i) => v * (1 - halo * .4) + BR[i] * 1.5 * halo * .4);
          col = col.map((v, i) => v * (1 - deep * .85) + BR[i] * deep * .85);
          // the long grooves: a touch darker (end grain of the cut)
          const q = Math.hypot(Math.max(0, Math.abs(x) - ga), Math.abs(Math.abs(z) - gz));
          if (q < gw + .02) { const f = .12 * (1 - ss(gw * .2, gw + .02, q)); col = col.map(v => v * (1 - f)); }
          const i = (y * Wp + xp) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
        }
        if (!d2) return;
        // the normal map from the height (canvas y runs towards the player = +z; the map's green points to -z: v up)
        const sx = Wp / W, sz = Hp / H, K = 1;
        for (let y = 0; y < Hp; y++) for (let xp = 0; xp < Wp; xp++) {
          const hL = hpx[y * Wp + Math.max(0, xp - 1)], hR = hpx[y * Wp + Math.min(Wp - 1, xp + 1)];
          const hU = hpx[Math.max(0, y - 1) * Wp + xp], hD = hpx[Math.min(Hp - 1, y + 1) * Wp + xp];
          const nx = -(hR - hL) * sx / 2 * K, nz = -(hD - hU) * sz / 2 * K;   // ∂h/∂x, ∂h/∂z (world)
          const ny = 1, L = Math.hypot(nx, ny, nz);
          const i = (y * Wp + xp) * 4;
          d2[i] = (nx / L * .5 + .5) * 255; d2[i + 1] = (-nz / L * .5 + .5) * 255; d2[i + 2] = (ny / L * .5 + .5) * 255; d2[i + 3] = 255;
        }
      },
      // the side faces of the slab (the same acacia, seen on its edge)
      side(d, Wp, Hp) {
        const N = makeNoise(77), strips = [[-99, -.14, 3]];
        for (let y = 0; y < Hp; y++) for (let xp = 0; xp < Wp; xp++) {
          const c = acacia(N, xp / Wp * 22, y / Hp * 1.2 - .6, strips), i = (y * Wp + xp) * 4;
          d[i] = c[0] * .92; d[i + 1] = c[1] * .92; d[i + 2] = c[2] * .92; d[i + 3] = 255;
        }
      },
      // the balls: pale rubberwood with soft grain / ebony with brown streaks
      ball(d, Wp, Hp, p) {
        const N = makeNoise(p.dark ? 19 : 11);
        for (let y = 0; y < Hp; y++) for (let xp = 0; xp < Wp; xp++) {
          const u = xp / Wp, v = y / Hp;
          const g = N(u * 5, v * 3, 3), f = N(u * 60, v * 30, 2), pore = N(u * 120, v * 500, 1) > .82 ? 1 : 0;
          let c;
          if (p.dark) { const t = cl(.45 + (g - .5) * .5 + (f - .5) * .2 + pore * .1); c = [60 - t * 34, 40 - t * 24, 29 - t * 17]; }
          else { const t = cl(.4 + (g - .5) * .45 + (f - .5) * .14 + pore * .05); c = [236 - t * 44, 200 - t * 48, 150 - t * 50]; }
          const i = (y * Wp + xp) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
        }
      },
    };
  }
  const CUPR = CUP;   // (the kernel's copy: sent with its source as a literal below)
  const KLsrc = new Function('return (' + KL.toString().replace(/CUPR/g, String(CUP)) + ')')();   // self-contained for the worker
  function paint(c, name, p, after, c2) {
    const TG = window.AtlasTexGen; if (TG) return TG.paint(c, KLsrc, name, p, after, c2);
    const g = c.getContext('2d'), a = g.createImageData(c.width, c.height), b = c2 ? c2.getContext('2d').createImageData(c2.width, c2.height) : null;
    (KLsrc.L || (KLsrc.L = KLsrc(X)))[name](a.data, c.width, c.height, p || {}, b && b.data);
    g.putImageData(a, 0, 0); if (b) c2.getContext('2d').putImageData(b, 0, 0); if (after) after(g, c.width, c.height); return c;
  }
  const texCache = {};
  function topTex(D) {
    const key = 'fnTop' + D.NC + 'x' + D.NR; if (texCache[key]) return texCache[key];
    const TT = T(), ppu = SZ(LO() ? 150 : 190), Wp = Math.round(D.W * ppu), Hp = Math.round(D.H * ppu);
    const c = document.createElement('canvas'), n = document.createElement('canvas'); c.width = n.width = Wp; c.height = n.height = Hp;
    paint(c, 'top', D, null, n);
    const map = new TT.CanvasTexture(c); map.encoding = TT.sRGBEncoding; map.anisotropy = 8;
    const nm = new TT.CanvasTexture(n); nm.anisotropy = 8;
    if (window.AtlasTexGen && AtlasTexGen.later) { AtlasTexGen.later([c], c, () => { map.needsUpdate = true; nm.needsUpdate = true; X.kick && X.kick(200); }); }
    return (texCache[key] = { map, nm, canvas: c });
  }
  function simpleTex(key, Wp, Hp, name, p) {
    if (texCache[key]) return texCache[key];
    const TT = T(), c = document.createElement('canvas'); c.width = Wp; c.height = Hp; paint(c, name, p);
    const t = new TT.CanvasTexture(c); t.encoding = TT.sRGBEncoding; t.anisotropy = 4;
    if (window.AtlasTexGen && AtlasTexGen.later) AtlasTexGen.later([c], c, () => { t.needsUpdate = true; X.kick && X.kick(200); });
    return (texCache[key] = t);
  }

  /* ---------- the slab: a carved top surface (a grid that dips into the two grooves) + the rounded outer edge ---------- */
  function grooveDepth(q) { return q >= GW ? 0 : GD * Math.sqrt(1 - (q / GW) * (q / GW)); }   // an elliptic channel
  function topGeo(D) {
    const TT = T(), lo = LO(), W = D.W, H = D.H, x0 = -W / 2 + RE, x1 = W / 2 - RE, z0 = -H / 2 + RE, z1 = H / 2 - RE;
    const gz = H / 2 - GM, ga = (W - 1.1) / 2 - GW;
    const xs = new Set(), zs = new Set(), add = (S, a, b, st) => { for (let v = a; v < b - 1e-6; v += st) S.add(+v.toFixed(4)); S.add(+b.toFixed(4)); };
    add(xs, x0, x1, lo ? .2 : .12);
    [-1, 1].forEach(s => add(xs, s * ga - GW - .02, s * ga + GW + .02, lo ? .05 : .028));   // dense round the groove ends
    [-1, 1].forEach(s => { add(xs, -ga, ga, lo ? .3 : .2); });
    add(zs, z0, z1, lo ? .45 : .3);
    [-1, 1].forEach(s => add(zs, s * gz - GW - .015, s * gz + GW + .015, lo ? .045 : .026));
    const X_ = [...xs].filter(v => v >= x0 - 1e-6 && v <= x1 + 1e-6).sort((a, b) => a - b), Z_ = [...zs].filter(v => v >= z0 - 1e-6 && v <= z1 + 1e-6).sort((a, b) => a - b);
    const nx = X_.length, nz = Z_.length, P = new Float32Array(nx * nz * 3), UV = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = X_[i], z = Z_[j], q = Math.hypot(Math.max(0, Math.abs(x) - ga), Math.abs(Math.abs(z) - gz));
      const k = j * nx + i; P[k * 3] = x; P[k * 3 + 1] = TH - grooveDepth(q); P[k * 3 + 2] = z;
      UV[k * 2] = x / W + .5; UV[k * 2 + 1] = .5 - z / H;
    }
    for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.BufferAttribute(P, 3)); g.setAttribute('uv', new TT.BufferAttribute(UV, 2)); g.setIndex(idx);
    g.computeVertexNormals(); g.computeBoundingSphere();
    return g;
  }
  // a profile [inset from the outer edge, height] swept round the rectangle (mitred corners)
  function sweep(A, B, prof) {
    const TT = T(), P = [], N = [], UV = [], idx = [], nrm = [], arc = [0];
    for (let i = 0; i < prof.length; i++) {
      let nd = 0, ny = 0;
      for (const [a, b] of [[i - 1, i], [i, i + 1]]) { if (a < 0 || b >= prof.length) continue; const dd = prof[b][0] - prof[a][0], dy = prof[b][1] - prof[a][1], L = Math.hypot(dd, dy); if (L < 1e-6) continue; nd += -dy / L; ny += dd / L; }
      const L = Math.hypot(nd, ny) || 1; nrm.push([nd / L, ny / L]);
      if (i) arc.push(arc[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
    }
    const tot = arc[arc.length - 1];
    // sides: [outward normal, along, half length along, distance of the edge]
    [[[0, 0, -1], [1, 0, 0], A, B], [[1, 0, 0], [0, 0, 1], B, A], [[0, 0, 1], [-1, 0, 0], A, B], [[-1, 0, 0], [0, 0, -1], B, A]].forEach(([o, e, Lh, Dd], si) => {
      const base = P.length / 3;
      prof.forEach(([d, y], i) => {
        const L = Lh - d, [nd, ny] = nrm[i];
        for (const s of [-L, L]) {
          P.push(o[0] * (Dd - d) + e[0] * s, y, o[2] * (Dd - d) + e[2] * s); N.push(o[0] * nd, ny, o[2] * nd);
          UV.push((s + Lh) / (2 * Lh) * (Lh / 6), .15 + arc[i] / tot * .7 + si * .02);
        }
      });
      for (let i = 0; i < prof.length - 1; i++) { if (arc[i + 1] - arc[i] < 1e-6) continue; const a = base + i * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    });
    const g = new TT.BufferGeometry();
    g.setAttribute('position', new TT.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new TT.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new TT.Float32BufferAttribute(UV, 2));
    g.setIndex(idx); g.computeBoundingSphere(); return g;
  }
  function board(rule) {
    const TT = T(), D = dims(rule), g = new TT.Group();
    const tx = topTex(D);
    const topM = new TT.MeshStandardMaterial({ map: tx.map, normalMap: tx.nm, normalScale: new TT.Vector2(1.4, 1.4), color: lin(0xffffff), roughness: .58, metalness: 0, envMapIntensity: .55 });
    const top = new TT.Mesh(topGeo(D), topM); top.castShadow = false; top.receiveShadow = true; g.add(top);
    const sideT = simpleTex('fnSide', SZ(1024), SZ(128), 'side', {}); sideT.wrapS = TT.RepeatWrapping;
    const sideM = mat('side', () => new TT.MeshStandardMaterial({ map: sideT, color: lin(0xffffff), roughness: .62, envMapIntensity: .5 }));
    const st = LO() ? 4 : 7, prof = [[0, .02], [0, TH - RE]];
    for (let i = 1; i <= st; i++) { const a = i / st * Math.PI / 2; prof.push([RE - Math.cos(a) * RE, TH - RE + Math.sin(a) * RE]); }
    const edge = new TT.Mesh(sweep(D.W / 2, D.H / 2, prof), sideM); edge.castShadow = edge.receiveShadow = true; g.add(edge);
    // underneath: a dark base (shadow caster; it is never seen from above)
    const CH = TH - GD - .08, core = new TT.Mesh(new TT.BoxGeometry(D.W - .04, CH, D.H - .04), mat('core', () => new TT.MeshStandardMaterial({ color: lin(0x3a2010), roughness: .8 })));
    core.position.y = CH / 2 + .02; core.castShadow = true; g.add(core);
    // a thin felt-like shadow under the slab edge (the slab stands a hair above the table)
    const ox = (D.NC - 1) / 2, oz = (D.NR - 1) / 2, gz = D.H / 2 - GM, L = D.W - 1.1;
    const restCup = TH - .03 + Math.sqrt(R * R - CUP * CUP) - .0;   // a ball in a cup: on the rim of the cup
    g.userData = {
      NC: D.NC, NR: D.NR, W: D.W, H: D.H, top: TH, rest: restCup, R,
      pt: (c, r) => [c - ox, r - oz],
      piece,
      groove: {
        z: [-gz, gz], L,
        y: s => grooveRest(s * R),
        at: (side, i, n) => { const s = Math.min(.49, (L - .06) / Math.max(1, n)); return [-L / 2 + .04 + s * (i + .5), side ? gz : -gz]; },
        step: n => Math.min(.49, (L - .06) / Math.max(1, n)),
      },
    };
    return g;
  }
  // the height of a ball's centre resting in the groove (radius r): the lowest height where it clears the channel
  function grooveRest(r) {
    let c = TH - GD + r;
    for (let k = 0; k <= 40; k++) { const q = (k / 40) * Math.min(r, GW); const need = TH - grooveDepth(q) + Math.sqrt(Math.max(0, r * r - q * q)); if (need > c) c = need; }
    return c;
  }

  /* ---------- the balls ---------- */
  const geos = {};
  function ballGeo() { const k = LO() ? 'lo' : 'hi'; if (geos[k]) return geos[k]; const g = new (T().SphereGeometry)(1, LO() ? 18 : 28, LO() ? 12 : 18); if (X.share) X.share(g); return (geos[k] = g); }
  function ballMat(col) {
    return mat('b' + col, () => {
      const TT = T(), dark = col === 2, t = simpleTex(dark ? 'fnBallD' : 'fnBallL', SZ(256), SZ(128), 'ball', { dark });
      return new TT.MeshStandardMaterial({ map: t, color: lin(0xffffff), roughness: dark ? .5 : .6, metalness: 0, envMapIntensity: dark ? .7 : .55 });
    });
  }
  // col 1 White (pale wood) / 2 Black (ebony); the group's origin is on the surface it rests on, the ball at userData.cy above it
  function piece(col, scale = 1) {
    const TT = T(), g = new TT.Group(), r = R * scale, m = new TT.Mesh(ballGeo(), ballMat(col));
    m.scale.setScalar(r); m.castShadow = true; m.receiveShadow = true;
    m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);   // every ball shows its own grain
    g.add(m); g.userData = { col, r, ball: m };
    return g;
  }

  X.MODELS.fanorona = function (live, rule) {
    const g = board(rule || 'sivy'), U = g.userData;
    if (live) return g;
    // a game in progress (9×5): White (pale) from the near side, Black (ebony) from the far side, some balls already in the grooves
    const spec = ['.b.bbbbbb', 'bb..b.bbb', 'w.bw..w.b', 'ww.wwb.ww', 'wwww.wwww'];
    spec.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch === '.') return;
      const p = piece(ch === 'w' ? 1 : 2), [x, z] = U.pt(c, r); p.position.set(x, U.rest, z); g.add(p);
      const sh = X.contact(R * .95, .5); sh.position.set(x, U.top + .002, z); g.add(sh);
    }));
    const gs = .66, n = 22;
    for (let i = 0; i < 6; i++) { const p = piece(1, gs), [x, z] = U.groove.at(0, i, n); p.position.set(x, U.groove.y(gs), z); g.add(p); }
    for (let i = 0; i < 4; i++) { const p = piece(2, gs), [x, z] = U.groove.at(1, i, n); p.position.set(x, U.groove.y(gs), z); g.add(p); }
    g.scale.setScalar(.8);   // about the other boards' size on the chabudai
    return g;
  };
  X.fanorona = { board, piece, dims, R, TH };
})();
