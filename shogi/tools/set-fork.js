// (2026-11-28 第2期 担当A) k5「両取りと駒得の手筋」: picks the problems from shogi/tools/gen-fork.js candidates and writes them into
// shogi/lessons.json. Kept: two real targets (two pieces worth a lance or more, or the king and a piece worth a knight or more), the
// engine (depth 5 and 6, every root move) puts the answer first and 300+ above the second, 7+ squares from every other shogi problem /
// warm-up and from each other; ordered easy → hard by d = the other legal moves that also attack an enemy piece they would win
// (+ legal / 1000). cand = every legal move once with the engine's depth-5 score (best first); rep = the opponent's best material
// reply to each other move (fork-lib val) and what it takes.
// (fork-lib holds: after every reply the moved piece still wins a piece — 「両方は守れない」)
// usage: node shogi/tools/set-fork.js <candidates.jsonl...> [--n=10] [--write]
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
const E0 = (() => { const k = require.resolve('../engine.js'), c = require.cache[k]; delete require.cache[k]; const e = require('../engine.js'); require.cache[k] = c; return e; })();
const WTS = (() => { const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); return new Int16Array(b.buffer, b.byteOffset, b.length / 2); })(); E.setWeights(WTS);
const F = require('./fork-lib.js')(E), T = E.typeOf;
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--')), NWANT = +((args.find(a => a.startsWith('--n=')) || '--n=10').slice(4)), WRITE = args.includes('--write');
const LP = path.join(__dirname, '../lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8'));
const brd = sfen => { const a = []; for (const row of sfen.split(' ')[0].replace(/\+(.)/g, (_, c) => c === c.toUpperCase() ? '#' + c : '%' + c).split('/')) { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (/\d/.test(ch)) for (let n = 0; n < +ch; n++) a.push('.'); else if (ch === '#' || ch === '%') a.push(ch + row[++i]); else a.push(ch); } } return a; };
const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 81; i++) { if (a[i] !== b[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
const pool = []; L.grades.forEach(g => { if (g.id === 'k5') return; g.problems.forEach(q => pool.push(brd(q.sfen))); (g.ramp || []).forEach(r => r.sfen && pool.push(brd(r.sfen))); });
const seen = new Set(), cs = [];
for (const f of files) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) { if (!ln.trim()) continue; const c = JSON.parse(ln); if (seen.has(c.sfen)) continue; seen.add(c.sfen); cs.push(c); }
const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
function single(p, m) { const tg = F.forkTargets(p, m); return tg.filter(x => x[1] !== 8).length > 0; }
const ok = [];
for (const c of cs) {
  const nk = c.targets.filter(x => x[1] !== 8).map(x => F.V(x[1]));
  if (c.check ? !(nk.some(v => v >= 4.05)) : !(nk.filter(v => v >= 3.15).length >= 2)) continue;
  const p = pos(c.sfen), ms = p.legalMoves(true);
  if (!F.holds(p, p.fromUsi(c.ans)).ok) { console.error('holds'); continue; }
  E.ttClear(); const r5 = new E.Searcher(p).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s);
  if (p.toUsi(r5[0].m) !== c.ans || r5[1].s > r5[0].s - 300) { console.error('engine5', c.ans, p.toUsi(r5[0].m), r5[0].s, r5[1] && r5[1].s); continue; }
  if (r5[0].s - r5[1].s < 600) { E.ttClear(); const r6 = new E.Searcher(p).analyze({ depth: 6, time: 0 }).sort((x, y) => y.s - x.s); if (p.toUsi(r6[0].m) !== c.ans || r6[1].s > r6[0].s - 300) { console.error('engine6', c.ans); continue; } }
  { let bad = null;   // (tools/lesson-verify-shfork.js searches with the engine's default weights: both must agree)
    E0.ttClear(); const p0 = new E0.Position(); p0.setSfen(c.sfen); const q5 = new E0.Searcher(p0).analyze({ depth: 5, time: 0 }).sort((x, y) => y.s - x.s);
    if (p0.toUsi(q5[0].m) !== c.ans || (q5[1] && q5[1].s > q5[0].s - 300)) bad = 'plain5';
    else if (q5[1] && q5[0].s - q5[1].s < 600) { E0.ttClear(); const q6 = new E0.Searcher(p0).analyze({ depth: 6, time: 0 }).sort((x, y) => y.s - x.s); if (p0.toUsi(q6[0].m) !== c.ans || (q6[1] && q6[1].s > q6[0].s - 300)) bad = 'plain6'; }
    if (bad) { console.error(bad, c.ans); continue; } }
  const B = brd(c.sfen); if (pool.some(b => dist(B, b) <= 6)) { console.error('near'); continue; }
  const d = ms.filter(m => p.toUsi(m) !== c.ans && single(p, m)).length + ms.length / 1000;
  c.cand = r5.map(x => [p.toUsi(x.m), x.s]); { let lo = c.cand[c.cand.length - 1][1]; for (const m of ms) { const u = p.toUsi(m); if (!c.cand.some(x => x[0] === u)) c.cand.push([u, --lo]); } }   // (the moves the search leaves out — a needless non-promotion — last)
  c.d = d; c.B = B; ok.push(c);
}
console.error('kept', ok.length, 'of', cs.length);
// greedy: variety of mover pieces and kinds, apart from each other
ok.sort((a, b) => a.d - b.d);
const pick = [];
for (const c of ok) { if (pick.some(q => dist(q.B, c.B) <= 6)) continue; if (pick.filter(q => q.mover === c.mover).length >= 3) continue; pick.push(c); if (pick.length >= NWANT) break; }
for (const c of pick) console.log(JSON.stringify({ sfen: c.sfen, ans: c.ans, val: c.val, second: c.second, targets: c.targets, check: c.check, drop: c.drop, mover: c.mover, d: +c.d.toFixed(3), gap: c.cand[0][1] - c.cand[1][1] }));
if (WRITE) {
  const g = L.grades.find(x => x.id === 'k5');
  g.problems = pick.map(c => { const p = pos(c.sfen), rep = {};
    for (const m of p.legalMoves(true)) { const u = p.toUsi(m); if (u === c.ans) continue; const r = F.val(p, m); rep[u] = [r.r, r.rt, +r.v.toFixed(2)]; }
    const ra = F.val(p, p.fromUsi(c.ans));
    return { kind: 'best', sfen: c.sfen, src: 'fork', mode: 'cp', pv: [c.ans, ra.r], accept: [c.ans], tg: c.targets, cand: c.cand, floor: c.cand[c.cand.length - 1][1] - 1, rep }; });
  fs.writeFileSync(LP, JSON.stringify(L, null, 1) === fs.readFileSync(LP, 'utf8') ? fs.readFileSync(LP, 'utf8') : fmt(L));
  const RP = path.join(__dirname, '../lesson-replies.json'), R = JSON.parse(fs.readFileSync(RP, 'utf8')); for (const k of Object.keys(R)) if (k.startsWith('k5/')) delete R[k];   // (k5 says the opponent's reply from P.rep)
  { const raw = fs.readFileSync(RP, 'utf8'); fs.writeFileSync(RP, JSON.stringify(R, null, raw.startsWith('{\n ') ? (raw.match(/^\{\n( +)/) || [0, ' '])[1].length : 0) + (raw.endsWith('\n') ? '\n' : '')); }
  console.error('written', g.problems.length);
}
function fmt(o) { const raw = fs.readFileSync(LP, 'utf8'); return raw.trimStart().startsWith('{\n') ? JSON.stringify(o, null, raw.match(/^\{\n( +)/) ? raw.match(/^\{\n( +)/)[1].length : 1) + (raw.endsWith('\n') ? '\n' : '') : JSON.stringify(o) + (raw.endsWith('\n') ? '\n' : ''); }
