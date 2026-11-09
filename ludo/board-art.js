/* =====================================================================
   Ludo — the art boards (2026-11-09): extra designs for LudoBoard2D.drawBoard(rule, design), ludo only.
   · 'street'   street art: the four yards are painted panels in a raw, scrawled neo-expressionist manner (original
                pictures: crude faces, hand-lettered words, arrows, grids, drips, blocks of house paint), the track
                hand-drawn on paper — a 3D board (atlas/models/ludo.js)
   · 'mondrian' De Stijl: black bars, white fields and blocks of primary colour (2D and 3D)
   · 'cutout'   paper cut-outs: deckle-edged coloured papers, leaf and seaweed shapes, little cut stars (2D and 3D)
   · 'peg'      the paint of the wooden peg board (transparent ground; the 3D model lays it on wood and drills the holes)
   Every picture is drawn here from code (no images): the same SVG serves the 2D page, the design tiles and the 3D
   textures (an SVG drawn as an image cannot load files). Seeded, so a board looks the same every time.
   LudoBoardArt[design](geometry) → SVG markup (viewBox 0 0 15 15) · LudoBoardArt.holes() → [[x, y]…] (the peg holes)
   ===================================================================== */
(function () {
  'use strict';
  const B = () => window.LudoBoard2D;
  const COLS = [['#e2403a', '#a3241f', '#ffd9d4'], ['#2fa65a', '#1b6e39', '#d7f3df'], ['#f2c12e', '#b48a0e', '#fff3c9'], ['#2f7ad8', '#1b4f98', '#d6e6fb']];
  const YARD = [[0, 9], [0, 0], [9, 0], [9, 9]];
  const HOME = [p => [7, 13 - p], p => [1 + p, 7], p => [7, 1 + p], p => [13 - p, 7]];
  const TRI = [[[6, 9], [9, 9]], [[6, 6], [6, 9]], [[9, 6], [6, 6]], [[9, 9], [9, 6]]];
  const f = v => (Math.round(v * 1000) / 1000).toString();
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const track = () => B().LUDO_TRACK;
  const slots = s => [0, 1, 2, 3].map(k => B().geometry('ludo').yard(s, k));
  const starPts = (x, y, r, k = .45) => { const P = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * k : r; P.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return P; };
  const star = (x, y, r, k = .45, rot = -Math.PI / 2) => { let d = ''; for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, rr = i % 2 ? r * k : r; d += (i ? 'L' : 'M') + f(x + Math.cos(a) * rr) + ' ' + f(y + Math.sin(a) * rr); } return d + 'Z'; };
  const arrowD = (x, y, s, sz = .22) => { const a = [0, 90, 180, 270][s]; return `<path transform="translate(${f(x)} ${f(y)}) rotate(${a})" d="M${-sz} ${f(sz * .64)} 0 ${f(-sz * .73)} ${sz} ${f(sz * .64)}" fill="none" stroke-linecap="round" stroke-linejoin="round"`; };

  /* ---------- hand-drawn lines and lettering (street) ---------- */
  // a polyline with a wobble (each point nudged, long segments split): the marker in a hurried hand
  function wob(R, pts, j) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i];
      if (i) { const [px, py] = pts[i - 1], L = Math.hypot(x - px, y - py), n = Math.min(6, Math.floor(L / .35)); for (let k = 1; k <= n; k++) { const t = k / (n + 1); out.push([px + (x - px) * t + (R() - .5) * j, py + (y - py) * t + (R() - .5) * j]); } }
      out.push([x + (R() - .5) * j, y + (R() - .5) * j]);
    }
    return 'M' + out.map(([x, y]) => f(x) + ' ' + f(y)).join('L');
  }
  // a little stroke alphabet on a 1 × 1.4 cell (y down)
  const GL = {
    A: [[[0, 1.4], [.5, 0], [1, 1.4]], [[.2, .85], [.8, .85]]], B: [[[0, 0], [0, 1.4], [.7, 1.4], [1, 1.15], [1, .95], [.7, .7], [0, .7]], [[0, 0], [.6, 0], [.9, .2], [.9, .45], [.6, .7]]],
    C: [[[1, .2], [.7, 0], [.3, 0], [0, .3], [0, 1.1], [.3, 1.4], [.7, 1.4], [1, 1.2]]], D: [[[0, 0], [0, 1.4], [.6, 1.4], [1, 1], [1, .4], [.6, 0], [0, 0]]],
    E: [[[1, 0], [0, 0], [0, 1.4], [1, 1.4]], [[0, .7], [.7, .7]]], F: [[[1, 0], [0, 0], [0, 1.4]], [[0, .7], [.7, .7]]],
    G: [[[1, .2], [.7, 0], [.3, 0], [0, .3], [0, 1.1], [.3, 1.4], [.8, 1.4], [1, 1.1], [1, .75], [.55, .75]]], H: [[[0, 0], [0, 1.4]], [[1, 0], [1, 1.4]], [[0, .7], [1, .7]]],
    I: [[[.5, 0], [.5, 1.4]], [[.15, 0], [.85, 0]], [[.15, 1.4], [.85, 1.4]]], K: [[[0, 0], [0, 1.4]], [[1, 0], [0, .8]], [[.35, .55], [1, 1.4]]],
    L: [[[0, 0], [0, 1.4], [1, 1.4]]], M: [[[0, 1.4], [0, 0], [.5, .8], [1, 0], [1, 1.4]]], N: [[[0, 1.4], [0, 0], [1, 1.4], [1, 0]]],
    O: [[[.3, 0], [.7, 0], [1, .3], [1, 1.1], [.7, 1.4], [.3, 1.4], [0, 1.1], [0, .3], [.3, 0]]], P: [[[0, 1.4], [0, 0], [.7, 0], [1, .25], [1, .5], [.7, .7], [0, .7]]],
    R: [[[0, 1.4], [0, 0], [.7, 0], [1, .25], [1, .5], [.7, .7], [0, .7]], [[.5, .7], [1, 1.4]]],
    S: [[[1, .15], [.7, 0], [.3, 0], [0, .25], [0, .5], [.3, .7], [.7, .7], [1, .9], [1, 1.15], [.7, 1.4], [.3, 1.4], [0, 1.25]]],
    T: [[[0, 0], [1, 0]], [[.5, 0], [.5, 1.4]]], U: [[[0, 0], [0, 1.1], [.3, 1.4], [.7, 1.4], [1, 1.1], [1, 0]]], V: [[[0, 0], [.5, 1.4], [1, 0]]],
    W: [[[0, 0], [.25, 1.4], [.5, .6], [.75, 1.4], [1, 0]]], X: [[[0, 0], [1, 1.4]], [[1, 0], [0, 1.4]]], Y: [[[0, 0], [.5, .7], [1, 0]], [[.5, .7], [.5, 1.4]]],
    '!': [[[.5, 0], [.5, .95]], [[.5, 1.25], [.5, 1.4]]], '?': [[[0, .3], [.3, 0], [.7, 0], [1, .3], [1, .55], [.5, .85], [.5, 1.02]], [[.5, 1.28], [.5, 1.4]]],
    '1': [[[.2, .3], [.55, 0], [.55, 1.4]], [[.2, 1.4], [.9, 1.4]]], '2': [[[0, .3], [.3, 0], [.7, 0], [1, .3], [1, .55], [0, 1.4], [1, 1.4]]],
    '3': [[[0, .15], [.3, 0], [.7, 0], [1, .3], [.7, .65], [.35, .65]], [[.7, .65], [1, 1], [.7, 1.4], [.3, 1.4], [0, 1.25]]], '4': [[[.75, 1.4], [.75, 0], [0, .95], [1, .95]]],
    '5': [[[1, 0], [.1, 0], [0, .65], [.6, .55], [1, .85], [1, 1.1], [.7, 1.4], [.2, 1.4], [0, 1.2]]], '6': [[[.9, .1], [.5, 0], [.1, .35], [0, .9], [.2, 1.35], [.6, 1.4], [.95, 1.1], [.85, .75], [.45, .65], [.05, .9]]],
    '-': [[[.2, .7], [.8, .7]]], '+': [[[.5, .35], [.5, 1.05]], [[.15, .7], [.85, .7]]], '=': [[[.1, .55], [.9, .55]], [[.1, .9], [.9, .9]]], '.': [[[.45, 1.32], [.55, 1.4]]], ' ': [],
  };
  // a word in marker strokes: x, y = top-left, h = letter height, rot in degrees
  function word(R, txt, x, y, h, col, sw, rot = 0) {
    const w = h / 1.4 * .78, gap = w * .32, ds = [];
    [...txt].forEach((c, i) => { const g = GL[c] || []; const ox = i * (w + gap) + (R() - .5) * w * .15, oy = (R() - .5) * h * .12, sk = (R() - .5) * .15;
      g.forEach(pl => ds.push(wob(R, pl.map(([gx, gy]) => [ox + gx * w + gy * sk * w, oy + gy * h / 1.4]), h * .05))); });
    return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="${ds.join('')}" fill="none" stroke="${col}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  const wordW = (txt, h) => { const w = h / 1.4 * .78; return txt.length * w * 1.32 - w * .32; };

  /* ---------- 1 · street ---------- */
  const PAINT = ['#f2c12e', '#2f7ad8', '#e2403a', '#2fa65a', '#f08a2e', '#7cc6c4', '#efe6cf', '#e8b4c4', '#b5462d', '#8fb7e6', '#d9d2b8'];
  const WORDS = ['LUDO', 'SIX!', 'HOME', 'RUN', 'GO', 'ROLL', 'DICE', 'SAFE', 'WIN?', '1 2 3', '4 5 6', 'ONE MORE', 'STAR', 'HOT', 'RED', 'BLUE', 'NOW', 'BACK TO GO', 'X X X', 'OK'];
  function panel(s) {
    const R = rng(1009 + s * 7919), [x0, y0] = YARD[s], X0 = x0 + .62, Y0 = y0 + .62, W = 4.76, o = [];
    const id = 'stP' + s;
    o.push(`<clipPath id="${id}"><rect x="${f(X0)}" y="${f(Y0)}" width="${W}" height="${W}" rx=".18"/></clipPath><g clip-path="url(#${id})">`);
    // the ground and blocks of house paint, brushed (a few strokes of a near colour over each block)
    const pick = () => PAINT[Math.floor(R() * PAINT.length)];
    const ground = [COLS[s][0], '#efe6cf', '#f2c12e', '#7cc6c4'][Math.floor(R() * 4)];
    o.push(`<rect x="${f(X0)}" y="${f(Y0)}" width="${W}" height="${W}" fill="${ground}"/>`);
    for (let i = 0; i < 7; i++) {
      const w = .8 + R() * 2.4, h = .7 + R() * 2.2, x = X0 - .3 + R() * (W - w + .6), y = Y0 - .3 + R() * (W - h + .6), c = i < 2 ? COLS[s][0] : pick(), a = (R() - .5) * 8;
      o.push(`<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c}" transform="rotate(${f(a)} ${f(x + w / 2)} ${f(y + h / 2)})"/>`);
      for (let k = 0; k < 5; k++) { const yy = y + R() * h; o.push(`<path d="${wob(R, [[x + R() * .2, yy], [x + w * (.4 + R() * .6), yy + (R() - .5) * .1]], .05)}" stroke="${R() < .5 ? '#fff' : '#000'}" stroke-opacity="${f(.06 + R() * .1)}" stroke-width="${f(.08 + R() * .18)}" fill="none" stroke-linecap="round" transform="rotate(${f(a)} ${f(x + w / 2)} ${f(y + h / 2)})"/>`); }
    }
    // white-out patches with lettering
    for (let i = 0; i < 2; i++) {
      const w = 1.4 + R() * 1.4, h = .55 + R() * .5, x = X0 + R() * (W - w), y = Y0 + R() * (W - h);
      o.push(`<path d="${wob(R, [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]], .08)}" fill="#f7f2e4" fill-opacity=".92"/>`);
      const t = WORDS[Math.floor(R() * WORDS.length)], hh = Math.min(h * .62, w / Math.max(1, t.length) * 1.25);
      o.push(word(R, t, x + .12, y + (h - hh) / 2, hh, '#151515', .06));
    }
    // a crude face (original): a head of wobbly lines, ringed eyes, a grid of teeth, a scrawl of hair
    { const cx = X0 + W / 2 + (R() - .5) * .3, cy = Y0 + W / 2 + (R() - .5) * .2, r = .92 + R() * .12, fc = ['#c8573a', '#7c4a2a', '#e8a33a', '#3f73b8', '#efe6cf'][Math.floor(R() * 5)];
      const head = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2, rr = r * (1 + (R() - .5) * .18); head.push([cx + Math.cos(a) * rr * .86, cy + Math.sin(a) * rr]); }
      o.push(`<path d="${wob(R, head, .06)}Z" fill="${fc}" stroke="#141414" stroke-width=".085" stroke-linejoin="round"/>`);
      for (let k = 0; k < 3; k++) { const yy = cy - r * .2 + k * .25; o.push(`<path d="${wob(R, [[cx - r * .7, yy], [cx + r * .6, yy + .05]], .06)}" stroke="#fff" stroke-opacity=".18" stroke-width=".14" fill="none"/>`); }
      [-1, 1].forEach(sx => { const ex = cx + sx * r * .36, ey = cy - r * .22, er = .17 + R() * .07;
        o.push(`<circle cx="${f(ex)}" cy="${f(ey)}" r="${f(er)}" fill="#f7f2e4" stroke="#141414" stroke-width=".06"/>`);
        o.push(R() < .5 ? `<circle cx="${f(ex + (R() - .5) * .08)}" cy="${f(ey)}" r="${f(er * .42)}" fill="#141414"/>` : `<path d="${wob(R, [[ex - er * .6, ey - er * .6], [ex + er * .6, ey + er * .6]], .02)}${wob(R, [[ex + er * .6, ey - er * .6], [ex - er * .6, ey + er * .6]], .02)}" stroke="#141414" stroke-width=".07" fill="none" stroke-linecap="round"/>`); });
      o.push(`<path d="${wob(R, [[cx - .05, cy - .05], [cx - .12, cy + .22], [cx + .06, cy + .25]], .03)}" stroke="#141414" stroke-width=".06" fill="none" stroke-linecap="round"/>`);
      const mw = r * .95, mh = .3, mx = cx - mw / 2, my = cy + r * .38;
      o.push(`<path d="${wob(R, [[mx, my], [mx + mw, my], [mx + mw, my + mh], [mx, my + mh], [mx, my]], .03)}" fill="#f7f2e4" stroke="#141414" stroke-width=".06"/>`);
      let td = ''; for (let k = 1; k < 7; k++) td += wob(R, [[mx + mw * k / 7, my], [mx + mw * k / 7, my + mh]], .02); td += wob(R, [[mx, my + mh / 2], [mx + mw, my + mh / 2]], .02);
      o.push(`<path d="${td}" stroke="#141414" stroke-width=".04" fill="none"/>`);
      let hd = ''; for (let k = 0; k < 11; k++) { const a = Math.PI * (1.1 + k / 10 * .8), bx = cx + Math.cos(a) * r * .86, by = cy + Math.sin(a) * r; hd += wob(R, [[bx, by], [bx + Math.cos(a) * (.25 + R() * .3), by + Math.sin(a) * (.3 + R() * .35)]], .04); }
      o.push(`<path d="${hd}" stroke="#141414" stroke-width=".06" fill="none" stroke-linecap="round"/>`);
    }
    // marks: rough stars, arrows, grids, crosses, zigzags, dots, drips, a crossed-out word
    for (let i = 0; i < 9; i++) {
      const x = X0 + .3 + R() * (W - .6), y = Y0 + .3 + R() * (W - .6), k = Math.floor(R() * 8), c = R() < .75 ? '#141414' : '#f7f2e4', sw = .05 + R() * .03;
      if (k === 0) o.push(`<path d="${wob(R, starPts(x, y, .3 + R() * .2), .05)}" fill="none" stroke="${c}" stroke-width="${f(sw)}" stroke-linejoin="round"/>`);
      else if (k === 1) { const L = .5 + R() * .7, a = R() * Math.PI * 2, ex = x + Math.cos(a) * L, ey = y + Math.sin(a) * L; o.push(`<path d="${wob(R, [[x, y], [ex, ey]], .04)}${wob(R, [[ex - Math.cos(a - .5) * .2, ey - Math.sin(a - .5) * .2], [ex, ey], [ex - Math.cos(a + .5) * .2, ey - Math.sin(a + .5) * .2]], .02)}" fill="none" stroke="${c}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`); }
      else if (k === 2) { const g = .2; let d = ''; for (let j = 0; j < 4; j++) { d += wob(R, [[x + j * g, y], [x + j * g, y + 3 * g]], .02) + wob(R, [[x, y + j * g], [x + 3 * g, y + j * g]], .02); } o.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${f(sw * .8)}" stroke-linecap="round"/>`); }
      else if (k === 3) o.push(`<path d="${wob(R, [[x - .15, y - .15], [x + .15, y + .15]], .03)}${wob(R, [[x + .15, y - .15], [x - .15, y + .15]], .03)}" fill="none" stroke="${c}" stroke-width="${f(sw * 1.3)}" stroke-linecap="round"/>`);
      else if (k === 4) { const P = []; for (let j = 0; j < 7; j++) P.push([x + j * .12, y + (j % 2 ? .16 : 0)]); o.push(`<path d="${wob(R, P, .02)}" fill="none" stroke="${c}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"/>`); }
      else if (k === 5) { for (let j = 0; j < 5; j++) o.push(`<circle cx="${f(x + (R() - .5) * .5)}" cy="${f(y + (R() - .5) * .5)}" r="${f(.03 + R() * .05)}" fill="${c}"/>`); }
      else if (k === 6) { const c2 = PAINT[Math.floor(R() * PAINT.length)]; for (let j = 0; j < 3; j++) { const dx = x + j * .14, L = .25 + R() * .6; o.push(`<path d="M${f(dx)} ${f(y)}V${f(y + L)}" stroke="${c2}" stroke-width=".07" stroke-linecap="round"/><circle cx="${f(dx)}" cy="${f(y + L)}" r=".06" fill="${c2}"/>`); } }
      else { const t = WORDS[Math.floor(R() * WORDS.length)], h = .32 + R() * .14; o.push(word(R, t, x - .4, y - h / 2, h, c, sw, (R() - .5) * 20)); if (R() < .5) o.push(`<path d="${wob(R, [[x - .5, y + .02], [x - .4 + wordW(t, h) + .1, y - .04]], .04)}" stroke="${c}" stroke-width="${f(sw * 1.4)}" fill="none" stroke-linecap="round"/>`); }
    }
    o.push('</g>');
    // the frame of the panel: the seat's colour, then a hand-drawn black edge
    o.push(`<path d="M${x0 + .05} ${y0 + .05}h5.9v5.9h-5.9zM${f(X0)} ${f(Y0)}v${W}h${W}v${-W}z" fill="${COLS[s][0]}" fill-rule="evenodd"/>`);
    o.push(`<path d="${wob(R, [[X0, Y0], [X0 + W, Y0], [X0 + W, Y0 + W], [X0, Y0 + W], [X0, Y0]], .05)}" fill="none" stroke="#141414" stroke-width=".07" stroke-linejoin="round"/>`);
    // the four places for the pieces: paper discs with a marker ring
    slots(s).forEach(([px, py]) => {
      o.push(`<circle cx="${f(px)}" cy="${f(py)}" r=".5" fill="#f7f2e4" fill-opacity=".5"/>`);
      const P = []; for (let i = 0; i <= 16; i++) { const a = i / 15 * Math.PI * 2 + .7 * s; P.push([px + Math.cos(a) * .55, py + Math.sin(a) * .55]); }
      o.push(`<path d="${wob(R, P, .05)}" fill="none" stroke="#141414" stroke-width=".07" stroke-linecap="round"/>`);
    });
    return o.join('');
  }
  function street() {
    const R = rng(77), o = [], T = track();
    // the ground: old paper, a few stains and splashes round the edge
    o.push(`<rect x="-.3" y="-.3" width="15.6" height="15.6" rx=".2" fill="#f1ebdb"/>`);
    for (let i = 0; i < 26; i++) { const x = R() * 15, y = R() * 15, r = .05 + R() * .25; o.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${PAINT[Math.floor(R() * PAINT.length)]}" fill-opacity="${f(.25 + R() * .4)}"/>`); }
    for (let s = 0; s < 4; s++) o.push(panel(s));
    // the track: paper squares in marker
    T.forEach(([x, y], i) => {
      const st = i % 13 === 0 ? i / 13 : -1;
      if (st >= 0) o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${COLS[st][0]}"/>`);
      o.push(`<path d="${wob(R, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]], .045)}" fill="none" stroke="#151515" stroke-width=".05" stroke-linejoin="round"/>`);
      if (i % 13 === 8) { o.push(`<path d="${wob(R, starPts(x + .5, y + .5, .34), .04)}" fill="#f2c12e" fill-opacity=".55" stroke="#151515" stroke-width=".05" stroke-linejoin="round"/>`); }
      if (st >= 0) o.push(arrowD(x + .5, y + .5, st) + ` stroke="#fff" stroke-width=".1"/>`);
    });
    // home columns: the colour with white dots (as painted boards have)
    for (let s = 0; s < 4; s++) for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p);
      o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${COLS[s][0]}"/><path d="${wob(R, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1], [x, y]], .04)}" fill="none" stroke="#151515" stroke-width=".05"/><circle cx="${x + .5}" cy="${y + .5}" r=".17" fill="#f7f2e4"/>`); }
    // the centre: four painted triangles, hatched, and a hand-drawn star
    TRI.forEach(([[ax, ay], [bx, by]], s) => {
      o.push(`<path d="M${ax} ${ay}L${bx} ${by}L7.5 7.5z" fill="${COLS[s][0]}"/>`);
      let d = ''; for (let k = 1; k < 6; k++) { const t = k / 6; d += wob(R, [[ax + (7.5 - ax) * t * .9, ay + (7.5 - ay) * t * .9], [bx + (7.5 - bx) * t * .9, by + (7.5 - by) * t * .9]], .05); }
      o.push(`<path d="${d}" stroke="#000" stroke-opacity=".18" stroke-width=".05" fill="none"/>`);
      o.push(`<path d="${wob(R, [[ax, ay], [bx, by], [7.5, 7.5], [ax, ay]], .04)}" fill="none" stroke="#151515" stroke-width=".06" stroke-linejoin="round"/>`);
    });
    { o.push(`<path d="${wob(R, starPts(7.5, 7.5, .5), .05)}" fill="#f7f2e4" stroke="#151515" stroke-width=".07" stroke-linejoin="round"/>`); }
    // a few marks on the paper between the arms (outside the play squares)
    o.push(`<rect x="0" y="0" width="15" height="15" fill="none" stroke="#151515" stroke-width=".06"/>`);
    return o.join('');
  }

  /* ---------- 2 · mondrian (De Stijl) ---------- */
  const MC = ['#d6382c', '#2a8a4c', '#f3c623', '#1f4fa0'];   // the seats in a primary palette (green stands in for the fourth)
  function mondrian() {
    const o = [], T = track(), K = '#121212', LW = .1;
    o.push(`<rect x="-.3" y="-.3" width="15.6" height="15.6" fill="#f5f2e9"/>`);
    // each yard: a composition of bars — blocks of the seat's colour only (2026-11-09: no other primary beside a seat), grey and white fields
    const comp = [   // [x, y, w, h, fill: 'S' seat · 'G' grey · 'K' black · 'W' white] in yard cells (0..6), mirrored per seat
      [0, 0, 3.9, 1.05, 'S'], [3.9, 0, 2.1, 1.05, 'W'], [0, 1.05, 1.05, 3.1, 'W'], [0, 4.15, 1.05, 1.85, 'S'], [4.95, 1.05, 1.05, 2.0, 'G'], [4.95, 3.05, 1.05, 2.95, 'S'],
      [1.05, 4.95, 2.6, 1.05, 'W'], [3.65, 4.95, 1.3, 1.05, 'K'],
    ];
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = YARD[s], fx = s === 0 || s === 1, fy = s === 1 || s === 2, P = MC[(s + 2) % 4];
      const tr = (x, y, w, h) => [x0 + (fx ? x : 6 - x - w), y0 + (fy ? y : 6 - y - h), w, h];
      comp.forEach(([x, y, w, h, c]) => { const [X, Y, Wd, Ht] = tr(x, y, w, h); o.push(`<rect x="${f(X)}" y="${f(Y)}" width="${f(Wd)}" height="${f(Ht)}" fill="${{ S: MC[s], P, G: '#d8d4ca', K, W: '#f5f2e9' }[c]}" stroke="${K}" stroke-width="${LW}"/>`); });
      // the inner field with the four places: white with black bars; each place a square of the seat's colour
      o.push(`<rect x="${x0 + 1.05}" y="${y0 + 1.05}" width="3.9" height="3.9" fill="#fbfaf5" stroke="${K}" stroke-width="${LW}"/>`);
      o.push(`<path d="M${x0 + 3} ${y0 + 1.05}V${y0 + 4.95}M${x0 + 1.05} ${y0 + 3}H${x0 + 4.95}" stroke="${K}" stroke-width=".05"/>`);
      slots(s).forEach(([px, py]) => o.push(`<rect x="${f(px - .52)}" y="${f(py - .52)}" width="1.04" height="1.04" fill="${MC[s]}" fill-opacity=".22" stroke="${K}" stroke-width=".07"/>`));
    }
    T.forEach(([x, y], i) => {
      const st = i % 13 === 0 ? i / 13 : -1;
      o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${st >= 0 ? MC[st] : '#fbfaf5'}" stroke="${K}" stroke-width=".07"/>`);
      if (i % 13 === 8) o.push(`<path d="${star(x + .5, y + .5, .3)}" fill="none" stroke="${K}" stroke-width=".05" stroke-linejoin="round"/><rect x="${x + .06}" y="${y + .06}" width=".18" height=".18" fill="${K}"/>`);
      if (st >= 0) o.push(arrowD(x + .5, y + .5, st) + ` stroke="#fff" stroke-width=".1"/>`);
    });
    for (let s = 0; s < 4; s++) for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p); o.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${MC[s]}" stroke="${K}" stroke-width=".07"/>`); }
    TRI.forEach(([[ax, ay], [bx, by]], s) => o.push(`<path d="M${ax} ${ay}L${bx} ${by}L7.5 7.5z" fill="${MC[s]}" stroke="${K}" stroke-width=".09" stroke-linejoin="miter"/>`));
    o.push(`<rect x="7.22" y="7.22" width=".56" height=".56" fill="#fbfaf5" stroke="${K}" stroke-width=".07" transform="rotate(45 7.5 7.5)"/>`);
    o.push(`<rect x="0" y="0" width="15" height="15" fill="none" stroke="${K}" stroke-width=".16"/>`);
    return o.join('');
  }

  /* ---------- 3 · cut-outs ---------- */
  const CC = ['#e0473a', '#2f9a62', '#f0b92c', '#2559b8'];
  // a paper edge: a polygon nudged a little at many points (scissors, not a ruler)
  function cutPoly(R, pts, j) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y] = pts[i], [nx, ny] = pts[(i + 1) % pts.length], L = Math.hypot(nx - x, ny - y), n = Math.max(1, Math.floor(L / .22));
      for (let k = 0; k < n; k++) { const t = k / n; out.push([x + (nx - x) * t + (R() - .5) * j, y + (ny - y) * t + (R() - .5) * j]); }
    }
    return 'M' + out.map(([x, y]) => f(x) + ' ' + f(y)).join('L') + 'Z';
  }
  // a leaf / seaweed cut-out: a curving stem, lobes swelling on both sides out of step, smooth (catmull-rom → bézier)
  function smooth(P) {
    const n = P.length, g = i => P[(i + n) % n]; let d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
    for (let i = 0; i < n; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      d += 'C' + f(p1[0] + (p2[0] - p0[0]) / 6) + ' ' + f(p1[1] + (p2[1] - p0[1]) / 6) + ' ' + f(p2[0] - (p3[0] - p1[0]) / 6) + ' ' + f(p2[1] - (p3[1] - p1[1]) / 6) + ' ' + f(p2[0]) + ' ' + f(p2[1]); }
    return d + 'Z';
  }
  // a seaweed cut-out: a tapering stem with long rounded fingers, alternately left and right, rising toward the tip
  function algae(R, cx, cy, sz, rot, lobes = 4) {
    const o = [`<path d="M${f(-sz * .045)} ${f(sz * .5)}Q${f(sz * .06)} 0 0 ${f(-sz * .5)}Q${f(sz * .1)} 0 ${f(sz * .045)} ${f(sz * .5)}Z"/>`];
    for (let i = 0; i < lobes * 2; i++) {
      const t = .12 + i / (lobes * 2) * .8, side = i % 2 ? 1 : -1, y = sz * (.5 - t), fl = sz * (.16 + .2 * Math.sin(Math.PI * t)) * (.85 + R() * .3), a = side * (38 + R() * 20) - 90;
      const ax = Math.cos(a * Math.PI / 180), ay = Math.sin(a * Math.PI / 180), mx = ax * fl * .5, my = y + ay * fl * .5;
      o.push(`<ellipse cx="${f(mx)}" cy="${f(my)}" rx="${f(fl * .52)}" ry="${f(fl * (.12 + R() * .04))}" transform="rotate(${f(a)} ${f(mx)} ${f(my)})"/>`);
    }
    o.push(`<ellipse cx="0" cy="${f(-sz * .5)}" rx="${f(sz * .07)}" ry="${f(sz * .13)}"/>`);
    return [`<g transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})"`, o];
  }
  const leaf = (R, cx, cy, sz, rot, lobes, fill) => { const [g, o] = algae(R, cx, cy, sz, rot, lobes); return g + ` fill="${fill}" filter="url(#coSh)">` + o.join('') + '</g>'; };
  // a little cut spiral (a strip of paper wound in)
  function spiral(cx, cy, r, rot) { let d = ''; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 3.2 + rot, rr = r * (.15 + .85 * t); d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * rr) + ' ' + f(cy + Math.sin(a) * rr); } return d; }
  function cutout() {
    const R = rng(4242), o = [], T = track();
    o.push(`<defs><filter id="coSh" x="-.1" y="-.1" width="1.2" height="1.2"><feDropShadow dx=".03" dy=".04" stdDeviation=".025" flood-color="#3a2a12" flood-opacity=".35"/></filter></defs>`);
    o.push(`<rect x="-.3" y="-.3" width="15.6" height="15.6" fill="#e9dcc0"/>`);
    // the paper ground: soft fibres
    for (let i = 0; i < 60; i++) { const x = R() * 15, y = R() * 15; o.push(`<path d="M${f(x)} ${f(y)}q${f((R() - .5) * .6)} ${f((R() - .5) * .3)} ${f((R() - .5) * 1.2)} ${f((R() - .5) * .4)}" stroke="#bfa77a" stroke-opacity=".25" stroke-width=".015" fill="none"/>`); }
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = YARD[s], c = CC[s], back = ['#1d2a5e', '#f3ead6', '#162b52', '#f3ead6'][s];
      o.push(`<g filter="url(#coSh)"><path d="${cutPoly(R, [[x0 + .12, y0 + .12], [x0 + 5.88, y0 + .12], [x0 + 5.88, y0 + 5.88], [x0 + .12, y0 + 5.88]], .07)}" fill="${c}"/></g>`);
      o.push(`<path d="${cutPoly(R, [[x0 + .7, y0 + .7], [x0 + 5.3, y0 + .7], [x0 + 5.3, y0 + 5.3], [x0 + .7, y0 + 5.3]], .06)}" fill="${back}"/>`);
      // one big seaweed across the field (under the places), two small leaves in the free corners, a cut star, a spiral, spots
      const lc = back === '#f3ead6' ? CC[(s + 3) % 4] : '#f3ead6', lc2 = back === '#f3ead6' ? CC[(s + 2) % 4] : CC[(s + 1) % 4], d45 = [45, -45, 45, -45][s];
      o.push(leaf(R, x0 + 3, y0 + 3, 4.8, d45 + (R() - .5) * 10, 4, lc));
      o.push(leaf(R, x0 + 3 + (s % 2 ? -1 : 1) * 1.6, y0 + 3 - 1.6, 1.7, d45 + 90 + (R() - .5) * 20, 2, lc2));
      o.push(leaf(R, x0 + 3 - (s % 2 ? -1 : 1) * 1.6, y0 + 3 + 1.6, 1.7, d45 + 270 + (R() - .5) * 20, 2, lc2));
      o.push(`<path d="${spiral(x0 + 1.05, y0 + 3, .32, R() * 6)}" fill="none" stroke="${lc2}" stroke-width=".09" stroke-linecap="round"/>`);
      o.push(`<path d="${star(x0 + 4.95, y0 + 3, .3, .42, R())}" fill="${lc2}" filter="url(#coSh)"/>`);
      [[3, .98], [3, 5.02]].forEach(([dx, dy]) => o.push(`<circle cx="${f(x0 + dx)}" cy="${f(y0 + dy)}" r="${f(.1 + R() * .05)}" fill="${lc2}"/>`));
      slots(s).forEach(([px, py]) => o.push(`<path d="${smooth(Array.from({ length: 12 }, (_, i) => [px + Math.cos(i / 12 * Math.PI * 2) * (.58 + R() * .04), py + Math.sin(i / 12 * Math.PI * 2) * (.58 + R() * .04)]))}" fill="#f7f0de" stroke="${c}" stroke-width=".08" filter="url(#coSh)"/>`));
    }
    // the track: cut squares of paper on the kraft ground (the gaps are the lines)
    T.forEach(([x, y], i) => {
      const st = i % 13 === 0 ? i / 13 : -1;
      o.push(`<path d="${cutPoly(R, [[x + .05, y + .05], [x + .95, y + .05], [x + .95, y + .95], [x + .05, y + .95]], .03)}" fill="${st >= 0 ? CC[st] : '#f7f0de'}" filter="url(#coSh)"/>`);
      if (i % 13 === 8) o.push(`<path d="${star(x + .5, y + .5, .3, .45, -Math.PI / 2 + (R() - .5) * .4)}" fill="#e7a83a"/>`);
      if (st >= 0) o.push(arrowD(x + .5, y + .5, st) + ` stroke="#fff" stroke-width=".1"/>`);
    });
    for (let s = 0; s < 4; s++) for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p); o.push(`<path d="${cutPoly(R, [[x + .05, y + .05], [x + .95, y + .05], [x + .95, y + .95], [x + .05, y + .95]], .03)}" fill="${CC[s]}" filter="url(#coSh)"/>`); }
    TRI.forEach(([[ax, ay], [bx, by]], s) => o.push(`<path d="${cutPoly(R, [[ax + (7.5 - ax) * .04, ay + (7.5 - ay) * .04], [bx + (7.5 - bx) * .04, by + (7.5 - by) * .04], [7.5, 7.5]], .04)}" fill="${CC[s]}" filter="url(#coSh)"/>`));
    o.push(`<path d="${star(7.5, 7.5, .42, .42)}" fill="#f7f0de" filter="url(#coSh)"/>`);
    return o.join('');
  }

  /* ---------- 4 · the peg board's paint (3D) ---------- */
  function holes() {
    const H = [];
    track().forEach(([x, y]) => H.push([x + .5, y + .5]));
    for (let s = 0; s < 4; s++) { for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p); H.push([x + .5, y + .5]); } slots(s).forEach(q => H.push(q)); }
    return H;
  }
  function peg() {
    const o = [], T = track(), R = rng(9);
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = YARD[s], c = COLS[s][0];
      o.push(`<circle cx="${x0 + 3}" cy="${y0 + 3}" r="2.15" fill="${c}" fill-opacity=".9"/><circle cx="${x0 + 3}" cy="${y0 + 3}" r="1.95" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".05"/><circle cx="${x0 + 3}" cy="${y0 + 3}" r="2.4" fill="none" stroke="${c}" stroke-opacity=".7" stroke-width=".06"/>`);
      // the home lane and its start square: one painted strip with round ends
      const [hx, hy] = HOME[s](0), [ex, ey] = HOME[s](4), sx = Math.min(hx, ex), sy = Math.min(hy, ey), w = Math.abs(ex - hx) + 1, h = Math.abs(ey - hy) + 1;
      o.push(`<rect x="${sx + .06}" y="${sy + .06}" width="${w - .12}" height="${h - .12}" rx=".44" fill="${c}" fill-opacity=".9"/>`);
      const [tx, ty] = T[s * 13]; o.push(`<rect x="${tx + .06}" y="${ty + .06}" width=".88" height=".88" rx=".44" fill="${c}" fill-opacity=".9"/>`);
    }
    // the start labels: on the yard side of each start square, reading toward the board's centre
    for (let s = 0; s < 4; s++) o.push(`<g transform="rotate(${s * 90} 7.5 7.5) translate(5.5 13.6) rotate(-90)">${word(R, 'START', -.95, -.32, .3, COLS[s][1], .055)}<path d="M-.95 .16H.62M.45 .05.62 .16.45 .27" stroke="${COLS[s][1]}" stroke-width=".055" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`);
    T.forEach(([x, y], i) => { if (i % 13 === 8) o.push(`<path d="${star(x + .5, y + .5, .5, .5)}" fill="#f6e6c6" fill-opacity=".75" stroke="#b07a3c" stroke-width=".03"/>`); });
    TRI.forEach(([[ax, ay], [bx, by]], s) => o.push(`<path d="M${ax + (7.5 - ax) * .12} ${ay + (7.5 - ay) * .12}L${bx + (7.5 - bx) * .12} ${by + (7.5 - by) * .12}L7.5 7.5z" fill="${COLS[s][0]}" fill-opacity=".9"/>`));
    return o.join('');
  }

  /* ---------- 5 · marble inlay (pietra dura, 3D) ----------
     White veined marble; the colours are inlaid stones — carnelian (red), malachite (green), amber (yellow), lapis lazuli
     (blue, with flecks of pyrite) —, the lines and the safe stars are brass let into the stone, the four places of a yard
     black marble ringed in brass. The stones' patterns are SVG noise (feTurbulence), one filter per stone over all its pieces. */
  const STONE = [
    { base: '#a8321f', vein: '#e2774a', id: 'mbR', bf: '.55 .55', type: 'fractalNoise', oct: 4, tbl: '0 .1 .5 .9 1', a: .75 },     // carnelian: cloudy
    { base: '#0f6b3f', vein: '#05301b', id: 'mbG', bf: '.22 .22', type: 'turbulence', oct: 3, tbl: '0 1 0 1 0 1 0 1 0 1 0 1', a: .7, disc: 1 },   // malachite: banded
    { base: '#d99018', vein: '#f7cf6a', id: 'mbY', bf: '.35 .5', type: 'fractalNoise', oct: 4, tbl: '0 0 .3 .8 1', a: .8 },         // amber: warm clouds
    { base: '#1d3790', vein: '#4f74d0', id: 'mbB', bf: '.6 .6', type: 'fractalNoise', oct: 4, tbl: '0 0 .2 .7 1', a: .55, gold: 1 },  // lapis lazuli
  ];
  function stoneFilter(S) {
    return `<filter id="${S.id}" x="-.02" y="-.02" width="1.04" height="1.04" color-interpolation-filters="sRGB">`
      + `<feTurbulence type="${S.type}" baseFrequency="${S.bf}" numOctaves="${S.oct}" seed="${S.id.charCodeAt(2)}" result="n"/>`
      + `<feComponentTransfer in="n" result="t"><feFuncR type="${S.disc ? 'discrete' : 'table'}" tableValues="${S.tbl}"/></feComponentTransfer>`
      + `<feColorMatrix in="t" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${S.a} 0 0 0 0" result="a"/>`
      + `<feFlood flood-color="${S.vein}"/><feComposite in2="a" operator="in" result="v"/>`
      + (S.gold ? `<feTurbulence type="fractalNoise" baseFrequency="6" numOctaves="2" seed="7" result="g0"/><feComponentTransfer in="g0" result="g1"><feFuncR type="discrete" tableValues="0 0 0 0 0 0 0 0 1 1"/></feComponentTransfer><feColorMatrix in="g1" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0" result="ga"/><feFlood flood-color="#e8c768"/><feComposite in2="ga" operator="in" result="gv"/><feMerge result="v2"><feMergeNode in="v"/><feMergeNode in="gv"/></feMerge>` : '')
      + `<feComposite in="${S.gold ? 'v2' : 'v'}" in2="SourceAlpha" operator="in" result="vc"/>`
      + `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vc"/></feMerge></filter>`;
  }
  function marble() {
    const o = [], T = track(), BR = '#c9a04a', BRd = '#8a6a24';
    o.push('<defs>' + STONE.map(stoneFilter).join('')
      // white marble: soft grey clouds and thin veins (ridges of turbulence)
      + `<filter id="mbW" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".09 .16" numOctaves="5" seed="11" result="n"/>`
      + `<feComponentTransfer in="n" result="r"><feFuncR type="table" tableValues="0 0 0 .15 1 .15 0 0 0"/></feComponentTransfer><feColorMatrix in="r" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0 0 0 0" result="va"/>`
      + `<feFlood flood-color="#8d8a86"/><feComposite in2="va" operator="in" result="v"/>`
      + `<feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .5 0 0 0 -.18" result="ca"/><feFlood flood-color="#b9b4ac"/><feComposite in2="ca" operator="in" result="c"/>`
      + `<feComposite in="v" in2="SourceAlpha" operator="in" result="v1"/><feComposite in="c" in2="SourceAlpha" operator="in" result="c1"/>`
      + `<feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="c1"/><feMergeNode in="v1"/></feMerge></filter>`
      // black marble (the places): white veins
      + `<filter id="mbK" x="-.05" y="-.05" width="1.1" height="1.1" color-interpolation-filters="sRGB"><feTurbulence type="turbulence" baseFrequency=".9 .35" numOctaves="3" seed="5" result="n"/><feComponentTransfer in="n" result="r"><feFuncR type="table" tableValues="0 .1 .5 .9 1"/></feComponentTransfer><feColorMatrix in="r" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .7 0 0 0 0" result="a"/><feFlood flood-color="#d8d4cc"/><feComposite in2="a" operator="in" result="v"/><feComposite in="v" in2="SourceAlpha" operator="in" result="vc"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="vc"/></feMerge></filter>`
      + `<linearGradient id="mbBr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1d58a"/><stop offset=".45" stop-color="${BR}"/><stop offset="1" stop-color="${BRd}"/></linearGradient>`
      + '</defs>');
    o.push(`<g filter="url(#mbW)"><rect x="-.3" y="-.3" width="15.6" height="15.6" fill="#f3f0ea"/></g>`);
    // the veins: long wandering grey threads, a soft blurred one beside some, branching here and there (Carrara)
    { const R = rng(2027), V = [], Vs = [];
      for (let i = 0; i < 9; i++) {
        let x = R() * 15.6 - .3, y = -.3, a = Math.PI / 2 + (R() - .5) * 1.4; const P = [[x, y]];
        if (R() < .5) { x = -.3; y = R() * 15.6 - .3; a = (R() - .5) * 1.4; P[0] = [x, y]; }
        while (x > -.5 && x < 15.5 && y > -.5 && y < 15.5 && P.length < 160) { a += (R() - .5) * .28 + Math.sin(P.length * .21 + i) * .06; x += Math.cos(a) * .18; y += Math.sin(a) * .18; P.push([x, y]); if (R() < .018) { const b = P.slice(-1)[0]; let bx = b[0], by = b[1], ba = a + (R() < .5 ? .8 : -.8); const Q = [[bx, by]]; for (let k = 0; k < 18; k++) { ba += (R() - .5) * .6; bx += Math.cos(ba) * .15; by += Math.sin(ba) * .15; Q.push([bx, by]); } V.push([Q, .012 + R() * .012]); } }
        V.push([P, .015 + R() * .03]); if (R() < .6) Vs.push([P, .12 + R() * .15]);
      }
      const pd = P => 'M' + P.map(([x, y]) => f(x) + ' ' + f(y)).join('L');
      o.push(`<defs><filter id="mbBl" x="-.1" y="-.1" width="1.2" height="1.2"><feGaussianBlur stdDeviation=".08"/></filter></defs>`);
      o.push(`<g filter="url(#mbBl)" opacity=".28">` + Vs.map(([P, w]) => `<path d="${pd(P)}" stroke="#9a958e" stroke-width="${f(w)}" fill="none" stroke-linecap="round"/>`).join('') + '</g>');
      o.push(`<g opacity=".32">` + V.map(([P, w]) => `<path d="${pd(P)}" stroke="#7b7670" stroke-width="${f(w)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('') + '</g>'); }
    // the stones: each stone's pieces in one filtered group (yard band, start square, home lane, centre triangle)
    for (let s = 0; s < 4; s++) {
      const [x0, y0] = YARD[s], [tx, ty] = T[s * 13], [ax, ay] = TRI[s][0], [bx, by] = TRI[s][1];
      let d = `M${x0 + .1} ${y0 + .1}h5.8v5.8h-5.8zM${x0 + .78} ${y0 + .78}v4.44h4.44v-4.44z`;
      d += `M${tx} ${ty}h1v1h-1z`;
      for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p); d += `M${x} ${y}h1v1h-1z`; }
      d += `M${ax} ${ay}L${bx} ${by}L7.5 7.5z`;
      o.push(`<g filter="url(#${STONE[s].id})"><path d="${d}" fill="${STONE[s].base}" fill-rule="evenodd"/></g>`);
    }
    // brass: the yard's inner frame, the four places' rings (on black marble), the lines of the track, the stars, the centre boss
    const bl = [];
    for (let s = 0; s < 4; s++) { const [x0, y0] = YARD[s]; bl.push(`<rect x="${x0 + .1}" y="${y0 + .1}" width="5.8" height="5.8" fill="none" stroke="url(#mbBr)" stroke-width=".07"/><rect x="${x0 + .78}" y="${y0 + .78}" width="4.44" height="4.44" fill="none" stroke="url(#mbBr)" stroke-width=".08"/>`); }
    o.push(`<g filter="url(#mbK)">` + [0, 1, 2, 3].map(s => slots(s).map(([px, py]) => `<circle cx="${f(px)}" cy="${f(py)}" r=".56" fill="#1b1a1c"/>`).join('')).join('') + '</g>');
    for (let s = 0; s < 4; s++) slots(s).forEach(([px, py]) => bl.push(`<circle cx="${f(px)}" cy="${f(py)}" r=".58" fill="none" stroke="url(#mbBr)" stroke-width=".07"/><circle cx="${f(px)}" cy="${f(py)}" r=".44" fill="none" stroke="${BR}" stroke-opacity=".5" stroke-width=".02"/>`));
    T.forEach(([x, y], i) => {
      bl.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="none" stroke="url(#mbBr)" stroke-width=".045"/>`);
      if (i % 13 === 8) bl.push(`<path d="${star(x + .5, y + .5, .36, .42)}" fill="url(#mbBr)" stroke="${BRd}" stroke-width=".02"/><path d="${star(x + .5, y + .5, .16, .42)}" fill="#f6e3a6" fill-opacity=".6"/>`);
      if (i % 13 === 0) bl.push(arrowD(x + .5, y + .5, i / 13) + ` stroke="url(#mbBr)" stroke-width=".09"/>`);
    });
    for (let s = 0; s < 4; s++) for (let p = 0; p < 5; p++) { const [x, y] = HOME[s](p); bl.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="none" stroke="url(#mbBr)" stroke-width=".045"/>`); }
    TRI.forEach(([[ax, ay], [bx, by]]) => bl.push(`<path d="M${ax} ${ay}L${bx} ${by}L7.5 7.5z" fill="none" stroke="url(#mbBr)" stroke-width=".05" stroke-linejoin="round"/>`));
    bl.push(`<circle cx="7.5" cy="7.5" r=".42" fill="url(#mbBr)" stroke="${BRd}" stroke-width=".03"/><path d="${star(7.5, 7.5, .3, .42)}" fill="#f3dc96" stroke="${BRd}" stroke-width=".015"/>`);
    bl.push(`<rect x="0" y="0" width="15" height="15" fill="none" stroke="url(#mbBr)" stroke-width=".1"/><rect x="-.18" y="-.18" width="15.36" height="15.36" fill="none" stroke="url(#mbBr)" stroke-width=".04"/>`);
    o.push(bl.join(''));
    return o.join('');
  }

  window.LudoBoardArt = { street, mondrian, cutout, peg, marble, holes, COLS: { mondrian: MC, cutout: CC } };
})();
