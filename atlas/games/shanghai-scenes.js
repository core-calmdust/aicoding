/* =====================================================================
   上海 — the course maps drawn from scratch (2026-11-14, ユーザー: 画像をそのまま使うと低解像度。コンセプトは引き継いで1からちゃんと
   作る。最低限星座ステージのクオリティ、通して一続きのマップに).
   Each course is ONE continuous landscape in vector (crisp at any zoom): a sky that turns from day to dusk to night along the
   way, far and near hills, a road winding through the ten stars of every area and on into the next, and the course's own
   things scattered beside the road (trees, houses, sweets, castles, lanterns, snowmen, pyramids, books, planets …). Gentle
   motion: clouds drift, stars twinkle, lanterns sway, fish swim, the aurora ripples.
   ShanghaiScenes.pts(id, i) → the ten stage points of area i (box units: x 0..100, y 0..64; the map adds 8)
   ShanghaiScenes.svg(id, NA, uid) → the whole panorama's markup (x 0..NA·116, y 0..64)
   ShanghaiScenes.slice(id, i, NA, uid) → a standalone <svg> of area i (card thumbnails, the stage box)
   ShanghaiScenes.css, .tint(id)
   ===================================================================== */
(function () {
  'use strict';
  const W = 116, H = 64, OX = 8;
  const r1 = v => Math.round(v * 10) / 10;
  const rng = seed => { let s = seed >>> 0 || 1; return () => (s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9 >>> 0, ((s >>> 8) & 0xffff) / 65536); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  // a smooth line through points (Catmull–Rom as cubic Béziers)
  function smooth(P) {
    let d = `M${r1(P[0][0])} ${r1(P[0][1])}`;
    for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`; }
    return d;
  }
  // a hill line across [x0, x1] (sum of waves), closed down to the bottom
  function hill(x0, x1, base, amp, seed, step) {
    const R = rng(seed), f = [R() * 6, R() * 6, R() * 6], P = [];
    for (let x = x0; x <= x1 + .01; x += step || 6) P.push([x, base + amp * (.55 * Math.sin(x * .045 + f[0]) + .3 * Math.sin(x * .11 + f[1]) + .15 * Math.sin(x * .23 + f[2]))]);
    return smooth(P) + `L${r1(x1)} ${H}L${r1(x0)} ${H}Z`;
  }

  /* ---------- the courses: palettes, how the day turns (phase per area: 0 day · .5 dusk · 1 night), what grows by the road ---------- */
  const SKY = {
    day: ['#7cc8f2', '#d6f1ff'], dusk: ['#f08a6c', '#ffd49a'], night: ['#151a48', '#3a3a7a'],
    pastel: ['#f7b7d8', '#fff0f6'], pdusk: ['#c79ae8', '#ffd0e6'], pnight: ['#3b2a6a', '#7a4f9a'],
    space: ['#0b0c2a', '#2a1d5a'], indoor: ['#f6e3c4', '#fff4df'],
  };
  const T = {
    forest: { ph: [0, 0, .3, .5, .75, 1], sky: 'day', far: '#9fd4a8', mid: '#74bf7c', gr: '#8fd07a', gr2: '#6fb862', road: '#f3e2b8', edge: '#c9a86a', props: ['tree', 'tree', 'pine', 'bush', 'mush', 'flowers', 'tree', 'bunny'], big: ['bigtree', 'pond', 'bigtree', 'pond', 'bigtree', 'pond'] },
    sweets: { ph: [0, 0, .2, .4, .55, .7], sky: 'pastel', far: '#ffc8e0', mid: '#ffb0d0', gr: '#ffd6e8', gr2: '#ffc0dc', road: '#fff6e0', edge: '#e9b48a', props: ['lolli', 'cane', 'cupcake', 'donut', 'cotton', 'lolli', 'candy'], big: ['cakehouse', 'cakehouse', 'cakehouse', 'cakehouse', 'cakehouse', 'cakehouse'] },
    sea: { ph: [0, 0, .35, .55, .8, 1], sky: 'day', sea: true, far: '#7fd0e8', mid: '#5bb8dc', gr: '#f6e2b2', gr2: '#ecd096', road: '#fff7e2', edge: '#d8b878', props: ['palm', 'umbrella', 'house', 'house', 'shell', 'crab', 'palm'], big: ['lighthouse', 'boat', 'lighthouse', 'boat', 'lighthouse', 'boat'] },
    castle: { ph: [0, 0, .25, .45, .65, .9], sky: 'pastel', rainbow: true, far: '#d7c4f4', mid: '#bfe3b0', gr: '#c9ecb4', gr2: '#ade09a', road: '#fff4e8', edge: '#e2b8c8', props: ['flowers', 'tulip', 'bush', 'tree', 'flowers', 'heart'], big: ['castle', 'castle', 'castle', 'castle', 'castle', 'castle'] },
    festival: { ph: [0, .15, .35, .6, .85, 1], sky: 'day', far: '#b7d6a0', mid: '#9cc985', gr: '#a9d58c', gr2: '#92c477', road: '#f5e0b6', edge: '#c69a5e', props: ['stall', 'balloons', 'lamp', 'stall', 'flag', 'tree'], big: ['ferris', 'tent', 'ferris', 'tent', 'ferris', 'tent'], bunting: true, fireworks: true },
    autumn: { ph: [0, .2, .4, .55, .75, 1], sky: 'day', far: '#e7b48a', mid: '#d99a62', gr: '#e8c48a', gr2: '#d9ab6a', road: '#fbe9c4', edge: '#b9874c', props: ['maple', 'maple2', 'mush', 'maple', 'hut', 'leafpile'], big: ['mountain', 'hut', 'mountain', 'hut', 'mountain', 'hut'], leaves: true },
    snow: { ph: [0, .1, .35, .6, .85, 1], sky: 'day', far: '#dfeefc', mid: '#c9e2f6', gr: '#f4f9ff', gr2: '#e1eef9', road: '#ffffff', edge: '#a9c4dc', props: ['spine', 'spine', 'snowman', 'penguin', 'spine', 'igloo'], big: ['house', 'igloo', 'house', 'iceberg', 'igloo', 'iceberg'], aurora: true },
    desert: { ph: [0, .2, .4, .6, .8, 1], sky: 'day', far: '#f2c27e', mid: '#e8ae66', gr: '#f6d39a', gr2: '#ecc07c', road: '#fff0d0', edge: '#c99a5a', props: ['cactus', 'cactus2', 'rock', 'palm', 'cactus', 'skull'], big: ['pyramid', 'oasis', 'pyramid', 'camels', 'pyramid', 'oasis'] },
    toys: { ph: [0, .1, .3, .55, .8, 1], indoor: true, far: '#f2d9b4', mid: '#e9c99c', gr: '#d9a873', gr2: '#c99662', road: '#fff4dc', edge: '#b58552', props: ['blocks', 'ball', 'books', 'train', 'duck', 'blocks'], big: ['shelf', 'window', 'shelf', 'window', 'shelf', 'window'] },
    space: { ph: [1, 1, 1, 1, 1, 1], sky: 'space', far: '#5a4b9a', mid: '#46397f', gr: '#7a6bb8', gr2: '#6a5ba6', road: '#d9d2ff', edge: '#8a7fd0', props: ['crater', 'crystal', 'flagp', 'crater', 'alien', 'crystal'], big: ['planet', 'rocket', 'planet', 'rocket', 'planet', 'rocket'], planets: true },
  };
  /* ---------- the chapters (2026-11-14, ユーザー: ループ感が強い。先に進める楽しみを): every area is its own place on the way,
     with its own ground colour, its own things, two landmarks of its own, now and then a river the road crosses on a bridge,
     a signpost at its start and, at the end of the course, the goal. (p: things, b: landmarks, g: ground [near, far hill],
     r: a river's colour) ---------- */
  const CH = {
    forest: [{ p: ['flowers', 'bunny', 'bush', 'tulip', 'flowers'], b: ['bigtree', 'pond'], g: ['#9edb82', '#b2e2a8'] },
      { p: ['tree', 'tree', 'bush', 'apple', 'mush'], b: ['bigtree', 'bigtree'], g: ['#8fd07a', '#9fd4a8'] },
      { p: ['reed', 'duck2', 'tree', 'flowers'], b: ['pond', 'bigtree'], g: ['#86cc76', '#93cfa0'], r: '#7cc9ea' },
      { p: ['mush', 'mush', 'flowers', 'bunny'], b: ['mushhouse', 'mushhouse'], g: ['#7ec46e', '#8cc898'] },
      { p: ['pine', 'pine', 'tree', 'mush', 'firefly'], b: ['pine3', 'pine3'], g: ['#5fae62', '#6fb890'] },
      { p: ['firefly', 'pine', 'mush', 'lamp'], b: ['treehouse', 'pine3'], g: ['#5aa45c', '#64ac84'], goal: 'treehouse' }],
    sweets: [{ p: ['lolli', 'candy', 'lolli', 'cane'], b: ['lolli2', 'cakehouse'], g: ['#ffd6e8', '#ffc8e0'] },
      { p: ['cupcake', 'cupcake', 'candy', 'donut'], b: ['cakehouse', 'cupcake2'], g: ['#ffe2c8', '#ffd0b0'] },
      { p: ['donut', 'candy', 'cane'], b: ['cakehouse', 'lolli2'], g: ['#ffd8b8', '#e8b090'], r: '#8a5434' },
      { p: ['donut', 'cupcake', 'cotton'], b: ['cakehouse', 'cakehouse'], g: ['#fff0c8', '#ffd8a0'] },
      { p: ['cotton', 'cotton', 'candy', 'lolli'], b: ['cupcake2', 'lolli2'], g: ['#e0d0ff', '#c8b8ff'] },
      { p: ['cotton', 'candy', 'cane', 'lolli'], b: ['cakecastle', 'lolli2'], g: ['#ffd0e8', '#e8b8ff'], goal: 'cakecastle' }],
    sea: [{ p: ['umbrella', 'shell', 'crab', 'umbrella'], b: ['palm', 'boat'], g: ['#f6e2b2', '#7fd0e8'] },
      { p: ['house', 'house', 'palm', 'shell'], b: ['boat', 'house'], g: ['#f2dca8', '#7fd0e8'] },
      { p: ['rock2', 'shell', 'crab', 'palm'], b: ['lighthouse', 'boat'], g: ['#e8d29a', '#6ec4e0'] },
      { p: ['palm', 'crab', 'rock2', 'shell'], b: ['boat', 'palm'], g: ['#f0d8a0', '#5ab8dc'], r: '#6cc4e8' },
      { p: ['umbrella', 'house', 'lamp', 'shell'], b: ['pier', 'boat'], g: ['#ecd096', '#4aa8d0'] },
      { p: ['lamp', 'palm', 'crab'], b: ['ship', 'lighthouse'], g: ['#e2c48a', '#3a8ab8'], goal: 'ship' }],
    castle: [{ p: ['flowers', 'tulip', 'flowers', 'heart'], b: ['bush', 'tree'], g: ['#c9ecb4', '#d7c4f4'] },
      { p: ['tulip', 'tulip', 'flowers'], b: ['windmill', 'windmill'], g: ['#bfe6a8', '#d0c0f0'] },
      { p: ['flowers', 'heart', 'bush'], b: ['tree', 'windmill'], g: ['#b8e2a0', '#c8b8ee'], r: '#9ad8ff' },
      { p: ['house', 'tulip', 'lamp'], b: ['castle', 'house'], g: ['#c4e8b0', '#c0b0ea'] },
      { p: ['lamp', 'flowers', 'heart'], b: ['gate', 'castle'], g: ['#b0dca0', '#b8a8e6'] },
      { p: ['heart', 'lamp', 'tulip'], b: ['bigcastle', 'castle'], g: ['#a8d898', '#b0a0e0'], goal: 'bigcastle' }],
    festival: [{ p: ['stall', 'flag', 'balloons'], b: ['stall', 'tent'], g: ['#a9d58c', '#b7d6a0'] },
      { p: ['balloons', 'stall', 'flag', 'lamp'], b: ['tent', 'tent'], g: ['#a2d086', '#b0d29a'] },
      { p: ['stall', 'balloons', 'lamp'], b: ['ferris', 'tent'], g: ['#9ccb80', '#a8cd94'] },
      { p: ['lamp', 'stall', 'flag'], b: ['ferris', 'stall'], g: ['#94c47a', '#a0c88e'], r: '#7ac8e8' },
      { p: ['lantern', 'lantern', 'stall', 'lamp'], b: ['tent', 'ferris'], g: ['#8cbe74', '#98c288'] },
      { p: ['lantern', 'lamp', 'balloons'], b: ['stage', 'ferris'], g: ['#86b86e', '#90bc82'], goal: 'stage' }],
    autumn: [{ p: ['rice', 'rice', 'leafpile', 'hut'], b: ['hut', 'mountain'], g: ['#ecd28a', '#e7b48a'] },
      { p: ['kaki', 'hut', 'leafpile', 'maple2'], b: ['hut', 'kaki'], g: ['#e8c48a', '#e2ac80'] },
      { p: ['maple', 'maple', 'maple2', 'mush'], b: ['mountain', 'maple'], g: ['#e4b47a', '#dc9a6c'] },
      { p: ['maple', 'rock', 'leafpile'], b: ['mountain', 'maple2'], g: ['#dcaa70', '#d29062'], r: '#7cc4e0' },
      { p: ['rock', 'maple2', 'pine', 'rock'], b: ['mountain', 'mountain'], g: ['#d0a06c', '#c4885c'] },
      { p: ['lamp', 'maple', 'rock'], b: ['torii', 'onsen'], g: ['#c8966a', '#ba7e58'], goal: 'torii' }],
    snow: [{ p: ['house', 'snowman', 'spine'], b: ['house', 'house'], g: ['#f4f9ff', '#dfeefc'] },
      { p: ['spine', 'spine', 'spine', 'snowman'], b: ['spine3', 'spine3'], g: ['#eef6ff', '#d6e8fa'] },
      { p: ['spine', 'snowman', 'penguin'], b: ['ice', 'spine3'], g: ['#e8f2ff', '#cde2f8'], r: '#bfe4f8' },
      { p: ['penguin', 'penguin', 'spine'], b: ['iceberg', 'iceberg'], g: ['#e2eefc', '#c4dcf4'] },
      { p: ['igloo', 'penguin', 'snowman', 'lamp'], b: ['igloo', 'iceberg'], g: ['#dceafc', '#bcd6f2'] },
      { p: ['penguin', 'spine', 'lamp'], b: ['observ', 'igloo'], g: ['#d6e6fa', '#b4d0ee'], goal: 'observ' }],
    desert: [{ p: ['cactus', 'cactus2', 'rock', 'skull'], b: ['cactus', 'rock'], g: ['#f6d39a', '#f2c27e'] },
      { p: ['palm', 'cactus2', 'house'], b: ['oasis', 'palm'], g: ['#f2cc90', '#ecba76'] },
      { p: ['cactus', 'rock', 'cactus2'], b: ['camels', 'camels'], g: ['#eec488', '#e6b06c'] },
      { p: ['rock', 'rock2', 'cactus'], b: ['canyon', 'canyon'], g: ['#e8b478', '#dc9e62'], r: '#6cc4e8' },
      { p: ['cactus', 'rock', 'skull'], b: ['pyramid', 'pyramid'], g: ['#e6b880', '#d8a466'] },
      { p: ['lamp', 'cactus2', 'rock'], b: ['sphinx', 'pyramid'], g: ['#dcae78', '#cc9860'], goal: 'sphinx' }],
    toys: [{ p: ['blocks', 'blocks', 'ball', 'duck'], b: ['blocktower', 'shelf'], g: ['#d9a873', '#f2d9b4'] },
      { p: ['train', 'rails', 'blocks'], b: ['window', 'blocktower'], g: ['#d4a26c', '#eed2ac'] },
      { p: ['books', 'books', 'ball'], b: ['shelf', 'bookstack'], g: ['#cf9c66', '#ead0a6'] },
      { p: ['duck', 'blocks', 'ball'], b: ['dollhouse', 'window'], g: ['#c99662', '#e6c89c'] },
      { p: ['books', 'duck', 'lamp'], b: ['window', 'shelf'], g: ['#c08c5a', '#dcbc90'] },
      { p: ['ball', 'blocks', 'train'], b: ['toycastle', 'blocktower'], g: ['#b88456', '#d4b086'], goal: 'toycastle' }],
    space: [{ p: ['flagp', 'crater', 'crystal'], b: ['rocket', 'rocket'], g: ['#8a7bc8', '#5a4b9a'] },
      { p: ['crater', 'crater', 'flagp'], b: ['planet', 'rocket'], g: ['#9a9ab8', '#6a6a8a'] },
      { p: ['asteroid', 'crater', 'crystal'], b: ['asteroid', 'planet'], g: ['#7a6bb8', '#4a3b8a'] },
      { p: ['alien', 'crystal', 'crater'], b: ['station', 'planet'], g: ['#6a8ac8', '#3a5a9a'] },
      { p: ['crystal', 'crystal', 'alien'], b: ['planet', 'station'], g: ['#b86ac8', '#7a3a9a'] },
      { p: ['crystal', 'alien', 'flagp'], b: ['starpalace', 'planet'], g: ['#c88ad8', '#8a4aaa'], goal: 'starpalace' }],
  };
  const TINT = { forest: '#1d3a2a', sweets: '#3a2236', sea: '#14304a', castle: '#2c2550', festival: '#33203f', autumn: '#3a2418', snow: '#1b2a44', desert: '#3a2a18', toys: '#2a2440', space: '#0d0e2a' };

  /* ---------- the stage points: a winding road on the ground (y 32..56), a little different area to area ---------- */
  const pts = (id, i) => { const R = rng(([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) + i * 97) >>> 0), ph = R() * 6;
    return Array.from({ length: 10 }, (_, k) => [r1(4 + k * 10.2), r1(44 + 9 * Math.sin(k * .78 + ph) + 2.5 * Math.cos(k * 1.7 + i))]); };

  /* ---------- the things by the road (local: (0,0) the foot, up is −y, about 10 units tall at s = 1) ---------- */
  const g = (x, y, s, inner, cls) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s.toFixed(2)})"${cls ? ` class="${cls}"` : ''}>${inner}</g>`;
  const shadow = w => `<ellipse cx="0" cy="0" rx="${w}" ry="${(w * .28).toFixed(2)}" fill="rgba(0,0,0,.12)"/>`;
  const P = {
    tree: R => { const c = ['#5fb85a', '#4fa84e', '#6cc46a'][R() * 3 | 0]; return shadow(4) + `<rect x="-.7" y="-5" width="1.4" height="5" rx=".5" fill="#9a6a3e"/><circle cx="0" cy="-7.5" r="4" fill="${c}"/><circle cx="-2.2" cy="-5.6" r="2.8" fill="${c}"/><circle cx="2.3" cy="-5.8" r="2.6" fill="${c}"/><circle cx="-1.2" cy="-8.8" r="1.6" fill="rgba(255,255,255,.22)"/>`; },
    pine: () => shadow(3.4) + `<rect x="-.6" y="-2.4" width="1.2" height="2.4" fill="#8a5a32"/><path d="M0 -12 L3.6 -5.4 H2.2 L4.4 -2.2 H-4.4 L-2.2 -5.4 H-3.6Z" fill="#3f9a5a"/><path d="M0 -12 L-3.6 -5.4 H-1.8 L-4.4 -2.2 H-1Z" fill="rgba(255,255,255,.12)"/>`,
    spine: () => shadow(3.4) + `<rect x="-.6" y="-2.4" width="1.2" height="2.4" fill="#8a5a32"/><path d="M0 -12 L3.6 -5.4 H2.2 L4.4 -2.2 H-4.4 L-2.2 -5.4 H-3.6Z" fill="#3f8a6a"/><path d="M0 -12 L2.2 -8 Q0 -7 -2.2 -8Z M-2.6 -5.4 Q0 -4.4 2.6 -5.4 L2 -6.4 Q0 -5.6 -2 -6.4Z M-4 -2.4 Q0 -1.4 4 -2.4 L3.4 -3.3 Q0 -2.4 -3.4 -3.3Z" fill="#fff"/>`,
    bush: () => shadow(3) + `<circle cx="-1.6" cy="-1.6" r="1.8" fill="#5aae58"/><circle cx="1.4" cy="-1.8" r="2" fill="#4ea64c"/><circle cx="0" cy="-2.8" r="1.8" fill="#66bb62"/><circle cx="-.6" cy="-2" r=".35" fill="#ff7a8a"/><circle cx="1.2" cy="-2.6" r=".35" fill="#fff07a"/>`,
    mush: R => { const c = R() < .5 ? '#e8504a' : '#f08a3a'; return shadow(2) + `<rect x="-.7" y="-2.6" width="1.4" height="2.6" rx=".6" fill="#fff4e0"/><path d="M-2.6 -2.4 Q-2.6 -5.4 0 -5.4 Q2.6 -5.4 2.6 -2.4Z" fill="${c}"/><circle cx="-1.1" cy="-3.8" r=".5" fill="#fff"/><circle cx=".9" cy="-4.2" r=".4" fill="#fff"/><circle cx="1.6" cy="-3" r=".35" fill="#fff"/>`; },
    flowers: R => { let s = ''; for (let k = 0; k < 4; k++) { const x = (R() - .5) * 5, h = 1.4 + R() * 1.4, c = ['#ff8aa8', '#fff07a', '#ffffff', '#b89aff', '#ffb070'][R() * 5 | 0]; s += `<path d="M${r1(x)} 0 V${r1(-h)}" stroke="#5aa858" stroke-width=".3"/>` + [0, 72, 144, 216, 288].map(a => `<circle cx="${r1(x + Math.cos(a / 57.3) * .55)}" cy="${r1(-h + Math.sin(a / 57.3) * .55)}" r=".42" fill="${c}"/>`).join('') + `<circle cx="${r1(x)}" cy="${r1(-h)}" r=".32" fill="#ffcf4a"/>`; } return s; },
    tulip: R => { const c = ['#ff7aa0', '#ffb36a', '#c58aff'][R() * 3 | 0]; return `<path d="M0 0 V-3" stroke="#4e9e50" stroke-width=".4"/><path d="M0 -1.4 Q-1.2 -1.8 -1.4 -2.8 Q-.4 -2.4 0 -1.6Z" fill="#5aae58"/><path d="M-1 -3 Q-1 -4.8 0 -4.6 Q1 -4.8 1 -3 Q0 -2.4 -1 -3Z" fill="${c}"/>`; },
    heart: () => `<path d="M0 -1 C-2 -2.4 -1.6 -4.4 0 -3.6 C1.6 -4.4 2 -2.4 0 -1Z" fill="#ff8ab0"/>`,
    bunny: () => shadow(1.6) + `<ellipse cx="0" cy="-1.3" rx="1.5" ry="1.2" fill="#fff"/><circle cx=".9" cy="-2.3" r=".9" fill="#fff"/><ellipse cx=".6" cy="-3.7" rx=".3" ry=".9" fill="#fff"/><ellipse cx="1.2" cy="-3.6" rx=".3" ry=".85" fill="#fff"/><circle cx="1.3" cy="-2.4" r=".14" fill="#333"/><circle cx="-1.4" cy="-1.4" r=".35" fill="#fff"/>`,
    bigtree: () => shadow(7) + `<path d="M-1.4 0 Q-1 -6 -1.2 -9 H1.2 Q1 -6 1.4 0Z" fill="#8a5a32"/><circle cx="0" cy="-14" r="7" fill="#4aa04a"/><circle cx="-4.6" cy="-10.6" r="4.6" fill="#55ad52"/><circle cx="4.6" cy="-11" r="4.4" fill="#3f9644"/><circle cx="-2" cy="-17" r="3" fill="rgba(255,255,255,.18)"/><circle cx="2.6" cy="-12" r=".7" fill="#ff6a5a"/><circle cx="-3" cy="-9" r=".7" fill="#ff6a5a"/><circle cx="-.4" cy="-10.4" r=".7" fill="#ff6a5a"/>`,
    pond: () => `<ellipse cx="0" cy="-1" rx="9" ry="2.6" fill="#7cc9ea"/><ellipse cx="0" cy="-1.3" rx="7.4" ry="1.7" fill="#a6defa"/><ellipse cx="-3" cy="-1.2" rx="1.4" ry=".5" fill="#6cbf6a"/><ellipse cx="3.4" cy="-.6" rx="1.1" ry=".4" fill="#6cbf6a"/>`,
    // sweets
    lolli: R => { const c = ['#ff6fa8', '#7ad0ff', '#ffb84a'][R() * 3 | 0]; return shadow(1.6) + `<rect x="-.3" y="-6" width=".6" height="6" fill="#fff"/><circle cx="0" cy="-7.6" r="2.4" fill="${c}"/><path d="M0 -7.6 m-1.6 0 a1.6 1.6 0 1 1 1.6 1.6 a1 1 0 1 1 -1 -1" fill="none" stroke="#fff" stroke-width=".45"/>`; },
    cane: () => `<path d="M0 0 V-6 Q0 -8.4 1.8 -8.4 Q3.4 -8.4 3.4 -6.8" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/><path d="M0 0 V-6 Q0 -8.4 1.8 -8.4 Q3.4 -8.4 3.4 -6.8" fill="none" stroke="#ff5a7a" stroke-width="1.1" stroke-dasharray=".8 .8" stroke-linecap="round"/>`,
    cupcake: R => { const c = ['#ff9ac4', '#b8e6ff', '#fff2a8'][R() * 3 | 0]; return shadow(2) + `<path d="M-1.8 0 L-2.2 -2.6 H2.2 L1.8 0Z" fill="#e8a46a"/><path d="M-2.4 -2.6 Q-2.6 -4.8 0 -5.2 Q2.6 -4.8 2.4 -2.6Z" fill="${c}"/><circle cx="0" cy="-5.6" r=".6" fill="#ff4a6a"/>`; },
    donut: () => `<ellipse cx="0" cy="-1.6" rx="2.4" ry="1.5" fill="#e3a36a"/><ellipse cx="0" cy="-1.9" rx="2.2" ry="1.2" fill="#ff8ab8"/><ellipse cx="0" cy="-1.8" rx=".7" ry=".4" fill="#c98a52"/><path d="M-1.4 -2.2 l.4 .2 M.8 -2.6 l.4 -.1 M1.2 -1.6 l-.3 .3" stroke="#fff" stroke-width=".25"/>`,
    cotton: R => { const c = R() < .5 ? '#ffc4e0' : '#c4e6ff'; return shadow(2.4) + `<rect x="-.3" y="-4" width=".6" height="4" fill="#fff4e0"/><circle cx="0" cy="-6" r="2.4" fill="${c}"/><circle cx="-1.6" cy="-5" r="1.6" fill="${c}"/><circle cx="1.6" cy="-5.2" r="1.6" fill="${c}"/>`; },
    candy: () => `<path d="M-1.6 -1.2 L-2.6 -.4 L-2.6 -2 Z M1.6 -1.2 L2.6 -2 L2.6 -.4Z" fill="#ffd36a"/><ellipse cx="0" cy="-1.2" rx="1.6" ry="1" fill="#ff6aa0"/>`,
    cakehouse: () => shadow(8) + `<rect x="-7" y="-8" width="14" height="8" rx="1" fill="#ffe2c4"/><path d="M-7.6 -8 Q-7 -10.4 -4.6 -9.6 Q-2.4 -11.2 0 -9.8 Q2.4 -11.2 4.6 -9.6 Q7 -10.4 7.6 -8Z" fill="#ff9ac4"/><path d="M-7 -4 H7" stroke="#ff9ac4" stroke-width="1.2"/><rect x="-1.6" y="-4" width="3.2" height="4" rx="1.4" fill="#b8784a"/><rect x="-5.6" y="-7" width="2.6" height="2.2" rx=".4" fill="#fff7a8" class="shs-win"/><rect x="3" y="-7" width="2.6" height="2.2" rx=".4" fill="#fff7a8" class="shs-win"/><rect x="-.4" y="-14" width=".8" height="4" fill="#fff"/><path d="M0 -14 Q.6 -15 0 -15.8 Q-.6 -15 0 -14Z" fill="#ffb84a" class="shs-flame"/><circle cx="-4" cy="-10.2" r=".8" fill="#ff4a6a"/><circle cx="4" cy="-10.2" r=".8" fill="#ff4a6a"/>`,
    // sea
    palm: () => shadow(3) + `<path d="M0 0 Q.6 -5 2 -10" stroke="#a87a4a" stroke-width="1.1" fill="none"/><path d="M2 -10 Q-2 -11.6 -4.4 -9 M2 -10 Q5.6 -11.8 7 -8.6 M2 -10 Q1.4 -13.4 -1.6 -13.6 M2 -10 Q4.6 -13 6.6 -12" stroke="#3faa6a" stroke-width="1.1" fill="none" stroke-linecap="round"/><circle cx="1.6" cy="-9.4" r=".6" fill="#8a5a32"/>`,
    umbrella: R => { const c = ['#ff6a6a', '#4ab8ff', '#ffb84a'][R() * 3 | 0]; return `<path d="M0 0 V-5" stroke="#999" stroke-width=".3"/><path d="M-3.4 -4.6 Q0 -7.6 3.4 -4.6Z" fill="${c}"/><path d="M-1.2 -4.6 Q0 -7.2 1.2 -4.6" fill="#fff" opacity=".7"/><rect x="-2.4" y="-.6" width="3" height=".6" rx=".3" fill="#ffffff"/>`; },
    house: R => { const w = ['#ffd8a8', '#bfe6ff', '#ffc4d4', '#d8f2c4', '#fff2b0'][R() * 5 | 0], rf = ['#e85a5a', '#4a8ad8', '#f08a3a', '#7a5ac8'][R() * 4 | 0]; return shadow(4) + `<rect x="-3.4" y="-5" width="6.8" height="5" fill="${w}"/><path d="M-4.2 -5 L0 -8.6 L4.2 -5Z" fill="${rf}"/><rect x="-.8" y="-2.6" width="1.6" height="2.6" rx=".6" fill="#8a5a3a"/><rect x="-2.8" y="-4" width="1.4" height="1.2" fill="#fff4a0" class="shs-win"/><rect x="1.4" y="-4" width="1.4" height="1.2" fill="#fff4a0" class="shs-win"/>`; },
    shell: () => `<path d="M-1.2 0 Q-1.4 -1.8 0 -2 Q1.4 -1.8 1.2 0Z" fill="#ffc8b0"/><path d="M0 -1.9 V0 M-.6 -1.6 L-.4 0 M.6 -1.6 L.4 0" stroke="#e59a80" stroke-width=".18"/>`,
    crab: () => `<ellipse cx="0" cy="-.9" rx="1.4" ry=".9" fill="#ff6a4a"/><circle cx="-1.6" cy="-1.6" r=".5" fill="#ff6a4a"/><circle cx="1.6" cy="-1.6" r=".5" fill="#ff6a4a"/><circle cx="-.4" cy="-1.7" r=".2" fill="#222"/><circle cx=".4" cy="-1.7" r=".2" fill="#222"/>`,
    lighthouse: () => shadow(4) + `<path d="M-2.6 0 L-1.8 -14 H1.8 L2.6 0Z" fill="#fff"/><path d="M-2.4 -3 L-2.2 -6 H2.2 L2.4 -3Z M-2 -9 L-1.9 -11.4 H1.9 L2 -9Z" fill="#e85a5a"/><rect x="-2.2" y="-17" width="4.4" height="3" fill="#ffe27a" class="shs-win"/><path d="M-2.8 -17 H2.8 L0 -19.6Z" fill="#e85a5a"/><path d="M2 -16 L14 -18.6 L14 -13.4Z" fill="url(#shs-beam)" class="shs-beam"/>`,
    boat: () => `<g class="shs-bob"><path d="M-4 -1 H4 L2.8 .6 H-2.8Z" fill="#e86a4a"/><path d="M0 -1 V-8" stroke="#8a5a32" stroke-width=".4"/><path d="M.2 -7.6 L3.6 -1.6 H.2Z" fill="#fff"/><path d="M-.2 -6.4 L-3 -1.6 H-.2Z" fill="#f4f4f4"/></g>`,
    // castle
    castle: () => { const t = (x, h, c) => `<rect x="${x - 1.6}" y="${-h}" width="3.2" height="${h}" fill="#fff6fb"/><path d="M${x - 2.2} ${-h} L${x} ${-h - 4.4} L${x + 2.2} ${-h}Z" fill="${c}"/><path d="M${x} ${-h - 4.4} V${-h - 6.4}" stroke="#999" stroke-width=".2"/><path d="M${x} ${-h - 6.4} L${x + 1.6} ${-h - 5.9} L${x} ${-h - 5.4}Z" fill="#ff7aa8"/><rect x="${x - .5}" y="${-h + 1.6}" width="1" height="1.4" rx=".5" fill="#9ac8ff" class="shs-win"/>`;
      return shadow(9) + t(-6, 9, '#b48aff') + t(6, 9, '#b48aff') + `<rect x="-5" y="-7" width="10" height="7" fill="#fff0f8"/><path d="M-5 -7 v-1 h1.2 v1 h1.2 v-1 h1.2 v1 h1.2 v-1 h1.2 v1 h1.2 v-1 h1.2 v1 h1.2 v-1 h1.2 v1" fill="#fff0f8"/><path d="M-1.6 0 V-3 Q0 -4.6 1.6 -3 V0Z" fill="#c88ab0"/>` + t(0, 13, '#ff8ab8'); },
    // festival
    stall: R => { const c = ['#ff6a6a', '#4ab0ff', '#ffb84a', '#6ad08a'][R() * 4 | 0]; return shadow(4) + `<rect x="-3.6" y="-4" width="7.2" height="4" fill="#fff2dc"/><path d="M-4.2 -4 H4.2 L3.6 -6.6 H-3.6Z" fill="${c}"/><path d="M-4.2 -4 q.7 1 1.4 0 q.7 1 1.4 0 q.7 1 1.4 0 q.7 1 1.4 0 q.7 1 1.4 0 q.7 1 1.4 0" fill="${c}"/><rect x="-2.6" y="-2.6" width="5.2" height="1" fill="#e8c890"/><circle cx="-3" cy="-6.8" r=".6" fill="#ff4a4a" class="shs-lan"/><circle cx="3" cy="-6.8" r=".6" fill="#ff4a4a" class="shs-lan"/>`; },
    balloons: () => `<g class="shs-bob">${[[-1.2, -8, '#ff6a8a'], [.8, -9, '#6ac8ff'], [0, -7, '#ffd24a']].map(([x, y, c]) => `<path d="M0 0 Q${x / 2} ${y / 2} ${x} ${y + 1.4}" stroke="#aaa" stroke-width=".15" fill="none"/><ellipse cx="${x}" cy="${y}" rx="1.1" ry="1.4" fill="${c}"/><ellipse cx="${x - .4}" cy="${y - .5}" rx=".3" ry=".4" fill="rgba(255,255,255,.6)"/>`).join('')}</g>`,
    lamp: () => `<path d="M0 0 V-7" stroke="#4a4a5a" stroke-width=".5"/><circle cx="0" cy="-7.6" r="1" fill="#ffe27a" class="shs-win"/><circle cx="0" cy="-7.6" r="2.4" fill="#ffe27a" opacity=".25" class="shs-win"/>`,
    flag: R => { const c = ['#ff6a6a', '#4ab0ff', '#ffb84a'][R() * 3 | 0]; return `<path d="M0 0 V-8" stroke="#8a6a4a" stroke-width=".35"/><path d="M0 -8 L3 -7.2 L0 -6.4Z" fill="${c}" class="shs-flap"/>`; },
    ferris: () => { let s = `<g class="shs-spin" style="transform-origin:0px -12px">`; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, x = Math.cos(a) * 8, y = -12 + Math.sin(a) * 8; s += `<path d="M0 -12 L${r1(x)} ${r1(y)}" stroke="#ffffff" stroke-width=".3"/><rect x="${r1(x - .9)}" y="${r1(y - .4)}" width="1.8" height="1.6" rx=".4" fill="${['#ff6a8a', '#6ac8ff', '#ffd24a', '#8ae07a'][k % 4]}"/>`; } s += `<circle cx="0" cy="-12" r="8" fill="none" stroke="#ffffff" stroke-width=".5"/></g>`;
      return shadow(5) + `<path d="M-4 0 L0 -12 L4 0" stroke="#e8e8f0" stroke-width=".7" fill="none"/>` + s + `<circle cx="0" cy="-12" r=".8" fill="#ff6a8a"/>`; },
    tent: () => shadow(7) + `<path d="M-7 0 L0 -10 L7 0Z" fill="#ff6a6a"/><path d="M-3.5 0 L0 -10 L3.5 0Z" fill="#fff"/><path d="M0 -10 V-12.4" stroke="#999" stroke-width=".25"/><path d="M0 -12.4 L2 -11.8 L0 -11.2Z" fill="#ffd24a" class="shs-flap"/><path d="M-1.2 0 L0 -3 L1.2 0Z" fill="#7a3a3a"/>`,
    // autumn
    maple: R => { const c = ['#e8603a', '#f08a2a', '#d84a3a'][R() * 3 | 0]; return shadow(4) + `<rect x="-.6" y="-5" width="1.2" height="5" fill="#8a5a32"/><circle cx="0" cy="-8" r="3.8" fill="${c}"/><circle cx="-2.4" cy="-6" r="2.6" fill="${c}"/><circle cx="2.4" cy="-6.2" r="2.6" fill="${c}"/><circle cx="-1" cy="-9.4" r="1.4" fill="rgba(255,255,255,.2)"/>`; },
    maple2: () => shadow(4) + `<rect x="-.6" y="-5" width="1.2" height="5" fill="#8a5a32"/><circle cx="0" cy="-8" r="3.8" fill="#f4c03a"/><circle cx="-2.4" cy="-6" r="2.6" fill="#f0b02a"/><circle cx="2.4" cy="-6.2" r="2.6" fill="#f8cc4a"/>`,
    hut: () => shadow(5) + `<rect x="-4" y="-4.6" width="8" height="4.6" fill="#e9c08a"/><path d="M-5.4 -4.4 L0 -9 L5.4 -4.4Z" fill="#b87a3a"/><path d="M-5.4 -4.4 L0 -9 L5.4 -4.4" stroke="#8a5a2a" stroke-width=".4" fill="none"/><rect x="-.9" y="-3" width="1.8" height="3" fill="#7a4a2a"/><rect x="-3.2" y="-3.6" width="1.6" height="1.4" fill="#fff0a0" class="shs-win"/>`,
    leafpile: () => `<ellipse cx="0" cy="-.6" rx="2.6" ry="1" fill="#e8763a"/><ellipse cx=".6" cy="-1" rx="1.4" ry=".7" fill="#f4b03a"/>`,
    mountain: () => `<path d="M-14 0 L-3 -16 L2 -10 L6 -14 L16 0Z" fill="#c9845a"/><path d="M-3 -16 L-5.4 -12.4 L-3.4 -13.2 L-1.6 -12 Z M6 -14 L4.4 -11.6 L6.2 -12.2 L7.4 -11.4Z" fill="#fff6ea"/>`,
    // snow
    snowman: () => shadow(2.4) + `<circle cx="0" cy="-2" r="2.2" fill="#fff"/><circle cx="0" cy="-5.2" r="1.5" fill="#fff"/><path d="M-1.4 -4.2 H1.4" stroke="#e85a5a" stroke-width=".7"/><path d="M.2 -5.2 L1.6 -5" stroke="#f08a2a" stroke-width=".35"/><circle cx="-.5" cy="-5.6" r=".18" fill="#333"/><circle cx=".4" cy="-5.7" r=".18" fill="#333"/><rect x="-1.1" y="-7.6" width="2.2" height="1.4" fill="#3a3a4a"/><rect x="-1.6" y="-6.4" width="3.2" height=".4" fill="#3a3a4a"/>`,
    penguin: () => shadow(1.4) + `<ellipse cx="0" cy="-1.8" rx="1.3" ry="1.8" fill="#2a3048"/><ellipse cx="0" cy="-1.5" rx=".8" ry="1.3" fill="#fff"/><circle cx="-.3" cy="-2.8" r=".14" fill="#222"/><circle cx=".3" cy="-2.8" r=".14" fill="#222"/><path d="M-.3 -2.5 L0 -2.2 L.3 -2.5Z" fill="#f0a02a"/>`,
    igloo: () => shadow(5) + `<path d="M-5 0 Q-5 -6 0 -6 Q5 -6 5 0Z" fill="#f4faff"/><path d="M-4.4 -2 H4.4 M-3.4 -4 H3.4 M-1.4 -6 V-4 M1.4 -4 V-2 M-1.6 -2 V0" stroke="#bcd6ec" stroke-width=".3"/><path d="M-1.6 0 V-1.6 Q0 -3.2 1.6 -1.6 V0Z" fill="#4a6a8a"/>`,
    iceberg: () => `<path d="M-8 0 L-4 -7 L0 -5 L3 -10 L8 0Z" fill="#e8f6ff"/><path d="M3 -10 L8 0 L4 0 Z" fill="#c4e2f6"/>`,
    // desert
    cactus: () => shadow(2) + `<rect x="-.9" y="-7" width="1.8" height="7" rx=".9" fill="#5aae6a"/><path d="M-.9 -3.6 H-2.4 Q-2.8 -3.6 -2.8 -4.2 V-5.6" stroke="#5aae6a" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M.9 -4.6 H2.2 Q2.6 -4.6 2.6 -5.2 V-6.2" stroke="#5aae6a" stroke-width="1.2" fill="none" stroke-linecap="round"/><circle cx="0" cy="-7.2" r=".5" fill="#ff7aa8"/>`,
    cactus2: () => shadow(1.6) + `<ellipse cx="0" cy="-1.6" rx="1.4" ry="1.6" fill="#6abd6a"/><circle cx="0" cy="-3.2" r=".45" fill="#ffd24a"/>`,
    rock: () => `<path d="M-2 0 Q-2.2 -1.6 -.6 -2 Q1 -2.4 1.8 -1 Q2.2 0 2 0Z" fill="#c9a07a"/>`,
    skull: () => `<path d="M-2.4 -.2 Q0 -1.4 2.4 -.2" stroke="#f4ead8" stroke-width=".6" fill="none"/>`,
    pyramid: () => `<path d="M-12 0 L0 -12 L12 0Z" fill="#e8b46a"/><path d="M0 -12 L12 0 H4Z" fill="#c99450"/><path d="M-9 -3 H9 M-6 -6 H6 M-3 -9 H3" stroke="#d8a45a" stroke-width=".3"/>`,
    oasis: () => `<ellipse cx="0" cy="-.8" rx="7" ry="2" fill="#5ac0e8"/><ellipse cx="0" cy="-1" rx="5.6" ry="1.3" fill="#8ad8f6"/>` + g(-6, -.6, .8, P.palm()) + g(5.6, -.4, .7, P.palm()),
    camels: () => [0, 6].map(x => `<g transform="translate(${x} 0)"><path d="M-2.4 -2.4 Q-2 -4.4 -.6 -3.4 Q.6 -4.8 1.6 -3 L2.6 -4.4 L3.2 -4 L2.4 -2.4 Z" fill="#b8844a"/><path d="M-2 -2.4 V0 M-.8 -2.4 V0 M.8 -2.4 V0 M2 -2.4 V0" stroke="#b8844a" stroke-width=".4"/></g>`).join(''),
    // toys (indoors)
    blocks: R => { const c = ['#ff6a6a', '#4ab0ff', '#ffd24a', '#6ad08a']; return shadow(3.4) + [[-1.8, 0, 0], [1.8, 0, 1], [0, -3.4, 2]].map(([x, y, k]) => `<rect x="${x - 1.7}" y="${y - 3.4}" width="3.4" height="3.4" rx=".3" fill="${c[(k + (R() * 4 | 0)) % 4]}"/><text x="${x}" y="${y - .9}" font-size="2.4" font-weight="900" text-anchor="middle" fill="#fff">${'ABC'[k]}</text>`).join(''); },
    ball: () => shadow(2) + `<circle cx="0" cy="-2" r="2" fill="#ff6a6a"/><path d="M-2 -2 H2 M0 -4 V0" stroke="#fff" stroke-width=".5"/><circle cx="0" cy="-2" r="2" fill="none" stroke="#ffd24a" stroke-width=".3"/>`,
    books: () => shadow(3) + ['#e85a5a', '#4a8ad8', '#6ac07a', '#f0b03a'].map((c, k) => `<rect x="${-3 + k * 1.5}" y="${-5 + (k % 2)}" width="1.4" height="${5 - (k % 2)}" fill="${c}"/>`).join(''),
    train: () => shadow(4) + `<rect x="-4" y="-3" width="4.6" height="2.4" rx=".3" fill="#4a8ad8"/><rect x="1" y="-4.4" width="3" height="3.8" rx=".3" fill="#e85a5a"/><rect x="1.6" y="-3.8" width="1.8" height="1.2" fill="#fff4a0" class="shs-win"/><rect x="2.6" y="-5.8" width=".8" height="1.4" fill="#3a3a4a"/><circle cx="-3" cy="-.4" r=".7" fill="#333"/><circle cx="-.8" cy="-.4" r=".7" fill="#333"/><circle cx="2.4" cy="-.4" r=".8" fill="#333"/>`,
    duck: () => shadow(1.8) + `<ellipse cx="0" cy="-1.4" rx="2" ry="1.4" fill="#ffd84a"/><circle cx="1.2" cy="-3" r="1.1" fill="#ffd84a"/><path d="M2.2 -3 L3.2 -2.8 L2.2 -2.5Z" fill="#f08a2a"/><circle cx="1.4" cy="-3.2" r=".15" fill="#333"/>`,
    shelf: () => { let s = `<rect x="-9" y="-16" width="18" height="16" fill="#c99662"/><rect x="-8.2" y="-15.2" width="16.4" height="14.4" fill="#a87a4a"/>`; for (let r = 0; r < 3; r++) { s += `<rect x="-8.2" y="${-15.2 + r * 4.8 + 4}" width="16.4" height=".8" fill="#c99662"/>`; for (let k = 0; k < 9; k++) s += `<rect x="${-7.8 + k * 1.75}" y="${-15.2 + r * 4.8 + .6 + (k % 3) * .3}" width="1.5" height="${3.4 - (k % 3) * .3}" fill="${['#e85a5a', '#4a8ad8', '#6ac07a', '#f0b03a', '#b48aff'][(k + r * 2) % 5]}"/>`; } return s; },
    window: () => `<rect x="-7" y="-20" width="14" height="14" rx="1" fill="#8a5a3a"/><rect x="-6" y="-19" width="12" height="12" fill="url(#shs-win-sky)"/><path d="M0 -19 V-7 M-6 -13 H6" stroke="#8a5a3a" stroke-width=".8"/><path d="M-7.6 -20.6 Q-4 -18 -6.4 -6 M7.6 -20.6 Q4 -18 6.4 -6" stroke="#ff9ab8" stroke-width="1.4" fill="none"/>`,
    // space
    crater: () => `<ellipse cx="0" cy="-.4" rx="3" ry="1" fill="#5a4b98"/><ellipse cx="0" cy="-.6" rx="2.4" ry=".6" fill="#4a3c86"/>`,
    crystal: R => { const c = ['#7ae8ff', '#ff8ae8', '#ffe27a'][R() * 3 | 0]; return `<path d="M-1 0 L-1.4 -3 L0 -5 L1.4 -3 L1 0Z" fill="${c}" class="shs-win"/><path d="M0 -5 L1.4 -3 L1 0 L0 0Z" fill="rgba(255,255,255,.35)"/>`; },
    flagp: () => `<path d="M0 0 V-6" stroke="#ddd" stroke-width=".3"/><path d="M0 -6 H3 V-4 H0Z" fill="#ff6a8a" class="shs-flap"/>`,
    alien: () => `<g class="shs-bob"><ellipse cx="0" cy="-3" rx="3.4" ry="1.1" fill="#b8c4d8"/><path d="M-1.6 -3.4 Q0 -6 1.6 -3.4Z" fill="#8ae8ff" opacity=".85"/><circle cx="0" cy="-4.2" r=".7" fill="#7ad07a"/><circle cx="-2" cy="-2.9" r=".3" fill="#ffe27a" class="shs-win"/><circle cx="0" cy="-2.6" r=".3" fill="#ffe27a" class="shs-win"/><circle cx="2" cy="-2.9" r=".3" fill="#ffe27a" class="shs-win"/></g>`,
    planet: R => { const c = ['#ff9a6a', '#8ac8ff', '#c48aff'][R() * 3 | 0]; return `<g transform="translate(0 -14)"><circle r="5" fill="${c}"/><path d="M-4 -2 Q0 -3.4 4 -2 M-4.6 1 Q0 -.2 4.6 1" stroke="rgba(255,255,255,.3)" stroke-width=".8" fill="none"/><ellipse rx="8" ry="1.8" fill="none" stroke="#ffe2a8" stroke-width=".7" transform="rotate(-14)"/></g>`; },
    rocket: () => shadow(3) + `<path d="M0 -14 Q2.6 -10 2.4 -4 H-2.4 Q-2.6 -10 0 -14Z" fill="#f4f4fb"/><path d="M0 -14 Q1.4 -12.6 1.9 -11 H-1.9 Q-1.4 -12.6 0 -14Z" fill="#ff5a6a"/><circle cx="0" cy="-8" r="1" fill="#6ac8ff" stroke="#9aa" stroke-width=".25"/><path d="M-2.4 -6 L-4 -2.6 L-2.4 -4Z M2.4 -6 L4 -2.6 L2.4 -4Z" fill="#ff5a6a"/><path d="M-1.4 -4 L0 -1 L1.4 -4Z" fill="#ffb84a" class="shs-flame"/>`,

    apple: () => shadow(4) + `<rect x="-.7" y="-5" width="1.4" height="5" rx=".5" fill="#9a6a3e"/><circle cx="0" cy="-7.4" r="3.8" fill="#5aae52"/><circle cx="-2.2" cy="-5.6" r="2.6" fill="#4fa84e"/><circle cx="2.2" cy="-5.8" r="2.5" fill="#62b85a"/>` + [[-1.6, -7.6], [1.4, -8.2], [.2, -5.6], [2.4, -6], [-2.4, -5.2]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".6" fill="#ff5a4a"/>`).join(''),
    reed: () => [-1, 0, 1].map(x => `<path d="M${x} 0 Q${x + .4} -2.4 ${x + .2} -4.2" stroke="#4e9e50" stroke-width=".3" fill="none"/><ellipse cx="${x + .22}" cy="-4.4" rx=".35" ry=".9" fill="#8a5a32"/>`).join(''),
    duck2: () => `<ellipse cx="0" cy="-.8" rx="1.4" ry=".8" fill="#fff"/><circle cx="1" cy="-1.8" r=".7" fill="#4aa86a"/><path d="M1.6 -1.8 L2.3 -1.6 L1.6 -1.4Z" fill="#f0a02a"/>`,
    firefly: R => `<circle cx="${r1((R() - .5) * 4)}" cy="${r1(-2 - R() * 4)}" r=".35" fill="#fff6a0" class="shs-tw"/><circle cx="${r1((R() - .5) * 4)}" cy="${r1(-2 - R() * 4)}" r=".3" fill="#fff6a0" class="shs-tw" style="animation-delay:-1.5s"/>`,
    pine3: () => [-3.4, 0, 3.6].map((x, k) => g(x, k === 1 ? 0 : .4, k === 1 ? 1.4 : 1.05, P.pine())).join(''),
    spine3: () => [-3.4, 0, 3.6].map((x, k) => g(x, k === 1 ? 0 : .4, k === 1 ? 1.4 : 1.05, P.spine())).join(''),
    mushhouse: R => { const c = R() < .5 ? '#e8504a' : '#f08a3a'; return shadow(6) + `<path d="M-3.4 0 Q-3.8 -4 -3 -6.4 H3 Q3.8 -4 3.4 0Z" fill="#fff4e0"/><rect x="-1" y="-3" width="2" height="3" rx="1" fill="#a8743e"/><circle cx="-2" cy="-4.4" r=".7" fill="#fff4a0" class="shs-win"/><path d="M-7.4 -6 Q-7.4 -13 0 -13 Q7.4 -13 7.4 -6Z" fill="${c}"/><circle cx="-3.6" cy="-9.6" r="1.1" fill="#fff"/><circle cx="1.6" cy="-11" r=".9" fill="#fff"/><circle cx="4.4" cy="-8.2" r=".8" fill="#fff"/><path d="M2.4 -13 V-15.4" stroke="#8a8a8a" stroke-width=".5"/><circle cx="2.4" cy="-16" r=".5" fill="#ddd" opacity=".6" class="shs-tw"/>`; },
    treehouse: () => shadow(10) + `<path d="M-2.6 0 Q-1.8 -10 -2 -16 H2 Q1.8 -10 2.6 0Z" fill="#8a5a32"/><path d="M-2 0 Q-5 -.4 -6 1 M2 0 Q5 -.4 6 1" stroke="#8a5a32" stroke-width="1.2" fill="none"/><circle cx="0" cy="-24" r="11" fill="#3f9644"/><circle cx="-8" cy="-19" r="7" fill="#4aa04a"/><circle cx="8" cy="-19.4" r="7" fill="#4aa04a"/><circle cx="-3" cy="-30" r="5" fill="#55ad52"/><rect x="-4.6" y="-18" width="9.2" height="6" fill="#d8a46a"/><path d="M-5.6 -18 L0 -22.4 L5.6 -18Z" fill="#c0503a"/><rect x="-1.4" y="-16.6" width="2.8" height="2.4" fill="#fff4a0" class="shs-win"/><path d="M-4 -12 V-2 M-2.6 -12 V-2 M-4 -10 H-2.6 M-4 -8 H-2.6 M-4 -6 H-2.6 M-4 -4 H-2.6" stroke="#c99a5a" stroke-width=".3"/><path d="M4.6 -17 L9 -14.6" stroke="#8a6a4a" stroke-width=".15"/>` + [6, 7.4, 8.8].map((x, k) => `<circle cx="${x}" cy="${-16 + k * .8}" r=".6" fill="${['#ff6a8a', '#ffd24a', '#6ac8ff'][k]}" class="shs-win"/>`).join(''),
    lolli2: () => shadow(4) + `<rect x="-.6" y="-12" width="1.2" height="12" fill="#fff"/><circle cx="0" cy="-15" r="5" fill="#ff6fa8"/><path d="M0 -15 m-3.4 0 a3.4 3.4 0 1 1 3.4 3.4 a2.4 2.4 0 1 1 -2.4 -2.4 a1.4 1.4 0 1 1 1.4 1.4" fill="none" stroke="#fff" stroke-width=".8"/>`,
    cupcake2: () => g(0, 0, 2.2, P.cupcake(() => .1)),
    cakecastle: () => shadow(12) + [[0, 11, 4.6, '#ffe2c4', '#ff9ac4'], [-4.6, 8, 3.6, '#fff0d8', '#b8e6ff'], [-9, 6, 2.8, '#ffe2c4', '#fff2a8']].map(([y0, w, h, c, ic], k) => { const y = -[0, 4.6, 8.2][k]; return `<rect x="${-w}" y="${y - h}" width="${w * 2}" height="${h}" fill="${c}"/><path d="M${-w - .4} ${y - h} Q${-w} ${y - h + 1.8} ${-w / 2} ${y - h + 1} Q0 ${y - h + 2} ${w / 2} ${y - h + 1} Q${w} ${y - h + 1.8} ${w + .4} ${y - h}Z" fill="${ic}"/>`; }).join('') + `<rect x="-.4" y="-14" width=".8" height="3" fill="#fff"/><path d="M0 -14 Q.7 -15.2 0 -16 Q-.7 -15.2 0 -14Z" fill="#ffb84a" class="shs-flame"/><circle cx="-6" cy="-3" r=".8" fill="#ff4a6a"/><circle cx="6" cy="-3" r=".8" fill="#ff4a6a"/><circle cx="-3.2" cy="-7" r=".7" fill="#ff4a6a"/><circle cx="3.2" cy="-7" r=".7" fill="#ff4a6a"/><rect x="-1.4" y="-3" width="2.8" height="3" rx="1.2" fill="#b8784a"/>`,
    rock2: () => `<path d="M-3 0 Q-3.4 -2.4 -1 -3.2 Q1.6 -3.8 2.8 -1.8 Q3.4 0 3 0Z" fill="#a8a4a0"/><path d="M-1 -3.2 Q1.6 -3.8 2.8 -1.8 L1.4 -1.6Z" fill="#c4c0bc"/>`,
    pier: () => `<rect x="-10" y="-2.4" width="20" height="1" fill="#a87a4a"/>` + [-9, -5, -1, 3, 7].map(x => `<rect x="${x}" y="-1.4" width=".6" height="1.6" fill="#8a5a32"/>`).join('') + `<path d="M8 -2.4 V-6" stroke="#4a4a5a" stroke-width=".35"/><circle cx="8" cy="-6.4" r=".7" fill="#ffe27a" class="shs-win"/>`,
    ship: () => `<g class="shs-bob"><path d="M-10 -2 H10 L7 1.4 H-7.4Z" fill="#8a4a2a"/><rect x="-8" y="-3.4" width="15" height="1.4" fill="#c0703a"/><path d="M-3 -3 V-17 M3 -3 V-15" stroke="#6a3a1a" stroke-width=".5"/><path d="M-2.8 -16 Q2 -12.6 -2.8 -6.4Z M3.2 -14.4 Q7.4 -11 3.2 -5.6Z" fill="#fff8ea"/><path d="M-3 -17 L-.4 -16.2 L-3 -15.4Z" fill="#ff5a5a"/>` + [-6, -3, 0, 3, 6].map(x => `<circle cx="${x}" cy="-.6" r=".4" fill="#ffe27a" class="shs-win"/>`).join('') + `</g>`,
    windmill: () => shadow(4) + `<path d="M-2.6 0 L-1.6 -9 H1.6 L2.6 0Z" fill="#fff4e8"/><path d="M-2 -9 L0 -11.6 L2 -9Z" fill="#c88ab0"/><rect x="-.7" y="-3" width="1.4" height="3" rx=".6" fill="#a87a6a"/><g class="shs-spin" style="transform-origin:0px -9.4px">${[0, 90, 180, 270].map(a => `<rect x="-.6" y="-16.4" width="1.2" height="7" fill="#fff" stroke="#c8a0b8" stroke-width=".15" transform="rotate(${a} 0 -9.4)"/>`).join('')}</g><circle cx="0" cy="-9.4" r=".6" fill="#c88ab0"/>`,
    gate: () => shadow(9) + `<rect x="-9" y="-9" width="18" height="9" fill="#fff0f8"/><path d="M-9 -9 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2 h1.5 v-1.2 h1.5 v1.2" fill="#fff0f8"/><path d="M-2.6 0 V-4.4 Q0 -7.4 2.6 -4.4 V0Z" fill="#8a5a7a"/><path d="M-2.6 -1 H2.6 M-2.6 -2.4 H2.6 M-2.6 -3.8 H2.6 M-1.3 0 V-5.8 M1.3 0 V-5.8" stroke="#c8a8c0" stroke-width=".25"/>` + [-9, 9].map(x => `<rect x="${x - 1.8}" y="-12" width="3.6" height="12" fill="#ffe8f4"/><path d="M${x - 2.4} -12 L${x} -16 L${x + 2.4} -12Z" fill="#b48aff"/>`).join(''),
    bigcastle: () => g(0, 0, 1.7, P.castle()) + g(-11, .4, 1, P.castle()) + g(11, .4, 1, P.castle()),
    lantern: R => `<path d="M-4 -7 Q0 -5.6 4 -7" stroke="#6a4a3a" stroke-width=".15" fill="none"/>` + [-3, -1, 1, 3].map((x, k) => `<g class="shs-lan" style="transform-origin:${x}px -6.4px"><path d="M${x} ${-6.6 + Math.abs(x) * .2} v.6" stroke="#6a4a3a" stroke-width=".1"/><ellipse cx="${x}" cy="${-5.4 + Math.abs(x) * .2}" rx=".7" ry=".9" fill="${['#ff5a4a', '#ffb84a', '#ff5a4a', '#ffd24a'][k]}" class="shs-win"/></g>`).join('') + `<path d="M-4 0 V-7.2 M4 0 V-7.2" stroke="#8a6a4a" stroke-width=".3"/>`,
    stage: () => shadow(10) + `<rect x="-10" y="-3" width="20" height="3" fill="#a8743e"/><path d="M-10 -3 V-13 H10 V-3" fill="none" stroke="#c0503a" stroke-width="1"/><path d="M-10 -13 Q-5 -9 -6 -3 M10 -13 Q5 -9 6 -3" stroke="#e85a5a" stroke-width="2" fill="none"/><path d="M-10 -13.4 H10" stroke="#ffd24a" stroke-width=".8"/>` + [-6, -2, 2, 6].map(x => `<circle cx="${x}" cy="-14.4" r=".7" fill="#ffe27a" class="shs-win"/>`).join('') + `<g class="shs-fw" style="transform-origin:0px -22px">${Array.from({ length: 16 }, (_, j) => { const a = j * Math.PI / 8; return `<path d="M${r1(Math.cos(a) * 1.4)} ${r1(-22 + Math.sin(a) * 1.4)} L${r1(Math.cos(a) * 6)} ${r1(-22 + Math.sin(a) * 6)}" stroke="${['#ff7aa8', '#ffe27a', '#7ae8ff'][j % 3]}" stroke-width=".4" stroke-linecap="round"/>`; }).join('')}</g>`,
    rice: () => [-2.4, -1.2, 0, 1.2, 2.4].map(x => `<path d="M${x} 0 Q${x + .3} -1.6 ${x + .9} -2.4" stroke="#d8b04a" stroke-width=".35" fill="none"/>`).join(''),
    kaki: () => g(0, 0, 1, P.maple2()) + [[-1.8, -7], [1.2, -8.4], [2.2, -6], [-.4, -5.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".6" fill="#ff8a2a"/>`).join(''),
    torii: () => shadow(8) + `<rect x="-6" y="-11" width="1.4" height="11" fill="#e04a2a"/><rect x="4.6" y="-11" width="1.4" height="11" fill="#e04a2a"/><path d="M-9 -12.4 Q0 -11.4 9 -12.4 L8.6 -13.8 Q0 -12.8 -8.6 -13.8Z" fill="#2a2a2a"/><rect x="-7.6" y="-11.6" width="15.2" height="1" fill="#e04a2a"/><rect x="-7" y="-9" width="14" height=".8" fill="#e04a2a"/>`,
    onsen: () => `<ellipse cx="0" cy="-1" rx="7" ry="2.2" fill="#9ad8e8"/><ellipse cx="0" cy="-1.2" rx="5.6" ry="1.4" fill="#c4ecf4"/>` + [-3, 0, 3].map((x, k) => `<path class="shs-steam" style="animation-delay:${-k}s" d="M${x} -2 q-.8 -1.4 0 -2.8 q.8 -1.4 0 -2.8" stroke="#fff" stroke-width=".6" fill="none" opacity=".7"/>`).join(''),
    ice: () => `<ellipse cx="0" cy="-1" rx="9" ry="2.6" fill="#cfeefc"/><ellipse cx="0" cy="-1.2" rx="7.6" ry="1.8" fill="#e8f8ff"/><path d="M-4 -1.4 q2 -.6 4 0 M1 -.6 q2 -.5 4 0" stroke="#fff" stroke-width=".3" fill="none"/>` + g(2, -1, .6, P.penguin()),
    observ: () => shadow(7) + `<rect x="-5" y="-6" width="10" height="6" fill="#e8eef8"/><path d="M-5.4 -6 Q-5.4 -12 0 -12 Q5.4 -12 5.4 -6Z" fill="#c8d4e8"/><path d="M-.8 -11.8 L4 -15.6 L4.8 -14.6 L.6 -11Z" fill="#8a96b0"/><rect x="-1" y="-3.4" width="2" height="3.4" rx=".8" fill="#5a6a8a"/><rect x="-4" y="-4.6" width="1.8" height="1.4" fill="#fff4a0" class="shs-win"/>`,
    canyon: () => `<path d="M-9 0 V-9 L-6 -10 L-4 -8.4 L-4 0Z M3 0 V-12 L5 -13 L8 -11 L9 0Z" fill="#d07a4a"/><path d="M-9 -6 H-4 M3 -8 H9 M3 -4 H9" stroke="#b8643a" stroke-width=".5"/>`,
    sphinx: () => shadow(10) + `<path d="M-10 0 V-4 Q-10 -6 -6 -6 H2 V-10 Q2 -13.6 5.2 -13.6 Q8.4 -13.6 8.4 -10 V0Z" fill="#e2b06a"/><path d="M2.4 -10.4 L1.4 -6.4 H9.2 L8 -10.4Z" fill="#4a7ad8"/><path d="M3.4 -10.4 Q5.2 -12.6 7 -10.4" fill="#e8ba76"/><path d="M-10 0 H-4 V-2 H-10Z" fill="#d8a45a"/>` + g(-14, 0, .8, P.pyramid()),
    rails: () => `<path d="M-4 -.4 H4 M-4 .4 H4" stroke="#8a8a9a" stroke-width=".25"/>` + [-3.4, -2, -.6, .8, 2.2, 3.6].map(x => `<rect x="${x - .2}" y="-.7" width=".4" height="1.4" fill="#a87a4a"/>`).join(''),
    blocktower: () => shadow(4) + [0, 1, 2, 3].map(k => `<rect x="${-1.8 + (k % 2) * .4}" y="${-3.6 * (k + 1)}" width="3.6" height="3.6" rx=".3" fill="${['#ff6a6a', '#4ab0ff', '#ffd24a', '#6ad08a'][k]}"/><text x="${.0 + (k % 2) * .4}" y="${-3.6 * k - .9}" font-size="2.4" font-weight="900" text-anchor="middle" fill="#fff">${'TOYS'[k]}</text>`).join(''),
    bookstack: () => shadow(5) + Array.from({ length: 7 }, (_, k) => `<rect x="${-4 + (k % 2) * .6}" y="${-1.4 * (k + 1)}" width="8" height="1.3" rx=".2" fill="${['#e85a5a', '#4a8ad8', '#6ac07a', '#f0b03a', '#b48aff', '#ff8ab8', '#4ac0c0'][k]}"/>`).join(''),
    dollhouse: () => shadow(6) + `<rect x="-6" y="-9" width="12" height="9" fill="#ffd8e4"/><path d="M-7 -9 L0 -14 L7 -9Z" fill="#e85a7a"/><path d="M-6 -4.6 H6 M0 -9 V0" stroke="#e8a8b8" stroke-width=".4"/><rect x="-4.6" y="-8" width="3" height="2.4" fill="#fff4a0" class="shs-win"/><rect x="1.6" y="-8" width="3" height="2.4" fill="#fff4a0" class="shs-win"/><rect x="-4.6" y="-3.6" width="3" height="2.4" fill="#fff4a0" class="shs-win"/><rect x="2" y="-3.6" width="2.2" height="3.6" rx=".8" fill="#a85a6a"/>`,
    toycastle: () => g(0, 0, 1.6, P.blocktower()) + g(-7, .4, 1.1, P.blocktower()) + g(7, .4, 1.1, P.blocktower()) + `<path d="M0 -26 L3 -25 L0 -24Z" fill="#ff6a6a" class="shs-flap"/><path d="M0 -23 V-26" stroke="#8a8a8a" stroke-width=".3"/>`,
    asteroid: R => `<g class="shs-bob"><path d="M-3 -6 Q-3.6 -9 -.6 -9.6 Q2.6 -10 3 -7 Q3.4 -4.4 .4 -4 Q-2.4 -3.6 -3 -6Z" fill="#8a7a9a"/><circle cx="-.8" cy="-7.6" r=".6" fill="#6a5a7a"/><circle cx="1.4" cy="-6" r=".4" fill="#6a5a7a"/></g>`,
    station: () => `<g transform="translate(0 -14)"><g class="shs-spin" style="transform-origin:0px 0px"><ellipse rx="9" ry="2.6" fill="none" stroke="#d8dcf0" stroke-width="1.2"/>${[0, 90, 180, 270].map(a => `<rect x="-.3" y="-2.6" width=".6" height="5.2" fill="#b8bcd8" transform="rotate(${a})"/>`).join('')}</g><circle r="2.4" fill="#e8ecff"/><circle r="1" fill="#7ac8ff" class="shs-win"/></g>`,
    starpalace: () => shadow(10) + g(0, 0, 1.2, P.castle()) + `<path d="M0 -30 L1.6 -26 L6 -26 L2.4 -23.4 L3.8 -19 L0 -21.6 L-3.8 -19 L-2.4 -23.4 L-6 -26 L-1.6 -26Z" fill="#ffe27a" class="shs-win"/><circle cx="0" cy="-24" r="8" fill="#ffe27a" opacity=".15" class="shs-tw"/>`,
    sign: n => `<rect x="-.3" y="-6" width=".6" height="6" fill="#8a5a32"/><rect x="-3" y="-7.6" width="6" height="3" rx=".6" fill="#e8c890" stroke="#8a5a32" stroke-width=".35"/><text x="0" y="-5.4" font-size="2.2" font-weight="900" text-anchor="middle" fill="#6a3a1a">${n}</text>`,
    goalflag: () => `<rect x="-.25" y="-9" width=".5" height="9" fill="#dddde8"/><g class="shs-flap"><rect x=".25" y="-9" width="5" height="3.2" fill="#fff"/>${[0, 1, 2, 3, 4].map(c => [0, 1].map(r => (c + r) % 2 ? `<rect x="${.25 + c}" y="${-9 + r * 1.6}" width="1" height="1.6" fill="#2a2a3a"/>` : '').join('')).join('')}</g><circle cx="0" cy="-9.3" r=".5" fill="#ffd24a"/>`,
  };

  /* ---------- the panorama ---------- */
  const cache = {};
  function build(id, NA, uid) {
    const t = T[id], R = rng([...id].reduce((a, c) => a * 33 + c.charCodeAt(0), 5)), WT = NA * W, ph = i => t.ph[Math.min(i, t.ph.length - 1)];
    const sk = SKY[t.sky || 'day'], skd = t.sky === 'pastel' ? SKY.pdusk : t.sky === 'space' ? SKY.space : SKY.dusk, skn = t.sky === 'pastel' ? SKY.pnight : t.sky === 'space' ? SKY.space : SKY.night;
    const skyAt = (p, k) => p <= .5 ? mix(sk[k], skd[k], p * 2) : mix(skd[k], skn[k], (p - .5) * 2);
    const stops = (k, f) => Array.from({ length: NA }, (_, i) => `<stop offset="${((i + .5) / NA).toFixed(3)}" stop-color="${f(ph(i), k)}"/>`).join('');
    const nightA = p => Math.max(0, (p - .45) / .55);
    const U = 'shs' + uid;
    let defs = `<linearGradient id="${U}t" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${stops(0, skyAt)}</linearGradient>` +
      `<linearGradient id="${U}h" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${stops(1, skyAt)}</linearGradient>` +
      `<linearGradient id="${U}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient><mask id="${U}m"><rect x="0" y="0" width="${WT}" height="34" fill="url(#${U}v)"/></mask>` +
      `<linearGradient id="${U}n" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${Array.from({ length: NA }, (_, i) => { const p = ph(i), a = t.sky === 'space' ? 0 : nightA(p) * .42 + (p > .2 && p < .7 ? .08 : 0); return `<stop offset="${((i + .5) / NA).toFixed(3)}" stop-color="${p > .55 ? '#0c1040' : '#ff7a3a'}" stop-opacity="${a.toFixed(2)}"/>`; }).join('')}</linearGradient>` +
      `<linearGradient id="shs-beam" x1="0" x2="1"><stop offset="0" stop-color="#fff6b0" stop-opacity=".7"/><stop offset="1" stop-color="#fff6b0" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="shs-win-sky" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2a3a8a"/><stop offset="1" stop-color="#7a6ac8"/></linearGradient>`;
    const horizon = t.indoor ? 30 : t.sea ? 25 : 27, C = CH[id] || [];
    const chg = (i, k) => (C[Math.min(i, C.length - 1)] || {}).g ? C[Math.min(i, C.length - 1)].g[k] : [t.gr, t.far][k];
    const gstops = f => Array.from({ length: NA }, (_, i) => `<stop offset="${(i / NA + .08).toFixed(3)}" stop-color="${f(i)}"/><stop offset="${((i + 1) / NA - .08).toFixed(3)}" stop-color="${f(i)}"/>`).join('');
    defs += `<linearGradient id="${U}g" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${gstops(i => chg(i, 0))}</linearGradient>` +
      `<linearGradient id="${U}f" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${gstops(i => chg(i, 1))}</linearGradient>` +
      `<linearGradient id="${U}d" gradientUnits="userSpaceOnUse" x1="0" x2="${WT}" y1="0" y2="0">${gstops(i => mix(chg(i, 0), chg(i, 1), .5))}</linearGradient>`;
    const GR = `url(#${U}g)`, FAR = `url(#${U}f)`, MID = `url(#${U}d)`;
    let back = '', mid = '', props = [], glow = '';
    // the sky, or the wall of the playroom
    if (t.indoor) {
      back += `<rect x="0" y="0" width="${WT}" height="${horizon + 2}" fill="url(#${U}h)"/><rect x="0" y="0" width="${WT}" height="${horizon + 2}" fill="url(#${U}t)" opacity=".35"/>`;
      for (let x = 0; x < WT; x += 4) back += `<rect x="${x}" y="0" width="1.6" height="${horizon}" fill="rgba(255,255,255,.16)"/>`;
      for (let k = 0; k < NA * 18; k++) { const x = R() * WT, y = 2 + R() * (horizon - 8); back += `<path d="M${r1(x)} ${r1(y)} l.5 1 l1 .1 l-.8 .7 l.3 1 l-1 -.6 l-1 .6 l.3 -1 l-.8 -.7 l1 -.1Z" fill="rgba(255,255,255,.55)"/>`; }
      back += `<rect x="0" y="${horizon - 6}" width="${WT}" height="4.6" fill="#f2d2a0"/><rect x="0" y="${horizon - 6}" width="${WT}" height=".5" fill="#c99662"/>`;
      back += `<rect x="0" y="${horizon - 1.4}" width="${WT}" height="1.6" fill="#c99662"/>`;
    } else {
      back += `<rect x="0" y="0" width="${WT}" height="${H}" fill="url(#${U}t)"/><rect x="0" y="0" width="${WT}" height="34" fill="url(#${U}h)" mask="url(#${U}m)"/>`;
      // stars where it is night
      for (let k = 0; k < NA * 26; k++) { const x = R() * WT, y = R() * (horizon - 4), i = Math.min(NA - 1, Math.floor(x / W)), a = t.sky === 'space' ? 1 : nightA(ph(i)); if (a < .05) continue;
        back += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${(.15 + R() * .35).toFixed(2)}" fill="#fff" opacity="${(a * (.4 + R() * .6)).toFixed(2)}" class="shs-tw" style="animation-delay:${(-R() * 4).toFixed(1)}s"/>`; }
      if (t.aurora) for (let i = 0; i < NA; i++) { const a = nightA(ph(i)); if (a < .2) continue; const x0 = i * W - 10, x1 = x0 + W + 20;
        back += `<path class="shs-aur" d="M${x0} 14 C${x0 + 30} 4 ${x0 + 60} 18 ${x0 + 90} 8 S${x1} 12 ${x1} 6 V20 C${x0 + 90} 22 ${x0 + 40} 14 ${x0} 22Z" fill="#6affc8" opacity="${(a * .35).toFixed(2)}"/>`; }
      // the sun / the moon, one an area
      for (let i = 0; i < NA; i++) { const p = ph(i), cx = i * W + 30 + R() * 56;
        if (t.sky === 'space') { if (i % 2 === 0) back += `<circle cx="${r1(cx)}" cy="10" r="3.6" fill="#f4eecb"/><circle cx="${r1(cx + 1.2)}" cy="9.2" r=".7" fill="#ddd6b0"/><circle cx="${r1(cx - 1.2)}" cy="11" r=".5" fill="#ddd6b0"/>`; continue; }
        if (t.indoor) continue;
        if (p < .62) { const y = 8 + p * 22, c = mix('#fff2a0', '#ff9a5a', Math.min(1, p * 1.8)); back += `<circle cx="${r1(cx)}" cy="${r1(y)}" r="6.4" fill="${c}" opacity=".25"/><circle cx="${r1(cx)}" cy="${r1(y)}" r="3.8" fill="${c}"/>`; }
        else back += `<circle cx="${r1(cx)}" cy="8" r="5.4" fill="#fff6c8" opacity=".14"/><circle cx="${r1(cx)}" cy="8" r="3" fill="#fff6c8"/><circle cx="${r1(cx + 1.3)}" cy="7.2" r="2.6" fill="${skyAt(p, 0)}"/>`; }
      if (t.rainbow) for (let i = 0; i < NA; i += 2) { const cx = i * W + 70; ['#ff8a8a', '#ffc46a', '#fff07a', '#8ae08a', '#7ac8ff', '#b89aff'].forEach((c, k) => { back += `<path d="M${cx - 34 + k * 1.2} ${horizon} A${34 - k * 1.2} ${26 - k * 1.2} 0 0 1 ${cx + 34 - k * 1.2} ${horizon}" stroke="${c}" stroke-width="1.2" fill="none" opacity=".55"/>`; }); }
      if (t.planets) for (let i = 0; i < NA; i++) { const cx = i * W + 20 + R() * 76, c = ['#ff9a6a', '#8ac8ff', '#c48aff', '#ffd27a'][i % 4], r = 2.4 + R() * 3;
        back += `<circle cx="${r1(cx)}" cy="${r1(6 + R() * 12)}" r="${r1(r)}" fill="${c}" opacity=".9"/>`; }
      if (t.fireworks) for (let i = 0; i < NA; i++) { const a = nightA(ph(i)); if (a < .3) continue; for (let k = 0; k < 3; k++) { const cx = i * W + 14 + R() * 88, cy = 6 + R() * 12, c = ['#ff7aa8', '#ffe27a', '#7ae8ff', '#b89aff'][R() * 4 | 0];
        back += `<g class="shs-fw" style="animation-delay:${(-R() * 3).toFixed(1)}s;transform-origin:${r1(cx)}px ${r1(cy)}px">` + Array.from({ length: 12 }, (_, j) => { const an = j * Math.PI / 6; return `<path d="M${r1(cx + Math.cos(an) * 1.2)} ${r1(cy + Math.sin(an) * 1.2)} L${r1(cx + Math.cos(an) * 4)} ${r1(cy + Math.sin(an) * 4)}" stroke="${c}" stroke-width=".35" stroke-linecap="round"/>`; }).join('') + `</g>`; } }
      // clouds
      if (t.sky !== 'space') for (let k = 0; k < NA * 3; k++) { const x = R() * WT, y = 3 + R() * 12, s = .7 + R() * .8, i = Math.min(NA - 1, Math.floor(x / W)), p = ph(i), c = p > .6 ? '#5a5a9a' : p > .25 ? '#ffd8c8' : '#ffffff';
        back += `<g class="shs-cl" style="animation-delay:${(-R() * 20).toFixed(1)}s"><g transform="translate(${r1(x)} ${r1(y)}) scale(${s.toFixed(2)})" opacity="${p > .6 ? .5 : .9}"><ellipse cx="0" cy="0" rx="5" ry="1.8" fill="${c}"/><circle cx="-1.6" cy="-1" r="2" fill="${c}"/><circle cx="1.4" cy="-1.4" r="2.4" fill="${c}"/></g></g>`; }
    }
    // hills (or the sea), then the ground
    if (t.indoor) { mid += `<rect x="0" y="${horizon}" width="${WT}" height="${H - horizon}" fill="${GR}"/>`; for (let y = horizon + 3; y < H; y += 4.4) mid += `<path d="M0 ${y} H${WT}" stroke="${t.gr2}" stroke-width=".35"/>`; for (let x = 0; x < WT; x += 13) mid += `<path d="M${x} ${horizon} L${x - 6} ${H}" stroke="${t.gr2}" stroke-width=".25" opacity=".6"/>`; for (let i = 0; i < NA; i++) mid += `<ellipse cx="${i * W + 58}" cy="50" rx="34" ry="9" fill="#ff9ab8" opacity=".35"/><ellipse cx="${i * W + 58}" cy="50" rx="28" ry="7" fill="none" stroke="#fff" stroke-width=".4" opacity=".5"/>`; }
    else if (t.sea) {
      mid += `<rect x="0" y="${horizon - 4}" width="${WT}" height="12" fill="${FAR}"/><rect x="0" y="${horizon - 4}" width="${WT}" height="2" fill="#ffffff" opacity=".35"/>`;
      for (let x = 0; x < WT; x += 7) mid += `<path class="shs-wv" d="M${x} ${horizon - 1 + (x % 3)} q1.2 -.7 2.4 0" stroke="#e8faff" stroke-width=".3" fill="none"/>`;
      mid += `<path d="${hill(0, WT, horizon + 6, 1.6, 11, 8)}" fill="${GR}"/><path d="${hill(0, WT, horizon + 6.4, 1.6, 11, 8)}" fill="none" stroke="#ffffff" stroke-width=".6" opacity=".8" class="shs-wv"/>`;
    } else {
      mid += `<path d="${hill(0, WT, horizon - 3, 4, 3, 7)}" fill="${FAR}"/><path d="${hill(0, WT, horizon + 1.5, 3, 7, 6)}" fill="${MID}"/><path d="${hill(0, WT, horizon + 5, 2, 13, 6)}" fill="${GR}"/>`;
    }
    for (let k = 0; k < NA * 40; k++) { const x = R() * WT, y = horizon + 8 + R() * (H - horizon - 8); mid += t.indoor ? '' : `<path d="M${r1(x)} ${r1(y)} q.3 -.8 .6 0 q.3 -.6 .6 0" stroke="${t.gr2}" stroke-width=".25" fill="none"/>`; }
    // the road through every star of every area (one road for the whole course)
    const ALL = []; for (let i = 0; i < NA; i++) pts(id, i).forEach(([x, y]) => ALL.push([i * W + OX + x, y]));
 const road = smooth(ALL);
    const roadY = x => { for (let k = 0; k < ALL.length - 1; k++) if (ALL[k][0] <= x && ALL[k + 1][0] >= x) return ALL[k][1] + (ALL[k + 1][1] - ALL[k][1]) * (x - ALL[k][0]) / (ALL[k + 1][0] - ALL[k][0]); return 44; };
    const RIV = [];   // a river crossing an area (chapter r): from the hills down to the front, the road over it on a bridge
    for (let i = 0; i < NA; i++) { const ch = C[i]; if (!ch || !ch.r) continue; const rx = i * W + 8 + 4 + 10.2 * 4.5, Q = [];
      for (let y = horizon + 3; y <= H + 2; y += 4) Q.push([rx + 6 * Math.sin(y * .22 + i) + (y - horizon) * .25, y]);
      const w = y => 1.2 + (y - horizon) * .16, Lf = Q.map(([x, y]) => [x - w(y), y]), Rt = Q.map(([x, y]) => [x + w(y), y]).reverse();
      mid += `<path d="${smooth(Lf)}L${smooth(Rt).slice(1)}Z" fill="${ch.r}"/><path d="${smooth(Q)}" stroke="#ffffff" stroke-width=".35" stroke-dasharray="1.6 2.4" fill="none" opacity=".6" class="shs-wv"/>`;
      const bx = rx + 6 * Math.sin(roadY(rx) * .22 + i) + (roadY(rx) - horizon) * .25, by = roadY(bx); RIV.push(bx);
      mid += `<rect x="${r1(bx - 4.6)}" y="${r1(by - 2.6)}" width="9.2" height="5.2" rx="1" fill="#b98a5a"/>`;
      RIV.push({ bx, by }); }
    mid += `<path d="${road}" fill="none" stroke="${t.edge}" stroke-width="3.6" stroke-linecap="round" opacity=".55"/><path d="${road}" fill="none" stroke="${t.road}" stroke-width="2.8" stroke-linecap="round"/><path d="${road}" fill="none" stroke="${t.edge}" stroke-width=".25" stroke-dasharray="1.2 1.6" opacity=".7"/>`;
    RIV.forEach(b => { if (typeof b !== 'object') return; for (const dy of [-2.8, 2.8]) mid += `<path d="M${r1(b.bx - 4.4)} ${r1(b.by + dy)} H${r1(b.bx + 4.4)}" stroke="#8a5a32" stroke-width=".5"/>` + [-4, -2, 0, 2, 4].map(dx => `<path d="M${r1(b.bx + dx)} ${r1(b.by + dy)} v-1.2" stroke="#8a5a32" stroke-width=".4"/>`).join(''); });
    // the things by the road: the area's landmarks at the back, small things scattered (never on the road or in a river), front ones larger
    const near = (x, y, d) => ALL.some(([a, b]) => Math.hypot(a - x, (b - y) * 1.4) < d) || RIV.some(b => typeof b === 'number' && Math.abs(b - x) < 5 + (y - horizon) * .2);
    for (let i = 0; i < NA; i++) {
      const ch = C[i] || {}, BIG = ch.b || t.big, PR = ch.p || t.props;
      [0, 1].forEach(j => { const big = BIG[j % BIG.length]; let bx = i * W + (j ? 62 : 8) + R() * 46, tries = 0; while (near(bx, horizon + 7, 14) && tries++ < 14) bx = i * W + 8 + R() * 100;
        props.push({ y: horizon + 6 + j * .1, s: g(bx, horizon + 6.5, j ? 1 : ch.goal ? 1.6 : 1.25, P[big](R)) }); });
      for (let k = 0; k < 40; k++) { const x = i * W + R() * W, y = horizon + 7 + R() * (H - horizon - 5); if (near(x, y, 6)) continue; const s = .5 + (y - horizon) / (H - horizon) * .75;
        props.push({ y, s: g(x, y, s, P[PR[R() * PR.length | 0]](R)) }); }
      // a signpost at the start of every area (its number) · at the end of the course the goal flag and its landmark
      const p0 = ALL[i * 10]; if (i > 0) props.push({ y: p0[1] - 3, s: g(p0[0] - 5, p0[1] - 3, .9, P.sign(i + 1)) });
      if (i === NA - 1 && ch.goal) { const pe = ALL[ALL.length - 1]; props.push({ y: pe[1] - 2, s: g(pe[0] + 3, pe[1] - 2, 1, P.goalflag()) }); }
    }
    if (t.bunting) for (let i = 0; i < NA; i++) { const x0 = i * W + 10, x1 = x0 + 96, y = horizon + 2; let s = `<path d="M${x0} ${y} Q${(x0 + x1) / 2} ${y + 6} ${x1} ${y}" stroke="#8a6a4a" stroke-width=".2" fill="none"/>`;
      for (let k = 1; k < 16; k++) { const tt = k / 16, x = x0 + (x1 - x0) * tt, yy = y + 6 * 4 * tt * (1 - tt) * .5 * 2; s += `<path d="M${r1(x - .7)} ${r1(yy)} L${r1(x + .7)} ${r1(yy)} L${r1(x)} ${r1(yy + 1.4)}Z" fill="${['#ff6a8a', '#ffd24a', '#6ac8ff', '#8ae07a'][k % 4]}"/>`; } props.push({ y: horizon + 1, s }); }
    if (t.leaves) for (let k = 0; k < NA * 10; k++) { const x = R() * WT, y = 4 + R() * 30; props.push({ y: 99, s: `<g class="shs-leaf" style="animation-delay:${(-R() * 8).toFixed(1)}s;animation-duration:${(7 + R() * 5).toFixed(1)}s"><path d="M${r1(x)} ${r1(y)} q.6 -.6 1.2 0 q-.6 .6 -1.2 0Z" fill="${['#e8603a', '#f4b03a', '#d84a3a'][R() * 3 | 0]}"/></g>` }); }
    props.sort((a, b) => a.y - b.y);
    const over = `<rect x="0" y="0" width="${WT}" height="${H}" fill="url(#${U}n)" pointer-events="none"/>`;
    return { defs, back, mid, props: props.map(p => p.s).join(''), over };
  }
  function svg(id, NA, uid) {
    if (!T[id]) return '';
    const k = id + ':' + NA + ':' + uid; if (cache[k]) return cache[k];
    const B = build(id, NA, uid);
    // (the night overlay sits over the ground and the things; the lit windows and lamps above it glow at night)
    return (cache[k] = `<defs>${B.defs}</defs><g class="shs">${B.back}${B.mid}${B.props}${B.over}</g>`);
  }
  // one area alone (a thumbnail): the same panorama seen through a window on area i
  const slice = (id, i, NA, uid) => `<svg viewBox="${i * W} 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="width:100%;height:100%;display:block">${svg(id, NA, uid)}</svg>`;
  window.ShanghaiScenes = { pts, svg, slice, has: id => !!T[id], tint: id => TINT[id] || '#1b2140', W, H,
    css: `
.shs .shs-tw{animation:shstw 3.4s ease-in-out infinite}
.shs .shs-cl{animation:shscl 26s ease-in-out infinite alternate}
.shs .shs-bob{animation:shsbob 3s ease-in-out infinite}
.shs .shs-wv{animation:shswv 4s ease-in-out infinite}
.shs .shs-spin{animation:shsspin 30s linear infinite}
.shs .shs-flap{animation:shsflap 1.6s ease-in-out infinite;transform-box:fill-box;transform-origin:left center}
.shs .shs-flame{animation:shsflame .5s ease-in-out infinite alternate;transform-box:fill-box;transform-origin:center bottom}
.shs .shs-aur{animation:shsaur 7s ease-in-out infinite alternate}
.shs .shs-fw{animation:shsfw 2.8s ease-out infinite}
.shs .shs-leaf{animation:shsleaf 9s linear infinite}
.shs .shs-steam{animation:shssteam 3s ease-in-out infinite}
.shs .shs-lan{animation:shslan 2.6s ease-in-out infinite}
.shs .shs-beam{animation:shsbeam 4s ease-in-out infinite;transform-box:fill-box;transform-origin:left center}
@keyframes shstw{0%,100%{opacity:.25}50%{opacity:1}}
@keyframes shscl{to{transform:translateX(6px)}}
@keyframes shsbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.6px)}}
@keyframes shswv{0%,100%{transform:translateX(0)}50%{transform:translateX(1px)}}
@keyframes shsspin{to{transform:rotate(360deg)}}
@keyframes shsflap{0%,100%{transform:skewY(0)}50%{transform:skewY(12deg)}}
@keyframes shsflame{to{transform:scaleY(1.3)}}
@keyframes shsaur{0%{transform:translateX(0) skewX(0)}100%{transform:translateX(6px) skewX(6deg)}}
@keyframes shsfw{0%{transform:scale(.2);opacity:0}20%{opacity:1}70%{transform:scale(1);opacity:.9}100%{transform:scale(1.15);opacity:0}}
@keyframes shsleaf{0%{transform:translate(0,0) rotate(0)}100%{transform:translate(-10px,30px) rotate(360deg);opacity:0}}
@keyframes shssteam{0%{transform:translateY(0);opacity:0}40%{opacity:.8}100%{transform:translateY(-3px);opacity:0}}
@keyframes shslan{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(6deg)}}
@keyframes shsbeam{0%,100%{opacity:.4}50%{opacity:1}}
` };
})();
