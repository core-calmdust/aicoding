// Composed tsume generator (node): random restarts + hill climbing on the mate length, then the full
// verification (solve.js verify: exact length, unique at every attacker move, longest defence, no leftover),
// economy reduction (pieces whose removal keeps the very same problem are removed) and the fun score (../fun.js).
// Deterministic for a given seed.
// usage: node tools/tsume/gen.js <n> <seed> <seconds> <out.jsonl> [maxPieces]
//   writes one JSON line per new problem: { sfen, n, sol, fun, tags, nodes }
'use strict';
const fs = require('fs');
const S = require('./solve.js');
const F = require('../fun.js');
const E = S.E;
const { BLACK, WHITE, OU, FU, KY, KE, GI, KA, HI, KI } = E;

const TOTAL = [0, 18, 4, 4, 4, 2, 2, 4];   // pawns .. golds
const LET = ' PLNSBRGK';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

// position: { k: sq, pcs: [{ s, t, c }] (t 1..14 incl. promoted 9..14), hand: [0..7] attacker hand }
function toSfen(P) {
  const b = new Array(81).fill(null);
  b[P.k] = 'k';
  const used = TOTAL.slice();
  for (const p of P.pcs) { const base = p.t > 8 ? p.t - 8 : p.t; used[base]--; b[p.s] = (p.t > 8 ? '+' : '') + (p.c ? LET[base].toLowerCase() : LET[base]); }
  for (let t = 1; t <= 7; t++) used[t] -= P.hand[t];
  let s = '';
  for (let r = 0; r < 9; r++) { let e = 0; for (let c = 0; c < 9; c++) { const x = b[r * 9 + c]; if (!x) { e++; continue; } if (e) { s += e; e = 0; } s += x; } if (e) s += e; if (r < 8) s += '/'; }
  let h = '';
  for (const t of [6, 5, 7, 4, 3, 2, 1]) if (P.hand[t]) h += (P.hand[t] > 1 ? P.hand[t] : '') + LET[t];
  for (const t of [6, 5, 7, 4, 3, 2, 1]) if (used[t] > 0) h += (used[t] > 1 ? used[t] : '') + LET[t].toLowerCase();
  return `${s} b ${h || '-'} 1`;
}
function valid(P) {
  const cnt = TOTAL.slice(); const occ = new Set([P.k]);
  for (const p of P.pcs) {
    if (occ.has(p.s)) return false; occ.add(p.s);
    const base = p.t > 8 ? p.t - 8 : p.t; if (--cnt[base] < 0) return false;
    if (p.t <= 8 && p.t !== GI && p.t !== KI && E.deadEnd(p.c, p.t, p.s)) return false;
  }
  for (let t = 1; t <= 7; t++) if ((cnt[t] -= P.hand[t]) < 0) return false;
  // nifu
  for (const c of [0, 1]) { const f = new Set(); for (const p of P.pcs) if (p.c === c && p.t === FU) { if (f.has(p.s % 9)) return false; f.add(p.s % 9); } }
  return true;
}
const clone = P => ({ k: P.k, pcs: P.pcs.map(p => ({ ...p })), hand: P.hand.slice() });
const near = (R, k, d) => { for (;;) { const r = ((k / 9) | 0) + Math.floor(R() * (2 * d + 1)) - d, c = (k % 9) + Math.floor(R() * (2 * d + 1)) - d; if (r >= 0 && r < 9 && c >= 0 && c < 9) return r * 9 + c; } };
const PIECE_W = [[FU, 2], [KY, 2], [KE, 3], [GI, 4], [KI, 4], [KA, 3], [HI, 3], [9, .4], [11, .3], [12, .4], [13, 1.2], [14, 1.2]];
function pickType(R, noProm) { const L = noProm ? PIECE_W.filter(x => x[0] <= 8) : PIECE_W; let tot = 0; for (const x of L) tot += x[1]; let v = R() * tot; for (const x of L) { v -= x[1]; if (v <= 0) return x[0]; } return KI; }

function randomPos(R, maxPieces) {
  for (;;) {
    // king mostly near the top edge / a corner
    const r = R() < .7 ? Math.floor(R() * 2) : Math.floor(R() * 5), c = Math.floor(R() * 9);
    const P = { k: r * 9 + c, pcs: [], hand: [0, 0, 0, 0, 0, 0, 0, 0] };
    const na = 1 + Math.floor(R() * 3), nd = Math.floor(R() * 3), nh = 1 + Math.floor(R() * 2);
    for (let i = 0; i < na; i++) P.pcs.push({ s: near(R, P.k, 3), t: pickType(R), c: 0 });
    for (let i = 0; i < nd; i++) P.pcs.push({ s: near(R, P.k, 2), t: pickType(R, R() < .7), c: 1 });
    for (let i = 0; i < nh; i++) P.hand[pickType(R, true)]++;
    if (P.pcs.length + nh > maxPieces) continue;
    if (valid(P)) return P;
  }
}
function mutate(R, P0) {
  const P = clone(P0), x = R();
  if (x < .35 && P.pcs.length) { const p = P.pcs[Math.floor(R() * P.pcs.length)]; p.s = near(R, P.k, p.c ? 2 : 4); }
  else if (x < .5 && P.pcs.length) { const p = P.pcs[Math.floor(R() * P.pcs.length)]; p.t = pickType(R, p.c === 1 && R() < .6); }
  else if (x < .62) P.pcs.push({ s: near(R, P.k, 3), t: pickType(R, R() < .5), c: R() < .6 ? 0 : 1 });
  else if (x < .74 && P.pcs.length) P.pcs.splice(Math.floor(R() * P.pcs.length), 1);
  else if (x < .86) { const t = pickType(R, true); if (R() < .5 || !P.hand[t]) P.hand[t]++; else P.hand[t]--; }
  else if (x < .93) { const ns = near(R, P.k, 1); P.k = ns; }
  else if (P.pcs.length) { const p = P.pcs[Math.floor(R() * P.pcs.length)]; if (p.t <= 7 && p.t !== KI) p.t += 8; else if (p.t > 8) p.t -= 8; }
  return valid(P) && P.pcs.every(p => p.s !== P.k) ? P : null;
}
// quick mate length (shortest, odd) up to max; 0 = none / unknown / illegal start
let QS = null;
function quickLen(sfen, max, limit) {
  const sv = QS || (QS = new S.Solver(limit)); sv.reset(); sv.nodeLimit = limit; sv.pos.setSfen(sfen);
  if (sv.pos.inCheck(WHITE)) return 0;
  try { return sv.mateLen(max); } catch (e) { return 0; }
}
// remove pieces that do not matter (the same line still verifies); attacker board pieces vanish, defender pieces
// go to the defender's hand (toSfen does that), attacker hand pieces too
function reduce(P, n, sol) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < P.pcs.length; i++) {
      const Q = clone(P); Q.pcs.splice(i, 1);
      const r = S.verify(toSfen(Q), n, { nodeLimit: 2e6 });
      if (r.ok) { P = Q; sol = r.sol; changed = true; break; }
    }
  }
  return { P, sol };
}
// canonical key: the position and its left-right mirror
function canon(sfen) {
  const [b, , h] = sfen.split(' ');
  const rows = b.split('/').map(r => { const out = []; let pro = ''; for (const ch of r) { if (ch === '+') { pro = '+'; continue; } if (ch >= '1' && ch <= '9') for (let i = 0; i < +ch; i++) out.push('.'); else { out.push(pro + ch); } pro = ''; } return out; });
  const a = rows.map(r => r.join(',')).join('/'), m = rows.map(r => r.slice().reverse().join(',')).join('/');
  return (a < m ? a : m) + ' ' + h;
}

function run(n, seed, seconds, outFile, maxPieces = 8) {
  const R = rng(seed), t0 = Date.now(), seen = new Set();
  const D = require('../../tsume.json');
  for (const g of D.sets) for (const p of g.problems) seen.add(canon(p.sfen));
  let found = 0, tries = 0;
  const lim = n <= 5 ? 6e4 : n <= 7 ? 2e5 : n <= 11 ? 6e5 : 1.2e6;
  while ((Date.now() - t0) / 1000 < seconds) {
    let P = randomPos(R, maxPieces), sf = toSfen(P), L = quickLen(sf, n, lim);
    tries++;
    // climb: accept equal-or-longer mates (never beyond n), restart after a while without progress
    let stall = 0, fails = 0;
    for (let it = 0; it < 400 && stall < 60 && (Date.now() - t0) / 1000 < seconds; it++) {
      const Q = mutate(R, P); if (!Q) continue;
      if (Q.pcs.length + Q.hand.reduce((a, b) => a + b, 0) > maxPieces + 1) continue;
      const qs = toSfen(Q), ql = quickLen(qs, n, lim);
      if (!ql) { stall++; continue; }
      if (ql >= L) { if (ql > L) stall = 0; else stall++; P = Q; sf = qs; L = ql; } else stall++;
      if (L === n) {
        let v = S.verify(sf, n, { nodeLimit: lim * 8 });
        if (process.env.DBG) console.log('L=n', sf, v.ok || v.why);
        // leftover pieces: try with one hand piece less
        if (!v.ok && v.why === 'leftover') {
          for (let t = 1; t <= 7 && !v.ok; t++) if (P.hand[t]) {
            const Q = clone(P); Q.hand[t]--; const qs = toSfen(Q);
            if (quickLen(qs, n, lim) === n) { const w = S.verify(qs, n, { nodeLimit: lim * 8 }); if (w.ok) { v = w; P = Q; sf = qs; } }
          }
        }
        if (!v.ok) { if (++fails > 12) break; continue; }
        const red = reduce(P, n, v.sol), rs = toSfen(red.P), key = canon(rs);
        if (!seen.has(key)) {
          seen.add(key);
          const vv = S.verify(rs, n, { nodeLimit: lim * 8 });
          if (vv.ok) {
            const fs_ = F.funScore(rs, vv.sol);
            fs.appendFileSync(outFile, JSON.stringify({ sfen: rs, n, sol: vv.sol, fun: fs_.fun, tags: fs_.tags, nodes: vv.info.nodes, seed }) + '\n');
            found++;
            if (process.env.DBG) console.log('FOUND', fs_.fun, rs, vv.sol.join(' '));
          }
        }
        break;   // next restart
      }
    }
  }
  return { found, tries };
}
module.exports = { toSfen, valid, canon, run, randomPos, mutate, quickLen, rng };
if (require.main === module) {
  const [n, seed, sec, out, mp] = process.argv.slice(2);
  console.log(run(+n, +seed, +sec, out, mp ? +mp : 8));
}
