// Backgammon V2 — data-driven themes: checker colours (gold / black / red / white) and board skins.
// Everything visual that depends on the choice reads from these tables, so a colour or a skin is adjusted here only.
// Board materials (wood grain, leather, marble, gold leaf...) are drawn procedurally: small seamless textures are
// rendered once on a canvas and tiled through SVG patterns / CSS backgrounds, so nothing is filtered per frame.
(function (root) {
'use strict';
// checker palettes: c1..c4 = radial gradient (highlight -> rim), ring = inner rim line, txt = stack-count digits,
// sh = sheen strength, flat/edge = flat drawings (mini boards, discs), dot = kifu dot, die = the side's dice
const CK = {
  gold: { c1: '#fff6dc', c2: '#e6cd8c', c3: '#b39249', c4: '#5e4720', ring: 'rgba(255,240,200,.4)', inner: 'rgba(80,58,20,.45)', txt: '#3d2c0c', sh: .25,
    flat: '#e2c275', edge: '#7a5c22', dot: '#e6cd8c', last: 'rgba(70,48,10,.75)',
    die: { face: [239, 228, 204], edge: [196, 182, 150], pip: '#4a1512', css: ['#fffaf0', '#efe4cc', '#cdbf9e'], cpip: ['#6b2420', '#3a0f0c'] } },
  black: { c1: '#7b808a', c2: '#33363d', c3: '#16181c', c4: '#050506', ring: 'rgba(205,210,220,.55)', inner: 'rgba(0,0,0,.6)', txt: '#e8eaee', sh: .16,
    flat: '#202328', edge: '#c9ccd2', dot: '#555a63', last: 'rgba(255,255,255,.8)',
    die: { face: [40, 43, 49], edge: [16, 17, 20], pip: '#ead9a8', css: ['#3d4148', '#202328', '#0e0f12'], cpip: ['#f4e7c5', '#c9a961'] } },
  red: { c1: '#ffc2b4', c2: '#dc5444', c3: '#9a231c', c4: '#3e0806', ring: 'rgba(255,200,185,.45)', inner: 'rgba(70,8,6,.5)', txt: '#fff3ec', sh: .22,
    flat: '#c23a2f', edge: '#ffb3a3', dot: '#dc5444', last: 'rgba(255,240,230,.85)',
    die: { face: [196, 52, 42], edge: [120, 24, 18], pip: '#fff4e4', css: ['#e3685a', '#bf3a2f', '#7d1913'], cpip: ['#fffaf0', '#eadcc0'] } },
  white: { c1: '#ffffff', c2: '#f3efe6', c3: '#d2cbbd', c4: '#8a8273', ring: 'rgba(255,255,255,.75)', inner: 'rgba(90,80,60,.35)', txt: '#3a352c', sh: .3,
    flat: '#f1ede4', edge: '#8a8273', dot: '#efeae0', last: 'rgba(60,50,30,.7)',
    die: { face: [250, 249, 245], edge: [205, 200, 188], pip: '#1d1d22', css: ['#ffffff', '#f1eee6', '#cfc9bb'], cpip: ['#2a2a30', '#0c0c10'] } },
};
const CK_IDS = ['gold', 'black', 'red', 'white'];
// sensible partner when the chosen colour equals the other side's
const PARTNER = { gold: 'black', black: 'gold', red: 'white', white: 'red' };
function fixPair(a, b, changed) {
  if (!CK[a]) a = 'gold'; if (!CK[b]) b = 'black';
  if (a === b) { if (changed === 1) a = PARTNER[b]; else b = PARTNER[a]; }
  return [a, b];
}
function applyCheckers(pair) {
  const st = document.documentElement.style;
  pair.forEach((id, s) => {
    const c = CK[id] || CK.gold, k = `--k${s}`;
    st.setProperty(k + 'c1', c.c1); st.setProperty(k + 'c2', c.c2); st.setProperty(k + 'c3', c.c3); st.setProperty(k + 'c4', c.c4);
    st.setProperty(k + 'ring', c.ring); st.setProperty(k + 'inner', c.inner); st.setProperty(k + 'txt', c.txt); st.setProperty(k + 'sh', String(c.sh));
    st.setProperty(k + 'flat', c.flat); st.setProperty(k + 'edge', c.edge); st.setProperty(k + 'dot', c.dot); st.setProperty(k + 'last', c.last);
    st.setProperty(k + 'd1', c.die.css[0]); st.setProperty(k + 'd2', c.die.css[1]); st.setProperty(k + 'd3', c.die.css[2]);
    st.setProperty(k + 'p1', c.die.cpip[0]); st.setProperty(k + 'p2', c.die.cpip[1]);
    if (root.Dice3D && root.Dice3D.COLORS) Object.assign(root.Dice3D.COLORS[s], { face: c.die.face, edge: c.die.edge, pip: c.die.pip });
  });
}

// ---------------------------------------------------------------- procedural textures (seamless 256px tiles)
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
// periodic value noise: px x py lattice cells across the tile, wraps at the tile edge
function vnoise(px, py, seed) {
  const r = rng(seed), L = new Float32Array(px * py); for (let i = 0; i < L.length; i++) L[i] = r();
  const g = (i, j) => L[((j % py) + py) % py * px + ((i % px) + px) % px];
  return (u, v) => {   // u, v in [0,1) tile coordinates
    const x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * sx, b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
}
function fbm(px, py, oct, seed) {
  const ns = []; for (let o = 0; o < oct; o++) ns.push(vnoise(px << o, py << o, seed + o * 97));
  return (u, v) => { let s = 0, a = 1, t = 0; for (const n of ns) { s += n(u, v) * a; t += a; a *= 0.5; } return s / t; };
}
const TEX = {};
function makeTex(kind) {
  if (TEX[kind] !== undefined) return TEX[kind];
  if (typeof document === 'undefined' || !document.createElement) return (TEX[kind] = '');
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const cx = cv.getContext('2d'); if (!cx) return (TEX[kind] = '');
  const im = cx.createImageData(N, N), d = im.data;
  const put = (i, r, g, b, a) => { d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = Math.max(0, Math.min(255, a)); };
  const r = rng(kind.length * 7919 + 13);
  if (kind === 'wood' || kind === 'woodV') {   // long fibres + growth rings (horizontal; woodV = vertical)
    const f = fbm(2, 16, 4, 11), fine = vnoise(3, 128, 5);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = kind === 'woodV' ? y / N : x / N, v = kind === 'woodV' ? x / N : y / N;
      const w = f(u, v) * 9, ring = Math.abs(w - Math.round(w)), line = ring < 0.07 ? 1 - ring / 0.07 : 0;
      const fib = fine(u, v);
      const dk = line * 120 + Math.max(0, fib - .55) * 160, lt = Math.max(0, .45 - fib) * 70;
      const i = (y * N + x) * 4; if (dk >= lt) put(i, 20, 10, 4, dk); else put(i, 255, 226, 180, lt);
    }
  } else if (kind === 'leather') {   // pebble grain: a net of fine creases between soft bumps
    const f = fbm(18, 18, 3, 31), g2 = vnoise(40, 40, 77);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = f(x / N, y / N), c = Math.abs(v - .5), e = g2(x / N, y / N), i = (y * N + x) * 4;
      if (c < .04) put(i, 0, 0, 0, (1 - c / .04) * 130); else put(i, 255, 255, 255, Math.max(0, e - .7) * 90);
    }
  } else if (kind === 'grain') {   // saddle leather: fine dense grain with tiny pores and a soft sheen
    const f = fbm(40, 40, 2, 131), p = vnoise(110, 110, 137), sh = fbm(3, 3, 3, 139);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = f(x / N, y / N), c = Math.abs(v - .5), q = p(x / N, y / N), i = (y * N + x) * 4;
      if (c < .03) put(i, 40, 18, 4, (1 - c / .03) * 110); else if (q < .2) put(i, 40, 18, 4, (.2 - q) * 420); else put(i, 255, 235, 200, Math.max(0, sh(x / N, y / N) - .45) * 120);
    }
  } else if (kind === 'fine') {   // fine sand / felt speckle
    const f = vnoise(96, 96, 41);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = f(x / N, y / N) * .6 + r() * .4, i = (y * N + x) * 4;
      if (v > .5) put(i, 255, 255, 255, (v - .5) * 120); else put(i, 0, 0, 0, (.5 - v) * 150);
    }
  } else if (kind === 'marble') {   // thin meandering veins
    const f = fbm(4, 4, 5, 53), f2 = fbm(6, 6, 3, 61);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, w = Math.sin((u + v) * Math.PI * 4 + f(u, v) * 14), vein = Math.pow(1 - Math.abs(w), 14);
      const w2 = Math.sin((u - v) * Math.PI * 6 + f2(u, v) * 10), vein2 = Math.pow(1 - Math.abs(w2), 30) * .6;
      const i = (y * N + x) * 4; put(i, 255, 255, 255, (vein + vein2) * 235 + f2(u, v) * 30);
    }
  } else if (kind === 'flecks') {   // gold-leaf flakes on transparent ground
    cx.clearRect(0, 0, N, N);
    for (let k = 0; k < 70; k++) {
      const x = r() * N, y = r() * N, s = 2 + r() * 9, a = r() * Math.PI;
      for (const [ox, oy] of [[0, 0], [N, 0], [-N, 0], [0, N], [0, -N]]) {
        cx.save(); cx.translate(x + ox, y + oy); cx.rotate(a); cx.beginPath();
        const n = 5 + (r() * 3 | 0); for (let j = 0; j < n; j++) { const t = j / n * Math.PI * 2, rr = s * (.4 + r() * .6); cx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr * .7); }
        cx.closePath(); const l = 150 + r() * 90 | 0; cx.fillStyle = `rgba(${l + 20 > 255 ? 255 : l + 20},${l - 10},${l - 120 < 0 ? 0 : l - 120},${.55 + r() * .45})`; cx.fill(); cx.restore();
      }
    }
    return (TEX[kind] = cv.toDataURL('image/png'));
  } else if (kind === 'leaf') {   // beaten gold leaf: crackle seams + tone patches
    const f = fbm(5, 5, 4, 71), c = fbm(14, 14, 2, 83);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, t = f(u, v), s = Math.abs(c(u, v) - .5), i = (y * N + x) * 4;
      if (s < .012) put(i, 120, 80, 20, 110); else if (t > .55) put(i, 255, 250, 210, (t - .55) * 380); else put(i, 120, 80, 15, (.55 - t) * 150);
    }
  } else if (kind === 'enamel') {   // translucent enamel: flowing light streaks
    const f = fbm(3, 3, 4, 91);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, w = Math.sin(v * Math.PI * 10 + f(u, v) * 9), i = (y * N + x) * 4;
      put(i, 220, 255, 250, Math.pow(Math.max(0, w), 6) * 120 + f(u, v) * 25);
    }
  } else if (kind === 'burl') {   // burl walnut: dense swirls of knots
    const f = fbm(8, 8, 4, 101);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N, w = f(u, v) * 22, rr = Math.abs(w - Math.round(w)), i = (y * N + x) * 4;
      if (rr < .18) put(i, 25, 10, 2, (1 - rr / .18) * 150); else put(i, 255, 200, 140, (rr - .18) * 70);
    }
  } else return (TEX[kind] = '');
  cx.putImageData(im, 0, 0);
  return (TEX[kind] = cv.toDataURL('image/png'));
}

// ---------------------------------------------------------------- board skins
// frame: {t: wood|leather|marble|lacquer, c: 3-stop gradient, tex opacity}; field: {t: felt|leather|stars|gloss|rings|marble, ...};
// ptA / ptB: point gradients (tip -> base) + pt: {line, w (base width share), texA/texB overlays, moons};
// bar / tray gradients; inlay: gold line + corner studs; hinge: plate|piano; stitch: leather stitching colour;
// corners / clasps: gold hardware; band: ornamental border; lbl / pip: numbers on the frame; cube: doubling cube;
// ck: checker material (std|leather|marble|resin); ckol: hairline around every checker (contrast on light / dark fields);
// hl: destination highlight colour; mini: flat colours for the small diagrams (lessons, puzzles, review, rules)
const SKINS = {
  classic: { frame: { t: 'wood', c: ['#3a2416', '#24150c', '#3b2517'], tex: .55 }, field: { t: 'felt', c: ['#1d6a4b', '#145238', '#0b3424'], tex: .35 },
    ptA: ['#efe5cc', '#c8b994'], ptB: ['#7a2a24', '#4a1612'], pt: {},
    bar: ['#1f130a', '#3a2416', '#1f130a'], tray: ['#08251a', '#0d2f21', '#08251a'],
    inlay: ['#f0d68f', '#b8934e', '#e2c275'], hinge: 'plate', lbl: 'rgba(226,194,117,.62)', pip: 'rgba(255,246,220,.82)',
    cube: ['#f3dc9a', '#c9a961', '#8e7440', '#2a1e08'], ck: 'std',
    mini: { frame: '#2b1a10', felt: '#17573f', a: '#e6dbc2', b: '#6b2420', tray: '#0d2f21', line: '#b8934e' } },
  emerald: { frame: { t: 'leather', c: ['#16573c', '#0d3f2a', '#145034'], tex: .8 }, field: { t: 'leather', c: ['#e9dcbb', '#ddcca4', '#cdb98d'], tex: .28 },
    ptA: ['#1c7a52', '#0f5a3b'], ptB: ['#1a1d1c', '#2b302e'], pt: { tex: 'leather', texO: .35 },
    bar: ['#0d3f2a', '#17583d', '#0d3f2a'], barTex: 'leather', tray: ['#0f4430', '#155238', '#0f4430'], trayTex: 'leather',
    stitch: 'rgba(214,236,222,.38)', inlay: null, hinge: 'piano', studs: true, gold: ['#f6e3a1', '#c19a45', '#8a6a26'],
    lbl: 'rgba(240,226,180,.78)', pip: 'rgba(255,248,226,.95)',
    cube: ['#1f6f4c', '#145236', '#0b3322', '#f1d68f'], ck: 'leather', ckol: 'rgba(40,30,10,.35)', hl: ['rgba(160,96,10,.95)', 'rgba(190,120,20,.6)'],
    mini: { frame: '#0f4630', felt: '#e3d4b0', a: '#16704a', b: '#1d201f', tray: '#155238', line: '#c19a45' } },
  scarlet: { frame: { t: 'leather', c: ['#1c1c1e', '#0c0c0d', '#1a1a1c'], tex: .6 }, field: { t: 'leather', c: ['#232325', '#19191b', '#111112'], tex: .35 },
    ptA: ['#d8202c', '#a3121c'], ptB: ['#f4eedf', '#ddd3bd'], pt: { tex: 'leather', texO: .25 },
    bar: ['#0e0e0f', '#1d1d1f', '#0e0e0f'], barTex: 'leather', tray: ['#101011', '#18181a', '#101011'], trayTex: 'leather',
    stitch: 'rgba(255,255,255,.16)', inlay: null, hinge: 'piano', corners: true, clasps: true, gold: ['#ffe9a8', '#d2a64c', '#8f6a22'],
    lbl: 'rgba(236,206,140,.82)', pip: 'rgba(255,240,210,.95)',
    cube: ['#2e2e31', '#18181a', '#0a0a0b', '#e8c877'], ck: 'marble', ckol: 'rgba(255,255,255,.22)',
    mini: { frame: '#121213', felt: '#1d1d1f', a: '#cf1f2a', b: '#efe8d8', tray: '#18181a', line: '#d2a64c' } },
  midnight: { frame: { t: 'wood', c: ['#5a3a24', '#3e2716', '#5c3c25'], tex: .7 }, field: { t: 'stars', c: ['#0d2150', '#0a1838', '#050c1f'], tex: 0 },
    ptA: ['#3f8ff0', '#123a8c'], ptB: ['#1b4aa6', '#081a48'], pt: { line: 'rgba(232,200,120,.9)', moons: true, stars: true },
    bar: ['#3a2414', '#5a3a24', '#3a2414'], barTex: 'woodV', tray: ['#0b0b0d', '#151518', '#0b0b0d'], trayTex: 'fine', trayFelt: true,
    inlay: null, hinge: 'piano', gold: ['#e7e9ee', '#a9adb5', '#6d7179'],
    lbl: 'rgba(232,214,170,.8)', pip: 'rgba(255,248,230,.95)',
    cube: ['#2a2b30', '#141518', '#060607', '#f2f2f2'], ck: 'std', ckol: 'rgba(255,255,255,.2)',
    mini: { frame: '#4a301d', felt: '#0b1a40', a: '#3a86e8', b: '#1d55b8', tray: '#111114', line: '#e8c878' } },
  andalus: { frame: { t: 'wood', c: ['#4a2a18', '#2f190c', '#4d2c19'], tex: .7 }, field: { t: 'gloss', c: ['#141416', '#060607', '#0f0f11'], tex: 0 },
    ptA: ['#f7dc86', '#b0832c'], ptB: ['#2fe0d2', '#0b8f8c'], pt: { texA: 'leaf', texB: 'enamel', texO: .45, line: 'rgba(255,226,140,.55)' },
    bar: ['#0b0b0c', '#1a1a1c', '#0b0b0c'], barGold: true, tray: ['#080809', '#121214', '#080809'],
    band: true, inlay: ['#f6dc8c', '#b8893a', '#e8c46a'], hinge: null, gold: ['#ffe7a0', '#cf9f43', '#8c6420'],
    lbl: 'rgba(246,220,140,.85)', pip: 'rgba(255,244,214,.95)',
    cube: ['#fbe7a6', '#d5a94a', '#8d6620', '#2a1a04'], ck: 'resin', ckol: 'rgba(255,230,160,.25)', hl: ['rgba(255,255,255,.95)', 'rgba(110,255,236,.65)'],
    mini: { frame: '#3a2214', felt: '#0b0b0d', a: '#e8c46a', b: '#19b9b0', tray: '#121214', line: '#cf9f43' } },
  marquetry: { frame: { t: 'wood', c: ['#4a1d14', '#2e0f09', '#521f16'], tex: .75 }, field: { t: 'rings', c: ['#3a2416', '#2a180c', '#1c0f07'], tex: .3 },
    ptA: ['#fbf6e8', '#e8dcc0'], ptB: ['#f2e6c9', '#d8c69c'], pt: { w: .62, line: 'rgba(40,20,10,.55)' },
    bar: ['#2a0e08', '#4a1d14', '#2a0e08'], barTex: 'woodV', tray: ['#101012', '#1a1a1d', '#101012'], trayTex: 'fine', trayFelt: true,
    inlay: ['#f3e2b0', '#c8a868', '#efd9a0'], hinge: 'piano', gold: ['#f1e2c0', '#c8a37a', '#8a6a48'],
    lbl: 'rgba(243,226,176,.82)', pip: 'rgba(255,246,226,.95)',
    cube: ['#2a2b30', '#141518', '#060607', '#f4f4f4'], ck: 'std', ckol: 'rgba(0,0,0,.5)',
    mini: { frame: '#3e170f', felt: '#2b5c8c', a: '#f6efdc', b: '#e6d6ae', tray: '#1a1a1d', line: '#c8a868', rings: ['#e2475a', '#e6b45a', '#3fa7c4', '#1f4fbf', '#1d6b4f', '#6a4024'] } },
  marble: { frame: { t: 'marble', c: ['#f1eee8', '#d9d4ca', '#efebe4'], tex: .9 }, field: { t: 'felt', c: ['#33465f', '#283a51', '#1b2a3d'], tex: .3 },
    ptA: ['#f6f3ec', '#d9d3c6'], ptB: ['#12161d', '#272d38'], pt: { texA: 'marble', texB: 'marble', texO: .35 },
    bar: ['#c9c3b7', '#e8e4dc', '#c9c3b7'], barTex: 'marble', tray: ['#283a51', '#33465f', '#283a51'], trayTex: 'fine',
    inlay: ['#d9c08a', '#9a7b44', '#cdb07a'], hinge: 'plate', studs: true, lbl: 'rgba(52,56,66,.82)', pip: 'rgba(20,24,32,.92)', lblsh: 'rgba(255,255,255,.55)',
    cube: ['#ffffff', '#e9e5dc', '#b9b2a4', '#222630'], ck: 'marble', ckol: 'rgba(0,0,0,.25)', hl: ['rgba(255,214,120,.98)', 'rgba(255,190,60,.75)'],
    mini: { frame: '#ddd8ce', felt: '#2d405a', a: '#f1ede4', b: '#171b22', tray: '#33465f', line: '#9a7b44' } },
  camel: { frame: { t: 'grain', c: ['#9a5a28', '#7a4119', '#94552a'], tex: .75 }, field: { t: 'grain', c: ['#d6a46c', '#c48d55', '#a8703c'], tex: .45 },
    ptA: ['#4e2a14', '#33190a'], ptB: ['#f5ead2', '#dfcfae'], pt: { tex: 'grain', texO: .3, line: 'rgba(255,240,205,.5)' },
    bar: ['#4a2610', '#6b3a18', '#4a2610'], barTex: 'grain', tray: ['#2e1b10', '#3d2516', '#2e1b10'], trayTex: 'fine', trayFelt: true,
    stitch: 'rgba(255,238,200,.72)', inlay: null, hinge: 'piano', studs: true, rivets: true, corners: true, gold: ['#f7dc95', '#c9963f', '#85601f'],
    lbl: 'rgba(255,238,205,.9)', pip: 'rgba(255,248,232,.97)',
    cube: ['#f6ead2', '#dccaa4', '#a8906a', '#3a1d0a'], ck: 'std', ckol: 'rgba(45,20,4,.5)', hl: ['rgba(255,252,240,.98)', 'rgba(255,236,190,.85)'],
    mini: { frame: '#7a4520', felt: '#c48d55', a: '#f1e6cc', b: '#4a2814', tray: '#3b2416', line: '#d9b25e' } },
};
// old ids (earlier releases) -> nearest current skin
const ALIAS = { tournament: 'emerald', luxe: 'scarlet', modern: 'midnight' };
const SKIN_IDS = Object.keys(SKINS);
const skinId = id => SKINS[id] ? id : ALIAS[id] || 'classic';
const skin = id => SKINS[skinId(id)];

// --------------------------------------------------------------- the board drawing (SVG markup, 100 units per board unit)
// g: geometry {W,H,LX,BX,B,RX,RE,TX,TW,TOP,BOT,MID,PL}; P: id prefix (thumbnails need their own ids)
function boardMarkup(id, g, P) {
  const K = skin(id), S = 100, w = g.W * S, h = g.H * S, R = rng(7 + id.length * 31);
  P = P || 'b';
  const T = (k) => makeTex(k);
  const lg = (nm, c, x2, y2, x1, y1) => `<linearGradient id="${P}${nm}" x1="${x1 || 0}" y1="${y1 || 0}" x2="${x2}" y2="${y2}">${c.map((v, i) => `<stop offset="${c.length === 2 ? i : [0, .45, 1][i]}" stop-color="${v}"/>`).join('')}</linearGradient>`;
  const pat = (nm, k, sz) => T(k) ? `<pattern id="${P}${nm}" width="${sz}" height="${sz}" patternUnits="userSpaceOnUse"><image href="${T(k)}" width="${sz}" height="${sz}" preserveAspectRatio="none"/></pattern>` : '';
  const texRect = (nm, x, y, ww, hh, op, rx) => T(nm.replace(/^t/, '')) && op ? `<rect x="${x}" y="${y}" width="${ww}" height="${hh}"${rx ? ` rx="${rx}"` : ''} fill="url(#${P}${nm})" opacity="${op}"/>` : '';
  const gold = K.gold || K.inlay || ['#f0d68f', '#b8934e', '#e2c275'];
  const fy0 = g.TOP * S, fy1 = g.BOT * S, fh = fy1 - fy0;
  let d = `${lg('fr', K.frame.c, 1, 1)}${lg('ptA', K.ptA, 0, 1)}${lg('ptAb', K.ptA, 0, 0, 0, 1)}${lg('ptB', K.ptB, 0, 1)}${lg('ptBb', K.ptB, 0, 0, 0, 1)}
    ${lg('au', gold, 1, 1)}${lg('auV', [gold[2], gold[0], gold[1]], 1, 0)}${lg('bar', K.bar, 1, 0)}${lg('tray', K.tray, 1, 0)}
    <radialGradient id="${P}fd" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="${K.field.c[0]}"/><stop offset=".65" stop-color="${K.field.c[1]}"/><stop offset="1" stop-color="${K.field.c[2]}"/></radialGradient>
    <filter id="${P}sh" x="-20%" y="-10%" width="140%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".35"/></filter>
    <linearGradient id="${P}gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".10"/><stop offset=".35" stop-color="#fff" stop-opacity=".02"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${P}in" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".06" stop-color="#000" stop-opacity="0"/><stop offset=".94" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>`;
  const ft = K.frame.t, frameTex = ft === 'wood' ? 'wood' : ft;
  d += pat('t' + frameTex, frameTex, ft === 'marble' ? 520 : ft === 'leather' ? 150 : ft === 'grain' ? 180 : 420);
  for (const k of ['leather', 'fine', 'woodV', 'marble', 'leaf', 'enamel', 'flecks', 'burl', 'grain']) if (k !== frameTex) d += pat('t' + k, k, k === 'leather' ? 150 : k === 'fine' ? 140 : k === 'leaf' ? 230 : k === 'flecks' ? 200 : k === 'burl' ? 260 : k === 'grain' ? 180 : 420);
  let s = '';
  // ---- frame
  s += `<rect width="${w}" height="${h}" rx="28" fill="url(#${P}fr)"/>` + texRect('t' + frameTex, 0, 0, w, h, K.frame.tex, 28);
  s += `<rect x="1.5" y="1.5" width="${w - 3}" height="${h - 3}" rx="27" fill="none" stroke="rgba(255,255,255,.10)" stroke-width="3"/>`;
  s += `<rect width="${w}" height="${h}" rx="28" fill="url(#${P}gl)"/>`;
  if (K.stitch) s += `<rect x="7" y="7" width="${w - 14}" height="${h - 14}" rx="22" fill="none" stroke="${K.stitch}" stroke-width="2.6" stroke-dasharray="9 7"/>`;
  // ornamental border band (black / gold geometric lattice) around both fields + the tray
  if (K.band) {
    d += `<pattern id="${P}band" width="11" height="11" patternUnits="userSpaceOnUse" x="${g.LX * S - 3}" y="${fy0 - 3}"><rect width="11" height="11" fill="#0b0b0c"/><path d="M5.5 .7L10.3 5.5L5.5 10.3L.7 5.5Z" fill="none" stroke="#d9ad52" stroke-width="1.2"/><path d="M5.5 3.4L7.6 5.5L5.5 7.6L3.4 5.5Z" fill="#f0cf78"/></pattern>`;
    const bx0 = g.LX * S - 14, by0 = fy0 - 14, bx1 = (g.TX + g.TW) * S + 14, by1 = fy1 + 14;
    s += `<path fill-rule="evenodd" d="M${bx0} ${by0}H${bx1}V${by1}H${bx0}Z M${bx0 + 11} ${by0 + 11}H${bx1 - 11}V${by1 - 11}H${bx0 + 11}Z" fill="url(#${P}band)"/>`;
    s += `<rect x="${bx0}" y="${by0}" width="${bx1 - bx0}" height="${by1 - by0}" fill="none" stroke="url(#${P}au)" stroke-width="2.5"/><rect x="${bx0 + 11}" y="${by0 + 11}" width="${bx1 - bx0 - 22}" height="${by1 - by0 - 22}" fill="none" stroke="url(#${P}au)" stroke-width="2"/>`;
  }
  // ---- playing fields
  const fieldBase = (x0) => {
    const X = x0 * S, W6 = 6 * S;
    let r = `<rect x="${X}" y="${fy0}" width="${W6}" height="${fh}" fill="url(#${P}fd)"/>`;
    const ftx = K.field.t === 'felt' ? 'fine' : K.field.t === 'leather' ? 'leather' : K.field.t === 'grain' ? 'grain' : K.field.t === 'rings' ? 'burl' : null;
    if (ftx && K.field.tex && K.field.t !== 'rings') r += texRect('t' + ftx, X, fy0, W6, fh, K.field.tex);
    return r;
  };
  // concentric marquetry rings: one centre per half, clipped to the fields
  if (K.field.t === 'rings') {
    d += `<clipPath id="${P}cf"><rect x="${g.LX * S}" y="${fy0}" width="${6 * S}" height="${fh}"/><rect x="${g.RX * S}" y="${fy0}" width="${6 * S}" height="${fh}"/></clipPath>`;
    const RC = ['#6a4024', '#e2475a', '#f0c46a', '#f6ead0', '#3fa7c4', '#1d3f9e', '#1d6b4f', '#121214', '#2c6ad8', '#e8a24a', '#6a4024', '#3fa7c4', '#d93a4e', '#f0c46a', '#1d6b4f', '#1d3f9e', '#5a3420', '#e2475a'];
    let r = `<g clip-path="url(#${P}cf)"><rect x="${g.LX * S}" y="${fy0}" width="${(g.RE - g.LX) * S}" height="${fh}" fill="#4a2c18"/>`;
    for (const [cx, cy, n0] of [[(g.LX + 3.6) * S, fy1 - 1.2 * S, 0], [(g.RX + 2.2) * S, fy0 + 2.4 * S, 5]]) {
      const ring = []; for (let i = 0; i < 36; i++) ring.push(RC[(i + n0) % RC.length]);
      for (let i = ring.length - 1; i >= 0; i--) {
        const rr = 26 + i * 25 + (i % 3) * 5;
        r += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="${ring[i]}"/>`;
        if (i % 4 === 1) r += `<circle cx="${cx}" cy="${cy}" r="${rr - 3}" fill="none" stroke="#120a06" stroke-width="3"/>`;
      }
      r += `<circle cx="${cx}" cy="${cy}" r="16" fill="#f6ead0"/><circle cx="${cx}" cy="${cy}" r="7" fill="#3a2416"/>`;
    }
    r += `<rect x="${g.LX * S}" y="${fy0}" width="${(g.RE - g.LX) * S}" height="${fh}" fill="#140a04" opacity=".16"/>` + texRect('tburl', g.LX * S, fy0, (g.RE - g.LX) * S, fh, .22) + texRect('tfine', g.LX * S, fy0, (g.RE - g.LX) * S, fh, .25);
    s += r + '</g>';
  } else s += fieldBase(g.LX) + fieldBase(g.RX);
  // starfield: nebula glow + stars (deterministic)
  if (K.field.t === 'stars') {
    d += `<radialGradient id="${P}neb"><stop offset="0" stop-color="#2f6fe0" stop-opacity=".45"/><stop offset="1" stop-color="#2f6fe0" stop-opacity="0"/></radialGradient><radialGradient id="${P}neb2"><stop offset="0" stop-color="#7a5cff" stop-opacity=".22"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></radialGradient>`;
    for (const x0 of [g.LX, g.RX]) {
      s += `<ellipse cx="${(x0 + 2) * S}" cy="${(g.MID - .6) * S}" rx="${3.4 * S}" ry="${2.2 * S}" fill="url(#${P}neb)"/><ellipse cx="${(x0 + 4.2) * S}" cy="${(g.MID + 1.2) * S}" rx="${2.6 * S}" ry="${1.6 * S}" fill="url(#${P}neb2)"/>`;
    }
  }
  if (K.field.t === 'gloss') for (const x0 of [g.LX, g.RX]) s += `<rect x="${x0 * S}" y="${fy0}" width="${6 * S}" height="${fh}" fill="url(#${P}gl)"/>`;
  // ---- points
  const pw = (K.pt.w || .92) * S / 2, ptO = K.pt.texO || 0;
  const tri = (x, top, a) => {
    const cxp = x + S / 2, y0 = top ? fy0 : fy1, y1 = top ? fy0 + g.PL * S : fy1 - g.PL * S;
    const dd = `M${cxp - pw} ${y0} L${cxp + pw} ${y0} L${cxp} ${y1} Z`;
    let r = `<path d="${dd}" fill="url(#${P}${a ? 'ptA' : 'ptB'}${top ? '' : 'b'})" filter="url(#${P}sh)"/>`;
    const tx = a ? (K.pt.texA || K.pt.tex) : (K.pt.texB || K.pt.tex);
    if (tx && T(tx) && ptO) r += `<path d="${dd}" fill="url(#${P}t${tx})" opacity="${ptO}"/>`;
    if (K.pt.line) r += `<path d="${dd}" fill="none" stroke="${K.pt.line}" stroke-width="2.2" stroke-linejoin="round"/>`;
    return r;
  };
  for (const x0 of [g.LX, g.RX]) for (let i = 0; i < 6; i++) { const x = (x0 + i) * S, a = i % 2 === 0; s += tri(x, true, a) + tri(x, false, !a); }
  // stars over the points too (the points are cut from the same sky)
  if (K.pt.stars) {
    for (const x0 of [g.LX, g.RX]) for (let k = 0; k < 150; k++) {
      const x = (x0 + R() * 6) * S, y = fy0 + R() * fh, rr = R() < .08 ? 2.6 + R() * 1.6 : .7 + R() * 1.5;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}" fill="#fff" opacity="${(.35 + R() * .6).toFixed(2)}"/>`;
    }
  }
  // moon phases at the base of every point
  if (K.pt.moons) {
    let n = 0;
    for (const top of [true, false]) for (const x0 of [g.LX, g.RX]) for (let i = 0; i < 6; i++) {
      const cxp = (x0 + i + .5) * S, cy = top ? fy0 + 34 : fy1 - 34, rr = 21, ph = (n++ % 8) / 8;
      s += `<circle cx="${cxp}" cy="${cy}" r="${rr}" fill="#d9e2ef" stroke="rgba(232,200,120,.9)" stroke-width="1.6"/>`;
      const off = 2 * rr * Math.min(ph, 1 - ph) * 2, dir = ph < .5 ? -1 : 1;
      if (off < 2 * rr) s += `<clipPath id="${P}m${n}"><circle cx="${cxp}" cy="${cy}" r="${rr}"/></clipPath><circle cx="${(cxp + dir * off).toFixed(1)}" cy="${cy}" r="${rr + .5}" fill="#0a1636" opacity=".88" clip-path="url(#${P}m${n})"/>`;
    }
  }
  // inner shadow on the fields
  for (const x0 of [g.LX, g.RX]) s += `<rect x="${x0 * S}" y="${fy0}" width="${6 * S}" height="${fh}" fill="url(#${P}in)"/><rect x="${x0 * S}" y="${fy0}" width="${6 * S}" height="${fh}" fill="none" stroke="rgba(0,0,0,.5)" stroke-width="6"/>`;
  // ---- bar
  const bx = g.BX * S, bw = g.B * S;
  s += `<rect x="${bx}" y="${fy0 - 12}" width="${bw}" height="${fh + 24}" fill="url(#${P}bar)"/>`;
  if (K.barTex) s += texRect('t' + K.barTex, bx, fy0 - 12, bw, fh + 24, .6);
  if (K.barGold) s += `<rect x="${bx + bw / 2 - 16}" y="${fy0 - 12}" width="32" height="${fh + 24}" fill="url(#${P}auV)"/><rect x="${bx + bw / 2 - 16}" y="${fy0 - 12}" width="32" height="${fh + 24}" fill="url(#${P}tflecks)" opacity=".5"/><rect x="${bx + bw / 2 - 16}" y="${fy0 - 12}" width="32" height="${fh + 24}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/>`;
  else s += `<rect x="${bx + bw / 2 - 2}" y="${fy0}" width="4" height="${fh}" fill="rgba(201,169,97,.25)"/>`;
  if (K.stitch) s += `<rect x="${bx + 12}" y="${fy0 + 4}" width="${bw - 24}" height="${fh - 8}" rx="8" fill="none" stroke="${K.stitch}" stroke-width="2.4" stroke-dasharray="9 7"/>`;
  s += `<rect x="${bx}" y="${fy0 - 12}" width="${bw}" height="${fh + 24}" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="4"/>`;
  // ---- bear-off tray
  const tx0 = g.TX * S, tw = g.TW * S;
  s += `<rect x="${tx0}" y="${fy0}" width="${tw}" height="${fh}" rx="14" fill="url(#${P}tray)"/>`;
  if (K.trayTex) s += texRect('t' + K.trayTex, tx0, fy0, tw, fh, K.trayFelt ? .5 : .55, 14);
  s += `<rect x="${tx0}" y="${fy0}" width="${tw}" height="${fh}" rx="14" fill="url(#${P}in)"/><rect x="${tx0}" y="${fy0}" width="${tw}" height="${fh}" rx="14" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="6"/>`;
  s += `<line x1="${tx0 + 15}" x2="${tx0 + tw - 15}" y1="${g.MID * S}" y2="${g.MID * S}" stroke="${K.trayFelt ? 'rgba(255,255,255,.12)' : 'rgba(201,169,97,.28)'}" stroke-width="3"/>`;
  if (K.stitch) s += `<rect x="${tx0 + 10}" y="${fy0 + 10}" width="${tw - 20}" height="${fh - 20}" rx="9" fill="none" stroke="${K.stitch}" stroke-width="2.2" stroke-dasharray="9 7"/>`;
  // ---- gold inlay lines + studs
  const inl = (x, y, ww, hh) => `<rect x="${x}" y="${y}" width="${ww}" height="${hh}" rx="10" fill="none" stroke="url(#${P}au)" stroke-width="3.2" opacity=".9"/>`;
  if (K.inlay && !K.band) { s += inl(g.LX * S - 9, fy0 - 9, (g.RE - g.LX) * S + 18, fh + 18) + inl(tx0 - 9, fy0 - 9, tw + 18, fh + 18); }
  if (K.inlay && K.band) s += `<rect x="${g.LX * S - 4}" y="${fy0 - 4}" width="${(g.RE - g.LX) * S + 8}" height="${fh + 8}" fill="none" stroke="url(#${P}au)" stroke-width="2.4"/><rect x="${tx0 - 4}" y="${fy0 - 4}" width="${tw + 8}" height="${fh + 8}" rx="12" fill="none" stroke="url(#${P}au)" stroke-width="2.4"/>`;
  const stud = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${P}au)" stroke="rgba(0,0,0,.45)" stroke-width="2"/><circle cx="${cx - r * .3}" cy="${cy - r * .35}" r="${r * .35}" fill="#fff" opacity=".45"/>`;
  if ((K.inlay && !K.band) || K.studs) for (const [cx, cy] of [[24, 24], [w - 24, 24], [24, h - 24], [w - 24, h - 24]]) s += stud(cx, cy, 9);
  // brass rivets along the frame (saddle)
  if (K.rivets) {
    const riv = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="4.6" fill="url(#${P}au)" stroke="rgba(40,20,4,.55)" stroke-width="1.2"/><circle cx="${cx - 1.4}" cy="${cy - 1.6}" r="1.5" fill="#fff" opacity=".55"/>`;
    for (let y = 120; y < h - 110; y += 118) s += riv(22, y) + riv(w - 22, y);
  }
  // gold corner protectors
  if (K.corners) for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const ox = sx ? w : 0, oy = sy ? h : 0, fx = sx ? -1 : 1, fyy = sy ? -1 : 1, L = 74, Tk = 15;
    s += `<path d="M${ox} ${oy + fyy * 28} Q${ox} ${oy} ${ox + fx * 28} ${oy} L${ox + fx * L} ${oy} L${ox + fx * L} ${oy + fyy * Tk} L${ox + fx * Tk} ${oy + fyy * Tk} L${ox + fx * Tk} ${oy + fyy * L} L${ox} ${oy + fyy * L} Z" fill="url(#${P}au)" stroke="rgba(0,0,0,.4)" stroke-width="1.5"/>`;
    s += `<circle cx="${ox + fx * 46}" cy="${oy + fyy * 7.5}" r="3" fill="rgba(60,40,10,.7)"/><circle cx="${ox + fx * 7.5}" cy="${oy + fyy * 46}" r="3" fill="rgba(60,40,10,.7)"/>`;
  }
  // case clasps on the outer edges
  if (K.clasps) for (const cy of [h * .3, h * .7]) for (const sx of [0, 1]) {
    const x = sx ? w - 13 : 0;
    s += `<rect x="${x}" y="${cy - 30}" width="13" height="60" rx="3" fill="url(#${P}au)" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/><rect x="${x + 3}" y="${cy - 10}" width="7" height="20" rx="2" fill="rgba(70,48,12,.55)"/>`;
  }
  // hinges on the bar
  if (K.hinge === 'plate') for (const y of [g.TOP + 1.2, g.BOT - 1.2]) s += `<rect x="${(g.BX + 0.32) * S}" y="${y * S - 22}" width="${(g.B - 0.64) * S}" height="44" rx="6" fill="url(#${P}au)" opacity=".8"/>`;
  if (K.hinge === 'piano') for (const y of [g.TOP + 1.25, g.BOT - 1.25]) {
    const hx = bx + bw / 2 - 26, hy = y * S - 40;
    s += `<rect x="${hx}" y="${hy}" width="52" height="80" rx="5" fill="url(#${P}au)" stroke="rgba(0,0,0,.45)" stroke-width="1.5"/>`;
    s += `<rect x="${hx + 21}" y="${hy - 2}" width="10" height="84" rx="4" fill="url(#${P}auV)" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>`;
    for (const k of [1, 2, 3]) s += `<line x1="${hx + 21}" x2="${hx + 31}" y1="${hy + k * 20}" y2="${hy + k * 20}" stroke="rgba(0,0,0,.45)" stroke-width="1.6"/>`;
    for (const [sx, sy] of [[10, 18], [42, 18], [10, 62], [42, 62]]) s += `<circle cx="${hx + sx}" cy="${hy + sy}" r="4.2" fill="url(#${P}auV)" stroke="rgba(0,0,0,.45)" stroke-width="1"/><line x1="${hx + sx - 3}" x2="${hx + sx + 3}" y1="${hy + sy - 1.5}" y2="${hy + sy + 1.5}" stroke="rgba(0,0,0,.5)" stroke-width="1.2"/>`;
  }
  return `<defs>${d}</defs>${s}`;
}
const STD_G = { W: 15.85, H: 12, LX: 0.5, BX: 6.5, B: 1.2, RX: 7.7, RE: 13.7, TX: 14.05, TW: 1.3, TOP: 0.5, BOT: 11.5, MID: 6, PL: 4.6 };
// a small live preview of a skin: the real board drawing with a few checkers in the current colours
function thumbSVG(id, ckA, ckB) {
  const S = 100, g = STD_G, a = CK[ckA] || CK.gold, b = CK[ckB] || CK.black;
  let s = `<svg viewBox="0 0 ${g.W * S} ${g.H * S}" aria-hidden="true">${boardMarkup(id, g, 'th' + id)}`;
  const disc = (c, x, y) => `<circle cx="${x}" cy="${y}" r="45" fill="${c.c2}" stroke="${c.c4}" stroke-width="6"/><circle cx="${x - 10}" cy="${y - 12}" r="16" fill="${c.c1}" opacity=".55"/>`;
  for (let k = 0; k < 3; k++) s += disc(a, (g.LX + .5) * S, (g.BOT - .47 - k * .94) * S) + disc(b, (g.LX + .5) * S, (g.TOP + .47 + k * .94) * S);
  for (let k = 0; k < 2; k++) s += disc(b, (g.RX + 4.5) * S, (g.BOT - .47 - k * .94) * S) + disc(a, (g.RX + 5.5) * S, (g.TOP + .47 + k * .94) * S);
  return s + '</svg>';
}
function applySkin(id) {
  const k = skin(id), st = document.documentElement.style;
  st.setProperty('--lbl', k.lbl); st.setProperty('--lblpip', k.pip); st.setProperty('--lblsh', k.lblsh || 'rgba(0,0,0,.6)');
  const cb = k.cube || SKINS.classic.cube;
  st.setProperty('--cb1', cb[0]); st.setProperty('--cb2', cb[1]); st.setProperty('--cb3', cb[2]); st.setProperty('--cbt', cb[3]);
  st.setProperty('--ckol', k.ckol || 'rgba(0,0,0,0)');
  st.setProperty('--hlb', (k.hl && k.hl[0]) || 'rgba(255,236,170,.95)'); st.setProperty('--hlg', (k.hl && k.hl[1]) || 'rgba(255,226,140,.8)');
  const m = k.ck || 'std';
  if (m !== 'std') {
    const tx = m === 'leather' ? 'leather' : m === 'marble' ? 'marble' : 'flecks', u = makeTex(tx);
    if (u) st.setProperty('--cktex', `url(${u})`);
  }
  if (document.body) { document.body.dataset.ckm = m; document.body.dataset.skin = skinId(id); }
}
root.BGTheme = { CK, CK_IDS, PARTNER, fixPair, applyCheckers, SKINS, SKIN_IDS, ALIAS, skinId, skin, applySkin, boardMarkup, thumbSVG, makeTex, STD_G };
})(typeof window !== 'undefined' ? window : globalThis);
