// "Fun" score for composed tsume (詰将棋) problems, 0–100 (node; uses tools/tsume/solve.js + engine.js).
// A problem is first required to be correct (tools/tsume/solve.js verify: mate in exactly n, unique attacker
// move at every turn, longest defence, no leftover pieces). On top of that, what makes a tsume enjoyable:
//   key   25  the first move is not the obvious one: a sacrifice, a distant drop, a non-promotion or a
//             discovered check scores; capturing a piece, a check right next to the king with a gold/silver
//             from hand ("頭金") or a first move that is (almost) the only check scores low
//   tries 15  several plausible wrong tries: forcing-looking checks (≤2 replies, or captures) that fail,
//             at the first move and along the line
//   motif 20  a rich solution: distinct tactics (sac, funari, touchi, uchifu, aigoma, aki, kwalk) and more
//             than one sacrifice in longer problems, relative to what the length allows
//   flow  15  no long tedious stretches: few attacker turns with a single check, the same piece does not just
//             keep chasing, the hardest (least obvious) move is not only the very last one
//   econ  15  economy: few pieces on the board / in hand for the length, no idle decoration pieces
//             (pieces that never move, are never captured and never touch the king's area)
//   final 10  a satisfying finish: the last move is not a capture, not a plain gold drop on the king's head,
//             the king left its starting square (n ≥ 5) and the attacker's material was spent (sacrifices)
// usage: const F = require('./fun.js'); F.funScore(sfen, sol) -> { fun, parts, tags, feat }
//        node tools/fun.js            -> score distribution of tsume.json per set
//        node tools/fun.js worst c5   -> the lowest-scoring problems of a set (stored tags count as motifs)
'use strict';
const S = require('./tsume/solve.js');
const E = S.E;
const { BLACK, WHITE, OU, FU, KY, KE, GI, KA, HI, KI, isDrop, mTo, mFrom, mPromo, typeOf, colorOf, CAN_PROMOTE, inZone } = E;

const cheb = (a, b) => Math.max(Math.abs(((a / 9) | 0) - ((b / 9) | 0)), Math.abs((a % 9) - (b % 9)));
const clamp = x => Math.max(0, Math.min(1, x));

// attacker to move: would a pawn drop in front of the king be mate, but is illegal (uchifuzume)?
function uchifuNow(pos) {
  const k = pos.king[WHITE];
  if (!pos.hand[FU] || k + 9 >= 81 || pos.board[k + 9]) return false;
  const file = k % 9; for (let r = 0; r < 9; r++) if (pos.board[r * 9 + file] === FU) return false;
  const pm = (80 + FU) | ((k + 9) << 7);
  pos.doMove(pm); const bad = !pos.lastMoveLegal(pm); pos.undoMove();
  return bad;
}
// features of the main line
function analyze(sfen, sol) {
  const sv = new S.Solver(2e6), pos = sv.pos;
  pos.setSfen(sfen);
  const n = sol.length;
  const f = { n, checks: [], tries: [], sac: 0, cap: 0, funari: 0, touchi: 0, aki: 0, aigoma: 0, kmoves: 0, uchifu: 0,
    first: {}, last: {}, pieces: 0, hand: 0, defPieces: 0, idle: 0, promoted: 0, samePiece: 0, kingMoved: false };
  // pieces
  for (let s = 0; s < 81; s++) { const p = pos.board[s]; if (!p || typeOf(p) === OU) continue; if (colorOf(p) === BLACK) f.pieces++; else f.defPieces++; if (typeOf(p) > OU) f.promoted++; }
  for (let t = 1; t <= 7; t++) f.hand += pos.hand[t];
  const k0 = pos.king[WHITE];
  // track every board piece by an id through the line
  const idAt = new Int16Array(81).fill(-1); let nid = 0; const moved = [], touched = [];
  for (let s = 0; s < 81; s++) if (pos.board[s] && typeOf(pos.board[s]) !== OU) { idAt[s] = nid; moved[nid] = false; touched[nid] = false; nid++; }
  const near = s => { const k = pos.king[WHITE]; return cheb(s, k) <= 1; };
  const markTouch = () => {
    // a piece "touches" the king's area when it stands next to the king or attacks a square next to it / the king
    const k = pos.king[WHITE];
    for (let s = 0; s < 81; s++) {
      const id = idAt[s]; if (id < 0 || touched[id]) continue;
      if (cheb(s, k) <= 1) { touched[id] = true; continue; }
      const p = pos.board[s], c = colorOf(p);
      // does the piece on s attack any square around the king? test by checking attacks with the piece alone
      for (let dr = -1; dr <= 1 && !touched[id]; dr++) for (let dc = -1; dc <= 1; dc++) {
        const r = ((k / 9) | 0) + dr, cl = (k % 9) + dc; if (r < 0 || r > 8 || cl < 0 || cl > 8) continue;
        const t = r * 9 + cl;
        if (pos.attackers(t, c).includes(s)) { touched[id] = true; break; }
      }
    }
  };
  markTouch();
  let lastPiece = -1, run = 0;
  for (let i = 0; i < n; i++) {
    const m = pos.fromUsi(sol[i]);
    const to = mTo(m), from = mFrom(m);
    if (i % 2 === 0) {
      // attacker turn: the alternatives
      const cs = sv.checks(i);
      f.checks.push(cs.length);
      let tries = 0;
      for (const c of cs) {
        if (c === m) continue;
        const cap = !isDrop(c) && pos.board[mTo(c)];
        pos.doMove(c); const rs = sv.replies(i + 1).length; pos.undoMove();
        if (cap || rs <= 2) tries++;
      }
      f.tries.push(tries);
      const kBefore = pos.king[WHITE];
      const capd = !isDrop(m) ? pos.board[to] : 0;
      const tp = isDrop(m) ? m - 80 & 127 : typeOf(pos.board[from]);
      const dt = isDrop(m) ? (from - 80) : tp;
      const canPro = !isDrop(m) && CAN_PROMOTE[typeOf(pos.board[from])] && (inZone(BLACK, from) || inZone(BLACK, to));
      const fun = canPro && !mPromo(m);
      const dist = cheb(to, kBefore);
      // uchifuzume: a pawn-drop mate that is illegal, here or one move after a natural (wrong) try
      if (uchifuNow(pos)) f.uchifu++;
      else for (const c of cs) {
        if (c === m) continue;
        pos.doMove(c);
        const rs = sv.replies(i + 1);
        let hit = false;
        for (const x of rs) { pos.doMove(x); if (uchifuNow(pos)) hit = true; pos.undoMove(); if (hit) break; }
        pos.undoMove();
        if (hit) { f.uchifu++; break; }
      }
      const pid = isDrop(m) ? -2 : idAt[from];
      if (!isDrop(m)) moved[pid] = true;
      if (capd) { f.cap++; idAt[to] >= 0 && (touched[idAt[to]] = true); }
      pos.doMove(m);
      // discovered check: a checker other than the moved piece
      // ... or after another defence of the main-line check
      if (i + 1 < n && !f.uchifu) {
        const nx = sol[i + 1];
        for (const x of sv.replies(i + 1)) { if (pos.toUsi(x) === nx) continue; pos.doMove(x); const h = uchifuNow(pos); pos.undoMove(); if (h) { f.uchifu++; break; } }
      }
      const chk = pos.attackers(pos.king[WHITE], BLACK);
      if (chk.some(s => s !== to)) f.aki++;
      const touchi = isDrop(m) && (dt === KA || dt === HI || dt === KY) && dist >= 2;
      if (touchi) f.touchi++;
      if (fun) f.funari++;
      // the piece now on `to`
      let id;
      if (isDrop(m)) { id = nid++; moved[id] = true; touched[id] = true; } else id = pid;
      if (!isDrop(m)) idAt[from] = -1;
      idAt[to] = id;
      // sacrifice: the defender captures it at once
      const next = sol[i + 1] ? pos.fromUsi(sol[i + 1]) : 0;
      const sac = next && !isDrop(next) && mTo(next) === to;
      if (sac) f.sac++;
      const mv = { drop: isDrop(m), type: dt, cap: !!capd, sac, touchi, funari: fun, aki: chk.some(s => s !== to), dist, checks: cs.length, adjDropGS: isDrop(m) && (dt === KI || dt === GI) && dist === 1 };
      if (i === 0) f.first = mv;
      if (i === n - 1) f.last = mv;
      if (id === lastPiece) { run++; if (run >= 2) f.samePiece++; } else run = 0;
      lastPiece = id;
    } else {
      // defender
      if (isDrop(m)) f.aigoma++;
      if (!isDrop(m) && typeOf(pos.board[from]) === OU) { f.kmoves++; }
      if (!isDrop(m)) { const id = idAt[from]; if (id >= 0) moved[id] = true; if (pos.board[to]) { /* captured attacker */ } idAt[from] = -1; idAt[to] = id >= 0 ? id : -1; }
      else { const id = nid++; moved[id] = true; touched[id] = true; idAt[to] = id; }
      pos.doMove(m);
    }
    markTouch();
  }
  f.kingMoved = pos.king[WHITE] !== k0;
  for (let id = 0; id < moved.length; id++) if (!moved[id] && !touched[id]) f.idle++;
  // material left on the board for the attacker at the end vs the start
  let endPieces = 0; for (let s = 0; s < 81; s++) { const p = pos.board[s]; if (p && colorOf(p) === BLACK) endPieces++; }
  f.endPieces = endPieces;
  return f;
}

function tagsOf(f) {
  const t = [];
  if (f.sac) t.push('sac');
  if (f.funari) t.push('funari');
  if (f.touchi) t.push('touchi');
  if (f.uchifu) t.push('uchifu');
  if (f.aigoma) t.push('aigoma');
  if (f.aki) t.push('aki');
  if (f.kmoves >= 4) t.push('kwalk');
  return t;
}

// extraTags: motifs known from elsewhere (the stored tags of an existing problem) are counted too
function funScore(sfen, sol, extraTags) {
  const f = analyze(sfen, sol), n = f.n, K = Math.ceil(n / 2);
  const tags = extraTags ? [...new Set([...tagsOf(f), ...extraTags])] : tagsOf(f);
  // key move
  const a = f.first;
  let key = 0.35;
  if (a.sac) key += 0.4;
  if (a.touchi) key += 0.3;
  if (a.funari) key += 0.3;
  if (a.aki) key += 0.2;
  if (!a.drop && !a.cap && a.dist >= 2) key += 0.1;   // quiet move from a distance
  if (a.cap) key -= 0.35;
  if (a.adjDropGS && !a.sac) key -= 0.25;
  if (a.checks <= 1) key -= 0.5; else if (a.checks <= 3) key -= 0.2;
  key = clamp(key);
  // plausible tries
  const t0 = f.tries[0] || 0, tAvg = f.tries.reduce((x, y) => x + y, 0) / K;
  const tries = clamp(0.6 * Math.min(1, t0 / 5) + 0.4 * Math.min(1, tAvg / 3));
  // motifs
  const kinds = tags.length, target = Math.min(3, 1 + n / 6);
  const motif = clamp(0.75 * Math.min(1, kinds / target) + 0.25 * Math.min(1, f.sac / Math.max(1, Math.floor(K / 2))));
  // flow
  const single = f.checks.filter(c => c <= 1).length / K;
  let flow = 1 - 0.8 * single - 0.12 * f.samePiece;
  // the only non-trivial move is the last one (a tsume that is "check, check, check, then one nice move")
  const nice = mv => mv.sac || mv.touchi || mv.funari || mv.aki;
  if (n >= 5 && !nice(f.first) && f.sac + f.touchi + f.funari + f.aki <= 1) flow -= 0.25;
  flow = clamp(flow);
  // economy
  const mat = f.pieces + f.hand + f.defPieces;
  const allow = 3 + K;   // e.g. 5 pieces for a 3-move, 10 for a 13-move problem
  const econ = clamp(1 - Math.max(0, mat - allow) * 0.12 - f.idle * 0.3 - Math.max(0, f.promoted - 1) * 0.1);
  // finale
  let fin = 0.3;
  if (!f.last.cap) fin += 0.2;
  if (!(f.last.adjDropGS && !f.last.sac)) fin += 0.2;
  if (n < 5 || f.kingMoved) fin += 0.15;
  if (f.sac) fin += 0.15;
  fin = clamp(fin);
  const parts = { key, tries, motif, flow, econ, final: fin };
  const fun = Math.round(25 * key + 15 * tries + 20 * motif + 15 * flow + 15 * econ + 10 * fin);
  return { fun, parts, tags, feat: f };
}

module.exports = { funScore, analyze, tagsOf };

if (require.main === module) {
  const D = require('../tsume.json');
  const [cmd, set] = process.argv.slice(2);
  const all = [];
  for (const g of D.sets) {
    if (!g.problems[0].u) continue;
    if (set && g.id !== set) continue;
    const sc = g.problems.map(p => ({ p, r: funScore(p.sfen, p.sol, p.tags) }));
    const v = sc.map(x => x.r.fun).sort((a, b) => a - b);
    const q = k => v[Math.floor(k * (v.length - 1))];
    console.log(g.id.padEnd(9), 'n=' + v.length, 'min', v[0], 'q25', q(.25), 'med', q(.5), 'q75', q(.75), 'max', v[v.length - 1], '<70:', v.filter(x => x < 70).length, '<60:', v.filter(x => x < 60).length);
    let tagOk = 0;
    for (const x of sc) if ((x.p.tags || []).join() === x.r.tags.join()) tagOk++;
    console.log('   tag agreement', tagOk + '/' + sc.length);
    if (cmd === 'worst' || cmd === 'best') {
      sc.sort((a, b) => cmd === 'worst' ? a.r.fun - b.r.fun : b.r.fun - a.r.fun);
      for (const x of sc.slice(0, 8)) console.log('  ', x.r.fun, x.p.id, x.p.sfen, x.p.sol.join(' '), JSON.stringify(x.r.parts, (k, v) => typeof v === 'number' ? +v.toFixed(2) : v), x.r.tags.join(','), '| stored', (x.p.tags || []).join(','));
    }
    if (cmd === 'tags') for (const x of sc) if ((x.p.tags || []).join() !== x.r.tags.join()) console.log('  ', x.p.id, x.p.sol.join(' '), 'mine', x.r.tags.join(','), 'stored', x.p.tags.join(','), 'km', x.r.feat.kmoves);
  }
}
