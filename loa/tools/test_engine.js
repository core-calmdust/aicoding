// Engine checks:  node loa/tools/test_engine.js [games-per-ladder-pair=40] [--top]
// Rules, move counts, random self-play, the level ladder (with reduced time caps) and nodes/sec. Prints ALL OK or FAILED.
'use strict';
const E = require('../engine.js');
const GAMES = +process.argv[2] || 40;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('NG  ' + m); } else console.log('ok  ' + m); };
const rng32 = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const names = st => E.legal(st).map(E.moveName);
const mv = (st, n) => { const m = E.legal(st).find(x => E.moveName(x) === n); return m ? E.play(st, m) : null; };

// ---- start positions ----
let st = E.newGame('std');
ok(st.cnt[1] === 12 && st.cnt[2] === 12 && st.turn === 1, 'standard start: 12 + 12 pieces, Black to move');
ok(['b1', 'g1', 'b8', 'g8'].every(s => st.b[E.sqOf(s)] === 1) && ['a2', 'a7', 'h2', 'h7'].every(s => st.b[E.sqOf(s)] === 2) && !st.b[0] && !st.b[7] && !st.b[56] && !st.b[63], 'standard start: Black on ranks 1 and 8, White on files a and h, corners empty');
ok(E.legal(st).length === 36, 'standard start: 36 legal moves for Black (' + E.legal(st).length + ')');
const perft = (s, d) => { if (d === 0) return 1; const ms = E.legal(s); if (d === 1) return ms.length; let n = 0; for (const m of ms) { E.make(s, m); if (!E.connected(s, 1) && !E.connected(s, 2)) n += perft(s, d - 1); else n++; E.unmake(s); } return n; };
const p2 = perft(E.newGame('std'), 2), p3 = perft(E.newGame('std'), 3);
console.log('    perft 2 = ' + p2 + ', perft 3 = ' + p3);
const sc = E.newGame('scr');
ok(sc.cnt[1] === 12 && sc.cnt[2] === 12 && sc.b[E.sqOf('b1')] === 1 && sc.b[E.sqOf('c1')] === 2 && sc.b[E.sqOf('h2')] === 1 && sc.b[E.sqOf('a2')] === 2, 'scrambled eggs: 12 + 12, colours alternate along the edge');
{ const ring = []; for (let c = 1; c <= 6; c++) ring.push(c); for (let r = 1; r <= 6; r++) ring.push(r * 8 + 7); for (let c = 6; c >= 1; c--) ring.push(56 + c); for (let r = 6; r >= 1; r--) ring.push(r * 8);
  ok(ring.every((s, i) => sc.b[s] && sc.b[s] !== sc.b[ring[(i + 1) % 24]]), 'scrambled eggs: every edge neighbour is the other colour'); console.log('    scrambled start moves: ' + E.legal(sc).length); }

// ---- rule cases ----
st = E.fromText(['........', '........', '...x....', '........', '........', '........', '...x....', '........']);
ok(names(st).includes('d2-d4') && !names(st).includes('d2-d3') && !names(st).includes('d2-d5'), 'exact count: 2 pieces on the file → exactly 2 squares');
ok(names(st).includes('d2-c2') && names(st).includes('d2-e3') && names(st).filter(n => n.startsWith('d2')).length === 7, 'a lone line counts 1: one step sideways and diagonally (7 moves: down the file would leave the board)');
st = E.fromText(['........', '........', '........', '........', '........', '.xx...o.', '........', '........']);
ok(names(st).includes('b3-e3'), 'may jump over an own piece (b3-e3 over c3)');
st = E.fromText(['........', '........', '........', '........', '........', '.xo...x.', '........', '........']);
ok(!names(st).includes('b3-e3') && names(st).includes('b3-b4'), 'may not jump over an enemy piece (b3-e3 blocked by c3)');
{ const li = E.lineInfo(st, E.sqOf('b3')).find(x => x.d === 2); ok(li.n === 3 && li.to === E.sqOf('e3') && !li.ok && li.why === 'jump', 'lineInfo explains the block (count 3, why = jump)'); }
st = E.fromText(['..x.....', '........', '........', '..o.....', '........', '........', '..x.....', '......o.']);
ok(names(st).includes('c2xc5'), 'capture by landing on an enemy piece (c2xc5)');
{ const r = mv(st, 'c2xc5'); ok(r && r.cap && st.cnt[2] === 1 && st.b[E.sqOf('c5')] === 1, 'the captured piece is removed'); ok(st.winner === 2 && st.why === 'connect', 'capturing down to a single enemy piece: that piece is “connected” → the opponent wins'); }
st = E.fromText(['........', '........', '........', '...xx...', '....x...', '........', '........', '...x...o']);
ok(!names(st).some(n => n.endsWith('e4') && n.startsWith('e5')), 'may not land on an own piece');
st = E.fromText(['.o......', 'o.....o.', '........', '...xx...', '....xx..', '........', '.......o', '...x....']);
{ const r = mv(st, 'd1-d3'); ok(r && st.winner === 1 && st.why === 'connect', 'win: the last piece joins the group (d1-d3)'); ok(E.legal(st).length === 0, 'no moves after the game is over'); E.undo(st); ok(st.winner === 0 && st.b[E.sqOf('d1')] === 1 && E.legal(st).length > 0, 'undo re-opens the game'); }
// simultaneous connection: Black captures the piece that kept White apart … and connects himself → the mover wins
st = E.fromText(['........', '........', '..oo....', '....o...', '.....x..', '........', '.....x..', '........']);
{ // f2 moves up the file (2 pieces) to f4: black f4 + ... ; build a cleaner case below
  const s2 = E.fromText(['........', '.....oo.', '........', '.....o..', '...xx...', '........', '.....x..', '........'], 1);
  // black f2: file f has f2, f5, f7 → 3 squares → f5 (captures White's lone link); black d4 e4 f5 connected; white f7 g7 connected
  const r = mv(s2, 'f2xf5'); ok(r && E.connected(s2, 1) && E.connected(s2, 2) && s2.winner === 1 && s2.why === 'both', 'simultaneous connection: the player who moved wins'); }
// no legal move → loss. A black piece in the corner hemmed in by its own count: a1 with lines pointing to own pieces / off board
st = E.fromText(['........', '........', '........', '......oo', '........', 'o.......', 'oo......', 'x.o....x'], 2);
{ // after a white move, Black (a1, h1) must have no move: a1: rank 1 has a1 c1 h1 = 3 → d1 over c1 (enemy) blocked; file a: a1 a2 a3 = 3 → a4 over enemies blocked; diagonal a1 b2 = 2 → c3 over b2 blocked
  // h1: rank 3 → e1 over c1? c1 is not between h1 and e1 → legal. So block it differently: check with the engine instead of by hand.
  const s3 = E.fromText(['........', '........', '........', '........', '........', 'o.......', 'oo......', 'x.o..oo.'], 2);
  // Black has only a1: rank 1: a1 c1 f1 g1 = 4 → e1, passing c1 (enemy) → blocked. file a: 3 → a4 blocked. diagonal: 2 → c3 blocked.
  const before = E.clone(s3); before.turn = 1; ok(E.gen(s3, 1, new Int32Array(100)) === 0, 'a hemmed-in piece has no move');
  // Black has a single piece here (already “connected”), so use two black pieces for the real no-move test:
  const s4 = E.fromText(['......ox', '......oo', '........', '........', '........', 'o.......', 'oo......', 'x.o..oo.'], 2);
  // h8: rank 8: g8 h8 = 2 → f8 over g8 blocked; file h: h8 h7 = 2 → h6 over h7 blocked; diagonal h8 g7 = 2 (+a1!) the long diagonal a1–h8 holds a1 b2 g7 h8 = 4 → d4 over g7 blocked; a1 → e5 over b2 blocked
  ok(E.gen(s4, 1, new Int32Array(100)) === 0 && !E.connected(s4, 1) && !E.connected(s4, 2), 'position with no black move, nobody connected');
  const wm = E.legal(s4).find(m => { E.make(s4, m); const z = E.gen(s4, 1, new Int32Array(100)) === 0 && !E.connected(s4, 2) && !E.connected(s4, 1); E.unmake(s4); return z; });
  if (wm) { const r = E.play(s4, wm); ok(r.winner === 2 && r.why === 'nomove', 'no legal move → that player loses (' + E.moveName(wm) + ')'); } else ok(false, 'no-move test position needs a quiet white move'); }
// repetition
{ // find a position where both sides can shuffle a piece there and back, then repeat it
  const r = rng32(21); let done = false;
  for (let g = 0; g < 200 && !done; g++) { const s = E.newGame('std'); for (let i = 0; i < 20 && !s.winner; i++) { const ms = E.legal(s); E.play(s, ms[r() * ms.length | 0]); } if (s.winner) continue;
    const back = m => ((m >> 6) & 63) | (m & 63) << 6;
    for (const a of E.legal(s)) { if (done) break; if (a & 4096) continue; const s1 = E.clone(s); if (!E.play(s1, a) || s1.winner) continue;
      for (const b of E.legal(s1)) { if (b & 4096) continue; const s2 = E.clone(s1); if (!E.play(s2, b) || s2.winner) continue; if (!E.play(s2, back(a)) || s2.winner) continue; if (!E.play(s2, back(b))) continue;
        if (s2.winner) continue; let res = null, n = 4; for (const m of [a, b, back(a), back(b)]) { res = E.play(s2, m); n++; if (!res || s2.winner) break; }
        if (res && s2.winner === 3 && s2.why === 'rep' && n === 8) { done = true; E.undo(s2); ok(s2.winner === 0, 'threefold repetition is a draw (the position came up 3 times after 8 plies); undo re-opens it'); break; } } } }
  if (!done) ok(false, 'threefold repetition test found no shuffle'); }
// make / unmake keeps everything
st = E.newGame('std');
{ const r = rng32(5); let good = true; for (let g = 0; g < 200 && good; g++) { const ms = E.legal(st); if (!ms.length) break; const snap = JSON.stringify([Array.from(st.b), st.hi, st.lo, Array.from(st.row), Array.from(st.col), Array.from(st.dg), Array.from(st.ad), st.cnt, st.turn]); const m = ms[r() * ms.length | 0]; E.make(st, m); E.unmake(st); good = snap === JSON.stringify([Array.from(st.b), st.hi, st.lo, Array.from(st.row), Array.from(st.col), Array.from(st.dg), Array.from(st.ad), st.cnt, st.turn]); if (!E.play(st, m) || st.winner) break; const fresh = E.stateFrom(st.b, st.turn); good = good && fresh.hi === st.hi && fresh.lo === st.lo && String(fresh.row) === String(st.row) && String(fresh.dg) === String(st.dg) && String(fresh.ad) === String(st.ad); }
  ok(good, 'make / unmake restores board, line counts and hash; incremental = from scratch'); }

// ---- random self-play ----
{ const r = rng32(11); let ends = { 1: 0, 2: 0, 3: 0 }, plies = 0, longest = 0, crashed = false, why = {};
  for (let g = 0; g < 400; g++) { const s = E.newGame(g % 2 ? 'scr' : 'std'); let n = 0; try { while (!s.winner && n < 3000) { const ms = E.legal(s); E.play(s, ms[r() * ms.length | 0]); n++; } } catch (e) { crashed = true; console.log(e); } if (!s.winner) crashed = true; ends[s.winner]++; why[s.why] = (why[s.why] || 0) + 1; plies += n; longest = Math.max(longest, n); }
  ok(!crashed, `400 random games all end: black ${ends[1]}, white ${ends[2]}, draw ${ends[3]}; mean ${Math.round(plies / 400)} plies, longest ${longest}; ${JSON.stringify(why)}`); }

// ---- search ----
st = E.fromText(['.o......', 'o.....o.', '........', '...xx...', '....xx..', '........', '.......o', '...x....']);
{ const r = E.search(st, { depth: 3 }); ok(E.moveName(r.move) === 'd1-d3' && r.score > E.MATE - 10, 'search finds the win in 1 (' + E.moveName(r.move) + ')'); }
{ // lost in 1 whatever happens? the AI must still pick a legal move, and prefer the longer defence
  const s = E.fromText(['.o......', 'o.....o.', '........', '...xx...', '....xx..', '........', '.......o', '...x....'], 2);
  const r = E.search(s, { depth: 4 }); ok(E.legal(s).includes(r.move), 'in a (probably) lost position the search still returns a legal move, score ' + r.score);
  // resistance: among the replies, the chosen one must not lose faster than another one
  const len = m => { E.make(s, m); const z = E.search(s, { depth: 3 }); E.unmake(s); return z.score > E.MATE - 500 ? E.MATE - z.score : 99; };
  const chosen = len(r.move), bestLen = Math.max(...E.legal(s).map(len)); ok(chosen === bestLen, 'resists: the reply chosen loses as late as any other (' + chosen + ' vs ' + bestLen + ')'); }
{ const s = E.newGame('std'); const t0 = Date.now(); const r = E.search(s, { ms: 1500 }); const dt = Date.now() - t0;
  console.log(`    start position, 1.5 s: depth ${r.depth}, ${r.nodes} nodes, ${Math.round(r.nodes / dt * 1000)} nodes/sec, best ${E.moveName(r.move)}, score ${r.score}`);
  ok(r.depth >= 5 && dt < 2200, 'time-limited search reaches depth ≥ 5 and stops on time (' + dt + ' ms)');
  let mid = E.newGame('std'); const rr = rng32(3); for (let i = 0; i < 16; i++) { const ms = E.legal(mid); E.play(mid, ms[rr() * ms.length | 0]); }
  const t1 = Date.now(); const r2 = E.search(mid, { ms: 1000 }); console.log(`    middle game, 1.0 s: depth ${r2.depth}, ${Math.round(r2.nodes / (Date.now() - t1) * 1000)} nodes/sec`); }
{ let worst = 0; for (const lv of [1, 5, 10, 13, 16, 19, 20]) { const s = E.newGame('std'); const t0 = Date.now(); const r = E.chooseMove(s, lv, { rng: rng32(lv) }); const dt = Date.now() - t0; worst = Math.max(worst, dt); console.log(`    Lv.${lv}: ${dt} ms, depth ${r.depth}${r.blunder ? ' (random move)' : ''}`); ok(E.legal(s).includes(r.move), 'Lv.' + lv + ' returns a legal move'); }
  ok(worst < 3200, 'no level thinks longer than about 2.5 s (' + worst + ' ms)'); }

// ---- the ladder (time caps scaled down so the whole tool stays within a few minutes) ----
function match(la, lb, games, seed) {
  const r = rng32(seed); let a = 0, b = 0, d = 0;
  for (let g = 0; g < games; g++) {
    const s = E.newGame(g % 4 >= 2 ? 'scr' : 'std'), aIs = g % 2 ? 2 : 1; let n = 0;
    for (let i = 0; i < 2; i++) { const ms = E.legal(s); E.play(s, ms[r() * ms.length | 0]); }      // two random plies so the games differ
    while (!s.winner && n < 400) { const lv = s.turn === aIs ? la : lb; const z = E.chooseMove(s, lv, { rng: r, msScale: .12 }); E.play(s, z.move); n++; }
    if (s.winner === 3 || !s.winner) d++; else if (s.winner === aIs) a++; else b++;
  }
  return { a, b, d };
}
{ const t0 = Date.now(), TOP = process.argv.includes('--top');
  for (const [hi, lo] of TOP ? [[6, 1], [12, 6], [20, 12]] : [[6, 1], [12, 6]]) { const r = match(hi, lo, GAMES, hi * 100 + lo); const pct = Math.round((r.a + r.d / 2) / GAMES * 100); ok(pct >= 65, `ladder: Lv.${hi} vs Lv.${lo} over ${GAMES} games: ${r.a} wins, ${r.b} losses, ${r.d} draws (${pct}%)`); }
  console.log('    ladder time: ' + Math.round((Date.now() - t0) / 1000) + ' s (time caps × 0.12' + (TOP ? '' : '; add --top for Lv.20 vs Lv.12') + ')'); }

console.log(fail ? 'FAILED: ' + fail : 'ALL OK');
process.exit(fail ? 1 : 0);
