// "Fun" score for chess puzzles (0–100): a puzzle must be correct AND enjoyable to solve.
// Works for both kinds in puzzles.json:  mate in N  { fen, answer }  (level.n = N)   and   tactics  { fen, line, th, r }
// (lichess format: line[0] is the opponent's move, then you play line[1], line[3], …).
// Engines: engine.js (full rules + exhaustive mate proof search, as the page's mate checker) and the page's
// WebAssembly search with NNUE (tools/wasm.js, node-limited = deterministic), as the page's tactics checker.
//
// Parts (weight) — each 0..1:
//   unique  (25)  one clear solution: mate puzzles — exactly one first move mates within N (else a "cook"), no mate in
//                 fewer moves, few duals later; tactics — every move you play is clearly better than the 2nd best
//                 (win-chance gap), the first move counting most.
//   key     (20)  the first move is not obvious: quiet move or sacrifice = 1, promotion .6, check / fair trade ≈ .5,
//                 grabbing an undefended piece .2; a quiet move later in the line adds a bonus.
//   tries   (15)  several plausible first tries (other checks / captures, enough legal moves); penalised when one of
//                 your moves is the only legal move, and for pure "check, check, check" mates.
//   theme   (10)  a real motif is needed (sacrifice, deflection, quiet move, clearance, interference, double check,
//                 smothered mate, zugzwang …), not just a hanging piece.
//   natural (10)  natural-looking position: no crushing material surplus before the puzzle, no lone king, no extra queens.
//   finale  (10)  a satisfying end: mate, or a decisive (not marginal) advantage after the line.
//   pop     (10)  human votes when known (lichess "Popularity" −100..100, passed as meta.pop); left out when unknown
//                 (the other weights are renormalised).
// Also returns ok = verified with the engines (answer mates in N / every move of the line is the engine's choice or an
// equally fast mate, all moves legal).
// usage: const { funScore } = require('./fun.js');  funScore(P, { n, pop }) → { fun, ok, parts, info }
//        node fun.js [meta.json]   → score distribution of ../puzzles.json (meta: { "L-j": { pop } } from lichess)
'use strict';
const E = require('../engine.js');
const W = require('./wasm.js');
const VAL = [0, 1, 3, 3, 5, 9, 0];
const NODES = 1e5;
const clamp = x => Math.max(0, Math.min(1, x));
const wc = v => Math.abs(v) > E.MATET ? Math.sign(v) : 2 / (1 + Math.exp(-0.004 * v)) - 1;   // win chance −1..1
const isMate = v => Math.abs(v) > E.MATET;

function material(pos, c) { let s = 0; for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = pos.b[q]; if (p && ((p >> 3) & 1) === c) s += VAL[p & 7]; } return s; }
function counts(pos, c) { const n = [0, 0, 0, 0, 0, 0, 0]; for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = pos.b[q]; if (p && ((p >> 3) & 1) === c) n[p & 7]++; } return n; }
const intsOf = (fen, ucis) => { const p = E.Pos.fromFEN(fen), out = []; for (const u of ucis) { const m = p.fromUci(u); out.push(m); p.make(m); } return out; };
const posOf = (fen, ucis) => { const p = E.Pos.fromFEN(fen); for (const u of ucis) { const m = p.fromUci(u); if (!m) throw new Error('illegal ' + u); p.make(m); } return p; };

// first-move character: { check, capture, capVal, free, sac, promo, quiet }
function moveInfo(pos, m) {
  const me = pos.side, to = E.mTo(m), from = E.mFrom(m), mover = pos.b[from] & 7;
  const cap = pos.b[to] ? pos.b[to] & 7 : (E.mFlag(m) & 2 ? 1 : 0);
  const capDefended = cap && pos.attacked(to, me ^ 1);
  pos.make(m);
  const check = pos.inCheck();
  const promo = E.mPromo(m);
  const mv = promo ? promo : mover;
  // the moved piece can be taken at a loss (simple exchange test)
  const att = pos.attacked(to, me ^ 1), def = pos.attacked(to, me);
  const sac = mv !== 6 && att && (VAL[mv] - VAL[cap] >= 2 && (!def || VAL[mv] > VAL[cap] + 1) || !def && VAL[mv] >= 3 && VAL[mv] > VAL[cap]);
  pos.unmake(m);
  return { check, capture: !!cap, capVal: VAL[cap], free: !!cap && (!capDefended || VAL[cap] > VAL[mover]), sac, promo: !!promo, quiet: !check && !cap && !promo };
}

// full solution line from the solver's position: mate puzzles get the defence from the engine
function solution(P, n) {
  if (P.line) return { fen: posOf(P.fen, [P.line[0]]).fen(), plies: P.line.slice(1), kind: 'line' };
  const plies = [P.answer];
  for (let k = 1; k < 2 * n - 1; k++) {
    const pos = posOf(P.fen, plies); if (!pos.legal().length) break;
    const r = W.analyze(P.fen, plies, NODES); if (!r.length) break;
    plies.push(r[0].uci);
  }
  // trim after mate
  for (let k = 0; k < plies.length; k++) { const p = posOf(P.fen, plies.slice(0, k + 1)); if (!p.legal().length) { plies.length = k + 1; break; } }
  return { fen: P.fen, plies, kind: 'mate' };
}

function funScore(P, opt) {
  opt = opt || {};
  const n = opt.n || (P.line ? P.line.length >> 1 : 1);
  const info = {};
  let S;
  try { S = solution(P, n); } catch (e) { return { fun: 0, ok: false, parts: {}, info: { err: String(e.message) } }; }
  const fen = S.fen, plies = S.plies, my = plies.filter((_, k) => !(k & 1));
  const p0 = E.Pos.fromFEN(fen), me = p0.side;
  let ok = true;

  // ---- unique + verification
  let unique;
  if (S.kind === 'mate') {
    const r = E.mate(fen, [], n, false, 3e7);
    if (!r) return { fun: 0, ok: false, parts: {}, info: { err: 'mate search aborted' } };
    const mates = r.filter(x => x.need > 0), key = mates.find(x => p0.uci(x.m) === P.answer);
    if (!key || key.need > n) ok = false;
    const short = key && key.need < n, minNeed = mates.length ? Math.min(...mates.map(x => x.need)) : 0;
    let u0 = mates.length === 1 ? 1 : mates.length === 2 ? .35 : 0;
    if (short || minNeed < n) u0 *= .4;
    // duals on the way (not counting the final mate-in-1)
    let duals = 0, mids = 0;
    for (let k = 2; k < plies.length - 1; k += 2) {
      const rem = n - (k >> 1); if (rem < 2) break;
      const r2 = E.mate(fen, intsOf(fen, plies.slice(0, k)), rem, false, 1e7); if (!r2) continue;
      mids++; if (r2.filter(x => x.need > 0).length > 1) duals++;
    }
    unique = u0 * (1 - .5 * (mids ? duals / mids : 0));
    info.mates = mates.length; info.short = !!short;
    const last = posOf(fen, plies); if (last.legal().length || !last.inCheck()) ok = false;
  } else {
    let first = 0, rest = [], k = 0;
    for (let i = 0; i < plies.length; i += 2, k++) {
      const r = W.analyze(fen, plies.slice(0, i), NODES);
      const mine = r.find(x => x.uci === plies[i]); if (!mine) { ok = false; break; }
      const best = r[0], other = r.find(x => x.uci !== plies[i]);
      // sound: the line move is the engine's best, or an equally fast mate, or (last move) within 0.3 win-chance
      if (mine.uci !== best.uci && !(isMate(best.v) && mine.v === best.v) && wc(best.v) - wc(mine.v) > .12) ok = false;
      let g;
      if (!other) g = 0;   // only legal move
      else if (isMate(mine.v) && isMate(other.v) && other.v > 0) g = i === plies.length - 1 ? 1 : (mine.v > other.v ? .6 : .2);
      else g = clamp((wc(mine.v) - wc(other.v)) / .6);
      if (k === 0) first = g; else rest.push(g);
    }
    unique = rest.length ? .6 * first + .4 * rest.reduce((a, b) => a + b, 0) / rest.length : first;
  }

  // ---- key move + sacrifices along the line
  const kpos = E.Pos.fromFEN(fen), km = kpos.fromUci(my[0]);
  if (!km) return { fun: 0, ok: false, parts: {}, info: { err: 'illegal key' } };
  const ki = moveInfo(kpos, km);
  const bal0 = material(p0, me) - material(p0, me ^ 1);
  let sacLine = false, quietLater = false;
  for (let i = 1; i < plies.length; i++) {
    const p = posOf(fen, plies.slice(0, i + 1));
    if (i & 1) { if (material(p, me) - material(p, me ^ 1) <= bal0 - 2) sacLine = true; }
    if (!(i & 1) && i >= 2) { const q = posOf(fen, plies.slice(0, i)); const m = q.fromUci(plies[i]); if (m && moveInfo(q, m).quiet) quietLater = true; }
  }
  const sac = ki.sac || sacLine;
  let key = ki.quiet ? 1 : ki.promo ? .6 : ki.capture ? (ki.free ? .2 : .5) : ki.check ? .45 : .5;
  if (ki.check && ki.capture) key = ki.free ? .15 : .35;
  if (S.kind === 'mate' && n === 1) key = ki.capture ? (ki.free ? .3 : .55) : ki.promo ? .75 : .7;   // mate in 1: every key is a check
  if (sac) key = Math.max(key, ki.check ? .85 : 1);
  if (quietLater) key = Math.min(1, key + .2);
  info.keyMove = ki; info.sac = sac;

  // ---- tries / forcedness
  const legal = p0.legal(); let checks = 0, caps = 0;
  for (const m of legal) { if (m === km) continue; const mi = moveInfo(p0, m); if (mi.check) checks++; else if (mi.capture) caps++; }
  let tries = .55 * clamp((checks + caps) / 4) + .45 * clamp((legal.length - 3) / 22);
  let onlyMove = false, allChecks = true;
  for (let i = 0; i < plies.length; i += 2) {
    const q = posOf(fen, plies.slice(0, i)); const L = q.legal(); if (L.length === 1) onlyMove = true;
    const m = q.fromUci(plies[i]); if (m && !moveInfo(q, m).check) allChecks = false;
  }
  if (legal.length === 1) tries = 0; else if (onlyMove) tries *= .5;
  if (allChecks && my.length >= 2) tries *= .75;

  // ---- theme
  let theme;
  const final = posOf(fen, plies), mated = !final.legal().length && final.inCheck();
  if (S.kind === 'line' && P.th) {
    const G = { sacrifice: .5, quietMove: .5, deflection: .45, attraction: .45, clearance: .5, interference: .55, intermezzo: .45, zugzwang: .55, xRayAttack: .4, doubleCheck: .45, smotheredMate: .55, discoveredAttack: .35, capturingDefender: .35, trappedPiece: .35, skewer: .3, fork: .3, pin: .3, backRankMate: .3, defensiveMove: .35, exposedKing: .15, promotion: .25 };
    const th = P.th.filter(x => G[x]);
    theme = .2 + th.reduce((a, x) => a + G[x], 0) + (sac ? .2 : 0);
    if (P.th.includes('hangingPiece') && th.length === 0) theme = .1;
  } else {
    // mate puzzles: motif from the solution itself
    let dbl = false, smother = false, minor = false;
    if (mated) {
      const lastFrom = posOf(fen, plies.slice(0, -1)), lm = lastFrom.fromUci(plies[plies.length - 1]), lp = lastFrom.b[E.mFrom(lm)] & 7;
      minor = lp === 1 || lp === 2 || lp === 3;
      // double check: two attackers of the king
      const ks = final.ksq[final.side]; let att = 0;
      for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = final.b[q]; if (!p || ((p >> 3) & 1) === final.side) continue; const t = final.b[ks]; final.b[q] = 0; const still = final.attacked(ks, final.side ^ 1); final.b[q] = p; if (!still) att++; void t; }
      dbl = att >= 2;
      if (lp === 2) { smother = true; for (const d of [1, -1, 16, -16, 17, 15, -15, -17]) { const s = ks + d; if (s & 0x88) continue; const p = final.b[s]; if (!p || ((p >> 3) & 1) !== final.side) smother = false; } }
    }
    theme = .25 + (sac ? .4 : 0) + (ki.quiet || quietLater ? .3 : 0) + (dbl ? .25 : 0) + (smother ? .35 : 0) + (minor ? .1 : 0);
  }
  theme = clamp(theme);

  // ---- natural position / economy
  const opp = counts(p0, me ^ 1), mine = counts(p0, me);
  const surplus = bal0;
  let natural = surplus >= 10 ? .15 : surplus >= 6 ? .45 : surplus >= 3.5 ? .75 : 1;
  if (opp.slice(1, 6).every(x => !x)) natural *= .25;           // lone king
  if (mine[5] >= 2 || opp[5] >= 2) natural *= .6;              // extra queens
  const pieces = [...mine, ...opp].reduce((a, b) => a + b, 0);
  if (pieces <= 4) natural *= .7;

  // ---- finale
  let finale;
  if (mated) finale = 1;
  else {
    const r = final.legal().length ? W.analyze(fen, plies, NODES) : [];
    let v = r.length ? r[0].v : 0;
    if (plies.length & 1) v = -v;                                      // value for the solver (opponent to move after an odd count)
    finale = isMate(v) ? (v > 0 ? 1 : 0) : clamp((v - 150) / 450);
    info.finalEval = v;
  }

  const parts = { unique, key, tries, theme, natural, finale };
  const w = { unique: 25, key: 20, tries: 15, theme: 10, natural: 10, finale: 10 };
  if (opt.pop != null) { parts.pop = clamp((opt.pop - 70) / 28); w.pop = 10; }
  let s = 0, t = 0; for (const k in w) { s += w[k] * parts[k]; t += w[k]; }
  let fun = Math.round(100 * s / t);
  if (!ok) fun = 0;
  return { fun, ok, parts, info };
}

module.exports = { funScore, solution, moveInfo, VAL };

if (require.main === module) {
  const fs = require('fs'), path = require('path');
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'puzzles.json'), 'utf8'));
  const meta = process.argv[2] && process.argv[2] !== '-' ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : {};
  const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;   // optional level filter
  const all = [];
  D.levels.forEach((L, i) => (only && !only.includes(i) ? [] : L.puzzles).forEach((P, j) => {
    const m = meta[`${i}-${j}`] || {};
    const f = funScore(P, { n: L.n, pop: m.pop });
    all.push({ i, j, fun: f.fun, ok: f.ok });
    console.log(`${i}-${j}\t${f.fun}\t${f.ok ? '' : 'UNSOUND'}\t${Object.entries(f.parts).map(([k, v]) => k + '=' + v.toFixed(2)).join(' ')}`);
  }));
  const by = {}; for (const x of all) (by[x.i] = by[x.i] || []).push(x.fun);
  for (const i in by) { const a = by[i].sort((x, y) => x - y); console.error(`level ${i}: n=${a.length} min=${a[0]} med=${a[a.length >> 1]} max=${a[a.length - 1]} <70: ${a.filter(x => x < 70).length}`); }
}
