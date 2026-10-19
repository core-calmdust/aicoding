// Backgammon V2 — physically simulated dice (rigid bodies via cannon-es, drawn on a canvas in 3D)
//
// plan():   simulates the whole throw up front (fixed 1/120 s steps) until the dice come to rest, rejects throws that end
//           cocked, stacked or off the board, then relabels each die's faces (a rotation of the standard die, so
//           opposite faces still sum to 7 and the chirality is kept) so that the face that physically ended on top
//           shows the rolled number. The recorded motion itself is never altered.
// draw():   renders one recorded instant with a perspective camera from above: shaded faces with pips, and a soft
//           shadow that is the projection of the cube onto the board from a fixed light.
// Units are board units (the page's --u); x to the right, y down the screen, z up out of the board.
(function (root) {
  'use strict';
  const C = root.CANNON;
  const A = 0.82, H = A / 2;                // die edge (matches .die in the CSS)
  const DT = 1 / 120;
  const T = Object.assign({ g: 60, vx0: 6, vx1: 9.5, vy: 0.8, vyd: 0.22, off0: 0.25, off1: 0.45, ox0: 0.5, ox1: 0.9, w0: 6.2, w1: 14.3, wside: 0.4, wroll: 0.7, fr: 0.32, re: 0.42, ld: 0.06, ad: 0.12 }, root.DICE3D_TUNE || {});
  // Gravity in board units / s^2. At this board's scale real gravity would be ~260; 60 is the same physics seen at about
  // half speed (gravity, throw speed and spin are scaled together), so a throw lasts ~0.9–1.3 s and stays readable.
  const GRAV = T.g;

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

  // ---- physics
  function randQuat(rnd) {   // uniform random orientation
    const u1 = rnd(), u2 = rnd() * 2 * Math.PI, u3 = rnd() * 2 * Math.PI, a = Math.sqrt(1 - u1), b = Math.sqrt(u1);
    return [a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)];
  }
  // one throw of the dice in `items` (all in the same half) — returns the recording and its quality
  function simulate(items, rnd) {
    const world = new C.World({ gravity: new C.Vec3(0, 0, -GRAV) });
    world.broadphase = new C.NaiveBroadphase();
    world.solver.iterations = 20;
    world.allowSleep = false;
    const mFloor = new C.Material('floor'), mWall = new C.Material('wall'), mDie = new C.Material('die');
    world.addContactMaterial(new C.ContactMaterial(mFloor, mDie, { friction: T.fr, restitution: T.re }));   // felt
    world.addContactMaterial(new C.ContactMaterial(mWall, mDie, { friction: 0.2, restitution: 0.55 }));     // wooden rim / bar
    world.addContactMaterial(new C.ContactMaterial(mDie, mDie, { friction: 0.18, restitution: 0.5 }));
    const floor = new C.Body({ mass: 0, material: mFloor, shape: new C.Plane() });
    world.addBody(floor);
    const it0 = items[0], hx0 = it0.hx0, hx1 = it0.hx1, dir = it0.dir;
    const wl = new C.Body({ mass: 0, material: mWall, shape: new C.Plane() });      // normal +x at hx0
    wl.quaternion.setFromEuler(0, Math.PI / 2, 0); wl.position.set(hx0, 0, 0); world.addBody(wl);
    const wr = new C.Body({ mass: 0, material: mWall, shape: new C.Plane() });      // normal −x at hx1
    wr.quaternion.setFromEuler(0, -Math.PI / 2, 0); wr.position.set(hx1, 0, 0); world.addBody(wr);
    const outer = dir > 0 ? hx1 : hx0;
    const spread = rnd() < 0.5 ? -1 : 1;
    const hand = { y: (rnd() - 0.5) * 0.6, vx: T.vx0 + rnd() * (T.vx1 - T.vx0), vy: (rnd() - 0.5) * T.vy, z: 1.1 + rnd() * 0.9 };   // one throwing hand for both dice
    const bodies = items.map((it, i) => {
      const b = new C.Body({ mass: 1, material: mDie, shape: new C.Box(new C.Vec3(H, H, H)), linearDamping: T.ld, angularDamping: T.ad });
      const off = items.length > 1 ? (i ? 1 : -1) * spread * (T.off0 + rnd() * (T.off1 - T.off0)) : 0;
      const offx = items.length > 1 ? (i ? 1 : 0) * (T.ox0 + rnd() * (T.ox1 - T.ox0)) : 0;
      b.position.set(outer - dir * (H + 0.08 + rnd() * 0.3 + offx), hand.y + off, hand.z + rnd() * 0.25);
      const q = randQuat(rnd); b.quaternion.set(q[0], q[1], q[2], q[3]);
      b.velocity.set(-dir * hand.vx * (0.92 + rnd() * 0.16), hand.vy + (rnd() - 0.5) * T.vyd, -1 + rnd() * 2.2);
      const wx = (rnd() - 0.5) * T.wside, wy = -dir * (0.5 + rnd()) * T.wroll + (rnd() - 0.5) * T.wside, wz = (rnd() - 0.5) * T.wside, wn = Math.hypot(wx, wy, wz) || 1, w = T.w0 + rnd() * (T.w1 - T.w0);
      b.angularVelocity.set(wx / wn * w, wy / wn * w, wz / wn * w);
      b.impacts = [];
      b.addEventListener('collide', e => {
        const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
        if (v > 1.2) b.impacts.push([world.time, v]);
      });
      world.addBody(b);
      return b;
    });
    const n = bodies.length, MAXT = 3.2, frames = [];
    let still = 0, steps = 0;
    const rec = () => { const f = new Float32Array(n * 7); bodies.forEach((b, i) => { f.set([b.position.x, b.position.y, b.position.z, b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], i * 7); }); frames.push(f); };
    rec();
    while (steps * DT < MAXT) {
      world.step(DT); steps++; rec();
      const calm = bodies.every(b => b.velocity.length() < 0.05 && b.angularVelocity.length() < 0.2 && b.position.z < H + 0.03);
      still = calm ? still + 1 : 0;
      if (still >= 12) break;   // 0.1 s at rest
    }
    const rested = still >= 12;
    const end = frames.length - 1;
    const last = frames[end];
    const rest = bodies.map((b, i) => {
      const o = i * 7, m = qmat(last[o + 3], last[o + 4], last[o + 5], last[o + 6]);
      // which body axis points up, and how well
      let best = 0, axis = null;
      for (let k = 0; k < 3; k++) { const c = m[6 + k]; if (Math.abs(c) > Math.abs(best)) { best = c; axis = k; } }
      const up = [0, 0, 0]; up[axis] = Math.sign(best);
      return { x: last[o], y: last[o + 1], z: last[o + 2], flat: Math.abs(best) > 0.996, up, m };
    });
    return { frames, rest, rested, dur: end * DT, impacts: bodies.map(b => b.impacts), dir, hx0, hx1 };
  }
  // Is the recording usable once moved by dy along the board (which is a symmetry of the simulation: there are no walls
  // along y)? Returns the shift or null.
  function accept(rec, yMid, yMin, yMax, band) {
    if (!rec.rested || rec.dur < 0.85 || rec.dur > 1.9) return null;
    if (!rec.rest.every(r => r.flat && r.z < H + 0.03)) return null;
    if (rec.rest.length === 2) {
      const [a, b] = rec.rest;
      if (Math.hypot(a.x - b.x, a.y - b.y) < A * 1.02) return null;
      if (Math.abs(a.y - b.y) > band * 2) return null;
    }
    const my = rec.rest.reduce((s, r) => s + r.y, 0) / rec.rest.length;
    const dy = yMid - my;
    const n = rec.rest.length, R = A * 0.62;
    for (const f of rec.frames) for (let i = 0; i < n; i++) { const y = f[i * 7 + 1] + dy; if (y < yMin + R || y > yMax - R) return null; }
    return dy;
  }
  // throw the dice of one half until a good recording comes up (capped), then shift it and relabel the faces
  function planGroup(items, opt, rnd) {
    let best = null, dy = null, tries = 0;
    for (; tries < 40; tries++) {
      const rec = simulate(items, rnd);
      const s = accept(rec, opt.yMid + (rnd() - 0.5) * 0.2, opt.yMin, opt.yMax, opt.band);
      if (s !== null) { best = rec; dy = s; break; }
    }
    if (!best) return null;
    const n = items.length;
    for (const f of best.frames) for (let i = 0; i < n; i++) f[i * 7 + 1] += dy;
    const dice = items.map((it, i) => {
      const r = best.rest[i];
      // a cube rotation R with R·n(value) = the body axis that ended up on top: draw the die with orientation M·R
      const target = FACE_OF(it.v).n, cands = ROTS.filter(R => { const p = mul(R, target); return p[0] === r.up[0] && p[1] === r.up[1] && p[2] === r.up[2]; });
      const R = cands[Math.floor(rnd() * cands.length)];
      const mv = mm(r.m, R), top = mul(mv, FACE_OF(it.v).u);
      return { v: it.v, side: it.side, R, rest: { x: r.x, y: r.y + dy, yaw: Math.atan2(top[1], top[0]) }, impacts: best.impacts[i] };
    });
    return { frames: best.frames, dice, dur: best.dur, tries: tries + 1 };
  }
  // spec: { dice: [{ v, side, hx0, hx1, dir }], yMid, yMin, yMax, band }. Dice of the same half share one world.
  function plan(spec, rnd) {
    rnd = rnd || Math.random;
    if (!C) return null;
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
  const LIGHT = (() => { const l = [-0.12, -0.22, 1]; const n = Math.hypot(...l); return l.map(v => v / n); })();   // towards the light
  const CAM_D = 40;                        // camera height above the top face of a resting die (weak perspective)
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
  // ctx: canvas 2D context; k: device pixels per board unit; cams: camera x,y per die (centre of its half)
  function draw(ctx, k, list) {
    const proj = (p, cam) => { const f = CAM_D / (CAM_D - (p[2] - A)); return [cam[0] + (p[0] - cam[0]) * f, cam[1] + (p[1] - cam[1]) * f]; };
    const W = ctx.canvas.width;
    // shadows first (all on the board)
    for (const { d, t, cam } of list) {
      const { p, m } = pose(d, t), pts = [];
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
    for (const { d, cam, ps } of items) {
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
  root.Dice3D = { plan, draw, pose, topValue, DT, A, ready: !!C, _sim: simulate };
})(typeof window !== 'undefined' ? window : globalThis);
