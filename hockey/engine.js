/* =====================================================================
   Table hockey — physics, special modes and AI (shared by the 3D table play atlas/games/hockey.js and the rules tour
   atlas/rules/hockey.js). No DOM. Real time: the page calls step(s, dt, inputs) every frame.
   Units: centimetres on the playing field, origin in the middle, x across (−W/2 … W/2), y along the table; player 0 defends the
   +y end (the near side), player 1 the −y end. Goals are slots in the end walls (|x| < GW/2).
   A mallet is a kinematic disc that follows its player's target (limited speed); the puck bounces off it with the mallet's
   own velocity added. "Edge shot": a fast mallet catching the puck with its side (a glancing contact) adds 30 % — the game's
   "hit it with the rim" trick.
   Modes (the menu at the start of a game): classic · block (a turning bar in the middle that bounces the puck back faster)
   · monster (two creatures wander the middle) · items (power-ups: speed, split, giant, shield, freeze) · bumper (four kicking
   posts) · warp (two linked portals on the side walls) · multi (two pucks) · chaos (block + monster + items).
   ===================================================================== */
(function (root) {
  'use strict';
  const W = 40, L = 62, GW = 13, RP = 2, RM = 3.1, CREASE = 0;
  const VMAX = 100, VSMASH = 140, DAMP = .4, E_WALL = .85, E_MAL = .85, MALLET_V = 600, MALLET_HUMAN = 1200;   // (2026-11-09/10: slowed three times — a table this small can't be played at air-hockey speed)
  // a player's mallet follows the pointer almost at once (1200 cm/s; at 600 it trailed the hand and felt laggy); the AI keeps 600 × its level cap
  const DIM = { W, L, GW, RP, RM, VMAX };
  const MODES = ['classic', 'block', 'monster', 'items', 'bumper', 'warp', 'multi', 'chaos'];
  const ITEMS = ['speed', 'split', 'giant', 'shield', 'freeze'];
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const has = (s, g) => s.mode === g || (s.mode === 'chaos' && (g === 'block' || g === 'monster' || g === 'items'));

  function newMatch(o) {
    o = o || {};
    const s = { mode: MODES.includes(o.mode) ? o.mode : 'classic', target: o.target || 7, score: [0, 0], t: 0, over: -1, R: rng(o.seed || (Date.now() & 0xffffff)),
      mal: [{ x: 0, y: L / 2 - 8, vx: 0, vy: 0, r: RM, big: 0, slow: 0, tx: 0, ty: L / 2 - 8 }, { x: 0, y: -L / 2 + 8, vx: 0, vy: 0, r: RM, big: 0, slow: 0, tx: 0, ty: -L / 2 + 8 }],
      pucks: [], mons: [], items: [], shield: [0, 0], nextItem: 4, bar: 0, last: -1, pause: 0, ev: [], serveTo: o.first == null ? 0 : o.first };
    if (has(s, 'monster')) for (let i = 0; i < 2; i++) s.mons.push({ x: (i ? 1 : -1) * 9, y: 0, vx: (i ? -1 : 1) * 14, vy: 6, r: 2.6, dash: 0, t: s.R() * 3 });
    serve(s, s.serveTo); if (s.mode === 'multi') serve(s, 1 - s.serveTo, true);
    return s;
  }
  // a puck is put down in the half of the player who receives it, a little off the middle line
  function serve(s, to, extra) {
    const p = { x: (s.R() - .5) * 10, y: (to === 0 ? 1 : -1) * (extra ? 14 : 9), vx: 0, vy: 0, fire: 0, id: (s.pid = (s.pid || 0) + 1), wait: extra ? 0 : .6 };
    s.pucks.push(p); s.ev.push({ k: 'serve', to, id: p.id }); return p;
  }
  // the bounds of a mallet: its own half, inside the walls
  function clampMal(m, side) {
    const r = m.r, y0 = side === 0 ? r + .2 : -L / 2 + r, y1 = side === 0 ? L / 2 - r : -r - .2;
    m.tx = Math.max(-W / 2 + r, Math.min(W / 2 - r, m.tx)); m.ty = Math.max(y0, Math.min(y1, m.ty));
  }
  const PORTAL = [[-W / 2 + 2.2, 0], [W / 2 - 2.2, 0]], PR = 2.8;
  const BUMPERS = [[-9, -12], [9, -12], [-9, 12], [9, 12]], BR = 2.2;
  const BAR = 9;   // the turning bar's half length (block mode)

  // inputs: [{ tx, ty } | null, …] the mallets' targets (cm); dt seconds
  function step(s, dt, inputs) {
    s.ev.length = 0;
    if (s.over >= 0) return s;
    s.t += dt;
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    // targets
    // (the target is spread over the sub-steps: a low frame rate does not turn a smooth swing into jerks)
    for (let i = 0; i < 2; i++) { const m = s.mal[i], q = inputs && inputs[i]; m.px = m.tx; m.py = m.ty; if (q) { m.tx = q.tx; m.ty = q.ty; } clampMal(m, i); m.ex = m.tx; m.ey = m.ty; }
    // timers
    for (let i = 0; i < 2; i++) { const m = s.mal[i]; if (m.big > 0) { m.big -= dt; if (m.big <= 0) s.ev.push({ k: 'end', what: 'giant', side: i }); } m.r = m.big > 0 ? RM * 1.6 : RM; if (m.slow > 0) m.slow -= dt; if (s.shield[i] > 0) { s.shield[i] -= dt; if (s.shield[i] <= 0) s.ev.push({ k: 'end', what: 'shield', side: i }); } }
    if (has(s, 'block')) s.bar = (s.bar + dt * 1.15) % (Math.PI * 2);
    if (has(s, 'items')) { s.nextItem -= dt; if (s.nextItem <= 0 && s.items.length < 2) { s.items.push({ k: ITEMS[Math.floor(s.R() * ITEMS.length)], x: (s.R() - .5) * (W - 10), y: (s.R() - .5) * 14, t: 0 }); s.nextItem = 5 + s.R() * 4; s.ev.push({ k: 'item' }); } s.items.forEach(it => it.t += dt); s.items = s.items.filter(it => it.t < 12); }
    if (s.pause > 0) { s.pause -= dt; if (s.pause <= 0 && !s.pucks.length) { serve(s, s.serveTo); if (s.mode === 'multi') serve(s, 1 - s.serveTo, true); } }
    for (let k = 0; k < n; k++) { const f = (k + 1) / n; for (const m of s.mal) { m.tx = m.px + (m.ex - m.px) * f; m.ty = m.py + (m.ey - m.py) * f; } sub(s, h); }
    // a puck left still out of reach (2.5 s; 1.2 s in a corner or against an end wall) is given a small nudge toward the open table
    for (const p of s.pucks) {
      if (p.wait > 0) continue;
      if (Math.hypot(p.vx, p.vy) < 6) {
        const corner = Math.abs(p.y) > L / 2 - RP - 2 || (Math.abs(p.x) > W / 2 - RP - 2 && Math.abs(p.y) > L / 2 - RP - 5);   // (in a corner or against an end wall)
        p.still = (p.still || 0) + dt;
        if (p.still > (corner ? 1.2 : 2.5)) { const a = Math.atan2(-p.y * .6, -p.x) + (s.R() - .5) * .8; p.vx = Math.cos(a) * 45; p.vy = Math.sin(a) * 45; p.still = 0; s.ev.push({ k: 'nudge' }); }
      } else p.still = 0;
    }
    return s;
  }
  function sub(s, h) {
    // mallets move toward their targets at a limited speed
    for (let i = 0; i < 2; i++) {
      const m = s.mal[i], vmax = (m.aiCap ? MALLET_V * m.aiCap : MALLET_HUMAN) * (m.slow > 0 ? .3 : 1), dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy), mv = Math.min(d, vmax * h);
      const nx = d > 1e-6 ? m.x + dx / d * mv : m.x, ny = d > 1e-6 ? m.y + dy / d * mv : m.y;
      m.vx = (nx - m.x) / h; m.vy = (ny - m.y) / h; m.x = nx; m.y = ny;
    }
    // monsters wander the middle band
    for (const mo of s.mons) {
      mo.t -= h; if (mo.t <= 0) { const a = s.R() * Math.PI * 2, sp = 10 + s.R() * 14; mo.vx = Math.cos(a) * sp; mo.vy = Math.sin(a) * sp * .6; mo.t = 1.2 + s.R() * 2.4; if (s.R() < .2) { mo.dash = .5; mo.vx *= 3; mo.vy *= 2; } }
      if (mo.dash > 0) { mo.dash -= h; if (mo.dash <= 0) { mo.vx /= 3; mo.vy /= 2; } }
      mo.x += mo.vx * h; mo.y += mo.vy * h;
      if (Math.abs(mo.x) > W / 2 - mo.r) { mo.x = Math.sign(mo.x) * (W / 2 - mo.r); mo.vx = -mo.vx; }
      if (Math.abs(mo.y) > 15) { mo.y = Math.sign(mo.y) * 15; mo.vy = -mo.vy; }
    }
    for (let a = 0; a < s.mons.length; a++) for (let b = a + 1; b < s.mons.length; b++) { const A = s.mons[a], B = s.mons[b], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), md = A.r + B.r; if (d < md && d > 1e-6) { const nx = dx / d, ny = dy / d, o = (md - d) / 2; A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o; [A.vx, B.vx] = [B.vx, A.vx]; [A.vy, B.vy] = [B.vy, A.vy]; } }
    // pucks
    for (const p of s.pucks) {
      if (p.wait > 0) { p.wait -= h; continue; }
      const dmp = Math.exp(-DAMP * h); p.vx *= dmp; p.vy *= dmp;
      if (p.fire > 0) p.fire -= h;
      const cap = p.fire > 0 ? VSMASH * 1.15 : VSMASH, sp = Math.hypot(p.vx, p.vy); if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp; }
      p.x += p.vx * h; p.y += p.vy * h;
      // side walls
      if (p.x < -W / 2 + RP) { p.x = -W / 2 + RP; p.vx = Math.abs(p.vx) * E_WALL; wall(s, p); } else if (p.x > W / 2 - RP) { p.x = W / 2 - RP; p.vx = -Math.abs(p.vx) * E_WALL; wall(s, p); }
      // end walls (the goal mouth is open), shields
      for (const side of [0, 1]) {
        const sg = side === 0 ? 1 : -1, yw = sg * (L / 2 - RP);
        if (sg * p.y > sg * yw) {
          const inMouth = Math.abs(p.x) < GW / 2 - RP * .3;
          if (s.shield[side] > 0 || !inMouth) { p.y = yw; p.vy = -sg * Math.abs(p.vy) * E_WALL; wall(s, p, s.shield[side] > 0 && inMouth ? 'shield' : 'wall'); }
          else if (sg * p.y > sg * (L / 2 + RP)) { goal(s, p, 1 - side); }
          else if (Math.abs(p.x) > GW / 2 - RP) { p.x = Math.sign(p.x) * (GW / 2 - RP); p.vx = -p.vx * E_WALL; }   // the mouth's posts
        }
      }
      if (p.gone) continue;
      // mallets
      for (let i = 0; i < 2; i++) hitMallet(s, p, s.mal[i], i);
      // block mode: the turning bar (a capsule) bounces the puck back harder
      if (has(s, 'block')) {
        const c = Math.cos(s.bar), sn = Math.sin(s.bar), u = Math.max(-BAR, Math.min(BAR, p.x * c + p.y * sn)), qx = u * c, qy = u * sn;
        const dx = p.x - qx, dy = p.y - qy, d = Math.hypot(dx, dy), md = RP + 1;
        if (d < md && d > 1e-6) {
          const nx = dx / d, ny = dy / d, wv = 1.15 * u, bvx = -sn * wv, bvy = c * wv, rvx = p.vx - bvx, rvy = p.vy - bvy, vn = rvx * nx + rvy * ny;
          p.x = qx + nx * md; p.y = qy + ny * md;
          if (vn < 0) { p.vx = bvx + rvx - 2.15 * vn * nx; p.vy = bvy + rvy - 2.15 * vn * ny; s.ev.push({ k: 'block', x: p.x, y: p.y }); }
        }
      }
      for (const mo of s.mons) bounceCircle(s, p, mo.x, mo.y, mo.r, 1.05, mo.vx, mo.vy, 'monster', true);
      if (s.mode === 'bumper') for (const [bx, by] of BUMPERS) bounceCircle(s, p, bx, by, BR, 1.35, 0, 0, 'bumper');
      if (s.mode === 'warp' && !(p.warpT > 0)) for (let k = 0; k < 2; k++) { const [wx, wy] = PORTAL[k]; if (Math.hypot(p.x - wx, p.y - wy) < PR) { const [ox, oy] = PORTAL[1 - k]; p.x = ox - Math.sign(ox) * (PR + RP + .3); p.y = oy + (p.y - wy); p.vx = -Math.sign(ox) * Math.max(60, Math.abs(p.vx)); p.warpT = .4; s.ev.push({ k: 'warp', from: k }); break; } }
      if (p.warpT > 0) p.warpT -= h;
      // items: the puck picks one up for the player who touched it last
      for (let j = s.items.length - 1; j >= 0; j--) { const it = s.items[j]; if (Math.hypot(p.x - it.x, p.y - it.y) < RP + 2.2) { s.items.splice(j, 1); useItem(s, it.k, s.last >= 0 ? s.last : (p.y > 0 ? 1 : 0), p); } }
    }
    // pucks touching pucks (multi / split)
    for (let a = 0; a < s.pucks.length; a++) for (let b = a + 1; b < s.pucks.length; b++) {
      const A = s.pucks[a], B = s.pucks[b]; if (A.gone || B.gone || A.wait > 0 || B.wait > 0) continue;
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), md = 2 * RP;
      if (d < md && d > 1e-6) { const nx = dx / d, ny = dy / d, o = (md - d) / 2; A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o; const vn = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny; if (vn < 0) { A.vx += vn * nx; A.vy += vn * ny; B.vx -= vn * nx; B.vy -= vn * ny; } }
    }
    s.pucks = s.pucks.filter(p => !p.gone);
    if (s.over < 0 && !s.pucks.length && !(s.pause > 0)) serve(s, s.serveTo);
  }
  function wall(s, p, k) { const v = Math.hypot(p.vx, p.vy); if (v > 25) s.ev.push({ k: k || 'wall', v, x: p.x, y: p.y }); }
  function bounceCircle(s, p, cx, cy, r, e, vx, vy, k, rnd) {
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy), md = RP + r;
    if (d >= md || d < 1e-6) return;
    let nx = dx / d, ny = dy / d;
    if (rnd) { const a = (s.R() - .5) * .5, c = Math.cos(a), sn = Math.sin(a); [nx, ny] = [nx * c - ny * sn, nx * sn + ny * c]; }
    p.x = cx + nx * md; p.y = cy + ny * md;
    const rvx = p.vx - vx, rvy = p.vy - vy, vn = rvx * nx + rvy * ny;
    if (vn < 0) { p.vx = vx + rvx - (1 + e) * vn * nx; p.vy = vy + rvy - (1 + e) * vn * ny; if (k === 'bumper') { const sp = Math.hypot(p.vx, p.vy); if (sp < 90) { p.vx *= 90 / sp; p.vy *= 90 / sp; } } s.ev.push({ k, x: p.x, y: p.y, v: -vn }); }
  }
  function hitMallet(s, p, m, i) {
    const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy), md = RP + m.r;
    if (d >= md) return;
    const nx = d > 1e-6 ? dx / d : 0, ny = d > 1e-6 ? dy / d : (i === 0 ? -1 : 1);
    p.x = m.x + nx * md; p.y = m.y + ny * md;
    const rvx = p.vx - m.vx, rvy = p.vy - m.vy, vn = rvx * nx + rvy * ny;
    if (vn >= 0) { s.last = i; return; }
    p.vx = m.vx + rvx - (1 + E_MAL) * vn * nx; p.vy = m.vy + rvy - (1 + E_MAL) * vn * ny;
    // the edge shot: a fast mallet meeting the puck with its side (contact 50–80° off its own direction of travel)
    const mv = Math.hypot(m.vx, m.vy); let edge = false;
    if (mv > 70 && !(p.edgeT > s.t)) { const c = (m.vx * nx + m.vy * ny) / mv; if (c > .17 && c < .64) { p.vx *= 1.3; p.vy *= 1.3; edge = true; p.edgeT = s.t + .25; } }
    const sp = Math.hypot(p.vx, p.vy), cap = edge || p.fire > 0 ? VSMASH : VMAX; if (sp > cap) { p.vx *= cap / sp; p.vy *= cap / sp; }
    // the puck cannot be pinned through the mallet into the wall: push the mallet's bounds
    s.last = i; s.ev.push({ k: edge ? 'edge' : 'hit', side: i, v: Math.hypot(p.vx, p.vy), x: p.x, y: p.y });
  }
  function goal(s, p, side) {
    p.gone = true; s.score[side]++; s.serveTo = 1 - side; s.last = -1;
    s.ev.push({ k: 'goal', side, x: p.x });
    s.pucks.forEach(q => { if (!q.gone) q.gone = true; });   // every puck comes off: a fresh serve
    if (s.score[side] >= s.target) { s.over = side; s.ev.push({ k: 'over', side }); }
    else { s.pause = 1.1; }
  }
  function useItem(s, k, side, p) {
    s.ev.push({ k: 'pick', what: k, side });
    if (k === 'speed') { p.fire = 5; const sp = Math.hypot(p.vx, p.vy) || 1, v = Math.min(VSMASH, Math.max(sp * 1.6, 160)); p.vx *= v / sp; p.vy *= v / sp; }
    else if (k === 'split') { for (const a of [-.45, .45]) { const c = Math.cos(a), sn = Math.sin(a); s.pucks.push({ x: p.x, y: p.y, vx: p.vx * c - p.vy * sn, vy: p.vx * sn + p.vy * c, fire: 0, id: (s.pid = (s.pid || 0) + 1), wait: 0 }); } p.vx *= .2; p.vy *= .2; p.wait = 0; p.gone = false; }
    else if (k === 'giant') s.mal[side].big = 8;
    else if (k === 'shield') s.shield[side] = 8;
    else if (k === 'freeze') s.mal[1 - side].slow = 3.5;
  }

  /* ---------- AI (Lv.1–20) ---------- */
  function aiSkill(level) {
    const k = (Math.max(1, Math.min(20, level)) - 1) / 19;
    return { cap: .12 + .88 * Math.pow(k, .8), react: .32 - .29 * k, err: 5 - 4.4 * k, attack: .35 + .65 * k, bank: level >= 9, lead: .6 + .4 * k };
  }
  // where a puck will cross the line y = yl (bouncing off the side walls), or null
  function cross(p, yl) {
    if (Math.abs(p.vy) < 1e-3) return null;
    const t = (yl - p.y) / p.vy; if (t < 0 || t > 3) return null;
    let x = p.x + p.vx * t; const lo = -W / 2 + RP, span = W - 2 * RP;
    x = ((x - lo) % (2 * span) + 2 * span) % (2 * span); if (x > span) x = 2 * span - x;
    return { x: x + lo, t };
  }
  // mem: the AI's own memory between frames ({ seen, at, plan })
  function aiTarget(s, side, level, mem, dt) {
    const sk = aiSkill(level), m = s.mal[side], sg = side === 0 ? 1 : -1, home = { x: 0, y: sg * (L / 2 - 6) };
    m.aiCap = sk.cap;
    mem.cool = (mem.cool || 0) - dt;
    // it sees the table a little late (reaction)
    mem.buf = mem.buf || []; mem.buf.push({ t: s.t, pucks: s.pucks.map(p => ({ x: p.x, y: p.y, vx: p.vx, vy: p.vy, wait: p.wait })) });
    while (mem.buf.length > 1 && s.t - mem.buf[1].t >= sk.react) mem.buf.shift();
    const seen = mem.buf[0].pucks.filter(p => !(p.wait > 0));
    if (!seen.length) return { tx: home.x, ty: home.y };
    // the puck that matters most: the one coming fastest toward its goal, else the nearest in its half
    let p = null, best = -1e9;
    for (const q of seen) { const toward = q.vy * sg, inHalf = q.y * sg > 0, sc = (toward > 0 ? toward + 200 : 0) + (inHalf ? 120 - Math.abs(q.y - m.y) : -Math.abs(q.y)); if (sc > best) { best = sc; p = q; } }
    if (mem.err == null || mem.cool <= 0) { mem.err = (Math.random() - .5) * 2 * sk.err; mem.cool = .5; }
    const inHalf = p.y * sg > 0, coming = p.vy * sg > 20, slow = Math.hypot(p.vx, p.vy) < 70;
    // defend: meet the puck on the defence line
    if (coming && !(inHalf && slow)) {
      const yl = sg * (L / 2 - 7), c = cross(p, yl);
      const x = c ? c.x : p.x;
      return { tx: x + mem.err * .6, ty: yl };
    }
    // (2026-11-10) it stops ramming: after pushing at a puck that won't come out (stuck in a corner / against a wall) it backs
    // off for a moment, and the choice to attack is held for half a second instead of re-rolled every frame
    mem.back = (mem.back || 0) - dt;
    if (mem.back > 0) return { tx: home.x * .5 + p.x * .5, ty: home.y };
    const near = Math.hypot(m.x - p.x, m.y - p.y) < m.r + RP + 3, still = Math.hypot(p.vx, p.vy) < 25;
    mem.jam = near && still && inHalf ? (mem.jam || 0) + dt : 0;
    if (mem.jam > .9) { mem.jam = 0; mem.back = .7; mem.strike = 0; mem.bankSide = null; }
    mem.modeT = (mem.modeT || 0) - dt;
    if (mem.modeT <= 0) { mem.att = Math.random() < sk.attack + .4; mem.modeT = .5; }
    // attack: a puck in its half → come from behind it toward the far goal (a bank off a side wall at higher levels)
    if (inHalf && mem.att) {
      let gx = mem.err * .5, gy = -sg * (L / 2 + 2);
      if (sk.bank && Math.abs(p.x) > 6 && mem.bankSide == null) mem.bankSide = Math.random() < .5 ? 1 : 0;
      if (sk.bank && mem.bankSide === 1) { const wx = Math.sign(p.x || 1) * W / 2; gx = 2 * wx - gx; }
      let ax = gx - p.x, ay = gy - p.y, al = Math.hypot(ax, ay), ux = ax / al, uy = ay / al;
      const reach = (x, y) => Math.abs(x) <= W / 2 - m.r + .2 && y * sg >= m.r - .2 && y * sg <= L / 2 - m.r + .2;   // where its mallet can be
      const bh = (cx, cy) => ({ x: p.x - cx * (RP + m.r + 1.5), y: p.y - cy * (RP + m.r + 1.5) });
      let behind = bh(ux, uy);
      if (!reach(behind.x, behind.y)) {   // a puck in a corner or on a wall: turn the shot (toward the open table) until the mallet can get behind it
        let ok = null;
        const onL = p.x < -W / 2 + RP + 1.2, onR = p.x > W / 2 - RP - 1.2;   // (a shot into the wall it lies on does nothing)
        // the mallet may stand a little off the line (clamped inside its reach): a glancing hit still sends the puck along the wall
        const clampR = b => ({ x: Math.max(-(W / 2 - m.r), Math.min(W / 2 - m.r, b.x)), y: sg * Math.max(m.r, Math.min(L / 2 - m.r, b.y * sg)) });
        for (let k = 0; k <= 5 && !ok; k++) for (const sgn of [1, -1]) { const a = Math.atan2(uy, ux) + sgn * k * .2, cx = Math.cos(a), cy = Math.sin(a); if (cy * sg > -.2 || (onL && cx < -.05) || (onR && cx > .05)) continue; const b = bh(cx, cy), c = clampR(b); if (Math.hypot(c.x - b.x, c.y - b.y) < 2.3) { ok = [cx, cy, c]; break; } }
        if (!ok) { mem.back = .6; return { tx: home.x, ty: home.y }; }   // no clean shot (a corner): stand off and let the puck be nudged out
        [ux, uy, behind] = ok;
      }
      const dB = Math.hypot(m.x - behind.x, m.y - behind.y);
      if (dB < 2.5 || mem.strike > 0) { mem.strike = (mem.strike || .18) - dt; if (mem.strike <= 0) { mem.strike = 0; mem.bankSide = null; } return { tx: p.x + ux * 8, ty: p.y + uy * 8 }; }   // strike through it
      // come round the puck without knocking it toward its own goal
      const side2 = (m.y - p.y) * sg < 0 ? { x: behind.x + (m.x < p.x ? -1 : 1) * (m.r + 3), y: behind.y } : behind;
      return { tx: side2.x, ty: side2.y };
    }
    // otherwise: guard, between the puck and its goal
    const gy = sg * (L / 2 - 5), f = .35;
    return { tx: p.x * f + mem.err * .3, ty: gy + (p.y - gy) * .15 };
  }

  const API = { DIM, MODES, ITEMS, PORTAL, PR, BUMPERS, BR, BAR, newMatch, step, serve, aiTarget, aiSkill, rng, has };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.HockeyEngine = API;
})(typeof self !== 'undefined' ? self : this);
