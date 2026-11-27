// (2026-11-28 第2期 担当A) gen_take_block.js の候補（1行1つの JSON）から5問を選んで morris/lessons.json の b_take / b_block に書く：
// d（合法手÷正解の数）が易→難、ナインのほかの盤（レッスン・準備・パズル、16通りの対称と色の入れかえ）と互いに4点以上ちがう。
// node morris/tools/set_take_block.js b_take|b_block cand.jl [cand2.jl …]
'use strict';
const path = require('path'), fs = require('fs');
const V = require(path.join(__dirname, '../../tools/lesson-verify-mmbasic.js'));
const { G } = V.engine(), SY = V.syms(G), id = process.argv[2];
const LP = path.join(__dirname, '../lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8'));
const cand = []; for (const f of process.argv.slice(3)) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) if (ln.trim()) cand.push(JSON.parse(ln));
const others = [];
L.steps.forEach(st => { if (st.id !== id) (st.problems || []).forEach(P => others.push(P.s.b)); (st.ramp || []).forEach(R => R.s && others.push(R.s.b)); });
const PZ = JSON.parse(fs.readFileSync(path.join(__dirname, '../puzzles.json'), 'utf8'));
(PZ.themes || []).forEach(t => (t.puzzles || []).forEach(p => p.s && others.push(p.s.b)));
const dist = (a, b) => { let best = 99; for (const T of SY) for (const sw of [0, 1]) { let d = 0; for (let i = 0; i < G.n; i++) { let v = +b[T[i]]; if (sw && v) v = 3 - v; if (+a[i] !== v) d++; } if (d < best) best = d; } return best; };
const ok = cand.filter(c => others.every(b => dist(c.s.b, b) >= 4));
ok.sort((a, b) => a.d - b.d || a.n - b.n);
const ds = [...new Set(ok.map(c => c.d))];
// spread 5 over the d values (easy → hard), each far from the ones already picked
const pick = [];
for (let k = 0; k < 5; k++) { const want = ds[Math.round(k * (ds.length - 1) / 4)];
  const c = ok.find(c => c.d >= want && (!pick.length || c.d >= pick[pick.length - 1].d) && !pick.includes(c) && pick.every(p => dist(p.s.b, c.s.b) >= 4));
  if (!c) throw new Error('not enough candidates at d ' + want); pick.push(c); }
if (!(pick[4].d > pick[0].d)) throw new Error('d does not rise');
const st = L.steps.find(s => s.id === id); st.problems = pick.map(c => ({ s: c.s, ok: c.ok, best: c.best }));
fs.writeFileSync(LP, JSON.stringify(L));
console.log(id, pick.map(c => c.d).join(' '));
