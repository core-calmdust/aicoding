// (2026-11-26 第2期 担当A) chess「はじめてのチェス」b_check（チェック）・b_escape（チェックから逃げる）・b_mate（チェックメイト）:
// every problem against the rules (chess/engine.js), a small material search and, for b_escape, the site's engine (chess/tools/wasm.js).
// Called from tools/lesson-verify.js chessBasic (and lesson-facts.js chess).
//  b_check  ① ok = the set of checking moves; exactly one check on the board ② (one answer) ③ 6 legal moves or more, the answer's piece
//           (named by the 3D ask「{p}で…」= 追34) has 3 wrong moves or more, 追72 right ≤ 1/3 of the legal moves
//  b_mate   ① ok = the set of mating moves, exactly one ③ 3 checks or more (追19: a mate in 1 with a choice), 追72
//  b_escape ① best = the only move that loses nothing (the material search, 3 plies + captures) and the engine's best (2 node budgets,
//           追4) ② every other move scores under 16 (2D problemPoints = 3D CHESS.points) and is 150 or more worse; the stored sc = every
//           legal move, values from the engine ③ 3 legal moves or more; 追17 the marked pieces (own king, the checker): of the king's
//           moves and the captures of the checker, the right ones half at most and 3 wrong ones or more; 2D hint「取れるなら取るのが
//           いちばん」(追45): when the answer runs or blocks, nothing can take the checker
//  all      ④ b_check: the answer checks; b_mate: mates; b_escape: in check, the answer's kind (take / run / block) as the words say;
//           追27 two kinds of answer piece or more, b_escape all three kinds of defence ⑤ not the same board nor 1〜2 moves from any other chess
//           board (2 squares or fewer, or 4 or fewer with the same pieces) (lessons, diagrams, warm-ups, puzzles, opening lines and drills; mirrored and colour-swapped = 追1・追2) ⑥ d never goes
//           down, the last more than the first (b_check: legal moves; b_escape: legal moves; b_mate: the checks that do not mate)
//           ⑦⑧ ナイトン's words (atlas/lessons3d.js chLsJa) for the answer and every legal wrong move against the board: a wrong move in
//           b_check does not check; in b_mate a check that does not mate is said taken / run from / blocked as the board allows; in
//           b_escape a piece said to hang is taken by that piece for nothing, a move said to lose a piece loses material, a missed
//           capture is a move that does not take the checker
//  b_special (2026-11-26 担当A) castling / en passant / promotion: ① ok = the moves of the rule on the board (castles, en passant captures,
//           queen promotions), exactly one; the answer loses nothing (material search) and the engine's best at 2 node budgets (追4)
//           ② the next 100 or more worse ③ 6 legal moves or more, the 2D gold-framed piece (the answer's) 3 moves or more, 追72 ④ both castles,
//           en passant and promotion in the lesson; the en passant pawn just moved two squares; the words' squares (e1 / g1 / c1) ⑥ legal moves
//           never go down ⑦⑧ ナイトン's words for every wrong move say what it does (the king / the castling rook moved, the king stays on e1,
//           taken by that piece for a loss, the en passant pawn pushed / the right ends, an under-promotion, no promotion), none unexplained
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DONE = new Set(['b_check', 'b_escape', 'b_mate', 'b_special', 'b_draw', 'capture', 'escape']);
const MV = [0, 1, 3, 3, 5, 9, 0];
function lib() {
  const E = require(path.join(ROOT, 'chess/engine.js'));
  const pos = f => E.Pos.fromFEN(f);
  const mat = (q, side) => { let s = 0; for (let z = 0; z < 128; z++) { if (z & 0x88) { z += 7; continue; } const p = q.b[z]; if (p) s += ((p & 8 ? 1 : 0) === side ? 1 : -1) * MV[p & 7]; } return s; };
  // negamax over material: depth plies of every move, then captures only; ±100 for a mate, 0 for a stalemate
  function ms(q, d, a, b) {
    const L = q.legal(); if (!L.length) return q.inCheck() ? -100 : 0;
    let best = -1e9;
    if (d <= 0) { best = mat(q, q.side); if (best >= b) return best; if (best > a) a = best; }
    for (const m of L) { if (d <= 0 && !q.b[(m >> 7) & 127] && !((m >> 14) & 7)) continue;
      q.make(m); const v = -ms(q, d - 1, -b, -a); q.unmake(m); if (v > best) best = v; if (v > a) a = v; if (a >= b) break; }
    return best;
  }
  const after = (f, u) => { const q = pos(f); q.make(q.fromUci(u)); return q; };
  // what the mover keeps after u (material, its own side), against the best play of 3 plies + captures
  const keep = (f, u, d) => { const q = after(f, u); return -ms(q, d == null ? 3 : d, -1e9, 1e9); };
  const brd = fen => { const b = Array(64).fill('.'); String(fen).split(' ')[0].split('/').forEach((row, ri) => { let f = 0; for (const ch of row) { if (/\d/.test(ch)) f += +ch; else { b[(7 - ri) * 8 + f] = ch; f++; } } }); return b.join(''); };
  const swap = b => { let o = ''; for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) { const c = b[r * 8 + f]; o += c === '.' ? c : c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase(); } return o; };
  const flip = b => { let o = ''; for (let r = 0; r < 8; r++) for (let f = 7; f >= 0; f--) o += b[r * 8 + f]; return o; };
  const dist = (a, b) => { let n = 0; for (let i = 0; i < 64; i++) if (a[i] !== b[i]) n++; return n; };
  const dmin = (a, b) => Math.min(dist(a, b), dist(flip(a), b), dist(swap(a), b), dist(flip(swap(a)), b));
  // ⑤ the same board or 1〜2 moves apart: 2 squares or fewer, or 4 or fewer with the same pieces (two moves without a capture)
  const pcs = b => b.replace(/\./g, '').split('').sort().join(''), near = (a, b) => { const d = dmin(a, b); return d <= 2 || (d <= 4 && pcs(a) === pcs(b)) ? String(d) : 0; };   // (2026-11-27: a string, so the same board (0 squares) counts too)
  return { E, pos, mat, ms, after, keep, brd, dist, dmin, near };
}
// every other chess board (追1: the diagrams and warm-ups too)
function pool(Lb, skip) {
  const J = f => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const LS = J('chess/lessons.json'), PZ = J('chess/puzzles.json'), OP = J('chess/openings.json'), out = [];
  LS.steps.forEach(st => { (st.problems || []).forEach((q, j) => q.fen && !(skip && skip(st.id, j)) && out.push([`lesson ${st.id} q${j + 1}`, Lb.brd(q.fen)])); (st.ramp || []).forEach((q, j) => q.fen && out.push([`warm-up ${st.id} ${j + 1}`, Lb.brd(q.fen)])); if (st.diagram && st.diagram.fen) out.push([`lesson ${st.id} diagram`, Lb.brd(st.diagram.fen)]); });
  (PZ.levels || []).forEach(l => (l.puzzles || []).forEach((q, j) => out.push([`puzzle ${l.n} ${j + 1}`, Lb.brd(q.fen)])));
  Object.entries(PZ.old || {}).forEach(([k, q]) => out.push([`puzzle old ${k}`, Lb.brd(q.fen)]));
  OP.sets.forEach(s => { const p = Lb.E.Pos.fromFEN(Lb.E.START); for (const [u] of (s.study && s.study.steps) || []) { const m = p.fromUci(u); if (!m) break; p.make(m); out.push([`study ${s.id}`, Lb.brd(p.fen())]); } (s.drill || []).forEach(k => out.push([`drill ${s.id} ${k}`, Lb.brd(s.problems[k].fen)])); });
  return out;
}
// the 3D words (ナイトン) for one problem: { ask, hint, good, ng(u) }
function words3d(points) {
  const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  const a = src.indexOf('  const CH_PN = '), b = src.indexOf('  function chCheerJa(');
  const X = vm.runInNewContext(src.slice(a, b) + '\n;({ chLsJa, chLsF, chFacts, CH_PN })', { console, CHESS: { points } });
  const mkV = (off) => { const used = []; const V = { seed: 0, cheer: i => ['いいね！', 'さすが！'][i % 2], soft: i => ['大丈夫、', 'ドンマイ！'][i % 2], push: () => '', pick: (L) => L[(off || 0) % L.length], add: t => used.push(t), endOf: () => '' }; return V; };
  return { X, mkV };
}
function verify(opt) {
  const Lb = lib(), { E } = Lb, out = [], add = (sid, q, m) => out.push({ step: sid, q, msg: m });
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'chess/lessons.json'), 'utf8'));
  const PL = pool(Lb, (sid, j) => DONE.has(sid));
  const CHESS_points = (P, u) => {   // = atlas/lessons3d.js CHESS.points = chess/app.js problemPoints
    if (P.ok) return P.ok.includes(u) ? 20 : 0;
    const winP = (v, k) => 1 / (1 + Math.pow(10, -v / k));
    const val = new Map(P.sc), best = Math.max(...P.sc.map(e => e[1])), MT = 20000, mine = val.has(u) ? val.get(u) : -30000;
    if (best > MT && mine > MT) return mine >= best ? 20 : 16;
    if (mine >= best - 10) return 20;
    if (best > MT) return mine > 150 ? 8 : mine > -60 ? 4 : 0;
    if (mine < -MT) return 0;
    return Math.max(0, Math.round(20 * (1 - (winP(best, 400) - winP(mine, 400)) / .45)));
  };
  const W = words3d(CHESS_points);
  // (the 3D points use winP(v, 400) — check it is still that in lessons3d.js)
  const src3 = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
  if (!src3.includes('return Math.max(0, Math.round(20 * (1 - (winP(best, 400) - winP(mine, 400)) / .45)));')) add('-', 0, '⑨ CHESS.points changed — update tools/lesson-verify-chbasic.js');
  let wasm = null; const eng = (fen, nodes) => { if (!wasm) wasm = require(path.join(ROOT, 'chess/tools/wasm.js')); return wasm.analyze(fen, [], nodes); };
  const boards = [];
  for (const sid of DONE) {
    if (opt && opt.only && !opt.only.includes(sid)) continue;
    const st = (opt && opt.steps && opt.steps[sid]) || LS.steps.find(s => s.id === sid); if (!st) { add(sid, 0, 'missing'); continue; }
    const kinds = new Set(), defs = new Set(); let prevD = -1, firstD = null, lastD = null;
    st.problems.forEach((P, j) => {
      const q = j + 1, a = m => add(sid, q, m), p = Lb.pos(P.fen), me = p.side, legal = p.legal().map(m => p.uci(m));
      const ans = P.best || (P.ok || [])[0]; if (!legal.includes(ans)) { a(`① the answer ${ans} is not legal`); return; }
      const chk = legal.filter(u => Lb.after(P.fen, u).inCheck()), mate = chk.filter(u => !Lb.after(P.fen, u).hasLegal());
      const FA = W.X.chLsF(P.fen, ans); kinds.add(FA.pc);
      const B = Lb.brd(P.fen);
      for (const [w, b] of PL) { const d = Lb.near(B, b); if (d) { a(`⑤ ${d} squares from ${w}`); break; } }
      boards.forEach(([w, b]) => { const d = Lb.near(B, b); if (d) a(`⑤ ${d} squares from ${w}`); }); boards.push([`${sid} q${q}`, B]);
      if (p.inCheck() !== (sid === 'b_escape')) a(sid === 'b_escape' ? '④ not in check' : '④ the mover is in check');
      { const z = Lb.pos(P.fen); z.side ^= 1; if (z.inCheck()) a('the side not to move is in check'); }
      let right, d;
      if (sid === 'b_check') {
        right = chk; d = legal.length;
        if (JSON.stringify([...P.ok].sort()) !== JSON.stringify(chk.slice().sort())) a(`① ok ${P.ok} ≠ the checks ${chk}`);
        if (chk.length !== 1) a(`② ${chk.length} checks on the board (one answer wanted)`);
        if (legal.length < 6) a(`③ ${legal.length} legal moves`);
        const own = legal.filter(u => Lb.pos(P.fen).b[E.sqOf(u.slice(0, 2))] % 8 === Lb.pos(P.fen).b[E.sqOf(ans.slice(0, 2))] % 8);
        if (own.length - own.filter(u => chk.includes(u)).length < 3) a(`③ 追34 the ${W.X.CH_PN[FA.pc]}'s wrong moves ${own.length - 1} (3 or more)`);
      } else if (sid === 'b_mate') {
        right = mate; d = chk.length - mate.length;
        if (JSON.stringify([...P.ok].sort()) !== JSON.stringify(mate.slice().sort())) a(`① ok ${P.ok} ≠ the mates ${mate}`);
        if (mate.length !== 1) a(`② ${mate.length} mates`);
        if (chk.length < 3) a(`③ 追19 ${chk.length} checks (3 or more)`);
      } else if (sid === 'b_special') {
        // (2026-11-26 担当A) castling / en passant / promotion. The special moves on the board = the castles, the en passant captures, the promotions
        const pc = u => p.b[E.sqOf(u.slice(0, 2))] & 7, fx = u => E.sqOf(u.slice(0, 2)) & 7, tx = u => E.sqOf(u.slice(2, 4)) & 7;
        const isC = u => pc(u) === 6 && Math.abs(fx(u) - tx(u)) === 2, isE = u => pc(u) === 1 && fx(u) !== tx(u) && !p.b[E.sqOf(u.slice(2, 4))], isP = u => u.length === 5;
        const spec = legal.filter(u => isC(u) || isE(u) || isP(u)), kd = isC(ans) ? (tx(ans) === 6 ? 'castle-short' : 'castle-long') : isE(ans) ? 'ep' : isP(ans) ? 'promo' : '?';
        kinds.add(kd); d = legal.length;
        if (kd === '?') a(`④ the answer ${ans} uses no special rule`);
        right = kd === 'promo' ? spec.filter(u => u.endsWith('q')) : spec;
        if (kd === 'promo' && spec.some(u => !isP(u))) a(`④ a castle / en passant on the promotion board: ${spec.filter(u => !isP(u))}`);
        if (JSON.stringify([...P.ok].sort()) !== JSON.stringify(right.slice().sort())) a(`① ok ${P.ok} ≠ the moves of the rule ${right}`);
        if (right.length !== 1) a(`② ${right.length} moves of the rule (one answer wanted): ${right}`);
        if (kd.startsWith('castle') && ans !== (kd === 'castle-short' ? 'e1g1' : 'e1c1')) a(`⑧ the words name e1 / g1 / c1, the answer is ${ans}`);
        if (kd === 'ep') { const f = P.fen.split(' ')[3], z = E.sqOf(f), pw = Lb.pos(P.fen); if (f === '-' || ans.slice(2, 4) !== f || (pw.b[z - 16] & 7) !== 1 || pw.b[z] || pw.b[z + 16]) a(`⑧ the pawn did not just move two squares (ep ${f})`); }
        if (kd === 'promo' && ans[1] !== '7') a('⑧ the pawn is not one step from the last rank');
        const m0 = Lb.mat(p, me); if (Lb.keep(P.fen, ans) < m0) a('① the answer loses material');
        if (legal.length < 6) a(`③ ${legal.length} legal moves`);
        const own = legal.filter(u => u.slice(0, 2) === ans.slice(0, 2)).length; if (own < 3) a(`③ the framed piece (2D gold frame) has ${own} moves (3 or more)`);
        if (!(opt && opt.fast)) for (const nodes of [2e5, 8e5]) { const R = eng(P.fen, nodes); if (!R.length || R[0].uci !== ans) a(`① 追4 the engine (${nodes} nodes) prefers ${R[0] && R[0].uci}`); else if (R[1] && R[0].v - R[1].v < 100) a(`② 追4 the next (${R[1].uci}) only ${R[0].v - R[1].v} worse (${nodes} nodes)`); }
        // ⑦⑧ ナイトン's words for every wrong move, every wording
        let Rs = []; try { Rs = [...Array(12).keys()].map(off => W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off))); } catch (e) { a('⑦ chLsJa threw ' + e.message); }
        const keepOf = new Map();
        Rs.length && legal.filter(u => !right.includes(u)).forEach(u => [...new Set(Rs.map(R => R.ng(u)))].forEach(t => { let known = 0; const T = t;
          if (/キャスリングはできなくなっちゃう|キャスリングの権利が消え/.test(T)) { known++; if (pc(u) !== 6) a(`⑦ ${u}: said the king moved`); }
          if (/ルークが動くと、そちら側/.test(T)) { known++; if (pc(u) !== 4 || !['a1', 'h1'].includes(u.slice(0, 2)) || !P.fen.split(' ')[2].includes(u[0] === 'a' ? 'Q' : 'K')) a(`⑦ ${u}: said a castling rook moved`); }
          if (/真ん中に残ったまま|まだ真ん中のe1/.test(T)) { known++; if (pc(u) === 6 || p.ksq[me] !== E.sqOf('e1')) a(`⑦ ${u}: said the king stays on e1`); }
          if (/取られて損/.test(T)) { known++; if (!keepOf.has(u)) keepOf.set(u, Lb.keep(P.fen, u)); const G = W.X.chLsF(P.fen, u), by = G.hang && Object.entries(W.X.CH_PN).find(([, v]) => v === G.hang)[0], z = Lb.after(P.fen, u);
            if (!by || !z.legal().some(m => z.uci(m).slice(2, 4) === u.slice(2, 4) && 'xpnbrqk'[z.b[(m & 127)] & 7] === by)) a(`⑦ ${u}: said taken by the ${G.hang}, it cannot`); if (m0 - keepOf.get(u) < 1) a(`⑦ ${u}: said to lose, keeps the material`); }
          if (/もう取れなくなる/.test(T)) { known++; if (u.slice(0, 2) !== ans.slice(0, 2) || fx(u) !== tx(u)) a(`⑦ ${u}: said the en passant pawn pushed`); }
          if (/アンパッサンの権利|もうアンパッサンできない/.test(T)) { known++; if (kd !== 'ep' || isE(u)) a(`⑦ ${u}: said the en passant right ends`); }
          if (/クイーンより弱い/.test(T)) { known++; if (!isP(u) || u.endsWith('q')) a(`⑦ ${u}: said an under-promotion`); }
          if (/奥の段に着かない|まだ成れていない/.test(T)) { known++; if (isP(u)) a(`⑦ ${u}: said it does not promote`); }
          if (!known) a(`⑦ ${u}: the words do not say what the move does: ${t}`); }));
      } else if (sid === 'b_draw') {
        // (2026-11-27 担当A) stalemate: the one mate in 1 among stalemate traps. ① ok = the mating moves, exactly one ③ 6 legal moves or more,
        // 3 checks or more (追19) ④ 2 stalemating moves or more (the lesson's trap); d = the stalemates + the checks that do not mate
        const st = legal.filter(u => { const z = Lb.after(P.fen, u); return !z.inCheck() && !z.hasLegal(); });
        right = mate; d = st.length + chk.length - mate.length;
        if (!P.ok || JSON.stringify([...P.ok].sort()) !== JSON.stringify(mate.slice().sort())) a(`① ok ${P.ok} ≠ the mates ${mate}`);
        if (mate.length !== 1) a(`② ${mate.length} mates`);
        if (legal.length < 6) a(`③ ${legal.length} legal moves`);
        if (chk.length < 3) a(`③ 追19 ${chk.length} checks (3 or more)`);
        if (st.length < 2) a(`④ ${st.length} stalemating moves (2 or more: the lesson's trap)`);
        // ⑦⑧ ナイトン's words for every wrong move, every wording, against the board
        let Rs = []; try { Rs = [...Array(12).keys()].map(off => W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off))); } catch (e) { a('⑦ chLsJa threw ' + e.message); }
        const m0 = Lb.mat(p, me);
        Rs.length && legal.filter(u => !right.includes(u)).forEach(u => { const z = Lb.after(P.fen, u), isSt = st.includes(u), kq = z.ksq[z.side];
          const kMoves = z.legal().filter(m => (m & 127) === kq).length, lose = z.legal().some(m => z.uci(m).slice(2, 4) === u.slice(2, 4)) && Lb.keep(P.fen, u, 2) < m0;
          [...new Set(Rs.map(R => R.ng(u)))].forEach(t0 => { const t = t0.split('{m}')[0], S = /ステイルメイト|引き分け/.test(t), H = /取られちゃう/.test(t), C = t.match(/王手だけど、黒のキングにはまだ逃げるマスが(\d+)つ/), C2 = /王手は、キングに逃げ道が残る|キングは空いたマスへ逃げられ/.test(t), Q = /チェックにならない|王手がかからない|王手がかかっていない|チェックもかかっていない/.test(t);
            if (S !== isSt && !(H && lose)) a(`⑦ ${u}: stalemate ${isSt}, the words: ${t}`);
            if (H && !lose) a(`⑦ ${u}: said taken by the king, it is not: ${t}`);
            if (C && (!z.inCheck() || +C[1] !== kMoves || !kMoves)) a(`⑦ ${u}: said check with ${C[1]} ways out (check ${z.inCheck()}, ${kMoves}): ${t}`);
            if (C2 && !(z.inCheck() && z.hasLegal())) a(`⑦ ${u}: said a check that does not mate: ${t}`);
            if (Q && (z.inCheck() || !z.hasLegal())) a(`⑦ ${u}: said no check and Black can still move: ${t}`);
            if (!S && !H && !C && !C2 && !Q) a(`⑦ ${u}: the words do not say what the move does: ${t}`);
            if (isSt && !S && !lose) a(`⑦ ${u} stalemates, the words do not say so: ${t}`); }); });
        // ⑧ the question and the praise: no piece named that the answer does not move
        const T = []; for (let off = 0; off < 30; off++) { try { const R = W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off)); T.push(R.ask, R.hintTx, R.good(ans)); } catch (e) { break; } }
        new Set(T).forEach(t => { for (const [c, n] of Object.entries(W.X.CH_PN)) if (c !== FA.pc && c !== 'k' && t.includes(n)) a(`⑧ the ${n} named, the answer moves the ${W.X.CH_PN[FA.pc]}: ${t}`); if (!/詰|メイト|決着/.test(t) && T.indexOf(t) % 3 === 2) a(`⑧ the praise does not say mate: ${t}`); });
      } else if (sid === 'capture' || sid === 'escape') {
        // (2026-11-28 担当A) the tactics「ただの駒を取る」capture /「狙われた駒を守る」escape. The material search (3 plies + captures) over every
        // legal move: capture ① the answer is the one move that wins the most, a capture, 2 pawns or more over every other move; escape ① the
        // one move that loses nothing, a move of the one threatened piece, every other move loses 2 or more. Both: the engine's best at 2 node
        // budgets, the next 150 or more worse (追4) ② every other move under 16 points, sc = every legal move ③ 8 legal moves or more; capture
        // 3 captures or more, escape the threatened piece has 4 moves or more ④ the 2D red frames (chess/app.js hanging): capture 2 frames or
        // more on the other side, the answer takes one, each can be taken without a loss (the hint), none on our side; escape exactly one
        // frame (a piece, not a pawn) on our side, none on theirs; capture: both a free piece and a defended bigger one in the lesson; no pawn
        // one step from promoting ⑦⑧ ナイトン's words (every wording) for the answer and every wrong move against the board
        d = legal.length; if (legal.length < 8) a(`③ ${legal.length} legal moves (8 or more)`);
        const m0 = Lb.mat(p, me), keep = Object.fromEntries(legal.map(u => [u, Lb.keep(P.fen, u)]));
        const hgO = hanging(Lb, P.fen, me ^ 1), hgM = hanging(Lb, P.fen, me), to = u => E.sqOf(u.slice(2, 4));
        const takes = (z, sq, by) => z.legal().some(m => (m >> 7 & 127) === sq && (!by || 'xpnbrqk'[z.b[m & 127] & 7] === by));
        // the moved piece is taken for a loss by that piece (the words「〜に取られて損」): that capture is legal and either cannot be taken back or
        // takes a piece worth more than the taker
        const lost = (u, by) => { const z = Lb.after(P.fen, u), sq = to(u); return z.legal().some(m => { if ((m >> 7 & 127) !== sq || 'xpnbrqk'[z.b[m & 127] & 7] !== by) return false;
          const v = MV[z.b[sq] & 7], t = MV[z.b[m & 127] & 7]; z.make(m); const back = z.legal().some(m2 => (m2 >> 7 & 127) === sq); z.unmake(m); return !back || v > t; }); };
        { const bb = Lb.brd(P.fen); for (let i = 0; i < 64; i++) if ((bb[i] === 'p' && (i >> 3) === 1) || (bb[i] === 'P' && (i >> 3) === 6)) a('④ a pawn one step from promoting'); }
        if (sid === 'capture') {
          const mx = Math.max(...legal.map(u => keep[u])); right = legal.filter(u => keep[u] === mx);
          if (right.length !== 1 || right[0] !== ans) a(`① the moves that win the most ${right} (only ${ans} wanted)`);
          if (mx < m0 + 2) a(`① the answer wins ${mx - m0} (2 or more)`);
          legal.forEach(u => { if (u !== ans && keep[u] > mx - 2) a(`② ${u} keeps ${keep[u] - m0}, the answer ${mx - m0}`); });
          if (!p.b[to(ans)]) a('④ the answer takes nothing');
          if (legal.filter(u => p.b[to(u)]).length < 3) a('③ fewer than 3 captures');
          if (hgO.length < 2) a(`④ ${hgO.length} red frames (2 or more)`); if (!hgO.includes(ans.slice(2, 4))) a('④ the answer\'s piece is not framed');
          hgO.forEach(sq => { if (!legal.some(u => u.slice(2, 4) === sq && keep[u] >= m0)) a(`④ the frame ${sq} cannot be taken without a loss`); });
          if (hgM.length) a(`④ our own piece framed ${hgM}`);
          const defd = takes(Lb.after(P.fen, ans), to(ans)); defs.add(defd ? 'defended' : 'free');
          if (defd && MV['xpnbrqk'.indexOf(FA.cap)] <= MV['xpnbrqk'.indexOf(FA.pc)]) a('④ a defended piece no bigger than the taker');
        } else {
          right = legal.filter(u => keep[u] >= m0); if (right.length !== 1 || right[0] !== ans) a(`① the moves that lose nothing ${right} (only ${ans} wanted)`);
          legal.forEach(u => { if (u !== ans && keep[u] > m0 - 2) a(`② ${u} loses only ${m0 - keep[u]}`); });
          if (hgM.length !== 1) a(`④ ${hgM.length} of our pieces framed (one wanted)`); else { const s0 = hgM[0];
            if ((p.b[E.sqOf(s0)] & 7) === 1) a('④ the threatened piece is a pawn');
            if (ans.slice(0, 2) !== s0) a('④ the answer does not move the threatened piece');
            if (legal.filter(u => u.slice(0, 2) === s0).length < 4) a('③ the threatened piece has fewer than 4 moves'); }
          if (hgO.length) a(`④ their piece framed ${hgO}`);
          if (!FA.was) a('⑧ the words take the answer for a counter-attack (FA.was false)');
          defs.add(FA.pc);
        }
        const sc = new Map(P.sc || []); if (!P.sc || P.sc.length !== legal.length || legal.some(u => !sc.has(u))) a('② sc is not every legal move');
        if (!(opt && opt.fast)) for (const nodes of [2e5, 8e5]) { const R = eng(P.fen, nodes); if (!R.length || R[0].uci !== ans) a(`① 追4 the engine (${nodes} nodes) prefers ${R[0] && R[0].uci}`); else if (R[1] && R[0].v - R[1].v < 150) a(`② 追4 the next (${R[1].uci}) only ${R[0].v - R[1].v} worse (${nodes} nodes)`); }
        if (P.sc) { legal.filter(u => u !== ans).forEach(u => { const pt = CHESS_points(P, u); if (pt >= 16) a(`② ${u} scores ${pt}`); if (sc.get(ans) - sc.get(u) < 150) a(`② ${u} only ${sc.get(ans) - sc.get(u)} worse`); }); if (CHESS_points(P, ans) !== 20) a('② the answer scores under 20'); }
        // ⑦⑧ the words
        const zA = Lb.after(P.fen, ans), ansSafe = !takes(zA, to(ans)), s0 = ans.slice(0, 2);
        const T = []; let Rs = []; try { Rs = [...Array(12).keys()].map(off => W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off))); } catch (e) { a('⑦ chLsJa threw ' + e.message); }
        Rs.forEach(R => T.push(R.good(ans), R.hintTx));
        const ansWords = t => {   // what the words say of the answer (the praise, and the correct move led into a correction)
          if (sid === 'capture') {
            if (/守られていなかった|守りのない|守る駒は1つもいなかった|取り返されずに|取り返せる駒はどこにもいない|守っている駒がいない|取り返す駒がいない|取り返しに来る駒はいない|何も取り返せない|ノーガード|ただ取り|まるまる得/.test(t) && !ansSafe) a(`⑧ said ${ans} is not taken back, it is: ${t}`);
            if (/取り返されても|交換でも得|との交換/.test(t) && ansSafe) a(`⑧ said ${ans} is taken back, it is not: ${t}`);
          } else {
            if (/もう相手の駒は届かない|どの駒にもねらわれない|もう取られない|逃げた先も安全|届かないマスへ|もうねらわれない|どの駒にも取られない|ねらえる駒がいない|安全ピョン/.test(t) && !ansSafe) a(`⑧ said ${ans} is safe, it can be taken: ${t}`);
            if (/取られても取り返せ|守りのあるマス|味方の守りがつく|味方の駒で取り返せる/.test(t) && (ansSafe || !Lb.after(P.fen, ans).attacked(to(ans), me))) a(`⑧ said ${ans} can be taken and taken back: ${t}`);
            if (/ねらわれているのは/.test(t) && !t.includes(W.X.CH_PN[FA.pc])) a(`⑧ the hint names another piece: ${t}`);
            if (/反撃|にらみ返|ねらいをつけ/.test(t)) a(`⑧ a counter-attack in the words: ${t}`);
          } };
        new Set(T).forEach(ansWords);
        Rs.length && legal.filter(u => u !== ans).forEach(u => [...new Set(Rs.map(R => R.ng(u)))].forEach(t => { ansWords(t); const G = W.X.chLsF(P.fen, u), z = Lb.after(P.fen, u), loss = m0 - keep[u]; let known = 0;
          const byOf = h => (Object.entries(W.X.CH_PN).find(([, v]) => v === h) || [])[0];
          if (sid === 'capture') {
            if (/守られていて|取り返されて損/.test(t)) { known++; if (!lost(u, byOf(G.hang)) || loss < 1) a(`⑦ ${u}: said taken back for a loss (loss ${loss}): ${t}`); }
            if (/のほうが価値が高い|もっと大きな/.test(t)) { known++; if (!G.cap || MV['xpnbrqk'.indexOf(G.cap)] >= MV['xpnbrqk'.indexOf(FA.cap)]) a(`⑦ ${u}: said a smaller capture: ${t}`); }
            if (/取られて損しちゃう|に取られる場所/.test(t)) { known++; if (!lost(u, byOf(G.hang))) a(`⑦ ${u}: said taken by the ${G.hang}: ${t}`); }
            if (/見のがし|がそのまま|逃げちゃうかも|まだ盤の上/.test(t)) { known++; if (u.slice(2, 4) === ans.slice(2, 4)) a(`⑦ ${u}: said to miss the capture, takes it: ${t}`); }
          } else {
            if (/そのまま取られ|を取られちゃう|ただで取られる/.test(t)) { known++; if (u.slice(0, 2) === s0 || !takes(z, E.sqOf(s0)) || loss < 1) a(`⑦ ${u}: said the threatened piece is taken: ${t}`); }
            if (/に逃げても、そこで|の通り道/.test(t)) { known++; if (u.slice(0, 2) !== s0 || !lost(u, byOf(G.hang)) || loss < 1) a(`⑦ ${u}: said taken where it ran to: ${t}`); }
            if (/形が悪くなって損|駒を損する|べつの駒がねらわれて損|心配が残ったまま/.test(t)) { known++; if (loss < 1) a(`⑦ ${u}: said to lose, keeps the material: ${t}`); if (/べつの駒/.test(t) && u.slice(0, 2) !== s0) a(`⑦ ${u}: said another piece is hit: ${t}`); }
          }
          if (!known) a(`⑦ ${u}: the words do not say what the move does: ${t}`); }));
      } else {
        d = legal.length; if (legal.length < 3) a(`③ ${legal.length} legal moves`);
        const m0 = Lb.mat(p, me), keep = Object.fromEntries(legal.map(u => [u, Lb.keep(P.fen, u)]));
        right = legal.filter(u => keep[u] >= m0); if (right.length !== 1 || right[0] !== ans) a(`① the moves that lose nothing ${right} (only ${ans} wanted)`);
        const sc = new Map(P.sc || []); if (P.sc.length !== legal.length || legal.some(u => !sc.has(u))) a('② sc is not every legal move');
        if (!(opt && opt.fast)) for (const nodes of [2e5, 8e5]) { const R = eng(P.fen, nodes); if (!R.length || R[0].uci !== ans) a(`① 追4 the engine (${nodes} nodes) prefers ${R[0] && R[0].uci}`); else if (R[1] && R[0].v - R[1].v < 150) a(`② 追4 the next (${R[1].uci}) only ${R[0].v - R[1].v} worse (${nodes} nodes)`); }
        legal.filter(u => u !== ans).forEach(u => { const pt = CHESS_points(P, u); if (pt >= 16) a(`② ${u} scores ${pt}`); if (sc.get(ans) - sc.get(u) < 150) a(`② ${u} only ${sc.get(ans) - sc.get(u)} worse`); });
        if (CHESS_points(P, ans) !== 20) a('② the answer scores under 20');
        const ck = (() => { const z = Lb.pos(P.fen), k = z.ksq[me]; for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } const pc = z.b[s]; if (!pc || (pc & 8 ? 1 : 0) === me) continue; const b2 = Lb.pos(P.fen); for (let s2 = 0; s2 < 128; s2++) { if (s2 & 0x88) { s2 += 7; continue; } if (s2 !== s && s2 !== k && b2.b[s2] && (b2.b[s2] & 8 ? 1 : 0) !== me) b2.b[s2] = 0; } if (b2.attacked(k, me ^ 1)) return E.sqName ? E.sqName(s) : 'abcdefgh'[s & 7] + ((s >> 4) + 1); } return null; })();
        const kind = u => u.slice(2, 4) === ck ? 'take' : Lb.pos(P.fen).b[E.sqOf(u.slice(0, 2))] % 8 === 6 ? 'run' : 'block';
        const kA = kind(ans); defs.add(kA);
        const FK = { take: !!FA.cap, run: FA.pc === 'k' && !FA.cap }; if ((kA === 'take') !== FK.take || (kA === 'run') !== (FA.pc === 'k' && !FA.cap)) a(`④ the words' kind of ${ans} ≠ ${kA}`);
        const caps = legal.filter(u => u.slice(2, 4) === ck);
        if (kA !== 'take' && caps.length) a(`追45 the 2D hint says take if you can, ${caps} takes the checker, the answer ${kA}s`);
        const marked = legal.filter(u => kind(u) !== 'block'), mr = marked.filter(u => u === ans).length;
        if (mr * 2 > marked.length || marked.length - mr < 3) a(`追17 the marked king / checker: ${mr} right of ${marked.length}`);
        // ⑦⑧ the words of every wrong move
        let Rs = []; try { Rs = [...Array(12).keys()].map(off => W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off))); } catch (e) { a('⑦ chLsJa threw ' + e.message); }
        Rs.length && legal.filter(u => u !== ans).forEach(u => [...new Set(Rs.map(R => R.ng(u)))].forEach(t => { const G = W.X.chLsF(P.fen, u), loss = m0 - keep[u];
          if (/ただで取られ|取られて損/.test(t) && G.hang) { const by = Object.entries(W.X.CH_PN).find(([, v]) => v === G.hang)[0], z = Lb.after(P.fen, u);
            const tk = z.legal().filter(m => z.uci(m).slice(2, 4) === u.slice(2, 4) && 'xpnbrqk'[z.b[(m & 127)] & 7] === by); if (!tk.length) a(`⑦ ${u}: said taken by the ${G.hang}, it cannot`); if (loss < 1) a(`⑦ ${u}: said to hang, loses nothing`); }
          if (/損/.test(t) && loss < 1) a(`⑦ ${u}: said to lose a piece, keeps the material`);
          if (/見のがし|そのまま残っ/.test(t) && kind(u) === 'take') a(`⑦ ${u}: said to miss the capture, takes the checker`);
          if (/逃げ/.test(t.split('。')[0]) && kind(u) !== 'run') a(`⑦ ${u}: said to run, it ${kind(u)}s`);
          if (/合い駒|あいだに置いた/.test(t.split('。')[0]) && kind(u) !== 'block') a(`⑦ ${u}: said to block, it ${kind(u)}s`); }));
      }
      if (sid === 'b_check' || sid === 'b_mate') {
        let Rs = []; try { Rs = [...Array(12).keys()].map(off => W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off))); } catch (e) { a('⑦ chLsJa threw ' + e.message); }
        Rs.length && legal.filter(u => !right.includes(u)).forEach(u => [...new Set(Rs.map(R => R.ng(u)))].forEach(t => { const z = Lb.after(P.fen, u);
          if (sid === 'b_check' && z.inCheck()) a(`⑦ ${u} checks`);
          if (sid === 'b_mate' && z.inCheck()) {
            const L2 = z.legal(), to = E.sqOf(u.slice(2, 4)), kq = z.ksq[z.side];
            const take = L2.some(m => (m >> 7 & 127) === to), run = L2.some(m => (m & 127) === kq && (m >> 7 & 127) !== to), block = L2.some(m => (m & 127) !== kq && (m >> 7 & 127) !== to);
            if (/取られ/.test(t) && !take) a(`⑦ ${u}: said taken, the checker cannot be taken`);
            if (/逃げ道が残|逃げられ|逃げるマスがまだ/.test(t) && !run) a(`⑦ ${u}: said run from, the king cannot move`);
            if (/あいだに駒|はさまれ/.test(t) && !block) a(`⑦ ${u}: said blocked, nothing can come between`);
            if (!/取られ|逃げ道が残|逃げられ|逃げるマスがまだ|あいだに駒|はさまれ/.test(t)) a(`⑦ ${u}: the check that does not mate is not explained: ${t}`);
          }
          if (sid === 'b_mate' && !z.inCheck() && !/チェックになっていない|王手がかから|ねらわれていない|王手にならない|自由なまま|ねらっていない/.test(t)) a(`⑦ ${u}: no check, the words: ${t}`);
          if (sid === 'b_check' && !/届かない|ねらわれていない|線が通らない|王手がかからない|ねらえない|安全なまま/.test(t)) a(`⑦ ${u}: the words: ${t}`); }));
      }
      if (sid === 'b_mate') {   // ⑧ the hints and the praise (every wording) against the board
        const z = Lb.after(P.fen, ans), kq = z.ksq[z.side], nb = []; for (const dd of [1, -1, 16, -16, 15, -15, 17, -17]) { const t = kq + dd; if (!(t & 0x88)) nb.push(t); }
        const own = t => z.b[t] && (z.b[t] & 8 ? 1 : 0) === z.side, smother = nb.every(own), pawnWall = nb.some(t => own(t) && (z.b[t] & 7) === 1);
        const zk = Lb.after(P.fen, ans); zk.b[kq] = 0; const allHit = nb.every(t => own(t) || zk.attacked(t, z.side ^ 1)), to = E.sqOf(ans.slice(2, 4)), near = nb.includes(to);
        const zz = Lb.after(P.fen, ans); zz.b[to] = 0; const guarded = (() => { const g = Lb.after(P.fen, ans); g.b[to] = (g.side ? 0 : 8) | 1; return g.attacked(to, g.side ^ 1); })();
        const T = []; for (let off = 0; off < 40; off++) { try { const R = W.X.chLsJa(sid, { pos: P.fen, ans, P }, j, W.mkV(off)); T.push(R.hintTx, R.good(ans)); } catch (e) { a('⑦ chLsJa threw ' + e.message); break; } }
        new Set(T).forEach(t => {
          if (/自分の駒にかこまれ|味方の駒が壁|味方の駒でいっぱい/.test(t) && !smother) a(`⑧ said smothered, the king has a free neighbour: ${t}`);
          if (/自分のポーンでふさがって/.test(t) && !pawnWall) a(`⑧ said walled by its pawns, none next to the king: ${t}`);
          if (/まわりのマスは全部/.test(t) && !allHit) a(`⑧ said every square around is covered: ${t}`);
          if (/守られているから|守りがついて|守りがあるから/.test(t) && !(near && guarded)) a(`⑧ said next to the king and guarded: ${t}`);
          if (/ナイト/.test(t) && FA.pc !== 'n') a(`⑧ a knight in the words, the answer moves a ${FA.pc}: ${t}`); });
      }
      if (right.length * 3 > legal.length) a(`追72 ${right.length} right of ${legal.length}`);
      if (d < prevD) a(`⑥ d ${d} after ${prevD}`); prevD = Math.max(prevD, d); if (firstD == null) firstD = d; lastD = d;
    });
    if (lastD <= firstD) add(sid, 0, `⑥ the last (d ${lastD}) not harder than the first (${firstD})`);
    if (sid !== 'b_special' && kinds.size < 2) add(sid, 0, `追27 one kind of answer piece`);
    if (sid === 'b_special' && ['castle-short', 'castle-long', 'ep', 'promo'].some(k => !kinds.has(k))) add(sid, 0, `④ the three rules (both castles, en passant, promotion): ${[...kinds]}`);
    if (sid === 'b_escape' && defs.size < 3) add(sid, 0, `④ the three ways (take / run / block): ${[...defs]}`);
    if (sid === 'capture' && defs.size < 2) add(sid, 0, `④ a free piece and a defended bigger one (the intro): ${[...defs]}`);
  }
  return out;
}
// = chess/app.js hanging(): the pieces of that colour (0 white, 1 black) the other side attacks with no defender or with a cheaper piece
// (the 2D red frames of「ただの駒を取る」capture / 「狙われた駒を守る」escape)
function hanging(Lb, fen, color) {
  const { E } = Lb, pos = Lb.pos(fen), b = pos.b, them = color ^ 1, atk = new Map(), PV = [0, 1, 3, 3, 5, 9, 0];
  const flip = pos.side !== them; if (flip) pos.makeNull();
  const buf = new Int32Array(256), n = pos.gen(buf, true); if (flip) pos.unmakeNull();
  for (let i = 0; i < n; i++) { const m = buf[i], t = E.mTo(m), f = E.mFrom(m); if (!b[t] || (b[t] >> 3) !== color) continue; const v = PV[b[f] & 7] || 100; if (!atk.has(t) || v < atk.get(t)) atk.set(t, v); }
  const out = []; for (const [s, av] of atk) { const t = b[s] & 7; if (t === 6) continue; if (!pos.attacked(s, color) || av < PV[t]) out.push(E.sqName(s)); }
  return out.sort();
}
module.exports = { verify, lib, pool, words3d, hanging, DONE };
if (require.main === module) { const f = verify({ fast: process.argv.includes('--fast') }); f.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK'); }
