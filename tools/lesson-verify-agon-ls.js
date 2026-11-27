#!/usr/bin/env node
// (2026-11-27 担当F) Agon lessons on the 3D table (atlas/ls-agon.js READY; the same agon/lessons.json as the 2D): every problem of
// the READY lessons against claude/lesson-quality.md ①〜⑨ and the 追N that bear on it (accepted-move lists: 20 / 0 points =
// agon/app.js problemPoints, the 3D points). The facts are recounted here on the board, not read from agon/ls-facts.js.
//  ① ok = every move that does what the lesson asks and nothing else, best = ok[0], all legal, a normal move turn (no relocation):
//     b_step — a step one ring inwards after which no enemy move captures anything of the mover's;
//     b_capture — a move that captures;
//     b_throne — a step of the queen one ring inwards (onto the throne or next to it) after which no enemy move captures anything;
//     b_reloc — (a relocation turn: one captured guard of the side to move, none of the enemy's) the edge cell after which no
//     enemy move captures anything.
//  ② one answer only (ok has one move).
//  ③ 10 legal moves or more, 3 wrong moves or more, 追72 the answer ≤ a third of the moves; the hint (agon/ls-facts.js hint, 2D
//     and 3D) rings 2 pieces or more, the answer's piece among them (追52: never the answer's piece alone).
//  ④ b_step: no capture for the side to move (not a capture lesson), the queen off ring 1 (no throne move), every step inwards
//     but the answer is sandwiched by the enemy's next move (2 or more of them: the meaningful mistake) and 3 steps along a ring
//     or more; b_capture: the answer takes one guard (the words: a guard goes back to the edge), 2 moves or more land next to an
//     enemy piece without a capture; b_throne: no capture for the side to move, the queen on ring 1 or 2, the throne empty; ring 2:
//     every other step of the queen inwards is sandwiched by the enemy's next move (1 or more: the meaningful mistake); ring 1: an
//     enemy piece next to the throne (the words: "even with an enemy piece next to her"); b_reloc: with the captured guard off the
//     board the enemy has a capture, every such capture steps into the answer's cell (an edge cell) and takes the same one guard
//     of yours (the words: "another guard"), 1 relocation or more is sandwiched by the enemy's next move (the meaningful mistake).
//  ⑤ no two positions the same or 4 cells apart under the board's 12 symmetries, each with the colours swapped too — against
//     every lesson problem, ramp and puzzle (agon/puzzles.json).
//  ⑥ d = wrong moves + 2 × near misses (b_step: the sandwiched steps inwards, b_capture: the moves next to an enemy piece,
//     b_reloc: the relocations sandwiched at once):
//     strictly rising through the lesson (b_throne: the queen's sandwiched steps inwards and her steps along the ring).
//  ⑦⑧ the words for every legal move: 3D ja (キンダイスン, every line of every list), the other languages' 2D words as the 3D
//     says them, the 2D's key — each kind of line checked against the recount (a step along the ring / a step inwards sandwiched
//     by the gold move — the enemy move given captures the moved piece / no enemy piece next to the cell / the cells beyond the
//     touched enemy pieces: empty, the edge, an enemy); no {…} left; 追66・追68 no closeness word on a 0-point move; 追20 no praise
//     after a wrong move.
//  ⑨ the 2D (agon/app.js) words a wrong move through AgonLsFacts and rings the hint's pieces, agon/index.html loads
//     agon/ls-facts.js, the 14 languages have the keys with their placeholders ({x} / {m}, b_step.ng {r}).
//  追75 / 追14 the ramps of these lessons (2D): a try's right moves are legal moves of its board and are every move that does
//     what it asks, its look cells are pieces of the side to move; b_step's explain marks: 'ok' the cells its piece can step to,
//     'ng' cells one ring out; b_capture's explain line is legal and captures the marked piece.
// Usage: node tools/lesson-verify-agon-ls.js [--selftest]   (also: node tools/lesson-verify.js agon)
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const E = require(path.join(ROOT, 'agon/engine.js'));
const F = require(path.join(ROOT, 'agon/ls-facts.js'));
const LS = require(path.join(ROOT, 'atlas/ls-agon.js'));
E.setRule('std');
const LANGS = ['ja', 'en', 'zh', 'zh-TW', 'ko', 'es', 'fr', 'pt', 'de', 'ru', 'tr', 'id', 'hi', 'ar'];
const N = 91;
const MAPS = (() => { const out = []; for (let f = 0; f < 2; f++) for (let k = 0; k < 6; k++) { const mp = []; for (let i = 0; i < N; i++) { let q = E.Q[i], r = E.RR[i]; if (f) [q, r] = [r, q]; for (let j = 0; j < k; j++) [q, r] = [-r, q + r]; mp.push(E.at(q, r)); } out.push(mp); } return out; })();
const SW = { w: 'b', W: 'B', b: 'w', B: 'W', x: 'y', X: 'Y', y: 'x', Y: 'X', '.': '.' };
const sym = (b, mp, sw) => { const o = Array(N).fill('.'); for (let i = 0; i < N; i++) o[mp[i]] = sw ? SW[b[i]] : b[i]; return o.join(''); };
const diff = (a, b) => { let n = 0; for (let i = 0; i < N; i++) if (a[i] !== b[i]) n++; return n; };
const near = (A, B) => MAPS.some(mp => [false, true].some(sw => { const x = sym(B.b, mp, sw), s = sw ? 3 - B.side : B.side; const d = diff(A.b, x); return d <= 4 && (d > 0 || s === A.side); }));
const enemyOf = (p, i) => { const o = p.owner(i); return o && o !== p.side + 1; };
// the recount (independent of agon/ls-facts.js)
function sandwiches(p, m) {   // the pieces move m captures: an enemy piece next to the landing cell with a mover's piece right beyond it
  const f = E.mFrom(m), t = E.mTo(m), out = [];
  for (let d = 0; d < 6; d++) { const a = E.NB[t][d]; if (a < 0 || !enemyOf(p, a) || p.captured(a)) continue; const b = E.NB[a][d]; if (b >= 0 && b !== f && p.owner(b) === p.side + 1) out.push(a); }
  return out;
}
function refThreats(spec) {   // b_reloc: the enemy's captures with the captured guard off the board
  const r = E.Pos.from({ b: spec.b.replace(/[xyXY]/g, '.'), side: 3 - spec.side, n: spec.n });
  return r.phase() === 'move' ? r.moves().map(m => [m, sandwiches(r, m)]).filter(x => x[1].length) : [];
}
function recount(id, spec, m) {
  const p = E.Pos.from(spec), f = E.mFrom(m), t = E.mTo(m);
  if (id === 'b_step') {
    if (E.RING[t] !== E.RING[f] - 1) return { k: 'side' };
    const q = p.clone().play(m), caps = q.moves().map(r => [r, sandwiches(q, r)]);
    const on = caps.filter(([, c]) => c.includes(t));
    if (on.length) return { k: 'trap', reps: on.map(x => x[0]) };
    return caps.some(([, c]) => c.length) ? { k: 'trapOther' } : { k: 'ok' };
  }
  if (id === 'b_throne') {
    if (!p.isQueen(f)) return { k: 'guard' };
    if (E.RING[t] !== E.RING[f] - 1) return { k: 'side' };
    const q = p.clone().play(m), caps = q.moves().map(r => [r, sandwiches(q, r)]);
    const on = caps.filter(([, c]) => c.includes(t));
    if (on.length) return { k: 'trap', reps: on.map(x => x[0]) };
    return caps.some(([, c]) => c.length) ? { k: 'trapOther' } : { k: 'ok', throne: t === E.CENTER };
  }
  if (id === 'b_reloc') {
    const q = p.clone().play(m), caps = q.moves().map(r => [r, sandwiches(q, r)]);
    const on = caps.filter(([, c]) => c.includes(t));
    if (on.length) return { k: 'trap', reps: on.map(x => x[0]) };
    const oth = caps.filter(([, c]) => c.length);
    if (oth.length) return { k: 'open', reps: oth.map(x => x[0]), vs: [...new Set(oth.flatMap(x => x[1]))] };
    return { k: 'ok', block: refThreats(spec).some(([r]) => E.mTo(r) === t) };
  }
  if (id === 'b_capture') {
    const c = sandwiches(p, m); if (c.length) return { k: 'ok', c };
    const ends = new Set();
    for (let d = 0; d < 6; d++) { const a = E.NB[t][d]; if (a < 0 || !enemyOf(p, a)) continue; const b = E.NB[a][d]; ends.add(b < 0 ? 'edge' : b === f || !p.at(b) ? 'empty' : p.owner(b) === p.side + 1 ? 'mine' : 'enemy'); }
    return ends.size ? { k: 'touch', ends: [...ends] } : { k: 'none' };
  }
  return { k: '?' };
}
function loadI18n() { const w = { I18N: { ja: {}, en: {} } }; for (const f of ['i18n-ag.js', 'i18n-ag-more.js']) new Function('window', 'I18N', fs.readFileSync(path.join(ROOT, 'agon', f), 'utf8'))(w, w.I18N); return w.I18N; }
const CLOSE = /おしい|惜しい|あと一歩|いい線|あと少し|もう少し/, PRAISE = /正解|お見事|ばっちり|さすが|いいね/;
// ⑦⑧ the ja lines by kind: what each must (re) say
const JA_NEED = { rtrap: /金色/, ropen: /金色[\s\S]*(別の|ほかの|もう1枚の)ガード|ガードがもう1枚|(別の|ほかの)ガード[\s\S]*金色/, guard: /ガード/, qside: /横|同じ輪/, qtrap: /金色/, side: /横|同じ輪/, trap: /金色/, none: /いない|届かない|くっついていない/, empty: /空/, edge: /はし|盤の外/, enemy: /相手の駒(が2枚|の向こうも相手|が続いて)|向こうにも相手/, mixed: /どの|どれも/ };
function verify(opt) {
  opt = opt || {};
  const out = [], add = (id, q, msg) => out.push({ id, q, msg });
  const d = opt.data || JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/lessons.json'), 'utf8'));
  const PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/puzzles.json'), 'utf8'));
  const I18N = opt.i18n || loadI18n();
  const JA = opt.ja || LS.JA;
  // every position for ⑤
  const all = [];
  (function walk(o, tag) { if (o && typeof o === 'object') { if (o.b && typeof o.b === 'string' && o.b.length === N) all.push({ b: o.b, side: o.side || 1, tag }); for (const k in o) walk(o[k], tag || (o.id ? o.id : '')); } })(PZ, 'pz');
  d.steps.forEach(s => { s.problems.forEach((P, i) => all.push({ b: P.s.b, side: P.s.side, tag: s.id + '#' + (i + 1) })); (s.ramp || []).forEach((r, i) => r.s && all.push({ b: r.s.b, side: r.s.side, tag: s.id + ' ramp ' + (i + 1) })); });
  for (const id of LS.READY) {
    const s = d.steps.find(x => x.id === id);
    if (!s) { add(id, 0, 'not in lessons.json'); continue; }
    if (!F.IDS.includes(id)) add(id, 0, '⑨ agon/ls-facts.js has no facts for this lesson');
    if (s.problems.length !== 5) add(id, 0, `${s.problems.length} problems`);
    let prevD = -1;
    s.problems.forEach((P, qi) => {
      const q = qi + 1, a = msg => add(id, q, msg), p = E.Pos.from(P.s), L = p.moves();
      if (id === 'b_reloc') { if (p.phase() !== 'guard' || p.pending(p.side + 1).length !== 1 || p.pending(2 - p.side).length) { a('① not a turn to relocate one guard'); return; } }
      else if (p.phase() !== 'move') { a('① not a normal move turn'); return; }
      if (E.judge(p).over) { a('① the game is over'); return; }
      const R = new Map(L.map(m => [m, recount(id, P.s, m)]));
      const goal = L.filter(m => R.get(m).k === 'ok');
      if (!P.ok.every(m => L.includes(m))) a('① an accepted move is not legal');
      if (P.best !== P.ok[0]) a('① best ≠ ok[0]');
      if (goal.length !== P.ok.length || !goal.every(m => P.ok.includes(m))) a(`① ok (${P.ok.map(m => E.name(p, m))}) ≠ the moves that do it (${goal.map(m => E.name(p, m))})`);
      if (P.ok.length !== 1) a(`② ${P.ok.length} accepted moves`);
      const wrong = L.length - goal.length;
      if (L.length < 10) a(`③ ${L.length} legal moves`);
      if (wrong < 3) a(`③ ${wrong} wrong moves`);
      if (goal.length * 3 > L.length) a(`③追72 ${goal.length} of ${L.length} moves right`);
      const H = F.hint(E, id, P.s);
      if (H.length < 2) a(`③追52 the hint rings ${H.length} piece(s)`);
      if (!H.includes(E.mFrom(P.best))) a('⑧ the hint does not ring the answer\'s piece');
      let nearN = 0;
      if (id === 'b_step') {
        if (L.some(m => sandwiches(p, m).length)) a('④ the side to move can capture (not a step lesson)');
        if (E.RING[p.queen(p.side + 1)] <= 1) a('④ the queen is on ring 1 (a throne move)');
        const inw = L.filter(m => R.get(m).k !== 'side'), traps = inw.filter(m => R.get(m).k === 'trap');
        if (inw.some(m => R.get(m).k === 'trapOther')) a('④ a step inwards leaves another piece to be sandwiched');
        if (traps.length < 2) a(`④ ${traps.length} sandwiched steps inwards`);
        if (L.length - inw.length < 3) a(`④ ${L.length - inw.length} steps along a ring`);
        nearN = traps.length;
      } else if (id === 'b_throne') {
        const me = p.side + 1, qn = p.queen(me);
        if (L.some(m => sandwiches(p, m).length)) a('④ the side to move can capture (not a throne lesson)');
        if (qn < 0 || p.captured(qn) || E.RING[qn] > 2 || E.RING[qn] < 1) a('④ the queen is not on ring 1 or 2');
        if (p.at(E.CENTER)) a('④ the throne is not empty');
        const qm = L.filter(m => E.mFrom(m) === qn), inw = qm.filter(m => R.get(m).k !== 'side'), traps = inw.filter(m => R.get(m).k === 'trap');
        if (inw.some(m => R.get(m).k === 'trapOther')) a('④ a step inwards leaves another piece to be sandwiched');
        if (E.RING[qn] === 2) { if (!traps.length) a('④ no sandwiched step of the queen inwards'); if (inw.length - traps.length !== 1) a('④ a step of the queen inwards that is neither the answer nor sandwiched'); }
        if (E.RING[qn] === 1 && !E.NB[E.CENTER].some(c => p.owner(c) === 3 - me)) a('④ no enemy piece next to the throne');
        nearN = traps.length + qm.filter(m => R.get(m).k === 'side').length;
      } else if (id === 'b_reloc') {
        const T = refThreats(P.s), vs = new Set(T.flatMap(x => x[1])), cell = E.mTo(P.best);
        if (!T.length) a('④ the enemy has no capture to block');
        if (!T.every(([r]) => E.mTo(r) === cell)) a('④ an enemy capture steps into another cell than the answer\'s');
        if (E.RING[cell] !== 5) a('④ the answer is not an edge cell');
        if (vs.size !== 1 || [...vs].some(v => p.isQueen(v))) a('④ the enemy\'s capture does not take one guard');
        if (goal.length && !R.get(goal[0]).block) a('④ the answer does not block the enemy\'s capture');
        const traps = L.filter(m => R.get(m).k === 'trap');
        if (!traps.length) a('④ no relocation sandwiched at once');
        for (const m of L) if (R.get(m).k === 'open' && !R.get(m).vs.every(v => vs.has(v))) a('④ a relocation opens another capture');
        nearN = traps.length;
      } else if (id === 'b_capture') {
        const c = goal.length ? sandwiches(p, goal[0]) : [];
        if (c.length !== 1 || p.isQueen(c[0])) a('④ the answer does not take one guard');
        const touch = L.filter(m => R.get(m).k === 'touch');
        if (touch.length < 2) a(`④ ${touch.length} moves next to an enemy piece`);
        if (touch.some(m => R.get(m).ends.includes('mine'))) a('① a touch with a piece of yours beyond (a capture missed by the recount)');
        nearN = touch.length;
      }
      const dd = wrong + 2 * nearN;
      if (dd <= prevD) a(`⑥ d ${dd} not above the problem before's ${prevD}`);
      prevD = dd;
      // ⑤
      for (const o of all) if (o.tag !== id + '#' + q && near({ b: P.s.b, side: P.s.side }, o)) a(`⑤ the same as / 4 cells from ${o.tag}`);
      // ⑦⑧ the words for every legal move
      for (const m of L) {
        const r = R.get(m), fx = F.fact(E, id, P.s, m), right = r.k === 'ok', nm = E.name(p, m);
        if ((fx.k === 'ok') !== right) { a(`⑦ ls-facts calls ${nm} ${fx.k}, the board ${r.k}`); continue; }
        if (id === 'b_step' && !right && fx.k !== r.k) a(`⑦ ls-facts calls ${nm} ${fx.k}, the board ${r.k}`);
        if (id === 'b_throne' && !right && fx.k !== r.k) a(`⑦ ls-facts calls ${nm} ${fx.k}, the board ${r.k}`);
        if (id === 'b_throne' && right && fx.throne !== r.throne) a(`⑦ ${nm}: ls-facts and the board differ on the throne`);
        if ((id === 'b_step' || id === 'b_throne') && fx.k === 'trap' && !r.reps.includes(fx.rp)) a(`⑦ ${nm}: the gold move does not capture the moved piece`);
        if (id === 'b_capture' && !right && fx.k !== r.k) a(`⑦ ls-facts calls ${nm} ${fx.k}, the board ${r.k}`);
        if (id === 'b_reloc' && !right && fx.k !== r.k) a(`⑦ ls-facts calls ${nm} ${fx.k}, the board ${r.k}`);
        if (id === 'b_reloc' && fx.k === 'trap' && !r.reps.includes(fx.rp)) a(`⑦ ${nm}: the gold move does not capture the relocated guard`);
        if (id === 'b_reloc' && fx.k === 'open' && (!r.reps.includes(fx.rp) || !r.vs.includes(fx.v) || fx.v === E.mTo(m))) a(`⑦ ${nm}: the gold move does not capture another guard`);
        if (id === 'b_capture' && fx.k === 'touch' && (r.ends.length === 1 ? fx.end !== r.ends[0] : fx.end !== 'mixed')) a(`⑦ ${nm}: the cells beyond are ${r.ends}, the words ${fx.end}`);
        const kind = right ? null : id === 'b_reloc' ? (r.k === 'trap' ? 'rtrap' : 'ropen') : id === 'b_step' ? r.k : id === 'b_throne' ? { guard: 'guard', side: 'qside', trap: 'qtrap' }[r.k] : r.k === 'touch' ? (r.ends.length === 1 ? r.ends[0] : 'mixed') : 'none';
        // ja: every line of the list it picks
        for (let k = 0; k < 6; k++) {
          const h = LS.sayText(id, P, m, 'ja', k), tx = h.replace(/<[^>]+>/g, '');
          if (/\{\w+\}/.test(h)) a(`⑧ ja ${nm}: a placeholder left — ${tx}`);
          if (right) {
            if (!PRAISE.test(tx)) a(`⑧ ja ${nm}: no praise on the right move`);
            if (id === 'b_throne' && (r.throne ? !/王座に(座|一番乗り)|真ん中/.test(tx) || /あと1歩|となりの輪|となりへ|目の前|1の輪へ入/.test(tx) : !/あと1歩|となりの輪|となりへ|目の前|1の輪へ入/.test(tx) || /王座に座/.test(tx))) a(`⑧ ja ${nm}: the words do not say where the queen is — ${tx}`);
            continue;
          }
          if (CLOSE.test(tx)) a(`追66 ja ${nm}: a closeness word on a 0-point move — ${tx}`);
          if (PRAISE.test(tx.replace(/内側へ進んだのはいいね/, ''))) a(`追20 ja ${nm}: praise after a wrong move — ${tx}`);
          if (!JA_NEED[kind].test(tx)) a(`⑧ ja ${nm} (${kind}): the words do not say it — ${tx}`);
          if (!/緑/.test(tx)) a(`⑧ ja ${nm}: the green answer is not named`);
        }
        for (const l of LANGS) {
          if (l === 'ja') continue;
          const h = LS.sayText(id, P, m, l, 0);
          if (!h || /\{\w+\}/.test(h)) a(`⑨ ${l} ${nm}: missing words or a placeholder left`);
          if (!right && !/ls-spot ng/.test(h)) a(`⑨ ${l} ${nm}: your move is not marked`);
          if ((fx.k === 'trap' || fx.k === 'open') && !/ls-spot hl/.test(h)) a(`⑨ ${l} ${nm}: the enemy's move is not marked`);
        }
      }
      // the ja questions / hints of the lesson: no coordinates (the 3D board has none)
    });
    // ⑨ the 2D keys
    const need = id === 'b_reloc' ? { why: ['{m}'], ng: ['{x}', '{m}', '{r}'], ngOpen: ['{x}', '{m}', '{r}'], goal: [], hint: [] } : id === 'b_step' ? { why: ['{m}'], ng: ['{x}', '{m}', '{r}'], ngSide: ['{x}', '{m}'], goal: [], hint: [] } : id === 'b_throne' ? { why: ['{m}'], ng: ['{x}', '{m}', '{r}'], ngSide: ['{x}', '{m}'], ngGuard: ['{x}', '{m}'], goal: [], hint: [] } : { why: ['{m}'], ng: ['{x}', '{m}'], ngTouch: ['{x}', '{m}'], goal: [], hint: [] };
    for (const l of LANGS) for (const [k, ph] of Object.entries(need)) { const v = (I18N[l] || {})['ls.' + id + '.' + k]; if (!v) add(id, 0, `⑨ ${l} has no ls.${id}.${k}`); else for (const x of ph) if (!v.includes(x)) add(id, 0, `⑨ ${l} ls.${id}.${k} without ${x}`); }
    for (const k of ['intro', 'ask', 'askLast', 'hint', 'w']) if (!JA[k] || !JA[k][id]) add(id, 0, `⑧ no ja ${k}`);
    for (const k of ['intro', 'ask', 'askLast', 'hint']) for (const t of [].concat(JA[k][id] || [])) if (/[1-5]\.\d{1,2}|\bT\b/.test(t)) add(id, 0, `⑧ ja ${k}: a cell name on the 3D board — ${t}`);
    // 追75 / 追14 the ramps
    (s.ramp || []).forEach((it, ri) => {
      const a = msg => add(id, 'ramp ' + (ri + 1), msg), p = E.Pos.from(it.s), L = p.moves(), byName = n => L.find(m => E.name(p, m) === n);
      if (it.k === 'try') {
        const okM = (it.ok || []).map(byName);
        if (okM.some(m => m == null)) a('追75 a right move is not a move of its board');
        const want = id === 'b_step' ? L.filter(m => E.RING[E.mTo(m)] === E.RING[E.mFrom(m)] - 1) : id === 'b_throne' ? L.filter(m => E.mTo(m) === E.CENTER) : L.filter(m => sandwiches(p, m).length);
        if (want.length !== okM.length || !want.every(m => okM.includes(m))) a(`追14 the right moves ≠ every move that does it (${want.map(m => E.name(p, m))})`);
        const lookOk = id === 'b_throne' ? new Set([E.CENTER, p.queen(p.side + 1)]) : id === 'b_capture' ? new Set(want.flatMap(m => sandwiches(p, m))) : new Set(want.map(E.mFrom));   // (b_step: the pieces that can step in; b_capture: the pieces to take)
        for (const c of it.look || []) if (!lookOk.has(c - 1)) a(`追14 look ${c} is not ${id === 'b_capture' ? 'a piece to take' : 'a piece that can step in'}`);
      } else {
        if (id === 'b_reloc') {
          for (const [c, k] of it.marks || []) if (k !== 'ng' || !p.captured(c - 1) || p.owner(c - 1) !== p.side + 1) a(`追14 explain mark ${E.sqName(c - 1)} ${k} is not the captured piece to relocate`);
          if (p.phase() !== 'guard') a('追14 the explain is not a turn to relocate a guard');
        } else if (id === 'b_throne') {
          const qn = p.queen(p.side + 1);
          for (const [c, k] of it.marks || []) if (k !== 'ok' || !(c - 1 === E.CENTER || c - 1 === qn)) a(`追14 explain mark ${E.sqName(c - 1)} ${k} is neither the throne nor the queen`);
        } else if (id === 'b_step') {
          const pcs = []; for (let i = 0; i < N; i++) if (p.owner(i) === p.side + 1 && !p.isQueen(i) && (it.marks || []).some(([c]) => E.NB[i].includes(c - 1))) pcs.push(i);
          if (pcs.length !== 1) { a(`追14 the explain's marks are round ${pcs.length} pieces`); return; }
          const from = pcs[0], dest = new Set(L.filter(m => E.mFrom(m) === from).map(E.mTo));
          for (const [c, k] of it.marks || []) { const i = c - 1; if (k === 'ok' && !dest.has(i)) a(`追14 'ok' mark ${E.sqName(i)} is not a step of the piece`); else if (k === 'ng' && !(E.RING[i] === E.RING[from] + 1 && E.NB[from].includes(i))) a(`追14 'ng' mark ${E.sqName(i)} is not a cell one ring out`); else if (k !== 'ok' && k !== 'ng') a(`追14 mark class ${k} (the 2D draws only ok / ng)`); }
          if (dest.size !== (it.marks || []).filter(x => x[1] === 'ok').length) a('追14 not every step of the piece is marked');
        } else if (id === 'b_capture') {
          let q = p; const took = new Set();
          for (const n of it.seq || []) { const m = q.moves().find(x => E.name(q, x) === n); if (m == null) { a(`追14 ${n} is not legal`); return; } sandwiches(q, m).forEach(x => took.add(x)); q = q.clone().play(m); }
          for (const [c, k] of it.marks || []) if (k === 'ng' && !took.has(c - 1)) a(`追14 the red mark ${E.sqName(c - 1)} is not the piece taken`);
        }
      }
    });
  }
  // ⑨ the 2D wiring
  const app = fs.readFileSync(path.join(ROOT, 'agon/app.js'), 'utf8'), html = fs.readFileSync(path.join(ROOT, 'agon/index.html'), 'utf8');
  if (!/AgonLsFacts\.key\(/.test(app) || !/AgonLsFacts\.hint\(/.test(app)) add('2D', 0, '⑨ agon/app.js does not word / hint through AgonLsFacts');
  if (!/<script src="ls-facts\.js\?v=/.test(html)) add('2D', 0, '⑨ agon/index.html does not load ls-facts.js');
  if (/'ls\.' \+ s\.id \+ '\.ng', \{ m: mvIn\(pos0, best\)/.test(app)) add('2D', 0, '⑨ the 2D words a wrong move with the answer as {m} only');
  return { out };
}
function selftest() {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/lessons.json'), 'utf8'));
  const cases = [
    ['the answer changed', d => { const P = d.steps.find(s => s.id === 'b_step').problems[0]; const p = E.Pos.from(P.s); const m = p.moves().find(x => x !== P.best); P.ok = [m]; P.best = m; }],
    ['b_throne: a guard move as the answer', d => { const P = d.steps.find(s => s.id === 'b_throne').problems[2]; const p = E.Pos.from(P.s); const m = p.moves().find(x => !p.isQueen(E.mFrom(x))); P.ok = [m]; P.best = m; }],
    ['a wrong move accepted', d => { const P = d.steps.find(s => s.id === 'b_capture').problems[1]; const p = E.Pos.from(P.s); P.ok.push(p.moves().find(x => x !== P.best)); }],
    ['two problems swapped', d => { const s = d.steps.find(s => s.id === 'b_capture'); [s.problems[0], s.problems[4]] = [s.problems[4], s.problems[0]]; }],
    ['a mirrored copy', d => { const s = d.steps.find(s => s.id === 'b_step'); const P = JSON.parse(JSON.stringify(s.problems[1])); P.s.b = sym(P.s.b, MAPS[7], false); s.problems[2] = P; }],
    ['b_reloc: a sandwiched cell as the answer', d => { const P = d.steps.find(s => s.id === 'b_reloc').problems[1]; const m = E.Pos.from(P.s).moves().find(x => F.fact(E, 'b_reloc', P.s, x).k === 'trap'); P.ok = [m]; P.best = m; }],
    ['a ramp move that is not legal', d => { const r = d.steps.find(s => s.id === 'b_capture').ramp.find(x => x.k === 'try'); r.ok[0] = '5.1-4.1x'; }],
  ];
  let bad = 0;
  for (const [name, f] of cases) { const d = JSON.parse(JSON.stringify(base)); f(d); const n = verify({ data: d }).out.length; console.log((n ? 'detected' : 'MISSED  ') + ' — ' + name + ` (${n})`); if (!n) bad++; }
  // the words
  { const JA = JSON.parse(JSON.stringify(LS.JA)); JA.n.trap[0] = '赤の手は惜しかった。緑の手なら安全。'; const n = verify({ ja: JA }).out.length; const o = LS.JA.n.trap.slice(); LS.JA.n.trap[0] = JA.n.trap[0]; const n2 = verify().out.length; LS.JA.n.trap.splice(0, 5, ...o); console.log((n2 ? 'detected' : 'MISSED  ') + ` — a ja line that does not say the gold move (${n2})`); if (!n2) bad++; }
  { const I = loadI18n(); delete I.fr['ls.b_step.ngSide']; const n = verify({ i18n: I }).out.length; console.log((n ? 'detected' : 'MISSED  ') + ` — a 2D key missing (${n})`); if (!n) bad++; }
  return bad;
}
if (require.main === module) {
  if (process.argv.includes('--selftest')) { process.exit(selftest() ? 1 : 0); }
  const r = verify();
  let probs = 0; for (const id of LS.READY) { const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'agon/lessons.json'), 'utf8')).steps.find(x => x.id === id); probs += s ? s.problems.length : 0; }
  const badQ = new Set(r.out.filter(o => typeof o.q === 'number' && o.q > 0).map(o => o.id + '#' + o.q));
  for (const o of r.out) console.log(`${o.id} ${o.q}: ${o.msg}`);
  console.log(`agon lessons (3D READY ${LS.READY.join(' ')}): ${probs - badQ.size} of ${probs} problems pass` + (r.out.length ? `, ${r.out.length} issue(s)` : ''));
  process.exit(r.out.length ? 1 : 0);
}
module.exports = { verify, selftest };
