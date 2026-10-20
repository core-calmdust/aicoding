'use strict';
// Shogi — opening classifier for the review ("矢倉模様の出だしです", "相掛かりになりました" …).
// Rule-based on the board after each move of an even game: rook swings (ranging-rook types), bishop exchange,
// side-pawn capture, double wing, Yagura / Gangi shapes, Anaguma / Mino castles.
// classify(E, start, moves) → { ev: { ply: [{k, s, n}] }, sum: { k, s, ranging: [file|0, file|0], castle: [k|null, k|null], set } }
//   ply = 1-based move number that made the shape; s = side (0 sente, 1 gote); n = name key.
(function (root) {
const FU = 1, KA = 5, HI = 6, KI = 7, OU = 8, GI = 4, WF = 16;
const EVEN = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const sq = (f, r) => (r - 1) * 9 + (9 - f);
// file / rank seen from side c (gote is rotated: its 2-file rook start = sente's 8-file)
const at = (p, c, f, r) => p.board[c ? sq(10 - f, 10 - r) : sq(f, r)];
const own = (c, t) => t + (c ? WF : 0);
const RANGE = { 5: 'naka', 6: 'shiken', 7: 'sanken', 8: 'mukai' };
function classify(E, start, moves) {
  const out = { ev: {}, sum: null };
  if ((start || '').split(' ').slice(0, 3).join(' ') !== EVEN.split(' ').slice(0, 3).join(' ')) return out;
  const p = new E.Position(); p.setSfen(EVEN);
  const add = (ply, k, s, n) => { (out.ev[ply] = out.ev[ply] || []).push({ k, s, n }); };
  const ranging = [0, 0], castle = [null, null], yag = [false, false], gan = [false, false];
  let kaku = 0, yoko = -1, aig = 0, opened = [false, false], aifuri = false, main = null;
  const N = Math.min(moves.length, 70);
  for (let i = 0; i < N; i++) {
    let m; try { m = p.fromUsi(moves[i]); } catch (e) { break; }
    const c = p.side, from = E.mFrom(m), to = E.mTo(m), drop = E.isDrop(m);
    const pc = drop ? 0 : p.board[from], cap = drop ? 0 : p.board[to];
    p.doMove(m); p.sp = 0;
    const ply = i + 1;
    // bishop diagonal opened (7六歩 / 3四歩 seen from each side)
    for (const s of [0, 1]) if (!opened[s] && at(p, s, 7, 7) !== own(s, FU)) opened[s] = true;
    // rook swing: own unpromoted rook arrives on its 2nd rank (from its side) on files 5–8, early
    if (!drop && (pc & 15) === HI && ply <= 40 && !ranging[c]) {
      const f = c ? 10 - E.sqFile(to) : E.sqFile(to), r = c ? 10 - E.sqRank(to) : E.sqRank(to);
      if (r === 8 && RANGE[f] && !kaku && yoko < 0) {
        ranging[c] = f;
        if (ranging[c ^ 1]) { aifuri = true; add(ply, 'aifuri', c, 'aifuri'); }
        else add(ply, 'furi', c, RANGE[f]);
      }
    }
    // side pawn capture: rook takes the pawn on 3四 (sente) / 7六 (gote) early
    if (!drop && (pc & 15) === HI && (cap & 15) === FU && ply <= 40 && yoko < 0 && !ranging[0] && !ranging[1]) {
      const f = c ? 10 - E.sqFile(to) : E.sqFile(to), r = c ? 10 - E.sqRank(to) : E.sqRank(to);
      if (f === 3 && r === 4) { yoko = c; add(ply, 'yoko', c, 'yoko'); }
    }
    // bishop exchange: both sides hold a bishop early
    if (!kaku && ply <= 30 && !ranging[0] && !ranging[1] && p.hand[0 * 8 + KA] >= 1 && p.hand[1 * 8 + KA] >= 1) { kaku = ply; if (yoko < 0) add(ply, 'kaku', c, 'kaku'); }
    // double wing: both rook pawns on the 5th rank before either side opened its bishop diagonal
    if (!aig && ply <= 20 && !opened[0] && !opened[1] && at(p, 0, 2, 5) === own(0, FU) && at(p, 1, 2, 5) === own(1, FU)) { aig = ply; add(ply, 'aig', c, 'aig'); }
    // shapes per side (static rook only)
    for (const s of [0, 1]) {
      if (ranging[s] || ply > 60) continue;
      if (!yag[s] && !kaku && yoko < 0 && at(p, s, 7, 7) === own(s, GI) && at(p, s, 6, 6) === own(s, FU) && (at(p, s, 6, 7) === own(s, KI) || at(p, s, 7, 8) === own(s, KI))) { yag[s] = true; add(ply, 'yag', s, 'yag'); }
      if (!gan[s] && !yag[s] && at(p, s, 6, 7) === own(s, GI) && at(p, s, 4, 7) === own(s, GI) && at(p, s, 6, 6) === own(s, FU)) { gan[s] = true; add(ply, 'gangi', s, 'gangi'); }
    }
    // castles: Anaguma (king in the corner) / Mino (ranging side: king 2八 + silver 3八)
    for (const s of [0, 1]) {
      if (castle[s] || ply > 70) continue;
      if (at(p, s, 9, 9) === own(s, OU) || at(p, s, 1, 9) === own(s, OU)) { castle[s] = 'ana'; add(ply, 'ana', s, 'ana'); }
      else if (ranging[s] && at(p, s, 2, 8) === own(s, OU) && at(p, s, 3, 8) === own(s, GI)) { castle[s] = 'mino'; add(ply, 'mino', s, 'mino'); }
    }
  }
  // summary: the main opening of the game
  let k = null, s = -1, set = null;
  if (aifuri) { k = 'aifuri'; set = 'furi'; }
  else if (ranging[0] || ranging[1]) { s = ranging[0] ? 0 : 1; k = RANGE[ranging[s]]; set = 'furi'; }
  else if (yoko >= 0) { k = 'yoko'; s = yoko; set = 'yokofu'; }
  else if (kaku) { k = 'kaku'; set = 'kakugawari'; }
  else if (aig) { k = 'aig'; set = 'aigakari'; }
  else if (yag[0] || yag[1]) { k = 'yag'; s = yag[0] && yag[1] ? -1 : yag[0] ? 0 : 1; set = 'yagura'; }
  else if (gan[0] || gan[1]) { k = 'gangi'; s = gan[0] && gan[1] ? -1 : gan[0] ? 0 : 1; set = 'ibisha'; }
  else if (N >= 16) { k = 'riki'; set = 'ibisha'; }
  if (k) out.sum = { k, s, ranging, castle, set };
  return out;
}
root.ShogiOpClass = { classify };
if (typeof module !== 'undefined') module.exports = { classify };
})(typeof self !== 'undefined' ? self : this);
