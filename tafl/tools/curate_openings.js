// (2026-11-24 第2期・担当B) Re-chooses the practice problems of tafl/openings.json under the strict ①〜⑥ of claude/lesson-quality.md:
// candidate positions on each plan's line and on its near branches (the opponent's 4 best replies, then the plan side's best and the
// opponent's 3 best again), the plan's side to move; the engine's exact values of every move (engine.wasm values(): a full window for
// each root move) at depth 5 and depth 6 must agree: the same moves scored 20 by problemPoints (1 to 3: all of them are right), the
// best of the rest at 12 points or less, the game not decided (|v| < 2000), 3+ legal moves; ⑤ 5 squares or more (8 symmetries) from every other tafl
// problem, warm-up, puzzle and opening problem, one answer at most twice and one kind of move (tfFacts) at most 3 times in a plan;
// ⑥ easy → hard (d = plies played + 20 × second's points / 20). The depth-6 values are stored as P.sc (P.dep = 6).
// node tafl/tools/curate_openings.js gen a1,a2   (the candidates of these plans → tafl/tools/.curate/<id>.json)
// node tafl/tools/curate_openings.js pick [--write]   (⑤ across the plans; --write: plans with 5+ kept get them in tafl/openings.json)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const E = require('../engine.js');
const WM = new WebAssembly.Module(fs.readFileSync(path.join(__dirname, '..', 'engine.wasm')));
let X = null; const fresh = () => { X = new WebAssembly.Instance(WM, { env: { now: () => Date.now(), progress: () => {} } }).exports; };   // (a new instance for each search: no hash table or history left over, so the values do not depend on what was searched before)
const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192), V = 'copenhagen';
function setup(moves) { fresh(); const p = E.Pos.from(null, V), a = [0, 0]; for (const x of p.b) a.push(x); a.push(moves.length); for (const m of moves) a.push(E.mFrom(m) | (E.mTo(m) << 8)); io().set(a); return X.setup(); }
function values(moves, d) { setup(moves); X.values(d, 0); const r = io(), out = []; for (let i = 0; i < r[0]; i++) { const x = r[2 + 2 * i]; out.push([(x & 255) + 256 * ((x >> 8) & 255), r[3 + 2 * i]]); } return out.sort((a, b) => b[1] - a[1]); }
const WIN = 30000, WINT = 29000, sOfV = v => v > WINT ? 0.9 + 0.1 * Math.min(1, 6 / (WIN - v + 1)) : v < -WINT ? -(0.9 + 0.1 * Math.min(1, 6 / (WIN + v + 1))) : Math.tanh(v / 450) * 0.85;
function points(sc, m) {   // (= tafl/app.js problemPoints, P.sc)
  const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -WIN;
  if (mine >= best - 15 && !(best > WINT && mine < best)) return 20;
  if (best > WINT && mine > WINT) return 16;
  if (best > WINT && mine <= WINT) return mine > -WINT && mine >= 300 ? 8 : mine > -100 ? 4 : 0;
  if (mine < -WINT && best >= -WINT) return 0;
  return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5)));
}
// one position: null if it fails, else { sc, best, p2 }
function judge(moves) {
  const s5 = values(moves, 5); if (s5.length < 3 || Math.abs(s5[0][1]) >= 2000) return null;
  const top = sc => sc.filter(x => points(sc, x[0]) === 20).map(x => x[0]), p2 = sc => { const t = top(sc), r = sc.find(x => !t.includes(x[0])); return r ? points(sc, r[0]) : 0; };
  const ok = sc => top(sc).length <= 3 && p2(sc) <= 12;
  if (!ok(s5)) return null;
  const s6 = values(moves, 6), t5 = top(s5).sort().join(), t6 = top(s6).sort().join();
  if (Math.abs(s6[0][1]) >= 2000 || !ok(s6) || t5 !== t6) return null;
  return { sc: s6, best: s6[0][0], acc: top(s6), p2: Math.max(p2(s5), p2(s6)) };
}
module.exports = { values, points, judge, setup };
if (require.main !== module) return;
(function main() {
const vm = require('vm');
const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8');
const TF = vm.runInNewContext(src.slice(src.indexOf('  const TF_BLOCK = '), src.indexOf('  const TFJ_OP = {')) + '\n;({ tfFacts })', {});
const OP = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/openings.json'), 'utf8'));
const LS = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'tafl/puzzles.json'), 'utf8'));
const SYM = [(r, c) => [r, c], (r, c) => [r, 10 - c], (r, c) => [10 - r, c], (r, c) => [10 - r, 10 - c], (r, c) => [c, r], (r, c) => [c, 10 - r], (r, c) => [10 - c, r], (r, c) => [10 - c, 10 - r]];
const dist = (a, b) => { let best = 99; for (const S of SYM) { let d = 0; for (let i = 0; i < 121 && d < best; i++) { const [r, c] = S((i / 11) | 0, i % 11); if (a[i] !== b[r * 11 + c]) d++; } best = Math.min(best, d); } return best; };
const pool = [];
LS.steps.forEach(st => { (st.problems || []).forEach(q => pool.push(['ls ' + st.id, q.s.b])); if (st.diagram) pool.push(['ls ' + st.id, st.diagram.s.b]); (st.ramp || []).forEach(r => r.s && pool.push(['ramp ' + st.id, r.s.b])); });
(PZ.themes || []).forEach(th => (th.puzzles || []).forEach(q => pool.push(['pz ' + th.id, q.s.b])));
const START = E.Pos.from(null, V).spec().b;
const tops = (moves, k) => values(moves, 4).slice(0, k).map(x => x[0]);
const mode = process.argv[2] || 'pick', TMP = path.join(__dirname, '.curate'), GROW = +(process.env.GROW || 0);
if (mode === 'gen') { fs.mkdirSync(TMP, { recursive: true });
  for (const g of OP.sets.filter(x => (process.argv[3] || '').split(',').includes(x.id))) {
    const side = g.side, line = g.study.line, nDef = g.moves.split(' ').length, seen = new Set(), cands = [];
    const consider = mv => { const key = mv.join(','); if (seen.has(key)) return; seen.add(key); const { pos } = E.replay(null, mv, V); if (pos.res || pos.turn !== side) return; cands.push(mv.slice()); };
    const ok = mv => !E.replay(null, mv, V).pos.res;
    for (let i = nDef; i <= line.length; i++) { const pre = line.slice(0, i); if (!ok(pre)) break;
      const { pos } = E.replay(null, pre, V);
      const mine = pos.turn === side ? [pre] : tops(pre, 4).map(r => pre.concat([r])).filter(ok);
      for (const a of mine) { consider(a); for (const b of tops(a, 2)) { const ab = a.concat([b]); if (!ok(ab)) continue; for (const r2 of tops(ab, 3)) { const abr = ab.concat([r2]); consider(abr);
        // (2026-11-25 担当B) GROW=1: one more pair of plies (the opponent's 2 best, then the plan side's 2 best again) — the plans that had 2〜4
        // problems on the near branches get candidates further from the line (the same ①〜⑥ test below)
        if (GROW > 0 && ok(abr)) for (const c of tops(abr, 2)) { const abrc = abr.concat([c]); if (!ok(abrc)) continue; for (const r3 of tops(abrc, 2)) consider(abrc.concat([r3])); } } } } }
    // the depth-4 values as a quick sieve (the test itself is depth 5 and 6)
    const pre4 = cands.filter(mv => { const s4 = values(mv, 4); return s4.length >= 3 && Math.abs(s4[0][1]) < 2500 && s4.filter(x => points(s4, x[0]) >= 16).length <= 5; });
    const good = [];
    for (const mv of pre4) { const J = judge(mv); if (!J) continue; const { pos } = E.replay(null, mv, V); const F = TF.tfFacts(E, pos, J.best);
      good.push({ fresh: 1, mv, s: pos.spec(), sc: J.sc, best: J.best, acc: J.acc, p2: J.p2, k: F.k, name: E.name(pos, J.best), d: mv.length + J.p2 }); }
    console.error(g.id, cands.length, 'candidates,', pre4.length, 'sieved,', good.length, 'pass ①②③④');
    fs.writeFileSync(path.join(TMP, g.id + '.json'), JSON.stringify(good)); }
  return; }
const out = {}; for (const g of OP.sets) { try { out[g.id] = JSON.parse(fs.readFileSync(path.join(TMP, g.id + '.json'), 'utf8')); } catch (e) { out[g.id] = []; } }
for (const id in out) { out[id] = out[id].filter(c => { if (c.fresh) return true; c.fresh = 1; const J = judge(c.mv); if (!J || J.best !== c.best) return false; Object.assign(c, { sc: J.sc, acc: J.acc, p2: J.p2, d: c.mv.length + J.p2 }); return true; }); fs.writeFileSync(path.join(TMP, id + '.json'), JSON.stringify(out[id])); }   // (again with a fresh engine each time; kept as checked)
// ⑤ across the plans: greedy, easy first, every kept problem 5+ squares from the lessons / puzzles and from each other
let BAD = new Set(); try { BAD = new Set(JSON.parse(fs.readFileSync(path.join(TMP, 'bad.json'), 'utf8'))); } catch (e) {}   // (positions whose words fail ⑦⑧ in tools/lesson-verify.js taflOpen)
const kept = {}, all = [];
for (const g of OP.sets) if (!out[g.id].length && g.verified) (g.problems || []).forEach(q => all.push({ s: q.s }));   // (2026-11-25 担当B: the verified plans not picked again keep their problems; ⑤ against them too)
for (const g of OP.sets) { const L = out[g.id].sort((a, b) => a.d - b.d), K = [], ans = new Map(), kd = new Map();
  for (const c of L) { if (BAD.has(c.s.b)) continue; if (pool.some(([, b]) => dist(c.s.b, b) <= 4)) continue; if (all.some(o => dist(c.s.b, o.s.b) <= 4)) continue;
    if ((ans.get(c.name) || 0) >= 2 || (kd.get(c.k) || 0) >= 3) continue;
    K.push(c); all.push(c); ans.set(c.name, (ans.get(c.name) || 0) + 1); kd.set(c.k, (kd.get(c.k) || 0) + 1); if (K.length >= 8) break; }
  kept[g.id] = K; console.error(g.id, 'kept', K.length, K.map(c => `${c.name}(${c.k},${c.p2})`).join(' ')); }
if (process.argv.includes('--write')) {
  for (const g of OP.sets) { const K = kept[g.id]; if (K.length < 5) { console.error(g.id, 'stays (fewer than 5)'); continue; }
    g.problems = K.map(c => ({ s: c.s, sc: c.sc, best: c.best, dep: 6, mv: c.mv })); g.verified = 1; }
  fs.writeFileSync(path.join(ROOT, 'tafl/openings.json'), JSON.stringify(OP));
  if (process.argv.includes('--check')) {   // the words: drop the positions that fail ⑦⑧ and pick again (run again until nothing fails)
    const f = require(path.join(ROOT, 'tools/lesson-verify.js')).taflOpen().filter(x => x.q > 0);
    const bad = new Set(f.filter(x => /^[⑦⑧]/.test(x.msg)).map(x => OP.sets.find(g => g.id === x.step).problems[x.q - 1].s.b));
    console.error(f.length, 'findings,', bad.size, 'positions with words that fail'); f.slice(0, 20).forEach(x => console.error(' ', x.step, x.q, x.msg.slice(0, 200)));
    if (bad.size) fs.writeFileSync(path.join(TMP, 'bad.json'), JSON.stringify([...BAD, ...bad])); }
}
})();
