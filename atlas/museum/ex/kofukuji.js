/* 所蔵品：興福寺旧境内出土の将棋駒・習書木簡・題箋軸（奈良県・橿原考古学研究所附属博物館、県指定文化財 31点） — units: 1 = 1 cm.
   Nara Prefecture's record (2022 designation): from the Kisshōin area (1992 dig, a well-like pit) 16 pieces — 玉将 3, 金将 4,
   銀将 1, 桂馬 1, 歩兵 6, one unreadable —, a practice tablet (習書木簡) written with 酔像 · 金将 · 歩 · 歩兵 · 歩兵兵, and a title-label
   scroll rod inscribed 天喜六年 (1058); from the Kanzen'in area (2013, a well and a pit) 12 pieces — 酔象 1, 桂馬 1, 歩兵 7,
   3 without names — and a scroll rod inscribed 承徳二年 (1098). The 酔象 is about 2.5 × 1.5 cm and 2 mm thick (press reports).
   Shown as in the museum's photograph: the 31 pieces laid out loosely on a dark cloth. Each piece's size and outline, how much of
   its ink survives, the size of the tablet and rods and the writing on them are drawn in the manner of the photograph (estimates).
   2026-11-21: colour, outline and ink checked against the Agency for Cultural Affairs' photograph (文化遺産オンライン 413142):
   warm tan wood, pieces about as wide as tall with low shoulders and a blunt top, heavy blurred ink filling the face.
   2026-11-23: no typeface any more — every character is written here with a brush, stroke by stroke (SUMI below: the strokes of
   each character, drawn with a loaded brush that thins, skips over the grain and runs dry; every writing comes out a little
   different). The pieces are small thick blocks with a low rounded head, weathered so that the grain stands in ridges (bump),
   after the same photograph. The hand itself (which strokes run together, how cursive) is an estimate.
   2026-11-23 (2): the aim is the pieces as they are now, not as they were written — most of the ink is gone, and what is left is
   grey, broken along the grain and often unreadable. Wood and ink were tuned against the photograph's faces with
   atlas/museum/tools/kofukuji-score.py (colour, tones, grain, cross marks, how much ink is left and how broken it is). */

(function () {
  'use strict';
  /* ---------- 墨書: characters as brush strokes ----------
     Each character: strokes in a 100 × 100 box (x to the right, y down); a stroke is a run of points x,y[,pressure].
     Written the way a quick everyday hand of the time would: square and plain, a few strokes run together. */
  const GL = {
    玉: [[22, 22, .8, 78, 20, 1], [50, 21, .9, 50, 80, .9], [27, 49, .8, 73, 47, .9], [14, 83, .9, 88, 80, 1.15], [65, 60, .6, 74, 70, 1]],
    将: [[19, 22, .6, 27, 33, .95], [33, 8, 1, 33, 92, .8], [15, 54, .6, 30, 44, .95], [60, 6, 1, 47, 25, .5], [56, 15, .8, 85, 13, 1, 65, 39, .5], [65, 24, .6, 72, 31, .9],
      [42, 55, .8, 93, 52, 1.05], [73, 40, 1, 73, 88, 1, 61, 83, .45], [52, 66, .6, 59, 75, .95]],
    金: [[50, 6, 1.1, 34, 26, .8, 12, 42, .4], [50, 7, .6, 70, 24, .9, 90, 40, 1.15], [32, 38, .8, 68, 37, .9], [26, 54, .8, 74, 53, .9], [50, 38, .9, 50, 88, .9],
      [28, 66, .6, 36, 78, .95], [72, 64, .95, 62, 78, .5], [12, 90, .9, 90, 88, 1.15]],
    銀: [[26, 8, 1, 8, 30, .45], [26, 9, .6, 40, 24, .9], [14, 34, .7, 38, 33, .8], [12, 48, .7, 40, 47, .8], [26, 34, .85, 26, 80, .85], [12, 58, .5, 17, 68, .8], [40, 56, .8, 34, 68, .45], [8, 85, .7, 42, 76, .95],
      [56, 12, .9, 56, 84, .9, 68, 74, .5], [56, 12, .8, 86, 12, .9, 86, 44, .85], [56, 28, .7, 86, 28, .7], [56, 44, .7, 86, 44, .75], [88, 52, .9, 70, 66, .45], [66, 54, .6, 80, 72, .9, 94, 88, 1.1]],
    桂: [[6, 30, .8, 40, 28, .9], [24, 8, .95, 24, 92, .8], [24, 34, .9, 6, 62, .4], [26, 40, .6, 40, 54, .9],
      [52, 22, .8, 88, 20, .9], [70, 8, .9, 70, 44, .85], [46, 45, .8, 94, 42, 1], [54, 66, .8, 86, 64, .9], [70, 52, .9, 70, 88, .85], [44, 91, .9, 96, 88, 1.1]],
    馬: [[26, 10, .9, 26, 58, .85], [26, 10, .8, 78, 10, .9], [52, 10, .85, 52, 58, .8], [26, 26, .7, 76, 26, .75], [26, 42, .7, 76, 42, .75], [26, 58, .8, 88, 58, 1, 87, 90, .9, 75, 84, .45],
      [16, 70, .9, 12, 84, .5], [34, 70, .6, 36, 82, .9], [50, 70, .6, 52, 82, .9], [66, 70, .6, 68, 82, .9]],
    歩: [[50, 6, .95, 50, 36, .85], [50, 20, .7, 76, 19, .85], [26, 16, .85, 26, 36, .8], [8, 38, .9, 92, 36, 1.1], [50, 44, .95, 50, 74, .9, 42, 70, .45], [26, 50, .9, 20, 64, .5], [72, 48, .6, 80, 60, .95], [82, 62, 1.05, 54, 82, .8, 18, 94, .4]],
    兵: [[62, 6, 1, 32, 14, .6], [32, 14, .9, 32, 58, .85], [32, 32, .75, 80, 30, .85], [62, 30, .85, 62, 58, .8], [8, 60, .9, 94, 58, 1.15], [36, 68, 1, 14, 92, .4], [64, 68, .6, 86, 90, 1.1]],
    酔: [[6, 14, .75, 46, 13, .85], [10, 28, .85, 10, 88, .8], [10, 28, .75, 44, 27, .85, 44, 88, .8], [22, 14, .8, 20, 48, .6], [32, 14, .8, 34, 46, .6], [10, 62, .65, 44, 61, .7], [10, 88, .7, 44, 87, .8],
      [62, 10, 1, 52, 44, .45], [54, 24, .75, 80, 22, .9, 78, 40, .8, 94, 44, .5], [54, 62, .8, 96, 60, 1], [74, 48, .95, 74, 94, .8]],
    象: [[46, 4, 1, 30, 18, .45], [44, 10, .7, 64, 10, .85, 54, 20, .45], [26, 22, .8, 26, 40, .75], [26, 22, .75, 76, 22, .85, 76, 40, .8], [26, 40, .7, 76, 40, .75], [50, 22, .7, 50, 40, .7],
      [50, 42, .9, 24, 58, .4], [44, 48, .7, 58, 60, .9, 54, 90, .9, 44, 86, .45], [48, 62, .9, 22, 76, .4], [50, 72, .9, 14, 94, .4], [78, 50, .9, 62, 62, .45], [60, 62, .6, 76, 78, .9, 92, 92, 1.1]],
    天: [[20, 22, .8, 80, 20, .95], [10, 48, .9, 90, 46, 1.1], [50, 22, 1, 48, 50, .95, 14, 92, .4], [50, 48, .6, 70, 72, .9, 90, 90, 1.15]],
    喜: [[24, 10, .75, 76, 9, .85], [50, 2, .85, 50, 24, .8], [32, 24, .7, 68, 23, .8], [34, 32, .75, 34, 46, .7], [34, 32, .7, 66, 32, .8, 66, 46, .75], [34, 46, .65, 66, 46, .7], [36, 52, .6, 42, 60, .85], [64, 52, .85, 58, 60, .5],
      [8, 64, .85, 92, 62, 1.05], [30, 72, .8, 30, 94, .75], [30, 72, .7, 70, 72, .8, 70, 94, .75], [30, 94, .7, 70, 94, .8]],
    六: [[50, 8, .6, 54, 20, 1], [10, 34, .9, 90, 32, 1.1], [38, 48, 1, 16, 88, .4], [62, 48, .6, 86, 86, 1.1]],
    年: [[38, 6, 1, 22, 26, .45], [30, 20, .8, 82, 19, .9], [24, 44, .75, 78, 43, .85], [30, 44, .8, 30, 66, .75], [6, 68, .9, 94, 66, 1.1], [54, 20, .95, 54, 96, .7]],
    承: [[30, 10, .75, 70, 10, .9, 54, 24, .45], [52, 24, .95, 52, 90, .9, 42, 84, .45], [38, 36, .65, 64, 35, .75], [36, 50, .65, 66, 49, .75], [34, 64, .65, 68, 63, .75], [10, 40, .7, 30, 38, .85, 12, 78, .4], [88, 34, .9, 70, 50, .45], [68, 50, .6, 82, 68, .9, 94, 86, 1.1]],
    徳: [[26, 6, 1, 8, 24, .45], [28, 26, 1, 6, 50, .4], [18, 42, .9, 18, 94, .8], [40, 14, .75, 92, 13, .85], [66, 4, .85, 66, 26, .8], [44, 30, .75, 44, 48, .7], [44, 30, .7, 90, 30, .8, 90, 48, .75], [60, 30, .6, 60, 48, .6], [74, 30, .6, 74, 48, .6], [44, 48, .65, 90, 48, .7],
      [38, 58, .8, 96, 57, .95], [42, 70, .9, 38, 84, .5], [52, 68, .8, 58, 90, .9, 80, 90, .85, 82, 80, .45], [68, 66, .6, 72, 74, .9], [88, 66, .6, 94, 76, .95]],
    二: [[26, 30, .8, 74, 28, .95], [10, 72, .9, 90, 70, 1.15]],
  };
  // 像 = 亻 beside a narrow 象
  GL.像 = [[28, 6, 1, 6, 40, .4], [18, 28, .9, 18, 94, .8]].concat(GL.象.map(s => s.map((v, i) => i % 3 === 0 ? 34 + v * .66 : v)));
  /* SUMI.write(g, ch, cx, cy, size, o): one character, centred on (cx, cy), about `size` px square, onto the 2D context g (opaque ink
     on transparent). o: { rnd, weight (brush thickness, 1), slant, wet (0 dry … 1 loaded) }. The brush is a run of round dabs whose
     radius follows the pressure; it swells where the stroke starts, thins where it is lifted, and towards the end of a long stroke
     runs dry (broken dabs). */
  const SUMI = {
    write(g, ch, cx, cy, size, o) {
      const G = GL[ch]; if (!G) return; const rnd = o.rnd, wgt = (o.weight || 1) * size * .052, wet = o.wet == null ? .8 : o.wet;
      const sx = size / 100 * (.92 + rnd() * .16), sy = size / 100 * (.92 + rnd() * .16), sk = (o.slant || 0) + (rnd() - .5) * .12, rot = (rnd() - .5) * .1;
      const cr = Math.cos(rot), sr = Math.sin(rot), T = (x, y) => { const u = (x - 50) * sx + (y - 50) * sk * sy, v = (y - 50) * sy; return [cx + u * cr - v * sr, cy + u * sr + v * cr]; };
      g.fillStyle = '#000';
      G.forEach(st => {
        const P = []; for (let i = 0; i < st.length; i += 3) P.push([st[i] + (rnd() - .5) * 5, st[i + 1] + (rnd() - .5) * 5, st[i + 2] * (.85 + rnd() * .3)]);
        if (P.length === 2) { const [a, b] = P, L = Math.hypot(b[0] - a[0], b[1] - a[1]), k = (rnd() - .5) * .12 * L; P.splice(1, 0, [(a[0] + b[0]) / 2 - (b[1] - a[1]) / L * k, (a[1] + b[1]) / 2 + (b[0] - a[0]) / L * k, (a[2] + b[2]) / 2 * 1.02]); }   // no stroke is quite straight
        // the brush enters with a little press against the stroke's direction
        { const [a, b] = P, L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; P.unshift([a[0] - (b[0] - a[0]) / L * 2 - (b[1] - a[1]) / L * 1.5, a[1] - (b[1] - a[1]) / L * 2 + (b[0] - a[0]) / L * 1.5, a[2] * .55]); }
        const Q = P.map(p => { const [x, y] = T(p[0], p[1]); return [x, y, p[2]]; });
        let len = 0; for (let i = 1; i < Q.length; i++) len += Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]);
        const ink = wet * (.75 + rnd() * .5), n = Math.max(6, Math.ceil(len / Math.max(.35, wgt * .14))); let run = 0;
        for (let k = 0; k <= n; k++) { const t = k / n * (Q.length - 1), i = Math.min(Q.length - 2, Math.floor(t)), f = t - i;
          const p0 = Q[Math.max(0, i - 1)], p1 = Q[i], p2 = Q[i + 1], p3 = Q[Math.min(Q.length - 1, i + 2)], f2 = f * f, f3 = f2 * f;
          const cm = (a, b, c, d) => .5 * (2 * b + (c - a) * f + (2 * a - 5 * b + 4 * c - d) * f2 + (3 * b - a - 3 * c + d) * f3);
          const x = cm(p0[0], p1[0], p2[0], p3[0]), y = cm(p0[1], p1[1], p2[1], p3[1]), pr = p1[2] + (p2[2] - p1[2]) * f, u = k / n;
          const dry = Math.max(0, u * (len / size) * 1.6 - ink);                       // the brush empties along a long stroke
          run = run * .7 + (rnd() - .5) * .6; if (dry > 0 && rnd() < dry * .8 + run * .3) continue;
          const r = Math.max(.3, wgt * pr * (1 - dry * .35) * (.94 + rnd() * .12));
          g.globalAlpha = Math.max(.25, 1 - dry * .6); g.beginPath(); g.ellipse(x, y, r, r * (.8 + rnd() * .15), .6, 0, 6.2832); g.fill(); }
      });
      g.globalAlpha = 1;
    },
    // a column of characters (top to bottom), each a little different in size and place
    column(g, txt, cx, y0, size, o) { let y = y0; [...txt].forEach(c => { const s = size * (.9 + o.rnd() * .2); SUMI.write(g, c, cx + (o.rnd() - .5) * size * .1, y + s / 2, s, o); y += s * (.96 + o.rnd() * .08); }); return y; },
  };
  (window.AtlasEx = window.AtlasEx || {}).kofukuji = {
    sumi: SUMI,
    build(TT, X, K) {
      const G = new TT.Group();
      let seed = 1058; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
      // the dark cloth of the photograph
      const clT = K.tex(512, 512, (g, w, h) => { const n = K.noise(5), img = g.createImageData(w, h), d = img.data;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = 24 + n(x / 50, y / 50, 4) * 10 + (n(x / 2, y / 2, 1) - .5) * 6, i = (y * w + x) * 4; d[i] = v; d[i + 1] = v * .98; d[i + 2] = v * .97; d[i + 3] = 255; }
        g.putImageData(img, 0, 0); }, { rep: [2, 2] });
      const cloth = K.mat({ map: clT, color: '#ffffff', roughness: .97, sheen: .2, sheenRoughness: .9, sheenColor: K.lin('#5a5a5a') });
      const CW = 34, CD = 30;
      const base = new TT.Mesh(new TT.BoxGeometry(CW, .8, CD), cloth); base.position.y = .4; base.receiveShadow = true; G.add(base);
      /* ---------- wood, a thousand years in the wet earth of a well ----------
         One painting gives the colour and the height: straight fine grain running the length of the piece, the soft early wood
         worn away so that the hard lines stand up, dirt lying in the furrows, edges rubbed and darkened, a few checks and stains.
         ink(W, H) → a canvas with the writing (alpha), or null. Returns { map, bump }. */
      const wood = (W, H, k, tone, ink, pxcm) => {
        const n = K.noise(110 + k), n2 = K.noise(300 + k), c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), d = img.data;
        const b = document.createElement('canvas'); b.width = W; b.height = H; const bg = b.getContext('2d'), bim = bg.createImageData(W, H), bd = bim.data;
        const A = ink ? ink.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data : null;
        // the grain: thin dark lines on paler wood, one every 0.4–0.9 mm (the photograph: 25–35 lines across a piece), each of its own strength
        const line = new Float32Array(W + 16); { let x = 0; while (x < W + 16) { const gap = Math.max(3, Math.round(pxcm * (.05 + n(x * .37, k * 1.3, 1) * .09))), st = .25 + n(x * .21 + 5, k, 1) * .75, wd = st > .5 ? 2 : 1;
          for (let q = 0; q < gap && x < W + 16; q++, x++) line[x] = q < wd ? st : q === wd ? st * .35 : 0; } }
        // slow fields on a coarse grid (they change over millimetres; read between the grid's points): wear, stain, the grain's wobble, lost ink
        const GS = 4, gw = Math.ceil(W / GS) + 2, gh = Math.ceil(H / GS) + 2, fWear = new Float32Array(gw * gh), fStain = new Float32Array(gw * gh), fWob = new Float32Array(gw * gh), fGone = new Float32Array(gw * gh);
        for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = i * GS, y = j * GS, q = j * gw + i; fWear[q] = n(x / (pxcm * .45), y / (pxcm * .7), 3); fStain[q] = n(x / (pxcm * .9) + 7, y / (pxcm * 1.2), 3); fWob[q] = n(y / (pxcm * .9), x / (pxcm * 3) + k, 2); fGone[q] = n(x / (pxcm * .4) + 40, y / (pxcm * .55), 3); }
        const rd = (F, x, y) => { const fx = x / GS, fy = y / GS, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, q = j * gw + i; return (F[q] * (1 - u) + F[q + 1] * u) * (1 - v) + (F[q + gw] * (1 - u) + F[q + gw + 1] * u) * v; };
        // scratches and checks across the grain (the photograph: a few short dark lines running sideways, and one or two long ones)
        const scr = new Float32Array(W * H); { const m = 1 + (n(k, 3, 1) * 4 | 0); for (let q = 0; q < m; q++) { const y0 = n(q * 3.1, k + 1, 1) * H, x0 = n(q * 1.7 + 9, k, 1) * W * .8, len = W * (.08 + n(q, k * 2 + 5, 1) * (q < 1 ? .6 : .22)), sl = (n(q * 5, k, 1) - .5) * .25, st = .2 + n(q, 7 + k, 1) * .45;
          for (let t = 0; t < len; t++) { const x = (x0 + t) | 0, y = (y0 + t * sl + (n(t / 9, q + k, 1) - .5) * 3) | 0; if (x >= 0 && x < W && y >= 0 && y < H - 1) { scr[y * W + x] = Math.max(scr[y * W + x], st); scr[(y + 1) * W + x] = Math.max(scr[(y + 1) * W + x], st * .5); } } } }
        const base = [125 + tone * 18, 94 + tone * 14, 70 + tone * 11];   // (a greyed tan: measured on the photograph against its white paper)
        const fade = ink && ink.fade || 0, bare = n(k * 7.3, 2, 1) > .78 ? 1 : 0;   // (a piece or two has a patch of fresh orange wood where the grey skin has come off)
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const xs = Math.min(W + 15, Math.max(0, Math.round(x + 8 + (rd(fWob, x, y) - .5) * pxcm * .06)));
          const brk = n2(xs * 1.7, y / (pxcm * .09), 2), ln = line[xs] * Math.max(0, Math.min(1, (brk - .3) * 2.6));   // each line broken into dashes along its length
          const a = rd(fWear, x, y), sp = n2(x / 1.6, y / 2.1, 2), e = Math.min(x, y, W - x, H - y) / pxcm, st = Math.max(0, rd(fStain, x, y) - .5) * 2;
          const pit = sp > .66 ? (sp - .66) * 3.4 : 0, sc = scr[y * W + x];
          let h = .6 - ln * .5 - pit * .5 - sc * .7 + (sp - .5) * .3;                         // height 0..1: lines, pits and scratches are cut in
          const soil = Math.max(0, a - .42) * 1.1 + Math.max(0, .1 - e) * 3.2;                  // grey dirt in the worn patches and at the rubbed edges
          const band = n(xs / (pxcm * .05), y / (pxcm * 1.4) + k, 2);   // broader soft streaks along the grain
          const mot = rd(fStain, y * .7 + 31, x * .7 + 11) - .5;   // paler and greyer patches
          let lum = (1.04 + (sp - .5) * .15 + (band - .5) * .3 + mot * .3) * (1 - ln * .62) * (1 - pit * .45) * (1 - sc * .55) * (1 - Math.min(.5, soil * .4)) * (1 - st * .3) * (1 + (n2(y / 2.6, x / 46 + 9, 2) - .5) * .16) * (1 - Math.max(0, n(x / (pxcm * .16) + 3, y / (pxcm * .1) + 8, 2) - .6) * 1.4);   // faint marks across the grain, and dark specks of dirt
          const gy = Math.max(0, -mot) * .9 + soil * .06; let R = base[0] * lum * (1 - gy * .12), Gc = base[1] * lum * (1 - gy * .03), B = base[2] * lum * (1 + gy * .22);
          if (bare) { const t = Math.max(0, Math.min(1, (rd(fStain, W - x, y) - .56) * 9)) * (x < W * .5 ? 1 : 0); R += (204 - R) * t * .7; Gc += (140 - Gc) * t * .7; B += (82 - B) * t * .7; }
          if (A) {   // the ink: grey-black, sunk into the pores; rubbed off the worn patches, broken by the grain and by a speckle of bare wood
            const al0 = A[(y * W + x) * 4 + 3] / 255; if (al0 > .01) { const gone = rd(fGone, x, y), spk = n2(x / 2.3 + 30, y / 3.4, 2), strk = n2(xs / 1.4 + 60, y / (pxcm * .22), 2);
              // the strokes' edges eaten away, and strips along the grain where the ink has gone with the soft wood
              const al = Math.max(0, Math.min(1, (al0 - .06 - spk * .2 - fade * .1) * 3)) * Math.max(0, Math.min(1, (strk - .12 - fade * .2) * 5));
              // a grey wash where the ink has thinned, darker where it pooled; whole patches rubbed away
              const core = Math.max(0, Math.min(1, (spk - .05 - fade * .16) * 4 + (band - .5) * 1.2));
              let keep = al * Math.max(0, Math.min(1, (gone - fade * .85) * 5 + .5)) * (.5 + .5 * core) * (1 - ln * .25);
              keep = Math.min(.86, keep * (1.38 - fade * .62)); const ic = 40 - core * 9; R += (ic - R) * keep; Gc += (ic - Gc) * keep; B += (ic + 4 - B) * keep; } }
          const i = (y * W + x) * 4; d[i] = R; d[i + 1] = Gc; d[i + 2] = B; d[i + 3] = 255;
          const hv = Math.max(0, Math.min(255, 60 + h * 190)); bd[i] = bd[i + 1] = bd[i + 2] = hv; bd[i + 3] = 255;
        }
        g.putImageData(img, 0, 0); bg.putImageData(bim, 0, 0);
        const map = new TT.CanvasTexture(c); map.colorSpace = TT.SRGBColorSpace; map.anisotropy = 8;
        const bump = new TT.CanvasTexture(b); bump.colorSpace = TT.NoColorSpace; bump.anisotropy = 8;
        return { map, bump };
      };
      // a sheet for the writing: the character(s) soaked a little into the wood (a soft edge and a faint halo)
      const sheet = (W, H, fn, fade) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); fn(g);
        const o = document.createElement('canvas'); o.width = W; o.height = H; const q = o.getContext('2d');
        q.filter = `blur(${(W / 256 * 2.2).toFixed(1)}px)`; q.globalAlpha = .35; q.drawImage(c, 0, 0); q.filter = `blur(${(W / 256 * .7).toFixed(1)}px)`; q.globalAlpha = 1; q.drawImage(c, 0, 0); q.filter = 'none'; o.fade = fade; return o; };
      const endT = K.tex(64, 64, (g, w, h) => { const n = K.noise(9), img = g.createImageData(w, h), d = img.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = .78 + n(x / 3, y / 14, 2) * .3, i = (y * w + x) * 4; d[i] = 96 * v; d[i + 1] = 68 * v; d[i + 2] = 40 * v; d[i + 3] = 255; } g.putImageData(img, 0, 0); }, { rep: [1, 1] });
      const sideM = K.mat({ map: endT, color: '#ffffff', roughness: .95 });
      const faceMat = (W, H, w, h, k, tone, ink) => { const t = wood(W, H, k, tone, ink, W / w);
        [t.map, t.bump].forEach(x => { x.repeat.set(1 / w, 1 / h); x.offset.set(.5, 0); });
        return K.mat({ map: t.map, bumpMap: t.bump, bumpScale: 1.4, color: '#ffffff', roughness: .93 }); };
      /* ---------- one piece: a small thick block, the sides nearly straight, the head a low rounded gable; cut by hand, worn ---------- */
      const piece = (txt, k, w, h, t, keep) => {
        const j = () => (rnd() - .5) * .12, sh = h * (.05 + rnd() * .1), tp = .86 + rnd() * .12, S = new TT.Shape(), r = .03 + rnd() * .04, lean = (rnd() - .5) * w * .22;
        const x0 = -w / 2 + j(), x1 = w / 2 + j(), xs0 = -w / 2 * tp + j() * .5, xs1 = w / 2 * tp + j() * .5, ys0 = h - sh + j(), ys1 = h - sh + j(), ax = lean, ay = h + j() * .3;
        S.moveTo(x0 + r, j() * .3); S.lineTo(x1 - r, j() * .3); S.quadraticCurveTo(x1, 0, x1, r);
        const bow = rnd() < .45 ? 0 : rnd() * .6;   // (some heads are two straight cuts, some a low arch)
        S.lineTo(xs1, ys1 - r); S.quadraticCurveTo(xs1, ys1, xs1 - r, ys1 + sh * 2 * r / w);          // the shoulder, its corner rubbed
        S.quadraticCurveTo((xs1 + ax) / 2 + w * .05 * bow, (ys1 + ay) / 2 + sh * .35 * bow, ax + w * .05, ay - sh * .1); S.quadraticCurveTo(ax, ay, ax - w * .05, ay - sh * .1);   // the blunt head
        S.quadraticCurveTo((xs0 + ax) / 2 - w * .05 * bow, (ys0 + ay) / 2 + sh * .35 * bow, xs0 + r, ys0 + sh * 2 * r / w); S.quadraticCurveTo(xs0, ys0, xs0, ys0 - r);
        S.lineTo(x0, r); S.quadraticCurveTo(x0, 0, x0 + r, j() * .3);
        const geo = new TT.ExtrudeGeometry(S, { depth: t - .1, bevelEnabled: true, bevelThickness: .035, bevelSize: .04, bevelSegments: 2, curveSegments: 5 });
        const W = 256, H = Math.round(256 * h / w), tone = rnd();
        const ink = txt ? sheet(W, H, g => { const nC = [...txt].length, fs = Math.min(W * 1.0, H * .98 / nC), o = { rnd, weight: .85 + rnd() * .8, slant: (rnd() - .5) * .2, wet: .5 + rnd() * .5 };
          SUMI.column(g, txt, W / 2 + (rnd() - .5) * W * .08, H * .5 - fs * nC * .5 + (rnd() - .3) * H * .04, fs, o); }, 1 - keep) : null;
        const m = new TT.Mesh(geo, [faceMat(W, H, w, h, k, tone, ink), sideM]); m.castShadow = m.receiveShadow = true; return m;
      };
      // a flat tablet (習書木簡 / 題箋軸), written in ink
      const tablet = (w, h, t, k, draw, outline, fade) => {
        const S = new TT.Shape(); outline(S, w, h);
        const geo = new TT.ExtrudeGeometry(S, { depth: t - .08, bevelEnabled: true, bevelThickness: .04, bevelSize: .05, bevelSegments: 2 });
        const W = w > h ? 1024 : 256, H = Math.round(W * h / w);
        const m = new TT.Mesh(geo, [faceMat(W, H, w, h, k, .3 + rnd() * .3, sheet(W, H, g => draw(g, W, H), fade)), sideM]); m.castShadow = m.receiveShadow = true; return m;
      };
      const lay = (m, x, z, rz, h) => { m.rotation.x = -Math.PI / 2; m.position.set(0, .85, h / 2); const o = new TT.Group(); o.add(m); o.position.set(x, 0, z); o.rotation.y = rz; G.add(o); return o; };   // face up, point away
      // ---- the practice tablet: broken, the names of pieces written over and over (酔像 · 金将 · 歩 · 歩兵 · 歩兵兵), the grain running its length
      // (written across the grain here: the painting is made upright and the strip turned, so the grain runs along the tablet)
      const TBW = 10.5, TBH = 4.8;
      const tb = tablet(TBH, TBW, .5, 3, (g, W, H) => {   // (painted with the tablet standing on end; columns therefore run across the canvas)
        g.save(); g.translate(W, 0); g.rotate(Math.PI / 2);   // now x runs along the tablet (0..H), y across it (0..W)
        const cols = ['酔像', '金将', '歩', '歩兵', '歩兵兵', '歩兵']; let x = H * .1;
        cols.forEach((c, i) => { const fs = W * (.2 + rnd() * .06), o = { rnd, weight: .95 + rnd() * .5, slant: (rnd() - .5) * .2, wet: .5 + rnd() * .5 }; SUMI.column(g, c, x, W * (.1 + rnd() * .08), fs, o); x += fs * (1.25 + rnd() * .35); });
        g.restore(); },
        (S, w, h) => { S.moveTo(-w / 2, 0); S.lineTo(w / 2, 0); S.lineTo(w / 2, h - .6); S.lineTo(w / 2 - .5, h); S.lineTo(w * .05, h - .3); S.lineTo(-w * .2, h - 1.1); S.lineTo(-w / 2, h - .7); S.lineTo(-w / 2 + .26, h * .16); S.lineTo(-w / 2, h * .12); S.closePath(); }, .45);
      { tb.rotation.x = -Math.PI / 2; tb.position.set(0, .85, 0); const o = new TT.Group(); o.add(tb); o.position.set(3.8 + TBW / 2, 0, -12.2); o.rotation.y = Math.PI / 2 + .06; G.add(o); }
      const SP = {}; SP.tab = [3.8, 1.4, -12.2];
      // ---- the two title-label rods: a flat label (the dates) with the stub of the rod
      const rod = (txt, k) => tablet(1.9, 7.2, .45, k, (g, W, H) => { const fs = W * .56, o = { rnd, weight: 1 + rnd() * .3, slant: (rnd() - .5) * .14, wet: .6 + rnd() * .4 }; SUMI.column(g, txt, W / 2, H * .03, Math.min(fs, H * .5 / 4), o); },
        (S, w, h) => { S.moveTo(-w * .22, 0); S.lineTo(w * .22, 0); S.lineTo(w * .22, h * .42); S.lineTo(w / 2, h * .46); S.lineTo(w / 2, h); S.lineTo(-w / 2, h); S.lineTo(-w / 2, h * .46); S.lineTo(-w * .22, h * .42); S.closePath(); }, .4);
      lay(rod('天喜六年', 11), -12.6, -12.4, -.2, 7.2); SP.t1 = [-12.6, 1.4, -9.0];
      lay(rod('承徳二年', 12), 14.6, 6.2, .12, 7.2); SP.t2 = [14.6, 1.4, 9.6];
      // ---- the 28 pieces: the 1992 set (16) and the 2013 set (12)
      const SZ = { 玉将: [2.6, 3.1], 金将: [2.4, 2.8], 銀将: [2.4, 2.8], 桂馬: [2.3, 2.7], 歩兵: [2.1, 2.5], 酔象: [1.5, 2.5], '': [2.2, 2.5] };   // (the bottom-left king of the photograph is 3.3 cm long: 文化遺産オンライン)
      const list = [['玉将', 3], ['金将', 4], ['銀将', 1], ['桂馬', 1], ['歩兵', 6], ['', 1], ['酔象', 1], ['桂馬', 1], ['歩兵', 7], ['', 3]];
      const P = []; list.forEach(([n, c]) => { for (let i = 0; i < c; i++) P.push(n); });
      // loose rows, as laid out in the photograph (order shuffled a little)
      const rows = [5, 6, 6, 6, 5]; let k = 0;
      const order = [0, 3, 24, 1, 14, 9, 4, 22, 15, 10, 5, 17, 2, 6, 18, 11, 7, 23, 16, 20, 8, 12, 19, 25, 21, 13, 26, 27];
      rows.forEach((n, ri) => { const z = -6.6 + ri * 3.9;
        for (let c = 0; c < n; c++, k++) { const nm = P[order[k]], [w0, h0] = SZ[nm], s = .9 + rnd() * .18, w = w0 * s * (.88 + rnd() * .22), h = h0 * s, t = nm === '酔象' ? .2 : .32 + rnd() * .16;
          const kr = rnd(), keep = nm ? (kr < .3 ? .2 + rnd() * .12 : kr < .85 ? .35 + rnd() * .18 : .47 + rnd() * .14) : 0;   // (most are nearly gone, a few still read)
          const m = piece(nm, k, w, h, t, keep), x = (c - (n - 1) / 2) * 4.2 + (rnd() - .5) * 1.1 + (ri % 2 ? .8 : -.4);
          const zz = z + (rnd() - .5) * .8; if (!SP[nm || 'none']) SP[nm || 'none'] = [x, 1.3, zz + h * .5];
          lay(m, x, zz, (rnd() - .5) * .5 + (rnd() < .2 ? Math.PI * (rnd() - .5) * .6 : 0), h); } });
      // the numbered details: a king, a gold, the drunk elephant, a pawn, an unmarked piece, the practice tablet, the two dated rods
      G.userData.spots = [SP['玉将'], SP['金将'], SP['酔象'], SP['歩兵'], SP.none, SP.tab, SP.t1, SP.t2];
      return G;
    },
  };
})();
