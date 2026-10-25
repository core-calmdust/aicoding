/* だつごく！スライド — art: inmate characters (original animal convicts), UI icons, floor skins, mini boards */
(function () {
'use strict';
/* ---------------- inmates ----------------
   kind: ear / face style · c: fur · c2: inner / muzzle · m: marking */
const INMATES = [
  // id, kind, fur, inner, rarity (0 N, 1 R, 2 SR, 3 SSR)
  ['cat', '#f2a65a', '#fff3e2', 0], ['dog', '#c98b55', '#f6e2c8', 0], ['bear', '#8a5a3b', '#d9b48f', 0], ['rabbit', '#f1ece4', '#f7c6cf', 0],
  ['mouse', '#b9b4ad', '#f7c6cf', 0], ['pig', '#f5b3b8', '#e98a94', 0], ['frog', '#7dbb5a', '#e8f4c8', 0], ['duck', '#ffd24a', '#ff9a3c', 0],
  ['fox', '#e7772f', '#fff3e2', 1], ['panda', '#ffffff', '#2b2b2b', 1], ['raccoon', '#8d8f99', '#f0f0f0', 1], ['koala', '#a7adb8', '#e9eaee', 1],
  ['tiger', '#f0952e', '#fff3e2', 1], ['sheep', '#fbf8f0', '#e8d6c3', 1], ['owl', '#9b7653', '#f3e3c3', 1], ['hamster', '#f3c17a', '#fff6e8', 1],
  ['penguin', '#2f3542', '#ffffff', 2], ['lion', '#e5a53a', '#ffe7b8', 2], ['wolf', '#7b8494', '#e8ebf0', 2], ['monkey', '#a26a42', '#f2cfa6', 2],
  ['hedgehog', '#8b6b4f', '#f4dcc0', 2], ['cow', '#ffffff', '#f5b3b8', 2], ['shark', '#6f8fa8', '#eef3f6', 3], ['robot', '#9fb4c7', '#4fe3c1', 3],
].map(([kind, c, c2, rar], id) => ({ id, kind, c, c2, rar }));
const INK = '#2a2622';
function inmateSVG(id, opt = {}) {
  const I = INMATES[id] || INMATES[0], k = I.kind, c = I.c, c2 = I.c2;
  const st = `stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;
  let ears = '', face = '', extra = '';
  const eye = (x, y) => `<circle cx="${x}" cy="${y}" r="3.1" fill="${INK}"/><circle cx="${x + 1}" cy="${y - 1}" r="1" fill="#fff"/>`;
  let eyes = eye(39, 47) + eye(61, 47);
  const nose = `<ellipse cx="50" cy="56" rx="4" ry="3" fill="${INK}"/>`;
  const mouth = `<path d="M44 61q6 5 12 0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`;
  let muzzle = `<ellipse cx="50" cy="58" rx="12" ry="9" fill="${c2}" ${st}/>` + nose + mouth;
  if (k === 'cat' || k === 'tiger' || k === 'fox' || k === 'wolf') {
    ears = `<path d="M24 36 L28 12 L46 28Z" fill="${c}" ${st}/><path d="M76 36 L72 12 L54 28Z" fill="${c}" ${st}/><path d="M29 30 L30 19 L39 27Z" fill="${c2}"/><path d="M71 30 L70 19 L61 27Z" fill="${c2}"/>`;
    if (k === 'tiger') extra = `<path d="M50 20v8M42 22l2 7M58 22l-2 7M20 48h8M72 48h8M21 56l7-2M79 56l-7-2" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
    if (k === 'fox') muzzle = `<path d="M30 52 Q50 80 70 52 Q50 62 30 52Z" fill="${c2}" ${st}/>` + nose + mouth;
    if (k === 'cat') extra = `<path d="M24 56l-10-2M24 60l-10 2M76 56l10-2M76 60l10 2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  } else if (k === 'dog') ears = `<path d="M22 30q-12 18 0 32q8-10 8-28z" fill="#8a5a3b" ${st}/><path d="M78 30q12 18 0 32q-8-10-8-28z" fill="#8a5a3b" ${st}/>`;
  else if (k === 'bear' || k === 'panda' || k === 'koala' || k === 'hamster' || k === 'mouse' || k === 'raccoon') {
    const ec = k === 'panda' ? '#2b2b2b' : c, er = k === 'koala' ? 15 : k === 'mouse' ? 14 : 10;
    ears = `<circle cx="25" cy="26" r="${er}" fill="${ec}" ${st}/><circle cx="75" cy="26" r="${er}" fill="${ec}" ${st}/>${k === 'koala' || k === 'mouse' ? `<circle cx="25" cy="27" r="${er - 6}" fill="${k === 'mouse' ? c2 : '#e9eaee'}"/><circle cx="75" cy="27" r="${er - 6}" fill="${k === 'mouse' ? c2 : '#e9eaee'}"/>` : ''}`;
    if (k === 'panda') { extra = `<ellipse cx="38" cy="47" rx="8" ry="9" fill="#2b2b2b" transform="rotate(-20 38 47)"/><ellipse cx="62" cy="47" rx="8" ry="9" fill="#2b2b2b" transform="rotate(20 62 47)"/>`; eyes = `<circle cx="39" cy="47" r="2.4" fill="#fff"/><circle cx="61" cy="47" r="2.4" fill="#fff"/>`; muzzle = `<ellipse cx="50" cy="58" rx="11" ry="8" fill="#fff" ${st}/>` + nose + mouth; }
    if (k === 'raccoon') { extra = `<path d="M26 44 Q38 38 46 46 Q38 54 26 50Z M74 44 Q62 38 54 46 Q62 54 74 50Z" fill="#3b3d45"/>`; eyes = `<circle cx="38" cy="46" r="2.6" fill="#fff"/><circle cx="62" cy="46" r="2.6" fill="#fff"/>`; }
    if (k === 'koala') muzzle = `<ellipse cx="50" cy="55" rx="7" ry="9" fill="#3b3d45"/>` + mouth.replace('61', '66');
    if (k === 'hamster') extra = `<circle cx="28" cy="58" r="7" fill="#f7a8a8" opacity=".7"/><circle cx="72" cy="58" r="7" fill="#f7a8a8" opacity=".7"/>`;
  } else if (k === 'rabbit') ears = `<ellipse cx="38" cy="14" rx="7" ry="18" fill="${c}" ${st}/><ellipse cx="62" cy="14" rx="7" ry="18" fill="${c}" ${st}/><ellipse cx="38" cy="15" rx="3" ry="12" fill="${c2}"/><ellipse cx="62" cy="15" rx="3" ry="12" fill="${c2}"/>`;
  else if (k === 'pig') { ears = `<path d="M24 34 L26 16 L42 26Z" fill="${c}" ${st}/><path d="M76 34 L74 16 L58 26Z" fill="${c}" ${st}/>`; muzzle = `<ellipse cx="50" cy="58" rx="11" ry="8" fill="${c2}" ${st}/><circle cx="46" cy="58" r="2" fill="${INK}"/><circle cx="54" cy="58" r="2" fill="${INK}"/>`; }
  else if (k === 'frog') { ears = `<circle cx="32" cy="26" r="11" fill="${c}" ${st}/><circle cx="68" cy="26" r="11" fill="${c}" ${st}/>`; eyes = eye(32, 26) + eye(68, 26); muzzle = `<path d="M34 58q16 12 32 0" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`; }
  else if (k === 'duck') { muzzle = `<path d="M34 56 Q50 46 66 56 Q50 70 34 56Z" fill="${c2}" ${st}/>`; ears = `<path d="M48 18q4-10 10-6q-6 2-6 8" fill="${c}" ${st}/>`; }
  else if (k === 'sheep') { ears = `<ellipse cx="18" cy="44" rx="10" ry="5" fill="${c2}" ${st}/><ellipse cx="82" cy="44" rx="10" ry="5" fill="${c2}" ${st}/>` + [22, 34, 46, 58, 70, 78].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 22 : 26}" r="9" fill="#fff" ${st}/>`).join(''); muzzle = `<ellipse cx="50" cy="58" rx="10" ry="8" fill="${c2}" ${st}/>` + nose; }
  else if (k === 'owl') { ears = `<path d="M24 30 L22 14 L38 24Z" fill="${c}" ${st}/><path d="M76 30 L78 14 L62 24Z" fill="${c}" ${st}/>`; extra = `<circle cx="38" cy="46" r="10" fill="${c2}" ${st}/><circle cx="62" cy="46" r="10" fill="${c2}" ${st}/>`; muzzle = `<path d="M45 54 L55 54 L50 63Z" fill="#ff9a3c" ${st}/>`; }
  else if (k === 'penguin') { extra = `<path d="M30 40 Q50 26 70 40 Q74 66 50 72 Q26 66 30 40Z" fill="#fff"/>`; muzzle = `<path d="M44 54 L56 54 L50 62Z" fill="#ffb12e" ${st}/>`; }
  else if (k === 'lion') { ears = Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2; return `<circle cx="${50 + Math.cos(a) * 32}" cy="${48 + Math.sin(a) * 30}" r="11" fill="#b96a24" ${st}/>`; }).join(''); }
  else if (k === 'monkey') { ears = `<circle cx="17" cy="48" r="9" fill="${c}" ${st}/><circle cx="83" cy="48" r="9" fill="${c}" ${st}/>`; extra = `<path d="M30 44 Q34 30 50 36 Q66 30 70 44 Q72 66 50 70 Q28 66 30 44Z" fill="${c2}"/>`; }
  else if (k === 'hedgehog') { ears = Array.from({ length: 9 }, (_, i) => { const x = 18 + i * 8; return `<path d="M${x - 6} 34 L${x} ${10 + (i % 2) * 6} L${x + 6} 34Z" fill="#5d4532" ${st}/>`; }).join(''); }
  else if (k === 'cow') { ears = `<path d="M30 22q-4-10 2-14q2 6 4 12z M70 22q4-10-2-14q-2 6-4 12z" fill="#e8d6c3" ${st}/><ellipse cx="18" cy="38" rx="10" ry="5" fill="${c}" ${st}/><ellipse cx="82" cy="38" rx="10" ry="5" fill="${c}" ${st}/>`; extra = `<path d="M60 26q12-2 14 12q-8 6-14-2z" fill="#3b3d45"/><path d="M26 36q4-8 12-6q0 8-8 10z" fill="#3b3d45"/>`; muzzle = `<ellipse cx="50" cy="60" rx="15" ry="9" fill="${c2}" ${st}/><circle cx="45" cy="60" r="2" fill="${INK}"/><circle cx="55" cy="60" r="2" fill="${INK}"/>`; }
  else if (k === 'shark') { ears = `<path d="M44 20 L52 2 L60 22Z" fill="${c}" ${st}/>`; extra = `<path d="M28 50 Q50 76 72 50 Q66 70 50 72 Q34 70 28 50Z" fill="${c2}"/>`; muzzle = `<path d="M38 60 l4 4 4-4 4 4 4-4 4 4 4-4" fill="none" stroke="${INK}" stroke-width="2"/>`; }
  else if (k === 'robot') { ears = `<rect x="46" y="6" width="8" height="12" fill="#c7ccd6" ${st}/><circle cx="50" cy="6" r="5" fill="#ff5d5d" ${st}/><rect x="10" y="38" width="10" height="18" rx="3" fill="#c7ccd6" ${st}/><rect x="80" y="38" width="10" height="18" rx="3" fill="#c7ccd6" ${st}/>`; eyes = `<rect x="31" y="40" width="38" height="13" rx="6" fill="${INK}"/><circle cx="41" cy="46.5" r="3.4" fill="${c2}"/><circle cx="59" cy="46.5" r="3.4" fill="${c2}"/>`; muzzle = `<rect x="40" y="58" width="20" height="6" rx="2" fill="${INK}"/><path d="M44 58v6M48 58v6M52 58v6M56 58v6" stroke="${c2}" stroke-width="1.4"/>`; }
  const head = k === 'robot' ? `<rect x="20" y="18" width="60" height="58" rx="14" fill="${c}" ${st}/>` : `<ellipse cx="50" cy="50" rx="30" ry="28" fill="${c}" ${st}/>`;
  // jumpsuit collar + number tag
  const suit = opt.noSuit ? '' : `<path d="M14 100 Q16 78 50 76 Q84 78 86 100Z" fill="#f26b1d" ${st}/><path d="M38 77 L50 90 L62 77" fill="#ffd9bf" ${st}/><rect x="56" y="86" width="20" height="9" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.6"/><text x="66" y="93.4" font-size="7.4" font-weight="800" text-anchor="middle" fill="${INK}" font-family="Jost,sans-serif">${String(id + 1).padStart(3, '0')}</text>`;
  const bg = opt.bg ? `<rect width="100" height="100" fill="${opt.bg}"/><path d="M0 70h100M0 80h100M0 90h100" stroke="rgba(0,0,0,.07)" stroke-width="3"/>` : '';
  return `<svg viewBox="0 0 100 100" class="inm" aria-hidden="true">${bg}${suit}${ears}${head}${extra}${eyes}${muzzle}</svg>`;
}
/* guard (patrol mode) */
const GUARD = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 100 Q20 76 50 74 Q80 76 82 100Z" fill="#2f4d7a" stroke="${INK}" stroke-width="3"/><circle cx="50" cy="50" r="24" fill="#f6d2b0" stroke="${INK}" stroke-width="3"/><path d="M22 38 Q50 14 78 38 L82 44 L18 44Z" fill="#2f4d7a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/><rect x="44" y="26" width="12" height="9" rx="2" fill="#ffcd3c" stroke="${INK}" stroke-width="2"/><path d="M38 54h8M54 54h8" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M42 64h16" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="64" cy="86" r="5" fill="#ffcd3c" stroke="${INK}" stroke-width="2"/></svg>`;
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
