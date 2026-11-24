/* 掼蛋 — card faces (guandan/cards.js). The solitaire / poker card designs (same images, same CSS) for the 52 cards of each deck,
   and two original jokers drawn here: the big joker (大王) in colour, the small joker (小王) in black.
   Card ids 0..107 (see engine.js): id % 54 → 0..51 = suit * 13 + rank - 1, 52 small joker, 53 big joker.
   Marks: .wild (the hearts of the level: a gold "★" ribbon) and .lvl (any other level card: a thin gold bar). */
(function () {
'use strict';
const IMG = '../solitaire/img/';
const RK = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const PIPS = {
  1: [[.5, .5]], 2: [[.5, 0], [.5, 1]], 3: [[.5, 0], [.5, .5], [.5, 1]], 4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]], 6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
  7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]], 8: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [.5, .75], [0, 1], [1, 1]],
  9: [[0, 0], [1, 0], [0, 1 / 3], [1, 1 / 3], [.5, .5], [0, 2 / 3], [1, 2 / 3], [0, 1], [1, 1]],
  10: [[0, 0], [1, 0], [.5, 1 / 6], [0, 1 / 3], [1, 1 / 3], [0, 2 / 3], [1, 2 / 3], [.5, 5 / 6], [0, 1], [1, 1]],
};
const COURT_DIR = { classic: '', antique: 'antique/', flat: 'flat/', gangsta: 'gangsta/' }, FULL_DECKS = ['flat', 'gangsta'];
const suitSvg = (s, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24"><use href="#s${s}"/></svg>`;
// the jokers: "JOKER" down the corner, a jester's cap with bells over a star medallion
function jokerSvg(big) {
  const ink = big ? '#b3121f' : '#17171c', a = big ? '#c8102e' : '#22232a', b = big ? '#1d4fa8' : '#55565e', g = big ? '#d9a63a' : '#8c8d94', s = big ? '#f3c94f' : '#c9cad0';
  return `<svg class="jk-art" viewBox="0 0 100 140" aria-hidden="true">
<g fill="none" stroke="${g}" stroke-width="1.2" opacity=".85"><rect x="16" y="14" width="68" height="112" rx="7"/><rect x="19.5" y="17.5" width="61" height="105" rx="5" stroke-width=".6"/></g>
<g transform="translate(50 64)">
 <circle r="25" fill="${big ? '#fbf1d8' : '#efefee'}" stroke="${g}" stroke-width="1.6"/>
 <circle r="21" fill="none" stroke="${g}" stroke-width=".7" stroke-dasharray="1.6 2.2"/>
 <path d="M0-13 3.4-4.6 12.4-4.2 5.4 1.6 7.8 10.4 0 5.4-7.8 10.4-5.4 1.6-12.4-4.2-3.4-4.6z" fill="${s}" stroke="${g}" stroke-width=".9" stroke-linejoin="round"/>
 <circle r="2.4" fill="${big ? '#fff7df' : '#fff'}" stroke="${g}" stroke-width=".6"/>
</g>
<g transform="translate(50 36)">
 <path d="M-20 4C-24-8-31-12-36-9-30-10-25-3-23 6z" fill="${a}"/>
 <path d="M20 4C24-8 31-12 36-9 30-10 25-3 23 6z" fill="${b}"/>
 <path d="M-7 3C-6-12-2-20 0-23 2-20 6-12 7 3z" fill="${big ? '#2f7d4a' : '#3a3b42'}"/>
 <path d="M-23 6C-10 1 10 1 23 6L21 12C8 8-8 8-21 12z" fill="${g}" stroke="${big ? '#8a5a12' : '#55565e'}" stroke-width=".6"/>
 <circle cx="-36" cy="-9" r="3.2" fill="${s}" stroke="${g}" stroke-width=".7"/><circle cx="36" cy="-9" r="3.2" fill="${s}" stroke="${g}" stroke-width=".7"/><circle cy="-24" r="3.2" fill="${s}" stroke="${g}" stroke-width=".7"/>
 <g fill="${big ? '#fff3c6' : '#fff'}"><circle cx="-12" cy="8.6" r="1.3"/><circle cy="7.6" r="1.3"/><circle cx="12" cy="8.6" r="1.3"/></g>
</g>
<g fill="${ink}" font-family="Bodoni Moda,Georgia,serif" font-weight="700" text-anchor="middle" letter-spacing="0"><text x="50" y="112" font-size="11" letter-spacing="3">JOKER</text></g>
</svg>`;
}
function jokerFace(big) {
  const col = big ? 'jk-big' : 'jk-small', letters = 'JOKER'.split('').map(c => `<i>${c}</i>`).join('');
  return `<div class="fr jk ${col}"><div class="jx">${letters}</div><div class="jx jx2">${letters}</div>${jokerSvg(big)}<div class="big jk-big-ix"><b>${big ? '★' : '☆'}</b></div></div><div class="bk"></div>`;
}
function face(c) {
  const b = c % 54;
  if (b >= 52) return jokerFace(b === 53);
  const s = Math.floor(b / 13), r = b % 13 + 1, rk = RK[r - 1];
  const corner = `<div class="ix"><b>${rk}</b>${suitSvg(s)}</div><div class="ix ix2"><b>${rk}</b>${suitSvg(s)}</div>`;
  let mid;
  if (r > 10) {
    const dir = COURT_DIR[document.documentElement.dataset.court === 'antique' ? 'antique' : 'classic'];
    mid = `<div class="fc"><img src="${IMG}${dir}${'JQK'[r - 11]}${'shdc'[s]}.webp" alt="" draggable="false" decoding="async"></div>`;
  } else if (r === 1) mid = `<div class="ace">${suitSvg(s)}</div>`;
  else mid = `<div class="pp">${PIPS[r].map(([x, y]) => `<i style="left:${x * 100}%;top:${y * 100}%"${y > .5 ? ' class="rv"' : ''}>${suitSvg(s)}</i>`).join('')}</div>`;
  const deck = document.documentElement.dataset.court, full = FULL_DECKS.includes(deck) ? `<img class="fimg" src="${IMG}${deck}/${'A23456789TJQK'[r - 1]}${'shdc'[s]}.webp?v=6" alt="" draggable="false" decoding="async">` : '';
  return `<div class="fr s${s}${r > 10 ? ' face' : ''}">${corner}${mid}<div class="big">${suitSvg(s)}</div>${full}</div><div class="bk"></div>`;
}
// a card element (HTML): c = card id or null (face down). o: { down, cls, style, L (level → marks), k (data-k key) }
function html(c, o) {
  o = o || {};
  const down = c == null || o.down;
  let mark = '';
  if (c != null && o.L && !down && c % 54 < 52) {
    const b = c % 54, nat = b % 13 === 0 ? 14 : b % 13 + 1;
    if (nat === o.L) mark = Math.floor(b / 13) === 1 ? '<span class="mk-w" aria-hidden="true">★</span>' : '<span class="mk-l" aria-hidden="true"></span>';
  }
  return `<span class="cd pc${down ? ' dn' : ''}${o.cls ? ' ' + o.cls : ''}"${c != null ? ` data-c="${c}"` : ''}${o.k ? ` data-k="${o.k}"` : ''}${o.style ? ` style="${o.style}"` : ''}><span class="in">${c == null ? '<div class="fr"></div><div class="bk"></div>' : face(c)}</span>${mark}</span>`;
}
// a small text card (logs, coach): "10♥", jokers "大王/小王" style marks
function mini(c, L) {
  const b = c % 54;
  if (b >= 52) return `<span class="mc jk${b === 53 ? ' bigj' : ''}"><small>${b === 53 ? '★' : '☆'}</small>JK</span>`;
  const s = Math.floor(b / 13), r = b % 13 + 1, nat = r === 1 ? 14 : r;
  const w = L && nat === L ? (s === 1 ? ' wild' : ' lvl') : '';
  return `<span class="mc s${s}${w}">${RK[r - 1]}<small>${'♠♥♦♣'[s]}</small></span>`;
}
window.Cards = { face, html, mini, RK, PIPS, COURT_DIR, FULL_DECKS, IMG, jokerSvg };
})();
