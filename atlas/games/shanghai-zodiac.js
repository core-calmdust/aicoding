/* =====================================================================
   上海 — the zodiac figures behind the stars of the 星座マップ (2026-11-14, ユーザー: 星座に合わせた伝統絵みたいなもの、
   図形はワイヤーフレームみたいな感じでもいい — like a star atlas's figures). Each figure is a silhouette in its
   constellation's own box (x 0..100, y 0..64, as CON in shanghai.js), drawn as a low-poly wireframe: the outline is
   resampled, filled with a few inner points, Delaunay-triangulated, and the triangles inside it kept. Pale blue lines
   with a faint fill, a brighter outline, and a few details (horns, eyes, a bow …). Motion is CSS only: the figure
   breathes, a part sways, and here and there a facet softly glows and fades (a twinkling mesh).
   window.ShanghaiZodiac(id, i) → SVG markup (a <g>), cached per id.   window.ShanghaiZodiac.css → the shared styles.
   ===================================================================== */
(function () {
  'use strict';
  const R2 = n => Math.round(n * 10) / 10;

  /* ---------- geometry helpers ---------- */
  // a path of absolute M / L / C / Q (Z closes) → points along it
  function pathPts(d, step) {
    const tk = d.match(/[MLCQZ]|-?\d*\.?\d+/g), out = []; let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = 'M';
    const num = () => +tk[i++];
    const seg = (f, len) => { const n = Math.max(2, Math.ceil(len / step)); for (let k = 1; k <= n; k++) out.push(f(k / n)); };
    while (i < tk.length) {
      if (/[MLCQZ]/.test(tk[i])) cmd = tk[i++];
      if (cmd === 'Z') { cx = sx; cy = sy; cmd = 'M'; continue; }
      if (cmd === 'M') { cx = sx = num(); cy = sy = num(); out.push([cx, cy]); cmd = 'L'; }
      else if (cmd === 'L') { const x = num(), y = num(), x0 = cx, y0 = cy; seg(t => [x0 + (x - x0) * t, y0 + (y - y0) * t], Math.hypot(x - x0, y - y0)); cx = x; cy = y; }
      else if (cmd === 'Q') { const ax = num(), ay = num(), x = num(), y = num(), x0 = cx, y0 = cy;
        seg(t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * ax + t * t * x, u * u * y0 + 2 * u * t * ay + t * t * y]; }, Math.hypot(ax - x0, ay - y0) + Math.hypot(x - ax, y - ay)); cx = x; cy = y; }
      else if (cmd === 'C') { const ax = num(), ay = num(), bx = num(), by = num(), x = num(), y = num(), x0 = cx, y0 = cy;
        seg(t => { const u = 1 - t; return [u * u * u * x0 + 3 * u * u * t * ax + 3 * u * t * t * bx + t * t * t * x, u * u * u * y0 + 3 * u * u * t * ay + 3 * u * t * t * by + t * t * t * y]; },
          Math.hypot(ax - x0, ay - y0) + Math.hypot(bx - ax, by - ay) + Math.hypot(x - bx, y - by)); cx = x; cy = y; }
    }
    // (a closed outline ends where it began: drop the repeated last point)
    if (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) < .01) out.pop();
    return out;
  }
  const ell = (cx, cy, rx, ry, n, rot) => { const c = Math.cos(rot || 0), s = Math.sin(rot || 0); return Array.from({ length: n || 18 }, (_, k) => { const a = k / (n || 18) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * c - y * s, cy + x * s + y * c]; }); };
  // a tapered tube along a polyline (the scorpion's tail, the sea-goat's body …) → its outline
  function tube(Pp, w0, w1) {
    const L = [], Rr = [];
    Pp.forEach((p, k) => { const a = Pp[Math.max(0, k - 1)], b = Pp[Math.min(Pp.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * k / (Pp.length - 1)) / 2;
      L.push([p[0] - dy / l * w, p[1] + dx / l * w]); Rr.push([p[0] + dy / l * w, p[1] - dx / l * w]); });
    return L.concat(Rr.reverse());
  }
  // a human figure (standing, arms at the sides) from its head to its feet; wd = how broad. Template: height 100, head on top.
  const HUMAN = [[-3, 13], [-12, 18], [-15, 34], [-17, 52], [-15, 57], [-12, 52], [-10, 36], [-9, 46], [-12, 58], [-10, 80], [-8, 96], [-12, 100], [-2, 100], [-3, 80], [0, 62]];
  function human(head, feet, wd) {
    const pts = HUMAN.concat(HUMAN.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
    const dx = feet[0] - head[0], dy = feet[1] - head[1], l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, k = l / 100;
    const map = ([x, y]) => [head[0] + (-uy * x * wd + ux * y) * k, head[1] + (ux * x * wd + uy * y) * k];
    const hc = map([0, 6]), hr = 6.5 * k;
    return { body: pts.map(map), head: ell(hc[0], hc[1], hr, hr, 14), hc, map, y: pts };
  }
  const inside = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
  // Delaunay (Bowyer–Watson) of the resampled outline + a few inner points; only the triangles inside the outline
  function mesh(poly, gap, seed) {
    let s = seed || 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const B = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap)); for (let k = 0; k < n; k++) B.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); }
    const xs = B.map(p => p[0]), ys = B.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const Pt = B.slice(), g = gap * 1.6;
    for (let y = y0 + g / 2; y < y1; y += g) for (let x = x0 + g / 2; x < x1; x += g) { const p = [x + (rnd() - .5) * g * .6, y + (rnd() - .5) * g * .6]; if (inside(p, poly) && B.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > gap * .7)) Pt.push(p); }
    const big = 1e4, V = Pt.concat([[-big, -big], [big * 2, -big], [-big, big * 2]]), n = Pt.length;
    const circ = t => { const [a, b, c] = t.map(k => V[k]), d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) || 1e-9;
      const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d,
        uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d; return [ux, uy, (a[0] - ux) ** 2 + (a[1] - uy) ** 2]; };
    let T = [[n, n + 1, n + 2]], C = T.map(circ);
    for (let i = 0; i < n; i++) {
      const p = V[i], bad = [], keep = [], kc = [];
      T.forEach((t, k) => { const c = C[k]; if ((p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 < c[2]) bad.push(t); else { keep.push(t); kc.push(c); } });
      const edge = new Map(); bad.forEach(t => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]].forEach(([a, b]) => { const k = a < b ? a + ',' + b : b + ',' + a; edge.set(k, edge.has(k) ? null : [a, b]); }));
      edge.forEach(e => { if (e) { const t = [e[0], e[1], i]; keep.push(t); kc.push(circ(t)); } });
      T = keep; C = kc;
    }
    return T.filter(t => t.every(k => k < n)).map(t => t.map(k => Pt[k])).filter(t => inside([(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3], poly));
  }

  /* ---------- drawing ---------- */
  let SEED = 1;
  function part(poly, gap) {
    const T = mesh(poly, gap || 4.2, SEED++ * 7919), seen = new Set(); let edges = '', glow = '';
    T.forEach((t, k) => {
      [[0, 1], [1, 2], [2, 0]].forEach(([a, b]) => { const p = t[a], q = t[b], key = [R2(p[0]), R2(p[1]), R2(q[0]), R2(q[1])], k1 = key.join(), k2 = [key[2], key[3], key[0], key[1]].join(); if (seen.has(k1) || seen.has(k2)) return; seen.add(k1); edges += `M${key[0]} ${key[1]}L${key[2]} ${key[3]}`; });
      if (k % 5 === 2) glow += `<path class="zt" style="animation-delay:${-((k * 1.37) % 9).toFixed(2)}s" d="M${R2(t[0][0])} ${R2(t[0][1])}L${R2(t[1][0])} ${R2(t[1][1])}L${R2(t[2][0])} ${R2(t[2][1])}Z"/>`;
    });
    const outline = 'M' + poly.map(p => R2(p[0]) + ' ' + R2(p[1])).join('L') + 'Z';
    return `<g class="zpart"><path class="zfil" d="${outline}"/>${glow}<path class="zed" d="${edges}"/><path class="zol" d="${outline}"/></g>`;
  }
  const line = (d, cls) => `<path class="zdt${cls ? ' ' + cls : ''}" d="${d}"/>`;
  const dot = (x, y, r) => `<circle class="zey" cx="${x}" cy="${y}" r="${r || .7}"/>`;
  const sway = (ox, oy, inner, amp, dur) => `<g class="zs" style="transform-origin:${ox}px ${oy}px;--a:${amp || 3}deg;--sd:${dur || 6}s">${inner}</g>`;
  const P = (d, st) => pathPts(d, st || 2.4);

  const ART = {
    // おひつじ座: a ram walking left, its curled horn on the head, fleece along the back
    aries: () => part(P('M22 46 C18 44 15 42 13 40 C9 41 6 40 5 37 C4 34 6 31 9 30 C12 28 16 28 19 30 C24 30 28 31 32 31 C44 28 60 28 72 32 C82 34 88 36 90 40 C92 42 92 46 89 48 C88 51 87 53 86 55 L87 62 L84 62 L82 56 C78 56 74 56 70 55 L70 62 L67 62 L66 55 C56 56 44 56 34 55 L34 62 L31 62 L30 54 C28 54 26 53 25 52 L25 62 L22 62 L21 50 C21 48 22 47 22 46 Z')) +
      line('M18 31 C21 25 28 26 28 32 C28 37 22 38 21 34 C20 31 24 31 24 33') + line('M40 33 Q44 30 48 33 Q52 30 56 33 Q60 30 64 33 Q68 30 72 34', 'zsoft') + dot(10, 34) +
      sway(90, 42, line('M90 42 C94 41 96 44 93 47'), 6),
    // おうし座: the front half of a charging bull (as the old star atlases show it), head lowered, horns up
    taurus: () => part(P('M44 40 C42 34 44 29 48 27 C52 25 56 26 60 29 C66 24 72 21 80 22 C88 23 94 28 97 36 C98 42 96 46 92 47 L94 56 L91 57 L86 48 C82 48 77 48 73 47 L76 55 L73 56 L68 47 C64 46 60 45 57 45 C55 48 51 49 47 47 C44 46 43 43 44 40 Z')) +
      line('M50 27 C47 20 50 12 57 9') + line('M57 27 C62 19 68 14 73 10') + line('M58 28 L64 25 L60 31') + dot(50, 33) + line('M46 44 Q48 46 50 45', 'zsoft') +
      line('M97 36 Q99 40 97 44', 'zsoft'),
    // ふたご座: the twins standing side by side, leaning together
    gemini: () => { const a = human([37, 3], [26, 60], 1.05), b = human([58, 3], [68, 60], 1.05);
      return part(a.body, 3.4) + part(a.head, 2.6) + part(b.body, 3.4) + part(b.head, 2.6) + line('M42 22 Q47 26 53 22', 'zsoft') +
        sway(58, 3, line('M53 1 Q58 -3 63 1'), 5) + sway(37, 3, line('M32 1 Q37 -3 42 1'), 5); },
    // かに座: a crab seen from above, claws raised, legs spread
    cancer: () => part(ell(50, 38, 17, 11, 26)) +
      sway(36, 30, part(P('M36 30 Q30 24 26 20 C20 18 18 12 22 9 C25 7 28 10 27 13 C30 11 33 13 31 17 C33 21 36 24 39 28 Z'), 2.8), 5, 5) +
      sway(64, 30, part(P('M64 30 Q70 24 74 20 C80 18 82 12 78 9 C75 7 72 10 73 13 C70 11 67 13 69 17 C67 21 64 24 61 28 Z'), 2.8), -5, 5) +
      line('M34 40 L22 48 L18 57M35 44 L26 53M37 47 L31 58M66 40 L78 48 L84 57M65 44 L74 53M63 47 L69 58') + line('M45 28 L44 22M55 28 L56 22') + dot(44, 21) + dot(56, 21),
    // しし座: a lion walking left, the great mane round its head, the tail curling up behind
    leo: () => part(P('M37 22 C46 27 60 30 74 30 C84 30 90 34 92 40 C93 45 91 49 89 53 L90 62 L86 62 L84 54 C77 55 70 55 66 54 L66 62 L62 62 L61 53 C52 53 46 52 41 51 L41 62 L37 62 L35 49 C32 47 31 44 31 41 Z')) +
      part(P('M11 22 C10 13 17 8 24 8 C32 8 38 14 38 22 C38 30 34 37 26 39 C20 40 13 36 11 30 C8 30 8 25 11 22 Z'), 3.2) +
      line('M16 22 C15 18 18 16 21 17') + dot(17, 21) + line('M12 27 Q15 29 18 27', 'zsoft') +
      sway(92, 40, line('M92 40 C97 37 99 31 96 27 C95 25 97 23 99 24'), 7, 7),
    // おとめ座: a winged maiden lying along the stars, a spike of wheat in her hand
    virgo: () => { const h = human([10, 13], [88, 50], 1.15);
      return part(h.body, 3.6) + part(h.head, 2.6) + part(P('M30 22 C34 10 46 4 56 6 C50 10 46 16 44 24 C40 22 34 22 30 22 Z'), 3) +
        sway(46, 54, line('M42 40 L46 58') + line('M45 52 L42 49M46 55 L43 52M45 52 L48 49M46 55 L49 52', 'zsoft'), 6); },
    // てんびん座: the scales: a stand, the beam (gently tipping), two pans on chains
    libra: () => part(P('M47 12 L53 12 L52 50 L60 56 L40 56 L48 50 Z'), 3) + part(ell(50, 8, 4, 4, 12), 2.4) +
      sway(50, 22, part(P('M24 21 L76 21 L76 24 L24 24 Z'), 3) + line('M26 23 L18 50M26 23 L34 50M74 23 L66 50M74 23 L82 50') +
        part(P('M14 50 L38 50 C36 57 30 60 26 60 C21 60 16 57 14 50 Z'), 3) + part(P('M62 50 L86 50 C84 57 79 60 74 60 C70 60 64 57 62 50 Z'), 3), 4, 7),
    // さそり座: a scorpion: head and claws up at the right, its tail of segments curling down to the stinger at the left
    scorpius: () => part(tube(P('M88 8 Q80 18 70 25 Q58 32 48 39 Q40 47 32 54 Q24 58 17 56'), 10, 4), 3.2) +
      part(P('M88 8 C90 4 94 2 97 4 C99 6 98 10 95 10 C96 7 93 6 91 8 Z'), 2) + part(P('M90 12 C94 12 98 14 98 18 C97 20 94 19 93 17 C95 17 95 15 92 15 Z'), 2) +
      sway(17, 56, line('M17 56 C11 56 8 51 10 46 C11 44 13 44 14 46'), 8, 5) + dot(85, 10) + dot(88, 12),
    // いて座: a centaur archer drawing his bow toward the right
    sagittarius: () => { const h = human([60, 4], [56, 70], 1.2), top = h.y.map((p, k) => [p, h.body[k]]).filter(([p]) => p[1] < 50).map(([, q]) => q);
      return part(P('M24 28 C30 23 44 22 56 26 C60 28 61 32 59 36 C60 40 58 44 56 46 L57 56 L54 56 L52 47 C46 48 38 48 32 47 L31 56 L28 56 L27 45 C23 43 21 38 22 33 C20 35 16 38 12 37 C16 34 20 31 24 28 Z'), 3.6) +
        part(top, 3) + part(h.head, 2.4) +
        line('M70 8 Q80 22 70 38') + line('M70 8 L64 22 L70 38', 'zsoft') + line('M58 22 L88 31') + line('M85 28 L89 31 L85 34'); },
    // やぎ座: a sea-goat: a goat's head and forelegs, its body ending in a curling fish tail
    capricornus: () => part(tube(P('M24 24 Q40 28 52 36 Q64 44 76 46 Q86 46 88 40'), 15, 4), 3.4) +
      part(P('M10 14 C10 10 14 8 18 9 C22 10 25 14 25 19 C25 24 22 27 18 27 C14 27 11 24 10 21 C8 21 6 19 7 17 C8 16 9 15 10 14 Z'), 2.6) +
      line('M14 10 C10 3 17 1 18 6M19 10 C22 3 29 4 26 9') + dot(16, 16) + line('M24 30 L20 40 L22 42M30 32 L28 42 L30 44') +
      sway(88, 40, part(P('M88 40 C90 34 94 30 98 30 C95 34 95 38 98 42 C94 42 90 42 88 40 Z'), 2.4), 8, 6),
    // みずがめ座: the water-bearer tipping his urn; the water runs down along the stars
    aquarius: () => { const h = human([12, 6], [22, 62], 1.1);
      return part(h.body, 3.4) + part(h.head, 2.4) + part(P('M28 12 L44 8 C48 12 48 20 44 26 C38 30 30 28 28 22 Z'), 2.6) +
        sway(44, 20, line('M44 18 Q54 22 56 30 Q58 40 64 44 Q70 48 70 54 Q76 58 86 52', 'zwave') + line('M46 22 Q52 28 54 36 Q56 44 62 48 Q68 52 68 58', 'zwave'), 2, 8); },
    // うお座: two fish tied together by a long cord that dips through the middle
    pisces: () => line('M14 16 Q32 40 50 47 Q68 40 86 16', 'zsoft') +
      sway(14, 14, part(ell(14, 14, 8.5, 4.6, 20, .55), 2.6) + part(P('M7 9 L1 3 L2 13 Z'), 2), 5, 6) + dot(19, 17) +
      sway(86, 14, part(ell(86, 14, 8.5, 4.6, 20, -.55), 2.6) + part(P('M93 9 L99 3 L98 13 Z'), 2), -5, 6) + dot(81, 17),
  };
  const cache = {};
  window.ShanghaiZodiac = (id, i) => { if (!ART[id]) return ''; if (!cache[id]) { SEED = (i || 0) * 31 + 1; cache[id] = ART[id](); } return `<g class="zb" style="--bd:${-(i || 0) * 1.3}s">${cache[id]}</g>`; };
  window.ShanghaiZodiac.css = `
.shmap .fig .zfil{fill:rgba(150,180,255,.06);stroke:none}
.shmap .fig .zed{fill:none;stroke:rgba(170,200,255,.28);stroke-width:.18;stroke-linejoin:round}
.shmap .fig .zol{fill:none;stroke:rgba(200,222,255,.62);stroke-width:.32;stroke-linejoin:round}
.shmap .fig .zt{fill:rgba(180,210,255,.22);stroke:none;opacity:0;animation:shzt 9s ease-in-out infinite}
.shmap .fig .zdt{fill:none;stroke:rgba(200,222,255,.62);stroke-width:.32;stroke-linecap:round;stroke-linejoin:round}
.shmap .fig .zdt.zsoft{stroke:rgba(170,200,255,.35);stroke-width:.24}
.shmap .fig .zdt.zwave{stroke:rgba(140,210,255,.55);stroke-dasharray:2 1.4;animation:shzw 3s linear infinite}
.shmap .fig .zey{fill:rgba(230,240,255,.9);animation:shzblink 5s infinite;transform-box:fill-box;transform-origin:center}
.shmap .fig.lit .zfil{fill:rgba(255,214,106,.07)}.shmap .fig.lit .zed{stroke:rgba(255,224,150,.32)}.shmap .fig.lit .zol,.shmap .fig.lit .zdt{stroke:rgba(255,226,150,.75)}.shmap .fig.lit .zt{fill:rgba(255,220,140,.25)}
.shmap .fig .zb{animation:shzbob 8s ease-in-out infinite;animation-delay:var(--bd,0s)}
.shmap .fig .zs{animation:shzsway var(--sd,6s) ease-in-out infinite;transform-box:view-box}
@keyframes shzbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.8px)}}
@keyframes shzsway{0%,100%{transform:rotate(calc(var(--a) * -1))}50%{transform:rotate(var(--a))}}
@keyframes shzt{0%,100%{opacity:0}45%,55%{opacity:1}}
@keyframes shzblink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes shzw{to{stroke-dashoffset:-6.8}}
`;
})();
