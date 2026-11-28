// (2026-11-28 第2期 担当A) k1「中盤の次の一手」: picks the problems from shogi/tools/gen-deep.js candidates and writes them into
// shogi/lessons.json. Kept: the engine (depth 5, and 6 when the gap is under 600; the learned weights and the default ones) puts the
// answer first and 300+ above the second; the answer's example line ex = [a reply of the opponent after the
// answer — the toughest by material first —, our capture after it, the piece it takes] wins +2.5 or more; 7+ squares from every other shogi
// problem / warm-up and from each other. Ordered easy → hard by d = the opponent's legal replies after the answer (the replies the student reads one by one)
// + legal / 1000. cand = every legal move once with the engine's depth-5 score (best first); rep[u] = for every other move a reply
// that holds us to +0.95 or less at 3 plies (deep-lib v3), the piece it takes and our material after it.
// usage: node shogi/tools/set-deep.js <candidates.jsonl...> [--n=10] [--write]
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
const E0 = (() => { const k = require.resolve('../engine.js'), c = require.cache[k]; delete require.cache[k]; const e = require('../engine.js'); require.cache[k] = c; return e; })();
const WTS = (() => { const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); return new Int16Array(b.buffer, b.byteOffset, b.length / 2); })(); E.setWeights(WTS);
const D = require('./deep-lib.js')(E), T = E.typeOf;
const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--')), NWANT = +((args.find(a => a.startsWith('--n=')) || '--n=10').slice(4)), WRITE = args.includes('--write');
const LP = path.join(__dirname, '../lessons.json'), L = JSON.parse(fs.readFileSync(LP, 'utf8'));
const brd = sfen => { const a = []; for (const row of sfen.split(' ')[0].replace(/\+(.)/g, (_, c) => c === c.toUpperCase() ? '#' + c : '%' + c).split('/')) { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (/\d/.test(ch)) for (let n = 0; n < +ch; n++) a.push('.'); else if (ch === '#' || ch === '%') a.push(ch + row[++i]); else a.push(ch); } } return a; };
const dist = (a, b) => { let d1 = 0, d2 = 0; for (let i = 0; i < 81; i++) { if (a[i] !== b[i]) d1++; const r = (i / 9) | 0, c = i % 9; if (a[i] !== b[r * 9 + 8 - c]) d2++; } return Math.min(d1, d2); };
const pool = []; L.grades.forEach(g => { if (g.id === 'k1') return; g.problems.forEach(q => pool.push(brd(q.sfen))); (g.ramp || []).forEach(r => r.sfen && pool.push(brd(r.sfen))); });
{ const TS = JSON.parse(fs.readFileSync(path.join(__dirname, '../tsume.json'), 'utf8')); (TS.sets || []).forEach(s => (s.problems || []).forEach(q => q.sfen && pool.push(brd(q.sfen)))); }
const seen = new Set(), cs = [];
for (const f of files) for (const ln of fs.readFileSync(f, 'utf8').split('\n')) { if (!ln.trim()) continue; const c = JSON.parse(ln); if (seen.has(c.sfen)) continue; seen.add(c.sfen); cs.push(c); }
const pos = s => { const p = new E.Position(); p.setSfen(s); return p; };
const CACHE = (args.find(a => a.startsWith('--cache=')) || '').slice(8), CH = CACHE && fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};   // (optional: the engine results by position, to rerun the pick quickly)
function eng(EE, sfen, ans) { const key = (EE === E ? 'L|' : 'P|') + sfen; if (CH[key]) return CH[key]; const r = eng0(EE, sfen, ans); CH[key] = r; if (CACHE) fs.writeFileSync(CACHE, JSON.stringify(CH)); return r; }
function eng0(EE, sfen, ans) {   // the engine with a fresh hash table: [first depth the answer is on top, depth-5 list, ok]
  EE.ttClear(); const p = new EE.Position(); p.setSfen(sfen); let first = 0;
  const r5 = new EE.Searcher(p).analyze({ depth: 5, time: 0, onDepth: (res, d) => { if (p.toUsi(res[0].m) === ans) { if (!first) first = d; } else first = 0; } });
  let ok = p.toUsi(r5[0].m) === ans && !(r5[1] && r5[1].s > r5[0].s - 300);
  if (ok && r5[1] && r5[0].s - r5[1].s < 600) { EE.ttClear(); const r6 = new EE.Searcher(p).analyze({ depth: 6, time: 0 }); ok = p.toUsi(r6[0].m) === ans && !(r6[1] && r6[1].s > r6[0].s - 300); }
  return { first, r5: r5.map(x => [p.toUsi(x.m), x.s]), ok };
}
const ok = [];
for (const c of cs) {
  const A = eng(E, c.sfen, c.ans); if (!A.ok) { console.error('engine', c.ans, A.r5.slice(0, 2)); continue; }
  if (Math.abs(A.r5[0][1]) >= 20000 || Math.abs(A.r5[1][1]) >= 20000) { console.error('mate', c.ans); continue; }   // (a forced mate is a tsume, not this lesson)
  const B0 = eng(E0, c.sfen, c.ans); if (!B0.ok) { console.error('plain', c.ans, B0.r5.slice(0, 2)); continue; }
  const B = brd(c.sfen); if (pool.some(b => dist(B, b) <= 6)) { console.error('near'); continue; }
  const p = pos(c.sfen), am = p.fromUsi(c.ans);
  if (D.val(p, am).v > 0.5) { console.error('the answer itself wins', c.ans); continue; }   // (「この手だけでは駒得にならない」)
  // the example: the opponent's toughest replies first (our material after the reply and our best move: deep-lib bestY, lowest first —
  // 「相手のいちばんの受け」), then the first after which a capture of ours (a piece worth 2.5 or more) wins +2.5 (the best such capture)
  let r1 = null, y = null; { const g0 = D.gain(p, am); p.doMove(am);
    const rr = p.legalMoves(true).map(r => { const gr = D.gain(p, r); p.doMove(r); const v = g0 - gr + D.bestY(p, null).v; p.undoMove(); return { m: r, v }; }).sort((a, b) => a.v - b.v);
    for (const x of rr.slice(0, 3)) { const gr = D.gain(p, x.m); p.doMove(x.m); let best = null;
      for (const ym of p.legalMoves(true)) { if (E.isDrop(ym) || !p.board[E.mTo(ym)] || T(p.board[E.mTo(ym)]) === 8 || D.V(T(p.board[E.mTo(ym)])) < 2.5) continue;   /* (the example names a real piece: worth 2.5 or more by itself) */ const v = g0 - gr + D.val(p, ym).v; if (v >= 2.5 && (!best || v > best.v)) best = { v, y: p.toUsi(ym), yt: T(p.board[E.mTo(ym)]) }; }
      p.undoMove(); if (best) { r1 = p.toUsi(x.m); y = best; break; } }
    p.undoMove(); }
  if (!y) { console.error('example', c.ans); continue; }
  const ms = p.legalMoves(true);
  c.cand = A.r5.slice(); { let lo = c.cand[c.cand.length - 1][1]; for (const m of ms) { const u = p.toUsi(m); if (!c.cand.some(x => x[0] === u)) c.cand.push([u, --lo]); } }
  p.doMove(am); const nr = p.legalMoves(true).length; p.undoMove(); c.d = nr + ms.length / 1000; c.B = B; c.ex = [r1, y.y, y.yt]; ok.push(c);
  console.error('ok', c.ans, 'first', A.first, 'gap', A.r5[0][1] - A.r5[1][1], 'ex', c.ex);
}
console.error('kept', ok.length, 'of', cs.length);
ok.sort((a, b) => a.d - b.d);
const pick = [];
for (const c of ok) { if (pick.some(q => dist(q.B, c.B) <= 6)) continue; if (pick.filter(q => q.mover === c.mover).length >= 3) continue; pick.push(c); if (pick.length >= NWANT) break; }
for (const c of pick) console.log(JSON.stringify({ sfen: c.sfen, ans: c.ans, mover: c.mover, d: +c.d.toFixed(3), gap: c.cand[0][1] - c.cand[1][1], ex: c.ex }));
if (WRITE) {
  const g = L.grades.find(x => x.id === 'k1');
  g.problems = pick.map(c => { const p = pos(c.sfen), rep = {};
    for (const m of p.legalMoves(true)) { const u = p.toUsi(m); if (u === c.ans) continue; const r = D.v3(p, m, 0.96); if (r.ok) throw new Error('v3 ' + u);
      p.doMove(m); const rm = p.fromUsi(r.r), rt = E.isDrop(rm) || !p.board[E.mTo(rm)] ? 0 : T(p.board[E.mTo(rm)]); p.undoMove(); rep[u] = [r.r, rt, +r.v.toFixed(2)]; }
    return { kind: 'best', sfen: c.sfen, src: 'deep', mode: 'cp', pv: [c.ans, c.ex[0], c.ex[1]], accept: [c.ans], ex: c.ex, cand: c.cand, floor: c.cand[c.cand.length - 1][1] - 1, rep }; });
  const raw = fs.readFileSync(LP, 'utf8'); fs.writeFileSync(LP, JSON.stringify(L, null, raw.match(/^\{\n( +)/) ? raw.match(/^\{\n( +)/)[1].length : 0) + (raw.endsWith('\n') ? '\n' : ''));
  const RP = path.join(__dirname, '../lesson-replies.json'), R = JSON.parse(fs.readFileSync(RP, 'utf8')); for (const k of Object.keys(R)) if (k.startsWith('k1/')) delete R[k];   // (k1 says the opponent's reply from P.rep)
  { const rw = fs.readFileSync(RP, 'utf8'); fs.writeFileSync(RP, JSON.stringify(R, null, rw.match(/^\{\n( +)/) ? rw.match(/^\{\n( +)/)[1].length : 0) + (rw.endsWith('\n') ? '\n' : '')); }
  console.error('written', g.problems.length);
}
