// 追67（2026-11-24 第2期・担当B、claude/lesson-quality.md）：同じ局面で、本（定跡）によって正解が食い違わない。
// 定跡（/open）の問題の局面が、どれかの本の手順（見本＝study の手順）の局面と同じ（対称・色の入れかえ込み）なら、その見本が
// そこで指す手は、問題の正解（20点の手）に入っていなければならない（見本で「こう指す」と見せた手を、問題で不正解・16点にしない）。
// 囲碁は tools/lesson-verify-goopen.js（変化も含む）。ここでは tafl・checkers・xiangqi・shogi・chess・gomoku・reversi・hex・backgammon の定跡と、
// connect4（定跡の本線 C4_MAIN とすべての問題）を見る。
// 手の比べ方は「指したあとの局面」で（対称で写した手を作らなくてよい）：見本の手のあとの局面の正規形が、問題の正解のどれかの
// あとの局面の正規形と同じなら一致。
// verified（または検証済みの一覧）の本の問題は NG、ほかの本は pending（--all で一覧。3D・2D で出る問題すべて）。
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const minOf = a => a.reduce((x, y) => (y < x ? y : x));

// each adapter: { lines: [[who, start, moves[]]], probs: [{ who, set, q, done, pos, ok[] }], key(pos), after(pos, m) }
const AD = {
  tafl() {
    const E = require(path.join(ROOT, 'tafl/engine.js')), CU = require(path.join(ROOT, 'tafl/tools/curate_openings.js')), O = J('tafl/openings.json');
    const S = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
    const key = p => { const b = p.spec().b; return p.turn + ':' + minOf(S.map(T => { const o = Array(121); for (let i = 0; i < 121; i++) { const [r, c] = T((i / 11) | 0, i % 11); o[r * 11 + c] = b[i]; } return o.join(''); })) + (p.res ? '!' : ''); };
    return { key, after: (p, m) => p.clone().play(m), start: () => E.Pos.from(null, 'copenhagen'), legal: (p, m) => p.moves().includes(m), name: (p, m) => E.name(p, m),
      lines: O.sets.map(g => [g.id, g.study.line]),
      probs: O.sets.flatMap(g => (g.problems || []).map((P, j) => ({ set: g.id, q: j + 1, done: !!g.verified, pos: E.Pos.from(P.s), ok: CU.acc ? CU.acc(P.sc) : P.sc.filter(x => CU.points(P.sc, x[0]) === 20).map(x => x[0]) }))) };
  },
  checkers() {
    const E = require(path.join(ROOT, 'checkers/tools/wasm.js')).loadSync().E, O = J('checkers/openings.json');
    const DONE = new Set(['cross', 'old14', 'alma', 'souter', 'fife', 'whilter', 'edinburgh', 'double', 'dcross', 'pioneer', 'denny', 'kelso', 'bristol', 'bcross', 'dundee', 'single', 'ayrshire', 'glasgow', 'laird']);   // (= lesson-verify.js CKO_DONE)
    const sw = { b: 'w', w: 'b', B: 'W', W: 'B', '.': '.' };
    const key = p => { const s = p.spec(), a = s.b + s.side, r = [...s.b].reverse().map(c => sw[c] || c).join('') + (3 - s.side); return a < r ? a : r; };
    const WIN = 30000, WINT = 29000, pts20 = (sc, m) => { const v = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = v.has(m) ? v.get(m) : -WIN; return mine >= best - 6 && !(best > WINT && mine < best); };
    return { key, after: (p, m) => p.clone().play(m), start: () => E.Pos.from(null), legal: (p, m) => p.moves().includes(m), name: (p, m) => E.name(p, m),
      lines: O.sets.map(g => [g.id, g.study.line]),
      probs: O.sets.flatMap(g => (g.problems || []).map((P, j) => ({ set: g.id, q: j + 1, done: DONE.has(g.id), pos: E.Pos.from(P.s), ok: (P.sc || []).filter(x => pts20(P.sc, x[0])).map(x => x[0]) }))) };
  },
  xiangqi() {
    const E = require(path.join(ROOT, 'xiangqi/engine.js')), CU = require(path.join(ROOT, 'xiangqi/tools/op_curate.js')), O = J('xiangqi/openings.json');
    const rows = f => f.split(' ')[0].split('/').map(r => r.replace(/\d/g, d => '.'.repeat(+d)));
    const sc = c => (c === '.' ? c : c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
    const key = p => { const f = p.fen(), R = rows(f), s = f.split(' ')[1], m = R.map(r => [...r].reverse().join('')), V = [[R, s], [m, s]];
      for (const [x, t] of V.slice()) V.push([x.slice().reverse().map(r => [...r].reverse().map(sc).join('')), t === 'w' ? 'b' : 'w']);   // (180° and the colours swapped)
      return minOf(V.map(([x, t]) => x.join('/') + ' ' + t)); };
    return { key, after: (p, m) => p.clone().play(m), start: () => E.Pos.from(null), legal: (p, m) => p.moves().includes(m), name: (p, m) => (E.name ? E.name(p, m) : String(m)),
      lines: O.sets.map(g => [g.id, g.study.line]),
      probs: O.sets.flatMap(g => (g.problems || []).map((P, j) => ({ set: g.id, q: j + 1, done: !!g.verified, pos: E.Pos.from(P.s), ok: CU.acc(P.sc) }))) };
  },
  shogi() {
    const E = require(path.join(ROOT, 'shogi/engine.js')), sets = [];
    ['beg', 'mid', 'adv', 'sp', 'new', 'castle'].forEach(c => J(`shogi/openings-${c}.json`).sets.forEach(s => sets.push(s)));
    J('shogi/openings.json').sets.forEach(s => { if (!sets.some(x => x.id === s.id)) sets.push(s); });
    const src = fs.readFileSync(path.join(ROOT, 'tools/lesson-verify.js'), 'utf8'), DONE = new Set(eval(src.match(/const SHO_DONE = new Set\((\[[^\]]*\])\)/)[1]));
    const pos = sf => { const p = new E.Position(); p.setSfen(sf); return p; };
    const sq = t => { const o = []; t.split('/').forEach(r => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (/\d/.test(c)) for (let k = 0; k < +c; k++) o.push('.'); else if (c === '+') { o.push('+' + r[++i]); } else o.push(c); } }); return o; };
    const sc = c => c.replace(/[a-z]/gi, x => (x === x.toUpperCase() ? x.toLowerCase() : x.toUpperCase()));
    const hand = h => (h === '-' ? '' : [...h.matchAll(/(\d*)([A-Za-z])/g)].map(m => m[2].repeat(+(m[1] || 1))).sort().join(''));
    const key = p => { const [b, s, h] = p.sfen().split(' '), B = sq(b), a = B.join(',') + ' ' + s + ' ' + hand(h), r = B.slice().reverse().map(sc).join(',') + ' ' + (s === 'b' ? 'w' : 'b') + ' ' + [...sc(hand(h))].sort().join(''); return a < r ? a : r; };
    const after = (p, u) => { const q = pos(p.sfen()), m = q.fromUsi(u); q.doMove(m); return q; };
    const lines = sets.filter(s => s.study && s.study.steps).map(s => [s.id, s.study.steps.map(x => x[0]), s.study.start]);
    const ok = P => { if (P.mode === 'freq' && P.cand) { const top = P.cand[0][1]; return P.cand.filter(c => Math.round(20 * c[1] / top) === 20).map(c => c[0]); } return P.accept || []; };
    return { key, after, start: st => pos(st || 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1'), legal: (p, u) => p.legalMoves(true).some(m => p.toUsi(m) === u), name: (p, u) => u,
      lines, probs: sets.flatMap(s => (s.problems || []).concat(s.lineProbs || []).map((P, j) => ({ set: s.id, q: j + 1, done: DONE.has(s.id), pos: pos(P.sfen), ok: ok(P) }))) };
  },
  chess() {
    const E = require(path.join(ROOT, 'chess/engine.js')), O = J('chess/openings.json');
    const brd = f => { const R = f.split(' ')[0].split('/').map(r => r.replace(/\d/g, d => '.'.repeat(+d))); return R; };
    const sc = c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase());
    const key = p => { const f = p.fen().split(' '), R = brd(p.fen()), a = R.join('/') + ' ' + f[1] + ' ' + f[2];
      const r = R.slice().reverse().map(x => [...x].map(c => (c === '.' ? c : sc(c))).join('')).join('/') + ' ' + (f[1] === 'w' ? 'b' : 'w') + ' ' + (f[2] === '-' ? '-' : [...f[2]].map(sc).sort((x, y) => 'KQkq'.indexOf(x) - 'KQkq'.indexOf(y)).join(''));
      return a < r ? a : r; };
    const after = (p, u) => { const q = E.Pos.fromFEN(p.fen()); q.make(q.fromUci(u)); return q; };
    const ok = P => { const A = (P.cand[0] || [])[0]; if (!A) return []; if (P.acc) return P.acc.slice(); const top = P.cand[0][1]; return P.cand.filter(c => c[1] >= top).map(c => c[0]); };   // (= chPts 20)
    return { key, after, start: () => E.Pos.fromFEN(E.START), legal: (p, u) => !!p.fromUci(u), name: (p, u) => u,
      lines: O.sets.map(s => [s.id, ((s.study && s.study.steps) || []).map(x => x[0])]),
      probs: O.sets.flatMap(s => { const idx = s.drill || s.problems.map((P, k) => k); return idx.map((k, j) => ({ set: s.id, q: s.drill ? j + 1 : k + 1, done: !!s.drill, pos: E.Pos.fromFEN(s.problems[k].fen), ok: ok(s.problems[k]) })); }) };
  },
  gomoku() {
    const G = require('./lesson-verify-gmopen.js'), E = require(path.join(ROOT, 'gomoku/engine.js')), O = J('gomoku/openings.json');
    // a position = { b: Set, w: Set } of cells (15×15); the key: the 8 symmetries and any shift, by the stones' places
    const SY = [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y], (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]];
    const key = p => minOf(SY.map(T => { const s = []; p.b.forEach(m => s.push([1, ...T(m % 15, (m / 15) | 0)])); p.w.forEach(m => s.push([2, ...T(m % 15, (m / 15) | 0)]));
      const x0 = Math.min(...s.map(e => e[1])), y0 = Math.min(...s.map(e => e[2])); return s.map(e => `${e[0]}${e[1] - x0}.${e[2] - y0}`).sort().join(' '); }));
    const after = (p, m) => { const q = { b: new Set(p.b), w: new Set(p.w) }; ((p.b.size + p.w.size) % 2 ? q.w : q.b).add(m); return q; };
    const cells = a => String(a || '').split(/\s+/).filter(Boolean).map(c => E.sqOf(c));
    const W = 9000, pos = P => ({ b: new Set(cells(P.b)), w: new Set(cells(P.w)) });
    return { key, after, start: () => ({ b: new Set(), w: new Set() }), legal: (p, m) => !p.b.has(m) && !p.w.has(m), name: (p, m) => E.sqName(m),
      lines: O.sets.map(s => [s.id, (s.study || []).map(x => E.sqOf(x[0]))]),
      probs: O.sets.flatMap(s => (s.problems || []).map((P, j) => ({ set: s.id, q: j + 1, done: !!s.verified, pos: pos(P), ok: (P.sc || []).filter(x => G.pts(P.sc, x[0], G.WINT || W) === 20).map(x => E.sqOf(x[0])) }))) };
  },
  connect4() {
    const L = J('connect4/lessons.json'), MAIN = '44444432655555323332267623526661117777711';
    const mir = s => [...s].map(c => String(8 - +c)).join('');
    // the position = the board of a move string; the key: the board (columns bottom-up) and its mirror
    const bd = s => { const g = [[], [], [], [], [], [], []]; [...s].forEach((c, i) => g[+c - 1].push(i & 1 ? 'o' : 'x')); return g.map(c => c.join('')).join('|'); };
    const key = s => { const a = bd(s), r = bd(mir(s)); return a < r ? a : r; };
    return { key, after: (s, c) => s + String(c + 1), start: () => '', legal: (s, c) => [...s].filter(x => +x === c + 1).length < 6, name: (s, c) => 'abcdefg'[c],
      lines: [['C4_MAIN', [...MAIN].map(c => +c - 1)]],
      probs: L.steps.flatMap(st => (st.problems || []).map((P, j) => ({ set: st.id, q: j + 1, done: true, pos: P.moves, ok: P.answer.slice() }))) };
  },
  reversi() {   // (2026-11-25 担当B) a position = the move string that reaches it (rvAfter: legal, a side with no move passes)
    const RV = require('./lesson-verify-rvopen.js'), X = RV.rx(), ST = RV.steps(), OPP = J('reversi/opcourse-probs.json');
    const SY = []; for (let t = 0; t < 8; t++) { const m = []; for (let q = 0; q < 64; q++) { let r = q >> 3, c = q & 7; if (t & 1) c = 7 - c; if (t & 2) r = 7 - r; if (t & 4) [r, c] = [c, r]; m.push(r * 8 + c); } SY.push(m); }
    const memo = new Map(), at = s => { if (!memo.has(s)) memo.set(s, X.rvAfter(s)); return memo.get(s); };
    // the key: the 8 symmetries and the colours swapped (with the side to move), the end of the game marked
    const key = s => { const [cs, tm] = at(s).split(':'), sw = { 0: '0', 1: '2', 2: '1' }; const V = [];
      for (const m of SY) { let a = '', b = ''; for (let q = 0; q < 64; q++) { a += cs[m[q]]; b += sw[cs[m[q]]]; } V.push(a + ':' + tm, b + ':' + sw[tm]); }
      return minOf(V); };
    const legal = (s, m) => { const [cs, tm] = at(s).split(':'); return X.rvLegal(cs.split('').map(Number), +tm).includes(X.rvSq(m)); };
    const probs = [];
    for (const st of ST) { const id = st.ln.moves, pool = (OPP[id] || []).length >= 5 ? OPP[id].slice(0, 5) : null;
      if (pool) pool.forEach((P, j) => probs.push({ set: id, q: j + 1, done: true, pos: P.via, ok: [P.best] }));   // (= 3D REVERSI.opening / 2D poolOf: the best 20)
      else st.ks.forEach((k, j) => probs.push({ set: id, q: j + 1, done: false, pos: st.mv.slice(0, k).join(''), ok: [st.mv[k]] })); }   // (the line's move 20, any other ≤14 in the 3D / 16 in the 2D)
    return { key, after: (s, m) => s + m, start: () => '', legal, name: (s, m) => m, lines: ST.map(st => [st.ln.moves, st.mv]), probs };
  },
  hex() {   // (2026-11-25 担当B) the key: the board size, the 180° turn, the board flipped on its long diagonal with the colours swapped
    const E = require(path.join(ROOT, 'hex/engine.js')), O = J('hex/openings.json'), WINT = 29000;
    const key = p => { const n = p.n, b = p.spec().b, V = [], rot = [...b].reverse().join('');
      V.push(b + p.side + (p.swapOk ? 's' : ''), rot + p.side + (p.swapOk ? 's' : ''));
      if (!p.swapOk) { const sw = { '.': '.', r: 'b', b: 'r' }, tr = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) tr.push(sw[b[c * n + r]]);
        const t = tr.join(''); V.push(t + (3 - p.side), [...t].reverse().join('') + (3 - p.side)); }
      return n + ':' + minOf(V) + (p.winner() ? '!' : ''); };
    // the 20-point moves (= atlas/lessons3d.js HEX.points and hex/app.js problemPoints)
    const pts = (P, m) => { if (P.ok) return P.ok.includes(m) ? 20 : 0;
      const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : (P.sc.length ? Math.min(...P.sc.map(e => e[1])) - 60 : -1000);
      const wr = v => v > WINT ? 1 : v < -WINT ? 0 : Math.max(0, Math.min(1, (v + 1000) / 2000));
      if (mine >= best - 15 && !(best > WINT && mine < best)) return 20; if (best > WINT && mine <= WINT) return mine > 400 ? 8 : 0; if (mine < -WINT && best >= -WINT) return 0;
      return Math.max(0, Math.round(20 * (1 - (wr(best) - wr(mine)) / 0.25))); };
    return { key, after: (p, m) => { const q = p.clone(); q._w = undefined; q.play(m); return q; }, start: st => new E.Pos(st.n, st.swap), legal: (p, m) => p.legal(m), name: (p, m) => (m === 1023 ? 'swap' : E.nameOf(m, p.n)),
      lines: O.sets.map(g => [g.id, g.study.line, { n: g.n, swap: g.swap }]),
      probs: O.sets.flatMap(g => (g.problems || []).map((P, j) => { const pos = E.Pos.from(P.s); return { set: g.id, q: j + 1, done: !!g.verified, pos, ok: pos.moves().filter(m => pts(P, m) === 20) }; })) };
  },
  backgammon() {   // (2026-11-25 担当B) a position seen by the side to move, with the roll; the lines = every item's lines (seq: the moves from the start)
    const BV = require('./lesson-verify-bgopen.js'), { BG } = require(path.join(ROOT, 'backgammon/tools/load.js')), OP = J('backgammon/openings.json');
    const START = '0000005030000500000000002000000050300005000000000020', hex = q => Array.from(q, v => v.toString(16)).join('');
    const dec = s => { const q = new Int8Array(52); for (let i = 0; i < 52; i++) q[i] = parseInt(s[i], 16) || 0; return q; }, flip = q => { const o = new Int8Array(52); o.set(q.slice(26), 0); o.set(q.slice(0, 26), 26); return o; };
    const play = (q, m) => { const r = q.slice(); for (let i = 0; i + 1 < m.length; i += 2) BG.apply(r, 0, m.charCodeAt(i) - 65, m.charCodeAt(i + 1) - 65); return r; };
    const dk = d => d.slice().sort().join('');
    const INTRO = (() => { const L = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), a = L.indexOf('  const BGJ_OP = {'), b = L.indexOf('\n  };', a), o = {};
      for (const m of L.slice(a, b).matchAll(/\b([ordh]\d\d\w?): '([^']*)'/g)) o[m[1]] = m[2]; return o; })(), cmp = [];
    const seen = [], probs = [], right = (y, b, rolled, tol) => (rolled ? y.ro : y.ply === 2) && (b.e - y.e <= tol + 1e-9 || (y.ro && b.e - y.e < 2 * Math.hypot(b.se, y.se)));
    for (const id in OP.items) { const it = OP.items[id];
      // an opening roll's 2nd, 3rd … lines are the book's comparison plays: the 2D book (backgammon/op.js opLineEval) shows each with its
      // deficit to the best (op.diff) and the 3D asks only the first line. Such a line is not a sample (見本) of the roll — only when it is
      // more than the tolerance behind on the same rollouts (so the book's own number says it is worse) AND the item's intro (BGJ_OP.intro,
      // the 3D's only words before the problem) says a play falls short (落ちる・次点・危険・及ばない). Otherwise it is a sample like any other.
      const ex = it.kind === 'open' ? (() => { const R = it.plays.map(y => ({ m: y[0], e: y[3] != null ? y[3] : y[1], ro: y[3] != null })), rolled = R.some(y => y.ro), b = R.filter(y => !rolled || y.ro).reduce((u, w) => (w.e > u.e ? w : u));
        return m => { const y = R.find(z => z.m === m); return !!y && b.e - y.e > OP.tol + 1e-9 && /落ちる|次点|危険|及ばない/.test(INTRO[id] || ''); }; })() : () => false;
      it.lines.forEach((ln, li) => { const seq = ln.seq || [{ r: 0, d: it.d, m: ln.m }]; let v = dec(START), r = 0;   // (v: seen by the side r)
        if (li > 0 && ex(ln.m)) { cmp.push(`${id} ${ln.id}`); return; }
        seq.forEach((st, k) => { if (st.r !== r) { v = flip(v); r = st.r; }
          seen.push([hex(v) + ':' + dk(st.d), `${id} ${ln.id} の手順 ${k + 1}手目`, hex(play(v, st.m)), st.m]); v = play(v, st.m); }); });
      // the problems as the 3D / 2D ask them (BACKGAMMON.opDecs), right = within the tolerance or the rollouts' 2 s.e. (= bgOpen)
      const decs = (it.kind === 'open' ? it.lines.slice(0, 1) : it.lines).map(ln => { const seq = ln.seq || [{ r: 0, d: it.d, m: ln.m }], k = it.kind === 'open' ? 0 : seq.length - 1;
        let v = dec(START), r = seq[k].r; for (let i = 0; i < k; i++) { const st = seq[i]; let w = st.r === r ? v : flip(v); w = play(w, st.m); v = st.r === r ? w : flip(w); }
        return { ln, v, d: seq[k].d, plays: ln.plays || it.plays }; });
      decs.forEach((x, j) => { const R = x.plays.map(y => ({ m: y[0], e: y[3] != null ? y[3] : y[1], ro: y[3] != null, se: y[4] || 0, ply: y[2] })), rolled = R.some(y => y.ro);
        const best = R.filter(y => !rolled || y.ro).reduce((u, w) => (w.e > u.e ? w : u)), ok = R.filter(y => right(y, best, rolled, OP.tol)).map(y => y.m);
        probs.push({ set: id, q: j + 1, done: !BV.PEND.has(id), pos: hex(x.v) + ':' + dk(x.d), ok, after: ok.map(m => hex(play(x.v, m))) }); }); }
    return { seenList: seen, probs, cmp };
  },
};

function check(game, A) {
  A = A || AD[game]();
  const out = [], pend = [], seen = new Map();   // key → [[who, afterKey, move name]]
  if (A.seenList) {   // (backgammon: the positions with the roll and the positions after, already keyed)
    for (const [K, who, ak, nm] of A.seenList) { if (!seen.has(K)) seen.set(K, []); seen.get(K).push([who, ak, nm]); }
    for (const P of A.probs) { const t = seen.get(P.pos); if (!t) continue; const okK = new Set(P.after);
      for (const [who, ak, nm] of t) if (!okK.has(ak)) { (P.done ? out : pend).push({ step: P.set, q: P.q, msg: `追67 同じ局面・同じ目で ${who}（${nm}）を、この問題は正解（20点）にしていない（本によって正解が食い違う）` }); break; } }
    return { out, pend, n: A.probs.length, hit: A.probs.filter(P => seen.has(P.pos)).length };
  }
  for (const [who, moves, st] of A.lines) { let p = A.start(st);
    for (let k = 0; k < moves.length; k++) { const m = moves[k]; if (!A.legal(p, m)) { out.push({ step: who, q: 0, msg: `追67 the study line's move ${k + 1} is not legal` }); break; }
      const K = A.key(p), q = A.after(p, m); if (!seen.has(K)) seen.set(K, []); seen.get(K).push([`${who} の見本 ${k + 1}手目`, A.key(q), A.name(p, m)]); p = q; } }
  for (const P of A.probs) { const t = seen.get(A.key(P.pos)); if (!t) continue;
    const okK = new Set(P.ok.map(m => A.key(A.after(P.pos, m))));
    for (const [who, ak, nm] of t) if (!okK.has(ak)) { (P.done ? out : pend).push({ step: P.set, q: P.q, msg: `追67 同じ局面で ${who}（${nm}）を、この問題は正解（20点）にしていない（本によって正解が食い違う）` }); break; } }
  return { out, pend, n: A.probs.length, hit: A.probs.filter(P => seen.has(A.key(P.pos))).length };
}
const GAMES = Object.keys(AD);
function verify(opt) { const out = []; for (const g of (opt && opt.games) || GAMES) check(g, opt && opt.ad && opt.ad[g]).out.forEach(o => out.push({ step: `${g}/open ${o.step}`, q: o.q, msg: o.msg })); return out; }
module.exports = verify; Object.assign(module.exports, { check, AD, GAMES });
if (require.main === module) {
  const all = process.argv.includes('--all'); let bad = 0;
  for (const g of GAMES) { const r = check(g); bad += r.out.length;
    console.log(`${r.out.length ? 'NG' : 'OK'} ${g}/open 追67：問題 ${r.n}・見本の局面と同じ ${r.hit}・食い違い 検証済み ${r.out.length}／pending ${r.pend.length}`);
    r.out.forEach(o => console.log(`  NG ${o.step} q${o.q}: ${o.msg}`)); if (all) r.pend.forEach(o => console.log(`  pending ${o.step} q${o.q}: ${o.msg}`)); }
  process.exit(bad ? 1 : 0);
}
