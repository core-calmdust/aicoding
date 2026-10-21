/* =====================================================================
   World Board Game Atlas — soft 3D profile / avatar backgrounds (b001…b029).
   Pre-rendered by atlas/tools/bgs.html?id=b0xx → images/atlas/bg/b0xx.webp
   The portal never loads three.js for these; it only shows the images.

   BG3D.build(id) → { scene, camera, size, mode }
     mode 'tile'  : seamless square tile (size 256), top-down orthographic, camera = exactly one period.
                    The surface is one periodic heightfield mesh (plush domes, quilted pillows, soft ridges)
                    lit by the soft() plush material (wrap lighting, no gloss). Contact AO + a soft drop shadow
                    toward the lower right are baked into the vertex colours from the same periodic grid,
                    so every pixel — normals, shading and shadow — repeats exactly.
     mode 'cover' : 512×512 sky diorama (gradient + puffy plush clouds / moon / stars), not tiled.
   Same ids, pattern ideas and colours as the SVG backgrounds in atlas/art.js (BG / BG_NAME / BGCOL / BGS).
   ===================================================================== */
(function () {
  'use strict';
  if (!window.THREE || !window.Icons3D || !Icons3D.KIT) return;
  const K = Icons3D.KIT, T = K.T, soft = K.soft, blob = K.blob, mesh = K.mesh, M = K.M;

  // colours (sRGB) — same as BGCOL in atlas/art.js
  const COL = {
    cream: ['#fff6df', '#ffe7a8'], mint: ['#e3fbef', '#a8ecc9'], sky: ['#e2f4ff', '#a9dcff'], rose: ['#ffe6ef', '#ffb5cf'], lilac: ['#efe8ff', '#cdb8ff'],
    night: ['#26304f', '#43517f'], sunset: ['#ffd27a', '#ff7f9e'], wood: ['#f2d49b', '#d9ae67'], gold: ['#fff1b8', '#ffc93d'],
  };
  // same order as BGS in atlas/art.js → b001 … b029
  const LIST = [
    ['plain', 'cream'], ['plain', 'mint'], ['plain', 'sky'], ['plain', 'rose'], ['plain', 'lilac'], ['dots', 'cream'], ['dots', 'sky'], ['stripe', 'mint'], ['stripe', 'rose'],
    ['checker', 'cream'], ['checker', 'lilac'], ['goban', 'wood'], ['wave', 'sky'], ['wave', 'mint'], ['heart', 'rose'], ['hex', 'lilac'], ['dots', 'night'],
    ['pip', 'wood'], ['star', 'night'], ['sakura', 'rose'], ['hex', 'night'], ['checker', 'night'], ['star', 'lilac'],
    ['sky', 'sunset'], ['sakura', 'night'], ['star', 'sunset'], ['goban', 'gold'],
    ['sky', 'night'], ['star', 'gold'],
  ];
  const IDS = {}; LIST.forEach((x, i) => { IDS['b' + String(i + 1).padStart(3, '0')] = x; });

  /* ---------------- small math ---------------- */
  const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const cl = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
  const sstep = (a, b, x) => { const t = cl((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const fr = x => x - Math.floor(x);
  const len = (x, y) => Math.sqrt(x * x + y * y);
  // plush profile: t = distance inside the shape (tile units), w = shoulder width → 0..1 (rounded, no vertical wall)
  const puff = (t, w) => { const f = cl(t / w); return 1 - Math.pow(1 - f, 2.4); };
  // periodic value noise on a g×g lattice (wraps at u,v = 1)
  function pnoise(seed, g) {
    const R = new Float32Array(g * g); let s = seed * 9301 + 49297;
    for (let i = 0; i < g * g; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; R[i] = s / 0x7fffffff; }
    const at = (i, j) => R[((j % g + g) % g) * g + ((i % g + g) % g)];
    return (u, v) => { const x = u * g, y = v * g, i = Math.floor(x), j = Math.floor(y), a = x - i, b = y - j, A = a * a * (3 - 2 * a), B = b * b * (3 - 2 * b);
      return (at(i, j) * (1 - A) + at(i + 1, j) * A) * (1 - B) + (at(i, j + 1) * (1 - A) + at(i + 1, j + 1) * A) * B; };
  }
  // 2D signed distances (negative inside; +y = down on screen)
  function sdStar(px, py, r, rf) {   // 5-point star, a point up (iq)
    let x = Math.abs(px), y = -py; const k1x = .809016994, k1y = -.587785252, k2x = -k1x, k2y = k1y;
    let d = 2 * Math.max(k1x * x + k1y * y, 0); x -= d * k1x; y -= d * k1y;
    d = 2 * Math.max(k2x * x + k2y * y, 0); x -= d * k2x; y -= d * k2y;
    x = Math.abs(x); y -= r;
    const bax = rf * -k1y, bay = rf * k1x - 1, h = cl((x * bax + y * bay) / (bax * bax + bay * bay), 0, r);
    return len(x - bax * h, y - bay * h) * Math.sign(y * bax - x * bay);
  }
  function sdHeart(px, py) {   // iq heart: tip at (0,0), lobes up to ≈ y 1.1 (here +y up)
    const x = Math.abs(px), y = py;
    if (y + x > 1) return len(x - .25, y - .75) - Math.SQRT2 / 4;
    const m = Math.max(x + y, 0) * .5;
    return Math.sqrt(Math.min((x * x + (y - 1) * (y - 1)), (x - m) * (x - m) + (y - m) * (y - m))) * Math.sign(x - y);
  }
  function sdBox(px, py, bx, by, r) { const qx = Math.abs(px) - bx + r, qy = Math.abs(py) - by + r; return len(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }
  function sdSeg(px, py, ax, ay, bx, by) { const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay, h = cl((pax * bax + pay * bay) / (bax * bax + bay * bay)); return len(pax - bax * h, pay - bay * h); }
  function sdTri(px, py, ax, ay, bx, by, cx, cy) {   // triangle a,b,c
    const d = Math.min(sdSeg(px, py, ax, ay, bx, by), sdSeg(px, py, bx, by, cx, cy), sdSeg(px, py, cx, cy, ax, ay));
    const s1 = (bx - ax) * (py - ay) - (by - ay) * (px - ax), s2 = (cx - bx) * (py - by) - (cy - by) * (px - bx), s3 = (ax - cx) * (py - cy) - (ay - cy) * (px - cx);
    const inside = (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
    return inside ? -d : d;
  }
  // nearest point of a staggered lattice (n×n cells + the cell centres' half offset): returns local coords in cell units
  function stag(u, v, n) {
    const x = u * n, y = v * n;
    const ax = fr(x) - .5, ay = fr(y) - .5;                 // centres at cell middles
    const bx = fr(x + .5) - .5, by = fr(y + .5) - .5;       // centres at cell corners
    const A = ax * ax + ay * ay < bx * bx + by * by;
    return A ? [ax, ay, 0, Math.floor(x) + Math.floor(y) * 97] : [bx, by, 1, Math.floor(x + .5) + Math.floor(y + .5) * 97 + 5000];
  }
  const hash = k => fr(Math.sin(k * 12.9898 + 78.233) * 43758.5453);

  /* ---------------- tile patterns: p(u, v) → [height (tile units), r, g, b (sRGB 0..1)] ---------------- */
  // every function must be periodic in u and v with period 1
  const N = 256;          // grid samples per period
  function felt(seed, k) { const n1 = pnoise(seed, 32), n2 = pnoise(seed + 7, 96); return (u, v) => ((n1(u, v) - .5) * .6 + (n2(u, v) - .5)) * k; }

  const PAT = {
    plain(a, b, dark) {   // quilted felt: shallow pillows with little tufts at the stitch crossings
      const n = 4, fz = felt(3, 1);
      return (u, v) => {
        const x = fr(u * n) - .5, y = fr(v * n) - .5;
        const pil = Math.pow((1 - Math.pow(Math.abs(2 * x), 2.6)) * (1 - Math.pow(Math.abs(2 * y), 2.6)), .55);
        const cx = .5 - Math.abs(x), cy = .5 - Math.abs(y), tuft = Math.exp(-(cx * cx + cy * cy) / .004);
        const h = pil * .009 - tuft * .003 + fz(u, v) * .0012;
        let c = mix(a, b, .1 + .06 * (1 - pil) + fz(u, v) * .06);
        return [h, ...c];
      };
    },
    dots(a, b, dark) {   // pillowy domes
      const n = 4, fz = felt(5, 1);
      return (u, v) => {
        const [x, y] = stag(u, v, n), d = len(x, y) - .2;
        const h = puff(-d / n, .045) * .022 + fz(u, v) * .0008, m = sstep(.012, -.012, d);
        return [h, ...mix(mix(a, b, fz(u, v) * .05), dark ? mix(b, [1, 1, 1], .06) : b, m)];
      };
    },
    stripe(a, b) {   // rounded soft bars (x + y = const, like the SVG)
      const n = 5, fz = felt(9, 1);
      return (u, v) => {
        const s = fr((u + v) * n) - .5, d = (Math.abs(s) - .2) / n / Math.SQRT2;   // distance across the bar (tile units)
        const h = puff(-d, .03) * .016 + fz(u, v) * .0008;
        return [h, ...mix(a, b, sstep(.004, -.004, d))];
      };
    },
    checker(a, b, dark) {   // quilted pillow squares
      const n = 8, fz = felt(11, 1);
      return (u, v) => {
        const X = u * n, Y = v * n, x = fr(X) - .5, y = fr(Y) - .5, odd = (Math.floor(X) + Math.floor(Y)) & 1;
        const pil = Math.pow((1 - Math.pow(Math.abs(2 * x), 3)) * (1 - Math.pow(Math.abs(2 * y), 3)), .5);
        const h = pil * (odd ? .02 : .016) + fz(u, v) * .0008;
        let c = odd ? b : a; if (dark && odd) c = mix(b, [1, 1, 1], .03);
        return [h, ...mix(c, mix(a, b, .5), (1 - pil) * .25)];
      };
    },
    goban(a, b, dark, gold) {   // soft wood with slightly raised lines and hoshi dots
      const n = 6, g1 = pnoise(21, 6), g2 = pnoise(23, 48), g3 = pnoise(25, 160);
      const W = gold ? rgb('#fff6d0') : null;
      return (u, v) => {
        const x = fr(u * n) - .5, y = fr(v * n) - .5;
        const dl = Math.min(Math.abs(x), Math.abs(y)) / n - .0045;
        const ring = Math.sin((v * 8 + g1(u, v) * 2.2) * Math.PI * 2) * .5 + .5;   // grain runs along u (8 rings per tile → periodic)
        const grain = Math.pow(ring, 3) * .5 + g2(u, v * 3 % 1) * .2 + g3(u, v) * .3;
        const I = Math.floor(u * n), J = Math.floor(v * n), hos = ((I + J) % 3 === 0) && (I % 3 === 0);
        const dh = len(x, y) / n - .016;
        let h = puff(-dl, .0035) * .0035 + grain * .0015;
        let c = gold ? mix(mix(a, b, .38), b, grain * .3 + .25 * Math.sin((u + v) * Math.PI * 2) ** 2) : mix(a, b, grain * .28);
        c = mix(c, gold ? rgb('#e09a12') : b, sstep(.0015, -.0015, dl) * (gold ? .75 : .9));
        if (hos) { h = Math.max(h, puff(-dh, .01) * (gold ? .014 : .009)); c = mix(c, gold ? W : b, sstep(.002, -.002, dh)); }
        return [h, ...c];
      };
    },
    wave(a, b) {   // rounded ridges
      const n = 5, A = .16, fz = felt(31, 1);
      return (u, v) => {
        const x = u * n, y = fr(v * n) - .5, w = 2 * Math.PI;
        const yc = -A * Math.sin(w * x), sl = A * w * Math.cos(w * x);
        const d = (Math.abs(y - yc) / Math.sqrt(1 + sl * sl) - .1) / n;
        const h = puff(-d, .022) * .014 + fz(u, v) * .0008;
        return [h, ...mix(a, b, sstep(.004, -.004, d))];
      };
    },
    star(a, b, dark, gold) {   // puffy plush stars (+ tiny twinkles for night / gold)
      const n = 4, fz = felt(41, 1), tw = dark ? rgb('#ffe9a8') : [1, 1, .96], G = gold ? rgb('#ffb21e') : b;
      return (u, v) => {
        const [x, y, k, id] = stag(u, v, n), r = (hash(id) - .5) * .5, cs = Math.cos(r), sn = Math.sin(r);
        const px = x * cs - y * sn, py = x * sn + y * cs;
        const d = (sdStar(px, py, .26, .5) - .02) / n;
        let h = puff(-d, .03) * .022 + fz(u, v) * .0008;
        let c = mix(mix(a, b, fz(u, v) * .05), gold ? G : dark ? mix(b, [1, 1, 1], .07) : b, sstep(.003, -.003, d));
        if (dark || gold) {   // tiny 4-point twinkles between the stars
          const [tx, ty] = stag(u + .5 / n, v, n), t4 = len(tx, ty) - .035;
          const m = sstep(.01, -.01, t4); c = mix(c, tw, m * (dark ? .7 : .85)); h = Math.max(h, puff(-t4 / n, .006) * .007);
        }
        return [h, ...c];
      };
    },
    heart(a, b) {   // puffy plush hearts
      const n = 4, fz = felt(51, 1);
      return (u, v) => {
        const [x, y, k] = stag(u, v, n), s = 3.2;
        const d = (sdHeart(x * s, -(y * s) + .55) / s - .015) / n;
        const h = puff(-d, .03) * .022 + fz(u, v) * .0008;
        return [h, ...mix(mix(a, b, fz(u, v) * .05), b, sstep(.003, -.003, d))];
      };
    },
    hex(a, b, dark) {   // pillowy honeycomb outlines (5 × 3 double rows ≈ square)
      const n = 5, m = 3, S3 = Math.sqrt(3), fz = felt(61, 1);
      return (u, v) => {
        const X = u * n * S3, Y = v * m * 3;
        const ax = X - S3 * Math.round(X / S3), ay = Y - 3 * Math.round(Y / 3);
        const bx = X - S3 * (Math.round(X / S3 - .5) + .5), by = Y - 3 * (Math.round((Y - 1.5) / 3)) - 1.5;
        const [px, py] = ax * ax + ay * ay < bx * bx + by * by ? [ax, ay] : [bx, by];
        const f = Math.max(Math.abs(px), Math.abs(px) * .5 + Math.abs(py) * S3 / 2);
        const d = ((S3 / 2 - f) - .13) / (n * S3);   // distance from the wall's edge (tile units)
        const h = puff(-d, .012) * .012 + fz(u, v) * .0008;
        return [h, ...mix(a, dark ? mix(b, [1, 1, 1], .05) : b, sstep(.003, -.003, d))];
      };
    },
    pip(a, b) {   // soft backgammon points from the top and the bottom, alternating
      const n = 6, fz = felt(71, 1), g1 = pnoise(73, 5), g2 = pnoise(75, 64);
      return (u, v) => {
        const X = u * n, x = fr(X), y = fr(v * 2), top = (Math.floor(v * 2) & 1) === 0;
        // each band (half a tile high): a point every cell; top bands point down, bottom bands point up, shifted by half a cell
        const sx = top ? x : fr(X + .5), yy = top ? y : 1 - y;
        const d = (sdTri(sx, yy * 1.35, .18, -.1, .82, -.1, .5, 1.05) - .06) / n;
        const grain = (Math.sin((v * 10 + g1(u, v) * 2) * Math.PI * 2) * .5 + .5) * .5 + g2(u, v) * .5;
        const h = puff(-d, .02) * .014 + grain * .001;
        const alt = (Math.floor(X + (top ? 0 : .5)) & 1) ? mix(b, a, .45) : mix(b, a, .1);
        return [h, ...mix(mix(a, b, grain * .14), alt, sstep(.003, -.003, d))];
      };
    },
    sakura(a, b, dark) {   // puffy 5-petal flowers
      const n = 4, fz = felt(81, 1), W = dark ? rgb('#ffd6e6') : [1, 1, 1], B = dark ? mix(b, rgb('#ffb5cf'), .22) : b;
      return (u, v) => {
        const [x, y, k, id] = stag(u, v, n), rot = hash(id) * 1.3;
        let hp = 0, dmin = 9;
        for (let i = 0; i < 5; i++) {
          const a0 = rot + i * Math.PI * 2 / 5, cs = Math.cos(a0), sn = Math.sin(a0);
          const px = x * cs + y * sn, py = -x * sn + y * cs + .13;      // petal centre .13 out from the middle
          let d = (len(px / .085, py / .13) - 1) * .085;                     // ellipse (approx)
          d = Math.max(d, -(len(px, py + .14) - .03));                      // little notch at the tip
          dmin = Math.min(dmin, d); hp = Math.max(hp, puff(-d / n, .016));
        }
        const dc = len(x, y) - .045;
        let h = hp * .016 + fz(u, v) * .0008, c = mix(mix(a, b, fz(u, v) * .05), B, sstep(.012, -.012, dmin));
        h = Math.max(h, puff(-dc / n, .008) * .02); c = mix(c, W, sstep(.01, -.01, dc));
        return [h, ...c];
      };
    },
  };

  /* ---------------- heightfield → mesh (periodic normals, baked AO + soft drop shadow) ---------------- */
  const L = 4;                                  // world size of one tile
  const LDIR = new T.Vector3(-1, 2.3, -1).normalize();   // light from the upper left (screen up = -z)
  function tileMesh(fn, o) {
    const H = new Float32Array(N * N), C = new Float32Array(N * N * 3);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const r = fn(i / N, j / N), k = j * N + i; H[k] = r[0]; C[k * 3] = r[1]; C[k * 3 + 1] = r[2]; C[k * 3 + 2] = r[3];
    }
    const w = (i, j) => ((j % N + N) % N) * N + ((i % N + N) % N);
    const blur = (src, r, pass) => {   // periodic box blur
      let a = src, b = new Float32Array(N * N);
      for (let p = 0; p < pass; p++) {
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0; for (let d = -r; d <= r; d++) s += a[w(i + d, j)]; b[j * N + i] = s / (2 * r + 1); }
        const c = new Float32Array(N * N);
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { let s = 0; for (let d = -r; d <= r; d++) s += b[w(i, j + d)]; c[j * N + i] = s / (2 * r + 1); }
        a = c;
      }
      return a;
    };
    const px = 1 / N;   // sample spacing in tile units
    // cavity AO: how far below its blurred neighbourhood a point lies
    const Hb = blur(H, 6, 2), AO = new Float32Array(N * N);
    for (let k = 0; k < N * N; k++) AO[k] = Math.max(0, Hb[k] - H[k]);
    // soft drop shadow: march toward the light (up-left), find the highest blocker above the light ray
    const SH = new Float32Array(N * N), tanE = LDIR.y / Math.hypot(LDIR.x, LDIR.z);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const h0 = H[j * N + i]; let s = 0;
      for (let t = 1; t <= 14; t++) { const e = H[w(i - t, j - t)] - h0 - t * px * Math.SQRT2 * tanE; if (e > s) s = e; }
      SH[j * N + i] = s;
    }
    const SHb = blur(SH, 3, 2);
    const aoK = o.aoK ?? 14, shK = o.shK ?? 16, aoTint = o.aoTint || [0, 0, 0];
    // mesh: (N+3)² vertices, index -1 … N+1 (camera covers exactly 0 … N)
    const V = N + 3, pos = new Float32Array(V * V * 3), nor = new Float32Array(V * V * 3), col = new Float32Array(V * V * 3), c = new T.Color();
    for (let jj = 0; jj < V; jj++) for (let ii = 0; ii < V; ii++) {
      const i = ii - 1, j = jj - 1, k = w(i, j), q = (jj * V + ii) * 3;
      pos[q] = -L / 2 + i * L / N; pos[q + 1] = H[k] * L; pos[q + 2] = -L / 2 + j * L / N;
      const dx = (H[w(i + 1, j)] - H[w(i - 1, j)]) / (2 * px), dz = (H[w(i, j + 1)] - H[w(i, j - 1)]) / (2 * px), nl = Math.hypot(dx, 1, dz);
      nor[q] = -dx / nl; nor[q + 1] = 1 / nl; nor[q + 2] = -dz / nl;
      const dk = cl(1 - AO[k] * aoK - SHb[k] * shK, .55, 1);
      let r = C[k * 3], g = C[k * 3 + 1], b = C[k * 3 + 2];
      r = r * dk + aoTint[0] * (1 - dk); g = g * dk + aoTint[1] * (1 - dk); b = b * dk + aoTint[2] * (1 - dk);
      c.setRGB(r, g, b).convertSRGBToLinear(); col[q] = c.r; col[q + 1] = c.g; col[q + 2] = c.b;
    }
    const idx = new Uint32Array((V - 1) * (V - 1) * 6); let p = 0;
    for (let j = 0; j < V - 1; j++) for (let i = 0; i < V - 1; i++) { const a = j * V + i, b = a + 1, d = a + V, e = d + 1; idx[p++] = a; idx[p++] = d; idx[p++] = b; idx[p++] = b; idx[p++] = d; idx[p++] = e; }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('color', new T.BufferAttribute(col, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    const mat = soft(0xffffff, { rough: .92, wrap: .7, rim: o.rim ?? .05, glow: 0, sheenK: o.sheenK ?? .12, sheen: o.sheen, mat: { vertexColors: true } });
    const m = new T.Mesh(geo, mat); m.castShadow = m.receiveShadow = false; return m;
  }

  function lights(scene, o = {}) {
    const hemi = new T.HemisphereLight(o.sky ?? 0xffffff, o.ground ?? 0xd8d0e0, o.hemi ?? .6); scene.add(hemi);
    const key = new T.DirectionalLight(o.key ?? 0xfffaf0, o.keyI ?? .46); key.position.copy(LDIR).multiplyScalar(20); scene.add(key);
  }

  function buildTile(pat, cn) {
    const [A, B] = COL[cn], dark = cn === 'night', gold = cn === 'gold';
    const scene = new T.Scene();
    lights(scene, dark ? { sky: 0xf4f2ff, hemi: .62, keyI: .44 } : {});
    const fn = PAT[pat](rgb(A), rgb(B), dark, gold);
    const aoTint = dark ? rgb('#141a30') : gold ? rgb('#b8741a') : pat === 'goban' || pat === 'pip' ? rgb('#8a5a2a') : mix(rgb(B), [.3, .25, .4], .55);
    scene.add(tileMesh(fn, { aoTint, aoK: dark ? 10 : 12, shK: dark ? 12 : 14, sheen: gold ? 0xfff0a0 : undefined, sheenK: gold ? .4 : .12 }));
    const cam = new T.OrthographicCamera(-L / 2, L / 2, L / 2, -L / 2, .1, 50);
    cam.position.set(0, 20, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    scene.background = new T.Color(A).convertSRGBToLinear();
    return { scene, camera: cam, size: 256, mode: 'tile' };
  }

  /* ---------------- cover skies ---------------- */
  function gradTex(key, stops, dither = 1.2) {
    return K.X.canvasTex(key, 64, 512, (g, W, Hh) => {
      const gr = g.createLinearGradient(0, 0, 0, Hh); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
      const im = g.getImageData(0, 0, W, Hh), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 2 * dither; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      g.putImageData(im, 0, 0);
    });
  }
  function glowTex(key, rgba) {
    return K.X.canvasTex(key, 256, 256, (c, W) => { const g = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); g.addColorStop(0, rgba(1)); g.addColorStop(.35, rgba(.45)); g.addColorStop(1, rgba(0)); c.fillStyle = g; c.fillRect(0, 0, W, W); });
  }
  // puffy plush cloud: a flat-bottomed cluster of soft lobes
  function cloud(mat, x, y, z, s, lobes) {
    const g = new T.Group();
    (lobes || [[-.62, .02, .38], [-.22, .2, .5], [.28, .14, .46], [.66, 0, .34], [.02, -.06, .42]]).forEach(([lx, ly, r], i) => blob(g, mat, [lx, ly, (i % 2) * .05], [r, r * .92, r * .7]));
    [[-.7, -.12, .26], [-.3, -.16, .3], [.12, -.17, .3], [.52, -.13, .28], [.82, -.08, .2]].forEach(([lx, ly, r]) => blob(g, mat, [lx, ly, .08], [r * 1.25, r * .62, r * .8]));   // soft rounded underside
    g.position.set(x, y, z); g.scale.setScalar(s); return g;
  }
  function puffyStar(mat, r, depth) {
    const sh = new T.Shape(), ri = r * .5;
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? ri : r, x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
    sh.closePath();
    const geo = new T.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: r * .3, bevelSize: r * .2, bevelSegments: 8, curveSegments: 4 });
    geo.translate(0, 0, -depth / 2); geo.computeVertexNormals();
    const m = mesh(geo, mat); m.castShadow = m.receiveShadow = false; return m;
  }

  function buildSky(cn) {
    const scene = new T.Scene(), night = cn === 'night', [A, B] = COL[cn];
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, .1, 50); cam.position.set(0, 0, 20); cam.lookAt(0, 0, 0);
    const back = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), new T.MeshBasicMaterial({
      map: night ? gradTex('bg3d-night', [[0, '#1d2542'], [.55, A], [1, B]]) : gradTex('bg3d-sunset', [[0, '#ffe3a0'], [.28, A], [.72, '#ffa08f'], [1, B]]), toneMapped: false }));
    back.position.z = -10; scene.add(back);
    const hemi = new T.HemisphereLight(night ? 0xdfe4ff : 0xffffff, night ? 0x4a3f6e : 0xffc0b0, night ? .62 : .66); scene.add(hemi);
    const key = new T.DirectionalLight(night ? 0xfff2cc : 0xfff4e0, night ? .4 : .44); key.position.set(-6, 9, 12); scene.add(key);
    const glow = (tex, x, y, z, s, op) => { const p = new T.Mesh(new T.PlaneGeometry(s, s), new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: op, blending: T.AdditiveBlending, toneMapped: false })); p.position.set(x, y, z); scene.add(p); return p; };
    const rnd = (() => { let s = night ? 7 : 3; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
    if (night) {
      const cm = soft(0x6f7bb0, { under: 0x3c4677, uk: .6, wrap: .7, rim: .22, glow: .02 }), cm2 = soft(0x56618f, { under: 0x323b66, uk: .6, wrap: .7, rim: .18 });
      // moon: a soft round plush moon with a halo and two shallow craters
      glow(glowTex('bg3d-moonglow', a => `rgba(255,236,170,${a * .55})`), .5, .52, -6, 1.15, 1);
      const mm = soft(0xfff0bf, { under: 0xffd27a, uk: .35, wrap: .8, glow: .32, rim: .25 });
      const moon = new T.Group(); blob(moon, mm, [0, 0, 0], .2);
      blob(moon, soft(0xf5dc9a, { wrap: .8, glow: .25 }), [-.06, .05, .17], [.045, .045, .03]); blob(moon, soft(0xf5dc9a, { wrap: .8, glow: .25 }), [.07, -.06, .175], [.03, .03, .02]);
      moon.position.set(.5, .52, 0); scene.add(moon);
      // puffy little stars (kept off the centre where the character sits)
      const sm = soft(0xffe7a0, { under: 0xffc860, uk: .3, wrap: .8, glow: .4, rim: .2 });
      [[-.72, .74, .07], [-.38, .86, .045], [-.12, .62, .035], [.16, .84, .05], [.86, .2, .04], [-.86, .3, .05], [-.6, .44, .03], [.82, .86, .035], [.3, .3, .028], [-.3, .18, .025]]
        .forEach(([x, y, r], i) => { const s = puffyStar(sm, r, r * .25); s.position.set(x, y, 1); s.rotation.z = (rnd() - .5) * .6; scene.add(s); });
      [[-.84, .9, .03], [.62, .1, .028], [-.5, .62, .02], [.05, .95, .022], [.92, .56, .02]].forEach(([x, y, r]) => K.sparkle(scene, [x, y, 1.2], r));
      // cloud sea along the bottom + a couple of drifting clouds
      scene.add(cloud(cm2, -.55, -.88, -1, .62), cloud(cm2, .5, -.92, -1, .7), cloud(cm, -.95, -.72, 0, .42), cloud(cm, .05, -.98, 0, .5), cloud(cm, .9, -.74, 0, .4));
      scene.add(cloud(cm, -.7, .1, -2, .22), cloud(cm2, .78, .42, -2, .18));
    } else {
      const cm = soft(0xfff7ef, { under: 0xffb0c4, uk: .6, wrap: .7, rim: .2, glow: .02 }), cm2 = soft(0xffe4e2, { under: 0xff98b4, uk: .6, wrap: .7, rim: .16 });
      // low sun peeking from behind the cloud sea
      glow(glowTex('bg3d-sunglow', a => `rgba(255,236,160,${a * .7})`), -.35, -.55, -6, 1.3, 1);
      const sun = new T.Group(); blob(sun, soft(0xffe48a, { under: 0xffa24a, uk: .55, wrap: .8, glow: .22, rim: .25 }), [0, 0, 0], .26); sun.position.set(-.35, -.55, -4); scene.add(sun);
      scene.add(cloud(cm2, -.55, -.86, -1, .66), cloud(cm2, .55, -.9, -1, .72), cloud(cm, -.98, -.7, 0, .44), cloud(cm, .02, -.98, 0, .52), cloud(cm, .92, -.72, 0, .42));
      scene.add(cloud(cm, -.66, .66, -2, .3), cloud(cm, .7, .78, -2, .24), cloud(cm2, .82, .2, -2.5, .16), cloud(cm2, -.9, .26, -2.5, .14));
      [[-.15, .86, .02], [.35, .6, .018], [-.86, .92, .016]].forEach(([x, y, r]) => K.sparkle(scene, [x, y, 1.2], r));
    }
    return { scene, camera: cam, size: 512, mode: 'cover' };
  }

  function build(id) {
    const d = IDS[id] || IDS.b001;
    return d[0] === 'sky' ? buildSky(d[1]) : buildTile(d[0], d[1]);
  }
  window.BG3D = { build, ids: Object.keys(IDS), def: id => IDS[id] };
})();
