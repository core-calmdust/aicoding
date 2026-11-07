/* =====================================================================
   Ludo & Pachisi engine — one game, two rule sets, 2–4 players.
   Works as a plain <script> (window.LudoEngine), as a Node module and inside a Worker.

   Seats 0..3 sit round the board (0 bottom, 1 right, 2 top, 3 left on screen). Every seat has 4 pieces.
   A piece's progress p: -1 = not entered (yard / Charkoni), 0..LAST-1 = on its path, LAST = finished (home).

   LUDO (the modern international game, Ludo-King-like defaults)
     · a shared track of 52 squares, each seat starts 13 further on (seat s enters on track square 13·s);
       p 0..50 = track, p 51..55 = the seat's own home column, p 56 = home.
     · one die. A 6 brings a piece out of the yard onto its start square. A 6 throws again; the third 6 in a row ends the turn.
     · landing on a lone enemy piece sends it back to its yard and earns another throw; so does bringing a piece home.
     · safe squares: the four start squares and the four stars (8 on from each start) — pieces there can't be captured.
     · option `blocks`: two pieces of one colour on a track square form a block nobody else may pass or land on.
       Without blocks, landing on two enemy pieces of one colour is not allowed either (they protect each other).
     · the exact number is needed to bring a piece home. If any move is possible, a move must be made.
   PACHISI (India; cloth cross board, six cowrie shells, partners)
     · a cross of 4 arms × 3 columns × 8 squares round the Charkoni. A piece enters on the first square of its own
       arm's middle column, goes down it, anticlockwise round the outside of all four arms, and back up its own
       middle column into the Charkoni: 84 steps (p 0..82 on the board, p 83 = home). The castle at the end of the
       third arm is exactly 25 from home.
     · cowries: mouths up 0→25, 1→10, 2..6→2..6. 25, 10 and 6 are graces: throw again, and a grace may bring a
       piece in (onto its first square) instead of moving. The first piece a seat brings in may enter on any throw.
     · 12 castles (each arm's end square and the 4th square from the end of both outer columns): nobody is captured
       there, and a piece may not stop on a castle held by the other side.
     · a grace may instead move one piece a single step (no throw is 1, so a piece one short of home needs it).
     · landing elsewhere on enemy pieces captures all of them (back to the Charkoni) and earns another throw.
       Partners' pieces share squares. Exact number to go home. A player may decline to move (pass).
     · 2 players: one plays yellow+black (seats 0+2), the other red+green (1+3); 4 players: partners sit opposite.
       A side wins when all 8 of its pieces are home.
   ===================================================================== */
(function (root) {
  'use strict';
  const RULES = {
    ludo: { id: 'ludo', last: 56, track: 52, dice: 'd6', seatsFor: { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] }, teams: false },
    pachisi: { id: 'pachisi', last: 83, dice: 'cowrie6', seatsFor: { 2: [0, 1, 2, 3], 4: [0, 1, 2, 3] }, teams: true },
  };
  const N_PC = 4;

  /* ---------- throws ---------- */
  // Each throw: { v: value, p: probability, again: throw again, grace: may bring a piece in (pachisi) }
  const D6 = [1, 2, 3, 4, 5, 6].map(v => ({ v, p: 1 / 6, again: v === 6, grace: v === 6, face: v }));
  const COWRIE_V = [25, 10, 2, 3, 4, 5, 6];
  const binom = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - i + 1) / i; return r; };
  const COWRIE = COWRIE_V.map((v, up) => ({ v, p: binom(6, up) / 64, again: up === 0 || up === 1 || up === 6, grace: up === 0 || up === 1 || up === 6, face: up }));
  const throwsOf = rule => (rule === 'pachisi' ? COWRIE : D6);
  function rollThrow(rule, rng = Math.random) {
    if (rule === 'pachisi') { let up = 0; const shells = []; for (let i = 0; i < 6; i++) { const m = rng() < .5; shells.push(m); if (m) up++; } return Object.assign({ shells }, COWRIE[up]); }
    const v = 1 + Math.floor(rng() * 6); return Object.assign({}, D6[v - 1]);
  }

  /* ---------- squares ---------- */
  // LUDO: track squares 0..51; home column 100 + 10·seat + (p − 51); home 200 + seat.
  const LUDO_SAFE = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
  // PACHISI cells: arm·100 + col·10 + row (col 0 = A: outward lane, 1 = M: middle, 2 = B: inward lane; row 1 = next to the Charkoni … 8 = the end).
  // The loop round the board: arm a — B lane inward (rows 8→1), on to arm a+1 — A lane outward (1→8), its end (M8), its B lane inward …
  function pachisiCell(seat, p) {
    const q = p + 1;   // 1-based step on the path
    if (q <= 7) return seat * 100 + 10 + q;                         // down the own middle lane
    if (q === 8) return seat * 100 + 18;                           // the own arm's end (castle)
    if (q <= 16) return seat * 100 + 20 + (17 - q);                // own B lane inward 8→1
    if (q <= 67) { const k = Math.floor((q - 17) / 17), a = (seat + 1 + k) % 4, j = (q - 17) % 17;   // the three other arms
      return j < 8 ? a * 100 + (j + 1) : j === 8 ? a * 100 + 18 : a * 100 + 20 + (8 - (j - 9)); }
    if (q <= 75) return seat * 100 + (q - 67);                     // own A lane outward 1→8
    if (q === 76) return seat * 100 + 18;                          // own end again
    if (q <= 83) return seat * 100 + 10 + (84 - q);                // back up the middle lane 7→1
    return 999;                                                    // the Charkoni (home)
  }
  const PACHISI_CASTLE = new Set(); for (let a = 0; a < 4; a++) { PACHISI_CASTLE.add(a * 100 + 18); PACHISI_CASTLE.add(a * 100 + 5); PACHISI_CASTLE.add(a * 100 + 25); }
  function cellOf(rule, seat, p) {
    if (p < 0) return -1;
    if (rule === 'pachisi') return p >= RULES.pachisi.last ? 999 : pachisiCell(seat, p);
    if (p >= RULES.ludo.last) return 200 + seat;
    if (p >= 51) return 100 + seat * 10 + (p - 51);
    return (seat * 13 + p) % 52;
  }
  const isSafe = (rule, cell) => rule === 'pachisi' ? PACHISI_CASTLE.has(cell) : LUDO_SAFE.has(cell);
  const sharedCell = (rule, cell) => rule === 'pachisi' ? cell >= 0 && cell !== 999 && !(cell % 100 >= 11 && cell % 100 <= 17) : cell >= 0 && cell < 52;   // squares other sides can reach

  /* ---------- state ---------- */
  // opts: { rule, players: 2..4, first: seat (default 0), blocks, threeSixes, firstFree }
  function newGame(opts = {}) {
    const rule = opts.rule === 'pachisi' ? 'pachisi' : 'ludo', R = RULES[rule];
    let players = Math.max(2, Math.min(4, opts.players | 0 || 2)); if (rule === 'pachisi' && players === 3) players = 4;
    const seats = R.seatsFor[players].slice();
    // ctrl[seat] = the player (0..players-1) who plays that seat; team[seat] = side id (pachisi partners share one)
    const ctrl = [-1, -1, -1, -1], team = [-1, -1, -1, -1];
    if (rule === 'pachisi') { for (let s = 0; s < 4; s++) { ctrl[s] = players === 2 ? s % 2 : s; team[s] = s % 2; } }
    else seats.forEach((s, i) => { ctrl[s] = i; team[s] = s; });
    const pos = [0, 1, 2, 3].map(s => seats.includes(s) ? [-1, -1, -1, -1] : null);
    return {
      rule, players, seats, ctrl, team, pos,
      opt: { blocks: !!opts.blocks, threeSixes: opts.threeSixes !== false, firstFree: rule === 'pachisi' && opts.firstFree !== false },
      entered: [0, 0, 0, 0],         // pieces each seat has ever brought in (pachisi: the first one enters on any throw)
      turn: seats.includes(opts.first) ? opts.first : seats[0],
      streak: 0,                     // throws in a row this turn that earned another throw (ludo: sixes)
      over: false, winner: -1,       // winner = team id
      ply: 0,
    };
  }
  const clone = s => ({ ...s, seats: s.seats.slice(), ctrl: s.ctrl.slice(), team: s.team.slice(), pos: s.pos.map(a => a && a.slice()), opt: { ...s.opt }, entered: s.entered.slice() });
  const lastOf = s => RULES[s.rule].last;
  const nextSeat = (s, seat) => { const L = s.seats; return L[(L.indexOf(seat) + 1) % L.length]; };

  // pieces of other sides on a cell: [{seat, k}]
  function enemiesAt(s, cell, team) {
    const out = [];
    for (const seat of s.seats) { if (s.team[seat] === team) continue; s.pos[seat].forEach((p, k) => { if (p >= 0 && cellOf(s.rule, seat, p) === cell) out.push({ seat, k }); }); }
    return out;
  }
  function blockAt(s, cell, mySeat) {   // ludo: a block of another seat (2+ pieces of one colour) on this track square
    if (s.rule !== 'ludo' || cell < 0 || cell >= 52) return false;
    for (const seat of s.seats) { if (seat === mySeat) continue; let n = 0; for (const p of s.pos[seat]) if (p >= 0 && p < 51 && cellOf('ludo', seat, p) === cell) n++; if (n >= 2) return true; }
    return false;
  }

  /* ---------- moves ---------- */
  // A move: { k: piece index, from, to, enter: bool, cap: [{seat,k}], home: bool } or { pass: true }
  function legalMoves(s, t) {
    if (s.over) return [];
    const seat = s.turn, R = RULES[s.rule], LAST = R.last, out = [];
    if (s.rule === 'ludo' && s.opt.threeSixes && t.v === 6 && s.streak >= 2) return [{ pass: true, forfeit: true }];
    const team = s.team[seat], P = s.pos[seat];
    let enteredYard = false;
    for (let k = 0; k < N_PC; k++) {
      const p = P[k];
      if (p >= LAST) continue;
      if (p < 0) {
        if (enteredYard) continue;   // all pieces at home base are alike: offer one entry
        const may = s.rule === 'ludo' ? t.v === 6 : (t.grace || (s.opt.firstFree && s.entered[seat] === 0));
        if (!may) continue;
        const cell = cellOf(s.rule, seat, 0);
        const en = enemiesAt(s, cell, team);
        if (s.rule === 'ludo' && blockAt(s, cell, seat)) continue;
        if (s.rule === 'pachisi' && en.length && isSafe(s.rule, cell)) continue;
        // the start square is safe in ludo: enemies there stay
        out.push({ k, from: -1, to: 0, enter: true, cap: isSafe(s.rule, cell) ? [] : en, home: false });
        enteredYard = true; continue;
      }
      for (const step of (s.rule === 'pachisi' && t.grace ? [t.v, 1] : [t.v])) {
      const to = p + step;
      if (to > LAST) continue;
      if (s.rule === 'ludo' && s.opt.blocks) {   // can't pass or land on a block
        let bad = false; for (let q = p + 1; q <= Math.min(to, 50); q++) if (blockAt(s, cellOf('ludo', seat, q), seat)) { bad = true; break; }
        if (bad) continue;
      }

      const cell = cellOf(s.rule, seat, to);
      let cap = [];
      if (to < LAST) {
        const en = enemiesAt(s, cell, team);
        if (en.length) {
          if (isSafe(s.rule, cell)) { if (s.rule === 'pachisi') continue; }   // pachisi: a castle held by the other side is closed; ludo: share the safe square
          else if (s.rule === 'ludo') {
            const same = en.filter(e => e.seat === en[0].seat).length;
            if (s.opt.blocks ? false : same >= 2 && en.every(e => e.seat === en[0].seat)) continue;   // a pair protects itself
            cap = en;
          } else cap = en;
        }
      }
      out.push({ k, from: p, to, enter: false, cap, home: to === LAST, one: step !== t.v });
      }
    }
    if (s.rule === 'pachisi' || !out.length) out.push({ pass: true });
    return out;
  }
  // apply a move for throw t. Returns { state, again } — the state's turn already moved on unless again.
  function apply(s0, m, t) {
    const s = clone(s0), seat = s.turn, LAST = lastOf(s);
    let again = false;
    if (m && !m.pass) {
      if (m.enter) { s.pos[seat][m.k] = 0; s.entered[seat]++; }
      else s.pos[seat][m.k] = m.to;
      for (const c of m.cap || []) s.pos[c.seat][c.k] = -1;
      if (m.cap && m.cap.length) again = true;
      if (m.home && s.rule === 'ludo') again = true;
    }
    if (t.again && !(m && m.forfeit)) again = true;
    s.ply++;
    // win: every piece of a side home
    const teamDone = tm => s.seats.filter(x => s.team[x] === tm).every(x => s.pos[x].every(p => p >= LAST));
    if (teamDone(s.team[seat])) { s.over = true; s.winner = s.team[seat]; return { state: s, again: false }; }
    if (m && m.forfeit) again = false;
    if (again) s.streak++;
    else { s.streak = 0; s.turn = nextSeat(s, seat); }
    return { state: s, again };
  }

  /* ---------- evaluation (for the AI and the coach) ---------- */
  // Distance of an enemy piece behind a cell along that enemy's path: returns the throws (values) that would bring it there.
  function threatProb(s, seat, p) {   // the chance that some enemy piece can hit (seat, p) on its next throw
    const rule = s.rule, cell = cellOf(rule, seat, p);
    if (cell < 0 || isSafe(rule, cell)) return 0;
    if (rule === 'ludo' && (p >= 51)) return 0;
    if (rule === 'pachisi' && cell % 100 >= 11 && cell % 100 <= 17) return 0;   // own middle lane: private
    const T = throwsOf(rule), team = s.team[seat];
    let miss = 1;
    for (const e of s.seats) {
      if (s.team[e] === team) continue;
      const need = new Set();
      s.pos[e].forEach(q => {
        if (q < 0) { if (cellOf(rule, e, 0) === cell) need.add('enter'); return; }
        if (q >= lastOf(s)) return;
        for (const t of T) if (q + t.v < lastOf(s) && cellOf(rule, e, q + t.v) === cell) need.add(t.v);
      });
      if (!need.size) continue;
      let ph = 0; for (const t of T) if (need.has(t.v) || (need.has('enter') && (rule === 'ludo' ? t.v === 6 : t.grace))) ph += t.p;
      miss *= 1 - Math.min(1, ph * (rule === 'ludo' ? 1.15 : 1.1));   // (+ a little for follow-up throws)
    }
    return 1 - miss;
  }
  // value of a seat's pieces (bigger = better for that seat), about 1 point per step
  function seatValue(s, seat) {
    const LAST = lastOf(s), rule = s.rule; let v = 0;
    const yardCost = rule === 'ludo' ? 14 : 10;
    for (const p of s.pos[seat]) {
      if (p < 0) { v -= yardCost; continue; }
      if (p >= LAST) { v += LAST + 18; continue; }
      v += p;
      if (rule === 'ludo' && p >= 51) v += 8;                                   // the home column: safe for good
      if (rule === 'pachisi' && p >= 75) v += 6;
      if (rule === 'pachisi' && p === LAST - 1) v -= 8;   // one short of home: only a grace's single step brings it in
      const cell = cellOf(rule, seat, p);
      if (isSafe(rule, cell)) v += 2;
      v -= threatProb(s, seat, p) * (p + yardCost) * .9;                       // what a capture would cost
    }
    return v;
  }
  // from the side to move's team view: own team − strongest other side (ludo) / the other team (pachisi)
  function evaluate(s, team) {
    if (s.over) return s.winner === team ? 1e5 : -1e5;
    const by = {}; for (const seat of s.seats) by[s.team[seat]] = (by[s.team[seat]] || 0) + seatValue(s, seat);
    const mine = by[team] || 0; let best = -1e9, sum = 0, n = 0;
    for (const k in by) if (+k !== team) { best = Math.max(best, by[k]); sum += by[k]; n++; }
    return mine - (s.rule === 'ludo' ? .6 * best + .4 * (sum / Math.max(1, n)) : best);
  }

  /* ---------- AI ---------- */
  // level 1..20: mistakes rate (random legal move), and from 9 on a look at the next throw when the move earns one.
  const LEVELS = Array.from({ length: 20 }, (_, i) => { const l = i + 1; return { rand: Math.max(0, .62 - l * .042), noise: Math.max(0, 9 - l * .5), deep: l >= 9 }; });
  function think(s, t, level = 10, rng = Math.random) {
    const L = LEVELS[Math.max(1, Math.min(20, level)) - 1], moves = legalMoves(s, t);
    if (moves.length <= 1) return { move: moves[0] || null, scores: [] };
    const team = s.team[s.turn];
    const real = moves.filter(m => !m.pass);
    if (real.length && rng() < L.rand) return { move: real[Math.floor(rng() * real.length)], scores: [] };
    const scores = moves.map(m => {
      const r = apply(s, m, t); let v;
      if (r.again && L.deep && !r.state.over) {   // expected value of the extra throw (best reply for each throw)
        v = 0; for (const t2 of throwsOf(s.rule)) { const ms = legalMoves(r.state, t2); let b = -1e9; for (const m2 of ms) b = Math.max(b, evaluate(apply(r.state, m2, t2).state, team)); v += t2.p * b; }
      } else v = evaluate(r.state, team) + (r.again ? 6 : 0);
      if (m.pass && real.length) v -= 12;
      return v + (L.noise ? (rng() - .5) * L.noise : 0);
    });
    let bi = 0; for (let i = 1; i < scores.length; i++) if (scores[i] > scores[bi]) bi = i;
    return { move: moves[bi], scores };
  }

  /* ---------- win chance (coach / review) ---------- */
  // logistic fit of "the side to move wins" against evaluate(), from self-play at Lv.12–20 (tools/fit_wp.js, 150 games per setup)
  const WP = { ludo2: [0.0149, 0.0323], ludo3: [0.01596, -0.5117], ludo4: [0.01343, -0.8817], pachisi2: [0.0066, 0.0194], pachisi4: [0.00695, 0.0449] };
  const wpKey = s => s.rule === 'pachisi' ? 'pachisi' + (s.players === 2 ? 2 : 4) : 'ludo' + s.seats.length;
  function wpOf(s, v) { const c = WP[wpKey(s)] || WP.ludo2; if (v >= 5e4) return 1; if (v <= -5e4) return 0; return 1 / (1 + Math.exp(-(c[0] * v + c[1]))); }
  function winProb(s, team) { if (s.over) return s.winner === team ? 1 : 0; return wpOf(s, evaluate(s, team)); }
  // every legal move for throw t with its Lv.20 value and the win chance after it, best first: [{ move, v, wp, i }]
  function rank(s, t) {
    const moves = legalMoves(s, t); if (!moves.length) return [];
    if (moves.length === 1) { const r = apply(s, moves[0], t); const v = evaluate(r.state, s.team[s.turn]); return [{ move: moves[0], v, wp: wpOf(s, v), i: 0 }]; }
    const { scores } = think(s, t, 20, () => .5);
    return moves.map((m, i) => ({ move: m, v: scores[i], wp: wpOf(s, scores[i]), i })).sort((a, b) => b.v - a.v);
  }

  /* ---------- text ---------- */
  const COLORS = ['yellow', 'red', 'black', 'green'];   // pachisi pairs: 0+2 (yellow, black) vs 1+3 (red, green); ludo uses its own palette in the page
  function moveText(s, m, t) { if (!m || m.pass) return '—'; return (m.enter ? '▶' : (m.from + 1) + '→') + (m.home ? '⌂' : m.to + 1) + (m.cap && m.cap.length ? '×' : ''); }

  const API = { RULES, N_PC, D6, COWRIE, throwsOf, rollThrow, cellOf, isSafe, sharedCell, PACHISI_CASTLE, LUDO_SAFE, newGame, clone, legalMoves, apply, evaluate, seatValue, threatProb, think, LEVELS, nextSeat, lastOf, moveText, COLORS, WP, wpOf, winProb, rank };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.LudoEngine = API;
})(typeof self !== 'undefined' ? self : this);
