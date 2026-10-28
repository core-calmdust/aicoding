/* ソリティア — court cards (J・Q・K) drawn as SVG in the classic double-headed style (solitaire/court.js)
   Original drawings: a half-length figure (crown / hat, face, robe with patterned trim, the item held), mirrored
   at the centre line like traditional playing cards. Court.svg(rank 11-13, suit 0-3) → '<svg …>' (cached). */
(function () {
'use strict';
const R = '#c0232e', B = '#24448f', Y = '#e6ad35', K = '#1f1f26', SK = '#f6dfc3', W = '#fffaf0', BR = '#7a4a26', SV = '#d9dde3';
const cache = {};
const n = v => +v.toFixed(2);
// small repeating ornaments along a band
function dots(x0, y0, x1, y1, k, r, fill) { let s = ''; for (let i = 0; i <= k; i++) { const t = i / k; s += `<circle cx="${n(x0 + (x1 - x0) * t)}" cy="${n(y0 + (y1 - y0) * t)}" r="${r}" fill="${fill}"/>`; } return s; }
function diamonds(x, y0, y1, k, w, fill) { let s = ''; for (let i = 0; i < k; i++) { const y = y0 + (y1 - y0) * (i + .5) / k, h = (y1 - y0) / k * .42; s += `<path d="M${x} ${n(y - h)}L${n(x + w)} ${n(y)}L${x} ${n(y + h)}L${n(x - w)} ${n(y)}Z" fill="${fill}"/>`; } return s; }
function half(r, s) {
  const robe = (r + s) % 2 ? R : B, trim = robe === R ? B : R, alt = s % 2 ? Y : W;
  let g = '';
  // robe (shoulders to the centre line)
  g += `<path d="M3 50V35.5Q3 30.6 8.6 29.4L18 27.4H38L47.4 29.4Q53 30.6 53 35.5V50Z" fill="${robe}" stroke="${K}" stroke-width=".55"/>`;
  // sleeves with patterned cuffs, and the borders of the cloak
  g += `<path d="M4.6 50V36Q4.6 32.4 9 31.2L12.4 30.6V50Z" fill="${alt}" stroke="${K}" stroke-width=".4"/><path d="M51.4 50V36Q51.4 32.4 47 31.2L43.6 30.6V50Z" fill="${alt}" stroke="${K}" stroke-width=".4"/>`;
  g += dots(8.5, 48.5, 8.5, 34.5, 6, .6, trim) + dots(47.5, 48.5, 47.5, 34.5, 6, .6, trim);
  g += `<path d="M12.4 30.6Q15 40 13.6 50M43.6 30.6Q41 40 42.4 50" stroke="${K}" stroke-width=".35" fill="none" opacity=".55"/>`;
  g += `<path d="M14.6 32L19.4 31M14.8 37L20 36.4M14.6 42L20.2 41.8M14.2 47L20.4 47M41.4 32L36.6 31M41.2 37L36 36.4M41.4 42L35.8 41.8M41.8 47L35.6 47" stroke="${alt}" stroke-width=".9" opacity=".75"/>`;
  // centre tunic with lozenges
  g += `<path d="M21 50L22.4 30.5H33.6L35 50Z" fill="${Y}" stroke="${K}" stroke-width=".45"/>`;
  g += diamonds(28, 32, 49.5, 4, 2.6, trim);
  g += `<path d="M24.6 30.5V50M31.4 30.5V50" stroke="${K}" stroke-width=".3" opacity=".6"/>`;
  // ermine edging (king) / ruffled collar (queen) / plain collar (jack)
  if (r === 13) { g += `<path d="M14 29Q28 37 42 29L41 27Q28 34 15 27Z" fill="${W}" stroke="${K}" stroke-width=".4"/>`; for (let i = 0; i < 6; i++) { const x = 17.5 + i * 4.2, y = 29.6 + Math.sin(i / 5 * Math.PI) * 2.6; g += `<path d="M${n(x)} ${n(y)}l.5 1.3l.5-1.3z" fill="${K}"/>`; } }
  else if (r === 12) { g += `<path d="M15.5 28.4Q28 37.5 40.5 28.4Q28 33.6 15.5 28.4Z" fill="${W}" stroke="${K}" stroke-width=".4"/>`; for (let i = 0; i < 9; i++) g += `<circle cx="${n(17.2 + i * 2.7)}" cy="${n(29.3 + Math.sin(i / 8 * Math.PI) * 3.1)}" r="1.15" fill="${W}" stroke="${K}" stroke-width=".3"/>`; }
  else g += `<path d="M17 28.6Q28 35 39 28.6L38 27.2Q28 32.4 18 27.2Z" fill="${Y}" stroke="${K}" stroke-width=".4"/>`;
  // neck & head
  g += `<rect x="25" y="23.5" width="6" height="5.5" fill="${SK}" stroke="${K}" stroke-width=".35"/>`;
  // hair behind the face
  if (r === 12) g += `<path d="M20.4 12.5Q17.6 22 20 31L24.5 30Q22.4 22 23.4 13.5ZM35.6 12.5Q38.4 22 36 31L31.5 30Q33.6 22 32.6 13.5Z" fill="${Y}" stroke="${K}" stroke-width=".4"/>`;
  if (r === 11) g += `<path d="M20.6 13Q19 19 21.6 23.2L23.6 21.5Q22.4 17 23.4 13.4ZM35.4 13Q37 19 34.4 23.2L32.4 21.5Q33.6 17 32.6 13.4Z" fill="${BR}" stroke="${K}" stroke-width=".35"/>`;
  g += `<ellipse cx="28" cy="17.6" rx="6.3" ry="7.6" fill="${SK}" stroke="${K}" stroke-width=".5"/>`;
  // face
  g += `<path d="M24.6 15.4q1.2-.8 2.3 0M29.1 15.4q1.2-.8 2.3 0" stroke="${K}" stroke-width=".45" fill="none"/>`;
  g += `<ellipse cx="25.8" cy="17" rx=".75" ry=".5" fill="${K}"/><ellipse cx="30.2" cy="17" rx=".75" ry=".5" fill="${K}"/>`;
  g += `<path d="M28 17.4q-.9 2.4.4 2.9" stroke="${K}" stroke-width=".4" fill="none"/>`;
  g += `<circle cx="24.6" cy="20.2" r="1.1" fill="${R}" opacity=".18"/><circle cx="31.4" cy="20.2" r="1.1" fill="${R}" opacity=".18"/>`;
  if (r === 13) {   // beard and moustache
    g += `<path d="M21.9 18.6Q22 27.8 28 29.6Q34 27.8 34.1 18.6Q33 23.6 28 24Q23 23.6 21.9 18.6Z" fill="${Y}" stroke="${K}" stroke-width=".4"/>`;
    g += `<path d="M24.4 26q3.6 2.4 7.2 0M25.6 23.2q2.4 1 4.8 0" stroke="${K}" stroke-width=".3" fill="none" opacity=".7"/>`;
    g += `<path d="M24.8 21.6q3.2-1.6 3.2-.2q0-1.4 3.2.2q-1.6 1.2-3.2.4q-1.6.8-3.2-.4Z" fill="${Y}" stroke="${K}" stroke-width=".35"/>`;
  } else g += `<path d="M26.4 22.2q1.6 1 3.2 0" stroke="${R}" stroke-width=".55" fill="none" stroke-linecap="round"/>`;
  // headwear
  if (r === 13) {
    g += `<path d="M20.4 12.2L19.8 4.6L23.6 8.4L28 3L32.4 8.4L36.2 4.6L35.6 12.2Z" fill="${Y}" stroke="${K}" stroke-width=".5" stroke-linejoin="round"/>`;
    g += `<rect x="20.2" y="10.4" width="15.6" height="2.4" fill="${trim}" stroke="${K}" stroke-width=".4"/>`;
    g += `<circle cx="28" cy="3" r="1" fill="${R}" stroke="${K}" stroke-width=".3"/><circle cx="19.8" cy="4.6" r=".8" fill="${W}" stroke="${K}" stroke-width=".3"/><circle cx="36.2" cy="4.6" r=".8" fill="${W}" stroke="${K}" stroke-width=".3"/>`;
    g += `<circle cx="24" cy="11.6" r=".6" fill="${W}"/><circle cx="28" cy="11.6" r=".6" fill="${Y}"/><circle cx="32" cy="11.6" r=".6" fill="${W}"/>`;
  } else if (r === 12) {
    g += `<path d="M21.6 11.4L21.4 6.6L24.6 9L28 5.2L31.4 9L34.6 6.6L34.4 11.4Z" fill="${Y}" stroke="${K}" stroke-width=".45" stroke-linejoin="round"/>`;
    g += `<rect x="21.4" y="10" width="13.2" height="2" fill="${trim}" stroke="${K}" stroke-width=".35"/>`;
    for (let i = 0; i < 5; i++) g += `<circle cx="${n(22.8 + i * 2.6)}" cy="11" r=".45" fill="${W}"/>`;
    g += `<circle cx="28" cy="5.2" r=".8" fill="${W}" stroke="${K}" stroke-width=".3"/>`;
  } else {
    g += `<path d="M20 12.6Q20.4 5.2 28 5Q36.4 5.2 36.2 12.6Z" fill="${trim}" stroke="${K}" stroke-width=".45"/>`;
    g += `<path d="M19.4 12.8Q28 10.2 36.8 12.8L36.6 14Q28 11.6 19.6 14Z" fill="${Y}" stroke="${K}" stroke-width=".4"/>`;
    g += `<path d="M33.5 6.8Q41 1.5 45.5 4.6Q40 4.6 35.2 9.4" fill="${W}" stroke="${K}" stroke-width=".4"/>`;
    g += `<path d="M35.6 7.6Q40 4.4 44 5" stroke="${K}" stroke-width=".3" fill="none" opacity=".6"/>`;
  }
  // the item held
  const hand = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="2" ry="1.7" fill="${SK}" stroke="${K}" stroke-width=".4"/>`;
  if (r === 13) {
    if (s === 1) g += `<path d="M44 46L46 6" stroke="${SV}" stroke-width="2" stroke-linecap="round"/><path d="M44 46L46 6" stroke="${K}" stroke-width=".35" opacity=".6"/><path d="M41.6 40.6L47.6 41.2" stroke="${Y}" stroke-width="1.6" stroke-linecap="round"/>` + hand(44.4, 43.4);
    else if (s === 2) g += `<path d="M45 47V8" stroke="${BR}" stroke-width="1.5"/><path d="M45 9Q51.5 10 52 16Q51 20.5 45 21Z" fill="${SV}" stroke="${K}" stroke-width=".45"/>` + hand(45, 41);
    else if (s === 3) g += `<circle cx="44.5" cy="33.6" r="4.2" fill="${Y}" stroke="${K}" stroke-width=".45"/><path d="M40.3 33.6H48.7M44.5 29.4V27.2M43.4 28.2H45.6" stroke="${K}" stroke-width=".45"/>` + hand(44.5, 38.6);
    else g += `<path d="M45 47V12" stroke="${Y}" stroke-width="1.6"/><path d="M45 47V12" stroke="${K}" stroke-width=".3" opacity=".5"/><circle cx="45" cy="10" r="2.6" fill="${Y}" stroke="${K}" stroke-width=".4"/><path d="M45 7.4V5.6M44 6.4H46" stroke="${K}" stroke-width=".4"/>` + hand(45, 40);
  } else if (r === 12) {
    g += `<path d="M11.4 40Q10.4 33 12 27" stroke="#2f7a3a" stroke-width=".9" fill="none"/><path d="M11 34.4Q8 33 7.6 30.6Q10.4 31.6 11 34.4Z" fill="#3f9a4a"/>`;
    const pc = s % 2 ? R : B; let f = '';
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; f += `<ellipse cx="${n(12 + Math.cos(a) * 2.2)}" cy="${n(24.6 + Math.sin(a) * 2.2)}" rx="1.7" ry="1.2" transform="rotate(${n(a * 180 / Math.PI)} ${n(12 + Math.cos(a) * 2.2)} ${n(24.6 + Math.sin(a) * 2.2)})" fill="${pc}" stroke="${K}" stroke-width=".3"/>`; }
    g += f + `<circle cx="12" cy="24.6" r="1.2" fill="${Y}" stroke="${K}" stroke-width=".3"/>` + hand(11.6, 40.6);
  } else {
    if (s === 0 || s === 3) g += `<path d="M45.5 48V9" stroke="${BR}" stroke-width="1.3"/><path d="M45.5 4L47.2 9.4H43.8Z" fill="${SV}" stroke="${K}" stroke-width=".4"/><path d="M45.5 11Q51.6 11.4 52 16.4Q49 14.6 45.5 15.4ZM45.5 11Q41.4 12.6 41 15.6Q43 14.4 45.5 15.4Z" fill="${SV}" stroke="${K}" stroke-width=".4"/>` + hand(45.5, 41.4);
    else g += `<path d="M44.6 44Q50 30 46 16" stroke="#2f7a3a" stroke-width=".9" fill="none"/><path d="M46 16Q52.6 22 47.6 30Q45 23 46 16Z" fill="#3f9a4a" stroke="${K}" stroke-width=".35"/><path d="M46.2 18Q48 24 47.4 29" stroke="${K}" stroke-width=".25" fill="none" opacity=".6"/>` + hand(44.6, 43);
  }
  // suit sign in the corner of the frame
  g += `<g transform="translate(3.2 3.2) scale(.38)"><use href="#s${s}" fill="currentColor"/></g>`;
  return g;
}
function svg(r, s) {
  const k = r + ':' + s; if (cache[k]) return cache[k];
  const h = half(r, s);
  const out = `<svg class="court" viewBox="0 0 56 100"><rect x=".5" y=".5" width="55" height="99" fill="${W}"/>` +
    `<g clip-path="url(#ctTop)">${h}</g><g clip-path="url(#ctTop)" transform="rotate(180 28 50)">${h}</g>` +
    `<path d="M1 50H55" stroke="${K}" stroke-width=".6"/><rect x=".5" y=".5" width="55" height="99" fill="none" stroke="#a8873f" stroke-width="1"/><rect x="2" y="2" width="52" height="96" fill="none" stroke="#a8873f" stroke-width=".35" opacity=".7"/></svg>`;
  return (cache[k] = out);
}
window.Court = { svg };
})();
