/* =====================================================================
   上海 — the zodiac figures behind the stars of the 星座マップ (ユーザー 2026-11-14: 星座自体に星座の絵、ゆっくり表情を変えたりアニメーション)
   Each figure is drawn in its constellation's own box (x 0..100, y 0..64, the same as CON in shanghai.js) as soft glowing
   line art: a gentle body, a face whose eyes blink and whose expression slowly changes (smile ⇄ happy closed eyes ⇄ a little
   "o"), and one part that sways (a tail, the scales, the water …). All motion is CSS on SVG groups (cheap, no JS loop).
   window.ShanghaiZodiac(id, i) → SVG markup (a <g>); i (0..11) only staggers the timings.
   ===================================================================== */
(function () {
  'use strict';
  const r = n => Math.round(n * 100) / 100;
  // the face: two eyes (that blink), three expressions that take turns, rosy cheeks. s = size (eye gap ≈ 2.2·s).
  function face(x, y, s, d) {
    const g = 1.1 * s, e = .42 * s, m = .9 * s;
    return `<g class="zf" style="--d:${d}s">` +
      `<g class="zo"><ellipse class="zbl" cx="${r(x - g)}" cy="${r(y)}" rx="${r(e)}" ry="${r(e * 1.25)}"/><ellipse class="zbl" cx="${r(x + g)}" cy="${r(y)}" rx="${r(e)}" ry="${r(e * 1.25)}"/>` +
      `<path class="zm" d="M${r(x - m)} ${r(y + 1.3 * s)} Q${r(x)} ${r(y + 2.1 * s)} ${r(x + m)} ${r(y + 1.3 * s)}"/></g>` +
      `<g class="zh"><path class="zm" d="M${r(x - g - e)} ${r(y + .2 * s)} Q${r(x - g)} ${r(y - .8 * s)} ${r(x - g + e)} ${r(y + .2 * s)}M${r(x + g - e)} ${r(y + .2 * s)} Q${r(x + g)} ${r(y - .8 * s)} ${r(x + g + e)} ${r(y + .2 * s)}"/>` +
      `<path class="zm" d="M${r(x - m * 1.1)} ${r(y + 1.2 * s)} Q${r(x)} ${r(y + 2.5 * s)} ${r(x + m * 1.1)} ${r(y + 1.2 * s)}"/></g>` +
      `<g class="zw"><ellipse cx="${r(x - g)}" cy="${r(y)}" rx="${r(e)}" ry="${r(e * 1.25)}"/><ellipse cx="${r(x + g)}" cy="${r(y)}" rx="${r(e)}" ry="${r(e * 1.25)}"/><ellipse class="zmo" cx="${r(x)}" cy="${r(y + 1.6 * s)}" rx="${r(.42 * s)}" ry="${r(.52 * s)}"/></g>` +
      `<circle class="zc" cx="${r(x - g * 1.75)}" cy="${r(y + 1.1 * s)}" r="${r(.55 * s)}"/><circle class="zc" cx="${r(x + g * 1.75)}" cy="${r(y + 1.1 * s)}" r="${r(.55 * s)}"/></g>`;
  }
  const C = (x, y, rr) => `<circle cx="${r(x)}" cy="${r(y)}" r="${r(rr)}"/>`;
  const E = (x, y, rx, ry, rot) => `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(ry)}"${rot ? ` transform="rotate(${rot} ${r(x)} ${r(y)})"` : ''}/>`;
  const L = (d, cls) => `<path${cls ? ` class="${cls}"` : ''} d="${d}"/>`;
  const sway = (ox, oy, inner, amp) => `<g class="zs" style="transform-origin:${ox}px ${oy}px;--a:${amp || 4}deg">${inner}</g>`;
  // a fluffy cloud of circles (the ram's fleece, the lion's mane …)
  // (filled as one soft shape: solid circles in a group whose opacity is applied once, so the overlaps don't show)
  const puff = (cx, cy, rx, ry, n, rr) => `<g class="zp">${Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return C(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, rr); }).join('')}${E(cx, cy, rx, ry)}</g>`;

  const ART = {
    // おひつじ座: a fluffy ram walking right, its curled horn at the front
    aries: d => `<g class="zb">${puff(54, 44, 22, 9, 14, 6)}` +
      `${L('M38 52 L37 59M47 53 L47 60M61 53 L61 60M70 52 L71 59')}` +
      `${E(22, 40, 9, 8)}${L('M20 33 C12 28 8 36 14 38 C18 39 18 34 15 34', 'zfill0')}` +
      sway(76, 42, L('M76 42 C82 40 84 44 81 46'), 8) + face(23, 41, 1.6, d) + `</g>`,
    // おうし座: a round-faced bull, horns up, body behind to the lower right
    taurus: d => `<g class="zb">${E(76, 50, 17, 9)}${L('M66 57 L65 62M74 58 L74 63M84 58 L84 63M90 55 L92 61')}` +
      sway(92, 48, L('M92 48 C97 46 98 52 95 53'), 10) +
      `${C(54, 36, 11)}${L('M46 28 C40 22 40 14 46 10M62 28 C68 22 70 14 66 9', 'zfill0')}${E(54, 42, 6, 3.6)}${C(52, 42, .7)}${C(56, 42, .7)}` +
      face(54, 33, 1.7, d) + `</g>`,
    // ふたご座: two children side by side, holding hands in the middle
    gemini: d => `<g class="zb">${C(36, 13, 6)}${L('M33 19 Q27 38 24 58M36 19 Q38 38 34 58')}${L('M35 26 Q41 30 47 31')}` +
      `${C(58, 12, 6)}${L('M57 18 Q60 38 64 56M60 18 Q68 36 74 56')}${L('M58 25 Q53 30 47 31')}` +
      sway(36, 8, L('M31 9 Q36 4 41 9'), 6) + sway(58, 7, L('M53 8 Q58 3 63 8'), 6) +
      face(36, 13, 1.25, d) + face(58, 12, 1.25, d + 1.3) + `</g>`,
    // かに座: a round crab with two big claws raised
    cancer: d => `<g class="zb">${E(50, 36, 18, 11)}` +
      `${L('M34 40 L22 50 L18 58M36 44 L28 54M64 44 L72 54M66 40 L78 50 L84 58')}` +
      sway(36, 30, `${L('M36 30 Q28 22 26 16')}${E(24, 13, 5, 4, -20)}${L('M21 10 L24 13', 'zfill0')}`, 7) +
      sway(64, 30, `${L('M64 30 Q72 22 74 16')}${E(76, 13, 5, 4, 20)}${L('M79 10 L76 13', 'zfill0')}`, -7) +
      `${L('M45 27 L44 20M55 27 L56 20')}${C(44, 19, 1.4)}${C(56, 19, 1.4)}` + face(50, 34, 1.9, d) + `</g>`,
    // しし座: a lion with a big mane (left) and a long body, tail curling at the end
    leo: d => `<g class="zb">${E(64, 42, 24, 9.5)}${L('M48 50 L47 58M58 51 L58 59M72 51 L72 59M82 49 L84 57')}` +
      sway(88, 40, L('M88 40 Q96 36 95 30 Q94 26 90 28'), 8) +
      `${puff(24, 23, 11, 11, 14, 4.6)}${C(24, 24, 8)}` + face(24, 23, 1.7, d) + `</g>`,
    // おとめ座: a maiden with long hair, her dress flowing along the stars, holding a spike of wheat
    virgo: d => `<g class="zb">${C(14, 15, 6)}${L('M9 12 Q6 24 12 30M19 12 Q24 18 22 24', 'zfill0')}` +
      `${L('M16 21 Q34 26 52 30 Q70 36 86 52 Q66 54 52 46 Q36 38 18 28 Z')}` +
      sway(44, 50, `${L('M40 38 L44 56')}${E(45, 57, 1.6, 3, 10)}${E(42, 54, 1.4, 2.6, -20)}${E(47, 53, 1.4, 2.6, 30)}`, 6) +
      face(14, 15, 1.25, d) + `</g>`,
    // てんびん座: the scales themselves, a little face on the round top, the beam gently tipping
    libra: d => `<g class="zb">${L('M50 12 L50 52M42 56 Q50 50 58 56 Z')}${C(50, 8, 5)}` +
      sway(50, 22, `${L('M26 22 L74 22')}${L('M26 22 L20 52M26 22 L32 52M74 22 L68 52M74 22 L80 52')}${L('M16 52 Q26 60 36 52 Z')}${L('M64 52 Q74 60 84 52 Z')}`, 5) +
      face(50, 8, 1.05, d) + `</g>`,
    // さそり座: a scorpion: head and claws up at the right, the tail curling down to the stinger at the left
    scorpius: d => `<g class="zb">${E(84, 12, 6.5, 5.5)}${L('M88 8 Q94 2 98 4M89 13 Q96 12 98 8')}` +
      `<g class="zp">${C(80, 17, 3.6)}${C(73, 22, 3.4)}${C(66, 27, 3.2)}${C(58, 32, 3)}${C(50, 37, 2.9)}${C(43, 44, 2.8)}${C(37, 50, 2.7)}</g>${L('M80 17 Q66 26 52 36 Q42 46 34 54', 'zfill0')}` +
      sway(34, 54, `<g class="zp">${C(29, 55, 2.6)}${C(22, 56, 2.4)}</g>${L('M17 55 Q10 54 10 47 Q11 43 14 45', 'zfill0')}`, 6) +
      face(84, 11, 1.2, d) + `</g>`,
    // いて座: a centaur archer drawing his bow to the right
    sagittarius: d => `<g class="zb">${E(40, 32, 20, 10)}${L('M26 40 L24 50M34 41 L34 51M48 41 L48 51M56 39 L58 49')}` +
      sway(20, 30, L('M20 30 Q12 28 10 36'), 10) +
      `${L('M54 26 Q58 18 60 14')}${C(60, 9, 5)}` +
      `${L('M70 12 Q78 24 70 36')}${L('M60 18 L86 30', 'zfill0')}${L('M83 27 L87 30 L83 33', 'zfill0')}` +
      face(60, 9, 1.05, d) + `</g>`,
    // やぎ座: a sea-goat: a goat's head with curly horns, its body turning into a fish's tail
    capricornus: d => `<g class="zb">${C(18, 18, 7)}${L('M14 12 C10 4 18 2 18 8M22 11 C24 3 31 5 27 10', 'zfill0')}` +
      `${L('M24 23 Q42 26 58 40 Q70 48 80 44 Q72 34 56 30 Q40 24 24 23 Z')}${L('M20 25 L18 33M26 25 L26 33')}` +
      sway(80, 44, L('M80 44 Q88 38 92 30 Q90 40 94 44 Q86 46 80 44 Z'), 7) +
      face(18, 18, 1.3, d) + `</g>`,
    // みずがめ座: a happy water jar pouring a wavy stream down along the stars
    aquarius: d => `<g class="zb">${L('M24 8 L44 8 Q50 16 46 26 Q40 34 30 32 Q20 28 22 16 Z')}${L('M22 8 L46 8')}` +
      sway(46, 18, `${L('M46 16 Q54 22 54 30 Q52 40 60 44 Q68 48 66 54 Q74 60 86 52', 'zw0')}${L('M50 20 Q58 28 57 36 Q56 44 64 48 Q72 52 72 58', 'zw0')}`, 3) +
      face(34, 18, 1.5, d) + `</g>`,
    // うお座: two fish tied together by a ribbon that dips through the middle
    pisces: d => `<g class="zb">${L('M14 16 Q32 40 50 47 Q68 40 86 16', 'zfill0')}` +
      sway(14, 14, `${E(14, 14, 8, 5, 30)}${L('M7 9 L2 4 L3 12 Z')}`, 6) +
      sway(86, 14, `${E(86, 14, 8, 5, -30)}${L('M93 9 L98 4 L97 12 Z')}`, -6) +
      face(16, 15, 1, d) + face(84, 15, 1, d + 1.7) + `</g>`,
  };
  window.ShanghaiZodiac = (id, i) => { const f = ART[id]; return f ? f(-(i * 1.9) % 13) : ''; };
  // the shared look (the map's CSS adds this once)
  window.ShanghaiZodiac.css = `
.shmap .fig{fill:rgba(170,190,255,.07);stroke:rgba(196,212,255,.5);stroke-width:.45;stroke-linecap:round;stroke-linejoin:round;transition:fill .6s,stroke .6s}
.shmap .fig.lit{fill:rgba(255,214,106,.1);stroke:rgba(255,226,150,.72)}
.shmap .fig .zp{fill:#c8d6ff;stroke:none;opacity:.16}.shmap .fig.lit .zp{fill:#ffe2a0;opacity:.2}
.shmap .fig .zfill0,.shmap .fig .zw0{fill:none}
.shmap .fig .zw0{stroke:rgba(140,210,255,.6);stroke-dasharray:2 1.6;animation:shzw 3s linear infinite}
.shmap .fig .zb{animation:shzbob 7s ease-in-out infinite;animation-delay:var(--dl,0s)}
.shmap .fig .zs{animation:shzsway 5.5s ease-in-out infinite;transform-box:view-box}
.shmap .fig .zf{stroke:none}
.shmap .fig .zf ellipse,.shmap .fig .zf .zbl{fill:rgba(236,242,255,.9)}
.shmap .fig .zm{fill:none;stroke:rgba(236,242,255,.85);stroke-width:.4}
.shmap .fig .zmo{fill:rgba(236,242,255,.85)}
.shmap .fig .zc{fill:rgba(255,150,190,.35)}
.shmap .fig .zo{animation:shzo 15s ease-in-out infinite;animation-delay:var(--d)}
.shmap .fig .zh{opacity:0;animation:shzh 15s ease-in-out infinite;animation-delay:var(--d)}
.shmap .fig .zw{opacity:0;animation:shzw2 15s ease-in-out infinite;animation-delay:var(--d)}
.shmap .fig .zbl{transform-box:fill-box;transform-origin:center;animation:shzblink 4.6s infinite;animation-delay:var(--d)}
@keyframes shzbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.9px)}}
@keyframes shzsway{0%,100%{transform:rotate(calc(var(--a) * -1))}50%{transform:rotate(var(--a))}}
@keyframes shzblink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes shzo{0%,38%{opacity:1}44%,62%{opacity:0}68%,100%{opacity:1}}
@keyframes shzh{0%,38%{opacity:0}44%,62%{opacity:1}68%,100%{opacity:0}}
@keyframes shzw2{0%,74%{opacity:0}79%,92%{opacity:1}97%,100%{opacity:0}}
@keyframes shzw{to{stroke-dashoffset:-7.2}}
`;
})();
