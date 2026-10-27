/* だつごくスライダー！ — art: inmate characters (original comic-style human convicts), guard, UI icons, floor skins, mini boards */
(function () {
'use strict';
/* ---------------- inmates ----------------
   American-comic / arcade-shooter caricatures built from parts: head (m/f), hair (back + front), brows, eyes, mouth, accessories.
   kind: hair style · c: skin · c2: hair colour · sex: 'm' | 'f' · rar: 0 N, 1 R, 2 SR, 3 SSR */
const INK = '#2a2622';
const SKIN = ['#f7d3b5', '#eab48c', '#cf9468', '#a66a43', '#6e4329', '#f1c3a0'];
const CAST = [
  // N
  ['Rookie', 'm', 0, 'buzz', '#5a3a22', 'flat', 'grin', 'bandaid'],
  ['Jinx', 'f', 1, 'pony', '#e8a21e', 'raise', 'smirk', 'freckles'],
  ['Brick', 'm', 4, 'bald', '#2a2622', 'angry', 'frown', 'beard scarR'],
  ['Pixel', 'f', 0, 'bob', '#6b3f22', 'worry', 'o', 'glasses sweat'],
  ['Stubbs', 'm', 2, 'beanie', '#3d6b4a', 'angry', 'grit', 'stubble'],
  ['Bubbles', 'f', 5, 'buns', '#f06fa0', 'raise', 'bubble', 'wink blush'],
  ['Groove', 'm', 3, 'afro', '#2a1e16', 'flat', 'grin', 'band:#f4f1ea'],
  ['Vivi', 'f', 2, 'wavy', '#8a2f1e', 'raise', 'lips', 'hoops mole'],
  // R
  ['Spike', 'm', 5, 'mohawk', '#3fbf4a', 'angry', 'shout', 'stud'],
  ['Roxy', 'f', 4, 'bandana', '#1e1a18', 'angry', 'grin', 'bandaidN hoops'],
  ['Duke', 'm', 2, 'pomp', '#1e1a18', 'raise', 'smirk', 'burns toothpick'],
  ['Venom', 'f', 0, 'undercut', '#8b4fd1', 'angry', 'lips', 'nosering stud'],
  ['Sparky', 'm', 1, 'spiky', '#b5541f', 'raise', 'grin', 'soot goggles'],
  ['Queenie', 'f', 3, 'braids', '#1e1a18', 'raise', 'lips', 'hoops'],
  ['Ledger', 'm', 5, 'slick', '#3a3a40', 'flat', 'smirk', 'glasses mustache'],
  ['Kite', 'f', 2, 'topbun', '#4a2a18', 'angry', 'line', 'scarEye'],
  // SR
  ['Captain', 'm', 1, 'buzz', '#b9b4ad', 'angry', 'gold', 'eyepatch scarR stubble'],
  ['Silver', 'f', 0, 'long', '#f3e3b0', 'flat', 'smirk', 'band:#2f74b5 lips2'],
  ['Rasta', 'm', 4, 'dreads', '#3b2416', 'raise', 'shout', 'stubble stud'],
  ['Wrench', 'f', 0, 'pixie', '#e2452b', 'raise', 'grin', 'goggles starTat freckles'],
  ['Tank', 'm', 2, 'bald', '#2a2622', 'angry', 'grit', 'headTat stud stubble'],
  ['Raven', 'f', 5, 'hime', '#16141c', 'raise', 'lips', 'mole stud'],
  // SSR
  ['Legend', 'm', 1, 'wild', '#4a2c1a', 'raise', 'grin', 'tails scarN stubble'],
  ['Nova', 'f', 0, 'cyber', '#21b8a8', 'flat', 'smirk', 'cyber'],
];
const RARS = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3];
const INMATES = CAST.map(([name, sex, sk, hair, hc, brow, mouth, acc], id) => ({ id, kind: hair, c: SKIN[sk], c2: hc, rar: RARS[id], sex, name, brow, mouth, acc: acc.split(' ') }));
const dk = (h, f = .76) => '#' + [1, 3, 5].map(i => Math.round(parseInt(h.slice(i, i + 2), 16) * f).toString(16).padStart(2, '0')).join('');
const S = (w = 3) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const P = (d, f, w = 3) => `<path d="${d}" fill="${f}" ${f === 'none' ? '' : ''}${S(w)}/>`;
const PF = (d, f, o = '') => `<path d="${d}" fill="${f}"${o}/>`;                       // fill only
const L = (d, c = INK, w = 3, o = '') => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${o}/>`;
const MIR = s => `<g transform="translate(100 0) scale(-1 1)">${s}</g>`;
const SYM = s => s + MIR(s);
let UID = 0;
const HEAD = { m: 'M29 44Q29 21 50 21Q71 21 71 44V58Q71 75 58 80H42Q29 75 29 58Z', f: 'M31 44Q31 21 50 21Q69 21 69 44Q69 64 60 74Q50 82 40 74Q31 64 31 44Z' };
/* hair: [back layer, front layer] */
function hair(k, hc, skin) {
  const d = dk(hc), sh = (x1, y1, x2, y2) => L(`M${x1} ${y1}Q${(x1 + x2) / 2} ${Math.min(y1, y2) - 3} ${x2} ${y2}`, '#fff', 2.4, ' opacity=".55"');
  switch (k) {
    case 'buzz': return ['', P('M29 43Q28 19 50 18Q72 19 71 43Q68 30 60 29Q50 27 40 29Q32 30 29 43Z', hc) + PF('M34 26q16-6 32 0', 'none', ` stroke="${d}" stroke-width="1.6" stroke-dasharray="1 3"`)];
    case 'bald': return ['', L('M37 28Q43 23 50 23', '#fff', 3, ' opacity=".6"')];
    case 'beanie': return ['', P('M27 41Q25 9 50 9Q75 9 73 41Z', hc) + `<rect x="25" y="31" width="50" height="10" rx="3" fill="${d}" ${S(2.6)}/>` + L('M31 32v8M37 32v8M43 32v8M49 32v8M55 32v8M61 32v8M67 32v8', INK, 1.2, ' opacity=".5"') + sh(36, 20, 52, 15)];
    case 'afro': {
      let b = '';
      for (let i = 0; i < 13; i++) { const a = i / 13 * Math.PI * 2; b += `<circle cx="${(50 + Math.cos(a) * 27).toFixed(1)}" cy="${(34 + Math.sin(a) * 21).toFixed(1)}" r="12" fill="${hc}" ${S()}/>`; }
      return [b + `<ellipse cx="50" cy="34" rx="28" ry="22" fill="${hc}"/>`, P('M29 45Q30 26 50 26Q70 26 71 45Q66 33 50 33Q34 33 29 45Z', hc)];
    }
    case 'mohawk': return ['', PF('M30 41Q30 23 50 22Q70 23 70 41Q60 31 50 31Q40 31 30 41Z', dk(skin, .84)) + P('M43 33L37 3L46 13L50 -2L54 13L63 3L57 33Z', hc) + L('M47 12l2 14', '#fff', 2, ' opacity=".5"')];
    case 'pomp': return ['', P('M28 46Q22 26 34 18Q48 5 66 9Q81 13 77 23Q75 28 70 28Q72 36 71 46Q68 34 58 32Q46 30 38 34Q31 38 28 46Z', hc) + sh(38, 16, 66, 12) + L('M46 22q10-6 22-4', '#fff', 1.6, ' opacity=".35"')];
    case 'spiky': return ['', P('M28 46L23 30L32 31L27 15L38 22L40 7L48 18L54 4L58 18L67 7L66 22L77 17L70 30L78 34L71 46Q66 32 50 31Q34 32 28 46Z', hc) + sh(40, 22, 56, 19)];
    case 'slick': return ['', P('M28 44Q27 17 50 16Q73 17 72 44Q70 29 62 26Q50 22 38 26Q30 30 28 44Z', hc) + L('M36 22Q50 15 66 22M33 30Q48 21 68 28', '#c9ccd6', 1.6)];
    case 'dreads': {
      let b = '';
      [[25, 30, 22, 86], [31, 28, 30, 90], [69, 28, 70, 90], [75, 30, 78, 86], [37, 24, 36, 84], [63, 24, 64, 84]].forEach(([x1, y1, x2, y2]) => { b += L(`M${x1} ${y1}Q${x1 - 4} ${(y1 + y2) / 2} ${x2} ${y2}`, INK, 10) + L(`M${x1} ${y1}Q${x1 - 4} ${(y1 + y2) / 2} ${x2} ${y2}`, hc, 5); });
      return [b, P('M29 44Q28 18 50 17Q72 18 71 44Q68 29 50 28Q32 29 29 44Z', hc) + `<rect x="42" y="13" width="16" height="7" rx="3" fill="#ffcd3c" ${S(2)}/><rect x="42" y="13" width="5" height="7" fill="#d64541"/><rect x="53" y="13" width="5" height="7" fill="#1fa463"/>`];
    }
    case 'wild': return [P('M26 42Q18 14 46 11Q74 7 83 29Q97 42 89 66Q85 56 79 54Q87 72 79 86Q74 72 70 64L30 64Q25 74 21 86Q15 66 23 54Q16 50 26 42Z', hc), P('M29 44Q27 22 44 18Q60 14 70 22Q74 30 71 44Q66 30 54 30Q40 30 29 44Z', hc) + P('M44 26Q38 36 43 44Q46 34 52 28Z', hc, 2.4) + sh(40, 22, 62, 19)];
    // women
    case 'pony': return [P('M62 22Q86 18 87 42Q88 64 75 80Q79 58 71 44Q68 32 62 30Z', hc) + `<circle cx="66" cy="24" r="4.5" fill="#d64541" ${S(2)}/>`, P('M30 46Q28 18 50 17Q72 18 70 46Q68 30 56 28Q48 35 36 35Q31 39 30 46Z', hc) + sh(36, 24, 54, 20)];
    case 'bob': return [P('M26 46Q24 14 50 14Q76 14 74 46L76 74Q70 78 64 73L36 73Q30 78 24 74Z', hc), P('M29 40Q28 17 50 17Q72 17 71 40Z', hc) + SYM(P('M29 38L26 74Q30 77 35 72L33 42Z', hc, 2.6)) + sh(36, 25, 58, 21)];
    case 'buns': return [`<circle cx="31" cy="20" r="11" fill="${hc}" ${S()}/><circle cx="69" cy="20" r="11" fill="${hc}" ${S()}/>`, P('M30 45Q29 19 50 18Q71 19 70 45Q66 28 50 26Q34 28 30 45Z', hc) + L('M50 18v8', d, 2) + sh(26, 15, 34, 12) + sh(64, 15, 72, 12)];
    case 'wavy': return [P('M26 42Q21 14 50 13Q79 14 74 42Q81 56 76 70Q85 82 78 94L22 94Q15 82 24 70Q19 56 26 42Z', hc), P('M30 46Q27 18 50 17Q73 18 70 46Q66 30 57 27Q52 38 38 38Q32 40 30 46Z', hc) + SYM(P('M31 40Q24 52 30 62Q25 71 30 80L36 75Q32 67 36 60Q31 50 34 43Z', hc, 2.6)) + sh(56, 22, 66, 26)];
    case 'bandana': return [P('M27 52Q24 30 30 26L70 26Q76 30 73 52Z', hc), P('M27 40Q25 11 50 11Q75 11 73 40Q50 33 27 40Z', '#d64541') + [[38, 20], [50, 16], [62, 21], [44, 29], [58, 29]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="#fff"/>`).join('') + P('M71 35L87 28L85 40Z', '#d64541', 2.4) + P('M71 37L83 49L75 51Z', '#d64541', 2.4) + `<circle cx="72" cy="36" r="4" fill="${dk('#d64541')}" ${S(2.2)}/>`];
    case 'undercut': return ['', PF('M30 44Q30 26 41 22L41 31Q34 35 31 44Z', dk(skin, .82)) + P('M35 29Q46 12 64 15Q79 21 75 44Q77 59 70 68Q70 49 64 39Q56 30 44 34Q39 33 35 29Z', hc) + sh(50, 18, 68, 20)];
    case 'braids': {
      let b = '';
      [24, 31, 69, 76].forEach(x => { for (let y = 34; y < 94; y += 7) b += `<ellipse cx="${x + (x < 50 ? -(y - 34) / 12 : (y - 34) / 12)}" cy="${y}" rx="3.8" ry="4.4" fill="${hc}" ${S(1.6)}/>`; });
      return [b, P('M30 45Q29 19 50 18Q71 19 70 45Q66 28 50 26Q34 28 30 45Z', hc) + L('M50 18v8', '#6b5a4e', 1.6) + L('M38 22v5M62 22v5', '#6b5a4e', 1.4)];
    }
    case 'topbun': return [`<circle cx="50" cy="12" r="11" fill="${hc}" ${S()}/>`, P('M30 45Q29 19 50 18Q71 19 70 45Q64 30 50 29Q36 30 30 45Z', hc) + `<rect x="43" y="18" width="14" height="5" rx="2" fill="#d64541" ${S(2)}/>` + sh(36, 25, 48, 21)];
    case 'long': return [P('M26 42Q22 13 50 13Q78 13 74 42L79 94L21 94Z', hc), P('M30 48Q27 17 50 16Q73 17 70 48Q66 30 50 24Q34 30 30 48Z', hc) + SYM(P('M31 40L27 82L35 78L34 44Z', hc, 2.6)) + L('M40 22q-6 8-6 20M60 22q6 8 6 20', '#c9a85a', 1.6)];
    case 'pixie': return ['', P('M29 47Q24 22 40 16Q58 10 70 20Q78 30 72 47L68 37L62 41L60 32L52 39L48 30L42 39L38 33L33 41Z', hc) + sh(42, 19, 60, 16)];
    case 'hime': return [P('M26 42Q22 13 50 13Q78 13 74 42L76 94L24 94Z', hc), P('M29 40Q28 17 50 17Q72 17 71 40Z', hc) + SYM(P('M29 38L28 80L36 80L34 42Z', hc, 2.6)) + sh(38, 24, 56, 21)];
    case 'cyber': return ['', P('M29 50Q25 18 50 17Q72 18 71 38Q64 27 54 30Q46 40 36 40Q31 44 29 50Z', hc) + L('M40 22q8-4 16-2', '#c9fff6', 2, ' opacity=".7"')];
  }
  return ['', ''];
}
function brow(t, f) {
  const w = f ? 3.4 : 5, Lb = { angry: 'M34 40L47 45', raise: 'M35 43Q41 38 47 42', flat: 'M35 42L47 42', worry: 'M35 44L47 39' }, Rb = { angry: 'M66 40L53 45', raise: 'M53 38Q59 31 66 35', flat: 'M53 42L65 42', worry: 'M65 44L53 39' };
  const b = L(Lb[t], INK, w) + L(Rb[t], INK, w);
  return f ? `<g transform="translate(0 -3)">${b}</g>` : b;
}
function eye(f, closed) {
  if (closed) return L('M35 50Q41 45 47 50', INK, 3);
  return f ? P('M34 49Q41 43 48 49Q41 54 34 49Z', '#fff', 1.8) + `<circle cx="41.6" cy="49" r="3.2" fill="${INK}"/><circle cx="42.8" cy="47.8" r="1.1" fill="#fff"/>` + L('M33.5 48Q41 42 48.5 47.5', INK, 2.4) + L('M34 47.5L30.5 44.5', INK, 1.8)
    : P('M35 49Q41 45.5 47 49Q41 52 35 49Z', '#fff', 2) + `<circle cx="41.5" cy="49" r="2.5" fill="${INK}"/>` + L('M34.5 49Q41 44.5 47.5 49', INK, 2.6);
}
function mouth(t, f) {
  switch (t) {
    case 'grin': case 'gold': return P('M40 64Q50 62 60 64Q57 74 50 74Q43 74 40 64Z', '#fff', 2.6) + L('M45 63.5v9M50 63v11M55 63.5v9', INK, 1.4) + (t === 'gold' ? PF('M50.6 63.4h4v8.4h-4z', '#ffcd3c') : '');
    case 'grit': return `<rect x="40" y="63" width="20" height="8" rx="2.5" fill="#fff" ${S(2.6)}/>` + L('M40 67h20M45 63v8M50 63v8M55 63v8', INK, 1.3);
    case 'shout': return P('M41 63Q50 60 59 63Q58 77 50 77Q42 77 41 63Z', '#5a1d1d', 2.6) + PF('M42.5 64Q50 62 57.5 64L57 66.5H43Z', '#fff') + PF('M45 74Q50 70 55 74Q50 77 45 74Z', '#e0685f');
    case 'smirk': return L('M43 67Q51 69 58 62', INK, 3) + (f ? '' : L('M58 62l2 1', INK, 2));
    case 'frown': return L('M42 69Q50 63 58 69', INK, 3.2);
    case 'o': return `<ellipse cx="50" cy="67" rx="3.6" ry="4.2" fill="#5a1d1d" ${S(2.4)}/>`;
    case 'line': return L('M43 67H57', INK, 3.2);
    case 'lips': return P('M42 66Q46 62.5 50 64.5Q54 62.5 58 65.5Q51 72 42 66Z', '#c8384a', 2.2) + L('M43 66Q50 67 57.5 65.5', INK, 1.4);
    case 'bubble': return `<circle cx="54" cy="68" r="7.5" fill="#ff8fc0" ${S(2.4)}/>` + L('M51 65q2-2 4-1.5', '#fff', 1.8);
  }
  return '';
}
const NOSE = { m: L('M51 50L48.5 58.5L53 58.5', INK, 2.4), f: L('M50.5 55Q53 58.5 49 59', INK, 2.2) };
/* accessories: drawn under the hair ('u') or on top of everything ('o') */
function acc(a, I, u) {
  const [k, arg] = a.split(':'), sk = I.c;
  const under = {
    beard: P('M29 52Q30 71 40 81Q50 89 60 81Q70 71 71 52Q66 63 58 62Q50 59 42 62Q34 63 29 52Z', I.c2, 2.6),
    stubble: PF('M31 60Q34 76 44 80H56Q66 76 69 60Q62 71 50 71Q38 71 31 60Z', INK, ' opacity=".18"') + [[38, 74], [44, 77], [56, 77], [62, 74], [36, 69], [64, 69]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="${INK}" opacity=".5"/>`).join(''),
    freckles: [[36, 57], [39, 59], [42, 57], [58, 57], [61, 59], [64, 57]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="#a0522d"/>`).join(''),
    blush: L('M34 58l2-3M38 58l2-3M60 58l2-3M64 58l2-3', '#e0685f', 1.6),
    mole: `<circle cx="61" cy="64" r="1.5" fill="${INK}"/>`,
    scarR: L('M60 54L68 67', '#b0443a', 2.6) + L('M61 59l4-1.5M63 62.5l4-1.5', '#b0443a', 1.4),
    scarEye: L('M38 37L44 60', '#b0443a', 2.6) + L('M38 43l4-1M40 50l4-1M41 56l4-1', '#b0443a', 1.4),
    scarN: L('M38 53L62 59', '#b0443a', 2.6) + L('M44 52l-1 4M50 53.5l-1 4M56 55l-1 4', '#b0443a', 1.4),
    soot: PF('M33 58q5-4 9 1q-4 4-9-1zM60 30q6-2 8 3q-5 2-8-3z', INK, ' opacity=".35"'),
    starTat: P('M63 55l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z', '#3d8fd1', 1.2),
    headTat: L('M34 33Q38 22 48 22Q42 26 44 32M66 33Q62 22 52 22Q58 26 56 32', INK, 2.6),
    burns: SYM(PF('M29 42h5v14l-5 3z', I.c2)),
    cyber: `<g clip-path="url(#hc${u})">${PF('M51 10Q57 50 51 90H100V10Z', '#a9b8c8')}${PF('M64 10Q72 50 64 90H100V10Z', '#8396ab')}${L('M51 10Q57 50 51 90', INK, 2.6)}${[[56, 36], [58, 62], [62, 74]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#5d6575"/>`).join('')}${L('M56 70h10M60 70v8', '#5d6575', 1.6)}</g>`,
  };
  const over = {
    bandaid: `<g transform="rotate(-25 62 61)"><rect x="55" y="58" width="15" height="6.5" rx="2.5" fill="#f2c79a" ${S(1.8)}/><rect x="60.5" y="58.6" width="4" height="5.3" fill="#e3ad7e"/></g>`,
    bandaidN: `<g transform="rotate(-12 50 56)"><rect x="40" y="53" width="20" height="6" rx="2.5" fill="#f2c79a" ${S(1.8)}/><rect x="48" y="53.6" width="4" height="4.8" fill="#e3ad7e"/></g>`,
    glasses: SYM(`<rect x="33" y="43.5" width="15" height="11" rx="4" fill="rgba(255,255,255,.28)" ${S(2.6)}/>` + L('M36 46l4-1.5', '#fff', 1.5)) + L('M48 48h4', INK, 2.4),
    sweat: P('M75 28Q80 37 75 41Q70 37 75 28Z', '#9fd3f0', 2) + L('M74 35v2', '#fff', 1.4),
    hoops: SYM(`<circle cx="28" cy="64" r="5" fill="none" stroke="${INK}" stroke-width="4.4"/><circle cx="28" cy="64" r="5" fill="none" stroke="#ffcd3c" stroke-width="2.2"/>`),
    stud: SYM(`<circle cx="28" cy="58.5" r="2.4" fill="#ffcd3c" ${S(1.4)}/>`),
    nosering: L('M51.5 58.5a3 3 0 1 0 3.5 2.5', '#c7ccd6', 1.8),
    toothpick: L('M57 66L72 60', INK, 4) + L('M57 66L72 60', '#f0d28a', 2),
    mustache: P('M39 63Q44 57 50 60.5Q56 57 61 63Q56 65 50 63Q44 65 39 63Z', I.c2, 2.2),
    goggles: L('M27 30Q50 22 73 30', INK, 5.5) + L('M27 30Q50 22 73 30', '#6b5a4e', 3) + SYM(`<circle cx="40" cy="27" r="7.5" fill="#ffcd3c" ${S(2.6)}/><circle cx="40" cy="27" r="4.6" fill="#9fd3f0" ${S(1.6)}/>` + L('M37.5 25.5l2-2', '#fff', 1.6)),
    eyepatch: L('M30 32L38 44M47 47L72 52', INK, 2.6) + `<ellipse cx="41" cy="49" rx="8.5" ry="7" fill="${INK}"/>` + L('M37 46q3-2 6-1', '#5d6575', 1.6),
    band: `<path d="M28 33Q50 25 72 33L72 39Q50 31 28 39Z" fill="${arg || '#d64541'}" ${S(2.4)}/>`,
    tails: `<path d="M28 33Q50 25 72 33L72 39Q50 31 28 39Z" fill="#d64541" ${S(2.4)}/>` + P('M71 34Q85 30 97 20L96 30Q86 38 72 38Z', '#d64541', 2.4) + P('M71 37Q84 40 93 46L86 50Q80 44 71 40Z', '#b8322f', 2.4),
    lips2: '',
    cyberE: `<circle cx="59" cy="49" r="7" fill="#ff3b3b" opacity=".35"/><circle cx="59" cy="49" r="5" fill="${INK}"/><circle cx="59" cy="49" r="3" fill="#ff5d5d"/><circle cx="60" cy="48" r="1" fill="#fff"/>` + L('M66 47h6M66 52h4', '#ff5d5d', 1.4),
  };
  return (under[k] !== undefined ? under : over)[k] || '';
}
const UNDER = ['beard', 'stubble', 'freckles', 'blush', 'mole', 'scarR', 'scarEye', 'scarN', 'soot', 'starTat', 'headTat', 'burns', 'cyber'];
function inmateSVG(id, opt = {}) {
  const I = INMATES[id] || INMATES[0], f = I.sex === 'f', sk = I.c, sd = dk(sk, .8), u = ++UID, A = I.acc, has = k => A.some(a => a.split(':')[0] === k);
  const [hb, hf] = hair(I.kind, I.c2, sk);
  const head = HEAD[I.sex];
  // ears (hidden under long hair for some)
  const ear = SYM(P('M31 47Q22 44 23 53Q24 61 32 59Z', sk, 2.6) + L('M28 50q-2 2 0 5', INK, 1.4));
  // shading: hard shadow tone + halftone band, clipped to the head
  const shade = `<g clip-path="url(#hc${u})">${PF('M61 10Q76 40 66 72Q60 82 46 90H100V10Z', sd)}${PF('M55 10Q71 40 61 72Q55 82 41 90H48Q62 82 68 72Q78 40 63 10Z', `url(#ht${u})`)}${PF('M20 62Q50 78 80 62V100H20Z', sd, ' opacity=".5"')}</g>`;
  const defs = `<defs><clipPath id="hc${u}"><path d="${head}"/></clipPath><pattern id="ht${u}" width="3.6" height="3.6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="1.8" cy="1.8" r="1" fill="${sd}"/></pattern><pattern id="hs${u}" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2" cy="2" r="1.1" fill="#b4440f"/></pattern></defs>`;
  const eyes = (has('wink') ? eye(f, true) : has('eyepatch') ? '' : eye(f)) + (has('cyber') ? '' : MIR(eye(f)));
  const feat = brow(I.brow, f) + eyes + NOSE[I.sex] + mouth(I.mouth, f);
  const under = A.filter(a => UNDER.includes(a.split(':')[0])).map(a => acc(a, I, u)).join('');
  const over = A.filter(a => !UNDER.includes(a.split(':')[0])).map(a => acc(a, I, u)).join('') + (has('cyber') ? acc('cyberE', I, u) : '');
  // jumpsuit collar + number tag
  const W = f ? 14 : 8;
  const suit = opt.noSuit ? '' : P('M42 68V86H58V68Z', sk, 2.6) + PF('M50 70H58V86H50Z', sd) +
    P(`M${W} 101Q${W + 2} 80 37 77L50 92L63 77Q${98 - W} 80 ${100 - W} 101Z`, '#f26b1d') + PF(`M70 80Q${96 - W} 84 ${99 - W} 101H74Z`, 'url(#hs' + u + ')') + PF(`M76 82Q${96 - W} 86 ${99 - W} 101H82Z`, '#c9520f', ' opacity=".6"') +
    P('M37 77L44 95L50 92Z', '#ff8a3d', 2.4) + P('M63 77L56 95L50 92Z', '#ff8a3d', 2.4) +
    `<rect x="60" y="86" width="20" height="9" rx="2" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="70" y="93.4" font-size="7.4" font-weight="800" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif">${String(id + 1).padStart(3, '0')}</text>`;
  let bg = '';
  if (opt.bg) {
    bg = `<rect width="100" height="100" fill="${opt.bg}"/><path d="M0 70h100M0 80h100M0 90h100" stroke="rgba(0,0,0,.07)" stroke-width="3"/>`;
    if (I.rar >= 2) bg += `<path d="${Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, b = a + .12; return `M50 46L${(50 + Math.cos(a) * 90).toFixed(0)} ${(46 + Math.sin(a) * 90).toFixed(0)}L${(50 + Math.cos(b) * 90).toFixed(0)} ${(46 + Math.sin(b) * 90).toFixed(0)}Z`; }).join('')}" fill="${I.rar === 3 ? 'rgba(255,205,60,.45)' : 'rgba(255,255,255,.4)'}"/>`;
  }
  return `<svg viewBox="0 0 100 100" class="inm" aria-hidden="true">${defs}${bg}${hb}${suit}${ear}${P(head, sk)}${shade}${under}${feat}${hf}${over}</svg>`;
}
/* guard (patrol mode): peaked cap, mirrored aviators, square jaw, navy uniform, baton */
const GUARD = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="gdlens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset=".45" stop-color="#f26b1d"/><stop offset=".5" stop-color="#2b313c"/><stop offset="1" stop-color="#5f8ec0"/></linearGradient></defs>`
  + P('M6 101Q8 79 36 76L50 88L64 76Q92 79 94 101Z', '#243a5e') + PF('M70 79Q90 83 93 101H76Z', '#16243d') + P('M40 76L50 90L60 76Z', '#bcd3ea', 2.4) + P('M47 82L53 82L52 96L48 96Z', '#16243d', 2) + P('M22 86l5-4 5 4-1 6h-8z', '#ffcd3c', 2.2)
  + L('M76 101L92 74', INK, 9) + L('M76 101L92 74', '#3a3f4a', 5) + L('M89 79l4 2', '#c7ccd6', 2)
  + P('M41 66V80H59V66Z', '#e3a77c', 2.6)
  + SYM(P('M29 47Q21 45 22 53Q23 60 31 59Z', '#e8b48c', 2.6))
  + P('M28 44V60Q28 76 42 81H58Q72 76 72 60V44Z', '#e8b48c') + PF('M62 44V62Q62 75 52 81H58Q72 76 72 60V44Z', '#c98d63') + PF('M31 64Q36 78 44 80H56Q64 78 69 64Q60 72 50 72Q40 72 31 64Z', INK, ' opacity=".16"')
  + L('M50 75v4', INK, 2) + L('M42 69H58', INK, 3.4) + L('M44 72q6 2 12 0', INK, 1.4, ' opacity=".5"')
  + L('M51 53L48 61H53', INK, 2.4)
  + `<path d="M30 46H48Q49 56 41 57Q32 57 30 46ZM52 46H70Q68 57 59 57Q51 56 52 46Z" fill="url(#gdlens)" ${S(2.6)}/>` + L('M48 47.5h4M27 47h3M70 47h3', INK, 2.4) + L('M34 49l5-2M56 49l5-2', '#fff', 1.8)
  + P('M22 36Q18 14 50 10Q82 14 78 36Z', '#2b4572') + PF('M58 12Q80 16 78 36H66Q66 20 58 12Z', '#1b2e4f')
  + `<rect x="21" y="33" width="58" height="8" rx="2" fill="#16243d" ${S(2.6)}/>` + L('M22 37H78', '#ffcd3c', 1.6)
  + P('M18 41Q50 34 82 41L80 47Q50 41 20 47Z', '#14161c') + L('M30 42q20-3 40 0', '#fff', 1.6, ' opacity=".55"')
  + P('M45 17L55 17L55 25Q50 30 45 25Z', '#ffcd3c', 2.2) + `<circle cx="50" cy="22" r="2" fill="#d64541"/>`
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
