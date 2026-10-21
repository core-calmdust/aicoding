/*
 * Go board designs (盤面デザイン) and stone sets (碁石) — drawn procedurally on a canvas once and reused as images,
 * the same idea as the backgammon skins (themes.js there), with a Japanese twist:
 *   boards: 本榧 kaya · 新榧 shinkaya · 桂 katsura · 黒漆 urushi (gold lines) · 竹 bamboo · 和紙 washi (sumi lines) ·
 *           夜桜蒔絵 yozakura · 藍染め ai (indigo cloth, white lines)
 *   stones: 蛤と那智黒 classic · 硝子 glass · 雲子 yunzi · 平石 flat
 * Copyright 2026 core-calmdust — Apache License 2.0
 */
(function (root) {
'use strict';
const BOARDS = {
  kaya:     { base: ['#e9c27a', '#ddb062', '#d2a053'], grain: 'masa', gk: .95, line: '#2a1c0e', star: '#1d1209', coord: 'rgba(60,38,16,.78)', edge: ['#b98444', '#8a5d2b'], mini: ['#e1b469', '#2a1c0e'], hl: .16 },
  shinkaya: { base: ['#f4dcaa', '#ecd096', '#e2c283'], grain: 'masa', gk: .6, line: '#3a2a16', star: '#2a1d0e', coord: 'rgba(70,50,24,.75)', edge: ['#cfa76a', '#a07a44'], mini: ['#efd49c', '#3a2a16'], hl: .18 },
  katsura:  { base: ['#d89f62', '#cb8f52', '#bd7f45'], grain: 'ita', gk: .5, line: '#2b170a', star: '#1f1006', coord: 'rgba(62,32,12,.78)', edge: ['#a86a33', '#7b4a20'], mini: ['#cf9459', '#2b170a'], hl: .14 },
  urushi:   { base: ['#2b1210', '#160807', '#0a0404'], grain: 'gloss', gk: 0, line: '#c9a24a', star: '#e0bd62', coord: 'rgba(214,180,100,.8)', edge: ['#3a1d18', '#1a0c0a'], mini: ['#1d0f0d', '#c9a24a'], hl: .22 },
  bamboo:   { base: ['#dcbc72', '#d1ad62', '#c7a057'], grain: 'bamboo', gk: .6, line: '#2c2410', star: '#211a0a', coord: 'rgba(56,44,18,.78)', edge: ['#a98a42', '#7c6430'], mini: ['#d4b366', '#2c2410'], hl: .12 },
  washi:    { base: ['#f3ecdc', '#ece3cf', '#e3d8c0'], grain: 'washi', gk: .5, line: '#1b1b1b', star: '#111', coord: 'rgba(40,36,30,.7)', edge: ['#b8ab90', '#8d816a'], mini: ['#efe7d5', '#1b1b1b'], hl: .1, ink: true },
  yozakura: { base: ['#1c2338', '#121829', '#0a0e19'], grain: 'sakura', gk: 0, line: '#d6b46a', star: '#efcf86', coord: 'rgba(230,200,130,.8)', edge: ['#232a40', '#0e1220'], mini: ['#151b2d', '#d6b46a'], hl: .2 },
  ai:       { base: ['#24406a', '#1d3558', '#172b49'], grain: 'cloth', gk: .5, line: '#eef2f7', star: '#ffffff', coord: 'rgba(225,235,248,.8)', edge: ['#1a2d4a', '#0f1c31'], mini: ['#203a60', '#eef2f7'], hl: .1 },
};
const BOARD_IDS = ['kaya', 'shinkaya', 'katsura', 'urushi', 'bamboo', 'washi', 'yozakura', 'ai'];
const STONES = {
  classic: { b: { c: ['#5a5a5c', '#262628', '#0d0d0e', '#000'], spec: .35, matte: true }, w: { c: ['#ffffff', '#f6f3ec', '#e2ddd0', '#a9a291'], spec: .5, shell: true }, mini: ['#141414', '#f4f1ea'] },
  glass:   { b: { c: ['#8a8f99', '#2e3138', '#0f1013', '#000'], spec: .9 }, w: { c: ['#ffffff', '#f2f4f6', '#d6dce2', '#9aa3ad'], spec: .9, milky: true }, mini: ['#17191d', '#eef1f4'] },
  yunzi:   { b: { c: ['#56635a', '#26302a', '#121814', '#050806'], spec: .18, rim: '#3e5a46' }, w: { c: ['#fffbea', '#f4ecd2', '#e0d4b2', '#a59870'], spec: .2 }, mini: ['#1b231e', '#f2e9cc'] },
  flat:    { b: { c: ['#222', '#1a1a1a', '#141414', '#0a0a0a'], spec: 0, flat: true }, w: { c: ['#fafafa', '#f4f4f4', '#ececec', '#cfcfcf'], spec: 0, flat: true }, mini: ['#1a1a1a', '#f6f6f6'] },
};
const STONE_IDS = ['classic', 'glass', 'yunzi', 'flat'];

function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function vnoise(px, py, seed) {
  const r = rng(seed), L = new Float32Array(px * py); for (let i = 0; i < L.length; i++) L[i] = r();
  const g = (i, j) => L[((j % py) + py) % py * px + ((i % px) + px) % px];
  return (u, v) => {
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
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

// ---------------------------------------------------------------- board texture (square, px x px), cached
const BT = {};
function boardTex(id, px) {
  const key = id + '@' + px;
  if (BT[key] !== undefined) return BT[key];
  if (typeof document === 'undefined') return (BT[key] = '');
  const B = BOARDS[id] || BOARDS.kaya, N = px;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const cx = cv.getContext('2d'); if (!cx) return (BT[key] = '');
  const im = cx.createImageData(N, N), d = im.data;
  const c0 = hex(B.base[0]), c1 = hex(B.base[1]), c2 = hex(B.base[2]);
  const seed = id.length * 131 + 7;
  const f1 = fbm(3, 24, 4, seed), f2 = vnoise(6, 200, seed + 3), f3 = fbm(4, 4, 3, seed + 9), fine = vnoise(48, 48, seed + 5);
  const fw = fbm(3, 2, 3, seed + 21), fw2 = vnoise(9, 5, seed + 23), fb = fbm(12, 2, 2, seed + 29);
  const hash1 = i => { let h = Math.imul(i + seed, 2654435761) >>> 0; h ^= h >>> 13; return (h % 1000) / 1000; };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    // soft overall light: brighter towards the upper left
    const light = 0.5 + 0.5 * (1 - (u * 0.6 + v * 0.4));
    let c = mix(c2, c1, light);
    c = mix(c, c0, Math.max(0, light - 0.6) * 1.2);
    let k = 0;
    if (B.grain === 'masa') {          // 柾目: straight, fine vertical grain with gentle drift and per-line tone
      const drift = (fw(u, v) - .5) * 1.6 + (fw2(u, v) - .5) * 0.5;
      const w = u * 64 + drift, li = Math.floor(w), fr = w - li;
      const lineTone = 0.5 + 0.5 * Math.sin(li * 12.9898) * 0.5 + (hash1(li) - .5) * .6;
      const ln = fr < 0.16 ? Math.pow(1 - fr / 0.16, 1.6) : 0;
      const band = (fb(u, v) - .5);
      k = -ln * (18 + lineTone * 26) * B.gk + band * 22 * B.gk + (fine(u, v) - .5) * 6;
    } else if (B.grain === 'ita') {    // 板目: arcs of growth rings
      const cxu = u - 0.5, w = Math.sqrt(cxu * cxu * 9 + (v + 0.8) * (v + 0.8)) * 22 + f1(u, v) * 2.4, ring = Math.abs(w - Math.round(w));
      const ln = ring < 0.12 ? (1 - ring / 0.12) : 0;
      k = -ln * 36 * B.gk - (f3(u, v) - .5) * 30 * B.gk;
    } else if (B.grain === 'bamboo') { // laminated bamboo strips with nodes
      const strip = Math.floor(u * 14), sv = (strip * 7919 % 13) / 13;
      k = (sv - .5) * 22 + (f2(u, v) - .5) * 18;
      const ux = (u * 14) % 1; if (ux < 0.02 || ux > 0.98) k -= 40;
      const node = ((v * 3 + sv) % 1); if (node < 0.012) k -= 34; else if (node < 0.03) k += 10;
    } else if (B.grain === 'washi') {  // paper fibres
      k = (fine(u, v) - .5) * 14 + (f3(u, v) - .5) * 16;
      const fib = Math.sin((u * 7 + v * 11 + f1(u, v) * 9) * 40); if (fib > 0.985) k -= 22;
    } else if (B.grain === 'cloth') {  // indigo weave
      const tx = (x % 3 === 0 ? -7 : 0) + (y % 3 === 0 ? -5 : 0), slub = (f2(u, v) - .5) * 10;
      k = tx + slub + (f3(u, v) - .5) * 18 + (fine(u, v) - .5) * 8;
    } else if (B.grain === 'gloss' || B.grain === 'sakura') {   // lacquer: deep with a soft reflection band
      const band = Math.exp(-Math.pow((u + v - 0.75) * 3.2, 2)) * 26;
      k = band + (f3(u, v) - .5) * 8;
    }
    const i = (y * N + x) * 4;
    d[i] = Math.max(0, Math.min(255, c[0] + k)); d[i + 1] = Math.max(0, Math.min(255, c[1] + k * 0.9)); d[i + 2] = Math.max(0, Math.min(255, c[2] + k * 0.75)); d[i + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  if (B.grain === 'sakura') {          // gold maki-e cherry petals near the edges
    const r = rng(77);
    for (let k = 0; k < 46; k++) {
      let x = r() * N, y = r() * N;
      const edge = Math.min(x, y, N - x, N - y); if (edge > N * 0.16 && r() < 0.8) continue;
      petal(cx, x, y, N * (0.012 + r() * 0.02), r() * 6.28, r() < 0.3 ? 'rgba(244,196,200,.55)' : 'rgba(226,190,110,.55)');
    }
  }
  // varnish highlight
  const g = cx.createRadialGradient(N * .3, N * .25, N * .05, N * .4, N * .4, N * .9);
  g.addColorStop(0, `rgba(255,255,255,${B.hl})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = g; cx.fillRect(0, 0, N, N);
  let url = ''; try { url = cv.toDataURL('image/jpeg', 0.86); } catch (e) {}
  return (BT[key] = url);
}
function petal(cx, x, y, s, a, col) {
  cx.save(); cx.translate(x, y); cx.rotate(a); cx.fillStyle = col;
  for (let k = 0; k < 5; k++) { cx.rotate(Math.PI * 2 / 5); cx.beginPath(); cx.ellipse(0, -s * 0.9, s * 0.42, s * 0.75, 0, 0, Math.PI * 2); cx.fill(); }
  cx.fillStyle = 'rgba(255,240,200,.7)'; cx.beginPath(); cx.arc(0, 0, s * 0.18, 0, 7); cx.fill();
  cx.restore();
}

// ---------------------------------------------------------------- stones: images with a soft shadow, cached
// img box is 1.3 stone diameters wide (stone centred, shadow below-right); variant 0..3 changes the shell stripes
const SI = {};
function stoneImg(set, color, variant) {
  const key = set + color + (variant || 0);
  if (SI[key] !== undefined) return SI[key];
  if (typeof document === 'undefined') return (SI[key] = '');
  const S = (STONES[set] || STONES.classic)[color === 1 ? 'b' : 'w'];
  const N = 120, D = N / 1.3, R = D / 2, cxp = N / 2, cyp = N / 2;
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const cx = cv.getContext('2d'); if (!cx) return (SI[key] = '');
  // shadow
  const sg = cx.createRadialGradient(cxp + R * .12, cyp + R * .2, R * .6, cxp + R * .12, cyp + R * .2, R * 1.16);
  sg.addColorStop(0, 'rgba(0,0,0,.42)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
  cx.fillStyle = sg; cx.beginPath(); cx.arc(cxp + R * .12, cyp + R * .2, R * 1.16, 0, 7); cx.fill();
  // body
  const c = S.c;
  if (S.flat) {
    cx.fillStyle = c[1]; cx.beginPath(); cx.arc(cxp, cyp, R, 0, 7); cx.fill();
    cx.strokeStyle = color === 1 ? '#000' : '#9a9a9a'; cx.lineWidth = R * .06; cx.stroke();
  } else {
    const g = cx.createRadialGradient(cxp - R * .38, cyp - R * .42, R * .05, cxp, cyp, R);
    g.addColorStop(0, c[0]); g.addColorStop(.35, c[1]); g.addColorStop(.85, c[2]); g.addColorStop(1, c[3]);
    cx.fillStyle = g; cx.beginPath(); cx.arc(cxp, cyp, R, 0, 7); cx.fill();
    if (S.shell) {   // clam-shell growth lines
      const r = rng(31 + (variant || 0) * 17), ang = (variant || 0) * 0.9 + r() * .5;
      cx.save(); cx.beginPath(); cx.arc(cxp, cyp, R * .98, 0, 7); cx.clip();
      cx.translate(cxp, cyp); cx.rotate(ang);
      for (let k = 0; k < 18; k++) {
        const yy = -R + (k + r() * .6) * (2 * R / 18);
        cx.strokeStyle = `rgba(150,140,118,${0.05 + r() * 0.08})`; cx.lineWidth = R * (0.02 + r() * 0.03);
        cx.beginPath(); cx.moveTo(-R, yy); cx.bezierCurveTo(-R * .3, yy - R * .06, R * .3, yy + R * .06, R, yy); cx.stroke();
      }
      cx.restore();
    }
    if (S.milky) { const m = cx.createRadialGradient(cxp + R * .2, cyp + R * .25, R * .1, cxp, cyp, R); m.addColorStop(0, 'rgba(200,215,230,.0)'); m.addColorStop(1, 'rgba(160,180,205,.35)'); cx.fillStyle = m; cx.beginPath(); cx.arc(cxp, cyp, R, 0, 7); cx.fill(); }
    if (S.rim) { cx.strokeStyle = S.rim; cx.globalAlpha = .55; cx.lineWidth = R * .1; cx.beginPath(); cx.arc(cxp, cyp, R * .94, 0.8, 2.6); cx.stroke(); cx.globalAlpha = 1; }
    if (S.matte && color === 1) { const r = rng(5 + (variant || 0)); for (let k = 0; k < 120; k++) { const a = r() * 6.28, rr = Math.sqrt(r()) * R * .95; cx.fillStyle = `rgba(255,255,255,${r() * 0.035})`; cx.fillRect(cxp + Math.cos(a) * rr, cyp + Math.sin(a) * rr, 1.4, 1.4); } }
    // specular highlight
    if (S.spec) {
      const h = cx.createRadialGradient(cxp - R * .36, cyp - R * .42, 0, cxp - R * .36, cyp - R * .42, R * .55);
      h.addColorStop(0, `rgba(255,255,255,${S.spec * (color === 1 ? .55 : .7)})`); h.addColorStop(1, 'rgba(255,255,255,0)');
      cx.fillStyle = h; cx.beginPath(); cx.arc(cxp, cyp, R, 0, 7); cx.fill();
    }
  }
  let url = ''; try { url = cv.toDataURL('image/png'); } catch (e) {}
  return (SI[key] = url);
}

// colours for the flat mini boards (lists, design pickers): [board, line], stones [black, white]
function miniColors(bd, st) { const B = BOARDS[bd] || BOARDS.kaya, S = STONES[st] || STONES.classic; return { board: B.mini[0], line: B.mini[1], b: S.mini[0], w: S.mini[1], star: B.star, ink: !!B.ink }; }

const api = { BOARDS, BOARD_IDS, STONES, STONE_IDS, boardTex, stoneImg, miniColors };
root.GoTheme = api;
})(typeof window !== 'undefined' ? window : globalThis);
