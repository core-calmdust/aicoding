/* =====================================================================
   Senet — the 3D toolkit shared by the portal's table play (atlas/games/senet.js) and the rules tour (atlas/rules/senet.js),
   on the game box (atlas/models/senet.js).
     SenetKit.make(ctx.Table3D, opts) → kit
       kit.board / U / Y              the board group, its userData, the playing surface height
       kit.sync(state)                pieces exactly as the engine state says (placed, no animation)
       kit.move(side, m)              → Promise: lift, hop square by square along the track, set down; a swap sends the rival back
                                        to the square left; the House of Water sinks the piece and it rises on its new square
       kit.roll(side, sticks)         → Promise: the four sticks thrown in beside the board on that side, landing light / dark up
       kit.restSticks(side, sticks|null)
       kit.lift(side, k, on)
       kit.marks.{ clear(), cell(sq,color,op), ring(sq,color), glow(sq,color), tray(side,color,k), path(a,b,color), frame() }
       kit.hit(event) → { sq } | { tray: 'goal', side } | { sticks: true } | null
       kit.projCell(sq) / projPiece(side, k) → screen point (tests)
       kit.stop()
   Board coordinates: the model's own (squares 1–10 the far row −z, 21–30 the near row +z; x from −4.5 to 4.5).
   ===================================================================== */
(function () {
  'use strict';
  const io = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  function make(T3, opts = {}) {
    const TH = window.THREE, S3 = T3.senet;
    const board = S3.board(opts.design || 'tut'), U = board.userData, Y = U.top;
    T3.show('senet', board); if (T3.play) T3.play(true);
    const tall = innerHeight > innerWidth * 1.15;
    const PT = opts.top ? 1.5703 : 0;
    const FAR = tall || PT ? 0 : .85;   // seen at a slant, the tall box hides what lies right behind it: the far player's sticks and borne-off pieces sit further out
    const fit0 = tall ? { w: U.D + 2.6, d: U.W + 3.3, up: .95, y: Y, pitch: 1.5703, roll: -1 } : { w: U.W + .6, d: U.D + 2.9 + 2 * FAR, y: Y, pitch: PT || 1.15 };   // phone: straight down, the long board between the Quit button and the HUD
    if (T3.fit) T3.fit(fit0);
    let stopped = false;
    const anim = (dur, f) => new Promise(res => { const t0 = performance.now(); (function s(n) { if (stopped) return res(); const k = Math.min(1, Math.max(0, (n - t0) / dur)); f(k); T3.kick(150); if (k < 1) requestAnimationFrame(s); else res(); })(t0); });
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const spd = () => Math.max(.4, opts.speed ? opts.speed() : 1);
    const cellXZ = sq => U.pt(sq);
    // the pieces borne off: in a row on the table beside the long side of the box (Light near +z, Dark far −z), from the exit end
    const slot = (side, k) => [U.W / 2 - .5 - k * .62, 0, side ? -(U.D / 2 + .5 + FAR) : U.D / 2 + .5];
    // the sticks: on the table beside the long side, at the other end
    const stickAt = (side, i) => [-U.W / 2 + 1.1 + i * .42, side ? -(U.D / 2 + .62 + FAR) : U.D / 2 + .62];

    /* ---------- pieces ---------- */
    const P = [[], []];
    let look = opts.pieces || 'tut';
    function mkPiece(side) {
      const g = new TH.Group(), p = S3.piece(side, look); g.add(p);
      const sh = T3.contact(S3.PR * .95, .5); sh.position.y = .002; g.add(sh);
      g.userData = { p, sh }; board.add(g); return g;
    }
    function setH(o, h) { o.h = h; o.g.userData.p.position.y = h; const sh = o.g.userData.sh, s = 1 + h * .6; sh.scale.set(s, s, s); sh.material.opacity = .5 / (1 + h * 2); }
    function where(state, side, k) {
      const p = state.pos[side][k];
      if (p >= 31) { const j = state.pos[side].slice(0, k).filter(q => q >= 31).length; return slot(side, j); }
      const [x, z] = cellXZ(p); return [x, Y, z];
    }
    let last = null;
    function sync(state) {
      last = { rule: state.rule, pos: [state.pos[0].slice(), state.pos[1].slice()] };
      for (const side of [0, 1]) {
        const n = state.pos[side].length;
        while (P[side].length > n) { const o = P[side].pop(); board.remove(o.g); }
        while (P[side].length < n) P[side].push({ g: mkPiece(side), pos: 0, h: 0 });
        P[side].forEach((o, k) => { const [x, y, z] = where(state, side, k); o.g.position.set(x, y, z); o.g.rotation.set(0, (k * 1.7 + side) % 6.28, 0); o.g.userData.p.position.y = 0; o.g.userData.p.scale.setScalar(1); o.pos = state.pos[side][k]; setH(o, 0); });
      }
      T3.kick(300);
    }
    function lift(side, k, on) {
      const o = P[side][k]; if (!o) return; const h0 = o.h, h1 = on ? .26 : 0;
      if (Math.abs(h0 - h1) < .001) return;
      anim(on ? 140 : 110, q => setH(o, h0 + (h1 - h0) * io(q)));
    }
    async function move(side, m, opt = {}) {
      if (!last) return;
      const from = m.from, to = m.to, k = last.pos[side].findIndex(p => p === from); if (k < 0) return;
      const o = P[side][k], sp = spd();
      const pts = [o.g.position.clone()];
      for (let i = from + 1; i <= Math.min(to, 30); i++) { const [x, z] = cellXZ(i); pts.push(new TH.Vector3(x, Y, z)); }
      if (to >= 31) { const j = last.pos[side].filter(p => p >= 31).length, s = slot(side, j); pts.push(new TH.Vector3(s[0], s[1], s[2])); }
      let vic = null;
      if (m.capture) { const vk = last.pos[1 - side].indexOf(to); if (vk >= 0) vic = { o: P[1 - side][vk], side: 1 - side, k: vk }; }
      const H = .36, h0 = o.h;
      await anim(140 / sp, q => setH(o, h0 + (H - h0) * io(q)));
      const leg = (opt.fast ? 100 : 150) / sp;
      for (let i = 0; i < pts.length - 1 && !stopped; i++) {
        const a = pts[i], b = pts[i + 1];
        await anim(leg, q => { const e = io(q); o.g.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, a.z + (b.z - a.z) * e); setH(o, H + Math.sin(q * Math.PI) * .07); });
        if (opt.onStep) opt.onStep(i + 1, pts.length - 1);
      }
      let vp = null;
      if (vic && vic.o) {   // the swap: the rival piece hops back to the square the mover left
        const [tx, tz] = cellXZ(from), vo = vic.o, s0 = vo.g.position.clone();
        if (opt.onHit) opt.onHit();
        vp = anim(480 / sp, q => { const e = io(q); vo.g.position.set(s0.x + (tx - s0.x) * e, Y, s0.z + (tz - s0.z) * e); setH(vo, Math.sin(q * Math.PI) * .7); }).then(() => { setH(vo, 0); vo.pos = from; });
        last.pos[vic.side][vic.k] = from;
      }
      await anim(140 / sp, q => setH(o, H * (1 - io(q))));
      if (m.water && m.dest !== to) {   // the House of Water: it sinks, and rises again on its new square
        if (opt.onWater) opt.onWater();
        const body = o.g.userData.p;
        await anim(380 / sp, q => { body.position.y = -q * .5; body.scale.setScalar(1 - q * .6); });
        const [bx, bz] = cellXZ(m.dest); o.g.position.set(bx, Y, bz);
        await anim(380 / sp, q => { body.position.y = -(1 - q) * .3; body.scale.setScalar(.4 + q * .6); });
        body.position.y = 0; body.scale.setScalar(1);
      }
      const fin = m.water ? m.dest : to;
      o.pos = fin; last.pos[side][k] = fin;
      if (opt.onLand) opt.onLand();
      await anim(110 / sp, q => { const s = 1 + Math.sin(q * Math.PI) * .06; o.g.userData.p.scale.set(s, 1 / s, s); });
      o.g.userData.p.scale.set(1, 1, 1);
      if (vp) await vp;
    }

    /* ---------- sticks ---------- */
    const STK = [], SK = opts.stage ? 1.15 : .85, REST = S3.STK.Th * SK / 2;
    function ensure() {
      while (STK.length < 4) { const g = new TH.Group(), s = S3.stick(); s.scale.setScalar(SK); g.add(s); const sh = T3.contact(.3, .35); sh.scale.set(.55 * SK, 1, 2.4 * SK); sh.position.y = .002; g.add(sh); g.userData = { s, sh }; board.add(g); STK.push(g); }
    }
    const yaw = i => ((i * 53) % 11 - 5) * .04;
    let stickSide = 0;
    function restSticks(side, d) {
      ensure(); stickSide = side;
      STK.forEach((g, i) => { const [x, z] = stickAt(side, i); S3.stickUp(g.userData.s, !!(d && d[i]), yaw(i)); g.position.set(x, REST, z); g.userData.sh.position.y = .002 - REST; g.userData.sh.rotation.z = yaw(i); });
      T3.kick(200);
    }
    async function roll(side, d) {
      ensure(); stickSide = side;
      if (opts.sfx) opts.sfx('roll');
      const sg = side ? -1 : 1, dur = 900 / spd();
      const plan = STK.map((g, i) => {
        const [x1, z1] = stickAt(side, i), from = [x1 + (Math.random() - .5) * 1.2, z1 + sg * (1.6 + Math.random() * .6)];
        const end = d[i] ? 0 : Math.PI, spin = end + (2 + (Math.random() * 3 | 0)) * Math.PI * 2 * (Math.random() < .5 ? 1 : -1);
        return { g, from, to: [x1, z1], spin, end, y0: yaw(i) + (Math.random() - .5) * 2.4, y1: yaw(i), delay: i * 45 };
      });
      const total = dur + 140;
      await anim(total, k => {
        const t = k * total;
        for (const p of plan) {
          const u = Math.max(0, Math.min(1, (t - p.delay) / dur)), e = 1 - Math.pow(1 - u, 2.4);
          const hop = u < .7 ? Math.sin(u / .7 * Math.PI) * 1.2 : Math.abs(Math.sin((u - .7) / .3 * Math.PI)) * .5 * (1 - u);
          p.g.position.set(p.from[0] + (p.to[0] - p.from[0]) * e, REST + hop, p.from[1] + (p.to[1] - p.from[1]) * e);
          p.g.userData.s.userData.body.rotation.z = p.spin + (p.end - p.spin) * e;
          p.g.userData.s.rotation.y = p.y0 + (p.y1 - p.y0) * e;
          p.g.userData.sh.position.y = .002 - p.g.position.y; p.g.userData.sh.rotation.z = p.g.userData.s.rotation.y;
        }
      });
      restSticks(side, d);
      if (opts.sfx) opts.sfx('dieStop');
    }

    /* ---------- marks ---------- */
    const marksG = new TH.Group(); board.add(marksG);
    const basic = (color, op) => new TH.MeshBasicMaterial({ color, transparent: true, opacity: op, toneMapped: false, depthWrite: false });
    const GEO = { sq: new TH.PlaneGeometry(.94, .94), ring: new TH.TorusGeometry(S3.PR * 1.15, .035, 8, 44), dot: new TH.CircleGeometry(.11, 24), slot: new TH.CircleGeometry(S3.PR * 1.05, 32) };
    GEO.sq.rotateX(-Math.PI / 2); GEO.ring.rotateX(Math.PI / 2); GEO.dot.rotateX(-Math.PI / 2); GEO.slot.rotateX(-Math.PI / 2);
    const MATC = {}, mat = (c, op) => MATC[c + ':' + op] || (MATC[c + ':' + op] = basic(c, op));
    const marks = {
      clear() { while (marksG.children.length) { const m = marksG.children[0]; if (m.userData.pulseOp) m.material.dispose(); marksG.remove(m); } T3.kick(120); },
      cell(sq, color = 0x3df59a, op = .4) { const m = new TH.Mesh(GEO.sq, mat(color, op)), [x, z] = cellXZ(sq); m.position.set(x, Y + .006, z); m.renderOrder = 2; marksG.add(m); T3.kick(120); return m; },
      ring(sq, color = 0x3df59a) { const m = new TH.Mesh(GEO.ring, mat(color, .95)), [x, z] = cellXZ(sq); m.position.set(x, Y + .02, z); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      dot(sq, color = 0xffe27a) { const m = new TH.Mesh(GEO.dot, mat(color, .95)), [x, z] = cellXZ(sq); m.position.set(x, Y + .012, z); m.renderOrder = 3; marksG.add(m); T3.kick(120); return m; },
      glow(sq, color = 0xffd65a, op = .55) { const [x, z] = cellXZ(sq), m = new TH.Mesh(GEO.sq, basic(color, op)); m.position.set(x, Y + .007, z); m.renderOrder = 2; m.userData.pulseOp = op; marksG.add(m); marks.ring(sq, color); return m; },
      tray(side, color = 0x3df59a, k = 0) { const [x, y, z] = slot(side, k), m = new TH.Mesh(GEO.slot, mat(color, .5)); m.position.set(x, y + .004, z); m.renderOrder = 2; marksG.add(m); T3.kick(120); return m; },
      path(a, b, color = 0xffe27a) { for (let i = Math.max(1, a); i <= Math.min(b, 30); i++) { const m = marks.dot(i, color); m.scale.setScalar(i === b ? 1.6 : 1); } },
      frame(color = 0xffffff, op = .85) {
        const xs = STK.map(g => g.position.x), zs = STK.map(g => g.position.z); if (!xs.length) return;
        const r = .62 * SK, x0 = Math.min(...xs) - .2, x1 = Math.max(...xs) + .2, z0 = Math.min(...zs) - r, z1 = Math.max(...zs) + r, m = mat(color, op), wd = .045;
        const bar = (cx, cz, w, d) => { const q = new TH.Mesh(new TH.PlaneGeometry(w, d), m); q.rotation.x = -Math.PI / 2; q.position.set(cx, .01, cz); q.renderOrder = 3; marksG.add(q); };
        bar((x0 + x1) / 2, z0, x1 - x0, wd); bar((x0 + x1) / 2, z1, x1 - x0, wd); bar(x0, (z0 + z1) / 2, wd, z1 - z0 + wd); bar(x1, (z0 + z1) / 2, wd, z1 - z0 + wd);
        T3.kick(120);
      },
      group: marksG,
    };
    let pulseOn = false;
    function pulse() {
      if (stopped || !marksG.children.length) { pulseOn = false; return; }
      const k = .5 + .5 * Math.sin(performance.now() / 260);
      marksG.children.forEach(m => { if (m.geometry === GEO.ring) m.scale.setScalar(.92 + k * .14); if (m.userData.pulseOp) m.material.opacity = m.userData.pulseOp * (.35 + .65 * k); });
      T3.kick(60); requestAnimationFrame(pulse);
    }
    const _add = marksG.add.bind(marksG);
    marksG.add = (...a) => { const r = _add(...a); if (!pulseOn) { pulseOn = true; requestAnimationFrame(pulse); } return r; };

    /* ---------- taps ---------- */
    function hit(ev) {
      const p = T3.pick(ev, Y); if (!p) return null;
      const x = p.x, z = p.z, c = Math.round(x + 4.5), r = Math.round(z + 1);
      if (Math.abs(x + 4.5 - c) < .5 && Math.abs(z + 1 - r) < .5 && r >= 0 && r <= 2 && c >= 0 && c <= 9) return { sq: r * 10 + (r === 1 ? 9 - c : c) + 1 };
      const q = T3.pick(ev, 0) || p;   // off the board: the table
      for (const side of [0, 1]) {
        for (let k = 0; k < 7; k++) { const s = slot(side, k); if (Math.hypot(s[0] - q.x, s[2] - q.z) < .5) return { tray: 'goal', side }; }
        for (let i = 0; i < 4; i++) { const [sx, sz] = stickAt(side, i); if (Math.abs(sx - q.x) < .4 && Math.abs(sz - q.z) < .7) return { sticks: true, side }; }
      }
      return null;
    }
    function project(x, y, z) { const v = new TH.Vector3(x, y, z); board.updateMatrix(); v.applyMatrix4(board.matrix); return T3.project(v.x, v.z, v.y); }
    const projCell = sq => { const [x, z] = cellXZ(sq); return project(x, Y, z); };
    const projPiece = (side, k) => { const o = P[side][k]; return o ? project(o.g.position.x, o.g.position.y, o.g.position.z) : null; };
    const projSticks = side => { const [x, z] = stickAt(side, 1.5); return project(x, 0, z); };
    return { board, U, Y, tall, fit0, sync, move, roll, restSticks, lift, marks, hit, project, projCell, projPiece, projSticks, sleep, anim, pieces: P, sticks: STK, cellXZ,
      setLook(l) { if (!l || l === look) return; look = l; for (const side of [0, 1]) P[side].forEach(o => { o.g.remove(o.g.userData.p); const p = S3.piece(side, look); o.g.add(p); o.g.userData.p = p; }); T3.kick(200); },
      stop() { stopped = true; } };
  }
  window.SenetKit = { make };
})();
