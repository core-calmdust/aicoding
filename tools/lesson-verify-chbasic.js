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
'use strict';
const path = require('path'), fs = require('fs'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const DONE = new Set(['b_check', 'b_escape', 'b_mate']);
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
  const pcs = b => b.replace(/\./g, '').split('').sort().join(''), near = (a, b) => { const d = dmin(a, b); return d <= 2 || (d <= 4 && pcs(a) === pcs(b)) ? d : 0; };
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
    const st = LS.steps.find(s => s.id === sid); if (!st) { add(sid, 0, 'missing'); continue; }
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
      if (sid !== 'b_escape') {
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
    if (kinds.size < 2) add(sid, 0, `追27 one kind of answer piece`);
    if (sid === 'b_escape' && defs.size < 3) add(sid, 0, `④ the three ways (take / run / block): ${[...defs]}`);
  }
  return out;
}
module.exports = { verify, lib, pool, words3d, DONE };
if (require.main === module) { const f = verify({ fast: process.argv.includes('--fast') }); f.forEach(x => console.log(`NG ${x.step} q${x.q}: ${x.msg}`)); console.log(f.length ? `${f.length} NG` : 'OK'); }
