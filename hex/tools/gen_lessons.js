// Build lessons.json: 14 steps × 5 problems, every answer checked by the engine.
//  · ok-problems (P.ok = every correct move): found by the exact solver (engine.c puzzle(): forced connection within k / stopping it)
//  · scored problems (P.sc = [[move, value]] for the best candidates): each candidate is evaluated by a separate MCTS search
//    of the position after it (value = winrate of the side to move, -1000..1000), P.best = the highest.
// Positions come from self-play records (tools/native.c selfplay) and a few constructed ones (ladders, edge templates).
//   HEXN=…/hexn node tools/gen_lessons.js g7.txt,g9.txt,g11.txt firstmap.json out.json
const fs = require('fs');
const E = require('../engine.js');
const N = require('./nat.js').open();
const [, , gamesArg, fmF, outF] = process.argv;
const FM = JSON.parse(fs.readFileSync(fmF, 'utf8'));
let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const games = [];
for (const f of gamesArg.split(',')) for (const l of fs.readFileSync(f, 'utf8').trim().split('\n')) { const a = l.split(' ').map(Number); games.push({ n: a[0], w: a[1], mv: a.slice(2) }); }
shuffle(games);
const DIRS = [[-1, 0], [-1, 1], [0, 1], [1, 0], [1, -1], [0, -1]];
function bridgeSave(pos) {   // the other cell of the mover's bridge the opponent's last stone intruded into, or -1
  const last = pos.last; if (last < 0) return -1;
  const n = pos.n, me = pos.side, r0 = Math.floor(last / n), c0 = last % n, ring = [];
  for (const [dr, dc] of DIRS) { const r = r0 + dr, c = c0 + dc; ring.push(r >= 0 && r < n && c >= 0 && c < n ? r * n + c : (r < 0 || r >= n) && c >= 0 && c < n ? -1 : (c < 0 || c >= n) && r >= 0 && r < n ? -2 : -3); }
  const own = v => v >= 0 ? pos.at(v) === me : v === -1 ? me === 1 : v === -2 ? me === 2 : false;
  for (let k = 0; k < 6; k++) { const y = ring[k]; if (y < 0 || pos.at(y)) continue; const a = ring[(k + 5) % 6], b = ring[(k + 1) % 6]; if (own(a) && own(b) && !(a < 0 && b < 0)) return y; }
  return -1;
}
const specOf = p => p.spec();
async function needs(spec, k) { await N.setpos(spec); return N.puzzle(k, 0, 6000); }
async function blocks(spec, k) { await N.setpos(spec); return N.puzzle(k, 1, 6000); }
async function minWin(spec, k) { await N.setpos(spec); return (await N.solve(k, 600)).k; }
// MCTS value of each candidate: search the position after it (from the opponent's view, negated)
async function scored(spec, ms, top) {
  await N.setpos(spec);
  const a = await N.analyze(ms, 0, top || 8), L = [];
  for (const e of a.list) {
    if (e.m === E.SWAP) { const p = E.Pos.from(spec).play(E.SWAP); await N.setpos({ ...p.spec(), sw: 0 }); const b = await N.analyze(ms, 0, 1); L.push([e.m, b.list[0] ? -b.list[0].v : 0]); continue; }
    const p = E.Pos.from(spec); p.play(e.m);
    if (p.winner()) { L.push([e.m, 29999]); continue; }
    await N.setpos(p.spec()); const b = await N.analyze(ms, 0, 1); L.push([e.m, b.list[0] ? Math.max(-29999, Math.min(29999, -b.list[0].v)) : 0]);
  }
  L.sort((x, y) => y[1] - x[1]);
  return L;
}
// positions along the games: { pos (before the move), mv (the move played), gi, k }
function* positions(filter) {
  for (let gi = 0; gi < games.length; gi++) {
    const g = games[gi]; if (filter && !filter(g)) continue;
    const pos = new E.Pos(g.n, true);
    for (let k = 0; k < g.mv.length; k++) { yield { pos: pos.clone(), mv: g.mv[k], gi, k, g }; pos.play(g.mv[k]); }
  }
}
const steps = [];
const used = new Set();
const keyOf = spec => spec.b + spec.side;
function take(list, cnt, sizes) {   // spread over sizes and games
  const out = [], perGame = {};
  for (const sz of sizes) for (const x of list) { if (out.length >= cnt) break; if (x.s.n !== sz || used.has(keyOf(x.s)) || (perGame[x.gi] || 0) >= 1) continue; out.push(x); used.add(keyOf(x.s)); perGame[x.gi] = 1; if (out.filter(y => y.s.n === sz).length >= Math.ceil(cnt / sizes.length)) break; }
  for (const x of list) { if (out.length >= cnt) break; if (used.has(keyOf(x.s))) continue; out.push(x); used.add(keyOf(x.s)); }
  return out.slice(0, cnt).map(({ s, ok, best, sc }) => (sc ? { s, best, sc } : { s, ok, best }));
}
(async () => {
  const log = (...a) => console.error(...a);
  // ---------------------------------------------------------------- basics
  const A = [], B = [], C = [], D = [], Ed = [];
  for (const { pos, gi, k, g } of positions(g => g.n <= 9)) {
    if (pos.winner() || pos.ply < 6) continue;
    const s = pos.side, spec = specOf(pos), wc = pos.winCells(s), oc = pos.winCells(3 - s);
    if (wc.length >= 1 && wc.length <= 2 && A.length < 60 && pos.ply >= 10) A.push({ s: spec, ok: wc, best: wc[0], gi });
    if (!wc.length && oc.length === 1 && B.length < 60) {
      const L = await blocks(spec, 1), esc = L.filter(e => e.need === 0).map(e => e.m);
      if (esc.length === 1 && esc[0] === oc[0]) B.push({ s: spec, ok: esc, best: esc[0], gi });
    }
    if (!wc.length && C.length < 60 && rnd() < .5) {
      const mw = await minWin(spec, 2);
      if (mw === 2) { const L = await needs(spec, 2), ok = L.filter(e => e.need === 2).map(e => e.m); if (ok.length && ok.length <= 2) C.push({ s: spec, ok, best: ok[0], gi }); }
    }
    const sv = bridgeSave(pos);
    if (sv >= 0 && !wc.length && D.length < 60) {
      const mw = await minWin(spec, 5);
      if (mw >= 2) { const L = await needs(spec, mw), ok = L.filter(e => e.need > 0 && e.need <= mw).map(e => e.m); if (ok.includes(sv) && ok.length <= 2) D.push({ s: spec, ok, best: sv, gi }); }
    }
    if (!wc.length && Ed.length < 60 && rnd() < .5) {
      const mw = await minWin(spec, 4);
      if (mw >= 2) {
        const L = await needs(spec, mw), ok = L.filter(e => e.need > 0 && e.need <= mw).map(e => e.m), n = pos.n;
        const edgeT = x => { const r = Math.floor(x / n), c = x % n; if (s === 1) { const rr = r === 1 ? 0 : r === n - 2 ? n - 1 : -1; if (rr < 0) return false; const cs = r === 1 ? [c, c + 1] : [c, c - 1]; return cs.every(cc => cc >= 0 && cc < n && !pos.at(rr * n + cc)); } const cc = c === 1 ? 0 : c === n - 2 ? n - 1 : -1; if (cc < 0) return false; const rs = c === 1 ? [r, r + 1] : [r, r - 1]; return rs.every(q => q >= 0 && q < n && !pos.at(q * n + cc)); };
        if (ok.length === 1 && edgeT(ok[0])) Ed.push({ s: spec, ok, best: ok[0], gi });
      }
    }
    if (A.length >= 60 && B.length >= 60 && C.length >= 60 && D.length >= 30 && Ed.length >= 30) break;
  }
  log('basics', A.length, B.length, C.length, D.length, Ed.length);
  steps.push({ id: 'b_connect', course: 'basics', problems: take(A, 5, [5, 7, 9]) });
  steps.push({ id: 'b_block', course: 'basics', problems: take(B, 5, [7, 9]) });
  steps.push({ id: 'b_bridge', course: 'basics', problems: take(C, 5, [7, 9]) });
  steps.push({ id: 'b_save', course: 'basics', problems: take(D, 5, [7, 9]) });
  steps.push({ id: 'b_edge', course: 'basics', problems: take(Ed, 5, [7, 9]) });
  // ---------------------------------------------------------------- tactics
  const F = [], J = [], Lz = [];
  for (const { pos, gi } of positions(g => g.n >= 7)) {
    if (pos.winner() || pos.ply < 8) continue;
    const s = pos.side, spec = specOf(pos);
    if (pos.winCells(s).length) continue;
    if (F.length < 40 && rnd() < .4) { const mw = await minWin(spec, 3); if (mw === 3) { const L = await needs(spec, 3), ok = L.filter(e => e.need === 3).map(e => e.m); if (ok.length === 1) F.push({ s: spec, ok, best: ok[0], gi }); } }
    if (J.length < 40 && !pos.winCells(3 - s).length && rnd() < .4) {
      await N.setpos({ ...spec, side: 3 - s }); const t = await N.solve(2, 400);
      if (t.k === 2) { const L = await blocks(spec, 2), esc = L.filter(e => e.need === 0).map(e => e.m); if (esc.length >= 1 && esc.length <= 2) J.push({ s: spec, ok: esc, best: esc[0], gi }); }
    }
    if (F.length >= 40 && J.length >= 40) break;
  }
  log('tactics', F.length, J.length);
  // ladders (constructed): Red's column from the top reaches the 2nd row; Blue holds the 1st row below it and to the left;
  // a red ladder escape waits further along the 1st row. Red to move connects by pushing the ladder (checked by the solver).
  for (const n of [7, 9]) for (let c = 1; c <= n - 5; c++) for (let e = c + 2; e <= n - 2; e++) {
    const p = new E.Pos(n, false);
    for (let r = 0; r <= n - 2; r++) p.b[r * n + c] = 1;
    for (let x = 0; x <= c; x++) p.b[(n - 1) * n + x] = 2;
    if (c > 0) p.b[(n - 2) * n + c - 1] = 2;
    p.b[(n - 1) * n + e] = 1;
    // Blue stones that block the easy ways round on the left and higher up on the right
    for (let r = Math.max(1, n - 4); r <= n - 3; r++) p.b[r * n + c + 1] = 2;
    p.side = 1; p._w = undefined; if (p.winner()) continue;
    const spec = p.spec(), mw = await minWin(spec, 6);
    if (mw >= 2) { const L = await needs(spec, mw), ok = L.filter(e => e.need > 0 && e.need <= mw).map(e => e.m); if (ok.length && ok.length <= 3) Lz.push({ s: spec, ok, best: ok[0], gi: 1000 + Lz.length, k: mw }); }
    // mirrored for Blue (left–right): transpose
    const q = new E.Pos(n, false); for (let i = 0; i < n * n; i++) { const v = p.b[i]; q.b[E.mirror(i, n)] = v === 1 ? 2 : v === 2 ? 1 : 0; } q.side = 2; q._w = undefined;
    if (!q.winner()) { const sq = q.spec(), m2 = await minWin(sq, 6); if (m2 >= 2) { const L = await needs(sq, m2), ok = L.filter(e => e.need > 0 && e.need <= m2).map(e => e.m); if (ok.length && ok.length <= 3) Lz.push({ s: sq, ok, best: ok[0], gi: 1000 + Lz.length, k: m2 }); } }
  }
  log('ladders', Lz.length, Lz.map(x => x.k).join(','));
  // edge template III (ziggurat): a red stone on the 3rd row joined to the top; Blue intrudes into its template; Red to move
  const Z = [];
  for (const n of [7, 9]) for (let c = 2; c <= n - 2; c++) {
    const base = new E.Pos(n, false);
    for (let r = 0; r <= n - 3; r++) base.b[r * n + c] = 1;
    // blue stones on the sides so that only the template area matters
    base.b[(n - 3) * n + c - 2] = 2; if (c + 2 < n) base.b[(n - 3) * n + c + 2] = 2;
    for (const dr of [1, 2]) for (let dc = -3; dc <= 2; dc++) {
      const x = (n - 3 + dr) * n + c + dc; const cc = c + dc; if (cc < 0 || cc >= n || base.b[x]) continue;
      const p = base.clone(); p.b[x] = 2; p.side = 1; p._w = undefined; if (p.winner()) continue;
      const spec = p.spec(), mw = await minWin(spec, 3);
      if (mw >= 2) { const L = await needs(spec, mw), ok = L.filter(e => e.need > 0 && e.need <= mw).map(e => e.m); if (ok.length && ok.length <= 2) Z.push({ s: spec, ok, best: ok[0], gi: 2000 + Z.length }); }
    }
  }
  log('ziggurat', Z.length);
  steps.push({ id: 't_double', course: 'tactics', problems: take(F, 5, [7, 9, 11]) });
  steps.push({ id: 't_stop', course: 'tactics', problems: take(J, 5, [7, 9, 11]) });
  steps.push({ id: 't_ladder', course: 'tactics', problems: take(shuffle(Lz), 5, [7, 9]) });
  steps.push({ id: 't_edge3', course: 'tactics', problems: take(shuffle(Z), 5, [7, 9]) });
  // ---------------------------------------------------------------- strategy (scored by MCTS)
  const S1 = [], S2 = [], S3 = [], S4 = [];
  // the first move without the swap rule: the centre is best
  for (const n of [5, 7, 9]) { const spec = { n, b: '.'.repeat(n * n), side: 1 }; const sc = await scored(spec, 1500, 8); S1.push({ s: spec, best: sc[0][0], sc, gi: 3000 + n }); }
  // a few early positions: where to answer a stone in the centre
  for (const { pos, gi } of positions(g => g.n === 9)) { if (pos.ply < 1 || pos.ply > 3 || pos.winner() || pos.swapOk) continue; if (S1.length >= 8) break; const spec = specOf(pos); const sc = await scored(spec, 1500, 8); if (sc.length > 2 && sc[0][1] - sc[2][1] > 40) S1.push({ s: spec, best: sc[0][0], sc, gi }); }
  // the swap decision: after a first move, Blue may swap (strong first moves) or play (weak ones)
  for (const [n, list] of [[9, ['e5', 'a1', 'c7', 'i2', 'b8']], [11, ['f6', 'a1', 'b2', 'k1', 'd8']], [7, ['d4', 'a7', 'g1']]]) {
    for (const nm of list) {
      const p = new E.Pos(n, true); p.play(E.parse(p, nm)); const spec = { ...p.spec(), sw: 1 };
      const sc = await scored(spec, 1500, 8);
      if (sc.some(e => e[0] === E.SWAP)) S2.push({ s: spec, best: sc[0][0], sc, gi: 4000 + S2.length });
    }
  }
  log('swap', S2.map(x => (x.best === E.SWAP ? 'S' : 'm')).join(''));
  // blocking: the opponent's lone stone in the middle — block at a distance (positions after 2–6 moves of 9×9 games)
  for (const { pos, gi } of positions(g => g.n === 9 || g.n === 11)) { if (pos.ply < 2 || pos.ply > 7 || pos.winner() || pos.swapOk) continue; if (S3.length >= 10) break; const spec = specOf(pos); const sc = await scored(spec, 1500, 8); if (sc.length > 3 && sc[0][1] - sc[3][1] > 60) S3.push({ s: spec, best: sc[0][0], sc, gi }); }
  // the middle game: choose the best plan (the moves differ clearly in value)
  for (const { pos, gi } of positions(g => g.n === 9 || g.n === 11)) { if (pos.ply < 10 || pos.ply > 30 || pos.winner()) continue; if (S4.length >= 10) break; if (rnd() > .25) continue; const spec = specOf(pos); const sc = await scored(spec, 1500, 8); if (sc.length > 3 && sc[0][1] - sc[1][1] > 60 && Math.abs(sc[0][1]) < 900) S4.push({ s: spec, best: sc[0][0], sc, gi }); }
  log('strategy', S1.length, S2.length, S3.length, S4.length);
  steps.push({ id: 's_center', course: 'strategy', problems: take(S1, 5, [5, 7, 9]) });
  steps.push({ id: 's_swap', course: 'strategy', problems: take(S2, 5, [9, 11, 7]) });
  steps.push({ id: 's_block', course: 'strategy', problems: take(S3, 5, [9, 11]) });
  steps.push({ id: 's_plan', course: 'strategy', problems: take(S4, 5, [9, 11]) });
  // diagrams for the step cards: the first problem's position with its answer ringed
  for (const st of steps) { const P = st.problems[0]; if (P && P.best !== E.SWAP && P.best >= 0) st.diagram = { n: P.s.n, b: P.s.b, side: P.s.side, marks: [[P.best, 'ring']] }; }
  for (const st of steps) if (st.problems.length < 5) log('WARN short step', st.id, st.problems.length);
  fs.writeFileSync(outF, JSON.stringify({ version: 1, steps }));
  log('wrote', outF, steps.map(s => s.id + ':' + s.problems.length).join(' '));
  N.close();
})();
