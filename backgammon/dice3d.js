// Backgammon V2 — dice throws drawn in 3D on a canvas
//
// plan():   lays out the whole throw before it is shown: each die drops from the hand, makes 2–4 bounces of decreasing
//           height under constant gravity while tumbling (each die with its own throw), rolls over its edges, tips over and settles (see choreo()).
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
  //  * the lowest point of the die follows parabolas under one constant gravity: a drop from the hand, then 2–4 bounces
  //    whose heights fall by a constant ratio (h, r·h, r²·h, …) — so their durations go with √h;
  //  * the centre sits exactly on top of that lowest point (computed from the cube's orientation), so it never sinks
  //    into the felt;
  //  * in the air it tumbles forward about the horizontal axis across its path, with some side spin and wobble; each
  //    impact slows the spin and the forward speed, and the side spin dies out on the last landing;
  //  * then it rolls over its edges — centre travel tied to the turned angle, no sliding — slows down, tips over one last
  //    time (slow over the top, falling flat), and rocks back a little before resting.
  // The resting orientation is fixed in advance and the turned angles are counted back from it, so the motion is continuous.
  function choreo(o) {
    const g = o.g, r = o.r, d = o.d, k = [-d[1], d[0], 0], nb = o.nb;  // k = z × d: turning about k rolls the top towards d
    // drop from the hand: lowest point from z0 with upward speed vz0 until it touches the floor
    const T0 = (o.vz0 + Math.sqrt(o.vz0 * o.vz0 + 2 * g * o.z0)) / g;
    const hs = [], vs = [], Ts = [];
    for (let i = 0; i < nb; i++) { hs.push(o.h * Math.pow(r, i)); vs.push(Math.sqrt(2 * g * hs[i])); Ts.push(2 * vs[i] / g); }
    const segs = [[0, T0]];
    for (let i = 0; i < nb; i++) segs.push([segs[i][1], segs[i][1] + Ts[i]]);
    const tA = segs[nb][1];                                          // last landing: from here on it rolls
    const us = segs.map((_, i) => o.u0 * Math.pow(o.fu, i));          // forward speed per flight
    const ws = segs.map((_, i) => o.w0 * Math.pow(o.fw, i));          // forward tumble per flight
    const ss = segs.map((_, i) => o.sw * Math.pow(o.fw, i));          // side spin per flight
    const sAt = [0], thAt = [0], sgAt = [0];
    segs.forEach(([a, b], i) => { sAt.push(sAt[i] + us[i] * (b - a)); thAt.push(thAt[i] + ws[i] * (b - a)); sgAt.push(sgAt[i] + ss[i] * (b - a)); });
    const seg = t => { let i = 0; while (i < nb && t > segs[i][1]) i++; return i; };
    // on the floor: finish the current quarter (plus o.extra whole quarters) at the rolling speed the last impact gave it,
    // then the final tip, slow over the top and falling flat
    const wIn = o.wRoll, rem = o.rem + o.extra * QP, tRem = rem / wIn;
    const c = o.tipC, wTip = wIn * 0.85, tTip = QP * (1 + c) / wTip;
    const Theta = thAt[nb + 1] + rem + QP;                           // the angle at which the die lies flat for good
    const tFlat = tA + tRem + tTip, tRock = o.rockT, tEnd = tFlat + tRock;
    const phiAt = t => {                                              // turned angle relative to the final orientation (≤ 0)
      let th;
      if (t <= tA) { const i = seg(t); th = thAt[i] + ws[i] * (Math.max(segs[i][0], t) - segs[i][0]); }
      else if (t <= tA + tRem) th = thAt[nb + 1] + wIn * (t - tA);
      else { const s = Math.min(1, (t - tA - tRem) / tTip); th = thAt[nb + 1] + rem + QP * (s - c * Math.sin(2 * Math.PI * s) / (2 * Math.PI)); }
      return th - Theta;
    };
    const sigAt = t => {                                              // side spin angle, 0 from the last landing on
      if (t >= tA) return 0;
      const i = seg(t); return sgAt[i] + ss[i] * (Math.max(segs[i][0], t) - segs[i][0]) - sgAt[nb + 1];
    };
    const phiA = phiAt(tA), sA = sAt[nb + 1];
    const fwd = t => {                                                // distance along the path
      if (t <= tA) { const i = seg(t); return sAt[i] + us[i] * (t - segs[i][0]); }
      return sA + rollDist(phiAt(Math.min(t, tFlat)) + 16 * QP) - rollDist(phiA + 16 * QP);
    };
    const sFlat = fwd(tFlat);
    const low = t => {                                                // height of the lowest point
      if (t < 0) return o.z0 - t * 2.5;                               // still coming down from the hand
      if (t <= T0) return o.z0 + o.vz0 * t - g * t * t / 2;
      for (let i = 0; i < nb; i++) if (t <= segs[i + 1][1]) { const u = t - segs[i + 1][0]; return Math.max(0, vs[i] * u - g * u * u / 2); }
      return 0;
    };
    // wobble about the path direction and a turn about the vertical, both dying out by the last landing
    const env = t => t >= tA ? 0 : Math.pow(1 - Math.max(0, t) / tA, 2);
    const wob = t => o.wob * env(t) * Math.sin(2 * Math.PI * o.wobF * t + o.ph);
    const yawW = t => o.yawW * env(t);
    const Qf = qaxis([0, 0, 1], Math.atan2(d[1], d[0]));             // final orientation: lying flat, faces along the path
    const at = t => {
      let s, z, q;
      if (t < tFlat) {
        s = t < 0 ? us[0] * t : fwd(t);
        // side spin about the die's own path axis (body x), forward tumble about k, then wobble and yaw in world space
        q = qmul(qaxis([0, 0, 1], yawW(t)), qmul(qaxis([d[0], d[1], 0], wob(t)), qmul(qaxis(k, phiAt(t)), qmul(Qf, qaxis([1, 0, 0], sigAt(t))))));
        const m = qmat(q[0], q[1], q[2], q[3]);
        z = low(t) + H * (Math.abs(m[6]) + Math.abs(m[7]) + Math.abs(m[8]));
      } else {                                                        // rocking back on the rear edge, twice, smaller each time
        const u = Math.min(t, tEnd) - tFlat, a1 = o.rockA, p1 = tRock * 0.57, p2 = tRock - p1;
        const rho = u < p1 ? a1 * Math.sin(Math.PI * u / p1) : a1 * 0.35 * Math.max(0, Math.sin(Math.PI * (u - p1) / p2));
        s = sFlat - H + H * Math.cos(rho) - H * Math.sin(rho); z = H * Math.sin(rho) + H * Math.cos(rho);
        q = qmul(qaxis(k, -rho), Qf);
      }
      const lat = o.curve * s * s;                                    // a slight curve
      return [o.x0 + d[0] * s - d[1] * lat, o.y0 + d[1] * s + d[0] * lat, z, q];
    };
    const impacts = [[T0, Math.sqrt(o.vz0 * o.vz0 + 2 * g * o.z0)], ...vs.map((v, i) => [segs[i + 1][1], v * Math.sqrt(r)]), [tFlat, 1.2]];
    return { at, tEnd, Qf, impacts, sEnd: sFlat, nb };
  }
  // the dice of one half: each die gets its own throw (direction, speed, bounces, spin, roll-out, timing), retried until
  // the paths stay on the board, end in the half, in the band between the points, and never overlap
  const REJ = { row: 0, dur: 0, sync: 0, bounds: 0, rest: 0, overlap: 0 };
  function planGroup(items, opt, rnd) {
    const R = (a, b) => a + rnd() * (b - a), pick = (...w) => { let x = rnd() * w.reduce((s, v) => s + v, 0); for (let i = 0; i < w.length; i++) if ((x -= w[i]) < 0) return i; return w.length - 1; };
    const it0 = items[0], dir = it0.dir, outer = dir > 0 ? it0.hx1 : it0.hx0, m = items.length;
    for (let tries = 0; tries < 400; tries++) {
      // paths open up (diverge) or close in and may cross (the later die passes behind the earlier one)
      const side = rnd() < 0.5 ? -1 : 1, spread = R(0.26, 0.7) * (rnd() < 0.3 ? 1 : -1), a0 = R(-0.18, 0.18);
      const far = m > 1 && rnd() < 0.55 ? Math.floor(rnd() * 2) : -1, first = Math.floor(rnd() * 2);
      const dice = items.map((it, i) => {
        const delay = m > 1 && i !== first ? R(0.08, 0.25) : 0;
        const lane = m > 1 ? (i ? 1 : -1) * side * R(0.45, 0.8) : 0;
        const a = a0 + (m > 1 ? (i ? 0.5 : -0.5) * side * spread : 0), dv = [-dir * Math.cos(a), -dir * Math.sin(a)];
        const p = {
          g: 95, d: dv, nb: 2 + pick(0.3, 0.45, 0.25), r: R(0.35, 0.55), h: R(0.55, 1.0), z0: R(0.8, 1.25), vz0: R(0.1, 0.9),
          u0: R(2.2, 2.8) * (i === far ? R(1.3, 1.5) : 1), wRoll: R(6.5, 9.5), fu: R(0.82, 0.92), w0: R(12, 19), fw: R(0.76, 0.86), sw: R(-9, 9),
          x0: outer - dir * R(0.35, 0.7), y0: lane, rem: R(0.15, 1.4), extra: rnd() < 0.35 ? 1 : 0, tipC: R(0.2, 0.42),
          rockA: R(0.04, 0.1), rockT: R(0.1, 0.17), wob: R(0.08, 0.3), wobF: R(1.4, 3), ph: R(0, 6.3), yawW: R(-0.5, 0.5), curve: R(-0.04, 0.04) };
        const c = choreo(p);
        return { it, delay, c, p, at: t => c.at(t - delay), end: delay + c.tEnd };
      });
      const dur = Math.max(...dice.map(x => x.end));
      if (dur < 1.0 || dur > 1.6) { REJ.dur++; continue; }
      if (m > 1 && Math.abs(dice[0].end - dice[1].end) < 0.15 && tries < 120) { REJ.sync++; continue; }   // keep the two from finishing together
      // where they come to rest; centre the group on yMid (a sideways shift changes nothing in the motion)
      const ends = dice.map(x => x.at(x.end));
      const dy = opt.yMid + R(-0.12, 0.12) - ends.reduce((sm, e) => sm + e[1], 0) / m;
      const rest = ends.map(e => ({ x: e[0], y: e[1] + dy }));
      const band = opt.band + (tries > 100 ? 0.3 : 0) + (tries > 250 ? 0.4 : 0);
      if (rest.some(p => p.x < it0.hx0 + A * 0.7 || p.x > it0.hx1 - A * 0.7 || Math.abs(p.y - opt.yMid) > band)) { REJ.rest++; continue; }
      if (m > 1 && Math.abs(rest[0].x - rest[1].x) < 0.35 && tries < 150) { REJ.row++; continue; }   // not a neat row
      const n = Math.ceil(dur / DT) + 1, frames = [];
      let ok = true;
      for (let f = 0; f < n && ok; f++) {
        const t = f * DT, fr = new Float32Array(m * 7);
        dice.forEach((x, i) => {
          const [px, py, pz, q] = x.at(Math.min(t, x.end)), y = py + dy;
          fr.set([px, y, pz, q[0], q[1], q[2], q[3]], i * 7);
          if (y < opt.yMin + A * 0.62 || y > opt.yMax - A * 0.62) ok = false;
          if ((px < it0.hx0 + H - 1e-6 || px > it0.hx1 - H + 1e-6) && pz < H * 1.5) ok = false;   // only in the air may it pass the rim
        });
        frames.push(fr);
      }
      if (!ok) { REJ.bounds++; continue; }
      // never overlapping: the centres always stay further apart than the diagonal of a die
      if (m === 2) {
        let bad = false;
        for (const f of frames) { const dd = Math.hypot(f[0] - f[7], f[1] - f[8]); if (dd < A * 1.42) { bad = true; break; } }
        if (bad) { REJ.overlap++; continue; }
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
          impacts: x.c.impacts.map(([t, v]) => [t + x.delay, v]),
          meta: { dir: Math.atan2(x.p.d[1], x.p.d[0]), delay: x.delay, end: x.end, nb: x.c.nb, travel: x.c.sEnd } };
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
  root.Dice3D = { plan, draw, pose, topValue, DT, A, ready: true, _choreo: choreo, _rej: REJ };
})(typeof window !== 'undefined' ? window : globalThis);
