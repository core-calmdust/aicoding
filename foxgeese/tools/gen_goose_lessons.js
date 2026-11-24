// node foxgeese/tools/gen_goose_lessons.js [--write] — the geese lessons g_safe · g_trap · g_net (rule g15) from self-play positions
// (2026-11-24 23:32 担当C, claude/lesson-quality.md). The engine plays both sides at levels 4〜9 with noise; every position with the
// geese to move is tried against the lesson's conditions (below), and 5 per lesson are picked so that d (the wrong moves + 2 × the near
// misses) does not go down, and no two (the lessons, the puzzles) lie within 4 points under the board's symmetries.
//   g_safe: the fox can jump now (one goose attacked, by one first jump), exactly one goose move leaves it no jump, no move shuts it in
//   g_trap: the fox has no jump and exactly one point to step to; exactly one goose move shuts it in
//   g_net : the fox has no jump and two points to step to, no move shuts it in now; exactly one goose move shuts it in next move whatever it does
// Every legal move's fact (foxgeese/ls-facts.js) must be one the lesson has words for; ③ 6 legal moves or more.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'foxgeese/engine.js')), F = require(path.join(ROOT, 'foxgeese/ls-facts.js'));
const V = require(path.join(ROOT, 'tools/lesson-verify-foxgeese.js'));
E.setRule('g15');
let seed = +(process.env.SEED || 20261124); const rand = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296; };
const KEYS = { g_safe: ['safeF', 'safeA', 'jself', 'jopen', 'jstill'], g_trap: ['trap', 'jself', 'jopen', 'free', 'freeO'], g_net: ['net', 'jself', 'jopen', 'wide', 'hole', 'reach0'] };
const RIGHT = { g_safe: /^safe/, g_trap: 'trap', g_net: 'net' };
function judgeLesson(id, spec) {
  const pos = E.Pos.from(spec), L = pos.moves();
  if (E.judge(pos).over || L.length < 6 || pos.geese < 9) return null;
  const J = pos.foxMoves([]).filter(x => E.jumped(x).length), steps = pos.foxMoves([]).filter(x => !E.jumped(x).length);
  if (id === 'g_safe' && (!J.length || new Set(J.map(x => E.jumped(x)[0])).size !== 1)) return null;
  if (id === 'g_trap' && (J.length || steps.length !== 1)) return null;
  if (id === 'g_net' && (J.length || steps.length !== 2)) return null;
  if (L.some(m => !pos.clone().play(m).foxMoves([]).length) !== (id === 'g_trap')) return null;
  const facts = L.map(m => F.fact(E, id, spec, m));
  if (facts.some(f => !KEYS[id].includes(f.k))) return null;
  const isR = k => RIGHT[id] instanceof RegExp ? RIGHT[id].test(k) : k === RIGHT[id];
  const ok = L.filter((m, i) => isR(facts[i].k));
  if (ok.length !== 1) return null;
  if (id === 'g_trap') { const P = E.mTo(ok[0]), [r0, c0] = E.RC[pos.fox], [r1, c1] = E.RC[P], r2 = 2 * r1 - r0, c2 = 2 * c1 - c0, b = r2 * 7 + c2;   // (the closing goose has a friend straight behind it, as the intro says)
    if (!(r2 >= 0 && r2 < 7 && c2 >= 0 && c2 < 7 && E.ON[b] && pos.clone().play(ok[0]).sq[b] === E.P2)) return null; }
  // the near misses: g_safe a move after which the attacked goose is safe (another jump opened), g_trap a goose into the fox's point
  // that is jumped, g_net a move after which the fox escapes by one way only
  let near = 0;
  L.forEach((m, i) => { const f = facts[i]; if (isR(f.k)) return;
    if (id === 'g_safe' && f.k !== 'jstill') near++;
    if (id === 'g_trap' && E.mTo(m) === E.path(steps[0])[1]) near++;
    if (id === 'g_net' && !/^j/.test(f.k)) { const q = pos.clone().play(m); if (q.foxMoves([]).filter(x => { const z = q.clone().play(x); return !F.shuts(E, z).length; }).length === 1) near++; } });
  if (id === 'g_trap' && !near) return null;   // (another goose can step into the fox's point too: the hint's ring does not give the answer — 追52)
  const kinds = new Set(facts.map(f => f.k));
  return { s: spec, ok, best: ok[0], ak: facts[L.indexOf(ok[0])].k, d: (L.length - 1) + 2 * near, kinds: kinds.size, L: L.length };
}
const norm = b => { let o = ''; for (let i = 0; i < 49; i++) o += E.ON[i] ? (b[i] === 'f' || b[i] === 'g' ? b[i] : '.') : ' '; return o; };
function main() {
  const found = { g_safe: [], g_trap: [], g_net: [] }, seen = new Set();
  const T0 = Date.now(), LIMIT = process.env.FROM ? 0 : +(process.env.GEN_MS || 240000);
  for (let g = 0; Date.now() - T0 < LIMIT; g++) {
    const moves = [], lvF = 3 + Math.floor(rand() * 6), lvG = 3 + Math.floor(rand() * 7);
    let pos = E.Pos.from(null);
    for (let ply = 0; ply < 90; ply++) {
      if (E.judge(pos).over) break;
      if (pos.side === 1 && ply >= 8) {
        const sp = pos.spec(); sp.rule = 'g15'; sp.n = 20; delete sp.q; const key = sp.b;
        if (!seen.has(key)) { seen.add(key); for (const id of Object.keys(found)) { const r = judgeLesson(id, sp); if (r) found[id].push(r); } }
        // (the shut-in positions are rare in play: also every position one goose move and one fox reply away)
        if (process.env.WIDE) for (const g of pos.moves()) { const q = pos.clone().play(g); if (E.judge(q).over) continue; for (const f of q.foxMoves([])) { const z = q.clone().play(f); if (E.judge(z).over) continue;
          const s2 = z.spec(); s2.rule = 'g15'; s2.n = 20; delete s2.q; if (seen.has(s2.b)) continue; seen.add(s2.b);
          const st = z.foxMoves([]); if (st.length > 3) continue; for (const id of ['g_trap', 'g_net']) { const r = judgeLesson(id, s2); if (r) found[id].push(r); } } }
      }
      const lv = pos.side ? lvG : lvF, r = E.think(null, moves, lv, rand, 'g15'); if (r.move < 0) break;
      moves.push(r.move); pos = E.replay(null, moves).pos;
    }
  }
  if (process.env.DUMP) { fs.writeFileSync(process.env.DUMP, JSON.stringify(found)); return; }
  if (process.env.FROM) { for (const f of process.env.FROM.split(',')) { const x = JSON.parse(fs.readFileSync(f, 'utf8')); for (const id in found) for (const c of x[id]) if (!found[id].some(y => y.s.b === c.s.b)) { const r = judgeLesson(id, c.s); if (r) found[id].push(r); } } }
  for (const id in found) console.log(id, found[id].length, 'candidates');
  // the pool for ⑤: the fox lessons and the puzzles
  const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'foxgeese/puzzles.json'), 'utf8'));
  const pool = [];
  LS.steps.filter(s => !/^g_/.test(s.id)).forEach(s => s.problems.forEach(P => pool.push({ b: norm(P.s.b), ls: true })));
  PZ.themes.forEach(T => T.puzzles.forEach(P => pool.push({ b: norm(P.s.b) })));
  const MIR = V.SYM8.filter((_, t) => t === 0 || t === 2);
  const clash = b => pool.some(x => (x.ls ? MIR : V.SYM8).some(f => V.diff(b, V.symB(x.b, f)) <= 4));
  const pick = {};
  for (const id in found) {
    const c = found[id].filter(x => !clash(norm(x.s.b))).sort((a, b) => b.kinds - a.kinds || a.d - b.d);
    const out = [];
    // spread over d: from the easiest to the hardest, each new one ≥ the last and away from those picked
    const byD = c.slice().sort((a, b) => a.d - b.d), lo = byD.length ? byD[0].d : 0, hi = byD.length ? byD[byD.length - 1].d : 0;
    for (let k = 0; k < 5; k++) {
      const target = lo + (hi - lo) * k / 4, last = out.length ? out[out.length - 1].d : -1;
      const want = id === 'g_safe' && (k === 1 || k === 3) ? 'safeA' : null;   // (the intro: fill the point behind, or move the goose away — both kinds asked)
      const cand = byD.filter(x => (!want || x.ak === want) && x.d >= last && !out.includes(x) && !out.some(y => MIR.some(f => V.diff(norm(x.s.b), V.symB(norm(y.s.b), f)) <= 4)) && !out.some(y => y.best === x.best))
        .sort((a, b) => Math.abs(a.d - target) - Math.abs(b.d - target) || b.kinds - a.kinds);
      if (!cand.length) break; out.push(cand[0]); pool.push({ b: norm(cand[0].s.b), ls: true });
    }
    pick[id] = out; console.log(id, out.map(x => `d${x.d}/L${x.L}/k${x.kinds}`).join(' '));
  }
  if (process.argv.includes('--write')) {
    for (const id in pick) { if (pick[id].length < 5) { console.log('not enough for', id); return; } const st = LS.steps.find(s => s.id === id); st.problems = pick[id].map(x => ({ s: x.s, ok: x.ok, best: x.best })); }
    LS.version = (LS.version || 1) + 1;
    fs.writeFileSync(path.join(ROOT, 'foxgeese/lessons.json'), JSON.stringify(LS));
    console.log('written');
  }
}
main();
