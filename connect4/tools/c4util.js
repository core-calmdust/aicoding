// Connect Four puzzle helpers (node): board from a move string, threat cells, explanation codes (ex) as used by
// puzzles.json, mirror keys. Shared by tools/fun.js (fun score) and tools/refresh_fun.js (replacement miner).
'use strict';
const COLS = 7, ROWS = 6, FILES = 'abcdefg';
const grid = mv => { const g = Array.from({ length: COLS }, () => []); for (let i = 0; i < mv.length; i++) g[mv.charCodeAt(i) - 49].push(i % 2 ? 2 : 1); return g; };
const toMove = mv => (mv.length % 2 ? 2 : 1);
const cellName = (c, r) => FILES[c] + (r + 1);
const at = (g, c, r) => (c < 0 || c >= COLS || r < 0 || r >= ROWS ? -1 : (g[c][r] || 0));
const DIRS = [[1, 0, 'h'], [0, 1, 'v'], [1, 1, 'd'], [1, -1, 'u']];
// directions in which placing p at (c,r) makes four (ignores gravity)
function fourDirs(g, c, r, p) {
  const out = [];
  for (const [dc, dr, k] of DIRS) {
    let n = 1;
    for (let s = 1; s < 4 && at(g, c + dc * s, r + dr * s) === p; s++) n++;
    for (let s = 1; s < 4 && at(g, c - dc * s, r - dr * s) === p; s++) n++;
    if (n >= 4) out.push(k);
  }
  return out;
}
// every empty cell (any height) where p would complete a four
function threats(g, p) {
  const out = [];
  for (let c = 0; c < COLS; c++) for (let r = g[c].length; r < ROWS; r++) if (fourDirs(g, c, r, p).length) out.push({ c, r, playable: r === g[c].length });
  return out;
}
const immWins = (g, p) => threats(g, p).filter(t => t.playable).map(t => t.c);
const legal = g => [0, 1, 2, 3, 4, 5, 6].filter(c => g[c].length < ROWS);
const play = (g, c, p) => { const h = g.map(x => x.slice()); h[c].push(p); return h; };
const isWinAfter = (g, c, p) => fourDirs(g, c, g[c].length, p).length > 0;
const mirror = mv => mv.split('').map(ch => String(8 - +ch)).join('');
// a move "obviously loses" (one-ply check a human does): ignores own playable win, leaves a playable opponent win,
// or plays directly under an opponent threat cell
function obviousLoss(g, c, p) {
  const q = 3 - p;
  if (isWinAfter(g, c, p)) return false;
  if (immWins(g, p).length) return true;
  const h = play(g, c, p);
  return immWins(h, q).length > 0;
}
// threat cells p gets newly by playing c (cells that did not exist before)
function newThreats(g, c, p) {
  const before = new Set(threats(g, p).map(t => t.c * 8 + t.r));
  return threats(play(g, c, p), p).filter(t => !before.has(t.c * 8 + t.r));
}
// --- explanation codes (same vocabulary as the original generator; texts are in learn.js "pz.ex.*")
function exMate(mv, ans, n) {
  const g = grid(mv), p = toMove(mv), q = 3 - p;
  if (n === 1) {
    const r = g[ans].length, dirs = fourDirs(g, ans, r, p), opp = threats(g, q).filter(t => t.playable && t.c !== ans)[0];
    return ['w1', cellName(ans, r), dirs.includes('h') ? 'h' : dirs.includes('d') ? 'd' : dirs.includes('u') ? 'u' : 'v', opp ? cellName(opp.c, opp.r) : ''].filter((x, i) => i < 3 || x);
  }
  const h = play(g, ans, p), th = threats(h, p);
  const pl = th.filter(t => t.playable);
  if (pl.length >= 2) return ['dbl', cellName(pl[0].c, pl[0].r), cellName(pl[1].c, pl[1].r)];
  // stacked: two own threat cells on top of each other (the lower one blocked → win on the upper one)
  if (n <= 3) for (const t of th) if (th.some(u => u.c === t.c && u.r === t.r + 1)) return ['stk', cellName(t.c, t.r), cellName(t.c, t.r + 1)];
  if (pl.length === 1) return ['frc', cellName(pl[0].c, pl[0].r)];
  return ['set'];
}
// one-move puzzles: the mover's parity rows (1-based odd rows = r 0,2,4 for the first player)
function exBest(mv, ans) {
  const g = grid(mv), p = toMove(mv), q = 3 - p;
  const opp = threats(g, q).filter(t => t.playable);
  if (opp.some(t => t.c === ans)) return ['blk', cellName(ans, g[ans].length)];
  const nt = newThreats(g, ans, p).sort((a, b) => a.playable - b.playable);
  if (nt.length) {
    const good = nt.find(t => !t.playable && (p === 1 ? t.r % 2 === 0 : t.r % 2 === 1));
    if (good) return [p === 1 ? 'odd' : 'even', cellName(good.c, good.r)];
    return ['thr', cellName(nt[0].c, nt[0].r)];
  }
  const qt = threats(g, q);
  const und = legal(g).filter(c => c !== ans && qt.some(t => t.c === c && t.r === g[c].length + 1));
  if (und.length) return ['und', und.map(c => FILES[c]).join('')];
  if (ans === 3) return ['ctr'];
  return ['qt'];
}
module.exports = { COLS, ROWS, FILES, grid, toMove, cellName, fourDirs, threats, immWins, legal, play, isWinAfter, mirror, obviousLoss, newThreats, exMate, exBest };
