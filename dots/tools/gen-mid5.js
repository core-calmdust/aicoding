// (2026-11-28 担当A) candidates for the lesson mid5 (5×5の中盤：大きな盤でも、長い鎖を先に開くのはだれかを読む — mid4's reading on a 5×5).
// Random games of safe lines from the empty 5×5 (no box taken: 先手 / 後手 on the board), stopped with lo–hi safe lines left; kept when
// (as tools/lesson-verify.js dots, mid5): nothing to take, 3+ safe lines, exactly one best line (exact solver) — it is safe and it wins,
// the next 2+ below, 2+ safe lines worse; along every line of optimal play the opponent is the first to open a long chain after the best
// line and the mover after every other safe line (dtOpener); no other dots problem within 2 lines (8 symmetries). _countable: after the
// best line every run of safe lines ends in plain chains with one number of long chains (the parity lesson's counting: not for mid5).
// node dots/tools/gen-mid5.js [count] [seed] [tries] [lo] [hi] > out.jsonl   (the 10 of 2026-11-28: seeds 101 and 202, safe 3–8 by d)
const path = require('path'), fs = require('fs'), ROOT = path.join(__dirname, '../..');
const E = require(path.join(ROOT, 'dots/engine.js'));
const DK = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const want = +(process.argv[2] || 40); let seed = +(process.argv[3] || 1);
const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };   // (mulberry32)
const n = 5, G = E.geom(n, n), dotsN = (n + 1) * (n + 1);
const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/lessons.json'), 'utf8')), pool = [];
L.steps.forEach(st => { if (st.id !== 'mid5') st.problems.forEach(q => pool.push(q)); });
for (const f of fs.readdirSync(path.join(ROOT, 'dots/puzzles'))) { const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'dots/puzzles', f), 'utf8'));
  (d.levels || []).forEach(lv => (lv || []).forEach(q => { if (q && q.e) pool.push(q); })); }
const dec = x => [...x].map(c => DK.indexOf(c));
const near = (A, B) => { const Bs = new Set(B); for (const P of G.perms) { let d = 0; const A2 = new Set(A.map(e => P[e])); for (const e of A2) if (!Bs.has(e)) d++; for (const e of Bs) if (!A2.has(e)) d++; if (d <= 2) return true; } return false; };
const pool5 = pool.filter(q => q.n === 5).map(q => dec(q.e));
function safeEnd(p0, e) {
  const p = p0.clone(), memo = new Map(); p.play(e);
  const rec = () => { const key = p.h1[0] + ':' + p.h2[0]; if (memo.has(key)) return memo.get(key);
    const sl = p.legal().filter(x => p.isSafe(x)); let r;
    if (!sl.length) { const cs = E.components(p, true); r = { par: new Set([0]), lc: new Set([cs.filter(c => c.simple && !c.loop && c.n >= 3).length]), loops: cs.some(c => c.loop), simple: cs.every(c => c.simple) }; }
    else { r = { par: new Set(), lc: new Set(), loops: false, simple: true };
      for (const x of sl) { p.play(x); const t = rec(); p.undo(x); t.par.forEach(v => r.par.add(1 - v)); t.lc.forEach(v => r.lc.add(v)); r.loops = r.loops || t.loops; r.simple = r.simple && t.simple; } }
    memo.set(key, r); return r; };
  const r = rec(); return { opener: r.par.size > 1 ? 'mixed' : r.par.has(0) ? 'opp' : 'me', lc: r.lc, loops: r.loops, simple: r.simple };
}
const seen = new Set(), got = [], C = {}; let tries = 0; const cnt = k => C[k] = (C[k] || 0) + 1;
// dtOpener (tools/lesson-verify.js): along every line of optimal play, who first opens a long chain
function opener(S, p0) {
  const p = p0.clone(), memo = new Map();
  const rec = () => { const key = p.h1[0] + ':' + p.h2[0]; if (memo.has(key)) return memo.get(key);
    const lg = p.legal(), r = new Set();
    if (!lg.length) { r.add('none'); memo.set(key, r); return r; }
    const A = S.all(p), bv = Math.max(...A.map(x => x.v));
    for (const x of A) { if (x.v !== bv) continue; const m = x.m;
      if (!p.completes(m) && p.gives(m) > 0) { const cs = E.components(p, true), bs = [G.eb0[m], G.eb1[m]], c = cs.find(c => bs.some(b => b >= 0 && c.boxes.includes(b)));
        if (c && c.n >= 3) { r.add('tomove'); continue; } }
      const k = p.play(m), t = rec(); p.undo(m);
      t.forEach(v => r.add(v === 'none' || k ? v : v === 'tomove' ? 'other' : 'tomove')); }
    memo.set(key, r); return r; };
  return rec();
}
const lo = +(process.argv[5] || 3), hi = +(process.argv[6] || 9);
while (got.length < want && tries < +(process.argv[4] || 2000000)) { tries++;
  const p = E.Pos.from(G, []), stop = lo + Math.floor(rnd() * (hi - lo + 1)), drawn = [];
  for (;;) { const sl = p.legal().filter(x => p.isSafe(x)); if (sl.length <= stop) break; const e = sl[Math.floor(rnd() * sl.length)]; p.play(e); drawn.push(e); }
  const lg = p.legal(), safe = lg.filter(x => p.isSafe(x));
  if (safe.length < 3 || p.hasCapture()) continue; cnt('pos');
  const S = new E.Solver(G), all = S.all(p), best = Math.max(...all.map(x => x.v)), B = all.filter(x => x.v === best).map(x => x.m);
  if (B.length !== 1 || !safe.includes(B[0]) || best <= 0) continue; cnt('best');
  const V = new Map(all.map(x => [x.m, x.v])); if (safe.filter(e => V.get(e) < best).length < 2) continue;
  const sec = Math.max(...all.filter(x => x.v < best).map(x => x.v)); if (best - sec < 2) continue; cnt('gap');
  const op = e => { const p2 = p.clone(); p2.play(e); return opener(S, p2); };
  let ok = true; for (const e of safe) { const o = op(e), w = e === B[0] ? 'tomove' : 'other'; if (o.size !== 1 || !o.has(w)) { ok = false; break; } } if (!ok) continue; cnt('open');
  const fe = safeEnd(p, B[0]); if (fe.simple && !fe.loops && fe.lc.size === 1) { cnt('countable'); }
  const edges = drawn.slice().sort((a, b) => a - b); if (pool5.some(B2 => near(edges, B2)) || got.some(g => near(edges, g.edges))) continue;
  const v = []; for (let e = 0; e < G.E; e++) v.push('.'); for (const x of all) v[x.m] = DK[x.v + 30];
  got.push({ edges }); console.log(JSON.stringify({ n, e: edges.map(e => DK[e]).join(''), o: '.'.repeat(n * n), v: v.join(''), k: 'mid5', _safe: safe.length, _best: best, _gap: best - sec, _countable: !!(fe.simple && !fe.loops && fe.lc.size === 1) }));
}
console.error('tries', tries, 'got', got.length, JSON.stringify(C));
