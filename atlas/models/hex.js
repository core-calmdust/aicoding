/* =====================================================================
   Hex (ヘックス) on the 3D table — a presentation board:
   an n × n rhombus of individually bevelled hexagonal tiles in three-wood
   marquetry (curly maple, satinwood, pale olive ash — the grain of each
   wood turned 60° against the others), set into a black roiro-lacquer frame.
   The players' sides are champlevé enamel bands over guilloché on brass
   beds — red on the far and near edges, blue on the slanted sides — mitred
   at the corners under chevron brass corner guards with domed rivets; a
   brass trim runs round the foot. Stones: polished red and cobalt glass
   lenses. Everything is procedural (canvas textures, built geometry); all
   the tiles are one mesh (~40 triangles each).
   Registers into Table3D (replaces table3d.js's simple model):
     Table3D.MODELS.hex(live, o)   o.n = 3 … 13 (default 11), o.W = outer width (every n the same size)
        userData: { n, cell, top, W, D, S, viewY, pt(i) → [x, z] (cell i = r * n + c, row 0 on the far side),
                    stone(col 1 red | 2 blue) → Mesh (base at y = 0, height cell * .26) }
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, makeNoise } = X;
  const S3 = Math.sqrt(3), TAU = Math.PI * 2;
  const TK = () => (X.texScale ? X.texScale() : 1), SZ = v => Math.max(64, Math.round(v * TK()));
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hexRGB = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

  /* ---------- textures (cached: every board size shares them) ---------- */
  const tx = {};
  function tex(key, W, H, draw, o = {}) {
    if (tx[key]) return tx[key];
    const TT = T(), c = document.createElement('canvas'); c.width = W; c.height = H;
    draw(c.getContext('2d'), W, H);
    const t = new TT.CanvasTexture(c); t.anisotropy = 8; if (o.srgb !== false) t.encoding = TT.sRGBEncoding;
    t.wrapS = t.wrapT = TT.RepeatWrapping;
    return (tx[key] = t);
  }
  // light veneer, fibres along x, growth rings and a fiddleback shimmer across the grain (tinted per wood by vertex colour)
  function veneerTex() {
    const W = SZ(1024);
    return tex('hxVen', W, W, (g) => {
      const N = makeNoise(41), img = g.createImageData(W, W), d = img.data, A = [250, 238, 214], B = [196, 160, 112];
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / W;
        // tileable: blend the pattern at u and u − 1, v and v − 1
        const f = (uu, vv) => {
          const warp = N(uu * 2 + 3, vv * 5 + 3, 3);
          const ring = Math.sin((vv * 7 + warp * 2.2) * TAU) * .5 + .5;
          const fib = N(uu * 9 + 3, vv * 220 + 3, 2);
          const fiddle = Math.sin((uu * 26 + N(uu * 3, vv * 3, 2) * 3) * TAU) * .5 + .5;   // curl across the fibres
          return Math.pow(ring, 3) * .3 + (fib - .5) * .42 + fiddle * .16 + (N(uu * 2.5, vv * 2.5, 3) - .5) * .2;
        };
        const bu = u < .5 ? 0 : (u - .5) * 2, bv = v < .5 ? 0 : (v - .5) * 2;
        let t = .22 + (f(u, v) * (1 - bu) + f(u - 1, v) * bu) * (1 - bv) + (f(u, v - 1) * (1 - bu) + f(u - 1, v - 1) * bu) * bv;
        t = Math.max(0, Math.min(1, t));
        const i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // roiro lacquer: near-black with a deep red-brown undertone in soft clouds
  function lacquerTex() {
    const W = SZ(512);
    return tex('hxLaq', W, W, (g) => {
      const N = makeNoise(9), img = g.createImageData(W, W), d = img.data;
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const k = N(x / W * 3, y / W * 3, 4), i = (y * W + x) * 4;
        d[i] = 14 + k * 16; d[i + 1] = 9 + k * 7; d[i + 2] = 8 + k * 5; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // guilloché under translucent enamel: fine engine-turned waves, brighter where the enamel is thin
  function enamelTex(key, base, light) {
    const W = SZ(512);
    return tex(key, W, W, (g) => {
      const A = hexRGB(base), B = hexRGB(light), img = g.createImageData(W, W), d = img.data, N = makeNoise(5);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / W;
        const w1 = Math.sin((v * 18 + Math.sin(u * TAU * 3) * .35) * TAU), w2 = Math.sin((u * 18 + Math.sin(v * TAU * 3) * .35) * TAU);
        let t = Math.pow(Math.abs(w1 * w2), .6) * .55 + (N(u * 6, v * 6, 2) - .5) * .2 + .15;
        t = Math.max(0, Math.min(1, t));
        const i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  // glass lens: lathe v runs from the foot (0) to the crown (1) → dark at the rim, light gathering in the dome
  function glassTex(key, deep, mid, glow) {
    return tex(key, 8, 128, (g, W, H) => {
      const gr = g.createLinearGradient(0, H, 0, 0);
      gr.addColorStop(0, deep); gr.addColorStop(.35, deep); gr.addColorStop(.62, mid); gr.addColorStop(.9, glow); gr.addColorStop(1, mid);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    });
  }

  /* ---------- materials (shared) ---------- */
  let MAT = null;
  function mats() {
    if (MAT) return MAT;
    const TT = T();
    const laq = M({ map: lacquerTex(), bump: false, roughness: .28, clearcoat: 1, clearcoatRoughness: .05 });
    const brass = M({ color: 0xe2b66a, metalness: 1, roughness: .2 }); brass.emissive = new TT.Color(0x2a1a06);   // (a little glow: the room's environment is dim for polished metal)
    const tiles = M({ map: veneerTex(), vertexColors: true, roughness: .34, clearcoat: .7, clearcoatRoughness: .14, bumpScale: .0025 });
    const red = M({ map: enamelTex('hxEnR', '#7e0910', '#e2392c'), bump: false, roughness: .12, clearcoat: 1, clearcoatRoughness: .03 });
    const blue = M({ map: enamelTex('hxEnB', '#0a2470', '#3a7ef0'), bump: false, roughness: .12, clearcoat: 1, clearcoatRoughness: .03 });
    const floor = M({ color: 0x120c09, roughness: .7 });
    const gR = M({ map: glassTex('hxGR', '#5a0207', '#b4121a', '#ff5a3c'), bump: false, roughness: .06, clearcoat: 1, clearcoatRoughness: .02 });
    const gB = M({ map: glassTex('hxGB', '#03134a', '#1240b4', '#4f9cff'), bump: false, roughness: .06, clearcoat: 1, clearcoatRoughness: .02 });
    gR.emissive = new TT.Color(0x300203); gB.emissive = new TT.Color(0x020a2c);   // the glass keeps a little inner glow on the shadowed side
    return (MAT = { laq, brass, tiles, red, blue, floor, gR, gB });
  }

  /* ---------- glass stone (one shared lathe per size) ---------- */
  const stoneGeos = {};
  function stoneGeo(cell) {
    const key = cell.toFixed(4) + (X.coarse ? 'c' : ''); if (stoneGeos[key]) return stoneGeos[key];
    const TT = T(), r = cell * .4, h = cell * .26;
    const P = [[0, 0], [.84, 0], [.95, .07], [1, .24], [.97, .44], [.86, .66], [.66, .85], [.36, .97], [0, 1]];
    const g = new TT.LatheGeometry(P.map(([a, b]) => new TT.Vector2(Math.max(.0005, a * r), b * h)), X.coarse ? 16 : 24);
    return (stoneGeos[key] = X.share ? X.share(g) : g);
  }

  /* ---------- polygon helpers (x, z in cell units) ---------- */
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const area = L => { let s = 0; L.forEach((p, i) => { const q = L[(i + 1) % L.length]; s += p[0] * q[1] - q[0] * p[1]; }); return s / 2; };
  // a polygon grown (d > 0) or shrunk (d < 0) by d, mitred corners
  function offsetPoly(L, d) {
    const sg = area(L) > 0 ? 1 : -1, N = L.length, out = [];
    for (let i = 0; i < N; i++) {
      const p0 = L[(i + N - 1) % N], p = L[i], p1 = L[(i + 1) % N];
      const e0 = unit(sub(p, p0)), e1 = unit(sub(p1, p)), n0 = [e0[1] * sg, -e0[0] * sg], n1 = [e1[1] * sg, -e1[0] * sg];
      const nm = unit(add(n0, n1)), k = d / Math.max(.2, dot(nm, n0));
      out.push(add(p, mul(nm, k)));
    }
    return out;
  }
  const unit = a => { const L = Math.hypot(a[0], a[1]); return [a[0] / L, a[1] / L]; };
  const shapeOf = (L, holes) => {
    const TT = T(), s = new TT.Shape(); L.forEach(([x, z], k) => (k ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath();
    (holes || []).forEach(H => { const p = new TT.Path(); H.forEach(([x, z], k) => (k ? p.lineTo(x, -z) : p.moveTo(x, -z))); p.closePath(); s.holes.push(p); });
    return s;
  };
  // an extruded flat part from y0 (bottom) up to y1, in cell units (x, z) and world units (y) → geometry in cell units (scaled by the parent)
  function slabGeo(shape, y0, y1, bev, segs, cell) {
    const TT = T(), b = bev || 0;
    const g = new TT.ExtrudeGeometry(shape, { depth: Math.max(.001, (y1 - y0) / cell - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: segs || 1, curveSegments: 1 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0 / cell + b, 0);
    return g;
  }

  /* ---------- the board ---------- */
  function board(n, Wt) {
    const TT = T(), m = mats(), coarse = !!X.coarse;
    const cx = .75 * (n - 1), cz = (n - 1) * S3 / 4;
    const P = (r, c) => [c + r / 2 - cx, r * S3 / 2 - cz];   // cell units (1 = centre-to-centre)
    const C = [P(0, 0), P(0, n - 1), P(n - 1, n - 1), P(n - 1, 0)];   // corners: far-left (acute), far-right (obtuse), near-right (acute), near-left (obtuse)
    // the four sides (k → k + 1): 0 far (red), 1 right (blue), 2 near (red), 3 left (blue); outward normals
    const nrm = k => { const d = unit(sub(C[(k + 1) % 4], C[k])); return [d[1], -d[0]]; };
    const NS = [0, 1, 2, 3].map(nrm);
    // point at offset a from side k−1 and b from side k, at corner k (lines of the border cells' centres pushed outwards)
    const at = (k, a, b) => {
      const n1 = NS[(k + 3) % 4], n2 = NS[k], p = C[k];
      // solve (q − p)·n1 = a, (q − p)·n2 = b
      const det = n1[0] * n2[1] - n1[1] * n2[0];
      return [p[0] + (a * n2[1] - b * n1[1]) / det, p[1] + (b * n1[0] - a * n2[0]) / det];
    };
    const ACUTE = k => k % 2 === 0;
    // the outer outline at offset d, its acute corners clipped (e along each edge) and the obtuse ones lightly
    const outline = (d, ea = 1.25, eo = .45) => {
      const L = [];
      for (let k = 0; k < 4; k++) {
        const q = at(k, d, d), e = ACUTE(k) ? ea : eo;
        const dIn = unit(sub(C[(k + 3) % 4], C[k])), dOut = unit(sub(C[(k + 1) % 4], C[k]));
        L.push(add(q, mul(dIn, e)), add(q, mul(dOut, e)));
      }
      return L;
    };
    const RIM = 1.6, B1 = .8, B2 = 1.1, BB = .06;   // frame edge, enamel band (inner / outer offset), brass bed margin
    const outer = outline(RIM);
    const xs = outer.map(p => p[0]), zs = outer.map(p => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
    const cell = Wt / (maxX - minX), W = (maxX - minX) * cell, D = (maxZ - minZ) * cell;

    // heights (world units)
    const Y0 = .1, YF = .53, YFL = .4, YT = .48;   // frame foot (on the plinth), frame top, well floor, tile top
    const g = new TT.Group(), k3 = new TT.Group(); k3.scale.setScalar(cell); g.add(k3);
    const add3 = (geo, mat, cast = true, recv = true) => { const o = new TT.Mesh(geo, mat); o.castShadow = cast; o.receiveShadow = recv; k3.add(o); return o; };

    // the zigzag well: the outline of the union of the cells' hexagons (exposed sides chained into a loop)
    const R = 1 / S3, cells = new Set(), keyOf = p => Math.round(p[0] * 1e3) + ',' + Math.round(p[1] * 1e3);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.add(keyOf(P(r, c)));
    const corner = (p, j) => { const a = (60 * j - 90) * Math.PI / 180; return [p[0] + Math.cos(a) * R, p[1] + Math.sin(a) * R]; };
    const next = new Map();
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const p = P(r, c);
      for (let j = 0; j < 6; j++) {
        const a = (60 * j - 60) * Math.PI / 180, nb = [p[0] + Math.cos(a), p[1] + Math.sin(a)];
        if (cells.has(keyOf(nb))) continue;
        const A = corner(p, j), Bq = corner(p, j + 1); next.set(keyOf(A), [A, Bq]);
      }
    }
    const well = []; { let [a0] = next.values().next().value, cur = a0; for (let s = 0; s < next.size; s++) { const e = next.get(keyOf(cur)); if (!e) break; well.push(e[0]); cur = e[1]; if (keyOf(cur) === keyOf(a0)) break; } }

    // plinth (set back, a shadow line under the frame), the frame, its brass foot trim
    add3(slabGeo(shapeOf(outline(RIM - .22, 1.15, .4)), 0, Y0 + .02, .03, 2, cell), m.laq);
    const frameG = slabGeo(shapeOf(outer, [well]), Y0, YF, .07, coarse ? 2 : 3, cell);
    { const Pp = frameG.attributes.position, UV = frameG.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, (Pp.getX(i) - minX) / 6 + Pp.getY(i) * .05, (Pp.getZ(i) - minZ) / 6); }
    add3(frameG, m.laq);
    add3(slabGeo(shapeOf(outline(RIM + .035, 1.25, .45), [outline(RIM - .12, 1.25, .45)]), Y0 - .005, Y0 + .06, .012, 1, cell), m.brass);
    // the well's floor: dark ebony seen in the joints between the tiles
    { const fg = new TT.ShapeGeometry(shapeOf(well)); fg.rotateX(-Math.PI / 2); fg.translate(0, YFL / cell, 0); add3(fg, m.floor, false, true); }

    // corner guards: chevrons of brass over the band ends, each arm reaching a little past the chamfer
    const IIN = B1 - BB - .05, OOUT = RIM - .07, ARM = .5;
    const guard = k => {
      const n1 = NS[(k + 3) % 4], n2 = NS[k], uA = unit(sub(C[(k + 3) % 4], C[k])), uB = unit(sub(C[(k + 1) % 4], C[k]));
      const ea = ACUTE(k) ? 1.25 : .45, q = at(k, OOUT, OOUT), chA = add(q, mul(uA, ea + .02)), chB = add(q, mul(uB, ea + .02));
      const tA = dot(sub(chA, C[k]), uA) + ARM, tB = dot(sub(chB, C[k]), uB) + ARM;
      const endA = add(add(C[k], mul(n1, IIN)), mul(uA, tA)), endB = add(add(C[k], mul(n2, IIN)), mul(uB, tB));
      return { L: [at(k, IIN, IIN), endA, add(endA, mul(n1, OOUT - IIN)), chA, chB, add(endB, mul(n2, OOUT - IIN)), endB], tA, tB, n1, n2, endA, endB };
    };
    const G = [0, 1, 2, 3].map(guard);
    // enamel bands on brass beds along the four sides, their ends hidden under the guards
    const bandShape = (k, a, b) => {
      const u = unit(sub(C[(k + 1) % 4], C[k])), len = Math.hypot(...sub(C[(k + 1) % 4], C[k])), s0 = G[k].tB - ARM * .5, s1 = len - (G[(k + 1) % 4].tA - ARM * .5);
      const pnt = (s, d) => add(add(C[k], mul(u, s)), mul(NS[k], d));
      return shapeOf([pnt(s0, a), pnt(s1, a), pnt(s1, b), pnt(s0, b)]);
    };
    for (let k = 0; k < 4; k++) {
      add3(slabGeo(bandShape(k, B1 - BB, B2 + BB), YF - .02, YF + .012, .008, 1, cell), m.brass, false, true);
      const eg = slabGeo(bandShape(k, B1, B2), YF - .01, YF + .02, .012, coarse ? 1 : 2, cell);
      { const Pp = eg.attributes.position, UV = eg.attributes.uv; for (let i = 0; i < UV.count; i++) UV.setXY(i, Pp.getX(i) * .55, Pp.getZ(i) * .55); }
      add3(eg, k % 2 ? m.blue : m.red, false, true);
    }
    // a fine brass stringing round the zigzag well
    add3(slabGeo(shapeOf(offsetPoly(well, .11), [offsetPoly(well, .06)]), YF - .01, YF + .006, 0, 1, cell), m.brass, false, true);
    // the guards: a bevelled plate with a raised inner panel (an engraved border line between them), two domed rivets
    const rivG = new TT.SphereGeometry(.065, coarse ? 8 : 10, coarse ? 4 : 5, 0, TAU, 0, Math.PI / 2);
    const rivets = [];
    G.forEach(gd => {
      add3(slabGeo(shapeOf(gd.L), YF - .005, YF + .035, .015, coarse ? 1 : 2, cell), m.brass, true, true);
      add3(slabGeo(shapeOf(offsetPoly(gd.L, -.1)), YF + .02, YF + .045, .01, 1, cell), m.brass, false, true);
      const apex = gd.L[0];
      [[gd.endA, gd.n1], [gd.endB, gd.n2]].forEach(([e, nn]) => rivets.push(add(add(e, mul(sub(apex, e), .2)), mul(nn, (OOUT - IIN) * .5))));
    });
    rivets.forEach(([x, z]) => { const o = add3(rivG, m.brass, false, true); o.position.set(x, (YF + .045) / cell, z); o.scale.y = .6; });

    // the tiles: one mesh, each tile a hexagonal prism with a bevelled top (2 bands on PC, 1 on phones)
    const Rt = R * .935, bw = .075, bh = .022 / cell, yT = YT / cell, yF = YFL / cell;
    const rings = coarse ? [[Rt - bw, yT], [Rt, yT - bh], [Rt, yF]] : [[Rt - bw, yT], [Rt - bw * .3, yT - bh * .35], [Rt, yT - bh], [Rt, yF]];
    const per = 4 + 12 * (rings.length - 1), NT = n * n * per;
    const pos = new Float32Array(NT * 9), nor = new Float32Array(NT * 9), uv = new Float32Array(NT * 6), col = new Float32Array(NT * 9);
    let t = 0;
    const R0 = rnd(1234 + n);
    const WOOD = [[1, .97, .9], [1, .84, .58], [.8, .72, .56]];   // curly maple, satinwood, olive ash (× the veneer)
    const lin = v => Math.pow(v, 2.2);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const p = P(r, c), q = (r + 2 * c) % 3, ang = q * Math.PI / 3 + (R0() - .5) * .12, ca = Math.cos(ang), sa = Math.sin(ang);
      const ou = R0(), ov = R0(), jit = .94 + R0() * .1, wc = WOOD[q].map(v => lin(v * jit));
      const vtx = (ri, j) => { const a = (60 * j - 90) * Math.PI / 180, [rr, y] = rings[ri]; return [p[0] + Math.cos(a) * rr, y, p[1] + Math.sin(a) * rr]; };
      const uvOf = v => [ou + (v[0] * ca - v[2] * sa) * .21, ov + (v[0] * sa + v[2] * ca) * .21];
      const tri = (a, b, cc, want) => {
        const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2 = [cc[0] - a[0], cc[1] - a[1], cc[2] - a[2]];
        let nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0];
        if (nx * want[0] + ny * want[1] + nz * want[2] < 0) { const s = b; b = cc; cc = s; nx = -nx; ny = -ny; nz = -nz; }
        const L = Math.hypot(nx, ny, nz) || 1;
        [a, b, cc].forEach((v, s) => { const o = (t * 3 + s); pos.set(v, o * 3); nor.set([nx / L, ny / L, nz / L], o * 3); uv.set(uvOf(v), o * 2); col.set(wc, o * 3); });
        t++;
      };
      const top = [0, 1, 2, 3, 4, 5].map(j => vtx(0, j)), up = [0, 1, 0];
      tri(top[0], top[1], top[2], up); tri(top[0], top[2], top[3], up); tri(top[0], top[3], top[4], up); tri(top[0], top[4], top[5], up);
      for (let ri = 0; ri < rings.length - 1; ri++) for (let j = 0; j < 6; j++) {
        const a = vtx(ri, j), b = vtx(ri, j + 1), cc = vtx(ri + 1, j), d = vtx(ri + 1, j + 1), ma = (60 * j - 60) * Math.PI / 180, want = [Math.cos(ma), .3, Math.sin(ma)];
        tri(a, b, d, want); tri(a, d, cc, want);
      }
    }
    const tg = new TT.BufferGeometry();
    tg.setAttribute('position', new TT.BufferAttribute(pos, 3)); tg.setAttribute('normal', new TT.BufferAttribute(nor, 3));
    tg.setAttribute('uv', new TT.BufferAttribute(uv, 2)); tg.setAttribute('color', new TT.BufferAttribute(col, 3));
    add3(tg, m.tiles, false, true);

    const pt = i => { const [x, z] = P(Math.floor(i / n), i % n); return [x * cell, z * cell]; };
    const stone = colr => { const s = new TT.Mesh(stoneGeo(cell), colr === 1 ? m.gR : m.gB); s.castShadow = !coarse; s.receiveShadow = false; s.rotation.y = Math.random() * TAU; return s; };
    const top = YT + .001;
    Object.assign(g.userData, { n, cell, top, W, D, S: W, pt, stone, viewY: top * .92 });
    return g;
  }

  // the showcase: a mid-game position, a red chain of bridges from the far edge, blue blocking from the sides
  const SHOW = [[1, 6, 1], [3, 5, 1], [4, 4, 1], [5, 4, 1], [6, 3, 1], [8, 2, 1], [3, 6, 2], [4, 6, 2], [5, 5, 2], [6, 5, 2], [2, 8, 2], [7, 4, 2], [8, 3, 2]];
  X.MODELS.hex = function (live, o = {}) {
    const n = Math.max(3, Math.min(13, o.n || 11)), g = board(n, o.W || 10.4);
    if (live) return g;
    const U = g.userData;
    SHOW.forEach(([r, c, col]) => {
      if (r >= n || c >= n) return;
      const [x, z] = U.pt(r * n + c), s = U.stone(col); s.position.set(x, U.top, z); g.add(s);
      const sh = X.contact(U.cell * .44, .5); sh.position.set(x, U.top + .002, z); g.add(sh);
    });
    return g;
  };
})();
