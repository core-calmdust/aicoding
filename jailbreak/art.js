/* だつごくスライダー！ — art: inmate characters (original comic-style human convicts), guard, UI icons, floor skins, mini boards */
(function () {
'use strict';
/* ---------------- inmates ----------------
   Pop-punk street-comic convicts built from parts: thick ink lines, flat clashing colours, lots of pattern
   (dots / stripes / checker / stitched patches), big expressive eyes, fangs and chunky accessories.
   Colour specs: '#hex' or a pattern 'dot|str|chk/#a/#b/size/rotation'.
   kind: hair style · c: skin · c2: hair colour · sex: 'm' | 'f' · rar: 0 N, 1 R, 2 SR, 3 SSR */
const INK = '#1d1a17';
const SKIN = ['#ffdcc0', '#f2b98e', '#d89566', '#a8693f', '#6b3f26', '#f7c9a6'];
const CAST = [
  // name, sex, skin, hair, hair colour, brows, eyes, iris(/iris2), mouth, extras, suit deco
  // N
  ['Rookie', 'm', 0, 'buzz', '#6b3f22', 'up', 'round', '#2f8fff', 'fang', 'beanie=str/#e2402f/#fff7e0/6/0 bandaid', 'pin'],
  ['Jinx', 'f', 1, 'pony', '#ffd23f', 'thin', 'sleepy', '#16c47a', 'fang', 'clip=dot/#ff4fa0/#fff starSt', 'dot'],
  ['Brick', 'm', 4, 'bald', '#1e1a18', 'angry', 'mean', '#ffcd3c', 'grit', 'beard boltTat hoop1', 'patch'],
  ['Pixel', 'f', 0, 'bob', '#5a3a22', 'worry', 'spiral', '#2f8fff', 'o', 'glasses sweat clip=chk/#ffcd3c/#1d1a17', 'chk'],
  ['Stubbs', 'm', 2, 'buzz', '#2a1e16', 'flat', 'sleepy', '#9a5a2a', 'smug', 'bucket=dot/#2f62d6/#fff stubble toothpick', 'str'],
  ['Bubbles', 'f', 5, 'buns', 'str/#ff6fae/#ffc2dd/5/90', 'thin', 'wink', '#b04fe0', 'bubble', 'blush hearts', 'heart'],
  ['Groove', 'm', 3, 'afro', '#2a1e16', 'up', 'round', '#ff8a3d', 'grin', 'band=str/#ffcd3c/#e2402f/6/0 pick', 'star'],
  ['Vivi', 'f', 2, 'wavy', '#d8461e', 'thin', 'round', '#16a463', 'lips', 'scarf=dot/#1d1a17/#ff4fa0 hoops mole', 'pin'],
  // R
  ['Spike', 'm', 5, 'mohawk', 'str/#3fdf4a/#fff200/6/0', 'angry', 'mean', '#e2402f', 'tongue', 'pinEar studs', 'patch'],
  ['Roxy', 'f', 4, 'bandana', '#1e1a18', 'thin', 'round', '#ffb21f', 'grin', 'hoops bandaidN', 'dot'],
  ['Duke', 'm', 2, 'pomp', '#1e1a18', 'up', 'sleepy', '#2f8fff', 'smug', 'burns toothpick', 'str'],
  ['Venom', 'f', 0, 'undercut', 'chk/#8b4fd1/#e2c6ff/6/45', 'thin', 'mean', '#9be83f', 'lips:#5a1d7b', 'nosering studs', 'chk'],
  ['Sparky', 'm', 1, 'spiky', '#ff7a1a', 'up', 'round', '#2fb5ff', 'tongue', 'goggles soot', 'bolt'],
  ['Queenie', 'f', 3, 'braids', '#1e1a18', 'thin', 'sleepy', '#ff8a3d', 'lips:#e0344d', 'hoops', 'heart'],
  ['Ledger', 'm', 5, 'slick', '#8a8f99', 'worry', 'dot', '#333', 'frown', 'glasses mustache sweat', 'pin'],
  ['Kite', 'f', 2, 'topbun', '#4a2a18', 'thin', 'mean', '#e2402f', 'lips:#b0304a', 'spoon scarEye', 'patch'],
  // SR
  ['Captain', 'm', 1, 'buzz', '#b9b4ad', 'angry', 'round', '#2fb5ff', 'gold', 'cap eyepatch stubble', 'patch'],
  ['Silver', 'f', 0, 'bangs', '#eef0f6', 'thin', 'sleepy', '#ff4fa0/#2fb5ff', 'fang', 'hood', 'none'],
  ['Rasta', 'm', 4, 'dreads', '#3b2416', 'up', 'round', '#ffcd3c', 'shout', 'phones=#ffcd3c/#e2402f stubble', 'str'],
  ['Wrench', 'f', 0, 'pixie', '#e2452b', 'thin', 'round', '#16a463', 'tongue', 'goggles freckles starTat', 'chk'],
  ['Tank', 'm', 2, 'bald', '#1e1a18', 'angry', 'mean', '#9be83f', 'grit', 'flameTat nosering stubble', 'chain'],
  ['Raven', 'f', 5, 'hime', '#16141c', 'thin', 'sleepy', '#b14fff', 'lips:#2a1430', 'heartSt choker', 'dot'],
  // SSR
  ['Legend', 'm', 1, 'wild', '#4a2c1a', 'angry', 'shades', '#ff4fa0', 'grin', 'tails scarN stubble', 'flame'],
  ['Nova', 'f', 0, 'twin', 'str/#21d8c8/#ff4fd8/7/0', 'thin', 'star', '#ff4fd8/#21d8c8', 'cat', 'cyber phones=#fff/#21d8c8', 'bolt'],
];
const RARS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3];
const INMATES = CAST.map(([name, sex, sk, hair, hc, brow, eyes, iris, mouth, acc, suit], id) => ({ id, kind: hair, c: SKIN[sk], c2: hc, rar: RARS[id], sex, name, brow, eyes, iris: iris.split('/'), mouth, acc: acc.split(' '), suit }));
const dk = (h, f = .76) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
const base = s => s.includes('/') ? s.split('/')[1] : s;
const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, f, w = 3) => `<path d="${d}" fill="${f}" ${S(w)}/>`;
const PF = (d, f, o = '') => `<path d="${d}" fill="${f}"${o}/>`;
const L = (d, c = INK, w = 3, o = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
const C = (x, y, r, f, w = 0) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"${w ? ' ' + S(w) : ''}/>`;
const MIR = s => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
const SYM = s => s + MIR(s);
const star = (x, y, r, f, w = 1.4) => P(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; return (i ? 'L' : 'M') + (x + Math.cos(a) * q).toFixed(1) + ' ' + (y + Math.sin(a) * q).toFixed(1); }).join('') + 'Z', f, w);
const N = v => +v.toFixed(2);
const pts = (cmd, ...a) => cmd + a.map(N).join(' ');
const heart = (x, y, s, f, w = 1.3) => P(pts('M', x, y + s * .9) + pts('C', x - s * 1.4, y, x - s * .8, y - s, x, y - s * .3) + pts('C', x + s * .8, y - s, x + s * 1.4, y, x, y + s * .9) + 'Z', f, w);
const bolt = (x, y, s, f, w = 1.3) => P(pts('M', x + s * .2, y - s) + pts('L', x - s * .6, y + s * .15) + pts('L', x, y + s * .15) + pts('L', x - s * .2, y + s) + pts('L', x + s * .6, y - s * .15) + pts('L', x, y - s * .15) + 'Z', f, w);
const flame = (x, y, s, f, f2) => P(pts('M', x, y) + pts('C', x - s, y, x - s * 1.1, y - s, x - s * .5, y - s * 1.6) + pts('C', x - s * .4, y - s, x - s * .1, y - s, x, y - s * 2.2) + pts('C', x + s * .3, y - s * 1.2, x + s * .7, y - s * 1.4, x + s * .6, y - s * 1.9) + pts('C', x + s * 1.3, y - s * 1.1, x + s, y, x, y) + 'Z', f, 1.6)
  + (f2 ? PF(pts('M', x, y - .5) + pts('C', x - s * .5, y - .5, x - s * .5, y - s * .7, x, y - s * 1.2) + pts('C', x + s * .5, y - s * .7, x + s * .5, y - .5, x, y - .5) + 'Z', f2) : '');
const stitch = (d, w = 1.3) => L(d, INK, w, ' stroke-dasharray="1.6 2.2"');
let UID = 0;
const HEAD = { m: 'M28 44Q28 20 50 20Q72 20 72 44V58Q72 75 59 81H41Q28 75 28 58Z', f: 'M30 44Q30 20 50 20Q70 20 70 44Q70 64 61 74Q50 83 39 74Q30 64 30 44Z' };
/* hair: [back layer, front layer] — fills may be patterns */
function hair(k, hc, F) {
  const h = F(hc), d = dk(base(hc)), sh = (x1, y1, x2, y2) => L(`M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 3} ${x2} ${y2}`, '#fff', 2.4, ' opacity=".6"');
  switch (k) {
    case 'buzz': return ['', P('M28 43Q27 18 50 17Q73 18 72 43Q69 30 61 29Q50 26 39 29Q31 30 28 43Z', h) + L('M35 25l2 2M43 22l2 2M53 22l2 2M62 24l2 2', d, 1.6)];
    case 'bald': return ['', L('M36 28Q42 23 49 23', '#fff', 3.4, ' opacity=".7"')];
    case 'afro': {
      let b = '';
      for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; b += C((50 + Math.cos(a) * 30).toFixed(1), (32 + Math.sin(a) * 23).toFixed(1), 13, h, 3.4); }
      return [b + `<ellipse cx="50" cy="32" rx="31" ry="24" fill="${h}"/>` + L('M30 22q4-4 8-2M60 14q4-3 8 0M68 30q4-2 6 2', '#fff', 2, ' opacity=".35"'), P('M28 46Q29 26 50 26Q71 26 72 46Q66 33 50 33Q34 33 28 46Z', h)];
    }
    case 'mohawk': return ['', PF('M29 41Q29 23 50 22Q71 23 71 41Q61 31 50 31Q39 31 29 41Z', 'rgba(0,0,0,.14)') + P('M42 32L33 0L45 10L50 -6L55 10L67 0L58 32Z', h, 3.2)];
    case 'pomp': return ['', P('M27 47Q20 26 33 17Q48 3 68 7Q85 11 81 23Q78 29 71 28Q73 37 72 47Q68 34 58 32Q46 30 38 34Q31 38 27 47Z', h, 3.2) + sh(37, 14, 66, 10) + L('M44 21q12-7 26-4', '#fff', 1.6, ' opacity=".4"')];
    case 'spiky': return ['', P('M27 47L20 30L31 31L24 13L37 21L38 4L48 17L55 0L59 17L70 4L68 21L81 15L72 30L81 35L72 47Q66 32 50 31Q34 32 27 47Z', h, 3.2) + sh(40, 22, 56, 19)];
    case 'slick': return ['', P('M27 44Q26 16 50 15Q74 16 73 44Q71 29 62 26Q50 22 38 26Q29 30 27 44Z', h) + L('M35 21Q50 14 67 21M32 29Q48 20 69 27', '#fff', 1.6, ' opacity=".7"')];
    case 'dreads': {
      let b = '';
      [[24, 30, 18, 88], [30, 26, 28, 92], [70, 26, 72, 92], [76, 30, 82, 88], [36, 22, 36, 86], [64, 22, 64, 86]].forEach(([x1, y1, x2, y2]) => { b += L(`M${x1} ${y1}Q${x1 - 5} ${(y1 + y2) / 2} ${x2} ${y2}`, INK, 11) + L(`M${x1} ${y1}Q${x1 - 5} ${(y1 + y2) / 2} ${x2} ${y2}`, h, 5.6) + C(x2, y2 - 6, 3, '#ffcd3c', 1.4); });
      return [b, P('M28 44Q27 17 50 16Q73 17 72 44Q68 29 50 28Q32 29 28 44Z', h)];
    }
    case 'wild': return [P('M24 44Q12 12 44 8Q76 2 88 26Q100 42 92 68Q87 58 81 56Q90 74 81 90Q76 74 71 66L29 66Q24 76 18 90Q10 68 20 56Q12 52 24 44Z', h, 3.4) + L('M22 70l-4 6M84 70l4 6', INK, 2.4), P('M28 45Q26 21 44 17Q61 13 71 21Q75 30 72 45Q66 30 54 30Q40 30 28 45Z', h) + P('M43 25Q36 37 42 46Q45 34 52 28Z', h, 2.6) + sh(40, 21, 62, 18)];
    case 'pony': return [P('M62 22Q90 16 92 42Q93 66 78 84Q82 60 73 44Q69 32 62 30Z', h, 3.2), P('M30 47Q27 17 50 16Q73 17 70 47Q68 30 56 27Q48 36 36 36Q31 40 30 47Z', h) + sh(36, 24, 54, 20)];
    case 'bob': return [P('M25 46Q22 12 50 12Q78 12 75 46L77 76Q70 80 64 74L36 74Q30 80 23 76Z', h), P('M28 41Q27 16 50 16Q73 16 72 41Q62 34 50 36Q38 34 28 41Z', h) + SYM(P('M28 38L25 75Q30 78 35 73L33 42Z', h, 2.8)) + sh(36, 24, 58, 20)];
    case 'buns': return [C(29, 19, 12, h, 3.2) + C(71, 19, 12, h, 3.2), P('M29 45Q28 18 50 17Q72 18 71 45Q66 28 50 26Q34 28 29 45Z', h) + L('M50 17v9', d, 2)];
    case 'wavy': return [P('M25 42Q20 12 50 11Q80 12 75 42Q83 56 77 70Q87 82 79 96L21 96Q13 82 23 70Q17 56 25 42Z', h, 3.2), P('M29 47Q26 16 50 15Q74 16 71 47Q66 30 57 26Q52 38 38 38Q32 40 29 47Z', h) + SYM(P('M30 40Q23 52 29 62Q24 71 29 80L35 75Q31 67 35 60Q30 50 33 43Z', h, 2.6)) + sh(56, 21, 66, 25)];
    case 'bandana': return [P('M26 54Q23 30 29 26L71 26Q77 30 74 54Z', h), P('M26 41Q24 10 50 10Q76 10 74 41Q50 33 26 41Z', F('dot/#e2402f/#fff/5/0'), 3) + P('M72 35L89 27L87 41Z', '#e2402f', 2.4) + P('M72 37L85 50L76 52Z', '#e2402f', 2.4) + C(73, 36, 4.2, '#b8322f', 2.4)];
    case 'undercut': return ['', PF('M29 44Q29 26 40 22L40 31Q33 35 30 44Z', 'rgba(0,0,0,.18)') + P('M34 30Q45 10 65 13Q81 20 76 44Q78 60 70 70Q70 49 64 39Q56 30 44 34Q38 33 34 30Z', h, 3.2) + L('M33 34l3-2M33 38l3-2', d, 1.4)];
    case 'braids': {
      let b = '';
      [23, 30, 70, 77].forEach((x, j) => { for (let y = 34, n = 0; y < 96; y += 7, n++) b += `<ellipse cx="${x + (x < 50 ? -(y - 34) / 12 : (y - 34) / 12)}" cy="${y}" rx="4" ry="4.4" fill="${h}" ${S(1.8)}/>`; b += C(x + (x < 50 ? -5 : 5), 96, 3.4, ['#ffcd3c', '#e2402f', '#2fb5ff', '#16c47a'][j], 1.6); });
      return [b, P('M29 45Q28 18 50 17Q72 18 71 45Q66 28 50 26Q34 28 29 45Z', h) + L('M50 17v9M38 21v6M62 21v6', '#7a6a5e', 1.6)];
    }
    case 'topbun': return [C(50, 10, 11, h, 3.2), P('M29 45Q28 18 50 17Q72 18 71 45Q64 30 50 29Q36 30 29 45Z', h) + `<rect x="42" y="16" width="16" height="6" rx="2" fill="#e2402f" ${S(2.2)}/>` + C(46, 19, 1.2, '#fff') + C(54, 19, 1.2, '#fff')];
    case 'pixie': return ['', P('M28 48Q22 21 40 15Q58 9 71 19Q79 30 73 48L68 37L62 42L60 32L52 40L48 30L42 40L37 33L32 42Z', h, 3.2) + sh(42, 18, 60, 15)];
    case 'hime': return [P('M25 42Q21 12 50 12Q79 12 75 42L77 96L23 96Z', h), P('M28 41Q27 16 50 16Q73 16 72 41Z', h) + SYM(P('M28 38L27 80L36 80L34 42Z', h, 2.8)) + sh(38, 23, 56, 20)];
    case 'bangs': return ['', P('M30 44Q29 22 50 22Q71 22 70 44L66 36L62 42L58 34L52 41L48 34L42 41L38 35L34 42Z', h)];
    case 'twin': return [SYM(P('M30 24Q8 22 6 48Q4 72 16 92Q16 72 22 58Q26 44 33 36Z', h, 3.2) + C(28, 24, 4.6, '#ffcd3c', 2)), P('M29 47Q27 17 50 16Q73 17 71 47Q68 33 60 30L56 38L50 30L44 38L40 30Q32 33 29 47Z', h)];
  }
  return ['', ''];
}
function brows(t, f) {
  if (f) {
    const b = t === 'worry' ? 'M34 42Q40 37 46 40' : 'M33 42Q39 36 46 39';
    return SYM(L(b, INK, 3));
  }
  const D = { angry: 'M30 39L46 44L45 47.5L29.5 43Z', up: 'M31 41Q38 34 46 38L45 41Q38 38 32 44Z', flat: 'M31 40H46V44H31Z', worry: 'M31 43L46 38L46.5 41.5L32 46Z' };
  return SYM(P(D[t], INK, 1.4));
}
/* left eye at (40,52); mirrored for the right one (iris2 = mismatched colour) */
function eye(t, ir, f, sk) {
  const lash = f ? L('M32.5 50.5l-3.8-2.6M33.8 47.6l-2.6-3.6M37 45.5l-1-4', INK, 2.2) : '';
  const iris = (cx, cy, r) => C(cx, cy, r, ir, 1.4) + `<circle cx="${cx}" cy="${cy}" r="${(r * .62).toFixed(1)}" fill="none" stroke="${dk(ir, .6)}" stroke-width="1.1"/>` + C(cx, cy, r * .34, INK) + C(cx - r * .38, cy - r * .4, r * .26, '#fff');
  switch (t) {
    case 'round': return `<ellipse cx="40" cy="52.5" rx="${f ? 7 : 6.4}" ry="${f ? 7.6 : 6.8}" fill="#fff" ${S(2)}/>` + iris(41, 53, f ? 4.8 : 4.3) + L(f ? 'M32.4 51Q40 42.6 47.6 50.4' : 'M33.2 50.5Q40 44.4 46.8 50', INK, 3.4) + lash;
    case 'sleepy': return P('M32.5 51.5Q40 50.5 47.5 51.5Q46.5 59.5 40 59.8Q33.5 59.5 32.5 51.5Z', '#fff', 2) + iris(40.8, 54.6, 4.4) + PF('M31 51.6Q40 50 49 51.6V45H31Z', sk) + L('M31.6 51.8Q40 49.4 48.4 51.6', INK, 3.6) + (f ? L('M32 52l-4 1.2M33 53.4l-3.6 2.4', INK, 2) : '') + L('M34 47q6-2 12 0', INK, 1.2, ' opacity=".45"');
    case 'spiral': return `<ellipse cx="40" cy="52.5" rx="7.4" ry="7.8" fill="#fff" ${S(2)}/>` + C(40.5, 53, 5.4, ir, 1.4) + `<circle cx="40.5" cy="53" r="3.9" fill="none" stroke="#fff" stroke-width="1.1"/><circle cx="40.5" cy="53" r="2.6" fill="none" stroke="${INK}" stroke-width="1.1"/>` + C(40.5, 53, 1.2, INK) + L('M32.4 51Q40 42.4 47.6 50.4', INK, 3.2) + lash;
    case 'mean': return P('M32.5 50L47.5 53.5Q46 59 40 59Q34 58 32.5 50Z', '#fff', 2) + C(41, 55, 3.7, ir, 1.2) + C(41, 55, 1.4, INK) + C(39.8, 53.8, .9, '#fff') + L('M31 49L48.5 53.5', INK, 3.8) + (f ? L('M31.6 49.2l-3.6-2M33.2 49.6l-2.4-3.2', INK, 2) : '');
    case 'wink': return L('M32.6 54Q40 46 47.4 54', INK, 3.6) + (f ? L('M33.6 51.2l-3.6-2.4M35.6 48.8l-2.2-3.4M39 47.4l-.6-3.8', INK, 2) : '');
    case 'dot': return `<ellipse cx="40" cy="53" rx="5.4" ry="5" fill="#fff" ${S(2)}/>` + C(40.5, 53.5, 1.8, INK) + L('M34 50.4Q40 46.4 46 50', INK, 2.6);
    case 'star': return `<ellipse cx="40" cy="52.5" rx="7.2" ry="7.8" fill="#fff" ${S(2)}/>` + C(40.8, 53, 5, ir, 1.4) + star(40.8, 53, 3.6, '#fff', .9) + L('M32.4 51Q40 42.4 47.6 50.4', INK, 3.4) + lash;
  }
  return '';
}
function mouth(t, f) {
  const [k, c] = t.split(':');
  switch (k) {
    case 'fang': return L('M42 66Q50 70.5 58 64.5', INK, 3) + P('M45.2 67.3L46.8 71L48.4 67.9Z', '#fff', 1.4) + (f ? PF('M45 69q5 2.4 10 0', '#ff7aa2', ' opacity=".55"') : '');
    case 'tongue': return P('M40 63.5Q50 66 60 63.5Q58 74 50 74Q42 74 40 63.5Z', '#5a1d1d', 2.8) + PF('M41.5 64.4Q50 66.6 58.5 64.4L58 66.6Q50 68.6 42 66.6Z', '#fff') + P('M46 70Q45.5 80 51.5 80Q57 79.5 55.5 70Z', '#ff6f8f', 2.4) + L('M50.8 72v4.6', '#c8384a', 1.4);
    case 'grin': case 'gold': return P('M38.5 63Q50 66 61.5 63Q59 75 50 75Q41 75 38.5 63Z', '#fff', 2.8) + L('M39.5 68.6Q50 70.4 60.5 68.6M44.6 64.6v9M50 65v9.6M55.4 64.6v9', INK, 1.3) + (k === 'gold' ? PF('M50.6 65.2h4.2v3.2h-4.2z', '#ffcd3c') : PF('M41 64.4l2 3.4 1.6-3z', '#fff') + PF('M59 64.4l-2 3.4-1.6-3z', '#fff'));
    case 'grit': return `<rect x="39" y="62.5" width="22" height="9" rx="3" fill="#fff" ${S(2.8)}/>` + L('M39 67h22M44.5 62.5v9M50 62.5v9M55.5 62.5v9', INK, 1.3);
    case 'shout': return P('M40 62Q50 59 60 62Q59 78 50 78Q41 78 40 62Z', '#5a1d1d', 2.8) + PF('M41.6 63Q50 61 58.4 63L58 65.6H42Z', '#fff') + PF('M44.6 74.6Q50 70 55.4 74.6Q50 77.6 44.6 74.6Z', '#ff6f8f');
    case 'smug': return L('M42 67Q49 68.6 58 63.6', INK, 3.2) + L('M41 65.6l1.4 1.6', INK, 2);
    case 'frown': return L('M42 69.5Q46 65 50 67.6Q54 65 58 69.5', INK, 3);
    case 'o': return `<ellipse cx="50" cy="67.5" rx="3.6" ry="4.4" fill="#5a1d1d" ${S(2.4)}/>`;
    case 'lips': { const lc = c || '#e0344d'; return P('M41.5 66Q46 61.6 50 64Q54 61.6 58.5 66Q55 72.4 50 72.6Q45 72.4 41.5 66Z', lc, 2.4) + L('M42.6 66.2Q50 67.4 57.4 66', INK, 1.4) + L('M45 69.4q2 1 4 1', '#fff', 1.4, ' opacity=".7"'); }
    case 'bubble': return C(55, 68.5, 8.4, '#ff8fc0', 2.6) + L('M51.6 65q2.4-2.4 4.6-1.6', '#fff', 2) + L('M43 67q2 1 4 .4', INK, 2.4);
    case 'cat': return L('M42.5 65.4Q46 69.6 50 65.6Q54 69.6 57.5 65.4', INK, 2.8) + P('M52.6 66.8L53.8 70L55 67.2Z', '#fff', 1.2);
  }
  return '';
}
/* accessories under the hair ('u') or on top of everything */
const UNDER = ['beard', 'stubble', 'freckles', 'blush', 'mole', 'scarEye', 'scarN', 'soot', 'starTat', 'boltTat', 'flameTat', 'burns', 'cyber', 'starSt', 'heartSt'];
function acc(a, I, u, F) {
  const [k, arg] = a.split('='), hc = base(I.c2), args = (arg || '').split('/').length > 2 ? [arg] : (arg || '').split('/');
  switch (k) {
    // under hair
    case 'beard': return P('M28 52Q29 72 40 82Q50 90 60 82Q71 72 72 52Q66 63 58 62Q50 59 42 62Q34 63 28 52Z', hc, 2.8) + L('M36 72l2 3M46 78l1 3M56 77l-1 3M64 70l-2 3', '#5a4a40', 1.4);
    case 'stubble': return PF('M30 60Q33 77 44 81H56Q67 77 70 60Q62 72 50 72Q38 72 30 60Z', INK, ' opacity=".16"') + [[37, 74], [43, 77], [57, 77], [63, 74], [35, 69], [65, 69], [50, 78]].map(([x, y]) => C(x, y, .9, INK)).join('');
    case 'freckles': return [[34, 60], [37, 62], [40, 60], [60, 60], [63, 62], [66, 60]].map(([x, y]) => C(x, y, 1.1, '#c0602d')).join('');
    case 'blush': return SYM(`<ellipse cx="35" cy="61" rx="4.6" ry="2.6" fill="#ff7aa2" opacity=".6"/>` + L('M33 62l1.6-2.4M36 62l1.6-2.4', '#e0446a', 1.2));
    case 'mole': return C(61, 66, 1.5, INK);
    case 'scarEye': return L('M37 38L44 62', '#c0392b', 2.6) + L('M37 44l4.4-1M39 50l4.4-1M41 56l4.4-1', '#c0392b', 1.4);
    case 'scarN': return L('M37 56L63 61', '#c0392b', 2.6) + L('M43 55l-1 4M50 56.4l-1 4M57 57.8l-1 4', '#c0392b', 1.4);
    case 'soot': return PF('M32 61q5-4 9 1q-4 4-9-1zM60 29q6-2 8 3q-5 2-8-3z', INK, ' opacity=".35"');
    case 'starTat': return star(64, 62, 3.6, '#2f8fff', 1.2);
    case 'starSt': return star(64, 62.5, 3.8, '#ffcd3c', 1.4);
    case 'heartSt': return heart(64, 62.5, 2.8, '#e2402f', 1.2);
    case 'boltTat': return bolt(62, 30, 6, '#ffcd3c', 1.8);
    case 'flameTat': return flame(38, 34, 4.2, '#ff7a1a', '#ffcd3c') + flame(62, 34, 4.2, '#ff7a1a', '#ffcd3c') + flame(50, 30, 5, '#e2402f', '#ffcd3c');
    case 'burns': return SYM(PF('M28 42h6v14l-6 3z', hc));
    case 'cyber': return `<g clip-path="url(#hc${u})">${PF('M51 10Q57 50 51 90H100V10Z', '#b9c6d6')}${PF('M64 10Q72 50 64 90H100V10Z', '#93a6bb')}${L('M51 10Q57 50 51 90', INK, 2.8)}${[[56, 38], [58, 66], [63, 74]].map(([x, y]) => C(x, y, 1.6, '#5d6575')).join('')}${L('M56 72h10M60 72v8', '#5d6575', 1.6)}</g>`;
    // over
    case 'bandaid': return `<g transform="rotate(-25 63 63)"><rect x="56" y="60" width="15" height="6.5" rx="2.5" fill="#ffd6a8" ${S(1.8)}/><rect x="61.5" y="60.6" width="4" height="5.3" fill="#e9b07e"/></g>`;
    case 'bandaidN': return `<g transform="rotate(-12 50 59)">${P('M40 56h20v6H40z', '#ffd6a8', 1.8)}${L('M44 59h-.1M56 59h-.1', '#c98d63', 1.6)}</g>`;
    case 'glasses': return SYM(`<circle cx="40" cy="52.5" r="9" fill="rgba(255,255,255,.22)" ${S(3)}/>` + L('M35 48.5l3.4-2', '#fff', 1.6)) + L('M49 52h2', INK, 3);
    case 'sweat': return P('M77 30Q83 40 77 44Q71 40 77 30Z', '#9fe0ff', 2.2) + L('M76 37v2.4', '#fff', 1.4);
    case 'hoops': return SYM(`<circle cx="27" cy="64" r="5.4" fill="none" stroke="${INK}" stroke-width="4.6"/><circle cx="27" cy="64" r="5.4" fill="none" stroke="#ffcd3c" stroke-width="2.2"/>`);
    case 'hoop1': return `<circle cx="27" cy="63" r="4.4" fill="none" stroke="${INK}" stroke-width="4.2"/><circle cx="27" cy="63" r="4.4" fill="none" stroke="#ffcd3c" stroke-width="2"/>`;
    case 'studs': return SYM(C(27, 58, 2.4, '#ffcd3c', 1.4) + C(26, 52, 1.8, '#d9dde6', 1.2));
    case 'pinEar': return `<g transform="rotate(20 74 60)"><rect x="70" y="56" width="10" height="4" rx="2" fill="#d9dde6" ${S(1.4)}/>${C(80, 58, 1.8, '#d9dde6', 1.2)}</g>`;
    case 'nosering': return L('M51.8 61a3 3 0 1 0 3.6 2.6', INK, 3) + L('M51.8 61a3 3 0 1 0 3.6 2.6', '#d9dde6', 1.6);
    case 'toothpick': return L('M57 66L73 59', INK, 4.2) + L('M57 66L73 59', '#f0d28a', 2);
    case 'mustache': return P('M38 64Q43 57 50 61Q57 57 62 64Q58 66.4 50 63.8Q42 66.4 38 64Z', hc, 2.2);
    case 'goggles': return L('M26 31Q50 23 74 31', INK, 6) + L('M26 31Q50 23 74 31', '#e2402f', 3) + SYM(C(39, 28, 8, '#ffcd3c', 2.8) + C(39, 28, 5, '#7fe0ff', 1.6) + L('M36.4 26.4l2.2-2.2', '#fff', 1.8));
    case 'eyepatch': return L('M29 33L37 46M47 49L73 54', INK, 2.8) + `<path d="M32 47Q40 42 48 47Q47 60 40 60Q33 60 32 47Z" fill="${INK}"/>` + C(40, 52.5, 2.4, '#e2402f') + L('M35 48q4-2.4 8-1', '#5d6575', 1.6);
    case 'shades': return SYM(P('M29 47H48Q48.5 58 40 58.6Q30.5 58.6 29 47Z', '#1d1a17', 2.6) + L('M32 50l5-2.4M33 54l3-1.4', '#ff4fa0', 1.8)) + L('M48 48.4h4', INK, 3) + L('M27 47h3M70 47h3', INK, 2.6);
    case 'band': return P('M27 34Q50 26 73 34L73 41Q50 33 27 41Z', F(arg), 2.6);
    case 'pick': return `<g transform="rotate(16 74 20)">${P('M70 8h10v7H70z', '#e2402f', 2)}${L('M72 15v7M75 15v7M78 15v7', INK, 1.6)}${heart(75, 11, 2, '#fff', .8)}</g>`;
    case 'tails': return P('M27 34Q50 26 73 34L73 41Q50 33 27 41Z', F('dot/#e2402f/#fff/5/0'), 2.6) + P('M72 35Q86 31 98 20L97 31Q87 39 73 39Z', '#e2402f', 2.4) + P('M72 38Q85 41 94 48L86 52Q80 46 72 41Z', '#b8322f', 2.4);
    case 'clip': return `<g transform="rotate(-20 36 30)"><rect x="29" y="27" width="14" height="6" rx="2" fill="${F(arg)}" ${S(2)}/></g>`;
    case 'hearts': return heart(22, 14, 3.2, '#ff4fa0') + heart(80, 12, 2.6, '#ff4fa0');
    case 'spoon': return `<g transform="rotate(28 58 8)">${L('M58 -6V20', INK, 4.4)}${L('M58 -6V20', '#d9dde6', 2.2)}<ellipse cx="58" cy="-6" rx="4" ry="5.4" fill="#d9dde6" ${S(2)}/></g>`;
    case 'scarf': return P('M26 34Q24 10 50 9Q76 10 74 34Q50 28 26 34Z', F(arg), 2.8) + P('M27 32Q16 44 14 56L22 58Q24 46 30 37Z', F(arg), 2.4) + C(27, 34, 3.6, '#ff4fa0', 2);
    case 'beanie': return P('M25 40Q23 7 50 7Q77 7 75 40Z', F(arg), 3) + P('M23 32Q50 26 77 32V42Q50 36 23 42Z', '#e2402f', 2.8) + L('M30 32.4v8M36 31v8M42 30v8M48 29.6v8M54 29.6v8M60 30v8M66 31v8M72 32.4v8', INK, 1.1, ' opacity=".5"') + C(50, 5, 6.2, '#fff7e0', 2.6) + L('M47 3q2-1.6 4 0', '#e2402f', 1.4);
    case 'bucket': return P('M30 34Q30 8 50 8Q70 8 70 34Z', F(arg), 3) + P('M17 40Q50 26 83 40L80 46Q50 34 20 46Z', F(arg), 3) + L('M30 33Q50 27 70 33', INK, 2.4) + `<rect x="57" y="14" width="10" height="8" rx="1" fill="#ffcd3c" ${S(1.6)}/>` + stitch('M58.6 15.6h6.8M58.6 20.4h6.8', 1);
    case 'cap': return P('M21 37Q16 11 46 7L52 35Z', F('str/#e2402f/#2a2622/6/90'), 3) + P('M46 7Q84 8 80 35L52 35Z', F('dot/#2f4d9a/#fff/6/0'), 3) + stitch('M47 9L51.4 34', 1.6)
      + P('M18 39Q50 30 82 37L80 44Q50 37 20 46Z', '#ffcd3c', 2.8) + `<rect x="27" y="17" width="16" height="10" rx="1.4" fill="#fff" ${S(1.8)} transform="rotate(-8 35 22)"/><text x="35" y="25" font-size="7" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif" transform="rotate(-8 35 22)">${String(I.id + 1).padStart(3, '0')}</text>`
      + C(70, 22, 6.4, '#ff8a3d', 2.4) + L('M67.6 19.6l4.8 4.8M72.4 19.6l-4.8 4.8', INK, 1.8);
    case 'phones': { const [c1, c2] = args; return L('M23 46Q20 10 50 9Q80 10 77 46', INK, 7.6) + L('M23 46Q20 10 50 9Q80 10 77 46', c1, 3.6) + SYM(`<rect x="15" y="40" width="14" height="22" rx="6" fill="${c2}" ${S(3)}/>` + `<rect x="18.6" y="44" width="6.8" height="14" rx="3" fill="${c1}" ${S(1.6)}/>`) + bolt(22, 51, 4.4, '#fff', 1.2); }
    case 'hood': return '';
  }
  return '';
}
/* jumpsuit decoration (patterns, stitched patches, little kustom motifs) */
function deco(t, F, W) {
  const patch = (x, y, w, h, f, r = -8) => `<g transform="rotate(${r} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="${f}" ${S(2)}/>${stitch(`M${x + 1.8} ${y + 1.8}h${w - 3.6}v${h - 3.6}h${-(w - 3.6)}z`, 1)}</g>`;
  switch (t) {
    case 'dot': return patch(22, 86, 13, 11, F('dot/#2f62d6/#fff/4.4/0'));
    case 'chk': return PF(`M50 92L63 77Q${98 - W} 80 ${100 - W} 101H50Z`, F('chk/#1d1a17/#fff7e0/5/0'), ' opacity=".9"') + L(`M50 92L63 77Q${98 - W} 80 ${100 - W} 101`, INK, 2.6);
    case 'str': return PF(`M${W} 101Q${W + 2} 80 37 77L50 92V101Z`, F('str/#f26b1d/#ffb03d/5/90'));
    case 'patch': return patch(21, 85, 14, 12, '#5ec26a', 10) + L('M25 88l6 6M31 88l-6 6', INK, 1.8);
    case 'pin': return `<g transform="rotate(-30 42 84)">${L('M34 84h14', INK, 3.6)}${L('M34 84h14', '#d9dde6', 1.8)}${C(33, 84, 2.6, '#d9dde6', 1.6)}<path d="M48 82v4" stroke="${INK}" stroke-width="2.6"/></g>`;
    case 'heart': return heart(28, 91, 4.6, '#ff4fa0', 2);
    case 'star': return star(28, 91, 6, '#ffcd3c', 2);
    case 'bolt': return bolt(28, 91, 6.4, '#ffe600', 2);
    case 'flame': return flame(28, 99, 4.4, '#e2402f', '#ffcd3c') + flame(36, 99, 3.4, '#ff7a1a', '#ffe600');
    case 'chain': return L('M38 80Q50 92 62 80', INK, 4) + L('M38 80Q50 92 62 80', '#d9dde6', 2, ' stroke-dasharray="2.4 1.6"') + C(50, 90, 4.6, '#2a2622', 2) + L('M48 88.4l1.6-1', '#fff', 1.2);
  }
  return '';
}
function inmateSVG(id, opt = {}) {
  const I = INMATES[id] || INMATES[0], f = I.sex === 'f', sk = I.c, sd = dk(sk, .82), u = ++UID, A = I.acc, has = k => A.some(a => a.split('=')[0] === k);
  const defs = []; let pn = 0;
  const F = s => {
    if (!s || !s.includes('/')) return s;
    const [k, a, b, z = 6, r = 0] = s.split('/'), id = `p${u}_${pn++}`, h = z / 2;
    const inner = k === 'dot' ? `<rect width="${z}" height="${z}" fill="${a}"/><circle cx="${h}" cy="${h}" r="${z * .24}" fill="${b}"/>` : k === 'str' ? `<rect width="${z}" height="${z}" fill="${a}"/><rect width="${h}" height="${z}" fill="${b}"/>` : `<rect width="${z}" height="${z}" fill="${a}"/><rect width="${h}" height="${h}" fill="${b}"/><rect x="${h}" y="${h}" width="${h}" height="${h}" fill="${b}"/>`;
    defs.push(`<pattern id="${id}" width="${z}" height="${z}" patternUnits="userSpaceOnUse" patternTransform="rotate(${r})">${inner}</pattern>`);
    return `url(#${id})`;
  };
  let [hb, hf] = hair(I.kind, I.c2, F);
  const head = HEAD[I.sex];
  const ear = SYM(P('M31 47Q21 44 22 53Q23 62 32 59Z', sk, 2.8) + L('M27.6 50q-2 2.4 0 5', INK, 1.4));
  const shade = `<g clip-path="url(#hc${u})">${PF('M62 10Q77 40 67 72Q61 82 47 90H100V10Z', sd)}${PF('M20 64Q50 80 80 64V100H20Z', sd, ' opacity=".45"')}</g>`;
  const ir = I.iris, eyes = I.eyes === 'shades' ? '' : (has('eyepatch') ? '' : eye(I.eyes, ir[0], f, sk)) + (has('cyber') ? MIR(eye('round', '#ff3b3b', f, sk)) : MIR(eye(I.eyes === 'wink' ? 'round' : I.eyes, ir[1] || ir[0], f, sk)));
  const nose = f ? L('M49.6 58.6q2.2 1.6 0 2.8', INK, 2.2) : L('M51 55L48.6 61.4H53', INK, 2.4);
  const feat = brows(I.brow, f) + eyes + nose + mouth(I.mouth, f);
  const under = A.filter(a => UNDER.includes(a.split('=')[0])).map(a => acc(a, I, u, F)).join('');
  const over = A.filter(a => !UNDER.includes(a.split('=')[0])).map(a => acc(a, I, u, F)).join('') + (I.eyes === 'shades' ? acc('shades', I, u, F) : '');
  // cat-ear hood with a fur trim (prison-orange, patched) — replaces the back hair
  if (has('hood')) {
    const fur = Array.from({ length: 17 }, (_, i) => { const a = (160 + i / 16 * 220) * Math.PI / 180; return C((50 + Math.cos(a) * 27).toFixed(1), (48 + Math.sin(a) * 31).toFixed(1), 6.2, '#fff', 2.6); }).join('');
    hb = P('M14 66Q10 14 50 12Q90 14 86 66Q80 92 50 94Q20 92 14 66Z', '#f26b1d', 3.2) + SYM(P('M20 30L18 2L40 16Z', '#f26b1d', 3) + P('M23 24L22 9L33 17Z', '#ff9ec4', 2)) + `<g transform="rotate(14 76 18)"><rect x="70" y="12" width="12" height="10" fill="${F('dot/#ffcd3c/#e2402f/4/0')}" ${S(1.8)}/></g>` + stitch('M71 13l10 0', 1);
    hf = hf + fur + `<rect x="18" y="56" width="10" height="9" rx="1" fill="${F('str/#2f62d6/#fff/4/45')}" ${S(1.8)} transform="rotate(-10 23 60)"/>`;
  }
  // jumpsuit collar + number tag
  const W = f ? 13 : 7;
  const suit = opt.noSuit ? '' : P('M42 68V86H58V68Z', sk, 2.8) + PF('M50 70H58V86H50Z', sd) +
    P(`M${W} 101Q${W + 2} 80 37 77L50 92L63 77Q${98 - W} 80 ${100 - W} 101Z`, '#f26b1d', 3.2) + deco(I.suit, F, W) +
    P('M37 77L44 95L50 92Z', '#ff9a3c', 2.6) + P('M63 77L56 95L50 92Z', '#ff9a3c', 2.6) +
    (has('choker') ? `<rect x="41" y="73" width="18" height="5" rx="2" fill="${INK}"/>` + [44, 50, 56].map(x => P(`M${x - 1.6} 78l1.6 3.4 1.6-3.4z`, '#d9dde6', 1)).join('') : '') +
    `<rect x="60" y="86" width="20" height="9" rx="2" fill="#fff" ${S(2.2)}/><text x="70" y="93.4" font-size="7.4" font-weight="900" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif">${String(id + 1).padStart(3, '0')}</text>`;
  let bg = '';
  if (opt.bg) {
    bg = `<rect width="100" height="100" fill="${opt.bg}"/>`;
    const ray = (c, n = 16) => `<path d="${Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, b = a + Math.PI / n; return `M50 46L${(50 + Math.cos(a) * 90).toFixed(0)} ${(46 + Math.sin(a) * 90).toFixed(0)}L${(50 + Math.cos(b) * 90).toFixed(0)} ${(46 + Math.sin(b) * 90).toFixed(0)}Z`; }).join('')}" fill="${c}"/>`;
    bg += I.rar === 0 ? `<rect width="100" height="100" fill="${F('dot/rgba(0,0,0,0)/rgba(0,0,0,.08)/7/45')}"/>`
      : I.rar === 1 ? `<rect width="100" height="100" fill="${F('str/rgba(0,0,0,0)/rgba(255,255,255,.35)/10/45')}"/>`
      : I.rar === 2 ? ray('rgba(255,255,255,.45)') + `<rect width="100" height="100" fill="${F('dot/rgba(0,0,0,0)/rgba(255,79,160,.22)/8/0')}"/>` + star(12, 14, 6, '#ffcd3c', 1.6) + star(88, 70, 5, '#ff4fa0', 1.6)
      : ray('rgba(255,205,60,.6)', 20) + flame(10, 100, 7, '#ff7a1a', '#ffcd3c') + flame(90, 100, 7, '#ff7a1a', '#ffcd3c') + star(12, 14, 7, '#ffcd3c', 1.8) + star(88, 16, 5, '#ff4fa0', 1.6) + heart(86, 76, 4, '#e2402f', 1.6) + bolt(13, 70, 6, '#7fe0ff', 1.6);
  }
  const body = `${bg}${hb}${suit}${ear}${P(head, sk, 3.2)}${shade}${under}${feat}${hf}${over}`;   // F() above must run before defs are joined
  return `<svg viewBox="0 0 100 100" class="inm" aria-hidden="true"><defs><clipPath id="hc${u}"><path d="${head}"/></clipPath>${defs.join('')}</defs>${body}</svg>`;
}
/* guard (patrol mode): pop-punk prison guard — oversized peaked cap with a checker band + star badge, mirrored shades, big moustache, navy uniform, baton */
const GUARD = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="gdchk" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fff"/><rect width="3" height="3" fill="${INK}"/><rect x="3" y="3" width="3" height="3" fill="${INK}"/></pattern></defs>`
  + P('M5 101Q7 78 36 75L50 88L64 75Q93 78 95 101Z', '#2a4a8a', 3.2) + PF('M70 78Q91 82 94 101H77Z', '#1b3166') + P('M39 75L50 90L61 75Z', '#bfe3ff', 2.6) + P('M46.6 82h6.8l-1 14h-4.8z', '#e2402f', 2.2)
  + star(25, 88, 7, '#ffcd3c', 2.2)
  + L('M74 101L93 70', INK, 10) + L('M74 101L93 70', '#3a3f4a', 5.6) + L('M77 96l6-9', '#6b7385', 1.6) + L('M88 77l5 3', '#ff4fa0', 2.4)
  + P('M41 66V80H59V66Z', '#e3a77c', 2.8)
  + SYM(P('M29 47Q20 45 21 53Q22 61 31 59Z', '#efb88e', 2.8))
  + P('M27 44V60Q27 77 42 82H58Q73 77 73 60V44Z', '#efb88e', 3.2) + PF('M63 44V62Q63 76 53 82H58Q73 77 73 60V44Z', '#d29468') + PF('M30 64Q36 79 44 81H56Q64 79 70 64Q60 73 50 73Q40 73 30 64Z', INK, ' opacity=".14"')
  + L('M51 53L48.4 60.6H53', INK, 2.6)
  + P('M37 66Q43 59 50 63Q57 59 63 66Q57 69 50 66Q43 69 37 66Z', '#3b2416', 2.4) + L('M44 72.6Q50 74.6 56 72', INK, 2.8)
  + `<path d="M29 45H48Q48.5 57 40 57.6Q30 57.6 29 45ZM52 45H71Q70 57.6 60 57.6Q51.5 57 52 45Z" fill="#2fb5ff" ${S(2.8)}/>` + PF('M30 50H48V53Q46 57 40 57.6Q31 57.6 30 50ZM52 50H71Q70 57.6 60 57.6Q53 57 52 53Z', '#ff4fa0') + L('M48 46.6h4M26 46h3M71 46h3', INK, 2.8) + L('M33 48.6l5-2M55 48.6l5-2', '#fff', 2)
  + P('M18 36Q14 8 50 6Q86 8 82 36Z', '#2a4a8a', 3.2) + PF('M60 8Q84 12 82 36H68Q68 18 60 8Z', '#1b3166')
  + `<rect x="17" y="31" width="66" height="9" rx="2" fill="url(#gdchk)" ${S(2.8)}/>`
  + P('M14 41Q50 33 86 41L83 48Q50 41 17 48Z', '#14161c', 3) + L('M28 42q22-3.6 44 0', '#fff', 1.8, ' opacity=".55"')
  + star(50, 19, 9, '#ffcd3c', 2.4) + C(50, 19, 2.4, '#e2402f')
  + `</svg>`;
const KEY = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="34" cy="50" r="18" fill="#ffcd3c" stroke="${INK}" stroke-width="5"/><circle cx="34" cy="50" r="7" fill="#fff6d2" stroke="${INK}" stroke-width="4"/><path d="M50 46h36v8h-6v12h-8V54h-6v8h-8V54h-8z" fill="#ffcd3c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/></svg>`;
const LOCK = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="42" r="14" fill="none" stroke="#ffcd3c" stroke-width="7"/><path d="M42 50 L36 78 H64 L58 50Z" fill="none" stroke="#ffcd3c" stroke-width="7" stroke-linejoin="round"/></svg>`;
/* ---------------- UI icons (24×24 line icons) ---------------- */
const ic = (d, extra = '') => `<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${extra}</svg>`;
const ICON = {
  back: ic('M15 5l-7 7 7 7'), home: ic('M4 11l8-7 8 7v9h-5v-6H9v6H4z'), help: ic('M9.5 9a2.6 2.6 0 1 1 3.8 2.3c-.8.4-1.3 1-1.3 1.9V14M12 17.5v.5', '<circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="2"/>'),
  gear: ic('M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1'),
  sound: ic('M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11'), mute: ic('M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6'),
  rank: ic('M5 20V12M12 20V5M19 20v-9'), trophy: ic('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8'),
  book: ic('M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z'),
  locker: ic('M6 3h12v18H6zM12 3v18M9 9v2M15 9v2M8 15h2M14 15h2'), undo: ic('M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3'), retry: ic('M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4'),
  hint: ic('M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z'),
  play: '<svg viewBox="0 0 24 24" class="ico" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  lock: ic('M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3'), coin: '<svg viewBox="0 0 24 24" class="ico coin" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="#ffcd3c" stroke="#2a2622" stroke-width="2"/><path d="M9 8.5h4.2a2.3 2.3 0 0 1 0 4.6H9.5M9.5 8.5V16M8 13.1h5.5" fill="none" stroke="#2a2622" stroke-width="1.8" stroke-linecap="round"/></svg>',
  daily: ic('M4 6h16v14H4zM4 10h16M8 3v4M16 3v4'), course: ic('M4 20h16M6 20V8l6-4 6 4v12M10 20v-5h4v5M9 10h.01M15 10h.01'), modes: ic('M13 2L4 14h7l-1 8 9-12h-7z'),
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z"/></svg>',
  arrowL: ic('M19 12H5M11 6l-6 6 6 6'), arrowR: ic('M5 12h14M13 6l6 6-6 6'), arrowU: ic('M12 19V5M6 11l6-6 6 6'), arrowD: ic('M12 5v14M6 13l6 6 6-6'),
  bolt: ic('M13 2L4 14h7l-1 8 9-12h-7z'), clock: ic('M12 7v5l3 2', '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>'),
  exit: '<svg viewBox="0 0 40 24" aria-hidden="true"><rect x="1" y="1" width="38" height="22" rx="3" fill="#1fa463" stroke="#0b5131" stroke-width="2"/><text x="20" y="16.5" text-anchor="middle" font-size="11" font-weight="800" fill="#fff" font-family="Jost,Arial,sans-serif">EXIT</text></svg>',
};
/* ---------------- mode icons (48×48, colour) ---------------- */
const MI = {
  sl: `<svg viewBox="0 0 48 48"><path d="M24 4 L4 44 H44Z" fill="#ffe27a" opacity=".85"/><circle cx="24" cy="8" r="6" fill="#2a2622"/><circle cx="24" cy="8" r="3" fill="#fff6c2"/></svg>`,
  chain: `<svg viewBox="0 0 48 48"><rect x="4" y="18" width="18" height="12" rx="6" fill="none" stroke="#c7ccd6" stroke-width="5"/><rect x="26" y="18" width="18" height="12" rx="6" fill="none" stroke="#c7ccd6" stroke-width="5"/><rect x="16" y="20" width="16" height="8" rx="4" fill="none" stroke="#f26b1d" stroke-width="5"/></svg>`,
  silent: `<svg viewBox="0 0 48 48"><path d="M10 30 q14 -22 28 0" fill="none" stroke="#fff" stroke-width="4"/><circle cx="24" cy="24" r="16" fill="none" stroke="#fff" stroke-width="3" opacity=".4"/><path d="M8 40 L40 8" stroke="#ff5d5d" stroke-width="5" stroke-linecap="round"/><text x="24" y="31" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">shh</text></svg>`,
  key: `<svg viewBox="0 0 48 48"><circle cx="16" cy="24" r="9" fill="#ffcd3c" stroke="#2a2622" stroke-width="3"/><path d="M24 22h18v5h-3v6h-4v-6h-3v4h-4v-4h-4z" fill="#ffcd3c" stroke="#2a2622" stroke-width="2.4"/></svg>`,
  plate: `<svg viewBox="0 0 48 48"><rect x="6" y="28" width="36" height="12" rx="3" fill="#ffcd3c" stroke="#2a2622" stroke-width="3"/><path d="M10 28l6 12M18 28l6 12M26 28l6 12M34 28l6 12" stroke="#2a2622" stroke-width="3"/><path d="M14 6v16M22 6v16M30 6v16M38 6v16" stroke="#c7ccd6" stroke-width="4"/></svg>`,
  oneway: `<svg viewBox="0 0 48 48"><rect x="4" y="14" width="40" height="20" rx="4" fill="#3d8fd1" stroke="#2a2622" stroke-width="3"/><path d="M12 18l8 6-8 6M22 18l8 6-8 6M32 18l8 6-8 6" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/></svg>`,
  ice: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" rx="6" fill="#bfe9ff" stroke="#2a2622" stroke-width="3"/><path d="M24 10v28M12 17l24 14M36 17L12 31" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>`,
  patrol: `<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="12" fill="#f6d2b0" stroke="#2a2622" stroke-width="3"/><path d="M10 20 Q24 4 38 20 L40 23 H8Z" fill="#2f4d7a" stroke="#2a2622" stroke-width="3" stroke-linejoin="round"/><rect x="21" y="11" width="6" height="5" fill="#ffcd3c"/><path d="M19 29h3M26 29h3" stroke="#2a2622" stroke-width="3" stroke-linecap="round"/></svg>`,
  twin: `<svg viewBox="0 0 48 48"><rect x="3" y="16" width="26" height="14" rx="5" fill="#f26b1d" stroke="#2a2622" stroke-width="3"/><rect x="31" y="3" width="14" height="26" rx="5" fill="#ff9a3c" stroke="#2a2622" stroke-width="3"/><path d="M14 40h8l-3-3M38 34v8l3-3" fill="none" stroke="#1fa463" stroke-width="3" stroke-linecap="round"/></svg>`,
  dig: `<svg viewBox="0 0 48 48"><rect x="4" y="4" width="40" height="40" fill="#a1553a" stroke="#2a2622" stroke-width="3"/><path d="M4 16h40M4 30h40M18 4v12M30 16v14M14 30v14M36 30v14" stroke="#6e3524" stroke-width="2.4"/><path d="M20 18l6 6-4 4 6 6" fill="none" stroke="#2a2622" stroke-width="3"/><path d="M30 6l10 10-14 14" fill="none" stroke="#c7ccd6" stroke-width="4" stroke-linecap="round"/></svg>`,
  tilt: `<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="32" rx="4" fill="#d8d2c4" stroke="#2a2622" stroke-width="3" transform="rotate(14 24 24)"/><rect x="24" y="26" width="10" height="10" fill="#c98b55" stroke="#2a2622" stroke-width="2.4" transform="rotate(14 24 24)"/><path d="M4 8q6-6 14-4" fill="none" stroke="#2a2622" stroke-width="3" stroke-linecap="round"/></svg>`,
  big: `<svg viewBox="0 0 48 48"><rect x="3" y="3" width="42" height="42" rx="4" fill="#5c6b80" stroke="#2a2622" stroke-width="3"/><path d="M3 13.5h42M3 24h42M3 34.5h42M13.5 3v42M24 3v42M34.5 3v42" stroke="#8796ab" stroke-width="1.6"/><rect x="5" y="15" width="18" height="8" rx="3" fill="#f26b1d" stroke="#2a2622" stroke-width="2"/></svg>`,
};
/* ---------------- floor skins (play board) ---------------- */
const SKINS = [
  { id: 'concrete', rar: 0 }, { id: 'brick', rar: 0 }, { id: 'tile', rar: 1 }, { id: 'yard', rar: 1 },
  { id: 'night', rar: 2 }, { id: 'desert', rar: 2 }, { id: 'arctic', rar: 2 }, { id: 'neon', rar: 3 },
];
/* ---------------- mini board (SVG) for cards ---------------- */
const BCOL = ['#7a8fa6', '#a0784f', '#6f8b5e', '#8c7aa0', '#5f8e94', '#a86a5a', '#8d8f99', '#b49554'];
function miniBoard(P, S, cls = 'mini') {
  const w = P.w, h = P.h, u = 10, pad = 3;
  let s = `<svg viewBox="0 0 ${w * u + pad * 2 + 4} ${h * u + pad * 2 + 4}" class="${cls}"><rect x="1" y="1" width="${w * u + pad * 2 + 2}" height="${h * u + pad * 2 + 2}" rx="3" fill="#3a3f4a"/><rect x="${pad + 1}" y="${pad + 1}" width="${w * u}" height="${h * u}" fill="#d8d2c4"/>`;
  const X = c => pad + 1 + (c % w) * u, Y = c => pad + 1 + ((c / w) | 0) * u;
  const pi = P.pc.findIndex(p => p.t === 'P'); if (pi >= 0) { const y = S[2 * pi + 1]; s += `<rect x="${pad + 1 + w * u}" y="${pad + 1 + y * u + 1}" width="${pad + 2}" height="${u - 2}" fill="#1fa463"/>`; }
  const qi = P.pc.findIndex(p => p.t === 'Q'); if (qi >= 0) { const x = S[2 * qi]; s += `<rect x="${pad + 1 + x * u + 1}" y="${pad + 1 + h * u}" width="${u - 2}" height="${pad + 2}" fill="#1fa463"/>`; }
  P.walls.forEach(c => { s += `<rect x="${X(c)}" y="${Y(c)}" width="${u}" height="${u}" fill="#6b5a4e"/>`; });
  P.cracks.forEach(c => { s += `<rect x="${X(c)}" y="${Y(c)}" width="${u}" height="${u}" fill="#a1553a"/><path d="M${X(c) + 3} ${Y(c) + 2}l3 3-2 2 3 3" stroke="#2a2622" stroke-width="1" fill="none"/>`; });
  if (P.plate >= 0) s += `<rect x="${X(P.plate) + 1}" y="${Y(P.plate) + 1}" width="${u - 2}" height="${u - 2}" fill="#ffcd3c"/>`;
  P.doors.forEach(c => { s += `<path d="M${X(c) + 3} ${Y(c)}v${u}M${X(c) + 7} ${Y(c)}v${u}" stroke="#8d96a8" stroke-width="1.6"/>`; });
  P.gate.forEach(c => { s += `<path d="M${X(c) + 2} ${Y(c)}v${u}M${X(c) + 5} ${Y(c)}v${u}M${X(c) + 8} ${Y(c)}v${u}" stroke="#d64541" stroke-width="1.6"/>`; });
  P.pc.forEach((p, i) => {
    const x = S[2 * i]; if (x < 0) return; const y = S[2 * i + 1];
    const pw = (p.v ? 1 : p.l) * u - 1.6, ph = (p.v ? p.l : 1) * u - 1.6;
    const fill = p.t === 'P' ? '#f26b1d' : p.t === 'Q' ? '#ff9a3c' : p.t === 'g' ? '#2f4d7a' : p.t === 'k' ? '#ffcd3c' : p.t === 'x' ? '#c98b55' : p.t === 'o' ? '#3d8fd1' : BCOL[i % BCOL.length];
    s += `<rect x="${pad + 1 + x * u + .8}" y="${pad + 1 + y * u + .8}" width="${pw}" height="${ph}" rx="2" fill="${fill}" stroke="#2a2622" stroke-width=".8"/>`;
  });
  if (P.lock >= 0) s += `<circle cx="${X(P.lock) + 5}" cy="${Y(P.lock) + 5}" r="3.2" fill="rgba(42,38,34,.6)" stroke="#ffcd3c" stroke-width="1.6"/>`;   // keyhole on top: it can start under a block
  return s + '</svg>';
}
window.JBArt = { INMATES, inmateSVG, GUARD, KEY, LOCK, ICON, MI, SKINS, miniBoard, BCOL, RAR: ['N', 'R', 'SR', 'SSR'] };
})();
