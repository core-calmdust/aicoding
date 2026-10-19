// Backgammon V2 — dice throws drawn in 3D on a canvas
//
// plan():   lays out the whole throw before it is shown: each die drops from the hand, makes three bounces of decreasing
//           height under constant gravity while tumbling, rolls over its edges, tips over and settles (see choreo()).
//           The resting orientation is fixed first; the faces are then labelled (a rotation of the standard die, so
//           opposite faces still sum to 7 and the chirality is kept) so the rolled number ends on top.
// draw():   renders one instant with a camera above each die (so a die in the air looks bigger, and a resting die looks
//           exactly like the flat dice of the page): shaded faces with pips, and a soft shadow that is the projection of
//           the cube onto the board from a fixed light.
// Units are board units (the page's --u); x to the right, y down the screen, z up out of the board.
(function (root) {
  'use strict';
  const A = 0.82, H = A / 2;                // die edge (matches .die in the CSS)
  const DT = 1 / 120;

  // ---- small vector / matrix helpers (3x3 row-major)
  const mul = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
  const mm = (a, b) => { const r = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]; return r; };
  const det = m => m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  const qmat = (x, y, z, w) => [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
  // the 24 rotations of a cube (signed permutation matrices with determinant +1)
  const ROTS = (() => {
    const out = [], perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    for (const p of perms) for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
      const m = [0, 0, 0, 0, 0, 0, 0, 0, 0], s = [sx, sy, sz];
      for (let r = 0; r < 3; r++) m[r * 3 + p[r]] = s[r];
      if (det(m) > 0) out.push(m);
    }
    return out;
  })();
  // the standard die in its own frame: normal n, in-face axes u (pip columns) and w (pip rows) with u × w = n.
  // 1-2-3 run counter-clockwise around their shared corner (y points down the screen, so 3 sits on −y).
  const FACES = [
    { v: 1, n: [0, 0, 1], u: [1, 0, 0], w: [0, 1, 0] }, { v: 6, n: [0, 0, -1], u: [1, 0, 0], w: [0, -1, 0] },
    { v: 2, n: [1, 0, 0], u: [0, 1, 0], w: [0, 0, 1] }, { v: 5, n: [-1, 0, 0], u: [0, -1, 0], w: [0, 0, 1] },
    { v: 3, n: [0, -1, 0], u: [1, 0, 0], w: [0, 0, 1] }, { v: 4, n: [0, 1, 0], u: [0, 0, 1], w: [1, 0, 0] }];
  const FACE_OF = v => FACES.find(f => f.v === v);
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

  // ---- quaternions [x, y, z, w]
  const qmul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  const qaxis = (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; };
  const QP = Math.PI / 2;
  // height of a cube's centre above the floor when it is turned by phi about a horizontal axis parallel to two faces
  const support = phi => H * (Math.abs(Math.cos(phi)) + Math.abs(Math.sin(phi)));
  // distance the centre travels while a cube rolls over its edges from phi = 0 to phi (continuous, A per quarter turn)
  const rollDist = phi => { const q = phi / QP, k = Math.floor(q), f = (q - k) * QP; return k * A + H * (Math.sin(f) - Math.cos(f)) + H; };

  // ---- one die's throw (choreographed, but every part follows simple mechanics):
  //  * the lowest point of the die follows parabolas under one constant gravity: a drop from the hand, then exactly three
  //    bounces whose heights fall by a constant ratio (h, r·h, r²·h) — so their durations go with √h;
  //  * the centre sits on top of that lowest point (support height of the tilted cube), so the die never sinks into the felt;
  //  * it tumbles steadily about the horizontal axis across its path; each impact slows the spin and the forward speed;
  //  * after the last bounce it rolls over its edges — centre travel tied to the turned angle, no sliding — slows down,
  //    tips over one last time (slow over the top, falling flat), and rocks back a little before resting.
  // The resting orientation is fixed in advance and the turned angle is counted back from it, so the motion is continuous.
  function choreo(o) {
    const g = o.g, r = o.r, d = o.d, k = [-d[1], d[0], 0];          // k = z × d: turning about k rolls the top towards d
    // drop from the hand: lowest point from z0 with upward speed vz0 until it touches the floor
    const T0 = (o.vz0 + Math.sqrt(o.vz0 * o.vz0 + 2 * g * o.z0)) / g;
    const hs = [o.h, o.h * r, o.h * r * r], vs = hs.map(h => Math.sqrt(2 * g * h)), Ts = vs.map(v => 2 * v / g);
    const tImp = [T0, T0 + Ts[0], T0 + Ts[0] + Ts[1], T0 + Ts[0] + Ts[1] + Ts[2]];
    const us = [o.u0, o.u0 * o.fu, o.u0 * o.fu * o.fu, o.u0 * Math.pow(o.fu, 3)];      // forward speed per flight
    const ws = [o.w0, o.w0 * o.fw, o.w0 * o.fw * o.fw, o.w0 * Math.pow(o.fw, 3)];      // spin per flight
    const tA = tImp[3];
    // forward distance and turned angle at the end of each flight
    const sAt = [0], thAt = [0];
    const segs = [[0, T0], [T0, tImp[1]], [tImp[1], tImp[2]], [tImp[2], tImp[3]]];
    segs.forEach(([a, b], i) => { sAt.push(sAt[i] + us[i] * (b - a)); thAt.push(thAt[i] + ws[i] * (b - a)); });
    // on the floor: roll the rest of the current quarter (plus o.extra quarters) at the speed left after the last impact,
    // then the final tip, slow over the top and falling flat
    const wIn = ws[3] * o.fw, rem = o.rem, tRem = rem / wIn;
    const wTip = wIn * 0.85, c = 0.3, tTip = QP * (1 + c) / wTip;
    const Theta = thAt[4] + rem + QP;                                 // the angle at which the die lies flat for good
    const tFlat = tA + tRem + tTip, tRock = 0.14, tEnd = tFlat + tRock;
    const phiAt = t => {                                               // turned angle relative to the final orientation (≤ 0)
      let th;
      if (t <= tA) { let i = 0; while (i < 3 && t > segs[i][1]) i++; th = thAt[i] + ws[i] * (Math.max(segs[i][0], t) - segs[i][0]); }
      else if (t <= tA + tRem) th = thAt[4] + wIn * (t - tA);
      else { const s = Math.min(1, (t - tA - tRem) / tTip); th = thAt[4] + rem + QP * (s - c * Math.sin(2 * Math.PI * s) / (2 * Math.PI)); }
      return th - Theta;
    };
    const phiA = phiAt(tA), sA = sAt[4];
    const fwd = t => {                                                // distance along the path
      if (t <= tA) { let i = 0; while (i < 3 && t > segs[i][1]) i++; return sAt[i] + us[i] * (t - segs[i][0]); }
      return sA + rollDist(phiAt(Math.min(t, tFlat)) + 8 * QP) - rollDist(phiA + 8 * QP);
    };
    const sFlat = fwd(tFlat);
    const low = t => {                                                // height of the lowest point
      if (t < 0) return o.z0 + o.vz0 * t - g * t * t / 2;
      if (t <= T0) return o.z0 + o.vz0 * t - g * t * t / 2;
      for (let i = 0; i < 3; i++) if (t <= tImp[i + 1]) { const u = t - tImp[i]; return Math.max(0, vs[i] * u - g * u * u / 2); }
      return 0;
    };
    // small wobble about the path direction and a slight turn about the vertical, both dying out before the die lands for the last time
    const env = t => t >= tA ? 0 : Math.pow(1 - Math.max(0, t) / tA, 2);
    const wob = t => o.wob * env(t) * Math.sin(2 * Math.PI * 2.2 * t + o.ph);
    const yawW = t => o.yawW * env(t);
    const Qf = qaxis([0, 0, 1], Math.atan2(d[1], d[0]) + o.yaw0);     // final orientation: lying flat, faces along the path
    const at = t => {
      let s, z, q;
      if (t < tFlat) {
        const phi = phiAt(t), w = wob(t);
        s = t < 0 ? us[0] * t : fwd(t);
        z = low(t) + support(phi) * (Math.abs(Math.cos(w)) + Math.abs(Math.sin(w)));
        q = qmul(qaxis([0, 0, 1], yawW(t)), qmul(qaxis([d[0], d[1], 0], w), qmul(qaxis(k, phi), Qf)));
      } else {                                                        // rocking back on the rear edge, twice, smaller each time
        const u = Math.min(t, tEnd) - tFlat;
        const rho = u < 0.08 ? 0.085 * Math.sin(Math.PI * u / 0.08) : 0.03 * Math.max(0, Math.sin(Math.PI * (u - 0.08) / 0.06));
        s = sFlat - H + H * Math.cos(rho) - H * Math.sin(rho); z = H * Math.sin(rho) + H * Math.cos(rho);
        q = qmul(qaxis(k, -rho), Qf);
      }
      const lat = o.curve * s * s;                                    // a slight curve
      return [o.x0 + d[0] * s - d[1] * lat, o.y0 + d[1] * s + d[0] * lat, z, q];
    };
    const impacts = [[T0, Math.sqrt(o.vz0 * o.vz0 + 2 * g * o.z0)], ...vs.map((v, i) => [tImp[i + 1], v * r ** 0.5]), [tFlat, 1.2]];
    return { at, tEnd, Qf, impacts, sEnd: sFlat };
  }
  // the dice of one half: parameters drawn at random (same throw for both, with small differences), retried until the
  // paths stay on the board, end in the half and never overlap
  function planGroup(items, opt, rnd) {
    const R = (a, b) => a + rnd() * (b - a);
    for (let tries = 0; tries < 60; tries++) {
      const it0 = items[0], dir = it0.dir, outer = dir > 0 ? it0.hx1 : it0.hx0, halfW = it0.hx1 - it0.hx0;
      const ang = R(-0.2, 0.2), side = rnd() < 0.5 ? -1 : 1;
      const base = { g: 95, r: 0.45, h: R(0.75, 0.9), z0: R(0.9, 1.15), vz0: R(0.3, 0.7), u0: R(3.0, 3.5), fu: 0.88, w0: R(14.5, 17.5), fw: 0.82 };
      const dice = items.map((it, i) => {
        const delay = i ? R(0.06, 0.12) : 0, lane = items.length > 1 ? (i ? 1 : -1) * side * R(0.6, 0.75) : 0;
        const a = ang + R(-0.06, 0.06), d = [-dir * Math.cos(a), -dir * Math.sin(a)];
        const p = Object.assign({}, base, {
          d, x0: outer - dir * R(0.35, 0.55) - d[1] * lane * 0, y0: lane, h: base.h * R(0.9, 1.1), u0: base.u0 * R(0.93, 1.07), w0: base.w0 * R(0.88, 1.12),
          rem: R(0.25, 1.25), wob: R(0.12, 0.25), ph: R(0, 6.3), yawW: R(-0.35, 0.35), yaw0: 0, curve: R(-0.03, 0.03) });
        const c = choreo(p);
        return { it, delay, c, at: t => c.at(t - delay), end: delay + c.tEnd };
      });
      const dur = Math.max(...dice.map(x => x.end));
      if (dur < 1.05 || dur > 1.45) continue;
      const n = Math.ceil(dur / DT) + 1, frames = [];
      for (let f = 0; f < n; f++) {
        const t = f * DT, fr = new Float32Array(dice.length * 7);
        dice.forEach((x, i) => { const [px, py, pz, q] = x.at(Math.min(t, x.end)); fr.set([px, py, pz, q[0], q[1], q[2], q[3]], i * 7); });
        frames.push(fr);
      }
      // place the group: centre the resting dice on yMid (a sideways shift changes nothing in the motion)
      const last = frames[n - 1], m = dice.length;
      let my = 0; for (let i = 0; i < m; i++) my += last[i * 7 + 1]; my /= m;
      const dy = opt.yMid + R(-0.1, 0.1) - my;
      let ok = true;
      for (const f of frames) for (let i = 0; i < m && ok; i++) {
        f[i * 7 + 1] += dy;
        const x = f[i * 7], y = f[i * 7 + 1];
        if (y < opt.yMin + A * 0.62 || y > opt.yMax - A * 0.62) ok = false;
        if (x < it0.hx0 + H - 1e-6 || x > it0.hx1 - H + 1e-6) { if (f[i * 7 + 2] < H * 1.5) ok = false; }   // only in the air may it pass the rim
      }
      if (!ok) continue;
      // rest: inside the half, in the band, apart
      const rest = dice.map((x, i) => ({ x: last[i * 7], y: last[i * 7 + 1] }));
      if (rest.some(p => p.x < it0.hx0 + A * 0.7 || p.x > it0.hx1 - A * 0.7 || Math.abs(p.y - opt.yMid) > opt.band)) continue;
      // never overlapping: the centres always stay further apart than the diagonal of a die
      if (m === 2) {
        let bad = false;
        for (const f of frames) { const dd = Math.hypot(f[0] - f[7], f[1] - f[8]); if (dd < A * 1.42) { bad = true; break; } }
        if (bad) continue;
      }
      const out = dice.map((x, i) => {
        const mf = qmat(...x.c.Qf);
        const up = [0, 0, 0]; let best = 0, axis = 0;
        for (let kx = 0; kx < 3; kx++) if (Math.abs(mf[6 + kx]) > Math.abs(best)) { best = mf[6 + kx]; axis = kx; }
        up[axis] = Math.sign(best);
        const target = FACE_OF(x.it.v).n, cands = ROTS.filter(Rm => { const p = mul(Rm, target); return p[0] === up[0] && p[1] === up[1] && p[2] === up[2]; });
        const Rm = cands[Math.floor(rnd() * cands.length)];
        const top = mul(mm(mf, Rm), FACE_OF(x.it.v).u);
        return { v: x.it.v, side: x.it.side, R: Rm, rest: { x: rest[i].x, y: rest[i].y, yaw: Math.atan2(top[1], top[0]) },
          impacts: x.c.impacts.map(([t, v]) => [t + x.delay, v]) };
      });
      return { frames, dice: out, dur, tries: tries + 1 };
    }
    return null;
  }
  // spec: { dice: [{ v, side, hx0, hx1, dir }], yMid, yMin, yMax, band }. Dice of the same half share one world.
  function plan(spec, rnd) {
    rnd = rnd || Math.random;
    const groups = new Map();
    spec.dice.forEach((d, i) => { const k = d.hx0 + ':' + d.hx1; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(Object.assign({ i }, d)); });
    const parts = [];
    for (const items of groups.values()) { const p = planGroup(items, spec, rnd); if (!p) return null; parts.push({ items, p }); }
    const out = { dice: [], dur: 0 };
    for (const { items, p } of parts) {
      items.forEach((it, j) => { out.dice[it.i] = Object.assign(p.dice[j], { frames: p.frames, slot: j }); });
      out.dur = Math.max(out.dur, p.dur);
    }
    return out;
  }
  // pose of die d at time t (seconds): position and visual rotation matrix (physics orientation · relabelling)
  function pose(d, t) {
    const F = d.frames, k = Math.min(F.length - 1, t / DT), i0 = Math.floor(k), i1 = Math.min(F.length - 1, i0 + 1), a = k - i0;
    const f0 = F[i0], f1 = F[i1], o = d.slot * 7;
    const p = [0, 1, 2].map(j => f0[o + j] + (f1[o + j] - f0[o + j]) * a);
    let q = [3, 4, 5, 6].map(j => f0[o + j]); const q1 = [3, 4, 5, 6].map(j => f1[o + j]);
    if (q[0] * q1[0] + q[1] * q1[1] + q[2] * q1[2] + q[3] * q1[3] < 0) q1.forEach((v, j) => { q1[j] = -v; });
    q = q.map((v, j) => v + (q1[j] - v) * a); const ql = Math.hypot(...q); q = q.map(v => v / ql);
    return { p, m: mm(qmat(q[0], q[1], q[2], q[3]), d.R) };
  }

  // ---- drawing
  const LIGHT = (() => { const l = [-0.14, -0.3, 1]; const n = Math.hypot(...l); return l.map(v => v / n); })();   // towards the light
  const CAM_D = 7;                         // camera height above the top face of a resting die: a die 1 unit up looks ~17 % bigger
  const COLORS = [
    { face: [239, 228, 204], edge: [196, 182, 150], pip: '#4a1512' },   // side 0: ivory, red-brown pips
    { face: [40, 43, 49], edge: [16, 17, 20], pip: '#ead9a8' }];        // side 1: black, gold pips
  function hull(pts) {   // monotone chain
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    return lo.slice(0, -1).concat(up.slice(0, -1));
  }
  function rrect(ctx, r) {   // rounded unit square
    ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(1, 0, 1, 1, r); ctx.arcTo(1, 1, 0, 1, r); ctx.arcTo(0, 1, 0, 0, r); ctx.arcTo(0, 0, 1, 0, r); ctx.closePath();
  }
  // ctx: canvas 2D context; k: device pixels per board unit; list: [{ d, t }]
  function draw(ctx, k, list) {
    const proj = (p, cam) => { const f = CAM_D / (CAM_D - (p[2] - A)); return [cam[0] + (p[0] - cam[0]) * f, cam[1] + (p[1] - cam[1]) * f]; };
    const W = ctx.canvas.width;
    // shadows first (all on the board)
    for (const { d, t } of list) {
      const { p, m } = pose(d, t), pts = [], cam = [p[0], p[1]];
      for (const sx of [-H, H]) for (const sy of [-H, H]) for (const sz of [-H, H]) {
        const c = mul(m, [sx, sy, sz]), w = [p[0] + c[0], p[1] + c[1], p[2] + c[2]], s = w[2] / LIGHT[2];
        pts.push(proj([w[0] - LIGHT[0] * s, w[1] - LIGHT[1] * s, 0], cam));
      }
      const hgt = Math.max(0, p[2] - H);
      const hl = hull(pts);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath(); hl.forEach((q, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, q[0] * k + W * 2, q[1] * k));
      ctx.closePath();
      ctx.shadowColor = `rgba(0,0,0,${Math.max(0.18, 0.55 - hgt * 0.14).toFixed(3)})`;
      ctx.shadowBlur = (0.1 + hgt * 0.22) * k; ctx.shadowOffsetX = -W * 2; ctx.fillStyle = '#000';
      ctx.fill(); ctx.restore();
    }
    // dice, lowest first
    const items = list.map(o => Object.assign({ ps: pose(o.d, o.t) }, o)).sort((a, b) => a.ps.p[2] - b.ps.p[2]);
    for (const { d, ps } of items) {
      const cam = [ps.p[0], ps.p[1]];
      const { p, m } = ps, col = COLORS[d.side];
      const camP = [cam[0], cam[1], CAM_D + A];
      // silhouette in the edge colour (gives the rounded edges something to sit on)
      const sil = [];
      for (const sx of [-H, H]) for (const sy of [-H, H]) for (const sz of [-H, H]) { const c = mul(m, [sx * 0.97, sy * 0.97, sz * 0.97]); sil.push(proj([p[0] + c[0], p[1] + c[1], p[2] + c[2]], cam)); }
      const hs = hull(sil);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.beginPath(); hs.forEach((q, i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, q[0], q[1])); ctx.closePath();
      ctx.fillStyle = `rgb(${col.edge.join(',')})`; ctx.fill();
      for (const F of FACES) {
        const n = mul(m, F.n), c = [p[0] + n[0] * H, p[1] + n[1] * H, p[2] + n[2] * H];
        if (n[0] * (camP[0] - c[0]) + n[1] * (camP[1] - c[1]) + n[2] * (camP[2] - c[2]) <= 0) continue;
        const u = mul(m, F.u), w = mul(m, F.w);
        const P = (s, r) => proj([c[0] + u[0] * (s - 0.5) * A + w[0] * (r - 0.5) * A, c[1] + u[1] * (s - 0.5) * A + w[1] * (r - 0.5) * A, c[2] + u[2] * (s - 0.5) * A + w[2] * (r - 0.5) * A], cam);
        const o = P(0, 0), ex = P(1, 0), ey = P(0, 1);
        ctx.setTransform((ex[0] - o[0]) * k, (ex[1] - o[1]) * k, (ey[0] - o[0]) * k, (ey[1] - o[1]) * k, o[0] * k, o[1] * k);
        // Lambert-ish shading: the face pointing straight up is drawn at full brightness, like the resting dice
        const lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]), top = Math.max(0, LIGHT[2]);
        const sh = Math.min(1.04, 0.5 + 0.5 * lam / top);
        ctx.fillStyle = `rgb(${col.face.map(v => Math.round(Math.min(255, v * sh))).join(',')})`;
        rrect(ctx, 0.17); ctx.fill();
        ctx.fillStyle = col.pip; ctx.globalAlpha = 0.55 + 0.45 * Math.min(1, sh);
        for (const cell of PIPS[F.v]) {
          const cx = 0.12 + ((cell % 3) + 0.5) * (0.76 / 3), cy = 0.12 + (Math.floor(cell / 3) + 0.5) * (0.76 / 3);
          ctx.beginPath(); ctx.arc(cx, cy, 0.092, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // the value on top of a die at time t (for tests)
  function topValue(d, t) {
    const { m } = pose(d, t);
    let best = -2, v = 0;
    for (const F of FACES) { const n = mul(m, F.n); if (n[2] > best) { best = n[2]; v = F.v; } }
    return v;
  }
  root.Dice3D = { plan, draw, pose, topValue, DT, A, ready: true, _choreo: choreo };
})(typeof window !== 'undefined' ? window : globalThis);
