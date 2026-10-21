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
    peach: ['#ffe9dc', '#ffbe9c'], lemon: ['#fffbd6', '#fff08a'], snow: ['#f7f9fc', '#dbe4f0'], coral: ['#ffe2dc', '#ff9a8a'], forest: ['#23402f', '#3d6b4c'], ocean: ['#1f3b55', '#2f6a8f'], berry: ['#4a2340', '#8a3f74'], cocoa: ['#e8d5c4', '#b98a66'], rainbow: ['#ffe1ef', '#bfe6ff'],
  };
  // same order as BGS in atlas/art.js → b001 … b029
  const LIST = [
    ['plain', 'cream'], ['plain', 'mint'], ['plain', 'sky'], ['plain', 'rose'], ['plain', 'lilac'], ['dots', 'cream'], ['dots', 'sky'], ['stripe', 'mint'], ['stripe', 'rose'],
    ['checker', 'cream'], ['checker', 'lilac'], ['goban', 'wood'], ['wave', 'sky'], ['wave', 'mint'], ['heart', 'rose'], ['hex', 'lilac'], ['dots', 'night'],
    ['pip', 'wood'], ['star', 'night'], ['sakura', 'rose'], ['hex', 'night'], ['checker', 'night'], ['star', 'lilac'],
    ['sky', 'sunset'], ['sakura', 'night'], ['star', 'sunset'], ['goban', 'gold'],
    ['sky', 'night'], ['star', 'gold'],
    // b030 … b100 (same order as art.js)
    ["cloud", "sky"], ["cloud", "rose"], ["bubble", "mint"], ["bubble", "lilac"], ["flower", "cream"], ["flower", "peach"], ["leaf", "mint"], ["leaf", "lemon"], ["plain", "peach"], ["plain", "lemon"], ["plain", "snow"], ["dots", "peach"], ["dots", "lemon"], ["stripe", "sky"], ["stripe", "lilac"], ["checker", "mint"], ["checker", "peach"], ["wave", "rose"], ["heart", "lilac"], ["argyle", "cream"], ["scale", "sky"], ["argyle", "rose"], ["plaid", "coral"], ["plaid", "forest"], ["scale", "mint"], ["moon", "lilac"], ["dice", "cream"], ["dice", "sky"], ["chess", "cream"], ["chess", "mint"], ["cards", "rose"], ["cards", "snow"], ["stones", "wood"], ["stones", "snow"], ["shogi", "wood"], ["candy", "rose"], ["candy", "lemon"], ["flower", "night"], ["leaf", "forest"], ["bubble", "ocean"], ["heart", "coral"], ["dice", "night"], ["chess", "night"], ["cards", "night"], ["shogi", "cocoa"], ["stones", "night"], ["moon", "night"], ["scale", "ocean"], ["plaid", "berry"], ["argyle", "berry"], ["candy", "berry"], ["sakura", "peach"], ["hex", "mint"], ["star", "ocean"], ["wave", "ocean"], ["cloud", "sunset"], ["meadow", "lemon"], ["sea", "sky"], ["meadow", "mint"], ["snowscape", "snow"], ["toytown", "cream"], ["sky", "peach"], ["chess", "gold"], ["cards", "gold"], ["dice", "gold"], ["star", "berry"], ["space", "night"], ["sky", "rainbow"], ["toytown", "night"], ["sea", "sunset"], ["star", "rainbow"],
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
  const WHITE = [1, 1, 1];
  const smin = (a, b, k) => { const h = cl(.5 + .5 * (b - a) / k); return b + (a - b) * h - k * h * (1 - h); };   // smooth union
  const rot = (x, y, r) => { const c = Math.cos(r), s = Math.sin(r); return [x * c - y * s, x * s + y * c]; };
  // stag() with a periodic id + integer cell coords (ix, iy) of the chosen centre, for motifs that vary per cell
  function stagP(u, v, n) { const r = stag(u, v, n), o = r[2] ? .5 : 0, ix = ((Math.floor(u * n + o) % n) + n) % n, iy = ((Math.floor(v * n + o) % n) + n) % n; r[3] = ix + iy * 97 + r[2] * 5000; r.push(ix, iy); return r; }   // id wraps with the tile
  // ground / motif colours for the b030+ motifs: dark grounds stay dark, gold = gold ground + cream motifs, rainbow = pastel hues cycling per motif
  const RAINBOW = ['#ffb3c8', '#ffd09a', '#fff09a', '#b6efc4', '#a9dcff', '#cdb8ff'].map(rgb);
  function pal(a, b, o) {
    if (o.rainbow) return { ground: (u, v, f) => mix(rgb('#fff6fa'), rgb('#eef6ff'), cl(.5 + .5 * Math.sin((u + v) * Math.PI * 2)) * .7 + f * .05), motif: id => RAINBOW[Math.floor(hash(id + .37) * 6)] };
    if (o.gold) return { ground: (u, v, f) => mix(mix(a, b, .45), b, .25 * Math.sin((u + v) * Math.PI * 2) ** 2 + f * .08), motif: () => rgb('#fff8e2') };
    if (o.dark) return { ground: (u, v, f) => mix(a, b, f * .05), motif: () => mix(b, WHITE, .07) };
    const mb = o.cn === 'lemon' ? mix(b, rgb('#f5c542'), .4) : o.cn === 'cream' ? mix(b, rgb('#f5c542'), .15) : b;   // pale yellows need a touch more depth
    return { ground: (u, v, f) => mix(a, b, f * .05), motif: () => mb };
  }

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
    star(a, b, dark, gold, o = {}) {   // puffy plush stars (+ tiny twinkles for night / gold; rainbow: pastel hues cycling)
      const n = 4, fz = felt(41, 1), RB = o.rainbow ? pal(a, b, o) : null, tw = dark ? rgb('#ffe9a8') : [1, 1, .96], G = gold ? rgb('#ffb21e') : b;
      return (u, v) => {
        const [x, y, k, id] = stag(u, v, n), r = (hash(id) - .5) * .5, cs = Math.cos(r), sn = Math.sin(r);
        const px = x * cs - y * sn, py = x * sn + y * cs;
        const d = (sdStar(px, py, .26, .5) - .02) / n;
        let h = puff(-d, .03) * .022 + fz(u, v) * .0008;
        let c = RB ? mix(RB.ground(u, v, fz(u, v)), RB.motif(stagP(u, v, n)[3]), sstep(.003, -.003, d)) : mix(mix(a, b, fz(u, v) * .05), gold ? G : dark ? mix(b, [1, 1, 1], .07) : b, sstep(.003, -.003, d));
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
    /* ---- b030 … b100 motifs (all take o = { dark, gold, rainbow, cn }) ---- */
    cloud(a, b, dark, gold, o) {   // little puffy clouds (lighter than the ground)
      const n = 3, fz = felt(91, 1), Gc = mix(a, b, .3), Cc = mix(mix(a, b, .12), WHITE, .62);
      const LB = [[-.17, .03, .1], [-.05, -.06, .135], [.11, -.03, .115], [.22, .05, .075]];
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), fl = hash(id) < .5 ? -1 : 1, x = x0 * fl + (hash(id + 1) - .5) * .08, y = y0 + (hash(id + 2) - .5) * .06;
        let d = sdBox(x - .02, y - .07, .25, .07, .06), dome = 0;
        for (const [lx, ly, r] of LB) { const q = len(x - lx, y - ly); d = smin(d, q - r, .05); dome = Math.max(dome, Math.sqrt(Math.max(0, 1 - (q / r) ** 2)) * r); }
        const f = fz(u, v), h = puff(-d / n, .028) * .016 + dome * .05 / n + f * .0008;
        return [h, ...mix(mix(Gc, a, f * .1), mix(Cc, WHITE, sstep(.05, -.12, y) * .25), sstep(.003, -.003, d / n))];
      };
    },
    bubble(a, b, dark, gold, o) {   // soft bubbles of mixed sizes with a highlight
      const n = 4, fz = felt(93, 1), P = pal(a, b, o), Hl = dark ? mix(b, WHITE, .55) : WHITE;
      const one = (x, y, R, id, c0) => {
        const q = len(x, y), d = q - R, m = sstep(.003, -.003, d / n);
        if (m <= 0) return null;
        const rim = sstep(.45, 1, q / R), C = mix(mix(c0, P.ground(0, 0, 0), dark ? .25 : .45), c0, rim);
        const hs = len(x + R * .38, y + R * .4) - R * .22, c = mix(C, Hl, sstep(.02, -.04, hs) * (dark ? .5 : .75));
        return [Math.sqrt(Math.max(0, 1 - (q / R) ** 2)) * R * .085 / n * 4, c, m];
      };
      return (u, v) => {
        const f = fz(u, v); let h = f * .0008, c = P.ground(u, v, f);
        const [x, y, k, id] = stagP(u, v, n), R = .11 + hash(id) * .12, s = .2 - R;
        const A = one(x - (hash(id + 1) - .5) * s, y - (hash(id + 2) - .5) * s, R, id, P.motif(id));
        const [x2, y2, k2, id2] = stagP(u + .5 / n, v, n), r2 = .035 + hash(id2 + 9) * .03;
        const B2 = hash(id2 + 7) > .35 ? one(x2, y2, r2, id2, P.motif(id2 + 3)) : null;
        for (const Z of [A, B2]) if (Z) { h = Math.max(h, Z[0] * Z[2]); c = mix(c, Z[1], Z[2]); }
        return [h, ...c];
      };
    },
    flower(a, b, dark, gold, o) {   // round-petalled puffy daisies with a domed centre
      const n = 4, fz = felt(95, 1), P = pal(a, b, o), CTR = dark ? rgb('#ffe2a0') : mix(b, rgb('#ffb347'), .5), CT2 = dark ? .55 : 1;
      return (u, v) => {
        const [x, y, k, id] = stagP(u, v, n), r0 = hash(id) * 1.3; let dmin = 9, hp = 0;
        for (let i = 0; i < 5; i++) {
          const an = r0 + i * Math.PI * 2 / 5, px = x - Math.cos(an) * .12, py = y - Math.sin(an) * .12, q = len(px, py), d = q - .085;
          dmin = Math.min(dmin, d); hp = Math.max(hp, puff(-d / n, .016) * .9 + Math.sqrt(Math.max(0, 1 - (q / .085) ** 2)) * .25);
        }
        const dc = len(x, y) - .065, f = fz(u, v);
        let h = hp * .016 + f * .0008, c = mix(P.ground(u, v, f), P.motif(id), sstep(.003, -.003, dmin / n));
        c = mix(c, mix(P.motif(id), WHITE, dark ? .05 : .25), sstep(-.01, -.07, dmin) * .5);   // lighter petal middles
        h = Math.max(h, puff(-dc / n, .01) * .022); c = mix(c, mix(P.motif(id), CTR, CT2 * (dark ? .6 : .55)), sstep(.003, -.003, dc / n));
        return [h, ...c];
      };
    },
    leaf(a, b, dark, gold, o) {   // soft lens leaves with a pressed midrib and a little stem
      const n = 4, fz = felt(97, 1), P = pal(a, b, o), VE = dark ? mix(b, WHITE, .2) : mix(b, a, .55);
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), [x, y] = rot(x0 * 1.15, y0 * 1.15, .7 + (hash(id) - .5) * 1.6 + (k ? Math.PI : 0));
        const dl = Math.max(len(x - .19, y) - .29, len(x + .19, y) - .29), ds = sdSeg(x, y, 0, .2, .025, .29) - .018;
        const d = Math.min(dl, ds), f = fz(u, v);
        const rib = Math.exp(-x * x / .0003) * sstep(.2, .1, Math.abs(y + .01)) * sstep(.01, -.02, dl);
        const h = puff(-dl / n, .025) * .018 + puff(-ds / n, .005) * .008 - rib * .003 + f * .0008;
        let c = mix(P.ground(u, v, f), P.motif(id), sstep(.003, -.003, d / n)); c = mix(c, VE, rib * .7);
        return [h, ...c];
      };
    },
    argyle(a, b, dark, gold, o) {   // quilted diamonds + thin raised stitch lines through their middles
      const fz = felt(99, 1), P = pal(a, b, o), gs = Math.hypot(5, 3), ST = dark ? mix(b, WHITE, .35) : WHITE;
      return (u, v) => {
        const S = 5 * u + 3 * v, Tt = 5 * u - 3 * v, x = fr(S) - .5, y = fr(Tt) - .5, odd = (Math.floor(S) + Math.floor(Tt)) & 1;
        const pil = Math.pow((1 - Math.pow(Math.abs(2 * x), 3)) * (1 - Math.pow(Math.abs(2 * y), 3)), .5), f = fz(u, v);
        let h = pil * (odd ? .016 : .012) + f * .0008;
        let c = odd ? (dark ? mix(b, WHITE, .05) : b) : mix(a, b, .3); c = mix(c, mix(a, b, .5), (1 - pil) * .25);
        const dsx = Math.min(Math.abs(x), Math.abs(y)) / gs - .0018, dash = sstep(-.2, .2, Math.sin((Math.abs(x) < Math.abs(y) ? Tt : S) * Math.PI * 12));
        const m = sstep(.0015, -.0015, dsx) * dash;
        h = Math.max(h, (pil * (odd ? .016 : .012)) + m * .0025); c = mix(c, ST, m * (dark ? .55 : .8));
        return [h, ...c];
      };
    },
    plaid(a, b, dark, gold, o) {   // soft tartan: raised woven bands crossing, twill texture
      const n = 3, NT = 72, fz = felt(101, 1);
      const AC = o.cn === 'forest' ? mix(b, rgb('#e2cf86'), .45) : o.cn === 'berry' ? mix(b, rgb('#ffc2e2'), .4) : mix(b, WHITE, .6);
      const band = t => { const x = fr(t); return [sstep(.19, .17, Math.abs(x - .5)), sstep(.022, .012, Math.min(Math.abs(x - .06), Math.abs(x - .94))), sstep(.06, .045, Math.abs(x - .5))]; };
      return (u, v) => {
        const [bx, ax, cx] = band(u * n), [by, ay, cy] = band(v * n), f = fz(u, v);
        const tw = ((Math.floor(u * NT) + Math.floor(v * NT)) & 3) < 2, up = tw ? 'x' : 'y';
        let c = mix(a, b, cl(.34 * bx + .34 * by)); c = mix(c, mix(b, dark ? [0, 0, 0] : rgb('#4a3050'), .12), cx * by * .5 + cy * bx * .5);
        const acc = Math.max(ax, ay); c = mix(c, AC, acc * .5);
        const tex = Math.sin((u + v) * NT * Math.PI) * .5 + .5;
        const hb = Math.max(bx * (up === 'x' ? 1 : .7), by * (up === 'y' ? 1 : .7));
        const h = hb * .007 + acc * .002 + tex * .0006 + f * .0006;
        return [h, ...mix(c, mix(c, WHITE, dark ? .05 : .15), tex * .25)];
      };
    },
    scale(a, b, dark, gold, o) {   // fish-scale arcs, lower rows overlapping upper ones
      const n = 5, R = .62, fz = felt(103, 1), P = pal(a, b, o);
      return (u, v) => {
        const X = u * n, Y = v * n * 2; let best = null;
        const j0 = Math.floor(Y);
        for (let j = j0 + 2; j >= j0 - 2 && !best; j--) {
          const off = (j & 1) ? .5 : 0, cy = j * .5, ix = Math.round(X - off), cxs = [ix + off - 1, ix + off, ix + off + 1];
          for (const cx of cxs) { const q = len(X - cx, Y * .5 - cy); if (q < R) { if (!best || q < best[0]) best = [q, cx, cy]; } }
        }
        const f = fz(u, v); if (!best) return [f * .0008, ...P.ground(u, v, f)];
        const [q, cx, cy] = best, t = (R - q) / n;
        const h = puff(t, .02) * .014 + f * .0008;
        const M0 = P.motif(Math.round(cx * 7 + cy * 13));
        return [h, ...mix(M0, mix(M0, P.ground(u, v, f), .5), sstep(.02, .07, t))];
      };
    },
    moon(a, b, dark, gold, o) {   // puffy crescents + tiny dots
      const n = 4, fz = felt(105, 1), P = pal(a, b, o), MC = dark ? mix(b, rgb('#ffe6a6'), .5) : b, DT = dark ? rgb('#ffe9a8') : WHITE;
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), [x, y] = rot(x0, y0, (hash(id) - .5) * 1.2);
        const d = Math.max(len(x, y) - .22, -(len(x - .11, y + .08) - .19)), f = fz(u, v);
        let h = puff(-d / n, .022) * .02 + f * .0008, c = mix(P.ground(u, v, f), MC, sstep(.003, -.003, d / n));
        const [tx, ty, tk, tid] = stagP(u + .5 / n, v, n), td = len(tx - (hash(tid) - .5) * .2, ty) - .028;
        const m = sstep(.01, -.01, td); c = mix(c, DT, m * (dark ? .6 : .8)); h = Math.max(h, puff(-td / n, .006) * .007);
        return [h, ...c];
      };
    },
    dice(a, b, dark, gold, o) {   // tilted soft dice with pressed pips
      const n = 3, fz = felt(107, 1), P = pal(a, b, o);
      const DC = gold ? rgb('#fff8e2') : dark ? mix(b, WHITE, .14) : o.cn === 'cream' ? mix(b, rgb('#f5c542'), .2) : mix(b, WHITE, .2), PC = gold ? rgb('#e3a21e') : dark ? mix(a, [0, 0, 0], .1) : mix(b, rgb('#5a5a8a'), .35);
      const PIPS = [[], [[0, 0]], [[-1, -1], [1, 1]], [[-1, -1], [0, 0], [1, 1]], [[-1, -1], [1, -1], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]];
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), [x, y] = rot(x0, y0, (hash(id) - .5) * 1.1), f = fz(u, v);
        const d = sdBox(x, y, .14, .14, .055), face = 1 + Math.floor(hash(id + 4) * 6) % 6;
        let pd = 9; for (const [px, py] of PIPS[face]) pd = Math.min(pd, len(x - px * .075, y - py * .075) - .026);
        const pm = sstep(.004, -.004, pd);
        const h = puff(-d / n, .03) * .022 - pm * .0035 + f * .0008;
        let c = mix(P.ground(u, v, f), DC, sstep(.003, -.003, d / n)); c = mix(c, PC, pm * .75);
        return [h, ...c];
      };
    },
    chess(a, b, dark, gold, o) {   // chess silhouettes in relief: pawn / rook / knight / king
      const n = 3, fz = felt(109, 1), P = pal(a, b, o);
      const base = (x, y) => sdBox(x, y - .165, .115, .035, .025);
      const SH = [
        (x, y) => smin(smin(len(x, y + .1) - .065, sdTri(x, y, -.085, .14, .085, .14, 0, -.06), .03), base(x, y), .02),                        // pawn
        (x, y) => smin(Math.max(sdBox(x, y + .12, .095, .055, .015), -sdBox(x, y + .175, .018, .04, .005)), smin(sdBox(x, y - .02, .07, .12, .02), base(x, y), .02), .02),   // rook
        (x, y) => {                                                                                                                       // knight
          const [nx, ny] = rot(x - .015, y - .02, -.32), [hx, hy] = rot(x + .035, y + .1, .55);
          let d = smin(sdBox(nx, ny, .06, .12, .04), sdBox(hx, hy, .11, .05, .04), .03);
          d = smin(d, sdTri(x, y, .0, -.13, .06, -.13, .045, -.22) - .01, .02);
          return smin(d, base(x, y), .02);
        },
        (x, y) => { let d = smin(sdTri(x, y, -.095, .14, .095, .14, 0, -.06), len(x, y + .05) - .075, .03);                                // king
          d = smin(d, Math.min(sdBox(x, y + .175, .014, .055, .006), sdBox(x, y + .18, .045, .014, .006)), .015); return smin(d, base(x, y), .02); },
      ];
      return (u, v) => {
        const [x, y, k, id, ix, iy] = stagP(u, v, n), d = SH[(ix + 2 * k + iy * 3) & 3](x * .88, y * .88) / .88, f = fz(u, v);
        const h = puff(-d / n, .016) * .018 + f * .0008;
        return [h, ...mix(P.ground(u, v, f), P.motif(id), sstep(.003, -.003, d / n))];
      };
    },
    cards(a, b, dark, gold, o) {   // card suits ♥ ♦ ♣ ♠ in relief
      const n = 3, fz = felt(111, 1), P = pal(a, b, o);
      const RED = gold ? rgb('#fff0dc') : dark ? mix(b, rgb('#ff9ab4'), .3) : mix(b, rgb('#ff6f8e'), .3), BLK = gold ? rgb('#fffaf0') : dark ? mix(b, WHITE, .1) : mix(b, rgb('#56507a'), .3);
      const SU = [
        (x, y) => sdHeart(x * 5.4, -y * 5.4 + .55) / 5.4 - .01,
        (x, y) => (Math.abs(x) / .13 + Math.abs(y) / .19 - 1) * .075 - .006,
        (x, y) => { let d = Math.min(len(x, y + .075) - .068, len(x - .075, y + .01) - .068, len(x + .075, y + .01) - .068);
          d = smin(d, sdBox(x, y, .03, .05, .01), .02); return smin(d, sdTri(x, y, -.06, .17, .06, .17, 0, .04), .015); },
        (x, y) => smin(sdHeart(x * 5.6, y * 5.6 + .6) / 5.6 - .006, sdTri(x, y, -.06, .18, .06, .18, 0, .05), .015),
      ];
      return (u, v) => {
        const [x0, y0, k, id, ix, iy] = stagP(u, v, n), s = (ix + 2 * k + iy * 3) & 3, [x, y] = rot(x0 * .85, y0 * .85, (hash(id) - .5) * .5), f = fz(u, v);
        const d = SU[s](x, y) / .85, h = puff(-d / n, .02) * .02 + f * .0008;
        return [h, ...mix(P.ground(u, v, f), s < 2 ? RED : BLK, sstep(.003, -.003, d / n))];
      };
    },
    stones(a, b, dark, gold, o) {   // go stones scattered on the ground (soft black / white domes)
      const n = 4, fz = felt(113, 1), wood = o.cn === 'wood', g1 = pnoise(21, 6), g2 = pnoise(25, 160);
      const WS = dark ? rgb('#c9cde0') : rgb('#fbfaf6'), BS = dark ? rgb('#171c30') : rgb('#6b6878'), R = .15;
      return (u, v) => {
        const f = fz(u, v); let c, h;
        if (wood) { const ring = Math.sin((v * 8 + g1(u, v) * 2.2) * Math.PI * 2) * .5 + .5, gr = Math.pow(ring, 3) * .5 + g2(u, v) * .5; c = mix(a, b, gr * .25); h = gr * .0012; }
        else { c = mix(a, b, (dark ? .15 : .25) + f * .05); h = f * .0008; }
        const [x, y, k, id] = stagP(u, v, n);
        if (hash(id + 3) < .25) return [h, ...c];
        const ox = (hash(id + 1) - .5) * .12, oy = (hash(id + 2) - .5) * .12, q = len(x - ox, y - oy), d = q - R, white = hash(id + 5) < .5;
        const m = sstep(.003, -.003, d / n), dome = Math.sqrt(Math.max(0, 1 - (q / R) ** 2));
        let sc = white ? WS : BS; const hl = len(x - ox + R * .35, y - oy + R * .38) - R * .3;
        sc = mix(sc, white ? WHITE : mix(BS, WHITE, .3), sstep(.04, -.06, hl) * (white ? .6 : .7)); if (!white && !dark) sc = mix(sc, c, .12);
        return [Math.max(h, dome * R * .1 / n * 4 * m), ...mix(c, sc, m)];
      };
    },
    shogi(a, b, dark, gold, o) {   // pentagon shogi pieces in relief on soft grain (no text)
      const n = 3, g1 = pnoise(21, 6), g2 = pnoise(23, 48), g3 = pnoise(25, 160);
      const PC = mix(a, rgb(o.cn === 'cocoa' ? '#fff6ec' : '#fff4d8'), .55), ED = mix(a, b, .5);
      const pent = (x, y) => { const ax = Math.abs(x);   // point up, slightly tapering sides
        return Math.max(y - .17, (ax - .15) * .993 - (y - .17) * .119, (ax - .12) * .707 - (y + .08) * .707); };
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), [x, y] = rot(x0 * 1.15, y0 * 1.15, (hash(id) - .5) * .6);
        const ring = Math.sin((v * 8 + g1(u, v) * 2.2) * Math.PI * 2) * .5 + .5, grain = Math.pow(ring, 3) * .5 + g2(u, v * 3 % 1) * .2 + g3(u, v) * .3;
        const d = pent(x, y) - .012;
        let h = puff(-d / n, .014) * .018 + grain * .0012;
        let c = mix(mix(a, b, .22 + grain * .2), mix(PC, ED, grain * .18), sstep(.003, -.003, d / n));
        const inner = sstep(.002, -.002, (d + .03) / n) ; c = mix(c, mix(PC, WHITE, .2), inner * .35);
        return [h, ...c];
      };
    },
    candy(a, b, dark, gold, o) {   // wrapped candies with striped bodies and twisted ends
      const n = 3, fz = felt(115, 1), P = pal(a, b, o), WR = dark ? mix(b, WHITE, .16) : mix(P.motif(0), WHITE, .5), BC = dark ? mix(b, rgb('#ff9fd0'), .25) : P.motif(0), SC = dark ? mix(b, WHITE, .2) : mix(b, WHITE, .55);
      return (u, v) => {
        const [x0, y0, k, id] = stagP(u, v, n), [x, y] = rot(x0, y0, .5 + (hash(id) - .5) * 1.2 + (k ? 1.2 : 0)), f = fz(u, v);
        const db = (len(x / .125, y / .085) - 1) * .085;
        const ax = Math.abs(x), de = sdTri(ax, y, .1, 0, .235, -.085, .235, .085) - .01;
        const pleat = Math.cos(Math.atan2(y, ax - .1) * 9) * .5 + .5;
        const mb = sstep(.003, -.003, db / n), me = sstep(.003, -.003, de / n) * (1 - mb);
        let c = P.ground(u, v, f); c = mix(c, mix(WR, mix(WR, [0, 0, 0], .06), pleat * .5), me);
        const st = sstep(-.15, .15, Math.sin((x + y * .6) * Math.PI * 2 / .085));
        c = mix(c, mix(BC, SC, st * .55), mb);
        const h = Math.max(puff(-db / n, .02) * .02, puff(-de / n, .012) * (.009 + pleat * .002)) + f * .0008;
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

  const DARK = { night: 1, forest: 1, ocean: 1, berry: 1 };   // dark grounds (white text on top)
  function buildTile(pat, cn) {
    const [A, B] = COL[cn], dark = DARK[cn] || false, gold = cn === 'gold';
    const scene = new T.Scene();
    lights(scene, dark ? { sky: 0xf4f2ff, hemi: .62, keyI: .44 } : {});
    const fn = PAT[pat](rgb(A), rgb(B), dark, gold, { dark, gold, rainbow: cn === 'rainbow', cn });
    const aoTint = cn === 'night' ? rgb('#141a30') : dark ? mix(rgb(A), [0, 0, 0], .55) : gold ? rgb('#b8741a') : pat === 'goban' || pat === 'pip' || pat === 'shogi' || (pat === 'stones' && cn === 'wood') ? rgb('#8a5a2a') : mix(rgb(B), [.3, .25, .4], .55);
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

  // cover scenes beyond the two original skies live in atlas/bg3d-covers.js: window.BG3D_COVERS[pattern](colourName, COL) → { scene, camera, size: 512, mode: 'cover' }
  const COVER_PAT = { sky: 1, meadow: 1, sea: 1, snowscape: 1, toytown: 1, space: 1 };
  function build(id) {
    const d = IDS[id] || IDS.b001, X = window.BG3D_COVERS;
    if (d[0] === 'sky' && (d[1] === 'sunset' || d[1] === 'night')) return buildSky(d[1]);
    if (COVER_PAT[d[0]]) return X[d[0]](d[1], COL);
    return buildTile(d[0], d[1]);
  }
  window.BG3D = { build, ids: Object.keys(IDS), def: id => IDS[id], COL, COVER_PAT, KIT: { soft, blob, mesh, M, cloud: (...a) => cloud(...a), puffyStar: (...a) => puffyStar(...a), gradTex: (...a) => gradTex(...a), glowTex: (...a) => glowTex(...a) } };
})();
