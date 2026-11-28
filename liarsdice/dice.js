/* ライアーダイス — dice and cups as pictures (liarsdice/dice.js)
   The pictures are made by tools/gen_tex.py (bone / ebony / boxwood / red resin dice, four leather cups, table surfaces).
   Dice.img(face, cls)  a die of the chosen material, seen from above
   Dice.die(face, o)    a die lying on the table (a slight random turn, a shadow), o = { k, cls, rot }
   Dice.art(preset)     the picture on the game cards of the new-game dialog */
(function () {
'use strict';
const V = 2;
const mat = () => document.documentElement.dataset.dice || 'bone';
const src = (f, m) => `img/die-${m || mat()}-${f}.webp?v=${V}`;
function img(f, cls, m) { return `<img class="dimg ${cls || ''}" src="${src(f, m)}" alt="${f}" draggable="false">`; }
function die(f, o) {
  o = o || {};
  return `<span class="die ${o.cls || ''}" data-k="${o.k || ''}" style="--r:${(o.rot || 0).toFixed(1)}deg"><img src="${src(f)}" alt="${f}" draggable="false"></span>`;
}
// a steady little turn for each die (the same every render)
function rot(r, p, i) { const x = Math.sin((r * 31 + p * 7 + i * 13) * 12.9898) * 43758.5453; return ((x - Math.floor(x)) - .5) * 26; }
// game cards: a cup and a few dice
function art(k) {
  const m = k === 'classic' ? 'ebony' : k === 'dudo' ? 'boxwood' : 'bone', cup = k === 'classic' ? 'black' : k === 'dudo' ? 'tan' : 'brown';
  const faces = k === 'classic' ? [6, 6, 3] : k === 'dudo' ? [1, 4, 4] : [1, 5, 5];
  return `<span class="garts ld"><img class="gcup" src="img/cup-${cup}.webp?v=${V}" alt="">` + faces.map((f, i) => `<img class="gdie g${i}" src="${src(f, m)}" alt="">`).join('') + `</span>`;
}
window.Dice = { img, die, rot, art, src };
})();
