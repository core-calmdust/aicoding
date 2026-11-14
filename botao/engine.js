/* =====================================================================
   Futebol de Botão (フチボウ・ジ・ボタン) — rules, physics and AI. No DOM.
   Shared by the 3D table play atlas/games/botao.js, the rules course atlas/rules/botao.js and the AI worker botao/worker.js.
   Rules: the Brazilian 12-touch rule (Regra 12 Toques, CBFM), simplified for the table — see claude/botao-spec.md.
     · 10 buttons and a goalkeeper a side. The side with the ball flicks one of its buttons into the ball, one touch at a time.
     · 12 touches per possession, no more than 3 in a row with one button. No shot by the 12th touch → indirect free kick
       to the other side where the ball stopped.
     · A shot has to be declared (ball in the attacking half); the defender then sets the goalkeeper in the small area,
       and the attacker shoots. The ball goes to the defender after any shot that is not a goal.
     · The ball passes to the other side when it last touched one of their pieces, when a flick misses the ball (furada) or
       hits your own button first, or when it stops in their small area.
     · A button that hits an opponent's piece before the ball: free kick (direct when the piece hit was in its attacking
       half, a penalty in the fouling side's own big area).
     · Out over a side line: throw-in; over an end line: goal kick or corner.
   Units: centimetres. The field is 104 × 167 (x across, y along), origin in the middle. Side 0 (you, the near side)
   defends the goal at y = +H and attacks towards y = −H; side 1 the reverse.
   Game scale (playability): the ball is 1.6 cm (the real felt ball is 1 cm), buttons 4.8 cm, the goal 12.5 cm.
   ===================================================================== */
(function (root) {
  'use strict';
  const FW = 104, FL = 167, HW = FW / 2, H = FL / 2,        // the field
    PS = 8, PE = 10,                                        // the side / end runs of table outside the lines
    TX = HW + PS, TY = H + PE,                              // the table's rim (the frame stops everything there)
    GW = 12.5, GHW = GW / 2, GD = 5,                        // the goal (inside width, depth of the net)
    SA_W = 30, SA_D = 11, BA_W = 60, BA_D = 30,             // small area, big area
    PEN = 20.5, CR = 16,                                    // the penalty mark, the centre circle
    RB = 2.4, RBALL = .8, KHW = 4, KHD = 1.75,              // button radius, ball radius, the goalkeeper's half sizes (8 × 3.5)
    MB = 8, MBALL = .6;                                     // masses (g; the ball a little heavier than the real one: easier to control)
  const NB = 20, BALL = 20;                                 // buttons 0–9 side 0, 10–19 side 1; the ball is body 20
  const DEC_B = 140,                                        // a button slides to a stop (cm/s²)
    DEC_BALL0 = 45, DEC_BALL1 = .6,                         // the ball: rolling resistance + a drag that grows with speed
    E_BB = .75, E_BBALL = .85, E_RIM = .55, E_KEEP = .45, E_POST = .5,
    VMAX = 200, VMIN = 12,
    DT = 1 / 360, TMAX = 12, FPS = 60;
  const DIM = { FW, FL, HW, H, PS, PE, TX, TY, GW, GHW, GD, SA_W, SA_D, BA_W, BA_D, PEN, CR, RB, RBALL, KHW, KHD, VMAX };
  const team = i => i < 10 ? 0 : 1;
  const goalY = t => t === 0 ? H : -H;                      // the goal line side t defends
  const fwd = t => t === 0 ? -1 : 1;                        // the direction side t attacks (sign of y)
  const inAttack = (t, y) => t === 0 ? y < 0 : y > 0;
  const inSmall = (t, x, y) => Math.abs(x) < SA_W / 2 && (t === 0 ? y > H - SA_D : y < -(H - SA_D)) && Math.abs(y) <= H;
  const inBig = (t, x, y) => Math.abs(x) < BA_W / 2 && (t === 0 ? y > H - BA_D : y < -(H - BA_D)) && Math.abs(y) <= H;
  const clone = s => JSON.parse(JSON.stringify(s));

  /* ---------- the line-up: a 4-3-3, side 0 in its own half (y > 0); side 1 the same turned round ---------- */
  const SHAPE = [[-34, 58], [-11, 62], [11, 62], [34, 58], [-24, 36], [0, 40], [24, 36], [-30, 18], [0, 22], [30, 18]];
  // at the kick-off the side kicking off has its centre forward just behind the ball, the wingers up at the circle
  const KICK = [[-34, 58], [-11, 62], [11, 62], [34, 58], [-24, 36], [0, 40], [24, 36], [-22, 9], [0, RB + RBALL + .25], [22, 9]];
  function lineup(s, kicker) {
    s.b = [];
    for (let t = 0; t < 2; t++) {
      const L = t === kicker ? KICK : SHAPE, sg = t === 0 ? 1 : -1;
      L.forEach(([x, y]) => s.b.push({ x: x * sg, y: y * sg }));
    }
    s.k = [{ x: 0, y: H - KHD - .4 }, { x: 0, y: -(H - KHD - .4) }];
    s.ball = { x: 0, y: 0 };
  }

  /* ---------- a match ---------- */
  // o.first: the side kicking off; o.goals: first to n goals (0 = timed halves); o.half: seconds per half (timed)
  function newMatch(o) {
    o = o || {};
    const s = { b: [], k: [], ball: { x: 0, y: 0 }, score: [0, 0], first: o.first || 0, goals: o.goals == null ? 3 : o.goals, halfLen: o.half || 300,
      half: 1, clock: 0, pos: 0, rem: 12, last: -1, cons: 0, noShot: 0, direct: false, shot: false, restart: 'kick', ply: 0, over: false, winner: -1, log: [] };
    kickoff(s, s.first);
    return s;
  }
  function freshPossession(s, t) { s.pos = t; s.rem = 12; s.last = -1; s.cons = 0; s.noShot = 0; s.direct = false; s.shot = false; }
  function kickoff(s, t) { lineup(s, t); freshPossession(s, t); s.noShot = 2; s.restart = 'kick'; }

  /* ---------- placing the ball for a restart: the opponents step back, a button of the side to play takes it ---------- */
  function clampField(x, y, m) { m = m == null ? RBALL + .3 : m; return { x: Math.max(-HW + m, Math.min(HW - m, x)), y: Math.max(-H + m, Math.min(H - m, y)) }; }
  function overlapsAny(s, x, y, r, skip) {
    for (let i = 0; i < NB; i++) if (i !== skip && Math.hypot(s.b[i].x - x, s.b[i].y - y) < r + RB + .05) return true;
    if (Math.hypot(s.ball.x - x, s.ball.y - y) < r + RBALL + .05 && skip !== BALL) return true;
    for (const k of s.k) if (Math.abs(k.x - x) < KHW + r && Math.abs(k.y - y) < KHD + r) return true;
    return false;
  }
  const onTable = (x, y) => Math.abs(x) <= TX - RB - .2 && Math.abs(y) <= TY - RB - .2 && !(Math.abs(x) < GHW + 2 + RB && Math.abs(y) > H);
  function freeSpot(s, i, x, y) {   // the nearest place to (x, y) a button can stand
    if (onTable(x, y) && !overlapsAny(s, x, y, RB, i)) return { x, y };
    for (let r = .6; r < 40; r += .6) for (let a = 0; a < 16; a++) {
      const q = a / 16 * 2 * Math.PI, nx = x + Math.cos(q) * r, ny = y + Math.sin(q) * r;
      if (onTable(nx, ny) && !overlapsAny(s, nx, ny, RB, i)) return { x: nx, y: ny };
    }
    return { x, y };
  }
  function placeBall(s, t, x, y, kind) {
    s.ball = { x, y };
    const keep = kind === 'pen' ? 0 : 7;   // the opponents keep 7 cm away (an indirect free kick lets them be moved back 8 cm)
    for (let i = 0; i < NB; i++) {
      const b = s.b[i], d = Math.hypot(b.x - x, b.y - y), need = team(i) === t ? RB + RBALL + .3 : RB + keep;
      if (d < need) { const a = d > .01 ? Math.atan2(b.y - y, b.x - x) : Math.PI / 2 * fwd(t), p = freeSpot(s, i, x + Math.cos(a) * need, y + Math.sin(a) * need); b.x = p.x; b.y = p.y; }
    }
    // the taker: the nearest own button stands just behind the ball (towards the goal it attacks)
    let best = -1, bd = 1e9;
    for (let i = t * 10; i < t * 10 + 10; i++) { const d = Math.hypot(s.b[i].x - x, s.b[i].y - y); if (d < bd) { bd = d; best = i; } }
    const gx = 0, gy = goalY(1 - t), a = Math.atan2(gy - y, gx - x), dd = RB + RBALL + 1.2;
    const want = { x: x - Math.cos(a) * dd, y: y - Math.sin(a) * dd };
    if (kind === 'throw' || kind === 'corner') { const sx = Math.sign(x) || 1; if (kind === 'throw') { want.x = x + sx * dd; want.y = y; } else { want.x = x + sx * dd * .7; want.y = y + Math.sign(y) * dd * .7; } }
    const p = freeSpot(s, best, want.x, want.y); s.b[best].x = p.x; s.b[best].y = p.y;
    s.taker = best;
  }
  function restartFor(s, t, kind, x, y) {
    freshPossession(s, t); s.restart = kind;
    if (kind === 'pen') {
      const gy = goalY(1 - t), my = gy + (t === 0 ? PEN : -PEN);   // the mark in front of the goal t attacks
      // everyone but the taker leaves the big area
      for (let i = 0; i < NB; i++) { const b = s.b[i]; if (inBig(1 - t, b.x, b.y) || Math.hypot(b.x, b.y - my) < 16) { const ny = gy + (t === 0 ? BA_D + RB + 1 : -(BA_D + RB + 1)); const p = freeSpot(s, i, b.x, ny); b.x = p.x; b.y = p.y; } }
      s.k[1 - t] = { x: 0, y: gy + (t === 0 ? KHD + .4 : -(KHD + .4)) };
      placeBall(s, t, 0, my, 'pen'); s.shot = true; s.direct = true;
      return;
    }
    const q = kind === 'throw' ? { x: Math.sign(x) * (HW - RBALL - .2), y: Math.max(-H + 2, Math.min(H - 2, y)) }
      : kind === 'corner' ? { x: Math.sign(x || 1) * (HW - 1.4), y: Math.sign(y) * (H - 1.4) }
      : kind === 'gk' ? { x: Math.max(-12, Math.min(12, x * .4)), y: goalY(t) + (t === 0 ? -(SA_D + 1.2) : SA_D + 1.2) }   // just outside the small area
      : clampField(x, y);
    placeBall(s, t, q.x, q.y, kind);
    if (kind === 'fk' || kind === 'corner') s.direct = true;        // a direct free kick / a corner may be shot at once
    if (kind === 'ifk' || kind === 'throw' || kind === 'gk' || kind === 'keeper') s.noShot = 1;   // the first touch cannot be a shot
  }

  /* ---------- may side s.pos shoot now? ---------- */
  function canShoot(s) {
    if (s.over || s.shot) return false;
    if (s.noShot > 0 || s.rem < 1) return false;
    return inAttack(s.pos, s.ball.y) && Math.abs(s.ball.y) > RBALL;
  }
  // the buttons that may be flicked (3 touches in a row with one button at most)
  const canFlick = (s, i) => team(i) === s.pos && !(i === s.last && s.cons >= 3);

  /* ---------- physics ---------- */
  // circle vs. axis-aligned box: push out, bounce (returns the normal speed, 0 when no contact)
  function boxHit(X, Y, VX, VY, i, r, cx, cy, hx, hy, e) {
    const px = Math.max(cx - hx, Math.min(cx + hx, X[i])), py = Math.max(cy - hy, Math.min(cy + hy, Y[i]));
    let dx = X[i] - px, dy = Y[i] - py, d2 = dx * dx + dy * dy;
    if (d2 >= r * r) return 0;
    let d = Math.sqrt(d2), nx, ny;
    if (d < 1e-6) {   // the centre inside the box: out by the nearest face
      const ox = hx - Math.abs(X[i] - cx), oy = hy - Math.abs(Y[i] - cy);
      if (ox < oy) { nx = Math.sign(X[i] - cx) || 1; ny = 0; X[i] = cx + nx * (hx + r); } else { nx = 0; ny = Math.sign(Y[i] - cy) || 1; Y[i] = cy + ny * (hy + r); }
    } else { nx = dx / d; ny = dy / d; X[i] = px + nx * r; Y[i] = py + ny * r; }
    const vn = VX[i] * nx + VY[i] * ny;
    if (vn < 0) { VX[i] -= (1 + e) * vn * nx; VY[i] -= (1 + e) * vn * ny; return -vn; }
    return 0;
  }
  // the goal frames: two side boards and a back board each end (outside the field), the posts
  const GOALBOX = []; for (const sg of [1, -1]) { const y0 = sg * (H + GD / 2 + .3); GOALBOX.push([-(GHW + .5), y0, .5, GD / 2 + .3], [GHW + .5, y0, .5, GD / 2 + .3], [0, sg * (H + GD + .6), GHW + 1, .3]); }

  // shot: { i (button), ang, v (cm/s) }. Returns where everything ended up and what touched what.
  function simulate(s, shot, opt) {
    opt = opt || {};
    const N = NB + 1, X = new Float64Array(N), Y = new Float64Array(N), VX = new Float64Array(N), VY = new Float64Array(N), R = new Float64Array(N), M = new Float64Array(N);
    for (let i = 0; i < NB; i++) { X[i] = s.b[i].x; Y[i] = s.b[i].y; R[i] = RB; M[i] = MB; }
    X[BALL] = s.ball.x; Y[BALL] = s.ball.y; R[BALL] = RBALL; M[BALL] = MBALL;
    const S = shot.i, v = Math.max(0, Math.min(VMAX, shot.v));
    VX[S] = Math.cos(shot.ang) * v; VY[S] = Math.sin(shot.ang) * v;
    const K = s.k;
    const moving = new Uint8Array(N); moving[S] = 1;
    const events = [], frames = opt.frames ? [] : null, touches = [];   // touches: who touched the ball, in order ('b<i>' buttons, 'k<t>' keepers)
    let first = null, hitOppAfter = false, out = null, goal = null, tGoal = 0, t = 0, nextF = 0, ballFrozen = false;
    const snap = () => { const f = new Float32Array(N * 2); for (let i = 0; i < N; i++) { f[i * 2] = X[i]; f[i * 2 + 1] = Y[i]; } frames.push(f); };
    if (frames) snap();
    const touch = who => { if (touches[touches.length - 1] !== who) touches.push(who); };
    const firstOf = (what, x, y) => { if (!first) first = { what, x, y }; };
    let any = true;
    while (any && t < TMAX) {
      t += DT; any = false;
      for (let i = 0; i < N; i++) {
        if (!moving[i]) continue;
        if (i === BALL && ballFrozen) { VX[i] = VY[i] = 0; moving[i] = 0; continue; }
        const sp = Math.hypot(VX[i], VY[i]);
        const dec = i === BALL ? DEC_BALL0 + DEC_BALL1 * sp : DEC_B;
        const ns = sp - dec * DT;
        if (ns <= (i === BALL ? .6 : 1)) { VX[i] = VY[i] = 0; moving[i] = 0; continue; }
        const k = ns / sp; VX[i] *= k; VY[i] *= k;
        X[i] += VX[i] * DT; Y[i] += VY[i] * DT; any = true;
        const r = R[i];
        // the rim of the table
        if (X[i] > TX - r) { X[i] = TX - r; if (VX[i] > 0) { events.push({ t, k: 'rim', v: VX[i], i }); VX[i] *= -E_RIM; } }
        if (X[i] < -TX + r) { X[i] = -TX + r; if (VX[i] < 0) { events.push({ t, k: 'rim', v: -VX[i], i }); VX[i] *= -E_RIM; } }
        if (Y[i] > TY - r) { Y[i] = TY - r; if (VY[i] > 0) { events.push({ t, k: 'rim', v: VY[i], i }); VY[i] *= -E_RIM; } }
        if (Y[i] < -TY + r) { Y[i] = -TY + r; if (VY[i] < 0) { events.push({ t, k: 'rim', v: -VY[i], i }); VY[i] *= -E_RIM; } }
        // the goal frames
        for (const g of GOALBOX) { const vn = boxHit(X, Y, VX, VY, i, r, g[0], g[1], g[2], g[3], E_POST); if (vn > 0) events.push({ t, k: 'post', v: vn, i }); }
        // the goalkeepers
        for (let kt = 0; kt < 2; kt++) {
          const vn = boxHit(X, Y, VX, VY, i, r, K[kt].x, K[kt].y, KHW, KHD, i === BALL ? E_KEEP : E_BB);
          if (vn > 0) {
            events.push({ t, k: 'keep', v: vn, i, kt });
            if (i === BALL) touch('k' + kt);
            if (i === S) { firstOf('k' + kt, K[kt].x, K[kt].y); if (kt !== team(S) && first.what !== 'k' + kt) hitOppAfter = true; }
          }
        }
        if (i === BALL && !out && !goal) {
          // in the goal: the ball's middle over the line between the posts
          if (Math.abs(Y[i]) > H && Math.abs(X[i]) < GHW) { goal = { side: Y[i] > 0 ? 0 : 1, x: X[i] }; tGoal = t; events.push({ t, k: 'goal', side: goal.side }); }
          else if (Math.abs(X[i]) > HW) { out = { kind: 'side', x: X[i], y: Y[i], t }; events.push({ t, k: 'out' }); }
          else if (Math.abs(Y[i]) > H) { out = { kind: 'end', x: X[i], y: Y[i], side: Y[i] > 0 ? 0 : 1, t }; events.push({ t, k: 'out' }); }
        }
        if (i === BALL && goal && Math.abs(Y[i]) > H + GD - RBALL - .4) { Y[i] = Math.sign(Y[i]) * (H + GD - RBALL - .4); ballFrozen = true; VX[i] = VY[i] = 0; }
      }
      // knocks between round bodies
      for (let i = 0; i < N; i++) {
        if (!moving[i]) continue;
        for (let j = 0; j < N; j++) {
          if (j === i || (moving[j] && j < i)) continue;
          const dx = X[j] - X[i], dy = Y[j] - Y[i], rr = R[i] + R[j], d2 = dx * dx + dy * dy;
          if (d2 >= rr * rr || d2 === 0) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          const mi = M[i], mj = M[j], ov = rr - d;
          X[i] -= nx * ov * mj / (mi + mj); Y[i] -= ny * ov * mj / (mi + mj); X[j] += nx * ov * mi / (mi + mj); Y[j] += ny * ov * mi / (mi + mj);
          const rv = (VX[i] - VX[j]) * nx + (VY[i] - VY[j]) * ny;
          if (rv <= 0) continue;
          const e = i === BALL || j === BALL ? E_BBALL : E_BB, jm = (1 + e) * rv / (1 / mi + 1 / mj);
          VX[i] -= jm / mi * nx; VY[i] -= jm / mi * ny; VX[j] += jm / mj * nx; VY[j] += jm / mj * ny;
          moving[j] = 1; any = true;
          events.push({ t, k: i === BALL || j === BALL ? 'ball' : 'hit', v: rv, a: i, b: j });
          if (i === BALL || j === BALL) { const o = i === BALL ? j : i; touch('b' + o); if (o === S) firstOf('ball', X[BALL], Y[BALL]); }
          else if (i === S || j === S) { const o = i === S ? j : i; firstOf('b' + o, X[o], Y[o]); if (first.what !== 'b' + o && team(o) !== team(S)) hitOppAfter = true; }
        }
      }
      if (frames && t >= nextF) { snap(); nextF += 1 / FPS; }
    }
    if (frames) snap();
    const fin = { b: [], ball: { x: X[BALL], y: Y[BALL] } };
    for (let i = 0; i < NB; i++) fin.b.push({ x: X[i], y: Y[i] });
    return { fin, first, touches, hitOppAfter, out, goal, tGoal, events, frames, dur: t, shooter: S };
  }

  /* ---------- the result of a flick by the rules ---------- */
  // returns { s, msg: [codes], goal (side scoring or -1), foul, change (the ball changed sides) }
  function resolve(s0, sim) {
    const s = clone(s0), p = s0.pos, o = 1 - p, S = sim.shooter, msg = [];
    s.b = sim.fin.b.map(q => ({ x: q.x, y: q.y })); s.ball = { x: sim.fin.ball.x, y: sim.fin.ball.y }; s.ply = (s.ply || 0) + 1;
    s.restart = ''; delete s.taker;
    const shot = s0.shot, first = sim.first, tw = w => w[0] === 'k' ? +w[1] : team(+w.slice(1));
    const lastTouch = sim.touches.length ? sim.touches[sim.touches.length - 1] : null, lastTeam = lastTouch ? tw(lastTouch) : p;
    let goal = -1, foul = false, change = false;
    // 1. a foul: the flicked button met an opponent's piece before the ball
    if (first && first.what !== 'ball' && tw(first.what) === o) {
      foul = true; msg.push('foul');
      const q = clampField(first.x, first.y);
      const pen = inBig(p, q.x, q.y);   // in the fouling side's own big area: a penalty
      if (pen) { msg.push('pen'); restartFor(s, o, 'pen'); }
      else restartFor(s, o, inAttack(o, q.y) ? 'fk' : 'ifk', q.x, q.y);
      return done();
    }
    // 2. a goal
    if (sim.goal) {
      const g = sim.goal.side, scorer = 1 - g;   // the goal of side g: a point for the other side
      const valid = (shot && p === scorer) || lastTeam === g;   // a declared shot, or an own goal
      if (valid) { s.score[scorer]++; goal = scorer; msg.push(lastTeam === g && !(shot && p === scorer) ? 'own' : 'goal'); s.log.push({ ply: s.ply, side: scorer, own: lastTeam === g }); afterGoal(s, g); return done(); }
      msg.push('nogoal'); restartFor(s, g, 'gk', 0, goalY(g)); return done();
    }
    // 3. out of play
    if (sim.out) {
      const ot = sim.out;
      if (ot.kind === 'side') { msg.push('throw'); restartFor(s, 1 - lastTeam, 'throw', ot.x, ot.y); }
      else { const g = ot.side; if (lastTeam === g) { msg.push('corner'); restartFor(s, 1 - g, 'corner', ot.x, ot.y); } else { msg.push('gk'); restartFor(s, g, 'gk', ot.x, ot.y); } }
      return done();
    }
    // 4. a shot that did not score: the defender's ball
    if (shot) { msg.push(sim.touches.some(w => w === 'k' + o) ? 'save' : 'miss'); freshPossession(s, o); s.restart = 'keeper'; s.noShot = 1; return done(); }
    // 5. a miss (furada) or your own button first
    if (!first || first.what !== 'ball') {
      msg.push(first ? 'ownfirst' : 'furada');
      const lastOne = s0.rem <= 1;
      freshPossession(s, o); if (lastOne) { s.noShot = 1; s.restart = 'ifk'; }
      return done();
    }
    // 6. the ball last touched an opponent's piece
    if (lastTeam === o) { msg.push('lost'); freshPossession(s, o); return done(); }
    // 7. the ball at rest in the opponent's small area: the goalkeeper's
    if (inSmall(o, s.ball.x, s.ball.y)) { msg.push('keeperball'); freshPossession(s, o); s.noShot = 1; s.restart = 'keeper'; return done(); }
    // 8. play on
    s.rem = s0.rem - 1; s.cons = s0.last === S ? s0.cons + 1 : 1; s.last = S; s.noShot = Math.max(0, s0.noShot - 1); s.direct = false;
    if (sim.hitOppAfter && s.rem > 3) { s.rem = 3; msg.push('three'); }
    if (s.rem <= 0) { msg.push('touches'); restartFor(s, o, 'ifk', s.ball.x, s.ball.y); return done(); }
    return done();
    function done() {
      if (s.pos !== p || goal >= 0) change = true;
      checkOver(s);
      return { s, msg, goal, foul, change };
    }
  }
  function afterGoal(s, conceded) { kickoff(s, conceded); }
  function checkOver(s) {
    if (s.goals > 0) { for (let t = 0; t < 2; t++) if (s.score[t] >= s.goals) { s.over = true; s.winner = t; } }
  }
  // timed halves: the page calls this when the clock runs out (between flicks)
  function timeUp(s) {
    s = clone(s);
    if (s.half === 1) { s.half = 2; kickoff(s, 1 - s.first); s.clock = s.halfLen; return { s, msg: ['half'] }; }
    s.over = true; s.winner = s.score[0] > s.score[1] ? 0 : s.score[1] > s.score[0] ? 1 : -1; return { s, msg: ['full'] };
  }
  // the defender sets the goalkeeper (inside the small area) after a declared shot
  function keeperBox(t, pen) {
    const gy = goalY(t), sg = t === 0 ? -1 : 1;   // into the field
    const y0 = gy + sg * (KHD + .4), y1 = pen ? y0 : gy + sg * (SA_D - KHD);
    return { x0: -(SA_W / 2 - KHW), x1: SA_W / 2 - KHW, y0: Math.min(y0, y1), y1: Math.max(y0, y1) };
  }
  function setKeeper(s, t, x, y) {
    const B = keeperBox(t, s.restart === 'pen'), k = { x: Math.max(B.x0, Math.min(B.x1, x)), y: Math.max(B.y0, Math.min(B.y1, y)) };
    // not on top of a button or the ball
    for (let n = 0; n < 30; n++) {
      let hit = null;
      for (let i = 0; i < NB; i++) { const b = s.b[i]; if (Math.abs(b.x - k.x) < KHW + RB && Math.abs(b.y - k.y) < KHD + RB) { hit = b; break; } }
      if (!hit && Math.abs(s.ball.x - k.x) < KHW + RBALL + .2 && Math.abs(s.ball.y - k.y) < KHD + RBALL + .2) hit = s.ball;
      if (!hit) break;
      k.y += (t === 0 ? 1 : -1) * .6; if (k.y > B.y1 || k.y < B.y0) { k.y = Math.max(B.y0, Math.min(B.y1, k.y)); k.x += hit.x > k.x ? -1 : 1; }
    }
    s.k[t] = k; return k;
  }

  /* ---------- aiming guide: the first thing the flicked button meets, and where the ball would go ---------- */
  function aimTrace(s, i, ang) {
    const b = s.b[i], dx = Math.cos(ang), dy = Math.sin(ang);
    let best = null;
    const test = (cx, cy, r, what) => {
      const fx = cx - b.x, fy = cy - b.y, bb = fx * dx + fy * dy; if (bb <= 0) return;
      const c = fx * fx + fy * fy - r * r, disc = bb * bb - c; if (disc < 0) return;
      const k = bb - Math.sqrt(disc); if (k < 0) return;
      if (!best || k < best.k) best = { k, cx, cy, what };
    };
    for (let j = 0; j < NB; j++) if (j !== i) test(s.b[j].x, s.b[j].y, 2 * RB, j);
    test(s.ball.x, s.ball.y, RB + RBALL, 'ball');
    const lim = 70;
    if (!best || best.k > lim) return { k: lim, gx: b.x + dx * lim, gy: b.y + dy * lim, what: null };
    const gx = b.x + dx * best.k, gy = b.y + dy * best.k, nx = best.cx - gx, ny = best.cy - gy, nl = Math.hypot(nx, ny) || 1;
    return { k: best.k, gx, gy, what: best.what, ox: nx / nl, oy: ny / nl };
  }

  /* ---------- the hand's wobble ---------- */
  function rng(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function gauss(R) { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // a human flick: 1 s.d. ±0.5° / ±3% soft, ±1.1° / ±5.5% at full power; f = the board's feel (a, v, s, h multipliers)
  function wobble(shot, seed, f) {
    const R = rng(seed || 11), k = Math.min(1, shot.v / VMAX), k2 = k * k, F = Object.assign({ a: 1, v: 1, s: 1, h: 1 }, f || {});
    return { i: shot.i, ang: shot.ang + gauss(R) * (.5 * F.s + .6 * k2 * F.h) * F.a * Math.PI / 180, v: Math.max(VMIN, shot.v * (1 + gauss(R) * (.03 * F.s + .025 * k2 * F.h) * F.v)) };
  }

  /* ---------- AI ---------- */
  // the level: candidates searched, the hand's wobble, how far it looks
  function skill(lv) {
    lv = Math.max(1, Math.min(20, lv | 0)); const k = (lv - 1) / 19;
    return {
      lv, dirs: lv < 4 ? 8 : lv < 9 ? 12 : lv < 15 ? 18 : 24, pows: lv < 6 ? 3 : 4, reach: 22 + k * 22,
      angSd: (4.6 - Math.pow(k, .8) * 4.3) * Math.PI / 180, vSd: .1 - k * .075,
      robust: lv >= 12 ? (lv >= 17 ? 4 : 2) : 0, pickTop: lv <= 3 ? 4 : lv <= 7 ? 2 : 1,
      shotBar: .62 - k * .34,          // how sure of a goal it wants before declaring a shot
      keepSd: 6 - k * 5.4,             // the goalkeeper's placing error (cm)
      defend: k,                       // weight on its own shape when the ball is lost
    };
  }
  function Phi(z) { const t = 1 / (1 + .2316419 * Math.abs(z)), d = .3989423 * Math.exp(-z * z / 2), q = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - q : q; }
  function jitter(c, sk, R) { return { i: c.i, ang: c.ang + gauss(R) * sk.angSd, v: Math.max(VMIN, Math.min(VMAX, c.v * (1 + gauss(R) * sk.vSd))) }; }
  function perform(shot, level, seed) { return jitter(shot, skill(level), rng(seed || 7)); }
  // the button speed that sends the ball about `dist` cm (a straight hit; measured on this physics)
  function speedFor(dist) { return Math.max(VMIN, Math.min(VMAX, 18 + dist * .78 - dist * dist * .0012)); }
  // a flick that sends the ball off at angle th from button i (ghost-ball aim); null if the cut is too fine
  function aimAt(s, i, th, v) {
    const b = s.b[i], gx = s.ball.x - Math.cos(th) * (RB + RBALL), gy = s.ball.y - Math.sin(th) * (RB + RBALL);
    const a = Math.atan2(gy - b.y, gx - b.x), cut = Math.abs(((a - th + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
    if (cut > 1.15) return null;
    if (Math.hypot(gx - b.x, gy - b.y) < .2) return null;
    return { i, ang: a, v: v / Math.max(.45, Math.cos(cut)) };
  }
  // how well side t stands with the ball where it is (bigger = better for t), the ball t's to play
  function attackValue(s, t, rem) {
    const gx = 0, gy = goalY(1 - t), bx = s.ball.x, by = s.ball.y;
    const dGoal = Math.hypot(bx - gx, by - gy);
    let v = (H - Math.abs(by - gy)) * .55;   // ground gained
    v -= Math.abs(bx) * .12;
    // a button of t's near the ball, with a clear run to it
    let reach = 0;
    for (let i = t * 10; i < t * 10 + 10; i++) {
      const b = s.b[i], d = Math.hypot(b.x - bx, b.y - by);
      if (d < 30) { const back = (by - b.y) * fwd(t) > -2 ? 1 : .55; reach = Math.max(reach, (1 - d / 30) * back); }
    }
    v += reach * 22;
    // a shot on: close, in front, the line to goal open
    if (inAttack(t, by) && dGoal < 75) {
      const open = laneOpen(s, bx, by, gy, t);
      v += (1 - dGoal / 75) * 40 * open * (rem > 0 ? 1 : .2) * Math.max(.25, 1 - Math.abs(bx) / 45);
    }
    v += Math.min(rem, 12) * .6;
    return v;
  }
  // the share of the goal mouth the ball sees past the defenders' buttons and keeper
  function laneOpen(s, bx, by, gy, t) {
    let ok = 0, n = 0;
    for (let k = -1; k <= 1.001; k += .5) {
      const tx = k * (GHW - 1), ty = gy; n++;
      const dx = tx - bx, dy = ty - by, L2 = dx * dx + dy * dy || 1;
      let blocked = false;
      for (let i = (1 - t) * 10; i < (1 - t) * 10 + 10 && !blocked; i++) { const b = s.b[i], q = ((b.x - bx) * dx + (b.y - by) * dy) / L2; if (q > 0 && q < 1 && Math.hypot(b.x - bx - dx * q, b.y - by - dy * q) < RB + RBALL) blocked = true; }
      const K = s.k[1 - t]; if (!blocked) for (let q = 0; q <= 1; q += .02) { const x = bx + dx * q, y = by + dy * q; if (Math.abs(x - K.x) < KHW + RBALL && Math.abs(y - K.y) < KHD + RBALL) { blocked = true; break; } }
      if (!blocked) ok++;
    }
    return ok / n;
  }
  // the defensive shape of side t: buttons between the ball and their own goal
  function shapeValue(s, t) {
    const gy = goalY(t), bx = s.ball.x, by = s.ball.y; let v = 0;
    for (let i = t * 10; i < t * 10 + 10; i++) { const b = s.b[i], beh = (b.y - by) * (gy - by) > 0 && Math.abs(b.y - gy) < Math.abs(by - gy); if (beh) { const lat = Math.abs(b.x - bx * Math.abs(b.y - gy) / Math.max(1, Math.abs(by - gy))); v += Math.max(0, 1 - lat / 30); } }
    return v;
  }
  function evaluate(s0, r, p, sk) {
    const s = r.s;
    if (r.goal === p) return 1000;
    if (r.goal === 1 - p) return -1000;
    let v;
    if (s.pos === p) {
      v = 120 + attackValue(s, p, s.rem);
      if (s.restart === 'fk' || s.restart === 'corner') v += 8;
      if (s.restart === 'pen') v += 260;
    } else {
      v = -60 - attackValue(s, 1 - p, s.rem) * 1.1;
      if (s.restart === 'pen') v -= 300;
      else if (s.restart === 'fk' && inAttack(1 - p, s.ball.y)) v -= 20;
      v += shapeValue(s, p) * 6 * (sk ? sk.defend : 1);
    }
    return v;
  }
  // every flick worth trying for side s.pos
  function candidates(s, sk) {
    const t = s.pos, out = [];
    const goalDir = Math.atan2(goalY(1 - t) - s.ball.y, -s.ball.x);
    const dirs = []; for (let k = 0; k < sk.dirs; k++) dirs.push(goalDir + (k / sk.dirs) * 2 * Math.PI);
    const dists = sk.pows === 3 ? [16, 40, 75] : [12, 28, 50, 85];
    for (let i = t * 10; i < t * 10 + 10; i++) {
      if (!canFlick(s, i)) continue;
      const d = Math.hypot(s.b[i].x - s.ball.x, s.b[i].y - s.ball.y);
      if (d > sk.reach + RB) continue;
      for (const th of dirs) for (const dd of dists) { const c = aimAt(s, i, th, speedFor(dd)); if (c) { c.th = th; out.push(c); } }
    }
    return out;
  }
  // the attacker's shots at goal (the keeper already set): aim at points across the mouth
  function shotCands(s, sk) {
    const t = s.pos, gy = goalY(1 - t), out = [];
    for (let i = t * 10; i < t * 10 + 10; i++) {
      if (!canFlick(s, i)) continue;
      const d = Math.hypot(s.b[i].x - s.ball.x, s.b[i].y - s.ball.y); if (d > sk.reach + RB) continue;
      for (let k = -1; k <= 1.001; k += sk.lv < 8 ? .5 : .25) for (const v of [120, 165, 200]) {
        const th = Math.atan2(gy + (t === 0 ? -2 : 2) - s.ball.y, k * (GHW - 1.2) - s.ball.x), c = aimAt(s, i, th, v);
        if (c) { c.v = Math.min(VMAX, c.v); out.push(c); }
      }
    }
    return out;
  }
  // think: the move for side s.pos — { declare: true } (call a shot), or a flick { i, ang, v }
  function think(s, level, seed) {
    const sk = skill(level), R = rng(seed || 1), p = s.pos;
    if (s.shot) return bestShot(s, sk, R);
    // a shot worth calling?
    if (canShoot(s)) {
      const pred = clone(s); pred.shot = true; keeperFor(pred, 1 - p, Math.min(20, level + 2), (seed || 1) + 3, true);
      const sh = bestShot(pred, sk, R);
      const need = sk.shotBar * (s.rem <= 2 ? .55 : s.rem <= 4 ? .8 : 1);
      if (sh && sh.p >= need) return { declare: true, p: sh.p };
    }
    let cs = candidates(s, sk);
    if (!cs.length) cs = candidates(s, Object.assign({}, sk, { reach: 95 }));   // nobody near the ball: a long run at it
    if (!cs.length) {   // nobody near: the nearest button walks up to the ball (a deliberate miss is a furada — try a long one)
      let best = -1, bd = 1e9; for (let i = p * 10; i < p * 10 + 10; i++) if (canFlick(s, i)) { const d = Math.hypot(s.b[i].x - s.ball.x, s.b[i].y - s.ball.y); if (d < bd) { bd = d; best = i; } }
      const th = Math.atan2(goalY(1 - p) - s.ball.y, -s.ball.x), c = aimAt(s, best, th, speedFor(40)) || { i: best, ang: Math.atan2(s.ball.y - s.b[best].y, s.ball.x - s.b[best].x), v: VMAX };
      return { i: c.i, ang: c.ang, v: Math.min(VMAX, c.v) };
    }
    // a fine cut from far away often misses the ball altogether (a furada): weigh each flick by its chance of a contact
    const miss = clone(s); freshPossession(miss, 1 - p); const vMiss = evaluate(s, { s: miss, goal: -1 }, p, sk);
    const phit = c => { if (sk.lv < 4) return 1; const b = s.b[c.i], d = Math.hypot(s.ball.x - b.x, s.ball.y - b.y), cut = c.th == null ? 0 : Math.abs(((c.ang - c.th + 3 * Math.PI) % (2 * Math.PI)) - Math.PI), m = (RB + RBALL) * (1 - Math.sin(cut)) + .2; return Phi(m / Math.max(.05, d * sk.angSd)); };
    let sc = cs.map(c => { const h = phit(c); return { c, v: h * evaluate(s, resolve(s, simulate(s, c)), p, sk) + (1 - h) * vMiss }; });
    sc.sort((a, b) => b.v - a.v);
    if (sk.robust) {
      const top = sc.slice(0, 6);
      top.forEach(e => { let tot = 0; for (let k = 0; k < sk.robust; k++) tot += evaluate(s, resolve(s, simulate(s, jitter(e.c, { angSd: Math.max(sk.angSd, .006), vSd: Math.max(sk.vSd, .03) }, R))), p, sk); e.rv = e.v * .35 + tot / sk.robust * .65; });
      top.sort((a, b) => b.rv - a.rv); sc.splice(0, top.length, ...top);
    }
    const pk = sc[Math.floor(R() * Math.min(sk.pickTop, sc.length))].c;
    return { i: pk.i, ang: pk.ang, v: Math.min(VMAX, pk.v) };
  }
  // the best shot with the keeper where it stands: { i, ang, v, p (chance of a goal) }
  function bestShot(s, sk, R) {
    const cs = shotCands(s, sk), p = s.pos;
    let best = null;
    for (const c of cs) {
      const r0 = resolve(s, simulate(s, c)); let g = r0.goal === p ? 1 : 0;
      if (!g && sk.lv < 10) continue;
      // robustness: the shot with this level's own wobble
      let n = 1;
      const tries = sk.lv >= 14 ? 4 : sk.lv >= 6 ? 2 : 1;
      for (let k = 0; k < tries; k++) { const j = jitter(c, sk, R); if (resolve(s, simulate(s, j)).goal === p) g++; n++; }
      const pr = g / n;
      if (!best || pr > best.p) best = { i: c.i, ang: c.ang, v: c.v, p: pr };
    }
    if (!best) {   // nothing goes in: the hardest shot at the far corner anyway
      const c = shotCands(s, sk)[0];
      if (c) best = { i: c.i, ang: c.ang, v: c.v, p: 0 };
      else return null;
    }
    return best;
  }
  // the defender t sets its keeper against the ball where it stands; returns {x, y} (and sets it in s when set=true)
  function keeperFor(s, t, level, seed, set) {
    const sk = skill(level), R = rng(seed || 5), gy = goalY(t), B = keeperBox(t, s.restart === 'pen');
    const bx = s.ball.x, by = s.ball.y;
    let best = null;
    const xs = [], ys = [];
    for (let x = B.x0; x <= B.x1 + .01; x += (B.x1 - B.x0) / 10) xs.push(x);
    for (let y = B.y0; y <= B.y1 + .01; y += Math.max(.5, (B.y1 - B.y0) / 3)) ys.push(y);
    for (const x of xs) for (const y of ys) {
      // how much of the mouth this keeper hides from the ball (and the shooter's nearest buttons don't matter here)
      let hid = 0, n = 0;
      for (let k = -1; k <= 1.001; k += .1) {
        n++; const tx = k * GHW, dx = tx - bx, dy = gy - by;
        for (let q = 0; q <= 1; q += .015) { const px = bx + dx * q, py = by + dy * q; if (Math.abs(px - x) < KHW + RBALL && Math.abs(py - y) < KHD + RBALL) { hid++; break; } }
      }
      const v = hid / n - Math.abs(y - gy) * .004;
      if (!best || v > best.v) best = { x, y, v };
    }
    const k = { x: best.x + gauss(R) * sk.keepSd, y: best.y + gauss(R) * sk.keepSd * .3 };
    if (set) return setKeeper(s, t, k.x, k.y);
    const c = clone(s); return setKeeper(c, t, k.x, k.y);
  }

  const api = { DIM, VMAX, VMIN, team, goalY, fwd, inAttack, inSmall, inBig, newMatch, kickoff, restartFor, canShoot, canFlick, simulate, resolve, timeUp, keeperBox, setKeeper, keeperFor, aimTrace, wobble, perform, think, skill, speedFor, aimAt, clone, laneOpen };
  root.BotaoEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
