// (2026-11-24 第2期・担当B) the strict pass over an opening set's game-based problems ("which move is played most?", mode freq):
// keeps only the problems that meet claude/lesson-quality.md's ①〜⑥ and orders them easy → hard. build.js applies the result
// (verified.json: id → the kept problems' sfen in order); tools/lesson-verify.js shogiOpen checks the same rules on its own.
//   ① the answer is the most played move, and the site's engine (depth 8) puts it within 150 of its best
//   ② the answer is clearly the most played: played 12 times or more, the second move 60% of it or less (≤ 12 of 20 points)
//   ③ a real choice: 2 or more moves in the stored candidates
//   ④ on theme: the set's own pattern (src pat; the mirrored one when the strategy is Gote's) holds and the mover is the strategy's side
//   ⑤ no near twin: 5 squares or more apart from every other problem of the shogi lessons and openings; one answer at most twice
//   ⑥ easy → hard: d = squares changed from the start + 20 × (second / first)
// node shogi/tools/openings/curate.js id[,id…]   → verified.json (then node build.js)
'use strict';
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '../..');
const E = require(path.join(DIR, 'engine.js'));
const ids = (process.argv[2] || '').split(',').filter(Boolean);
const OUT = process.env.CUR_OUT || path.join(__dirname, 'verified.json');
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const PC = { P: 1, L: 2, N: 3, S: 4, B: 5, R: 6, G: 7, K: 8 };
function compile(pat, mir) {
  return pat.trim().split(/\s+/).map(term => { let neg = false; if (term[0] === '!') { neg = true; term = term.slice(1); }
    return { neg, alts: term.split('|').map(a => { if (a === 'xB') return { xB: true }; if (a[0] === 'h') { let c = a[1] === 'w' ? 1 : 0; if (mir) c = 1 - c; return { hand: c, t: PC[a[2]] }; }
      let c = a[0] === 'w' ? 1 : 0, t = PC[a[1]], f = +a[2], r = +a[3]; if (mir) { c = 1 - c; f = 10 - f; r = 10 - r; } return { c, t, sq: E.makeSq(f, r) }; }) }; });
}
const match = (p, C) => C.every(({ neg, alts }) => alts.some(a => { if (a.hand !== undefined) return p.hand[a.hand * 8 + a.t] > 0;
  if (a.xB) { for (let s = 0; s < 81; s++) { const x = p.board[s]; if (x && (E.typeOf(x) === 5 || E.typeOf(x) === 13)) return false; } return true; }
  const x = p.board[a.sq]; return !!x && E.colorOf(x) === a.c && E.typeOf(x) === a.t; }) !== neg);
const brd = sfen => { const a = []; for (const row of sfen.split(' ')[0].replace(/\+(.)/g, (_, c) => c === c.toUpperCase() ? '#' + c : '%' + c).split('/')) for (let i = 0; i < row.length; i++) { const ch = row[i]; if (/\d/.test(ch)) for (let n = 0; n < +ch; n++) a.push('.'); else if (ch === '#' || ch === '%') a.push(ch + row[++i]); else a.push(ch); } return a; };
const dist = (a, b) => { let d = 0; for (let i = 0; i < 81; i++) if (a[i] !== b[i]) d++; return d; };
const S0 = brd(START);
module.exports = { compile, match, brd, dist };
if (require.main !== module) return;

const W = require('./wasm-engine.js').loadSync();
const src = {}; for (const c of ['beg', 'mid', 'adv', 'sp', 'new', 'castle']) for (const e of require(`./src/${c}.js`)) src[e.id] = e;
const sets = []; for (const c of ['beg', 'mid', 'adv', 'sp', 'new', 'castle']) JSON.parse(fs.readFileSync(path.join(DIR, `openings-${c}.json`), 'utf8')).sets.forEach(s => sets.push(s));
JSON.parse(fs.readFileSync(path.join(DIR, 'openings.json'), 'utf8')).sets.forEach(s => { if (!sets.some(x => x.id === s.id)) sets.push(s); });
const L = JSON.parse(fs.readFileSync(path.join(DIR, 'lessons.json'), 'utf8'));
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'problems.json'), 'utf8'));   // (the full pool, before an earlier curation)
for (const id of ids) {
  const e = src[id]; if (!e || !e.pat) throw new Error(id + ': no pattern');
  const side = e.side === 'w' ? 1 : 0, C0 = compile(e.pat, false), C1 = e.mirror ? compile(e.pat, true) : null;
  const others = []; sets.forEach(s => { if (s.id === id) return; (s.problems || []).concat(s.lineProbs || []).forEach((p, j) => others.push([`${s.id} ${j}`, brd(p.sfen)])); });
  L.grades.forEach(g => { g.problems.forEach((p, j) => others.push([`${g.id} q${j + 1}`, brd(p.sfen)])); (g.ramp || []).forEach((r, j) => r.sfen && others.push([`${g.id} ramp${j}`, brd(r.sfen)])); });
  const kept = [], why = {};
  const pool = (raw[id] || []).map(P => { const C = P.cand || [], n1 = C[0][1], n2 = (C[1] || [0, 0])[1];
    const p = new E.Position(); p.setSfen(P.sfen); const a = match(p, C0), b = C1 && match(p, C1), strat = a && !b ? side : b && !a ? 1 - side : -1;
    const r = W.analyze(P.sfen, { depth: 8 }), sc = (r.find(x => x.usi === P.accept[0]) || { s: -1e9 }).s;
    const B = brd(P.sfen); return { P, n1, n2, strat, mover: p.side, loss: r[0].s - sc, B, d: dist(B, S0) + 20 * n2 / n1 }; });
  pool.sort((x, y) => y.n1 - x.n1);
  for (const q of pool) {
    const no = m => { why[m] = (why[m] || 0) + 1; };
    if (q.P.mode !== 'freq' || q.P.accept.length !== 1 || q.P.accept[0] !== q.P.cand[0][0]) { no('① not a freq problem'); continue; }
    if (q.loss > 150) { no('① the engine: 150+ below its best'); continue; }
    if (q.n1 < 12 || q.n2 > 0.6 * q.n1) { no('② not clearly the most played'); continue; }
    if (q.P.cand.length < 2) { no('③ one candidate'); continue; }
    if (q.strat !== q.mover) { no('④ not the strategy side to move'); continue; }
    if (others.some(([, b]) => dist(q.B, b) <= 4) || kept.some(k => dist(k.B, q.B) <= 4)) { no('⑤ a near twin'); continue; }
    if (kept.filter(k => k.P.accept[0] === q.P.accept[0]).length >= 2) { no('⑤ the same answer a third time'); continue; }
    kept.push(q);
  }
  kept.sort((x, y) => x.d - y.d);
  console.log(id, `${kept.length} of ${pool.length} kept`, JSON.stringify(why));
  if (kept.length < 5) { console.log(`  ${id}: fewer than 5 — left as it was`); continue; }
  out[id] = kept.map(q => q.P.sfen);
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
