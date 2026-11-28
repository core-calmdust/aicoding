// (2026-11-28 第2期 担当A) candidates for k1「中盤の次の一手」: positions from the engine's self-play (as gen-fork.js) where the side
// to move is not in check, no capture wins material now for the side to move (k15), NO legal move wins material at 2 plies (our move, every
// reply, captures — fork-lib val ≤ 0.95: 浅い読みでは見つからない), exactly one move wins +2.5 or more at 3 plies whatever the opponent
// replies (deep-lib v3: our move, every reply, our best move, every reply, captures) and every other move has a reply that holds us
// to +0.95 or less; no mate in three for either side, nor for the opponent after the answer.
// Prints JSON lines { sfen, ans, legal, mover, drop }.
// usage: node shogi/tools/gen-deep.js <games> <seed> [depth=2] [branches=6] > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const D = require('./deep-lib.js')(E), T = E.typeOf;
const [N = 50, SEED = 1, DEP = 2, BR = 6] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const brd = sfen => { const a = []; for (const row of sfen.split(' ')[0].replace(/\+(.)/g, (_, c) => c === c.toUpperCase() ? '#' + c : '%' + c).split('/')) { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (/\d/.test(ch)) for (let n = 0; n < +ch; n++) a.push('.'); else if (ch === '#' || ch === '%') a.push(ch + row[++i]); else a.push(ch); } } return a; };
const hits = [], near = sfen => { const b = brd(sfen); return hits.some(h => { let d = 0; for (let i = 0; i < 81; i++) if (h[i] !== b[i]) d++; return d <= 6; }); };
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const seen = new Set(), RND = process.argv[6] === 'rand';
const sample = (a, n) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
function mate1(p) { for (const m of p.legalMoves(true)) { p.doMove(m); const v = p.inCheck() && !p.legalMoves(true).length; p.undoMove(); if (v) return true; } return false; }
const CNT = {}; const c = k => (CNT[k] = (CNT[k] || 0) + 1, null);
function study(p) {
  if (p.inCheck()) return c('chk');
  const ms = p.legalMoves(true); if (ms.length < 20) return c('few'); if (ms.length > 130) return c('many');   // (the 3-ply reading grows with the cube of the moves: keep it bounded)
  if (D.qs(p) > 0.95) return c('qs');
  if (mate1(p)) return c('m1'); p.doNull(); const mo = mate1(p); p.undoNull(); if (mo) return c('mo');
  { E.ttClear(); const r3 = new E.Searcher(p).analyze({ depth: 3, time: 0 }); if (r3[1] && r3[1].s > r3[0].s - 200) return c('gap3'); }   // (the cheap filters first: the engine must see a clear best move)
  E.ttClear(); const r4 = new E.Searcher(p).analyze({ depth: 4, time: 0 }).sort((x, y) => y.s - x.s);
  if (!r4.length || (r4[1] && r4[1].s > r4[0].s - 280)) return c('gap4');
  for (const m of ms) if (D.val(p, m, 0.95).v > 0.95) return c('v2');           // (nothing wins at 2 plies)
  const a = r4[0].m; if (!D.v3(p, a, 2.5).ok) return c('v3a');
  for (const x of r4) { if (x.m === a) continue; if (D.v3(p, x.m, 0.96).ok) return c('v3o'); }   // (r4 lists every root move)
  for (const m of ms) if (!r4.some(x => x.m === m) && D.v3(p, m, 0.96).ok) return null;
  let m3 = null; try { m3 = E.solveMate(p, 3, 200000); } catch (e) {} if (m3 && m3.mate) return null;
  p.doMove(a); let o3 = null; try { o3 = E.solveMate(p, 3, 200000); } catch (e) {} p.undoMove(); if (o3 && o3.mate) return null;
  return { sfen: p.sfen(), ans: p.toUsi(a), legal: ms.length, mover: E.isDrop(a) ? E.dropType(a) : T(p.board[E.mFrom(a)]), drop: E.isDrop(a) };
}
for (let gme = 0; gme < N; gme++) {
  const p = new E.Position(); p.setSfen(START); const se = new E.Searcher(p); let skip = 0;
  for (let ply = 0; ply < 160; ply++) {
    if (!p.legalMoves(true).length) break;
    const res = se.analyze({ depth: DEP, nodes: DEP > 1 ? 20000 : 4000 }); if (!res.length) break;
    if (ply >= 24 && ply >= skip) for (const x of [null, ...(RND ? sample(p.legalMoves(true), BR).map(m => ({ m })) : res.slice(1, 1 + BR))]) {
      if (x) p.doMove(x.m);
      const k = p.sfen().split(' ').slice(0, 3).join(' ');
      if (!seen.has(k) && !near(p.sfen())) { seen.add(k); let r = null; try { r = study(p); } catch (e) { r = null; } if (r) { console.log(JSON.stringify(r)); hits.push(brd(r.sfen)); } }   // (a near twin of a position already found — 6 squares or fewer — is not studied)
      if (x) p.undoMove(); }
    const top = res.slice(0, Math.min(3, res.length)).filter(x => x.s > res[0].s - 300);
    p.doMove(top[Math.floor(rnd() * top.length)].m);
  }
  console.error('game', gme + 1, 'positions', seen.size, JSON.stringify(CNT));
}
