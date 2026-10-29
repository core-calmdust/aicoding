/* ポーカー — card faces (poker/cards.js): the solitaire's card designs (same images, same CSS) */
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
function face(c) {
  const s = Math.floor(c / 13) % 4, r = c % 13 + 1, rk = RK[r - 1];
  const corner = `<div class="ix"><b>${rk}</b>${suitSvg(s)}</div><div class="ix ix2"><b>${rk}</b>${suitSvg(s)}</div>`;
  let mid;
  if (r > 10) {
    const dir = COURT_DIR[document.documentElement.dataset.court === 'antique' ? 'antique' : 'classic'];
    mid = `<div class="fc"><img src="${IMG}${dir}${'JQK'[r - 11]}${'shdc'[s]}.webp" alt="" draggable="false" decoding="async"></div>`;
  } else if (r === 1) mid = `<div class="ace">${suitSvg(s)}</div>`;
  else mid = `<div class="pp">${PIPS[r].map(([x, y]) => `<i style="left:${x * 100}%;top:${y * 100}%"${y > .5 ? ' class="rv"' : ''}>${suitSvg(s)}</i>`).join('')}</div>`;
  const deck = document.documentElement.dataset.court, full = FULL_DECKS.includes(deck) ? `<img class="fimg" src="${IMG}${deck}/${'A23456789TJQK'[r - 1]}${'shdc'[s]}.webp?v=2" alt="" draggable="false" decoding="async">` : '';
  return `<div class="fr s${s}${r > 10 ? ' face' : ''}">${corner}${mid}<div class="big">${suitSvg(s)}</div>${full}</div><div class="bk"></div>`;
}
// a card element (HTML): c = card id or null (face down / unknown)
function html(c, o) {
  o = o || {};
  const down = c == null || o.down;
  return `<span class="cd pc${down ? ' dn' : ''}${o.cls ? ' ' + o.cls : ''}"${c != null ? ` data-c="${c}"` : ''}${o.style ? ` style="${o.style}"` : ''}><span class="in">${c == null ? '<div class="fr"></div><div class="bk"></div>' : face(c)}</span></span>`;
}
window.Cards = { face, html, RK, PIPS, COURT_DIR, FULL_DECKS, IMG };
})();
