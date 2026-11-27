// (2026-11-28 第2期・担当B) Castle problems OFF the shown line, for the castle sets (src/castle.js): the old lineProbs asked "the
// line's next move?" at the positions of the line the lesson has just played out on the board (追1: the answer shown just
// before) and the 美濃系 castles shared the same first positions (⑤). These come from positions the line never reaches: the
// opponent plays other moves (the engine's top moves, sampled) and the castle side builds in another order, until 1〜3 moves of
// the castle are left. The question: "build the castle — which move?"
//   goal (G) : the moves that bring the castle closer (castle distance: the story's marked squares must hold the line's final
//              pieces; the distance is the fewest moves of those pieces on an empty board, the king by steps)
//   accept   : the G moves within ACC of the best G move by BOTH reads (depth 8 and 9 of the site's engine, deterministic)
//   kept only when no G move is in the grey zone (ACC..GAP below) in either read (追4 / 追84: the reads agree on the set), the
//   best G move is within TOP of the engine's best move of all (building is not a mistake there), the side to move is not in
//   check, nothing can be taken for free, and 3+ legal moves are left outside the set.
// node shogi/tools/openings/castleprobs.js <id> [seeds=…] [n=40] → castleprobs-<id>.json (candidates; pick.js-like choice below)
'use strict';
const fs = require('fs'), path = require('path');
const { conv, START } = require('./kif.js');
const W = require('./wasm-engine.js').loadSync(), E = W.E;
const ACC = 40, GAP = 100, TOP = 80, EVEN = 300;
const SRC = require('./src/castle.js');
const id = process.argv[2], N = +(process.argv.find(a => a.startsWith('n=')) || 'n=40').slice(2), SEED = +(process.argv.find(a => a.startsWith('seed=')) || 'seed=1').slice(5);
let rs = SEED >>> 0; const rnd = () => ((rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296);
const e = SRC.find(x => x.id === id); if (!e) throw new Error('no castle ' + id);
const usi = conv(e.line, e.start).usi, sfens = [], P0 = new E.Position(); P0.setSfen(e.start || START);
for (const u of usi) { sfens.push(P0.sfen()); P0.doMove(P0.fromUsi(u)); P0.sp = 0; } sfens.push(P0.sfen());
const fin = P0.board.slice();
const SQ = s => E.makeSq(+s[0], +s[1]);
const targets = e.story.marks.map(m => ({ sq: SQ(m), t: E.typeOf(fin[SQ(m)]) }));
// one step of each piece type (☗: rank 1 is forward), on an empty board
const STEP = { 4: [[0, -1], [1, -1], [-1, -1], [1, 1], [-1, 1]], 7: [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1]], 8: [[0, -1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [1, 1], [-1, 1]], 3: [[1, -2], [-1, -2]] };
const DIST = {};
function dist(t, a, b) {   // fewest moves of a ☗ piece of type t from a to b on an empty board (∞ if none)
  const k = t + ':' + a; if (!DIST[k]) { const d = new Array(81).fill(99), q = [a]; d[a] = 0;
    while (q.length) { const s = q.shift(), f = E.sqFile(s), r = E.sqRank(s); for (const [df, dr] of STEP[t] || []) { const f2 = f - df, r2 = r + dr; if (f2 < 1 || f2 > 9 || r2 < 1 || r2 > 9) continue; const s2 = E.makeSq(f2, r2); if (d[s2] > d[s] + 1) { d[s2] = d[s] + 1; q.push(s2); } } }
    DIST[k] = d; }
  return DIST[k][b];
}
function cdist(board) {   // the castle distance: the cheapest assignment of the ☗ pieces of each type to the marked squares
  let tot = 0;
  for (const t of [...new Set(targets.map(x => x.t))]) {
    const T = targets.filter(x => x.t === t).map(x => x.sq), own = []; for (let s = 0; s < 81; s++) if (board[s] && E.colorOf(board[s]) === 0 && E.typeOf(board[s]) === t) own.push(s);
    if (own.length < T.length) return 99;
    let best = 99; const go = (i, used, c) => { if (c >= best) return; if (i === T.length) { best = c; return; } own.forEach((s, j) => { if (!(used >> j & 1)) go(i + 1, used | 1 << j, c + dist(t, s, T[i])); }); }; go(0, 0, 0); tot += best;
  }
  return tot;
}
const onLine = new Set(sfens.map(s => s.split(' ').slice(0, 3).join(' ')));
const key = p => p.sfen().split(' ').slice(0, 3).join(' ');
const after = (p, m) => { p.doMove(m); const b = p.board.slice(); p.undoMove(); return b; };
const progress = p => p.legalMoves(true).filter(m => !E.isDrop(m) && cdist(after(p, m)) < cdist(p.board));
const hangFree = p => { // nothing of the opponent's can be taken for free right now, and the side to move is not in check (quiet)
  if (p.inCheck()) return false; return !p.legalMoves(true).some(m => !E.isDrop(m) && p.board[E.mTo(m)]); };
const rookSq = fin.findIndex(x => x && E.colorOf(x) === 0 && E.typeOf(x) === 6), rookSet = b => E.typeOf(b[rookSq]) === 6 && E.colorOf(b[rookSq]) === 0;   // (④ the strategy settled: the rook on its square of the line)
// seeds: the line's positions with ☗ to move and 3+ castle moves left, from the ply where the rook / the bishop are settled
const seeds = []; for (let k = 2; k < usi.length; k++) { const p = new E.Position(); p.setSfen(sfens[k]); if (p.side === 0 && cdist(p.board) >= 2 && rookSet(p.board)) seeds.push(k); }
const out = [], seen = new Set();
const quick = (sf, d) => W.analyze(sf, { depth: d });
let tries = 0;
while (out.length < N && tries < N * 30) {
  tries++;
  const k = seeds[(rnd() * seeds.length) | 0], p = new E.Position(); p.setSfen(sfens[k]); let dev = false;
  for (let ply = 0; ply < 14; ply++) {
    const d0 = cdist(p.board); if (d0 === 0) break;
    if (p.side === 0) {
      if (dev && d0 <= 3 && !onLine.has(key(p)) && !seen.has(key(p)) && hangFree(p) && rnd() < .5) break;
      const G = progress(p); let m;
      if (G.length && rnd() < .75) m = G[(rnd() * G.length) | 0];
      else { const r = quick(p.sfen(), 3).filter(x => !p.board[E.mTo(p.fromUsi(x.usi))]); if (!r.length) break; m = p.fromUsi(r[(rnd() * Math.min(3, r.length)) | 0].usi); }
      p.doMove(m); p.sp = 0;
    } else {
      const r = quick(p.sfen(), 4); if (!r.length) break; const lineMv = usi[k + ply]; let pick = r[(rnd() * Math.min(4, r.length)) | 0].usi;
      if (pick !== lineMv) dev = true; p.doMove(p.fromUsi(pick)); p.sp = 0;
    }
  }
  if (p.side !== 0 || !dev) continue;
  const kk = key(p), d0 = cdist(p.board); if (!rookSet(p.board) || seen.has(kk) || onLine.has(kk) || d0 < 1 || d0 > 3 || !hangFree(p)) continue; seen.add(kk);
  const sf = p.sfen(), G = progress(p).map(m => p.toUsi(m)); if (!G.length) continue;
  const r8 = quick(sf, 8), r9 = quick(sf, 9), ok = [];
  let bad = '';
  for (const r of [r8, r9]) {
    const v = new Map(r.map(x => [x.usi, x.s])), ref = Math.max(...G.map(u => v.get(u)));
    if (r[0].s - ref > TOP) bad = bad || `best ${r[0].usi} ${r[0].s} ≫ castle ${ref}`;
    const acc = G.filter(u => v.get(u) >= ref - ACC), grey = G.filter(u => v.get(u) < ref - ACC && v.get(u) >= ref - GAP);
    if (grey.length) bad = bad || `grey ${grey.join(',')}`;
    ok.push(acc.sort().join(','));
  }
  if (!bad && ok[0] !== ok[1]) bad = `reads differ ${ok[0]} / ${ok[1]}`;
  // (2026-11-28 c_yagura・c_funa) the opening is still even and quiet: |best| ≤ EVEN by both reads, no promoted piece on the board
  if (!bad && (Math.abs(r8[0].s) > EVEN || Math.abs(r9[0].s) > EVEN)) bad = `not even ${r9[0].s}`;
  if (!bad && p.board.some(x => x && E.typeOf(x) > 8)) bad = 'promoted piece';
  const legal = r9.length, acc = ok[1].split(',');
  if (!bad && legal - acc.length < 3) bad = 'few';
  console.log(out.length, kk, 'd' + d0, 'G=' + G.join(','), bad ? 'NG ' + bad : 'OK accept=' + acc.join(','));
  if (bad) continue;
  const v9 = new Map(r9.map(x => [x.usi, x.s])), v8 = new Map(r8.map(x => [x.usi, x.s]));
  const cand = r9.slice(0, 12).map(x => [x.usi, x.s]); for (const u of acc) if (!cand.some(c => c[0] === u)) cand.push([u, v9.get(u)]);
  out.push({ kind: 'best', mode: 'line', src: 'castle', off: 1, sfen: sf, ply: +sf.split(' ')[3] - 1, cand, accept: acc.sort((a, b) => v9.get(b) - v9.get(a)), pv: [acc.sort((a, b) => v9.get(b) - v9.get(a))[0]], floor: r9[r9.length - 1].s, d: 9, left: d0,
    sc8: r8.map(x => [x.usi, x.s]), G });
  fs.writeFileSync(path.join(__dirname, `castleprobs-${id}-${SEED}.json`), JSON.stringify(out));
}
fs.writeFileSync(path.join(__dirname, `castleprobs-${id}-${SEED}.json`), JSON.stringify(out));
console.log('done', out.length, 'tries', tries);
