/* =====================================================================
   Crokinole — rules, physics and AI (shared by the 3D table play atlas/games/crokinole.js, the rules tour
   atlas/rules/crokinole.js and the AI worker crokinole/worker.js). No DOM.
   Units: centimetres on the playing surface (the NCA board: a 26-inch circle), origin in the middle, x to the right,
   y towards player 0 (the near side). Player 1 plays from the far side (y < 0).
   Rules: NCA / World Crokinole Championship singles (see claude/crokinole-spec.md): 8 discs each per round, one shot
   each in turn; with an opponent's disc on the board a shot has to hit one (directly or through your own discs), with
   none it has to leave a disc touching or inside the 15 line (or make a 20); a foul removes the shot disc and your
   discs it moved; a disc touching a line scores the lower value; discs at rest touching the outer line go to the ditch.
   ===================================================================== */
(function (root) {
  'use strict';
  const IN = 2.54;
  const RB = 13 * IN,          // the playing surface (26 in): its edge drops into the ditch
    R5 = 12 * IN,              // the outer (5) line, 24 in — the shooting line
    R10 = 8 * IN,              // the 10 line, 16 in
    R15 = 4 * IN,              // the 15 line, 8 in (the pegs stand on it)
    RH = 1.375 * IN / 2,       // the 20 hole (1⅜ in)
    RD = 1.25 * IN / 2,        // a disc (1¼ in)
    RP = .55,                  // a peg (rubber sleeve)
    MD = 6;                    // grams
  const DECEL = 62,            // cm/s² on a polished, powdered board
    VMAX = 320,                // cm/s, a full flick (the hand maps its pull with a square: fine control for the soft draws)
    E_DD = .9, E_PEG = .55,
    DT = 1 / 480, TMAX = 14, FPS = 60,
    HOLE_V = 20;               // a disc slower than this over the hole drops in (a faster one rides over it)
  const PEGS = []; for (let k = 0; k < 8; k++) { const a = (k + .5) * Math.PI / 4; PEGS.push([Math.cos(a) * R15, Math.sin(a) * R15]); }
  const QX = R5 * Math.SQRT1_2;   // the quadrant lines meet the shooting line at x = ±QX
  const DIM = { RB, R5, R10, R15, RH, RD, RP, PEGS, VMAX, QX, IN };

  /* ---------- the shooting position: on the 5 line in your own quadrant (centre on the line), x from −QX to QX ---------- */
  const baseY = (p, x) => (p === 0 ? 1 : -1) * Math.sqrt(Math.max(0, R5 * R5 - x * x));
  function startFree(s, p, x) {
    if (Math.abs(x) > QX - RD * .5 + 1e-6) return false;
    const y = baseY(p, x);
    for (const m of s.pcs) if (m.on && Math.hypot(m.x - x, m.y - y) < RD * 2 + .05) return false;
    return true;
  }
  function nearestFree(s, p, x) {
    const lim = QX - RD * .5; x = Math.max(-lim, Math.min(lim, x));
    if (startFree(s, p, x)) return x;
    for (let d = .1; d <= 2 * lim; d += .1) { if (startFree(s, p, x + d)) return x + d; if (startFree(s, p, x - d)) return x - d; }
    return x;
  }

  /* ---------- a round ---------- */
  function newRound(o) {
    o = o || {};
    return {
      pcs: [], left: [8, 8], turn: o.first || 0, starter: o.first || 0, tw: [0, 0],
      round: o.round || 1, score: o.score ? o.score.slice() : [0, 0], hist: o.hist ? o.hist.slice() : [],
      mode: o.mode || 'r4', shots: 0, roundOver: false, over: false, winner: -1, last: null,
    };
  }
  const newBoard = newRound;
  const clone = s => JSON.parse(JSON.stringify(s));
  const onBoard = (s, c) => s.pcs.filter(m => m.on && (c == null || m.c === c));
  // the value of a disc at rest (the lowest region it touches)
  function value(x, y) {
    const d = Math.hypot(x, y);
    if (d + RD < R15) return 15;
    if (d + RD < R10) return 10;
    if (d + RD < R5) return 5;
    return 0;
  }
  function tally(s) { const t = [s.tw[0] * 20, s.tw[1] * 20]; for (const m of s.pcs) if (m.on) t[m.c] += value(m.x, m.y); return t; }

  /* ---------- physics: discs sliding with friction, knocks, rubber pegs, the hole, the ditch ---------- */
  // shot = { x (the start on the shooting line), ang (radians, 0 = +x, π/2 = +y), v (cm/s) }
  function simulate(s, p, shot, opt) {
    opt = opt || {};
    const pcs = s.pcs, N = pcs.length + 1, S = N - 1;
    const X = new Float64Array(N), Y = new Float64Array(N), VX = new Float64Array(N), VY = new Float64Array(N), ON = new Uint8Array(N), C = new Int8Array(N);
    for (let i = 0; i < pcs.length; i++) { X[i] = pcs[i].x; Y[i] = pcs[i].y; ON[i] = pcs[i].on ? 1 : 0; C[i] = pcs[i].c; }
    X[S] = shot.x; Y[S] = baseY(p, shot.x); ON[S] = 1; C[S] = p;
    const v = Math.max(0, Math.min(VMAX, shot.v));
    VX[S] = Math.cos(shot.ang) * v; VY[S] = Math.sin(shot.ang) * v;
    const events = [], frames = opt.frames ? [] : null, sunk = [], ditch = [];
    const chain = new Uint8Array(N); chain[S] = 1;     // the shot disc and the own discs it set going (the contact rule)
    const moved = new Uint8Array(N); moved[S] = 1;
    let hitOpp = false, t = 0, nextF = 0;
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
        if (ns <= .3) { VX[i] = VY[i] = 0; moving[i] = 0; continue; }
        const k = ns / sp; VX[i] *= k; VY[i] *= k;
        X[i] += VX[i] * DT; Y[i] += VY[i] * DT; moving[i] = 1; anyMoving = true;
        const d = Math.hypot(X[i], Y[i]);
        // the 20 hole: a slow disc over it drops in
        if (d < RH * .92 && ns < HOLE_V) { ON[i] = 0; moving[i] = 0; VX[i] = VY[i] = 0; sunk.push({ i, t }); events.push({ t, k: 'hole', i }); continue; }
        // off the edge of the surface: into the ditch
        if (d > RB) { ON[i] = 0; moving[i] = 0; VX[i] = VY[i] = 0; ditch.push({ i, t, x: X[i], y: Y[i] }); events.push({ t, k: 'ditch', i }); continue; }
        // the pegs
        for (const [px, py] of PEGS) {
          const dx = X[i] - px, dy = Y[i] - py, rr = RD + RP, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr) continue;
          const dd = Math.sqrt(d2) || 1e-6, nx = dx / dd, ny = dy / dd, vn = VX[i] * nx + VY[i] * ny;
          X[i] = px + nx * rr; Y[i] = py + ny * rr;
          if (vn < 0) { VX[i] -= (1 + E_PEG) * vn * nx; VY[i] -= (1 + E_PEG) * vn * ny; VX[i] *= .97; VY[i] *= .97; events.push({ t, k: 'peg', v: -vn, i }); }
        }
      }
      // knocks
      for (let i = 0; i < N; i++) {
        if (!ON[i] || !moving[i]) continue;
        for (let j = 0; j < N; j++) {
          if (j === i || !ON[j] || (moving[j] && j < i)) continue;
          const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = 2 * RD, d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const rv = (VX[i] - VX[j]) * nx + (VY[i] - VY[j]) * ny;
          const ov = rr - d; X[i] -= nx * ov / 2; Y[i] -= ny * ov / 2; X[j] += nx * ov / 2; Y[j] += ny * ov / 2;
          if (rv <= 0) continue;
          const jm = (1 + E_DD) * rv / 2;
          VX[i] -= jm * nx; VY[i] -= jm * ny; VX[j] += jm * nx; VY[j] += jm * ny;
          moving[j] = 1; moved[j] = 1; moved[i] = 1; anyMoving = true;
          // the contact rule: a disc of the chain meeting an opponent's disc; the chain grows through the shooter's own discs
          for (const [a, b] of [[i, j], [j, i]]) if (chain[a]) { if (C[b] !== p) hitOpp = true; else chain[b] = 1; }
          events.push({ t, k: 'hit', v: rv, a: i, b: j });
        }
      }
      if (frames && t >= nextF) { snap(); nextF += 1 / FPS; }
    }
    if (frames) snap();
    const fin = []; for (let i = 0; i < N; i++) fin.push({ x: X[i], y: Y[i], on: !!ON[i] });
    return { fin, sunk, ditch, hitOpp, chain: Array.from(chain), moved: Array.from(moved), events, frames, dur: t, shooter: S, start: { x: shot.x, y: baseY(p, shot.x) } };
  }

  /* ---------- the shot's result by the rules ---------- */
  // returns { s, msg: [codes], foul, tw: 20s made, out: discs to the ditch }
  function resolve(s0, sim) {
    const s = clone(s0), p = s.turn, S = sim.shooter, msg = [];
    const oppOn = s0.pcs.some(m => m.on && m.c !== p);
    s.pcs.push({ id: s.pcs.length, c: p, x: 0, y: 0, on: true });
    s.pcs.forEach((m, i) => { m.x = sim.fin[i].x; m.y = sim.fin[i].y; m.on = sim.fin[i].on; });
    const sunkIds = sim.sunk.map(e => e.i);
    let foul = false;
    if (oppOn) { if (!sim.hitOpp) { foul = true; msg.push('foul.miss'); } }
    else {
      // open board: the shot disc or a disc it moved has to end touching or inside the 15 line (a 20 counts)
      const ok = sunkIds.length > 0 || s.pcs.some((m, i) => m.on && sim.moved[i] && Math.hypot(m.x, m.y) - RD <= R15);
      if (!ok) { foul = true; msg.push('foul.open'); }
    }
    let tw = [0, 0];
    if (foul) {
      // the shot disc and your discs it moved come off; 20s of this shot do not count
      s.pcs.forEach((m, i) => { if (m.c === p && sim.moved[i]) m.on = false; });
    } else {
      sunkIds.forEach(i => { tw[s.pcs[i].c]++; });
      s.tw[0] += tw[0]; s.tw[1] += tw[1];
      if (tw[p]) msg.push('tw');
    }
    // discs at rest touching the outer line go to the ditch
    const out = [];
    s.pcs.forEach((m, i) => { if (m.on && Math.hypot(m.x, m.y) + RD >= R5) { m.on = false; out.push(i); } });
    if (!foul && !tw[p]) msg.push(oppOn ? (sim.hitOpp ? 'hit' : '') : 'open');
    s.left[p]--; s.shots++;
    s.last = { p, foul, tw: tw[p] };
    if (s.left[0] === 0 && s.left[1] === 0) endRound(s, msg);
    else s.turn = s.left[1 - p] > 0 ? 1 - p : p;
    return { s, msg: msg.filter(Boolean), foul, tw, out };
  }
  function endRound(s, msg) {
    const t = tally(s);
    s.roundOver = true; s.roundPts = t;
    if (s.mode === '100') {
      const d = t[0] - t[1]; if (d > 0) s.score[0] += d; else if (d < 0) s.score[1] -= d;
      s.hist.push(t);
      if (s.score[0] >= 100 || s.score[1] >= 100) { s.over = true; s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : -1; }
      if (s.over && s.winner < 0) s.over = false;
    } else {
      if (t[0] > t[1]) s.score[0] += 2; else if (t[1] > t[0]) s.score[1] += 2; else { s.score[0]++; s.score[1]++; }
      s.hist.push(t);
      if (s.hist.length >= 4 && s.score[0] !== s.score[1]) { s.over = true; s.winner = s.score[0] > s.score[1] ? 0 : 1; }
      else if (s.hist.length >= 8) { s.over = true; s.winner = -1; }   // (tied after the extra rounds: a draw)
    }
    msg.push('round');
  }
  // the next round: the other player starts (the last shot, "the hammer", passes over)
  function nextRound(s) { return newRound({ first: 1 - s.starter, round: s.round + 1, score: s.score, hist: s.hist, mode: s.mode }); }
  const nextBoard = nextRound;
  function matchOver(s) { return !!s.over; }

  /* ---------- AI ---------- */
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(R) { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // a straight run from a to b for a disc: other discs and the pegs in the way?
  function clear(s, ax, ay, bx, by, skip) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
    const block = (cx, cy, r) => { const k = ((cx - ax) * dx + (cy - ay) * dy) / L2; if (k < 0 || k > 1) return false; return Math.hypot(cx - ax - dx * k, cy - ay - dy * k) < r - .05; };
    for (const m of s.pcs) if (m.on && !skip.includes(m.id) && block(m.x, m.y, 2 * RD)) return false;
    for (const [px, py] of PEGS) if (block(px, py, RD + RP)) return false;
    return true;
  }
  // the position's worth for p: the discs' values, the 20s, and a little for discs the other side can hardly reach
  function evaluate(s0, r, p) {
    const s = r.s, o = 1 - p;
    if (s.roundOver) {
      const t = s.roundPts;
      if (s.over) return s.winner === p ? 1000 : -1000;
      return (t[p] - t[o]) * 1.2;
    }
    const t = tally(s);
    let v = t[p] - t[o];
    if (r.foul) v -= 3;
    // own discs behind a peg or in a cluster are safer; an exposed lone disc near the centre will be taken out
    for (const m of s.pcs) {
      if (!m.on) continue;
      const guard = PEGS.some(([px, py]) => Math.hypot(px - m.x, py - m.y) < 4.5);
      if (m.c === p) v += guard ? 1.5 : 0;
      else v -= guard ? 1 : 0;
    }
    // the shots left: having the last shot (the hammer) is worth a little
    return v + (s.left[p] - s.left[o]) * .5;
  }
  const speedTo = d => Math.sqrt(2 * DECEL * Math.max(0, d));
  // candidate shots: takeouts on the opponent's discs (straight, a few speeds), draws to the centre (20 tries, 15s)
  function candidates(s, p, level) {
    const out = [], xs = []; for (let i = 0; i <= 10; i++) xs.push(-QX + RD + (i / 10) * (2 * QX - 2 * RD));
    const opp = onBoard(s, 1 - p), lv = level || 10;
    for (const x0 of xs) {
      const x = nearestFree(s, p, x0); if (Math.abs(x - x0) > .8) continue;
      const y = baseY(p, x);
      if (opp.length) {
        for (const m of opp) {
          // the ghost: the shot disc touching the target, on the line from the start
          const dx = m.x - x, dy = m.y - y, dd = Math.hypot(dx, dy); if (dd < 2 * RD) continue;
          for (const off of lv >= 6 ? [0, -.55, .55] : [0]) {   // full and thin (cut) hits
            const ang = Math.atan2(dy, dx) + off * (2 * RD) / dd;
            const gx = x + Math.cos(ang) * (dd - 2 * RD), gy = y + Math.sin(ang) * (dd - 2 * RD);
            if (!clear(s, x, y, gx, gy, [m.id])) continue;
            const base = speedTo(dd + R5 - Math.hypot(m.x, m.y) + 8);
            for (const f of [.75, 1.05, 1.5]) out.push({ x, ang, v: Math.min(VMAX, base * f + 20), kind: 'take', pre: 1 / (1 + dd / 50) * (off ? .7 : 1) });
          }
        }
      }
      // to the centre (and just short of it)
      const dc = Math.hypot(x, y);
      for (const da of [0, -.025, .025]) {
        const ang = Math.atan2(-y, -x) + da;
        if (!clear(s, x, y, x + Math.cos(ang) * (dc - 1), y + Math.sin(ang) * (dc - 1), [])) continue;
        for (const extra of [0, .8, 1.6, -4, -9]) out.push({ x, ang, v: speedTo(dc + extra), kind: 'draw', pre: opp.length ? .35 : 1 });
      }
      // to a spot behind a peg (a guard), on the higher levels
      if (lv >= 9) for (const [px, py] of PEGS) {
        const pd = Math.hypot(px, py), bx = px * (1 + 3.2 / pd), by = py * (1 + 3.2 / pd);
        if (Math.sign(by) !== Math.sign(y)) continue;
        const dx = bx - x, dy = by - y, dd = Math.hypot(dx, dy);
        if (!clear(s, x, y, bx, by, [])) continue;
        out.push({ x, ang: Math.atan2(dy, dx), v: speedTo(dd), kind: 'guard', pre: .3 });
      }
    }
    return out;
  }
  function skill(level) {
    const k = (Math.max(1, Math.min(20, level)) - 1) / 19;
    return { n: Math.round(8 + 150 * k * k + 20 * k), robust: level >= 11 ? (level >= 17 ? 5 : 3) : 0, angSd: (3.6 * Math.pow(1 - k, 1.5) + .3) * Math.PI / 180, vSd: .14 * Math.pow(1 - k, 1.3) + .03, pickTop: level <= 3 ? 4 : level <= 6 ? 2 : 1 };
  }
  function jitter(shot, sk, R) { return { x: shot.x, ang: shot.ang + gauss(R) * sk.angSd, v: Math.max(25, shot.v * (1 + gauss(R) * sk.vSd)) }; }
  function think(s, level, seed) {
    const p = s.turn, sk = skill(level), R = rng(seed || 1);
    let cs = candidates(s, p, level);
    for (let i = cs.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [cs[i], cs[j]] = [cs[j], cs[i]]; }
    cs.sort((a, b) => b.pre - a.pre);
    cs = cs.slice(0, sk.n);
    const sc = cs.map(c => { const r = resolve(s, simulate(s, p, c)); return { c, v: evaluate(s, r, p) }; });
    sc.sort((a, b) => b.v - a.v);
    if (sk.robust && sc.length) {
      const top = sc.slice(0, 6);
      top.forEach(e => { let t = 0; for (let k = 0; k < sk.robust; k++) { const j = jitter(e.c, { angSd: Math.max(sk.angSd, .3 * Math.PI / 180), vSd: Math.max(sk.vSd, .035) }, R); t += evaluate(s, resolve(s, simulate(s, p, j)), p); } e.rv = e.v * .4 + t / sk.robust * .6; });
      top.sort((a, b) => b.rv - a.rv);
      sc.splice(0, top.length, ...top);
    }
    const y0 = baseY(p, 0);
    const pick = sc.length ? sc[Math.floor(R() * Math.min(sk.pickTop, sc.length))] : { c: { x: 0, ang: Math.atan2(-y0, 0), v: speedTo(R5) } };
    const c = pick.c;
    return { x: c.x, ang: c.ang, v: c.v, kind: c.kind || '', val: pick.v };
  }
  function perform(shot, level, seed) { return jitter(shot, skill(level), rng(seed || 7)); }
  // a human flick is never quite the same twice: a small wobble in angle and strength, larger for hard shots
  // (1 s.d.: soft draws ±0.8° / ±4% — a perfectly aimed open 20 drops about 4 times in 5 — a full-power takeout ±1.6° / ±7%)
  function wobble(shot, seed) {
    const R = rng(seed || 11), k = Math.min(1, shot.v / VMAX), k2 = k * k;
    return { x: shot.x, ang: shot.ang + gauss(R) * (.8 + .8 * k2) * Math.PI / 180, v: Math.max(15, shot.v * (1 + gauss(R) * (.04 + .03 * k2))) };
  }

  // first contact along an aim (for the aiming guide): a disc, a peg, or the edge
  function aimTrace(s, p, x, ang) {
    const y = baseY(p, x), dx = Math.cos(ang), dy = Math.sin(ang);
    let best = null;
    const test = (cx, cy, r, what) => {
      const fx = cx - x, fy = cy - y, b = fx * dx + fy * dy; if (b <= 0) return;
      const c = fx * fx + fy * fy - r * r, disc = b * b - c; if (disc < 0) return;
      const k = b - Math.sqrt(disc); if (k < 0) return;
      if (!best || k < best.k) best = { k, cx, cy, what };
    };
    for (const m of s.pcs) if (m.on) test(m.x, m.y, 2 * RD, m);
    for (const [px, py] of PEGS) test(px, py, RD + RP, 'peg');
    // the far edge of the surface
    const b = x * dx + y * dy, c = x * x + y * y - RB * RB, wall = -b + Math.sqrt(Math.max(0, b * b - c));
    if (best && best.k < wall) {
      const gx = x + dx * best.k, gy = y + dy * best.k;
      if (best.what === 'peg') return { k: best.k, gx, gy, man: -1, peg: true };
      const nx = best.cx - gx, ny = best.cy - gy, nl = Math.hypot(nx, ny);
      return { k: best.k, gx, gy, man: best.what.id, ox: nx / nl, oy: ny / nl };
    }
    return { k: wall, gx: x + dx * wall, gy: y + dy * wall, man: -1 };
  }

  const API = { DIM, DECEL, VMAX, newRound, newBoard, nextRound, nextBoard, matchOver, clone, baseY, onBoard, startFree, nearestFree, simulate, resolve, think, perform, wobble, skill, aimTrace, value, tally, rng, evaluate };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.CrokinoleEngine = API;
})(typeof self !== 'undefined' ? self : this);
