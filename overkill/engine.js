/* わからせ将棋オーバーキル！ — rules and AI (claude/overkill-spec.md). Runs on the page and in a Web Worker (the AI).
   Board: 81 squares, sq = r * 9 + c, r 0 = the AI's back rank (top), r 8 = the player's (bottom). Side 0 = the player (先手, moves up), 1 = the AI.
   A piece: { t: type, s: side, p: promoted (standard pieces), m: has moved (chess pawn), rdy: ply from which its ability is ready, used: once-only ability spent }.
   Special pieces vanish when captured (they never go to a hand). The AI has only standard pieces; the search knows every special piece and ability. */
(function (G) {
  'use strict';
  const STD = ['FU', 'KY', 'KE', 'GI', 'KI', 'KA', 'HI', 'OU'];
  const HANDS = ['HI', 'KA', 'KI', 'GI', 'KE', 'KY', 'FU'];
  const ORTH = [[0, 1], [0, -1], [1, 0], [-1, 0]], DIAG = [[1, 1], [-1, 1], [1, -1], [-1, -1]], ALL8 = ORTH.concat(DIAG);
  const KN8 = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const GOLD = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [0, -1]], SILVER = [[-1, 1], [0, 1], [1, 1], [-1, -1], [1, -1]];
  // movement in forward coordinates (x right, y forward): step = one square, slide = ride, jump = leap
  const MOVES = {
    FU: { step: [[0, 1]] }, KY: { slide: [[0, 1]] }, KE: { jump: [[-1, 2], [1, 2]] }, GI: { step: SILVER }, KI: { step: GOLD },
    KA: { slide: DIAG }, HI: { slide: ORTH }, OU: { step: ALL8 },
    TO: { step: GOLD }, NY: { step: GOLD }, NK: { step: GOLD }, NG: { step: GOLD }, UM: { slide: DIAG, step: ORTH }, RY: { slide: ORTH, step: DIAG },
    PAWN: {}, KNIGHT: { jump: KN8 }, BISHOP: { slide: DIAG }, ROOK: { slide: ORTH }, QUEEN: { slide: ALL8 }, AMAZON: { slide: ALL8, jump: KN8 },
    CANNON: {}, LION: {}, ARCHER: { step: SILVER }, MUSKET: { step: [[0, 1]] }, MERC: { step: GOLD }, BARRIER: { step: SILVER }, BOMBER: { step: [[0, 1]] },
    ALCH: { step: SILVER }, SAGE: { step: GOLD }, CHRONO: { step: ALL8 }, KAGE: { step: ALL8 }, GENERAL: { step: ALL8 },
  };
  const PROMO = { FU: 'TO', KY: 'NY', KE: 'NK', GI: 'NG', KA: 'UM', HI: 'RY' };
  const UNPROMO = { TO: 'FU', NY: 'KY', NK: 'KE', NG: 'GI', UM: 'KA', RY: 'HI' };
  const SPECIALS = ['PAWN', 'KNIGHT', 'BISHOP', 'ROOK', 'QUEEN', 'AMAZON', 'CANNON', 'LION', 'ARCHER', 'MUSKET', 'MERC', 'BARRIER', 'BOMBER', 'ALCH', 'SAGE', 'CHRONO', 'KAGE', 'GENERAL'];
  // the deck cost (spec §2 §4: 歩1・香3・桂4・銀5・金6・角8・飛10, the specials as listed)
  const COST = { FU: 1, KY: 3, KE: 4, GI: 5, KI: 6, KA: 8, HI: 10, OU: 0,
    PAWN: 2, KNIGHT: 6, BISHOP: 7, ROOK: 8, QUEEN: 15, AMAZON: 22, CANNON: 7, LION: 18, ARCHER: 10, MUSKET: 5, MERC: 7, BARRIER: 8, BOMBER: 7, ALCH: 9, SAGE: 12, CHRONO: 15, KAGE: 20, GENERAL: 99 };
  // the AI's values (centipawns)
  const VAL = { FU: 100, KY: 330, KE: 400, GI: 560, KI: 620, KA: 860, HI: 1000, OU: 0, TO: 620, NY: 600, NK: 600, NG: 600, UM: 1180, RY: 1380,
    PAWN: 150, KNIGHT: 620, BISHOP: 820, ROOK: 960, QUEEN: 1750, AMAZON: 2350, CANNON: 720, LION: 1900, ARCHER: 900, MUSKET: 380, MERC: 620, BARRIER: 640, BOMBER: 420, ALCH: 640, SAGE: 820, CHRONO: 640, KAGE: 2600, GENERAL: 640 };
  const ROYAL = t => t === 'OU' || t === 'KAGE';
  const isStd = t => STD.includes(t) || !!UNPROMO[t];
  const COOL = { ALCH: 6, SAGE: 5 };   // own moves between uses

  const inb = (r, c) => r >= 0 && r < 9 && c >= 0 && c < 9;
  const camp = (side, r) => side === 0 ? r <= 2 : r >= 6;
  const fwd = side => side === 0 ? -1 : 1;
  function dead(t, side, r) {   // a piece that could never move again
    const rr = side === 0 ? r : 8 - r;
    if (t === 'FU' || t === 'KY' || t === 'MUSKET' || t === 'BOMBER') return rr === 0;
    if (t === 'KE') return rr <= 1;
    return false;
  }

  /* ---------- the position ---------- */
  function initial() {
    const b = new Array(81).fill(null);
    const back = ['KY', 'KE', 'GI', 'KI', 'OU', 'KI', 'GI', 'KE', 'KY'];
    for (let c = 0; c < 9; c++) { b[c] = { t: back[c], s: 1 }; b[72 + c] = { t: back[c], s: 0 }; b[18 + c] = { t: 'FU', s: 1 }; b[54 + c] = { t: 'FU', s: 0 }; }
    b[10] = { t: 'HI', s: 1 }; b[16] = { t: 'KA', s: 1 }; b[64] = { t: 'KA', s: 0 }; b[70] = { t: 'HI', s: 0 };
    return b;
  }
  function newGame(deckBoard) {   // deckBoard: the player's 27 squares (rows 6..8) or null for the initial
    const b = initial();
    if (deckBoard) for (let r = 6; r < 9; r++) for (let c = 0; c < 9; c++) { const p = deckBoard[r * 9 + c]; b[r * 9 + c] = p ? { t: p.t, s: 0 } : null; }
    return { b, hand: [{}, {}], side: 0, ply: 0, hist: [], keys: [], nuked: false };
  }
  const clonePos = P => ({ b: P.b.map(p => p && Object.assign({}, p)), hand: [Object.assign({}, P.hand[0]), Object.assign({}, P.hand[1])], side: P.side, ply: P.ply, hist: P.hist.slice(), keys: P.keys.slice(), nuked: P.nuked });

  /* ---------- the deck (spec §2): cost and checks ---------- */
  function deckCost(deckBoard) {
    // the start (cost 0) is the standard setup; each piece on the player's 27 squares costs its value, minus the standard pieces' total there
    let base = 0, now = 0; const ini = initial();
    for (let sq = 54; sq < 81; sq++) { if (ini[sq]) base += COST[ini[sq].t]; if (deckBoard[sq]) now += COST[deckBoard[sq].t]; }
    return now - base;
  }
  function deckProblems(deckBoard) {
    const out = []; let kings = 0;
    const fuCols = new Array(9).fill(0);
    for (let sq = 54; sq < 81; sq++) { const p = deckBoard[sq]; if (!p) continue; const r = sq / 9 | 0;
      if (p.t === 'OU') kings++;
      if (p.t === 'FU') fuCols[sq % 9]++;
      if (dead(p.t, 0, r)) out.push('dead'); }
    if (kings !== 1) out.push('king');
    if (fuCols.some(n => n > 1)) out.push('nifu');
    // no check on the AI's king at the start
    const P = newGame(deckBoard); P.side = 0;
    if (attacksRoyal(P, 0)) out.push('check');
    return [...new Set(out)];
  }

  /* ---------- moves ----------
     a move: { f: from (-1 = drop), to, t (drop type), pr: promote, k: kind ('m' move, 'd' drop, 'shoot', 'fire', 'igui', 'alch', 'revive'), x: target square (abilities) } */
  function sqOf(r, c) { return r * 9 + c; }
  function gen(P, side, onlyCaps = false) {
    const b = P.b, out = [], f = fwd(side), sg = side === 0 ? 1 : -1;
    const push = (from, to, p) => {
      const r0 = from / 9 | 0, r1 = to / 9 | 0, t = p.t;
      if (onlyCaps && !b[to]) return;
      if (PROMO[t] && (camp(side, r0) || camp(side, r1))) { out.push({ f: from, to, pr: 1, k: 'm' }); if (!dead(t, side, r1)) out.push({ f: from, to, pr: 0, k: 'm' }); }
      else if (t === 'PAWN' && camp(side, r1)) out.push({ f: from, to, pr: 1, k: 'm' });
      else out.push({ f: from, to, pr: 0, k: 'm' });
    };
    for (let sq = 0; sq < 81; sq++) {
      const p = b[sq]; if (!p || p.s !== side) continue;
      const r = sq / 9 | 0, c = sq % 9, t = p.t, M = MOVES[t] || {};
      const dest = (dx, dy) => [r + dy * f, c + dx * sg];
      if (M.step) for (const [dx, dy] of M.step) { const [rr, cc] = dest(dx, dy); if (!inb(rr, cc)) continue; const q = b[rr * 9 + cc]; if (!q || q.s !== side) push(sq, rr * 9 + cc, p); }
      if (M.jump) for (const [dx, dy] of M.jump) { const [rr, cc] = dest(dx, dy); if (!inb(rr, cc)) continue; const q = b[rr * 9 + cc]; if (!q || q.s !== side) push(sq, rr * 9 + cc, p); }
      if (M.slide) for (const [dx, dy] of M.slide) { let [rr, cc] = dest(dx, dy); while (inb(rr, cc)) { const q = b[rr * 9 + cc]; if (q) { if (q.s !== side) push(sq, rr * 9 + cc, p); break; } if (!onlyCaps) push(sq, rr * 9 + cc, p); rr += dy * f; cc += dx * sg; } }
      if (t === 'PAWN') {   // chess pawn: forward to empty (two from the start), captures diagonally forward
        const r1 = r + f; if (inb(r1, c) && !b[r1 * 9 + c] && !onlyCaps) { push(sq, r1 * 9 + c, p); const r2 = r + 2 * f; if (!p.m && inb(r2, c) && !b[r2 * 9 + c]) push(sq, r2 * 9 + c, p); }
        for (const dc of [-1, 1]) if (inb(r1, c + dc)) { const q = b[r1 * 9 + c + dc]; if (q && q.s !== side) push(sq, r1 * 9 + c + dc, p); }
      }
      if (t === 'CANNON') for (const [dx, dy] of ORTH) {   // moves as a rook, captures by leaping exactly one piece
        let rr = r + dy, cc = c + dx, screen = false;
        while (inb(rr, cc)) { const q = b[rr * 9 + cc];
          if (!screen) { if (q) screen = true; else if (!onlyCaps) out.push({ f: sq, to: rr * 9 + cc, pr: 0, k: 'm' }); }
          else if (q) { if (q.s !== side) out.push({ f: sq, to: rr * 9 + cc, pr: 0, k: 'm' }); break; }
          rr += dy; cc += dx; }
      }
      if (t === 'LION') {   // 獅子: any square within two king steps (leaping), and 居食い (take a neighbour without moving)
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (!inb(rr, cc)) continue; const q = b[rr * 9 + cc]; if (q && q.s === side) continue; if (onlyCaps && !q) continue; out.push({ f: sq, to: rr * 9 + cc, pr: 0, k: 'm' });
          if (q && Math.max(Math.abs(dr), Math.abs(dc)) === 1) out.push({ f: sq, to: sq, x: rr * 9 + cc, pr: 0, k: 'igui' }); }
      }
      if (t === 'ARCHER') { const r1 = r + f, r2 = r + 2 * f; if (inb(r2, c) && !b[r1 * 9 + c]) { const q = b[r2 * 9 + c]; if (q && q.s !== side) out.push({ f: sq, to: sq, x: r2 * 9 + c, pr: 0, k: 'shoot' }); } }
      if (t === 'MUSKET' && !p.used) { let rr = r + f; while (inb(rr, c) && !b[rr * 9 + c]) rr += f; if (inb(rr, c)) { const q = b[rr * 9 + c]; if (q.s !== side) out.push({ f: sq, to: sq, x: rr * 9 + c, pr: 0, k: 'fire' }); } }
      if (onlyCaps) continue;
      if (t === 'ALCH' && P.ply >= (p.rdy || 0)) for (const [dx, dy] of ALL8) { const rr = r + dy, cc = c + dx; if (!inb(rr, cc)) continue; const q = b[rr * 9 + cc]; if (q && q.s === side && q.t === 'FU') out.push({ f: sq, to: sq, x: rr * 9 + cc, pr: 0, k: 'alch' }); }
      if (t === 'SAGE' && P.ply >= (p.rdy || 0)) { const opp = P.hand[1 - side];
        for (const ht of HANDS) if (opp[ht]) for (const [dx, dy] of ALL8) { const rr = r + dy, cc = c + dx; if (!inb(rr, cc) || b[rr * 9 + cc] || dead(ht, side, rr)) continue; if (ht === 'FU' && nifu(b, side, cc)) continue; out.push({ f: sq, to: rr * 9 + cc, t: ht, pr: 0, k: 'revive' }); } }
    }
    if (!onlyCaps) {   // drops
      const h = P.hand[side];
      const blocked = barrierZone(b, 1 - side);
      for (const ht of HANDS) { if (!h[ht]) continue;
        for (let sq = 0; sq < 81; sq++) { if (b[sq] || blocked[sq]) continue; const r = sq / 9 | 0; if (dead(ht, side, r)) continue; if (ht === 'FU' && nifu(b, side, sq % 9)) continue; out.push({ f: -1, to: sq, t: ht, pr: 0, k: 'd' }); } }
    }
    return out;
  }
  function nifu(b, side, c) { for (let r = 0; r < 9; r++) { const q = b[r * 9 + c]; if (q && q.s === side && q.t === 'FU') return true; } return false; }
  function barrierZone(b, side) {   // the squares round side's 結界師 (the other side may not drop there)
    const z = new Uint8Array(81);
    for (let sq = 0; sq < 81; sq++) { const p = b[sq]; if (!p || p.s !== side || p.t !== 'BARRIER') continue; const r = sq / 9 | 0, c = sq % 9; for (const [dx, dy] of ALL8) if (inb(r + dy, c + dx)) z[(r + dy) * 9 + c + dx] = 1; }
    return z;
  }

  /* ---------- make / unmake ---------- */
  function capture(P, sq, by, U) {   // a piece leaves the board by capture: standard ones go (unpromoted) to by's hand; specials vanish
    const q = P.b[sq]; if (!q) return;
    U.push(['sq', sq, q]); P.b[sq] = null;
    if (isStd(q.t) && q.t !== 'OU') { const ht = UNPROMO[q.t] || q.t; U.push(['hand', by, ht, P.hand[by][ht] || 0]); P.hand[by][ht] = (P.hand[by][ht] || 0) + 1; }
    if (q.t === 'BOMBER') explode(P, sq, U);
  }
  function explode(P, sq, U) {   // 爆弾兵: the capturer (now on sq, or none for a shot) and every non-royal piece round it are gone
    const r = sq / 9 | 0, c = sq % 9;
    const kill = s => { const q = P.b[s]; if (!q || ROYAL(q.t)) return; U.push(['sq', s, q]); P.b[s] = null; };
    U.push(['boom', sq]);
    kill(sq); for (const [dx, dy] of ALL8) if (inb(r + dy, c + dx)) kill((r + dy) * 9 + c + dx);
  }
  function make(P, m) {
    const U = [], side = P.side, b = P.b;
    U.push(['side', P.side, P.ply]);
    if (m.k === 'd') { U.push(['hand', side, m.t, P.hand[side][m.t]]); P.hand[side][m.t]--; U.push(['sq', m.to, null]); b[m.to] = { t: m.t, s: side }; }
    else if (m.k === 'revive') { const opp = 1 - side; U.push(['hand', opp, m.t, P.hand[opp][m.t]]); P.hand[opp][m.t]--; U.push(['sq', m.to, null]); b[m.to] = { t: m.t, s: side };
      const sg = b[m.f]; U.push(['sq', m.f, sg]); b[m.f] = Object.assign({}, sg, { rdy: P.ply + 2 * COOL.SAGE }); }
    else if (m.k === 'shoot' || m.k === 'fire' || m.k === 'igui') {
      const pc = b[m.f];
      capture(P, m.x, side, U);
      if (m.k === 'fire') { U.push(['sq', m.f, pc]); b[m.f] = { t: 'FU', s: side }; }
    }
    else if (m.k === 'alch') { const q = b[m.x]; U.push(['sq', m.x, q]); b[m.x] = { t: 'KI', s: side }; const al = b[m.f]; U.push(['sq', m.f, al]); b[m.f] = Object.assign({}, al, { rdy: P.ply + 2 * COOL.ALCH }); }
    else {
      const pc = b[m.f];
      if (b[m.to]) capture(P, m.to, side, U);
      U.push(['sq', m.f, pc]); b[m.f] = null;
      let np = pc;
      if (m.pr) np = { t: pc.t === 'PAWN' ? 'QUEEN' : PROMO[pc.t], s: side };
      else if (pc.t === 'PAWN' && !pc.m) np = Object.assign({}, pc, { m: 1 });
      // a 爆弾兵 captured: the capturer standing on its square is caught in the blast too
      const blown = U.some(u => u[0] === 'boom' && u[1] === m.to);
      U.push(['sq', m.to, b[m.to]]); b[m.to] = blown ? null : np;
    }
    P.side = 1 - side; P.ply++;
    return U;
  }
  function unmake(P, U) {
    for (let i = U.length - 1; i >= 0; i--) { const u = U[i];
      if (u[0] === 'sq') P.b[u[1]] = u[2];
      else if (u[0] === 'hand') { if (u[3]) P.hand[u[1]][u[2]] = u[3]; else delete P.hand[u[1]][u[2]]; }
      else if (u[0] === 'side') { P.side = u[1]; P.ply = u[2]; } }
  }

  /* ---------- royals, checks, legality ---------- */
  function royals(P, side) { const out = []; for (let sq = 0; sq < 81; sq++) { const p = P.b[sq]; if (p && p.s === side && ROYAL(p.t)) out.push(sq); } return out; }
  // can `side` capture one of the other side's royals now?
  function attacksRoyal(P, side) {
    const rs = royals(P, 1 - side); if (!rs.length) return false;
    const set = new Set(rs);
    for (const m of gen(P, side, true)) { const tgt = m.k === 'm' ? m.to : m.x; if (set.has(tgt)) return true; }
    return false;
  }
  // in check: only when the side has one royal left (spec: with 影武者, a check on one of the two is not a check)
  function inCheck(P, side) { const rs = royals(P, side); return rs.length === 1 && attacksRoyal(P, 1 - side); }
  function legal(P) {
    const side = P.side, out = [];
    for (const m of gen(P, side)) {
      const U = make(P, m);
      const rs = royals(P, side);
      const ok = rs.length > 1 || (rs.length === 1 && !attacksRoyal(P, 1 - side));
      // 打ち歩詰め: a pawn drop that mates the single king is not allowed
      let uchi = false;
      if (ok && m.k === 'd' && m.t === 'FU') { const ors = royals(P, 1 - side); if (ors.length === 1 && attacksRoyal(P, side)) { uchi = !gen(P, 1 - side).some(r => { const V = make(P, r); const rr = royals(P, 1 - side); const safe = rr.length > 1 || (rr.length === 1 && !attacksRoyal(P, side)); unmake(P, V); return safe; }); } }
      unmake(P, U);
      if (ok && !uchi) out.push(m);
    }
    return out;
  }

  /* ---------- the game state ---------- */
  function key(P) {
    let s = P.side + '|';
    for (let i = 0; i < 81; i++) { const p = P.b[i]; s += p ? (p.s ? 'b' : 'w') + p.t + (p.used ? '!' : '') : '.'; }
    return s + '|' + JSON.stringify(P.hand);
  }
  // play a move on the real game; returns { over: null | { winner: 0|1|null, why } }
  function play(P, m) {
    make(P, m); P.hist.push(m);
    const k = key(P); P.keys.push(k);
    return status(P);
  }
  function status(P) {
    for (const s of [0, 1]) if (!royals(P, s).length) return { winner: 1 - s, why: 'capture' };
    if (P.nuked) return { winner: null, why: 'nuke' };
    const k = P.keys[P.keys.length - 1];
    if (k && P.keys.filter(x => x === k).length >= 4) return { winner: null, why: 'repetition' };
    if (P.ply >= 400) return { winner: null, why: 'length' };
    if (!legal(P).length) return { winner: 1 - P.side, why: 'mate' };
    return null;
  }

  /* ---------- the AI: negamax αβ, quiescence, king capture, iterative deepening ---------- */
  const PST_ADV = [0, 0, 6, 10, 14, 20, 26, 30, 30];   // advancement bonus for pawns / small pieces (rows from own side)
  function evaluate(P) {
    const b = P.b; let sc = 0;
    const kpos = [royals(P, 0), royals(P, 1)];
    for (let sq = 0; sq < 81; sq++) {
      const p = b[sq]; if (!p) continue; const r = sq / 9 | 0, c = sq % 9, adv = p.s === 0 ? 8 - r : r;
      let v = VAL[p.t] || 0;
      if (p.t === 'FU' || p.t === 'PAWN') v += PST_ADV[adv];
      else if (p.t === 'GI' || p.t === 'KI' || p.t === 'KE' || p.t === 'TO') v += PST_ADV[adv] >> 1;
      if (!ROYAL(p.t)) { const ek = kpos[1 - p.s]; if (ek.length) { const d = Math.min(...ek.map(k => Math.max(Math.abs((k / 9 | 0) - r), Math.abs(k % 9 - c)))); v += (8 - d) * (VAL[p.t] > 500 ? 6 : 3); }
        const fk = kpos[p.s]; if (fk.length && (p.t === 'KI' || p.t === 'GI')) { const d = Math.min(...fk.map(k => Math.max(Math.abs((k / 9 | 0) - r), Math.abs(k % 9 - c)))); if (d <= 2) v += 30; } }
      sc += p.s === 0 ? v : -v;
    }
    for (const s of [0, 1]) for (const ht in P.hand[s]) sc += (s === 0 ? 1 : -1) * (VAL[ht] * 1.12) * P.hand[s][ht];
    return P.side === 0 ? sc : -sc;
  }
  const WIN = 100000;
  function search(P, opts) {
    const deadline = Date.now() + (opts.ms || 1000), maxD = opts.depth || 20, noise = opts.noise || 0;
    let nodes = 0, stop = false;
    const killers = [];
    const order = (ms, ply) => {
      const b = P.b;
      for (const m of ms) { let s = 0; const tgt = m.k === 'm' ? m.to : m.x;
        if (tgt != null && m.k !== 'revive' && b[tgt]) { const v = VAL[b[tgt].t] || 0; s = (ROYAL(b[tgt].t) ? 1e6 : 10000 + v * 10) - (m.f >= 0 ? VAL[b[m.f].t] || 0 : 0) / 10; }
        if (m.pr) s += 800;
        if (killers[ply] && killers[ply].f === m.f && killers[ply].to === m.to) s += 5000;
        m._s = s; }
      ms.sort((a, b) => b._s - a._s);
      return ms;
    };
    function qs(alpha, beta, d) {
      if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true;
      if (!royals(P, P.side).length) return -WIN;
      const stand = evaluate(P); if (stand >= beta) return stand; if (stand > alpha) alpha = stand;
      if (d > 6) return stand;
      for (const m of order(gen(P, P.side, true), 40 + d)) {
        const U = make(P, m); const v = -qs(-beta, -alpha, d + 1); unmake(P, U);
        if (stop) return alpha;
        if (v >= beta) return v; if (v > alpha) alpha = v;
      }
      return alpha;
    }
    function ab(depth, alpha, beta, ply) {
      if ((++nodes & 1023) === 0 && Date.now() > deadline) stop = true;
      if (!royals(P, P.side).length) return -WIN + ply;
      if (depth <= 0) return qs(alpha, beta, 0);
      const ms = order(gen(P, P.side), ply);
      if (!ms.length) return -WIN + ply;
      let best = -Infinity;
      for (const m of ms) {
        const U = make(P, m); const v = -ab(depth - 1, -beta, -alpha, ply + 1); unmake(P, U);
        if (stop) return best === -Infinity ? 0 : best;
        if (v > best) best = v;
        if (v > alpha) alpha = v;
        if (alpha >= beta) { if (!P.b[m.to] || m.k !== 'm') killers[ply] = m; break; }
      }
      return best;
    }
    // the root: only legal moves
    let root = legal(P); if (!root.length) return null;
    if (root.length === 1) return { move: root[0], score: 0, depth: 0, nodes };
    let bestMove = root[0], bestScore = -Infinity, depthDone = 0;
    for (let d = 1; d <= maxD; d++) {
      let alpha = -Infinity, cur = null, curScore = -Infinity;
      root = order(root, 0); if (bestMove) { root = [bestMove].concat(root.filter(m => m !== bestMove)); }
      for (const m of root) {
        const U = make(P, m); let v = -ab(d - 1, -Infinity, -alpha, 1); unmake(P, U);
        if (stop) break;
        if (noise) v += (Math.random() - .5) * noise;
        if (v > curScore) { curScore = v; cur = m; } if (v > alpha) alpha = v;
      }
      if (stop && !cur) break;
      if (cur) { bestMove = cur; bestScore = curScore; depthDone = d; }
      if (stop || Math.abs(bestScore) > WIN - 100 || Date.now() > deadline) break;
    }
    return { move: bestMove, score: bestScore, depth: depthDone, nodes };
  }
  // Lv.1 … Lv.20 (spec §6): thinking time, depth cap and noise
  function level(lv) {
    lv = Math.max(1, Math.min(20, lv | 0));
    return { ms: 150 + lv * 120, depth: lv <= 2 ? 1 : lv <= 5 ? 2 : lv <= 9 ? 3 : lv <= 14 ? 4 : 20, noise: Math.max(0, 900 - lv * 60) };
  }

  const API = { STD, SPECIALS, HANDS, MOVES, PROMO, UNPROMO, COST, VAL, ROYAL, isStd, initial, newGame, clonePos, deckCost, deckProblems, gen, legal, make, unmake, play, status, inCheck, royals, search, level, dead, barrierZone, key };
  G.OverkillEngine = API;
  // as a Web Worker: { pos, lv } → { move }
  if (typeof document === 'undefined' && typeof self !== 'undefined' && typeof postMessage === 'function') {
    self.onmessage = e => { const { pos, lv, id } = e.data; const P = pos; const r = search(P, level(lv)); postMessage({ id, move: r && r.move, score: r && r.score, depth: r && r.depth, nodes: r && r.nodes }); };
  }
})(typeof self !== 'undefined' ? self : this);
