/* =====================================================================
   上海 — the zodiac figures of the 星座マップ, drawn like the figures of an old star atlas
   (2026-11-14, ユーザー: 独創性ではなく伝統性。各星座の伝統的なモチーフをリサーチして、ステージボタンの位置も合わせる).
   Each constellation has its 10 stars (= the 10 stage buttons, x 0..100, y 0..64) placed where the traditional figure
   puts them, and the figure drawn round them in the star-atlas manner: pale blue translucent parts with a light outline,
   jointed segments, a few inner lines (cf. Bode's Uranographia / Flamsteed / Urania's Mirror):
     Aries — the ram lying down, its head turned back over its shoulder, one foreleg stretched out (Hamal on the head);
     Taurus — the front half of a charging bull, head lowered (Aldebaran the eye, Elnath and ζ the horn tips, the Pleiades on the shoulder);
     Gemini — the twins with their arms round each other, Castor with the lyre, Pollux with the club (their heads the two stars);
     Cancer — the crab seen from above, claws raised;   Leo — the lion striding west, the Sickle the mane, Regulus the heart, Denebola the tail;
     Virgo — the winged maiden lying along the stars, the palm frond in one hand and the ear of wheat (Spica) in the other;
     Libra — the scales;   Scorpius — the scorpion: claws and head, jointed legs, the curling tail with the sting;
     Sagittarius — the centaur drawing his bow, the arrow aimed west at the scorpion's heart (the Teapot stars on the bow and arrow);
     Capricornus — the sea-goat: horned head and folded forelegs, the body ending in a fish's tail (Deneb Algedi the tail);
     Aquarius — the water-bearer pouring his urn, the stream running down into the mouth of the Southern Fish (Fomalhaut);
     Pisces — two fishes tied by cords at their tails, the knot Alrescha; the western fish's head is the Circlet.
   window.ShanghaiZodiac(id, i) → SVG markup, cached.  .css → the shared styles.  .stars → { id: { p, e } } (the map and the
   play mat read the stars from here).
   ===================================================================== */
(function () {
  'use strict';
  const R1 = n => Math.round(n * 10) / 10;
  const pt = p => R1(p[0]) + ' ' + R1(p[1]);

  /* ---------- the stars: the stage buttons in order, and the lines between them ---------- */
  const path = n => Array.from({ length: n - 1 }, (_, i) => [i, i + 1]);
  const STARS = {
    aries: { p: [[14, 36], [27, 28], [40, 26], [53, 28], [68, 26], [78, 14], [66, 9], [56, 12], [47, 17], [88, 50]], e: path(9).concat([[4, 9]]) },
    taurus: { p: [[16, 8], [26, 18], [36, 26], [28, 36], [21, 28], [8, 31], [62, 14], [82, 20], [44, 47], [34, 56]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1], [4, 5], [2, 6], [6, 7], [3, 8], [8, 9]] },
    gemini: { p: [[56, 56], [46, 44], [36, 32], [24, 16], [40, 8], [52, 18], [64, 28], [66, 44], [80, 38], [88, 46]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [6, 8], [8, 9], [2, 5]] },
    cancer: { p: [[28, 10], [36, 22], [44, 32], [56, 32], [64, 22], [72, 10], [40, 46], [26, 54], [60, 46], [74, 54]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [2, 6], [6, 7], [3, 8], [8, 9]] },
    leo: { p: [[14, 31], [32, 22], [36, 38], [72, 46], [70, 35], [64, 24], [70, 13], [80, 9], [88, 16], [90, 28]], e: [[0, 1], [1, 2], [2, 0], [1, 5], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]] },
    virgo: { p: [[74, 8], [80, 20], [66, 28], [54, 22], [44, 12], [52, 36], [38, 40], [26, 44], [12, 48], [64, 50]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 8], [5, 9]] },
    libra: { p: [[50, 57], [50, 43], [50, 24], [50, 10], [30, 22], [20, 38], [28, 54], [70, 22], [80, 38], [72, 54]], e: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [2, 7], [7, 8], [8, 9]] },
    scorpius: { p: [[80, 9], [86, 19], [87, 31], [72, 24], [61, 30], [46, 41], [44, 51], [34, 58], [21, 56], [14, 46]], e: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]] },
    sagittarius: { p: [[14, 40], [28, 32], [40, 34], [44, 22], [52, 9], [67, 13], [72, 26], [86, 26], [67, 39], [55, 53]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6], [6, 7], [6, 8], [8, 2], [8, 9]] },
    capricornus: { p: [[75, 5], [84, 19], [77, 33], [70, 47], [56, 44], [42, 42], [28, 36], [12, 20], [26, 26], [44, 29]], e: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 1]] },
    aquarius: { p: [[24, 58], [30, 45], [28, 24], [42, 20], [54, 15], [60, 28], [72, 34], [70, 46], [80, 52], [92, 56]], e: path(10) },
    pisces: { p: [[28, 15], [30, 28], [40, 48], [54, 58], [62, 48], [70, 32], [78, 26], [88, 20], [96, 26], [88, 32]], e: path(10).concat([[9, 6]]) },
  };

  /* ---------- geometry ---------- */
  // Catmull–Rom through the points (closed or open) → a dense polyline
  function cr(P, n, closed) {
    const out = [], N = P.length, at = i => closed ? P[(i + N) % N] : P[Math.max(0, Math.min(N - 1, i))];
    const segs = closed ? N : N - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); }
    }
    if (!closed) out.push(P[N - 1]);
    return out;
  }
  const poly = (Q, close) => 'M' + Q.map(pt).join('L') + (close ? 'Z' : '');
  // a smooth closed shape through the points
  const blob = (P, cls) => `<path class="${cls || 'zp'}" d="${poly(cr(P, 6, true), true)}"/>`;
  // a smooth open line through the points
  const ln = (P, cls) => `<path class="${cls || 'zl'}" d="${poly(cr(P, 6, false))}"/>`;
  // a tapered limb along the points (widths w0 → w1, or one per point), rounded at both ends
  function tube(P, ws, cls) {
    const S = cr(P, 6, false), n = S.length, W = Array.isArray(ws) ? ws : [ws, ws];
    const wAt = k => { const f = k / (n - 1) * (W.length - 1), i = Math.min(W.length - 2, Math.floor(f)); return W[i] + (W[i + 1] - W[i]) * (f - i); };
    const L = [], R = [];
    S.forEach((p, k) => { const a = S[Math.max(0, k - 1)], b = S[Math.min(n - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = wAt(k) / 2;
      L.push([p[0] - dy / l * w, p[1] + dx / l * w]); R.push([p[0] + dy / l * w, p[1] - dx / l * w]); });
    const cap = (c, from, w, sgn) => { const out = [], a0 = Math.atan2(from[1] - c[1], from[0] - c[0]); for (let k = 1; k < 6; k++) { const a = a0 + sgn * Math.PI * k / 6; out.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * w]); } return out; };
    const e = S[n - 1], s = S[0];
    const Q = L.concat(cap(e, L[n - 1], wAt(n - 1) / 2, -1), R.slice().reverse(), cap(s, R[0], wAt(0) / 2, -1));
    return `<path class="${cls || 'zp'}" d="${poly(Q, true)}"/>`;
  }
  // jointed segments (a scorpion's tail and legs, a crab's legs): one swollen segment per pair of points
  function seg(P, w0, w1) {
    let s = '';
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], w = w0 + (w1 - w0) * i / Math.max(1, P.length - 2), cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      s += `<ellipse class="zp" cx="${R1(cx)}" cy="${R1(cy)}" rx="${R1(l / 2 + w * .22)}" ry="${R1(w / 2)}" transform="rotate(${R1(Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI)} ${R1(cx)} ${R1(cy)})"/>`;
    }
    return s;
  }
  const ell = (cx, cy, rx, ry, rot, cls) => `<ellipse class="${cls || 'zp'}" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;
  // points in a local frame (x along angle a, scaled s, mirrored with f = -1) → the map
  const xf = (P, x, y, a, s, f) => { const c = Math.cos(a), sn = Math.sin(a); return P.map(([u, v]) => { v *= f || 1; return [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s]; }); };
  const rad = d => d * Math.PI / 180;
  // a claw (the scorpion's and the crab's pincers), opening along angle a (degrees)
  const pincer = (x, y, a, s) => blob(xf([[0, -1.7], [3, -2.4], [5.4, -1.8], [5.4, 1.8], [3, 2.4], [0, 1.7]], x, y, rad(a), s)) +
    blob(xf([[4.8, -1.8], [8, -3], [11.6, -1.8], [10.6, -.9], [7.6, -1.2], [5.2, -.2]], x, y, rad(a), s)) +
    blob(xf([[4.8, 1.6], [7.8, 2.6], [10.6, 1.4], [9.6, .7], [7.4, .9], [5.2, .4]], x, y, rad(a), s));
  const dot = (x, y, r) => `<circle class="zey" cx="${x}" cy="${y}" r="${r || .6}"/>`;
  const sway = (ox, oy, inner, amp, dur) => `<g class="zs" style="transform-origin:${ox}px ${oy}px;--a:${amp || 3}deg;--sd:${dur || 6}s">${inner}</g>`;
  // the cross-bands of a body seen from above (the scorpion's back, the crab's shell …): chords of an ellipse
  function bands(cx, cy, rx, ry, rotDeg, ts, bend) {
    const a = rad(rotDeg), c = Math.cos(a), s = Math.sin(a), M = (u, v) => [cx + u * c - v * s, cy + u * s + v * c];
    return ts.map(t => { const h = ry * Math.sqrt(Math.max(0, 1 - t * t)) * .96; const p = M(t * rx, -h), q = M(t * rx, h), m = M(t * rx + (bend || 0), 0); return `<path class="zl" d="M${pt(p)}Q${pt(m)} ${pt(q)}"/>`; }).join('');
  }
  // wool / scales: a row of small arcs along a line
  function scallops(P, r, n, cls) {
    const S = cr(P, 8, false); let d = '';
    for (let k = 0; k < n; k++) { const i = Math.round(k / Math.max(1, n - 1) * (S.length - 1)), p = S[i], q = S[Math.min(S.length - 1, i + 1)], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, ux = (q[0] - p[0]) / l, uy = (q[1] - p[1]) / l;
      d += `M${pt([p[0] - ux * r, p[1] - uy * r])}Q${pt([p[0] - uy * r * 1.6, p[1] + ux * r * 1.6])} ${pt([p[0] + ux * r, p[1] + uy * r])}`; }
    return `<path class="${cls || 'zl'}" d="${d}"/>`;
  }
  // a person: torso from the shoulders to the hips, limbs as tapered tubes, a round head (the atlases' classical figures)
  function person(o) {
    const [s0, s1] = o.sh, [h0, h1] = o.hip, mid = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
    const w0 = mid(s0, h0, .55), w1 = mid(s1, h1, .55), in0 = mid(w0, w1, .1), in1 = mid(w0, w1, .9);
    const nk = o.neck, lw = o.lw || 2.4, aw = o.aw || 1.9;
    const limb = (P, a, b) => tube(P, [a, b]);
    let back = '', front = '';
    (o.legs || []).forEach((L, k) => { (o.legBack === k ? (back += limb(L, lw, lw * .62)) : (front += limb(L, lw, lw * .62))); if (L.foot) {} });
    const arms = (o.arms || []).map(A => limb(A, aw, aw * .7));
    const torso = blob([s0, mid(s0, in0, .5), in0, h0, mid(h0, h1, .5), h1, in1, mid(s1, in1, .5), s1, mid(s0, s1, .5)].map((p, i) => i === 9 ? [p[0] + (nk[0] - p[0]) * .35, p[1] + (nk[1] - p[1]) * .35] : p));
    const neck = tube([mid(s0, s1, .5), nk], [o.nw || 1.8, (o.nw || 1.8) * .9]);
    const head = ell(o.head[0], o.head[1], o.head[2], o.head[2] * 1.06, 0);
    const behind = (o.armBack != null ? arms[o.armBack] : '');
    const infront = arms.filter((_, k) => k !== o.armBack).join('');
    return behind + back + front + neck + torso + (o.robe ? blob(o.robe) + (o.folds || []).map(f => ln(f)).join('') : '') + (o.over || '') + infront + head + (o.hair || '');
  }

  /* ---------- the figures ---------- */
  const ART = {
    // the ram, lying, one foreleg stretched out, its head turned back over the shoulder (Hamal on the head, the horn curling)
    aries: () => {
      const legs = tube([[30, 49], [24, 55], [35, 57]], [4, 3]) + tube([[60, 49], [66, 55], [56, 57]], [4, 3]) + tube([[74, 45], [82, 50], [91, 52]], [4, 2.6]) + ell(92, 52, 1.6, 1.1, 10);
      // the body and the neck in one outline (no inner lines): lying, the neck rising at the front to the head turned back
      const body = blob([[13, 39], [18, 30], [28, 26], [40, 24], [50, 24.6], [55, 21], [57, 15], [64, 12], [70, 19], [75, 30], [77, 40], [74, 48], [64, 52.4], [48, 53], [30, 53], [18, 50], [12, 45]]);
      const head = blob([[66, 10], [62, 6.6], [56, 7], [50, 10], [46, 14.6], [46.6, 18.4], [51, 19.6], [58, 18.4], [64, 16]]);
      const horn = tube([[62, 8], [69, 4.6], [76, 7], [78.4, 13], [75.6, 18.4], [70.6, 18.6]], [3.6, 1.4]);
      return tube([[13, 40], [9, 44], [9, 49]], [3.4, 2]) + legs + body + horn + head + dot(52.5, 12.6, .45);
    },

    // the forepart of a charging bull, head lowered; Aldebaran the eye, the horn tips Elnath (upper) and ζ (lower), the Pleiades on the shoulder
    taurus: () => {
      // the whole bull (head lowered, charging): the shoulder hump, the back, the rump with the tail, four legs
      const body = blob([[34, 15], [42, 9], [52, 5], [61, 6], [70, 10], [80, 12], [90, 12], [96, 15], [99, 23], [97, 33], [92, 41], [82, 42.6], [72, 42], [62, 46], [52, 47.4], [44, 45], [36, 40]]);
      const fore = tube([[48, 41], [44, 47], [35, 55]], [5, 3]) + blob([[32, 53], [37, 54], [36, 58], [31, 57]]) + tube([[60, 42], [63, 51], [56, 58]], [5, 3]) + blob([[53, 56], [58, 57], [57, 61], [52, 60]]);
      const hind = tube([[82, 38], [80, 49], [83, 58]], [5.4, 3]) + blob([[80.6, 57], [85.4, 57.4], [85, 61], [80, 60.6]]) + tube([[92, 36], [95, 47], [91, 57]], [5.4, 3]) + blob([[88.6, 56], [93.4, 56.4], [93, 60], [88, 59.6]]);
      const tail = sway(98, 18, tube([[98, 17], [101.6, 24], [101, 34], [100, 40]], [1.6, 1]) + blob([[99, 38.6], [101.6, 39], [101.4, 44], [99, 43.4]]), 4, 6);
      const head = blob([[25, 16.4], [33, 15.6], [38.4, 20.6], [37.4, 28], [33, 36], [29.4, 43], [26, 48.4], [20, 49], [16, 46], [17, 40], [19, 32], [20, 24]]);
      const horns = tube([[25, 18], [19, 15], [16, 11], [17, 7]], [3, 1]) + tube([[21, 26], [14, 27], [9, 30], [8, 34]], [3, 1]);
      return tail + hind + fore + body + blob([[35, 18], [40, 15], [42, 19], [38, 21]]) + horns + head + dot(21.5, 28.5, .5) + dot(33, 27, .45) + ln([[19, 44], [21, 46], [24, 45]]) +
        [[60, 12], [63, 13], [61.5, 15.5], [64, 16], [60, 16]].map(([x, y]) => `<circle class="zcl" cx="${x}" cy="${y}" r=".45"/>`).join('');
    },

    // the twins, arms round each other: Pollux (left) with the club, Castor (right) with the lyre
    gemini: () => {
      const pollux = person({ head: [24, 15.5, 3.6], neck: [27, 20], sh: [[27, 27], [34, 21]], hip: [[37, 37.5], [42.5, 33]],
        legs: [[[37.5, 37], [43, 46], [51, 56]], [[42, 33], [49, 42], [57, 52]]], legBack: 1,
        arms: [[[34, 21.5], [41, 27], [48, 25]], [[27, 27], [21, 30.5], [16.5, 27]]], armBack: 0,
        robe: [[29, 28], [35, 22], [44, 33], [50, 37], [44, 42], [39, 45], [33, 38]], folds: [[[37, 30], [43, 39]], [[33, 32], [39, 41]]],
        hair: ln([[21, 13], [24, 11.6], [27.4, 13.6]]) });
      const club = tube([[15.5, 29], [12, 22], [9.6, 14]], [1.4, 3.6]) + ln([[11, 20], [12.6, 19.4]], 'zl zsoft') + ln([[10, 16.5], [11.6, 16]], 'zl zsoft');
      const castor = person({ head: [40, 8, 3.6], neck: [43.4, 12], sh: [[44, 17.3], [50, 10.4]], hip: [[61.8, 30.7], [66.2, 25.3]],
        legs: [[[62, 30.5], [64, 37.5], [66.5, 45]], [[66, 25.5], [75, 33], [85, 43]]], legBack: 0,
        arms: [[[44, 17.5], [39.5, 22.5], [34, 22]], [[50, 10.5], [56, 9.5], [60, 14]]],
        robe: [[45, 17], [50, 11], [60, 20], [74, 29], [70, 35], [66, 38], [56, 30]], folds: [[[52, 18], [64, 31]], [[56, 15], [70, 28]]],
        hair: ln([[37, 6], [40, 4.2], [43.4, 6]]) });
      const feet = blob([[49, 55], [53, 54.5], [57, 56.5], [52, 58]]) + blob([[64, 44], [68, 44], [70, 46.5], [65, 46.5]]) + blob([[83, 42], [88, 44.5], [89, 47], [84, 46]]);
      const lyre = tube([[61, 18], [59, 12], [61.5, 6.5]], [1.2, .8]) + tube([[66, 17], [68, 11], [66, 5.5]], [1.2, .8]) + blob([[60, 16], [67, 15.5], [66, 20], [61, 20.5]]) + ln([[61, 7], [66.5, 6.5]]) + ln([[62, 16], [62.6, 8]], 'zl zsoft') + ln([[64, 16], [64, 7.8]], 'zl zsoft') + ln([[65.6, 16], [65.4, 8]], 'zl zsoft');
      return pollux + club + feet + castor + lyre + dot(22.5, 15) + dot(38.4, 7.6);
    },
    // the crab from above, claws raised (Praesepe glimmering on the shell)
    cancer: () => {
      const legs = [[[36, 34], [26, 31], [18, 37]], [[36, 38], [26, 40], [19, 47]], [[38, 42], [30, 47], [24, 55]], [[43, 45], [39, 51], [35, 58]]];
      const L = legs.map(P => seg(P, 3.2, 2.4) + ln([P[2], [P[2][0] - 1.6, P[2][1] + 1.8]])).join('') + legs.map(P => P.map(([x, y]) => [100 - x, y])).map(P => seg(P, 3.2, 2.4) + ln([P[2], [P[2][0] + 1.6, P[2][1] + 1.8]])).join('');
      const claws = sway(40, 30, seg([[41, 29], [36, 23], [32.5, 16.5]], 3.6, 3) + pincer(32.5, 16.5, -122, .82), 4, 5) + sway(60, 30, seg([[59, 29], [64, 23], [67.5, 16.5]], 3.6, 3) + pincer(67.5, 16.5, -58, .82), -4, 5);
      const shell = blob([[35, 33], [38, 27.5], [44, 25], [50, 24.4], [56, 25], [62, 27.5], [65, 33], [64.5, 40], [60, 45.5], [50, 47.5], [40, 45.5], [35.5, 40]]);
      const eyes = ln([[46.5, 25.5], [45.5, 21.5]]) + ln([[53.5, 25.5], [54.5, 21.5]]) + dot(45.4, 21.2, .8) + dot(54.6, 21.2, .8);
      const dots = [[49, 37], [51.5, 36.2], [50.4, 39], [48, 39.6], [52.6, 38.8]].map(([x, y]) => `<circle class="zcl" cx="${x}" cy="${y}" r=".45"/>`).join('');
      return L + claws + shell + ln([[40, 30], [46, 33], [50, 31], [54, 33], [60, 30]]) + ln([[42, 41], [50, 43.5], [58, 41]], 'zl zsoft') + ln([[50, 31], [50, 43]], 'zl zsoft') + eyes + dots;
    },
    // the lion striding west (to the right): the Sickle his mane and head, Regulus the heart, Denebola the tail
    leo: () => {
      const hind = tube([[28, 40], [24, 50], [26, 59]], [5, 3.4]) + ell(27, 60, 2.6, 1.4, 0);
      const fore = tube([[64, 43], [64, 52], [61, 59]], [4.6, 3.4]) + ell(61, 60, 2.6, 1.4, 0);
      const body = blob([[27, 24], [36, 21], [50, 22.6], [61, 22], [69, 26], [75, 37], [72, 45], [62, 44.6], [50, 41.6], [40, 43.6], [30, 43], [24, 33]]);
      const thigh = blob([[29, 30], [37, 31], [41, 40], [37, 47], [31, 46]]) + tube([[35, 44], [38, 52], [36, 59]], [5, 3.4]) + ell(37, 60, 2.6, 1.4, 0);
      const leg2 = tube([[72, 42], [74, 51], [75, 59]], [4.8, 3.4]) + ell(76, 60, 2.8, 1.4, 0);
      const mane = blob(Array.from({ length: 30 }, (_, k) => { const a = k / 30 * Math.PI * 2, r = k % 2 ? 1 : 1.16; return [75 + Math.cos(a) * 12 * r, 23 + Math.sin(a) * 18.6 * r]; }));
      const locks = ln([[73, 8], [69, 13], [67, 20], [68, 28], [71, 35]], 'zl zsoft') + ln([[78, 10], [74, 16], [73, 24], [75, 31]], 'zl zsoft');
      const head = blob([[80, 10], [86, 9], [92, 13], [96, 19], [97, 25], [93, 29], [87, 30], [82, 26], [79, 18]]);
      const tail = sway(26, 27, tube([[27, 27], [20, 26], [15, 30], [13, 35]], [2, 1.4]) + blob([[13, 33], [15.5, 36], [13, 40], [10.5, 37]]), 6, 7);
      return tail + hind + fore + body + thigh + leg2 + mane + locks + head + blob([[82, 10], [84, 6.5], [86, 10]]) + dot(89, 16) + ln([[96, 22], [94, 23.5], [96.5, 25.5]]) + ln([[88, 27], [92, 28.5]], 'zl zsoft');
    },
    // the winged maiden lying along the stars: Spica the ear of wheat in her lower hand, the palm frond in the other
    virgo: () => {
      // a feathered wing from her back (the trailing edge in feathers)
      const wing = blob([[76, 16], [75, 7], [68, 2.4], [57, 1.4], [46, 3.4], [43.4, 7], [47.4, 7.4], [50.4, 10.4], [54.4, 9.8], [57.4, 13], [61.6, 12.4], [64.4, 16], [68.4, 15.6], [71, 19]]);
      const feathers = ln([[74, 10], [62, 6.6], [50, 5.4]], 'zl zsoft') + ln([[73, 14], [60, 10], [47.4, 7.4]], 'zl zsoft');
      // a dress: a narrow bodice, the waist, the skirt flaring to a wavy hem at her feet
      const maid = person({ head: [88.4, 13.4, 4.2], neck: [84.6, 16.6], sh: [[77.4, 13.6], [80.6, 21.6]], hip: [[64.6, 20.6], [66.8, 26]], nw: 1.8,
        arms: [[[78, 14], [82, 7.6], [88.4, 4.6]], [[80.4, 21.6], [75, 30], [69.4, 38.6]]], armBack: 0,
        robe: [[65, 20.4], [52, 24], [36, 28.6], [20, 32.6], [8, 36], [3, 41], [5.6, 46.4], [9, 51], [14.4, 55.6], [21, 57.6], [28, 52.6], [40, 45], [52, 37.4], [62, 30], [67.4, 26]],
        folds: [[[58, 27], [40, 35.4], [22, 44], [9, 47]], [[56, 31], [38, 40.6], [24, 49.6]], [[60, 24.6], [42, 30.6], [24, 37.6]]],
        hair: blob([[90, 9], [85, 8.8], [81.4, 11.4], [79.6, 16], [78, 20.4], [81.6, 19.6], [84.4, 16.4], [85.4, 12.6]]) });
      const frond = tube([[88.4, 4.6], [94, 1.6], [99, 1.2]], [.8, .4]) + [[90.4, 3.6], [92.4, 2.6], [94.4, 1.8], [96.4, 1.4]].map(([x, y], k) => ln([[x, y], [x - 1.4, y - 2.6 + k * .2]], 'zl zsoft') + ln([[x, y], [x + 1, y + 2.8 - k * .3]], 'zl zsoft')).join('');
      const wheat = sway(69, 39, ln([[69.6, 37.6], [63.5, 53.5]]) + [0, 1, 2, 3, 4, 5].map(k => ell(R1(66 - k * .8), R1(46 + k * 1.7), 1.1, .6, -62 + (k % 2 ? 30 : -30))).join('') + ln([[64, 52.5], [61.5, 51]], 'zl zsoft') + ln([[63.6, 53.6], [66.4, 54.6]], 'zl zsoft'), 3, 6);
      return wing + feathers + maid + frond + wheat + dot(91, 12.6, .45);
    },

    // the scales: a column with a finial ring, the beam (gently tipping) and two pans on chains
    libra: () => {
      const column = blob([[48.4, 14], [51.6, 14], [52, 50], [57, 53.5], [61, 58], [39, 58], [43, 53.5], [48, 50]]) + ln([[46, 51], [54, 51]], 'zl zsoft') + ln([[44, 55], [56, 55]], 'zl zsoft') + ell(50, 10, 3.2, 3.2, 0) + ell(50, 10, 1.4, 1.4, 0, 'zl');
      const side = (x, s) => ln([[x, 23], [x - 12 * s, 45.5]]) + ln([[x, 23], [x + 10 * s, 45.5]]) + ln([[x, 23], [x - 1 * s, 45.5]], 'zl zsoft') +
        blob([[x - 15 * s, 45.5], [x + 13 * s, 45.5], [x + 9 * s, 51.5], [x - 1 * s, 54.5], [x - 11 * s, 51.5]]) + ln([[x - 14 * s, 47], [x + 12 * s, 47]], 'zl zsoft');
      const beam = blob([[28, 21], [40, 20.4], [50, 19.6], [60, 20.4], [72, 21], [72, 23.4], [60, 23], [50, 24.4], [40, 23], [28, 23.4]]) + ell(27.6, 22.2, 1.6, 1.6, 0) + ell(72.4, 22.2, 1.6, 1.6, 0) + blob([[49, 23], [51, 23], [50, 30.5]]);
      return column + sway(50, 22, side(30, 1) + side(70, -1) + beam, 3, 8);
    },
    // the scorpion: head and claws up at the right, eight jointed legs, the jointed tail curling down to the sting
    scorpius: () => {
      const top = [[72.2, 17.2], [67.1, 18.5], [61.3, 21], [55.9, 24.4]].map(([x, y], k) => seg([[x, y], [x - 3, y - 7], [x - 7.4, y - 12]], 2.6, 2) + ln([[x - 7.4, y - 12], [x - 9.6, y - 12.6], [x - 10.4, y - 11]])).join('');
      const bot = [[79.5, 35.5], [73.8, 38], [67.9, 40.1], [62.6, 41.3]].map(([x, y]) => seg([[x, y], [x + 1.4, y + 7], [x - .8, y + 13]], 2.6, 2) + ln([[x - .8, y + 13], [x + 1.4, y + 15], [x + 3.6, y + 14.4]])).join('');
      const tail = seg([[53, 35.5], [46, 41.5], [44, 50.5], [39, 56], [31.5, 58.6], [24, 58], [17.5, 53], [14.4, 46], [16, 39.4]], 8.2, 4.6);
      const sting = blob([[16, 39.5], [13.5, 36], [15.5, 32.6], [19.5, 33.5], [20, 37]]) + tube([[19.5, 34], [23, 31.5], [26, 32.8], [26.4, 35.6]], [1.8, .4]);
      const claws = sway(86, 20, seg([[87, 20.5], [81.4, 13], [83.4, 5.6]], 3.8, 3.2) + pincer(83.6, 5.4, -70, .82), 3, 6) +
        sway(89, 29, seg([[89.5, 29], [95.5, 36], [101.6, 38.6]], 3.8, 3.2) + pincer(101.8, 38.8, 20, .82), -3, 7);
      const body = ell(69, 29, 21.5, 10.8, -21.5) + bands(69, 29, 21.5, 10.8, -21.5, [-.72, -.45, -.18, .1, .38, .62], -1.2);
      const head = blob([[84, 19], [89.5, 18.5], [92, 23], [91, 29], [86, 31.5], [83, 26]]) + ln([[89.6, 18.6], [91.4, 15.6]], 'zl zsoft') + ln([[90.6, 19.4], [93.4, 17.2]], 'zl zsoft') + ln([[91.4, 20.6], [94.4, 19.6]], 'zl zsoft') + dot(88.6, 22) + dot(89.4, 25.2);
      return top + bot + sway(16, 39, sting, 8, 5) + tail + claws + body + head;
    },
    // the centaur drawing his bow; the arrow points west (right) at the scorpion's heart. The bow and arrow carry the Teapot's stars
    sagittarius: () => {
      const tail = sway(14, 33, tube([[14, 33], [7, 36], [4, 43], [6, 50]], [3.4, 1.6]) + ln([[8, 37], [5, 44]], 'zl zsoft'), 5, 6);
      const hindL = tube([[18, 42], [15, 50], [19, 59]], [4.4, 2.6]) + ell(20, 60, 2, 1.2, 0) + tube([[25, 44], [29, 51], [26, 59]], [4.4, 2.6]) + ell(26.6, 60, 2, 1.2, 0);
      const foreL = tube([[51, 44], [52.6, 52], [50, 59.4]], [4, 2.6]) + ell(50.6, 60.4, 2, 1.2, 0) + tube([[56, 42], [59.6, 47.6], [55, 53]], [4, 2.6]) + ell(54.2, 53.8, 1.6, 1.2, 40);
      const horse = blob([[12, 34], [18, 29], [30, 30], [42, 31], [52, 32], [58, 38], [56, 44], [46, 46.4], [30, 46.4], [18, 45], [12, 40]]);
      const cape = sway(46, 16, blob([[46, 15], [40, 12.4], [32, 13], [25, 17], [32, 17.2], [40, 19]]) + ln([[42, 14.6], [30, 15.6]], 'zl zsoft'), 3, 7);
      const man = person({ head: [52.4, 9.4, 3.4], neck: [51.6, 13.4], sh: [[45.6, 17.6], [56, 16.6]], hip: [[44.6, 33], [53.6, 33.4]], nw: 1.9,
        arms: [[[46, 17.8], [37, 19.6], [44.6, 24.6]], [[55.6, 17], [63, 21.6], [70, 25.6]]], armBack: 0,
        hair: blob([[49.4, 7], [52.6, 5.4], [55.4, 7.4], [51.6, 8.2]]) });
      const bow = tube([[63, 7.6], [68.6, 13.2], [72.6, 20], [73.6, 26], [72.6, 32], [68.6, 38.8], [63, 44.4]], [1, 1.9, 1]);
      const strg = ln([[63, 7.6], [44.4, 24.6], [63, 44.4]], 'zl zsoft');
      const arrow = ln([[41.6, 25], [86, 26]]) + blob([[85, 24.4], [89.4, 26], [85, 27.6]]) + ln([[41.6, 25], [39.4, 23.4]]) + ln([[41.6, 25], [39.4, 26.8]]);
      return tail + cape + hindL + horse + foreL + man + strg + bow + arrow + dot(54.2, 8.8);
    },
    // the sea-goat: horned goat's head and folded forelegs, the body turning into a fish's tail (Deneb Algedi at its tip)
    capricornus: () => {
      const legs = tube([[76, 38], [71, 46.4], [79.4, 50.4]], [3.6, 2.4]) + ell(80.6, 50.6, 1.6, 1.1, 20) + tube([[69, 40], [64, 48], [70.4, 52.4]], [3.6, 2.4]) + ell(71.6, 52.8, 1.6, 1.1, 20);
      const fish = tube([[68, 31], [56, 35.4], [43, 35.8], [33, 32.6], [23, 28], [15, 22.6]], [18, 15, 12.4, 8.6, 5, 3]);
      const fin = sway(15, 22, blob([[17, 23.6], [11, 21.6], [3.6, 13.6], [10.4, 15.6], [12, 9.6], [16.4, 18.6]]), 6, 6);
      const front = blob([[60, 24], [70, 19.6], [78, 14.6], [84, 20], [84, 28], [80.6, 36], [72, 42], [62, 40]]);
      const head = blob([[79, 12.6], [85, 11.6], [91, 14.6], [96.4, 19], [95.4, 23], [89, 23.6], [84, 24]]);
      const horns = tube([[81, 13], [78.6, 6], [72.6, 2.8], [66.4, 3.6]], [3, .8]) + tube([[83.4, 12.6], [82.6, 6.4], [78, 3.4]], [2.2, .6]);
      return fin + fish + scallops([[60, 34], [48, 35.4], [36, 33.6], [26, 29.4]], 1.7, 8) + scallops([[58, 40], [46, 40.6], [34, 37.6]], 1.6, 6) + blob([[44, 28], [38, 23.4], [34, 26.8]]) +
        legs + front + horns + head + blob([[82, 15.4], [77, 17.6], [81, 19]]) + dot(87.4, 15.6) + tube([[90, 23.4], [88.6, 28.6]], [1.6, .6]) + ln([[94.6, 20.6], [96, 21.4]]);
    },
    // the water-bearer pouring his urn; the stream runs down into the mouth of the Southern Fish (Fomalhaut)
    aquarius: () => {
      const man = person({ head: [35.4, 10, 3.6], neck: [34.6, 14.4], sh: [[28, 21.4], [41.6, 19.4]], hip: [[29.6, 37.6], [38.6, 37.4]], nw: 2,
        legs: [[[30.4, 37.6], [29.6, 45.2], [22.6, 56.6]], [[37.6, 37.4], [46.4, 46.4], [44.6, 57.6]]], legBack: 0,
        arms: [[[28.4, 22], [37, 28.4], [48.6, 22.4]], [[41.6, 19.6], [47, 24], [51.4, 18.6]]], armBack: 1,
        robe: [[27, 22], [36, 24.6], [42, 20], [44.6, 30], [46, 42.6], [38.6, 44.6], [32, 44], [27, 41.6], [28, 31]],
        folds: [[[33, 26], [38, 40]], [[40, 26], [43, 40]]], hair: ln([[32, 8], [35.4, 6.2], [38.6, 8]]) });
      const feet = blob([[20, 56], [25, 55.4], [26.6, 58.6], [21, 58.6]]) + blob([[42, 57], [47, 56.6], [48.6, 59.6], [43, 59.6]]);
      const urn = blob(xf([[-4.6, -3.6], [2.6, -4.2], [5, -1.6], [6.6, -1], [6.6, 1], [5, 1.6], [2.6, 4.2], [-4.6, 3.6], [-6, 0]], 54, 15.6, rad(28), 1)) + ln(xf([[-1.4, -3.8], [-1.4, 3.8]], 54, 15.6, rad(28), 1), 'zl zsoft');
      const W = [[58.6, 19.6], [60, 28], [66, 31.6], [72, 34], [72.6, 40], [70, 46], [74, 50], [80, 52], [86, 53.4], [91, 55.4]];
      const water = ln(W, 'zl zw') + ln(W.map(([x, y], k) => [x + 1.4, y + (k % 2 ? -.8 : .8)]), 'zl zw zw2') + ln(W.map(([x, y], k) => [x - 1.2, y + (k % 2 ? .9 : -.6)]), 'zl zw zw3');
      const sfish = blob([[92, 55.4], [96, 52.6], [102, 53.4], [106, 56], [102, 58.8], [96, 59.4]]) + blob([[105, 56], [109, 52.6], [108.4, 56], [109.4, 59.6]]) + dot(95.2, 55.2, .5);
      return man + feet + urn + water + sfish;
    },
    // two fishes tied by cords at their tails; the knot is Alrescha. The northern fish swims up, the western one (the Circlet its head) to the right
    pisces: () => {
      const fishN = blob(xf([[-12, 0], [-8, -4.2], [0, -5.4], [7, -4], [12.4, -.6], [12.4, .6], [7, 4], [0, 5.4], [-8, 4.2]], 29.6, 25, rad(96), 1)) +
        blob(xf([[-11.4, 0], [-16.4, -4.6], [-15.4, 0], [-16.4, 4.6]], 29.6, 25, rad(96), 1)) + blob(xf([[-2, -5], [2, -9], [5, -4.4]], 29.6, 25, rad(96), 1)) +
        scallops(xf([[-6, 0], [6, 0]], 29.6, 25, rad(96), 1), 1.4, 4) + dot(28.4, 15.4) + ln(xf([[9, -2], [10, 0], [9, 2]], 29.6, 25, rad(96), 1), 'zl zsoft');
      const fishW = blob(xf([[-14, 0], [-9, -5], [0, -6.6], [8, -5.4], [14.4, -1], [14.4, .8], [8, 5.4], [0, 6.6], [-9, 5]], 85, 26.4, rad(-10), 1)) +
        blob(xf([[-13.6, 0], [-19, -5], [-18, 0], [-19, 5]], 85, 26.4, rad(-10), 1)) + blob(xf([[-2, -6.2], [3, -10], [6, -5.4]], 85, 26.4, rad(-10), 1)) +
        scallops(xf([[-7, 0], [7, 0]], 85, 26.4, rad(-10), 1), 1.5, 5) + dot(95.6, 23.6) + ln(xf([[11, -2.6], [12.4, 0], [11, 2.6]], 85, 26.4, rad(-10), 1), 'zl zsoft');
      const cordA = [[31, 40], [33.6, 44], [40, 48], [47, 53.6], [54, 58]], cordB = [[67, 30], [65, 38], [62, 48], [58, 54], [54, 58]];
      const cords = ln(cordA, 'zl zcord') + ln(cordA.map(([x, y]) => [x + .8, y - .7]), 'zl zsoft') + ln(cordB, 'zl zcord') + ln(cordB.map(([x, y]) => [x + .8, y + .3]), 'zl zsoft') + ell(54, 58, 1.8, 1.3, 30);
      return sway(30, 38, fishN, 4, 7) + sway(67, 29, fishW, -3, 8) + cords;
    },
  };

  const cache = {};
  window.ShanghaiZodiac = (id, i) => { if (!ART[id]) return ''; if (!cache[id]) cache[id] = ART[id](); return `<g class="zb" style="--bd:${-(i || 0) * 1.3}s">${cache[id]}</g>`; };
  window.ShanghaiZodiac.stars = STARS;
  window.ShanghaiZodiac.css = `
.shmap .fig .zp{fill:rgba(84,128,220,.11);stroke:rgba(178,214,255,.5);stroke-width:.28;stroke-linejoin:round}
.shmap .fig .zl{fill:none;stroke:rgba(178,214,255,.4);stroke-width:.26;stroke-linecap:round;stroke-linejoin:round}
.shmap .fig .zl.zsoft{stroke:rgba(160,200,255,.26);stroke-width:.22}
.shmap .fig .zl.zcord{stroke:rgba(190,220,255,.7);stroke-width:.5}
.shmap .fig .zl.zw{stroke:rgba(140,206,255,.65);stroke-width:.5;stroke-dasharray:2.4 1.2;animation:shzw 2.6s linear infinite}
.shmap .fig .zl.zw2{animation-duration:3.2s;stroke-width:.36}.shmap .fig .zl.zw3{animation-duration:2.2s;stroke-width:.3}
.shmap .fig .zey{fill:rgba(230,240,255,.6);animation:shzblink 5s infinite;transform-box:fill-box;transform-origin:center}
.shmap .fig .zcl{fill:rgba(220,236,255,.85);animation:shztw 3s ease-in-out infinite}
.shmap .fig.lit .zp{fill:rgba(255,206,110,.09);stroke:rgba(255,228,160,.55)}.shmap .fig.lit .zl{stroke:rgba(255,226,150,.42)}.shmap .fig.lit .zl.zsoft{stroke:rgba(255,220,140,.4)}
.shmap .fig .zb{animation:shzbob 8s ease-in-out infinite;animation-delay:var(--bd,0s)}
.shmap .fig .zs{animation:shzsway var(--sd,6s) ease-in-out infinite;transform-box:view-box}
@keyframes shzbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-.6px)}}
@keyframes shzsway{0%,100%{transform:rotate(calc(var(--a) * -1))}50%{transform:rotate(var(--a))}}
@keyframes shzblink{0%,93%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes shztw{0%,100%{opacity:.35}50%{opacity:1}}
@keyframes shzw{to{stroke-dashoffset:-7.2}}
`;
})();
