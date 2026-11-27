// Ultimate Tic-Tac-Toe — the board facts behind the lesson texts (the page: window.UtttLsFacts; the tools: require). Every
// explanation of a right or wrong answer is read from the position here (what the move does, where it sends the opponent and
// what the opponent can do there at once); nothing comes from the engine's evaluation. tools/lesson-verify-uttt.js checks
// every lesson problem against these facts (① – ⑨ of claude/lesson-quality.md).
(function () {
'use strict';
const W3 = (() => { const L = [7, 56, 448, 73, 146, 292, 273, 84], a = new Uint8Array(512); for (let m = 0; m < 512; m++) a[m] = L.some(x => (m & x) === x) ? 1 : 0; return a; })();
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
// the cells of small board b where player p would complete a line now (b still open)
function winCells(pos, b, p) {
  if (pos.own[b]) return [];
  const out = [];
  for (let c = 0; c < 9; c++) { const m = b * 9 + c; if (pos.c[m]) continue; let mk = 0; for (let i = 0; i < 9; i++) if (pos.c[b * 9 + i] === p || i === c) mk |= 1 << i; if (W3[mk]) out.push(m); }
  return out;
}
// what the opponent can do at once after my move m: { k: 'win' (m wins the game) | 'lose' (a reply wins the game) | 'take' (a reply
// wins a small board) | 'free' (m sends to a decided board, no reply takes anything) | 'ok', r: the reply, tb: the board it takes,
// t: the board m sends to (−1 = anywhere) }
function after(E, pos, m) {
  const me = pos.turn, q = pos.clone().play(m), t = q.forced;
  if (q.res === me) return { k: 'win', t };
  if (q.res >= 0) return { k: 'end', t };
  const R = q.moves();
  const lose = R.find(r => q.clone().play(r).res === 3 - me);
  if (lose != null) return { k: 'lose', r: lose, t, tb: E.mB(lose) };
  // a reply that wins a small board: the most valuable one (a board on more lines of the big board first, then the lowest cell)
  let take = null, tv = -1;
  for (const r of R) { const b = E.mB(r); const z = q.clone().play(r); if (!q.own[b] && z.own[b] === 3 - me) { const v = [3, 2, 3, 2, 4, 2, 3, 2, 3][b]; if (v > tv) { tv = v; take = r; } } }
  if (take != null) return { k: 'take', r: take, t, tb: E.mB(take) };
  if (t < 0) return { k: 'free', t };
  return { k: 'ok', t };
}
// boards that matter on the big board: the open third board of a line where one side already has two boards
function keyBoards(E, pos) {
  const out = new Set();
  for (const p of [1, 2]) for (const L of LINES) { const n = L.filter(b => pos.own[b] === p || (E.R.tie && pos.own[b] === 3)).length, open = L.filter(b => !pos.own[b]); if (n === 2 && open.length === 1) out.add(open[0]); }
  return [...out];
}
// the fact of a lesson answer m (spec: the problem position): for the page's texts
//   { k: 'take' | 'win' (the right kind of move), b (its board), t (where it sends), tk (after: ok / take / free / lose), r, tb }
//   wrong moves: k = 'miss' (b_take / b_big: no line), or the opponent's refutation 'lose' / 'take' / 'free' (+ r, tb, t)
function fact(E, id, spec, m) {
  const pos = E.Pos.from(spec), me = pos.turn, b = E.mB(m), q = pos.clone().play(m);
  const took = !pos.own[b] && q.own[b] === me, won = q.res === me;
  const a = after(E, pos, m);
  const o = { b, t: a.t, r: a.r, tb: a.tb, took, won, ak: a.k };
  if (id === 'b_big') return Object.assign(o, { k: won ? 'win' : 'miss' });
  if (id === 'b_take') return Object.assign(o, { k: took ? 'take' : 'miss' });
  if (/^s_force/.test(id)) return Object.assign(o, { k: a.k === 'lose' ? 'lose' : a.k === 'take' ? 'take' : 'slow' });
  return Object.assign(o, { k: a.k === 'ok' ? (took ? 'mytake' : 'ok') : a.k === 'win' ? 'win' : a.k });
}
// the hint's marks (level 2): the board to look at, never the answer cell itself
function hint(E, id, spec) {
  const pos = E.Pos.from(spec);
  if (id === 'b_big' || id === 's_free') return { zones: keyBoards(E, pos) };
  if (id === 'b_block') return { zones: pos.forced >= 0 ? [pos.forced] : [] };
  if (id === 'b_send' || id === 's_look') { const z = []; for (let b = 0; b < 9; b++) if (!pos.own[b] && winCells(pos, b, 3 - pos.turn).length) z.push(b); return { zones: z, ng: true }; }
  return { zones: pos.forced >= 0 ? [pos.forced] : [] };
}
const API = { winCells, after, keyBoards, fact, hint };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.UtttLsFacts = API;
})();
