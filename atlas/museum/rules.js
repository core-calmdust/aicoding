/* 所蔵品のルールコース (2026-11-23): the rules of the game played on an exhibit, taught on the exhibit itself by the museum's own
   Atlamo, ミュゼフク (musowl). Runs inside the museum's viewer through atlas/museum/play.js (AtlasMuseumPlay.start(id, { course: true }) —
   the same board, pieces, light and top-down view as a game); the words, in all 14 languages, are in museum/rules-tx-<lang>.js.
   As the portal's rules courses (claude/game-conventions-addendum.md「ルールコース」): the guide in character on every page, a task on
   the board on most pages (its line on a glowing plate), the next page by itself a moment after a right answer (not after the last),
   the voice blips while the words type out, pieces that stay put from page to page are not dropped in again, the first and the last
   page's «back» return to the case's card. AtlasMuseumRules.run(id, env) → { stop() }  (env from play.js). */
(function () {
  'use strict';
  const GUIDE = '../images/atlas/av/musowl-2.webp';
  // ---------- the courses: the position on each page, what glows, the task (its steps) ----------
  // steps: { t: 'tap', at: [ids] } · { t: 'move', from, to, cands?: [ids], cap?: [ids], swap?, then?: id } · { t: 'roll', v }   (ids: the layer's spots)
  const SN = (r, c, o) => ({ r: r || [], c: c || [], o: o || [0, 0] });   // Senet: reels (you) / cones on squares 1–30, o: borne off
  const GO = (b, w) => ({ b: b || [], w: w || [] });   // go: 紺 / 紅 stones as [i, j]
  const TF = (a, d, k) => ({ a: a || [], d: d || [], k: k || null });   // Brandubh: attackers / defenders / the king as [file, rank]
  const SG = (pts, bar) => ({ p: pts, bar: bar || [0, 0] });   // 本双六: { abs point: count (+ you, − the other side) }
  const SG0 = { 24: 2, 13: 5, 8: 3, 6: 5, 1: -2, 12: -5, 17: -3, 19: -5 };
  const C = {
    senet: [
      { set: SN([1, 3, 5, 7, 9], [2, 4, 6, 8, 10]) },
      { set: SN([], []), task: [{ t: 'tap', at: ['s30'] }], glow: ['s30'] },
      { set: SN([1, 3, 5], [2, 4, 6]), task: [{ t: 'roll', v: 5 }] },
      { set: SN([1, 3, 5], [12, 20]), sticks: 3, task: [{ t: 'move', from: 's5', to: 's8' }] },
      { set: SN([4, 6, 8], [15]), sticks: 2, task: [{ t: 'move', from: 's8', to: 's10', cands: ['s4', 's6', 's8'] }] },
      { set: SN([5, 2], [8, 14]), sticks: 3, task: [{ t: 'move', from: 's5', to: 's8', swap: true }] },
      { set: SN([3, 9], [6, 7, 20]), sticks: 3, glow: ['s6', 's7'], gcol: 0x6ec8ff, task: [{ t: 'move', from: 's9', to: 's12', cands: ['s3', 's9'] }] },
      { set: SN([4, 11], [6, 7, 8, 25]), sticks: 5, glow: ['s6', 's7', 's8'], gcol: 0xff9b7a, task: [{ t: 'move', from: 's11', to: 's16', cands: ['s4', 's11'] }] },
      { set: SN([3, 12], [20]), task: [{ t: 'roll', v: 4 }, { t: 'move', from: 's12', to: 's16' }, { t: 'roll', v: 2 }, { t: 'move', from: 's3', to: 's5' }] },
      { set: SN([23, 24], [10]), sticks: 3, glow: ['s26'], task: [{ t: 'move', from: 's23', to: 's26', cands: ['s23', 's24'] }] },
      { set: SN([26, 20], [12]), sticks: 1, glow: ['s27', 's15'], task: [{ t: 'move', from: 's26', to: 's27', then: 's15' }] },
      { set: SN([29, 28], [18]), sticks: 2, task: [{ t: 'move', from: 's29', to: 'off' }] },
      { set: SN([30], [12, 22], [4, 2]), sticks: 1, task: [{ t: 'move', from: 's30', to: 'off' }], last: true },
    ],
    shosoin: [
      { set: GO([[3, 3], [15, 15]], [[15, 3], [3, 15]]) },
      { set: GO(), glow: ['g9,9'], task: [{ t: 'tap', at: ['g9,9'], put: 1 }] },
      { set: GO([], [[9, 9]]), glow: ['g8,9', 'g10,9', 'g9,8', 'g9,10'], task: [{ t: 'tap', at: ['g8,9', 'g10,9', 'g9,8', 'g9,10'], put: 1 }] },
      { set: GO([[8, 9], [10, 9], [9, 8]], [[9, 9]]), glow: ['g9,10'], task: [{ t: 'tap', at: ['g9,10'], put: 1, cap: ['g9,9'] }] },
      { set: GO([[8, 9], [11, 9], [9, 8], [10, 8], [9, 10]], [[9, 9], [10, 9]]), glow: ['g10,10'], task: [{ t: 'tap', at: ['g10,10'], put: 1, cap: ['g9,9', 'g10,9'] }] },
      { set: GO([[4, 4]], [[8, 9], [10, 9], [9, 8], [9, 10]]), ban: ['g9,9'] },
      { set: GO([[8, 9], [9, 8], [9, 10]], [[9, 9], [11, 9], [10, 8], [10, 10]]), glow: ['g10,9'], task: [{ t: 'tap', at: ['g10,9'], put: 1, cap: ['g9,9'], banAfter: ['g9,9'] }] },
      { set: GO([[4, 14], [4, 15], [4, 16], [4, 17], [4, 18], [0, 14], [1, 14], [2, 14], [3, 14]], [[6, 12], [7, 15]]), glow: [...[0, 1, 2, 3].flatMap(i => [15, 16, 17, 18].map(j => `g${i},${j}`))], gcol: 0x6ec8ff,
        task: [{ t: 'tap', at: [...[0, 1, 2, 3].flatMap(i => [15, 16, 17, 18].map(j => `g${i},${j}`))] }] },
      { set: GO([[3, 3], [15, 15], [2, 5], [9, 9], [16, 9]], [[15, 3], [3, 15], [5, 2], [10, 10], [13, 16]]), last: true },
    ],
    sugoroku: [
      { set: SG(SG0) },
      { set: SG(SG0), glow: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], task: [{ t: 'tap', at: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'] }] },
      { set: SG(SG0), glow: ['p24'], task: [{ t: 'tap', at: ['p24'] }] },
      { set: SG(SG0), task: [{ t: 'roll', v: [3, 1] }] },
      { set: SG(SG0), dice: [3, 1], task: [{ t: 'move', from: 'p8', to: 'p5' }, { t: 'move', from: 'p6', to: 'p5' }] },
      { set: SG({ 24: 2, 13: 5, 8: 2, 6: 4, 5: 2, 1: -2, 12: -5, 17: -3, 19: -5 }), dice: [2, 2], task: [{ t: 'move', from: 'p13', to: 'p11' }, { t: 'move', from: 'p11', to: 'p9' }] },
      { set: SG({ 24: 2, 13: 5, 8: 3, 6: 5, 10: -1, 1: -1, 12: -5, 17: -3, 19: -5 }), dice: [3, 5], task: [{ t: 'move', from: 'p13', to: 'p10', cut: true }] },
      { set: SG({ 24: 1, 13: 5, 8: 3, 6: 5, 1: -2, 12: -5, 17: -3, 19: -3, 20: -2 }, [1, 0]), dice: [6, 4], glow: ['p19'], gcol: 0xff9b7a, task: [{ t: 'move', from: 'b0', to: 'p21' }] },
      { set: SG({ 1: 2, 2: 2, 3: 3, 4: 2, 5: 3, 6: 2, 8: 1, 7: -1, 19: -5, 20: -3, 21: -3, 22: -2, 23: -1 }), dice: [2, 5], glow: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'], task: [{ t: 'move', from: 'p8', to: 'p6' }], last: true },
    ],
    ballinderry: [
      { set: TF([[3, 0], [3, 1], [0, 3], [1, 3], [5, 3], [6, 3], [3, 5], [3, 6]], [[3, 2], [2, 3], [4, 3], [3, 4]], [3, 3]) },
      { set: TF([[3, 0], [3, 1], [0, 3], [1, 3], [5, 3], [6, 3], [3, 5], [3, 6]], [[3, 2], [2, 3], [4, 3], [3, 4]], [3, 3]), glow: ['t0,0', 't6,0', 't0,6', 't6,6'], task: [{ t: 'tap', at: ['t0,0', 't6,0', 't0,6', 't6,6'] }] },
      { set: TF([[3, 0], [3, 1], [0, 3], [1, 3], [5, 3], [6, 3], [3, 5], [3, 6]], [[3, 2], [2, 3], [4, 3], [3, 4]], [3, 3]), task: [{ t: 'move', from: 't3,0', to: 't1,0' }] },
      { set: TF([[1, 0], [0, 5], [6, 2]], [[1, 3], [3, 5]], [5, 1]), glow: ['t3,3'], task: [{ t: 'move', from: 't1,3', to: 't5,3' }] },
      { set: TF([[3, 0], [1, 2], [5, 5]], [[2, 2], [4, 4]], [5, 1]), task: [{ t: 'move', from: 't3,0', to: 't3,2', cap: ['t2,2'] }] },
      { set: TF([[1, 0], [5, 5], [0, 4]], [[2, 3], [4, 2]], [3, 3]), glow: ['t0,0'], gcol: 0xff9b7a, task: [{ t: 'move', from: 't2,3', to: 't2,0', cap: ['t1,0'] }] },
      { set: TF([[2, 3], [4, 3], [3, 2], [3, 6], [0, 1]], [[1, 5], [5, 1]], [3, 3]), glow: ['t3,3'], gcol: 0xff9b7a, task: [{ t: 'move', from: 't3,6', to: 't3,4', cap: ['t3,3'] }] },
      { set: TF([[1, 1], [6, 1], [4, 5]], [[5, 4], [1, 5]], [2, 1]), task: [{ t: 'move', from: 't6,1', to: 't3,1', cap: ['t2,1'] }] },
      { set: TF([[2, 3], [5, 5], [6, 2]], [[3, 2], [1, 5]], [4, 0]), glow: ['t0,0'], task: [{ t: 'move', from: 't4,0', to: 't0,0' }] },
      { set: TF([[3, 0], [3, 1], [0, 3], [1, 3], [5, 3], [6, 3], [3, 5], [3, 6]], [[3, 2], [2, 3], [4, 3], [3, 4]], [3, 3]), last: true },
    ],
  };
  // ウル (Finkel's rules, as the portal's game): the route of the near player — 1–4 own row from the 4th square to the edge, 5–12 the
  // middle row, 13–14 own row in the small block, then off. UR(own, theirs, wait, off): own / theirs on squares as [row, col]
  const UR = (a, b, w, g) => ({ a: a || [], b: b || [], w: w || [7, 7], g: g || [0, 0] });
  C.ur = [
    { set: UR() },
    { set: UR(), glow: ['c2,3', 'c2,2', 'c2,1', 'c2,0', 'c1,0', 'c1,1', 'c1,2', 'c1,3', 'c1,4', 'c1,5', 'c1,6', 'c1,7', 'c2,7', 'c2,6'], task: [{ t: 'tap', at: ['c2,3'] }] },
    { set: UR(), task: [{ t: 'roll', v: 2 }] },
    { set: UR(), udice: 2, task: [{ t: 'move', from: 'w0', to: 'c2,2' }] },
    { set: UR([[2, 2], [1, 1]], [[0, 2]], [5, 6]), udice: 3, task: [{ t: 'move', from: 'c1,1', to: 'c1,4' }] },
    { set: UR([[2, 3], [2, 0]], [[0, 1]], [5, 6]), udice: 3, task: [{ t: 'move', from: 'c2,0', to: 'c1,2', cands: ['c2,3', 'c2,0'] }] },
    { set: UR([[1, 2], [2, 3]], [[1, 5], [0, 0]], [5, 5]), udice: 3, task: [{ t: 'move', from: 'c1,2', to: 'c1,5', cut: true }] },
    { set: UR([[2, 1], [1, 5]], [[0, 3]], [5, 6]), glow: ['c2,0', 'c1,3', 'c2,6', 'c0,0', 'c0,6'], task: [{ t: 'roll', v: 1 }, { t: 'move', from: 'c2,1', to: 'c2,0' }, { t: 'roll', v: 3 }, { t: 'move', from: 'c2,0', to: 'c1,2' }] },
    { set: UR([[1, 1], [2, 3]], [[1, 3]], [5, 6]), udice: 2, glow: ['c1,3'], gcol: 0xff9b7a, task: [{ t: 'move', from: 'c2,3', to: 'c2,1', cands: ['c1,1', 'c2,3'] }] },
    { set: UR([[2, 7]], [[1, 6], [0, 6]], [0, 3], [6, 2]), udice: 2, task: [{ t: 'move', from: 'c2,7', to: 'off' }], last: true },
  ];
  const has = id => !!C[id];

  // ---------- the boards: where a piece stands, how to make one, what a tap hits ----------
  function layer(id, B, TH) {
    const U = B.userData;
    if (id === 'senet') {
      const K = U.kit, S3 = U.S3, Y = U.top;
      return { R: .48, sc: .42, base: Y,
        pos(loc) { if (loc[0] === 'o') { const [s, k] = loc.slice(1).split(':').map(Number); return K.slot(s, k); } const [x, z] = U.pt(+loc.slice(1)); return [x, Y, z]; },
        spot(t) { if (t === 'off') return K.slot(0, 0); const [x, z] = U.pt(+t.slice(1)); return [x, Y, z]; },
        make: kind => S3.piece(kind),
        list(s) { const L = []; s.r.forEach(q => L.push(['s' + q, 0])); s.c.forEach(q => L.push(['s' + q, 1])); for (const sd of [0, 1]) for (let k = 0; k < s.o[sd]; k++) L.push([`o${sd}:${k}`, sd]); return L; },
        hit(x, z) { let best = null, bd = .5 * .5; for (let q = 1; q <= 30; q++) { const [px, pz] = U.pt(q), d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = 's' + q; } } const o = K.slot(0, 2); if ((o[0] - x) ** 2 + (o[2] - z) ** 2 < 1.6) best = 'off'; return best; },
        offLoc: (pieces, sd) => `o${sd}:${pieces.filter(p => p.loc[0] === 'o' && +p.loc[1] === sd).length}` };
    }
    if (id === 'shosoin') {
      const Y = U.top, c = U.cell;
      const ij = t => t.slice(1).split(',').map(Number);
      return { R: c * .5, sc: c * .48, base: Y,
        pos(loc) { const [i, j] = ij(loc), [x, z] = U.pt(i, j); return [x, Y, z]; }, spot(t) { return this.pos(t); },
        make: kind => { const m = U.GB.stone(kind, c, Math.random() * 99 | 0); const g = new TH.Group(); g.add(m); return g; },
        list(s) { return s.b.map(([i, j]) => [`g${i},${j}`, 1]).concat(s.w.map(([i, j]) => [`g${i},${j}`, 2])); },
        hit(x, z) { const i = Math.round(x / c + (U.n - 1) / 2), j = Math.round(z / c + (U.n - 1) / 2); return i < 0 || j < 0 || i >= U.n || j >= U.n ? null : `g${i},${j}`; } };
    }
    if (id === 'ballinderry') {
      const Y = U.top;
      const fr = t => t.slice(1).split(',').map(Number);
      return { R: U.cs * .5, sc: U.cs * .46, base: Y,
        pos(loc) { const [f, r] = fr(loc), [x, z] = U.cell(f, r); return [x, Y, z]; }, spot(t) { return this.pos(t); },
        make: kind => U.piece(kind),
        list(s) { return s.a.map(([f, r]) => [`t${f},${r}`, 1]).concat(s.d.map(([f, r]) => [`t${f},${r}`, 2]), s.k ? [[`t${s.k[0]},${s.k[1]}`, 3]] : []); },
        hit(x, z) { let best = null, bd = (U.cs * .7) ** 2; for (let r = 0; r < 7; r++) for (let f = 0; f < 7; f++) { const [px, pz] = U.cell(f, r), d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = `t${f},${r}`; } } return best; } };
    }
    if (id === 'ur') {   // the exhibit's own model: squares (U.pt), the waiting pieces beside the big block (U.start), the finished in the notch (U.goal)
      const Y = U.top, rc = t => t.slice(1).split(',').map(Number);
      const pos = loc => { const [k0, k] = loc.split(':'); if (loc[0] === 'w') { const [x, z] = U.start(+k0[1], +k); return [x, 0, z]; } if (loc[0] === 'g') return U.goal(+k0[1], +k); const [r, c] = rc(k0), [x, z] = U.pt(r, c); return [x, Y, z]; };
      return { R: U.U * .5, sc: U.U * .45, base: Y,
        pos, spot(t) { if (t === 'off') return U.goal(0, 0); if (t[0] === 'w') { const [x, z] = U.start(+t[1], 6); return [x, 0, z]; } return pos(t); },
        make: kind => U.piece(kind),
        list(s) { const L = []; s.a.forEach(([r, c]) => L.push([`c${r},${c}`, 0])); s.b.forEach(([r, c]) => L.push([`c${r},${c}`, 1]));
          for (const sd of [0, 1]) { for (let k = 0; k < s.w[sd]; k++) L.push([`w${sd}:${k}`, sd]); for (let k = 0; k < s.g[sd]; k++) L.push([`g${sd}:${k}`, sd]); } return L; },
        hit(x, z) { let best = null, bd = (U.U * .62) ** 2; for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) { if (U.exists && !U.exists(r, c)) continue; const [px, pz] = U.pt(r, c), d = (px - x) ** 2 + (pz - z) ** 2; if (d < bd) { bd = d; best = `c${r},${c}`; } }
          if (best) return best; const [gx, , gz] = U.goal(0, 0); if ((gx - x) ** 2 + (gz - z) ** 2 < (U.U * .9) ** 2) return 'off';
          for (let k = 0; k < 7; k++) { const [sx, sz] = U.start(0, k); if ((sx - x) ** 2 + (sz - z) ** 2 < (U.U * .45) ** 2) return 'w0'; } return null; },
        ringH: (U.PH || .3) + .02,
        offLoc: pieces => `g0:${pieces.filter(p => p.loc.startsWith('g0:')).length}`,
        cutLoc: pieces => `w1:${pieces.filter(p => p.loc.startsWith('w1:')).length}` };
    }
    // 本双六: a point's stones line up from its flower (U.slot), the middle strip (U.bar)
    const Y = U.top;
    return { R: 2, sc: 1.35, base: Y, stack: true,
      pos(loc) { const [a, k] = loc.slice(1).split(':'); return loc[0] === 'b' ? U.bar(+a, +k) : U.slot(+a, +k); },
      spot(t) { return t[0] === 'b' ? U.bar(+t.slice(1), 0) : U.slot(+t.slice(1), 0); },
      make: kind => { const g = new TH.Group(); g.add(U.stone(kind)); return g; },
      list(s) { const L = []; for (const a in s.p) { const n = s.p[a]; for (let k = 0; k < Math.abs(n); k++) L.push([`p${a}:${k}`, n > 0 ? 0 : 1]); } for (const sd of [0, 1]) for (let k = 0; k < s.bar[sd]; k++) L.push([`b${sd}:${k}`, sd]); return L; },
      hit(x, z) { const h = U.hit(x, z); return h < 0 ? null : h === 0 ? 'b0' : 'p' + h; } };
  }

  // ---------- the course ----------
  function run(id, env) {
    const TX = (window.AtlasMuseumRulesTX || {}), T = Object.assign({}, TX.en || {}, TX[env.lang] || {}), UI = Object.assign({}, (TX.en || {}).ui, (TX[env.lang] || {}).ui);
    const RTL = env.lang === 'ar', AL = RTL ? '▶' : '◀', AR = RTL ? '◀' : '▶', PAGES = C[id], W = (T[id] || (TX.en || {})[id] || []), TH = env.TH, B = env.board, V = env.V, LY = layer(id, B, TH);
    try { localStorage.setItem('aicoding-museum-' + id + '-rules-seen', '1'); } catch (e) {}
    let stopped = false, step = 0, si = 0, busy = false, sel = null, timers = [], typeT = 0, autoT = 0;
    const later = (f, ms) => { const h = setTimeout(() => { if (!stopped) f(); }, ms); timers.push(h); return h; };
    const kick = () => env.T3.kick();
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); kick(); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;

    // pieces: kept from page to page where they stay (only new ones come down from above, gone ones are lifted away)
    const PG = new TH.Group(); B.add(PG);
    let pieces = [];   // { loc, kind, m }
    function setPieces(list, instant) {
      const keep = [], want = list.slice();
      pieces.forEach(p => { const i = want.findIndex(([l, k]) => l === p.loc && k === p.kind); if (i >= 0) { keep.push(p); want.splice(i, 1); } else { const m = p.m, y0 = m.position.y; anim(260, k => { m.position.y = y0 + k * 2 * LY.sc; m.scale.setScalar(1 - k * .6); }).then(() => PG.remove(m)); } });
      want.forEach(([loc, kind], n) => { const m = LY.make(kind); m.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); const [x, y, z] = LY.pos(loc); PG.add(m); keep.push({ loc, kind, m });
        if (instant) { m.position.set(x, y, z); return; }
        m.position.set(x, y + 4 * LY.sc, z); later(() => anim(380, k => { m.position.y = y + (1 - io(k)) * 4 * LY.sc; }), 40 * n); });
      pieces = keep; kick();
    }
    const at = loc => pieces.filter(p => p.loc === loc || p.loc.startsWith(loc + ':')).sort((a, b) => (+b.loc.split(':')[1] || 0) - (+a.loc.split(':')[1] || 0))[0];
    const count = pre => pieces.filter(p => p.loc.startsWith(pre + ':')).length;
    async function hop(p, loc, h) { const a = p.m.position.clone(), b = new TH.Vector3(...LY.pos(loc)); p.loc = loc;
      await anim(Math.min(620, 300 + a.distanceTo(b) / LY.sc * 40), k => { const e = io(k); p.m.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e + Math.sin(k * Math.PI) * (h || 2.2) * LY.sc, a.z + (b.z - a.z) * e); }); SND.put(); }
    function lift(p) { pieces = pieces.filter(q => q !== p); const m = p.m, y0 = m.position.y; SND.take(); return anim(360, k => { m.position.y = y0 + k * 3 * LY.sc; m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 1 - k; } }); }).then(() => PG.remove(m)); }

    // the throwing things: Senet's four casting sticks on the plinth, the 本双六's two ivory dice on the board
    let sticks = null, dice = null;
    function showSticks(n) {   // n: how many light faces up (5 = none)
      const U = B.userData; if (!sticks) { sticks = [0, 1, 2, 3].map(i => { const s = U.S3.stick(), [x, z] = U.kit.stickAt(0, i); s.position.set(x, U.S3.STK.Th / 2, z); PG.add(s); return s; }); }
      const L = n >= 5 ? 0 : n; sticks.forEach((s, i) => U.S3.stickUp(s, i < L, U.kit.yaw ? U.kit.yaw(i) : 0)); kick(); }
    async function throwSticks(n) { SND.roll(); const L = n >= 5 ? 0 : n, U = B.userData; showSticks(n); const base = sticks.map(s => s.position.clone()), fl = [1, 3, 0, 2].map(i => i < L);
      await anim(780, k => sticks.forEach((s, i) => { const q = Math.min(1, Math.max(0, k * 1.15 - i * .05)); s.position.set(base[i].x, base[i].y + Math.sin(q * Math.PI) * 1.4, base[i].z + (1 - q) * 1.6); s.userData.body.rotation.z = (fl[i] ? 0 : Math.PI) + (1 - q) * 6 * Math.PI; }));
      sticks.forEach((s, i) => { s.position.copy(base[i]); U.S3.stickUp(s, i < L, U.kit.yaw ? U.kit.yaw(i) : 0); }); kick(); }
    const UP = { 1: [0, 0, Math.PI / 2], 2: [0, 0, 0], 3: [-Math.PI / 2, 0, 0], 4: [Math.PI / 2, 0, 0], 5: [Math.PI, 0, 0], 6: [0, 0, -Math.PI / 2] };
    function showDice(v) { const U = B.userData; if (!dice) dice = [0, 1].map(() => { const d = U.die(); PG.add(d); return d; });
      dice.forEach((d, i) => { if (!v) { d.visible = false; return; } d.visible = true; const [x, z] = U.diceAt(0, i); d.position.set(x, U.top + .68, z); d.rotation.set(UP[v[i]][0], (i ? -.3 : .25), UP[v[i]][2]); }); kick(); }
    async function rollDice(v) { SND.roll(); showDice(v); const U = B.userData, r0 = dice.map(() => [Math.random() * 9, Math.random() * 9, Math.random() * 9]);
      await anim(820, k => dice.forEach((d, i) => { const q = Math.min(1, Math.max(0, k * 1.1 - i * .08)), e = 1 - Math.pow(1 - q, 2.6), [x, z] = U.diceAt(0, i); d.position.set(x, U.top + .68 + Math.sin(q * Math.PI) * 4, z + (1 - e) * 8); d.rotation.set(UP[v[i]][0] + r0[i][0] * (1 - e), (i ? -.3 : .25) + r0[i][1] * (1 - e), UP[v[i]][2] + r0[i][2] * (1 - e)); }));
      showDice(v); }

    // ウル: the four tetrahedral dice of the near side beside the small block; n marked (white) tips up
    let udice = null;
    function showUDice(n) { const U = B.userData; if (!udice) udice = [0, 1, 2, 3].map(() => { const d = U.die(); PG.add(d); return d; });
      udice.forEach((d, i) => { if (n == null) { d.visible = false; return; } d.visible = true; const [x, z] = U.diceAt(0, i); d.position.set(x, U.dieRest, z); U.dieUp(d, i < n, i * 1.3); }); kick(); }
    async function rollUDice(n) { SND.roll(); showUDice(n); const U = B.userData, q0 = udice.map(d => d.quaternion.clone()), r0 = udice.map(() => [Math.random() * 7, Math.random() * 7]);
      await anim(780, k => udice.forEach((d, i) => { const q = Math.min(1, Math.max(0, k * 1.12 - i * .04)), e = 1 - Math.pow(1 - q, 2.4), [x, z] = U.diceAt(0, i);
        d.position.set(x, U.dieRest + Math.sin(q * Math.PI) * U.U * .9, z + (1 - e) * U.U * 1.4); d.quaternion.copy(q0[i]); d.rotateX(r0[i][0] * (1 - e)); d.rotateY(r0[i][1] * (1 - e)); }));
      showUDice(n); }
    // marks: what glows (the page's own squares), the pieces to pick and the places to go, a ✕ for a point that may not be played
    const MG = new TH.Group(); B.add(MG);
    const mat = (c, op) => new TH.MeshBasicMaterial({ color: c, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const RING = new TH.TorusGeometry(1, .09, 8, 40); RING.rotateX(Math.PI / 2);
    const DISC = new TH.CircleGeometry(1, 36); DISC.rotateX(-Math.PI / 2);
    const BAR = new TH.BoxGeometry(1.5, .04, .2);
    const pulse = []; let pulseOn = false;
    function pulseLoop() { if (stopped || !pulse.length) { pulseOn = false; return; } const k = .5 + .5 * Math.sin(performance.now() / 280); pulse.forEach(m => { m.scale.setScalar(m.userData.s * (.92 + k * .14)); m.material.opacity = m.userData.o * (.65 + k * .35); }); kick(); setTimeout(() => requestAnimationFrame(pulseLoop), 50); }
    function mark(kind, t, col) {
      const [x, y, z] = LY.spot(t), s = LY.sc, p = kind === 'ring' ? at(t) : null, py = p ? p.m.position.y + (LY.ringH != null ? LY.ringH : B.userData.S3 ? .5 : 1.1) : y;
      let m;
      if (kind === 'ban') { m = new TH.Group(); [1, -1].forEach(a => { const b = new TH.Mesh(BAR, mat(0xff5d5d, .95)); b.rotation.y = a * Math.PI / 4; m.add(b); }); m.scale.setScalar(s * 1.2); m.position.set(x, y + .03 * s, z); MG.add(m); return; }
      m = new TH.Mesh(kind === 'ring' ? RING : DISC, mat(col, kind === 'ring' ? .95 : kind === 'dest' ? .6 : .4)); m.userData.s = s * (kind === 'ring' ? 1.05 : .95); m.userData.o = m.material.opacity;
      m.scale.setScalar(m.userData.s); m.position.set(p ? p.m.position.x : x, (kind === 'ring' ? py : y) + .03 * s, p ? p.m.position.z : z); m.renderOrder = 3; MG.add(m);
      if (kind !== 'glow') { pulse.push(m); if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulseLoop); } }
    }
    const clearMarks = () => { while (MG.children.length) MG.remove(MG.children[0]); pulse.length = 0; kick(); };
    function marks() {
      clearMarks(); const P = PAGES[step], st = P.task && P.task[si];
      (P.glow || []).forEach(t => mark('glow', t, P.gcol || 0xffd65a)); (P.ban || []).concat(xban).forEach(t => mark('ban', t));
      if (!st || done) return;
      if (st.t === 'tap') st.at.forEach(t => mark('dest', t, 0x3df59a));
      if (st.t === 'move') { if (sel == null) (st.cands || [st.from]).forEach(t => mark('ring', t, 0xffd65a)); else { mark('ring', st.from, 0x3df59a); mark('dest', st.to, 0x3df59a); } }
    }

    // ---------- the guide's panel ----------
    const el = document.createElement('div'); el.className = 'exrul';
    el.innerHTML = `<div class="exrul-in"><div class="exrul-g"><img src="${GUIDE}" alt=""></div><div class="exrul-b"><div class="exrul-h"><b>${esc(UI.name || '')}</b><span class="pg"></span></div><div class="exrul-t"></div><div class="exrul-k" hidden></div><div class="exrul-m" aria-live="polite"></div></div></div>
      <div class="exrul-a"><button type="button" data-a="back">${AL} ${esc(UI.back || '')}</button><span class="dots">${PAGES.map(() => '<i></i>').join('')}</span><button type="button" class="go" data-a="next">${esc(UI.next || '')} ${AR}</button></div>`;
    env.stage.appendChild(el);
    const $ = s => el.querySelector(s);
    let AC = null; const blip = () => { try { if (localStorage.getItem('atlas-sfx') === '0') return; AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (AC.state === 'suspended') AC.resume(); const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(560 + Math.random() * 220, t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.035, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + .05); o.connect(g).connect(AC.destination); o.start(t); o.stop(t + .06); } catch (e) {} };
    function say(html) {
      const tx = $('.exrul-t'); tx.innerHTML = window.TapWord ? TapWord.fix(html) : html; clearInterval(typeT);
      const nodes = []; (function walk(nd) { nd.childNodes.forEach(c => { if (c.nodeType === 3) nodes.push([c, c.textContent]); else walk(c); }); })(tx);
      nodes.forEach(([nd]) => { nd.textContent = ''; }); let ni = 0, ci = 0, bc = 0;
      typeT = setInterval(() => { if (stopped) return clearInterval(typeT); for (let q = 0; q < 2; q++) { if (ni >= nodes.length) return clearInterval(typeT); const [nd, s] = nodes[ni], ch = s[ci]; nd.textContent = s.slice(0, ++ci); if (ch && !/[\s、。，．,.!?！？…—「」（）()]/.test(ch) && bc++ % 3 === 0) blip(); if (ci >= s.length) { ni++; ci = 0; } } }, 28);
      tx.onclick = () => { clearInterval(typeT); nodes.forEach(([nd, s]) => { nd.textContent = s; }); };
      const g = $('.exrul-g'); g.classList.remove('talk'); void g.offsetWidth; g.classList.add('talk');
    }
    const plate = s => { const k = $('.exrul-k'); k.hidden = !s; k.innerHTML = s ? '👆 ' + (window.TapWord ? TapWord.fix(s) : s) : ''; };
    let msgT = 0; const msg = s => { const m = $('.exrul-m'); m.textContent = s || ''; m.classList.toggle('on', !!s); clearTimeout(msgT); if (s) msgT = later(() => m.classList.remove('on'), 1800); };
    const words = () => W[step] || ['', '', ''];
    const kOf = () => { const k = words()[1], n = (PAGES[step].task || []).length; if (!Array.isArray(k)) return k; return k.length === n ? k[si] : k[sel == null ? 0 : 1] || k[0]; };   // (one line per step, or for a single move: which piece, then where)
    let done = false, xban = [];

    function show(n) {
      clearTimeout(autoT); step = Math.max(0, Math.min(PAGES.length - 1, n)); si = 0; sel = null; done = false; xban = [];
      const P = PAGES[step];
      setPieces(LY.list(P.set));
      if (id === 'senet') { showSticks(P.sticks || 5); sticks.forEach(s => { s.visible = step >= 2; }); }
      if (id === 'sugoroku') showDice(P.dice || (P.task && P.task[0].t === 'roll' ? [5, 2] : null));
      if (id === 'ur') showUDice(P.udice != null ? P.udice : P.task && P.task[0].t === 'roll' ? 0 : null);
      say(words()[0]); plate(P.task ? kOf() : '');
      $('.pg').textContent = ` ${step + 1} / ${PAGES.length}`;
      el.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i === step));
      $('[data-a="next"]').textContent = (P.last ? UI.play || '' : UI.next || '') + ' ' + AR; $('[data-a="next"]').classList.toggle('last', !!P.last);
      marks(); { const ph = el.offsetHeight; if (env.relayout && Math.abs(ph - (el._ph || 0)) > 10) { el._ph = ph; env.relayout(); } }
    }
    async function finishStep() {
      const P = PAGES[step]; si++; sel = null;
      if (si < P.task.length) { plate(kOf()); marks(); if (P.task[si].t === 'roll') { /* waits for the tap */ } return; }
      done = true; marks(); plate(''); say(words()[2] || ''); SND.ok();
      if (!P.last) { const len = String(words()[2] || '').replace(/<[^>]+>/g, '').length; autoT = later(() => show(step + 1), Math.min(4800, 1600 + len * 45)); }
    }
    async function doStep(st, t) {
      busy = true; clearMarks();
      if (st.t === 'roll') { if (id === 'senet') await throwSticks(st.v); else if (id === 'ur') await rollUDice(st.v); else await rollDice(st.v); }
      else if (st.t === 'tap') { if (st.put) { const p = { loc: t, kind: st.put, m: LY.make(st.put) }; const [x, y, z] = LY.pos(t); p.m.position.set(x, y + 3 * LY.sc, z); PG.add(p.m); pieces.push(p); SND.put(); await anim(260, k => { p.m.position.y = y + (1 - io(k)) * 3 * LY.sc; });
          if (st.cap) { await Promise.all(st.cap.map(c => { const q = at(c); return q ? lift(q) : 0; })); }
          if (st.banAfter) xban = st.banAfter; } }
      else if (st.t === 'move') {
        const p = at(st.from); if (p) {
          const vic = st.swap || st.cut ? at(st.to) : null;
          let loc = st.to;
          if (st.to === 'off') loc = LY.offLoc(pieces, 0);
          else if (LY.stack) loc = `${st.to}:${count(st.to) - (vic ? 1 : 0)}`;
          if (vic) pieces = pieces.filter(q => q !== vic);
          await hop(p, loc);
          if (st.swap) { pieces.push(vic); await hop(vic, st.from.startsWith('s') ? st.from : st.from); }
          if (st.cut) { pieces.push(vic); SND.take(); await hop(vic, LY.cutLoc ? LY.cutLoc(pieces) : `b1:${count('b1')}`, 3); }
          if (st.cap) await Promise.all(st.cap.map(c => { const q = at(c); return q ? lift(q) : 0; }));
          if (st.then) { await new Promise(r => later(r, 250)); SND.water(); await hop(p, st.then, 1.2); }
        } }
      busy = false; if (!stopped) finishStep();
    }
    function onTap(e) {
      if (e.target.closest && e.target.closest('button,a,.exrul,.expcard,.exbtns,.exhud,.exinfo')) return;
      if (stopped || busy || done) return; if (env.T3.wasDrag && env.T3.wasDrag()) return;
      const P = PAGES[step], st = P.task && P.task[si]; if (!st) return;
      if (st.t === 'roll') return doStep(st);
      const q = env.T3.pick(e, LY.base); if (!q) return; const t = LY.hit(q.x, q.z);
      if (st.t === 'tap') { if (st.at.includes(t)) doStep(st, t); else { msg(UI.nope); SND.nope(); } return; }
      if (st.t === 'move') {
        if (sel == null) { if (t === st.from) { sel = t; plate(kOf()); marks(); SND.pick(); } else if ((st.cands || []).includes(t)) { msg(UI.cant); SND.nope(); } else { msg(UI.pickIt); SND.nope(); } return; }
        if (t === st.to || (st.to === 'off' && t === 'off')) return doStep(st);
        if (t === st.from) { sel = null; marks(); return; }
        msg(UI.nope); SND.nope();
      }
    }
    env.stage.addEventListener('click', onTap);
    el.addEventListener('click', e => e.stopPropagation());
    $('[data-a="next"]').onclick = () => { if (PAGES[step].last) { if (env.onPlay) env.onPlay(); return; } show(step + 1); };
    $('[data-a="back"]').onclick = () => { if (step === 0 || PAGES[step].last) { if (env.onExit) env.onExit(); return; } show(step - 1); };   // (the first and the last page: back to the card)
    const SND = (() => { const tone = (f0, f1, d, v, ty) => { try { if (localStorage.getItem('atlas-sfx') === '0') return; const a = AC = AC || window.__atlasAC || (window.__atlasAC = new (window.AudioContext || window.webkitAudioContext)()); if (a.state === 'suspended') a.resume(); const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.type = ty || 'sine'; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + .02); } catch (e) {} };
      return { put: () => tone(1500, 800, .07, .06, 'triangle'), pick: () => tone(900, 1200, .06, .04, 'triangle'), take: () => tone(600, 260, .22, .07), roll: () => { for (let i = 0; i < 5; i++) setTimeout(() => tone(1200 + Math.random() * 600, 700, .04, .04, 'triangle'), i * 60); },
        water: () => tone(420, 160, .45, .07), nope: () => tone(260, 200, .16, .05), ok: () => { tone(988, 0, .18, .06, 'triangle'); setTimeout(() => tone(1319, 0, .32, .06, 'triangle'), 140); } }; })();
    show(0);
    return {
      stop() { stopped = true; clearInterval(typeT); clearTimeout(autoT); timers.forEach(clearTimeout); env.stage.removeEventListener('click', onTap); el.remove(); B.remove(PG); B.remove(MG); },
      panel: el, _debug: { step: () => step, si: () => si, show, page: () => PAGES[step], done: () => done, busy: () => busy, spot: t => { const v = new TH.Vector3(...LY.spot(t)).applyMatrix4(B.matrix); return env.T3.project(v.x, v.z, v.y); }, piece: t => { const p = at(t); if (!p) return null; const v = p.m.position.clone().applyMatrix4(B.matrix); return env.T3.project(v.x, v.z, v.y); } },
    };
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  window.AtlasMuseumRules = { run, has };
})();
