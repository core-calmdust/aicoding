// Tsume (詰将棋) solver / verifier for the composed collection (node; uses ../../engine.js rules).
// Conventions (same as the app, see index.html "tsume v2"):
//   • attacker = side to move (sente), every attacker move is a check; the defender holds every remaining piece
//   • futile interpositions (無駄合): a defender drop on a square that no defender piece (king included) attacks
//     is not a defence — a check that can only be met by such drops is mate
//   • uchifuzume is illegal (engine lastMoveLegal)
// verify(sfen, n) checks what the collection promises: mate in exactly n, a unique attacker move at every
// attacker turn of the main line (the last one included), the defender playing its longest defence, and the
// attacker's hand empty at the end (no 駒余り). It returns the main line in USI.
// usage: const S = require('./solve.js'); S.verify(sfen, n) -> { ok, why, sol, info }
'use strict';
const E = require('../../engine.js');
const { BLACK, WHITE, OU, FU, isDrop, mTo, mFrom, typeOf, colorOf } = E;

class Solver {
  constructor(nodeLimit = 3e6) { this.pos = new E.Position(); this.nodeLimit = nodeLimit; this.bufs = []; for (let i = 0; i < 64; i++) this.bufs.push(new Int32Array(1000)); this.reset(); }
  reset() { this.yes = new Map(); this.no = new Map(); this.ayes = new Map(); this.ano = new Map(); this.nodes = 0; }
  key() { return this.pos.hl + ':' + this.pos.hh; }
  // legal checking moves of the attacker (non-promotions included)
  checks(ply) {
    const pos = this.pos, list = this.bufs[ply], n = pos.gen(list, 2), out = [];
    for (let i = 0; i < n; i++) { const m = list[i]; pos.doMove(m); if (pos.lastMoveLegal(m) && pos.inCheck()) out.push(m); pos.undoMove(); }
    return out;
  }
  // legal non-futile replies of the defender (side to move, in check)
  replies(ply) {
    const pos = this.pos, list = this.bufs[ply], n = pos.gen(list, 2), out = [];
    const me = pos.side, b = pos.board;
    for (let i = 0; i < n; i++) {
      const m = list[i];
      if (isDrop(m)) continue;
      pos.doMove(m);
      if (pos.lastMoveLegal(m)) out.push(m);
      pos.undoMove();
    }
    // interposition drops: only between the king and a single distant checker, and only on defended squares
    const k = pos.king[me], cs = pos.attackers(k, me ^ 1);
    if (cs.length === 1) {
      const c = cs[0], kr = (k / 9) | 0, kc = k % 9, cr = (c / 9) | 0, cc = c % 9;
      const dr = Math.sign(cr - kr), dc = Math.sign(cc - kc);
      const aligned = (cr === kr || cc === kc || Math.abs(cr - kr) === Math.abs(cc - kc));
      if (aligned && Math.max(Math.abs(cr - kr), Math.abs(cc - kc)) > 1) {
        const hb = me * 8;
        let pawnFiles = 0;
        if (pos.hand[hb + FU]) for (let s = 0; s < 81; s++) if (b[s] === FU + (me ? E.WF : 0)) pawnFiles |= 1 << (s % 9);
        for (let r = kr + dr, cl = kc + dc; r !== cr || cl !== cc; r += dr, cl += dc) {
          const s = r * 9 + cl;
          if (!pos.attacked(s, me)) continue;   // futile
          for (let t = 1; t <= 7; t++) {
            if (!pos.hand[hb + t]) continue;
            if (t <= E.KE && E.deadEnd(me, t, s)) continue;
            if (t === FU && (pawnFiles >> cl) & 1) continue;
            out.push((80 + t) | (s << 7));
          }
        }
      }
    }
    return out;
  }
  // attacker to move: mate within d plies?
  or(d, ply) {
    if (d < 1) return false;
    if (++this.nodes > this.nodeLimit) throw 'limit';
    const k = this.key();
    const y = this.yes.get(k); if (y !== undefined && y <= d) return true;
    const nn = this.no.get(k); if (nn !== undefined && nn >= d) return false;
    const pos = this.pos;
    for (const m of this.checks(ply)) {
      pos.doMove(m);
      const ok = this.and(d - 1, ply + 1);
      pos.undoMove();
      if (ok) { this.yes.set(k, d); return true; }
    }
    this.no.set(k, d);
    return false;
  }
  // defender to move (in check): mated within d plies whatever it plays?
  and(d, ply) {
    const k = this.key();
    const y = this.ayes.get(k); if (y !== undefined && y <= d) return true;
    const nn = this.ano.get(k); if (nn !== undefined && nn >= d) return false;
    const pos = this.pos, rs = this.replies(ply);
    if (!rs.length) { this.ayes.set(k, 0); return true; }
    if (d < 2) { this.ano.set(k, d); return false; }
    for (const m of rs) {
      pos.doMove(m);
      const ok = this.or(d - 1, ply + 1);
      pos.undoMove();
      if (!ok) { this.ano.set(k, d); return false; }
    }
    this.ayes.set(k, d);
    return true;
  }
  // shortest mate (odd plies) <= max for the attacker to move, 0 = none
  mateLen(max, ply = 0) { for (let d = 1; d <= max; d += 2) if (this.or(d, ply)) return d; return 0; }
  // defender to move: length of the longest defence (plies until mate) given it is mated within max, else -1
  defLen(max, ply = 0) {
    if (!this.replies(ply).length) return 0;
    for (let d = 2; d <= max; d += 2) if (this.and(d, ply)) return d;
    return -1;
  }
}

function handEmpty(pos, c = BLACK) { for (let t = 1; t <= 7; t++) if (pos.hand[c * 8 + t]) return false; return true; }

// full verification of a composed problem; returns { ok, why, sol, info }
function verify(sfen, n, opt = {}) {
  const S = new Solver(opt.nodeLimit || 4e6), pos = S.pos;
  pos.setSfen(sfen);
  if (pos.side !== BLACK) return { ok: false, why: 'side' };
  if (pos.king[BLACK] >= 0) return { ok: false, why: 'attacker king' };
  if (pos.king[WHITE] < 0) return { ok: false, why: 'no king' };
  if (pos.inCheck(WHITE)) return { ok: false, why: 'already check' };
  try {
    if (n > 1 && S.mateLen(n - 2)) return { ok: false, why: 'shorter' };
    if (!S.or(n, 0)) return { ok: false, why: 'no mate' };
    const sol = [], info = { checks: [], replies: [], nodes: 0 };
    let why = '';
    // walk the main line; defender ties (equal longest replies) are tried in order: non-drop first, the stored line first
    const walk = (r, ply) => {
      const cs = S.checks(ply), good = [];
      for (const m of cs) { pos.doMove(m); if (S.and(r - 1, ply + 1)) good.push(m); pos.undoMove(); if (good.length > 1) break; }
      if (good.length !== 1) { why = (good.length ? 'cook@' : 'lost@') + ply; return false; }
      const m = good[0]; pos.doMove(m); sol.push(m); info.checks[ply] = cs.length;
      const rs = S.replies(ply + 1);
      info.replies[ply] = rs.length;
      if (!rs.length) { if (r === 1 && handEmpty(pos)) return true; why = r === 1 ? 'leftover' : 'early'; pos.undoMove(); sol.pop(); return false; }
      const cand = [];
      for (const x of rs) {
        pos.doMove(x); const L = S.mateLen(r - 2, ply + 2); pos.undoMove();
        if (!L) { why = 'escape@' + ply; pos.undoMove(); sol.pop(); return false; }
        cand.push({ x, L });
      }
      const bl = Math.max(...cand.map(c => c.L));
      if (bl !== r - 2) { why = 'short@' + ply; pos.undoMove(); sol.pop(); return false; }
      const want = opt.line && opt.line[ply + 1];
      const ties = cand.filter(c => c.L === bl).sort((a, b) => ((pos.toUsi(b.x) === want) - (pos.toUsi(a.x) === want)) || (isDrop(a.x) - isDrop(b.x)));
      for (const c of ties.slice(0, 4)) {
        pos.doMove(c.x); sol.push(c.x);
        if (walk(r - 2, ply + 2)) return true;
        pos.undoMove(); sol.pop();
      }
      pos.undoMove(); sol.pop(); return false;
    };
    if (!walk(n, 0)) return { ok: false, why };
    if (sol.length !== n) { unwind(pos, sol.length); return { ok: false, why: 'len ' + sol.length }; }
    if (!handEmpty(pos)) { unwind(pos, sol.length); return { ok: false, why: 'leftover' }; }
    info.nodes = S.nodes;
    const usi = [];
    unwind(pos, sol.length);
    for (const m of sol) { usi.push(pos.toUsi(m)); pos.doMove(m); }
    return { ok: true, sol: usi, info };
  } catch (e) {
    if (e !== 'limit') throw e;
    return { ok: false, why: 'limit' };
  }
}
function unwind(pos, k) { for (let i = 0; i < k; i++) pos.undoMove(); }

module.exports = { Solver, verify, handEmpty, E };

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tsume.json'), 'utf8'));
  const only = process.argv[2];
  let ok = 0, bad = 0, same = 0; const t0 = Date.now();
  for (const g of D.sets) {
    if (!g.problems[0].u || (only && g.id !== only)) continue;
    for (const p of g.problems) {
      const t1 = Date.now();
      const r = verify(p.sfen, p.n, { line: p.sol });
      const dt = Date.now() - t1;
      if (r.ok) { ok++; if (r.sol.join() === p.sol.join()) same++; else console.log('diffline', g.id, p.id, r.sol.join(' '), '|', p.sol.join(' ')); }
      else { bad++; console.log('FAIL', g.id, p.id, p.n, r.why, dt + 'ms'); }
      if (dt > 3000) console.log('slow', g.id, p.id, p.n, dt + 'ms');
    }
  }
  console.log({ ok, bad, same, sec: (Date.now() - t0) / 1000 });
}
