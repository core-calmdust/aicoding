/* =====================================================================
   Carrom — rules, physics and AI (shared by the 3D table play atlas/games/carrom.js, the rules tour
   atlas/rules/carrom.js and the AI worker carrom/worker.js). No DOM.
   Units: centimetres on the playing surface (ICF laws): 74 × 74, origin in the middle, x to the right,
   y towards player 0 (white, the near side). Player 1 (black) plays from the far side (y < 0).
   Rules: the ICF laws of carrom, singles (see claude/carrom-spec.md for the few simplifications).
   ===================================================================== */
(function (root) {
  'use strict';
  const H = 37,                 // half the playing surface (74 cm)
    RM = 1.59, RS = 2.065,      // carrom man (3.18 cm), striker (4.13 cm)
    MM = 5.5, MS = 15,          // grams
    RP = 2.225,                 // pocket (4.45 cm)
    PC = H - RP,                // pocket centre (touching both cushions)
    BY = H - 10.15 - 3.18 / 2,  // the striker's centre on the base lines (touches both lines): 25.26
    BX = 47 / 2 - 3.18 / 2,     // the base circles' centres (the striker covers a whole circle at most): 21.91
    OUT = 8.5,                  // outer circle (17 cm)
    CC = 1.59;                  // centre circle (3.18 cm)
  const DECEL = 92,             // cm/s² sliding friction on a powdered board
    VMAX = 540,                 // cm/s, a full flick
    E_MM = .93, E_CUSH = .74, T_CUSH = .96,
    DT = 1 / 480, TMAX = 14, FPS = 60;
  const POCKETS = [[-PC, -PC], [PC, -PC], [-PC, PC], [PC, PC]];
  const DIM = { H, RM, RS, MM, MS, RP, PC, BY, BX, OUT, CC, VMAX, POCKETS, LINE: 3.18, LINE_IN: 10.15, BASE_LEN: 47 };

  /* ---------- the opening arrangement: the queen in the centre, a ring of six (alternating), a ring of twelve
     where three whites carry on the inner whites' lines (the "Y") and the gaps alternate black, white, black ---------- */
  function layout() {
    const d = RM * 2 + .02, out = [{ c: 'q', x: 0, y: 0 }];
    const rad = a => a * Math.PI / 180;
    // inner ring at 30 + 60k°, whites at 90, 210, 330 (the Y points at the breaker, player 0 below)
    for (let k = 0; k < 6; k++) { const a = 30 + 60 * k; out.push({ c: [90, 210, 330].includes(a) ? 'w' : 'b', x: Math.cos(rad(a)) * d, y: Math.sin(rad(a)) * d }); }
    for (let k = 0; k < 12; k++) {
      const a = 30 * k, far = a % 60 === 30, r = far ? 2 * d : Math.sqrt(3) * d;
      let c;
      if ([90, 210, 330].includes(a)) c = 'w';           // the Y
      else if (far) c = 'w';                              // the gap's middle (2d, outward of an inner black)
      else c = 'b';
      out.push({ c, x: Math.cos(rad(a)) * r, y: Math.sin(rad(a)) * r });
    }
    return out.map((p, i) => ({ id: i, c: p.c, x: +p.x.toFixed(4), y: +p.y.toFixed(4), on: true }));
  }

  function newBoard(o) {
    o = o || {};
    return {
      pcs: layout(), turn: o.first || 0, breaker: o.first || 0,
      col: (o.first || 0) === 0 ? ['w', 'b'] : ['b', 'w'],   // the breaker plays white
      pk: { w: 0, b: 0 },            // men pocketed (and kept) by colour
      due: [0, 0],                   // penalty men owed, placed as soon as the player has one pocketed
      queen: { st: 'board', by: -1 },// board | pend (pocketed, to be covered) | cov
      brk: { done: false, tries: 0 },
      over: false, winner: -1, points: 0, strokes: 0, score: o.score ? o.score.slice() : [0, 0],
    };
  }
  const clone = s => JSON.parse(JSON.stringify(s));
  const colOf = (s, p) => s.col[p];
  const other = c => c === 'w' ? 'b' : 'w';
  const baseY = p => p === 0 ? BY : -BY;
  const onBoard = (s, c) => s.pcs.filter(p => p.on && (!c || p.c === c));

  /* ---------- striker placement: on the base lines between the base circles, never on top of a man ---------- */
  function strikerFree(s, p, x) {
    const y = baseY(p);
    for (const m of s.pcs) if (m.on && Math.hypot(m.x - x, m.y - y) < RS + RM + .05) return false;
    return Math.abs(x) <= BX + 1e-6;
  }
  function nearestFree(s, p, x) {
    x = Math.max(-BX, Math.min(BX, x));
    if (strikerFree(s, p, x)) return x;
    for (let d = .1; d <= 2 * BX; d += .1) { if (strikerFree(s, p, x + d)) return x + d; if (strikerFree(s, p, x - d)) return x - d; }
    return x;
  }

  /* ---------- physics: discs sliding on the board with friction, elastic-ish knocks, cushions, pockets ---------- */
  // shot = { x (striker on the base line), ang (radians, 0 = +x, π/2 = +y), v (cm/s) }
  function simulate(s, p, shot, opt) {
    opt = opt || {};
    const pcs = s.pcs, N = pcs.length + 1, S = N - 1;
    const X = new Float64Array(N), Y = new Float64Array(N), VX = new Float64Array(N), VY = new Float64Array(N), R = new Float64Array(N), M = new Float64Array(N), ON = new Uint8Array(N);
    for (let i = 0; i < pcs.length; i++) { X[i] = pcs[i].x; Y[i] = pcs[i].y; R[i] = RM; M[i] = MM; ON[i] = pcs[i].on ? 1 : 0; }
    X[S] = shot.x; Y[S] = baseY(p); R[S] = RS; M[S] = MS; ON[S] = 1;
    const v = Math.max(0, Math.min(VMAX, shot.v));
    VX[S] = Math.cos(shot.ang) * v; VY[S] = Math.sin(shot.ang) * v;
    const pocketed = [], events = [], frames = opt.frames ? [] : null;
    let firstHit = -1, t = 0, nextF = 0, strikerIn = false, touched = false;
    const snap = () => { const f = new Float32Array(N * 3); for (let i = 0; i < N; i++) { f[i * 3] = X[i]; f[i * 3 + 1] = Y[i]; f[i * 3 + 2] = ON[i]; } frames.push(f); };
    if (frames) snap();
    const moving = new Uint8Array(N); moving[S] = 1;
    let anyMoving = true;
    while (anyMoving && t < TMAX) {
      t += DT; anyMoving = false;
      for (let i = 0; i < N; i++) {
        if (!ON[i]) continue;
        const sp = Math.hypot(VX[i], VY[i]);
        if (sp <= 0) { moving[i] = 0; continue; }
        const ns = sp - DECEL * DT;
        if (ns <= .35) { VX[i] = VY[i] = 0; moving[i] = 0; continue; }
        const k = ns / sp; VX[i] *= k; VY[i] *= k;
        X[i] += VX[i] * DT; Y[i] += VY[i] * DT; moving[i] = 1; anyMoving = true;
        // pockets
        for (let q = 0; q < 4; q++) {
          const dx = X[i] - POCKETS[q][0], dy = Y[i] - POCKETS[q][1];
          if (dx * dx + dy * dy < RP * RP) {
            ON[i] = 0; moving[i] = 0; VX[i] = VY[i] = 0;
            if (i === S) strikerIn = true; else pocketed.push({ id: i, q, t });
            events.push({ t, k: 'pocket', i, q });
            break;
          }
        }
        if (!ON[i]) continue;
        // cushions
        const r = R[i];
        if (X[i] > H - r) { X[i] = H - r; if (VX[i] > 0) { events.push({ t, k: 'cush', v: VX[i], i }); VX[i] = -VX[i] * E_CUSH; VY[i] *= T_CUSH; } }
        else if (X[i] < -H + r) { X[i] = -H + r; if (VX[i] < 0) { events.push({ t, k: 'cush', v: -VX[i], i }); VX[i] = -VX[i] * E_CUSH; VY[i] *= T_CUSH; } }
        if (Y[i] > H - r) { Y[i] = H - r; if (VY[i] > 0) { events.push({ t, k: 'cush', v: VY[i], i }); VY[i] = -VY[i] * E_CUSH; VX[i] *= T_CUSH; } }
        else if (Y[i] < -H + r) { Y[i] = -H + r; if (VY[i] < 0) { events.push({ t, k: 'cush', v: -VY[i], i }); VY[i] = -VY[i] * E_CUSH; VX[i] *= T_CUSH; } }
      }
      // knocks: every pair with a mover
      for (let i = 0; i < N; i++) {
        if (!ON[i] || !moving[i]) continue;
        for (let j = 0; j < N; j++) {
          if (j === i || !ON[j] || (moving[j] && j < i)) continue;
          const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = R[i] + R[j], d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const rv = (VX[i] - VX[j]) * nx + (VY[i] - VY[j]) * ny;
          // separate (by mass)
          const ov = rr - d, wi = M[j] / (M[i] + M[j]), wj = M[i] / (M[i] + M[j]);
          X[i] -= nx * ov * wi; Y[i] -= ny * ov * wi; X[j] += nx * ov * wj; Y[j] += ny * ov * wj;
          if (rv <= 0) continue;
          const jm = (1 + E_MM) * rv / (1 / M[i] + 1 / M[j]);
          VX[i] -= jm / M[i] * nx; VY[i] -= jm / M[i] * ny; VX[j] += jm / M[j] * nx; VY[j] += jm / M[j] * ny;
          moving[j] = 1; anyMoving = true;
          if (i === S || j === S) { touched = true; if (firstHit < 0) firstHit = i === S ? j : i; }
          events.push({ t, k: 'hit', v: rv, a: i, b: j });
        }
      }
      if (frames && t >= nextF) { snap(); nextF += 1 / FPS; }
    }
    if (frames) snap();
    const fin = []; for (let i = 0; i < S; i++) fin.push({ x: X[i], y: Y[i], on: !!ON[i] });
    return { fin, striker: { x: X[S], y: Y[S], on: !!ON[S] }, pocketed, strikerIn, firstHit, touched, events, frames, dur: t };
  }

  /* ---------- placing a man back (queen in the centre, dues round it inside the outer circle, off the centre circle) ---------- */
  function freeAt(s, x, y, skip) { for (const m of s.pcs) if (m.on && m !== skip && Math.hypot(m.x - x, m.y - y) < RM * 2 + .03) return false; return true; }
  function placeBack(s, m, queen) {
    if (queen && freeAt(s, 0, 0, m)) { m.x = 0; m.y = 0; m.on = true; return; }
    const r0 = queen ? 0 : CC + RM + .02;
    for (let r = Math.max(r0, .5); r <= 30; r += .45) {
      const n = Math.max(6, Math.round(2 * Math.PI * r / .9));
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r * .37, x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (r > OUT - RM && r < OUT + 6 && !queen) { /* outside the outer circle: only if nothing is free inside */ }
        if (freeAt(s, x, y, m)) { m.x = +x.toFixed(4); m.y = +y.toFixed(4); m.on = true; return; }
      }
    }
    m.x = 0; m.y = 0; m.on = true;
  }

  /* ---------- the stroke's result by the laws ---------- */
  // returns { s: the new state, again: same player strikes again, msg: [codes], foul, ended }
  function resolve(s0, sim) {
    const s = clone(s0), p = s.turn, me = colOf(s, p), op = other(me), msg = [];
    s.strokes++;
    const ids = sim.pocketed.map(e => e.id);
    // the break: the striker has to touch a man (three tries, then the opponent breaks)
    if (!s.brk.done) {
      if (!sim.touched) {
        s.brk.tries++;
        s.pcs.forEach((m, i) => { m.x = sim.fin[i].x; m.y = sim.fin[i].y; });
        if (s.brk.tries >= 3) { s.brk.tries = 0; s.turn = 1 - p; s.breaker = s.turn; msg.push('brk.pass'); return { s, again: false, msg, foul: false }; }
        msg.push('brk.miss'); return { s, again: true, msg, foul: false };
      }
      s.brk.done = true;
    }
    s.pcs.forEach((m, i) => { m.x = sim.fin[i].x; m.y = sim.fin[i].y; m.on = sim.fin[i].on; });
    const own = ids.filter(i => s.pcs[i].c === me), opp = ids.filter(i => s.pcs[i].c === op), qIn = ids.some(i => s.pcs[i].c === 'q');
    const qPend = s.queen.st === 'pend' && s.queen.by === p;
    const ownBefore = s0.pk[me];
    s.pk[me] += own.length; s.pk[op] += opp.length;
    let again = false, due = 0, foul = false;
    const qm = s.pcs.find(m => m.c === 'q');
    const queenBack = code => { s.queen = { st: 'board', by: -1 }; placeBack(s, qm, true); if (code) msg.push(code); };
    const backOwn = ids2 => ids2.forEach(i => { s.pk[me]--; placeBack(s, s.pcs[i]); });
    if (sim.strikerIn) {
      foul = true; due++; msg.push('foul.striker');
      if (own.length) { backOwn(own); msg.push('foul.back'); again = true; }
      if (qIn || qPend) queenBack(qPend && !qIn ? 'q.fail' : 'q.back');
    } else {
      if (qIn) {
        if (ownBefore === 0 && own.length === 0) queenBack('q.early');
        else if (s0.due[p] > 0) queenBack('q.due');
        else if (own.length) { s.queen = { st: 'cov', by: p }; msg.push('q.cov'); }
        else { s.queen = { st: 'pend', by: p }; msg.push('q.pend'); again = true; }
      } else if (qPend) {
        if (own.length) { s.queen = { st: 'cov', by: p }; msg.push('q.cov'); }
        else queenBack('q.fail');
      }
      if (own.length) { again = true; if (!msg.length) msg.push('own'); }
      else if (opp.length && !qIn) msg.push('opp');
    }
    // the last men: pocketing your own last man before the queen is covered, or the opponent's last man
    if (!s.over && s.pk[me] >= 9 && s.queen.st !== 'cov') {
      const last = own.length ? own[own.length - 1] : s.pcs.findIndex(m => m.c === me && !m.on);
      if (last >= 0) { backOwn([last]); due++; foul = true; again = false; msg.push('foul.last'); }
    }
    if (s.pk[op] >= 9) {
      if (s.queen.st === 'cov') { s.over = true; s.winner = 1 - p; msg.push('end.oppLast'); }
      else { const last = opp[opp.length - 1]; if (last != null) { s.pk[op]--; placeBack(s, s.pcs[last]); } due++; foul = true; again = false; msg.push('foul.oppLast'); }
    }
    // dues: one of your pocketed men goes back for each (owed until you have one)
    let owe = s0.due[p] + due;
    while (owe > 0 && s.pk[me] > 0) {
      const m = s.pcs.find(x => x.c === me && !x.on); if (!m) break;
      s.pk[me]--; placeBack(s, m); owe--;
    }
    s.due[p] = owe;
    if (!s.over && s.pk[me] >= 9 && s.queen.st === 'cov') { s.over = true; s.winner = p; msg.push('end.win'); }
    if (s.over) {
      const w = s.winner, wc = colOf(s, w), lc = other(wc);
      const qv = s.queen.by === w && s.score[w] < 22 ? 3 : 0;
      s.points = (9 - s.pk[lc]) + qv; s.score[w] += s.points;
      again = false;
    } else if (!again) s.turn = 1 - p;
    return { s, again, msg, foul };
  }

  // a fresh board of the same match: sides keep their colours? (ICF: the break alternates; the breaker takes white)
  function nextBoard(s) { return newBoard({ first: 1 - s.breaker, score: s.score }); }
  function matchOver(s, target) { return s.score[0] >= target || s.score[1] >= target; }

  /* ---------- AI ---------- */
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(R) { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // clear path for a disc of radius r from a to b (other discs of radius RM in the way?)
  function clear(s, ax, ay, bx, by, r, skip) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    for (const m of s.pcs) {
      if (!m.on || skip.includes(m.id)) continue;
      let k = ((m.x - ax) * dx + (m.y - ay) * dy) / L2; if (k < 0 || k > 1) continue;
      const px = ax + dx * k, py = ay + dy * k;
      if (Math.hypot(m.x - px, m.y - py) < r + RM - .05) return false;
    }
    return true;
  }
  // how easy the player's men are to pot from here (a rough count of open straight pots), for the leave
  function ease(s, c) {
    let e = 0;
    for (const m of s.pcs) {
      if (!m.on || m.c !== c) continue;
      let best = 0;
      for (const [qx, qy] of POCKETS) { const d = Math.hypot(qx - m.x, qy - m.y); if (clear(s, m.x, m.y, qx, qy, RM, [m.id])) best = Math.max(best, 1 / (1 + d / 18)); }
      e += best;
    }
    return e;
  }
  function evaluate(s0, r, p) {
    const s = r.s, me = colOf(s0, p), op = other(me);
    if (s.over) return s.winner === p ? 1000 + s.points : -1000 - s.points;
    let v = (s.pk[me] - s0.pk[me]) * 10 - (s.pk[op] - s0.pk[op]) * 8 - (s.due[p] - s0.due[p]) * 7;
    if (s.queen.st === 'cov' && s0.queen.st !== 'cov') v += s.queen.by === p ? 14 : -14;
    if (s.queen.st === 'pend' && s.queen.by === p) v += 5;
    if (r.foul) v -= 4;
    if (r.again) v += 3 + ease(s, me) * 1.4;
    else v -= ease(s, op) * 1.6;
    return v;
  }
  function shotFor(sx, sy, gx, gy) { return Math.atan2(gy - sy, gx - sx); }
  // candidate shots: straight pots (striker → ghost → man → pocket), some banked off the cushions (higher levels), and the break
  function candidates(s, p, level) {
    const me = colOf(s, p), y = baseY(p), out = [];
    if (!s.brk.done) {
      for (let x = -12; x <= 12; x += 3) for (const dx of [0, -.6, .6]) out.push({ x: nearestFree(s, p, x), ang: shotFor(x, y, dx, 0), v: VMAX * (.92 + (x % 2) * .02), kind: 'brk', pre: 1 });
      return out;
    }
    const tgts = s.pcs.filter(m => m.on && (m.c === me || (m.c === 'q' && s.pk[me] > 0 && s.due[p] === 0 && s.queen.st === 'board')));
    for (const m of tgts) {
      for (const [qx, qy] of POCKETS) {
        const dm = Math.hypot(qx - m.x, qy - m.y), ux = (qx - m.x) / dm, uy = (qy - m.y) / dm;
        if (!clear(s, m.x, m.y, qx, qy, RM, [m.id])) continue;
        const gx = m.x - ux * (RS + RM), gy = m.y - uy * (RS + RM);
        const xs = [];
        if (Math.abs(uy) > .05) { const k = (y - gy) / -uy; if (k > 0) xs.push(gx - ux * k); }
        for (let i = 0; i <= 8; i++) xs.push(-BX + i * BX / 4);
        // banks: the ghost mirrored in a side cushion (the striker comes back off it)
        const banks = level >= 8 ? [[2 * (H - RS) - gx, gy, 'R'], [-2 * (H - RS) - gx, gy, 'L']] : [];
        for (const x0 of xs) {
          if (Math.abs(x0) > BX) continue;
          const x = nearestFree(s, p, x0); if (Math.abs(x - x0) > .6) continue;
          const dx = gx - x, dy = gy - y, dd = Math.hypot(dx, dy), cs = (dx * ux + dy * uy) / dd;
          if (cs < .3) continue;
          if (!clear(s, x, y, gx, gy, RS, [m.id])) continue;
          const vm = Math.sqrt(2 * DECEL * (dm + 6)) + 22, tr = cs * (1 + E_MM) * MM / (MM + MS);
          const vs = Math.sqrt(Math.pow(vm / Math.max(.2, cs * (1 + E_MM) * MS / (MM + MS)), 2) + 2 * DECEL * dd);
          void tr;
          const pre = cs * cs / (1 + dm / 40) / (1 + dd / 60);
          for (const f of [1, 1.3, 1.7]) out.push({ x, ang: shotFor(x, y, gx, gy), v: Math.min(VMAX, vs * f), kind: m.c === 'q' ? 'q' : 'pot', pre: pre * (f === 1.3 ? 1.05 : 1) });
        }
        for (const [bx, by] of banks) {
          for (let i = 0; i <= 8; i++) {
            const x = nearestFree(s, p, -BX + i * BX / 4);
            const ang = shotFor(x, y, bx, by), v = Math.min(VMAX, Math.sqrt(2 * DECEL * (Math.hypot(bx - x, by - y) + dm + 20)) * 2.2);
            out.push({ x, ang, v, kind: 'bank', pre: .08 });
          }
        }
      }
    }
    if (!out.length) {   // nothing open: knock own men about (towards the cluster), softly
      const own = s.pcs.filter(m => m.on && m.c === me), tg = own.length ? own : s.pcs.filter(m => m.on);
      for (const m of tg.slice(0, 6)) for (const x0 of [-BX, -BX / 2, 0, BX / 2, BX]) { const x = nearestFree(s, p, x0); out.push({ x, ang: shotFor(x, y, m.x, m.y), v: VMAX * .55, kind: 'push', pre: .01 }); }
    }
    return out;
  }
  // level 1..20: how many shots are looked at, how carefully, and how well the hand obeys
  function skill(level) {
    const k = (Math.max(1, Math.min(20, level)) - 1) / 19;
    return { n: Math.round(6 + 170 * k * k + 24 * k), robust: level >= 11 ? (level >= 17 ? 5 : 3) : 0, angSd: (4.6 * Math.pow(1 - k, 1.5) + .22) * Math.PI / 180, vSd: .17 * Math.pow(1 - k, 1.3) + .025, pickTop: level <= 3 ? 4 : level <= 6 ? 2 : 1 };
  }
  function jitter(shot, sk, R) { return { x: shot.x, ang: shot.ang + gauss(R) * sk.angSd, v: Math.max(30, shot.v * (1 + gauss(R) * sk.vSd)) }; }
  // think(state, level, seed) → { x, ang, v, kind }: the shot the AI means (the hand's error is added by perform())
  function think(s, level, seed, o) {
    o = o || {};
    const p = s.turn, sk = skill(level), R = rng(seed || 1);
    let cs = candidates(s, p, level);
    cs.sort((a, b) => b.pre - a.pre);
    cs = cs.slice(0, sk.n);
    const sc = cs.map(c => { const r = resolve(s, simulate(s, p, c)); return { c, v: evaluate(s, r, p) }; });
    sc.sort((a, b) => b.v - a.v);
    if (sk.robust && sc.length) {   // the best few, again with the hand's own error: the shot that still works when slightly off
      const top = sc.slice(0, 6);
      top.forEach(e => { let t = 0; for (let k = 0; k < sk.robust; k++) { const j = jitter(e.c, { angSd: Math.max(sk.angSd, .3 * Math.PI / 180), vSd: Math.max(sk.vSd, .04) }, R); t += evaluate(s, resolve(s, simulate(s, p, j)), p); } e.rv = e.v * .4 + t / sk.robust * .6; });
      top.sort((a, b) => b.rv - a.rv);
      sc.splice(0, top.length, ...top);
    }
    const pick = sc.length ? sc[Math.floor(R() * Math.min(sk.pickTop, sc.length))] : { c: { x: 0, ang: p === 0 ? -Math.PI / 2 : Math.PI / 2, v: VMAX * .5 } };
    const c = pick.c;
    return { x: c.x, ang: c.ang, v: c.v, kind: c.kind || '', val: pick.v };
  }
  // the hand: the shot as it is really played (the level's error)
  function perform(shot, level, seed) { return jitter(shot, skill(level), rng(seed || 7)); }
  // a human flick is never quite the same twice: a small wobble in angle and strength, larger for hard shots
  function wobble(shot, seed, a0 = .5, a1 = .6, v0 = .03, v1 = .025)   // 1 s.d.: soft ±0.5° / ±3%, full ±1.1° / ±5.5% (a perfectly aimed pot drops about 4 times in 5) {
    const R = rng(seed || 11), k = Math.min(1, shot.v / VMAX), k2 = k * k;
    return { x: shot.x, ang: shot.ang + gauss(R) * (a0 + a1 * k2) * Math.PI / 180, v: Math.max(30, shot.v * (1 + gauss(R) * (v0 + v1 * k2))) };
  }

  // first contact along an aim (for the aiming guide): where the striker meets a man / the cushion
  function aimTrace(s, p, x, ang) {
    const y = baseY(p), dx = Math.cos(ang), dy = Math.sin(ang);
    let best = null;
    for (const m of s.pcs) {
      if (!m.on) continue;
      const fx = m.x - x, fy = m.y - y, b = fx * dx + fy * dy; if (b <= 0) continue;
      const c = fx * fx + fy * fy - (RS + RM) * (RS + RM), disc = b * b - c; if (disc < 0) continue;
      const k = b - Math.sqrt(disc); if (k < 0) continue;
      if (!best || k < best.k) best = { k, m };
    }
    const wall = Math.min(dx > 0 ? (H - RS - x) / dx : dx < 0 ? (-H + RS - x) / dx : 1e9, dy > 0 ? (H - RS - y) / dy : dy < 0 ? (-H + RS - y) / dy : 1e9);
    if (best && best.k < wall) {
      const gx = x + dx * best.k, gy = y + dy * best.k, nx = best.m.x - gx, ny = best.m.y - gy, nl = Math.hypot(nx, ny);
      return { k: best.k, gx, gy, man: best.m.id, ox: nx / nl, oy: ny / nl };
    }
    return { k: wall, gx: x + dx * wall, gy: y + dy * wall, man: -1 };
  }

  const API = { DIM, DECEL, VMAX, newBoard, nextBoard, matchOver, clone, colOf, other, baseY, onBoard, strikerFree, nearestFree, simulate, resolve, think, perform, wobble, skill, aimTrace, layout, rng, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.CarromEngine = API;
})(typeof self !== 'undefined' ? self : this);
