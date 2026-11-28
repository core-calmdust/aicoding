// Lessons and puzzles from self-play positions (tools/gen_corpus.js → corpus-*.jsonl), every answer checked by the engine.
// node tools/gen_content.js lessons|puzzles corpus.jsonl... > out.json
// Lessons (5 problems each + a warm-up), the answer set is a board fact AND the engine's best move with a clear margin at two
// depths; every wrong move must have a concrete refutation on the board (ls-facts.js says it): the reply wins the game, wins a
// small board, or the move gives a free choice / does not complete the line.
// Puzzles: "win the big board within n of your moves" proven by the exact prover (prove_moves), unique first move, the
// fun score (tools/fun.js) ≥ 70, real-game positions, no position twice (also not up to the board's symmetries).
const E = require('../engine.js'); E.setRule('std');
const F = require('../ls-facts.js');
const fs = require('fs');
const [, , what, ...files] = process.argv;
const games = []; for (const f of files) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) if (ln.trim()) games.push(JSON.parse(ln));
const posOf = line => E.replay(null, line).pos;
// symmetry key: the 8 symmetries of the square applied to both levels at once (a cell (row, col) of the 9×9 grid)
const SYM = (() => { const out = []; for (let k = 0; k < 8; k++) { const map = []; for (let m = 0; m < 81; m++) { let r = E.grow(m), c = E.gcol(m); if (k & 4) [r, c] = [c, r]; if (k & 1) r = 8 - r; if (k & 2) c = 8 - c; map.push(E.mAt(r, c)); } out.push(map); } return out; })();
const symKey = pos => { let best = null; for (const map of SYM) { const a = Array(81).fill('.'); for (let m = 0; m < 81; m++) a[map[m]] = '.xo'[pos.c[m]]; const f = pos.forced < 0 ? -1 : E.mB(map[pos.forced * 9 + 4]); const k = a.join('') + f + pos.side; if (best === null || k < best) best = k; } return best; };
const seen = new Set();
// engine values of every root move at depth d (full window)
function vals(pos, d, ms) { E.core.x.ttclear(); return E.rootValues(pos, d, ms || 0); }
function clearBest(pos, ans, margin) {
  // the answer set must be the engine's best at two depths, every other move at least `margin` below the worst answer
  for (const d of [5, 7]) {
    const L = vals(pos, d, 6000); if (!L) return false;
    const inA = L.filter(e => ans.includes(e.m)), out = L.filter(e => !ans.includes(e.m));
    if (!inA.length || !out.length) return false;
    const lo = Math.min(...inA.map(e => e.v)), hi = Math.max(...out.map(e => e.v));
    if (lo - hi < margin) return false;
    if (L[0].v < -E.WINT) return false;
  }
  return true;
}
const takes = pos => pos.moves().filter(m => { const q = pos.clone().play(m); return !pos.own[E.mB(m)] && q.own[E.mB(m)] === pos.turn && q.res < 0; });
const wins = pos => pos.moves().filter(m => pos.clone().play(m).res === pos.turn);
// every wrong move has a refutation fact on the board (ls-facts.js), the answer's fact is "ok"
function factsOk(id, pos, ans) {
  for (const m of pos.moves()) {
    const f = F.fact(E, id, pos.spec(), m);
    if (ans.includes(m)) { if (/^b_(block|send)$|^s_look$/.test(id) && f.ak !== 'ok') return false; if (f.ak === 'lose') return false; continue; }
    if (!['lose', 'take'].includes(f.k)) return false;
  }
  return true;
}
const LESSONS = {
  // basics
  b_take: pos => { if (wins(pos).length) return null; const T = takes(pos); if (T.length !== 1 || pos.moves().length < 4) return null; return T; },
  b_big: pos => { const W = wins(pos); if (W.length !== 1 || pos.moves().length < 6 || !takes(pos).length) return null; return W; },
  b_block: pos => {
    if (wins(pos).length || takes(pos).length || pos.forced < 0) return null;
    const b = pos.forced, them = 3 - pos.turn, th = F.winCells(pos, b, them); if (th.length !== 1 || pos.moves().length < 4) return null; return th;
  },
  b_send: pos => {
    if (wins(pos).length || takes(pos).length || pos.forced < 0 || pos.moves().length < 4) return null;
    const safe = pos.moves().filter(m => F.after(E, pos, m).k === 'ok'); if (safe.length !== 1) return null;
    if (F.winCells(pos, pos.forced, 3 - pos.turn).includes(safe[0])) return null;   // (that would be b_block)
    return safe;
  },
  // strategy
  s_look: pos => {
    if (wins(pos).length) return null; const T = takes(pos); if (!T.length || pos.moves().length < 4) return null;
    const L = vals(pos, 6, 4000); if (!L || T.includes(L[0].m)) return null;
    return [L[0].m];
  },
  s_free: pos => {
    if (pos.forced >= 0 || wins(pos).length || pos.moves().length < 8) return null;
    const L = vals(pos, 6, 6000); if (!L) return null;
    const key = F.keyBoards(E, pos); if (!key.length || !key.includes(E.mB(L[0].m))) return null;
    return [L[0].m];
  },
  s_force2: pos => { if (wins(pos).length || pos.moves().length < 4) return null; const g = E.duelGood(pos.spec(), [], 2); if (!g || g.length !== 1) return null; return g; },
  s_force3: pos => { if (wins(pos).length || pos.moves().length < 4) return null; const g2 = E.duelGood(pos.spec(), [], 2); if (!g2 || g2.length) return null; const g = E.duelGood(pos.spec(), [], 3); if (!g || g.length !== 1) return null; return g; },
};
const MARGIN = { b_take: 150, b_big: 0, b_block: 150, b_send: 150, s_look: 150, s_free: 150, s_force2: 0, s_force3: 0 };
const WANT = +(process.env.WANT || 15);
function lessons() {
  const out = {};
  for (const id in LESSONS) out[id] = [];
  for (const g of games) {
    for (let n = 8; n < g.l.length; n++) {
      const pos = posOf(g.l.slice(0, n)); if (pos.res >= 0) continue;
      for (const id in LESSONS) {
        if (process.env.ONLY && id !== process.env.ONLY) continue;
        if (out[id].length >= WANT) continue;
        const k = symKey(pos); if (seen.has(id + k)) continue;
        const ans = LESSONS[id](pos); if (!ans || !ans.length) continue;
        if (MARGIN[id] && !clearBest(pos, ans, MARGIN[id])) continue;
        if (!/^s_force/.test(id) && id !== 'b_big' && id !== 'b_take' && !factsOk(id, pos, ans)) continue;
        seen.add(id + k);
        out[id].push({ s: pos.spec(), ok: ans, best: ans[0], legal: pos.moves().length, n });
        process.stderr.write(`${id} ${out[id].length}\n`);
      }
    }
    if (Object.entries(out).every(([k, a]) => a.length >= WANT || (process.env.ONLY && k !== process.env.ONLY))) break;
  }
  return out;
}
// ------------------------------------------------------------------------------------------- puzzles
function puzzles() {
  const out = []; const maxN = +(process.env.MAXN || 4);
  for (const g of games) {
    for (let n = 10; n < g.l.length; n++) {
      const pos = posOf(g.l.slice(0, n)); if (pos.res >= 0 || pos.moves().length < 3) continue;
      const k = symKey(pos); if (seen.has(k)) continue;
      let N = -1, good = null;
      for (let j = 1; j <= maxN; j++) { const gd = E.duelGood(pos.spec(), [], j, null, 4e6); if (gd === null) break; if (gd.length) { N = j; good = gd; break; } }
      if (N < 1 || good.length > 2) continue;
      seen.add(k);
      out.push({ s: pos.spec(), n: N, sol: good, legal: pos.moves().length });
    }
    process.stderr.write(`games ${games.indexOf(g) + 1} puzzles ${out.length}\n`);
  }
  return out;
}
const res = what === 'lessons' ? lessons() : puzzles();
process.stdout.write(JSON.stringify(res) + '\n');
