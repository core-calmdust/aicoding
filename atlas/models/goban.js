/* =====================================================================
   Go board (碁盤) on the 3D table — a generic model for every game played
   on the intersections of a grid (gomoku / renju now, go later).
   A thick legged board (足付き碁盤): the top is golden kaya with a fine
   straight grain (柾目) and a crisp lacquer-black grid with star points (星);
   the legs are the traditional gardenia-fruit shape (くちなしの実).
   Two looks:
     'lacquer'  black urushi sides with gold 沈金 landscapes in a cusped
                cartouche (pagoda, halls, pines, bridge, moon, mist, waves),
                a different scene on each side; black lacquered legs
     'kaya'     all natural kaya: dramatic flame grain on the sides, kaya legs
   Stones: slate black (那智黒, soft sheen) and clam-shell white (蛤) with fine
   growth stripes, a proper double-convex shape. Bowls (碁笥): turned mulberry
   with domed lids. Everything is procedural (canvas textures + lathes).
   Registers into Table3D:
     Table3D.goban.board({ n: 15|19|…, look, W })  → Group
        userData: { n, cell, W, top, S (= (n+1) cells: the DOM board of the games),
                    outer (= W / S), pt(i, j) → [x, z]  (i: column left→right, j: row top→bottom),
                    setLook(look), look }
     Table3D.goban.stone(color 1 black | 2 white, cell)   → Mesh (base at y = 0)
     Table3D.goban.bowl(color, cell, { stones })         → Group (+ userData.lid: the lid, separate)
     Table3D.MODELS.gomoku(live, o)   15 × 15 board (+ a mid-game position and both bowls unless live)
     Table3D.MODELS.go(live, o)       go board, o.n = 5 … 19 lines (default 19; + an opening and both bowls unless live).
                                      Same outer size for every n (W): a 9 × 9 board simply has larger cells.
   ===================================================================== */
(function () {
  'use strict';
  const X = window.Table3D; if (!X) return;
  const T = () => window.THREE;
  const { M, RB, makeNoise } = X;
  const TAU = Math.PI * 2;
  const rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  /* ---------- canvases / textures (cached: every board shares them) ---------- */
  const cv = {}, tx = {};
  function canvas(key, W, H, draw) {
    if (cv[key]) return cv[key];
    const c = document.createElement('canvas'); c.width = W; c.height = H; draw(c.getContext('2d'), W, H, c); return (cv[key] = c);
  }
  function tex(key, c, srgb = true, wrap = false) {
    if (tx[key]) return tx[key];
    const TT = T(), t = new TT.CanvasTexture(c); t.anisotropy = 8; if (srgb) t.encoding = TT.sRGBEncoding;
    if (wrap) t.wrapS = t.wrapT = TT.RepeatWrapping;
    return (tx[key] = t);
  }
  // a small value-noise grid sampled bilinearly (much cheaper than fbm per pixel)
  function grid(seed, gw, gh, sc = 1, oct = 3) {
    const N = makeNoise(seed), a = new Float32Array((gw + 1) * (gh + 1));
    for (let y = 0; y <= gh; y++) for (let x = 0; x <= gw; x++) a[y * (gw + 1) + x] = N(x * sc, y * sc, oct);
    return (u, v) => {   // u, v in 0..1
      const fx = Math.max(0, Math.min(gw - 1e-4, u * gw)), fy = Math.max(0, Math.min(gh - 1e-4, v * gh)), x = fx | 0, y = fy | 0, s0 = fx - x, t0 = fy - y, s = s0 * s0 * (3 - 2 * s0), t = t0 * t0 * (3 - 2 * t0), i = y * (gw + 1) + x;
      return (a[i] * (1 - s) + a[i + 1] * s) * (1 - t) + (a[i + gw + 1] * (1 - s) + a[i + gw + 2] * s) * t;
    };
  }

  /* ---------- kaya, straight grain (柾目): fine parallel growth rings along the board's depth ---------- */
  const KAYA = { L: [234, 168, 56], D: [158, 92, 20] };
  function kayaGrain(key, W, H, seed, o = {}) {
    return canvas(key, W, H, (g) => {
      const R = rnd(seed), img = g.createImageData(W, H), d = img.data;
      const RES = 4, len = (W + 64) * RES, prof = new Float32Array(len), tone = new Float32Array(len);
      // ring profile across the width: spacing drifts (narrow / wide years), each ring with its own strength
      const nd = grid(seed + 1, 60, 1, .9, 3), nt = grid(seed + 2, 14, 1, .7, 3);
      let ph = 0, ringK = 1;
      const sp = (o.ring || W / 230) * RES, lw = o.lw || .055;
      for (let i = 0; i < len; i++) {
        const u = i / len;
        ph += 1 / (sp * (.5 + nd(u, 0) * 1.15));
        if (ph >= 1) { ph -= 1; ringK = .5 + R() * .65; if (R() < .1) ringK = 1.35; }
        const late = Math.exp(-Math.pow((ph - .84) / lw, 2)) + .28 * Math.exp(-Math.pow((ph - .72) / .14, 2));
        prof[i] = late * ringK;
        tone[i] = (nt(u, 0) - .5) * 1.5;
      }
      const wob = grid(seed + 3, 6, 4, .8, 3), fib = grid(seed + 4, 400, 5, 1, 1), sheen = grid(seed + 5, 4, 6, .5, 3);
      const A = KAYA.L, B = KAYA.D, amp = o.wob ?? 3;
      for (let y = 0; y < H; y++) {
        const v = y / H;
        for (let x = 0; x < W; x++) {
          const u = x / W;
          const xs = (x + 32 + (wob(u, v) - .5) * amp * 2) * RES, i0 = Math.max(0, Math.min(len - 2, xs | 0)), f = xs - i0;
          const pr = prof[i0] * (1 - f) + prof[i0 + 1] * f, tn = tone[i0];
          let t = .16 + pr * .3 + tn * .16 + (fib(u, v) - .5) * .1 + (sheen(u, v) - .5) * .22 + (R() - .5) * .04;
          t = Math.max(0, Math.min(1, t));
          const k = (y * W + x) * 4;
          d[k] = A[0] + (B[0] - A[0]) * t; d[k + 1] = A[1] + (B[1] - A[1]) * t; d[k + 2] = A[2] + (B[2] - A[2]) * t; d[k + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    });
  }
  // kaya sides of the natural board. Long faces: flat-sawn flame grain (板目) — nested flames rising from the base, many fine
  // growth rings with sharp darker latewood, darker where the rings crowd. Short faces (end = true): end grain (木口) — arcs of rings
  // around a pith below the face, faint rays. A second canvas holds roughness (G) for the chatoyant sheen bands.
  function kayaSide(key, W, H, seed, end) {
    if (cv[key]) return cv[key];
    const R = rnd(seed), img = new ImageData(W, H), d = img.data, rough = new ImageData(W, H), q = rough.data;
    const w1 = grid(seed + 1, 7, 4, .8, 3), w2 = grid(seed + 2, 28, 12, 1, 2), fib = grid(seed + 3, 420, 10, 1, 1), tn = grid(seed + 4, 9, 4, .7, 3), ch = grid(seed + 5, 40, 3, 1, 2);
    const E = [240, 190, 92], Lw = [178, 104, 30], Dk = [128, 70, 18], asp = H / W;
    const centres = [], nC = 2 + (R() * 2 | 0); for (let i = 0; i < nC; i++) centres.push((i + .3 + R() * .4) / nC);
    const RINGS = end ? 44 : 36, px = .3 + R() * .4, py = 1.25 + R() * .5;
    for (let y = 0; y < H; y++) {
      const v = y / H;
      for (let x = 0; x < W; x++) {
        const u = x / W, wa = (w1(u, v) - .5), wb = (w2(u, v) - .5);
        let f, crowd;
        if (end) {   // rings around the pith (off the face, below), irregular widths
          const dx = (u - px + wa * .08), dy = (v - py) * asp;
          f = Math.sqrt(dx * dx + dy * dy) * 1.6 + wb * .03 + wa * .02; crowd = .25 + wa * .5;
        } else {     // rounded flame tongues: a soft minimum of parabolas around each axis, narrowing upwards
          const uu = u + wa * .12 + wb * .02;
          let acc = 0; for (const c of centres) { const g2 = (uu - c) * (uu - c); acc += Math.exp(-g2 * 160); }
          const g = Math.sqrt(Math.max(0, -Math.log(acc + 1e-6)) / 160);
          f = g * g * 9 + g * .5 + (1 - v) * .42 * (1 + wa * .5) + wb * .03; crowd = Math.max(0, 1 - g * 5) * .55 + Math.max(0, wa) * .6;
        }
        const s = f * RINGS * (1 + (tn(u * .7, v) - .5) * .25), ph = s - Math.floor(s), id = Math.floor(s);
        const rk = .55 + (((Math.sin(id * 12.9898 + seed * 3.1) * 43758.5453) % 1 + 1) % 1) * .75;
        // each ring: light earlywood darkening into latewood, then a sharp edge to the next year
        const late = (Math.pow(ph, 4) * .9 + Math.exp(-Math.pow((ph - .93) / .035, 2)) * .6) * rk;
        const ray = end ? Math.max(0, Math.sin((Math.atan2(v - py, u - px) * 90 + wb * 6)) - .97) * 6 : 0;
        let t = .05 + late * (.44 + crowd * .32) + crowd * .24 + (fib(u, v) - .5) * .1 + (tn(u, v) - .5) * .26 + ray * .15 + (R() - .5) * .035;
        t = Math.max(0, Math.min(1.3, t));
        const i = (y * W + x) * 4, P = t <= 1 ? Lw : Dk, tt = t <= 1 ? t : (t - 1) / .3;
        const A0 = t <= 1 ? E : Lw;
        d[i] = A0[0] + (P[0] - A0[0]) * tt; d[i + 1] = A0[1] + (P[1] - A0[1]) * tt; d[i + 2] = A0[2] + (P[2] - A0[2]) * tt; d[i + 3] = 255;
        // chatoyance: soft bands across the grain where the fibres catch the light, latewood a little duller
        const sh = ch(u, v);
        q[i] = 255; q[i + 1] = Math.max(0, Math.min(255, (.3 + (sh - .5) * .5 + late * .12) * 255)); q[i + 2] = 0; q[i + 3] = 255;
      }
    }
    const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').putImageData(img, 0, 0);
    const r = document.createElement('canvas'); r.width = W; r.height = H; r.getContext('2d').putImageData(rough, 0, 0);
    cv[key + 'R'] = r; return (cv[key] = c);
  }

  /* ---------- the playing surface: kaya + lacquer grid lines + star points ---------- */
  function stars(n) {
    if (n === 19) return [3, 9, 15].flatMap(a => [3, 9, 15].map(b => [a, b]));
    if (n === 13) return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
    if (n === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
    if (n === 15) { const a = 3, b = n - 4, c = (n - 1) / 2; return [[a, a], [b, a], [c, c], [a, b], [b, b]]; }   // 15: the gomoku board
    // other go boards (5 … 18): the same points as the go page (go/rules.js starPoints)
    if (n < 7) return n === 5 ? [[2, 2]] : [];
    const e = n >= 13 ? 3 : 2, b = n - 1 - e, m = (n - 1) >> 1, s = [[e, e], [b, e], [e, b], [b, b]];
    if (n % 2) { s.push([m, m]); if (n >= 15) s.push([e, m], [b, m], [m, e], [m, b]); }
    return s;
  }
  function topCanvas(n, margin) {
    const span = n - 1 + 2 * margin;
    return canvas('gbTop' + n, 2048, 2048, (g, W) => {
      g.imageSmoothingQuality = 'high';
      g.save(); g.translate(W, 0); g.rotate(Math.PI / 2); g.drawImage(kayaGrain('kayaTop', 2048, 2048, 11), 0, 0, W, W); g.restore();   // the grain runs left → right
      const c = W / span, p = i => (margin + i) * c;
      g.strokeStyle = 'rgba(20,13,6,.93)'; g.lineCap = 'square';
      for (let i = 0; i < n; i++) {
        const edge = i === 0 || i === n - 1; g.lineWidth = c * (edge ? .055 : .042);
        g.beginPath(); g.moveTo(p(i), p(0)); g.lineTo(p(i), p(n - 1)); g.stroke();
        g.beginPath(); g.moveTo(p(0), p(i)); g.lineTo(p(n - 1), p(i)); g.stroke();
      }
      g.fillStyle = 'rgba(20,13,6,.95)';
      stars(n).forEach(([a, b]) => { g.beginPath(); g.arc(p(a), p(b), c * .088, 0, TAU); g.fill(); });
    });
  }
  function topBump(n, margin) {   // the lacquer lines are raised a hair (太刀盛り)
    const span = n - 1 + 2 * margin;
    return canvas('gbTopB' + n, 1024, 1024, (g, W) => {
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
      const c = W / span, p = i => (margin + i) * c;
      g.strokeStyle = '#fff'; g.lineWidth = c * .05;
      for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(p(i), p(0)); g.lineTo(p(i), p(n - 1)); g.stroke(); g.beginPath(); g.moveTo(p(0), p(i)); g.lineTo(p(n - 1), p(i)); g.stroke(); }
      g.fillStyle = '#fff'; stars(n).forEach(([a, b]) => { g.beginPath(); g.arc(p(a), p(b), c * .09, 0, TAU); g.fill(); });
    });
  }

  /* ---------- 沈金: gold hairline landscapes on black urushi ---------- */
  const GOLD = '#efcd72', PALE = '#f7e3a4', DEEP = '#c9a04a', MOSS = '#bcc77a', JADE = '#8fbf8e', BLUE = '#8fb1c4';
  function art(side, W, H) {
    return canvas('gbArt' + side, W, H, (g) => {
      const R = rnd(101 + side * 37);
      // urushi: deep black with the faintest warm depth
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#120d0a'); bg.addColorStop(.5, '#0b0807'); bg.addColorStop(1, '#0e0a08');
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const ln = (pts, col = GOLD, w = 2.2, a = 1) => { g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w * 1.5; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.globalAlpha = 1; };
      const hatch = (path, ang, gap, col = GOLD, w = 1.6, a = .9) => {   // fill a shape with fine parallel engraved lines
        g.save(); path(); g.clip(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w;
        const c = Math.cos(ang), s = Math.sin(ang), L = W + H;
        for (let k = -L; k < L; k += gap) { g.beginPath(); g.moveTo(W / 2 + c * -L - s * k, H / 2 + s * -L + c * k); g.lineTo(W / 2 + c * L - s * k, H / 2 + s * L + c * k); g.stroke(); }
        g.restore(); g.globalAlpha = 1;
      };
      // the cusped cartouche (隅入り, with bulging ends) — a double line: bold + hairline
      const fx0 = W * .045, fx1 = W * .955, fy0 = H * .1, fy1 = H * .9, a = H * .075, bul = W * .022;
      const frame = (ins) => {
        const x0 = fx0 + ins, x1 = fx1 - ins, y0 = fy0 + ins, y1 = fy1 - ins, aa = a - ins * .3;
        g.beginPath(); g.moveTo(x0 + aa, y0); g.lineTo(x1 - aa, y0);
        g.arc(x1, y0, aa, Math.PI, Math.PI / 2, true);
        g.quadraticCurveTo(x1 + bul * 2, (y0 + y1) / 2, x1, y1 - aa);
        g.arc(x1, y1, aa, -Math.PI / 2, Math.PI, true);
        g.lineTo(x0 + aa, y1);
        g.arc(x0, y1, aa, 0, -Math.PI / 2, true);
        g.quadraticCurveTo(x0 - bul * 2, (y0 + y1) / 2, x0, y0 + aa);
        g.arc(x0, y0, aa, Math.PI / 2, 0, true);
        g.closePath();
      };
      g.strokeStyle = GOLD; g.lineWidth = 3.4; frame(0); g.stroke();
      g.strokeStyle = DEEP; g.lineWidth = 1.3; frame(9); g.stroke();
      g.save(); frame(12); g.clip();
      const GY = H * .7;   // ground / water line
      // ---- motifs
      const water = (x0, x1, y, n = 6, gap = 9) => { for (let i = 0; i < n; i++) { const yy = y + i * gap, xa = x0 + R() * 40 + i * 14, xb = x1 - R() * 60 - i * 22; for (let x = xa; x < xb;) { const l = 30 + R() * 120; ln([[x, yy], [Math.min(xb, x + l), yy + (R() - .5) * 1.5]], i ? DEEP : GOLD, i ? 1.4 : 2, .55 + .4 * (1 - i / n)); x += l + 8 + R() * 30; } } };
      const shore = (pts) => { ln(pts, GOLD, 2.2); };
      const mist = (x, y, w, h) => {   // すやり霞: flat cloud bands — level hairlines with rounded ends
        for (let k = 0; k < 3; k++) { const yy = y + k * h * .38, x0 = x + k * w * .08, x1 = x + w - k * w * .12; ln([[x0, yy], [x1, yy]], k ? DEEP : PALE, k ? 1.2 : 1.8, .85); g.strokeStyle = GOLD; g.lineWidth = 1.6; g.beginPath(); g.arc(x0, yy + h * .19, h * .19, Math.PI * .5, Math.PI * 1.5); g.stroke(); }
      };
      const pad = (cx, cy, w, h, col, dens = 1) => {   // a cloud-like pad of foliage: fine short strokes, a pale upper rim
        const p = () => { g.beginPath(); g.moveTo(cx - w / 2, cy); g.bezierCurveTo(cx - w * .45, cy - h * 1.1, cx + w * .45, cy - h * 1.1, cx + w / 2, cy); g.quadraticCurveTo(cx, cy + h * .25, cx - w / 2, cy); g.closePath(); };
        g.fillStyle = '#0b0807'; p(); g.fill();
        g.save(); p(); g.clip(); g.strokeStyle = col; g.lineWidth = 1.5;
        const n = Math.round(w * h * .05 * dens);
        for (let k = 0; k < n; k++) { const xx = cx - w / 2 + R() * w, yy = cy - h + R() * h * 1.1, l = 3 + R() * 5; g.globalAlpha = .55 + R() * .45; g.beginPath(); g.moveTo(xx, yy); g.lineTo(xx + (R() - .5) * 2, yy + l); g.stroke(); }
        g.restore(); g.globalAlpha = 1;
        g.strokeStyle = PALE; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx - w / 2, cy); g.bezierCurveTo(cx - w * .45, cy - h * 1.1, cx + w * .45, cy - h * 1.1, cx + w / 2, cy); g.stroke();
      };
      const conifer = (x, y, h, col = MOSS) => {   // a tall tree: a thin trunk and three or four stacked crowns
        ln([[x, y], [x + (R() - .5) * 4, y - h * .9]], DEEP, 1.6);
        const n = 3 + (R() < .5 ? 1 : 0);
        for (let k = 0; k < n; k++) { const w = h * (.5 - k * .09), yy = y - h * (.22 + k * .2); pad(x + (R() - .5) * h * .06, yy, w, h * .2, col); }
      };
      const roundTree = (x, y, s, col = JADE) => {   // a broad leafy tree: a cluster of pads
        ln([[x, y], [x + s * .04, y - s * .5]], DEEP, 1.8); ln([[x + s * .02, y - s * .35], [x - s * .14, y - s * .55]], DEEP, 1.3);
        pad(x - s * .17, y - s * .48, s * .42, s * .2, col); pad(x + s * .18, y - s * .5, s * .4, s * .19, col); pad(x, y - s * .68, s * .5, s * .24, col);
      };
      const pine = (x, y, s, flip = 1) => {   // a gnarled pine: a bent trunk and level pads of needles
        const tr = [[x, y], [x + flip * s * .08, y - s * .3], [x - flip * s * .05, y - s * .55], [x + flip * s * .12, y - s * .8], [x + flip * s * .2, y - s * .95]];
        ln(tr, GOLD, 3.2); ln(tr.map(([a, b]) => [a + 3.5, b]), DEEP, 1.3);
        for (let k = 0; k < 6; k++) { const [a1, b1] = tr[1 + (k % 3)]; ln([[a1 - 3, b1 + k * 3], [a1 + 3, b1 + k * 3 + 4]], DEEP, 1.1, .7); }   // bark
        [[.36, .98, .44], [-.22, .74, .38], [.4, .64, .34], [-.04, .48, .3], [.2, .84, .3]].forEach(([dx, dy, w]) => {
          const cx = x + flip * s * dx, cy = y - s * dy;
          ln([[x + flip * s * dx * .3, y - s * dy * .92], [cx, cy]], GOLD, 1.8);
          pad(cx, cy, s * w, s * .1, MOSS, 1.4);
        });
      };
      const roof = (x, y, w, h, up = .25, col = GOLD) => {   // a curved roof with up-turned eaves, hatched
        const p = () => { g.beginPath(); g.moveTo(x - w / 2, y - h * up); g.quadraticCurveTo(x - w * .32, y + h * .05, x - w * .2, y - h * .15); g.lineTo(x - w * .08, y - h); g.lineTo(x + w * .08, y - h); g.lineTo(x + w * .2, y - h * .15); g.quadraticCurveTo(x + w * .32, y + h * .05, x + w / 2, y - h * up); g.quadraticCurveTo(x + w * .3, y + h * .14, x, y + h * .12); g.quadraticCurveTo(x - w * .3, y + h * .14, x - w / 2, y - h * up); g.closePath(); };
        hatch(p, Math.PI / 2, 4.5, col, 1.4, .9); g.strokeStyle = PALE; g.lineWidth = 2; p(); g.stroke();
      };
      const pagoda = (x, y, h) => {   // 五重塔
        const tiers = 5, th = h * .13;
        let yy = y;
        ln([[x - h * .2, y], [x + h * .2, y]], GOLD, 2.4);
        for (let i = 0; i < tiers; i++) {
          const w = h * (.42 - i * .035), bw = w * .5;
          for (let k = -2; k <= 2; k++) ln([[x + k * bw / 5, yy], [x + k * bw / 5, yy - th * .42]], DEEP, 1.3);
          ln([[x - bw / 2, yy], [x - bw / 2, yy - th * .42]], GOLD, 1.6); ln([[x + bw / 2, yy], [x + bw / 2, yy - th * .42]], GOLD, 1.6);
          roof(x, yy - th * .42, w, th * .6, .3);
          yy -= th;
        }
        ln([[x, yy + th * .3], [x, yy - h * .3]], GOLD, 2.2);   // 相輪 (the spire) with its nine rings
        for (let k = 0; k < 9; k++) { const q = yy - h * .02 - k * h * .028, w = h * (.035 - k * .0015); ln([[x - w, q], [x + w, q]], PALE, 1.5); }
        g.fillStyle = PALE; g.beginPath(); g.arc(x, yy - h * .32, 3, 0, TAU); g.fill();
      };
      const hall = (x, y, w, h, blue) => {   // a temple hall: a great hipped-gable roof over pillars on a platform
        ln([[x - w * .55, y], [x + w * .55, y]], GOLD, 2.4); ln([[x - w * .5, y - 6], [x + w * .5, y - 6]], DEEP, 1.4);
        for (let k = -4; k <= 4; k++) ln([[x + k * w * .1, y - 6], [x + k * w * .1, y - h * .42]], GOLD, 1.8);
        hatch(() => { g.beginPath(); g.rect(x - w * .42, y - h * .42, w * .84, h * .2); }, Math.PI / 2, 6, blue ? BLUE : DEEP, 1.2, .7);
        roof(x, y - h * .42, w * 1.35, h * .5, .2, blue ? BLUE : GOLD);
        // the gable (入母屋) triangle with its crossed boards
        const gx = x + w * .05, gy = y - h * .72;
        ln([[gx - w * .14, gy + h * .14], [gx, gy - h * .02], [gx + w * .14, gy + h * .14]], PALE, 2);
        ln([[gx, gy], [gx, gy + h * .14]], GOLD, 1.4); ln([[gx - w * .08, gy + h * .1], [gx + w * .08, gy + h * .1]], GOLD, 1.4);
        ln([[x - w * .12, y - h * .92], [x + w * .12, y - h * .92]], PALE, 2.6);   // ridge
      };
      const bridge = (x, y, w, h) => {   // 太鼓橋
        const arc = (dy) => { const pts = []; for (let k = 0; k <= 30; k++) { const t = k / 30, xx = x - w / 2 + t * w; pts.push([xx, y - dy - Math.sin(t * Math.PI) * h]); } return pts; };
        ln(arc(0), GOLD, 2.6); ln(arc(h * .28), PALE, 2); ln(arc(h * .42), GOLD, 1.6);
        for (let k = 1; k < 12; k++) { const t = k / 12, xx = x - w / 2 + t * w, yb = y - Math.sin(t * Math.PI) * h; ln([[xx, yb - h * .28], [xx, yb - h * .5]], GOLD, 1.7); }
        const ref = []; for (let k = 0; k <= 30; k++) { const t = k / 30; ref.push([x - w / 2 + t * w, y + Math.sin(t * Math.PI) * h * .55]); } ln(ref, DEEP, 1.3, .7);
        for (const s of [-1, 1]) ln([[x + s * w * .36, y - h * .62], [x + s * w * .36, y + 6]], DEEP, 2);
      };
      const mountains = (x0, x1, y, h, seed2) => {
        const r2 = rnd(seed2); let pts = [], xx = x0, yy = y;
        while (xx < x1) { pts.push([xx, yy]); xx += 20 + r2() * 40; yy = y - h * (.2 + r2() * .8) * Math.sin((xx - x0) / (x1 - x0) * Math.PI); }
        pts.push([x1, y]); ln(pts, DEEP, 1.6, .8);
        pts.forEach(([a, b], i) => { if (i % 2) ln([[a, b + 6], [a + 14, b + 22]], DEEP, 1.1, .5); });
      };
      const fuji = (x, y, w, h) => {
        const pts = [[x - w / 2, y], [x - w * .12, y - h * .92], [x - w * .05, y - h], [x + w * .04, y - h * .97], [x + w * .12, y - h * .92], [x + w / 2, y]];
        ln(pts, GOLD, 2.4);
        hatch(() => { g.beginPath(); g.moveTo(x - w * .12, y - h * .92); g.lineTo(x - w * .05, y - h); g.lineTo(x + w * .04, y - h * .97); g.lineTo(x + w * .12, y - h * .92); g.lineTo(x + w * .2, y - h * .72); g.lineTo(x + w * .08, y - h * .78); g.lineTo(x, y - h * .68); g.lineTo(x - w * .08, y - h * .78); g.lineTo(x - w * .2, y - h * .72); g.closePath(); }, 0, 4, PALE, 1.4, .95);
        for (let k = 0; k < 7; k++) { const t = .2 + k * .1; ln([[x - w * t * .45, y - h * (1 - t) - 4], [x - w * t * .42, y - h * (1 - t) + 30]], DEEP, 1.1, .6); }
      };
      const moon = (x, y, r) => { g.fillStyle = 'rgba(239,205,114,.12)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = PALE; g.lineWidth = 2.4; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); hatch(() => { g.beginPath(); g.arc(x, y, r - 5, 0, TAU); }, .5, 7, DEEP, 1.1, .5); };
      const geese = (x, y, n) => { for (let k = 0; k < n; k++) { const xx = x + k * 34 + R() * 10, yy = y + Math.abs(k - n / 2) * 12 + R() * 6, s = 9 + R() * 3; ln([[xx - s, yy - s * .4], [xx, yy], [xx + s, yy - s * .5]], PALE, 1.8); } };
      const boat = (x, y, s) => { ln([[x - s, y - s * .12], [x - s * .7, y + s * .12], [x + s * .75, y + s * .12], [x + s, y - s * .16]], GOLD, 2.2); ln([[x - s * .1, y + s * .05], [x - s * .05, y - s]], GOLD, 1.8); hatch(() => { g.beginPath(); g.moveTo(x - s * .02, y - s * .95); g.lineTo(x + s * .55, y - s * .1); g.lineTo(x - s * .02, y - s * .1); g.closePath(); }, Math.PI / 2, 4, PALE, 1.2, .9); g.strokeStyle = GOLD; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - s * .02, y - s * .95); g.lineTo(x + s * .55, y - s * .1); g.lineTo(x - s * .02, y - s * .1); g.stroke(); };
      const reeds = (x, y, n) => { for (let k = 0; k < n; k++) { const xx = x + k * 9 + R() * 6, h = 40 + R() * 50, b = (R() - .3) * 18; ln([[xx, y], [xx + b * .4, y - h * .6], [xx + b, y - h]], MOSS, 1.5, .9); if (R() < .4) ln([[xx + b, y - h], [xx + b + 4, y - h - 14]], PALE, 2.6); } };
      const lantern = (x, y, s) => { ln([[x - s * .3, y], [x + s * .3, y]], GOLD, 2); ln([[x, y], [x, y - s * .5]], GOLD, 2.4); hatch(() => { g.beginPath(); g.rect(x - s * .18, y - s * .78, s * .36, s * .26); }, Math.PI / 2, 4, PALE, 1.2, .9); roof(x, y - s * .78, s * .7, s * .3, .3); g.fillStyle = PALE; g.beginPath(); g.arc(x, y - s * 1.1, 3, 0, TAU); g.fill(); };
      const gate = (x, y, w, h) => {   // 楼門: a two-storey gate
        ln([[x - w * .5, y], [x + w * .5, y]], GOLD, 2.4);
        for (const k of [-.42, -.14, .14, .42]) ln([[x + k * w, y], [x + k * w, y - h * .38]], GOLD, 2);
        roof(x, y - h * .38, w * 1.3, h * .2, .25);
        hatch(() => { g.beginPath(); g.rect(x - w * .36, y - h * .66, w * .72, h * .16); }, 0, 5, BLUE, 1.2, .75);
        roof(x, y - h * .66, w * 1.2, h * .34, .22);
      };
      const rocks = (x, y, w, h) => { ln([[x - w / 2, y], [x - w * .35, y - h * .6], [x - w * .1, y - h], [x + w * .2, y - h * .7], [x + w / 2, y]], GOLD, 2.2); for (let k = 0; k < 6; k++) { const xx = x - w * .3 + k * w * .11; ln([[xx, y - h * .5 + (k % 2) * 8], [xx + 10, y - 4]], DEEP, 1.2, .7); } };
      const waves = (x0, x1, y, rows) => {   // 青海波-like scale arcs, gently
        for (let r = 0; r < rows; r++) for (let xx = x0 + (r % 2) * 22; xx < x1; xx += 44) for (let q = 0; q < 3; q++) { g.globalAlpha = .7 - q * .15; g.strokeStyle = q ? DEEP : GOLD; g.lineWidth = q ? 1.2 : 1.8; g.beginPath(); g.arc(xx, y + r * 14, 20 - q * 6, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
        g.globalAlpha = 1;
      };
      // ---- four scenes (front, right, back, left)
      if (side === 0) {          // pagoda by the river · a temple hall among pines (the reference board)
        mountains(W * .12, W * .62, H * .42, H * .1, 5);
        pagoda(W * .22, GY - 6, H * .6);
        roundTree(W * .13, GY - 8, H * .14); roundTree(W * .17, GY - 6, H * .1, MOSS); roundTree(W * .3, GY - 4, H * .12);
        shore([[W * .09, GY], [W * .38, GY], [W * .42, GY - 10], [W * .54, GY - 10]]);
        conifer(W * .4, GY - 10, H * .17); conifer(W * .45, GY - 10, H * .13, JADE); conifer(W * .5, GY - 10, H * .19);
        water(W * .1, W * .5, GY + 14, 5, 12);
        ln([[W * .12, GY + 24], [W * .2, GY + 48], [W * .32, GY + 52], [W * .36, GY + 76]], GOLD, 1.8, .8);
        for (let k = 0; k < 7; k++) conifer(W * (.6 + k * .045), GY - 50 - (k % 3) * 10, H * (.16 + (k % 2) * .05), k % 2 ? JADE : MOSS);
        hall(W * .79, GY + 6, W * .17, H * .56, false);
        hall(W * .66, GY + 4, W * .09, H * .28, true);
        ln([[W * .58, GY + 8], [W * .93, GY + 8]], GOLD, 1.8);
        for (let k = 0; k < 12; k++) ln([[W * (.6 + k * .028), GY + 12], [W * (.6 + k * .028), GY + 30 + R() * 10]], DEEP, 1.3, .7);
        mist(W * .55, H * .17, W * .2, H * .07); mist(W * .08, H * .78, W * .16, H * .06);
      } else if (side === 1) {   // an arched bridge, pines and a stone lantern
        mountains(W * .5, W * .95, H * .44, H * .16, 9);
        bridge(W * .42, GY + 6, W * .3, H * .17);
        pine(W * .14, GY + 4, H * .55, 1); pine(W * .74, GY + 2, H * .45, -1);
        lantern(W * .64, GY + 4, H * .26);
        water(W * .18, W * .9, GY + 16, 5, 11);
        rocks(W * .23, GY + 4, W * .07, H * .1); rocks(W * .86, GY + 2, W * .06, H * .08);
        roundTree(W * .9, GY - 4, H * .12, JADE);
        geese(W * .52, H * .22, 6); mist(W * .1, H * .17, W * .22, H * .07); mist(W * .76, H * .26, W * .14, H * .05);
      } else if (side === 2) {   // the moon over Fuji, mist, a boat among the reeds
        moon(W * .78, H * .3, H * .13);
        fuji(W * .4, GY - 10, W * .34, H * .42);
        mountains(W * .1, W * .32, GY - 10, H * .12, 3); mountains(W * .55, W * .95, GY - 10, H * .1, 4);
        mist(W * .16, H * .4, W * .2, H * .07); mist(W * .5, H * .5, W * .22, H * .065);
        water(W * .08, W * .92, GY + 4, 6, 11);
        boat(W * .62, GY + 30, H * .14);
        reeds(W * .1, GY + 62, 14); reeds(W * .84, GY + 60, 10);
        geese(W * .12, H * .22, 5);
      } else {                   // a pavilion on a rocky isle, a great pine, waves
        pine(W * .1, GY + 30, H * .7, 1);
        gate(W * .52, GY - 8, W * .1, H * .46);
        rocks(W * .52, GY + 2, W * .3, H * .08);
        conifer(W * .4, GY - 8, H * .16); conifer(W * .64, GY - 8, H * .18, JADE); roundTree(W * .7, GY - 6, H * .13);
        waves(W * .14, W * .93, GY + 18, 4);
        mist(W * .64, H * .16, W * .24, H * .07); mist(W * .22, H * .3, W * .14, H * .05);
        geese(W * .78, H * .34, 4);
        hall(W * .84, GY - 14, W * .08, H * .24, true);
      }
      g.restore();
      // the engraving catches the light unevenly: break the gold up a little
      const img = g.getImageData(0, 0, W, H), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const m = Math.max(d[i], d[i + 1], d[i + 2]); if (m > 40) { const k = .82 + R() * .3; d[i] = Math.min(255, d[i] * k); d[i + 1] = Math.min(255, d[i + 1] * k); d[i + 2] = Math.min(255, d[i + 2] * k); } }
      g.putImageData(img, 0, 0);
    });
  }
  // metalness / roughness of the side panels: gold is metal (roughish), the lacquer a mirror
  function artMR(side, W, H) {
    return canvas('gbArtMR' + side, W, H, (g) => {
      const src = art(side, W, H).getContext('2d').getImageData(0, 0, W, H).data, img = g.createImageData(W, H), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const m = Math.max(src[i], src[i + 1], src[i + 2]) / 255, k = Math.min(1, Math.max(0, (m - .1) * 1.6)); d[i] = 255; d[i + 1] = (.1 + k * .3) * 255; d[i + 2] = k * .9 * 255; d[i + 3] = 255; }
      g.putImageData(img, 0, 0);
    });
  }

  /* ---------- materials (shared) ---------- */
  const mats = {};
  function matsFor(n, margin, look) {
    const key = n + look; if (mats[key]) return mats[key];
    const TT = T(), o = {};
    const top = tex('gbTop' + n, topCanvas(n, margin)), bump = tex('gbTopB' + n, topBump(n, margin), false);
    o.top = M({ map: top, bump: false, roughness: .42, clearcoat: .2, clearcoatRoughness: .35 });
    o.top.bumpMap = bump; o.top.bumpScale = .0035;
    if (look === 'kaya') {
      o.sides = [0, 1, 2, 3].map(s => {
        const k = 'gbKs' + s, c = kayaSide(k, 1536, 480, 31 + s * 7, s % 2 === 1);   // front / back: flame grain; left / right: end grain
        const m = M({ map: tex(k, c), bumpScale: .0025, roughness: 1, clearcoat: .45, clearcoatRoughness: .22 });
        m.roughnessMap = tex(k + 'R', cv[k + 'R'], false); return m;
      });
      o.leg = M({ map: tex('gbLegK', kayaGrain('gbLegK', 256, 512, 5, { ring: 5 }), true, true), bumpScale: .002, roughness: .4, clearcoat: .35, clearcoatRoughness: .3 });
      o.bottom = M({ color: 0xb98a46, roughness: .8 });
    } else {
      o.sides = [0, 1, 2, 3].map(s => {
        const a = art(s, 2048, 640), m = M({ map: tex('gbArt' + s, a), bump: false, roughness: 1, metalness: 1, clearcoat: 1, clearcoatRoughness: .05 });
        const mr = tex('gbArtMR' + s, artMR(s, 2048, 640), false); m.roughnessMap = mr; m.metalnessMap = mr;
        m.emissiveMap = m.map; m.emissive = new TT.Color(.6, .52, .38);   // the gold keeps glowing even where it mirrors the dark floor
        return m;
      });
      o.leg = M({ color: 0x0c0908, roughness: .14, clearcoat: 1, clearcoatRoughness: .04 });
      o.bottom = M({ color: 0x130e0b, roughness: .6 });
    }
    return (mats[key] = o);
  }

  /* ---------- the gardenia-fruit leg (くちなしの実), eight lobes ---------- */
  const geos = {};
  function legGeo(h, r) {
    const key = 'leg' + h.toFixed(3) + r.toFixed(3); if (geos[key]) return geos[key];
    const TT = T();
    const P = [[0, 0], [.6, 0], [.78, .025], [.93, .085], [1, .17], [.97, .26], [.84, .34], [.64, .4], [.52, .425], [.5, .44], [.58, .455], [.6, .475], [.5, .5], [.42, .53], [.4, .56], [.46, .62], [.62, .7], [.8, .79], [.9, .87], [.93, .94], [.9, .985], [.8, 1], [0, 1]];
    const pts = []; for (let i = 0; i < P.length - 1; i++) { const [r0, y0] = P[i], [r1, y1] = P[i + 1]; for (let k = 0; k < 4; k++) { const t = k / 4; pts.push(new TT.Vector2(Math.max(.0005, (r0 + (r1 - r0) * t) * r), (y0 + (y1 - y0) * t) * h)); } }
    pts.push(new TT.Vector2(.0005, h));
    const g = new TT.LatheGeometry(pts, 96), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {   // lobes: rounded petals, sharp creases between them
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = .9 + .1 * Math.sqrt(Math.abs(Math.cos(4 * a)));
      p.setX(i, x * k); p.setZ(i, z * k);
    }
    g.computeVertexNormals();
    return (geos[key] = g);
  }

  /* ---------- the board ---------- */
  function board(o = {}) {
    const TT = T(), n = o.n || 15, margin = o.margin || 1.25, W = o.W || 8.8, cell = W / (n - 1 + 2 * margin);
    const TH = o.thick || W * .3, LH = o.leg || W * .2, top = LH + TH;
    const g = new TT.Group();
    let look = o.look === 'kaya' ? 'kaya' : 'lacquer';
    const m0 = matsFor(n, margin, look);
    // BoxGeometry groups: +x, −x, +y, −y, +z, −z → sides: front +z = 0, right +x = 1, back −z = 2, left −x = 3
    const body = new TT.Mesh(RB(W, TH, W, W * .006, 3), [m0.sides[1], m0.sides[3], m0.top, m0.bottom, m0.sides[0], m0.sides[2]]);
    body.position.y = LH + TH / 2; body.castShadow = body.receiveShadow = true; g.add(body);
    const lg = legGeo(LH + .02, W * .085), legs = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const l = new TT.Mesh(lg, m0.leg); l.position.set(sx * W * .3, 0, sz * W * .3); l.rotation.y = Math.PI / 8; l.castShadow = true; l.receiveShadow = true; g.add(l); legs.push(l); }
    // the hollow under the board (へそ) is not visible; a dark recess keeps the underside from looking flat
    const pt = (i, j) => [(i - (n - 1) / 2) * cell, (j - (n - 1) / 2) * cell];
    // the games' own 2D board designs tint the kaya a little (when their 2D stones are chosen)
    const TONES = { classic: 0xffffff, grain: 0xd8b088, metal: 0xd2d8de, ink: 0x6e665e };
    let tone = 'classic';
    const paintTone = () => { const m = matsFor(n, margin, look).top; if (!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).multiply(new TT.Color(TONES[tone] || 0xffffff).convertSRGBToLinear()); };
    function setTone(t) { tone = TONES[t] ? t : 'classic'; paintTone(); if (X.kick) X.kick(200); }
    function setLook(lk) {
      lk = lk === 'kaya' ? 'kaya' : 'lacquer'; if (lk === look) return; look = lk;
      const m = matsFor(n, margin, look);
      body.material = [m.sides[1], m.sides[3], m.top, m.bottom, m.sides[0], m.sides[2]]; legs.forEach(l => { l.material = m.leg; });
      g.userData.look = look; paintTone(); if (X.kick) X.kick(200);
    }
    Object.assign(g.userData, { n, cell, W, top: top + .001, S: (n + 1) * cell, outer: W / ((n + 1) * cell), pt, setLook, setTone, look, thick: TH, legH: LH });
    return g;
  }

  /* ---------- stones: double convex ---------- */
  const SH = .36;   // half thickness / radius (那智黒 36号 ≈ 9 mm thick, 22 mm across)
  function stoneGeo(r) {
    const key = 'st' + r.toFixed(4); if (geos[key]) return geos[key];
    const TT = T(), pts = [], h = r * SH;
    const N = 24;
    for (let i = 0; i <= N; i++) {   // from the rim up to the crown; denser near the rounded rim
      const t = i / N, a = t * Math.PI / 2, x = Math.cos(a), yy = Math.sin(a);
      const rr = r * Math.pow(x, .82), y = h * Math.pow(yy, .9) * (1 + .04 * (1 - x));
      pts.push(new TT.Vector2(Math.max(.0004, rr), y));
    }
    pts[pts.length - 1].x = .0004;
    const lowers = pts.slice(1).reverse().map(v => new TT.Vector2(v.x, -v.y));
    const all = lowers.reverse().concat(pts);   // bottom crown → rim → top crown
    const g = new TT.LatheGeometry(all.sort((a, b) => a.y - b.y), 48);
    g.translate(0, h, 0);
    const p = g.attributes.position, uv = g.attributes.uv;   // planar UVs from the top: the shell's stripes run straight across
    for (let i = 0; i < p.count; i++) uv.setXY(i, .5 + p.getX(i) / (2 * r), .5 + p.getZ(i) / (2 * r));
    g.computeVertexNormals();
    return (geos[key] = g);
  }
  function shellCanvas() {   // clam shell: fine growth stripes, faintly curved, a little warm
    return canvas('gbShell', 256, 256, (g, W) => {
      const R = rnd(77), img = g.createImageData(W, W), d = img.data, nz = grid(5, 16, 16, 1, 2);
      const lines = []; let y = 0; while (y < W * 1.6) { y += 3 + R() * 7; lines.push([y, .4 + R() * .9]); }
      for (let py = 0; py < W; py++) for (let px = 0; px < W; px++) {
        const dx = px - W * .5, dy = py + W * 1.6, rr = Math.hypot(dx, dy) - W * 1.6;   // arcs around a centre far below
        let s = 0; for (let k = 0; k < lines.length; k++) { const q = rr - lines[k][0] + W * .1; if (q > -4 && q < 4) s += Math.exp(-q * q / 2.2) * lines[k][1]; }
        const t = Math.min(1, s * .5) * .55 + (nz(px / W, py / W) - .5) * .25, i = (py * W + px) * 4;
        d[i] = 248 - t * 22; d[i + 1] = 245 - t * 26; d[i + 2] = 236 - t * 34; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  const stoneMats = {};
  function stoneMat(color) {
    if (stoneMats[color]) return stoneMats[color];
    const TT = T();
    const m = color === 1
      ? M({ color: 0x1b1b1d, roughness: .36, clearcoat: .35, clearcoatRoughness: .42, sheen: new TT.Color(0x2a2a2e) })
      : M({ map: tex('gbShell', shellCanvas()), bump: false, roughness: .26, clearcoat: .55, clearcoatRoughness: .18 });
    return (stoneMats[color] = m);
  }
  function stone(color, cell, seed) {
    const m = new (T().Mesh)(stoneGeo(cell * .47), stoneMat(color === 1 ? 1 : 2));
    m.castShadow = true; m.receiveShadow = true; m.rotation.y = ((seed ?? Math.random() * 1e3) * 2.39996) % TAU;
    m.userData.stone = color; return m;
  }

  /* ---------- bowls (碁笥): turned mulberry, domed lids ---------- */
  function ringCanvas(key, seed) {   // end grain of a turned bowl: concentric rings around an off-centre pith
    return canvas(key, 512, 512, (g, W) => {
      const R = rnd(seed), img = g.createImageData(W, W), d = img.data, w = grid(seed, 8, 8, .8, 3), f = grid(seed + 1, 64, 64, 1, 1);
      const cx = W * (.35 + R() * .3), cy = W * (.35 + R() * .3), A = [204, 138, 64], B = [128, 72, 28];
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const r = Math.hypot(x - cx, y - cy) / W + (w(x / W, y / W) - .5) * .05, q = (r * 34) % 1;
        const late = Math.exp(-Math.pow((q - .8) / .08, 2)) + .3 * Math.exp(-Math.pow((q - .65) / .2, 2));
        const t = Math.max(0, Math.min(1, .15 + late * .5 + (f(x / W, y / W) - .5) * .2 + (R() - .5) * .04)), i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  function sideGrainCanvas(key, seed) {   // the side of the bowl: rings cut at a slant → long wavy flames
    return canvas(key, 512, 256, (g, W, H) => {
      const R = rnd(seed), img = g.createImageData(W, H), d = img.data, w = grid(seed, 12, 4, .9, 3), f = grid(seed + 1, 200, 8, 1, 1);
      const A = [206, 140, 66], B = [124, 70, 26];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const u = x / W, v = y / H, s = Math.abs(Math.sin(u * TAU)) * 1.1 + v * .5 + (w(u, v) - .5) * .7, q = (s * 4.2) % 1;
        const late = Math.exp(-Math.pow((q - .8) / .05, 2)) * .8 + .45 * Math.exp(-Math.pow((q - .62) / .22, 2));
        const t = Math.max(0, Math.min(1, .14 + late * .42 + (f(u, v) - .5) * .2 + (R() - .5) * .04)), i = (y * W + x) * 4;
        d[i] = A[0] + (B[0] - A[0]) * t; d[i + 1] = A[1] + (B[1] - A[1]) * t; d[i + 2] = A[2] + (B[2] - A[2]) * t; d[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
    });
  }
  function bowlMats() {
    if (mats.bowl) return mats.bowl;
    const side = M({ map: tex('gbBowlS', sideGrainCanvas('gbBowlS', 21), true, true), bumpScale: .002, roughness: .34, clearcoat: .55, clearcoatRoughness: .25 });
    const top = M({ map: tex('gbBowlT', ringCanvas('gbBowlT', 23)), bumpScale: .002, roughness: .34, clearcoat: .55, clearcoatRoughness: .25 });
    const inner = M({ map: tex('gbBowlS', sideGrainCanvas('gbBowlS', 21), true, true), color: 0xc9a07a, bumpScale: .002, roughness: .6 });
    return (mats.bowl = { side, top, inner });
  }
  function lathe(key, prof, seg = 64) {
    if (geos[key]) return geos[key];
    const TT = T(), g = new TT.LatheGeometry(prof.map(([r, y]) => new TT.Vector2(Math.max(.0004, r), y)), seg);
    g.computeVertexNormals(); return (geos[key] = g);
  }
  // R = outer radius; the body is a round pot on a small foot ring, curving in to a short lip that the domed lid covers
  function bowl(color, cell, o = {}) {
    const TT = T(), R = o.R || cell * 2.5, H = R * 1.16, g = new TT.Group(), m = bowlMats(), k = R.toFixed(3);
    const OUT = [[0, 0], [.6, 0], [.64, .012], [.645, .04], [.66, .055], [.74, .09], [.86, .19], [.95, .33], [.995, .48], [.99, .62], [.94, .76], [.87, .87], [.81, .95], [.79, 1], [.775, 1.015]];
    const IN = [[.735, 1.015], [.725, .99], [.77, .93], [.85, .81], [.91, .66], [.93, .52], [.9, .37], [.8, .24], [.62, .16], [.3, .135], [0, .13]];
    const prof = OUT.concat(IN).map(([r, y]) => [r * R, y * H]);
    const body = new TT.Mesh(lathe('bowl' + k, prof, 72), m.side); body.castShadow = body.receiveShadow = true;
    { const uv = body.geometry.attributes.uv; if (!body.geometry.userData.uvFix) { body.geometry.userData.uvFix = 1; for (let i = 0; i < uv.count; i++) uv.setY(i, uv.getY(i) * 2); } }   // the side grain repeats twice up the profile
    g.add(body);
    // stones heaped inside: a gentle dome reaching up towards the lip
    const count = o.stones ?? 26, r0 = cell * .47, sg = stoneGeo(r0), sm = stoneMat(color === 1 ? 1 : 2), rr = rnd(color * 13 + 7);
    const lim = R * .7, put = [];
    for (let tries = 0; put.length < count && tries < 900; tries++) {
      const rad = Math.sqrt(rr()) * lim, a = rr() * TAU, x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (put.some(([px, pz]) => Math.hypot(px - x, pz - z) < r0 * 1.55)) continue;
      put.push([x, z, rad]);
    }
    put.forEach(([x, z, rad]) => {
      const y = H * (.86 - .2 * Math.pow(rad / lim, 2)), sl = .4 * H / lim * rad / lim * .5;   // slope of the heap → the stones lean outwards
      const s = new TT.Mesh(sg, sm); s.castShadow = false; s.receiveShadow = true;
      s.position.set(x, y - r0 * SH + (rr() - .5) * r0 * .15, z);
      const ax = Math.atan2(z, x); s.rotation.set(Math.sin(ax) * sl + (rr() - .5) * .25, rr() * TAU, -Math.cos(ax) * sl + (rr() - .5) * .25); g.add(s);
    });
    // the lid (separate: it can sit on the bowl or lie upside down beside it)
    const LP = [[0, .4], [.3, .39], [.56, .345], [.74, .27], [.84, .17], [.875, .08], [.875, .02], [.86, 0], [.8, 0], [.8, .05], [.77, .09], [.62, .2], [.35, .28], [0, .3]];
    const lg = lathe('lid' + k, LP.map(([r, y]) => [r * R, y * R]), 72);
    if (!lg.userData.uvFix) { lg.userData.uvFix = 1; const p = lg.attributes.position, uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, .5 + p.getX(i) / (1.8 * R), .5 + p.getZ(i) / (1.8 * R)); }   // seen from above: the end-grain rings of the turned lid
    const lid = new TT.Group(), lm = new TT.Mesh(lg, m.top); lm.castShadow = lm.receiveShadow = true; lid.add(lm);
    g.userData.lid = lid; g.userData.R = R; g.userData.H = H * 1.015; g.userData.lidH = R * .4;
    return g;
  }

  // "tap here": a vivid coral marker that stands out on the golden kaya — a soft glow, a bold ring with a white inner line,
  // a centre dot and a ripple that keeps spreading out. tick(time ms) animates it (call it while it is shown).
  function tapMark(cell) {
    const TT = T(), g = new TT.Group(), C = 0xff2e5b;
    const mat = (o) => new TT.MeshBasicMaterial(Object.assign({ transparent: true, toneMapped: false, depthWrite: false }, o));
    const glowT = X.canvasTex('gbTapGlow', 128, 128, (c, W) => { const gr = c.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W / 2); gr.addColorStop(0, 'rgba(255,80,110,1)'); gr.addColorStop(.45, 'rgba(255,60,95,.55)'); gr.addColorStop(1, 'rgba(255,60,95,0)'); c.fillStyle = gr; c.fillRect(0, 0, W, W); });
    const flat = (geo, m, y) => { const k = new TT.Mesh(geo, m); k.rotation.x = -Math.PI / 2; k.position.y = y; k.renderOrder = 4; g.add(k); return k; };
    const q = cell * 1.45;   // larger than a stone: it must jump out at a glance
    const halo = flat(new TT.PlaneGeometry(q * 2.6, q * 2.6), mat({ map: glowT, opacity: .8 }), .003);
    const ring = flat(new TT.RingGeometry(q * .4, q * .56, 56), mat({ color: C, opacity: 1 }), .012);
    const inner = flat(new TT.RingGeometry(q * .35, q * .41, 56), mat({ color: 0xffffff, opacity: .95 }), .013);
    const dot = flat(new TT.CircleGeometry(cell * .16, 24), mat({ color: C, opacity: 1 }), .013);
    const ripple = flat(new TT.RingGeometry(q * .5, q * .6, 56), mat({ color: C, opacity: .85 }), .011);
    g.userData.tick = t => {
      const k = .5 + .5 * Math.sin(t / 230), r = (t % 1200) / 1200;
      const s = .92 + k * .16; ring.scale.set(s, s, 1); inner.scale.set(s, s, 1); dot.scale.setScalar(.85 + k * .3);
      halo.material.opacity = .45 + k * .45; halo.scale.setScalar(.9 + k * .25);
      ripple.scale.set(1 + r * 1.3, 1 + r * 1.3, 1); ripple.material.opacity = .85 * (1 - r);
    };
    g.userData.tick(0); g.userData.tap = true;
    return g;
  }

  X.goban = { board, stone, bowl, tapMark, stoneGeo, stoneMat, stars, SH, _canvas: { art, artMR, kayaGrain, kayaSide, topCanvas, shellCanvas, ringCanvas, sideGrainCanvas } };

  /* ---------- gomoku on the chabudai ---------- */
  const SHOW = [112, 127, 129, 126, 124, 114, 143, 96, 109, 157, 156, 142, 110, 111, 81, 139, 95, 123, 82, 65, 67];   // a renju game from the centre (cells: row * 15 + col, row 0 = bottom)
  X.MODELS.gomoku = function (live, o) {
    const TT = T(), g = new TT.Group();
    let look = (o && o.look) || null; if (!look) { try { look = localStorage.getItem('atlas-gomoku-look') === 'kaya' ? 'kaya' : 'lacquer'; } catch (e) { look = 'lacquer'; } }
    const b = board({ n: 15, look, W: (o && o.W) || 8.8 }); g.add(b);
    Object.assign(g.userData, b.userData, { board: b, viewY: b.userData.top * 1.05 });   // showcase: the camera looks at the playing surface of the tall legged board, so it sits where the other boards do
    if (live) return g;
    g.scale.setScalar(.9);   // (the thick goban reads larger than the flat boards)
    const Y = b.userData.top, c = b.userData.cell;
    SHOW.forEach((m, k) => {
      const [x, z] = b.userData.pt(m % 15, 14 - Math.floor(m / 15)), s = stone(k % 2 ? 2 : 1, c, k);
      s.position.set(x, Y, z); g.add(s);
      const sh = X.contact(c * .47, .45); sh.position.set(x, Y + .002, z); g.add(sh);
    });
    // the bowls stand beside the board on the chabudai, lids upside down next to them
    const R = c * 2.4;
    [[1, 6.15, 1.9], [2, -6.15, -1.9]].forEach(([col, x, z]) => {
      const bw = bowl(col, c, { R, stones: 24 }); bw.position.set(x, 0, z); g.add(bw);
      const lid = bw.userData.lid; lid.rotation.x = Math.PI; lid.position.set(x + (x > 0 ? -.15 : .15), R * .4, z + (z > 0 ? -2.55 : 2.55)); g.add(lid);
    });
    return g;
  };

  /* ---------- go on the chabudai (replaces table3d.js's plain slab) ---------- */
  // the showcase: a 19 × 19 opening (x, y from the top-left corner), black first
  const GO_SHOW = ['pd', 'dp', 'pq', 'dd', 'fq', 'cn', 'jp', 'qf', 'nc', 'rd', 'qc', 'qi', 'qk', 'oe', 'pe', 'of', 'ld', 'fc', 'cf', 'ch'];
  X.MODELS.go = function (live, o) {
    const TT = T(), g = new TT.Group(), n = Math.max(5, Math.min(19, (o && o.n) || 19));
    let look = (o && o.look) || null; if (!look) { try { look = localStorage.getItem('atlas-go-look') === 'lacquer' ? 'lacquer' : 'kaya'; } catch (e) { look = 'kaya'; } }
    const b = board({ n, look, W: (o && o.W) || 8.8 }); g.add(b);
    Object.assign(g.userData, b.userData, { board: b, viewY: b.userData.top * 1.05 });   // showcase: the camera looks at the playing surface of the tall legged board, so it sits where the other boards do
    if (live) return g;
    g.scale.setScalar(.9);   // (the thick goban reads larger than the flat boards)
    const Y = b.userData.top, c = b.userData.cell;
    GO_SHOW.forEach((s, k) => {
      const x = s.charCodeAt(0) - 97, y = s.charCodeAt(1) - 97; if (x >= n || y >= n) return;
      const [px, pz] = b.userData.pt(x, y), st = stone(k % 2 ? 2 : 1, c, k);
      st.position.set(px, Y, pz); g.add(st);
      const sh = X.contact(c * .47, .45); sh.position.set(px, Y + .002, pz); g.add(sh);
    });
    const R = 1.28;   // the same bowls as gomoku's
    [[1, 6.15, 1.9], [2, -6.15, -1.9]].forEach(([col, x, z]) => {
      const bw = bowl(col, c, { R, stones: 30 }); bw.position.set(x, 0, z); g.add(bw);
      const lid = bw.userData.lid; lid.rotation.x = Math.PI; lid.position.set(x + (x > 0 ? -.15 : .15), R * .4, z + (z > 0 ? -2.55 : 2.55)); g.add(lid);
    });
    return g;
  };
})();
