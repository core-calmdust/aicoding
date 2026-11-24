// node xiangqi/tools/op_curate.js [ids,...] [--write]  (2026-11-24 第2期・担当B: xiangqi/open)
// The practice pool of a named opening, chosen by strict rules (claude/lesson-quality.md ①〜⑨・追加の基準):
//  - the position is the opening's: its path (P.mv) replays from the start through the opening's named moves, then the study line
//    or a reply of the opponent that leaves the book (ranked 2nd–8th by the engine), and the side to move is the opening's side;
//  - the stored values (P.sc) are the engine's fixed-depth values (depth 8, a fresh game each time = deterministic) of every legal
//    move; the moves worth 20 points (within 10 of the best, = problemPoints) are the same at depth 7 and 8, at most 2 of them, and
//    every other move scores 12 points or less at both depths; nobody is winning yet (|best| ≤ 350 before the move);
//  - 3+ moves besides the answer keep the material (the answer is not "the one move that does not hang a piece");
//  - ⑤ more than 4 squares (two moves) from every other xiangqi board (lessons, warm-ups, puzzles, the other problems; mirrored too);
//  - ⑦⑧ ショウギツネ's words (atlas/lessons3d.js xqOpJa) say a board fact for every legal wrong move (no vague line).
// Five problems at most from the pool, in the order of d (the moves before + the 2nd move's points): easy → hard.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const E = require(path.join(ROOT, 'xiangqi/engine.js'));
let X = null;
let MOD = null;   // a fresh instance for every search: the values do not depend on the searches before (deterministic)
function boot() { if (!MOD) MOD = new WebAssembly.Module(fs.readFileSync(path.join(ROOT, 'xiangqi/engine.wasm'))); X = new WebAssembly.Instance(MOD, { env: { now: () => Date.now(), progress: () => {} } }).exports; E.setWasm(X); }
// every legal move's value at a fixed depth (the mover's view), best first
function values(line, d) { boot(); X.new_game(); const io = () => new Int32Array(X.memory.buffer, X.io_ptr(), 8192);
  io().set(E.setupIO(null, line, [])); if (!X.setup()) return [];
  X.analyze(1e8, d); const r = io(), L = []; for (let i = 0; i < r[0]; i++) L.push([E.fromC(r[2 + 2 * i]), r[3 + 2 * i]]);
  return L.sort((a, b) => b[1] - a[1]); }
const sOfV = v => v > E.WINT ? 0.9 : v < -E.WINT ? -0.9 : Math.tanh(v / 450) * 0.82;
function points(sc, m) {   // = xiangqi/app.js problemPoints (no mate here)
  const val = new Map(sc), best = Math.max(...sc.map(e => e[1])), mine = val.has(m) ? val.get(m) : -E.WIN;
  if (mine >= best - 10) return 20; return Math.max(0, Math.round(20 * (1 - (sOfV(best) - sOfV(mine)) / 0.5))); }
const acc = sc => sc.filter(x => points(sc, x[0]) === 20).map(x => x[0]);
const rest = sc => { const a = acc(sc); return Math.max(0, ...sc.filter(x => !a.includes(x[0])).map(x => points(sc, x[0]))); };
const VAL = [0, 0, 2, 2, 4, 9, 4.5, 1];
const mat = (p, c) => { let s = 0; for (let q = 0; q < 90; q++) { const x = p.at(q); if (x && E.colorOf(x) === c) s += VAL[E.typeOf(x)]; } return s; };
// the board as 90 letters, and its mirror (files a..i ↔ i..a)
const bd = fen => { const rows = fen.split(' ')[0].split('/'), out = []; for (const r of rows) for (const ch of r) { if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) out.push('.'); else out.push(ch); } return out; };
const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 90; i++) { const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[i]) d1++; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
function otherBoards(OP, skip) {   // every other xiangqi board of the site: [who, board]
  const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/lessons.json'), 'utf8')), PZ = JSON.parse(fs.readFileSync(path.join(ROOT, 'xiangqi/puzzles.json'), 'utf8')), out = [];
  (L.steps || []).forEach(s => { (s.problems || []).forEach((q, j) => q.s && out.push([`${s.id} q${j + 1}`, bd(q.s)])); (s.ramp || []).forEach((r, j) => r.s && out.push([`${s.id} ramp ${j + 1}`, bd(r.s)])); });
  const walk = (o, w) => { if (!o || typeof o !== 'object') return; if (typeof o.s === 'string' && / [wb]$/.test(o.s)) out.push([w, bd(o.s)]); for (const k in o) if (k !== 's') walk(o[k], w); };
  walk(PZ, 'puzzle');
  OP.sets.forEach(g => (g.problems || []).forEach((q, j) => { const w = `open ${g.id} q${j + 1}`; if (!skip || !skip(g, j)) out.push([w, bd(q.s)]); }));
  return out;
}
// ショウギツネ's words of the 3D table (atlas/lessons3d.js), for the facts and the words of every move
function words() { const src = fs.readFileSync(path.join(ROOT, 'atlas/lessons3d.js'), 'utf8'), line = a => src.slice(src.indexOf(a)).split('\n')[0] + '\n';
  return vm.runInNewContext(line('  const shSeed = ') + line('  const shPerm = ') + src.slice(src.indexOf('  const XQJ_OP = {'), src.indexOf('  /* (2026-11-21 lesson loop) the xiangqi lessons in')) + '\n;({ xqFacts, xqKind, xqNgFact, xqOpJa, xqOpVoice, XQJ_OP, XQN, XQV })', {}); }
module.exports = { words, values, points, acc, rest, bd, dist, otherBoards, mat, VAL };
if (require.main !== module) return;
const OPF = path.join(ROOT, 'xiangqi/openings.json'), OP = JSON.parse(fs.readFileSync(OPF, 'utf8'));
const args = process.argv.slice(2), only = (args.find(a => !a.startsWith('-')) || '').split(',').filter(Boolean), write = args.includes('--write');
const D1 = 7, D2 = 8, t0 = Date.now();
if (args.includes('--pick')) { pick(); return; }
for (const g of OP.sets) { if (only.length && !only.includes(g.id)) continue;
  const side = g.side === 2 ? 1 : 0, line = g.study.line, named = g.named;   // (engine side: 0 Red, 1 Black)
  const seen = new Set(), cands = [];
  const consider = pre => { const k = pre.join(','); if (seen.has(k)) return; seen.add(k); const p = E.replay(null, pre).pos; if (p.side !== side) return; cands.push(pre); };
  // the study line's own positions; from each of them (the named moves on) the opponent leaves the book (its 2nd–8th moves at depth 5)
  // and play goes on for two more moves of each side (the opponent: its 4 best, the side: its 2 best)
  const grow = (pre, n) => { const p = E.replay(null, pre).pos; consider(pre); if (!n) return; const v = values(pre, 4);
    (p.side === side ? v.slice(0, 2) : v.slice(0, 5)).forEach(([m]) => grow(pre.concat([m]), n - 1)); };
  for (let i = named; i <= line.length; i++) { const pre = line.slice(0, i), p = E.replay(null, pre).pos;
    if (p.side === side) { consider(pre); continue; }
    values(pre, 4).slice(1, 9).forEach(([m]) => grow(pre.concat([m]), +(process.env.GROW || 3))); }
  // quick look (depth 5): a clear best
  const quick = cands.map(pre => ({ pre, sc: values(pre, 5) })).filter(c => c.sc.length >= 3 && acc(c.sc).length <= 2 && rest(c.sc) <= 14 && Math.abs(c.sc[0][1]) <= 400);
  const ok = [];
  for (const c of quick) { const s1 = values(c.pre, D1), s2 = values(c.pre, D2), a1 = acc(s1).sort().join(), a2 = acc(s2).sort().join();
    const why = []; if (a1 !== a2) why.push('acc'); if (acc(s2).length > 2) why.push('acc>2'); const p2 = Math.max(rest(s1), rest(s2)); if (p2 > 12) why.push('p2 ' + p2);
    if (Math.abs(s2[0][1]) > 350) why.push('decided'); if (s2.filter(x => !acc(s2).includes(x[0]) && x[1] >= s2[0][1] - 300).length < 2) why.push('few');
    if (process.env.WHY) process.stderr.write(why.join(',') + '\n'); if (!why.length) ok.push({ pre: c.pre, sc: s2, p2, s: E.replay(null, c.pre).pos.fen() }); }
  process.stderr.write(`${g.id}: ${cands.length} positions, ${quick.length} quick, ${ok.length} strict (${((Date.now() - t0) / 1000) | 0}s)\n`);
  if (process.env.CACHE) fs.writeFileSync(path.join(process.env.CACHE, g.id + '.json'), JSON.stringify(ok));
  ok.forEach(o => console.log(g.id, o.pre.length, o.p2, E.name(E.Pos.from(o.s), o.sc[0][0]), o.sc.slice(0, 3).map(x => x[1]).join(' ')));
}

// --pick: from the cached strict positions (CACHE=dir, made by the search above), the pool of each opening: ⑤ ⑦⑧ and the order
function pick() {
  const W = words(), dir = process.env.CACHE; let changed = 0;
  const OLD = JSON.parse(JSON.stringify(OP));   // (every opening's problems as they were: the ones not rebuilt stay; an opening's own old ones are left out)
  const chosen = [];
  for (const g of OP.sets) { const f = path.join(dir, g.id + '.json'); if (only.length && !only.includes(g.id)) continue; if (!fs.existsSync(f)) continue;
    const C = JSON.parse(fs.readFileSync(f, 'utf8')).map(c => ({ ...c, d: c.pre.length + c.p2 })).sort((a, b) => a.d - b.d || a.p2 - b.p2);
    const others = otherBoards(OLD, h => h.id === g.id), pool = [], ans = new Map(), kinds = new Map(), why = {};
    const no = (c, w) => { why[w] = (why[w] || 0) + 1; };
    for (const c0 of C) { const s1 = values(c0.pre, D1), s2 = values(c0.pre, D2), p2 = Math.max(rest(s1), rest(s2));   // (again, each search fresh)
      if (acc(s1).sort().join() !== acc(s2).sort().join() || acc(s2).length > 2 || p2 > 12 || Math.abs(s2[0][1]) > 350 || s2.filter(x => !acc(s2).includes(x[0]) && x[1] >= s2[0][1] - 300).length < 2) { no(c0, '①② again'); continue; }
      const c = { ...c0, sc: s2, p2, d: c0.pre.length + p2 };
      const p = E.Pos.from(c.s), A = c.sc[0][0], b = bd(c.s), ac = acc(c.sc);
      if (others.some(([, o]) => dist(o, b) <= 4) || chosen.some(o => dist(o, b) <= 4) || pool.some(o => dist(bd(o.s), b) <= 4)) { no(c, '⑤ near'); continue; }
      const an = E.name(p, A); if ((ans.get(an) || 0) >= 2) { no(c, '⑤ answer'); continue; }
      const FA = W.xqFacts(E, p, A), kd = W.xqKind(FA); if ((kinds.get(kd) || 0) >= 3) { no(c, '⑤ kind'); continue; }
      let bad = 0; for (const u of p.moves()) { if (ac.includes(u)) continue; if (!W.xqNgFact(E, p, A, FA, u, W.xqFacts(E, p, u))) { bad++; } }
      if (bad) { no(c, '⑦ no fact'); continue; }
      pool.push({ s: c.s, best: A, sc: c.sc, mv: c.pre, d: c.d }); ans.set(an, (ans.get(an) || 0) + 1); kinds.set(kd, (kinds.get(kd) || 0) + 1); chosen.push(b);
      if (pool.length >= 8) break; }
    pool.sort((a, b) => a.d - b.d); pool.forEach(P => delete P.d);
    console.log(g.id, C.length, 'strict →', pool.length, JSON.stringify(why), pool.map(P => E.name(E.Pos.from(P.s), P.best) + '/' + W.xqKind(W.xqFacts(E, E.Pos.from(P.s), P.best))).join(' '));
    if (write && pool.length >= 5) { g.problems = pool; g.verified = true; changed++; } }
  if (write && changed) { fs.writeFileSync(OPF, JSON.stringify(OP)); console.log('openings.json:', changed, 'openings verified'); }
}
