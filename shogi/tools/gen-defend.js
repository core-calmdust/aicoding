// (2026-11-27 第2期 担当A) candidates for k3「詰めろを受ける」: positions from the engine's self-play (depth 2, one of the top three moves
// at random) where the side to move is not in check, the opponent threatens mate in one (詰めろ: with a pass the opponent mates at
// once), and exactly one legal move leaves the opponent no mate within three — every other move is mated within three (rep: the
// opponent's first mating move and the length). From the rules, afresh: every legal move, every opponent check, every defence.
// The answer gives no check, and after it the opponent takes no piece for free and has no mate within five (solveMate).
// Prints JSON lines { sfen, ans, kind, threat, rep, legal, np, d }.
// usage: node shogi/tools/gen-defend.js <games> <seed> > out.jsonl
'use strict';
const E = require('../engine.js'), zlib = require('zlib'), fs = require('fs'), path = require('path');
{ const b = zlib.gunzipSync(fs.readFileSync(path.join(__dirname, '../weights.bin.gz'))); E.setWeights(new Int16Array(b.buffer, b.byteOffset, b.length / 2)); }
const [N = 50, SEED = 1] = process.argv.slice(2).map(Number);
let s = SEED >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
const mates1 = p => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck() && !p.legalMoves(true).length) o.push(m); p.undoMove(); } return o; };
const within = (p, n) => { const o = []; for (const m of p.legalMoves(true)) { p.doMove(m); if (p.inCheck()) { const rs = p.legalMoves(true);
  if (!rs.length || (n > 1 && rs.every(r => { p.doMove(r); const v = within(p, n - 2).length > 0; p.undoMove(); return v; }))) o.push(m); } p.undoMove(); } return o; };
const T = E.typeOf;
function kindOf(p, m) { if (E.isDrop(m)) return 'drop'; if (T(p.board[E.mFrom(m)]) === 8) return 'flee'; if (p.board[E.mTo(m)]) return 'capture'; return 'move'; }
function study(p) {
  if (p.inCheck()) return null;
  p.doNull(); const th = mates1(p).map(m => p.toUsi(m)); p.undoNull();
  if (!th.length) return null;
  const ms = p.legalMoves(true); if (ms.length < 8) return null;
  const rep = {}, keep = [];
  for (const m of ms) { const u = p.toUsi(m); p.doMove(m); const f = mates1(p); if (f.length) rep[u] = [p.toUsi(f[0]), 'mate', 1]; else keep.push(m); p.undoMove(); }
  if (!keep.length || keep.length > 10) return null;
  const good = [];
  for (const m of keep) { const u = p.toUsi(m); p.doMove(m); const w = within(p, 3); if (w.length) rep[u] = [p.toUsi(w[0]), 'mate', 3]; else good.push(m); p.undoMove(); }
  if (good.length !== 1) return null;
  const a = good[0], au = p.toUsi(a);
  p.doMove(a); const chk = p.inCheck();
  let free = false; for (const y of p.legalMoves(true)) { if (E.isDrop(y) || !p.board[E.mTo(y)]) continue; p.doMove(y); const back = p.legalMoves(true).some(z => !E.isDrop(z) && E.mTo(z) === E.mTo(y)); p.undoMove(); if (!back && T(p.board[E.mTo(y)]) !== 1) free = true; }
  let m5 = null; try { m5 = E.solveMate(p, 5, 300000); } catch (e) { m5 = null; }
  p.undoMove();
  if (chk || free || (m5 && m5.mate)) return null;
  const np = p.sfen().split(' ')[0].replace(/[^A-Za-z]/g, '').length;
  return { sfen: p.sfen(), ans: au, kind: kindOf(p, a), threat: th, rep, legal: ms.length, np, n3: Object.values(rep).filter(r => r[2] === 3).length };
}
const START = 'lnsgkgsnl/1r5b1/ppppppppp/9/9/9/PPPPPPPPP/1B5R1/LNSGKGSNL b - 1';
const seen = new Set();
if (process.argv[4] === 'rand') {   // endgame-like boards built at random: Sente's king low with a few guards, Gote's attackers and hand near it, Gote's king far up with guards
  const pick = a => a[Math.floor(rnd() * a.length)];
  for (let it = 0; it < N; it++) {
    const B = Array.from({ length: 9 }, () => Array(9).fill('')), files = new Set(), wfiles = new Set();
    const put = (r, c, ch) => { if (r < 0 || r > 8 || c < 0 || c > 8 || B[r][c]) return false; const t = ch.replace('+', '').toLowerCase(), w = ch.replace('+', '') === t;
      if (!ch.startsWith('+')) { if ((t === 'p' || t === 'l') && (w ? r === 8 : r === 0)) return false; if (t === 'n' && (w ? r >= 7 : r <= 1)) return false; if (t === 'p') { const F = w ? wfiles : files; if (F.has(c)) return false; F.add(c); } }
      B[r][c] = ch; return true; };
    const kr = 7 + Math.floor(rnd() * 2), kc = Math.floor(rnd() * 9); put(kr, kc, 'K');
    const near = () => [kr + Math.floor(rnd() * 4) - 2, kc + Math.floor(rnd() * 5) - 2];
    for (let k = 0, n = 1 + Math.floor(rnd() * 4); k < n; k++) { const [r, c] = near(); put(r, c, pick(['G', 'S', 'P', 'P', 'L', 'N', 'G'])); }
    for (let k = 0, n = 2 + Math.floor(rnd() * 3); k < n; k++) { const [r, c] = [kr - 1 - Math.floor(rnd() * 4), kc + Math.floor(rnd() * 7) - 3]; put(r, c, pick(['p', 'g', 's', '+r', '+b', 'n', 'l', 'r', 'b', 's', 'g', '+p'])); }
    const wkc = Math.floor(rnd() * 9); put(0, wkc, 'k'); for (let k = 0; k < 3; k++) put(Math.floor(rnd() * 2), wkc + Math.floor(rnd() * 3) - 1, pick(['g', 's', 'p', 'l']));
    for (let k = 0, n = 2 + Math.floor(rnd() * 4); k < n; k++) put(2 + Math.floor(rnd() * 5), Math.floor(rnd() * 9), pick(['P', 'P', 'R', 'B', 'S', 'p', 'p']));
    const hs = ['', 'P', 'S', 'G', 'N', 'L', 'PP'], hw = ['g', 's', 'n', 'p', 'gs', 'g', 'sn', 'b', 'r', 'l'];
    const hand = pick(hs) + pick(hw); const sf = B.map(r => { let o = '', e = 0; for (const x of r) { if (!x) { e++; continue; } if (e) o += e; e = 0; o += x; } return o + (e || ''); }).join('/') + ' b ' + (hand || '-') + ' 1';
    const p = new E.Position(); try { p.setSfen(sf); } catch (e) { continue; }
    p.doNull(); const wchk = p.inCheck(); p.undoNull(); if (wchk) continue;
    let r = null; try { r = study(p); } catch (e) { r = null; } if (r) console.log(JSON.stringify(r));
  }
  process.exit(0);
}
for (let gme = 0; gme < N; gme++) {
  const p = new E.Position(); p.setSfen(START); const se = new E.Searcher(p);
  for (let ply = 0; ply < 220; ply++) {
    if (!p.legalMoves(true).length) break;
    if (ply >= 40) { const k = p.sfen().split(' ').slice(0, 3).join(' '); if (!seen.has(k)) { seen.add(k); const r = study(p); if (r) console.log(JSON.stringify(r)); } }
    const res = se.analyze({ depth: 2, nodes: 20000 }); if (!res.length) break;
    const top = res.slice(0, Math.min(3, res.length)).filter(x => x.s > res[0].s - 300);
    p.doMove(top[Math.floor(rnd() * top.length)].m);
  }
}
