// Amazons puzzles → puzzles.json (node tools/gen_puzzles.js)            (2026-11-11: version 2, chosen by the fun score)
// Themes (every answer is exact, from the rules — engine.js duelGood / trapGood / endGood):
//   w2 「2手で動けなくせ」 leave the opponent without a move within two of your moves, whatever the replies (no win in one)
//   w3 「3手で動けなくせ」 … within three (no win in two)
//   t2 「2手で閉じ込めろ」 box in the marked enemy amazon (no empty square next to it) within two of your moves, whatever the
//                        replies — it may run (not in one)
//   e3 「終盤を読み切れ」   few empty squares left (≤ 17 the amazons can reach), the rooms not always closed: win by being the
//                        last to move — read to the very end (engine.js solveWin, exact); 2–6 of your moves
//   (dropped 2026-11-10: w1 「1手で」, t1 「閉じ込めろ」 in one, e1 the simple counting — too easy, the user's call; genEnd (e2)
//    stays here unused: with two amazons nearly every move kept the count)
// Candidates come from built positions (the slow themes are mined in the background: node tools/mine.js <theme> <seed> <min>
// → tools/cand-*.jsonl, read here too). Each is scored by tools/fun.js; the best are taken (70 and above first), and in a theme
// the easier come first (more right answers first).
'use strict';
const path = require('path'), fs = require('fs');
const E = require(path.join(__dirname, '..', 'engine.js'));
const { funScore } = require('./fun.js');
const { Pos, P1, P2, NB } = E;
const MINE = global.MINE || null;
let seed = MINE ? 977 * MINE.seed + 13 : 20261111;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x7fffffff; };   // (Math.imul: a plain product loses its low bits and the sequence falls into a short cycle)
const ri = n => Math.floor(rnd() * n);
const want = { w2: 30, w3: 30, t2: 30, e3: 30 };
const KIND = { w2: 'duel', w3: 'duel', t2: 'trap', e2: 'end', e3: 'read' };
const t0 = Date.now();
const sec = () => ((Date.now() - t0) / 1000).toFixed(0) + 's';
function spec(w, b, x, side) { const a = Array(100).fill('.'); for (const i of x) a[i] = 'x'; for (const i of w) a[i] = 'w'; for (const i of b) a[i] = 'b'; return { b: a.join(''), side }; }
const cheb = (i, j) => Math.max(Math.abs(E.RC[i][0] - E.RC[j][0]), Math.abs(E.RC[i][1] - E.RC[j][1]));

// ---------------------------------------------------------------- a defender in a pocket (duel / trap)
// the defender: nb amazons, the target one(s) in a small pocket (room empty squares round them, a few grown one step further);
// for a trap, one or two more defender amazons in open ground (the game goes on); the attacker: 1–3 amazons within reach;
// arrows sprinkled to make a game-like board
function pocket(n, trap) {
  const used = new Set(), x = new Set(), tgt = [], other = [], att = [];
  const nt = trap ? 1 : 1 + (rnd() < 0.35 ? 1 : 0);
  for (let k = 0; k < nt; k++) { let i; do i = ri(100); while (used.has(i)); used.add(i); tgt.push(i); }
  const room = n === 2 ? 2 + ri(3) : 3 + ri(4), pocketSet = new Set();
  const around = [...new Set(tgt.flatMap(i => [...NB[i]]))].filter(i => !used.has(i));
  for (let k = 0; k < room && around.length; k++) { const j = ri(around.length); pocketSet.add(around[j]); around.splice(j, 1); }
  for (const p of [...pocketSet]) if (rnd() < (n === 3 ? .7 : .5)) { const nx = [...NB[p]].filter(i => !used.has(i) && !pocketSet.has(i) && !tgt.includes(i)); if (nx.length) pocketSet.add(nx[ri(nx.length)]); }
  for (const i of around) if (!pocketSet.has(i)) x.add(i);
  for (const p of pocketSet) used.add(p);
  for (const i of x) used.add(i);
  if (trap) { const no = 1 + ri(2); for (let k = 0; k < no; k++) { let i, tr = 0; do i = ri(100); while ((used.has(i) || tgt.some(t => cheb(t, i) < 4)) && tr++ < 200); used.add(i); other.push(i); } }
  const na0 = 1 + ri(trap ? 2 : 2) + (n === 3 && rnd() < .4 ? 1 : 0);
  for (let k = 0; k < na0; k++) { let i, tr = 0; do i = ri(100); while ((used.has(i) || (tr < 80 && !tgt.some(d => cheb(i, d) <= 4))) && tr++ < 200); used.add(i); att.push(i); }
  const na = n === 3 ? 20 + ri(24) : 12 + ri(26);
  for (let k = 0; k < na; k++) { const i = ri(100); if (!used.has(i)) { used.add(i); x.add(i); } }
  const side = rnd() < 0.5 ? P1 : P2;
  const def = tgt.concat(other);
  const s = side === P1 ? spec(att, def, x, P1) : spec(def, att, x, P2);
  return { s, e: trap ? tgt[0] : undefined };
}
function genDuel(n) {
  const { s } = pocket(n, false), pos = Pos.from(s), me = pos.turn, op = 3 - me;
  if (!pos.canMove(me) || !pos.canMove(op)) return null;
  const all = pos.moves(); if (all.length < 10) return null;
  if (E.win1(pos).length) return null;
  if (n === 3) { const g2 = E.duelGood(s, [], 2, 300000); if (g2 === null || g2.length) return null; }
  const g = E.duelGood(s, [], n, n === 3 ? 3e6 : 4e5);
  if (!g || !g.length || g.length > all.length * 0.15) return null;
  return { s, n, a: g.length / all.length };
}
function genTrap(n) {
  const { s, e } = pocket(n, true), pos = Pos.from(s), me = pos.turn, op = 3 - me;
  if (!pos.canMove(me) || !pos.canMove(op)) return null;
  const k = E.trapIdx(s, e); if (k < 0 || E.freeAt(pos, k) < 2) return null;
  const all = pos.moves(); if (all.length < 10) return null;
  const g1 = E.trapGood(s, [], e, 1); if (!g1 || g1.length) return null;   // (not in one)
  if (E.win1(pos).length) return null;
  const g = E.trapGood(s, [], e, n, n === 3 ? 3e6 : 6e5);
  if (!g || !g.length || g.length > all.length * 0.15) return null;
  return { s, n, e, a: g.length / all.length };
}
// ---------------------------------------------------------------- built endgames (two or three of yours, rooms with dead ends)
function carve(x, room, want, area, branchy) {
  for (let k = 0; k < 600 && room.length < want; k++) {
    // grow from a random square, preferring squares that make corridors and dead ends (few neighbours already in the room)
    const c = room[branchy && rnd() < .6 ? room.length - 1 - ri(Math.min(3, room.length)) : ri(room.length)];
    const n = [...NB[c]].filter(i => area(i) && x.has(i) && (!branchy || NB[i].filter(t => room.includes(t)).length <= 2));
    if (!n.length) continue;
    const t = n[ri(n.length)]; room.push(t); x.delete(t);
  }
}
function genEnd() {
  const x = new Set([...Array(100).keys()]);
  const cr = 3 + ri(4), cc = 3 + ri(4);
  const quads = [i => ((i / 10) | 0) < cr && i % 10 < cc, i => ((i / 10) | 0) < cr && i % 10 > cc, i => ((i / 10) | 0) > cr && i % 10 < cc, i => ((i / 10) | 0) > cr && i % 10 > cc].sort(() => rnd() - 0.5);
  const nw = 2 + (rnd() < .3 ? 1 : 0), nb = 1 + ri(2), w = [], b = [];
  if (nw + nb > 4) return null;
  for (let q = 0; q < nw + nb; q++) {
    const cells = [...x].filter(quads[q]); if (!cells.length) return null;
    const st = cells[ri(cells.length)], room = [st]; x.delete(st);
    carve(x, room, q < nw ? 7 + ri(9) : 5 + ri(12), quads[q], true);
    (q < nw ? w : b).push(room[ri(room.length)]);
  }
  const pos = Pos.from(spec(w, b, x, P1));
  ST.a++;
  if (!pos.terr().sep || !pos.canMove(P1) || !pos.canMove(P2)) return null;
  ST.b++;
  const Wm = E.sideMoves(pos, P1), Bm = E.sideMoves(pos, P2);
  if (Wm < 0 || Bm < 0 || Wm !== Bm + 1) { if (Wm >= 0 && Bm >= 0) ST.d[Wm - Bm] = (ST.d[Wm - Bm] || 0) + 1; return null; }
  ST.c++;
  const s = pos.spec(), good = E.endGood(s, []), all = pos.moves();
  ST.e = (ST.e || 0) + 1; if (good) ST.f = (ST.f || []).concat([+(good.length / all.length).toFixed(2)]).slice(-40);
  if (!good || !good.length || good.length > all.length * 0.3) return null;
  return { s, n: 1, a: good.length / all.length };
}
const ST = { a: 0, b: 0, c: 0, d: {} }; global.ST = ST;
// ---------------------------------------------------------------- endgames read to the end (positions from AI games)
// A game between two AI levels; once few empty squares are left that the amazons can still reach (≤ 16), the position is solved
// exactly (engine.js solveWin): the side to move must win, with few right moves. n = your moves to the end along the main line.
const reach = pos => { const seen = new Uint8Array(100), st = []; for (let k = 0; k < 8; k++) { const f = pos.q[k]; if (f >= 0) { st.push(f); seen[f] = 1; } } let n = 0; while (st.length) { const c = st.pop(); for (const t of NB[c]) if (!seen[t] && !pos.sq[t]) { seen[t] = 1; n++; st.push(t); } } return n; };
let readQ = [];
function genRead() {
  if (readQ.length) return readQ.pop();
  const la = 3 + ri(8), lb = 3 + ri(8), mv = [], pos = new Pos();
  while (pos.canMove(pos.turn) && mv.length < 140) {
    const r = E.think(null, mv, pos.turn === P1 ? la : lb, rnd); if (r.move < 0) break;
    pos.play(r.move); mv.push(r.move);
    const em = reach(pos); if (em > 17) continue; if (em < 9) break;
    const all = pos.moves(); if (all.length < 8 || E.win1(pos).length) continue;
    const s = pos.spec(), good = E.readGood(s, [], 4e6);
    if (!good || !good.length || good.length > all.length * 0.2) continue;
    // the main line: our first right move, the defender's longest reply, … to the end
    const p = Pos.from(s); let n = 0, ok = true;
    while (p.canMove(p.turn)) {
      const g = E.readGood(p.spec(), [], 4e6); if (!g || !g.length) { ok = false; break; }
      p.play(g[0]); n++; if (!p.canMove(p.turn)) break;
      const rp = E.readReply(p.spec(), []); if (rp.move < 0) break; p.play(rp.move);
    }
    if (ok && n >= 2 && n <= 6) readQ.push({ s, n, a: good.length / all.length });
  }
  return readQ.length ? readQ.pop() : null;
}
const GEN = { w2: () => genDuel(2), w3: () => genDuel(3), t2: () => genTrap(2), e2: genEnd, e3: genRead };

// ---------------------------------------------------------------- mining mode (tools/mine.js)
if (MINE) {
  const g = GEN[MINE.theme]; let n = 0, t = 0;
  while (Date.now() < MINE.until) {
    t++; const P = g(); if (!P) continue;
    const f = funScore(P, KIND[MINE.theme]); P.fun = f.fun;
    fs.appendFileSync(MINE.out, JSON.stringify(P) + '\n'); n++;
    console.log(`${MINE.theme} #${n} fun ${f.fun} (try ${t}, ${sec()})`);
  }
  return;
}

// ---------------------------------------------------------------- build puzzles.json
const pool = {};
for (const th of Object.keys(want)) {
  const L = [], seen = new Set();
  for (const f of fs.readdirSync(__dirname).filter(f => f.startsWith(`cand-${th}-`) && f.endsWith('.jsonl')))
    for (const line of fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n')) if (line.trim()) { const P = JSON.parse(line); const k = P.s.b + P.s.side; if (!seen.has(k)) { seen.add(k); L.push(P); } }
  // quick themes: generate here up to 4× the need (with the fun score)
  const lim = { w2: 4, t2: 4 }[th];
  for (let t = 0; lim && t < 400000 && L.length < want[th] * lim; t++) {
    const P = GEN[th](); if (!P) continue; const k = P.s.b + P.s.side; if (seen.has(k)) continue; seen.add(k);
    P.fun = funScore(P, KIND[th]).fun; L.push(P);
  }
  for (const P of L) if (P.fun === undefined) P.fun = funScore(P, KIND[th]).fun;
  pool[th] = L;
  console.log(`${th}: ${L.length} candidates, fun ≥70: ${L.filter(P => P.fun >= 70).length} (${sec()})`);
}
const clean = P => { const o = { s: P.s, n: P.n }; if (P.e !== undefined) o.e = P.e; return o; };
const themes = Object.keys(want).map(id => {
  const L = pool[id].slice().sort((p, q) => q.fun - p.fun).slice(0, want[id]);
  L.sort((p, q) => q.a - p.a);   // (easier first: more right answers)
  return { id, grp: { duel: 'Win', trap: 'Tac', end: 'End', read: 'End' }[KIND[id]], kind: KIND[id], puzzles: L.map(clean), fun: L.map(P => P.fun) };
}).filter(T => T.puzzles.length);
for (const T of themes) { console.log(T.id, T.puzzles.length, 'fun min', Math.min(...T.fun), 'avg', (T.fun.reduce((a, b) => a + b, 0) / T.fun.length).toFixed(1)); delete T.fun; }
const out = { version: 2, kind: 'amazons', daily: ['w2', 't2', 'e3', 'w3'], themes };
fs.writeFileSync(path.join(__dirname, '..', 'puzzles.json'), JSON.stringify(out));
console.log(`puzzles.json ${fs.statSync(path.join(__dirname, '..', 'puzzles.json')).size} bytes (${sec()})`);
